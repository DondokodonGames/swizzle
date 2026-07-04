// 718-pop-sequence.js
// ポップシーケンス — 隠れた番号を推理し、小さい順にバブルを弾けさせる
// 操作: バブルをタップすると番号が一瞬見える。1から順に正しく弾く。順番違いはミス
// 成功: 5ラウンド クリア  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、バブル） ──
  var C = { bg:'#04020e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUBBLE = '#7700ff', BUBBLE_HI = '#a855f7', BUBBLE_REV = '#ddd6fe';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'POP SEQUENCE';
  var HOW_TO_PLAY = 'TAP A BUBBLE TO PEEK ITS NUMBER · POP THEM IN ORDER FROM 1 UP';
  var MAX_TIME = 28;
  var NEEDED   = 5;          // 修正2: 20 → 5
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var BUBBLE_R = 70, PLAY_X0 = 80, PLAY_Y0 = 320, PLAY_W = W - 160, PLAY_H = H * 0.55;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, nextNum, revealTimer, round, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, waitTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080416');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    round++; var count = Math.min(5, 3 + Math.floor(round / 2)); bubbles = []; revealTimer = []; nextNum = 1; var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, bx, by, tries = 0;
      while (!ok && tries < 200) { tries++; bx = PLAY_X0 + BUBBLE_R + Math.random() * (PLAY_W - BUBBLE_R * 2); by = PLAY_Y0 + BUBBLE_R + Math.random() * (PLAY_H - BUBBLE_R * 2); ok = true; for (var j = 0; j < placed.length; j++) { var dx = bx - placed[j].x, dy = by - placed[j].y; if (dx * dx + dy * dy < (BUBBLE_R * 2 + 20) * (BUBBLE_R * 2 + 20)) { ok = false; break; } } }
      placed.push({ x: bx, y: by, num: i + 1, revealed: false, phase: Math.random() * Math.PI * 2 }); revealTimer.push(0);
    }
    bubbles = placed; waitTimer = 0;
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
    txt('TAP SMALLEST FIRST', W / 2, PLAY_Y0 - 60, 40, '#ffffff44');
    txt('NEXT ' + nextNum, W / 2, PLAY_Y0 - 120, 48, C.b);
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi];
      if (b.revealed) { ring(b.x, b.y, BUBBLE_R + 12, C.b, 0.2); continue; }
      var pulse = 0.88 + 0.12 * Math.sin(b.phase * 2.5), isRevealed = revealTimer[bi] > 0;
      pc(b.x, b.y, BUBBLE_R * pulse, isRevealed ? BUBBLE_REV : BUBBLE, 0.9);
      pc(b.x - BUBBLE_R * 0.3, b.y - BUBBLE_R * 0.35, BUBBLE_R * 0.2, C.g, 0.3);
      if (isRevealed) txt(b.num + '', b.x, b.y + 18, 72, BUBBLE);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0) return;
    var hit = -1;
    for (var i = 0; i < bubbles.length; i++) { if (bubbles[i].revealed) continue; var dx = tx - bubbles[i].x, dy = ty - bubbles[i].y; if (dx * dx + dy * dy < (BUBBLE_R + 20) * (BUBBLE_R + 20)) { hit = i; break; } }
    if (hit < 0) return;
    var b = bubbles[hit]; revealTimer[hit] = 0.5;
    if (b.num === nextNum) {
      b.revealed = true; nextNum++; game.audio.play('se_tap', 0.13);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: BUBBLE_HI }); }
      if (nextNum > bubbles.length) {
        flash = 0.35; flashCol = C.b; resultText = 'CLEAR!'; resultTimer = 0.6; game.audio.play('se_success', 0.65);
        if (round >= NEEDED) { finish(true); return; }
        waitTimer = 0.8;
      }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG ORDER!'; resultTimer = 0.6; game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEDUCED IT!' : 'GUESSED WRONG', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var i = 0; i < revealTimer.length; i++) if (revealTimer[i] > 0) revealTimer[i] -= dt * 2;
      for (var i2 = 0; i2 < bubbles.length; i2++) if (!bubbles[i2].revealed) bubbles[i2].phase += dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080416');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
