// I-DS-0014-tent-seam-zip.js
// テントシーラー — 嵐の夜、裂けたテントの合わせ目を指でジッパーをなぞり上げて閉じる
// 操作: つまみを合わせ目の線に沿って下から上へなぞり動かす。突風の間は線が細くなるので慎重に
// 終わり: 頂上まで閉じきれば成功。線からはみ出せば裂け目が広がり失敗
// @mechanic: trace
// @theme: storm_tent_seam
// 世界観: 嵐の野営地。テント番のアライグマが、風で裂けた入口の合わせ目をジッパーづたいに閉じきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 閉じきれた進行度%
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var C = {
    skyTop: '#1c2440', skyBot: '#30204a', tentFar: '#241a34', tentNear: '#3a2850',
    seam: '#584878', seamEdge: '#3a2c54', zip: '#ffd85a', danger: '#ff4d6a',
    good: '#5dffa0', bad: '#ff4d5e', gold: '#ffd85a', white: '#f4f0ff', ink: '#08060c',
  };

  var GAME_TITLE = 'TENT SEAM';

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // 下(開口部)→上(頂上)へ閉じるジグザグの合わせ目
  var PTS = [
    { x: W * 0.5, y: H * 0.80 },
    { x: W * 0.62, y: H * 0.68 },
    { x: W * 0.42, y: H * 0.58 },
    { x: W * 0.60, y: H * 0.46 },
    { x: W * 0.40, y: H * 0.36 },
    { x: W * 0.5, y: H * 0.22 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }
  var HALF_NORMAL = 66, HALF_GUST = 30;

  var progress, cursorX, cursorY, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;
  var windT, windOn, windWarn;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RACCOON_A = ['.#..#.', '######', '#.##.#', '######', '.####.'];
  var RACCOON_B = ['.#..#.', '######', '#.##.#', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.skyTop], [1, C.skyBot]]);
    game.draw.rect(0, H * 0.62, W, H * 0.4, C.tentFar, 0.5);
    game.draw.rect(0, H * 0.72, W, H * 0.3, C.tentNear, 0.6);
    for (var s = 0; s < 5; s++) {
      var sx = (s * 233 + Math.floor(game.time.elapsed * 260)) % (W + 100) - 50;
      game.draw.line(sx, H * (0.15 + s * 0.05), sx - 30, H * (0.15 + s * 0.05) + 30, '#ffffff22', 3);
    }
  }

  function currentHalf(segIdx) { return windOn ? HALF_GUST : HALF_NORMAL; }

  function drawSeam() {
    for (var j = 1; j < PTS.length; j++) {
      var half = currentHalf(j - 1);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, windOn ? C.danger : C.seamEdge, half * 2 + 8);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.seam, half * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 40, C.zip, 0.8);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 40, C.gold);
    if (windWarn) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) txt('!', W * 0.5, H * 0.10, 40, C.danger);
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
    done = false; endWait = 0; finished = false; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
    windT = 0; windOn = false; windWarn = false;
  }

  function updateWind(dt) {
    windT += dt;
    var cyc = windT % 3.4;
    windWarn = cyc > 2.2 && cyc < 2.8;
    windOn = cyc >= 2.8;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > currentHalf(0)) {
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      progress = r.len;
      var pct = progress / TOTAL_LEN;
      if (!milestoneShown && pct >= 0.5) {
        milestoneShown = true;
        game.fx.popup('50%', x, y - 70, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    updateWind(dt);
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; milestoneShown = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 4.0) * TOTAL_LEN);
    var acc = 0, px = PTS[0].x, py = PTS[0].y;
    for (var i = 1; i < PTS.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        px = PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t;
        py = PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t;
        break;
      }
      acc += SEG_LEN[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 4.0;
    if (progress < target) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSeam();
      game.draw.sprite(Math.floor(game.time.elapsed * 4) % 2 === 0 ? RACCOON_A : RACCOON_B, { '#': C.gold, '.': null }, W * 0.16, H * 0.78, 10, { anchor: 'center' });
      game.draw.circle(cursorX, cursorY, 13, C.zip);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSeam();
      game.draw.circle(cursorX, cursorY, 13, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var p = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(p, { pct: p }); else game.end.failure({ pct: p });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      updateWind(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSeam();
    if (!finished) {
      game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? RACCOON_A : RACCOON_B, { '#': C.gold, '.': null }, W * 0.16, H * 0.78, 10, { anchor: 'center' });
      game.draw.circle(cursorX, cursorY, 13, C.zip);
    }

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
