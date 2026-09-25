// D-20132016-0057-comet-green-sink.js
// コメットグリーンシンク — 指で引いて放し、光る彗星球をクレーターの穴へ沈める
// 操作: 球を引く方向と強さをドラッグで決め、指を離して発射する。逆方向へ飛ぶ
// 終わり: 規定打数(3打)以内に穴へ沈めれば成功。打ち尽くして沈まなければ失敗
// @mechanic: slingshot
// @theme: crater_comet_green
// 世界観: 小さな衛星の観測員が、引いて放つ光る彗星球をクレーターだらけのグリーンへ打ち、奥のホールクレーターへ沈める
// 残るもの: 正誤(CLEAR/GAME OVER) + 使用打数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの限定パレット、太めの輪郭、平坦な塗り
  var C = {
    bg: '#0e2a1a', bg2: '#123a22', green: '#1d5c34', greenLine: '#164a29',
    ball: '#7ff0ff', ballCore: '#ffffff', hole: '#050a08', holeRing: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4fff2', ink: '#04120a',
    aim: '#ffe14d',
  };

  var GAME_TITLE = 'COMET SINK';
  var STROKES_MAX = 3;
  var TEE = { x: W * 0.5, y: H * 0.84 };
  var HOLE = { x: W * 0.5, y: H * 0.22, r: 46 };
  var BALL_R = 22;
  var POWER_SCALE = 3.1;
  var MAX_DRAG = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var strokesUsed, ballX, ballY, vx, vy, flying, aiming, aimStart, aimNow, done, endWait, finished;
  var ready, hitStop, shake, sunk;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CADDIE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.05 + 0.09 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', Math.max(0, pulse));
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), C.greenLine, 0.5);
    var orbitA = W * 0.2 + Math.sin(game.time.elapsed * 0.9) * 30;
    var orbitB = W * 0.82 + Math.cos(game.time.elapsed * 0.8) * 30;
    game.draw.circle(orbitA, H * 0.45, 60, C.greenLine, 0.4);
    game.draw.circle(orbitB, H * 0.62, 80, C.greenLine, 0.4);
  }

  function drawHole() {
    game.draw.circle(HOLE.x, HOLE.y, HOLE.r + 14, C.holeRing, 0.5);
    game.draw.circle(HOLE.x, HOLE.y, HOLE.r, C.hole);
  }

  function drawBall(x, y) {
    game.draw.circle(x, y, BALL_R, C.ball);
    game.draw.circle(x - 5, y - 5, BALL_R * 0.4, C.ballCore, 0.8);
  }

  function drawCaddie() {
    var bx = TEE.x + 90 + Math.sin(game.time.elapsed * 2.1) * 14;
    var by = TEE.y - 10 + Math.cos(game.time.elapsed * 1.7) * 10;
    game.draw.sprite(CADDIE, { '#': C.gold }, bx, by, 12, { anchor: 'center' });
  }

  function initGame() {
    strokesUsed = 0; ballX = TEE.x; ballY = TEE.y; vx = 0; vy = 0;
    flying = false; aiming = false; aimStart = null; aimNow = null;
    done = false; endWait = 0; finished = false; sunk = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function launch(dx, dy) {
    var len = Math.hypot(dx, dy);
    if (len < 8) return;
    var clamped = Math.min(len, MAX_DRAG);
    var nx = dx / len, ny = dy / len;
    vx = -nx * clamped * POWER_SCALE;
    vy = -ny * clamped * POWER_SCALE;
    flying = true; aiming = false;
    game.audio.play('se_powerup', 0.4);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || flying) return;
    aiming = true; aimStart = { x: x, y: y }; aimNow = { x: x, y: y };
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    aimNow = { x: x, y: y };
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    var dx = x - aimStart.x, dy = y - aimStart.y;
    aiming = false;
    launch(dx, dy);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveStrokeEnd() {
    flying = false; vx = 0; vy = 0;
    strokesUsed++;
    if (strokesUsed === STROKES_MAX - 1) game.fx.popup('LAST SHOT!', W * 0.5, H * 0.4, { color: C.gold, size: 38 });
    if (strokesUsed >= STROKES_MAX) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(ballX, ballY, { text: 'MISS' });
      finish();
    }
  }

  function updateFlight(dt) {
    ballX += vx * dt; ballY += vy * dt;
    vx *= Math.pow(0.55, dt); vy *= Math.pow(0.55, dt);
    if (ballX < BALL_R + 40) { ballX = BALL_R + 40; vx = Math.abs(vx) * 0.55; }
    if (ballX > W - BALL_R - 40) { ballX = W - BALL_R - 40; vx = -Math.abs(vx) * 0.55; }
    if (ballY < HOLE.y + 60 && ballY < H * 0.14) { ballY = H * 0.14; vy = Math.abs(vy) * 0.5; }
    if (ballY > H * 0.9) { ballY = H * 0.9; vy = -Math.abs(vy) * 0.5; }
    var dist = Math.hypot(ballX - HOLE.x, ballY - HOLE.y);
    if (dist < HOLE.r - 6) {
      sunk = true; ok = true; finished = true; hitStop = 0.35;
      game.feedback.good(HOLE.x, HOLE.y, { text: 'SUNK!', color: C.good });
      game.fx.burst(HOLE.x, HOLE.y, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
      return;
    }
    var speed = Math.hypot(vx, vy);
    if (speed < 12) resolveStrokeEnd();
  }

  var demo = {
    t: 0, gx: TEE.x, gy: TEE.y, press: false,
    bx: TEE.x, by: TEE.y, bvx: 0, bvy: 0, flying: false, phase: 'pull',
  };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      demo.bx = TEE.x; demo.by = TEE.y; demo.bvx = 0; demo.bvy = 0; demo.flying = false; demo.phase = 'pull';
    }
    if (cyc < 1.0) {
      demo.phase = 'pull';
      var p = cyc / 1.0;
      demo.gx = TEE.x + p * 40; demo.gy = TEE.y + p * 90; demo.press = true;
    } else if (cyc < 1.15 && !demo.flying) {
      demo.flying = true;
      demo.bvx = 0; demo.bvy = (HOLE.y - TEE.y) / 1.15 - 60;
      game.audio.play('se_powerup', 0.25);
    } else if (demo.flying) {
      demo.by += demo.bvy * dt;
      demo.bvy *= Math.pow(0.55, dt);
      demo.gx = demo.bx; demo.gy = demo.by; demo.press = false;
      if (demo.by <= HOLE.y + 8) {
        demo.flying = false;
        game.feedback.good(HOLE.x, HOLE.y, { text: 'SUNK!', color: C.good });
        game.audio.play('se_good', 0.25);
        demo.by = HOLE.y; demo.bx = HOLE.x;
      }
    }
  }

  game.onUpdate(function(dt) {
    var sway = Math.sin(game.time.elapsed * 1.8) * 4;

    if (state === S.ATTRACT) {
      if (ballX === undefined) initGame();
      bg();
      stepDemo(dt);
      drawHole();
      drawCaddie();
      if (demo.flying) {
        for (var ti = 1; ti <= 3; ti++) {
          game.draw.circle(demo.bx + sway, demo.by + ti * 26, BALL_R * (1 - ti * 0.22), C.ball, 0.22 / ti);
        }
      }
      drawBall(demo.bx + sway, demo.by);
      game.draw.hand(demo.gx + sway * 3, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHole();
      drawBall(ballX, ballY);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(strokesUsed + ' / ' + STROKES_MAX, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(STROKES_MAX - strokesUsed, { strokes: strokesUsed, max: STROKES_MAX });
        else game.end.failure({ strokes: strokesUsed, max: STROKES_MAX });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (flying) updateFlight(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHole();
    drawCaddie();
    if (aiming && aimStart && aimNow) {
      var dx = aimNow.x - aimStart.x, dy = aimNow.y - aimStart.y;
      var len = Math.min(Math.hypot(dx, dy), MAX_DRAG);
      var ang = Math.atan2(dy, dx);
      var ex = ballX - Math.cos(ang) * len, ey = ballY - Math.sin(ang) * len;
      game.draw.line(ballX, ballY, ex, ey, C.aim, 6);
      game.draw.rect(60, 200, W - 120, 14, C.ink, 0.5);
      game.draw.rect(60, 200, (W - 120) * (len / MAX_DRAG), 14, C.aim);
    }
    drawBall(ballX, ballY);

    for (var i = 0; i < STROKES_MAX; i++) {
      var used = i < strokesUsed;
      game.draw.circle(W * 0.5 - (STROKES_MAX - 1) * 26 + i * 52, H * 0.06, 16, used ? C.ink : C.gold, used ? 0.5 : 1);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.4], ['B3', 0.4], ['D4', 0.4], ['G4', 0.8]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
