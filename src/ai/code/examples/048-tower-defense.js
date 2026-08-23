// 048-tower-defense.js
// タワーディフェンス — 回る装甲の隙間から覗く核だけを撃ち抜く
// 操作: 露出した核をタップ（装甲を撃つと弾かれる）
// 成功: 10基 撃破  失敗: 3基 基地に到達 or 20秒
// @mechanic: aim_shoot
// @theme: space
// 世界観: 宇宙基地の防衛砲。降下する機雷は装甲を回しており、核が覗く一瞬しか通らない
// variation: 精度型(装甲の隙間が狭まり、回転が速くなる)
// spice: フィーバータイム(中盤数秒だけ全機の装甲が開く。得点2倍)
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s NEON: 発光4色制限(シアン/マゼンタ/イエロー/白) + 濃紺の闇
  var C = {
    cyan: '#00e5ff', magenta: '#ff3df0', yellow: '#ffe600', white: '#ffffff',
    dim: '#2a1c4a', deep: '#0a0018',
  };

  var GAME_TITLE = 'CORE SHOT';
  var MAX_TIME = 20;
  var NEEDED = 10;
  var LEAK_LIMIT = 3;
  var BASE_Y = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var mines, killed, leaked, score, combo, totalTime, done, spawnTimer, fever;
  var ready, hitStop, feedback, feedbackOk, shake;

  // 機雷(装甲)。核は別に円で描く
  var MINE = [
    '..CC..',
    '.CCCC.',
    'CC..CC',
    'CC..CC',
    '.CCCC.',
    '..CC..',
  ];
  var MINE_COL = { C: C.cyan };
  var MINE_HOT = { C: C.magenta };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#12001f', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.16); }

  function spaceBg() {
    game.draw.gradient(0, H, [[0, '#12002a'], [0.55, C.deep], [1, '#050010']]);
    for (var s0 = 0; s0 < 30; s0++) {
      game.draw.rect((s0 * 137) % W, (s0 * 211) % (H * 0.7), 4, 4, C.white, 0.55);
    }
    // 遠景: ネオングリッドの地平 + 基地
    for (var i = 0; i <= 9; i++) game.draw.line(0, BASE_Y + i * i * 2.4, W, BASE_Y + i * i * 2.4, C.dim, 2);
    for (var gx = 0; gx <= 10; gx++) game.draw.line(gx / 10 * W, BASE_Y, (gx - 4.5) * 300 + W / 2, H, C.dim, 2);
    game.draw.rect(W * 0.18, BASE_Y - 70, W * 0.64, 70, C.dim);
    game.draw.rect(W * 0.18, BASE_Y - 70, W * 0.64, 8, C.cyan, 0.8);
    for (var d = 0; d < 5; d++) game.draw.circle(W * 0.26 + d * W * 0.12, BASE_Y - 34, 16, C.yellow, 0.7);
  }

  function initGame() {
    mines = []; killed = 0; leaked = 0; score = 0; combo = 0; totalTime = 0;
    done = false; spawnTimer = 0.15; fever = 0; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.magenta, 0.3);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function spawn() {
    // 精度型: 進むほど回転が速く、核の露出が短くなる
    var tight = Math.min(1, killed / NEEDED);
    mines.push({
      x: 140 + Math.random() * (W - 280),
      y: 250,
      vy: 250 + tight * 120,
      ang: Math.random() * Math.PI * 2,
      spin: (1.5 + tight * 1.9) * (Math.random() < 0.5 ? 1 : -1),
      open: 0.9 - tight * 0.42,   // 核が「覗いている」と判定する角度幅(ラジアン)
      r: 78,
      pop: 0,
    });
  }

  // 核の位置(装甲の隙間)。露出しているのは画面手前=下向きのとき
  function corePos(m) {
    return { x: m.x + Math.cos(m.ang) * m.r * 0.62, y: m.y + Math.sin(m.ang) * m.r * 0.62 };
  }
  function isExposed(m) {
    if (fever > 0) return true;
    // 下向き(=プレイヤー側)を向いている間だけ通る
    var a = Math.atan2(Math.sin(m.ang), Math.cos(m.ang));
    return Math.abs(a - Math.PI / 2) < m.open || Math.abs(a + Math.PI * 1.5) < m.open;
  }

  function kill(m, p) {
    killed++;
    combo++;
    var gain = (fever > 0 ? 200 : 100) + Math.min(200, (combo - 1) * 25);
    score += gain;
    feedback = 0.3; feedbackOk = true;
    game.feedback.good(p.x, p.y, { text: '+' + gain, color: C.yellow });
    game.audio.play('se_success', 0.5);
    game.fx.burst(p.x, p.y, { color: C.yellow, count: 12, speed: 380 });
    if (killed === 5) { fever = 3.0; game.audio.play('se_milestone'); }
    if (killed >= NEEDED) finish(true);
  }

  function deflect(m, x, y) {
    combo = 0;
    feedback = 0.35; feedbackOk = false;
    hitStop = 0.22; shake = 0.2;
    game.audio.play('se_failure', 0.45);
    game.feedback.bad(x, y, { text: 'MISS' });
  }

  function leak(m) {
    leaked++;
    combo = 0;
    feedback = 0.4; feedbackOk = false;
    hitStop = 0.3; shake = 0.35;
    game.audio.play('se_failure', 0.6);
    game.feedback.bad(m.x, BASE_Y - 70, { text: 'MISS' });
    if (leaked >= LEAK_LIMIT) finish(false);
  }

  function drawMine(m) {
    var exposed = isExposed(m);
    var scale = 13 * (1 + m.pop * 2);
    // 疑似グロー(80s NEONの要): 外周に薄い同色を重ねる
    game.draw.circle(m.x, m.y, m.r * 1.15, exposed ? C.magenta : C.cyan, 0.18);
    game.draw.sprite(MINE, exposed ? MINE_HOT : MINE_COL, m.x, m.y, scale, { anchor: 'center' });
    var p = corePos(m);
    if (exposed) {
      // telegraph: 撃てる瞬間だけ核が黄色く強く光る
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      game.draw.circle(p.x, p.y, 34, C.yellow, blink ? 0.45 : 0.25);
      game.draw.circle(p.x, p.y, 18, C.yellow);
      game.draw.circle(p.x, p.y, 9, C.white);
    } else {
      game.draw.circle(p.x, p.y, 14, C.dim);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    for (var i = mines.length - 1; i >= 0; i--) {
      var m = mines[i];
      var p = corePos(m);
      if (Math.abs(x - p.x) < 46 && Math.abs(y - p.y) < 46 && isExposed(m)) {
        kill(m, p); mines.splice(i, 1); return;
      }
      if (Math.abs(x - m.x) < m.r && Math.abs(y - m.y) < m.r) { deflect(m, x, y); return; }
    }
    if (combo > 0) { combo = 0; game.feedback.bad(x, y, { text: 'MISS' }); }
    else game.audio.play('se_tap', 0.25);
    feedback = 0.2; feedbackOk = false;
  });

  // ── ATTRACT ゴースト実演: 核が光った瞬間に手が落ちる ──
  var demo = { t: 0, y: -60, ang: 0, gx: W / 2, gy: H * 0.6, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    demo.y += 150 * dt;
    demo.ang += 2.0 * dt;
    var exposed = Math.abs(Math.atan2(Math.sin(demo.ang), Math.cos(demo.ang)) - Math.PI / 2) < 0.9;
    var cx = W * 0.5 + Math.cos(demo.ang) * 48, cy = demo.y + Math.sin(demo.ang) * 48;
    demo.gx += (cx - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (cy + 60 - demo.gy) * Math.min(1, dt * 4);
    demo.press = exposed && demo.y > H * 0.3;
    if (demo.press && demo.y < H * 0.62) {
      game.feedback.good(cx, cy, { text: '+100', color: C.yellow });
      demo.y = -60;
    }
    if (demo.y > BASE_Y) demo.y = -60;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      spaceBg();
      stepDemo(dt);
      var exposed = Math.abs(Math.atan2(Math.sin(demo.ang), Math.cos(demo.ang)) - Math.PI / 2) < 0.9;
      game.draw.circle(W / 2, demo.y, 88, exposed ? C.magenta : C.cyan, 0.18);
      game.draw.sprite(MINE, exposed ? MINE_HOT : MINE_COL, W / 2, demo.y, 13, { anchor: 'center' });
      var dcx = W / 2 + Math.cos(demo.ang) * 48, dcy = demo.y + Math.sin(demo.ang) * 48;
      game.draw.circle(dcx, dcy, exposed ? 18 : 14, exposed ? C.yellow : C.dim);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.cyan);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.yellow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.magenta);
        txt('TAP TO START', W / 2, H * 0.97, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 38, C.dim);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      spaceBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 96, resultSuccess ? C.cyan : C.magenta);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.52, 58, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.58, 44, C.yellow);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.66, 54, C.magenta);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.71, 46, C.cyan);
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
        if (fever > 0) fever -= dt;
        if (totalTime >= MAX_TIME) { finish(killed >= NEEDED); return; }
        spawnTimer -= dt;
        if (spawnTimer <= 0) { spawn(); spawnTimer = Math.max(0.5, 1.0 - killed * 0.045); }
        for (var i = mines.length - 1; i >= 0; i--) {
          var m = mines[i];
          m.y += m.vy * dt;
          m.ang += m.spin * dt;
          if (m.pop > 0) m.pop -= dt;
          if (m.y >= BASE_Y - 70) { mines.splice(i, 1); leak(m); if (done) return; }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    spaceBg();
    for (var k = 0; k < mines.length; k++) drawMine(mines[k]);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.dim);
    game.draw.rect(60, 40, (W - 120) * frac, 24, fever > 0 ? C.magenta : C.cyan);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 100, 46, C.white);
    txt(killed + ' / ' + NEEDED, W * 0.16, 158, 44, C.yellow);
    for (var l = 0; l < LEAK_LIMIT; l++) {
      game.draw.circle(W * 0.84 + l * 52, 152, 18, l < (LEAK_LIMIT - leaked) ? C.cyan : C.dim);
    }
    if (combo >= 3) txt('x' + combo, W / 2, 162, 46, C.yellow);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.26, 58, C.magenta);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 96, C.yellow);
    if (feedback > 0 && !feedbackOk && NEEDED - killed <= 3) txt('あと' + (NEEDED - killed) + '基', W / 2, H * 0.22, 50, C.magenta);

    scanlines();
  });

  game.onStart(function() {
    // 80s NEON: 緊迫した迎撃のループ
    game.audio.melody(
      [['D4', 0.25], ['A4', 0.25], ['D5', 0.5], ['C5', 0.25], ['A4', 0.25], ['F4', 0.5],
       ['G4', 0.25], ['D5', 0.25], ['C5', 0.5], ['A4', 1]],
      { tempo: 158, wave: 'square', volume: 0.09, loop: true,
        bass: [['D2', 0.5], ['D2', 0.5], ['F2', 0.5], ['G2', 0.5]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
