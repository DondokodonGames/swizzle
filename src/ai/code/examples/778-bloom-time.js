// 778-bloom-time.js
// ブルームタイム — 花が満開になった瞬間にタップせよ。枯れる前に
// 操作: タップ — 花が「満開（FULL BLOOM）」状態の瞬間
// 成功: 10回 成功  失敗: 3回 ミス or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、花色は保持） ──
  var C = { bg:'#030a04', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var STEM = '#1a8040', STEM_HI = '#44e070', LEAF = '#16a34a', WILT = '#a1560e', CENTER = '#ffe020', PETAL_HI = '#fff3c0';
  var PETALS = ['#ff5fb0', '#ff5570', '#ffb020'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BLOOM TIME';
  var HOW_TO_PLAY = 'TAP THE INSTANT THE FLOWER IS IN FULL BLOOM · BEFORE IT WILTS';
  var MAX_TIME = 26;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.44), STEM_LEN = snap(H * 0.28), WAIT_DUR = 0.5;
  var BLOOM_LO = 0.88, BLOOM_HI = 1.12;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bloom, growSpeed, wiltSpeed, growing, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#060e06');
  }

  function background() { game.draw.clear(C.bg); }

  function drawFlower(cx, cy, bloomAmount) {
    var r = Math.min(1.0, bloomAmount), wiltR = Math.max(0, bloomAmount - 1.0), petalR = 62 * r, petalCount = 6;
    var fade = wiltR > 0 ? (1 - wiltR * 0.8) : 1.0, col = wiltR > 0.3 ? WILT : PETALS[Math.floor(elapsed) % PETALS.length], petalSz = petalR * (1 - wiltR * 0.5);
    for (var pi = 0; pi < petalCount; pi++) { var pa = pi * Math.PI * 2 / petalCount + elapsed * 0.3; pc(cx + Math.cos(pa) * petalSz * 0.7, cy + Math.sin(pa) * petalSz * 0.7, petalSz * 0.55, col, 0.85 * fade); }
    for (var pi2 = 0; pi2 < petalCount; pi2++) { var pa2 = pi2 * Math.PI * 2 / petalCount + Math.PI / petalCount + elapsed * 0.3; pc(cx + Math.cos(pa2) * petalSz * 0.7, cy + Math.sin(pa2) * petalSz * 0.7, petalSz * 0.4, PETAL_HI, 0.5 * fade); }
    pc(cx, cy, petalSz * 0.35, CENTER, 0.9 * fade); pc(cx, cy, petalSz * 0.15, C.g, 0.7 * fade);
  }

  function drawScene() {
    var inBloom = bloom >= BLOOM_LO && bloom <= BLOOM_HI;
    game.draw.rect(0, CY + STEM_LEN, W, H - (CY + STEM_LEN), '#0a1a0a', 0.9); game.draw.rect(0, CY + STEM_LEN, W, 12, LEAF, 0.4);
    game.draw.line(CX, CY, CX, CY + STEM_LEN, STEM, 16); game.draw.line(CX, CY, CX, CY + STEM_LEN, STEM_HI, 4);
    if (bloom > 0.2) { var leafR = Math.min(1, bloom) * 60; pc(CX - leafR, CY + STEM_LEN * 0.55, leafR * 0.7, LEAF, 0.8); }
    var bloomPct = Math.min(1, bloom / BLOOM_HI);
    game.draw.rect(snap(W * 0.08), snap(H * 0.75), snap(W * 0.84), 18, '#0a1a0a', 0.8); game.draw.rect(snap(W * 0.08), snap(H * 0.75), snap(W * 0.84 * bloomPct), 18, inBloom ? C.b : (bloom > 1 ? WILT : STEM_HI), 0.85);
    game.draw.rect(snap(W * 0.08 + W * 0.84 * (BLOOM_LO / BLOOM_HI)) - 3, snap(H * 0.75) - 4, 6, 26, C.b, 0.8); game.draw.rect(snap(W * 0.08 + W * 0.84) - 3, snap(H * 0.75) - 4, 6, 26, C.a, 0.7);
    txt('BUD', snap(W * 0.08), snap(H * 0.72), 24, STEM_HI, 'left'); txt('BLOOM', W / 2, snap(H * 0.815), 26, C.b); txt('WILT', snap(W * 0.92), snap(H * 0.72), 24, WILT, 'right');
    drawFlower(CX, CY, bloom);
    if (state === S.PLAYING && growing) {
      if (inBloom) { var pulse = 1.0 + 0.06 * Math.sin(elapsed * 15); txt('TAP NOW!', W / 2, snap(H * 0.22), Math.floor(64 * pulse), PETAL_HI); }
      else if (bloom < BLOOM_LO) txt('ALMOST THERE...', W / 2, snap(H * 0.22), 40, C.g);
      else txt('IT IS WILTING!', W / 2, snap(H * 0.22), 44, WILT);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0 || !growing) return;
    var inBloom = bloom >= BLOOM_LO && bloom <= BLOOM_HI;
    if (inBloom) {
      score++; growing = false; flash = 0.24; flashCol = C.b; resultText = 'FULL BLOOM!'; resultTimer = 0.42; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 160; particles.push({ x: CX + Math.cos(pa) * 60, y: CY + Math.sin(pa) * 60, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 40, life: 0.45, col: PETALS[p % PETALS.length] }); }
      waitTimer = WAIT_DUR;
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; growing = false; flash = 0.3; flashCol = C.a; resultText = bloom < BLOOM_LO ? 'STILL A BUD!' : 'TOO LATE!'; resultTimer = 0.42; game.audio.play('se_failure', 0.28); waitTimer = WAIT_DUR;
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  function initGame() { bloom = 0; growSpeed = 0.6; wiltSpeed = 0.9; growing = true; waitTimer = 0; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; }

  function nextFlower() { bloom = 0; growSpeed = Math.min(1.2, 0.6 + score * 0.03); wiltSpeed = Math.min(1.8, 0.9 + score * 0.03); growing = true; waitTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bloom === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GREEN THUMB!' : 'WITHERED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) nextFlower(); }
      else if (growing) {
        if (bloom < BLOOM_HI) bloom += growSpeed * dt;
        else { bloom += wiltSpeed * dt; if (bloom > 2.5) { errors++; growing = false; flash = 0.3; flashCol = C.a; resultText = 'WILTED!'; resultTimer = 0.45; game.audio.play('se_failure', 0.24); waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } } }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 350 * dt; p.life -= dt * 2.4; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060e06');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
