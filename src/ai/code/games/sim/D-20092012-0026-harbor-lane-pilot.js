// D-20092012-0026-harbor-lane-pilot.js
// ハーバー・レーン・パイロット — 混み合う港内に引かれた一本の水路を、干潮までに指でなぞって曳船を導く
// 操作: 曳船の近くを指で押さえ、示された水路の線からはみ出さないようになぞり続ける
// 終わり: 干潮になる前に水路の終点(桟橋)まで着けば成功。線からはみ出すか時間切れなら失敗
// @mechanic: trace
// @theme: crowded_harbor_lane
// 世界観: 小舟がひしめく旧い港。水先案内人が一隻の曳船を、係留船の間を縫う狭い水路に沿って干潮までに桟橋へ導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・真鍮・革のような質感を帯状の塗りで再現、厚みのある縁取り
  var C = {
    water1: '#1c3a4a', water2: '#0c2028', wood: '#6b4a2e', woodDark: '#4a3220',
    lane: '#2e6a6e', laneEdge: '#e8c98a', boat: '#3a4a5a', boatEdge: '#8090a0',
    ship: '#d8b070', shipEdge: '#6b4a2e', gold: '#ffe066', good: '#4dff8a', bad: '#ff4d5e',
    white: '#fdf6e8', ink: '#160e08',
  };

  var GAME_TITLE = 'HARBOR LANE';
  var HALF = 70;
  var TIME_LIMIT = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.88 },
    { x: W * 0.30, y: H * 0.74 },
    { x: W * 0.62, y: H * 0.60 },
    { x: W * 0.26, y: H * 0.46 },
    { x: W * 0.58, y: H * 0.32 },
    { x: W * 0.42, y: H * 0.18 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }
  var MOORED = [
    { x: W * 0.16, y: H * 0.80, r: 46 }, { x: W * 0.80, y: H * 0.78, r: 50 },
    { x: W * 0.14, y: H * 0.60, r: 44 }, { x: W * 0.86, y: H * 0.52, r: 48 },
    { x: W * 0.14, y: H * 0.34, r: 44 }, { x: W * 0.80, y: H * 0.30, r: 46 },
    { x: W * 0.20, y: H * 0.20, r: 40 }, { x: W * 0.70, y: H * 0.14, r: 40 },
  ];

  var progress, boatX, boatY, timeLeft, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOAT_SPRITE = ['.##.', '####', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.water1], [1, C.water2]]);
    for (var i = 0; i < 10; i++) {
      var wy = (i * (H / 10) + (game.time.elapsed * 40) % (H / 10));
      game.draw.rect(0, wy, W, 2, '#ffffff08');
    }
    for (var j = 0; j < MOORED.length; j++) {
      var m = MOORED[j];
      game.draw.circle(m.x, m.y, m.r + 8, C.shipEdge);
      game.draw.circle(m.x, m.y, m.r, C.ship);
      game.draw.rect(m.x - m.r * 0.5, m.y - m.r * 0.3, m.r, 6, C.woodDark);
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

  function initGame() {
    progress = 0; boatX = PTS[0].x; boatY = PTS[0].y;
    timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'AGROUND' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
    }
    boatX = x; boatY = y;
    if (progress >= TOTAL_LEN - 20) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'DOCKED', color: C.good });
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

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.lane, HALF * 2);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.laneEdge, 3);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.55, C.laneEdge);
    game.draw.rect(PTS[PTS.length - 1].x - 60, PTS[PTS.length - 1].y - 16, 120, 32, C.wood);
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; timeLeft = TIME_LIMIT; }
    var target = Math.min(TOTAL_LEN, (cyc / 2.8) * TOTAL_LEN);
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
    demo.gx = px; demo.gy = py; demo.press = cyc < 2.8;
    progress = Math.max(progress || 0, target);
    boatX = px; boatY = py;
    timeLeft = Math.max(0, TIME_LIMIT - cyc);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(BOAT_SPRITE, { '#': C.boat }, boatX, boatY, 9, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'DOCKED' : '-'), W / 2, H * 0.12, 24, C.gold);
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
      game.draw.sprite(BOAT_SPRITE, { '#': ok ? C.good : C.bad }, boatX, boatY, 9, { anchor: 'center' });
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
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0.55 && timeLeft > 0 && Math.floor(game.time.elapsed * 8) % 2 === 0) {
        // telegraph: 干潮が迫る警告フラッシュ
      }
      if (timeLeft <= 0) {
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(boatX, boatY, { text: 'TIME UP' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.sprite(BOAT_SPRITE, { '#': C.boat }, boatX, boatY, 9, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    var lowTime = timeLeft < 3;
    game.draw.rect(60, 150, (W - 120) * (Math.max(0, timeLeft) / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
