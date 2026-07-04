// 679-meteor.js
// メテオキャッチ — 夜空を高速で横切る流れ星を、消える前にタップで捕まえる
// 操作: 流れ星（頭または尾）をタップ。画面外へ流れ去るとミス
// 成功: 10個 キャッチ  失敗: 3個 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、星空） ──
  var C = { bg:'#010210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR CATCH';
  var HOW_TO_PLAY = 'TAP THE STREAKING METEORS BEFORE THEY FLY OFF THE SCREEN';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_MISS = 3;          // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var meteors, spawnTimer, spawnInterval, caught, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#04051a');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) { var st = stars[si]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, C.g, 0.2 + 0.25 * Math.sin(game.time.elapsed * 1.1 + st.phase)); } }

  function spawnMeteor() { var sx = W * 0.2 + Math.random() * W * 0.9, sy = -60 + Math.random() * H * 0.35, angle = 2.1 + (Math.random() - 0.5) * 0.5, speed = 900 + Math.random() * 500, len = 150 + Math.random() * 200; meteors.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed: speed, len: len, tapped: false, counted: false }); }

  function initGame() { meteors = []; spawnTimer = 0; spawnInterval = 1.5; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; stars = []; for (var s = 0; s < 100; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.8 ? 8 : 16, phase: Math.random() * Math.PI * 2 }); spawnMeteor(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var mi = 0; mi < meteors.length; mi++) {
      var m = meteors[mi]; if (m.tapped) continue;
      var tailX = m.x - (m.vx / m.speed) * m.len, tailY = m.y - (m.vy / m.speed) * m.len;
      for (var seg = 0; seg < 5; seg++) { var t0 = seg / 5, t1 = (seg + 1) / 5; game.draw.line(tailX + (m.x - tailX) * t0, tailY + (m.y - tailY) * t0, tailX + (m.x - tailX) * t1, tailY + (m.y - tailY) * t1, C.d, 3 + seg * 1.5); }
      pc(m.x, m.y, 12, C.c, 0.95); pc(m.x, m.y, 24, C.e, 0.3);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i]; if (m.tapped || m.counted) continue;
      var dx = tx - m.x, dy = ty - m.y, dist = Math.sqrt(dx * dx + dy * dy);
      var midX = m.x - (m.vx / m.speed) * m.len * 0.5, midY = m.y - (m.vy / m.speed) * m.len * 0.5, mdist = Math.sqrt((tx - midX) * (tx - midX) + (ty - midY) * (ty - midY));
      if (dist < 100 || mdist < 90) {
        m.tapped = true; caught++; flash = 0.3; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
        for (var p = 0; p < 7; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.5, col: C.c }); }
        if (caught >= NEEDED) { finish(true); return; } break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!meteors) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STAR CATCHER!' : 'THEY SLIPPED BY', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      spawnInterval = Math.max(0.6, 1.5 - (MAX_TIME - timeLeft) * 0.04); spawnTimer += dt;
      if (spawnTimer >= spawnInterval) { spawnTimer = 0; spawnMeteor(); if (timeLeft < MAX_TIME - 8 && Math.random() < 0.35) spawnMeteor(); }
      for (var i = meteors.length - 1; i >= 0; i--) {
        var m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt;
        var off = m.x < -300 || m.x > W + 300 || m.y > H + 300;
        if (!m.tapped && !m.counted && off) { m.counted = true; missed++; flash = 0.2; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.35; game.audio.play('se_failure', 0.18); if (missed >= MAX_MISS) { finish(false); return; } }
        if (off || (m.tapped && m.x < -300)) meteors.splice(i, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi2 = 0; mi2 < MAX_MISS; mi2++) game.draw.rect(snap(W / 2 + (mi2 - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi2 < missed ? C.a : '#04051a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
