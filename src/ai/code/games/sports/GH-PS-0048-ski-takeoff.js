// GH-PS-0048-ski-takeoff.js
// スキーテイクオフ — 雪面の凸凹を読んでジャンプの踏み切りを決める
// 操作: 台の端(色が変わる場所)に来た瞬間にタップして踏み切る
// 終わり: 飛距離(m)が残る。早すぎ/遅すぎは大きく減点
// @mechanic: timing_one_shot
// @theme: snow_ramp
// 世界観: 雪山のジャンプ台。滑走してくる途中、台の端に来た瞬間だけ強く踏み切れる。ずれるほど距離が落ちる
// 残るもの: 飛距離(m、SCORE) + BEST
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s LOW POLY: 面ベタ塗り。輪郭は line、面は横1pxストリップ塗り
  var C = {
    sky1: '#bfe0f5', sky2: '#e8f4ff', snow1: '#ffffff', snow2: '#d8e8f0', ramp: '#c8d8e0',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffb020', ink: '#1a2a34', white: '#ffffff',
  };

  var GAME_TITLE = 'SKI TAKEOFF';
  var RAMP_END = 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, distM = 0, done, endWait, launched;

  var progress, launchAt, done2;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function faceStrip(x0, y0, x1, y1, x2, y2, x3, y3, color) {
    var steps = 40;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var lx0 = x0 + (x3 - x0) * t, ly0 = y0 + (y3 - y0) * t;
      var lx1 = x1 + (x2 - x1) * t, ly1 = y1 + (y2 - y1) * t;
      game.draw.line(lx0, ly0, lx1, ly1, color, 3);
    }
  }

  function slopeBg() {
    // 全高を必ず塗る(透明のまま残さない)
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [1, C.snow2]]);
    game.draw.rect(0, H * 0.90, W, H * 0.10, C.snow2);
    // 雲の影が斜面を横切る(画面全体で動きを作る)
    var shadowY = (game.time.elapsed * 500) % (H + 300) - 150;
    game.draw.rect(0, shadowY, W, 260, '#3a5a6a', 0.22);
    // 低ポリ斜面(面ストリップ)
    faceStrip(0, H * 0.30, W, H * 0.30, W, H * 0.66, 0, H * 0.90, C.snow1);
    game.draw.line(0, H * 0.30, W, H * 0.30, C.ink, 3);
    game.draw.line(0, H * 0.90, W, H * 0.66, C.ink, 3);
    // 台(踏み切りライン)
    var edgeY = H * 0.30 + (H * 0.90 - H * 0.30) * RAMP_END;
    var edgeYb = H * 0.90 + (H * 0.66 - H * 0.90) * 0;
    game.draw.rect(0, H * 0.30 + (H * 0.66 - H * 0.30) * RAMP_END - 6, W, 12, C.gold, 0.8);
  }

  function playerY(p) {
    return H * 0.30 + (H * 0.66 - H * 0.30) * Math.min(1, p);
  }
  function playerX(p) {
    return W * 0.5;
  }

  var SKIER = ['.#.', '###', '.#.', '#.#'];

  function drawSkier(p, jumped) {
    var y = jumped ? H * 0.30 - 40 : playerY(p);
    var x = playerX(p);
    game.draw.circle(x, y + 30, 30, '#00000022');
    game.draw.sprite(SKIER, { '#': C.ink }, x, y, 18, { anchor: 'center' });
  }

  function initGame() {
    progress = 0; launchAt = -1; done2 = false; distM = 0; done = false; endWait = 0; launched = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function jump() {
    if (done || ready > 0 || launched) return;
    launched = true;
    var diff = Math.abs(progress - RAMP_END);
    distM = Math.max(2, Math.round((30 - diff * 260) * 10) / 10);
    ok = diff < 0.08;
    hitStop = 0.1;
    if (ok) { game.feedback.good(playerX(progress), H * 0.30, { text: distM + 'm', color: C.good }); game.fx.burst(playerX(progress), H * 0.30, { color: C.gold, count: 16, speed: 360 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(playerX(progress), H * 0.30, { text: distM + 'm' }); game.audio.play('se_bad', 0.3); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    jump();
  });

  // ── ATTRACT ゴースト実演: 台の端に来た瞬間だけタップ ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false, p: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    demo.p = Math.min(1, cyc / 1.3);
    progress = demo.p;
    demo.press = Math.abs(demo.p - RAMP_END) < 0.03;
    if (demo.press && cyc < 1.3) { game.feedback.good(playerX(demo.p), H * 0.30, { text: '28m', color: C.good }); game.fx.burst(playerX(demo.p), H * 0.30, { color: C.gold, count: 10, speed: 300 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      slopeBg();
      stepDemo(dt);
      drawSkier(demo.p, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 54, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + 'm' : '-'), W / 2, H * 0.15, 28, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 36, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      slopeBg();
      drawSkier(progress, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 56, ok ? C.ink : C.bad);
      txt(distM + 'm', W / 2, H * 0.20, 60, C.gold);
      var best = Math.max(game.best, distM);
      txt('BEST ' + best + 'm', W / 2, H * 0.26, 32, C.ink);
      if (distM > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.32, 34, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 34, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(distM, { label: distM + 'm' }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!launched) {
      var prevP = progress;
      progress += dt * 0.62;
      if (prevP < 0.5 && progress >= 0.5) game.fx.popup('HALF', W / 2, H * 0.16, { color: C.gold, size: 44 });
      if (progress >= 1) { distM = 1; ok = false; launched = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    slopeBg();
    drawSkier(progress, launched);

    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.5);
    game.draw.rect(60, 40, (W - 120) * Math.min(1, progress), 20, C.gold);
    txt(Math.round(progress * 100) + ' / 100', W / 2, 100, 34, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 70, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
