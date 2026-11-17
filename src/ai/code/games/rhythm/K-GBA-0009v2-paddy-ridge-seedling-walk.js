// K-GBA-0009v2-paddy-ridge-seedling-walk.js
// 畦みち苗はこび — 跳ねる音頭の拍で光る足型へ、指を一歩ずつ踏み継いで細い畦を渡りきる
// 操作: 子の足元に指を置き、離さずに畦の上を引きずって進む。次の足型は縮む輪が閉じた拍の頭(跳ねる8分=長短)で光るので、その瞬間に指を足型へ乗せる。早すぎ/遅すぎはMISS。畦から指がはみ出すと水田に落ちる
// 終わり: 6小節ぶんの足型を踏み継いで向こうの田の植え手に届けばCLEAR(PERFECT/GOOD/コンボ+残り苗束の点)。苗束4つを全部落とす(MISS4回)とGAME OVER
// @mechanic: guide_path
// @theme: paddy_ridge_seedling_walk
// 世界観: 田植え前の水田のあぜ道で、苗かごを背負った苗運びの子が、跳ねる音頭の拍に乗って細い畦を一歩ずつ踏み外さずに渡り、向こうの田の植え手へ苗を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・残った苗束・最大コンボ
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var STYLE = { bg: ['#cdd8b0', '#a3bd9a'], main: ['#5f8d4e', '#c4aa70', '#4d7a8e'], accent: ['#f0c24a', '#f3eedb'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 日焼けした液晶のような低彩度・少色。太く単純な形で、画面の密度を上げない
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], leaf: STYLE.main[0], ridge: STYLE.main[1], water: STYLE.main[2],
    lamp: STYLE.accent[0], paper: STYLE.accent[1],
    ridgeEdge: '#6c5a3a', waterHi: '#7ea2ae', waterLow: '#3e6474', hill: '#8aa982', hill2: '#6e8e6a',
    hud: '#33422f', ink: '#1f281d', good: '#9ccc6e', bad: '#c8563f', mud: '#8a6f4a'
  };

  var GAME_TITLE = 'RIDGE STEP';
  var HUD_H = Math.round(H * 0.12);
  var BPM = 88, SPB = 60 / BPM, SWING = 2 / 3;
  var PERFECT_W = 0.07, GOOD_W = 0.15;
  var READY_T = 0.8;
  var TIME_LIMIT = 18;
  var LIVES = 4;
  var CORRIDOR = 84, GRAB_R = 120, RIDGE_HALF = 34;
  var DEMO_CYC = 3.0, DEMO_FROM = 6, DEMO_FAIL = 10;

  // 1小節 = 跳ねる8分 x8コマ(表=長 / 裏=短)。1 = そのコマに足型がある。後半ほど裏の短い一歩が増える
  var PAT = [
    [0, 0, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 1, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 1],
    [1, 1, 1, 0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0]
  ];

  // 跳ねる音頭(オリジナル): 長短の8分で上がって下りる五音の節。ベースが毎拍を刻む
  var TUNE = [
    [['D5', 2 / 3], ['E5', 1 / 3], ['G5', 2 / 3], ['E5', 1 / 3], ['D5', 2 / 3], ['B4', 1 / 3], ['A4', 1]],
    [['G5', 2 / 3], ['A5', 1 / 3], ['B5', 2 / 3], ['A5', 1 / 3], ['G5', 2 / 3], ['E5', 1 / 3], ['D5', 1]],
    [['E5', 2 / 3], ['G5', 1 / 3], ['A5', 2 / 3], ['G5', 1 / 3], ['E5', 2 / 3], ['D5', 1 / 3], ['B4', 1]],
    [['A4', 2 / 3], ['B4', 1 / 3], ['D5', 2 / 3], ['E5', 1 / 3], ['D5', 1.5], ['R', 0.5]]
  ];
  var BASS = [
    [['D3', 1], ['A2', 1], ['D3', 1], ['A2', 1]],
    [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]],
    [['E3', 1], ['B2', 1], ['A2', 1], ['D3', 1]],
    [['A2', 1], ['E3', 1], ['D3', 2]]
  ];

  // ---- スプライト ----
  // 苗運びの子(菅笠・苗かご): 歩き2コマ + よろけ
  var KID = [
    ['.g......g.', '.gg.hh.gg.', '..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', '...ffff...', '..kbbbbk..', '.kkbbbbkk.', '..bbbbbb..', '..bbbbbb..', '...l..l...', '..ll...l..'],
    ['.g......g.', '.gg.hh.gg.', '..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', '...ffff...', '..kbbbbk..', '.kkbbbbkk.', '..bbbbbb..', '..bbbbbb..', '...l..l...', '...l...ll.'],
    ['g........g', '.g..hh..g.', '..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'b..ffff..b', '.bkbbbbkb.', '..kbbbbk..', '..bbbbbb..', '..bbbbbb..', '..l....l..', '.ll....ll.']
  ];
  var KIDPAL = { g: '#5f8d4e', h: '#e3c66e', f: '#efd0a2', k: '#8a6f4a', b: '#4d6a9e', l: '#33422f' };
  var KIDWHITE = { g: '#ffffff', h: '#ffffff', f: '#ffffff', k: '#ffffff', b: '#ffffff', l: '#ffffff' };
  // 向こうの田の植え手: 待つ / 両手を上げて迎える
  var PLANTER = [
    ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '...ffff...', '..rrrrrr..', '.r.rrrr.r.', '...rrrr...', '..ww..ww..', '..ww..ww..'],
    ['f..hhhh..f', 'r.hhhhhh.r', '.rhhhhhhr.', '...ffff...', '...rrrr...', '...rrrr...', '...rrrr...', '..ww..ww..', '..ww..ww..']
  ];
  var PLPAL = { h: '#e3c66e', f: '#efd0a2', r: '#a8574a', w: '#3e6474' };
  // 櫓の太鼓打ち(拍で腕が上がる)
  var DRUMMER = [
    ['..ff..', '.bbbb.', 'b.bb.b', '.bbbb.', 'dddddd', 'dddddd'],
    ['b.ff.b', '.bbbb.', '..bb..', '.bbbb.', 'dddddd', 'dddddd']
  ];
  var DRPAL = { f: '#efd0a2', b: '#a8574a', d: '#6c5a3a' };
  var FOOT_V = ['.###.', '#####', '#####', '.###.', '.....', '.###.', '.###.'];
  var FOOT_H = ['.##..###.', '###.#####', '###.#####', '.##..###.'];
  var BUNDLE = ['.g.g.', 'ggggg', '.ggg.', '.kkk.', '..k..'];
  var BUNPAL = { g: '#9ccc6e', k: '#c4aa70' };
  var BUNOFF = { g: '#4a5a46', k: '#4a5a46' };

  // ---- 畦の道(水田の格子に沿って折り返す) ----
  var PATH = [[150, 1590], [930, 1590], [930, 1310], [150, 1310], [150, 1030], [930, 1030], [930, 750], [150, 750], [150, 470], [930, 470]];
  var SEG = [], PATH_LEN = 0;
  for (var pi = 1; pi < PATH.length; pi++) {
    var ax = PATH[pi - 1][0], ay = PATH[pi - 1][1], bx = PATH[pi][0], by = PATH[pi][1];
    var ln = Math.hypot(bx - ax, by - ay);
    SEG.push({ x0: ax, y0: ay, x1: bx, y1: by, len: ln, s0: PATH_LEN, ux: (bx - ax) / ln, uy: (by - ay) / ln });
    PATH_LEN += ln;
  }
  function pointAt(s) {
    s = Math.max(0, Math.min(PATH_LEN, s));
    for (var i = 0; i < SEG.length; i++) {
      var g = SEG[i];
      if (s <= g.s0 + g.len || i === SEG.length - 1) {
        var u = s - g.s0;
        return { x: g.x0 + g.ux * u, y: g.y0 + g.uy * u, ux: g.ux, uy: g.uy };
      }
    }
    return { x: PATH[0][0], y: PATH[0][1], ux: 1, uy: 0 };
  }
  // 指から「今いる所〜次の足型の少し先」までの畦の中心線への距離
  function corrDist(px, py, sA, sB) {
    var best = 1e9;
    for (var i = 0; i < SEG.length; i++) {
      var g = SEG[i];
      var a = Math.max(sA, g.s0), b = Math.min(sB, g.s0 + g.len);
      if (a > b) continue;
      var t = (px - g.x0) * g.ux + (py - g.y0) * g.uy;
      t = Math.max(a - g.s0, Math.min(b - g.s0, t));
      var d = Math.hypot(px - (g.x0 + g.ux * t), py - (g.y0 + g.uy * t));
      if (d < best) best = d;
    }
    return best;
  }

  // 足型の拍時刻: 表=拍の頭、裏=拍の2/3(跳ね)。歩幅は間の長さに比例(短い一歩は近い)
  function slotTime(bar, slot) { return (bar * 4 + Math.floor(slot / 2) + (slot % 2 ? SWING : 0)) * SPB; }
  var STEPS = [];
  (function() {
    var prevT = -SPB, acc = 0, gaps = [];
    for (var b = 0; b <= PAT.length; b++) {
      for (var sl = 0; sl < 8; sl++) {
        var on = b < PAT.length ? PAT[b][sl] : (sl === 0 ? 1 : 0);
        if (!on) continue;
        var t = slotTime(b, sl);
        var d = Math.max(90, Math.min(190, 70 + 110 * (t - prevT) / SPB));
        gaps.push(d); acc += d; prevT = t;
        STEPS.push({ t: t, off: sl % 2 === 1, goal: b === PAT.length });
      }
    }
    var scale = (PATH_LEN - 24) / acc, s = 0, lx = PATH[0][0], ly = PATH[0][1];
    for (var k = 0; k < STEPS.length; k++) {
      s += gaps[k] * scale;
      var p = pointAt(s), side = k % 2 ? 1 : -1, st = STEPS[k];
      st.s = s; st.ux = p.ux; st.uy = p.uy;
      st.x = p.x - p.uy * side * 17; st.y = p.y + p.ux * side * 17;
      st.r = Math.min(76, 0.48 * Math.hypot(st.x - lx, st.y - ly));
      lx = st.x; ly = st.y;
    }
  })();

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, next, kidK, kidFrom, kidHop, sFrom, grip, lives, score, combo, maxCombo, nPerfect, nGood, nMiss, res;
  var hitStop, over, won, outroT, cuedBar, lastBeat, lastKa, flashT, failX, failY, prevBest, halfShown, demoMode, warnT;
  var drops = [];
  var beatPulse = 0;

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; next = 0; kidK = -1; kidFrom = { x: PATH[0][0], y: PATH[0][1] }; kidHop = 1;
    sFrom = 0; grip = false; lives = LIVES; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0;
    res = []; for (var k = 0; k < STEPS.length; k++) res.push(0);
    hitStop = 0; over = false; won = false; outroT = 0; cuedBar = -1; lastBeat = -99; lastKa = -99;
    flashT = 0; failX = -999; failY = -999; prevBest = game.best; halfShown = false; warnT = 0;
    drops = [];
  }

  function kidPos() {
    var tx = kidK < 0 ? PATH[0][0] : STEPS[kidK].x, ty = kidK < 0 ? PATH[0][1] : STEPS[kidK].y;
    var u = Math.min(1, kidHop);
    return { x: kidFrom.x + (tx - kidFrom.x) * u, y: kidFrom.y + (ty - kidFrom.y) * u - Math.sin(u * Math.PI) * 26 };
  }
  function moveKid(k) {
    var cur = kidPos();
    kidFrom = { x: cur.x, y: cur.y + Math.sin(Math.min(1, kidHop) * Math.PI) * 26 };
    kidK = k; kidHop = 0;
  }

  // ---- 判定 ----
  function hitStep(k, grade) {
    var st = STEPS[k];
    res[k] = grade; next = k + 1; sFrom = st.s; moveKid(k);
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += Math.round((grade === 1 ? 100 : 50) * (1 + Math.min(10, combo) * 0.1));
    game.feedback.good(st.x, st.y - 60, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.lamp : C.good, size: grade === 1 ? 50 : 42, count: grade === 1 ? 14 : 8, volume: demoMode ? 0.04 : 0.22 });
    if (!demoMode) {
      // コンボの可聴化: 連続で踏むほど足音の音程が上がる
      game.audio.tone(392 * Math.pow(2, Math.min(12, combo) / 12), 0.07, { wave: 'square', volume: 0.06 });
      if (combo % 10 === 0) { game.fx.popup('COMBO ' + combo, W / 2, 360, { color: C.lamp, size: 60 }); game.audio.play('se_milestone', 0.35); }
      if (!halfShown && next >= Math.ceil(STEPS.length / 2)) {
        halfShown = true;
        game.fx.popup('50%', st.x, st.y - 140, { color: C.paper, size: 72 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    if (st.goal || next >= STEPS.length) finishRun(lives > 0);
  }

  function missStep(k, x, y) {
    combo = 0; nMiss++; lives--;
    if (k >= 0) res[k] = 3;
    flashT = 0.35; failX = x; failY = y;
    if (lives <= 0 && !demoMode) {
      hitStop = 0.45;
      game.feedback.bad(x, y, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(x, y, { text: 'MISS', shake: demoMode ? 4 : 9, volume: demoMode ? 0.04 : 0.6 });
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      var g = STEPS[STEPS.length - 1];
      for (var i = 0; i < 6; i++) game.fx.burst(g.x - 200 + i * 70, g.y - 60 - (i % 2) * 60, { color: i % 2 ? C.lamp : C.good, count: 18, speed: 420 });
      game.fx.flash(C.paper, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, perfect: nPerfect, good: nGood, miss: nMiss, bundles: Math.max(0, lives), maxCombo: maxCombo, steps: next, total: STEPS.length };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック: 小節頭で節を出し(拍クロックに位相固定)、毎拍「ドン」、跳ねた裏で「カッ」
  function beatClock() {
    var barT = 4 * SPB;
    var nb = Math.floor((clock + 0.06) / barT);
    if (!demoMode && nb > cuedBar && nb >= 0 && nb <= PAT.length) {
      cuedBar = nb;
      var i = nb % TUNE.length;
      game.audio.melody(TUNE[i], { tempo: BPM, wave: 'square', volume: 0.045, bass: BASS[i], bassWave: 'triangle', bassVolume: 0.06 });
    }
    var bi = Math.floor(clock / SPB);
    if (bi !== lastBeat) {
      lastBeat = bi;
      if (clock >= 0) { beatPulse = 1; if (!demoMode) game.audio.tone(98, 0.08, { wave: 'triangle', volume: 0.12 }); }
    }
    var ki = Math.floor(clock / SPB - SWING);
    if (ki !== lastKa) {
      lastKa = ki;
      if (clock >= SWING * SPB && !demoMode) game.audio.tone(1320, 0.025, { wave: 'square', volume: 0.02 });
    }
  }

  function stepRun(dt, pressing, px, py) {
    clock += dt;
    if (kidHop < 1) kidHop += dt / 0.13;
    if (flashT > 0) flashT -= dt;
    beatClock();
    if (over) return;
    if (pressing && grip) {
      var sB = next < STEPS.length ? STEPS[next].s + 150 : PATH_LEN;
      var d = corrDist(px, py, sFrom - 120, sB);
      warnT = d > CORRIDOR * 0.62 ? warnT + dt : 0;
      if (warnT > 0 && warnT <= dt && !demoMode) game.audio.tone(220, 0.05, { wave: 'sawtooth', volume: 0.04 });
      if (d > CORRIDOR) {
        // 畦からはみ出した: 苗束が水田に落ちる
        grip = false; warnT = 0;
        drops.push({ x: px, y: py, born: game.time.elapsed });
        missStep(-1, px, py);
        if (over) return;
      } else if (next < STEPS.length) {
        var st = STEPS[next];
        if (Math.hypot(px - st.x, py - st.y) <= st.r) {
          var a = Math.abs(clock - st.t);
          if (a <= PERFECT_W) hitStep(next, 1);
          else if (a <= GOOD_W) hitStep(next, 2);
          else { var ek = next; next++; sFrom = st.s; moveKid(ek); missStep(ek, st.x, st.y); }
        }
      }
    }
    if (!pressing) { grip = false; warnT = 0; }
    // 拍の窓を過ぎても踏めなかった足型は MISS(子は勝手によろけて進む)
    while (!over && next < STEPS.length && clock > STEPS[next].t + GOOD_W) {
      var lk = next; next++; moveKid(lk);
      missStep(lk, STEPS[lk].x, STEPS[lk].y);
      if (STEPS[lk].goal && !over) finishRun(lives > 0);
    }
    if (!over && next >= STEPS.length) finishRun(lives > 0);
    if (!over && clock > TIME_LIMIT) finishRun(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
    if (state === S.PLAYING && !grip && !over) game.fx.burst(x, y, { color: C.paper, count: 3, speed: 80 });
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    var kp = kidPos();
    if (Math.hypot(x - kp.x, y - kp.y) <= GRAB_R) {
      grip = true; warnT = 0;
      sFrom = kidK >= 0 ? STEPS[kidK].s : 0;
      game.audio.play('se_tap', 0.3);
      game.fx.burst(x, y, { color: C.paper, count: 5, speed: 120 });
    } else {
      // 子の足元以外を押しても進めない: 低い音 + 子の足元を光らせる
      game.audio.tone(170, 0.07, { wave: 'square', volume: 0.05 });
      game.fx.burst(kp.x, kp.y, { color: C.lamp, count: 6, speed: 160 });
    }
  });

  game.onRelease(function(x, y) {
    if (state === S.PLAYING && grip && !over) {
      grip = false;
      game.audio.tone(300, 0.04, { wave: 'triangle', volume: 0.04 });
    }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ring(x, y, r, col, w) {
    var n = 28, lx = x + r, ly = y;
    for (var i = 1; i <= n; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      game.draw.line(lx, ly, nx, ny, col, w);
      lx = nx; ly = ny;
    }
  }

  function drawField() {
    var t = game.time.elapsed;
    game.draw.clear(C.waterLow);
    game.draw.gradient(0, 400, [[0, C.sky], [1, C.sky2]]);
    for (var i = 0; i < 7; i++) game.draw.circle(i * 190 - 40, 430, 150 + (i % 3) * 40, i % 2 ? C.hill : C.hill2);
    // 遠くの櫓と太鼓打ち: 拍で跳ねる
    game.draw.rect(856, 300, 12, 90, C.mud); game.draw.rect(966, 300, 12, 90, C.mud); game.draw.rect(846, 292, 142, 14, C.mud);
    game.draw.sprite(DRUMMER[beatPulse > 0.5 ? 1 : 0], DRPAL, 917, 262 - beatPulse * 8, 7, { anchor: 'center' });
    // 水田(空が映る)
    game.draw.gradient(380, 1670, [[0, C.waterHi], [0.55, C.water], [1, C.waterLow]]);
    for (var r = 0; r < 7; r++) {
      var rx = (r * 211 + t * 26) % (W + 160) - 160;
      game.draw.rect(rx, 540 + r * 160, 130, 6, C.paper, 0.16);
    }
    for (var q = 0; q < 5; q++) {
      var ph = (t * 0.55 + q * 0.37) % 1;
      game.draw.circle(110 + q * 210, 610 + (q % 3) * 330, 18 + ph * 60, C.paper, 0.12 * (1 - ph));
    }
    // 田を仕切る細い畦(飾り)
    for (var y = 610; y < 1660; y += 280) game.draw.rect(0, y - 7, W, 14, C.hill2, 0.6);
    game.draw.rect(34, 380, 14, 1290, C.hill2, 0.6); game.draw.rect(W - 48, 380, 14, 1290, C.hill2, 0.6);
    // 手前の土手と苗箱
    game.draw.rect(0, 1668, W, H - 1668, C.mud);
    game.draw.rect(0, 1668, W, 12, C.leaf);
    for (var b = 0; b < 3; b++) {
      game.draw.rect(40 + b * 74, 1700, 64, 34, C.ridgeEdge);
      game.draw.sprite(BUNDLE, BUNPAL, 72 + b * 74, 1692, 7, { anchor: 'center' });
    }
  }

  function drawRidge() {
    var i, g, x, y, w, h;
    for (i = 0; i < SEG.length; i++) {
      g = SEG[i];
      x = Math.min(g.x0, g.x1) - RIDGE_HALF; y = Math.min(g.y0, g.y1) - RIDGE_HALF;
      w = Math.abs(g.x1 - g.x0) + RIDGE_HALF * 2; h = Math.abs(g.y1 - g.y0) + RIDGE_HALF * 2;
      game.draw.rect(x - 7, y - 7, w + 14, h + 14, C.ridgeEdge);
    }
    for (i = 0; i < SEG.length; i++) {
      g = SEG[i];
      x = Math.min(g.x0, g.x1) - RIDGE_HALF; y = Math.min(g.y0, g.y1) - RIDGE_HALF;
      w = Math.abs(g.x1 - g.x0) + RIDGE_HALF * 2; h = Math.abs(g.y1 - g.y0) + RIDGE_HALF * 2;
      game.draw.rect(x, y, w, h, C.ridge);
      for (var s = 30; s < g.len; s += 74) {
        var tx = g.x0 + g.ux * s, ty = g.y0 + g.uy * s;
        game.draw.rect(tx - g.uy * (RIDGE_HALF + 2) - 5, ty + g.ux * (RIDGE_HALF + 2) - 5, 10, 10, C.leaf);
        game.draw.rect(tx + g.uy * (RIDGE_HALF + 2) - 5, ty - g.ux * (RIDGE_HALF + 2) - 5, 10, 10, C.leaf);
      }
    }
  }

  function drawSteps() {
    for (var k = 0; k < STEPS.length; k++) {
      var st = STEPS[k];
      var horiz = Math.abs(st.ux) > 0.5;
      var col = C.ridgeEdge, alpha = 1;
      if (res[k] === 1) col = C.lamp;
      else if (res[k] === 2) col = C.good;
      else if (res[k] === 3) col = C.bad;
      else if (k === next && Math.abs(st.t - clock) <= GOOD_W) col = C.paper;
      else if (k > next + 6) alpha = 0.35;
      game.draw.sprite(horiz ? FOOT_H : FOOT_V, { '#': col }, st.x, st.y, st.off ? 5 : 6, { anchor: 'center', flipX: horiz && st.ux < 0, alpha: alpha });
      if (st.goal) {
        game.draw.rect(st.x - 34, st.y - 74, 6, 60, C.ridgeEdge);
        game.draw.rect(st.x - 28, st.y - 74, 40, 26, Math.floor(game.time.elapsed * 3) % 2 ? C.lamp : C.bad);
      }
    }
    // 次の足型: 拍の頭で閉じる縮む輪(telegraph)
    if (!over && next < STEPS.length) {
      var s2 = STEPS[next], lead = s2.t - clock;
      if (lead <= SPB && lead > -GOOD_W) {
        var rr = s2.r + Math.max(0, lead) / SPB * 150;
        ring(s2.x, s2.y, rr, lead < GOOD_W ? C.paper : C.lamp, lead < GOOD_W ? 8 : 5);
        ring(s2.x, s2.y, s2.r, C.ink, 2);
      }
      if (next + 1 < STEPS.length) {
        var s3 = STEPS[next + 1];
        if (s3.t - clock <= SPB * 1.4) ring(s3.x, s3.y, s3.r, C.lamp, 2);
      }
    }
  }

  function drawDrops() {
    var now = game.time.elapsed;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i], age = now - d.born;
      if (age < 0.8) ring(d.x, d.y, 20 + age * 120, C.paper, 4);
      game.draw.sprite(BUNDLE, BUNPAL, d.x + Math.sin(now * 2 + i) * 6, d.y + Math.min(30, age * 40), 8, { anchor: 'center', alpha: 0.85 });
    }
  }

  function drawPlanter() {
    var near = won || next >= STEPS.length - 4;
    var wave = near && Math.floor(game.time.elapsed * 4) % 2 === 0;
    game.draw.sprite(PLANTER[wave ? 1 : 0], PLPAL, 1004, 404 - beatPulse * 4, 7, { anchor: 'center' });
  }

  function drawKid() {
    var p = kidPos();
    var fr = flashT > 0 ? KID[2] : KID[(kidK + 2) % 2];
    var big = hitStop > 0;
    game.draw.circle(p.x, p.y + 6, 30, C.ink, 0.25);
    if (big) {
      game.draw.circle(p.x, p.y - 40, 96, '#ffffff', 0.55);
      if (failX > -900) ring(failX, failY, 70 + (0.45 - hitStop) * 120, '#ffffff', 8);
    }
    game.draw.sprite(fr, big ? KIDWHITE : KIDPAL, p.x, p.y - 44 - beatPulse * 8, big ? 10 : 8, { anchor: 'center' });
    // 掴めていない時は子の足元を光らせる(操作ゾーン)
    if (state !== S.RESULT && !over && !grip) {
      var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 8);
      ring(p.x, p.y, GRAB_R * (0.55 + pulse * 0.15), C.lamp, 4);
    }
    if (grip && warnT > 0) ring(game.input.x, game.input.y, 46, C.bad, 6);
  }

  // 拍の物差し: 表(大)と跳ねた裏(小)のランプ。足型のあるコマは黄色、通過中は白
  function drawLamps() {
    var bar = Math.floor(clock / (4 * SPB));
    var inBar = clock / SPB - bar * 4;
    var pat = bar >= 0 && bar < PAT.length ? PAT[bar] : null;
    game.draw.rect(120, HUD_H + 12, 840, 54, C.hud, 0.6);
    for (var sl = 0; sl < 8; sl++) {
      var bpos = Math.floor(sl / 2) + (sl % 2 ? SWING : 0);
      var x = 170 + bpos * 200, rad = sl % 2 ? 10 : 17;
      var lit = clock >= 0 && inBar >= bpos && inBar < bpos + 0.22;
      game.draw.circle(x, HUD_H + 39, rad + 4, C.ink, 0.6);
      game.draw.circle(x, HUD_H + 39, rad, lit ? C.paper : (pat && pat[sl] ? C.lamp : C.hill2));
    }
    if (clock >= 0) game.draw.rect(Math.min(955, 170 + inBar * 200) - 3, HUD_H + 14, 6, 50, C.paper);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, HUD_H, C.hud);
    game.draw.rect(0, HUD_H - 8, W, 8, C.ink);
    label('SCORE ' + score, 50, 66, 40, C.paper, 'left');
    label(Math.min(next, STEPS.length) + ' / ' + STEPS.length, W / 2, 66, 40, C.lamp);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BUNDLE, i < lives ? BUNPAL : BUNOFF, W - 70 - i * 74, 66, 9, { anchor: 'center' });
    var progress = Math.min(1, next / STEPS.length);
    game.draw.rect(50, 128, W - 100, 24, C.ink);
    game.draw.rect(54, 132, (W - 108) * progress, 16, C.lamp);
    if (combo >= 2) label('COMBO x' + combo, 50, 188, 30, C.good, 'left');
  }

  function drawScene() {
    drawField();
    drawRidge();
    drawSteps();
    drawDrops();
    drawPlanter();
    drawKid();
    drawLamps();
  }

  function drawResult(showTap) {
    game.draw.rect(0, H * 0.30, W, H * 0.30, C.hud, 0.92);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.345, 96, won ? C.lamp : C.bad);
    label('SCORE ' + score, W / 2, H * 0.41, 56, C.paper);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.455, 34, C.good);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.50, 52, C.lamp);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.50, 40, C.lamp);
    if (!won) label('あと' + Math.max(1, STEPS.length - next) + '歩!', W / 2, H * 0.545, 46, C.bad);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.585, 36, C.paper);
  }

  // ---- ATTRACT: 実ロジックで跳ねる拍の足型を踏み継ぎ(長短の一歩)、最後は畦からはみ出して水田に落ちる ----
  var demo = { t: 0, x: PATH[0][0], y: PATH[0][1], press: false, halt: false };
  function demoReset() {
    initRun(true);
    for (var k = 0; k < DEMO_FROM; k++) res[k] = 1;
    next = DEMO_FROM; kidK = DEMO_FROM - 1; kidHop = 1;
    kidFrom = { x: STEPS[kidK].x, y: STEPS[kidK].y };
    sFrom = STEPS[kidK].s; clock = STEPS[kidK].t + 0.05; lastBeat = Math.floor(clock / SPB); lastKa = Math.floor(clock / SPB - SWING);
    grip = true; demo.press = true; demo.halt = false;
    demo.x = STEPS[kidK].x; demo.y = STEPS[kidK].y;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    if (demo.halt) {
      clock += dt; if (kidHop < 1) kidHop += dt / 0.13; if (flashT > 0) flashT -= dt;
      beatClock();
      return;
    }
    if (next < STEPS.length) {
      var st = STEPS[next], pv = STEPS[next - 1];
      var mv = Math.min(0.2, (st.t - pv.t) * 0.7);
      var dx = st.x - pv.x, dy = st.y - pv.y, dl = Math.hypot(dx, dy) || 1;
      var ex = st.x - dx / dl * st.r * 0.8, ey = st.y - dy / dl * st.r * 0.8;
      // 失敗例: この一歩だけ畦の外(上の水田)へ指がそれる
      if (next === DEMO_FAIL) { ex = st.x; ey = st.y - 210; }
      var u = (clock + 0.04 - (st.t - mv)) / mv;
      var gx = pv.x, gy = pv.y;
      if (u > 0) { var e = Math.min(1, u); e = e * e * (3 - 2 * e); gx = pv.x + (ex - pv.x) * e; gy = pv.y + (ey - pv.y) * e; }
      demo.x += (gx - demo.x) * Math.min(1, dt * 25);
      demo.y += (gy - demo.y) * Math.min(1, dt * 25);
    }
    stepRun(dt, demo.press && grip, demo.x, demo.y);
    if (!grip) { demo.press = false; demo.halt = true; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!res) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, HUD_H, C.hud);
      game.draw.rect(0, HUD_H - 8, W, 8, C.ink);
      label(GAME_TITLE, W / 2, 86, 84 + Math.sin(t * 3) * 3, C.lamp);
      label('HI-SCORE ' + game.best, W / 2, 176, 36, C.paper);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.lamp);
      else label('TAP TO START', W / 2, H * 0.93, 46, C.paper);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      if (kidHop < 1) kidHop += dt / 0.13;
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt, game.input.pressing, game.input.x, game.input.y);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.46, W, 150, C.hud, 0.8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.lamp);
    }
    // 開始時お手本: 子の足元に指を置く手
    if (!over && !grip && clock < 0.6) {
      var kp = kidPos();
      game.draw.hand(kp.x + 10, kp.y + 10, { press: Math.floor(t * 3) % 2 === 0, scale: 13, alpha: 0.85 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
