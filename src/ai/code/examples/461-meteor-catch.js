// 461-meteor-catch.js
// 隕石キャッチ — 落下する隕石の軌道を読み、下部タップでバケツを置いて受け止める
// 操作: 画面下部をタップしてバケツの位置を決める（隕石が入れば成功）
// 成功: 6個 キャッチ  失敗: 3個 落下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、流星の夜） ──
  var C = { bg:'#000308', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR CATCH';
  var HOW_TO_PLAY = 'TAP THE LOWER AREA TO POSITION THE BUCKET';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BUCKET_W = 140, BUCKET_H = 76, GROUND_Y = snap(H * 0.82), BUCKET_Y = snap(H * 0.82) - 76;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var meteors, bucketX, placed, particles, caught, misses, timeLeft, done, flash, flashCol, nextSpawn, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#081020');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 2 + si) * 0.3); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#0a1828', 0.9); game.draw.rect(0, GROUND_Y, W, 6, C.e, 0.4); }

  function initStars() { stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H * 0.75), r: Math.random() < 0.5 ? 4 : 8 }); }

  function spawnMeteor() { meteors.push({ x: snap(60 + Math.random() * (W - 120)), y: -40, vx: (Math.random() - 0.5) * 180, vy: 300 + Math.random() * 160, trail: [], r: 22 + Math.random() * 10 }); }

  function initGame() { meteors = []; bucketX = W / 2; placed = false; particles = []; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; nextSpawn = 0.8; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawMeteors() {
    for (var mi = 0; mi < meteors.length; mi++) {
      var m = meteors[mi];
      for (var ti = 0; ti < m.trail.length; ti++) { var tr = ti / m.trail.length; pc(m.trail[ti].x, m.trail[ti].y, m.r * tr * 0.6, C.f, tr * 0.4); }
      pc(m.x, m.y, m.r, C.a, 0.9); pc(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.3, C.c, 0.5);
      if (placed) { var predX = m.x + m.vx * (BUCKET_Y - m.y) / m.vy; game.draw.rect(snap(predX) - 4, GROUND_Y - 20, 8, 16, C.g, 0.3); }
    }
  }

  function drawBucket() { var bx = snap(bucketX - BUCKET_W / 2); game.draw.rect(bx, BUCKET_Y, BUCKET_W, BUCKET_H, C.e, 0.85); game.draw.rect(bx, BUCKET_Y, BUCKET_W, 10, C.g, 0.6); game.draw.rect(bx + 10, BUCKET_Y + 16, BUCKET_W - 20, BUCKET_H - 16, '#0a2438', 0.6); }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ty < GROUND_Y - 220) return;
    bucketX = Math.max(BUCKET_W / 2, Math.min(W - BUCKET_W / 2, tx)); placed = true; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); drawBucket();
      txt(GAME_TITLE, W / 2, H * 0.22, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STARDUST!' : 'METEORS LOST', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnMeteor(); nextSpawn = Math.max(0.5, 0.9 + Math.random() * 0.4 - caught * 0.04); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.trail.push({ x: m.x, y: m.y }); if (m.trail.length > 10) m.trail.shift(); m.x += m.vx * dt; m.y += m.vy * dt;
        if (placed && m.y + m.r >= BUCKET_Y && m.y - m.r <= BUCKET_Y + BUCKET_H && Math.abs(m.x - bucketX) < BUCKET_W / 2 + m.r * 0.5) {
          caught++; flash = 0.5; flashCol = C.b; game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: BUCKET_Y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 100, life: 0.5, col: C.c }); }
          meteors.splice(mi, 1); if (caught >= NEEDED) { finish(true); return; } continue;
        }
        if (m.y > GROUND_Y + 40) {
          misses++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.3);
          for (var pi2 = 0; pi2 < 6; pi2++) { var a2 = Math.random() * Math.PI - Math.PI * 0.8; particles.push({ x: m.x, y: GROUND_Y, vx: Math.cos(a2) * 100, vy: Math.sin(a2) * 80, life: 0.4, col: C.a }); }
          meteors.splice(mi, 1); if (misses >= MAX_MISS) { finish(false); return; } continue;
        }
        if (m.x < -100 || m.x > W + 100) meteors.splice(mi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawMeteors();
    if (placed) drawBucket(); else txt('TAP TO PLACE BUCKET', W / 2, GROUND_Y + 60, 36, C.e);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi2 = 0; mi2 < MAX_MISS; mi2++) game.draw.rect(snap(W / 2 + (mi2 - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi2 < misses ? C.a : '#081020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
