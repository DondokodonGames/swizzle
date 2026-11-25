// K-DS-0035v2-fork-works-long-ring.js
// 長鳴り音叉えらび — 拍の頭で二本の音叉が同時に打たれる。長く響いた方を、次の拍の頭でその側を押して選び取る
// 操作: 画面の左半分=左の音叉、右半分=右の音叉(押した瞬間で判定)。拍の頭で槌が二本を同時に打ち、それぞれの音叉は震えの線と光の輪が消えるまで鳴る(音も同じ長さ)。より長く震えていた方の側を、次の拍の頭(手元の枠が縮みきる瞬間)で押す。拍の頭からのずれでPERFECT/GOOD。短い方を選ぶ・拍外れ・押し損ねはMISS。打たれる前や鳴っている途中の早押しは罰なし
// 終わり: 前奏1小節のあと、前半3小節は2拍ごと(打つ→選ぶ)、後半2小節は毎拍(選ぶ拍に次の二本が打たれる)の計14組(104BPM・約15秒)を選び切ればCLEAR。MISS 3回でGAME OVER。後ほど二本の響きの差が小さくなる
// @mechanic: size_judge
// @theme: fork_works_long_ring
// 世界観: 音叉工場の検品室で、見習いの検品係が槌で同時に打たれる二本の音叉の響きを見比べ、拍に乗って長く鳴った良品だけを箱へ選り分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・選び取った良品の本数・最大コンボ)
// スタイル: 70s VECTOR

