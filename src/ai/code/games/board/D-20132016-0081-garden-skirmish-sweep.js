// D-20132016-0081-garden-skirmish-sweep.js
// ガーデンスカーミッシュ・スイープ — マス目の庭で害虫が並んだ列を見極め、隣接2匹以上を巻き込むマスへ移動する
// 操作: 盤上の9マスから、害虫が2匹以上隣接するマスをタップして一気に薙ぎ払う
// 終わり: 正しいマスを選べば成功。隣接1匹以下のマスや空マスを選べば失敗
// @mechanic: judge
// @theme: garden_bug_skirmish
// 世界観: 小さな庭を守る甲虫の戦士が、害虫の群れを見渡し、一撃で最も多く巻き込めるマスを見極めて突撃する
// 残るもの: 正誤(CLEAR/GAME OVER) + 巻き込んだ数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var C = {
    bg: '#dff0c8', bg2: '#c6e6a8', tile: '#eaf7d8', tileDark: '#b8d998', line: '#204010',
    bug: '#e0703a', bugDark: '#a04a20', hero: '#3a8a4a', heroDark: '#205a28',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#102008',
  };

  var GAME_TITLE = 'GARDEN SWEEP';
  var GRID = 3;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.46, CELL = 260;
  var MAX_TIME = 11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_SPRITE = ['.###.', '#####', '.#.#.', '.#.#.'];
  var BUG_SPRITE = ['#.#.#', '#####', '.###.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function cellPos(cx, cy) {
    return { x: BOARD_X + (cx - 1) * CELL, y: BOARD_Y + (cy - 1) * CELL };
  }
  function cellXYFromIndex(i) { return { cx: i % GRID, cy: Math.floor(i / GRID) }; }

  function drawBoard(occ, heroIdx, best, showBest) {
    for (var i = 0; i < GRID * GRID; i++) {
      var c = cellXYFromIndex(i);
      var p = cellPos(c.cx, c.cy);
      var col = (showBest && i === best) ? C.gold : ((c.cx + c.cy) % 2 === 0 ? C.tile : C.tileDark);
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, col);
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, 6, C.line, 0.3);
    }
    for (var j = 0; j < occ.length; j++) {
      if (!occ[j]) continue;
      var c2 = cellXYFromIndex(j);
      var p2 = cellPos(c2.cx, c2.cy);
      var bob = Math.sin(game.time.elapsed * 2 + j) * 5;
      game.draw.sprite(BUG_SPRITE, { '#': C.bug }, p2.x, p2.y + bob, 24, { anchor: 'center' });
    }
    var hc = cellXYFromIndex(heroIdx);
    var hp = cellPos(hc.cx, hc.cy);
    game.draw.sprite(HERO_SPRITE, { '#': C.hero }, hp.x, hp.y, 30, { anchor: 'center' });
  }

  function neighborsOf(i) {
    var c = cellXYFromIndex(i);
    var list = [];
    var deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < deltas.length; k++) {
      var nx = c.cx + deltas[k][0], ny = c.cy + deltas[k][1];
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) list.push(ny * GRID + nx);
    }
    return list;
  }

  function countAdjacent(occ, i) {
    var n = neighborsOf(i);
    var cnt = 0;
    for (var k = 0; k < n.length; k++) if (occ[n[k]]) cnt++;
    return cnt;
  }

  var occ, heroIdx, bestIdx, bestCount, hitCount;
  var done, endWait, finished, ready, hitStop, shake;
  var roundClock, halfCalled;

  function initGame() {
    roundClock = 0; halfCalled = false;
    occ = new Array(GRID * GRID).fill(false);
    var bugCount = 4 + Math.floor(Math.random() * 2);
    var placed = 0;
    while (placed < bugCount) {
      var idx = Math.floor(Math.random() * occ.length);
      if (!occ[idx]) { occ[idx] = true; placed++; }
    }
    heroIdx = Math.floor(Math.random() * occ.length);
    occ[heroIdx] = false;
    bestIdx = -1; bestCount = -1;
    for (var i = 0; i < occ.length; i++) {
      if (occ[i]) continue;
      var c = countAdjacent(occ, i);
      if (c > bestCount) { bestCount = c; bestIdx = i; }
    }
    hitCount = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptSweep(i) {
    var c = countAdjacent(occ, i);
    heroIdx = i;
    if (c >= 2 && c === bestCount) {
      hitCount = c;
      ok = true; finished = true; hitStop = 0.15;
      var p = cellPos(cellXYFromIndex(i).cx, cellXYFromIndex(i).cy);
      game.feedback.good(p.x, p.y, { text: 'HIT x' + c, color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      hitCount = c;
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      var p2 = cellPos(cellXYFromIndex(i).cx, cellXYFromIndex(i).cy);
      game.feedback.bad(p2.x, p2.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var cx = Math.round((x - BOARD_X) / CELL) + 1;
      var cy = Math.round((y - BOARD_Y) / CELL) + 1;
      if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) {
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_tap', 0.2);
        return;
      }
      var i = cy * GRID + cx;
      if (occ[i]) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_bad', 0.3); return; }
      game.audio.play('se_tap', 0.15);
      attemptSweep(i);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, resolved: false };
  function resetDemo() {
    initGame();
    demo.resolved = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var p = cellPos(cellXYFromIndex(bestIdx).cx, cellXYFromIndex(bestIdx).cy);
    if (cyc < 2.0) {
      var t2 = cyc / 2.0;
      var hp = cellPos(cellXYFromIndex(heroIdx).cx, cellXYFromIndex(heroIdx).cy);
      demo.gx = hp.x + (p.x - hp.x) * t2;
      demo.gy = hp.y + (p.y - hp.y) * t2;
      demo.press = false;
    } else if (cyc < 2.15) {
      demo.press = true;
      if (!demo.resolved) {
        demo.resolved = true;
        heroIdx = bestIdx;
        game.feedback.good(p.x, p.y, { text: 'HIT x' + bestCount, color: C.good });
        game.fx.burst(p.x, p.y, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_good', 0.3);
      }
    } else {
      demo.gx = p.x; demo.gy = p.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!occ) initGame();
      stepDemo(dt);
      bg();
      drawBoard(occ, heroIdx, bestIdx, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard(occ, heroIdx, bestIdx, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hitCount + ' / ' + bestCount, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, bestCount - hitCount) + '匹!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hitCount, { hitCount: hitCount, best: bestCount });
        else game.end.failure({ hitCount: hitCount, best: bestCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeftTick(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard(occ, heroIdx, bestIdx, false);

    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    txt(Math.round(barPct * 100) + ' / ' + 100, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function timeLeftTick(dt) {
    roundClock += dt;
    if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
      halfCalled = true;
      var p = cellPos(cellXYFromIndex(bestIdx).cx, cellXYFromIndex(bestIdx).cy);
      game.fx.popup('NICE', p.x, p.y - 160, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (roundClock >= MAX_TIME) {
      ok = false; finished = true; hitCount = 0; shake = 0.3; hitStop = 0.3;
      game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onStart(function() {
    game.audio.melody([['G4', 0.35], ['B4', 0.35], ['D5', 0.35], ['G5', 0.7]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
