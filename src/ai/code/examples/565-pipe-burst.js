// 565-pipe-burst.js
// パイプバースト — 6本のパイプの水圧が上昇。破裂寸前のパイプをタップして圧を抜き、耐え抜く
// 操作: 圧の高いパイプをタップして減圧（満タンになると破裂）
// 成功: 12秒 生き残る  失敗: パイプ 3本 破裂

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、配管室） ──
  var C = { bg:'#0a1628', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIPE BURST';
  var HOW_TO_PLAY = 'TAP HIGH-PRESSURE PIPES TO RELEASE · HOLD OUT UNTIL TIME';
  var MAX_TIME = 12;
  var NUM_PIPES = 6, MAX_BURST = 3;   // 修正2: 5 → 3
  var PIPE_W = 120, PIPE_GAP = (W - NUM_PIPES * PIPE_W) / (NUM_PIPES + 1);
  var PIPE_TOP = snap(H * 0.28), PIPE_H = snap(H * 0.42);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pipes, bursts, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1628');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, PIPE_TOP - 40, W, 40, '#334466', 0.9); game.draw.rect(0, PIPE_TOP - 40, W, 8, C.e, 0.5); }

  function initPipes() { pipes = []; for (var i = 0; i < NUM_PIPES; i++) pipes.push({ x: PIPE_GAP + i * (PIPE_W + PIPE_GAP) + PIPE_W / 2, pressure: Math.random() * 0.3, fillRate: 0.05 + Math.random() * 0.09, cracked: false, burstTimer: 0 }); }

  function initGame() { bursts = 0; timeLeft = MAX_TIME; done = false; particles = []; initPipes(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(MAX_TIME) * 400 + (MAX_BURST - bursts) * 800) : (MAX_TIME - Math.ceil(timeLeft)) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function release(idx) {
    if (pipes[idx].pressure > 0) {
      pipes[idx].pressure = Math.max(0, pipes[idx].pressure - 0.5); pipes[idx].cracked = false; game.audio.play('se_tap', 0.3);
      for (var pi = 0; pi < 6; pi++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; particles.push({ x: pipes[idx].x, y: PIPE_TOP, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.e }); }
    }
  }

  function drawScene() {
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i], px = p.x - PIPE_W / 2, bot = PIPE_TOP + PIPE_H;
      game.draw.rect(px, PIPE_TOP, PIPE_W, PIPE_H, '#334466', 0.9); game.draw.rect(px + 8, PIPE_TOP, 12, PIPE_H, C.e, 0.3);
      if (p.burstTimer > 0) { var bt = p.burstTimer / 1.2; game.draw.rect(px - 20, PIPE_TOP, PIPE_W + 40, PIPE_H, C.f, bt * 0.3); txt('BURST!', p.x, PIPE_TOP + PIPE_H / 2, 40, C.f); continue; }
      var wh = PIPE_H * p.pressure, wy = bot - wh, col = p.pressure > 0.8 ? C.a : p.pressure > 0.5 ? C.c : C.d;
      game.draw.rect(px + 4, wy, PIPE_W - 8, wh, col, 0.85);
      if (wh > 10) game.draw.rect(px + 4, wy, PIPE_W - 8, 8, C.g, 0.4 + Math.sin(game.time.elapsed * 8 + i) * 0.2);
      if (p.cracked) { game.draw.line(px + PIPE_W * 0.3, PIPE_TOP + 20, px + PIPE_W * 0.7, PIPE_TOP + 80, C.a, 4); game.draw.line(px + PIPE_W * 0.5, PIPE_TOP + 40, px + PIPE_W * 0.8, PIPE_TOP + 120, C.a, 3); }
      game.draw.rect(px, bot + 20, PIPE_W, 24, '#374151', 0.6); game.draw.rect(px, bot + 20, PIPE_W * p.pressure, 24, col, 0.9);
      txt('TAP', p.x, bot + 100, 28, col);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < pipes.length; i++) if (Math.abs(tx - pipes[i].x) < PIPE_W * 0.7) { release(i); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pipes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HELD THE LINE!' : 'FLOODED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(bursts < MAX_BURST); return; }
      for (var i = 0; i < pipes.length; i++) {
        var p = pipes[i];
        if (p.burstTimer > 0) { p.burstTimer -= dt; if (p.burstTimer <= 0) { p.pressure = 0; p.cracked = false; p.fillRate = 0.05 + Math.random() * 0.1; } continue; }
        p.pressure += p.fillRate * dt;
        if (p.pressure >= 0.8 && !p.cracked) { p.cracked = true; game.audio.play('se_failure', 0.2); }
        if (p.pressure >= 1) { p.pressure = 1; p.burstTimer = 1.2; bursts++; game.audio.play('se_failure', 0.6); for (var bi = 0; bi < 14; bi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: p.x, y: PIPE_TOP, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 200, life: 0.6, col: C.d }); } if (bursts >= MAX_BURST) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var pr = particles[pp]; pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.vy += 600 * dt; pr.life -= dt * 2; if (pr.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    txt('BURSTS ' + bursts + ' / ' + MAX_BURST, W / 2, 168, 46, bursts > 1 ? C.a : C.b);
    for (var bi2 = 0; bi2 < MAX_BURST; bi2++) game.draw.rect(snap(W / 2 + (bi2 - (MAX_BURST - 1) / 2) * 56) - 10, 224, 20, 20, bi2 < bursts ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
