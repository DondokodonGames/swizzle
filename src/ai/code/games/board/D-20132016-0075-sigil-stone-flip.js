// D-20132016-0075-sigil-stone-flip.js
// シジルストーン・フリップ — 4x4の盤上、相手の石を挟んで裏返す一手。特殊効果が乗る一手を見つけてタップ
// 操作: 打てる升目がうっすら光る中、ひときわ強く光る升目(最大枚数を裏返す一手)を見つけてタップする
// 終わり: 3手のうち2手以上で正しい升目を見つけられれば制圧成功。2手外せば盤面を奪われ失敗
// @mechanic: spot
// @theme: sigil_stone_flip
// 世界観: 盤上の駒使いが、小さな石盤で一度きりの手合わせに挑む。石を挟んで裏返すたび特殊効果の光が走り、最も強く光る升目を見抜けるかが勝負を分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜けた升目数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg: '#20283a', bg2: '#38445e', boardBg: '#141c28', cellLit: '#2a3a52',
    p1: '#3adcc0', p1Top: '#8af5e0', p1Dark: '#1a7a68',
    p2: '#ff7a4a', p2Top: '#ffb08a', p2Dark: '#a03a1a',
    glow: '#ffe600', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffe600', white: '#eef4ff', ink: '#080c14',
  };

  var GAME_TITLE = 'STONE FLIP';
  var CX = W * 0.5;
  var GRID = 4, CELL = 168, BOARD_X = CX - (GRID * CELL) / 2, BOARD_Y = H * 0.3;
  var TOTAL = 3;
  var SPOT_TIMEOUT = 2.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
  ];

  function drawKeeper() {
    var bobY = Math.sin(game.time.elapsed * 2.1) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.5) * 4;
    game.draw.sprite(KEEPER_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.p1Top }, CX + swayX, H * 0.86 + bobY, 15, { anchor: 'center' });
  }

  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  function idx(r, c) { return r * GRID + c; }
  function inBounds(r, c) { return r >= 0 && r < GRID && c >= 0 && c < GRID; }

  function flipsFor(board, r, c, me) {
    if (board[idx(r, c)] !== 0) return [];
    var opp = me === 1 ? 2 : 1;
    var all = [];
    for (var d = 0; d < DIRS.length; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1];
      var rr = r + dr, cc = c + dc, line = [];
      while (inBounds(rr, cc) && board[idx(rr, cc)] === opp) { line.push(idx(rr, cc)); rr += dr; cc += dc; }
      if (line.length > 0 && inBounds(rr, cc) && board[idx(rr, cc)] === me) { for (var i = 0; i < line.length; i++) all.push(line[i]); }
    }
    return all;
  }

  function legalMoves(board, me) {
    var moves = [];
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var f = flipsFor(board, r, c, me);
      if (f.length > 0) moves.push({ r: r, c: c, flips: f });
    }
    return moves;
  }

  function bestMove(moves) {
    if (moves.length === 0) return null;
    var best = moves[0];
    for (var i = 1; i < moves.length; i++) if (moves[i].flips.length > best.flips.length) best = moves[i];
    return best;
  }

  function applyMove(board, mv, me) {
    board[idx(mv.r, mv.c)] = me;
    for (var i = 0; i < mv.flips.length; i++) board[mv.flips[i]] = me;
  }

  var board, round, wins, losses, moves, glow, spotT, resolved, pieceFx;
  var finished, done, endWait, hitStop, shake, ready;

  function newBoard() {
    board = new Array(GRID * GRID).fill(0);
    board[idx(1, 1)] = 2; board[idx(1, 2)] = 1; board[idx(2, 1)] = 1; board[idx(2, 2)] = 2;
  }

  function newRound() {
    moves = legalMoves(board, 1);
    glow = bestMove(moves);
    spotT = 0; resolved = false; pieceFx = 0;
  }

  function initGame() {
    round = 0; wins = 0; losses = 0; finished = false; done = false;
    endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newBoard(); newRound();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function cellCenter(r, c) { return { x: BOARD_X + c * CELL + CELL / 2, y: BOARD_Y + r * CELL + CELL / 2 }; }

  function drawVoxel(x, y, sz, main, top, dark) {
    var bobY = Math.sin(game.time.elapsed * 2.6 + x * 0.01) * 2;
    game.draw.rect(x - sz / 2, y - sz / 2 + bobY, sz, sz * 0.62, main);
    game.draw.rect(x - sz / 2, y - sz / 2 + bobY, sz, sz * 0.18, top);
    game.draw.rect(x - sz / 2, y - sz / 2 + sz * 0.5 + bobY, sz, sz * 0.12, dark);
  }

  function drawBoard(showLegal) {
    game.draw.rect(BOARD_X - 14, BOARD_Y - 14, GRID * CELL + 28, GRID * CELL + 28, C.boardBg);
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cc = cellCenter(r, c);
        game.draw.rect(cc.x - CELL / 2 + 4, cc.y - CELL / 2 + 4, CELL - 8, CELL - 8, C.cellLit, (r + c) % 2 === 0 ? 0.5 : 0.35);
        var v = board[idx(r, c)];
        if (v === 1) drawVoxel(cc.x, cc.y, 110, C.p1, C.p1Top, C.p1Dark);
        else if (v === 2) drawVoxel(cc.x, cc.y, 110, C.p2, C.p2Top, C.p2Dark);
      }
    }
    if (showLegal && moves) {
      for (var i = 0; i < moves.length; i++) {
        var mv = moves[i], p = cellCenter(mv.r, mv.c);
        var isGlow = glow && mv.r === glow.r && mv.c === glow.c;
        if (isGlow) {
          var pulse = 0.5 + 0.4 * Math.sin(game.time.elapsed * 9);
          game.draw.circle(p.x, p.y, 42 + pulse * 10, C.glow, 0.6 + pulse * 0.3);
        } else {
          game.draw.circle(p.x, p.y, 30, C.white, 0.18);
        }
      }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveRound(success, tappedR, tappedC) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    hitStop = success ? 0.14 : 0.3;
    var p = glow ? cellCenter(glow.r, glow.c) : { x: CX, y: H * 0.5 };
    if (glow) applyMove(board, glow, 1);
    if (success) {
      wins++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.glow, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (wins === 2) { game.fx.popup('あと1手!', CX, H * 0.2, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
    } else {
      losses++;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    // AI応手
    var aiMoves = legalMoves(board, 2);
    var aiBest = bestMove(aiMoves);
    if (aiBest) applyMove(board, aiBest, 2);
    round++;
    if (wins >= 2) { ok = true; finished = true; finish(); return; }
    if (losses >= 2) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = wins > losses; finished = true; finish(); return; }
  }

  function tapCell(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    game.audio.play('se_tap', 0.1);
    var c = Math.floor((x - BOARD_X) / CELL), r = Math.floor((y - BOARD_Y) / CELL);
    if (!glow || !moves || moves.length === 0) { resolveRound(false); return; }
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) { resolveRound(false); return; }
    resolveRound(r === glow.r && c === glow.c, r, c);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapCell(x, y);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newBoard(); newRound(); }
    if (cyc < 2.0) {
      demo.press = false;
      if (cyc > 1.5 && !resolved) {
        if (glow) {
          var p = cellCenter(glow.r, glow.c);
          demo.gx = p.x; demo.gy = p.y; demo.press = true;
        }
        resolveRound(true);
      }
    } else {
      demo.press = false;
      if (resolved && cyc > 2.1 && cyc < 2.15) newRound();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (board === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBoard(true);
      drawKeeper();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard(false);
      drawKeeper();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(wins + ' / ' + TOTAL, W / 2, H * 0.15, 30, C.gold);
      if (!ok && wins >= 1) txt('あと1手!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { wins: wins, losses: losses };
        if (ok) game.end.success(wins, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spotT += dt;
      if (spotT >= SPOT_TIMEOUT && !resolved) resolveRound(false);
      if (resolved && hitStop <= 0 && !finished) { newRound(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard(!finished);
    drawKeeper();
    txt(wins + ' / ' + TOTAL, W / 2, H * 0.07, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.14, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
