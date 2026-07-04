// 712-color-wave.js
// カラーウェーブ — 移り変わる色が目標色に一致した瞬間にタップする
// 操作: 大きな円の色を見て、下の目標色と一致した瞬間タップ
// 成功: 8回 一致  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード。表示色はHSLで生成＝ゲーム内容） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR WAVE';
  var HOW_TO_PLAY = 'THE BIG CIRCLE CYCLES COLORS · TAP WHEN IT MATCHES THE TARGET BELOW';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var HUE_TOLERANCE = 20;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hue, hueSpeed, targetHue, score, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, hitAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05080e');
  }

  function background() { game.draw.clear(C.bg); }

  function hslToHex(h, s, l) {
    h = h % 360; s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    var toHex = function(v) { var h2 = Math.round((v + m) * 255).toString(16); return h2.length === 1 ? '0' + h2 : h2; };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function hueDiff(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function pickTarget() { targetHue = Math.floor(Math.random() * 360); }

  function initGame() { hue = 0; hueSpeed = 80; targetHue = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitAnim = 0; pickTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var currentCol = hslToHex(hue, 85, 55), targetCol = hslToHex(targetHue, 85, 55), diff2 = hueDiff(hue, targetHue), closeRatio = Math.max(0, 1 - diff2 / 60);
    pc(W / 2, snap(H * 0.40), 240, currentCol, 0.9);
    if (hitAnim > 0) pc(W / 2, snap(H * 0.40), 240 + hitAnim * 60, currentCol, hitAnim * 0.25);
    pc(W / 2 - 80, snap(H * 0.40) - 90, 50, C.g, 0.18);
    if (closeRatio > 0.01) for (var seg = 0; seg < 20; seg++) { if (seg / 20 > closeRatio) break; var a = -Math.PI / 2 + seg * Math.PI * 2 / 20; pc(W / 2 + Math.cos(a) * 262, snap(H * 0.40) + Math.sin(a) * 262, 10, C.b, closeRatio * 0.8); }
    txt('TARGET', W / 2, snap(H * 0.70) - 90, 38, '#ffffff55');
    pc(W / 2, snap(H * 0.70), 110, targetCol, 0.9);
    if (closeRatio > 0.5) { var pulse = 0.5 + 0.5 * Math.sin(elapsed * 10); pc(W / 2, snap(H * 0.70), 130, targetCol, closeRatio * pulse * 0.25); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var diff = hueDiff(hue, targetHue);
    if (diff <= HUE_TOLERANCE) {
      score++; var accuracy = 1 - diff / HUE_TOLERANCE; hitAnim = 0.4; flash = 0.3; flashCol = C.b; resultText = diff < 5 ? 'PERFECT!' : 'GOOD!'; resultTimer = 0.5; game.audio.play('se_success', 0.4 + accuracy * 0.3);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.40, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: hslToHex(hue, 85, 60) }); }
      pickTarget(); hueSpeed = Math.min(220, 80 + score * 6);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; flash = 0.35; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hue === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.09, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.125, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COLOR MASTER!' : 'OFF HUE', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (hitAnim > 0) hitAnim -= dt * 3;
      hue = (hue + hueSpeed * dt) % 360;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#05080e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
