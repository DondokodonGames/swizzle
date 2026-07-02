// 322-rope-swing.js
// ロープスイング — 振り子のロープでアンカーを掴んで振り、足場を伝って上のゴールへ到達する
// 操作: 地上でタップして近いアンカーを掴む、スイング中タップで手を離して飛ぶ
// 成功: 頂上のゴールに到達  失敗: 3回落下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、断崖の遺跡） ──
  var C = { bg:'#0a1628', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', plat:'#3a4a66' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROPE SWING';
  var HOW_TO_PLAY = 'TAP TO GRAB A ROPE · TAP AGAIN TO LET GO · REACH THE TOP';
  var MAX_TIME = 15;
  var MAX_FALL = 3;
  var GOAL_Y = snap(H * 0.24);

  var PLATFORMS = [
    { x: 60, y: snap(H * 0.86), w: 220 }, { x: 420, y: snap(H * 0.76), w: 190 }, { x: 780, y: snap(H * 0.68), w: 170 },
    { x: 300, y: snap(H * 0.58), w: 150 }, { x: 660, y: snap(H * 0.50), w: 170 }, { x: 150, y: snap(H * 0.42), w: 190 }, { x: 500, y: snap(H * 0.32), w: 200 }
  ];
  var ANCHORS = [
    { x: 220, y: snap(H * 0.62) }, { x: 610, y: snap(H * 0.52) }, { x: 360, y: snap(H * 0.44) },
    { x: 760, y: snap(H * 0.37) }, { x: 260, y: snap(H * 0.30) }, { x: 590, y: snap(H * 0.24) }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pX, pY, pVX, pVY, onGround, swinging, aIdx, ropeLen, ropeA, ropeAV, falls, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1628');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, snap(H * 0.3), C.d, 0.12); }

  function resetPlayer() { pX = snap(170); pY = snap(H * 0.84); pVX = 0; pVY = 0; onGround = true; swinging = false; aIdx = -1; }

  function nearestAnchor() { var best = -1, bd = 1e9; for (var i = 0; i < ANCHORS.length; i++) { var d = Math.hypot(ANCHORS[i].x - pX, ANCHORS[i].y - pY); if (d < bd && ANCHORS[i].y < pY) { bd = d; best = i; } } return (best >= 0 && bd < 380) ? best : -1; }

  function initGame() { resetPlayer(); falls = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (3000 - falls * 500 + Math.ceil(timeLeft) * 100) : (MAX_FALL - falls) * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawStar(cx, cy, r, col, alpha) { pc(cx, cy, r * 0.5, col, alpha); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * Math.PI * 2 / 5; pc(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, r * 0.28, col, alpha); } }

  function drawScene() {
    var gp = 4 * (Math.floor(game.time.elapsed * 4) % 2);
    ring(W / 2, GOAL_Y, 56 + gp, C.b, 0.5); drawStar(W / 2, GOAL_Y, 46, C.c, 0.9); txt('GOAL', W / 2, GOAL_Y + 88, 32, C.b);
    for (var pi = 0; pi < PLATFORMS.length; pi++) { var pl = PLATFORMS[pi]; game.draw.rect(pl.x, pl.y, pl.w, 22, C.plat, 0.95); game.draw.rect(pl.x, pl.y, pl.w, 6, C.e, 0.4); }
    for (var ai = 0; ai < ANCHORS.length; ai++) { pc(ANCHORS[ai].x, ANCHORS[ai].y, 14, C.c, 0.9); pc(ANCHORS[ai].x, ANCHORS[ai].y, 6, C.g, 0.9); }
    if (swinging) pline(ANCHORS[aIdx].x, ANCHORS[aIdx].y, pX, pY, C.f, 0.9, 6);
    pc(pX, pY, 22, C.f, 0.95); pc(pX - 6, pY - 6, 6, C.g, 0.8);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (swinging) {
      var a = ANCHORS[aIdx]; pX = a.x + Math.sin(ropeA) * ropeLen; pY = a.y + Math.cos(ropeA) * ropeLen;
      pVX = ropeAV * ropeLen * Math.cos(ropeA); pVY = -ropeAV * ropeLen * Math.sin(ropeA);
      swinging = false; onGround = false; game.audio.play('se_tap', 0.3);
    } else if (onGround) {
      var ai = nearestAnchor();
      if (ai >= 0) { aIdx = ai; var a2 = ANCHORS[ai]; ropeLen = Math.hypot(a2.x - pX, a2.y - pY); ropeA = Math.atan2(pX - a2.x, pY - a2.y); ropeAV = -0.9; swinging = true; onGround = false; game.audio.play('se_tap', 0.3); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SUMMIT!' : 'FELL', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (swinging) {
        var a = ANCHORS[aIdx];
        ropeAV += (-9.8 * 120 / ropeLen) * Math.sin(ropeA) * dt; ropeAV *= 0.998; ropeA += ropeAV * dt;
        pX = a.x + Math.sin(ropeA) * ropeLen; pY = a.y + Math.cos(ropeA) * ropeLen;
        for (var pi = 0; pi < PLATFORMS.length; pi++) { var pl = PLATFORMS[pi]; if (pX >= pl.x && pX <= pl.x + pl.w && pY >= pl.y - 20 && pY <= pl.y + 22) { pY = pl.y; swinging = false; onGround = true; pVX = 0; pVY = 0; } }
      } else if (!onGround) {
        pVY += 500 * dt; pX += pVX * dt; pY += pVY * dt;
        for (var pi2 = 0; pi2 < PLATFORMS.length; pi2++) { var pl2 = PLATFORMS[pi2]; if (pVY > 0 && pX >= pl2.x && pX <= pl2.x + pl2.w && pY >= pl2.y - 30 && pY <= pl2.y + 22) { pY = pl2.y; onGround = true; pVX = 0; pVY = 0; } }
        if (pY > H * 0.97 || pX < -50 || pX > W + 50) { falls++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 8; k++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: pX, y: Math.min(pY, H * 0.9), vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 100, life: 0.5, col: C.a }); } if (falls >= MAX_FALL) { finish(false); return; } resetPlayer(); }
      }
      if (pY < GOAL_Y + 60 && Math.abs(pX - W / 2) < 120) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    var hint = swinging ? 'TAP TO LET GO' : onGround ? 'TAP TO GRAB ROPE' : '';
    if (hint) txt(hint, W / 2, snap(H * 0.90), 38, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('CLIMB TO THE GOAL', W / 2, 168, 40, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#0a1628');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
