// D-20132016-0022-signal-relay-call.js
// シグナルリレー — 遭難信号から届く状況に、正しい指示を選んで即座に打ち返す
// 操作: 届く状況表示に対し、下の2択ゾーンのうち正しい指示側を素早くタップする
// 終わり: 規定回数すべて正しい指示を選べば成功。1回でも誤答/時間切れがあれば失敗
// @mechanic: judge
// @theme: distress_signal_relay
// 世界観: 山間の遭難信号を受ける通信基地。届く状況に対し3つの指示を瞬時に選び打ち返し、相手の生還を導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 正答数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var C = {
    bg1: '#081c14', bg2: '#03110a', frame: '#1fae5a', frameDim: '#0e4a2a',
    good: '#3dffa0', bad: '#ff4d4d', gold: '#e8ff5a', white: '#dfffe8', ink: '#02100a',
  };

  var GAME_TITLE = 'SIGNAL RELAY';
  var ROUNDS = 3;
  var ROUND_TIME = 2.6;

  // 状況(数値/記号のみで表現するアイコンID) → 正しい選択側(0=左,1=右)
  var SITS = [
    { icon: 'cold', left: 'fire', right: 'water', correct: 0 },
    { icon: 'bleed', left: 'press', right: 'run', correct: 0 },
    { icon: 'lost', left: 'stay', right: 'climb', correct: 0 },
    { icon: 'storm', left: 'shelter', right: 'move', correct: 0 },
    { icon: 'hunger', left: 'ration', right: 'eatall', correct: 0 },
  ];
  var ICONS = {
    cold: ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'],
    bleed: ['..#..', '.###.', '#####', '.###.', '..#..'],
    lost: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    storm: ['#.#.#', '.#.#.', '#.#.#', '.#.#.', '#.#.#'],
    hunger: ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
    fire: ['..#..', '.###.', '#####', '#####', '.....'],
    water: ['.....', '..#..', '.###.', '#####', '.....'],
    press: ['#####', '#...#', '#...#', '#...#', '#####'],
    run: ['.#...', '..#..', '...#.', '..#..', '.#...'],
    stay: ['.....', '.###.', '.###.', '.###.', '.....'],
    climb: ['..#..', '.###.', '..#..', '.###.', '..#..'],
    shelter: ['..#..', '.###.', '#####', '#.#.#', '#...#'],
    move: ['#....', '.#...', '..#..', '...#.', '....#'],
    ration: ['#.#.#', '#.#.#', '.....', '#.#.#', '#.#.#'],
    eatall: ['#####', '#####', '#####', '#####', '#####'],
  };

  var LX = W * 0.28, RX = W * 0.72, OPT_Y = H * 0.80, OPT_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var order, ri, correctCount, roundTimer, done, endWait, finished;
  var ready, hitStop, shake, sit;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 14; i++) game.draw.line(0, i * H / 14, W, i * H / 14, '#ffffff05', 1);
    game.draw.rect(30, 30, W - 60, H - 60, C.frameDim, 0.0);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function pickOrder() {
    var arr = SITS.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr.slice(0, ROUNDS);
  }

  function initGame() {
    order = pickOrder(); ri = 0; correctCount = 0; roundTimer = ROUND_TIME;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    sit = order[0];
  }

  function drawSituation() {
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    game.draw.circle(W * 0.5, H * 0.32 + bob, 80, C.frame, 0.15);
    game.draw.sprite(ICONS[sit.icon], { '#': C.frame }, W * 0.5, H * 0.32 + bob, 16, { anchor: 'center' });
  }

  function drawOptions(hlLeft, hlRight) {
    game.draw.circle(LX, OPT_Y, OPT_R, hlLeft ? C.good : '#00000030');
    game.draw.circle(RX, OPT_Y, OPT_R, hlRight ? C.bad : '#00000030');
    game.draw.sprite(ICONS[sit.left], { '#': C.white }, LX, OPT_Y, 14, { anchor: 'center' });
    game.draw.sprite(ICONS[sit.right], { '#': C.white }, RX, OPT_Y, 14, { anchor: 'center' });
  }

  function resolve(side, px, py) {
    if (done || finished || ready > 0) return;
    var correct = side === sit.correct;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      correctCount++;
      game.feedback.good(px, py, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (correctCount === Math.ceil(ROUNDS / 2)) { game.fx.popup(correctCount + ' / ' + ROUNDS, W * 0.5, H * 0.5, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (ri + 1 >= ROUNDS) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); return; }
      ri++; sit = order[ri]; roundTimer = ROUND_TIME;
    } else {
      game.feedback.bad(px, py, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    if (game.hit.circle(x, y, 1, LX, OPT_Y, OPT_R)) { game.audio.play('se_tap', 0.1); resolve(0, x, y); }
    else if (game.hit.circle(x, y, 1, RX, OPT_Y, OPT_R)) { game.audio.play('se_tap', 0.1); resolve(1, x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LX, gy: OPT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var phase = cyc % 1.2;
    var tx = sit.correct === 0 ? LX : RX;
    demo.gx = tx; demo.gy = OPT_Y;
    demo.press = phase > 0.75 && phase < 0.95;
    if (phase > 0.8 && phase < 0.8 + dt * 1.5 && !done && !finished) resolve(sit.correct, tx, OPT_Y);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSituation();
      drawOptions(false, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawSituation(); drawOptions(false, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(correctCount + ' / ' + ROUNDS, W / 2, H * 0.11, 26, C.gold);
      if (!ok) txt('あと1問!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correctCount, { correct: correctCount, rounds: ROUNDS });
        else game.end.failure({ correct: correctCount, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0; ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSituation();
    var warn = roundTimer < 0.8 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    drawOptions(false, false);

    txt(correctCount + ' / ' + ROUNDS, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, H * 0.58, W - 120, 16, '#00000040');
    game.draw.rect(60, H * 0.58, (W - 120) * (roundTimer / ROUND_TIME), 16, warn ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
