// K-DS-0029v3-banquet-honey-cake-tower.js
// 宴会場の蜜菓子タワー — 跳ねる拍の短い「ン」でパレットナイフに乗った蜜がけ菓子をつかみ、拍の頭で指を離して一枚ずつ落とし、ずれないよう塔を高く積む
// 操作: 押しっぱなしでナイフを握り、離した瞬間に菓子が落ちる(離した瞬間で判定)。菓子は跳ねる8分の短い方(裏の「ン」)でナイフに飛び乗り、拍の頭で塔のてっぺんに一番近づく。乗った時に指が押されていればつかめる(拍の頭の直前まで間に合う)。拍の頭で離すとPERFECT(蜜でぴたりと据わり、塔の傾きも少し戻る)/GOOD(早く離すと左・遅いと右へ少しずれて着地し、ずれは塔の傾きとして積み重なる)。早すぎる離し・つかまずに見送る・握ったまま拍を過ぎるとMISSで菓子は床へ落ちる。2小節ごとの最後の拍は休み(菓子が来ない)。4小節目からは蜜がゆるくなりGOODのずれが大きくなる(1拍前に上の画面の蜜壺が傾き、とろりと音がして予告)。塔の傾きが大きくなると揺れて赤く光り、きしむ音で倒れる前を知らせる
// 終わり: 前奏1小節+6小節(跳ねる108BPM・約15.5秒・21枚)を積み切り、MISS 3回以内で塔が倒れなければCLEAR。MISS 4回か、傾きが限界を超えて塔が倒れたらGAME OVER
// @mechanic: stack
// @theme: banquet_honey_cake_tower
// 世界観: ホテルの宴会場の厨房で、パティシエが跳ねるジャズの拍に合わせ、パレットナイフで蜜がけの焼き菓子を一枚ずつ落として祝宴用の塔に積み上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・積んだ段数・PERFECT/GOOD/MISS数・最大コンボ・最後の傾き
// スタイル: 2000s HANDHELD PASTEL
var STYLE = { bg: ['#e6dcff', '#dff5ec'], main: ['#ffd27a', '#ff9eb5', '#ffffff'], accent: ['#7ec8e3', '#b08cff'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;
  // 2000s HANDHELD PASTEL: パステル色の白縁の丸い形。画面を上下2枚に分け、上=情報(職人・塔の全景・拍)、下=遊び(塔のてっぺんの寄り)
  var C = {
    lav: STYLE.bg[0], mint: STYLE.bg[1], cake: STYLE.main[0], pink: STYLE.main[1], white: STYLE.main[2],
    sky: STYLE.accent[0], violet: STYLE.accent[1],
    honey: '#f2a93b', honeyD: '#c97a1c', ink: '#5a4a6e', ink2: '#8a7aa0', red: '#ff6b7a', tile: '#cdeee0', shell: '#f4f0fa', steel: '#c9d3e6',
  };

  var GAME_TITLE = 'HONEY TOWER';
  var BPM = 108;
  var SPB = 60 / BPM;
  var BEATS = 4;
  var SW = 2 / 3;                    // 跳ねる8分: 長い方 2/3・短い方 1/3
  var PLAY_BARS = 6;
  var DEMO_BARS = 3;
  var RUNNY_BAR = 4;                 // ここから蜜がゆるい
  var PERFECT_W = 0.055;
  var GOOD_W = 0.12;
  var MISS_MAX = 4;
  var HIT_STOP = 0.36;
  var TIME_LIMIT = 16;
  var LH = 54;                       // 1段の高さ
  var OFF_MAX = 28;                  // GOODの最大のずれ(px)
  var LEAN_MAX = 190;                // これを超えると倒れる
  var TOP_Y = Math.round(H * 0.68);  // 下の画面: 塔のてっぺんの高さ(カメラが追う)
  var TX = 540;                      // 台の中心
  var HOVER = 200;                   // 菓子が飛び乗る高さ
  var TOPSCR_Y = Math.round(H * 0.128);   // 上の画面(情報)
  var STRIP_Y = Math.round(H * 0.4);      // 拍の帯

  // 自作のスウィング(ヘ長調)。1小節ずつ拍クロックから鳴らす
  var MA = [['C5', SW], ['D5', 1 - SW], ['F5', SW], ['A5', 1 - SW], ['G5', 1], ['R', SW], ['F5', 1 - SW]];
  var MB = [['A5', SW], ['G5', 1 - SW], ['F5', SW], ['D5', 1 - SW], ['F5', 1.5], ['R', 0.5]];
  var MC = [['D5', SW], ['F5', 1 - SW], ['A5', SW], ['C6', 1 - SW], ['A#5', 1], ['A5', SW], ['G5', 1 - SW]];
  var MD = [['F5', SW], ['A5', 1 - SW], ['G5', SW], ['E5', 1 - SW], ['F5', 2]];
  var BF = [['F2', 1], ['A2', 1], ['C3', 1], ['D3', 1]];
  var BB = [['A#2', 1], ['D3', 1], ['F3', 1], ['D3', 1]];
  var BC = [['C3', 1], ['E3', 1], ['G3', 1], ['E3', 1]];
  var BF2 = [['F2', 1], ['C3', 1], ['A2', 1], ['C3', 1]];
  var SONG = [[MA, BF], [MB, BB], [MC, BC], [MD, BF2], [MA, BF], [MC, BB], [MD, BF2]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;
  var R = null;
  var demo = { t: 0, ev: [], ei: 0, down: false };

  // ── スプライト ─────────────────────────────────────────
  var CHEF = [
    ['...WWWWWW...', '..WWWWWWWW..', '..WWWWWWWW..', '...WWWWWW...', '...PPPPPP...', '..PKPPPPKP..', '..PPPPPPPP..', '...PPRRPP...', '..WWWWWWWW..', '.WWWBWWBWWW.', '.WWWWWWWWWPP', '.WWWWWWWW...', '..WWWWWWW...', '..VV...VV...'],
    ['...WWWWWW...', '..WWWWWWWW..', '..WWWWWWWW..', '...WWWWWW...', '...PPPPPP...', '..PKPPPPKP..', '..PPPPPPPP..', '...PPMMPP...', '..WWWWWWWW..', '.WWWBWWBWWW.', '.WWWWWWWWW..', '.WWWWWWWWWPP', '..WWWWWWW...', '..VV...VV...'],
    ['...WWWWWW...', '..WWWWWWWW..', '..WWWWWWWW..', '...WWWWWW...', '...PPPPPP...', '..PKPPKPPP..', '..PPPPPPPP..', '...PPMMPP...', 'PPWWWWWWWWPP', '.WWWBWWBWWW.', '.WWWWWWWWW..', '.WWWWWWWW...', '..WWWWWWW...', '..VV...VV...'],
  ];
  var CHEF_PAL = { W: C.white, P: '#ffd9cc', K: C.ink, R: C.pink, M: '#c0506a', B: C.violet, V: C.ink2 };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function pill(x, y, w, h, col) {
    var r = h / 2;
    game.draw.rect(x + r, y, w - h, h, col);
    game.draw.circle(x + r, y + r, r, col);
    game.draw.circle(x + w - r, y + r, r, col);
  }
  function panel(x, y, w, h, r, fill) {
    pill2(x - 10, y - 10, w + 20, h + 20, r + 10, C.white);
    pill2(x, y, w, h, r, fill);
  }
  function pill2(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col);
    game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col);
    game.draw.circle(x + w - r, y + h - r, r, col);
  }
  function vq(v) { return armed ? (R && R.demo ? v * 0.4 : v) : 0.001; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function layerW(i) { return 380 - i * 7; }

  // ── 進行(拍クロックは1本) ─────────────────────────────
  function newRun(isDemo) {
    var bars = isDemo ? DEMO_BARS : PLAY_BARS;
    var slots = [];
    for (var b = 1; b <= bars; b++) {
      for (var i = 0; i < BEATS; i++) {
        if (b % 2 === 0 && i === BEATS - 1) continue;   // 2小節ごとの最後の拍は休み
        var k = b * BEATS + i;
        slots.push({ k: k, bar: b, t: k * SPB, popped: false, caught: false, st: 0 });
      }
    }
    return {
      demo: isDemo, bars: bars, nBeats: (bars + 1) * BEATS, slots: slots, si: 0,
      ready: isDemo ? 0 : 0.8, running: isDemo, beatN: 0, beatT: 0, songT: 0, melBar: 0, andDone: -1,
      finger: false, held: null, layers: [], lean: 0, cam: 0, debris: [],
      score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0,
      hitStop: 0, pendingBad: null, flash: 0, pulse: 0, andPulse: 0, chefT: 0, warnT: 0, creakT: 0, runny: false, potT: 0,
      over: false, ok: false, fell: false, endWait: 0, prevBest: game.best, milestone: false,
    };
  }
  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (!R.demo) game.audio.stopBgm();
  }

  function playBar(b) {
    if (!armed || b >= SONG.length) return;
    game.audio.melody(SONG[b][0], { tempo: BPM, wave: 'square', volume: R.demo ? 0.018 : 0.04, bass: SONG[b][1], bassWave: 'triangle', bassVolume: R.demo ? 0.04 : 0.1 });
  }

  function onBeat(k) {
    if (k >= R.nBeats) return;
    R.pulse = 1;
    var q = R.demo ? 0.4 : 1;
    tone(k % 2 === 0 ? 3200 : 2800, 0.05, { wave: 'square', volume: 0.012 * q });   // ライドの「チン」
    if (k === RUNNY_BAR * BEATS - 1 && R.bars >= RUNNY_BAR) {
      R.potT = 1.2;                                                                 // 蜜壺が傾く予告
      tone(392, 0.4, { wave: 'sine', volume: 0.08 * q, slide: -160 });
    }
    if (k === RUNNY_BAR * BEATS && R.bars >= RUNNY_BAR) R.runny = true;
    if (Math.abs(R.lean) > LEAN_MAX * 0.6) { R.creakT = 0.3; tone(150, 0.12, { wave: 'sawtooth', volume: 0.04 * q, slide: 40 }); }
  }
  function onAnd(k) {
    // 跳ねる8分の短い方: 次の拍に菓子が来るならナイフに飛び乗る
    R.andPulse = 1;
    var q = R.demo ? 0.4 : 1;
    if (k % 2 === 1) tone(3000, 0.03, { wave: 'square', volume: 0.01 * q });
    var s = R.slots[R.si];
    if (s && !s.popped && s.k === k + 1) {
      s.popped = true;
      tone('C6', 0.05, { wave: 'triangle', volume: 0.05 * q, slide: 300 });
      if (R.finger) catchIt(s);
    }
  }

  function catchIt(s) {
    s.caught = true; R.held = s;
    tone('E6', 0.04, { wave: 'triangle', volume: R.demo ? 0.02 : 0.05 });
  }

  function stepClock(dt) {
    if (!R.running || R.over) return;
    var before = R.beatT;
    R.beatT += dt;
    if (before < SPB * SW && R.beatT >= SPB * SW && R.beatT < SPB) onAnd(R.beatN);
    while (R.beatT >= SPB) {
      R.beatT -= SPB; R.beatN++;
      onBeat(R.beatN);
      if (R.beatT >= SPB * SW) onAnd(R.beatN);
    }
    R.songT = R.beatN * SPB + R.beatT;
    var t = R.songT;
    if (R.melBar < R.bars + 1 && t >= R.melBar * BEATS * SPB - 0.06) { playBar(R.melBar); R.melBar++; }
    var s = R.slots[R.si];
    if (s) {
      if (s.popped && !s.caught && R.finger && t < s.t - GOOD_W) catchIt(s);
      if (!s.caught && t >= s.t) { slipOff(s, 'unheld'); }
      else if (s.caught && t > s.t + GOOD_W) { slipOff(s, 'held'); }
    }
    if (R.demo) return;
    if (R.si >= R.slots.length && t > R.slots[R.slots.length - 1].t + GOOD_W + 0.1) finish(true);
    else if (t > TIME_LIMIT) finish(R.miss < MISS_MAX);
  }

  function resolveSlot(s, st) {
    s.st = st;
    if (R.held === s) R.held = null;
    R.si++;
  }

  // 指を離した(入力とデモで共通)
  function letGo() {
    var s = R.held;
    if (!s || R.over || !R.running) return 'none';
    var dt = R.songT - s.t;
    if (dt < -GOOD_W) { slipOff(s, 'early'); return 'miss'; }
    var perfect = Math.abs(dt) <= PERFECT_W;
    var off;
    if (perfect) off = -R.lean * 0.3;
    else {
      var dir = dt < 0 ? -1 : 1;                 // 早い離し = ナイフの先から左へ滑る / 遅い = ナイフに押されて右へ
      off = dir * OFF_MAX * Math.min(1, Math.abs(dt) / GOOD_W) * (R.runny ? 1.6 : 1);
    }
    var topX = TX + R.lean;
    var dropH = Math.max(24, HOVER * Math.max(0, -dt) / (SPB * (1 - SW)) + 24);
    R.layers.push({ x: topX + off, w: layerW(R.layers.length), fall: dropH, perfect: perfect, sq: 0 });
    R.lean += off;
    resolveSlot(s, perfect ? 'p' : 'g');
    R.combo++; if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    R.score += (perfect ? 100 : 50) + Math.min(R.combo, 10) * 10;
    if (perfect) R.perfect++; else R.good++;
    R.chefT = 0.2;
    game.feedback.good(TX + R.lean, TOP_Y - 150, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.violet : C.honeyD, size: perfect ? 52 : 42, count: perfect ? 10 : 6, volume: vq(0.2) });
    tone(perfect ? 'A5' : 'F5', 0.1, { wave: 'triangle', volume: R.demo ? 0.03 : 0.09, slide: -120 });
    if (!R.demo && !R.milestone && R.layers.length === 10) {
      R.milestone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('10', 220, 420, { color: C.violet, size: 110 });
    }
    if (Math.abs(R.lean) > LEAN_MAX) collapse();
    return perfect ? 'perfect' : 'good';
  }

  function slipOff(s, why) {
    if (R.over) return;
    var y = TOP_Y - (why === 'unheld' ? HOVER : 40);
    R.debris.push({ x: TX + R.lean + 60, y: y, vx: 260, vy: -200, w: layerW(R.layers.length), flash: HIT_STOP, life: 1.6 });
    resolveSlot(s, 'miss');
    doMiss();
  }

  function doMiss() {
    R.miss++; R.combo = 0;
    R.hitStop = HIT_STOP; R.flash = HIT_STOP;
    R.pendingBad = { t: 0.3 };
    tone(130, 0.22, { wave: 'sawtooth', volume: R.demo ? 0.03 : 0.1, slide: -50 });
    if (!R.demo && R.miss >= MISS_MAX) finish(false);
  }

  function collapse() {
    if (R.demo) { R.lean *= 0.4; return; }
    R.fell = true;
    for (var i = 0; i < R.layers.length; i++) {
      var L = R.layers[i];
      R.debris.push({ x: L.x, y: TOP_Y + (R.layers.length - 1 - i) * LH, vx: (R.lean > 0 ? 1 : -1) * (120 + i * 18), vy: -60 - i * 10, w: L.w, flash: 0, life: 2 });
    }
    R.layers = [];
    R.hitStop = HIT_STOP; R.flash = HIT_STOP;
    R.pendingBad = { t: 0.3 };
    game.fx.shake(16, 0.4);
    finish(false);
  }

  function finish(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok && !R.fell && R.miss < MISS_MAX; R.endWait = 1.4;
    game.audio.stopBgm();
    if (R.ok) {
      R.score += R.layers.length * 30 + (R.miss === 0 ? 400 : 0);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(180 + i * 180, 380 + (i % 2) * 160, { color: [C.pink, C.cake, C.sky, C.violet, C.white][i], count: 22, speed: 440 });
      game.fx.flash(C.white, 0.2);
      if (R.score > R.prevBest) { game.fx.popup('NEW RECORD', W / 2, 560, { color: C.violet, size: 76 }); game.audio.play('se_milestone', 0.55); }
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function fingerDown() {
    R.finger = true;
    var s = R.slots[R.si];
    if (s && s.popped && !s.caught && R.running && !R.over && R.songT < s.t - GOOD_W) catchIt(s);
  }
  function fingerUp() {
    R.finger = false;
    return letGo();
  }

  function tickRun(dt) {
    if (R.hitStop > 0) R.hitStop -= dt;
    if (R.flash > 0) R.flash -= dt;
    if (R.chefT > 0) R.chefT -= dt;
    if (R.warnT > 0) R.warnT -= dt;
    if (R.creakT > 0) R.creakT -= dt;
    if (R.potT > 0) R.potT -= dt;
    R.pulse = Math.max(0, R.pulse - dt * 4);
    R.andPulse = Math.max(0, R.andPulse - dt * 5);
    if (R.pendingBad) {
      R.pendingBad.t -= dt;
      if (R.pendingBad.t <= 0) {
        game.feedback.bad(TX + R.lean, TOP_Y - 120, { text: 'MISS', shake: R.demo ? 4 : 10, volume: vq(0.45) });
        R.pendingBad = null;
      }
    }
    for (var i = 0; i < R.layers.length; i++) {
      var L = R.layers[i];
      if (L.fall > 0) { L.fall = Math.max(0, L.fall - dt * 1400); if (L.fall === 0) L.sq = 0.15; }
      if (L.sq > 0) L.sq -= dt;
    }
    if (R.hitStop <= 0) {
      for (var d = R.debris.length - 1; d >= 0; d--) {
        var b = R.debris[d];
        b.vy += 1600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.flash > 0) b.flash -= dt;
        if (b.life <= 0) R.debris.splice(d, 1);
      }
    }
    var camT = R.layers.length * LH;
    R.cam += (camT - R.cam) * Math.min(1, dt * 6);
  }

  // ATTRACT: ゴーストが実ロジックで「ンで握って頭で離す」。2小節目で早く離して1枚落とし、3小節目で少し遅れてGOOD
  function stepDemo(dt) {
    demo.t += dt;
    var cycLen = R ? R.nBeats * SPB + 1.2 : 10;
    if (demo.t <= dt || demo.t >= cycLen) {
      demo.t = dt;
      R = newRun(true);
      demo.ev = []; demo.ei = 0; demo.down = false;
      for (var i = 0; i < R.slots.length; i++) {
        var s = R.slots[i];
        var rel = s.t;
        if (i === 5) rel = s.t - 0.2;          // 早すぎる離し(MISS)
        if (i === 8) rel = s.t + 0.09;         // 少し遅い(GOOD)
        demo.ev.push({ t: s.t - SPB * (1 - SW) - 0.08, down: true });
        demo.ev.push({ t: rel, down: false });
      }
    }
    while (demo.ei < demo.ev.length && R.songT >= demo.ev[demo.ei].t) {
      var e = demo.ev[demo.ei++];
      demo.down = e.down;
      if (e.down) fingerDown(); else fingerUp();
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function spatulaY() {
    // ナイフの高さ: 頭のあと長い方でゆっくり上がり、短い方で塔のてっぺんへすっと下りる
    var p = R.running ? R.beatT / SPB : 0.5;
    var h;
    if (p < SW) { var u = p / SW; h = 24 + (HOVER - 24) * Math.sin(u * Math.PI / 2); }
    else { var v = (p - SW) / (1 - SW); h = HOVER - (HOVER - 24) * v * v; }
    return TOP_Y - h;
  }

  function drawTopScreen(t) {
    panel(46, TOPSCR_Y, W - 92, 580, 40, C.lav);
    // 宴会場の窓とシャンデリア
    pill2(80, 280, 380, 230, 30, '#f6f0ff');
    for (var c = 0; c < 5; c++) {
      var cx = 150 + c * 60;
      game.draw.line(cx, 290, cx, 340 + (c % 2) * 20, C.ink2, 3);
      game.draw.circle(cx, 350 + (c % 2) * 20, 14 + Math.sin(t * 3 + c) * 2, C.cake);
      game.draw.circle(cx, 350 + (c % 2) * 20, 6, C.white);
    }
    for (var g = 0; g < 4; g++) pill2(100 + g * 90, 440, 70, 50, 20, [C.pink, C.sky, C.cake, C.violet][g]);
    // パティシエ
    var cf = R.flash > 0 ? 2 : (R.chefT > 0 || R.finger ? 1 : 0);
    game.draw.sprite(CHEF[cf], CHEF_PAL, 270, 600 + Math.round(Math.sin(t * 2.2) * 2) * 3 - R.pulse * 6, 15, { anchor: 'center' });
    // 蜜壺(4小節目から蜜がゆるい。1拍前に傾いて予告)
    var tip = R.potT > 0 ? 18 : 0;
    var px = 480, py = 590;
    pill2(px - 50, py - 60 + tip * 0.3, 100, 110, 34, R.runny ? C.honey : C.cake);
    game.draw.rect(px - 30, py - 76 + tip * 0.3, 60, 22, C.ink2);
    if (R.potT > 0 && Math.floor(t * 10) % 2 === 0) game.draw.circle(px, py, 84, C.red, 0.25);
    if (R.runny || R.potT > 0) for (var d = 0; d < 3; d++) game.draw.circle(px + 46, py + 30 + ((t * 120 + d * 40) % 120), 10, C.honey);
    // 塔の全景(小さく)
    var ox = 800, oy = 690, sc = 0.28;
    pill2(ox - 140, 290, 280, 430, 40, '#f6f0ff');
    game.draw.rect(ox - 60, oy, 120, 10, C.ink2);
    for (var i = 0; i < R.layers.length; i++) {
      var L = R.layers[i];
      var lx = ox + (L.x - TX) * sc, ly = oy - (i + 1) * LH * sc * 0.9;
      game.draw.rect(lx - L.w * sc / 2, ly, L.w * sc, LH * sc * 0.8, L.perfect ? C.cake : C.honey);
    }
    var lean = Math.abs(R.lean) / LEAN_MAX;
    var lc = lean > 0.6 ? C.red : (lean > 0.3 ? C.honey : C.sky);
    game.draw.rect(ox - 110, 316, 220, 18, C.white);
    game.draw.rect(ox - 2, 310, 4, 30, C.ink2);
    game.draw.circle(ox + Math.max(-1, Math.min(1, R.lean / LEAN_MAX)) * 106, 325, 14, lc);
  }

  function drawStrip(t) {
    // 1小節の4拍: 大きい丸 = 頭(菓子が落ちる拍)、小さい丸 = 跳ねる短い「ン」(2/3の位置)
    var bar = Math.max(0, Math.min(R.bars, Math.floor(R.songT / (BEATS * SPB))));
    var y = STRIP_Y;
    pill2(150, y - 30, W - 300, 60, 30, C.white);
    for (var i = 0; i < BEATS; i++) {
      var x = 230 + i * 170;
      var k = bar * BEATS + i;
      var has = false;
      for (var j = 0; j < R.slots.length; j++) if (R.slots[j].k === k) { has = true; break; }
      var cur = R.running && R.beatN === k;
      var r = cur ? 24 + R.pulse * 8 : 20;
      game.draw.circle(x, y, r, has ? (cur ? C.violet : C.pink) : C.steel);
      var ax = x + 170 * SW;
      var curA = cur && R.beatT >= SPB * SW;
      game.draw.circle(ax, y, curA ? 13 : 9, curA ? C.honey : C.steel);
    }
  }

  function drawKitchen(t) {
    panel(46, 920, W - 92, 880, 40, C.mint);
    // 壁のタイル(カメラと一緒に流れる)
    var off = (R.cam * 0.5) % 120;
    for (var row = -1; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        if ((row + col) % 2 === 0) game.draw.rect(56 + col * 121, 930 + row * 120 + off, 116, 116, C.tile);
      }
    }
    // 宴会場への扉の光
    pill2(80, 960, 160, 260, 70, C.lav);
    game.draw.circle(160, 1050, 40 + Math.sin(t * 2) * 4, C.cake, 0.6);
  }

  function drawTower(t) {
    var n = R.layers.length;
    var wob = Math.abs(R.lean) > LEAN_MAX * 0.6 ? Math.sin(t * 18) * 6 : 0;
    var baseY = TOP_Y + R.cam;
    // ケーキスタンド
    var sx = TX;
    pill2(sx - 230, baseY, 460, 26, 13, C.white);
    pill2(sx - 220, baseY + 4, 440, 18, 9, C.steel);
    game.draw.rect(sx - 16, baseY + 26, 32, 180, C.steel);
    pill2(sx - 110, baseY + 200, 220, 26, 13, C.steel);
    for (var i = 0; i < n; i++) {
      var L = R.layers[i];
      var k = n > 1 ? i / (n - 1) : 1;
      var x = L.x + wob * k;
      var y = baseY - (i + 1) * LH - L.fall;
      if (y > 1806) continue;
      var squash = L.sq > 0 ? 6 : 0;
      pill(x - L.w / 2 - 4 - squash, y - 4 + squash, L.w + 8 + squash * 2, LH + 4 - squash, C.white);
      pill(x - L.w / 2 - squash, y + squash, L.w + squash * 2, LH - 4 - squash, L.perfect ? C.cake : '#ffc46a');
      pill(x - L.w / 2 + 12, y + 5, L.w - 24, 16, C.honey);
      game.draw.circle(x - L.w / 2 + 18, y + LH - 6, 7, C.honey);
      game.draw.circle(x + L.w / 2 - 26, y + LH - 2, 6, C.honey);
    }
    // 倒れそうな時はてっぺんが赤く光る(予告)
    if (Math.abs(R.lean) > LEAN_MAX * 0.6 && n > 0 && Math.floor(t * 8) % 2 === 0) {
      var top = R.layers[n - 1];
      game.draw.circle(top.x + wob, baseY - n * LH + 10, top.w * 0.55, C.red, 0.3);
    }
    // 落ちる菓子
    for (var d = 0; d < R.debris.length; d++) {
      var b = R.debris[d];
      var fl = b.flash > 0;
      var bw = fl ? b.w * 1.25 : b.w;
      pill(b.x - bw / 2, b.y, bw, LH, fl ? C.white : C.honey);
      if (fl) pill(b.x - bw / 2 - 6, b.y - 6, bw + 12, LH + 12, C.red);
      if (fl) pill(b.x - bw / 2, b.y, bw, LH, C.white);
    }
  }

  function drawSpatula(t) {
    var sy = spatulaY();
    var x = TX + R.lean;
    var s = R.slots[R.si];
    var loaded = s && s.popped && s.st === 0;
    var grip = R.finger && !R.over;
    // 柄は右から
    game.draw.line(x + 60, sy + 26, W - 60, sy - 40, C.ink2, 20);
    game.draw.line(x + 60, sy + 26, W - 60, sy - 40, C.steel, 12);
    pill2(W - 150, sy - 80, 110, 80, 36, grip ? C.violet : C.pink);    // 手袋(握るとむらさき)
    if (grip) game.draw.circle(W - 95, sy - 40, 70, C.violet, 0.25);
    pill(x - 190, sy + 20, 380, 16, C.steel);
    if (loaded) {
      var w = layerW(R.layers.length);
      var hop = (!s.caught && R.andPulse > 0) ? -R.andPulse * 30 : 0;
      pill(x - w / 2 - 4, sy - LH + 16 + hop, w + 8, LH + 4, s.caught ? C.violet : C.white);
      pill(x - w / 2, sy - LH + 20 + hop, w, LH - 4, C.cake);
      pill(x - w / 2 + 12, sy - LH + 25 + hop, w - 24, 16, C.honey);
    }
    // 着地点のガイド(拍の頭が近いほど濃く)
    var near = s ? Math.max(0, 1 - Math.abs(R.songT - s.t) / (SPB * 0.6)) : 0;
    if (near > 0 && loaded) game.draw.line(x, sy + 40, x, TOP_Y - 6, C.violet + Math.round(near * 200 + 30).toString(16), 4);
  }

  function drawHud() {
    pill2(20, 14, W - 40, 200, 40, C.white);
    pill2(30, 24, W - 60, 180, 34, C.pink);
    txt('SCORE ' + R.score, 70, 82, 48, C.ink, 'left');
    txt('BEST ' + R.prevBest, 70, 150, 30, C.ink2, 'left');
    txt(R.layers.length + ' / ' + R.slots.length, W - 70, 82, 50, C.ink, 'right');
    for (var m = 0; m < MISS_MAX; m++) {
      var mx = W - 90 - m * 60;
      game.draw.circle(mx, 152, 20, C.white);
      game.draw.circle(mx, 152, 15, m < R.miss ? C.red : C.cake);
    }
    if (R.combo >= 2) txt('x' + R.combo, W / 2 + 40, 150, 40, C.violet);
  }

  function drawWorld(t) {
    game.draw.gradient(0, H, [[0, '#f3ecff'], [1, '#e8f7f0']]);
    drawKitchen(t);
    drawTower(t);
    drawSpatula(t);
    // 下の画面の外へはみ出した分を隠す(本体の縁)
    game.draw.rect(0, 1816, W, H - 1816, '#e8f7f0');
    pill2(36, 1800, W - 72, 20, 10, C.white);
    // 上の画面とちょうつがい
    game.draw.rect(0, 0, W, 916, '#f3ecff');
    drawTopScreen(t);
    pill2(120, 840, W - 240, 56, 28, C.steel);
    game.draw.circle(170, 868, 18, C.white);
    game.draw.circle(W - 170, 868, 18, C.white);
    drawStrip(t);
  }

  function drawResult(t) {
    panel(90, 290, W - 180, 520, 40, C.white);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, 370, 92, R.ok ? C.violet : C.red);
    txt('SCORE ' + R.score, W / 2, 470, 58, C.ink);
    txt('PERFECT ' + R.perfect + '  GOOD ' + R.good + '  MISS ' + R.miss, W / 2, 546, 32, C.ink2);
    txt(R.layers.length + ' / ' + R.slots.length + '   x' + R.maxCombo, W / 2, 616, 46, C.honeyD);
    if (R.ok && R.score > R.prevBest) txt('NEW RECORD', W / 2, 700, 58, Math.floor(t * 6) % 2 ? C.violet : C.pink);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, 700, 44, C.honeyD);
    if (!R.ok) txt('あと' + Math.max(1, R.slots.length - R.layers.length) + '段', W / 2, 776, 50, C.red);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || !R || R.over) return;
    fingerDown();
    game.audio.tone(R.held ? 784 : 523, 0.04, { wave: 'triangle', volume: 0.06 });
    game.fx.burst(x, y, { color: C.violet, count: 4, speed: 120 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || R.over) { if (R) R.finger = false; return; }
    var r = fingerUp();
    if (r === 'none') game.audio.tone(440, 0.03, { wave: 'triangle', volume: 0.04 });
    else if (r !== 'miss') game.fx.burst(TX + R.lean, TOP_Y, { color: C.honey, count: 8, speed: 220 });
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
      game.draw.hand(800, H * 0.86 + (demo.down ? 24 : 0), { press: demo.down, scale: 16 });
      pill2(20, 14, W - 40, 200, 40, C.white);
      pill2(30, 24, W - 60, 180, 34, C.pink);
      var bob = Math.round(Math.sin(t * 2.4) * 2) * 3;
      txt(GAME_TITLE, W / 2, 92 + bob, 96, C.white);
      game.draw.text(GAME_TITLE, W / 2, 88 + bob, { size: 96, color: C.violet, bold: true, align: 'center' });
      txt('HI-SCORE ' + game.best, W / 2, 168, 38, C.ink);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 50, C.violet);
      else txt('TAP TO START', W / 2, H * 0.965, 44, C.ink);
      return;
    }

    if (state === S.RESULT) {
      tickRun(dt);
      drawWorld(t);
      drawHud();
      drawResult(t);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 42, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (R.over) {
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, layers: R.layers.length, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, lean: Math.round(R.lean) };
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
    if (R.ready > 0) txt(R.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 120, C.violet);
    if (R.over && R.ok) txt('FINISH', W / 2, H * 0.6, 110, C.violet);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
