// I-Wii-0004-lantern-keeper-freeze.js
// 灯番人の静止番 — 腰に構えた提灯番が、見回りの目が光っている間は指を離さず止まる
// 操作: 見回りの目が開いている間は画面から指を離さず押さえ続け、閉じた合図の瞬間だけ指を離す
// 終わり: 規定回数(4回)の見回りを正しくやり過ごせれば成功。目が開いている間に離せば即失敗
// @mechanic: freeze
// @theme: night_watch_lantern_keeper
// 世界観: 夜番の番小屋。腰に提灯を構えた見張り番が、見回りの目が光る間はぴくりとも動かず息を潜める
// 残るもの: 正誤(CLEAR/GAME OVER) + やり過ごした回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: フラットデザイン、影なし、丸角、彩度中〜高
  var C = {
    bg: '#2c3e50', bg2: '#1a2733', hut: '#3c5468', eye: '#e74c3c', eyeOff: '#3c5468',
    keeper: '#f4c542', lantern: '#ff9f43',
    good: '#2ecc71', bad: '#e74c3c', gold: '#f1c40f', white: '#ecf0f1', ink: '#1a1a1a',
  };

  var GAME_TITLE = 'NIGHT WATCH';
  var ROUNDS = 4;
  var CX = W * 0.5, CY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, cleared, milestoneShown;
  var ready, hitStop, shake;
  var RP = { watchOff: 0, watchOn: 1, resolved: 2 };
  var roundPhase, phaseT, watchDur, restDur, pressing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER_SPRITE = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.65, W, H * 0.18, C.hut, 1);
  }

  function newRound() { return { watchDur: game.random(1.1, 1.7), restDur: game.random(0.5, 0.9) }; }

  function initGame() {
    cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    var r = newRound(); watchDur = r.watchDur; restDur = r.restDur;
    roundPhase = RP.watchOff; phaseT = 0; pressing = false;
  }

  function onPressDown(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || done) return;
    pressing = true;
    game.audio.play('se_tap', 0.05);
  }
  function onPressUp(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || done) return;
    pressing = false;
    if (roundPhase === RP.watchOn) {
      // 見られている間に離した = 失敗
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(CX, CY, { text: 'MOVED!' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (roundPhase === RP.watchOff) {
      // 目が閉じている間に正しく離せた
      cleared++;
      game.feedback.good(CX, CY, { text: 'SAFE', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 12, speed: 280 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && cleared >= Math.ceil(ROUNDS / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (cleared >= ROUNDS) {
        finished = true; ok = true;
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      var r = newRound(); watchDur = r.watchDur; restDur = r.restDur;
      roundPhase = RP.watchOff; phaseT = 0;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(onPressDown);
  game.onRelease(onPressUp);

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function updateRound(dt) {
    phaseT += dt;
    if (roundPhase === RP.watchOff && phaseT >= restDur) {
      roundPhase = RP.watchOn; phaseT = 0;
      if (!pressing) {
        // 見回りが来た瞬間、指が離れていたら失敗
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(CX, CY, { text: 'MOVED!' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        finish();
        return;
      }
      game.audio.play('se_tap', 0.15);
    } else if (roundPhase === RP.watchOn && phaseT >= watchDur) {
      roundPhase = RP.watchOff; phaseT = 0;
      var r = newRound(); watchDur = r.watchDur; restDur = r.restDur;
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { roundPhase = RP.watchOff; phaseT = 0; demo.press = false; }
    phaseT += dt;
    if (roundPhase === RP.watchOff) {
      demo.press = true;
      if (phaseT >= 1.3) { roundPhase = RP.watchOn; phaseT = 0; }
    } else {
      if (phaseT >= 1.2) { roundPhase = RP.watchOff; phaseT = 0; demo.press = false; game.fx.burst(CX, CY, { color: C.gold, count: 8, speed: 200 }); game.audio.play('se_good', 0.2); }
      else demo.press = true;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundPhase === undefined) initGame();
      bg();
      stepDemo(dt);
      var eyeOn = roundPhase === RP.watchOn;
      game.draw.circle(CX, H * 0.2, 40, eyeOn ? C.eye : C.eyeOff);
      game.draw.sprite(KEEPER_SPRITE, { '#': C.keeper }, CX, CY, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(KEEPER_SPRITE, { '#': C.keeper }, CX, CY, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateRound(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var eyeOn2 = roundPhase === RP.watchOn;
    if (roundPhase === RP.watchOff && phaseT >= restDur - 0.6) {
      var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
      if (blink) game.draw.circle(CX, H * 0.2, 46, C.eye, 0.35);
    }
    game.draw.circle(CX, H * 0.2, 40, eyeOn2 ? C.eye : C.eyeOff);
    game.draw.sprite(KEEPER_SPRITE, { '#': C.keeper }, CX, CY, 22, { anchor: 'center' });

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['E3', 0.5], ['G3', 0.5], ['C4', 1]], { tempo: 84, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
