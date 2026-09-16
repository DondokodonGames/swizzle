// 200-century-mark.js
// センチュリーマーク — 落ちてくる樽を板で弾き続け、甲板に落とさない
// 操作: 指をなぞって受け板を動かす(タップした位置へも寄る)
// 成功: 20回 弾く  失敗: 3個 落とす or 15秒
// @mechanic: drag_follow
// @theme: pirate
// 世界観: 海賊船の甲板。荷を海へ落とせば首が飛ぶので、板一枚で弾き上げ続ける
// variation: 変拍子型(落下の間隔と速さが不規則に揺れる)
// spice: 二重課題(終盤はたまに2つ同時に落ちてくる)
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODERN AD-GAME: 高彩度・高コントラスト・太い縁取り
  var C = {
    sea1: '#0aa3d6', sea2: '#0668a8', deck: '#e8a33c', deck2: '#b8701c',
    barrel: '#ff5b2e', barrel2: '#a82f12', pad: '#31e06a', pad2: '#0d8c3a',
    ink: '#101a2c', white: '#ffffff', gold: '#ffd400', bad: '#ff2e55',
  };

  var GAME_TITLE = 'DECK RALLY';
  var MAX_TIME = 15;
  var NEEDED = 20;
  var DROP_LIMIT = 3;
  var PAD_Y = H * 0.80;
  var PAD_W = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var padX, padTarget, barrels, hits, drops, score, combo, totalTime, done, spawnTimer;
  var ready, hitStop, feedback, feedbackOk, shake;

  // 樽(2フレーム: 回転)
  var BARREL_A = [
    '.RRRR.',
    'RDDDDR',
    'RDDDDR',
    'RDDDDR',
    'RDDDDR',
    '.RRRR.',
  ];
  var BARREL_B = [
    '.RRRR.',
    'RDDDDR',
    'RDRRDR',
    'RDRRDR',
    'RDDDDR',
    '.RRRR.',
  ];
  var BARREL_COL = { R: C.barrel2, D: C.barrel };

  function txt(str, x, y, sz, color, align) {
    // MODERN AD-GAME: 太い縁取り
    var a = align || 'center';
    game.draw.text(str, x - 4, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x + 4, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y - 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: a });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  function shipBg() {
    game.draw.gradient(0, H, [[0, '#7fe3ff'], [0.34, C.sea1], [0.52, C.sea2], [1, '#03304f']]);
    // 遠景: 帆と水平線
    game.draw.rect(0, H * 0.34, W, 12, C.white, 0.6);
    game.draw.rect(W * 0.02, H * 0.08, 36, H * 0.28, C.deck2);   // 帆柱は左端へ。0.12W は進捗カウンタの下
    for (var s0 = 0; s0 < 3; s0++) {
      game.draw.circle(W * 0.42 + s0 * 190, H * 0.18 - s0 * 30, 86, C.white, 0.85);
    }
    // 甲板(太い縁取りで手前を強調)
    game.draw.rect(0, PAD_Y + 120, W, H, C.deck);
    game.draw.rect(0, PAD_Y + 120, W, 16, C.ink);
    for (var p = 0; p < 8; p++) game.draw.rect(0, PAD_Y + 160 + p * 90, W, 10, C.deck2);
  }

  function initGame() {
    padX = W / 2; padTarget = W / 2; barrels = [];
    hits = 0; drops = 0; score = 0; combo = 0; totalTime = 0; done = false;
    spawnTimer = 0.25; ready = 0.8; hitStop = 0;
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
      game.fx.flash(C.bad, 0.28);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function spawn() {
    // 変拍子型: 速さも横位置も毎回ずらす
    barrels.push({
      x: 140 + Math.random() * (W - 280),
      y: 220,
      vy: 380 + Math.random() * 320,
      vx: (Math.random() * 2 - 1) * 120,
      spin: 0,
      pop: 0,
    });
  }

  function bounce(b) {
    hits++;
    combo++;
    var gain = 100 + Math.min(300, (combo - 1) * 25);
    score += gain;
    b.vy = -(420 + Math.random() * 180);
    b.vx = (b.x - padX) * 2.2;
    b.pop = 0.2;
    feedback = 0.25; feedbackOk = true;
    game.feedback.good(b.x, PAD_Y - 40, { text: '+' + gain, color: C.gold });
    game.audio.play('se_success', 0.42);
    game.fx.burst(b.x, PAD_Y - 30, { color: C.gold, count: 8, speed: 300 });
    if (hits === 10) {
      game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.34, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.6);
    }
    if (hits >= NEEDED) finish(true);
  }

  function drop(b) {
    drops++;
    combo = 0;
    feedback = 0.4; feedbackOk = false;
    hitStop = 0.3; shake = 0.35;
    game.audio.play('se_failure', 0.6);
    game.feedback.bad(b.x, PAD_Y + 120, { text: 'MISS' });
    if (drops >= DROP_LIMIT) finish(false);
  }

  function drawPad(x) {
    game.draw.rect(x - PAD_W / 2 - 6, PAD_Y - 6, PAD_W + 12, 46, C.ink);
    game.draw.rect(x - PAD_W / 2, PAD_Y, PAD_W, 34, C.pad);
    game.draw.rect(x - PAD_W / 2, PAD_Y + 22, PAD_W, 12, C.pad2);
  }

  function drawBarrel(b) {
    var wob = Math.floor(game.time.elapsed * 14 + b.x * 0.02) % 2 === 0;
    var scale = 20 * (1 + b.pop * 1.4);
    // telegraph: 落下地点に影。板をどこへ置くかが先に読める
    var land = Math.max(80, Math.min(W - 80, b.x + b.vx * 0.25));
    game.draw.circle(land, PAD_Y + 60, 48, C.ink, 0.35);
    game.draw.sprite(wob ? BARREL_A : BARREL_B, BARREL_COL, b.x, b.y, scale, { anchor: 'center' });
  }

  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0) return;
    padTarget = x;
  });

  game.onMove(function(x) {
    if (state !== S.PLAYING || done || ready > 0) return;
    padTarget = x;
  });

  // ── ATTRACT ゴースト実演: 落下点へ手が滑り、板が受ける ──
  var demo = { t: 0, x: W * 0.5, y: 260, vy: 420, vx: 90, gx: W / 2, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    demo.y += demo.vy * dt;
    demo.x += demo.vx * dt;
    if (demo.x < 140 || demo.x > W - 140) demo.vx *= -1;
    demo.gx += (demo.x - demo.gx) * Math.min(1, dt * 4);
    demo.press = true;
    if (demo.y >= PAD_Y - 30) {
      demo.y = PAD_Y - 30;
      demo.vy = -460;
      game.feedback.good(demo.x, PAD_Y - 40, { text: '+100', color: C.gold });
    }
    demo.vy += 1500 * dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (padX === undefined) initGame();
      shipBg();
      stepDemo(dt);
      drawPad(demo.gx);
      var wob0 = Math.floor(game.time.elapsed * 14) % 2 === 0;
      game.draw.sprite(wob0 ? BARREL_A : BARREL_B, BARREL_COL, demo.x, demo.y, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, PAD_Y + 90, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.17, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 60, C.barrel);
        txt('TAP TO START', W / 2, H * 0.98, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.98, 40, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      shipBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawPad(padX);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 96, resultSuccess ? C.gold : C.bad);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.52, 58, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.58, 44, C.gold);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.66, 54, C.gold);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.71, 46, C.white);
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
        if (totalTime >= MAX_TIME) { finish(hits >= NEEDED); return; }
        padX += (padTarget - padX) * Math.min(1, dt * 12);
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          // 変拍子型: 間隔そのものを揺らす
          spawnTimer = 0.55 + Math.random() * 0.75 - Math.min(0.3, hits * 0.012);
          // 二重課題: 終盤はたまに2つ同時
          if (hits >= 12 && Math.random() < 0.3) spawn();
        }
        for (var i = barrels.length - 1; i >= 0; i--) {
          var b = barrels[i];
          b.vy += 1500 * dt;
          b.y += b.vy * dt;
          b.x += b.vx * dt;
          if (b.x < 90 || b.x > W - 90) b.vx *= -1;
          if (b.pop > 0) b.pop -= dt;
          if (b.vy > 0 && b.y >= PAD_Y - 30 && b.y <= PAD_Y + 60 && Math.abs(b.x - padX) < PAD_W / 2 + 20) {
            bounce(b);
            if (done) return;
          } else if (b.y > PAD_Y + 150) {
            barrels.splice(i, 1);
            drop(b);
            if (done) return;
          }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    shipBg();
    for (var k = 0; k < barrels.length; k++) drawBarrel(barrels[k]);
    drawPad(padX);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 26, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 26, frac < 0.25 ? C.bad : C.pad);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 106, 48, C.white);
    txt(hits + ' / ' + NEEDED, W * 0.16, 168, 46, C.gold);
    for (var d = 0; d < DROP_LIMIT; d++) {
      game.draw.rect(W * 0.80 + d * 54, 150, 40, 34, d < (DROP_LIMIT - drops) ? C.barrel : C.ink);
    }
    if (combo >= 3) txt('x' + combo, W / 2, 172, 48, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 96, C.gold);
    if (feedback > 0 && !feedbackOk && NEEDED - hits <= 3) txt('あと' + (NEEDED - hits) + '回', W / 2, H * 0.30, 50, C.gold);

    scanlines();
  });

  game.onStart(function() {
    // MODERN AD-GAME: 短く跳ねる、すぐ耳に残るループ
    game.audio.melody(
      [['E5', 0.25], ['G5', 0.25], ['E5', 0.25], ['C5', 0.25], ['D5', 0.5], ['G4', 0.5],
       ['C5', 0.25], ['E5', 0.25], ['G5', 0.5], ['E5', 0.5]],
      { tempo: 172, wave: 'square', volume: 0.09, loop: true,
        bass: [['C3', 0.5], ['C3', 0.5], ['G2', 0.5], ['A2', 0.5]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
