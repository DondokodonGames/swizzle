// K-DS-0046v2-aerobatic-slot-follow.js
// 端の一機の隊形移り — 隊長の号令の拍ごとに組み替わる隊形で、次の持ち場へ拍の頭ぴったりに自分の機体を滑り込ませ、列の端で足並みを揃える
// 操作: 画面のどこでも押したまま指を動かすと、自分の機体(列の端の白い機・ゴーグルの操縦士)が指の動いた分だけ同じ向きに動く(わずかに遅れてついてくる)。組み替えの1拍前(0.6秒前)に隊長機の翼端灯が光って号令音が鳴り、次の持ち場が点線の輪+縮む外輪+薄い機影で空に出る。外輪が閉じる拍の頭に持ち場へ入ればPERFECT、少し遅れて入るとGOOD、間に合わないとMISS。号令の拍より0.14秒以上早く次の持ち場へ入るのも隊形を崩すのでMISS。組み替えのない拍も隊形はゆっくり流れるので、その拍の頭に今の持ち場の輪から外れているとMISS。下の物差しに拍の頭からの遅れが出る
// 終わり: 8小節(100BPM・約19秒・組み替え22回)を飛び切ればCLEAR(最後は全機でスモークを開く)。MISS4回でGAME OVER
// @mechanic: drag_follow
// @theme: aerobatic_team_formation_slot
// 世界観: 霞んだ夕方の空を飛ぶ曲技飛行チームで、隊列の端を受け持つ新人の操縦士が、隊長の号令の拍ごとに組み替わる隊形の持ち場へ遅れずに機体を寄せていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大連続・持ち場に入った最小の遅れ(秒)
// スタイル: HD POST 3D
var STYLE = { bg: ['#7a7060', '#3c362e'], main: ['#c8b89a', '#8a7a64', '#e6dcc6'], accent: ['#e09a48', '#b8503a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色〜灰に寄せた霞、逆光のブルーム(半透明円の重ね)、四辺のビネット、潰したコントラスト
  var C = {
    hazeTop: '#a09480', haze0: STYLE.bg[0], haze1: STYLE.bg[1],
    sand: STYLE.main[0], earth: STYLE.main[1], cream: STYLE.main[2],
    amber: STYLE.accent[0], rust: STYLE.accent[1],
    ink: '#1a1612', fieldA: '#6e6452', fieldB: '#5c5446', fieldC: '#7a7262', river: '#8e9288', cloud: '#e2d9c6'
  };

  var GAME_TITLE = 'SKY SLOT';
  var BPM = 100, SPB = 60 / BPM, BAR = SPB * 4;
  var BARS = 8, END_T = BARS * BAR;        // 8小節 = 19.2秒
  var TIME_LIMIT = 20;
  var READY_T = 0.8;
  var TELE_T = SPB;                        // 号令は組み替えの1拍前(0.6秒前)
  var EARLY_W = 0.14, PERF_EARLY = 0.10, PERF_LATE = 0.12, LATE_W = 0.32;
  var R_IN = 92, R_HOLD = 132;
  var MISS_MAX = 4;
  var GAIN = 1.15;
  var FX0 = 540, FY0 = H * 0.46;
  var SCROLL = 150;
  var RULER_Y = H * 0.74, RULER_K = 1400;  // 1秒 = 1400px

  // 隊形: [隊長, 僚機1, 僚機2, 僚機3, 自機(端)] 隊形の中心からのずれ
  var FORMS = [
    [[0, -250], [-150, -110], [150, -110], [-300, 30], [300, 30]],          // 矢じり(右端)
    [[0, -250], [-150, -110], [150, -110], [300, 30], [-300, 30]],          // 矢じり(左端)
    [[0, -110], [-170, -110], [170, -110], [-340, -110], [340, -110]],      // 横一列(右端)
    [[0, -110], [170, -110], [-170, -110], [340, -110], [-340, -110]],      // 横一列(左端)
    [[300, -270], [150, -135], [0, 0], [-150, 135], [-300, 270]],           // 斜め(左下へ)
    [[-300, -270], [-150, -135], [0, 0], [150, 135], [300, 270]],           // 斜め(右下へ)
    [[0, -300], [0, -150], [0, 0], [0, 150], [0, 300]]                      // 縦一列
  ];
  var START_FORM = 0;
  // 小節ごとの組み替えの拍(0〜3)。後半ほど詰まる
  var CHANGES = [[1, 3], [1, 3], [0, 2, 3], [0, 1, 3], [0, 2, 3], [0, 1, 2, 3], [0, 1, 3], [0, 2]];
  var DEMO_CHANGES = [[1, 3], [1, 3]];

  // 伴奏(オリジナル・ヘ長調の行進風)。1拍ずつ鳴らして拍クロックと揃える
  var LEAD = [
    [['A4', 0.5], ['C5', 0.5]], [['F5', 1]], [['E5', 0.5], ['F5', 0.5]], [['G5', 1]],
    [['E5', 1]], [['C5', 0.5], ['D5', 0.5]], [['E5', 0.5], ['G5', 0.5]], [['C6', 1]],
    [['A5', 1]], [['F5', 0.5], ['A5', 0.5]], [['G5', 0.5], ['F5', 0.5]], [['D5', 1]],
    [['F5', 1]], [['D5', 0.5], ['F5', 0.5]], [['A#4', 0.5], ['D5', 0.5]], [['C5', 1]],
    [['A4', 0.5], ['C5', 0.5]], [['F5', 1]], [['A5', 0.5], ['G5', 0.5]], [['F5', 1]],
    [['G5', 1]], [['E5', 0.5], ['G5', 0.5]], [['C6', 0.5], ['A#5', 0.5]], [['G5', 1]],
    [['F5', 0.5], ['D5', 0.5]], [['A#4', 1]], [['C5', 0.5], ['D5', 0.5]], [['E5', 1]],
    [['F5', 1]], [['C5', 0.5], ['A4', 0.5]], [['F5', 1]], [['C6', 1]]
  ];
  var ROOT = ['F2', 'C2', 'D2', 'A#1', 'F2', 'C2', 'A#1', 'F2'];
  var FIFTH = ['C3', 'G2', 'A2', 'F2', 'C3', 'G2', 'F2', 'C3'];

  // ---- スプライト(上から見た小型の曲技機。操縦士のゴーグルが顔) ----
  var PLANE = [
    ['..ppppppppp..', '......n......', '.....bbb.....', '....bgkgb....', '....bkkkb....', 'wwwwwbbbwwwww',
     'wsswwwbwwwssw', '.wwwwwbwwwww.', '.....bbb.....', '.....bsb.....', '......b......', '....ttbtt....', '......t......'],
    ['.....ppp.....', '...p..n..p...', '.....bbb.....', '....bgkgb....', '....bkkkb....', 'wwwwwbbbwwwww',
     'wsswwwbwwwssw', '.wwwwwbwwwww.', '.....bbb.....', '.....bsb.....', '......b......', '....ttbtt....', '......t......']
  ];
  var BANK = ['..ppppppppp..', '......n......', '.....bbb.....', '....bgkgb....', '....bkkkb....', '...wwbbbwwwww',
    '...wwwbwwwssw', '....wwbwwwww.', '.....bbb.....', '.....bsb.....', '......b......', '.....tbtt....', '......t......'];
  var ICON = ['..w..', 'wwwww', '..w..', '.www.'];
  var MEPAL = { p: '#3a332a', n: C.amber, b: C.rust, w: '#f6f0e4', s: C.amber, k: '#2a241e', g: '#ffe2a8', t: '#f6f0e4' };
  var TEAMPAL = { p: '#3a332a', n: C.earth, b: C.earth, w: C.cream, s: C.rust, k: '#2a241e', g: '#cfc2a8', t: C.cream };
  var LEADPAL = { p: '#3a332a', n: C.amber, b: C.earth, w: C.cream, s: C.amber, k: '#2a241e', g: '#cfc2a8', t: C.cream };
  var GHOSTPAL = { p: C.amber, n: C.amber, b: C.amber, w: C.amber, s: C.amber, k: C.amber, g: C.amber, t: C.amber };
  var WHITEPAL = { p: '#ffffff', n: '#ffffff', b: '#ffffff', w: '#ffffff', s: '#ffffff', k: '#ffffff', g: '#ffffff', t: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, totalMoves, score, combo, maxCombo, nPerfect, nGood, nMiss, nHold, bestDelay, nearLate, judge;
  var hitStop, over, won, outroT, lastBeat, lastCue, demoMode, prevBest, realT, beatPulse, callT, milestoneDone, graceUntil;
  var me, drag, puffs, emitT, revT, progress, resultT, missX, missY;

  function clampX(v) { return Math.max(70, Math.min(W - 70, v)); }
  function clampY(v) { return Math.max(380, Math.min(1400, v)); }
  function meSlot(f) { return FORMS[f][4]; }
  function slotDist(a, b) { var p = meSlot(a), q = meSlot(b); return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1])); }

  function pickForms(n) {
    var seq = [], cur = START_FORM;
    for (var i = 0; i < n; i++) {
      var opts = [];
      for (var f = 0; f < FORMS.length; f++) if (f !== cur && slotDist(f, cur) >= 230) opts.push(f);
      var nf = opts[Math.floor(game.random(0, opts.length)) % opts.length];
      seq.push(nf); cur = nf;
    }
    return seq;
  }

  function buildEvents(demo) {
    evs = [];
    var ch = demo ? DEMO_CHANGES : CHANGES;
    var n = 0;
    for (var b = 0; b < ch.length; b++) n += ch[b].length;
    var seq = demo ? [6, 2, 4, 0] : pickForms(n);
    var k = 0;
    for (var bb = 0; bb < ch.length; bb++) {
      for (var q = 0; q < 4; q++) {
        var beat = bb * 4 + q;
        if (ch[bb].indexOf(q) >= 0) evs.push({ kind: 'move', t: beat * SPB, form: seq[k++], res: 0, lateWatch: false, d: 0 });
        else if (beat > 0) evs.push({ kind: 'hold', t: beat * SPB, res: 0 });
      }
    }
    totalMoves = n;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.2 : -READY_T;
    buildEvents(demo);
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nHold = 0; bestDelay = 9; nearLate = 9; judge = null;
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -1; lastCue = -1; prevBest = game.best; realT = 0;
    beatPulse = 0; callT = 0; milestoneDone = false; graceUntil = -9; resultT = 0; missX = -999; missY = -999;
    var s0 = slotXY(START_FORM, 4, 0);
    me = { x: s0.x, y: s0.y, tx: s0.x, ty: s0.y, px: s0.x };
    drag = null; if (!puffs) puffs = []; emitT = 0; revT = 0; progress = 0;
  }

  // ---- 隊形の座標 ----
  function center(t) { return { x: FX0 + 70 * Math.sin(t * 0.8), y: FY0 + 36 * Math.sin(t * 0.6 + 1.2) }; }
  function slotXY(form, i, t) {
    var c = center(t);
    return { x: c.x + FORMS[form][i][0], y: c.y + FORMS[form][i][1] };
  }
  function formState() {
    var cur = START_FORM, prev = START_FORM, t0 = -9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.kind !== 'move') continue;
      if (e.t <= clock) { prev = cur; cur = e.form; t0 = e.t; } else break;
    }
    return { cur: cur, prev: prev, t0: t0 };
  }
  function formAt(time) {
    var cur = START_FORM;
    for (var i = 0; i < evs.length; i++) if (evs[i].kind === 'move' && evs[i].t <= time) cur = evs[i].form;
    return cur;
  }
  function planePos(i) {
    var fs = formState();
    var k = Math.max(0, Math.min(1, (clock - fs.t0) / 0.22));
    var e = 1 - Math.pow(1 - k, 3);
    var a = slotXY(fs.prev, i, clock), b = slotXY(fs.cur, i, clock);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, moving: k < 1 };
  }
  function nextMove() {
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.kind === 'move' && !e.res) return e;
    }
    return null;
  }
  function moveAhead(q) {
    for (var i = 0; i < evs.length; i++) if (evs[i].kind === 'move' && Math.abs(evs[i].t - q * SPB) < 0.01) return true;
    return false;
  }
  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }

  // ---- 拍クロック ----
  function cueBeats() {
    var q = Math.floor((clock + 0.06) / SPB);
    if (q > lastCue && q >= 0 && q < BARS * 4) { lastCue = q; if (!demoMode && !over) playBeat(q); }
  }
  function playBeat(q) {
    var bar = Math.floor(q / 4) % 8, k = q % 4;
    game.audio.melody(LEAD[q % LEAD.length], {
      tempo: BPM, wave: 'square', volume: 0.032,
      bass: [[k % 2 === 0 ? ROOT[bar] : FIFTH[bar], 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: 0.1
    });
  }
  function onBeat(q) {
    if (q < 0 || q >= BARS * 4) return;
    beatPulse = 1;
    var call = moveAhead(q + 1);
    if (call) callT = 0.35;
    if (moveAhead(q) && !demoMode) game.audio.tone(420, 0.12, { wave: 'sawtooth', volume: 0.025, slide: -260 });
    if (demoMode || over) return;
    if (q % 2 === 0) game.audio.tone(70, 0.12, { wave: 'sine', volume: 0.12, slide: -30 });
    else game.audio.tone(190, 0.05, { wave: 'square', volume: 0.025 });
    // 隊長の号令(次の拍で組み替え)
    if (call) game.audio.tone('D6', 0.14, { wave: 'triangle', volume: 0.05, slide: 320 });
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var bi = Math.floor(clock / SPB);
    while (lastBeat < bi) { lastBeat++; onBeat(lastBeat); }
    me.px = me.x;
    me.x += (me.tx - me.x) * Math.min(1, dt * 18);
    me.y += (me.ty - me.y) * Math.min(1, dt * 18);
    if (over) return;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      if (e.kind === 'move') {
        if (clock < e.t - TELE_T) continue;
        var s = slotXY(e.form, 4, clock);
        var inside = dist(me, s) <= R_IN;
        if (clock <= e.t + LATE_W) {
          if (inside) { judgeMove(e, clock - e.t, s); if (hitStop > 0 || over) return; }
        } else {
          e.res = 4; e.lateWatch = true;
          miss('late', s.x, s.y, null);
          return;
        }
      } else if (clock >= e.t) {
        var s2 = slotXY(formAt(e.t), 4, clock);
        if (e.t < graceUntil) { e.res = 5; continue; }
        if (dist(me, s2) > R_HOLD) { e.res = 4; miss('drift', me.x, me.y, null); return; }
        e.res = 1; nHold++; score += 40;
        if (!demoMode) game.fx.burst(me.x, me.y + 50, { color: C.cream, count: 4, speed: 120 });
      }
    }
    // 遅れたMISSの「あと何秒で入れたか」を測る
    for (var j = 0; j < evs.length; j++) {
      var m = evs[j];
      if (!m.lateWatch) continue;
      if (clock > m.t + LATE_W + 0.6) { m.lateWatch = false; continue; }
      var s3 = slotXY(m.form, 4, clock);
      if (dist(me, s3) <= R_IN) { nearLate = Math.min(nearLate, clock - (m.t + LATE_W)); m.lateWatch = false; }
    }
    if (!demoMode && clock >= END_T) finishRun(true);
  }

  // ---- 判定 ----
  function judgeMove(e, d, s) {
    if (d < -EARLY_W) {
      e.res = 3; e.d = d;
      miss('early', s.x, s.y, d);
      return;
    }
    var grade = (d >= -PERF_EARLY && d <= PERF_LATE) ? 1 : 2;
    e.res = grade; e.d = d;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    bestDelay = Math.min(bestDelay, Math.abs(d));
    score += (grade === 1 ? 300 : 150) + Math.min(10, combo) * 20;
    judge = { kind: grade === 1 ? 'perfect' : 'good', d: d, t: 1.0 };
    game.feedback.good(s.x, s.y - 110, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.amber : C.cream, size: grade === 1 ? 58 : 46,
      count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.14
    });
    if (!demoMode) {
      game.audio.tone(grade === 1 ? 'A5' : 'F5', 0.16, { wave: 'triangle', volume: 0.06 });
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 170, 330, { color: C.amber, size: 60 });
      if (!milestoneDone && nPerfect + nGood >= Math.ceil(totalMoves / 2)) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 460, { color: C.cream, size: 90 });
        game.audio.play('se_milestone', 0.45);
      }
    }
  }

  function miss(kind, x, y, d) {
    combo = 0; nMiss++;
    hitStop = 0.4; missX = x; missY = y;
    graceUntil = clock + SPB * 1.2;
    judge = { kind: kind, d: d, t: 1.1 };
    game.feedback.bad(x, y - 70, { text: 'MISS', color: C.rust, flashColor: C.cream, shake: demoMode ? 3 : 10, volume: demoMode ? 0.03 : 0.5 });
    if (!demoMode && nMiss >= MISS_MAX) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - nMiss) * 200 + 500;
      for (var i = 0; i < 5; i++) {
        var p = i < 4 ? planePos(i) : me;
        game.fx.burst(p.x, p.y + 60, { color: i % 2 ? C.amber : C.cream, count: 18, speed: 380 });
      }
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = {
      score: score, moved: nPerfect + nGood, total: totalMoves, perfect: nPerfect, good: nGood, miss: nMiss,
      held: nHold, maxCombo: maxCombo, bestDelayMs: bestDelay < 9 ? Math.round(bestDelay * 1000) : null
    };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    drag = { x: x, y: y };
    game.audio.tone(620, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag || over) return;
    var dx = x - drag.x, dy = y - drag.y;
    drag.x = x; drag.y = y;
    if (hitStop > 0) return;
    me.tx = clampX(me.tx + dx * GAIN);
    me.ty = clampY(me.ty + dy * GAIN);
    if (Math.abs(dx) + Math.abs(dy) > 40 && revT <= 0) {
      revT = 0.3;
      game.audio.tone(170, 0.14, { wave: 'sawtooth', volume: 0.02, slide: 140 });
    }
  });

  game.onRelease(function(x, y) {
    if (!drag) return;
    drag = null;
    if (state === S.PLAYING && !over) game.audio.tone(440, 0.03, { wave: 'triangle', volume: 0.02 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r * 1.9, col, a * 0.22);
    game.draw.circle(x, y, r * 1.35, col, a * 0.42);
    game.draw.circle(x, y, r, col, a);
  }
  function ring(x, y, r, col, w, dashed) {
    var n = 36;
    for (var i = 0; i < n; i++) {
      if (dashed && i % 2) continue;
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }

  // ---- 描画: 霞んだ地上(遠く下を流れる)と雲 ----
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.hazeTop], [0.4, C.haze0], [1, C.haze1]]);
    var base = t * SCROLL * 0.5;
    // 畑のつぎはぎ
    var off = base % 230, b0 = Math.floor(base / 230);
    for (var j = 0; j < 10; j++) {
      var yy = j * 230 + off - 230, idx = b0 - j;
      var x = -60 + ((idx * 53) % 90 + 90) % 90;
      for (var k = 0; k < 5; k++) {
        var w = 190 + (((idx * 31 + k * 57) % 140) + 140) % 140;
        var col = (idx + k) % 3 === 0 ? C.fieldA : ((idx + k) % 3 === 1 ? C.fieldB : C.fieldC);
        game.draw.rect(x, yy, w - 12, 218, col, 0.5);
        x += w;
      }
    }
    // 蛇行する川
    var off2 = base % 60, b2 = Math.floor(base / 60);
    for (var r = 0; r < 34; r++) {
      var ry = r * 60 + off2 - 60;
      var rx = 300 + 170 * Math.sin((b2 - r) * 0.22);
      game.draw.circle(rx, ry, 40, C.river, 0.45);
    }
    // 太陽の照り返し
    bloom(860, 330, 70 + beatPulse * 6, '#f2dcae', 0.28);
    // 近い雲(速く流れる)
    var base3 = t * SCROLL * 1.6;
    var off3 = base3 % 520, b3 = Math.floor(base3 / 520);
    for (var c = 0; c < 6; c++) {
      var cy = c * 520 + off3 - 520, ci = b3 - c;
      var cx = 120 + (((ci * 377) % 840) + 840) % 840;
      game.draw.circle(cx, cy, 130, C.cloud, 0.14);
      game.draw.circle(cx + 90, cy + 40, 100, C.cloud, 0.14);
      game.draw.circle(cx - 80, cy + 50, 90, C.cloud, 0.12);
    }
  }

  // ---- スモーク(拍の頭ごとに太い玉になる) ----
  function updPuffs(dt) {
    emitT -= dt;
    if (revT > 0) revT -= dt;
    if (emitT <= 0) {
      emitT = 0.05;
      var big = beatPulse > 0.8;
      for (var i = 0; i < 4; i++) {
        var p = planePos(i);
        puffs.push({ x: p.x + game.random(-4, 4), y: p.y + 56, r: big ? 22 : 13, a: 0.5, me: false });
      }
      puffs.push({ x: me.x + game.random(-4, 4), y: me.y + 56, r: big ? 24 : 14, a: 0.55, me: true });
    }
    for (var j = puffs.length - 1; j >= 0; j--) {
      var q = puffs[j];
      q.y += 420 * dt; q.r += 26 * dt; q.a -= 0.42 * dt;
      if (q.a <= 0 || q.y > H + 60) puffs.splice(j, 1);
    }
    if (puffs.length > 220) puffs.splice(0, puffs.length - 220);
  }
  function drawPuffs() {
    for (var i = 0; i < puffs.length; i++) {
      var q = puffs[i];
      game.draw.circle(q.x, q.y, q.r, q.me ? '#f0c890' : C.cream, q.a);
    }
  }

  function drawSlots() {
    var fs = formState();
    var cur = slotXY(fs.cur, 4, clock);
    ring(cur.x, cur.y, R_IN, C.sand, 3, false);
    var ne = nextMove();
    if (ne && clock >= ne.t - TELE_T) {
      var k = Math.max(0, Math.min(1, (ne.t - clock) / TELE_T));
      var s = slotXY(ne.form, 4, clock);
      bloom(s.x, s.y, 40, C.amber, 0.1 + (1 - k) * 0.12);
      game.draw.sprite(PLANE[0], GHOSTPAL, s.x, s.y, 8, { anchor: 'center', alpha: 0.28 });
      ring(s.x, s.y, R_IN, C.amber, 5, true);
      ring(s.x, s.y, R_IN + k * 150, C.amber, 3, false);
      // 自機から次の持ち場への点線
      var n = 10;
      for (var i = 1; i < n; i += 2) {
        var a = i / n, b2 = (i + 0.6) / n;
        game.draw.line(me.x + (s.x - me.x) * a, me.y + (s.y - me.y) * a, me.x + (s.x - me.x) * b2, me.y + (s.y - me.y) * b2, C.amber, 3);
      }
    }
  }

  function drawTeam() {
    var fr = Math.floor(game.time.elapsed * 14) % 2;
    for (var i = 3; i >= 0; i--) {
      var p = planePos(i);
      var bob = Math.sin(game.time.elapsed * 3 + i) * 3;
      game.draw.sprite(PLANE[fr], i === 0 ? LEADPAL : TEAMPAL, p.x, p.y + bob, 8, { anchor: 'center' });
      if (i === 0) {
        var lit = callT > 0 && Math.floor(callT * 20) % 2 === 0;
        game.draw.circle(p.x - 50, p.y - 4, 7, lit ? C.amber : C.earth);
        game.draw.circle(p.x + 50, p.y - 4, 7, lit ? C.amber : C.earth);
        if (callT > 0) { bloom(p.x - 50, p.y - 4, 12, C.amber, 0.35); bloom(p.x + 50, p.y - 4, 12, C.amber, 0.35); }
      }
    }
  }

  function drawMe() {
    var fr = Math.floor(game.time.elapsed * 14) % 2;
    var vx = me.x - me.px;
    var flash = hitStop > 0 && missX > -900;
    bloom(me.x, me.y + 8, 46, C.amber, 0.12 + beatPulse * 0.08);
    if (flash) {
      var q = hitStop / 0.4;
      bloom(me.x, me.y, 70 + (1 - q) * 40, '#ffffff', 0.25 + q * 0.2);
      game.draw.sprite(PLANE[0], WHITEPAL, me.x, me.y, 10, { anchor: 'center' });
      return;
    }
    if (Math.abs(vx) > 3) game.draw.sprite(BANK, MEPAL, me.x, me.y, 8, { anchor: 'center', flipX: vx > 0 });
    else game.draw.sprite(PLANE[fr], MEPAL, me.x, me.y, 8, { anchor: 'center' });
  }

  // 拍の頭からの遅れの物差し(真ん中=拍の頭、右=遅い)
  function drawRuler() {
    var a = judge ? Math.min(1, judge.t) : 0.35;
    var cx = 440, x0 = cx - EARLY_W * RULER_K, x1 = cx + LATE_W * RULER_K;
    game.draw.rect(x0, RULER_Y - 6, x1 - x0, 12, C.earth, 0.5 * a + 0.25);
    game.draw.rect(cx - PERF_EARLY * RULER_K, RULER_Y - 10, (PERF_EARLY + PERF_LATE) * RULER_K, 20, C.amber, 0.5 * a + 0.15);
    game.draw.rect(cx - 3, RULER_Y - 26, 6, 52, C.cream, 0.8);
    if (!judge || judge.d === null) return;
    var mx = cx + Math.max(-0.2, Math.min(LATE_W + 0.05, judge.d)) * RULER_K;
    var col = judge.kind === 'perfect' ? C.amber : (judge.kind === 'good' ? C.cream : C.rust);
    game.draw.rect(mx - 5, RULER_Y - 40, 10, 80, col, a);
    var s = (judge.d >= 0 ? '+' : '-') + Math.abs(judge.d).toFixed(2) + '秒';
    if (a > 0.05) label(s, Math.max(180, Math.min(900, mx)), RULER_Y - 56, 36, col);
  }

  function drawThumbZone() {
    game.draw.rect(60, H * 0.78, W - 120, 360, '#1a1612', 0.18);
    game.draw.rect(60, H * 0.78, W - 120, 4, C.sand, 0.35);
    if (drag && state === S.PLAYING) {
      game.draw.circle(game.input.x, game.input.y, 60, C.amber, 0.18);
      game.draw.circle(game.input.x, game.input.y, 26, C.amber, 0.35);
    }
  }

  function post() {
    game.draw.rect(0, 0, W, H, '#4a3c2e', 0.12);
    for (var v = 0; v < 4; v++) {
      var w = 30 + v * 30, al = 0.15;
      game.draw.rect(0, 0, w, H, '#000000', al);
      game.draw.rect(W - w, 0, w, H, '#000000', al);
      game.draw.rect(0, H - w, W, w, '#000000', al);
      game.draw.rect(0, 0, W, w * 0.6, '#000000', al * 0.7);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#16120e', 0.72);
    game.draw.rect(0, 226, W, 4, C.sand, 0.45);
    label('SCORE ' + score, 50, 84, 44, C.cream, 'left');
    if (combo >= 2) label('x' + combo, W - 50, 84, 44, C.amber, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - nMiss;
      game.draw.sprite(ICON, { w: on ? C.cream : C.earth }, 440 + i * 70, 150, 9, { anchor: 'center', alpha: on ? 1 : 0.35 });
    }
    label((nPerfect + nGood) + ' / ' + totalMoves, W - 50, 166, 36, C.sand, 'right');
    // 小節の4拍ランプ(組み替えの拍は外輪つき)
    var bi = Math.max(0, Math.floor(clock / SPB));
    for (var k = 0; k < 4; k++) {
      var q = Math.floor(bi / 4) * 4 + k;
      var lit = clock >= 0 && bi === q;
      if (moveAhead(q)) ring(80 + k * 66, 150, 24, C.amber, 3, false);
      game.draw.circle(80 + k * 66, 150, lit ? 16 : 11, lit ? C.amber : C.earth, lit ? 1 : 0.8);
    }
    progress = Math.max(0, Math.min(1, clock / END_T));
    game.draw.rect(60, 198, W - 120, 12, C.earth, 0.7);
    game.draw.rect(60, 198, (W - 120) * progress, 12, C.sand);
  }

  function drawScene() {
    drawWorld();
    drawPuffs();
    drawSlots();
    drawTeam();
    drawMe();
    drawThumbZone();
    drawRuler();
    post();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.4;
    game.draw.rect(40, y0, W - 80, hh, '#16120e', 0.86);
    game.draw.rect(56, y0 + 16, W - 112, 4, C.sand, 0.6);
    game.draw.rect(56, y0 + hh - 20, W - 112, 4, C.sand, 0.6);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.amber : C.rust);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.cream);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.cream);
    label((nPerfect + nGood) + ' / ' + totalMoves, W / 2, H * 0.49, 46, C.cream);
    if (maxCombo > 1) label('COMBO ' + maxCombo, W / 2, H * 0.525, 36, C.sand);
    if (bestDelay < 9) label(bestDelay.toFixed(2) + '秒', W / 2, H * 0.56, 40, C.amber);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.6, 56, C.amber);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.6, 42, C.cream);
    if (!won) {
      if (nearLate < 9) label('あと' + Math.max(0.01, nearLate).toFixed(2) + '秒!', W / 2, H * 0.64, 50, C.rust);
      else label('あと' + Math.max(1, totalMoves - nPerfect - nGood) + '回!', W / 2, H * 0.64, 50, C.rust);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.69, 34, C.cream);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周は拍の頭ぴったりに移る、偶数周は2回目に号令より早く入って隊形を崩す ----
  var demo = { t: 0, cyc: 0, press: false, plan: [] };
  var DEMO_CYC = 2 * BAR + 1.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++;
      var fail = demo.cyc % 2 === 0;
      demo.plan = [];
      var mi = 0;
      for (var i = 0; i < evs.length; i++) {
        if (evs[i].kind !== 'move') continue;
        demo.plan.push({ e: evs[i], go: evs[i].t - (fail && mi === 1 ? 0.62 : 0.2) });
        mi++;
      }
    }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var tgt = slotXY(formAt(clock), 4, clock);
    for (var j = 0; j < demo.plan.length; j++) {
      var p = demo.plan[j];
      if (!p.e.res && clock >= p.go) { tgt = slotXY(p.e.form, 4, clock); break; }
    }
    var gap = Math.abs(tgt.x - me.tx) + Math.abs(tgt.y - me.ty);
    demo.press = gap > 30;
    if (hitStop <= 0) {
      me.tx += (tgt.x - me.tx) * Math.min(1, dt * 11);
      me.ty += (tgt.y - me.ty) * Math.min(1, dt * 11);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (callT > 0) callT -= dt;
    if (judge) { judge.t -= dt; if (judge.t <= 0) judge = null; }

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      updPuffs(dt);
      drawScene();
      game.draw.hand(me.tx, me.ty + 240, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#16120e', 0.72);
      bloom(W / 2, 100, 60, C.amber, 0.12);
      label(GAME_TITLE, W / 2, 112, 92 + Math.sin(t * 2.5) * 3, C.cream);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.amber);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.cream);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      updPuffs(dt);
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 3) { hitStop = 0; finishRun(nMiss < MISS_MAX); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }
    updPuffs(dt);
    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.3, W, 170, '#16120e', 0.75);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3 + 115, 100, C.cream);
    }
    // 最初の組み替えだけ、指の向きを薄いゴーストで示す
    var e0 = null;
    for (var i = 0; i < evs.length; i++) if (evs[i].kind === 'move') { e0 = evs[i]; break; }
    if (!over && e0 && !e0.res && clock > e0.t - TELE_T) {
      var s0 = slotXY(e0.form, 4, clock);
      var k = Math.max(0, Math.min(1, 1 - (e0.t - clock) / TELE_T));
      game.draw.hand(me.x + (s0.x - me.x) * k, me.y + 240 + (s0.y - me.y) * k, { press: true, scale: 13, alpha: 0.5 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
