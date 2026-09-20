// GH-PS-0081-maze-trace.js
// メイズトレース — 見下ろしの迷路を指でなぞって出口へ。壁に触れたら終わり
// 操作: 入口から出口まで、通路からはみ出さないよう指でなぞる
// 終わり: 出口に着けば成功。壁に触れれば失敗
// @mechanic: trace
// @theme: overhead_maze
// 世界観: 見下ろしの石造りの迷路。入口から出口まで一本の通路が曲がりくねる。通路の外は壁で、触れれば失格
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#141018', wall: '#241c2c', path: '#3a2c48', pathEdge: '#5a4470',
    accent: '#ff3d6a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'MAZE TRACE';
  var HALF = 74;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.86 },
    { x: W * 0.5, y: H * 0.72 },
    { x: W * 0.25, y: H * 0.72 },
    { x: W * 0.25, y: H * 0.58 },
    { x: W * 0.75, y: H * 0.58 },
    { x: W * 0.75, y: H * 0.42 },
    { x: W * 0.35, y: H * 0.42 },
    { x: W * 0.35, y: H * 0.28 },
    { x: W * 0.5, y: H * 0.28 },
    { x: W * 0.5, y: H * 0.16 },
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

  var TORCH_SPRITE = ['.#.', '###', '.#.', '.#.'];

  function mazeBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#0c0a10']]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8), W, 2, '#ffffff06');
    game.draw.sprite(TORCH_SPRITE, { '#': C.accent }, W * 0.5, H * 0.94, 8, { anchor: 'center' });
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathEdge, HALF * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, HALF * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.6, C.accent);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.6, C.gold);
  }

  // 点から線分への距離 + その線分上での進捗(0-1)
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
      finished = true; ok = false; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
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
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
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
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
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
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.2;
    progress = Math.min(progress || 0, target);
    if (progress < target) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      mazeBg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(cursorX, cursorY, 14, C.accent);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 48, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      mazeBg();
      drawPath();
      game.draw.circle(cursorX, cursorY, 14, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.12, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success({ pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    mazeBg();
    drawPath();
    if (!finished) game.draw.circle(cursorX, cursorY, 14, C.accent);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
