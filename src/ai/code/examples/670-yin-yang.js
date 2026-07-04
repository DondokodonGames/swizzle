// 670-yin-yang.js
// インヤン — 光と影のエネルギーを交互にタップで吸収し、両者の差を小さく保ち続ける
// 操作: タップで光(右)→影(左)→光…と交互に吸収。どちらも減り続け、差が開くと失敗
// 成功: 15秒 バランス維持  失敗: 差が開きすぎ or どちらか0 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、陰陽／光影は保持） ──
  var C = { bg:'#080808', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var YANG = '#f8fafc', YIN = '#64748b';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'YIN YANG';
  var HOW_TO_PLAY = 'TAP TO ABSORB LIGHT AND DARK ALTERNATELY · KEEP THE TWO IN BALANCE';
  var MAX_TIME = 15;         // 修正2: 60 → 15
  var CENTER_X = W / 2, CENTER_Y = snap(H * 0.46), BALANCE_THRESHOLD = 30, DRAIN_RATE = 6, ABSORB = 18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var yinE, yangE, absorbMode, orbAngle, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0c0c0c');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { yinE = 50; yangE = 50; absorbMode = 'yang'; orbAngle = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function getDiff() { return Math.abs(yinE - yangE); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (MAX_TIME * 300 + Math.round((BALANCE_THRESHOLD - getDiff()) * 50)) : Math.round((MAX_TIME - timeLeft) * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var yangR = 140 + (yangE / 100) * 120, yinR = 140 + (yinE / 100) * 120;
    pc(CENTER_X + 80, CENTER_Y, yangR, YANG, 0.12); pc(CENTER_X - 80, CENTER_Y, yinR, '#334155', 0.3);
    game.draw.rect(snap(CENTER_X) - 1, CENTER_Y - 280, 2, 560, C.d, 0.4);
    for (var oi = 0; oi < 3; oi++) { var oa = orbAngle + oi * Math.PI * 2 / 3, ob = orbAngle * 1.3 + oi * Math.PI * 2 / 3 + Math.PI; pc(CENTER_X + Math.cos(oa) * 300, CENTER_Y + Math.sin(oa) * 220, 16, YANG, 0.6); pc(CENTER_X + Math.cos(ob) * 300, CENTER_Y + Math.sin(ob) * 220, 16, YIN, 0.8); }
    var barW = 300, barH = 28, barY = snap(H * 0.76);
    game.draw.rect(CENTER_X + 30, barY, barW, barH, '#0c0c0c', 0.8); game.draw.rect(CENTER_X + 30, barY, barW * (yangE / 100), barH, YANG, 0.85); txt('LIGHT ' + Math.floor(yangE), CENTER_X + 30 + barW / 2, barY + barH + 36, 30, YANG);
    game.draw.rect(CENTER_X - 30 - barW, barY, barW, barH, '#0c0c0c', 0.8); game.draw.rect(CENTER_X - 30 - barW, barY, barW * (yinE / 100), barH, YIN, 0.85); txt('DARK ' + Math.floor(yinE), CENTER_X - 30 - barW / 2, barY + barH + 36, 30, C.g);
    var br = Math.max(0, 1 - getDiff() / BALANCE_THRESHOLD), bc = br > 0.5 ? C.b : C.a;
    game.draw.rect(W / 2 - 100, snap(H * 0.84), 200, 16, '#0c0c0c', 0.8); game.draw.rect(W / 2 - 100, snap(H * 0.84), 200 * br, 16, bc, 0.85); txt('BALANCE', W / 2, snap(H * 0.84) + 40, 30, bc);
    txt(absorbMode === 'yang' ? 'TAP: LIGHT (RIGHT)' : 'TAP: DARK (LEFT)', CENTER_X, snap(CENTER_Y + 340), 36, absorbMode === 'yang' ? YANG : C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (absorbMode === 'yang') { yangE = Math.min(100, yangE + ABSORB); absorbMode = 'yin'; for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CENTER_X + 100, y: CENTER_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: YANG }); } }
    else { yinE = Math.min(100, yinE + ABSORB); absorbMode = 'yang'; for (var p2 = 0; p2 < 5; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: CENTER_X - 100, y: CENTER_Y, vx: Math.cos(pa2) * 180, vy: Math.sin(pa2) * 180, life: 0.4, col: YIN }); } }
    game.audio.play('se_tap', 0.12);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (yinE === undefined) initGame(); orbAngle += dt * 1.2; background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN HARMONY!' : 'IMBALANCED', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; orbAngle += dt * 1.2;
      yangE = Math.max(0, yangE - DRAIN_RATE * dt); yinE = Math.max(0, yinE - DRAIN_RATE * dt);
      if (getDiff() > BALANCE_THRESHOLD || yangE <= 0 || yinE <= 0) { flash = 0.5; flashCol = C.a; finish(false); return; }
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
