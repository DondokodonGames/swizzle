// 518-spinning-top.js
// スピニングトップ — 回転力が落ちて傾きが増すコマを、タップで回し続けて倒さず維持する
// 操作: 傾きが大きくなる前にタップして回転を補充（傾き0.35〜0.55でタップするとPERFECT）
// 成功: 10秒 回し続ける  失敗: 倒れる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、独楽まわし） ──
  var C = { bg:'#050510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPINNING TOP';
  var HOW_TO_PLAY = 'TAP TO RE-SPIN BEFORE THE TOP TIPS OVER';
  var MAX_TIME = 15;
  var GOAL     = 10;         // 修正2: 30秒 → 10秒
  var CX = snap(W / 2), CY = snap(H * 0.50), TOP_H = 280, MAX_TILT = 0.7;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var spin, tilt, tiltVel, angle, survived, perfectTaps, timeLeft, done, particles, tapPulse, lastPerfect, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1e1e3a');
  }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#1e1e3a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { spin = 8.0; tilt = 0; tiltVel = 0; angle = 0; survived = 0; perfectTaps = 0; timeLeft = MAX_TIME; done = false; particles = []; tapPulse = 0; lastPerfect = 0; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (perfectTaps * 400 + Math.ceil(timeLeft) * 100 + Math.floor(spin * 50)) : perfectTaps * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTop() {
    var tiltRatio = Math.abs(tilt) / MAX_TILT, tx = tilt * 200;
    pc(CX + tx, CY + 240, 120 + tiltRatio * 40, '#000000', 0.4);
    var px = CX + tx, py = CY + 240, topX = CX - tx * 0.5, topY = CY - TOP_H + tx * 80;
    var dcol = tiltRatio > 0.7 ? C.a : tiltRatio > 0.4 ? C.f : C.b;
    pc(px, py, 12, dcol, 0.9);
    pline(px, py, topX, topY, C.f, 0.9, 40); pline(px, py, topX, topY, C.c, 0.9, 14);
    var diskR = 76 + tapPulse * 30; pc(topX, topY, diskR, C.f, 0.9);
    for (var li = 0; li < 4; li++) { var la = angle + li * Math.PI / 2; pline(topX + Math.cos(la) * 10, topY + Math.sin(la) * 10, topX + Math.cos(la) * (diskR - 8), topY + Math.sin(la) * (diskR - 8), C.c, 0.9, 6); }
    pc(topX, topY, 18, C.e, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var ta = Math.abs(tilt), gain;
    if (ta > 0.35 && ta < 0.55) { gain = 4.0; perfectTaps++; lastPerfect = 0.6; } else gain = 2.0;
    spin = Math.min(10, spin + gain); tilt *= 0.5; tiltVel *= 0.4; tapPulse = 0.4; flash = 0.2; game.audio.play('se_tap', 0.4);
    for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.35, col: C.e }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      angle += 8 * dt; background(); drawTop();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawTop();
      txt(resultSuccess ? 'STILL SPINNING!' : 'TIPPED OVER', W / 2, H * 0.14, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.20, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.26, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt; angle += spin * dt;
      spin = Math.max(0, spin - dt * 0.7); var stab = spin / 8.0; tiltVel += dt * (1.6 - stab * 1.4); tilt += tiltVel * dt; tiltVel *= 0.98; if (Math.random() < 0.02) tiltVel += (Math.random() - 0.5) * 0.3;
      if (Math.abs(tilt) >= MAX_TILT) { finish(false); return; }
      if (survived >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (tapPulse > 0) tapPulse -= dt * 3; if (lastPerfect > 0) lastPerfect -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTop();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    var tr = Math.abs(tilt) / MAX_TILT;
    if (tr > 0.6) txt('TAP!', W / 2, snap(H * 0.82), 72, C.a); else if (lastPerfect > 0) txt('PERFECT!', W / 2, snap(H * 0.82), 56, C.b);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.e, flash * 0.08);

    survBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + GOAL + 's', W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
