// D-20172021-0076-typecase-letter-sort.js
// タイプケース・レターソート — バラの活字ブロックを正しい語順へドラッグで並べ替え、版に収める
// 操作: 下段に散らばった文字ブロックを1つずつ指でつまみ、上段の正しい順番の枠までドラッグして離す
// 終わり: 2つの単語をどちらも正しい順で並べ終えれば成功。違う枠に落とすか時間切れで失敗
// @mechanic: drag_sort
// @theme: typecase_letter_sort
// 世界観: 活版印刷工房の見習い職人が、棚に散らばった活字ブロックを拾い、正しい語順の枠へドラッグで並べて版を組む
// 残るもの: 正誤(CLEAR/GAME OVER) + 並べ終えた単語数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var C = {
    bg: '#0c1c14', bg2: '#08120c', frame: '#1c3a28', frameLine: '#2f6b46',
    tile: '#e8f2d8', tileDark: '#b8cc98', tileText: '#123018',
    slot: '#123018', slotFilled: '#3fae5a',
    good: '#3fe07a', bad: '#ff4d5e', gold: '#e0c23f', white: '#e8f2d8', ink: '#081008',
  };

  var GAME_TITLE = 'TYPE CASE';
  var WORDS = ['りんご', 'さかな', 'からす', 'きつね', 'くじら', 'はやぶ'];
  var TOTAL_WORDS = 2;
  var TIME_LIMIT = 18;
  var TILE_R = 78;

  var SLOT_X = [W * 0.5 - 190, W * 0.5, W * 0.5 + 190];
  var SLOT_Y = H * 0.30;
  var TRAY_X = [W * 0.5 - 190, W * 0.5, W * 0.5 + 190];
  var TRAY_Y = H * 0.60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PRESS = ['#####', '#...#', '#####', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) {
      var yy = H * 0.15 + i * H * 0.11;
      game.draw.line(W * 0.08, yy, W * 0.92, yy, C.frameLine, 2, 0.15);
    }
    game.draw.sprite(PRESS, { '#': C.gold }, W * 0.5, H * 0.10, 14, { anchor: 'center' });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var wordIdx, usedWords, word, slots, tiles, dragIdx;
  var timeLeft, halfShown, done, endWait, finished, ready, hitStop, shake, wordsDone;

  function newWordRound(wi) {
    var w = WORDS[wi];
    var letters = w.split('');
    var order = shuffle([0, 1, 2]);
    var t = [];
    for (var i = 0; i < 3; i++) {
      var li = order[i];
      t.push({ letter: letters[li], x: TRAY_X[i], y: TRAY_Y, homeX: TRAY_X[i], homeY: TRAY_Y, placed: -1 });
    }
    var s = [];
    for (var k = 0; k < 3; k++) s.push({ x: SLOT_X[k], y: SLOT_Y, letter: letters[k], filled: false });
    return { word: w, tiles: t, slots: s };
  }

  function initGame() {
    wordsDone = 0;
    usedWords = shuffle([0, 1, 2, 3, 4, 5]).slice(0, TOTAL_WORDS);
    wordIdx = 0;
    var r = newWordRound(usedWords[0]); word = r.word; tiles = r.tiles; slots = r.slots;
    dragIdx = -1;
    timeLeft = TIME_LIMIT; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawSlots() {
    for (var i = 0; i < slots.length; i++) {
      var sl = slots[i];
      game.draw.rect(sl.x - TILE_R * 0.62, sl.y - TILE_R * 0.62, TILE_R * 1.24, TILE_R * 1.24, sl.filled ? C.slotFilled : C.slot, 0.85);
      game.draw.rect(sl.x - TILE_R * 0.62, sl.y - TILE_R * 0.62, TILE_R * 1.24, 4, C.frameLine, 0.8);
      if (!sl.filled) txt('?', sl.x, sl.y + 12, 30, C.frameLine);
    }
  }

  function drawTiles() {
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t.placed >= 0) continue;
      var lit = i === dragIdx;
      game.draw.rect(t.x - TILE_R * 0.5, t.y - TILE_R * 0.5, TILE_R, TILE_R, lit ? C.tile : C.tileDark);
      game.draw.rect(t.x - TILE_R * 0.5, t.y - TILE_R * 0.5, TILE_R, 6, C.frameLine, 0.6);
      txt(t.letter, t.x, t.y + 12, 34, C.tileText);
    }
  }

  function tileAt(x, y) {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].placed >= 0) continue;
      if (Math.hypot(x - tiles[i].x, y - tiles[i].y) <= TILE_R * 0.7) return i;
    }
    return -1;
  }

  function slotAt(x, y) {
    for (var i = 0; i < slots.length; i++) {
      if (Math.hypot(x - slots[i].x, y - slots[i].y) <= TILE_R * 0.75) return i;
    }
    return -1;
  }

  function advanceWord() {
    wordsDone++;
    game.fx.popup(wordsDone >= TOTAL_WORDS ? 'CLEAR' : 'NICE', W * 0.5, H * 0.20, { color: C.gold, size: 34 });
    game.audio.play('se_milestone', 0.4);
    if (wordsDone >= TOTAL_WORDS) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
    wordIdx++;
    var r = newWordRound(usedWords[wordIdx]); word = r.word; tiles = r.tiles; slots = r.slots;
    timeLeft = Math.min(TIME_LIMIT, timeLeft + 6);
  }

  function tryDrop(x, y) {
    if (dragIdx < 0) return;
    var i = dragIdx;
    var si = slotAt(x, y);
    dragIdx = -1;
    if (si < 0) { tiles[i].x = tiles[i].homeX; tiles[i].y = tiles[i].homeY; game.audio.play('se_tap', 0.15); return; }
    var slot = slots[si];
    if (slot.filled) { tiles[i].x = tiles[i].homeX; tiles[i].y = tiles[i].homeY; game.audio.play('se_tap', 0.15); return; }
    if (tiles[i].letter === slot.letter) {
      slot.filled = true; tiles[i].placed = si; tiles[i].x = slot.x; tiles[i].y = slot.y;
      hitStop = 0.08;
      game.feedback.good(slot.x, slot.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      var allFilled = true;
      for (var k = 0; k < slots.length; k++) if (!slots[k].filled) allFilled = false;
      if (allFilled) advanceWord();
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(slot.x, slot.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = tileAt(x, y);
    if (i >= 0) { dragIdx = i; game.audio.play('se_tap', 0.1); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    tiles[dragIdx].x = x; tiles[dragIdx].y = y;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    game.audio.play('se_tap', 0.08);
    tryDrop(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: TRAY_X[0], gy: TRAY_Y, press: false, phase: 0, order: [] };
  function resetDemo() {
    wordsDone = 0; usedWords = [0, 1]; wordIdx = 0;
    var r = newWordRound(usedWords[0]); word = r.word; tiles = r.tiles; slots = r.slots;
    demo.phase = 0; demo.order = [];
    for (var i = 0; i < tiles.length; i++) {
      for (var k = 0; k < slots.length; k++) if (tiles[i].letter === slots[k].letter) demo.order.push(i);
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var stepDur = 1.3;
    var idx = Math.floor(cyc / stepDur);
    var local = cyc - idx * stepDur;
    if (idx >= demo.order.length) { demo.press = false; return; }
    var ti = demo.order[idx];
    var tile = tiles[ti];
    var slotIdx = -1;
    for (var k = 0; k < slots.length; k++) if (slots[k].letter === tile.letter && !slots[k].filled) slotIdx = k;
    if (slotIdx < 0) return;
    var slot = slots[slotIdx];
    if (local < 0.15) { demo.gx = tile.homeX; demo.gy = tile.homeY; demo.press = false; }
    else if (local < 0.85) {
      var t2 = (local - 0.15) / 0.7;
      demo.gx = tile.homeX + (slot.x - tile.homeX) * t2;
      demo.gy = tile.homeY + (slot.y - tile.homeY) * t2;
      demo.press = true;
      tile.x = demo.gx; tile.y = demo.gy;
    } else if (!demo.landed || demo.landedIdx !== idx) {
      demo.landed = true; demo.landedIdx = idx;
      slot.filled = true; tile.placed = slotIdx; tile.x = slot.x; tile.y = slot.y;
      game.feedback.good(slot.x, slot.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tiles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSlots();
      drawTiles();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSlots();
      drawTiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt(wordsDone + ' / ' + TOTAL_WORDS, W / 2, H * 0.10, 26, C.gold);
      if (!ok) txt('あと' + (TOTAL_WORDS - wordsDone) + '語!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { words: wordsDone, total: TOTAL_WORDS };
        if (ok) game.end.success(wordsDone, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfShown && timeLeft <= TIME_LIMIT * 0.5) { halfShown = true; game.fx.popup('あと' + (TOTAL_WORDS - wordsDone) + '語!', W * 0.5, H * 0.2, { color: C.gold, size: 30 }); }
      if (timeLeft <= 0) {
        timeLeft = 0; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, SLOT_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSlots();
    drawTiles();

    txt(wordsDone + ' / ' + TOTAL_WORDS, W / 2, H * 0.06, 26, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.90, W - 120, 16, '#1c3a28', 1);
    game.draw.rect(60, H * 0.90, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 122, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
