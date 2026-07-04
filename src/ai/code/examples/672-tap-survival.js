// 672-tap-survival.js
// タップサバイバル — 生命コアが減り続ける。タップで回復しながら制限時間を耐え抜く
// 操作: タップで生命力を回復。時間経過で減少速度が上がる。0になる前に生き残れ
// 成功: 12秒 生存  失敗: 生命力が0

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、生命維持） ──
  var C = { bg:'#080002', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TAP SURVIVAL';
  var HOW_TO_PLAY = 'TAP TO REFILL THE LIFE CORE · IT DRAINS FASTER OVER TIME · DO NOT HIT ZERO';
  var MAX_TIME = 12;         // 修正2: 30 → 12
  var DRAIN_BASE = 18, RESTORE = 14;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var life, gameElapsed, timeLeft, done, particles, heartbeat, tapFlash, tapCount;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0c0003');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { life = 80; gameElapsed = 0; timeLeft = MAX_TIME; done = false; particles = []; heartbeat = 0; tapFlash = 0; tapCount = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (MAX_TIME * 500 + tapCount * 20 + Math.floor(life) * 30) : tapCount * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var lr = life / 100, col = lr > 0.5 ? C.b : lr > 0.25 ? C.c : C.a, pulse = (Math.sin(heartbeat * Math.PI) + 1) * 0.5;
    ring(W / 2, snap(H * 0.46), 200 + pulse * 80, col, pulse * 0.15);
    var coreR = 100 + pulse * 20 + (1 - lr) * 60;
    pc(W / 2, snap(H * 0.46), coreR, col, 0.85); pc(W / 2 - coreR * 0.3, H * 0.46 - coreR * 0.3, coreR * 0.22, C.g, 0.4);
    txt(Math.floor(life) + '%', W / 2, snap(H * 0.46) + 20, 72, C.g);
    if (lr < 0.25) game.draw.rect(0, 0, W, H, C.a, ((Math.sin(gameElapsed * 8) + 1) * 0.5) * 0.08);
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, C.b, tapFlash * 0.08);
    game.draw.rect(60, snap(H * 0.72), W - 120, 36, '#0c0003', 0.8); game.draw.rect(60, snap(H * 0.72), (W - 120) * lr, 36, col, 0.85);
    txt('TAP TO SURVIVE', W / 2, snap(H * 0.80), 48, col);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    life = Math.min(100, life + RESTORE); tapCount++; tapFlash = 0.15; game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.3, col: C.b }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (life === undefined) initGame(); heartbeat += dt * 2; background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'FLATLINED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      life -= (DRAIN_BASE + gameElapsed * 1.2) * dt;
      if (life <= 0) { life = 0; finish(false); return; }
      if (timeLeft <= 0) { finish(true); return; }
      if (tapFlash > 0) tapFlash -= dt * 6;
      heartbeat += dt * (2 + (1 - life / 100) * 4);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
