// 222-wind-kite.js
// ウィンドカイト — 突風に流される凧を左右タップで引き戻し、空の枠内に留め続ける繊細な操作
// 操作: 左タップで左へ、右タップで右へ引く
// 成功: 8秒安定飛行  失敗: 凧が枠の端に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜空の凧揚げ） ──
  var C = { bg:'#06091a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#1e3a6a', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIND KITE';
  var HOW_TO_PLAY = 'TAP LEFT OR RIGHT TO PULL THE KITE';
  var NEEDED   = 8;           // 修正2: 30 → 8（サバイバル短縮）
  var TOP = 240, LEFT = 80, RIGHT = W - 80, FLOOR = snap(H * 0.78);
  var KITE_R = 52, ANCHOR_X = snap(W / 2), ANCHOR_Y = snap(H * 0.86), STRING = 520;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var kiteX, kiteY, kVX, kVY, windX, windTimer, survived, timeLeft, done, trail, clouds;

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
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(LEFT, TOP, RIGHT - LEFT, FLOOR - TOP, C.d, 0.2);
    for (var ci = 0; ci < clouds.length; ci++) { var cl = clouds[ci]; game.draw.rect(snap(cl.x) - cl.w / 2, snap(cl.y), cl.w, 24, C.d, 0.4); game.draw.rect(snap(cl.x) - cl.w / 4, snap(cl.y) - 16, cl.w / 2, 16, C.d, 0.4); }
    game.draw.rect(0, FLOOR, W, H - FLOOR, C.d, 0.6);
  }

  function drawKite(x, y) {
    // ダイヤ形（ドット）
    var d = [[0,-1],[1,0],[0,1],[-1,0]];
    for (var r = 8; r <= KITE_R; r += 8) for (var k = 0; k < d.length; k++) game.draw.rect(snap(x + d[k][0] * r) - 4, snap(y + d[k][1] * r) - 4, 8, 8, C.a, 0.5);
    for (var yy = -KITE_R; yy <= KITE_R; yy += 8) for (var xx = -KITE_R; xx <= KITE_R; xx += 8) { if (Math.abs(xx) + Math.abs(yy) <= KITE_R) game.draw.rect(snap(x) + xx, snap(y) + yy, 8, 8, (xx === 0 || yy === 0) ? C.c : C.a, 0.9); }
    game.draw.rect(snap(x) - 4, snap(y) - 4, 8, 8, C.g);
    // しっぽ
    for (var t = 0; t < 4; t++) game.draw.rect(snap(x + Math.sin(game.time.elapsed * 3 + t) * 14) - 4, snap(y + KITE_R + t * 22), 8, 8, C.e, 0.7 - t * 0.12);
  }

  function initGame() {
    kiteX = snap(W / 2); kiteY = snap(H * 0.4); kVX = 0; kVY = 0; windX = 0; windTimer = 0; survived = 0; timeLeft = NEEDED; done = false; trail = [];
    clouds = []; for (var i = 0; i < 4; i++) clouds.push({ x: Math.random() * W, y: TOP + 40 + Math.random() * (FLOOR - TOP - 200), w: 120 + Math.random() * 120, vx: 20 + Math.random() * 30 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 120) : Math.round(survived * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    kVX += (x < W / 2 ? -220 : 220); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!clouds) initGame(); background(); game.draw.rect(ANCHOR_X - 2, snap(H * 0.4), 4, ANCHOR_Y - snap(H * 0.4), C.g, 0.3); drawKite(W / 2, H * 0.4);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY!' : 'CRASHED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      windTimer -= dt; if (windTimer <= 0) { windX = game.random(-500, 500); windTimer = 1.2 + Math.random() * 2; }
      kVX += windX * dt * 0.3; kVY += 30 * dt;
      kiteX += kVX * dt; kiteY += kVY * dt; kVX *= 0.97; kVY *= 0.97;
      var dx = kiteX - ANCHOR_X, dy = kiteY - ANCHOR_Y, dist = Math.hypot(dx, dy);
      if (dist > STRING) { kiteX = ANCHOR_X + dx / dist * STRING; kiteY = ANCHOR_Y + dy / dist * STRING; var nx = dx / dist, ny = dy / dist, dot = kVX * nx + kVY * ny; if (dot > 0) { kVX -= dot * nx * 1.5; kVY -= dot * ny * 1.5; } }
      if (kiteX < LEFT + KITE_R || kiteX > RIGHT - KITE_R || kiteY > FLOOR - KITE_R || kiteY < TOP + KITE_R) { finish(false); return; }
      trail.push({ x: kiteX, y: kiteY, life: 0.4 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var ci = 0; ci < clouds.length; ci++) { clouds[ci].x += clouds[ci].vx * dt; if (clouds[ci].x > W + 200) clouds[ci].x = -200; }
    }

    // ---- 描画 ----
    background();
    game.draw.rect(ANCHOR_X - 2, snap(kiteY), 4, ANCHOR_Y - snap(kiteY), C.g, 0.3);
    for (var t2 = 0; t2 < trail.length; t2++) game.draw.rect(snap(trail[t2].x) - 5, snap(trail[t2].y) - 5, 10, 10, C.e, trail[t2].life * 0.5);
    drawKite(kiteX, kiteY);
    pc(ANCHOR_X, ANCHOR_Y, 28, C.c, 0.8);
    // 風向き警告
    var ws = Math.abs(windX) / 500, wc = ws > 0.6 ? C.a : ws > 0.3 ? C.f : C.b;
    txt(windX > 0 ? 'WIND ►' : '◄ WIND', W / 2, H - 100, 44, wc);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
