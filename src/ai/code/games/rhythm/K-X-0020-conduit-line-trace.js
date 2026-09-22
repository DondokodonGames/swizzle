// K-X-0020-conduit-line-trace.js
// コンジットライントレース — 浮かび上がる導線を、火花をそのままなぞって指でスライドさせる
// 操作: パネルに浮かぶ一本の導線を、始点から終点まで指でなぞって電流を通す
// 終わり: 終点まで通電すれば成功。導線から外れれば失敗。時間切れも失敗
// @mechanic: trace
// @theme: circuit_conduit_trace
// 世界観: 制御パネルの保守技師。浮かび上がった一本の導線を指でなぞり、火花を終点まで導いて回路を復旧させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラットカラー、太いベタ塗り、影は最小限
  var C = {
    bg: '#eef3f9', bg2: '#dbe6f4', path: '#c3d5ec', pathEdge: '#9fb7d9',
    accent: '#ff7a45', good: '#2ecc71', bad: '#ff4d4f', gold: '#ffb020',
    white: '#ffffff', ink: '#1c2b3a',
  };

  var GAME_TITLE = 'WIRE TRACE';
  var MAX_TIME = 11;
  var HALF_WIDE = 72, HALF_TIGHT = 44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.22, y: H * 0.82 },
    { x: W * 0.22, y: H * 0.66 },
    { x: W * 0.78, y: H * 0.60 },
    { x: W * 0.78, y: H * 0.44 },
    { x: W * 0.30, y: H * 0.38 },
    { x: W * 0.30, y: H * 0.22 },
    { x: W * 0.70, y: H * 0.16 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, done, endWait, finished, playT, halfPopped;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPARK = ['.#.', '###', '.#.'];

  function panelBg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var r = 0; r < 5; r++) game.draw.rect(0, r * (H / 5), W, 3, '#ffffff90');
    game.draw.sprite(['..#..', '.###.', '#####'], { '#': C.accent }, W * 0.5, H * 0.92, 10, { anchor: 'center' });
  }

  function curTol() { return progress > TOTAL_LEN * 0.6 ? HALF_TIGHT : HALF_WIDE; }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      var tight = (j - 1) / (PTS.length - 1) > 0.6;
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathEdge, (tight ? HALF_TIGHT : HALF_WIDE) * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, (tight ? HALF_TIGHT : HALF_WIDE) * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 40, C.accent);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 40, C.gold);
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
    done = false; endWait = 0; finished = false; playT = 0; halfPopped = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > curTol()) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      finish();
      return;
    }
    if (r.len > progress) {
      progress = r.len;
      if (!halfPopped && progress / TOTAL_LEN >= 0.5) {
        halfPopped = true;
        game.fx.popup('HALF!', x, y - 60, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      finished = true; ok = true; hitStop = 0.12;
      var fast = playT < 5.5;
      game.feedback.good(x, y, { text: fast ? 'PERFECT' : 'CLEAR', color: fast ? C.gold : C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
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
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 2.3) * TOTAL_LEN);
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
    demo.gx = px + Math.sin(game.time.elapsed * 2.5) * 6;
    demo.gy = py + Math.cos(game.time.elapsed * 2.1) * 6;
    demo.press = cyc < 2.3;
    progress = Math.max(progress || 0, target);
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      panelBg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(SPARK, { '#': C.accent }, cursorX, cursorY, 8, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      panelBg();
      drawPath();
      game.draw.sprite(SPARK, { '#': ok ? C.good : C.bad }, cursorX, cursorY, 8, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.13, 30, C.accent);
      if (!ok) txt('あと' + (100 - Math.round((progress / TOTAL_LEN) * 100)) + '%!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
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
      playT += dt;
      if (playT > MAX_TIME) {
        finished = true; ok = false; hitStop = 0.2; shake = 0.2;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    panelBg();
    drawPath();
    if (!finished) game.draw.sprite(SPARK, { '#': C.accent }, cursorX, cursorY, 9, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#ffffffb0', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (MAX_TIME - playT) / MAX_TIME), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F#4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
