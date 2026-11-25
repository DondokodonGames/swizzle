// K-DS-0043v2-canopy-rope-nut-walk.js
// 樹上の縄廊下ワルツ — 軋む板の三拍子に合わせて一歩ずつ、背負い籠の重心(吊るした木の実の影)の真下へ足を踏み分け、揺れる縄の廊下の上で重心を保って次の樹上の家まで渡り切る
// 操作: 拍ごとに(3拍子の全拍)画面をタップすると、その横位置へ足を踏み出す(下の板の拡大図の位置=縄廊下の幅)。板の上には木の実の影(重心)と足跡(足の位置)と、足のまわりの踏ん張れる幅が出る。影は縄の揺れ(2小節で一往復・1拍目が揺れの頂点)と傾きで流れていくので、拍の頭に影の真下を踏むと重心が足の上に戻る。拍のずれでPERFECT/GOOD、ずれすぎ・踏み遅れはMISSでよろけて重心が流れ、籠の木の実が2個こぼれる。影が踏ん張れる幅の外へ出るか縄の端を越えると足を滑らせて手すり縄にぶら下がりGAME OVER(幅の端に近づくと警告音)。後半は横風が来る(0.6秒前に木の葉が流れて風の音で予告)
// 終わり: 100BPM・3拍子の前奏1小節+9小節(27歩・18秒)を滑らずに渡り切ればCLEAR(判定×足の置き場所の正確さ+連続+届けた木の実)
// @mechanic: balance
// @theme: canopy_rope_walkway_nut_carrier
// 世界観: 大木の上に家々が並ぶ樹上の村で、木の実運びの子が背負い籠をしょって、家と家をつなぐ揺れる縄の渡り廊下を、軋む板の三拍子に合わせて重心の真下へ足を踏み分けながら渡る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・届けた木の実の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: TOON SHADE
var STYLE = { bg: ['#9fe0d0', '#3f8f6a'], main: ['#f4c27a', '#b9783e', '#1b1410'], accent: ['#ff6f5e', '#ffe14d'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 一回り大きい黒で輪郭を先に描き、内側を明・暗の2色だけで塗る(中間調を作らない)
  var C = {
    sky: STYLE.bg[0], leaf: STYLE.bg[1], wood: STYLE.main[0], woodDk: STYLE.main[1], ink: STYLE.main[2],
    coral: STYLE.accent[0], yellow: STYLE.accent[1], leafLt: '#6fc28a', leafDk: '#2f6e50', bark: '#8a5a34', barkDk: '#5e3a20',
    rope: '#e8c890', ropeDk: '#a8865a', white: '#ffffff', nut: '#a0582a', nutLt: '#d88a4a', red: '#ff3b3b', pale: '#fff6e0'
  };

  var GAME_TITLE = 'CANOPY WALTZ';
  var BPM = 100;
  var SPB = 60 / BPM;              // 0.6秒
  var BAR = SPB * 3;               // 1.8秒
  var BARS = 9;
  var STEPS = BARS * 3;            // 27歩
  var FIRST = 3;                   // 前奏1小節(0〜2拍)のあと、3拍目から毎拍一歩
  var TIME_LIMIT = 18;             // 前奏1小節 + 9小節 = 10 x 1.8秒
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.15;
  var LIMIT = 0.55;                // 足から重心がこれ以上離れると滑る
  var WARN = 0.4;
  var NUTS = 12;
  // 揺れの強さ(小節ごと)と横風(小節, 拍, 向き)
  var SWAY = [0.6, 0.7, 0.8, 0.9, 1.0, 1.05, 1.1, 1.2, 1.25];
  var GUSTS = [[5, 1, 1], [6, 2, -1], [8, 1, -1]];
  var DEMO_BARS = 4;
  var DEMO_LATE = 7;               // デモはこの歩を踏み遅れてよろける例を見せる

  var CX = W / 2;
  var FEET_Y = 1250;               // 子の足元(縄廊下の上)
  var WALK = 300;                  // 廊下の幅の半分(子の足元の高さで)
  var PLANK_Y = Math.round(H * 0.855), PLANK_X0 = 100, PLANK_X1 = 980;   // 親指ゾーンの板
  var PH = (PLANK_X1 - PLANK_X0) / 2;
  var VAN_Y = 430;                 // 廊下の向こう端(次の家)

  // ── スプライト(後ろ姿の子。黒輪郭 + 明暗2色) ──
  var KID_PAL = { k: C.ink, h: '#5a3a24', H: '#7a5234', s: '#f2c49a', S: '#d89a70', c: C.coral, C: '#c84a3e', b: '#4a6ac8', B: '#334c94' };
  var KID_TOP = [
    '...kkkkkk...',
    '..kHHHHhhk..',
    '.kHHHHHhhhk.',
    '.kHHHHhhhhk.',
    '.kHHHhhhhhk.',
    '..kshhhhsk..',
    '...kSSSSk...',
    '.kkccccCCkk.',
    'kscccccCCCsk',
    'kSccccCCCCSk',
    '.kccccCCCCk.',
    '..kccCCCCk..'
  ];
  var KID_TOP_UP = [
    'k..kkkkkk..k',
    'sk.kHHhhk.ks',
    'Sk.kHHhhk.kS',
    '.kkkHhhhkkk.',
    '..kkshhskk..',
    '...kSSSSk...',
    '..kccccCCk..',
    '.kcccccCCCk.',
    '.kccccCCCCk.',
    '.kccccCCCCk.',
    '..kccCCCCk..',
    '..kcCCCCCk..'
  ];
  var LEGS_L = ['.kbbbBk..', '.kbbBBk..', 'kbbk.kBk.', 'kbbk.kBk.', 'kkkk.kBk.', '.....kkk.'];
  var LEGS_R = ['..kbbBBk.', '..kbbBBk.', '.kbk.kBBk', '.kbk.kBBk', '.kbk.kkkk', '.kkk.....'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null;

  function newRun(isDemo) {
    var nSteps = isDemo ? DEMO_BARS * 3 : STEPS;
    var steps = [];
    for (var k = 0; k < nSteps; k++) steps.push({ k: k, b: FIRST + k, t: (FIRST + k) * SPB, res: 0 });
    var gusts = [];
    if (!isDemo) for (var g = 0; g < GUSTS.length; g++) gusts.push({ t: ((GUSTS[g][0] + 1) * 3 + GUSTS[g][1]) * SPB, dir: GUSTS[g][2], warned: false, done: false });
    return {
      demo: isDemo, steps: steps, n: nSteps, gusts: gusts, endT: (FIRST + nSteps) * SPB,
      clock: isDemo ? -0.2 : -READY_T, realT: 0, cueB: -1, lastBeat: -1, judged: 0,
      com: 0, vel: 0, base: 0, foot: 1, walked: 0, scroll: 0,
      score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, nuts: NUTS,
      hitStop: 0, flash: 0, pendingBad: null, fell: false, beatPulse: 0, stepT: 0, warnT: 0,
      leaves: [], drops: [], gustVis: 0, gustDir: 1, over: false, won: false, outroT: 0,
      prevBest: game.best, milestone: false, ended: false, cheer: 0
    };
  }

  function snd(f, d, o) { if (!run.demo) game.audio.tone(f, d, o); }

  // ── 拍クロック(1本)と伴奏(オリジナルの3拍子。オルゴール風) ──
  var MEL = ['G5', 'B5', 'D6', 'C6', 'A5', 'F#5', 'G5', 'D5', 'B4', 'A5', 'C6', 'E5'];
  var LOW = ['G2', 'D3', 'C3', 'D3'];
  function cueAudio() {
    var total = Math.round(run.endT / SPB) + 1;
    for (var b = run.cueB + 1; b < total; b++) {
      if (run.clock + 0.06 < b * SPB) break;
      run.cueB = b;
      if (!run.demo) playBeat(b);
    }
  }
  function playBeat(b) {
    var pos = b % 3, bar = Math.floor(b / 3) % 4;
    if (pos === 0) game.audio.melody([[MEL[bar * 3], 0.9]], { tempo: BPM, wave: 'triangle', volume: 0.06, bass: [[LOW[bar], 1]], bassWave: 'sine', bassVolume: 0.15 });
    else game.audio.melody([[MEL[bar * 3 + pos], 0.5], ['R', 0.5]], { tempo: BPM, wave: 'sine', volume: 0.05 });
  }
  // 板の軋み: 1拍目は「ギィ」と低く、2・3拍目は「キッ」と軽く
  function onBeat(b) {
    run.beatPulse = 1;
    if (b % 3 === 0) snd(150, 0.16, { wave: 'sawtooth', volume: 0.05, slide: 90 });
    else snd(900, 0.03, { wave: 'square', volume: 0.03 });
  }

  // 縄の揺れ: 2小節で一往復、1拍目が揺れの頂点
  function swayAcc(t) {
    if (t < 0) return 0;
    var bar = Math.min(SWAY.length - 1, Math.floor(t / BAR));
    var amp = run.demo ? 0.9 : SWAY[bar];
    return amp * Math.cos(Math.PI * t / BAR);
  }

  function physics(dt) {
    var lean = run.com - run.base;
    var acc = 2.0 * lean + swayAcc(run.clock) - 1.0 * run.com - 0.7 * run.vel;
    run.vel += acc * dt;
    run.com += run.vel * dt;
  }

  function uFromX(x) { return Math.max(-1, Math.min(1, (x - CX) / PH)); }

  // ── 判定(本番の指もATTRACTのゴーストも同じ関数) ──────────────
  function stepAt(x) {
    if (run.over || run.clock < 0) return 'none';
    var k = Math.round(run.clock / SPB) - FIRST;
    if (k < 0 || k >= run.n) { snd(500, 0.03, { wave: 'sine', volume: 0.04 }); return 'stray'; }
    var st = run.steps[k];
    if (st.res) { snd(500, 0.03, { wave: 'sine', volume: 0.04 }); return 'stray'; }
    var d = run.clock - st.t;
    if (Math.abs(d) > GOOD_W) { stumble(st, 'off'); return 'miss'; }
    var grade = Math.abs(d) <= PERFECT_W ? 1 : 2;
    st.res = grade; run.judged++;
    var u = uFromX(x);
    run.base = u;
    var gap = Math.abs(run.com - run.base);
    run.vel *= gap < 0.15 ? 0.35 : 0.75;
    run.foot = -run.foot; run.walked++; run.stepT = 0.25;
    if (grade === 1) run.perfect++; else run.good++;
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo);
    var place = Math.max(0.2, 1 - gap / LIMIT);
    var gain = Math.round((grade === 1 ? 100 : 60) * place) + Math.min(10, run.combo) * 5 + (k % 3 === 0 ? 20 : 0);
    run.score += gain;
    // 足音: 連続で少しずつ上がる
    snd(k % 3 === 0 ? 'D4' : 'G4', 0.08, { wave: 'triangle', volume: 0.12 });
    snd(523 + Math.min(12, run.combo) * 30, 0.05, { wave: 'square', volume: 0.035 });
    var px = CX + u * PH;
    game.feedback.good(px, PLANK_Y - 110, {
      text: gap < 0.06 && grade === 1 ? 'NICE' : grade === 1 ? 'PERFECT' : 'GOOD',
      color: grade === 1 ? C.yellow : C.leafLt, size: grade === 1 ? 52 : 44, count: grade === 1 ? 10 : 6, volume: run.demo ? 0 : 0.14
    });
    if (!run.demo && run.combo === 9 && !run.milestone) {
      run.milestone = true;
      game.fx.popup('x9', CX, 560, { color: C.yellow, size: 90 });
      game.audio.play('se_milestone', 0.45);
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function stumble(st, why) {
    st.res = 3; run.judged++;
    run.miss++; run.combo = 0;
    var lean = run.com - run.base;
    var dir = Math.abs(lean) > 0.02 ? (lean > 0 ? 1 : -1) : (swayAcc(run.clock) >= 0 ? 1 : -1);
    run.vel += 0.3 * dir;
    run.foot = -run.foot; run.walked++;
    var spill = Math.min(2, run.nuts);
    run.nuts -= spill;
    for (var i = 0; i < spill; i++) run.drops.push({ x: CX + run.base * WALK + 40 * dir, y: FEET_Y - 170, vx: dir * 160 + game.random(-60, 60), vy: -260, t: 0 });
    run.hitStop = 0.35; run.flash = 0.35;
    run.pendingBad = { x: CX + run.base * WALK, y: FEET_Y - 330 };
    snd(why === 'late' ? 170 : 210, 0.16, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function flushBad() {
    if (!run.pendingBad) return;
    var pb = run.pendingBad;
    run.pendingBad = null;
    if (run.fell) {
      game.feedback.bad(pb.x, pb.y, { text: 'MISS', color: C.red, flashColor: C.white, shake: run.demo ? 4 : 16, volume: run.demo ? 0 : 0.6 });
      if (!run.demo) finishRun(false);
      return;
    }
    game.feedback.bad(pb.x, pb.y, { text: 'MISS', color: C.red, flashColor: C.white, shake: run.demo ? 3 : 10, volume: run.demo ? 0 : 0.5 });
  }

  function slip() {
    if (run.fell) return;
    run.fell = true;
    run.hitStop = 0.55; run.flash = 0.55;
    run.pendingBad = { x: CX + run.base * WALK, y: FEET_Y - 330 };
    snd(300, 0.4, { wave: 'sawtooth', volume: 0.12, slide: -220 });
    for (var i = 0; i < Math.min(4, run.nuts); i++) run.drops.push({ x: CX + run.com * WALK, y: FEET_Y - 170, vx: game.random(-220, 220), vy: -300, t: 0 });
    run.nuts = Math.max(0, run.nuts - 4);
    if (run.demo) { run.com = 0; run.vel = 0; run.base = 0; run.fell = false; }
  }

  function stepRun(dt) {
    run.clock += dt;
    cueAudio();
    var bi = Math.floor(run.clock / SPB);
    var lastB = Math.round(run.endT / SPB);
    while (run.lastBeat < bi && run.lastBeat < lastB) { run.lastBeat++; onBeat(run.lastBeat); }
    if (run.over) return;
    // 横風(0.6秒前に木の葉と風の音で予告)
    for (var g = 0; g < run.gusts.length; g++) {
      var gu = run.gusts[g];
      if (!gu.warned && run.clock >= gu.t - 0.6) {
        gu.warned = true; run.gustVis = 1.2; run.gustDir = gu.dir;
        snd(260, 0.6, { wave: 'sawtooth', volume: 0.04, slide: 300 });
        for (var l = 0; l < 10; l++) run.leaves.push({ x: gu.dir > 0 ? -60 - l * 50 : W + 60 + l * 50, y: 700 + game.random(0, 520), vx: gu.dir * game.random(900, 1300), t: 0, r: game.random(0, 6) });
      }
      if (!gu.done && run.clock >= gu.t) { gu.done = true; run.vel += 0.32 * gu.dir; }
    }
    if (run.clock >= (FIRST - 1) * SPB) physics(dt);      // 揺れは最初の一歩の1拍前から効く
    var gap = Math.abs(run.com - run.base);
    if (gap > WARN && run.warnT <= 0) { run.warnT = 0.25; snd(1200, 0.05, { wave: 'square', volume: 0.05 }); }
    if (gap > LIMIT || Math.abs(run.com) > 1.05) { slip(); return; }
    // 踏み遅れ
    var k = run.judged;
    var st = run.steps[k];
    if (st && run.clock > st.t + GOOD_W) { stumble(st, 'late'); return; }
    if (!run.demo && !st && run.clock >= run.endT) finishRun(true);
  }

  function finishRun(ok) {
    if (run.over) return;
    run.over = true; run.won = ok; run.outroT = 2.2;
    if (run.demo) return;
    game.audio.stopBgm();
    if (ok) {
      run.score += run.nuts * 50 + 300;
      run.cheer = 2.2;
      for (var i = 0; i < 6; i++) game.fx.burst(200 + i * 140, 520 + (i % 2) * 120, { color: i % 2 ? C.yellow : C.coral, count: 18, speed: 420 });
      game.fx.flash(C.white, 0.25);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: run.score, nuts: run.nuts, steps: run.walked, perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (run.won) game.end.success(run.score, stats); else game.end.failure(stats);
  }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; run = newRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; run = newRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || run.over || run.hitStop > 0 || y < 230) return;
    var r = stepAt(x);
    if (r === 'none') game.audio.tone(400, 0.03, { wave: 'sine', volume: 0.04 });
  });

  // ── 描画ヘルパー(TOON: 黒い輪郭 → 暗 → 明) ──
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    var o = Math.max(3, Math.round(sz / 14));
    game.draw.text(str, x - o, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x + o, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y + o, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y - o, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function toonBall(x, y, r, lt, dk) {
    game.draw.circle(x, y, r + 6, C.ink);
    game.draw.circle(x, y, r, dk);
    game.draw.circle(x - r * 0.22, y - r * 0.22, r * 0.72, lt);
  }
  function toonRect(x, y, w, h, lt, dk) {
    game.draw.rect(x - 5, y - 5, w + 10, h + 10, C.ink);
    game.draw.rect(x, y, w, h, dk);
    game.draw.rect(x, y, w * 0.62, h, lt);
  }
  function halfAt(y) { return 60 + (y - VAN_Y) / (1440 - VAN_Y) * 380; }

  function drawCanopy() {
    var t = game.time.elapsed;
    game.draw.gradient(230, 1460, [[0, '#d6f4e8'], [0.5, C.sky], [1, '#5fae86']]);
    // 遠くの幹(明るい2色)
    toonRect(60, 230, 90, 1230, '#8fc8a6', '#76b090');
    toonRect(930, 230, 100, 1230, '#8fc8a6', '#76b090');
    // 近くの幹(左右)
    toonRect(-40, 230, 150, 1240, C.bark, C.barkDk);
    toonRect(970, 230, 150, 1240, C.bark, C.barkDk);
    // 次の家(廊下の向こう端)
    toonRect(CX - 170, VAN_Y - 30, 340, 40, C.wood, C.woodDk);
    toonRect(CX - 120, VAN_Y - 200, 240, 170, C.wood, C.woodDk);
    game.draw.rect(CX - 160, VAN_Y - 260, 320, 10, C.ink);
    for (var r = 0; r < 4; r++) game.draw.rect(CX - 150 + r * 10, VAN_Y - 250 + r * 16, 300 - r * 20, 16, r % 2 ? C.coral : '#c84a3e');
    toonRect(CX - 30, VAN_Y - 120, 60, 90, '#5e3a20', '#3e2614');
    var lamp = 0.5 + Math.sin(t * 3) * 0.2;
    game.draw.circle(CX + 80, VAN_Y - 120, 24, C.yellow, lamp);
    // 葉の房(上と左右)
    var clumps = [[120, 300, 120], [330, 250, 100], [760, 250, 110], [960, 320, 130], [60, 640, 100], [1020, 700, 110]];
    for (var i = 0; i < clumps.length; i++) {
      var c = clumps[i];
      var sw = Math.sin(t * 1.2 + i) * 6;
      toonBall(c[0] + sw, c[1], c[2], C.leafLt, C.leafDk);
    }
  }

  // 縄の渡り廊下(奥へ細くなる台形)。歩くたびに板が手前へ流れる。縄の揺れで横にずれる
  function drawWalkway() {
    var shift = swayAcc(run.clock) * 22;
    var yB = 1440;
    var hB = halfAt(yB), hT = halfAt(VAN_Y);
    // 板(手前ほど間隔が広い)
    var phase = run.scroll % 1;
    for (var i = 0; i < 16; i++) {
      var z = (i + phase) / 16;
      var y = VAN_Y + (yB - VAN_Y) * z * z;
      var hw = halfAt(y) * 0.92;
      var th = 4 + z * 26;
      var sx = shift * z;
      game.draw.rect(CX - hw + sx - 3, y - th / 2 - 3, hw * 2 + 6, th + 6, C.ink);
      game.draw.rect(CX - hw + sx, y - th / 2, hw * 2, th, C.woodDk);
      game.draw.rect(CX - hw + sx, y - th / 2, hw * 2, th * 0.55, C.wood);
    }
    // 足縄と手すり縄
    for (var s = -1; s <= 1; s += 2) {
      game.draw.line(CX + s * hT, VAN_Y, CX + s * hB + shift, yB, C.ink, 14);
      game.draw.line(CX + s * hT, VAN_Y, CX + s * hB + shift, yB, C.rope, 7);
      game.draw.line(CX + s * hT, VAN_Y - 70, CX + s * (hB + 40) + shift, yB - 420, C.ink, 12);
      game.draw.line(CX + s * hT, VAN_Y - 70, CX + s * (hB + 40) + shift, yB - 420, C.rope, 6);
      for (var v = 1; v < 6; v++) {
        var z2 = v / 6;
        var y1 = VAN_Y + (yB - VAN_Y) * z2, y2 = VAN_Y - 70 + (yB - 420 - VAN_Y + 70) * z2;
        var x1 = CX + s * (hT + (hB - hT) * z2) + shift * z2, x2 = CX + s * (hT + (hB + 40 - hT) * z2) + shift * z2;
        game.draw.line(x1, y1, x2, y2, C.ropeDk, 4);
      }
    }
  }

  function drawKid() {
    var shift = swayAcc(run.clock) * 22 * 0.84;
    var bx = CX + run.base * WALK + shift;
    var lean = run.com - run.base;
    var tx = bx + lean * 170;
    var flash = run.flash > 0;
    var pal = flash ? { k: C.white, h: C.white, H: C.white, s: C.white, S: C.white, c: C.white, C: C.white, b: C.white, B: C.white } : KID_PAL;
    var sc = flash ? 18 : 15;
    var hop = run.stepT > 0 ? Math.sin(run.stepT / 0.25 * Math.PI) * 10 : 0;
    game.draw.circle(bx, FEET_Y + 6, 80, C.ink, 0.25);
    game.draw.sprite(run.foot > 0 ? LEGS_R : LEGS_L, pal, bx, FEET_Y - 45 - hop, sc, { anchor: 'center' });
    // 背負い籠(木の実の数だけ山になる)
    var top = run.fell || run.cheer > 0 ? KID_TOP_UP : KID_TOP;
    var by = FEET_Y - 170 - hop;
    game.draw.sprite(top, pal, (bx + tx) / 2, by, sc, { anchor: 'center' });
    var kx = tx, ky = by + 34;
    toonRect(kx - 62, ky - 40, 124, 90, C.wood, C.woodDk);
    for (var g = 0; g < 4; g++) game.draw.line(kx - 60, ky - 30 + g * 22, kx + 60, ky - 30 + g * 22, C.woodDk, 3);
    for (var n = 0; n < run.nuts; n++) {
      var nx = kx - 44 + (n % 5) * 22, ny = ky - 38 - Math.floor(n / 5) * 15;
      game.draw.circle(nx, ny, 12, C.ink);
      game.draw.circle(nx, ny, 9, C.nut);
      game.draw.circle(nx - 2, ny - 3, 5, C.nutLt);
    }
    // 吊るした木の実の重り(重心の真下を指す)
    var plumbX = CX + run.com * WALK + shift;
    game.draw.line(kx, ky + 50, plumbX, FEET_Y - 30, C.ink, 3);
    toonBall(plumbX, FEET_Y - 24, 13, C.nutLt, C.nut);
  }

  function drawDrops(dt) {
    for (var i = run.drops.length - 1; i >= 0; i--) {
      var d = run.drops[i];
      d.t += dt;
      if (d.t > 1.2) { run.drops.splice(i, 1); continue; }
      d.vy += 1300 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      toonBall(d.x, d.y, 10, C.nutLt, C.nut);
    }
  }

  function drawLeaves(dt) {
    run.gustVis = Math.max(0, run.gustVis - dt);
    for (var i = run.leaves.length - 1; i >= 0; i--) {
      var l = run.leaves[i];
      l.t += dt;
      if (l.t > 1.8) { run.leaves.splice(i, 1); continue; }
      var x = l.x + l.vx * l.t, y = l.y + Math.sin(l.t * 8 + l.r) * 30;
      game.draw.circle(x, y, 18, C.ink);
      game.draw.circle(x, y, 13, C.leafDk);
      game.draw.circle(x - 3, y - 3, 8, C.leafLt);
    }
  }

  // 下の板の拡大図: 足跡・踏ん張れる幅・木の実の影(重心)。拍の頭へ縮む輪
  function drawPlank() {
    game.draw.gradient(1460, H, [[0, '#4a7a5a'], [1, '#2f5a42']]);
    var dip = run.beatPulse * 10;
    toonRect(PLANK_X0, PLANK_Y - 70 + dip, PLANK_X1 - PLANK_X0, 140, C.wood, C.woodDk);
    for (var g = 0; g < 3; g++) game.draw.line(PLANK_X0 + 20, PLANK_Y - 40 + g * 40 + dip, PLANK_X1 - 20, PLANK_Y - 30 + g * 40 + dip, C.woodDk, 4);
    // 縄の端(ここを越えると落ちる)
    game.draw.rect(PLANK_X0 - 40, PLANK_Y - 110, 28, 220, C.ink);
    game.draw.rect(PLANK_X0 - 34, PLANK_Y - 104, 16, 208, C.rope);
    game.draw.rect(PLANK_X1 + 12, PLANK_Y - 110, 28, 220, C.ink);
    game.draw.rect(PLANK_X1 + 18, PLANK_Y - 104, 16, 208, C.rope);
    var bx = CX + run.base * PH;
    var gap = Math.abs(run.com - run.base);
    var danger = gap > WARN;
    // 踏ん張れる幅(足のまわり)
    var lw = LIMIT * PH;
    var bl = Math.max(PLANK_X0, bx - lw), br = Math.min(PLANK_X1, bx + lw);
    game.draw.rect(bl, PLANK_Y - 60 + dip, br - bl, 120, danger && Math.floor(game.time.elapsed * 12) % 2 === 0 ? C.red : C.pale, 0.35);
    game.draw.rect(bl - 3, PLANK_Y - 64 + dip, 6, 128, C.ink);
    game.draw.rect(br - 3, PLANK_Y - 64 + dip, 6, 128, C.ink);
    // 足跡
    game.draw.circle(bx - 20, PLANK_Y + 18 + dip, 18, C.ink);
    game.draw.circle(bx - 20, PLANK_Y + 18 + dip, 12, '#4a6ac8');
    game.draw.circle(bx + 20, PLANK_Y + 30 + dip, 18, C.ink);
    game.draw.circle(bx + 20, PLANK_Y + 30 + dip, 12, '#4a6ac8');
    // 木の実の影(重心)と、次の拍の頭へ縮む輪
    var cx = CX + run.com * PH;
    game.draw.rect(cx - 2, PLANK_Y - 120 + dip, 4, 80, C.ink, 0.6);
    toonBall(cx, PLANK_Y - 18 + dip, 26, danger ? '#ff8a7a' : C.nutLt, danger ? C.red : C.nut);
    var st = run.steps[run.judged];
    if (st && run.clock > -0.2) {
      var lead = (st.t - run.clock) / SPB;
      if (lead > 0 && lead < 1) {
        var rr = 34 + lead * 90;
        for (var a = 0; a < 24; a++) {
          var a0 = a / 24 * Math.PI * 2, a1 = (a + 1) / 24 * Math.PI * 2;
          game.draw.line(cx + Math.cos(a0) * rr, PLANK_Y - 18 + Math.sin(a0) * rr * 0.6, cx + Math.cos(a1) * rr, PLANK_Y - 18 + Math.sin(a1) * rr * 0.6, st.k % 3 === 0 ? C.coral : C.yellow, 6);
        }
      }
    }
    // 拍ランプ(3拍子。1拍目は大きい)
    var cur = run.lastBeat >= 0 ? run.lastBeat % 3 : -1;
    for (var b = 0; b < 3; b++) {
      var lit = b === cur;
      var r0 = b === 0 ? 30 : 22;
      toonBall(CX + (b - 1) * 130, 1830, r0 + (lit ? run.beatPulse * 8 : 0), lit ? (b === 0 ? C.coral : C.yellow) : '#8aa898', lit ? (b === 0 ? '#c84a3e' : '#d8b020') : '#5f7a6a');
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.pale);
    game.draw.rect(0, 222, W, 10, C.ink);
    label('SCORE ' + run.score, 40, 86, 50, C.coral, 'left');
    if (run.combo >= 2) label('x' + run.combo, 40, 170, 44, C.leafDk, 'left');
    // 籠の木の実
    for (var i = 0; i < NUTS; i++) {
      var on = i < run.nuts;
      var nx = 620 + (i % 6) * 64, ny = 70 + Math.floor(i / 6) * 60;
      game.draw.circle(nx, ny, 22, C.ink);
      game.draw.circle(nx, ny, 16, on ? C.nut : '#d8cfc0');
      if (on) game.draw.circle(nx - 4, ny - 5, 8, C.nutLt);
    }
    // 渡った距離
    var prog = Math.min(1, run.walked / run.n);
    game.draw.rect(330, 190, 600, 22, C.ink);
    game.draw.rect(335, 195, 590 * prog, 12, C.leafLt);
  }

  function drawScene(dt) {
    drawCanopy();
    drawWalkway();
    drawKid();
    drawDrops(dt);
    drawLeaves(dt);
    drawPlank();
  }

  function drawResult(showTap) {
    var y0 = H * 0.26, hh = H * 0.4;
    toonRect(60, y0, W - 120, hh, C.pale, '#f0e2c0');
    label(run.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, run.won ? C.yellow : C.red);
    label('SCORE ' + run.score, W / 2, H * 0.39, 62, C.coral);
    label(run.nuts + ' / ' + NUTS, W / 2, H * 0.45, 64, C.nutLt);
    label('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.5, 34, C.leafDk);
    label('x' + run.maxCombo, W / 2, H * 0.54, 40, C.leafDk);
    if (run.won && run.score > run.prevBest) label('NEW RECORD', W / 2, H * 0.59, 62, C.yellow);
    else label('BEST ' + Math.max(run.prevBest, run.won ? run.score : 0), W / 2, H * 0.59, 46, C.coral);
    if (!run.won) label('あと' + Math.max(1, run.n - run.walked) + '歩!', W / 2, H * 0.635, 52, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.71, 40, C.white);
  }

  // ── ATTRACT: 実ロジックで4小節。影の真下を拍ごとに踏み、8歩目だけ踏み遅れてよろける例 ──
  var demo = { t: 0, x: CX, press: 0 };
  var DEMO_CYC = (FIRST + DEMO_BARS * 3) * SPB + 1.6;
  function ghost(dt) {
    var st = run.steps[run.judged];
    var target = CX + run.com * PH;
    demo.x += (target - demo.x) * Math.min(1, dt * 10);
    demo.press = Math.max(0, demo.press - dt);
    if (!st) return;
    var late = st.k === DEMO_LATE ? 0.3 : 0;
    if (run.clock + dt / 2 >= st.t + late && late === 0) {
      demo.press = 0.18;
      stepAt(target);
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { run = newRun(true); demo.x = CX; }
    if (run.hitStop > 0) { run.hitStop -= dt; if (run.hitStop <= 0) flushBad(); return; }
    if (run.clock < run.endT + 0.3) stepRun(dt);
    ghost(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (!run) run = newRun(true);
    run.beatPulse = Math.max(0, run.beatPulse - dt * 4);
    run.flash = Math.max(0, run.flash - dt);
    run.cheer = Math.max(0, run.cheer - dt);
    run.warnT = Math.max(0, run.warnT - dt);
    if (run.stepT > 0) { run.stepT = Math.max(0, run.stepT - dt); run.scroll += dt / 0.25; }

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.x, PLANK_Y - 10, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.pale);
      game.draw.rect(0, 222, W, 10, C.ink);
      label(GAME_TITLE, W / 2, 104 + Math.sin(t * 3) * 6, 92, C.coral);
      label('HI-SCORE ' + game.best, W / 2, 190, 38, C.leafDk);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1520, 46, C.yellow);
      else label('TAP TO START', W / 2, 1520, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ── PLAYING ──
    run.realT += dt;
    if (!run.over && run.realT >= READY_T + TIME_LIMIT + 2.5) { run.hitStop = 0; run.pendingBad = null; finishRun(!run.fell); }
    if (run.hitStop > 0) {
      run.hitStop -= dt;
      if (run.hitStop <= 0) flushBad();
    } else if (run.over) {
      run.outroT -= dt;
      if (run.outroT <= 0 && !run.ended) { run.ended = true; state = S.RESULT; endGame(); }
    } else {
      var wasReady = run.clock < -0.35;
      stepRun(dt);
      if (wasReady && run.clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(dt);
    drawHud();
    if (run.clock < 0) {
      toonRect(0, H * 0.42, W, 170, C.pale, '#f0e2c0');
      label(run.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 115, 110, C.coral);
    }
    if (run.over && run.hitStop <= 0 && run.outroT < 1.4) drawResult(state === S.RESULT);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    run = newRun(true);
    demo.t = 0;
  });
})(game);
