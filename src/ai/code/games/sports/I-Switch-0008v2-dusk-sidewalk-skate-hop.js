// I-Switch-0008v2-dusk-sidewalk-skate-hop.js
// 夕暮れ歩道オーリー — スケートボードの少年が歩道を滑り続け、流れてくる段差と植え込みをタップで跳び越え、手すりには跳び乗って滑ってスケートショップまで駆け抜ける
// 操作: 滑りは自動。タップで跳ぶ(地面か手すりの上にいる時だけ。高さと幅は毎回同じ)。低い段差は手前のどこから跳んでも越えられるが、幅のある植え込みは近くから跳ばないと着地で突っ込む。手すりは跳んで上に乗ると自動で滑り(グラインド)、端で降りる。障害の縁の近くで跳ぶとPERFECT。ぶつかると転んで車輪を1つ失う
// 終わり: 20秒以内にスケートショップの前に着けばCLEAR(跳び方・グラインド・残り車輪の点)。3回転ぶ/時間切れでGAME OVER
// @mechanic: camera_run
// @theme: dusk_sidewalk_skate_hop
// 世界観: ネオンの灯り始めた夕暮れの都会の歩道で、スケートボードの少年が縁石の段差と植え込みを跳び越え、手すりを滑りながら、閉店前のスケートショップまで一気に滑り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT跳び数・グラインド数・転んだ回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデの上に発光4色。太い暗線+細い明線の重ねでグロー、点滅で注意を引く
  var STYLE = { bg: ['#060a24', '#0c1440', '#16225e'], main: ['#ff3cc8', '#3cf0ff', '#ffe03c'], accent: ['#7cff5a', '#ffffff'] };
  var C = {
    navy: STYLE.bg[0], navy2: STYLE.bg[1], navy3: STYLE.bg[2], pink: STYLE.main[0], cyan: STYLE.main[1], yellow: STYLE.main[2],
    lime: STYLE.accent[0], white: STYLE.accent[1], pinkDim: '#5a1448', cyanDim: '#145058', yellowDim: '#5a4c14', limeDim: '#245a1c', ink: '#02040e',
  };

  var GAME_TITLE = 'SIDEWALK OLLIE';
  var TIME_LIMIT = 20;
  var COURSE = 7600;
  var WHEELS = 3;
  var GRAV = 3100, JUMP_V = 1150;
  var RUN_X = 300, SK_HALF = 34;
  var GROUND = Math.round(H * 0.68);
  var CURB_H = 50, PLANT_H = 90, PLANT_W = 150, RAIL_H = 80, RAIL_LEN = 320;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var course, wx, h, vy, air, onRail, speed, playT, readyT, stopT, focus, pressT, bailT, invT, jumpFrom;
  var wheels, score, perfects, grinds, falls, streak, maxStreak, over, won, outroT, milestone, prevBest;

  function buildCourse(demo) {
    var f = [], x = 900, n = 0;
    var seq = ['curb', 'planter', 'rail', 'planter', 'curb', 'rail', 'planter', 'curb', 'planter', 'rail'];
    while (x < COURSE - 600) {
      var tp = demo ? seq[n % seq.length] : (n < 2 ? ['curb', 'planter'][n] : ['curb', 'planter', 'planter', 'rail'][Math.floor(game.random(0, 4))]);
      var wdt = tp === 'curb' ? 40 : (tp === 'planter' ? PLANT_W : RAIL_LEN);
      f.push({ i: n, x: x, type: tp, w: wdt, hit: false, judged: false, flash: 0 });
      x += wdt + (demo ? 560 : game.random(520, 720) - Math.min(140, n * 12));
      n++;
    }
    return f;
  }

  function initGame(demo) {
    course = buildCourse(demo);
    wx = 0; h = 0; vy = 0; air = false; onRail = null; speed = 540; playT = 0; readyT = demo ? 0 : 0.8; stopT = 0; focus = null; pressT = 0; bailT = 0; invT = 0; jumpFrom = null;
    wheels = WHEELS; score = 0; perfects = 0; grinds = 0; falls = 0; streak = 0; maxStreak = 0; over = false; won = false; outroT = 0; milestone = false; prevBest = game.best;
  }

  function nextObst() {
    for (var i = 0; i < course.length; i++) if (!course[i].judged && course[i].x + course[i].w > wx - SK_HALF) return course[i];
    return null;
  }

  function jump() {
    if (air || stopT > 0 || bailT > 0) return false;
    air = true; vy = JUMP_V; onRail = null;
    var f = nextObst();
    jumpFrom = (f && f.x - wx > 0 && f.x - wx < 500) ? { f: f, D: f.x - wx } : null;
    game.audio.play('se_jump', 0.35);
    return true;
  }

  function award(f, word, pts, col) {
    streak++; maxStreak = Math.max(maxStreak, streak);
    var total = Math.round(pts * (1 + Math.min(4, streak) * 0.25));
    if (state === S.PLAYING) score += total;
    game.feedback.good(RUN_X + 60, GROUND - h - 200, { text: word, color: col, size: word === 'PERFECT' ? 54 : 46, sound: word === 'PERFECT' ? 'se_coin' : 'se_good', volume: 0.3, count: 10 });
    game.fx.popup('+' + total, RUN_X + 80, GROUND - h - 290, { color: C.yellow, size: 50 });
    if (streak >= 2) game.audio.tone(540 + streak * 60, 0.06, { wave: 'square', volume: 0.04 });
  }

  function bail(f, demo) {
    f.hit = true; f.judged = true; f.flash = 0.6; focus = f; stopT = 0.45; bailT = 0.6; streak = 0; falls++;
    air = false; onRail = null; vy = 0; h = 0;
    game.feedback.bad(RUN_X, GROUND - 120, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.45);
    if (!demo) { wheels--; if (wheels <= 0) { finish(false); } }
    invT = 1.0;
  }

  function stepSkater(dt, demo) {
    playT += dt;
    speed = 540 + Math.min(1, playT / TIME_LIMIT) * 120;
    if (pressT > 0) pressT -= dt;
    if (invT > 0) invT -= dt;
    if (bailT > 0) { bailT -= dt; wx += speed * 0.3 * dt; return; }
    wx += speed * dt;
    if (air) {
      h += vy * dt; vy -= GRAV * dt;
      // 手すりに乗る
      for (var r = 0; r < course.length; r++) {
        var rl = course[r];
        if (rl.type !== 'rail' || rl.hit) continue;
        if (vy < 0 && wx > rl.x && wx < rl.x + rl.w && h <= RAIL_H + 10 && h >= RAIL_H - 36) {
          air = false; onRail = rl; h = RAIL_H; vy = 0;
          if (!rl.judged) { rl.judged = true; grinds++; award(rl, 'GOOD', 150, C.cyan); }
          game.audio.tone(880, 0.08, { wave: 'sawtooth', volume: 0.05 });
          break;
        }
      }
      if (air && h <= 0 && vy < 0) {
        air = false; h = 0; vy = 0;
        game.audio.tone(150, 0.04, { wave: 'triangle', volume: 0.05 });
        if (jumpFrom && jumpFrom.f.judged && !jumpFrom.f.hit && jumpFrom.f.type !== 'rail') {
          var pf = jumpFrom.D <= 110 + (jumpFrom.f.type === 'planter' ? 40 : 0);
          award(jumpFrom.f, pf ? 'PERFECT' : 'GOOD', (jumpFrom.f.type === 'curb' ? 50 : 120) + (pf ? 80 : 0), pf ? C.yellow : C.lime);
          if (pf) perfects++;
        }
        jumpFrom = null;
      }
    } else if (onRail) {
      if (Math.floor(playT * 20) % 2 === 0) game.fx.burst(RUN_X - 20, GROUND - RAIL_H + 10, { color: C.yellow, count: 2, speed: 160 });
      if (wx > onRail.x + onRail.w) { air = true; vy = 200; onRail = null; game.audio.tone(600, 0.05, { wave: 'square', volume: 0.04 }); }
    }
    for (var i = 0; i < course.length; i++) {
      var f = course[i];
      if (f.flash > 0) f.flash -= dt;
      if (f.hit) continue;
      var front = wx + SK_HALF * 0.6, back = wx - SK_HALF * 0.6;
      var top = f.type === 'curb' ? CURB_H : (f.type === 'planter' ? PLANT_H : RAIL_H);
      if (front > f.x && back < f.x + f.w) {
        if (f.type === 'rail') { if (h < RAIL_H - 36 && onRail !== f && invT <= 0) { bail(f, demo); return; } }
        else if (h < top - 6 && invT <= 0) { bail(f, demo); return; }
      }
      if (!f.judged && f.type !== 'rail' && back > f.x + f.w) f.judged = true;
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += wheels * 150 + Math.round(Math.max(0, TIME_LIMIT - playT) * 20);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 1000), { color: [C.pink, C.cyan, C.yellow][i % 3], count: 22, speed: 440 });
      game.fx.flash(C.white, 0.2);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    pressT = 0.18;
    if (!jump()) { game.audio.play('se_tap', 0.06); game.fx.burst(RUN_X, GROUND - h - 40, { color: C.cyan, count: 3, speed: 90 }); }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function glow(x1, y1, x2, y2, bright, dim, w) {
    game.draw.line(x1, y1, x2, y2, dim, (w || 4) + 10);
    game.draw.line(x1, y1, x2, y2, bright, w || 4);
  }
  function sx(x) { return RUN_X + (x - wx); }

  // スケーターの少年(キャップ・パーカー)+板: 滑り2コマ / オーリー / 転び
  var SK = [
    ['....ccc.....', '...ccccc....', '...cffc.....', '....ff......', '...pppp.....', '..p.pp.p....', '....pp......', '...pppp.....', '...b..b.....', '...b..b.....', 'kkkkkkkkkk..', '.o......o...'],
    ['....ccc.....', '...ccccc....', '...cffc.....', '....ff......', '...pppp.....', '..p.pp.p....', '....pp......', '...pppp.....', '..b....b....', '..b....b....', 'kkkkkkkkkk..', '.o......o...'],
    ['....ccc.....', '...ccccc....', '...cffc.....', '....ff......', '..p.pppp....', '.p..pp.p....', '....pp......', '..bppppb....', '..b....b....', '...k........', '....kk......', '.....kkkkkk.'],
    ['............', '............', '.......ccc..', '......cfffc.', '....pppcc...', '...pppp.....', '..pp.pp.b...', '.b......b...', 'b...........', 'k.kkkkkkkk..', '..o......o..', '............'],
  ];
  var SKPAL = { c: '#ff3cc8', f: '#ffe0c0', p: '#3cf0ff', b: '#1a2a5a', k: '#ffe03c', o: '#ffffff' };

  function drawCity() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.navy], [0.45, C.navy2], [1, C.navy3]]);
    // 夕暮れの太陽(横縞)
    for (var s = 0; s < 8; s++) game.draw.rect(560 - 150 + s * 6, 360 + s * 28, 300 - s * 12, 14, s % 2 ? C.pink : C.yellow, 0.7 - s * 0.06);
    // ビルのシルエットと窓
    var off1 = (wx * 0.2) % 300;
    for (var b = -1; b < 5; b++) {
      var bx = b * 300 - off1, bh = 320 + ((b + 9) % 3) * 110, top = GROUND - 240 - bh;
      game.draw.rect(bx, top, 220, bh + 240, '#0a1030');
      glow(bx, top, bx + 220, top, C.cyan, C.cyanDim, 2);
      for (var wy = top + 50; wy < GROUND - 280; wy += 60) for (var wk = 30; wk < 200; wk += 60) if ((b * 3 + wy / 60 + wk / 60) % 4 !== 0) game.draw.rect(bx + wk, wy, 26, 30, C.yellow, 0.6);
    }
    // ネオン看板(点滅)
    var off2 = (wx * 0.45) % 700;
    for (var n = -1; n < 3; n++) {
      var nx = n * 700 - off2 + 300, on = Math.floor(t * 3 + n) % 4 !== 0;
      glow(nx, GROUND - 420, nx + 160, GROUND - 420, on ? C.pink : C.pinkDim, C.pinkDim, 4);
      glow(nx, GROUND - 420, nx, GROUND - 340, on ? C.pink : C.pinkDim, C.pinkDim, 4);
      glow(nx + 160, GROUND - 420, nx + 160, GROUND - 340, on ? C.pink : C.pinkDim, C.pinkDim, 4);
      glow(nx, GROUND - 340, nx + 160, GROUND - 340, on ? C.pink : C.pinkDim, C.pinkDim, 4);
    }
    // 歩道(タイルの目地が流れる)と車道
    game.draw.rect(0, GROUND, W, H - GROUND, '#0a1034');
    glow(0, GROUND, W, GROUND, C.cyan, C.cyanDim, 4);
    var off3 = wx % 120;
    for (var g = -off3; g < W; g += 120) game.draw.line(g, GROUND + 10, g - 50, GROUND + 130, C.cyanDim, 2);
    glow(0, GROUND + 140, W, GROUND + 140, C.cyan, C.cyanDim, 2);
    var doff = (wx * 1.3) % 180;
    for (var d = -doff; d < W; d += 180) glow(d, GROUND + 260, d + 90, GROUND + 260, C.yellow, C.yellowDim, 4);
  }

  function drawObst(f) {
    var x = sx(f.x);
    if (x + f.w < -100 || x > W + 300) return;
    var hl = focus === f && stopT > 0;
    var t = game.time.elapsed;
    if (f.type === 'curb') {
      glow(x, GROUND, x, GROUND - CURB_H, hl ? C.white : C.yellow, C.yellowDim, 6);
      glow(x, GROUND - CURB_H, x + f.w, GROUND - CURB_H, hl ? C.white : C.yellow, C.yellowDim, 6);
      glow(x + f.w, GROUND - CURB_H, x + f.w, GROUND, hl ? C.white : C.yellow, C.yellowDim, 6);
    } else if (f.type === 'planter') {
      glow(x, GROUND, x, GROUND - 50, hl ? C.white : C.pink, C.pinkDim, 4);
      glow(x + f.w, GROUND, x + f.w, GROUND - 50, hl ? C.white : C.pink, C.pinkDim, 4);
      glow(x, GROUND - 50, x + f.w, GROUND - 50, hl ? C.white : C.pink, C.pinkDim, 4);
      for (var l = 0; l < 4; l++) {
        var lx = x + 20 + l * 36;
        glow(lx, GROUND - 50, lx + 16, GROUND - PLANT_H, hl ? C.white : C.lime, C.limeDim, 4);
        glow(lx + 16, GROUND - PLANT_H, lx + 32, GROUND - 50, hl ? C.white : C.lime, C.limeDim, 4);
      }
      glow(x, GROUND - PLANT_H, x + f.w, GROUND - PLANT_H, C.limeDim, C.limeDim, 2);
    } else {
      glow(x, GROUND - RAIL_H, x + f.w, GROUND - RAIL_H, hl ? C.white : C.cyan, C.cyanDim, 6);
      glow(x + 20, GROUND, x + 20, GROUND - RAIL_H, C.cyan, C.cyanDim, 3);
      glow(x + f.w - 20, GROUND, x + f.w - 20, GROUND - RAIL_H, C.cyan, C.cyanDim, 3);
    }
    if (f.hit) glow(x, GROUND - 10, x + f.w, GROUND - 14, C.pinkDim, C.pinkDim, 3);
    var dist = f.x - wx;
    if (!f.judged && !f.hit && dist > 100 && dist < speed * 0.8 && Math.floor(t * 8) % 2 === 0) game.draw.circle(x + f.w / 2, GROUND - 170, 12, f.type === 'rail' ? C.cyan : C.pink);
  }

  function drawShop() {
    var gx = sx(COURSE);
    if (gx > W + 300) return;
    glow(gx, GROUND, gx, GROUND - 520, C.pink, C.pinkDim, 4);
    glow(gx + 320, GROUND, gx + 320, GROUND - 520, C.pink, C.pinkDim, 4);
    glow(gx, GROUND - 520, gx + 320, GROUND - 520, C.pink, C.pinkDim, 4);
    glow(gx + 40, GROUND - 440, gx + 280, GROUND - 440, Math.floor(game.time.elapsed * 4) % 2 ? C.yellow : C.yellowDim, C.yellowDim, 6);
    glow(gx + 60, GROUND - 380, gx + 260, GROUND - 380, C.cyan, C.cyanDim, 8);
    glow(gx + 110, GROUND, gx + 110, GROUND - 200, C.cyan, C.cyanDim, 3);
    glow(gx + 210, GROUND, gx + 210, GROUND - 200, C.cyan, C.cyanDim, 3);
  }

  function drawSkater() {
    var t = game.time.elapsed;
    if (invT > 0 && stopT <= 0 && bailT <= 0 && Math.floor(t * 14) % 2 === 0) return;
    var fr = bailT > 0 ? SK[3] : (air ? SK[2] : SK[Math.floor(t * 8) % 2]);
    var y = GROUND - h - 70;
    var sc = stopT > 0 ? 13 : 11;
    if (stopT > 0) game.draw.circle(RUN_X, y, 120, C.white, 0.45);
    game.draw.sprite(fr, SKPAL, RUN_X, y + (onRail ? 4 : 0), sc, { anchor: 'center' });
    if (onRail) for (var s = 0; s < 3; s++) game.draw.rect(RUN_X - 60 - s * 20, GROUND - RAIL_H - 4 + (s % 2) * 8, 10, 4, C.yellow);
  }

  function drawButton() {
    var on = pressT > 0;
    game.draw.circle(W / 2, H * 0.86, 150, on ? C.yellowDim : C.cyanDim);
    glow(W / 2 - 110, H * 0.86 + 40, W / 2 + 110, H * 0.86 + 40, on ? C.yellow : C.cyan, C.cyanDim, 6);
    for (var a = 0; a < 8; a++) {
      var u0 = a / 8, u1 = (a + 1) / 8;
      glow(W / 2 - 100 + u0 * 200, H * 0.86 + 20 - Math.sin(u0 * Math.PI) * 90, W / 2 - 100 + u1 * 200, H * 0.86 + 20 - Math.sin(u1 * Math.PI) * 90, on ? C.yellow : C.pink, C.pinkDim, 5);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 270, 90, 56, C.white);
    if (streak >= 2) label('COMBO x' + streak, 270, 170, 40, C.yellow);
    for (var i = 0; i < WHEELS; i++) {
      var cx = 660 + i * 100;
      game.draw.circle(cx, 66, 34, i < wheels ? C.cyanDim : '#222');
      game.draw.circle(cx, 66, 26, i < wheels ? C.cyan : '#333');
      game.draw.circle(cx, 66, 10, C.ink);
    }
    var p = Math.min(1, wx / COURSE);
    glow(560, 140, 1020, 140, C.pinkDim, C.ink, 6);
    glow(560, 140, 560 + 460 * p, 140, C.pink, C.pinkDim, 8);
    glow(1020, 110, 1020, 170, C.yellow, C.yellowDim, 4);
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    glow(560, 200, 560 + 460 * tl, 200, tl < 0.25 ? C.pink : C.cyan, C.cyanDim, 6);
  }

  function drawScene() {
    drawCity();
    drawShop();
    for (var i = 0; i < course.length; i++) drawObst(course[i]);
    drawSkater();
    drawButton();
  }

  // ---- ATTRACT: 実ロジックで段差・植え込みを縁近くで跳び、手すりに乗る。4つ目だけ早跳びして転ぶ ----
  var demo = { t: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) initGame(true);
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    var f = nextObst();
    if (f && !air && bailT <= 0) {
      var D = f.x - wx;
      var want = f.type === 'curb' ? 150 : (f.type === 'planter' ? 110 : 150);
      if (f.i === 3) want = 430;
      if (D <= want && D > 0 && (!onRail || onRail !== f)) { jump(); pressT = 0.18; }
    }
    stepSkater(dt, true);
    if (wx > 4200) demo.t = 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (!course) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 50, H * 0.86 + 50, { press: pressT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, Math.floor(t * 3) % 5 === 0 ? C.pinkDim : C.pink);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.yellow);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.lime : C.pink);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.white);
      label('PERFECT ' + perfects + '  COMBO ' + maxStreak, W / 2, H * 0.435, 38, C.yellow);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.yellow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.cyan);
      if (!won) label('あと' + Math.max(1, Math.round((COURSE - wx) / 100)) + 'm!', W / 2, H * 0.25, 56, C.pink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfects: perfects, grinds: grinds, falls: falls };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      stepSkater(dt, false);
      if (!over && !milestone && wx >= COURSE / 2) {
        milestone = true; game.audio.play('se_milestone', 0.45);
        game.fx.popup(Math.round(wx / 100) + 'm', W / 2, H * 0.3, { color: C.yellow, size: 84 });
      }
      if (!over && wx >= COURSE) finish(true);
      else if (!over && playT >= TIME_LIMIT) finish(false);
      else if (!over && TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.yellow);
    if (over && !won && wheels > 0) label('TIME UP', W / 2, H * 0.42, 96, C.pink);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.yellow);
  });

  game.onStart(function() {
    // 夕暮れのシンセ(オリジナル): 跳ねるベースと短いフック
    game.audio.melody([
      ['E5', 0.25], ['E5', 0.25], ['R', 0.25], ['G5', 0.25], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5],
      ['B4', 0.75], ['D5', 0.25], ['E5', 1], ['R', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5],
    ], { tempo: 172, wave: 'sawtooth', volume: 0.04, loop: true, bass: [['E2', 0.5], ['E2', 0.5], ['G2', 0.5], ['A2', 0.5], ['E2', 0.5], ['E2', 0.5], ['D2', 0.5], ['B1', 0.5]] });
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
