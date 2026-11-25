// D-20222026-0057-tone-grid-recall.js
// トーングリッドリコール — マス目が光った順番を覚え、決められた作曲パターンどおりに同じ順でタップする
// 操作: 光るマス目の順番を覚え、光り終わったら同じ順に一つずつタップして音を鳴らす
// 終わり: 決められた全マスを正しい順で鳴らせば成功。順番を誤る/時間切れで失敗
// @mechanic: memory_sequence
// @theme: tone_grid_recall
// 世界観: 深夜の作曲小屋にこもる見習い奏者が、あらかじめ決まった一曲分の音マスの点灯順を記憶し、そのまま指でなぞって再現する
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく鳴らせたマス数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度控えめのパステル、太めグリッド枠
  var C = {
    bg: '#3a2a4a', bg2: '#241830', pad: '#5a4570', padLit: '#ffd23f', padDone: '#8fd66a',
    good: '#8fd66a', bad: '#ff5a6a', gold: '#ffd23f', ink: '#f2eefc',
  };

  var GAME_TITLE = 'TONE RECALL';
  var TIME_LIMIT = 16;
  var COLS = 3, ROWS = 2;
  var CELL = 220;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.42;
  var NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COMPOSER_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffd23f', pulse * 0.1);
    game.draw.sprite(COMPOSER_SPRITE, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  function cellPos(i) {
    var cx = i % COLS, cy = Math.floor(i / COLS);
    return { x: BOARD_X + (cx - (COLS - 1) / 2) * CELL, y: BOARD_Y + (cy - (ROWS - 1) / 2) * CELL };
  }

  var pattern, showIdx, showT, phase, progress, timeLeft;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newPattern() {
    var arr = [];
    for (var i = 0; i < COLS * ROWS; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr.slice(0, 5);
  }

  function initGame() {
    pattern = newPattern();
    showIdx = -1; showT = 0.5; phase = 'show';
    progress = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawGrid() {
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = cellPos(i);
      var col = C.pad;
      if (phase === 'show' && i === pattern[showIdx]) col = C.padLit;
      if (phase === 'input' && pattern.indexOf(i) >= 0 && pattern.indexOf(i) < progress) col = C.padDone;
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, col);
    }
  }

  function onPadTap(i) {
    if (phase !== 'input' || finished || ready > 0) return;
    var p = cellPos(i);
    if (pattern[progress] === i) {
      game.audio.tone(NOTES[progress % NOTES.length], 0.25, { wave: 'square', volume: 0.15 });
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      progress++;
      if (progress === Math.ceil(pattern.length / 2)) game.fx.popup('HALFWAY!', p.x, p.y - 100, { color: C.gold, size: 32 });
      if (progress >= pattern.length) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(BOARD_X, BOARD_Y, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      for (var i = 0; i < COLS * ROWS; i++) {
        var p = cellPos(i);
        if (Math.abs(x - p.x) < CELL / 2 && Math.abs(y - p.y) < CELL / 2) { onPadTap(i); return; }
      }
      game.audio.play('se_tap', 0.05);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var showLen = pattern.length * 0.7 + 0.5;
    var inputLen = pattern.length * 0.9 + 0.4;
    var per = showLen + inputLen;
    var cyc = demo.t % per;
    if (cyc < dt || demo.t <= dt) initGame();
    if (cyc < showLen) {
      phase = 'show';
      var idx = Math.min(pattern.length - 1, Math.floor(cyc / 0.7));
      showIdx = idx;
      demo.press = false;
    } else {
      phase = 'input';
      var local = cyc - showLen;
      var idx2 = Math.min(pattern.length - 1, Math.floor(local / 0.9));
      var lt = local - idx2 * 0.9;
      var p = cellPos(pattern[idx2]);
      demo.gx = p.x; demo.gy = p.y;
      demo.press = lt > 0.3 && lt < 0.5;
      if (lt > 0.3 && lt < 0.3 + dt * 2 && progress <= idx2) {
        progress = idx2 + 1;
        game.audio.tone(NOTES[idx2 % NOTES.length], 0.2, { wave: 'square', volume: 0.12 });
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pattern === undefined) initGame();
      stepDemo(dt);
      bg();
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(progress + ' / ' + pattern.length, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (pattern.length - progress) + '音!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(progress, { progress: progress, need: pattern.length });
        else game.end.failure({ progress: progress, need: pattern.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) {
        showIdx++;
        showT = 0.6;
        if (showIdx >= pattern.length) { phase = 'input'; }
        else game.audio.tone(NOTES[showIdx % NOTES.length], 0.25, { wave: 'triangle', volume: 0.12 });
      }
      timeLeft -= dt;
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();

    txt(progress + ' / ' + pattern.length, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#5a4570', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.4]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
