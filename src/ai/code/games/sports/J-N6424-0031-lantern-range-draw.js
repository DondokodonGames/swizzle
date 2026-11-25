// J-N6424-0031-lantern-range-draw.js
// ランタン射的ドロー — 夜市の射的台で弓を引き絞り、的の中心近くを狙って3射の合計点を競う
// 操作: 画面下の弦を指で引き絞り、狙いと引く強さを合わせて指を離すと矢が放たれる
// 終わり: 3射の合計点が既定点以上なら成功。届かなければ失敗
// @mechanic: slingshot
// @theme: night_market_lantern_archery
// 世界観: 夜市の射的台に立つ弓引きが、提灯明かりの的の中心を狙って弦を引き絞り、3射の合計点でその日の腕前を競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 合計点
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光ライン、塗りは最小限
  var C = {
    bg: '#0c0a1a', bg2: '#1c1240', line: '#ff7a3c', ring1: '#ff3c5c', ring2: '#ffd400',
    ring3: '#3cffb0', ring4: '#3ca0ff', bull: '#ffffff', good: '#39ff9a', bad: '#ff4d5e',
    gold: '#ffd400', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'LANTERN DRAW';
  var TARGET_X = W * 0.5, TARGET_Y = H * 0.32, TARGET_R = 210;
  var ANCHOR_X = W * 0.5, ANCHOR_Y = H * 0.82;
  var NUM_SHOTS = 3;
  var SUCCESS_SCORE = 18;
  var AIM_TIMEOUT = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ARCHER = ['.##.', '####', '.##.', '#..#'];
  var LANTERN = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.line, pulse * 0.4);
    for (var i = 0; i < 3; i++) {
      var lx = 140 + i * 400;
      var ly = H * 0.18 + Math.sin(game.time.elapsed * 1.2 + i) * 10;
      game.draw.sprite(LANTERN, { '#': C.ring2 }, lx, ly, 14, { anchor: 'center', alpha: 0.5 });
    }
  }

  function drawTarget(marks) {
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R, C.ring4, 0.18);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * 0.72, C.ring3, 0.22);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * 0.46, C.ring2, 0.28);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * 0.24, C.ring1, 0.35);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * 0.09, C.bull, 0.9);
    game.draw.line(TARGET_X - TARGET_R, TARGET_Y, TARGET_X + TARGET_R, TARGET_Y, C.line, 3);
    game.draw.line(TARGET_X, TARGET_Y - TARGET_R, TARGET_X, TARGET_Y + TARGET_R, C.line, 3);
    for (var i = 0; i < marks.length; i++) {
      game.draw.circle(marks[i].x, marks[i].y, 12, marks[i].col);
    }
  }

  var pulling, pullX, pullY, shotsLeft, totalScore, shotMarks, shotTimer, lastLabel, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    pulling = false; pullX = ANCHOR_X; pullY = ANCHOR_Y;
    shotsLeft = NUM_SHOTS; totalScore = 0; shotMarks = []; shotTimer = AIM_TIMEOUT; lastLabel = '';
    halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function scoreForDist(d) {
    if (d < TARGET_R * 0.09) return { s: 10, label: 'PERFECT', col: C.bull };
    if (d < TARGET_R * 0.24) return { s: 8, label: 'GOOD', col: C.ring1 };
    if (d < TARGET_R * 0.46) return { s: 6, label: 'GOOD', col: C.ring2 };
    if (d < TARGET_R * 0.72) return { s: 3, label: 'NICE', col: C.ring3 };
    if (d < TARGET_R) return { s: 1, label: 'NICE', col: C.ring4 };
    return { s: 0, label: 'MISS', col: C.bad };
  }

  function resolveShot(px, py) {
    var pullVecX = ANCHOR_X - px, pullVecY = ANCHOR_Y - py;
    var power = Math.hypot(pullVecX, pullVecY);
    power = Math.max(40, Math.min(320, power));
    var powerRatio = (power - 40) / (320 - 40);
    var sideOffset = pullVecX * 1.55;
    var powerOffset = (powerRatio - 0.55) * TARGET_R * 1.9;
    var lx = TARGET_X + sideOffset;
    var ly = TARGET_Y + powerOffset;
    var d = Math.hypot(lx - TARGET_X, ly - TARGET_Y);
    var r = scoreForDist(d);
    shotMarks.push({ x: lx, y: ly, col: r.col });
    totalScore += r.s;
    lastLabel = r.label;
    shotsLeft--;
    if (r.s >= 6) {
      game.feedback.good(lx, ly, { text: r.label, color: C.good });
      game.fx.burst(lx, ly, { color: r.col, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
    } else {
      game.feedback.bad(lx, ly, { text: r.label });
      game.audio.play('se_tap', 0.3);
    }
    game.audio.play('se_jump', 0.3);
    pulling = false; pullX = ANCHOR_X; pullY = ANCHOR_Y;
    if (shotsLeft <= 0) {
      finished = true; hitStop = 0.35;
      ok = totalScore >= SUCCESS_SCORE;
      if (ok) { game.audio.play('se_success', 0.5); } else { game.audio.play('se_failure', 0.4); }
      finish();
    } else {
      shotTimer = AIM_TIMEOUT;
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.hypot(x - ANCHOR_X, y - ANCHOR_Y) < 220) { pulling = true; pullX = x; pullY = y; game.audio.play('se_tap', 0.1); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pulling) return;
    pullX = x; pullY = y;
    if (Math.random() < 0.08) game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pulling) return;
    pulling = false;
    resolveShot(x, y);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ANCHOR_X, gy: ANCHOR_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = cyc % 1.4;
    if (seg < 0.8) {
      var t2 = seg / 0.8;
      demo.gx = ANCHOR_X + (ANCHOR_X + 40 - ANCHOR_X) * t2;
      demo.gy = ANCHOR_Y - 210 * t2;
      demo.press = true;
      pullX = demo.gx; pullY = demo.gy; pulling = true;
    } else if (seg < 0.9) {
      demo.press = false;
      if (pulling) { pulling = false; resolveShot(pullX, pullY); }
    } else {
      demo.gx = ANCHOR_X; demo.gy = ANCHOR_Y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shotMarks === undefined) initGame();
      stepDemo(dt);
      bg();
      drawTarget(shotMarks);
      game.draw.line(ANCHOR_X, ANCHOR_Y, pullX, pullY, C.line, 4);
      game.draw.sprite(ARCHER, { '#': C.ring3 }, ANCHOR_X, ANCHOR_Y + 60, 30, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTarget(shotMarks);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt('SCORE ' + totalScore + ' / ' + (NUM_SHOTS * 10), W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, SUCCESS_SCORE - totalScore) + '点!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(totalScore, { score: totalScore, shots: NUM_SHOTS });
        else game.end.failure({ score: totalScore, shots: NUM_SHOTS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      shotTimer -= dt;
      if (shotTimer <= 0.6 && shotTimer + dt > 0.6) game.audio.tone('C5', 0.1, { wave: 'square', volume: 0.1 });
      if (shotTimer <= 0) {
        // idle timeout: forced weak release so PLAYING never stalls
        if (pulling) { resolveShot(pullX, pullY); }
        else { resolveShot(ANCHOR_X + (Math.random() - 0.5) * 260, ANCHOR_Y - 40); }
      }
      if (!halfCalled && shotsLeft === Math.ceil(NUM_SHOTS / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', TARGET_X, TARGET_Y - TARGET_R - 40, { color: C.gold, size: 32 });
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTarget(shotMarks);
    if (pulling) game.draw.line(ANCHOR_X, ANCHOR_Y, pullX, pullY, C.line, 4);
    game.draw.sprite(ARCHER, { '#': C.ring3 }, ANCHOR_X, ANCHOR_Y + 60, 30, { anchor: 'center' });

    txt('SCORE ' + totalScore, W / 2, H * 0.06, 30, C.white);
    txt((NUM_SHOTS - shotsLeft) + ' / ' + NUM_SHOTS, W / 2, H * 0.63, 22, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
