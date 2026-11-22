// K-DS-0024v3-cloud-ledge-palm-wait.js
// 雲海の手合わせ — 師の構えがほどける裏拍のぎりぎりまで待ち、差し出された掌に自分の掌をそっと合わせる。早すぎても届かなくても、隙との差を秒で見せる
// 操作: 師が構えをほどいて掌の当て板を差し出す場所(左・中・右)を、その裏拍の瞬間にタップして掌を合わせる(タップした瞬間で判定)。0.6秒前にその場所がほのかに光り、師の肩がそちらへ傾く。裏拍ちょうど〜わずかに後ならPERFECT、少し遅いとGOOD。待ちきれずに早く出すと組んだ腕に止められ「あと○秒」でMISS。場所違い・合わせそびれもMISS。隙のない時のタップは腕で受け流されるだけ(連続が切れる)。拍は枝に吊った鈴の振り子で見え、鈴が真ん中を通る瞬間が裏拍
// 終わり: 7小節(112BPM・15秒・15回の隙)を合わせ切ればCLEAR(近さの点+連続+残りの灯)。MISS3回でGAME OVER
// @mechanic: near_miss
// @theme: summit_ledge_palm_drill
// 世界観: 雲海を見下ろす夜明けの山頂の岩棚で、修行者が向き合う師の構えのほどける裏拍を待ち、差し出された当て板付きの掌へ、ぎりぎりまで待ってから自分の掌を合わせる手合わせの稽古
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・合わせた回数・PERFECT/GOOD/MISS数・裏拍との最小差(秒)・最大連続
// スタイル: HD POST 3D
var STYLE = { bg: ['#2e2a26', '#6e6152'], main: ['#b8a68a', '#5a5048', '#d8c8a8'], accent: ['#e0a050', '#c05a40'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色寄りの低彩度、逆光のブルーム(半透明円の重ね)、四辺のビネット、潰したコントラスト
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], stone: STYLE.main[0], dark: STYLE.main[1], pale: STYLE.main[2],
    amber: STYLE.accent[0], rust: STYLE.accent[1], ink: '#16120e', robe: '#7c6e5c', gi: '#a89a84', hair: '#2a2420', skin: '#b08a6a'
  };

  var GAME_TITLE = 'CLOUD PALM';
  var BPM = 112, SPB = 60 / BPM, E8 = SPB / 2, BAR = SPB * 4;
  var BARS = 7;
  var TIME_LIMIT = 15;                 // 7小節 × 約2.14秒
  var READY_T = 0.8;
  var EARLY_LOOK = 0.45;               // この秒数より前のタップは「隙のない時」扱い
  var EARLY_W = 0.035;                 // 裏拍よりこれ以上早いと腕に止められる
  var PERFECT_LATE = 0.045, LATE_W = 0.12;
  var TELE_T = 0.6;
  var MISS_MAX = 3;
  var HIT_R = 125;
  var PADS = [{ x: 290, y: 700 }, { x: 540, y: 680 }, { x: 790, y: 700 }];
  var MX = 540, MY = 700;              // 師の立ち位置
  var SX = 540, SY = 1590;             // 弟子(背中)
  var PIV_X = 836, PIV_Y = 300, PEN_L = 190;
  var RULER_Y = 1040, RULER_K = 2000;  // 1秒 = 2000px

  // 1小節の隙の位置(8分の奇数=裏拍)
  var POOL = [
    [[3]], [[7], [5]],
    [[1, 5], [3, 7], [1, 7]], [[1, 5], [3, 7], [1, 7]],
    [[1, 3, 7], [3, 5, 7], [1, 5, 7], [1, 3, 5]], [[1, 3, 7], [3, 5, 7], [1, 5, 7], [1, 3, 5]], [[1, 3, 7], [3, 5, 7], [1, 5, 7], [1, 3, 5]]
  ];
  var DEMO_PAT = [[[3, 0], [7, 2]], [[1, 1], [5, 0]]];

  // 伴奏(オリジナル)。表拍は低い弦だけ、裏拍に和音の刻み
  var ROOTS = ['D2', 'A#1', 'C2', 'A1'];
  var SKANK = [['F4', 'A4', 'F4', 'D5'], ['F4', 'A#4', 'D5', 'A#4'], ['E4', 'G4', 'C5', 'G4'], ['E4', 'A4', 'C#5', 'E5']];

  // ---- スプライト ----
  var MASTER_GUARD = [
    '.....hhhhhh.....', '....hhhhhhhh....', '....hwwwwwwh....', '....sesssses....', '....ssssssss....', '.....sseess.....', '......ssss......',
    '..rrrrrrrrrrrr..', '.rrrrrrrrrrrrrr.', '.rrssssrrssssrr.', '.rrrsssssssssrr.', '.rrrrssssssrrrr.', '.rrrrrrrrrrrrrr.',
    '..rrrbbbbbbrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrr..rrrrr..', '..rrrrr..rrrrr..', '..rrrr....rrrr..', '..ssss....ssss..'
  ];
  var MASTER_OPEN = [
    '.....hhhhhh.....', '....hhhhhhhh....', '....hwwwwwwh....', '....sesssses....', '....ssssssss....', '.....ssssss.....', '......ssss......',
    '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..',
    '..rrrbbbbbbrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrr..rrrrr..', '..rrrrr..rrrrr..', '..rrrr....rrrr..', '..ssss....ssss..'
  ];
  var STUDENT = [
    ['....hhhhhh....', '...hhhhhhhh...', '..whhhhhhhhw..', '...hhhhhhhh...', '....hhhhhh....', '.....ssss.....', '..gggggggggg..', '.gggggggggggg.', 'gggggggggggggg', 'gggggggggggggg'],
    ['....hhhhhh....', '...hhhhhhhh...', '...hhhhhhhhw..', '..whhhhhhhh...', '....hhhhhh....', '.....ssss.....', '..gggggggggg..', '.gggggggggggg.', 'gggggggggggggg', 'gggggggggggggg']
  ];
  var PALM = ['.s.s.s.', '.s.s.s.', '.sssss.', 'ssssss.', 'sssssss', '.sssss.', '..sss..'];
  var BELL = ['..d..', '.yyy.', '.yyy.', 'yyyyy', '..y..'];
  var LAMP = ['.a.', 'aaa', '.y.', 'yyy'];
  var MPAL = { h: C.hair, w: C.pale, s: C.skin, e: C.ink, r: C.robe, b: C.dark };
  var SPAL = { h: C.hair, w: C.pale, s: C.skin, g: C.gi };
  var HPAL = { s: C.skin };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, score, combo, maxCombo, nPerfect, nGood, nMiss, misses, bestGap, nearEarly, judge;
  var hitStop, over, won, timeUp, outroT, lastE, lastCue, demoMode, prevBest, resultT, realT;
  var reach, failX, failY, ripples, beatPulse, milestoneDone, swayT;

  function buildEvents(demo) {
    evs = [];
    var bars = [];
    if (demo) bars = DEMO_PAT;
    else {
      var lastPos = -1;
      for (var b = 0; b < BARS; b++) {
        var opts = POOL[b];
        var pick = opts[Math.floor(game.random(0, opts.length)) % opts.length];
        var bar = [];
        for (var i = 0; i < pick.length; i++) {
          var pos = Math.floor(game.random(0, 3)) % 3;
          if (pos === lastPos) pos = (pos + 1 + (Math.floor(game.random(0, 2)) % 2)) % 3;
          lastPos = pos;
          bar.push([pick[i], pos]);
        }
        bars.push(bar);
      }
    }
    for (var bb = 0; bb < bars.length; bb++) {
      for (var j = 0; j < bars[bb].length; j++) {
        var ei = bb * 8 + bars[bb][j][0];
        evs.push({ i: ei, t: ei * E8, pos: bars[bb][j][1], res: 0, teled: false, rang: false, d: 0 });
      }
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.4 : -READY_T;
    buildEvents(demo);
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; misses = 0; bestGap = 9; nearEarly = 9; judge = null;
    hitStop = 0; over = false; won = false; timeUp = false; outroT = 0; lastE = -1; lastCue = -1; prevBest = game.best; resultT = 0; realT = 0;
    reach = null; failX = -999; failY = -999; ripples = []; beatPulse = 0; milestoneDone = false; swayT = 0;
  }

  // ---- 拍クロック ----
  function cueBeats() {
    var q = Math.floor((clock + 0.06) / SPB);
    if (q > lastCue && q >= 0 && q < BARS * 4) { lastCue = q; if (!demoMode) playBeat(q); }
  }
  function playBeat(q) {
    var bar = Math.floor(q / 4) % 4, k = q % 4;
    game.audio.melody([['R', 0.5], [SKANK[bar][k], 0.35], ['R', 0.15]], {
      tempo: BPM, wave: 'square', volume: 0.028,
      bass: [[k === 0 || k === 2 ? ROOTS[bar] : 'R', 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: 0.11
    });
  }
  function onEighth(i) {
    if (i < 0 || i >= BARS * 8) return;
    if (i % 2 === 0) beatPulse = 1;
    if (demoMode) return;
    var opening = false;
    for (var j = 0; j < evs.length; j++) if (evs[j].i === i) opening = true;
    // 鈴: 真ん中を通る裏拍で鳴る。隙の裏拍は澄んだ高い音
    if (opening) game.audio.tone('E6', 0.3, { wave: 'triangle', volume: 0.06 });
    else if (i % 2 === 1) game.audio.tone('A5', 0.05, { wave: 'triangle', volume: 0.014 });
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var ei = Math.floor(clock / E8);
    while (lastE < ei) { lastE++; onEighth(lastE); }
    if (over) return;
    for (var j = 0; j < evs.length; j++) {
      var e = evs[j];
      if (!e.teled && clock >= e.t - TELE_T) {
        e.teled = true; swayT = TELE_T;
        if (!demoMode) game.audio.tone(330, 0.32, { wave: 'sine', volume: 0.04, slide: 220 });
      }
      // 合わせそびれ(師が掌を引く)
      if (!e.res && clock > e.t + LATE_W) {
        e.res = 4;
        miss('late', PADS[e.pos].x, PADS[e.pos].y, null);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && clock >= TIME_LIMIT + LATE_W) finishRun(true);
  }

  // ---- 判定 ----
  function miss(kind, x, y, d) {
    combo = 0; nMiss++; misses++;
    hitStop = 0.4; failX = x; failY = y;
    if (kind === 'early') nearEarly = Math.min(nearEarly, Math.abs(d));
    judge = { kind: kind, d: d, t: 1.1 };
    game.feedback.bad(x, y - 40, { text: 'MISS', color: C.rust, flashColor: C.pale, shake: demoMode ? 3 : 10, volume: demoMode ? 0.03 : 0.55 });
    if (!demoMode) {
      if (misses >= MISS_MAX) { game.audio.play('se_break', 0.35); finishRun(false); }
    }
  }

  // 掌を出す(本番の指もATTRACTのゴーストも同じ関数)
  function touch(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      var d0 = clock - e.t;
      if (d0 >= -EARLY_LOOK && d0 <= LATE_W && Math.abs(d0) < bd) { bd = Math.abs(d0); best = e; }
    }
    if (!best) {
      // 隙のない時: 組んだ腕で静かに受け流される(連続だけ切れる)
      combo = 0;
      reach = { x: x, y: y, t0: 0.28, t: 0.28, ok: false, block: true, tx: MX + (x - MX) * 0.35, ty: MY - 20 };
      game.feedback.bad(x, y, { text: null, color: C.rust, shake: 2, volume: demoMode ? 0.02 : 0.25 });
      return 'guard';
    }
    var d = clock - best.t;
    var pad = PADS[best.pos];
    var dist = Math.sqrt((x - pad.x) * (x - pad.x) + (y - pad.y) * (y - pad.y));
    if (d < -EARLY_W) {
      best.res = 3;
      reach = { x: x, y: y, t0: 0.3, t: 0.3, ok: false, block: true, tx: MX + (x - MX) * 0.35, ty: MY - 20 };
      miss('early', MX + (x - MX) * 0.35, MY - 20, d);
      return 'early';
    }
    if (dist > HIT_R) {
      best.res = 3;
      reach = { x: x, y: y, t0: 0.3, t: 0.3, ok: false, block: false, tx: x, ty: y };
      miss('spot', x, y, d);
      return 'spot';
    }
    var grade = d <= PERFECT_LATE ? 1 : 2;
    best.res = grade; best.d = d;
    reach = { x: pad.x, y: pad.y, t0: 0.32, t: 0.32, ok: true, block: false, tx: pad.x, ty: pad.y };
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    bestGap = Math.min(bestGap, Math.abs(d));
    score += Math.max(100, Math.round(300 - Math.max(0, d) * 1500)) + Math.min(10, combo) * 20;
    judge = { kind: grade === 1 ? 'perfect' : 'good', d: d, t: 1.0 };
    ripples.push({ x: pad.x, y: pad.y, t: 0 });
    game.feedback.good(pad.x, pad.y - 110, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.amber : C.pale, size: grade === 1 ? 60 : 48,
      count: grade === 1 ? 16 : 9, flashColor: C.pale, volume: demoMode ? 0.03 : 0.15
    });
    if (!demoMode) {
      game.audio.tone(grade === 1 ? 'B5' : 'G5', 0.18, { wave: 'triangle', volume: 0.06 });
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 170, 330, { color: C.amber, size: 60 });
      if (!milestoneDone && nPerfect + nGood >= 7) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 470, { color: C.pale, size: 88 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 300 + 300;
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 152, 520 + (i % 2) * 80, { color: i % 2 ? C.amber : C.pale, count: 16, speed: 360 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = {
      score: score, matched: nPerfect + nGood, perfect: nPerfect, good: nGood, miss: nMiss,
      bestGapMs: bestGap < 9 ? Math.round(bestGap * 1000) : null, maxCombo: maxCombo
    };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var res = touch(x, y);
    if (res === 'guard') game.audio.tone(150, 0.08, { wave: 'triangle', volume: 0.05 });
    else if (res === 'early' || res === 'spot') game.audio.tone(120, 0.14, { wave: 'sawtooth', volume: 0.05, slide: -40 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r * 1.9, col, a * 0.25);
    game.draw.circle(x, y, r * 1.35, col, a * 0.45);
    game.draw.circle(x, y, r, col, a);
  }
  // 三角形を横1pxストリップで塗る代わりに8px帯で(山の稜線)
  function peak(cx, base, w, h, col, a) {
    for (var y = 0; y < h; y += 8) {
      var ww = w * (y / h);
      game.draw.rect(cx - ww / 2, base - h + y, ww, 8, col, a);
    }
  }

  // ---- 描画 ----
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.3, C.sky1], [0.42, '#9a8468'], [0.46, '#6a5c4c'], [1, '#2a241e']]);
    // 夜明けの逆光(師の背後)
    bloom(MX, 640, 90 + beatPulse * 10, '#e8c890', 0.35);
    // 雲海の上に突き出た遠い峰
    peak(150, 810, 300, 200, '#4e4438', 0.85);
    peak(940, 820, 380, 250, '#463e34', 0.85);
    peak(720, 810, 200, 110, '#5a4e40', 0.7);
    // 雲海(ゆっくり流れる半透明の層)
    for (var l = 0; l < 3; l++) {
      for (var c = 0; c < 9; c++) {
        var cx = ((c * 170 + t * (12 + l * 8) + l * 60) % (W + 300)) - 150;
        var cy = 790 + l * 34 + Math.sin(c * 1.7 + l) * 10;
        game.draw.circle(cx, cy, 70 + l * 18 + (c % 3) * 12, l === 2 ? '#a89478' : '#c8b494', 0.22 + l * 0.08);
      }
    }
    // 岩棚(奥へ収束するひび)
    game.draw.gradient(860, H, [[0, '#6a5e50'], [0.4, '#4a4036'], [1, '#221c18']]);
    game.draw.rect(0, 856, W, 10, '#8a7a64', 0.6);
    for (var k = -4; k <= 4; k++) game.draw.line(MX + k * 40, 866, MX + k * 260, H, '#1c1612', 3);
    for (var r = 0; r < 6; r++) game.draw.line(0, 920 + r * r * 32, W, 920 + r * r * 32, '#1c1612', 2);
    // 松と鈴の振り子(右)
    game.draw.line(1010, 860, 980, 560, '#3a2e24', 34);
    game.draw.line(980, 560, 960, 280, '#3a2e24', 26);
    game.draw.line(966, 300, PIV_X - 20, PIV_Y - 6, '#3a2e24', 16);
    for (var n = 0; n < 5; n++) {
      game.draw.circle(900 + n * 34, 270 + (n % 2) * 18, 46, '#3e4a36', 0.85);
      game.draw.circle(990 + (n % 3) * 26, 420 + n * 40, 40, '#3e4a36', 0.8);
    }
    drawPendulum();
  }

  function nextOpening() {
    for (var i = 0; i < evs.length; i++) if (!evs[i].res) return evs[i];
    return null;
  }

  function drawPendulum() {
    var th = 0.45 * Math.cos(Math.PI * Math.max(0, clock) / SPB);
    if (clock < 0) th = 0.45;
    var bx = PIV_X + Math.sin(th) * PEN_L, by = PIV_Y + Math.cos(th) * PEN_L;
    game.draw.line(PIV_X, PIV_Y, bx, by, '#2a2018', 4);
    // 真ん中の目印(裏拍の位置)
    game.draw.rect(PIV_X - 2, PIV_Y + PEN_L + 34, 4, 26, C.pale, 0.6);
    var ne = nextOpening();
    var hot = ne && ne.t - clock <= TELE_T && ne.t - clock > -0.1;
    if (hot) bloom(bx, by + 6, 30, C.amber, 0.4);
    game.draw.sprite(BELL, { d: C.ink, y: hot ? C.amber : '#9a8058' }, bx, by + 8, 10, { anchor: 'center' });
  }

  function drawMaster() {
    var t = game.time.elapsed;
    var bob = Math.sin(Math.PI * Math.max(0, clock) / SPB) * 3;
    var ne = nextOpening();
    var open = null;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res === 3 || e.res === 4) continue;
      if (clock >= e.t - 0.02 && clock <= e.t + LATE_W + 0.12) open = e;
    }
    // 予告: 当て板の出る場所がほのかに光り、肩がそちらへ傾く
    var lean = 0;
    if (ne && !open) {
      var ahead = ne.t - clock;
      if (ahead <= TELE_T && ahead > 0) {
        var k = 1 - ahead / TELE_T;
        var pd = PADS[ne.pos];
        bloom(pd.x, pd.y, 24 + k * 30, C.amber, 0.12 + k * 0.25);
        lean = (pd.x - MX) / 250 * 14 * k;
      }
    }
    var mx = MX + lean, my = MY + bob;
    game.draw.circle(mx, 866, 150, '#000000', 0.25);
    if (open) {
      game.draw.sprite(MASTER_OPEN, MPAL, mx, my, 16, { anchor: 'center' });
      var pd2 = PADS[open.pos];
      var sx = pd2.x < mx - 40 ? mx - 92 : mx + 92;
      var sy = my - 46;
      // 差し出した腕と当て板(掌)
      game.draw.line(sx, sy, pd2.x, pd2.y + 20, C.robe, 38);
      game.draw.circle(pd2.x, pd2.y, 64, C.dark);
      game.draw.circle(pd2.x, pd2.y, 56, C.pale);
      game.draw.circle(pd2.x, pd2.y, 36, '#c8a878');
      game.draw.circle(pd2.x, pd2.y, 12, C.amber);
      if (!open.res) bloom(pd2.x, pd2.y, 66, C.pale, 0.18);
      // もう片方の腕は下ろす
      var ox = sx < mx ? mx + 100 : mx - 100;
      game.draw.line(ox, sy, ox + (ox > mx ? 18 : -18), my + 60, C.robe, 34);
      game.draw.circle(ox + (ox > mx ? 18 : -18), my + 74, 18, C.skin);
    } else {
      game.draw.sprite(MASTER_GUARD, MPAL, mx, my, 16, { anchor: 'center' });
    }
    // 受け流し/止めの瞬間: 白く光って拡大
    if (hitStop > 0 && failX > -900) {
      var q = hitStop / 0.4;
      bloom(failX, failY, 70 + (1 - q) * 50, '#ffffff', 0.35 * q + 0.15);
    }
  }

  function drawStudent() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 3) % 2;
    var bob = beatPulse * 6;
    var sx = SX, sy = SY + bob;
    var shX = sx + 92, shY = sy + 10;
    game.draw.circle(sx, sy + 150, 180, '#000000', 0.2);
    // 構えた手(胸の前)
    var hx = shX + 10, hy = shY - 90;
    if (reach) {
      reach.t -= game.time.delta;
      if (reach.t <= 0) reach = null;
    }
    var pk = 0;
    if (reach) {
      pk = Math.min(1, (reach.t0 - reach.t) / 0.07);
      hx = shX + (reach.tx - shX) * pk; hy = shY + (reach.ty - shY) * pk;
    }
    var flash = hitStop > 0 && reach && !reach.ok;
    // 奥へ伸ばす腕: 手前ほど太く、先の掌は奥ほど小さい
    var mxw = shX + (hx - shX) * 0.5, myw = shY + (hy - shY) * 0.5;
    game.draw.line(shX, shY, mxw, myw, flash ? '#ffffff' : C.gi, flash ? 50 : 42);
    game.draw.line(mxw, myw, hx, hy, flash ? '#ffffff' : C.gi, flash ? 34 : 26);
    game.draw.sprite(PALM, flash ? { s: '#ffffff' } : HPAL, hx, hy, flash ? 13 : 12 - pk * 4, { anchor: 'center' });
    game.draw.sprite(STUDENT[fr], SPAL, sx, sy, 18, { anchor: 'center' });
    // 鉢巻の端(風になびく)
    var wy = sy - 50;
    game.draw.line(sx + 110, wy, sx + 170 + Math.sin(t * 6) * 16, wy + 26 + Math.cos(t * 5) * 10, C.pale, 8);
  }

  function drawRipples() {
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      rp.t += game.time.delta;
      if (rp.t > 0.6) { ripples.splice(i, 1); continue; }
      var r = 60 + rp.t * 320;
      for (var k = 0; k < 18; k++) {
        var a = k / 18 * Math.PI * 2;
        game.draw.circle(rp.x + Math.cos(a) * r, rp.y + Math.sin(a) * r * 0.6, 8, C.pale, 0.7 - rp.t);
      }
    }
  }

  // 隙との差の物差し(真ん中=裏拍、左=早い、右=遅い)
  function drawRuler() {
    var a = judge ? Math.min(1, judge.t) : 0.35;
    var x0 = 140, x1 = 940, cx = 540;
    game.draw.rect(x0, RULER_Y - 6, x1 - x0, 12, C.dark, 0.6 * a + 0.2);
    game.draw.rect(cx - EARLY_W * RULER_K, RULER_Y - 10, (EARLY_W + PERFECT_LATE) * RULER_K, 20, C.amber, 0.55 * a + 0.15);
    game.draw.rect(cx + PERFECT_LATE * RULER_K, RULER_Y - 8, (LATE_W - PERFECT_LATE) * RULER_K, 16, C.pale, 0.35 * a + 0.1);
    for (var s = -4; s <= 4; s++) game.draw.rect(cx + s * 0.05 * RULER_K - 2, RULER_Y + 14, 4, s === 0 ? 26 : 12, C.pale, 0.5 * a + 0.2);
    game.draw.circle(cx, RULER_Y, 14, C.pale, 0.9);
    if (!judge || judge.d === null) return;
    var mx = cx + Math.max(-0.2, Math.min(0.2, judge.d)) * RULER_K;
    var col = judge.kind === 'perfect' ? C.amber : (judge.kind === 'good' ? C.pale : C.rust);
    game.draw.rect(mx - 5, RULER_Y - 44, 10, 88, col, a);
    game.draw.line(cx, RULER_Y - 30, mx, RULER_Y - 30, col, 6);
    var txtStr = judge.d < -EARLY_W ? 'あと' + Math.abs(judge.d).toFixed(2) + '秒' : (judge.d >= 0 ? '+' : '-') + Math.abs(judge.d).toFixed(2) + '秒';
    if (a > 0.05) label(txtStr, Math.max(220, Math.min(860, mx)), RULER_Y - 64, 40, col);
  }

  function post() {
    // コントラストを潰す褐色の膜 + ビネット
    game.draw.rect(0, 0, W, H, '#4a3c2e', 0.1);
    for (var v = 0; v < 4; v++) {
      var w = 30 + v * 30, al = 0.16;
      game.draw.rect(0, 0, w, H, '#000000', al);
      game.draw.rect(W - w, 0, w, H, '#000000', al);
      game.draw.rect(0, H - w, W, w, '#000000', al);
      game.draw.rect(0, 0, W, w * 0.6, '#000000', al * 0.7);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#120e0a', 0.75);
    game.draw.rect(0, 226, W, 4, C.stone, 0.5);
    label('SCORE ' + score, 50, 84, 44, C.pale, 'left');
    if (combo >= 2) label('x' + combo, W - 50, 84, 44, C.amber, 'right');
    // 残りの灯(MISSで消える)
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      if (on) bloom(470 + i * 70, 140, 14, C.amber, 0.25);
      game.draw.sprite(LAMP, { a: on ? C.amber : C.dark, y: on ? C.stone : C.dark }, 470 + i * 70, 150, 10, { anchor: 'center' });
    }
    var remain = Math.max(0, Math.min(1, 1 - clock / TIME_LIMIT));
    game.draw.rect(60, 196, W - 120, 12, C.dark, 0.7);
    game.draw.rect(60, 196, (W - 120) * remain, 12, C.stone);
  }

  function drawScene() {
    drawWorld();
    drawMaster();
    drawRipples();
    drawRuler();
    drawStudent();
    post();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.38;
    game.draw.rect(40, y0, W - 80, hh, '#120e0a', 0.85);
    game.draw.rect(56, y0 + 16, W - 112, 4, C.stone, 0.6);
    game.draw.rect(56, y0 + hh - 20, W - 112, 4, C.stone, 0.6);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.amber : C.rust);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.pale);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.pale);
    label((nPerfect + nGood) + ' / ' + evs.length, W / 2, H * 0.49, 46, C.pale);
    if (bestGap < 9) label(bestGap.toFixed(2) + '秒', W / 2, H * 0.53, 40, C.amber);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.575, 56, C.amber);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.575, 42, C.pale);
    if (!won) {
      if (nearEarly < 9) label('あと' + nearEarly.toFixed(2) + '秒!', W / 2, H * 0.618, 50, C.rust);
      else label('あと' + Math.max(1, evs.length - nPerfect - nGood - nMiss) + '回!', W / 2, H * 0.618, 50, C.rust);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.635 + (won ? 0 : 30), 34, C.pale);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周はぎりぎりで合わせる、偶数周は2回目に待ちきれず早く出して止められる ----
  var demo = { t: 0, x: 540, y: 1300, press: 0, next: 0, cyc: 0, plan: [] };
  var DEMO_CYC = 2 * BAR + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++; demo.next = 0;
      var fail = demo.cyc % 2 === 0;
      demo.plan = [];
      for (var i = 0; i < evs.length; i++) demo.plan.push(evs[i].t + (fail && i === 1 ? -0.08 : (i % 2 ? 0.07 : 0.01)));
    }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var e = evs[demo.next];
    var tx = 540, ty = 1300;
    if (e && e.t - clock < 0.8) { tx = PADS[e.pos].x; ty = PADS[e.pos].y; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 9);
    demo.y += (ty - demo.y) * Math.min(1, dt * 9);
    if (e && hitStop <= 0 && clock >= demo.plan[demo.next]) {
      touch(PADS[e.pos].x, PADS[e.pos].y);
      demo.press = 0.14; demo.next++;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judge) { judge.t -= dt; if (judge.t <= 0) judge = null; }

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#120e0a', 0.75);
      bloom(W / 2, 100, 60, C.amber, 0.12);
      label(GAME_TITLE, W / 2, 112, 92 + Math.sin(t * 2.5) * 3, C.pale);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.amber);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.pale);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { timeUp = true; hitStop = 0; finishRun(true); }
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

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.43, W, 170, '#120e0a', 0.8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.43 + 115, 100, C.pale);
    }
    // 最初の隙だけ、そこへ手を出すゴーストを薄く出す
    if (!over && evs.length && !evs[0].res && clock > evs[0].t - 0.7) {
      var p0 = PADS[evs[0].pos];
      game.draw.hand(p0.x, p0.y, { press: clock >= evs[0].t - 0.03, scale: 13, alpha: 0.55 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
