// D-20222026-0011-tube-hue-decant.js
// チューブ・ヒューデキャント — 混ざった色水の小瓶を、同じ色の受け瓶へドラッグして注ぎ分ける
// 操作: トレイに並ぶ色水の小瓶をつかみ、同じ色・同じ形の受け瓶までドラッグして注ぐ
// 終わり: 制限時間内に全ての小瓶を正しい受け瓶へ注げば成功。時間切れで失敗
// @mechanic: gap_fit
// @theme: tube_hue_decant
// 世界観: 化学準備室の助手が、混ざって届いた色水の小瓶を、同じ色・同じ口の形をした受け瓶へ一本ずつ注ぎ分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 注ぎ分けた本数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: ダークベース+ネオン発光線、走査線調
  var STYLE = {
    bg: ['#0f1330', '#050714'],
    main: ['#ff3d81', '#2ff3e0', '#ffde59'],
    accent: ['#ffffff', '#0a0c1a'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#2ff3e0', bad: '#ff3d5e', gold: '#ffde59',
    flaskEdge: '#3a3f66',
  };
  var COLORS = STYLE.main;
  var SHAPES = [
    ['.###.', '#####', '#####', '#####', '.###.'],
    ['..#..', '.###.', '#####', '.###.', '..#..'],
    ['..#..', '.###.', '#####', '#####', '#####'],
  ];

  var GAME_TITLE = 'HUE DECANT';
  var TIME_LIMIT = 17;
  var TUBE_N = 6;
  var TUBE_R = 74;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000aa', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ASSIST_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var TRAY = { x: W * 0.5, y: H * 0.4, w: W * 0.76, h: H * 0.3 };
  var FLASK_Y = H * 0.76;
  var FLASK_X = [W * 0.22, W * 0.5, W * 0.78];
  var FLASK_W = 250, FLASK_H = 220;

  function flaskAt(i) { return { x: FLASK_X[i], y: FLASK_Y }; }

  var tubes, poured, dragIdx;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function slotPos(i) {
    var cols = 3;
    var col = i % cols, row = Math.floor(i / cols);
    var sx = TRAY.x - TRAY.w / 2 + 130 + col * (TRAY.w - 260) / (cols - 1);
    var sy = TRAY.y - TRAY.h / 2 + 90 + row * 190;
    return { x: sx, y: sy };
  }

  function initGame() {
    tubes = [];
    for (var i = 0; i < TUBE_N; i++) {
      var p = slotPos(i);
      tubes.push({ x: p.x, y: p.y, hx: p.x, hy: p.y, color: i % COLORS.length, done: false, anim: 0 });
    }
    for (var s = tubes.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = tubes[s].color; tubes[s].color = tubes[j].color; tubes[j].color = t;
    }
    poured = 0; dragIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.good, pulse * 0.15);
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    game.draw.sprite(ASSIST_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawFlasks() {
    for (var i = 0; i < FLASK_X.length; i++) {
      var f = flaskAt(i);
      game.draw.rect(f.x - FLASK_W / 2, f.y - FLASK_H / 2, FLASK_W, FLASK_H, '#161b3c');
      game.draw.rect(f.x - FLASK_W / 2, f.y - FLASK_H / 2, FLASK_W, 10, COLORS[i]);
      game.draw.sprite(SHAPES[i], { '#': COLORS[i] }, f.x, f.y + 20, 12, { anchor: 'center' });
    }
  }

  function drawTubes() {
    for (var i = 0; i < tubes.length; i++) {
      var tb = tubes[i];
      if (tb.done && tb.anim <= 0) continue;
      var alpha = tb.done ? Math.max(0, tb.anim) : 1;
      var scale = i === dragIdx ? 15 : 13;
      game.draw.sprite(SHAPES[tb.color], { '#': COLORS[tb.color] }, tb.x, tb.y, scale, { anchor: 'center', alpha: alpha });
    }
  }

  function findTubeAt(x, y) {
    var best = -1, bestD = TUBE_R;
    for (var i = 0; i < tubes.length; i++) {
      if (tubes[i].done) continue;
      var d = Math.hypot(tubes[i].x - x, tubes[i].y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function flaskIndexAt(x, y) {
    for (var i = 0; i < FLASK_X.length; i++) {
      var f = flaskAt(i);
      if (x > f.x - FLASK_W / 2 && x < f.x + FLASK_W / 2 && y > f.y - FLASK_H / 2 && y < f.y + FLASK_H / 2) return i;
    }
    return -1;
  }

  function tryPour(idx, x, y) {
    var fi = flaskIndexAt(x, y);
    var tb = tubes[idx];
    if (fi === tb.color) {
      tb.done = true; tb.anim = 1; tb.x = flaskAt(fi).x; tb.y = flaskAt(fi).y;
      poured++;
      game.feedback.good(tb.x, tb.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!halfCalled && poured >= Math.ceil(TUBE_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', tb.x, tb.y - 120, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (poured >= TUBE_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(tb.x, tb.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      tb.x = tb.hx; tb.y = tb.hy;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = findTubeAt(x, y);
    if (i >= 0) { dragIdx = i; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    tubes[dragIdx].x = x; tubes[dragIdx].y = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    tryPour(dragIdx, x, y);
    dragIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0 };
  function resetDemo() { initGame(); demo.idx = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.2 / TUBE_N;
    var localIdx = Math.min(TUBE_N - 1, Math.floor(cyc / per));
    var localT = (cyc - localIdx * per) / per;
    if (localIdx > demo.idx) {
      var prev = tubes[demo.idx];
      if (prev && !prev.done) { prev.done = true; prev.x = flaskAt(prev.color).x; prev.y = flaskAt(prev.color).y; poured++; }
      demo.idx = localIdx;
    }
    var tb = tubes[demo.idx];
    if (tb && !tb.done) {
      var f = flaskAt(tb.color);
      if (localT < 0.7) {
        var t2 = localT / 0.7;
        demo.gx = tb.hx + (f.x - tb.hx) * t2;
        demo.gy = tb.hy + (f.y - tb.hy) * t2;
        tb.x = demo.gx; tb.y = demo.gy;
        demo.press = true;
      } else {
        demo.gx = f.x; demo.gy = f.y; demo.press = false;
        if (localT > 0.75 && !tb.done) {
          tb.done = true; tb.x = f.x; tb.y = f.y; poured++;
          game.feedback.good(f.x, f.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.2);
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tubes) initGame();
      bg();
      stepDemo(dt);
      drawFlasks();
      drawTubes();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFlasks();
      drawTubes();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(poured + ' / ' + TUBE_N, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TUBE_N - poured) + '本!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    for (var i = 0; i < tubes.length; i++) if (tubes[i].done && tubes[i].anim > 0) tubes[i].anim -= dt * 2;

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(poured, { poured: poured });
        else game.end.failure({ poured: poured });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4; shake = 0.25;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFlasks();
    drawTubes();

    txt(poured + ' / ' + TUBE_N, W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#ffffff22');
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.2], ['A4', 0.2], ['C5', 0.2], ['F5', 0.4]], { tempo: 140, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
