// 797-tension-wire.js
// テンションワイヤー — ワイヤーの張力が限界を超える前にタップで緩めろ
// 操作: タップ — ワイヤーを緩める（張力ダウン）
// 成功: 16秒間 ワイヤーを切らずに耐える  失敗: 3回 切断 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、緊張の綱） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WIRE = '#8494a8', WIRE_HI = '#c0d0e0', POST1 = '#2a3545', POST2 = '#4a5a6a', SAFE = '#00ff41', WARN = '#ffaa00', DANGER = '#ff2079';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TENSION WIRE';
  var HOW_TO_PLAY = 'TAP TO RELEASE TENSION · KEEP THE WIRE FROM SNAPPING PAST THE RED LINE';
  var MAX_TIME    = 24;
  var WIN_TIME    = 16;      // 修正2: 90 → 16
  var MAX_CUTS    = 3;
  var RISE_SPEED = 0.11, TAP_REDUCE = 0.09, DANGER_ZONE = 0.82, WARN_ZONE = 0.58, DANGER_GRACE = 1.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tension, cuts, inDanger, dangerTimer, gameTimer, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, tapFlash, vibration;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#030508');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { tension = 0.2; cuts = 0; inDanger = false; dangerTimer = 0; gameTimer = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapFlash = 0; vibration = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(gameTimer) * 300 + Math.ceil(timeLeft) * 200 - cuts * 500) : Math.floor(gameTimer) * 150;
    if (finalScore < 0) finalScore = 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var postH = 200, postY = snap(H * 0.42);
    game.draw.rect(snap(W * 0.08 - 18), postY - postH / 2, 36, postH, POST1, 0.9); game.draw.rect(snap(W * 0.08 - 18), postY - postH / 2, 36, 10, POST2, 0.6);
    game.draw.rect(snap(W * 0.92 - 18), postY - postH / 2, 36, postH, POST1, 0.9); game.draw.rect(snap(W * 0.92 - 18), postY - postH / 2, 36, 10, POST2, 0.6);
    var sag = tension * 60 * vibration * 0.1, vib = vibration * 20 * Math.sin(elapsed * 40), wireCol = tension >= DANGER_ZONE ? DANGER : (tension >= WARN_ZONE ? WARN : WIRE), wireWidth = 4 + tension * 6;
    var WX1 = W * 0.08, WX2 = W * 0.92;
    for (var wi = 0; wi <= 40; wi++) { var wt = wi / 40, wx = WX1 + (WX2 - WX1) * wt, wy = postY + sag * 4 * wt * (1 - wt) + vib * Math.sin(wt * Math.PI * 3); game.draw.rect(snap(wx) - wireWidth / 2, snap(wy) - wireWidth / 2, wireWidth, wireWidth, wireCol, 0.9); }
    var mX = snap(W * 0.1), mY = snap(H * 0.62), mW = snap(W * 0.8), mH = 28;
    game.draw.rect(mX, mY, mW, mH, '#0a0f18', 0.9);
    var barCol = tension >= DANGER_ZONE ? DANGER : (tension >= WARN_ZONE ? WARN : SAFE);
    game.draw.rect(mX, mY, snap(mW * tension), mH, barCol, 0.9); game.draw.rect(mX + mW * DANGER_ZONE - 3, mY - 5, 6, mH + 10, DANGER, 0.8);
    txt('TENSION  ' + Math.round(tension * 100) + '%', W / 2, mY + 60, 44, barCol);
    var gRatio = Math.min(1, gameTimer / WIN_TIME);
    game.draw.rect(snap(W * 0.08), snap(H * 0.73), snap(W * 0.84), 20, '#0a1520', 0.9); game.draw.rect(snap(W * 0.08), snap(H * 0.73), snap(W * 0.84 * gRatio), 20, SAFE, 0.7);
    txt('HOLD  ' + Math.floor(gameTimer) + ' / ' + WIN_TIME + 's', W / 2, snap(H * 0.70), 34, C.g);
    if (state === S.PLAYING) {
      if (tension >= DANGER_ZONE) { game.draw.rect(0, 0, W, H, DANGER, 0.04 + 0.04 * Math.sin(elapsed * 12)); txt('DANGER! TAP FAST!', W / 2, snap(H * 0.85), 46, DANGER); }
      else txt('TAP TO EASE TENSION', W / 2, snap(H * 0.85), 36, C.e);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    tension = Math.max(0, tension - TAP_REDUCE); tapFlash = 0.15; vibration = 0.5; game.audio.play('se_tap', 0.06);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tension === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HELD THE LINE!' : 'SNAPPED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(gameTimer >= WIN_TIME); return; }
      var multip = 1 + Math.min(2, gameTimer / 8) + cuts * 0.2;
      tension = Math.min(1, tension + RISE_SPEED * multip * dt);
      if (vibration > 0) vibration -= dt * 2.5;
      if (tension >= DANGER_ZONE) {
        if (!inDanger) { inDanger = true; dangerTimer = 0; }
        dangerTimer += dt;
        if (dangerTimer >= DANGER_GRACE) { cuts++; inDanger = false; dangerTimer = 0; tension = 0.25; vibration = 1.0; flash = 0.5; flashCol = C.a; resultText = 'SNAP!'; resultTimer = 0.5; game.audio.play('se_failure', 0.5); for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.42, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220 - 80, life: 0.55, col: WIRE }); } if (cuts >= MAX_CUTS) { finish(false); return; } }
      } else { inDanger = false; dangerTimer = 0; }
      gameTimer += dt; if (gameTimer >= WIN_TIME) { finish(true); return; }
      if (tapFlash > 0) tapFlash -= dt * 4; if (flash > 0) flash -= dt * 2.5; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 280 * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 4, snap(p3.y) - 4, 8, 8, p3.col, p3.life * 2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.18), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(gameTimer) + ' / ' + WIN_TIME + 's', W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CUTS; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CUTS - 1) / 2) * 56) - 10, 224, 20, 20, ci < cuts ? C.a : '#030508');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
