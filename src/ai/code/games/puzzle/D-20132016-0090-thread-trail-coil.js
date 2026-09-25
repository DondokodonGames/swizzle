// D-20132016-0090-thread-trail-coil.js
// スレッドトレイルコイル — 裁縫台の上で糸を導き、自分の糸跡と2本の迷い糸を避けて目標の長さまで縫う
// 操作: 針先を指でドラッグして誘導する。伸びた自分の糸跡と迷い糸(AI)に触れないよう進む
// 終わり: 目標の長さまで糸を伸ばせば成功。自分の糸跡か迷い糸に触れれば失敗
// @mechanic: guide_path
// @theme: sewing_workshop_thread
// 世界観: 裁縫台の上の一本針。生地の上で糸を引きながら進み、伸びた自分の糸跡と迷い込む2本の余り糸を避けて縫い進む職人芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 縫い進めた長さ(%)
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度グリーン基調の携帯機液晶風、くっきりした4色
  var STYLE = { bg: ['#1c2b1a', '#0e1a0d'], main: ['#7bbd6a', '#3f6b38'], accent: ['#e8d86a', '#d94f4f'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], cloth: '#24361f', clothLine: '#2f4429',
    thread: STYLE.main[0], threadDark: STYLE.main[1], decoy: '#c96a8a', decoyDark: '#7a3a4e',
    gold: STYLE.accent[0], bad: '#e05a4a', good: '#7bd66a', white: '#eef5e6', ink: '#0a120a',
  };

  var GAME_TITLE = 'THREAD COIL';
  var HALF = 70;
  var TIME_LIMIT = 19;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.84 },
    { x: W * 0.22, y: H * 0.78 },
    { x: W * 0.22, y: H * 0.62 },
    { x: W * 0.78, y: H * 0.58 },
    { x: W * 0.78, y: H * 0.42 },
    { x: W * 0.28, y: H * 0.38 },
    { x: W * 0.28, y: H * 0.24 },
    { x: W * 0.5, y: H * 0.18 },
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

  var NEEDLE = ['.#.', '###', '.#.'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    for (var gx = 0; gx < 6; gx++) game.draw.line(W * (gx / 5), H * 0.1, W * (gx / 5), H * 0.92, C.clothLine, 2);
    for (var gy = 0; gy < 8; gy++) game.draw.line(W * 0.02, H * (0.1 + gy * 0.1), W * 0.98, H * (0.1 + gy * 0.1), C.clothLine, 2);
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

  function ptAt(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (len - acc) / SEG_LEN[i - 1] : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
  }

  var progress, cursorX, cursorY, done, endWait, finished, elapsedT, decoys, halfPass, milestoneShown, nearGap;
  var ready, hitStop, shake, telegraphT;

  function newDecoy(seed) {
    return { off: seed, speed: 0.16 + seed * 0.05, len: TOTAL_LEN * 0.5, dir: 1, lastPulse: 0 };
  }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; elapsedT = 0;
    ready = 0.8; hitStop = 0; shake = 0; telegraphT = 0;
    halfPass = false; milestoneShown = false; nearGap = TOTAL_LEN;
    decoys = [newDecoy(0.15), newDecoy(0.55)];
  }

  function stepDecoys(dt) {
    for (var i = 0; i < decoys.length; i++) {
      var dc = decoys[i];
      dc.off += dc.dir * dc.speed * dt;
      if (dc.off > 1) { dc.off = 1; dc.dir = -1; }
      if (dc.off < 0) { dc.off = 0; dc.dir = 1; }
      dc.lastPulse += dt;
    }
  }

  function decoyPoint(dc) {
    return ptAt(dc.off * TOTAL_LEN);
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
    for (var i = 0; i < decoys.length; i++) {
      var dp = decoyPoint(decoys[i]);
      if (Math.hypot(x - dp.x, y - dp.y) < 46) {
        finished = true; ok = false; hitStop = 0.15;
        game.feedback.bad(x, y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (!milestoneShown && afterPct >= 50) {
        milestoneShown = true;
        game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      nearGap = TOTAL_LEN - progress;
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
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; decoys = [newDecoy(0.1), newDecoy(0.6)]; }
    stepDecoys(dt);
    var target = Math.min(TOTAL_LEN, (cyc / 3.6) * TOTAL_LEN);
    var p = ptAt(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.6;
    progress = Math.max(progress || 0, target);
    cursorX = p.x; cursorY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var j = 1; j < PTS.length; j++) {
        game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.threadDark, HALF * 2 + 10);
      }
      var pp = ptAt(progress);
      game.draw.line(PTS[0].x, PTS[0].y, pp.x, pp.y, C.thread, 10);
      for (var i = 0; i < decoys.length; i++) {
        var dp = decoyPoint(decoys[i]);
        game.draw.circle(dp.x, dp.y, 30, C.decoyDark, 0.6);
        game.draw.circle(dp.x, dp.y, 18, C.decoy);
      }
      game.draw.sprite(NEEDLE, { '#': C.gold }, cursorX, cursorY, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j2 = 1; j2 < PTS.length; j2++) {
        game.draw.line(PTS[j2 - 1].x, PTS[j2 - 1].y, PTS[j2].x, PTS[j2].y, C.threadDark, HALF * 2 + 10);
      }
      game.draw.sprite(NEEDLE, { '#': ok ? C.good : C.bad }, cursorX, cursorY, 10, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedT += dt;
      stepDecoys(dt);
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
    for (var j3 = 1; j3 < PTS.length; j3++) {
      game.draw.line(PTS[j3 - 1].x, PTS[j3 - 1].y, PTS[j3].x, PTS[j3].y, C.threadDark, HALF * 2 + 10);
    }
    var pp2 = ptAt(progress);
    game.draw.line(PTS[0].x, PTS[0].y, pp2.x, pp2.y, C.thread, 10);
    for (var k = 0; k < decoys.length; k++) {
      var dpp = decoyPoint(decoys[k]);
      var blink = decoys[k].lastPulse % 0.6 < 0.3;
      if (blink) game.draw.circle(dpp.x, dpp.y, 44, C.bad, 0.25);
      game.draw.circle(dpp.x, dpp.y, 30, C.decoyDark, 0.6);
      game.draw.circle(dpp.x, dpp.y, 18, C.decoy);
    }
    if (!finished) game.draw.sprite(NEEDLE, { '#': C.gold }, cursorX, cursorY, 10, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (TIME_LIMIT - elapsedT) / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['A4', 0.3], ['E4', 0.3]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
