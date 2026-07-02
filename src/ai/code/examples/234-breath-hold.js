// 234-breath-hold.js
// ブレスホールド — 潜水中のダイバーが限界を迎える前にタップで呼吸、我慢するほど高得点
// 操作: タップで呼吸（長く我慢するほど加点、酸素ゼロで失敗）
// 成功: 合計1000点  失敗: 酸素がゼロ or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、深海ダイブ） ──
  var C = { bg:'#02060f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#123a6a', e:'#00cfff', f:'#ffaa00', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BREATH HOLD';
  var HOW_TO_PLAY = 'HOLD FOR POINTS · TAP TO BREATHE BEFORE 0';
  var MAX_TIME = 15;
  var NEEDED   = 1000;        // 修正2: 3000 → 1000
  var DRAIN = 0.06, BREATHE_DUR = 1.0, FACE_X = snap(W / 2), FACE_Y = snap(H * 0.4), FACE_R = 130;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var oxygen, phase, breathTimer, holdTime, cheeks, score, timeLeft, done, bubbles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.3, W, H * 0.7, C.d, 0.3); }

  function drawFace() {
    var col = oxygen < 0.2 ? C.a : oxygen < 0.4 ? C.f : C.c;
    var cs = 1 + cheeks * 0.4;
    pc(FACE_X, FACE_Y, FACE_R, col, 0.9);
    pc(FACE_X - FACE_R * 0.6 * cs, FACE_Y + 20, 32 * cs, col, 0.9);
    pc(FACE_X + FACE_R * 0.6 * cs, FACE_Y + 20, 32 * cs, col, 0.9);
    var eye = cheeks * 8;
    game.draw.rect(snap(FACE_X - 44), snap(FACE_Y - 24 + eye), 28, Math.max(4, 14 - eye), '#000', 0.8);
    game.draw.rect(snap(FACE_X + 16), snap(FACE_Y - 24 + eye), 28, Math.max(4, 14 - eye), '#000', 0.8);
    if (phase === 'breathing') pc(FACE_X, FACE_Y + 46, 18, '#000', 0.9);
    else game.draw.rect(snap(FACE_X) - 24, snap(FACE_Y + 42), 48, 8, '#000', 0.8);
  }

  function breathe() {
    if (phase !== 'holding') return;
    var pts = Math.round(holdTime * 100 * (0.5 + oxygen * 0.5)); score += pts;
    fbText = '+' + pts; fbCol = oxygen > 0.4 ? C.b : C.a; fbTimer = 0.7; game.audio.play('se_success', 0.5 + (1 - oxygen) * 0.3);
    phase = 'breathing'; breathTimer = BREATHE_DUR; holdTime = 0; cheeks = 0;
    for (var i = 0; i < 6; i++) bubbles.push({ x: FACE_X + game.random(-60, 60), y: FACE_Y, vx: game.random(-40, 40), vy: -(80 + Math.random() * 100), r: 12 + Math.random() * 14, life: 1 });
    if (score >= NEEDED) finish(true);
  }

  function initGame() { oxygen = 1; phase = 'holding'; breathTimer = 0; holdTime = 0; cheeks = 0; score = 0; timeLeft = MAX_TIME; done = false; bubbles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 30) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'holding') return;
    breathe();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); phase = 'holding'; cheeks = 0.5; oxygen = 0.6; drawFace(); phase = 'holding';
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LUNG MASTER!' : 'BLACKED OUT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      if (phase === 'holding') { holdTime += dt; oxygen = Math.max(0, oxygen - DRAIN * dt); cheeks = Math.min(1, holdTime / 5); if (oxygen <= 0) { finish(false); return; } }
      else { breathTimer -= dt; oxygen = Math.min(1, oxygen + dt * 0.7); cheeks = Math.max(0, breathTimer / BREATHE_DUR - 0.5); if (breathTimer <= 0) { phase = 'holding'; holdTime = 0; } }
      if (phase === 'breathing' && Math.random() < dt * 3) bubbles.push({ x: FACE_X + game.random(-40, 40), y: FACE_Y - 20, vx: game.random(-30, 30), vy: -(40 + Math.random() * 50), r: 8 + Math.random() * 8, life: 0.8 });
      for (var bi = bubbles.length - 1; bi >= 0; bi--) { var b = bubbles[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (b.life <= 0) bubbles.splice(bi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) pc(bubbles[bi2].x, bubbles[bi2].y, bubbles[bi2].r, C.e, bubbles[bi2].life * 0.5);
    drawFace();
    // O2ゲージ
    var gy = snap(H * 0.62), oc = oxygen > 0.5 ? C.e : oxygen > 0.25 ? C.f : C.a;
    game.draw.rect(snap(W / 2) - 200, gy, 400, 36, C.d, 0.6);
    game.draw.rect(snap(W / 2) - 200, gy, snap(400 * oxygen), 36, oc, 0.9);
    txt('O2', W / 2, gy + 70, 36, C.e);
    txt(phase === 'holding' ? holdTime.toFixed(1) + 's HOLD' : 'BREATHE...', W / 2, H * 0.74, 44, phase === 'holding' ? (oxygen < 0.3 ? C.a : C.e) : C.b);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.80, 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2 - 200, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2 + 200, 96, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
