// D-20172021-0022-tincture-decant-line.js
// ティンクチャー・デキャントライン — 混ざった香油を注ぎ皿の目印いっぱいまで注ぎ、澄んだ色だけを瓶に残す
// 操作: 画面下を押し続けると瓶から香油が注ぎ皿に流れる。目印の線でぴったり指を離して止める
// 終わり: 3本とも目印の許容範囲内で止めれば成功。早すぎ/注ぎすぎ(線を越える)で失敗
// @mechanic: hold_charge
// @theme: tincture_decant_line
// 世界観: 香水工房の見習い調香師が、濁った香油の上澄みだけを注ぎ皿の目印いっぱいまで丁寧に注ぎ、瓶に澄んだ一色だけを残す
// 残るもの: 正誤(CLEAR/GAME OVER) + 澄ませた瓶の本数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var C = {
    bg: '#ffe9f2', bg2: '#ffd6e8', glass: '#ffffff', glassEdge: '#e3b8cf',
    dish: '#fff3f8', dishEdge: '#e3b8cf', mark: '#ff8fc0',
    good: '#4ad18f', bad: '#ff5d78', gold: '#ffb64a', ink: '#5a3048',
  };
  var TOP_COLORS = ['#b08cff', '#7ac8ff', '#ff9a6a'];
  var BASE_COLORS = ['#ffe38a', '#8affc4', '#ffb0e0'];

  var GAME_TITLE = 'DECANT LINE';
  var TIME_LIMIT = 14;
  var NEEDED = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#3a1c2c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOTTLE_SPRITE = ['.##.', '####', '####', '####'];

  var BOTTLE_X = W * 0.32, BOTTLE_Y = H * 0.42, BOTTLE_W = 200, BOTTLE_H = 360;
  var DISH_X = W * 0.68, DISH_Y = H * 0.55, DISH_W = 260, DISH_H = 220;

  var round, targetFrac, pouredFrac, phase, wasPressing, done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled, roundTimer;
  var ROUND_TIMEOUT = 3.5;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function newRound() {
    targetFrac = 0.35 + Math.random() * 0.4;
    pouredFrac = 0;
    phase = 'top'; // 'top' = contaminant draining, 'base' = pure liquid overflow
    roundTimer = ROUND_TIMEOUT;
  }

  function drawScene() {
    var topCol = TOP_COLORS[round % TOP_COLORS.length];
    var baseCol = BASE_COLORS[round % BASE_COLORS.length];

    // source bottle: remaining top-layer shrinks as it pours
    game.draw.rect(BOTTLE_X - BOTTLE_W / 2, BOTTLE_Y - BOTTLE_H / 2, BOTTLE_W, BOTTLE_H, C.glassEdge);
    game.draw.rect(BOTTLE_X - BOTTLE_W / 2 + 8, BOTTLE_Y - BOTTLE_H / 2 + 8, BOTTLE_W - 16, BOTTLE_H - 16, C.glass);
    var remTop = Math.max(0, targetFrac - pouredFrac);
    var topH = remTop * BOTTLE_H * 0.9;
    game.draw.rect(BOTTLE_X - BOTTLE_W / 2 + 8, BOTTLE_Y - BOTTLE_H / 2 + 8, BOTTLE_W - 16, topH, topCol);
    game.draw.rect(BOTTLE_X - BOTTLE_W / 2 + 8, BOTTLE_Y - BOTTLE_H / 2 + 8 + topH, BOTTLE_W - 16, BOTTLE_H * 0.9 - topH, baseCol);
    var capBob = Math.sin(game.time.elapsed * 2.6) * 5;
    game.draw.sprite(BOTTLE_SPRITE, { '#': C.glassEdge }, BOTTLE_X + capBob, BOTTLE_Y - BOTTLE_H / 2 - 30, 8, { anchor: 'center' });

    // dish
    game.draw.rect(DISH_X - DISH_W / 2, DISH_Y - DISH_H / 2, DISH_W, DISH_H, C.dishEdge);
    game.draw.rect(DISH_X - DISH_W / 2 + 8, DISH_Y - DISH_H / 2 + 8, DISH_W - 16, DISH_H - 16, C.dish);
    var fillH = Math.min(1, pouredFrac / targetFrac) * (DISH_H - 16);
    var fillCol = phase === 'base' ? baseCol : topCol;
    game.draw.rect(DISH_X - DISH_W / 2 + 8, DISH_Y + DISH_H / 2 - 8 - fillH, DISH_W - 16, fillH, fillCol);
    var lineY = DISH_Y + DISH_H / 2 - 8 - (DISH_H - 16);
    game.draw.line(DISH_X - DISH_W / 2, lineY, DISH_X + DISH_W / 2, lineY, C.mark, 6);
  }

  function initGame() {
    round = 0; halfCalled = false;
    newRound();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT; wasPressing = false;
  }

  var POUR_RATE = 0.55; // fraction of target per second while overpouring reference

  function updatePour(dt) {
    if (ready > 0 || finished) return;
    var pressing = game.input.pressing;
    if (pressing && !wasPressing) game.audio.play('se_tap', 0.1);
    if (pressing) {
      pouredFrac += dt * (targetFrac / 1.1);
      if (pouredFrac > targetFrac && phase === 'top') {
        phase = 'base';
      }
      if (phase === 'base' && pouredFrac > targetFrac * 1.18) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(DISH_X, DISH_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    } else if (wasPressing) {
      // released
      var tol = targetFrac * 0.14;
      if (Math.abs(pouredFrac - targetFrac) <= tol && phase === 'top') {
        round++;
        game.feedback.good(DISH_X, DISH_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_powerup', 0.35);
        if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
          halfCalled = true;
          game.fx.popup('NICE', DISH_X, DISH_Y - 160, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.3);
        }
        if (round >= NEEDED) {
          finished = true; ok = true; hitStop = 0.3;
          game.feedback.good(DISH_X, DISH_Y, { text: 'CLEAR', color: C.good });
          game.fx.burst(DISH_X, DISH_Y, { color: C.gold, count: 22, speed: 400 });
          game.audio.play('se_success', 0.5);
          finish();
        } else {
          newRound();
        }
      } else {
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(DISH_X, DISH_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    wasPressing = pressing;
  }

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

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, resolved: false };
  function resetDemo() { initGame(); demo.resolved = false; }
  var DEMO_CYCLE = 1.6, DEMO_POUR = 1.05;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < DEMO_POUR) {
      demo.gx = DISH_X; demo.gy = H * 0.86;
      demo.press = true;
      pouredFrac = (cyc / DEMO_POUR) * targetFrac;
    } else {
      // ゆっくり円を描いて次のポーズへ戻る(常時わずかに動かし続ける = attract死角対策)
      var t2 = (cyc - DEMO_POUR) / (DEMO_CYCLE - DEMO_POUR);
      demo.gx = DISH_X + Math.cos(t2 * Math.PI * 2) * 26;
      demo.gy = H * 0.86 + Math.sin(t2 * Math.PI * 2) * 18;
      demo.press = false;
      if (!demo.resolved) {
        demo.resolved = true;
        round++;
        game.feedback.good(DISH_X, DISH_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.25);
        if (round < NEEDED) newRound(); else { round = 0; }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetFrac === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(round + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - round) + '本!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { bottles: round, total: NEEDED });
        else game.end.failure({ bottles: round, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      updatePour(dt);
      if (!finished) {
        roundTimer -= dt;
        if (roundTimer <= 0) {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(DISH_X, DISH_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(DISH_X, DISH_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(round + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.dishEdge, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.5]], { tempo: 110, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
