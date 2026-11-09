// I-Wii-0013v3-goclub-stone-flip-turns.js
// 白黒ひっくり返し — 碁盤の上で老人と交互に石を1枚ずつ裏返す。老人は黒を横に4つ並べたがる。自分の番では、黒の並びを崩す1枚を選んで白に返す
// 操作: 自分の番(下の帯が減っている間)に、黒石を1つタップすると白に裏返る。老人は次の番に白石を1つ黒に返す。横一列に黒が4つ以上つながったら老人の勝ち。帯が尽きると左上から最初の黒を自動で返す
// 終わり: 盤は3面(2段・3段・3段)。各面2往復しのげばその面は勝ち。3面中2面勝てばCLEAR。2面負けるか、24秒を超えるとGAME OVER
// @mechanic: turn_attack
// @theme: community_hall_go_club_flip
// 世界観: 公民館の囲碁クラブの片隅で、少年が碁盤をはさんで老人と向かい合い、白黒両面の石を1枚ずつ裏返し合って、老人の黒の並びを崩していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 勝った面の数・しのいだ手数・スコア
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 墨と紙の2値。中間は網線(ハッチ)で作り、線の太さで強さを語る
  var STYLE = { bg: ['#f2efe6', '#d8d4c8'], main: ['#111111', '#f2efe6', '#5a5a5a'], accent: ['#111111', '#ffffff'] };
  var INK = STYLE.main[0], PAPER = STYLE.main[1], GREY = STYLE.main[2], WHITE = STYLE.accent[1];

  var GAME_TITLE = 'KURO SHIRO';
  var TIME_LIMIT = 24;
  var TURN_T = 2.6;
  var OLD_T = 0.75;
  var RUN = 4;
  var EXCH = 2;
  var COLS = 6;
  var CELL = 150, X0 = 165, R = 56;
  var BOARDS = [
    ['BWWWBW', 'BBBWBW'],
    ['BWBBBW', 'BWWBBW', 'WWWBBW'],
    ['BBBWBB', 'WBBWWB', 'WWWWBB'],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var bi, grid, rowsY, turn, ex, turnT, oldPick, oldT, flipping, results, wins, losses, safeMoves, score, finalScore;
  var timeLeft, readyT, stopT, winRun, boardT, fin, cleared, postT, joyT, sadT, oldJoyT, warnT, playT;

  // 少年(坊主頭)と老人(白ひげ)。1bit + 網点
  var BOY_A = ['....kkkk....', '...kkkkkk...', '..kk.kk.kk..', '..k.k..k.k..', '..kkkkkkkk..', '...kk..kk...', '....kkkk....', '..kkkkkkkk..', '.kk.kkkk.kk.', '.k..kkkk..k.', '..kkkkkkkk..'];
  var BOY_B = ['....kkkk....', '...kkkkkk...', '..kk.kk.kk..', '..k.k..k.k..', '..kkkkkkkk..', '...kkkkkk...', '....kkkk....', '..kkkkkkkk..', '.kk.kkkk.kk.', '.k..kkkk..k.', '..kkkkkkkk..'];
  var BOY_JOY = ['....kkkk....', '...kkkkkk...', '..kk.kk.kk..', '..k......k..', '..kkkkkkkk..', '...k....k...', 'k...kkkk...k', '.kkkkkkkkkk.', '...kkkkkk...', '...k.kk.k...', '..kkkkkkkk..'];
  var BOY_SAD = ['............', '....kkkk....', '...kkkkkk...', '..kk.kk.kk..', '..kkk..kkk..', '..kkkkkkkk..', '...kk..kk...', '..kkkkkkkk..', '.kk.kkkk.kk.', '.k..kkkk..k.', '..kkkkkkkk..'];
  var OLD_A = ['...k....k...', '..kkk..kkk..', '.k........k.', '.k.kk..kk.k.', '.k........k.', '.k.k.kk.k.k.', '..k.k.k.k...', '...k.k.k.k..', '..k.k.k.k...', '.kkkkkkkkkk.', 'kk.kkkkkk.kk'];
  var OLD_B = ['...k....k...', '..kkk..kkk..', '.k........k.', '.k.kk..kk.k.', '.k........k.', '.k.k.kk.k.k.', '...k.k.k.k..', '..k.k.k.k...', '...k.k.k.k..', '.kkkkkkkkkk.', 'kk.kkkkkk.kk'];
  var OLD_JOY = ['...k....k...', '..kkk..kkk..', '.k........k.', '.k.k....k.k.', '.k.kk..kk.k.', '.k..kkkk..k.', '..k.k.k.k...', '...k.k.k.k..', '..k.k.k.k...', 'kkkkkkkkkkkk', 'k..kkkkkk..k'];
  var PAL = { k: INK };
  var HAND = ['.kkk..', 'k...k.', 'k....k', 'k....k', '.kkkk.'];

  function out(str, x, y, sz, color, shadow) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: shadow || PAPER, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }
  function box(x, y, w, h, th) {
    game.draw.rect(x, y, w, th, INK); game.draw.rect(x, y + h - th, w, th, INK);
    game.draw.rect(x, y, th, h, INK); game.draw.rect(x + w - th, y, th, h, INK);
  }

  // ---- 盤の判定 ----
  function runAt(row, c) {
    var n = 1, l = c - 1, r = c + 1;
    while (l >= 0 && grid[row][l] === 'B') { n++; l--; }
    while (r < COLS && grid[row][r] === 'B') { n++; r++; }
    return n;
  }
  function longRun() {
    for (var r = 0; r < grid.length; r++) {
      var n = 0;
      for (var c = 0; c < COLS; c++) {
        n = grid[r][c] === 'B' ? n + 1 : 0;
        if (n >= RUN) { var e = c; while (e + 1 < COLS && grid[r][e + 1] === 'B') e++; var cells = []; for (var k = e; k >= 0 && grid[r][k] === 'B'; k--) cells.push([r, k]); return cells; }
      }
    }
    return null;
  }
  function threatCount() {
    var n = 0;
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] === 'W' && runAt(r, c) >= RUN) n++;
    return n;
  }
  // 老人の手: 4つ並べられるなら並べる。だめなら、次に並べられる場所(二つ目の狙い)が一番増える白を返す
  function oldChoose() {
    var best = null, bestS = -1e9;
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < COLS; c++) {
      if (grid[r][c] !== 'W') continue;
      var run = runAt(r, c);
      grid[r][c] = 'B';
      var s = (run >= RUN ? 1e6 : 0) + threatCount() * 100 + run * 10 - (r * COLS + c) * 0.01;
      grid[r][c] = 'W';
      if (s > bestS) { bestS = s; best = [r, c]; }
    }
    return best;
  }

  function startBoard(k) {
    bi = k; grid = [];
    for (var r = 0; r < BOARDS[k].length; r++) grid.push(BOARDS[k][r].split(''));
    var n = grid.length, mid = H * 0.47;
    rowsY = [];
    for (var j = 0; j < n; j++) rowsY.push(mid + (j - (n - 1) / 2) * 170);
    turn = 'me'; ex = 0; turnT = TURN_T; oldPick = null; flipping = null; winRun = null; boardT = 0;
  }

  function initGame() {
    results = []; wins = 0; losses = 0; safeMoves = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; oldJoyT = 0; warnT = 0; playT = 0;
    startBoard(0);
  }

  function cellXY(r, c) { return { x: X0 + c * CELL, y: rowsY[r] }; }

  // 石を返す(本番もデモも同じ処理)
  function flipStone(r, c, who) {
    flipping = { r: r, c: c, t: 0, who: who, to: who === 'me' ? 'W' : 'B' };
    var p = cellXY(r, c);
    if (who === 'me') {
      game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.08 });
      game.audio.play('se_tap', 0.3);
    } else game.audio.tone('A3', 0.07, { wave: 'square', volume: 0.08 });
    game.fx.burst(p.x, p.y, { color: who === 'me' ? INK : GREY, count: 6, speed: 220 });
  }

  function afterFlip() {
    var f = flipping;
    grid[f.r][f.c] = f.to;
    flipping = null;
    var p = cellXY(f.r, f.c);
    if (f.who === 'me') {
      if (threatCount() === 0) {
        safeMoves++; joyT = 0.5;
        var pts = 100 + Math.round(Math.max(0, turnT / TURN_T) * 60);
        if (mode === S.PLAYING) score += pts;
        game.feedback.good(p.x, p.y - 80, { text: 'GOOD', color: INK, size: 56 });
      } else game.audio.tone('C4', 0.08, { wave: 'triangle', volume: 0.06 });
      turn = 'old'; oldPick = oldChoose(); oldT = OLD_T;
    } else {
      var run = longRun();
      if (run) {
        // 4つ並んだ瞬間: 止めて白く光らせ、大きく見せる
        winRun = run; stopT = 0.45; oldJoyT = 1.2;
        game.fx.flash(WHITE, 0.15);
        game.audio.tone('C3', 0.3, { wave: 'square', volume: 0.1, slide: -80 });
        return;
      }
      ex++;
      if (ex >= EXCH) endBoard(true);
      else { turn = 'me'; turnT = TURN_T; }
    }
  }

  function endBoard(win) {
    results.push(win); turn = 'none'; boardT = 1.0;
    if (win) {
      wins++; joyT = 0.9;
      if (mode === S.PLAYING) {
        score += 300;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.3, { color: INK, size: 96 });
      }
    } else {
      losses++; sadT = 1.0;
    }
  }

  function autoPick() {
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] === 'B') { game.audio.tone('D3', 0.12, { wave: 'square', volume: 0.08 }); flipStone(r, c, 'me'); return; }
  }

  function stepBoard(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (oldJoyT > 0) oldJoyT -= dt;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        var c0 = winRun[Math.floor(winRun.length / 2)], p = cellXY(c0[0], c0[1]);
        game.feedback.bad(p.x, p.y - 90, { text: 'MISS', color: INK, size: 64 });
        winRun = null;
        endBoard(false);
      }
      return;
    }
    if (flipping) { flipping.t += dt; if (flipping.t >= 0.25) afterFlip(); return; }
    if (boardT > 0) {
      boardT -= dt;
      if (boardT <= 0) {
        if (mode === S.PLAYING) {
          if (losses >= 2) ending(false);
          else if (bi >= BOARDS.length - 1) ending(wins >= 2);
          else { startBoard(bi + 1); game.audio.play('se_jump', 0.3); }
        } else if (bi < BOARDS.length - 1) startBoard(bi + 1);
      }
      return;
    }
    if (turn === 'old') {
      oldT -= dt;
      if (oldT <= 0.3 && oldT + dt > 0.3) game.audio.tone('G4', 0.04, { wave: 'square', volume: 0.06 });
      if (oldT <= 0) flipStone(oldPick[0], oldPick[1], 'old');
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + wins * 200 + Math.round(timeLeft * 30) : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.45 + (i % 2) * 120, { color: i % 2 ? INK : GREY, count: 18, speed: 480 });
      game.fx.flash(WHITE, 0.2);
    } else sadT = 3;
  }

  function myTurn() { return mode === S.PLAYING && !fin && readyT <= 0 && stopT <= 0 && !flipping && boardT <= 0 && turn === 'me'; }

  function stoneAt(x, y) {
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < COLS; c++) {
      var p = cellXY(r, c);
      if (Math.abs(x - p.x) < CELL / 2 && Math.abs(y - p.y) < 80) return [r, c];
    }
    return null;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!myTurn()) { game.audio.play('se_tap', 0.06); return; }
    var s = stoneAt(x, y);
    if (s && grid[s[0]][s[1]] === 'B') flipStone(s[0], s[1], 'me');
    else if (s) {
      // 自分の白石は返せない
      var p = cellXY(s[0], s[1]);
      game.fx.burst(p.x, p.y, { color: GREY, count: 4, speed: 120 });
      game.audio.tone('C3', 0.06, { wave: 'square', volume: 0.06 });
    } else game.audio.play('se_tap', 0.06);
  });

  // ---- 描画 ----
  function hatch(x, y, w, h, gap, col) {
    for (var yy = y; yy < y + h; yy += gap) game.draw.rect(x, yy, w, 2, col);
  }
  function room(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 公民館の障子(遠景)
    for (var i = 0; i < 6; i++) box(20 + i * 180, 230, 160, 300, 4);
    for (var j = 0; j < 6; j++) { game.draw.line(100 + j * 180, 230, 100 + j * 180, 530, INK, 2); game.draw.line(20 + j * 180, 380, 180 + j * 180, 380, INK, 2); }
    hatch(0, 540, W, 40, 8, INK);
    // 碁盤
    var top = rowsY[0] - 110, bot = rowsY[rowsY.length - 1] + 110;
    game.draw.rect(70, top + 14, W - 140, bot - top, INK);
    game.draw.rect(60, top, W - 140, bot - top, PAPER);
    hatch(60, top, W - 140, bot - top, 10, GREY);
    box(60, top, W - 140, bot - top, 8);
    for (var r = 0; r < rowsY.length; r++) game.draw.line(X0 - 40, rowsY[r], X0 + (COLS - 1) * CELL + 40, rowsY[r], INK, 4);
    for (var c = 0; c < COLS; c++) game.draw.line(X0 + c * CELL, top + 30, X0 + c * CELL, bot - 30, INK, 2);
    // 4つ並びの物差し(盤の縁の目盛り: 4目ぶん)
    for (var m = 0; m < RUN; m++) game.draw.rect(X0 + m * CELL - 10, bot - 22, 20, 12, INK);
  }

  // 縦長の楕円(横幅 hw ≦ 高さ hh)を円の縦並びで近似。裏返る途中の薄い石に使う
  function blob(x, y, hw, hh, col) {
    if (hw >= hh - 1) { game.draw.circle(x, y, hh, col); return; }
    var n = Math.max(2, Math.ceil((hh - hw) / (hw * 0.5 + 1)) + 1);
    for (var i = 0; i < n; i++) game.draw.circle(x, y - (hh - hw) + (2 * (hh - hw)) * i / (n - 1), hw, col);
  }

  function drawStone(r, c, t) {
    var p = cellXY(r, c), col = grid[r][c], sx = 1, big = 1, lit = false;
    if (flipping && flipping.r === r && flipping.c === c) {
      var u = Math.min(1, flipping.t / 0.25);
      sx = Math.max(0.06, Math.abs(Math.cos(u * Math.PI)));
      if (u > 0.5) col = flipping.to;
    }
    if (winRun) for (var k = 0; k < winRun.length; k++) if (winRun[k][0] === r && winRun[k][1] === c) { big = 1.25; lit = Math.floor(t * 16) % 2 === 0; }
    var aimed = turn === 'old' && oldPick && oldPick[0] === r && oldPick[1] === c && oldT < 0.3 && Math.floor(t * 14) % 2 === 0;
    var rr = R * big, hw = rr * sx;
    blob(p.x, p.y, hw + 4, rr + 4, INK);
    if (col !== 'B' || lit) blob(p.x, p.y, Math.max(1, hw - 4), rr - 4, lit ? WHITE : PAPER);
    if (col === 'B' && !lit && sx > 0.5) game.draw.circle(p.x - rr * 0.35 * sx, p.y - rr * 0.35, rr * 0.18, WHITE);
    if (col === 'W' && !lit && sx > 0.5) hatch(p.x - rr * 0.5 * sx, p.y + rr * 0.2, rr * sx, rr * 0.4, 8, GREY);
    if (aimed) box(p.x - rr - 12, p.y - rr - 12, rr * 2 + 24, rr * 2 + 24, 6);
    // 自分の番: 返せる黒石の上に点がゆっくり明滅
    if (turn === 'me' && col === 'B' && !flipping && boardT <= 0 && stopT <= 0 && mode !== S.RESULT && Math.sin(t * 5 + c + r) > 0.2) {
      game.draw.circle(p.x, p.y - rr - 14, 6, INK);
    }
  }

  function drawPlayers(t) {
    // 老人(上)と伸びる手
    var of = oldJoyT > 0 || (fin && !cleared) ? OLD_JOY : (Math.floor(t * 1.5) % 2 ? OLD_A : OLD_B);
    game.draw.sprite(of, PAL, W / 2, 420 + Math.sin(t * 1.8) * 4, 16, { anchor: 'center' });
    if (turn === 'old' && oldPick && !flipping) {
      var p = cellXY(oldPick[0], oldPick[1]), u = Math.max(0, Math.min(1, (OLD_T - oldT) / (OLD_T - 0.2)));
      var hx = W / 2 + (p.x - W / 2) * u, hy = 520 + (p.y - 520) * u;
      game.draw.line(W / 2 + 60, 500, hx, hy - 20, INK, 10);
      game.draw.sprite(HAND, PAL, hx, hy - 30, 14, { anchor: 'center' });
    }
    // 少年(下)
    var bf = sadT > 0 || (fin && !cleared) ? BOY_SAD : (joyT > 0 || (fin && cleared)) ? BOY_JOY : (Math.floor(t * 2) % 2 ? BOY_A : BOY_B);
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 12)) * 20 : 0;
    game.draw.sprite(bf, PAL, W / 2, H * 0.78 + hop, 16, { anchor: 'center' });
    // 手番の帯(親指ゾーン)
    var bx = 100, by = H * 0.86, bw = W - 200;
    box(bx, by, bw, 50, 6);
    if (turn === 'me' && !flipping && boardT <= 0 && stopT <= 0) {
      var rr = mode === S.PLAYING ? Math.max(0, turnT / TURN_T) : 1;
      if (rr < 0.3 && Math.floor(t * 8) % 2 === 0) hatch(bx + 6, by + 6, (bw - 12) * rr, 38, 6, INK);
      else game.draw.rect(bx + 6, by + 6, (bw - 12) * rr, 38, INK);
    } else hatch(bx + 6, by + 6, bw - 12, 38, 12, GREY);
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    box(60, 30, W - 120, 28, 4);
    if (low) hatch(64, 34, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 20, 5, INK);
    else game.draw.rect(64, 34, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 20, INK);
    for (var b = 0; b < BOARDS.length; b++) {
      var x = 90 + b * 80;
      box(x - 30, 100, 60, 60, 4);
      if (b < results.length) {
        game.draw.circle(x, 130, 22, INK);
        if (results[b]) game.draw.circle(x, 130, 16, PAPER);
      } else if (b === bi) game.draw.circle(x, 130, 8, INK);
    }
    out(wins + ' / ' + BOARDS.length, W / 2, 130, 64, INK);
    out('' + score, W - 150, 130, 44, INK);
  }

  function drawScene(t) {
    room(t);
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < COLS; c++) drawStone(r, c, t);
    drawPlayers(t);
  }

  // ---- ATTRACT: 本物の flipStone()/oldChoose() で実演。1面目は並びの端を返して老人に4つ並べられ、2面目は並びの真ん中を返してしのぐ ----
  var demo = { t: 0, x: W / 2, y: H * 0.9, press: false, wait: 0 };
  function demoPick() {
    if (bi === 0) return [1, 4];
    var best = null, bestN = 99;
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < COLS; c++) {
      if (grid[r][c] !== 'B') continue;
      grid[r][c] = 'W';
      var th = threatCount();
      var n = 99;
      if (th === 0) { var o = oldChoose(); grid[o[0]][o[1]] = 'B'; n = threatCount(); grid[o[0]][o[1]] = 'W'; }
      grid[r][c] = 'B';
      if (n < bestN) { bestN = n; best = [r, c]; }
    }
    return best;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.target = null; demo.wait = 0.5; }
    stepBoard(dt);
    demo.press = false;
    var tx = W / 2, ty = H * 0.9;
    if (turn === 'me' && !flipping && boardT <= 0 && stopT <= 0) {
      if (!demo.target) { demo.target = demoPick(); demo.wait = 0.7; }
      var p = cellXY(demo.target[0], demo.target[1]);
      tx = p.x; ty = p.y + 10;
      demo.wait -= dt;
      demo.press = demo.wait < 0.15;
      if (demo.wait <= 0) { flipStone(demo.target[0], demo.target[1], 'me'); demo.target = null; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 8);
    demo.y += (ty - demo.y) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 96, INK);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, INK);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, INK);
      else out('TAP TO START', W / 2, H * 0.97, 40, INK);
      return;
    }

    if (mode === S.RESULT) {
      stepBoard(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, PAPER);
      box(90, H * 0.3, W - 180, 520, cleared ? 14 : 6);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, INK);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, INK);
      out(wins + ' / ' + BOARDS.length + '   GOOD ' + safeMoves, W / 2, H * 0.46, 44, INK);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, INK);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, INK);
      if (!cleared) out('あと' + Math.max(1, 2 - wins) + '面!', W / 2, H * 0.27, 64, INK);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, INK);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { wins: wins, losses: losses, safeMoves: safeMoves, boards: results.length };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      playT += dt;
      stepBoard(dt);
      if (!fin && myTurn()) {
        turnT -= dt;
        if (turnT < 0.8 && Math.floor(turnT * 4) !== Math.floor((turnT + dt) * 4)) game.audio.tone('B5', 0.04, { wave: 'square', volume: 0.06 });
        if (turnT <= 0) autoPick();
      }
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && timeLeft <= 0) {
        timeLeft = 0;
        game.fx.flash(WHITE, 0.15);
        if (wins >= 2) ending(true);
        else { game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: INK, size: 72 }); ending(false); }
      }
    }

    drawScene(t);
    // 開始直後のお手本: 1面目の正解の1つにうっすら手
    if (!fin && readyT <= 0 && bi === 0 && ex === 0 && playT < 1.4 && turn === 'me' && !flipping) {
      var hp = cellXY(1, 1);
      game.draw.hand(hp.x, hp.y + 10, { press: false, scale: 11, alpha: 0.4 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 120, INK, WHITE);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2],
      ['B4', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 1],
      ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['E4', 2],
    ], { tempo: 92, wave: 'triangle', volume: 0.06, loop: true, bass: [['E2', 2], ['B2', 2], ['D2', 2], ['E2', 2], ['G2', 2], ['D2', 2], ['B2', 2], ['E2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
