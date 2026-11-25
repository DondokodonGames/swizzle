// D-20092012-0042-relic-tile-dig.js
// 遺跡タイル発掘 — 伏せられた絵柄タイルを2枚ずつめくり、同じ絵柄を見つけて片付ける
// 操作: タイルを1枚タップしてめくり、続けてもう1枚タップ。同じ絵柄なら消える
// 終わり: 全ペアを片付ければ成功。制限時間切れなら失敗
// @mechanic: pair_match
// @theme: relic_tile_dig
// 世界観: 砂に埋もれた遺跡の発掘隊員が、伏せられた紋様タイルを2枚ずつめくって同じ紋様を探し当て、盤面をすべて片付ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 片付けたペア数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 黒い太輪郭 + 明暗2色だけの塗り
  var C = {
    sand1: '#e8c878', sand2: '#c69a4a', ink: '#1a1206',
    white: '#fff8e6', gold: '#ffcf3d',
    good: '#3fbf6a', bad: '#e14a3f', tileBack: '#8a5a2e', tileFace: '#f0dca0',
  };
  var SYMS = [
    ['..#..', '.#.#.', '#####', '.#.#.', '..#..'], // 星
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], // 砂時計
    ['.###.', '#...#', '#...#', '#...#', '.###.'], // 輪
  ];
  var SYM_COL = ['#c14a3a', '#2f7a4a', '#2f5a9a'];

  var GAME_TITLE = 'RELIC DIG';
  var COLS = 3, ROWS = 2; // 3ペア=6枚
  var CELL = W * 0.24, GX0 = W * 0.5 - (CELL * COLS) / 2, GY0 = H * 0.34;
  var TIME_LIMIT = 15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var tiles, openIdx, matchedCount, timeLeft, halfShown, resolveWait, resolvePair;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIGGER = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sand1], [1, C.sand2]]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, H * 0.6 + i * 14, W, 4, '#00000008');
  }

  function cellCX(i) { return GX0 + (i % COLS) * CELL + CELL / 2; }
  function cellCY(i) { return GY0 + Math.floor(i / COLS) * CELL + CELL / 2; }

  function drawTiles() {
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var x = cellCX(i), y = cellCY(i);
      if (t.matched) continue;
      game.draw.rect(x - CELL / 2 + 8, y - CELL / 2 + 8, CELL - 16, CELL - 16, C.ink);
      if (t.open || i === resolvePair) {
        game.draw.rect(x - CELL / 2 + 12, y - CELL / 2 + 12, CELL - 24, CELL - 24, C.tileFace);
        game.draw.sprite(SYMS[t.sym], { '#': SYM_COL[t.sym] }, x, y, 12, { anchor: 'center' });
      } else {
        game.draw.rect(x - CELL / 2 + 12, y - CELL / 2 + 12, CELL - 24, CELL - 24, C.tileBack);
        game.draw.rect(x - CELL / 2 + 20, y - CELL / 2 + 20, CELL - 40, 6, '#ffffff30');
      }
    }
  }

  function shuffledTiles() {
    var syms = [0, 0, 1, 1, 2, 2];
    for (var i = syms.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = syms[i]; syms[i] = syms[j]; syms[j] = t;
    }
    var arr = [];
    for (var k = 0; k < syms.length; k++) arr.push({ sym: syms[k], open: false, matched: false });
    return arr;
  }

  function initGame() {
    tiles = shuffledTiles();
    openIdx = []; matchedCount = 0; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT; resolveWait = 0; resolvePair = -1;
  }

  function tileAt(x, y) {
    for (var i = 0; i < tiles.length; i++) {
      if (Math.abs(x - cellCX(i)) < CELL * 0.5 && Math.abs(y - cellCY(i)) < CELL * 0.5) return i;
    }
    return -1;
  }

  function openTile(i) {
    if (i < 0 || tiles[i].matched || tiles[i].open || resolveWait > 0) return;
    tiles[i].open = true;
    game.audio.play('se_tap', 0.35);
    openIdx.push(i);
    if (openIdx.length === 2) {
      var a = tiles[openIdx[0]], b = tiles[openIdx[1]];
      if (a.sym === b.sym) {
        a.matched = true; b.matched = true;
        matchedCount++;
        game.feedback.good(cellCX(openIdx[1]), cellCY(openIdx[1]), { text: 'NICE', color: C.good, sound: 'se_coin' });
        game.fx.burst(cellCX(openIdx[1]), cellCY(openIdx[1]), { color: SYM_COL[a.sym], count: 16, speed: 300 });
        if (!halfShown && matchedCount >= 2) {
          halfShown = true;
          game.fx.popup('HALFWAY!', W * 0.5, H * 0.24, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.5);
        }
        openIdx = [];
        if (matchedCount >= 3) { ok = true; finished = true; hitStop = 0.1; finish(); }
      } else {
        resolveWait = 0.5;
        game.audio.play('se_tap', 0.2);
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    openTile(tileAt(x, y));
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: cellCX(0), gy: cellCY(0), press: false };
  function stepDemo(dt) {
    if (tiles === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      tiles = [{ sym: 0, open: false, matched: false }, { sym: 1, open: false, matched: false }, { sym: 0, open: false, matched: false },
        { sym: 2, open: false, matched: false }, { sym: 1, open: false, matched: false }, { sym: 2, open: false, matched: false }];
      openIdx = []; matchedCount = 0; halfShown = false; resolveWait = 0; demo.step = 0;
    }
    if (resolveWait > 0) { resolveWait -= dt; if (resolveWait <= 0) { for (var i = 0; i < openIdx.length; i++) tiles[openIdx[i]].open = false; openIdx = []; } }
    if (cyc > 0.25 && cyc < 0.45 && demo.step === 0) { demo.gx = cellCX(0); demo.gy = cellCY(0); demo.press = true; }
    else if (cyc >= 0.45 && cyc < 0.5 && demo.step === 0) { demo.step = 1; openTile(0); }
    else if (cyc >= 0.6 && cyc < 0.8 && demo.step === 1) { demo.gx = cellCX(2); demo.gy = cellCY(2); demo.press = true; }
    else if (cyc >= 0.8 && cyc < 0.85 && demo.step === 1) { demo.step = 2; openTile(2); }
    else { demo.press = false; if (cyc < 0.2) demo.step = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawTiles();
      game.draw.sprite(DIGGER, { '#': C.ink, '.': null }, W * 0.5, H * 0.82, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 34, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(matchedCount + ' / 3', W / 2, H * 0.13, 28, C.ink);
      if (!ok) txt('あと' + Math.max(1, 3 - matchedCount) + '組!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pairs: matchedCount, total: 3 };
        if (ok) game.end.success(matchedCount, stats); else game.end.failure(stats);
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
        game.feedback.bad(W * 0.5, GY0 + CELL, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      } else if (resolveWait > 0) {
        resolveWait -= dt;
        if (resolveWait <= 0) { for (var i = 0; i < openIdx.length; i++) tiles[openIdx[i]].open = false; openIdx = []; }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTiles();
    game.draw.sprite(DIGGER, { '#': C.ink, '.': null }, W * 0.5, H * 0.82, 16, { anchor: 'center' });

    txt(matchedCount + ' / 3', W / 2, H * 0.06, 28, C.ink);
    var warn = timeLeft < 3;
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, warn ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.3], ['A3', 0.3], ['C4', 0.3], ['F4', 0.6]], { tempo: 110, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
