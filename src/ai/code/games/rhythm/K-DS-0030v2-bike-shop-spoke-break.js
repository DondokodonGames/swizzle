// K-DS-0030v2-bike-shop-spoke-break.js
// 自転車屋のスポーク締め — 光点が拍ごとに最良点の星へ近づく間ドライバーを回して溜め、星に届く拍の頭でちょうど離して一気に締める。レコードの針が浮いて音が抜ける小節も拍を保つ
// 操作: 画面のどこでも押し続けるとドライバーが回って溜まる(右の溜め柱: 下の線を越えれば締められる、上の線まで溜めるとPERFECTが出せる)。上のゲージの光点が拍ごとに1つずつ右端の星へ進むので、星に届く拍の頭で指を離す。ずれでPERFECT/GOOD。早離し・溜め不足・星を過ぎても押しっぱなし(締めすぎ)・押し忘れはMISS。光点が出ていない間の空回しは罰なし
// 終わり: 8小節(約15秒・スポーク6本)を締め終えればCLEAR(判定点+連続+音が抜けた小節の倍点+残り)。MISS3回でGAME OVER。4小節目と7小節目は棚のレコードの針が浮いて伴奏・拍ランプ・光点が消える(直前の1拍半でアームが赤く震えて雑音で予告)。5本目は硬いスポークで光点が6拍かけて進む
// @mechanic: hold_charge
// @theme: bike_shop_spoke_truing
// 世界観: 町の自転車屋の作業場で、修理工が振れ取り台に掛けた車輪のスポークのネジを、棚のレコードの拍に合わせてドライバーで一本ずつ締め上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 締めたスポーク数・音が抜けた小節で締めた数・PERFECT数・スコア
// スタイル: PIXEL HD
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色 + 光。左上の吊りランプを唯一の光源にして陰影をそろえ、背景は3層のパララックス
  var STYLE = { bg: ['#140f1a', '#3a2a30'], main: ['#e2a454', '#78b4c8', '#c4473c'], accent: ['#ffe38c', '#86e2a8'] };
  var BG0 = STYLE.bg[0], BG1 = STYLE.bg[1];
  var BRASS = STYLE.main[0], STEEL = STYLE.main[1], RED = STYLE.main[2];
  var LAMP = STYLE.accent[0], MINT = STYLE.accent[1];
  var INK = '#0b0810', WALL = '#2a2028', PEG = '#3b2d34', PEG_H = '#4c3a40', WOOD_D = '#3e271c', WOOD_M = '#6a4430', WOOD_L = '#92603e';
  var RIM_D = '#5c6a74', RIM_M = '#a8b8c2', RIM_L = '#eef6fa', MISSC = '#ff5a4e', WHITE = '#fff8ec', DUSK0 = '#f0905a', DUSK1 = '#5a3c6e';

  var GAME_TITLE = 'SPOKE TUNE';
  var BPM = 128;
  var SPB = 60 / BPM;
  var SONG_BEATS = 32;                       // 0小節目はカウント、1〜7小節で6本
  var TIME_LIMIT = SONG_BEATS * SPB;         // 約15秒
  var BREAKS = [3, 6];                       // 針が浮いて音が抜ける小節
  // [光点が出る拍, 星に届くまでの拍数]
  var CHART = [[4, 3], [8, 3], [12, 3], [16, 3], [20, 6], [28, 3]];
  // デモ: [出る拍, 拍数, 押す拍(星の拍からの差), 離す拍の差]
  var DEMO_CHART = [[4, 3, -2, 0], [8, 3, -2, 0], [12, 3, -2, -0.7]];
  var DEMO_BREAKS = [2];
  var DEMO_BEATS = 16;
  var PERF = 0.07, GOODW = 0.15, EDGE = 0.26;
  var MIN_HOLD = 1.0 * SPB, FULL_HOLD = 1.8 * SPB;
  var LIVES = 3;
  var NSPOKE = 16;
  var WX = W * 0.5, WY = H * 0.455, WR = 318;
  var NIP_Y = WY + WR;
  var GY = H * 0.175, GX0 = 150, GX1 = W - 150;
  var HANDLE_Y = H * 0.79;
  var MET_X = W * 0.885, MET_Y0 = H * 0.80, MET_H = H * 0.2;

  // 伴奏(独自の旋律・ニ長調)。小節頭で1小節ずつ鳴らし、拍クロックと揃える
  var PHRASES = [
    [['D5', 0.5], ['F#5', 0.5], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['E5', 1]],
    [['F#5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1], ['A4', 1]],
    [['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['F#5', 1], ['E5', 1]],
    [['A4', 0.5], ['D5', 0.5], ['F#5', 0.5], ['E5', 0.5], ['D5', 2]]
  ];
  var BASSES = [
    [['D3', 1], ['A2', 1], ['D3', 1], ['A2', 1]],
    [['B2', 1], ['F#2', 1], ['G2', 1], ['A2', 1]],
    [['G2', 1], ['D3', 1], ['A2', 1], ['E3', 1]],
    [['D3', 1], ['A2', 1], ['D2', 2]]
  ];
  var STEP_NOTES = ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'];

  // 修理工(胸から上)。0=ふつう 1=まばたき 2=集中 3=うれしい 4=しまった
  var MECH_BASE = [
    '....cccccc....',
    '...cccccccc...',
    '..cccccccccvv.',
    '...hhssssss...',
    '...hsssesss...',
    '...ssssssss...',
    '....sssmss....',
    '.....ssss.....',
    '...oooooooo...',
    '..owwoooowwo..',
    '.oowwoooowwoo.',
    '.oooooooooooo.',
    '.ooooobbooooo.',
    '.oooooooooooo.'
  ];
  function mechVariant(r4, r6, extra) {
    var f = MECH_BASE.slice();
    f[4] = r4; f[6] = r6;
    if (extra) f[3] = extra;
    return f;
  }
  var MECH = [
    MECH_BASE,
    mechVariant('...hssssssss..', '....sssmss....'),
    mechVariant('...hsssEsss...', '....ssmmms....'),
    mechVariant('...hssseess...', '....smmmms....'),
    mechVariant('...hsssesss...', '.....smms.....', '...hhssssssd..')
  ];
  var MECH_PAL = { c: '#2f5a7a', v: '#1d3a52', h: '#5a3a28', s: '#f0c49a', e: INK, E: '#3a2418', m: '#a0503c', o: '#3d6c8c', w: '#e8e0d0', b: BRASS, d: '#8fd0ff' };
  // 棚のレコードプレーヤー(盤が回る2コマ + 針が浮いた1コマ)
  var PLAYER = [
    ['............', '.........aa.', '..dddddd..a.', '.ddlldddd.a.', '.ddddddddaa.', 'kkkkkkkkkkkk', 'kgkkkkkkkkgk', '.k........k.'],
    ['............', '.........aa.', '..dddddd..a.', '.dddddlld.a.', '.ddddddddaa.', 'kkkkkkkkkkkk', 'kgkkkkkkkkgk', '.k........k.'],
    ['.........aa.', '.........a..', '..dddddd.a..', '.ddlldddd...', '.dddddddd...', 'kkkkkkkkkkkk', 'kgkkkkkkkkgk', '.k........k.']
  ];
  var PLAYER_PAL = { a: STEEL, d: '#1e1a22', l: RED, k: WOOD_M, g: BRASS };
  var STAR = ['...y...', '...y...', 'yyyYyyy', '.yYYYy.', '..yyy..', '.yy.yy.', 'y.....y'];
  var STAR_PAL = { y: LAMP, Y: WHITE };
  var GLOVE = [
    ['.gggggg.', 'gGggggGg', 'gggggggg', 'gGggggGg', '.gggggg.', '..gg.gg.'],
    ['..gggg..', '.gGggGg.', 'gggggggg', 'gGggggGg', 'gggggggg', '.gg..gg.']
  ];
  var GLOVE_PAL = { g: '#c88a4a', G: '#f0c080' };
  var PUMP = ['.hh.', '..h.', '..p.', '..p.', '..p.', '.ppp', '.ppp', '.ppp', '.ppp', 'pppp'];
  var WRENCH = ['w.w', 'www', '.w.', '.w.', '.w.', '.w.', '.w.', 'www'];
  var TOOL_PAL = { h: '#2a2226', p: '#5a3a40', w: '#6a5a60' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltSp, over, won, endT, prevBest, sent, sparkT, holdId;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function glow(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2.3, col, a * 0.1);
    game.draw.circle(x, y, r * 1.5, col, a * 0.22);
    game.draw.circle(x, y, r, col, a);
  }

  function newRun(chart, breaks, demo) {
    var sp = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      sp.push({ b0: c[0], n: c[1], tA: c[0] * SPB, tT: (c[0] + c[1]) * SPB, pAt: c[2], rAt: c[3], res: '', perfect: false, frz: 0, fin: false, dark: false });
    }
    return {
      demo: demo, sp: sp, breaks: breaks, beats: demo ? DEMO_BEATS : SONG_BEATS,
      t: 0, lastK: -1, lastBar: 0, k: -1, dark: false, beatF: 0, warnT: 0, backT: 0, warned: {},
      holding: false, lift: false, holdT: 0, full: false, spin: 0, spinT: 0, wheelA: 0, wheelTo: 0, starF: 0, nipF: 0,
      done: 0, darkHits: 0, perf: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, mile: false, mood: 0, moodT: 0
    };
  }
  function isBreak(r, bar) { return r.breaks.indexOf(bar) >= 0; }
  function barOf(t) { return Math.floor(t / (4 * SPB) + 1e-6); }
  function curSpoke(r) {
    for (var i = 0; i < r.sp.length; i++) if (r.sp[i].res === '') return r.sp[i];
    return null;
  }

  function initGame() {
    run = newRun(CHART, BREAKS, false);
    readyT = 0.8; halt = 0; haltSp = null; over = false; won = false; endT = 0; sent = false; sparkT = 0; holdId = null;
    prevBest = game.best || 0;
  }

  // ── 拍クロック(1本だけ) ──
  function playBar(bar) {
    var i = (bar - 1) % PHRASES.length;
    game.audio.melody(PHRASES[i], { tempo: BPM, wave: 'square', volume: 0.05, bass: BASSES[i], bassWave: 'triangle', bassVolume: 0.09 });
  }
  function onBeat(r, k, loud) {
    var bar = Math.floor(k / 4), q = k % 4;
    r.k = k;
    var was = r.dark;
    r.dark = isBreak(r, bar);
    if (r.dark) {
      if (!was && loud) game.audio.tone(180, 0.18, { wave: 'sawtooth', volume: 0.05, slide: -140 });
      return;   // 針が浮いた小節: 伴奏・刻み・光点の音を出さない
    }
    r.beatF = 0.16;
    if (was) { r.backT = 0.45; if (loud) game.audio.tone(90, 0.06, { wave: 'square', volume: 0.06, slide: 40 }); }
    if (loud) {
      game.audio.tone(q === 0 ? 1568 : 1175, 0.025, { wave: 'square', volume: q === 0 ? 0.05 : 0.03 });
      if (bar === 0) game.audio.tone(q === 3 ? 'A4' : 'D4', 0.1, { wave: 'triangle', volume: 0.08 });
    }
    var s = curSpoke(r);
    if (s && k >= s.b0 && k <= s.b0 + s.n && loud) {
      var idx = k - s.b0;
      if (idx === s.n) game.audio.tone('D6', 0.14, { wave: 'triangle', volume: 0.08 });
      else game.audio.tone(STEP_NOTES[Math.min(idx, STEP_NOTES.length - 1)], 0.05, { wave: 'square', volume: 0.04 });
    }
  }

  function stepRun(r, dt, loud) {
    r.t += dt;
    var t = r.t;
    var k = Math.floor(t / SPB);
    if (k > r.lastK) { r.lastK = k; onBeat(r, k, loud); }
    // 伴奏は発音の遅れ(約0.06秒)を見込んで小節頭の少し前に出す
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) {
      r.lastBar = nb;
      if (loud && nb >= 1 && nb * 4 < r.beats && !isBreak(r, nb)) playBar(nb);
    }
    // 音が抜ける小節の予告(1拍半前 ≒ 0.7秒): アームが赤く震えて雑音が下がる
    var nextBar = barOf(t) + 1;
    if (isBreak(r, nextBar) && !r.warned[nextBar] && t >= nextBar * 4 * SPB - 1.5 * SPB) {
      r.warned[nextBar] = true; r.warnT = 1.5 * SPB;
      if (loud) game.audio.tone(1400, 0.6, { wave: 'sawtooth', volume: 0.03, slide: -1200 });
    }
    var s = curSpoke(r);
    if (s && t > s.tT + EDGE) {
      if (r.holding) { r.holding = false; r.holdT = 0; r.full = false; if (!r.demo) r.lift = true; }
      missSpoke(r, s, loud);
    }
    for (var i = 0; i < r.sp.length; i++) {
      var c = r.sp[i];
      if (c.res === 'miss' && c.frz > 0 && !c.fin) {
        c.frz -= dt;
        if (c.frz <= 0) game.feedback.bad(WX, NIP_Y, { text: 'MISS', volume: loud ? 0.4 : 0, shake: r.demo ? 4 : 10, flashColor: MISSC });
      }
    }
    if (r.holding) {
      r.holdT += dt;
      r.spin += dt * 9;
      if (!r.full && r.holdT >= FULL_HOLD) {
        r.full = true;
        if (loud) game.audio.tone(1760, 0.07, { wave: 'triangle', volume: 0.06 });
      }
    }
    if (r.spinT > 0) { r.spinT -= dt; r.spin += dt * 30; }
    r.wheelA += (r.wheelTo - r.wheelA) * Math.min(1, dt * 7);
    if (r.beatF > 0) r.beatF -= dt;
    if (r.warnT > 0) r.warnT -= dt;
    if (r.backT > 0) r.backT -= dt;
    if (r.starF > 0) r.starF -= dt;
    if (r.nipF > 0) r.nipF -= dt;
    if (r.moodT > 0) { r.moodT -= dt; if (r.moodT <= 0) r.mood = 0; }
  }

  function startHold(r, loud) {
    r.holding = true; r.holdT = 0; r.full = false;
    if (r.moodT <= 0) r.mood = 2;
    if (loud) game.audio.tone(220, FULL_HOLD, { wave: 'triangle', volume: 0.05, slide: 330 });
  }

  function release(r, loud) {
    var hold = r.holdT;
    r.holding = false; r.holdT = 0; r.full = false; r.spinT = 0.25;
    if (r.moodT <= 0) r.mood = 0;
    var s = curSpoke(r);
    if (!s || r.t < s.tA - 0.05) {
      // 光点が出ていない間の空回し(罰なし)
      if (loud) game.audio.tone(300, 0.06, { wave: 'triangle', volume: 0.05, slide: -140 });
      game.fx.burst(WX, NIP_Y + 20, { color: STEEL, count: 4, speed: 90 });
      return;
    }
    var d = r.t - s.tT, ad = Math.abs(d);
    if (ad > GOODW || hold < MIN_HOLD) { missSpoke(r, s, loud); return; }
    var perfect = ad <= PERF && hold >= FULL_HOLD;
    var dark = isBreak(r, barOf(s.tT)) || isBreak(r, barOf(s.tT - 0.05));
    s.res = 'hit'; s.perfect = perfect; s.dark = dark;
    r.done++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (dark) r.darkHits++;
    if (perfect) r.perf++; else r.good++;
    r.score += ((perfect ? 300 : 150) + r.combo * 25) * (dark ? 2 : 1);
    r.starF = 0.35; r.nipF = 0.3; r.wheelTo += Math.PI * 2 / NSPOKE;
    r.mood = 3; r.moodT = 0.6;
    game.feedback.good(WX, NIP_Y - 30, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? LAMP : MINT, count: perfect ? 18 : 10, volume: loud ? 0.4 : 0 });
    if (loud) game.audio.tone(perfect ? 1319 : 988, 0.09, { wave: 'square', volume: 0.06, slide: 220 });
    if (!r.demo && r.done === 3 && !r.mile) {
      r.mile = true;
      game.fx.popup('NICE!', W / 2, H * 0.36, { color: LAMP, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missSpoke(r, s, loud) {
    if (s.res !== '') return;
    s.res = 'miss'; s.frz = 0.35;
    r.miss++; r.combo = 0; r.mood = 4; r.moodT = 0.8;
    r.wheelTo += Math.PI * 2 / NSPOKE;
    if (loud) game.audio.tone(140, 0.16, { wave: 'sawtooth', volume: 0.08, slide: -60 });
    if (!r.demo && r.miss >= LIVES) { s.fin = true; halt = 0.5; haltSp = s; }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    run.holding = false;
    if (ok) run.score += (LIVES - run.miss) * 200;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { tightened: run.done, total: CHART.length, darkTightened: run.darkHits, perfect: run.perf, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押して溜め、離して締める ──
  game.onPress(function (x, y, id) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0 || run.holding || run.lift) { game.audio.tone(330, 0.03, { wave: 'square', volume: 0.03 }); return; }
    holdId = id;
    startHold(run, true);
    game.fx.burst(WX, HANDLE_Y - 60, { color: BRASS, count: 5, speed: 110 });
  });

  game.onRelease(function (x, y, id) {
    if (state !== S.PLAYING) return;
    if (run.lift) { run.lift = false; holdId = null; game.audio.tone(200, 0.04, { wave: 'triangle', volume: 0.03 }); return; }
    if (!run.holding || id !== holdId) return;
    holdId = null;
    if (over || halt > 0) { run.holding = false; game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    release(run, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 明るい小節で1本、針が浮いた小節で1本(拍を数えて離す)、3本目は離すのが早くてMISS ──
  var demo = { t: 0, run: null, hy: HANDLE_Y };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, DEMO_BREAKS, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var s = curSpoke(r);
    if (s) {
      var pT = s.tT + s.pAt * SPB, rT = s.tT + s.rAt * SPB;
      if (!r.holding && r.t >= pT && r.t < rT) startHold(r, audioOk);
      if (r.holding && r.t >= rT) release(r, audioOk);
    }
    var ty = r.holding ? HANDLE_Y + 20 : HANDLE_Y - 60 + Math.sin(game.time.elapsed * 3) * 12;
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──
  function drawShop(r, tt) {
    var cam = Math.sin(tt * 0.31) * 16;
    game.draw.gradient(0, H, [[0, BG0], [0.16, BG1], [0.5, WALL], [1, WOOD_D]]);
    // 最遠景(パララックス0.12): 窓の外の夕方の町
    var ox = cam * 0.12, wx = cam * 0.3, mx = cam * 0.6;
    game.draw.gradient(330, 530, [[0, DUSK1], [1, DUSK0]]);
    for (var h = 0; h < 7; h++) game.draw.rect(30 + ox + h * 40, 440 + (h % 3) * 22, 34, 100, '#2c2036');
    // 壁(パララックス0.3): 窓の開口だけ残した板壁、窓枠、有孔ボードと工具
    game.draw.rect(0, 300, 60 + wx, 660, PEG);
    game.draw.rect(60 + wx, 300, 210, 30, PEG);
    game.draw.rect(60 + wx, 530, 210, 430, PEG);
    game.draw.rect(270 + wx, 300, W, 660, PEG);
    game.draw.rect(60 + wx, 330, 210, 8, WOOD_M);
    game.draw.rect(60 + wx, 522, 210, 12, WOOD_L);
    game.draw.rect(161 + wx, 330, 8, 196, WOOD_M);
    for (var py = 330; py < 940; py += 46) {
      for (var px = 320; px < W - 30; px += 46) game.draw.rect(px + wx, py, 6, 6, PEG_H);
    }
    game.draw.sprite(PUMP, TOOL_PAL, 330 + wx, 470, 10, { anchor: 'center' });
    game.draw.sprite(WRENCH, TOOL_PAL, 980 + wx, 650, 12, { anchor: 'center' });
    game.draw.sprite(WRENCH, TOOL_PAL, 1030 + wx, 710, 10, { anchor: 'center' });
    // 中景(パララックス0.6): 窓の下に吊った自転車
    var hb = 160 + mx;
    game.draw.line(hb - 50, 560, hb - 50, 600, '#2a2226', 4);
    game.draw.line(hb + 50, 560, hb + 50, 600, '#2a2226', 4);
    game.draw.circle(hb - 62, 650, 40, '#1e181e', 0.9);
    game.draw.circle(hb - 62, 650, 31, PEG, 1);
    game.draw.circle(hb + 62, 650, 40, '#1e181e', 0.9);
    game.draw.circle(hb + 62, 650, 31, PEG, 1);
    game.draw.line(hb - 62, 650, hb - 6, 606, RED, 7);
    game.draw.line(hb - 6, 606, hb + 62, 650, RED, 7);
    game.draw.line(hb - 40, 606, hb + 30, 606, RED, 7);
    game.draw.line(hb - 62, 650, hb - 50, 606, '#f08070', 3);
    // 吊りランプ(唯一の光源)と光の円錐
    var lx = 46 + cam * 0.4;
    game.draw.line(lx, 228, lx, 268, '#2a2226', 4);
    game.draw.rect(lx - 34, 268, 68, 22, '#6a5a50');
    glow(lx, 296, 18, LAMP, 0.9);
    for (var y = 300; y < 1420; y += 34) {
      var cw = 60 + (y - 300) * 0.7;
      game.draw.rect(lx + (y - 300) * 0.28 - cw / 2, y, cw, 34, LAMP, 0.022);
    }
    // 舞うほこり
    for (var d = 0; d < 14; d++) {
      var dy = 320 + ((d * 97 + tt * (14 + (d % 3) * 8)) % 1000);
      var dx = lx + (dy - 300) * 0.28 + Math.sin(tt * 0.7 + d * 1.7) * (40 + (dy - 300) * 0.25);
      game.draw.rect(dx, dy, 4, 4, LAMP, 0.35);
    }
    // 棚とレコードプレーヤー(伴奏の出どころ)
    game.draw.rect(810, 520, 270, 14, WOOD_L);
    game.draw.rect(810, 534, 270, 8, WOOD_D);
    var pf = r.dark ? 2 : Math.floor(r.t / SPB * 2) % 2;
    var shake = r.warnT > 0 ? Math.sin(tt * 60) * 4 : 0;
    game.draw.rect(860, 512, 150, 10, INK, 0.35);
    game.draw.sprite(PLAYER[pf], PLAYER_PAL, 935 + shake, 474, 11, { anchor: 'center' });
    if (r.warnT > 0 && Math.floor(tt * 14) % 2 === 0) glow(1000, 448, 12, MISSC, 0.9);
    if (!r.dark && r.beatF > 0) {
      for (var n = 0; n < 2; n++) game.draw.rect(900 + n * 44, 412 - (r.beatF / 0.16) * 24 - n * 14, 14, 22, LAMP, r.beatF / 0.16);
    }
    if (r.backT > 0) glow(935, 474, 40, LAMP, r.backT);
    // 近景: 作業台
    game.draw.rect(0, 1395, W, 22, WOOD_L);
    game.draw.rect(0, 1417, W, H - 1417, WOOD_M);
    for (var g = 0; g < 7; g++) game.draw.line(0, 1440 + g * 70 + Math.sin(g) * 8, W, 1452 + g * 70, WOOD_D, 3);
    game.draw.rect(0, 1395, W, 4, WHITE, 0.25);
  }

  function drawWheel(r, tt) {
    // 壁に落ちる影(光源は左上)
    game.draw.circle(WX + 36, WY + 44, WR + 18, INK, 0.25);
    // 振れ取り台
    game.draw.line(WX, WY, WX - 250, 1400, '#4a4a52', 22);
    game.draw.line(WX - 6, WY, WX - 256, 1400, '#6a6a74', 6);
    game.draw.rect(WX - 330, 1380, 170, 24, '#3a3a42');
    game.draw.line(WX + WR * 0.64, WY - WR * 0.9, WX + WR * 0.76, WY - WR * 0.68, '#6a6a74', 10);
    // スポーク
    var step = Math.PI * 2 / NSPOKE;
    var cur = curSpoke(r);
    for (var i = 0; i < NSPOKE; i++) {
      var a = Math.PI / 2 + i * step - r.wheelA;
      var hx = WX + Math.cos(a + (i % 2 ? 0.18 : -0.18)) * 34, hy = WY + Math.sin(a + (i % 2 ? 0.18 : -0.18)) * 34;
      var ex = WX + Math.cos(a) * (WR - 8), ey = WY + Math.sin(a) * (WR - 8);
      var lit = Math.cos(a + Math.PI * 0.75) > 0.3;
      game.draw.line(hx, hy, ex, ey, lit ? '#c8d8e0' : '#7a8a94', 4);
    }
    // 締める位置のスポーク(真下)
    var settled = Math.abs(r.wheelTo - r.wheelA) < 0.02;
    if (settled && cur) game.draw.line(WX, WY + 34, WX, NIP_Y - 8, r.holding ? LAMP : '#e8f0f4', 7);
    // リム(左上が明るい)
    var seg = 44;
    for (var s = 0; s < seg; s++) {
      var a0 = s / seg * Math.PI * 2, a1 = (s + 1.05) / seg * Math.PI * 2;
      var l = Math.cos((a0 + a1) / 2 + Math.PI * 0.75);
      var col = l > 0.45 ? RIM_L : l > -0.3 ? RIM_M : RIM_D;
      game.draw.line(WX + Math.cos(a0) * WR, WY + Math.sin(a0) * WR, WX + Math.cos(a1) * WR, WY + Math.sin(a1) * WR, col, 26);
      game.draw.line(WX + Math.cos(a0) * (WR - 10), WY + Math.sin(a0) * (WR - 10), WX + Math.cos(a1) * (WR - 10), WY + Math.sin(a1) * (WR - 10), RIM_D, 3);
    }
    // ハブ
    game.draw.circle(WX + 4, WY + 5, 46, INK, 0.4);
    game.draw.circle(WX, WY, 44, RIM_M);
    game.draw.circle(WX - 10, WY - 10, 22, RIM_L);
    game.draw.circle(WX, WY, 12, RIM_D);
    // ニップル(締めたら金色に光る / MISSは白く膨らんで止まる)
    var miss = null;
    for (var m = 0; m < r.sp.length; m++) if (r.sp[m].res === 'miss' && r.sp[m].frz > 0) miss = r.sp[m];
    if (miss) {
      game.draw.circle(WX, NIP_Y, 96, WHITE, 0.35);
      game.draw.circle(WX, NIP_Y, 56, WHITE);
      game.draw.line(WX, WY + 34, WX, NIP_Y, WHITE, 14);
    } else {
      game.draw.rect(WX - 14, NIP_Y - 18, 28, 30, BRASS);
      game.draw.rect(WX - 14, NIP_Y - 18, 8, 30, LAMP);
      if (r.nipF > 0) glow(WX, NIP_Y, 22, LAMP, r.nipF / 0.3);
    }
  }

  function drawDriver(r, tt) {
    var top = NIP_Y + 16, hTop = HANDLE_Y - 110;
    game.draw.rect(WX - 9, top, 18, hTop - top, '#8a9aa4');
    game.draw.rect(WX - 9, top, 6, hTop - top, RIM_L);
    game.draw.rect(WX - 12, top - 6, 24, 10, '#5a6a74');
    // 柄(回転は縞の移動で見せる)
    game.draw.rect(WX - 62, hTop + 6, 124, 210, INK, 0.3);
    game.draw.rect(WX - 58, hTop, 116, 210, RED);
    var ph = (r.spin * 18) % 36;
    for (var i = -1; i < 4; i++) {
      var sx = WX - 58 + ph + i * 36;
      if (sx > WX - 62 && sx < WX + 50) game.draw.rect(sx, hTop, 10, 210, '#8a2a24');
    }
    game.draw.rect(WX - 58, hTop, 14, 210, '#f08070', 0.55);
    game.draw.rect(WX - 58, hTop, 116, 10, '#f08070', 0.6);
    var gf = r.holding ? Math.floor(tt * 10) % 2 : 0;
    game.draw.sprite(GLOVE[gf], GLOVE_PAL, WX, HANDLE_Y + 10, 15, { anchor: 'center' });
  }

  function drawGauge(r, tt) {
    var s = curSpoke(r);
    if (!s) s = r.sp[r.sp.length - 1];
    var t = r.t;
    var barNow = barOf(t);
    var darkNow = isBreak(r, barNow);
    game.draw.rect(GX0 - 60, GY - 54, GX1 - GX0 + 120, 108, INK, 0.55);
    game.draw.rect(GX0, GY - 6, GX1 - GX0, 12, '#3a3040');
    var active = t >= s.tA - 0.02 && s.res === '';
    for (var i = 0; i <= s.n; i++) {
      var nx = GX0 + (GX1 - GX0) * (i / s.n);
      if (i < s.n) {
        game.draw.circle(nx, GY, 18, '#241c28');
        game.draw.circle(nx, GY, 12, i === 0 && !active ? BRASS : '#4a3c50', i === 0 && !active ? 0.5 + 0.3 * Math.sin(tt * 6) : 1);
      }
    }
    // 最良点の星
    var sf = r.starF > 0 ? r.starF / 0.35 : 0;
    if (sf > 0) glow(GX1, GY, 30, LAMP, sf);
    game.draw.sprite(STAR, STAR_PAL, GX1, GY, 9 + sf * 4, { anchor: 'center' });
    // 光点: 拍ごとに1目盛り(音が抜けた小節では最初の拍のあと見えなくなる)
    if (active) {
      var fi = Math.max(0, Math.min(s.n, Math.floor((t - s.tA) / SPB + 1e-6)));
      var since = t - (s.tA + fi * SPB);
      var px = GX0 + (GX1 - GX0) * (Math.max(0, fi - 1) / s.n);
      var nx2 = GX0 + (GX1 - GX0) * (fi / s.n);
      var x = fi === 0 ? nx2 : px + (nx2 - px) * Math.min(1, since / 0.08);
      var seen = !darkNow || t - s.tA < 0.6 * SPB;
      if (seen) {
        glow(x, GY, 20, fi === s.n ? WHITE : LAMP, 1);
        game.draw.circle(x - 6, GY - 6, 6, WHITE, 0.9);
      }
    }
    if (darkNow) game.draw.rect(GX0 - 60, GY - 54, GX1 - GX0 + 120, 108, INK, 0.55);
    if (r.warnT > 0 && Math.floor(tt * 14) % 2 === 0) game.draw.rect(GX0 - 60, GY - 54, GX1 - GX0 + 120, 6, MISSC, 0.9);
  }

  function drawMeter(r) {
    var c = r.holding ? Math.min(1, r.holdT / FULL_HOLD) : 0;
    var minP = MIN_HOLD / FULL_HOLD;
    game.draw.rect(MET_X - 34, MET_Y0 - MET_H - 4, 68, MET_H + 8, INK, 0.7);
    game.draw.rect(MET_X - 24, MET_Y0 - MET_H * c, 48, MET_H * c, c >= 1 ? LAMP : c >= minP ? BRASS : WOOD_L);
    game.draw.rect(MET_X - 24, MET_Y0 - MET_H * c, 10, MET_H * c, WHITE, 0.3);
    game.draw.rect(MET_X - 46, MET_Y0 - MET_H * minP, 92, 6, BRASS);
    game.draw.rect(MET_X - 46, MET_Y0 - MET_H, 92, 6, LAMP);
    if (c >= 1) glow(MET_X, MET_Y0 - MET_H, 18, LAMP, 0.7);
  }

  function drawMechanic(r, tt) {
    var f = r.mood;
    if (f === 0 && Math.floor(tt * 0.8) % 4 === 0 && (tt * 0.8) % 1 < 0.12) f = 1;
    var bob = !r.dark && r.beatF > 0 ? -(r.beatF / 0.16) * 10 : 0;
    game.draw.rect(108, 1828, 170, 20, INK, 0.3);
    game.draw.sprite(MECH[f], MECH_PAL, 190, 1730 + bob, 12, { anchor: 'center' });
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.115, INK, 0.65);
    txt(String(r.score), 40, 70, 52, LAMP, 'left');
    txt(r.done + ' / ' + r.sp.length, W / 2, 70, 44, RIM_L);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 70, alive = i < LIVES - r.miss;
      game.draw.rect(lx - 14, 52, 28, 34, alive ? BRASS : '#3a3040');
      if (alive) game.draw.rect(lx - 14, 52, 8, 34, LAMP);
      else game.draw.line(lx - 22, 90, lx + 22, 48, MISSC, 6);
    }
    var bk = r.k >= 0 ? r.k % 4 : -1;
    for (var b = 0; b < 4; b++) {
      var x = W * 0.29 + b * W * 0.14, y = 172;
      game.draw.rect(x - 42, y - 14, 84, 28, '#241c28');
      var warn = r.warnT > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (!r.dark && b === bk && r.beatF > 0) game.draw.rect(x - 36, y - 9, 72, 18, b === 0 ? RED : LAMP);
      else if (warn) game.draw.rect(x - 36, y - 9, 72, 18, MISSC, 0.7);
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.8, H * 0.56, 48, LAMP);
  }

  function drawScene(r, tt) {
    drawShop(r, tt);
    drawWheel(r, tt);
    drawDriver(r, tt);
    drawGauge(r, tt);
    drawMeter(r);
    drawMechanic(r, tt);
    if (r.dark) game.draw.rect(0, 230, W, 1160, INK, 0.28);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 110, won ? LAMP : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.22, W - 160, H * 0.34, INK, 0.85);
    glow(W / 2, H * 0.22, 26, won ? LAMP : MISSC, 0.5);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 100, won ? LAMP : MISSC);
    txt(run.done + ' / ' + CHART.length, W / 2, H * 0.33, 62, RIM_L);
    txt('SCORE ' + run.score, W / 2, H * 0.385, 52, LAMP);
    txt('PERFECT ' + run.perf, W * 0.38, H * 0.43, 40, MINT);
    game.draw.sprite(PLAYER[2], PLAYER_PAL, W * 0.66, H * 0.43, 6, { anchor: 'center' });
    txt('x' + run.darkHits, W * 0.76, H * 0.43, 40, LAMP);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.48, 56, LAMP);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 44, RIM_L);
    if (!won) txt('あと' + (CHART.length - run.done) + '本!', W / 2, H * 0.53, 50, BRASS);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, RIM_L);
  }

  game.onUpdate(function (dt) {
    if (dt > 0.1) dt = 0.1;
    var tt = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.run, tt);
      game.draw.rect(0, 0, W, H * 0.115, INK, 0.65);
      game.draw.hand(WX + 60, demo.hy, { press: demo.run.holding, scale: 16 });
      txt(GAME_TITLE, W / 2, 88, 92, LAMP);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 176, 40, RIM_L);
      if (Math.floor(tt * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, LAMP);
      else txt('TAP TO START', W / 2, H * 0.965, 44, RIM_L);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.6), { color: [LAMP, BRASS, MINT][Math.floor(game.random(0, 3)) % 3], count: 14, speed: 300 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(WX, NIP_Y, { text: 'MISS', flashColor: MISSC });
          haltSp.frz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        if (run.t >= TIME_LIMIT + 0.3) finish(run.miss < LIVES);
      }
    }

    drawScene(run, tt);
    drawHud(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, LAMP);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
