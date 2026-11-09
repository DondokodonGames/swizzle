// I-Wii-0021v2-ranch-lantern-arc.js
// 牧場のランタン振り — 羊飼いのランタンを決まった弧の上でなぞって往復させ、同じ速さで振り続けるほど灯りが強まって羊が寄ってくる
// 操作: 弧の端にあるランタンを指で押さえ、弧に沿って反対の端までなぞる→戻す、を繰り返す。1往路ごとに前の往路と同じ速さかを判定(揃うほどPERFECT)。2往路目からは向かう先の端に「この速さならここで着く」輪が縮んで見える。弧から指が大きく外れると灯りが漏れる
// 終わり: 灯りのゲージを満たして6頭の羊を囲いへ呼び寄せればCLEAR。15秒以内に呼び切れなければGAME OVER
// @mechanic: trace
// @theme: night_ranch_lantern_arc
// 世界観: 夜の牧場で、羊飼いが丘の上に散った羊の群れに向けてランタンで一定の弧を描き続け、揃った振りの灯りを目印に羊を一頭ずつ囲いへ呼び寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 呼び寄せた羊の数・PERFECT数・最大連続
// スタイル: 90s 16bit

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 空グラデ+遠景シルエット+近景の3層。暗色輪郭とハイライト
  var STYLE = { bg: ['#120a3a', '#3a2a78', '#1d3a4a'], main: ['#ffd25a', '#f4f0e0', '#3f8a4a'], accent: ['#ff8a3a', '#7ad8ff'] };
  var GOLD = STYLE.main[0], WOOL = STYLE.main[1], GRASS = STYLE.main[2], ORANGE = STYLE.accent[0], ICE = STYLE.accent[1];
  var INK = '#0c0820';

  var TITLE = 'LANTERN ARC';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var ARC_CX = W / 2, ARC_CY = Math.round(H * 0.86);
  var ARC_R0 = 380;
  var OFF_ARC = 120;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SHEEP = [
    ['..wwwwww..', '.wwwwwwww.', 'wwwwwwwwkk', 'wwwwwwwkek', 'wwwwwwwkkk', '.wwwwwwww.', '..k.k.k.k.', '..k.k.k.k.'],
    ['..wwwwww..', '.wwwwwwww.', 'wwwwwwwwkk', 'wwwwwwwkek', 'wwwwwwwkkk', '.wwwwwwww.', '.k..k.k..k', 'k...k..k..'],
  ];
  var SPAL = { w: WOOL, k: '#2a2030', e: '#ffffff' };
  var SHEPHERD = [
    ['...hhhh...', '..hhhhhh..', '...ffff...', '...fkfk...', '...ffff...', '..cccccc..', '.cccccccc.', 'cc.cccc.cc', 'f..cccc..f', '...cccc...', '...c..c...', '..bb..bb..'],
    ['...hhhh...', '..hhhhhh..', '...ffff...', '...fkfk...', '...ffff...', '..cccccc..', '.cccccccc.', 'cc.cccc.cc', 'f..cccc..f', '...cccc...', '..c....c..', '.bb....bb.'],
  ];
  var HPAL = { h: '#6a4a2a', f: '#f0c8a0', k: '#2a2030', c: '#4a6ab0', b: '#3a2a20' };
  var LANTERN = ['.oo.', 'oyyo', 'oyyo', '.oo.'];

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 弧(u=0 左端 → u=1 右端) ──
  function arcR(phase) { return ARC_R0 - phase * 40; }
  function arcPt(u, R) { var a = Math.PI + u * Math.PI; return { x: ARC_CX + Math.cos(a) * R, y: ARC_CY + Math.sin(a) * R }; }
  function arcU(x, y) {
    var a = Math.atan2(y - ARC_CY, x - ARC_CX);
    if (a >= 0) return x < ARC_CX ? 0 : 1;
    var u = (a + Math.PI * 2) / Math.PI - 1;
    return Math.max(0, Math.min(1, u));
  }
  function arcDist(x, y, R) { return Math.abs(Math.sqrt((x - ARC_CX) * (x - ARC_CX) + (y - ARC_CY) * (y - ARC_CY)) - R); }

  // ── なぞり判定(本番とデモ共通) ──
  var ZE = 0.06;
  function makeTracer() { return { u: 0, end: -1, atEnd: false, leaveT: -1, pace: 0, combo: 0, strokes: 0 }; }
  // 毎フレーム呼ぶ。端を離れた時刻から反対の端に着くまでの時間(=1往路の速さ)を、前の往路と比べる
  // 結果 'PERFECT' | 'GOOD' | 'MISS' | 'START' | null
  function updateTracer(tr, now, tol) {
    var zone = tr.u <= ZE ? 0 : (tr.u >= 1 - ZE ? 1 : -1);
    if (zone === -1) {
      if (tr.atEnd) { tr.atEnd = false; tr.leaveT = now; }
      if (tr.end !== -1 && tr.leaveT >= 0 && now - tr.leaveT > 2.0) { tr.end = -1; tr.pace = 0; tr.combo = 0; return 'MISS'; }
      return null;
    }
    if (zone === tr.end) { tr.atEnd = true; return null; }
    var prev = tr.end, dur = now - tr.leaveT;
    tr.end = zone; tr.atEnd = true;
    if (prev === -1 || tr.leaveT < 0) { tr.pace = 0; tr.combo = 0; return 'START'; }
    tr.strokes++;
    if (tr.pace === 0) {
      if (dur >= 0.25 && dur <= 1.2) { tr.pace = dur; return 'GOOD'; }
      return 'MISS';
    }
    var ratio = dur / tr.pace;
    var res;
    if (Math.abs(ratio - 1) <= tol) res = 'PERFECT';
    else if (Math.abs(ratio - 1) <= 0.26) res = 'GOOD';
    else res = 'MISS';
    if (res !== 'MISS') tr.pace = Math.max(0.25, Math.min(1.2, tr.pace * 0.75 + dur * 0.25));
    return res;
  }

  // ── 背景(3層) ──
  var STARS = [];
  for (var si = 0; si < 46; si++) STARS.push({ x: (si * 233) % W, y: 240 + (si * 151) % 560, p: si });
  function drawWorld(t, light) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.4, STYLE.bg[1]], [0.62, STYLE.bg[2]], [1, '#0e1a12']]);
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i], tw = Math.sin(t * 2 + s.p) > 0.3;
      game.draw.rect(s.x, s.y, tw ? 6 : 4, tw ? 6 : 4, tw ? '#ffffff' : '#9a90d0');
    }
    game.draw.circle(W * 0.8, H * 0.17, 70, '#fff3c0');
    game.draw.circle(W * 0.8 - 22, H * 0.17 - 12, 62, STYLE.bg[0]);
    // 遠い丘
    for (var x = 0; x < W; x += 24) {
      var hy = H * 0.42 - Math.sin(x * 0.006 + 1) * 60 - Math.sin(x * 0.017) * 20;
      game.draw.rect(x, hy, 24, H * 0.6 - hy, '#22205a');
    }
    // 中景の丘(灯りで明るくなる)
    var mid = light > 0.5 ? '#2c5a3a' : '#22402e';
    for (var x2 = 0; x2 < W; x2 += 24) {
      var hy2 = H * 0.52 - Math.sin(x2 * 0.004 + 2.2) * 50;
      game.draw.rect(x2, hy2, 24, H - hy2, mid);
      game.draw.rect(x2, hy2, 24, 6, '#4a8a5a');
    }
    // 近景の牧草地
    game.draw.rect(0, H * 0.66, W, H * 0.34, '#1f4a2a');
    for (var g = 0; g < 26; g++) {
      var gx = (g * 97) % W, gy = H * 0.67 + (g * 53) % 260;
      var sway = Math.sin(t * 2 + g) * 6;
      game.draw.line(gx, gy, gx + sway, gy - 26, GRASS, 6);
    }
    // 囲い(柵)
    var fx0 = 60, fy = H * 0.63;
    for (var f = 0; f < 6; f++) game.draw.rect(fx0 + f * 60, fy - 70, 14, 90, '#8a5a30');
    game.draw.rect(fx0, fy - 56, 314, 12, '#a86a3a');
    game.draw.rect(fx0, fy - 20, 314, 12, '#a86a3a');
  }

  function drawGlow(x, y, light, combo) {
    var r = 120 + light * 380 + combo * 18;
    game.draw.circle(x, y, r, '#ffd25a12');
    game.draw.circle(x, y, r * 0.66, '#ffd25a1c');
    game.draw.circle(x, y, r * 0.36, '#ffe9a033');
  }

  function drawArc(R, tr, now, live, hl) {
    // 弧の道(点線+端の鈴)
    for (var k = 0; k <= 40; k++) {
      var p = arcPt(k / 40, R);
      game.draw.circle(p.x, p.y, k % 2 ? 6 : 9, hl ? '#ff6a6a' : '#ffe9a066');
    }
    for (var side = 0; side < 2; side++) {
      var e = arcPt(side, R);
      var target = live && tr.pace > 0 && tr.end !== side && tr.end !== -1 && !tr.atEnd;
      game.draw.circle(e.x, e.y, 40, target ? GOLD : '#6a5a3a');
      game.draw.circle(e.x, e.y, 28, INK);
      game.draw.circle(e.x, e.y, 14, target ? '#fff3c0' : '#8a7a5a');
      // 速さの輪: 前と同じ速さならこの輪が縮み切る時に着く
      if (target) {
        var left = tr.leaveT + tr.pace - now;
        var rr = 40 + Math.max(0, left) / tr.pace * 150;
        if (left > -0.3) {
          for (var q = 0; q < 24; q++) {
            var a0 = q / 24 * Math.PI * 2, a1 = (q + 0.6) / 24 * Math.PI * 2;
            game.draw.line(e.x + Math.cos(a0) * rr, e.y + Math.sin(a0) * rr, e.x + Math.cos(a1) * rr, e.y + Math.sin(a1) * rr, left < 0.1 ? '#ffffff' : ICE, 6);
          }
        }
      }
    }
  }

  function drawShepherd(lx, ly, t, walk) {
    var sx = ARC_CX, sy = ARC_CY + 120;
    game.draw.line(sx + 30, sy - 40, lx, ly, '#8a5a30', 8);
    game.draw.sprite(SHEPHERD[walk ? Math.floor(t * 4) % 2 : 0], HPAL, sx, sy, 12, { anchor: 'center' });
    game.draw.sprite(LANTERN, { o: '#6a4a2a', y: GOLD }, lx, ly, 18, { anchor: 'center' });
    game.draw.circle(lx, ly, 22, '#fff8d0');
  }

  // 羊: 丘の上で待ち、灯りが溜まるたび1頭ずつ囲いへ歩く
  function sheepPos(i, called, k, t) {
    var hx = W * 0.45 + i * 90, hy = H * 0.43 + (i % 2) * 30;
    var px = 110 + (i % 3) * 90, py = H * 0.6 + Math.floor(i / 3) * 40;
    if (!called) return { x: hx + Math.sin(t * 0.7 + i) * 10, y: hy, s: 5, walk: false };
    var e = Math.min(1, k);
    return { x: hx + (px - hx) * e, y: hy + (py - hy) * e - Math.abs(Math.sin(e * 12)) * 16, s: 5 + e * 3, walk: e < 1 };
  }
  function drawSheep(called, callT, t, light) {
    for (var i = 0; i < NEEDED; i++) {
      var c = i < called;
      var p = sheepPos(i, c, c ? (t - callT[i]) / 1.2 : 0, t);
      var fr = p.walk ? Math.floor(t * 8) % 2 : Math.floor(t * 1.5 + i) % 2;
      game.draw.sprite(SHEEP[fr], SPAL, p.x, p.y, p.s, { anchor: 'center', flipX: c && p.walk, alpha: c ? 1 : 0.45 + light * 0.5 });
    }
  }

  // ── ゲーム状態 ──
  var halt, tr, light, called, callT, timeLeft, ready, over, won, endT, score, perfects, maxCombo, prevBest, grab, offT, missFlash, phase, clock;

  function initGame() {
    tr = makeTracer(); light = 0; called = 0; callT = []; timeLeft = TIME_LIMIT; ready = 0.8;
    over = false; won = false; endT = 0; score = 0; perfects = 0; maxCombo = 0; prevBest = game.best || 0;
    grab = false; offT = 0; missFlash = 0; phase = 0; clock = 0; halt = null;
  }
  function tolNow() { return [0.15, 0.12, 0.1][phase]; }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 40);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function addLight(v) {
    light = Math.max(0, Math.min(1, light + v));
    while (called < NEEDED && light >= (called + 1) / NEEDED - 0.001) {
      callT[called] = clock; called++;
      game.audio.play('se_coin', 0.35);
      game.audio.tone('A4', 0.25, { wave: 'sawtooth', volume: 0.05, slide: -120 });
      if (called === 2 || called === 4) { phase++; game.fx.popup(called + ' / ' + NEEDED, W / 2, H * 0.3, { color: GOLD, size: 64 }); game.audio.play('se_milestone', 0.4); }
    }
    if (called >= NEEDED) finish(true);
  }

  function handleEnd(res, p) {
    if (!res || res === 'START') { if (res) game.audio.play('se_tap', 0.15); return; }
    var R = arcR(phase);
    var e = arcPt(tr.end < 0 ? tr.u : tr.end, R);
    if (res === 'PERFECT') {
      tr.combo++; perfects++;
      maxCombo = Math.max(maxCombo, tr.combo);
      score += 100 * Math.min(tr.combo, 5);
      addLight(0.07 + Math.min(tr.combo, 4) * 0.012);
      game.feedback.good(e.x, e.y - 130, { text: 'PERFECT', color: GOLD, count: 14 });
      game.audio.tone(440 * Math.pow(1.06, Math.min(tr.combo, 10)), 0.12, { wave: 'triangle', volume: 0.07 });
      if (tr.combo === 4) game.fx.popup('x4', W / 2, H * 0.62, { color: ORANGE, size: 70 });
    } else if (res === 'GOOD') {
      tr.combo = 0;
      score += 50;
      addLight(0.045);
      game.feedback.good(e.x, e.y - 130, { text: 'GOOD', color: ICE, count: 8 });
    } else {
      tr.combo = 0;
      missFlash = 0.4;
      addLight(-0.05);
      game.audio.tone('D3', 0.08, { wave: 'square', volume: 0.08 });
      halt = { t: 0.35, x: e.x, y: e.y };
    }
  }

  function dragTo(x, y) {
    var R = arcR(phase);
    if (arcDist(x, y, R) > OFF_ARC) {
      // 弧から外れた: 灯りが漏れる
      if (offT <= 0) { game.audio.tone('D3', 0.08, { wave: 'square', volume: 0.08 }); addLight(-0.04); tr.combo = 0; tr.end = -1; missFlash = 0.4; var lp0 = arcPt(tr.u, R); halt = { t: 0.35, x: lp0.x, y: lp0.y }; }
      offT = 0.6; grab = false;
      return;
    }
    tr.u = arcU(x, y);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || ready > 0 || halt) return;
    var R = arcR(phase);
    if (arcDist(x, y, R) <= OFF_ARC) {
      grab = true; offT = 0;
      game.audio.play('se_tap', 0.2);
      dragTo(x, y);
    } else {
      game.audio.tone('D3', 0.06, { wave: 'square', volume: 0.05 });
    }
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !grab || over || ready > 0 || halt) return;
    var pu = tr.u;
    dragTo(x, y);
    // 弧のてっぺんを通るたびにランタンの取っ手がきしむ
    if ((pu - 0.5) * (tr.u - 0.5) < 0) game.audio.tone(tr.u > pu ? 'E5' : 'C5', 0.04, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function () {
    if (grab && state === S.PLAYING && !over) game.audio.tone('G3', 0.05, { wave: 'sine', volume: 0.04 });
    grab = false;
  });

  // ── ATTRACT ゴースト実演: 同じ速さで2往路PERFECT → 慌てて速く振ってMISS ──
  var demo = { t: 0, tr: null, u: 0, light: 0.1, combo: 0, called: 0 };
  var DEMO_SEG = [[0, 0.5], [1, 0.8], [0, 0.8], [1, 0.8], [0, 0.35], [0, 0.9]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.15;
    if (cyc < dt || demo.t <= dt || !demo.tr) { demo.tr = makeTracer(); demo.u = 0; demo.light = 0.1; }
    var acc = 0, from = 0, to = 0, k = 0;
    for (var i = 0; i < DEMO_SEG.length; i++) {
      if (cyc < acc + DEMO_SEG[i][1]) { to = DEMO_SEG[i][0]; k = (cyc - acc) / DEMO_SEG[i][1]; break; }
      acc += DEMO_SEG[i][1]; from = DEMO_SEG[i][0]; to = from; k = 1;
    }
    demo.u = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * k));
    demo.tr.u = demo.u;
    var res = updateTracer(demo.tr, demo.t, 0.14);
    if (res) {
      var e = arcPt(demo.tr.end < 0 ? 0 : demo.tr.end, ARC_R0);
      if (res === 'PERFECT' || res === 'GOOD') { demo.light = Math.min(1, demo.light + 0.25); game.feedback.good(e.x, e.y - 130, { text: res, color: GOLD, count: 8, volume: 0.2 }); }
      else if (res === 'MISS') { demo.light = Math.max(0.1, demo.light - 0.2); game.feedback.bad(e.x, e.y - 130, { text: 'MISS', volume: 0.2, shake: 4 }); }
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(SHEEP[0], i < called ? SPAL : { w: '#4a4470', k: '#2a2050', e: '#4a4470' }, 90 + i * 100, 80, 6, { anchor: 'center' });
    txt(called + ' / ' + NEEDED, W - 170, 76, 48, WOOL);
    txt(String(score), W - 170, 140, 38, GOLD);
    game.draw.rect(60, 128, 560, 26, INK);
    game.draw.rect(64, 132, 552 * light, 18, GOLD);
    for (var s = 1; s < NEEDED; s++) game.draw.rect(60 + 560 * s / NEEDED, 128, 4, 26, INK);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 190, W - 120, 16, INK);
    game.draw.rect(60, 190, (W - 120) * fr, 16, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? ORANGE : ICE);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.14, W - 160, 380, '#120a3add');
    game.draw.rect(80, H * 0.14, W - 160, 8, GOLD);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14 + 80, 96, won ? GOLD : ORANGE);
    txt(called + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.14 + 170, 40, WOOL);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.14 + 240, 48, GOLD);
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.14 + 240, 40, WOOL);
    if (!won) txt('あと' + (NEEDED - called) + '頭!', W / 2, H * 0.14 + 320, 52, ORANGE);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var dp = arcPt(demo.u, ARC_R0);
      drawWorld(t, demo.light);
      drawGlow(dp.x, dp.y, demo.light, 0);
      drawSheep(0, [], t, demo.light);
      drawArc(ARC_R0, demo.tr, demo.t, true, false);
      drawShepherd(dp.x, dp.y, t, false);
      game.draw.hand(dp.x, dp.y + 10, { press: true, scale: 14 });
      txt(TITLE, W / 2, H * 0.07, 88, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 38, WOOL);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 42, GOLD);
      else txt('TAP TO START', W / 2, H * 0.97, 40, WOOL);
      return;
    }
    if (state === S.RESULT) {
      drawWorld(t, light);
      drawSheep(called, callT, t + 5, light);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 36, WOOL);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt; clock += dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { sheep: called, perfect: perfects, maxCombo: maxCombo };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) { game.feedback.bad(halt.x, halt.y - 130, { text: 'MISS' }); halt = null; }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt; clock += dt;
      handleEnd(updateTracer(tr, clock, tolNow()));
      if (offT > 0) offT -= dt;
      if (missFlash > 0) missFlash -= dt;
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' }); finish(false); }
    }

    var R = arcR(phase);
    var lp = arcPt(tr.u, R);
    drawWorld(t, light);
    drawGlow(lp.x, lp.y, light, tr.combo);
    drawSheep(called, callT, clock, light);
    drawArc(R, tr, clock, ready <= 0 && !over, missFlash > 0 && Math.floor(t * 14) % 2 === 0);
    // 開始時お手本: 最初はランタンが白く明滅
    if (!grab && tr.strokes === 0 && Math.floor(t * 5) % 2 === 0) game.draw.circle(lp.x, lp.y, 56, '#ffffff55');
    drawShepherd(lp.x, lp.y, t, grab);
    if (halt) { var hk = 1 + halt.t / 0.35 * 0.6; game.draw.circle(halt.x, halt.y, 60 * hk, '#ffffff'); game.draw.sprite(LANTERN, { o: '#ff6a6a', y: '#ffffff' }, halt.x, halt.y, 18 * hk, { anchor: 'center' }); }
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GOLD);
    if (over) drawResult();
  });

  game.onStart(function () {
    game.audio.melody([
      ['D5', 1], ['F#5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1], ['A4', 1], ['B4', 1], ['D5', 2],
    ], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
