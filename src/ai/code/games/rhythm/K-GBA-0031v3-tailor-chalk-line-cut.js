// K-GBA-0031v3-tailor-chalk-line-cut.js
// 型紙の一裁ち — 拍ごとに向きが変わるチョーク線の矢印どおりに、布の真ん中の合印を拍の頭でなぞり抜けて一息に裁つ。食いの拍(半拍前)で裁つ線が混ざる
// 操作: 布の上に出るチョークの点線と矢印の向きへ、指で一本の線を引く。線が布の中央の合印(縮む輪の中心)を通り抜ける瞬間を、輪が閉じる拍に合わせる。白い線は拍の頭、金の線(赤い輪)は半拍前の食い。上の巻尺に流れてくる札と、下の8分の升目でも食いの位置が見える。向き違い・早すぎ・遅すぎ・裁ち残しはMISS(合印から遠い時の空振りは罰なし)
// 終わり: 前奏1小節+5小節(100BPM・約14秒・13本)を裁ち切ればCLEAR。MISS3回でGAME OVER
// @mechanic: slice
// @theme: tailor_chalk_line_cut
// 世界観: 仕立て屋の裁断台で、裁ち職人が型紙のチョーク線の合図に合わせ、裁ち鋏で布を一息に裁っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・食いの裁ち成功数・最大コンボ)
// スタイル: 8bit HOME

