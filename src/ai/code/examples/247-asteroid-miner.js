// 247-asteroid-miner.js
// アステロイドマイナー — 軌道を回る小惑星へ、母船からドリルを撃ち込んで鉱石を掘り出す
// 操作: タップした方向へドリルを発射
// 成功: 鉱石5個採掘  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、採掘軌道） ──
  var C = { bg:'#02030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ASTEROID MINER';
  var HOW_TO_PLAY = 'TAP TO FIRE THE DRILL AT ASTEROIDS';
  var MAX_TIME = 15;
  var NEEDED   = 5;           // 修正2: 50 → 5
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var CX = snap(W / 2), CY = snap(H / 2 + 40);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var asteroids, drills, mined, misses, timeLeft, done, particles, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.18) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, 4, 4, C.g, 0.3 + 0.15 * (Math.floor(game.time.elapsed * 2 + si) % 2)); }

  function initAsteroids() {
    asteroids = [];
    for (var ai = 0; ai < 5; ai++) { var ba = ai / 5 * Math.PI * 2, orbit = 200 + (ai % 3) * 80; asteroids.push({ angle: ba, orbitR: orbit, speed: (0.6 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1), r: 44 + (ai % 3) * 12, ore: 2 + ai % 3, maxOre: 2 + ai % 3, hitTimer: 0, x: 0, y: 0 }); }
  }

  function drawAsteroid(a) {
    var lit = a.hitTimer > 0, col = a.ore > 0 ? (lit ? C.g : '#556') : '#334';
    pc(a.x, a.y, a.r, col, 0.9);
    if (a.ore > 0) { for (var oi = 0; oi < Math.min(a.ore, 6); oi++) { var oa = oi / Math.min(a.ore, 6) * Math.PI * 2; game.draw.rect(snap(a.x + Math.cos(oa) * (a.r - 12)) - 4, snap(a.y + Math.sin(oa) * (a.r - 12)) - 4, 8, 8, C.f, 0.9); } txt(a.ore + '', a.x, a.y + 14, 40, C.c); }
  }

  function initGame() { initAsteroids(); drills = []; mined = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H) }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (mined * 300 + Math.ceil(timeLeft) * 60) : mined * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - CX, dy = y - CY, len = Math.hypot(dx, dy); if (len < 10) return;
    drills.push({ x: CX, y: CY, vx: dx / len * 650, vy: dy / len * 650, life: 0.8, hit: false }); game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); pc(CX, CY, 20, C.b, 0.9); for (var ai = 0; ai < asteroids.length; ai++) { var a = asteroids[ai]; a.angle += a.speed * dt; a.x = CX + Math.cos(a.angle) * a.orbitR; a.y = CY + Math.sin(a.angle) * a.orbitR; drawAsteroid(a); }
      txt(GAME_TITLE, W / 2, H * 0.1, 68, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.16, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MOTHERLODE!' : 'DEPLETED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var ai2 = 0; ai2 < asteroids.length; ai2++) { var a2 = asteroids[ai2]; a2.angle += a2.speed * dt; a2.x = CX + Math.cos(a2.angle) * a2.orbitR; a2.y = CY + Math.sin(a2.angle) * a2.orbitR; if (a2.hitTimer > 0) a2.hitTimer -= dt; }
      for (var di = drills.length - 1; di >= 0; di--) {
        var d = drills[di]; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; var hitSomething = false;
        for (var aj = 0; aj < asteroids.length; aj++) { var a3 = asteroids[aj]; if (a3.ore <= 0) continue; if (Math.hypot(d.x - a3.x, d.y - a3.y) < a3.r + 8) { a3.ore--; a3.hitTimer = 0.3; mined++; hitSomething = true; game.audio.play('se_success', 0.5); for (var pi = 0; pi < 5; pi++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: d.x, y: d.y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.5 }); } if (mined >= NEEDED) { finish(true); return; } break; } }
        if (hitSomething) { drills.splice(di, 1); }
        else if (d.life <= 0 || d.x < 0 || d.x > W || d.y < 0 || d.y > H) { if (d.life <= 0) { misses++; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } } drills.splice(di, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ai3 = 0; ai3 < asteroids.length; ai3++) ring(CX, CY, asteroids[ai3].orbitR, C.d, 0.2);
    pc(CX, CY, 20, C.b, 0.9); game.draw.rect(snap(CX) - 6, snap(CY) - 6, 12, 12, C.g);
    for (var ai4 = 0; ai4 < asteroids.length; ai4++) drawAsteroid(asteroids[ai4]);
    for (var di2 = 0; di2 < drills.length; di2++) pc(drills[di2].x, drills[di2].y, 8, C.c, 0.9);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.f, particles[pp2].life * 2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(mined + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
