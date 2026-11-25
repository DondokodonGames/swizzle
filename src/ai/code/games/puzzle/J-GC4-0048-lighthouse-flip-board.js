// J-GC4-0048-lighthouse-flip-board.js
// 灯台の信号盤 — 灯台が送ってくる模様と見比べ、違うチップだけを一筆でなぞって裏返し、信号盤を合わせる
// 操作: 盤の上を指でなぞると、通ったチップが1回ずつ裏返る(同じひとなぞりでは同じチップは1回だけ)。合っているチップを通ると崩れる
// 終わり: 3枚の模様を合わせればCLEAR。時間切れでGAME OVER(合っているチップを崩すと残り時間が減る)
// @mechanic: trace
// @theme: lighthouse_flip_board
// 世界観: 霧の港の信号所で、見習い信号手が沖の灯台から届く点滅模様を読み取り、岸の信号盤の違うチップだけを一筆でなぞり返して船に同じ合図を返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせた盤の数・一筆で決めた数
// スタイル: 8bit PC MONITOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var STYLE = {
    bg: ['#000033', '#000066', '#0000aa'],
    main: ['#55ffff', '#ffffff', '#aaaaaa'],
    accent: ['#ffff55', '#ff5555'],
  };
  var AMBER = STYLE.accent[0];
  var RED = STYLE.accent[1];
  var CYAN = STYLE.main[0];
  var GREEN = '#55ff55';
  var NAVY = '#0000aa';

  var GAME_TITLE = 'SIGNAL FLIP';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var N = 4;
  var CELL = 196;
  var GAPC = 16;
  var BX = (W - (N * CELL + (N - 1) * GAPC)) / 2;
  var BY = 700;
  var MINI = 52;
  var MX = W - 60 - N * (MINI + 6);
  var MY = 300;
  var PATH_LEN = [3, 5, 6];
  var PENALTY = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var LAMP = ['.yy.', 'yyyy', '.ww.', '.ww.'];
  var WAVE = ['....', 'c.c.', '.c.c', '....'];
  var TOWER = [
    [
      '..yy..',
      '.wwww.',
      '..rr..',
      '..ww..',
      '..rr..',
      '.wwww.',
      '.rrrr.',
      'wwwwww',
    ],
    [
      '..YY..',
      '.wwww.',
      '..rr..',
      '..ww..',
      '..rr..',
      '.wwww.',
      '.rrrr.',
      'wwwwww',
    ],
  ];
  var TOWER_PAL = { y: '#ffff55', Y: '#ffffff', w: '#ffffff', r: '#ff5555' };
  var GULL = [['w...w', '.w.w.', '..w..'], ['.....', 'ww.ww', '..w..']];

  var board, target, flipAnim, touched, stroking, strokeFlips, strokeBad, boardsDone, oneStroke, timeLeft, ready;
  var hitStop, hitCell, ended, endWait, won, score, boardT, beamT, nextWait, lastCell;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 2, y + 2, { size: size, color: '#000000', bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center', font: 'monospace' });
  }

  function makeBoard(len) {
    board = [];
    target = [];
    flipAnim = [];
    for (var i = 0; i < N * N; i++) {
      var v = Math.random() < 0.5 ? 1 : 0;
      board.push(v);
      target.push(v);
      flipAnim.push(0);
    }
    // 目標との違いは一筆でなぞれる連結した道になる
    var r = Math.floor(game.random(0, N - 0.001));
    var c = Math.floor(game.random(0, N - 0.001));
    var path = [r * N + c];
    var guard = 0;
    while (path.length < len && guard++ < 200) {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      var d = dirs[Math.floor(game.random(0, 3.999))];
      var nr = r + d[0], nc = c + d[1];
      if (nr < 0 || nc < 0 || nr >= N || nc >= N) continue;
      var id = nr * N + nc;
      if (path.indexOf(id) >= 0) continue;
      path.push(id);
      r = nr; c = nc;
    }
    for (var k = 0; k < path.length; k++) target[path[k]] = 1 - target[path[k]];
    boardT = 0;
    oneStroke = true;
    touched = {};
    lastCell = -1;
  }

  function initGame() {
    boardsDone = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitCell = -1;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    stroking = false;
    strokeFlips = 0;
    strokeBad = 0;
    beamT = 0;
    nextWait = 0;
    makeBoard(PATH_LEN[0]);
  }

  function cellAt(x, y) {
    for (var i = 0; i < N * N; i++) {
      var cx = BX + (i % N) * (CELL + GAPC);
      var cy = BY + Math.floor(i / N) * (CELL + GAPC);
      // 角をかすめた誤反応を防ぐため少し内側だけを有効にする
      if (x > cx + 14 && x < cx + CELL - 14 && y > cy + 14 && y < cy + CELL - 14) return i;
    }
    return -1;
  }

  function mismatches() {
    var n = 0;
    for (var i = 0; i < N * N; i++) if (board[i] !== target[i]) n++;
    return n;
  }

  function cellCenter(i) {
    return { x: BX + (i % N) * (CELL + GAPC) + CELL / 2, y: BY + Math.floor(i / N) * (CELL + GAPC) + CELL / 2 };
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.4;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function enterCell(i, demo) {
    if (i < 0 || touched[i] || ended || nextWait > 0) return;
    touched[i] = true;
    lastCell = i;
    var wasRight = board[i] === target[i];
    board[i] = 1 - board[i];
    flipAnim[i] = 1;
    strokeFlips++;
    var p = cellCenter(i);
    if (wasRight) {
      // 合っていたチップを崩した: 因果を見せてから減点
      strokeBad++;
      oneStroke = false;
      hitStop = 0.35;
      hitCell = i;
      timeLeft = Math.max(0, timeLeft - PENALTY);
      game.feedback.bad(p.x, p.y, { text: 'MISS', volume: demo ? 0 : undefined });
    } else {
      if (!demo) game.audio.tone(640 + strokeFlips * 80, 0.06, { wave: 'square', volume: 0.05 });
      game.fx.burst(p.x, p.y, { color: AMBER, count: 6, speed: 180 });
    }
    if (mismatches() === 0) boardComplete(demo);
  }

  function boardComplete(demo) {
    boardsDone++;
    var perfect = oneStroke && strokeBad === 0;
    score += 300 + Math.round(Math.max(0, 5 - boardT) * 60) + (perfect ? 200 : 0);
    game.feedback.good(W / 2, BY + 2 * (CELL + GAPC), { text: perfect ? 'PERFECT' : 'GOOD', color: GREEN, count: 24, volume: demo ? 0 : undefined });
    beamT = 0.9;
    if (!demo && boardsDone === 2) {
      game.fx.popup(boardsDone + ' / ' + NEEDED, W / 2, BY - 90, { color: AMBER, size: 60 });
      game.audio.play('se_milestone', 0.5);
    }
    if (boardsDone >= NEEDED && !demo) { endGame(true, demo); return; }
    nextWait = 0.55;
  }

  function beginStroke() {
    stroking = true;
    touched = {};
    strokeFlips = 0;
    strokeBad = 0;
  }

  function endStroke(demo) {
    if (!stroking) return;
    stroking = false;
    if (strokeFlips > 0 && mismatches() > 0) oneStroke = false;
    if (strokeFlips === 0 && !demo) game.audio.play('se_tap', 0.15);
  }

  function stepBoard(dt, demo) {
    boardT += dt;
    for (var i = 0; i < flipAnim.length; i++) if (flipAnim[i] > 0) flipAnim[i] = Math.max(0, flipAnim[i] - dt * 5);
    if (beamT > 0) beamT -= dt;
    if (nextWait > 0) {
      nextWait -= dt;
      if (nextWait <= 0) makeBoard(PATH_LEN[Math.min(boardsDone, PATH_LEN.length - 1)]);
    }
  }

  // ── 描画 ──
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // モニタの走査線
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.18);
    // 海と霧(遠景)
    game.draw.rect(0, 560, W, 60, NAVY, 0.7);
    for (var w = 0; w < 12; w++) {
      var wx = (w * 97 + t * 40) % (W + 80) - 40;
      game.draw.sprite(WAVE, { c: CYAN }, wx, 590 + (w % 3) * 10, 6, { anchor: 'center', alpha: 0.6 });
    }
    // 灯台と光線
    var tx = 150, ty = 450 + Math.sin(t * 1.1) * 4;
    game.draw.sprite(TOWER[Math.floor(t * 3) % 2], TOWER_PAL, tx, ty, 18, { anchor: 'center' });
    var beamA = beamT > 0 ? 0.55 : 0.12 + 0.08 * Math.sin(t * 3);
    for (var b = 0; b < 6; b++) game.draw.rect(tx + 50 + b * 20, ty - 60 - b * 3, 22, 10 + b * 6, AMBER, beamA * (1 - b * 0.12));
    // カモメ
    var gx = (t * 70) % (W + 120) - 60;
    game.draw.sprite(GULL[Math.floor(t * 4) % 2], { w: '#ffffff' }, gx, 280 + Math.sin(t * 2) * 12, 8, { anchor: 'center' });
    // 画面枠
    game.draw.rect(20, 240, W - 40, 3, STYLE.main[2]);
    game.draw.rect(20, H - 40, W - 40, 3, STYLE.main[2]);
    game.draw.rect(0, 0, W, H, CYAN, 0.02 + 0.02 * Math.sin(t * 1.5));
  }

  function drawTarget() {
    var t = game.time.elapsed;
    game.draw.rect(MX - 16, MY - 16, N * (MINI + 6) + 26, N * (MINI + 6) + 26, STYLE.main[2]);
    game.draw.rect(MX - 12, MY - 12, N * (MINI + 6) + 18, N * (MINI + 6) + 18, '#000033');
    for (var i = 0; i < N * N; i++) {
      var x = MX + (i % N) * (MINI + 6);
      var y = MY + Math.floor(i / N) * (MINI + 6);
      var blink = target[i] ? 0.8 + 0.2 * Math.sin(t * 6 + i) : 1;
      game.draw.rect(x, y, MINI, MINI, target[i] ? AMBER : NAVY, blink);
    }
    // 灯台から信号盤へ走る点線
    for (var d = 0; d < 8; d++) game.draw.rect(260 + d * 40, MY + 110, 20, 6, AMBER, 0.3 + 0.3 * Math.sin(t * 8 - d));
  }

  function drawBoard() {
    var t = game.time.elapsed;
    game.draw.rect(BX - 22, BY - 22, N * CELL + (N - 1) * GAPC + 44, N * CELL + (N - 1) * GAPC + 44, STYLE.main[2]);
    game.draw.rect(BX - 16, BY - 16, N * CELL + (N - 1) * GAPC + 32, N * CELL + (N - 1) * GAPC + 32, '#000022');
    for (var i = 0; i < N * N; i++) {
      var cx = BX + (i % N) * (CELL + GAPC);
      var cy = BY + Math.floor(i / N) * (CELL + GAPC);
      var fa = flipAnim[i];
      var sq = fa > 0 ? Math.abs(Math.cos(fa * Math.PI)) : 1;
      var wv = CELL * Math.max(0.08, sq);
      var ox = cx + (CELL - wv) / 2;
      var lit = board[i] === 1;
      var bob = Math.sin(t * 2 + i * 0.7) * 2;
      game.draw.rect(ox, cy + bob, wv, CELL, lit ? AMBER : NAVY);
      game.draw.rect(ox, cy + bob, wv, 6, '#ffffff', 0.5);
      game.draw.rect(ox, cy + CELL - 8 + bob, wv, 8, '#000000', 0.4);
      if (sq > 0.5) game.draw.sprite(lit ? LAMP : WAVE, lit ? { y: '#aa5500', w: '#ffffff' } : { c: CYAN }, cx + CELL / 2, cy + CELL / 2 + bob, 18, { anchor: 'center' });
      if (touched[i] && stroking) game.draw.rect(cx, cy + bob, CELL, CELL, '#ffffff', 0.18);
      if (hitStop > 0 && hitCell === i) {
        var grow = (0.35 - hitStop) * 60;
        game.draw.rect(cx - grow, cy - grow, CELL + grow * 2, CELL + grow * 2, RED, 0.5);
        game.draw.rect(cx, cy, CELL, CELL, '#ffffff', 0.5);
      }
    }
  }

  function drawHud() {
    txt(boardsDone + ' / ' + NEEDED, 60, 110, 52, AMBER, 'left');
    txt('SCORE ' + score, W - 60, 110, 36, STYLE.main[1], 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 20, '#000022');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? RED : GREEN);
    // 残り違い数
    txt(String(mismatches()), MX - 60, MY + 130, 48, CYAN, 'center');
  }

  function drawScene() {
    drawBackground();
    drawTarget();
    drawBoard();
  }

  // ── ATTRACT ゴースト実演: 違うチップの道を実ロジックでなぞる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, path: [], loop: 0, idx: 0 };
  function demoPath() {
    // 違うチップを隣接順に並べる
    var diff = [];
    for (var i = 0; i < N * N; i++) if (board[i] !== target[i]) diff.push(i);
    if (!diff.length) return [];
    var ends = diff.filter(function (a) {
      var n = 0;
      diff.forEach(function (b) { if (Math.abs((a % N) - (b % N)) + Math.abs(Math.floor(a / N) - Math.floor(b / N)) === 1) n++; });
      return n <= 1;
    });
    var cur = ends.length ? ends[0] : diff[0];
    var out = [cur];
    var left = diff.filter(function (a) { return a !== cur; });
    while (left.length) {
      var nx = -1;
      for (var k = 0; k < left.length; k++) {
        var a = left[k];
        if (Math.abs((a % N) - (cur % N)) + Math.abs(Math.floor(a / N) - Math.floor(cur / N)) === 1) { nx = k; break; }
      }
      if (nx < 0) nx = 0;
      cur = left[nx];
      out.push(cur);
      left.splice(nx, 1);
    }
    return out;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      ready = 0;
      makeBoard(demo.loop % 2 === 0 ? 4 : 3);
      demo.path = demoPath();
      // 失敗例: 2周に1回、最後に合っているチップへはみ出す
      if (demo.loop % 2 === 1 && demo.path.length) {
        var last = demo.path[demo.path.length - 1];
        var cand = [last + 1, last - 1, last + N, last - N].filter(function (c) { return c >= 0 && c < N * N && board[c] === target[c] && (Math.abs((c % N) - (last % N)) <= 1); });
        demo.wrong = cand.length ? cand[0] : -1;
        if (demo.wrong >= 0) {
          demo.path.pop();
          demo.path.push(demo.wrong);
          demo.path.push(last);
        }
      }
      demo.idx = 0;
      demo.loop++;
      beginStroke();
    }
    var step = 0.34;
    var k = (cyc - 0.5) / step;
    if (k >= 0 && demo.idx < demo.path.length) {
      if (Math.floor(k) >= demo.idx && demo.idx < demo.path.length) {
        enterCell(demo.path[demo.idx], true);
        demo.idx++;
      }
      var p0 = cellCenter(demo.path[Math.min(demo.path.length - 1, Math.floor(k))]);
      var p1 = cellCenter(demo.path[Math.min(demo.path.length - 1, Math.floor(k) + 1)]);
      var f = k - Math.floor(k);
      demo.gx = p0.x + (p1.x - p0.x) * f;
      demo.gy = p0.y + (p1.y - p0.y) * f;
      demo.press = true;
    } else if (k < 0) {
      var s = demo.path.length ? cellCenter(demo.path[0]) : { x: W / 2, y: H * 0.6 };
      demo.gx = W / 2 + (s.x - W / 2) * (cyc / 0.5);
      demo.gy = H * 0.9 + (s.y - H * 0.9) * (cyc / 0.5);
      demo.press = false;
    } else {
      demo.press = false;
      if (stroking) endStroke(true);
    }
    if (hitStop > 0) hitStop -= dt;
    stepBoard(dt, true);
    if (nextWait < 0) nextWait = 0;
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ended || ready > 0) return;
    beginStroke();
    var i = cellAt(x, y);
    if (i >= 0) enterCell(i, false);
    else game.audio.play('se_tap', 0.15);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || ended || ready > 0 || !stroking || hitStop > 0) return;
    var i = cellAt(x, y);
    if (i >= 0 && i !== lastCell) enterCell(i, false);
    else if (Math.random() < 0.04) game.audio.play('se_tap', 0.04);
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (stroking && strokeFlips > 0) game.audio.tone('C5', 0.05, { wave: 'triangle', volume: 0.04 });
    endStroke(false);
  });

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
  });

  game.onUpdate(function (dt) {
    if (!board) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.075, 60, AMBER);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 32, CYAN);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 42, AMBER);
      else txt('INSERT COIN', W / 2, H * 0.96, 34, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 250, W, 400, '#000033', 0.8);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 360, 84, won ? GREEN : RED);
      txt('SCORE ' + score, W / 2, 450, 46, '#ffffff');
      txt(boardsDone + ' / ' + NEEDED, W / 2, 520, 40, AMBER);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 590, 40, AMBER);
      else txt('BEST ' + (game.best || 0), W / 2, 590, 34, STYLE.main[2]);
      if (!won) txt('あと' + (NEEDED - boardsDone) + '枚!', W / 2, 200, 44, AMBER);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 36, '#ffffff');
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { boards: boardsDone };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else {
      timeLeft -= dt;
      stepBoard(dt, false);
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, BY + CELL * 2, { text: 'TIME UP' });
        endGame(false, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, BY + CELL * 2, 96, AMBER);
  });

  game.onStart(function () {
    game.audio.melody(
      [['E5', 0.25], ['B4', 0.25], ['G4', 0.5], ['E5', 0.25], ['B4', 0.25], ['A4', 0.5], ['F#4', 0.5], ['G4', 0.5], ['B4', 1]],
      { tempo: 120, wave: 'square', volume: 0.04, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
