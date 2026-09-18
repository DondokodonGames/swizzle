// GH-DS-0025-headshot.js
// ヘッドショット — 弾は12発。迫る群れの、頭だけを撃つ
// 操作: タップで撃つ
// 終わり: 弾を撃ち切るか、1体でも柵に届いたら終了。撃墜数・外した弾・残弾が残る
// @mechanic: aim_shoot
// @theme: night_barricade
// 世界観: 夜のバリケード。手持ちの弾は12発しかなく、群れは止まらない。胴に当てても倒れない
// 残るもの: 撃墜数×100 + 残弾×50 = SCORE。外した弾は MISS として数える(何が不正解だったかが残る)
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s BIG SPRITE: 多色。巨大キャラ + 床影で間合いを見せる
  var C = {
    sky1: '#0b1020', sky2: '#1b1e3a', sky3: '#3a2a3f', ground: '#2a2418', ground2: '#3d3521',
    fence: '#8a6a3a', fence2: '#5a4424', skin: '#8fb08a', skin2: '#5c7a5a', cloth: '#5a4a6a',
    eye: '#ff3d3d', blood: '#c8202a', gold: '#ffd400', good: '#6bff9a', bad: '#ff3d5e', white: '#ffffff',
    ink: '#0a0a12', muzzle: '#fff2a0',
  };

  var GAME_TITLE = 'HEADSHOT';
  var MAX_TIME = 20;
  var BULLETS = 12;
  var FENCE_Y = H * 0.80;      // 柵。ここに届かれたら終わり
  var HORIZON = H * 0.36;      // 群れが現れる奥

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, endBy = '';

  var bullets, kills, misses, zombies, totalTime, done, spawnTimer;
  var ready, hitStop, shake, flashT, endWait;

  // 巨大スプライト(2フレーム: 歩き)
  var Z_A = [
    '....HHHH....',
    '...HHEHHE...',
    '...HHHHHH...',
    '....HHHH....',
    '..CCCCCCCC..',
    '.CCCCCCCCCC.',
    'SSCCCCCCCCSS',
    'S.CCCCCCCC.S',
    '..CCCCCCCC..',
    '..CCC..CCC..',
    '..CCC..CCC..',
    '.SSS....SSS.',
  ];
  var Z_B = [
    '....HHHH....',
    '...HHEHHE...',
    '...HHHHHH...',
    '....HHHH....',
    '..CCCCCCCC..',
    '.CCCCCCCCCC.',
    'SSCCCCCCCCSS',
    'SSCCCCCCCCSS',
    '..CCCCCCCC..',
    '..CCC..CCC..',
    '...CC..CC...',
    '...SS..SS...',
  ];
  var Z_COL = { H: C.skin, E: C.eye, C: C.cloth, S: C.skin2 };
  var HEAD_ROWS = 4;   // 上4行が頭。ここだけが当たり

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function nightBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.30, C.sky2], [0.38, C.sky3], [0.40, C.ground2], [1, C.ground]]);
    // 月
    // 月は左上(弾のHUDと撃墜数の間の空き)
    game.draw.circle(W * 0.20, H * 0.23, 80, '#f4e9b0', 0.9);
    game.draw.circle(W * 0.17, H * 0.22, 62, C.sky1, 0.9);
    // 地面の筋(奥ほど詰める = 間合い)
    for (var i = 0; i < 10; i++) {
      var t = i / 10;
      var y = HORIZON + (FENCE_Y - HORIZON) * t * t;
      game.draw.rect(0, y, W, 4, C.ground2, 0.5);
    }
    // 柵(手前)
    game.draw.rect(0, FENCE_Y, W, 26, C.fence);
    game.draw.rect(0, FENCE_Y + 26, W, 10, C.fence2);
    for (var p = 0; p < 9; p++) game.draw.rect(60 + p * 120, FENCE_Y - 60, 26, 100, C.fence2);
  }

  function initGame() {
    bullets = BULLETS; kills = 0; misses = 0; zombies = []; totalTime = 0; done = false;
    spawnTimer = 0.2; ready = 0.8; hitStop = 0; shake = 0; flashT = 0; endWait = 0; endBy = '';
  }

  // 奥(0)→柵(1)の進み具合 t で、画面座標と大きさを出す。これが90s BIG SPRITEの「間合い」
  function place(z) {
    var t = z.t;
    return { x: z.x, y: HORIZON + (FENCE_Y - HORIZON) * t * t, px: 8 + 26 * t };
  }

  function spawn() {
    zombies.push({ x: 160 + Math.random() * (W - 320), t: 0, speed: 0.10 + Math.random() * 0.08 + totalTime * 0.004, flinch: 0 });
  }

  function finish(by) {
    if (done) return;
    done = true; endBy = by;
    finalScore = kills * 100 + bullets * 50;
    game.audio.stopBgm();
    if (by === 'fence') { game.audio.play('se_failure'); hitStop = 0.5; shake = 0.5; game.fx.flash(C.bad, 0.3); }
    else { game.audio.play('se_success'); }
    endWait = 1.4;
  }

  function shoot(x, y) {
    if (bullets <= 0) return;
    bullets--;
    flashT = 0.08;
    game.audio.play('se_break', 0.5);
    // 手前(t大)から判定。頭だけが当たり
    var order = zombies.slice().sort(function(a, b) { return b.t - a.t; });
    for (var i = 0; i < order.length; i++) {
      var z = order[i], p = place(z);
      var w = 12 * p.px, h = 12 * p.px;
      var left = p.x - w / 2, top = p.y - h;
      if (x < left || x > left + w || y < top || y > top + h) continue;
      var headBottom = top + HEAD_ROWS * p.px;
      if (y <= headBottom) {
        // 正解: 頭
        kills++;
        zombies.splice(zombies.indexOf(z), 1);
        hitStop = 0.09;
        var late = z.t > 0.8;
        game.feedback.good(p.x, top, { text: late ? 'PERFECT' : 'NICE', color: late ? C.gold : C.good });
        game.fx.burst(p.x, top + p.px * 2, { color: C.blood, count: 14, speed: 380 });
        if (kills === 5) { game.fx.popup(kills + ' / ' + BULLETS, W / 2, H * 0.28, { color: C.gold, size: 66 }); game.audio.play('se_milestone', 0.6); }
      } else {
        // 不正解: 胴。弾を1発捨てただけ。相手はひるむが倒れない
        misses++;
        z.flinch = 0.35;
        game.feedback.bad(x, y, { text: 'MISS' });
      }
      if (bullets === 0) finish('empty');
      return;
    }
    // 何にも当たらない
    misses++;
    game.feedback.bad(x, y, { text: 'MISS' });
    if (bullets === 0) finish('empty');
  }

  function drawZombie(z) {
    var p = place(z);
    var wob = Math.floor((game.time.elapsed * 6 + z.x) % 2) === 0;
    // 床影(BIG SPRITE の要: 間合いは影で読む)
    game.draw.circle(p.x, p.y + p.px, 5 * p.px, '#000000', 0.35);
    var frame = z.flinch > 0 ? Z_A : (wob ? Z_A : Z_B);
    var dx = z.flinch > 0 ? (Math.random() * 2 - 1) * 8 : 0;
    game.draw.sprite(frame, Z_COL, p.x - 6 * p.px + dx, p.y - 12 * p.px, p.px, { anchor: 'topleft', flipX: false });
    // 手前の個体だけ、頭の当たりを淡く示す(telegraph: どこが正解かは見せる)
    if (z.t > 0.55) {
      var top = p.y - 12 * p.px;
      game.draw.rect(p.x - 6 * p.px, top, 12 * p.px, HEAD_ROWS * p.px, C.gold, 0.10);
    }
  }

  function drawBullets() {
    for (var i = 0; i < BULLETS; i++) {
      var on = i < bullets;
      game.draw.rect(W - 60 - i * 34, 150, 22, 40, on ? C.gold : C.ink, on ? 1 : 0.5);
      game.draw.rect(W - 60 - i * 34, 150, 22, 10, on ? '#a67c00' : C.ink, on ? 1 : 0.5);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    shoot(x, y);
  });

  // ── ATTRACT ゴースト実演: 頭に当てると倒れ、胴に当てると弾だけ減る ──
  var demo = { t: 0, z: { x: W * 0.5, t: 0.5, speed: 0, flinch: 0 }, gx: W * 0.5, gy: H * 0.6, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    var p = place(demo.z);
    var top = p.y - 12 * p.px;
    var headY = top + 2 * p.px, bodyY = top + 8 * p.px;
    var target = cyc < 1.5 ? bodyY : headY;
    demo.gy += (target - demo.gy) * Math.min(1, dt * 5);
    demo.gx += (p.x - demo.gx) * Math.min(1, dt * 5);
    demo.press = (cyc > 1.2 && cyc < 1.4) || (cyc > 2.7 && cyc < 2.9);
    if (cyc > 1.2 && cyc < 1.23) { demo.z.flinch = 0.3; game.feedback.bad(p.x, bodyY, { text: 'MISS' }); }
    if (cyc > 2.7 && cyc < 2.73) { game.feedback.good(p.x, top, { text: 'NICE', color: C.good }); game.fx.burst(p.x, headY, { color: C.blood, count: 10, speed: 300 }); }
    if (demo.z.flinch > 0) demo.z.flinch -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bullets === undefined) initGame();
      nightBg();
      stepDemo(dt);
      drawZombie(demo.z);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 84, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.eye);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 40, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      nightBg();
      if (shake > 0) shake -= dt;
      // 残るもの: 撃墜 / 外し / 残弾 を絵で並べ、SCORE と BEST
      txt(endBy === 'fence' ? 'GAME OVER' : 'FINISH', W / 2, H * 0.30, 92, endBy === 'fence' ? C.bad : C.gold);
      var rowY = H * 0.42;
      for (var k = 0; k < kills; k++) game.draw.sprite(Z_A.slice(0, HEAD_ROWS), Z_COL, 120 + (k % 12) * 72 + 24, rowY + Math.floor(k / 12) * 60, 5, { anchor: 'topleft' });
      txt(String(kills), W - 120, rowY + 20, 56, C.good, 'right');
      var rowY2 = rowY + 150;
      for (var m = 0; m < misses; m++) game.draw.circle(140 + (m % 12) * 60, rowY2 + 16, 14, C.bad, 0.9);
      txt(String(misses), W - 120, rowY2 + 20, 56, C.bad, 'right');
      var rowY3 = rowY2 + 110;
      for (var b = 0; b < bullets; b++) game.draw.rect(120 + b * 40, rowY3, 22, 40, C.gold);
      txt(String(bullets), W - 120, rowY3 + 20, 56, C.gold, 'right');
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.70, 58, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.76, 44, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.84, 54, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 46, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        game.end.record(finalScore, { kills: kills, misses: misses, bullets: bullets, endBy: endBy });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { finish('time'); }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawn(); spawnTimer = Math.max(0.6, 1.6 - totalTime * 0.05); }
      for (var i = 0; i < zombies.length; i++) {
        var z = zombies[i];
        if (z.flinch > 0) { z.flinch -= dt; continue; }
        z.t += z.speed * dt;
        if (z.t >= 1) { finish('fence'); break; }
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    // draw
    nightBg();
    zombies.slice().sort(function(a, b) { return a.t - b.t; }).forEach(drawZombie);
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.muzzle, 0.18);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.good);
    txt('SCORE ' + String(kills * 100 + bullets * 50).padStart(6, '0'), W / 2, 102, 46, C.white);
    txt(String(kills), 90, 168, 48, C.good, 'left');
    drawBullets();

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 96, C.gold);
    if (!done && bullets <= 3 && bullets > 0 && Math.floor(game.time.elapsed * 4) % 2 === 0) txt('あと' + bullets + '発', W / 2, H * 0.26, 50, C.gold);

    scanlines();
  });

  game.onStart(function() {
    // 90s BIG SPRITE: 重い低音のループ
    game.audio.melody(
      [['E3', 0.5], ['E3', 0.5], ['G3', 0.5], ['E3', 0.5], ['D3', 0.5], ['E3', 0.5], ['R', 0.5], ['B2', 0.5]],
      { tempo: 120, wave: 'square', volume: 0.08, loop: true,
        bass: [['E2', 1], ['E2', 1], ['D2', 1], ['B1', 1]], bassWave: 'triangle', bassVolume: 0.09 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
