// 379-leaf-catch.js
// 落ち葉キャッチ — 風に舞って落ちてくる紅葉を、左右に動く籠で受け止める秋の公園
// 操作: タップ／スワイプで籠を左右に動かす
// 成功: 6枚 受け取る  失敗: 3枚 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、秋の公園） ──
  var C = { bg:'#100604', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LEAF = [C.f, C.c, C.a, C.b];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LEAF CATCH';
  var HOW_TO_PLAY = 'MOVE THE BASKET · CATCH THE FALLING LEAVES';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 25 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BASKET_Y = snap(H * 0.80), BW = 200, BH = 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, bvx, leaves, particles, caught, missed, timeLeft, done, spawnTimer, windX, windTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1008');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(-40, snap(H * 0.1), 90, H, '#1a2a12', 0.9); pc(0, snap(H * 0.12), 120, '#20361a', 0.8);
    game.draw.rect(W - 50, snap(H * 0.14), 90, H, '#1a2a12', 0.9); pc(W, snap(H * 0.16), 110, '#20361a', 0.8);
  }

  function spawnLeaf() { leaves.push({ x: snap(80 + Math.random() * (W - 160)), y: -30, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 40, angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 3, r: 20 + Math.random() * 8, col: LEAF[Math.floor(Math.random() * LEAF.length)], wave: Math.random() * Math.PI * 2 }); }

  function initGame() { bx = W / 2; bvx = 0; leaves = []; particles = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.5; windX = 0; windTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBasket() {
    game.draw.rect(snap(bx - BW / 2 - 8), BASKET_Y - 8, BW + 16, BH + 8, '#8a3a10', 0.9);
    game.draw.rect(snap(bx - BW / 2), BASKET_Y, BW, BH, C.f, 0.85);
    for (var i = 0; i < 4; i++) game.draw.rect(snap(bx - BW / 2 + i * (BW / 3)), BASKET_Y, 4, BH, C.c, 0.5);
    game.draw.rect(snap(bx - BW / 2), BASKET_Y, BW, 8, C.c, 0.6);
  }

  function drawLeaf(l) { var lc = Math.cos(l.angle), ls = Math.sin(l.angle); pc(l.x, l.y, l.r, l.col, 0.9); pc(l.x + lc * l.r * 0.5, l.y + ls * l.r * 0.5, l.r * 0.55, l.col, 0.7); game.draw.rect(snap(l.x) - 2, snap(l.y) - 2, 4, 4, C.g, 0.6); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; bvx = (x - bx) * 6;
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') bvx = -700; else if (d === 'right') bvx = 700;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!leaves) initGame(); background(); drawBasket(); drawLeaf({ x: W * 0.4, y: H * 0.4, angle: 1, r: 24, col: C.f }); drawLeaf({ x: W * 0.6, y: H * 0.5, angle: 2, r: 22, col: C.c });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NICE CATCH!' : 'TOO MANY MISSED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      windTimer -= dt; if (windTimer <= 0) { windX = (Math.random() - 0.5) * 60; windTimer = 2 + Math.random() * 2; }
      bx += bvx * dt; bvx *= (1 - 6 * dt); bx = Math.max(BW / 2 + 20, Math.min(W - BW / 2 - 20, bx));
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnLeaf(); spawnTimer = 0.7 + Math.random() * 0.4; }
      for (var li = leaves.length - 1; li >= 0; li--) {
        var l = leaves[li]; l.vy += 30 * dt; l.vx += windX * dt; l.vx += Math.sin(game.time.elapsed * 1.5 + l.wave) * 18 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.angle += l.spin * dt;
        if (l.x < l.r) { l.x = l.r; l.vx = Math.abs(l.vx); } if (l.x > W - l.r) { l.x = W - l.r; l.vx = -Math.abs(l.vx); }
        if (l.y + l.r > BASKET_Y - 16 && l.y < BASKET_Y + BH && l.x > bx - BW / 2 && l.x < bx + BW / 2) {
          caught++; for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI; particles.push({ x: l.x, y: BASKET_Y, vx: Math.cos(a) * 120, vy: -Math.abs(Math.sin(a)) * 160, life: 0.5, col: l.col }); } game.audio.play('se_success', 0.3); leaves.splice(li, 1); if (caught >= NEEDED) { finish(true); return; } continue;
        }
        if (l.y > H + 40) { missed++; game.audio.play('se_failure', 0.2); leaves.splice(li, 1); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (Math.abs(windX) > 12) { var wd = windX > 0 ? 1 : -1; for (var wi = 0; wi < 3; wi++) game.draw.rect(snap(W / 2 - wd * 80), snap(H * 0.28 + wi * 70), 160, 3, C.e, 0.4); }
    for (var li2 = 0; li2 < leaves.length; li2++) drawLeaf(leaves[li2]);
    drawBasket();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#2a1008');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
