// K-DS-0006v2-tideflat-kite-train.js
// 干潟の連凧ワルツ — 三拍子の羽ばたきに合わせ、連凧の先頭を指で風の輪へ導く。拍ごとの位置に遅れずつけば、後ろの凧も波打ってついて来る
// 操作: 画面を押したまま指を動かすと、名人の手元から伸びる糸の先で先頭の凧が指の向きへ大きく動く(凧は少し遅れてついて来る)。空に風の輪が拍の手前で現れ、外側の輪が縮んで重なる拍の頭に先頭の凧が輪の芯にいればPERFECT、少し遅れて輪に入ればGOOD、間に合わなければMISS。三拍子の1拍目の輪は低く大きく、2・3拍目は高く小さい。輪は1小節に1つ→2つ→3つと増える。干潟を横切るカモメ(0.7秒前に空の端が点滅し鳴き声)に先頭の凧が触れてもMISS。MISSのたびに尾の凧が1枚ちぎれて飛んでいく
// 終わり: 12小節(三拍子・約16秒・輪24個)を導き切ればCLEAR(最後は夕日の大きな輪)。尾の凧4枚を全部失う(MISS4回)とGAME OVER
// @mechanic: drag_follow
// @theme: tideflat_kite_train_waltz
// 世界観: 夕焼けの干潟で、凧揚げ名人が鳥の形の凧を5枚連ねた連凧を、三拍子の浜風に乗せて風の輪から輪へと導き、羽ばたくように空を舞わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・残った凧の枚数
// スタイル: 2000s BILLBOARD 3D
var STYLE = { bg: ['#2a1c4a', '#c8506a', '#ff9a4a'], main: ['#f4efe2', '#d8402e', '#2e5a8a'], accent: ['#ffd25a', '#5a3a30'] };

