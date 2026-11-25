// D-20222026-0022-hollow-vale-switch-guard.js
// ホロウヴェイル・スイッチガード — 前衛と後衛を切り替えながら、荒野の敵の攻撃を見切ってかわす
// 操作: 指を置いたまま横に動かして探索者をレーン間で移動させる。盾アイコンをタップすると後衛に切り替わる
// 終わり: 制限時間内、規定回数の攻撃を全てかわし切れば成功。攻撃を受けると失敗
// @mechanic: dodge
// @theme: hollow_vale_switch_guard
// 世界観: 荒野の遺跡を巡る二人組の探索者が、前衛と後衛を切り替えながら敵の攻撃を見切ってかわし進む
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした攻撃数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度4色、緻密なディザ風の帯で立体感を出す
  var STYLE = {
    bg: ['#5a4a3a', '#2e2418'],
    main: ['#c0392b', '#2d8f5a', '#3a6ea5'],
    accent: ['#f0e6d2', '#171008'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#3fd67e', bad: '#e0554a', gold: '#e0b84d',
    warn: '#ff9f1c',
  };
  var VANGUARD_COL = STYLE.main[2];
  var SCOUT_COL = STYLE.main[1];
  var HAZARD_COL = STYLE.main[0];

  var GAME_TITLE = 'SWITCH GUARD';
  var TIME_LIMIT = 20;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var FIELD_Y = H * 0.44;
  var HAZ_N = 6;
  var TELEGRAPH = 0.65;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VANGUARD_FRAME = ['.##.', '####', '.##.', '#.#.'];
  var SCOUT_FRAME = ['.##.', '####', '.##.', '.#.#'];
  var HAZARD_FRAME = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];
  var SHIELD_FRAME = ['.###.', '#####', '#####', '.###.', '..#..'];

  var SWITCH_BTN = { x: W * 0.5, y: H * 0.88, r: 90 };

  var playerX, charType, hazards, dodged, dragging;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, spawnClock, halfCalled, nextHazIdx;

  function laneOf(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < LANE_X.length; i++) { var d = Math.abs(LANE_X[i] - x); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function initGame() {
    playerX = LANE_X[1]; charType = 0; hazards = []; dodged = 0; dragging = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; spawnClock = 0.8; halfCalled = false; nextHazIdx = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function drawField() {
    for (var i = 0; i < LANE_X.length; i++) game.draw.rect(LANE_X[i] - 90, FIELD_Y - 260, 180, 500, '#00000018');
    for (var h = 0; h < hazards.length; h++) {
      var hz = hazards[h];
      if (hz.resolved) continue;
      if (hz.telegraphT > 0) {
        var glow = 0.3 + 0.3 * Math.sin(game.time.elapsed * 10);
        game.draw.rect(LANE_X[hz.lane] - 90, FIELD_Y - 260, 180, 500, C.warn, glow * (1 - hz.telegraphT / TELEGRAPH));
      } else {
        game.draw.sprite(hz.kind === 1 ? SHIELD_FRAME : HAZARD_FRAME, { '#': HAZARD_COL }, LANE_X[hz.lane], FIELD_Y - 200 + hz.progress * 260, 16, { anchor: 'center' });
      }
    }
    var frame = charType === 0 ? VANGUARD_FRAME : SCOUT_FRAME;
    var col = charType === 0 ? VANGUARD_COL : SCOUT_COL;
    game.draw.sprite(frame, { '#': col }, playerX, FIELD_Y, 18, { anchor: 'center' });

    game.draw.circle(SWITCH_BTN.x, SWITCH_BTN.y, SWITCH_BTN.r, charType === 1 ? SCOUT_COL : '#00000044');
    game.draw.sprite(SHIELD_FRAME, { '#': C.white }, SWITCH_BTN.x, SWITCH_BTN.y, 14, { anchor: 'center' });
  }

  function spawnHazard() {
    var lane = Math.floor(Math.random() * LANE_X.length);
    var kind = (nextHazIdx >= 1 && Math.random() < 0.45) ? 1 : 0;
    hazards.push({ lane: lane, kind: kind, telegraphT: TELEGRAPH, progress: 0, resolved: false });
    nextHazIdx++;
  }

  function resolveHazard(hz) {
    hz.resolved = true;
    var safe;
    if (hz.kind === 1 && charType === 1) safe = true;
    else safe = laneOf(playerX) !== hz.lane;
    if (safe) {
      dodged++;
      game.feedback.good(LANE_X[hz.lane], FIELD_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfCalled && dodged >= Math.ceil(HAZ_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, FIELD_Y - 260, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (dodged >= HAZ_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(playerX, FIELD_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      finished = true; ok = false; hitStop = 0.4; shake = 0.3;
      game.fx.flash(C.bad, 0.3);
      game.feedback.bad(playerX, FIELD_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  function tryToggle(x, y) {
    if (Math.hypot(x - SWITCH_BTN.x, y - SWITCH_BTN.y) < SWITCH_BTN.r) {
      charType = charType === 0 ? 1 : 0;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.3);
      return true;
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (tryToggle(x, y)) return;
    dragging = true; playerX = Math.max(LANE_X[0], Math.min(LANE_X[2], x));
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    playerX = Math.max(LANE_X[0], Math.min(LANE_X[2], x));
  });
  game.onRelease(function() { dragging = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  var demo = { t: 0, gx: LANE_X[1], gy: FIELD_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    spawnClock -= dt;
    if (spawnClock <= 0 && hazards.length < HAZ_N) { spawnHazard(); spawnClock = 1.1; }
    for (var h = 0; h < hazards.length; h++) {
      var hz = hazards[h];
      if (hz.resolved) continue;
      if (hz.telegraphT > 0) {
        hz.telegraphT -= dt;
        if (hz.telegraphT <= 0) {
          var dodgeLane = hz.kind === 1 ? 1 : (hz.lane + 1) % LANE_X.length;
          if (hz.kind === 1) charType = 1; else if (hz.lane === 1) dodgeLane = 0;
          playerX = LANE_X[dodgeLane];
          demo.gx = playerX; demo.gy = FIELD_Y; demo.press = true;
        }
      } else {
        hz.progress += dt / 0.5;
        if (hz.progress >= 1) resolveHazard(hz);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!hazards) initGame();
      bg();
      stepDemo(dt);
      drawField();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawField();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(dodged + ' / ' + HAZ_N, W / 2, H * 0.12, 28, C.gold);
      if (!ok) txt('あと' + (HAZ_N - dodged) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged });
        else game.end.failure({ dodged: dodged });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      spawnClock -= dt;
      if (hazards.length < HAZ_N && spawnClock <= 0) {
        spawnHazard(); spawnClock = TIME_LIMIT / (HAZ_N + 1);
      }
      for (var h = 0; h < hazards.length; h++) {
        var hz = hazards[h];
        if (hz.resolved) continue;
        if (hz.telegraphT > 0) { hz.telegraphT -= dt; }
        else { hz.progress += dt / 0.5; if (hz.progress >= 1) { resolveHazard(hz); break; } }
      }
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(playerX, FIELD_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawField();

    txt(dodged + ' / ' + HAZ_N, W / 2, H * 0.06, 26, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 176, tbW, 14, '#00000044');
    game.draw.rect(60, 176, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.3], ['F3', 0.3], ['A3', 0.3], ['D4', 0.6]], { tempo: 108, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
