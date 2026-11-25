// D-20132016-0058-transit-loop-relay.js
// トランジットループリレー — 増えていく駅を順番どおり一本の線でなぞり、混雑タイマーが尽きる前に路線を結ぶ
// 操作: 始発駅から指を離さず、順番に光る次の駅へ向けて線路の幅からはみ出さないようになぞる
// 終わり: 制限時間内に全駅をつなげば成功。線路を外れる/時間切れで失敗
// @mechanic: guide_path
// @theme: transit_overcrowd_relay
// 世界観: 地下鉄運行管制の見習いが、増設されたばかりの新駅群を制限時間内に一本の路線図として結び、混雑が限界を超える前にさばく
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだ駅数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラット単色、太めの丸角ライン、影は使わない
  var C = {
    bg: '#eef3fb', bg2: '#dfe9fb', track: '#c7d3ea', trackDone: '#3d7dff',
    station: '#ffffff', stationRing: '#3d7dff', stationDone: '#2bd67b',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ff9f1c', ink: '#152238', white: '#152238',
  };

  var GAME_TITLE = 'TRANSIT RELAY';
  var TIME_LIMIT = 11;
  var HALF = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.22, y: H * 0.30 },
    { x: W * 0.74, y: H * 0.24 },
    { x: W * 0.28, y: H * 0.46 },
    { x: W * 0.78, y: H * 0.58 },
    { x: W * 0.30, y: H * 0.72 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, stationsHit;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OPERATOR = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#3d7dff', pulse * 0.5);
    game.draw.sprite(OPERATOR, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
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
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.track, HALF * 2);
    }
    var acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      var segStart = acc, segEnd = acc + SEG_LEN[k - 1];
      if (prog > segStart) {
        var t = Math.min(1, (prog - segStart) / SEG_LEN[k - 1]);
        var ex = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
        var ey = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
        game.draw.line(PTS[k - 1].x, PTS[k - 1].y, ex, ey, C.trackDone, 16);
      }
      acc = segEnd;
    }
    var passedLen = 0;
    for (var s = 0; s < PTS.length; s++) {
      var segAcc = 0;
      for (var q = 0; q < s; q++) segAcc += SEG_LEN[q];
      var doneS = prog >= segAcc - 4;
      game.draw.circle(PTS[s].x, PTS[s].y, 30, doneS ? C.stationDone : C.station);
      game.draw.circle(PTS[s].x, PTS[s].y, 30, C.stationRing, 0);
      game.draw.text(String(s + 1), PTS[s].x, PTS[s].y + 10, { size: 26, color: doneS ? '#ffffff' : C.stationRing, bold: true, align: 'center' });
    }
  }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; stationsHit = 1;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var newStations = Math.min(PTS.length, 1 + Math.floor((r.len / TOTAL_LEN) * (PTS.length - 1) + 0.02));
      if (newStations > stationsHit) {
        stationsHit = newStations;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_milestone', 0.35);
        if (stationsHit === Math.ceil(PTS.length / 2)) game.fx.popup('HALFWAY!', x, y - 70, { color: C.gold, size: 34 });
      }
      progress = r.len;
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 14) {
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
    if (cyc < dt || demo.t <= dt) { progress = 0; stationsHit = 1; }
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
    stationsHit = Math.min(PTS.length, 1 + Math.floor((progress / TOTAL_LEN) * (PTS.length - 1) + 0.02));
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTrack(progress);
      game.draw.circle(cursorX, cursorY, 14, C.trackDone);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.ink);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(stationsHit + ' / ' + PTS.length, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (PTS.length - stationsHit) + '駅!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stationsHit, { stations: stationsHit, total: PTS.length });
        else game.end.failure({ stations: stationsHit, total: PTS.length });
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
    if (!finished) game.draw.circle(cursorX, cursorY, 14, C.trackDone);

    txt(stationsHit + ' / ' + PTS.length, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#c7d3ea', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.5]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
