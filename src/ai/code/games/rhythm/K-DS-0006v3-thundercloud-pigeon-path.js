// K-DS-0006v3-thundercloud-pigeon-path.js
// 雷雲の鳩みち — 羽ばたきの拍ごとに一区画ずつ、雷雲の隙間の細い道へ伝書鳩の群れを指でなぞって通す。途中で拍型が4拍子の「1拍1マス」から3拍子の「進む・進む・休む」へ切り替わる
// 操作: 先頭の鳩(道の上で光るマス)を押さえ、指を離さずに道に沿ってなぞる。次のマスは黄色い枠が縮んでマスに重なる拍の頭に入るとPERFECT、少しずれるとGOOD(早く着いたら境目で待たされ、拍の頭にGOODで入る)。間に合わないとMISSで群れが風に流されて1マス進む。指が雷雲のマスに入ると感電してMISS(近づくと雲が赤く光ってバチバチ鳴る)。前半4小節は1拍1マス、5小節目から3拍子で2マス進んで1拍休む。切り替わりの1小節前に雷鳴が鳴り、画面の枠と拍子の表示が点滅し、下の拍の帯に新しい型(紫)が流れてくる
// 終わり: 10小節(約19秒・28マス)を通して右上の鳩舎に着けばCLEAR。手紙4通を全部落とす(MISS4回)とGAME OVER
// @mechanic: guide_path
// @theme: thundercloud_pigeon_path_medley
// 世界観: 雷雲の立ちこめる高空で、手紙を運ぶ伝書鳩の先導役が、羽ばたきの拍ごとに雲の隙間の細い通り道を一区画ずつ縫って群れを導き、山の上の鳩舎まで手紙を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・届けた手紙の数・最大コンボ
// スタイル: 8bit PC MONITOR
var STYLE = { bg: ['#000008', '#000044'], main: ['#ffffff', '#00ffff', '#2040ff'], accent: ['#ffff00', '#ff00ff'] };

