// 505-magnet-pull.js
// マグネットプル — タップした場所に磁場を発生させ、散らばる金属片を引き寄せて基地に回収する
// 操作: タップで磁場を発動（近くの金属片が引き寄せられる）。緑の基地に触れると回収
// 成功: 8個 回収  失敗: 20秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、磁力研究所） ──
  var C = { bg:'#030506', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET PULL';
  var HOW_TO_PLAY = 'TAP TO PULSE A MAGNET FIELD · GATHER SCRAP TO THE BASE';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var BASE_X = snap(W / 2), BASE_Y = snap(H * 0.82), BASE_R = 70, METAL_R = 24, ATTRACT_R = 260, ATTRACT_FORCE = 700;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var metals, magnet, collected, timeLeft, done, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101820');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnMetals() {
    metals = [];
    for (var i = 0; i < 14; i++) { var at = 0, mx, my, ok; do { mx = snap(METAL_R + Math.random() * (W - METAL_R * 2)); my = snap(320 + Math.random() * H * 0.4); ok = Math.hypot(mx - BASE_X, my - BASE_Y) > BASE_R + 100; at++; } while (!ok && at < 20); metals.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, alive: true }); }
  }

  function initGame() { collected = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; magnet = null; spawnMetals(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 500 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(BASE_X, BASE_Y, BASE_R + 14 + Math.sin(game.time.elapsed * 3) * 6, C.b, 0.3); pc(BASE_X, BASE_Y, BASE_R, C.b, 0.8); pc(BASE_X - BASE_R * 0.25, BASE_Y - BASE_R * 0.25, BASE_R * 0.2, C.g, 0.2);
    for (var i = 0; i < metals.length; i++) { if (!metals[i].alive) continue; var m = metals[i]; pc(m.x, m.y, METAL_R, '#607080', 0.9); pc(m.x - 6, m.y - 6, 8, C.g, 0.3); }
    if (magnet && magnet.t > 0) { ring(magnet.x, magnet.y, ATTRACT_R * (magnet.t / 0.5), C.d, magnet.t * 0.5); pc(magnet.x, magnet.y, 26, C.a, 0.8); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    magnet = { x: tx, y: ty, t: 0.5 }; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!metals) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'SCRAP HAULED!' : 'TIME UP', W / 2, H * 0.30, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (magnet && magnet.t > 0) magnet.t -= dt;
      for (var i = metals.length - 1; i >= 0; i--) {
        var m = metals[i]; if (!m.alive) continue;
        m.vx *= Math.pow(0.85, dt * 60); m.vy *= Math.pow(0.85, dt * 60);
        if (magnet && magnet.t > 0) { var dx = magnet.x - m.x, dy = magnet.y - m.y, d = Math.hypot(dx, dy); if (d < ATTRACT_R && d > 1) { var force = ATTRACT_FORCE * (1 - d / ATTRACT_R) * dt; m.vx += dx / d * force; m.vy += dy / d * force; } }
        var bx = BASE_X - m.x, by = BASE_Y - m.y, bd = Math.hypot(bx, by); if (bd > 1) { m.vx += bx / bd * 30 * dt; m.vy += by / bd * 30 * dt; }
        var sp = Math.hypot(m.vx, m.vy); if (sp > 500) { m.vx *= 500 / sp; m.vy *= 500 / sp; }
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.x < METAL_R) { m.x = METAL_R; m.vx = Math.abs(m.vx) * 0.6; } if (m.x > W - METAL_R) { m.x = W - METAL_R; m.vx = -Math.abs(m.vx) * 0.6; }
        if (m.y < 300) { m.y = 300; m.vy = Math.abs(m.vy) * 0.6; } if (m.y > H - METAL_R) { m.y = H - METAL_R; m.vy = -Math.abs(m.vy) * 0.6; }
        if (Math.hypot(m.x - BASE_X, m.y - BASE_Y) < BASE_R + METAL_R) { m.alive = false; collected++; flash = 0.2; game.audio.play('se_tap', 0.25); for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 0.35, col: C.b }); } if (collected >= NEEDED) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.08);
    txt('TAP TO MAGNETIZE', W / 2, snap(H * 0.92), 36, C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
