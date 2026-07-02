// 399-soap-bubble.js
// シャボン玉 — タップで膨らませ、緑帯のちょうどいいサイズになったらもう一度タップして飛ばす
// 操作: タップで膨らませ始め、適正サイズ（緑リング）で再タップして離す
// 成功: 4回 きれいに飛ばす  失敗: 3回 割る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、公園の午後） ──
  var C = { bg:'#03101e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RB = [C.a, C.f, C.c, C.b, C.e, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SOAP BUBBLE';
  var HOW_TO_PLAY = 'TAP TO GROW · RELEASE IN THE GREEN ZONE · DONT OVERBLOW';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_POPS = 3;          // 修正2: 5 → 3
  var T_MIN = 88, T_MAX = 136, MAX_SIZE = 190, GROW = 60;
  var WAND_X = snap(W / 2), WAND_Y = snap(H * 0.78);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, bubbleR, bx, by, bvx, bvy, floatTimer, successes, pops, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); }

  function resetBubble() { phase = 'idle'; bubbleR = 28; bx = WAND_X; by = WAND_Y - 30; bvx = (Math.random() - 0.5) * 30; bvy = -60; }

  function initGame() { successes = 0; pops = 0; timeLeft = MAX_TIME; done = false; particles = []; resetBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 500 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function popBubble() {
    phase = 'popped'; pops++; game.audio.play('se_failure', 0.4);
    for (var p = 0; p < 16; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(a) * (100 + Math.random() * 200), vy: Math.sin(a) * (100 + Math.random() * 200), life: 0.5, col: C.e }); }
    if (pops >= MAX_POPS) { finish(false); return; }
    setTimeout(function() { if (!done && state === S.PLAYING) resetBubble(); }, 600);
  }

  function drawWand() { pline(WAND_X - 20, WAND_Y + 80, WAND_X + 40, WAND_Y - 20, C.f, 0.9, 12); ring(WAND_X + 40, WAND_Y - 20, 24, C.g, 0.7); }

  function drawBubble() {
    if (phase === 'popped' || phase === 'idle') return;
    var big = bubbleR > T_MAX, good = bubbleR >= T_MIN && bubbleR <= T_MAX, col = big ? C.a : C.e;
    for (var ii = 0; ii < 6; ii++) { var ia = game.time.elapsed * 3 + ii * Math.PI / 3; pc(bx + Math.cos(ia) * bubbleR * 0.3, by + Math.sin(ia) * bubbleR * 0.3, bubbleR * 0.3, RB[ii], 0.1); }
    pc(bx, by, bubbleR, col, 0.18); ring(bx, by, bubbleR, good ? C.b : col, 0.7);
    pc(bx - bubbleR * 0.3, by - bubbleR * 0.35, bubbleR * 0.18, C.g, 0.7);
    if (good) ring(bx, by, bubbleR + 16, C.b, 0.3 + Math.sin(game.time.elapsed * 6) * 0.1);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'idle') { phase = 'growing'; game.audio.play('se_tap', 0.2); }
    else if (phase === 'growing') {
      if (bubbleR >= T_MIN && bubbleR <= T_MAX) { phase = 'floating'; floatTimer = 1.4; successes++; game.audio.play('se_success', 0.5); for (var p = 0; p < 12; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100 - 50, life: 0.8, col: RB[Math.floor(Math.random() * 6)] }); } if (successes >= NEEDED) { finish(true); return; } }
      else if (bubbleR > T_MAX) popBubble();
      else { phase = 'idle'; game.audio.play('se_failure', 0.15); setTimeout(function() { if (!done && state === S.PLAYING) resetBubble(); }, 300); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawWand();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      pc(W / 2, H * 0.44, 100, C.e, 0.18); ring(W / 2, H * 0.44, 100, C.b, 0.6);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BEAUTIFUL!' : 'ALL POPPED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'growing') { bubbleR += GROW * dt; if (bubbleR >= MAX_SIZE) popBubble(); }
      if (phase === 'floating') { bx += bvx * dt; by += bvy * dt; bvx += (Math.random() - 0.5) * 20 * dt; bvy -= 5 * dt; floatTimer -= dt; if (floatTimer <= 0 || by < -bubbleR * 2) resetBubble(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 30 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawWand(); drawBubble();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (phase === 'idle') txt('TAP TO GROW', W / 2, snap(H * 0.90), 40, C.e);
    else if (phase === 'growing') { var g = bubbleR >= T_MIN && bubbleR <= T_MAX; txt(g ? 'RELEASE NOW!' : bubbleR > T_MAX ? 'TOO BIG!' : 'GROW MORE', W / 2, snap(H * 0.90), 44, g ? C.b : bubbleR > T_MAX ? C.a : C.e); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var pi = 0; pi < MAX_POPS; pi++) game.draw.rect(snap(W / 2 + (pi - (MAX_POPS - 1) / 2) * 56) - 10, 224, 20, 20, pi < pops ? C.a : '#0a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
