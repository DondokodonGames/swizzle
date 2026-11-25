// D-20222026-0056-crossroad-choice.js
// クロスロードチョイス — 歩みを進めた先で訪れる一つの岐路を、示された条件を読んで正しい側へ進む
// 操作: 駒を規定歩数まで送り、止まった岐路で提示条件に合う側のゾーンをタップして選ぶ
// 終わり: 前進を終え、岐路で正しい側を選べば成功。誤った側を選ぶ/時間切れで失敗
// @mechanic: judge
// @theme: crossroad_choice
// 世界観: 節目の一日を迎えた旅人の駒が、盤上をいくつか進んだ先の岐路に立ち、示された条件を読んで正しい道へ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 前進した歩数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラット単色、丸角
  var C = {
    bg: '#eef3fb', bg2: '#dfe9fb', path: '#c7d3ea', pathDone: '#3d7dff',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ff9f1c', ink: '#152238',
    zoneA: '#3d7dff', zoneB: '#ff6f91',
  };

  var GAME_TITLE = 'CROSSROAD';
  var TIME_LIMIT = 14;
  var STEPS = 3;
  var STEP_X0 = W * 0.20, STEP_X1 = W * 0.80, STEP_Y = H * 0.30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TRAVELER_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#3d7dff', pulse * 0.4);
  }

  var step, tokenX, phase, statA, statB, needHigher, choiceMade;
  var timeLeft, hits, done, endWait, finished, ready, hitStop, shake;

  function stepX(i) { return STEP_X0 + (STEP_X1 - STEP_X0) * (i / STEPS); }

  function initGame() {
    step = 0; tokenX = stepX(0); phase = 'advance';
    statA = 1 + Math.floor(Math.random() * 5);
    statB = 1 + Math.floor(Math.random() * 5);
    while (statB === statA) statB = 1 + Math.floor(Math.random() * 5);
    needHigher = true; // event favors the higher-value zone
    choiceMade = false;
    timeLeft = TIME_LIMIT; hits = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawPath() {
    game.draw.line(STEP_X0, STEP_Y, STEP_X1, STEP_Y, C.path, 20);
    var doneW = (tokenX - STEP_X0);
    if (doneW > 0) game.draw.line(STEP_X0, STEP_Y, STEP_X0 + doneW, STEP_Y, C.pathDone, 14);
    for (var i = 0; i <= STEPS; i++) {
      game.draw.circle(stepX(i), STEP_Y, 22, i * (STEP_X1 - STEP_X0) / STEPS + STEP_X0 <= tokenX + 2 ? C.pathDone : C.path);
    }
    game.draw.sprite(TRAVELER_SPRITE, { '#': C.gold }, tokenX, STEP_Y - 50, 30, { anchor: 'center' });
  }

  function drawEvent() {
    if (phase !== 'choice') return;
    game.draw.rect(W * 0.5 - 320, H * 0.44, 640, 260, '#ffffff', 0.9);
    game.draw.circle(W * 0.32, H * 0.62, 110, C.zoneA);
    txt(String(statA), W * 0.32, H * 0.62 + 14, 44, '#ffffff');
    game.draw.circle(W * 0.68, H * 0.62, 110, C.zoneB);
    txt(String(statB), W * 0.68, H * 0.62 + 14, 44, '#ffffff');
  }

  function onAdvanceTap() {
    if (step >= STEPS) return;
    step++;
    tokenX = stepX(step);
    game.audio.play('se_tap', 0.2);
    game.fx.burst(tokenX, STEP_Y, { color: C.gold, count: 8, speed: 200 });
    if (step >= STEPS) {
      phase = 'choice';
      game.audio.play('se_milestone', 0.3);
    }
  }

  function onChoiceTap(x, y) {
    var correctIsA = statA > statB;
    var pickedA = Math.hypot(x - W * 0.32, y - H * 0.62) < 110;
    var pickedB = Math.hypot(x - W * 0.68, y - H * 0.62) < 110;
    if (!pickedA && !pickedB) return;
    choiceMade = true;
    var right = (pickedA && correctIsA) || (pickedB && !correctIsA);
    var zx = pickedA ? W * 0.32 : W * 0.68;
    if (right) {
      hits = 1;
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(zx, H * 0.62, { text: 'GOOD', color: C.good });
      game.fx.burst(zx, H * 0.62, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(zx, H * 0.62, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (phase === 'advance') onAdvanceTap();
    else if (phase === 'choice' && !choiceMade) onChoiceTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: stepX(0), gy: STEP_Y - 50, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) initGame();
    if (cyc < 2.4) {
      var idx = Math.min(STEPS, Math.floor((cyc / 2.4) * (STEPS + 1)));
      if (idx > step && idx <= STEPS) { step = idx; tokenX = stepX(step); if (step >= STEPS) phase = 'choice'; }
      demo.gx = tokenX; demo.gy = STEP_Y - 50;
      demo.press = (Math.floor(cyc * 4) % 2 === 0);
    } else if (cyc < 4.5) {
      var correctIsA = statA > statB;
      var zx = correctIsA ? W * 0.32 : W * 0.68;
      demo.gx = zx; demo.gy = H * 0.62;
      demo.press = cyc > 3.8;
      if (cyc > 3.8 && !choiceMade) {
        choiceMade = true; hits = 1;
        game.feedback.good(zx, H * 0.62, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (step === undefined) initGame();
      stepDemo(dt);
      bg();
      drawPath();
      drawEvent();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      drawEvent();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(step + ' / ' + STEPS, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと1歩!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { steps: step, cleared: hits });
        else game.end.failure({ steps: step, cleared: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, STEP_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    drawEvent();

    txt(step + ' / ' + STEPS, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#c7d3ea', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.5]], { tempo: 124, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
