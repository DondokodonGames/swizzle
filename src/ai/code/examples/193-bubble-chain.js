// 193-bubble-chain.js
// バブルチェーン — 同じ色のバブルを3つ以上繋げてタップで消す連鎖の気持ちよさ
// 操作: タップで同色グループを消す（3個以上）
// 成功: 5個のバブルを消す  失敗: 画面が埋まる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.e, C.c, C.b, C.a, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE CHAIN';
  var HOW_TO_PLAY = 'TAP A GROUP OF 3+ SAME-COLOR BUBBLES';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 5;              // 修正2: 50 → 5
  var COLS = 6, ROWS = 10, BUB_R = 72, SPACING = BUB_R * 2 + 4;
  var GX = snap((W - COLS * SPACING) / 2 + BUB_R), GY = snap(300);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, score, timeLeft, done, particles, feedback, feedbackOk;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function initBubbles() {
    bubbles = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (r < 4) bubbles.push({ col: c, row: r, x: GX + c * SPACING, y: GY + r * SPACING, color: Math.floor(Math.random() * COLORS.length), alive: true });
  }

  function findGroup(sc, sr, color) {
    var seen = {}, group = [], q = [{ c: sc, r: sr }];
    while (q.length) {
      var cur = q.shift(), k = cur.c + ',' + cur.r;
      if (seen[k]) continue; seen[k] = true;
      var found = null;
      for (var bi = 0; bi < bubbles.length; bi++) if (bubbles[bi].alive && bubbles[bi].col === cur.c && bubbles[bi].row === cur.r && bubbles[bi].color === color) { found = bubbles[bi]; break; }
      if (!found) continue;
      group.push(found);
      var d = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (var di = 0; di < d.length; di++) { var nc = cur.c + d[di][0], nr = cur.r + d[di][1]; if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) q.push({ c: nc, r: nr }); }
    }
    return group;
  }

  function initGame() { initBubbles(); score = 0; timeLeft = MAX_TIME; done = false; particles = []; feedback = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 100 + Math.ceil(timeLeft) * 30) : score * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = null;
    for (var bi = 0; bi < bubbles.length; bi++) { var b = bubbles[bi]; if (b.alive && Math.hypot(x - b.x, y - b.y) < BUB_R) { hit = b; break; } }
    if (!hit) return;
    var group = findGroup(hit.col, hit.row, hit.color);
    if (group.length < 3) { feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.2); return; }
    for (var gi = 0; gi < group.length; gi++) {
      group[gi].alive = false; score++;
      for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: group[gi].x, y: group[gi].y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, color: hit.color }); }
    }
    feedbackOk = true; feedback = 0.2;
    game.audio.play('se_success', Math.min(1, 0.4 + group.length * 0.05));
    if (score >= NEEDED) { finish(true); return; }
    // たまに新しい行を上に追加
    if (Math.random() < 0.4) {
      for (var bi3 = 0; bi3 < bubbles.length; bi3++) if (bubbles[bi3].alive) { bubbles[bi3].row++; bubbles[bi3].y = GY + bubbles[bi3].row * SPACING; }
      for (var nc = 0; nc < COLS; nc++) bubbles.push({ col: nc, row: 0, x: GX + nc * SPACING, y: GY, color: Math.floor(Math.random() * COLORS.length), alive: true });
      for (var bi4 = 0; bi4 < bubbles.length; bi4++) if (bubbles[bi4].alive && bubbles[bi4].row >= ROWS - 1) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var r = 0; r < 3; r++) for (var c = 0; c < COLS; c++) pc(GX + c * SPACING, GY + r * SPACING, BUB_R - 8, COLORS[(r + c) % COLORS.length], 0.85);
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.92, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 350 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var bi5 = 0; bi5 < bubbles.length; bi5++) { var b2 = bubbles[bi5]; if (!b2.alive) continue; pc(b2.x, b2.y, BUB_R - 8, COLORS[b2.color], 0.9); pc(b2.x - 18, b2.y - 18, 10, C.g, 0.5); }
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 6, snap(particles[pp].y) - 6, 12, 12, COLORS[particles[pp].color], particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    txt(HOW_TO_PLAY, W / 2, H - 80, 30, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
