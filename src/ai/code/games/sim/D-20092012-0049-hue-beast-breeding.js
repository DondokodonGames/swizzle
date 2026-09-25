// D-20092012-0049-hue-beast-breeding.js
// ヒュービースト配合 — 色の異なる2匹をつないで、指定の色の子を生ませる牧場の配合台
// 操作: 3匹の中から色の組み合わせが指定色になる2匹を選び、指でつないでリリースする
// 終わり: 規定回数(4回)続けて正しく配合できれば成功。組み合わせを外す/時間切れで失敗
// @mechanic: connect
// @theme: color_breeding_ranch
// 世界観: 色違いの子を集めるのどかな配合牧場。台の上の3匹から正しい2匹をつなぎ、望みの色の子を生ませる係員の仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続で正解できた配合回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い彩度低め、丸み、柔らかい影
  var C = {
    bg: '#fdeaf2', bg2: '#f6d8ea', pen: '#ffffff', penEdge: '#e8b8cf',
    R: '#ff8fa3', B: '#8fc7ff', Y: '#ffe08a', PURPLE: '#c79bff', ORANGE: '#ffb37a', GREEN: '#9be0a8',
    good: '#4fd48a', bad: '#ff6b7a', gold: '#ffb84d', white: '#ffffff', ink: '#5a3a4a', line: '#c98fa8',
  };

  var GAME_TITLE = 'HUE BEAST';
  var TOTAL = 4;
  var ROUND_TIME = 3.4;
  var PENS_X = [W * 0.22, W * 0.5, W * 0.78];
  var PEN_Y = H * 0.5;
  var PEN_R = 92;
  var TARGET_Y = H * 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BEAST_A = ['.##.', '####', '.##.'];
  var BEAST_B = ['.##.', '####', '#..#'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.15 + i * 0.2), H * 0.9, 40 + 10 * Math.sin(t + i), '#ffffff', 0.15);
    ambient(t);
  }

  function mix(a, b) {
    var s = [a, b].sort().join('');
    if (s === 'BR') return 'PURPLE';
    if (s === 'RY') return 'ORANGE';
    if (s === 'BY') return 'GREEN';
    return null;
  }

  var round, pens, target, roundT, selected, dragging, dragX, dragY, streak;
  var done, endWait, finished, ready, hitStop, shake, flashPens;

  function shuffle3(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function newRound() {
    pens = shuffle3(['R', 'B', 'Y']);
    var pairs = [[0, 1], [1, 2], [0, 2]];
    var pick = pairs[Math.floor(game.random(0, 3))];
    target = mix(pens[pick[0]], pens[pick[1]]);
    roundT = ROUND_TIME;
    selected = -1; dragging = false; flashPens = [];
  }

  function initGame() {
    round = 0; streak = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function penAt(x, y) {
    for (var i = 0; i < PENS_X.length; i++) {
      if (Math.hypot(x - PENS_X[i], y - PEN_Y) < PEN_R) return i;
    }
    return -1;
  }

  function resolvePair(i, j) {
    var good = mix(pens[i], pens[j]) === target;
    hitStop = good ? 0.12 : 0.3;
    flashPens = [i, j];
    if (good) {
      streak++;
      game.feedback.good((PENS_X[i] + PENS_X[j]) / 2, PEN_Y, { text: 'GOOD', color: C.good });
      game.fx.burst((PENS_X[i] + PENS_X[j]) / 2, PEN_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      round++;
      if (round === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.32, { color: C.gold, size: 38 });
      if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      game.feedback.bad((PENS_X[i] + PENS_X[j]) / 2, PEN_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var i = penAt(x, y);
    if (i >= 0) { selected = i; dragging = true; dragX = x; dragY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) { if (dragging) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (!dragging) return;
    dragging = false;
    var j = penAt(x, y);
    if (j >= 0 && j !== selected) resolvePair(selected, j);
    selected = -1;
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

  function drawPens(t, highlight) {
    for (var i = 0; i < pens.length; i++) {
      var bob = Math.sin(t * 2 + i * 2) * 6;
      var flashed = flashPens.indexOf(i) >= 0 && hitStop > 0;
      var r = PEN_R + (flashed ? 14 : 0);
      game.draw.circle(PENS_X[i], PEN_Y + bob, r + 8, C.penEdge);
      game.draw.circle(PENS_X[i], PEN_Y + bob, r, flashed ? C.white : C.pen);
      game.draw.sprite(i % 2 === 0 ? BEAST_A : BEAST_B, { '#': C[pens[i]] }, PENS_X[i], PEN_Y + bob, 20, { anchor: 'center' });
      if (highlight === i) game.draw.circle(PENS_X[i], PEN_Y + bob, r + 16, C.gold, 0.4);
    }
  }

  function drawTarget(t) {
    var pulse = 60 + 6 * Math.sin(t * 3);
    game.draw.circle(W / 2, TARGET_Y, pulse + 10, C.white);
    game.draw.circle(W / 2, TARGET_Y, pulse, C[target]);
    if (!finished && !done) {
      var frac = Math.max(0, roundT / ROUND_TIME);
      game.draw.circle(W / 2, TARGET_Y, pulse + 22, C.line, 0.3 + 0.3 * frac);
    }
  }

  var demo = { t: 0, gx: PENS_X[0], gy: PEN_Y, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    var pairs = [[0, 1], [1, 2], [0, 2]];
    var goodPair = null;
    for (var k = 0; k < pairs.length; k++) {
      if (mix(pens[pairs[k][0]], pens[pairs[k][1]]) === target) { goodPair = pairs[k]; break; }
    }
    if (!goodPair) goodPair = [0, 1];
    if (cyc < 1.0) { demo.gx = PENS_X[goodPair[0]]; demo.gy = PEN_Y; demo.press = false; }
    else if (cyc < 2.0) {
      var p = (cyc - 1.0) / 1.0;
      demo.gx = PENS_X[goodPair[0]] + (PENS_X[goodPair[1]] - PENS_X[goodPair[0]]) * p;
      demo.gy = PEN_Y;
      demo.press = true;
    } else {
      demo.press = false;
      if (flashPens.length === 0) {
        flashPens = goodPair;
        game.feedback.good((PENS_X[goodPair[0]] + PENS_X[goodPair[1]]) / 2, PEN_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawTarget(t);
      drawPens(t, -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawPens(t, -1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - round) + '匹!', W / 2, H * 0.16, 26, C.ink);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, total: TOTAL });
        else game.end.failure({ round: round, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) flashPens = [];
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT -= dt;
      if (roundT <= 0) {
        hitStop = 0.3;
        game.feedback.bad(W / 2, PEN_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawTarget(t);
    drawPens(t, -1);
    if (dragging && selected >= 0) {
      game.draw.line(PENS_X[selected], PEN_Y, dragX, dragY, C.line, 10);
    }

    txt(round + ' / ' + TOTAL, W / 2, H * 0.42, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.3], ['E5', 0.3], ['G5', 0.3], ['E5', 0.3]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
