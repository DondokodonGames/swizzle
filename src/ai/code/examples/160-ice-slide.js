// 160-ice-slide.js
// 氷上スライド — 摩擦のない氷の上でパックを操り、ゴールに滑り込ませる精密さ
// 操作: ゴール方向をタップして蹴る（強さは距離で決まる）
// 成功: 1ゴール  失敗: 5回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、リンク） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'TAP TOWARD THE GOAL TO SHOOT';
  var MAX_TIME = 15;             // 修正2: 50 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 5;
  var ICE_X = snap(80), ICE_Y = snap(H * 0.16), ICE_W = snap(W - 160), ICE_H = snap(H * 0.6);
  var PUCK_R = 40, GOAL_W = 140, GOAL_H = 40, FRICTION = 0.985;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var puckX, puckY, pvx, pvy, puckMoving, goalX, goalY, goalHoriz, particles, score, misses, timeLeft, done, feedback, feedbackOk;

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
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(ICE_X, ICE_Y, ICE_W, ICE_H, C.a, 0.35);
    for (var ix = 0; ix <= 4; ix++) game.draw.rect(ICE_X + ix * ICE_W / 4, ICE_Y, 2, ICE_H, C.b, 0.2);
    for (var iy = 0; iy <= 4; iy++) game.draw.rect(ICE_X, ICE_Y + iy * ICE_H / 4, ICE_W, 2, C.b, 0.2);
    game.draw.rect(ICE_X, ICE_Y, ICE_W, 8, C.b);
    game.draw.rect(ICE_X, ICE_Y + ICE_H - 8, ICE_W, 8, C.b);
    game.draw.rect(ICE_X, ICE_Y, 8, ICE_H, C.b);
    game.draw.rect(ICE_X + ICE_W - 8, ICE_Y, 8, ICE_H, C.b);
  }

  function goalRect() {
    var gW = goalHoriz ? GOAL_W : GOAL_H, gH = goalHoriz ? GOAL_H : GOAL_W;
    return { x: goalX, y: goalY, w: gW, h: gH, cx: goalX + gW / 2, cy: goalY + gH / 2 };
  }

  function drawGoal() {
    var g = goalRect();
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(g.x, g.y, g.w, g.h, on ? C.f : C.d, 0.9);
    game.draw.rect(g.x, g.y, g.w, 8, C.g);
    txt('GOAL', g.cx, g.cy - 8, 28, C.c);
  }

  function drawPuck() {
    game.draw.rect(snap(puckX) - PUCK_R, snap(puckY) + 6, PUCK_R * 2, 8, '#000000', 0.4);
    pc(puckX, puckY, PUCK_R, C.c, 1);
    pc(puckX, puckY, PUCK_R - 12, C.b, 0.5);
    pc(puckX - 12, puckY - 12, 8, C.g, 0.8);
  }

  function placeGoal() {
    var margin = 100, side = Math.floor(Math.random() * 3);
    if (side === 0) { goalX = snap(ICE_X + margin + Math.random() * (ICE_W - margin * 2 - GOAL_W)); goalY = snap(ICE_Y - GOAL_H / 2); goalHoriz = true; }
    else if (side === 1) { goalX = snap(ICE_X - GOAL_H / 2); goalY = snap(ICE_Y + margin + Math.random() * (ICE_H - margin * 2 - GOAL_W)); goalHoriz = false; }
    else { goalX = snap(ICE_X + ICE_W - GOAL_H / 2); goalY = snap(ICE_Y + margin + Math.random() * (ICE_H - margin * 2 - GOAL_W)); goalHoriz = false; }
  }

  function resetPuck() {
    puckX = snap(ICE_X + ICE_W / 2 + game.random(-160, 160));
    puckY = snap(ICE_Y + ICE_H * 0.72 + game.random(-60, 60));
    pvx = 0; pvy = 0; puckMoving = false;
  }

  function initGame() {
    particles = []; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
    placeGoal(); resetPuck();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerMiss() {
    misses++; feedbackOk = false; feedback = 0.4;
    game.audio.play('se_failure', 0.5);
    if (misses >= MAX_MISS) { finish(false); return; }
    setTimeout(function() { if (state === S.PLAYING && !done) resetPuck(); }, 450);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || puckMoving) return;
    var dx = x - puckX, dy = y - puckY, len = Math.hypot(dx, dy);
    if (len < 10) return;
    var power = Math.min(len * 1.8, 800);
    pvx = (dx / len) * power; pvy = (dy / len) * power; puckMoving = true;
    game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGoal(); puckX = ICE_X + ICE_W / 2; puckY = ICE_Y + ICE_H * 0.7; drawPuck();
      txt(GAME_TITLE, W / 2, H * 0.06, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.82, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.d);
        txt('TAP TO START', W / 2, H * 0.93, 48, C.c);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOAL!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (puckMoving) {
        pvx *= Math.pow(FRICTION, dt * 60); pvy *= Math.pow(FRICTION, dt * 60);
        puckX += pvx * dt; puckY += pvy * dt;
        if (puckX - PUCK_R < ICE_X) { puckX = ICE_X + PUCK_R; pvx = Math.abs(pvx) * 0.8; }
        if (puckX + PUCK_R > ICE_X + ICE_W) { puckX = ICE_X + ICE_W - PUCK_R; pvx = -Math.abs(pvx) * 0.8; }
        if (puckY - PUCK_R < ICE_Y) { puckY = ICE_Y + PUCK_R; pvy = Math.abs(pvy) * 0.8; }
        if (puckY + PUCK_R > ICE_Y + ICE_H) { puckY = ICE_Y + ICE_H - PUCK_R; pvx = 0; pvy = 0; puckMoving = false; registerMiss(); return; }
        var g = goalRect();
        if (Math.hypot(puckX - g.cx, puckY - g.cy) < PUCK_R + Math.max(GOAL_W, GOAL_H) / 2 - 20) {
          score++; feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 12; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: puckX, y: puckY, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, life: 0.5 }); }
          pvx = 0; pvy = 0; puckMoving = false;
          if (score >= NEEDED) { finish(true); return; }
          placeGoal(); setTimeout(function() { if (state === S.PLAYING && !done) resetPuck(); }, 400);
          return;
        }
        if (Math.abs(pvx) < 8 && Math.abs(pvy) < 8) { pvx = 0; pvy = 0; puckMoving = false; registerMiss(); return; }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 200 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background(); drawGoal();
    if (!puckMoving) {
      var g = goalRect(), aimDx = g.cx - puckX, aimDy = g.cy - puckY, aimLen = Math.max(1, Math.hypot(aimDx, aimDy));
      for (var t = 40; t < 160; t += 16) game.draw.rect(snap(puckX + aimDx / aimLen * t) - 4, snap(puckY + aimDy / aimLen * t) - 4, 8, 8, C.f, 0.6);
    }
    drawPuck();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.f, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.f : C.e, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, H - 96, 24, 24, mm < misses ? C.e : '#001133');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
