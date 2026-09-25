// D-20172021-0091-excavator-turret-haul.js
// エクスカベーター・ターレット・ホール — 旋回する重機アームを指で回して土山から掘り出し、指定の穴へ運び入れる
// 操作: 旋回台の中心を軸に指で円を描くようにドラッグし、アームを土山→指定の穴の順に回して土を運ぶ
// 終わり: 規定回数、土を掘って穴まで運び入れれば成功。制限時間内に運びきれなければ失敗
// @mechanic: rotate_gesture
// @theme: excavator_turret_haul
// 世界観: 造成地の重機オペレーター見習いが、旋回台ごとアームを指で回して土山から土をすくい、毎回位置が変わる指定の穴まで運び入れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 運び入れた回数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 面ごとに明暗を分けたブロック調、輪郭は太め、影は矩形ブロックで簡略化
  var C = {
    bg: '#c9a35a', bg2: '#a97f3a', ground: '#8a6a34', groundDark: '#6a4e22',
    body: '#ff8a3d', bodyDark: '#c9601f', arm: '#3a2c1a', soil: '#5a4020', pit: '#241a10',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffce4a', ink: '#241a10', white: '#fff4e0',
  };

  var GAME_TITLE = 'TURRET HAUL';
  var TOTAL = 4;
  var TIME_LIMIT = 14;
  var PIVOT_X = W * 0.5, PIVOT_Y = H * 0.42;
  var ARM_LEN = 260;
  var SOIL_ANGLE = Math.PI * (200 / 180);
  var ARC_TOL = 0.34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function ang(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  var DRIVER_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffce4a', pulse * 0.25);
    game.draw.rect(0, H * 0.62, W, H * 0.3, C.ground, 1);
    game.draw.rect(0, H * 0.62, W, 10, C.groundDark, 0.7);
  }

  var turretAngle, phase, dropAngle, loaded, load, dragging, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function newDropAngle() {
    // 土山(SOIL_ANGLE)から90〜160度離れた位置に穴を配置
    var dir = Math.random() < 0.5 ? 1 : -1;
    var delta = (Math.PI * (90 + game.random(0, 70)) / 180) * dir;
    return ang(SOIL_ANGLE + delta);
  }

  function initGame() {
    turretAngle = ang(SOIL_ANGLE + Math.PI);
    phase = 'toSoil'; dropAngle = newDropAngle(); loaded = false; load = 0;
    dragging = false; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tip() { return { x: PIVOT_X + Math.cos(turretAngle) * ARM_LEN, y: PIVOT_Y + Math.sin(turretAngle) * ARM_LEN }; }

  function drawArc(a, color, alphaBase) {
    var p = { x: PIVOT_X + Math.cos(a) * (ARM_LEN + 60), y: PIVOT_Y + Math.sin(a) * (ARM_LEN + 60) };
    game.draw.circle(p.x, p.y, 58, color, alphaBase);
    game.draw.circle(p.x, p.y, 36, C.bg2, 1);
  }

  function drawScene() {
    var soilP = { x: PIVOT_X + Math.cos(SOIL_ANGLE) * (ARM_LEN + 60), y: PIVOT_Y + Math.sin(SOIL_ANGLE) * (ARM_LEN + 60) };
    game.draw.circle(soilP.x, soilP.y, 62, C.soil, 0.9);
    game.draw.circle(soilP.x, soilP.y - 14, 40, C.soil, 0.7);
    if (phase === 'toSoil') drawArc(SOIL_ANGLE, C.gold, 0.5 + 0.3 * Math.sin(game.time.elapsed * 5));
    var dropP = { x: PIVOT_X + Math.cos(dropAngle) * (ARM_LEN + 60), y: PIVOT_Y + Math.sin(dropAngle) * (ARM_LEN + 60) };
    game.draw.circle(dropP.x, dropP.y, 60, C.pit, 0.9);
    if (phase === 'toDrop') game.draw.circle(dropP.x, dropP.y, 66, C.good, 0.35 + 0.25 * Math.sin(game.time.elapsed * 5));

    var t = tip();
    game.draw.line(PIVOT_X, PIVOT_Y, t.x, t.y, C.arm, 22);
    game.draw.circle(PIVOT_X, PIVOT_Y, 56, C.body, 1);
    game.draw.circle(PIVOT_X, PIVOT_Y, 56, C.bodyDark, 0.25);
    game.draw.sprite(DRIVER_SPRITE, { '#': C.white }, PIVOT_X, PIVOT_Y - 6, 14, { anchor: 'center' });
    game.draw.circle(t.x, t.y, loaded ? 30 : 22, loaded ? C.soil : C.arm, 1);
  }

  function resolveArrival() {
    if (phase === 'toSoil') {
      if (Math.abs(ang(turretAngle - SOIL_ANGLE)) < ARC_TOL) {
        loaded = true; phase = 'toDrop';
        game.feedback.good(tip().x, tip().y, { text: 'LOAD', color: C.good });
        game.audio.play('se_tap', 0.25);
      }
    } else if (phase === 'toDrop') {
      if (Math.abs(ang(turretAngle - dropAngle)) < ARC_TOL) {
        loaded = false; load++;
        game.feedback.good(tip().x, tip().y, { text: 'GOOD', color: C.good });
        game.fx.burst(tip().x, tip().y, { color: C.gold, count: 16, speed: 320 });
        game.audio.play('se_good', 0.3);
        if (!halfCalled && load >= Math.ceil(TOTAL / 2)) { halfCalled = true; game.fx.popup('あと' + (TOTAL - load) + '!', PIVOT_X, PIVOT_Y - 220, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
        if (load >= TOTAL) {
          ok = true; finished = true; hitStop = 0.2;
          game.fx.burst(PIVOT_X, PIVOT_Y, { color: C.gold, count: 22, speed: 400 });
          finish();
        } else {
          phase = 'toSoil'; dropAngle = newDropAngle();
        }
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) { dragging = true; game.audio.play('se_tap', 0.08); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !dragging) return;
    turretAngle = Math.atan2(y - PIVOT_Y, x - PIVOT_X);
    resolveArrival();
  });
  game.onRelease(function() { dragging = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) initGame();
    var targetA = phase === 'toSoil' ? SOIL_ANGLE : dropAngle;
    var diff = ang(targetA - turretAngle);
    turretAngle = ang(turretAngle + diff * Math.min(1, dt * 3.2));
    resolveArrival();
    var hp = { x: PIVOT_X + Math.cos(turretAngle) * (ARM_LEN * 0.7), y: PIVOT_Y + Math.sin(turretAngle) * (ARM_LEN * 0.7) };
    demo.gx = hp.x; demo.gy = hp.y; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (turretAngle === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(load + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - load) + '回!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(load, { loads: load, total: TOTAL });
        else game.end.failure({ loads: load, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(tip().x, tip().y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(load + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#241a10', 0.4);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 108, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
