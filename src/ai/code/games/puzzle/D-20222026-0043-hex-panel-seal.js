// D-20222026-0043-hex-panel-seal.js
// ヘキサパネルシール — 提示された六角コネクタと同じ形の隙間を見極めて埋める
// 操作: 画面下の現在パネルの色柄を覚え、盤面の六角スロットから同じ柄のスロットをタップする
// 終わり: 規定枚数のスロットを正しく埋めれば成功。誤ったスロットや時間切れで失敗
// @mechanic: gap_fit
// @theme: hex_conduit_sealing
// 世界観: 停電した地下管制室で、技師見習いが六角コネクタパネルを一枚ずつ正しい形のスロットへ嵌め、回路を隙間なく復旧させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 埋めたスロット数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 暗い基調に発光ライン、走査線ぽい細い横帯
  var C = {
    bg: '#151428', bg2: '#0a0a18', panel: '#241f3f', panelEdge: '#3a3466',
    slotEmpty: '#20203a', slotRing: '#5f5cad',
    good: '#38ffb0', bad: '#ff4d6a', gold: '#ffd23f', ink: '#eef0ff',
    kinds: ['#38ffb0', '#ffd23f', '#ff6fd8', '#5fb2ff'],
  };

  var GAME_TITLE = 'HEX SEAL';
  var TIME_LIMIT = 20;
  var NEED = 7;
  var GRID_R = 3; // hex rings not literal; use offset grid of 7 slots
  var SLOT_R = 92;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TECH_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  var SLOTS = [
    { x: W * 0.5, y: H * 0.30 },
    { x: W * 0.28, y: H * 0.40 },
    { x: W * 0.72, y: H * 0.40 },
    { x: W * 0.28, y: H * 0.55 },
    { x: W * 0.72, y: H * 0.55 },
    { x: W * 0.40, y: H * 0.66 },
    { x: W * 0.60, y: H * 0.66 },
  ];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#5f5cad', pulse * 0.4);
    for (var i = 0; i < 6; i++) {
      var yy = (H * 0.2 + i * 90 + (game.time.elapsed * 40) % 90);
      game.draw.rect(0, yy, W, 2, '#5f5cad', 0.08);
    }
    game.draw.sprite(TECH_SPRITE, { '#': C.gold }, W * 0.85, H * 0.86, 10, { anchor: 'center' });
  }

  function drawHex(x, y, r, color, alpha) {
    // approximate hex using 6 thin rect strips (no polygon fill allowed) -> use circle + ring for simplicity
    game.draw.circle(x, y, r, color, alpha);
    game.draw.circle(x, y, r, C.panelEdge, 1);
  }

  var order, filled, cursorIdx, current;

  function newOrder() {
    var arr = [];
    for (var i = 0; i < SLOTS.length; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    order = newOrder();
    filled = new Array(SLOTS.length).fill(false);
    cursorIdx = 0;
    current = order[0];
    timeLeft = TIME_LIMIT;
    hits = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  var timeLeft, hits, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function kindOf(i) { return i % C.kinds.length; }

  function drawBoard(highlightCurrent) {
    for (var i = 0; i < SLOTS.length; i++) {
      var p = SLOTS[i];
      if (filled[i]) {
        drawHex(p.x, p.y, SLOT_R, C.kinds[kindOf(order.indexOf(i) >= 0 ? i : i)], 1);
      } else {
        drawHex(p.x, p.y, SLOT_R, C.slotEmpty, 1);
        game.draw.circle(p.x, p.y, SLOT_R, C.slotRing, 0);
      }
      if (highlightCurrent && !filled[i] && i === current) {
        var glow = 0.5 + 0.3 * Math.sin(game.time.elapsed * 8);
        game.draw.circle(p.x, p.y, SLOT_R + 12, C.kinds[kindOf(i)], glow * 0.5);
      }
    }
    // current piece tray at thumb zone
    var ty = H * 0.86;
    drawHex(W * 0.5, ty, 70, C.kinds[kindOf(current)], 1);
    txt('NEXT', W * 0.5, ty - 100, 24, C.ink);
  }

  function attemptSlot(i) {
    if (filled[i]) return;
    if (i === current) {
      filled[i] = true;
      hits++;
      var p = SLOTS[i];
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', p.x, p.y - 100, { color: C.gold, size: 32 });
      cursorIdx++;
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 24, speed: 420 });
        txt('CLEAR', W / 2, H * 0.5, 60, C.good);
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      current = order[cursorIdx];
    } else {
      var p2 = SLOTS[i];
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(p2.x, p2.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      for (var i = 0; i < SLOTS.length; i++) {
        if (game.hit.circle(x, y, 1, SLOTS[i].x, SLOTS[i].y, SLOT_R)) {
          game.audio.play('se_tap', 0.15);
          attemptSlot(i);
          return;
        }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: SLOTS[0].x, gy: SLOTS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.5;
    var cyc = demo.t % (per * SLOTS.length + 0.6);
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var idx = Math.min(SLOTS.length - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    var target = order[idx];
    var p = SLOTS[target];
    if (local < per * 0.6) {
      demo.gx = p.x; demo.gy = p.y; demo.press = local > per * 0.35;
      if (local > per * 0.35 && !filled[target]) {
        filled[target] = true; hits = Math.min(NEED, hits + 1);
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      current = order[Math.min(SLOTS.length - 1, idx + 1)];
    } else {
      demo.gx = p.x; demo.gy = p.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.ink);
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
      drawBoard(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '枚!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfCalled && hits >= Math.ceil(NEED / 2)) halfCalled = true;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H / 2, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard(true);

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#3a3466', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
