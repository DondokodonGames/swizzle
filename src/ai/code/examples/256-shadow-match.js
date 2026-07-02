// 256-shadow-match.js
// シャドウマッチ — 暗い影のシルエットだけを見て、元の形はどれかを4択から見抜く形状認識
// 操作: 影に対応する形をタップ
// 成功: 3問正解  失敗: 3問ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵クイズ） ──
  var C = { bg:'#030510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var KINDS = ['CIRCLE', 'TRI', 'SQUARE', 'STAR'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW MATCH';
  var HOW_TO_PLAY = 'PICK THE SHAPE THAT MATCHES THE SHADOW';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 12 → 3
  var MAX_WRONG = 3;         // 修正2: 4 → 3
  var BW = W / 2 - 30, BH = 220, BY0 = snap(H * 0.6);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, order, correct, wrongs, timeLeft, done, fbText, fbCol, fbTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha) { var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 10)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - 5, snap(y1 + (y2 - y1) * i / n) - 5, 10, 10, color, alpha); }

  function drawShape(kind, cx, cy, s, col, alpha) {
    if (kind === 0) pc(cx, cy, 52 * s, col, alpha);
    else if (kind === 1) { pline(cx, cy - 55 * s, cx - 48 * s, cy + 30 * s, col, alpha); pline(cx - 48 * s, cy + 30 * s, cx + 48 * s, cy + 30 * s, col, alpha); pline(cx + 48 * s, cy + 30 * s, cx, cy - 55 * s, col, alpha); }
    else if (kind === 2) game.draw.rect(snap(cx - 46 * s), snap(cy - 46 * s), snap(92 * s), snap(92 * s), col, alpha);
    else { for (var i = 0; i < 5; i++) { var a1 = i * Math.PI * 2 / 5 - Math.PI / 2, a2 = (i + 0.5) * Math.PI * 2 / 5 - Math.PI / 2, a3 = (i + 1) * Math.PI * 2 / 5 - Math.PI / 2; pline(Math.cos(a1) * 52 * s + cx, Math.sin(a1) * 52 * s + cy, Math.cos(a2) * 22 * s + cx, Math.sin(a2) * 22 * s + cy, col, alpha); pline(Math.cos(a2) * 22 * s + cx, Math.sin(a2) * 22 * s + cy, Math.cos(a3) * 52 * s + cx, Math.sin(a3) * 52 * s + cy, col, alpha); } }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function btnPos(i) { return { x: 20 + (i % 2) * (BW + 20), y: BY0 + Math.floor(i / 2) * (BH + 20) }; }

  function nextQ() { target = Math.floor(Math.random() * 4); order = [0, 1, 2, 3]; for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; } }

  function initGame() { correct = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; particles = []; nextQ(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 60) : correct * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawChoices() { for (var i = 0; i < 4; i++) { var p = btnPos(i); game.draw.rect(p.x, p.y, BW, BH, C.d, 0.4); game.draw.rect(p.x, p.y, BW, 8, C.e, 0.5); drawShape(order[i], p.x + BW / 2, p.y + BH / 2, 1, C.g, 0.9); } }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || fbTimer > 0.15) return;
    var picked = -1; for (var i = 0; i < 4; i++) { var p = btnPos(i); if (x >= p.x && x < p.x + BW && y >= p.y && y < p.y + BH) { picked = i; break; } }
    if (picked < 0) return;
    if (order[picked] === target) { correct++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.4; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.35, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.5 }); } if (correct >= NEEDED) { finish(true); return; } nextQ(); }
    else { wrongs++; fbText = 'WRONG'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.5); if (wrongs >= MAX_WRONG) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); game.draw.rect(snap(W * 0.1), snap(H * 0.2), snap(W * 0.8), snap(H * 0.28), '#0a0f20', 0.8); drawShape(0, W / 2, H * 0.34, 1.2, '#0a0a18', 0.9); drawChoices();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'FOOLED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } if (fbTimer > 0) fbTimer -= dt; for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); } }

    // ---- 描画 ----
    background();
    game.draw.rect(snap(W * 0.1), snap(H * 0.2), snap(W * 0.8), snap(H * 0.3), '#0a0f20', 0.8);
    txt('WHAT SHAPE IS THIS SHADOW?', W / 2, H * 0.23, 30, C.e);
    drawShape(target, W / 2, H * 0.36, 1.3, '#05050f', 0.95);
    drawChoices();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.56, 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_WRONG; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, mm < wrongs ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
