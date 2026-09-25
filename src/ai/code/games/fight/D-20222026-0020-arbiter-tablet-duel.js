// D-20222026-0020-arbiter-tablet-duel.js
// アービタータブレット・デュエル — 双方の刻印板の数値を瞬時に比べ、勝る方を打ち鳴らす
// 操作: 左右に掲げられた刻印板の数値を見比べ、大きい方の板を素早くタップする
// 終わり: 制限時間内に規定回数を正しく判定できれば成功。時間切れで失敗
// @mechanic: size_judge
// @theme: arbiter_tablet_duel
// 世界観: 闘技場の裁定人見習いが、双方が掲げる刻印板の数値を瞬時に比べ、勝る方を打ち鳴らして裁定する
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく裁定した回数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 単色蛍光(アンバー)+走査線、背景は漆黒に近い
  var STYLE = {
    bg: ['#1a1408', '#0a0704'],
    main: ['#ffb84d'],
    accent: ['#ffe9c2', '#0a0704'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#7ee08c', bad: '#ff5d5d', gold: STYLE.main[0],
    tablet: '#2a2010', tabletEdge: STYLE.main[0],
  };

  var GAME_TITLE = 'ARBITER DUEL';
  var TIME_LIMIT = 12;
  var NEED_N = 5;
  var TAB_Y = H * 0.42;
  var TAB_X = [W * 0.28, W * 0.72];
  var TAB_W = 300, TAB_H = 340;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000099', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var JUDGE_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var vals, cleared, mistakes, popAnim;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function newVals() {
    var a = 1 + Math.floor(Math.random() * 9);
    var b;
    do { b = 1 + Math.floor(Math.random() * 9); } while (b === a);
    return [a, b];
  }

  function initGame() {
    vals = newVals();
    cleared = 0; mistakes = 0; popAnim = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var y = 0; y < H; y += 6) game.draw.rect(0, y, W, 2, '#000000', 0.15);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(JUDGE_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.5, H * 0.86 + bob, 14, { anchor: 'center' });
  }

  function drawTablets() {
    for (var i = 0; i < TAB_X.length; i++) {
      var x = TAB_X[i];
      game.draw.rect(x - TAB_W / 2, TAB_Y - TAB_H / 2, TAB_W, TAB_H, C.tablet);
      game.draw.rect(x - TAB_W / 2, TAB_Y - TAB_H / 2, TAB_W, 10, C.tabletEdge);
      var s = 1 + popAnim * 0.3;
      txt(String(vals[i]), x, TAB_Y + 40, 120 * s, C.gold);
    }
  }

  function tabletIndexAt(x, y) {
    for (var i = 0; i < TAB_X.length; i++) {
      var tx = TAB_X[i];
      if (x > tx - TAB_W / 2 && x < tx + TAB_W / 2 && y > TAB_Y - TAB_H / 2 && y < TAB_Y + TAB_H / 2) return i;
    }
    return -1;
  }

  function tryJudge(i) {
    if (i < 0) return;
    var winner = vals[0] > vals[1] ? 0 : 1;
    if (i === winner) {
      cleared++; popAnim = 1;
      game.feedback.good(TAB_X[i], TAB_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.3);
      if (!halfCalled && cleared >= Math.ceil(NEED_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, TAB_Y - TAB_H / 2 - 40, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (cleared >= NEED_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(TAB_X[i], TAB_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        vals = newVals();
      }
    } else {
      mistakes++;
      timeLeft = Math.max(0.5, timeLeft - 1.2);
      game.feedback.bad(TAB_X[i], TAB_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryJudge(tabletIndexAt(x, y));
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0 };
  function resetDemo() { initGame(); demo.idx = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.5 / NEED_N;
    var slot = Math.min(NEED_N - 1, Math.floor(cyc / per));
    var localT = (cyc - slot * per) / per;
    var winner = vals[0] > vals[1] ? 0 : 1;
    var tx = TAB_X[winner];
    if (localT < 0.65) {
      var t2 = localT / 0.65;
      demo.gx = W / 2 + (tx - W / 2) * t2;
      demo.gy = TAB_Y;
      demo.press = true;
    } else {
      demo.gx = tx; demo.gy = TAB_Y; demo.press = false;
      if (localT > 0.7 && slot === demo.idx) {
        demo.idx = slot + 1;
        cleared++; popAnim = 1;
        game.feedback.good(tx, TAB_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_tap', 0.15);
        if (cleared < NEED_N) vals = newVals();
      }
    }
  }

  game.onUpdate(function(dt) {
    if (popAnim > 0) popAnim -= dt * 3;

    if (state === S.ATTRACT) {
      if (!vals) initGame();
      bg();
      stepDemo(dt);
      drawTablets();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 34, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTablets();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEED_N, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEED_N - cleared) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, mistakes: mistakes });
        else game.end.failure({ cleared: cleared, mistakes: mistakes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(W * 0.5, TAB_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTablets();

    txt(cleared + ' / ' + NEED_N, W / 2, H * 0.06, 26, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#00000044');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['E4', 0.15], ['G4', 0.15], ['C5', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
