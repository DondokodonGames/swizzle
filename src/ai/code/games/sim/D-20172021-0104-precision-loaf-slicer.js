// D-20172021-0104-precision-loaf-slicer.js
// プレシジョンローフ・スライサー — まな板の生地を指定の個数ぴったりに切り分ける
// 操作: 生地の上から下へ指を素早くまっすぐ振り下ろして切る。既存の切れ目から離れた位置を狙う
// 終わり: 指定個数ぴったりに切れれば成功。個数を超えて切ってしまったら失敗
// @mechanic: slice
// @theme: precision_loaf_slicer
// 世界観: 厨房の見習いが焼き上がった生地を、注文書どおりの個数ぴったりに刃で切り分ける腕を競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 切れた個数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラット単色、太めの丸角
  var C = {
    bg: '#fff3e0', bg2: '#ffe0b8', board: '#c98a4a', boardDark: '#a06a30',
    loaf: '#f2c98a', loafDark: '#d9a05a', cut: '#8a5a2a',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ff9f1c', ink: '#3a2010', white: '#fff6ec',
  };

  var GAME_TITLE = 'LOAF SLICER';
  var BAR_X0 = W * 0.14, BAR_X1 = W * 0.86, BAR_Y = H * 0.5, BAR_H = 90;
  var TARGET_PIECES = 4;
  var TIME_LIMIT = 11;
  var MIN_GAP = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#2a1608', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHEF_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    game.draw.rect(0, H * 0.36, W, H * 0.3, C.board);
    game.draw.rect(0, H * 0.36, W, 10, C.boardDark, 0.5);
  }

  var cuts, roundClock, drag, done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    cuts = []; roundClock = 0; drag = null; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tooClose(x) {
    for (var i = 0; i < cuts.length; i++) if (Math.abs(cuts[i] - x) < MIN_GAP) return true;
    return false;
  }

  function succeedNow() {
    ok = true; finished = true; hitStop = 0.25;
    game.fx.burst(W / 2, BAR_Y, { color: C.gold, count: 24, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    ok = false; finished = true; hitStop = 0.3;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  function tryCut(x0, y0, x1, y1) {
    var vertical = Math.abs(y1 - y0) > 260 && Math.abs(x1 - x0) < 160;
    var crossed = Math.min(y0, y1) < BAR_Y - BAR_H / 2 && Math.max(y0, y1) > BAR_Y + BAR_H / 2;
    var midX = (x0 + x1) / 2;
    if (!vertical || !crossed || midX < BAR_X0 + 20 || midX > BAR_X1 - 20) {
      game.feedback.bad(midX, BAR_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      return;
    }
    if (tooClose(midX)) {
      game.feedback.bad(midX, BAR_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      return;
    }
    cuts.push(midX);
    game.feedback.good(midX, BAR_Y, { text: 'GOOD', color: C.good });
    game.audio.play('se_break', 0.4);
    if (cuts.length === Math.floor(TARGET_PIECES / 2) && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('NICE', W / 2, BAR_Y - 160, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (cuts.length === TARGET_PIECES - 1) {
      hitStop = 0.2;
      succeedNow();
    } else if (cuts.length > TARGET_PIECES - 1) {
      hitStop = 0.3; shake = 0.26;
      failNow();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    drag = { x0: x, y0: y, x1: x, y1: y };
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (drag) { drag.x1 = x; drag.y1 = y; if (Math.random() < 0.1) game.audio.tone(520, 0.03, { wave: 'square', volume: 0.03 }); }
  });
  game.onRelease(function(x, y) {
    if (!drag) return;
    tryCut(drag.x0, drag.y0, x, y);
    drag = null;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(cutList, dr) {
    var sorted = cutList.slice().sort(function(a, b) { return a - b; });
    var prevX = BAR_X0;
    for (var i = 0; i <= sorted.length; i++) {
      var nextX = i < sorted.length ? sorted[i] : BAR_X1;
      var gap = 6;
      game.draw.rect(prevX + gap / 2, BAR_Y - BAR_H / 2, Math.max(4, nextX - prevX - gap), BAR_H, C.loaf);
      game.draw.rect(prevX + gap / 2, BAR_Y - BAR_H / 2, Math.max(4, nextX - prevX - gap), 10, C.loafDark, 0.4);
      prevX = nextX;
    }
    for (var k = 0; k < sorted.length; k++) {
      game.draw.rect(sorted[k] - 3, BAR_Y - BAR_H / 2 - 6, 6, BAR_H + 12, C.cut);
    }
    if (dr) game.draw.line(dr.x0, dr.y0, dr.x1, dr.y1, '#ffffff', 6);
    var cf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(CHEF_F[cf], { '#': C.ink }, W * 0.14, H * 0.2, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.3, gy: BAR_Y - 200, press: false };
  function resetDemo() { initGame(); demo.phase = 0; demo.tx = BAR_X0 + 130; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    var seg = cyc % 1.6;
    var tx = BAR_X0 + 130 + cuts.length * 170;
    if (seg < 0.7) {
      demo.gx = tx; demo.gy = BAR_Y - 200 + (seg / 0.7) * 400;
      demo.press = true;
    } else if (seg < 0.85 && demo.press) {
      tryCut(tx, BAR_Y - 200, tx, BAR_Y + 200);
      demo.press = false;
    } else {
      demo.gy = BAR_Y - 200;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cuts === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(cuts, null);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.14, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.18, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(cuts, null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14, 46, ok ? C.good : C.bad);
      txt((cuts.length + 1) + ' / ' + TARGET_PIECES, W / 2, H * 0.19, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.23, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cuts.length + 1, { pieces: cuts.length + 1, target: TARGET_PIECES });
        else game.end.failure({ pieces: cuts.length + 1, target: TARGET_PIECES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(cuts, drag);

    txt((cuts.length + 1) + ' / ' + TARGET_PIECES, W / 2, H * 0.08, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 190, W - 120, 16, '#00000030', 1);
    game.draw.rect(60, 190, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.4]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
