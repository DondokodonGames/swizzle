// 574-magnet-sort.js
// マグネットソート — タップで磁石をN/S反転し、引力/斥力で球を動かして同色ゾーンへ集める
// 操作: タップで磁極反転＆その位置に磁場発生（同色ゾーンへ球を寄せる）スワイプで磁場移動
// 成功: 全9球をそれぞれの同色ゾーンへ  失敗: 25秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、磁場実験） ──
  var C = { bg:'#06060e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL_COLS = [C.a, C.e, C.b];  // 色は内容そのもの

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET SORT';
  var HOW_TO_PLAY = 'TAP TO FLIP THE MAGNET & PULL/PUSH BALLS INTO THEIR COLOR ZONES';
  var MAX_TIME = 25;
  var COLORS = 3, PER_COLOR = 3, ZONE_R = 90, BALL_R = 34;
  var ZONES = [ { x: 200, y: snap(H * 0.30), colorIdx: 0 }, { x: W - 200, y: snap(H * 0.30), colorIdx: 1 }, { x: W / 2, y: snap(H * 0.74), colorIdx: 2 } ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, polarity, magX, magY, magActive, magTimer, score, timeLeft, done, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha, w) { w = w || 6; var n = Math.max(8, Math.ceil(r / 6)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(a) * r) - w / 2, snap(cy + Math.sin(a) * r) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#12121e');
  }

  function background() { game.draw.clear(C.bg); }

  function initBalls() { balls = []; for (var c = 0; c < COLORS; c++) for (var n = 0; n < PER_COLOR; n++) { var ang = Math.random() * Math.PI * 2, r = 120 + Math.random() * 200; balls.push({ x: W / 2 + Math.cos(ang) * r, y: H / 2 + Math.sin(ang) * r, vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100, colorIdx: c, inZone: false }); } }

  function checkZones() { var total = 0; for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; b.inZone = false; for (var zi = 0; zi < ZONES.length; zi++) { var z = ZONES[zi]; if (Math.hypot(b.x - z.x, b.y - z.y) < ZONE_R && b.colorIdx === z.colorIdx) { b.inZone = true; total++; break; } } } return total; }

  function initGame() { polarity = 1; magX = W / 2; magY = H / 2; magActive = false; magTimer = 0; score = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; initBalls(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (2000 + Math.ceil(timeLeft) * 100) : score * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var zi = 0; zi < ZONES.length; zi++) { var z = ZONES[zi], zc = BALL_COLS[z.colorIdx]; ring(z.x, z.y, ZONE_R, zc, 0.5, 6); pc(z.x, z.y, ZONE_R - 10, zc, 0.1); var ic = 0; for (var bi = 0; bi < balls.length; bi++) if (balls[bi].inZone && balls[bi].colorIdx === z.colorIdx) ic++; txt(ic + '/' + PER_COLOR, z.x, z.y + 14, 36, zc); }
    for (var bi2 = 0; bi2 < balls.length; bi2++) { var b = balls[bi2], bc = BALL_COLS[b.colorIdx]; pc(b.x, b.y, BALL_R, bc, b.inZone ? 0.95 : 0.8); pc(b.x - 8, b.y - 8, BALL_R * 0.3, C.g, 0.4); }
    if (magActive) { var mp = 1 + Math.sin(game.time.elapsed * 10) * 0.15, mc = polarity > 0 ? C.f : C.e; pc(magX, magY, 40 * mp, mc, 0.2); pc(magX, magY, 24 * mp, mc, 0.6); txt(polarity > 0 ? 'N' : 'S', magX, magY + 12, 32, C.g); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    polarity *= -1; magX = tx; magY = ty; magActive = true; magTimer = 0.8; game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    magX = (x1 + x2) / 2; magY = (y1 + y2) / 2; magActive = true; magTimer = 0.5; game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.50, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.545, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SORTED!' : 'TIME UP', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2.5; if (magTimer > 0) magTimer -= dt; if (magTimer <= 0) magActive = false;
      for (var bi = 0; bi < balls.length; bi++) {
        var b = balls[bi];
        if (magActive) { var dx = magX - b.x, dy = magY - b.y, d = Math.hypot(dx, dy); if (d > 10 && d < 400) { var force = polarity * 2000 / (d * d) * 40; b.vx += (dx / d) * force * dt; b.vy += (dy / d) * force * dt; } }
        for (var zi = 0; zi < ZONES.length; zi++) { var z = ZONES[zi]; if (b.colorIdx === z.colorIdx) { var zdx = z.x - b.x, zdy = z.y - b.y, zd = Math.hypot(zdx, zdy); if (zd > ZONE_R && zd < 500) { b.vx += (zdx / zd) * 30 * dt; b.vy += (zdy / zd) * 30 * dt; } } }
        for (var bj = bi + 1; bj < balls.length; bj++) { var b2 = balls[bj], bx = b.x - b2.x, by = b.y - b2.y, bd = Math.hypot(bx, by); if (bd < BALL_R * 2.5 && bd > 0.1) { var push = (BALL_R * 2.5 - bd) * 0.5; b.vx += (bx / bd) * push * dt * 20; b.vy += (by / bd) * push * dt * 20; b2.vx -= (bx / bd) * push * dt * 20; b2.vy -= (by / bd) * push * dt * 20; } }
        b.vx *= Math.pow(0.3, dt); b.vy *= Math.pow(0.3, dt); b.vx = Math.max(-300, Math.min(300, b.vx)); b.vy = Math.max(-300, Math.min(300, b.vy)); b.x += b.vx * dt; b.y += b.vy * dt;
        b.x = Math.max(BALL_R, Math.min(W - BALL_R, b.x)); b.y = Math.max(BALL_R + 260, Math.min(H - BALL_R, b.y));
      }
      score = checkZones();
      if (score >= balls.length) { flash = 0.6; for (var pi = 0; pi < 20; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350, life: 0.6, col: BALL_COLS[Math.floor(Math.random() * 3)] }); } finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + balls.length, W / 2, 168, 48, C.b);
    txt(polarity > 0 ? 'ATTRACT' : 'REPEL', W / 2, 224, 40, polarity > 0 ? C.f : C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
