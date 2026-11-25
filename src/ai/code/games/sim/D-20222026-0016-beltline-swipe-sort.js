// D-20222026-0016-beltline-swipe-sort.js
// ベルトライン・スワイプソート — ベルトコンベアで流れてくる荷物を種類別のシュートへ素早くスワイプで振り分ける
// 操作: 判定ゾーンに荷物が入ったら、その種類に応じて左右どちらかへスワイプして振り分ける
// 終わり: 制限時間内に目標数を正しく振り分ければ成功。時間切れで失敗
// @mechanic: swipe_direction
// @theme: beltline_swipe_sort
// 世界観: 仕分け工場のライン作業員が、ベルトコンベアで流れてくる荷物を判定ゾーンで見極め、左右のシュートへ素早く振り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 振り分けた数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色+疑似ボリューム(濃淡2段)、太いアウトライン
  var STYLE = {
    bg: ['#ffe8b0', '#ffca6b'],
    main: ['#ff5e5e', '#3ec6ff'],
    accent: ['#ffffff', '#332211'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#2bd67b', bad: '#ff3b3b', gold: '#ffb400',
    belt: '#8a6b4a', beltDark: '#5c4630',
  };
  var COLORS = STYLE.main;
  var BOX_FRAME = ['#####', '#...#', '#####'];

  var GAME_TITLE = 'SWIPE SORT';
  var TIME_LIMIT = 12;
  var TARGET_N = 6;
  var ZONE_Y = H * 0.5, ZONE_HALF = 90;
  var LANE_X = W * 0.5;
  var SPEED = 420;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var itemY, itemColor, resolved, cleared, misses;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function spawnItem() {
    itemY = H * 0.16;
    itemColor = Math.floor(Math.random() * COLORS.length);
    resolved = false;
  }

  function initGame() {
    spawnItem();
    cleared = 0; misses = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(WORKER_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ink }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawBelt() {
    game.draw.rect(LANE_X - 130, H * 0.12, 260, H * 0.62, C.belt);
    for (var i = 0; i < 8; i++) {
      var sy = (H * 0.12 + ((game.time.elapsed * 260 + i * 90) % (H * 0.62)));
      game.draw.rect(LANE_X - 130, sy, 260, 8, C.beltDark, 0.5);
    }
    var glow = 0.25 + 0.15 * Math.sin(game.time.elapsed * 6);
    game.draw.rect(LANE_X - 150, ZONE_Y - ZONE_HALF, 300, ZONE_HALF * 2, C.white, glow);
    game.draw.rect(80, H * 0.86, 260, 140, COLORS[0], 0.9);
    game.draw.sprite(BOX_FRAME, { '#': C.white }, 210, H * 0.92, 14, { anchor: 'center' });
    game.draw.rect(W - 340, H * 0.86, 260, 140, COLORS[1], 0.9);
    game.draw.sprite(BOX_FRAME, { '#': C.white }, W - 210, H * 0.92, 14, { anchor: 'center' });
  }

  function drawItem() {
    if (resolved) return;
    game.draw.sprite(BOX_FRAME, { '#': COLORS[itemColor] }, LANE_X, itemY, 18, { anchor: 'center' });
  }

  function isActive() { return !resolved && Math.abs(itemY - ZONE_Y) <= ZONE_HALF; }

  function resolveSwipe(dir) {
    if (!isActive()) return;
    var needDir = itemColor === 0 ? 'left' : 'right';
    resolved = true;
    if (dir === needDir) {
      cleared++;
      var tx = needDir === 'left' ? 210 : W - 210;
      game.feedback.good(tx, H * 0.9, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!halfCalled && cleared >= Math.ceil(TARGET_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', LANE_X, ZONE_Y - 120, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (cleared >= TARGET_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(tx, H * 0.9, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      misses++;
      game.feedback.bad(LANE_X, ZONE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (dir === 'left' || dir === 'right') resolveSwipe(dir);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANE_X, gy: H * 0.16, press: false, phase: 0 };
  function resetDemo() { initGame(); demo.phase = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.9;
    if (cyc < dt || demo.t <= dt) resetDemo();
    itemY = H * 0.16 + (cyc / 1.9) * (H * 0.7);
    var needDir = itemColor === 0 ? 'left' : 'right';
    if (isActive() && !resolved) {
      demo.gx = LANE_X; demo.gy = ZONE_Y; demo.press = true;
      var tx = needDir === 'left' ? LANE_X - 220 : LANE_X + 220;
      demo.gx = tx;
      resolved = true;
      cleared++;
      game.feedback.good(needDir === 'left' ? 210 : W - 210, H * 0.9, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.2);
    } else if (itemY > H * 0.75) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (itemY === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBelt();
      drawItem();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.045, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBelt();
      drawItem();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TARGET_N, W / 2, H * 0.045, 24, C.gold);
      if (!ok) txt('あと' + (TARGET_N - cleared) + '個!', W / 2, H * 0.78, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (!finished && !resolved) {
      itemY += SPEED * dt;
      if (itemY > H * 0.78 && !resolved) {
        resolved = true; misses++;
        game.feedback.bad(LANE_X, H * 0.7, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
      }
    }
    if (!finished && resolved && itemY < H * 0.9) {
      itemY += SPEED * dt;
    } else if (!finished && resolved) {
      spawnItem();
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, misses: misses });
        else game.end.failure({ cleared: cleared, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(LANE_X, ZONE_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBelt();
    drawItem();

    txt(cleared + ' / ' + TARGET_N, W / 2, H * 0.05, 26, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 176, tbW, 14, '#00000022');
    game.draw.rect(60, 176, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['E4', 0.15], ['G4', 0.15], ['C5', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
