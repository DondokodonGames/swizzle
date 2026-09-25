// D-20172021-0048-outpost-sightline-call.js
// アウトポストサイトラインコール — 盤上に散った部隊を見渡し、視界が通り射程内にある一体を瞬時に見抜いて指示を出す
// 操作: マス目に散らばる部隊の中から、敵まで視界が通り射程内にいる一体を見極めてタップする
// 終わり: 条件を満たす部隊を選べば成功。視界が遮られる/射程外の部隊を選べば失敗
// @mechanic: spot
// @theme: outpost_sightline_call
// 世界観: 前哨基地を守る斥候部隊長が、瓦礫に隠れながら散開した部隊を見渡し、敵への視界が通り射程内にいる一体だけを瞬時に見抜いて出撃を命じる
// 残るもの: 正誤(CLEAR/GAME OVER) + 選んだマス
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var C = {
    bg: '#0a1810', bg2: '#0a2418', grid: '#1a4a2a', gridLine: '#2a6a3a',
    unit: '#3fe0a0', unitDark: '#1a8a5a', enemy: '#ff5a4a', enemyDark: '#a02a20',
    obstacle: '#5a5a4a', obstacleDark: '#2a2a20',
    good: '#3fe0a0', bad: '#ff4d5e', gold: '#ffe04a', ink: '#d0ffe0', white: '#ffffff',
    losGood: '#3fe0a0', losBad: '#ff5a5a', losRange: '#ffb04a',
  };

  var GAME_TITLE = 'SIGHTLINE';
  var GRID = 4;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.44, CELL = 200;
  var RANGE = 2;
  var MAX_TIME = 9.5;
  var NEEDED = 1;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var UNIT_SPR = ['.#.', '###', '#.#'];
  var ENEMY_SPR = ['#.#', '.#.', '#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function cellPos(cx, cy) { return { x: BOARD_X + (cx - (GRID - 1) / 2) * CELL, y: BOARD_Y + (cy - (GRID - 1) / 2) * CELL }; }
  function idxXY(i) { return { cx: i % GRID, cy: Math.floor(i / GRID) }; }
  function chebyshev(i, j) { var a = idxXY(i), b = idxXY(j); return Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cy - b.cy)); }

  function hasObstacleBetween(i, j) {
    var a = idxXY(i), b = idxXY(j);
    var dx = b.cx - a.cx, dy = b.cy - a.cy;
    var steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return false;
    var sameRow = dy === 0, sameCol = dx === 0, sameDiag = Math.abs(dx) === Math.abs(dy);
    if (!sameRow && !sameCol && !sameDiag) return false; // 直線が通らない配置は判定対象外(視界は通る扱い)
    var stx = dx === 0 ? 0 : dx / Math.abs(dx);
    var sty = dy === 0 ? 0 : dy / Math.abs(dy);
    for (var s = 1; s < steps; s++) {
      var cx = a.cx + stx * s, cy = a.cy + sty * s;
      var idx = cy * GRID + cx;
      if (obstacles[idx]) return true;
    }
    return false;
  }

  var obstacles, units, enemyIdx, validList, chosen;
  var done, endWait, finished, ready, hitStop, shake, roundClock, halfCalled;

  function buildBoard() {
    var total = GRID * GRID;
    var attempts = 0;
    while (attempts < 40) {
      attempts++;
      obstacles = new Array(total).fill(false);
      units = new Array(total).fill(false);
      var obsCount = 3;
      var placed = 0;
      while (placed < obsCount) { var idx = Math.floor(Math.random() * total); if (!obstacles[idx]) { obstacles[idx] = true; placed++; } }
      do { enemyIdx = Math.floor(Math.random() * total); } while (obstacles[enemyIdx]);
      var unitCount = 5;
      placed = 0;
      while (placed < unitCount) {
        var uidx = Math.floor(Math.random() * total);
        if (!obstacles[uidx] && uidx !== enemyIdx && !units[uidx]) { units[uidx] = true; placed++; }
      }
      validList = [];
      var invalidCount = 0;
      for (var i = 0; i < total; i++) {
        if (!units[i]) continue;
        var rangeOK = chebyshev(i, enemyIdx) <= RANGE;
        var losOK = !hasObstacleBetween(i, enemyIdx);
        if (rangeOK && losOK) validList.push(i); else invalidCount++;
      }
      if (validList.length >= 1 && invalidCount >= 1) return;
    }
  }

  function drawBoard() {
    for (var i = 0; i < GRID * GRID; i++) {
      var c = idxXY(i);
      var p = cellPos(c.cx, c.cy);
      var inRange = chebyshev(i, enemyIdx) <= RANGE;
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, inRange ? C.grid : C.bg2, 1);
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, C.gridLine, 0.4);
    }
    for (var j = 0; j < obstacles.length; j++) {
      if (!obstacles[j]) continue;
      var c2 = idxXY(j), p2 = cellPos(c2.cx, c2.cy);
      game.draw.rect(p2.x - 70, p2.y - 70, 140, 140, C.obstacleDark, 1);
      game.draw.rect(p2.x - 70, p2.y - 70, 140, 40, C.obstacle, 1);
    }
    for (var k = 0; k < units.length; k++) {
      if (!units[k]) continue;
      var c3 = idxXY(k), p3 = cellPos(c3.cx, c3.cy);
      var rangeOK = chebyshev(k, enemyIdx) <= RANGE;
      var losOK = !hasObstacleBetween(k, enemyIdx);
      var lineCol = (rangeOK && losOK) ? C.losGood : (!losOK ? C.losBad : C.losRange);
      var ep = cellPos(idxXY(enemyIdx).cx, idxXY(enemyIdx).cy);
      game.draw.line(p3.x, p3.y, ep.x, ep.y, lineCol, 5);
    }
    var eb = cellPos(idxXY(enemyIdx).cx, idxXY(enemyIdx).cy);
    var bobE = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.sprite(ENEMY_SPR, { '#': C.enemy }, eb.x, eb.y + bobE, 30, { anchor: 'center' });
    for (var m = 0; m < units.length; m++) {
      if (!units[m]) continue;
      var c4 = idxXY(m), p4 = cellPos(c4.cx, c4.cy);
      var bob = Math.sin(game.time.elapsed * 2.5 + m) * 5;
      var isChosen = chosen === m;
      var col = isChosen ? (validList.indexOf(m) >= 0 ? C.good : C.bad) : C.unit;
      game.draw.sprite(UNIT_SPR, { '#': col }, p4.x, p4.y + bob, 26, { anchor: 'center' });
    }
  }

  function initGame() {
    buildBoard(); chosen = -1; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptChoose(i) {
    chosen = i;
    var p = cellPos(idxXY(i).cx, idxXY(i).cy);
    if (validList.indexOf(i) >= 0) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      ok = false; finished = true; hitStop = 0.3; shake = 0.28;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var cx = Math.round((x - BOARD_X) / CELL + (GRID - 1) / 2);
      var cy = Math.round((y - BOARD_Y) / CELL + (GRID - 1) / 2);
      if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) { game.audio.play('se_tap', 0.15); game.feedback.bad(x, y, { text: 'MISS' }); return; }
      var i = cy * GRID + cx;
      if (!units[i]) { game.audio.play('se_tap', 0.15); game.feedback.bad(x, y, { text: 'MISS' }); return; }
      game.audio.play('se_tap', 0.15);
      attemptChoose(i);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, resolved: false };
  function resetDemo() { initGame(); demo.resolved = false; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var target = validList[0];
    var p = cellPos(idxXY(target).cx, idxXY(target).cy);
    if (cyc < 2.0) {
      demo.gx = W * 0.5 + (p.x - W * 0.5) * (cyc / 2.0);
      demo.gy = H * 0.86 + (p.y - H * 0.86) * (cyc / 2.0);
      demo.press = false;
    } else if (cyc < 2.15) {
      demo.press = true;
      if (!demo.resolved) { demo.resolved = true; attemptChoose(target); }
    } else {
      demo.gx = p.x; demo.gy = p.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!units) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(validList.length + ' / ' + 5, W / 2, H * 0.135, 26, C.gold);
      if (!ok) txt('あと1手!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(NEEDED, { chosen: chosen, validCount: validList.length });
        else game.end.failure({ chosen: chosen, validCount: validList.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', BOARD_X, BOARD_Y - CELL * 1.3, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        ok = false; finished = true; shake = 0.28; hitStop = 0.3;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }

    bg();
    drawBoard();
    var pct = Math.max(0, 1 - roundClock / MAX_TIME);
    txt(Math.round(pct * 100) + ' / ' + 100, W / 2, H * 0.065, 28, C.ink);
    game.draw.rect(70, 150, W - 140, 16, '#0a2418', 1);
    game.draw.rect(70, 150, (W - 140) * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 100, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
