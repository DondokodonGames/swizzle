// I-3DS-0003-cannon-charge-release.js
// キャノンチャージリリース — 合図と同時に発射ボタンを押し続け、示された長さでちょうど離して撃つ
// 操作: 合図が出たら指を画面に押し続け、ゲージが示す目標の長さに達した瞬間に指を離して発射する
// 終わり: 3発連続で目標の長さ通りに離せば成功。早すぎ/長すぎで離す、または押し忘れると失敗
// @mechanic: hold_duration
// @theme: harbor_signal_cannon
// 世界観: 霧の港に据えられた合図砲。砲手が合図長の指示どおりに引き金を押し続け、正確な長さで離して合図弾を撃ち上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 規定通りに撃てた発数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、大きいアイコン、飛ぶ数字(+100/COMBO)
  var C = {
    bg: '#0e2a4a', bg2: '#164070', cannon: '#e8e8ec', cannonDark: '#8a8f9c',
    gauge: '#25304a', gaugeFill: '#3dd6ff', gaugeOk: '#3dd67a',
    good: '#3dd67a', bad: '#ff4d5e', gold: '#ffd23f', white: '#ffffff', ink: '#041020',
  };

  var GAME_TITLE = 'CANNON RELEASE';
  var CX = W * 0.5, CY = H * 0.5;
  var ROUNDS = 3;
  var TOL = 0.12; // 秒

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, targetT, holding, holdT, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CANNON = ['..##..', '.####.', '######'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, H * 0.9, 340, '#ffffff08');
  }

  function newTarget(r) {
    var opts = [0.6, 1.1, 0.85, 1.4, 0.4];
    return opts[r % opts.length];
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false; holding = false;
    ready = 0.8; hitStop = 0; shake = 0;
    targetT = newTarget(0); holdT = 0;
  }

  function drawCannon(barrelLen, color) {
    game.draw.sprite(CANNON, { '#': C.cannonDark }, CX, CY + 120, 26, { anchor: 'center' });
    game.draw.line(CX, CY + 100, CX, CY + 100 - barrelLen, color, 46);
    game.draw.circle(CX, CY + 100 - barrelLen, 26, C.gold);
  }

  function evalRelease(x, y) {
    if (done || ready > 0 || finished) return;
    var diff = Math.abs(holdT - targetT);
    if (diff <= TOL) {
      cleared++;
      game.feedback.good(x, y, { text: 'FIRE!', color: C.good });
      game.fx.burst(CX, CY - 140, { color: C.gold, count: 20, speed: 420 });
      game.audio.play('se_jump', 0.4);
      if (cleared === 2) game.fx.popup('あと1発!', CX, CY - 260, { color: C.gold, size: 34 });
      hitStop = 0.12;
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      targetT = newTarget(round); holdT = 0; holding = false;
    } else {
      game.feedback.bad(x, y, { text: diff > 0 && holdT > targetT ? 'TOO LONG' : 'TOO SHORT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    holding = true; holdT = 0;
    game.audio.play('se_tap', 0.06);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding) return;
    holding = false;
    evalRelease(x, y);
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

  var demo = { t: 0, gx: CX, gy: CY + 300, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { holdT = 0; targetT = 0.9; }
    if (cyc < targetT + 0.3) {
      demo.press = cyc < targetT;
      if (demo.press) holdT = cyc;
    } else {
      demo.press = false; holdT = 0;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      var barrelLen0 = 60 + Math.min(220, holdT * 160);
      drawCannon(barrelLen0, C.cannon);
      game.draw.rect(CX - 180, H * 0.78, 360, 28, C.gauge, 1);
      game.draw.rect(CX - 180, H * 0.78, 360 * Math.min(1, targetT / 1.6), 28, C.gaugeOk, 0.5);
      game.draw.rect(CX - 180, H * 0.78, 360 * Math.min(1, holdT / 1.6), 28, C.gaugeFill);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCannon(60, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.15, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '発!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (holding && !finished) {
      holdT += dt;
      if (holdT > targetT + 1.0) {
        game.feedback.bad(CX, CY, { text: 'TOO LONG' });
        shake = 0.3; game.audio.play('se_bad', 0.4); hitStop = 0.3;
        holding = false; ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var barrelLen = 60 + Math.min(220, holdT * 160);
    if (!finished) drawCannon(barrelLen, C.cannon);

    game.draw.rect(CX - 180, H * 0.66, 360, 28, C.gauge, 1);
    game.draw.rect(CX - 180, H * 0.66, 360 * Math.min(1, targetT / 1.6), 28, C.gaugeOk, 0.5);
    game.draw.rect(CX - 180, H * 0.66, 360 * Math.min(1, holdT / 1.6), 28, C.gaugeFill);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['E4', 0.4], ['G4', 0.4], ['C5', 0.8]], { tempo: 110, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
