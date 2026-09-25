// D-20132016-0040-beat-lane-swerve.js
// ビートレーンスワーブ — 自動で転がる球を、拍に合わせて指示された方向へスワイプしてよける
// 操作: 迫る警告矢印の指す方向へ、拍のタイミングでスワイプして隣のレーンへ寄せる
// 終わり: 規定回数(7回)拍に合わせてよければ成功。逆方向か無反応が1回でもあれば失敗
// @mechanic: swipe_direction
// @theme: canyon_rail_bounce
// 世界観: 渓谷を貫く一本橋のレール。自動で転がるゴムまりが、拍に合わせて崩れる足場を指示方向へスワイプしてよけ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + よけた拍数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定色、大きいドット、強い差し色1色
  var C = {
    bg: '#141018', bg2: '#0c0a10', rail: '#241c2c', railEdge: '#3a2c48',
    gap: '#050408', ball: '#ff3d6a', ballDark: '#a51e42', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'LANE SWERVE';
  var TOTAL = 7;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var BALL_Y = H * 0.66;
  var BEAT = 1.55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var lane, laneX, beatT, hazardLane, hazardDir, resolved, telegraphed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) {
      game.draw.rect(0, i * (H / 8), W, 2, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3 + i));
    }
    for (var l = 0; l < 3; l++) {
      game.draw.rect(LANE_X[l] - 110, H * 0.2, 220, H * 0.62, C.rail, 0.5);
      game.draw.rect(LANE_X[l] - 110, H * 0.2, 220, 8, C.railEdge);
    }
  }

  function pickHazard(curLane) {
    var dir = curLane === 0 ? 1 : (curLane === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1));
    return { lane: curLane, dir: dir };
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    lane = 1; laneX = LANE_X[1]; beatT = 0; resolved = true; telegraphed = false;
    var h = pickHazard(lane); hazardLane = h.lane; hazardDir = h.dir;
  }

  var BALL_SPRITE = ['.##.', '####', '####', '.##.'];
  function drawBall() {
    var bob = Math.sin(game.time.elapsed * 6) * 6;
    game.draw.circle(laneX, BALL_Y + bob, 26, C.ballDark, 0.5);
    game.draw.sprite(BALL_SPRITE, { '#': C.ball }, laneX, BALL_Y + bob - 6, 12, { anchor: 'center' });
    game.draw.circle(laneX - 8, BALL_Y + bob - 12, 7, C.white, 0.6);
  }

  function drawHazard(t) {
    if (t < 0) return;
    var p = Math.min(1, t / BEAT);
    var y = H * 0.18 + p * (BALL_Y - H * 0.18);
    var blink = p > 0.45 && Math.floor(game.time.elapsed * 9) % 2 === 0;
    game.draw.rect(LANE_X[hazardLane] - 90, y - 30, 180, 60, blink ? C.bad : C.gold, blink ? 0.8 : 0.5);
    var ax = hazardDir;
    game.draw.line(LANE_X[hazardLane] - ax * 60, y, LANE_X[hazardLane] + ax * 60, y, C.white, 14);
    game.draw.line(LANE_X[hazardLane] + ax * 60, y, LANE_X[hazardLane] + ax * 30, y - 26, C.white, 14);
    game.draw.line(LANE_X[hazardLane] + ax * 60, y, LANE_X[hazardLane] + ax * 30, y + 26, C.white, 14);
  }

  function resolveSwipe(dir) {
    if (resolved || ready > 0 || done || finished) return;
    resolved = true;
    var correctDir = hazardDir;
    var want = correctDir < 0 ? 'left' : 'right';
    if (dir === want) {
      lane = hazardLane + correctDir;
      passed++;
      hitStop = 0.06;
      game.feedback.good(laneX, BALL_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.3);
      if (passed === 4) game.fx.popup('あと' + (TOTAL - passed) + '!', W * 0.5, H * 0.3, { color: C.gold, size: 36 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      var h = pickHazard(lane); hazardLane = h.lane; hazardDir = h.dir; beatT = 0; telegraphed = false;
    } else {
      ok = false; finished = true;
      hitStop = 0.35;
      game.feedback.bad(laneX, BALL_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'left' || dir === 'right') resolveSwipe(dir);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANE_X[1], gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % BEAT;
    if (cyc < dt || demo.t <= dt) {
      lane = 1; laneX = LANE_X[1];
      var h = pickHazard(lane); hazardLane = h.lane; hazardDir = h.dir;
    }
    beatT = cyc;
    var p = cyc / BEAT;
    if (p > 0.55 && p < 0.68 && resolved !== false) {
      resolved = false;
      demo.gx = LANE_X[1] + hazardDir * 220;
      demo.press = true;
      lane = hazardLane + hazardDir;
      game.feedback.good(laneX, BALL_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (p >= 0.95) {
      resolved = true; demo.press = false;
      var h2 = pickHazard(lane); hazardLane = h2.lane; hazardDir = h2.dir;
    }
    laneX += (LANE_X[lane] - laneX) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (lane === undefined) initGame();
      bg();
      stepDemo(dt);
      drawHazard(beatT);
      drawBall();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { beats: passed, total: TOTAL });
        else game.end.failure({ beats: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); beatT = 0; resolved = false; }
    } else if (!finished) {
      beatT += dt;
      if (beatT >= BEAT && !resolved) {
        resolved = true;
        ok = false; finished = true;
        hitStop = 0.35;
        game.feedback.bad(laneX, BALL_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    laneX += (LANE_X[lane] - laneX) * Math.min(1, dt * 8);

    bg();
    if (!finished) drawHazard(ready > 0 ? -1 : beatT);
    drawBall();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['A3', 0.2], ['C4', 0.2], ['E4', 0.4]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
