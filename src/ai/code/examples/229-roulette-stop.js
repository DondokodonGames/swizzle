// 229-roulette-stop.js
// ルーレットストップ — 高速回転する的を、針が緑ゾーンを指す瞬間にタップで止める度胸試し
// 操作: タップで回転を止める
// 成功: 2回緑ゾーンに止める  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、カジノホイール） ──
  var C = { bg:'#0a0405', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROULETTE STOP';
  var HOW_TO_PLAY = 'TAP TO STOP THE WHEEL ON GREEN';
  var MAX_TIME = 15;
  var NEEDED   = 2;           // 修正2: 5 → 2
  var MAX_MISS = 3;
  var CX = snap(W / 2), CY = snap(H * 0.46), R = 300;
  // 緑=当たり, 赤=ミス, 黄=ノーカウント
  var SECTORS = [
    { col: C.b, arc: 0.16, pts: 1 }, { col: C.a, arc: 0.18, pts: -1 }, { col: C.c, arc: 0.1, pts: 0 },
    { col: C.a, arc: 0.18, pts: -1 }, { col: C.b, arc: 0.12, pts: 1 }, { col: C.a, arc: 0.16, pts: -1 }, { col: C.c, arc: 0.1, pts: 0 }
  ];
  var NEEDLE = -Math.PI / 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, speed, spinning, judging, judgeTimer, successes, misses, timeLeft, done, feedback, feedbackCol, feedbackTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a12');
  }

  function background() { game.draw.clear(C.bg); }

  function drawWheel() {
    var cum = angle;
    for (var si = 0; si < SECTORS.length; si++) {
      var arc = SECTORS[si].arc * Math.PI * 2;
      for (var a = cum; a < cum + arc; a += 0.06) for (var r = 40; r < R; r += 12) game.draw.rect(snap(CX + Math.cos(a) * r) - 6, snap(CY + Math.sin(a) * r) - 6, 12, 12, SECTORS[si].col, 0.85);
      cum += arc;
    }
    pc(CX, CY, 28, C.g, 0.9);
    // 針（上部固定）
    for (var rr = R - 30; rr < R + 20; rr += 8) game.draw.rect(snap(CX + Math.cos(NEEDLE) * rr) - 5, snap(CY + Math.sin(NEEDLE) * rr) - 5, 10, 10, C.g);
  }

  function initGame() { angle = 0; speed = 4.5; spinning = true; judging = false; judgeTimer = 0; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = ''; feedbackCol = C.g; feedbackTimer = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 500 + Math.ceil(timeLeft) * 50) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function judge() {
    var na = ((NEEDLE - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), cum = 0, res = SECTORS[0];
    for (var si = 0; si < SECTORS.length; si++) { cum += SECTORS[si].arc * Math.PI * 2; if (na < cum) { res = SECTORS[si]; break; } }
    if (res.pts === 1) {
      successes++; feedback = 'HIT!'; feedbackCol = C.b; feedbackTimer = 0.9; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5 }); }
      if (successes >= NEEDED) { finish(true); return; }
    } else if (res.pts === -1) { misses++; feedback = 'MISS'; feedbackCol = C.a; feedbackTimer = 0.8; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
    else { feedback = 'NO COUNT'; feedbackCol = C.c; feedbackTimer = 0.5; game.audio.play('se_tap', 0.3); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !spinning || judging) return;
    spinning = false; judging = true; judgeTimer = 1.0; game.audio.play('se_tap', 0.4); judge();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); angle = (angle || 0) + dt * 3; drawWheel();
      txt(GAME_TITLE, W / 2, H * 0.13, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'BUSTED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedbackTimer > 0) feedbackTimer -= dt;
      if (judging) { judgeTimer -= dt; if (judgeTimer <= 0) { judging = false; spinning = true; speed = Math.min(7, speed + 0.4); } }
      if (spinning) angle += speed * dt;
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background(); drawWheel();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedbackTimer > 0) txt(feedback, CX, CY + R + 70, 56, feedbackCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#2a0a12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
