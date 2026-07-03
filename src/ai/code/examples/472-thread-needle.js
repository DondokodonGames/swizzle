// 472-thread-needle.js
// 糸通し — 左右に揺れ動く針穴のタイミングに合わせ、タップで糸を送り込んで通す
// 操作: 穴が中央に来た瞬間にタップして糸を前進させる（針の胴に当たると失敗）
// 成功: 3回 通す  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、裁縫台） ──
  var C = { bg:'#0c0810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'THREAD NEEDLE';
  var HOW_TO_PLAY = 'TAP WHEN THE EYE LINES UP WITH THE CENTER';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var NX = snap(W / 2), NYC = snap(H * 0.44), NLEN = 500, HOLE_R = 40;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var needlePhase, amplitude, threadY, advancing, roundActive, successes, misses, timeLeft, done, particles, resultText, resultCol, resultTimer, flash, flashCol;
  var THREAD_SPEED = 640;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a1008');
  }

  function background() { game.draw.clear(C.bg); }

  function holeX() { return NX + Math.sin(needlePhase) * amplitude * NLEN * 0.3; }
  function holeY() { return NYC - Math.cos(needlePhase) * amplitude * NLEN * 0.35 - NLEN * 0.4; }

  function resetThread() { threadY = H * 0.82; advancing = false; roundActive = true; }

  function initGame() { needlePhase = 0; amplitude = 0.25; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; flash = 0; flashCol = C.b; resetThread(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var hx = holeX(), hy = holeY();
    var topX = NX + Math.sin(needlePhase) * amplitude * NLEN * 0.5, topY = NYC - Math.cos(needlePhase) * amplitude * NLEN * 0.35 - NLEN * 0.3;
    var botX = NX - Math.sin(needlePhase) * amplitude * NLEN * 0.5, botY = NYC + Math.cos(needlePhase) * amplitude * NLEN * 0.35 + NLEN * 0.1;
    pline(botX, botY, topX, topY, '#90a0b0', 0.9, 16);
    // 穴（背景色で穴あけ）
    pc(hx, hy, HOLE_R, C.bg, 1.0); pc(hx, hy, HOLE_R - 8, '#1a1030', 1.0);
    // 中央ガイド
    game.draw.rect(NX - 2, NYC - NLEN * 0.7, 4, NLEN * 1.4, C.d, 0.2);
    // 糸
    if (roundActive || advancing) { pc(W / 2, threadY, 14, C.c, 0.9); pc(W / 2, threadY, 8, C.f, 1.0); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !roundActive || advancing) return;
    advancing = true; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (threadY === undefined) initGame(); background(); needlePhase += dt * 1.5; drawScene();
      txt(GAME_TITLE, W / 2, H * 0.80, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.955, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL THREADED!' : 'FRAYED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (resultTimer > 0) resultTimer -= dt;
      needlePhase += dt * (1.5 + successes * 0.15);
      var targetAmp = Math.min(0.6, 0.25 + successes * 0.05); amplitude += (targetAmp - amplitude) * dt * 2;
      if (advancing) {
        threadY -= THREAD_SPEED * dt;
        var hy = holeY(), hx = holeX();
        if (threadY <= hy + HOLE_R && threadY >= hy - HOLE_R) {
          advancing = false; roundActive = false;
          if (Math.abs(W / 2 - hx) < HOLE_R * 1.2) {
            successes++; resultText = 'THREADED!'; resultCol = C.b; resultTimer = 1.0; flash = 0.6; flashCol = C.b; game.audio.play('se_success', 0.7);
            for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: hx, y: hy, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.c }); }
            if (successes >= NEEDED) { finish(true); return; }
            setTimeout(function() { if (!done) resetThread(); }, 600);
          } else {
            misses++; resultText = 'MISSED!'; resultCol = C.a; resultTimer = 1.0; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
            if (misses >= MAX_MISS) { finish(false); return; }
            setTimeout(function() { if (!done) resetThread(); }, 600);
          }
        } else if (threadY < NYC - NLEN * 0.6) {
          advancing = false; roundActive = false; misses++; resultText = 'AWAY!'; resultCol = C.a; resultTimer = 1.0; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS) { finish(false); return; }
          setTimeout(function() { if (!done) resetThread(); }, 600);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.76), 64, resultCol);
    else if (roundActive && !advancing && Math.floor(game.time.elapsed * 5) % 2 === 0) txt('TAP!', W / 2, snap(H * 0.88), 56, C.f);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1008');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
