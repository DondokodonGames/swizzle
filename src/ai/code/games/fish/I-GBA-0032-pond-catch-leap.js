// I-GBA-0032-pond-catch-leap.js
// ポンドキャッチ — 池の水面すれすれで、落ちてくる木の実が着水する前に口を合わせて飲み込む
// 操作: 水面の魚を指でドラッグして左右に動かし、落ちてくる木の実の真下に口を合わせる
// 終わり: 規定数(8個)を着水前に飲み込めば成功。見逃しが3回になれば失敗
// @mechanic: drag_follow
// @theme: pond_fish_catch
// 世界観: 森の奥の池。丸々とした魚が、水面に降り注ぐ木の実を着水前に次々と飲み込んで腹を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 飲み込めた個数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    sky: '#bfe8ff', sky2: '#8fd4ff', water: '#2f8fd1', waterDeep: '#1f5f95',
    fishBody: '#ffb23c', fishShade: '#e08a1a', fishOutline: '#12242c',
    nut: '#8a5a2c', nutShade: '#5c3a18',
    good: '#3ac37a', bad: '#ff4d5e', gold: '#ffe066', white: '#0c1e28', ink: '#ffffff',
  };

  var GAME_TITLE = 'POND CATCH';
  var GOAL = 8;
  var MAX_MISS = 3;
  var TIME_LIMIT = 18;
  var WATER_Y = H * 0.58;
  var CATCH_R = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var fishX, caught, missed, timeLeft, spawnTimer, items;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH_A = ['.####.', '######', '######', '.####.'];
  var FISH_B = ['.####.', '######', '#O##O#', '.####.'];

  function bg() {
    game.draw.gradient(0, WATER_Y, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, WATER_Y, W, H - WATER_Y, C.waterDeep);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, WATER_Y + 26 + i * 30, W, WATER_Y + 26 + i * 30, C.water, 6);
    }
  }

  function newItem(speedMul) {
    return { x: game.random(W * 0.18, W * 0.82), y: -40, vy: game.random(360, 460) * speedMul, telegraphed: false, resolved: false };
  }

  function initGame() {
    fishX = W * 0.5; caught = 0; missed = 0; timeLeft = TIME_LIMIT; spawnTimer = 0.6; items = [];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function onDragTo(x) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    fishX = Math.max(W * 0.12, Math.min(W * 0.88, x));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.05);
    onDragTo(x);
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && Math.random() < 0.08) game.audio.play('se_tap', 0.02);
    onDragTo(x);
  });

  function drawFish(x, mouthOpen, hurt) {
    var frame = mouthOpen ? FISH_B : FISH_A;
    game.draw.circle(x, WATER_Y, 70, C.fishOutline, 0.5);
    game.draw.sprite(frame, { '#': hurt ? C.bad : C.fishBody, 'O': C.fishOutline }, x, WATER_Y, 18, { anchor: 'center' });
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.resolved) continue;
      if (it.y > WATER_Y - 220 && !it.telegraphed) {
        it.telegraphed = true;
      }
      if (it.telegraphed) {
        var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
        if (blink) game.draw.circle(it.x, WATER_Y + 6, 40, C.gold, 0.35);
      }
      game.draw.circle(it.x, it.y, 26, C.nutShade);
      game.draw.circle(it.x, it.y, 20, C.nut);
    }
  }

  function updateItems(dt) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.resolved) { items.splice(i, 1); continue; }
      it.y += it.vy * dt;
      if (it.y >= WATER_Y - 10) {
        if (Math.abs(it.x - fishX) < CATCH_R) {
          it.resolved = true; caught++;
          game.feedback.good(it.x, WATER_Y, { text: 'GOOD', color: C.good });
          game.fx.burst(it.x, WATER_Y, { color: C.gold, count: 12, speed: 260 });
          game.audio.play('se_coin', 0.4);
          if (caught === Math.ceil(GOAL / 2)) {
            game.fx.popup('HALFWAY!', W / 2, H * 0.32, { color: C.gold, size: 38 });
            game.audio.play('se_milestone', 0.5);
          }
          if (caught >= GOAL) { ok = true; finished = true; finish(); }
        } else {
          it.resolved = true; missed++;
          hitStop = 0.25;
          game.feedback.bad(it.x, WATER_Y, { text: 'MISS' });
          shake = 0.2;
          game.audio.play('se_bad', 0.35);
          if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
        }
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: WATER_Y, press: false, it: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { caught = 0; missed = 0; demo.it = null; }
    if (!demo.it) demo.it = { x: cyc < 1.7 ? W * 0.32 : W * 0.68, y: -30, vy: 360 };
    demo.it.y += dt * demo.it.vy;
    demo.gx = demo.it.x; demo.gy = H * 0.94; demo.press = demo.it.y > WATER_Y - 260;
    if (demo.press) fishX += (demo.it.x - fishX) * Math.min(1, dt * 8);
    if (demo.it.y >= WATER_Y - 10) {
      game.feedback.good(demo.it.x, WATER_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.25);
      demo.it = null;
    }
    items = demo.it ? [demo.it] : [];
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawItems();
      drawFish(fishX, true, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.16, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.16, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFish(fishX, false, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(caught + ' / ' + GOAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, GOAL - caught) + '個!', W / 2, H * 0.18, 26, C.ink);
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
      spawnTimer -= dt;
      var speedMul = 1 + (TIME_LIMIT - timeLeft) / TIME_LIMIT * 0.5;
      if (spawnTimer <= 0) {
        items.push(newItem(speedMul));
        spawnTimer = Math.max(0.55, 1.15 - (TIME_LIMIT - timeLeft) * 0.03);
      }
      updateItems(dt);
      if (timeLeft <= 0 && !finished) {
        ok = caught >= GOAL; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawItems();
    drawFish(fishX, hitStop > 0, hitStop > 0);

    txt(caught + ' / ' + GOAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 14, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, C.gold);
    for (var li = 0; li < MAX_MISS; li++) {
      game.draw.circle(W * 0.5 - 40 + li * 40, H * 0.86, 14, li < MAX_MISS - missed ? C.gold : '#00000030');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['B4', 0.3], ['D5', 0.3], ['G5', 0.5]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
