// 523-plate-spin.js
// プレートスピン — 棒の上で傾く皿を、左右タップで棒を動かしてバランスを保ち落とさない
// 操作: 皿が傾いた側と同じ側をタップして支える（画面左タップ=左、右タップ=右）
// 成功: 10秒 維持  失敗: 皿が落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、大道芸） ──
  var C = { bg:'#080206', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PLATE SPIN';
  var HOW_TO_PLAY = 'TAP THE SIDE THE PLATE LEANS TO · KEEP IT BALANCED';
  var MAX_TIME = 15;
  var GOAL     = 10;         // 修正2: 30秒 → 10秒
  var STICK_BASE_Y = snap(H * 0.82), STICK_H = 400, PLATE_R = 180, PLATE_T = 24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var plateAngle, plateVel, stickX, survived, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1e1010');
  }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#1e1010');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, STICK_BASE_Y + 20, W, H - STICK_BASE_Y - 20, '#1e1010', 0.9); }

  function initGame() { plateAngle = (Math.random() - 0.5) * 0.2; plateVel = 0; stickX = W / 2; survived = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(survived) * 400 + Math.round(1 / (Math.abs(plateAngle) + 0.1)) * 100 + Math.ceil(timeLeft) * 100) : Math.ceil(survived) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pline(stickX, STICK_BASE_Y, stickX, STICK_BASE_Y - STICK_H, C.f, 0.9, 14);
    var tipX = stickX, tipY = STICK_BASE_Y - STICK_H, pcx = tipX + Math.sin(plateAngle) * 20, pcy = tipY - PLATE_T / 2;
    pc(tipX, tipY + 6, 26, '#000000', 0.4);
    var px1 = pcx - Math.cos(plateAngle) * PLATE_R, py1 = pcy - Math.sin(plateAngle) * PLATE_R * 0.3, px2 = pcx + Math.cos(plateAngle) * PLATE_R, py2 = pcy + Math.sin(plateAngle) * PLATE_R * 0.3;
    pline(px1, py1, px2, py2, C.e, 0.9, PLATE_T); pline(px1 + 20, py1, px2 - 20, py2, C.g, 0.5, 6);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) stickX = Math.max(W * 0.2, stickX - 60); else stickX = Math.min(W * 0.8, stickX + 60);
    game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (plateAngle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'STILL SPINNING!' : 'CRASH!', W / 2, H * 0.20, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.26, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.32, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      var tipX = stickX, plateCenterX = tipX + Math.sin(plateAngle) * PLATE_R * 0.5, torque = (plateCenterX - tipX) / PLATE_R * 3.0 + (Math.random() - 0.5) * 0.06;
      plateVel += torque * dt; plateVel *= 0.97; plateAngle += plateVel * dt; stickX += (W / 2 - stickX) * dt * 0.3;
      if (Math.abs(plateAngle) > 0.9) { flash = 0.8; game.audio.play('se_failure', 0.8); var tipY = STICK_BASE_Y - STICK_H; for (var pi = 0; pi < 20; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tipX, y: tipY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 + 100, life: 0.7, col: C.e }); } finish(false); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 800 * dt; p.life -= dt * 1.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    var tr = Math.abs(plateAngle) / 0.9;
    if (tr > 0.55) txt('TAP ' + (plateAngle > 0 ? 'RIGHT!' : 'LEFT!'), W / 2, snap(H * 0.68), 60, C.a);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    survBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + GOAL + 's', W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
