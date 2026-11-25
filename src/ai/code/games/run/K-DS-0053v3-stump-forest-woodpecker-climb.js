// K-DS-0053v3-stump-forest-woodpecker-climb.js
// キツツキの若鳥の幹のぼり — 指を上へ払うたびにくちばしで幹に足場の穴を打ち込んで一段登る。拍の型が 4つ打ち → 3・3・2の食い → ドラムロール → 4つ打ち と途中で切り替わる
// 操作: 画面のどこかを押して指を上へスッと払う(一定の長さを越えた瞬間で判定)と、若鳥が頭上の幹に穴を打ち込んでそこへ一段跳び上がる。押すだけ・横や下へ払うだけでは何も起きない。上の譜面帯(今の小節の8分8コマ+下に次の小節)の光るひし形の拍の頭で払うとPERFECT/GOOD。赤いトゲの点の拍(堅い節)や拍の外で払うとくちばしが弾かれて一段ずり落ちる(MISS)。ひし形を見送るのもMISS(登れない)。型が変わる1小節前にキツツキのドラムロールが鳴り、次の小節の帯と左上の印が点滅し、変わる瞬間に森の光の色が変わる
// 終わり: 前奏1小節+8小節(108BPM・約20秒・足場33か所)を登り切って梢に出ればCLEAR(判定点+連続+高さ+残りの羽)。MISS 5回で根元の切り株までずり落ちてGAME OVER
// @mechanic: camera_climb
// @theme: stump_forest_woodpecker_climb
// 世界観: 巨木の切り株が並ぶ夜の森に一本だけ残った大木で、キツツキの若鳥が拍の型の変わる森の音に合わせて幹に足場の穴を打ち込み、一段ずつ梢の月明かりまで登っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・登った高さ・PERFECT/GOOD/MISS数・最大連続
// スタイル: 80s NEON
var STYLE = { bg: ['#05051a', '#140a3a'], main: ['#00f0ff', '#ff2bd6', '#ffe600'], accent: ['#39ff88', '#ffffff'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒のグラデ + シアン/マゼンタ/イエロー/白。外側に薄い同色を重ねた疑似グロー。点滅が命
  var NAVY = STYLE.bg[0], NAVY2 = STYLE.bg[1], CY = STYLE.main[0], MG = STYLE.main[1], YL = STYLE.main[2];
  var GR = STYLE.accent[0], WH = STYLE.accent[1];
  var RED = '#ff3355', DIM = '#3a3a6a';

  var GAME_TITLE = 'PECK UP';
  var BPM = 108;
  var SPB = 60 / BPM;          // 1拍 約0.556秒
  var E8 = SPB / 2;            // 8分 約0.278秒
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.1, OFF_W = 0.15;
  var FLICK_PX = 70;
  var READY_T = 0.8;
  var TIME_LIMIT = 20;         // 9小節 × 2.22秒 = 20秒。放置でも READY 0.8 + 20 + 余韻 2.4 ≒ 23秒で終わる
  var MISS_MAX = 5;
  var STEP_H = 120;            // 1段 = 1m
  var TRUNK_L = 420, TRUNK_R = 800;
  var BIRD_X = 430, BIRD_SY = 1150;
  var LANE_Y = 300;
  // 型: A=4つ打ち / B=3・3・2の食い / C=キツツキのドラムロール
  var PAT = {
    I: [0, 0, 0, 0, 0, 0, 0, 0],
    A: [1, 0, 1, 0, 1, 0, 1, 0],
    B: [1, 0, 0, 1, 0, 0, 1, 0],
    C: [1, 1, 1, 0, 1, 1, 1, 0],
    E: [1, 0, 1, 0, 1, 0, 0, 0]
  };
  var SEC_OF = { I: 'A', A: 'A', B: 'B', C: 'C', E: 'A' };
  var PLAN = ['I', 'A', 'A', 'A', 'B', 'B', 'C', 'C', 'E'];
  var DEMO_PLAN = ['A', 'B', 'C'];
  var DEMO_FAIL = { bar: 1, pos: 1 };   // デモは食いの型の堅い節で払ってしまいMISS
  var SEC_COL = { A: CY, B: MG, C: YL };

  // ---- スプライト(幹にしがみつく横向きの若鳥) ----
  var WP_A = [
    '....rr......',
    '...rrrr.....',
    '..kkkkkk....',
    '..kwekkbbb..',
    '..kwwkk.....',
    '..kkkkk.....',
    '.kkwkkk.....',
    '.kkkwkk.....',
    '.kwkkkkf....',
    '.kkkwkk.....',
    '..kkkkkf....',
    '..kkk.......',
    '..kk........',
    '..k.........',
    '..k.........'
  ];
  var WP_B = [
    '............',
    '....rr......',
    '...rrrr.....',
    '..kkkkkk....',
    '..kwekkbbb..',
    '..kwwkk.....',
    '.kkkwkk.....',
    '.kkwkkk.....',
    '.kwkkkkf....',
    '.kkkwkk.....',
    '..kkkkkf....',
    '..kkk.......',
    '..kk........',
    '..k.........',
    '..k.........'
  ];
  var WP_PECK = [
    '.....rr.....',
    '....rrrr....',
    '...kkkkkk...',
    '...kwekkbbbb',
    '...kwwkkk...',
    '..kkkkkk....',
    '.kkwkkk.....',
    '.kkkwkk.....',
    '.kwkkkkf....',
    '.kkkwkk.....',
    '..kkkkkf....',
    '..kkk.......',
    '..kk........',
    '..k.........',
    '..k.........'
  ];
  var WP_FLAP = [
    'c...rr......',
    'cc.rrrr.....',
    '.ckkkkkk....',
    '.ckwekkbbb..',
    '..kwwkk..c..',
    '..kkkkk.cc..',
    '.kkwkkkcc...',
    '.kkkwkk.....',
    '.kwkkkkf....',
    '.kkkwkk.....',
    '..kkkkkf....',
    '..kkk.......',
    '..kk........',
    '..k.........',
    '..k.........'
  ];
  var WP_PAL = { r: MG, k: '#4646b0', w: WH, e: NAVY, b: YL, f: CY, c: CY };
  var WP_FLASH = { r: WH, k: WH, w: WH, e: WH, b: WH, f: WH, c: WH };
  var FEATHER = ['..c.', '.cm.', '.cm.', 'cmm.', 'cm..', 'm...'];
  var MOONS = ['..yyy..', '.yyyyy.', 'yyyyyyy', 'yyyyyyy', 'yyyyyyy', '.yyyyy.', '..yyy..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, plan, notes, rests, endT, running, songT, schedB, beatN, readyT, realT, hitStop;
  var bird, holes, camY, step, totalSteps, flick, curSec, flashT, flashCol, announce;
  var score, combo, maxCombo, perfects, goods, misses, climbs, maxStep, over, won, outroT, prevBest, beatPulse, mileNext;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    plan = demoMode ? DEMO_PLAN : PLAN;
    notes = []; rests = [];
    for (var k = 0; k < plan.length; k++) {
      var pat = PAT[plan[k]];
      for (var p = 0; p < 8; p++) {
        var ev = { t: (k * 8 + p) * E8, bar: k, pos: p, res: '' };
        if (plan[k] === 'I') continue;
        if (pat[p]) notes.push(ev); else rests.push(ev);
      }
    }
    totalSteps = notes.length;
    endT = plan.length * 8 * E8;
    running = demoMode; songT = demoMode ? -0.3 : 0; schedB = 0; beatN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    step = 0; maxStep = 0;
    bird = { y: 0, fromY: 0, hopT: 0, peckT: 0, flashT: 0, slipT: 0, flyT: 0 };
    holes = [];
    camY = -BIRD_SY;
    flick = null;
    curSec = SEC_OF[plan[0]]; flashT = 0; flashCol = CY; announce = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; climbs = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; beatPulse = 0; mileNext = 10;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル、イ短調のシンセ)。型ごとに旋律・ベース・音色が変わる ----
  var MEL = [
    ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'],
    ['A4', 'C5', 'E5', 'C5', 'A4', 'C5', 'E5', 'G5'],
    ['F5', 'E5', 'C5', 'A4', 'F5', 'E5', 'C5', 'E5'],
    ['G5', 'D5', 'B4', 'D5', 'G5', 'A5', 'B5', 'D6'],
    ['D5', 'R', 'R', 'F5', 'R', 'R', 'A5', 'R'],
    ['E5', 'R', 'R', 'G#5', 'R', 'R', 'B5', 'R'],
    ['A5', 'A5', 'A5', 'R', 'C6', 'C6', 'C6', 'R'],
    ['F5', 'F5', 'F5', 'R', 'A5', 'A5', 'A5', 'R'],
    ['E5', 'C5', 'A4', 'C5', 'E5', 'A5', 'R', 'R']
  ];
  var ROOT = ['A2', 'A2', 'F2', 'G2', 'D2', 'E2', 'A2', 'F2', 'A2'];
  var OCT = ['A3', 'A3', 'F3', 'G3', 'D3', 'E3', 'A3', 'F3', 'A3'];
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4), i = b % 4;
    if (bar >= plan.length) return;
    var key = plan[bar], sec = SEC_OF[key], pat = PAT[key === 'I' ? 'A' : key];
    var m = MEL[bar % MEL.length];
    var bs = [];
    for (var h = 0; h < 2; h++) {
      var p8 = i * 2 + h;
      if (sec === 'A') bs.push([h ? OCT[bar] : ROOT[bar], 0.5]);
      else bs.push([pat[p8] ? ROOT[bar] : 'R', 0.5]);
    }
    var wave = sec === 'A' ? 'square' : (sec === 'B' ? 'triangle' : 'sawtooth');
    game.audio.melody([[m[i * 2], 0.5], [m[i * 2 + 1], 0.5]], { tempo: BPM, wave: wave, volume: sec === 'C' ? 0.022 : 0.032, bass: bs, bassWave: sec === 'B' ? 'sawtooth' : 'triangle', bassVolume: sec === 'B' ? 0.06 : 0.14 });
    game.audio.melody([['C2', 0.2], ['R', 0.8]], { tempo: BPM, wave: 'sine', volume: 0.2 });
    if (i === 1 || i === 3) game.audio.melody([[220, 0.25], ['R', 0.75]], { tempo: BPM, wave: 'sawtooth', volume: 0.05 });
    game.audio.melody([[7000, 0.06], ['R', 0.44], [7000, 0.06], ['R', 0.44]], { tempo: BPM, wave: 'square', volume: 0.008 });
    // 型が変わる1小節前の3〜4拍目: キツツキのドラムロール(予告)
    var nx = plan[bar + 1];
    if (nx && SEC_OF[nx] !== sec && key !== 'I' && i >= 2) {
      var roll = [];
      for (var r = 0; r < 8; r++) roll.push([r % 2 ? 1180 : 1320, 0.125]);
      game.audio.melody(roll, { tempo: BPM, wave: 'square', volume: 0.04 });
    }
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    var nb = plan.length * 4;
    while (schedB < nb && songT >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < nb && songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (!n.res && songT > n.t + GOOD_W + 0.02) { n.res = 'skip'; missAt('skip'); if (over || hitStop > 0) return; }
    }
    if (songT >= endT + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function onBeat(b) {
    beatPulse = 1;
    var bar = Math.floor(b / 4), i = b % 4;
    if (i !== 0 || bar >= plan.length) return;
    var sec = SEC_OF[plan[bar]], nx = plan[bar + 1];
    announce = nx && SEC_OF[nx] !== sec && plan[bar] !== 'I' ? 1 : 0;
    if (sec !== curSec) {
      curSec = sec; flashT = 0.5; flashCol = SEC_COL[sec];
      if (!demoMode) { game.audio.play('se_powerup', 0.35); game.fx.flash(SEC_COL[sec], 0.15); }
    }
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function flickAt() {
    if (!running || over || hitStop > 0) return;
    bird.peckT = 0.16;
    if (!demoMode && plan[0] === 'I' && songT < 8 * E8 - OFF_W) { sfx(1500, 0.03, { wave: 'square', volume: 0.03 }); return; }   // 前奏は素振り(罰なし)
    var best = null, bd = 9;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].res) continue;
      var d = Math.abs(songT - notes[i].t);
      if (d < bd) { bd = d; best = notes[i]; }
    }
    if (best && bd <= GOOD_W) { hitAt(best, bd); return; }
    if (best && bd <= OFF_W) { best.res = 'miss'; }
    missAt('slip');
  }

  function hitAt(n, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    n.res = w;
    combo++; climbs++;
    if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 60) + combo * 10;
    step++;
    if (step > maxStep) maxStep = step;
    holes.push({ y: -step * STEP_H + 30, t: 0.3 });
    bird.fromY = bird.y; bird.hopT = 0.16;
    var sy = BIRD_SY - 120;
    if (demoMode) game.fx.popup(w, 700, sy, { color: SEC_COL[curSec], size: 52 });
    else game.feedback.good(700, sy, { text: w, color: w === 'PERFECT' ? YL : WH, size: w === 'PERFECT' ? 56 : 46, count: 10 });
    game.fx.burst(BIRD_X + 60, sy + 20, { color: SEC_COL[curSec], count: 8, speed: 240 });
    sfx(w === 'PERFECT' ? 1760 : 1480, 0.04, { wave: 'square', volume: 0.06 });
    sfx(880, 0.05, { wave: 'triangle', volume: 0.05, slide: 300 });
    if (!demoMode && step >= mileNext) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(mileNext + 'm', W / 2, 760, { color: GR, size: 96 });
      mileNext += 10;
    }
    if (!demoMode && (combo === 8 || combo === 16)) game.fx.popup('COMBO ' + combo, W / 2, 660, { color: MG, size: 70 });
  }

  function missAt(why) {
    misses++; combo = 0;
    hitStop = 0.4; bird.flashT = 0.45;
    if (why === 'slip' && step > 0) { step--; bird.fromY = bird.y; bird.slipT = 0.3; }
    var sy = BIRD_SY - 140;
    sfx(why === 'slip' ? 300 : 140, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -160 });
    if (demoMode) { game.fx.popup('MISS', 700, sy, { color: RED, size: 60 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(700, sy, { text: 'MISS', shake: 10, flashColor: WH });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.4; running = false;
    if (ok) {
      score += step * 20 + (MISS_MAX - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 8; i++) game.fx.burst(120 + i * 120, 500 + (i % 3) * 180, { color: [CY, MG, YL, GR][i % 4], count: 18, speed: 460 });
      bird.flyT = 0.01;
    } else {
      game.audio.play('se_failure', 0.5);
      bird.fromY = bird.y; bird.slipT = -1;
    }
  }

  function birdTargetY() { return -step * STEP_H; }

  function stepBird(dt) {
    if (bird.peckT > 0) bird.peckT -= dt;
    var ty = birdTargetY();
    if (bird.hopT > 0) {
      bird.hopT -= dt;
      bird.y = lerp(ty, bird.fromY, Math.max(0, bird.hopT / 0.16));
    } else if (bird.slipT > 0) {
      bird.slipT -= dt;
      bird.y = lerp(ty, bird.fromY, Math.max(0, bird.slipT / 0.3));
    } else bird.y += (ty - bird.y) * Math.min(1, dt * 12);
  }

  function stepCam(dt) {
    var tgt = bird.y - BIRD_SY;
    camY += (tgt - camY) * Math.min(1, dt * 6);
  }

  function tickWorld(dt) {
    if (bird.flashT > 0) bird.flashT -= dt;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (flashT > 0) flashT -= dt;
    for (var i = 0; i < holes.length; i++) if (holes[i].t > 0) holes[i].t -= dt;
    stepPlay(dt);
    stepBird(dt);
    stepCam(dt);
  }

  // ---- 入力: 押して上へ払う ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || y < 230) return;
    flick = { x: x, y: y, fired: false };
    if (readyT <= 0) game.audio.tone(660, 0.02, { wave: 'square', volume: 0.02 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !flick || flick.fired || over) return;
    if (flick.y - y >= FLICK_PX && Math.abs(x - flick.x) < flick.y - y + 40) {
      flick.fired = true;
      if (readyT > 0 || !running) return;
      game.audio.tone(1040, 0.03, { wave: 'square', volume: 0.03, slide: 400 });
      flickAt();
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !flick) return;
    if (!flick.fired && !over && running) game.fx.burst(x, y, { color: DIM, count: 3, speed: 80 });
    flick = null;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画(疑似グロー) ----
  function glowLine(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '30', w * 4);
    game.draw.line(x1, y1, x2, y2, col + '60', w * 2.2);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function glowRing(x, y, r, col, w, ry) {
    var yr = ry || r;
    for (var i = 0; i < 20; i++) {
      var a1 = i / 20 * Math.PI * 2, a2 = (i + 1) / 20 * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * yr, x + Math.cos(a2) * r, y + Math.sin(a2) * yr, col + '50', w * 3);
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * yr, x + Math.cos(a2) * r, y + Math.sin(a2) * yr, col, w);
    }
  }
  function diamond(x, y, r, col, fill) {
    var p = [[x, y - r], [x + r, y], [x, y + r], [x - r, y]];
    if (fill) for (var k = -r; k < r; k += 3) { var hw = r - Math.abs(k); game.draw.rect(x - hw, y + k, hw * 2, 3, col); }
    for (var i = 0; i < 4; i++) glowLine(p[i][0], p[i][1], p[(i + 1) % 4][0], p[(i + 1) % 4][1], col, 4);
  }
  function spikes(x, y, r, col) {
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      glowLine(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, col, 4);
    }
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y + 4, { size: sz, color: col + '50', bold: true, align: align || 'center' });
    game.draw.text(str, x + 3, y + 3, { size: sz, color: NAVY, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawForest() {
    var t = game.time.elapsed;
    var sc = SEC_COL[curSec];
    game.draw.gradient(0, H, [[0, NAVY], [0.6, NAVY2], [1, NAVY]]);
    // 月(梢の向こう)
    var my = 420 - camY * 0.03 - 0;
    game.draw.circle(820, my, 150, YL, 0.06);
    game.draw.circle(820, my, 110, YL, 0.1);
    game.draw.sprite(MOONS, { y: '#fff6c0' }, 820, my, 22, { anchor: 'center' });
    // 星
    for (var s = 0; s < 30; s++) {
      if ((s + Math.floor(t * 3)) % 7 === 0) continue;
      game.draw.rect((s * 197) % 1060 + 10, 240 + (s * 131 - camY * 0.05 + 4000) % 1200, 4, 4, s % 3 ? WH : CY);
    }
    // 遠い切り株の列(パララックス)
    for (var layer = 0; layer < 2; layer++) {
      var par = layer ? 0.35 : 0.15, col = layer ? MG : CY;
      var baseY = 1500 - camY * par - (-BIRD_SY) * par;
      for (var k = 0; k < 4; k++) {
        var x = (k * 330 + layer * 150) % 1200 - 60, w = 160 + (k % 2) * 80, h = 140 + layer * 60;
        var top = baseY - h;
        if (top > H || baseY < 230) continue;
        game.draw.rect(x, top, w, h, NAVY);
        glowLine(x, top, x, baseY, col, 3);
        glowLine(x + w, top, x + w, baseY, col, 3);
        glowRing(x + w / 2, top, w / 2, col, 3, 18);
        glowRing(x + w / 2, top, w / 4, col + '', 2, 8);
      }
    }
    // 蛍
    for (var f = 0; f < 10; f++) {
      if (Math.floor(t * 2 + f) % 3 === 0) continue;
      var fx = (f * 211 + Math.sin(t + f) * 40) % 1040 + 20, fy = 400 + (f * 157 + Math.cos(t * 0.7 + f) * 40) % 1000;
      game.draw.circle(fx, fy, 10, GR, 0.25);
      game.draw.circle(fx, fy, 4, GR);
    }
    // 大木の幹(暗い面 + ネオンの輪郭 + 流れる樹皮)
    game.draw.rect(TRUNK_L, 230, TRUNK_R - TRUNK_L, 1210, '#0b0b2a');
    for (var b = 0; b < 7; b++) {
      var bx = TRUNK_L + 50 + b * 50;
      var off = ((-camY) * 1) % 160;
      for (var yy = 230 - 160 + off; yy < 1440; yy += 160) game.draw.line(bx + Math.sin(yy * 0.02 + b) * 8, yy, bx + Math.sin((yy + 80) * 0.02 + b) * 8, yy + 80, DIM, 3);
    }
    glowLine(TRUNK_L, 230, TRUNK_L, 1440, sc, 4);
    glowLine(TRUNK_R, 230, TRUNK_R, 1440, sc, 4);
    // 枝の切り口(一定の高さごと)
    for (var st = -40; st < 2; st++) {
      var wy = st * 600 - 260, syy = wy - camY;
      if (syy < 240 || syy > 1430) continue;
      glowLine(TRUNK_R, syy, TRUNK_R + 120, syy - 60, GR, 4);
      glowRing(TRUNK_R + 130, syy - 64, 18, GR, 3, 12);
    }
    // 根元の巨大な切り株
    var groundY = 0 - camY + 60;
    if (groundY < H + 300) {
      game.draw.rect(160, groundY, 760, 500, NAVY);
      glowLine(160, groundY, 920, groundY, MG, 5);
      glowRing(540, groundY, 380, MG, 3, 40);
    }
    // 梢(ゴール)
    var topY = -(totalSteps - 2) * STEP_H - 140 - camY;
    if (topY > -400 && topY < H) {
      for (var lf = 0; lf < 9; lf++) {
        var lx = 300 + lf * 60 + Math.sin(lf * 2) * 40, ly = topY - 60 - (lf % 3) * 60;
        glowRing(lx, ly, 90, GR, 4, 60);
      }
      game.draw.rect(TRUNK_L, topY, TRUNK_R - TRUNK_L, 30, GR + '40');
    }
    // 打ち込んだ穴
    for (var h = 0; h < holes.length; h++) {
      var hy = holes[h].y - camY;
      if (hy < 230 || hy > 1440) continue;
      game.draw.circle(BIRD_X + 74, hy - 70, 22, '#000010');
      glowRing(BIRD_X + 74, hy - 70, 22, holes[h].t > 0 ? WH : MG, 3, 14);
    }
    // 次に打ち込む位置(この先の足場3つ)
    for (var nx = 1; nx <= 3; nx++) {
      var ny = -(step + nx) * STEP_H + 30 - camY - 70;
      if (ny < 240) continue;
      glowRing(BIRD_X + 74, ny, 20 - nx * 3, sc, 2, 12 - nx * 2);
    }
  }

  function nearestRest() {
    for (var i = 0; i < rests.length; i++) {
      var d = rests[i].t - songT;
      if (d > -0.1 && d < 0.6) return rests[i];
    }
    return null;
  }

  function drawBird() {
    var sy = bird.y - camY;
    var fly = bird.flyT > 0 ? bird.flyT : 0;
    var x = BIRD_X + fly * 300, y = sy - fly * fly * 900;
    var art = fly > 0 || bird.slipT < 0 ? WP_FLAP : (bird.peckT > 0 ? WP_PECK : (Math.floor(game.time.elapsed * 3) % 2 ? WP_A : WP_B));
    var pal = bird.flashT > 0 && Math.floor(bird.flashT * 20) % 2 === 0 ? WP_FLASH : WP_PAL;
    var sc = bird.flashT > 0 ? 1.3 : 1;
    game.draw.circle(x, y - 80, 130, SEC_COL[curSec], 0.1);
    game.draw.circle(x, y - 80, 80, SEC_COL[curSec], 0.1);
    game.draw.sprite(art, pal, x, y - 80, 15 * sc, { anchor: 'center' });
    // 堅い節の予告(拍の0.6秒前から赤いトゲ)
    var rr = running && !over ? nearestRest() : null;
    if (rr && !(plan[rr.bar] === 'I')) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      spikes(BIRD_X + 74, y - 210, blink ? 36 : 28, RED);
    }
  }

  function drawLane() {
    // 譜面帯: 今の小節(8分8コマ)と、その下に次の小節
    game.draw.rect(0, 230, W, 200, '#000010', 0.85);
    var bar = Math.max(0, Math.floor(Math.max(0, songT) / (8 * E8)));
    var t = game.time.elapsed;
    for (var row = 0; row < 2; row++) {
      var kb = bar + row;
      if (kb >= plan.length) continue;
      var key = plan[kb], pat = PAT[key], sec = SEC_OF[key], col = SEC_COL[sec];
      var y = row ? 395 : LANE_Y, r = row ? 14 : 30;
      if (row && announce && Math.floor(t * 8) % 2 === 0) col = WH;
      for (var p = 0; p < 8; p++) {
        var x = 130 + p * 118;
        var ev = null;
        if (key !== 'I') {
          var list = pat[p] ? notes : rests;
          for (var i = 0; i < list.length; i++) if (list[i].bar === kb && list[i].pos === p) { ev = list[i]; break; }
        }
        if (key === 'I') { game.draw.circle(x, y, row ? 5 : 8, p % 2 ? DIM : CY); continue; }
        if (pat[p]) {
          var done = ev && ev.res && ev.res !== 'miss' && ev.res !== 'skip';
          var bad = ev && (ev.res === 'miss' || ev.res === 'skip');
          diamond(x, y, r, bad ? RED : col, done);
        } else if (!row) {
          var near = ev && ev.t - songT < 0.6 && ev.t - songT > -0.1;
          spikes(x, y, near ? 16 : 10, near ? RED : '#803048');
        } else game.draw.circle(x, y, 4, '#803048');
      }
    }
    if (running) {
      var pos = songT / E8 - bar * 8;
      if (pos >= -0.5 && pos < 8) glowLine(130 + pos * 118, LANE_Y - 44, 130 + pos * 118, LANE_Y + 44, WH, 3);
    }
    // 左上の型の印(四角=4つ打ち / 三角=食い / 星=ドラムロール)
    var shown = announce && Math.floor(t * 8) % 2 === 0 && plan[bar + 1] ? SEC_OF[plan[bar + 1]] : curSec;
    var ic = SEC_COL[shown], ix = 50, iy = 345;
    if (shown === 'A') { glowLine(ix - 18, iy - 18, ix + 18, iy - 18, ic, 4); glowLine(ix + 18, iy - 18, ix + 18, iy + 18, ic, 4); glowLine(ix + 18, iy + 18, ix - 18, iy + 18, ic, 4); glowLine(ix - 18, iy + 18, ix - 18, iy - 18, ic, 4); }
    else if (shown === 'B') { glowLine(ix, iy - 22, ix + 20, iy + 16, ic, 4); glowLine(ix + 20, iy + 16, ix - 20, iy + 16, ic, 4); glowLine(ix - 20, iy + 16, ix, iy - 22, ic, 4); }
    else spikes(ix, iy, 22, ic);
  }

  function drawPad() {
    // 親指ゾーン: 上へ払う道(流れる山形)
    game.draw.gradient(1440, H, [[0, '#0a0a2a'], [1, NAVY]]);
    glowLine(0, 1440, W, 1440, SEC_COL[curSec], 3);
    var t = game.time.elapsed;
    for (var c = 0; c < 5; c++) {
      var cy = 1840 - ((t * 220 + c * 80) % 400);
      var a = 1 - Math.abs(cy - 1640) / 220;
      if (a <= 0) continue;
      var col = SEC_COL[curSec];
      glowLine(540 - 90, cy + 50, 540, cy, col, 5);
      glowLine(540, cy, 540 + 90, cy + 50, col, 5);
    }
    // 高さメーター
    label(step + 'm', W - 50, 1560, 64, GR, 'right');
    var prog = clamp(step / Math.max(1, totalSteps), 0, 1);
    game.draw.rect(W - 60, 1600, 20, 260, DIM);
    game.draw.rect(W - 60, 1600 + 260 * (1 - prog), 20, 260 * prog, GR);
  }

  function drawScene() {
    drawForest();
    drawBird();
    drawPad();
    drawLane();
    if (flashT > 0) game.draw.rect(0, 230, W, 1210, flashCol, flashT * 0.2);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.12);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, NAVY);
    glowLine(0, 226, W, 226, MG, 3);
    label('SCORE ' + score, 40, 92, 52, CY, 'left');
    label('BEST ' + prevBest, 40, 160, 32, YL, 'left');
    label(climbs + ' / ' + totalSteps, W - 40, 92, 52, WH, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(FEATHER, i < MISS_MAX - misses ? { c: CY, m: MG } : { c: DIM, m: DIM }, W - 320 + i * 62, 165, 8, { anchor: 'center' });
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(0, 222, W * progress, 6, YL);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.37;
    game.draw.rect(60, y0, W - 120, hh, '#000010', 0.92);
    var c = won ? CY : RED;
    glowLine(60, y0, W - 60, y0, c, 4); glowLine(60, y0 + hh, W - 60, y0 + hh, c, 4);
    glowLine(60, y0, 60, y0 + hh, c, 4); glowLine(W - 60, y0, W - 60, y0 + hh, c, 4);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, Math.floor(t * 4) % 2 ? c : WH);
    label('SCORE ' + score, W / 2, H * 0.36, 60, WH);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, MG);
    label(maxStep + 'm', W / 2, H * 0.455, 70, GR);
    label('COMBO ' + maxCombo, W / 2, H * 0.5, 40, YL);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 60, YL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 44, YL);
    if (!won) label('あと' + Math.max(1, totalSteps - climbs) + '段', W / 2, H * 0.21, 60, RED);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 36, WH);
  }

  // ---- ATTRACT: ゴーストの指がひし形の拍ごとに上へ払って登る。食いの型の堅い節で払ってしまいMISSでずり落ちる ----
  var demo = { t: 0, flickT: 0, done: {} };
  var DEMO_LEN = 3 * 8 * E8 + 1.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.flickT = 0; }
    if (demo.flickT > 0) demo.flickT -= dt;
    tickWorld(dt);
    if (!running || hitStop > 0) return;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res || demo.done['n' + i]) continue;
      if (songT >= n.t - 0.008 && songT < n.t + 0.05) { demo.done['n' + i] = true; demo.flickT = 0.16; flickAt(); return; }
      break;
    }
    for (var j = 0; j < rests.length; j++) {
      var r = rests[j];
      if (r.bar === DEMO_FAIL.bar && r.pos === DEMO_FAIL.pos && !demo.done['r' + j] && songT >= r.t - 0.008) {
        demo.done['r' + j] = true; demo.flickT = 0.16; flickAt();
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      var hy = demo.flickT > 0 ? lerp(1580, 1760, demo.flickT / 0.16) : 1760;
      game.draw.hand(560, hy, { press: demo.flickT > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, NAVY);
      glowLine(0, 226, W, 226, MG, 3);
      label(GAME_TITLE, W / 2, 124 + Math.sin(t * 3) * 4, 104, Math.floor(t * 4) % 2 ? MG : CY);
      label('HI-SCORE ' + game.best, W / 2, 202, 34, YL);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.968, 46, YL);
      else label('TAP TO START', W / 2, H * 0.968, 42, CY);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      if (bird.flashT > 0) bird.flashT -= dt;
      if (hitStop > 0) hitStop -= dt;
      else if (bird.flyT > 0) { bird.flyT += dt; }
      else if (bird.slipT < 0) { bird.y += (0 - bird.y) * Math.min(1, dt * 2.5); stepCam(dt); }
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, height: maxStep, climbs: climbs, total: totalSteps, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
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
      game.draw.rect(0, H * 0.42, W, 170, NAVY, 0.9);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 118, 110, YL);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.5, 100, won ? YL : RED);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
