// J-N644-0005-paper-outline-trace.js
// ペーパーアウトライントレース — お手本の輪郭を指でなぞって切り抜き、線からのズレの少なさを競う
// 操作: 表示された宝石型の輪郭の始点から指を離さず、線に沿ってなぞって一周する
// 終わり: 一周をなぞりきり、平均のズレが許容内なら成功。線から大きく外れる/時間切れなら失敗
// @mechanic: trace
// @theme: paper_outline_cutting
// 世界観: 紙工房の型抜き職人見習いが、渡されたお手本の輪郭紙を刃物代わりの指でなぞり、寸分違わぬ形に切り出そうとする
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞれた一致率
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。線の太さで語る。危険のみ紅一色を例外使用
  var C = {
    bg: '#f4f4f0', bg2: '#e8e8e0', line: '#141414', lineDone: '#000000',
    good: '#141414', bad: '#c8102e', gold: '#141414', ink: '#141414', paper: '#ffffff',
  };

  var GAME_TITLE = 'OUTLINE TRACE';
  var TIME_LIMIT = 11;
  var HALF = 68;
  var ACC_NEEDED = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CRAFTER_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: C.paper, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W * 0.5, CY = H * 0.44, RAD = 300;
  var PTS = [];
  var N = 6;
  for (var i = 0; i < N; i++) {
    var a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    var r = i % 2 === 0 ? RAD : RAD * 0.55;
    PTS.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
  }
  PTS.push(PTS[0]); // 閉ループ
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var s = 1; s < PTS.length; s++) {
    var d = Math.hypot(PTS[s].x - PTS[s - 1].x, PTS[s].y - PTS[s - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var bob = Math.sin(game.time.elapsed * 2) * 6;
    game.draw.sprite(CRAFTER_SPRITE, { '#': C.ink }, W * 0.85, H * 0.88 + bob, 20, { anchor: 'center' });
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      var ax = PTS[k - 1].x, ay = PTS[k - 1].y, bx = PTS[k].x, by = PTS[k].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var dist = Math.hypot(px - cx, py - cy);
      if (dist < best) { best = dist; bestLen = acc + t * SEG_LEN[k - 1]; }
      acc += SEG_LEN[k - 1];
    }
    return { dist: best, len: bestLen };
  }

  function drawOutline(prog) {
    for (var k = 1; k < PTS.length; k++) {
      game.draw.line(PTS[k - 1].x, PTS[k - 1].y, PTS[k].x, PTS[k].y, C.line, HALF * 2);
    }
    var acc = 0;
    for (var j = 1; j < PTS.length; j++) {
      var segStart = acc, segEnd = acc + SEG_LEN[j - 1];
      if (prog > segStart) {
        var t = Math.min(1, (prog - segStart) / SEG_LEN[j - 1]);
        var ex = PTS[j - 1].x + (PTS[j].x - PTS[j - 1].x) * t;
        var ey = PTS[j - 1].y + (PTS[j].y - PTS[j - 1].y) * t;
        game.draw.line(PTS[j - 1].x, PTS[j - 1].y, ex, ey, C.lineDone, 14);
      }
      acc = segEnd;
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 20, C.lineDone);
  }

  var progress, cursorX, cursorY, devSum, devCount, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    devSum = 0; devCount = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function accuracy() {
    if (devCount === 0) return 100;
    var avgDev = devSum / devCount;
    return Math.max(0, Math.round(100 - (avgDev / HALF) * 100));
  }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF * 1.6) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    devSum += Math.min(HALF, r.dist); devCount++;
    if (r.len > progress) {
      var milestone = Math.floor((r.len / TOTAL_LEN) * 4);
      if (milestone > Math.floor((progress / TOTAL_LEN) * 4)) {
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_milestone', 0.3);
        if (!halfCalled && milestone >= 2) { halfCalled = true; game.fx.popup('HALFWAY!', x, y - 70, { color: C.gold, size: 32 }); }
      }
      progress = r.len;
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      var acc = accuracy();
      finished = true; hitStop = 0.3;
      if (acc >= ACC_NEEDED) {
        ok = true;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(x, y, { color: C.gold, count: 20, speed: 400 });
        game.audio.play('se_success', 0.5);
      } else {
        ok = false;
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_failure', 0.4);
      }
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
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
    if (cyc < dt || demo.t <= dt) { progress = 0; devSum = 0; devCount = 0; halfCalled = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.0) * TOTAL_LEN);
    var acc0 = 0, px = PTS[0].x, py = PTS[0].y;
    for (var k = 1; k < PTS.length; k++) {
      if (target <= acc0 + SEG_LEN[k - 1]) {
        var t = SEG_LEN[k - 1] > 0 ? (target - acc0) / SEG_LEN[k - 1] : 0;
        px = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
        py = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
        break;
      }
      acc0 += SEG_LEN[k - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.0;
    if (target > progress) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOutline(progress);
      game.draw.circle(cursorX, cursorY, 14, C.lineDone);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawOutline(progress);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(accuracy() + ' / 100', W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(accuracy(), { accuracy: accuracy() });
        else game.end.failure({ accuracy: accuracy() });
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
        game.feedback.bad(cursorX, cursorY, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawOutline(progress);
    if (!finished) game.draw.circle(cursorX, cursorY, 14, C.lineDone);

    txt(accuracy() + ' / 100', W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    game.draw.rect(60, 150, tbW, 16, '#c8c8c0', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, progress / TOTAL_LEN), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.5]], { tempo: 130, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
