// 254-freeze-frame.js
// フリーズフレーム — 踊り続ける人形がお手本ポーズと重なった一瞬をタップで止める、決めのタイミング
// 操作: 人形が目標ポーズになった瞬間タップ
// 成功: 3回パーフェクト  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、スポットライト舞台） ──
  var C = { bg:'#060209', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var POSES = [
    { name: 'T', lArm: -Math.PI / 2, rArm: Math.PI / 2, lLeg: -Math.PI / 4, rLeg: Math.PI / 4 },
    { name: 'Y', lArm: -Math.PI * 0.6, rArm: Math.PI * 0.6, lLeg: -Math.PI / 6, rLeg: Math.PI / 6 },
    { name: 'X', lArm: -Math.PI * 0.7, rArm: Math.PI * 0.7, lLeg: -Math.PI * 0.4, rLeg: Math.PI * 0.4 },
    { name: 'SALUTE', lArm: -Math.PI / 6, rArm: -Math.PI / 2, lLeg: Math.PI / 8, rLeg: -Math.PI / 8 }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREEZE FRAME';
  var HOW_TO_PLAY = 'TAP WHEN THE DANCER HITS THE TARGET POSE';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 8 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetIdx, anim, animSpeed, hits, misses, timeLeft, done, fbText, fbCol, fbTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pline(x1, y1, x2, y2, color) { var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 10)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - 5, snap(y1 + (y2 - y1) * i / n) - 5, 10, 10, color, 0.9); }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.72, W, H * 0.28, C.d, 0.3); }

  function poseNow() {
    var t = anim * POSES.length, fi = Math.floor(t) % POSES.length, ti = (fi + 1) % POSES.length, fr = t - Math.floor(t), a = POSES[fi], b = POSES[ti];
    return { lArm: a.lArm + (b.lArm - a.lArm) * fr, rArm: a.rArm + (b.rArm - a.rArm) * fr, lLeg: a.lLeg + (b.lLeg - a.lLeg) * fr, rLeg: a.rLeg + (b.rLeg - a.rLeg) * fr };
  }

  function nearTarget() { var c = poseNow(), t = POSES[targetIdx]; return (Math.abs(c.lArm - t.lArm) + Math.abs(c.rArm - t.rArm) + Math.abs(c.lLeg - t.lLeg) + Math.abs(c.rLeg - t.rLeg)) < 0.35; }

  function drawFigure(cx, cy, a, col, s) {
    var head = 26 * s, torso = 76 * s, limb = 66 * s;
    pc(cx, cy - head - torso / 2 - 8, head, col, 0.9);
    pline(cx, cy - torso / 2, cx, cy + torso / 2, col);
    var ay = cy - torso * 0.3;
    pline(cx, ay, cx + Math.cos(a.lArm) * limb, ay + Math.sin(a.lArm) * limb, col);
    pline(cx, ay, cx + Math.cos(Math.PI - a.rArm) * limb, ay + Math.sin(a.rArm) * limb, col);
    pline(cx, cy + torso / 2, cx + Math.cos(Math.PI / 2 + a.lLeg) * limb, cy + torso / 2 + Math.cos(a.lLeg) * limb, col);
    pline(cx, cy + torso / 2, cx + Math.cos(Math.PI / 2 - a.rLeg) * limb, cy + torso / 2 + Math.cos(a.rLeg) * limb, col);
  }

  function newTarget() { var prev = targetIdx; do { targetIdx = Math.floor(Math.random() * POSES.length); } while (targetIdx === prev); }

  function initGame() { targetIdx = 0; anim = 0; animSpeed = 0.6; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 60) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || fbTimer > 0.1) return;
    if (nearTarget()) { hits++; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6 }); } if (hits >= NEEDED) { finish(true); return; } newTarget(); animSpeed = 0.6 + hits * 0.1; }
    else { misses++; fbText = 'MISTIMED'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); anim = (game.time.elapsed * 0.5) % 1; drawFigure(W / 2, H * 0.45, poseNow(), C.e, 1.1);
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STRIKE A POSE!' : 'OFF BEAT', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      anim += animSpeed * dt; if (anim >= 1) anim -= 1;
      if (fbTimer > 0) fbTimer -= dt;
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    // お手本（右上）
    game.draw.rect(snap(W * 0.72), snap(H * 0.1), snap(W * 0.24), snap(H * 0.18), '#1a1030', 0.8); txt('TARGET', W * 0.84, H * 0.13, 26, C.b); drawFigure(W * 0.84, H * 0.22, POSES[targetIdx], C.b, 0.42);
    var near = nearTarget();
    if (near) pc(W / 2, H * 0.45, 130, C.b, 0.15 + 0.15 * (Math.floor(game.time.elapsed * 10) % 2));
    drawFigure(W / 2, H * 0.45, poseNow(), near ? C.b : C.e, 1.1);
    txt('POSE: ' + POSES[targetIdx].name, W / 2, H * 0.28, 48, near ? C.b : C.c);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.82, 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
