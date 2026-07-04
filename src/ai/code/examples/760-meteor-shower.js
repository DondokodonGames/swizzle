// 760-meteor-shower.js
// メテオシャワー — 降り注ぐ流星を、地面に着弾する前にタップで撃ち落とす
// 操作: 流星をタップして迎撃。地面に落ちると着弾ミス
// 成功: 12個 撃破  失敗: 3個 着弾 or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜空） ──
  var C = { bg:'#02040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var METEOR = '#ff6600', METEOR_HI = '#ffe600', TRAIL = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHOWER';
  var HOW_TO_PLAY = 'TAP THE FALLING METEORS TO SHOOT THEM DOWN BEFORE THEY HIT THE GROUND';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 50 → 12
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var GROUND_Y = snap(H * 0.88);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var meteors, spawnTimer, score, missed, timeLeft, done, elapsed, particles, craters, groundShakes, flash, flashCol, resultText, resultTimer, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#06080e');
  }

  function background() { game.draw.clear(C.bg); for (var sti = 0; sti < stars.length; sti++) { var st = stars[sti]; st.tw += 0.05; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, '#94a3b8', 0.3 + 0.3 * Math.sin(st.tw)); } }

  function spawnMeteor() {
    var startX = Math.random() * W * 0.8 + W * 0.1, angle = 0.3 + Math.random() * 0.7, spd = 340 + Math.random() * 220 + score * 8;
    meteors.push({ x: startX, y: -40, vx: Math.sin(angle) * spd * (Math.random() < 0.5 ? 1 : -1), vy: Math.cos(angle) * spd, r: 18 + Math.random() * 22 });
  }

  function initGame() { meteors = []; spawnTimer = 0; score = 0; missed = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; craters = []; groundShakes = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; stars = []; for (var si = 0; si < 60; si++) stars.push({ x: Math.random() * W, y: Math.random() * GROUND_Y, r: Math.random() < 0.7 ? 8 : 16, tw: Math.random() * Math.PI * 2 }); spawnMeteor(); spawnMeteor(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 100) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var shake = groundShakes.length > 0 ? Math.sin(elapsed * 40) * 10 * groundShakes[0] : 0;
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m3 = meteors[mi2], spd2 = Math.sqrt(m3.vx * m3.vx + m3.vy * m3.vy), nx = -m3.vx / spd2, ny = -m3.vy / spd2;
      for (var tri = 1; tri <= 5; tri++) pc(m3.x + nx * tri * m3.r * 0.8, m3.y + ny * tri * m3.r * 0.8, m3.r * (1 - tri * 0.16), TRAIL, 0.5 - tri * 0.08);
      pc(m3.x, m3.y, m3.r, METEOR, 0.92); pc(m3.x - m3.r * 0.3, m3.y - m3.r * 0.3, m3.r * 0.35, METEOR_HI, 0.5);
    }
    var gy = GROUND_Y + shake;
    game.draw.rect(0, gy, W, H - gy, '#1e293b', 1.0); game.draw.rect(0, gy, W, 8, '#334155', 0.6);
    for (var ci = 0; ci < craters.length; ci++) { var cr = craters[ci]; pc(cr.x, gy, cr.r * 2 * cr.life, '#000', cr.life * 0.5); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitIdx = -1, bestDist = 100;
    for (var i = 0; i < meteors.length; i++) { var m = meteors[i], dx = tx - m.x, dy = ty - m.y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < m.r + 60 && dist < bestDist) { bestDist = dist; hitIdx = i; } }
    if (hitIdx >= 0) {
      var m2 = meteors[hitIdx]; score++; flash = 0.15; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.3; game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x: m2.x, y: m2.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp, life: 0.45, col: METEOR_HI, r: 10 }); }
      meteors.splice(hitIdx, 1);
      if (score >= NEEDED) { finish(true); return; }
    } else particles.push({ x: tx, y: ty, vx: 0, vy: -60, life: 0.25, col: C.g, r: 6 });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!meteors) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.72, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY DEFENDER!' : 'GROUND ZERO', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.5, 0.9 - score * 0.02); if (spawnTimer <= 0) { spawnTimer = spawnRate; spawnMeteor(); if (score > 8) spawnMeteor(); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.y > GROUND_Y) {
          missed++; flash = 0.35; flashCol = C.a; resultText = 'IMPACT!'; resultTimer = 0.42; game.audio.play('se_failure', 0.35); craters.push({ x: m.x, life: 1.0, r: m.r });
          for (var pe = 0; pe < 10; pe++) { var pea = -Math.PI + Math.random() * Math.PI; particles.push({ x: m.x, y: GROUND_Y, vx: Math.cos(pea) * (120 + Math.random() * 160), vy: Math.sin(pea) * (80 + Math.random() * 120) - 60, life: 0.5, col: C.a, r: 12 }); }
          groundShakes.push(0.3); meteors.splice(mi, 1);
          if (missed >= MAX_MISS) { finish(false); return; }
        } else if (m.x < -m.r * 2 || m.x > W + m.r * 2) meteors.splice(mi, 1);
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2.2; if (p.life <= 0) particles.splice(pp, 1); }
      for (var gi = craters.length - 1; gi >= 0; gi--) { craters[gi].life -= dt * 0.3; if (craters[gi].life <= 0) craters.splice(gi, 1); }
      for (var gsi = groundShakes.length - 1; gsi >= 0; gsi--) { groundShakes[gsi] -= dt * 3; if (groundShakes[gsi] <= 0) groundShakes.splice(gsi, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - snap(p2.r * p2.life), snap(p2.y) - snap(p2.r * p2.life), snap(p2.r * p2.life * 2) + 4, snap(p2.r * p2.life * 2) + 4, p2.col, p2.life); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.20), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var msi = 0; msi < MAX_MISS; msi++) game.draw.rect(snap(W / 2 + (msi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, msi < missed ? C.a : '#06080e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
