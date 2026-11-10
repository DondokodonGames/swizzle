// I-Switch2-0004v2-highland-rope-plank-drop.js
// ロープから板橋へ — ロープにぶら下がった少女が手を離して落ち、真下を揺れて通る板橋の上にぴたりと降り立つ
// 操作: 押している間は少女がロープを滑り降りる(低いほど落ちる時間が短く狙いやすいが、高い所で離すほど得点が高い)。指を離すと手を離して真下へ落ちる。板橋は振り子のように左右に揺れているので、落ちる時間ぶん先を読んで離す。握力の帯が尽きると手がすべって落ちる
// 終わり: 16秒のうちに4回板橋に降り立てばCLEAR。踏み外して下の網に落ちる/握力切れが2回、または時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: highland_forest_rope_course
// 世界観: 高原の林間アスレチックで、少女が木の枝から下がるロープを伝い降り、手を離して、二本の綱で吊られて揺れる板橋の上へ飛び降りていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 降り立った回数・ど真ん中PERFECT数・離した高さの得点・スコア
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊、真下に柔らかい影
  var STYLE = { bg: ['#fdf7ee', '#dff0e6'], main: ['#ff7a59', '#e0a060', '#3fb57a'], accent: ['#3a7bff', '#ffd23a'] };
  var CORAL = STYLE.main[0], WOODC = STYLE.main[1], LEAF = STYLE.main[2], BLUE = STYLE.accent[0], GOLD = STYLE.accent[1];
  var INK = '#2a2e38', SOFT = '#2a2e38', ROPE = '#b78a5a', WHITE = '#ffffff', MISSC = '#ff4a5a';

  var GAME_TITLE = 'ROPE DROP';
  var TIME_LIMIT = 16;
  var NEEDED = 4;
  var MAX_MISS = 2;
  // [板の振れ幅px, 板の半幅px, 周期s]
  var STAGES = [[150, 180, 2.4], [200, 165, 2.25], [240, 150, 2.1], [270, 135, 1.95], [300, 125, 1.85], [320, 115, 1.75]];
  var PIVOT_Y = 250, ROPE_L = 1140, G = 4200, TOP_Y = 360, KNOT_Y = 1000, GRIP = 3.0, SLIDE_V = 420, FEET = 150;
  var GROUND_Y = H * 0.77;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var ropeI, ph, swingT, gs, gy, vy, gripT, pressedHere, held, releaseY, landDx, rideT, netT, netY;
  var stopT, stopKind, lands, perfects, misses, heightPts, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var joyT, warnT, endWhy, gapT, hiT;

  var GIRL_HANG = ['...s..s...', '...s..s...', '...s..s...', '..hhhhhh..', '..hsssshh.', '..skssksh.', '...ssss...', '..pppppp..', '..pppppp..', '..pppppp..', '...bb.bb..', '...ss.ss..', '...ww.ww..'];
  var GIRL_HANG2 = ['...s..s...', '...s..s...', '...s..s...', '..hhhhhh..', '..hsssshh.', '..skssksh.', '...ssss...', '..pppppp..', '..pppppp..', '..pppppp..', '...bb.bb..', '..ss..ss..', '..ww..ww..'];
  var GIRL_FALL = ['..s....s..', '..s....s..', '...s..s...', '..hhhhhh..', '..hsssshh.', '..skssksh.', '...ssss...', '..pppppp..', '..pppppp..', '..pppppp..', '..bb..bb..', '.ss....ss.', '.ww....ww.'];
  var GIRL_LAND = ['..........', '..........', '..........', '..hhhhhh..', '..hsssshh.', '..skssksh.', '...ssss...', 'ssppppppss', '..pppppp..', '..pppppp..', '..bbbbbb..', '..ss..ss..', '.www..www.'];
  var GIRL_SAD = ['..........', '..........', '..........', '..........', '..hhhhhh..', '..hsssshh.', '..skssktH.', '...ssss...', '.spppppps.', '..pppppp..', '..bbbbbb..', '..ssssss..', '..ww..ww..'];
  var GIRL_PAL = { s: '#f7cfa6', h: '#e8692e', H: '#e8692e', k: INK, t: '#7fd0ff', p: CORAL, b: BLUE, w: WHITE };

  function out(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: 'rgba(42,46,56,0.35)', bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }
  function blob(cx, cy, rx, ry, col, a) {
    for (var dy = -ry; dy < ry; dy += 4) {
      var v = (dy + 2) / ry, hw = rx * Math.sqrt(Math.max(0, 1 - v * v));
      game.draw.rect(cx - hw, cy + dy, hw * 2, 4, col, a);
    }
  }
  function roundBar(x, y, w, h, col) {
    game.draw.rect(x + h / 2, y, w - h, h, col);
    game.draw.circle(x + h / 2, y + h / 2, h / 2, col);
    game.draw.circle(x + w - h / 2, y + h / 2, h / 2, col);
  }

  function stageOf() { return STAGES[Math.min(ropeI, STAGES.length - 1)]; }
  function plankAt(tt) {
    var st = stageOf();
    var thMax = Math.asin(st[0] / ROPE_L), om = Math.PI * 2 / st[2];
    var th = thMax * Math.sin(om * tt + ph);
    return { x: W / 2 + ROPE_L * Math.sin(th), y: PIVOT_Y + ROPE_L * Math.cos(th), hw: st[1] };
  }

  function newRope(i, phase) {
    ropeI = i; ph = phase !== undefined ? phase : Math.random() * Math.PI * 2;
    gs = 'hang'; gy = TOP_Y; vy = 0; gripT = GRIP; pressedHere = false; landDx = 0; rideT = 0; netT = 0;
  }

  function initGame() {
    swingT = 0; held = false;
    lands = 0; perfects = 0; misses = 0; heightPts = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; gapT = 0; hiT = 0;
    fin = false; cleared = false; postT = 0; joyT = 0; warnT = 0; endWhy = '';
    newRope(0);
  }

  // 押す/離す(本番もデモも同じ処理)
  function grab() {
    held = true;
    if (gs === 'hang' && stopT <= 0) {
      pressedHere = true;
      game.audio.tone('D5', 0.04, { wave: 'triangle', volume: 0.09, slide: -120 });
    } else game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.04 });
  }
  function letGo() {
    held = false;
    if (gs === 'hang' && pressedHere && stopT <= 0) { drop(); return true; }
    return false;
  }
  function drop() {
    gs = 'fall'; vy = 0; releaseY = gy;
    game.audio.play('se_jump', 0.5);
  }

  function land(pl) {
    gs = 'ride'; landDx = W / 2 - pl.x; rideT = 0.9; gy = pl.y - 14 - FEET;
    lands++; joyT = 0.8;
    var perfect = Math.abs(landDx) < pl.hw * 0.3;
    if (perfect) perfects++;
    var hb = Math.round((KNOT_Y - releaseY) / (KNOT_Y - TOP_Y) * 200);
    var pts = 100 + hb + (perfect ? 100 : 0) + ropeI * 20;
    if (mode === S.PLAYING) { score += pts; heightPts += hb; }
    game.feedback.good(W / 2, pl.y - 230, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : LEAF, size: 64 });
    game.fx.popup('+' + pts, W / 2, pl.y - 320, { color: BLUE, size: 46 });
    game.audio.tone('G4', 0.08, { wave: 'triangle', volume: 0.12 });
    if (lands === 2 && mode === S.PLAYING) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.3, { color: CORAL, size: 96 });
    }
    if (mode === S.PLAYING && lands >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++;
    gs = 'net'; netT = 0.8; vy = 300; netY = gy;
    game.feedback.bad(W / 2, stopKind === 'slip' ? gy - 40 : gy + 60, { text: 'MISS', color: MISSC, size: 64 });
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); }
  }

  function stepCourse(dt) {
    if (joyT > 0) joyT -= dt;
    if (hiT > 0) hiT -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    swingT += dt;
    var pl = plankAt(swingT);
    if (gs === 'hang') {
      if (fin) return;
      if (held && pressedHere) gy = Math.min(KNOT_Y, gy + SLIDE_V * dt);
      gripT -= dt;
      if (gripT <= 0) {
        // 握力切れ: 止めて手元と握力の帯を光らせる
        gripT = 0; stopT = 0.4; stopKind = 'slip'; hiT = 0.4;
        game.fx.flash(WHITE, 0.12);
        game.audio.tone('E3', 0.25, { wave: 'square', volume: 0.08, slide: -80 });
      }
    } else if (gs === 'fall') {
      var prev = gy + FEET;
      vy += G * dt; gy += vy * dt;
      var feet = gy + FEET, top = pl.y - 14;
      if (prev < top && feet >= top && Math.abs(W / 2 - pl.x) < pl.hw) { land(pl); return; }
      if (feet > top + 30) {
        // 踏み外し: 止めて板の端を白く大きく
        stopT = 0.45; stopKind = 'miss'; hiT = 0.45;
        game.fx.flash(WHITE, 0.15);
        game.audio.tone('C3', 0.28, { wave: 'sawtooth', volume: 0.08, slide: -60 });
      }
    } else if (gs === 'ride') {
      gy = pl.y - 14 - FEET;
      rideT -= dt;
      if (rideT <= 0 && !fin) newRope(ropeI + 1);
    } else if (gs === 'net') {
      vy += G * 0.5 * dt; netY += vy * dt;
      if (netY > GROUND_Y + 40) { netY = GROUND_Y + 40; vy = -vy * 0.45; }
      gy = netY;
      netT -= dt;
      if (netT <= 0 && !fin) newRope(ropeI + 1);
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 40) + (MAX_MISS - misses) * 120 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, H * 0.35 + (i % 2) * 140, { color: i % 2 ? GOLD : CORAL, count: 18, speed: 460 });
      game.fx.flash(WHITE, 0.2);
      joyT = 3;
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    grab();
    game.fx.burst(x, y, { color: gs === 'hang' ? LEAF : '#cccccc', count: 5, speed: 140 });
  });
  game.onRelease(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) { held = false; return; }
    if (letGo()) game.fx.burst(W / 2, gy, { color: ROPE, count: 8, speed: 200 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawCourse(t) {
    game.draw.clear(STYLE.bg[0]);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, '#cfe8d8']]);
    game.draw.circle(W * 0.82, 360, 90, '#ffe9b0');
    // 両脇の木(丸い塊 + 柔らかい影)
    var trees = [[60, 520, 170], [1020, 600, 190], [140, 900, 130], [960, 1020, 150]];
    for (var i = 0; i < trees.length; i++) {
      var tr = trees[i], sw = Math.sin(t * 1.2 + i) * 6;
      game.draw.rect(tr[0] - 18, tr[1], 36, GROUND_Y - tr[1], '#a8754a');
      blob(tr[0] + sw, tr[1] + 10, tr[2], tr[2] * 0.9, '#2f9a66', 1);
      blob(tr[0] + sw - tr[2] * 0.25, tr[1] - tr[2] * 0.25, tr[2] * 0.55, tr[2] * 0.45, '#5fcf8f', 1);
    }
    // 地面と網
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#bfe3c9');
    game.draw.rect(0, GROUND_Y, W, 6, '#9ccfaa');
    game.draw.rect(120, GROUND_Y + 30, 18, 160, '#8a8a8a');
    game.draw.rect(W - 138, GROUND_Y + 30, 18, 160, '#8a8a8a');
    var sag = gs === 'net' ? Math.max(0, (netY - GROUND_Y) * 0.6) : 0;
    for (var n = 0; n < 9; n++) {
      var nx = 130 + n * (W - 260) / 8;
      game.draw.line(nx, GROUND_Y + 40, nx, GROUND_Y + 110 + sag * Math.sin(Math.PI * n / 8), '#ffffff', 4);
    }
    for (var m = 0; m < 3; m++) game.draw.line(130, GROUND_Y + 40 + m * 34, W - 130, GROUND_Y + 40 + m * 34 + sag * 0.6, '#ffffff', 4);
    // 枝
    roundBar(40, PIVOT_Y - 40, W - 80, 44, '#8a5a3a');
    blob(W / 2 + 300, PIVOT_Y - 60, 120, 50, '#2f9a66', 1);
  }

  function drawPlank(t) {
    var pl = plankAt(swingT);
    // 綱(平行)
    game.draw.line(W / 2 - pl.hw + 20, PIVOT_Y, pl.x - pl.hw + 20, pl.y - 14, ROPE, 6);
    game.draw.line(W / 2 + pl.hw - 20, PIVOT_Y, pl.x + pl.hw - 20, pl.y - 14, ROPE, 6);
    // 地面の柔らかい影
    blob(pl.x, GROUND_Y + 10, pl.hw * 0.9, 18, SOFT, 0.15);
    var big = stopT > 0 && stopKind === 'miss' ? 1.15 : 1;
    var fl = stopT > 0 && stopKind === 'miss' && Math.floor(t * 16) % 2 === 0;
    roundBar(pl.x - pl.hw * big, pl.y - 14, pl.hw * 2 * big, 32, fl ? WHITE : WOODC);
    game.draw.rect(pl.x - pl.hw * 0.3, pl.y - 14, pl.hw * 0.6, 8, GOLD, 0.9);
    if (fl) {
      var edge = W / 2 < pl.x ? pl.x - pl.hw : pl.x + pl.hw;
      game.draw.circle(edge, pl.y, 50, MISSC, 0.5);
    }
  }

  function drawGirl(t) {
    var pl = plankAt(swingT);
    var gx = W / 2, fr;
    if (gs === 'hang') {
      // ロープと結び目
      game.draw.line(W / 2, PIVOT_Y - 10, W / 2, KNOT_Y + 70, ROPE, 8);
      game.draw.circle(W / 2, KNOT_Y + 60, 18, ROPE);
      fr = held && pressedHere ? (Math.floor(t * 10) % 2 ? GIRL_HANG : GIRL_HANG2) : (Math.floor(t * 2) % 2 ? GIRL_HANG : GIRL_HANG2);
      gx += Math.sin(t * 2) * 4;
    } else {
      game.draw.line(W / 2, PIVOT_Y - 10, W / 2 + Math.sin(t * 6) * 10, KNOT_Y + 70, ROPE, 8);
      game.draw.circle(W / 2 + Math.sin(t * 6) * 10, KNOT_Y + 60, 18, ROPE);
      if (gs === 'fall') fr = GIRL_FALL;
      else if (gs === 'ride') { fr = GIRL_LAND; gx = pl.x + landDx; }
      else fr = GIRL_SAD;
    }
    if (fin && cleared) fr = GIRL_LAND;
    var hop = joyT > 0 && gs === 'ride' ? -Math.abs(Math.sin(t * 12)) * 16 : 0;
    // 真下の柔らかい影(高さで大きさが変わる)
    var hgt = Math.max(0, GROUND_Y - (gy + FEET));
    blob(gx, GROUND_Y + 8, 60 - Math.min(40, hgt * 0.04), 12, SOFT, 0.2);
    var big = stopT > 0 && stopKind === 'slip' ? 1.2 : 1;
    game.draw.sprite(fr, GIRL_PAL, gx, gy + FEET / 2 + hop, 12 * big, { anchor: 'center' });
    // 握力の帯(手元)
    if (gs === 'hang') {
      var r = gripT / GRIP, warn = r < 0.27 && Math.floor(t * 10) % 2 === 0;
      game.draw.rect(gx + 70, gy - 10, 26, 120, INK, 0.25);
      game.draw.rect(gx + 70, gy - 10 + 120 * (1 - r), 26, 120 * r, warn || (stopKind === 'slip' && stopT > 0) ? MISSC : LEAF);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 22, INK, 0.15);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? MISSC : BLUE);
    for (var i = 0; i < NEEDED; i++) {
      var cx = W / 2 - 150 + i * 100;
      roundBar(cx - 38, 96, 76, 26, i < lands ? WOODC : '#e4ddd2');
      if (i < lands) game.draw.circle(cx, 84, 14, CORAL);
    }
    out(lands + ' / ' + NEEDED, W / 2, 190, 40, INK);
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(80 + m * 56, 112, 20, m < misses ? MISSC : '#e4ddd2');
    out('' + score, W - 140, 130, 46, INK);
  }

  function drawScene(t) {
    drawCourse(t);
    drawPlank(t);
    drawGirl(t);
  }

  // ---- ATTRACT: 本物の grab()/letGo() で実演。1本目は板が真下へ来る先を読んでPERFECT、2本目は板が端へ逃げる時に離して網へ ----
  var demo = { t: 0, x: W * 0.7, y: H * 0.86, press: false, k: 0, el: 0, rope: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; newRope(0, 0.4); demo.rope = 0; demo.el = 0; }
    stepCourse(dt);
    if (demo.rope !== ropeI) { demo.rope = ropeI; demo.el = 0; if (ropeI === 1) ph = 1.2; }
    demo.el += dt;
    if (gs === 'hang' && stopT <= 0) {
      if (!held && demo.el > 0.4 && !pressedHere) grab();
      if (held && demo.el > 0.9) {
        var feet = gy + FEET, pl = plankAt(swingT), tf = Math.sqrt(2 * Math.max(1, pl.y - 14 - feet) / G);
        var fut = plankAt(swingT + tf), dx = Math.abs(W / 2 - fut.x);
        if (ropeI === 0 ? dx < 12 : dx > fut.hw + 30) letGo();
      }
    } else if (held) held = false;
    demo.press = held;
    demo.x += (W * 0.7 - demo.x) * Math.min(1, dt * 8);
    demo.y += (H * 0.86 - demo.y) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 96, CORAL);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, BLUE);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, CORAL);
      else out('TAP TO START', W / 2, H * 0.975, 40, INK);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, WHITE, 0.92);
      game.draw.rect(90, H * 0.3, W - 180, 12, cleared ? LEAF : MISSC);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? LEAF : MISSC);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, INK);
      out(lands + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, INK);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, CORAL);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, BLUE);
      if (!cleared) out('あと' + (NEEDED - lands) + '回!', W / 2, H * 0.27, 64, MISSC);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, INK);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepCourse(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { lands: lands, perfect: perfects, heightPts: heightPts, misses: misses, ropes: ropeI + 1 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      swingT += dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepCourse(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: MISSC, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, CORAL);
  });

  function startBgm() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 2],
      ['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['E5', 1],
      ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['R', 1],
    ], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2], ['D3', 2], ['C3', 2], ['G2', 2], ['C3', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame();
  });
})(game);
