// J-Switch-0037-oasis-mosaic-ribbon.js
// オアシスのタイル絵直し — 上のお手本と同じ道すじで、同じ色の宝石タイルどうしを指でつないで色の筋を塗る
// 操作: 宝石タイルに指を置き、お手本の筋と同じマスを通って同じ色のもう一方の宝石まで指を離さずになぞる。道すじがお手本と違うと筋が割れて消える。途中で離すと取り消し(社内メモ。画面には出さない)
// 終わり: 3枚の図案(各3本の筋)を仕上げればCLEAR。隊商が着く(時間切れ)とGAME OVER
// @mechanic: connect
// @theme: oasis_fountain_mosaic
// 世界観: 砂漠のオアシスの町で、モザイク職人の見習いが、隊商が着く前に噴水の欠けたタイル絵を、壁のお手本どおりの道すじで色の筋をつないで塗り直していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕上げた筋の数・一発で決めた数(PERFECT)・割った数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り数色、余白、アイコン的な形
  var STYLE = { bg: ['#fbe9c8', '#f3d49c', '#e7bb72'], main: ['#1ab0a8', '#ff6f59', '#ffc233'], accent: ['#2b2d42', '#ffffff'] };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], sand: '#f6e2b8', grout: '#d9b77e',
    ink: STYLE.accent[0], white: STYLE.accent[1], good: '#2bd67b', bad: '#ff3b5c', sky: '#bfe8ff', palm: '#2f9e57', trunk: '#a0673a'
  };
  var COLORS = [STYLE.main[0], STYLE.main[1], STYLE.main[2]];

  var GAME_TITLE = 'TILE RIBBON';
  var TIME_LIMIT = 24;
  var N = 5;
  var CELL = 150;
  var GX = (W - N * CELL) / 2;
  var GY = H * 0.36;
  var MCELL = 34;
  var MX = W / 2 - N * MCELL / 2, MY = H * 0.135;

  // 図案: 各色の筋(マスの並び。両端が宝石タイル)
  var PATTERNS = [
    [
      [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
      [[0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4]],
      [[4, 0], [4, 1], [4, 2], [4, 3]]
    ],
    [
      [[0, 1], [1, 1], [1, 2], [1, 3], [0, 3]],
      [[4, 4], [3, 4], [2, 4], [2, 3], [3, 3]],
      [[2, 0], [3, 0], [3, 1], [3, 2], [4, 2]]
    ],
    [
      [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
      [[0, 3], [0, 4], [1, 4], [2, 4], [2, 3]],
      [[2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]]
    ]
  ];
  var TOTAL_RIBBONS = 9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──
  var PALM = [
    '..gg.gg...',
    '.gggggggg.',
    'gg..tt..gg',
    '....tt....',
    '....tt....',
    '...tt.....',
    '...tt.....',
    '..tttt....'
  ];
  var CAMEL_A = [
    '.......kk.',
    '..kk..kkk.',
    '.kkkkkkk..',
    'kkkkkkkk..',
    '.k.k.k.k..',
    '.k.k.k.k..'
  ];
  var CAMEL_B = [
    '.......kk.',
    '..kk..kkk.',
    '.kkkkkkk..',
    'kkkkkkkk..',
    'k..kk..k..',
    'k..kk..k..'
  ];
  var FOUNT = [
    '.....ww.....',
    '....w..w....',
    '...w....w...',
    '.....bb.....',
    '....bbbb....',
    'ssssssssssss',
    'sbbbbbbbbbbs',
    '.ssssssssss.'
  ];
  var GEM = ['.ww.', 'wccw', 'cccc', '.cc.'];

  // ── 状態 ──
  var pat, ribbons, locked, stroke, strokeColor, timeLeft, doneCount, perfects, cracks, tries;
  var ready, finished, ok, done, endWait, nextT, crackFx, hitStop;
  var result = { ribbons: 0, perfects: 0, cracks: 0, score: 0 };

  function key(r, c) { return r * N + c; }

  function loadPattern(p) {
    pat = p;
    ribbons = PATTERNS[p];
    locked = [];
    for (var i = 0; i < N * N; i++) locked.push(-1);
    tries = [0, 0, 0];
    stroke = null;
  }

  function initGame() {
    loadPattern(0);
    timeLeft = TIME_LIMIT; doneCount = 0; perfects = 0; cracks = 0;
    ready = 0.8; finished = false; ok = false; done = false; endWait = 0; nextT = 0; crackFx = null; hitStop = 0;
  }

  function anchorOf(r, c) {
    for (var i = 0; i < ribbons.length; i++) {
      var rb = ribbons[i];
      var a = rb[0], b = rb[rb.length - 1];
      if ((a[0] === r && a[1] === c) || (b[0] === r && b[1] === c)) return i;
    }
    return -1;
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    if (r < 0 || r >= N || c < 0 || c >= N) return null;
    return [r, c];
  }
  function cellCenter(r, c) { return { x: GX + c * CELL + CELL / 2, y: GY + r * CELL + CELL / 2 }; }

  function beginStroke(r, c, live) {
    var a = anchorOf(r, c);
    if (a < 0 || locked[key(r, c)] >= 0) {
      if (live) { game.audio.tone('D4', 0.05, { wave: 'square', volume: 0.04 }); var p0 = cellCenter(r, c); game.fx.burst(p0.x, p0.y, { color: C.grout, count: 4, speed: 90 }); }
      return;
    }
    stroke = { idx: a, cells: [[r, c]] };
    strokeColor = COLORS[a];
    if (live) { game.audio.play('se_tap', 0.35); var p = cellCenter(r, c); game.fx.burst(p.x, p.y, { color: strokeColor, count: 6, speed: 140 }); }
  }

  // 1マスずつ筋を伸ばす(PLAYING とデモで共用)
  function addCell(r, c, live) {
    if (!stroke) return;
    var cs = stroke.cells;
    var last = cs[cs.length - 1];
    if (last[0] === r && last[1] === c) return;
    if (cs.length >= 2 && cs[cs.length - 2][0] === r && cs[cs.length - 2][1] === c) { cs.pop(); return; }
    for (var i = 0; i < cs.length; i++) if (cs[i][0] === r && cs[i][1] === c) return;
    var a = anchorOf(r, c);
    if (locked[key(r, c)] >= 0 || (a >= 0 && a !== stroke.idx)) { crack(live); return; }
    cs.push([r, c]);
    if (live && cs.length % 2 === 0) game.audio.tone(400 + cs.length * 60, 0.04, { wave: 'triangle', volume: 0.04 });
    var rb = ribbons[stroke.idx];
    var start = cs[0];
    var other = (start[0] === rb[0][0] && start[1] === rb[0][1]) ? rb[rb.length - 1] : rb[0];
    if (r === other[0] && c === other[1]) judge(live);
  }

  function extendTo(r, c, live) {
    if (!stroke) return;
    var guard = 0;
    while (stroke && guard++ < 12) {
      var last = stroke.cells[stroke.cells.length - 1];
      if (last[0] === r && last[1] === c) break;
      var dr = r - last[0], dc = c - last[1];
      if (Math.abs(dr) >= Math.abs(dc)) addCell(last[0] + (dr > 0 ? 1 : -1), last[1], live);
      else addCell(last[0], last[1] + (dc > 0 ? 1 : -1), live);
    }
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      var hit = false;
      for (var j = 0; j < b.length; j++) if (a[i][0] === b[j][0] && a[i][1] === b[j][1]) hit = true;
      if (!hit) return false;
    }
    return true;
  }

  function judge(live) {
    var idx = stroke.idx;
    var cells = stroke.cells;
    if (sameSet(cells, ribbons[idx])) {
      for (var i = 0; i < cells.length; i++) locked[key(cells[i][0], cells[i][1])] = idx;
      var end = cellCenter(cells[cells.length - 1][0], cells[cells.length - 1][1]);
      stroke = null;
      if (!live) { game.fx.burst(end.x, end.y, { color: COLORS[idx], count: 12, speed: 260 }); return; }
      doneCount++;
      var first = tries[idx] === 0;
      if (first) perfects++;
      game.feedback.good(end.x, end.y, { text: first ? 'PERFECT' : 'GOOD', color: COLORS[idx] });
      var all = true;
      for (var k = 0; k < ribbons.length; k++) {
        var rk = ribbons[k][0];
        if (locked[key(rk[0], rk[1])] < 0) all = false;
      }
      if (all) {
        if (pat + 1 >= PATTERNS.length) {
          finished = true; ok = true;
          game.fx.burst(W / 2, GY + N * CELL / 2, { color: C.good, count: 36, speed: 520 });
          game.feedback.good(W / 2, H * 0.5, { text: 'CLEAR', color: C.good, size: 90 });
          game.audio.play('se_success', 0.6);
          finish();
        } else {
          nextT = 0.6;
          game.fx.popup((pat + 1) + ' / ' + PATTERNS.length, W / 2, H * 0.5, { color: C.ink, size: 80 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    } else {
      tries[idx]++;
      crack(live);
    }
  }

  function crack(live) {
    if (!stroke) return;
    var cells = stroke.cells;
    crackFx = { cells: cells.slice(), color: strokeColor, t: 0.4 };
    stroke = null;
    if (live) {
      cracks++;
      hitStop = 0.3;
      var m = cellCenter(cells[cells.length - 1][0], cells[cells.length - 1][1]);
      game.feedback.bad(m.x, m.y, { text: 'MISS', shake: 10 });
      game.audio.play('se_break', 0.4);
    }
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
    result.ribbons = doneCount; result.perfects = perfects; result.cracks = cracks;
    result.score = ok ? doneCount * 100 + perfects * 60 + Math.round(timeLeft * 25) : 0;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); startMusic(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || nextT > 0 || hitStop > 0) return;
    var cell = cellAt(x, y);
    if (!cell) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.grout, count: 3, speed: 60 }); return; }
    beginStroke(cell[0], cell[1], true);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !stroke || finished || hitStop > 0) return;
    var cell = cellAt(x, y);
    if (cell) extendTo(cell[0], cell[1], true);
    if (stroke && Math.random() < 0.15) game.fx.burst(x, y, { color: strokeColor, count: 1, speed: 40 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !stroke) return;
    // 途中で離した: 取り消し
    crackFx = { cells: stroke.cells.slice(), color: strokeColor, t: 0.25 };
    stroke = null;
    game.audio.tone('A3', 0.08, { wave: 'triangle', volume: 0.05, slide: -120 });
  });

  // ── 描画 ──
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.11, C.bg1], [0.5, C.bg2], [1, C.bg3]]);
    // 砂丘の帯
    for (var i = 0; i < 4; i++) game.draw.rect(0, H * 0.3 + i * 22, W, 10, C.bg3, 0.3);
    // ヤシの木(揺れ)
    game.draw.sprite(PALM, { g: C.palm, t: C.trunk }, W * 0.09 + Math.sin(t * 1.3) * 6, H * 0.27, 14, { anchor: 'center' });
    game.draw.sprite(PALM, { g: C.palm, t: C.trunk }, W * 0.91 + Math.cos(t * 1.1) * 6, H * 0.27, 14, { anchor: 'center', flipX: true });
    // 噴水
    game.draw.sprite(FOUNT, { w: '#7fd8ff', b: '#3aa6e0', s: C.white }, W * 0.5, H * 0.3 + Math.sin(t * 3) * 3, 12, { anchor: 'center' });
    // 親指ゾーン: 3色の顔料つぼ(残り本数)
    for (var p = 0; p < 3; p++) {
      var px = W * (0.25 + p * 0.25), py = H * 0.855 + Math.sin(t * 2 + p) * 5;
      game.draw.circle(px, py, 70, COLORS[p]);
      game.draw.circle(px, py - 20, 40, C.white, 0.35);
    }
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawCaravan() {
    // 時間が減るほど隊商が町(右端)へ近づく
    var t = game.time.elapsed;
    var k = state === S.PLAYING ? 1 - timeLeft / TIME_LIMIT : 0.2 + 0.1 * Math.sin(t * 0.5);
    for (var i = 0; i < 3; i++) {
      var x = W * 0.05 + k * W * 0.7 + i * 70;
      game.draw.sprite(Math.floor(t * 4 + i) % 2 ? CAMEL_A : CAMEL_B, { k: '#b07a45' }, x, H * 0.935, 7, { anchor: 'center', alpha: 0.7 });
    }
    game.draw.rect(W * 0.9, H * 0.9, 12, 90, C.ink, 0.6);
  }

  function drawModel() {
    game.draw.rect(MX - 14, MY - 14, N * MCELL + 28, N * MCELL + 28, C.ink);
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) game.draw.rect(MX + c * MCELL + 1, MY + r * MCELL + 1, MCELL - 2, MCELL - 2, C.sand);
    for (var i = 0; i < ribbons.length; i++) {
      var rb = ribbons[i];
      for (var j = 0; j < rb.length; j++) game.draw.rect(MX + rb[j][1] * MCELL + 1, MY + rb[j][0] * MCELL + 1, MCELL - 2, MCELL - 2, COLORS[i]);
    }
  }

  function drawGrid() {
    var t = game.time.elapsed;
    game.draw.rect(GX - 12, GY - 12, N * CELL + 24, N * CELL + 24, C.grout);
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var x = GX + c * CELL, y = GY + r * CELL;
        var l = locked[key(r, c)];
        game.draw.rect(x + 4, y + 4, CELL - 8, CELL - 8, l >= 0 ? COLORS[l] : C.sand);
      }
    }
    // 描いている筋
    if (stroke) {
      for (var s = 0; s < stroke.cells.length; s++) {
        var sc = stroke.cells[s];
        game.draw.rect(GX + sc[1] * CELL + 14, GY + sc[0] * CELL + 14, CELL - 28, CELL - 28, strokeColor, 0.85);
        if (s > 0) {
          var a = cellCenter(stroke.cells[s - 1][0], stroke.cells[s - 1][1]), b = cellCenter(sc[0], sc[1]);
          game.draw.line(a.x, a.y, b.x, b.y, strokeColor, 40);
        }
      }
    }
    // 割れた筋
    if (crackFx && crackFx.t > 0) {
      for (var q = 0; q < crackFx.cells.length; q++) {
        var cc = crackFx.cells[q];
        var jit = (Math.random() - 0.5) * 16;
        game.draw.rect(GX + cc[1] * CELL + 20 + jit, GY + cc[0] * CELL + 20, CELL - 40, CELL - 40, '#ffffff', crackFx.t * 2);
      }
    }
    // 宝石タイル
    for (var i = 0; i < ribbons.length; i++) {
      var rb = ribbons[i];
      var ends = [rb[0], rb[rb.length - 1]];
      for (var e = 0; e < 2; e++) {
        var p = cellCenter(ends[e][0], ends[e][1]);
        var lockedHere = locked[key(ends[e][0], ends[e][1])] >= 0;
        game.draw.circle(p.x, p.y, 52 + (lockedHere ? 0 : Math.sin(t * 4 + i) * 5), C.white);
        game.draw.sprite(GEM, { w: C.white, c: COLORS[i] }, p.x, p.y, 20, { anchor: 'center' });
      }
    }
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 108, C.ink);
    txt(doneCount + ' / ' + TOTAL_RIBBONS, W * 0.2, 56, 48, C.white);
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.4, 44, W * 0.52, 24, '#4a4d68');
    game.draw.rect(W * 0.4, 44, W * 0.52 * Math.max(0, timeLeft / TIME_LIMIT), 24, low ? C.bad : C.good);
  }

  // ── ATTRACT ゴースト実演(実ロジック beginStroke/addCell を使う) ──
  var demo = { t: 0, gx: W / 2, gy: GY, press: false, step: 0, rib: 0, wrong: false };
  var WRONG_ROUTE = [[0, 2], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      loadPattern(0); demo.step = 0; demo.rib = 0; crackFx = null;
      demo.wrong = Math.floor(demo.t / 4.4) % 2 === 1;
    }
    if (crackFx && crackFx.t > 0) crackFx.t -= dt;
    var local = cyc - 0.3;
    if (local < 0 || demo.rib > 1) { demo.press = false; return; }
    var route = demo.rib === 1 && demo.wrong ? WRONG_ROUTE : ribbons[demo.rib];
    var want = Math.min(route.length - 1, Math.floor((local - demo.rib * 1.9) / 0.26));
    if (want < 0) { demo.press = false; return; }
    while (demo.step <= want) {
      var cell = route[demo.step];
      if (demo.step === 0) beginStroke(cell[0], cell[1], false);
      else addCell(cell[0], cell[1], false);
      demo.step++;
    }
    var cur = route[Math.min(demo.step - 1, route.length - 1)];
    var p = cellCenter(cur[0], cur[1]);
    demo.gx = p.x; demo.gy = p.y; demo.press = !!stroke;
    if (!stroke && demo.step >= route.length) { demo.rib++; demo.step = 0; }
  }

  // ── メインループ(1回だけ登録) ──
  game.onUpdate(function(dt) {
    if (ribbons === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBg();
      drawCaravan();
      drawModel();
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 108, C.ink);
      txt(GAME_TITLE, W / 2, 56, 58, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W * 0.84, H * 0.2, 30, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.975, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawBg();
      drawCaravan();
      drawGrid();
      game.draw.rect(W * 0.08, H * 0.28, W * 0.84, H * 0.34, C.white);
      game.draw.rect(W * 0.08, H * 0.28, W * 0.84, 16, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 100, ok ? C.good : C.bad);
      txt(result.ribbons + ' / ' + TOTAL_RIBBONS, W / 2, H * 0.42, 60, C.ink);
      if (ok) txt('SCORE ' + result.score, W / 2, H * 0.475, 50, C.ink);
      else txt('あと' + (TOTAL_RIBBONS - result.ribbons) + '本!', W / 2, H * 0.475, 52, C.bad);
      txt('PERFECT ' + result.perfects + '   MISS ' + result.cracks, W / 2, H * 0.53, 34, C.ink);
      var isNew = ok && result.score >= game.best && result.score > 0;
      txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.58, 38, isNew ? C.good : C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 38, C.ink);
      return;
    }

    // PLAYING
    if (crackFx && crackFx.t > 0) crackFx.t -= dt;
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { ribbons: result.ribbons, perfects: result.perfects, cracks: result.cracks };
        if (ok) game.end.success(result.score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      if (nextT > 0) {
        nextT -= dt;
        if (nextT <= 0) { loadPattern(pat + 1); game.audio.tone('G5', 0.1, { wave: 'triangle', volume: 0.06 }); }
      }
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; stroke = null;
        game.fx.flash('#ffffff', 0.15);
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.5);
        finish();
      }
    }

    drawBg();
    drawCaravan();
    drawModel();
    drawGrid();
    drawHud();
    if (ready > 0) {
      game.draw.rect(0, H * 0.46, W, 150, C.ink, 0.85);
      txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.white);
    }
  });

  function startMusic() {
    game.audio.melody([
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 1],
      ['D5', 0.5], ['C#5', 0.5], ['D5', 0.5], ['E5', 0.5], ['A4', 2]
    ], { tempo: 126, wave: 'triangle', volume: 0.07, loop: true, bass: [['D3', 2], ['A2', 2], ['G2', 2], ['A2', 2]] });
  }

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    game.audio.bgm('bgm_cute');
  });
})(game);
