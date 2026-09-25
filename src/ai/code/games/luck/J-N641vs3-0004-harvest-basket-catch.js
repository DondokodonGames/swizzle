// J-N641vs3-0004-harvest-basket-catch.js
// ハーベスト・バスケット・キャッチ — 収穫祭の樽職人が受け皿を動かし、降り注ぐ木の実を可能な限り受け止める
// 操作: 指で受け皿を左右にドラッグして、降ってくる木の実を受け止める
// 終わり: 制限時間内に目標数を受け止めれば成功。腐った実を受けすぎるか届かなければGAME OVER
// @mechanic: drag_follow
// @theme: harvest_basket_catch
// 世界観: 収穫祭の樽職人見習いが両手の受け皿を吊り具ごと素早く動かし、降り注ぐ木の実を可能な限り多く受け止めて樽を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 受け止めた数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・柳細工風の質感を横ストライプで模す、柔らかい影と光沢
  var C = {
    sky: '#fff0d0', sky2: '#ffd98a', bannerA: '#c9482e', bannerB: '#e8dcc0',
    basket: '#8a5a2a', basketDark: '#5c3a18', nut: '#a5691f', nutDark: '#5c3a10',
    rot: '#5c4a3a', rotDark: '#2e2418',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffcf3a', ink: '#3a2510', white: '#ffffff',
  };

  var GAME_TITLE = 'HARVEST CATCH';
  var TIME_LIMIT = 16;
  var TARGET = 12;
  var BASKET_Y = H * 0.80;
  var SPAWN_GAP = 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BASKET_SPRITE = ['#....#', '######', '.####.'];
  var NUT_SPRITE = ['.##.', '####', '.##.'];
  var ROT_SPRITE = ['#..#', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.sky2]]);
    for (var i = 0; i < 6; i++) {
      game.draw.rect(0, H * 0.06 + i * 30, W, 14, i % 2 === 0 ? C.bannerA : C.bannerB, 0.15);
    }
  }

  var basketX, drops, caught, spilled, spawnClock, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    basketX = W * 0.5; drops = []; caught = 0; spilled = 0; spawnClock = 0.6; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnDrop() {
    var rotten = Math.random() < 0.22;
    drops.push({ x: game.random(W * 0.12, W * 0.88), y: -40, v: game.random(430, 560), rotten: rotten, dead: false });
  }

  function drawScene() {
    bg();
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.dead) continue;
      var sprite = d.rotten ? ROT_SPRITE : NUT_SPRITE;
      var col = d.rotten ? C.rot : C.nut;
      game.draw.sprite(sprite, { '#': col }, d.x, d.y, 20, { anchor: 'center' });
    }
    game.draw.sprite(BASKET_SPRITE, { '#': C.basket }, basketX, BASKET_Y, 30, { anchor: 'center' });
  }

  function moveBasket(x) {
    basketX = Math.max(W * 0.14, Math.min(W * 0.86, x));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) { moveBasket(x); game.audio.play('se_tap', 0.04); }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) moveBasket(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    roundClock += dt;
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', basketX, BASKET_Y - 160, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    spawnClock -= dt;
    if (spawnClock <= 0) { spawnDrop(); spawnClock = Math.max(0.3, SPAWN_GAP - roundClock * 0.015); }
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      if (d.dead) { drops.splice(i, 1); continue; }
      d.y += d.v * dt;
      if (d.y > BASKET_Y - 20 && d.y < BASKET_Y + 40 && Math.abs(d.x - basketX) < 90) {
        d.dead = true;
        if (d.rotten) {
          spilled++;
          game.feedback.bad(basketX, BASKET_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.3);
        } else {
          caught++;
          game.feedback.good(basketX, BASKET_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.3);
          if (caught >= TARGET) {
            finished = true; ok = true;
            game.feedback.good(basketX, BASKET_Y, { text: 'CLEAR', color: C.good });
            game.fx.burst(basketX, BASKET_Y, { color: C.gold, count: 20, speed: 380 });
            game.audio.play('se_success', 0.5);
            finish();
            return;
          }
        }
      } else if (d.y > H + 40) {
        d.dead = true;
        if (!d.rotten) game.audio.play('se_tap', 0.05);
      }
    }
    if (roundClock >= TIME_LIMIT) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(basketX, BASKET_Y, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: BASKET_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (drops.length === 0 && cyc < 2.0) spawnDrop();
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      if (d.dead) continue;
      d.y += d.v * dt * 0.85;
      if (!d.rotten && d.y > BASKET_Y - 260 && !d.tracked) {
        d.tracked = true;
        demo.gx = d.x; demo.gy = BASKET_Y; demo.press = true;
        basketX = d.x;
      }
      if (d.y > BASKET_Y - 20 && d.y < BASKET_Y + 40 && Math.abs(d.x - basketX) < 90) {
        d.dead = true;
        if (!d.rotten) {
          game.feedback.good(basketX, BASKET_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.2);
        }
      }
      if (d.y > H + 40) d.dead = true;
    }
    demo.press = cyc < 2.2;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (drops === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(caught + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TARGET - caught) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, spilled: spilled });
        else game.end.failure({ caught: caught, spilled: spilled });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(caught + ' / ' + TARGET, W * 0.5, H * 0.07, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#c9482e', 0.25);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 155, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
