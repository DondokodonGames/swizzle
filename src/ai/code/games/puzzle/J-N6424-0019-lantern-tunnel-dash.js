// J-N6424-0019-lantern-tunnel-dash.js
// ランタントンネルダッシュ — 崩れかけた坑道を一本の綱でたどり、出口の明かりへ駆け抜ける
// 操作: 入口の起点から指を離さず、分岐する坑道の中心線をはみ出さないよう出口までなぞる
// 終わり: 制限時間内に出口へ届けば成功。壁に触れる/時間切れで失敗
// @mechanic: guide_path
// @theme: tunnel_lantern_escape
// 世界観: 明かり一つを頼りに坑道を進む地底探査士が、崩落までの猶予時間内に分岐だらけの坑道を一本のロープで結び、出口の光を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + たどり着いた坑道の進捗
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 黒白基調に一色のインク差し、影は使わない
  var C = {
    bg: '#12100c', bg2: '#050403', wall: '#3a352c', path: '#232019', pathDone: '#e8b34a',
    lantern: '#ffd77a', lanternCore: '#fff4d0', exit: '#8fe3ff',
    good: '#7be36a', bad: '#ff5a4d', gold: '#e8b34a', ink: '#f4ecd8', white: '#f4ecd8',
  };

  var GAME_TITLE = 'TUNNEL DASH';
  var TIME_LIMIT = 16;
  var HALF = 82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.20, y: H * 0.24 },
    { x: W * 0.70, y: H * 0.20 },
    { x: W * 0.24, y: H * 0.40 },
    { x: W * 0.76, y: H * 0.52 },
    { x: W * 0.30, y: H * 0.66 },
    { x: W * 0.68, y: H * 0.78 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, nodesHit, halfCalled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var EXPLORER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.lantern, pulse * 0.35);
    var bob = Math.sin(game.time.elapsed * 2.1) * 6;
    game.draw.sprite(EXPLORER, { '#': C.lantern }, W * 0.88, H * 0.88 + bob, 10, { anchor: 'center' });
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 44 + Math.sin(game.time.elapsed * 3) * 6, C.exit, 0.35);
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

  function drawTunnel(prog) {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.wall, HALF * 2);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, HALF * 2 - 20);
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
    for (var s = 0; s < PTS.length; s++) {
      var segAcc = 0;
      for (var q = 0; q < s; q++) segAcc += SEG_LEN[q];
      var doneS = prog >= segAcc - 4;
      game.draw.circle(PTS[s].x, PTS[s].y, 20, doneS ? C.pathDone : C.wall);
    }
  }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; nodesHit = 1; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.25;
      game.fx.flash(C.bad, 0.2);
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var newNodes = Math.min(PTS.length, 1 + Math.floor((r.len / TOTAL_LEN) * (PTS.length - 1) + 0.02));
      if (newNodes > nodesHit) {
        nodesHit = newNodes;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_milestone', 0.3);
      }
      progress = r.len;
      if (!halfCalled && progress >= TOTAL_LEN * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', x, y - 70, { color: C.gold, size: 34 });
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 14) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.exit, count: 22, speed: 400 });
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
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; nodesHit = 1; halfCalled = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.0) * TOTAL_LEN);
    var acc = 0, px = PTS[0].x, py = PTS[0].y;
    for (var k = 1; k < PTS.length; k++) {
      if (target <= acc + SEG_LEN[k - 1]) {
        var t = SEG_LEN[k - 1] > 0 ? (target - acc) / SEG_LEN[k - 1] : 0;
        px = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
        py = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
        break;
      }
      acc += SEG_LEN[k - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.0;
    if (target > progress) progress = target;
    nodesHit = Math.min(PTS.length, 1 + Math.floor((progress / TOTAL_LEN) * (PTS.length - 1) + 0.02));
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTunnel(progress);
      game.draw.circle(cursorX, cursorY, 12, C.pathDone);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTunnel(progress);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(nodesHit + ' / ' + PTS.length, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, PTS.length - nodesHit) + '!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(nodesHit, { nodes: nodesHit, total: PTS.length });
        else game.end.failure({ nodes: nodesHit, total: PTS.length });
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
    drawTunnel(progress);
    if (!finished) game.draw.circle(cursorX, cursorY, 12, C.pathDone);

    txt(nodesHit + ' / ' + PTS.length, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.wall, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
