// D-20172021-0079-glow-orb-lane-guide.js
// グロウオーブ・レーンガイド — 転がる灯り玉を指で左右に導き、拍ごとに変わる正しい足場レーンだけを渡る
// 操作: 指を画面に置いたまま左右にドラッグし、拍が来る瞬間に灯り玉を光った足場レーンの真上へ置いておく
// 終わり: 規定回数(7拍)正しいレーンを踏み続ければ成功。判定の瞬間に違うレーンにいると失敗
// @mechanic: guide_path
// @theme: cave_orb_lane_guide
// 世界観: 洞窟探検隊の転がる灯り玉が、奥へ流れる足場の上で拍ごとに切り替わる正しいレーンへドラッグで導かれ続け、闇の奥へ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡り切ったレーン数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮、地平線へ収束する床
  var C = {
    bg: '#120a24', bg2: '#06040f', horizon: '#3a2a60',
    floorA: '#241a44', floorB: '#1a1236', laneOn: '#5ce0ff', laneWarn: '#ffe14d',
    orb: '#5ce0ff', orbCore: '#eafcff',
    good: '#5cff9e', bad: '#ff3355', gold: '#ffe14d', white: '#eef4ff', ink: '#08050f',
  };

  var GAME_TITLE = 'LANE GUIDE';
  var TOTAL = 7;
  var BEAT = 2.0;
  var JUDGE_T = BEAT * 0.72;
  var TELE_T = JUDGE_T - 0.55;
  var LANES_X = [W * 0.28, W * 0.5, W * 0.72];
  var LANE_TOL = 92;
  var ORB_Y = H * 0.56;
  var HORIZON_Y = H * 0.20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCOUT = ['.#.', '###', '.#.'];

  function bg(scrollT) {
    game.draw.gradient(0, HORIZON_Y, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, HORIZON_Y, W, H - HORIZON_Y, C.floorB);
    var bands = 24;
    for (var i = 0; i < bands; i++) {
      var t0 = i / bands, t1 = (i + 1) / bands;
      var y0 = HORIZON_Y + Math.pow(t0, 1.8) * (H - HORIZON_Y);
      var y1 = HORIZON_Y + Math.pow(t1, 1.8) * (H - HORIZON_Y);
      var shift = (scrollT * 60) % (2 * (H - HORIZON_Y) / bands);
      var col = ((i + Math.floor(scrollT * 2)) % 2 === 0) ? C.floorA : C.floorB;
      game.draw.rect(0, y0 + shift - (H - HORIZON_Y), W, Math.max(2, y1 - y0), col, 0.9);
    }
    game.draw.line(0, HORIZON_Y, W, HORIZON_Y, C.horizon, 6, 0.6);
    game.draw.sprite(SCOUT, { '#': C.gold }, W * 0.12, H * 0.12, 12, { anchor: 'center' });
  }

  function laneBottomWidth() { return (LANES_X[1] - LANES_X[0]); }

  function drawLanes(phase) {
    for (var l = 0; l < 3; l++) {
      var isTarget = l === targetLane;
      var col = C.floorA;
      var alpha = 0.5;
      if (isTarget) {
        if (phase < TELE_T) { col = C.laneOn; alpha = 0.5; }
        else if (phase < JUDGE_T) { col = C.laneWarn; alpha = 0.55 + 0.35 * Math.sin(game.time.elapsed * 14); }
        else { col = judged && !judgeOk ? C.bad : C.laneOn; alpha = 0.4; }
      }
      var bw = laneBottomWidth() * 0.86;
      game.draw.rect(LANES_X[l] - bw / 2, ORB_Y - 26, bw, 60, col, alpha);
      game.draw.rect(LANES_X[l] - bw / 2, ORB_Y - 26, bw, 6, C.white, isTarget ? 0.3 : 0.08);
    }
  }

  function drawOrb() {
    var bob = Math.sin(game.time.elapsed * 7) * 4;
    game.draw.circle(ballX, ORB_Y + bob, 34, C.orb, 0.9);
    game.draw.circle(ballX, ORB_Y + bob, 16, C.orbCore, 0.95);
  }

  var passed, targetLane, prevLane, beatT, judged, judgeOk, ballX;
  var done, endWait, finished, ready, hitStop, shake, halfShown, scrollT;

  function pickLane(exclude) {
    var n;
    do { n = Math.floor(game.random(0, 3)); } while (n === exclude);
    return n;
  }

  function initGame() {
    passed = 0; halfShown = false; scrollT = 0;
    prevLane = -1; targetLane = pickLane(prevLane); prevLane = targetLane;
    beatT = 0; judged = false; judgeOk = false;
    ballX = LANES_X[1];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function setBall(x) {
    ballX = Math.max(LANES_X[0] - 46, Math.min(LANES_X[2] + 46, x));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    setBall(x);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    setBall(x);
  });

  function judgeNow() {
    judged = true;
    var d = Math.abs(ballX - LANES_X[targetLane]);
    judgeOk = d <= LANE_TOL;
    if (judgeOk) {
      passed++;
      hitStop = 0.06;
      game.feedback.good(ballX, ORB_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfShown && passed >= Math.ceil(TOTAL / 2)) { halfShown = true; game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.35); }
      if (passed >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); }
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(LANES_X[targetLane], ORB_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANES_X[1], gy: ORB_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % BEAT;
    if (cyc < dt || demo.t <= dt) { targetLane = pickLane(prevLane); prevLane = targetLane; judged = false; }
    beatT = cyc;
    demo.gx += (LANES_X[targetLane] - demo.gx) * Math.min(1, dt * 4);
    demo.gy = ORB_Y;
    demo.press = true;
    ballX = demo.gx;
    if (!judged && beatT >= JUDGE_T) {
      judged = true; judgeOk = true;
      game.feedback.good(ballX, ORB_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    scrollT += dt;
    if (state === S.ATTRACT) {
      if (targetLane === undefined) initGame();
      bg(scrollT);
      stepDemo(dt);
      drawLanes(beatT);
      drawOrb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(scrollT);
      drawLanes(0);
      drawOrb();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.10, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '歩!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { lanes: passed, total: TOTAL });
        else game.end.failure({ lanes: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); beatT = 0; judged = false; }
    } else if (!finished) {
      beatT += dt;
      if (!judged && beatT >= JUDGE_T) judgeNow();
      if (!finished && beatT >= BEAT) {
        beatT -= BEAT;
        targetLane = pickLane(prevLane); prevLane = targetLane;
        judged = false;
      }
    }
    if (shake > 0) shake -= dt;

    bg(scrollT);
    drawLanes(ready > 0 ? -1 : beatT);
    drawOrb();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.floorA, 0.9);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