(function(game) {
  var STYLE = { bg: ['#00a844', '#005800'], main: ['#d82800', '#fcfcfc', '#00a844'], accent: ['#f8b800', '#000000'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 緑・赤・白・金+黒だけ。16px角の粗いドット、カッティングマットの升目をタイル反復、巻尺は一方向スクロール
  var C = {
    mat: STYLE.bg[0], matD: STYLE.bg[1],
    red: STYLE.main[0], cream: STYLE.main[1], green: STYLE.main[2],
    gold: STYLE.accent[0], blk: STYLE.accent[1],
    skin: '#fca044', wood: '#ac7c00'
  };
  var FABRICS = [
    { base: C.red, band: '#a01800' },
    { base: C.cream, band: C.red },
    { base: C.gold, band: C.red }
  ];

  var GAME_TITLE = 'CHALK SNIP';
  var BPM = 100;
  var SPB = 60 / BPM;
  var WIN_P = 0.07, WIN_G = 0.15, WIN_M = 0.3;
  var LIVES = 3;
  // 裁つ拍。.5 は次の拍を半拍前に食う裁ち
  var CUT_BEATS = [4, 6, 7.5, 10, 12, 13.5, 15, 16, 17.5, 19, 20, 21.5, 23];
  var SONG_END = 24;
  var DEMO_CUTS = [[2, 0], [3.5, 2], [5, 4], [6.5, 3]];
  var DEMO_FAIL_B = 6.5, DEMO_FAIL_D = 2;
  var DEMO_CYCLE = 8 * SPB + 1.3;

  var CX = 540, CY = 1100;
  var HALF = 260;
  var NOTCH_R = 150;
  var LANE_Y = 300, LANE_X = 200, LANE_PX = 200;
  var R2 = 0.7071;
  var DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: R2, y: R2 }, { x: -R2, y: R2 }];

  // 伴奏(自作): 3+3+2 の食うベース、1・3拍のキック、2・4拍のスネア
  var BASS_PAT = [1, 0, 0, 1, 0, 0, 1, 0];
  var ROOTS = ['C3', 'A2', 'F2', 'G2'];
  var LEAD = ['E5', 0, 0, 'G5', 0, 0, 'A5', 0, 'G5', 0, 'E5', 0, 0, 'D5', 0, 'C5'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var stroke = null;
  var demo = { t: 0, x: 540, y: 1700, press: false, cut: null, gd: 0 };

  // ── スプライト ─────────────────────────────────────────
  var TAILOR_A = [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..sggssggs..',
    '..ssssssss..',
    '...ssrrss...',
    '....ssss....',
    '.vvtvvvvtvv.',
    'vvvtvvvvtvvv',
    'vvvtvwwvtvvv',
    'vvvtvwwvtvvv',
    'ss.tvvvvt.ss',
    '...vvvvvv...',
    '...vv..vv...'
  ];
  var TAILOR_B = TAILOR_A.slice();
  TAILOR_B[0] = '............';
  TAILOR_B[1] = '...hhhhhh...';
  TAILOR_B[11] = '.s.tvvvvt.s.';
  var TAILOR_JOY = TAILOR_A.slice();
  TAILOR_JOY[5] = '...srrrrs...';
  TAILOR_JOY[7] = 'svvtvvvvtvvs';
  TAILOR_JOY[11] = '...tvvvvt...';
  var TAILOR_OOPS = TAILOR_A.slice();
  TAILOR_OOPS[3] = '..sxgssxgs..';
  TAILOR_OOPS[5] = '....srrs....';
  TAILOR_OOPS[2] = '..hssssssh.w';
  var TAILOR_PAL = { h: C.blk, s: C.skin, g: C.blk, x: C.cream, r: C.red, v: C.green, t: C.gold, w: C.cream };
  // 裁ち鋏(右向き)。指穴2つと長い刃
  var SHEARS = [
    '.rrr........',
    'r...r.......',
    'r...rcccccc.',
    '.rrrbccccccc',
    'r...rcccccc.',
    'r...r.......',
    '.rrr........'
  ];
  var SHEARS_PAL = { r: C.red, c: C.cream, b: C.blk };
  function transpose(art) {
    var out = [];
    for (var x = 0; x < art[0].length; x++) {
      var row = '';
      for (var y = 0; y < art.length; y++) row += art[y].charAt(x);
      out.push(row);
    }
    return out;
  }
  var SHEARS_V = transpose(SHEARS);
  var SPOOL = ['wwwwww', '.tttt.', '.tttt.', '.tttt.', 'wwwwww'];
  var SPOOL_PAL = { w: C.wood, t: C.red };
  var PIN = ['..gg..', '.rrrr.', 'rrrrrr', 'rrrrrr', '.rrrr.'];
  var PIN_PAL = { g: C.gold, r: C.red };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.blk, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  // 16px角の点で描く輪(8bitの粗さ)
  function ring8(cx, cy, r, col, sz) {
    var n = Math.max(12, Math.floor(r / 9));
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      game.draw.rect(Math.round((cx + Math.cos(a) * r) / 8) * 8 - sz / 2, Math.round((cy + Math.sin(a) * r) / 8) * 8 - sz / 2, sz, sz, col);
    }
  }
  function arrow(cx, cy, d, len, col, w) {
    var v = DIRS[d], nx = -v.y, ny = v.x;
    var tx = cx + v.x * len / 2, ty = cy + v.y * len / 2;
    game.draw.line(cx - v.x * len / 2, cy - v.y * len / 2, tx, ty, col, w);
    game.draw.line(tx, ty, tx - v.x * len * 0.35 + nx * len * 0.28, ty - v.y * len * 0.35 + ny * len * 0.28, col, w);
    game.draw.line(tx, ty, tx - v.x * len * 0.35 - nx * len * 0.28, ty - v.y * len * 0.35 - ny * len * 0.28, col, w);
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    var inside = t >= 0 && t <= 1;
    t = Math.max(0, Math.min(1, t));
    var qx = ax + dx * t - px, qy = ay + dy * t - py;
    return { d: Math.sqrt(qx * qx + qy * qy), inside: inside };
  }

  // ── 進行 ───────────────────────────────────────────────
  function buildCuts(isDemo) {
    var cuts = [], i;
    if (isDemo) {
      for (i = 0; i < DEMO_CUTS.length; i++) cuts.push({ b: DEMO_CUTS[i][0], d: DEMO_CUTS[i][1] });
    } else {
      var prev = -1;
      for (i = 0; i < CUT_BEATS.length; i++) {
        var pool = i < 4 ? 4 : 6;
        var d = Math.floor(game.random(0, pool)) % pool;
        if (d === prev) d = (d + 1 + Math.floor(game.random(0, pool - 1))) % pool;
        prev = d;
        cuts.push({ b: CUT_BEATS[i], d: d });
      }
    }
    for (i = 0; i < cuts.length; i++) { cuts[i].st = 'wait'; cuts[i].syn = cuts[i].b % 1 !== 0; cuts[i].ghost = 0; }
    return cuts;
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, cuts: buildCuts(isDemo), bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, synHit: 0,
      stop: 0, stopCut: null, pulse: 0, oops: 0, joy: 0,
      fabric: 0, cutFx: null, drop: 0, trail: [],
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEAD.length; i++) notes.push([LEAD[i] || 'R', 0.5]);
    for (var b = 0; b < 2; b++) {
      for (var s = 0; s < 8; s++) bass.push([BASS_PAT[s] ? ROOTS[b] : 'R', 0.5]);
    }
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.035, loop: true, bass: bass, bassVolume: 0.08 });
  }

  function initGame() {
    stroke = null;
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function playStep(s) {
    var pos = s % 8, bar = Math.floor(s / 8);
    var root = ROOTS[bar % 4];
    if (BASS_PAT[pos]) game.audio.tone(root, SPB * 0.7, { wave: 'triangle', volume: 0.15 });
    if (pos === 0 || pos === 4) game.audio.tone(140, 0.09, { wave: 'sine', volume: 0.16, slide: -90 });
    if (pos === 2 || pos === 6) game.audio.tone(1500, 0.06, { wave: 'square', volume: 0.045, slide: -1100 });
    if (pos % 2 === 1) game.audio.tone(3000, 0.02, { wave: 'square', volume: 0.02 });
    var m = bar >= 1 ? LEAD[(bar % 2) * 8 + pos] : 0;
    if (m) game.audio.tone(m, SPB * 0.42, { wave: 'square', volume: 0.045 });
  }

  function currentCut() {
    if (R.stop > 0 && R.stopCut) return R.stopCut;
    for (var i = 0; i < R.cuts.length; i++) if (R.cuts[i].st === 'wait') return R.cuts[i];
    return null;
  }

  // 一線の判定(合印を通り抜けた拍の位置と、線の向き)
  function judgeStroke(bpAt, ux, uy) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var best = null, bd = 99;
    for (var i = 0; i < R.cuts.length; i++) {
      var c = R.cuts[i];
      if (c.st !== 'wait') continue;
      var d = (bpAt - c.b) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = c; }
    }
    if (!best || Math.abs(bd) > WIN_M) return 'air';
    var v = DIRS[best.d];
    if (ux * v.x + uy * v.y < 0.8) { missCut(best); return 'miss'; }
    if (Math.abs(bd) > WIN_G) { missCut(best); return 'miss'; }
    best.st = 'cut';
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (best.syn) R.synHit++;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + (best.syn ? 30 : 0); R.joy = 0.5; }
    else { R.good++; R.score += 50 + R.combo * 5 + (best.syn ? 15 : 0); }
    R.cutFx = { d: best.d, t: 0, fi: R.fabric };
    R.fabric = (R.fabric + 1) % FABRICS.length;
    R.drop = 1;
    game.feedback.good(CX, CY - 380, { text: grade, color: grade === 'PERFECT' ? C.gold : C.cream, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.burst(CX, CY, { color: best.syn ? C.gold : C.cream, count: 12, speed: 380 });
    var up = Math.pow(2, Math.min(R.combo, 12) / 12);
    game.audio.tone(1800 * up, 0.04, { wave: 'square', volume: 0.06 });
    game.audio.tone(1300 * up, 0.06, { wave: 'square', volume: 0.05, slide: -300 });
    if (!R.demo && R.combo % 4 === 0) {
      game.fx.popup('x' + R.combo, CX, CY - 470, { color: C.gold, size: 96 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missCut(c) {
    c.st = 'miss';
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopCut = c; R.oops = 1.2;
    game.audio.tone(110, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -40 });
  }

  function releaseStop() {
    R.stopCut = null;
    game.feedback.bad(CX, CY - 380, { text: 'MISS' });
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
      for (var i = 0; i < 4; i++) game.fx.burst(CX - 270 + i * 180, CY - 200 + (i % 2) * 300, { color: [C.gold, C.cream, C.red, C.gold][i], count: 20, speed: 520 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 560, { color: C.gold, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  // ── 指の線 ─────────────────────────────────────────────
  function strokeStart(x, y) {
    stroke = { sx: x, sy: y, lx: x, ly: y, passed: false, passBp: 0, used: false, scrape: 0 };
    R.trail.push({ x: x, y: y, t: 0 });
  }
  function strokeMove(x, y) {
    if (!stroke) return '';
    var res = '';
    stroke.scrape += Math.abs(x - stroke.lx) + Math.abs(y - stroke.ly);
    var steps = Math.max(1, Math.floor(Math.max(Math.abs(x - stroke.lx), Math.abs(y - stroke.ly)) / 24));
    for (var i = 1; i <= steps; i++) R.trail.push({ x: stroke.lx + (x - stroke.lx) * i / steps, y: stroke.ly + (y - stroke.ly) * i / steps, t: 0 });
    if (!stroke.used) {
      var sd = segDist(CX, CY, stroke.lx, stroke.ly, x, y);
      if (!stroke.passed && sd.d <= NOTCH_R && sd.inside) { stroke.passed = true; stroke.passBp = R.bp; }
      var dx = x - stroke.sx, dy = y - stroke.sy, len = Math.sqrt(dx * dx + dy * dy);
      if (stroke.passed && len >= 150) { stroke.used = true; res = judgeStroke(stroke.passBp, dx / len, dy / len); }
    }
    stroke.lx = x; stroke.ly = y;
    return res;
  }
  function strokeEnd(x, y) {
    if (!stroke) return '';
    var res = strokeMove(x, y);
    if (stroke && !stroke.used) {
      var dx = x - stroke.sx, dy = y - stroke.sy, len = Math.sqrt(dx * dx + dy * dy);
      var near = Math.sqrt((x - CX) * (x - CX) + (y - CY) * (y - CY)) <= NOTCH_R;
      if (len >= 80 && (stroke.passed || near)) {
        stroke.used = true;
        res = judgeStroke(stroke.passed ? stroke.passBp : R.bp, dx / len, dy / len);
      }
    }
    stroke = null;
    return res;
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    R.drop = Math.max(0, R.drop - dt * 5);
    if (R.cutFx) { R.cutFx.t += dt; if (R.cutFx.t > 0.4) R.cutFx = null; }
    for (var q = R.trail.length - 1; q >= 0; q--) { R.trail[q].t += dt; if (R.trail[q].t > 0.28) R.trail.splice(q, 1); }
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('G5', 0.08, { wave: 'square', volume: 0.08 });
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
      if (c.st === 'wait' && (R.bp - c.b) * SPB > WIN_G && !(stroke && stroke.passed && !stroke.used)) { missCut(c); return; }
    }
    if (!R.demo && R.bp >= SONG_END + 0.4) endRun(true);
  }

  // ATTRACT: ゴーストが実ロジックで裁つ(右・下(食い)・右下は正しく、最後は上向きの線を下へ引いてMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); stroke = null; demo.cut = null; }
    var v, k;
    if (demo.cut) {
      // 引いている途中の一線(判定が出ても指は線の終わりまで抜ける)
      v = DIRS[demo.gd];
      k = Math.min(1, (R.bp - demo.cut.b) / 0.45);
      demo.x = CX + v.x * k * 300; demo.y = CY + v.y * k * 300;
      demo.press = true;
      if (R.stop > 0) return;
      if (k < 1) strokeMove(demo.x, demo.y);
      else { strokeEnd(demo.x, demo.y); demo.cut = null; }
      return;
    }
    demo.press = false;
    var c = null;
    for (var i = 0; i < R.cuts.length; i++) if (R.cuts[i].st === 'wait') { c = R.cuts[i]; break; }
    var tx = 540, ty = 1700;
    if (c && R.stop <= 0) {
      var gd = c.b === DEMO_FAIL_B ? DEMO_FAIL_D : c.d;
      v = DIRS[gd];
      k = (R.bp - c.b) / 0.45;
      if (k >= -1 && !c.ghost) {
        c.ghost = 1; demo.cut = c; demo.gd = gd;
        demo.x = CX + v.x * k * 300; demo.y = CY + v.y * k * 300;
        strokeStart(demo.x, demo.y);
        demo.press = true;
        return;
      }
      if (k > -2.4) { tx = CX - v.x * 300; ty = CY - v.y * 300; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 9);
    demo.y += (ty - demo.y) * Math.min(1, dt * 9);
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    game.draw.gradient(0, H, [[0, C.mat], [1, C.matD]]);
    // カッティングマットの升目(タイル反復)
    for (var x = 0; x <= W; x += 64) game.draw.rect(x - 2, 0, 4, H, C.matD, x % 256 === 0 ? 0.9 : 0.5);
    for (var y = 0; y <= H; y += 64) game.draw.rect(0, y - 2, W, 4, C.matD, y % 256 === 0 ? 0.9 : 0.5);
  }

  function drawTable() {
    var e = game.time.elapsed;
    // 向こう側に立つ裁ち職人
    var frame = R.oops > 0 ? TAILOR_OOPS : (R.joy > 0 ? TAILOR_JOY : (Math.floor(R.bp) % 2 === 0 ? TAILOR_A : TAILOR_B));
    var bob = Math.round((-R.pulse * 10 + Math.sin(e * 2.5) * 4) / 4) * 4;
    game.draw.sprite(frame, TAILOR_PAL, W / 2, 610 + bob, 16, { anchor: 'center' });
    game.draw.sprite(SPOOL, SPOOL_PAL, 190, 640, 16, { anchor: 'center' });
    game.draw.sprite(SPOOL, { w: C.wood, t: C.gold }, 890, 640, 16, { anchor: 'center' });
    game.draw.rect(0, 712, W, 40, C.wood);
    game.draw.rect(0, 752, W, 12, C.blk, 0.6);
  }

  function drawLane() {
    game.draw.rect(0, LANE_Y - 52, W, 104, C.cream);
    game.draw.rect(0, LANE_Y + 52, W, 10, C.blk, 0.5);
    var start = Math.floor(R.bp) - 2;
    for (var k = start; k < start + 8; k++) {
      for (var h = 0; h < 2; h++) {
        var x = LANE_X + (k + h * 0.5 - R.bp) * LANE_PX;
        if (x < -10 || x > W + 10) continue;
        game.draw.rect(x - 4, LANE_Y - 52, 8, h === 0 ? 44 : 22, C.blk);
      }
    }
    game.draw.rect(LANE_X - 8, LANE_Y - 64, 16, 128, C.red);
    for (var i = 0; i < R.cuts.length; i++) {
      var c = R.cuts[i];
      if (c.st === 'miss') continue;
      var cx = LANE_X + (c.b - R.bp) * LANE_PX;
      if (cx < -60 || cx > W + 60) continue;
      var done = c.st === 'cut';
      game.draw.rect(cx - 32, LANE_Y - 18, 64, 64, done ? C.green : (c.syn ? C.red : C.blk));
      arrow(cx, LANE_Y + 14, c.d, 40, c.syn ? C.gold : C.cream, 8);
    }
  }

  function drawFabricWhole(fi, oy, sc, flash) {
    var F = FABRICS[fi];
    var fw = 720 * sc, fh = 560 * sc, x0 = CX - fw / 2, y0 = CY - fh / 2 + oy;
    game.draw.rect(x0 + 16, y0 + 16, fw, fh, C.blk, 0.45);
    game.draw.rect(x0, y0, fw, fh, flash ? C.cream : F.base);
    if (flash) return;
    for (var by = 40; by < fh - 16; by += 96) game.draw.rect(x0, y0 + by, fw, 24, F.band, 0.85);
    for (var bx = 40; bx < fw - 16; bx += 96) game.draw.rect(x0 + bx, y0, 24, fh, F.band, 0.55);
  }

  function drawFabricSplit(fi, d, sep, alpha) {
    var F = FABRICS[fi], v = DIRS[d], nx = -v.y, ny = v.x;
    var fw = 720, fh = 560, x0 = CX - fw / 2, y0 = CY - fh / 2;
    for (var y = 0; y < fh; y += 16) {
      var yc = y0 + y + 8;
      var col = ((y - 40) % 96 + 96) % 96 < 24 ? F.band : F.base;
      if (Math.abs(nx) < 0.01) {
        var s = (yc - CY) * ny > 0 ? 1 : -1;
        game.draw.rect(x0, y0 + y + ny * sep * s, fw, 16, col, alpha);
      } else {
        var xc = CX - (yc - CY) * ny / nx;
        xc = Math.max(x0, Math.min(x0 + fw, Math.round(xc / 16) * 16));
        var sl = nx < 0 ? 1 : -1;
        game.draw.rect(x0 + nx * sep * sl, y0 + y + ny * sep * sl, xc - x0, 16, col, alpha);
        game.draw.rect(xc - nx * sep * sl, y0 + y - ny * sep * sl, x0 + fw - xc, 16, col, alpha);
      }
    }
  }

  function drawChalk(c) {
    var e = game.time.elapsed;
    var v = DIRS[c.d], nx = -v.y, ny = v.x;
    var hl = R.stop > 0 && R.stopCut === c;
    var fl = hl && Math.floor(e * 20) % 2 === 0;
    var col = fl ? C.blk : (c.syn ? C.gold : C.cream);
    var sz = hl ? 30 : 22;
    for (var s = -HALF; s <= HALF - 60; s += 44) {
      var px = Math.round((CX + v.x * s) / 8) * 8, py = Math.round((CY + v.y * s) / 8) * 8;
      game.draw.rect(px - sz / 2 - 4, py - sz / 2 - 4, sz + 8, sz + 8, fl ? C.cream : C.blk);
      game.draw.rect(px - sz / 2, py - sz / 2, sz, sz, col);
    }
    var tx = CX + v.x * HALF, ty = CY + v.y * HALF;
    var hx1 = tx - v.x * 90 + nx * 70, hy1 = ty - v.y * 90 + ny * 70;
    var hx2 = tx - v.x * 90 - nx * 70, hy2 = ty - v.y * 90 - ny * 70;
    game.draw.line(tx, ty, hx1, hy1, fl ? C.cream : C.blk, 30);
    game.draw.line(tx, ty, hx2, hy2, fl ? C.cream : C.blk, 30);
    game.draw.line(tx, ty, hx1, hy1, col, 18);
    game.draw.line(tx, ty, hx2, hy2, col, 18);
    // 合印
    game.draw.rect(CX - 20, CY - 20, 40, 40, C.blk);
    game.draw.rect(CX - 12, CY - 12, 24, 24, c.syn ? C.red : C.cream);
  }

  function drawCutting() {
    var e = game.time.elapsed;
    var c = currentCut();
    var hl = c && R.stop > 0 && R.stopCut === c;
    var sc = hl ? 1.06 : 1;
    drawFabricWhole(R.fabric, -R.drop * 60, sc, hl && Math.floor(e * 20) % 2 === 0);
    if (R.cutFx) {
      var t = R.cutFx.t;
      if (t > 0.12) drawFabricSplit(R.cutFx.fi, R.cutFx.d, (t - 0.12) * 900, Math.max(0, 1 - (t - 0.12) / 0.28));
      else drawFabricWhole(R.cutFx.fi, 0, 1, false);
      var v = DIRS[R.cutFx.d];
      var k = Math.min(1, t / 0.12);
      var sx = CX + v.x * (-HALF + 2 * HALF * k), sy = CY + v.y * (-HALF + 2 * HALF * k);
      game.draw.line(CX - v.x * HALF, CY - v.y * HALF, sx, sy, C.cream, 10);
      var vert = Math.abs(v.y) > Math.abs(v.x) && Math.abs(v.x) < 0.1;
      if (t < 0.22) {
        if (vert) game.draw.sprite(SHEARS_V, SHEARS_PAL, sx, sy, 12, { anchor: 'center', flipY: v.y < 0 });
        else game.draw.sprite(SHEARS, SHEARS_PAL, sx, sy, 12, { anchor: 'center', flipX: v.x < 0 });
      }
    }
    if (c && R.ready <= 0 && !R.over) {
      var u = c.b - R.bp;
      if (u <= 2.2 || hl) {
        drawChalk(c);
        if (!hl && u > -0.3) {
          var r = 44 + Math.max(0, u) * 170;
          if (c.syn) { ring8(CX, CY, r, Math.floor(e * 10) % 2 ? C.red : C.gold, 18); ring8(CX, CY, r + 22, C.red, 10); }
          else ring8(CX, CY, r, C.cream, 18);
          ring8(CX, CY, 44, c.syn ? C.red : C.cream, 8);
        }
      }
    }
    // 指の線(チョーク粉)
    for (var i = 0; i < R.trail.length; i++) {
      var p = R.trail[i];
      var a = 1 - p.t / 0.28;
      game.draw.rect(Math.round(p.x / 8) * 8 - 8, Math.round(p.y / 8) * 8 - 8, 16, 16, C.cream, a);
    }
  }

  function drawBeatCells() {
    var y = 1540;
    var b0 = Math.max(0, R.bp);
    var bar = Math.floor(b0 / 4);
    var cur8 = R.ready > 0 ? -1 : Math.floor(b0 * 2) % 8;
    game.draw.rect(60, y - 70, W - 120, 140, C.blk, 0.55);
    for (var i = 0; i < 8; i++) {
      var x = 150 + i * 111, big = i % 2 === 0, sz = big ? 84 : 48, lit = i === cur8;
      game.draw.rect(x - sz / 2, y - sz / 2, sz, sz, lit ? C.cream : C.matD);
      if (lit && big) game.draw.rect(x - sz / 2 - 8, y - sz / 2 - 8, sz + 16, 8, C.gold);
      var bt = bar * 4 + i / 2;
      for (var k = 0; k < R.cuts.length; k++) {
        var c = R.cuts[k];
        if (c.b !== bt) continue;
        var col = c.st === 'cut' ? C.green : (c.st === 'miss' ? C.blk : (c.syn ? C.red : C.gold));
        game.draw.rect(x - 16, y - 16, 32, 32, col);
      }
    }
  }

  function drawDecor() {
    game.draw.sprite(PIN, PIN_PAL, 140, 1730, 16, { anchor: 'center' });
    game.draw.sprite(SHEARS, SHEARS_PAL, 900, 1730, 12, { anchor: 'center' });
  }

  function drawWorld() {
    drawBg();
    drawTable();
    drawCutting();
    drawBeatCells();
    drawDecor();
    drawLane();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.blk);
    txt('SCORE ' + R.score, 40, 66, 46, C.cream, 'left');
    txt('BEST ' + game.best, W - 40, 66, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.sprite(SPOOL, on ? SPOOL_PAL : { w: C.matD, t: C.matD }, W - 90 - i * 90, 150, 10, { anchor: 'center' });
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 150, 52, C.gold, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / SONG_END));
    game.draw.rect(40, 206, W - 80, 16, C.matD);
    game.draw.rect(40, 206, Math.round((W - 80) * progress / 16) * 16, 16, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, CY, 120, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.25, W, H * 0.33, C.blk, 0.88);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, R.ok ? C.gold : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.37, 62, C.cream);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.42, 34, C.gold);
    txt('x' + R.maxCombo + '   ' + R.synHit + '/4', W / 2, H * 0.46, 38, C.red);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.51, 54, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.51, 42, C.cream);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.cuts.length; i++) if (R.cuts[i].st === 'wait') left++;
      txt('あと' + left + '本', W / 2, H * 0.555, 48, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.round(Math.sin(e * 2.2) * 2) * 4;
    game.draw.rect(0, 0, W, 236, C.blk);
    game.draw.text(GAME_TITLE, W / 2 + 8, 104 + bob, { size: 116, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 96 + bob, { size: 116, color: C.cream, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 200, 40, C.gold);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cream);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R || R.over) return;
    strokeStart(x, y);
    game.audio.tone(900, 0.03, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || R.over || !stroke) return;
    var res = strokeMove(x, y);
    if (res === 'air') {
      game.fx.burst(CX, CY, { color: C.cream, count: 5, speed: 120 });
      game.audio.tone(500, 0.05, { wave: 'triangle', volume: 0.06, slide: -200 });
    } else if (stroke && stroke.scrape >= 140) {
      // チョークが布を擦る音(指の移動に応じて刻む)
      stroke.scrape = 0;
      game.audio.tone(2000 + Math.floor(game.random(0, 600)), 0.02, { wave: 'square', volume: 0.015 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || R.over || !stroke) return;
    var judged = stroke.used;
    var res = strokeEnd(x, y);
    if (res === 'air' || (res === '' && !judged)) {
      game.fx.burst(x, y, { color: C.cream, count: 4, speed: 100 });
      game.audio.tone(res === 'air' ? 500 : 700, 0.04, { wave: 'triangle', volume: 0.05, slide: -200 });
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
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
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
