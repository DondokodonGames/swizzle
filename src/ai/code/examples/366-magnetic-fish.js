// 366-magnetic-fish.js
// マグネットフィッシュ — 磁石をタップで降ろし、緑の金属魚を吸い付けて巻き上げる。赤い危険魚は釣るな
// 操作: タップで磁石を降ろす、もう一度タップで巻き上げる
// 成功: 3匹釣る  失敗: 危険魚を3回釣る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、深海釣り） ──
  var C = { bg:'#000820', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', water:'#0a2050' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNETIC FISH';
  var HOW_TO_PLAY = 'TAP TO DROP · TAP TO REEL · CATCH GREEN, AVOID RED';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 15 → 3
  var MAX_BAD  = 3;
  var ROD_X = snap(W / 2), ROD_Y = 200, TOP_Y = 280, DEEP_Y = snap(H * 0.82), MAG_SPEED = 720;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var magY, magTY, dropping, reeling, fishes, caught, badCaught, timeLeft, done, spawnTimer, particles, bubbles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, snap(H * 0.36), W, H, C.water, 0.8); game.draw.rect(0, snap(H * 0.36), W, 8, C.e, 0.4);
    for (var bi = 0; bi < bubbles.length; bi++) game.draw.rect(snap(bubbles[bi].x) - 4, snap(bubbles[bi].y) - 4, 8, 8, C.e, bubbles[bi].life * 0.3);
  }

  function spawnFish() { var bad = Math.random() < 0.3, side = Math.random() < 0.5 ? 0 : 1; fishes.push({ x: side === 0 ? -60 : W + 60, y: snap(H * 0.44 + Math.random() * H * 0.36), vx: (side === 0 ? 1 : -1) * (60 + Math.random() * 60), bad: bad, r: 28, att: false }); }

  function initGame() { magY = TOP_Y; magTY = TOP_Y; dropping = false; reeling = false; fishes = []; caught = 0; badCaught = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; bubbles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFish(f) {
    var col = f.bad ? C.a : C.b, dir = Math.sign(f.vx) || 1;
    pc(f.x, f.y, f.r, col, 0.9); pc(f.x - dir * f.r, f.y, f.r * 0.6, col, 0.7);
    game.draw.rect(snap(f.x + dir * f.r * 0.4) - 5, snap(f.y - 8), 10, 10, C.g, 0.9);
    if (f.att) ring(f.x, f.y, f.r + 10, C.f, 0.5);
  }

  function drawRod() {
    pline(ROD_X, ROD_Y, ROD_X, magY, C.g, 0.5, 4);
    pc(ROD_X, magY, 22, C.a, 0.9); txt('U', ROD_X, magY + 10, 24, C.g);
    game.draw.rect(ROD_X - 60, ROD_Y - 50, 120, 14, '#5c3a20', 0.9); game.draw.rect(ROD_X - 10, ROD_Y - 40, 20, 60, '#666', 0.9);
  }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!dropping && !reeling) { dropping = true; magTY = DEEP_Y; game.audio.play('se_tap', 0.2); }
    else if (dropping) { dropping = false; reeling = true; magTY = TOP_Y; game.audio.play('se_tap', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fishes) initGame(); background(); drawFish({ x: W * 0.3, y: H * 0.55, vx: 60, bad: false }); drawFish({ x: W * 0.7, y: H * 0.6, vx: -60, bad: true }); drawRod();
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.c);
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
      txt(resultSuccess ? 'GOOD CATCH!' : 'BAD HAUL', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      var diff = magTY - magY, mv = MAG_SPEED * dt;
      if (Math.abs(diff) < mv) { magY = magTY; if (reeling && magY <= TOP_Y + 4) { reeling = false; for (var fi = fishes.length - 1; fi >= 0; fi--) { if (fishes[fi].att) { var f = fishes[fi]; fishes.splice(fi, 1); if (f.bad) { badCaught++; fbText = 'DANGER!'; fbCol = C.a; fbTimer = 0.7; game.audio.play('se_failure', 0.5); if (badCaught >= MAX_BAD) { finish(false); return; } } else { caught++; fbText = 'CAUGHT!'; fbCol = C.b; fbTimer = 0.6; game.audio.play('se_success', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ROD_X, y: TOP_Y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.c }); } if (caught >= NEEDED) { finish(true); return; } } } } } }
      else magY += Math.sign(diff) * mv;
      spawnTimer -= dt; if (spawnTimer <= 0 && fishes.length < 6) { spawnFish(); spawnTimer = 0.8 + Math.random() * 0.5; }
      for (var fi2 = fishes.length - 1; fi2 >= 0; fi2--) {
        var f2 = fishes[fi2], d2m = Math.hypot(f2.x - ROD_X, f2.y - magY);
        if (d2m < 90 && (dropping || reeling)) f2.att = true;
        if (f2.att) { var dx = ROD_X - f2.x, dy = magY - f2.y, len = Math.max(1, Math.hypot(dx, dy)); f2.x += dx / len * 220 * dt; f2.y += dy / len * 220 * dt; if (len < 20) { f2.x = ROD_X; f2.y = magY; } }
        else { f2.x += f2.vx * dt; if (f2.x < -200 || f2.x > W + 200) fishes.splice(fi2, 1); }
      }
      if (Math.random() < dt * 6) bubbles.push({ x: snap(W * 0.1 + Math.random() * W * 0.8), y: H, vy: -50, life: 3 });
      for (var bi = bubbles.length - 1; bi >= 0; bi--) { bubbles[bi].y += bubbles[bi].vy * dt; bubbles[bi].life -= dt; if (bubbles[bi].life <= 0 || bubbles[bi].y < H * 0.38) bubbles.splice(bi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi3 = 0; fi3 < fishes.length; fi3++) drawFish(fishes[fi3]);
    drawRod();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(!dropping && !reeling ? 'TAP TO DROP' : dropping ? 'TAP TO REEL UP' : 'REELING...', W / 2, snap(H * 0.90), 38, C.e);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.30), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bd = 0; bd < MAX_BAD; bd++) game.draw.rect(snap(W / 2 + (bd - (MAX_BAD - 1) / 2) * 56) - 10, 224, 20, 20, bd < badCaught ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
