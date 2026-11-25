// I-GBA-0047-spirit-echo-dance.js
// スピリットエコーダンス — 森の精霊が舞った軌跡を一度だけ見せ、消えゆく光跡を指でなぞって真似る
// 操作: 精霊が舞った曲線を、消えていく前に指でなぞって追いかける
// 終わり: 終点まで軌跡からはみ出さずなぞり切れば成功。大きく逸れれば失敗
// @mechanic: trace
// @theme: moonlit_spirit_dance
// 世界観: 月明かりの森の空き地。森の精霊が一度だけ舞った光の軌跡が消えていく前に、見習いがそれを指でなぞって真似る
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭 + 明暗2色だけの塗り
  var C = {
    bg: '#1a2e22', bg2: '#0d1912', dark: '#0a0a0a',
    pathLit: '#7fffb0', pathDim: '#2f5c42', pathEdge: '#0a0a0a',
    accent: '#c9ff5e', good: '#7fffb0', bad: '#ff6a6a', gold: '#ffe066', white: '#eafff2', ink: '#0a0a0a',
  };

  var GAME_TITLE = 'ECHO DANCE';
  var HALF = 70;
  var MAX_TIME = 12; // trace = D族 8-15s

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.20, y: H * 0.70 },
    { x: W * 0.65, y: H * 0.66 },
    { x: W * 0.30, y: H * 0.52 },
    { x: W * 0.75, y: H * 0.42 },
    { x: W * 0.35, y: H * 0.30 },
    { x: W * 0.70, y: H * 0.20 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPIRIT = ['..#..', '.###.', '#####', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 20; i++) {
      var sx = (i * 137) % W, sy = (i * 251) % Math.floor(H * 0.6) + 40;
      game.draw.circle(sx, sy, 3, C.accent, 0.15);
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
  function ptAtLen(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1] || i === PTS.length - 1) {
        var t = SEG_LEN[i - 1] > 0 ? Math.max(0, Math.min(1, (len - acc) / SEG_LEN[i - 1])) : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
  }

  var progress, cursorX, cursorY, done, endWait, finished, fadeT, milestoneShown;
  var ready, hitStop, shake, tracing;

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; fadeT = 0; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0; tracing = false;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished || hitStop > 0) return;
    tracing = true;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = progress / TOTAL_LEN, afterPct = r.len / TOTAL_LEN;
      progress = r.len;
      if (!milestoneShown && beforePct < 0.5 && afterPct >= 0.5) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', x, y - 70, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 24) {
      finished = true; ok = true; hitStop = 0.22;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 360 });
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING && !finished) { tracing = false; game.audio.play('se_tap', 0.05); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawPath() {
    // 光跡は時間とともに薄くなる(見せて→消える演出)
    var fadeAlpha = Math.max(0.14, 1 - fadeT / MAX_TIME);
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathEdge, HALF * 2 + 14);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathDim, HALF * 2, fadeAlpha * 0.7);
    }
    // 既になぞった区間はくっきり光らせる
    var acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      if (acc >= progress) break;
      var segEnd = Math.min(SEG_LEN[k - 1], progress - acc);
      var t = SEG_LEN[k - 1] > 0 ? segEnd / SEG_LEN[k - 1] : 0;
      var ex = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
      var ey = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
      game.draw.line(PTS[k - 1].x, PTS[k - 1].y, ex, ey, C.pathLit, HALF * 2 * 0.6);
      acc += SEG_LEN[k - 1];
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.55, C.accent);
    game.draw.sprite(SPIRIT, { '#': C.gold }, PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 9, { anchor: 'center' });
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; fadeT = 0; milestoneShown = false; }
    fadeT = cyc;
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
    var p = ptAtLen(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.2;
    if (target > progress) progress = target;
    cursorX = p.x; cursorY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(cursorX, cursorY, 15, C.pathLit);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawPath();
      game.draw.circle(cursorX, cursorY, 15, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct + ' / 100', W / 2, H * 0.12, 28, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.16, 24, C.white);
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
    } else if (!finished) {
      fadeT += dt;
      if (fadeT >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        shake = 0.3; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.circle(cursorX, cursorY, 15, tracing ? C.pathLit : C.accent);

    var pctNow = Math.round((progress / TOTAL_LEN) * 100);
    txt(pctNow + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - fadeT / MAX_TIME), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
