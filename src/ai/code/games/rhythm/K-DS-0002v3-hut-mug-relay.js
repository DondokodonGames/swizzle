// K-DS-0002v3-hut-mug-relay.js
// 山小屋のマグ回し — 暖炉を囲む5人の輪をマグが1拍に1人ずつ巡る。自分の前に届く拍の頭だけ受け取り、それ以外はじっと動かない。吹雪で伴奏が消えて霧に包まれても拍を数えて待つ
// 操作: 画面のどこでも押すとマグを受け取る(押した瞬間で判定)。マグは左隣から手前の自分に届く。5人の輪を4拍子で回るので届く拍は小節の中で1拍ずつずれていく。届く拍以外に触る(身じろぎ)・早取り・受け損ねはMISS。窓が鳴って吹雪が来ると伴奏と拍のランプが消え、霧でマグが見えなくなる(拍は続いている。暖炉のはぜる音は拍の裏で鳴るおとり)
// 終わり: 8小節(約15秒・マグ5回)を終えて MISS 2回以内ならCLEAR(霧の中で受け取ると得点2倍)。MISS 3回でGAME OVER
// @mechanic: freeze
// @theme: mountain_hut_mug_relay
// 世界観: 真冬の山小屋の暖炉の前で、登山者たちが輪になって温かいマグを1拍ずつ順に回し、吹雪が窓を叩いて伴奏も灯も消えた間も拍を数えて自分の番だけ受け取る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・受け取ったマグの数
// スタイル: 90s LOW POLY
var STYLE = { bg: ['#1d1820', '#3a2a24', '#5a4232'], main: ['#b8743a', '#e7d3b0', '#4f7396'], accent: ['#ff8a2a', '#ffe08a'] };

