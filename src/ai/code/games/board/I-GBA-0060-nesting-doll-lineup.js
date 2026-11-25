// I-GBA-0060-nesting-doll-lineup.js
// 木彫り人形の棚整列 — 棚に散らばった木彫り人形を、指でドラッグして大きい順に並べる
// 操作: 人形を指でつまんで動かし、左から大きい順になるよう台座の上に並べ替える
// 終わり: 全員を正しい大きさ順に並べ終えれば成功。時間切れなら失敗
// @mechanic: drag_sort
// @theme: nesting_doll_lineup
// 世界観: 開店前のおもちゃ店のショーウィンドウ。棚から転げ落ちた木彫り人形を、開店の鐘までに大きい順へ並べ直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 並べ終えた人数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドット、タイル反復背景
  var C = {
    bg: '#2a1c3a', bg2: '#1a1028', shelf: '#5a3c2a', shelfEdge: '#2e1c10',
    doll1: '#ff6b6b', doll2: '#ffd166', doll3: '#4dcc7a', doll4: '#5aa8ff',
    slotOn: '#ffe14d', slotOff: '#3a2c50', good: '#4dcc7a', bad: '#ff5c6a', gold: '#ffe14d', white: '#f0e8fa', ink: '#100a18',
  };

  var GAME_TITLE = 'DOLL LINEUP';
  var N = 4;
  var SLOT_Y = H * 0.62;
  var SLOT_XS = [W * 0.22, W * 0.41, W * 0.6, W * 0.79];
  var SIZES = [30, 24, 19, 14]; // 大→小の目標半径順
  var COLORS = [C.doll1, C.doll2, C.doll3, C.doll4];
  var LIMIT = 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dolls, slots, dragId, dragIdx, placed, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DOLL_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#ffffff05');
    game.draw.rect(W * 0.1, SLOT_Y + 60, W * 0.8, 24, C.shelfEdge);
    game.draw.rect(W * 0.1, SLOT_Y + 46, W * 0.8, 14, C.shelf);
  }

  function drawSlots(highlightOk) {
    for (var i = 0; i < N; i++) {
      var filled = slots[i] !== null;
      game.draw.circle(SLOT_XS[i], SLOT_Y, SIZES[0] + 8, filled ? C.slotOn : C.slotOff, filled ? 0.25 : 0.5);
    }
  }

  function shuffledStart() {
    // 台座外にバラバラに配置(サイズ順ではない並び)
    var order = [1, 3, 0, 2];
    var arr = [];
    for (var i = 0; i < N; i++) {
      arr.push({ size: SIZES[order[i]], color: COLORS[order[i]], correctIdx: order[i], x: W * (0.18 + i * 0.22), y: H * 0.32, homeX: W * (0.18 + i * 0.22), homeY: H * 0.32 });
    }
    return arr;
  }

  function drawDoll(d, isDragging) {
    var scale = Math.round(d.size / 7);
    if (isDragging) game.draw.circle(d.x, d.y, d.size + 10, C.gold, 0.3);
    game.draw.circle(d.x + 3, d.y + 4, d.size, '#00000040');
    game.draw.sprite(DOLL_SPRITE, { '#': d.color }, d.x, d.y, scale, { anchor: 'center' });
  }

  function initGame() {
    dolls = shuffledStart();
    slots = [null, null, null, null];
    dragId = null; dragIdx = -1; placed = 0; timeLeft = LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function nearestSlot(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < N; i++) {
      var d = Math.hypot(x - SLOT_XS[i], y - SLOT_Y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return bestD < 90 ? best : -1;
  }

  function tryPlace(idx) {
    var d = dolls[idx];
    var slotI = nearestSlot(d.x, d.y);
    if (slotI < 0) { d.x = d.homeX; d.y = d.homeY; return; }
    // 既にそのスロットが埋まっていれば入れ替え拒否
    if (slots[slotI] !== null) { d.x = d.homeX; d.y = d.homeY; game.feedback.bad(d.x, d.y, { text: 'MISS' }); return; }
    if (slotI === d.correctIdx) {
      slots[slotI] = idx; d.x = SLOT_XS[slotI]; d.y = SLOT_Y; d.homeX = d.x; d.homeY = d.y;
      placed++;
      game.feedback.good(d.x, d.y, { color: C.gold });
      game.audio.play('se_coin', 0.4);
      if (placed === Math.ceil(N / 2)) {
        game.fx.popup('あと半分!', W / 2, H * 0.42, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
      if (placed >= N) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(W / 2, SLOT_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(W / 2, SLOT_Y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      d.x = d.homeX; d.y = d.homeY;
      game.feedback.bad(d.x, d.y, { text: 'MISS' });
      shake = 0.15;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < N; i++) {
      if (slots.indexOf(i) !== -1 && dolls[i] && slots[dolls[i].correctIdx] === i) {
        // already placed correctly, still draggable check skip if slot filled with itself
      }
      if (!dolls[i]) continue;
      var d = dolls[i];
      var placedAlready = slots.indexOf(i) !== -1;
      if (placedAlready) continue;
      var dist = Math.hypot(x - d.x, y - d.y);
      if (dist < d.size + 24 && dist < bestD) { bestD = dist; best = i; }
    }
    if (best >= 0) { dragId = id; dragIdx = best; game.audio.play('se_tap', 0.1); }
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || dragIdx < 0 || id !== dragId) return;
    dolls[dragIdx].x = x; dolls[dragIdx].y = y;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING || dragIdx < 0 || id !== dragId) return;
    game.audio.play('se_tap', 0.06);
    tryPlace(dragIdx);
    dragIdx = -1; dragId = null;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 0, idx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { dolls = shuffledStart(); slots = [null, null, null, null]; placed = 0; demo.phase = 0; demo.idx = 0; }
    var order = [0, 1, 2, 3];
    var stepDur = 1.4;
    var idx = Math.min(N - 1, Math.floor(cyc / stepDur));
    var within = cyc - idx * stepDur;
    var d = dolls[idx];
    if (!d) return;
    var placedAlready = slots.indexOf(idx) !== -1;
    if (!placedAlready) {
      if (within < 0.4) {
        demo.gx = d.homeX; demo.gy = d.homeY; demo.press = within > 0.1;
      } else if (within < 1.0) {
        var t2 = (within - 0.4) / 0.6;
        d.x = d.homeX + (SLOT_XS[d.correctIdx] - d.homeX) * t2;
        d.y = d.homeY + (SLOT_Y - d.homeY) * t2;
        demo.gx = d.x; demo.gy = d.y; demo.press = true;
      } else if (within < 1.15 && slots[d.correctIdx] === null) {
        tryPlace(idx);
        demo.press = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dolls === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSlots();
      for (var i = 0; i < N; i++) if (dolls[i]) drawDoll(dolls[i], false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSlots();
      for (var j = 0; j < N; j++) if (dolls[j]) drawDoll(dolls[j], false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(placed + ' / ' + N, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと1体!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: N });
        else game.end.failure({ placed: placed, total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W / 2, SLOT_Y, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSlots();
    for (var k = 0; k < N; k++) if (dolls[k]) drawDoll(dolls[k], k === dragIdx);

    txt(placed + ' / ' + N, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / LIMIT), 16, timeLeft < 4 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 100, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
