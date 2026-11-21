// K-DS-0016v2-potter-wheel-waltz.js
// ろくろのワルツ — 三拍子の1小節でろくろをちょうど1周。拍ごとに縁の印を手前の目印へ通し、3拍そろうと共鳴音が鳴って器が一段伸びる
// 操作: 下の斜めから見たろくろの縁に指を置き、離さずに時計回りの円を描いて回す(指の回した角度だけ円盤が回る)。縁の3つの印(大1・小2)が手前の木べらの目印を通る瞬間が拍の頭に合えばPERFECT/GOOD。ずれる・止まる・速すぎて1拍に2つ通すとMISS。1小節の3拍がそろうと共鳴音が鳴り器が一段伸びる。5小節目からは泥しょうで小さい印が隠れるので2拍目・3拍目は自分で数える(1小節前に先生が水を差す音と水滴で予告)
// 終わり: 8小節(24拍・約12秒)を回し終えて MISS 5回以内ならCLEAR(判定の点+共鳴ボーナス)。MISS 6回でGAME OVER
// @mechanic: rotate_gesture
// @theme: pottery_class_wheel_waltz
// 世界観: 陶芸教室のろくろの前で、見習いの陶芸家が先生の打つ三拍子の拍木に合わせてろくろを一小節に一周ずつ回し、拍がそろうたびに器を一段ずつ挽き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・挽き上げた器の段数・最大コンボ
// スタイル: PIXEL HD
var STYLE = { bg: ['#22160f', '#3e2a1f', '#5c4030'], main: ['#c9825a', '#e8c49a', '#6f849c'], accent: ['#ffd36b', '#5fd1c8'] };

