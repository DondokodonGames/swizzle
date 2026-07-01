// 067-bubble-pop.js
// バブルポップ — 数字付きのシャボン玉を昇順にタップして連鎖的に弾かせる気持ちよさ
// 操作: 小さい番号から順にタップ
// 成功: 全バブルを正しい順序で割る  失敗: 順序ミス3回 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUBBLE_COLORS = [C.a, C.f, C.c, C.b, C.e, C.d];

  var GAME_TITLE  = 'NUMBER POP';
  var HOW_TO_PLAY = 'TAP BUBBLES IN ORDER';
  var MAX_TIME = 20;
  var COUNT = 3;            // 修正2: 10個 → 3個
  var MAX_MISS = 3, BUBBLE_R = 88;
  var TOP = 460, BOTTOM = H - 200;   // 修正1: 縦全域に配置

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var bubbles, pops, nextTap, misses, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function spawnBubbles() {
    bubbles = []; pops = []; nextTap = 1;
    for (var i = 0; i < COUNT; i++) {
      var attempts = 0, x, y, ok;
      do { x = BUBBLE_R + 80 + Math.random() * (W - BUBBLE_R * 2 - 160); y = TOP + Math.random() * (BOTTOM - TOP); ok = true; for (var j = 0; j < bubbles.length; j++) { var dx = x - bubbles[j].x, dy = y - bubbles[j].y; if (Math.sqrt(dx * dx + dy * dy) < BUBBLE_R * 2 + 24) { ok = false; break; } } attempts++; } while (!ok && attempts < 40);
      bubbles.push({ num: i + 1, x: snap(x), y: snap(y), vy: -20 - Math.random() * 20, vx: (Math.random() - 0.5) * 15, colorIdx: i % BUBBLE_COLORS.length, popped: false, wrong: 0 });
    }
  }
  function initGame() { misses = 0; timeLeft = MAX_TIME; done = false; spawnBubbles(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : (nextTap - 1) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i]; if (b.popped) continue;
      var dx = x - b.x, dy = y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.r || Math.sqrt(dx * dx + dy * dy) < BUBBLE_R + 20) {
        if (b.num === nextTap) {
          b.popped = true; nextTap++;
          for (var p = 0; p < 10; p++) { var ang = p / 10 * Math.PI * 2; pops.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, col: BUBBLE_COLORS[b.colorIdx], life: 0.5 }); }
          game.audio.play('se_tap', 0.7);
          if (bubbles.every(function(bb) { return bb.popped; })) finish(true);
        } else { misses++; b.wrong = 0.4; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) finish(false); }
        break;
      }
    }
  });

  // 世界観: 水中に漂う番号シャボン玉。1から順にタップして弾く。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(0, TOP - 60, W, BOTTOM - TOP + 120, C.d, 0.15);
    txt('NUMBER POP', W / 2, H * 0.08, 36, C.b);
  }

  function drawBubbles() {
    for (var j = 0; j < bubbles.length; j++) {
      var b = bubbles[j]; if (b.popped) continue;
      var col = BUBBLE_COLORS[b.colorIdx], isNext = b.num === nextTap;
      if (isNext && Math.floor(game.time.elapsed * 6) % 2 === 0) drawPixelCircle(b.x, b.y, BUBBLE_R + 12, col, 0.3);
      if (b.wrong > 0) drawPixelCircle(b.x, b.y, BUBBLE_R + 12, C.a, b.wrong / 0.4);
      drawPixelCircle(b.x, b.y, BUBBLE_R, col, 0.85);
      drawPixelCircle(b.x - BUBBLE_R * 0.3, b.y - BUBBLE_R * 0.3, 14, C.g, 0.7);
      txt(b.num + '', b.x, b.y, 64, C.g);
    }
    for (var p = 0; p < pops.length; p++) game.draw.rect(snap(pops[p].x) - 8, snap(pops[p].y) - 8, 16, 16, pops[p].col, pops[p].life / 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame();
      background();
      drawBubbles();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 52, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i]; if (b.popped) continue;
        b.y += b.vy * dt; b.x += b.vx * dt; b.vy *= 0.99; b.vx *= 0.99;
        if (b.x - BUBBLE_R < 40) { b.x = 40 + BUBBLE_R; b.vx = Math.abs(b.vx); }
        if (b.x + BUBBLE_R > W - 40) { b.x = W - 40 - BUBBLE_R; b.vx = -Math.abs(b.vx); }
        if (b.y - BUBBLE_R < TOP) { b.y = TOP + BUBBLE_R; b.vy = Math.abs(b.vy); }
        if (b.y + BUBBLE_R > BOTTOM) { b.y = BOTTOM - BUBBLE_R; b.vy = -Math.abs(b.vy); }
        if (b.wrong > 0) b.wrong -= dt;
      }
      for (var p = pops.length - 1; p >= 0; p--) { pops[p].x += pops[p].vx * dt; pops[p].y += pops[p].vy * dt; pops[p].vy += 200 * dt; pops[p].life -= dt; if (pops[p].life <= 0) pops.splice(p, 1); }
    }

    // ---- draw ----
    background();
    drawBubbles();
    timeBar();
    txt('NEXT ' + Math.min(nextTap, COUNT), W / 2, 96, 48, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
