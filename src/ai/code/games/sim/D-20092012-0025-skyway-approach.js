// D-20092012-0025-skyway-approach.js
// スカイウェイ・アプローチ — 指で描く進入路に小さな飛行機を沿わせ、横切る便を避けて滑走路へ導く
// 操作: 飛行機の近くを指で押さえて進入路の内側をなぞるようにドラッグし続ける。路の外に出ると失敗
// 終わり: 滑走路まで導けば成功。路からはみ出すか横切る便に触れれば失敗
// @mechanic: guide_path
// @theme: night_sky_approach
// 世界観: 夜間の小さな空港。着陸誘導員が一機の便を光の誘導路に沿わせ、横切る他機を避けながら滑走路まで導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 遠近感のある帯状レイヤー、地平線の光、疑似3D的な奥行き
  var C = {
    sky1: '#050818', sky2: '#0e1a3a', horizon: '#2a3a6a',
    corridor: '#123a4a', corridorEdge: '#2fd9e8', plane: '#ffe08a', planeDark: '#c99a2e',
    other: '#ff5566', otherGlow: '#6a1a26', gold: '#ffe066', good: '#4dff8a', bad: '#ff4d5e',
    white: '#eaf6ff', ink: '#040812',
  };

  var GAME_TITLE = 'SKYWAY APPROACH';
  var HALF = 84;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.18, y: H * 0.20 },
    { x: W * 0.42, y: H * 0.30 },
    { x: W * 0.30, y: H * 0.46 },
    { x: W * 0.62, y: H * 0.56 },
    { x: W * 0.46, y: H * 0.70 },
    { x: W * 0.5, y: H * 0.84 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, planeX, planeY, done, endWait, finished, ready, hitStop, shake, crossers;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLANE_SPRITE = ['..#..', '#####', '..#..', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.55, C.horizon], [1, C.sky1]]);
    for (var i = 0; i < 24; i++) {
      var sx = (i * 137) % W, sy = (i * 91) % (H * 0.5);
      game.draw.rect(sx, sy, 3, 3, '#ffffff22');
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

  function pointAtLen(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1] || i === PTS.length - 1) {
        var t = SEG_LEN[i - 1] > 0 ? Math.max(0, Math.min(1, (len - acc) / SEG_LEN[i - 1])) : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
  }

  function newCrossers() {
    return [
      { at: TOTAL_LEN * 0.38, t: 0, dur: 0.9, telegraphed: false, resolved: false, side: -1 },
      { at: TOTAL_LEN * 0.72, t: 0, dur: 0.85, telegraphed: false, resolved: false, side: 1 },
    ];
  }

  function initGame() {
    progress = 0; planeX = PTS[0].x; planeY = PTS[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    crossers = newCrossers();
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'OFF COURSE' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    for (var i = 0; i < crossers.length; i++) {
      var c = crossers[i];
      if (c.resolved || !c.telegraphed) continue;
      var cp = pointAtLen(c.at);
      if (Math.hypot(x - cp.x, y - cp.y) < 60 && c.t / c.dur > 0.3 && c.t / c.dur < 0.9) {
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(x, y, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
        return;
      }
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
    }
    planeX = x; planeY = y;
    if (progress >= TOTAL_LEN - 24) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'LANDED', color: C.good });
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

  function drawCrossers() {
    for (var i = 0; i < crossers.length; i++) {
      var c = crossers[i];
      if (c.resolved || progress < c.at - 260) continue;
      c.t += game.time.delta;
      var p = Math.min(1, c.t / c.dur);
      if (p > 0.25) c.telegraphed = true;
      if (p >= 1) { c.resolved = true; continue; }
      var cp = pointAtLen(c.at);
      var startX = c.side < 0 ? -80 : W + 80;
      var cx = startX + (cp.x - startX) * p;
      if (c.telegraphed && p < 0.9) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(cp.x, cp.y, 70, C.bad, 0.3);
      }
      game.draw.circle(cx, cp.y, 20, C.otherGlow);
      game.draw.sprite(PLANE_SPRITE, { '#': C.other }, cx, cp.y, 8, { anchor: 'center', flipX: c.side > 0 });
    }
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.corridor, HALF * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.corridorEdge, 4);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.5, C.corridorEdge);
    game.draw.rect(PTS[PTS.length - 1].x - 60, PTS[PTS.length - 1].y - 14, 120, 28, C.gold);
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  var demoCrossers = null;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { progress = 0; demoCrossers = newCrossers(); crossers = demoCrossers; }
    var target = Math.min(TOTAL_LEN, (cyc / 4.0) * TOTAL_LEN);
    var p = pointAtLen(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 4.0;
    progress = Math.max(progress || 0, target);
    planeX = p.x; planeY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      drawCrossers();
      game.draw.circle(planeX, planeY, 4, C.corridor, 0);
      game.draw.sprite(PLANE_SPRITE, { '#': C.plane }, planeX, planeY, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'LANDED' : '-'), W / 2, H * 0.12, 24, C.gold);
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
      game.draw.sprite(PLANE_SPRITE, { '#': ok ? C.good : C.bad }, planeX, planeY, 10, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - Math.round((progress / TOTAL_LEN) * 100)) + '%!', W / 2, H * 0.18, 26, C.white);
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
    drawCrossers();
    if (!finished) game.draw.sprite(PLANE_SPRITE, { '#': C.plane }, planeX, planeY, 10, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
