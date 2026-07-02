// 398-earthquake-drill.js
// 地震訓練 — 揺れる棚から落ちてくる荷物を、左右に動く救助ネットで受け止めて守る
// 操作: タップ／スワイプでネットを左右に動かす
// 成功: 6個 キャッチ  失敗: 3個 床に落とす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、防災訓練） ──
  var C = { bg:'#160a06', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var OBJ = [C.e, C.a, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'EARTHQUAKE DRILL';
  var HOW_TO_PLAY = 'MOVE THE NET · CATCH THE FALLING ITEMS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_DROP = 3;          // 修正2: 5 → 3
  var NET_W = 260, NET_Y = snap(H * 0.76), FLOOR_Y = snap(H * 0.86), SHELF1 = snap(H * 0.26), SHELF2 = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var netX, netVX, shakeX, shakePhase, shakeAmp, nextShake, objects, spawnTimer, caught, dropped, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1408');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#3a1e0a', 0.9); game.draw.rect(0, FLOOR_Y, W, 4, C.f, 0.5);
    var sx = shakeX; game.draw.rect(sx, SHELF1, W, 22, C.f, 0.9); game.draw.rect(sx, SHELF2, W, 22, C.f, 0.9);
    game.draw.rect(sx + 60, SHELF1 - 90, 18, 90, '#8a4a20', 0.6); game.draw.rect(sx + W - 78, SHELF1 - 90, 18, 90, '#8a4a20', 0.6);
  }

  function spawnObject() { objects.push({ x: snap(80 + Math.random() * (W - 160)), y: Math.random() < 0.5 ? SHELF1 : SHELF2, vy: 0, r: 28 + Math.random() * 16, col: OBJ[Math.floor(Math.random() * OBJ.length)], shape: Math.floor(Math.random() * 2) }); }

  function initGame() { netX = W / 2; netVX = 0; shakeX = 0; shakePhase = 0; shakeAmp = 0; nextShake = 1.2; objects = []; spawnTimer = 0.6; caught = 0; dropped = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawObj(o) { if (o.shape === 0) { pc(o.x, o.y, o.r, o.col, 0.9); pc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.25, C.g, 0.4); } else { game.draw.rect(snap(o.x - o.r), snap(o.y - o.r), snap(o.r * 2), snap(o.r * 2), o.col, 0.9); game.draw.rect(snap(o.x - o.r) + 4, snap(o.y - o.r) + 4, o.r, 6, C.g, 0.3); } }

  function drawNet() { game.draw.rect(snap(netX - NET_W / 2), NET_Y - 12, NET_W, 24, C.b, 0.9); pc(netX - NET_W / 2, NET_Y + 18, 10, C.b, 0.9); pc(netX + NET_W / 2, NET_Y + 18, 10, C.b, 0.9); for (var ni = 0; ni < 6; ni++) game.draw.rect(snap(netX - NET_W / 2 + ni * (NET_W / 5)), NET_Y + 12, 4, 36, C.g, 0.4); }

  function move(dir) { netVX = dir * 800; }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; netVX = Math.max(-800, Math.min(800, (x - netX) * 5));
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') move(-1); else if (d === 'right') move(1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!objects) initGame(); background(); drawNet(); drawObj({ x: W * 0.4, y: H * 0.5, r: 34, col: C.e, shape: 0 }); drawObj({ x: W * 0.6, y: H * 0.55, r: 34, col: C.a, shape: 1 });
      txt(GAME_TITLE, W / 2, H * 0.14, 66, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SAFE!' : 'BROKEN', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
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
      nextShake -= dt; if (nextShake <= 0) { shakeAmp = 15 + Math.random() * 18; nextShake = 2.5 + Math.random() * 2; game.audio.play('se_failure', 0.15); }
      shakePhase += dt * 18; shakeX = Math.sin(shakePhase) * shakeAmp; shakeAmp *= (1 - 4 * dt);
      netX += netVX * dt; netX = Math.max(NET_W / 2 + 20, Math.min(W - NET_W / 2 - 20, netX)); netVX *= (1 - 6 * dt);
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnObject(); spawnTimer = 1.0 + Math.random() * 0.8; }
      for (var i = objects.length - 1; i >= 0; i--) {
        var o = objects[i]; o.vy += 500 * dt; o.y += o.vy * dt; o.x += shakeX * 0.3 * dt;
        if (o.y + o.r > NET_Y - 20 && o.y < NET_Y + 40 && Math.abs(o.x - netX) < NET_W / 2 + o.r) { caught++; game.audio.play('se_success', 0.4); flash = 0.3; flashCol = C.b; for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: o.x, y: NET_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 - 100, life: 0.5, col: o.col }); } objects.splice(i, 1); if (caught >= NEEDED) { finish(true); return; } continue; }
        if (o.y > FLOOR_Y) { dropped++; game.audio.play('se_failure', 0.4); flash = 0.4; flashCol = C.a; objects.splice(i, 1); if (dropped >= MAX_DROP) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < objects.length; i2++) drawObj(objects[i2]);
    drawNet();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < dropped ? C.a : '#2a1408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