(function(game) {
  var STYLE = { bg: ['#010406', '#06101a'], main: ['#5cff9d', '#7fd4ff', '#f0f6ff'], accent: ['#ff6a5a', '#ffd84a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。塗りは使わず、太い淡い線+細い明るい線の重ねで光らせる。発光色は燐光の緑・水色・白
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1],
    green: STYLE.main[0], cyan: STYLE.main[1], white: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1], dim: '#24425a'
  };

  var GAME_TITLE = 'LONG RING';
  var BPM = 104;
  var SPB = 60 / BPM;
  var WIN_P = 0.065, WIN_G = 0.14, WIN_M = 0.26;
  var LIVES = 3;
  // 打つ拍。選ぶのは次の拍の頭。前半は2拍ごと、後半は毎拍
  var STRIKES = [4, 6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 22, 23];
  var SONG_END_B = 24.4;
  var DEMO_STRIKES = [2, 4, 6];
  var DEMO_LONG = [0, 1, 0];
  var DEMO_FAIL = 2;           // ゴーストは3組目で短い方を選んでMISSを見せる
  var DEMO_CYCLE = 8 * SPB + 1.6;
  var PITCHES = [['A4', 'E5'], ['G4', 'D5'], ['C5', 'G5'], ['F4', 'C5'], ['D5', 'A5']];

  var FX = [300, 780];
  var FBASE = 960, TINE = 300, TGAP = 34;
  var CRATE = { x: 540, y: 330 };
  var PAD_Y = 1660;

  // 伴奏(8分): 拍の頭に木の拍子、1・3拍目に低い響き、控えめな自作の旋律(音叉の音を邪魔しない)
  var MEL = ['E4', 0, 'G4', 0, 'A4', 0, 'G4', 0, 'C5', 0, 'B4', 0, 'G4', 0, 'E4', 0];
  var ROOTS = ['A2', 'A2', 'F2', 'G2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, gx: 540, gy: PAD_Y + 80, press: 0 };

  // 見習い検品係(線画のドット。耳当て付き)
  var APP_A = [
    '...oooooo...',
    '..o......o..',
    'oo.o....o.oo',
    'oo.o.oo.o.oo',
    '...o....o...',
    '....oooo....',
    '..oooooooo..',
    '.o.o....o.o.',
    '.o.o....o.o.',
    '...oooooo...',
    '...o....o...',
    '..oo....oo..'
  ];
  var APP_B = APP_A.slice();
  APP_B[7] = 'o..o....o..o';
  APP_B[8] = '...o....o...';
  APP_B[11] = '.oo......oo.';
  var APP_L = APP_A.slice();
  APP_L[5] = 'o...oooo....';
  APP_L[6] = '.ooooooooo..';
  APP_L[7] = '...o....o.o.';
  var APP_R = APP_A.slice();
  APP_R[5] = '....oooo...o';
  APP_R[6] = '..ooooooooo.';
  APP_R[7] = '.o.o....o...';
  var APP_OOPS = APP_A.slice();
  APP_OOPS[3] = 'oo.o.o.oo.oo';
  APP_OOPS[4] = '...o.oo.o...';
  APP_OOPS[7] = 'o..o....o..o';

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }
  // 発光線: 太い淡い線 + 細い明るい線
  function vl(x1, y1, x2, y2, hex, w, a) {
    var k = a === undefined ? 1 : a;
    game.draw.line(x1, y1, x2, y2, rgba(hex, 0.22 * k), w * 3);
    game.draw.line(x1, y1, x2, y2, rgba(hex, k), w);
  }
  function vring(cx, cy, r, hex, w, a, n) {
    var seg = n || 28, px = cx + r, py = cy;
    for (var i = 1; i <= seg; i++) {
      var ang = (i / seg) * Math.PI * 2;
      var x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      vl(px, py, x, y, hex, w, a);
      px = x; py = y;
    }
  }
  function vbox(x, y, w, h, hex, lw, a) {
    vl(x, y, x + w, y, hex, lw, a); vl(x + w, y, x + w, y + h, hex, lw, a);
    vl(x + w, y + h, x, y + h, hex, lw, a); vl(x, y + h, x, y, hex, lw, a);
  }
  function vsprite(art, x, y, px, hex) {
    game.draw.sprite(art, { o: rgba(hex, 0.25) }, x, y, px * 1.12, { anchor: 'center' });
    game.draw.sprite(art, { o: hex }, x, y, px, { anchor: 'center' });
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y + 3, { size: sz, color: rgba(color, 0.3), bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ── 進行 ───────────────────────────────────────────────
  function ringLens(i, longSide) {
    // 後ほど差が小さくなる(拍の何割鳴るか)
    var shortL = i < 3 ? 0.34 : (i < 6 ? 0.48 : 0.58);
    var longL = i < 6 ? 0.9 : 0.86;
    var lens = [0, 0];
    lens[longSide] = longL;
    lens[1 - longSide] = shortL + (i % 2) * 0.04;
    return lens;
  }

  function newRun(isDemo) {
    var st = isDemo ? DEMO_STRIKES : STRIKES;
    var ps = [];
    for (var i = 0; i < st.length; i++) {
      var lg = isDemo ? DEMO_LONG[i] : (game.random(0, 1) < 0.5 ? 0 : 1);
      var pit = PITCHES[i % PITCHES.length];
      var swap = isDemo ? 0 : (game.random(0, 1) < 0.5 ? 0 : 1);
      ps.push({ s: st[i], c: st[i] + 1, long: lg, lens: ringLens(i, lg), pitch: [pit[swap], pit[1 - swap]], st: 'wait', pick: -1, res: '', at: 0 });
    }
    return {
      demo: isDemo, ps: ps, bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, kept: 0,
      padT: [0, 0], pulse: 0, oops: 0, look: -1,
      stop: 0, stopP: null, crateFlash: 0, traces: null,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MEL.length; i++) notes.push([MEL[i] || 'R', 0.5]);
    for (var j = 0; j < ROOTS.length; j++) bass.push([ROOTS[j], 1], ['R', 1]);
    game.audio.melody(notes, { tempo: BPM, wave: 'triangle', volume: 0.04, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function playStep(s) {
    var slot = s % 8;
    if (slot % 2 === 0) {
      game.audio.tone(slot === 0 ? 1500 : 1150, 0.03, { wave: 'triangle', volume: slot === 0 ? 0.07 : 0.045 });
      if (slot === 0 || slot === 4) game.audio.tone(ROOTS[Math.floor(s / 8) % 4], SPB * 1.6, { wave: 'sine', volume: 0.08 });
    }
    var m = MEL[s % 16];
    if (m && s >= 8) game.audio.tone(m, SPB * 0.4, { wave: 'triangle', volume: 0.025 });
  }

  function strike(p) {
    p.st = 'ring';
    if (R.demo) return;
    // 二本の音叉が同時に鳴る(音の長さ=震えの長さ)
    game.audio.tone(p.pitch[0], p.lens[0] * SPB, { wave: 'sine', volume: 0.12 });
    game.audio.tone(p.pitch[1], p.lens[1] * SPB, { wave: 'sine', volume: 0.12 });
    game.audio.tone(3200, 0.03, { wave: 'square', volume: 0.03 });
  }

  function pending() {
    var best = null;
    for (var i = 0; i < R.ps.length; i++) {
      var p = R.ps[i];
      if (p.st === 'ring' && (!best || p.c < best.c)) best = p;
    }
    return best;
  }

  function pressSide(side) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    R.padT[side] = 0.18; R.look = side;
    var p = pending();
    if (!p) return 'empty';
    var d = (R.bp - p.c) * SPB;
    if (d < -WIN_M) return 'empty';
    p.pick = side;
    if (Math.abs(d) > WIN_G || side !== p.long) { missPair(p, side); return 'miss'; }
    var grade = Math.abs(d) <= WIN_P ? 'PERFECT' : 'GOOD';
    hitPair(p, grade);
    return grade;
  }

  function hitPair(p, grade) {
    p.st = 'kept'; p.res = grade; p.at = 0;
    R.traces = { lens: p.lens, long: p.long, t: 0.6 };
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    R.kept++;
    var late = p.s >= 16 ? 30 : 0;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + late; }
    else { R.good++; R.score += 60 + R.combo * 5 + late; }
    var x = FX[p.long];
    game.feedback.good(x, FBASE - TINE - 90, { text: grade, color: grade === 'PERFECT' ? C.gold : C.green, count: grade === 'PERFECT' ? 14 : 8 });
    game.fx.burst(x, FBASE - TINE / 2, { color: C.cyan, count: 10, speed: 300 });
    if (!R.demo && grade === 'PERFECT') game.audio.tone(p.pitch[p.long], 0.12, { wave: 'square', volume: 0.05 });
    if (!R.demo && R.combo % 5 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, 560, { color: C.gold, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missPair(p, side) {
    p.st = 'stop'; p.pick = side;
    R.traces = { lens: p.lens, long: p.long, t: 1.0 };
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopP = p; R.oops = 1.2;
    if (!R.demo) game.audio.tone(130, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    var p = R.stopP;
    R.stopP = null;
    if (!p) return;
    p.st = 'rejected'; p.at = 0;
    var x = p.pick >= 0 ? FX[p.pick] : W / 2;
    game.feedback.bad(x, FBASE - TINE - 90, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      game.fx.burst(CRATE.x, CRATE.y, { color: C.gold, count: 30, speed: 520 });
      game.fx.burst(FX[0], FBASE - 150, { color: C.green, count: 20, speed: 420 });
      game.fx.burst(FX[1], FBASE - 150, { color: C.cyan, count: 20, speed: 420 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function animPairs(dt) {
    for (var i = 0; i < R.ps.length; i++) {
      var p = R.ps[i];
      if (p.st === 'kept') {
        p.at += dt;
        if (p.at >= 0.6) { p.st = 'gone'; R.crateFlash = 1; }
      } else if (p.st === 'rejected') {
        p.at += dt;
        if (p.at >= 0.6) p.st = 'gone';
      }
    }
    if (R.traces) { R.traces.t -= dt; if (R.traces.t <= 0) R.traces = null; }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.oops = Math.max(0, R.oops - dt);
    R.crateFlash = Math.max(0, R.crateFlash - dt * 2);
    R.padT[0] = Math.max(0, R.padT[0] - dt);
    R.padT[1] = Math.max(0, R.padT[1] - dt);
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    animPairs(dt);
    if (R.over) return;
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.07 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.ps.length; i++) {
      var p = R.ps[i];
      if (p.st === 'wait' && R.bp >= p.s) strike(p);
      if (p.st === 'ring' && (R.bp - p.c) * SPB > WIN_G) { missPair(p, -1); return; }
    }
    if (!R.demo && R.bp >= SONG_END_B) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(長く鳴った方を次の拍の頭で2回選び、3組目は短い方を選んでMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); startAttractBgm(); }
    demo.press = Math.max(0, demo.press - dt);
    var p = R.stop > 0 ? null : pending();
    var tx = 540, ty = PAD_Y + 120;
    if (p) {
      var idx = R.ps.indexOf(p);
      var side = idx === DEMO_FAIL ? 1 - p.long : p.long;
      // 鳴り終わりを見届けてから選ぶ側へ手を寄せる
      if (R.bp - p.s > 0.6) { tx = side === 0 ? 280 : 800; ty = PAD_Y + 40; }
      if (R.bp >= p.c) { pressSide(side); demo.press = 0.2; }
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 10);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg0], [0.6, C.bg1], [1, C.bg0]]);
    // 遠景: 検品室の棚(暗い線)と天井の梁
    for (var k = 0; k < 5; k++) vl(60, 420 + k * 90, 140, 420 + k * 90, C.dim, 3, 0.6);
    for (var k2 = 0; k2 < 5; k2++) vl(940, 420 + k2 * 90, 1020, 420 + k2 * 90, C.dim, 3, 0.6);
    vl(0, 250, W, 250, C.dim, 3, 0.7);
    // 星屑のようなちらつき(ベクター管の残光)
    for (var s = 0; s < 14; s++) {
      var x = (s * 211 + 37) % W, y = 280 + ((s * 137) % 1100);
      var a = 0.25 + 0.25 * Math.sin(e * 2 + s);
      game.draw.line(x, y, x + 3, y, rgba(C.cyan, a), 3);
    }
  }

  function drawCrate() {
    var fl = R.crateFlash;
    var col = fl > 0 ? C.gold : C.green;
    vbox(CRATE.x - 170, CRATE.y - 40, 340, 110, col, 4, 0.8 + fl * 0.2);
    vl(CRATE.x - 170, CRATE.y, CRATE.x + 170, CRATE.y, col, 2, 0.5);
    var n = Math.min(14, R.kept);
    for (var i = 0; i < n; i++) {
      var x = CRATE.x - 150 + i * 22;
      vl(x, CRATE.y + 60, x, CRATE.y + 10, C.cyan, 2, 0.8);
      vl(x + 8, CRATE.y + 60, x + 8, CRATE.y + 10, C.cyan, 2, 0.8);
    }
  }

  function drawFork(cx, base, hex, bright, vib, scale) {
    var e = game.time.elapsed;
    var sc = scale || 1;
    var g = TGAP * sc, tl = TINE * sc;
    var wob = vib > 0 ? Math.sin(e * 90) * vib * 5 : 0;
    // 二本の歯(震え中は左右にぶれる)
    vl(cx - g - wob, base - tl, cx - g, base, hex, 6, bright);
    vl(cx + g + wob, base - tl, cx + g, base, hex, 6, bright);
    // 根元の弧と柄
    var px = cx - g, py = base;
    for (var i = 1; i <= 6; i++) {
      var a = Math.PI - (i / 6) * Math.PI;
      var x = cx + Math.cos(a) * g, y = base + Math.sin(a) * g;
      vl(px, py, x, y, hex, 6, bright);
      px = x; py = y;
    }
    vl(cx, base + g, cx, base + g + 90 * sc, hex, 8, bright);
    if (vib > 0) {
      // 震えの線: 鳴り残りが減るほど短く・淡くなる
      for (var j = 1; j <= 3; j++) {
        var off = g + 18 + j * 22 + Math.sin(e * 70 + j) * 4 * vib;
        var len = tl * (0.3 + 0.6 * vib) * (1 - j * 0.15);
        var a2 = vib * (1.05 - j * 0.25);
        vl(cx - off, base - tl * 0.55 - len / 2, cx - off, base - tl * 0.55 + len / 2, hex, 4, a2);
        vl(cx + off, base - tl * 0.55 - len / 2, cx + off, base - tl * 0.55 + len / 2, hex, 4, a2);
      }
      // 光の輪(響きが消えると消える)
      vring(cx, base - tl * 0.55, 150 + (1 - vib) * 40, hex, 3, vib * 0.7, 24);
    }
  }

  function ringFrac(p, side) {
    if (p.st !== 'ring' && p.st !== 'stop') return 0;
    var el = R.bp - p.s;
    if (el < 0) return 0;
    return Math.max(0, 1 - el / p.lens[side]);
  }

  function drawHammer(side, raise) {
    var dir = side === 0 ? 1 : -1;
    var ax = FX[side] - dir * 170, ay = FBASE - TINE - 70;
    var th = 0.25 - raise * 1.0;
    var hx = ax + dir * Math.cos(th) * 150, hy = ay + Math.sin(th) * 150;
    vl(ax, ay, hx, hy, C.dim, 4, 1);
    vring(ax, ay, 10, C.dim, 3, 1, 8);
    vbox(hx - 26, hy - 18, 52, 36, C.white, 3, 0.6 + raise * 0.4);
  }

  function drawStand() {
    var e = game.time.elapsed;
    // 共鳴箱
    vbox(120, FBASE + 130, 840, 90, C.cyan, 4, 0.7 + R.pulse * 0.3);
    vl(140, FBASE + 175, 940, FBASE + 175, C.dim, 2, 0.8);
    var p = null;
    for (var i = 0; i < R.ps.length; i++) {
      var q = R.ps[i];
      if (q.st === 'ring' || q.st === 'stop') { if (!p || q.s > p.s) p = q; }
    }
    var nextW = null;
    for (var k = 0; k < R.ps.length; k++) if (R.ps[k].st === 'wait') { nextW = R.ps[k]; break; }
    for (var s = 0; s < 2; s++) {
      var vib = p ? ringFrac(p, s) : 0;
      var hex = s === 0 ? C.green : C.cyan;
      var bright = 0.45 + vib * 0.55;
      if (p && p.st === 'stop' && s === p.long) {
        // 失敗の瞬間: 正解だった方を白く光らせ拡大
        var fl = Math.floor(e * 20) % 2 === 0;
        drawFork(FX[s], FBASE, fl ? C.white : C.red, 1, 0.6, 1.2);
      } else {
        drawFork(FX[s], FBASE, hex, bright, vib, 1);
      }
      // 槌: 打つ拍の半拍前から振りかぶる(予告)
      var raise = 0;
      if (nextW) {
        var dB = nextW.s - R.bp;
        if (dB < 0.5 && dB >= 0) raise = 1 - dB / 0.5;
      }
      drawHammer(s, raise);
    }
    // 判定の根拠: 二本の鳴った長さの線
    if (R.traces) {
      for (var t = 0; t < 2; t++) {
        var len = R.traces.lens[t] * 300;
        var col = t === R.traces.long ? C.gold : C.red;
        vl(FX[t] - 150, FBASE + 255, FX[t] - 150 + len, FBASE + 255, col, 8, Math.min(1, R.traces.t * 2));
      }
    }
  }

  function drawFlying() {
    for (var i = 0; i < R.ps.length; i++) {
      var p = R.ps[i];
      if (p.st === 'kept') {
        var t = Math.min(1, p.at / 0.6);
        var x = FX[p.long] + (CRATE.x - FX[p.long]) * t;
        var y = FBASE + (CRATE.y + 40 - FBASE) * t - Math.sin(t * Math.PI) * 120;
        drawFork(x, y, C.gold, 1 - t * 0.5, 0, 1 - t * 0.7);
      } else if (p.st === 'rejected') {
        var t2 = Math.min(1, p.at / 0.6);
        var side = p.pick >= 0 ? p.pick : 1 - p.long;
        drawFork(FX[side], FBASE + t2 * 500, C.red, 1 - t2, 0, 0.8);
      }
    }
  }

  function drawApprentice() {
    var e = game.time.elapsed;
    var f = R.oops > 0 ? APP_OOPS : (R.padT[0] > 0 ? APP_L : (R.padT[1] > 0 ? APP_R : (Math.floor(e * 2.2) % 2 === 0 ? APP_A : APP_B)));
    vsprite(f, 540, 1360 - R.pulse * 8, 13, R.oops > 0 ? C.red : C.white);
  }

  function drawPads() {
    var p = R.stop > 0 ? null : pending();
    for (var s = 0; s < 2; s++) {
      var x0 = s === 0 ? 60 : 580, w = 440, y0 = PAD_Y - 120, h = 240;
      var hex = s === 0 ? C.green : C.cyan;
      var lit = R.padT[s] > 0;
      vbox(x0, y0, w, h, lit ? C.white : hex, lit ? 8 : 4, lit ? 1 : 0.7);
      // 枠の中の小さな音叉(どちら側か)
      drawFork(x0 + w / 2, PAD_Y + 60, hex, 0.8, 0, 0.35);
      // 選ぶ拍へ縮む枠(閉じた瞬間が拍の頭)
      if (p) {
        var dB = p.c - R.bp;
        if (dB <= 1 && dB > -0.2) {
          var grow = Math.max(0, dB) * 70;
          vbox(x0 - 12 - grow, y0 - 12 - grow, w + 24 + grow * 2, h + 24 + grow * 2, dB < 0.35 ? C.gold : C.dim, 3, 0.9);
        }
      }
    }
  }

  function drawWorld() {
    drawBg();
    drawCrate();
    drawStand();
    drawFlying();
    drawApprentice();
    drawPads();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 70, 36, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) drawFork(W - 70 - i * 60, 175, i < R.lives ? C.green : C.dim, i < R.lives ? 1 : 0.5, 0, 0.18);
    // 拍ランプ: 打つ拍=円、選ぶ拍=四角
    var inBar = R.ready > 0 ? -1 : ((R.beatIdx % 4) + 4) % 4;
    var barStart = Math.floor(Math.max(0, R.bp) / 4) * 4;
    for (var b = 0; b < 4; b++) {
      var beat = barStart + b;
      var isStrike = false, isPick = false;
      for (var j = 0; j < R.ps.length; j++) { if (R.ps[j].s === beat) isStrike = true; if (R.ps[j].c === beat) isPick = true; }
      var lit = b === inBar && R.pulse > 0.2;
      var x = 110 + b * 110, hex = lit ? C.gold : (isPick ? C.cyan : C.dim);
      if (isPick) vbox(x - 26, 124, 52, 52, hex, lit ? 6 : 3, 1);
      vring(x, 150, isStrike ? 16 : 10, lit ? C.gold : (isStrike ? C.green : C.dim), lit ? 5 : 3, 1, 12);
    }
    var progress = Math.min(1, R.bp / SONG_END_B);
    vl(40, 214, W - 40, 214, C.dim, 4, 1);
    vl(40, 214, 40 + (W - 80) * progress, 214, C.green, 4, 1);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, 1460, 44, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 560, 110, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.32, C.bg0, 0.85);
    vbox(40, H * 0.24, W - 80, H * 0.32, R.ok ? C.green : C.red, 4, 0.9);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, R.ok ? C.green : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 62, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 34, C.cyan);
    txt(R.kept + ' / ' + R.ps.length + '   COMBO ' + R.maxCombo, W / 2, H * 0.45, 36, C.cyan);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 50, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 42, C.gold);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.ps.length; i++) if (R.ps[i].st === 'wait' || R.ps[i].st === 'ring') left++;
      txt('あと' + Math.max(1, left) + '組', W / 2, H * 0.54, 46, C.gold);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2, 112 + bob, { size: 112, color: rgba(C.green, 0.3), bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 106 + bob, { size: 104, color: C.green, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, 102 + bob, { size: 104, color: rgba(C.white, 0.6), bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 200, 40, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.955, 42, C.white);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    var side = x < W / 2 ? 0 : 1;
    var res = pressSide(side);
    if (res === 'empty') {
      game.audio.play('se_tap', 0.3);
      game.fx.burst(side === 0 ? 280 : 800, PAD_Y, { color: C.dim, count: 4, speed: 120 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      animPairs(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 42, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, kept: R.kept };
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
