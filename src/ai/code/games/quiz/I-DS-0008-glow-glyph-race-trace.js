// I-DS-0008-glow-glyph-race-trace.js
// グロウグリフレーストレース — 光る手本の文字を、乾く前に指でなぞって書き切る
// 操作: 光る手本の線の上を指でなぞって進む。線は奥に進むほど細くなり、下から追いかけてくる乾燥ラインに追いつかれる前に書き切る
// 終わり: 乾燥ラインに追いつかれる前に手本を最後までなぞれば成功。線からはみ出す/追いつかれれば失敗
// @mechanic: trace
// @theme: exam_booth_glyph_race
// 世界観: 試験場の書写台。受験者が光る手本の文字をなぞって覚え書きを仕上げるが、墨は乾くのが早く、なぞる線は先に行くほど細く難しくなる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、パステル、画面を上下に分けて情報と遊びを置く
  var C = {
    bg: '#fdf3ff', bg2: '#f0e0ff', panel: '#ffffff', panelEdge: '#d8b8f0',
    path: '#c9a8ff', pathEdge: '#a878e8', glyph: '#8a5cff', dry: '#ff9ad0',
    good: '#39c98a', bad: '#ff5a7a', gold: '#ffb020', white: '#ffffff', ink: '#3a2050', text: '#5a3a80',
  };

  var GAME_TITLE = 'GLYPH RACE';
  var HALF_START = 92, HALF_END = 30;
  var CHASE_TIME = 9.5; // 乾燥ラインが全長に到達するまでの秒数

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.30, y: H * 0.28 },
    { x: W * 0.68, y: H * 0.30 },
    { x: W * 0.36, y: H * 0.44 },
    { x: W * 0.70, y: H * 0.52 },
    { x: W * 0.32, y: H * 0.62 },
    { x: W * 0.58, y: H * 0.72 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d0 = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d0); TOTAL_LEN += d0;
  }

  var progress, chase, cursorX, cursorY, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STUDENT = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(W * 0.08, H * 0.14, W * 0.84, H * 0.68, C.panel);
    game.draw.rect(W * 0.08, H * 0.14, W * 0.84, 10, C.panelEdge);
    game.draw.sprite(STUDENT, { '#': C.text }, W * 0.5, H * 0.90, 14, { anchor: 'center' });
  }

  function halfAt(p) { return HALF_START - (HALF_START - HALF_END) * Math.min(1, p / TOTAL_LEN); }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
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

  function pointAtLen(len) {
    var acc = 0, px = PTS[0].x, py = PTS[0].y;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (len - acc) / SEG_LEN[i - 1] : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      var f0 = 1 - (j - 1) / (PTS.length - 1), f1 = 1 - j / (PTS.length - 1);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathEdge, halfAt(TOTAL_LEN * (1 - (f0 + f1) / 2)) * 2 + 8);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, halfAt(TOTAL_LEN * (1 - (f0 + f1) / 2)) * 2);
    }
    var dp = pointAtLen(Math.min(TOTAL_LEN, chase));
    game.draw.circle(dp.x, dp.y, 20, C.dry, 0.7);
    game.draw.circle(PTS[0].x, PTS[0].y, 16, C.glyph);
  }

  function initGame() {
    progress = 0; chase = -TOTAL_LEN * 0.28; cursorX = PTS[0].x; cursorY = PTS[0].y;
    milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > halfAt(progress)) {
      finished = true; ok = false; hitStop = 0.15; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var before = progress / TOTAL_LEN;
      progress = r.len;
      var after = progress / TOTAL_LEN;
      if (!milestoneShown && before < 0.5 && after >= 0.5) {
        milestoneShown = true;
        game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      finished = true; ok = true; hitStop = 0.12;
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

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(cursorX, cursorY, 13, C.glyph);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.text);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.text);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.circle(cursorX, cursorY, 13, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.12, 28, C.gold);
      if (!ok && progress / TOTAL_LEN > 0.8) txt('あと少し!', W / 2, H * 0.16, 24, C.text);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.text);
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
    } else if (!finished) {
      chase += (TOTAL_LEN / CHASE_TIME) * dt;
      if (chase >= progress) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.circle(cursorX, cursorY, 13, C.glyph);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 28, C.text);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; chase = -TOTAL_LEN * 0.28; milestoneShown = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
    var p = pointAtLen(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.2;
    if (target > progress) progress = target;
    chase += (TOTAL_LEN / CHASE_TIME) * dt * 0.4;
    cursorX = p.x; cursorY = p.y;
    if (!milestoneShown && progress / TOTAL_LEN >= 0.5) { milestoneShown = true; game.fx.popup('50 / 100', p.x, p.y - 60, { color: C.gold, size: 34 }); }
  }

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['A5', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
