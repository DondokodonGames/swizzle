// 099-pinball-aim.js
// ピンボールエイム — 発射角を調整して狙ったターゲットにボールを当てる一発集中
// 操作: スワイプ左右で角度調整、タップで発射
// 成功: ターゲット1個撃破  失敗: 弾切れ or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'PINBALL AIM';
  var HOW_TO_PLAY = 'SWIPE TO AIM, TAP TO SHOOT';
  var MAX_TIME = 30;
  var NEEDED = 1;           // 修正2: 5 → 1
  var AMMO_MAX = 4;         // 修正2: 8 → 4
  var LAUNCHER_X = W / 2, LAUNCHER_Y = H * 0.86, BALL_SPEED = 900, BALL_R = 24;
  var MIN_ANGLE = -Math.PI * 0.45, MAX_ANGLE = Math.PI * 0.45;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var angle, ball, targets, ammo, score, timeLeft, done, feedback, feedbackOk, aimLine;

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

  function initGame() {
    angle = -Math.PI / 5; ball = null; ammo = AMMO_MAX; score = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; aimLine = [];
    var pos = [{ x: W * 0.25, y: H * 0.28 }, { x: W * 0.75, y: H * 0.28 }, { x: W / 2, y: H * 0.2 }];
    targets = []; for (var i = 0; i < pos.length; i++) targets.push({ x: pos[i].x, y: pos[i].y, r: 56, hit: false, hitTimer: 0 });
  }

  function computeAim() {
    aimLine = []; var bx = LAUNCHER_X, by = LAUNCHER_Y, vx = Math.sin(angle) * BALL_SPEED, vy = -Math.cos(angle) * BALL_SPEED;
    for (var i = 0; i < 14; i++) { aimLine.push({ x: bx, y: by }); bx += vx * 0.06; by += vy * 0.06; if (bx < BALL_R || bx > W - BALL_R) vx = -vx; if (by < BALL_R) vy = -vy; if (by > H) break; }
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40 + ammo * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ball) return;
    if (dir === 'left') angle -= 0.12; if (dir === 'right') angle += 0.12;
    angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle));
  });
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || ball || ammo <= 0) return;
    ammo--; ball = { x: LAUNCHER_X, y: LAUNCHER_Y, vx: Math.sin(angle) * BALL_SPEED, vy: -Math.cos(angle) * BALL_SPEED }; game.audio.play('se_tap', 0.8);
  });

  // 世界観: 射的キャビネット。角度を定めボールを反射させ標的を狙い撃つ。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(0, 0, 8, H, '#001133'); game.draw.rect(W - 8, 0, 8, H, '#001133'); game.draw.rect(0, 290, W, 8, '#001133');
    txt('AIM CABINET', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      if (t.hit) { if (t.hitTimer > 0) { var fr = t.hitTimer / 0.4; drawPixelCircle(t.x, t.y, t.r + (1 - fr) * 50, C.f, fr * 0.5); txt('HIT', t.x, t.y, 44, C.c); } }
      else { drawPixelCircle(t.x, t.y, t.r, C.e, 1); drawPixelCircle(t.x, t.y, t.r * 0.5, C.d, 1); }
    }
    if (!ball && aimLine.length > 1) for (var al = 0; al < aimLine.length; al += 2) game.draw.rect(snap(aimLine[al].x) - 4, snap(aimLine[al].y) - 4, 8, 8, C.b, 0.6);
    if (ball) drawPixelCircle(ball.x, ball.y, BALL_R, C.d, 1);
    // ランチャー
    var tipX = LAUNCHER_X + Math.sin(angle) * 90, tipY = LAUNCHER_Y - Math.cos(angle) * 90;
    game.draw.line(LAUNCHER_X, LAUNCHER_Y, tipX, tipY, C.b, 14);
    drawPixelCircle(LAUNCHER_X, LAUNCHER_Y, 32, C.a, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.4, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.55, 46, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.6, 40, '#888888');
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
      if (!ball) computeAim();
      if (ball) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
        if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
        for (var i = 0; i < targets.length; i++) {
          var t = targets[i]; if (t.hit) continue;
          if (Math.sqrt((ball.x - t.x) * (ball.x - t.x) + (ball.y - t.y) * (ball.y - t.y)) < BALL_R + t.r) {
            t.hit = true; t.hitTimer = 0.4; score++; feedbackOk = true; feedback = 0.4; game.audio.play('se_tap', 1.0); ball = null;
            if (score >= NEEDED) { finish(true); return; } break;
          }
        }
        if (ball && ball.y > H + 40) { ball = null; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.4); if (ammo <= 0) { finish(false); return; } }
      }
      for (var j = 0; j < targets.length; j++) if (targets[j].hitTimer > 0) targets[j].hitTimer -= dt;
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'HIT!' : 'MISS', W / 2, H * 0.5, 72, feedbackOk ? C.f : '#888888');
    timeBar();
    txt('AMMO ' + ammo, W / 2, 96, 44, C.c);
    for (var a = 0; a < AMMO_MAX; a++) game.draw.rect(W / 2 + (a - (AMMO_MAX - 1) / 2) * 60 - 18, 150, 36, 36, a < ammo ? C.d : '#332200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
