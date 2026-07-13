// 118-basket-shot.js
// バスケシュート — 海流を読んでアーチを描き、狙いの口に発光体を通す爽快感
// 操作: 上スワイプで発射、左右スワイプで足場を移動
// 成功: 制限時間内に 3 発通す  失敗: 時間切れ
// @mechanic: aim_shoot
// @theme: ocean
// 世界観: 深海の潜水士が、海流を読んで発光体をアーチ状に撃ち、巨大生物の口に届ける
// variation: 物量型(命中を重ねると的が増える)
// spice: フィーバータイム(2発通すと数秒だけ得点2倍)
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 深海ネオン
  var C = {
    abyss: '#02061f', teal: '#00e0c8', cyan: '#37c9ff', lime: '#8dff5a',
    magenta: '#ff45c8', amber: '#ffd23f', red: '#ff3b6b', white: '#eafcff', dim: '#123055',
  };

  var GAME_TITLE = 'DEEP SHOT';
  var MAX_TIME = 13;
  var NEEDED = 3;
  var GRAVITY = 1200;
  var LAUNCH_Y = H - 220;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var orbX, orbY, vx, vy, launched, current, trail;
  var score, hits, timeLeft, done, ready, fever, hitStop, feedback, feedbackOk;
  var targets;

  // 巨大生物の口(的)スプライト
  var MAW = [
    '..LLLLLL..',
    '.LTTTTTTL.',
    'LTMMMMMMTL',
    'LTMKKKKMTL',
    'LTMKAAKMTL',
    'LTMKKKKMTL',
    'LTMMMMMMTL',
    '.LTTTTTTL.',
    '..LLLLLL..',
  ];
  var MAW_COL = { L: '#0a2a3a', T: C.teal, M: '#04101f', K: C.magenta, A: C.amber };
  // 発光体スプライト(顔つき)
  var ORB = ['.CC.', 'CWWC', 'CWWC', '.CC.'];
  var ORB_COL = { C: C.cyan, W: C.white };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#01040f', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.16); }

  function seaBg() {
    game.draw.gradient(0, H, [[0, '#041a3a'], [0.55, '#02102a'], [1, '#01050f']]);
    for (var i = 0; i < 5; i++) {
      var lx = (i / 4) * W;
      game.draw.line(lx, 0, lx - 120, H, C.dim, 3);
    }
    for (var b = 0; b < 9; b++) {
      var by = (H - ((game.time.elapsed * 40 + b * 220) % (H + 100)));
      game.draw.circle((b * 137) % W, by, 6 + (b % 3) * 3, C.cyan, 0.15);
    }
  }

  function drawTarget(t, danger) {
    var pulse = 1 + Math.sin(game.time.elapsed * 5 + t.x) * 0.06;
    game.draw.sprite(MAW, MAW_COL, t.x, t.y, 10 * pulse, { anchor: 'center' });
    if (danger) game.draw.circle(t.x, t.y, t.r, C.amber, 0.14);
  }

  function currentArrow() {
    var cy = LAUNCH_Y - 40, len = current * 0.4;
    game.draw.line(W / 2, cy, W / 2 + len, cy, current > 0 ? C.lime : C.magenta, 8);
    game.draw.circle(W / 2 + len, cy, 12, current > 0 ? C.lime : C.magenta, 1);
  }

  function newTargets() {
    targets = [];
    var n = hits >= 2 ? 2 : 1; // 物量型: 2発通すと的が2つ
    for (var i = 0; i < n; i++) {
      targets.push({ x: W * 0.24 + game.random(0, W * 0.52), y: H * 0.2 + game.random(0, H * 0.16), r: 96 });
    }
  }
  function resetOrb() {
    orbX = W / 2; orbY = LAUNCH_Y; vx = 0; vy = 0; launched = false; trail = [];
    current = game.random(-160, 160);
  }
  function initGame() {
    score = 0; hits = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; hitStop = 0; feedback = 0; feedbackOk = false;
    newTargets(); resetOrb();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else { game.audio.play('se_failure'); hitStop = 0.45; game.fx.flash(C.red, 0.28); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function launch(dirX) {
    if (launched) return;
    launched = true; vx = dirX; vy = -1500;
    game.audio.play('se_jump');
  }
  function scoreHit(t) {
    hits++;
    var gain = fever > 0 ? 200 : 100;
    score += gain;
    feedback = 0.4; feedbackOk = true;
    game.feedback.good(t.x, t.y, { text: '+' + gain, color: C.lime });
    if (hits === 2) { fever = 3.5; game.audio.play('se_milestone'); }
    if (hits >= NEEDED) { finish(true); return; }
    newTargets(); resetOrb();
  }
  function missOrb() {
    feedback = 0.4; feedbackOk = false; hitStop = 0.3;
    game.feedback.bad(orbX, Math.max(80, orbY), { text: 'MISS' });
    resetOrb();
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (dir === 'up') launch(game.random(-120, 120));
    else if (dir === 'left' && !launched) orbX = Math.max(120, orbX - 110);
    else if (dir === 'right' && !launched) orbX = Math.min(W - 120, orbX + 110);
  });

  // ATTRACT ゴースト実演
  var demo = { x: W / 2, y: LAUNCH_Y, vx: 0, vy: 0, t: 0, launched: false, gx: W / 2, gy: LAUNCH_Y + 60, press: false, tx: W / 2, ty: H * 0.26 };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.launched) {
      demo.gy += (LAUNCH_Y + 30 - demo.gy) * Math.min(1, dt * 4);
      demo.press = true;
      if (demo.t > 0.7) { demo.launched = true; demo.press = false; demo.vx = (demo.tx - demo.x) * 1.1; demo.vy = -1400; }
    } else {
      demo.vy += GRAVITY * dt; demo.x += demo.vx * dt; demo.y += demo.vy * dt;
      demo.gx = demo.x; demo.gy = demo.y - 60;
      if (demo.y <= demo.ty || demo.y > H) {
        if (demo.y <= demo.ty + 40) game.feedback.good(demo.tx, demo.ty, { text: '+100', color: C.lime });
        demo.launched = false; demo.t = 0; demo.x = W / 2; demo.y = LAUNCH_Y; demo.vy = 0;
        demo.tx = W * 0.3 + game.random(0, W * 0.4);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      seaBg(); stepDemo(dt);
      drawTarget({ x: demo.tx, y: demo.ty, r: 96 }, true);
      game.draw.sprite(ORB, ORB_COL, demo.x, demo.y, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 84, C.amber);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.16, 40, C.lime);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.magenta);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      seaBg();
      if (hitStop > 0) hitStop -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, resultSuccess ? C.lime : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.56, 44, C.amber);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.63, 56, C.magenta);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.68, 48, C.cyan);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else {
        if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
        else {
          timeLeft -= dt;
          if (fever > 0) fever -= dt;
          if (timeLeft <= 0) { finish(false); return; }
          if (launched) {
            vy += GRAVITY * dt; vx += current * dt;
            orbX += vx * dt; orbY += vy * dt;
            trail.push({ x: orbX, y: orbY }); if (trail.length > 10) trail.shift();
            for (var i = 0; i < targets.length; i++) {
              if (game.hit.circle(orbX, orbY, 24, targets[i].x, targets[i].y, targets[i].r)) { scoreHit(targets[i]); return; }
            }
            if (orbY > H + 60 || orbX < -60 || orbX > W + 60 || (vy > 0 && orbY > LAUNCH_Y + 40)) missOrb();
          }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    seaBg();
    for (var t2 = 0; t2 < targets.length; t2++) drawTarget(targets[t2], !launched);
    for (var tr = 0; tr < trail.length; tr++) game.draw.circle(trail[tr].x, trail[tr].y, 10 * (tr / trail.length), C.cyan, 0.3);
    game.draw.sprite(ORB, ORB_COL, orbX, orbY, 18, { anchor: 'center' });
    if (!launched) currentArrow();

    // HUD
    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.magenta : C.teal);
    game.draw.rect(60, 40, W - 120, 26, C.dim, 0.4);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 46, C.white);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 44, C.lime);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.32, 56, C.magenta);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 92, C.amber);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 1],
       ['G3', 0.5], ['B3', 0.5], ['D4', 0.5], ['C4', 0.5], ['E4', 1], ['A3', 1]],
      { tempo: 120, wave: 'triangle', volume: 0.1, loop: true,
        bass: [['A1', 1], ['A1', 1], ['F1', 1], ['G1', 1], ['C2', 1], ['A1', 1]], bassWave: 'sine', bassVolume: 0.09 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
