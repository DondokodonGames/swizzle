// 769-neon-type.js
// ネオンタイプ — 流れるネオン文字の「ターゲット文字」が中央ゾーンに入る瞬間をタップせよ
// 操作: タップ — ターゲット文字が中央ゾーンに入った瞬間
// 成功: 12回 ヒット  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、サイン） ──
  var C = { bg:'#020208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  var CHAR_COLORS = [C.f, C.d, C.b, C.a, C.f, C.d, C.b, C.a, C.f, C.d];
  var ZONE = '#ffe600', ZONE_LO = '#3d2e00';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON TYPE';
  var HOW_TO_PLAY = 'TAP WHEN THE TARGET LETTER SLIDES INTO THE CENTER ZONE';
  var MAX_TIME = 24;
  var NEEDED   = 12;         // 修正2: 35 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var WAIT_DUR = 0.3;
  var ZONE_X = W / 2, ZONE_W = 96, CHAR_Y = snap(H * 0.44), CHAR_SIZE = 160, CHAR_GAP = 210;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetChar, chars, answered, waitTimer, scrollSpeed, score, errors, done, timeLeft, elapsed, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'down') game.draw.rect(cx - w / 2, cy + i - size / 2, w, st, color, 0.95); else game.draw.rect(cx - w / 2, cy - i + size / 2 - st, w, st, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#060610');
  }

  function background() { game.draw.clear(C.bg); for (var gi = 0; gi < 8; gi++) game.draw.rect(0, snap(H * 0.1 + gi * H * 0.1), W, 2, C.d, 0.14); }

  function pickTarget() { return CHARS[Math.floor(Math.random() * CHARS.length)]; }

  function resetScroll() {
    chars = []; targetChar = pickTarget();
    var count = 6 + Math.floor(Math.random() * 3), targetPos = 1 + Math.floor(Math.random() * (count - 2));
    for (var i = 0; i < count; i++) {
      var ch, ci;
      if (i === targetPos) { ch = targetChar; ci = CHARS.indexOf(targetChar) % CHAR_COLORS.length; }
      else { do { ci = Math.floor(Math.random() * CHARS.length); ch = CHARS[ci]; } while (ch === targetChar); }
      chars.push({ x: W + i * CHAR_GAP, char: ch, colorIdx: ci, active: ch === targetChar });
    }
    answered = false; scrollSpeed = Math.min(440, 260 + score * 8);
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; waitTimer = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; resetScroll(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(ZONE_X - ZONE_W / 2 - 4, snap(H * 0.25), ZONE_W + 8, snap(H * 0.38), ZONE_LO, 0.9);
    game.draw.rect(ZONE_X - ZONE_W / 2 - 4, snap(H * 0.25), 8, snap(H * 0.38), ZONE, 0.7); game.draw.rect(ZONE_X + ZONE_W / 2 - 4, snap(H * 0.25), 8, snap(H * 0.38), ZONE, 0.7);
    arrow(ZONE_X, snap(H * 0.28), 40, 'down', ZONE); arrow(ZONE_X, snap(H * 0.61), 40, 'up', ZONE);
    for (var ci3 = 0; ci3 < chars.length; ci3++) {
      var c = chars[ci3], inZone = Math.abs(c.x - ZONE_X) < ZONE_W / 2, col = CHAR_COLORS[c.colorIdx], sz = inZone ? CHAR_SIZE * 1.1 : CHAR_SIZE;
      if (inZone && c.active) txt(c.char, c.x, CHAR_Y, sz + 24, col);
      txt(c.char, c.x, CHAR_Y, sz, col);
      if (c.active) game.draw.rect(snap(c.x) - 28, CHAR_Y + 60, 56, 8, col, 0.7);
    }
    txt('TARGET', W / 2, snap(H * 0.72), 36, C.g);
    txt(targetChar, W / 2, snap(H * 0.80), 120, ZONE);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    var inZoneTarget = false, inZoneOther = false;
    for (var ci = 0; ci < chars.length; ci++) { var c = chars[ci]; if (Math.abs(c.x - ZONE_X) < ZONE_W / 2) { if (c.active) inZoneTarget = true; else inZoneOther = true; } }
    answered = true;
    if (inZoneTarget) {
      score++; flash = 0.2; flashCol = C.b; resultText = targetChar + ' HIT!'; resultTimer = 0.38; game.audio.play('se_success', 0.6);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = inZoneOther ? 'NOT ' + targetChar + '!' : 'EMPTY!'; resultTimer = 0.42; game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!chars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NEON MASTER!' : 'SIGNAL LOST', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) resetScroll(); }
      else {
        for (var ci = 0; ci < chars.length; ci++) chars[ci].x -= scrollSpeed * dt;
        if (!answered) {
          var targetPassed = true;
          for (var ci2 = 0; ci2 < chars.length; ci2++) if (chars[ci2].active && chars[ci2].x + ZONE_W / 2 > 0) targetPassed = false;
          if (targetPassed) { errors++; flash = 0.3; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.42; game.audio.play('se_failure', 0.24); answered = true; waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } }
        }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.17), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060610');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
