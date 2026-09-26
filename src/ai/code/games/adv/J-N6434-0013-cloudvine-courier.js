// J-N6434-0013-cloudvine-courier.js
// 雲霧の蔓わたし — 揺れる蔓の先が前方の光る弧に入った瞬間だけ跳び、次の蔓へ移って渓谷を渡る
// 操作: ぶら下がった蔓が前へ振れて光る弧の中にある間にタップで次の蔓へ跳ぶ。弧の外で押すと手が滑って霧へ落ちる
// 終わり: 6本の蔓を渡り切って対岸に着けばCLEAR。3回落ちるかTIME UPでGAME OVER
// @mechanic: timing_window
// @theme: cloud_forest_vine_courier
// 世界観: 雲霧林の郵便配達を務める見習いテナガザルが、谷底が霧に沈んだ渓谷の蔓を飛び移り、対岸の樹上村へ朝の手紙を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った蔓の数とPERFECT数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層のパララックス背景
  var STYLE = { bg: ['#5ec8f0', '#2f8f7a', '#1a4a4a'], main: ['#8a5a2a', '#f8d8a0'], accent: ['#f8e040', '#f04868'] };
  var C = {
    sky1: '#5ec8f0', sky2: '#b8ecf0', far: '#4a9a9a', mid: '#2f7a5a', near: '#1f5a3a',
    mist: '#f0fbff', vine: '#3a8a2a', vineDark: '#2a5a1a', leaf: '#5ac83a', gold: '#f8e040',
    red: '#f04868', white: '#ffffff', ink: '#1a2a2a', cliff: '#8a6a4a', cliffDark: '#5a4030'
  };

  var TITLE = 'CLOUDVINE COURIER';
  var TIME_LIMIT = 12;
  var NEEDED = 6;
  var LIVES = 3;
  var SPACING = 420;
  var ANCHOR_Y = H * 0.20;
  var VINE_L = H * 0.30;
  var AMP = 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var APE_HANG = [
    '..bbbb..',
    '.bffffb.',
    '.bfkfkb.',
    '.bffffb.',
    'bb.bb.bb',
    'b.bbbb.b',
    '..bmmb..',
    '..b..b..',
    '.bb..bb.'
  ];
  var APE_JUMP = [
    'b.bbbb.b',
    'bbffffbb',
    '.bfkfkb.',
    '.bffffb.',
    '..bbbb..',
    '..bmmb..',
    '.bb..bb.',
    'bb....bb',
    '........'
  ];
  var APE_PAL = { b: '#8a5a2a', f: '#f8d8a0', k: '#1a2a2a', m: '#f8f8f8' };
  var FRUIT = ['.g.', 'yyy', 'yyy', '.y.'];
  var BIRD = ['w.w', '.w.'];

  var vines, cur, cam, timeLeft, lives, crossed, perfects, phase, phaseT, leap, fall, apex, endOk, focusX, focusY, lastSide;
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, cd: 0, n: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function makeVines() {
    vines = [];
    for (var i = 0; i <= NEEDED; i++) {
      vines.push({
        ax: 300 + i * SPACING + (i % 2 ? 30 : -20),
        len: VINE_L * (0.9 + (i % 3) * 0.07),
        ph: i * 1.3,
        w: 3.1 + i * 0.32,
        thr: Math.min(0.86, 0.7 + i * 0.03),
        gold: i === 2 || i === 5
      });
    }
  }

  function initGame() {
    makeVines();
    cur = 0; cam = 0; timeLeft = TIME_LIMIT; lives = LIVES; crossed = 0; perfects = 0;
    phase = 'ready'; phaseT = 0.8; leap = null; fall = null; apex = 0; endOk = false;
    focusX = W / 2; focusY = H / 2; lastSide = 0;
  }

  function vineEnd(v) {
    var th = AMP * Math.sin(v.ph);
    return { x: v.ax + Math.sin(th) * v.len, y: ANCHOR_Y + Math.cos(th) * v.len, th: th };
  }

  function inWindow(v) {
    return Math.sin(v.ph) >= v.thr;
  }

  function tryLeap(live) {
    if (phase !== 'play' || leap || fall) return;
    var v = vines[cur], e = vineEnd(v);
    if (inWindow(v)) {
      var perfect = Math.sin(v.ph) > 0.95;
      if (perfect) perfects++;
      var last = cur + 1 >= NEEDED;
      var nv = vines[cur + 1];
      nv.ph = -0.35;
      leap = { x0: e.x, y0: e.y, t: 0, dur: 0.34, to: cur + 1, last: last };
      if (live) {
        game.audio.play('se_jump', 0.45);
        game.feedback.good(e.x - cam, e.y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.leaf });
        if (v.gold && perfect) { game.audio.play('se_coin', 0.5); game.fx.popup('x2', e.x - cam, e.y - 150, { color: C.gold, size: 60 }); perfects++; }
      }
    } else {
      fall = { x: e.x, y: e.y, vy: -200, t: 0 };
      lives--;
      focusX = e.x - cam; focusY = e.y;
      if (live) game.feedback.bad(e.x - cam, e.y - 60, { text: 'MISS' });
    }
  }

  function stepWorld(dt, live) {
    var v = vines[cur];
    for (var i = 0; i < vines.length; i++) {
      if (i !== cur) vines[i].ph += dt * 1.6;
    }
    if (!leap && !fall) {
      var before = Math.sin(v.ph);
      v.ph += v.w * dt;
      var after = Math.sin(v.ph);
      // 弧に入った瞬間の合図音(音が先生)
      if (before < v.thr && after >= v.thr && live) game.audio.tone(660 + cur * 40, 0.05, { wave: 'triangle', volume: 0.06 });
    }
    if (leap) {
      leap.t += dt;
      if (leap.t >= leap.dur) {
        cur = leap.to; crossed = cur; leap = null;
        if (live) {
          game.audio.play('se_tap', 0.3);
          if (crossed === 3) { game.fx.popup('あと' + (NEEDED - crossed) + '本!', W / 2, H * 0.14 + 90, { color: C.gold, size: 52 }); game.audio.play('se_milestone', 0.5); }
        }
      }
    }
    if (fall) {
      fall.t += dt; fall.vy += 1800 * dt; fall.y += fall.vy * dt;
      if (fall.t > 0.7) { fall = null; vines[cur].ph = -1.2; }
    }
    var targetCam = vines[Math.min(cur, vines.length - 1)].ax - W * 0.36;
    cam += (targetCam - cam) * Math.min(1, dt * 4);
  }

  function drawBg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.45, C.sky2], [0.62, C.far], [1, C.near]]);
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(el * 1.5));
    // 遠景の崖(パララックス1)
    for (var i = -1; i < 6; i++) {
      var fx = i * 260 - ((cam * 0.2) % 260);
      game.draw.rect(fx, H * 0.40 + (i % 2) * 40, 200, H * 0.4, C.far, 0.8);
    }
    // 中景の岩柱(パララックス2)
    for (var j = -1; j < 5; j++) {
      var mx = j * 330 - ((cam * 0.5) % 330);
      game.draw.rect(mx, H * 0.55 + (j % 3) * 30, 120, H * 0.4, C.mid);
      game.draw.circle(mx + 60, H * 0.55 + (j % 3) * 30, 90, C.mid);
    }
    // 鳥
    for (var b = 0; b < 3; b++) {
      var bx = ((el * 70 + b * 380) % (W + 200)) - 100;
      game.draw.sprite(BIRD, { w: C.white }, bx, H * 0.30 + b * 50 + Math.sin(el * 4 + b) * 12, 8, { anchor: 'center' });
    }
    // 頭上の枝
    game.draw.rect(0, ANCHOR_Y - 60, W, 50, C.vineDark);
    for (var k = 0; k < 12; k++) game.draw.circle(k * 100 - (cam % 100), ANCHOR_Y - 60, 50, C.near);
  }

  function drawMist() {
    var el = game.time.elapsed;
    for (var m = 0; m < 6; m++) {
      var mx = ((el * 30 * (m % 2 ? 1 : -1) + m * 230) % (W + 400)) - 200;
      game.draw.circle(mx, H * 0.80 + (m % 3) * 50, 180, C.mist, 0.55);
    }
    game.draw.rect(0, H * 0.84, W, H * 0.16, C.mist, 0.8);
  }

  function drawVines() {
    for (var i = 0; i < vines.length; i++) {
      var v = vines[i], e = vineEnd(v);
      var ax = v.ax - cam;
      if (ax < -300 || ax > W + 300) continue;
      if (i === cur && !leap && !fall) {
        // 前方の光る弧(判定窓)
        var hot = inWindow(v);
        for (var d = 0; d <= 8; d++) {
          var a = Math.asin(v.thr) + (Math.PI / 2 - Math.asin(v.thr)) * (d / 8);
          var th = AMP * Math.sin(a);
          game.draw.circle(ax + Math.sin(th) * v.len, ANCHOR_Y + Math.cos(th) * v.len, hot ? 22 : 14, v.gold ? C.gold : C.leaf, hot ? 0.9 : 0.45);
        }
      }
      game.draw.line(ax, ANCHOR_Y - 20, e.x - cam, e.y, C.vine, 12);
      for (var l = 1; l < 4; l++) {
        var lx = ax + (e.x - cam - ax) * l / 4, ly = ANCHOR_Y + (e.y - ANCHOR_Y) * l / 4;
        game.draw.circle(lx + 14, ly, 14, C.leaf);
      }
      if (v.gold && i > cur) game.draw.sprite(FRUIT, { g: C.leaf, y: C.gold }, e.x - cam + 30, e.y - 20, 10, { anchor: 'center' });
    }
    // 対岸の崖
    var gx = vines[NEEDED].ax - cam - 40;
    game.draw.rect(gx, vines[NEEDED].len + ANCHOR_Y - 10, W, H, C.cliff);
    game.draw.rect(gx, vines[NEEDED].len + ANCHOR_Y - 10, W, 24, C.leaf);
  }

  function drawApe() {
    var el = game.time.elapsed, x, y, spr = APE_HANG;
    if (leap) {
      var t = leap.t / leap.dur, nv = vines[leap.to], ne = vineEnd(nv);
      x = leap.x0 + (ne.x - leap.x0) * t; y = leap.y0 + (ne.y - leap.y0) * t - Math.sin(Math.PI * t) * 160;
      spr = APE_JUMP;
    } else if (fall) {
      x = fall.x; y = fall.y; spr = APE_JUMP;
    } else {
      var e = vineEnd(vines[cur]);
      x = e.x; y = e.y + Math.sin(el * 6) * 3;
    }
    game.draw.sprite(spr, APE_PAL, x - cam, y + 40, 13, { anchor: 'center', flipY: !!fall });
    return { x: x - cam, y: y };
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.085, C.ink, 0.5);
    txt(crossed + ' / ' + NEEDED, W * 0.5, H * 0.04, 60, C.white);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(APE_HANG, i < lives ? APE_PAL : { b: '#445', f: '#667', k: '#223', m: '#667' }, 70 + i * 90, H * 0.04, 6, { anchor: 'center' });
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(W * 0.66, H * 0.03, W * 0.3, 26, '#223');
    game.draw.rect(W * 0.66, H * 0.03, W * 0.3 * frac, 26, frac < 0.25 ? C.red : C.gold);
  }

  function scoreOf() { return crossed * 100 + perfects * 60 + Math.round(timeLeft * 25) + lives * 50; }

  function drawResult() {
    game.draw.rect(0, H * 0.34, W, H * 0.26, C.ink, 0.75);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.39, 100, endOk ? C.gold : C.red);
    txt(crossed + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, C.white);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.53, 54, C.gold);
    else if (!endOk) txt('あと' + (NEEDED - crossed) + '本!', W / 2, H * 0.53, 54, C.gold);
    else txt('BEST ' + game.best, W / 2, H * 0.53, 42, C.white);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.cd = 0; demo.n = 0; }
    stepWorld(dt, false);
    demo.cd -= dt;
    demo.press = demo.cd > 0.15;
    if (cur >= NEEDED) return;
    var v = vines[cur];
    // 3本目だけ早押しの失敗を見せる
    var wantMiss = cur === 2 && demo.n === 0;
    if (!leap && !fall && demo.cd <= 0) {
      if ((wantMiss && Math.sin(v.ph) < 0.2 && Math.sin(v.ph) > 0) || (!wantMiss && Math.sin(v.ph) > 0.93)) {
        if (wantMiss) demo.n = 1;
        tryLeap(false);
        if (fall) lives = LIVES;
        demo.cd = 0.3;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play' && !leap && !fall) tryLeap(true);
    else game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!vines) initGame();
      stepDemo(dt);
      drawBg(); drawVines(); drawApe(); drawMist();
      game.draw.hand(W * 0.5, H * 0.72, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.07, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.12, 40, C.white);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.red);
      else txt('INSERT COIN', W / 2, H * 0.93, 46, C.ink);
      return;
    }
    if (state === S.RESULT) {
      drawBg(); drawVines(); drawApe(); drawMist(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.ink);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      var wasFall = !!fall;
      stepWorld(dt, true);
      if (crossed >= NEEDED && !leap) {
        endOk = true; phase = 'stop'; phaseT = 0.45;
        var e = vineEnd(vines[cur]); focusX = e.x - cam; focusY = e.y;
      } else if (wasFall && lives <= 0) {
        endOk = false; phase = 'stop'; phaseT = 0.4;
      } else if (timeLeft <= 0) {
        timeLeft = 0; endOk = false; phase = 'stop'; phaseT = 0.45;
        var e2 = vineEnd(vines[cur]); focusX = e2.x - cam; focusY = e2.y;
      }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.gold, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#fff8c0', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        if (endOk) game.end.success(scoreOf(), { vines: crossed, perfects: perfects, lives: lives });
        else game.end.failure({ vines: crossed, perfects: perfects });
        return;
      }
    }

    drawBg(); drawVines();
    var ap = drawApe();
    drawMist(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY + 40, 110 + (0.45 - phaseT) * 100, C.white, 0.5);
      game.draw.sprite(endOk ? APE_JUMP : APE_HANG, APE_PAL, focusX, focusY + 40, 18, { anchor: 'center' });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 110, C.gold);
    if (phase === 'end') drawResult();
    if (ap && fall && phase === 'play') game.draw.circle(ap.x, ap.y + 40, 70, C.white, 0.3);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 2]
    ], { tempo: 138, wave: 'square', volume: 0.05, loop: true, bass: [['D3', 1], ['A2', 1], ['C3', 1], ['G2', 1], ['D3', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
