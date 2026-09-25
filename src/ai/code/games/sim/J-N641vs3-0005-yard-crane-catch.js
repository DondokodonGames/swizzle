// J-N641vs3-0005-yard-crane-catch.js
// 夜間資材キャッチャー — 夜の資材置き場で、頭上のクレーンから落ちる荷を台車で受け止める
// 操作: 画面下の台車を指でドラッグして左右に動かし、良い資材の真下に入って受け止め、発火物は避ける
// 終わり: 制限時間内に規定個数の資材を受け止めれば成功。発火物に3回当たると失敗
// @mechanic: drag_follow
// @theme: night_yard_crane_catch
// 世界観: 夜勤の資材誘導員が、頭上を行き来するクレーンの吊り荷から落ちてくる木箱を台車で受け止め、火花を噴く廃棄樽は避けてノルマを達成する
// 残るもの: 正誤(CLEAR/GAME OVER) + 受け止めた資材数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド基調、6〜8色、影で高さを示す
  var C = {
    bg: '#1a2438', bg2: '#0d1424', floorA: '#2c3a56', floorB: '#233049',
    cart: '#e8d24a', cartDark: '#b89e28', crateGood: '#7fd6ff', crateGoodDark: '#3a8fb8',
    bad: '#ff6a3a', badDark: '#b8401a', good: '#39e07a', badc: '#ff4d5e',
    gold: '#ffd400', ink: '#eaf1ff', crane: '#8a97b8',
  };

  var GAME_TITLE = 'YARD CATCH';
  var TIME_LIMIT = 18;
  var GOAL = 10;
  var MAX_MISS = 3;
  var CART_W = 220, CART_H = 70, CART_Y = H * 0.82;
  var SPAWN_Y = H * 0.20;
  var FALL_SPEED = 640;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#04070f', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRATE_SPR = ['####', '#..#', '####'];
  var BARREL_SPR = ['.##.', '####', '####', '.##.'];
  var CART_SPR = ['######', '#....#', 'oo..oo'];

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    // isometric floor strips
    for (var i = 0; i < 10; i++) {
      var y = H * 0.55 + i * 34;
      var col = i % 2 === 0 ? C.floorA : C.floorB;
      game.draw.rect(0, y, W, 34, col, 0.6);
    }
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.3);
    game.draw.rect(0, 0, W, H, '#7fd6ff', pulse * 0.4);
    // crane silhouette top
    game.draw.line(W * 0.1, H * 0.08, W * 0.9, H * 0.08, C.crane, 10);
    game.draw.line(W * 0.5, H * 0.08, W * 0.5, H * 0.02, C.crane, 10);
    // decorative silhouette workers reaching (non-interactive flavor)
    for (var k = 0; k < 2; k++) {
      var wx = W * (0.18 + k * 0.64);
      var bob = Math.sin(t * 2.2 + k * 2) * 8;
      game.draw.sprite(CART_SPR, { '#': '#3a4a6e', '.': '#3a4a6e', o: '#3a4a6e' }, wx, H * 0.66 + bob, 12, { anchor: 'center', alpha: 0.35 });
    }
  }

  function drawCart(x) {
    game.draw.sprite(CART_SPR, { '#': C.cart, '.': '#12182a', o: C.cartDark }, x, CART_Y, 26, { anchor: 'center' });
  }

  function drawItem(it) {
    if (it.bad) {
      var flick = Math.sin(game.time.elapsed * 20 + it.seed) > 0.3;
      game.draw.sprite(BARREL_SPR, { '#': flick ? C.gold : C.bad, '.': C.badDark }, it.x, it.y, 22, { anchor: 'center' });
    } else {
      game.draw.sprite(CRATE_SPR, { '#': C.crateGoodDark, '.': C.crateGood }, it.x, it.y, 22, { anchor: 'center' });
    }
    if (it.warn > 0) {
      game.draw.circle(it.x, SPAWN_Y - 20, 14, it.bad ? C.badc : C.gold, 0.5 + 0.5 * Math.sin(game.time.elapsed * 30));
    }
  }

  var cartX, items, caught, missed, timeLeft, milestoneCalled;
  var done, endWait, finished, ready, hitStop, shake, spawnClock;

  function initGame() {
    cartX = W * 0.5; items = []; caught = 0; missed = 0; timeLeft = TIME_LIMIT;
    milestoneCalled = false; spawnClock = 0.6;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnItem() {
    var x = W * 0.18 + Math.random() * W * 0.64;
    var isBad = Math.random() < 0.32;
    items.push({ x: x, y: SPAWN_Y - 60, bad: isBad, warn: 0.35, seed: Math.random() * 10, dead: false });
  }

  function resolveMiss(it, force) {
    it.dead = true;
    if (it.bad) return; // avoided fine, no penalty for letting bad ones fall past
    missed++; // missed a good crate: no direct fail, only affects speed of clearing
  }

  function tryCatch(it) {
    if (it.dead) return;
    var d = Math.hypot(it.x - cartX, it.y - CART_Y);
    if (d > CART_W * 0.55) return;
    it.dead = true;
    if (it.bad) {
      shake = 0.3; hitStop = 0.35;
      game.feedback.bad(cartX, CART_Y - 40, { text: 'MISS' });
      game.fx.flash(C.badc, 0.15);
      game.audio.play('se_bad', 0.4);
      missed++;
      if (missed >= MAX_MISS) failRun();
    } else {
      caught++;
      hitStop = 0.08;
      game.feedback.good(cartX, CART_Y - 40, { text: caught >= GOAL ? 'CLEAR' : 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!milestoneCalled && caught >= Math.ceil(GOAL / 2)) {
        milestoneCalled = true;
        game.fx.popup('NICE', cartX, CART_Y - 140, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (caught >= GOAL) succeedRun();
    }
  }

  function failRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.3; hitStop = 0.35;
    game.audio.play('se_failure', 0.5);
    finish();
  }
  function succeedRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.15;
    game.fx.burst(cartX, CART_Y - 40, { color: C.gold, count: 24, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x) { if (state === S.PLAYING && ready <= 0) { cartX = Math.max(120, Math.min(W - 120, x)); game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x) { if (state === S.PLAYING && ready <= 0) cartX = Math.max(120, Math.min(W - 120, x)); });

  var demo = { t: 0, gx: W * 0.5, gy: CART_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { items = []; caught = 0; missed = 0; cartX = W * 0.5; spawnClock = 0.4; }
    spawnClock -= dt;
    if (spawnClock <= 0) { spawnItem(); spawnClock = 0.75 + Math.random() * 0.3; }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.warn > 0) { it.warn -= dt; continue; }
      it.y += FALL_SPEED * dt;
      var target = it.bad ? (cartX + (Math.random() < 0.5 ? 260 : -260)) : it.x;
      if (!it.bad) cartX += (target - cartX) * Math.min(1, dt * 2.2);
      if (Math.abs(it.y - CART_Y) < 30) { tryCatch(it); }
      if (it.y > H + 60 || it.dead) items.splice(i, 1);
    }
    demo.gx = cartX; demo.gy = CART_Y; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      for (var i = 0; i < items.length; i++) drawItem(items[i]);
      drawCart(cartX);
      game.draw.hand(demo.gx, demo.gy - 40, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      for (var j = 0; j < items.length; j++) drawItem(items[j]);
      drawCart(cartX);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.badc);
      txt(caught + ' / ' + GOAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL - caught) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, goal: GOAL, missed: missed });
        else game.end.failure({ caught: caught, goal: GOAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      spawnClock -= dt;
      if (spawnClock <= 0) { spawnItem(); spawnClock = 0.7 + Math.random() * 0.5; }
      for (var k = items.length - 1; k >= 0; k--) {
        var it2 = items[k];
        if (it2.warn > 0) { it2.warn -= dt; continue; }
        it2.y += FALL_SPEED * dt;
        if (it2.y > H + 60) { resolveMiss(it2); items.splice(k, 1); continue; }
        if (Math.abs(it2.y - CART_Y) < 26 && Math.abs(it2.x - cartX) < CART_W * 0.55) { tryCatch(it2); items.splice(k, 1); }
      }
      if (timeLeft <= 0) { timeLeft = 0; failRun(); }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    for (var m = 0; m < items.length; m++) drawItem(items[m]);
    if (!finished) drawCart(cartX);

    txt(caught + ' / ' + GOAL, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#2c3a56', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.badc : C.gold);
    for (var s = 0; s < MAX_MISS; s++) {
      game.draw.circle(W - 90 - s * 44, 210, 14, s < missed ? C.badc : '#2c3a56');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
