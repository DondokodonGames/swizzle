// 431-orbit-lock.js
// 軌道ロック — 外周を回る衛星をタップで内周へ引き込み、回転するドックにタイミングよくロックする
// 操作: 衛星をタップして内側へ降下。ドック位置に合うと成功、外すと弾かれる
// 成功: 衛星3基を ドッキング  失敗: 3回 失敗 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、軌道） ──
  var C = { bg:'#010210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT LOCK';
  var HOW_TO_PLAY = 'TAP A SATELLITE TO DOCK IT INTO THE ROTATING SLOT';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 6 → 3
  var MAX_COLLIDE = 3;
  var CX = snap(W / 2), CY = snap(H * 0.48), PLANET_R = 76, INNER_R = 190, OUTER_R = 360, N = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var slots, sats, stars, locked, collisions, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.3 + Math.sin(game.time.elapsed + si) * 0.2); }

  function initStars() { stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function initGame() {
    slots = []; for (var i = 0; i < N; i++) slots.push({ angle: i / N * Math.PI * 2, locked: false });
    sats = []; for (var j = 0; j < N; j++) sats.push({ angle: j / N * Math.PI * 2 + 0.4, speed: 0.7 + j * 0.15, r: OUTER_R, docking: false, locked: false });
    locked = 0; collisions = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (locked * 700 + Math.ceil(timeLeft) * 100) : locked * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(CX, CY, OUTER_R, '#20304a', 0.6); ring(CX, CY, INNER_R, '#28405c', 0.7);
    for (var di = 0; di < slots.length; di++) { var s = slots[di], sx = CX + Math.cos(s.angle) * INNER_R, sy = CY + Math.sin(s.angle) * INNER_R; if (s.locked) pc(sx, sy, 18, C.e, 0.8); else ring(sx, sy, 16, C.b, 0.5); }
    pc(CX, CY, PLANET_R, C.d, 0.9); pc(CX - 20, CY - 24, PLANET_R * 0.35, C.e, 0.3);
    for (var si = 0; si < sats.length; si++) { var sat = sats[si], x = CX + Math.cos(sat.angle) * sat.r, y = CY + Math.sin(sat.angle) * sat.r; if (sat.locked) pc(x, y, 22, C.e, 0.9); else { if (sat.docking) ring(x, y, 26, C.c, 0.5 + Math.sin(game.time.elapsed * 8) * 0.2); pc(x, y, 18, C.c, 0.9); pline(x - 34, y, x + 34, y, C.f, 0.6, 6); } }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bd = 999999;
    for (var si = 0; si < sats.length; si++) { var sat = sats[si]; if (sat.locked || sat.docking) continue; var sx = CX + Math.cos(sat.angle) * sat.r, sy = CY + Math.sin(sat.angle) * sat.r, d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = si; } }
    if (best >= 0 && bd < 130) { sats[best].docking = true; game.audio.play('se_tap', 0.4); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sats) { initStars(); initGame(); } background();
      for (var di = 0; di < slots.length; di++) slots[di].angle += dt * 0.3;
      for (var si = 0; si < sats.length; si++) sats[si].angle += sats[si].speed * dt;
      drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'ALL DOCKED!' : 'DRIFTED OFF', W / 2, H * 0.14, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.20, 56, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.26, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      for (var di = 0; di < slots.length; di++) if (!slots[di].locked) slots[di].angle += dt * 0.3;
      for (var si = 0; si < sats.length; si++) {
        var sat = sats[si]; if (sat.locked) continue;
        if (sat.docking) {
          sat.r = Math.max(INNER_R, sat.r - 300 * dt);
          if (sat.r <= INNER_R) {
            sat.r = INNER_R; var bestSlot = -1, bad = Math.PI;
            for (var di2 = 0; di2 < slots.length; di2++) { if (slots[di2].locked) continue; var ad = Math.abs(((sat.angle - slots[di2].angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (ad < bad) { bad = ad; bestSlot = di2; } }
            if (bestSlot >= 0 && bad < 0.4) { sat.locked = true; sat.angle = slots[bestSlot].angle; slots[bestSlot].locked = true; locked++; flash = 0.7; flashCol = C.b; game.audio.play('se_success', 0.6); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2, x2 = CX + Math.cos(sat.angle) * INNER_R, y2 = CY + Math.sin(sat.angle) * INNER_R; particles.push({ x: x2, y: y2, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: C.e }); } if (locked >= NEEDED) { finish(true); return; } }
            else { sat.r = OUTER_R; sat.docking = false; collisions++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4); if (collisions >= MAX_COLLIDE) { finish(false); return; } }
          }
        } else sat.angle += sat.speed * dt;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(locked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_COLLIDE; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_COLLIDE - 1) / 2) * 56) - 10, 224, 20, 20, ci < collisions ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
