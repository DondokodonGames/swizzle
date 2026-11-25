// K-X-0015-freeform-break-beat.js
// フリーブレイク — 決まった型のビートを崩し、自分だけのタイミングでちょうどの回数だけ決めポーズを刻む
// 操作: 「BREAK!」の合図で自由なタイミングでステージをタップし、示された回数ぴったりで止める
// 終わり: 3ラウンド(3回→5回→6回)すべてちょうどの回数で決めれば成功。回数を超える/時間切れで足りなければ失敗
// @mechanic: count_exact
// @theme: street_freestyle_cypher
// 世界観: 路上のサイファーの輪の中心。決まった振り付けの型をあえて崩し、自分だけの間で決めポーズをちょうどの数だけ刻んで魅せるダンサー
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めきれたラウンド数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 明るく彩度高いフラットUI、太いアウトライン、ポップな配色
  var C = {
    bg: '#1a1030', bg2: '#0e0820', stage: '#2e1a52', stageEdge: '#5a3a9a',
    dancer: '#ffd23f', dancerLit: '#ff5fa0',
    good: '#3dffa0', bad: '#ff3d6a', gold: '#ffe600', warn: '#ff9a3d', white: '#f6eaff', ink: '#0a0616',
  };
  var ROUNDS = [{ n: 3, t: 2.6 }, { n: 5, t: 3.4 }, { n: 6, t: 3.8 }];

  var GAME_TITLE = 'FREEBREAK';
  var CX = W * 0.5, CY = H * 0.46, STAGE_R = 320;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER_A = ['..##..', '.####.', '..##..', '.#..#.', '#....#'];
  var DANCER_B = ['#....#', '.####.', '..##..', '.#..#.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(CX, CY, STAGE_R + 40, C.stageEdge, 0.2);
    game.draw.circle(CX, CY, STAGE_R, C.stage, 0.55);
  }

  var roundIdx, phase, taps, windowT, popped, done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    roundIdx = 0; phase = 'wait'; taps = 0; windowT = 0; popped = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function startWindow() {
    phase = 'open'; taps = 0; windowT = ROUNDS[roundIdx].t;
    game.fx.popup('BREAK!', CX, CY - 80, { color: C.gold, size: 44 });
    game.audio.play('se_powerup', 0.4);
  }

  function roundPass() {
    hitStop = 0.1;
    game.feedback.good(CX, CY, { text: 'NICE!' });
    game.audio.play('se_good', 0.35);
    roundIdx++;
    if (roundIdx >= ROUNDS.length) { ok = true; finished = true; finish(); return; }
    game.fx.popup((roundIdx) + ' / ' + ROUNDS.length, CX, CY - 220, { color: C.gold, size: 34 });
    game.audio.play('se_milestone', 0.3);
    phase = 'wait'; windowT = 0.5;
  }

  function roundFail(reason) {
    ok = false; finished = true;
    hitStop = 0.3; shake = 0.24;
    game.feedback.bad(CX, CY, { text: reason });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function tapStage(x, y) {
    if (ready > 0 || done || finished || phase !== 'open') return;
    if (Math.hypot(x - CX, y - CY) > STAGE_R + 60) return;
    taps++;
    game.audio.play('se_tap', 0.2);
    game.fx.popup(String(taps), CX + game.random(-60, 60), CY + game.random(-60, 60), { color: C.dancerLit, size: 30 });
    if (taps === ROUNDS[roundIdx].n) {
      roundPass();
    } else if (taps > ROUNDS[roundIdx].n) {
      roundFail('OVER!');
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) tapStage(x, y); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPhase(dt) {
    if (phase === 'wait') {
      windowT -= dt;
      if (windowT <= 0) startWindow();
    } else if (phase === 'open') {
      windowT -= dt;
      if (windowT <= 0) {
        if (taps < ROUNDS[roundIdx].n) roundFail('あと' + (ROUNDS[roundIdx].n - taps) + '回!');
      }
    }
  }

  function drawStage(cfg) {
    var r = cfg || ROUNDS[roundIdx] || ROUNDS[0];
    var closing = phase === 'open' && windowT < 0.6;
    var frame = Math.floor(game.time.elapsed * 5) % 2 === 0 ? DANCER_A : DANCER_B;
    game.draw.sprite(frame, { '#': closing ? C.warn : C.dancer }, CX, CY, 24, { anchor: 'center' });
    for (var i = 0; i < r.n; i++) {
      var a = (i / r.n) * Math.PI * 2 - Math.PI / 2;
      var px = CX + Math.cos(a) * (STAGE_R + 90);
      var py = CY + Math.sin(a) * (STAGE_R + 90) * 0.55;
      game.draw.circle(px, py, 16, i < taps ? C.gold : '#ffffff30');
    }
    if (phase === 'open') {
      game.draw.circle(CX, CY, STAGE_R, closing ? C.warn : C.stageEdge, closing ? (Math.floor(game.time.elapsed * 10) % 2 === 0 ? 0.35 : 0.1) : 0.12);
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  var demoRound = { n: 4, t: 3.0 };
  var demoPhase = 'wait', demoWindowT = 0.6, demoTaps = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { demoPhase = 'wait'; demoWindowT = 0.6; demoTaps = 0; roundIdx = 0; taps = 0; phase = 'wait'; }
    if (demoPhase === 'wait') {
      demoWindowT -= dt;
      if (demoWindowT <= 0) { demoPhase = 'open'; demoWindowT = demoRound.t; game.fx.popup('BREAK!', CX, CY - 80, { color: C.gold, size: 40 }); }
      demo.press = false;
    } else {
      var stepGap = demoRound.t / (demoRound.n + 0.6);
      var want = Math.min(demoRound.n, Math.floor((demoRound.t - demoWindowT) / stepGap));
      if (want > demoTaps) {
        demoTaps = want;
        game.fx.popup(String(demoTaps), CX + Math.sin(demoTaps) * 50, CY + Math.cos(demoTaps) * 50, { color: C.dancerLit, size: 26 });
        game.audio.play('se_tap', 0.12);
        demo.press = true;
      } else {
        demo.press = false;
      }
      demoWindowT -= dt;
    }
    taps = demoTaps; roundIdx = 0; phase = demoPhase;
    demo.gx = CX; demo.gy = CY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawStage(demoRound);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStage();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(roundIdx + ' / ' + ROUNDS.length, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと1ラウンド!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(roundIdx, { rounds: roundIdx, total: ROUNDS.length });
        else game.end.failure({ rounds: roundIdx, total: ROUNDS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); windowT = 0.6; }
    } else if (!finished) {
      stepPhase(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawStage();

    txt('R' + (roundIdx + 1) + '/' + ROUNDS.length + '   ' + taps + ' / ' + (ROUNDS[roundIdx] ? ROUNDS[roundIdx].n : 0), W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
