// J-N6424-0021-candy-trim-line.js
// キャンディトリムライン — ベルトを流れる菓子の型に合う飾りだけを選んで乗せる検品ライン
// 操作: 流れてくる菓子の輪郭に合う飾りを下の2択からタップして選び、菓子の上に乗せる
// 終わり: 規定個数を正しく飾れれば成功。3回間違える/時間切れで失敗
// @mechanic: gap_fit
// @theme: candy_decoration_line
// 世界観: 菓子工房の見習い職人が、流れてくる菓子それぞれの輪郭に合う飾りだけを選び取り、規定数を検品台に並べていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく飾れた菓子数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高いキャンディカラー、白フチ、丸みのある帯
  var C = {
    bg: '#ffe1ef', bg2: '#ffc4e0', belt: '#fff6fa', beltLine: '#ff8fc0',
    candyA: '#ff6b6b', candyB: '#4ecdc4', candyC: '#ffd93d',
    deco: '#ffffff', decoRing: '#7b4fff', good: '#39c96a', bad: '#ff4d5e',
    gold: '#ffd93d', ink: '#5a2a4a', white: '#ffffff',
  };

  var GAME_TITLE = 'CANDY TRIM';
  var BELT_Y = H * 0.42;
  var SLOT_X = W * 0.5;
  var NEED = 7;
  var MAX_MISS = 3;
  var MAX_TIME = 18;

  var SHAPES = ['star', 'circle', 'heart'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#7a3a5a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BAKER = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.deco, pulse * 0.3);
    game.draw.rect(60, BELT_Y - 100, W - 120, 200, C.belt);
    for (var i = 0; i < 8; i++) {
      var bx = ((game.time.elapsed * 220 + i * 160) % (W + 200)) - 100;
      game.draw.rect(bx, BELT_Y + 80, 40, 14, C.beltLine, 0.5);
    }
    var bob = Math.sin(game.time.elapsed * 2.2) * 5;
    game.draw.sprite(BAKER, { '#': C.ink }, W * 0.86, H * 0.86 + bob, 9, { anchor: 'center' });
  }

  function drawShape(shape, x, y, r, color, ring) {
    if (shape === 'circle') {
      game.draw.circle(x, y, r, color);
      if (ring) game.draw.circle(x, y, r, ring, 0);
    } else if (shape === 'star') {
      game.draw.rect(x - r, y - 10, r * 2, 20, color);
      game.draw.rect(x - 10, y - r, 20, r * 2, color);
    } else {
      game.draw.circle(x - r * 0.45, y - r * 0.2, r * 0.6, color);
      game.draw.circle(x + r * 0.45, y - r * 0.2, r * 0.6, color);
      game.draw.rect(x - r * 0.55, y - r * 0.1, r * 1.1, r * 0.8, color);
    }
  }

  var candy, opts, correctIdx, hits, misses, halfCalled;

  function newCandy() {
    var shape = SHAPES[Math.floor(game.random(0, SHAPES.length))];
    var colors = [C.candyA, C.candyB, C.candyC];
    var color = colors[Math.floor(game.random(0, colors.length))];
    candy = { shape: shape, color: color, x: -140, arrived: false };
    var others = SHAPES.filter(function(s) { return s !== shape; });
    var wrong = others[Math.floor(game.random(0, others.length))];
    correctIdx = Math.random() < 0.5 ? 0 : 1;
    opts = correctIdx === 0 ? [shape, wrong] : [wrong, shape];
  }

  function initGame() {
    hits = 0; misses = 0; halfCalled = false;
    newCandy();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; roundClock = 0;
  }
  var done, endWait, finished, ready, hitStop, shake, roundClock;

  var OPT_Y = H * 0.78, OPT_R = 90;
  function optX(i) { return W * (i === 0 ? 0.3 : 0.7); }

  function drawScene() {
    drawShape(candy.shape, candy.x, BELT_Y, 60, candy.color, '#ffffff');
    for (var i = 0; i < 2; i++) {
      var flash = candy.arrived && Math.floor(game.time.elapsed * 4) % 2 === 0;
      game.draw.circle(optX(i), OPT_Y, OPT_R, C.deco);
      drawShape(opts[i], optX(i), OPT_Y, 46, C.decoRing, flash ? '#ffffff' : null);
    }
  }

  function pickOption(i, x, y) {
    if (finished || ready > 0 || !candy.arrived) return;
    if (i === correctIdx) {
      hits++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.35);
      game.fx.burst(candy.x, BELT_Y, { color: C.gold, count: 14, speed: 320 });
      if (!halfCalled && hits >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', x, y - 90, { color: C.gold, size: 32 }); }
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newCandy();
      }
    } else {
      misses++;
      hitStop = 0.3; shake = 0.25;
      game.fx.flash(C.bad, 0.15);
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      if (misses >= MAX_MISS) { finished = true; ok = false; finish(); }
      else newCandy();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var d0 = Math.hypot(x - optX(0), y - OPT_Y);
      var d1 = Math.hypot(x - optX(1), y - OPT_Y);
      if (d0 < OPT_R + 20 && d0 <= d1) pickOption(0, x, y);
      else if (d1 < OPT_R + 20) pickOption(1, x, y);
    }
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepBelt(dt) {
    if (!candy.arrived) {
      candy.x += 480 * dt;
      if (candy.x >= SLOT_X) { candy.x = SLOT_X; candy.arrived = true; game.audio.play('se_tap', 0.1); }
    }
  }

  var demo = { t: 0, gx: optX(0), gy: OPT_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 1.3) {
      candy.x = -140 + (SLOT_X + 140) * (cyc / 1.3);
      if (candy.x >= SLOT_X - 4) candy.arrived = true;
      demo.gx = optX(correctIdx); demo.gy = OPT_Y - 200; demo.press = false;
    } else if (cyc < 1.9) {
      var t2 = (cyc - 1.3) / 0.6;
      demo.gy = (OPT_Y - 200) + (OPT_Y - (OPT_Y - 200)) * t2;
      demo.press = t2 > 0.7;
      if (t2 > 0.7 && !demo.resolved) {
        demo.resolved = true;
        game.feedback.good(optX(correctIdx), OPT_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.25);
      }
    } else {
      demo.resolved = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (candy === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.decoRing);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.decoRing);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '個!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBelt(dt);
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false;
        game.feedback.bad(SLOT_X, BELT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var pctLeft = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.6);
    game.draw.rect(60, 150, tbW * pctLeft, 16, pctLeft < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.decoRing);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['C5', 0.25], ['E5', 0.45]], { tempo: 140, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
