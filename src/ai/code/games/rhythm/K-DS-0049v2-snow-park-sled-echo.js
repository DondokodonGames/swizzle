// K-DS-0049v2-snow-park-sled-echo.js
// 雪の公園のそり跡なぞり — 父が1小節かけて拍ごとに曲がりながら滑り下りたそりの跡を、次の小節で同じ拍の速さでなぞって滑り下りる
// 操作: 画面のどこでも指を左右に動かすと、子どものそりが同じだけ左右へ動く(下へは拍の速さで自動で進む)。父の小節では父のそりが拍の頭ごとに旗の所で曲がって跡を残し、曲がるたびに位置で高さの違う口笛が鳴る(見るだけ)。次の小節の頭で子どものそりが跡の始まりから滑り出すので、各旗(拍の頭)にぴったり着くよう跡をなぞる。拍の頭の瞬間に旗からどれだけ先走ったか・遅れたかでPERFECT/GOOD/MISS。跡から大きく外れるとそりが赤く光って警告し、さらに外れると転んでその小節は終わり(MISS1回)。下の目盛りに4本の旗の位置が出ている
// 終わり: 前奏1小節+(父の小節→自分の小節)×3組(120BPM・28拍・14秒・旗12本)を終えてMISS 3回以内ならCLEAR(判定点+連続ボーナス+跡まるごと成功ボーナス)。MISS 4回でGAME OVER。組ごとに曲がる幅が大きく、速くなる
// @mechanic: trace
// @theme: snow_park_sled_echo
// 世界観: 雪の公園の斜面で、そりに乗った子どもが、先に滑った父のそりの跡を同じ拍でなぞって滑り下り、曲がり方を覚えていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・通した旗の数・最大コンボ・跡の一致率
// スタイル: 2000s ARCADE POP
var STYLE = { bg: ['#8fd8ff', '#fff0fa'], main: ['#ff3c8c', '#1e8cff', '#ffd200'], accent: ['#ffffff', '#3cdc5a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステルの空、原色+太い白縁の文字、光の柱と星の物量
  var SKY = STYLE.bg[0], PALE = STYLE.bg[1];
  var PNK = STYLE.main[0], BLU = STYLE.main[1], YEL = STYLE.main[2];
  var WHT = STYLE.accent[0], GRN = STYLE.accent[1];
  var INK = '#28306e', SNOW2 = '#d6ecff', RED = '#ff4040';

  var GAME_TITLE = 'SLED ECHO';
  var BPM = 120;
  var SPB = 60 / BPM;            // 1拍 0.5秒
  var LEAD = 0.06;
  var PERFECT_W = 0.06, GOOD_W = 0.14;
  var PERF_PX = 30, GOOD_PX = 72;
  var WARN_PX = 130, CRASH_PX = 215;
  var READY_T = 0.8;
  var TIME_LIMIT = 14;           // 前奏1小節+6小節 = 28拍 × 0.5秒
  var MISS_MAX = 4;
  var TOP_Y = 400, ROW = 232;    // 旗k の高さ = TOP_Y + k*ROW(旗4 = 1328)

  // 跡の型(旗0=滑り出し、旗1〜4=拍の頭で曲がる所)。組ごとに振れ幅が大きくなる
  var FIGS = [
    [540, 360, 720, 400, 640],
    [540, 780, 500, 280, 560],
    [540, 280, 760, 380, 840]
  ];
  var RUNS = [{ fig: 0, call: 1 }, { fig: 1, call: 3 }, { fig: 2, call: 5 }];
  var BARS = 7;
  var DEMO_FIGS = [[540, 360, 720, 420, 660]];
  var DEMO_RUNS = [{ fig: 0, call: 1 }];
  var DEMO_BARS = 3;
  var DEMO_FAIL = 3;             // デモは3本目の旗へ遅れてMISS
  var NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'];

  // ---- スプライト ----
  var RIDER_A = [
    '....yyyy....',
    '...yyyyyy...',
    '...ssssss...',
    '...sksskss..',
    '...ssssss...',
    '..rrrrrrrr..',
    '.bbbbbbbbbb.',
    'sbbbbbbbbbbs',
    '..bbbbbbbb..',
    'oooooooooooo',
    '.o........o.',
    'kkkkkkkkkkkk'
  ];
  var RIDER_B = [
    '....yyyy....',
    '...yyyyyy...',
    '...ssssss...',
    '...sksskss..',
    '...ssssss...',
    '..rrrrrrrrrr',
    '.bbbbbbbbbbr',
    'sbbbbbbbbbbs',
    '..bbbbbbbb..',
    'oooooooooooo',
    '.o........o.',
    'kkkkkkkkkkkk'
  ];
  var RIDER_CHEER = [
    's..yyyy...s.',
    's.yyyyyy..s.',
    '.sssssss.s..',
    '..sksskss...',
    '...ssssss...',
    '..rrrrrrrr..',
    '..bbbbbbbb..',
    '..bbbbbbbb..',
    '..bbbbbbbb..',
    '..bb....bb..',
    '..bb....bb..',
    '.kkk....kkk.'
  ];
  var DAD_PAL = { y: GRN, s: '#ffd0a8', k: INK, r: YEL, b: BLU, o: '#ff9a3c' };
  var KID_PAL = { y: PNK, s: '#ffd0a8', k: INK, r: WHT, b: PNK, o: YEL };
  var KID_HOT = { y: RED, s: WHT, k: RED, r: RED, b: RED, o: RED };
  var PINE = [
    '....w....',
    '...wgw...',
    '..wgggw..',
    '...ggg...',
    '..wgggw..',
    '.ggggggg.',
    '..ggggg..',
    '.wgggggw.',
    'ggggggggg',
    '....t....',
    '....t....'
  ];
  var FLAG = ['pppp.', 'ppppp', 'pppp.', 'p....', 'p....', 'p....'];
  var STAR = ['..y..', '.yyy.', 'yyyyy', '.yyy.', '..y..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, runs, beats, endT, running, songT, schedB, beatN, readyT, realT, hitStop;
  var score, combo, maxCombo, perfects, goods, misses, flags, clean, accSum, accN;
  var child, drag, missFx, pillars, over, won, outroT, prevBest, beatPulse, warnT, beepT, msDone;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function nodeY(k) { return TOP_Y + k * ROW; }
  function noteFor(x) { return NOTES[clamp(Math.round((x - 260) / 100), 0, NOTES.length - 1)]; }

  function buildSong() {
    var src = demoMode ? DEMO_RUNS : RUNS, figs = demoMode ? DEMO_FIGS : FIGS;
    var nb = demoMode ? DEMO_BARS : BARS;
    runs = [];
    for (var i = 0; i < src.length; i++) {
      runs.push({ pts: figs[src[i].fig], call: src[i].call, resp: src[i].call + 1, res: ['start', '', '', '', ''], crashed: false, trail: [], acc: [], idx: i });
    }
    beats = [];
    for (var b = 0; b <= nb * 4; b++) beats.push(b * SPB);
    endT = nb * 4 * SPB;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    buildSong();
    running = demoMode; songT = 0; schedB = 0; beatN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; flags = 0; clean = 0; accSum = 0; accN = 0;
    child = { x: 540, y: TOP_Y, run: null, crashT: 0, hot: false };
    drag = null; missFx = null; pillars = [];
    over = false; won = false; outroT = 0; prevBest = game.best; beatPulse = 0; warnT = 0; beepT = 0; msDone = false;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル・Cメジャーの雪遊びの節)。父の小節は鈴、自分の小節は手拍子が入る ----
  var CHORD = [['C4', 'E4'], ['A3', 'C4'], ['F3', 'A3'], ['G3', 'B3']];
  var BASS = ['C3', 'A2', 'F2', 'G2'];
  function barRole(bar) {
    for (var i = 0; i < runs.length; i++) {
      if (runs[i].call === bar) return 'call';
      if (runs[i].resp === bar) return 'resp';
    }
    return 'intro';
  }
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4), pos = b % 4, ch = CHORD[bar % 4], role = barRole(bar);
    if (b >= beats.length - 1) { game.audio.melody([['C5', 1]], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: [['C3', 1]], bassVolume: 0.14 }); return; }
    game.audio.melody([['R', 0.5], [ch[pos % 2], 0.5]], { tempo: BPM, wave: 'square', volume: 0.022, bass: [[BASS[bar % 4], 1]], bassWave: 'triangle', bassVolume: pos === 0 ? 0.15 : 0.11 });
    if (role === 'call') game.audio.melody([[pos === 0 ? 2637 : 2093, 0.12], ['R', 0.88]], { tempo: BPM, wave: 'triangle', volume: 0.04 });
    else if (role === 'resp') game.audio.melody([['R', 0.5], [1200, 0.06], ['R', 0.44]], { tempo: BPM, wave: 'square', volume: 0.02 });
    else game.audio.tone(pos === 0 ? 1320 : 880, 0.05, { wave: 'triangle', volume: 0.07 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < beats.length && songT >= beats[schedB] - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < beats.length && songT >= beats[beatN + 1]) {
      beatN++; onBeat(beatN);
      if (over || hitStop > 0) return;
    }
    steerCheck();
    if (songT >= endT + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function onBeat(b) {
    beatPulse = 1;
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      var k = b - r.call * 4;
      if (k >= 0 && k <= 4) {
        sfx(noteFor(r.pts[k]), 0.16, { wave: 'triangle', volume: 0.09 });
        game.fx.burst(r.pts[k], nodeY(k) + 30, { color: WHT, count: 6, speed: 160 });
      }
      if (b === r.resp * 4) startRun(r);
      var j = b - r.resp * 4;
      if (j >= 1 && j <= 4 && child.run === r && !r.crashed) judgeNode(r, j);
    }
  }

  function startRun(r) {
    child.run = r; child.x = r.pts[0]; child.y = TOP_Y; child.crashT = 0; child.hot = false;
    r.trail = [{ x: child.x, y: child.y }];
    sfx(660, 0.05, { wave: 'square', volume: 0.05 });
    sfx(990, 0.08, { wave: 'square', volume: 0.05 });
  }

  function runU(r) { return (songT - r.resp * 4 * SPB) / SPB; }
  function idealX(r, u) {
    var k = clamp(Math.floor(u), 0, 3), f = clamp(u - k, 0, 1);
    return r.pts[k] + (r.pts[k + 1] - r.pts[k]) * f;
  }

  // 自分の小節: 下へは拍の速さで進み、跡からのずれを毎フレーム見る
  function steerCheck() {
    var r = child.run;
    if (!r) return;
    var u = runU(r);
    if (u < 0 || u > 4.02) return;
    child.y = TOP_Y + clamp(u, 0, 4) * ROW;
    if (r.crashed) return;
    var last = r.trail[r.trail.length - 1];
    if (!last || Math.abs(last.y - child.y) > 6) r.trail.push({ x: child.x, y: child.y });
    var dev = Math.abs(child.x - idealX(r, u));
    child.hot = dev > WARN_PX;
    if (child.hot) {
      warnT = 0.2;
      if (beepT <= 0) { sfx(1760, 0.04, { wave: 'square', volume: 0.04 }); beepT = 0.12; }
    }
    if (dev > CRASH_PX && u < 3.9) crash(r);
  }

  function judgeNode(r, k) {
    var nx = r.pts[k], px = r.pts[k - 1];
    var v = Math.abs(nx - px) / SPB;
    var err = child.x - nx, ae = Math.abs(err);
    var pw = Math.max(PERF_PX, v * PERFECT_W), gw = Math.max(GOOD_PX, v * GOOD_W);
    var y = nodeY(k);
    flags++;
    if (ae > gw) {
      r.res[k] = 'miss'; r.acc.push(0);
      missAt(nx, y);
    } else {
      var w = ae <= pw ? 'PERFECT' : 'GOOD';
      r.res[k] = w; r.acc.push(clamp(1 - ae / (2 * gw), 0, 1));
      combo++; if (combo > maxCombo) maxCombo = combo;
      if (w === 'PERFECT') perfects++; else goods++;
      score += (w === 'PERFECT' ? 100 : 60) + Math.min(combo, 8) * 10;
      pillars.push({ x: nx, t: 0.5, col: w === 'PERFECT' ? YEL : BLU });
      sfx(noteFor(nx), 0.14, { wave: 'square', volume: 0.07 });
      // GOODは先走り(旗より先)なら旗の先へ、遅れなら手前へ小さな雪煙を出してずれの向きを見せる
      var early = err * (nx > px ? 1 : -1) > 0;
      if (w === 'GOOD') game.fx.burst(nx + (early ? 1 : -1) * (nx > px ? 1 : -1) * 60, y, { color: SNOW2, count: 6, speed: 120 });
      if (demoMode) game.fx.popup(w, nx, y - 90, { color: w === 'PERFECT' ? YEL : BLU, size: 46 });
      else game.feedback.good(nx, y - 90, { text: w, color: w === 'PERFECT' ? YEL : BLU, size: w === 'PERFECT' ? 56 : 46, count: 12, volume: 0.1 });
    }
    if (k === 4) endRun(r);
  }

  function endRun(r) {
    var sum = 0;
    for (var i = 0; i < r.acc.length; i++) sum += r.acc[i];
    var pct = Math.round(sum / 4 * 100);
    accSum += pct; accN++;
    var ok = !r.crashed && r.res.indexOf('miss') < 0;
    if (ok) {
      clean++;
      score += 200;
      if (!demoMode) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE ' + pct + '%', W / 2, 1180, { color: PNK, size: 80 });
        for (var b = 0; b < 4; b++) game.fx.burst(200 + b * 230, 1240, { color: [YEL, PNK, BLU, GRN][b], count: 12, speed: 340 });
      }
    } else if (!demoMode) {
      game.fx.popup(pct + '%', W / 2, 1180, { color: BLU, size: 64 });
    }
  }

  function crash(r) {
    r.crashed = true;
    for (var k = 1; k <= 4; k++) if (!r.res[k]) { r.res[k] = 'void'; flags++; }
    child.crashT = 1.2; child.hot = false;
    var sum = 0;
    for (var i = 0; i < r.acc.length; i++) sum += r.acc[i];
    accSum += Math.round(sum / 4 * 100); accN++;
    missAt(child.x, child.y);
  }

  function missAt(x, y) {
    misses++; combo = 0;
    hitStop = 0.42;
    missFx = { x: x, y: y, t: 0.42 };
    sfx(150, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', x, y - 100, { color: RED, size: 56 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(x, y - 100, { text: 'MISS', shake: 10, flashColor: WHT });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 120;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 8; i++) game.fx.burst(100 + i * 125, 420 + (i % 3) * 180, { color: [YEL, PNK, BLU, GRN][i % 4], count: 18, speed: 440 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (missFx) missFx.t = hitStop;
      if (hitStop <= 0) { missFx = null; if (!demoMode) game.audio.play('se_jump', 0.25); }
      return;
    }
    stepPlay(dt);
    fxStep(dt);
  }
  function fxStep(dt) {
    if (child.crashT > 0) child.crashT -= dt;
    if (warnT > 0) warnT -= dt;
    if (beepT > 0) beepT -= dt;
    for (var i = pillars.length - 1; i >= 0; i--) { pillars[i].t -= dt; if (pillars[i].t <= 0) pillars.splice(i, 1); }
  }

  function moveSled(dx) {
    var r = child.run;
    if (!r || r.crashed || hitStop > 0) return;
    var u = runU(r);
    if (u < 0 || u > 4) return;
    child.x = clamp(child.x + dx, 90, 990);
  }

  // ---- 入力: どこでも左右に動かす(1:1で相対移動) ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || y < 230) return;
    drag = { lx: x };
    game.audio.tone(child.run ? 880 : 520, 0.02, { wave: 'square', volume: 0.02 });
  });
  game.onMove(function(x, y) {
    if (!drag || state !== S.PLAYING || over) return;
    var dx = x - drag.lx;
    drag.lx = x;
    moveSled(dx);
    if (Math.abs(dx) > 18 && beepT <= 0 && child.run && !child.hot) { game.audio.tone(300 + Math.random() * 80, 0.02, { wave: 'triangle', volume: 0.015 }); beepT = 0.08; }
  });
  game.onRelease(function(x, y) {
    if (drag && state === S.PLAYING && !over) game.audio.tone(440, 0.02, { wave: 'triangle', volume: 0.015 });
    drag = null;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    var o = { size: sz, color: WHT, bold: true, align: align || 'center' };
    var d = Math.max(3, Math.round(sz / 14));
    game.draw.text(str, x - d, y, o); game.draw.text(str, x + d, y, o);
    game.draw.text(str, x, y - d, o); game.draw.text(str, x, y + d, o);
    game.draw.text(str, x + 2, y + d + 2, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ring(x, y, r, col, w) {
    var n = 24;
    for (var i = 0; i < n; i++) {
      var a1 = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w);
    }
  }

  function drawPark() {
    var t = game.time.elapsed;
    game.draw.gradient(230, 360, [[0, SKY], [1, PALE]]);
    // 遠くの丘と公園の木
    for (var h = 0; h < 5; h++) game.draw.circle(h * 260 + 40, 380, 120, h % 2 ? '#e8f4ff' : '#f4f8ff');
    // 斜面
    game.draw.gradient(330, 1440, [[0, '#ffffff'], [0.6, '#eef6ff'], [1, SNOW2]]);
    for (var s = 0; s < 14; s++) {
      var sy = 380 + s * 76 + ((s * 37) % 20);
      game.draw.rect(((s * 211) % 700) + 60, sy, 160, 6, SNOW2, 0.7);
    }
    // 両脇の木
    for (var k = 0; k < 6; k++) {
      var ty = 430 + k * 170;
      game.draw.sprite(PINE, { w: WHT, g: GRN, t: '#8a5a2a' }, 34 + (k % 2) * 16, ty, 9, { anchor: 'center' });
      game.draw.sprite(PINE, { w: WHT, g: GRN, t: '#8a5a2a' }, W - 34 - (k % 2) * 16, ty + 80, 9, { anchor: 'center' });
    }
    // 光の柱(判定に乗れた旗)
    for (var p = 0; p < pillars.length; p++) {
      var pl = pillars[p];
      game.draw.rect(pl.x - 40, 330, 80, 1110, pl.col, pl.t * 0.5);
      game.draw.rect(pl.x - 14, 330, 28, 1110, WHT, pl.t * 0.7);
    }
    // 星(きらきら)
    for (var st = 0; st < 7; st++) {
      if ((st + Math.floor(t * 3)) % 3 === 0) continue;
      game.draw.sprite(STAR, { y: st % 2 ? YEL : PNK }, 140 + st * 135, 260 + (st % 3) * 24, 5, { anchor: 'center' });
    }
  }

  function runPhase(r) {
    var callT0 = r.call * 4 * SPB, respT1 = (r.resp * 4 + 4) * SPB;
    if (songT < callT0 - SPB || songT > respT1 + SPB) return null;
    return { u: (songT - callT0) / SPB, fade: songT > respT1 ? clamp(1 - (songT - respT1) / SPB, 0, 1) : 1 };
  }

  function drawTrack(r, upto, alpha) {
    for (var k = 0; k < 4; k++) {
      if (upto <= k) break;
      var f = clamp(upto - k, 0, 1);
      var x1 = r.pts[k], y1 = nodeY(k), x2 = x1 + (r.pts[k + 1] - x1) * f, y2 = y1 + ROW * f;
      game.draw.line(x1 - 16, y1, x2 - 16, y2, alpha >= 1 ? '#a8c8f0' : 'rgba(168,200,240,' + alpha + ')', 10);
      game.draw.line(x1 + 16, y1, x2 + 16, y2, alpha >= 1 ? '#a8c8f0' : 'rgba(168,200,240,' + alpha + ')', 10);
      game.draw.line(x1, y1, x2, y2, alpha >= 1 ? '#c8e0ff' : 'rgba(200,224,255,' + alpha + ')', 6);
    }
  }

  function drawRuns() {
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i], ph = runPhase(r);
      if (!ph) continue;
      drawTrack(r, clamp(ph.u, 0, 4), ph.fade);
      // 旗(拍の頭で曲がる所)
      for (var k = 1; k <= 4; k++) {
        var fx = r.pts[k], fy = nodeY(k);
        var res = r.res[k];
        var col = res === 'PERFECT' ? YEL : (res === 'GOOD' ? BLU : (res === 'miss' || res === 'void' ? '#9aa4b8' : PNK));
        var flash = missFx && Math.abs(missFx.x - fx) < 2 && Math.abs(missFx.y - fy) < 2;
        game.draw.sprite(FLAG, { p: flash ? WHT : col }, fx + 30, fy - 34, flash ? 14 : 9, { anchor: 'center', alpha: ph.fade });
        game.draw.circle(fx, fy, 12, col, 0.8 * ph.fade);
        game.draw.text(String(k), fx + 72, fy - 50, { size: 30, color: INK, bold: true });
        if (child.run === r && !r.crashed && !res) {
          var due = r.resp * 4 + k, pr = (due * SPB - songT) / SPB;
          if (pr >= 0 && pr <= 1) ring(fx, fy, 30 + pr * 90, PNK, 6);
        }
      }
      // 子どものなぞった跡
      for (var j = 1; j < r.trail.length; j++) {
        game.draw.line(r.trail[j - 1].x - 12, r.trail[j - 1].y, r.trail[j].x - 12, r.trail[j].y, PNK, 5);
        game.draw.line(r.trail[j - 1].x + 12, r.trail[j - 1].y, r.trail[j].x + 12, r.trail[j].y, PNK, 5);
      }
      // 父のそり(父の小節)と、滑り終えたあと下で待つ父
      var t = game.time.elapsed;
      if (ph.u >= 0 && ph.u < 4) {
        var k2 = Math.floor(ph.u), f2 = ph.u - k2;
        var dx = r.pts[k2 + 1] - r.pts[k2];
        var dadX = r.pts[k2] + dx * f2, dadY = nodeY(k2) + ROW * f2;
        game.draw.sprite(Math.floor(t * 8) % 2 ? RIDER_A : RIDER_B, DAD_PAL, dadX, dadY - 40, 10, { anchor: 'center', flipX: dx < 0 });
      } else if (ph.u >= 4 && ph.u < 8.5) {
        var wave = Math.floor(t * 4) % 2 === 0;
        game.draw.sprite(wave ? RIDER_CHEER : RIDER_A, DAD_PAL, r.pts[4] > 540 ? r.pts[4] - 190 : r.pts[4] + 190, 1380, 9, { anchor: 'center' });
      }
    }
  }

  function drawChild() {
    var t = game.time.elapsed;
    var r = child.run;
    var active = r && runU(r) >= 0 && runU(r) <= 4.02;
    if (!active) {
      // 次の自分の番まで、滑り出し口の横で待つ
      var bobW = Math.round(Math.sin(t * 6) * 4);
      game.draw.sprite(RIDER_A, KID_PAL, 150, TOP_Y - 30 + bobW, 8, { anchor: 'center' });
      return;
    }
    var pal = child.hot && Math.floor(t * 14) % 2 === 0 ? KID_HOT : KID_PAL;
    if (child.crashT > 0) {
      var spin = Math.floor(child.crashT * 10) % 2 === 0;
      game.draw.sprite(RIDER_A, KID_PAL, child.x, child.y - 30, 8, { anchor: 'center', flipY: spin });
      game.draw.circle(child.x, child.y, 50, WHT, 0.6);
      return;
    }
    var u = runU(r), k = clamp(Math.floor(u), 0, 3);
    var goingLeft = r.pts[k + 1] < r.pts[k];
    game.draw.sprite(Math.floor(t * 10) % 2 ? RIDER_A : RIDER_B, pal, child.x, child.y - 30, 8, { anchor: 'center', flipX: goingLeft });
    if (child.hot) {
      for (var s = 0; s < 3; s++) game.draw.circle(child.x + game.random(-50, 50), child.y + game.random(-10, 30), 8, RED, 0.7);
    }
    if (missFx) game.draw.sprite(RIDER_A, { y: WHT, s: WHT, k: WHT, r: WHT, b: WHT, o: WHT }, missFx.x, missFx.y - 30, 11, { anchor: 'center', alpha: 0.5 });
  }

  // 親指ゾーン: 横の目盛り。自分のそりの位置と、今の組の旗4本の位置
  function drawThumb() {
    game.draw.gradient(1440, H, [[0, PALE], [1, '#ffd6ec']]);
    game.draw.rect(0, 1440, W, 10, WHT);
    game.draw.rect(90, 1636, 900, 14, INK, 0.25);
    game.draw.rect(90, 1636, 900, 6, WHT);
    var show = null;
    for (var i = 0; i < runs.length; i++) { var ph = runPhase(runs[i]); if (ph && ph.u >= -0.5 && ph.u < 8.2) { show = runs[i]; break; } }
    if (show) {
      for (var k = 1; k <= 4; k++) {
        var mx = show.pts[k];
        var due = child.run === show && !show.res[k];
        game.draw.rect(mx - 4, 1600, 8, 86, due ? PNK : '#9aa4b8');
        label(String(k), mx, 1574, 34, due ? PNK : BLU);
      }
    }
    var kx = child.run ? child.x : 150;
    game.draw.circle(kx, 1643, 46, child.hot ? RED : PNK);
    game.draw.circle(kx, 1643, 30, WHT);
    game.draw.rect(kx - 24, 1700, 48, 10, PNK, 0.6);
    for (var a = 0; a < 3; a++) {
      game.draw.rect(kx - 90 - a * 26, 1639, 14, 8, WHT, 0.7 - a * 0.2);
      game.draw.rect(kx + 76 + a * 26, 1639, 14, 8, WHT, 0.7 - a * 0.2);
    }
  }

  function drawScene() {
    drawPark();
    drawRuns();
    drawChild();
    drawThumb();
    if (warnT > 0) { game.draw.rect(0, 230, 18, 1210, RED, 0.6); game.draw.rect(W - 18, 230, 18, 1210, RED, 0.6); }
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, SKY], [1, PALE]]);
    game.draw.rect(0, 222, W, 8, WHT);
    label('SCORE ' + score, 40, 66, 44, PNK, 'left');
    label('BEST ' + prevBest, 40, 122, 28, BLU, 'left');
    label(flags + ' / 12', W - 40, 66, 44, BLU, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      game.draw.circle(W - 250 + i * 58, 124, 20, on ? PNK : '#c0c8d8');
      game.draw.circle(W - 256 + i * 58, 118, 7, WHT, on ? 0.8 : 0.3);
    }
    // 拍のランプ: 父の小節は青、自分の小節は桃色
    var bar = beatN >= 0 ? Math.floor(beatN / 4) : 0, cur = beatN >= 0 ? beatN % 4 : -1;
    var role = barRole(bar);
    game.draw.sprite(RIDER_A, role === 'resp' ? KID_PAL : DAD_PAL, 300, 180, 4, { anchor: 'center' });
    for (var b = 0; b < 4; b++) {
      var on2 = b === cur;
      var col = role === 'resp' ? PNK : (role === 'call' ? BLU : YEL);
      game.draw.circle(380 + b * 92, 180, on2 ? 24 + beatPulse * 6 : 16, col, on2 ? 1 : 0.35);
      if (on2) game.draw.circle(380 + b * 92, 180, 10, WHT);
    }
    if (combo >= 2) label(combo + ' COMBO', W - 40, 182, 32, YEL, 'right');
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(0, 212, W * progress, 10, YEL);
  }

  function drawResult(t) {
    var y0 = H * 0.25, hh = H * 0.37;
    game.draw.rect(60, y0, W - 120, hh, WHT, 0.94);
    game.draw.rect(60, y0, W - 120, 16, won ? YEL : PNK);
    game.draw.rect(60, y0 + hh - 16, W - 120, 16, BLU);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, won ? YEL : PNK);
    label('SCORE ' + score, W / 2, H * 0.36, 58, BLU);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 32, INK);
    var pct = accN ? Math.round(accSum / accN) : 0;
    label((perfects + goods) + ' / 12   ' + pct + '%', W / 2, H * 0.45, 48, PNK);
    label('COMBO ' + maxCombo, W / 2, H * 0.49, 38, GRN);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 56, YEL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, BLU);
    if (!won) label('あと' + Math.max(1, 12 - flags) + '本', W / 2, H * 0.215, 58, PNK);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 34, PNK);
  }

  // ---- ATTRACT: 父が滑って跡を残し、ゴーストの指が左右になぞって追う。3本目の旗は遅れてMISS ----
  var demo = { t: 0, x: 540, press: false };
  var DEMO_LEN = DEMO_BARS * 4 * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.x = 540; }
    tickWorld(dt);
    var r = runs[0];
    var u = runU(r);
    demo.press = u >= -0.3 && u <= 4;
    if (u >= 0 && u <= 4 && hitStop <= 0 && !r.crashed) {
      var lag = u > 2 && u < 3 ? 0.42 : 0;
      var target = idealX(r, Math.max(0, u - lag + 0.04));
      var dx = target - child.x;
      moveSled(dx);
      demo.x = 540 + (child.x - 540);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, 1650, { press: demo.press, scale: 14 });
      game.draw.gradient(0, 230, [[0, SKY], [1, PALE]]);
      game.draw.rect(0, 222, W, 8, WHT);
      label(GAME_TITLE, W / 2, 98 + Math.sin(t * 3) * 5, 96, Math.floor(t * 3) % 2 ? PNK : BLU);
      label('HI-SCORE ' + game.best, W / 2, 186, 38, YEL);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, PNK);
      else label('TAP TO START', W / 2, H * 0.965, 42, BLU);
      return;
    }

    if (state === S.RESULT) {
      fxStep(dt);
      drawScene();
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      if (hitStop > 0) { hitStop -= dt; if (missFx) missFx.t = hitStop; if (hitStop <= 0) missFx = null; }
      fxStep(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, flags: perfects + goods, maxCombo: maxCombo, cleanRuns: clean, match: accN ? Math.round(accSum / accN) : 0 };
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
      game.draw.rect(0, H * 0.42, W, 170, WHT, 0.85);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 90, 110, PNK);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? YEL : PNK);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
