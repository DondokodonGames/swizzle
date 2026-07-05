// 793-tempo-tap.js
// テンポタップ — リズムに合わせてタップせよ。ビートを外すな
// 操作: タップ — 脈打つビートに合わせてタップ（猶予は短い）
// 成功: 10ビート 成功  失敗: 3回 外す or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズム） ──
  var C = { bg:'#060208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BEAT = '#a04dff', BEAT_GLOW = '#6622cc', BEAT_HI = '#e0a0ff', ONBEAT = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TEMPO TAP';
  var HOW_TO_PLAY = 'TAP IN TIME WITH THE PULSING BEAT · KEEP YOUR RHYTHM LOCKED';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var WINDOW = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bpm, beatInterval, beatTimer, beatPhase, beatCount, lastBeatTime, beatAnswered, score, errors, done, timeLeft, elapsed, rings, particles, flash, flashCol, resultText, resultTimer, hitAnim, combo;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080410');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { bpm = 90; beatInterval = 60 / bpm; beatTimer = 0; beatPhase = 0; beatCount = 0; lastBeatTime = 0; beatAnswered = false; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; rings = []; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitAnim = 0; combo = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + combo * 100 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var CX = W / 2, CY = snap(H * 0.44), beatPulse = Math.sin(beatPhase * Math.PI), mainR = 120 * (1 + beatPulse * 0.15);
    pc(CX, CY, mainR + 60 * beatPulse, BEAT_GLOW, beatPulse * 0.2); pc(CX, CY, mainR, BEAT, 0.5 + beatPulse * 0.4); pc(CX, CY, mainR * 0.6, BEAT_HI, 0.3 + beatPulse * 0.6); pc(CX, CY, mainR * 0.25, C.g, beatPulse * 0.8);
    if (hitAnim > 0) ring(CX, CY, mainR * (1 + hitAnim * 0.5), ONBEAT, hitAnim * 0.4);
    for (var ri2 = 0; ri2 < rings.length; ri2++) ring(CX, CY, rings[ri2].r, C.b, rings[ri2].life * 0.7);
    var windowFrac = WINDOW / beatInterval;
    for (var ai = 0; ai < 32; ai++) { var af = ai / 32; if (!(af < windowFrac || af > 1 - windowFrac)) continue; var aa = af * Math.PI * 2 - Math.PI / 2; pc(CX + Math.cos(aa) * 180, CY + Math.sin(aa) * 180, 8, C.b, 0.3); }
    var curA = beatPhase * Math.PI * 2 - Math.PI / 2; pc(CX + Math.cos(curA) * 180, CY + Math.sin(curA) * 180, 14, ONBEAT, 0.9);
    if (combo >= 3) txt('x' + combo, W / 2, snap(H * 0.72), 48, ONBEAT);
    txt(Math.round(bpm) + ' BPM', W / 2, snap(H * 0.79), 34, BEAT);
    if (state === S.PLAYING) txt('TAP ON THE BEAT', W / 2, snap(H * 0.22), 38, C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var timeToNextBeat = beatInterval - (elapsed % beatInterval), timeFromLastBeat = elapsed % beatInterval, nearestBeatDist = Math.min(timeFromLastBeat, timeToNextBeat);
    if (nearestBeatDist <= WINDOW) {
      if (!beatAnswered) {
        score++; combo++; beatAnswered = true; hitAnim = 0.4; flash = 0.18; flashCol = C.b; resultText = combo >= 5 ? 'FIRE x' + combo : (combo >= 3 ? combo + ' COMBO!' : 'BEAT!'); resultTimer = 0.35; game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.44, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.35, col: ONBEAT }); }
        rings.push({ r: 60, life: 1.0 });
        if (score >= NEEDED) { finish(true); return; }
      }
    } else {
      errors++; combo = 0; flash = 0.28; flashCol = C.a; resultText = 'OFF BEAT!'; resultTimer = 0.4; game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bpm === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RHYTHM MASTER!' : 'OUT OF TIME', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      bpm = Math.min(160, 90 + score * 3); beatInterval = 60 / bpm;
      beatTimer += dt; beatPhase = (elapsed % beatInterval) / beatInterval;
      if (beatTimer >= beatInterval) { beatTimer -= beatInterval; beatCount++; lastBeatTime = elapsed; beatAnswered = false; game.audio.play('se_tap', 0.03); }
      for (var ri = rings.length - 1; ri >= 0; ri--) { rings[ri].r += 500 * dt; rings[ri].life = 1 - rings[ri].r / 320; if (rings[ri].life <= 0) rings.splice(ri, 1); }
      if (hitAnim > 0) hitAnim -= dt * 3; if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.855), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080410');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
