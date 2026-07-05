// 783-crystal-tap.js
// クリスタルタップ — 輝くクリスタルが最大に光った瞬間（PEAK）を逃さずタップせよ
// 操作: タップ — クリスタルの輝きがピーク（PEAK）に達した瞬間
// 成功: 10回 ピーク  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宝石） ──
  var C = { bg:'#02050f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CRYSTAL = '#7788ff', CRYSTAL_HI = '#c0c8ff', CRYSTAL_PK = '#ffffff', GLOW = '#5533cc';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL TAP';
  var HOW_TO_PLAY = 'TAP THE INSTANT THE CRYSTAL SHINES AT ITS PEAK BRIGHTNESS';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.42), WAIT_DUR = 0.42, PEAK_LOW = 0.85, PEAK_HIGH = 1.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var brightness, growing, growSpeed, fadeSpeed, answered, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, shatter, sparkles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#05060f');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < sparkles.length; si++) { var sp = sparkles[si]; game.draw.rect(snap(sp.x), snap(sp.y), 6, 6, CRYSTAL_HI, 0.1 + 0.15 * Math.sin(elapsed * 1.5 + si)); }
  }

  function drawCrystal(cx, cy, r, bright) {
    var col = bright > 0.85 ? CRYSTAL_PK : (bright > 0.5 ? CRYSTAL_HI : CRYSTAL), alpha = 0.5 + bright * 0.5;
    if (bright > 0.6) pc(cx, cy, r * (1 + bright * 0.7), GLOW, (bright - 0.6) * 0.25);
    pc(cx, cy, r * 0.5, col, alpha); pc(cx, cy - r * 0.55, r * 0.28, col, alpha * 0.9); pc(cx, cy + r * 0.55, r * 0.28, col, alpha * 0.9);
    pc(cx + r * 0.48, cy - r * 0.28, r * 0.22, col, alpha * 0.85); pc(cx + r * 0.48, cy + r * 0.28, r * 0.22, col, alpha * 0.85);
    pc(cx - r * 0.48, cy - r * 0.28, r * 0.22, col, alpha * 0.85); pc(cx - r * 0.48, cy + r * 0.28, r * 0.22, col, alpha * 0.85);
    if (bright > 0.4) pc(cx, cy, r * 0.3 * bright, C.g, bright * 0.6);
  }

  function drawScene() {
    var inPeak = brightness >= PEAK_LOW && brightness <= PEAK_HIGH;
    var meterW = snap(W * 0.7), meterX = snap(W * 0.15), meterY = snap(H * 0.73);
    game.draw.rect(meterX, meterY, meterW, 20, '#0a0a1a', 0.9);
    game.draw.rect(meterX, meterY, snap(meterW * brightness), 20, inPeak ? C.b : (brightness > 0.7 ? CRYSTAL_HI : CRYSTAL), 0.9);
    game.draw.rect(meterX + meterW * PEAK_LOW - 3, meterY - 5, 6, 30, C.b, 0.8);
    txt('PEAK', meterX + meterW * 0.925, meterY + 44, 28, C.b);
    var crystalSize = 120 + brightness * 30; drawCrystal(CX, CY, crystalSize, brightness);
    if (shatter > 0) for (var cs = 0; cs < 8; cs++) { var ca = cs * Math.PI * 2 / 8, cr = crystalSize * (1 + shatter * 0.6); pc(CX + Math.cos(ca) * cr, CY + Math.sin(ca) * cr, 12 * shatter, CRYSTAL_PK, shatter * 0.8); }
    if (state === S.PLAYING) {
      if (inPeak && !answered) { var pulse = 1 + 0.08 * Math.sin(elapsed * 18); txt('TAP NOW!', W / 2, snap(H * 0.22), Math.floor(68 * pulse), CRYSTAL_PK); }
      else if (growing && brightness < PEAK_LOW && !answered) txt('CHARGING...', W / 2, snap(H * 0.22), 42, CRYSTAL);
      else if (!growing && !answered && brightness > 0) txt('STILL TIME!', W / 2, snap(H * 0.22), 44, C.a);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    answered = true;
    if (brightness >= PEAK_LOW && brightness <= PEAK_HIGH) {
      score++; shatter = 0.5; flash = 0.22; flashCol = C.b; resultText = brightness > 0.97 ? 'PERFECT!' : 'PEAK!'; resultTimer = 0.4; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 200; particles.push({ x: CX + Math.cos(pa) * 60, y: CY + Math.sin(pa) * 60, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 50, life: 0.5, col: CRYSTAL_HI }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = brightness < PEAK_LOW ? 'TOO DIM!' : 'FADED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  });

  function initGame() {
    brightness = 0; growing = true; growSpeed = 0.55; fadeSpeed = 1.2; answered = false; waitTimer = 0; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; shatter = 0;
    sparkles = []; for (var i = 0; i < 20; i++) sparkles.push({ x: Math.random() * W, y: Math.random() * H * 0.8 });
  }

  function nextCrystal() { brightness = 0; growing = true; growSpeed = Math.min(1.2, 0.55 + score * 0.04); fadeSpeed = Math.min(2.5, 1.2 + score * 0.06); answered = false; shatter = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 130) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (brightness === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GEM MASTER!' : 'SHATTERED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) nextCrystal(); }
      else {
        if (growing) { brightness += growSpeed * dt; if (brightness >= 1.0) { brightness = 1.0; growing = false; } }
        else { brightness -= fadeSpeed * dt; if (brightness <= 0 && !answered) { errors++; flash = 0.28; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.24); answered = true; waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } } if (brightness < 0) brightness = 0; }
      }
      if (shatter > 0) shatter -= dt * 2; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2.2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.84), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#05060f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
