// I-GBA-0056-marble-tray-maze.js
// マーブルトレイ — 木彫りの溝の中で玉を指でなぞり転がし、ゴールの穴まで届かせる
// 操作: 玉に触れたまま溝からはみ出さないよう指でなぞって進める
// 終わり: ゴールの穴に届けば成功。溝の外に出せば失敗
// @mechanic: guide_path
// @theme: marble_tray_maze
// 世界観: 職人が彫った木製トレイ。彫られた一本溝の中を鉄球が転がり、入口の穴からゴールの穴まで導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目テクスチャ、gradientで厚みを作る
  var C = {
    bg: '#8a5a34', bg2: '#6b4423', wood: '#a9713f', woodDark: '#5c3a1e',
    groove: '#3a2312', grooveEdge: '#22140a', marble: '#d8dce2', marbleDark: '#8a8f98',
    accent: '#ffb020', good: '#5fd76a', bad: '#ff5c5c', gold: '#ffd23f', white: '#fff6e8', ink: '#1a0f06',
  };

  var GAME_TITLE = 'MARBLE TRAY';
  var HALF = 66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.84 },
    { x: W * 0.22, y: H * 0.78 },
    { x: W * 0.22, y: H * 0.62 },
    { x: W * 0.78, y: H * 0.62 },
    { x: W * 0.78, y: H * 0.46 },
    { x: W * 0.3, y: H * 0.46 },
    { x: W * 0.3, y: H * 0.3 },
    { x: W * 0.68, y: H * 0.26 },
    { x: W * 0.5, y: H * 0.16 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, marbleX, marbleY, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CARVED_OWL = ['.####.', '##..##', '#.##.#', '##..##', '.####.', '..##..'];

  function woodBg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 24; i++) {
      var yy = i * (H / 24);
      game.draw.rect(0, yy, W, 3, i % 2 === 0 ? '#ffffff07' : '#00000009');
    }
    game.draw.rect(30, 30, W - 60, H - 60, C.woodDark, 0.15);
    // 職人が彫り込んだ木製フクロウの飾り(トレイの隅の目印モチーフ)
    game.draw.sprite(CARVED_OWL, { '#': C.woodDark }, W * 0.14, H * 0.12, 12, { anchor: 'center' });
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.grooveEdge, HALF * 2 + 14);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.groove, HALF * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.55, C.accent);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.55, C.gold);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.3, C.ink);
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
    progress = 0; marbleX = PTS[0].x; marbleY = PTS[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) {
        game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
    }
    marbleX = x; marbleY = y;
    if (progress >= TOTAL_LEN - 18) {
      finished = true; ok = true; hitStop = 0.25;
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
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.4) * TOTAL_LEN);
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
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.4;
    progress = Math.max(progress || 0, target);
    marbleX = px; marbleY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      woodBg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(marbleX + 3, marbleY + 3, 15, C.marbleDark, 0.5);
      game.draw.circle(marbleX, marbleY, 15, C.marble);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      woodBg();
      drawPath();
      game.draw.circle(marbleX, marbleY, 15, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      var pctR = Math.round((progress / TOTAL_LEN) * 100);
      txt(pctR + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
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

    woodBg();
    drawPath();
    if (!finished) { game.draw.circle(marbleX + 3, marbleY + 3, 15, C.marbleDark, 0.5); game.draw.circle(marbleX, marbleY, 15, C.marble); }

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
