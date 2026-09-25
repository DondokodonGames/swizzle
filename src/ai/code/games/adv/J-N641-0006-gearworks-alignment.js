// J-N641-0006-gearworks-alignment.js
// 歯車工房のレバー合わせ — レバーを長押しで溜めて離し、3つの歯車を狙った図形でそろえる
// 操作: レバーを長押しすると3つの歯車が回り続ける。狙った図形が中央の枠に来た瞬間に指を離して止める
// 終わり: 3つとも同じ図形でそろえば成功。そろわなければ失敗
// @mechanic: hold_charge
// @theme: gearworks_shape_alignment
// 世界観: 古い機関工房の見習い整備士が、3連の歯車レバーを引いて回し、狙った刻印図形を中央の窓にきっちりそろえて機関を目覚めさせる
// 残るもの: 正誤(CLEAR/GAME OVER) + そろった歯車の数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var C = {
    bg: '#3a2a1a', bg2: '#241608', gearBase: '#8a6a3a', gearDark: '#5a4020',
    lever: '#c8482a', leverDark: '#8a2818', frame: '#1a1006',
    good: '#6ad94a', badc: '#ff4d5e', gold: '#ffd400', ink: '#f0e6d0',
  };

  var GAME_TITLE = 'GEAR ALIGN';
  var N_GEARS = 3;
  var SHAPES = [
    ['.#.', '###', '.#.'],
    ['###', '.#.', '###'],
    ['#.#', '###', '#.#'],
  ];
  var TARGET_SHAPE = 0;
  var GX = [W * 0.5, W * 0.5, W * 0.5];
  var GY = [H * 0.30, H * 0.42, H * 0.54];
  var LEVER_X = W * 0.5, LEVER_Y = H * 0.80;
  var SPEED_BASE = [2.4, -3.1, 3.8];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0602', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.4);
    game.draw.rect(0, 0, W, H, C.lever, pulse * 0.15);
  }

  function shapeIdxAt(gearIdx) {
    var ang = ((gearAngle[gearIdx] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var seg = Math.PI * 2 / SHAPES.length;
    return Math.floor((ang + seg / 2) / seg) % SHAPES.length;
  }

  function drawGear(i, locked) {
    var x = GX[i], y = GY[i];
    game.draw.circle(x, y, 90, C.gearDark);
    game.draw.circle(x, y, 78, C.gearBase);
    // spokes rotate for motion read
    var ang = gearAngle[i];
    for (var s = 0; s < 6; s++) {
      var a = ang + s * Math.PI / 3;
      game.draw.line(x, y, x + Math.cos(a) * 78, y + Math.sin(a) * 78, C.gearDark, 8);
    }
    game.draw.rect(x - 60, y - 42, 120, 84, C.frame);
    var idx = shapeIdxAt(i);
    game.draw.sprite(SHAPES[idx], { '#': locked ? (idx === TARGET_SHAPE ? C.good : C.badc) : C.ink }, x, y, 22, { anchor: 'center' });
  }

  function drawLever(charge, held) {
    game.draw.circle(LEVER_X, LEVER_Y, 60, C.leverDark);
    var h = 60 + charge * 90;
    game.draw.rect(LEVER_X - 12, LEVER_Y - h, 24, h, held ? C.gold : C.lever);
    game.draw.circle(LEVER_X, LEVER_Y - h, 26, held ? C.gold : C.lever);
  }

  var gearAngle, gearLocked, charge, holding, lockedCount, timeLeft, milestoneCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    gearAngle = [0, 0.6, 1.2]; gearLocked = [false, false, false];
    charge = 0; holding = false; lockedCount = 0; timeLeft = 15; milestoneCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spinGears(dt) {
    for (var i = 0; i < N_GEARS; i++) {
      if (gearLocked[i]) continue;
      var sp = SPEED_BASE[i] * (1 + charge * 1.6);
      gearAngle[i] += sp * dt;
    }
  }

  function releaseLever() {
    if (finished || ready > 0 || !holding) return;
    holding = false;
    var i = lockedCount;
    if (i >= N_GEARS) return;
    gearLocked[i] = true;
    var idx = shapeIdxAt(i);
    if (idx === TARGET_SHAPE) {
      lockedCount++;
      game.feedback.good(GX[i], GY[i], { text: lockedCount >= N_GEARS ? 'CLEAR' : 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.4);
      if (!milestoneCalled && lockedCount >= 2) {
        milestoneCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.2, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (lockedCount >= N_GEARS) winRun();
    } else {
      shake = 0.25; hitStop = 0.3;
      game.feedback.bad(GX[i], GY[i], { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      loseRun();
    }
    charge = 0;
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.15;
    game.fx.burst(W * 0.5, H * 0.42, { color: C.gold, count: 26, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false;
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) {
      holding = true; charge = 0;
      game.audio.play('se_tap', 0.2);
    }
  });
  game.onRelease(function() { if (state === S.PLAYING) releaseLever(); });

  var demo = { t: 0, gx: LEVER_X, gy: LEVER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.postFinish = 0; }
    if (finished) {
      demo.postFinish = (demo.postFinish || 0) + dt;
      if (demo.postFinish > 0.7) { demo.t = 0; initGame(); demo.postFinish = 0; }
      demo.press = false;
      return;
    } else {
      demo.postFinish = 0;
    }
    if (!holding) { holding = true; }
    if (holding) {
      charge = Math.min(1, charge + dt * 1.2);
      spinGears(dt);
      var idx = shapeIdxAt(lockedCount < N_GEARS ? lockedCount : 0);
      if (idx === TARGET_SHAPE && charge > 0.3) releaseLever();
    }
    demo.press = holding;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gearAngle === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      for (var i = 0; i < N_GEARS; i++) drawGear(i, gearLocked[i]);
      drawLever(charge, holding);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      else txt('TAP TO START', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      for (var j = 0; j < N_GEARS; j++) drawGear(j, gearLocked[j]);
      drawLever(charge, holding);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.badc);
      txt(lockedCount + ' / ' + N_GEARS, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, N_GEARS - lockedCount) + '個!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(lockedCount, { locked: lockedCount, goal: N_GEARS });
        else game.end.failure({ locked: lockedCount, goal: N_GEARS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (holding) { charge = Math.min(1, charge + dt * 1.1); spinGears(dt); }
      if (timeLeft <= 0) { timeLeft = 0; loseRun(); }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    for (var k = 0; k < N_GEARS; k++) drawGear(k, gearLocked[k]);
    if (!finished) drawLever(charge, holding);

    txt(lockedCount + ' / ' + N_GEARS, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 14, '#4a3a24', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / 15), 14, lowTime ? C.badc : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.25], ['G3', 0.25], ['B3', 0.25], ['E4', 0.5]], { tempo: 122, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
