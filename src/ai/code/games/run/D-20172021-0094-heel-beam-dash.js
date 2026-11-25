// D-20172021-0094-heel-beam-dash.js
// ヒール・ビーム・ダッシュ — 突風にあおられる細い梁の上をハイヒールで走り抜け、左右タップで重心を保つ
// 操作: 画面下の左右ゾーンをタップして重心を戻す。予告の風向き矢印が出たら早めに逆側をタップして備える
// 終わり: 梁の端まで踏み外さずに走りきれば成功。左右どちらかへ重心が振り切れて落下する/時間切れで失敗
// @mechanic: balance
// @theme: highrise_beam_heel_dash
// 世界観: 高層建築の足場を任されたモデル見習いが、突風にあおられる細い鉄梁の上をハイヒールのまま重心を保って端まで走り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破した距離
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺背景に発光ライン、マゼンタ/シアンの強アクセント
  var C = {
    bg: '#0a0620', bg2: '#160c30', beam: '#3a2a70', beamEdge: '#ff2ad1',
    runner: '#2adfff', runnerDark: '#0d8aa0', gust: '#ffe14d',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffe14d', ink: '#05030f', white: '#eaf6ff',
  };

  var GAME_TITLE = 'BEAM DASH';
  var COURSE_TIME = 18;
  var BEAM_Y = H * 0.42, BEAM_HALF_W = W * 0.28;
  var LEFT_ZONE = { x: 0, y: H * 0.72, w: W * 0.5, h: H * 0.26 };
  var RIGHT_ZONE = { x: W * 0.5, y: H * 0.72, w: W * 0.5, h: H * 0.26 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPRITE = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff2ad1', pulse * 0.35);
    for (var i = 0; i < 5; i++) {
      var yy = H * 0.06 + i * H * 0.06;
      game.draw.line(0, yy, W, yy, '#2adfff', 2, 0.05 + 0.03 * Math.sin(game.time.elapsed * 1.4 + i));
    }
  }

  var tilt, tiltVel, dist, gustTimer, gustWarn, gustDir, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    tilt = 0; tiltVel = 0; dist = 0;
    gustTimer = 2.2; gustWarn = 0; gustDir = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawBeam() {
    game.draw.rect(W * 0.5 - BEAM_HALF_W - 20, BEAM_Y - 16, (BEAM_HALF_W + 20) * 2, 32, C.beamEdge, 0.5);
    game.draw.rect(W * 0.5 - BEAM_HALF_W, BEAM_Y - 8, BEAM_HALF_W * 2, 16, C.beam, 1);
    if (gustWarn > 0) {
      var ax = gustDir > 0 ? W * 0.82 : W * 0.18;
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(ax, BEAM_Y - 90, 30, C.gust, 0.8);
    }
  }

  function drawRunner() {
    var rx = W * 0.5 + tilt * BEAM_HALF_W;
    var bob = Math.sin(game.time.elapsed * 8) * 5;
    var fallY = finished && !ok ? Math.min(200, hitStop >= 0 ? (0.3 - hitStop) * 700 : 0) : 0;
    game.draw.circle(rx, BEAM_Y - 30 + fallY, 36, C.runnerDark, 0.4);
    game.draw.sprite(RUNNER_SPRITE, { '#': C.runner }, rx, BEAM_Y - 60 + bob + fallY, 18, { anchor: 'center' });
  }

  function drawGauge() {
    var gx = W * 0.5, gy = H * 0.62, gw = W * 0.6;
    game.draw.rect(gx - gw / 2, gy - 10, gw, 20, '#160c30', 0.8);
    game.draw.rect(gx - gw / 2, gy - 10, gw, 4, C.beamEdge, 0.5);
    game.draw.circle(gx + tilt * gw / 2, gy, 16, Math.abs(tilt) > 0.75 ? C.bad : C.gold, 1);
  }

  function failFall() {
    ok = false; finished = true; hitStop = 0.3; shake = 0.3;
    game.feedback.bad(W * 0.5 + tilt * BEAM_HALF_W, BEAM_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (y < LEFT_ZONE.y) { game.audio.play('se_tap', 0.05); return; }
    if (x < W * 0.5) { tiltVel -= 0.9; game.audio.play('se_tap', 0.15); }
    else { tiltVel += 0.9; game.audio.play('se_tap', 0.15); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickPhysics(dt) {
    gustTimer -= dt;
    if (gustTimer <= 0.6 && gustWarn <= 0 && gustTimer > 0) {
      gustWarn = 0.6;
      gustDir = Math.random() < 0.5 ? -1 : 1;
    }
    if (gustTimer <= 0) {
      tiltVel += gustDir * 1.1;
      game.audio.play('se_tap', 0.1);
      gustTimer = 2.0 + game.random(0, 1.4);
      gustWarn = 0;
    }
    if (gustWarn > 0) gustWarn -= dt;
    tiltVel *= Math.max(0, 1 - 0.6 * dt);
    tilt += tiltVel * dt;
    tilt = Math.max(-1.3, Math.min(1.3, tilt));
    dist += dt / COURSE_TIME;
    if (!halfCalled && dist >= 0.5) { halfCalled = true; game.fx.popup('HALFWAY!', W * 0.5, BEAM_Y - 150, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    if (Math.abs(tilt) >= 1.0) { failFall(); return; }
    if (dist >= 1) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(W * 0.5 + tilt * BEAM_HALF_W, BEAM_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5 + tilt * BEAM_HALF_W, BEAM_Y, { color: C.gold, count: 22, speed: 400 });
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) initGame();
    tickPhysics(dt);
    var wantLeft = tilt > 0.08;
    var wantRight = tilt < -0.08;
    if (wantLeft) { tiltVel -= 0.9 * dt * 6; demo.gx = W * 0.25; demo.press = true; }
    else if (wantRight) { tiltVel += 0.9 * dt * 6; demo.gx = W * 0.75; demo.press = true; }
    else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBeam();
      drawRunner();
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBeam();
      drawRunner();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(Math.round(Math.min(1, dist) * 100) + '%', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(Math.min(1, dist) * 100);
        if (ok) game.end.success(pct, { distancePct: pct });
        else game.end.failure({ distancePct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickPhysics(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBeam();
    drawRunner();
    drawGauge();

    txt(Math.round(Math.min(1, dist) * 100) + '%', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, dist), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['Eb4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 138, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
