// D-20092012-0016-oak-tile-spellboard.js
// オークタイル・スペルボード — 木製トレイの文字タイルを、盤面の空欄へ正しい順にドラッグして単語を完成させる
// 操作: 手持ちの文字タイルを指でつまみ、盤面の光る空欄へ順番にドラッグして置く
// 終わり: 全空欄(5文字)を正しい順で埋めれば成功。制限時間内に埋め切れなければ失敗
// @mechanic: drag_sort
// @theme: oak_tile_spellboard
// 世界観: 古い書斎机の上のオーク材トレイと盤面。手持ちの文字タイルを正しい順に並べ、盤面の単語を完成させる知恵比べ
// 残るもの: 正誤(CLEAR/GAME OVER) + 埋めた文字数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・革の質感をgradient+細線で。ボタンは上明下暗グラデ+白ハイライト
  var C = {
    woodTop: '#c8955a', woodBot: '#8a5c30', felt: '#2f5a3a', feltDark: '#1c3a24',
    tileTop: '#fff6e6', tileBot: '#e8d4a8', tileEdge: '#a8824a',
    slotEmpty: '#1c3a24', slotGlow: '#ffd94a', ink: '#2a1a0c',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd94a', white: '#fff6e6',
  };

  var OWL = ['.##.', '####', '#OO#', '.##.'];
  var OWL2 = ['.##.', '####', '#oo#', '.##.'];

  var GAME_TITLE = 'TILE SPELLBOARD';
  var WORD = ['C', 'H', 'E', 'S', 'T']; // 5文字、当てはめる正解順
  var TOTAL = WORD.length;
  var BOARD_Y = H * 0.40;
  var TRAY_Y = H * 0.80;
  var SLOT_W = 130;
  var TILE_W = 128;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function boardStartX() { return W / 2 - (TOTAL - 1) * SLOT_W / 2; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.woodTop], [1, C.woodBot]]);
    for (var i = 0; i < 14; i++) game.draw.rect(0, i * (H / 14), W, 3, '#00000010');
    game.draw.rect(W * 0.5 - 420, BOARD_Y - 110, 840, 220, C.feltDark, 0.85);
    game.draw.rect(W * 0.5 - 400, BOARD_Y - 90, 800, 180, C.felt, 0.9);
  }

  var slots, tray, filled, draggingIdx, dragX, dragY, done, endWait, finished, timeLeft, MAX_TIME;
  var ready, hitStop, shake, milestoneDone;

  function shuffledTray() {
    var arr = WORD.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr.map(function(ch) { return { ch: ch, used: false }; });
  }

  function initGame() {
    slots = WORD.map(function(ch) { return { ch: ch, filled: false }; });
    tray = shuffledTray();
    filled = 0; draggingIdx = -1; dragX = 0; dragY = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
    MAX_TIME = 18; timeLeft = MAX_TIME;
  }

  function trayX(i) { return W / 2 - (tray.length - 1) * (TILE_W + 20) / 2 + i * (TILE_W + 20); }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = 0; i < tray.length; i++) {
      if (tray[i].used) continue;
      var tx = trayX(i);
      if (Math.abs(x - tx) < TILE_W / 2 && Math.abs(y - TRAY_Y) < TILE_W / 2) {
        draggingIdx = i; dragX = x; dragY = y;
        game.audio.play('se_tap', 0.15);
        return;
      }
    }
  });

  game.onMove(function(x, y) {
    if (draggingIdx < 0) return;
    dragX = x; dragY = y;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
  });

  game.onRelease(function(x, y) {
    if (draggingIdx < 0) return;
    var idx = draggingIdx; draggingIdx = -1;
    var startX = boardStartX();
    var nextSlot = filled; // 次に埋めるべき空欄は必ず左から順
    if (nextSlot >= TOTAL) return;
    var slotX = startX + nextSlot * SLOT_W;
    var nearSlot = Math.abs(x - slotX) < SLOT_W * 0.6 && Math.abs(y - BOARD_Y) < 120;
    if (nearSlot && tray[idx].ch === slots[nextSlot].ch) {
      tray[idx].used = true;
      slots[nextSlot].filled = true;
      filled++;
      game.feedback.good(slotX, BOARD_Y, { text: filled >= TOTAL ? 'CLEAR' : 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.35);
      if (filled === Math.ceil(TOTAL / 2) && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.22, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
      if (filled >= TOTAL) { ok = true; finished = true; hitStop = 0.15; finish(); }
    } else if (nearSlot) {
      hitStop = 0.2; shake = 0.15;
      game.feedback.bad(slotX, BOARD_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    } else {
      game.audio.play('se_tap', 0.1);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function updateGame(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0 && !finished) {
      timeLeft = 0; ok = false; finished = true; shake = 0.2;
      game.feedback.bad(W / 2, BOARD_Y, { text: 'TIME UP' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: W / 2, gy: TRAY_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (!finished) updateGame(dt);
    var stepDur = 4.0 / TOTAL;
    var wantFilled = Math.min(TOTAL, Math.floor((cyc > 0.5 ? cyc - 0.5 : 0) / stepDur));
    if (wantFilled > filled && !finished) {
      var nextSlot = filled;
      var srcIdx = -1;
      for (var i = 0; i < tray.length; i++) { if (!tray[i].used && tray[i].ch === slots[nextSlot].ch) { srcIdx = i; break; } }
      if (srcIdx >= 0) {
        var sx = trayX(srcIdx);
        demo.gx = sx; demo.gy = TRAY_Y; demo.press = true;
        var slotX = boardStartX() + nextSlot * SLOT_W;
        tray[srcIdx].used = true;
        slots[nextSlot].filled = true;
        filled++;
        game.feedback.good(slotX, BOARD_Y, { text: filled >= TOTAL ? 'CLEAR' : 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.25);
        demo.gx = slotX; demo.gy = BOARD_Y;
        if (filled >= TOTAL) { ok = true; finished = true; finish(); }
      }
    } else {
      demo.gx += Math.cos(game.time.elapsed * 2) * 0.6;
      demo.gy += Math.sin(game.time.elapsed * 2.4) * 0.6;
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (filled === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBoard();
      drawTray();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawBoard(); drawTray();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(filled + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - filled) + '文字!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(filled, { filled: filled, total: TOTAL });
        else game.end.failure({ filled: filled, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg(); drawBoard(); drawTray();
    if (draggingIdx >= 0) {
      var ch = tray[draggingIdx].ch;
      drawTile(dragX, dragY, ch, true);
    }

    txt(filled + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawOwl(mood) {
    var ox = W * 0.14, oy = BOARD_Y - 10;
    var bob = Math.sin(game.time.elapsed * 3) * 10;
    var blink = Math.floor(game.time.elapsed * 2) % 6 === 0;
    var frame = blink ? OWL2 : OWL;
    var pal = { '#': C.tileEdge, 'O': mood === 'bad' ? C.bad : C.gold, 'o': mood === 'bad' ? C.bad : C.gold };
    game.draw.circle(ox, oy + 70 + bob, 40, C.feltDark, 0.4);
    game.draw.sprite(frame, pal, ox, oy + bob, 15, { anchor: 'center' });
  }

  function drawBoard() {
    drawOwl(finished && !ok ? 'bad' : 'good');
    var startX = boardStartX();
    for (var i = 0; i < TOTAL; i++) {
      var sx = startX + i * SLOT_W;
      var isNext = i === filled;
      var pulse = isNext ? 0.5 + 0.3 * Math.sin(game.time.elapsed * 6) : 0.25;
      game.draw.rect(sx - 55, BOARD_Y - 55, 110, 110, C.slotEmpty);
      if (isNext) game.draw.rect(sx - 60, BOARD_Y - 60, 120, 120, C.slotGlow, pulse);
      if (slots[i].filled) drawTile(sx, BOARD_Y, slots[i].ch, false);
    }
  }

  function drawTray() {
    for (var i = 0; i < tray.length; i++) {
      if (tray[i].used) continue;
      if (i === draggingIdx) continue;
      var tx = trayX(i);
      var bob = Math.sin(game.time.elapsed * 3 + i) * 4;
      drawTile(tx, TRAY_Y + bob, tray[i].ch, false);
    }
  }

  function drawTile(x, y, ch, lifted) {
    var s = lifted ? 1.12 : 1;
    game.draw.rect(x - 64 * s, y - 64 * s + 6, 128 * s, 128 * s, C.tileEdge);
    game.draw.rect(x - 60 * s, y - 64 * s, 120 * s, 122 * s, C.tileBot);
    game.draw.rect(x - 60 * s, y - 64 * s, 120 * s, 60 * s, C.tileTop);
    txt(ch, x, y + 16 * s, 46 * s, C.ink);
  }

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.5]], { tempo: 130, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
