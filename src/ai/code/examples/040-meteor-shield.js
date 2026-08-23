// 040-meteor-shield.js
// メテオシールド — 四方から降るものを、来る向きへ盾を回して弾き返す
// 操作: 落ちてくる方向へスワイプして盾を向ける
// 成功: 10回 弾き返す  失敗: 3回 直撃 or 13秒
// @mechanic: swipe_direction
// @theme: farm
// 世界観: 牧場の夜。孵化前の卵をねらって四方から舞い降りるカラスを、案山子の腕で払う
// variation: 物量型(終盤は2羽が続けて降りてくる)
// spice: コンボ倍率(連続で払うと x2 → x4 → x8)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s 16bit: 多色・高彩度。背景は3層で奥行きを作る
  var C = {
    night: '#1b2450', hill: '#2e6b3a', grass: '#4aa050', straw: '#e8c25a',
    crow: '#22203a', beak: '#ff9a2a', egg: '#fff2d0', red: '#e03b4a',
    white: '#ffffff', gold: '#ffd400', shadow: '#0d1128',
  };

  var GAME_TITLE = 'CROW GUARD';
  var MAX_TIME = 13;
  var NEEDED = 10;
  var MISS_LIMIT = 3;
  var CX = W / 2, CY = H * 0.62;   // 巣の中心
  var REACH = 250;                 // 案山子の腕が届く距離

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var facing, crows, blocked, misses, score, combo, totalTime, done, spawnTimer;
  var ready, hitStop, feedback, feedbackOk, shake, guardFlash;

  var DIRS = ['up', 'right', 'down', 'left'];
  var DIRV = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

  // カラス(2フレーム: 羽ばたき)
  var CROW_A = [
    '..KK..',
    '.KKKK.',
    'KKWKKK',
    'KKKKKB',
    '.KKKK.',
    '.K..K.',
  ];
  var CROW_B = [
    'K....K',
    '.KKKK.',
    'KKWKKK',
    'KKKKKB',
    '.KKKK.',
    '..KK..',
  ];
  var CROW_COL = { K: C.crow, W: C.white, B: C.beak };

  // 巣の卵
  var EGG = [
    '.EEE.',
    'EEEEE',
    'EEEEE',
    'EEEEE',
    '.EEE.',
  ];
  var EGG_COL = { E: C.egg };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.shadow, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function farmBg() {
    // 3層: 夜空 → 遠景の丘 → 手前の草地
    game.draw.gradient(0, H, [[0, '#0d1444'], [0.45, C.night], [0.75, '#25406a'], [1, '#16351f']]);
    for (var s0 = 0; s0 < 26; s0++) {
      var sx = (s0 * 149) % W, sy = (s0 * 83) % (H * 0.42);
      game.draw.rect(sx, sy, 4, 4, C.white, 0.7);
    }
    game.draw.circle(W * 0.78, H * 0.14, 62, C.white, 0.85);
    for (var hh = 0; hh < 5; hh++) game.draw.circle(hh * 280 - 60, H * 0.50, 220, C.hill, 0.9);
    game.draw.rect(0, H * 0.56, W, H * 0.44, C.grass);
    for (var g2 = 0; g2 < 40; g2++) {
      game.draw.line(g2 * 28, H * 0.56 + (g2 % 5) * 22, g2 * 28 + 10, H * 0.56 + (g2 % 5) * 22 - 26, '#3c8a44', 4);
    }
  }

  function initGame() {
    facing = 'up'; crows = []; blocked = 0; misses = 0; score = 0; combo = 0;
    totalTime = 0; done = false; spawnTimer = 0.5; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0; guardFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.red, 0.28);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function spawn() {
    // 物量型: 進むほど間隔が詰まり、終盤は続けて降りてくる
    var d = DIRS[Math.floor(Math.random() * 4)];
    crows.push({ dir: d, t: 0, speed: 0.62 + Math.min(0.55, blocked * 0.05) });
  }

  function crowPos(c) {
    var v = DIRV[c.dir];
    var dist = 760 * (1 - c.t);
    return { x: CX + v[0] * dist, y: CY + v[1] * dist };
  }

  function onBlock(c, p) {
    blocked++;
    combo++;
    var mult = combo >= 8 ? 8 : combo >= 5 ? 4 : combo >= 3 ? 2 : 1;
    var gain = 100 * mult;
    score += gain;
    guardFlash = 0.2;
    feedback = 0.3; feedbackOk = true;
    game.feedback.good(p.x, p.y, { text: '+' + gain, color: C.gold });
    game.audio.play('se_success', 0.45);
    game.fx.burst(p.x, p.y, { color: C.straw, count: 10, speed: 320 });
    if (mult >= 2 && combo === (mult === 2 ? 3 : mult === 4 ? 5 : 8)) game.audio.play('se_milestone', 0.6);
    if (blocked >= NEEDED) finish(true);
  }

  function onHit(c, p) {
    misses++;
    combo = 0;
    feedback = 0.4; feedbackOk = false;
    hitStop = 0.3; shake = 0.35;
    game.audio.play('se_failure', 0.6);
    game.feedback.bad(p.x, p.y, { text: 'MISS' });
    if (misses >= MISS_LIMIT) finish(false);
  }

  function drawScarecrow() {
    // 案山子の体
    game.draw.rect(CX - 14, CY - 40, 28, 230, '#7a5a2a');
    game.draw.sprite(EGG, EGG_COL, CX, CY + 150, 14, { anchor: 'center' });
    // 盾になる腕(向いている方向へ伸びる)
    var v = DIRV[facing];
    var ax = CX + v[0] * 130, ay = CY + v[1] * 130;
    var lit = guardFlash > 0;
    game.draw.line(CX, CY, ax, ay, C.straw, 26);
    // 盾板: 進行方向に対して垂直な矩形
    if (v[0] !== 0) game.draw.rect(ax - 22, ay - 95, 44, 190, lit ? C.white : C.straw);
    else game.draw.rect(ax - 95, ay - 22, 190, 44, lit ? C.white : C.straw);
    // 顔
    game.draw.circle(CX, CY - 66, 44, C.straw);
    game.draw.rect(CX - 20, CY - 76, 12, 12, C.shadow);
    game.draw.rect(CX + 8, CY - 76, 12, 12, C.shadow);
  }

  function drawCrow(c) {
    var p = crowPos(c);
    var wob = Math.floor(game.time.elapsed * 12 + c.t * 10) % 2 === 0;
    // telegraph: 届く直前に赤い輪が出る
    if (c.t > 0.72) game.draw.circle(p.x, p.y, 66, C.red, (c.t - 0.72) * 2.2);
    game.draw.sprite(wob ? CROW_A : CROW_B, CROW_COL, p.x, p.y, 16, { anchor: 'center' });
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (DIRV[dir]) { facing = dir; game.audio.play('se_tap', 0.3); }
  });

  // ── ATTRACT ゴースト実演: 降りてくる方向へ手が振られ、盾が向く ──
  var demo = { t: 0, dir: 'left', ct: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    demo.ct += dt * 0.7;
    if (demo.ct >= 1) {
      demo.ct = 0;
      demo.dir = DIRS[Math.floor(Math.random() * 4)];
      game.feedback.good(CX, CY - 120, { text: '+100', color: C.gold });
    }
    var v = DIRV[demo.dir];
    demo.press = demo.ct > 0.35;
    var tx = CX + v[0] * (demo.press ? 200 : 40);
    var ty = CY + v[1] * (demo.press ? 200 : 40);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!facing) initGame();
      farmBg();
      stepDemo(dt);
      facing = demo.dir;
      drawScarecrow();
      var dv = DIRV[demo.dir];
      var dd = 760 * (1 - demo.ct);
      var wob0 = Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.sprite(wob0 ? CROW_A : CROW_B, CROW_COL, CX + dv[0] * dd, CY + dv[1] * dd, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.straw);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, C.grass);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      farmBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawScarecrow();
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.30, 96, resultSuccess ? C.gold : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.38, 58, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.44, 44, C.straw);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.87, 54, C.gold);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.92, 46, C.white);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(blocked >= NEEDED); return; }
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          // 物量型: 終盤は続けて降りてくる
          spawnTimer = Math.max(0.42, 1.05 - blocked * 0.06);
          if (blocked >= 6 && Math.random() < 0.35) spawnTimer = 0.22;
        }
        for (var i = crows.length - 1; i >= 0; i--) {
          var c = crows[i];
          c.t += c.speed * dt;
          if (c.t >= 1) {
            var p = crowPos(c);
            crows.splice(i, 1);
            if (c.dir === facing) onBlock(c, { x: CX + DIRV[c.dir][0] * REACH, y: CY + DIRV[c.dir][1] * REACH });
            else onHit(c, p);
            if (done) return;
          }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
      if (guardFlash > 0) guardFlash -= dt;
    }

    // draw
    farmBg();
    drawScarecrow();
    for (var k = 0; k < crows.length; k++) drawCrow(crows[k]);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.shadow);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.red : C.grass);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 100, 46, C.white);
    txt(blocked + ' / ' + NEEDED, W * 0.16, 160, 44, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.sprite(EGG, EGG_COL, W * 0.82 + m * 52, 156, m < (MISS_LIMIT - misses) ? 9 : 5, { anchor: 'center' });
    }
    if (combo >= 3) txt('x' + (combo >= 8 ? 8 : combo >= 5 ? 4 : 2), W / 2, 168, 50, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 96, C.gold);
    if (feedback > 0 && !feedbackOk && NEEDED - blocked <= 3) txt('あと' + (NEEDED - blocked) + '羽', W / 2, H * 0.24, 50, C.gold);

    scanlines();
  });

  game.onStart(function() {
    // 90s 16bit: 牧歌的だが夜の緊張がある行進曲
    game.audio.melody(
      [['A4', 0.5], ['C5', 0.25], ['B4', 0.25], ['A4', 0.5], ['G4', 0.5],
       ['F4', 0.5], ['A4', 0.5], ['G4', 1],
       ['E4', 0.5], ['G4', 0.25], ['A4', 0.25], ['C5', 0.5], ['A4', 1]],
      { tempo: 142, wave: 'square', volume: 0.09, loop: true,
        bass: [['A2', 1], ['F2', 1], ['C3', 1], ['G2', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
