// D-20172021-0070-hedge-creeper-thread.js
// ヘッジ・クリーパー・スレッド — 指に導かれるまま蔓を伸ばし、迫る生垣の葉に触れず隙間を通す
// 操作: 蔓の先端から指を離さず、隙間の中心をなぞるようにドラッグして伸ばし続ける
// 終わり: 終点まで隙間を通しきれば成功。生垣の葉に触れる/時間切れで失敗
// @mechanic: guide_path
// @theme: hedge_creeper_thread
// 世界観: 温室の蔓性植物が、指に導かれるまま伸びていく蔓を両側から迫る生垣の隙間へ通し、隣の鉢からのびる蔓に触れないよう終点まで伸ばし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 伸ばせた区間数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、市松ディザで中間色、線の太さで距離と力を語る
  var STYLE = { bg: ['#f0ede4', '#e0dcd0'], main: ['#1a1a1a', '#3a3a3a'], accent: ['#2bd67b', '#ff4d5e'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], hedge: '#1a1a1a', hedgePinch: '#3a3a3a',
    path: '#c8c4b6', pathDone: '#2bd67b',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#c99a2a', ink: '#1a1a1a', white: '#ffffff',
  };

  var GAME_TITLE = 'HEDGE THREAD';
  var TIME_LIMIT = 16;
  var HALF = 66;
  var PINCH_HALF = 38;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.16 },
    { x: W * 0.25, y: H * 0.28 },
    { x: W * 0.72, y: H * 0.40 },
    { x: W * 0.30, y: H * 0.52 },
    { x: W * 0.65, y: H * 0.64 },
    { x: W * 0.42, y: H * 0.74 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }
  var PINCH_AT = TOTAL_LEN * 0.6;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GARDENER = ['.##.', '####', '.##.', '.##.'];
  var TIP = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 40; i++) {
      var nx = (i * 233) % W, ny = (i * 419) % H;
      if (((Math.floor(nx / 12) + Math.floor(ny / 12)) % 2) === 0) game.draw.rect(nx, ny, 4, 4, '#000000', 0.05);
    }
    game.draw.sprite(GARDENER, { '#': C.ink }, W * 0.85, H * 0.88, 10, { anchor: 'center' });
  }

  function widthAt(len) {
    var d = Math.abs(len - PINCH_AT);
    if (d < 90) return PINCH_HALF + (HALF - PINCH_HALF) * (d / 90);
    return HALF;
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var ax = PTS[i - 1].x, ay = PTS[i - 1].y, bx = PTS[i].x, by = PTS[i].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var dist = Math.hypot(px - cx, py - cy);
      if (dist < best) { best = dist; bestLen = acc + t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function drawTrack(prog) {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, HALF * 2);
    }
    // 迫る生垣(隙間の縁)を帯で表現
    var steps = 40;
    for (var s = 0; s < steps; s++) {
      var len0 = TOTAL_LEN * (s / steps), len1 = TOTAL_LEN * ((s + 1) / steps);
      var mid = (len0 + len1) / 2;
      var w = widthAt(mid);
      if (w < HALF - 2) {
        var pt = pointAtLen(mid);
        game.draw.circle(pt.x, pt.y, HALF, C.hedgePinch, 0.35);
      }
    }
    var acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      var segStart = acc, segEnd = acc + SEG_LEN[k - 1];
      if (prog > segStart) {
        var t = Math.min(1, (prog - segStart) / SEG_LEN[k - 1]);
        var ex = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
        var ey = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
        game.draw.line(PTS[k - 1].x, PTS[k - 1].y, ex, ey, C.pathDone, 14);
      }
      acc = segEnd;
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 26, C.pathDone);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 26, prog >= TOTAL_LEN - 10 ? C.pathDone : C.path);
  }

  function pointAtLen(len) {
    var acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      if (len <= acc + SEG_LEN[k - 1]) {
        var t = SEG_LEN[k - 1] > 0 ? (len - acc) / SEG_LEN[k - 1] : 0;
        return { x: PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t, y: PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t };
      }
      acc += SEG_LEN[k - 1];
    }
    return PTS[PTS.length - 1];
  }

  var progress, cursorX, cursorY, timeLeft, done, endWait, finished, ready, hitStop, shake, pinchWarned;

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pinchWarned = false;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var r = evalPoint(x, y);
    var w = widthAt(r.len);
    if (r.dist > w) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      progress = r.len;
      if (!pinchWarned && progress > PINCH_AT - 130 && progress < PINCH_AT) {
        pinchWarned = true;
        game.fx.popup('NICE', x, y - 70, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 12) {
      finished = true; ok = true; hitStop = 0.3;
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
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { progress = 0; pinchWarned = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
    var pt = pointAtLen(target);
    demo.gx = pt.x; demo.gy = pt.y; demo.press = cyc < 3.2;
    if (target > progress) progress = target;
    cursorX = pt.x; cursorY = pt.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTrack(progress);
      game.draw.circle(cursorX, cursorY, 16, C.pathDone);
      game.draw.sprite(TIP, { '#': '#ffffff' }, cursorX, cursorY, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTrack(progress);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(pct + ' %', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctScore = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pctScore, { pct: pctScore });
        else game.end.failure({ pct: pctScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTrack(progress);
    if (!finished) {
      game.draw.circle(cursorX, cursorY, 16, C.pathDone);
      game.draw.sprite(TIP, { '#': '#ffffff' }, cursorX, cursorY, 10, { anchor: 'center' });
    }

    var pctNow = Math.round((progress / TOTAL_LEN) * 100);
    txt(pctNow + ' %', W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.path, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 118, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
