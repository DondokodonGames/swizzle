// K-DS-0041v2-waterway-jet-gap-step.js
// 地下水路の水柱くぐり — 拍ごとに噴き上がる水柱の門にできる斜めの隙間を見て、食い込んだ拍(裏で先に入る拍)の頭に体の向きを合わせて飛び石へ踏み込む
// 操作: 次の飛び石に2本の水柱が噴き上がり、間に隙間ができる。隙間が左に傾いていれば左上へはじく(または下の左の板を押す)、まっすぐなら真上へはじく/その場でタップ(真ん中の板)、右に傾いていれば右上へはじく(右の板)。判定は指が触れた瞬間で、隙間が開ききる拍の頭とのずれでPERFECT/GOOD。門は表拍だけでなく裏(半拍前に食い込む拍)にも来る。向き違い・早すぎ・遅れは水柱を浴びてMISS。門の0.75秒前に水柱が立ちはじめ、隙間の形と飛び石の輪で予告。上の8分の物差しで、桃色の印が食い込む拍
// 終わり: 96BPM・前奏1小節+7小節(32拍・20秒・20門)を渡り切ればCLEAR。水柱を3回浴びたらGAME OVER
// @mechanic: gap_fit
// @theme: underground_waterway_jet_gap_step
// 世界観: 街の地下を流れる石造りの導水路で、白いヘルメットに反射帯の雨合羽を着た水道局の点検員が、拍ごとに噴き上がる水柱の門の隙間へ体を斜めにして踏み込み、飛び石伝いに奥の水門の点検へ向かう
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・くぐった門の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: MODE7 PSEUDO
var STYLE = { bg: ['#0c1a24', '#24485a'], main: ['#3f6f7c', '#8fb8c0', '#1a2e36'], accent: ['#ff7fa8', '#f2e05a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色 + 地平グラデ。床は横ストリップを奥ほど圧縮、壁は縦ストリップで地平の一点へ収束
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], wall: STYLE.main[0], foam: STYLE.main[1], dark: STYLE.main[2],
    pink: STYLE.accent[0], yel: STYLE.accent[1], ink: '#071016', water1: '#1d5a72', water2: '#2a7590',
    stone: '#8a8a7e', stoneDk: '#5e5e54', jet: '#cdeefa', jet2: '#9fd6ee', white: '#ffffff', teal: '#5fe0d0'
  };

  var GAME_TITLE = 'JET GAP WALK';
  var BPM = 96;
  var SPB = 60 / BPM;
  // 小節ごとの門の位置(拍。x.5 = 半拍前に食い込む裏)。前奏1小節のあと7小節
  var BARS = [[0, 2], [0, 1.5, 3], [0, 1.5, 3], [0, 1.5, 3.5], [1, 2.5], [0, 1.5, 2.5, 3.5], [1, 2.5, 3.5]];
  var TOTAL_BEATS = 32;
  var DEMO_GATES = [[2, -1], [3.5, 0], [5, 1]];
  var DEMO_BEATS = 7;
  var TIME_LIMIT = 20;            // 32拍 × 0.625秒 = 20秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.13, EARLY_W = 0.3;
  var TELE_T = 0.75;
  var LIVES = 3;
  // 疑似3D: 地平線・焦点距離・目の高さ(床から2)・天井の高さ(目から1.6)・壁の横位置
  var HY = 640, F = 495, EYE = 2, CEIL = 1.6, XW = 2.4, D0 = 1.5, STEP_T = 0.2;
  var SLOT = 0.26, JET_X = 0.95, JET_H = 1.35;

  // 伴奏(オリジナル)。水路に響く低音と、食い込む裏の押し
  var LEAD = ['A4', 'C5', 'E5', 'D5', 'C5', 'A4', 'G4', 'A4'];
  var BASS = ['A2', 'A2', 'F2', 'G2', 'A2', 'A2', 'E2', 'G2'];

  // ---- スプライト(点検員の背中: 白ヘルメット+橙の帯・反射帯つき雨合羽) ----
  var MAN_PAL = { k: '#071016', w: '#f4f4ee', o: '#ff9a3a', l: '#fff6a0', s: '#d8a888', c: '#4f8a92', d: '#36646c', y: '#f2e05a', g: '#d8d4c4', b: '#22262a' };
  var MAN_BACK = [
    '....kkkk....',
    '...kwwwwk...',
    '..kwwwwwwk..',
    '..kooooook..',
    '.kwwwwwwwwk.',
    '...kssssk...',
    '..kcccccck..',
    '.kcccccccck.',
    'kcccyyyyccck',
    'kcyyyyyyyyck',
    'kcccyyyyccck',
    'kgkcccccckgk',
    'kgkcccccckgk',
    '..kddddddk..',
    '..kddkkddk..',
    '.kddk..kddk.',
    '.kbbk..kbbk.',
    'kbbbk..kbbbk'
  ];
  var MAN_SIDE = [
    '..kkkk..',
    '.kwwwwk.',
    'kwwwwwwk',
    'kooooolk',
    'kwwwwwwk',
    '.kssssk.',
    '.kcccck.',
    'kcccccck',
    'kcyyyyck',
    'kcyyyyck',
    'kccgccck',
    'kccgccck',
    '.kddddk.',
    '.kddddk.',
    '.kddddk.',
    '.kddkdk.',
    '.kbbkbk.',
    'kbbbkbbk'
  ];
  var MAN_LEAN = shear(MAN_SIDE, 0.34);
  var SOAK_PAL = { k: '#071016', w: '#bfe6f4', o: '#9fd6ee', l: '#ffffff', s: '#9fd6ee', c: '#6fb6d0', d: '#5aa0bc', y: '#cdeefa', g: '#cdeefa', b: '#3a6a80' };
  var DROP = ['..k..', '.kwk.', 'kwwwk', 'kwwwk', '.kkk.'];

  function shear(rows, k) {
    var n = rows.length, maxS = Math.round((n - 1) * k), out = [];
    for (var r = 0; r < n; r++) {
      var s = Math.round((n - 1 - r) * k);
      var pad1 = '', pad2 = '';
      for (var a = 0; a < maxS - s; a++) pad1 += '.';
      for (var b = 0; b < s; b++) pad2 += '.';
      out.push(pad1 + rows[r] + pad2);
    }
    return out;
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var gates, nextG, clock, endT, score, combo, maxCombo, nPerfect, nGood, nMiss, passed;
  var hitStop, hitObj, over, won, outroT, lastCue, lastBeat, demoMode, prevBest, resultT, realT;
  var beatPulse, gest, pose, poseT, soakT, plates, splash, milestoneDone;

  function buildGates(demo) {
    gates = [];
    if (demo) {
      for (var d = 0; d < DEMO_GATES.length; d++) gates.push(makeGate(d, DEMO_GATES[d][0], DEMO_GATES[d][1]));
      return;
    }
    var i = 0, prev = 0, run = 0;
    for (var b = 0; b < BARS.length; b++) {
      for (var j = 0; j < BARS[b].length; j++) {
        var tilt;
        do { tilt = Math.floor(game.random(0, 3)) - 1; if (tilt > 1) tilt = 1; }
        while (tilt === prev && run >= 1);
        run = tilt === prev ? run + 1 : 0;
        prev = tilt;
        gates.push(makeGate(i, 4 + b * 4 + BARS[b][j], tilt));
        i++;
      }
    }
  }
  function makeGate(i, pos, tilt) {
    return { i: i, pos: pos, t: pos * SPB, tilt: tilt, sync: Math.abs(pos - Math.round(pos)) > 0.01, res: 0, cued: false };
  }

  function initRun(demo) {
    demoMode = !!demo;
    buildGates(demo);
    endT = (demo ? DEMO_BEATS : TOTAL_BEATS) * SPB;
    clock = demo ? -0.4 : -READY_T;
    nextG = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; passed = 0;
    hitStop = 0; hitObj = null; over = false; won = false; outroT = 0; lastCue = -1; lastBeat = -1;
    prevBest = game.best; resultT = 0; realT = 0;
    beatPulse = 0; gest = null; pose = 'back'; poseT = 0; soakT = 0; plates = [0, 0, 0]; splash = []; milestoneDone = false;
  }

  // カメラは門の時刻で1石ずつ前へ(時計は1本)
  function camZ() {
    var z = 0;
    for (var i = 0; i < gates.length; i++) {
      var k = (clock - gates[i].t) / STEP_T;
      if (k <= 0) break;
      k = Math.min(1, k);
      z += k * k * (3 - 2 * k);
    }
    return z;
  }
  function gateAtAnd(n) {
    for (var i = 0; i < gates.length; i++) if (Math.abs(gates[i].pos - (n + 0.5)) < 0.01) return true;
    return false;
  }

  // ---- 拍クロックと伴奏 ----
  function cueBeats() {
    var total = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    for (var n = lastCue + 1; n < total; n++) {
      if (clock + 0.06 < n * SPB) break;
      lastCue = n;
      if (!demoMode) playBeat(n);
    }
  }
  function playBeat(n) {
    var push = gateAtAnd(n);
    var lead = n < 4 ? 'R' : LEAD[n % 8];
    game.audio.melody([[lead, 0.5], [push ? LEAD[(n + 2) % 8] : 'R', 0.5]], {
      tempo: BPM, wave: 'square', volume: push ? 0.045 : 0.03,
      bass: [[BASS[n % 8], 0.5], [push ? BASS[(n + 1) % 8] : 'R', 0.5]], bassWave: 'triangle', bassVolume: 0.13
    });
    // しずくの刻み(拍の頭)
    game.audio.tone(n % 4 === 0 ? 1760 : 1320, 0.03, { wave: 'triangle', volume: 0.04 });
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var bi = Math.floor(clock / SPB);
    while (lastBeat < bi) { lastBeat++; beatPulse = 1; }
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (!g.cued && clock >= g.t - TELE_T) {
        g.cued = true;
        if (!demoMode) game.audio.tone(170, 0.32, { wave: 'triangle', volume: 0.09, slide: 320 });
      }
    }
    // 指を置いたまま判定待ちのはじきは0.3秒で真上扱い
    if (gest && clock - gest.tp > 0.3) commit(gest.plate !== null ? gest.plate : 0);
    if (over) return;
    var g2 = gates[nextG];
    if (g2 && clock > g2.t + GOOD_W && !(gest && Math.abs(gest.tp - g2.t) <= GOOD_W)) {
      soak(g2, 'late');
      return;
    }
    if (!demoMode && clock >= endT + 0.1) finishRun(true);
  }

  // ---- 入力の形(本番の指もATTRACTのゴーストも同じ関数) ----
  function plateAt(x, y) {
    if (y < 1480) return null;
    return x < 360 ? -1 : x < 720 ? 0 : 1;
  }
  function gestureStart(x, y) {
    gest = { x0: x, y0: y, tp: clock, plate: plateAt(x, y) };
    pose = 'prep'; poseT = 0.3;
  }
  function gestureMove(x, y) {
    if (!gest) return null;
    var dx = x - gest.x0, dy = y - gest.y0;
    if (Math.hypot(dx, dy) < 60) return null;
    return commit(dx < -30 ? -1 : dx > 30 ? 1 : 0);
  }
  function gestureEnd(x, y) {
    if (!gest) return null;
    var dx = x - gest.x0, dy = y - gest.y0;
    if (Math.hypot(dx, dy) >= 40 && Math.abs(dx) > 30) return commit(dx < 0 ? -1 : 1);
    return commit(gest.plate !== null ? gest.plate : 0);
  }
  function commit(tilt) {
    var tp = gest.tp;
    gest = null;
    plates[tilt + 1] = 0.25;
    pose = tilt; poseT = 0.45;
    return stepInto(tilt, tp);
  }

  function stepInto(tilt, tp) {
    var g = gates[nextG];
    if (!g || over) return 'none';
    var d = tp - g.t;
    if (d < -EARLY_W) {
      // 門の遠くで足踏み: 連続が切れるだけ
      combo = 0;
      game.feedback.bad(W / 2, 1180, { text: null, color: C.foam, flashColor: C.dark, shake: 2, volume: demoMode ? 0.02 : 0.15 });
      return 'whiff';
    }
    if (d < -GOOD_W || d > GOOD_W) { soak(g, d < 0 ? 'early' : 'late'); return 'miss'; }
    if (tilt !== g.tilt) { soak(g, 'shape'); return 'miss'; }
    return passGate(g, Math.abs(d) <= PERFECT_W ? 1 : 2);
  }

  function passGate(g, grade) {
    g.res = grade; nextG++; passed++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var gain = (grade === 1 ? 160 : 100) + (g.sync ? 40 : 0) + Math.min(10, combo) * 12;
    score += gain;
    game.feedback.good(W / 2, 900, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.yel : C.teal, size: grade === 1 ? 56 : 46,
      count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.16
    });
    if (!demoMode) game.audio.play('se_jump', 0.25);
    if (!demoMode && combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 160, 380, { color: C.yel, size: 60 });
    if (!demoMode && !milestoneDone && passed >= 10) {
      milestoneDone = true;
      game.fx.popup('NICE', W / 2, 470, { color: C.pink, size: 92 });
      game.audio.play('se_milestone', 0.45);
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function soak(g, why) {
    g.res = 3; nextG++;
    nMiss++; combo = 0;
    hitStop = 0.45; hitObj = g; soakT = 1.1;
    for (var k = 0; k < 14; k++) splash.push({ x: W / 2 + game.random(-160, 160), y: 1060 + game.random(-80, 80), vx: game.random(-300, 300), vy: game.random(-520, -120), t: 0 });
    game.feedback.bad(W / 2, 980, { text: 'MISS', color: C.pink, flashColor: C.white, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && nMiss >= LIVES) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7; gest = null;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (LIVES - nMiss) * 300 + 400;
      for (var i = 0; i < 6; i++) game.fx.burst(260 + (i % 3) * 280, 620 + Math.floor(i / 3) * 280, { color: i % 2 ? C.yel : C.jet, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, passed: passed, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < -0.35 || hitStop > 0 || y < 230) return;
    gestureStart(x, y);
    if (gest) game.audio.tone(440, 0.04, { wave: 'triangle', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !gest) return;
    var r = gestureMove(x, y);
    if (r === 'whiff') game.audio.tone(220, 0.05, { wave: 'triangle', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !gest) return;
    var r = gestureEnd(x, y);
    if (r === 'whiff') game.audio.tone(220, 0.05, { wave: 'triangle', volume: 0.05 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function glow(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2, col, a * 0.18);
    game.draw.circle(x, y, r * 1.4, col, a * 0.35);
    game.draw.circle(x, y, r, col, a);
  }
  function floorY(dz, h) { return HY + (EYE - (h || 0)) * F / dz; }

  // ---- 描画: 疑似3Dの水路 ----
  function drawChannel(cz) {
    var t = game.time.elapsed;
    var base = cz - D0;
    // 天井(横ストリップ、奥ほど圧縮)
    for (var y = 230; y < HY; y += 5) {
      var sc = (HY - y) / CEIL;           // = F / dz
      var dz = F / Math.max(1, sc), z = base + dz;
      var wx = W / 2 - XW * sc;
      var band = Math.floor(z * 1.5) % 2 === 0;
      var rib = (z % 2 + 2) % 2 < 0.12;
      game.draw.rect(Math.max(0, wx), y, W - 2 * Math.max(0, wx), 5, rib ? '#4a7684' : band ? '#1c3640' : '#163038');
    }
    // 床の水面(横ストリップ、流れが手前へ)
    for (var y2 = HY; y2 < 1440; y2 += 4) {
      var sc2 = (y2 - HY) / EYE;
      var dz2 = F / Math.max(1, sc2), z2 = base + dz2;
      var wx2 = W / 2 - XW * sc2;
      var b2 = Math.floor(z2 * 3 + t * 2.2) % 2 === 0;
      game.draw.rect(Math.max(0, wx2), y2, W - 2 * Math.max(0, wx2), 4, b2 ? C.water1 : C.water2);
    }
    // 両側の石壁(縦ストリップ、地平の一点へ収束)
    for (var x = 0; x < W / 2 - 40; x += 6) {
      var s3 = (W / 2 - x) / XW;
      var dz3 = F / s3, z3 = base + dz3;
      var top = HY - CEIL * s3, bot = HY + EYE * s3;
      var c3 = Math.floor(z3 * 2) % 2 === 0 ? C.wall : '#335f6a';
      var y0 = Math.max(230, top), y1 = Math.min(1440, bot);
      if (y1 > y0) {
        game.draw.rect(x, y0, 6, y1 - y0, c3);
        game.draw.rect(W - x - 6, y0, 6, y1 - y0, c3);
        // 壁ぎわの送水管(灰青)
        var py = HY - 0.7 * s3;
        game.draw.rect(x, py - s3 * 0.08, 6, s3 * 0.16, '#7a8a96');
        game.draw.rect(W - x - 6, py - s3 * 0.08, 6, s3 * 0.16, '#7a8a96');
      }
    }
    // 地平の霞(遠くを潰す)
    game.draw.gradient(HY - 60, HY + 60, [[0, 'rgba(36,72,90,0)'], [0.5, C.bg1], [1, 'rgba(36,72,90,0)']]);
    // 天井の灯り(3石ごと)
    for (var k = Math.ceil(base + 0.4); k < base + 14; k++) {
      if (k % 3 !== 0) continue;
      var dzl = k - base;
      var sl = F / dzl;
      glow(W / 2, HY - CEIL * sl, Math.max(4, sl * 0.09), C.yel, 0.5);
    }
    // 壁の小さな吹き出し口が拍ごとに噴く(拍の目印)
    for (var q = Math.ceil(base + 0.5); q < base + 8; q++) {
      var dzq = q - base;
      var sq = F / dzq;
      var hq = (0.25 + beatPulse * 0.5) * sq;
      var yq = HY + EYE * sq;
      game.draw.rect(W / 2 - XW * sq + 2, yq - hq, Math.max(3, sq * 0.1), hq, C.jet, 0.6);
      game.draw.rect(W / 2 + XW * sq - 2 - Math.max(3, sq * 0.1), yq - hq, Math.max(3, sq * 0.1), hq, C.jet, 0.6);
    }
  }

  function drawStone(dz, glowOn) {
    if (dz < 0.45) return;
    var sc = F / dz;
    var cy = floorY(dz);
    var hw = 0.62 * sc, hd = 0.2 * sc;
    for (var k = -3; k <= 3; k++) {
      var f = k / 3.4;
      var w = hw * Math.sqrt(1 - f * f);
      game.draw.rect(W / 2 - w, cy + f * hd - hd / 6, w * 2, hd / 3 + 1, k < 0 ? C.stone : '#9a9a8c');
    }
    game.draw.rect(W / 2 - hw * 0.9, cy + hd * 0.85, hw * 1.8, 0.14 * sc, C.stoneDk);
    if (glowOn) game.draw.rect(W / 2 - hw * 0.7, cy - hd * 0.2, hw * 1.4, hd * 0.4, C.yel, 0.35);
  }

  function jetLevel(g) {
    var lead = g.t - clock;
    var hf;
    if (lead > TELE_T) hf = 0.1;
    else if (lead > 0) hf = 0.1 + 0.9 * (1 - lead / TELE_T);
    else if (lead > -0.35) hf = 1;
    else hf = Math.max(0, 1 + (lead + 0.35) * 3);
    return hf * (1 + beatPulse * 0.05);
  }

  function drawGate(g, dz, front) {
    if (dz < 0.6) return;
    var hf = jetLevel(g);
    if (hf <= 0.01) return;
    var sc = F / dz;
    var by = floorY(dz);
    var flash = hitStop > 0 && hitObj === g;
    var shaped = g.t - clock <= TELE_T;
    var th = shaped ? g.tilt * 0.4 : 0;
    var tn = Math.tan(th);
    var hmax = JET_H * hf;
    var n = 14;
    for (var j = 0; j < n; j++) {
      var h0 = hmax * j / n, h1 = hmax * (j + 1) / n, hm = (h0 + h1) / 2;
      var off = tn * hm;
      var sw = shaped ? SLOT : 0.02;
      var y1 = by - h1 * sc, hh = (h1 - h0) * sc + 1;
      var col = flash ? C.white : (j % 2 ? C.jet : C.jet2);
      var a = front ? 0.45 : 0.85;
      var lx = W / 2 - JET_X * sc, lw = (off - sw + JET_X) * sc;
      var rx = W / 2 + (off + sw) * sc, rw = (JET_X - off - sw) * sc;
      if (lw > 0) game.draw.rect(lx, y1, lw, hh, col, a);
      if (rw > 0) game.draw.rect(rx, y1, rw, hh, col, a);
    }
    // 隙間の縁(次の門は金色に光る)
    if (shaped && !front) {
      var isNext = gates[nextG] === g;
      var ec = isNext ? (Math.abs(g.t - clock) <= GOOD_W ? C.yel : C.white) : C.foam;
      for (var s = -1; s <= 1; s += 2) {
        var xb = W / 2 + s * SLOT * sc, xt = W / 2 + (s * SLOT + tn * hmax) * sc;
        game.draw.line(xb, by, xt, by - hmax * sc, ec, Math.max(3, sc * 0.03));
      }
      // 噴き上がりの白い頭
      game.draw.circle(W / 2 - JET_X * sc * 0.55 + tn * hmax * sc, by - hmax * sc, sc * 0.2, C.white, 0.7);
      game.draw.circle(W / 2 + JET_X * sc * 0.55 + tn * hmax * sc, by - hmax * sc, sc * 0.2, C.white, 0.7);
      // 飛び石の上の輪が縮む(閉じた瞬間がその拍の頭)
      var lead = g.t - clock;
      if (isNext && lead > -GOOD_W) {
        var rr = 0.45 + Math.max(0, lead) / TELE_T * 1.1;
        var m = 24;
        for (var i = 0; i < m; i++) {
          var a0 = i / m * Math.PI * 2, a1 = (i + 1) / m * Math.PI * 2;
          game.draw.line(W / 2 + Math.cos(a0) * rr * sc, by + Math.sin(a0) * rr * sc * 0.3,
            W / 2 + Math.cos(a1) * rr * sc, by + Math.sin(a1) * rr * sc * 0.3, g.sync ? C.pink : C.yel, Math.max(3, sc * 0.025));
        }
      }
    }
  }

  function drawMan() {
    var spr = MAN_BACK, flip = false;
    var p = poseT > 0 ? pose : 'back';
    if (p === 'prep') spr = MAN_BACK;
    else if (p === 0) spr = MAN_SIDE;
    else if (p === -1) spr = MAN_LEAN;
    else if (p === 1) { spr = MAN_LEAN; flip = true; }
    var pal = soakT > 0 ? SOAK_PAL : MAN_PAL;
    var px = 15;
    var hop = 0;
    for (var i = 0; i < gates.length; i++) {
      var k = (clock - gates[i].t) / STEP_T;
      if (k > 0 && k < 1) hop = Math.sin(Math.PI * k) * 40;
    }
    var crouch = p === 'prep' ? 10 : 0;
    var feet = floorY(D0) - hop + crouch;
    game.draw.circle(W / 2, floorY(D0) + 8, 90, C.ink, 0.35);
    game.draw.sprite(spr, pal, W / 2, feet - spr.length * px / 2, px, { anchor: 'center', flipX: flip });
    // ヘルメットの灯り
    glow(W / 2, feet - spr.length * px + 40, 16, C.yel, 0.3);
    if (soakT > 0) {
      for (var d = 0; d < 3; d++) game.draw.sprite(DROP, { k: C.ink, w: C.jet }, W / 2 - 90 + d * 90, feet - 360 - ((soakT * 300 + d * 40) % 80), 6, { anchor: 'center' });
    }
  }

  function drawSplash(dt) {
    for (var i = splash.length - 1; i >= 0; i--) {
      var s = splash[i];
      s.t += dt;
      if (s.t > 0.7) { splash.splice(i, 1); continue; }
      s.vy += 1400 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      game.draw.circle(s.x, s.y, 12 * (1 - s.t), C.jet, 0.85);
    }
  }

  function drawScene(dt) {
    var cz = camZ();
    var base = cz - D0;
    game.draw.gradient(0, H, [[0, C.bg0], [0.33, C.bg1], [1, C.bg0]]);
    drawChannel(cz);
    // 奥から手前へ: 飛び石と水柱
    var far = Math.min(gates.length + 1, Math.ceil(base + 11));
    for (var s = far; s >= Math.max(0, Math.floor(base)); s--) {
      var dz = s - base;
      if (dz <= D0 - 0.05) continue;
      drawStone(dz, false);
      var g = gates[s - 1];
      if (g) drawGate(g, dz, false);
    }
    // 奥の水門(ゴール)
    var goalDz = gates.length + 1.6 - base;
    if (!demoMode && goalDz > 0.8 && goalDz < 16) {
      var gs = F / goalDz, gy = floorY(goalDz);
      game.draw.rect(W / 2 - 1.4 * gs, gy - 2.6 * gs, 2.8 * gs, 2.6 * gs, '#2a3a40');
      for (var r = 0; r < 6; r++) game.draw.rect(W / 2 - 1.3 * gs, gy - 2.4 * gs + r * 0.4 * gs, 2.6 * gs, 0.12 * gs, '#5a7a84');
      glow(W / 2, gy - 2.8 * gs, Math.max(6, gs * 0.16), C.yel, 0.6);
    }
    // 足元の石と自分
    drawStone(D0, false);
    drawMan();
    // くぐっている最中の門は手前に半透明で重ねる
    for (var s2 = Math.max(0, Math.floor(base)); s2 <= Math.ceil(base + D0); s2++) {
      var dz2 = s2 - base;
      var g2 = gates[s2 - 1];
      if (g2 && dz2 <= D0 - 0.05 && dz2 > 0.6) drawGate(g2, dz2, true);
    }
    drawSplash(dt);
  }

  function drawPlates() {
    game.draw.gradient(1440, H, [[0, '#2a3c44'], [1, '#121c22']]);
    game.draw.rect(0, 1440, W, 8, C.foam, 0.5);
    for (var i = 0; i < 3; i++) {
      var x0 = 40 + i * 340, y0 = 1490, w = 320, h = 330;
      var lit = plates[i] > 0;
      game.draw.rect(x0, y0, w, h, lit ? '#3f6f7c' : '#22323a');
      game.draw.rect(x0, y0, w, 8, lit ? C.yel : C.foam, lit ? 0.9 : 0.4);
      game.draw.rect(x0 + 6, y0 + h - 10, w - 12, 10, C.ink, 0.6);
      var spr = i === 1 ? MAN_SIDE : MAN_LEAN;
      game.draw.sprite(spr, MAN_PAL, x0 + w / 2, y0 + 175, 9, { anchor: 'center', flipX: i === 2, alpha: lit ? 1 : 0.7 });
      // はじく向きの矢印
      var ax = x0 + w / 2 + (i - 1) * 70, ay = y0 + 40;
      var bx = x0 + w / 2 + (i - 1) * 20, byy = y0 + 110;
      game.draw.line(bx, byy, ax, ay, C.yel, 8);
      game.draw.circle(ax, ay, 10, C.yel);
    }
  }

  // 8分の物差し(大きいマス=拍の頭、桃色=食い込む門、黄=表の門)
  function drawRuler() {
    var x0 = 300, cw = 90, y = 176;
    var bar = Math.floor(Math.max(0, clock) / (SPB * 4));
    var bt = bar * 4;
    for (var e = 0; e < 8; e++) {
      var head = e % 2 === 0;
      game.draw.rect(x0 + e * cw + 4, y - (head ? 24 : 16), cw - 8, head ? 48 : 32, head ? '#22404c' : '#18303a');
    }
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var rel = g.pos - bt;
      if (rel < 0 || rel >= 4) continue;
      var cx = x0 + rel * 2 * cw + cw / 2;
      var col = g.res === 3 ? '#5a6a70' : g.res ? C.teal : (g.sync ? C.pink : C.yel);
      game.draw.circle(cx, y, g.sync ? 18 : 15, col);
    }
    var ph = Math.max(0, clock) / SPB - bt;
    game.draw.rect(x0 + ph * 2 * cw + cw / 2 - 3, y - 32, 6, 64, C.white, 0.9);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#08141a', 0.92);
    game.draw.rect(0, 224, W, 6, C.foam, 0.5);
    label('SCORE ' + score, 40, 64, 46, C.white, 'left');
    label(passed + ' / ' + gates.length, 40, 140, 36, C.yel, 'left');
    if (combo >= 2) label('x' + combo, 620, 64, 46, C.yel, 'center');
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - nMiss;
      game.draw.circle(860 + i * 70, 64, 26, C.ink);
      game.draw.circle(860 + i * 70, 60, 22, on ? C.white : '#3a4a50');
      game.draw.rect(838 + i * 70, 58, 44, 8, on ? '#ff9a3a' : '#2a3a40');
    }
    glow(250, 176, 14 + beatPulse * 10, C.yel, 0.3 + beatPulse * 0.5);
    drawRuler();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.4;
    game.draw.rect(40, y0, W - 80, hh, '#08141a', 0.9);
    game.draw.rect(60, y0 + 18, W - 120, 5, C.yel, 0.6);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.yel : C.pink);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.white);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.448, 34, C.foam);
    label(passed + ' / ' + gates.length, W / 2, H * 0.495, 52, C.yel);
    label('COMBO ' + maxCombo, W / 2, H * 0.535, 38, C.foam);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.58, 58, C.yel);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.58, 42, C.white);
    if (!won) label('あと' + Math.max(1, gates.length - passed) + '門!', W / 2, H * 0.625, 50, C.pink);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.69, 36, C.white);
  }

  // ---- ATTRACT: 実ロジックで左傾き(表)→まっすぐ(食い込み)→右傾き(表)。偶数周は最後を逆にはじいて浴びる ----
  var demo = { t: 0, cyc: 0, next: 0, x: 540, y: 1660, fl: null, press: false };
  var DEMO_CYC = DEMO_BEATS * SPB + 0.4 + 1.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.next = 0; demo.fl = null; }
    if (hitStop > 0) { hitStop -= dt; return; }
    if (clock < endT + 0.3) stepRun(dt);
    var g = gates[demo.next];
    if (demo.fl) {
      demo.fl.t += dt;
      var k = Math.min(1, demo.fl.t / 0.09);
      demo.x = demo.fl.x0 + demo.fl.dir * 110 * k;
      demo.y = demo.fl.y0 - 120 * k;
      if (gest) gestureMove(demo.x, demo.y);
      if (demo.fl.t > 0.2) { demo.fl = null; demo.press = false; }
    } else {
      demo.x += (540 - demo.x) * Math.min(1, dt * 6);
      demo.y += (1700 - demo.y) * Math.min(1, dt * 6);
    }
    if (g && !g.res && !demo.fl && clock >= g.t - 0.005) {
      var dir = g.tilt;
      if (demo.cyc % 2 === 0 && demo.next === gates.length - 1) dir = -g.tilt || -1;
      gestureStart(demo.x, demo.y);
      demo.fl = { x0: demo.x, y0: demo.y, dir: dir, t: 0 };
      demo.press = true;
      demo.next++;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    poseT = Math.max(0, poseT - dt); soakT = Math.max(0, soakT - dt);
    for (var p = 0; p < 3; p++) plates[p] = Math.max(0, plates[p] - dt);

    if (state === S.ATTRACT) {
      if (!gates) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      drawPlates();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#08141a', 0.92);
      glow(W / 2, 100, 60, C.jet, 0.1 + Math.sin(t * 3) * 0.04);
      label(GAME_TITLE, W / 2, 104, 88, C.jet);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.yel);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.yel);
      else label('TAP TO START', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene(dt);
      drawPlates();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { hitStop = 0; finishRun(nMiss < LIVES); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(hitStop > 0 ? 0 : dt);
    drawPlates();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.4, W, 170, '#08141a', 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 88, 100, C.yel);
    }
    // 最初の門だけ、合う板にゴーストの手を薄く出す
    if (!over && gates.length && !gates[0].res && clock > gates[0].t - 0.8) {
      game.draw.hand(40 + (gates[0].tilt + 1) * 340 + 160, 1660, { press: clock >= gates[0].t - 0.03, scale: 12, alpha: 0.5 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
