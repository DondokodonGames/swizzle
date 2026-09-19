// GH-PS2-0104-stroke-trace-write.js
// ストロークトレース — 光る手本の線を一画ずつなぞって呪符を完成させる
// 操作: 光る手本の線から指を離さず、はみ出さないようになぞる。1画終えたら次の画へ自動で進む
// 終わり: 3画すべてなぞり終えれば成功。手本の線からはみ出せば失敗
// @mechanic: trace
// @theme: apprentice_seal_room
// 世界観: 薄暗い道場の奥、見習い術者が机に置かれた呪符を仕上げる。手本の光る線をなぞるほど呪符の紋様が完成に近づくが、線を外れると墨が滲んで最初からになる
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞり終えた画数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HANDHELD: #0f380f〜#9bbc0f の4階調のみ。残像・低コントラスト・画面枠
  var C = {
    d0: '#0f380f', d1: '#306230', d2: '#8bac0f', d3: '#9bbc0f',
    bad: '#3a1a10', badLine: '#c85030', frame: '#0f380f',
  };

  var GAME_TITLE = 'STROKE TRACE';
  var HALF = 56;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // 3画の手本(呪符の紋様)。各画は点列(折れ線)
  var STROKES = [
    [{ x: W * 0.30, y: H * 0.40 }, { x: W * 0.70, y: H * 0.40 }],
    [{ x: W * 0.30, y: H * 0.50 }, { x: W * 0.70, y: H * 0.62 }],
    [{ x: W * 0.66, y: H * 0.70 }, { x: W * 0.40, y: H * 0.70 }, { x: W * 0.40, y: H * 0.58 }],
  ];

  function segLens(pts) {
    var lens = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(d); total += d;
    }
    return { lens: lens, total: total };
  }
  var STROKE_META = STROKES.map(segLens);

  var strokeIdx, progress, cursorX, cursorY, done, endWait, finished, drawing;
  var ready, hitStop, shake, doneStrokes;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var APPRENTICE = ['.##.', '####', '.##.', '#.#.'];

  function roomBg() {
    game.draw.gradient(0, H, [[0, C.d1], [1, C.d0]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, C.d0, 0.3);
    game.draw.sprite(APPRENTICE, { '#': C.d3 }, W * 0.5, H * 0.86, 12, { anchor: 'center' });
    game.draw.rect(0, 0, W, 20, C.frame);
    game.draw.rect(0, H - 20, W, 20, C.frame);
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }

  function evalPoint(idx, px, py) {
    var pts = STROKES[idx], meta = STROKE_META[idx];
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var r = distToSeg(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * meta.lens[i - 1]; }
      acc += meta.lens[i - 1];
    }
    return { dist: best, len: bestLen, total: meta.total };
  }

  function drawStroke(idx, litFrom) {
    var pts = STROKES[idx];
    var col = idx < doneStrokes ? C.d2 : (idx === strokeIdx ? C.d3 : C.d1);
    for (var i = 1; i < pts.length; i++) {
      game.draw.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, col, HALF * 2);
    }
    for (var i = 1; i < pts.length; i++) {
      game.draw.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, idx < doneStrokes ? C.d2 : C.d0, 6);
    }
    game.draw.circle(pts[0].x, pts[0].y, 16, col);
  }

  function initGame() {
    strokeIdx = 0; progress = 0; doneStrokes = 0;
    cursorX = STROKES[0][0].x; cursorY = STROKES[0][0].y;
    done = false; endWait = 0; finished = false; drawing = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.45);
    endWait = 1.2;
  }

  function startStroke(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(strokeIdx, x, y);
    if (r.dist > HALF) {
      game.feedback.bad(x, y, { text: null, shake: false });
      return;
    }
    drawing = true; progress = r.len; cursorX = x; cursorY = y;
    game.feedback.good(x, y, { text: null, count: 4 });
    game.audio.play('se_tap', 0.15);
  }

  function dragStroke(x, y) {
    if (!drawing || done || finished) return;
    var r = evalPoint(strokeIdx, x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.25; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) progress = r.len;
    cursorX = x; cursorY = y;
    if (progress >= r.total - 16) {
      drawing = false; doneStrokes++;
      game.feedback.good(x, y, { text: (doneStrokes) + '/' + STROKES.length, color: C.d3 });
      game.fx.burst(x, y, { color: C.d3, count: 10, speed: 300 });
      game.audio.play('se_milestone', 0.35);
      if (doneStrokes >= STROKES.length) {
        ok = true; finished = true; hitStop = 0.15;
        game.fx.popup('CLEAR', W / 2, H * 0.30, { color: C.d3, size: 56 });
        finish();
        return;
      }
      strokeIdx++;
      progress = 0;
      cursorX = STROKES[strokeIdx][0].x; cursorY = STROKES[strokeIdx][0].y;
    }
  }

  function releaseStroke() { drawing = false; }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    game.audio.play('se_tap', 0.1);
    startStroke(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    dragStroke(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.06);
    releaseStroke();
  });

  // ── ATTRACT ゴースト実演: 実ロジック(startStroke/dragStroke)を使い3画を順になぞる ──
  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var si = strokeIdx;
    if (si >= STROKES.length) return;
    var pts = STROKES[si], meta = STROKE_META[si];
    var segStart = Math.min(1, doneStrokes) * 0; // no-op, kept for clarity
    var localCyc = cyc - si * 1.3;
    var frac = Math.max(0, Math.min(1, localCyc / 1.0));
    if (frac <= 0) { demo.gx = pts[0].x; demo.gy = pts[0].y; demo.press = false; return; }
    var target = frac * meta.total;
    var acc = 0, px = pts[0].x, py = pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      if (target <= acc + meta.lens[i - 1]) {
        var t = meta.lens[i - 1] > 0 ? (target - acc) / meta.lens[i - 1] : 0;
        px = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
        py = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
        break;
      }
      acc += meta.lens[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = true;
    if (!drawing && frac < 0.06) startStroke(pts[0].x, pts[0].y);
    else if (drawing) dragStroke(px, py);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (strokeIdx === undefined) initGame();
      roomBg();
      stepDemo(dt);
      for (var i = 0; i < STROKES.length; i++) drawStroke(i);
      game.draw.circle(cursorX, cursorY, 12, C.d3);
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 5, demo.gy + Math.cos(game.time.elapsed * 1.7) * 5, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.d3, 'center');
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.d2, 'center');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.d3, 'center');
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.d2, 'center');
      }
      return;
    }

    if (state === S.RESULT) {
      roomBg();
      for (var j = 0; j < STROKES.length; j++) drawStroke(j);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.d3 : C.badLine, 'center');
      txt(doneStrokes + ' / ' + STROKES.length, W / 2, H * 0.13, 30, C.d2, 'center');
      if (!ok && doneStrokes >= STROKES.length - 1) txt('あと1画!', W / 2, H * 0.18, 26, C.d3, 'center');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.d2, 'center');
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { strokes: doneStrokes };
        if (ok) game.end.success(doneStrokes * 100, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    roomBg();
    for (var k = 0; k < STROKES.length; k++) drawStroke(k);
    if (!finished) game.draw.circle(cursorX, cursorY, 12, C.d3);

    txt(doneStrokes + ' / ' + STROKES.length, W / 2, H * 0.06, 30, C.d3, 'center');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 54, C.d3, 'center');
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['R', 0.2], ['C4', 0.3], ['E4', 0.3]],
      { tempo: 120, wave: 'square', volume: 0.06, loop: true, bass: [['C3', 1], ['G2', 1]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
