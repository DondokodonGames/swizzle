// K-DS-0012v3-bamboo-grove-lean-cut.js
// 竹林の切り分け — 拍ごとに倒れかかる竹の傾きを見極め、その幹に直角に交わる線を拍の頭で一息に引いて切り分ける。食い(半拍前)で倒れてくる竹が混ざる
// 操作: 三本並んだ竹のうち、葉がざわめいて傾き始めた一本の光る節を横切るように指で線を引く。線は幹にほぼ直角(傾いた竹なら斜め)に引き、竹が薄い倒れ先の線に重なる拍の頭で節を通す。下の竹の切り口の時計(1周=1小節)で、白い刻み=拍の頭、橙の刻み=半拍前の食いが見える。幹に沿った線・早すぎ・遅すぎ・切り残しはMISS(節から遠い空振りは罰なし)
// 終わり: 前奏1小節+4小節(96BPM・約13秒・12本)を切り分ければCLEAR。MISS3回でGAME OVER
// @mechanic: slice
// @theme: bamboo_grove_lean_cut
// 世界観: 竹林の伐採場で、竹細工の若い職人が、倒れかかる竹の傾きを見て竹挽き鋸で切り分け、細工用の竹材を揃えていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・食いの切り分け数・最大コンボ)
// スタイル: HD POST 3D

