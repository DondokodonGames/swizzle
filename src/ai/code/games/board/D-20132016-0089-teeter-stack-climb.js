// D-20132016-0089-teeter-stack-climb.js
// ティーター・スタック・クライム — 風に揺れる岩場で、一人で動物たちを崩さず積み上げる
// 操作: 左右に揺れる動物を、真下の安全な帯の上でタップして積む
// 終わり: 規定数を崩さず積めれば成功。安全な帯を外して積めば崩れて失敗
// @mechanic: stack
// @theme: solo_animal_stack_tower
// 世界観: 旅の芸人が、風に揺れる岩場の上でつぎつぎと運ばれてくる動物たちを一人で積み上げ、崩さず目標の高さを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 積み上げた段数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: ブロック状の塊、面ごとの明暗2段影
  var C = {
    bg: '#1a2438', bg2: '#101828', cliff: '#3a4a5e', cliffEdge: '#526478',
    safe: '#4dff8a', warn: '#ffcf3d', bad: '#ff4d5e', gold: '#ffd400',
    animalA: '#ff9a4d', animalB: '#4dc0ff', animalC: '#a0ff4d', animalD: '#ff6ad0',
    white: '#eef4ff', ink: '#080c14',
  };

  var GAME_TITLE = 'STACK CLIMB';
  var TARGET = 7;
  var TOL0 = 90, TOL_SHRINK = 5, TOL_MIN = 46;

  var ANIMALS = [
    ['.##.', '####', '.##.'],
    ['#..#', '####', '.##.'],
    ['.##.', '####', '#..#'],
    ['.##.', '####', '##.#'],
  ];
  var ACOLORS = [C.animalA, C.animalB, C.animalC, C.animalD];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.82, W, H * 0.1, C.cliff);
    game.draw.rect(0, H * 0.82, W, 5, C.cliffEdge);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  var stack, centerX, swingX, swingDir, windSpeed, animalIdx, topple;
  var done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  var BASE_Y = 0.8, STEP_Y = 0.075;

  function initGame() {
    stack = []; centerX = W * 0.5; swingX = W * 0.5; swingDir = 1; windSpeed = 0.9;
    animalIdx = Math.floor(game.random(0, 4)); topple = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function currentTolerance() {
    return Math.max(TOL_MIN, TOL0 - stack.length * TOL_SHRINK);
  }

  function drop(x, y) {
    if (finished || ready > 0 || done) return;
    var tol = currentTolerance();
    var offset = swingX - centerX;
    if (Math.abs(offset) > tol) {
      finished = true; ok = false; topple = 1; hitStop = 0.35;
      game.feedback.bad(swingX, H * (BASE_Y - stack.length * STEP_Y), { text: 'MISS' });
      shake = 0.35;
      finish();
      return;
    }
    stack.push({ x: swingX, col: ACOLORS[animalIdx], shape: ANIMALS[animalIdx] });
    centerX = centerX + offset * 0.4;
    game.audio.play('se_tap', 0.2);
    game.feedback.good(swingX, H * (BASE_Y - stack.length * STEP_Y), { text: null, color: C.safe, count: 8 });
    if (stack.length === Math.ceil(TARGET / 2) && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.4);
    }
    windSpeed += 0.14;
    animalIdx = Math.floor(game.random(0, 4));
    if (stack.length >= TARGET) {
      finished = true; ok = true; hitStop = 0.12;
      game.feedback.good(centerX, H * (BASE_Y - stack.length * STEP_Y), { text: 'CLEAR', color: C.safe });
      game.fx.burst(centerX, H * (BASE_Y - stack.length * STEP_Y), { color: C.gold, count: 22, speed: 400 });
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    drop(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawStack(fallOff) {
    game.draw.rect(centerX - 90, H * BASE_Y - 8, 180, 16, C.cliffEdge);
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      var by = H * (BASE_Y - (i + 1) * STEP_Y) + (fallOff ? fallOff * (i + 1) * 12 : 0);
      var bx = b.x + (fallOff ? fallOff * (i + 1) * 40 : 0);
      game.draw.sprite(b.shape, { '#': b.col }, bx, by, 22, { anchor: 'center' });
    }
  }

  function drawSwing() {
    if (finished) return;
    var tol = currentTolerance();
    var by = H * (BASE_Y - (stack.length + 1) * STEP_Y);
    game.draw.rect(centerX - tol, H * BASE_Y - stack.length * H * STEP_Y - 4, tol * 2, 8, C.safe, 0.35);
    game.draw.sprite(ANIMALS[animalIdx], { '#': ACOLORS[animalIdx] }, swingX, by - 60, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { stack = []; centerX = W * 0.5; windSpeed = 0.9; animalIdx = 0; }
    var per = 0.7;
    var idx = Math.floor(cyc / per);
    var within = (cyc % per) / per;
    swingX = centerX + Math.sin(cyc * windSpeed * 2.4) * 130;
    demo.gx = swingX; demo.gy = H * (BASE_Y - (stack.length + 1) * STEP_Y) - 60;
    demo.press = within > 0.45 && within < 0.6;
    if (demo.press && idx < 5 && stack.length === idx) {
      stack.push({ x: swingX, col: ACOLORS[animalIdx], shape: ANIMALS[animalIdx] });
      game.audio.play('se_tap', 0.12);
      game.fx.burst(swingX, demo.gy + 60, { color: C.safe, count: 6, speed: 150 });
      animalIdx = (animalIdx + 1) % 4;
      windSpeed += 0.1;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawStack(0);
      drawSwing();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.9, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStack(topple);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.safe : C.bad);
      txt(stack.length + ' / ' + TARGET, W / 2, H * 0.13, 28, C.gold);
      if (!ok && TARGET - stack.length <= 1) txt('あと1頭!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.9, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stack.length, { stacked: stack.length, target: TARGET });
        else game.end.failure({ stacked: stack.length, target: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      swingX = centerX + Math.sin(game.time.elapsed * windSpeed * 2.2) * (130 + stack.length * 6);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawStack(finished && !ok ? topple : 0);
    drawSwing();

    txt(stack.length + ' / ' + TARGET, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (stack.length / TARGET), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
