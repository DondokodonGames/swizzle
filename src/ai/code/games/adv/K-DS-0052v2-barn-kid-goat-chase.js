// K-DS-0052v2-barn-kid-goat-chase.js
// 納屋の子ヤギおいかけ — 跳ねる8分で跳び回る子ヤギを走って追いかけ、子ヤギがぴたりと止まった拍の頭で手のひらを出しておでこを受け止める
// 操作: 画面を押したまま指を動かすと、指の少し上の床へ子どもが走って子ヤギを追う(足もとの輪が手の届く範囲)。子ヤギは跳ねる8分(長・短)で床を跳び回り、止まる1拍前にメェと鳴いて着地点に蹄の輪が出る(下の拍ランプにも止まる拍が金色で出ている)。止まった拍の頭で指を離すと手のひらを前に出す(タップでもよい)。子ヤギが輪の中ならおでこを受け止めてPERFECT/GOOD。届かない・早すぎ/遅すぎ・出しそびれはMISS。止まる拍から遠い時に指を離すのは罰なし
// 終わり: 8小節(100BPM・32拍・約19秒・止まる拍9回)を終えてMISS 2回以内ならCLEAR(判定点+連続+残りの鈴)。MISS 3回で子ヤギが戸口から外へ跳び出してGAME OVER
// @mechanic: chase
// @theme: barn_kid_goat_chase
// 世界観: 春の農場の納屋で、農家の子どもがわらの床を跳ね回る子ヤギを追いかけ、子ヤギが足を止めて頭を下げた一瞬に手のひらでおでこを受け止めて遊ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・受け止めた回数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 90s LOW POLY
var STYLE = { bg: ['#2b2135', '#7a5a44'], main: ['#c7843f', '#ead47c', '#86c060'], accent: ['#ff7a96', '#ffffff'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点は毎フレーム微小にジッター、奥はフォグ色に沈める
  var DUSK = STYLE.bg[0], BEAM = STYLE.bg[1], WOOD = STYLE.main[0], STRAW = STYLE.main[1], LEAF = STYLE.main[2];
  var PINK = STYLE.accent[0], WHITE = STYLE.accent[1];
  var FOG = '#7d6c84', INK = '#1c1424', SKY = '#a8dcf2', GOLD = '#ffd24a', RED = '#ff4d5e', DWOOD = '#5a3a26';

  var GAME_TITLE = 'HOP GOAT';
  var BPM = 100;
  var SPB = 60 / BPM;          // 1拍 0.6秒
  var SWING = 2 / 3;           // 跳ねる8分: 長(2/3拍)→短(1/3拍)
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11, OFF_W = 0.2;
  var READY_T = 0.8;
  var N_BEATS = 32;
  var TIME_LIMIT = 20;         // 32拍 × 0.6秒 = 19.2秒。放置でも READY 0.8 + 19.4 + 余韻 2.4 ≒ 23秒で終わる
  var STOP_BEATS = [6, 10, 13, 16, 19, 21, 24, 26, 29];
  var DEMO_BEATS = 12;
  var DEMO_STOP_BEATS = [4, 7, 10];
  var DEMO_FAIL = 7;           // デモは2回目の止まりで逆へ走って届かずMISS
  var MISS_MAX = 3;
  var REACH = 200;             // 手の届く範囲(床の楕円: 横200・縦100)
  var KID_SPD = 950;
  var FINGER_UP = 260;         // 子どもは指の少し上を走る(指で隠れないように)
  var FLOOR_BACK = 700, FLOOR_FRONT = 1420;
  var LAMP_Y = 1690;

  // ---- スプライト ----
  var GOAT_STAND = [
    '...........h.h..',
    '..........wwwww.',
    '..........wkwwwp',
    '.w........wwwww.',
    '.ww.......wwg...',
    '..wwwwwwwwwww...',
    '..wwwwwwwwwww...',
    '..gwwwwwwwwwg...',
    '...ggwwwwwgg....',
    '...w.w...w.w....',
    '...w.w...w.w....',
    '...k.k...k.k....'
  ];
  var GOAT_LEAP = [
    '............h.h.',
    '...........wwwww',
    '...........wkwwp',
    '.w.........wwww.',
    '..ww......wwg...',
    '..wwwwwwwwwww...',
    '.wwwwwwwwwwww...',
    '.gwwwwwwwwwwg...',
    'w..ggwwwwwgg.w..',
    'w............w..',
    'k.............k.',
    '................'
  ];
  var GOAT_BUTT = [
    '................',
    '................',
    '.w..............',
    '.ww.........h.h.',
    '..wwwwwwwwwwwww.',
    '..wwwwwwwwwwkwww',
    '..wwwwwwwwwwwwwp',
    '..gwwwwwwwwg.ww.',
    '...ggwwwwwgg....',
    '...w.w...w.w....',
    '...w.w...w.w....',
    '...k.k...k.k....'
  ];
  var GOAT_PAL = { w: '#f6f0e4', g: '#c4b6a2', k: '#2a2026', p: '#ff9db2', h: '#d8b064' };
  var GOAT_FLASH = { w: WHITE, g: WHITE, k: WHITE, p: WHITE, h: WHITE };
  var KID_A = [
    '...hhhh.......',
    '..hhhhhh......',
    '..hhssss......',
    '..hsksks......',
    '...ssss.......',
    '...rrrr.......',
    '..rrrrrr......',
    '..srrrrs......',
    '...bbbb.......',
    '...b..b.......',
    '..bb...b......',
    '..o....o......',
    '.oo....oo.....'
  ];
  var KID_B = [
    '...hhhh.......',
    '..hhhhhh......',
    '..hhssss......',
    '..hsksks......',
    '...ssss.......',
    '...rrrr.......',
    '..rrrrrr......',
    '..srrrrs......',
    '...bbbb.......',
    '...bbbb.......',
    '....bb........',
    '....oo........',
    '...ooo........'
  ];
  var KID_PALM = [
    '...hhhh.......',
    '..hhhhhh......',
    '..hhssss......',
    '..hsksks......',
    '...ssss....ss.',
    '...rrrrrrrssss',
    '..rrrrrrrrssss',
    '..rrrrrr...ss.',
    '...bbbb.......',
    '...b..b.......',
    '...b..b.......',
    '..oo..oo......',
    '..............'
  ];
  var KID_PAL = { h: '#5a3420', s: '#f2c49a', k: INK, r: '#e2584a', b: '#3d6fb0', o: '#2a2026' };
  var HEART = ['.p.p.', 'ppppp', 'ppppp', '.ppp.', '..p..'];
  var BELL = ['..k..', '.ggg.', '.ggg.', 'ggggg', '..k..'];
  var GOAT_HEAD = ['h.h.', 'wwww', 'wkwp', 'www.'];

  // ---- 伴奏(オリジナル、Gメジャーの跳ねる納屋ダンス)。止まる拍はキメの一打で止める ----
  var MEL = [
    ['D5', 'B4'], ['G4', 'B4'], ['D5', 'E5'], ['D5', 'B4'],
    ['C5', 'E5'], ['G5', 'E5'], ['C5', 'E5'], ['D5', 'C5'],
    ['A4', 'D5'], ['F#5', 'E5'], ['D5', 'A4'], ['B4', 'C5'],
    ['B4', 'G4'], ['D5', 'G5'], ['F#5', 'G5'], ['D5', 'B4'],
    ['E5', 'G5'], ['B5', 'G5'], ['E5', 'F#5'], ['G5', 'E5'],
    ['C5', 'E5'], ['G5', 'A5'], ['G5', 'E5'], ['C5', 'D5'],
    ['D5', 'F#5'], ['A5', 'F#5'], ['E5', 'D5'], ['C5', 'A4'],
    ['B4', 'D5'], ['G5', 'D5'], ['B4', 'A4'], ['G4', 'R']
  ];
  var BASS = [['G2', 'B2', 'D3', 'B2'], ['C3', 'E3', 'G3', 'E3'], ['D3', 'F#3', 'A3', 'F#3'], ['G2', 'B2', 'D3', 'G2'],
    ['E2', 'G2', 'B2', 'G2'], ['C3', 'E3', 'G3', 'E3'], ['D3', 'F#3', 'A3', 'F#3'], ['G2', 'D3', 'G2', 'G2']];
  var STAB = ['G4', 'C5', 'D5', 'G4', 'E5', 'C5', 'D5', 'G4'];

  // ---- 状態 ----
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, nBeats, stops, stopMap, events, evIdx, running, songT, schedB, beatN, readyT, realT, hitStop;
  var goat, kid, pressing;
  var score, combo, maxCombo, perfects, goods, misses, palms, over, won, outroT, prevBest, beatPulse;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function floorL(y) { return 210 - 270 * (y - FLOOR_BACK) / (FLOOR_FRONT - FLOOR_BACK); }
  function floorR(y) { return W - floorL(y); }
  function depth(y) { return 0.62 + 0.38 * clamp((y - FLOOR_BACK) / (FLOOR_FRONT - FLOOR_BACK), 0, 1); }
  function clampFloor(p) {
    p.y = clamp(p.y, 790, 1370);
    p.x = clamp(p.x, floorL(p.y) + 110, floorR(p.y) - 110);
    return p;
  }
  function floorDist(ax, ay, bx, by) { var dx = ax - bx, dy = (ay - by) * 2; return Math.sqrt(dx * dx + dy * dy); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    nBeats = demoMode ? DEMO_BEATS : N_BEATS;
    var list = demoMode ? DEMO_STOP_BEATS : STOP_BEATS;
    stops = []; stopMap = {};
    for (var i = 0; i < list.length; i++) {
      stops.push({ b: list[i], t: list[i] * SPB, res: '', x: 540, y: 1000, shown: false });
      stopMap[list[i]] = i;
    }
    events = [];
    for (var b = 0; b < nBeats; b++) {
      events.push({ t: b * SPB, b: b, half: 0 });
      events.push({ t: (b + SWING) * SPB, b: b, half: 1 });
    }
    evIdx = 0;
    running = demoMode; songT = demoMode ? -0.2 : 0; schedB = 0; beatN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    goat = { x0: 540, y0: 790, x1: 540, y1: 790, gx: 540, gy: 790, h: 0, tDep: 0, tLand: 0.01, arc: 0, face: 1, mode: 'stand', flashT: 0, bumpT: 0, spinT: 0, alpha: 1 };
    kid = { x: 540, y: 1250, tx: 540, ty: 1250, face: 1, run: 0, moving: false, palmT: 0, dustT: 0, jumpT: 0 };
    pressing = false;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; palms = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; beatPulse = 0;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function playBeat(b) {
    if (demoMode || b >= nBeats) return;
    var bar = Math.floor(b / 4) % 8, i = b % 4;
    if (stopMap[b] !== undefined) {
      game.audio.melody([[STAB[bar], 0.3], ['R', 0.7]], { tempo: BPM, wave: 'square', volume: 0.06, bass: [[BASS[bar][0], 0.3], ['R', 0.7]], bassWave: 'triangle', bassVolume: 0.17 });
      game.audio.melody([[880, 0.08], ['R', 0.92]], { tempo: BPM, wave: 'triangle', volume: 0.08 });
      return;
    }
    var m = MEL[b % MEL.length];
    game.audio.melody([[m[0], SWING], [m[1], 1 - SWING]], { tempo: BPM, wave: 'square', volume: 0.034, bass: [[BASS[bar][i], SWING], ['R', 1 - SWING]], bassWave: 'triangle', bassVolume: i === 0 ? 0.14 : 0.1 });
    game.audio.melody([['R', SWING], [5600, 0.06], ['R', 0.27]], { tempo: BPM, wave: 'square', volume: 0.012 });
  }

  // ---- 子ヤギの跳び先: 子どもから離れる向きを好みつつ、床の中に収まる場所 ----
  function pickSpot(fx, fy, dist) {
    var base = Math.atan2((fy - kid.y) * 2, fx - kid.x);
    var best = null, bs = -1e9;
    for (var k = 0; k < 7; k++) {
      var a = base + game.random(-2.1, 2.1);
      var p = clampFloor({ x: fx + Math.cos(a) * dist, y: fy + Math.sin(a) * dist * 0.5 });
      var sc = floorDist(p.x, p.y, fx, fy) + 0.25 * Math.min(floorDist(p.x, p.y, kid.x, kid.y), 520) + game.random(0, 40);
      if (sc > bs) { bs = sc; best = p; }
    }
    return best;
  }

  function hop(toX, toY, t0, t1, arc) {
    goat.x0 = goat.x1; goat.y0 = goat.y1;
    goat.x1 = toX; goat.y1 = toY;
    goat.tDep = t0; goat.tLand = t1; goat.arc = arc;
    goat.mode = 'hop';
    if (Math.abs(toX - goat.x0) > 8) goat.face = toX > goat.x0 ? 1 : -1;
  }

  // ---- 8分のイベント(拍の頭 / 跳ねた裏)。1本の拍クロックから呼ばれる ----
  function onEvent(ev) {
    var b = ev.b;
    if (ev.half === 0) { beatPulse = 1; beatN = b; }
    if (stopMap[b] !== undefined) {
      if (ev.half === 0) {
        goat.mode = 'butt'; goat.gx = goat.x1; goat.gy = goat.y1; goat.h = 0;
        goat.face = kid.x >= goat.gx ? 1 : -1;
      }
      return;
    }
    var prog = demoMode ? 0.15 : b / nBeats;
    var longD = 170 + 130 * prog, shortD = 90 + 70 * prog;
    var ns = stopMap[b + 1];
    if (ev.half === 0) {
      var mid = pickSpot(goat.x1, goat.y1, longD);
      if (ns !== undefined) {
        // 止まる1拍前: 着地点を決めて蹄の輪を出し、メェと鳴く(0.6秒前の予告)
        var st = pickSpot(mid.x, mid.y, shortD);
        stops[ns].x = st.x; stops[ns].y = st.y; stops[ns].shown = true;
        sfx(760, 0.2, { wave: 'sawtooth', volume: 0.045, slide: -180 });
        sfx(700, 0.12, { wave: 'square', volume: 0.02, slide: -90 });
      }
      hop(mid.x, mid.y, ev.t, ev.t + SWING * SPB, 130);
    } else {
      var to = ns !== undefined ? { x: stops[ns].x, y: stops[ns].y } : pickSpot(goat.x1, goat.y1, shortD);
      hop(to.x, to.y, ev.t, (b + 1) * SPB, 70);
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < nBeats && songT >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (evIdx < events.length && songT >= events[evIdx].t) { onEvent(events[evIdx]); evIdx++; }
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      if (!s.res && songT > s.t + GOOD_W + 0.02) { s.res = 'skip'; missAt(s); if (over || hitStop > 0) return; }
    }
    if (songT >= nBeats * SPB + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function stepGoat(dt) {
    if (goat.flashT > 0) goat.flashT -= dt;
    if (goat.bumpT > 0) goat.bumpT -= dt;
    if (goat.spinT > 0) goat.spinT -= dt;
    if (goat.mode === 'hop') {
      var u = clamp((songT - goat.tDep) / Math.max(0.01, goat.tLand - goat.tDep), 0, 1);
      goat.gx = lerp(goat.x0, goat.x1, u); goat.gy = lerp(goat.y0, goat.y1, u);
      goat.h = Math.sin(Math.PI * u) * goat.arc * depth(goat.gy);
    }
  }

  function setTarget(x, y) {
    var p = clampFloor({ x: x, y: y - FINGER_UP });
    kid.tx = p.x; kid.ty = p.y;
  }

  function stepKid(dt) {
    if (kid.palmT > 0) kid.palmT -= dt;
    if (kid.dustT > 0) kid.dustT -= dt;
    if (kid.jumpT > 0) kid.jumpT -= dt;
    var mv = demoMode ? demo.down : pressing;
    kid.moving = false;
    if (!mv || kid.palmT > 0.15) return;
    var dx = kid.tx - kid.x, dy = kid.ty - kid.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 4) return;
    var st = Math.min(d, KID_SPD * dt);
    kid.x += dx / d * st; kid.y += dy / d * st;
    kid.moving = true; kid.run += dt;
    if (Math.abs(dx) > 6) kid.face = dx > 0 ? 1 : -1;
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; if (goat.flashT > 0) goat.flashT -= dt; return; }
    stepPlay(dt);
    stepGoat(dt);
    stepKid(dt);
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function palmAt() {
    if (!running || over || hitStop > 0) return;
    kid.palmT = 0.32;
    kid.face = goat.gx >= kid.x ? 1 : -1;
    var best = null, bd = 9;
    for (var i = 0; i < stops.length; i++) {
      if (stops[i].res) continue;
      var d = Math.abs(songT - stops[i].t);
      if (d < bd) { bd = d; best = stops[i]; }
    }
    if (!best || bd > OFF_W) { sfx(520, 0.05, { wave: 'triangle', volume: 0.04, slide: -120 }); return; }
    if (bd > GOOD_W) { best.res = 'miss'; missAt(best); return; }
    if (floorDist(kid.x, kid.y, best.x, best.y) > REACH) { best.res = 'miss'; missAt(best); return; }
    hitAt(best, bd);
  }

  function hitAt(s, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    s.res = w;
    combo++; palms++;
    if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 60) + combo * 10;
    goat.bumpT = 0.3; kid.jumpT = 0.25;
    var hx = (s.x + kid.x) / 2, hy = Math.min(s.y, kid.y) - 150;
    if (demoMode) game.fx.popup(w, hx, hy - 40, { color: GOLD, size: 50 });
    else game.feedback.good(hx, hy - 40, { text: w, color: w === 'PERFECT' ? GOLD : WHITE, size: w === 'PERFECT' ? 58 : 46, count: 12 });
    game.fx.burst(hx, hy + 40, { color: PINK, count: 10, speed: 260 });
    sfx(1046, 0.05, { wave: 'square', volume: 0.06 });
    sfx(1568, 0.09, { wave: 'triangle', volume: 0.05 });
    if (!demoMode && (combo === 3 || combo === 6)) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('COMBO ' + combo, W / 2, 560, { color: GOLD, size: 80 });
    }
    if (!demoMode && palms === 5) game.fx.popup('NICE', W / 2, 460, { color: LEAF, size: 70 });
  }

  function missAt(s) {
    misses++; combo = 0;
    hitStop = 0.4; goat.flashT = 0.45; goat.spinT = 0.9;
    var mx = s.shown ? s.x : goat.gx, my = (s.shown ? s.y : goat.gy) - 170;
    sfx(150, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', mx, my, { color: RED, size: 60 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(mx, my, { text: 'MISS', shake: 10, flashColor: WHITE });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.4; running = false;
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 7; i++) game.fx.burst(140 + i * 133, 820 + (i % 3) * 160, { color: [GOLD, PINK, LEAF, WHITE][i % 4], count: 16, speed: 420 });
      goat.mode = 'cuddle';
    } else {
      game.audio.play('se_failure', 0.5);
      goat.mode = 'escape'; goat.x0 = goat.gx; goat.y0 = goat.gy;
    }
  }

  function stepOutro(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    if (goat.flashT > 0) goat.flashT -= dt;
    if (kid.jumpT > 0) kid.jumpT -= dt;
    if (goat.mode === 'cuddle') {
      var tx = kid.x - kid.face * 110, ty = kid.y - 4;
      goat.gx += (tx - goat.gx) * Math.min(1, dt * 4); goat.gy += (ty - goat.gy) * Math.min(1, dt * 4);
      goat.h = Math.abs(Math.sin(game.time.elapsed * 9)) * 30;
      goat.face = kid.x >= goat.gx ? 1 : -1;
      if (Math.random() < dt * 4) game.fx.burst(goat.gx, goat.gy - 120, { color: PINK, count: 3, speed: 120 });
    } else if (goat.mode === 'escape') {
      goat.gx += (540 - goat.gx) * Math.min(1, dt * 2.2); goat.gy += (735 - goat.gy) * Math.min(1, dt * 2.2);
      goat.h = Math.abs(Math.sin(game.time.elapsed * 7)) * 90 * depth(goat.gy);
      goat.face = 540 >= goat.gx ? 1 : -1;
      goat.alpha = clamp((goat.gy - 740) / 120, 0, 1);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    pressing = true;
    setTarget(x, y);
    if (readyT <= 0) game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing || over) return;
    setTarget(x, y);
    if (kid.moving && kid.dustT <= 0) { kid.dustT = 0.2; game.fx.burst(kid.x, kid.y, { color: STRAW, count: 3, speed: 90 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    pressing = false;
    if (over || readyT > 0 || !running) return;
    game.audio.tone(880, 0.03, { wave: 'square', volume: 0.03 });
    palmAt();
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画ヘルパー(ローポリ) ----
  function hx2(n) { var s = clamp(Math.round(n), 0, 255).toString(16); return s.length < 2 ? '0' + s : s; }
  function mix(a, b, t) {
    var ar = parseInt(a.substr(1, 2), 16), ag = parseInt(a.substr(3, 2), 16), ab = parseInt(a.substr(5, 2), 16);
    var br = parseInt(b.substr(1, 2), 16), bg = parseInt(b.substr(3, 2), 16), bb = parseInt(b.substr(5, 2), 16);
    return '#' + hx2(ar + (br - ar) * t) + hx2(ag + (bg - ag) * t) + hx2(ab + (bb - ab) * t);
  }
  function jit(k) { return Math.sin(game.time.elapsed * 29 + k * 12.99) * 1.3; }
  // 凸多角形を横ストリップで塗る(pts = [[x,y],...])
  function fillPoly(pts, col, step, al) {
    var minY = 1e9, maxY = -1e9, n = pts.length, i;
    for (i = 0; i < n; i++) { if (pts[i][1] < minY) minY = pts[i][1]; if (pts[i][1] > maxY) maxY = pts[i][1]; }
    step = step || 2;
    for (var y = Math.floor(minY); y < maxY; y += step) {
      var yc = y + step * 0.5, xl = 1e9, xr = -1e9;
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          var x = a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, step, col, al);
    }
  }
  function edges(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      game.draw.line(a[0], a[1], b[0], b[1], col, w || 2);
    }
  }
  function jp(pts, k) {
    var out = [];
    for (var i = 0; i < pts.length; i++) out.push([pts[i][0] + jit(k + i), pts[i][1] + jit(k + i + 5)]);
    return out;
  }
  function octo(cx, cy, rx, ry, col, al) {
    var p = [];
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + Math.PI / 8; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    fillPoly(p, col, 2, al);
  }
  function ringE(cx, cy, rx, ry, col, w) {
    for (var i = 0; i < 16; i++) {
      var a1 = i / 16 * Math.PI * 2, a2 = (i + 1) / 16 * Math.PI * 2;
      game.draw.line(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry, col, w);
    }
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function bale(x, y, w, h, d, k) {
    var front = jp([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], k);
    var top = jp([[x, y], [x + w, y], [x + w - d, y - d * 0.6], [x - d * 0.2, y - d * 0.6]], k + 3);
    fillPoly(front, '#c9a14e', 2);
    fillPoly(top, STRAW, 2);
    for (var i = 1; i < 4; i++) game.draw.line(x, y + h * i / 4, x + w, y + h * i / 4, '#a07c34', 2);
    game.draw.line(x + w * 0.3, y - d * 0.6, x + w * 0.3, y + h, DWOOD, 3);
    game.draw.line(x + w * 0.7, y - d * 0.6, x + w * 0.7, y + h, DWOOD, 3);
    edges(front, DWOOD, 2);
    edges(top, DWOOD, 2);
  }

  var TUFTS = [[300, 860], [760, 900], [420, 1010], [650, 1080], [240, 1160], [880, 1190], [520, 1260], [330, 1340], [760, 1330], [560, 930]];

  function drawBarn() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, DUSK], [0.4, BEAM], [1, '#3a2a26']]);
    // 天井と梁
    fillPoly([[0, 230], [W, 230], [870, 330], [210, 330]], '#3b2a30', 2);
    for (var r = 0; r < 5; r++) {
      var bx = 60 + r * 240;
      game.draw.line(bx + jit(r), 230, 210 + (bx / W) * 660, 330, BEAM, 6);
    }
    // 左右の壁(板張り、奥へ収束)
    fillPoly(jp([[0, 230], [210, 330], [210, FLOOR_BACK], [0, 1000]], 1), '#6b4630', 2);
    fillPoly(jp([[W, 230], [870, 330], [870, FLOOR_BACK], [W, 1000]], 9), '#5e3d2a', 2);
    for (var p = 1; p < 6; p++) {
      var f = p / 6;
      game.draw.line(210 * f, 230 + 100 * f, 210 * f, 1000 - 300 * f, DWOOD, 3);
      game.draw.line(W - 210 * f, 230 + 100 * f, W - 210 * f, 1000 - 300 * f, DWOOD, 3);
    }
    // 奥の壁と開いた戸口(外は春の牧場、光源)
    fillPoly([[210, 330], [870, 330], [870, FLOOR_BACK], [210, FLOOR_BACK]], '#80583a', 2);
    for (var q = 0; q < 12; q++) game.draw.line(210 + q * 55, 330, 210 + q * 55, FLOOR_BACK, '#6a4630', 2);
    var dl = 430, dr = 650, dt0 = 470;
    for (var y = dt0; y < FLOOR_BACK; y += 2) game.draw.rect(dl, y, dr - dl, 2, mix(SKY, '#e8f6ff', (y - dt0) / (FLOOR_BACK - dt0) * 0.6));
    fillPoly([[dl, 640], [dr, 610], [dr, FLOOR_BACK], [dl, FLOOR_BACK]], LEAF, 2);
    fillPoly([[dl, 660], [560, 645], [dr, 668], [dr, FLOOR_BACK], [dl, FLOOR_BACK]], '#6aa848', 2);
    game.draw.rect(588, 560, 10, 70, DWOOD);
    for (var bl = 0; bl < 6; bl++) game.draw.circle(575 + (bl % 3) * 18 + jit(bl) * 2, 548 + Math.floor(bl / 3) * 20, 18, bl % 2 ? PINK : '#ffd0dc');
    game.draw.circle(480, 520, 22, '#fff6c8');
    edges([[dl, dt0], [dr, dt0], [dr, FLOOR_BACK], [dl, FLOOR_BACK]], DWOOD, 6);
    // 戸板(左右に開いている)
    fillPoly(jp([[dl - 120, 480], [dl - 10, 470], [dl - 10, FLOOR_BACK], [dl - 120, FLOOR_BACK + 18]], 20), '#8e5f3a', 2);
    fillPoly(jp([[dr + 10, 470], [dr + 120, 480], [dr + 120, FLOOR_BACK + 18], [dr + 10, FLOOR_BACK]], 24), '#8e5f3a', 2);
    game.draw.line(dl - 120, 480, dl - 10, FLOOR_BACK, DWOOD, 3);
    game.draw.line(dr + 120, 480, dr + 10, FLOOR_BACK, DWOOD, 3);
    // 床(奥ほどフォグ色)
    for (var fy = FLOOR_BACK; fy < FLOOR_FRONT; fy += 2) {
      var k = (fy - FLOOR_BACK) / (FLOOR_FRONT - FLOOR_BACK);
      game.draw.rect(floorL(fy), fy, floorR(fy) - floorL(fy), 2, mix(FOG, '#c9a45a', Math.min(1, k * 1.3)));
    }
    for (var pl = 0; pl <= 8; pl++) {
      var x0 = 210 + pl * 82.5, x1 = -60 + pl * 150;
      game.draw.line(x0 + jit(pl), FLOOR_BACK, x1 + jit(pl + 3), FLOOR_FRONT, '#9a7a44', 2);
    }
    // 戸口からの光
    fillPoly([[dl, FLOOR_BACK], [dr, FLOOR_BACK], [760, 1180], [320, 1180]], '#fff6d0', 3, 0.1 + 0.03 * Math.sin(t * 2));
    // わらくず(三角)
    for (var s = 0; s < TUFTS.length; s++) {
      var tx = TUFTS[s][0], ty = TUFTS[s][1], dd = depth(ty);
      fillPoly(jp([[tx - 26 * dd, ty], [tx + 4 * dd, ty - 18 * dd], [tx + 30 * dd, ty + 2]], s * 3), STRAW, 2);
      game.draw.line(tx - 20 * dd, ty - 2, tx + 24 * dd, ty - 12 * dd, '#b8902e', 2);
    }
    // 干し草の束(壁ぎわ)
    bale(40, 900, 150, 90, 60, 40);
    bale(-20, 1080, 170, 110, 70, 50);
    bale(890, 930, 150, 90, 60, 60);
    // 奥のフォグ
    game.draw.rect(0, 330, W, FLOOR_BACK - 330, FOG, 0.18);
    game.draw.rect(0, FLOOR_BACK, W, 80, FOG, 0.12);
  }

  function drawMarker() {
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      if (!s.shown || s.res) continue;
      var k = clamp((s.t - songT) / SPB, 0, 1);
      var dd = depth(s.y);
      octo(s.x, s.y, 110 * dd, 50 * dd, GOLD, 0.16 + (1 - k) * 0.22);
      ringE(s.x, s.y, (70 + 150 * k) * dd, (34 + 70 * k) * dd, GOLD, 5);
      ringE(s.x, s.y, 70 * dd, 34 * dd, WHITE, 3);
      for (var h = 0; h < 4; h++) octo(s.x + (h % 2 ? 24 : -24) * dd, s.y + (h < 2 ? -10 : 12) * dd, 9 * dd, 6 * dd, DWOOD, 0.8);
      break;
    }
  }

  function drawReach() {
    var tgt = null;
    for (var i = 0; i < stops.length; i++) if (stops[i].shown && !stops[i].res) { tgt = stops[i]; break; }
    var inR = tgt ? floorDist(kid.x, kid.y, tgt.x, tgt.y) <= REACH : floorDist(kid.x, kid.y, goat.gx, goat.gy) <= REACH;
    ringE(kid.x, kid.y, REACH, REACH * 0.5, inR ? GOLD : WHITE, inR ? 5 : 3);
    if (inR) octo(kid.x, kid.y, REACH, REACH * 0.5, GOLD, 0.08);
  }

  function drawGoat() {
    var dd = depth(goat.gy), px = 11 * dd;
    var al = goat.alpha;
    octo(goat.gx, goat.gy, 70 * dd, 22 * dd, INK, 0.3 * al);
    var art = goat.mode === 'butt' ? GOAT_BUTT : (goat.h > 12 ? GOAT_LEAP : GOAT_STAND);
    if (goat.mode === 'cuddle') art = GOAT_BUTT;
    var pal = goat.flashT > 0 && Math.floor(goat.flashT * 20) % 2 === 0 ? GOAT_FLASH : GOAT_PAL;
    var sc = goat.flashT > 0 ? 1.3 : 1;
    var bump = goat.bumpT > 0 ? goat.face * Math.sin(goat.bumpT / 0.3 * Math.PI) * 26 : 0;
    var wob = goat.mode === 'butt' ? Math.sin(game.time.elapsed * 14) * 2 : 0;
    var flip = goat.face < 0;
    if (goat.spinT > 0 && hitStop <= 0) flip = Math.floor(goat.spinT * 10) % 2 === 0;
    game.draw.sprite(art, pal, goat.gx + bump, goat.gy - goat.h - 6 * px + wob, px * sc, { anchor: 'center', flipX: flip, alpha: al });
  }

  function drawKid() {
    var dd = depth(kid.y), px = 12 * dd;
    octo(kid.x, kid.y, 56 * dd, 18 * dd, INK, 0.3);
    var art = kid.palmT > 0 ? KID_PALM : (kid.moving ? (Math.floor(kid.run * 10) % 2 ? KID_A : KID_B) : KID_B);
    var hopY = kid.jumpT > 0 ? Math.sin(kid.jumpT / 0.25 * Math.PI) * 24 : (kid.moving ? Math.abs(Math.sin(kid.run * 20)) * 8 : 0);
    var flip = kid.face < 0;
    game.draw.sprite(art, KID_PAL, kid.x + (flip ? -2.5 : 2.5) * px, kid.y - 6.5 * px - hopY, px, { anchor: 'center', flipX: flip });
  }

  function drawBoard() {
    // 親指ゾーン: 手前の柵と拍ランプの板
    game.draw.gradient(FLOOR_FRONT, H, [[0, '#4a3024'], [1, '#231820']]);
    fillPoly(jp([[0, FLOOR_FRONT - 10], [W, FLOOR_FRONT - 10], [W, FLOOR_FRONT + 26], [0, FLOOR_FRONT + 26]], 70), WOOD, 2);
    game.draw.line(0, FLOOR_FRONT - 10, W, FLOOR_FRONT - 10, '#e0a860', 3);
    for (var p = 0; p < 6; p++) fillPoly(jp([[60 + p * 196, FLOOR_FRONT + 26], [92 + p * 196, FLOOR_FRONT + 26], [92 + p * 196, FLOOR_FRONT + 150], [60 + p * 196, FLOOR_FRONT + 150]], 80 + p), '#8a5a34', 2);
    fillPoly(jp([[40, LAMP_Y - 90], [W - 40, LAMP_Y - 90], [W - 60, LAMP_Y + 90], [60, LAMP_Y + 90]], 90), '#3a2620', 2);
    edges([[40, LAMP_Y - 90], [W - 40, LAMP_Y - 90], [W - 60, LAMP_Y + 90], [60, LAMP_Y + 90]], WOOD, 4);
    // 拍ランプ: 今の小節の4拍(金=止まる拍)+ 跳ねた裏の小さな点
    var bar = Math.max(0, Math.floor(Math.max(0, beatN) / 4));
    var pos = songT / SPB - bar * 4;
    for (var i = 0; i < 4; i++) {
      var b = bar * 4 + i, x = 190 + i * 233;
      var isStop = stopMap[b] !== undefined;
      var now = b === beatN && running;
      var col = isStop ? GOLD : LEAF;
      var r = 46 + (now ? beatPulse * 16 : 0);
      octo(x, LAMP_Y, r, r, b < beatN || !running ? mix(col, '#3a2620', 0.6) : col, 1);
      if (now) octo(x, LAMP_Y, r + 18, r + 18, WHITE, 0.25 * beatPulse);
      if (isStop) game.draw.sprite(GOAT_HEAD, GOAT_PAL, x, LAMP_Y, 12, { anchor: 'center' });
      if (!isStop) {
        var sx = x + 233 * SWING;
        octo(sx, LAMP_Y + 30, 14, 14, pos > i + SWING && pos < i + 1 ? WHITE : '#6a5a50', 1);
      }
    }
    if (running && pos >= 0 && pos < 4) {
      var mx = 190 + pos * 233;
      game.draw.line(mx, LAMP_Y - 80, mx, LAMP_Y + 80, WHITE, 4);
    }
  }

  function drawScene() {
    drawBarn();
    drawMarker();
    drawReach();
    if (goat.gy < kid.y) { drawGoat(); drawKid(); } else { drawKid(); drawGoat(); }
    drawBoard();
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.06);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 222, INK);
    game.draw.rect(0, 222, W, 8, BEAM);
    label('SCORE ' + score, 40, 92, 52, WHITE, 'left');
    label('BEST ' + prevBest, 40, 160, 32, GOLD, 'left');
    label(palms + ' / ' + stops.length, W - 40, 92, 52, STRAW, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(BELL, { k: DWOOD, g: i < MISS_MAX - misses ? GOLD : '#4a3c40' }, W - 200 + i * 64, 160, 10, { anchor: 'center' });
    var progress = clamp(songT / (nBeats * SPB), 0, 1);
    game.draw.rect(0, 222, W * progress, 8, LEAF);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.36;
    fillPoly(jp([[70, y0], [W - 70, y0 + 10], [W - 90, y0 + hh], [90, y0 + hh - 10]], 110), INK, 3, 0.92);
    edges([[70, y0], [W - 70, y0 + 10], [W - 90, y0 + hh], [90, y0 + hh - 10]], won ? GOLD : RED, 5);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, won ? GOLD : RED);
    label('SCORE ' + score, W / 2, H * 0.36, 60, WHITE);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, STRAW);
    label(palms + ' / ' + stops.length, W / 2, H * 0.45, 52, WHITE);
    label('COMBO ' + maxCombo, W / 2, H * 0.49, 40, PINK);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 58, GOLD);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 42, GOLD);
    if (!won) {
      var left = 0;
      for (var i = 0; i < stops.length; i++) if (!stops[i].res) left++;
      label('あと' + Math.max(1, left) + '回', W / 2, H * 0.21, 60, RED);
    }
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.585, 36, WHITE);
  }

  // ---- ATTRACT: ゴーストの指が子どもを走らせて子ヤギを追い、止まった拍の頭で離して受け止める。2回目は逆へ走って届かずMISS ----
  var demo = { t: 0, x: 540, y: 1500, down: true, rel: 0 };
  var DEMO_LEN = DEMO_BEATS * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.x = 540; demo.y = 1500; demo.down = true; demo.rel = 0; }
    tickWorld(dt);
    if (demo.rel > 0) { demo.rel -= dt; if (demo.rel <= 0) demo.down = true; }
    var s = null;
    for (var i = 0; i < stops.length; i++) if (!stops[i].res) { s = stops[i]; break; }
    var tx = goat.gx, ty = goat.gy + FINGER_UP + 40;
    var failing = s && s.b === DEMO_FAIL && songT > (s.b - 2) * SPB;
    if (failing) { tx = goat.gx < 540 ? 930 : 150; ty = 1330 + FINGER_UP; }
    else if (s && s.shown) { tx = s.x; ty = s.y + FINGER_UP; }
    var dx = tx - demo.x, dy = ty - demo.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 2 && hitStop <= 0) { var st = Math.min(d, 1300 * dt); demo.x += dx / d * st; demo.y += dy / d * st; }
    if (demo.down) setTarget(demo.x, demo.y);
    if (s && !failing && s.shown && demo.down && songT >= s.t - 0.01) {
      demo.down = false; demo.rel = 0.35;
      palmAt();
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.down, scale: 14 });
      game.draw.rect(0, 0, W, 222, INK);
      game.draw.rect(0, 222, W, 8, BEAM);
      fillPoly(jp([[W / 2 - 330, 40], [W / 2 + 330, 30], [W / 2 + 300, 150], [W / 2 - 300, 158]], 130), BEAM, 3);
      label(GAME_TITLE, W / 2, 122 + Math.sin(t * 3) * 4, 96, Math.floor(t * 3) % 2 ? STRAW : WHITE);
      label('HI-SCORE ' + game.best, W / 2, 200, 34, GOLD);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, GOLD);
      else label('TAP TO START', W / 2, H * 0.965, 42, WHITE);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      stepOutro(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, palms: palms, total: stops.length, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = -LEAD; game.audio.play('se_tap', 0.4); }
    } else {
      tickWorld(dt);
      if (!over && realT > READY_T + TIME_LIMIT + 2) finish(misses < MISS_MAX);
    }

    drawScene();
    drawHud();
    if (pressing && !over) game.draw.circle(kid.tx, kid.ty + FINGER_UP, 30, WHITE, 0.2);
    if (readyT > 0) {
      game.draw.rect(0, H * 0.4, W, 170, INK, 0.85);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 118, 110, GOLD);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.5, 100, won ? GOLD : RED);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
