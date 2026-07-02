// 293-bubble-burst.js
// バブルバースト — 浮かぶ泡をタップして L→M→S と分裂させ、小泡まで弾き切る爽快アクション
// 操作: タップで泡を弾く（大→中→小→消える）
// 成功: 小泡を5個消す  失敗: 泡が12個まで増える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、アクアネオン） ──
  var C = { bg:'#03020f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE BURST';
  var HOW_TO_PLAY = 'TAP BUBBLES · L SPLITS TO M SPLITS TO S';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 50 → 5
  var MAX_BUB  = 12;
  var SIZES = [
    { r: 56, col: '#7700ff', splits: 2, next: 1, tag: 'L' },
    { r: 36, col: '#00cfff', splits: 2, next: 2, tag: 'M' },
    { r: 22, col: '#00ff9f', splits: 0, next: -1, tag: 'S' }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, popped, timeLeft, done, spawnTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBubble(x, y, idx, vx, vy) {
    var sz = SIZES[idx];
    bubbles.push({ x: x !== undefined ? x : snap(120 + Math.random() * (W - 240)), y: y !== undefined ? y : H * 0.82, vx: vx !== undefined ? vx : (Math.random() - 0.5) * 150, vy: vy !== undefined ? vy : -140 - Math.random() * 80, r: sz.r, idx: idx });
  }

  function initGame() { bubbles = []; popped = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.6; particles = []; spawnBubble(); spawnBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 400 + Math.ceil(timeLeft) * 80) : popped * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBubble(b) {
    var sz = SIZES[b.idx], pulse = b.r + 3 * (Math.floor(game.time.elapsed * 8) % 2);
    ring(b.x, b.y, pulse + 6, sz.col, 0.4);
    pc(b.x, b.y, pulse, sz.col, 0.8);
    pc(b.x - pulse * 0.35, b.y - pulse * 0.35, pulse * 0.2, C.g, 0.5);
    txt(sz.tag, b.x, b.y + 12, 30, C.g);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i], dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy < (b.r + 14) * (b.r + 14)) {
        var sz = SIZES[b.idx];
        if (sz.splits > 0) { for (var s = 0; s < sz.splits; s++) { var a = -Math.PI / 2 + (s / sz.splits) * Math.PI + (Math.random() - 0.5) * 0.4; spawnBubble(b.x, b.y, sz.next, Math.cos(a) * 140, Math.sin(a) * 140 - 80); } }
        else { popped++; }
        for (var pk = 0; pk < 8; pk++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: sz.col }); }
        bubbles.splice(i, 1); game.audio.play('se_success', 0.35);
        if (popped >= NEEDED) { finish(true); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); for (var i = 0; i < bubbles.length; i++) drawBubble(bubbles[i]);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL POPPED!' : 'OVERFLOW', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (bubbles.length >= MAX_BUB) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0 && bubbles.length < 7) { spawnBubble(); spawnTimer = 1.4 + Math.random() * 0.8; }
      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 70 * dt; b.vx *= (1 - dt * 0.3);
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < H * 0.12) { b.y = H * 0.12 + b.r; b.vy = Math.abs(b.vy) * 0.7; }
        if (b.y > H + 80) bubbles.splice(i, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < bubbles.length; i2++) drawBubble(bubbles[i2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('BUBBLES ' + bubbles.length + ' / ' + MAX_BUB, W / 2, 232, 34, bubbles.length >= MAX_BUB - 3 ? C.a : '#557');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
