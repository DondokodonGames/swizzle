// K-GBA-0027-bell-beat-pick.js
// 鐘聴き分け — 3つの鐘が別々の速さで鳴る中、印のついた1つの鐘の拍だけを聞き分けて手を叩く
// 操作: 印のついた鐘が鳴る瞬間(光の輪が届く瞬間)だけタップする。他の鐘や外れたタイミングは失敗
// 終わり: 印の鐘の拍を規定数(6回)当てれば成功。3回外せば失敗
// @mechanic: spot
// @theme: bell_beat_pick
// 世界観: 鐘堂に並ぶ三つの鐘。巫女はそれぞれ違う速さで鳴る鐘の中から、印を灯された一つの拍だけを聞き分けて手を叩く
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てた拍数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい原色、太い白フチ、光沢気味のグラデ
  var C = {
    bg1: '#2a1a4a', bg2: '#160a2c', hallA: '#3a2860', hallB: '#241850',
    bellA: '#ff6ec7', bellB: '#5ad1ff', bellT: '#ffe066', ring: '#ffffff',
    good: '#4de0a0', bad: '#ff5468', gold: '#ffd54d', white: '#ffffff', ink: '#100822',
  };

  var GAME_TITLE = 'BELL PICK';
  var TOTAL = 6;
  var MAX_MISS = 3;
  var TOL = 0.16;
  var BELLS_X = [W * 0.28, W * 0.5, W * 0.72];
  var BELL_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, missed, done, endWait, finished, ready, hitStop, shake;
  var round, target, tgtT, tgtDur, tgtResolved, decoyT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BELL_SPRITE = ['.##.', '####', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff06');
  }

  function newTargetIdx() { return Math.floor(game.random(0, 3)); }

  function initGame() {
    cleared = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; target = newTargetIdx(); tgtT = 0; tgtDur = 1.15; tgtResolved = false;
    decoyT = [0, 0, 0];
  }

  function resolveTap() {
    if (ready > 0 || done || finished || tgtResolved) return;
    var diff = Math.abs(tgtDur - tgtT);
    if (diff <= TOL) {
      tgtResolved = true;
      cleared++;
      game.feedback.good(BELLS_X[target], BELL_Y, { text: 'HIT', color: C.good });
      game.fx.burst(BELLS_X[target], BELL_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      hitStop = 0.1;
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.22, { color: C.gold, size: 40 });
      if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
      nextRound();
    } else {
      game.audio.play('se_tap', 0.15);
      registerMiss();
    }
  }

  function registerMiss() {
    missed++;
    hitStop = 0.3;
    game.feedback.bad(BELLS_X[target], BELL_Y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    if (missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    nextRound();
  }

  function nextRound() {
    round++;
    target = newTargetIdx();
    tgtT = 0; tgtDur = Math.max(0.7, 1.15 - round * 0.03); tgtResolved = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepBells(dt) {
    var periods = [0.42, 0.58, 0.5];
    for (var i = 0; i < 3; i++) {
      if (i === target) continue;
      decoyT[i] += dt;
      if (decoyT[i] >= periods[i]) { decoyT[i] = 0; game.audio.play('se_tap', 0.05); }
    }
  }

  function drawBells() {
    for (var i = 0; i < 3; i++) {
      var isTarget = i === target;
      var pulse = 0;
      if (isTarget) {
        var p = Math.min(1, tgtT / tgtDur);
        pulse = p;
        if (p > 0.4) {
          var ringR = 40 + (1 - p) * 120;
          game.draw.circle(BELLS_X[i], BELL_Y, ringR, C.ring, 0.35 * p);
        }
        game.draw.circle(BELLS_X[i], BELL_Y - 90, 10, C.bellT);
      } else {
        var pd = decoyT[i] / [0.42, 0.58, 0.5][i];
        pulse = pd;
      }
      var scale = 20 + pulse * 6;
      game.draw.sprite(BELL_SPRITE, { '#': isTarget ? C.bellA : C.bellB }, BELLS_X[i], BELL_Y, scale, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: BELLS_X[1], gy: H * 0.7, press: false, dT: 0, dDur: 1.0, dTarget: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { decoyT = [0, 0, 0]; demo.dT = 0; demo.dTarget = Math.floor(game.random(0, 3)); target = demo.dTarget; demo.press = false; }
    demo.dT += dt;
    tgtT = demo.dT; tgtDur = demo.dDur; target = demo.dTarget;
    var periods = [0.42, 0.58, 0.5];
    for (var i = 0; i < 3; i++) { if (i !== target) { decoyT[i] += dt; if (decoyT[i] >= periods[i]) decoyT[i] = 0; } }
    if (demo.dT >= demo.dDur - 0.05 && demo.dT < demo.dDur + 0.1) {
      demo.gx = BELLS_X[demo.dTarget]; demo.press = true;
      game.feedback.good(BELLS_X[demo.dTarget], BELL_Y, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (demo.dT > demo.dDur + 0.15) { demo.press = false; demo.dT = 0; demo.dTarget = (demo.dTarget + 1) % 3; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBells();
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
      drawBells();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, missed: missed }); else game.end.failure({ cleared: cleared, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tgtT += dt;
      stepBells(dt);
      if (tgtT > tgtDur + TOL && !tgtResolved) {
        tgtResolved = true;
        registerMiss();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBells();

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.bad : C.ink, i < missed ? 1 : 0.4);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['E4', 0.3], ['C4', 0.3], ['A3', 0.6]], { tempo: 132, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
