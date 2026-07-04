// 735-gravity-wells.js
// グラビティウェル — タップで重力井戸を作り、漂う星を惑星の周回軌道に乗せる
// 操作: タップした場所に重力が発生し星を引く。星を軌道リング上に導く
// 成功: 8個 軌道に乗せる  失敗: 3個 逃す/衝突 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、宇宙） ──
  var C = { bg:'#010108', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PLANET = '#3355ff', PLANET_HI = '#93c5fd', STAR = '#ffe600', STAR_HI = '#ffffff', WELL = '#7700ff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY WELLS';
  var HOW_TO_PLAY = 'TAP TO MAKE GRAVITY WELLS · GUIDE DRIFTING STARS ONTO THE ORBIT RING';
  var MAX_TIME = 24;
  var NEEDED     = 8;        // 修正2: 20 → 8
  var MAX_ESCAPE = 3;        // 修正2: 15 → 3
  var CX = W / 2, CY = snap(H * 0.45), PLANET_R = 60, ORBIT_R = 220, ORBIT_TOLERANCE = 60, STAR_R = 16;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, wells, spawnTimer, score, escaped, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, bgStars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030310');
  }

  function background() { game.draw.clear(C.bg); for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) game.draw.rect(snap(bgStars[bsi2].x), snap(bgStars[bsi2].y), bgStars[bsi2].r, bgStars[bsi2].r, STAR, 0.3); }

  function spawnStar() {
    var angle = Math.random() * Math.PI * 2, spawnR = 500, sx = CX + Math.cos(angle) * spawnR, sy = CY + Math.sin(angle) * spawnR;
    sx = Math.max(-50, Math.min(W + 50, sx)); sy = Math.max(-50, Math.min(H + 50, sy));
    var tx = CX + (Math.random() - 0.5) * 400, ty = CY + (Math.random() - 0.5) * 400, dx = tx - sx, dy = ty - sy, dist = Math.sqrt(dx * dx + dy * dy), spd = 80 + Math.random() * 60;
    stars.push({ x: sx, y: sy, vx: (dx / dist) * spd, vy: (dy / dist) * spd, phase: Math.random() * Math.PI * 2, captured: false });
  }

  function initGame() { stars = []; wells = []; spawnTimer = 1.5; score = 0; escaped = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; bgStars = []; for (var bsi = 0; bsi < 50; bsi++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16 }); spawnStar(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < 36; oi++) { var oa = oi * Math.PI * 2 / 36; pc(CX + Math.cos(oa) * ORBIT_R, CY + Math.sin(oa) * ORBIT_R, 4, C.d, 0.4); }
    for (var wi2 = 0; wi2 < wells.length; wi2++) { var wl = wells[wi2], wa = wl.life / wl.maxLife; pc(wl.x, wl.y, 120 * wa, WELL, wa * 0.12); pc(wl.x, wl.y, 24 * wa, WELL, wa * 0.7); }
    for (var si2 = 0; si2 < stars.length; si2++) { var st = stars[si2]; if (st.captured) pc(st.x, st.y, STAR_R * (0.9 + 0.1 * Math.sin(st.phase * 4)), STAR_HI, 0.9); }
    pc(CX, CY, PLANET_R, PLANET, 0.9); pc(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.25, PLANET_HI, 0.3);
    for (var si3 = 0; si3 < stars.length; si3++) { var st3 = stars[si3]; if (st3.captured) continue; pc(st3.x, st3.y, STAR_R * (0.85 + 0.15 * Math.sin(st3.phase * 3)), STAR, 0.9); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    wells.push({ x: tx, y: ty, life: 0.6, maxLife: 0.6 }); game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 60, vy: Math.sin(pa) * 60, life: 0.3, col: WELL }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORBIT ACHIEVED!' : 'LOST IN SPACE', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      spawnTimer -= dt; var rate = Math.max(0.6, 1.5 - score * 0.04); if (spawnTimer <= 0) { spawnTimer = rate; if (stars.length < 8) spawnStar(); }
      for (var wi = wells.length - 1; wi >= 0; wi--) { wells[wi].life -= dt; if (wells[wi].life <= 0) wells.splice(wi, 1); }
      for (var si = stars.length - 1; si >= 0; si--) {
        var s = stars[si]; if (s.captured) { s.phase += dt * 2; continue; }
        for (var wj = 0; wj < wells.length; wj++) { var w = wells[wj], dx = w.x - s.x, dy = w.y - s.y, dist2 = dx * dx + dy * dy; if (dist2 < 300 * 300 && dist2 > 1) { var force = 1200 * (w.life / w.maxLife) / Math.sqrt(dist2); s.vx += (dx / Math.sqrt(dist2)) * force * dt; s.vy += (dy / Math.sqrt(dist2)) * force * dt; } }
        var pdx = CX - s.x, pdy = CY - s.y, pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist > 1) { var pgrav = 80 / pdist; s.vx += (pdx / pdist) * pgrav * dt; s.vy += (pdy / pdist) * pgrav * dt; }
        var spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy); if (spd > 500) { s.vx = s.vx / spd * 500; s.vy = s.vy / spd * 500; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.phase += dt * 2;
        var orbitDist = Math.abs(Math.sqrt((s.x - CX) * (s.x - CX) + (s.y - CY) * (s.y - CY)) - ORBIT_R), orbitSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (orbitDist < ORBIT_TOLERANCE && orbitSpeed < 250) {
          s.captured = true; score++; flash = 0.3; flashCol = C.b; resultText = 'IN ORBIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
          for (var p2 = 0; p2 < 6; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: s.x, y: s.y, vx: Math.cos(pa2) * 150, vy: Math.sin(pa2) * 150, life: 0.4, col: STAR_HI }); }
          if (score >= NEEDED) { finish(true); return; }
          continue;
        }
        if (pdist < PLANET_R + STAR_R) { stars.splice(si, 1); escaped++; flash = 0.3; flashCol = C.a; resultText = 'CRASHED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.25); if (escaped >= MAX_ESCAPE) { finish(false); return; } continue; }
        if (s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100) { stars.splice(si, 1); escaped++; flash = 0.25; flashCol = C.a; resultText = 'ESCAPED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.2); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#030310');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