(function (game) {
  // 8bit PC MONITOR: 8色ベタ・細い線・テキスト枠のUI。雷雲は市松ディザで中間色を作る
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    black: '#000000', navy: STYLE.bg[1], white: STYLE.main[0], cyan: STYLE.main[1], blue: STYLE.main[2],
    yellow: STYLE.accent[0], magenta: STYLE.accent[1], red: '#ff2020', green: '#20ff40', cloud: '#1820a0', cloudL: '#9098ff', gray: '#606080'
  };

  var GAME_TITLE = 'PIGEON PATH';
  var BPM = 120;
  var SPB = 60 / BPM;
  var SWITCH_BEAT = 20;          // ここから3拍子
  var SONG_BEATS = 38;
  var TIME_LIMIT = 20;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.15;
  var MISS_MAX = 4;
  var HIT_STOP = 0.4;
  var COLS = 7, ROWS = 9, CS = 124, X0 = 106, Y0 = 300;

  // ---- 雲の隙間の道(0 = スタート、最後 = 鳩舎の前) ----
  var PATH = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [1, 5], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [5, 3],
    [5, 2], [4, 2], [3, 2], [2, 2], [1, 2], [1, 1], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]];
  var ENTRY = [];                // ENTRY[e - 1] = PATH[e] に入る拍
  for (var ea = 4; ea < SWITCH_BEAT; ea++) ENTRY.push(ea);
  for (var eb = 0; eb < 6; eb++) { ENTRY.push(SWITCH_BEAT + eb * 3); ENTRY.push(SWITCH_BEAT + 1 + eb * 3); }
  var LAST = PATH.length - 1;
  var GRID = [];
  for (var gr = 0; gr < ROWS; gr++) { GRID.push([]); for (var gc = 0; gc < COLS; gc++) GRID[gr].push(-1); }
  for (var gp = 0; gp < PATH.length; gp++) GRID[PATH[gp][1]][PATH[gp][0]] = gp;

  function cellAt(x, y) {
    var c = Math.floor((x - X0) / CS), r = Math.floor((y - Y0) / CS);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return { c: c, r: r, i: GRID[r][c] };
  }
  function cellCenter(i) { return { x: X0 + PATH[i][0] * CS + CS / 2, y: Y0 + PATH[i][1] * CS + CS / 2 }; }
  function isCloud(c, r) { return c < 0 || r < 0 || c >= COLS || r >= ROWS || GRID[r][c] < 0; }

  // ---- 伴奏(オリジナル): 前半は4拍子の行進、後半は3拍子 ----
  var BARS = [0, 4, 8, 12, 16, 20, 23, 26, 29, 32, 35];
  var MEL = [null,
    [['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1]],
    [['F5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1]],
    [['D5', 1], ['F5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1]],
    [['G4', 1], ['B4', 1], ['D5', 1], ['G5', 1]],
    [['A4', 2], ['C5', 1]], [['E5', 2], ['D5', 1]], [['C5', 1], ['B4', 1], ['A4', 1]],
    [['E5', 2], ['G#4', 1]], [['A4', 1], ['C5', 1], ['E5', 1]], [['A5', 3]]];
  var BASSN = [['C3', 'G3'], ['C3', 'G3'], ['F2', 'C3'], ['D3', 'A2'], ['G2', 'D3'],
    ['A2', 'E3', 'C4'], ['A2', 'E3', 'C4'], ['F2', 'C3', 'A3'], ['E2', 'B2', 'G#3'], ['A2', 'E3', 'C4'], ['A2', 'E3', 'A3']];

  // ---- ドット絵 ----
  var PIG_A = [
    '.W.......W..',
    '.WW.....WW..',
    '..WW...WW...',
    '...WgggW....',
    '..gggggggr..',
    '.ggggggggyy.',
    '..ggggggg...',
    '....l.E.....'
  ];
  var PIG_B = [
    '............',
    '............',
    '....ggg.....',
    '..gggggggr..',
    '.ggggggggyy.',
    '.WWgggggWW..',
    'WW.l..E..WW.',
    'W.........W.'
  ];
  var PPAL = { W: C.white, g: '#c0c0ff', r: C.red, y: C.yellow, l: C.magenta, E: C.yellow };
  var PPAL_HIT = { W: C.white, g: C.white, r: C.white, y: C.white, l: C.white, E: C.white };
  var ENV = ['yyyyyyy', 'yy...yy', 'y.y.y.y', 'y..y..y', 'yyyyyyy'];
  var EPAL = { y: C.yellow };
  var EPAL_OFF = { y: C.gray };
  var LOFT = ['....mm....', '..mmmmmm..', 'mmmmmmmmmm', '.wwwwwwww.', '.ww.yy.ww.', '.ww.yy.ww.', '.wwwwwwww.', '...w..w...'];
  var LPAL = { m: C.magenta, w: C.white, y: C.yellow };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, lampT, flashT, swFlash;
  var pos, tweenFrom, tweenT, grabbed, lost, finger, lastCellI, res, zapT, zapX, zapY, warn, crackT, bonkT, boltT, boltCell;
  var score, combo, maxCombo, perfects, goods, misses, hits, over, won, outroT, prevBest, milestone, arrived;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; flashT = 0; swFlash = 0;
    pos = 0; tweenFrom = 0; tweenT = 0; grabbed = false; lost = false;
    finger = { x: cellCenter(0).x, y: cellCenter(0).y };
    lastCellI = 0; res = []; zapT = 0; zapX = 0; zapY = 0; warn = []; crackT = 0; bonkT = 0; boltT = 0; boltCell = -1;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false; arrived = false;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function playBar(b) {
    if (!armed || b >= BARS.length) return;
    var n = BASSN[b], a = b < 5;
    var bass = a ? [[n[0], 1], [n[1], 1], [n[0], 1], [n[1], 1]] : [[n[0], 1], [n[1], 1], [n[2], 1]];
    game.audio.melody(MEL[b] || [['R', 4]], { tempo: BPM, wave: a ? 'square' : 'triangle', volume: (a ? 0.035 : 0.07) * vol(), bass: bass, bassWave: a ? 'triangle' : 'square', bassVolume: (a ? 0.09 : 0.03) * vol() });
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= SONG_BEATS) { if (!demoMode) finish(misses < MISS_MAX); return; }
    lampT = 1;
    if (k < 4) { tone(k === 0 ? 1568 : 1046, 0.04, { wave: 'square', volume: 0.05 * vol() }); return; }
    if (k === SWITCH_BEAT - 4) {
      // 切り替えの予告: 遠雷 + 枠の点滅
      tone(110, 0.9, { wave: 'sawtooth', volume: 0.05 * vol(), slide: -60 });
      if (!demoMode) game.audio.play('se_powerup', 0.35);
    }
    if (k === SWITCH_BEAT) {
      swFlash = 0.5;
      tone(1800, 0.06, { wave: 'square', volume: 0.04 * vol(), slide: -1500 });
      tone(90, 0.5, { wave: 'sawtooth', volume: 0.05 * vol(), slide: -40 });
    }
    // 飾りの稲光(雲のマスがときどき光る)
    if (k % 3 === 1) { boltCell = (k * 11) % (COLS * ROWS); boltT = 0.18; }
  }

  function isRestBeat(k) { return k >= SWITCH_BEAT && (k - SWITCH_BEAT) % 3 === 2; }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); if (!running) return; }
    songT = beatN * SPB + beatT;
    if (nextBar < BARS.length && songT >= BARS[nextBar] * SPB - 0.06) { playBar(nextBar); nextBar++; }
    if (pos >= LAST) return;
    var e = pos + 1, T = ENTRY[e - 1] * SPB;
    if (grabbed && !lost) {
      var fc = cellAt(finger.x, finger.y);
      if (fc && fc.i === e && songT >= T - GOOD_W) { enter(e, songT - T); return; }
    }
    if (songT > T + GOOD_W) lateMiss(e);
  }

  function enter(e, off) {
    var perfect = Math.abs(off) <= PERFECT_W;
    var p = cellCenter(e);
    res[e] = perfect ? 'perfect' : 'good';
    tweenFrom = pos; tweenT = 0.12; pos = e;
    hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    var mul = ENTRY[e - 1] >= SWITCH_BEAT ? 1.5 : 1;
    score += Math.round((perfect ? 100 + Math.min(combo, 10) * 10 : 50) * mul);
    var vv = armed ? (perfect ? 0.2 : 0.15) : 0.001;
    if (perfect) { perfects++; game.feedback.good(p.x, p.y - 70, { text: 'PERFECT', color: C.yellow, size: 48, count: 10, volume: vv }); }
    else { goods++; game.feedback.good(p.x, p.y - 70, { text: 'GOOD', color: C.cyan, size: 44, count: 6, volume: vv }); }
    tone(perfect ? 1318 : 988, 0.05, { wave: 'square', volume: 0.04 * vol(), slide: 300 });   // 羽音
    if (combo >= 5 && combo % 5 === 0) game.fx.popup('x' + combo, p.x, p.y - 140, { color: C.magenta, size: 52 });
    if (!demoMode && e === SWITCH_BEAT - 4 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(e + ' / ' + LAST, W / 2, 420, { color: C.yellow, size: 76 });
    }
    if (e === LAST) arriveLoft();
  }

  function arriveLoft() {
    arrived = true;
    var p = cellCenter(LAST);
    score += (MISS_MAX - misses) * 200;
    game.fx.burst(p.x + 60, p.y, { color: C.yellow, count: 26, speed: 380 });
    game.fx.burst(p.x + 60, p.y, { color: C.white, count: 16, speed: 260 });
    tone('C6', 0.2, { wave: 'square', volume: 0.05 * vol() });
  }

  function lateMiss(e) {
    res[e] = 'miss';
    tweenFrom = pos; tweenT = 0.2; pos = e;
    var p = cellCenter(e);
    tone(240, 0.25, { wave: 'triangle', volume: 0.05 * vol(), slide: -140 });   // 風に流される
    missCommon(p.x, p.y);
    if (e === LAST) arrived = true;
  }

  function zap(x, y) {
    lost = true; zapT = 0.45; zapX = x; zapY = y;
    tone(1600, 0.12, { wave: 'sawtooth', volume: 0.05 * vol(), slide: -1400 });
    tone(80, 0.3, { wave: 'square', volume: 0.05 * vol(), slide: 40 });
    missCommon(x, y);
  }

  function missCommon(x, y) {
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    game.feedback.bad(x, y - 60, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false; grabbed = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(180, 900), game.random(400, 1200), { color: i % 2 ? C.yellow : C.cyan, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.yellow, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力(本番とATTRACTゴーストが同じ処理を通る) ----
  function pressAt(x, y) {
    finger.x = x; finger.y = y;
    var fc = cellAt(x, y);
    if (fc && fc.i >= 0) { grabbed = true; lost = false; lastCellI = fc.i; return true; }
    grabbed = false; bonkT = 0.25;
    return false;
  }

  // 指の移動を20pxずつ刻んで調べる(速いなぞりでもマスを飛ばさない)。戻り値: 道の別のマスへ移ったか
  function moveTo(x, y) {
    var dx = x - finger.x, dy = y - finger.y;
    var n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 20));
    var changed = false, sx = finger.x, sy = finger.y;
    for (var s = 1; s <= n; s++) {
      var px = sx + dx * s / n, py = sy + dy * s / n;
      finger.x = px; finger.y = py;
      var fc = cellAt(px, py);
      if (!fc || fc.i < 0) {
        if (!lost) zap(px, py);
        if (over) return changed;
        continue;
      }
      if (lost) lost = false;
      if (fc.i !== lastCellI) { lastCellI = fc.i; changed = true; }
      if (running && fc.i === pos + 1 && pos < LAST && songT >= ENTRY[pos] * SPB - GOOD_W) enter(fc.i, songT - ENTRY[fc.i - 1] * SPB);
    }
    return changed;
  }

  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (pressAt(x, y)) {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(x, y, { color: C.cyan, count: 5, speed: 140 });
    } else {
      game.audio.tone(140, 0.08, { wave: 'square', volume: 0.04 });
      game.fx.burst(x, y, { color: C.gray, count: 3, speed: 80 });
    }
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || over || !grabbed) return;
    if (moveTo(x, y) && !lost) game.audio.tone(660, 0.02, { wave: 'square', volume: 0.015 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !grabbed) return;
    grabbed = false;
    game.fx.burst(x, y, { color: C.blue, count: 3, speed: 70 });
  });
  game.onTap(function () {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // 雷雲に近づいたら赤く光らせる(感電の予告)
  function updateWarn(dt) {
    warn = [];
    if (!grabbed || lost) return;
    var fc = cellAt(finger.x, finger.y);
    if (!fc || fc.i < 0) return;
    var fx = (finger.x - X0) / CS - fc.c, fy = (finger.y - Y0) / CS - fc.r, M = 0.2;
    if (fx < M && isCloud(fc.c - 1, fc.r)) warn.push([fc.c - 1, fc.r]);
    if (fx > 1 - M && isCloud(fc.c + 1, fc.r)) warn.push([fc.c + 1, fc.r]);
    if (fy < M && isCloud(fc.c, fc.r - 1)) warn.push([fc.c, fc.r - 1]);
    if (fy > 1 - M && isCloud(fc.c, fc.r + 1)) warn.push([fc.c, fc.r + 1]);
    crackT -= dt;
    if (warn.length && crackT <= 0) { crackT = 0.22; tone(2600, 0.03, { wave: 'sawtooth', volume: 0.025 * vol() }); }
  }

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.black, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col) {
    game.draw.line(x, y, x + w, y, col, 2); game.draw.line(x, y + h, x + w, y + h, col, 2);
    game.draw.line(x, y, x, y + h, col, 2); game.draw.line(x + w, y, x + w, y + h, col, 2);
    game.draw.line(x + 6, y + 6, x + w - 6, y + 6, col, 1); game.draw.line(x + 6, y + h - 6, x + w - 6, y + h - 6, col, 1);
    game.draw.line(x + 6, y + 6, x + 6, y + h - 6, col, 1); game.draw.line(x + w - 6, y + 6, x + w - 6, y + h - 6, col, 1);
  }
  function sectionCol() { return running && songT >= SWITCH_BEAT * SPB - 0.02 ? C.magenta : C.cyan; }

  function drawBack(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 高空の雨すじ(細線)
    for (var i = 0; i < 26; i++) {
      var rx = (i * 83 + t * 140) % W, ry = (i * 157 + t * 520) % H;
      game.draw.line(rx, ry, rx - 10, ry + 34, C.blue, 1);
    }
  }

  function drawCloud(c, r, t) {
    var x = X0 + c * CS, y = Y0 + r * CS, q = CS / 8;
    var lit = boltT > 0 && boltCell === r * COLS + c;
    game.draw.rect(x, y, CS, CS, lit ? '#6060ff' : C.cloud);
    // 市松ディザ: 上半分は白、下半分は淡い青で雲のふくらみ
    for (var yy = 0; yy < 8; yy++) {
      for (var xx = (yy + c + r) % 2; xx < 8; xx += 2) {
        var top = yy < 3 + ((c * 3 + r) % 3) - 1;
        game.draw.rect(x + xx * q, y + yy * q, q, q, top ? C.white : C.cloudL, top ? 0.9 : 0.55);
      }
    }
    if (lit) {
      game.draw.line(x + 40, y + 8, x + 70, y + 54, C.yellow, 4);
      game.draw.line(x + 70, y + 54, x + 50, y + 66, C.yellow, 4);
      game.draw.line(x + 50, y + 66, x + 84, y + 116, C.yellow, 4);
    }
  }

  function drawLane(i, t) {
    var p = PATH[i], x = X0 + p[0] * CS, y = Y0 + p[1] * CS;
    game.draw.rect(x, y, CS, CS, C.black);
    game.draw.line(x, y, x + CS, y, C.navy, 1);
    game.draw.line(x, y, x, y + CS, C.navy, 1);
    if (i <= pos && i > 0) {
      var col = res[i] === 'miss' ? C.red : res[i] === 'perfect' ? C.yellow : C.cyan;
      for (var d = 0; d < 3; d++) game.draw.rect(x + 34 + d * 24, y + CS / 2 - 3, 8, 6, col, 0.6);
    }
  }

  function drawGrid(t) {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (GRID[r][c] < 0) drawCloud(c, r, t); else drawLane(GRID[r][c], t);
    }
    for (var w = 0; w < warn.length; w++) {
      var wc = warn[w];
      if (wc[0] < 0 || wc[1] < 0 || wc[0] >= COLS || wc[1] >= ROWS) continue;
      var wx = X0 + wc[0] * CS, wy = Y0 + wc[1] * CS;
      if (Math.floor(t * 16) % 2 === 0) game.draw.rect(wx, wy, CS, CS, C.red, 0.35);
      frame(wx + 4, wy + 4, CS - 8, CS - 8, C.red);
    }
    if (zapT > 0) {
      for (var z = 0; z < 4; z++) {
        var a = z * 1.6 + t * 30;
        game.draw.line(zapX, zapY, zapX + Math.cos(a) * 90, zapY + Math.sin(a) * 90, C.yellow, 4);
      }
    }
    // 鳩舎(ゴール)
    var g = cellCenter(LAST);
    game.draw.circle(g.x, g.y, 54 + Math.sin(t * 5) * 6, C.yellow, arrived ? 0.5 : 0.18);
    game.draw.sprite(LOFT, LPAL, g.x, g.y - 6, 9, { anchor: 'center' });
    frame(X0 - 8, Y0 - 8, COLS * CS + 16, ROWS * CS + 16, swFlash > 0 && Math.floor(t * 20) % 2 === 0 ? C.white : sectionCol());
  }

  function drawTarget(t) {
    if (!running || pos >= LAST) return;
    var e = pos + 1, T = ENTRY[e - 1] * SPB, p = PATH[e];
    var x = X0 + p[0] * CS, y = Y0 + p[1] * CS;
    var u = clamp((T - songT) / (SPB * 1.5), 0, 1);
    var col = ENTRY[e - 1] >= SWITCH_BEAT ? C.magenta : C.yellow;
    var g = u * 60;
    frame(x - g, y - g, CS + g * 2, CS + g * 2, col);
    if (Math.abs(songT - T) < 0.08) game.draw.rect(x, y, CS, CS, col, 0.35);
    // 早く着いたときの境目(拍の頭まで待つ)
    if (grabbed && !lost) {
      var fc = cellAt(finger.x, finger.y);
      if (fc && fc.i === e && songT < T - GOOD_W) game.draw.rect(x, y, CS, CS, C.white, 0.12 + 0.1 * Math.sin(t * 30));
    }
    // その次のマス(予告)
    if (e + 1 <= LAST) {
      var q = PATH[e + 1];
      frame(X0 + q[0] * CS + 18, Y0 + q[1] * CS + 18, CS - 36, CS - 36, C.gray);
    }
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function drawFlock(t) {
    var phase = running ? beatN : Math.floor(t * 2);
    var flap = (phase % 2 === 0) !== (running && beatT / SPB > 0.5);
    for (var f = 3; f >= 1; f--) {
      var fi = pos - f;
      if (fi < 0) continue;
      var fp = cellCenter(fi), s = 6 - f;
      if (f > MISS_MAX - misses) continue;   // 手紙を落とした鳩は群れから抜ける
      game.draw.sprite(flap ? PIG_B : PIG_A, PPAL, fp.x + Math.sin(t * 4 + f) * 6, fp.y + 8, s, { anchor: 'center', flipX: fp.x > cellCenter(Math.min(LAST, fi + 1)).x });
    }
    var a = cellCenter(tweenFrom), b = cellCenter(pos);
    var u = tweenT > 0 ? 1 - tweenT / 0.12 : 1;
    if (u > 1) u = 1;
    if (u < 0) u = 0;
    var x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * 20;
    var big = hitStop > 0 ? 1.3 : 1;
    if (hitStop > 0) game.draw.circle(x, y, 70, C.white, 0.5 * hitStop / HIT_STOP);
    var face = pos < LAST ? cellCenter(pos + 1).x < x : false;
    game.draw.sprite(flap ? PIG_A : PIG_B, hitStop > 0 ? PPAL_HIT : PPAL, x, y, 8 * big, { anchor: 'center', flipX: face });
    if (state === S.PLAYING && !grabbed && running && !over) {
      game.draw.circle(x, y, 60 + Math.sin(t * 8) * 8, C.cyan, 0.15);
    }
  }

  function drawStrip(t) {
    // 親指ゾーン: 拍のランプと、流れてくる拍の帯(黄=1拍1マス / 紫=3拍子の進む / 白抜き=休む)
    var bx = 60, by = 1590, bw = W - 120, bh = 120;
    game.draw.rect(bx, by, bw, bh, C.black, 0.85);
    frame(bx, by, bw, bh, sectionCol());
    var nowX = 170, PX = 210;
    game.draw.line(nowX, by + 10, nowX, by + bh - 10, C.white, 3);
    if (running) {
      for (var k = Math.max(0, beatN - 1); k < Math.min(SONG_BEATS, beatN + 6); k++) {
        var x = nowX + (k * SPB - songT) / SPB * PX;
        if (x < bx + 10 || x > bx + bw - 20) continue;
        if (k === 0 || BARS.indexOf(k) >= 0) game.draw.line(x, by + 14, x, by + bh - 14, C.gray, 1);
        var e = ENTRY.indexOf(k);
        if (e >= 0) {
          var col = k >= SWITCH_BEAT ? C.magenta : C.yellow;
          var done = res[e + 1];
          game.draw.rect(x - 16, by + bh / 2 - 16, 32, 32, done ? (done === 'miss' ? C.red : C.gray) : col);
        } else if (isRestBeat(k)) {
          frame(x - 14, by + bh / 2 - 14, 28, 28, C.white);
        } else if (k < 4) {
          game.draw.rect(x - 6, by + bh / 2 - 6, 12, 12, C.gray);
        }
      }
    }
    // 拍のランプ(前半4つ・後半3つで3つ目は休み)
    var three = running && beatN >= SWITCH_BEAT;
    var n = three ? 3 : 4, cur = running ? (three ? (beatN - SWITCH_BEAT) % 3 : beatN % 4) : -1;
    for (var i = 0; i < n; i++) {
      var lx = W / 2 + (i - (n - 1) / 2) * 150, ly = 1510, r = i === 0 ? 30 : 22;
      var on = i === cur && lampT > 0;
      var rest = three && i === 2;
      game.draw.circle(lx, ly, r + 5, three ? C.magenta : C.cyan);
      game.draw.circle(lx, ly, r, on ? (rest ? C.white : C.yellow) : C.black);
      if (rest) game.draw.circle(lx, ly, r * 0.45, three ? C.magenta : C.cyan);
    }
  }

  function drawHud(t) {
    game.draw.rect(0, 0, W, 236, C.black);
    frame(20, 18, W - 40, 200, C.cyan);
    label('SCORE ' + score, 60, 78, 46, C.yellow, 'left');
    label('BEST ' + prevBest, 60, 140, 30, C.white, 'left');
    label(pos + ' / ' + LAST, W - 60, 78, 46, C.white, 'right');
    // 拍子の表示(切り替え前の小節で点滅して予告)
    var sig = running && beatN >= SWITCH_BEAT ? '3/4' : '4/4';
    var warnSig = running && beatN >= SWITCH_BEAT - 4 && beatN < SWITCH_BEAT;
    frame(W / 2 - 80, 40, 160, 80, warnSig ? C.magenta : sectionCol());
    if (warnSig && Math.floor(t * 6) % 2 === 0) label('3/4', W / 2, 80, 44, C.magenta);
    else label(sig, W / 2, 80, 44, sig === '3/4' ? C.magenta : C.cyan);
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.sprite(ENV, m < MISS_MAX - misses ? EPAL : EPAL_OFF, W - 90 - m * 80, 160, 8, { anchor: 'center' });
    }
    var progress = clamp(songT / (SONG_BEATS * SPB), 0, 1);
    game.draw.rect(40, 196, (W - 80) * progress, 6, sectionCol());
  }

  function drawScene(t) {
    drawBack(t);
    drawGrid(t);
    drawTarget(t);
    drawFlock(t);
    if (grabbed && state === S.PLAYING) {
      game.draw.circle(finger.x, finger.y, 30, lost ? C.red : C.cyan, 0.3);
    }
    if (bonkT > 0) game.draw.circle(finger.x, finger.y, 40 * (1 - bonkT / 0.25) + 10, C.gray, 0.4);
    drawStrip(t);
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.red, 0.16 * flashT / HIT_STOP);
    if (swFlash > 0) game.draw.rect(0, 0, W, H, C.white, 0.25 * swFlash);
  }

  // ---- ATTRACT: 実ロジックで 拍ちょうどにマスを渡る → 角で行きすぎて雷雲に触れMISS → 戻って次の拍で入り直す ----
  var demo = { t: 0, keys: null };
  function buildGhost() {
    var K = [[0, cellCenter(0).x, cellCenter(0).y]];
    for (var e = 1; e <= 8; e++) {
      var T = ENTRY[e - 1] * SPB, a = cellCenter(e - 1), b = cellCenter(e);
      K.push([T - 0.1, a.x, a.y]);
      K.push([T + 0.1, b.x, b.y]);
      if (e === 4) {
        K.push([T + 0.22, b.x + CS * 0.7, b.y]);     // 角で行きすぎて右の雷雲へ(感電)
        K.push([T + 0.36, b.x, b.y]);                // 道へ戻り、次の拍で入り直す
      }
    }
    return K;
  }
  function ghostAt(s) {
    var K = demo.keys;
    if (s <= K[0][0]) return { x: K[0][1], y: K[0][2] };
    for (var i = 1; i < K.length; i++) {
      if (s <= K[i][0]) {
        var p = K[i - 1], q = K[i], u = (s - p[0]) / Math.max(0.001, q[0] - p[0]);
        if (u < 0) u = 0;
        return { x: p[1] + (q[1] - p[1]) * u, y: p[2] + (q[2] - p[2]) * u };
      }
    }
    var L = K[K.length - 1];
    return { x: L[1], y: L[2] };
  }
  var DEMO_LEN = 12 * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) {
      initGame(true);
      if (!demo.keys) demo.keys = buildGhost();
      pressAt(cellCenter(0).x, cellCenter(0).y);
    }
    stepPlay(dt);
    var g = ghostAt(songT);
    moveTo(g.x, g.y);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (tweenT > 0) tweenT -= dt;
    if (zapT > 0) zapT -= dt;
    if (bonkT > 0) bonkT -= dt;
    if (boltT > 0) boltT -= dt;
    if (swFlash > 0) swFlash -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      updateWarn(dt);
      drawScene(t);
      game.draw.hand(finger.x, finger.y, { press: grabbed, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.black);
      frame(20, 18, W - 40, 200, C.cyan);
      label(GAME_TITLE, W / 2, 96, 84 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 176, 34, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.yellow);
      else label('TAP TO START', W / 2, H * 0.96, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud(t);
      game.draw.rect(100, H * 0.2, W - 200, H * 0.29, C.black, 0.92);
      frame(100, H * 0.2, W - 200, H * 0.29, won ? C.yellow : C.red);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, won ? C.yellow : C.red);
      label('SCORE ' + score, W / 2, H * 0.31, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.355, 32, C.cyan);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.405, 54, C.yellow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.405, 42, C.white);
      if (!won) label('あと' + Math.max(1, LAST - pos) + 'マス!', W / 2, H * 0.455, 50, C.magenta);
      else label('x' + maxCombo, W / 2, H * 0.455, 46, C.magenta);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.96, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, cells: hits, total: LAST, perfect: perfects, good: goods, miss: misses, letters: Math.max(0, MISS_MAX - misses), maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
    }
    updateWarn(dt);

    drawScene(t);
    drawHud(t);
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.yellow);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.yellow);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
