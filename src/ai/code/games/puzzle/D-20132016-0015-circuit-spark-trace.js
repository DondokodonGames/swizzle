// D-20132016-0015-circuit-spark-trace.js
// サーキットスパーク — 光る回路の一本道を指でなぞって起動する。途中で走る警告火花に触れたら失敗
// 操作: 起点から終点まで、回路の線から指を外さずになぞる。火花が来たら一瞬止まって避ける
// 終わり: 終点まで到達すれば成功。線を外れる/火花に触れれば失敗
// @mechanic: trace
// @theme: overload_circuit_board
// 世界観: 過負荷寸前の巨大回路基盤。技師が一本道の回路を指でなぞって電流を通すが、逆走する警告火花に触れると回路が焼き切れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ、塗りを使わない
  var C = {
    bg: '#02050a', line: '#0a2a3a', glow: '#2effea', spark: '#ff3d3d',
    good: '#2effea', bad: '#ff3d3d', gold: '#ffd400', white: '#eaffff', ink: '#000000',
  };

  var GAME_TITLE = 'CIRCUIT SPARK';
  var HALF = 66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.86 },
    { x: W * 0.78, y: H * 0.74 },
    { x: W * 0.78, y: H * 0.58 },
    { x: W * 0.28, y: H * 0.58 },
    { x: W * 0.28, y: H * 0.42 },
    { x: W * 0.72, y: H * 0.42 },
    { x: W * 0.72, y: H * 0.26 },
    { x: W * 0.5, y: H * 0.16 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d0 = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d0); TOTAL_LEN += d0;
  }
  // 火花の発生ポイント(進行度0-1で2箇所)
  var HAZARDS = [0.35, 0.68];

  var progress, cursorX, cursorY, done, endWait, finished;
  var ready, hitStop, shake, hazardActive, hazardIdx, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, '#040a10'], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), '#ffffff05', 2);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function ptAtProgress(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1] || i === PTS.length - 1) {
        var t = SEG_LEN[i - 1] > 0 ? (len - acc) / SEG_LEN[i - 1] : 0;
        t = Math.max(0, Math.min(1, t));
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.line, HALF * 2);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.glow, 4, 0.5);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 26, C.glow);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 26, C.gold);
    // 走破済み区間を強調
    var acc2 = 0;
    for (var k = 1; k < PTS.length; k++) {
      var segStart = acc2, segEnd = acc2 + SEG_LEN[k - 1];
      if (progress > segStart) {
        var p = Math.min(1, (progress - segStart) / SEG_LEN[k - 1]);
        var ex = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * p;
        var ey = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * p;
        game.draw.line(PTS[k - 1].x, PTS[k - 1].y, ex, ey, C.gold, 8);
      }
      acc2 = segEnd;
    }
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var r = distToSeg(px, py, PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    hazardActive = false; hazardIdx = 0; milestoneShown = false;
    hazPhase = 'wait'; hazT = 1.2;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    // 火花との接触判定
    if (hazardActive) {
      var hp = ptAtProgress(HAZARDS[hazardIdx] * TOTAL_LEN);
      if (Math.hypot(x - hp.x, y - hp.y) < 70) {
        finished = true; ok = false; hitStop = 0.35;
        game.feedback.bad(x, y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
    }
    if (r.len > progress) {
      progress = r.len;
      if (!milestoneShown && progress / TOTAL_LEN > 0.5) { milestoneShown = true; game.fx.popup('50%', x, y - 60, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 20) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  // 火花タイマー(点滅予告→出現→消滅)
  var hazPhase = 'wait', hazT = 1.2;
  function tickHazard(dt) {
    if (done || finished) { return; }
    hazT -= dt;
    if (hazPhase === 'wait' && hazT <= 0.7 && hazT > 0) hazPhase = 'telegraph';
    if (hazPhase === 'telegraph' && hazT <= 0) { hazPhase = 'active'; hazardActive = true; hazT = 0.6; }
    else if (hazPhase === 'active' && hazT <= 0) { hazPhase = 'wait'; hazardActive = false; hazardIdx = (hazardIdx + 1) % HAZARDS.length; hazT = 2.4; }
  }

  function drawHazard() {
    var hp = ptAtProgress(HAZARDS[hazardIdx] * TOTAL_LEN);
    if (hazPhase === 'telegraph') {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(hp.x, hp.y, 74, C.spark, 0.35);
    } else if (hazPhase === 'active') {
      game.draw.circle(hp.x, hp.y, 60, C.spark, 0.8);
      game.draw.sprite(['.#.', '###', '.#.'], { '#': C.white }, hp.x, hp.y, 14, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; hazPhase = 'wait'; hazT = 1.2; hazardIdx = 0; hazardActive = false; }
    tickHazard(dt);
    var target = Math.min(TOTAL_LEN, (cyc / 3.8) * TOTAL_LEN);
    var p = ptAtProgress(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.8;
    if (progress < target) progress = target;
    cursorX = p.x; cursorY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      drawHazard();
      game.draw.circle(cursorX, cursorY, 12, C.glow);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawPath();
      game.draw.circle(cursorX, cursorY, 12, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.12, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      tickHazard(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    drawHazard();
    if (!finished) game.draw.circle(cursorX, cursorY, 12, C.glow);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
