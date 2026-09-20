// I-Wii-0006-fuse-cord-trace.js
// ヒューズコードトレース — 基板に這う導線を先端から終端まで、外れないよう指でなぞる
// 操作: 導線の始点から、そのまま指で導線の上をなぞって終点まで届かせる。線から外れたら失敗
// 終わり: 終端の端子に届けば成功。線の外へ指が外れれば失敗
// @mechanic: trace
// @theme: circuit_fuse_bench
// 世界観: 解体待ちの旧型制御盤。整備士が焼けかけた導線をたどり、切れる前に終端の端子まで指でつないで安全を確かめる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細い線、テキスト枠UI、市松ディザで中間色
  var C = {
    bg: '#041a08', wire: '#0c3a18', wireEdge: '#083012', path: '#1a5a2a',
    pathEdge: '#2f8a44', accent: '#3dff6a', good: '#3dff6a', bad: '#ff5040',
    gold: '#ffe14d', white: '#c8ffd6', ink: '#020c04',
  };

  var GAME_TITLE = 'FUSE TRACE';
  var HALF = 44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.20, y: H * 0.20 },
    { x: W * 0.20, y: H * 0.34 },
    { x: W * 0.62, y: H * 0.34 },
    { x: W * 0.62, y: H * 0.48 },
    { x: W * 0.30, y: H * 0.48 },
    { x: W * 0.30, y: H * 0.62 },
    { x: W * 0.75, y: H * 0.62 },
    { x: W * 0.75, y: H * 0.78 },
    { x: W * 0.5, y: H * 0.78 },
    { x: W * 0.5, y: H * 0.90 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TERM_SPRITE = ['##', '##'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#062010'], [1, C.bg]]);
    for (var gx = 0; gx < W; gx += 60) game.draw.line(gx, 0, gx, H, '#ffffff05', 1);
    for (var gy = 0; gy < H; gy += 60) game.draw.line(0, gy, W, gy, '#ffffff05', 1);
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathEdge, HALF * 2 + 6);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, HALF * 2);
    }
    game.draw.sprite(TERM_SPRITE, { '#': C.accent }, PTS[0].x, PTS[0].y, 14, { anchor: 'center' });
    game.draw.sprite(TERM_SPRITE, { '#': C.gold }, PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 14, { anchor: 'center' });
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
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      finished = true; ok = true; hitStop = 0.15;
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

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.6) * TOTAL_LEN);
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
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.6;
    progress = Math.max(progress || 0, target);
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(cursorX, cursorY, 12, C.accent);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.circle(cursorX, cursorY, 12, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.12, 28, C.gold);
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
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.circle(cursorX, cursorY, 12, C.accent);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['G4', 0.3], ['C5', 0.3], ['G4', 0.6]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
