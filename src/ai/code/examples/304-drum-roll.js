// 304-drum-roll.js
// ドラムロール — 左右の太鼓を交互に叩いてテンポを保つ。連打や間延びはテンポを崩す
// 操作: 左半分と右半分を交互にタップ（同じ側の連続や遅すぎはミス）
// 成功: 8打を交互に決める  失敗: テンポを3回崩す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、和太鼓ステージ） ──
  var C = { bg:'#0a0508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DRUM ROLL';
  var HOW_TO_PLAY = 'ALTERNATE LEFT & RIGHT · KEEP THE TEMPO';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 80 → 8
  var MAX_BREAK = 3;
  var TEMPO_WINDOW = 0.9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hits, breaks, combo, tempo, lastSide, lastTime, elapsed, timeLeft, done, particles, leftHit, rightHit, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a12');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(W / 2 - 1, snap(H * 0.22), 2, snap(H * 0.6), C.d, 0.5); }

  function drawDrum(cx, col, hitT) {
    var dy = snap(H * 0.46), r = 190 + (hitT > 0 ? hitT * 60 : 0);
    ring(cx, dy, r + 12, col, 0.4); pc(cx, dy, r, col, 0.9); pc(cx, dy, r * 0.7, C.g, 0.1); pc(cx, dy, 22, C.g, 0.5);
    if (hitT > 0) ring(cx, dy, r * (1 + hitT * 0.6), C.g, hitT * 0.5);
  }

  function initGame() { hits = 0; breaks = 0; combo = 0; tempo = 1.0; lastSide = null; lastTime = 0; elapsed = 0; timeLeft = MAX_TIME; done = false; particles = []; leftHit = 0; rightHit = 0; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 400 + combo * 100 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addBreak(msg) { breaks++; tempo = Math.max(0, tempo - 0.3); combo = 0; fbText = msg; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.4); if (breaks >= MAX_BREAK) finish(false); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var side = x < W / 2 ? 'left' : 'right', interval = elapsed - lastTime;
    if (lastSide !== null && interval > TEMPO_WINDOW) { addBreak('TOO SLOW'); }
    else if (side === lastSide) { addBreak('SAME SIDE'); }
    else {
      hits++; combo++; tempo = Math.min(1, tempo + 0.1); game.audio.play('se_tap', 0.3 + combo * 0.02);
      if (side === 'left') leftHit = 0.2; else rightHit = 0.2;
      for (var pk = 0; pk < 5; pk++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: side === 'left' ? W * 0.28 : W * 0.72, y: H * 0.46, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: side === 'left' ? C.a : C.e }); }
      if (hits >= NEEDED) { finish(true); return; }
    }
    lastSide = side; lastTime = elapsed;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawDrum(W * 0.28, C.a, 0); drawDrum(W * 0.72, C.e, 0);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN RHYTHM!' : 'OFF BEAT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (leftHit > 0) leftHit -= dt; if (rightHit > 0) rightHit -= dt;
      if (fbTimer > 0) fbTimer -= dt;
      tempo = Math.max(0, tempo - dt * 0.05);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    drawDrum(W * 0.28, C.a, leftHit); drawDrum(W * 0.72, C.e, rightHit);
    txt('L', W * 0.28, snap(H * 0.46) + 20, 60, C.g); txt('R', W * 0.72, snap(H * 0.46) + 20, 60, C.g);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);

    // テンポメーター（12ブロック）
    var tc = Math.ceil(tempo * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(snap(W * 0.15) + i * snap(W * 0.7 / 12) + 2, snap(H * 0.80), snap(W * 0.7 / 12) - 4, 28, i < tc ? (tempo > 0.5 ? C.b : C.c) : '#1a0a12', i < tc ? 0.9 : 0.4);
    txt('TEMPO', W / 2, snap(H * 0.78), 30, C.g);
    if (combo > 1) txt(combo + ' COMBO!', W / 2, snap(H * 0.86), 44, C.c);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.60), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BREAK; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BREAK - 1) / 2) * 56) - 10, 224, 20, 20, bi < breaks ? C.a : '#1a0a12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
