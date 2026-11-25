// K-GBA-0013v2-flower-field-hush-net.js
// 菜の花の網 — 羽音が拍を刻む間はじっと待ち、羽音も伴奏も消えた無音の拍を数えて、チョウが花にとまる拍の頭だけで網を振る
// 操作: チョウが羽ばたく(羽音と伴奏が鳴る)拍の間は触らない。羽音が止むとチョウは無音のまま花へ滑り降り、無音の拍の頭で花にとまる。その瞬間、とまった花の列(左・中・右)を押して網を振る。羽音の拍に触る・滑空中の早振り・列違い・振り遅れはMISS
// 終わり: 5小節(約14秒・チョウ5匹)を終えればCLEAR。MISSが3つでGAME OVER。後半は無音の拍が2拍→3拍と長くなる(抜ける拍は上の拍ランプが小節頭から予告)
// @mechanic: freeze
// @theme: noon_rapeseed_butterfly_net
// 世界観: 真昼の菜の花畑で、昆虫学者の見習いが羽ばたきの止んだ無音の一拍だけ網を振り、花に羽を休めたチョウを収めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 収めた匹数・PERFECT数・最大コンボ・スコア
// スタイル: 70s MONO
(function (game) {
  var STYLE = { bg: ['#000000', '#0c0c0c'], main: ['#ffffff', '#ffd200', '#3ee07a'], accent: ['#ff5a2a', '#8a8a8a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒いブラウン管に白ドットだけで描き、画面の帯ごとに色セロハンの単色で染める。
  // 音は矩形波の単音だけ。無音の拍こそが緊張になる
  var WHITE = STYLE.main[0], YEL = STYLE.main[1], GRN = STYLE.main[2], RED = STYLE.accent[0], GREY = STYLE.accent[1];
  var INK = '#000000';
  var BAND_SKY = H * 0.125, BAND_FIELD = H * 0.43, BAND_GRASS = H * 0.75;

  var GAME_TITLE = 'HUSH NET';
  var BPM = 100;
  var SPB = 60 / BPM;
  var BARS = 6;                       // 0小節目はカウント
  var SONG_BEATS = BARS * 4;
  var PERF = 0.07, GOODW = 0.14, LATE = 0.2;
  var LIVES = 3;
  var COLS = [W * 0.2, W * 0.5, W * 0.8];
  var FLOWER_Y = H * 0.585;           // 花の頭(チョウがとまる所)
  var HOVER_Y = H * 0.3;
  var KID_X = W * 0.5, KID_Y = H * 0.855;
  // [とまる拍, その前に羽音が抜ける拍数, 花の列]
  var CHART = [[7, 1, 1], [11, 1, 0], [14, 1, 2], [19, 2, 1], [23, 3, 0]];
  // デモ: 1匹目は拍の頭で収め、2匹目は滑空中に振ってMISS
  var DEMO_CHART = [[7, 1, 2], [11, 1, 0]];
  var DEMO_TAP = [0, -0.8];
  var DEMO_BEATS = 14;

  // 菜の花の単旋律(独自)。1拍ずつ鳴らすので、抜けた拍はほんとうに無音になる
  var BEATN = [
    [['E5', 0.5], ['G5', 0.5]], [['A5', 0.5], ['G5', 0.5]], [['E5', 0.5], ['D5', 0.5]], [['C5', 1]],
    [['D5', 0.5], ['E5', 0.5]], [['G5', 0.5], ['E5', 0.5]], [['D5', 0.5], ['C5', 0.5]], [['A4', 1]],
    [['C5', 0.5], ['E5', 0.5]], [['G5', 0.5], ['A5', 0.5]], [['C6', 0.5], ['A5', 0.5]], [['G5', 1]],
    [['E5', 0.5], ['D5', 0.5]], [['C5', 0.5], ['D5', 0.5]], [['E5', 0.5], ['G5', 0.5]], [['C5', 1]]
  ];

  var BF_OPEN = [
    '...#.....#...',
    '....#...#....',
    '....#####....',
    '##..#o#o#..##',
    '####.###.####',
    '#####.#.#####',
    '.####.#.####.',
    '..##..#..##..',
    '.####.#.####.',
    '.###..#..###.',
    '..#...#...#..'
  ];
  var BF_FLAP = [
    '...#.....#...',
    '....#...#....',
    '..#.#####.#..',
    '.##.#o#o#.##.',
    '.###.###.###.',
    '.###..#..###.',
    '..##..#..##..',
    '..##..#..##..',
    '...#..#..#...',
    '......#......',
    '.............'
  ];
  var BF_REST = [
    '....#...#....',
    '.....#.#.....',
    '....#####....',
    '....#o#o#....',
    '....#####....',
    '...#######...',
    '...#######...',
    '....#####....',
    '....#####....',
    '.....###.....',
    '......#......'
  ];
  var KID = [
    ['....####....', '..########..', '...#o##o#...', '...######...', '....####....', '..########..', '.##########.', '.#.######.#.', '.#.######.#.', '...######...', '...##..##...', '...##..##...', '..###..###..'],
    ['....####....', '..########..', '...#o##o#...', '...######...', '....####....', '..#########.', '.##########.', '.#.######...', '...######...', '...######...', '...##..##...', '..##....##..', '.###....###.']
  ];
  var JAR = ['.######.', '..####..', '.######.', '#......#', '#.#..#.#', '#......#', '#.#..#.#', '########'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltTg, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function bandCol(y) {
    if (y < BAND_SKY) return RED;
    if (y < BAND_FIELD) return WHITE;
    if (y < BAND_GRASS) return YEL;
    return GRN;
  }
  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newRun(chart, demo) {
    var targets = [], silent = {};
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      targets.push({ k: c[0], glide: c[1], col: c[2], tRest: c[0] * SPB, tGlide: (c[0] - c[1]) * SPB, res: '', fz: 0, post: 0, fx: 0, fy: 0, final: false, tapOff: demo ? DEMO_TAP[i] : 0, tapped: false });
      for (var j = c[0] - c[1]; j <= c[0]; j++) silent[j] = true;
    }
    return {
      demo: demo, targets: targets, silent: silent, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastAud: -1, beatK: -1, beatT: 0, quiet: false, enterT: 0,
      swingT: 0, swingCol: 1, caught: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltTg = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  function current(r) {
    for (var i = 0; i < r.targets.length; i++) if (r.targets[i].res === '') return r.targets[i];
    return null;
  }

  // ── 拍クロック ──
  function onBeat(r, k, loud) {
    r.beatK = k;
    r.quiet = !!r.silent[k];
    if (r.quiet || k >= r.beats) return;          // 抜けた拍: 羽音も伴奏も鳴らさない
    r.beatT = 0.16;
    if (loud) {
      // 羽音(チョウの羽ばたき)= 拍
      game.audio.tone(k % 4 === 0 ? 165 : 140, 0.09, { wave: 'square', volume: 0.07, slide: 70 });
      // 次の拍から無音になるなら、この拍で高い予告音を1つ(以降は鳴らさない)
      if (r.silent[k + 1]) game.audio.tone(1760, 0.05, { wave: 'square', volume: 0.04 });
    }
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var ka = Math.floor((t + 0.06) / SPB);         // 単旋律は発音遅れぶん先読み
    if (ka > r.lastAud) {
      r.lastAud = ka;
      if (loud && ka < r.beats && !r.silent[ka]) game.audio.melody(BEATN[ka % 16], { tempo: BPM, wave: 'square', volume: 0.045 });
    }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) { r.lastBeat = k; onBeat(r, k, loud); }
    for (var i = 0; i < r.targets.length; i++) {
      var tg = r.targets[i];
      if (tg.res === '' && t > tg.tRest + LATE) missTarget(r, tg, loud);
      if (tg.res === 'miss') {
        if (tg.fz > 0 && !tg.final) {
          tg.fz -= dt;
          if (tg.fz <= 0) game.feedback.bad(tg.fx, tg.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: RED });
        } else if (tg.fz <= 0) tg.post += dt;
      }
      if (tg.res === 'hit') tg.post += dt;
    }
    r.enterT += dt;
    if (r.beatT > 0) r.beatT -= dt;
    if (r.swingT > 0) r.swingT -= dt;
  }

  function bflyPos(r, tg, t) {
    var hx = COLS[tg.col];
    if (t >= tg.tRest) return { x: hx, y: FLOWER_Y - 40, pose: 2 };
    if (t >= tg.tGlide) {
      // 無音の滑空: 拍の頭で花に着くよう一定の速さで降りる
      var p = (t - tg.tGlide) / (tg.tRest - tg.tGlide);
      return { x: hx + Math.sin(p * Math.PI * tg.glide) * 70, y: HOVER_Y + (FLOWER_Y - 40 - HOVER_Y) * p, pose: 0 };
    }
    var el = game.time.elapsed;
    var en = Math.min(1, r.enterT / 0.7);
    var sx = tg.col === 0 ? W + 90 : -90;
    var wx = hx + Math.sin(el * 2.3 + tg.k) * 70;
    var wy = HOVER_Y + Math.sin(el * 3.1) * 26 - (r.beatT > 0 ? r.beatT * 260 : 0);
    return { x: sx + (wx - sx) * en, y: H * 0.18 + (wy - H * 0.18) * en, pose: r.beatT > 0.06 ? 1 : 0 };
  }

  function hitTarget(r, tg, d, loud) {
    var perfect = Math.abs(d) <= PERF;
    tg.res = 'hit'; tg.post = 0;
    r.caught++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfects++; else r.goods++;
    var gain = (perfect ? 300 : 150) + (r.combo - 1) * 50 + tg.glide * 60;
    r.score += gain; r.enterT = 0;
    game.feedback.good(COLS[tg.col], FLOWER_Y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : WHITE, count: perfect ? 18 : 10, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, COLS[tg.col], FLOWER_Y - 200, { color: WHITE, size: 44 });
    if (loud) game.audio.tone(perfect ? 1568 : 1175, 0.07, { wave: 'square', volume: 0.07 });
    if (r.caught === 3 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 3', W / 2, H * 0.44, { color: YEL, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missTarget(r, tg, loud) {
    if (tg.res !== '') return;
    var p = bflyPos(r, tg, r.songT);
    tg.res = 'miss'; tg.fz = 0.35; tg.post = 0; tg.fx = p.x; tg.fy = p.y;
    r.misses++; r.combo = 0; r.enterT = 0;
    if (loud) game.audio.tone(98, 0.18, { wave: 'square', volume: 0.08, slide: -40 });
    if (!r.demo && r.misses >= LIVES) { tg.final = true; halt = 0.5; haltTg = tg; }
  }

  // 網を振る(押した列へ)
  function swing(r, x, loud) {
    var col = x < W / 3 ? 0 : x < W * 2 / 3 ? 1 : 2;
    r.swingT = 0.28; r.swingCol = col;
    var tg = current(r);
    if (!tg) {
      if (loud) game.audio.tone(330, 0.04, { wave: 'square', volume: 0.04 });
      return;
    }
    var d = r.songT - tg.tRest;
    if (Math.abs(d) <= GOODW && col === tg.col) hitTarget(r, tg, d, loud);
    else missTarget(r, tg, loud);                 // 羽音の拍に触った/早振り/列違い = 驚かせて逃がす
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) run.score += (LIVES - run.misses) * 200;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { caught: run.caught, total: CHART.length, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押した瞬間で判定 ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(220, 0.03, { wave: 'square', volume: 0.03 }); return; }
    swing(run, x, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで1匹収め、2匹目は滑空中に振って逃がす ──
  var demo = { t: 0, run: null, hx: KID_X, hy: H * 0.93, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var tg = current(r);
    var tx = KID_X + 160, ty = H * 0.93;
    if (tg) {
      var tapAt = tg.tRest + tg.tapOff * SPB;
      if (r.songT >= tg.tGlide - SPB * 0.5) { tx = COLS[tg.col]; ty = FLOWER_Y + 120; }
      if (!tg.tapped && r.songT >= tapAt) { tg.tapped = true; demo.press = 0.18; swing(r, COLS[tg.col], audioOk); }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 9);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 9);
  }

  // ── 描画 ──
  function dotRing(x, y, r, col, n, sz) {
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      game.draw.rect(x + Math.cos(a) * r - sz / 2, y + Math.sin(a) * r - sz / 2, sz, sz, col);
    }
  }

  function drawField(r) {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    var bob = r && r.beatT > 0 ? r.beatT * 40 : 0;
    // 真昼の太陽(白ドットの輪)
    dotRing(W * 0.83, H * 0.2, 70, WHITE, 24, 10);
    dotRing(W * 0.83, H * 0.2, 44, WHITE, 16, 10);
    game.draw.rect(W * 0.83 - 14, H * 0.2 - 14, 28, 28, WHITE);
    // 遠くの丘(点線)
    for (var x = 0; x < W; x += 24) {
      var hy = BAND_FIELD - 30 - Math.sin(x * 0.006 + 1) * 40;
      game.draw.rect(x, hy, 12, 6, WHITE, 0.7);
    }
    // 菜の花畑の列(奥ほど細かい点)
    for (var row = 0; row < 7; row++) {
      var ry = BAND_FIELD + 20 + row * row * 9 + row * 26;
      var step = 30 + row * 10, s = 4 + row * 2;
      var off = (row * 37) % step;
      for (var fx = off; fx < W; fx += step) {
        var sway = Math.sin(el * 1.6 + fx * 0.02 + row) * (2 + row) - bob * (row / 7);
        game.draw.rect(fx + sway, ry, s, s, YEL);
        if (row > 3) game.draw.rect(fx + sway + s, ry - s, s, s, YEL);
      }
    }
    // 3本の大きな花(チョウがとまる花)
    for (var c = 0; c < 3; c++) {
      var cx = COLS[c], sw = Math.sin(el * 1.3 + c) * 4;
      game.draw.rect(cx - 5 + sw * 0.5, FLOWER_Y, 10, BAND_GRASS - FLOWER_Y + 40, YEL);
      game.draw.rect(cx - 50 + sw, FLOWER_Y + 70, 45, 10, YEL);
      game.draw.rect(cx + 6 + sw, FLOWER_Y + 110, 45, 10, YEL);
      for (var p = 0; p < 9; p++) {
        var a = p / 9 * Math.PI * 2;
        game.draw.rect(cx + sw + Math.cos(a) * 34 - 9, FLOWER_Y + 14 + Math.sin(a) * 18 - 9, 18, 18, YEL);
      }
      game.draw.rect(cx + sw - 12, FLOWER_Y + 2, 24, 24, YEL);
    }
    // 草地(親指ゾーン)
    for (var gx = 0; gx < W; gx += 36) {
      var gh = 20 + ((gx * 7) % 30);
      game.draw.rect(gx, BAND_GRASS + 30 + ((gx * 13) % 50), 8, gh, GRN, 0.8);
    }
  }

  function drawTargets(r) {
    var t = r.songT;
    var cur = current(r);
    // 予告: 次に抜ける拍が近づくと、とまる花が点滅
    if (cur && t >= cur.tGlide - SPB && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      dotRing(COLS[cur.col], FLOWER_Y + 14, 78, YEL, 18, 12);
    }
    for (var i = 0; i < r.targets.length; i++) {
      var tg = r.targets[i];
      if (tg.res === 'hit' && tg.post < 0.6) {
        // 網に入って瓶へ
        var q = tg.post / 0.6;
        var jx = COLS[tg.col] + (W * 0.1 - COLS[tg.col]) * q, jy = FLOWER_Y - 40 + (H * 0.8 - FLOWER_Y + 40) * q;
        game.draw.sprite(BF_REST, { '#': bandCol(jy), o: INK }, jx, jy, 8 - q * 3, { anchor: 'center' });
      } else if (tg.res === 'miss') {
        if (tg.fz > 0 || (tg.final && halt > 0)) {
          // ヒットストップ: 白く光って大きくなる
          game.draw.rect(tg.fx - 120, tg.fy - 110, 240, 220, WHITE, 0.25);
          game.draw.sprite(BF_OPEN, { '#': WHITE, o: INK }, tg.fx, tg.fy, 15, { anchor: 'center' });
        } else if (tg.post < 0.9) {
          var fy = tg.fy - tg.post * 900, fxx = tg.fx + Math.sin(tg.post * 18) * 60 + tg.post * 300;
          game.draw.sprite(Math.floor(tg.post * 16) % 2 ? BF_FLAP : BF_OPEN, { '#': bandCol(fy), o: INK }, fxx, fy, 9, { anchor: 'center' });
        }
      }
    }
    if (cur && !(halt > 0)) {
      var p = bflyPos(r, cur, t);
      var spr = p.pose === 2 ? BF_REST : p.pose === 1 ? BF_FLAP : BF_OPEN;
      if (p.pose === 2) dotRing(p.x, p.y, 70, WHITE, 14, 8);
      game.draw.sprite(spr, { '#': bandCol(p.y), o: INK }, p.x, p.y, 10, { anchor: 'center' });
      // 羽音の輪(鳴っている拍だけ)
      if (r.beatT > 0 && p.pose !== 2) dotRing(p.x, p.y, 90 + (0.16 - r.beatT) * 300, bandCol(p.y), 16, 8);
    }
  }

  function drawKid(r) {
    var swingOn = r.swingT > 0;
    var col = r.swingCol;
    var hx, hy;
    if (swingOn) {
      var q = 1 - r.swingT / 0.28;
      var reach = q < 0.35 ? q / 0.35 : 1 - (q - 0.35) / 0.65;
      hx = KID_X + 120 + (COLS[col] - KID_X - 120) * reach;
      hy = KID_Y - 230 + (FLOWER_Y - 10 - KID_Y + 230) * reach;
    } else {
      hx = KID_X + 120; hy = KID_Y - 230 + Math.sin(game.time.elapsed * 2.4) * 8;
    }
    var gx = KID_X + 36, gy = KID_Y - 40;
    game.draw.line(gx, gy, hx, hy + 50, bandCol(hy + 50), 8);
    dotRing(hx, hy, 52, bandCol(hy), 18, 10);
    dotRing(hx, hy + 30, 34, bandCol(hy + 30), 12, 8);
    var f = swingOn ? 1 : 0;
    game.draw.sprite(KID[f], { '#': GRN, o: INK }, KID_X, KID_Y + Math.abs(Math.sin(game.time.elapsed * 3)) * -6, 13, { anchor: 'center' });
    // 収めたチョウの瓶
    game.draw.sprite(JAR, { '#': GRN }, W * 0.1, H * 0.86, 14, { anchor: 'center' });
    for (var i = 0; i < r.caught; i++) game.draw.rect(W * 0.1 - 40 + (i % 3) * 30, H * 0.86 + 10 - Math.floor(i / 3) * 30, 18, 18, GRN);
  }

  function lampBox(x, y, w, h, col, th) {
    game.draw.rect(x, y, w, th, col); game.draw.rect(x, y + h - th, w, th, col);
    game.draw.rect(x, y, th, h, col); game.draw.rect(x + w - th, y, th, h, col);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, BAND_SKY, INK, 0.7);
    txt(String(r.score), 36, 62, 50, RED, 'left');
    txt(r.caught + ' / ' + r.targets.length, W / 2, 62, 44, RED);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 72;
      if (i < LIVES - r.misses) game.draw.sprite(BF_REST, { '#': RED, o: INK }, lx, 54, 4, { anchor: 'center' });
      else game.draw.rect(lx - 22, 50, 44, 8, GREY);
    }
    // 拍ランプ: いまの小節。抜ける拍は枠だけ、チョウがとまる拍は小さなチョウ(小節頭から予告)
    var k = Math.max(0, r.beatK), bar = Math.floor(k / 4), q = k % 4;
    for (var b = 0; b < 2; b++) {
      var bb = bar + b, y = b === 0 ? 150 : 205, sz = b === 0 ? 46 : 26, gap = b === 0 ? 150 : 90;
      if (bb * 4 >= r.beats) continue;
      if (b === 1 && q < 2) continue;             // 次の小節は小節の後半から見せる
      for (var j = 0; j < 4; j++) {
        var kk = bb * 4 + j, x = W / 2 - gap * 1.5 + j * gap - sz / 2;
        var isT = false;
        for (var n = 0; n < r.targets.length; n++) if (r.targets[n].k === kk) isT = true;
        if (r.silent[kk]) {
          lampBox(x, y - sz / 2, sz, sz, RED, 4);
          if (isT) game.draw.sprite(BF_REST, { '#': WHITE, o: INK }, x + sz / 2, y, b === 0 ? 3 : 2, { anchor: 'center' });
        } else {
          var on = b === 0 && j === q && r.beatT > 0 && !r.quiet;
          game.draw.rect(x, y - sz / 2, sz, sz, on ? WHITE : RED, on ? 1 : 0.55);
        }
      }
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.86, H * 0.4, 46, WHITE);
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.22);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 110, won ? YEL : RED);
      return;
    }
    game.draw.rect(70, H * 0.2, W - 140, H * 0.36, INK, 0.88);
    lampBox(70, H * 0.2, W - 140, H * 0.36, won ? YEL : RED, 8);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, won ? YEL : RED);
    txt(run.caught + ' / ' + CHART.length, W / 2, H * 0.325, 64, WHITE);
    txt('SCORE ' + run.score, W / 2, H * 0.38, 52, YEL);
    txt('PERFECT ' + run.perfects, W * 0.36, H * 0.425, 40, WHITE);
    txt('x' + run.maxCombo, W * 0.72, H * 0.425, 40, WHITE);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.475, 56, YEL);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 44, WHITE);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.targets.length; i++) if (run.targets[i].res !== 'hit') left++;
      txt('あと' + left + '匹!', W / 2, H * 0.53, 50, RED);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, GRN);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawField(demo.run);
      drawTargets(demo.run);
      drawKid(demo.run);
      drawHud(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      scan();
      game.draw.rect(0, H * 0.135, W, 170, INK, 0.75);
      txt(GAME_TITLE, W / 2, H * 0.165, 108, WHITE);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.21, 40, YEL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, WHITE);
      else txt('TAP TO START', W / 2, H * 0.965, 44, GRN);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.5), { color: [WHITE, YEL, GRN][Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltTg.fx, haltTg.fy, { text: 'MISS', flashColor: RED });
          haltTg.fz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= SONG_BEATS * SPB + 0.3) {
          game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: BPM, wave: 'square', volume: 0.06 });
          finish(true);
        }
      }
    }

    drawField(run);
    drawTargets(run);
    drawKid(run);
    drawHud(run);
    scan();
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, WHITE);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
