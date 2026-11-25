// I-GBA-0046v3-buoy-route-chart.js
// 浮標灯の航路結び — 点滅した浮標灯の順番を覚え、桟橋から順に指で航路の線を一本ずつ結ぶ
// 操作: 浮標が順に一瞬ずつ光る。光り終えたら、いま結び終えている点(最初は桟橋)から次に光った浮標まで指で線を引いて離す。潮で浮標が入れ替わる回は頭の形と色で見分ける
// 終わり: 3回の航路(3→4→5本)をすべて結べば成功。持ち時間が尽きたら失敗。違う浮標へ結ぶと線が切れて時間が減る
// @mechanic: connect
// @theme: harbor_buoy_route
// 世界観: 夜の港の信号所で、信号係が沖の浮標灯の点滅した並び順を覚え、潮で浮標が流されても頭標の形で見分けて桟橋から航路図に線で結んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(結んだ本数・一度で結べた本数・残り時間)
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物体は板(sprite)のまま、奥ほど小さく彩度を落とす。真下に必ず接地影
  var STYLE = { bg: ['#0b1630', '#153058', '#1f4a78'], main: ['#e8403a', '#2fae5a', '#f2c53a'], accent: ['#fff1b8', '#64d8ff'] };
  var C = {
    sky: STYLE.bg[0], sea: STYLE.bg[1], seaNear: STYLE.bg[2], red: STYLE.main[0], green: STYLE.main[1], yellow: STYLE.main[2],
    lamp: STYLE.accent[0], chart: STYLE.accent[1], white: '#f4f6fa', ink: '#081020', good: '#7dffb0', bad: '#ff5a4a', pier: '#5a4632',
  };

  var GAME_TITLE = 'BUOY ROUTE';
  var TIME_LIMIT = 20;          // connect = E族 15〜25s(結ぶ操作の持ち時間)
  var ROUTES = [
    { n: 3, shuffle: false, show: 0.6 },
    { n: 4, shuffle: true, show: 0.55 },
    { n: 5, shuffle: true, show: 0.5 },
  ];
  var NEEDED = 12;              // 3+4+5 本
  var MISS_COST = 1.5;
  var HORIZON = Math.round(H * 0.25);
  var PIER = { x: W / 2, y: Math.round(H * 0.78) };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var buoys, seq, nextIdx, route, phase, phaseT, drag, links, cleanLinks, misses, score, timeLeft;
  var countIn, over, won, endT, freeze, gapT, cheerT, oopsT, milestoneDone, prevBest, warnT, legMissed;

  function sign(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var BODY = ['..##..', '.####.', '.bbbb.', '######', '######', '.####.'];
  var MARKS = [
    ['..#..', '.###.', '#####'],
    ['#####', '.###.', '..#..'],
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ['.###.', '#####', '#####', '.###.'],
    ['..#..', '.###.', '#####', '.###.', '..#..'],
  ];
  var KIND_PAL = [
    { '#': '#e8403a', b: '#ffffff' }, { '#': '#2fae5a', b: '#ffffff' }, { '#': '#f2c53a', b: '#202020' },
    { '#': '#202020', b: '#f2c53a' }, { '#': '#f4f6fa', b: '#e8403a' },
  ];
  var MARK_COL = ['#e8403a', '#2fae5a', '#f2c53a', '#202020', '#f4f6fa'];
  // 信号係(帽子・手旗)0,1=待機 2=旗を振る 3=頭を抱える
  var SIGNALER = [
    ['..nnnn..', '.nnnnnn.', '..ssss..', '..sese..', '..ssss..', '.ccccccr', '.cccccc.', '.cccccc.', '..c..c..', '..k..k..'],
    ['..nnnn..', '.nnnnnn.', '..ssss..', '..ssss..', '..ssss..', '.ccccccr', '.cccccc.', '.cccccc.', '..c..c..', '..k..k..'],
    ['r.nnnn.r', 'rnnnnnnr', 's.ssss.s', 'c.sese.c', '.cssssc.', '..cccc..', '.cccccc.', '.cccccc.', '..c..c..', '..k..k..'],
    ['..nnnn..', 'snnnnnns', 'csssssc.', '.cseesc.', '..ssss..', '..cccc..', '.cccccc.', '.cccccc.', '..c..c..', '.k....k.'],
  ];
  var SIG_PAL = { n: '#1c2c50', s: '#f0c8a0', e: '#101010', c: '#2a4a8a', r: '#e8403a', k: '#101010' };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function depth(y) { return Math.max(0.45, Math.min(1.25, 0.5 + (y - HORIZON) / (PIER.y - HORIZON) * 0.75)); }

  function spots(n, fixed) {
    if (fixed) return fixed;
    var out = [];
    for (var tries = 0; out.length < n && tries < 400; tries++) {
      var x = game.random(150, W - 150), y = game.random(H * 0.33, H * 0.66);
      var ok = Math.hypot(x - PIER.x, y - PIER.y) > 260;
      for (var k = 0; k < out.length && ok; k++) if (Math.hypot(out[k].x - x, out[k].y - y) < 230) ok = false;
      if (ok) out.push({ x: x, y: y });
    }
    while (out.length < n) out.push({ x: 180 + out.length * 170, y: H * 0.5 });
    return out;
  }

  function buildRoute(idx, fixed) {
    var R = ROUTES[idx];
    var pos = spots(R.n, fixed ? fixed.pos : null);
    var kinds = fixed ? fixed.kinds : shuffle([0, 1, 2, 3, 4]).slice(0, R.n);
    buoys = [];
    for (var i = 0; i < R.n; i++) buoys.push({ x: pos[i].x, y: pos[i].y, ox: pos[i].x, oy: pos[i].y, nx: pos[i].x, ny: pos[i].y, kind: kinds[i], lit: 0, red: 0, linked: false, bob: game.random(0, 6) });
    seq = fixed ? fixed.seq.slice() : shuffle(buoys.map(function(b, i) { return i; }));
    nextIdx = 0; drag = null; legMissed = false;
    phase = 'show'; phaseT = 0;
    if (R.shuffle) {
      var perm = shuffle(pos.map(function(p, i) { return i; }));
      for (var s = 0; s < perm.length; s++) if (perm[s] === s) { var t2 = perm[s]; var o = (s + 1) % perm.length; perm[s] = perm[o]; perm[o] = t2; }
      for (var b = 0; b < buoys.length; b++) { buoys[b].nx = pos[perm[b]].x + game.random(-30, 30); buoys[b].ny = pos[perm[b]].y + game.random(-20, 20); }
    }
  }

  function initGame() {
    route = 0; links = 0; cleanLinks = 0; misses = 0; score = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; over = false; won = false; endT = 0; freeze = 0; gapT = 0; cheerT = 0; oopsT = 0;
    milestoneDone = false; prevBest = game.best; warnT = 0;
    buildRoute(0, null);
  }

  function nodePos() {
    if (nextIdx === 0) return PIER;
    return buoys[seq[nextIdx - 1]];
  }

  function buoyAt(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < buoys.length; i++) {
      var b = buoys[i];
      var d = Math.hypot(b.x - x, b.y - 70 * depth(b.y) - y);
      if (d < 130 * depth(b.y) + 30 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // 時間で進む部分(本番・デモ共通): 点滅の順番見せ → 潮の入れ替え → 結ぶ
  function stepHarbor(dt) {
    var R = ROUTES[route];
    for (var i = 0; i < buoys.length; i++) {
      if (buoys[i].lit > 0) buoys[i].lit = Math.max(0, buoys[i].lit - dt * 2.2);
      if (buoys[i].red > 0) buoys[i].red = Math.max(0, buoys[i].red - dt * 2);
    }
    if (cheerT > 0) cheerT -= dt;
    if (oopsT > 0) oopsT -= dt;
    if (phase === 'show') {
      var before = Math.floor(phaseT / R.show);
      phaseT += dt;
      var k = Math.floor(phaseT / R.show);
      if (k !== before || phaseT <= dt) {
        if (k < seq.length) {
          buoys[seq[k]].lit = 1;
          game.audio.tone(523 * Math.pow(1.122, k), 0.14, { wave: 'sine', volume: 0.13 });
        }
      }
      if (phaseT >= R.show * seq.length + 0.25) {
        phase = R.shuffle ? 'drift' : 'input'; phaseT = 0;
        if (R.shuffle) game.audio.tone(196, 0.5, { wave: 'triangle', volume: 0.1, slide: 60 });
      }
    } else if (phase === 'drift') {
      phaseT += dt;
      var t = Math.min(1, phaseT / 0.8);
      var e = t * t * (3 - 2 * t);
      for (var b = 0; b < buoys.length; b++) {
        var B = buoys[b];
        B.x = B.ox + (B.nx - B.ox) * e + Math.sin(t * Math.PI) * 70 * (b % 2 ? 1 : -1);
        B.y = B.oy + (B.ny - B.oy) * e;
      }
      if (t >= 1) { phase = 'input'; phaseT = 0; }
    }
  }

  // 指を離した先で判定(本番・デモ共通)
  function closeLeg(x, y) {
    if (!drag) return 'none';
    drag = null;
    var j = buoyAt(x, y);
    if (j < 0) { game.audio.play('se_tap', 0.12); return 'none'; }
    var B = buoys[j];
    if (j === seq[nextIdx]) {
      B.linked = true; B.lit = 1;
      nextIdx++;
      if (state === S.PLAYING) {
        links++;
        var clean = !legMissed;
        if (clean) cleanLinks++;
        score += clean ? 150 : 80;
        game.feedback.good(B.x, B.y - 120 * depth(B.y), { text: clean ? 'GOOD' : 'NICE', color: C.good, size: 56 });
        if (!milestoneDone && links === 6) {
          milestoneDone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(links + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.lamp, size: 64 });
        }
      } else {
        game.feedback.good(B.x, B.y - 120 * depth(B.y), { text: 'GOOD', color: C.good, size: 52 });
      }
      legMissed = false;
      if (nextIdx >= seq.length) routeDone();
      return 'link';
    }
    if (B.linked) { game.audio.play('se_tap', 0.12); return 'none'; }
    B.red = 1; legMissed = true;
    game.feedback.bad(B.x, B.y - 60, { text: 'MISS', color: C.bad });
    game.audio.play('se_break', 0.3);
    if (state === S.PLAYING) { misses++; timeLeft -= MISS_COST; oopsT = 0.7; }
    return 'miss';
  }

  function routeDone() {
    cheerT = 0.9;
    if (state !== S.PLAYING) return;
    game.audio.play('se_coin', 0.45);
    game.fx.burst(PIER.x, PIER.y - 60, { color: C.lamp, count: 24, speed: 420 });
    if (route >= ROUTES.length - 1) {
      won = true; over = true; freeze = 0.35;
      score += Math.round(Math.max(0, timeLeft) * 30);
      return;
    }
    phase = 'gap'; gapT = 0.7;
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 6; i++) game.fx.burst(game.random(140, 940), game.random(400, 1200), { color: i % 2 ? C.lamp : C.chart, count: 20, speed: 440 });
  }

  // ── 描画 ──
  function drawSea() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.24, '#24406e'], [0.25, C.sea], [0.8, C.seaNear], [1, C.ink]]);
    // 遠景: 対岸の山並みと灯台(彩度を落とす)
    for (var m = 0; m < 6; m++) {
      var mw = 260, mx = m * 200 - 60, mh = 50 + (m % 3) * 30;
      for (var r = 0; r < mh; r += 6) game.draw.rect(mx + (mw / 2) * (1 - r / mh), HORIZON - mh + r, mw * (r / mh), 6, '#1a2c4c');
    }
    var beam = (t * 0.8) % (Math.PI * 2);
    game.draw.rect(W * 0.86 - 6, HORIZON - 90, 12, 90, '#c8c8d0');
    game.draw.circle(W * 0.86, HORIZON - 96, 10, C.lamp, 0.6 + 0.4 * Math.max(0, Math.cos(beam)));
    // 波頭: 奥ほど小さく遅い
    for (var i = 0; i < 30; i++) {
      var wy = HORIZON + 20 + (i * 37) % (PIER.y - HORIZON - 40);
      var d = depth(wy);
      var wx = ((i * 211 + t * 30 * d) % (W + 200)) - 100;
      game.draw.rect(wx, wy, 70 * d, 4 * d, '#ffffff', 0.1 + 0.1 * d);
    }
  }

  function drawBuoy(b) {
    var d = depth(b.y);
    var bob = Math.sin(game.time.elapsed * 2.4 + b.bob) * 6 * d;
    var px = 18 * d * (b.red > 0 ? 1 + b.red * 0.25 : 1);
    var baseY = b.y + bob;
    // 接地影(水面の楕円を横長の矩形で)
    game.draw.rect(b.x - 55 * d, b.y + 8 * d, 110 * d, 12 * d, '#000000', 0.35);
    game.draw.rect(b.x - 38 * d, b.y + 4 * d, 76 * d, 20 * d, '#000000', 0.2);
    game.draw.sprite(BODY, b.red > 0 ? { '#': '#ffffff', b: '#ffffff' } : KIND_PAL[b.kind], b.x, baseY - 3 * px, px, { anchor: 'center' });
    var topY = baseY - 6 * px;
    game.draw.line(b.x, topY, b.x, topY - 100 * d, '#d0d0d8', Math.max(3, 5 * d));
    game.draw.sprite(MARKS[b.kind], { '#': MARK_COL[b.kind] }, b.x, topY - 72 * d, 12 * d, { anchor: 'center' });
    var lampY = topY - 118 * d;
    var glow = Math.max(b.lit, b.linked ? 0.45 : 0);
    if (glow > 0) {
      game.draw.circle(b.x, lampY, 70 * d * glow + 20 * d, C.lamp, 0.15 * glow);
      game.draw.circle(b.x, lampY, 34 * d, C.lamp, 0.4 * glow + 0.2);
    }
    game.draw.circle(b.x, lampY, 14 * d, glow > 0 ? C.white : '#56607a');
  }

  function drawChart() {
    // 結んだ航路(点線)
    var prev = PIER;
    for (var k = 0; k < nextIdx; k++) {
      var b = buoys[seq[k]];
      var segs = 14;
      for (var s = 0; s < segs; s += 2) {
        var a0 = s / segs, a1 = (s + 1) / segs;
        game.draw.line(prev.x + (b.x - prev.x) * a0, prev.y - 30 + (b.y - prev.y) * a0, prev.x + (b.x - prev.x) * a1, prev.y - 30 + (b.y - prev.y) * a1, C.chart, 8);
      }
      prev = { x: b.x, y: b.y + 30 };
    }
    if (drag) {
      var n = nodePos();
      game.draw.line(n.x, n.y - (nextIdx === 0 ? 30 : 0), drag.x, drag.y, C.lamp, 10);
      game.draw.circle(drag.x, drag.y, 16, C.lamp);
    }
    if (phase === 'input' && !drag && !over) {
      var np = nodePos();
      game.draw.circle(np.x, np.y - (nextIdx === 0 ? 30 : 40), 40 + 10 * Math.sin(game.time.elapsed * 7), C.white, 0.25);
    }
  }

  function drawPier() {
    game.draw.rect(PIER.x - 150, PIER.y - 20, 300, 60, C.pier);
    game.draw.rect(PIER.x - 40, PIER.y + 40, 80, H - PIER.y, C.pier);
    for (var p = -1; p <= 1; p += 2) game.draw.rect(PIER.x + p * 120 - 10, PIER.y + 40, 20, 120, '#3a2c1e');
    game.draw.circle(PIER.x, PIER.y - 30, 24, C.chart);
    game.draw.circle(PIER.x, PIER.y - 30, 12, C.white);
    var t = game.time.elapsed;
    var f = oopsT > 0 ? SIGNALER[3] : cheerT > 0 ? SIGNALER[2] : SIGNALER[Math.floor(t * 1.5) % 5 === 4 ? 1 : 0];
    if (state === S.RESULT) f = won ? SIGNALER[2] : SIGNALER[3];
    var hop = cheerT > 0 ? Math.abs(Math.sin(t * 12)) * 20 : 0;
    game.draw.rect(W * 0.2 - 50, H * 0.9 + 60, 100, 12, '#000000', 0.3);
    game.draw.sprite(f, SIG_PAL, W * 0.2, H * 0.9 - hop, 15, { anchor: 'center' });
  }

  function hud() {
    sign(String(score), 160, 80, 52, C.white);
    sign(links + ' / ' + NEEDED, W - 160, 80, 46, C.white);
    for (var i = 0; i < ROUTES.length; i++) game.draw.circle(W / 2 - 50 + i * 50, 80, 14, i < route || won ? C.lamp : (i === route ? C.chart : '#ffffff33'));
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var warn = timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(90, 165, W - 180, 18, '#ffffff22');
    game.draw.rect(90, 165, (W - 180) * frac, 18, warn ? C.bad : C.chart);
    // 残りの順番(結び終えた分を消し込み)
    for (var k = 0; k < seq.length; k++) game.draw.circle(W / 2 - (seq.length - 1) * 22 + k * 44, 215, 10, k < nextIdx ? C.lamp : '#ffffff33');
  }

  function drawWorld() {
    drawSea();
    var order = buoys.map(function(b, i) { return i; }).sort(function(a, b) { return buoys[a].y - buoys[b].y; });
    drawChart();
    for (var i = 0; i < order.length; i++) drawBuoy(buoys[order[i]]);
    drawPier();
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || countIn > 0 || freeze > 0 || phase !== 'input') { game.audio.play('se_tap', 0.06); return; }
    var n = nodePos();
    if (Math.hypot(n.x - x, n.y - 30 - y) < 140) { drag = { x: x, y: y }; game.audio.tone(440, 0.05, { wave: 'triangle', volume: 0.12 }); }
    else { game.audio.play('se_tap', 0.1); game.fx.burst(n.x, n.y - 30, { color: C.white, count: 6, speed: 160 }); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    drag.x = x; drag.y = y;
    if (buoyAt(x, y) >= 0 && Math.random() < 0.15) game.audio.tone(990, 0.02, { wave: 'sine', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    if (closeLeg(x, y) === 'none') game.fx.burst(x, y, { color: C.chart, count: 4, speed: 100 });
  });

  // ── ATTRACT: 3つ光る → 桟橋から1本目 → 違う浮標へ引いて切れる → 正しい順で結び切る ──
  var DEMO = { pos: [{ x: W * 0.28, y: H * 0.42 }, { x: W * 0.72, y: H * 0.36 }, { x: W * 0.62, y: H * 0.6 }], kinds: [0, 3, 4], seq: [2, 0, 1] };
  var DEMO_LEGS = [[2.75, 2], [3.45, 1], [4.15, 0], [4.85, 1]];   // [離す時刻, 浮標]
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0 };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.8;
    if (cyc < dt || demo.t <= dt) { route = 0; buildRoute(0, DEMO); demo.k = 0; drag = null; }
    stepHarbor(dt);
    demo.press = false;
    if (phase === 'input' && demo.k < DEMO_LEGS.length) {
      var leg = DEMO_LEGS[demo.k], start = leg[0] - 0.55;
      var n = nodePos(), b = buoys[leg[1]];
      if (cyc < start) {
        demo.gx += (n.x - demo.gx) * Math.min(1, dt * 8); demo.gy += (n.y - 30 - demo.gy) * Math.min(1, dt * 8);
      } else {
        var t = Math.min(1, (cyc - start) / 0.5);
        if (!drag) drag = { x: n.x, y: n.y };
        demo.gx = n.x + (b.x - n.x) * t; demo.gy = (n.y - 30) + (b.y - 40 - (n.y - 30)) * t;
        drag.x = demo.gx; drag.y = demo.gy; demo.press = true;
        if (cyc >= leg[0]) { closeLeg(b.x, b.y - 40); demo.k++; }
      }
    } else if (phase !== 'input') {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 2); demo.gy += (H * 0.74 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!buoys) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      sign(GAME_TITLE, W / 2, H * 0.055, 84, C.lamp);
      sign('HI-SCORE ' + game.best, W / 2, H * 0.1, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) sign('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.lamp);
      else sign('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      stepHarbor(dt);
      drawWorld();
      sign(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14, 92, won ? C.lamp : C.bad);
      sign('SCORE ' + score, W / 2, H * 0.2, 54, C.white);
      if (score > prevBest && prevBest > 0) sign('NEW RECORD', W / 2, H * 0.25, 50, C.lamp);
      else sign('BEST ' + Math.max(prevBest, score), W / 2, H * 0.25, 40, C.white);
      if (!won) sign('あと' + (NEEDED - links) + '本!', W / 2, H * 0.7, 50, C.chart);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) sign('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      stepHarbor(dt);
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { links: links, clean: cleanLinks, misses: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (freeze > 0) {
      freeze -= dt;
      if (freeze <= 0) finish();
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else {
      stepHarbor(dt);
      if (phase === 'input') {
        timeLeft -= dt;
        if (timeLeft < 4) {
          warnT -= dt;
          if (warnT <= 0) { warnT = 0.45; game.audio.tone(1175, 0.04, { wave: 'square', volume: 0.07 }); }
        }
      }
      if (phase === 'gap') {
        gapT -= dt;
        if (gapT <= 0) { route++; buildRoute(route, null); }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0; over = true; won = false; freeze = 0.5; drag = null; oopsT = 1.5;
        var miss = buoys[seq[Math.min(nextIdx, seq.length - 1)]];
        miss.red = 1; miss.lit = 1;
        game.feedback.bad(miss.x, miss.y - 60, { text: 'TIME UP', color: C.bad });
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) sign(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.lamp);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2],
    ], { tempo: 92, wave: 'triangle', volume: 0.055, loop: true, bass: [['E2', 2], ['C3', 2], ['D3', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
