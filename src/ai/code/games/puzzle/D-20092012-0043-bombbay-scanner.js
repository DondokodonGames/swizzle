// D-20092012-0043-bombbay-scanner.js
// 爆弾ベイ走査 — 数字の手がかりから安全なマスを推理して開き、地雷を避けて盤面を片付ける
// 操作: 周囲の数字ヒントを見て、地雷でないと確信できるマスをタップして開ける
// 終わり: 安全マスを全て開ければ成功。地雷マスに触れれば失敗
// @mechanic: spot
// @theme: bombbay_scanner
// 世界観: 無人の貨物ベイに残された地雷原を、処理班員が数字ヒントだけを頼りに1マスずつ確信を持って開き、安全な区画を片付ける
// スタイル: 8bit PC MONITOR
// 残るもの: 正誤(CLEAR/GAME OVER) + 開けた安全マス数

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細い線とテキスト枠のUI
  var C = {
    bg: '#0a1a10', bg2: '#04100a', line: '#1f6a3a', ink: '#02120a',
    white: '#d8ffe0', gold: '#ffd23d', mine: '#ff4d4d',
    good: '#5dff9a', bad: '#ff5a5a', closed: '#123a22', open: '#0d2416',
  };

  var GAME_TITLE = 'BOMB SCANNER';
  var COLS = 4, ROWS = 4;
  var CELL = W * 0.19, GX0 = W * 0.5 - (CELL * COLS) / 2, GY0 = H * 0.28;
  // 0=安全, 1=地雷。数字ヒントは周囲8マスの地雷数
  var MINE_LAYOUT = [
    [0, 0, 1, 0],
    [0, 0, 0, 0],
    [1, 0, 0, 1],
    [0, 0, 0, 0],
  ];
  var SAFE_TOTAL = (function() {
    var n = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (!MINE_LAYOUT[r][c]) n++;
    return n;
  })();

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var opened, openedCount, halfShown, timeLeft;
  var done, endWait, finished, ready, hitStop, shake;
  var TIME_LIMIT = 12;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TECH = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 1, C.line, 0.15);
  }

  function cellCX(c) { return GX0 + c * CELL + CELL / 2; }
  function cellCY(r) { return GY0 + r * CELL + CELL / 2; }

  function hintAt(r, c) {
    var n = 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        if (MINE_LAYOUT[rr][cc]) n++;
      }
    }
    return n;
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX0 + c * CELL, y = GY0 + r * CELL;
        var isOpen = opened[r][c];
        game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, isOpen ? C.open : C.closed);
        game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, C.line, isOpen ? 0.3 : 0.6);
        if (isOpen) {
          if (MINE_LAYOUT[r][c]) {
            txt('!', cellCX(c), cellCY(r) + 12, 36, C.mine);
          } else {
            var h = hintAt(r, c);
            txt(h > 0 ? String(h) : '', cellCX(c), cellCY(r) + 12, 34, C.white);
          }
        } else {
          var wob = Math.sin(game.time.elapsed * 2.2 + r * 2 + c) * 3;
          game.draw.rect(x + CELL * 0.5 - 3, y + CELL * 0.5 - 14 + wob, 6, 6, C.gold, 0.5);
        }
      }
    }
  }

  function initGame() {
    opened = [];
    for (var r = 0; r < ROWS; r++) { opened.push(new Array(COLS).fill(false)); }
    openedCount = 0; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX0) / CELL), r = Math.floor((y - GY0) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r: r, c: c };
  }

  function openCell(rc) {
    if (!rc || opened[rc.r][rc.c]) return;
    opened[rc.r][rc.c] = true;
    if (MINE_LAYOUT[rc.r][rc.c]) {
      ok = false; finished = true; hitStop = 0.35;
      game.feedback.bad(cellCX(rc.c), cellCY(rc.r), { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    openedCount++;
    game.feedback.good(cellCX(rc.c), cellCY(rc.r), { text: 'GOOD', color: C.good, sound: 'se_good' });
    if (!halfShown && openedCount >= Math.ceil(SAFE_TOTAL / 2)) {
      halfShown = true;
      game.fx.popup('HALFWAY!', W * 0.5, H * 0.20, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.5);
    }
    if (openedCount >= SAFE_TOTAL) {
      ok = true; finished = true; hitStop = 0.1; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var rc = cellAt(x, y);
    if (!rc) return;
    game.audio.play('se_tap', 0.3);
    openCell(rc);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var DEMO_SAFE_ORDER = [{ r: 1, c: 1 }, { r: 0, c: 0 }];
  var demo = { t: 0, gx: cellCX(1), gy: cellCY(1), press: false };
  function stepDemo(dt) {
    if (opened === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      opened = [];
      for (var r = 0; r < ROWS; r++) opened.push(new Array(COLS).fill(false));
      openedCount = 0; halfShown = false; demo.step = 0;
    }
    var target = DEMO_SAFE_ORDER[demo.step] || DEMO_SAFE_ORDER[0];
    if (cyc > 0.25 && cyc < 0.5) { demo.gx = cellCX(target.c); demo.gy = cellCY(target.r); demo.press = true; }
    else if (cyc >= 0.5 && cyc < 0.55 && !demo.fired) {
      demo.fired = true;
      openCell(target);
      demo.step = (demo.step + 1) % DEMO_SAFE_ORDER.length;
    } else if (cyc < 0.25) { demo.fired = false; demo.press = false; }
    else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGrid();
      game.draw.sprite(TECH, { '#': C.white, '.': null }, W * 0.5, H * 0.86, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 32, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(openedCount + ' / ' + SAFE_TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, SAFE_TOTAL - openedCount) + 'マス!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { opened: openedCount, total: SAFE_TOTAL };
        if (ok) game.end.success(openedCount, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, GY0 + CELL * 1.5, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();
    game.draw.sprite(TECH, { '#': C.white, '.': null }, W * 0.5, H * 0.86, 16, { anchor: 'center' });

    txt(openedCount + ' / ' + SAFE_TOTAL, W / 2, H * 0.06, 28, C.white);
    var warn = timeLeft < 3;
    game.draw.rect(60, 150, W - 120, 16, C.line, 0.2);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, warn ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['A3', 0.4], ['D4', 0.4], ['F4', 0.6]], { tempo: 96, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
