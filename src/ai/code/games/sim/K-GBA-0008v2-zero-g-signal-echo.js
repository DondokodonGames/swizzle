// K-GBA-0008v2-zero-g-signal-echo.js
// 無重力ラウンジの手信号返し — 先輩が1小節で示した向きの手信号を、次の小節で一拍ずらして同じ向きへ払って返す
// 操作: 先輩が拍ごとに腕で示した向き(上下左右)を見て、次の小節に一拍遅れで同じ向きへスワイプする。お手本の小節は見るだけ
// 終わり: 3往復(6小節・12秒)を返し切れば成功。3回外せば失敗
// @mechanic: swipe_direction
// @theme: zero_g_lounge_signal_drill
// 世界観: 宇宙船の無重力ラウンジ。浮かんだ先輩乗組員が1小節ぶん手信号を出し、新人乗組員が次の小節で一拍遅れに同じ向きを返す連携訓練
// 残るもの: 正誤(CLEAR/GAME OVER) + SCORE(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で描く。影は落とさず明度差だけで立体を出す
  var STYLE = { bg: ['#0c1030', '#1e2a5a'], main: ['#c8d4ec', '#8a9ac0', '#5a6890'], accent: ['#ffcf3a', '#3ad0ff'] };
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], wall: '#2a3666', wall2: '#202a52',
    cubeT: STYLE.main[0], cubeL: STYLE.main[1], cubeR: STYLE.main[2],
    gold: STYLE.accent[0], goldL: '#d8a020', goldR: '#a07810', cyan: STYLE.accent[1], cyanL: '#1a98c8', cyanR: '#106890',
    good: '#6affa8', danger: '#ff4a5a', white: '#ffffff', ink: '#060818', dim: '#3a4878',
  };

  var GAME_TITLE = 'SIGNAL ECHO';
  var BPM = 120;
  var SPB = 60 / BPM;                 // 1拍 0.5秒
  var ROUNDS = [[0, 2], [0, 1, 2], [0, 1, 2]];   // お手本小節で手信号が出る拍(0始まり)。4拍目は「君の番」の合図
  var BEATS = ROUNDS.length * 8;      // お手本1小節 + 返し1小節 = 1往復
  var TIME_LIMIT = 12;
  var SONG_LEN = BEATS * SPB;
  var COUNT_IN = 2 * SPB;
  var PERF_W = 0.08, GOOD_W = 0.17, CATCH_W = 0.25, SWIPE_LAG = 0.08;
  var MISS_MAX = 3, STUN_T = 0.3, FINAL_STOP = 0.5, RESULT_HOLD = 2.0;
  var DIRS = ['up', 'right', 'down', 'left'];
  var VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var PITCH = { up: 'E5', right: 'C5', down: 'G4', left: 'A4' };

  var SEN_X = W * 0.42, SEN_Y = H * 0.25, ARW_X = W * 0.78;
  var ROW_M = H * 0.415, ROW_R = H * 0.495, CELL_W = 190;
  var ROOK_X = W * 0.42, ROOK_Y = H * 0.635;
  var DIAL_X = W * 0.5, DIAL_Y = H * 0.865;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null, ok = false, resultT = 0, endSent = false, newRecord = false;

  // ── スプライト(乗組員: 左列を明るく右列を暗くして立方体の陰影) ─────
  var CREW_A = [
    '..HHHHH..',
    '.HHHHHHD.',
    '.HFFFFFD.',
    '.HFKFKFD.',
    '.HFFFFFD.',
    '..HHHDD..',
    '.BBBBBBD.',
    '.BBBBBBD.',
    '.BBSSBBD.',
    '.BB...BD.',
    '.BB...BD.',
  ];
  var CREW_B = [
    '..HHHHH..',
    '.HHHHHHD.',
    '.HFFFFFD.',
    '.HFKFKFD.',
    '.HFFFFFD.',
    '..HHHDD..',
    '.BBBBBBD.',
    '.BBBBBBD.',
    '.BBSSBBD.',
    'BB.....BD',
    'B.......D',
  ];
  var CREW_OOPS = [
    '..HHHHH..',
    '.HHHHHHD.',
    '.HFFFFFD.',
    '.HFXFXFD.',
    '.HFFOFFD.',
    '..HHHDD..',
    'BBBBBBBDD',
    '.BBBBBBD.',
    '.BBSSBBD.',
    'BB.....BD',
    'B.......D',
  ];
  var SEN_PAL = { H: '#ffd04a', D: '#b08a20', F: '#203a5a', K: '#ffffff', B: '#e8eef8', S: '#ffd04a', X: '#ff4a5a', O: '#ff4a5a' };
  var ROOK_PAL = { H: '#5ac8ff', D: '#2a7aa8', F: '#203a5a', K: '#ffffff', B: '#e8eef8', S: '#5ac8ff', X: '#ff4a5a', O: '#ff4a5a' };
  function whitePal(p) { var o = {}; for (var k in p) o[k] = '#ffffff'; return o; }
  var ROOK_WHITE = whitePal(ROOK_PAL);
  // 5x5 の矢印(右向き基準)をボクセルで積む
  var ARROW_CELLS = [[0, -2], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [1, 1], [0, 2]];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ── ボクセル描画 ───────────────────────────────────────────
  function tri(ax, ay, bx, by, cx, cy, col, al) {
    var p0 = [ax, ay], p1 = [bx, by], p2 = [cx, cy], tmp;
    if (p1[1] < p0[1]) { tmp = p0; p0 = p1; p1 = tmp; }
    if (p2[1] < p0[1]) { tmp = p0; p0 = p2; p2 = tmp; }
    if (p2[1] < p1[1]) { tmp = p1; p1 = p2; p2 = tmp; }
    var y0 = p0[1], y1 = p1[1], y2 = p2[1];
    if (y2 - y0 < 1) return;
    for (var y = y0; y < y2; y += 3) {
      var xa = p0[0] + (p2[0] - p0[0]) * (y - y0) / (y2 - y0);
      var xb = y < y1 ? p0[0] + (p1[0] - p0[0]) * (y - y0) / Math.max(1, y1 - y0)
                      : p1[0] + (p2[0] - p1[0]) * (y - y1) / Math.max(1, y2 - y1);
      game.draw.rect(Math.min(xa, xb), y, Math.abs(xb - xa) + 1, 3.5, col, al);
    }
  }
  function quad(a, b, c, d, col, al) { tri(a[0], a[1], b[0], b[1], c[0], c[1], col, al); tri(a[0], a[1], c[0], c[1], d[0], d[1], col, al); }
  // 等角の立方体(x,y=上面の中心)
  function cube(x, y, s, t, l, r, al) {
    var a = s * 0.87, b = s * 0.5;
    quad([x - a, y], [x, y + b], [x, y + b + s], [x - a, y + s], l, al);
    quad([x, y + b], [x + a, y], [x + a, y + s], [x, y + b + s], r, al);
    quad([x, y - b], [x + a, y], [x, y + b], [x - a, y], t, al);
  }
  function slab(x, y, w, h, d, t, l, r) {   // 平たい直方体(セルの床)
    quad([x - w, y], [x, y + h], [x, y + h + d], [x - w, y + d], l);
    quad([x, y + h], [x + w, y], [x + w, y + d], [x, y + h + d], r);
    quad([x, y - h], [x + w, y], [x, y + h], [x - w, y], t);
  }
  function rot(c, dir) {
    if (dir === 'right') return c;
    if (dir === 'left') return [-c[0], c[1]];
    if (dir === 'down') return [-c[1], c[0]];
    return [c[1], -c[0]];
  }
  function voxelArrow(x, y, dir, s, t, l, r, al) {
    var cells = ARROW_CELLS.map(function(c) { return rot(c, dir); });
    cells.sort(function(p, q) { return (p[1] - q[1]) || (p[0] - q[0]); });
    for (var i = 0; i < cells.length; i++) cube(x + cells[i][0] * s * 1.05, y + cells[i][1] * s * 1.05, s * 0.6, t, l, r, al);
  }
  function flatArrow(x, y, dir, len, col) {
    var v = VEC[dir], px = -v[1], py = v[0];
    var hx = x + v[0] * len, hy = y + v[1] * len;
    game.draw.line(x - v[0] * len, y - v[1] * len, hx - v[0] * 18, hy - v[1] * 18, col, 12);
    tri(hx, hy, hx - v[0] * 34 + px * 26, hy - v[1] * 34 + py * 26, hx - v[0] * 34 - px * 26, hy - v[1] * 34 - py * 26, col);
  }

  // ── 伴奏(呼びかけの1小節 → 応えの1小節、固有メロディ) ───────────
  var BGM_LEAD = [['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 1], ['R', 1],
                  ['R', 1], ['G4', 0.5], ['C5', 0.5], ['E5', 1], ['C5', 1]];
  var BGM_BASS = [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1], ['A2', 1], ['A2', 1], ['F2', 1], ['G2', 1]];
  function startBgm() {
    game.audio.melody(BGM_LEAD, { tempo: BPM, wave: 'triangle', volume: 0.06, loop: true, bass: BGM_BASS, bassWave: 'square', bassVolume: 0.035 });
  }

  // ── 1回分の訓練(本番とATTRACT実演で同じロジック) ───────────────
  function genDirs(n, ri) {
    var out = [], prev = '';
    for (var i = 0; i < n; i++) {
      var d;
      do { d = DIRS[Math.floor(game.random(0, 4)) % 4]; } while (d === prev && ri < 2);
      out.push(d); prev = d;
    }
    return out;
  }
  function makeRun(rounds, t0, fixed) {
    var r = { t: t0, models: [], slots: [], handoffs: [], lives: MISS_MAX, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, stunT: 0, stopT: 0, beatIdx: -99, beatFlash: 0, pend: null,
      over: false, demo: false, bgmCue: false, senDir: '', senT: 0, rookDir: '', rookT: 0, dialDir: '', dialT: 0, rounds: rounds.length };
    for (var ri = 0; ri < rounds.length; ri++) {
      var base = ri * 8, pat = rounds[ri];
      var dirs = fixed ? fixed[ri] : genDirs(pat.length, ri);
      for (var j = 0; j < pat.length; j++) {
        r.models.push({ beat: base + pat[j], t: (base + pat[j]) * SPB, dir: dirs[j], shown: false, round: ri });
        // 返しは次の小節の「一拍遅れ」の位置
        r.slots.push({ beat: base + 4 + pat[j] + 1, t: (base + 4 + pat[j] + 1) * SPB, dir: dirs[j], done: false, res: '', round: ri, hitT: 0 });
      }
      r.handoffs.push({ t: (base + 3) * SPB, fired: false, round: ri });
    }
    return r;
  }
  function initGame() {
    run = makeRun(ROUNDS, -COUNT_IN, null);
    ok = false; resultT = 0; endSent = false; newRecord = false;
  }

  function missSlot(r, s) {
    s.done = true; s.res = 'M'; s.hitT = STUN_T + 0.12;
    r.miss++; r.combo = 0; r.lives--;
    r.pend = { x: ROOK_X, y: ROOK_Y - 60 };
    game.audio.tone(104, 0.18, { wave: 'sawtooth', volume: r.demo ? 0.05 : 0.13 });
    if (r.lives <= 0 && !r.demo) { r.stopT = FINAL_STOP; r.over = true; game.audio.stopBgm(); }
    else r.stunT = STUN_T;
  }
  function badNow(r) {
    var p = r.pend; r.pend = null;
    if (p) game.feedback.bad(p.x, p.y, { text: 'MISS', volume: r.demo ? 0.3 : 0.9 });
  }

  function doSwipe(r, dir, now) {
    if (r.over || r.stopT > 0) return;
    r.dialDir = dir; r.dialT = 0.2;
    r.rookDir = dir; r.rookT = 0.35;
    if (r.stunT > 0) return;
    var gt = now - SWIPE_LAG;
    var best = null, bd = 99;
    for (var i = 0; i < r.slots.length; i++) {
      var s = r.slots[i];
      if (s.done) continue;
      var d = gt - s.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = s; }
    }
    if (!best || Math.abs(bd) > CATCH_W) {      // 返す拍でないところの空振り
      game.audio.tone(220, 0.05, { wave: 'triangle', volume: r.demo ? 0.02 : 0.05 });
      return;
    }
    if (best.dir !== dir || Math.abs(bd) > GOOD_W) { missSlot(r, best); return; }
    best.done = true;
    var perfect = Math.abs(bd) <= PERF_W;
    best.res = perfect ? 'P' : 'G';
    r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfect++; else r.good++;
    r.score += (perfect ? 100 : 50) + Math.min(10, r.combo) * 5;
    game.audio.tone(PITCH[dir], 0.14, { wave: 'square', volume: r.demo ? 0.03 : 0.07 });   // 先輩と同じ音で応える
    game.feedback.good(ROOK_X + 200, ROOK_Y - 80, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good, volume: r.demo ? 0.25 : 0.6 });
    var all = true;
    for (var k = 0; k < r.slots.length; k++) if (r.slots[k].round === best.round && r.slots[k].res !== 'P' && r.slots[k].res !== 'G') all = false;
    if (all && !r.demo) {
      game.fx.popup('NICE!', W / 2, H * 0.56, { color: C.gold, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(r, dt) {
    if (r.stopT > 0) {            // 3回目のミス: 画面全体を止める hit-stop
      r.stopT -= dt;
      if (r.stopT <= 0) { badNow(r); finish(false); }
      return;
    }
    r.t += dt;
    var bi = Math.floor(r.t / SPB);
    if (bi !== r.beatIdx) {
      r.beatIdx = bi; r.beatFlash = 1;
      if (r.t < 0) { if (!r.demo) game.audio.tone(bi === -1 ? 1320 : 880, 0.08, { wave: 'square', volume: 0.09 }); }
      else if (r.t < SONG_LEN) game.audio.tone(bi % 4 === 0 ? 1760 : 1320, 0.025, { wave: 'triangle', volume: r.demo ? 0.015 : 0.035 });
    }
    if (!r.demo && !r.bgmCue && r.t >= -0.06) { r.bgmCue = true; startBgm(); }
    for (var i = 0; i < r.models.length; i++) {
      var m = r.models[i];
      if (!m.shown && r.t >= m.t) {
        m.shown = true;
        r.senDir = m.dir; r.senT = 0.4;
        game.audio.tone(PITCH[m.dir], 0.16, { wave: 'square', volume: r.demo ? 0.035 : 0.08 });
      }
    }
    for (var h = 0; h < r.handoffs.length; h++) {
      var ho = r.handoffs[h];
      if (!ho.fired && r.t >= ho.t) {     // 4拍目: 先輩が新人を指す = 次の小節は君の番(0.5秒以上前の予告)
        ho.fired = true;
        r.senDir = 'pass'; r.senT = 0.45;
        game.audio.tone('C6', 0.1, { wave: 'triangle', volume: r.demo ? 0.03 : 0.07, slide: 300 });
      }
    }
    for (var j = 0; j < r.slots.length; j++) {
      var s = r.slots[j];
      if (!s.done && r.t > s.t + GOOD_W) missSlot(r, s);
      if (s.hitT > 0) s.hitT -= dt;
      if (r.stopT > 0) return;
    }
    if (r.senT > 0) r.senT -= dt;
    if (r.rookT > 0) r.rookT -= dt;
    if (r.dialT > 0) r.dialT -= dt;
    if (r.stunT > 0) { r.stunT -= dt; if (r.stunT <= 0) badNow(r); }
    r.beatFlash = Math.max(0, r.beatFlash - dt * 4);
    if (!r.demo && !r.over && r.t >= SONG_LEN + 0.2) { r.over = true; finish(true); }
  }

  function finish(cleared) {
    if (state !== S.PLAYING) return;
    ok = cleared;
    state = S.RESULT; resultT = 0; endSent = false;
    newRecord = cleared && run.score > game.best;
    game.audio.stopBgm();
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.6);
    if (cleared) game.fx.burst(ROOK_X, ROOK_Y, { color: C.gold, count: 30, speed: 520 });
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.47, { color: C.gold, size: 72 });
  }
  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, signals: run.slots.length };
    if (ok) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 描画 ─────────────────────────────────────────────────
  var STARS = [];
  for (var si = 0; si < 40; si++) STARS.push([(si * 263) % 1080, 260 + (si * 151) % 900, 1 + (si % 3)]);
  var FLOATS = [[0.1, 0.36, 26, 0.0], [0.9, 0.55, 22, 1.7], [0.12, 0.72, 20, 3.1], [0.88, 0.2, 18, 4.4]];

  function drawRoom(r) {
    game.draw.gradient(0, H, [[0, C.bg0], [0.5, C.bg1], [1, C.bg0]]);
    var tt = game.time.elapsed;
    // 大きな丸窓と流れる星
    game.draw.circle(W * 0.5, H * 0.44, 470, C.wall, 0.55);
    game.draw.circle(W * 0.5, H * 0.44, 430, '#050716');
    for (var i = 0; i < STARS.length; i++) {
      var sx = (STARS[i][0] - tt * 40 * STARS[i][2]) % 1080; if (sx < 0) sx += 1080;
      var dx = sx - W * 0.5, dy = STARS[i][1] - H * 0.44;
      if (dx * dx + dy * dy < 420 * 420) game.draw.rect(sx, STARS[i][1], STARS[i][2] * 3, STARS[i][2] * 3, C.white, 0.7);
    }
    // ラウンジの床/壁ブロック(拍で明滅)
    for (var k = 0; k < 7; k++) {
      var lit = ((r.beatIdx % 7) + 7) % 7 === k ? r.beatFlash : 0;
      cube(80 + k * 154, H * 0.755, 70, lit > 0.3 ? C.gold : C.dim, C.wall, C.wall2);
    }
    // 漂う小物(無重力)
    for (var f = 0; f < FLOATS.length; f++) {
      var fl = FLOATS[f];
      cube(W * fl[0] + Math.sin(tt * 0.7 + fl[3]) * 20, H * fl[1] + Math.cos(tt * 0.9 + fl[3]) * 26, fl[2], C.cubeT, C.cubeL, C.cubeR, 0.8);
    }
  }

  function drawArm(x, y, dir, pal, active) {
    var v;
    if (dir === 'pass') v = [0.15, 1];
    else if (dir && active) v = VEC[dir];
    else v = [0.5, 0.6];
    var sx = x + 46, sy = y - 6;
    for (var i = 1; i <= 3; i++) cube(sx + v[0] * i * 34, sy + v[1] * i * 34, 15, pal.H, pal.D, pal.D);
  }

  function drawCrew(x, y, pal, frame, dir, active, white, scale) {
    var bob = Math.sin(game.time.elapsed * 2.2 + x) * 12;
    var px = 12 * (scale || 1);
    game.draw.sprite(frame, white ? ROOK_WHITE : pal, x, y + bob, px, { anchor: 'center' });
    if (!white) drawArm(x, y + bob, dir, pal, active);
  }

  function roundOf(r) { return Math.max(0, Math.min(r.rounds - 1, Math.floor(Math.max(0, r.t) / (8 * SPB)))); }

  function drawRows(r) {
    var ri = roundOf(r), base = ri * 8;
    var inR = Math.floor(r.t / SPB) - base;
    var modelBar = inR < 4;
    for (var c = 0; c < 4; c++) {
      var x = W / 2 + (c - 1.5) * CELL_W;
      var curM = modelBar && inR === c && r.t >= 0, curR = !modelBar && inR - 4 === c;
      slab(x, ROW_M, 78, 34, 14, curM ? C.gold : '#4a5890', '#2e3a6a', '#222c56');
      slab(x, ROW_R, 78, 34, 14, curR ? C.cyan : '#3a4880', '#26305a', '#1a2248');
    }
    for (var i = 0; i < r.models.length; i++) {
      var m = r.models[i];
      if (m.round !== ri || !m.shown) continue;
      var cm = m.beat - base;
      var mx = W / 2 + (cm - 1.5) * CELL_W;
      flatArrow(mx, ROW_M - 4, m.dir, 26, (modelBar && inR === cm) ? C.ink : C.gold);
      var rx = W / 2 + (cm - 0.5) * CELL_W;
      game.draw.line(mx + 30, ROW_M + 30, rx - 30, ROW_R - 26, C.white, 3);   // 一拍ずれの斜めリンク
    }
    for (var j = 0; j < r.slots.length; j++) {
      var s = r.slots[j];
      if (s.round !== ri) continue;
      var cr = s.beat - base - 4;
      var sx = W / 2 + (cr - 1.5) * CELL_W;
      var shown = false;
      for (var k = 0; k < r.models.length; k++) if (r.models[k].round === ri && r.models[k].dir === s.dir && r.models[k].beat === s.beat - 5 && r.models[k].shown) shown = true;
      if (!shown) continue;
      var col = s.res === 'P' ? C.gold : s.res === 'G' ? C.good : s.res === 'M' ? C.danger : '#dfe6f8';
      if (s.res === 'M' && s.hitT > 0) { slab(sx, ROW_R, 92, 40, 16, C.white, C.white, C.white); continue; }
      flatArrow(sx, ROW_R - 4, s.dir, 26, col);
      var dtt = s.t - r.t;
      if (!s.done && dtt < SPB && dtt > -GOOD_W) {    // 返す拍へ縮むリング(1拍前から)
        var rr = 40 + Math.max(0, dtt) / SPB * 90;
        for (var a = 0; a < 16; a++) {
          var a0 = a / 16 * Math.PI * 2, a1 = (a + 1) / 16 * Math.PI * 2;
          game.draw.line(sx + Math.cos(a0) * rr, ROW_R + Math.sin(a0) * rr * 0.6, sx + Math.cos(a1) * rr, ROW_R + Math.sin(a1) * rr * 0.6, C.cyan, 5);
        }
      }
    }
  }

  function drawDial(r) {
    var turn = false;
    var inR = Math.floor(r.t / SPB) % 8;
    if (r.t >= 0 && inR >= 3) turn = true;
    cube(DIAL_X, DIAL_Y - 30, 70, turn ? C.cyan : C.cubeT, turn ? C.cyanL : C.cubeL, turn ? C.cyanR : C.cubeR);
    for (var i = 0; i < DIRS.length; i++) {
      var d = DIRS[i], v = VEC[d];
      var on = r.dialT > 0 && r.dialDir === d;
      cube(DIAL_X + v[0] * 190, DIAL_Y - 20 + v[1] * 110, 52, on ? C.gold : C.dim, on ? C.goldL : C.wall, on ? C.goldR : C.wall2);
    }
  }

  function drawScene(r, result) {
    drawRoom(r);
    var fr = Math.floor(game.time.elapsed * 2) % 2 === 0 ? CREW_A : CREW_B;
    var senTurn = r.t >= 0 && (Math.floor(r.t / SPB) % 8) < 4;
    if (senTurn && !result) game.draw.circle(SEN_X, SEN_Y, 130, C.gold, 0.12 + r.beatFlash * 0.12);
    drawCrew(SEN_X, SEN_Y, SEN_PAL, fr, r.senDir, r.senT > 0, false, 1);
    if (r.senT > 0 && r.senDir && r.senDir !== 'pass') voxelArrow(ARW_X, SEN_Y - 10, r.senDir, 34, C.gold, C.goldL, C.goldR);
    drawRows(r);
    var white = r.stunT > 0 || r.stopT > 0;
    var rookFrame = (white || (result && !ok)) ? CREW_OOPS : fr;
    if (!senTurn && r.t >= 0 && !result) game.draw.circle(ROOK_X, ROOK_Y, 130, C.cyan, 0.12 + r.beatFlash * 0.12);
    drawCrew(ROOK_X, ROOK_Y, ROOK_PAL, rookFrame, r.rookDir, r.rookT > 0, white, white ? 1.3 : 1);
    if (r.rookT > 0 && r.rookDir && !white) voxelArrow(ARW_X, ROOK_Y - 10, r.rookDir, 28, C.cyan, C.cyanL, C.cyanR, 0.9);
    drawDial(r);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 220, C.ink, 0.6);
    txt('SCORE ' + r.score, 50, 80, 42, C.cubeT, 'left');
    for (var i = 0; i < MISS_MAX; i++) {
      if (i < r.lives) cube(W - 90 - i * 80, 50, 26, C.cyan, C.cyanL, C.cyanR);
      else cube(W - 90 - i * 80, 50, 26, C.dim, C.wall, C.wall2, 0.5);
    }
    var progress = Math.max(0, Math.min(1, r.t / SONG_LEN));
    game.draw.rect(50, 128, W - 100, 16, C.wall);
    game.draw.rect(50, 128, (W - 100) * progress, 16, C.gold);
    for (var k = 1; k < r.rounds * 2; k++) game.draw.rect(50 + (W - 100) * k / (r.rounds * 2) - 1, 124, 3, 24, k % 2 === 0 ? C.white : C.dim);
    var bInBar = ((Math.floor(r.t / SPB) % 4) + 4) % 4;
    for (var b = 0; b < 4; b++) {
      var on = b === bInBar && r.t >= 0;
      game.draw.circle(W / 2 - 105 + b * 70, 190, on ? 13 + r.beatFlash * 6 : 10, on ? C.gold : C.dim);
    }
    if (r.combo >= 2) txt(r.combo + ' COMBO', 50, 204, 30, C.good, 'left');
  }

  // ── ATTRACT 実演(実ロジックで1往復: 2回正しく返し、3回目はわざと逆へ払って外す) ──
  var DEMO_ROUND = [[0, 1, 2]];
  var DEMO_DIRS = [['up', 'right', 'down']];
  var DEMO_SW = ['up', 'right', 'left'];
  var DEMO_CYC = 8 * SPB;
  var demo = { t: 0, run: null, i: 0, hx: DIAL_X, hy: DIAL_Y, swipeT: 0, sdir: 'up' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt || !demo.run) {
      demo.run = makeRun(DEMO_ROUND, 0, DEMO_DIRS);
      demo.run.demo = true; demo.run.lives = 99; demo.i = 0;
      startBgm();
    }
    var r = demo.run;
    stepRun(r, dt);
    if (demo.i < r.slots.length) {
      var s = r.slots[demo.i];
      if (r.t >= s.t - 0.1 && demo.swipeT <= 0) { demo.swipeT = 0.2; demo.sdir = DEMO_SW[demo.i]; }
      if (r.t >= s.t) { doSwipe(r, DEMO_SW[demo.i], r.t + SWIPE_LAG); demo.i++; }
    }
    if (demo.swipeT > 0) {
      demo.swipeT -= dt;
      var k = 1 - Math.max(0, demo.swipeT) / 0.2, v = VEC[demo.sdir];
      demo.hx = DIAL_X + v[0] * 200 * k; demo.hy = DIAL_Y - 20 + v[1] * 160 * k;
    } else {
      demo.hx += (DIAL_X - demo.hx) * Math.min(1, dt * 8);
      demo.hy += (DIAL_Y - 20 - demo.hy) * Math.min(1, dt * 8);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.7);
      game.audio.stopBgm();
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) {
      if (!endSent) sendEnd();
      game.audio.play('se_tap', 0.5);
      state = S.ATTRACT; initGame(); demo.t = 0; demo.run = null;
      return;
    }
    if (state === S.PLAYING && run && run.t >= 0) game.audio.tone(220, 0.04, { wave: 'triangle', volume: 0.04 });
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || !run || run.t < -0.3) return;
    if (!run.over) game.audio.tone(dir === 'up' || dir === 'right' ? 880 : 587, 0.05, { wave: 'square', volume: 0.05, slide: 200 });
    doSwipe(run, dir, run.t);
  });

  game.onUpdate(function(dt) {
    if (dt > 0.1) dt = 0.1;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.run, false);
      game.draw.hand(demo.hx, demo.hy, { press: demo.swipeT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.055, 80, C.gold);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 36, C.cubeT);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, C.white);
      return;
    }

    if (state === S.PLAYING) {
      stepRun(run, dt);
      drawScene(run, false);
      drawHud(run);
      if (run.t < 0) txt(run.t < -SPB ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.gold);
      return;
    }

    // RESULT
    resultT += dt;
    drawScene(run, true);
    game.draw.rect(0, H * 0.06, W, H * 0.33, C.ink, 0.7);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 96, ok ? C.good : C.danger);
    txt('SCORE ' + (ok ? run.score : 0), W / 2, H * 0.19, 56, C.white);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.245, 34, C.cubeT);
    txt(run.maxCombo + ' COMBO', W / 2, H * 0.29, 34, C.good);
    txt('BEST ' + Math.max(game.best, ok ? run.score : 0), W / 2, H * 0.335, 36, C.gold);
    if (!ok) {
      var left = 0;
      for (var i = 0; i < run.slots.length; i++) if (!run.slots[i].done) left++;
      txt('あと' + Math.max(1, left) + '回!', W / 2, H * 0.375, 44, C.gold);
    } else if (newRecord && Math.floor(game.time.elapsed * 3) % 2 === 0) {
      txt('NEW RECORD', W / 2, H * 0.375, 48, C.gold);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 34, C.white);
    if (resultT >= RESULT_HOLD) sendEnd();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startBgm();
  });
})(game);
