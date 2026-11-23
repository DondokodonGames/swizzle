// K-DS-0048v2-pottery-fair-cup-stack.js
// 瀬戸物市の茶碗重ね — 跳ねる拍(タッ・タ)ごとに棚から落ちてくる茶碗を、籠を滑らせて受け、籠の上に崩さず高く重ねていく
// 操作: 画面を左・中・右の三列に分け、押した列へ籠が滑ってその瞬間に茶碗を受ける(押した瞬間で判定)。棚の茶碗は落ちる1拍前からカタカタ揺れて鳴り(揺れの音も跳ねる拍どおり)、ちょうど1拍かけて籠の上の山の天辺に届く。届く瞬間(拍の頭か、跳ねた短い裏)に同じ列を押すとPERFECT/GOOD。列違い・早すぎ(籠で弾く)・押し漏らしはMISSで茶碗が割れ、山がぐらつく。茶碗の来ない時の空押しは連続が切れるだけ。籠を大きく滑らせると重ねた山がしなる
// 終わり: 前奏1小節+6小節(跳ねる100BPM・28拍・約17秒・25個)を受け切ってMISS 3回以内ならCLEAR(判定点+連続ボーナス+山の高さボーナス)。MISS 4回で山が崩れてGAME OVER
// @mechanic: stack
// @theme: pottery_fair_cup_stack
// 世界観: 瀬戸物市の荷車の横で、陶器屋の見習いが跳ねる囃子に合わせて棚から落ちてくる茶碗を頭上の籠で受け、崩さないよう籠の上に高く重ねていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・重ねた茶碗の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 70s VECTOR
var STYLE = { bg: ['#000000', '#030a14'], main: ['#6cf2ff', '#fff2d2', '#8dff8a'], accent: ['#ff7a3d', '#ffd84a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。線を太さ違いで3回重ねて光らせ、面は塗らない
  var BK = STYLE.bg[0], BK2 = STYLE.bg[1];
  var CY = STYLE.main[0], CRM = STYLE.main[1], GR = STYLE.main[2];
  var OR = STYLE.accent[0], YL = STYLE.accent[1];

  var GAME_TITLE = 'CUP STACK';
  var BPM = 100;
  var SPB = 60 / BPM;            // 1拍 0.6秒
  var SW = 2 / 3;                // 跳ねる8分: 長い方(拍の2/3)のあとに短い裏
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11, OFF_W = 0.2;
  var READY_T = 0.8;
  var TIME_LIMIT = 17;           // 前奏1小節+6小節 = 28拍 × 0.6秒 = 16.8秒
  var MISS_MAX = 4;
  var LANE_X = [190, 540, 890];
  var SHELF_Y = 440;             // 棚の茶碗の縁
  var BASKET_Y = 1236;           // 籠の縁
  var STEP = 22;                 // 重ねた茶碗1つぶんの高さ
  var GROUND_Y = 1430;

  // 茶碗の予定 [小節, 小節内の拍位置, 列]。1〜2小節目は表拍だけ、3小節目から跳ねた裏が混ざる
  var PLAN = [
    [1, 0, 1], [1, 2, 0],
    [2, 0, 0], [2, 1, 1], [2, 2, 2], [2, 3, 1],
    [3, 0, 1], [3, 1, 2], [3, 1 + SW, 2], [3, 3, 0],
    [4, 0, 0], [4, SW, 0], [4, 2, 2], [4, 2 + SW, 2],
    [5, 0, 1], [5, SW, 0], [5, 1, 1], [5, 2, 2], [5, 2 + SW, 1], [5, 3, 1],
    [6, 0, 0], [6, SW, 1], [6, 1, 2], [6, 1 + SW, 1], [6, 2, 0]
  ];
  var BARS = 7;
  var DEMO_PLAN = [
    [1, 0, 1], [1, 1, 0], [1, 1 + SW, 0], [1, 3, 2],
    [2, 0, 1], [2, SW, 1], [2, 2, 0]
  ];
  var DEMO_BARS = 3;
  var DEMO_FAIL = 4;             // デモは5個目で列を間違えてMISS

  // ---- スプライト(線画風: 輪郭のドットだけ) ----
  var APP_A = [
    'h...........h',
    '.a.........a.',
    '.a..ooooo..a.',
    '..ao.....oa..',
    '..ao.e.e.oa..',
    '..ao.....oa..',
    '...aoooooa...',
    '...ooooooo...',
    '...o.....o...',
    '...o.ccc.o...',
    '...ooooooo...',
    '....o...o....',
    '....o...o....',
    '...oo...oo...'
  ];
  var APP_B = [
    'h...........h',
    '.a.........a.',
    '.a..ooooo..a.',
    '..ao.....oa..',
    '..ao.e.e.oa..',
    '..ao..o..oa..',
    '...aoooooa...',
    '...ooooooo...',
    '...o.....o...',
    '...o.ccc.o...',
    '...ooooooo...',
    '...o.....o...',
    '..o.......o..',
    '.oo.......oo.'
  ];
  var APP_PAL = { h: CRM, a: CY, o: CY, e: YL, c: OR };
  var MINI_CUP = ['ooooooo', '.o...o.', '..ooo..', '..o.o..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, cups, beats, endT, running, songT, schedB, beatN, swN, readyT, realT, hitStop;
  var score, combo, maxCombo, perfects, goods, misses, stack, lane, bx, sway, swayV, moving;
  var over, won, outroT, prevBest, catchT, padT, missFx, shards, ms10, ms20, tumble, beatPulse, swPulse;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1, 7), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function buildSong() {
    var plan = demoMode ? DEMO_PLAN : PLAN;
    var nb = demoMode ? DEMO_BARS : BARS;
    cups = [];
    for (var i = 0; i < plan.length; i++) {
      cups.push({ t: (plan[i][0] * 4 + plan[i][1]) * SPB, lane: plan[i][2], res: '', idx: i, warned: false, glaze: i % 3 });
    }
    beats = [];
    for (var b = 0; b < nb * 4; b++) beats.push(b * SPB);
    endT = nb * 4 * SPB;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    buildSong();
    running = demoMode; songT = 0; schedB = 0; beatN = -1; swN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0;
    stack = []; lane = 1; bx = LANE_X[1]; sway = 0; swayV = 0; moving = 0;
    over = false; won = false; outroT = 0; prevBest = game.best;
    catchT = 0; padT = [0, 0, 0]; missFx = null; shards = []; ms10 = false; ms20 = false; tumble = null;
    beatPulse = 0; swPulse = 0;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル・Gメジャーの跳ねる節)。1拍を「長・短」の2音で跳ねさせる ----
  var TUNE = [
    ['G4', 'B4'], ['D5', 'B4'], ['E5', 'D5'], ['B4', 'R'],
    ['C5', 'E5'], ['G5', 'E5'], ['D5', 'B4'], ['A4', 'R'],
    ['G4', 'A4'], ['B4', 'D5'], ['E5', 'G5'], ['D5', 'B4'],
    ['C5', 'A4'], ['B4', 'G4'], ['A4', 'B4'], ['G4', 'R']
  ];
  var BASS = ['G2', 'B2', 'D3', 'B2', 'C3', 'E3', 'D3', 'F#2', 'G2', 'B2', 'C3', 'C#3', 'D3', 'A2', 'G2', 'D2'];
  function playBeat(b) {
    if (demoMode) return;
    var nt = TUNE[b % TUNE.length], intro = b < 4;
    game.audio.melody([[nt[0], SW], [nt[1], 1 - SW]], { tempo: BPM, wave: 'square', volume: intro ? 0.018 : 0.03, bass: [[BASS[b % BASS.length], 1]], bassWave: 'triangle', bassVolume: b % 4 === 0 ? 0.15 : 0.11 });
    game.audio.melody([[3300, 0.06], ['R', SW - 0.06], [2500, 0.05], ['R', 1 - SW - 0.05]], { tempo: BPM, wave: 'square', volume: 0.012 });
    if (intro) game.audio.tone(b % 4 === 0 ? 1320 : 990, 0.05, { wave: 'triangle', volume: 0.08 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < beats.length && songT >= beats[schedB] - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < beats.length && songT >= beats[beatN + 1]) { beatN++; beatPulse = 1; }
    var k = Math.floor(songT / SPB - SW);
    if (k > swN) { swN = k; swPulse = 1; }
    for (var i = 0; i < cups.length; i++) {
      var c = cups[i];
      if (!c.warned && songT >= c.t - 2 * SPB) {
        c.warned = true;
        sfx(1900 + c.lane * 260, 0.025, { wave: 'square', volume: 0.03 });
        sfx(1500 + c.lane * 260, 0.025, { wave: 'square', volume: 0.025 });
      }
      if (!c.res && songT > c.t + GOOD_W + 0.02) { missCup(c); if (over || hitStop > 0) return; }
    }
    if (songT >= endT + 0.1) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function cupRimY(i) { return BASKET_Y - 16 - STEP * i; }
  function landIndex(c) {
    var n = stack.length;
    for (var i = 0; i < cups.length; i++) if (cups[i] !== c && !cups[i].res && cups[i].t < c.t) n++;
    return n;
  }
  function cupPos(c) {
    var t0 = c.t - SPB;
    if (songT < t0) {
      var wob = songT >= c.t - 2 * SPB ? Math.sin(songT * 46) * 6 : 0;
      return { x: LANE_X[c.lane] + wob, y: SHELF_Y, air: false };
    }
    var p = (songT - t0) / SPB;
    var land = cupRimY(landIndex(c));
    return { x: LANE_X[c.lane], y: SHELF_Y + (land - SHELF_Y) * p * p, air: true };
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function tapLane(L) {
    if (!running || hitStop > 0 || over) return;
    if (L !== lane) { swayV += (lane - L) * 3.2; moving = 0.2; }
    lane = L; padT[L] = 0.16; catchT = 0.14;
    var best = null, bs = 99;
    for (var i = 0; i < cups.length; i++) {
      var c = cups[i];
      if (c.res) continue;
      var d = Math.abs(songT - c.t);
      if (d > OFF_W) continue;
      var s = d - (c.lane === L ? 0.5 : 0);
      if (s < bs) { bs = s; best = c; }
    }
    if (!best) { breakCombo(); return; }
    var dd = songT - best.t, ad = Math.abs(dd);
    if (best.lane !== L) {
      if (ad <= GOOD_W) missCup(best); else breakCombo();
      return;
    }
    if (ad > GOOD_W) { missCup(best); return; }
    catchCup(best, dd);
  }

  function catchCup(c, d) {
    var w = Math.abs(d) <= PERFECT_W ? 'PERFECT' : 'GOOD';
    c.res = w;
    var top = stack.length ? stack[stack.length - 1].dx : 0;
    var dx = w === 'PERFECT' ? top * 0.5 : clamp(top + (d < 0 ? -10 : 10), -34, 34);
    stack.push({ dx: dx, flash: 0.25, glaze: c.glaze });
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 50) + Math.min(combo, 10) * 10;
    var y = cupRimY(stack.length - 1);
    if (demoMode) game.fx.popup(w, bx, y - 70, { color: w === 'PERFECT' ? YL : CY, size: 46 });
    else game.feedback.good(bx, y - 70, { text: w, color: w === 'PERFECT' ? YL : CY, size: w === 'PERFECT' ? 54 : 44, count: 10, volume: 0.12 });
    game.fx.burst(bx, y, { color: w === 'PERFECT' ? YL : CY, count: 8, speed: 220 });
    var notes = [523, 587, 659, 784, 880, 988, 1047, 1175];
    sfx(notes[stack.length % notes.length] * (stack.length >= 8 ? 2 : 1), 0.06, { wave: 'triangle', volume: 0.09 });
    sfx(2200, 0.02, { wave: 'square', volume: 0.04 });
    if (!demoMode && stack.length === 10 && !ms10) {
      ms10 = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE 10', W / 2, 760, { color: GR, size: 84 });
    }
    if (!demoMode && stack.length === 20 && !ms20) {
      ms20 = true;
      game.audio.play('se_milestone', 0.6);
      game.fx.popup('20!', W / 2, 700, { color: YL, size: 110 });
      for (var i = 0; i < 4; i++) game.fx.burst(200 + i * 230, 620, { color: i % 2 ? YL : GR, count: 12, speed: 320 });
    }
  }

  function breakCombo() {
    if (combo > 0 && !demoMode) game.feedback.bad(W / 2, 1600, { text: null, shake: 2, volume: 0.12, flashColor: BK2 });
    else sfx(300, 0.04, { wave: 'square', volume: 0.03 });
    combo = 0;
  }

  function missCup(c) {
    var p = cupPos(c);
    c.res = 'miss';
    misses++; combo = 0;
    hitStop = 0.42;
    missFx = { x: p.x, y: p.y, t: 0.42 };
    swayV += (p.x < bx ? -1 : 1) * 4;
    sfx(140, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', p.x, p.y - 80, { color: OR, size: 56 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(p.x, p.y - 80, { text: 'MISS', shake: 10, flashColor: CRM });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function shatter() {
    if (!missFx) return;
    if (!demoMode) game.audio.play('se_break', 0.4);
    game.fx.burst(missFx.x, missFx.y, { color: CRM, count: 14, speed: 360 });
    for (var i = 0; i < 6; i++) {
      shards.push({ x: missFx.x, y: missFx.y + 20, vx: (i - 2.5) * 110, vy: -200 - (i % 3) * 90, a: i, life: 1.1 });
    }
    missFx = null;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += stack.length * 20 + (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 7; i++) game.fx.burst(120 + i * 140, 520 + (i % 3) * 160, { color: [YL, CY, GR, OR][i % 4], count: 16, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
      tumble = [];
      for (var k = 0; k < stack.length; k++) {
        tumble.push({ x: bx + stack[k].dx, y: cupRimY(k), vx: (k % 2 ? 1 : -1) * (80 + k * 14), vy: -120 - k * 8, glaze: stack[k].glaze });
      }
      stack = [];
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (missFx) missFx.t = hitStop;
      if (hitStop <= 0) shatter();
      return;
    }
    stepPlay(dt);
    physics(dt);
  }

  function physics(dt) {
    swayV += (-64 * sway - 5 * swayV) * dt;
    sway += swayV * dt;
    bx += (LANE_X[lane] - bx) * Math.min(1, dt * 22);
    for (var i = shards.length - 1; i >= 0; i--) {
      var s = shards[i];
      s.vy += 1600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.y > GROUND_Y) { s.y = GROUND_Y; s.vy *= -0.3; s.vx *= 0.6; }
      if (s.life <= 0) shards.splice(i, 1);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var L = x < 360 ? 0 : (x < 720 ? 1 : 2);
    game.audio.tone(700 + L * 180, 0.03, { wave: 'square', volume: 0.03 });
    tapLane(L);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画(線だけ) ----
  function vl(x1, y1, x2, y2, col, w, a) {
    var k = a === undefined ? 1 : a;
    game.draw.line(x1, y1, x2, y2, rgba(col, 0.13 * k), w * 3.4);
    game.draw.line(x1, y1, x2, y2, rgba(col, 0.38 * k), w * 1.9);
    game.draw.line(x1, y1, x2, y2, k >= 1 ? col : rgba(col, k), w);
  }
  function vbox(x, y, w, h, col, lw, a) {
    vl(x, y, x + w, y, col, lw, a); vl(x + w, y, x + w, y + h, col, lw, a);
    vl(x + w, y + h, x, y + h, col, lw, a); vl(x, y + h, x, y, col, lw, a);
  }
  function vring(x, y, r, col, w, a) {
    var n = 22;
    for (var i = 0; i < n; i++) {
      var a1 = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
      vl(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w, a);
    }
  }
  function label(str, x, y, sz, col, align) {
    var o = { size: sz, color: rgba(col, 0.3), bold: true, align: align || 'center', font: 'monospace' };
    game.draw.text(str, x - 2, y, o);
    game.draw.text(str, x + 2, y, o);
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  var GLAZE = [OR, CY, GR];
  function drawCup(x, y, s, col, a, band) {
    vl(x - 56 * s, y, x + 56 * s, y, col, 4, a);
    vl(x - 56 * s, y, x - 30 * s, y + 40 * s, col, 4, a);
    vl(x + 56 * s, y, x + 30 * s, y + 40 * s, col, 4, a);
    vl(x - 30 * s, y + 40 * s, x + 30 * s, y + 40 * s, col, 3, a);
    vl(x - 18 * s, y + 40 * s, x - 20 * s, y + 50 * s, col, 3, a);
    vl(x + 18 * s, y + 40 * s, x + 20 * s, y + 50 * s, col, 3, a);
    vl(x - 20 * s, y + 50 * s, x + 20 * s, y + 50 * s, col, 3, a);
    vl(x - 45 * s, y + 16 * s, x + 45 * s, y + 16 * s, band, 2, a);
  }
  function drawNested(x, y, col, band, a) {
    vl(x - 56, y, x + 56, y, col, 4, a);
    vl(x - 56, y, x - 47, y + STEP, col, 3, a);
    vl(x + 56, y, x + 47, y + STEP, col, 3, a);
    vl(x - 49, y + 9, x + 49, y + 9, band, 2, a);
  }

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(230, H, [[0, BK2], [0.7, BK], [1, BK]]);
    // 遠くの市の屋根(暗い線)
    for (var r = 0; r < 5; r++) {
      var rx = 60 + r * 230, ry = 600 + (r % 2) * 50;
      vl(rx, ry, rx + 90, ry - 60, CY, 2, 0.16);
      vl(rx + 90, ry - 60, rx + 180, ry, CY, 2, 0.16);
      vl(rx + 20, ry, rx + 20, ry + 130, CY, 2, 0.12);
      vl(rx + 160, ry, rx + 160, ry + 130, CY, 2, 0.12);
    }
    // 提灯の綱(跳ねる裏で揺れる)
    for (var k = 0; k < 9; k++) {
      var lx = 60 + k * 120, ly = 262 + Math.sin(k / 8 * Math.PI) * 18;
      var swg = Math.sin(t * 3 + k) * 4 + swPulse * 6 * (k % 2 ? 1 : -1);
      vl(lx, ly, lx + swg, ly + 30, OR, 2, 0.8);
      vring(lx + swg, ly + 44, 12, k % 2 ? OR : YL, 2, 0.5 + beatPulse * 0.5);
    }
    // 店の日よけ(ギザギザ)
    for (var z = 0; z < 18; z++) {
      var zx = z * 60;
      vl(zx, 320, zx + 30, 350, CRM, 3, 0.7);
      vl(zx + 30, 350, zx + 60, 320, CRM, 3, 0.7);
    }
    vl(0, 320, W, 320, CRM, 3, 0.7);
    // 棚(三つの区切り)
    vl(30, 494, 1050, 494, YL, 4);
    vl(30, 506, 1050, 506, YL, 2, 0.5);
    for (var c = 0; c < 4; c++) { var cx = 30 + c * 340; vl(cx, 370, cx, 494, YL, 3, 0.7); }
    vl(30, 370, 1050, 370, YL, 2, 0.5);
    // 地面
    vl(0, GROUND_Y, W, GROUND_Y, GR, 3, 0.6);
    for (var g = 0; g < 12; g++) { var gx = ((g * 97 + 40) % 1040) + 20; vl(gx, GROUND_Y + 10, gx + 26, GROUND_Y + 10, GR, 2, 0.3); }
    // 荷車(右端)と車輪(拍ごとに回る)
    vl(990, 1250, 1080, 1250, OR, 3, 0.8);
    vl(990, 1250, 1000, 1320, OR, 3, 0.8);
    vl(1000, 1320, 1080, 1320, OR, 3, 0.8);
    var wa = (beatN + clamp(songT / SPB - beatN, 0, 1)) * Math.PI / 4;
    vring(1040, 1372, 52, OR, 3, 0.8);
    for (var sp = 0; sp < 4; sp++) {
      var an = wa + sp * Math.PI / 4;
      vl(1040 - Math.cos(an) * 50, 1372 - Math.sin(an) * 50, 1040 + Math.cos(an) * 50, 1372 + Math.sin(an) * 50, OR, 2, 0.6);
    }
    for (var cc = 0; cc < 2; cc++) drawCup(1015 + cc * 40, 1214 - cc * 18, 0.45, CRM, 0.55, GLAZE[cc]);
    // 高さの物差し(左端)
    vl(44, cupRimY(0), 44, cupRimY(25), CY, 2, 0.4);
    for (var m = 0; m <= 25; m += 5) {
      var my = cupRimY(m);
      vl(44, my, m % 10 === 0 ? 84 : 70, my, m === 10 || m === 20 ? YL : CY, 2, 0.6);
    }
    if (stack.length) vl(52, cupRimY(0), 52, cupRimY(stack.length - 1), GR, 6);
  }

  function drawShelfAndFalling() {
    for (var L = 0; L < 3; L++) {
      var shown = null;
      for (var i = 0; i < cups.length; i++) {
        var c = cups[i];
        if (c.lane !== L || c.res) continue;
        if (songT < c.t - SPB && songT >= c.t - 3.5 * SPB) { shown = c; break; }
      }
      if (shown) {
        var p = cupPos(shown);
        var warn = songT >= shown.t - 2 * SPB;
        drawCup(p.x, p.y, 1, warn ? YL : CRM, 1, GLAZE[shown.glaze]);
        if (warn) { vl(p.x - 76, p.y + 10, p.x - 64, p.y - 4, YL, 2); vl(p.x + 76, p.y + 10, p.x + 64, p.y - 4, YL, 2); }
      } else {
        vl(LANE_X[L] - 30, 470, LANE_X[L] + 30, 470, CY, 2, 0.25);
      }
    }
    for (var j = 0; j < cups.length; j++) {
      var f = cups[j];
      if (f.res) continue;
      var q = cupPos(f);
      if (!q.air) continue;
      drawCup(q.x, q.y, 1, CRM, 1, GLAZE[f.glaze]);
      vl(q.x, q.y - 30, q.x, q.y - 90, CRM, 2, 0.25);
    }
    if (missFx) {
      var sc = 1.15 + (0.42 - missFx.t) * 0.6;
      drawCup(missFx.x, missFx.y, sc, '#ffffff', 1, '#ffffff');
    }
  }

  function drawStackAndBasket() {
    var t = game.time.elapsed;
    var dip = catchT > 0 ? 8 : 0;
    for (var i = 0; i < stack.length; i++) {
      var s = stack[i];
      var x = bx + s.dx + sway * (i + 1) * 2;
      var col = s.flash > 0 ? '#ffffff' : CRM;
      if (i === 0) drawCup(x, cupRimY(0) + dip, 1, col, 1, GLAZE[s.glaze]);
      else drawNested(x, cupRimY(i) + dip, col, GLAZE[s.glaze], 1);
      if (s.flash > 0) s.flash -= game.time.delta;
    }
    // 籠(編み目の線)
    var by = BASKET_Y + dip;
    vl(bx - 86, by, bx + 86, by, YL, 4);
    vl(bx - 86, by, bx - 64, by + 62, YL, 4);
    vl(bx + 86, by, bx + 64, by + 62, YL, 4);
    vl(bx - 64, by + 62, bx + 64, by + 62, YL, 4);
    for (var w = 0; w < 4; w++) {
      vl(bx - 70 + w * 36, by + 6, bx - 52 + w * 36, by + 58, YL, 2, 0.45);
      vl(bx - 34 + w * 36, by + 6, bx - 52 + w * 36, by + 58, YL, 2, 0.45);
    }
    // 見習い(頭上に籠を掲げる)。動いている間は足を開く
    var art = moving > 0 || (running && Math.floor(t * 4) % 2 === 0 && combo >= 4) ? APP_B : APP_A;
    var ay = BASKET_Y + 128 + dip * 0.5 + (beatPulse > 0.6 ? -4 : 0);
    game.draw.sprite(art, APP_PAL, bx, ay, 9, { anchor: 'center', alpha: 0.3 });
    game.draw.sprite(art, APP_PAL, bx + 1, ay - 1, 9, { anchor: 'center' });
    if (tumble) {
      for (var k = 0; k < tumble.length; k++) {
        var tb = tumble[k];
        drawCup(tb.x, tb.y, 1, CRM, 0.9, GLAZE[tb.glaze]);
      }
    }
    for (var sh = 0; sh < shards.length; sh++) {
      var s2 = shards[sh];
      vl(s2.x - 14, s2.y + (s2.a % 2 ? 6 : -6), s2.x + 14, s2.y, CRM, 3, clamp(s2.life, 0, 1));
    }
  }

  // 親指ゾーン: 三つの台座。次の茶碗が来る列は輪が縮んで、届く瞬間にぴたりと重なる
  function drawPads() {
    game.draw.gradient(1440, H, [[0, BK2], [1, BK]]);
    vl(0, 1446, W, 1446, CY, 3, 0.8);
    for (var L = 0; L < 3; L++) {
      var x0 = L * 360 + 18, cx = LANE_X[L];
      var lit = padT[L] > 0;
      vbox(x0, 1478, 324, 400, lit ? YL : CY, lit ? 5 : 3, lit ? 1 : 0.6);
      vring(cx, 1680, 74, lane === L ? YL : CY, 3, lane === L ? 1 : 0.5);
      game.draw.sprite(MINI_CUP, { o: CRM }, cx, 1680, 12, { anchor: 'center', alpha: lane === L ? 1 : 0.5 });
      var next = null;
      for (var i = 0; i < cups.length; i++) if (cups[i].lane === L && !cups[i].res && cups[i].t > songT - GOOD_W) { next = cups[i]; break; }
      if (next && running) {
        var pr = (next.t - songT) / SPB;
        if (pr <= 1.6) vring(cx, 1680, 74 + clamp(pr, 0, 1.6) * 110, OR, 4, clamp(1.7 - pr, 0.3, 1));
      }
    }
  }

  function drawScene() {
    drawBackdrop();
    drawShelfAndFalling();
    drawStackAndBasket();
    drawPads();
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.16);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, BK);
    vl(0, 226, W, 226, CY, 2, 0.7);
    label('SCORE ' + score, 40, 64, 44, CRM, 'left');
    label('BEST ' + prevBest, 40, 118, 28, YL, 'left');
    label(stack.length + ' / ' + cups.length, W - 40, 64, 44, GR, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      game.draw.sprite(MINI_CUP, { o: i < MISS_MAX - misses ? CRM : '#2a3440' }, W - 290 + i * 70, 124, 7, { anchor: 'center' });
    }
    // 拍のランプ: 大きい輪=拍の頭、小さい輪=跳ねた短い裏
    var cur = beatN >= 0 ? beatN % 4 : -1;
    for (var b = 0; b < 4; b++) {
      var lx = 330 + b * 130;
      var on = b === cur;
      vring(lx, 180, on ? 22 + beatPulse * 8 : 18, on ? YL : CY, on ? 4 : 2, on ? 1 : 0.5);
      vring(lx + 130 * SW, 180, 8 + (on ? swPulse * 6 : 0), OR, 2, on && swPulse > 0.2 ? 1 : 0.4);
    }
    if (combo >= 2) label(combo + ' COMBO', W - 40, 182, 30, OR, 'right');
    var progress = clamp(songT / endT, 0, 1);
    vl(0, 216, W * progress, 216, GR, 3);
  }

  function drawResult(t) {
    var y0 = H * 0.25, hh = H * 0.37;
    game.draw.rect(70, y0, W - 140, hh, BK, 0.92);
    vbox(70, y0, W - 140, hh, won ? GR : OR, 4);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 92, won ? GR : OR);
    label('SCORE ' + score, W / 2, H * 0.36, 58, CRM);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 32, CY);
    label((won ? stack.length : perfects + goods) + ' / ' + cups.length, W / 2, H * 0.45, 50, GR);
    label('COMBO ' + maxCombo, W / 2, H * 0.49, 38, OR);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 56, YL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, YL);
    if (!won) {
      var left = 0;
      for (var i = 0; i < cups.length; i++) if (!cups[i].res) left++;
      label('あと' + Math.max(1, left) + '個', W / 2, H * 0.215, 58, OR);
    }
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 34, CRM);
  }

  // ---- ATTRACT: 実ロジックで跳ねる拍の茶碗を受けて重ねる。5個目は列を間違えて割ってしまう ----
  var demo = { t: 0, x: 540, press: 0, done: {} };
  var DEMO_LEN = DEMO_BARS * 4 * SPB + 1.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.press = 0; }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
    var next = null;
    for (var i = 0; i < cups.length; i++) if (!cups[i].res && !demo.done[i]) { next = cups[i]; break; }
    if (!next) return;
    var L = next.idx === DEMO_FAIL ? 2 : next.lane;
    demo.x += (LANE_X[L] - demo.x) * Math.min(1, dt * 12);
    if (running && hitStop <= 0 && songT >= next.t - 0.012) {
      demo.done[next.idx] = true;
      tapLane(L);
      demo.press = 0.15;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    swPulse = Math.max(0, swPulse - dt * 5);
    if (catchT > 0) catchT -= dt;
    if (moving > 0) moving -= dt;
    for (var p = 0; p < 3; p++) if (padT[p] > 0) padT[p] -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x + 20, demo.press > 0 ? 1700 : 1660, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, BK);
      vl(0, 226, W, 226, CY, 2, 0.7);
      label(GAME_TITLE, W / 2, 100 + Math.sin(t * 3) * 4, 92, Math.floor(t * 3) % 2 ? YL : CRM);
      label('HI-SCORE ' + game.best, W / 2, 186, 36, GR);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, YL);
      else label('TAP TO START', W / 2, H * 0.965, 40, CRM);
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
    if (tumble) {
      for (var k = 0; k < tumble.length; k++) {
        var tb = tumble[k];
        tb.vy += 1500 * dt; tb.x += tb.vx * dt; tb.y += tb.vy * dt;
        if (tb.y > GROUND_Y - 50) { tb.y = GROUND_Y - 50; tb.vy *= -0.25; tb.vx *= 0.7; }
      }
    }
    if (over) {
      outroT -= dt;
      if (hitStop > 0) { hitStop -= dt; if (missFx) missFx.t = hitStop; if (hitStop <= 0) shatter(); }
      else physics(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, stacked: stack.length, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
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
      game.draw.rect(0, H * 0.42, W, 170, BK, 0.85);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 90, 110, YL);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? GR : OR);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
