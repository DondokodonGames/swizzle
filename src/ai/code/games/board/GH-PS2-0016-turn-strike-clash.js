// GH-PS2-0016-turn-strike-clash.js
// ターンストライククラッシュ — 交互に一手ずつ、壁を撃ち合う陣地戦
// 操作: 自分の番は相手壁の亀裂(弱点)側をタップして攻撃。相手の番は狙われる側を先読みしてタップし防御
// 終わり: 先に相手の壁HPを0にすればクリア。自分の壁HPが先に0になればゲームオーバー
// @mechanic: turn_attack
// @theme: floor_arena_duel
// 世界観: 回転する闘技場の床を挟んで向き合う二枚の防壁。一手ごとに崩し合い、最後まで立つ側を決める
// 残るもの: 勝敗(CLEAR/GAME OVER) + 残りHP差
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODE7 PSEUDO: 少色 + 地平グラデ、横1pxストリップを奥ほど圧縮、地平線へ収束する床
  var STYLE = {
    bg: ['#1a1030', '#050208'],
    main: ['#7a5cff', '#ff5c8a', '#ffe066'],
    accent: ['#39ff9e', '#ff3b3b'],
  };
  var C = {
    sky: STYLE.bg[0], horizon: '#2a1848', floorA: '#241640', floorB: '#160c2a',
    wallFar: STYLE.main[0], wallNear: '#5a4a9a', crack: STYLE.main[2],
    good: STYLE.accent[0], bad: STYLE.accent[1], gold: STYLE.main[2], white: '#ffffff', ink: '#0a0614',
  };

  var GAME_TITLE = 'TURN STRIKE CLASH';
  var WALL_HP = 6;
  var CX = W * 0.5;
  var HORIZON_Y = H * 0.26, NEAR_Y = H * 0.74;
  var FAR_LANE_X = [CX - 150, CX, CX + 150];
  var NEAR_LANE_X = [CX - 260, CX, CX + 260];
  var TELEGRAPH_TIME = 0.75, FEINT_TIME = 0.18;
  var RESOLVE_TIME = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var playerHP, oppHP, weakLane, phase, phaseT, oppTargetLane, feintLane, guarded, finished, milestoneShown;
  var done, endWait, ready, hitStop, shake, popText, popCol;

  var GUARDIAN_F = [
    ['.##.', '####', '#OO#', '####'],
    ['.##.', '####', '#..#', '####'],
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function startRound(prevWeak) {
    weakLane = Math.floor(game.random(0, 3));
    if (weakLane === prevWeak) weakLane = (weakLane + 1) % 3;
    phase = 'playerTurn'; phaseT = 0;
  }

  function startMatch() {
    playerHP = WALL_HP; oppHP = WALL_HP; finished = false; milestoneShown = false;
    guarded = false; popText = ''; popCol = C.white;
    done = false; endWait = 0; ready = 0.8; hitStop = 0; shake = 0;
    startRound(-1);
  }

  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function attackLane(i) {
    if (phase !== 'playerTurn' || finished) return;
    var crit = i === weakLane || playerHP === 1;
    var dmg = crit ? 2 : 1;
    oppHP = Math.max(0, oppHP - dmg);
    if (crit) {
      game.feedback.good(FAR_LANE_X[i], HORIZON_Y + 40, { text: 'BREAK', color: C.gold });
      game.fx.burst(FAR_LANE_X[i], HORIZON_Y + 40, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_break', 0.5);
    } else {
      game.feedback.good(FAR_LANE_X[i], HORIZON_Y + 40, { text: '-1', color: C.good });
    }
    popText = ''; hitStop = 0.15; phase = 'playerResolve'; phaseT = RESOLVE_TIME;
    if (oppHP <= 0) { ok = true; finished = true; }
    else if (oppHP <= WALL_HP / 2 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup(oppHP + ' / ' + WALL_HP, CX, H * 0.14, { color: C.white, size: 38 });
      game.audio.play('se_milestone', 0.5);
    }
  }
  function beginTelegraph() {
    oppTargetLane = Math.floor(game.random(0, 3));
    feintLane = (oppTargetLane + 1 + Math.floor(game.random(0, 2))) % 3;
    guarded = false;
    phase = 'oppTelegraph'; phaseT = TELEGRAPH_TIME;
  }
  function guardLane(i) {
    if (phase !== 'oppTelegraph' || finished || guarded) return;
    if (i === oppTargetLane) {
      guarded = true;
      game.feedback.good(NEAR_LANE_X[i], NEAR_Y - 20, { text: 'GUARD', color: C.good });
    } else {
      game.feedback.bad(NEAR_LANE_X[i], NEAR_Y - 20, { text: null });
    }
  }
  function resolveOppAttack() {
    var dmg = guarded ? 0 : 2;
    playerHP = Math.max(0, playerHP - dmg);
    if (dmg > 0) {
      game.feedback.bad(NEAR_LANE_X[oppTargetLane], NEAR_Y - 20, { text: 'HIT' });
      shake = 0.2; hitStop = 0.18;
    } else {
      game.fx.burst(NEAR_LANE_X[oppTargetLane], NEAR_Y - 20, { color: C.good, count: 14, speed: 320 });
      hitStop = 0.08;
    }
    phase = 'oppResolve'; phaseT = RESOLVE_TIME;
    if (playerHP <= 0) { ok = false; finished = true; }
  }
  function stepPhase(dt) {
    phaseT -= dt;
    if (phase === 'playerResolve' && phaseT <= 0) {
      if (!finished) beginTelegraph();
    } else if (phase === 'oppTelegraph' && phaseT <= 0) {
      resolveOppAttack();
    } else if (phase === 'oppResolve' && phaseT <= 0) {
      if (!finished) startRound(weakLane);
    }
  }

  function laneIndexNear(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < NEAR_LANE_X.length; i++) { var d = Math.abs(x - NEAR_LANE_X[i]); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function laneIndexFar(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < FAR_LANE_X.length; i++) { var d = Math.abs(x - FAR_LANE_X[i]); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function fightTap(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    if (phase === 'playerTurn') attackLane(laneIndexFar(x));
    else if (phase === 'oppTelegraph') guardLane(laneIndexNear(x));
  }
  game.onTap(function(x, y) {
    game.audio.play('se_tap', 0.12);
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; startMatch(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; startMatch(); demo.t = 0; demo.press = false; return; }
    fightTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: attackLane/guardLane/stepPhase を本編と共有 ──
  var demo = { t: 0, gx: CX, gy: NEAR_Y, press: false, cycle: 0, resetT: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    if (weakLane === undefined) startMatch();
    if (finished) {
      demo.press = false;
      if (demo.resetT < 0) demo.resetT = 0.9;
      demo.resetT -= dt;
      if (demo.resetT <= 0) { startMatch(); demo.cycle++; demo.resetT = -1; }
      return;
    }
    var makeMistake = demo.cycle % 3 === 2;
    if (phase === 'playerTurn') {
      demo.gx += (FAR_LANE_X[weakLane] - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (HORIZON_Y + 40 - demo.gy) * Math.min(1, dt * 6);
      demo.press = true;
      if (Math.abs(demo.gx - FAR_LANE_X[weakLane]) < 8) { attackLane(weakLane); }
    } else if (phase === 'oppTelegraph') {
      var target = makeMistake ? (oppTargetLane + 1) % 3 : oppTargetLane;
      demo.gx += (NEAR_LANE_X[target] - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (NEAR_Y - 20 - demo.gy) * Math.min(1, dt * 6);
      demo.press = phaseT < TELEGRAPH_TIME - 0.15;
      if (demo.press && Math.abs(demo.gx - NEAR_LANE_X[target]) < 8 && !guarded) guardLane(target);
      stepPhase(dt);
    } else {
      stepPhase(dt);
      demo.press = false;
    }
  }

  function floorScene() {
    game.draw.gradient(0, HORIZON_Y, [[0, C.sky], [1, C.horizon]]);
    game.draw.rect(0, HORIZON_Y, W, NEAR_Y - HORIZON_Y + 260, C.floorB);
    var rows = 26;
    for (var i = 0; i < rows; i++) {
      var f = i / rows;
      var y = HORIZON_Y + (NEAR_Y + 260 - HORIZON_Y) * (f * f);
      var wgt = 40 + (W * 0.9) * (f * f);
      if (i % 2 === 0) game.draw.rect(CX - wgt / 2, y, wgt, Math.max(2, 10 * f), C.floorA, 0.5);
    }
  }

  function drawWall(hp, lanes, y, far, weakIdx, telegraphIdx, isFeint) {
    for (var i = 0; i < lanes.length; i++) {
      var alive = (i < Math.ceil((hp / WALL_HP) * lanes.length));
      var col = far ? C.wallFar : C.wallNear;
      if (far && i === weakIdx) {
        var pulse = Math.floor(game.time.elapsed * 6) % 2 === 0;
        col = pulse ? C.crack : C.wallFar;
      }
      if (!far && telegraphIdx !== undefined && i === telegraphIdx) {
        var warnFlash = isFeint ? (Math.floor(game.time.elapsed * 20) % 2 === 0) : (Math.floor(game.time.elapsed * 10) % 2 === 0);
        col = warnFlash ? C.bad : C.wallNear;
      }
      var w = far ? 120 : 200;
      var h = far ? 90 : 130;
      game.draw.rect(lanes[i] - w / 2, y - h / 2, w, h, alive ? col : '#00000030');
      game.draw.rect(lanes[i] - w / 2, y - h / 2, w, 8, '#ffffff22');
    }
  }

  function drawGuardian(x, y, pal, scale) {
    var f = Math.floor(game.time.elapsed * 2) % 2;
    game.draw.sprite(GUARDIAN_F[f], pal, x, y, scale, { anchor: 'center' });
  }

  function drawHpBar(x, y, w, hp, col, flip) {
    game.draw.rect(x, y, w, 18, '#00000055');
    var frac = Math.max(0, hp / WALL_HP);
    game.draw.rect(flip ? x + w * (1 - frac) : x, y, w * frac, 18, col);
  }

  game.onUpdate(function(dt) {
    var telegraphIdx, isFeint;
    if (phase === 'oppTelegraph') {
      isFeint = (TELEGRAPH_TIME - phaseT) < FEINT_TIME;
      telegraphIdx = isFeint ? feintLane : oppTargetLane;
    }

    if (state === S.ATTRACT) {
      floorScene();
      stepDemo(dt);
      var tIdx2, fIdx2;
      if (phase === 'oppTelegraph') { fIdx2 = (TELEGRAPH_TIME - phaseT) < FEINT_TIME; tIdx2 = fIdx2 ? feintLane : oppTargetLane; }
      drawWall(oppHP, FAR_LANE_X, HORIZON_Y + 40, true, weakLane);
      drawWall(playerHP, NEAR_LANE_X, NEAR_Y - 20, false, -1, tIdx2, fIdx2);
      drawHpBar(W * 0.5 - 240, HORIZON_Y - 40, 480, oppHP, C.bad, true);
      drawHpBar(W * 0.5 - 240, NEAR_Y + 90, 480, playerHP, C.good, false);
      drawGuardian(CX, HORIZON_Y - 90, { '#': C.bad, O: C.white }, 10);
      drawGuardian(CX, NEAR_Y + 170, { '#': C.good, O: C.ink }, 14);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      floorScene();
      drawWall(oppHP, FAR_LANE_X, HORIZON_Y + 40, true, -1);
      drawWall(playerHP, NEAR_LANE_X, NEAR_Y - 20, false, -1);
      drawHpBar(W * 0.5 - 240, HORIZON_Y - 40, 480, oppHP, C.bad, true);
      drawHpBar(W * 0.5 - 240, NEAR_Y + 90, 480, playerHP, C.good, false);
      drawGuardian(CX, HORIZON_Y - 90, { '#': C.bad, O: C.white }, 10);
      drawGuardian(CX, NEAR_Y + 170, { '#': C.good, O: C.ink }, 14);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(playerHP + ' - ' + oppHP, W / 2, H * 0.13, 34, C.white);
      if (ok && game.best <= 0) txt('NEW RECORD', W / 2, H * 0.17, 26, C.gold);
      if (!ok && oppHP <= 2) txt('あと' + oppHP + '!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { playerHP: playerHP, oppHP: oppHP };
        if (ok) game.end.success(playerHP, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (finished) {
      finish();
    } else {
      stepPhase(dt);
    }
    if (shake > 0) shake -= dt;

    floorScene();
    var tIdx, fIdx;
    if (phase === 'oppTelegraph') { fIdx = (TELEGRAPH_TIME - phaseT) < FEINT_TIME; tIdx = fIdx ? feintLane : oppTargetLane; }
    drawWall(oppHP, FAR_LANE_X, HORIZON_Y + 40, true, phase === 'playerTurn' ? weakLane : -1);
    drawWall(playerHP, NEAR_LANE_X, NEAR_Y - 20, false, -1, tIdx, fIdx);
    drawHpBar(W * 0.5 - 240, HORIZON_Y - 40, 480, oppHP, C.bad, true);
    drawHpBar(W * 0.5 - 240, NEAR_Y + 90, 480, playerHP, C.good, false);
    drawGuardian(CX, HORIZON_Y - 90, { '#': C.bad, O: C.white }, 10);
    drawGuardian(CX, NEAR_Y + 170, { '#': C.good, O: C.ink }, 14);

    txt(playerHP + ' - ' + oppHP, W / 2, H * 0.06, 30, C.white);
    if (playerHP === 1) txt('あと1発!', W / 2, H * 0.10, 24, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.3],
      ['A4', 0.3], ['F4', 0.3],
    ], { tempo: 110, wave: 'sawtooth', volume: 0.06, loop: true, bass: [['D3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    startMatch();
  });
})(game);
