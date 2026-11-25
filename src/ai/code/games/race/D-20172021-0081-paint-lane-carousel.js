// D-20172021-0081-paint-lane-carousel.js
// ペイントレーン・カルーセル — 回転コンベアの上を転がる球体を、迫るゲートの色に合わせてタップでレーンごと切り替えて通す
// 操作: タップするたびに球体のレーンを隣へ切り替える。迫るゲートが自分のレーンに来る前に同じ色のレーンへ揃える
// 終わり: 規定回数(8ゲート)色を合わせて通過すれば成功。違う色のレーンでゲートに当たれば失敗
// @mechanic: timing_window
// @theme: paint_lane_carousel
// 世界観: 塗装検品ラインの球体が回転コンベアの上を転がりながら、次々迫るゲートの色に合わせてタップでレーンを切り替え、塗り分け工程を通り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 通り抜けたゲート数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き
  var C = {
    bg: '#1c1a22', bg2: '#0e0c12', belt: '#2a2732', beltDark: '#18161d',
    laneA: '#e05a4a', laneB: '#4ac97a', laneC: '#4a9ee0',
    gate: '#7a7686',
    good: '#4ac97a', bad: '#ff4d5e', gold: '#e0c23f', white: '#eae6f0', ink: '#0c0a10',
  };

  var LANE_COLORS = [C.laneA, C.laneB, C.laneC];
  var GAME_TITLE = 'COLOR GATE';
  var TOTAL = 8;
  var BEAT = 1.25;
  var JUDGE_T = BEAT * 0.80;
  var TELE_T = JUDGE_T - 0.5;
  var LANES_X = [W * 0.28, W * 0.5, W * 0.72];
  var BALL_Y = H * 0.62;
  var GATE_START_Y = H * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var INSPECT = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 30; i++) {
      var nx = (i * 137) % W, ny = (i * 251) % H;
      game.draw.rect(nx, ny, 2, 2, C.white, 0.04);
    }
    game.draw.rect(0, H * 0.70, W, 12, C.beltDark, 0.8);
    game.draw.sprite(INSPECT, { '#': C.gold }, W * 0.5, H * 0.10, 14, { anchor: 'center' });
  }

  function drawLanes() {
    for (var l = 0; l < 3; l++) {
      game.draw.rect(LANES_X[l] - 60, H * 0.30, 120, H * 0.42, LANE_COLORS[l], 0.14);
      game.draw.line(LANES_X[l] - 60, H * 0.30, LANES_X[l] - 60, H * 0.72, C.belt, 3, 0.5);
    }
  }

  function drawGate(phase) {
    var p = Math.min(1, Math.max(0, phase / JUDGE_T));
    var gy = GATE_START_Y + (BALL_Y - GATE_START_Y) * p;
    var warn = phase >= TELE_T && phase < JUDGE_T && Math.floor(game.time.elapsed * 14) % 2 === 0;
    for (var l = 0; l < 3; l++) {
      if (l === reqLane) continue;
      game.draw.rect(LANES_X[l] - 56, gy - 20, 112, 40, warn ? C.gold : C.gate, warn ? 0.55 : 0.85);
    }
    game.draw.rect(LANES_X[reqLane] - 56, gy - 20, 112, 40, LANE_COLORS[reqLane], 0.9);
    game.draw.rect(LANES_X[reqLane] - 56, gy - 20, 112, 6, C.white, 0.4);
  }

  function drawBall() {
    var bob = Math.sin(game.time.elapsed * 8) * 4;
    game.draw.circle(LANES_X[curLane], BALL_Y + bob, 32, '#12101a', 0.6);
    game.draw.circle(LANES_X[curLane], BALL_Y + bob, 28, LANE_COLORS[curLane]);
    game.draw.circle(LANES_X[curLane] - 8, BALL_Y + bob - 8, 8, C.white, 0.6);
  }

  var passed, curLane, reqLane, beatT, judged, judgeOk, halfShown;
  var done, endWait, finished, ready, hitStop, shake;

  function pickReq() { return Math.floor(game.random(0, 3)); }

  function initGame() {
    passed = 0; halfShown = false;
    curLane = 0; reqLane = pickReq();
    beatT = 0; judged = false; judgeOk = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function cycle() {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    curLane = (curLane + 1) % 3;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(LANES_X[curLane], BALL_Y, { color: LANE_COLORS[curLane], count: 6, speed: 160 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    cycle();
  });

  function judgeNow() {
    judged = true;
    judgeOk = curLane === reqLane;
    if (judgeOk) {
      passed++;
      hitStop = 0.05;
      game.feedback.good(LANES_X[curLane], BALL_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfShown && passed >= Math.ceil(TOTAL / 2)) { halfShown = true; game.fx.popup('HALFWAY!', W * 0.5, H * 0.25, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.35); }
      if (passed >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); }
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(LANES_X[curLane], BALL_Y, { text: 'MISS' });
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

  var demo = { t: 0, gx: LANES_X[0], gy: H * 0.88, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % BEAT;
    if (cyc < dt || demo.t <= dt) { reqLane = pickReq(); judged = false; }
    beatT = cyc;
    if (!judged && beatT >= JUDGE_T * 0.5 && curLane !== reqLane) {
      curLane = (curLane + 1) % 3;
      demo.gx = LANES_X[curLane]; demo.gy = BALL_Y; demo.press = true;
      game.fx.burst(LANES_X[curLane], BALL_Y, { color: LANE_COLORS[curLane], count: 6, speed: 160 });
      game.audio.play('se_tap', 0.1);
    } else { demo.press = false; }
    if (!judged && beatT >= JUDGE_T) {
      judged = true;
      game.feedback.good(LANES_X[curLane], BALL_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (reqLane === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLanes();
      drawGate(beatT);
      drawBall();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLanes();
      drawGate(0);
      drawBall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.10, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '基!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { gates: passed, total: TOTAL });
        else game.end.failure({ gates: passed, total: TOTAL });
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
        reqLane = pickReq();
        judged = false;
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLanes();
    drawGate(ready > 0 ? -1 : beatT);
    drawBall();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.belt, 0.9);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['B4', 0.2], ['G4', 0.2], ['D5', 0.4]], { tempo: 138, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
