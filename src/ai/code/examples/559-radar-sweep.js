// 559-radar-sweep.js
// レーダースイープ — 回転ビームに照らされて浮かぶ光点を、消える前にタップで識別する
// 操作: スイープが通過して現れた光点（ブリップ）をタップ。消えると見逃し
// 成功: 6目標 識別  失敗: 3回 見逃し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、レーダー室） ──
  var C = { bg:'#000a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RADAR SWEEP';
  var HOW_TO_PLAY = 'TAP THE BLIPS LIT BY THE SWEEP BEFORE THEY FADE OUT';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.44), RADAR_R = 340, SWEEP_SPEED = 1.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sweepAngle, blips, identified, missed, timeLeft, done, particles, flash, flashCol, lastResult, lastTimer, nextBlip;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBlip() { blips.push({ angle: Math.random() * Math.PI * 2, dist: RADAR_R * (0.2 + Math.random() * 0.7), detected: false, life: 1.5, maxLife: 1.5, isHostile: Math.random() < 0.6, sweepHit: false }); }

  function initGame() { sweepAngle = 0; blips = []; identified = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; lastResult = ''; lastTimer = 0; nextBlip = 1.2; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (identified * 700 + Math.ceil(timeLeft) * 100) : identified * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(CX, CY, RADAR_R + 8, '#002208', 0.9); pc(CX, CY, RADAR_R, '#001a06', 0.95);
    for (var ri = 1; ri <= 4; ri++) ring(CX, CY, RADAR_R * ri / 4, '#003310', 0.6, 4);
    game.draw.rect(CX - RADAR_R, CY - 1, RADAR_R * 2, 2, '#003310', 0.6); game.draw.rect(CX - 1, CY - RADAR_R, 2, RADAR_R * 2, '#003310', 0.6);
    for (var tri = 0; tri < 14; tri++) { var ta = sweepAngle - tri * 0.06; game.draw.line(CX, CY, CX + Math.cos(ta) * RADAR_R, CY + Math.sin(ta) * RADAR_R, C.d, 2); }
    game.draw.line(CX, CY, CX + Math.cos(sweepAngle) * RADAR_R, CY + Math.sin(sweepAngle) * RADAR_R, C.b, 4); pc(CX, CY, 10, C.b, 0.9);
    for (var bi = 0; bi < blips.length; bi++) {
      var b = blips[bi]; if (!b.sweepHit) continue; var bx = CX + Math.cos(b.angle) * b.dist, by = CY + Math.sin(b.angle) * b.dist, lr = b.life / b.maxLife, col = b.detected ? (b.isHostile ? C.a : C.e) : C.b, al = b.detected ? 0.5 : lr * 0.9;
      pc(bx, by, 24 + (1 - lr) * 12, col, al * 0.3); pc(bx, by, 18, col, al * 0.9);
      if (!b.detected) ring(bx, by, 20 + Math.sin(game.time.elapsed * 8) * 6, col, lr * 0.4, 4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = null, bd = Infinity;
    for (var bi = 0; bi < blips.length; bi++) { var b = blips[bi]; if (b.detected || !b.sweepHit) continue; var bx = CX + Math.cos(b.angle) * b.dist, by = CY + Math.sin(b.angle) * b.dist, d = Math.hypot(tx - bx, ty - by); if (d < 80 && d < bd) { bd = d; best = b; } }
    if (best) {
      best.detected = true; identified++; flash = 0.25; flashCol = C.b; lastResult = best.isHostile ? 'HOSTILE!' : 'FRIENDLY'; lastTimer = 0.7; game.audio.play('se_success', 0.7);
      var bx2 = CX + Math.cos(best.angle) * best.dist, by2 = CY + Math.sin(best.angle) * best.dist;
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx2, y: by2, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.4, col: best.isHostile ? C.a : C.e }); }
      if (identified >= NEEDED) { finish(true); return; }
    } else { missed++; flash = 0.2; flashCol = C.a; lastResult = 'MISS'; lastTimer = 0.5; game.audio.play('se_failure', 0.3); if (missed >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!blips) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL TRACKED!' : 'CONTACT LOST', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (lastTimer > 0) lastTimer -= dt;
      sweepAngle += SWEEP_SPEED * dt;
      nextBlip -= dt; if (nextBlip <= 0) { spawnBlip(); nextBlip = Math.max(0.8, 1.3 - identified * 0.05); }
      for (var bi = blips.length - 1; bi >= 0; bi--) {
        var b = blips[bi]; b.life -= dt;
        var ns = ((sweepAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), nb = ((b.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), ad = Math.abs(ns - nb);
        if (ad < 0.15 || ad > Math.PI * 2 - 0.15) { b.sweepHit = true; b.life = b.maxLife; }
        if (b.life <= 0) { if (!b.detected && b.sweepHit) { missed++; flash = 0.2; flashCol = C.a; game.audio.play('se_failure', 0.2); if (missed >= MAX_MISS) { finish(false); return; } } blips.splice(bi, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (lastTimer > 0) txt(lastResult, CX, CY + RADAR_R + 80, 52, lastResult === 'MISS' ? C.a : C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(identified + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
