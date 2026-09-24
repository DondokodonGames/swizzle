// D-20092012-0041-lockdial-deduction.js
// ロックダイヤル推理 — 数字盤の空欄マスを、縦横の並びから推理して正しい数字を選ぶ
// 操作: 盤面を見て空欄に入る数字を、下の4択ボタンからタップして選ぶ
// 終わり: 3問続けて正解すれば成功。誤答か時間切れで失敗
// @mechanic: judge
// @theme: lockdial_deduction
// 世界観: 古い金庫の錠前師が、4×4の数字盤に空いた一マスを縦横の並びから推理し、正しい数字を選んで解錠していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解した問題数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで中間色、線の太さで語る
  var C = {
    paper: '#f2ece0', ink: '#171310', line: '#171310',
    white: '#f2ece0', gold: '#171310',
    good: '#171310', bad: '#171310', goodBg: '#dfe6d8', badBg: '#e8cfcf',
  };

  var GAME_TITLE = 'LOCKDIAL';
  var FULL = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];
  var BLANKS = [{ r: 0, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 0 }];
  var GRID_X0 = W * 0.22, GRID_Y0 = H * 0.30, CELL = (W * 0.56) / 4;
  var TIME_LIMIT = 13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, correct, options, timeLeft, halfShown, flashCell, resolvedAnim;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000020', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.paper], [1, '#e5ddc9']]);
    for (var i = 0; i < 24; i++) {
      var x = (i * 91) % W, y = (i * 173) % H;
      if ((i + Math.floor(x / 8) + Math.floor(y / 8)) % 3 === 0) game.draw.rect(x, y, 3, 3, C.ink, 0.06);
    }
  }

  function cellX(c) { return GRID_X0 + c * CELL + CELL / 2; }
  function cellY(r) { return GRID_Y0 + r * CELL + CELL / 2; }

  function curBlank() { return BLANKS[round]; }

  function makeOptions() {
    var answer = FULL[curBlank().r][curBlank().c];
    var arr = [1, 2, 3, 4];
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    correct = answer;
    return arr;
  }

  function drawGrid() {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var x = GRID_X0 + c * CELL, y = GRID_Y0 + r * CELL;
        var isBlank = (r === curBlank().r && c === curBlank().c) && !resolvedAnim;
        game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, C.paper);
        game.draw.rect(x + 3, y + 3, CELL - 6, 3, C.ink, 0.7);
        game.draw.rect(x + 3, y + CELL - 9, CELL - 6, 3, C.ink, 0.7);
        game.draw.rect(x + 3, y + 3, 3, CELL - 6, C.ink, 0.7);
        game.draw.rect(x + CELL - 9, y + 3, 3, CELL - 6, C.ink, 0.7);
        if (isBlank) {
          var blink = Math.floor(game.time.elapsed * 6) % 2 === 0;
          if (blink) game.draw.rect(x + 8, y + 8, CELL - 16, CELL - 16, C.ink, 0.15);
          txt('?', cellX(c), cellY(r) + 14, 40, C.ink);
        } else {
          txt(String(FULL[r][c]), cellX(c), cellY(r) + 14, 40, C.ink);
        }
      }
    }
  }

  function optX(i) { return W * (0.5 + (i - 1.5) * 0.2); }

  function drawOptions() {
    for (var i = 0; i < options.length; i++) {
      var bx = optX(i), by = H * 0.86;
      game.draw.circle(bx, by, 74, C.paper);
      game.draw.circle(bx, by, 74, C.ink, 0.8);
      game.draw.circle(bx, by, 68, C.paper);
      txt(String(options[i]), bx, by + 14, 40, C.ink);
    }
  }

  function initGame() {
    round = 0; halfShown = false;
    options = makeOptions();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT; flashCell = null; resolvedAnim = 0;
  }

  function optAt(x, y) {
    for (var i = 0; i < options.length; i++) {
      if (Math.hypot(x - optX(i), y - H * 0.86) <= 80) return i;
    }
    return -1;
  }

  function answer(val) {
    var b = curBlank();
    if (val === correct) {
      resolvedAnim = 0.4;
      game.feedback.good(cellX(b.c), cellY(b.r), { text: 'GOOD', color: C.good, sound: 'se_good' });
      game.fx.burst(cellX(b.c), cellY(b.r), { color: C.ink, count: 12, speed: 260 });
      round++;
      if (!halfShown && round >= Math.ceil(BLANKS.length / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, H * 0.22, { color: C.ink, size: 36 });
        game.audio.play('se_milestone', 0.5);
      }
      if (round >= BLANKS.length) {
        ok = true; finished = true; hitStop = 0.1; finish();
      } else {
        options = makeOptions();
        timeLeft = Math.min(TIME_LIMIT, timeLeft + 4);
      }
    } else {
      ok = false; finished = true; hitStop = 0.35;
      game.feedback.bad(cellX(b.c), cellY(b.r), { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var i = optAt(x, y);
    if (i < 0) return;
    game.audio.play('se_tap', 0.3);
    answer(options[i]);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: optX(0), gy: H * 0.86, press: false };
  function stepDemo(dt) {
    if (round === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      round = 0; halfShown = false; options = makeOptions(); resolvedAnim = 0;
      demo.fired = false;
    }
    var correctIdx = 0;
    for (var i = 0; i < options.length; i++) if (options[i] === correct) correctIdx = i;
    if (cyc > 0.35 && cyc < 0.6) {
      demo.gx = optX(correctIdx); demo.gy = H * 0.86; demo.press = true;
    } else if (cyc >= 0.6 && !demo.fired) {
      demo.fired = true; demo.press = false;
      answer(options[correctIdx]);
    } else if (cyc < 0.35) { demo.fired = false; demo.press = false; }
    if (resolvedAnim > 0) resolvedAnim -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGrid();
      drawOptions();
      game.draw.sprite(SMITH, { '#': C.ink, '.': null }, W * 0.5, H * 0.14, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 46, C.ink);
      txt(round + ' / ' + BLANKS.length, W / 2, H * 0.16, 28, C.ink);
      if (!ok) txt('あと' + Math.max(1, BLANKS.length - round) + '問!', W / 2, H * 0.21, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { correct: round, total: BLANKS.length };
        if (ok) game.end.success(round, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        var b = curBlank();
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(cellX(b.c), cellY(b.r), { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (resolvedAnim > 0) resolvedAnim -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();
    drawOptions();
    game.draw.sprite(SMITH, { '#': C.ink, '.': null }, W * 0.5, H * 0.14, 14, { anchor: 'center' });

    txt(round + ' / ' + BLANKS.length, W / 2, H * 0.04, 28, C.ink);
    var warn = timeLeft < 3;
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.ink, warn ? 0.9 : 0.6);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['D4', 0.4], ['E4', 0.4], ['C5', 0.8]], { tempo: 100, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
