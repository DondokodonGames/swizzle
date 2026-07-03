// 520-beat-tap.js
// ビートタップ — 一定のリズムに合わせて、拍の瞬間ぴったりにタップする音ゲー
// 操作: 中央の輪が脈打つビートに合わせてタップ（ジャストでPERFECT）
// 成功: 8ビート 的中  失敗: 3ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムフロア） ──
  var C = { bg:'#05000f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT TAP';
  var HOW_TO_PLAY = 'TAP ON THE BEAT AS THE RING PULSES';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_MISS = 3;          // 修正2: 15 → 3
  var BEAT_INTERVAL = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, beatPulse, hitBeats, misses, timeLeft, done, particles, rings, resultText, resultCol, resultTimer, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1e1b4b');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { beatTimer = 0; beatPulse = 0; hitBeats = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; rings = []; resultText = ''; resultTimer = 0; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hitBeats * 500 + Math.ceil(timeLeft) * 100) : hitBeats * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCircle() {
    var pulse = beatPulse, mainR = 120 + pulse * 60;
    ring(W / 2, H * 0.48, mainR, C.d, 0.5 + pulse * 0.4); pc(W / 2, H * 0.48, mainR - 24, C.d, 0.15 + pulse * 0.3);
    for (var ri = 0; ri < rings.length; ri++) ring(W / 2, H * 0.48, rings[ri].r, rings[ri].col, rings[ri].life * 0.6);
    txt('BEAT', W / 2, H * 0.48 + 16, 60, C.g);
    var frac = beatTimer / BEAT_INTERVAL, near = 1 - Math.abs(frac - 0.5) / 0.5;
    txt('TAP', W / 2, H * 0.64, 52, near > 0.75 ? C.c : near > 0.4 ? C.b : '#374151');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var offset = Math.abs(beatTimer - BEAT_INTERVAL / 2);
    if (offset < BEAT_INTERVAL * 0.12) { hitBeats++; resultText = 'PERFECT!'; resultCol = C.c; resultTimer = 0.8; flash = 0.3; game.audio.play('se_success', 0.8); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.48, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.4, col: C.c }); } rings.push({ r: 60, maxR: 280, life: 0.5, col: C.c }); if (hitBeats >= NEEDED) { finish(true); return; } }
    else if (offset < BEAT_INTERVAL * 0.28) { hitBeats++; resultText = 'GOOD'; resultCol = C.b; resultTimer = 0.7; game.audio.play('se_tap', 0.5); rings.push({ r: 60, maxR: 280, life: 0.4, col: C.b }); if (hitBeats >= NEEDED) { finish(true); return; } }
    else { misses++; resultText = 'MISS'; resultCol = C.a; resultTimer = 0.7; flash = 0.3; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      beatTimer += dt; if (beatTimer >= BEAT_INTERVAL) { beatTimer -= BEAT_INTERVAL; beatPulse = 1.0; } if (beatPulse > 0) beatPulse -= dt * 4;
      background(); drawCircle();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN THE GROOVE!' : 'OFF BEAT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; beatTimer += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (beatTimer >= BEAT_INTERVAL) { beatTimer -= BEAT_INTERVAL; beatPulse = 1.0; }
      if (beatPulse > 0) beatPulse -= dt * 4; if (resultTimer > 0) resultTimer -= dt; if (flash > 0) flash -= dt * 3;
      for (var ri = rings.length - 1; ri >= 0; ri--) { rings[ri].r += (rings[ri].maxR - rings[ri].r) * dt * 5; rings[ri].life -= dt * 2; if (rings[ri].life <= 0) rings.splice(ri, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCircle();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 2.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.74), 64, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.d, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hitBeats + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1e1b4b');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
