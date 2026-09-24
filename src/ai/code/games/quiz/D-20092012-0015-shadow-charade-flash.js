// D-20092012-0015-shadow-charade-flash.js
// シャドウチャレード — スポットライトに浮かぶお題の輪郭を時間内になぞりきり、観客のシルエットに閃かせる
// 操作: 光る点線の輪郭を指でなぞる。線から離れすぎず、制限時間内になぞりきる
// 終わり: 制限時間内に輪郭をなぞりきれば成功(観客が閃く)。時間切れなら失敗
// @mechanic: trace
// @theme: silhouette_charade_stage
// 世界観: 幕の下りたステージ裏。演者が布の上に浮かぶお題の輪郭を指でなぞって完成させ、客席のシルエットに一瞬で伝える一発芸
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞりきった輪郭の割合
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、太いインクの輪郭線、中間色を使わない
  var C = {
    bg: '#f2efe6', bg2: '#e6e0d0', ink: '#141210', line: '#141210', lineGlow: '#00000022',
    good: '#141210', bad: '#141210', gold: '#141210', white: '#f2efe6', accent: '#d43c2e',
  };

  var GAME_TITLE = 'SHADOW FLASH';
  var TIME_LIMIT = 10;
  var TOL = 66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // お題: 星の輪郭(折れ線)
  var PTS = [
    { x: W * 0.5, y: H * 0.22 },
    { x: W * 0.60, y: H * 0.42 },
    { x: W * 0.80, y: H * 0.44 },
    { x: W * 0.65, y: H * 0.58 },
    { x: W * 0.70, y: H * 0.76 },
    { x: W * 0.5, y: H * 0.66 },
    { x: W * 0.30, y: H * 0.76 },
    { x: W * 0.35, y: H * 0.58 },
    { x: W * 0.20, y: H * 0.44 },
    { x: W * 0.40, y: H * 0.42 },
    { x: W * 0.5, y: H * 0.22 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var GUESSER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(W * 0.5, H * 0.42, 460, '#00000006');
  }

  function drawGuesser(reacting) {
    var bob = Math.sin(game.time.elapsed * 3) * 10;
    var scale = reacting ? 16 : 12;
    game.draw.sprite(GUESSER, { '#': C.ink }, W * 0.5, H * 0.90 + bob * 0.4, scale, { anchor: 'center' });
  }

  function drawOutline(progress) {
    for (var j = 1; j < PTS.length; j++) {
      var blink = Math.floor(game.time.elapsed * 6 + j) % 2 === 0;
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, blink ? C.lineGlow : '#00000010', 26);
    }
    var acc = 0;
    for (var j = 1; j < PTS.length; j++) {
      var segFrom = acc, segTo = acc + SEG_LEN[j - 1];
      if (progress > segFrom) {
        var t = Math.min(1, (progress - segFrom) / SEG_LEN[j - 1]);
        var ex = PTS[j - 1].x + (PTS[j].x - PTS[j - 1].x) * t;
        var ey = PTS[j - 1].y + (PTS[j].y - PTS[j - 1].y) * t;
        game.draw.line(PTS[j - 1].x, PTS[j - 1].y, ex, ey, C.line, 14);
      }
      acc += SEG_LEN[j - 1];
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

  var progress, cursorX, cursorY, done, endWait, finished, timeLeft, warned, milestones;
  var ready, hitStop, shake;

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; timeLeft = TIME_LIMIT; warned = false;
    milestones = [false, false, false];
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (finished || done || ready > 0) return;
    var r = evalPoint(x, y);
    if (r.dist > TOL) {
      game.feedback.bad(x, y, { text: '', sound: 'se_bad', shake: 0 });
      cursorX = x; cursorY = y;
      return;
    }
    if (r.len > progress) {
      progress = r.len;
      var pct = progress / TOTAL_LEN;
      if (pct > 0.33 && !milestones[0]) { milestones[0] = true; game.fx.popup(Math.round(pct * 100) + '%', x, y - 60, { color: C.accent, size: 34 }); game.audio.play('se_milestone', 0.3); }
      else if (pct > 0.66 && !milestones[1]) { milestones[1] = true; game.fx.popup(Math.round(pct * 100) + '%', x, y - 60, { color: C.accent, size: 34 }); game.audio.play('se_milestone', 0.3); }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 24) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'NICE', color: C.accent });
      game.fx.burst(x, y, { color: C.accent, count: 20, speed: 380 });
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
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; milestones = [false, false, false]; }
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
    if (progress < target) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOutline(progress);
      drawGuesser(progress / TOTAL_LEN > 0.9);
      game.draw.circle(cursorX, cursorY, 14, C.accent);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawOutline(progress);
      drawGuesser(ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.accent : C.ink);
      var pct2 = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct2 + ' / ' + 100, W / 2, H * 0.13, 32, C.ink);
      if (!ok) txt('あと' + (100 - pct2) + '%!', W / 2, H * 0.18, 26, C.ink);
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
      timeLeft -= dt;
      if (!warned && timeLeft <= 2.5) warned = true;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawOutline(progress);
    drawGuesser(false);
    if (!finished) game.draw.circle(cursorX, cursorY, 14, C.accent);

    var pctNow = Math.round((progress / TOTAL_LEN) * 100);
    txt(pctNow + ' / ' + 100, W / 2, H * 0.055, 30, C.ink);
    var timeBlink = warned && Math.floor(game.time.elapsed * 6) % 2 === 0;
    txt(Math.ceil(timeLeft) + 's', W * 0.85, H * 0.055, 28, timeBlink ? C.accent : C.ink);
    game.draw.rect(60, 118, W - 120, 12, C.ink, 0.15);
    game.draw.rect(60, 118, (W - 120) * (progress / TOTAL_LEN), 12, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
