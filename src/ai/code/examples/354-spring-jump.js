// 354-spring-jump.js
// スプリングジャンプ — バネをタップでチャージして玉を高く打ち上げ、宙に浮かぶ星を集める
// 操作: 玉がバネにいるときタップでチャージ（満タンで自動発射）
// 成功: 星を5個集める  失敗: バネから3回落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、ナイトスプリング） ──
  var C = { bg:'#020b18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', plat:'#2a3a55' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPRING JUMP';
  var HOW_TO_PLAY = 'TAP TO CHARGE THE SPRING · GRAB THE STARS';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 12 → 5
  var MAX_FALL = 3;
  var GROUND_Y = snap(H * 0.82), SX = snap(W / 2), NAT = 120, BR = 30;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, by, bvx, bvy, onSpring, pressing, charge, compress, stars, collected, falls, timeLeft, done, particles, trail, cameraY;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function star(cx, cy, r, col, alpha) { pc(cx, cy, r * 0.5, col, alpha); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * Math.PI * 2 / 5; pc(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, r * 0.3, col, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a28');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnStars() { stars = []; for (var i = 0; i < NEEDED + 3; i++) stars.push({ x: snap(W * 0.12 + Math.random() * W * 0.76), y: snap(GROUND_Y - 300 - Math.random() * 1000), r: 28, got: false }); }

  function initGame() { bx = SX; by = GROUND_Y - NAT - BR; bvx = 0; bvy = 0; onSpring = true; pressing = false; charge = 0; compress = 0; collected = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; trail = []; cameraY = 0; spawnStars(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 500 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < stars.length; si++) { if (stars[si].got) continue; var sy = stars[si].y - cameraY; if (sy < -60 || sy > H + 60) continue; star(stars[si].x, sy, 28, C.c, 0.9); }
    game.draw.rect(0, GROUND_Y - cameraY, W, H, C.plat, 0.9); game.draw.rect(0, GROUND_Y - cameraY, W, 12, C.e, 0.4);
    var top = GROUND_Y - NAT * (1 - compress * 0.7);
    for (var seg = 0; seg < 6; seg++) { var y1 = GROUND_Y - cameraY - seg / 6 * (GROUND_Y - top), x1 = SX + Math.sin(seg * 1.2) * 20, y2 = GROUND_Y - cameraY - (seg + 1) / 6 * (GROUND_Y - top), x2 = SX + Math.sin((seg + 1) * 1.2) * 20; pline(x1, y1, x2, y2, C.b, 0.9, 10); }
    game.draw.rect(SX - 50, GROUND_Y - 20 - cameraY, 100, 24, C.d, 0.9);
    for (var ti = 0; ti < trail.length; ti++) pc(trail[ti].x, trail[ti].y - cameraY, BR * trail[ti].life * 2, C.c, trail[ti].life * 0.4);
    pc(bx, by - cameraY, BR, C.c, 0.95); pc(bx - 8, by - cameraY - 8, 8, C.g, 0.6);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onSpring && !pressing) { pressing = true; charge = 0; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
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
      txt(resultSuccess ? 'STARSTRUCK!' : 'FELL OFF', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (pressing && onSpring) { charge = Math.min(charge + dt, 1.0); compress = charge; if (charge >= 0.7) { bvy = -(900 + charge * 400); bvx = (Math.random() - 0.5) * 200; onSpring = false; pressing = false; compress = 0; game.audio.play('se_tap', 0.5); } }
      if (!onSpring) {
        bvy += 500 * dt; bx += bvx * dt; by += bvy * dt;
        if (bx < BR) { bx = BR; bvx = Math.abs(bvx); } if (bx > W - BR) { bx = W - BR; bvx = -Math.abs(bvx); }
        trail.push({ x: bx, y: by, life: 0.3 });
        for (var si = 0; si < stars.length; si++) { var st = stars[si]; if (!st.got && Math.hypot(bx - st.x, by - st.y) < BR + st.r) { st.got = true; collected++; game.audio.play('se_success', 0.5); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: st.x, y: st.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.5, col: C.c }); } if (collected >= NEEDED) { finish(true); return; } } }
        if (by >= GROUND_Y - NAT - BR && Math.abs(bx - SX) < 80 && bvy > 0) { by = GROUND_Y - NAT - BR; bvy = 0; bvx = 0; onSpring = true; compress = 0; game.audio.play('se_tap', 0.2); }
        else if (by > GROUND_Y + 100) { falls++; game.audio.play('se_failure', 0.5); bx = SX; by = GROUND_Y - NAT - BR; bvx = 0; bvy = 0; onSpring = true; if (falls >= MAX_FALL) { finish(false); return; } }
      }
      cameraY = onSpring ? 0 : Math.min(0, by - H * 0.4);
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y - cameraY) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (pressing && onSpring) { game.draw.rect(snap(W * 0.2), snap(H * 0.90), snap(W * 0.6), 16, '#0a1a28', 0.6); game.draw.rect(snap(W * 0.2), snap(H * 0.90), snap(W * 0.6 * charge), 16, charge > 0.5 ? C.b : C.c, 0.9); }
    else if (onSpring) txt('TAP TO CHARGE', W / 2, snap(H * 0.92), 44, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#0a1a28');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
