// 481-rhythm-drums.js
// リズムドラム — ビートに合わせて光る4つのドラムを、消える前にタップで叩く音ゲー
// 操作: 光ったドラムをタップ（光っていないドラムを叩く or 見逃すとミス）
// 成功: 10ヒット  失敗: 3ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ライブステージ） ──
  var C = { bg:'#0a0005', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DRUM_COLS = [C.a, C.e, C.b, C.c];
  var DRUM_POS = [{ x: W * 0.28, y: H * 0.44 }, { x: W * 0.72, y: H * 0.44 }, { x: W * 0.28, y: H * 0.68 }, { x: W * 0.72, y: H * 0.68 }];
  var DRUM_R = 140;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RHYTHM DRUMS';
  var HOW_TO_PLAY = 'TAP EACH DRUM WHILE IT GLOWS';
  var MAX_TIME = 15;
  var NEEDED   = 10;         // 修正2: 50 → 10
  var MAX_MISS = 3;          // 修正2: 15 → 3
  var BEAT_INTERVAL = 0.6, LIT_DUR = 0.55;
  var PATTERN = [[0, 2], [], [1, 3], [], [0], [2, 3], [1], [0, 1], [3], [0, 2], [1], [1, 3]];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hits, misses, timeLeft, done, particles, beatTimer, beatCount, drumLit, drumTimer, drumAnim, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#14000a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; beatTimer = 0; beatCount = 0; drumLit = [false, false, false, false]; drumTimer = [0, 0, 0, 0]; drumAnim = [0, 0, 0, 0]; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 400 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawDrums() {
    for (var di = 0; di < 4; di++) {
      var dp = DRUM_POS[di], lit = drumLit[di], lr = lit ? drumTimer[di] / LIT_DUR : 0;
      if (lit) ring(dp.x, dp.y, DRUM_R + 20 * lr, DRUM_COLS[di], 0.4 * lr);
      pc(dp.x, dp.y, DRUM_R, lit ? DRUM_COLS[di] : '#2a1520', lit ? 0.9 : 0.5);
      pc(dp.x, dp.y, DRUM_R * 0.5, lit ? C.g : '#402030', lit ? 0.4 : 0.2);
      if (drumAnim[di] > 0) ring(dp.x, dp.y, DRUM_R + 18, C.g, drumAnim[di] * 0.6);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hd = -1;
    for (var di = 0; di < 4; di++) if (Math.hypot(tx - DRUM_POS[di].x, ty - DRUM_POS[di].y) < DRUM_R + 20) { hd = di; break; }
    if (hd < 0) return;
    drumAnim[hd] = 0.3;
    if (drumLit[hd]) {
      hits++; drumLit[hd] = false; drumTimer[hd] = 0; game.audio.play('se_tap', 0.5);
      for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: DRUM_POS[hd].x, y: DRUM_POS[hd].y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: DRUM_COLS[hd] }); }
      if (hits >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.2); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!drumLit) initGame(); background(); drawDrums();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ENCORE!' : 'OFF BEAT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      beatTimer += dt;
      if (beatTimer >= BEAT_INTERVAL) { beatTimer -= BEAT_INTERVAL; var pat = PATTERN[beatCount % PATTERN.length]; for (var di = 0; di < pat.length; di++) { var d = pat[di]; if (!drumLit[d]) { drumLit[d] = true; drumTimer[d] = LIT_DUR; } } beatCount++; }
      for (var di2 = 0; di2 < 4; di2++) { if (drumLit[di2]) { drumTimer[di2] -= dt; if (drumTimer[di2] <= 0) { drumLit[di2] = false; misses++; flash = 0.3; flashCol = C.a; if (misses >= MAX_MISS) { finish(false); return; } } } if (drumAnim[di2] > 0) drumAnim[di2] -= dt * 4; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    // ビートバー
    var bp = beatTimer / BEAT_INTERVAL; game.draw.rect(snap(W * 0.1 + W * 0.8 * bp) - 8, H * 0.30, 16, 16, C.c, 0.7);
    drawDrums();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.8);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#14000a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
