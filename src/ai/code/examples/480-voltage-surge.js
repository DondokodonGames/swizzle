// 480-voltage-surge.js
// 電圧サージ — 急上昇する電圧計が安全ゾーン（緑）に入った瞬間、指示された向きへスワイプして放電
// 操作: 針が緑ゾーンにある間に、表示された矢印の向きへスワイプ（早すぎ/過負荷は失敗）
// 成功: 5回 放電  失敗: 3回 爆発 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、発電制御室） ──
  var C = { bg:'#050010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DIRS = ['up', 'down', 'left', 'right'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SURGE';
  var HOW_TO_PLAY = 'SWIPE THE ARROW WHILE THE NEEDLE IS IN THE GREEN ZONE';
  var MAX_TIME = 20;
  var NEEDED     = 5;        // 修正2: 15 → 5
  var MAX_EXPLODE = 3;       // 修正2: 5 → 3
  var SAFE_MIN = 0.55, SAFE_MAX = 0.78;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var voltage, vspeed, surging, currentDir, successes, explosions, timeLeft, done, particles, resultText, resultCol, resultTimer, flash, flashCol, shake, nextRound;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, dir, sz, color, alpha) {
    cx = snap(cx); cy = snap(cy); var s = sz;
    for (var i = -s; i <= s; i += 8) { var w = s - Math.abs(i); if (dir === 'up') game.draw.rect(cx - w, cy + i, w * 2 + 8, 8, color, alpha); else if (dir === 'down') game.draw.rect(cx - w, cy - i, w * 2 + 8, 8, color, alpha); else if (dir === 'left') game.draw.rect(cx + i, cy - w, 8, w * 2 + 8, color, alpha); else game.draw.rect(cx - i, cy - w, 8, w * 2 + 8, color, alpha); }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0020');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() { voltage = 0; vspeed = 0.28 + successes * 0.03 + Math.random() * 0.1; currentDir = DIRS[Math.floor(Math.random() * DIRS.length)]; surging = true; }

  function initGame() { successes = 0; explosions = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; flash = 0; flashCol = C.b; shake = 0; nextRound = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 600 + Math.ceil(timeLeft) * 100) : successes * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function blowUp(reason) { explosions++; resultText = reason; resultCol = C.a; resultTimer = 0.9; flash = 0.5; flashCol = C.a; shake = 0.35; game.audio.play('se_failure', 0.6); surging = false; nextRound = 1.0; for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.36, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350, life: 0.7, col: C.a }); } if (explosions >= MAX_EXPLODE) finish(false); }

  function drawMeter(sx) {
    var MX = W / 2 + sx, MY = H * 0.30, MW = 640, MH = 120;
    game.draw.rect(MX - MW / 2 - 10, MY - 10, MW + 20, MH + 20, '#1a1030', 0.9);
    game.draw.rect(MX - MW / 2, MY, MW * SAFE_MIN, MH, '#301030', 0.8);
    game.draw.rect(MX - MW / 2 + MW * SAFE_MIN, MY, MW * (SAFE_MAX - SAFE_MIN), MH, C.b, 0.3);
    game.draw.rect(MX - MW / 2 + MW * SAFE_MAX, MY, MW * (1 - SAFE_MAX), MH, '#301010', 0.8);
    var nx = MX - MW / 2 + MW * voltage;
    game.draw.rect(nx - 6, MY - 18, 12, MH + 36, C.g, 0.9); pc(nx, MY - 18, 14, C.g, 0.9);
    if (voltage > SAFE_MAX - 0.03 && surging) for (var si = 0; si < 3; si++) pc(nx + (Math.random() - 0.5) * 40, MY + Math.random() * MH, 6, C.c, Math.random() * 0.8);
    if (surging) arrow(W / 2 + sx, H * 0.56, currentDir, 60, C.e, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !surging) return;
    if (voltage >= SAFE_MIN && voltage <= SAFE_MAX) {
      if (dir === currentDir) {
        successes++; resultText = 'DISCHARGE!'; resultCol = C.b; resultTimer = 0.8; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.6); surging = false; nextRound = 0.8;
        for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.36, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.6, col: C.c }); }
        if (successes >= NEEDED) { finish(true); return; }
      } else blowUp('WRONG WAY!');
    } else if (voltage < SAFE_MIN) { resultText = 'TOO SOON!'; resultCol = C.c; resultTimer = 0.8; game.audio.play('se_failure', 0.3); }
    else blowUp('OVERLOAD!');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (voltage === undefined) initGame(); background(); drawMeter(0);
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRID STABLE!' : 'BLACKOUT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (shake > 0) shake -= dt;
      if (!surging) { nextRound -= dt; if (nextRound <= 0) newRound(); }
      else { voltage += vspeed * dt; if (voltage > 1.0) { voltage = 1.0; blowUp('BOOM!'); if (done) return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    var sx = shake > 0 ? Math.sin(game.time.elapsed * 40) * 30 * (shake / 0.35) : 0;
    background(); drawMeter(sx);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x + sx) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2 + sx, H * 0.72, 64, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_EXPLODE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_EXPLODE - 1) / 2) * 56) - 10, 224, 20, 20, ei < explosions ? C.a : '#0a0020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
