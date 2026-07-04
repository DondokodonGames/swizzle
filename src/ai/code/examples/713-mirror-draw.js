// 713-mirror-draw.js
// ミラードロー — 左右対称に並んだ図形をタップして、ペアごと同時に消す
// 操作: どちらかの図形をタップすると鏡像ペアも一緒に消える。全消しでラウンドクリア
// 成功: 6ラウンド クリア  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、図形色は保持） ──
  var C = { bg:'#030914', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SHAPE_COLORS = ['#00cfff', '#a855f7', '#ffe600', '#00ff9f', '#ff2079'];
  var SHAPE_TYPES = ['circle', 'square', 'diamond'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR DRAW';
  var HOW_TO_PLAY = 'TAP A SHAPE TO CLEAR IT AND ITS MIRROR TWIN · CLEAR THE WHOLE ROUND';
  var MAX_TIME = 22;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var CX = W / 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shapes, pairs, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, drawPhase, clearWait, popAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050c18');
  }

  function background() { game.draw.clear(C.bg); }

  function drawShapeAt(type, cx, cy, r, col, alpha) {
    if (type === 'circle') pc(cx, cy, r, col, alpha);
    else if (type === 'square') game.draw.rect(snap(cx - r), snap(cy - r), snap(r * 2), snap(r * 2), col, alpha);
    else { for (var di = 0; di < 8; di++) { var dp = di / 8, dw = r * 0.8 * Math.sin(dp * Math.PI), dy2 = cy - r * 1.1 + di * r * 0.28; game.draw.rect(snap(cx - dw), snap(dy2), snap(dw * 2), snap(r * 0.3), col, alpha * 0.85); } }
  }

  function spawnRound() {
    shapes = []; var count = 2 + Math.min(3, Math.floor(pairs / 3));
    for (var i = 0; i < count; i++) {
      var r = 55 + Math.random() * 40, col = SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)], type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
      var leftX = 80 + r + Math.random() * (CX - 80 - r * 2 - 30), ry = 340 + Math.random() * (H * 0.65 - 340), rightX = W - leftX;
      shapes.push({ x: leftX, y: ry, r: r, col: col, type: type, alive: true, pairIdx: i });
      shapes.push({ x: rightX, y: ry, r: r, col: col, type: type, alive: true, pairIdx: i });
    }
    clearWait = 0; drawPhase = 'play';
  }

  function initGame() { pairs = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; popAnim = []; spawnRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (pairs * 600 + Math.ceil(timeLeft) * 100) : pairs * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.line(CX, 260, CX, H * 0.9, '#334155', 3);
    txt('| MIRROR |', CX, 300, 30, '#334155');
    for (var si = 0; si < shapes.length; si++) {
      var sh = shapes[si]; if (!sh.alive) continue;
      var pulse = 0.85 + 0.15 * Math.sin(elapsed * 3 + si);
      drawShapeAt(sh.type, sh.x, sh.y, sh.r * pulse, sh.col, 0.88);
      pc(sh.x - sh.r * 0.3, sh.y - sh.r * 0.3, sh.r * 0.18, C.g, 0.2);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || drawPhase !== 'play') return;
    var hit = -1;
    for (var i = 0; i < shapes.length; i++) { if (!shapes[i].alive) continue; var dx = tx - shapes[i].x, dy = ty - shapes[i].y; if (dx * dx + dy * dy < (shapes[i].r + 20) * (shapes[i].r + 20)) { hit = i; break; } }
    if (hit < 0) {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
      return;
    }
    var pIdx = shapes[hit].pairIdx;
    for (var j = 0; j < shapes.length; j++) if (shapes[j].pairIdx === pIdx && shapes[j].alive) { shapes[j].alive = false; for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; popAnim.push({ x: shapes[j].x, y: shapes[j].y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: shapes[j].col }); } }
    game.audio.play('se_tap', 0.15); flash = 0.25; flashCol = C.b;
    var anyAlive = false; for (var k = 0; k < shapes.length; k++) if (shapes[k].alive) { anyAlive = true; break; }
    if (!anyAlive) {
      pairs++; resultText = 'CLEAR!'; resultTimer = 0.6; game.audio.play('se_success', 0.6);
      if (pairs >= NEEDED) { finish(true); return; }
      drawPhase = 'wait'; clearWait = 0.7;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!shapes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SYMMETRY!' : 'BROKE THE MIRROR', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (drawPhase === 'wait') { clearWait -= dt; if (clearWait <= 0) spawnRound(); }
      for (var pp = popAnim.length - 1; pp >= 0; pp--) { var p2 = popAnim[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) popAnim.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < popAnim.length; pp2++) game.draw.rect(snap(popAnim[pp2].x) - 5, snap(popAnim[pp2].y) - 5, 10, 10, popAnim[pp2].col, popAnim[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.89), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(pairs + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#050c18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
