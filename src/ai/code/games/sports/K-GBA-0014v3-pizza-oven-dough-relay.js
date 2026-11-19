// K-GBA-0014v3-pizza-oven-dough-relay.js
// 窯前の生地回し — 放り上げた生地が跳ねる拍に乗って描く弧の高さから落ちる台と拍を読み、戻ってくる拍の点でその台の下を押して受け、次の台へ投げ継ぐ
// 操作: 生地は3つの台のどれかへ弧を描いて落ちる。弧が高いほど長く飛ぶ(2拍=いちばん高い、1拍=低い)。落ちる台の下を、生地が手元に戻る拍の点で押して受ける。白い影は拍の頭、水色の影は跳ねる8分の裏(拍の2/3)に落ちる合図。台違い・拍外れ・受け逃しはMISS(落ちる瞬間から遠い空押しは罰なし)
// 終わり: 7小節(約17秒・16投)を回し切ればCLEAR。MISSが3つでGAME OVER。後半は低く速い弧と裏拍の着地が増える
// @mechanic: trajectory
// @theme: pizza_oven_dough_toss_relay
// 世界観: 石窯が並ぶピザ店の仕込み場で、生地職人が宙に放った生地の弧を読み、落ちる先の台で受けては次の台へ放って回していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 受けた数・裏拍で受けた数・PERFECT数・最大コンボ・スコア
// スタイル: 90s LOW POLY
(function (game) {
  var STYLE = { bg: ['#2a1a18', '#6a3a26'], main: ['#f2deb0', '#d8d2c6', '#b8502a'], accent: ['#ffb030', '#5ad0e0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 輪郭は line、面は横ストリップ塗り。頂点は毎フレーム微小に揺らし、奥の窯はフォグで潰す。テクスチャなし
  var WALL0 = STYLE.bg[0], WALL1 = STYLE.bg[1], DOUGH = STYLE.main[0], MARBLE = STYLE.main[1], BRICK = STYLE.main[2];
  var FIRE = STYLE.accent[0], CYAN = STYLE.accent[1];
  var INK = '#140c0a', DOUGH_E = '#b88a50', MARBLE_D = '#9a948a', FOG = '#7a5a4c', FLOORC = '#5a3426', FLOOR_L = '#6e4232', MISSC = '#e8483a', WHITE = '#fff8ec';

  var GAME_TITLE = 'DOUGH RELAY';
  var BPM = 100;
  var SPB = 60 / BPM;
  var BARS = 7;                       // 0小節目はカウント
  var SONG_BEATS = BARS * 4;
  var PERF = 0.055, GOODW = 0.12, EDGE = 0.22, LATE = 0.16;
  var LIVES = 3;
  var GRAV = 5000;                    // 弧の高さ = GRAV * 飛ぶ時間^2 / 8
  var COLS = [W * 0.2, W * 0.5, W * 0.8];
  var CATCH_Y = H * 0.555;           // 職人の掲げた手の高さ
  var TOP_Y = H * 0.655;              // 台の天板
  var PAD_Y = H * 0.855;
  // 跳ねる8分のグリッド: g が偶数=拍の頭、奇数=拍の2/3(裏)
  var START_G = 6, START_C = 1;
  // [着地のグリッド, 台]
  var CHART = [[10, 0], [14, 2], [17, 1], [20, 0], [24, 2], [27, 1], [29, 0], [32, 1], [34, 2], [37, 0], [39, 1], [42, 2], [44, 1], [47, 0], [50, 2], [52, 1]];
  // デモ: [グリッド, 台, ゴーストが押す台]。2投は受け(1つは裏拍)、3投目は台違いでMISS
  var DEMO_CHART = [[10, 0, 0], [13, 2, 2], [16, 1, 0]];
  var DEMO_BEATS = 10;

  // 跳ねる伴奏(独自)。長・短の8分
  var T2 = 2 / 3, T1 = 1 / 3;
  var MEL = [
    [['C5', T2], ['E5', T1], ['G5', T2], ['A5', T1], ['G5', T2], ['E5', T1], ['C5', 1]],
    [['D5', T2], ['F5', T1], ['A5', T2], ['G5', T1], ['F5', 1], ['D5', 1]],
    [['E5', T2], ['G5', T1], ['C6', T2], ['B5', T1], ['A5', T2], ['G5', T1], ['E5', 1]],
    [['D5', T2], ['E5', T1], ['F5', T2], ['D5', T1], ['G4', 1], ['R', 1]]
  ];
  var BAS = [
    [['C3', 1], ['E3', 1], ['G3', 1], ['A3', 1]],
    [['D3', 1], ['F3', 1], ['A3', 1], ['G3', 1]],
    [['C3', 1], ['E3', 1], ['G3', 1], ['E3', 1]],
    [['G2', 1], ['B2', 1], ['D3', 1], ['G2', 1]]
  ];

  var CHEF = [
    ['....wwww....', '...wwwwww...', '...wwwwww...', '....wwww....', '...ssssss...', '...skssks...', '...ssmmss...', '..cccccccc..', '.scccrrcccs.', '.s.cccccc.s.', '...cccccc...', '...cccccc...'],
    ['....wwww....', '...wwwwww...', 's..wwwwww..s', 's...wwww...s', '.s.ssssss.s.', '.s.skssks.s.', '..sssmmsss..', '..cccccccc..', '..ccccrccc..', '...cccccc...', '...cccccc...', '...cccccc...']
  ];
  var CHEF_PAL = { w: WHITE, s: '#f0b890', k: INK, m: MISSC, c: '#f4efe6', r: MISSC };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltT, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function gt(g) { return Math.floor(g / 2) * SPB + (g % 2) * SPB * T2; }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 5, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // ── ローポリ描画: 凸多角形を横ストリップで塗り、輪郭を line で引く ──
  function jit(i) { return Math.sin(game.time.elapsed * 41 + i * 7.3) * 1.6; }
  function fillPoly(pts, col, step) {
    var st = step || 2, minY = 1e9, maxY = -1e9, n = pts.length, i;
    for (i = 0; i < n; i++) { if (pts[i][1] < minY) minY = pts[i][1]; if (pts[i][1] > maxY) maxY = pts[i][1]; }
    for (var y = Math.floor(minY); y < maxY; y += st) {
      var yc = y + st / 2, xl = 1e9, xr = -1e9;
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          var x = a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, st, col);
    }
  }
  function edgePoly(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      game.draw.line(a[0], a[1], b[0], b[1], col, w || 3);
    }
  }
  function quad(x0, y0, x1, y1, x2, y2, x3, y3, col, edge, seed) {
    var s = seed || 0;
    var p = [[x0 + jit(s), y0 + jit(s + 1)], [x1 + jit(s + 2), y1 + jit(s + 3)], [x2 + jit(s + 4), y2 + jit(s + 5)], [x3 + jit(s + 6), y3 + jit(s + 7)]];
    fillPoly(p, col, 2);
    if (edge) edgePoly(p, edge, 3);
  }
  function ring(cx, cy, r, n, sq, rot) {
    var p = [];
    for (var i = 0; i < n; i++) {
      var a = rot + i / n * Math.PI * 2;
      p.push([cx + Math.cos(a) * r + jit(i + cx), cy + Math.sin(a) * r * sq + jit(i + 3)]);
    }
    return p;
  }

  function newRun(chart, demo) {
    var ts = [], prevG = START_G, prevC = START_C;
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      ts.push({ g: c[0], c: c[1], from: prevC, tToss: gt(prevG), tLand: gt(c[0]), swung: c[0] % 2 === 1, ghostC: c.length > 2 ? c[2] : c[1],
        res: '', tossed: false, tapped: false, fz: 0, post: 0, final: false });
      prevG = c[0]; prevC = c[1];
    }
    return {
      demo: demo, ts: ts, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, lastG: -1, beatK: -1, beatT: 0, andT: 0,
      hits: 0, swungHits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      chefX: COLS[START_C], chefTX: COLS[START_C], catchT: 0
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltT = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロック(跳ねる8分) ──
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 2], ['G4', T2], ['A4', T1], ['B4', T2], ['D5', T1]], { tempo: BPM, wave: 'triangle', volume: 0.06, bass: [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1]], bassWave: 'square', bassVolume: 0.035 });
      return;
    }
    var i = (nb - 1) % MEL.length;
    game.audio.melody(MEL[i], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: BAS[i], bassWave: 'square', bassVolume: 0.035 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) {
      r.lastBeat = k; r.beatK = k;
      if (k < r.beats) {
        r.beatT = 0.15;
        if (loud) game.audio.tone(k % 4 === 0 ? 1900 : 1500, 0.03, { wave: 'square', volume: 0.03 });
      }
    }
    // 裏(拍の2/3)の刻み
    var gNow = Math.floor(t / SPB) * 2 + ((t % SPB) >= SPB * T2 ? 1 : 0);
    if (gNow > r.lastG) {
      r.lastG = gNow;
      if (gNow % 2 === 1 && Math.floor(gNow / 2) < r.beats) {
        r.andT = 0.12;
        if (loud) game.audio.tone(2600, 0.02, { wave: 'square', volume: 0.018 });
      }
    }
    for (var i = 0; i < r.ts.length; i++) {
      var o = r.ts[i];
      if (!o.tossed && t >= o.tToss) {
        o.tossed = true;
        if (Math.abs(r.chefX - COLS[o.from]) < 40) r.catchT = 0.2;
        if (loud) game.audio.tone(330, 0.12, { wave: 'triangle', volume: 0.06, slide: 220 + (o.tLand - o.tToss) * 300 });
      }
      if (o.res === '' && t > o.tLand + LATE) missToss(r, o, loud);
      if (o.res === 'miss') {
        if (o.fz > 0 && !o.final) {
          o.fz -= dt;
          if (o.fz <= 0) game.feedback.bad(COLS[o.c], TOP_Y - 40, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
        } else if (o.fz <= 0) o.post += dt;
      }
    }
    r.chefX += (r.chefTX - r.chefX) * Math.min(1, dt * 22);
    if (r.beatT > 0) r.beatT -= dt;
    if (r.andT > 0) r.andT -= dt;
    if (r.catchT > 0) r.catchT -= dt;
  }

  function doughPos(o, t) {
    var T = o.tLand - o.tToss;
    var p = Math.max(0, Math.min(1, (t - o.tToss) / T));
    var h = GRAV * T * T / 8;
    var ax = COLS[o.from], bx = COLS[o.c];
    return { x: ax + (bx - ax) * p, y: CATCH_Y - 4 * h * p * (1 - p), p: p };
  }

  function hitToss(r, o, d, loud) {
    var perfect = Math.abs(d) <= PERF;
    o.res = 'hit';
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (o.swung) r.swungHits++;
    if (perfect) r.perfects++; else r.goods++;
    var gain = Math.round(((perfect ? 300 : 150) + r.combo * 25) * (o.swung ? 1.3 : 1));
    r.score += gain; r.catchT = 0.25;
    game.feedback.good(COLS[o.c], CATCH_Y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? FIRE : WHITE, count: perfect ? 18 : 10, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, COLS[o.c], CATCH_Y - 190, { color: o.swung ? CYAN : DOUGH, size: 46 });
    if (loud) game.audio.tone(perfect ? 988 : 784, 0.06, { wave: 'square', volume: 0.06 });
    if (r.hits === 8 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 8', W / 2, H * 0.4, { color: FIRE, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missToss(r, o, loud) {
    if (o.res !== '') return;
    o.res = 'miss'; o.fz = 0.35; o.post = 0;
    r.misses++; r.combo = 0;
    if (loud) game.audio.tone(90, 0.2, { wave: 'sawtooth', volume: 0.08, slide: -30 });
    if (!r.demo && r.misses >= LIVES) { o.final = true; halt = 0.5; haltT = o; }
  }

  // 受ける(押した列 = 台、押した時刻 = 拍の点)
  function catchAt(r, x, loud) {
    var col = x < W / 3 ? 0 : x < W * 2 / 3 ? 1 : 2;
    r.chefTX = COLS[col];
    var best = null, bd = 99;
    for (var i = 0; i < r.ts.length; i++) {
      var o = r.ts[i];
      if (o.res !== '') continue;
      var dd = Math.abs(r.songT - o.tLand);
      if (dd <= EDGE && dd < bd) { bd = dd; best = o; }
    }
    if (!best) {
      if (loud) game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.04 });
      game.fx.burst(COLS[col], TOP_Y, { color: WHITE, count: 5, speed: 110 });
      return;
    }
    var d = r.songT - best.tLand;
    if (col === best.c && Math.abs(d) <= GOODW) hitToss(r, best, d, loud);
    else missToss(r, best, loud);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) run.score += (LIVES - run.misses) * 250;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { caught: run.hits, total: CHART.length, swungHits: run.swungHits, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押した瞬間で判定 ──
  game.onPress(function (x) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(240, 0.03, { wave: 'square', volume: 0.03 }); return; }
    catchAt(run, x, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで高い弧(拍の頭)と低い弧(裏拍)を受け、3投目は台違いでMISS ──
  var demo = { t: 0, run: null, hx: W / 2, hy: PAD_Y + 60, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var o = null;
    for (var i = 0; i < r.ts.length; i++) if (!r.ts[i].tapped) { o = r.ts[i]; break; }
    var tx = W / 2, ty = PAD_Y + 90;
    if (o) {
      if (r.songT >= o.tLand - 0.5) { tx = COLS[o.ghostC]; ty = PAD_Y + 20; }
      if (r.songT >= o.tLand) { o.tapped = true; demo.press = 0.16; catchAt(r, COLS[o.ghostC], audioOk); }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 10);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──
  function drawKitchen(r) {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, WALL0], [0.42, WALL1], [0.42, FLOORC], [1, '#3a2018']]);
    // 床のタイル(消失点へ向かう線)
    for (var i = -6; i <= 6; i++) game.draw.line(W / 2 + i * 60, H * 0.42, W / 2 + i * 260, H, FLOOR_L, 4);
    for (var n = 1; n < 8; n++) { var fy = H * 0.42 + H * 0.58 * (n / 8) * (n / 8); game.draw.rect(0, fy, W, 4, FLOOR_L); }
    // 奥の石窯(ローポリのドーム + 火の口)。フォグで沈める
    for (var c = 0; c < 3; c++) {
      var ox = COLS[c], oy = H * 0.36;
      quad(ox - 150, oy, ox - 110, oy - 130, ox + 110, oy - 130, ox + 150, oy, BRICK, INK, c * 10);
      quad(ox - 110, oy - 130, ox - 50, oy - 190, ox + 50, oy - 190, ox + 110, oy - 130, '#9a4224', INK, c * 10 + 20);
      quad(ox - 160, oy, ox + 160, oy, ox + 160, oy + 60, ox - 160, oy + 60, '#7a3a24', INK, c * 10 + 40);
      var fl = 0.7 + 0.3 * Math.sin(el * 9 + c * 2);
      quad(ox - 60, oy, ox - 45, oy - 60, ox + 45, oy - 60, ox + 60, oy, '#3a1008', null, c * 10 + 60);
      fillPoly(ring(ox, oy - 18, 34 * fl, 6, 0.6, el), FIRE, 2);
      game.draw.rect(ox - 30, oy - 270, 60, 80, '#5a3a30');
    }
    game.draw.rect(0, H * 0.13, W, H * 0.29, FOG, 0.28);
    // 湯気/熱の揺らぎ
    for (var s = 0; s < 6; s++) {
      var ph = (el * 0.5 + s * 0.17) % 1;
      game.draw.rect(COLS[s % 3] - 20 + Math.sin(el * 2 + s) * 20, H * 0.26 - ph * 160, 40, 10, WHITE, 0.15 * (1 - ph));
    }
  }

  function drawCounters(r) {
    var next = null;
    for (var i = 0; i < r.ts.length; i++) if (r.ts[i].res === '') { next = r.ts[i]; break; }
    for (var c = 0; c < 3; c++) {
      var x = COLS[c];
      // 天板(上面は明るく、前面は暗く)
      quad(x - 150, TOP_Y - 30, x + 150, TOP_Y - 30, x + 170, TOP_Y + 20, x - 170, TOP_Y + 20, MARBLE, INK, c * 8 + 100);
      quad(x - 170, TOP_Y + 20, x + 170, TOP_Y + 20, x + 160, H * 0.745, x - 160, H * 0.745, MARBLE_D, INK, c * 8 + 120);
      game.draw.line(x - 120, TOP_Y - 10, x + 60, TOP_Y + 10, '#bab4a8', 3);
      // 着地の影(0.6秒前から)
      if (next && next.c === c && r.songT >= next.tLand - 0.6) {
        var q = Math.min(1, (r.songT - (next.tLand - 0.6)) / 0.6);
        fillPoly(ring(x, TOP_Y - 6, 30 + q * 90, 8, 0.3, 0), next.swung ? CYAN : WHITE, 2);
      }
      // 親指ゾーンの受け皿(ローポリ円盤)
      var lit = next && next.c === c && r.songT >= next.tLand - 0.6;
      var pd = ring(x, PAD_Y, 130, 8, 0.42, Math.PI / 8);
      fillPoly(pd, lit ? (next.swung ? CYAN : FIRE) : '#4a2c22', 2);
      edgePoly(pd, lit ? WHITE : '#7a5040', 4);
      fillPoly(ring(x, PAD_Y - 6, 70, 8, 0.42, Math.PI / 8), lit ? WHITE : '#5a382c', 2);
    }
  }

  function drawChef(r) {
    var x = r.chefX, up = r.catchT > 0;
    game.draw.sprite(CHEF[up ? 1 : 0], CHEF_PAL, x, TOP_Y - 98 + (up ? -8 : Math.sin(game.time.elapsed * 3) * 4), 14, { anchor: 'center' });
  }

  function drawDough(x, y, sc, white, seed) {
    var el = game.time.elapsed;
    var sq = 0.32 + 0.22 * Math.abs(Math.sin(el * 7 + seed));
    var pts = ring(x, y, 78 * sc, 8, sq, el * 3 + seed);
    fillPoly(pts, white ? '#ffffff' : DOUGH, 2);
    edgePoly(pts, white ? MISSC : DOUGH_E, 4);
    if (!white) {
      game.draw.rect(x - 22 * sc, y - 6 * sq * 30 * sc / 10, 8 * sc, 8 * sc, INK);
      game.draw.rect(x + 14 * sc, y - 6 * sq * 30 * sc / 10, 8 * sc, 8 * sc, INK);
      game.draw.rect(x - 10 * sc, y + 8 * sc * sq, 20 * sc, 5 * sc, MISSC);
    }
  }

  function drawDoughs(r) {
    var t = r.songT;
    for (var i = 0; i < r.ts.length; i++) {
      var o = r.ts[i];
      if (t < o.tToss) continue;
      if (o.res === '' || (o.res === 'hit' && t < o.tLand)) {
        var p = doughPos(o, t);
        game.draw.circle(p.x, TOP_Y + 30, 40 + 50 * p.p, INK, 0.15 + 0.2 * p.p);
        drawDough(p.x, p.y, 1, false, i);
      } else if (o.res === 'miss') {
        if (o.fz > 0 || (o.final && halt > 0)) {
          game.draw.circle(COLS[o.c], TOP_Y - 20, 130, '#ffffff', 0.3);
          drawDough(COLS[o.c], TOP_Y - 20, 1.5, true, i);
        } else if (o.post < 0.8) {
          // 台に落ちてぺたんとつぶれる
          var fl = ring(COLS[o.c], TOP_Y - 12, 100, 8, 0.18, 0);
          fillPoly(fl, DOUGH, 2);
          edgePoly(fl, DOUGH_E, 3);
          game.draw.rect(COLS[o.c] - 110, TOP_Y - 60 - o.post * 60, 220, 30, WHITE, 0.3 * (1 - o.post / 0.8));
        }
      }
    }
    // 開始前は台の上に生地が1枚待っている
    if (r.ts.length && t < r.ts[0].tToss) drawDough(COLS[START_C], CATCH_Y + Math.sin(game.time.elapsed * 3) * 6, 1, false, 0);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 232, INK, 0.6);
    txt(String(r.score), 36, 66, 52, FIRE, 'left');
    txt(r.hits + ' / ' + r.ts.length, W / 2, 66, 44, DOUGH);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 78;
      if (i < LIVES - r.misses) { var lp = ring(lx, 58, 26, 8, 0.6, 0); fillPoly(lp, DOUGH, 2); edgePoly(lp, DOUGH_E, 3); }
      else game.draw.rect(lx - 24, 54, 48, 8, MISSC);
    }
    // 拍ランプ: 拍の頭(大) と 2/3 の位置の裏(小)。長・短の間隔が見える
    var k = Math.max(0, r.beatK), q = k % 4;
    var span = 210, x0 = W / 2 - span * 1.5 - 40;
    for (var b = 0; b < 4; b++) {
      var bx = x0 + b * span;
      var on = b === q && r.beatT > 0 && k < r.beats;
      fillPoly(ring(bx, 176, on ? 34 : 24, 6, 1, 0), on ? (b === 0 ? FIRE : WHITE) : '#4a3a34', 2);
      var andOn = b === q && r.andT > 0;
      fillPoly(ring(bx + span * T2, 176, andOn ? 18 : 12, 6, 1, 0), andOn ? CYAN : '#3a2e2a', 2);
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.5, H * 0.47, 54, FIRE);
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.12);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 110, won ? FIRE : MISSC);
      return;
    }
    game.draw.rect(70, H * 0.2, W - 140, H * 0.36, INK, 0.86);
    edgePoly([[70, H * 0.2], [W - 70, H * 0.2], [W - 70, H * 0.56], [70, H * 0.56]], won ? FIRE : MISSC, 6);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, won ? FIRE : MISSC);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.325, 64, DOUGH);
    txt('SCORE ' + run.score, W / 2, H * 0.38, 52, FIRE);
    txt('PERFECT ' + run.perfects, W * 0.34, H * 0.425, 40, DOUGH);
    fillPoly(ring(W * 0.64, H * 0.425 - 12, 18, 6, 1, 0), CYAN, 2);
    txt('x' + run.swungHits, W * 0.73, H * 0.425, 40, CYAN);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.475, 56, FIRE);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 44, DOUGH);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.ts.length; i++) if (run.ts[i].res !== 'hit') left++;
      txt('あと' + left + '枚!', W / 2, H * 0.53, 50, FIRE);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, DOUGH);
  }

  function drawAll(r) {
    drawKitchen(r);
    drawChef(r);
    drawCounters(r);
    drawDoughs(r);
    scan();
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, H * 0.13, W, 170, INK, 0.6);
      txt(GAME_TITLE, W / 2, H * 0.165, 104, FIRE);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.208, 40, DOUGH);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 46, FIRE);
      else txt('TAP TO START', W / 2, H * 0.97, 44, DOUGH);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.5), { color: [FIRE, CYAN, DOUGH][Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(COLS[haltT.c], TOP_Y - 40, { text: 'MISS', flashColor: MISSC });
          haltT.fz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= SONG_BEATS * SPB + 0.3) {
          game.audio.melody([['C5', T2], ['E5', T1], ['G5', T2], ['C6', 2]], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: [['C3', 3]] });
          finish(true);
        }
      }
    }

    drawAll(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, FIRE);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
