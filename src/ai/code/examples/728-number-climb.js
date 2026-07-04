// 728-number-climb.js
// ナンバークライム — 散らばった数字を1から順にできるだけ速くタップする
// 操作: 光る次の番号（NEXT）を探してタップ。順番を間違えるとミス
// 成功: 5セット クリア  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、数字盤） ──
  var C = { bg:'#020812', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER CLIMB';
  var HOW_TO_PLAY = 'FIND AND TAP THE NUMBERS 1, 2, 3... IN ORDER · WRONG ORDER IS A MISS';
  var MAX_TIME = 24;
  var NEEDED   = 5;          // 修正2: 25 → 5
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var BOX_R = 64, PLAY_X0 = 80, PLAY_Y0 = 320, PLAY_W = W - 160, PLAY_H = H * 0.55;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nums, nextNum, round, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, waitTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030c18');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    round++; var count = Math.min(8, 4 + Math.floor(round / 2)); nums = []; nextNum = 1; var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, nx, ny, tries = 0;
      while (!ok && tries < 200) { tries++; nx = PLAY_X0 + BOX_R + Math.random() * (PLAY_W - BOX_R * 2); ny = PLAY_Y0 + BOX_R + Math.random() * (PLAY_H - BOX_R * 2); ok = true; for (var j = 0; j < placed.length; j++) { var dx = nx - placed[j].x, dy = ny - placed[j].y; if (dx * dx + dy * dy < (BOX_R * 2 + 16) * (BOX_R * 2 + 16)) { ok = false; break; } } }
      placed.push({ x: nx, y: ny, num: i + 1, tapped: false, phase: Math.random() * Math.PI * 2 });
    }
    nums = placed; waitTimer = 0;
  }

  function initGame() { round = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 700 + Math.ceil(timeLeft) * 100) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    txt('NEXT ' + nextNum, W / 2, PLAY_Y0 - 60, 52, C.b);
    for (var ni2 = 0; ni2 < nums.length; ni2++) {
      var n = nums[ni2];
      if (n.tapped) { pc(n.x, n.y, BOX_R, '#0f2b47', 0.4); txt('OK', n.x, n.y + 16, 44, '#0f2b47'); continue; }
      var isNext = n.num === nextNum, pulse = isNext ? (0.85 + 0.15 * Math.sin(elapsed * 6)) : (0.92 + 0.08 * Math.sin(n.phase * 2));
      if (isNext) ring(n.x, n.y, BOX_R + 18, C.b, 0.35);
      pc(n.x, n.y, BOX_R * pulse, isNext ? C.b : '#1e3a5f', 0.9);
      pc(n.x - BOX_R * 0.28, n.y - BOX_R * 0.32, BOX_R * 0.18, C.g, 0.25);
      txt(n.num + '', n.x, n.y + 18, 64, isNext ? C.g : C.e);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0) return;
    var hit = -1;
    for (var i = 0; i < nums.length; i++) { if (nums[i].tapped) continue; var dx = tx - nums[i].x, dy = ty - nums[i].y; if (dx * dx + dy * dy < (BOX_R + 16) * (BOX_R + 16)) { hit = i; break; } }
    if (hit < 0) return;
    if (nums[hit].num === nextNum) {
      nums[hit].tapped = true; nextNum++; game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: nums[hit].x, y: nums[hit].y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.e }); }
      if (nextNum > nums.length) {
        flash = 0.35; flashCol = C.b; resultText = 'CLEAR!'; resultTimer = 0.6; game.audio.play('se_success', 0.6);
        if (round >= NEEDED) { finish(true); return; }
        waitTimer = 0.7;
      }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG ORDER!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nums) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TO THE TOP!' : 'SLIPPED UP', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var ni = 0; ni < nums.length; ni++) if (!nums[ni].tapped) nums[ni].phase += dt * 1.5;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#030c18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
