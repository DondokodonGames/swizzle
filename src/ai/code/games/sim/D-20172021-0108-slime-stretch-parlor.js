// D-20172021-0108-slime-stretch-parlor.js
// スライム・ストレッチパーラー — ぷにぷにのスライムを指定の時間ぴったり伸ばし続けて離す感触遊び
// 操作: スライムを指で押さえて伸ばし、表示される目標の長さになるタイミングでぴったり指を離す
// 終わり: 3回中2回以上ぴったり離せれば成功。届かなければ失敗
// @mechanic: hold_duration
// @theme: slime_stretch_parlor
// 世界観: 感触遊びの屋台に置かれたぷにぷにスライムを、目標の伸び具合になる瞬間を狙ってぴったり離す遊戯
// 残るもの: 正誤(CLEAR/GAME OVER) + ぴったり離せた回数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: くすみビビッド配色(紫/オレンジ/シアン)、ソフトグロー
  var C = {
    bg: '#2a1840', bg2: '#140a24', stand: '#4a2a68', standDark: '#2a1648',
    slime: '#7fffd0', slimeDark: '#2fcf9a', ring: '#ff9f3a', ringHit: '#ffe14d',
    good: '#7fffb0', bad: '#ff4d5e', gold: '#ffe14d', white: '#fff6ff', ink: '#160820',
  };

  var GAME_TITLE = 'SLIME STRETCH';
  var CX = W * 0.5, CY = H * 0.52;
  var ROUNDS = 3;
  var NEED_GOOD = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0c0616', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VENDOR_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.ring, pulse * 0.12);
    game.draw.rect(0, H * 0.62, W, H * 0.14, C.stand);
  }

  var roundIdx, targetDur, holding, holdT, results, judgeText, judgeT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newRound() {
    targetDur = 0.8 + Math.random() * 0.8;
    holding = false; holdT = 0;
  }

  function initGame() {
    roundIdx = 0; results = []; judgeText = ''; judgeT = 0; milestoneShown = false;
    newRound();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveRelease() {
    var err = Math.abs(holdT - targetDur);
    var res;
    if (err < 0.12) res = 2;
    else if (err < 0.32) res = 1;
    else res = 0;
    results.push(res);
    judgeText = res === 2 ? 'PERFECT' : res === 1 ? 'GOOD' : 'MISS';
    judgeT = 0.6;
    if (res > 0) {
      game.feedback.good(CX, CY, { text: judgeText, color: res === 2 ? C.gold : C.good });
      game.audio.play('se_good', 0.4);
    } else {
      hitStop = 0.24; shake = 0.2;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
    if (roundIdx === 0 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('NICE', W / 2, CY - 260, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    roundIdx++;
    if (roundIdx >= ROUNDS) {
      var goods = results.filter(function(r) { return r > 0; }).length;
      ok = goods >= NEED_GOOD; finished = true; hitStop = Math.max(hitStop, 0.22);
      if (ok) { game.fx.burst(CX, CY, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); }
      else game.audio.play('se_failure', 0.4);
      finish();
    } else {
      newRound();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holding = true; holdT = 0;
    game.audio.play('se_tap', 0.1);
  });
  game.onUpdate(function(dt) {
    if (state === S.PLAYING && holding && !finished && ready <= 0) holdT += dt;
  });
  game.onRelease(function() {
    if (!holding || state !== S.PLAYING || finished || ready > 0) { holding = false; return; }
    holding = false;
    resolveRelease();
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

  function drawScene(hT, tDur, hd) {
    var stretch = Math.min(1.6, hT / Math.max(0.2, tDur));
    var rx = 90 + stretch * 70, ry = 90 - stretch * 22;
    var wob = Math.sin(game.time.elapsed * 10) * (hd ? 4 : 8);
    game.draw.circle(CX, CY + wob, ry, C.slimeDark);
    game.draw.circle(CX, CY + wob, ry * 0.85, C.slime);
    game.draw.circle(CX - rx * 0.5, CY + wob, ry * 0.7, C.slime, 0.7);
    game.draw.circle(CX + rx * 0.5, CY + wob, ry * 0.7, C.slime, 0.7);
    var ringR = 200;
    game.draw.circle(CX, CY, ringR, C.ring, 0.15);
    var targetAngle = -Math.PI / 2 + (tDur / 1.8) * Math.PI * 2;
    var curAngle = -Math.PI / 2 + (Math.min(hT, tDur * 1.6) / 1.8) * Math.PI * 2;
    game.draw.circle(CX + Math.cos(targetAngle) * ringR, CY + Math.sin(targetAngle) * ringR, 14, C.ringHit);
    if (hd) game.draw.circle(CX + Math.cos(curAngle) * ringR, CY + Math.sin(curAngle) * ringR, 10, C.white);
    var vf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(VENDOR_F[vf], { '#': C.white }, W * 0.16, H * 0.18, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, phase: 0 };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    if (!holding) { holding = true; holdT = 0; }
    holdT += dt;
    demo.press = true;
    if (holdT >= targetDur) {
      holding = false;
      resolveRelease();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundIdx === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(holdT, targetDur, holding);
      game.draw.hand(CX, CY + 90, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.14, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.18, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(0, targetDur, false);
      var goods = results.filter(function(r) { return r > 0; }).length;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14, 44, ok ? C.good : C.bad);
      txt(goods + ' / ' + ROUNDS, W / 2, H * 0.19, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.23, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var goods2 = results.filter(function(r) { return r > 0; }).length;
        if (ok) game.end.success(goods2, { goods: goods2, rounds: ROUNDS });
        else game.end.failure({ goods: goods2, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;
    if (judgeT > 0) judgeT -= dt;

    bg();
    drawScene(holdT, targetDur, holding);

    txt(roundIdx + ' / ' + ROUNDS, W / 2, H * 0.08, 28, C.white);
    if (judgeT > 0) txt(judgeText, W / 2, H * 0.28, 40, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.6]], { tempo: 108, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
