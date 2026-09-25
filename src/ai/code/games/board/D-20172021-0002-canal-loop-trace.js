// D-20172021-0002-canal-loop-trace.js
// キャナルループトレース — 砂庭の水路を指でなぞり、母屋から一周させて庭を潤す
// 操作: 母屋から水路の溝をなぞり、一周してまた母屋に戻るまで指を離さない
// 終わり: 溝からはみ出さず一周できれば成功。溝の外に触れれば失敗
// @mechanic: trace
// @theme: sand_garden_canal
// 世界観: 静かな砂庭の母屋に暮らす庭師。細い水路の溝を丁寧になぞり、一筆書きで一周させて庭全体に水を巡らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞり終えた進行度%
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: ほぼ2色の墨絵調、線と余白のコントラストのみ
  var STYLE = { bg: ['#eae4d6', '#d8d0bc'], main: ['#2a2620', '#4a4438'], accent: ['#8a6a3a', '#b03030'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], sand: '#e2dac6', sandLine: '#cabf9e',
    canal: '#4a4438', canalEdge: '#2a2620', water: STYLE.accent[0],
    gold: '#b8863a', good: '#3a6a3a', bad: STYLE.accent[1], white: '#2a2620', ink: '#eae4d6',
  };

  var GAME_TITLE = 'CANAL LOOP';
  var HALF = 56;
  var TIME_LIMIT = 13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.5 },
    { x: W * 0.5, y: H * 0.24 },
    { x: W * 0.76, y: H * 0.3 },
    { x: W * 0.82, y: H * 0.54 },
    { x: W * 0.66, y: H * 0.72 },
    { x: W * 0.34, y: H * 0.72 },
    { x: W * 0.18, y: H * 0.54 },
    { x: W * 0.24, y: H * 0.3 },
    { x: W * 0.5, y: H * 0.24 },
    { x: W * 0.5, y: H * 0.5 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: color === C.white ? '#00000030' : '#ffffff40', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HOUSE_SPRITE = ['#####', '##.##', '#####'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#000000', 0.02 + 0.02 * Math.sin(e * 1.3));
    for (var gx = 0; gx < 7; gx++) game.draw.line(W * (gx / 6), H * 0.06, W * (gx / 6), H * 0.9, C.sandLine, 2);
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

  var progress, cursorX, cursorY, done, endWait, finished, elapsedT, milestoneShown;
  var ready, hitStop, shake;

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; elapsedT = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
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
      progress = r.len;
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      if (!milestoneShown && pct >= 50) {
        milestoneShown = true;
        game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
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

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
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
    progress = Math.max(progress || 0, target);
    cursorX = px; cursorY = py;
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.canalEdge, HALF * 2 + 8);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.canal, HALF * 2);
    }
    game.draw.sprite(HOUSE_SPRITE, { '#': C.water }, PTS[0].x, PTS[0].y, 12, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(cursorX, cursorY, 14, C.water);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.canalEdge);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.canalEdge);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.circle(cursorX, cursorY, 14, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var pct2 = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct2 + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, 100 - pct2) + '%!', W / 2, H * 0.18, 24, C.canalEdge);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.canalEdge);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct3 = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct3, { pct: pct3 }); else game.end.failure({ pct: pct3 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedT += dt;
      if (elapsedT >= TIME_LIMIT) {
        finished = true; ok = false; hitStop = 0.15;
        game.feedback.bad(cursorX, cursorY, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.circle(cursorX, cursorY, 14, C.water);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 30, C.canalEdge);
    game.draw.rect(60, 150, W - 120, 16, C.canalEdge, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (TIME_LIMIT - elapsedT) / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 96, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
