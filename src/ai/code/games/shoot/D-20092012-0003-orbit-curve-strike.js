// D-20092012-0003-orbit-curve-strike.js
// オービットカーブストライク — 無重力の宙域で探査ドローンを放ち、惑星の重力で軌道を曲げて隠れた標的を撃つ
// 操作: 狙いたい方向の画面をタップ。ドローンはその方向へ飛び出し、惑星の重力に引かれて軌道が曲がる
// 終わり: 3発以内に3つの標的ビーコンを全て撃てば成功。3発使い切って残れば失敗
// @mechanic: aim_shoot
// @theme: gravity_well_probe
// 世界観: 無重力の宙域に浮かぶガス惑星。小さな探査ドローンを放ち、惑星の重力に軌道を巻き付けながら、影に隠れた標的ビーコンを撃ち抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破したビーコン数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似奥行きの同心リング、紫〜青のグラデ、発光アクセント
  var STYLE = {
    bg: ['#160a2c', '#04010c'],
    main: ['#7a4fd6', '#b48cff', '#2a1a4a'],
    accent: ['#3dffe0', '#ffd23d'],
  };
  var C = {
    spaceTop: STYLE.bg[0], spaceBot: STYLE.bg[1],
    planet: STYLE.main[0], planetLight: STYLE.main[1], planetDark: STYLE.main[2],
    beacon: STYLE.accent[1], drone: STYLE.accent[0],
    good: '#3dffe0', bad: '#ff5a5a', gold: '#ffd23d', white: '#ece6ff', ink: '#05020c',
  };

  var GAME_TITLE = 'ORBIT CURVE STRIKE';
  var SHOTS_TOTAL = 3;
  var ANCHOR = { x: W * 0.5, y: H * 0.78 };
  var PLANET = { x: W * 0.5, y: H * 0.44, r: 150 };
  var GRAV = 5.2e7;
  var SPEED = 1000;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE_SPR = ['.#.', '###', '.#.'];
  var BEACON_F = [
    ['.#.', '###', '.#.'],
    ['###', '.#.', '###'],
  ];

  var TARGETS = [
    { x: W * 0.78, y: H * 0.20, r: 70 },
    { x: W * 0.22, y: H * 0.20, r: 70 },
    { x: W * 0.85, y: H * 0.10, r: 75 },
  ];

  var shotIdx, hits, drone, phase, wobbleT, settleT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function targetPos(t) {
    var base = TARGETS[shotIdx] || TARGETS[TARGETS.length - 1];
    return { x: base.x + Math.sin(wobbleT * 1.6) * 15, y: base.y + Math.cos(wobbleT * 1.3) * 12, r: base.r };
  }

  function initGame() {
    shotIdx = 0; hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    drone = null; phase = 'aim'; wobbleT = 0; settleT = 0;
  }

  function fireDrone(tx, ty) {
    if (phase !== 'aim') return;
    var dx = tx - ANCHOR.x, dy = ty - ANCHOR.y;
    var ang = Math.atan2(dx, -dy);
    var vx = Math.sin(ang) * SPEED, vy = -Math.cos(ang) * SPEED;
    drone = { x: ANCHOR.x, y: ANCHOR.y, vx: vx, vy: vy };
    phase = 'flight';
    game.audio.play('se_jump', 0.5);
  }

  function updatePhysics(dt, isDemo) {
    wobbleT += dt;
    if (!drone) return;
    var dx = PLANET.x - drone.x, dy = PLANET.y - drone.y;
    var dist2 = dx * dx + dy * dy;
    var dist = Math.sqrt(dist2);
    if (dist < PLANET.r) {
      // 惑星に激突 → この一発は失敗
      phase = 'settle'; settleT = 0.4;
      if (!isDemo) {
        hitStop = Math.max(hitStop, 0.12);
        game.feedback.bad(drone.x, drone.y, { text: 'CRASH' });
        game.fx.burst(drone.x, drone.y, { color: C.bad, count: 14, speed: 300 });
        shake = 0.18;
        game.audio.play('se_bad', 0.35);
      }
      return;
    }
    var acc = GRAV / dist2;
    drone.vx += acc * (dx / dist) * dt;
    drone.vy += acc * (dy / dist) * dt;
    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;

    var tgt = targetPos();
    var tdx = drone.x - tgt.x, tdy = drone.y - tgt.y;
    if (Math.hypot(tdx, tdy) < tgt.r) {
      phase = 'settle'; settleT = 0.4;
      if (!isDemo) {
        hits++;
        hitStop = Math.max(hitStop, 0.15);
        game.feedback.good(tgt.x, tgt.y, { text: 'HIT', color: C.gold });
        game.fx.burst(tgt.x, tgt.y, { color: C.beacon, count: 18, speed: 360 });
        game.audio.play('se_break', 0.45);
        if (hits === 1 && !milestoneShown) { milestoneShown = true; game.fx.popup('あと' + (TARGETS.length - hits) + '基!', W * 0.5, H * 0.18, { color: C.white, size: 34 }); game.audio.play('se_milestone', 0.3); }
      }
      return;
    }
    if (drone.x < -150 || drone.x > W + 150 || drone.y < -150 || drone.y > H + 150) {
      phase = 'settle'; settleT = 0.4;
      if (!isDemo) { hitStop = Math.max(hitStop, 0.1); game.feedback.bad(drone.x, drone.y, { text: 'MISS' }); shake = 0.12; game.audio.play('se_bad', 0.3); }
    }
  }

  function afterSettle() {
    shotIdx++;
    if (hits >= TARGETS.length) { ok = true; finished = true; finish(); return; }
    if (shotIdx >= SHOTS_TOTAL) { ok = false; finished = true; finish(); return; }
    drone = null; phase = 'aim';
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || phase !== 'aim' || ready > 0 || done) return;
    if (y > ANCHOR.y - 40) return; // 発射台より下はタップ無効(誤操作防止)
    game.audio.play('se_tap', 0.2);
    fireDrone(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ANCHOR.x, gy: ANCHOR.y, press: false, sub: 'wait', subT: 0.6 };
  var DEMO_ANGLES = [25, -25, 27];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { shotIdx = 0; hits = 0; drone = null; phase = 'aim'; demo.sub = 'wait'; demo.subT = 0.5; }
    demo.subT -= dt;
    if (demo.sub === 'wait' && demo.subT <= 0) {
      demo.sub = 'aim'; demo.subT = 0.5;
      var ang = DEMO_ANGLES[Math.min(shotIdx, DEMO_ANGLES.length - 1)] * Math.PI / 180;
      var reach = 260;
      demo.tx = ANCHOR.x + Math.sin(ang) * reach;
      demo.ty = ANCHOR.y - Math.cos(ang) * reach;
      demo.gx = ANCHOR.x; demo.gy = ANCHOR.y;
    } else if (demo.sub === 'aim') {
      var f = 1 - Math.max(0, demo.subT / 0.5);
      demo.gx = ANCHOR.x + (demo.tx - ANCHOR.x) * f;
      demo.gy = ANCHOR.y + (demo.ty - ANCHOR.y) * f;
      demo.press = false;
      if (demo.subT <= 0) {
        demo.press = true;
        fireDrone(demo.tx, demo.ty);
        demo.sub = 'flight'; demo.subT = 2.2;
      }
    } else if (demo.sub === 'flight') {
      updatePhysics(dt, true);
      demo.gx = drone ? drone.x : demo.gx; demo.gy = drone ? drone.y : demo.gy;
      demo.press = false;
      if (phase === 'settle') { demo.sub = 'hold'; demo.subT = 0.6; }
    } else if (demo.sub === 'hold') {
      if (demo.subT <= 0) {
        shotIdx = (shotIdx + 1) % DEMO_ANGLES.length;
        drone = null; phase = 'aim';
        demo.sub = 'wait'; demo.subT = 0.5;
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.spaceTop], [1, C.spaceBot]]);
    for (var i = 0; i < 24; i++) {
      var sx = (i * 137) % W, sy = (i * 251) % H;
      game.draw.circle(sx, sy, i % 3 === 0 ? 3 : 1.5, '#ffffff55');
    }
  }

  function drawPlanet() {
    game.draw.circle(PLANET.x, PLANET.y, PLANET.r + 30, C.planetDark, 0.3);
    game.draw.circle(PLANET.x, PLANET.y, PLANET.r, C.planet);
    game.draw.circle(PLANET.x - 40, PLANET.y - 40, PLANET.r * 0.55, C.planetLight, 0.4);
    for (var i = 0; i < 4; i++) game.draw.line(PLANET.x - PLANET.r, PLANET.y - PLANET.r * 0.6 + i * 70, PLANET.x + PLANET.r, PLANET.y - PLANET.r * 0.5 + i * 70, C.planetDark, 6);
  }

  function drawTargets() {
    var f = Math.floor(game.time.elapsed * 5) % 2;
    for (var i = shotIdx; i < TARGETS.length; i++) {
      var tp = i === shotIdx ? targetPos() : TARGETS[i];
      game.draw.circle(tp.x, tp.y, tp.r + 10, C.beacon, 0.18);
      game.draw.sprite(BEACON_F[f], { '#': C.beacon }, tp.x, tp.y, 14, { anchor: 'center' });
    }
  }

  function drawDrone() {
    var px = drone ? drone.x : ANCHOR.x;
    var py = drone ? drone.y : ANCHOR.y;
    game.draw.sprite(DRONE_SPR, { '#': C.drone }, px, py, 10, { anchor: 'center' });
  }

  function drawAimLine(tx, ty) {
    if (phase !== 'aim') return;
    game.draw.line(ANCHOR.x, ANCHOR.y, tx, ty, C.gold, 3);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawPlanet();
      drawTargets();
      drawDrone();
      if (demo.sub === 'aim') drawAimLine(demo.tx, demo.ty);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawPlanet(); drawDrone();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TARGETS.length, W / 2, H * 0.13, 30, C.white);
      if (!ok) txt('あと' + (TARGETS.length - hits) + '基!', W / 2, H * 0.17, 26, C.white);
      if (hits > game.best && hits > 0) txt('NEW RECORD', W / 2, H * 0.21, 28, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, total: TARGETS.length };
        if (ok) game.end.success(hits, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      if (phase === 'flight') updatePhysics(dt, false);
      else if (phase === 'aim') wobbleT += dt;
      else if (phase === 'settle') { settleT -= dt; if (settleT <= 0) afterSettle(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPlanet();
    drawTargets();
    drawDrone();

    txt('SHOT ' + Math.min(shotIdx + 1, SHOTS_TOTAL) + ' / ' + SHOTS_TOTAL, W / 2, H * 0.06, 28, C.white);
    txt(hits + ' / ' + TARGETS.length, W / 2, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['G4', 0.3], ['E4', 0.3], ['C5', 0.6]], { tempo: 110, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
