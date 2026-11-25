// D-20172021-0100-alchemy-orb-bench.js
// アルケミーオーブ・ベンチ — 作業台に並んだ同格の秘薬オーブを隣同士にドラッグして合体させ、上位のオーブへ育てる
// 操作: オーブを指で押さえて隣接する同じ段位のオーブまでドラッグし、指を離して合体させる
// 終わり: 制限時間内に目標段位のオーブを1つ作れば成功。作れなければ失敗
// @mechanic: drag_sort
// @theme: alchemy_orb_bench
// 世界観: 見習い錬金術師が作業台の9マスに並んだ秘薬オーブを同じ段位同士でドラッグ合体させ、規定時間内に最上位の秘薬を完成させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した最高段位
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目の作業台+つや消し金属枠、オーブは段位ごとに彩度が上がる
  var C = {
    bg: '#6b4a2f', bg2: '#3f2c1a', bench: '#8a6339', benchDark: '#5a3f22',
    slot: '#caa872', slotEdge: '#6b4a2f',
    good: '#3df08a', bad: '#ff4d5e', gold: '#ffe14d', white: '#fff6e6', ink: '#241505',
  };
  var TIER_COL = ['#c9d6e0', '#8fd7ff', '#7fffb0', '#ffe14d', '#ff9f4a', '#ff5fd0'];
  var MASCOT_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  var GAME_TITLE = 'ORB BENCH';
  var GRID = 3;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.46, CELL = 260;
  var TARGET_TIER = 5;
  var TIME_LIMIT = 18;
  var SPAWN_EVERY = 2.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#1a0d02', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
  }

  function idxOf(cx, cy) { return cy * GRID + cx; }
  function cellPos(i) {
    var cx = i % GRID, cy = Math.floor(i / GRID);
    return { x: BOARD_X + (cx - 1) * CELL, y: BOARD_Y + (cy - 1) * CELL };
  }
  function cellAt(x, y) {
    var cx = Math.round((x - BOARD_X) / CELL) + 1;
    var cy = Math.round((y - BOARD_Y) / CELL) + 1;
    if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) return -1;
    return idxOf(cx, cy);
  }
  function isAdjacent(a, b) {
    var ax = a % GRID, ay = Math.floor(a / GRID);
    var bx = b % GRID, by = Math.floor(b / GRID);
    return (Math.abs(ax - bx) + Math.abs(ay - by)) === 1;
  }

  var tiles, maxTier, roundClock, spawnClock, dragFrom, dragX, dragY;
  var done, endWait, finished, ready, hitStop, shake, mergeGlow, halfCalled;

  function emptyCells() {
    var list = [];
    for (var i = 0; i < tiles.length; i++) if (tiles[i] === 0) list.push(i);
    return list;
  }

  function spawnTile() {
    var e = emptyCells();
    if (e.length === 0) return;
    var idx = e[Math.floor(Math.random() * e.length)];
    tiles[idx] = 1;
  }

  function initGame() {
    tiles = new Array(GRID * GRID).fill(0);
    var starters = [0, 1, 2, 3];
    for (var i = 0; i < starters.length; i++) tiles[starters[i]] = 1;
    tiles[4] = 2;
    maxTier = 2; roundClock = 0; spawnClock = 0; dragFrom = -1; dragX = 0; dragY = 0;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0; mergeGlow = -1;
  }

  function attemptMerge(from, to) {
    if (from < 0 || to < 0 || from === to) return false;
    if (tiles[from] === 0 || !isAdjacent(from, to)) return false;
    if (tiles[to] !== tiles[from]) return false;
    var newTier = tiles[to] + 1;
    tiles[to] = newTier; tiles[from] = 0;
    if (newTier > maxTier) maxTier = newTier;
    mergeGlow = to; hitStop = 0.12;
    var p = cellPos(to);
    game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
    game.fx.burst(p.x, p.y, { color: TIER_COL[Math.min(newTier, TIER_COL.length - 1)], count: 16, speed: 320 });
    game.audio.play('se_good', 0.4);
    if (newTier >= TARGET_TIER) {
      ok = true; finished = true; hitStop = 0.25;
      game.fx.burst(p.x, p.y, { color: C.gold, count: 26, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
    return true;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = cellAt(x, y);
    if (i >= 0 && tiles[i] !== 0) { dragFrom = i; dragX = x; dragY = y; game.audio.play('se_tap', 0.12); }
  });
  game.onMove(function(x, y) { if (dragFrom >= 0) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (dragFrom < 0) return;
    var to = cellAt(x, y);
    var success = attemptMerge(dragFrom, to);
    if (!success) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
    }
    dragFrom = -1;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawBoard() {
    for (var i = 0; i < GRID * GRID; i++) {
      var p = cellPos(i);
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.slot);
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, 8, C.slotEdge, 0.4);
      if (tiles[i] > 0) {
        var col = TIER_COL[Math.min(tiles[i] - 1, TIER_COL.length - 1)];
        var glow = (i === mergeGlow);
        var r = 92 + (glow ? 14 : 0);
        game.draw.circle(p.x, p.y, r, col);
        game.draw.circle(p.x, p.y, r - 10, '#ffffff', 0.15);
        txt(String(tiles[i]), p.x, p.y + 12, 42, '#2a1a05');
      }
    }
    if (dragFrom >= 0) {
      var pf = cellPos(dragFrom);
      var col2 = TIER_COL[Math.min(tiles[dragFrom] - 1, TIER_COL.length - 1)];
      game.draw.circle(dragX, dragY, 96, col2, 0.85);
      txt(String(tiles[dragFrom]), dragX, dragY + 12, 42, '#2a1a05');
    }
    var mf = Math.floor(game.time.elapsed * 4) % 2;
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    game.draw.sprite(MASCOT_F[mf], { '#': C.gold }, W * 0.14, H * 0.86 + bob, 14, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false, phase: 0, from: -1, to: -1 };
  function resetDemo() { initGame(); demo.phase = 0; }
  function findDemoMerge() {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i] === 0) continue;
      var nb = [i - 1, i + 1, i - GRID, i + GRID];
      for (var k = 0; k < nb.length; k++) {
        var j = nb[k];
        if (j < 0 || j >= tiles.length) continue;
        if (!isAdjacent(i, j)) continue;
        if (tiles[j] === tiles[i]) return { from: i, to: j };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { resetDemo(); demo.from = -1; demo.to = -1; }
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    if (demo.from < 0) {
      var m = findDemoMerge();
      if (m) { demo.from = m.from; demo.to = m.to; } else { spawnTile(); }
    }
    if (demo.from >= 0) {
      var pf = cellPos(demo.from), pt = cellPos(demo.to);
      var t = Math.min(1, (cyc % 3.4) / 1.4);
      demo.gx = pf.x + (pt.x - pf.x) * t;
      demo.gy = pf.y + (pt.y - pf.y) * t;
      demo.press = true;
      dragFrom = demo.from; dragX = demo.gx; dragY = demo.gy;
      if (t >= 1 && tiles[demo.from] !== 0) {
        attemptMerge(demo.from, demo.to);
        demo.from = -1; demo.to = -1; dragFrom = -1;
      }
    } else {
      dragFrom = -1;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? 'T' + game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt('T' + maxTier + ' / ' + 'T' + TARGET_TIER, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと1段!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(maxTier, { maxTier: maxTier, target: TARGET_TIER });
        else game.end.failure({ maxTier: maxTier, target: TARGET_TIER });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      spawnClock += dt;
      if (spawnClock >= SPAWN_EVERY) { spawnClock = 0; spawnTile(); }
      if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (roundClock >= TIME_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt('T' + maxTier + ' / ' + 'T' + TARGET_TIER, W / 2, H * 0.06, 28, C.white);
    var tierPct = maxTier / TARGET_TIER;
    game.draw.rect(60, 130, W - 120, 14, '#00000055', 1);
    game.draw.rect(60, 130, (W - 120) * tierPct, 14, C.good);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 154, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 154, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
