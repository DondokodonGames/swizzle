// J-N6424-0037-tabletop-rail-throttle.js
// テーブルトップ・レールスロットル — 卓上模型レールのミニカーを、カーブごとに指を押し続ける長さで速度調整する
// 操作: コントローラーを指で押し続け、ゲージが緑の帯に来たら離してカーブを駆け抜ける
// 終わり: 規定数(4か所)のカーブを緑の帯で抜ければ成功。帯を外せば脱線して失敗
// @mechanic: hold_duration
// @theme: tabletop_railcar_throttle_control
// 世界観: 卓上模型レールの愛好家が、コントローラーを正確な長さで握り込んでミニカーの速度を作り、各コーナーを脱線せず駆け抜けさせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けたコーナー数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目と金属質のリアルなコントローラー、立体感のあるグラデ帯
  var C = {
    bg: '#3a2c1e', bg2: '#241a10', rail: '#8a8a90', railDark: '#4a4a50',
    car: '#d0302a', good: '#39d67a', bad: '#ff4d5e', gold: '#ffd400',
    dial: '#c9a15a', dialDark: '#8a6a34', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'RAIL THROTTLE';
  var NEED_CORNERS = 4;
  var CTRL_X = W * 0.5, CTRL_Y = H * 0.82, CTRL_R = 140;
  var TRACK_Y = H * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR = ['####', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.5);
    game.draw.rect(0, TRACK_Y - 20, W, 40, C.railDark);
  }

  var pressing, holdT, target, tol, cleared, carX, idleT;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newTarget() {
    return { center: 0.6 + Math.random() * 0.9, };
  }

  function initGame() {
    pressing = false; holdT = 0; target = newTarget(); tol = 0.18; cleared = 0; carX = 90; idleT = 3.2;
    halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    game.draw.circle(carX, TRACK_Y, 20, C.car);
    game.draw.sprite(CAR, { '#': '#ffffff' }, carX, TRACK_Y, 6, { anchor: 'center', alpha: 0.7 });
    game.draw.circle(CTRL_X, CTRL_Y, CTRL_R, C.dialDark);
    game.draw.circle(CTRL_X, CTRL_Y, CTRL_R - 16, C.dial);
    // gauge ring drawn as arc-approx via strip of rects along a bar instead (no rotation allowed)
    var gw = 560;
    var gx = W * 0.5 - gw / 2, gy = H * 0.5;
    game.draw.rect(gx, gy - 16, gw, 32, '#000000', 0.35);
    var loT = Math.max(0, target.center - tol), hiT = Math.min(2.2, target.center + tol);
    game.draw.rect(gx + (loT / 2.2) * gw, gy - 16, ((hiT - loT) / 2.2) * gw, 32, C.good, 0.7);
    var markX = gx + Math.min(1, holdT / 2.2) * gw;
    game.draw.circle(markX, gy, 20, pressing ? C.gold : '#ffffff');
  }

  function resolveRelease() {
    if (finished || ready > 0) return;
    var inBand = holdT >= target.center - tol && holdT <= target.center + tol;
    if (inBand) {
      cleared++;
      game.feedback.good(CTRL_X, CTRL_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(W * 0.5, TRACK_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_powerup', 0.4);
      carX = Math.min(W - 90, carX + (W - 180) / NEED_CORNERS);
      if (!halfCalled && cleared === Math.ceil(NEED_CORNERS / 2)) { halfCalled = true; game.fx.popup('NICE', W * 0.5, H * 0.24, { color: C.gold, size: 32 }); }
      if (cleared >= NEED_CORNERS) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(carX, TRACK_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        target = newTarget(); idleT = 3.2;
      }
    } else {
      finished = true; ok = false; hitStop = 0.4; shake = 0.3;
      game.feedback.bad(carX, TRACK_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.5);
      finish();
    }
    pressing = false; holdT = 0;
  }

  game.onHold(function(x, y, duration) {
    if (state !== S.PLAYING) return;
    // engine reports discrete 400ms hold pulses; used as a secondary confirm cue
    if (!finished && ready <= 0) game.audio.play('se_tap', 0.06);
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    if (Math.hypot(x - CTRL_X, y - CTRL_Y) < CTRL_R + 40) {
      pressing = true; holdT = 0;
      game.audio.play('se_tap', 0.15);
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
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

  function stepPlay(dt) {
    if (pressing) {
      holdT += dt;
      if (holdT > 2.2) { pressing = false; resolveRelease(); }
    } else {
      idleT -= dt;
      if (idleT <= 0) {
        // stuck-safety: no press started in time, treat as a stalled attempt
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(carX, TRACK_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
  }

  var demo = { t: 0, gx: CTRL_X, gy: CTRL_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = cyc % 1.25;
    demo.gx = CTRL_X; demo.gy = CTRL_Y;
    if (seg < 0.05 && !pressing) { pressing = true; holdT = 0; }
    if (pressing) {
      demo.press = true;
      holdT += dt;
      if (holdT >= target.center) { pressing = false; resolveRelease(); }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (target === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEED_CORNERS, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_CORNERS - cleared) + 'コーナー!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, need: NEED_CORNERS });
        else game.end.failure({ cleared: cleared, need: NEED_CORNERS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(cleared + ' / ' + NEED_CORNERS, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.22, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
