// K-DS-0048v3-chestnut-grove-big-catch.js
// 栗林の大粒受け — 食い込む拍ごとに枝のイガから二つ同時に落ちてくる栗を見比べ、大きい方の着地に合わせて籠を滑らせて受ける
// 操作: 画面のどこでも指を左か右へはじくと、真ん中の子が柄付きの籠をその側の落ち口へ滑らせて戻す(はじいた瞬間で判定)。栗は着地の2拍前に左右のイガが割れて大きさが見え(割れる音も同じ食い込む拍)、1拍前に同時に落ち始める。二つが地面に着く瞬間(拍の頭か、その前の裏へ食い込んだ8分)に大きい方の側へはじくとPERFECT/GOOD。小さい方・早すぎ・遅すぎ・見送りはMISSで、大きい方が白く光って正解を見せる。上の8マスの窓に今の小節と次の小節の着地の8分が点いている。栗の来ない時のはじきは連続が切れるだけ
// 終わり: 前奏1小節+6小節(120BPM・28拍・14秒・17組、3-3-2→裏への食い→混合)を終えてMISS 3回以内ならCLEAR(判定点+連続ボーナス+大きさが近い組ほど加点)。MISS 4回でGAME OVER。二つの大きさの差は組が進むほど小さくなる
// @mechanic: size_judge
// @theme: chestnut_grove_big_catch
// 世界観: 秋の栗林で、柄付きの籠を持った子どもが食い込む拍で同時に落ちてくる二つの栗を見比べ、大きな栗だけを着地の瞬間に籠を滑らせて受け取っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・受けた大粒の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 8bit PC MONITOR
var STYLE = { bg: ['#000000', '#2038d8'], main: ['#d82828', '#28c828', '#f0f0f0'], accent: ['#e8e828', '#28d8d8'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ(黒・青・赤・紫・緑・水・黄・白)。細い線と二重線の窓のUI、中間色は市松ディザ
  var K0 = STYLE.bg[0], BLU = STYLE.bg[1];
  var RED = STYLE.main[0], GRN = STYLE.main[1], WHT = STYLE.main[2];
  var YEL = STYLE.accent[0], CYN = STYLE.accent[1], MAG = '#d838d8';

  var GAME_TITLE = 'BIG CHESTNUT';
  var BPM = 120;
  var SPB = 60 / BPM;            // 1拍 0.5秒
  var E8 = SPB / 2;              // 8分 0.25秒
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11, OFF_W = 0.2;
  var READY_T = 0.8;
  var TIME_LIMIT = 14;           // 前奏1小節+6小節 = 28拍 × 0.5秒
  var MISS_MAX = 4;
  var COL_X = [300, 780];
  var HOME_X = 540;
  var BRANCH_Y = 560;
  var GROUND_Y = 1250;
  var FALL = SPB;                // 落ちる時間 = ちょうど1拍
  var OPEN = 2 * SPB;            // イガが割れるのは着地の2拍前

  // [小節, 小節内の8分(0〜7), 大きい方(0=左 1=右)]。2・3・6小節目は3-3-2、4・5小節目は裏への食い
  var PLAN = [
    [1, 0, 0], [1, 4, 1],
    [2, 0, 1], [2, 3, 0], [2, 6, 0],
    [3, 0, 1], [3, 3, 1], [3, 6, 0],
    [4, 3, 1], [4, 7, 0],
    [5, 1, 0], [5, 3, 1], [5, 5, 1], [5, 7, 0],
    [6, 0, 1], [6, 3, 0], [6, 6, 1]
  ];
  var BARS = 7;
  var DEMO_PLAN = [[1, 0, 0], [1, 3, 1], [1, 6, 1], [2, 3, 0], [2, 7, 1]];
  var DEMO_BARS = 3;
  var DEMO_FAIL = 3;             // デモは4組目で小さい方へはじいてMISS

  // ---- スプライト ----
  var NUT = [
    '....y....',
    '...rry...',
    '..rrrry..',
    '.rrrrrry.',
    'rrrrrrrrr',
    'rkrkrkrkr',
    'krkrkrkrk',
    '.wywywyw.',
    '..wywyw..'
  ];
  var BURR = [
    'g..g.g.g..g',
    '.g.ggggg.g.',
    '..g.....g..',
    'gg.......gg',
    '.g.......g.',
    'gg.......gg',
    '.g.......g.',
    'gg.......gg',
    '..g.....g..',
    '.g.ggggg.g.',
    'g..g.g.g..g'
  ];
  var KID_A = [
    '...cccccc...',
    '..cccccccc..',
    '..wwwwwwwcc.',
    '...wwwwww...',
    '...wkwwkw...',
    '...wwwwww...',
    '....wwww....',
    '..rrrrrrrr..',
    '.rrrrrrrrrr.',
    'ww.rrrrrr.ww',
    '...bbbbbb...',
    '...bb..bb...',
    '...bb..bb...',
    '..yyy..yyy..'
  ];
  var KID_B = [
    '...cccccc...',
    '..cccccccc..',
    '..wwwwwwwcc.',
    '...wwwwww...',
    '...wkwwkw...',
    '...wwwwww...',
    '....wwww....',
    '..rrrrrrrrww',
    '.rrrrrrrrrww',
    '.rrrrrrrr...',
    '...bbbbbb...',
    '..bb....bb..',
    '.bb......bb.',
    'yyy......yyy'
  ];
  var KID_C = [
    'ww.cccccc.ww',
    '.wcccccccw..',
    '..wwwwwwwcc.',
    '...wwwwww...',
    '...wkwwkw...',
    '...wwkkww...',
    '....wwww....',
    '..rrrrrrrr..',
    '..rrrrrrrr..',
    '...rrrrrr...',
    '...bbbbbb...',
    '...bb..bb...',
    '...bb..bb...',
    '..yyy..yyy..'
  ];
  var KID_PAL = { c: CYN, w: WHT, k: K0, r: RED, b: BLU, y: YEL };
  var NUT_PAL = { r: RED, k: K0, y: YEL, w: WHT };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, pairs, beats, endT, running, songT, schedB, beatN, step8, readyT, realT, hitStop;
  var score, combo, maxCombo, perfects, goods, misses, caught, rollers, missFx, swp, fl, cheerT;
  var over, won, outroT, prevBest, beatPulse, ms;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function buildSong() {
    var plan = demoMode ? DEMO_PLAN : PLAN;
    var nb = demoMode ? DEMO_BARS : BARS;
    pairs = [];
    for (var i = 0; i < plan.length; i++) {
      var k = i / Math.max(1, plan.length - 1);
      var bigR = 46 - k * 6, smallR = 26 + k * 7;
      pairs.push({ t: (plan[i][0] * 8 + plan[i][1]) * E8, big: plan[i][2], rBig: bigR, rSmall: smallR, res: '', idx: i, warned: false, bar: plan[i][0], e: plan[i][1] });
    }
    beats = [];
    for (var b = 0; b < nb * 4; b++) beats.push(b * SPB);
    endT = nb * 4 * SPB;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    buildSong();
    running = demoMode; songT = 0; schedB = 0; beatN = -1; step8 = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; caught = 0;
    rollers = []; missFx = null; swp = null; fl = null; cheerT = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; beatPulse = 0; ms = false;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル・Aマイナーの食い込む節)。8分単位で、ベースは3-3-2で刻む ----
  var MEL = [
    ['A4', null, null, 'C5', null, null, 'E5', null],
    ['D5', null, null, 'C5', null, 'B4', null, 'A4'],
    ['G4', null, null, 'B4', null, null, 'D5', null],
    ['E5', null, 'D5', null, null, 'C5', null, 'B4']
  ];
  var BAS = [
    ['A2', null, null, 'A2', null, null, 'E2', null],
    ['F2', null, null, 'F2', null, null, 'G2', null],
    ['C3', null, null, 'C3', null, null, 'G2', null],
    ['E2', null, null, 'E2', null, null, 'E2', 'G#2']
  ];
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4), q = (b % 4) * 2;
    var m = MEL[bar % 4], ba = BAS[bar % 4];
    var intro = bar === 0;
    game.audio.melody([[intro ? 'R' : (m[q] || 'R'), 0.5], [intro ? 'R' : (m[q + 1] || 'R'), 0.5]], {
      tempo: BPM, wave: 'square', volume: 0.028,
      bass: [[ba[q] || 'R', 0.5], [ba[q + 1] || 'R', 0.5]], bassWave: 'triangle', bassVolume: 0.14
    });
    game.audio.melody([[b % 4 === 0 ? 1600 : 1200, 0.08], ['R', 0.42], [2400, 0.04], ['R', 0.46]], { tempo: BPM, wave: 'square', volume: b % 4 === 0 ? 0.03 : 0.018 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < beats.length && songT >= beats[schedB] - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < beats.length && songT >= beats[beatN + 1]) { beatN++; beatPulse = 1; }
    step8 = Math.floor(songT / E8);
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (!p.warned && songT >= p.t - OPEN) {
        p.warned = true;
        sfx(180, 0.06, { wave: 'sawtooth', volume: 0.05, slide: 120 });
        sfx(900, 0.03, { wave: 'square', volume: 0.025 });
      }
      if (!p.res && songT > p.t + GOOD_W + 0.02) { missPair(p, 'late'); if (over || hitStop > 0) return; }
    }
    if (songT >= endT + 0.1) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function nutY(p) {
    var t0 = p.t - FALL;
    if (songT < t0) return BRANCH_Y;
    var q = (songT - t0) / FALL;
    if (q >= 1) return GROUND_Y - Math.abs(Math.sin((songT - p.t) * 18)) * 18 * Math.max(0, 1 - (songT - p.t) * 6);
    return BRANCH_Y + (GROUND_Y - BRANCH_Y) * q * q;
  }

  // ---- 判定(本番のはじきもATTRACTのゴーストも同じ関数) ----
  function sweep(D) {
    if (!running || hitStop > 0 || over) return;
    swp = { d: D, t: 0 };
    var best = null, bd = 99;
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (p.res) continue;
      var d = Math.abs(songT - p.t);
      if (d <= OFF_W && d < bd) { bd = d; best = p; }
    }
    if (!best) { whiff(); return; }
    var dd = songT - best.t;
    if (Math.abs(dd) > GOOD_W) { missPair(best, dd < 0 ? 'early' : 'late'); return; }
    if (D !== best.big) { missPair(best, 'small'); return; }
    scoop(best, dd);
  }

  function scoop(p, d) {
    var w = Math.abs(d) <= PERFECT_W ? 'PERFECT' : 'GOOD';
    p.res = w;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    caught++;
    var close = Math.round((1 - (p.rBig - p.rSmall) / 20) * 40);
    score += (w === 'PERFECT' ? 100 : 60) + Math.min(combo, 8) * 10 + Math.max(0, close);
    rollers.push({ x: COL_X[1 - p.big], y: GROUND_Y, vx: (p.big === 0 ? 1 : -1) * -260, r: p.rSmall, life: 0.9 });
    cheerT = 0.25;
    var x = COL_X[p.big];
    if (demoMode) game.fx.popup(w, x, GROUND_Y - 150, { color: w === 'PERFECT' ? YEL : CYN, size: 46 });
    else game.feedback.good(x, GROUND_Y - 150, { text: w, color: w === 'PERFECT' ? YEL : CYN, size: w === 'PERFECT' ? 54 : 44, count: 10, volume: 0.12 });
    game.fx.burst(x, GROUND_Y - 20, { color: w === 'PERFECT' ? YEL : RED, count: 10, speed: 260 });
    sfx(p.big === 0 ? 660 : 880, 0.05, { wave: 'square', volume: 0.07 });
    sfx(p.big === 0 ? 990 : 1320, 0.07, { wave: 'triangle', volume: 0.07 });
    if (!demoMode && caught === 8 && !ms) {
      ms = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE 8', W / 2, 820, { color: YEL, size: 90 });
      game.fx.burst(W / 2, 900, { color: GRN, count: 18, speed: 380 });
    }
  }

  function whiff() {
    if (combo > 0 && !demoMode) game.feedback.bad(HOME_X, 1700, { text: null, shake: 2, volume: 0.12, flashColor: BLU });
    else sfx(260, 0.04, { wave: 'square', volume: 0.03 });
    combo = 0;
  }

  function missPair(p, why) {
    p.res = 'miss';
    misses++; combo = 0;
    hitStop = 0.45;
    var x = COL_X[p.big], y = nutY(p);
    missFx = { x: x, y: Math.min(y, GROUND_Y), r: p.rBig, t: 0.45, p: p };
    sfx(150, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', x, y - 140, { color: MAG, size: 56 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(x, y - 140, { text: 'MISS', shake: 10, flashColor: WHT });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function rollAway() {
    if (!missFx) return;
    var p = missFx.p;
    for (var s = 0; s < 2; s++) {
      var big = s === p.big;
      rollers.push({ x: COL_X[s], y: GROUND_Y, vx: (s === 0 ? -1 : 1) * (big ? 300 : 220), r: big ? p.rBig : p.rSmall, life: 1 });
    }
    if (!demoMode) game.audio.play('se_break', 0.25);
    missFx = null;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 150 + caught * 20;
      game.audio.play('se_success', 0.55);
      cheerT = 2;
      for (var i = 0; i < 7; i++) game.fx.burst(120 + i * 140, 500 + (i % 3) * 140, { color: [YEL, RED, GRN, CYN][i % 4], count: 16, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (missFx) missFx.t = hitStop;
      if (hitStop <= 0) rollAway();
      return;
    }
    stepPlay(dt);
    physics(dt);
  }
  function physics(dt) {
    if (swp) { swp.t += dt; if (swp.t > 0.34) swp = null; }
    for (var i = rollers.length - 1; i >= 0; i--) {
      var r = rollers[i];
      r.x += r.vx * dt; r.life -= dt;
      if (r.life <= 0) rollers.splice(i, 1);
    }
  }

  // ---- 入力: どこでも左右へはじく(一定距離を越えた瞬間で判定) ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    fl = { x0: x, y0: y, fired: false };
    game.audio.tone(520, 0.02, { wave: 'square', volume: 0.02 });
  });
  game.onMove(function(x, y) {
    if (!fl || fl.fired || state !== S.PLAYING) return;
    var dx = x - fl.x0;
    if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(y - fl.y0) * 0.8) {
      fl.fired = true;
      fl.dir = dx < 0 ? 0 : 1;
      game.audio.tone(dx < 0 ? 560 : 740, 0.05, { wave: 'square', volume: 0.04, slide: dx < 0 ? -180 : 180 });
      sweep(fl.dir);
    }
  });
  game.onRelease(function(x, y) {
    if (fl && !fl.fired && state === S.PLAYING && !over) game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.03 });
    fl = null;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: BLU, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col) {
    game.draw.rect(x, y, w, 3, col); game.draw.rect(x, y + h - 3, w, 3, col);
    game.draw.rect(x, y, 3, h, col); game.draw.rect(x + w - 3, y, 3, h, col);
    game.draw.rect(x + 8, y + 8, w - 16, 1, col); game.draw.rect(x + 8, y + h - 9, w - 16, 1, col);
    game.draw.rect(x + 8, y + 8, 1, h - 16, col); game.draw.rect(x + w - 9, y + 8, 1, h - 16, col);
  }
  function dither(x, y, w, h, col, cell) {
    var c = cell || 8;
    for (var yy = 0; yy < h; yy += c) {
      for (var xx = ((yy / c) % 2) * c; xx < w; xx += c * 2) game.draw.rect(x + xx, y + yy, c, c, col);
    }
  }
  function drawNut(x, y, r, pal, alpha) {
    game.draw.sprite(NUT, pal || NUT_PAL, x, y, Math.max(3, Math.round(r / 4.5)), { anchor: 'center', alpha: alpha === undefined ? 1 : alpha });
  }

  function drawGrove() {
    var t = game.time.elapsed;
    game.draw.gradient(230, GROUND_Y, [[0, K0], [0.55, BLU], [1, BLU]]);
    // 遠景の林(市松ディザの緑)
    for (var tr = 0; tr < 6; tr++) {
      var tx = tr * 190 - 20;
      dither(tx, 760 + (tr % 2) * 40, 150, 120, GRN, 8);
      game.draw.rect(tx + 70, 880 + (tr % 2) * 40, 10, GROUND_Y - 880, K0);
    }
    // 手前の栗の木: 幹と枝と葉
    dither(90, 340, 900, 140, GRN, 10);
    game.draw.rect(90, 480, 900, 40, GRN);
    dither(120, 520, 840, 30, GRN, 10);
    game.draw.rect(504, 520, 72, 200, RED);
    dither(504, 520, 72, 200, K0, 6);
    game.draw.rect(200, BRANCH_Y - 26, 680, 8, RED);
    for (var c = 0; c < 2; c++) game.draw.rect(COL_X[c] - 4, BRANCH_Y - 26, 8, 30, RED);
    // 地面(緑と黒の市松)と落ち葉
    game.draw.rect(0, GROUND_Y + 40, W, 1440 - GROUND_Y - 40, K0);
    dither(0, GROUND_Y + 40, W, 1440 - GROUND_Y - 40, GRN, 8);
    game.draw.rect(0, GROUND_Y + 38, W, 3, YEL);
    for (var lf = 0; lf < 10; lf++) {
      var lx = (lf * 113 + Math.floor(t * 20)) % W;
      game.draw.rect(lx, 300 + ((lf * 197 + t * 60) % 900), 10, 6, lf % 2 ? YEL : RED);
    }
    // 落ち口の印(地面の枠)。落ち始めた組の側は影が濃くなる
    for (var s = 0; s < 2; s++) {
      var fx = COL_X[s];
      game.draw.rect(fx - 70, GROUND_Y + 44, 140, 3, CYN);
      game.draw.rect(fx - 70, GROUND_Y + 30, 3, 14, CYN);
      game.draw.rect(fx + 67, GROUND_Y + 30, 3, 14, CYN);
    }
  }

  function drawPairs() {
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (p.res) continue;
      if (songT < p.t - OPEN - SPB) continue;
      var open = songT >= p.t - OPEN;
      var falling = songT >= p.t - FALL;
      for (var s = 0; s < 2; s++) {
        var r = s === p.big ? p.rBig : p.rSmall;
        var x = COL_X[s];
        if (!falling) {
          var shake = open ? 0 : Math.sin(songT * 40 + s) * 3;
          game.draw.sprite(BURR, { g: open ? YEL : GRN }, x + shake, BRANCH_Y + 24, open ? Math.round(r / 3.2) : 9, { anchor: 'center' });
          if (open) drawNut(x, BRANCH_Y + 24, r);
        } else {
          var y = nutY(p);
          drawNut(x, y, r);
          var q = clamp((songT - (p.t - FALL)) / FALL, 0, 1);
          dither(x - r * q, GROUND_Y + 30, r * 2 * q, 8, K0, 4);
        }
      }
      if (falling) {
        // 空になったイガ
        for (var e = 0; e < 2; e++) game.draw.sprite(BURR, { g: GRN }, COL_X[e], BRANCH_Y + 24, 8, { anchor: 'center', alpha: 0.6 });
      }
    }
    if (missFx) {
      var sc = 1.2 + (0.45 - missFx.t) * 0.8;
      drawNut(missFx.x, missFx.y, missFx.r * sc, { r: WHT, k: WHT, y: WHT, w: WHT });
      frame(missFx.x - missFx.r * sc - 20, missFx.y - missFx.r * sc - 20, missFx.r * sc * 2 + 40, missFx.r * sc * 2 + 40, YEL);
    }
    for (var k = 0; k < rollers.length; k++) {
      var rl = rollers[k];
      drawNut(rl.x, rl.y - Math.abs(Math.sin(rl.x * 0.05)) * 8, rl.r, NUT_PAL, clamp(rl.life * 1.5, 0, 1));
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    var reach = 0, side = 0;
    if (swp) {
      var u = swp.t;
      reach = u < 0.08 ? u / 0.08 : (u < 0.2 ? 1 : clamp(1 - (u - 0.2) / 0.14, 0, 1));
      side = swp.d;
    }
    var bxp = HOME_X + (side === 0 ? -1 : 1) * (HOME_X - COL_X[0]) * reach;
    // 柄
    game.draw.line(HOME_X + (side === 0 ? -30 : 30) * (reach > 0 ? 1 : 0), 1300, bxp, GROUND_Y + 10, YEL, 6);
    // 籠(枠と市松の編み目)
    game.draw.rect(bxp - 80, GROUND_Y - 34, 160, 4, YEL);
    game.draw.rect(bxp - 80, GROUND_Y - 34, 4, 70, YEL);
    game.draw.rect(bxp + 76, GROUND_Y - 34, 4, 70, YEL);
    game.draw.rect(bxp - 80, GROUND_Y + 32, 160, 4, YEL);
    dither(bxp - 72, GROUND_Y - 26, 144, 56, RED, 8);
    var pile = Math.min(caught, 12);
    for (var n = 0; n < pile; n++) game.draw.rect(bxp - 60 + (n % 6) * 22, GROUND_Y - 44 - Math.floor(n / 6) * 14, 16, 12, n % 2 ? RED : YEL);
    var art = cheerT > 0 ? KID_C : (reach > 0.1 ? KID_B : KID_A);
    var bob = beatPulse > 0.6 ? -6 : 0;
    game.draw.sprite(art, KID_PAL, HOME_X, 1336 + bob, 8, { anchor: 'center', flipX: reach > 0.1 && side === 0 });
  }

  // 8マスの窓: 今の小節(上段)と次の小節(下段)。点いているマス=栗が着く8分、太枠=拍の頭
  function drawSequencer() {
    var x0 = 60, y0 = 246, cw = 120;
    game.draw.rect(x0 - 12, y0 - 10, 8 * cw + 24, 92, K0);
    frame(x0 - 12, y0 - 10, 8 * cw + 24, 92, CYN);
    var bar = Math.max(0, Math.floor(songT / (8 * E8)));
    for (var row = 0; row < 2; row++) {
      var bb = bar + row;
      for (var c = 0; c < 8; c++) {
        var cx = x0 + c * cw, cy = y0 + 6 + row * 38, h = row === 0 ? 30 : 22;
        var on = false, done = '';
        for (var i = 0; i < pairs.length; i++) if (pairs[i].bar === bb && pairs[i].e === c) { on = true; done = pairs[i].res; }
        var head = c % 2 === 0;
        game.draw.rect(cx + 6, cy, cw - 12, h, head ? WHT : '#606060', 1);
        game.draw.rect(cx + 8, cy + 2, cw - 16, h - 4, K0);
        if (on) game.draw.rect(cx + 12, cy + 5, cw - 24, h - 10, done === 'miss' ? MAG : (done ? GRN : (head ? YEL : RED)), row === 0 ? 1 : 0.6);
        if (row === 0 && running && step8 === bb * 8 + c) game.draw.rect(cx + 6, cy + h + 2, cw - 12, 4, CYN);
      }
    }
  }

  // 親指ゾーン: 二重線の窓に左右の矢印。はじいた側が光る
  function drawThumb() {
    game.draw.gradient(1440, H, [[0, BLU], [1, K0]]);
    frame(30, 1466, W - 60, 420, WHT);
    var lit = swp ? swp.d : -1;
    for (var s = 0; s < 2; s++) {
      var cx = s === 0 ? 270 : 810, dir = s === 0 ? -1 : 1;
      var col = lit === s ? YEL : CYN;
      for (var k = 0; k < 5; k++) {
        var off = k * 26;
        game.draw.rect(cx - dir * 60 + dir * off, 1640 - off - 6, 12, 12, col);
        game.draw.rect(cx - dir * 60 + dir * off, 1640 + off - 6, 12, 12, col);
      }
      game.draw.rect(cx - 90, 1634, 150, 12, col, 0.4);
    }
    dither(500, 1600, 80, 80, '#606060', 8);
    if (fl && fl.fired === false && game.input.pressing) game.draw.rect(game.input.x - 30, game.input.y - 3, 60, 6, WHT);
  }

  function drawScene() {
    drawGrove();
    drawPairs();
    drawKid();
    drawSequencer();
    drawThumb();
    for (var y = 0; y < H; y += 6) game.draw.rect(0, y, W, 1, '#000000', 0.22);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, K0);
    frame(12, 10, W - 24, 214, WHT);
    label('SCORE ' + score, 44, 64, 44, WHT, 'left');
    label('BEST ' + prevBest, 44, 120, 28, YEL, 'left');
    label(caught + ' / ' + pairs.length, W - 44, 64, 44, GRN, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      game.draw.rect(W - 290 + i * 62, 108, 44, 30, on ? RED : '#404040');
      game.draw.rect(W - 284 + i * 62, 114, 32, 8, on ? YEL : K0);
    }
    if (combo >= 2) label(combo + ' COMBO', W - 44, 174, 30, CYN, 'right');
    var cur = beatN >= 0 ? beatN % 4 : -1;
    for (var b = 0; b < 4; b++) game.draw.rect(44 + b * 58, 160, 44, 28, b === cur ? (b === 0 ? RED : YEL) : '#303030');
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(30, 204, (W - 60) * progress, 6, CYN);
  }

  function drawResult(t) {
    var y0 = H * 0.25, hh = H * 0.37;
    game.draw.rect(70, y0, W - 140, hh, K0, 0.94);
    frame(70, y0, W - 140, hh, won ? GRN : MAG);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 92, won ? GRN : MAG);
    label('SCORE ' + score, W / 2, H * 0.36, 58, WHT);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 32, CYN);
    label(caught + ' / ' + pairs.length, W / 2, H * 0.45, 50, YEL);
    label('COMBO ' + maxCombo, W / 2, H * 0.49, 38, RED);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 56, YEL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, YEL);
    if (!won) {
      var left = 0;
      for (var i = 0; i < pairs.length; i++) if (!pairs[i].res) left++;
      label('あと' + Math.max(1, left) + '個', W / 2, H * 0.215, 58, MAG);
    }
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 34, WHT);
  }

  // ---- ATTRACT: 実ロジックで大きい方へはじいて受ける。4組目は小さい方へはじいてMISS ----
  var demo = { t: 0, x: HOME_X, y: 1660, press: false, done: {}, flickT: -1, dir: 0 };
  var DEMO_LEN = DEMO_BARS * 4 * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.flickT = -1; }
    tickWorld(dt);
    var next = null;
    for (var i = 0; i < pairs.length; i++) if (!pairs[i].res && !demo.done[i]) { next = pairs[i]; break; }
    if (demo.flickT >= 0) {
      demo.flickT += dt;
      var u = clamp(demo.flickT / 0.12, 0, 1);
      demo.x = HOME_X + (demo.dir === 0 ? -1 : 1) * 200 * u;
      demo.press = demo.flickT < 0.16;
      if (demo.flickT > 0.4) demo.flickT = -1;
      return;
    }
    demo.x += (HOME_X - demo.x) * Math.min(1, dt * 8);
    demo.press = false;
    if (!next || !running || hitStop > 0) return;
    if (songT >= next.t - 0.07) demo.press = true;
    if (songT >= next.t - 0.01) {
      demo.done[next.idx] = true;
      demo.dir = next.idx === DEMO_FAIL ? 1 - next.big : next.big;
      demo.flickT = 0;
      sweep(demo.dir);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (cheerT > 0) cheerT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, K0);
      frame(12, 10, W - 24, 214, WHT);
      label(GAME_TITLE, W / 2, 96 + Math.sin(t * 3) * 4, 84, Math.floor(t * 3) % 2 ? YEL : RED);
      label('HI-SCORE ' + game.best, W / 2, 180, 36, GRN);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, YEL);
      else label('TAP TO START', W / 2, H * 0.965, 40, WHT);
      return;
    }

    if (state === S.RESULT) {
      physics(dt);
      drawScene();
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      if (hitStop > 0) { hitStop -= dt; if (missFx) missFx.t = hitStop; if (hitStop <= 0) rollAway(); }
      else physics(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, caught: caught, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = -LEAD; game.audio.play('se_tap', 0.4); }
    } else {
      tickWorld(dt);
      if (!over && realT > READY_T + TIME_LIMIT + 2) finish(misses < MISS_MAX);
    }

    drawScene();
    drawHud();
    if (readyT > 0) {
      game.draw.rect(0, H * 0.42, W, 170, K0, 0.9);
      frame(0, H * 0.42, W, 170, YEL);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 90, 110, YEL);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? GRN : MAG);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
