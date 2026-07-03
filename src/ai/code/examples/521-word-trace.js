// 521-word-trace.js
// ワードトレース — 光る点を順番になぞって、お手本の形をひと筆書きで完成させる
// 操作: 次に光る点をタップ or スワイプで通過して、形を最後までなぞる
// 成功: 3形 完成  失敗: 25秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、なぞり書き） ──
  var C = { bg:'#030308', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var SHAPES = [
    { name: 'CIRCLE', points: (function() { var p = []; for (var i = 0; i <= 12; i++) p.push({ x: 0.5 + 0.4 * Math.cos(i / 12 * Math.PI * 2), y: 0.5 + 0.4 * Math.sin(i / 12 * Math.PI * 2) }); return p; })() },
    { name: 'TRIANGLE', points: [{ x: 0.5, y: 0.1 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }, { x: 0.5, y: 0.1 }] },
    { name: 'SQUARE', points: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }, { x: 0.15, y: 0.15 }] },
    { name: 'STAR', points: (function() { var p = []; for (var i = 0; i <= 10; i++) { var a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 === 0 ? 0.4 : 0.18; p.push({ x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) }); } return p; })() },
    { name: 'ARROW', points: [{ x: 0.5, y: 0.1 }, { x: 0.2, y: 0.5 }, { x: 0.4, y: 0.5 }, { x: 0.4, y: 0.9 }, { x: 0.6, y: 0.9 }, { x: 0.6, y: 0.5 }, { x: 0.8, y: 0.5 }, { x: 0.5, y: 0.1 }] },
    { name: 'ZED', points: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.15, y: 0.85 }, { x: 0.85, y: 0.85 }] }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD TRACE';
  var HOW_TO_PLAY = 'TOUCH EACH GLOWING DOT IN ORDER TO DRAW THE SHAPE';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var AX = 140, AY = snap(H * 0.24), AW = W - 280, AH = W - 280;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shapeIdx, shapeOrder, score, timeLeft, done, particles, checkPt, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1e293b');
  }

  function background() { game.draw.clear(C.bg); }

  function pickNext() { if (shapeOrder.length === 0) shapeOrder = SHAPES.map(function(_, i) { return i; }).sort(function() { return Math.random() - 0.5; }); shapeIdx = shapeOrder.shift(); checkPt = 0; }

  function initGame() { shapeOrder = []; score = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; pickNext(); }

  function sp(i) { var pt = SHAPES[shapeIdx].points[i]; return { x: AX + pt.x * AW, y: AY + pt.y * AH }; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 800 + Math.ceil(timeLeft) * 100) : score * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function hitPoint(x, y) {
    var pts = SHAPES[shapeIdx].points; if (checkPt >= pts.length) return;
    var np = sp(checkPt);
    if (Math.hypot(x - np.x, y - np.y) < 80) {
      checkPt++; game.audio.play('se_tap', 0.2); particles.push({ x: np.x, y: np.y, vx: 0, vy: -40, life: 0.5, col: C.e });
      if (checkPt >= pts.length) { score++; flash = 0.5; game.audio.play('se_success', 0.8); for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: AX + AW / 2, y: AY + AH / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); } if (score >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) pickNext(); }, 700); }
    }
  }

  function drawShape() {
    game.draw.rect(AX - 8, AY - 8, AW + 16, AH + 16, '#1e293b', 0.3);
    var pts = SHAPES[shapeIdx].points;
    for (var i = 0; i < pts.length - 1; i++) { var p1 = sp(i), p2 = sp(i + 1); pline(p1.x, p1.y, p2.x, p2.y, i < checkPt ? C.b : '#1e293b', i < checkPt ? 0.9 : 0.5, 8); }
    for (var ci = 0; ci < pts.length; ci++) { var cp = sp(ci); var col = ci < checkPt ? C.b : ci === checkPt ? C.c : '#374151'; pc(cp.x, cp.y, ci === checkPt ? 22 : 12, col, ci === checkPt ? 0.9 : 0.6); if (ci === checkPt && Math.floor(game.time.elapsed * 6) % 2 === 0) for (var a = 0; a < Math.PI * 2; a += 0.3) game.draw.rect(snap(cp.x + Math.cos(a) * 34) - 3, snap(cp.y + Math.sin(a) * 34) - 3, 6, 6, C.c, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; hitPoint(tx, ty);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) { if (state === S.PLAYING && !done) hitPoint(x2, y2); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shapeIdx === undefined) initGame(); background(); drawShape();
      txt(GAME_TITLE, W / 2, H * 0.86, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.91, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.96, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT TRACE!' : 'TIME UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawShape();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    txt(SHAPES[shapeIdx].name, W / 2, snap(AY + AH + 80), 60, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
