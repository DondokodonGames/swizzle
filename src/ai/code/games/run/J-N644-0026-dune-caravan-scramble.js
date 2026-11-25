// J-N644-0026-dune-caravan-scramble.js
// デューン・キャラバン・スクランブル — 崩れゆく砂丘を足場を選んで駆け上がり、迫る砂の奔流より先に頂上を目指す
// 操作: 表示された左右どちらかの足場を交互にタップして駆け上がる
// 終わり: 頂上の旗に迫る砂より先に到達すれば成功。砂に追いつかれるとGAME OVER
// @mechanic: camera_climb
// @theme: collapsing_dune_climb
// 世界観: 隊商の荷運び人が、崩れゆく砂丘の斜面を足場を選んで駆け上がり、追い上げる砂の奔流に飲み込まれる前に頂上の旗まで登り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達高度
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色パレット、太い矩形ブロック、粗いドット感
  var C = {
    sky: '#e8c583', sky2: '#f2dca6', duneFar: '#d4a85e', dune: '#c99a4e',
    sand: '#e0bd6f', sandDark: '#8a5a20',
    porter: '#3a6a8f', porterDark: '#1e3d55', flag: '#ff5c3a',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#3a2510',
  };

  var GAME_TITLE = 'DUNE SCRAMBLE';
  var CLIMB_LEN = 1600;
  var TIME_LIMIT = 18;
  var CLIMB_STEP = 46;
  var SAND_SPEED = 130;
  var SAND_ACCEL = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PORTER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var FLAG_SPRITE = ['#...', '##..', '###.', '#...', '#...'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.sky2]]);
    var t = game.time.elapsed;
    for (var i = 0; i < 5; i++) {
      var xx = ((t * 20 + i * 240) % (W + 200)) - 100;
      game.draw.rect(xx, H * 0.30 + (i % 2) * 20, 160, 40, C.duneFar, 0.5);
    }
  }

  var height, sandHeight, footL, footR, nextIsRight, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    height = 0; sandHeight = -200; nextIsRight = Math.random() < 0.5;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function playerY() { return H * 0.72 - Math.min(height, CLIMB_LEN * 0.5); }
  function sandY() { return H * 0.72 - Math.min(sandHeight, CLIMB_LEN * 0.5); }

  function drawScene() {
    bg();
    var camShift = Math.max(0, height - CLIMB_LEN * 0.5);
    game.draw.rect(0, H * 0.75 - camShift * 0 + 0, W, H * 0.4, C.dune);
    var py = playerY();
    var sy = sandY();
    var flagY = H * 0.72 - CLIMB_LEN * 0.5 - 60;
    var warn = (sy - py) < 220;
    var flashOn = warn && Math.floor(game.time.elapsed * 9) % 2 === 0;
    game.draw.rect(0, Math.min(H, sy), W, H, flashOn ? C.bad : C.sandDark, warn ? 0.55 : 0.4);
    game.draw.sprite(FLAG_SPRITE, { '#': C.flag }, W * 0.5, flagY, 24, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 60, py + 10, 40, 20, footL === 0 ? C.gold : C.sand, 0.9);
    game.draw.rect(W * 0.5 + 20, py + 10, 40, 20, footL === 1 ? C.gold : C.sand, 0.9);
    var bob = Math.sin(game.time.elapsed * 12) * 4;
    game.draw.sprite(PORTER_SPRITE, { '#': C.porter }, W * 0.5, py - 30 + bob, 26, { anchor: 'center' });
  }

  function stepClimb(side) {
    if (side === nextIsRight) {
      height += CLIMB_STEP;
      nextIsRight = !nextIsRight;
      footL = side;
      game.feedback.good(side === 1 ? W * 0.5 + 40 : W * 0.5 - 40, playerY(), { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.3);
      if (Math.floor(height / (CLIMB_LEN / 3)) > Math.floor((height - CLIMB_STEP) / (CLIMB_LEN / 3))) {
        game.fx.popup('NICE', W * 0.5, playerY() - 100, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (height >= CLIMB_LEN) {
        finished = true; ok = true;
        game.feedback.good(W * 0.5, playerY(), { text: 'CLEAR', color: C.good });
        game.fx.burst(W * 0.5, playerY(), { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(side === 1 ? W * 0.5 + 40 : W * 0.5 - 40, playerY(), { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      sandHeight += CLIMB_STEP * 0.6;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var side = x > W * 0.5 ? 1 : 0;
      stepClimb(side);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    var speed = SAND_SPEED + Math.min(120, height / CLIMB_LEN * SAND_ACCEL * 100);
    sandHeight += speed * dt * 0.3;
    if (!halfCalled && height >= CLIMB_LEN * 0.5) {
      halfCalled = true;
    }
    if (sandHeight >= height - 20) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(W * 0.5, playerY(), { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5 - 40, gy: H * 0.6, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    sandHeight += SAND_SPEED * dt * 0.18;
    demo.stepClock = (demo.stepClock || 0) + dt;
    if (demo.stepClock > 0.38 && height < CLIMB_LEN) {
      demo.stepClock = 0;
      var side = nextIsRight ? 1 : 0;
      demo.gx = side === 1 ? W * 0.5 + 40 : W * 0.5 - 40;
      demo.gy = playerY();
      demo.press = true;
      stepClimb(side);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (height === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(Math.round(height / 10) + ' / ' + (CLIMB_LEN / 10), W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round((CLIMB_LEN - height) / 40)) + '歩!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(height), { height: Math.round(height) });
        else game.end.failure({ height: Math.round(height) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene();
    var pct = Math.min(1, height / CLIMB_LEN);
    txt(Math.round(height / 10) + ' / ' + (CLIMB_LEN / 10), W * 0.5, H * 0.06, 28, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#8a5a20', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.25], ['A4', 0.25], ['C5', 0.25], ['F5', 0.5]], { tempo: 145, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
