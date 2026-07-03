// 457-shadow-puppet.js
// 影絵合わせ — スクリーンに映るシルエットと同じポーズを、スワイプで作って再現する
// 操作: 上/下=左腕を上下、左=右腕を上げる、右=足の開閉。お手本と同じ形で保持
// 成功: 3ポーズ 再現  失敗: 25秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アンバー、影絵劇場） ──
  var C = { bg:'#0a0600', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // 各ポーズ: la 左腕(-1下/0横/1上) ra 右腕(-1/0/1) legs(0閉/1開)
  var SHAPES = [
    { name: 'BANZAI', la: 1, ra: 1, legs: 0 },
    { name: 'PLANE', la: 0, ra: 0, legs: 1 },
    { name: 'WAVE', la: 1, ra: -1, legs: 0 },
    { name: 'REST', la: -1, ra: -1, legs: 1 },
    { name: 'T-POSE', la: 0, ra: 0, legs: 0 },
    { name: 'STAR', la: 1, ra: 1, legs: 1 }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW PUPPET';
  var HOW_TO_PLAY = 'SWIPE TO POSE · MATCH THE SILHOUETTE · UP/DN L-ARM · LEFT R-ARM · RIGHT LEGS';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var HOLD = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetShape, playerState, matched, matchTimer, correct, timeLeft, done, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#1a1000');
  }

  function background() { game.draw.clear(C.bg); pc(W / 2, -80, 380, C.c, 0.05); pc(W / 2, -80, 220, C.c, 0.07); }

  function nextShape() { targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]; matched = false; matchTimer = 0; }

  function checkMatch() { return playerState.la === targetShape.la && playerState.ra === targetShape.ra && playerState.legs === targetShape.legs; }

  function initGame() { playerState = { la: -1, ra: -1, legs: 0 }; correct = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; nextShape(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 700 + Math.ceil(timeLeft) * 100) : correct * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFigure(cx, cy, st, col, alpha) {
    pc(cx, cy - 150, 46, col, alpha);
    pline(cx, cy - 104, cx, cy + 30, col, alpha, 24);
    var laY = st.la === 1 ? cy - 120 : st.la === -1 ? cy + 20 : cy - 50; pline(cx, cy - 60, cx - 116, laY, col, alpha, 20);
    var raY = st.ra === 1 ? cy - 120 : st.ra === -1 ? cy + 20 : cy - 50; pline(cx, cy - 60, cx + 116, raY, col, alpha, 20);
    if (st.legs === 0) { pline(cx, cy + 30, cx - 30, cy + 150, col, alpha, 22); pline(cx, cy + 30, cx + 30, cy + 150, col, alpha, 22); }
    else { pline(cx, cy + 30, cx - 88, cy + 158, col, alpha, 22); pline(cx, cy + 30, cx + 88, cy + 158, col, alpha, 22); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var changed = false;
    if (dir === 'up') { if (playerState.la < 1) { playerState.la++; changed = true; } }
    else if (dir === 'down') { if (playerState.la > -1) { playerState.la--; changed = true; } }
    else if (dir === 'left') { playerState.ra = playerState.ra >= 1 ? -1 : playerState.ra + 1; changed = true; }
    else if (dir === 'right') { playerState.legs = playerState.legs === 0 ? 1 : 0; changed = true; }
    if (changed) game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!playerState) initGame(); background();
      drawFigure(W * 0.5, H * 0.42, SHAPES[4], C.c, 0.7);
      txt(GAME_TITLE, W / 2, H * 0.66, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 18, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT MIME!' : 'CURTAIN CALL', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var isMatch = targetShape && checkMatch();
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (isMatch) {
        matchTimer += dt;
        if (matchTimer >= HOLD && !matched) {
          matched = true; correct++; flash = 0.8; game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W * 0.72, y: H * 0.42, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.6, col: C.c }); }
          if (correct >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (!done) nextShape(); }, 800);
        }
      } else { matchTimer = Math.max(0, matchTimer - dt * 3); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    // お手本（左）
    pc(W * 0.27, H * 0.30, 190, '#1a1000', 0.6);
    drawFigure(W * 0.27, H * 0.40, targetShape, '#4a3000', 0.9);
    txt(targetShape.name, W * 0.27, snap(H * 0.60), 34, C.f);
    // 区切り
    for (var s = H * 0.18; s < H * 0.62; s += 16) game.draw.rect(W / 2 - 2, s, 4, 8, C.f, 0.3);
    // プレイヤー（右）
    pc(W * 0.73, H * 0.30, 190, C.c, 0.06);
    drawFigure(W * 0.73, H * 0.40, playerState, C.c, 0.9);
    txt('YOU', W * 0.73, snap(H * 0.60), 34, C.b);
    if (isMatch && matchTimer > 0) { ring(W * 0.73, H * 0.40, 190 * (matchTimer / HOLD), C.b, 0.5); txt('HOLD!', W * 0.73, H * 0.24, 40, C.b); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('UP/DN L-ARM   LEFT R-ARM   RIGHT LEGS', W / 2, snap(H * 0.90), 26, C.b);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
