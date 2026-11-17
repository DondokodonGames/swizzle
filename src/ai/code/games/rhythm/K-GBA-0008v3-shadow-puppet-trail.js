// K-GBA-0008v3-shadow-puppet-trail.js
// 影絵の一拍遅れ — 師匠の光点が裏拍ごとに跳ぶ。光が離れたその裏拍に、自分の人形をその場所へ滑り込ませて一拍遅れで追う
// 操作: 画面をドラッグすると人形(棒の先)が同じ向きに動く。光点がいる間はその円に入らず待ち、光点が次へ跳んだ裏拍の瞬間に空いた円へ入る
// 終わり: 6小節(16秒)を追い切れば成功。3回外す(遅れる/光点に重なる)と失敗
// @mechanic: drag_follow
// @theme: shadow_puppet_offbeat_trail
// 世界観: 影絵芝居の幕の裏。師匠が裏拍ごとに光点を動かし、人形遣いの弟子は一拍遅れでその跡へ自分の人形を運んで影を映し、師匠の影の後を追う
// 残るもの: 正誤(CLEAR/GAME OVER) + SCORE(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。太さ違いの線を重ねて発光させ、面は塗らない
  var STYLE = { bg: ['#02030a', '#070a18'], main: ['#40f0ff', '#ffb040'], accent: ['#ff4060', '#f0f0ff'] };
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], cyan: STYLE.main[0], amber: STYLE.main[1],
    danger: STYLE.accent[0], white: STYLE.accent[1], good: '#60ff90', dim: '#2a4a6a', ink: '#000000',
  };

  var GAME_TITLE = 'SHADOW TRAIL';
  var BPM = 90;
  var SPB = 60 / BPM;            // 1拍 ≒ 0.667秒
  var BEATS = 24;
  var TIME_LIMIT = 16;           // 6小節
  var SONG_LEN = BEATS * SPB;
  var COUNT_IN = 2 * SPB;
  var NL = 22;                   // 光点の数(裏拍ごとに1つ)
  var PERF_W = 0.09, GOOD_W = 0.2;
  var ZONE_R = 95, ZONE_IN = 58;
  var STUN_T = 0.3, FINAL_STOP = 0.5, LIVES = 3, RESULT_HOLD = 2.0, GAIN = 1.25;
  var GX = [W * 0.24, W * 0.5, W * 0.76], GYS = [H * 0.27, H * 0.41, H * 0.55];
  var HOME = { x: W * 0.5, y: H * 0.645 };
  var CUR = { x0: 50, x1: W - 50, y0: H * 0.145, y1: H * 0.68 };
  var LAMP_Y = H * 0.715;
  var INTRO = [3, 1, 5];         // 最初の2小節: 左中・上中・右中 を巡る

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null, ok = false, resultT = 0, endSent = false, newRecord = false;

  // ── 影絵人形(中抜きのドット絵を発光色で) ─────────────────────
  var MAS_A = [
    '...#####...',
    '....###....',
    '....#E#....',
    '....###....',
    '.#..###..#.',
    '..#######..',
    '....###....',
    '....###....',
    '...#...#...',
    '..#.....#..',
  ];
  var MAS_B = [
    '...#####...',
    '....###....',
    '....#E#....',
    '#...###...#',
    '.#..###..#.',
    '..#######..',
    '....###....',
    '....###....',
    '...#...#...',
    '...#...#...',
  ];
  var APP_A = [
    '...##...',
    '..#E.#..',
    '...##...',
    '#..##..#',
    '.######.',
    '...##...',
    '..#..#..',
    '.#....#.',
  ];
  var APP_B = [
    '#..##..#',
    '.##E.##.',
    '...##...',
    '...##...',
    '.######.',
    '...##...',
    '..#..#..',
    '..#..#..',
  ];
  var MAS_PAL = { '#': STYLE.main[0], E: '#ffffff' };
  var APP_PAL = { '#': STYLE.main[1], E: '#ffffff' };
  var WHITE_PAL = { '#': '#ffffff', E: '#ffffff' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ── ベクター描画(線を3回重ねて発光) ─────────────────────────
  function vline(x1, y1, x2, y2, col, w) {
    var ww = w || 3;
    game.draw.line(x1, y1, x2, y2, col + '30', ww * 4);
    game.draw.line(x1, y1, x2, y2, col + '80', ww * 2);
    game.draw.line(x1, y1, x2, y2, col, ww);
  }
  function vcircle(x, y, r, col, w, seg, spin) {
    var n = seg || 20, s0 = spin || 0;
    for (var i = 0; i < n; i++) {
      var a0 = s0 + i / n * Math.PI * 2, a1 = s0 + (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w || 3);
    }
  }
  function vring(x, y, r, col, w) { vcircle(x, y, r, col + '40', (w || 3) * 3); vcircle(x, y, r, col, w || 3); }
  function vrect(x0, y0, x1, y1, col, w) {
    vline(x0, y0, x1, y0, col, w); vline(x1, y0, x1, y1, col, w);
    vline(x1, y1, x0, y1, col, w); vline(x0, y1, x0, y0, col, w);
  }

  // ── 伴奏(表拍はベースだけ、メロディは裏拍に乗る固有メロディ) ───────
  var BGM_LEAD = [['R', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['G5', 0.5],
                  ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.5], ['R', 0.5], ['C5', 0.5], ['R', 0.5], ['D5', 0.5]];
  var BGM_BASS = [['A2', 0.5], ['R', 0.5], ['A2', 0.5], ['R', 0.5], ['F2', 0.5], ['R', 0.5], ['G2', 0.5], ['R', 0.5],
                  ['A2', 0.5], ['R', 0.5], ['E2', 0.5], ['R', 0.5], ['F2', 0.5], ['R', 0.5], ['E2', 0.5], ['R', 0.5]];
  function startBgm() {
    game.audio.melody(BGM_LEAD, { tempo: BPM, wave: 'triangle', volume: 0.07, loop: true, bass: BGM_BASS, bassWave: 'square', bassVolume: 0.05 });
  }

  // ── 光点の並び ─────────────────────────────────────────────
  function cellPos(c) { return { x: GX[c % 3], y: GYS[Math.floor(c / 3)] }; }
  function genCells(n) {
    var out = [];
    for (var j = 0; j < n; j++) {
      if (j < 8) { out.push(INTRO[j % 3]); continue; }
      var far = j >= 15, c, tries = 0, good = false;
      while (!good) {
        c = Math.floor(game.random(0, 9)) % 9; tries++;
        var prev = out[j - 1];
        var dist = Math.max(Math.abs(c % 3 - prev % 3), Math.abs(Math.floor(c / 3) - Math.floor(prev / 3)));
        good = c !== out[j - 1] && c !== out[j - 2] && ((far ? dist >= 2 : dist <= 1) || tries > 30);
      }
      out.push(c);
    }
    return out;
  }

  // ── 1回分の芝居(本番とATTRACT実演で同じロジック) ───────────────
  function makeRun(cells, t0) {
    var r = { t: t0, tg: [], lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0,
      px: HOME.x, py: HOME.y, stunT: 0, stopT: 0, eIdx: -99, beatFlash: 0, offFlash: 0, pend: null,
      demo: false, bgmCue: false, over: false, drag: null, frame: 0 };
    for (var j = 0; j < cells.length; j++) {
      var p = cellPos(cells[j]);
      r.tg.push({ j: j, x: p.x, y: p.y, tOn: (j + 0.5) * SPB, tHit: (j + 1.5) * SPB, done: false, res: '', hitT: 0,
        chimed: false, startIn: null, row: Math.floor(cells[j] / 3) });
    }
    return r;
  }
  function initGame() {
    run = makeRun(genCells(NL), -COUNT_IN);
    ok = false; resultT = 0; endSent = false; newRecord = false;
  }

  function hitTg(r, g, d) {
    g.done = true;
    var perfect = d <= PERF_W;
    g.res = perfect ? 'P' : 'G';
    r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfect++; else r.good++;
    r.score += (perfect ? 100 : 50) + Math.min(10, r.combo) * 5;
    game.feedback.good(g.x, g.y - 130, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.amber : C.good, volume: r.demo ? 0.25 : 0.6 });
    if (!r.demo && r.combo % 8 === 0) {
      game.fx.popup(r.combo + ' COMBO', W / 2, H * 0.2, { color: C.amber, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }
  function missTg(r, g) {
    g.done = true; g.res = 'M'; g.hitT = STUN_T + 0.12;
    r.miss++; r.combo = 0; r.lives--;
    r.pend = { x: r.px, y: r.py };
    game.audio.tone(100, 0.18, { wave: 'sawtooth', volume: r.demo ? 0.05 : 0.13 });
    if (r.lives <= 0 && !r.demo) { r.over = true; r.stopT = FINAL_STOP; game.audio.stopBgm(); }
    else r.stunT = STUN_T;
  }
  function badNow(r) {
    var p = r.pend; r.pend = null;
    if (p) game.feedback.bad(p.x, p.y, { text: 'MISS', volume: r.demo ? 0.3 : 0.9 });
  }

  function stepRun(r, dt) {
    if (r.stopT > 0) {            // 3回目のミス: 幕ごと止める hit-stop
      r.stopT -= dt;
      if (r.stopT <= 0) { badNow(r); finish(false); }
      return;
    }
    r.t += dt;
    var ei = Math.floor(r.t / (SPB / 2));
    if (ei !== r.eIdx) {
      r.eIdx = ei;
      var down = ((ei % 2) + 2) % 2 === 0;
      if (down) { r.beatFlash = 1; r.frame++; } else r.offFlash = 1;
      if (r.t < 0) { if (down && !r.demo) game.audio.tone(ei === -2 ? 1320 : 880, 0.08, { wave: 'square', volume: 0.09 }); }
      else if (down && r.t < SONG_LEN) game.audio.tone(330, 0.03, { wave: 'triangle', volume: r.demo ? 0.015 : 0.03 });
    }
    if (!r.demo && !r.bgmCue && r.t >= -0.06) { r.bgmCue = true; startBgm(); }
    for (var i = 0; i < r.tg.length; i++) {
      var g = r.tg[i];
      if (!g.chimed && r.t >= g.tOn) {       // 裏拍: 師匠の光点が跳ぶ音
        g.chimed = true;
        game.audio.tone(['E6', 'C6', 'A5'][g.row], 0.09, { wave: 'sine', volume: r.demo ? 0.03 : 0.08 });
      }
      if (!g.done && r.t >= g.tOn) {
        var dx = r.px - g.x, dy = r.py - g.y, d = Math.sqrt(dx * dx + dy * dy);
        if (g.startIn === null) g.startIn = d < ZONE_IN;
        if (r.t < g.tHit - GOOD_W) {
          if (d < ZONE_IN && !g.startIn && r.stunT <= 0) missTg(r, g);      // 光点がいる円に入った = 早すぎ
          else if (d >= ZONE_IN) g.startIn = false;
        } else if (r.t <= g.tHit + GOOD_W) {
          if (d <= ZONE_R) hitTg(r, g, Math.abs(r.t - g.tHit));
        } else missTg(r, g);
      }
      if (g.hitT > 0) g.hitT -= dt;
      if (r.stopT > 0) return;
    }
    if (r.stunT > 0) {
      r.stunT -= dt;
      if (r.stunT <= 0) { badNow(r); if (r.drag) { r.drag.fx = r.drag.lx; r.drag.fy = r.drag.ly; r.drag.px = r.px; r.drag.py = r.py; } }
    }
    r.beatFlash = Math.max(0, r.beatFlash - dt * 3.5);
    r.offFlash = Math.max(0, r.offFlash - dt * 3.5);
    if (!r.demo && !r.over && r.t >= SONG_LEN + 0.2) { r.over = true; finish(true); }
  }

  function movePuppet(r, x, y) {
    if (r.stunT > 0 || r.stopT > 0 || r.over) return;
    r.px = Math.max(90, Math.min(W - 90, x));
    r.py = Math.max(H * 0.19, Math.min(H * 0.655, y));
  }

  function finish(cleared) {
    if (state !== S.PLAYING) return;
    ok = cleared;
    state = S.RESULT; resultT = 0; endSent = false;
    newRecord = cleared && run.score > game.best;
    game.audio.stopBgm();
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.6);
    if (cleared) game.fx.burst(run.px, run.py, { color: C.amber, count: 30, speed: 520 });
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.47, { color: C.amber, size: 72 });
  }
  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, lights: NL };
    if (ok) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 描画 ─────────────────────────────────────────────────
  function curLight(r) {
    for (var i = 0; i < r.tg.length; i++) if (r.t >= r.tg[i].tOn && r.t < r.tg[i].tHit) return r.tg[i];
    return null;
  }

  function drawStage(r) {
    game.draw.gradient(0, H, [[0, C.bg0], [0.4, C.bg1], [1, C.bg0]]);
    // 幕(枠 + 布のひだ)
    for (var f = 1; f < 12; f++) {
      var fx = CUR.x0 + (CUR.x1 - CUR.x0) * f / 12 + Math.sin(game.time.elapsed * 0.8 + f) * 4;
      game.draw.line(fx, CUR.y0 + 8, fx, CUR.y1 - 8, C.dim, 2);
    }
    vrect(CUR.x0, CUR.y0, CUR.x1, CUR.y1, C.cyan, 3);
    // 幕上の灯(表拍で脈打つ)
    var lx = W / 2, ly = CUR.y0 - 6;
    vring(lx, ly, 26 + r.beatFlash * 10, C.white, 3);
    for (var k = 0; k < 8; k++) {
      var a = Math.PI * (0.15 + 0.7 * k / 7);
      vline(lx + Math.cos(a) * 40, ly + Math.sin(a) * 40, lx + Math.cos(a) * (60 + r.beatFlash * 24), ly + Math.sin(a) * (60 + r.beatFlash * 24), C.white, 2);
    }
    // 光点の置き場(9か所)
    for (var c = 0; c < 9; c++) {
      var p = cellPos(c);
      game.draw.line(p.x - 14, p.y, p.x + 14, p.y, C.dim, 3);
      game.draw.line(p.x, p.y - 14, p.x, p.y + 14, C.dim, 3);
    }
  }

  function drawLights(r) {
    var g = curLight(r);
    var t = game.time.elapsed;
    // 直前に追えた跡: 弟子の影が映る
    for (var i = 0; i < r.tg.length; i++) {
      var h = r.tg[i];
      if (h.res === 'P' || h.res === 'G') {
        var age = r.t - h.tHit;
        if (age >= 0 && age < SPB) vcircle(h.x, h.y, ZONE_R + age * 80, h.res === 'P' ? C.amber : C.good, 3, 18);
      }
      if (h.res === 'M' && h.hitT > 0) { vring(h.x, h.y, ZONE_R * 1.3, C.white, 6); vring(h.x, h.y, ZONE_IN, C.danger, 4); }
    }
    if (!g) return;
    var k = Math.max(0, Math.min(1, (r.t - g.tOn) / SPB));
    var open = r.t >= g.tHit - GOOD_W;
    // 灯から光点への光線
    vline(W / 2, CUR.y0 + 20, g.x, g.y - 70, C.cyan, 2);
    // 師匠の影(光点)
    game.draw.sprite(r.frame % 2 === 0 ? MAS_A : MAS_B, MAS_PAL, g.x, g.y - 6, 13, { anchor: 'center', alpha: 0.35 });
    game.draw.sprite(r.frame % 2 === 0 ? MAS_A : MAS_B, MAS_PAL, g.x, g.y - 6, 11, { anchor: 'center' });
    // 入ってはいけない内円(赤いトゲ) → 裏拍が近づくと開いて琥珀の入口に変わる
    if (!open) {
      vcircle(g.x, g.y, ZONE_IN, C.danger, 3, 16, t);
      for (var s = 0; s < 8; s++) {
        var a = s / 8 * Math.PI * 2 + t;
        game.draw.line(g.x + Math.cos(a) * ZONE_IN, g.y + Math.sin(a) * ZONE_IN, g.x + Math.cos(a) * (ZONE_IN + 18), g.y + Math.sin(a) * (ZONE_IN + 18), C.danger, 3);
      }
    } else {
      vring(g.x, g.y, ZONE_R, C.amber, 4);
    }
    // 次の裏拍へ縮むリング(閉じた瞬間 = 光点が離れて入る拍)
    vcircle(g.x, g.y, ZONE_R + (1 - k) * 150, k > 0.7 ? C.amber : C.white, 3, 24);
  }

  function drawPuppet(r, result) {
    var white = r.stunT > 0 || r.stopT > 0;
    var sc = white ? 1.3 : 1;
    // 棒(下から差し込む人形遣いの棒)と手元の握り
    vline(r.px, r.py + 40, r.px * 0.7 + W * 0.15, H * 0.78, C.amber, 2);
    vring(r.px * 0.7 + W * 0.15, H * 0.78, 18, C.amber, 3);
    var fr = (result && !ok) ? APP_B : (r.frame % 2 === 0 ? APP_A : APP_B);
    game.draw.sprite(fr, white ? WHITE_PAL : APP_PAL, r.px, r.py, 13 * sc, { anchor: 'center', alpha: 0.3 });
    game.draw.sprite(fr, white ? WHITE_PAL : APP_PAL, r.px, r.py, 11 * sc, { anchor: 'center' });
  }

  function drawLamps(r) {
    var ei = ((r.eIdx % 8) + 8) % 8;
    for (var k = 0; k < 8; k++) {
      var x = W / 2 + (k - 3.5) * 104;
      var off = k % 2 === 1;
      var on = k === ei && r.t >= 0;
      if (off) vring(x, LAMP_Y, on ? 26 : 18, on ? C.amber : '#7a5a20', on ? 5 : 3);
      else vcircle(x, LAMP_Y, on ? 14 : 10, on ? C.cyan : C.dim, 3, 10);
    }
    // 親指ゾーンのドラッグ面(角括弧)
    var y0 = H * 0.81, y1 = H * 0.95, x0 = 110, x1 = W - 110;
    vline(x0, y0, x0 + 60, y0, C.dim, 3); vline(x0, y0, x0, y0 + 60, C.dim, 3);
    vline(x1, y0, x1 - 60, y0, C.dim, 3); vline(x1, y0, x1, y0 + 60, C.dim, 3);
    vline(x0, y1, x0 + 60, y1, C.dim, 3); vline(x0, y1, x0, y1 - 60, C.dim, 3);
    vline(x1, y1, x1 - 60, y1, C.dim, 3); vline(x1, y1, x1, y1 - 60, C.dim, 3);
  }

  function drawHud(r) {
    txt('SCORE ' + r.score, 50, 76, 42, C.white, 'left');
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 80 - i * 80;
      if (i < r.lives) vring(lx, 60, 22, C.amber, 3); else vcircle(lx, 60, 22, C.dim, 3, 12);
    }
    var progress = Math.max(0, Math.min(1, r.t / SONG_LEN));
    vline(50, 136, W - 50, 136, C.dim, 2);
    vline(50, 136, 50 + (W - 100) * progress, 136, C.cyan, 4);
    if (r.combo >= 2) txt(r.combo + ' COMBO', 50, 196, 30, C.good, 'left');
  }

  // ── ATTRACT 実演(実ロジック: 拍どおりに追う成功 + 1回早すぎて光点に重なる失敗) ──
  var DEMO_CELLS = [3, 1, 5, 7, 3, 1, 5, 7];
  var DEMO_CYC = 8 * SPB;
  var demo = { t: 0, run: null, from: null, to: null, mt0: 0, mt1: 0, i: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt || !demo.run) {
      demo.run = makeRun(DEMO_CELLS, 0);
      demo.run.demo = true; demo.run.lives = 99; demo.i = 0; demo.from = null;
      startBgm();
    }
    var r = demo.run;
    stepRun(r, dt);
    // 次の目標へ: 普段は裏拍の0.25秒前に動き出して裏拍ちょうどに着く。3つ目だけ早すぎ(光点に重なる)
    if (demo.i < r.tg.length) {
      var g = r.tg[demo.i];
      var early = demo.i === 2;
      var start = early ? g.tOn + 0.05 : g.tHit - 0.25, arrive = early ? g.tOn + 0.3 : g.tHit + 0.01;
      if (r.t >= start && !demo.from) { demo.from = { x: r.px, y: r.py }; demo.mt0 = start; demo.mt1 = arrive; }
      if (demo.from) {
        var k = Math.max(0, Math.min(1, (r.t - demo.mt0) / (demo.mt1 - demo.mt0)));
        var e = k * k * (3 - 2 * k);
        movePuppet(r, demo.from.x + (g.x - demo.from.x) * e, demo.from.y + (g.y - demo.from.y) * e);
        if (k >= 1 && (g.done || r.t > g.tHit + 0.05)) { demo.from = null; demo.i++; }
      }
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
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !run) return;
    run.drag = { fx: x, fy: y, px: run.px, py: run.py, lx: x, ly: y };
    if (!run.over) game.audio.tone(523, 0.04, { wave: 'triangle', volume: 0.05 });
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !run || !run.drag) return;
    var dg = run.drag;
    dg.lx = x; dg.ly = y;
    if (run.t < -0.3) return;
    movePuppet(run, dg.px + (x - dg.fx) * GAIN, dg.py + (y - dg.fy) * GAIN);
    if (!run.over && game.time.elapsed - (dg.fxT || 0) > 0.12) {   // 動かした人形に残光の火の粉
      dg.fxT = game.time.elapsed;
      game.fx.burst(run.px, run.py + 30, { color: C.amber, count: 2, speed: 70 });
    }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !run) return;
    if (run.drag && !run.over) game.audio.tone(392, 0.04, { wave: 'triangle', volume: 0.04 });
    run.drag = null;
  });

  game.onUpdate(function(dt) {
    if (dt > 0.1) dt = 0.1;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var r = demo.run;
      drawStage(r);
      drawLights(r);
      drawPuppet(r, false);
      drawLamps(r);
      game.draw.hand(W / 2 + (r.px - W / 2) * 0.8, H * 0.8 + (r.py - H * 0.41) * 0.6, { press: demo.from !== null, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.055, 80, C.cyan);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 36, C.amber);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.amber);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, C.white);
      return;
    }

    if (state === S.PLAYING) {
      stepRun(run, dt);
      drawStage(run);
      drawLights(run);
      drawPuppet(run, false);
      drawLamps(run);
      drawHud(run);
      if (run.t < 0) txt(run.t < -SPB ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.amber);
      return;
    }

    // RESULT
    resultT += dt;
    drawStage(run);
    drawPuppet(run, true);
    drawLamps(run);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 96, ok ? C.good : C.danger);
    txt('SCORE ' + (ok ? run.score : 0), W / 2, H * 0.19, 56, C.white);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.245, 34, C.cyan);
    txt(run.maxCombo + ' COMBO', W / 2, H * 0.29, 34, C.good);
    txt('BEST ' + Math.max(game.best, ok ? run.score : 0), W / 2, H * 0.335, 36, C.amber);
    if (!ok) {
      var left = 0;
      for (var i = 0; i < run.tg.length; i++) if (!run.tg[i].done) left++;
      txt('あと' + Math.max(1, left) + '回!', W / 2, H * 0.375, 44, C.amber);
    } else if (newRecord && Math.floor(game.time.elapsed * 3) % 2 === 0) {
      txt('NEW RECORD', W / 2, H * 0.375, 48, C.amber);
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
