// GH-PS2-0058-tidy-drag-sort.js
// おかたづけドラッグ — 落ちているおもちゃを、同じ大きさの置き場へ片付ける。ゴミは捨てる
// 操作: 落ちてきたものをドラッグし、同じ大きさの丸い置き場(小→大の順に並ぶ)へ離す。トゲトゲの物はゴミ箱へ
// 終わり: 規定個数を片付ければ成功。3回間違えれば失敗
// @mechanic: drag_sort
// @theme: toy_shelf
// 世界観: 真っ白な子ども部屋。おもちゃが大きさ順に並んだ棚の丸い置き場に、落ちてきたおもちゃを大きさ合わせで片付ける。トゲトゲのゴミだけは棚ではなくゴミ箱へ
// 残るもの: 正誤(CLEAR/GAME OVER) + 片付けた個数 + ゴミ処理数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HYPERCASUAL 3D: 白背景+単色の丸い塊。真下に柔らかい影。当たり判定は見た目どおり
  var C = {
    bg: '#f6f4f0', shelf: '#e4e0d8', slot: '#d8d2c4', toy: '#5a8cff', toyDark: '#3a68e0',
    trash: '#7a8266', trashDark: '#565e44', good: '#39c98a', bad: '#ff5a6a', gold: '#f2a93b', ink: '#2a2a2a', white: '#ffffff',
  };

  var GAME_TITLE = 'TIDY SHELF';
  var NEEDED = 7, MISS_LIMIT = 3;
  var SLOT_R = [38, 52, 66, 80, 94];
  var SLOT_X = [0.14, 0.32, 0.5, 0.68, 0.86];
  var SLOT_Y = H * 0.86;
  var TRASH_X = W * 0.5, TRASH_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var sorted, misses, decoysDone, filled;
  var item, dragging, itemLife, itemLifeMax, spawnHold;
  var done, endWait, finished;
  var ready, hitStop, shake, flashItem;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function roomBg() {
    game.draw.gradient(0, H, [[0, '#ffffff'], [1, C.bg]]);
    game.draw.rect(0, SLOT_Y - 30, W, H - (SLOT_Y - 30), C.shelf);
    game.draw.rect(0, SLOT_Y - 34, W, 8, '#ffffff');
  }

  var TOY_SPRITE = ['.##.', '####', '.##.'];
  var TRASH_SPRITE = ['#.#.#', '.#.#.', '#.#.#'];
  var BIN_SPRITE = ['#...#', '#...#', '#####'];

  function softShadow(x, y, r) { game.draw.circle(x, y + r * 0.55, r * 0.9, '#000000', 0.14); }

  function drawSlots() {
    for (var i = 0; i < 5; i++) {
      var x = SLOT_X[i] * W, r = SLOT_R[i];
      game.draw.circle(x, SLOT_Y, r + 10, C.slot);
      game.draw.circle(x, SLOT_Y, r, C.bg);
      if (filled[i]) {
        game.draw.circle(x, SLOT_Y, r * 0.7, C.toy);
        game.draw.sprite(TOY_SPRITE, { '#': C.toyDark }, x, SLOT_Y, r / 10, { anchor: 'center' });
      }
    }
    game.draw.rect(TRASH_X - 70, TRASH_Y - 60, 140, 110, C.trash);
    game.draw.rect(TRASH_X - 78, TRASH_Y - 80, 156, 26, C.trashDark);
    game.draw.sprite(BIN_SPRITE, { '#': C.trashDark }, TRASH_X, TRASH_Y - 5, 10, { anchor: 'center' });
  }

  function newItem() {
    var decoyChance = Math.min(0.42, 0.12 + sorted * 0.04);
    var isDecoy = Math.random() < decoyChance;
    var tier = Math.floor(Math.random() * 5);
    item = {
      isDecoy: isDecoy, tier: tier,
      r: isDecoy ? 50 : SLOT_R[tier] * 0.82,
      x: W * (0.28 + Math.random() * 0.44), y: H * 0.28,
    };
    itemLifeMax = Math.max(1.5, 2.3 - sorted * 0.06);
    itemLife = itemLifeMax;
    dragging = false;
  }

  function initGame() {
    sorted = 0; misses = 0; decoysDone = 0;
    filled = [false, false, false, false, false];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashItem = 0; spawnHold = 0;
    newItem();
  }

  function onPress(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || !item) return;
    if (Math.hypot(x - item.x, y - item.y) <= item.r + 30) { dragging = true; game.audio.play('se_tap', 0.15); }
  }
  function onMove(x, y) { if (dragging && item) { item.x = x; item.y = y; } }

  function settle(success, msg) {
    hitStop = 0.22;
    flashItem = 0.22;
    if (success) {
      sorted++;
      if (item.isDecoy) decoysDone++; else filled[item.tier] = true;
      game.feedback.good(item.x, item.y, { text: msg, color: C.good });
      game.audio.play('se_good', 0.3);
      if (sorted % 3 === 0) { game.fx.popup(sorted + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (sorted >= NEEDED) { ok = true; finished = true; game.fx.burst(item.x, item.y, { color: C.gold, count: 20, speed: 380 }); game.audio.play('se_success', 0.5); finish(); return; }
    } else {
      misses++;
      game.feedback.bad(item.x, item.y, { text: 'MISS' });
      shake = 0.18;
      game.audio.play('se_bad', 0.35);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    item = null; spawnHold = 0.35;
  }

  function onRelease(x, y) {
    if (!dragging || !item) return;
    dragging = false;
    if (item.isDecoy) {
      if (Math.hypot(x - TRASH_X, y - TRASH_Y) < 100) { settle(true, null); return; }
      var nearSlot = false;
      for (var i = 0; i < 5; i++) if (Math.hypot(x - SLOT_X[i] * W, y - SLOT_Y) < SLOT_R[i] + 20) nearSlot = true;
      if (nearSlot) { settle(false, null); return; }
    } else {
      var sx = SLOT_X[item.tier] * W;
      if (Math.hypot(x - sx, y - SLOT_Y) < SLOT_R[item.tier] + 24) { settle(true, null); return; }
      if (Math.hypot(x - TRASH_X, y - TRASH_Y) < 100) { settle(false, null); return; }
      for (var j = 0; j < 5; j++) {
        if (j !== item.tier && Math.hypot(x - SLOT_X[j] * W, y - SLOT_Y) < SLOT_R[j] + 20) { settle(false, null); return; }
      }
    }
    // どこにも当たらなければ弾いて戻す(ペナルティなし)
    game.audio.play('se_tap', 0.05);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); onPress(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { if (Math.random() < 0.05) game.audio.play('se_tap', 0.02); onMove(x, y); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.03); onRelease(x, y); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawItem() {
    if (!item) return;
    var scale = flashItem > 0 ? 1 + flashItem * 1.4 : 1;
    softShadow(item.x, SLOT_Y - 8, item.r * 0.8);
    if (item.isDecoy) {
      game.draw.circle(item.x, item.y, item.r * scale, C.trash);
      game.draw.sprite(TRASH_SPRITE, { '#': flashItem > 0 ? C.white : C.trashDark }, item.x, item.y, item.r / 12, { anchor: 'center' });
    } else {
      game.draw.circle(item.x, item.y, item.r * scale, flashItem > 0 ? C.white : C.toy);
      game.draw.sprite(TOY_SPRITE, { '#': C.toyDark }, item.x, item.y, item.r / 10, { anchor: 'center' });
    }
    if (dragging) game.draw.circle(item.x, item.y, item.r + 14, C.gold, 0.35);
    // 残り時間の警告リング(telegraph)
    var frac = itemLife / itemLifeMax;
    if (frac < 0.3) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(item.x, item.y, item.r + 22, C.bad, 0.5);
    }
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.3, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (sorted === undefined) initGame();
    if (!item && spawnHold <= 0 && !finished) newItem();
    if (spawnHold > 0) spawnHold -= dt;
    if (item && !finished) {
      var tx = item.isDecoy ? TRASH_X : SLOT_X[item.tier] * W;
      var ty = item.isDecoy ? TRASH_Y : SLOT_Y;
      demo.press = true;
      item.x += (tx - item.x) * Math.min(1, dt * 4);
      item.y += (ty - item.y) * Math.min(1, dt * 4);
      demo.gx = item.x; demo.gy = item.y;
      if (Math.hypot(item.x - tx, item.y - ty) < 20) { onRelease(tx, ty); if (finished) initGame(); }
    }
    if (flashItem > 0) flashItem -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      roomBg();
      drawSlots();
      stepDemo(dt);
      drawItem();
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 5, demo.gy + Math.cos(game.time.elapsed * 1.7) * 5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.16, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.16, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      roomBg();
      drawSlots();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(sorted + ' / ' + NEEDED, W / 2, H * 0.13, 32, C.gold);
      if (!ok && sorted >= NEEDED - 1) txt('あと1個!', W / 2, H * 0.175, 28, C.bad);
      txt('MISS ' + misses + '/' + MISS_LIMIT, W / 2, H * 0.215, 24, C.ink);
      if (sorted > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.26, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { sorted: sorted, misses: misses, decoys: decoysDone };
        if (ok) game.end.success(sorted, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!item && spawnHold <= 0) newItem();
      if (spawnHold > 0) spawnHold -= dt;
      if (item && !dragging) {
        itemLife -= dt;
        if (itemLife <= 0) settle(false, null);
      }
    }
    if (shake > 0) shake -= dt;
    if (flashItem > 0) flashItem -= dt;

    roomBg();
    drawSlots();
    drawItem();

    txt(sorted + ' / ' + NEEDED, W / 2, H * 0.055, 32, C.ink);
    txt('MISS ' + misses + '/' + MISS_LIMIT, W * 0.84, H * 0.055, 22, misses > 0 ? C.bad : C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['C5', 0.18], ['E5', 0.18], ['G5', 0.18], ['E5', 0.18], ['C5', 0.18], ['R', 0.18]],
      { tempo: 126, wave: 'sine', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
