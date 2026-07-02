// 391-glass-break.js
// ガラス割り — 揺れ動くパワーゲージを見極め、ちょうどいい力（緑帯）でタップしてガラスを割る
// 操作: パワーゲージが緑帯に来た瞬間にタップ。弱すぎ／強すぎは失敗
// 成功: 4回 ちょうどよく割る  失敗: 3回 力を外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、実験室） ──
  var C = { bg:'#0a0e1c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GLASS BREAK';
  var HOW_TO_PLAY = 'TAP WHEN THE POWER GAUGE IS IN THE GREEN ZONE';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_FAILED = 3;
  var T_MIN = 0.42, T_MAX = 0.72;
  var GX = snap(W / 2), GY = snap(H * 0.36), GW = 420, GH = 320;
  var BARX = snap(W / 2 - 260), BARY = snap(H * 0.68), BARW = 520, BARH = 44;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var power, pdir, hits, failed, timeLeft, done, particles, cracks, fbText, fbCol, fbTimer, locked;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { power = 0; pdir = 1; hits = 0; failed = 0; timeLeft = MAX_TIME; done = false; particles = []; cracks = []; fbText = ''; fbCol = C.b; fbTimer = 0; locked = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 100) : hits * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function makeCracks() { cracks = []; for (var ci = 0; ci < 14; ci++) cracks.push({ x: snap(GX + (Math.random() - 0.5) * GW), y: snap(GY + (Math.random() - 0.5) * GH), angle: Math.random() * Math.PI, len: 30 + Math.random() * 70 }); }

  function fire() {
    if (power >= T_MIN && power <= T_MAX) { hits++; fbText = 'CRACK!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.6); makeCracks(); for (var p = 0; p < 18; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: GX, y: GY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.6, col: C.e }); } if (hits >= NEEDED) { finish(true); return; } }
    else if (power < T_MIN) { failed++; fbText = 'TOO WEAK'; fbCol = C.c; fbTimer = 0.6; game.audio.play('se_failure', 0.2); cracks.push({ x: GX, y: GY, angle: Math.random() * Math.PI, len: 20 }); if (failed >= MAX_FAILED) { finish(false); return; } }
    else { failed++; fbText = 'TOO HARD'; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.4); for (var p2 = 0; p2 < 10; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: GX, y: GY, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.5, col: C.a }); } if (failed >= MAX_FAILED) { finish(false); return; } }
    locked = 0.5; power = 0; pdir = 1;
    setTimeout(function() { cracks = []; }, 500);
  }

  function drawGlass() {
    game.draw.rect(GX - GW / 2 - 12, GY - GH / 2 - 12, GW + 24, 12, C.d, 0.9); game.draw.rect(GX - GW / 2 - 12, GY + GH / 2, GW + 24, 12, C.d, 0.9);
    game.draw.rect(GX - GW / 2 - 12, GY - GH / 2 - 12, 12, GH + 24, C.d, 0.9); game.draw.rect(GX + GW / 2, GY - GH / 2 - 12, 12, GH + 24, C.d, 0.9);
    game.draw.rect(GX - GW / 2, GY - GH / 2, GW, GH, C.e, 0.18); game.draw.rect(GX - GW / 2 + 8, GY - GH / 2 + 8, GW - 16, 8, C.g, 0.15);
    for (var ci = 0; ci < cracks.length; ci++) { var cr = cracks[ci]; pline(cr.x, cr.y, cr.x + Math.cos(cr.angle) * cr.len, cr.y + Math.sin(cr.angle) * cr.len, C.g, 0.8, 4); }
  }

  function drawBar() {
    game.draw.rect(BARX, BARY, BARW, BARH, '#0a1428', 0.85);
    game.draw.rect(BARX + BARW * T_MIN, BARY - 4, BARW * (T_MAX - T_MIN), BARH + 8, C.b, 0.35);
    var px = BARX + BARW * power; game.draw.rect(snap(px) - 6, BARY - 10, 12, BARH + 20, C.c, 0.95);
    txt('WEAK', BARX, BARY - 26, 24, '#889', 'left'); txt('HARD', BARX + BARW, BARY - 26, 24, '#889', 'right');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || locked > 0) return; fire();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGlass(); drawBar();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHATTERED!' : 'FAILED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (locked > 0) locked -= dt;
      else { power += pdir * 1.1 * dt; if (power >= 1) { power = 1; pdir = -1; } if (power <= 0) { power = 0; pdir = 1; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGlass(); drawBar();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.60), 54, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAILED; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAILED - 1) / 2) * 56) - 10, 224, 20, 20, fi < failed ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
