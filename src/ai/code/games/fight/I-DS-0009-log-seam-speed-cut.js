// I-DS-0009-log-seam-speed-cut.js
// ログシームスピードカット — 丸太に浮かぶ光る切れ目の向きを見て、示された方向へ素早く指を払って断つ
// 操作: 丸太に光る切れ目の矢印が出たら、示された方向(上下左右)へ素早くスワイプして断ち切る
// 終わり: 規定本数(5本)を全て正しい向きで断てば成功。1本でも失敗/タイムアップすれば失敗
// @mechanic: slice
// @theme: woodyard_seam_cutting_trial
// 世界観: 木材置き場の試し切り台。切り出し職人が次々並ぶ丸太の光る切れ目を、示された向きへ素早く払って断つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 断てた本数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 発光1〜3色、塗りを使わず線主体、黒地、太さ違いの線を重ねて発光を表現
  var C = {
    bg: '#000000', line: '#00ffb0', lineDim: '#00654a', arrow: '#ffe600',
    good: '#39ff8a', bad: '#ff3b4a', gold: '#ffe600', white: '#eaffff', ink: '#000000',
  };

  var GAME_TITLE = 'SEAM CUT';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.48, LOG_LEN = 260;
  var DIRS = ['up', 'down', 'left', 'right'];
  var VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cut, round, cutDur, roundT, dir, resolved, telegraphOn;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CUTTER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#000000']]);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * (0.15 + i * 0.14), W, H * (0.15 + i * 0.14), C.lineDim, 1);
    game.draw.sprite(CUTTER, { '#': C.line }, W * 0.5, H * 0.86, 14, { anchor: 'center' });
  }

  function drawLog(logCut, dirNow, tOn) {
    game.draw.line(CX - LOG_LEN, CY, CX + LOG_LEN, CY, C.line, 14);
    game.draw.line(CX - LOG_LEN, CY, CX + LOG_LEN, CY, C.lineDim, 30);
    game.draw.circle(CX - LOG_LEN, CY, 60, C.lineDim);
    game.draw.circle(CX - LOG_LEN, CY, 40, C.line, 0.5);
    game.draw.circle(CX + LOG_LEN, CY, 60, C.lineDim);
    game.draw.circle(CX + LOG_LEN, CY, 40, C.line, 0.5);
    if (!logCut && dirNow) {
      var v = VEC[dirNow];
      var ax = CX + v.x * 90, ay = CY + v.y * 90;
      if (!tOn || Math.floor(game.time.elapsed * 9) % 2 === 0) {
        game.draw.line(CX - v.x * 90, CY - v.y * 90, ax, ay, C.arrow, 10);
        game.draw.circle(ax, ay, 18, C.arrow);
      }
    }
    if (logCut) {
      game.draw.line(CX - LOG_LEN, CY - 30, CX + LOG_LEN, CY - 30, C.good, 8);
      game.draw.line(CX - LOG_LEN, CY + 30, CX + LOG_LEN, CY + 30, C.good, 8);
    }
  }

  function newRound() {
    dir = DIRS[Math.floor(game.random(0, DIRS.length))];
    cutDur = Math.max(1.1, 1.9 - round * 0.13);
    roundT = 0; resolved = false; telegraphOn = true;
  }

  function initGame() {
    cut = 0; round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newRound();
  }

  function resolveCut(swipeDir) {
    if (resolved || ready > 0 || done || finished) return;
    resolved = true;
    var correct = swipeDir === dir;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      cut++;
      game.feedback.good(CX, CY, { text: cut + '/' + TOTAL, color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_break', 0.4);
      if (!milestoneShown && cut >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 180, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (cut >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    newRound();
  }

  game.onSwipe(function(swipeDir) {
    if (state !== S.PLAYING) return;
    resolveCut(swipeDir);
  });

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

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLog(demo.cutShown, dir, telegraphOn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.line);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.line);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLog(ok, dir, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cut + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cut) + '本!', W / 2, H * 0.17, 24, C.line);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.line);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cut, { cut: cut, total: TOTAL }); else game.end.failure({ cut: cut, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT > cutDur * 0.35) telegraphOn = false;
      if (roundT >= cutDur && !resolved) {
        resolved = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLog(false, dir, telegraphOn);

    txt(cut + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.line);
    game.draw.rect(60, 150, W - 120, 12, C.lineDim, 0.6);
    game.draw.rect(60, 150, (W - 120) * (cut / TOTAL), 12, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, cutShown: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.cutShown = false; }
    telegraphOn = cyc < 0.6;
    if (cyc > 0.6 && cyc < 0.8 && !demo.cutShown) {
      demo.cutShown = true;
      var v = VEC[dir];
      demo.gx = CX + v.x * 220; demo.gy = CY + v.y * 220;
      demo.press = true;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (cyc >= 2.2) { demo.press = false; }
  }

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['G3', 0.2], ['B3', 0.2], ['E4', 0.4]], { tempo: 140, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
