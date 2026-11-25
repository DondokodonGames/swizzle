// I-3DS-0007-wire-walk-trace.js
// ワイヤーウォーク — 送電線点検ドローンが高圧線をなぞって対岸の鉄塔まで進む
// 操作: 起点から終点まで、線からはみ出さないよう指でなぞる。進むほど許容幅が狭くなる
// 終わり: 鉄塔に着けば成功。線を外れれば感電して失敗
// @mechanic: trace
// @theme: hot_wire_drone
// 世界観: 深夜の渓谷、送電線点検ドローンがたわむ高圧線を伝って対岸の鉄塔まで進む。線を外れれば感電し墜落する
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 1BIT INK
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 二値に近い白黒+差し色1つ。太い輪郭線と塗りストライプ
  var C = {
    bg: '#0b0d10', bg2: '#050607', ink: '#f4f2ea', wireEdge: '#f4f2ea', wireDanger: '#ff3b30',
    accent: '#ffd400', good: '#5cf27a', bad: '#ff3b30', white: '#f4f2ea', black: '#050607',
  };

  var GAME_TITLE = 'WIRE WALK';

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.20, y: H * 0.86 },
    { x: W * 0.55, y: H * 0.74 },
    { x: W * 0.28, y: H * 0.60 },
    { x: W * 0.70, y: H * 0.48 },
    { x: W * 0.35, y: H * 0.34 },
    { x: W * 0.62, y: H * 0.20 },
    { x: W * 0.50, y: H * 0.10 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE = ['.#.', '###', '.#.'];

  function widthAt(len) {
    var t = Math.max(0, Math.min(1, len / TOTAL_LEN));
    return 88 - t * 46; // 88px -> 42px、進むほど狭くなる
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 1, '#ffffff08');
    game.draw.rect(0, H * 0.9, W, 4, '#ffffff10');
  }

  function drawWire() {
    for (var j = 1; j < PTS.length; j++) {
      var t0 = 0, acc0 = 0;
      for (var k = 0; k < j - 1; k++) acc0 += SEG_LEN[k];
      var wA = widthAt(acc0), wB = widthAt(acc0 + SEG_LEN[j - 1]);
      var wAvg = (wA + wB) / 2;
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.wireDanger, wAvg * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.bg, wAvg * 2);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, '#ffffff22', 3);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 26, C.accent);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 30, C.good);
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
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    var allow = widthAt(r.len);
    if (r.dist > allow) {
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) {
        game.fx.popup('50 / 100', x, y - 60, { color: C.accent, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.good, count: 18, speed: 380 });
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
    if (!ok) game.audio.play('se_failure', 0.4);
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
    if (progress === undefined || progress < target) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawWire();
      game.draw.sprite(DRONE, { '#': C.accent }, cursorX, cursorY, 8, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWire();
      game.draw.sprite(DRONE, { '#': ok ? C.good : C.bad }, cursorX, cursorY, 8, { anchor: 'center' });
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 30, C.accent);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
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
    }
    if (shake > 0) shake -= dt;

    bg();
    drawWire();
    if (!finished) game.draw.sprite(DRONE, { '#': C.accent }, cursorX, cursorY, 8, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 1]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
