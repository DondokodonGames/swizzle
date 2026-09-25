// D-20172021-0072-dune-tunnel-roll.js
// デューン・トンネル・ロール — 指の高さに付いてくる相棒球体で、迫る岩壁の隙間をくぐり抜けて出口まで進む
// 操作: 画面を押したまま指を上下に動かす。相棒球体は指の高さへぴったり付いてくる
// 終わり: 規定数の岩壁の隙間を抜ければ成功。岩壁に当たる/時間切れで失敗
// @mechanic: drag_follow
// @theme: dune_tunnel_gap_roll
// 世界観: 砂漠の遺構探検隊の相棒球体ロボットが、指の高さにぴったり付いてきながら埋設された岩壁の隙間をくぐり抜け、出口の光まで転がり抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐり抜けた岩壁数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: クォータービュー、菱形グリッドの床、影で高さを示す
  var STYLE = { bg: ['#3a2a18', '#1a1208'], main: ['#d9a05a', '#8a5a2a'], accent: ['#ffd24d', '#3dd6c8'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], sand: '#c98a4b', sandDark: '#8a5a2a',
    rock: '#5a4030', rockWarn: '#ff4d5e', goalLight: '#3dd6c8',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd24d', ink: '#fff3dc', white: '#ffffff',
  };

  var GAME_TITLE = 'DUNE GAP ROLL';
  var BX = W * 0.3;
  var BALL_R = 44;
  var WALL_THICK = 70;
  var SCROLL_SPEED = 420;
  var GAP_H = 340;
  var TARGET_GATES = 7;
  var TIME_LIMIT = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var scroll = game.time.elapsed * SCROLL_SPEED;
    for (var row = 0; row < 22; row++) {
      var oy = row * 90;
      var ox = -(scroll % 180) + (row % 2 === 0 ? 0 : 90);
      for (var col = -1; col < 8; col++) {
        var c2 = ((row + col) % 2 === 0) ? C.sand : C.sandDark;
        game.draw.rect(ox + col * 180, oy, 70, 5, c2, 0.2);
      }
    }
    // 出口の光(常時見えるゴール記号)
    game.draw.circle(W - 40, H * 0.5, 60, C.goalLight, 0.15 + 0.1 * Math.sin(game.time.elapsed * 3));
  }

  var ballY, targetY, vy, walls, spawnX, passed, timeLeft, done, endWait, finished, ready, hitStop, shake, milestoneHalf;

  function initGame() {
    ballY = H * 0.42; targetY = ballY; vy = 0;
    walls = []; spawnX = W + 120; passed = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneHalf = false;
    for (var i = 0; i < 3; i++) spawnWall(W + 300 + i * 480);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function spawnWall(x) {
    var margin = GAP_H / 2 + 120;
    var gapY = game.random(margin, H * 0.72 - margin) + margin * 0.3;
    walls.push({ x: x, gapY: gapY, passedFlag: false, telegraphed: false });
  }

  function updatePlay(dt) {
    var dy = targetY - ballY;
    vy += dy * 6 * dt;
    vy *= Math.pow(0.5, dt);
    ballY += vy * dt;
    ballY = Math.max(BALL_R + 20, Math.min(H * 0.9, ballY));

    for (var i = walls.length - 1; i >= 0; i--) {
      var w = walls[i];
      w.x -= SCROLL_SPEED * dt;
      var timeToArrive = (w.x - BX) / SCROLL_SPEED;
      if (!w.telegraphed && timeToArrive < 0.6) w.telegraphed = true;

      if (!w.passedFlag && w.x + WALL_THICK / 2 < BX - BALL_R) {
        w.passedFlag = true;
        passed++;
        game.feedback.good(BX, ballY, { text: 'GOOD', color: C.good });
        game.audio.play(passed % 2 === 0 ? 'se_milestone' : 'se_good', 0.3);
        if (!milestoneHalf && passed >= Math.ceil(TARGET_GATES / 2)) {
          milestoneHalf = true;
          game.fx.popup('NICE', BX, ballY - 180, { color: C.gold, size: 32 });
        }
        if (passed >= TARGET_GATES) {
          ok = true; finished = true; hitStop = 0.3;
          game.feedback.good(BX, ballY, { text: 'CLEAR', color: C.good });
          game.audio.play('se_success', 0.5);
          finish();
          return;
        }
      }

      var overlapX = Math.abs(w.x - BX) < (WALL_THICK / 2 + BALL_R);
      if (overlapX) {
        var inGap = Math.abs(ballY - w.gapY) < (GAP_H / 2 - BALL_R * 0.4);
        if (!inGap) {
          ok = false; finished = true;
          hitStop = 0.4; shake = 0.3;
          game.feedback.bad(BX, ballY, { text: 'MISS' });
          game.audio.play('se_bad', 0.45);
          finish();
          return;
        }
      }

      if (w.x < -400) {
        walls.splice(i, 1);
        spawnWall(spawnX);
        spawnX += 480;
      }
    }

    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(BX, ballY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var col = (w.telegraphed && w.x > 0) ? C.rockWarn : C.rock;
      var topH = w.gapY - GAP_H / 2;
      var botY = w.gapY + GAP_H / 2;
      game.draw.rect(w.x - WALL_THICK / 2, 0, WALL_THICK, Math.max(0, topH), col);
      game.draw.rect(w.x - WALL_THICK / 2, botY, WALL_THICK, Math.max(0, H - botY), col);
      if (w.telegraphed && w.x > 0) {
        game.draw.rect(w.x - WALL_THICK / 2 - 6, 0, 6, Math.max(0, topH), C.rockWarn, 0.4 + 0.3 * Math.sin(game.time.elapsed * 14));
        game.draw.rect(w.x - WALL_THICK / 2 - 6, botY, 6, Math.max(0, H - botY), C.rockWarn, 0.4 + 0.3 * Math.sin(game.time.elapsed * 14));
      }
    }
    var jx = hitStop > 0 ? game.random(-6, 6) : 0;
    game.draw.circle(BX + jx, ballY + 20, BALL_R * 0.7, '#000000', 0.3);
    game.draw.circle(BX + jx, ballY, BALL_R, hitStop > 0 && finished && !ok ? '#ffffff' : C.goalLight);
    game.draw.sprite(BOT, { '#': '#0a2a2a' }, BX + jx, ballY, 14, { anchor: 'center' });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) {
      targetY = y;
      game.audio.play('se_tap', 0.08);
      game.fx.burst(BX, ballY, { color: C.goalLight, count: 6, speed: 160 });
    }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) {
      targetY = y;
      if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
    }
  });

  var demo = { t: 0, gx: BX, gy: H * 0.42, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) initGame();
    var nextGap = null;
    for (var i = 0; i < walls.length; i++) { if (walls[i].x > BX) { nextGap = walls[i]; break; } }
    targetY = nextGap ? nextGap.gapY : ballY;
    demo.gx = BX; demo.gy = targetY; demo.press = true;
    if (!finished) updatePlay(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballY === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx + 140, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(passed + ' / ' + TARGET_GATES, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_GATES - passed) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, target: TARGET_GATES });
        else game.end.failure({ passed: passed, target: TARGET_GATES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updatePlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(passed + ' / ' + TARGET_GATES, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#000000', 0.4);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    for (var nI = 0; nI < TARGET_GATES; nI++) {
      game.draw.circle(80 + nI * 130, 190, 10, nI < passed ? C.gold : '#3a2a18');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