(function(game) {
  var STYLE = { bg: ['#6a6048', '#1c1810'], main: ['#8a9a5c', '#dccfa8', '#5e4630'], accent: ['#ffc860', '#c8583a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色寄りの低彩度、光源にブルーム(半透明円の重ね)、四辺のビネットでコントラストを潰す
  var C = {
    skyT: STYLE.bg[0], skyB: STYLE.bg[1],
    bamboo: STYLE.main[0], cutFace: STYLE.main[1], soil: STYLE.main[2],
    warm: STYLE.accent[0], red: STYLE.accent[1],
    bambooD: '#4e5a34', bambooL: '#b4c084', far: '#4a4a34', ink: '#14100a', skin: '#e0b48c', cloth: '#5a6a7a', white: '#f4ecd8'
  };

  var GAME_TITLE = 'BAMBOO CUT';
  var BPM = 96;
  var SPB = 60 / BPM;
  var WIN_P = 0.07, WIN_G = 0.15, WIN_M = 0.3;
  var LIVES = 3;
  var LEAD = 1.2;          // 傾き始めから拍の頭まで(拍)。96BPMで0.75秒
  var PERP = 0.5;          // 幹の向きとの内積の許容(=幹に60°以上で交わる線)
  // 切る拍。.5 は次の拍を半拍前に食う竹
  var CUT_BEATS = [4, 5.5, 7, 8, 9.5, 11.5, 13, 14.5, 15.5, 17, 18, 19.5];
  var SONG_END = 20.5;
  var DEMO_CUTS = [[2, 1, 40], [3.5, 0, 50], [5, 2, -46], [6.5, 1, -58]];
  var DEMO_FAIL_B = 6.5;     // ゴーストがここで横一文字に引いてMISSする
  var DEMO_CYCLE = 8 * SPB + 1.4;

  var LANE_X = [250, 540, 830];
  var BASE_Y = 1400;
  var STALK_LEN = 1150;
  var NODE_R = 480, BAND = 150;
  var DIAL = { x: 770, y: 1680, r: 150 };
  var MAN = { x: 250, y: 1680 };

  // 伴奏(自作): 3+3+2 の食うベース、1・3拍の太鼓、2・4拍の竹の拍子、8分の葉擦れ
  var ROOTS = ['A2', 'F2', 'G2', 'E2'];
  var BASS_POS = [1, 0, 0, 1, 0, 0, 0, 1];
  var MELO = ['A4', 0, 0, 'C5', 0, 0, 'D5', 0, 'E5', 0, 0, 'D5', 0, 'C5', 0, 'A4'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var stroke = null;
  var demo = { t: 0, x: 540, y: 1750, press: false, cut: null, gx: 1, gy: 0, px: 0, py: 0 };

  // ── スプライト ─────────────────────────────────────────
  var MAN_A = [
    '...wwwwww...',
    '..wrrrrrrw..',
    '..hsssssss..',
    '..sseesees..',
    '..ssssssss..',
    '...ssmmss...',
    '....ssss....',
    '.cccccccccc.',
    'ccccbccbcccc',
    'cccccccccccs',
    'scccccccccc.',
    '..pppppppp..',
    '..ppp..ppp..',
    '..kk....kk..'
  ];
  var MAN_B = MAN_A.slice();
  MAN_B[0] = '............';
  MAN_B[1] = '...wwwwww...';
  MAN_B[13] = '.kk......kk.';
  var MAN_JOY = MAN_A.slice();
  MAN_JOY[5] = '...smmmms...';
  MAN_JOY[9] = 'scccccccccs.';
  MAN_JOY[10] = '.cccccccccc.';
  var MAN_OOPS = MAN_A.slice();
  MAN_OOPS[3] = '..ssxssxss..';
  MAN_OOPS[5] = '....smms....';
  var MAN_PAL = { w: C.white, r: C.red, h: C.ink, s: C.skin, e: C.ink, x: C.ink, m: '#8a4a3a', c: C.cloth, b: C.warm, p: '#3a3a44', k: C.ink };
  var SAW = [
    'hhh.........',
    'hhhbbbbbbbbb',
    'hhhbbbbbbbbb',
    'hhh.t.t.t.t.'
  ];
  var SAW_PAL = { h: C.soil, b: '#b8b8b0', t: '#8a8a84' };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r, col, a * 0.35);
    game.draw.circle(x, y, r * 0.66, col, a * 0.5);
    game.draw.circle(x, y, r * 0.36, col, a * 0.8);
  }
  function ring(cx, cy, r, col, w) {
    var n = 32;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      game.draw.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, col, w);
    }
  }
  function axisOf(deg) { var a = deg * Math.PI / 180; return { x: Math.sin(a), y: -Math.cos(a) }; }
  function segInter(ax, ay, bx, by, cx, cy, dx, dy) {
    var rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    var den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-6) return null;
    var t = ((cx - ax) * sy - (cy - ay) * sx) / den;
    var u = ((cx - ax) * ry - (cy - ay) * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return t;
  }

  // ── 進行 ───────────────────────────────────────────────
  function buildCuts(isDemo) {
    var cuts = [], i;
    if (isDemo) {
      for (i = 0; i < DEMO_CUTS.length; i++) cuts.push({ b: DEMO_CUTS[i][0], lane: DEMO_CUTS[i][1], lean: DEMO_CUTS[i][2] });
    } else {
      var mags = [38, 44, 50, 56, 60];
      var prevLane = -1, prevB = -9;
      for (i = 0; i < CUT_BEATS.length; i++) {
        var lane = Math.floor(game.random(0, 3)) % 3;
        if (lane === prevLane && CUT_BEATS[i] - prevB < 2.5) lane = (lane + 1 + Math.floor(game.random(0, 2)) % 2) % 3;
        var mag = mags[Math.min(mags.length - 1, Math.floor(i / 3) + Math.floor(game.random(0, 2)))];
        var sign = lane === 0 ? 1 : (lane === 2 ? -1 : (game.random(0, 1) < 0.5 ? -1 : 1));
        cuts.push({ b: CUT_BEATS[i], lane: lane, lean: mag * sign });
        prevLane = lane; prevB = CUT_BEATS[i];
      }
    }
    for (i = 0; i < cuts.length; i++) { cuts[i].st = 'wait'; cuts[i].syn = cuts[i].b % 1 !== 0; cuts[i].fx = 0; cuts[i].rustle = false; cuts[i].cutR = NODE_R; cuts[i].ang = 0; }
    return cuts;
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, cuts: buildCuts(isDemo), bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, synHit: 0, synTot: 0,
      stop: 0, stopCut: null, pulse: 0, oops: 0, joy: 0, saw: null, trail: [],
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MELO.length; i++) notes.push([MELO[i] || 'R', 0.5]);
    for (var b = 0; b < 2; b++) for (var s = 0; s < 8; s++) bass.push([BASS_POS[s] ? ROOTS[b] : 'R', 0.5]);
    game.audio.melody(notes, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: bass });
  }

  function initGame() {
    stroke = null;
    R = newRun(state !== S.PLAYING);
    for (var i = 0; i < R.cuts.length; i++) if (R.cuts[i].syn) R.synTot++;
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function playStep(s) {
    var pos = s % 8, bar = Math.floor(s / 8);
    var root = ROOTS[bar % 4];
    if (BASS_POS[pos]) game.audio.tone(root, SPB * 0.6, { wave: 'triangle', volume: 0.16 });
    if (pos === 0 || pos === 4) game.audio.tone(100, 0.12, { wave: 'sine', volume: 0.17, slide: -60 });
    if (pos === 2 || pos === 6) game.audio.tone(820, 0.05, { wave: 'triangle', volume: 0.08, slide: -300 });
    if (pos % 2 === 1) game.audio.tone(3400, 0.02, { wave: 'square', volume: 0.015 });
    var m = bar >= 1 ? MELO[(bar % 2) * 8 + pos] : 0;
    if (m) game.audio.tone(m, SPB * 0.45, { wave: 'triangle', volume: 0.06, slide: 6 });
  }

  // 竹の今の傾き(度)
  function angleOf(c) {
    if (c.st === 'wait' || c === R.stopCut) {
      var k = (R.bp - (c.b - LEAD)) / LEAD;
      if (k <= 0) return 0;
      if (k <= 1) return c.lean * k * k;
      return c.lean * (1 + (k - 1) * 1.2);
    }
    if (c.st === 'miss') {
      var f = Math.min(1, c.fx / 0.5);
      var s = c.lean > 0 ? 1 : -1;
      return c.ang + (s * 84 - c.ang) * f * f;
    }
    return c.ang;
  }

  function laneCut(lane) {
    var res = null;
    for (var i = 0; i < R.cuts.length; i++) {
      var c = R.cuts[i];
      if (c.lane !== lane) continue;
      if (c === R.stopCut) return c;
      if (c.st === 'wait' && R.bp >= c.b - LEAD) return c;
      if (c.st !== 'wait' && c.fx < 0.9) res = c;
    }
    return res;
  }

  function laneAngle(lane) {
    var c = laneCut(lane);
    if (c && (c.st === 'wait' || c === R.stopCut)) return angleOf(c);
    return 0;
  }

  // 一線の判定(節を横切った拍の位置と、線と幹の交わり角)
  function judgeCross(lane, bpAt, ux, uy) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var best = null, bd = 99;
    for (var i = 0; i < R.cuts.length; i++) {
      var c = R.cuts[i];
      if (c.st !== 'wait' || c.lane !== lane) continue;
      var d = (bpAt - c.b) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = c; }
    }
    if (!best || Math.abs(bd) > WIN_M) return 'air';
    var ax = axisOf(best.lean);
    best.ang = angleOf(best);
    if (Math.abs(ux * ax.x + uy * ax.y) > PERP) { missCut(best); return 'miss'; }
    if (Math.abs(bd) > WIN_G) { missCut(best); return 'miss'; }
    best.st = 'cut'; best.fx = 0;
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (best.syn) R.synHit++;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + (best.syn ? 30 : 0); R.joy = 0.5; }
    else { R.good++; R.score += 50 + R.combo * 5 + (best.syn ? 15 : 0); }
    var a = axisOf(best.ang);
    var px = LANE_X[lane] + a.x * best.cutR, py = BASE_Y + a.y * best.cutR;
    R.saw = { x: px, y: py, t: 0, flip: ux < 0 };
    game.feedback.good(px, py - 90, { text: grade, color: grade === 'PERFECT' ? C.warm : C.white, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.burst(px, py, { color: best.syn ? C.warm : C.bambooL, count: 14, speed: 380 });
    var up = Math.pow(2, Math.min(R.combo, 12) / 12);
    game.audio.tone(1400 * up, 0.04, { wave: 'square', volume: 0.05 });
    game.audio.tone(900 * up, 0.09, { wave: 'triangle', volume: 0.07, slide: -250 });
    if (!R.demo && R.combo % 4 === 0) {
      game.fx.popup('x' + R.combo, 540, 520, { color: C.warm, size: 96 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missCut(c) {
    c.ang = angleOf(c);
    c.st = 'miss'; c.fx = 0;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopCut = c; R.oops = 1.2;
    game.audio.tone(98, 0.32, { wave: 'sawtooth', volume: 0.1, slide: -30 });
  }

  function releaseStop() {
    var c = R.stopCut;
    R.stopCut = null;
    var a = axisOf(c.ang);
    game.feedback.bad(LANE_X[c.lane] + a.x * NODE_R, BASE_Y + a.y * NODE_R - 90, { text: 'MISS' });
    game.fx.burst(LANE_X[c.lane] + (c.lean > 0 ? 300 : -300), BASE_Y - 20, { color: C.soil, count: 14, speed: 260 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    stroke = null;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.joy = 3;
      for (var i = 0; i < 5; i++) game.fx.burst(140 + i * 200, 600 + (i % 2) * 360, { color: [C.warm, C.bambooL, C.white, C.warm, C.bambooL][i], count: 22, speed: 540 });
      game.fx.flash(C.warm, 0.18);
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 560, { color: C.warm, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  // ── 指の線 ─────────────────────────────────────────────
  function strokeStart(x, y) {
    stroke = { sx: x, sy: y, lx: x, ly: y, crossed: [false, false, false], pend: [], scrape: 0 };
    R.trail.push({ x: x, y: y, t: 0 });
  }
  function flushPend(minLen) {
    var res = '';
    var dx = stroke.lx - stroke.sx, dy = stroke.ly - stroke.sy, len = Math.sqrt(dx * dx + dy * dy);
    if (len < minLen) return '';
    for (var i = 0; i < stroke.pend.length; i++) {
      var r = judgeCross(stroke.pend[i].lane, stroke.pend[i].bp, dx / len, dy / len);
      if (r !== 'air' || !res) res = r;
    }
    stroke.pend = [];
    return res;
  }
  function strokeMove(x, y) {
    if (!stroke) return '';
    stroke.scrape += Math.abs(x - stroke.lx) + Math.abs(y - stroke.ly);
    var steps = Math.max(1, Math.floor(Math.max(Math.abs(x - stroke.lx), Math.abs(y - stroke.ly)) / 24));
    for (var s = 1; s <= steps; s++) R.trail.push({ x: stroke.lx + (x - stroke.lx) * s / steps, y: stroke.ly + (y - stroke.ly) * s / steps, t: 0 });
    for (var L = 0; L < 3; L++) {
      if (stroke.crossed[L]) continue;
      var a = axisOf(laneAngle(L));
      var bx = LANE_X[L], tx = bx + a.x * STALK_LEN, ty = BASE_Y + a.y * STALK_LEN;
      var t = segInter(bx, BASE_Y, tx, ty, stroke.lx, stroke.ly, x, y);
      if (t !== null && Math.abs(t * STALK_LEN - NODE_R) <= BAND) {
        stroke.crossed[L] = true;
        stroke.pend.push({ lane: L, bp: R.bp });
        var c = laneCut(L);
        if (c && c.st === 'wait') c.cutR = t * STALK_LEN;
      }
    }
    stroke.lx = x; stroke.ly = y;
    return stroke.pend.length ? flushPend(110) : '';
  }
  function strokeEnd(x, y) {
    if (!stroke) return '';
    var res = strokeMove(x, y);
    if (stroke && stroke.pend.length) res = flushPend(40) || 'air';
    stroke = null;
    return res;
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.2);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    if (R.saw) { R.saw.t += dt; if (R.saw.t > 0.3) R.saw = null; }
    for (var q = R.trail.length - 1; q >= 0; q--) { R.trail[q].t += dt; if (R.trail[q].t > 0.3) R.trail.splice(q, 1); }
    for (var f = 0; f < R.cuts.length; f++) if (R.cuts[f].st !== 'wait' && R.cuts[f] !== R.stopCut) R.cuts[f].fx += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('E5', 0.08, { wave: 'triangle', volume: 0.1 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.cuts.length; i++) {
      var c = R.cuts[i];
      if (c.st !== 'wait') continue;
      if (!c.rustle && R.bp >= c.b - LEAD) {
        c.rustle = true;
        game.audio.tone(c.syn ? 330 : 240, 0.12, { wave: 'sawtooth', volume: R.demo ? 0.025 : 0.05, slide: c.syn ? 120 : 60 });
        game.fx.burst(LANE_X[c.lane], 360, { color: C.bambooL, count: 8, speed: 160 });
      }
      if ((R.bp - c.b) * SPB > WIN_G && !(stroke && stroke.pend.length)) { missCut(c); return; }
    }
    if (!R.demo && R.bp >= SONG_END + 0.3) endRun(true);
  }

  // ATTRACT: ゴーストが実ロジックで切る(幹に直角の線で3本 → 4本目は傾きの深い竹に横一文字を引いてMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); stroke = null; demo.cut = null; }
    var SP = 820, k;
    if (demo.cut) {
      k = (R.bp - demo.cut.b) * SP;
      demo.x = demo.px + demo.gx * k; demo.y = demo.py + demo.gy * k;
      demo.press = true;
      if (R.stop > 0) return;
      if (k < 250) strokeMove(demo.x, demo.y);
      else { strokeEnd(demo.x, demo.y); demo.cut = null; }
      return;
    }
    demo.press = false;
    var c = null;
    for (var i = 0; i < R.cuts.length; i++) if (R.cuts[i].st === 'wait') { c = R.cuts[i]; break; }
    var tx = 540, ty = 1750;
    if (c && R.stop <= 0) {
      var a = axisOf(c.lean);
      var px = LANE_X[c.lane] + a.x * NODE_R, py = BASE_Y + a.y * NODE_R;
      var gx = -a.y, gy = a.x;
      if (gx < 0) { gx = -gx; gy = -gy; }
      if (c.b === DEMO_FAIL_B) { gx = 1; gy = 0; }
      k = (R.bp - c.b) * SP;
      if (k >= -250) {
        demo.cut = c; demo.gx = gx; demo.gy = gy; demo.px = px; demo.py = py;
        demo.x = px + gx * k; demo.y = py + gy * k;
        strokeStart(demo.x, demo.y);
        demo.press = true;
        return;
      }
      if (R.bp > c.b - LEAD - 0.6) { tx = px - gx * 250; ty = py - gy * 250; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 8);
    demo.y += (ty - demo.y) * Math.min(1, dt * 8);
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.skyT], [0.7, '#3a3424'], [0.73, C.soil], [1, C.skyB]]);
    // 遠景の竹(霞んだ低コントラスト)
    for (var i = 0; i < 14; i++) {
      var x = 30 + i * 78 + (i % 3) * 14;
      var sway = Math.sin(e * 0.8 + i) * 6;
      game.draw.line(x, 1380, x + sway, 0, C.far, 18 + (i % 2) * 8);
      for (var n = 0; n < 7; n++) game.draw.rect(x - 14 + sway * (1 - n / 7), 1300 - n * 190, 28, 6, C.skyB, 0.35);
    }
    // 差し込む光の筋 + ブルーム
    for (var s = 0; s < 3; s++) game.draw.line(820 + s * 90, 0, 380 + s * 140, 1400, C.warm, 60 - s * 14);
    game.draw.rect(0, 0, W, 1400, C.skyT, 0.55);
    bloom(900, 140, 300 + R.pulse * 30, C.warm, 0.5);
    // 地面と落ち葉
    game.draw.rect(0, BASE_Y - 10, W, 30, C.ink, 0.35);
    for (var l = 0; l < 26; l++) game.draw.rect((l * 137) % W, BASE_Y + 20 + (l * 53) % 480, 22, 8, l % 3 ? '#7a6a3a' : '#8a7444', 0.6);
  }

  function drawStalkSeg(bx, by, deg, r0, r1, col, wid, alpha) {
    var a = axisOf(deg);
    var x0 = bx + a.x * r0, y0 = by + a.y * r0, x1 = bx + a.x * r1, y1 = by + a.y * r1;
    var nx = -a.y, ny = a.x;
    game.draw.line(x0, y0, x1, y1, C.bambooD, wid + 16);
    game.draw.line(x0, y0, x1, y1, col, wid);
    game.draw.line(x0 - nx * wid * 0.22, y0 - ny * wid * 0.22, x1 - nx * wid * 0.22, y1 - ny * wid * 0.22, C.bambooL, wid * 0.2);
    for (var r = 160; r < r1; r += 160) {
      if (r <= r0) continue;
      var px = bx + a.x * r, py = by + a.y * r;
      game.draw.line(px - nx * (wid * 0.6 + 6), py - ny * (wid * 0.6 + 6), px + nx * (wid * 0.6 + 6), py + ny * (wid * 0.6 + 6), C.bambooD, 10);
    }
    if (alpha < 1) game.draw.line(x0, y0, x1, y1, C.skyT, wid + 18);
  }

  function drawLane(L) {
    var e = game.time.elapsed;
    var bx = LANE_X[L];
    var c = laneCut(L);
    var hl = c && c === R.stopCut;
    var fl = hl && Math.floor(e * 20) % 2 === 0;
    var wid = hl ? 82 : 64;
    if (!c) {
      var sway = Math.sin(e * 1.3 + L * 2) * 1.5;
      drawStalkSeg(bx, BASE_Y, sway, 0, STALK_LEN, C.bamboo, wid, 1);
      return;
    }
    if (c.st === 'wait' || hl) {
      var deg = angleOf(c);
      // 倒れ先の線(薄い予告)
      var ta = axisOf(c.lean);
      for (var r = 60; r < STALK_LEN; r += 70) game.draw.circle(bx + ta.x * r, BASE_Y + ta.y * r, 12, c.syn ? C.warm : C.white, 0.35 + R.pulse * 0.2);
      drawStalkSeg(bx, BASE_Y, deg, 0, STALK_LEN, fl ? C.white : C.bamboo, wid, 1);
      // 光る節(切り口の帯)
      var a = axisOf(deg), nx = -a.y, ny = a.x;
      var px = bx + a.x * NODE_R, py = BASE_Y + a.y * NODE_R;
      bloom(px, py, 120, c.syn ? C.warm : C.white, 0.35 + R.pulse * 0.25);
      game.draw.line(px - nx * 70, py - ny * 70, px + nx * 70, py + ny * 70, c.syn ? C.warm : C.white, 14);
      // 葉のざわめき
      var tipx = bx + a.x * STALK_LEN, tipy = BASE_Y + a.y * STALK_LEN;
      for (var k = 0; k < 5; k++) game.draw.circle(tipx + Math.sin(e * 30 + k) * 50, tipy + k * 40 + 60, 30, C.bambooL, 0.6);
      return;
    }
    if (c.st === 'cut') {
      var f = c.fx;
      if (f < 0.75) {
        drawStalkSeg(bx, BASE_Y, c.ang, 0, c.cutR, C.bamboo, wid, 1);
        var a2 = axisOf(c.ang);
        var cx = bx + a2.x * c.cutR, cy = BASE_Y + a2.y * c.cutR;
        game.draw.circle(cx, cy, 34, C.cutFace);
        game.draw.circle(cx, cy, 20, C.warm, 0.5);
        var s = c.lean > 0 ? 1 : -1;
        var fall = c.ang + s * f * 140;
        var drop = f * f * 1600;
        var al = Math.max(0, 1 - f / 0.75);
        var fa = axisOf(fall);
        var fx0 = cx + s * f * 240, fy0 = cy + drop;
        game.draw.line(fx0, fy0, fx0 + fa.x * (STALK_LEN - c.cutR), fy0 + fa.y * (STALK_LEN - c.cutR), C.bambooD, wid + 16);
        game.draw.line(fx0, fy0, fx0 + fa.x * (STALK_LEN - c.cutR), fy0 + fa.y * (STALK_LEN - c.cutR), C.bamboo, wid);
        if (al < 1) game.draw.line(fx0, fy0, fx0 + fa.x * (STALK_LEN - c.cutR), fy0 + fa.y * (STALK_LEN - c.cutR), C.skyT, wid * (1 - al));
      } else {
        var g = Math.min(1, (f - 0.75) / 0.15);
        drawStalkSeg(bx, BASE_Y, 0, 0, STALK_LEN * g, C.bamboo, wid, 1);
      }
      return;
    }
    // MISS: 倒れて土埃
    var dg = angleOf(c);
    if (c.fx < 0.75) drawStalkSeg(bx, BASE_Y, dg, 0, STALK_LEN, C.bamboo, wid, 1);
    else {
      var g2 = Math.min(1, (c.fx - 0.75) / 0.15);
      drawStalkSeg(bx, BASE_Y, 0, 0, STALK_LEN * g2, C.bamboo, wid, 1);
    }
  }

  function drawTrail() {
    for (var i = 1; i < R.trail.length; i++) {
      var p = R.trail[i - 1], q = R.trail[i];
      if (Math.abs(p.x - q.x) > 60 || Math.abs(p.y - q.y) > 60) continue;
      var a = 1 - q.t / 0.3;
      game.draw.line(p.x, p.y, q.x, q.y, C.white, 14 * a + 2);
    }
    if (R.saw) game.draw.sprite(SAW, SAW_PAL, R.saw.x + (R.saw.flip ? -1 : 1) * R.saw.t * 300, R.saw.y, 12, { anchor: 'center', flipX: R.saw.flip });
  }

  function drawDial() {
    var bp = Math.max(0, R.bp);
    var bar = Math.floor(bp / 4), pos = bp - bar * 4;
    // 竹の切り口の時計: 1周=1小節、8刻み
    bloom(DIAL.x, DIAL.y, DIAL.r + 40, C.warm, 0.15 + R.pulse * 0.2);
    game.draw.circle(DIAL.x, DIAL.y, DIAL.r + 16, C.bambooD);
    game.draw.circle(DIAL.x, DIAL.y, DIAL.r, C.cutFace);
    game.draw.circle(DIAL.x, DIAL.y, DIAL.r * 0.45, C.soil, 0.7);
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      var big = i % 2 === 0;
      game.draw.line(DIAL.x + Math.cos(a) * DIAL.r * (big ? 0.7 : 0.82), DIAL.y + Math.sin(a) * DIAL.r * (big ? 0.7 : 0.82), DIAL.x + Math.cos(a) * DIAL.r, DIAL.y + Math.sin(a) * DIAL.r, C.ink, big ? 12 : 6);
    }
    for (var k = 0; k < R.cuts.length; k++) {
      var c = R.cuts[k];
      if (c.b < bar * 4 || c.b >= bar * 4 + 4) continue;
      var ca = ((c.b - bar * 4) / 4) * Math.PI * 2 - Math.PI / 2;
      var col = c.st === 'cut' ? C.bamboo : (c.st === 'miss' ? C.ink : (c.syn ? C.warm : C.white));
      game.draw.circle(DIAL.x + Math.cos(ca) * (DIAL.r + 34), DIAL.y + Math.sin(ca) * (DIAL.r + 34), 24, C.ink);
      game.draw.circle(DIAL.x + Math.cos(ca) * (DIAL.r + 34), DIAL.y + Math.sin(ca) * (DIAL.r + 34), 18, col);
      if (c.syn && c.st === 'wait') game.draw.circle(DIAL.x + Math.cos(ca) * (DIAL.r + 34), DIAL.y + Math.sin(ca) * (DIAL.r + 34), 8, C.red);
    }
    var ha = (pos / 4) * Math.PI * 2 - Math.PI / 2;
    game.draw.line(DIAL.x, DIAL.y, DIAL.x + Math.cos(ha) * DIAL.r * 0.95, DIAL.y + Math.sin(ha) * DIAL.r * 0.95, C.red, 12);
    game.draw.circle(DIAL.x, DIAL.y, 16 + R.pulse * 10, C.warm);
  }

  function drawMan() {
    var e = game.time.elapsed;
    for (var i = -3; i <= 3; i++) game.draw.rect(MAN.x - 120 * Math.sqrt(1 - (i / 4) * (i / 4)), MAN.y + 140 + i * 6, 240 * Math.sqrt(1 - (i / 4) * (i / 4)), 6, '#000000', 0.25);
    var frame = R.oops > 0 ? MAN_OOPS : (R.joy > 0 ? MAN_JOY : (Math.floor(Math.max(0, R.bp)) % 2 === 0 ? MAN_A : MAN_B));
    var bob = Math.round((-R.pulse * 8 + Math.sin(e * 2.6) * 3) / 4) * 4;
    game.draw.sprite(frame, MAN_PAL, MAN.x, MAN.y + bob, 20, { anchor: 'center' });
    game.draw.sprite(SAW, SAW_PAL, MAN.x + 150, MAN.y + 40 + bob, 10, { anchor: 'center' });
  }

  function drawVignette() {
    for (var i = 0; i < 4; i++) {
      var s = 40 + i * 40;
      game.draw.rect(0, 0, s, H, '#000000', 0.12);
      game.draw.rect(W - s, 0, s, H, '#000000', 0.12);
      game.draw.rect(0, 0, W, s * 0.8, '#000000', 0.1);
      game.draw.rect(0, H - s, W, s, '#000000', 0.12);
    }
    game.draw.rect(0, 0, W, H, '#6a5a3a', 0.08);
  }

  function drawWorld() {
    drawBg();
    for (var L = 0; L < 3; L++) drawLane(L);
    drawTrail();
    drawDial();
    drawMan();
    drawVignette();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.6);
    txt('SCORE ' + R.score, 50, 74, 48, C.white, 'left');
    txt('BEST ' + game.best, W - 50, 74, 34, C.warm, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.rect(W - 120 - i * 80, 130, 34, 64, on ? C.bamboo : '#3a3a2a');
      game.draw.rect(W - 120 - i * 80, 150, 34, 6, C.bambooD);
      game.draw.circle(W - 103 - i * 80, 130, 17, on ? C.cutFace : '#3a3a2a');
    }
    if (R.combo >= 2) txt('x' + R.combo, 50, 158, 54, C.warm, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / SONG_END));
    game.draw.rect(50, 208, W - 100, 12, '#3a3424');
    game.draw.rect(50, 208, (W - 100) * progress, 12, C.bamboo);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 900, 120, C.warm);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.25, W, H * 0.32, C.ink, 0.86);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, R.ok ? C.warm : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.37, 62, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.42, 34, C.warm);
    txt('x' + R.maxCombo + '   ' + R.synHit + '/' + R.synTot, W / 2, H * 0.46, 40, C.bambooL);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.51, 54, C.warm);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.51, 42, C.white);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.cuts.length; i++) if (R.cuts[i].st === 'wait') left++;
      txt('あと' + left + '本', W / 2, H * 0.55, 48, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.round(Math.sin(e * 2.2) * 2) * 4;
    game.draw.rect(0, 0, W, 232, C.ink, 0.6);
    bloom(W / 2, 100, 260, C.warm, 0.25);
    game.draw.text(GAME_TITLE, W / 2 + 6, 108 + bob, { size: 108, color: C.bambooD, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 100 + bob, { size: 108, color: C.cutFace, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 200, 40, C.warm);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.warm);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R || R.over) return;
    strokeStart(x, y);
    game.audio.tone(1100, 0.03, { wave: 'square', volume: 0.035 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || R.over || !stroke) return;
    var res = strokeMove(x, y);
    if (res === 'air') {
      game.fx.burst(x, y, { color: C.bambooL, count: 5, speed: 120 });
      game.audio.tone(520, 0.05, { wave: 'triangle', volume: 0.06, slide: -200 });
    } else if (stroke && stroke.scrape >= 150) {
      stroke.scrape = 0;
      game.audio.tone(2400 + Math.floor(game.random(0, 500)), 0.02, { wave: 'square', volume: 0.012 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || R.over || !stroke) return;
    var res = strokeEnd(x, y);
    if (res === 'air' || res === '') {
      game.fx.burst(x, y, { color: C.white, count: 4, speed: 100 });
      game.audio.tone(res === 'air' ? 520 : 700, 0.04, { wave: 'triangle', volume: 0.05, slide: -200 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      stepRun(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, synHit: R.synHit, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
