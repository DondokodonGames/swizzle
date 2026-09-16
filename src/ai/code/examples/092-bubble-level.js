// 092-bubble-level.js
// 水準器 — 傾きを打ち消し続けて、気泡を基準線の内側に留める
// 操作: 画面の左半分タップで左へ、右半分タップで右へ傾ける
// 成功: 校正ゲージを満たす  失敗: ゲージが尽きる or 25秒
// @mechanic: balance
// @theme: custom
// 世界観: 深夜の校正室。狂った台の上で、基準器の気泡を規定時間だけ中央に留める
// variation: 精度型(合格とみなす幅が少しずつ狭まっていく)
// spice: フィーバータイム(中盤の数秒だけ校正ゲージが倍速で溜まる)
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 8色ベタ・細線・テキスト枠のUI。中間色は市松ディザで作る
  var C = {
    black: '#000000', screen: '#031c10', grid: '#0a4a28', line: '#19c06a',
    bright: '#7dffb0', amber: '#ffb000', red: '#ff4040', white: '#e8ffe8',
  };

  var GAME_TITLE = 'LEVEL CHECK';
  var MAX_TIME = 25;
  var FILL_NEEDED = 12;      // 校正ゲージを満たすのに要る累計秒数
  var TUBE_Y = H * 0.46;
  var TUBE_W = W * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var pos, vel, drift, driftTimer, zone, fill, life, score, totalTime, done, fever;
  var ready, hitStop, feedback, feedbackOk, shake, inZonePrev;

  // 気泡(2フレーム: わずかに揺れる)
  var BUB_A = [
    '.BBB.',
    'BWWWB',
    'BWWWB',
    'BWWWB',
    '.BBB.',
  ];
  var BUB_B = [
    '.BBB.',
    'BWWBB',
    'BWWWB',
    'BBWWB',
    '.BBB.',
  ];
  var BUB_COL = { B: C.bright, W: C.white };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.26); }

  // 市松ディザ(8bit PC MONITOR の中間色)
  function dither(x, y, w, h, color, step) {
    for (var dy = 0; dy < h; dy += step) {
      for (var dx = ((dy / step) % 2) * step; dx < w; dx += step * 2) {
        game.draw.rect(x + dx, y + dy, step, step, color);
      }
    }
  }

  function crtBg() {
    game.draw.gradient(0, H, [[0, '#04250f'], [0.5, C.screen], [1, '#010a06']]);
    // 遠景: 計測グリッドと枠(細線のUI)
    for (var gx = 0; gx <= 12; gx++) game.draw.line(gx / 12 * W, 200, gx / 12 * W, H - 120, C.grid, 2);
    for (var gy = 0; gy < 12; gy++) game.draw.line(0, 200 + gy * 130, W, 200 + gy * 130, C.grid, 2);
    game.draw.line(40, 190, W - 40, 190, C.line, 3);
    game.draw.line(40, H - 110, W - 40, H - 110, C.line, 3);
    game.draw.line(40, 190, 40, H - 110, C.line, 3);
    game.draw.line(W - 40, 190, W - 40, H - 110, C.line, 3);
    dither(60, H - 100, W - 120, 60, C.grid, 8);
  }

  function initGame() {
    pos = 0; vel = 0; drift = 0.5; driftTimer = 1.2; zone = 0.20;
    fill = 0; life = 1; score = 0; totalTime = 0; done = false; fever = 0;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false; shake = 0; inZonePrev = true;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.red, 0.25);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function tilt(dir) {
    vel += dir * 0.85;
    game.audio.play('se_tap', 0.3);
  }

  function bubbleX() { return W / 2 + pos * (TUBE_W / 2); }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    tilt(x < W / 2 ? -1 : 1);
  });

  function drawTube(zoneW, lit) {
    // ガラス管(細線)
    game.draw.rect(W / 2 - TUBE_W / 2, TUBE_Y - 66, TUBE_W, 132, C.black);
    game.draw.line(W / 2 - TUBE_W / 2, TUBE_Y - 66, W / 2 + TUBE_W / 2, TUBE_Y - 66, C.line, 3);
    game.draw.line(W / 2 - TUBE_W / 2, TUBE_Y + 66, W / 2 + TUBE_W / 2, TUBE_Y + 66, C.line, 3);
    // 目盛り
    for (var t = 0; t <= 20; t++) {
      var tx = W / 2 - TUBE_W / 2 + t * TUBE_W / 20;
      game.draw.line(tx, TUBE_Y - 66, tx, TUBE_Y - (t % 5 === 0 ? 40 : 54), C.grid, 2);
    }
    // 合格幅(基準線)。精度型で狭まるので、線そのものが telegraph になる
    var zw = zoneW * (TUBE_W / 2);
    game.draw.line(W / 2 - zw, TUBE_Y - 66, W / 2 - zw, TUBE_Y + 66, lit ? C.bright : C.amber, 4);
    game.draw.line(W / 2 + zw, TUBE_Y - 66, W / 2 + zw, TUBE_Y + 66, lit ? C.bright : C.amber, 4);
    if (lit) dither(W / 2 - zw, TUBE_Y - 60, zw * 2, 120, C.grid, 8);
  }

  // ── ATTRACT ゴースト実演: 気泡が寄った側と逆を手が叩く ──
  var demo = { t: 0, pos: 0, vel: 0, gx: W / 2, gy: H * 0.68, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    demo.vel += Math.sin(demo.t * 1.3) * dt * 1.6;
    demo.pos += demo.vel * dt;
    if (Math.abs(demo.pos) > 0.5) demo.pos *= 0.9;
    var side = demo.pos > 0 ? -1 : 1;
    demo.press = Math.abs(demo.pos) > 0.16;
    if (demo.press) {
      demo.vel += side * dt * 2.2;
      if (Math.floor(demo.t * 3) % 2 === 0) game.feedback.good(W / 2, TUBE_Y, { text: 'GOOD', color: C.bright });
    }
    var tx = W / 2 + side * W * 0.26;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pos === undefined) initGame();
      crtBg();
      stepDemo(dt);
      drawTube(0.20, Math.abs(demo.pos) < 0.20);
      var wob0 = Math.floor(game.time.elapsed * 6) % 2 === 0;
      game.draw.sprite(wob0 ? BUB_A : BUB_B, BUB_COL, W / 2 + demo.pos * (TUBE_W / 2), TUBE_Y, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.12, 72, C.bright);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.17, 40, C.line);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 58, C.amber);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 38, C.line);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      crtBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawTube(zone, resultSuccess);
      game.draw.sprite(BUB_A, BUB_COL, bubbleX(), TUBE_Y, 18, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.62, 92, resultSuccess ? C.bright : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.71, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.77, 42, C.line);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.84, 52, C.amber);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.89, 44, C.bright);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    var inZone = Math.abs(pos) < zone;
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (fever > 0) fever -= dt;
        if (totalTime >= MAX_TIME) { finish(false); return; }

        // 台の狂い(外乱)は数秒ごとに向きと強さが変わる
        driftTimer -= dt;
        if (driftTimer <= 0) {
          drift = (Math.random() * 1.1 + 0.35) * (Math.random() < 0.5 ? -1 : 1);
          driftTimer = 1.0 + Math.random() * 0.8;
          game.audio.play('se_tap', 0.18);
        }
        vel += drift * dt;
        vel *= 0.985;
        pos += vel * dt;
        if (pos < -1) { pos = -1; vel = 0; }
        if (pos > 1) { pos = 1; vel = 0; }

        // 精度型: 合格幅が少しずつ狭まる
        zone = Math.max(0.085, 0.20 - (fill / FILL_NEEDED) * 0.1);

        if (inZone) {
          fill += dt * (fever > 0 ? 2 : 1);
          score += Math.round(dt * (fever > 0 ? 200 : 100));
          life = Math.min(1, life + dt * 0.25);
          if (!inZonePrev) { game.feedback.good(bubbleX(), TUBE_Y, { text: 'GOOD', color: C.bright }); game.audio.play('se_success', 0.3); }
          if (fill >= FILL_NEEDED * 0.5 && fever === 0 && fill - dt * (fever > 0 ? 2 : 1) < FILL_NEEDED * 0.5) {
            fever = 3.0;
            game.fx.popup(Math.round(fill) + ' / ' + FILL_NEEDED, W / 2, H * 0.30, { color: C.amber, size: 66 });
            game.audio.play('se_milestone', 0.6);
          }
          if (fill >= FILL_NEEDED) { finish(true); return; }
        } else {
          life -= dt * 0.38;
          if (inZonePrev) {
            feedback = 0.3; feedbackOk = false;
            game.feedback.bad(bubbleX(), TUBE_Y, { text: 'MISS' });
            game.audio.play('se_failure', 0.35);
            shake = 0.2;
          }
          if (life <= 0) { finish(false); return; }
        }
        inZonePrev = inZone;
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    crtBg();
    drawTube(zone, inZone);
    var wob = Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.sprite(wob ? BUB_A : BUB_B, BUB_COL, bubbleX(), TUBE_Y, 18, { anchor: 'center' });

    // 傾きの向きを示す台(telegraph: 外乱の向きが先に見える)
    var tiltPx = Math.max(-70, Math.min(70, (vel + drift) * 60));
    game.draw.line(W * 0.18, TUBE_Y + 190 - tiltPx, W * 0.82, TUBE_Y + 190 + tiltPx, C.line, 10);
    game.draw.rect(W / 2 - 22, TUBE_Y + 190, 44, 120, C.grid);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 22, C.grid);
    game.draw.rect(60, 40, (W - 120) * frac, 22, frac < 0.25 ? C.red : C.line);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 42, C.white);

    // 校正ゲージ(進捗)と 残りの余裕(life)
    game.draw.rect(W * 0.14, 150, W * 0.72, 34, C.black);
    game.draw.rect(W * 0.14, 150, W * 0.72 * Math.min(1, fill / FILL_NEEDED), 34, fever > 0 ? C.amber : C.bright);
    game.draw.line(W * 0.14, 150, W * 0.86, 150, C.line, 2);
    game.draw.rect(W * 0.14, H - 96, W * 0.72 * Math.max(0, life), 20, life < 0.35 ? C.red : C.line);

    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.34, 56, C.amber);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 92, C.amber);
    if (!inZone && life < 0.35 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('あと' + Math.ceil(FILL_NEEDED - fill) + '秒', W / 2, H * 0.30, 50, C.red);

    scanlines();
  });

  game.onStart(function() {
    // 8bit PC MONITOR: 単純な矩形波で淡々と刻む計測室のループ
    game.audio.melody(
      [['C4', 0.5], ['G4', 0.5], ['E4', 0.5], ['G4', 0.5],
       ['D4', 0.5], ['A4', 0.5], ['F4', 0.5], ['A4', 0.5]],
      { tempo: 116, wave: 'square', volume: 0.07, loop: true,
        bass: [['C2', 1], ['G2', 1]], bassWave: 'triangle', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