(function (game) {
  // 2000s BILLBOARD 3D: 凧・杭・カモメ・名人はすべて板(sprite)。奥ほど px を小さく、霞色に寄せ、干潟に楕円の接地影を落とす
  var W = game.canvas.width;
  var H = game.canvas.height;
  var HZ = 1080;
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], sky2: STYLE.bg[2],
    paper: STYLE.main[0], red: STYLE.main[1], blue: STYLE.main[2],
    sun: STYLE.accent[0], mud: STYLE.accent[1],
    haze: '#e89a86', mudD: '#2e1a20', mudL: '#8a5444', wet: '#ffb070', ink: '#1a1018',
    shadow: '#1a0a12', gull: '#f6f2ea', gullD: '#7a7088', beak: '#ffb020', skin: '#d89a66',
    jacket: '#2e4a6a', jacketD: '#1e3048', hat: '#d8b860', hatD: '#a88a3a', wood: '#6a4430', woodD: '#3a2418',
    bad: '#ff5a4a', white: '#ffffff'
  };

  var GAME_TITLE = 'KITE WALTZ';
  var BPM = 144;
  var SPB = 60 / BPM;
  var BAR = 3;                   // 三拍子
  var INTRO = 3;                 // 1小節目は風待ちのカウント
  var SONG_BEATS = 39;           // 13小節。39拍目の頭で終わる
  var TIME_LIMIT = 17;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.16;
  var CORE = 0.55;
  var MISS_MAX = 4;
  var TAILS = 4;
  var HIT_STOP = 0.4;
  var LEVER = 1.8;               // 指の動き x1.8 が凧の動き(糸のてこ)
  var ANCHOR = { x: 540, y: 1560 };

  // ---- 譜面: 風の輪(拍, x, y, 大きさ) ----
  var CHART = [];
  function addRing(k, x, y, r) { CHART.push({ k: k, x: x, y: y, r: r }); }
  addRing(3, 360, 800, 112); addRing(6, 720, 690, 112); addRing(9, 400, 570, 112);
  var B2 = [[640, 800, 330, 520], [480, 850, 780, 560], [640, 760, 300, 600], [450, 830, 760, 470]];
  for (var b2 = 0; b2 < 4; b2++) { addRing(12 + b2 * 3, B2[b2][0], B2[b2][1], 104); addRing(14 + b2 * 3, B2[b2][2], B2[b2][3], 86); }
  var CX3 = [540, 470, 610, 540], CY3 = [660, 630, 630, 600];
  for (var b3 = 0; b3 < 4; b3++) {
    var fl = b3 % 2 ? 1 : -1, k3 = 24 + b3 * 3;
    addRing(k3, CX3[b3], CY3[b3] + 180, 100);
    addRing(k3 + 1, CX3[b3] + 200 * fl, CY3[b3] - 60, 82);
    addRing(k3 + 2, CX3[b3] - 200 * fl, CY3[b3] - 60, 82);
  }
  addRing(36, 540, 440, 132);
  for (var li = 0; li < CHART.length; li++) CHART[li].lead = li === 0 ? 2 : Math.min(2, CHART[li].k - CHART[li - 1].k);

  // ---- カモメ(横切る障害) ----
  var GULLS = [{ k: 15.5, y: 690, dir: 1 }, { k: 23, y: 660, dir: -1 }, { k: 29, y: 700, dir: 1 }];
  var GULL_V = 620;
  var GULL_TEL = 0.7;
  function gullX(g, T) { var u = T - g.k * SPB; return g.dir > 0 ? -80 + GULL_V * u : W + 80 - GULL_V * u; }

  // ---- 伴奏(オリジナルのワルツ。ベースは ズン・チャッ・チャッ) ----
  var MEL = [null,
    [['A4', 2], ['D5', 1]], [['F#5', 2], ['E5', 1]], [['D5', 1], ['E5', 1], ['F#5', 1]], [['G5', 2], ['F#5', 1]],
    [['E5', 2], ['C#5', 1]], [['D5', 1], ['B4', 1], ['A4', 1]], [['B4', 2], ['C#5', 1]], [['D5', 1.5], ['E5', 0.5], ['F#5', 1]],
    [['A5', 2], ['G5', 1]], [['F#5', 1], ['E5', 1], ['D5', 1]], [['E5', 1], ['G5', 1], ['C#5', 1]], [['D5', 3]]];
  var CHORD = ['D', 'D', 'D', 'A', 'G', 'A', 'D', 'G', 'D', 'D', 'G', 'A', 'D'];
  var OOM = { D: ['D3', 'F#3', 'A3'], A: ['A2', 'E3', 'C#4'], G: ['G2', 'B3', 'D4'] };

  // ---- ドット絵 ----
  var K_DOWN = [
    '.............',
    '.............',
    '.....BEB.....',
    '....WBBBW....',
    '..WWWBBBWWW..',
    '.WWS.BBB.SWW.',
    'WS....B....SW',
    'S....T.T....S',
    '....T...T....',
    '...T.....T...'
  ];
  var K_MID = [
    '.............',
    '.............',
    '.....BEB.....',
    'SWWWWBBBWWWWS',
    '.WWWWBBBWWWW.',
    '.....BBB.....',
    '......B......',
    '.....T.T.....',
    '....T...T....',
    '...T.....T...'
  ];
  var K_UP = [
    'S...........S',
    'WS.........SW',
    '.WWS.BEB.SWW.',
    '..WWWBBBWWW..',
    '....WBBBW....',
    '.....BBB.....',
    '......B......',
    '.....T.T.....',
    '....T...T....',
    '...T.....T...'
  ];
  var KFR = [K_DOWN, K_MID, K_UP];
  var GULL_A = ['G.......G', 'DG.....GD', '.GGGBGGG.', '....Y....'];
  var GULL_B = ['.........', 'DGGG.GGGD', '...GBG...', '....Y....'];
  var STAKE = ['.wW.', 'wwWW', 'wwWW', 'wwWW', 'wwWW', 'wwWW', 'wwWW', 'wwWW', 'wwWW', '.wW.'];
  var MASTER = [
    '....hhhhhh....',
    '...hHHHHHHh...',
    '.hhhhhhhhhhhh.',
    '.....kkkk.....',
    '....jjjjjj....',
    '...jjjjjjjj...',
    '..jjjjJJjjjj..',
    '..jjjjJJjjjj..',
    '..jjjjJJjjjj..',
    '...jjjjjjjj...',
    '...pppppppp...',
    '...ppp..ppp...',
    '...ppp..ppp...',
    '...ppp..ppp...',
    '..bbbb..bbbb..'
  ];
  var CRAB_A = ['r.r..r.r', '.rrrrrr.', 'rrRrrRrr', '.r.rr.r.'];
  var CRAB_B = ['.r....r.', 'r.rrrr.r', 'rrRrrRrr', 'r..rr..r'];
  var MPAL = { h: C.hat, H: C.hatD, k: '#2a1a14', j: C.jacket, J: C.jacketD, p: '#3a3040', b: '#1a1018' };
  var SPAL = [{ w: C.wood, W: C.woodD }, { w: '#8a5a48', W: '#5a3a34' }, { w: '#a06e62', W: '#7a5250' }];
  var CPAL = { r: '#c8503a', R: '#1a1018' };

  function hexRgb(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) {
    var p = hexRgb(a), q = hexRgb(b), s = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(p[i] + (q[i] - p[i]) * t); s += (v < 16 ? '0' : '') + v.toString(16); }
    return s;
  }
  var KCOL = [['#d8402e', '#f4efe2', '#ffd25a'], ['#2e5a8a', '#f4efe2', '#d8402e'], ['#e0a020', '#5a3a30', '#2e5a8a'], ['#f4efe2', '#d8402e', '#2e5a8a'], ['#3a8a5a', '#ffd25a', '#d8402e']];
  var KPAL = [];
  for (var kc = 0; kc < 5; kc++) {
    KPAL.push([]);
    for (var lv = 0; lv < 3; lv++) {
      var ht = lv * 0.3;
      KPAL[kc].push({ W: mix(KCOL[kc][0], C.haze, ht), B: mix(KCOL[kc][1], C.haze, ht), T: mix(KCOL[kc][2], C.haze, ht), E: C.ink, S: mix('#3a2418', C.haze, ht) });
    }
  }
  var GPAL = [{ G: C.gull, D: C.gullD, B: C.ink, Y: C.beak }, { G: mix(C.gull, C.haze, 0.35), D: mix(C.gullD, C.haze, 0.35), B: C.ink, Y: C.beak }];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(u) { return u * u * (3 - 2 * u); }
  function farness(y) { return clamp(1 - (y - 300) / (HZ - 300), 0, 1); }
  function depth(y) { return 0.62 + 0.58 * (1 - farness(y)); }
  function palFor(c, y) { var f = farness(y); return KPAL[c][f > 0.66 ? 2 : f > 0.33 ? 1 : 0]; }
  function shadowY(y) { return HZ + 40 + (1 - farness(y)) * 300; }
  function shadowX(x, y) { return 540 + (x - 540) * (0.5 + 0.5 * (1 - farness(y))); }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, lampT, flashT;
  var kite, finger, hist, lost, res, gWarn, gHit, gAway, ringFx;
  var score, combo, maxCombo, perfects, goods, misses, hits, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; flashT = 0;
    kite = { x: 540, y: 760, tx: 540, ty: 760 };
    finger = { on: false, x: 540, y: 1100 };
    hist = [];
    for (var i = 0; i < 60; i++) hist.push(540, 760);
    lost = []; res = []; gWarn = []; gHit = []; gAway = []; ringFx = [];
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function playBar(b) {
    if (!armed || b > 12) return;
    var c = OOM[CHORD[b]];
    game.audio.melody(MEL[b] || [['R', 3]], { tempo: BPM, wave: 'triangle', volume: 0.06 * vol(), bass: [[c[0], 1], [c[1], 1], [c[2], 1]], bassWave: 'square', bassVolume: 0.03 * vol() });
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= SONG_BEATS) { if (!demoMode) finish(misses < MISS_MAX); return; }
    lampT = 1;
    if (k < INTRO) { tone(k === 0 ? 1320 : 990, 0.05, { wave: 'square', volume: 0.05 * vol() }); return; }
    if (k % BAR === 0) tone(196, 0.14, { wave: 'triangle', volume: 0.035 * vol(), slide: 90 });   // 浜風のひと吹き
  }

  function nextRing() { for (var i = 0; i < CHART.length; i++) if (!res[i]) return i; return -1; }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); if (!running) return; }
    songT = beatN * SPB + beatT;
    if (nextBar <= 12 && songT >= nextBar * BAR * SPB - 0.06) { playBar(nextBar); nextBar++; }
    // カモメ: 予告(端の点滅+鳴き声)→横切る。先頭の凧に触れたらMISS
    for (var g = 0; g < GULLS.length; g++) {
      var G = GULLS[g];
      if (!gWarn[g] && songT >= G.k * SPB - GULL_TEL) {
        gWarn[g] = true;
        tone(1900, 0.1, { wave: 'square', volume: 0.035 * vol(), slide: 700 });
        tone(2400, 0.08, { wave: 'triangle', volume: 0.03 * vol(), slide: -500 });
      }
      if (gHit[g] || songT < G.k * SPB) continue;
      var gx = gullX(G, songT), s = depth(G.y);
      if (gx > -60 && gx < W + 60 && hitStop <= 0 && Math.abs(gx - kite.x) < 66 * s && Math.abs(G.y - kite.y) < 46 * s) {
        gHit[g] = true; gAway[g] = 0;
        missCommon(kite.x, kite.y);
        if (over) return;
      }
    }
    // 風の輪の判定(拍の頭からのずれ)
    var i = nextRing();
    if (i >= 0) {
      var rg = CHART[i], T = rg.k * SPB;
      if (songT >= T - PERFECT_W) {
        var R = rg.r * depth(rg.y);
        var dx = kite.x - rg.x, dy = kite.y - rg.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= R * CORE && songT <= T + PERFECT_W) hitRing(i, 'perfect');
        else if (d <= R && songT > T + PERFECT_W) hitRing(i, 'good');
        else if (songT > T + GOOD_W) missRing(i);
      }
    }
  }

  function tailPos(j) {
    var idx = hist.length - 2 - j * 14;
    if (idx < 0) idx = 0;
    return { x: hist[idx], y: hist[idx + 1] + j * 10 };
  }

  function hitRing(i, kind) {
    var rg = CHART[i];
    res[i] = kind; hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    var pts = kind === 'perfect' ? 100 + Math.min(combo, 8) * 10 : 50;
    if (i === CHART.length - 1) pts *= 2;
    score += pts;
    ringFx.push({ x: rg.x, y: rg.y, r: rg.r * depth(rg.y), t: 0.45 });
    var vv = armed ? (kind === 'perfect' ? 0.22 : 0.16) : 0.001;
    if (kind === 'perfect') {
      perfects++;
      game.feedback.good(rg.x, rg.y - 100, { text: 'PERFECT', color: C.sun, size: 52, count: 12, volume: vv });
    } else {
      goods++;
      game.feedback.good(rg.x, rg.y - 100, { text: 'GOOD', color: C.paper, size: 46, count: 7, volume: vv });
    }
    tone(kind === 'perfect' ? 1760 : 1318, 0.09, { wave: 'triangle', volume: 0.05 * vol() });
    if (combo >= 5 && combo % 5 === 0) game.fx.popup('x' + combo, rg.x, rg.y - 170, { color: C.sun, size: 56 });
    if (!demoMode && hits === 12 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hits + ' / ' + CHART.length, W / 2, 420, { color: C.sun, size: 76 });
    }
  }

  function missRing(i) { res[i] = 'miss'; missCommon(CHART[i].x, CHART[i].y); }

  function missCommon(x, y) {
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    var j = TAILS - misses + 1;
    if (j >= 1) {
      var p = tailPos(j);
      lost.push({ x: p.x, y: p.y, vx: 140 + (j % 2) * 80, vy: -170, t: 0, c: j });
    }
    tone(330, 0.22, { wave: 'sawtooth', volume: 0.04 * vol(), slide: -220 });   // 糸が切れる音
    game.feedback.bad(x, y - 90, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += (TAILS - misses) * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(380, 900), { color: i % 2 ? C.sun : C.paper, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.sun, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 指 → 凧(糸のてこ) ----
  function setFinger(x, y) {
    finger.x = x; finger.y = y;
    kite.tx = clamp(ANCHOR.x + (x - ANCHOR.x) * LEVER, 70, W - 70);
    kite.ty = clamp(ANCHOR.y + (y - ANCHOR.y) * LEVER, 300, HZ - 40);
  }

  function stepKite(dt) {
    // hit-stop は見た目だけ(白フラッシュ+拡大・ちぎれた凧の静止)。拍は止まらないので操作は止めない
    var k = Math.min(1, dt * 8.5);
    kite.x += (kite.tx - kite.x) * k;
    kite.y += (kite.ty - kite.y) * k;
    hist.push(kite.x, kite.y);
    if (hist.length > 200) hist.splice(0, 2);
  }

  // ---- 入力 ----
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (readyT > 0) { game.audio.play('se_tap', 0.2); return; }
    finger.on = true;
    setFinger(x, y);
    game.audio.play('se_tap', 0.15);
    game.fx.burst(x, y, { color: C.paper, count: 5, speed: 140 });
  });
  var whooshT = 0;
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || over || !finger.on) return;
    var far = Math.abs(x - finger.x) + Math.abs(y - finger.y);
    setFinger(x, y);
    // 大きく振ったときだけ糸が風を切る音
    if (far > 24 && game.time.elapsed - whooshT > 0.3) { whooshT = game.time.elapsed; game.audio.tone(520, 0.05, { wave: 'triangle', volume: 0.02, slide: 260 }); }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !finger.on) return;
    finger.on = false;
    game.fx.burst(x, y, { color: C.haze, count: 3, speed: 90 });
  });
  game.onTap(function () {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画ヘルパー ----
  function ellipse(x, y, a, b, col, al) {
    for (var dy = -b; dy < b; dy += 3) {
      var m = (dy + 1.5) / b, w = a * Math.sqrt(Math.max(0, 1 - m * m));
      game.draw.rect(x - w, y + dy, w * 2, 3, col, al);
    }
  }
  function ringLine(x, y, r, col, w) {
    var n = 30, px = x + r, py = y;
    for (var i = 1; i <= n; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      game.draw.line(px, py, nx, ny, col, w);
      px = nx; py = ny;
    }
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var STAKES = [[150, 1130, 0], [310, 1190, 1], [880, 1150, 0], [980, 1290, 2], [90, 1360, 2], [700, 1240, 1]];
  function drawWorld(t) {
    // 空(夕焼けグラデ)と夕日
    game.draw.gradient(0, HZ, [[0, C.sky0], [0.45, '#7a3a6a'], [0.8, C.sky1], [1, C.sky2]]);
    for (var g = 3; g >= 1; g--) game.draw.circle(740, HZ - 10, 90 + g * 50, C.sun, 0.08);
    game.draw.circle(740, HZ - 10, 96, C.sun, 0.95);
    game.draw.circle(740, HZ - 10, 70, '#fff0b0', 0.6);
    // 雲の帯(奥ほど霞む)
    for (var c = 0; c < 6; c++) {
      var cy = 330 + c * 110, cw = 260 + c * 40;
      var cx = ((c * 271 + t * (10 + c * 4)) % (W + cw)) - cw * 0.5;
      game.draw.rect(cx, cy, cw, 16 + c * 2, c < 3 ? '#a85a7a' : '#ffb08a', 0.28);
    }
    // 遠い対岸(シルエット)と遠景の凧揚げの人
    game.draw.rect(0, HZ - 26, 420, 26, '#5a2a44', 0.85);
    game.draw.rect(60, HZ - 44, 180, 18, '#5a2a44', 0.85);
    game.draw.rect(860, HZ - 20, 220, 20, '#5a2a44', 0.85);
    for (var f = 0; f < 3; f++) {
      var fx = 180 + f * 330, kx = fx + 40 + Math.sin(t * 1.3 + f) * 12, ky = HZ - 150 - f * 20;
      game.draw.rect(fx - 3, HZ - 22, 6, 18, '#3a1a30');
      game.draw.line(fx, HZ - 20, kx, ky, '#7a4a60', 1);
      game.draw.sprite(KFR[Math.floor(t * 2 + f) % 3], KPAL[f][2], kx, ky, 2.2, { anchor: 'center', alpha: 0.7 });
    }
    // 干潟(濡れた泥)
    game.draw.gradient(HZ, H, [[0, C.mudL], [0.35, C.mud], [1, C.mudD]]);
    // 夕日の照り返し(縦に揺れる帯)
    for (var r = 0; r < 18; r++) {
      var ry = HZ + 6 + r * r * 1.6, rw = 150 - r * 6 + Math.sin(t * 3 + r) * 18;
      if (rw > 8) game.draw.rect(740 - rw / 2, ry, rw, 4 + r * 0.4, C.wet, 0.55 - r * 0.025);
    }
    // 水たまり(空を映す)
    ellipse(260, 1230, 130, 16, '#c8708a', 0.55);
    ellipse(820, 1360, 170, 22, '#d88070', 0.5);
    ellipse(420, 1470, 210, 26, '#b86080', 0.45);
    // 杭(板)と接地影
    for (var s = 0; s < STAKES.length; s++) {
      var sx = STAKES[s][0], sy = STAKES[s][1], sc = 0.5 + (sy - HZ) / (H - HZ) * 1.6;
      ellipse(sx + 10 * sc, sy + 2, 22 * sc, 5 * sc, C.shadow, 0.45);
      game.draw.sprite(STAKE, SPAL[STAKES[s][2]], sx, sy - 40 * sc, 8 * sc, { anchor: 'center' });
    }
    // カニ(干潟の生きもの)
    var crx = 860 + Math.sin(t * 0.8) * 90;
    ellipse(crx, 1446, 30, 5, C.shadow, 0.4);
    game.draw.sprite(Math.floor(t * 6) % 2 ? CRAB_A : CRAB_B, CPAL, crx, 1430, 6, { anchor: 'center' });
  }

  function kiteFrame(phase) { return ((Math.floor(phase) % 3) + 3) % 3; }

  function drawShadows() {
    for (var j = TAILS; j >= 0; j--) {
      if (j > 0 && j > TAILS - misses) continue;
      var p = j === 0 ? kite : tailPos(j);
      var s = depth(p.y);
      ellipse(shadowX(p.x, p.y), shadowY(p.y), 46 * s, 9 * s, C.shadow, 0.35);
    }
    for (var g = 0; g < GULLS.length; g++) {
      if (!gWarn[g] || songT < GULLS[g].k * SPB) continue;
      var gx = gullX(GULLS[g], songT);
      if (gx < -100 || gx > W + 100) continue;
      ellipse(shadowX(gx, GULLS[g].y), shadowY(GULLS[g].y), 30, 6, C.shadow, 0.3);
    }
  }

  function drawRings() {
    for (var i = 0; i < CHART.length; i++) {
      if (res[i]) continue;
      var rg = CHART[i], T = rg.k * SPB, show = T - rg.lead * SPB;
      if (!running || songT < show) continue;
      var s = depth(rg.y), R = rg.r * s, big = rg.k % BAR === 0;
      var col = big ? C.sun : C.paper;
      var u = clamp((T - songT) / (rg.lead * SPB), 0, 1);
      var near = i === nextRing();
      game.draw.circle(rg.x, rg.y, R, col, near ? 0.16 : 0.07);
      game.draw.circle(rg.x, rg.y, R * CORE, col, near ? 0.3 : 0.12);
      ringLine(rg.x, rg.y, R, col, near ? 5 : 2);
      if (near && songT < T + GOOD_W) ringLine(rg.x, rg.y, R * (1 + u * 1.6), col, 3);
      // 拍の頭で光る芯
      if (near && Math.abs(songT - T) < 0.08) game.draw.circle(rg.x, rg.y, R * CORE, C.white, 0.5);
    }
    for (var f = ringFx.length - 1; f >= 0; f--) {
      var e = ringFx[f];
      ringLine(e.x, e.y, e.r * (1 + (0.45 - e.t) * 2.4), C.sun, 4);
    }
  }

  function drawGulls(t) {
    for (var g = 0; g < GULLS.length; g++) {
      var G = GULLS[g], s = depth(G.y);
      if (gWarn[g] && running && songT < G.k * SPB) {
        // 予告: 来る側の端が点滅し、通り道に点線
        if (Math.floor(t * 10) % 2 === 0) {
          var ex = G.dir > 0 ? 36 : W - 36;
          game.draw.circle(ex, G.y, 30, C.bad, 0.85);
          game.draw.rect(ex - 5, G.y - 18, 10, 22, C.white);
          game.draw.rect(ex - 5, G.y + 10, 10, 8, C.white);
        }
        for (var dx = 80; dx < W - 80; dx += 60) game.draw.rect(dx, G.y - 2, 26, 4, C.bad, 0.45);
        continue;
      }
      if (!gWarn[g]) continue;
      var gx = gullX(G, songT), gy = G.y;
      if (gHit[g]) { gx += gAway[g] * 300 * G.dir; gy -= gAway[g] * 400; }
      if (gx < -100 || gx > W + 100 || gy < 200) continue;
      game.draw.sprite(Math.floor(t * 8) % 2 ? GULL_A : GULL_B, GPAL[farness(gy) > 0.5 ? 1 : 0], gx, gy, 9 * s, { anchor: 'center', flipX: G.dir < 0 });
    }
  }

  function drawKites(t) {
    var phase = running ? beatN + beatT / SPB : t * 2.4;
    var pts = [{ x: 540 + clamp((kite.x - 540) / 40, -8, 8), y: ANCHOR.y }, { x: kite.x, y: kite.y }];
    var alive = TAILS - Math.min(misses, TAILS);
    for (var j = 1; j <= alive; j++) pts.push(tailPos(j));
    // 糸(手元→先頭→尾)
    for (var p = 0; p < pts.length - 1; p++) game.draw.line(pts[p].x, pts[p].y, pts[p + 1].x, pts[p + 1].y, p === 0 ? C.paper : '#f8d8c8', p === 0 ? 3 : 2);
    for (var q = pts.length - 1; q >= 1; q--) {
      var pt = pts[q], sc = depth(pt.y), c = q - 1, big = 1;
      if (q === 1 && hitStop > 0) big = 1.25;
      var pal = palFor(c, pt.y);
      if (q === 1 && hitStop > 0) game.draw.circle(pt.x, pt.y, 80 * sc, C.white, 0.6 * hitStop / HIT_STOP);
      game.draw.sprite(KFR[kiteFrame(phase - c * 0.35)], pal, pt.x, pt.y, 7 * sc * big, { anchor: 'center' });
      if (q === 1 && finger.on && state === S.PLAYING) game.draw.circle(pt.x, pt.y - 44 * sc, 8, C.white, 0.8);
    }
    // ちぎれて飛んでいく凧
    for (var l = 0; l < lost.length; l++) {
      var L = lost[l];
      if (L.t > 1.6) continue;
      game.draw.sprite(KFR[Math.floor(L.t * 9) % 3], palFor(L.c, L.y), L.x, L.y, 6 * depth(L.y), { anchor: 'center', alpha: Math.max(0, 1 - L.t / 1.6), flipY: Math.floor(L.t * 5) % 2 === 1 });
    }
  }

  function drawMaster(t) {
    var sway = Math.sin(t * 2) * 3;
    var tug = clamp((kite.x - 540) / 40, -8, 8);
    ellipse(540, 1792, 120, 16, C.shadow, 0.45);
    game.draw.sprite(MASTER, MPAL, 540 + sway, 1700, 12, { anchor: 'center' });
    // 糸巻きを掲げる腕
    game.draw.line(486 + sway, 1660, 528 + tug, 1572, C.jacket, 20);
    game.draw.line(594 + sway, 1660, 552 + tug, 1572, C.jacket, 20);
    game.draw.circle(540 + tug, 1562, 22, C.wood);
    game.draw.circle(540 + tug, 1562, 10, C.sun);

  }

  function drawLamps() {
    var pos = running ? beatN % BAR : -1;
    for (var i = 0; i < 3; i++) {
      var x = 400 + i * 140, y = H - 54, r = i === 0 ? 30 : 20;
      var on = i === pos && lampT > 0;
      game.draw.circle(x, y, r + 6, C.ink, 0.8);
      game.draw.circle(x, y, r, on ? (i === 0 ? C.sun : C.paper) : '#5a3a40');
      if (on) game.draw.circle(x, y, r * 1.8, C.sun, 0.3 * lampT);
    }
  }

  function drawScene(t) {
    drawWorld(t);
    drawShadows();
    drawRings();
    drawKites(t);
    drawGulls(t);
    drawMaster(t);
    if (finger.on && state === S.PLAYING) {
      game.draw.circle(finger.x, finger.y, 34, C.paper, 0.25);
      ringLine(finger.x, finger.y, 34, C.paper, 2);
    }
    drawLamps();
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.bad, 0.18 * flashT / HIT_STOP);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.ink, 0.72);
    game.draw.rect(0, 228, W, 8, C.sun, 0.8);
    label('SCORE ' + score, 56, 92, 52, C.sun, 'left');
    label('BEST ' + prevBest, 56, 164, 32, C.paper, 'left');
    label(hits + ' / ' + CHART.length, W - 56, 92, 54, C.paper, 'right');
    var alive = TAILS - Math.min(misses, TAILS);
    for (var m = 0; m < TAILS; m++) {
      game.draw.sprite(K_MID, KPAL[m + 1][m < alive ? 0 : 2], W - 96 - m * 74, 170, 4.2, { anchor: 'center', alpha: m < alive ? 1 : 0.25 });
    }
    var progress = clamp(songT / (SONG_BEATS * SPB), 0, 1);
    game.draw.rect(0, 228, W * progress, 8, C.red);
  }

  // ---- ATTRACT: 実ロジックで 拍どおりに輪へ導く → 1つだけ遅れてMISS(尾の凧が飛ぶ) → カモメをやり過ごす ----
  var DEMO_BEATS = 20;
  var DEMO_LATE = 4;
  var demo = { t: 0, x: 540, y: 1100 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB + 0.6);
    if (cyc < dt || demo.t <= dt) initGame(true);
    stepPlay(dt);
    var i = nextRing();
    if (i < 0) return;
    var rg = CHART[i], T = rg.k * SPB;
    var prev = i > 0 ? CHART[i - 1] : { x: 540, y: 760, k: 0 };
    var prevT = prev.k * SPB;
    var arrive = T - 0.2 + (i === DEMO_LATE ? 0.5 : 0);
    var leave = Math.max(prevT + 0.05, arrive - 0.55);
    var u = ease(clamp((songT - leave) / (arrive - leave), 0, 1));
    var kx = prev.x + (rg.x - prev.x) * u, ky = prev.y + (rg.y - prev.y) * u;
    demo.x = ANCHOR.x + (kx - ANCHOR.x) / LEVER;
    demo.y = ANCHOR.y + (ky - ANCHOR.y) / LEVER;
    setFinger(demo.x, demo.y);
  }

  function stepFx(dt) {
    for (var f = ringFx.length - 1; f >= 0; f--) { ringFx[f].t -= dt; if (ringFx[f].t <= 0) ringFx.splice(f, 1); }
    if (hitStop <= 0) for (var l = 0; l < lost.length; l++) { lost[l].t += dt; lost[l].x += lost[l].vx * dt; lost[l].y += lost[l].vy * dt; }
    for (var g = 0; g < gAway.length; g++) if (gHit[g]) gAway[g] += dt;
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (lampT > 0) lampT -= dt * 4;
    stepFx(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepKite(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: running, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.ink, 0.72);
      game.draw.rect(0, 228, W, 8, C.sun, 0.8);
      label(GAME_TITLE, W / 2, 110, 92 + Math.sin(t * 3) * 3, C.sun);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 34, C.paper);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.78, 46, C.sun);
      else label('TAP TO START', W / 2, H * 0.78, 42, C.paper);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud();
      game.draw.rect(100, H * 0.19, W - 200, H * 0.3, C.ink, 0.82);
      game.draw.rect(100, H * 0.19, W - 200, 6, C.sun);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 100, won ? C.sun : C.bad);
      label('SCORE ' + score, W / 2, H * 0.3, 60, C.paper);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.345, 34, C.paper);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.395, 54, C.sun);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.395, 42, C.paper);
      if (!won) label('あと' + Math.max(1, nextRing() < 0 ? 1 : CHART.length - nextRing()) + '個!', W / 2, H * 0.45, 52, C.sun);
      else label('x' + maxCombo, W / 2, H * 0.45, 48, C.sun);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.78, 40, C.paper);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, rings: hits, total: CHART.length, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, kites: 1 + TAILS - Math.min(misses, TAILS) };
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
    stepKite(dt);

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.sun);
    if (over && won) label('FINISH', W / 2, H * 0.36, 100, C.sun);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
