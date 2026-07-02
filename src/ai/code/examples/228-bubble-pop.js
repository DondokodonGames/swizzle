// 228-bubble-pop.js
// バブルポップ — 膨らむシャボン玉を限界ギリギリまで育て、割れる前にタップして弾く度胸
// 操作: シャボン玉をタップして割る（大きいほど高得点）
// 成功: 合計1500点  失敗: 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、泡の実験室） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'GROW THE BUBBLE · POP IT BEFORE IT BURSTS';
  var MAX_TIME = 12;
  var NEEDED   = 1500;        // 修正2: 5000 → 1500
  var TOP = 260, BOT = H - 220, GROW = 44, MAX_R = 300, BURST = 0.9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubble, score, timeLeft, done, pops;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); }

  function ptsFor(ratio) { return ratio >= 0.85 ? Math.round(ratio * 1500) : ratio >= 0.7 ? Math.round(ratio * 1000) : ratio >= 0.5 ? Math.round(ratio * 600) : Math.round(ratio * 200); }

  function spawnBubble() { bubble = { x: snap(game.random(120, W - 120)), y: snap(game.random(TOP + 40, BOT - 40)), r: 24, shiver: 0 }; }

  function initGame() { score = 0; timeLeft = MAX_TIME; done = false; pops = []; spawnBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 40) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function pop(manual) {
    if (!bubble) return;
    var ratio = bubble.r / MAX_R, pts = manual ? ptsFor(ratio) : Math.round(ratio * 100);
    score += pts; game.audio.play('se_success', 0.5 + ratio * 0.4);
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; pops.push({ x: bubble.x, y: bubble.y, vx: Math.cos(a) * (150 + Math.random() * 120), vy: Math.sin(a) * (150 + Math.random() * 120), life: 0.5, pts: i === 0 ? pts : 0, r: 10 + ratio * 16 }); }
    bubble = null;
    if (score >= NEEDED) { finish(true); return; }
    setTimeout(function() { if (state === S.PLAYING && !done) spawnBubble(); }, 300);
  }

  function drawBubble() {
    if (!bubble) return;
    var ratio = bubble.r / MAX_R, bx = bubble.x + bubble.shiver, by = bubble.y;
    if (ratio > 0.75) ring(bx, by, bubble.r + 8, C.a, 0.5);
    ring(bx, by, bubble.r, C.e, 0.6 + ratio * 0.3);
    pc(bx, by, bubble.r * 0.9, C.e, 0.15);
    game.draw.rect(snap(bx - bubble.r * 0.35) - 6, snap(by - bubble.r * 0.35) - 6, 12, 12, C.g, 0.7);
    var col = ratio >= 0.85 ? C.a : ratio >= 0.7 ? C.c : C.b;
    txt('+' + ptsFor(ratio), bx, by + 12, 40, col);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !bubble) return;
    if (Math.hypot(x - bubble.x, y - bubble.y) < bubble.r + 40) pop(true);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); ring(W / 2, H * 0.45, 180 + Math.floor(game.time.elapsed * 4) % 2 * 10, C.e, 0.6);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POP MASTER!' : 'TIME OUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (bubble) { bubble.r += GROW * dt; var ratio = bubble.r / MAX_R; if (ratio > 0.75) bubble.shiver = (ratio - 0.75) * 20 * (Math.random() - 0.5); if (bubble.r >= MAX_R * BURST) pop(false); }
      for (var pi = pops.length - 1; pi >= 0; pi--) { var p = pops[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; p.life -= dt; if (p.life <= 0) pops.splice(pi, 1); }
    }

    // ---- 描画 ----
    background(); drawBubble();
    for (var pp = 0; pp < pops.length; pp++) { game.draw.rect(snap(pops[pp].x) - 6, snap(pops[pp].y) - 6, 12, 12, C.g, pops[pp].life * 1.4); if (pops[pp].pts > 0) txt('+' + pops[pp].pts, pops[pp].x, pops[pp].y, 40, C.c); }

    game.draw.rect(0, H - 60, W * Math.min(1, score / NEEDED), 12, C.b, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
