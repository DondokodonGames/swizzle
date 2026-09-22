// K-DS-0048-basket-drop-catch.js
// バスケットドロップキャッチ — 屋台の上から次々落ちてくる品を、動く籠を滑らせてタイミングよく受け止める
// 操作: 落下物の真下に籠が来るよう左右にドラッグし、着地の瞬間に籠が下にあれば自動でキャッチ
// 終わり: 規定個数(8個)集めれば成功。3回落とせば失敗
// @mechanic: drop_timing
// @theme: night_stall_catch
// 世界観: 夜店の屋台。棚から次々に品物が落ちてくるので、店主が持つ籠をタイミングよく滑らせて受け止める
// 残るもの: 正誤(CLEAR/GAME OVER) + キャッチ数と取りこぼし数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めのグラデ、丸みのある太い縁、白ハイライト
  var C = {
    bg: '#2a1a4a', bg2: '#5a2a7a', stall: '#ff6a3d', stallDark: '#c94a20',
    basket: '#ffb347', basketDark: '#c97a1a', item1: '#ff4d8f', item2: '#4dd2ff', item3: '#ffe14d',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#1a0a2a',
  };

  var GAME_TITLE = 'DROP CATCH';
  var NEED = 8;
  var MAX_MISS = 3;
  var GROUND_Y = H * 0.78;
  var DROP_Y = H * 0.24;
  var BASKET_HALF = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALL_SPRITE = ['####', '#..#', '#..#'];
  var ITEM_SPRITES = [
    ['.##.', '####', '.##.'],
    ['####', '.##.', '####'],
    ['.#.#', '####', '.#.#'],
  ];
  var ITEM_COLORS = [C.item1, C.item2, C.item3];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.circle(W * (0.1 + i * 0.18), H * 0.15, 6, '#ffffff33');
    game.draw.rect(0, GROUND_Y + 40, W, H - GROUND_Y - 40, '#00000030');
    game.draw.sprite(STALL_SPRITE, { '#': C.stallDark }, W * 0.5, DROP_Y - 60, 40, { anchor: 'center' });
  }

  var caught, missed, done, endWait, finished;
  var ready, hitStop, shake;
  var basketX, item, popTimer;

  function newItem() {
    var slot = Math.floor(game.random(0, 3));
    var speed = Math.max(2.1, 2.9 - caught * 0.06);
    return {
      x: W * (0.2 + game.random(0, 0.6)), y: DROP_Y, spd: 620 + caught * 14, kind: slot, resolved: false,
    };
  }

  function initGame() {
    caught = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    basketX = W * 0.5; popTimer = 0;
    item = newItem();
  }

  function moveBasket(x) {
    basketX = Math.max(BASKET_HALF + 20, Math.min(W - BASKET_HALF - 20, x));
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); moveBasket(x); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) moveBasket(x); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveLanding() {
    if (item.resolved) return;
    item.resolved = true;
    var dist = Math.abs(item.x - basketX);
    if (dist < BASKET_HALF) {
      caught++;
      hitStop = 0.08;
      game.feedback.good(item.x, GROUND_Y, { text: 'GET', color: C.good });
      game.fx.burst(item.x, GROUND_Y, { color: ITEM_COLORS[item.kind], count: 14, speed: 300 });
      game.audio.play('se_coin', 0.4);
      if (caught === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.4, { color: C.gold, size: 40 });
    } else {
      missed++;
      hitStop = 0.3;
      game.feedback.bad(item.x, GROUND_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (caught >= NEED) { ok = true; finished = true; finish(); return; }
    item = newItem();
  }

  function drawBasket(x) {
    game.draw.rect(x - BASKET_HALF, GROUND_Y, BASKET_HALF * 2, 26, C.basketDark);
    game.draw.rect(x - BASKET_HALF + 10, GROUND_Y - 14, BASKET_HALF * 2 - 20, 20, C.basket);
    game.draw.line(x - BASKET_HALF, GROUND_Y - 20, x + BASKET_HALF, GROUND_Y - 20, C.basketDark, 6);
  }

  function drawItem(it) {
    if (!it || it.resolved) return;
    game.draw.sprite(ITEM_SPRITES[it.kind], { '#': ITEM_COLORS[it.kind] }, it.x, it.y, 14, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      caught = 0; missed = 0; basketX = W * 0.5;
      item = { x: W * 0.32, y: DROP_Y, spd: 640, kind: 0, resolved: false };
    }
    item.y += item.spd * dt;
    var targetX = item.x;
    demo.gx += (targetX - demo.gx) * Math.min(1, dt * 6);
    demo.gy = GROUND_Y - 40;
    demo.press = true;
    basketX += (demo.gx - basketX) * Math.min(1, dt * 8);
    if (!item.resolved && item.y >= GROUND_Y) {
      item.resolved = true;
      game.feedback.good(item.x, GROUND_Y, { text: 'GET', color: C.good, sound: false });
      game.audio.play('se_coin', 0.25);
      game.fx.burst(item.x, GROUND_Y, { color: ITEM_COLORS[item.kind], count: 10, speed: 240 });
    }
    if (cyc > 1.7 && item.y >= GROUND_Y - 6) {
      item = { x: W * 0.68, y: DROP_Y, spd: 640, kind: 1, resolved: false };
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBasket(basketX);
      drawItem(item);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBasket(basketX);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + NEED, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (NEED - caught) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, missed: missed });
        else game.end.failure({ caught: caught, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      item.y += item.spd * dt;
      if (item.y >= GROUND_Y && !item.resolved) resolveLanding();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBasket(basketX);
    if (!finished) drawItem(item);

    txt(caught + ' / ' + NEED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / NEED), 16, C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 34, 150 + 60, 12, m < missed ? C.bad : '#ffffff40');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
