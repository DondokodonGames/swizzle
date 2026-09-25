// D-20172021-0063-vein-cluster-crack.js
// ヴェインクラスター・クラック — 原石板に走る色脈のうち3つ以上つながった太い脈を見極めてタップで叩き割る
// 操作: 盤面のマスをタップ。同色が3マス以上つながっている脈なら割れる、2マス以下なら空振り
// 終わり: 規定数の脈を割れば成功。ミスを3回重ねるか時間切れで失敗
// @mechanic: spot
// @theme: gem_vein_appraisal
// 世界観: 鉱石鑑定士見習いが、窯入れ前の原石板に走る色脈を一目で見極め、太い脈だけを叩き割って規定数の原石を採取する
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った脈の数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・革のグラデ質感 + ボタンは上明下暗グラデで厚みを出す
  var STYLE = { bg: ['#3a2c1f', '#241a11'], main: ['#c98a4b', '#7a5230'], accent: ['#ffd24d', '#2bd67b'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], panel: '#4a3826', panelDark: '#241a11',
    hole: '#1a120c', ring: '#8a6a44',
    c0: '#e0703a', c1: '#3dd6c8', c2: '#b673e0',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd24d', ink: '#fff3e0', white: '#ffffff',
  };
  var COLORS = [C.c0, C.c1, C.c2];

  var GAME_TITLE = 'VEIN CRACK';
  var GRID = 5;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.44, CELL = 168;
  var OFF = (GRID - 1) / 2;
  var TARGET = 4;
  var MAX_MISS = 3;
  var TIME_LIMIT = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GEM = ['..#..', '.###.', '#####', '.###.', '..#..'];
  var WORKER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffd24d', pulse * 0.4);
    game.draw.sprite(WORKER, { '#': C.gold }, W * 0.85, H * 0.88, 10, { anchor: 'center' });
  }

  function idxRC(i) { return { c: i % GRID, r: Math.floor(i / GRID) }; }
  function cellPos(i) {
    var rc = idxRC(i);
    return { x: BOARD_X + (rc.c - OFF) * CELL, y: BOARD_Y + (rc.r - OFF) * CELL };
  }
  function neighborsOf(i) {
    var rc = idxRC(i);
    var list = [];
    var d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < d.length; k++) {
      var nc = rc.c + d[k][0], nr = rc.r + d[k][1];
      if (nc >= 0 && nc < GRID && nr >= 0 && nr < GRID) list.push(nr * GRID + nc);
    }
    return list;
  }
  function computeCluster(grid, i) {
    if (grid[i] < 0) return [];
    var color = grid[i];
    var visited = {}; visited[i] = true;
    var stack = [i]; var result = [i];
    while (stack.length) {
      var cur = stack.pop();
      var ns = neighborsOf(cur);
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k];
        if (!visited[n] && grid[n] === color) { visited[n] = true; result.push(n); stack.push(n); }
      }
    }
    return result;
  }
  function findTargetCluster(grid) {
    var seen = {};
    for (var i = 0; i < GRID * GRID; i++) {
      if (seen[i]) continue;
      var c = computeCluster(grid, i);
      for (var k = 0; k < c.length; k++) seen[c[k]] = true;
      if (c.length >= 3) return c;
    }
    return null;
  }
  function genBoard() {
    for (var attempt = 0; attempt < 30; attempt++) {
      var grid = [];
      for (var i = 0; i < GRID * GRID; i++) grid.push(Math.floor(game.random(0, 3)));
      if (findTargetCluster(grid)) return grid;
    }
    var fallback = [];
    for (var j = 0; j < GRID * GRID; j++) fallback.push(Math.floor(game.random(0, 3)));
    fallback[0] = 0; fallback[1] = 0; fallback[GRID] = 0;
    return fallback;
  }

  function drawBoard(grid, glowIdx) {
    game.draw.rect(BOARD_X - GRID * CELL / 2 - 20, BOARD_Y - GRID * CELL / 2 - 20, GRID * CELL + 40, GRID * CELL + 40, C.panelDark);
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      game.draw.rect(p.x - CELL / 2 + 5, p.y - CELL / 2 + 5, CELL - 10, CELL - 10, C.panel);
      if (grid[i] < 0) {
        game.draw.circle(p.x, p.y, CELL * 0.28, C.hole);
      } else {
        var bob = i === glowIdx ? Math.sin(game.time.elapsed * 8) * 6 : 0;
        var col = COLORS[grid[i]];
        game.draw.sprite(GEM, { '#': col }, p.x, p.y + bob, 26, { anchor: 'center' });
      }
    }
  }

  var grid, successes, misses, timeLeft, done, endWait, finished, ready, hitStop, shake, regenTimer;

  function initGame() {
    grid = genBoard();
    successes = 0; misses = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; regenTimer = -1;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function cellFromXY(x, y) {
    var c = Math.round((x - BOARD_X) / CELL + OFF);
    var r = Math.round((y - BOARD_Y) / CELL + OFF);
    if (c < 0 || c >= GRID || r < 0 || r >= GRID) return -1;
    return r * GRID + c;
  }

  function attemptTap(x, y) {
    var i = cellFromXY(x, y);
    if (i < 0 || grid[i] < 0) {
      misses++;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; hitStop = 0.3; shake = 0.25; finish(); }
      return;
    }
    var cluster = computeCluster(grid, i);
    if (cluster.length >= 3) {
      for (var k = 0; k < cluster.length; k++) grid[cluster[k]] = -1;
      successes++;
      var p = cellPos(i);
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play(successes % 2 === 0 ? 'se_milestone' : 'se_good', 0.35);
      if (successes === Math.ceil(TARGET / 2)) game.fx.popup('NICE', p.x, p.y - 150, { color: C.gold, size: 34 });
      if (successes >= TARGET) {
        ok = true; finished = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        regenTimer = 0.35;
      }
    } else {
      misses++;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; hitStop = 0.3; shake = 0.25; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished) {
      game.audio.play('se_tap', 0.15);
      attemptTap(x, y);
    }
  });

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false, resolved: false, target: -1 };
  function resetDemo() {
    initGame();
    var c = findTargetCluster(grid);
    demo.target = c ? c[0] : 0;
    demo.resolved = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var p = cellPos(demo.target);
    if (cyc < 1.8) {
      var t2 = cyc / 1.8;
      demo.gx = W * 0.5 + (p.x - W * 0.5) * t2;
      demo.gy = H * 0.95 + (p.y - H * 0.95) * t2;
      demo.press = false;
    } else if (cyc < 2.0) {
      demo.press = true;
      if (!demo.resolved) {
        demo.resolved = true;
        var cluster = computeCluster(grid, demo.target);
        for (var k = 0; k < cluster.length; k++) grid[cluster[k]] = -1;
        successes++;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.fx.burst(p.x, p.y, { color: C.gold, count: 18, speed: 380 });
        game.audio.play('se_good', 0.25);
      }
    } else {
      demo.gx = p.x; demo.gy = p.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) resetDemo();
      stepDemo(dt);
      bg();
      drawBoard(grid, demo.target);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard(grid, -1);
      // 結果画面限定の演出: 割った脈を並べた鑑定トレイ
      var trayY = H * 0.24;
      game.draw.rect(W * 0.5 - 220, trayY - 60, 440, 120, C.panelDark, 0.9);
      for (var s = 0; s < TARGET; s++) {
        var gx = W * 0.5 - 165 + s * 110;
        var lit = s < successes;
        game.draw.sprite(GEM, { '#': lit ? C.gold : '#5a4630' }, gx, trayY, 22, { anchor: 'center' });
      }
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(successes + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET - successes) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(successes, { cracked: successes, target: TARGET, misses: misses });
        else game.end.failure({ cracked: successes, target: TARGET, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (regenTimer > 0) {
        regenTimer -= dt;
        if (regenTimer <= 0) {
          var kept = successes, missKept = misses;
          grid = genBoard();
          successes = kept; misses = missKept;
          regenTimer = -1;
        }
      }
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard(grid, -1);

    txt(successes + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.panel, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(80 + m * 40, 190, 12, m < misses ? C.bad : C.panel);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
