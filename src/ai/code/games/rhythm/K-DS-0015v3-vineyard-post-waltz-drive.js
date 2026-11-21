// K-DS-0015v3-vineyard-post-waltz-drive.js
// 葡萄棚のワルツ杭打ち — 三拍子の二拍目で掛矢を振り上げて三拍目まで溜め、次の一拍目の頭でちょうど離して支柱の杭を打ち込む
// 操作: 画面を押し続けると掛矢が上がって溜まり(右の溜めメーター)、離すと振り下ろす。三拍子の2拍目の頭で押して3拍目まで溜め、次の小節の1拍目の頭で離す。離しのずれでPERFECT/GOOD(押しが2拍目からずれる・溜めが足りないとGOODどまり)。溜め不足(6割未満)・早すぎる離し・1拍目を過ぎても押しっぱなし・打ち逃しはMISS。金のリボンの太い杭は2小節ぶん(5拍)溜めて、2つ先の1拍目で離す(1つ前の杭を打った瞬間に鈴の音と金の光で予告)
// 終わり: 12小節で並んだ杭(9本)を打ち終えればCLEAR(判定点+連続+太い杭+残り)。MISS3回でGAME OVER
// @mechanic: hold_charge
// @theme: vineyard_post_waltz_drive
// 世界観: 秋の葡萄畑で、畑番が三拍子の収穫祭の楽隊に合わせて掛矢を振り上げ、葡萄棚の列に並んだ支柱の杭を一本ずつ打ち込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・打ち込めた杭の本数・PERFECT/GOOD/MISS数・太い杭の数・最大連続
// スタイル: 2000s ARCADE POP
var STYLE = { bg: ['#ffd6e8', '#fff4d6', '#d8f6ff'], main: ['#ff3fa4', '#ffcc00', '#7a3cff'], accent: ['#ffffff', '#00c2ff'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステルの空、原色+太い白縁、光の柱・虹・星の物量
  var PINK = STYLE.main[0], GOLD = STYLE.main[1], GRAPE = STYLE.main[2], WHITE = STYLE.accent[0], CYAN = STYLE.accent[1];
  var DARK = '#4a2a5a', WOOD = '#c98a4a', WOOD_D = '#8a5a30';

  var GAME_TITLE = 'WALTZ POST';
  var BPM = 150, SPB = 60 / BPM, BAR = SPB * 3;
  var BARS = 12, BEATS = BARS * 3;
  var TIME_LIMIT = 14.4;               // 12小節 × 1.2秒(三拍子)
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.12, PRESS_W = 0.1;
  var MISS_MAX = 3;

  var HORIZON = 560, VP_X = W / 2, NEAR_Y = 1250, NEAR_X = 640;
  var KX = 330, KY = 1270;
  var METER_X = 990, METER_TOP = 700, METER_BOT = 1250;
  var DOT_Y = Math.round(H * 0.765);
  var PAD_X = W / 2, PAD_Y = Math.round(H * 0.885), PAD_R = 140;

  // 伴奏(オリジナルのワルツ)。1拍目=低音、2・3拍目=和音の刻み(ズン・チャッ・チャッ)
  var MEL = [
    [[['C5', 1]], [['A4', 0.5], ['C5', 0.5]], [['F5', 1]]],
    [[['E5', 1]], [['D5', 1]], [['C5', 1]]],
    [[['Bb4', 1]], [['D5', 0.5], ['F5', 0.5]], [['G5', 1]]],
    [[['A5', 1]], [['G5', 0.5], ['F5', 0.5]], [['E5', 1]]]
  ];
  var ROOT = ['F2', 'C3', 'Bb2', 'C3'];
  var PAH = [['A3', 'C4'], ['G3', 'E4'], ['D4', 'F3'], ['E4', 'G3']];

  // ---- スプライト(畑番の後ろ姿: 待ち/振り上げ) ----
  var KEEPER = [
    ['....yyyyyy....', '..yyyyyyyyyy..', 'yyyyyyyyyyyyyy', '....hhhhhh....', '....hhhhhh....', '.....ssss.....', '..cccccccccc..', '.cccaccccaccc.', 'ccccaccccacccc', 'sccaaaaaaaaccs', 's.ccAAAAAAcc.s', '...cAAAAAAc...', '...pAAAAAAp...', '...pppppppp...', '...ppp..ppp...', '...ppp..ppp...', '..bbbb..bbbb..'],
    ['....yyyyyy....', '..yyyyyyyyyy..', 'yyyyyyyyyyyyyy', 's...hhhhhh...s', 'sc..hhhhhh..cs', '.cc..ssss..cc.', '..cccccccccc..', '..ccaccccacc..', '..ccaccccacc..', '..caaaaaaaac..', '...cAAAAAAc...', '...cAAAAAAc...', '...pAAAAAAp...', '...pppppppp...', '...ppp..ppp...', '...ppp..ppp...', '..bbbb..bbbb..']
  ];
  var PAL_K = { y: '#ffcc66', h: '#7a4a2a', s: '#ffd2b0', c: CYAN, a: WHITE, A: PINK, p: GRAPE, b: '#5a3a2a' };
  var PAL_W = { y: WHITE, h: WHITE, s: WHITE, c: WHITE, a: WHITE, A: WHITE, p: WHITE, b: WHITE };
  var BIRD = [['.k...k.', '..kkk..'], ['kk...kk', '..kkk..']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, posts, misses, score, combo, maxCombo, nPerfect, nGood, nMiss, nBig, nDriven;
  var hitStop, over, won, outroT, lastBeat, lastCue, demoMode, prevBest, failX, failY, resultT;
  var charging, chargeStart, chargeLock, chargeTick, swingT, beatPulse, beatNo, pillarT, pillarCol, camZ, milestoneDone, goldT;

  function buildPosts(demo) {
    var list = [], pb = 0, i = 0;
    var bigs = {};
    if (!demo) {
      var a = 2 + Math.floor(game.random(0, 2)) % 2;
      var b = a + 3 + Math.floor(game.random(0, 2)) % 2;
      bigs[a] = true; bigs[b] = true;
    }
    var lastBar = demo ? 2 : BARS - 1;
    for (var guard = 0; guard < 20; guard++) {
      var big = !!bigs[i];
      var sb = pb + (big ? 2 : 1);
      if (sb > lastBar) break;
      list.push({ i: i, liftT: pb * BAR + SPB, strikeT: sb * BAR, big: big, res: 0, depth: 0, pressAt: -1, warned: false });
      pb = sb; i++;
    }
    return list;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    posts = buildPosts(demo);
    misses = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nBig = 0; nDriven = 0;
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -99; lastCue = -1;
    prevBest = game.best; failX = -999; failY = -999; resultT = 0;
    charging = false; chargeStart = 0; chargeLock = false; chargeTick = 0; swingT = 0;
    beatPulse = 0; beatNo = -1; pillarT = 0; pillarCol = GOLD; camZ = 0; milestoneDone = false; goldT = 0;
  }

  function curPost() {
    for (var i = 0; i < posts.length; i++) if (!posts[i].res) return posts[i];
    return null;
  }
  function need(p) { return (p.big ? 5 : 2) * SPB; }
  function chargeFill() {
    var p = curPost();
    if (!charging || !p) return 0;
    return Math.max(0, clock - chargeStart) / need(p);
  }

  // ---- 音 ----
  function playBeat(bi) {
    var bar = Math.floor(bi / 3) % 4, k = bi % 3;
    var bassNote = k === 0 ? ROOT[bar] : PAH[bar][k - 1];
    game.audio.melody(MEL[bar][k], { tempo: BPM, wave: 'square', volume: 0.032, bass: [[bassNote, 0.45], ['R', 0.55]], bassVolume: k === 0 ? 0.1 : 0.045, bassWave: k === 0 ? 'triangle' : 'square' });
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) playBeat(cue); }
    var bi = Math.floor(clock / SPB);
    if (bi === lastBeat) return;
    lastBeat = bi;
    if (clock < 0 || bi >= BEATS) { beatNo = -1; return; }
    beatPulse = 1; beatNo = bi % 3;
    if (!demoMode) game.audio.tone(beatNo === 0 ? 1320 : 1980, 0.02, { wave: 'triangle', volume: beatNo === 0 ? 0.045 : 0.02 });
  }

  // ---- 判定 ----
  function drive(p, grade) {
    p.res = grade; p.depth = grade === 1 ? 1 : 0.72;
    combo++; maxCombo = Math.max(maxCombo, combo);
    nDriven++;
    if (grade === 1) nPerfect++; else nGood++;
    if (p.big) nBig++;
    var pts = ((grade === 1 ? 150 : 80) + Math.min(10, combo) * 10) * (p.big ? 2 : 1);
    score += pts;
    pillarT = 0.45; pillarCol = grade === 1 ? GOLD : CYAN;
    var g = postScreen(0);
    game.feedback.good(g.x, g.top - 40, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? GOLD : CYAN, size: grade === 1 ? 60 : 50,
      count: p.big ? 26 : (grade === 1 ? 16 : 10), volume: demoMode ? 0.03 : 0.15
    });
    if (!demoMode) {
      game.fx.popup('+' + pts, g.x + 170, g.top + 40, { color: PINK, size: 56 });
      game.audio.tone(110, 0.14, { wave: 'triangle', volume: 0.14 });
      game.audio.tone(grade === 1 ? 1568 : 1175, 0.12, { wave: 'square', volume: 0.05 });
      if (!milestoneDone && nDriven >= Math.ceil(posts.length / 2)) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 420, { color: GOLD, size: 96 });
        game.audio.play('se_milestone', 0.5);
        for (var i = 0; i < 4; i++) game.fx.burst(160 + i * 250, 380, { color: [PINK, GOLD, CYAN, GRAPE][i], count: 12, speed: 320 });
      }
    }
    announceNext(p);
  }

  function missPost(p, why) {
    if (p) { p.res = 3; p.depth = 0.22; }
    misses++; nMiss++; combo = 0;
    hitStop = 0.36;
    var g = postScreen(0);
    failX = g.x; failY = g.top;
    game.feedback.bad(g.x, g.top - 40, { text: 'MISS', shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && why === 'over') game.audio.play('se_break', 0.35);
    if (!demoMode && misses >= MISS_MAX) finishRun(false);
    else announceNext(p);
  }

  // 次が太い杭なら、いま鈴の音と金の光で知らせる
  function announceNext(p) {
    var nx = posts[p.i + 1];
    if (nx && nx.big && !nx.warned) {
      nx.warned = true; goldT = 0.8;
      if (!demoMode) { game.audio.tone(1760, 0.18, { wave: 'triangle', volume: 0.06 }); game.audio.tone(2349, 0.22, { wave: 'triangle', volume: 0.05 }); }
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; charging = false;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      for (var i = 0; i < 7; i++) game.fx.burst(100 + i * 150, 300 + (i % 2) * 140, { color: [PINK, GOLD, CYAN, GRAPE][i % 4], count: 18, speed: 420 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, driven: nDriven, total: posts.length, perfect: nPerfect, good: nGood, miss: nMiss, bigPosts: nBig, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 押す = 振り上げ開始 / 離す = 振り下ろし(本番の指もATTRACTのゴーストも同じ関数)
  function lift() {
    if (charging) return 'busy';
    var p = curPost();
    if (!p) return 'none';
    charging = true; chargeStart = clock; chargeLock = false; chargeTick = 0;
    p.pressAt = clock;
    return 'lift';
  }

  function release() {
    if (!charging) return 'none';
    charging = false; swingT = 0.14;
    if (chargeLock) { chargeLock = false; return 'none'; }
    var p = curPost();
    if (!p) return 'none';
    var d = clock - p.strikeT;
    var ratio = (clock - chargeStart) / need(p);
    if (Math.abs(d) <= GOOD_W && ratio >= 0.6) {
      var grade = Math.abs(d) <= PERFECT_W ? 1 : 2;
      if (Math.abs(p.pressAt - p.liftT) > PRESS_W || ratio < 0.85) grade = 2;
      drive(p, grade);
      return grade === 1 ? 'perfect' : 'good';
    }
    // 早すぎる離し / 溜め不足
    missPost(p, 'early');
    return 'miss';
  }

  function stepRun(dt) {
    clock += dt;
    if (swingT > 0) swingT -= dt;
    if (pillarT > 0) pillarT -= dt;
    if (goldT > 0) goldT -= dt;
    beatClock();
    var p0 = curPost();
    var target = p0 ? p0.i : posts.length;
    camZ += (target - camZ) * Math.min(1, dt * 7);
    if (over) return;
    // 溜めている間は音程が上がっていく
    if (charging && !chargeLock && !demoMode) {
      chargeTick -= dt;
      if (chargeTick <= 0) {
        chargeTick = 0.09;
        game.audio.tone(330 + Math.min(1.15, chargeFill()) * 660, 0.07, { wave: 'triangle', volume: 0.04 });
      }
    }
    var p = curPost();
    if (p && clock > p.strikeT + GOOD_W) {
      // 1拍目を過ぎても押しっぱなし(振り遅れ) / 振り上げすらしなかった
      if (charging && !chargeLock) { chargeLock = true; missPost(p, 'over'); }
      else missPost(p, 'skip');
      if (over || hitStop > 0) return;
    }
    if (!demoMode && !over && !curPost() && clock >= posts[posts.length - 1].strikeT + 0.3) finishRun(misses < MISS_MAX);
    if (!demoMode && !over && clock > TIME_LIMIT + 0.5) finishRun(misses < MISS_MAX);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    if (lift() === 'lift') game.audio.tone(392, 0.06, { wave: 'triangle', volume: 0.06, slide: 120 });
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { charging = false; return; }
    var res = release();
    if (res === 'miss') game.audio.tone(160, 0.1, { wave: 'sawtooth', volume: 0.06, slide: -60 });
    else if (res === 'perfect') game.fx.flash(GOLD, 0.12);
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center', o = Math.max(3, sz * 0.09);
    var dirs = [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o]];
    for (var i = 0; i < dirs.length; i++) game.draw.text(str, x + dirs[i][0], y + dirs[i][1], { size: sz, color: WHITE, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function rimDisc(x, y, r, col, rim) {
    game.draw.circle(x, y, r + (rim || 8), WHITE);
    game.draw.circle(x, y, r, col);
  }
  function rimBox(x, y, w, h, col, rim) {
    var t = rim || 8;
    game.draw.rect(x - t, y - t, w + t * 2, h + t * 2, WHITE);
    game.draw.rect(x, y, w, h, col);
  }
  function star(x, y, r, col) {
    game.draw.line(x - r, y, x + r, y, col, Math.max(3, r * 0.35));
    game.draw.line(x, y - r, x, y + r, col, Math.max(3, r * 0.35));
    game.draw.circle(x, y, r * 0.35, col);
  }
  function rimSprite(spr, pal, x, y, px) {
    var o = { anchor: 'center' }, d = px * 0.6;
    game.draw.sprite(spr, PAL_W, x - d, y, px, o);
    game.draw.sprite(spr, PAL_W, x + d, y, px, o);
    game.draw.sprite(spr, PAL_W, x, y - d, px, o);
    game.draw.sprite(spr, PAL_W, x, y + d, px, o);
    game.draw.sprite(spr, pal, x, y, px, o);
  }

  // 列の奥行き: z=0 が手前の杭、z が増えるほど奥(消失点に寄る)
  function depthScale(z) { return 1 / (1 + 0.85 * Math.max(-0.6, z)); }
  function postScreen(z) {
    var s = depthScale(z);
    var x = VP_X + (NEAR_X - VP_X) * s, y = HORIZON + (NEAR_Y - HORIZON) * s;
    return { x: x, y: y, s: s, top: y - 330 * s };
  }

  // ---- 描画 ----
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.28, STYLE.bg[1]], [0.3, '#ffe9a8'], [1, '#ffd27a']]);
    // 虹(短い線分で弧を描く)
    var cols = [PINK, '#ff9a3c', GOLD, '#5fe08a', CYAN, GRAPE];
    for (var c = 0; c < cols.length; c++) {
      var r = 470 - c * 20;
      for (var k = 0; k < 24; k++) {
        var a0 = Math.PI + k / 24 * Math.PI, a1 = Math.PI + (k + 1) / 24 * Math.PI;
        game.draw.line(VP_X + Math.cos(a0) * r, HORIZON + 40 + Math.sin(a0) * r * 0.62, VP_X + Math.cos(a1) * r, HORIZON + 40 + Math.sin(a1) * r * 0.62, cols[c], 16);
      }
    }
    // 浮かぶ星と鳥
    for (var i = 0; i < 12; i++) {
      var sx = (i * 197 + 40) % W, sy = 270 + (i * 71) % 240;
      star(sx, sy, 8 + 6 * Math.abs(Math.sin(t * 2 + i)), WHITE);
    }
    for (var b = 0; b < 2; b++) {
      var bx = ((t * (60 + b * 20) + b * 500) % (W + 200)) - 100, by = 330 + b * 60;
      game.draw.sprite(BIRD[Math.floor(t * 5 + b) % 2], { k: DARK }, bx, by, 7, { anchor: 'center' });
    }
    // 遠くの丘
    for (var h = 0; h < 5; h++) rimDisc(120 + h * 220, HORIZON + 40, 120 + (h % 2) * 40, h % 2 ? '#c8e86a' : '#a8d85a', 4);
    game.draw.rect(0, HORIZON, W, H - HORIZON, '#f2d27a');
  }

  function drawRows() {
    var t = game.time.elapsed;
    // 左右の葡萄棚の列(消失点へ集まる)
    var lanes = [-560, -330, 330, 560];
    for (var l = 0; l < lanes.length; l++) {
      var bx = VP_X + lanes[l] * 1.25;
      game.draw.line(VP_X + lanes[l] * 0.02, HORIZON, bx, NEAR_Y + 60, '#6a9a3a', 14);
      for (var z = 6; z >= 0; z--) {
        var s = depthScale(z - (camZ % 1));
        var x = VP_X + (bx - VP_X) * s, y = HORIZON + (NEAR_Y + 60 - HORIZON) * s;
        game.draw.rect(x - 8 * s, y - 210 * s, 16 * s, 210 * s, WOOD_D);
        rimDisc(x, y - 200 * s, 60 * s, l % 2 ? '#ffb02e' : '#ff8a3c', 4 * s);
        rimDisc(x + 30 * s, y - 150 * s, 30 * s, GRAPE, 4 * s);
        game.draw.circle(x + 20 * s, y - 160 * s, 8 * s, WHITE, 0.7);
      }
    }
    // 作業中の列: 地面の帯
    for (var k = 0; k < 10; k++) {
      var y0 = HORIZON + (NEAR_Y - HORIZON) * depthScale(9 - k - (camZ % 1));
      game.draw.rect(0, y0, W, 4, '#e8bc5a', 0.6);
    }
    // 葡萄棚の針金
    var g0 = postScreen(-0.4), g1 = postScreen(8);
    game.draw.line(g0.x, g0.y - 200 * g0.s, g1.x, g1.y - 200 * g1.s, WHITE, 4);
    game.draw.line(g0.x, g0.y - 110 * g0.s, g1.x, g1.y - 110 * g1.s, WHITE, 3);
    var sway = Math.sin(t * 2) * 4;
    for (var v = 0; v < 6; v++) {
      var gv = postScreen(v + 0.5 - (camZ % 1));
      rimDisc(gv.x + sway * gv.s, gv.y - 210 * gv.s, 24 * gv.s, '#5fbf4a', 3);
    }
  }

  function drawPost(p, z) {
    var g = postScreen(z);
    var s = g.s;
    var hgt = (p.big ? 400 : 330) * s * (1 - p.depth * 0.55);
    var w = (p.big ? 124 : 94) * s;
    var flash = hitStop > 0 && Math.abs(z) < 0.5 && failX > -900;
    if (flash) { w *= 1.3; hgt *= 1.1; }
    var top = g.y - hgt;
    rimBox(g.x - w / 2, top, w, hgt, flash ? WHITE : WOOD, 6 * s + 2);
    if (!flash) {
      game.draw.rect(g.x - w / 2, top, w * 0.3, hgt, '#e8b070');
      game.draw.rect(g.x - w / 2, top, w, 10 * s, WOOD_D);
    }
    if (p.big) {
      rimBox(g.x - w / 2 - 6 * s, top + 30 * s, w + 12 * s, 26 * s, GOLD, 3);
      if (Math.floor(game.time.elapsed * 6) % 2 === 0) star(g.x + w, top + 10 * s, 18 * s, GOLD);
    }
    if (p.res === 3) {
      game.draw.line(g.x - w / 2, top + 20 * s, g.x + w / 2, top + 60 * s, PINK, 8 * s);
      game.draw.line(g.x + w / 2, top + 20 * s, g.x - w / 2, top + 60 * s, PINK, 8 * s);
    } else if (p.res === 1) {
      star(g.x, top - 20 * s, 20 * s, GOLD);
    }
    // 地面の影
    game.draw.circle(g.x, g.y + 4, w * 0.9, '#d8a850', 0.6);
    return top;
  }

  function drawPosts() {
    var cur = curPost();
    var topNear = postScreen(0).y - 330;
    for (var i = posts.length - 1; i >= 0; i--) {
      var z = i - camZ;
      if (z < -0.9 || z > 7) continue;
      var tp = drawPost(posts[i], z);
      if (cur && posts[i] === cur) topNear = tp;
    }
    return topNear;
  }

  function drawPillar() {
    if (pillarT <= 0) return;
    var a = pillarT / 0.45;
    var x = postScreen(0).x;
    for (var k = 0; k < 3; k++) game.draw.rect(x - (90 - k * 30), 230, (90 - k * 30) * 2, NEAR_Y - 230, k === 2 ? WHITE : pillarCol, 0.18 * a + k * 0.08 * a);
    for (var s = 0; s < 6; s++) star(x - 160 + s * 64, 300 + ((s * 97 + game.time.elapsed * 600) % 700), 14, s % 2 ? WHITE : pillarCol);
  }

  function drawApproach(topY) {
    var p = curPost();
    if (!p || clock < p.liftT - SPB) return;
    var span = p.strikeT - (p.liftT - SPB);
    var f = Math.max(0, Math.min(1, (p.strikeT - clock) / span));
    var r = 60 + f * 200;
    var x = postScreen(Math.max(0, p.i - camZ)).x;
    var cols = [PINK, GOLD, CYAN];
    for (var i = 0; i < 18; i++) {
      var a = i / 18 * Math.PI * 2 + game.time.elapsed * 1.5;
      rimDisc(x + Math.cos(a) * r, topY + Math.sin(a) * r * 0.5, 7, cols[i % 3], 3);
    }
  }

  function drawKeeper(topY) {
    var t = game.time.elapsed;
    var fill = Math.min(1.15, chargeFill());
    var lifted = charging && !chargeLock;
    var fr = lifted ? 1 : 0;
    var bob = lifted ? 0 : Math.sin(t * 2.5) * 4 - (beatNo === 0 ? beatPulse * 10 : beatPulse * 4);
    var flash = hitStop > 0 && failX > -900;
    var px = 13;
    if (flash) {
      game.draw.circle(KX, KY - 20, 150, WHITE, 0.8);
      game.draw.sprite(KEEPER[0], PAL_W, KX, KY, 15, { anchor: 'center' });
    } else {
      rimSprite(KEEPER[fr], PAL_K, KX, KY + bob, px);
    }
    // 掛矢: 肩 → 振り上げ(溜めに比例) → 振り下ろし(杭の頭)
    var restX = KX + 110, restY = KY - 150;
    var upX = KX + 60, upY = KY - 380;
    var hx, hy;
    var tx = postScreen(0).x - 40, ty = topY - 36;
    if (swingT > 0) {
      hx = tx; hy = ty;
    } else {
      var f = lifted ? Math.min(1, fill) : 0;
      hx = restX + (upX - restX) * f; hy = restY + (upY - restY) * f + (lifted ? Math.sin(t * 20) * fill * 3 : 0);
    }
    var handX = KX + 40, handY = KY - 120 + bob;
    game.draw.line(handX, handY, hx, hy + 30, WHITE, 24);
    game.draw.line(handX, handY, hx, hy + 30, WOOD, 14);
    rimBox(hx - 80, hy - 38, 160, 76, WOOD_D, 7);
    game.draw.rect(hx - 80, hy - 38, 160, 18, WOOD);
    if (swingT > 0) for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; star(tx + 40 + Math.cos(a) * 110, ty + 40 + Math.sin(a) * 50, 14, i % 2 ? GOLD : WHITE); }
  }

  function drawMeter() {
    var p = curPost();
    var fill = chargeFill();
    var top = METER_TOP, bot = METER_BOT, hgt = bot - top;
    rimBox(METER_X - 34, top, 68, hgt, '#fff6e0', 8);
    // 目標(ちょうど溜まる高さ)の帯
    var zy = bot - hgt / 1.15;
    game.draw.rect(METER_X - 34, zy - 16, 68, 32, p && p.big ? GOLD : '#ffe066');
    var fy = bot - Math.min(1.15, fill) / 1.15 * hgt;
    var col = fill >= 0.85 ? (fill > 1.12 ? PINK : GOLD) : CYAN;
    if (fill > 0) game.draw.rect(METER_X - 26, fy, 52, bot - fy, col);
    if (p && p.big) { star(METER_X, top - 30, 20, GOLD); star(METER_X, top - 30, 10, WHITE); }
    if (goldT > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0) rimBox(METER_X - 40, top - 6, 80, hgt + 12, GOLD, 4);
  }

  function drawDots() {
    var p = curPost();
    rimBox(140, DOT_Y - 56, W - 280, 112, '#fff0f6', 8);
    for (var i = 0; i < 3; i++) {
      var x = W / 2 - 220 + i * 220, on = beatNo === i;
      var r = (i === 0 ? 40 : 30) + (on ? beatPulse * 14 : 0);
      var col = i === 0 ? PINK : CYAN;
      // 太い杭の溜め途中の1拍目は「打たない」ので白抜き
      if (i === 0 && p && p.big && clock > p.liftT && clock < p.strikeT - SPB * 1.5) col = '#ffd0e4';
      rimDisc(x, DOT_Y, r, on ? col : '#f2e4ee', 6);
      if (i === 0) star(x, DOT_Y, on ? 22 : 14, on ? WHITE : PINK);
    }
  }

  function drawPad() {
    var t = game.time.elapsed;
    var pr = charging && !chargeLock;
    var r = PAD_R - (pr ? 14 : 0);
    game.draw.circle(PAD_X, PAD_Y, r + 36 + Math.sin(t * 5) * 8, GOLD, 0.25);
    rimDisc(PAD_X, PAD_Y + (pr ? 8 : 0), r, pr ? '#ff7cc4' : PINK, 12);
    game.draw.circle(PAD_X - 40, PAD_Y - 40 + (pr ? 8 : 0), 40, WHITE, 0.4);
    // 葡萄の房の印
    var cy = PAD_Y + (pr ? 8 : 0);
    for (var k = 0; k < 6; k++) {
      var gx = PAD_X + [-34, 0, 34, -17, 17, 0][k], gy = cy - 34 + [0, 0, 0, 30, 30, 60][k];
      game.draw.circle(gx, gy, 20, GRAPE);
      game.draw.circle(gx - 6, gy - 6, 6, WHITE, 0.6);
    }
  }

  function drawHud() {
    rimBox(24, 24, W - 48, 184, '#fff8fc', 8);
    label('SCORE ' + score, 54, 86, 46, PINK, 'left');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      rimDisc(W - 74 - i * 72, 72, 24, on ? GRAPE : '#e2d8e8', 5);
    }
    for (var j = 0; j < posts.length; j++) {
      var x = W / 2 - (posts.length - 1) * 46 + j * 92, p = posts[j];
      var col = '#eadfd0';
      if (p.res === 1 || p.res === 2) col = p.res === 1 ? GOLD : CYAN;
      else if (p.res === 3) col = '#ffc0d8';
      rimBox(x - (p.big ? 14 : 10), 122, p.big ? 28 : 20, 48, col, 4);
    }
    var remain = Math.max(0, Math.min(1, 1 - clock / (BARS * BAR)));
    game.draw.rect(54, 186, W - 108, 12, '#f0dde8');
    game.draw.rect(54, 186, (W - 108) * remain, 12, PINK);
    if (combo >= 2) label('x' + combo, W - 54, 160, 40, GRAPE, 'right');
  }

  function drawScene() {
    drawSky();
    drawRows();
    var topY = drawPosts();
    drawPillar();
    drawApproach(topY);
    drawKeeper(topY);
    drawMeter();
    drawDots();
    drawPad();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.36;
    rimBox(60, y0, W - 120, hh, '#fff8fc', 14);
    for (var i = 0; i < 6; i++) game.draw.rect(60 + i * (W - 120) / 6, y0, (W - 120) / 6, 24, [PINK, '#ff9a3c', GOLD, '#5fe08a', CYAN, GRAPE][i]);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 104, won ? GOLD : PINK);
    label('SCORE ' + score, W / 2, H * 0.405, 62, GRAPE);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.45, 36, DARK);
    label(nDriven + ' / ' + posts.length, W / 2, H * 0.495, 52, CYAN);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 62, PINK);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 44, DARK);
    if (!won) label('あと' + Math.max(1, posts.length - nDriven) + '本!', W / 2, H * 0.585, 50, PINK);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.618, 36, GRAPE);
  }

  // ---- ATTRACT: 実ロジックで杭2本。奇数周は2拍目で押して1拍目で離し2本ともPERFECT、偶数周は2本目を3拍目で早離ししてMISS ----
  var demo = { t: 0, x: PAD_X + 50, y: PAD_Y + 50, press: false, cyc: 0, step: 0 };
  var DEMO_CYC = 2 * BAR + SPB + 0.9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.step = 0; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var early = demo.cyc % 2 === 0;
    var p = posts[Math.min(posts.length - 1, demo.step >> 1)];
    if (demo.step < posts.length * 2 && hitStop <= 0) {
      if (demo.step % 2 === 0 && clock >= p.liftT - 0.005) { lift(); demo.step++; }
      else if (demo.step % 2 === 1) {
        var relAt = early && p.i === 1 ? p.strikeT - SPB : p.strikeT;
        if (clock >= relAt - 0.005) { release(); demo.step++; }
      }
    }
    demo.press = charging;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!posts) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y + (demo.press ? 0 : 30), { press: demo.press, scale: 15 });
      rimBox(24, 24, W - 48, 184, '#fff8fc', 8);
      label(GAME_TITLE, W / 2, 112, 98 + Math.sin(t * 4) * 4, PINK);
      label('HI-SCORE ' + game.best, W / 2, 186, 38, GRAPE);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.97, 46, PINK);
      else label('TAP TO START', W / 2, H * 0.97, 42, GRAPE);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      rimBox(80, H * 0.4, W - 160, 170, PINK, 12);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 122, 110, GOLD);
    }
    // 最初の振り上げ〜振り下ろしの間だけ、パッドの上に手を1回出す
    if (!over && posts.length && clock > posts[0].liftT - 0.3 && clock < posts[0].strikeT + 0.2) {
      game.draw.hand(PAD_X + 50, PAD_Y + 50, { press: clock >= posts[0].liftT && clock < posts[0].strikeT, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
