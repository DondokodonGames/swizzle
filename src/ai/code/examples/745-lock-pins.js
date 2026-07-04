// 745-lock-pins.js
// ロックピン — 上下する4本のピンが全て同時にグリーンゾーンに揃った瞬間にタップして解錠する
// 操作: 全ピンがゾーン内に重なった瞬間タップ。1本でも外れているとミス。解錠ごとに速くなる
// 成功: 8回 解錠  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、錠前） ──
  var C = { bg:'#08080f', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PIN = '#64748b', PIN_IN = '#00ff41';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LOCK PINS';
  var HOW_TO_PLAY = 'TAP THE MOMENT ALL FOUR PINS LINE UP INSIDE THE GREEN ZONE';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var PIN_COUNT = 4, PIN_W = 60, PIN_H = 320, PIN_GAP = 140;
  var PIN_START = W / 2 - (PIN_COUNT - 1) * PIN_GAP / 2, TRACK_Y = snap(H * 0.38), ZONE_H = 70, ZONE_Y = snap(H * 0.38 + PIN_H * 0.35);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pins, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, lockAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0c0c18');
  }

  function background() { game.draw.clear(C.bg); }

  function allInZone() { for (var i = 0; i < pins.length; i++) if (Math.abs(TRACK_Y + pins[i].y - ZONE_Y) > ZONE_H / 2) return false; return true; }

  function initGame() { pins = []; for (var i = 0; i < PIN_COUNT; i++) pins.push({ y: Math.random() * PIN_H, speed: 160 + Math.random() * 100, dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * Math.PI * 2 }); score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lockAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var allIn = allInZone();
    game.draw.rect(W / 2 - 240, TRACK_Y - 40, 480, PIN_H + 80, '#0d0d1c', 0.8);
    game.draw.rect(0, ZONE_Y - ZONE_H / 2, W, ZONE_H, allIn ? C.b : '#14532d', allIn ? 0.2 : 0.12);
    game.draw.line(0, ZONE_Y - ZONE_H / 2, W, ZONE_Y - ZONE_H / 2, allIn ? C.b : '#1a5c2a', 2); game.draw.line(0, ZONE_Y + ZONE_H / 2, W, ZONE_Y + ZONE_H / 2, allIn ? C.b : '#1a5c2a', 2);
    for (var i2 = 0; i2 < pins.length; i2++) {
      var px = PIN_START + i2 * PIN_GAP, py = TRACK_Y + pins[i2].y, inZ = Math.abs(py - ZONE_Y) < ZONE_H / 2;
      game.draw.rect(px - PIN_W / 2, TRACK_Y, PIN_W, PIN_H, '#111827', 0.8);
      game.draw.rect(px - PIN_W / 2 + 3, py - 4, PIN_W - 6, 80, inZ ? PIN_IN : PIN, 0.9);
      pc(px, py, 16, inZ ? PIN_IN : PIN, 0.9);
    }
    var kCol = allIn ? C.c : '#2a2a3a';
    pc(W / 2, ZONE_Y, 28, kCol, allIn ? (0.8 + 0.2 * Math.sin(elapsed * 8)) : 0.35);
    if (allIn) txt('TAP NOW!', W / 2, snap(H * 0.87), 56, C.b);
    else txt('ALIGN ALL PINS', W / 2, snap(H * 0.87), 40, '#f1f5f944');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (allInZone()) {
      score++; lockAnim = 0.5; flash = 0.3; flashCol = C.b; resultText = 'UNLOCK!'; resultTimer = 0.5; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: ZONE_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.b }); }
      for (var i = 0; i < pins.length; i++) { pins[i].speed = Math.min(360, (160 + score * 22) + Math.random() * 80); pins[i].dir = Math.random() < 0.5 ? 1 : -1; }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; var inCount = 0; for (var j = 0; j < pins.length; j++) if (Math.abs(TRACK_Y + pins[j].y - ZONE_Y) < ZONE_H / 2) inCount++;
      resultText = inCount + '/' + PIN_COUNT + ' OFF!'; resultTimer = 0.45; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pins) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRACKED IT!' : 'JAMMED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < pins.length; i++) { pins[i].y += pins[i].speed * pins[i].dir * dt; pins[i].phase += dt * 2; if (pins[i].y >= PIN_H) { pins[i].y = PIN_H; pins[i].dir = -1; } if (pins[i].y <= 0) { pins[i].y = 0; pins[i].dir = 1; } }
      if (lockAnim > 0) lockAnim -= dt * 2; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.13), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0c0c18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
