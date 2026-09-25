// D-20172021-0109-toyswap-collectors-circle.js
// トイスワップ・コレクターズサークル — 伏せられたおもちゃ札をめくって同じ種類同士を交換成立させ、コレクションを揃える
// 操作: 伏せ札を2枚ずつタップしてめくり、同じ種類なら交換成立。違えば伏せ直る
// 終わり: 制限時間内に全種類の交換を成立させれば成功。時間切れなら失敗
// @mechanic: pair_match
// @theme: toyswap_collectors_circle
// 世界観: 広場に集まった玩具コレクターたちが伏せ札のおもちゃを見せ合い、同じ種類同士をめくり当てて交換を成立させコレクションを揃える
// 残るもの: 正誤(CLEAR/GAME OVER) + 成立させた交換数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭+明暗2色、彩度高めのおもちゃカラー
  var C = {
    bg: '#fff4d8', bg2: '#ffe0a8', card: '#ffffff', cardBack: '#ff9f4a', cardBackDark: '#c96f1a',
    line: '#402008',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd400', ink: '#301a08', white: '#ffffff',
  };
  var TOY_COL = ['#ff4d6a', '#4d9aff', '#4dd88a'];
  var TOY_SHAPE = ['circle', 'square', 'triangle'];

  var GAME_TITLE = 'TOY SWAP';
  var COLS = 3, ROWS = 2;
  var CELL = 260;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.48;
  var TIME_LIMIT = 15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#241304', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KID_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
  }

  function cellPos(i) {
    var cx = i % COLS, cy = Math.floor(i / COLS);
    return { x: BOARD_X + (cx - 1) * CELL, y: BOARD_Y + (cy - 0.5) * CELL };
  }
  function cellAt(x, y) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 - 6 && Math.abs(y - p.y) < CELL / 2 - 6) return i;
    }
    return -1;
  }

  function drawIcon(shape, x, y, r, color) {
    if (shape === 'circle') game.draw.circle(x, y, r, color);
    else if (shape === 'square') game.draw.rect(x - r, y - r, r * 2, r * 2, color);
    else {
      game.draw.rect(x - r, y + r * 0.5, r * 2, r * 0.4, color);
      game.draw.rect(x - r * 0.5, y - r * 0.1, r, r * 0.4, color);
    }
  }

  var cards, flippedIdx, matched, matchCount, lockT, roundClock;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    var values = [0, 0, 1, 1, 2, 2];
    cards = shuffle(values);
    flippedIdx = []; matched = new Array(6).fill(false); matchCount = 0; lockT = 0; roundClock = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tryFlip(i) {
    if (finished || lockT > 0 || matched[i] || flippedIdx.indexOf(i) >= 0) return;
    flippedIdx.push(i);
    var p = cellPos(i);
    game.audio.play('se_tap', 0.15);
    if (flippedIdx.length === 2) {
      var a = flippedIdx[0], b = flippedIdx[1];
      if (cards[a] === cards[b]) {
        matched[a] = true; matched[b] = true; matchCount++;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.4);
        flippedIdx = [];
        if (matchCount === 2 && !milestoneShown) {
          milestoneShown = true;
          game.fx.popup('NICE', W / 2, BOARD_Y - 220, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.3);
        }
        if (matchCount >= 3) succeedNow();
      } else {
        game.feedback.bad(p.x, p.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        lockT = 0.6;
      }
    }
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.22;
    game.fx.burst(BOARD_X, BOARD_Y, { color: C.gold, count: 24, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3; shake = 0.2;
    game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && lockT <= 0) {
      var i = cellAt(x, y);
      if (i >= 0) tryFlip(i); else { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawBoard() {
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = cellPos(i);
      var shown = matched[i] || flippedIdx.indexOf(i) >= 0;
      if (shown) {
        game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.card);
        drawIcon(TOY_SHAPE[cards[i]], p.x, p.y, 60, TOY_COL[cards[i]]);
        if (matched[i]) game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, 10, C.good, 0.5);
      } else {
        game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.cardBack);
        game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, 10, C.cardBackDark, 0.5);
      }
    }
    var kf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(KID_F[kf], { '#': C.ink }, W * 0.14, H * 0.18, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false, plan: [], step: 0 };
  function buildPlan() {
    var pairs = {};
    for (var i = 0; i < cards.length; i++) {
      if (!matched[i]) { (pairs[cards[i]] = pairs[cards[i]] || []).push(i); }
    }
    var plan = [];
    for (var k in pairs) if (pairs[k].length === 2) { plan.push(pairs[k][0]); plan.push(pairs[k][1]); }
    return plan;
  }
  function resetDemo() { initGame(); demo.plan = buildPlan(); demo.step = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    if (lockT > 0) { lockT -= dt; return; }
    if (demo.step >= demo.plan.length) { demo.plan = buildPlan(); demo.step = 0; if (demo.plan.length === 0) return; }
    var target = cellPos(demo.plan[demo.step]);
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 6);
    demo.press = true;
    if (Math.hypot(demo.gx - target.x, demo.gy - target.y) < 14) {
      tryFlip(demo.plan[demo.step]);
      demo.step++;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cards === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(matchCount + ' / ' + 3, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matchCount, { matches: matchCount });
        else game.end.failure({ matches: matchCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (lockT > 0) { lockT -= dt; if (lockT <= 0) flippedIdx = []; }
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt(matchCount + ' / ' + 3, W / 2, H * 0.05, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 128, W - 120, 16, '#00000022', 1);
    game.draw.rect(60, 128, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
