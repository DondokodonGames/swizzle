// 345-stamp-rush.js
// スタンプラッシュ — 落ちてくるスタンプに手を潰される前に、タップで手を引っ込める瞬発反応
// 操作: タップで手を出す、スタンプが落ちる前にもう一度タップで引っ込める
// 成功: 5回 手を守る  失敗: 3回 潰される or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、判子工房） ──
  var C = { bg:'#0a0812', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', desk:'#241408' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STAMP RUSH';
  var HOW_TO_PLAY = 'TAP OUT YOUR HAND · PULL BACK BEFORE THE STAMP DROPS';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 20 → 5
  var MAX_SMASH = 3;         // 修正2: 5 → 3
  var TOP_Y = snap(H * 0.20), REST_Y = snap(H * 0.52), HAND_Y = snap(H * 0.66), FALL = 0.5, HOLD = 0.25;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stampY, phase, phaseT, handOut, handT, stamped, smashed, timeLeft, done, particles, inkMarks, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.60), W, H, C.desk, 0.9); game.draw.rect(0, snap(H * 0.60), W, 12, C.f, 0.4); }

  function nextStamp() { phase = 'wait'; stampY = TOP_Y; phaseT = 0.8 + Math.random() * 1.4; }

  function initGame() { stamped = 0; smashed = 0; timeLeft = MAX_TIME; done = false; particles = []; inkMarks = []; handOut = false; handT = 0; fbText = ''; fbCol = C.g; fbTimer = 0; nextStamp(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (stamped * 500 + Math.ceil(timeLeft) * 100) : stamped * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var im = 0; im < inkMarks.length; im++) pc(inkMarks[im].x, inkMarks[im].y, 40, C.d, 0.5);
    // 手
    if (handOut) { game.draw.rect(snap(W * 0.30), HAND_Y - 30, snap(W * 0.40), 60, C.c, 0.9); for (var fi = 0; fi < 4; fi++) game.draw.rect(snap(W * 0.33 + fi * 90), HAND_Y - 60, 60, 40, C.c, 0.9); }
    else game.draw.rect(snap(W * 0.30), snap(H * 0.82), snap(W * 0.40), 50, C.c, 0.6);
    // スタンプ
    game.draw.rect(snap(W * 0.36), snap(stampY - 120), snap(W * 0.28), 120, C.d, 0.9); game.draw.rect(snap(W * 0.30), snap(stampY), snap(W * 0.40), 40, C.a, 0.9); txt('X', W / 2, stampY + 26, 34, C.g);
    if (phase === 'wait' && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('v', W / 2, snap(H * 0.15), 48, C.a);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!handOut) { handOut = true; handT = 0; game.audio.play('se_tap', 0.2); } else { handOut = false; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SAFE HANDS!' : 'SMASHED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (handOut) { handT += dt; if (handT > 1.5) handOut = false; }
      if (phase === 'wait') { phaseT -= dt; if (phaseT <= 0) { phase = 'fall'; phaseT = 0; } }
      else if (phase === 'fall') {
        phaseT += dt; stampY = TOP_Y + (REST_Y - TOP_Y) * Math.min(1, (phaseT / FALL) * (phaseT / FALL) * 2);
        if (phaseT >= FALL) {
          phase = 'hold'; phaseT = 0; stampY = REST_Y;
          if (handOut) { smashed++; handOut = false; fbText = 'SMASHED!'; fbCol = C.a; fbTimer = 0.8; game.audio.play('se_failure', 0.6); inkMarks.push({ x: snap(W / 2 + (Math.random() - 0.5) * 100), y: HAND_Y }); if (smashed >= MAX_SMASH) { finish(false); return; } }
          else { stamped++; fbText = 'SAFE!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: HAND_Y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, col: C.b }); } if (stamped >= NEEDED) { finish(true); return; } }
        }
      } else if (phase === 'hold') { phaseT += dt; if (phaseT >= HOLD) { phase = 'rise'; phaseT = 0; } }
      else if (phase === 'rise') { phaseT += dt; stampY = REST_Y + (TOP_Y - REST_Y) * Math.min(1, phaseT / FALL); if (phaseT >= FALL) nextStamp(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.4);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.74), 60, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(stamped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var si = 0; si < MAX_SMASH; si++) game.draw.rect(snap(W / 2 + (si - (MAX_SMASH - 1) / 2) * 56) - 10, 224, 20, 20, si < smashed ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
