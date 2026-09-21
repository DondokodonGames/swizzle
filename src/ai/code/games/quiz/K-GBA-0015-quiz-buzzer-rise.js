// K-GBA-0015-quiz-buzzer-rise.js
// クイズ挙手ライズ — 出題ランプが光った瞬間に合わせて素早く手を挙げる
// 操作: 出題ランプが光るまで待ち、光った瞬間にタップして手を挙げる(光る前に挙げると失格)
// 終わり: 規定回数(5回)全て正しく素早く挙げられれば成功。フライング/反応遅れで失敗
// @mechanic: reaction_duel
// @theme: quiz_podium_buzzer
// 世界観: 早押しクイズの舞台。出題ランプが光った合図だけを頼りに、誰よりも早く手を挙げる解答者
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく挙げた回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色 + 白縁、明るい背景、光の柱
  var C = {
    bg1: '#ffd93d', bg2: '#ff9f1c', podium: '#2b2d5e', podiumEdge: '#ffffff',
    lampOff: '#5a5a7a', lampOn: '#ffe600', good: '#2ee66b', bad: '#ff3355',
    gold: '#ffffff', white: '#ffffff', ink: '#1a1a2e',
  };

  var GAME_TITLE = 'BUZZER RISE';
  var TOTAL = 5;
  var CX = W * 0.5, PY = H * 0.5;
  var THRESH = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var HAND_DOWN = ['.##.', '####', '.##.', '.##.', '####'];
  var HAND_UP = ['.#..', '##..', '.##.', '####', '.##.', '####'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(W * (0.05 + i * 0.16), H * 0.1, 40, H * 0.5, '#ffffff18');
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.podium);
    game.draw.rect(0, H * 0.78, W, 10, C.podiumEdge);
  }

  var passed, round, phase, phaseT, cueWait, raised, done, endWait, finished;
  var ready, hitStop, shake, flashState;

  function newRound(r) {
    phase = 'wait'; phaseT = 0;
    cueWait = game.random(0.7, 1.7) - r * 0.05;
    raised = false;
  }

  function initGame() {
    passed = 0; round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0;
    newRound(0);
  }

  function resolveTap() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0) return;
    game.audio.play('se_tap', 0.12);
    if (phase === 'wait') {
      flashState = -1; hitStop = 0.35;
      game.feedback.bad(CX, PY, { text: 'フライング!' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
      return;
    }
    raised = true;
    if (phaseT <= THRESH) {
      passed++; hitStop = 0.1; flashState = 1;
      game.feedback.good(CX, PY, { text: 'PERFECT', color: C.good });
      game.fx.burst(CX, PY, { color: C.lampOn, count: 16, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup(passed + ' / ' + TOTAL, CX, PY - 200, { color: C.good, size: 40 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound(round);
    } else {
      flashState = -1; hitStop = 0.35;
      game.feedback.bad(CX, PY, { text: '遅い!' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (finished) return;
    phaseT += dt;
    if (phase === 'wait') {
      if (phaseT >= cueWait) {
        phase = 'go'; phaseT = 0;
        game.audio.play('se_milestone', 0.3);
      }
    } else if (phase === 'go') {
      if (!raised && phaseT > THRESH + 0.45) {
        flashState = -1; hitStop = 0.3;
        game.feedback.bad(CX, PY, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawScene() {
    var lit = phase === 'go';
    if (lit) game.draw.circle(CX, H * 0.3, 120, C.lampOn, 0.35);
    game.draw.circle(CX, H * 0.3, 46, lit ? C.lampOn : C.lampOff);
    if (flashState !== 0) game.draw.circle(CX, PY, 140, flashState > 0 ? C.good : C.bad, 0.25);
    game.draw.sprite(raised || (phase === 'go' && raised) ? HAND_UP : HAND_DOWN, { '#': C.podiumEdge }, CX, PY + 60, 24, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, dphase: 'wait', dt2: 0, dWait: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { demo.dphase = 'wait'; demo.dt2 = 0; demo.dWait = 1.1; raised = false; }
    demo.dt2 += dt;
    phase = demo.dphase; phaseT = demo.dt2;
    if (demo.dphase === 'wait') {
      demo.gx = CX; demo.gy = H * 0.86; demo.press = false;
      if (demo.dt2 >= demo.dWait) { demo.dphase = 'go'; demo.dt2 = 0; }
    } else if (demo.dphase === 'go') {
      if (demo.dt2 < dt) { demo.press = false; }
      if (demo.dt2 >= 0.18 && demo.dt2 < 0.3) { demo.press = true; raised = true; }
      if (demo.dt2 >= 0.3) demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.podium);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.podium);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.podium);
      if (!ok) txt('あと' + (TOTAL - passed) + '回!', W / 2, H * 0.21, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL });
        else game.end.failure({ passed: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.9;

    bg();
    drawScene();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 14, '#ffffff55');
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 14, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.podium);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
