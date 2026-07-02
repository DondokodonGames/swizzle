// 357-asteroid-split.js
// アステロイドスプリット — タップした方向へ弾を撃ち、大きな小惑星を割って全て消し去る宇宙シューティング
// 操作: タップした方向へ射撃（当てると小惑星が2つに割れる）
// 成功: 小惑星を全て消す  失敗: 宇宙船に3回ぶつかる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、深宇宙） ──
  var C = { bg:'#000408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ASTEROID SPLIT';
  var HOW_TO_PLAY = 'TAP TO SHOOT · SPLIT AND CLEAR EVERY ASTEROID';
  var MAX_TIME = 15;
  var MAX_HITS = 3;
  var SX = snap(W / 2), SHIPY = snap(H * 0.62);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shipAng, bullets, asteroids, hits, timeLeft, done, particles, stars, invin, shot;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); for (var i = 0; i < stars.length; i++) game.draw.rect(stars[i].x, stars[i].y, stars[i].s, stars[i].s, C.g, Math.floor(game.time.elapsed * 2 + i) % 3 === 0 ? 0.6 : 0.2); }

  function spawnAsteroids() { asteroids = []; for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2; asteroids.push({ x: snap(W / 2 + Math.cos(a) * 300), y: snap(H / 2 + Math.sin(a) * 300), vx: Math.cos(a + Math.PI / 2) * 70, vy: Math.sin(a + Math.PI / 2) * 70, r: 72, size: 2 }); } }

  function initGame() { shipAng = -Math.PI / 2; bullets = []; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; invin = 0; shot = 0; stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 }); spawnAsteroids(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (5000 + Math.ceil(timeLeft) * 150) : (MAX_HITS - hits) * 500;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ai = 0; ai < asteroids.length; ai++) { var a = asteroids[ai], col = a.size === 2 ? '#667' : a.size === 1 ? '#99a' : '#ccd'; pc(a.x, a.y, a.r, col, 0.85); pc(a.x - a.r * 0.3, a.y - a.r * 0.3, a.r * 0.22, C.g, 0.2); }
    for (var bi = 0; bi < bullets.length; bi++) pc(bullets[bi].x, bullets[bi].y, 8, C.c, 0.9);
    var al = invin > 0 ? (Math.floor(game.time.elapsed * 16) % 2 ? 0.4 : 0.9) : 0.9;
    pc(SX, SHIPY, 28, C.e, al); pline(SX, SHIPY, SX + Math.cos(shipAng) * 46, SHIPY + Math.sin(shipAng) * 46, C.g, al, 8);
    if (shot > 0) pc(SX, SHIPY, 28 + (1 - shot) * 20, C.c, shot * 0.4);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - SX, dy = y - SHIPY, len = Math.hypot(dx, dy); if (len < 1) return;
    shipAng = Math.atan2(dy, dx); shot = 0.3; bullets.push({ x: SX, y: SHIPY, vx: dx / len * 720, vy: dy / len * 720, life: 1.4 }); game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FIELD CLEARED!' : 'SHIP LOST', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (invin > 0) invin -= dt; if (shot > 0) shot -= dt;
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) { bullets.splice(bi, 1); continue; }
        for (var ai = asteroids.length - 1; ai >= 0; ai--) {
          var a = asteroids[ai];
          if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 10) {
            bullets.splice(bi, 1);
            for (var k = 0; k < 6; k++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: a.x, y: a.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.5, col: C.g }); }
            if (a.size > 0) for (var s = 0; s < 2; s++) { var sa = Math.atan2(b.vy, b.vx) + Math.PI / 2 * (s === 0 ? 1 : -1); asteroids.push({ x: a.x, y: a.y, vx: Math.cos(sa) * (a.size === 2 ? 120 : 180), vy: Math.sin(sa) * (a.size === 2 ? 120 : 180), r: a.size === 2 ? 42 : 22, size: a.size - 1 }); }
            game.audio.play('se_success', 0.4); asteroids.splice(ai, 1); break;
          }
        }
      }
      for (var ai2 = 0; ai2 < asteroids.length; ai2++) {
        var a2 = asteroids[ai2]; a2.x = (a2.x + a2.vx * dt + W) % W; a2.y = (a2.y + a2.vy * dt + H) % H;
        if (invin <= 0 && Math.hypot(a2.x - SX, a2.y - SHIPY) < a2.r + 28) { hits++; invin = 2.0; game.audio.play('se_failure', 0.5); for (var k2 = 0; k2 < 8; k2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: SX, y: SHIPY, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.5, col: C.e }); } if (hits >= MAX_HITS) { finish(false); return; } }
      }
      if (asteroids.length === 0) { for (var k3 = 0; k3 < 15; k3++) { var pa3 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa3) * 250, vy: Math.sin(pa3) * 250, life: 0.7, col: C.c }); } finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('LEFT ' + asteroids.length, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
