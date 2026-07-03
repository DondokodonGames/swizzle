// 567-orbit-catch.js
// オービットキャッチ — 惑星を周回するアイテムを、タップで引力をON/OFFして引き寄せ捕獲する
// 操作: タップで惑星の引力をON/OFF切替（ONで軌道アイテムが内側へ、OFFで外へ流れる）
// 成功: 8個 キャッチ  失敗: 3個 取り逃す or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、重力捕獲） ──
  var C = { bg:'#00020f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CX = W / 2, CY = snap(H * 0.44), PLANET_R = 80, ORBIT_R = 320, ITEM_R = 28, ATTRACT_R = 200;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP TO TOGGLE GRAVITY · PULL ORBITING ITEMS INTO THE PLANET';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 8 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var items, attracting, catches, misses, timeLeft, done, particles, nextSpawn, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a24');
  }

  function background() { game.draw.clear(C.bg); for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), 8, 8, C.g, 0.3 + Math.sin(game.time.elapsed + st.t) * 0.2); } }

  function spawnItem() { items.push({ angle: Math.random() * Math.PI * 2, speed: (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8), orbitR: ORBIT_R * (0.7 + Math.random() * 0.6), life: 6.0, maxLife: 6.0, caught: false }); }

  function initGame() { items = []; attracting = false; catches = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; nextSpawn = 1.0; stars = []; for (var s = 0; s < 40; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * Math.PI * 2 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (catches * 700 + Math.ceil(timeLeft) * 100) : catches * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 1; oi <= 3; oi++) pc(CX, CY, ORBIT_R * 0.7 * oi / 2, '#1a1a44', 0.3);
    if (attracting) pc(CX, CY, ATTRACT_R + ORBIT_R * 0.6, C.f, 0.08 + Math.sin(game.time.elapsed * 8) * 0.04);
    for (var i = 0; i < items.length; i++) { var it = items[i], ix = CX + Math.cos(it.angle) * it.orbitR, iy = CY + Math.sin(it.angle) * it.orbitR, lr = it.life / it.maxLife; pc(ix, iy, ITEM_R + 4, C.c, lr * 0.2); pc(ix, iy, ITEM_R, C.c, lr * 0.9); pc(ix - 8, iy - 8, ITEM_R * 0.3, C.g, 0.5); }
    pc(CX, CY, PLANET_R, C.d, 0.95); pc(CX - 20, CY - 20, PLANET_R * 0.35, C.e, 0.4);
    txt(attracting ? 'PULL ON' : 'PULL OFF', CX, CY + 14, 30, attracting ? C.f : C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    attracting = !attracting; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CAUGHT!' : 'DRIFTED AWAY', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var s = 0; s < stars.length; s++) stars[s].t += dt;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnItem(); nextSpawn = Math.max(0.8, 1.4 - catches * 0.05); }
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i]; it.angle += it.speed * dt;
        var ix = CX + Math.cos(it.angle) * it.orbitR, iy = CY + Math.sin(it.angle) * it.orbitR;
        if (attracting) { if (Math.hypot(CX - ix, CY - iy) < ATTRACT_R + it.orbitR) it.orbitR = Math.max(PLANET_R + ITEM_R + 4, it.orbitR - 200 * dt); }
        else it.orbitR = Math.min(ORBIT_R * 1.3, it.orbitR + 60 * dt);
        if (it.orbitR <= PLANET_R + ITEM_R + 8 && !it.caught) { it.caught = true; catches++; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ix, y: iy, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.b }); } items.splice(i, 1); if (catches >= NEEDED) { finish(true); return; } continue; }
        it.life -= dt;
        if (it.life <= 0 || it.orbitR > ORBIT_R * 1.8) { if (!it.caught) { misses++; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } } items.splice(i, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(catches + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0a24');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
