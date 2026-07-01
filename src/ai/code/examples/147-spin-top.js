// 147-spin-top.js
// コマ回し — コマが倒れる前にタップして回転力を補充するバランスゲーム
// 操作: タップでスピン加速
// 成功: 8秒間コマを倒さない  失敗: コマが倒れる(スピンゼロ)

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、遊技場） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIN TOP';
  var HOW_TO_PLAY = 'TAP TO KEEP THE TOP SPINNING';
  var TARGET_TIME = 8;           // 修正2: 30 → 8（サバイバル短縮）
  var MAX_TIME = 15;
  var TOP    = 220;
  var TOP_X = snap(W / 2), TOP_Y = snap(H * 0.52), FLOOR_Y = snap(H * 0.66);
  var DECAY_BASE = 0.05;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var spin, survived, timeLeft, done, particles, ringPulse, wobbleA;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil((TARGET_TIME - survived) / TARGET_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.d, 0.4);
    game.draw.rect(0, FLOOR_Y, W, 8, C.a);
  }

  // ── コマスプライト（多矩形・傾く円錐） ──
  function drawTop() {
    var lean = wobbleA;
    var lx = Math.sin(lean) * 40;
    // 影
    game.draw.rect(snap(TOP_X) - snap(70 * (0.5 + spin * 0.5)), FLOOR_Y + 4, snap(140 * (0.5 + spin * 0.5)), 8, '#000000', 0.4);
    // スピンリング
    for (var a = 0; a < Math.PI * 2; a += 0.25) {
      game.draw.rect(snap(TOP_X + Math.cos(a) * (130 + ringPulse * 40)) - 4, snap(TOP_Y + Math.sin(a) * (130 + ringPulse * 40)) - 4, 8, 8, C.e, (0.3 + spin * 0.4));
    }
    // 円錐本体（上広→下尖り、8pxブロック）
    for (var yy = -100; yy <= 100; yy += 8) {
      var t = (yy + 100) / 200;
      var hw = snap(80 * (1 - t));
      var col = Math.floor((yy + 100) / 16) % 2 === 0 ? C.d : C.a;
      game.draw.rect(snap(TOP_X + lx * t) - hw, snap(TOP_Y + yy), hw * 2, 8, col, 1);
    }
    // 上部ディスク＋回転模様
    pc(TOP_X + lx * 0, TOP_Y - 100, 80, C.d, 0.9);
    pc(TOP_X, TOP_Y - 100, 60, C.a, 0.9);
    for (var sp = 0; sp < 4; sp++) {
      var pa = game.time.elapsed * spin * 8 + sp * Math.PI / 2;
      game.draw.rect(snap(TOP_X + Math.cos(pa) * 40) - 8, snap(TOP_Y - 100 + Math.sin(pa) * 24) - 8, 16, 16, C.c, 0.9);
    }
    // 軸（尖り）
    game.draw.rect(snap(TOP_X + lx) - 6, TOP_Y + 100, 12, 24, C.g);
  }

  function initGame() {
    spin = 0.9; survived = 0; timeLeft = MAX_TIME; done = false;
    particles = []; ringPulse = 0; wobbleA = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (400 + Math.round(spin * 100) * 3 + Math.ceil(timeLeft) * 20) : Math.round(survived * 60);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    spin = Math.min(1.0, spin + 0.35); ringPulse = 0.4;
    game.audio.play('se_tap', 0.5);
    for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: TOP_X, y: TOP_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.35 }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      spin = 0.85; wobbleA = Math.sin(game.time.elapsed * 2) * 0.1;
      background(); drawTop();
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STILL SPINNING!' : 'TOPPLED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (survived >= TARGET_TIME) { finish(true); return; }
      spin -= DECAY_BASE * (1 + (1 - spin) * 2.5) * dt;
      if (spin <= 0) { spin = 0; finish(false); return; }
      wobbleA = Math.sin(game.time.elapsed * (3 + (1 - spin) * 4)) * (1 - spin) * 0.4;
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 500 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (ringPulse > 0) ringPulse -= dt;

    // ---- 描画 ----
    background(); drawTop();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.c, particles[pp].life * 2.5);

    // スピンゲージ
    var col = spin > 0.5 ? C.b : (spin > 0.25 ? C.c : C.e);
    game.draw.rect(snap(W * 0.1), H - 120, snap(W * 0.8), 28, '#2a0a3a');
    game.draw.rect(snap(W * 0.1), H - 120, snap(W * 0.8 * spin), 28, col, 0.9);
    txt('SPIN', W / 2, H - 150, 36, col);
    if (spin < 0.4 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('TAP FAST!', W / 2, H * 0.14, 52, C.e);

    timeBar();
    txt(Math.ceil(TARGET_TIME - survived) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
