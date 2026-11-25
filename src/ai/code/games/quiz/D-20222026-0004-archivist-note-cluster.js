// D-20222026-0004-archivist-note-cluster.js
// アーキビスト・ノートクラスター — 散らばった8枚のカードから同じ属性の4枚を選んで線でつなぎ、束にまとめる
// 操作: カードを4枚選んでタップすると自動でつながりを判定する。合っていれば束になり、違えば選び直す
// 終わり: 2つの束を両方まとめれば成功。間違いが規定回数を超えれば失敗
// @mechanic: connect
// @theme: archivist_note_cluster
// 世界観: 資料室の整理係が散らばった単語カードの中から共通点を見抜き、同じ属性の4枚を線でつないで束にまとめていく
// 残るもの: 正誤(CLEAR/GAME OVER) + まとめられた束の数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 緑/琥珀モノクロ端末風+走査線、1色発光
  var C = {
    bg: '#081208', bg2: '#020602', card: '#0e2a12', cardSel: '#1e5a24', cardFound: '#123a18',
    glow: '#4dff7a', line: '#4dff7a',
    good: '#4dff7a', bad: '#ff4d5e', gold: '#ffe14d', ink: '#04120a', white: '#c8ffd8',
  };

  var GAME_TITLE = 'NOTE CLUSTER';
  var GROUP_A = ['CAT', 'DOG', 'FOX', 'OWL'];
  var GROUP_B = ['RED', 'BLUE', 'GOLD', 'JADE'];
  var COLS = 4, ROWS = 2;
  var CELL = 250;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.46;
  var TIME_LIMIT = 16;
  var MAX_MISS = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLERK_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var s = 0; s < H; s += 6) game.draw.rect(0, s, W, 2, C.glow, 0.03);
  }

  function cellPos(i) {
    var cx = i % COLS, cy = Math.floor(i / COLS);
    return { x: BOARD_X + (cx - 1.5) * CELL, y: BOARD_Y + (cy - 0.5) * CELL };
  }
  function cellAt(x, y) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 - 6 && Math.abs(y - p.y) < CELL / 2 - 6) return i;
    }
    return -1;
  }

  var words, groupIdOf, selected, found, foundGroups, miss, roundClock;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  function initGame() {
    var order = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    words = new Array(8); groupIdOf = new Array(8);
    for (var i = 0; i < 4; i++) { words[order[i]] = GROUP_A[i]; groupIdOf[order[i]] = 0; }
    for (var j = 0; j < 4; j++) { words[order[4 + j]] = GROUP_B[j]; groupIdOf[order[4 + j]] = 1; }
    selected = []; found = new Array(8).fill(false); foundGroups = 0; miss = 0; roundClock = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function checkSelection() {
    var g0 = groupIdOf[selected[0]];
    var allSame = selected.every(function(i) { return groupIdOf[i] === g0; });
    var p = cellPos(selected[selected.length - 1]);
    if (allSame) {
      for (var k = 0; k < selected.length; k++) found[selected[k]] = true;
      foundGroups++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(BOARD_X, BOARD_Y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (foundGroups === 1 && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, BOARD_Y - 240, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (foundGroups >= 2) succeedNow();
    } else {
      miss++;
      hitStop = 0.22; shake = 0.2;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      if (miss > MAX_MISS) failNow();
    }
    selected = [];
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.24;
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var i = cellAt(x, y);
      if (i < 0 || found[i] || selected.indexOf(i) >= 0) {
        game.feedback.bad(x, y, { text: null });
        game.audio.play('se_tap', 0.15);
        return;
      }
      selected.push(i);
      game.audio.play('se_tap', 0.2);
      if (selected.length >= 4) checkSelection();
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
      var col = found[i] ? C.cardFound : selected.indexOf(i) >= 0 ? C.cardSel : C.card;
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, col);
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.glow, found[i] ? 0.15 : selected.indexOf(i) >= 0 ? 0.3 : 0.08);
      txt(words[i], p.x, p.y + 14, 34, found[i] ? C.glow : C.white);
    }
    for (var s = 0; s < selected.length; s++) {
      for (var t = s + 1; t < selected.length; t++) {
        var p1 = cellPos(selected[s]), p2 = cellPos(selected[t]);
        game.draw.line(p1.x, p1.y, p2.x, p2.y, C.line, 4);
      }
    }
    var cf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(CLERK_F[cf], { '#': C.glow }, W * 0.14, H * 0.15, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.3, press: false, plan: [], step: 0 };
  function buildPlan() {
    var remaining = [];
    for (var g = 0; g < 2; g++) {
      var idxs = [];
      for (var i = 0; i < 8; i++) if (!found[i] && groupIdOf[i] === g) idxs.push(i);
      if (idxs.length === 4) remaining = remaining.concat(idxs);
    }
    return remaining;
  }
  function resetDemo() { initGame(); demo.plan = buildPlan(); demo.step = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 11;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    if (demo.step >= demo.plan.length) { demo.plan = buildPlan(); demo.step = 0; if (demo.plan.length === 0) return; }
    var target = cellPos(demo.plan[demo.step]);
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 6);
    demo.press = true;
    if (Math.hypot(demo.gx - target.x, demo.gy - target.y) < 14) {
      var idx = demo.plan[demo.step];
      if (found[idx] || selected.indexOf(idx) >= 0) { demo.step++; return; }
      selected.push(idx);
      game.audio.play('se_tap', 0.2);
      if (selected.length >= 4) checkSelection();
      demo.step++;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (words === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 34, C.glow);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.glow);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 40, ok ? C.good : C.bad);
      txt(foundGroups + ' / 2', W / 2, H * 0.12, 26, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.16, 22, C.glow);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.glow);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(foundGroups, { groups: foundGroups, misses: miss });
        else game.end.failure({ groups: foundGroups, misses: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt(foundGroups + ' / ' + 2, W / 2, H * 0.05, 26, C.glow);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 130, W - 120, 14, '#00000055', 1);
    game.draw.rect(60, 130, (W - 120) * barPct, 14, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.15], ['G4', 0.15], ['B4', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
