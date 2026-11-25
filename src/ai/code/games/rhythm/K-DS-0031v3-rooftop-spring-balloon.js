// K-DS-0031v3-rooftop-spring-balloon.js
// 屋上のばね台観測気球 — 拍を数えながら打ち上げ台のばねを1拍1目盛りずつ引き絞り、部長の旗が上がる合図の拍でちょうど放して光玉の気球を狙いの高さの帯へ上げる。途中で4拍子→3拍子→4拍子と拍型が切り替わる
// 操作: 画面のどこでも押して下へ引くと、ばねの爪が拍の頭ごとに1目盛りずつ下がる(押した拍の頭のすぐ後でも1目盛り目に数える。合図の拍では下がらない)。目盛りの数=気球が届く帯(下から青・緑・黄・赤)。点滅している帯と同じ数だけ溜め、部長の旗が上がる拍の頭(小節の1拍目。1拍前に笛と旗半分で予告)で指を離す。ずれでPERFECT/GOOD。拍外れ・帯違い・5目盛り目まで引いて爪が外れる・放し忘れはMISS
// 終わり: 10小節(約18秒・気球8個)を上げ終えればCLEAR(判定点+目盛り+連続+残り)。MISS3回でGAME OVER。5〜8小節目は3拍子(前の小節で上がる音型・帯の明滅・拍ランプの数の予告)、9小節目から4拍子に戻る
// @mechanic: slingshot
// @theme: rooftop_weather_balloon_spring
// 世界観: 大学の屋上の実験場で、気象部の学生が部長の旗の合図に合わせて、ばね仕掛けの打ち上げ台から光玉を吊った観測用の小さな気球を狙いの高さへ打ち上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 上げた気球の数・PERFECT数・最大連続・スコア
// スタイル: 70s MONO
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドット。画面の横帯ごとにセロハンの単色が乗る(帯の中の白は帯の色に見える)。矩形波の単音と無音の間
  var STYLE = { bg: ['#000000', '#06060a'], main: ['#f2f2f2', '#4cb8ff', '#4cff8a'], accent: ['#ffe04c', '#ff6a3c'] };
  var BLACK = STYLE.bg[0], WHITE = STYLE.main[0];
  var BANDS = [
    { y0: H * 0.552, y1: H * 0.645, col: STYLE.main[1] },
    { y0: H * 0.448, y1: H * 0.552, col: STYLE.main[2] },
    { y0: H * 0.344, y1: H * 0.448, col: STYLE.accent[0] },
    { y0: H * 0.229, y1: H * 0.344, col: STYLE.accent[1] }
  ];
  var DIM = '#3a3a3a', MISSC = '#ff3a5a';

  var GAME_TITLE = 'SPRING SKY';
  var BPM = 120;
  var SPB = 60 / BPM;
  var METERS = [4, 4, 4, 4, 3, 3, 3, 3, 4, 4, 4];   // 小節ごとの拍数(0小節目はカウント)
  var TIME_LIMIT = 18;                              // 36拍
  // [合図の拍(通しの拍番号), 狙いの目盛り数]
  var CUES = [[8, 2], [12, 3], [16, 1], [19, 2], [25, 4], [28, 1], [32, 3], [36, 3]];
  // デモ: [合図の拍, 目盛り数, ゴーストが押す拍]。3つ目は1拍早く押して目盛りが多すぎ(帯違い)MISS
  var DEMO_CUES = [[8, 2, 6], [12, 3, 9], [16, 1, 14]];
  var DEMO_METERS = [4, 4, 4, 4, 4];
  var PERF = 0.07, GOODW = 0.14, EDGE = 0.25, GRACE = 0.18;
  var ENGAGE = 60;                                  // ばねに爪が掛かる引きの量(px)
  var LIVES = 3;
  var PAD_X = W * 0.5, PAD_Y = H * 0.75;
  var NOTCH_GAP = 34;

  // 伴奏(独自の旋律)。4拍子と3拍子の2曲を小節頭で1小節ずつ鳴らす
  var MEL4 = [
    [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1], ['R', 1]],
    [['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 1], ['R', 1]],
    [['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['G5', 0.5], ['E5', 1], ['R', 1]],
    [['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['R', 1]]
  ];
  var BASS4 = [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]];
  var MEL3 = [
    [['E5', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1]],
    [['F5', 1], ['A5', 0.5], ['F5', 0.5], ['D5', 1]],
    [['G5', 1], ['B5', 0.5], ['G5', 0.5], ['E5', 1]],
    [['E5', 1], ['D5', 0.5], ['B4', 0.5], ['C5', 1]]
  ];
  var BASS3 = [['C3', 1], ['G3', 0.5], ['R', 0.5], ['G3', 0.5], ['R', 0.5]];

  // 部長(旗)。0=旗を下ろす 1=半分(予告) 2=上げる(合図)
  var CAPTAIN = [
    ['....hhh.....', '...hhhhh....', '...hsssh....', '....sss.....', '..wwwwwww...', '.ww.www.ww..', '.w..www..w..', '.s..www..s..', '....www.....', '....w.w.....', '....w.w.....', '...ww.ww....'],
    ['....hhh.....', '...hhhhh....', '...hsssh..s.', '....sss..ww.', '..wwwwwwww..', '.ww.www.....', '.w..www.....', '.s..www.....', '....www.....', '....w.w.....', '....w.w.....', '...ww.ww....'],
    ['....hhh...s.', '...hhhhh..w.', '...hsssh.ww.', '....sss.ww..', '..wwwwwww...', '.ww.www.....', '.w..www.....', '.s..www.....', '....www.....', '....w.w.....', '....w.w.....', '...ww.ww....']
  ];
  // 学生(白衣)。0=構え 1=引く 2=放した
  var STUDENT = [
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '...ssss...', '..wwwwww..', '.wwwwwwww.', 'sw.wwww.ws', '...wwww...', '...wwww...', '...w..w...', '...w..w...', '..ww..ww..'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '...ssss...', '..wwwwww..', 'swwwwwwww.', '.w.wwww.w.', '...wwww.s.', '...wwww...', '..w...w...', '.w....w...', 'ww....ww..'],
    ['s..hhhh..s', 'w.hhhhhh.w', 'w.hssssh.w', 'ww.ssss.ww', '.wwwwwwww.', '...wwww...', '...wwww...', '...wwww...', '...wwww...', '...w..w...', '...w..w...', '..ww..ww..']
  ];
  var PERSON_PAL = { h: WHITE, s: WHITE, w: WHITE };
  var BALLOON = ['..www..', '.wwwww.', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..', '...w...', '...w...', '..lll..'];
  var BAL_PALS = [{ w: WHITE, l: WHITE }];
  for (var bi = 0; bi < BANDS.length; bi++) BAL_PALS.push({ w: BANDS[bi].col, l: BANDS[bi].col });
  var BAL_MISS = { w: DIM, l: DIM };
  var BAL_FLASH = { w: WHITE, l: MISSC };

  // 星(決め打ち配置)
  var STARS = [];
  for (var si = 0; si < 70; si++) STARS.push([(si * 151) % W, 240 + (si * 97) % 1000, si * 0.9]);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltB, over, won, endT, prevBest, sent, drag;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: '#202020', bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function bandAt(y) { for (var i = 0; i < BANDS.length; i++) if (y >= BANDS[i].y0 && y < BANDS[i].y1) return i; return -1; }
  function tint(y) { var b = bandAt(y); return b >= 0 ? BANDS[b].col : WHITE; }
  function bandMid(n) { var b = BANDS[n - 1]; return (b.y0 + b.y1) / 2; }

  function buildBars(meters) {
    var st = [], k = 0;
    for (var i = 0; i < meters.length; i++) { st.push(k); k += meters[i]; }
    return st;
  }
  function newRun(cues, meters, demo) {
    var bs = [];
    for (var i = 0; i < cues.length; i++) bs.push({ cue: cues[i][0], tc: cues[i][0] * SPB, n: cues[i][1], press: cues[i][2], res: '', frz: 0, fin: false, x: PAD_X, y: PAD_Y - 40, ty: 0, band: 0, t0: 0, sway: i * 1.7 });
    return {
      demo: demo, bs: bs, meters: meters, starts: buildBars(meters), t: 0, lastK: -1, melK: 0, k: -1, bar: 0, q: 0, beatF: 0, annT: 0, annMeter: 0,
      hold: null, lift: false, flag: 0, flagT: 0, student: 0, studentT: 0, cupA: 0, padF: 0, clickF: 0,
      launched: 0, perf: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, mile: false
    };
  }
  function initGame() {
    run = newRun(CUES, METERS, false);
    readyT = 0.8; halt = 0; haltB = null; over = false; won = false; endT = 0; sent = false; drag = null;
    prevBest = game.best || 0;
  }
  function barOfBeat(r, k) { var b = 0; for (var i = 0; i < r.starts.length; i++) if (r.starts[i] <= k) b = i; return b; }
  function isCue(r, k) { for (var i = 0; i < r.bs.length; i++) if (r.bs[i].cue === k) return true; return false; }
  function curB(r) { for (var i = 0; i < r.bs.length; i++) if (r.bs[i].res === '') return r.bs[i]; return null; }

  // ── 拍クロック(1本)。小節の拍数だけが4/3で切り替わる ──
  function playBar(r, bar) {
    var m = r.meters[bar];
    if (m === 3) game.audio.melody(MEL3[bar % 4], { tempo: BPM, wave: 'square', volume: 0.05, bass: BASS3, bassWave: 'square', bassVolume: 0.04 });
    else game.audio.melody(MEL4[bar % 4], { tempo: BPM, wave: 'square', volume: 0.05, bass: BASS4, bassWave: 'square', bassVolume: 0.04 });
  }
  function onBeat(r, k, loud) {
    var bar = barOfBeat(r, k);
    r.k = k; r.bar = bar; r.q = k - r.starts[bar]; r.beatF = 0.15;
    if (loud) {
      game.audio.tone(r.q === 0 ? 1046 : 784, 0.03, { wave: 'square', volume: r.q === 0 ? 0.05 : 0.03 });
      if (bar === 0) game.audio.tone(r.q === 3 ? 'G4' : 'C4', 0.08, { wave: 'square', volume: 0.06 });
    }
    // 拍型の切り替えの予告(1小節前): 上がる音型、帯の明滅、次の拍数のランプ
    if (r.q === 0 && bar + 1 < r.meters.length && r.meters[bar + 1] !== r.meters[bar] && bar >= 1) {
      r.annT = r.meters[bar] * SPB; r.annMeter = r.meters[bar + 1];
      if (loud) game.audio.melody([['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.25]], { tempo: BPM, wave: 'square', volume: 0.05 });
    }
    // 合図の予告(1拍前): 笛と旗半分 / 合図の拍: 旗を上げて長い笛
    if (isCue(r, k + 1)) { r.flag = 1; r.flagT = SPB; if (loud) game.audio.tone(1900, 0.05, { wave: 'square', volume: 0.05 }); }
    if (isCue(r, k)) { r.flag = 2; r.flagT = 0.4; r.padF = 0.3; if (loud) game.audio.tone(2300, 0.16, { wave: 'square', volume: 0.06 }); }
    // ばねの爪: 押して引いている間、合図以外の拍の頭ごとに1目盛り
    if (r.hold && r.hold.engaged && !isCue(r, k)) addNotch(r, k, loud);
  }

  function startHold(r) {
    r.hold = { t0: r.t, pull: 0, engaged: false, notch: 0, counted: {} };
    r.student = 1;
  }
  function setPull(r, px, loud) {
    var h = r.hold;
    if (!h) return;
    h.pull = px;
    if (!h.engaged && px >= ENGAGE) {
      h.engaged = true;
      if (loud) game.audio.tone(330, 0.04, { wave: 'square', volume: 0.04 });
      var head = Math.floor(r.t / SPB);
      if (r.t - head * SPB <= GRACE && !isCue(r, head) && head >= 0) addNotch(r, head, loud);
    }
  }
  function addNotch(r, k, loud) {
    var h = r.hold;
    if (!h || h.counted[k]) return;
    h.counted[k] = true;
    h.notch++;
    r.clickF = 0.12;
    if (h.notch > BANDS.length) {
      // 引きすぎ: 爪が外れてばねが戻る
      r.hold = null;
      if (!r.demo) r.lift = true;
      var b = curB(r);
      if (b) failB(r, b, 0, loud);
      return;
    }
    if (loud) game.audio.tone(220 * Math.pow(1.26, h.notch), 0.05, { wave: 'square', volume: 0.05 });
  }

  function release(r, loud) {
    var h = r.hold;
    r.hold = null;
    r.student = 2; r.studentT = 0.35;
    var b = curB(r);
    if (!h || !h.engaged || h.notch === 0) {
      if (b && Math.abs(r.t - b.tc) <= GOODW) failB(r, b, 0, loud);
      else if (loud) game.audio.tone(140, 0.05, { wave: 'square', volume: 0.04 });
      return;
    }
    if (!b) { if (loud) game.audio.tone(140, 0.05, { wave: 'square', volume: 0.04 }); return; }
    var d = r.t - b.tc, ad = Math.abs(d);
    if (ad > GOODW || h.notch !== b.n) { failB(r, b, h.notch, loud); return; }
    var perfect = ad <= PERF;
    b.res = 'hit'; b.t0 = r.t; b.band = b.n; b.ty = bandMid(b.n); b.x = PAD_X; b.y = PAD_Y - 40;
    b.hx = 120 + ((r.launched * 263) % 840);
    r.launched++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perf++; else r.good++;
    r.score += (perfect ? 300 : 150) + b.n * 30 + r.combo * 25;
    game.feedback.good(PAD_X, PAD_Y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: BANDS[b.n - 1].col, count: perfect ? 16 : 10, volume: loud ? 0.4 : 0 });
    if (loud) game.audio.tone(392, 0.3, { wave: 'square', volume: 0.05, slide: 520 });
    if (!r.demo && r.launched === 4 && !r.mile) {
      r.mile = true;
      game.fx.popup('NICE!', W / 2, H * 0.2, { color: WHITE, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function failB(r, b, notch, loud) {
    if (b.res !== '') return;
    b.res = 'miss'; b.frz = 0.35; b.t0 = r.t; b.band = notch; b.x = PAD_X; b.y = PAD_Y - 40;
    b.ty = notch > 0 ? bandMid(Math.min(BANDS.length, notch)) : PAD_Y - 260;
    r.miss++; r.combo = 0;
    if (loud) game.audio.tone(110, 0.18, { wave: 'square', volume: 0.07, slide: -40 });
    if (!r.demo && r.miss >= LIVES) { b.fin = true; halt = 0.5; haltB = b; }
  }

  function stepRun(r, dt, loud) {
    r.t += dt;
    var k = Math.floor(r.t / SPB);
    if (k > r.lastK) { r.lastK = k; onBeat(r, k, loud); }
    // 伴奏は発音の遅れ(約0.06秒)を見込んで小節頭の少し前に出す
    var mk = Math.floor((r.t + 0.06) / SPB);
    if (mk > r.melK) {
      r.melK = mk;
      var mb = r.starts.indexOf(mk);
      if (loud && mb >= 1 && mb < r.meters.length - 1) playBar(r, mb);
    }
    var b = curB(r);
    if (b && r.t > b.tc + EDGE) {
      if (r.hold) { r.hold = null; if (!r.demo) r.lift = true; }
      failB(r, b, 0, loud);
    }
    for (var i = 0; i < r.bs.length; i++) {
      var c = r.bs[i];
      if (c.res === 'miss' && c.frz > 0 && !c.fin) {
        c.frz -= dt;
        if (c.frz <= 0) game.feedback.bad(PAD_X, PAD_Y - 120, { text: 'MISS', volume: loud ? 0.4 : 0, shake: r.demo ? 4 : 10, flashColor: MISSC });
        continue;
      }
      if (c.res === 'hit') {
        var u = Math.min(1, (r.t - c.t0) / 1.0);
        var e = 1 - Math.pow(1 - u, 3);
        c.y = (PAD_Y - 40) + (c.ty - (PAD_Y - 40)) * e;
        c.x = PAD_X + (c.hx - PAD_X) * e + Math.sin(r.t * 1.2 + c.sway) * 10 * e;
      } else if (c.res === 'miss' && c.frz <= 0) {
        var w = r.t - c.t0 - 0.35;
        var e2 = 1 - Math.pow(1 - Math.min(1, w / 1.0), 3);
        c.y = (PAD_Y - 40) + (c.ty - (PAD_Y - 40)) * e2;
        c.x = PAD_X + w * 260;
      }
    }
    if (r.hold) r.cupA += dt * 2;
    r.cupA += dt * (1.5 + (r.beatF > 0 ? 6 : 0));
    if (r.beatF > 0) r.beatF -= dt;
    if (r.annT > 0) r.annT -= dt;
    if (r.flagT > 0) { r.flagT -= dt; if (r.flagT <= 0) r.flag = 0; }
    if (r.studentT > 0) { r.studentT -= dt; if (r.studentT <= 0) r.student = 0; }
    if (r.padF > 0) r.padF -= dt;
    if (r.clickF > 0) r.clickF -= dt;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    run.hold = null;
    if (ok) run.score += (LIVES - run.miss) * 200;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }
  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { launched: run.launched, total: CUES.length, perfect: run.perf, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押して下へ引き、合図の拍で離す ──
  game.onPress(function (x, y, id) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0 || run.hold || run.lift) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    drag = { id: id, x0: x, y0: y, x: x, y: y };
    startHold(run);
    game.fx.burst(x, y, { color: WHITE, count: 3, speed: 60 });
  });
  game.onMove(function (x, y, id) {
    if (state !== S.PLAYING || !drag || drag.id !== id) return;
    drag.x = x; drag.y = y;
    if (run.hold) {
      var was = run.hold.engaged;
      setPull(run, y - drag.y0, true);
      if (!was && run.hold && run.hold.engaged) game.fx.burst(PAD_X, PAD_Y + 140, { color: WHITE, count: 4, speed: 80 });
    }
  });
  game.onRelease(function (x, y, id) {
    if (state !== S.PLAYING || !drag || drag.id !== id) return;
    drag = null;
    if (run.lift) { run.lift = false; game.audio.tone(160, 0.03, { wave: 'square', volume: 0.03 }); return; }
    if (!run.hold || over || halt > 0) { run.hold = null; return; }
    release(run, true);
  });
  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 2目盛り・3目盛りを数えて合図で放す → 1目盛りの気球を早く引きすぎて帯違いMISS ──
  var demo = { t: 0, run: null, hx: PAD_X + 150, hy: PAD_Y + 120, press: false };
  var DEMO_BEATS = 18;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CUES, DEMO_METERS, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var b = curB(r);
    var ty = PAD_Y + 100;
    if (b) {
      var pT = b.press * SPB - 0.08;
      if (!r.hold && r.t >= pT && r.t < b.tc) startHold(r);
      if (r.hold) {
        var pull = Math.min(160, (r.t - r.hold.t0) / 0.12 * 160);
        setPull(r, pull, audioOk);
        ty = PAD_Y + 100 + pull;
        if (r.t >= b.tc) release(r, audioOk);
      }
    }
    demo.press = !!r.hold;
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 14);
  }

  // ── 描画 ──
  function drawSky(r, tt) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      if (Math.sin(tt * 1.5 + s[2]) > -0.3) game.draw.rect(s[0], s[1], 4, 4, tint(s[1]));
    }
    // 帯の境目の点線と、セロハンのごく薄い色
    for (var b = 0; b < BANDS.length; b++) {
      var bd = BANDS[b];
      game.draw.rect(0, bd.y0, W, bd.y1 - bd.y0, bd.col, 0.07);
      for (var x = 0; x < W; x += 24) game.draw.rect(x, bd.y0, 8, 3, bd.col, 0.6);
    }
    // 狙いの帯: 点滅 + 右端の旗印
    var cb = curB(r);
    if (cb) {
      var tb = BANDS[cb.n - 1];
      var blink = Math.floor(tt * 4) % 2 === 0;
      game.draw.rect(0, tb.y0, W, tb.y1 - tb.y0, tb.col, blink ? 0.2 : 0.1);
      var my = (tb.y0 + tb.y1) / 2;
      game.draw.rect(W - 70, my - 40, 8, 80, tb.col);
      game.draw.rect(W - 62, my - 40, 44, 28, tb.col, blink ? 1 : 0.5);
    }
    if (r.annT > 0 && Math.floor(tt * 10) % 2 === 0) {
      for (var a = 0; a < BANDS.length; a++) game.draw.rect(0, BANDS[a].y0, W, 6, BANDS[a].col);
    }
  }

  function drawBalloons(r, tt) {
    for (var i = 0; i < r.bs.length; i++) {
      var c = r.bs[i];
      if (c.res === '') continue;
      if (c.res === 'miss' && c.frz > 0) {
        game.draw.circle(PAD_X, PAD_Y - 60, 110, WHITE, 0.3);
        game.draw.sprite(BALLOON, BAL_FLASH, PAD_X, PAD_Y - 60, 18, { anchor: 'center' });
        continue;
      }
      if (c.res === 'miss') {
        if (c.x > W + 80) continue;
        game.draw.sprite(BALLOON, BAL_MISS, c.x, c.y, 9, { anchor: 'center' });
        game.draw.line(c.x - 24, c.y - 40, c.x + 24, c.y - 8, MISSC, 5);
        continue;
      }
      var band = bandAt(c.y);
      var pal = BAL_PALS[band + 1];
      game.draw.sprite(BALLOON, pal, c.x, c.y, 9, { anchor: 'center' });
      if (Math.floor(tt * 3 + i) % 2 === 0) game.draw.rect(c.x - 4, c.y + 38, 8, 8, tint(c.y + 40));
    }
  }

  function drawRoof(r, tt) {
    var roofY = H * 0.68;
    // 手すり(白ドット)と床
    for (var x = 0; x < W; x += 16) game.draw.rect(x, roofY, 10, 4, WHITE);
    for (var p = 30; p < W; p += 120) game.draw.rect(p, roofY, 6, 60, WHITE);
    game.draw.rect(0, roofY + 60, W, 4, WHITE);
    for (var gy = roofY + 110; gy < H; gy += 70) for (var gx = 20 + ((gy / 70) % 2) * 35; gx < W; gx += 70) game.draw.rect(gx, gy, 4, 4, DIM);
    // 給水タンク(帯の中なので帯の色)
    var ty0 = H * 0.585;
    var tc = tint(ty0 + 40);
    game.draw.rect(50, ty0, 150, 6, tc); game.draw.rect(50, ty0 + 110, 150, 6, tc);
    game.draw.rect(50, ty0, 6, 116, tc); game.draw.rect(194, ty0, 6, 116, tc);
    for (var l = 0; l < 3; l++) game.draw.rect(70 + l * 50, ty0 + 116, 6, roofY - ty0 - 116, WHITE);
    // 風速計(拍で速く回る)
    var ax = W * 0.88, ay = H * 0.6;
    var ac = tint(ay);
    game.draw.rect(ax - 3, ay, 6, roofY - ay, WHITE);
    for (var cu = 0; cu < 3; cu++) {
      var ang = r.cupA + cu * 2.094;
      var cx = ax + Math.cos(ang) * 60, cy = ay + Math.sin(ang) * 14;
      game.draw.line(ax, ay, cx, cy, ac, 4);
      game.draw.circle(cx, cy, 12, ac);
    }
    // 部長と旗
    var cf = r.flag;
    game.draw.sprite(CAPTAIN[cf], PERSON_PAL, W * 0.2, H * 0.735, 11, { anchor: 'center' });
    var fx = W * 0.2 + 50, fy = cf === 2 ? H * 0.655 : cf === 1 ? H * 0.69 : H * 0.72;
    game.draw.rect(fx, fy, 6, H * 0.74 - fy, WHITE);
    game.draw.rect(fx + 6, fy, 70, 44, cf === 2 ? MISSC : WHITE, cf === 0 ? 0.4 : 1);
    if (cf === 2) game.draw.rect(fx + 6, fy + 14, 70, 14, WHITE);
  }

  function drawLauncher(r, tt) {
    var notch = r.hold ? r.hold.notch : 0;
    var engaged = r.hold && r.hold.engaged;
    var hy = PAD_Y + 150 + notch * NOTCH_GAP + (engaged ? 10 : 0);
    // 枠
    game.draw.rect(PAD_X - 130, PAD_Y, 8, 330, WHITE);
    game.draw.rect(PAD_X + 122, PAD_Y, 8, 330, WHITE);
    game.draw.rect(PAD_X - 130, PAD_Y + 326, 260, 8, WHITE);
    // 爪の目盛り(帯の色)
    for (var i = 1; i <= BANDS.length; i++) {
      var y = PAD_Y + 150 + i * NOTCH_GAP;
      var got = i <= notch;
      game.draw.rect(PAD_X + 134, y - 4, got ? 48 : 26, 8, BANDS[i - 1].col, got ? 1 : 0.5);
      game.draw.rect(PAD_X - 160, y - 4, got ? 26 : 14, 8, BANDS[i - 1].col, got ? 1 : 0.5);
    }
    if (r.clickF > 0) game.draw.rect(PAD_X + 134, hy - 6, 60, 12, WHITE, r.clickF / 0.12);
    // ばね(ジグザグ)
    var top = PAD_Y + 26, seg = 10;
    for (var s = 0; s < seg; s++) {
      var y0 = top + (hy - top) * (s / seg), y1 = top + (hy - top) * ((s + 1) / seg);
      game.draw.line(PAD_X + (s % 2 ? 70 : -70), y0, PAD_X + (s % 2 ? -70 : 70), y1, WHITE, 5);
    }
    // 台座と取っ手
    game.draw.rect(PAD_X - 100, PAD_Y, 200, 26, WHITE);
    game.draw.rect(PAD_X - 110, hy, 220, 22, engaged ? WHITE : DIM);
    if (r.padF > 0) game.draw.circle(PAD_X, PAD_Y, 150 * (1 - r.padF / 0.3) + 40, WHITE, r.padF);
    // 台の上の気球(次の1個)
    var cb = curB(r);
    if (cb) {
      game.draw.sprite(BALLOON, BAL_PALS[0], PAD_X, PAD_Y - 60 + Math.sin(tt * 3) * 4, 9, { anchor: 'center' });
      game.draw.line(PAD_X, PAD_Y - 18, PAD_X, PAD_Y, WHITE, 3);
    }
    // 学生
    var sf = r.hold ? 1 : r.student;
    game.draw.sprite(STUDENT[sf], PERSON_PAL, W * 0.8, H * 0.83, 13, { anchor: 'center' });
    if (r.hold) game.draw.line(W * 0.8 - 60, H * 0.83 - 20, PAD_X + 110, hy + 10, WHITE, 6);
  }

  function drawDrag() {
    if (!drag || !game.input.pressing) return;
    for (var i = 0; i <= 8; i++) {
      var x = drag.x0 + (drag.x - drag.x0) * (i / 8), y = drag.y0 + (drag.y - drag.y0) * (i / 8);
      game.draw.rect(x - 4, y - 4, 8, 8, WHITE);
    }
  }

  function drawHud(r, tt) {
    game.draw.rect(0, 0, W, H * 0.115, BLACK);
    game.draw.rect(0, H * 0.115, W, 4, WHITE);
    txt(String(r.score), 40, 62, 50, WHITE, 'left');
    txt(r.launched + ' / ' + r.bs.length, W / 2, 62, 42, WHITE);
    for (var i = 0; i < LIVES; i++) {
      var alive = i < LIVES - r.miss;
      game.draw.sprite(BALLOON, alive ? BAL_PALS[0] : BAL_MISS, W - 60 - i * 64, 62, 5, { anchor: 'center' });
    }
    // 拍ランプ: 今の小節の拍数だけ並ぶ。切り替えの予告中は次の拍数が下で点滅
    var m = r.meters[Math.min(r.meters.length - 1, r.bar)];
    for (var k = 0; k < m; k++) {
      var x = W / 2 + (k - (m - 1) / 2) * 150, y = 160;
      game.draw.rect(x - 50, y - 16, 100, 32, DIM);
      if (k === r.q && r.beatF > 0 && r.k >= 0) game.draw.rect(x - 50, y - 16, 100, 32, k === 0 ? MISSC : WHITE);
    }
    if (r.annT > 0 && Math.floor(tt * 8) % 2 === 0) {
      for (var a = 0; a < r.annMeter; a++) {
        var ax = W / 2 + (a - (r.annMeter - 1) / 2) * 150;
        game.draw.rect(ax - 50, 196, 100, 8, WHITE);
      }
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.18, H * 0.6, 46, WHITE);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 108, won ? STYLE.main[2] : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.2, W - 160, H * 0.36, BLACK);
    game.draw.rect(80, H * 0.2, W - 160, 6, WHITE);
    game.draw.rect(80, H * 0.56 - 6, W - 160, 6, WHITE);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, won ? STYLE.main[2] : MISSC);
    txt(run.launched + ' / ' + CUES.length, W / 2, H * 0.31, 62, WHITE);
    txt('SCORE ' + run.score, W / 2, H * 0.365, 50, STYLE.accent[0]);
    txt('PERFECT ' + run.perf, W / 2, H * 0.41, 40, WHITE);
    txt('COMBO ' + run.maxCombo, W / 2, H * 0.45, 40, WHITE);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.495, 54, STYLE.accent[0]);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.495, 42, WHITE);
    if (!won) txt('あと' + (CUES.length - run.launched) + '個!', W / 2, H * 0.535, 46, STYLE.main[1]);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 42, WHITE);
  }

  game.onUpdate(function (dt) {
    if (dt > 0.1) dt = 0.1;
    var tt = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawSky(demo.run, tt);
      drawBalloons(demo.run, tt);
      drawRoof(demo.run, tt);
      drawLauncher(demo.run, tt);
      drawHud(demo.run, tt);
      game.draw.rect(0, 0, W, H * 0.115, BLACK);
      txt(GAME_TITLE, W / 2, 84, 88, WHITE);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 172, 38, STYLE.accent[0]);
      game.draw.hand(PAD_X + 40, demo.hy, { press: demo.press, scale: 16 });
      if (Math.floor(tt * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, WHITE);
      else txt('TAP TO START', W / 2, H * 0.965, 42, STYLE.accent[0]);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(PAD_X, PAD_Y - 120, { text: 'MISS', flashColor: MISSC });
          haltB.frz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        if (!curB(run) && run.t > CUES[CUES.length - 1][0] * SPB + 0.5) finish(run.miss < LIVES);
        else if (run.t > TIME_LIMIT + 0.6) finish(run.miss < LIVES);
      }
    }

    drawSky(run, tt);
    drawBalloons(run, tt);
    drawRoof(run, tt);
    drawLauncher(run, tt);
    drawDrag();
    drawHud(run, tt);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.29, 120, WHITE);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
