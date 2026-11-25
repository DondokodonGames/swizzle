// D-20222026-0046-locked-pin-marble.js
// ロックドピンマーブル — 番号順に光るピンを狙い、指定の長さだけ押し続けて引き抜き、玉を解放する
// 操作: 光っているピンを狙って指で長押しし、ゲージが満ちたら離して引き抜く。番号順を守る
// 終わり: 全ピンを順番どおりに抜けば成功。順番違反/短すぎる離し/時間切れで失敗
// @mechanic: hold_duration
// @theme: locked_pin_marble
// 世界観: 封印された箱庭細工師が、玉を閉じ込める板のピンを刻まれた番号順に長押しで引き抜き、玉を転がり出させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いたピン数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: くっきりピクセル輪郭+滑らかなグラデ影
  var C = {
    bg: '#2c2440', bg2: '#191428', board: '#4a3d68', boardEdge: '#6f5e96',
    pin: '#8f7bc4', pinDone: '#3fd67a', pinGlow: '#ffd23f',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#f2eefc', marble: '#ffffff',
  };

  var GAME_TITLE = 'PIN RELEASE';
  var TIME_LIMIT = 13;
  var HOLD_NEED = 0.6;
  var PIN_R = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  var PINS = [
    { x: W * 0.30, y: H * 0.34 },
    { x: W * 0.70, y: H * 0.34 },
    { x: W * 0.30, y: H * 0.52 },
    { x: W * 0.70, y: H * 0.52 },
  ];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#8f7bc4', pulse * 0.2);
    game.draw.sprite(SMITH_SPRITE, { '#': C.gold }, W * 0.85, H * 0.86, 10, { anchor: 'center' });
  }

  var order, doneIdx, cursorTarget, holdT, holding, marbleY;
  var timeLeft, hits, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newOrder() {
    var arr = [];
    for (var i = 0; i < PINS.length; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    order = newOrder();
    doneIdx = 0; cursorTarget = order[0];
    holdT = 0; holding = false; marbleY = H * 0.42;
    timeLeft = TIME_LIMIT; hits = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawBoard() {
    game.draw.rect(W * 0.5 - 300, H * 0.22, 600, 440, C.board);
    game.draw.rect(W * 0.5 - 300, H * 0.22, 600, 8, C.boardEdge, 0.6);
    game.draw.circle(W * 0.5, marbleY, 34, C.marble);
    game.draw.circle(W * 0.5, marbleY, 34, '#c9c2e0', 0.4);
    for (var i = 0; i < PINS.length; i++) {
      var p = PINS[i];
      var solved = order.indexOf(i) < doneIdx;
      var isCurrent = i === cursorTarget && !solved;
      game.draw.circle(p.x, p.y, PIN_R, solved ? C.pinDone : C.pin);
      txt(String(order.indexOf(i) + 1), p.x, p.y + 10, 30, '#1a1430');
      if (isCurrent) {
        var glow = 0.4 + 0.3 * Math.sin(game.time.elapsed * 7);
        game.draw.circle(p.x, p.y, PIN_R + 14, C.pinGlow, glow);
        if (holding) {
          game.draw.rect(p.x - 60, p.y + PIN_R + 24, 120, 14, '#1a1430', 0.6);
          game.draw.rect(p.x - 60, p.y + PIN_R + 24, 120 * Math.min(1, holdT / HOLD_NEED), 14, C.good);
        }
      }
    }
  }

  function onPinPress(i) {
    if (finished || ready > 0) return;
    var solved = order.indexOf(i) < doneIdx;
    if (solved) return;
    if (i !== cursorTarget) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(PINS[i].x, PINS[i].y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    holding = true; holdT = 0;
    game.audio.play('se_tap', 0.1);
  }

  function onPinRelease() {
    if (!holding) return;
    holding = false;
    var p = PINS[cursorTarget];
    if (holdT >= HOLD_NEED) {
      doneIdx++;
      hits++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(PINS.length / 2)) game.fx.popup('HALFWAY!', p.x, p.y - 90, { color: C.gold, size: 32 });
      if (doneIdx >= PINS.length) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(W * 0.5, marbleY, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      cursorTarget = order[doneIdx];
    } else {
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
    }
    holdT = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    for (var i = 0; i < PINS.length; i++) {
      if (Math.hypot(x - PINS[i].x, y - PINS[i].y) < PIN_R) { onPinPress(i); return; }
    }
  });
  game.onRelease(function() { if (state === S.PLAYING) onPinRelease(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PINS[0].x, gy: PINS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.7;
    var cyc = demo.t % (per * PINS.length + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(PINS.length - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    var p = PINS[order[idx]];
    demo.gx = p.x; demo.gy = p.y;
    demo.press = local < per * 0.75;
    if (local < per * 0.75) { holding = true; holdT = local; }
    else if (holding) {
      holding = false;
      if (doneIdx <= idx) {
        doneIdx = idx + 1; hits = doneIdx;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
        cursorTarget = order[Math.min(PINS.length - 1, doneIdx)];
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + PINS.length, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (PINS.length - hits) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: PINS.length });
        else game.end.failure({ hits: hits, need: PINS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (holding) holdT += dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.4, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt(hits + ' / ' + PINS.length, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#4a3d68', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.5]], { tempo: 122, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
