// GH-PS2-0146-cafe-rush.js
// カフェラッシュ — 注文を覚えて運ぶ。同時に3人まで
// 操作: 出てきた品を、注文した客(アイコンが一致する席)へタップして運ぶ
// 終わり: 6品配れば成功。3回外す/遅れると失敗
// @mechanic: reaction_duel
// @theme: cafe_counter
// 世界観: 3席の喫茶店。各席の注文アイコンは常に見える。品が出るたびに、合う席へすぐ運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 配れた数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var ITEM_COL = ['#8a5a3a', '#e85a7a', '#4a9adf'];
  var C = {
    bg1: '#f0e4d0', bg2: '#d8c8a8', table: '#c8a878', seatCol: '#5a4a38',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffb020', white: '#fff8ec', ink: '#3a2a18',
  };

  var GAME_TITLE = 'CAFE RUSH';
  var TARGET = 6, MISS_LIMIT = 3, ITEM_TIME = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, delivered = 0, misses = 0;

  var orders, curItem, itemT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function voxel(x, y, s, colIdx) {
    var col = ITEM_COL[colIdx];
    game.draw.rect(x - s, y - s * 1.2, s * 2, s * 1.2, col);
    game.draw.rect(x - s, y - s * 1.2, s * 2, s * 0.35, '#ffffff', 0.3);
    game.draw.rect(x - s, y - s * 0.15, s * 2, s * 0.25, '#000000', 0.2);
  }

  var SEAT_X = [W * 0.22, W * 0.5, W * 0.78], SEAT_Y = H * 0.34;

  var CUP_SPRITE = ['###', '#.#', '###'];

  function cafeBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // 窓からの日差し(ゆっくり流れる、ATTRACT差分検出のためにも使う)
    var lightX = (game.time.elapsed * 280) % (W + 500) - 250;
    game.draw.rect(lightX, 0, 260, H, '#5a4a30', 0.14);
    for (var i = 0; i < 3; i++) {
      game.draw.circle(SEAT_X[i], SEAT_Y + 70, 90, '#00000018');
      game.draw.rect(SEAT_X[i] - 80, SEAT_Y + 20, 160, 30, C.seatCol);
    }
    game.draw.rect(0, H * 0.58, W, H * 0.10, C.table);
    game.draw.sprite(CUP_SPRITE, { '#': C.seatCol }, W * 0.10, H * 0.10, 8, { anchor: 'center' });
    game.draw.sprite(CUP_SPRITE, { '#': C.seatCol }, W * 0.90, H * 0.10, 8, { anchor: 'center' });
  }

  function drawOrders() {
    for (var i = 0; i < 3; i++) voxel(SEAT_X[i], SEAT_Y, 44, orders[i]);
  }

  var COUNTER_Y = H * 0.72;
  function drawCounter() {
    if (curItem !== null) voxel(W / 2, COUNTER_Y, 54, curItem);
  }

  function newItem() {
    curItem = Math.floor(Math.random() * 3);
    itemT = Math.max(0.7, ITEM_TIME - delivered * 0.06);
  }

  function initGame() {
    orders = [Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)];
    delivered = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newItem();
  }

  function deliver(seatIdx) {
    if (done || ready > 0 || finished || curItem === null) return;
    hitStop = 0.06;
    if (orders[seatIdx] === curItem) {
      delivered++;
      game.feedback.good(SEAT_X[seatIdx], SEAT_Y, { text: null, color: C.good });
      game.fx.burst(SEAT_X[seatIdx], SEAT_Y, { color: C.gold, count: 10, speed: 300 });
      game.audio.play('se_success', 0.3);
      orders[seatIdx] = Math.floor(Math.random() * 3);
      curItem = null;
      if (delivered >= TARGET) { ok = true; finished = true; finish(); return; }
      game.fx.popup(delivered + ' / ' + TARGET, W / 2, H * 0.16, { color: C.gold, size: 40 });
    } else {
      misses++;
      game.feedback.bad(SEAT_X[seatIdx], SEAT_Y, { text: 'MISS' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    curItem = null;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    var idx = -1, best = 999;
    for (var i = 0; i < 3; i++) { var d = Math.hypot(x - SEAT_X[i], y - SEAT_Y); if (d < best) { best = d; idx = i; } }
    if (best < 100) deliver(idx);
  });

  // ── ATTRACT ゴースト実演: 一致する席へすぐ運ぶ ──
  var demo = { t: 0, gx: W / 2, gy: COUNTER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.8;
    if (cyc < dt) newItem();
    var seat = orders.indexOf(curItem);
    if (seat < 0) seat = 0;
    var tx = SEAT_X[seat];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.press = cyc > 1.0 && cyc < 1.2;
    if (cyc > 1.0 && cyc < 1.03) { game.feedback.good(tx, SEAT_Y, { text: null, color: C.good }); game.fx.burst(tx, SEAT_Y, { color: C.gold, count: 8, speed: 260 }); orders[seat] = Math.floor(Math.random() * 3); curItem = null; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (orders === undefined) initGame();
      cafeBg();
      stepDemo(dt);
      drawOrders();
      drawCounter();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 48, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      cafeBg();
      drawOrders();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 52, ok ? C.good : C.bad);
      txt(delivered + ' / ' + TARGET, W / 2, H * 0.15, 32, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 30, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ delivered: delivered });
        else game.end.failure({ delivered: delivered });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (curItem === null) { newItem(); }
      else {
        itemT -= dt;
        if (itemT <= 0) {
          misses++;
          game.feedback.bad(W / 2, COUNTER_Y, { text: 'MISS' });
          shake = 0.1;
          if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          else curItem = null;
        }
      }
    }
    if (shake > 0) shake -= dt;

    cafeBg();
    drawOrders();
    drawCounter();

    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.4);
    game.draw.rect(60, 40, (W - 120) * (delivered / TARGET), 20, C.gold);
    txt(delivered + ' / ' + TARGET, W / 2, 100, 34, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
