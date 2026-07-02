// 430-fruit-catch.js
// フルーツキャッチ — 落ちてくる果物をバスケットで受け止める。黒い爆弾は避けること
// 操作: タップした位置へバスケットが移動／スワイプで左右に寄せる
// 成功: 果物6個 キャッチ  失敗: 爆弾3回 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、収穫祭） ──
  var C = { bg:'#0a1400', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUIT = [C.a, C.f, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRUIT CATCH';
  var HOW_TO_PLAY = 'MOVE THE BASKET · CATCH FRUIT · AVOID THE BOMBS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_BOMBS = 3;
  var BY = snap(H * 0.80), BW = 200, BH = 84;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, btx, items, caught, bombs, timeLeft, done, particles, spawnTimer, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a00');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, BY + BH / 2 + 10, W, H, '#14200a', 0.9); }

  function spawnItem() { var bomb = Math.random() < 0.25; items.push({ x: snap(80 + Math.random() * (W - 160)), y: -50, r: bomb ? 36 : 30, vy: 300 + Math.random() * 200 + (MAX_TIME - timeLeft) * 15, bomb: bomb, col: bomb ? '#181828' : FRUIT[Math.floor(Math.random() * 4)], wob: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 4 }); }

  function initGame() { bx = W / 2; btx = W / 2; items = []; caught = 0; bombs = 0; timeLeft = MAX_TIME; done = false; particles = []; spawnTimer = 0.4; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawItem(it) {
    if (it.bomb) { ring(it.x, it.y, it.r + 6, C.a, 0.5); pc(it.x, it.y, it.r, it.col, 0.95); pline(it.x, it.y - it.r, it.x + 12, it.y - it.r - 26, C.f, 0.9, 5); pc(it.x + 12, it.y - it.r - 30, 6 + 4 * (Math.floor(game.time.elapsed * 8) % 2), C.c, 0.9); }
    else { var wr = it.r + Math.sin(it.wob) * 3; pc(it.x, it.y, wr, it.col, 0.9); pc(it.x - wr * 0.3, it.y - wr * 0.3, wr * 0.3, C.g, 0.4); game.draw.rect(snap(it.x) - 2, snap(it.y - wr) - 12, 4, 12, C.b, 0.8); }
  }

  function drawBasket() { game.draw.rect(snap(bx - BW / 2), BY - BH / 2, BW, BH, C.f, 0.9); for (var wi = 0; wi < 3; wi++) game.draw.rect(snap(bx - BW / 2 + wi * (BW / 3)), BY - BH / 2, 4, BH, C.c, 0.4); game.draw.rect(snap(bx - BW / 2), BY - BH / 2, BW, 6, C.c, 0.6); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; btx = Math.max(BW / 2 + 20, Math.min(W - BW / 2 - 20, x));
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') btx = Math.max(BW / 2 + 20, btx - 200); else if (d === 'right') btx = Math.min(W - BW / 2 - 20, btx + 200);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame(); background(); drawItem({ x: W * 0.35, y: H * 0.4, r: 30, col: C.a, bomb: false, wob: 0 }); drawItem({ x: W * 0.65, y: H * 0.45, r: 36, col: '#181828', bomb: true }); drawBasket();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOOD HARVEST!' : 'GAME OVER', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      bx += (btx - bx) * Math.min(1, dt * 10);
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnItem(); spawnTimer = Math.max(0.5, 0.9 - (MAX_TIME - timeLeft) * 0.02); }
      for (var ii = items.length - 1; ii >= 0; ii--) {
        var it = items[ii]; it.y += it.vy * dt; it.wob += it.spin * dt;
        if (Math.abs(it.x - bx) < BW / 2 + it.r * 0.5 && it.y + it.r > BY - BH / 2 && it.y - it.r < BY + BH / 2) {
          items.splice(ii, 1);
          if (it.bomb) { bombs++; flash = 0.8; flashCol = C.a; game.audio.play('se_failure', 0.7); for (var k = 0; k < 14; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: it.x, y: it.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250 - 100, life: 0.8, col: C.f }); } if (bombs >= MAX_BOMBS) { finish(false); return; } }
          else { caught++; flash = 0.4; flashCol = C.b; game.audio.play('se_tap', 0.4); for (var k2 = 0; k2 < 5; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: it.x, y: BY - BH / 2, vx: Math.cos(a2) * 120, vy: Math.sin(a2) * 120 - 80, life: 0.4, col: it.col }); } if (caught >= NEEDED) { finish(true); return; } }
          continue;
        }
        if (it.y > H + 60) items.splice(ii, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ii2 = 0; ii2 < items.length; ii2++) drawItem(items[ii2]);
    drawBasket();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BOMBS; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BOMBS - 1) / 2) * 56) - 10, 224, 20, 20, bi < bombs ? C.a : '#0a1a00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
