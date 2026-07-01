// 138-keyhole.js
// 鍵穴 — 回転する鍵を正しい向きでタップして錠前を開ける瞬間の達成感
// 操作: タップで鍵を止める（正しい角度でないとNG）
// 成功: 1つの錠前を開ける  失敗: 4回失敗 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、金庫） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'KEYHOLE';
  var HOW_TO_PLAY = 'TAP WHEN THE KEY LINES UP';
  var MAX_TIME = 15;             // 修正2: 30 → 15
  var NEEDED   = 1;              // 修正2: 5 → 1
  var MAX_MISS = 4;
  var TOLERANCE = 0.35;          // 修正2: 判定を甘めに
  var TOP    = 220;

  var LOCK_X = snap(W / 2), LOCK_Y = snap(H * 0.46), LOCK_R = 200, HOLE_R = 56;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holeAngle, keyAngle, keySpeed, stopped, score, misses, timeLeft, done;
  var feedback, feedbackOk, unlockAnim, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
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
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function angleDiff(a, b) { return Math.abs(((a - b + Math.PI) % (Math.PI * 2)) - Math.PI); }

  function newRound() { holeAngle = Math.random() * Math.PI * 2; stopped = false; }

  function background() { game.draw.clear(C.bg); }

  // ── 錠前＋鍵スプライト（多矩形でキャラクター性） ──
  function drawLock(unlockGlow) {
    var col = unlockGlow > 0 ? C.f : C.a;
    // シャックル（U字）
    game.draw.rect(LOCK_X - 56, LOCK_Y - LOCK_R - 80, 24, 96, col);
    game.draw.rect(LOCK_X + 32, LOCK_Y - LOCK_R - 80, 24, 96, col);
    for (var a = Math.PI; a <= Math.PI * 2; a += 0.2) {
      game.draw.rect(snap(LOCK_X + Math.cos(a) * 44) - 12, snap(LOCK_Y - LOCK_R - 80 + Math.sin(a) * 44) - 12, 24, 24, col);
    }
    // 本体
    pc(LOCK_X, LOCK_Y, LOCK_R, col, 0.9);
    pc(LOCK_X, LOCK_Y, LOCK_R - 20, C.bg, 0.7);
    // 鍵穴（正しい向き）
    pc(LOCK_X + Math.cos(holeAngle) * (LOCK_R - HOLE_R), LOCK_Y + Math.sin(holeAngle) * (LOCK_R - HOLE_R), HOLE_R, C.c, 0.25);
  }

  function drawKey(ang, glow) {
    var kx = LOCK_X + Math.cos(ang) * (LOCK_R - 24);
    var ky = LOCK_Y + Math.sin(ang) * (LOCK_R - 24);
    // シャフト（中心→外周）
    for (var t = 0; t < LOCK_R - 24; t += 8) {
      game.draw.rect(snap(LOCK_X + Math.cos(ang) * t) - 6, snap(LOCK_Y + Math.sin(ang) * t) - 6, 12, 12, glow ? C.f : C.d);
    }
    // 取っ手（リング）
    pc(kx, ky, 28, glow ? C.f : C.d, 1);
    pc(kx, ky, 14, C.bg, 1);
    // 歯
    var px = -Math.sin(ang), py = Math.cos(ang);
    game.draw.rect(snap(LOCK_X + Math.cos(ang) * 60 + px * 20) - 6, snap(LOCK_Y + Math.sin(ang) * 60 + py * 20) - 6, 12, 12, C.d);
  }

  function initGame() {
    keyAngle = 0; keySpeed = 1.8;
    score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false;
    feedback = 0; unlockAnim = 0; particles = [];
    newRound();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || stopped) return;
    stopped = true;
    if (angleDiff(keyAngle, holeAngle) < TOLERANCE) {
      score++; feedbackOk = true; feedback = 0.5; unlockAnim = 0.6;
      game.audio.play('se_success');
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: LOCK_X, y: LOCK_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5 });
      }
      if (score >= NEEDED) { finish(true); return; }
      keySpeed += 0.3;
      setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 650);
    } else {
      misses++; feedbackOk = false; feedback = 0.5;
      game.audio.play('se_failure');
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) stopped = false; }, 600);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      keyAngle += 1.8 * dt;
      drawLock(0); drawKey(keyAngle, false);
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.76, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.d);
        txt('TAP TO START', W / 2, H * 0.90, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'UNLOCKED!' : 'JAMMED', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } if (!stopped) keyAngle += keySpeed * dt; }
    if (feedback > 0) feedback -= dt;
    if (unlockAnim > 0) unlockAnim -= dt;
    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt; particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 300 * dt; particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- 描画 ----
    background();
    drawLock(unlockAnim);
    drawKey(keyAngle, unlockAnim > 0);
    if (!stopped && angleDiff(keyAngle, holeAngle) < TOLERANCE * 1.4 && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      txt('NOW!', LOCK_X, LOCK_Y - LOCK_R - 150, 60, C.f);
    }
    for (var pp = 0; pp < particles.length; pp++) {
      game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.d, particles[pp].life * 2);
    }
    if (feedback > 0) txt(feedbackOk ? 'UNLOCKED!' : 'MISS', W / 2, H * 0.78, 68, feedbackOk ? C.f : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, H - 96, 24, 24, mm < misses ? C.e : '#001133');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
