// GH-PS-0116-scoop-load-timing.js
// スクープロードタイミング — 走るトラックの荷台へ、タップの瞬間に積み荷を落とす
// 操作: 荷台がシュートの真下に来た瞬間にタップして積み荷を落とす。ズレるとこぼれて減点
// 終わり: 8個の合計積載スコアが目標以上ならクリア。届かなければゲームオーバー
// @mechanic: drop_timing
// @theme: dock_loading_line
// 世界観: 休みなく走る積み込みラインの現場長。荷台が滑るたび、真上のシュートから一撃で積む
// 残るもの: 正誤(CLEAR/GAME OVER) + 8個合計の積載スコア
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字、3秒で伝わる画面
  var STYLE = {
    bg: ['#ffd23f', '#ff8a3d'],
    main: ['#1b1b2e', '#ffffff', '#2ecc71'],
    accent: ['#ff3b3b', '#3b82ff'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1], road: '#4a4a58', roadLine: '#e8e8e8',
    truck: STYLE.accent[1], truckDark: '#1f4fa0', bed: '#c8c8d0', bedEdge: '#8a8a96',
    crate: '#c98a3a', crateDark: '#8a5a1f', gold: '#ffd400', good: STYLE.main[2], bad: STYLE.accent[0],
    white: STYLE.main[1], ink: STYLE.main[0],
  };

  var GAME_TITLE = 'SCOOP LOAD TIMING';
  var DROPS_TOTAL = 8;
  var SCORE_TARGET = 150;
  var CX = W * 0.5;
  var CHUTE_Y = H * 0.20;
  var BED_Y = H * 0.66;
  var BED_W = 260;
  var FALL_TIME = 0.62;
  var PERFECT_TH = 30, GOOD_TH = 80;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dropIdx, totalScore, combo, truckAmp, truckOmega, truckPhase, crate, resultText, resultTextT, warnSpill;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown, comboShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRATE_SPRITE = ['####', '#..#', '####'];
  var TRUCK_F = [
    ['..####......', '.########...', '########O#O.'],
    ['..####......', '.########...', '########O#O.'],
  ];
  var TRUCK_PAL = { '#': C.truck, O: C.ink };

  function truckX(t) {
    return CX + Math.sin(t * truckOmega + truckPhase) * truckAmp;
  }

  function startRun() {
    dropIdx = 0; totalScore = 0; combo = 0; comboShown = false; finished = false;
    truckAmp = 220; truckOmega = 1.4; truckPhase = game.random(0, 6.28);
    crate = null; resultText = ''; resultTextT = 0; warnSpill = false;
  }

  function initGame() {
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    startRun();
  }

  var runClock = 0;
  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function tryDrop() {
    if (crate) return;
    var landingT = runClock + FALL_TIME;
    crate = { t0: runClock, x: CX, y: CHUTE_Y, landX: truckX(landingT), golden: dropIdx % 4 === 3 };
  }
  function updateCrate(dt) {
    if (!crate) return;
    var elapsed = runClock - crate.t0;
    var frac = Math.min(1, elapsed / FALL_TIME);
    crate.x = CX;
    crate.y = CHUTE_Y + (BED_Y - CHUTE_Y) * frac;
    var remaining = FALL_TIME - elapsed;
    if (!warnSpill && remaining <= 0.32) {
      var offsetPred = Math.abs(crate.landX - CX);
      if (offsetPred > BED_W / 2) {
        warnSpill = true;
        game.audio.tone(180, 0.1, { wave: 'square', volume: 0.16, slide: -50 });
      }
    }
    if (frac >= 1) resolveDrop();
  }
  function resolveDrop() {
    var offset = Math.abs(crate.landX - CX);
    var mult = (1 + Math.min(combo, 4) * 0.25) * (crate.golden ? 3 : 1);
    var base = 0, label = '';
    if (offset > BED_W / 2) {
      base = 0; label = 'SPILL'; combo = 0;
      game.feedback.bad(crate.landX, BED_Y, { text: 'SPILL' });
      shake = 0.18; hitStop = 0.12;
    } else if (offset <= PERFECT_TH) {
      base = 30; label = 'PERFECT'; combo++;
      game.feedback.good(crate.landX, BED_Y, { text: 'PERFECT', color: C.gold });
      game.fx.burst(crate.landX, BED_Y, { color: C.gold, count: 20, speed: 380 });
      shake = 0.16; hitStop = 0.15;
    } else if (offset <= GOOD_TH) {
      base = 15; label = 'GOOD'; combo++;
      game.feedback.good(crate.landX, BED_Y, { text: 'GOOD', color: C.good });
      hitStop = 0.1;
    } else {
      base = 5; label = 'OK'; combo++;
      game.feedback.good(crate.landX, BED_Y, { text: 'OK', color: C.white });
      hitStop = 0.08;
    }
    var gained = Math.round(base * mult);
    totalScore += gained;
    resultText = label + (gained > 0 ? ' +' + gained : ''); resultTextT = 0.9;
    if (crate.golden && label !== 'SPILL') {
      game.fx.popup('GOLD CRATE!', CX, BED_Y - 120, { color: C.gold, size: 44 });
      game.audio.play('se_powerup', 0.5);
    }
    if (combo >= 3 && !comboShown) {
      comboShown = true;
      game.fx.popup('COMBO x' + combo + '!', CX, BED_Y - 160, { color: C.white, size: 40 });
      game.audio.play('se_milestone', 0.5);
    }
    if (dropIdx === 3 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('SUBTOTAL ' + totalScore, CX, H * 0.16, { color: C.white, size: 36 });
      game.audio.play('se_milestone', 0.35);
    }
    crate = null; warnSpill = false;
    dropIdx++;
    // 加速プレッシャー: 積むたびにトラックが速く・大きく揺れる
    truckOmega += 0.16; truckAmp = Math.min(320, truckAmp + 8);
    if (dropIdx >= DROPS_TOTAL) { ok = totalScore >= SCORE_TARGET; finished = true; }
  }

  function tapInput(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; runClock = 0; startRun(); demo.t = 0; demo.press = false; return; }
    if (done || finished || ready > 0 || hitStop > 0 || crate) return;
    tryDrop();
  }
  game.onTap(function(x, y) { game.audio.play('se_tap', 0.15); tapInput(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: tryDrop/updateCrate を本編と共有 ──
  var demo = { t: 0, gx: CX, gy: CHUTE_Y, press: false, subT: 0, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (dropIdx === undefined) startRun();
    runClock += dt;
    demo.subT -= dt;
    if (!crate) {
      demo.gx = CX; demo.gy = CHUTE_Y - 40;
      if (demo.subT <= 0) {
        if (Math.abs(truckX(runClock) - CX) < (demo.cycle % 2 === 0 ? 40 : 999)) {
          demo.press = true;
          tryDrop();
          demo.subT = 0.15;
        } else if (demo.cycle % 2 !== 0 && demo.subT <= -0.4) {
          demo.press = true;
          tryDrop();
          demo.subT = 0.15;
        }
      } else {
        demo.press = false;
      }
    } else {
      updateCrate(dt);
      demo.gx = crate ? crate.x : CX; demo.gy = crate ? crate.y : CHUTE_Y;
      demo.press = false;
      if (!crate) { demo.cycle++; demo.subT = 0.5; if (dropIdx >= DROPS_TOTAL) startRun(); }
    }
  }

  function sceneBg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    game.draw.rect(0, H * 0.58, W, H * 0.34, C.road);
    for (var i = 0; i < 6; i++) game.draw.rect(60 + i * 170, H * 0.74, 90, 10, C.roadLine, 0.7);
  }

  function drawChute() {
    game.draw.rect(CX - 70, CHUTE_Y - 60, 140, 60, C.ink);
    game.draw.rect(CX - 90, CHUTE_Y - 10, 180, 22, C.bedEdge);
  }

  function drawTruck(tx) {
    var f = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.rect(tx - BED_W / 2 - 10, BED_Y - 10, BED_W + 20, 26, C.bedEdge);
    game.draw.rect(tx - BED_W / 2, BED_Y, BED_W, 16, C.bed);
    game.draw.sprite(TRUCK_F[f], TRUCK_PAL, tx, BED_Y + 60, 12, { anchor: 'center' });
  }

  function drawCrate() {
    if (!crate) return;
    game.draw.circle(crate.x, BED_Y + 6, 26, '#00000030');
    game.draw.sprite(CRATE_SPRITE, { '#': crate.golden ? C.gold : C.crate, '.': crate.golden ? '#8a6a00' : C.crateDark }, crate.x, crate.y, 12, { anchor: 'center' });
  }

  function drawWarn() {
    if (!warnSpill) return;
    var flash = Math.floor(game.time.elapsed * 14) % 2 === 0;
    if (flash) game.draw.rect(CX - 90, CHUTE_Y - 70, 180, 16, C.bad, 0.9);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      sceneBg();
      if (dropIdx === undefined) { startRun(); }
      stepDemo(dt);
      drawTruck(truckX(runClock));
      drawChute();
      drawWarn();
      drawCrate();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy - 40 + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      if (resultTextT > 0) txt(resultText, CX, H * 0.42, 42, resultText.indexOf('SPILL') >= 0 ? C.bad : C.gold);
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + game.best, W / 2, H * 0.115, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.bad);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      sceneBg(); drawTruck(truckX(runClock)); drawChute(); drawCrate();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt('SCORE ' + totalScore + ' / ' + SCORE_TARGET, W / 2, H * 0.13, 30, C.ink);
      txt('BEST ' + Math.max(game.best, totalScore), W / 2, H * 0.17, 26, C.ink);
      if (!ok && totalScore >= SCORE_TARGET - 20) txt('あと' + (SCORE_TARGET - totalScore) + '点!', W / 2, H * 0.21, 26, C.ink);
      if (totalScore > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.24, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { score: totalScore, target: SCORE_TARGET, combo: combo };
        if (ok) game.end.success(totalScore, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (finished) {
      finish();
    } else {
      runClock += dt;
      updateCrate(dt);
    }
    if (shake > 0) shake -= dt;

    sceneBg();
    drawTruck(truckX(runClock));
    drawChute();
    drawWarn();
    drawCrate();
    if (resultTextT > 0) {
      resultTextT -= dt;
      txt(resultText, CX, H * 0.42, 44, resultText.indexOf('SPILL') >= 0 ? C.bad : C.gold);
    }

    txt('LOAD ' + (dropIdx + 1) + ' / ' + DROPS_TOTAL, W / 2, H * 0.06, 30, C.ink);
    txt(totalScore + ' / ' + SCORE_TARGET, W / 2, H * 0.10, 26, C.ink);
    if (combo > 0) txt('COMBO x' + combo, W / 2, H * 0.88, 26, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25],
      ['G4', 0.25], ['B4', 0.25], ['D5', 0.5],
    ], { tempo: 160, wave: 'square', volume: 0.07, loop: true, bass: [['G2', 1], ['D2', 1]] });
    state = S.ATTRACT;
    runClock = 0;
    startRun();
  });
})(game);
