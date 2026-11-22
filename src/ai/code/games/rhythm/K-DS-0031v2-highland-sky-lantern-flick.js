// K-DS-0031v2-highland-sky-lantern-flick.js
// 星祭りの天灯弾き — 対岸の合図灯が裏拍でぱっと光る瞬間に、手の上の紙の天灯を上へ弾き、弾いた勢いの分だけ夜空の奥へ打ち上げる
// 操作: 画面のどこでも押して上へ素早く払い、指を離した瞬間に天灯が飛ぶ。払いの速さ(勢い)がそのまま上がる高さになり、空の帯(星の川)に届く勢いならBONUS。太鼓は表拍、合図灯は裏拍(太鼓と太鼓の間)で光る。打ち上げる裏拍は合図灯に金の輪が縮んでいって重なる瞬間(0.6秒前から予告)。離した時刻の裏拍の頭からのずれでPERFECT/GOOD。ずれすぎ・勢い不足(湖へふわりと落ちる)・見送りはMISS。払わずに押して離しただけなら何も起きない
// 終わり: 7小節(約17秒・天灯14個)を打ち上げ終えればCLEAR(判定点+高さ+星の川BONUS+連続+残り)。MISS3回でGAME OVER。後半は裏拍が2つ3つ続けて来る
// @mechanic: flick_launch
// @theme: highland_star_festival_lantern
// 世界観: 高原の湖のほとりの星祭りの夜、村の若者が対岸の合図灯の裏拍に合わせて紙の天灯を手から弾き上げ、夜空の星の川へ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち上げた数・星の川に届いた数・PERFECT数・スコア
// スタイル: 2000s BILLBOARD 3D
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板(sprite)のまま距離でpxを変え、真下に楕円の影/映りを置く。遠いものほど彩度を落とす
  var STYLE = { bg: ['#070b24', '#2a2150', '#5a3a6a'], main: ['#ffb050', '#e07a2a', '#3a7a6a'], accent: ['#ffe68a', '#a8c8ff'] };
  var SKY0 = STYLE.bg[0], SKY1 = STYLE.bg[1], SKY2 = STYLE.bg[2];
  var PAPER = STYLE.main[0], EDGE_C = STYLE.main[1], GRASS = STYLE.main[2];
  var GOLD = STYLE.accent[0], STARC = STYLE.accent[1];
  var INK = '#05060f', LAKE0 = '#141a3a', LAKE1 = '#0a0e24', MOUNT_F = '#2a2a4c', MOUNT_N = '#1c1c38', BANK = '#101226', MISSC = '#ff6a7a', WHITE = '#fffaf0';

  var GAME_TITLE = 'STAR LANTERN';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SONG_BEATS = 28;                      // 0小節目はカウント + 6小節
  var TIME_LIMIT = 16.8;
  var PERF = 0.06, GOODW = 0.13, EDGE = 0.26;
  var LIVES = 3;
  var CUE = 0.6;                            // 金の輪の予告(秒)
  // 打ち上げる裏拍(拍の位置 + 0.5)
  var CHART = [5.5, 7.5, 9.5, 11.5, 12.5, 14.5, 16.5, 18.5, 20.5, 21.5, 23.5, 24.5, 25.5, 26.5];
  // デモ: [裏拍, ゴーストが離す差(拍), 勢い]。3つ目は表拍で離して早すぎMISS
  var DEMO_CHART = [[5.5, 0, 0.82], [7.5, 0, 0.5], [9.5, -0.5, 0.6]];
  var DEMO_BEATS = 12;
  var RIVER_LO = 0.68, RIVER_HI = 0.96;    // 星の川の高さ(勢い)

  // 疑似3D: 地平線・焦点距離・目の高さ
  var HY = 860, FOC = 2150, EYE = 1.6;
  var HAND_X = 540, HAND_Y = H * 0.69;      // 手の上の天灯
  var Z0 = 4;
  var Y0 = EYE - (HAND_Y - HY) * Z0 / FOC;
  var LAMP_X = 5, LAMP_Z = 42, LAMP_Y = 3;
  var NEAR_SHORE = H * 0.73;

  // 祭囃子(独自の旋律・ト長調ペンタ)。小節頭で1小節ずつ。裏拍に音を置いて合図灯と揃える
  var PHRASES = [
    [['R', 0.5], ['G5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['B5', 0.5], ['D6', 1]],
    [['R', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 0.5], ['D5', 1]],
    [['R', 0.5], ['D5', 0.5], ['R', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['B5', 1]],
    [['R', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.5], ['G5', 1]]
  ];
  var BASSES = [
    [['G2', 1], ['G2', 1], ['D3', 1], ['G2', 1]],
    [['E2', 1], ['E2', 1], ['B2', 1], ['D3', 1]],
    [['C3', 1], ['C3', 1], ['G2', 1], ['D3', 1]],
    [['G2', 1], ['D3', 1], ['G2', 1], ['G2', 1]]
  ];

  var LANTERN = ['.oooo.', 'oOOOOo', 'oOyyOo', 'oOyyOo', 'oOOOOo', '.oooo.', '..ff..'];
  var LPAL = [
    { o: EDGE_C, O: PAPER, y: '#fff0a8', f: GOLD },
    { o: '#c08060', O: '#e8b890', y: '#f8ecc8', f: '#f0e0a0' },
    { o: '#9a8aa0', O: '#c8b8c8', y: '#ece4e8', f: '#e0d8d0' }
  ];
  var DIM_PAL = { o: '#3a3040', O: '#5a4a50', y: '#6a5a58', f: '#4a4040' };
  var WHITE_PAL = { o: WHITE, O: WHITE, y: WHITE, f: WHITE };
  // 若者(後ろ姿)。0=天灯を構える 1=弾き上げた 2=手を下ろす
  var YOUTH = [
    ['..aa....aa..', '..aa....aa..', '...a....a...', '...a....a...', '...a.hh.a...', '...ahhhha...', '...hhhhhh...', '....hhhh....', '...jjjjjj...', '..jjjjjjjj..', '..jjjjjjjj..', '..jjbbbbjj..', '..jjjjjjjj..', '...pppppp...', '...pp..pp...', '...pp..pp...', '...pp..pp...', '..kkk..kkk..'],
    ['.aa......aa.', '..a......a..', '..aa....aa..', '...a....a...', '...a.hh.a...', '...ahhhha...', '...hhhhhh...', '....hhhh....', '...jjjjjj...', '..jjjjjjjj..', '..jjjjjjjj..', '..jjbbbbjj..', '..jjjjjjjj..', '...pppppp...', '...pp..pp...', '...pp..pp...', '...pp..pp...', '..kkk..kkk..'],
    ['............', '............', '............', '............', '.....hh.....', '....hhhh....', '...hhhhhh...', '....hhhh....', '...jjjjjj...', '.ajjjjjjjja.', '.ajjjjjjjja.', '.ajjbbbbjja.', '..jjjjjjjj..', '...pppppp...', '...pp..pp...', '...pp..pp...', '...pp..pp...', '..kkk..kkk..']
  ];
  var YOUTH_PAL = { a: '#e0b088', h: '#2a1c18', j: '#3a5a8a', b: GOLD, p: '#2a2a3a', k: '#151520' };
  var KEEPER = ['..l...', '.lll..', '..l...', '..p.hh', '..p.hh', '..pjjj', '..pjjj', '..p.jj', '..p.kk'];
  var KEEPER_PAL = { l: GOLD, p: '#6a6070', h: '#4a4458', j: '#5a5a7a', k: '#3a3a4a' };
  var KEEPER_OFF = { l: '#5a5060', p: '#6a6070', h: '#4a4458', j: '#5a5a7a', k: '#3a3a4a' };
  var OVAL = ['..oooooo..', 'oooooooooo', '..oooooo..'];
  var SHADOW_PAL = { o: INK };
  var GLINT_PAL = { o: GOLD };

  // 星(決め打ちの擬似乱数で配置)
  var STARS = [];
  for (var si = 0; si < 90; si++) {
    var hx = Math.abs(Math.sin(si * 12.9898) * 43758.5453) % 1, hy = Math.abs(Math.sin(si * 78.233) * 12345.678) % 1;
    STARS.push([hx * W, 240 + hy * 560, 1 + (si % 3), si * 0.7]);
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltL, over, won, endT, prevBest, sent, flick;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function proj(X, Y, Z) { var k = FOC / Z; return { x: 540 + X * k, y: HY + (EYE - Y) * k, k: k }; }
  function ring(x, y, r, col, w) {
    for (var i = 0; i < 24; i++) {
      var a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }
  function riverY(h) { return HY - 60 - h * 480; }

  function newRun(chart, demo) {
    var tg = [];
    for (var i = 0; i < chart.length; i++) {
      var c = demo ? chart[i] : [chart[i]];
      tg.push({ b: c[0], t: c[0] * SPB, off: c[1] || 0, pw: c[2] || 0, res: '' });
    }
    return {
      demo: demo, tg: tg, beats: demo ? DEMO_BEATS : SONG_BEATS, t: 0, lastH: -1, lastBar: 0, half: -1, beatF: 0, offF: 0, cueF: 0,
      lanterns: [], inHand: true, handT: 0, lift: 0, pose: 0, poseT: 0, frz: 0, frzL: null,
      launched: 0, river: 0, perf: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, mile: false
    };
  }
  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltL = null; over = false; won = false; endT = 0; sent = false; flick = null;
    prevBest = game.best || 0;
  }
  function isTarget(r, b) { for (var i = 0; i < r.tg.length; i++) if (Math.abs(r.tg[i].b - b) < 0.01) return r.tg[i]; return null; }

  // ── 拍クロック(1本)。半拍ごとに表(太鼓)と裏(合図灯)を刻む ──
  function playBar(bar) {
    var i = (bar - 1) % PHRASES.length;
    game.audio.melody(PHRASES[i], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: BASSES[i], bassWave: 'triangle', bassVolume: 0.1 });
  }
  function onHalf(r, hIdx, loud) {
    r.half = hIdx;
    var b = hIdx / 2;
    if (hIdx % 2 === 0) {
      r.beatF = 0.16;
      if (loud) game.audio.tone(hIdx % 8 === 0 ? 75 : 95, 0.12, { wave: 'triangle', volume: 0.16, slide: -30 });
    } else {
      var tg = isTarget(r, b);
      r.offF = 0.2;
      if (tg) r.cueF = 0.3;
      if (loud) game.audio.tone(tg ? 2093 : 1568, 0.03, { wave: 'square', volume: tg ? 0.05 : 0.025 });
    }
  }

  function launch(r, power, loud) {
    r.inHand = false; r.handT = 0.2; r.lift = 0; r.pose = 1; r.poseT = 0.35;
    var tg = null, bd = 99;
    for (var i = 0; i < r.tg.length; i++) {
      var c = r.tg[i];
      if (c.res !== '') continue;
      var d = Math.abs(r.t - c.t);
      if (d < bd) { bd = d; tg = c; }
    }
    var idx = r.lanterns.length;
    var L = { t0: r.t, X: 0, Y: Y0, Z: Z0, X0: (idx % 2 ? 0.6 : -0.6), Y0: Y0, Z0: Z0, Xf: 0, Yf: 0, Zf: 0, h: 0, ok: false, frz: 0, fin: false, phase: idx * 1.3 };
    r.lanterns.push(L);
    var p = Math.max(0, Math.min(1.1, power));
    var off = tg ? r.t - tg.t : 99;
    if (!tg || Math.abs(off) > GOODW || p < 0.3) {
      L.ok = false; L.frz = 0.35;
      if (tg && Math.abs(off) <= 0.6 * SPB) tg.res = 'miss';
      missOne(r, L, loud);
      return;
    }
    var perfect = Math.abs(off) <= PERF;
    tg.res = 'hit';
    L.ok = true; L.h = p;
    var Zf = 30 + p * 30, sy = riverY(p);
    L.Zf = Zf; L.Yf = EYE + (HY - sy) * Zf / FOC;
    L.Xf = (((idx * 7) % 11) - 5) * 1.6;
    r.launched++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perf++; else r.good++;
    var inRiver = p >= RIVER_LO && p <= RIVER_HI;
    r.score += (perfect ? 200 : 100) + Math.round(p * 80) + r.combo * 20 + (inRiver ? 150 : 0);
    game.feedback.good(HAND_X, HAND_Y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : PAPER, count: perfect ? 16 : 10, volume: loud ? 0.35 : 0 });
    if (loud) game.audio.tone(330 + p * 500, 0.35, { wave: 'triangle', volume: 0.06, slide: 500 });
    if (inRiver) { r.river++; L.river = true; }
    if (!r.demo && r.launched === 5 && !r.mile) {
      r.mile = true;
      game.fx.popup('NICE!', W / 2, H * 0.47, { color: GOLD, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missOne(r, L, loud) {
    r.miss++; r.combo = 0; r.pose = 2; r.poseT = 0.5;
    if (loud) game.audio.tone(200, 0.3, { wave: 'triangle', volume: 0.07, slide: -120 });
    if (!r.demo && r.miss >= LIVES) { L.fin = true; halt = 0.5; haltL = L; }
  }

  function stepRun(r, dt, loud) {
    r.t += dt;
    var t = r.t;
    var hIdx = Math.floor(t / (SPB / 2));
    if (hIdx > r.lastH) { r.lastH = hIdx; onHalf(r, hIdx, loud); }
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb >= 1 && nb * 4 < r.beats) playBar(nb); }
    // 見送った裏拍: 手の天灯がしぼんでMISS(天灯は手に残る)
    for (var i = 0; i < r.tg.length; i++) {
      var c = r.tg[i];
      if (c.res === '' && t > c.t + EDGE) {
        c.res = 'miss';
        var L = { t0: t, X: 0, Y: Y0, Z: Z0, X0: 0, Y0: Y0, Z0: Z0, ok: false, frz: 0.35, fin: false, ghost: true, phase: 0 };
        r.lanterns.push(L);
        missOne(r, L, loud);
      }
    }
    for (var j = 0; j < r.lanterns.length; j++) {
      var l = r.lanterns[j];
      if (!l.ok && l.frz > 0 && !l.fin) {
        l.frz -= dt;
        if (l.frz <= 0) game.feedback.bad(HAND_X, HAND_Y - 80, { text: 'MISS', volume: loud ? 0.4 : 0, shake: r.demo ? 4 : 10, flashColor: MISSC });
        continue;
      }
      if (l.ghost) continue;
      var u = (t - l.t0);
      if (l.ok) {
        var e = 1 - Math.pow(1 - Math.min(1, u / 2.4), 3);
        l.X = l.X0 + (l.Xf - l.X0) * e + Math.sin(t * 0.8 + l.phase) * 0.3;
        l.Z = l.Z0 + (l.Zf - l.Z0) * e;
        l.Y = l.Y0 + (l.Yf - l.Y0) * e + Math.max(0, u - 2.4) * 0.12;
      } else {
        // 勢いが足りない/拍外れ: 少し浮いて湖へふわりと降り、水面に浮かぶ
        var w = Math.max(0, u - 0.35);
        l.X = l.X0 + w * 0.8;
        l.Z = l.Z0 + Math.min(1, w / 1.6) * 5;
        l.Y = Math.max(0.05, l.Y0 + Math.min(0.5, w * 2) - Math.max(0, w - 0.25) * 0.9);
      }
    }
    if (!r.inHand) { r.handT -= dt; if (r.handT <= 0) { r.inHand = true; if (loud) game.audio.tone(880, 0.04, { wave: 'triangle', volume: 0.04 }); } }
    if (r.beatF > 0) r.beatF -= dt;
    if (r.offF > 0) r.offF -= dt;
    if (r.cueF > 0) r.cueF -= dt;
    if (r.poseT > 0) { r.poseT -= dt; if (r.poseT <= 0) r.pose = 0; }
  }

  function allDone(r) { for (var i = 0; i < r.tg.length; i++) if (r.tg[i].res === '') return false; return true; }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) run.score += (LIVES - run.miss) * 200;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }
  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { launched: run.launched, total: CHART.length, starRiver: run.river, perfect: run.perf, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押して上へ払い、離した瞬間に弾く ──
  game.onPress(function (x, y, id) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0 || !run.inHand) { game.audio.tone(300, 0.03, { wave: 'square', volume: 0.03 }); flick = null; return; }
    flick = { id: id, x0: x, y0: y, t0: game.time.elapsed, pts: [[x, y, game.time.elapsed]] };
    game.fx.burst(HAND_X, HAND_Y + 30, { color: PAPER, count: 3, speed: 60 });
  });
  game.onMove(function (x, y, id) {
    if (!flick || flick.id !== id || state !== S.PLAYING) return;
    flick.pts.push([x, y, game.time.elapsed]);
    if (flick.pts.length > 12) flick.pts.shift();
    run.lift = Math.max(0, Math.min(110, (flick.y0 - y) * 0.4));
    if (run.lift > 60) game.fx.burst(HAND_X, HAND_Y - run.lift, { color: GOLD, count: 1, speed: 40 });
  });
  game.onRelease(function (x, y, id) {
    if (!flick || flick.id !== id) return;
    var f = flick;
    flick = null;
    run.lift = 0;
    if (state !== S.PLAYING || over || halt > 0 || !run.inHand) return;
    var now = game.time.elapsed;
    var up = f.y0 - y;
    if (up < 40) { game.audio.tone(420, 0.05, { wave: 'triangle', volume: 0.04 }); return; }
    // 勢い = 最後の0.12秒ぶんの上向きの速さ(短い払いは全体で測る)
    var ref = f.pts[0];
    for (var i = f.pts.length - 1; i >= 0; i--) { if (now - f.pts[i][2] >= 0.12) { ref = f.pts[i]; break; } }
    var dtm = Math.max(0.05, now - ref[2]);
    var v = (ref[1] - y) / dtm;
    launch(run, 0.3 + (v - 700) / 3000, true);
  });
  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 裏拍で強く弾いて星の川へ / 弱めに弾いて低く / 表拍で弾いて早すぎMISS ──
  var demo = { t: 0, run: null, hy: HAND_Y + 140, press: false, fired: {} };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) { demo.run = newRun(DEMO_CHART, true); demo.fired = {}; }
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var ty = HAND_Y + 160, press = false;
    for (var i = 0; i < r.tg.length; i++) {
      var c = r.tg[i];
      var rel = c.t + c.off * SPB;
      if (r.t >= rel - 0.16 && r.t < rel) { press = true; ty = HAND_Y + 160 - ((r.t - (rel - 0.16)) / 0.16) * 260; r.lift = (HAND_Y + 160 - ty) * 0.35; }
      if (!demo.fired[i] && r.t >= rel && r.inHand) { demo.fired[i] = true; launch(r, c.pw, audioOk); ty = HAND_Y - 100; }
    }
    demo.press = press;
    demo.hy += (ty - demo.hy) * Math.min(1, dt * (press ? 40 : 6));
  }

  // ── 描画 ──
  function drawWorld(r, tt) {
    game.draw.gradient(0, NEAR_SHORE, [[0, SKY0], [0.35, SKY1], [0.6, SKY2], [0.62, LAKE0], [1, LAKE1]]);
    // 星と星の川(届くと BONUS の高さの帯)
    var ry0 = riverY(RIVER_HI), ry1 = riverY(RIVER_LO);
    game.draw.gradient(ry0 - 30, ry1 + 30, [[0, 'rgba(168,200,255,0)'], [0.5, 'rgba(168,200,255,0.2)'], [1, 'rgba(168,200,255,0)']]);
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      var tw = 0.45 + 0.45 * Math.sin(tt * 2 + s[3]);
      game.draw.rect(s[0], s[1], s[2] * 2, s[2] * 2, STARC, tw);
    }
    for (var d = 0; d < 40; d++) {
      var dx = (d * 131) % W, dy = ry0 + ((d * 53) % Math.max(1, (ry1 - ry0)));
      game.draw.rect(dx, dy, 3, 3, WHITE, 0.35 + 0.3 * Math.sin(tt * 3 + d));
    }
    // 山(奥ほど彩度を落とす。縦ストリップで稜線)
    for (var m = 0; m < W; m += 10) {
      var h1 = 70 + Math.sin(m * 0.006 + 1) * 40 + Math.sin(m * 0.019) * 18;
      game.draw.rect(m, HY - h1, 10, h1 + 2, MOUNT_F);
    }
    for (var n = 0; n < W; n += 10) {
      var h2 = 34 + Math.sin(n * 0.011 + 3) * 24 + Math.sin(n * 0.031) * 8;
      game.draw.rect(n, HY + 40 - h2, 10, h2 + 2, MOUNT_N);
    }
    // 対岸(村の灯、合図灯の番人)
    var shore = proj(0, 0, LAMP_Z).y;
    game.draw.rect(0, HY + 30, W, shore - HY - 26, BANK);
    for (var v = 0; v < 9; v++) {
      var vx = 80 + v * 110 + (v % 2) * 30;
      game.draw.rect(vx, shore - 14 - (v % 3) * 6, 8, 8, '#d8c890', 0.5 + 0.3 * Math.sin(tt * 1.3 + v));
    }
    var lp = proj(LAMP_X, LAMP_Y, LAMP_Z);
    var foot = proj(LAMP_X, 0, LAMP_Z);
    game.draw.sprite(OVAL, SHADOW_PAL, foot.x, foot.y + 2, 3, { anchor: 'center', alpha: 0.6 });
    game.draw.sprite(KEEPER, r.offF > 0 ? KEEPER_PAL : KEEPER_OFF, foot.x + 22, foot.y - 30, 7, { anchor: 'center' });
    game.draw.line(lp.x, lp.y + 6, lp.x, foot.y, '#6a6078', 5);
    // 合図灯: 裏拍ごとに小さく光り、打ち上げる裏拍は大きく金に光る。0.6秒前から金の輪が縮んで重なる
    var lit = r.offF > 0 ? r.offF / 0.2 : 0;
    var big = r.cueF > 0 ? r.cueF / 0.3 : 0;
    game.draw.circle(lp.x, lp.y, 18, '#6a5848');
    if (lit > 0) { game.draw.circle(lp.x, lp.y, 40 * lit + 14, GOLD, 0.25 * lit); game.draw.circle(lp.x, lp.y, 18, GOLD, lit); }
    if (big > 0) { game.draw.circle(lp.x, lp.y, 110 * big + 24, GOLD, 0.22 * big); game.draw.circle(lp.x, lp.y, 28, WHITE, big); }
    for (var q = 0; q < r.tg.length; q++) {
      var c = r.tg[q];
      var until = c.t - r.t;
      if (c.res === '' && until > 0 && until <= CUE) {
        var rr = 30 + (until / CUE) * 160;
        ring(lp.x, lp.y, rr, GOLD, 5);
        ring(lp.x, lp.y, rr + 8, GOLD, 2);
      }
    }
    // 湖面: 奥ほど詰まるさざ波 + 合図灯の映り
    var sh = (tt * 0.25) % 1;
    for (var k = 0; k < 16; k++) {
      var z = 6 * Math.pow(1.16, k + sh);
      if (z > LAMP_Z) continue;
      var wy = proj(0, 0, z).y;
      if (wy > NEAR_SHORE) continue;
      game.draw.rect(0, wy, W, 2, '#2a3468', 0.5);
    }
    for (var g = 0; g < 7; g++) game.draw.rect(lp.x - 10 + Math.sin(tt * 3 + g) * 6, shore + 8 + g * 22, 20, 6, GOLD, (0.15 + 0.35 * lit) * (1 - g / 8));
  }

  function drawLanterns(r, tt) {
    var list = r.lanterns.slice().sort(function (a, b) { return b.Z - a.Z; });
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      if (l.ghost) {
        if (l.frz > 0) { game.draw.circle(HAND_X, HAND_Y, 110, WHITE, 0.35); game.draw.sprite(LANTERN, WHITE_PAL, HAND_X, HAND_Y, 22, { anchor: 'center' }); }
        continue;
      }
      var p = proj(l.X, l.Y, l.Z);
      var g = proj(l.X, 0, Math.max(l.Z, 6.2));
      var px = Math.max(1.2, 4.6 * p.k / 100);
      // 真下の楕円: 湖面の映り(遠いほど小さく薄い)
      if (g.y < NEAR_SHORE + 40) game.draw.sprite(OVAL, l.ok ? GLINT_PAL : SHADOW_PAL, g.x, g.y, Math.max(1, px * 0.8), { anchor: 'center', alpha: l.ok ? 0.35 : 0.5 });
      if (!l.ok && l.frz > 0) {
        game.draw.circle(p.x, p.y, 120, WHITE, 0.35);
        game.draw.sprite(LANTERN, WHITE_PAL, p.x, p.y, px * 1.5, { anchor: 'center' });
        continue;
      }
      var tier = l.Z < 14 ? 0 : l.Z < 36 ? 1 : 2;
      var pal = l.ok ? LPAL[tier] : DIM_PAL;
      if (l.ok) game.draw.circle(p.x, p.y, px * 7, GOLD, 0.16 + 0.06 * Math.sin(tt * 5 + l.phase));
      game.draw.sprite(LANTERN, pal, p.x, p.y, px, { anchor: 'center' });
      if (l.river) game.draw.circle(p.x, p.y, px * 3, WHITE, 0.25 + 0.2 * Math.sin(tt * 6 + l.phase));
    }
  }

  function drawNear(r, tt) {
    game.draw.gradient(NEAR_SHORE, H, [[0, '#14261e'], [1, '#081008']]);
    for (var b = 0; b < 40; b++) {
      var bx = (b * 97) % W, by = NEAR_SHORE + 20 + (b * 61) % 360;
      game.draw.line(bx, by, bx + Math.sin(tt * 1.5 + b) * 8, by - 26, GRASS, 4);
    }
    // 若者と足元の影
    game.draw.sprite(OVAL, SHADOW_PAL, HAND_X, H * 0.955, 26, { anchor: 'center', alpha: 0.55 });
    game.draw.sprite(YOUTH[r.pose], YOUTH_PAL, HAND_X, H * 0.835, 20, { anchor: 'center' });
    // 手の上の天灯(押して上へ払うと持ち上がる)
    if (r.inHand) {
      var ly = HAND_Y - r.lift + Math.sin(tt * 2.4) * 4;
      game.draw.circle(HAND_X, ly, 90, GOLD, 0.12 + 0.05 * Math.sin(tt * 4));
      game.draw.sprite(LANTERN, LPAL[0], HAND_X, ly, 22, { anchor: 'center' });
    }
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.115, INK, 0.65);
    txt(String(r.score), 40, 66, 52, GOLD, 'left');
    txt(r.launched + ' / ' + r.tg.length, W / 2, 66, 44, PAPER);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 70, alive = i < LIVES - r.miss;
      game.draw.sprite(LANTERN, alive ? LPAL[0] : DIM_PAL, lx, 66, 6, { anchor: 'center' });
    }
    // 8つのコマ: 太鼓(表)と合図灯(裏)。打ち上げる裏拍は金の印
    var hIdx = r.half;
    var barH = hIdx >= 0 ? Math.floor(hIdx / 8) : 0;
    for (var k = 0; k < 8; k++) {
      var x = W * 0.16 + k * W * 0.097, y = 172;
      var isOff = k % 2 === 1;
      var on = hIdx >= 0 && hIdx % 8 === k && (isOff ? r.offF > 0 : r.beatF > 0);
      var tgt = isOff && isTarget(r, barH * 4 + (k - 1) / 2 + 0.5);
      if (isOff) {
        game.draw.circle(x, y, 18, '#2a2440');
        if (tgt) game.draw.circle(x, y, 12, GOLD, 0.6);
        if (on) game.draw.circle(x, y, 16, tgt ? WHITE : GOLD);
      } else {
        game.draw.rect(x - 20, y - 12, 40, 24, '#2a2440');
        if (on) game.draw.rect(x - 16, y - 8, 32, 16, k === 0 ? MISSC : PAPER);
      }
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.82, H * 0.6, 48, GOLD);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.47, 110, won ? GOLD : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.22, W - 160, H * 0.34, INK, 0.82);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 100, won ? GOLD : MISSC);
    txt(run.launched + ' / ' + CHART.length, W / 2, H * 0.33, 62, PAPER);
    txt('SCORE ' + run.score, W / 2, H * 0.385, 52, GOLD);
    txt('PERFECT ' + run.perf, W * 0.38, H * 0.43, 40, PAPER);
    game.draw.gradient(H * 0.415, H * 0.445, [[0, 'rgba(168,200,255,0)'], [0.5, 'rgba(168,200,255,0.25)'], [1, 'rgba(168,200,255,0)']]);
    game.draw.sprite(LANTERN, LPAL[0], W * 0.66, H * 0.43, 6, { anchor: 'center' });
    txt('x' + run.river, W * 0.76, H * 0.43, 40, STARC);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.48, 56, GOLD);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 44, PAPER);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.tg.length; i++) if (run.tg[i].res !== 'hit') left++;
      txt('あと' + left + '個!', W / 2, H * 0.53, 50, PAPER);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, PAPER);
  }

  game.onUpdate(function (dt) {
    if (dt > 0.1) dt = 0.1;
    var tt = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(demo.run, tt);
      drawLanterns(demo.run, tt);
      drawNear(demo.run, tt);
      game.draw.rect(0, 0, W, H * 0.115, INK, 0.65);
      txt(GAME_TITLE, W / 2, 86, 90, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 172, 40, PAPER);
      game.draw.hand(HAND_X + 40, demo.hy, { press: demo.press, scale: 16 });
      if (Math.floor(tt * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, GOLD);
      else txt('TAP TO START', W / 2, H * 0.965, 44, PAPER);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(HAND_X, HAND_Y - 80, { text: 'MISS', flashColor: MISSC });
          haltL.frz = 0; haltL.fin = false;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        var lastT = run.tg[run.tg.length - 1].t;
        if ((allDone(run) && run.t > lastT + 0.6) || run.t > TIME_LIMIT + 0.4) finish(run.miss < LIVES);
      }
    }

    drawWorld(run, tt);
    drawLanterns(run, tt);
    drawNear(run, tt);
    drawHud(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 120, GOLD);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
