// 183-rope-cut.js
// ロープカット — 揺れるボムのロープを切って、狙いのゴールに届かせる
// 操作: 揺れるボムをタップしてロープを切る
// 成功: 1個のボムをゴールに届ける  失敗: 7個外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕掛け部屋） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROPE CUT';
  var HOW_TO_PLAY = 'TAP THE SWINGING BOMB TO CUT THE ROPE';
  var MAX_TIME = 15;             // 修正2: 50 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_MISS = 7;
  var GOAL_X = snap(W / 2), GOAL_Y = snap(H * 0.74), GOAL_R = 90;
  var ANCHOR_X = snap(W / 2), ANCHOR_Y = snap(260), ROPE_LEN = 360;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rope, score, misses, timeLeft, done, feedback, feedbackOk, particles;

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
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawGoal() {
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    pc(GOAL_X, GOAL_Y, GOAL_R, C.b, on ? 0.4 : 0.25);
    pc(GOAL_X, GOAL_Y, GOAL_R - 24, C.b, 0.7);
    txt('IN', GOAL_X, GOAL_Y - 8, 44, C.g);
  }

  function drawBomb(r) {
    if (!r.falling) { pl(r.anchorX, r.anchorY, r.bx, r.by, C.f, 8); pc(r.anchorX, r.anchorY, 14, C.f, 1); }
    pc(r.bx, r.by, 40, '#222222', 1);
    pc(r.bx - 12, r.by - 12, 8, C.g, 0.6);
    var spark = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(snap(r.bx) - 4, snap(r.by) - 56, 8, 20, C.f);
    game.draw.rect(snap(r.bx) - 6, snap(r.by) - 62, 12, 12, spark ? C.c : C.a);
  }

  function resetBomb() {
    rope = { anchorX: ANCHOR_X, anchorY: ANCHOR_Y, len: ROPE_LEN, angle: (Math.random() - 0.5) * Math.PI * 0.5, avel: (Math.random() > 0.5 ? 1 : -1) * (1.4 + Math.random()), cut: false, bx: ANCHOR_X, by: ANCHOR_Y + ROPE_LEN, falling: false, vx: 0, vy: 0 };
  }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; particles = [];
    resetBomb();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function cut() {
    if (rope.falling || rope.cut) return;
    rope.cut = true; rope.falling = true; rope.vx = rope.avel * rope.len * 0.3; rope.vy = 0;
    game.audio.play('se_tap', 0.7);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || rope.falling) return;
    if (Math.hypot(x - rope.bx, y - rope.by) < 90) cut();
  });

  game.onSwipe(function() { if (state === S.PLAYING && !done && !rope.falling) cut(); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGoal();
      rope = rope || { anchorX: ANCHOR_X, anchorY: ANCHOR_Y, len: ROPE_LEN, falling: false };
      rope.bx = ANCHOR_X + Math.sin(game.time.elapsed) * 180; rope.by = ANCHOR_Y + Math.cos(Math.sin(game.time.elapsed)) * ROPE_LEN;
      drawBomb(rope);
      txt(GAME_TITLE, W / 2, H * 0.50, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.58, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON TARGET!' : 'GAME OVER', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (!rope.falling) {
        rope.avel += (-9.8 * 3.5 / rope.len) * Math.sin(rope.angle) * dt; rope.avel *= 0.995; rope.angle += rope.avel * dt;
        rope.bx = rope.anchorX + Math.sin(rope.angle) * rope.len; rope.by = rope.anchorY + Math.cos(rope.angle) * rope.len;
      } else {
        rope.vy += 1200 * dt; rope.bx += rope.vx * dt; rope.by += rope.vy * dt;
        if (Math.hypot(rope.bx - GOAL_X, rope.by - GOAL_Y) < GOAL_R + 30) {
          score++; feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 10; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: GOAL_X, y: GOAL_Y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5 }); }
          if (score >= NEEDED) { finish(true); return; }
          resetBomb();
        } else if (rope.by > H + 50 || rope.bx < -50 || rope.bx > W + 50) {
          misses++; feedbackOk = false; feedback = 0.4;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS) { finish(false); return; }
          resetBomb();
        }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background(); drawGoal(); drawBomb(rope);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 44);
      game.draw.rect(mx - 8, 208, 16, 16, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