(function (game) {
  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点は毎フレーム微小に揺れる。遠景と吹雪はフォグ色の矩形で潰す
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    dark: STYLE.bg[0], wall: STYLE.bg[1], wall2: STYLE.bg[2],
    wood: STYLE.main[0], cream: STYLE.main[1], blue: STYLE.main[2],
    fire: STYLE.accent[0], glow: STYLE.accent[1],
    woodD: '#6e4222', woodL: '#d08a4a', stone: '#8a8580', stoneD: '#5e5a58', stoneL: '#a9a39b',
    fog: '#b9c3cd', fog2: '#dde3e9', skin: '#e8b48a', skinD: '#c48a62', hair: '#5a3a2a', hairD: '#43291c',
    rug: '#9a3a32', rugD: '#702822', ink: '#140f12', snow: '#eef3f8', red: '#e0483a',
    mug: '#d9e0e6', mugD: '#9ea8b2', cocoa: '#6a3a22', cold: '#8fb4d6', pants: '#3a3440'
  };
  var JK = [['#4f7396', '#36536f'], ['#c0503a', '#8e3a2a'], ['#5f8a4a', '#436436'], ['#c99a3a', '#97712a'], ['#7a5a9a', '#57406f']];
  var HAT = ['#e7d3b0', '#3a6aa0', '#e0b030', '#d0483a', '#3a8a6a'];

  var GAME_TITLE = 'MUG ROUND';
  var BPM = 132;
  var SPB = 60 / BPM;
  var TIME_LIMIT = 15;
  var INTRO = 4;                  // 1小節目: 小屋番が暖炉でマグに注ぐ(カウント)
  var SONG_BEATS = 32;            // 8小節。32拍目の頭で全員が乾杯して終わる
  var NSEAT = 5;                  // 0 = 自分(手前)。マグは 1→2→3→4→0 と巡る
  var PERFECT_W = 0.06;
  var GOOD_W = 0.13;
  var RUSH_W = 0.26;
  var MISS_MAX = 3;
  var HIT_STOP = 0.4;
  var BREAKS = [[12, 16], [20, 28]];   // 伴奏が抜ける拍の区間(吹雪)
  var CRACKLE = [14.5, 21.5, 25.5];    // 暖炉のはぜる音(拍の裏のおとり)
  var SEAT_ANG = [90, 18, -54, -126, -198];

  function holder(k) { return k < INTRO || k >= SONG_BEATS ? -1 : (k - INTRO + 1) % NSEAT; }
  var ARR = [];
  for (var ak = INTRO; ak < SONG_BEATS; ak++) if (holder(ak) === 0) ARR.push(ak);
  function inBreak(k) { for (var i = 0; i < BREAKS.length; i++) if (k >= BREAKS[i][0] && k < BREAKS[i][1]) return true; return false; }

  // 伴奏(オリジナル)。山の民謡ふうの4拍子。吹雪の小節は鳴らさない
  var MEL = {
    0: [['G4', 1], ['B4', 1], ['D5', 1], ['G5', 1]],
    1: [['E5', 1], ['D5', 0.5], ['B4', 0.5], ['D5', 1], ['G4', 1]],
    2: [['A4', 1], ['B4', 0.5], ['C5', 0.5], ['D5', 2]],
    4: [['E5', 1], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1]],
    7: [['B4', 1], ['A4', 0.5], ['G4', 0.5], ['A4', 1], ['D5', 1]],
    8: [['G5', 2]]
  };
  var BASS = { 0: ['G2', 'D3'], 1: ['C3', 'G2'], 2: ['D3', 'A2'], 4: ['C3', 'G2'], 7: ['D3', 'A2'], 8: ['G2', 'G2'] };

  // ---- ドット絵(顔・湯気・身じろぎの印) ----
  var FACE = ['.k....k.', '........', '...mm...'];
  var FACE_BLINK = ['.kk..kk.', '........', '...mm...'];
  var FACE_SIP = ['.k....k.', '........', '...oo...', '...oo...'];
  var FACE_GLARE = ['kk....kk', '.k....k.', '..mmmm..'];
  var FPAL = { k: '#2a1e1a', m: '#a0483a', o: '#2a1e1a' };
  var STEAM = [['.#..', '..#.', '.#..', '#...', '.#..'], ['..#.', '.#..', '..#.', '...#', '..#.']];
  var BANG = ['##', '##', '##', '##', '..', '##'];
  var FLAKE = ['.#.', '###', '.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, lampT, warnT, sparkT, glareT, coldT, cheerT, pressFx;
  var res, warned, crackled, score, combo, maxCombo, perfects, goods, misses, hits, blindHits, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; warnT = 0; sparkT = 0; glareT = 0; coldT = 0; cheerT = 0; pressFx = 0;
    res = []; warned = []; crackled = [];
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0; blindHits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function playBar(b) {
    if (!armed || !MEL[b]) return;
    game.audio.melody(MEL[b], { tempo: BPM, wave: 'square', volume: 0.035 * vol(), bass: [[BASS[b][0], 1], [BASS[b][1], 1], [BASS[b][0], 1], [BASS[b][1], 1]], bassWave: 'triangle', bassVolume: 0.09 * vol() });
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k === SONG_BEATS) { cheers(); return; }
    if (k > SONG_BEATS) return;
    if (inBreak(k)) return;                       // 吹雪の間: 伴奏もマグの音もランプも消える
    lampT = 1;
    if (k < INTRO) {
      tone(k === 0 ? 1568 : 1175, 0.05, { wave: 'square', volume: 0.05 * vol() });
      return;
    }
    // マグが手から手へ渡る音(コトン)
    tone('G3', 0.06, { wave: 'square', volume: 0.05 * vol() });
    tone(1400, 0.02, { wave: 'triangle', volume: 0.03 * vol() });
  }

  function cheers() {
    cheerT = 1.2;
    tone('G5', 0.3, { wave: 'triangle', volume: 0.07 * vol() });
    tone('B5', 0.3, { wave: 'triangle', volume: 0.05 * vol() });
    tone(2600, 0.05, { wave: 'triangle', volume: 0.05 * vol() });
    game.fx.burst(540, 760, { color: C.glow, count: 24, speed: 380 });
    if (!demoMode) finish(misses < MISS_MAX);
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); if (!running) return; }
    songT = beatN * SPB + beatT;
    if (nextBar * 4 <= SONG_BEATS && songT >= nextBar * 4 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    // 吹雪の予告(0.7秒前): 窓が鳴り、風の音
    for (var b = 0; b < BREAKS.length; b++) {
      if (!warned[b] && songT >= BREAKS[b][0] * SPB - 0.7) {
        warned[b] = true; warnT = 0.9;
        tone(420, 0.6, { wave: 'sawtooth', volume: 0.03 * vol(), slide: -260 });
        tone(260, 0.5, { wave: 'triangle', volume: 0.05 * vol(), slide: 120 });
      }
    }
    // 暖炉のはぜる音(おとり)
    for (var c = 0; c < CRACKLE.length; c++) {
      if (!crackled[c] && songT >= CRACKLE[c] * SPB) {
        crackled[c] = true; sparkT = 0.35;
        tone(2600, 0.03, { wave: 'sawtooth', volume: 0.05 * vol() });
        tone(1900, 0.02, { wave: 'square', volume: 0.04 * vol() });
        game.fx.burst(540, 640, { color: C.glow, count: 8, speed: 220 });
      }
    }
    for (var i = 0; i < ARR.length; i++) {
      if (!res[i] && songT > ARR[i] * SPB + GOOD_W) { missArr(i, 'late'); if (over) return; }
    }
  }

  // ---- 判定(押した瞬間 vs 自分に届く拍の頭) ----
  function receive() {
    if (!running || over) return;
    pressFx = 0.2;
    var best = -1, bd = 99;
    for (var i = 0; i < ARR.length; i++) {
      var d = songT - ARR[i] * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = i; }
    }
    if (best >= 0 && !res[best] && Math.abs(bd) <= GOOD_W) { hitArr(best, bd); return; }
    if (best >= 0 && res[best] && Math.abs(bd) <= RUSH_W) { tone(520, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    if (best >= 0 && !res[best] && Math.abs(bd) <= RUSH_W) { missArr(best, bd < 0 ? 'rush' : 'late'); return; }
    glareT = 0.6;                                // 身じろぎ: 輪の皆ににらまれる
    missCommon();
  }

  function hitArr(i, off) {
    var perfect = Math.abs(off) <= PERFECT_W;
    var blind = inBreak(ARR[i]);
    res[i] = perfect ? 'perfect' : 'good';
    hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    if (blind) blindHits++;
    var pts = (perfect ? 100 + Math.min(combo, 5) * 10 : 50) * (blind ? 2 : 1);
    score += pts;
    tone('D5', 0.14, { wave: 'triangle', volume: 0.07 * vol(), slide: 60 });
    var hp = handPt(0);
    if (perfect) {
      perfects++;
      game.feedback.good(hp.x + 140, hp.y - 110, { text: 'PERFECT', color: C.glow, size: 54, count: 12, volume: armed ? 0.22 : 0.001 });
    } else {
      goods++;
      game.feedback.good(hp.x + 140, hp.y - 110, { text: 'GOOD', color: C.cream, size: 48, count: 7, volume: armed ? 0.18 : 0.001 });
    }
    if (blind) game.fx.popup('x2', hp.x + 140, hp.y - 190, { color: C.fire, size: 52 });
    if (!demoMode && hits === 3 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hits + ' / ' + ARR.length, W / 2, 420, { color: C.glow, size: 76 });
    }
  }

  function missArr(i, why) {
    res[i] = 'miss';
    if (why === 'late') coldT = SPB;
    missCommon();
  }

  function missCommon() {
    misses++; combo = 0;
    hitStop = HIT_STOP;
    var hp = handPt(0);
    game.feedback.bad(hp.x + 140, hp.y - 110, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += hits * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(500, 1000), { color: i % 2 ? C.glow : C.fire, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.glow, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (readyT > 0) { game.audio.play('se_tap', 0.2); return; }
    game.fx.burst(x, y, { color: C.cream, count: 4, speed: 120 });
    receive();
  });
  game.onTap(function (x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; demo.i = 0; return; }
  });

  // ---- 位置 ----
  var HEARTH = { x: 540, y: 488 };
  function seatBase(s) {
    if (s === 0) return { x: 540, y: 1300, sc: 1.45 };
    var a = SEAT_ANG[s] * Math.PI / 180;
    var x = 540 + Math.cos(a) * 400, y = 880 + Math.sin(a) * 230;
    return { x: x, y: y, sc: y < 800 ? 0.85 : 1.1 };
  }
  function handPt(s) {
    if (s === 0) return { x: 390, y: 1090 };
    var b = seatBase(s);
    return { x: b.x + (540 - b.x) * 0.22, y: b.y - 74 * b.sc };
  }
  function ease(u) { return u * u * (3 - 2 * u); }
  function mugPos() {
    if (!running) return { x: HEARTH.x, y: HEARTH.y, s: -1 };
    var k = beatN, u = beatT / SPB;
    var h0 = holder(k), h1 = holder(k + 1);
    var p0 = h0 < 0 ? HEARTH : handPt(h0), p1 = h1 < 0 ? HEARTH : handPt(h1);
    if (u > 0.65 && h1 !== h0) {
      var m = ease((u - 0.65) / 0.35);
      return { x: p0.x + (p1.x - p0.x) * m, y: p0.y + (p1.y - p0.y) * m - Math.sin(m * Math.PI) * 50, s: -2 };
    }
    return { x: p0.x, y: p0.y, s: h0 };
  }
  function fogAt(T) {
    var f = 0;
    for (var i = 0; i < BREAKS.length; i++) {
      var s = BREAKS[i][0] * SPB, e = BREAKS[i][1] * SPB;
      if (T < s - 0.3 || T > e) continue;
      var a = Math.min(1, (T - (s - 0.3)) / 0.3), b = Math.min(1, (e - T) / 0.3);
      f = Math.max(f, Math.min(a, b));
    }
    return f;
  }

  // ---- ローポリ描画(横ストリップ塗り + 頂点ジッター) ----
  var tq = 0, jseed = 0;
  function jv(v) { jseed++; return v + Math.sin(tq * 31 + jseed * 2.37) * 1.4; }
  function triRaw(ax, ay, bx, by, cx, cy, col) {
    var t;
    if (ay > by) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
    if (by > cy) { t = bx; bx = cx; cx = t; t = by; by = cy; cy = t; }
    if (ay > by) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
    if (cy - ay < 1) return;
    for (var y = Math.floor(ay); y < cy; y += 2) {
      var yy = y + 1, xb;
      var xa = ax + (cx - ax) * (yy - ay) / (cy - ay);
      if (yy < by) xb = by - ay < 0.5 ? bx : ax + (bx - ax) * (yy - ay) / (by - ay);
      else xb = cy - by < 0.5 ? bx : bx + (cx - bx) * (yy - by) / (cy - by);
      var l = Math.min(xa, xb), r = Math.max(xa, xb);
      game.draw.rect(l, y, r - l + 1, 2, col);
    }
  }
  function poly(pts, col, outline) {
    var q = [];
    for (var i = 0; i < pts.length; i++) q.push(jv(pts[i]));
    for (var k = 2; k < q.length / 2; k++) triRaw(q[0], q[1], q[2 * k - 2], q[2 * k - 1], q[2 * k], q[2 * k + 1], col);
    if (outline) {
      var n = q.length / 2;
      for (var e = 0; e < n; e++) {
        var f = (e + 1) % n;
        game.draw.line(q[2 * e], q[2 * e + 1], q[2 * f], q[2 * f + 1], outline, 2);
      }
    }
    return q;
  }
  function hexa(x, y, r, col, colD) {
    var p = [];
    for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; p.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    poly(p, col, C.ink);
    // 下半分を暗い面に(右中点 → 右下 → 下 → 左下 → 左中点)
    poly([x + r * 0.87, y + 2, p[0], p[1], p[2], p[3], p[4], p[5], x - r * 0.87, y + 2], colD);
  }

  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawRoom(t, fog) {
    game.draw.gradient(0, H, [[0, C.dark], [0.3, C.wall], [0.42, C.wall2], [1, '#2a1c16']]);
    // 丸太の壁
    for (var y = 236, i = 0; y < 760; y += 48, i++) {
      game.draw.rect(0, y, W, 44, i % 2 ? '#4a3426' : '#55402e');
      game.draw.rect(0, y + 44, W, 4, C.ink);
    }
    game.draw.rect(0, 236, W, 524, C.fog, 0.1);
    // 窓(外は吹雪)
    var wx = 830 + (warnT > 0 ? Math.sin(t * 80) * 6 : 0), wy = 300;
    poly([wx - 14, wy - 14, wx + 194, wy - 14, wx + 194, wy + 214, wx - 14, wy + 214], C.woodD, C.ink);
    var stormy = fog > 0 || warnT > 0;
    game.draw.rect(wx, wy, 180, 100, stormy ? '#9aa6b4' : '#3a4a60');
    game.draw.rect(wx, wy + 100, 180, 100, stormy ? '#c8d2dc' : '#5a6a80');
    var storm = fog > 0 || warnT > 0 ? 3 : 1;
    for (var s = 0; s < 10 * storm; s++) {
      var sx = wx + ((s * 47 + t * 260 * storm) % 180), sy = wy + ((s * 71 + t * 120) % 190);
      game.draw.line(sx, sy, Math.min(wx + 180, sx + 12 * storm), sy + 6, C.snow, 3);
    }
    game.draw.rect(wx + 86, wy, 8, 200, C.woodD);
    game.draw.rect(wx, wy + 96, 180, 8, C.woodD);
    // 暖炉(石の煙突と火床)
    poly([410, 236, 670, 236, 700, 520, 380, 520], C.stone, C.ink);
    poly([560, 236, 670, 236, 700, 520, 580, 520], C.stoneD);
    for (var bl = 0; bl < 5; bl++) game.draw.line(400 + bl * 4, 290 + bl * 46, 690 - bl * 4, 290 + bl * 46, C.stoneD, 3);
    poly([360, 520, 720, 520, 728, 760, 352, 760], C.stoneL, C.ink);
    poly([440, 566, 640, 566, 640, 760, 440, 760], C.ink);
    game.draw.rect(340, 500, 400, 26, C.woodD);
    game.draw.rect(340, 500, 400, 8, C.woodL);
    // 火(三角の炎が揺れる)
    var fl = sparkT > 0 ? 1.3 : 1;
    game.draw.circle(540, 690, 200 * fl, C.fire, 0.12);
    poly([460, 760, 530, 760, 488, 760 - (120 + Math.sin(t * 9) * 18) * fl], C.fire);
    poly([520, 760, 610, 760, 570, 760 - (150 + Math.sin(t * 11 + 1) * 20) * fl], C.fire);
    poly([490, 760, 560, 760, 522, 760 - (90 + Math.sin(t * 13 + 2) * 14) * fl], C.glow);
    poly([550, 760, 600, 760, 574, 760 - (80 + Math.sin(t * 10 + 3) * 12) * fl], C.glow);
    game.draw.rect(460, 740, 160, 20, C.woodD);
    // 床板(消失点へ収束)
    game.draw.rect(0, 760, W, H - 760, '#4a2e1c');
    for (var p = 0; p <= 14; p++) {
      var xb = -720 + p * 180;
      var xt = 540 + (xb - 540) * (760 - 420) / (H - 420);
      game.draw.line(xt, 760, xb, H, C.ink, 3);
    }
    for (var j = 0; j < 6; j++) {
      var jy = 760 + Math.pow(j / 6, 1.6) * (H - 760);
      game.draw.rect(0, jy, W, 3, C.ink, 0.6);
    }
    game.draw.rect(0, 1100, W, H - 1100, C.fog, 0.06);
    // 炉前の敷物(八角形)
    var rug = [];
    for (var o = 0; o < 8; o++) { var a = Math.PI / 8 + o * Math.PI / 4; rug.push(540 + Math.cos(a) * 400, 900 + Math.sin(a) * 170); }
    poly(rug, C.rug, C.ink);
    var rin = [];
    for (var o2 = 0; o2 < 8; o2++) { var a2 = Math.PI / 8 + o2 * Math.PI / 4; rin.push(540 + Math.cos(a2) * 300, 900 + Math.sin(a2) * 120); }
    poly(rin, C.rugD);
  }

  function faceFor(s, t) {
    if (glareT > 0) return FACE_GLARE;
    var mp = mugPos();
    if (mp.s === s && s > 0) return FACE_SIP;
    if ((t * 0.7 + s * 0.37) % 3 < 0.12) return FACE_BLINK;
    return FACE;
  }

  function figure(s, t) {
    var b = seatBase(s), x = b.x, y = b.y, sc = b.sc;
    var col = JK[s], back = s === 0;
    var mp = mugPos();
    var lean = 0;
    if (s === 4 && running && holder(beatN + 1) === 0 && !inBreak(beatN)) lean = 22 * ease(beatT / SPB);
    var bob = Math.sin(t * 2 + s) * 2 * sc;
    if (back && hitStop > 0) x += Math.sin(t * 70) * 9;
    var big = back && hitStop > 0 ? 1.12 : 1;
    sc *= big;
    if (back && hitStop > 0) game.draw.circle(x, y - 150 * sc, 190 * (1 - hitStop / HIT_STOP * 0.3), '#ffffff', 0.55 * hitStop / HIT_STOP);
    poly([x - 44 * sc, y, x + 44 * sc, y, x + 36 * sc, y + 46 * sc, x - 36 * sc, y + 46 * sc], C.woodD, C.ink);
    poly([x - 52 * sc, y - 16 * sc, x + 52 * sc, y - 16 * sc, x + 56 * sc, y + 8 * sc, x - 56 * sc, y + 8 * sc], C.pants);
    var sx = x + lean * sc, top = y - 118 * sc + bob;
    poly([x - 58 * sc, y - 6 * sc, sx - 46 * sc, top + 6 * sc, sx, top, x, y - 6 * sc], col[0], C.ink);
    poly([x, y - 6 * sc, sx, top, sx + 46 * sc, top + 6 * sc, x + 58 * sc, y - 6 * sc], col[1], C.ink);
    var hx = sx, hy = top - 36 * sc, r = 34 * sc;
    hexa(hx, hy, r, back ? C.hair : C.skin, back ? C.hairD : C.skinD);
    poly([hx - r * 1.04, hy - 4 * sc, hx + r * 1.04, hy - 4 * sc, hx + r * 0.5, hy - 46 * sc, hx - r * 0.5, hy - 46 * sc], HAT[s], C.ink);
    game.draw.circle(hx, hy - 52 * sc, 10 * sc, C.cream);
    if (!back) game.draw.sprite(faceFor(s, t), FPAL, hx, hy + 10 * sc, 5 * sc, { anchor: 'center' });
    // マグを持つ腕
    var holding = mp.s === s && s > 0;
    var mine = back && running && holder(beatN) === 0 && res[ARR.indexOf(beatN)] && res[ARR.indexOf(beatN)] !== 'miss';
    if (holding || mine || (cheerT > 0)) {
      var hp = handPt(s);
      if (cheerT > 0 && !holding && !mine) hp = { x: hx + (s % 2 ? 60 : -60) * sc, y: hy - 30 * sc };
      var shx = hp.x > sx ? sx + 36 * sc : sx - 36 * sc;
      game.draw.line(shx, top + 22 * sc, hp.x, hp.y + 12, col[1], 18 * sc);
      game.draw.circle(hp.x, hp.y + 12, 12 * sc, col[0]);
      if (cheerT > 0 && !holding && !mine) drawMug(hp.x, hp.y - 10, sc * 0.9, false, t, true);
    }
    if (back && hitStop > 0 && glareT > 0) game.draw.sprite(BANG, { '#': C.red }, hx + 80, hy - 70, 12, { anchor: 'center' });
  }

  function drawMug(x, y, sc, cold, t, steam) {
    var body = cold ? C.cold : C.mug;
    poly([x - 22 * sc, y - 26 * sc, x + 22 * sc, y - 26 * sc, x + 19 * sc, y + 20 * sc, x - 19 * sc, y + 20 * sc], body, C.ink);
    poly([x + 4 * sc, y - 26 * sc, x + 22 * sc, y - 26 * sc, x + 19 * sc, y + 20 * sc, x + 4 * sc, y + 20 * sc], cold ? '#6a90b8' : C.mugD);
    game.draw.rect(x - 20 * sc, y - 30 * sc, 40 * sc, 8 * sc, cold ? '#4a3a40' : C.cocoa);
    game.draw.line(x + 22 * sc, y - 18 * sc, x + 36 * sc, y - 6 * sc, C.mugD, 7 * sc);
    game.draw.line(x + 36 * sc, y - 6 * sc, x + 21 * sc, y + 8 * sc, C.mugD, 7 * sc);
    if (steam && !cold) game.draw.sprite(STEAM[Math.floor(t * 6) % 2], { '#': C.snow }, x, y - 62 * sc, 7 * sc, { anchor: 'center', alpha: 0.75 });
    if (cold) game.draw.sprite(FLAKE, { '#': C.snow }, x - 30 * sc, y - 44 * sc, 8 * sc, { anchor: 'center' });
  }

  function drawFog(t, fog) {
    if (fog <= 0) return;
    for (var i = 0; i < 8; i++) game.draw.rect(0, 236 + i * 100, W, 100, C.fog, fog * (0.72 + i * 0.02));
    for (var b = 0; b < 6; b++) {
      var bx = (b * 230 + t * 60 * (b % 2 ? 1 : -1)) % 1300 - 110;
      game.draw.circle(bx, 360 + b * 110, 170, C.fog2, fog * 0.35);
    }
    game.draw.rect(0, 1036, W, 22, C.fog, fog * 0.5);
    game.draw.rect(0, 1058, W, 18, C.fog, fog * 0.25);
    for (var s = 0; s < 22; s++) {
      var sx = (s * 97 + t * 300) % W, sy = 250 + ((s * 131 + t * 160) % 780);
      game.draw.line(sx, sy, sx + 22, sy + 9, C.snow, 3);
    }
    // 暖炉の明かりだけが霧ごしに透ける
    game.draw.circle(540, 690, 120 * (sparkT > 0 ? 1.4 : 1), C.fire, 0.22 * fog);
  }

  function drawLamps(t, brk) {
    // 親指ゾーン: 4拍子のランプ(1拍目は大きい)。吹雪の間は消えて霜がつく
    var pos = running ? beatN % 4 : -1;
    for (var i = 0; i < 4; i++) {
      var x = 270 + i * 180, y = 1560, r = i === 0 ? 62 : 48;
      var on = !brk && i === pos && lampT > 0;
      poly([x, y - r, x + r * 0.8, y, x, y + r, x - r * 0.8, y], C.ink);
      poly([x, y - r + 10, x + r * 0.8 - 10, y, x, y + r - 10, x - r * 0.8 + 10, y], on ? C.glow : (brk ? '#3a3a46' : '#5a4232'));
      if (on) game.draw.circle(x, y, r * 1.5, C.fire, 0.25 * lampT);
      if (brk) game.draw.sprite(FLAKE, { '#': C.fog }, x + 18, y - 18, 7, { anchor: 'center' });
    }
    // 受け取ったマグの列(進み具合)
    for (var m = 0; m < ARR.length; m++) {
      var mx = 540 + (m - 2) * 140, my = 1730;
      if (res[m] === 'miss') drawMug(mx, my, 1, true, t, false);
      else if (res[m]) drawMug(mx, my, 1, false, t, false);
      else poly([mx - 22, my - 26, mx + 22, my - 26, mx + 19, my + 20, mx - 19, my + 20], '#3a2a24', C.ink);
    }
  }

  function drawScene(t) {
    var fog = running || over ? fogAt(songT) : 0;
    var brk = running && inBreak(beatN);
    drawRoom(t, fog);
    figure(3, t);
    figure(2, t);
    figure(4, t);
    figure(1, t);
    var mp = mugPos();
    var atMe = running && holder(beatN) === 0 && mp.s === 0;
    var ai = ARR.indexOf(beatN);
    var got = atMe && res[ai] && res[ai] !== 'miss';
    if (!atMe && fog < 0.4) drawMug(mp.x, mp.y, mp.s === 2 || mp.s === 3 ? 0.85 : 1.1, false, t, mp.s !== -2);
    drawFog(t, fog);
    figure(0, t);
    if (atMe && (got || fog < 0.4)) drawMug(mp.x, mp.y - (got ? 30 : 0), 1.3, coldT > 0, t, !!got);
    if (pressFx > 0) game.draw.circle(540, 1230, 300 - pressFx * 600, C.cream, pressFx * 1.5);
    drawLamps(t, brk);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.dark);
    game.draw.rect(0, 224, W, 12, C.woodD);
    label('SCORE ' + score, 56, 96, 52, C.glow, 'left');
    label('BEST ' + prevBest, 56, 168, 32, C.cream, 'left');
    label(hits + ' / ' + ARR.length, W - 56, 96, 56, C.cream, 'right');
    for (var m = 0; m < MISS_MAX; m++) {
      var x = W - 220 + m * 70;
      poly([x, 140, x + 22, 162, x, 184, x - 22, 162], m < misses ? C.red : '#4a3a40', C.ink);
    }
    var progress = Math.min(1, songT / (SONG_BEATS * SPB));
    game.draw.rect(0, 224, W * progress, 12, C.fire);
  }

  // ---- ATTRACT: 実ロジックで 拍どおりに受け取る → 届かない拍に身じろぎしてMISS → 吹雪の霧の中で拍を数えて受け取る ----
  var DEMO_TAPS = [[8, 0.01], [10.5, 0], [13, 0.09]];
  var DEMO_BEATS = 17;
  var demo = { t: 0, i: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.i = 0; }
    stepPlay(dt);
    if (demo.i < DEMO_TAPS.length && songT >= DEMO_TAPS[demo.i][0] * SPB + DEMO_TAPS[demo.i][1]) {
      demo.i++; demo.pressT = 0.18; receive();
    }
    if (demo.pressT > 0) demo.pressT -= dt;
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    tq = Math.floor(t * 12) / 12; jseed = 0;
    if (hitStop > 0) hitStop -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (warnT > 0) warnT -= dt;
    if (sparkT > 0) sparkT -= dt;
    if (glareT > 0) glareT -= dt;
    if (coldT > 0) coldT -= dt;
    if (cheerT > 0) cheerT -= dt;
    if (pressFx > 0) pressFx -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      var near = demo.pressT > 0;
      game.draw.hand(560, near ? 1420 : 1380 + Math.sin(t * 3) * 14, { press: near, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.dark);
      game.draw.rect(0, 224, W, 12, C.woodD);
      label(GAME_TITLE, W / 2, 112, 88 + Math.sin(t * 3) * 3, C.glow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 34, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.glow);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud();
      poly([110, H * 0.19, W - 110, H * 0.2, W - 120, H * 0.5, 120, H * 0.49], C.dark, C.glow);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 100, won ? C.glow : C.red);
      label('SCORE ' + score, W / 2, H * 0.31, 60, C.cream);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.355, 34, C.cream);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.405, 54, C.glow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.405, 42, C.cream);
      if (!won) label('あと' + Math.max(1, ARR.length - hits) + '杯!', W / 2, H * 0.46, 52, C.fire);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, mugs: hits, total: ARR.length, perfect: perfects, good: goods, miss: misses, blind: blindHits, maxCombo: maxCombo };
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

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.glow);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.glow);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
