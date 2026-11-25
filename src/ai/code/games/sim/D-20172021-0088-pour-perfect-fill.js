// D-20172021-0088-pour-perfect-fill.js
// ポア・パーフェクトフィル — グラスを指で押し続けて水を注ぎ、縁のラインでぴったり止めて離す
// 操作: グラスの上で指を押し続けている間だけ水位が上がる。狙いのラインに来たら指を離して止める
// 終わり: 規定杯数を溢れさせず/不足させずぴったり注げば成功。1杯でも溢れる/大きく不足すれば失敗
// @mechanic: hold_duration
// @theme: kiosk_perfect_pour
// 世界観: 屋台の飲み物スタンドを任された見習い店員が、注文の杯を次々受け、狙いの線ちょうどまで水位を止めて完璧な一杯を出し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + ぴったり注げた杯数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色+濃淡2段の疑似ボリューム、太い輪郭は使わずグラデ立体感
  var C = {
    bg: '#bfe7ff', bg2: '#8fd0f2', glass: '#e8f7ff', glassEdge: '#9fd6ee',
    water: '#2fa8ff', waterDark: '#1c7fd0', target: '#ffce4a',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffce4a', ink: '#0a2a3a', white: '#ffffff',
  };

  var GAME_TITLE = 'PERFECT POUR';
  var TOTAL = 3;
  var TIME_LIMIT = 14;
  var GX = W * 0.5, GY = H * 0.5, GW = 260, GH = 420;
  var TOP_Y = GY - GH / 2, BOT_Y = GY + GH / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLERK_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    game.draw.sprite(CLERK_SPRITE, { '#': C.waterDark }, W * 0.16, H * 0.84, 12, { anchor: 'center' });
  }

  var fill, targetMin, targetMax, pouring, round, done, endWait, finished, ready, hitStop, shake, roundClock;

  function newTarget() {
    var min = 0.86 + game.random(0, 0.03);
    return { min: min, max: 1.0 };
  }

  function initGame() {
    fill = 0; pouring = false; round = 0;
    var t = newTarget(); targetMin = t.min; targetMax = t.max;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; roundClock = 0;
  }

  function drawGlass(f, showBand) {
    game.draw.rect(GX - GW / 2 - 8, TOP_Y - 8, GW + 16, GH + 16, C.glassEdge, 0.5);
    game.draw.rect(GX - GW / 2, TOP_Y, GW, GH, C.glass, 0.9);
    var waterH = GH * Math.max(0, Math.min(1, f));
    game.draw.rect(GX - GW / 2, BOT_Y - waterH, GW, waterH, C.water, 0.9);
    game.draw.rect(GX - GW / 2, BOT_Y - waterH, GW, 10, C.waterDark, 0.7);
    if (showBand) {
      var bandTopY = BOT_Y - GH * targetMax;
      var bandBotY = BOT_Y - GH * targetMin;
      var blink = 0.4 + 0.3 * Math.sin(game.time.elapsed * 6);
      game.draw.rect(GX - GW / 2 - 14, bandTopY, GW + 28, bandBotY - bandTopY, C.target, blink);
    }
    if (f > 0.92) {
      var warnBlink = Math.floor(game.time.elapsed * 8) % 2 === 0;
      if (warnBlink) game.draw.rect(GX - GW / 2 - 14, TOP_Y - 6, GW + 28, 10, C.bad, 0.8);
    }
  }

  function resolvePour(x, y) {
    if (fill >= targetMin && fill <= targetMax) {
      round++;
      game.feedback.good(x, y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.3);
      if (round === Math.ceil(TOTAL / 2)) game.fx.popup('あと' + (TOTAL - round) + '!', GX, TOP_Y - 60, { color: C.gold, size: 32 });
      if (round >= TOTAL) {
        ok = true; finished = true; hitStop = 0.2;
        game.fx.burst(GX, GY, { color: C.gold, count: 22, speed: 400 });
        finish();
        return;
      }
      fill = 0; var t = newTarget(); targetMin = t.min; targetMax = t.max;
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x, y, { text: fill > targetMax ? 'あふれた!' : 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (!game.hit.rect(x, y, 1, 1, GX - GW / 2 - 40, TOP_Y - 40, GW + 80, GH + 80)) return;
    pouring = true;
    game.audio.play('se_tap', 0.12);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !pouring) return;
    pouring = false;
    resolvePour(GX, BOT_Y - GH * Math.max(0, Math.min(1, fill)));
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: GX, gy: BOT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) initGame();
    if (cyc < 1.9) {
      pouring = true;
      fill = Math.min(1.05, (cyc / 1.9) * (targetMin + 0.02));
      demo.gy = BOT_Y - GH * fill;
      demo.press = true;
    } else if (cyc < 2.05) {
      if (pouring) {
        pouring = false;
        game.feedback.good(GX, demo.gy, { text: 'NICE', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      demo.press = false;
    } else {
      demo.press = false;
    }
    demo.gx = GX;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fill === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGlass(fill, true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.waterDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGlass(fill, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - round) + '杯!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { cups: round, total: TOTAL });
        else game.end.failure({ cups: round, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (pouring) {
        fill += dt * 0.62;
        if (fill > 1.08) {
          pouring = false;
          ok = false; finished = true; hitStop = 0.35; shake = 0.3;
          game.feedback.bad(GX, TOP_Y, { text: 'あふれた!' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(GX, GY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGlass(fill, !finished);

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#0a2a3a', 0.2);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.6]], { tempo: 116, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
