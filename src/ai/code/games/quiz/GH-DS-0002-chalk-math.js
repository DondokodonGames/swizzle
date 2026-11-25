// GH-DS-0002-chalk-math.js
// チョークマス — 黒板の計算問題を、消される前に答える。3問間違えると放課後
// 操作: 答えの数字を消される前にタップ
// 終わり: 5問正解で成功。3回間違えると失敗
// @mechanic: reaction_duel
// @theme: chalkboard
// 世界観: 黒板に問題が書かれ、チョークの粉が消していく。消える前に正しい数字を選べば次の問題へ
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s MONO: 白 + 帯の単色。白ドット + カラーセロハンの帯
  var C = {
    bg: '#0a0a0a', board: '#141414', chalk: '#f0f0f0', band: '#ffb020',
    good: '#f0f0f0', bad: '#ff5050', gold: '#ffb020', white: '#f0f0f0',
  };

  var GAME_TITLE = 'CHALK MATH';
  var TARGET_CORRECT = 5, MAX_WRONG = 3, Q_TIME = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, correctN = 0, wrongN = 0;

  var a, b, op, answer, choices, qT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHALK_SPRITE = ['###', '###', '.#.'];

  function boardBg() {
    game.draw.gradient(0, H, [[0, '#141414'], [0.5, C.bg], [1, '#000000']]);
    game.draw.sprite(CHALK_SPRITE, { '#': C.chalk }, W * 0.12, H * 0.10, 9, { anchor: 'center' });
    game.draw.sprite(CHALK_SPRITE, { '#': C.chalk }, W * 0.88, H * 0.10, 9, { anchor: 'center' });
    // カラーセロハンの帯(1色だけ)
    game.draw.rect(0, H * 0.30, W, 60, C.band, 0.18);
    game.draw.rect(W * 0.5 - 320, H * 0.20, 640, H * 0.42, C.board);
    game.draw.rect(W * 0.5 - 320, H * 0.20, 640, 8, C.chalk, 0.3);
    // 白ドット(粒状ノイズ)
    for (var i = 0; i < 60; i++) { var gx = (i * 137 + 19) % W, gy = (i * 271 + 53) % H; game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.05); }
  }

  function newQuestion() {
    op = Math.random() < 0.5 ? '+' : '-';
    if (op === '+') { a = 1 + Math.floor(Math.random() * 9); b = 1 + Math.floor(Math.random() * 9); answer = a + b; }
    else { a = 3 + Math.floor(Math.random() * 9); b = 1 + Math.floor(Math.random() * a); answer = a - b; }
    var set = [answer];
    while (set.length < 4) {
      var d = answer + (Math.floor(Math.random() * 7) - 3);
      if (d >= 0 && set.indexOf(d) === -1) set.push(d);
    }
    for (var i = set.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = set[i]; set[i] = set[j]; set[j] = t; }
    choices = set;
    qT = Math.max(1.4, Q_TIME - correctN * 0.12);
  }

  function initGame() {
    correctN = 0; wrongN = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newQuestion();
  }

  var CHOICE_Y = H * 0.66;
  var CHOICE_X = [W * 0.22, W * 0.5, W * 0.78];
  var CHOICE_X2 = H * 0.78;

  function choicePos(i) {
    if (i < 2) return { x: i === 0 ? W * 0.30 : W * 0.70, y: CHOICE_Y };
    return { x: i === 2 ? W * 0.30 : W * 0.70, y: CHOICE_X2 };
  }

  function judge(picked) {
    if (done || ready > 0 || finished) return;
    hitStop = 0.06;
    if (picked === answer) {
      correctN++;
      game.feedback.good(W / 2, H * 0.44, { text: 'OK', color: C.good });
      game.fx.burst(W / 2, H * 0.44, { color: C.band, count: 12, speed: 320 });
      game.audio.play('se_success', 0.35);
      if (correctN >= TARGET_CORRECT) { ok = true; finished = true; finish(); return; }
      game.fx.popup(correctN + ' / ' + TARGET_CORRECT, W / 2, H * 0.16, { color: C.band, size: 42 });
    } else {
      wrongN++;
      game.feedback.bad(W / 2, H * 0.44, { text: 'NG' });
      shake = 0.12;
      game.audio.play('se_bad', 0.35);
      if (wrongN >= MAX_WRONG) { ok = false; finished = true; finish(); return; }
    }
    newQuestion();
  }

  function tapChoice(x, y) {
    for (var i = 0; i < choices.length; i++) {
      var p = choicePos(i);
      if (Math.hypot(x - p.x, y - p.y) < 100) { judge(choices[i]); return; }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapChoice(x, y);
  });

  // ── ATTRACT ゴースト実演: 正しい数字だけをタップ ──
  var demo = { t: 0, gx: W * 0.30, gy: CHOICE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) newQuestion();
    var correctIdx = choices.indexOf(answer);
    var p = choicePos(correctIdx < 0 ? 0 : correctIdx);
    demo.gx += (p.x - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (p.y - demo.gy) * Math.min(1, dt * 5);
    demo.press = cyc > 1.5 && cyc < 1.7;
    if (cyc > 1.5 && cyc < 1.53) { game.feedback.good(W / 2, H * 0.44, { text: 'OK', color: C.good }); game.fx.burst(W / 2, H * 0.44, { color: C.band, count: 10, speed: 300 }); }
  }

  function drawQuestion() {
    txt(a + ' ' + op + ' ' + b + ' = ?', W / 2, H * 0.30, 72, C.chalk);
    for (var i = 0; i < choices.length; i++) {
      var p = choicePos(i);
      game.draw.circle(p.x, p.y, 80, C.board);
      game.draw.circle(p.x, p.y, 80, C.chalk, 0.0);
      game.draw.circle(p.x, p.y, 82, C.chalk, 0.6);
      txt(String(choices[i]), p.x, p.y + 16, 54, C.chalk);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (a === undefined) initGame();
      boardBg();
      stepDemo(dt);
      drawQuestion();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.11, 54, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.15, 26, C.band);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.band);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawQuestion();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.11, 58, ok ? C.good : C.bad);
      txt(correctN + ' / ' + TARGET_CORRECT, W / 2, H * 0.90, 34, C.band);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ correct: correctN });
        else game.end.failure({ correct: correctN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      qT -= dt;
      if (qT <= 0) { wrongN++; game.feedback.bad(W / 2, H * 0.44, { text: 'MISS' }); if (wrongN >= MAX_WRONG) { ok = false; finished = true; finish(); } else newQuestion(); }
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawQuestion();

    for (var w = 0; w < MAX_WRONG; w++) game.draw.circle(80 + w * 56, 80, 16, w < wrongN ? C.bad : '#ffffff', w < wrongN ? 1 : 0.3);
    txt(correctN + ' / ' + TARGET_CORRECT, W / 2, H * 0.06, 34, C.band);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 62, C.band);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
