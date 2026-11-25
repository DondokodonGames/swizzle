// I-GBA-0042-parcel-rank-sort.js
// パーセルランクソート — 深夜の無人仕分け場で、バラバラに積まれた小包を大きさ順にスロットへ振り分ける
// 操作: 小包をつまんで、対応する大きさのスロットまでドラッグして放す
// 終わり: 全ての小包を正しい順に収めれば成功。誤ったスロットに入れるか時間切れで失敗
// @mechanic: drag_sort
// @theme: midnight_parcel_depot
// 世界観: 深夜稼働の無人仕分け場。ロボットの仕分け係が、山積みの小包を大きさの順にベルトのスロットへ収めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 収めた個数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#14181c', bg2: '#0c0e10', belt: '#242c30', beltLine: '#3a464c',
    accent: '#ffb833', crate: '#5a7a8a', crateDark: '#3a5462',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f4f4', ink: '#0a0c0c',
  };

  var GAME_TITLE = 'RANK SORT';
  var TOTAL = 6;
  var MAX_TIME = 20; // drag_sort = E族 15-25s
  var NEEDED = TOTAL;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var FIELD_TOP = H * 0.30, FIELD_BOT = H * 0.62;
  var SLOT_Y = H * 0.82;
  var MARGIN = 130;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.20 + i * 40, W, 2, '#ffffff05');
    game.draw.rect(0, SLOT_Y + 60, W, 10, C.beltLine);
    game.draw.sprite(BOT_SPRITE, { '#': C.accent }, W * 0.5, H * 0.14, 10, { anchor: 'center' });
  }

  function rankSize(rank) { return 30 + rank * 12; } // 小さい順に大きくなる半径
  function slotX(i) { return MARGIN + (W - MARGIN * 2) * (i / (TOTAL - 1)); }

  var parcels, slotsFilled, placedCount, heldIndex, timeLeft, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake, celebrateSlot;

  function scatterPos(i, demoMode) {
    var cols = 3;
    var col = i % cols, row = Math.floor(i / cols);
    var baseX = W * 0.22 + col * (W * 0.28);
    var baseY = FIELD_TOP + row * (FIELD_BOT - FIELD_TOP) * 0.6 + 40;
    if (demoMode) return { x: baseX, y: baseY };
    return { x: baseX + game.random(-40, 40), y: baseY + game.random(-30, 30) };
  }

  function buildParcels(demoMode) {
    var order = [0, 1, 2, 3, 4, 5];
    // シャッフル(デモは固定の見やすい順、本番はランダム)
    if (!demoMode) {
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(game.random(0, i + 1));
        var t = order[i]; order[i] = order[j]; order[j] = t;
      }
    } else {
      order = [3, 0, 5, 1, 4, 2];
    }
    var arr = [];
    for (var k = 0; k < TOTAL; k++) {
      var rank = order[k] + 1;
      var pos = scatterPos(k, demoMode);
      arr.push({ rank: rank, x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, placed: false, held: false });
    }
    return arr;
  }

  function initGame() {
    parcels = buildParcels(false);
    slotsFilled = [false, false, false, false, false, false];
    placedCount = 0; heldIndex = -1; timeLeft = MAX_TIME; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; celebrateSlot = -1;
  }

  function fail(x, y) {
    ok = false; finished = true;
    hitStop = 0.35;
    shake = 0.3;
    game.feedback.bad(x !== undefined ? x : W / 2, y !== undefined ? y : SLOT_Y, { text: 'MISS' });
    finish();
  }

  function pickAt(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < parcels.length; i++) {
      var p = parcels[i];
      if (p.placed) continue;
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < rankSize(p.rank) + 20 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function nearestSlot(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < TOTAL; i++) {
      if (slotsFilled[i]) continue;
      var d = Math.hypot(slotX(i) - x, SLOT_Y - y);
      if (d < 90 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function doPress(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished) return;
    var idx = pickAt(x, y);
    if (idx >= 0) {
      heldIndex = idx; parcels[idx].held = true;
      game.audio.play('se_tap', 0.2);
    }
  }
  function doMove(x, y) {
    if (heldIndex < 0) return;
    parcels[heldIndex].x = x; parcels[heldIndex].y = y;
  }
  function doRelease(x, y) {
    if (heldIndex < 0) return;
    var p = parcels[heldIndex];
    var slot = nearestSlot(x, y);
    if (slot >= 0) {
      if (slot === p.rank - 1) {
        p.placed = true; p.x = slotX(slot); p.y = SLOT_Y; slotsFilled[slot] = true;
        placedCount++;
        game.feedback.good(p.x, p.y, { text: placedCount >= TOTAL ? 'CLEAR' : 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.35);
        if (!milestoneShown && placedCount >= Math.ceil(TOTAL / 2)) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', W / 2, H * 0.45, { color: C.gold, size: 40 });
          game.audio.play('se_milestone', 0.4);
        }
        if (placedCount >= TOTAL) {
          ok = true; finished = true; hitStop = 0.25; celebrateSlot = slot;
          game.fx.burst(p.x, p.y, { color: C.gold, count: 20, speed: 380 });
          finish();
        }
      } else {
        p.x = slotX(slot); p.y = SLOT_Y;
        lastBadSlot = slot;
        fail(p.x, p.y);
      }
    } else {
      p.x = p.sx; p.y = p.sy;
      game.audio.play('se_tap', 0.1);
    }
    p.held = false; heldIndex = -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { doPress(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || heldIndex < 0) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.03);
    doMove(x, y);
  });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { doRelease(x, y); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function drawParcel(p) {
    var r = rankSize(p.rank);
    var col = p.placed ? C.crateDark : C.crate;
    if (celebrateSlot >= 0 && p.placed && slotX(celebrateSlot) === p.x) col = C.gold;
    game.draw.rect(p.x - r, p.y - r, r * 2, r * 2, col);
    game.draw.rect(p.x - r, p.y - r, r * 2, 8, C.white, 0.25);
    game.draw.rect(p.x - r + 6, p.y - r + 6, r * 2 - 12, r * 2 - 12, C.ink, 0.15);
  }

  function drawSlots() {
    for (var i = 0; i < TOTAL; i++) {
      var r = rankSize(i + 1);
      var x = slotX(i);
      var flash = hitStop > 0 && !slotsFilled[i] && i === lastBadSlot;
      game.draw.rect(x - r * 0.9, SLOT_Y - 14, r * 1.8, 28, slotsFilled[i] ? C.beltLine : (flash ? C.bad : C.beltLine), slotsFilled[i] ? 0.9 : 0.6);
      game.draw.line(x - r * 0.9, SLOT_Y - 14, x - r * 0.9, SLOT_Y + 14, C.accent, 3);
      game.draw.line(x + r * 0.9, SLOT_Y - 14, x + r * 0.9, SLOT_Y + 14, C.accent, 3);
    }
  }
  var lastBadSlot = -1;

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 0, order: [3, 0, 5, 1, 4, 2], step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      parcels = buildParcels(true);
      slotsFilled = [false, false, false, false, false, false];
      placedCount = 0; demo.step = 0; milestoneShown = false; celebrateSlot = -1;
    }
    var stepDur = 4.4 / TOTAL;
    var idx = Math.min(TOTAL - 1, Math.floor(cyc / stepDur));
    var within = (cyc - idx * stepDur) / stepDur;
    if (idx > demo.step - 1 && idx < TOTAL) {
      var p = parcels[idx];
      if (!p) return;
      var targetSlot = p.rank - 1;
      var tx = slotX(targetSlot), ty = SLOT_Y;
      if (within < 0.75) {
        var t = within / 0.75;
        demo.gx = p.sx + (tx - p.sx) * t;
        demo.gy = p.sy + (ty - p.sy) * t;
        p.x = demo.gx; p.y = demo.gy;
        demo.press = true;
      } else {
        if (!p.placed) {
          p.placed = true; p.x = tx; p.y = ty; slotsFilled[targetSlot] = true; placedCount++;
          game.feedback.good(tx, ty, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.2);
          demo.step = idx + 1;
        }
        demo.press = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!parcels) initGame();
      bg();
      stepDemo(dt);
      drawSlots();
      for (var i = 0; i < parcels.length; i++) drawParcel(parcels[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawSlots();
      for (var j = 0; j < parcels.length; j++) drawParcel(parcels[j]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt(placedCount + ' / ' + TOTAL, W / 2, H * 0.11, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - placedCount) + '個!', W / 2, H * 0.155, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placedCount, { placed: placedCount, total: TOTAL });
        else game.end.failure({ placed: placedCount, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; lastBadSlot = -1; fail(W / 2, SLOT_Y); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSlots();
    for (var k = 0; k < parcels.length; k++) drawParcel(parcels[k]);

    txt(placedCount + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['E3', 0.5], ['G3', 0.5], ['C4', 0.5]], { tempo: 108, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
