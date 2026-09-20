// I-DS-0019-ice-lane-flick.js
// アイスレーン・フリック — 木箱盤の上で、指ではじいたどんぐりコマを的の輪の中まで滑らせる
// 操作: コマを指で軽くはじく。はじく強さと向きでコマの飛ぶ距離と横のずれが決まる
// 終わり: 規定回数(3回)続けて的の輪の中に止められれば成功。輪を外せば失敗
// @mechanic: flick_launch
// @theme: tabletop_ice_lane_curling
// 世界観: 木箱の上のミニアイスレーン。リス顔の遊び人がどんぐりコマを弾いて的の輪を狙う卓上遊戯
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪に止められた回数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド床、6〜8色、影で高さを示す
  var C = {
    bg: '#101830', laneA: '#1c2c50', laneB: '#223460', laneEdge: '#0a1024',
    puck: '#c98a3a', ring: '#ffd23a', ringOut: '#3ac3ff',
    good: '#3fd17a', bad: '#ff5570', gold: '#ffd23a', white: '#eef2ff', ink: '#050810',
  };

  var GAME_TITLE = 'LANE FLICK';
  var MAX_TIME = 15;
  var ROUNDS = 3;
  var START_X = W * 0.5, START_Y = H * 0.80;
  var LANE_TOP = H * 0.20, LANE_BOT = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, target, puck, launched, resolved, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;
  var pressX, pressY, pressT, trailX, trailY, trailT, charging;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SQUIRREL = ['.####.', '######', '#.##.#', '######', '.#..#.'];

  function newTarget() {
    var ringR = 130 - round * 20;
    target = { x: W * 0.5 + game.random(-160, 160), y: LANE_TOP + game.random(0, 90), r: Math.max(60, ringR) };
  }

  function resetPuck() {
    puck = { x: START_X, y: START_Y, vx: 0, vy: 0, moving: false };
    launched = false; resolved = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, '#0a1020'], [1, C.bg]]);
    var rows = 10;
    for (var r = 0; r < rows; r++) {
      var y = LANE_TOP + (LANE_BOT - LANE_TOP) * (r / rows);
      game.draw.rect(W * 0.14, y, W * 0.72, (LANE_BOT - LANE_TOP) / rows, r % 2 === 0 ? C.laneA : C.laneB, 0.9);
    }
    game.draw.rect(W * 0.14 - 10, LANE_TOP - 10, W * 0.72 + 20, LANE_BOT - LANE_TOP + 20, C.laneEdge, 0);
  }

  function drawTarget() {
    game.draw.circle(target.x, target.y + 10, target.r + 26, C.ink, 0.25);
    game.draw.circle(target.x, target.y, target.r, C.ringOut, 0.85);
    game.draw.circle(target.x, target.y, target.r * 0.55, C.ring);
  }

  function drawPuck() {
    game.draw.circle(puck.x, puck.y + 8, 26, C.ink, 0.3);
    game.draw.circle(puck.x, puck.y, 24, C.puck);
  }

  function initGame() {
    round = 0; hits = 0; timeLeft = MAX_TIME;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    charging = false;
    newTarget(); resetPuck();
  }

  function launch(vx, vy) {
    var spd = Math.hypot(vx, vy);
    if (spd < 220) { // 弱すぎるはじきは反応しない(でも音は返す)
      game.audio.play('se_tap', 0.15);
      return;
    }
    launched = true;
    puck.vx = vx; puck.vy = vy; puck.moving = true;
    game.audio.play('se_jump', 0.35);
  }

  function resolveLanding() {
    resolved = true;
    var d = Math.hypot(puck.x - target.x, puck.y - target.y);
    if (d <= target.r) {
      hits++;
      hitStop = 0.12;
      game.feedback.good(puck.x, puck.y, { text: 'NICE', color: C.good });
      game.fx.burst(puck.x, puck.y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (hits === 1) { game.fx.popup('50%', W / 2, H * 0.15, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      if (hits >= ROUNDS) { ok = true; finished = true; hitStop = 0.18; game.audio.play('se_success', 0.5); finish(); return; }
      round++;
      newTarget(); resetPuck();
    } else {
      hitStop = 0.35;
      game.feedback.bad(puck.x, puck.y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished || launched) return;
    if (Math.hypot(x - puck.x, y - puck.y) > 90) return;
    pressX = x; pressY = y; pressT = game.time.elapsed;
    trailX = x; trailY = y; trailT = pressT;
    charging = true;
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (!charging) return;
    trailX = x; trailY = y; trailT = game.time.elapsed;
  });
  game.onRelease(function(x, y) {
    if (!charging) return;
    charging = false;
    var dt = Math.max(0.03, game.time.elapsed - trailT + 0.03);
    var vx = (x - pressX) * 2.4;
    var vy = (y - pressY) * 2.4;
    launch(vx, vy);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.2;
  }

  var demo = { t: 0, gx: START_X, gy: START_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { round = round || 0; newTarget(); resetPuck(); }
    if (cyc < 0.9) {
      demo.press = true;
      demo.gx = START_X; demo.gy = START_Y - cyc * 40;
    } else if (cyc < 1.0) {
      demo.press = false;
      launch((target.x - START_X) * 2.0, (target.y - START_Y) * 2.0);
    } else if (puck.moving) {
      demo.gx = puck.x; demo.gy = puck.y;
    }
  }

  function updatePuckPhysics(dt) {
    if (!puck.moving) return;
    puck.x += puck.vx * dt; puck.y += puck.vy * dt;
    puck.vx *= 0.92; puck.vy *= 0.92;
    if (puck.x < W * 0.16) { puck.x = W * 0.16; puck.vx *= -0.5; }
    if (puck.x > W * 0.84) { puck.x = W * 0.84; puck.vx *= -0.5; }
    if (Math.hypot(puck.vx, puck.vy) < 12 || puck.y < LANE_TOP - 20) {
      puck.moving = false;
      if (!resolved) resolveLanding();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      updatePuckPhysics(dt);
      drawTarget();
      drawPuck();
      game.draw.sprite(SQUIRREL, { '#': C.puck, '.': null }, W * 0.5, H * 0.92, 12, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTarget();
      drawPuck();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + ROUNDS, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (ROUNDS - hits) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, rounds: ROUNDS }); else game.end.failure({ hits: hits, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updatePuckPhysics(dt);
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false; hitStop = 0.2;
        game.feedback.bad(puck.x, puck.y, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTarget();
    if (!finished) {
      drawPuck();
      game.draw.sprite(SQUIRREL, { '#': C.puck, '.': null }, W * 0.5, H * 0.92, 12, { anchor: 'center' });
      if (charging) game.draw.line(pressX, pressY, trailX, trailY, C.gold, 6);
    }

    txt(hits + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
