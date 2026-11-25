// K-DS-0029v2-apiary-jar-offbeat-drip.js
// 蜜詰め小屋の裏拍 — 回転台に乗って回ってくる瓶がノズルの真下に来るのは決まって裏拍。その一瞬に蜜をひと垂らし落として詰めていく
// 操作: 画面のどこでも押すとノズルから蜜がひと垂らし落ちる(押した瞬間で判定)。回転台は時計回りに回り、瓶は拍と拍のあいだ(裏拍)にノズルの真下を通る。空の瓶が真下に来た裏拍に押すとPERFECT/GOOD。表拍(瓶と瓶のすきま)で押す・蓋の閉まった瓶や空の皿に垂らす・同じ瓶に2回垂らすとこぼれてMISS。空の瓶を素通りさせてもMISS。上の拍の帯で、どの裏拍に詰める瓶が来るか(蜜のしずく=詰める/灰色=見送る)が分かる。蓋つきの瓶は真下に来る1拍前から赤く点滅して予告
// 終わり: 前奏1小節+6小節(124BPM・約14秒)を回し切って MISS 4回以内ならCLEAR。MISS 5回でGAME OVER
// @mechanic: drop_timing
// @theme: apiary_jar_offbeat_drip
// 世界観: 養蜂場の蜜詰め小屋で、養蜂家が回転台に乗って流れてくる瓶へ、ノズルの真下を通る裏拍ごとに蜜をひと垂らしずつ落として詰めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・詰めた瓶の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 2010s FLAT MOBILE
var STYLE = { bg: ['#fff4dc', '#ffeccb'], main: ['#ffb400', '#3b4a6b', '#ffffff'], accent: ['#ff5a5f', '#2ec4b6'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;
  // 2010s FLAT MOBILE: 影もグラデも使わないベタ塗り数色。丸角・大きな余白・アイコン的な形。判定はUIの色変化で示す
  var C = {
    cream: STYLE.bg[0], cream2: STYLE.bg[1], honey: STYLE.main[0], navy: STYLE.main[1], white: STYLE.main[2],
    red: STYLE.accent[0], teal: STYLE.accent[1],
    grey: '#e3e7ee', grey2: '#c5ccd8', glass: '#bfe9f2', lid: '#7a4b2a', lid2: '#5c3820', amber: '#e08a00', leaf: '#7cc576',
  };

  var GAME_TITLE = 'HONEY OFFBEAT';
  var BPM = 124;
  var SPB = 60 / BPM;
  var BEATS = 4;
  var PATTERN = ['NNNN', 'JJJJ', 'JJJJ', 'JCJJ', 'JJNJ', 'JCJN', 'CJJJ'];   // 0小節目は前奏(皿だけ回る)
  var DEMO_PATTERN = ['NNNN', 'JJJJ', 'JCJJ', 'JJNJ'];
  var DEMO_SPILL = 10;               // デモはこの拍の表拍で垂らしてこぼす
  var PERFECT_W = 0.06;
  var GOOD_W = 0.12;
  var MISS_MAX = 5;
  var HIT_STOP = 0.34;
  var TIME_LIMIT = 14.5;
  var TAU = Math.PI * 2;
  var STEP = TAU / 12;               // 1拍で12分の1周
  var TCX = 540, TCY = Math.round(H * 0.635), RING = 400;   // 回転台
  var NOZ_X = TCX, NOZ_Y = TCY - RING;
  var STRIP_Y = Math.round(H * 0.15);

  var MEL = [['R', 0.5], ['B4', 0.5], ['R', 0.5], ['D5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['F#5', 0.5]];
  var MEL2 = [['R', 0.5], ['C5', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['G5', 0.5]];
  var BASS = [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]];
  var BASS2 = [['C3', 1], ['G2', 1], ['C3', 1], ['D3', 1]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;
  var R = null;
  var demo = { t: 0, taps: [], ti: 0, press: 0 };

  // ── スプライト ─────────────────────────────────────────
  var KEEPER = [
    ['....WWWW....', '.WWWWWWWWWW.', '..GGGGGGGG..', '..GSGGGGSG..', '..GGGGGGGG..', '...WWWWWW...', '..WWWWWWWWY.', '.WWWWWWWWWYY', '.WWWWWWWW...', '..WWWWWWW...', '..WW...WW...', '.NNN...NNN..'],
    ['....WWWW....', '.WWWWWWWWWW.', '..GGGGGGGG..', '..GSGGGGSG..', '..GGGGGGGG..', '...WWWWWW...', '..WWWWWWWW..', '.WWWWWWWWW..', '.WWWWWWWWWY.', '..WWWWWWWYY.', '..WW...WW...', '.NNN...NNN..'],
    ['....WWWW....', '.WWWWWWWWWW.', '..GGGGGGGG..', '..GSGGGGSG..', '..GGGSSGGG..', '...WWWWWW...', 'YWWWWWWWWWY.', 'YWWWWWWWWWW.', '.WWWWWWWW...', '..WWWWWWW...', '..WW...WW...', '.NNN...NNN..'],
  ];
  var KEEPER_PAL = { W: C.white, G: '#8a93a6', S: C.navy, Y: C.honey, N: C.navy };
  var BEE = [
    ['.WW.WW.', '..W.W..', '.YNYNY.', 'NYNYNYN', '.YNYNY.'],
    ['.......', '.WW.WW.', '.YNYNY.', 'NYNYNYN', '.YNYNY.'],
  ];
  var BEE_PAL = { W: C.white, Y: C.honey, N: C.navy };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col);
    game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col);
    game.draw.circle(x + w - r, y + h - r, r, col);
  }
  function vq(v) { return armed ? (R && R.demo ? v * 0.4 : v) : 0.001; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  // ── 進行(拍クロックは1本) ─────────────────────────────
  function newRun(isDemo) {
    var pat = isDemo ? DEMO_PATTERN : PATTERN;
    var slots = [], need = 0;
    for (var b = 0; b < pat.length; b++) {
      for (var i = 0; i < BEATS; i++) {
        var k = pat[b].charAt(i);
        slots.push({ j: b * BEATS + i, t: (b * BEATS + i + 0.5) * SPB, kind: k, intro: b === 0, st: 0, fx: 0 });
        if (k === 'J') need++;
      }
    }
    return {
      demo: isDemo, pat: pat, slots: slots, need: need, nBeats: pat.length * BEATS,
      ready: isDemo ? 0 : 0.8, running: isDemo, beatN: 0, beatT: 0, songT: 0, melBar: 0,
      score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, filled: 0, barMissCount: [], barDone: 0,
      hitStop: 0, hitSlot: null, pendingBad: null, judge: 0, judgeCol: C.teal, drop: 0, squeeze: 0, beatPulse: 0, offPulse: 0,
      dispAng: 0, hopper: 1, over: false, ok: false, endWait: 0, prevBest: game.best, milestone: false,
    };
  }
  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (!R.demo) game.audio.stopBgm();
  }

  function playBar(b) {
    if (!armed) return;
    var alt = b % 2 === 1;
    game.audio.melody(alt ? MEL2 : MEL, { tempo: BPM, wave: 'square', volume: R.demo ? 0.02 : 0.045, bass: alt ? BASS2 : BASS, bassWave: 'triangle', bassVolume: R.demo ? 0.035 : 0.09 });
  }

  function onBeat(k) {
    if (k >= R.nBeats) return;
    R.beatPulse = 1;
    var q = R.demo ? 0.4 : 1;
    // 表拍: 蜂の羽音(合図だけ。ここで垂らすとこぼれる)
    tone(k % BEATS === 0 ? 196 : 247, 0.07, { wave: 'sawtooth', volume: 0.025 * q, slide: 30 });
    // 蓋つきの瓶の予告(真下に来る1拍前 = 約0.5秒前)
    var nx = R.slots[k];
    if (nx && (nx.kind === 'C') && !nx.intro) tone(880, 0.06, { wave: 'square', volume: 0.04 * q, slide: -200 });
  }
  function onOff(k) {
    R.offPulse = 1;
    var q = R.demo ? 0.4 : 1;
    var sl = R.slots[k];
    if (sl && sl.intro) tone(1320, 0.03, { wave: 'triangle', volume: 0.05 * q });   // 前奏は裏拍を鳴らして見せる
  }

  function stepClock(dt) {
    if (!R.running || R.over) return;
    var prevHalf = R.beatT >= SPB / 2;
    R.beatT += dt;
    if (!prevHalf && R.beatT >= SPB / 2 && R.beatT < SPB) onOff(R.beatN);
    while (R.beatT >= SPB) {
      R.beatT -= SPB; R.beatN++;
      onBeat(R.beatN);
      if (R.beatT >= SPB / 2) onOff(R.beatN);
    }
    R.songT = R.beatN * SPB + R.beatT;
    var t = R.songT;
    if (R.melBar < R.pat.length && t >= R.melBar * BEATS * SPB - 0.06) { playBar(R.melBar); R.melBar++; }
    // 空の瓶の素通り
    for (var i = 0; i < R.slots.length; i++) {
      var sl = R.slots[i];
      if (sl.st === 0 && t > sl.t + GOOD_W) {
        if (sl.kind === 'J' && !sl.intro) { sl.st = 'gone'; doMiss(sl, 'pass'); }
        else sl.st = 'skip';
      }
    }
    // 小節の締め(MISSなしで NICE)
    while (R.barDone < R.pat.length && t >= (R.barDone + 1) * BEATS * SPB + GOOD_W + 0.02) {
      var bd = R.barDone;
      if (!R.demo && bd >= 1 && !R.barMissCount[bd]) {
        game.fx.popup('NICE', W / 2, NOZ_Y + 170, { color: C.teal, size: 80 });
        game.audio.tone('G6', 0.12, { wave: 'triangle', volume: 0.06, slide: 200 });
      }
      R.barDone++;
    }
    if (R.demo) return;
    var last = R.slots[R.slots.length - 1];
    if (t > last.t + GOOD_W + 0.05 || t > TIME_LIMIT) finish(R.miss < MISS_MAX);
  }

  function slotAngle(sl, songT) {
    // 回転台の上での角度(画面の上 = ノズル)。拍の0.5ぶん先でちょうど真上
    return -Math.PI / 2 + (songT - sl.t) / SPB * STEP;
  }

  // 蜜をひと垂らし(押した瞬間で判定。入力とデモで共通)
  function drip() {
    if (!R || R.over || !R.running) return 'none';
    var t = R.songT;
    R.drop = 0.16; R.squeeze = 0.18;
    var best = null, bd = 99;
    for (var i = 0; i < R.slots.length; i++) {
      var d = t - R.slots[i].t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = R.slots[i]; }
    }
    if (best && best.intro) {
      tone(660, 0.05, { wave: 'triangle', volume: 0.05 });
      return 'practice';
    }
    if (best && Math.abs(bd) <= GOOD_W && best.kind === 'J' && best.st === 0) {
      var perfect = Math.abs(bd) <= PERFECT_W;
      best.st = perfect ? 'p' : 'g';
      R.filled++; R.combo++; if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      R.score += (perfect ? 100 : 50) + Math.min(R.combo, 10) * 10;
      if (perfect) R.perfect++; else R.good++;
      R.judge = 0.3; R.judgeCol = perfect ? C.teal : C.honey;
      R.hopper = Math.max(0.12, 1 - R.filled / (R.need + 2));
      game.feedback.good(NOZ_X, NOZ_Y - 110, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.teal : C.honey, size: perfect ? 54 : 44, count: perfect ? 10 : 6, volume: vq(0.22) });
      tone(perfect ? 'D6' : 'B5', 0.09, { wave: 'triangle', volume: R.demo ? 0.03 : 0.09, slide: -300 });
      if (!R.demo && !R.milestone && R.filled === 10) {
        R.milestone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('10', 214, 560, { color: C.honey, size: 110 });
      }
      return perfect ? 'perfect' : 'good';
    }
    // こぼれ: 表拍・蓋つき・空の皿・2度垂らし
    var target = best && Math.abs(bd) <= GOOD_W ? best : null;
    doMiss(target, 'spill');
    return 'miss';
  }

  function doMiss(sl, why) {
    R.miss++; R.combo = 0;
    R.hitStop = HIT_STOP; R.hitSlot = sl;
    R.judge = 0.45; R.judgeCol = C.red;
    var bar = Math.floor(R.songT / (BEATS * SPB));
    R.barMissCount[bar] = (R.barMissCount[bar] || 0) + 1;
    R.pendingBad = { t: 0.3 };
    tone(why === 'pass' ? 180 : 140, 0.2, { wave: 'sawtooth', volume: R.demo ? 0.03 : 0.1, slide: -60 });
    if (!R.demo && R.miss >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.3;
    game.audio.stopBgm();
    if (ok) {
      R.score += R.filled * 20 + (R.miss === 0 ? 500 : 0);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, 700 + (i % 2) * 200, { color: [C.honey, C.teal, C.red, C.white, C.honey][i], count: 22, speed: 480 });
      if (R.score > R.prevBest) { game.fx.popup('NEW RECORD', W / 2, 760, { color: C.red, size: 76 }); game.audio.play('se_milestone', 0.55); }
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickRun(dt) {
    if (R.hitStop > 0) R.hitStop -= dt;
    if (R.judge > 0) R.judge -= dt;
    if (R.drop > 0) R.drop -= dt;
    if (R.squeeze > 0) R.squeeze -= dt;
    R.beatPulse = Math.max(0, R.beatPulse - dt * 4);
    R.offPulse = Math.max(0, R.offPulse - dt * 4);
    for (var i = 0; i < R.slots.length; i++) if (R.slots[i].st !== 0) R.slots[i].fx += dt;
    if (R.hitStop <= 0) R.dispT = R.songT;
    if (R.dispT === undefined) R.dispT = R.songT;
    if (R.pendingBad) {
      R.pendingBad.t -= dt;
      if (R.pendingBad.t <= 0) {
        game.feedback.bad(NOZ_X, NOZ_Y - 110, { text: 'MISS', shake: R.demo ? 4 : 10, volume: vq(0.45) });
        R.pendingBad = null;
      }
    }
  }

  // ATTRACT: ゴーストが実ロジックで詰める(蓋つき・空の皿は見送る/一度だけ表拍で垂らしてこぼす)
  function stepDemo(dt) {
    demo.t += dt;
    var cycLen = R ? R.nBeats * SPB + 1.0 : 9;
    if (demo.t <= dt || demo.t >= cycLen) {
      demo.t = dt;
      R = newRun(true);
      demo.taps = []; demo.ti = 0;
      for (var i = 0; i < R.slots.length; i++) {
        var sl = R.slots[i];
        if (sl.j === DEMO_SPILL) { demo.taps.push(sl.j * SPB); continue; }
        if (sl.kind === 'J' && !sl.intro) demo.taps.push(sl.t);
      }
      onBeat(0);
    }
    demo.press = Math.max(0, demo.press - dt);
    while (demo.ti < demo.taps.length && R.songT >= demo.taps[demo.ti]) {
      demo.ti++;
      drip();
      demo.press = 0.12;
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawRoom(t) {
    game.draw.gradient(0, H, [[0, C.cream], [1, C.cream2]]);
    // 窓の外の養蜂場(フラットな丘・巣箱・花)
    rrect(40, 380, W - 80, 380, 36, '#cfeef5');
    game.draw.circle(260, 820, 300, '#a8dca0');
    game.draw.circle(820, 860, 360, '#94d28c');
    for (var h = 0; h < 4; h++) {
      var hx = 90 + h * 120, hy = 600 - (h % 2) * 16;
      rrect(hx, hy, 84, 64, 10, h % 2 ? C.white : '#ffe2a0');
      game.draw.rect(hx - 6, hy - 10, 96, 14, C.navy);
    }
    for (var f = 0; f < 7; f++) {
      var fx = 80 + f * 150, fy = 720 + (f % 3) * 10;
      var sw = Math.sin(t * 2 + f) * 4;
      game.draw.circle(fx + sw, fy, 12, f % 2 ? C.red : C.white);
      game.draw.circle(fx + sw, fy, 5, C.honey);
    }
  }

  function drawHopper(t) {
    // 蜜タンク(詰めるほど減る)とノズル管
    var hx = 540, hy = 470;
    rrect(hx - 130, hy - 90, 260, 210, 40, C.white);
    var lvl = 170 * R.hopper;
    rrect(hx - 112, hy + 104 - lvl, 224, lvl, 28, C.honey);
    for (var c = 0; c < 3; c++) game.draw.circle(hx - 60 + c * 60, hy + 40, 18, C.amber);
    game.draw.rect(hx - 70, hy - 110, 140, 28, C.navy);
    var sq = R.squeeze > 0 ? 10 : 0;
    game.draw.rect(hx - 22, hy + 120, 44, NOZ_Y - hy - 150 + sq, C.navy);
    // 養蜂家(レバーを引く)
    var kf = R.hitStop > 0 ? 2 : (R.squeeze > 0 ? 1 : 0);
    game.draw.sprite(KEEPER[kf], KEEPER_PAL, 850, 560 + Math.round(Math.sin(t * 2.4) * 2) * 3, 16, { anchor: 'center' });
    game.draw.line(744, 600, 680, NOZ_Y - 120 + sq * 2, C.navy, 12);
    game.draw.circle(744, 600, 16, C.honey);
    // 蜂(表拍ではねる)
    var bx = 540 + Math.sin(t * 1.3) * 300, by = 330 + Math.sin(t * 2.6) * 40 - R.beatPulse * 30;
    game.draw.sprite(BEE[Math.floor(t * 14) % 2], BEE_PAL, bx, by, 10, { anchor: 'center', flipX: Math.cos(t * 1.3) < 0 });
  }

  function drawShelf() {
    // 詰めた瓶が並ぶ棚
    rrect(64, 404, 300, 118, 24, C.white);
    var n = Math.min(R.filled, 20);
    for (var i = 0; i < n; i++) {
      var x = 92 + (i % 10) * 27, y = 442 + Math.floor(i / 10) * 50;
      game.draw.circle(x, y, 13, C.honey);
      game.draw.rect(x - 11, y - 18, 22, 8, C.lid);
    }
  }

  function drawJar(x, y, sl, k) {
    var hit = R.hitStop > 0 && R.hitSlot === sl;
    var s = hit ? 1.35 : 1;
    game.draw.circle(x, y, 74 * s, hit ? C.red : C.white);
    if (sl.kind === 'N') {
      game.draw.circle(x, y, 26 * s, C.grey);
      return;
    }
    if (sl.kind === 'C') {
      var warn = k > -1.2 && k < 0.2 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(x, y, 58 * s, warn ? C.red : C.lid);
      game.draw.circle(x, y, 46 * s, C.lid2);
      game.draw.circle(x, y, 30 * s, C.honey);
      game.draw.line(x - 20, y - 20, x + 20, y + 20, C.white, 8);
      game.draw.line(x + 20, y - 20, x - 20, y + 20, C.white, 8);
      return;
    }
    game.draw.circle(x, y, 58 * s, hit ? C.white : C.glass);
    var filled = sl.st === 'p' || sl.st === 'g';
    var lv = filled ? Math.min(1, sl.fx * 5) : 0;
    game.draw.circle(x, y, 40 * s, filled ? C.honey : (sl.st === 'gone' ? C.grey2 : C.navy));
    if (filled) game.draw.circle(x - 12, y - 12, 10 + lv * 4, C.white);
    if (sl.st === 'gone') { game.draw.line(x - 22, y, x + 22, y, C.red, 8); }
  }

  function drawTurntable(t) {
    var song = R.dispT === undefined ? R.songT : R.dispT;
    game.draw.circle(TCX, TCY, RING + 96, C.grey2);
    game.draw.circle(TCX, TCY, RING + 84, C.grey);
    game.draw.circle(TCX, TCY, RING - 90, C.white);
    // 回転の目印(台と一緒に回る)
    for (var m = 0; m < 12; m++) {
      var ma = -Math.PI / 2 + (song / SPB) * STEP + m * STEP + STEP / 2;
      game.draw.circle(TCX + Math.cos(ma) * (RING + 64), TCY + Math.sin(ma) * (RING + 64), 7, C.grey2);
    }
    game.draw.circle(TCX, TCY, 90, C.navy);
    game.draw.circle(TCX, TCY, 50, C.honey);
    // 皿と瓶(上=ノズル。近い順に描く)
    for (var i = 0; i < R.slots.length; i++) {
      var sl = R.slots[i];
      var k = (song - sl.t) / SPB;                 // 0 = ノズルの真下
      if (k < -5.5 || k > 5.5) continue;
      var a = slotAngle(sl, song);
      var x = TCX + Math.cos(a) * RING, y = TCY + Math.sin(a) * RING;
      if (sl.st === 'p' || sl.st === 'g') { if (sl.fx > 1.2) continue; }
      drawJar(x, y, sl, k);
    }
    // ノズル(判定の色で縁が変わる)
    var ring = R.judge > 0 ? R.judgeCol : (R.offPulse > 0.3 ? C.teal : C.navy);
    game.draw.circle(NOZ_X, NOZ_Y, 50 + (R.judge > 0 ? 10 : 0), ring);
    game.draw.circle(NOZ_X, NOZ_Y, 36, C.navy);
    game.draw.circle(NOZ_X, NOZ_Y, 16, C.honey);
    if (R.drop > 0) {
      var p = 1 - R.drop / 0.16;
      game.draw.circle(NOZ_X, NOZ_Y, 30 - p * 18, C.honey);
      if (p > 0.6) game.draw.circle(NOZ_X, NOZ_Y, 40 + (p - 0.6) * 120, C.honey, 0.6);
    }
  }

  function drawStrip() {
    // 1 & 2 & 3 & 4 & の帯。裏拍のしずく = 詰める瓶 / 灰 = 見送る
    var bar = Math.max(0, Math.floor(R.songT / (BEATS * SPB)));
    if (bar >= R.pat.length) bar = R.pat.length - 1;
    var half = R.running ? Math.floor((R.songT - bar * BEATS * SPB) / (SPB / 2)) : -1;
    rrect(70, STRIP_Y - 54, W - 140, 108, 54, C.white);
    for (var i = 0; i < 8; i++) {
      var x = 150 + i * 112, y = STRIP_Y;
      var cur = i === half;
      if (i % 2 === 0) {
        game.draw.circle(x, y, cur ? 26 : 20, cur ? C.navy : C.grey2);
        txt('' + (i / 2 + 1), x, y + 1, 24, C.white);
      } else {
        var kind = R.pat[bar].charAt((i - 1) / 2);
        var live = kind === 'J' && bar > 0;
        var r = cur ? 34 : 26;
        game.draw.circle(x, y + 6, r, live ? C.honey : C.grey);
        game.draw.circle(x, y - r * 0.55, r * 0.55, live ? C.honey : C.grey);
        if (cur) game.draw.circle(x, y + 6, r + 10, live ? C.honey : C.grey, 0.3);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 214, C.navy);
    txt('SCORE ' + R.score, 48, 70, 50, C.white, 'left');
    txt('BEST ' + R.prevBest, 48, 140, 32, C.honey, 'left');
    txt(R.filled + ' / ' + R.need, W - 48, 70, 52, C.honey, 'right');
    for (var m = 0; m < MISS_MAX; m++) {
      var mx = W - 70 - m * 56;
      game.draw.circle(mx, 150, 18, m < R.miss ? C.red : '#56648a');
      game.draw.circle(mx, 134, 10, m < R.miss ? C.red : '#56648a');
    }
    if (R.combo >= 2) txt('x' + R.combo, W / 2 + 60, 140, 40, C.teal);
    var progress = Math.max(0, Math.min(1, R.songT / (R.nBeats * SPB)));
    game.draw.rect(0, 206, W, 8, '#56648a');
    game.draw.rect(0, 206, W * progress, 8, C.honey);
  }

  function drawWorld(t) {
    drawRoom(t);
    drawHopper(t);
    drawShelf();
    drawTurntable(t);
    drawStrip();
  }

  function drawResult(t) {
    rrect(60, 380, W - 120, 560, 48, C.white);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, 470, 92, R.ok ? C.teal : C.red);
    txt('SCORE ' + R.score, W / 2, 570, 60, C.navy);
    txt('PERFECT ' + R.perfect + '  GOOD ' + R.good + '  MISS ' + R.miss, W / 2, 650, 34, C.navy);
    txt(R.filled + ' / ' + R.need + '   x' + R.maxCombo, W / 2, 720, 46, C.amber);
    if (R.ok && R.score > R.prevBest) txt('NEW RECORD', W / 2, 810, 58, Math.floor(t * 6) % 2 ? C.red : C.honey);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, 810, 44, C.amber);
    if (!R.ok) txt('あと' + Math.max(1, R.need - R.filled) + '瓶', W / 2, 890, 50, C.red);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || !R || R.over) return;
    if (!R.running) { game.audio.play('se_tap', 0.2); game.fx.burst(x, y, { color: C.honey, count: 3, speed: 90 }); return; }
    var r = drip();
    if (r === 'perfect' || r === 'good') game.fx.burst(NOZ_X, NOZ_Y, { color: C.honey, count: 8, speed: 220 });
    else if (r === 'miss') game.fx.burst(NOZ_X, NOZ_Y + 40, { color: C.honey, count: 12, speed: 340 });
  });
  game.onTap(function() {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (!R) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepClock(dt);
      tickRun(dt);
      drawWorld(t);
      game.draw.hand(NOZ_X + 120, H * 0.84 + (demo.press > 0 ? 24 : 0), { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, 0, W, 214, C.navy);
      var bob = Math.round(Math.sin(t * 2.4) * 2) * 3;
      txt(GAME_TITLE, W / 2, 84 + bob, 92, C.honey);
      txt('HI-SCORE ' + game.best, W / 2, 170, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 50, C.navy);
      else txt('TAP TO START', W / 2, H * 0.965, 44, C.red);
      return;
    }

    if (state === S.RESULT) {
      tickRun(dt);
      drawWorld(t);
      drawHud();
      drawResult(t);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 42, C.navy);
      return;
    }

    // ---- PLAYING ----
    if (R.over) {
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, jars: R.filled, need: R.need, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    } else if (R.ready > 0) {
      R.ready -= dt;
      if (R.ready <= 0) { R.running = true; R.beatT = 0; R.beatN = 0; onBeat(0); game.audio.play('se_tap', 0.4); }
    } else {
      stepClock(dt);
    }
    tickRun(dt);

    drawWorld(t);
    drawHud();
    if (R.ready > 0) txt(R.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.635, 120, C.navy);
    if (R.over && R.ok) txt('FINISH', W / 2, H * 0.635, 110, C.teal);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
