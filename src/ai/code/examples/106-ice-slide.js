// 106-ice-slide.js
// 氷滑り — 摩擦のない氷上でパックを壁に反射させ的に当てるカーリング
// 操作: タップした方向へパックを発射（壁で反射する）
// 成功: 2回的に命中  失敗: 5発撃ち尽くす or 35秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'TAP A DIRECTION TO SLIDE THE PUCK';
  var MAX_TIME = 35;
  var NEEDED = 2;           // 修正2: 8 → 2
  var AMMO_MAX = 5;         // 修正2: 10 → 5
  var PLAY_X = 80, PLAY_Y = H * 0.22, PLAY_W = W - 160, PLAY_H = H * 0.5, PUCK_R = 30, FRICTION = 0.996;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var puck, target, ammo, score, timeLeft, done, trail, feedback, feedbackOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function placeTarget() { target = { x: PLAY_X + 90 + Math.random() * (PLAY_W - 180), y: PLAY_Y + 90 + Math.random() * (PLAY_H - 300), r: 56 }; }
  function launchX() { return PLAY_X + PLAY_W / 2; }
  function launchY() { return PLAY_Y + PLAY_H - 70; }
  function initGame() { puck = null; ammo = AMMO_MAX; score = 0; timeLeft = MAX_TIME; done = false; trail = []; feedback = 0; feedbackOk = false; placeTarget(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40 + ammo * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || puck || ammo <= 0) return;
    var lx = launchX(), ly = launchY(), dx = tx - lx, dy = ty - ly, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10 || dy > 0) return;
    var speed = 460 + score * 30;
    puck = { x: lx, y: ly, vx: (dx / dist) * speed, vy: (dy / dist) * speed }; trail = []; ammo--; game.audio.play('se_tap', 0.7);
  });

  // 世界観: 氷のカーリング場。壁の反射を読んでパックを的へ滑らせる。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(snap(PLAY_X), snap(PLAY_Y), PLAY_W, PLAY_H, '#001a2a');
    game.draw.rect(snap(PLAY_X) - 16, snap(PLAY_Y) - 16, PLAY_W + 32, 16, C.a);
    game.draw.rect(snap(PLAY_X) - 16, snap(PLAY_Y) + PLAY_H, PLAY_W + 32, 16, C.a);
    game.draw.rect(snap(PLAY_X) - 16, snap(PLAY_Y), 16, PLAY_H, C.a);
    game.draw.rect(snap(PLAY_X) + PLAY_W, snap(PLAY_Y), 16, PLAY_H, C.a);
    txt('CURLING RINK', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    var lit = Math.floor(game.time.elapsed * 4) % 2 === 0;
    drawPixelCircle(target.x, target.y, target.r, C.e, 0.5);
    drawPixelCircle(target.x, target.y, target.r * 0.6, C.e, 0.9);
    drawPixelCircle(target.x, target.y, target.r * 0.3, lit ? C.g : C.d, 1);
    for (var tri = 0; tri < trail.length; tri++) { var t = trail[tri]; drawPixelCircle(t.x, t.y, PUCK_R * (1 - t.age / 0.6) * 0.7, C.b, (1 - t.age / 0.6) * 0.3); }
    if (puck) drawPixelCircle(puck.x, puck.y, PUCK_R, C.c, 1);
    else if (ammo > 0 && !done) { drawPixelCircle(launchX(), launchY(), PUCK_R, C.c, 0.6); txt('AIM & TAP', launchX(), launchY() + 70, 34, C.b); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (puck) {
        puck.x += puck.vx * dt; puck.y += puck.vy * dt;
        puck.vx *= Math.pow(FRICTION, dt * 60); puck.vy *= Math.pow(FRICTION, dt * 60);
        if (puck.x - PUCK_R < PLAY_X) { puck.x = PLAY_X + PUCK_R; puck.vx = Math.abs(puck.vx); game.audio.play('se_tap', 0.3); }
        if (puck.x + PUCK_R > PLAY_X + PLAY_W) { puck.x = PLAY_X + PLAY_W - PUCK_R; puck.vx = -Math.abs(puck.vx); game.audio.play('se_tap', 0.3); }
        if (puck.y - PUCK_R < PLAY_Y) { puck.y = PLAY_Y + PUCK_R; puck.vy = Math.abs(puck.vy); game.audio.play('se_tap', 0.3); }
        if (puck.y + PUCK_R > PLAY_Y + PLAY_H) { puck.y = PLAY_Y + PLAY_H - PUCK_R; puck.vy = -Math.abs(puck.vy); game.audio.play('se_tap', 0.3); }
        if (Math.sqrt((puck.x - target.x) * (puck.x - target.x) + (puck.y - target.y) * (puck.y - target.y)) < PUCK_R + target.r) {
          score++; feedbackOk = true; feedback = 0.5; game.audio.play('se_success'); puck = null; placeTarget();
          if (score >= NEEDED) { finish(true); return; }
        } else {
          trail.push({ x: puck.x, y: puck.y, age: 0 });
          for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
          trail = trail.filter(function(t) { return t.age < 0.6; });
          if (Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy) < 20) { feedbackOk = false; feedback = 0.3; puck = null; trail = []; if (ammo <= 0) { finish(false); return; } }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'HIT!' : 'STOPPED', W / 2, H * 0.8, 64, feedbackOk ? C.f : '#888888');
    timeBar();
    txt('HITS ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var a = 0; a < AMMO_MAX; a++) game.draw.rect(W / 2 + (a - (AMMO_MAX - 1) / 2) * 60 - 18, 150, 36, 36, a < ammo ? C.c : '#001133');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