(function(game) {
  // PIXEL HD: 多色+光。光源は左上の窓1つに決め、左を明るく右を暗く塗る。奥の棚・中景の先生・手前のろくろの3層パララックス
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    wallTop: STYLE.bg[0], wall: STYLE.bg[1], wallLow: STYLE.bg[2],
    clay: STYLE.main[0], clayHi: STYLE.main[1], steel: STYLE.main[2],
    light: STYLE.accent[0], mint: STYLE.accent[1],
    clayDk: '#8a5236', wood: '#7b4f2c', woodDk: '#4a2d18', woodHi: '#b07a44',
    wheel: '#56616f', wheelDk: '#2f3740', wheelHi: '#a9bccf', slip: '#9c6244',
    ink: '#160e0a', white: '#fff4e2', red: '#ff5b55', floor: '#2c1d15', glaze: '#4f9bb5',
  };

  var GAME_TITLE = 'WHEEL WALTZ';
  var BPM = 120;
  var SPB = 60 / BPM;
  var BAR = 3;                       // 三拍子
  var BAR_LEN = BAR * SPB;
  var BARS = 8;                      // 判定する小節(0小節目は先生の拍木で助走)
  var FIRST = BAR;                   // 最初に判定する拍(1小節目の頭)
  var LAST = BAR * (BARS + 1) - 1;   // 最後に判定する拍
  var SLIP_BAR = 5;                  // ここから小さい印が泥しょうで隠れる
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var MISS_MAX = 6;
  var HIT_STOP = 0.4;
  var TIME_LIMIT = 14;
  var TAU = Math.PI * 2;
  var STEP_A = TAU / 3;              // 1拍 = 1/3周
  var CX = W / 2, CY = 1290, RX = 360, RY = 150;
  var GUIDE_A = Math.PI / 2;         // 手前(画面下)が目印

  // オリジナルのワルツ(イ短調)。1小節ずつ拍クロックから鳴らす
  var MEL = [
    [['A4', 1], ['C5', 1], ['E5', 1]],
    [['E5', 2], ['D5', 1]],
    [['C5', 1], ['D5', 1], ['E5', 1]],
    [['A4', 2], ['B4', 1]],
    [['C5', 1.5], ['B4', 0.5], ['A4', 1]],
    [['F5', 2], ['E5', 1]],
    [['D5', 1], ['E5', 1], ['F5', 1]],
    [['E5', 1.5], ['C5', 0.5], ['B4', 1]],
    [['A4', 2], ['E5', 1]],
    [['A5', 3]],
  ];
  var B_AM = [['A2', 1], ['E3', 1], ['E3', 1]], B_C = [['C3', 1], ['G3', 1], ['G3', 1]], B_F = [['F2', 1], ['C3', 1], ['C3', 1]];
  var B_DM = [['D3', 1], ['A3', 1], ['A3', 1]], B_E = [['E2', 1], ['B2', 1], ['B2', 1]];
  var BASS = [B_AM, B_AM, B_C, B_AM, B_AM, B_F, B_DM, B_E, B_AM, B_AM];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextMel, readyT, hitStop, flashT, lateIdx;
  var res, barDone, theta, dispTheta, nextC, pen, lastA, beatGlow, clapT, ringFx, resoFx, slipWarn, slipK, dripT;
  var score, combo, maxCombo, perfects, goods, misses, tiers, over, won, outroT, prevBest, milestone;
  var motes = [];
  for (var mi = 0; mi < 18; mi++) motes.push({ x: game.random(80, 620), y: game.random(300, 1100), v: game.random(8, 26), p: game.random(0, 6) });

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function wrap(d) { while (d > Math.PI) d -= TAU; while (d <= -Math.PI) d += TAU; return d; }
  function angOf(x, y) { return Math.atan2((y - CY) / RY, (x - CX) / RX); }
  function rimPt(a, k) { return { x: CX + Math.cos(a) * RX * k, y: CY + Math.sin(a) * RY * k }; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextMel = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; lateIdx = FIRST;
    res = []; barDone = [];
    theta = -STEP_A + 0.35; dispTheta = theta; nextC = 0; pen = false; lastA = 0;
    beatGlow = [0, 0, 0]; clapT = 0; ringFx = 0; resoFx = 0; slipWarn = 0; slipK = 0; dripT = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; tiers = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  function playBar(b) {
    if (!armed || b >= MEL.length) return;
    game.audio.melody(MEL[b], { tempo: BPM, wave: 'triangle', volume: demoMode ? 0.025 : 0.05, bass: BASS[b], bassWave: 'sine', bassVolume: demoMode ? 0.04 : 0.08 });
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextMel = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    var bar = Math.floor(k / BAR), pos = k % BAR;
    beatGlow[pos] = 1; clapT = 0.16;
    if (pos === 0) {
      checkLate();
      if (bar >= 2 && bar - 1 <= BARS) evalBar(bar - 1);
      tone(110, 0.16, { wave: 'sine', volume: 0.24 * vol() });
      tone(880, 0.03, { wave: 'square', volume: 0.03 * vol() });
      if (bar === SLIP_BAR - 1) {
        // 1小節前の予告: 先生が水差しを傾ける(下る水音 + 水滴)
        slipWarn = BAR_LEN; dripT = BAR_LEN;
        tone(1400, 0.22, { wave: 'sine', volume: 0.07 * vol(), slide: -900 });
      }
      if (bar === SLIP_BAR) {
        tone(300, 0.2, { wave: 'triangle', volume: 0.08 * vol(), slide: -150 });
        game.fx.burst(CX, CY - 40, { color: C.slip, count: 18, speed: 300 });
      }
    } else {
      tone(pos === 1 ? 660 : 587, 0.035, { wave: 'triangle', volume: 0.05 * vol() });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    // 次の小節の旋律は小節頭の少し前に仕込む(発音の遅れを吸収)
    var nb = Math.floor(beatN / BAR) + 1;
    if (nextMel === nb && beatN % BAR === BAR - 1 && beatT >= SPB - 0.06) { playBar(nb); nextMel++; }
    checkLate();
    var slipTarget = songT >= SLIP_BAR * BAR_LEN - 0.1 ? 1 : 0;
    slipK += (slipTarget - slipK) * Math.min(1, dt * 5);
    if (!demoMode && !over && songT > LAST * SPB + GOOD_W + 0.08) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function checkLate() {
    while (lateIdx <= LAST && songT > lateIdx * SPB + GOOD_W) {
      if (!res[lateIdx]) { res[lateIdx] = 'late'; missFx('late'); }
      lateIdx++;
    }
  }

  function evalBar(j) {
    if (j < 1 || j > BARS || barDone[j]) return;
    barDone[j] = true;
    var allOk = true, allPerfect = true;
    for (var i = 0; i < BAR; i++) {
      var r = res[j * BAR + i];
      if (r !== 'perfect' && r !== 'good') allOk = false;
      if (r !== 'perfect') allPerfect = false;
    }
    if (!allOk) return;
    tiers++; resoFx = 1;
    score += allPerfect ? 250 : 150;
    // 共鳴音: 器の胴が鳴る3和音
    tone(440, 0.5, { wave: 'sine', volume: 0.07 * vol() });
    tone(659, 0.5, { wave: 'sine', volume: 0.05 * vol() });
    tone(880, 0.6, { wave: 'triangle', volume: 0.04 * vol() });
    if (armed) game.audio.play('se_powerup', 0.25 * vol());
    game.fx.burst(CX, potTopY() - 10, { color: allPerfect ? C.light : C.clayHi, count: allPerfect ? 20 : 12, speed: 320 });
    if (!demoMode && tiers === 3 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(tiers + ' / ' + BARS, W / 2, 760, { color: C.light, size: 84 });
    }
  }

  function missFx(why) {
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    var g = rimPt(GUIDE_A, 0.86);
    game.feedback.bad(g.x, g.y - 120, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.45 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 縁の印が目印を通った(入力とデモで共通)
  function onCross() {
    if (!running || over) return 'none';
    var b = Math.round(songT / SPB);
    if (b < FIRST) {
      tone(1175, 0.03, { wave: 'triangle', volume: 0.04 * vol() });
      return 'warm';
    }
    if (b > LAST) return 'none';
    var off = songT - b * SPB;
    var r = res[b];
    if (r === 'late' || r === 'miss') return 'none';
    if (r) { missFx('fast'); return 'miss'; }          // 1拍に2つ通した(速すぎ)
    if (Math.abs(off) > GOOD_W) { res[b] = 'miss'; missFx('pace'); return 'miss'; }
    combo++; if (combo > maxCombo) maxCombo = combo;
    ringFx = 1;
    var g = rimPt(GUIDE_A, 0.86);
    if (Math.abs(off) <= PERFECT_W) {
      res[b] = 'perfect'; perfects++; score += 100 + Math.min(combo, 10) * 5;
      game.feedback.good(g.x, g.y - 130, { text: 'PERFECT', color: C.light, size: 52, count: 10, volume: armed ? 0.22 : 0.001 });
    } else {
      res[b] = 'good'; goods++; score += 50;
      game.feedback.good(g.x, g.y - 130, { text: 'GOOD', color: C.mint, size: 44, count: 6, volume: armed ? 0.18 : 0.001 });
    }
    return 'ok';
  }

  function wheelDown(x, y) {
    lastA = angOf(x, y); pen = true;
  }
  function wheelMove(x, y) {
    var a = angOf(x, y);
    var d = wrap(a - lastA);
    lastA = a;
    if (Math.abs(d) > 1.2) return 'none';     // 中心をまたいだ飛びは無視
    theta += d;
    var out = 'none';
    if (theta >= nextC * STEP_A) { out = onCross(); nextC++; }
    return out;
  }

  function finish(ok) {
    if (over) return;
    for (var j = 1; j <= BARS; j++) if (!barDone[j] && (j + 1) * BAR - 1 < lateIdx) evalBar(j);
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += tiers * 60;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(220, 860), game.random(700, 1200), { color: i % 2 ? C.light : C.mint, count: 20, speed: 400 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 700, { color: C.light, size: 72 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    var nx = (x - CX) / RX, ny = (y - CY) / RY;
    var rn = Math.sqrt(nx * nx + ny * ny);
    if (rn > 0.3 && rn < 2.1) {
      wheelDown(x, y);
      game.audio.tone(392, 0.05, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(x, y, { color: C.clayHi, count: 5, speed: 140 });
    } else {
      game.audio.play('se_tap', 0.15);
    }
  });
  var lastScrape = 0;
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pen || over) return;
    var r = wheelMove(x, y);
    if (r === 'none' && game.time.elapsed - lastScrape > 0.09) {
      lastScrape = game.time.elapsed;
      game.audio.tone(1900, 0.012, { wave: 'triangle', volume: 0.012 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (pen && !over) game.audio.tone(262, 0.04, { wave: 'sine', volume: 0.05 });
    pen = false;
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    var step = 6;
    for (var y = -ry; y < ry; y += step) {
      var yy = y + step / 2;
      var hw = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - hw, cy + y, hw * 2, step, col, a === undefined ? 1 : a);
    }
  }
  function ellipseLine(cx, cy, rx, ry, col, w) {
    var n = 36;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
      game.draw.line(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, col, w);
    }
  }

  var APP = [
    ['....hhhh....', '...hhhhhh...', '..hhssssh...', '..hsesesh...', '...ssssss...', '....ssss....', '..wwaaaaww..', '.wwwaaaawww.', '.ss.aaaa.ss.', '..ss.aa.ss..', '...ssaass...', '....aaaa....'],
    ['....hhhh....', '...hhhhhh...', '..hhssssh...', '..hsesesh...', '...ssssss...', '....ssss....', '..wwaaaaww..', '.wwwaaaawww.', 'ss..aaaa..ss', '.ss.aaaa.ss.', '..ssaaaass..', '....aaaa....'],
    ['....hhhh....', '...hhhhhh...', '..hhssssh...', '..h-se-sh...', '...ssoss....', '....ssss....', '..wwaaaaww..', '.wwwaaaawww.', '.ss.aaaa.ss.', '..ss.aa.ss..', '...ssaass...', '....aaaa....'],
  ];
  var APAL = { h: '#3b2416', s: '#f0c49c', e: '#2a1a12', '-': '#2a1a12', o: '#7a2c1c', w: '#efe6d6', a: '#3d6f8f' };
  var TEACH = [
    ['...gggg...', '..gggggg..', '..gsssss..', '..sesses..', '...ssss...', '.kkkkkkkcc', 'kkkkkkkks.', 'kkkkkkkk..', '.kkkkkk...', '.kkkkkk...', '..kk.kk...', '.bbb.bbb..'],
    ['...gggg...', '..gggggg..', '..gsssss..', '..sesses..', '...ssss...', '.kkkkkkk..', 'kkkkkkkks.', 'kkkkkkkk.c', '.kkkkkk..c', '.kkkkkk...', '..kk.kk...', '.bbb.bbb..'],
  ];
  var TPAL = { g: '#cfc6bb', s: '#e9bb93', e: '#2a1a12', k: '#4c6a52', b: '#2a1a12', c: '#c7924f' };
  var SHELF_POT = ['.cc.', 'cccc', 'cccc', '.cc.'];
  var SHELF_JAR = ['.c.', 'ccc', 'ccc', 'ccc', '.c.'];

  function drawRoom(t) {
    var sway = Math.sin(t * 0.35);
    game.draw.gradient(0, H, [[0, C.wallTop], [0.45, C.wall], [0.62, C.wallLow], [0.63, C.floor], [1, '#1d130d']]);
    // 層1(奥): 窓と棚の素焼き(ゆっくり揺れる視差)
    var o1 = sway * 6;
    game.draw.rect(70 + o1, 270, 260, 300, '#6b5440');
    game.draw.rect(86 + o1, 286, 228, 268, '#ffe7a8');
    game.draw.rect(196 + o1, 286, 8, 268, '#6b5440');
    game.draw.rect(86 + o1, 416, 228, 8, '#6b5440');
    for (var s = 0; s < 3; s++) {
      var sy = 340 + s * 150;
      game.draw.rect(420 + o1, sy + 52, 600, 14, C.woodDk);
      game.draw.rect(420 + o1, sy + 52, 600, 4, C.woodHi);
      for (var p = 0; p < 6; p++) {
        var px = 460 + o1 + p * 100;
        var col = (p + s) % 3 === 0 ? C.glaze : ((p + s) % 3 === 1 ? C.clay : C.clayHi);
        game.draw.sprite((p + s) % 2 ? SHELF_POT : SHELF_JAR, { c: col }, px, sy + 24, 11, { anchor: 'center' });
        game.draw.rect(px - 18, sy + 6, 6, 30, '#ffffff', 0.12);   // 左上光源のハイライト
      }
    }
    // 窓からの光の帯 + 漂うほこり
    for (var b = 0; b < 3; b++) game.draw.line(200 + o1 + b * 40, 420, 640 + b * 120, 1180, '#ffd36b10', 150);
    for (var m = 0; m < motes.length; m++) {
      var mo = motes[m];
      mo.y -= mo.v * 0.016; mo.x += Math.sin(t + mo.p) * 0.3;
      if (mo.y < 300) mo.y = 1100;
      game.draw.rect(mo.x + o1 * 0.5, mo.y, 4, 4, C.light, 0.35 + 0.25 * Math.sin(t * 2 + mo.p));
    }
    // 層2(中景): 先生と作業台(拍木を拍で打つ)
    var o2 = sway * 12;
    game.draw.rect(40 + o2, 880, 300, 30, C.wood);
    game.draw.rect(40 + o2, 880, 300, 6, C.woodHi);
    game.draw.rect(60 + o2, 910, 24, 140, C.woodDk);
    game.draw.rect(296 + o2, 910, 24, 140, C.woodDk);
    var tf = clapT > 0 ? 1 : 0;
    game.draw.sprite(TEACH[tf], TPAL, 190 + o2, 760 + Math.sin(t * 1.6) * 3, 13, { anchor: 'center' });
    if (clapT > 0) game.draw.circle(258 + o2, 800, 26 + (0.16 - clapT) * 120, C.light, 0.35);
    // 水差し(泥しょうの予告で傾く)
    var tilt = slipWarn > 0 ? 1 : 0;
    game.draw.rect(300 + o2, 840 - tilt * 14, 46, 40, C.glaze);
    game.draw.rect(300 + o2, 840 - tilt * 14, 14, 40, '#7fc0d6');
    if (dripT > 0) {
      for (var dd = 0; dd < 4; dd++) {
        var dy = ((t * 900 + dd * 120) % 420);
        game.draw.circle(CX - 60 + dd * 30, 900 + dy, 8, C.slip, 0.85);
      }
    }
  }

  function potTopY() { return CY - 30 - tiers * 34; }

  function drawWheel(t) {
    var stop = flashT > 0;
    // 台座と影
    ellipse(CX, CY + 70, RX + 40, RY + 30, '#120b08', 0.55);
    game.draw.rect(CX - 120, CY + 40, 240, 240, C.wheelDk);
    game.draw.rect(CX - 120, CY + 40, 60, 240, '#3e4854');
    // 円盤の厚み → 上面
    ellipse(CX, CY + 22, RX, RY, C.wheelDk);
    ellipse(CX, CY, RX, RY, ringFx > 0 ? '#6c7a8b' : C.wheel);
    ellipse(CX - 70, CY - 34, RX * 0.55, RY * 0.4, C.wheelHi, 0.18);   // 左上からの光
    ellipseLine(CX, CY, RX * 0.62, RY * 0.62, '#00000040', 3);
    ellipseLine(CX, CY, RX * 0.94, RY * 0.94, '#ffffff30', 3);
    // 回転の筋(円盤と一緒に回る)
    for (var k = 0; k < 12; k++) {
      var sa = dispTheta + k * TAU / 12;
      var p0 = rimPt(sa, 0.38), p1 = rimPt(sa, 0.74);
      game.draw.line(p0.x, p0.y, p1.x, p1.y, '#2f374090', 3);
    }
    // 泥しょう(5小節目から縁を覆う)
    if (slipK > 0.02) {
      for (var q = 0; q < 14; q++) {
        var qa = dispTheta + q * TAU / 14 + 0.2;
        var qp = rimPt(qa, 0.86);
        game.draw.circle(qp.x, qp.y, 28 + (q % 3) * 6, C.slip, 0.85 * slipK);
      }
    }
    // 回る向きの矢印(奥側の縁、右向き=時計回り)
    for (var c = -1; c <= 1; c++) {
      var ca = -Math.PI / 2 + c * 0.5;
      var cp = rimPt(ca, 1.16);
      var bob = Math.sin(t * 6 + c) * 4;
      game.draw.line(cp.x - 16 + bob, cp.y - 14, cp.x + 6 + bob, cp.y, C.light, 7);
      game.draw.line(cp.x - 16 + bob, cp.y + 14, cp.x + 6 + bob, cp.y, C.light, 7);
    }
    // 縁の3つの印(大=1拍目、小=2・3拍目)
    for (var m = 0; m < 3; m++) {
      var ma = GUIDE_A + dispTheta + m * STEP_A;
      var mp = rimPt(ma, 0.86);
      var depth = 0.75 + 0.25 * (Math.sin(ma) + 1) / 2;
      var big = m === 0;
      var a = big ? 1 : 1 - slipK;
      if (a < 0.03) continue;
      game.draw.circle(mp.x, mp.y + 4, (big ? 30 : 19) * depth, C.ink, 0.5 * a);
      game.draw.circle(mp.x, mp.y, (big ? 28 : 18) * depth, big ? C.light : C.clayHi, a);
      game.draw.circle(mp.x - 6, mp.y - 5, (big ? 9 : 6) * depth, '#ffffff', 0.6 * a);
    }
    // 器(段数ぶん伸びる。左を明るく右を暗く)
    var top = potTopY();
    var h = CY - 20 - top;
    var wob = stop ? Math.sin(t * 60) * 6 : 0;
    ellipse(CX, CY - 14, 150, 50, C.clayDk);
    for (var yy = 0; yy < h; yy += 6) {
      var f = yy / Math.max(1, h);
      var wdt = 120 + Math.sin(f * Math.PI) * (20 + tiers * 6) - f * 20;
      var y = CY - 22 - yy;
      game.draw.rect(CX - wdt + wob, y - 6, wdt * 2, 6, C.clay);
      game.draw.rect(CX - wdt + wob, y - 6, wdt * 0.5, 6, C.clayHi, 0.55);
      game.draw.rect(CX + wdt * 0.55 + wob, y - 6, wdt * 0.45, 6, C.clayDk, 0.6);
    }
    for (var gl = 0; gl < 4; gl++) {
      var gx = Math.sin(dispTheta * 1.5 + gl * 1.57);
      if (Math.cos(dispTheta * 1.5 + gl * 1.57) > 0) game.draw.rect(CX + gx * 100 - 3 + wob, top + 6, 6, h - 10, '#ffffff', 0.12);
    }
    ellipse(CX + wob, top, 104 - Math.min(tiers, 8) * 2, 26, C.clayDk);
    ellipse(CX + wob, top + 4, 86 - Math.min(tiers, 8) * 2, 18, '#6a3c26');
    if (resoFx > 0) {
      game.draw.circle(CX, top + h * 0.4, 160 + (1 - resoFx) * 120, C.light, 0.25 * resoFx);
      game.draw.circle(CX, top + h * 0.4, 120 + (1 - resoFx) * 80, C.mint, 0.2 * resoFx);
    }
    // 見習い(器の奥に座り、拍で手を動かす)
    var af = stop ? 2 : (Math.floor(songT / SPB) % 2);
    game.draw.sprite(APP[af], APAL, CX + 250, CY - 300 + Math.sin(t * 2.2) * 3, 13, { anchor: 'center', flipX: true });
    // 手前の木べら(目印)
    var g = rimPt(GUIDE_A, 0.86);
    var glow = beatGlow[0] > 0 ? beatGlow[0] : Math.max(beatGlow[1], beatGlow[2]) * 0.6;
    if (glow > 0) game.draw.circle(g.x, g.y, 44 + glow * 26, beatGlow[0] > 0 ? C.light : C.mint, 0.35 * glow);
    var gs = stop ? 1 + (flashT / HIT_STOP) * 0.5 : 1;
    game.draw.line(g.x, CY + RY + 150, g.x, g.y + 40 * gs, stop ? C.white : C.woodHi, 22 * gs);
    game.draw.line(g.x - 4, CY + RY + 150, g.x - 4, g.y + 44 * gs, stop ? C.white : C.wood, 10 * gs);
    game.draw.line(g.x - 22 * gs, g.y + 48 * gs, g.x, g.y + 22 * gs, stop ? C.white : C.light, 8);
    game.draw.line(g.x + 22 * gs, g.y + 48 * gs, g.x, g.y + 22 * gs, stop ? C.white : C.light, 8);
    if (stop) game.draw.circle(g.x, g.y, 60 * gs, C.red, 0.35);
  }

  // 三拍子の拍木ランプ(1・2・3)
  function drawCount() {
    var y = 1670;
    game.draw.rect(270, y - 64, 540, 128, '#00000055');
    for (var i = 0; i < 3; i++) {
      var x = 380 + i * 160;
      var cur = running && beatN % BAR === i;
      var r = i === 0 ? 42 : 28;
      if (beatGlow[i] > 0) game.draw.circle(x, y, r + beatGlow[i] * 18, i === 0 ? C.light : C.mint, 0.5);
      game.draw.circle(x, y, r, cur ? (i === 0 ? C.light : C.mint) : '#4a3a2e');
      game.draw.circle(x - r * 0.3, y - r * 0.3, r * 0.3, '#ffffff', cur ? 0.5 : 0.15);
      if (i > 0 && slipK > 0.5) game.draw.circle(x, y, r * 0.5, C.slip, 0.8);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#120b08', 0.82);
    label('SCORE ' + score, 50, 100, 52, C.white, 'left');
    label('BEST ' + prevBest, 50, 168, 30, C.light, 'left');
    var bar = Math.max(0, Math.min(BARS, Math.floor(songT / BAR_LEN)));
    label(bar + ' / ' + BARS, W - 50, 100, 54, C.clayHi, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 330 + m * 54, 160, 16, m < misses ? C.red : '#4a3a2e');
    var progress = Math.min(1, songT / ((LAST + 1) * SPB));
    game.draw.rect(0, 220, W, 10, '#3a2a20');
    game.draw.rect(0, 220, W * progress, 10, C.light);
  }

  function drawScene(t) {
    drawRoom(t);
    drawWheel(t);
    drawCount();
  }

  // ---- ATTRACT: 実ロジックで 1小節1周(拍どおり)→3小節目に急いで印を早く通す(MISS)→合わせ直し→5小節目から泥しょう ----
  var demo = { t: 0, hx: CX, hy: CY + RY, started: false };
  var DEMO_BEATS = 19;
  function warp(tb) {
    if (tb < 8.2) return 0;
    if (tb < 8.6) return (tb - 8.2) / 0.4 * 0.36;
    if (tb < 9.4) return 0.36;
    if (tb < 10.4) return 0.36 * (1 - (tb - 9.4));
    return 0;
  }
  function demoTheta(tb) {
    var th0 = -STEP_A + 0.35;
    return Math.max(th0, (tb - FIRST + warp(tb)) * STEP_A);
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.started = false; }
    stepPlay(dt);
    var th = demoTheta(songT / SPB);
    var p = rimPt(GUIDE_A + th, 0.86);
    if (!demo.started) { demo.started = true; wheelDown(p.x, p.y); }
    else wheelMove(p.x, p.y);
    demo.hx = p.x; demo.hy = p.y;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (clapT > 0) clapT -= dt;
    if (ringFx > 0) ringFx -= dt * 5;
    if (resoFx > 0) resoFx -= dt * 1.5;
    if (slipWarn > 0) slipWarn -= dt;
    if (dripT > 0) dripT -= dt;
    for (var i = 0; i < 3; i++) if (beatGlow[i] > 0) beatGlow[i] -= dt * 4;
    if (hitStop <= 0) dispTheta = theta;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      if (hitStop <= 0) dispTheta = theta;
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: true, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#120b08', 0.82);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.light);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.mint);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 48, C.light);
      else label('TAP TO START', W / 2, H * 0.955, 44, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      game.draw.rect(60, 330, W - 120, 560, '#120b08', 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 450, 100, won ? C.light : C.red);
      label('SCORE ' + score, W / 2, 550, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 630, 34, C.clayHi);
      label(tiers + ' / ' + BARS, W / 2, 700, 44, C.mint);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 790, 54, C.light);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 790, 42, C.light);
      if (!won) label('あと' + Math.max(1, BARS - tiers) + '段!', W / 2, 860, 46, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, tiers: tiers, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 760, 110, C.light);
    if (over && won) label('FINISH', W / 2, 760, 100, C.light);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
