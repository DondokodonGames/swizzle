// J-N641-0011-windup-runner-dash.js
// ぜんまいランナー・ダッシュ — ぜんまい仕掛けの走者をぎりぎりまで巻き上げてから放ち、規定距離を走らせてタイムを競う
// 操作: 画面を長押ししてぜんまいを巻き上げ、ゲージが黄金帯に入ったところで指を離して走者を放つ
// 終わり: 放った走者が規定距離まで到達すれば成功。巻きすぎてゼンマイが壊れる/距離不足なら失敗
// @mechanic: hold_charge
// @theme: windup_runner_dash
// 世界観: 機械仕掛け工房の見習い職人が、ぜんまい仕掛けの走者を絶妙な力加減で巻き上げて放ち、規定距離を走らせてタイムを競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離とタイム
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン、gradientで厚みを作る質感
  var C = {
    bg: '#5a3a1e', bg2: '#3a2410', felt: '#8a4a2a', feltDark: '#5a2e14',
    gauge: '#c89050', gaugeGlow: '#ffd400', runner: '#d0a060', runnerDark: '#8a5a2a',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#2a1a0a', white: '#fff3e0',
  };

  var GAME_TITLE = 'WINDUP DASH';
  var CHARGE_TIME = 1.6;
  var ZONE_LO = 0.68, ZONE_HI = 0.92;
  var TARGET_DIST = 100;
  var RUN_TIME = 4.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#1a0e04', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_A = ['.##.', '####', '.##.', '#..#'];
  var RUNNER_B = ['.##.', '####', '.##.', '.##.'];

  var phase; // 'charge' | 'run' | 'over'
  var charge, chargeDir, runDist, runSpeed, runClock, halfCalled, broke;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    for (var i = 0; i < 6; i++) {
      game.draw.rect(0, H * 0.15 * i, W, 6, '#000000', 0.06);
    }
  }

  function drawRunner(frameA, x) {
    var bob = phase === 'run' ? Math.abs(Math.sin(game.time.elapsed * 14)) * 10 : 0;
    game.draw.sprite(frameA ? RUNNER_A : RUNNER_B, { '#': C.runner }, x, H * 0.62 - bob, 20, { anchor: 'center' });
  }

  function drawGauge(c) {
    var gx = W * 0.5, gy = H * 0.78, gw = W * 0.7, gh = 46;
    game.draw.rect(gx - gw / 2, gy, gw, gh, C.feltDark);
    game.draw.rect(gx - gw / 2 + ZONE_LO * gw, gy, (ZONE_HI - ZONE_LO) * gw, gh, C.gaugeGlow, 0.5);
    game.draw.rect(gx - gw / 2, gy, gw * Math.min(1, c), gh, C.gauge);
    game.draw.rect(gx - gw / 2 + Math.min(1, c) * gw - 4, gy - 8, 8, gh + 16, C.white);
  }

  function initGame() {
    phase = 'charge';
    charge = 0; chargeDir = 1; runDist = 0; runSpeed = 0; runClock = 0; halfCalled = false; broke = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function startRun(fromCharge) {
    var inZone = fromCharge >= ZONE_LO && fromCharge <= ZONE_HI;
    runSpeed = (TARGET_DIST / RUN_TIME) * (0.55 + fromCharge * (inZone ? 1.05 : 0.75));
    phase = 'run';
    if (inZone) {
      game.feedback.good(W / 2, H * 0.62, { text: 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.3);
      game.fx.popup('NICE', W / 2, H * 0.5, { color: C.gold, size: 32 });
    } else {
      game.audio.play('se_jump', 0.25);
    }
  }

  function pressStart() {
    if (finished || ready > 0 || phase !== 'charge') return;
    game.audio.play('se_tap', 0.06);
  }
  function releaseCharge() {
    if (finished || ready > 0 || phase !== 'charge') return;
    startRun(charge);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); pressStart(); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.03); releaseCharge(); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    if (phase === 'charge') {
      if (cyc < 1.4) { charge = Math.min(1, cyc / CHARGE_TIME); demo.press = true; }
      else if (!finished) { startRun(charge); demo.press = false; }
    } else if (phase === 'run') {
      runClock += dt;
      runDist += runSpeed * dt;
      if (runDist >= TARGET_DIST) { runDist = TARGET_DIST; }
      demo.press = false;
    }
    demo.gx = W * 0.5; demo.gy = H * 0.78;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      bg();
      drawRunner(Math.sin(demo.t * 10) > 0, W * (0.15 + 0.6 * Math.min(1, runDist / TARGET_DIST)));
      drawGauge(charge);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? Math.floor(game.best) + 'm' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRunner(true, W * (0.15 + 0.6 * Math.min(1, runDist / TARGET_DIST)));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(Math.floor(runDist) + 'm' + ' / ' + TARGET_DIST + 'm', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_DIST - Math.floor(runDist)) + 'm!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(runDist), { distance: Math.floor(runDist), time: Number(runClock.toFixed(1)) });
        else game.end.failure({ distance: Math.floor(runDist) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'charge') {
        if (game.input.pressing) {
          charge += (dt / CHARGE_TIME) * chargeDir;
          if (charge >= 1.15) {
            broke = true; ok = false; finished = true; hitStop = 0.4; shake = 0.35;
            game.feedback.bad(W / 2, H * 0.78, { text: 'MISS' });
            game.audio.play('se_break', 0.5);
            finish();
          }
        }
      } else if (phase === 'run') {
        runClock += dt;
        runDist += runSpeed * dt;
        if (!halfCalled && runDist >= TARGET_DIST * 0.5) {
          halfCalled = true;
          game.fx.popup('NICE', W / 2, H * 0.4, { color: C.gold, size: 30 });
          game.audio.play('se_milestone', 0.3);
        }
        if (runDist >= TARGET_DIST) {
          runDist = TARGET_DIST;
          ok = true; finished = true; hitStop = 0.25;
          game.feedback.good(W * 0.8, H * 0.62, { text: 'CLEAR', color: C.good });
          game.fx.burst(W * 0.8, H * 0.62, { color: C.gold, count: 20, speed: 400 });
          game.audio.play('se_success', 0.5);
          finish();
        } else if (runClock >= RUN_TIME) {
          ok = false; finished = true; hitStop = 0.3; shake = 0.2;
          game.feedback.bad(W * (0.15 + 0.6 * (runDist / TARGET_DIST)), H * 0.62, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var runnerX = phase === 'run' ? W * (0.15 + 0.6 * Math.min(1, runDist / TARGET_DIST)) : W * 0.5;
    drawRunner(Math.sin(game.time.elapsed * 12) > 0, runnerX);
    if (phase === 'charge') drawGauge(charge);

    txt(Math.floor(runDist) + 'm' + ' / ' + TARGET_DIST + 'm', W / 2, H * 0.06, 28, C.white);
    var barW = W - 120;
    var pct = Math.min(1, runDist / TARGET_DIST);
    game.draw.rect(60, 150, barW, 16, '#2a1a0a', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
