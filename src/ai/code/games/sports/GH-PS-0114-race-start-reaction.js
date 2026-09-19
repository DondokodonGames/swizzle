// GH-PS-0114-race-start-reaction.js
// レーススタート・リアクション — 号砲と同時にスタートを切る。フライングは即失格
// 操作: スタートランプが全部消えた瞬間だけタップして飛び出す。ランプが点いている間のタップはフライング
// 終わり: 2ラウンド先取でCLEAR。フライング即座にGAME OVER、対抗ランナーに先着されてもGAME OVER
// @mechanic: reaction_duel
// @theme: sprint_starting_line
// 世界観: 陸上競技場のスタートライン。号砲ランプが消えた瞬間にどれだけ速く飛び出せるかを対抗ランナーと競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応タイム(ms)
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s HANDHELD COLOR: 低彩度・少色。小画面前提で太く単純な形
  var C = {
    bg1: '#8fae7a', bg2: '#5f7a52', track: '#c9a86a', trackLine: '#f0e2c0',
    me: '#3a6fae', rival: '#ae5a3a', lamp: '#e0d8b8', lampOn: '#d8433a', lampOff: '#3a8a4a',
    good: '#3a8a4a', bad: '#d8433a', gold: '#e8c23a', ink: '#1c2418', white: '#f4f0e0',
  };

  var GAME_TITLE = 'START REACTION';
  var WIN = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, myWins = 0, rivalWins = 0, lastReactMs = 0;

  var phase, phaseT, lampsLit, goT, flyingOut, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2, TRACK_Y0 = H * 0.30, TRACK_Y1 = H * 0.62;
  var ME_X = W * 0.30, RIVAL_X = W * 0.70;

  function trackBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, TRACK_Y0, W, TRACK_Y1 - TRACK_Y0, C.track);
    game.draw.line(CX, TRACK_Y0, CX, TRACK_Y1, C.trackLine, 6);
    for (var i = 0; i < 6; i++) game.draw.rect(0, TRACK_Y0 + i * ((TRACK_Y1 - TRACK_Y0) / 6), W, 3, C.trackLine, 0.4);
  }

  var RUNNER_STAND = ['.##.', '####', '.##.', '.##.'];
  var RUNNER_GO = ['.##.', '####', '##..', '#...'];

  // 常時の足踏みidleモーション(実演の静止区間でも完全に静止させない)
  function drawRunners(myOff, rivalOff, myGo) {
    var bob = Math.abs(Math.sin(game.time.elapsed * 3.1)) * 12;
    game.draw.sprite(myGo ? RUNNER_GO : RUNNER_STAND, { '#': C.me }, ME_X + myOff, TRACK_Y0 + 60 - bob, 20, { anchor: 'center' });
    game.draw.sprite(RUNNER_STAND, { '#': C.rival }, RIVAL_X + rivalOff, TRACK_Y0 + 60 - Math.abs(Math.sin(game.time.elapsed * 3.1 + Math.PI)) * 12, 20, { anchor: 'center' });
  }

  function drawLamps(lit) {
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 2.4);
    game.draw.rect(CX - 100, H * 0.14 - 44, 200, 88, C.lampOn, 0.05 + pulse * 0.06);
    for (var i = 0; i < 3; i++) {
      var x = CX - 60 + i * 60;
      game.draw.circle(x, H * 0.14, 22, i < lit ? C.lampOn : C.lampOff);
      game.draw.circle(x, H * 0.14, 22, C.ink, 0.0);
    }
  }

  function newRound() {
    // 光が1つずつ点灯→全消灯でGO。消灯までの待ち時間は毎回ばらつく(変拍子)
    phase = 'lightOn'; phaseT = 0.45; lampsLit = 0;
    goT = 0; flyingOut = false;
  }

  function initGame() {
    myWins = 0; rivalWins = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  var rivalReactMs = 260;
  function endRound(iWon, msVal) {
    hitStop = 0.18;
    lastReactMs = msVal;
    if (iWon) {
      myWins++;
      game.feedback.good(ME_X, TRACK_Y0 + 60, { text: msVal < 180 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(ME_X, TRACK_Y0 + 60, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      rivalWins++;
      game.feedback.bad(ME_X, TRACK_Y0 + 60, { text: 'LATE' });
      shake = 0.15;
      game.audio.play('se_bad', 0.35);
    }
    if (myWins >= WIN) { ok = true; finished = true; finish(); }
    else if (rivalWins >= WIN) { ok = false; finished = true; finish(); }
    else if (myWins === 1 || rivalWins === 1) {
      // サドンデス演出: 1-1になったら最終走者として強調
      game.fx.popup(myWins + '-' + rivalWins, CX, H * 0.20, { color: C.gold, size: 44 });
      game.audio.play('se_milestone', 0.4);
      newRound();
    } else {
      newRound();
    }
  }

  function falseStart() {
    hitStop = 0.18;
    ok = false; finished = true;
    game.feedback.bad(ME_X, TRACK_Y0 + 60, { text: 'FALSE START' });
    shake = 0.25;
    game.audio.play('se_failure', 0.45);
    finish();
  }

  function tap() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    if (phase !== 'go') { falseStart(); return; }
    var ms = Math.round(goT * 1000);
    endRound(ms < rivalReactMs, ms);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    tap();
  });

  function stepRound(dt) {
    if (phase === 'lightOn') {
      phaseT -= dt;
      if (phaseT <= 0) {
        lampsLit++;
        game.audio.tone(300 + lampsLit * 120, 0.1, { wave: 'square', volume: 0.15 });
        if (lampsLit >= 3) { phase = 'hold'; phaseT = 0.5 + Math.random() * 0.9; }
        else phaseT = 0.40;
      }
    } else if (phase === 'hold') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'go'; goT = 0; lampsLit = 0; game.audio.play('se_jump', 0.3); }
    } else if (phase === 'go') {
      goT += dt;
      var rivalMs = rivalReactMs / 1000;
      if (goT >= rivalMs + 0.01) {
        // 対抗ランナーが先に飛び出した(自分が遅すぎた)
        endRound(false, rivalReactMs);
      }
    }
  }

  // ── ATTRACT ゴースト実演: 消灯直後に飛び出す成功例1回 + ランプ点灯中に手を出すフライング例1回 ──
  var demo = { t: 0, gx: ME_X, gy: TRACK_Y0 + 220, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < 0.4) { phase = 'lightOn'; lampsLit = 1; }
    else if (cyc < 0.8) { phase = 'lightOn'; lampsLit = 2; }
    else if (cyc < 1.2) { phase = 'lightOn'; lampsLit = 3; }
    else if (cyc < 1.8) { phase = 'hold'; lampsLit = 0; }
    else if (cyc < 2.3) { phase = 'go'; }
    else if (cyc < 2.9) { phase = 'lightOn'; lampsLit = 2; }
    else { phase = 'hold'; lampsLit = 0; }

    if (cyc > 1.80 && cyc < 1.95) {
      demo.press = true;
      if (cyc - dt <= 1.80) { game.feedback.good(ME_X, TRACK_Y0 + 60, { text: 'PERFECT', color: C.good }); game.fx.burst(ME_X, TRACK_Y0 + 60, { color: C.gold, count: 10, speed: 300 }); }
    } else if (cyc > 2.70 && cyc < 2.85) {
      demo.press = true;
      if (cyc - dt <= 2.70) { game.feedback.bad(ME_X, TRACK_Y0 + 60, { text: 'FALSE START' }); }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (myWins === undefined) initGame();
      trackBg();
      stepDemo(dt);
      drawLamps(lampsLit);
      drawRunners(0, 0, phase === 'go');
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 'ms' : '-'), W / 2, H * 0.20, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      trackBg();
      drawLamps(0);
      drawRunners(0, 0, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 52, ok ? C.good : C.bad);
      txt(myWins + ' - ' + rivalWins, W / 2, H * 0.20, 34, C.white);
      if (lastReactMs > 0) txt(lastReactMs + 'ms', W / 2, H * 0.26, 30, C.gold);
      if (!ok && myWins === WIN - 1) txt('あと1勝!', W / 2, H * 0.32, 28, C.gold);
      if (ok && (game.best === 0 || lastReactMs < game.best)) txt('NEW RECORD', W / 2, H * 0.32, 28, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ ms: lastReactMs, score: myWins + '-' + rivalWins });
        else game.end.failure({ ms: lastReactMs, score: myWins + '-' + rivalWins });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    trackBg();
    drawLamps(lampsLit);
    drawRunners(0, 0, phase === 'go');

    txt(myWins + ' - ' + rivalWins, W / 2, H * 0.06, 34, C.white);
    txt(myWins + ' / ' + WIN, W / 2, H * 0.115, 24, C.gold);
    game.draw.rect(60, H * 0.24, W - 120, 14, C.white, 0.25);
    game.draw.rect(60, H * 0.24, (W - 120) * (myWins / WIN), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['G4', 0.25], ['G4', 0.25], ['C5', 0.75]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
