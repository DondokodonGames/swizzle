// I-GBA-0014v2-anemometer-needle-log.js
// 風速計の針どめ記録 — 揺れ続ける風速計の針が基準線の真上に来た瞬間に1回だけ叩いて止め、観測帳に記録する
// 操作: 画面のどこかを1回タップすると針がその位置で止まる。基準線にどれだけ近いかで判定。1回の観測につきタップ1回
// 終わり: 4回の観測をすべて基準線の近くで止めれば成功。外す/時間切れで失敗
// @mechanic: timing_one_shot
// @theme: highland_weather_station_gauge
// 世界観: 高原の気象観測所で、観測員が突風のたびに暴れる風速計の針を毎回違う基準線ぴったりで止め、4行の観測帳を埋める
// 残るもの: 正誤(CLEAR/GAME OVER) + 観測精度スコアと PERFECT 回数
// スタイル: 70s MONO

(function(game) {
  var STYLE = { bg: ['#0f1418', '#1b242b', '#26323a'], main: ['#f2f2ea', '#9aa4a8'], accent: ['#ffb640', '#58d68d'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'WIND LOG';
  var TIME_LIMIT = 13;
  var NEEDED = 4;
  var CX = W / 2;
  var CY = H * 0.55;
  var R = 380;
  var AMP = 1.15;
  var OMEGA = [2.1, 2.4, 2.7, 3.0];
  var TOL = [0.22, 0.19, 0.16, 0.14];

  var ATTRACT = 'ATTRACT', PLAYING = 'PLAYING', RESULT = 'RESULT';
  var scene = ATTRACT;

  var needle = { a: 0, ph: 0, frozen: 0 };
  var gust = { wait: 2, warn: 0, surge: 0 };
  var logRows, target, roundNo, timeLeft, readyT, hitStopT, outroT, running, won, points, perfects, lastDiff;

  var OBSERVER_A = [
    '.pppp...',
    'pppppp..',
    '.ffff...',
    '.f.f....',
    '.ffff...',
    '.cccc...',
    'cccccc#.',
    'c.cc.c#.',
    '..cc....',
    '..c.c...',
  ];
  var OBSERVER_B = [
    '.pppp...',
    'pppppp..',
    '.ffff...',
    '.f.f....',
    '.ffff...',
    '.cccc...',
    'cccccc..',
    'c.cc.c##',
    '..cc....',
    '..c.c...',
  ];
  var OBS_PAL = { 'p': '#ffb640', 'f': '#f2f2ea', 'c': '#9aa4a8', '#': '#f2f2ea' };
  var CUPS_A = ['#.....#', '##...##', '...#...', '..###..', '...#...', '##...##', '#.....#'];
  var CUPS_B = ['...#...', '..###..', '#..#..#', '#######', '#..#..#', '..###..', '...#...'];
  var STAMP = ['.####.', '#....#', '#.##.#', '#.##.#', '#....#', '.####.'];
  var FLAG_A = ['####..', '######', '####..'];
  var FLAG_B = ['###...', '#####.', '######'];

  function ink(str, x, y, size, color) {
    game.draw.text(str, x + 2, y + 3, { size: size, color: '#05080a', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function tip(a, r) { return { x: CX + Math.sin(a) * r, y: CY - Math.cos(a) * r }; }

  function pickTarget() {
    var side = game.random(0, 1) < 0.5 ? -1 : 1;
    target = side * game.random(0.35, 0.85);
  }

  function resetGauge() {
    logRows = [];
    roundNo = 0;
    needle.a = 0; needle.ph = game.random(0, 6); needle.frozen = 0;
    gust.wait = 2.2; gust.warn = 0; gust.surge = 0;
    pickTarget();
  }

  function initRun() {
    resetGauge();
    timeLeft = TIME_LIMIT; readyT = 0.8; hitStopT = 0; outroT = 0;
    running = false; won = false; points = 0; perfects = 0; lastDiff = 0;
  }

  function swing(dt, playing) {
    if (needle.frozen > 0) {
      needle.frozen -= dt;
      if (needle.frozen <= 0 && roundNo < NEEDED) pickTarget();
      return;
    }
    var w = OMEGA[Math.min(roundNo, NEEDED - 1)];
    if (roundNo >= 1) {
      if (gust.surge > 0) { gust.surge -= dt; w *= 1.5; }
      else if (gust.warn > 0) {
        gust.warn -= dt;
        if (gust.warn <= 0) gust.surge = 0.8;
      } else {
        gust.wait -= dt;
        if (gust.wait <= 0) {
          gust.warn = 0.6; gust.wait = game.random(1.6, 2.6);
          if (playing) game.audio.tone('A2', 0.5, { wave: 'sawtooth', volume: 0.06, slide: 120 });
        }
      }
    }
    needle.ph += w * dt;
    needle.a = AMP * Math.sin(needle.ph);
  }

  // 実判定: 止めた位置と基準線の差 → 'perfect' | 'good' | 'miss'
  function judgeStop() {
    var tol = TOL[Math.min(roundNo, NEEDED - 1)];
    var diff = Math.abs(needle.a - target);
    lastDiff = diff;
    if (diff <= tol * 0.35) return 'perfect';
    if (diff <= tol) return 'good';
    return 'miss';
  }

  function recordStop(res, live) {
    var p = tip(needle.a, R - 40);
    if (res === 'miss') {
      logRows.push('x');
      if (live) {
        running = false; won = false; hitStopT = 0.55;
        game.feedback.bad(p.x, p.y, { text: 'MISS', shake: 12 });
        game.audio.play('se_failure', 0.4);
        game.audio.stopBgm();
      }
      return;
    }
    logRows.push(res === 'perfect' ? 'P' : 'G');
    roundNo++;
    needle.frozen = 0.55;
    if (!live) return;
    var tol = TOL[Math.min(roundNo - 1, NEEDED - 1)];
    var acc = Math.max(0, 1 - lastDiff / tol);
    points += Math.round(100 + acc * 200);
    if (res === 'perfect') perfects++;
    game.feedback.good(p.x, p.y, { text: res === 'perfect' ? 'PERFECT' : 'GOOD', color: res === 'perfect' ? STYLE.accent[0] : STYLE.accent[1], count: res === 'perfect' ? 22 : 12 });
    if (roundNo === 2) {
      game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.30, { color: STYLE.accent[0], size: 48 });
      game.audio.play('se_milestone', 0.45);
    }
    if (roundNo >= NEEDED) {
      running = false; won = true; hitStopT = 0.5;
      points += Math.round(timeLeft * 30);
      game.audio.play('se_success', 0.5);
      game.audio.stopBgm();
    }
  }

  game.onTap(function(x, y) {
    if (scene === ATTRACT) { game.audio.play('se_coin', 0.5); scene = PLAYING; initRun(); return; }
    if (scene === RESULT) { scene = ATTRACT; initRun(); demo.t = 0; return; }
    if (!running) return;
    if (needle.frozen > 0) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: STYLE.main[1], count: 4, speed: 100 });
      return;
    }
    game.audio.play('se_tap', 0.35);
    recordStop(judgeStop(), true);
  });

  // ── ATTRACT ゴースト実演: 実ロジック(swing/judgeStop/recordStop)で4行を記録。偶数周の3行目はわざと早押しで外す ──
  var demo = { t: 0, gx: W * 0.7, gy: H * 0.86, press: 0, fumble: false, missShow: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) {
      resetGauge();
      demo.fumble = Math.floor(demo.t / 9) % 2 === 1;
      demo.missShow = 0;
    }
    if (demo.press > 0) demo.press -= dt;
    if (demo.missShow > 0) {
      demo.missShow -= dt;
      if (demo.missShow <= 0) { logRows.pop(); pickTarget(); }
      return;
    }
    swing(dt, false);
    if (needle.frozen > 0 || roundNo >= NEEDED) {
      if (roundNo >= NEEDED && needle.frozen <= 0) resetGauge();
      return;
    }
    var tol = TOL[roundNo];
    var diff = Math.abs(needle.a - target);
    var early = demo.fumble && roundNo === 2 && diff < tol * 2.4 && diff > tol * 1.6;
    if (diff < tol * 0.3 || early) {
      demo.press = 0.25;
      var res = judgeStop();
      recordStop(res, false);
      if (res === 'miss') { demo.missShow = 0.9; demo.fumble = false; }
    }
  }

  // ── 描画 ──
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[2]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 星の白ドット
    for (var i = 0; i < 26; i++) {
      var sx = (i * 173) % W, sy = 250 + ((i * 97) % 260);
      game.draw.rect(sx, sy, 5, 5, STYLE.main[0], 0.25 + 0.2 * Math.sin(t * 2 + i));
    }
    // 山並み(点線シルエット)
    for (var x = 0; x < W; x += 12) {
      var hh = 90 + Math.sin(x * 0.006) * 60 + Math.sin(x * 0.017) * 26;
      game.draw.rect(x, H * 0.76 - hh, 8, 8, STYLE.main[1], 0.5);
    }
    game.draw.rect(0, H * 0.76, W, H * 0.24, '#141b20', 1);
    // 観測マスト + 回る風杯
    var spin = gust.surge > 0 ? 22 : 9;
    var cups = Math.floor(t * spin) % 2 === 0 ? CUPS_A : CUPS_B;
    game.draw.line(W * 0.88, H * 0.76, W * 0.88, H * 0.26, STYLE.main[1], 6);
    game.draw.sprite(cups, { '#': STYLE.main[0] }, W * 0.88, H * 0.25, 12, { anchor: 'center' });
    var flap = gust.warn > 0 || gust.surge > 0 ? 16 : 4;
    var flag = Math.floor(t * flap) % 2 === 0 ? FLAG_A : FLAG_B;
    game.draw.line(W * 0.10, H * 0.76, W * 0.10, H * 0.30, STYLE.main[1], 5);
    game.draw.sprite(flag, { '#': gust.warn > 0 ? STYLE.accent[0] : STYLE.main[0] }, W * 0.10 + 8, H * 0.31, 14, { anchor: 'topleft' });
  }

  function drawGauge(highlight) {
    // 目盛り板(半円は横ストリップで塗る)
    for (var y = CY - R - 20; y < CY + 30; y += 4) {
      var dy = CY - y;
      var half = dy > 0 ? Math.sqrt(Math.max(0, (R + 20) * (R + 20) - dy * dy)) : R + 20;
      game.draw.rect(CX - half, y, half * 2, 4, '#20292f', 1);
    }
    for (var k = -12; k <= 12; k++) {
      var a = k * (AMP / 12);
      var o = tip(a, R), inn = tip(a, k % 4 === 0 ? R - 60 : R - 30);
      game.draw.line(inn.x, inn.y, o.x, o.y, STYLE.main[1], k % 4 === 0 ? 6 : 3);
    }
    // 基準線(近づくほど明るく)
    var tol = TOL[Math.min(roundNo, NEEDED - 1)];
    var near = Math.max(0, 1 - Math.abs(needle.a - target) / (tol * 3));
    for (var s = -1; s <= 1; s += 2) {
      var ea = tip(target + s * tol, R + 10), eb = tip(target + s * tol, R - 70);
      game.draw.line(ea.x, ea.y, eb.x, eb.y, STYLE.accent[0], 3);
    }
    var t1 = tip(target, R + 30), t2 = tip(target, R - 110);
    game.draw.line(t1.x, t1.y, t2.x, t2.y, STYLE.accent[0], 10 + near * 8);
    game.draw.circle(t1.x, t1.y, 16 + near * 10, STYLE.accent[0], 0.5 + near * 0.5);
    // 針
    var nt = tip(needle.a, R - 30);
    if (highlight) {
      game.draw.circle(nt.x, nt.y, 70, '#ffffff', 0.6);
      var tt = tip(target, R - 30);
      game.draw.line(nt.x, nt.y, tt.x, tt.y, '#ff5a4a', 10);
    }
    game.draw.line(CX, CY, nt.x, nt.y, highlight ? '#ffffff' : STYLE.main[0], highlight ? 16 : 10);
    game.draw.circle(CX, CY, 34, STYLE.main[0], 1);
    game.draw.circle(CX, CY, 16, STYLE.bg[0], 1);
    if (needle.frozen > 0) game.draw.circle(nt.x, nt.y, 30 + (0.55 - needle.frozen) * 80, STYLE.accent[1], needle.frozen);
  }

  function drawLog(pressing) {
    var y0 = H * 0.80;
    game.draw.rect(90, y0, W - 180, 250, '#e9e4d2', 1);
    game.draw.rect(90, y0, W - 180, 10, STYLE.accent[0], 1);
    for (var i = 0; i < NEEDED; i++) {
      var cx = 190 + i * ((W - 380) / (NEEDED - 1));
      game.draw.rect(cx - 70, y0 + 50, 140, 150, '#d4ceb8', 1);
      var mark = logRows[i];
      if (mark === 'P' || mark === 'G') game.draw.sprite(STAMP, { '#': mark === 'P' ? '#c7661a' : '#2f8a58' }, cx, y0 + 125, 18, { anchor: 'center' });
      else if (mark === 'x') { game.draw.line(cx - 50, y0 + 75, cx + 50, y0 + 175, '#c0392b', 10); game.draw.line(cx + 50, y0 + 75, cx - 50, y0 + 175, '#c0392b', 10); }
      else if (i === logRows.length) game.draw.rect(cx - 70, y0 + 196, 140, 6, STYLE.accent[0], 0.6 + 0.4 * Math.sin(game.time.elapsed * 6));
    }
    var fr = pressing ? OBSERVER_B : OBSERVER_A;
    var bob = Math.sin(game.time.elapsed * 2.2) * 4;
    game.draw.sprite(fr, OBS_PAL, 120, H * 0.745 + bob, 12, { anchor: 'center' });
    // 帯セロハン
    game.draw.rect(0, 0, W, H * 0.24, STYLE.accent[0], 0.08);
    game.draw.rect(0, H * 0.78, W, H * 0.22, STYLE.accent[1], 0.06);
  }

  function drawHud() {
    ink(Math.min(roundNo, NEEDED) + ' / ' + NEEDED, W / 2, 100, 50, STYLE.main[0]);
    var bw = W - 160;
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 170, bw, 16, '#05080a', 1);
    game.draw.rect(80, 170, bw * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? '#ff5a4a' : STYLE.main[0], 1);
    ink(String(points), W - 130, 100, 34, STYLE.accent[0]);
  }

  game.onUpdate(function(dt) {
    if (scene === ATTRACT) {
      stepDemo(dt);
      drawSky();
      drawGauge(demo.missShow > 0);
      drawLog(demo.press > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 5;
      ink(GAME_TITLE, W / 2, H * 0.09 + bob, 64, STYLE.main[0]);
      ink('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.14, 30, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.965, 38, STYLE.accent[0]);
      else ink('INSERT COIN', W / 2, H * 0.965, 30, STYLE.main[0]);
      return;
    }

    if (scene === RESULT) {
      drawSky();
      drawGauge(!won);
      drawLog(false);
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 66, won ? STYLE.accent[1] : '#ff5a4a');
      ink('SCORE ' + points, W / 2, H * 0.14, 38, STYLE.main[0]);
      if (won) ink('PERFECT ' + perfects + ' / ' + NEEDED, W / 2, H * 0.18, 30, STYLE.accent[0]);
      else ink('あと' + (NEEDED - roundNo) + '回!', W / 2, H * 0.18, 32, STYLE.accent[0]);
      ink('BEST ' + Math.round(game.best || 0), W / 2, H * 0.215, 26, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.965, 30, STYLE.main[0]);
      return;
    }

    // ── PLAYING ──
    if (outroT > 0) {
      outroT -= dt;
      if (outroT <= 0) {
        scene = RESULT;
        var stats = { logged: roundNo, perfect: perfects };
        if (won) game.end.success(points, stats); else game.end.failure(stats);
      }
    } else if (hitStopT > 0) {
      hitStopT -= dt;
      if (hitStopT <= 0) outroT = 1.0;
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; game.audio.play('se_tap', 0.3); }
    } else if (running) {
      timeLeft -= dt;
      swing(dt, true);
      if (timeLeft <= 0) {
        timeLeft = 0; running = false; won = false; hitStopT = 0.5;
        var nt = tip(needle.a, R - 40);
        game.feedback.bad(nt.x, nt.y, { text: 'TIME UP', shake: 10 });
        game.audio.play('se_failure', 0.4);
        game.audio.stopBgm();
      }
    }

    drawSky();
    drawGauge(hitStopT > 0 && !won);
    drawLog(needle.frozen > 0);
    drawHud();
    if (gust.warn > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(0, H * 0.24, W, 10, STYLE.accent[0], 0.7);
    if (readyT > 0) ink(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 84, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.5], ['E4', 0.5], ['D4', 0.25], ['C4', 0.25], ['A3', 1], ['G3', 0.5], ['C4', 0.5], ['B3', 1]], { tempo: 96, wave: 'square', volume: 0.045, loop: true });
    scene = ATTRACT;
    initRun();
  });
})(game);
