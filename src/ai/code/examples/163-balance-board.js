// 163-balance-board.js
// バランスボード — 傾くシーソーの上でキャラクターのバランスを保ち続ける感覚
// 操作: タップ左右でキャラクターを移動させる
// 成功: 6秒バランスを保つ  失敗: 傾きが60度を超える

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、体操場） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE BOARD';
  var HOW_TO_PLAY = 'TAP LEFT/RIGHT TO KEEP BALANCE';
  var NEEDED   = 6;              // 修正2: 25 → 6（サバイバル短縮）
  var PIVOT_X = snap(W / 2), PIVOT_Y = snap(H * 0.54), BOARD_LEN = 460;
  var MAX_ANGLE = Math.PI / 3, GRAVITY_TORQUE = 4.2, ANGLE_FRICTION = 0.94;   // 修正2: トルク弱め

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, angleVel, charPos, charTarget, survived, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) { var t = i / steps; game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 1); }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawScene() {
    var cos = Math.cos(angle), sin = Math.sin(angle);
    var bx1 = PIVOT_X - BOARD_LEN * cos, by1 = PIVOT_Y - BOARD_LEN * sin;
    var bx2 = PIVOT_X + BOARD_LEN * cos, by2 = PIVOT_Y + BOARD_LEN * sin;
    // 支柱（三角）
    pl(PIVOT_X, PIVOT_Y, PIVOT_X - 44, PIVOT_Y + 130, C.d, 18);
    pl(PIVOT_X, PIVOT_Y, PIVOT_X + 44, PIVOT_Y + 130, C.d, 18);
    game.draw.rect(PIVOT_X - 70, PIVOT_Y + 122, 140, 16, C.d);
    // ボード
    pl(bx1, by1, bx2, by2, C.e, 24);
    pl(bx1, by1, bx2, by2, C.g, 6);
    pc(bx1, by1, 18, C.b, 0.9); pc(bx2, by2, 18, C.b, 0.9);
    pc(PIVOT_X, PIVOT_Y, 22, C.c, 1);
    // キャラ（多矩形）
    var cx = PIVOT_X + charPos * BOARD_LEN * cos, cy = PIVOT_Y + charPos * BOARD_LEN * sin - 36;
    var danger = Math.abs(angle) > MAX_ANGLE * 0.6;
    var col = danger ? C.a : C.c;
    pc(cx, cy - 40, 22, col, 1);                    // 頭
    game.draw.rect(cx - 16, cy - 16, 32, 44, col);  // 胴
    pl(cx - 50, cy - 8, cx + 50, cy - 8, col, 8);   // バランス腕
    game.draw.rect(cx - 14, cy + 28, 12, 24, col);  // 脚
    game.draw.rect(cx + 2, cy + 28, 12, 24, col);
  }

  function initGame() {
    angle = 0; angleVel = 0; charPos = 0; charTarget = 0;
    survived = 0; timeLeft = NEEDED; done = false; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 40) : Math.round(survived * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    charTarget = x < W / 2 ? Math.max(-0.85, charTarget - 0.25) : Math.min(0.85, charTarget + 0.25);
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') charTarget = Math.max(-0.85, charTarget - 0.35);
    else if (dir === 'right') charTarget = Math.min(0.85, charTarget + 0.35);
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      angle = Math.sin(game.time.elapsed) * 0.2; charPos = Math.sin(game.time.elapsed) * 0.3;
      drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.80, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BALANCED!' : 'TOPPLED', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      var diff = charTarget - charPos, mv = 1.4 * dt;
      charPos = Math.abs(diff) < mv ? charTarget : charPos + (diff > 0 ? mv : -mv);
      var wind = Math.sin(survived * 0.7) * 0.3 + (Math.random() - 0.5) * 0.25;
      angleVel += (charPos * GRAVITY_TORQUE + wind) * dt;
      angleVel *= Math.pow(ANGLE_FRICTION, dt * 60);
      angle += angleVel * dt;
      if (Math.abs(angle) >= MAX_ANGLE) {
        for (var pi = 0; pi < 16; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: PIVOT_Y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 - 100, life: 0.7 }); }
        finish(false); return;
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 500 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    drawScene();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 6, snap(particles[pp].y) - 6, 12, 12, C.a, particles[pp].life);

    // 傾きメーター
    var ratio = Math.abs(angle) / MAX_ANGLE;
    var mcol = ratio < 0.5 ? C.b : (ratio < 0.75 ? C.c : C.a);
    game.draw.rect(W / 2 - 180, H - 130, 360, 24, '#2a0a3a');
    var off = snap((angle / MAX_ANGLE) * 180);
    game.draw.rect(W / 2 + Math.min(0, off), H - 130, Math.abs(off), 24, mcol, 0.9);
    game.draw.rect(W / 2 - 4, H - 138, 8, 40, C.g);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
