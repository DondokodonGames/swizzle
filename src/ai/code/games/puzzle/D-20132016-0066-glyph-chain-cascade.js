// D-20132016-0066-glyph-chain-cascade.js
// グリフチェインカスケード — 同じ紋様の光点をすべてなぞってつなぎ消す。1組ごとに制限時間が短くなる
// 操作: 同じ紋様の光点を順になぞってつなぐ。すべてつなげば消えて次の組へ進む
// 終わり: 全3組を、組ごとに短くなる制限時間内につなぎ切れば成功。時間切れなら失敗
// @mechanic: connect
// @theme: glyph_chain_cascade
// 世界観: 石版に刻まれた光る紋様をなぞり消す儀式見習いが、次々短くなる詠唱の間合いの中で紋様を最後までつなぎ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + つなぎ切った組数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白背景に黒の線画のみ、差し色は1色だけ
  var C = {
    bg: '#f4f1ea', bg2: '#eae4d6', ink: '#151210', accent: '#ff5a3c',
    node: '#ffffff', nodeDone: '#ff5a3c', line: '#151210',
    good: '#2fae60', bad: '#d43d3d', gold: '#ff5a3c', white: '#151210',
  };

  var GAME_TITLE = 'GLYPH CHAIN';
  var ROUNDS = 3;
  var ROUND_TIME = [4.2, 3.4, 2.6];
  var ROUND_PTS = [
    [{ x: 0.28, y: 0.32 }, { x: 0.72, y: 0.30 }, { x: 0.5, y: 0.50 }],
    [{ x: 0.24, y: 0.58 }, { x: 0.76, y: 0.42 }, { x: 0.5, y: 0.66 }],
    [{ x: 0.30, y: 0.68 }, { x: 0.70, y: 0.66 }, { x: 0.5, y: 0.36 }],
  ];
  var NODE_R = 74;
  var GLYPHS = [
    ['..#..', '.###.', '#####', '.#.#.', '#...#'],
    ['#####', '#...#', '#...#', '#...#', '#####'],
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, touched, order, timeLeft, cleared, done, endWait, finished, dragging, dragX, dragY;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#000000', pulse * 0.6);
  }

  function pts(r) { return ROUND_PTS[r].map(function(p) { return { x: p.x * W, y: p.y * H }; }); }

  function drawRound(r, bob) {
    var P = pts(r);
    for (var i = 0; i < order.length - 1; i++) {
      var a = P[order[i]], b = P[order[i + 1]];
      game.draw.line(a.x, a.y, b.x, b.y, C.accent, 10);
    }
    if (dragging && order.length > 0) {
      var last = P[order[order.length - 1]];
      game.draw.line(last.x, last.y, dragX, dragY, C.accent, 6);
    }
    for (var j = 0; j < P.length; j++) {
      var p = P[j];
      var done_ = touched[j];
      game.draw.circle(p.x, p.y, NODE_R, C.ink);
      game.draw.circle(p.x, p.y, NODE_R - 8, done_ ? C.nodeDone : C.node);
      game.draw.sprite(GLYPHS[r], { '#': done_ ? '#ffffff' : C.ink }, p.x, p.y + bob * 0.3, 8, { anchor: 'center' });
    }
  }

  function initGame() {
    round = 0; touched = [false, false, false]; order = [];
    timeLeft = ROUND_TIME[0]; cleared = 0;
    done = false; endWait = 0; finished = false; dragging = false; dragX = 0; dragY = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function startRound(r) {
    round = r; touched = [false, false, false]; order = [];
    timeLeft = ROUND_TIME[r];
  }

  function tryTouch(x, y) {
    if (finished || ready > 0) return;
    dragX = x; dragY = y;
    var P = pts(round);
    var hitAny = false;
    for (var i = 0; i < P.length; i++) {
      if (touched[i]) continue;
      if (Math.hypot(x - P[i].x, y - P[i].y) < NODE_R) {
        touched[i] = true; order.push(i); hitAny = true;
        game.feedback.good(P[i].x, P[i].y, { text: '', count: 6 });
        if (order.length === P.length) {
          cleared++;
          hitStop = 0.1;
          game.fx.popup(cleared === ROUNDS ? 'CLEAR!' : (cleared + '/' + ROUNDS), P[i].x, P[i].y - 90, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.4);
          if (cleared >= ROUNDS) {
            ok = true; finished = true; hitStop = 0.3;
            game.audio.play('se_success', 0.5);
            finish();
          } else {
            startRound(round + 1);
          }
        } else {
          game.audio.play('se_good', 0.3);
        }
        break;
      }
    }
    if (!hitAny) game.audio.play('se_tap', 0.06);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    dragging = true;
    tryTouch(x, y);
  });
  game.onMove(function(x, y) { if (state === S.PLAYING && dragging) tryTouch(x, y); });
  game.onRelease(function() { dragging = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { startRound(0); cleared = 0; }
    var P = pts(round);
    var segDur = 3.0 / P.length;
    var segIdx = Math.min(P.length - 1, Math.floor(cyc / segDur));
    if (!touched[segIdx]) {
      touched[segIdx] = true; order.push(segIdx);
      demo.gx = P[segIdx].x; demo.gy = P[segIdx].y; demo.press = true;
      game.feedback.good(P[segIdx].x, P[segIdx].y, { text: '', count: 6 });
      game.audio.play('se_good', 0.2);
      if (order.length === P.length) {
        cleared++;
        game.audio.play('se_milestone', 0.25);
        if (round < ROUNDS - 1) { startRound(round + 1); } else { startRound(0); cleared = 0; }
      }
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.4) * 5;

    if (state === S.ATTRACT) {
      if (touched === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRound(round, bob);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRound(round, bob);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
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
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'MISS' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRound(round, bob);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 1.2 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#d8cfba', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / ROUND_TIME[round]), 16, lowTime ? C.bad : C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.35]], { tempo: 158, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
