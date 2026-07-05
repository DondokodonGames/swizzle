// 779-number-order.js
// ナンバーオーダー — 画面に散らばる数字を1から順にタップせよ
// 操作: タップ — 数字を昇順にタップ（1→2→3...）
// 成功: 8ラウンド 完走  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#06060e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var NUM_BG = '#161230', NUM_HI = '#5533cc', NUM_NEXT = '#7700ff', NUM_DONE = '#2a3545';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER ORDER';
  var HOW_TO_PLAY = 'TAP THE SCATTERED NUMBERS IN ASCENDING ORDER · 1 THEN 2 THEN 3';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var NUM_R = 72, WAIT_DUR = 0.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var numbers, numCount, nextTarget, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0910');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    numbers = []; nextTarget = 1; numCount = Math.min(9, 6 + Math.floor(score / 2));
    var attempts = 0;
    while (numbers.length < numCount && attempts < 400) {
      attempts++;
      var nx = NUM_R * 1.4 + Math.random() * (W - NUM_R * 2.8), ny = H * 0.24 + Math.random() * (H * 0.60), ok = true;
      for (var i = 0; i < numbers.length; i++) { var dx = nx - numbers[i].x, dy = ny - numbers[i].y; if (Math.sqrt(dx * dx + dy * dy) < NUM_R * 2.2) { ok = false; break; } }
      if (ok) numbers.push({ x: snap(nx), y: snap(ny), num: numbers.length + 1, tapped: false, bounce: 0 });
    }
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (state === S.PLAYING && waitTimer <= 0) txt('NEXT  ' + nextTarget, W / 2, snap(H * 0.20), 52, NUM_NEXT);
    for (var i2 = 0; i2 < numbers.length; i2++) {
      var n2 = numbers[i2], isNext = n2.num === nextTarget && !n2.tapped, isTapped = n2.tapped, r2 = NUM_R * (1.0 + n2.bounce * 0.2);
      if (isNext) pc(n2.x, n2.y, r2 + 18, NUM_NEXT, 0.12 + 0.08 * Math.sin(elapsed * 6));
      pc(n2.x, n2.y, r2, isTapped ? NUM_DONE : (isNext ? NUM_HI : NUM_BG), 0.9);
      if (!isTapped) pc(n2.x, n2.y, r2 * 0.85, isNext ? NUM_HI : NUM_BG, 0.5);
      txt('' + n2.num, n2.x, n2.y + 12, isTapped ? 48 : (isNext ? 68 : 60), isTapped ? '#5a6a7a' : C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0 || nextTarget > numCount) return;
    var hitIdx = -1, bestDist = Infinity;
    for (var i = 0; i < numbers.length; i++) { if (numbers[i].tapped) continue; var dx = tx - numbers[i].x, dy = ty - numbers[i].y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < NUM_R + 20 && dist < bestDist) { bestDist = dist; hitIdx = i; } }
    if (hitIdx < 0) return;
    var n = numbers[hitIdx];
    if (n.num === nextTarget) {
      n.tapped = true; n.bounce = 0.5; nextTarget++; game.audio.play('se_tap', 0.08);
      for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: n.x, y: n.y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.3, col: NUM_NEXT }); }
      if (nextTarget > numCount) {
        score++; flash = 0.22; flashCol = C.b; resultText = 'COMPLETE!'; resultTimer = 0.42; game.audio.play('se_success', 0.65); waitTimer = WAIT_DUR;
        if (score >= NEEDED) { finish(true); return; }
      }
    } else {
      errors++; flash = 0.28; flashCol = C.a; resultText = 'NOT ' + n.num + '! TAP ' + nextTarget; resultTimer = 0.45; game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!numbers) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORDER MASTER!' : 'OUT OF ORDER', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
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
      for (var i = 0; i < numbers.length; i++) if (numbers[i].bounce > 0) numbers[i].bounce -= dt * 4;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 44, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0910');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
