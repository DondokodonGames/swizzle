// K-DS-0009v2-meadow-hopper-high-shot.js
// 草原のバッタ撮り — 食い気味の拍(3-3-2)ごとに二匹のバッタが跳ぶ。高く跳んだ方を、着地する次の拍の頭でその列ごとタップして撮る
// 操作: 草原に4つの草の塚が横に並ぶ。拍ごとにそのうち2つの塚のバッタが同時に跳び、到達した高さに目盛り線が残る。高く跳んだ方の列(塚の上下どこでも)を、二匹が着地する拍の頭で押す(押した瞬間で判定)。低い方・空いた塚・拍外れ・撮り逃しはMISS(高かった方が白く光って正解を見せる)
// 終わり: 100BPM・3-3-2の食い(1小節に3回)・前奏1小節+5小節で15回(約14秒)。MISS3回でGAME OVER、15回を撮り終えればCLEAR。二匹の高さの差は小節が進むほど小さくなる
// @mechanic: size_judge
// @theme: meadow_grasshopper_photo
// 世界観: 夏の草原のバッタ観察会で、昆虫写真家が草の塚から食い気味の拍で跳ねる二匹を見比べ、高く跳んだ一匹だけを着地の拍でシャッターに収めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・撮れた枚数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: HYPERCASUAL 3D

(function(game) {
  var STYLE = { bg: ['#f6f8f2', '#dcecd8'], main: ['#5cc46a', '#ffffff', '#a8d8a0'], accent: ['#ff7a4a', '#3a4a5a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊。真下に柔らかい影。見た目どおりの当たり判定
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], hop: STYLE.main[0], white: STYLE.main[1], mound: STYLE.main[2],
    orange: STYLE.accent[0], ink: STYLE.accent[1],
    moundD: '#86c07e', hopD: '#3e9a4c', sky: '#e6f2f6', gold: '#ffb820', red: '#ff5a5a', gray: '#b8c4c0', soft: '#2a3a30'
  };

  var GAME_TITLE = 'HOPPER SHOT';
  var BPM = 100;
  var EIGHT = 60 / BPM / 2;
  var BAR = EIGHT * 8;
  var NBARS = 6;
  var OFFS = [0, 3, 6];          // 3-3-2: 1拍目・2拍目の裏(食い)・4拍目
  var SHOTS = 15;
  var NEEDED = 15;
  var MISS_LIMIT = 3;
  var PERFECT_W = 0.05, GOOD_W = 0.1;
  var READY_T = 0.8;
  var TIME_LIMIT = 15;
  var PX = [180, 420, 660, 900];
  var PERCH_Y = 1260;
  var COL_W = 120;

  // 伴奏(オリジナル): 3-3-2の低音と、裏で跳ねる口笛風の旋律
  var MEL = [
    [['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 1]],
    [['D5', 0.5], ['R', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 1]],
    [['C5', 0.5], ['R', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['C6', 1]],
    [['B5', 0.5], ['R', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 0.5], ['G5', 1]]
  ];
  var BASSES = [
    [['A2', 1.5], ['A2', 1.5], ['E2', 1]],
    [['F2', 1.5], ['F2', 1.5], ['C3', 1]],
    [['C3', 1.5], ['C3', 1.5], ['G2', 1]],
    [['G2', 1.5], ['G2', 1.5], ['E2', 1]]
  ];

  // ---- スプライト ----
  var HOP_SIT = [
    '.......a.a.',
    '........aa.',
    '..ggggggg..',
    '.gggggggwk.',
    'gggggggggg.',
    '.dddgggggg.',
    '..LLL..ll..',
    '.LL.L..l.l.'
  ];
  var HOP_JUMP = [
    '.......a.a.',
    '........aa.',
    '..ggggggg..',
    '.gggggggwk.',
    'gggggggggg.',
    'Ldddgggggg.',
    'L.....l.l..',
    'L..........'
  ];
  var HOP_PAL = { a: '#3e9a4c', g: '#5cc46a', w: '#ffffff', k: '#2a3a30', d: '#3e9a4c', L: '#3e9a4c', l: '#3e9a4c' };
  var HOP_WHITE = { a: '#ffffff', g: '#ffffff', w: '#ffffff', k: '#2a3a30', d: '#ffffff', L: '#ffffff', l: '#ffffff' };
  var CAMMAN_A = [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '...ffffff...',
    '...fkffkf...',
    '..cccccccc..',
    '..ccllcccc..',
    '..ccllcccc..',
    '..cccccccc..',
    '.ssssssssss.',
    '.ssssssssss.',
    '..pppppppp..',
    '..pp....pp..'
  ];
  var CAMMAN_B = [
    '............',
    '...hhhhhh...',
    '..hhhhhhhh..',
    '...ffffff...',
    '...fkffkf...',
    '..cccccccc..',
    '..ccllcccc..',
    '..ccllcccc..',
    '.sccccccccs.',
    '.ssssssssss.',
    '..pppppppp..',
    '..pp....pp..'
  ];
  var CAM_PAL = { h: '#ff7a4a', f: '#f2d2b0', k: '#2a3a30', c: '#3a4a5a', l: '#9ad8f0', s: '#ffffff', p: '#6a8aa0' };
  var FILM = ['ffff', 'fggf', 'fggf', 'ffff'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, prevClock, cuedBar, pairs, shot, photos, misses, score, nP, nG, combo, maxCombo, film;
  var over, won, outroT, hitStop, demoMode, prevBest, shutter, frameCol, reveal, camPose;
  var tickPulse = 0, accentPulse = 0;

  function ri(n) { return Math.min(n - 1, Math.floor(game.random(0, n))); }

  function makePairs() {
    pairs = [];
    for (var k = 0; k < SHOTS; k++) {
      var a = ri(4), b = ri(3);
      if (b >= a) b++;
      var ratio = k < 6 ? 0.56 : (k < 12 ? 0.72 : 0.83);
      var short = k % 3 === 2 ? 0.88 : 1;
      var hi = game.random(520, 700) * short, lo = hi * ratio;
      var aHigh = game.random(0, 1) < 0.5;
      pairs.push({ a: a, b: b, ha: aHigh ? hi : lo, hb: aHigh ? lo : hi });
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; prevClock = clock; cuedBar = -99;
    makePairs();
    shot = []; film = []; photos = 0; misses = 0; score = 0; nP = 0; nG = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    shutter = 0; frameCol = -1; reveal = { p: -1, t: 0 }; camPose = 0;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function shotT(k) { return BAR * (1 + Math.floor(k / 3)) + EIGHT * OFFS[k % 3]; }
  function launchT(k) { return k === 0 ? shotT(0) - EIGHT * 2 : shotT(k - 1) + 0.04; }
  function hiPerch(k) { return pairs[k].ha >= pairs[k].hb ? pairs[k].a : pairs[k].b; }
  function loPerch(k) { return pairs[k].ha >= pairs[k].hb ? pairs[k].b : pairs[k].a; }
  function colOf(x) { for (var p = 0; p < 4; p++) if (Math.abs(x - PX[p]) < COL_W) return p; return -1; }
  function nearestShot(t) {
    var best = 0, bd = 99;
    for (var k = 0; k < SHOTS; k++) { var d = Math.abs(t - shotT(k)); if (d < bd) { bd = d; best = k; } }
    return best;
  }

  // 塚 p の現在の跳躍高さと、その跳躍で到達した最高点
  function hopState(p) {
    var landed = null;
    for (var k = 0; k < SHOTS; k++) {
      var l = launchT(k), s = shotT(k);
      if (clock < l || clock >= s + 0.25) continue;
      var h = pairs[k].a === p ? pairs[k].ha : (pairs[k].b === p ? pairs[k].hb : -1);
      if (h < 0) continue;
      if (clock >= s) { landed = { y: 0, peak: h, k: k, flying: false }; continue; }
      var f = (clock - l) / (s - l);
      return { y: h * 4 * f * (1 - f), peak: f < 0.5 ? h * 4 * f * (1 - f) : h, k: k, flying: true };
    }
    return landed || { y: 0, peak: -1, k: -1, flying: false };
  }

  // ---- 判定 ----
  function miss(why, k) {
    misses++; combo = 0;
    film.push(0);
    if (k >= 0) reveal = { p: hiPerch(k), t: 0.45 };
    var x = why === 'late' ? PX[hiPerch(k)] : (frameCol >= 0 ? PX[frameCol] : W / 2);
    game.feedback.bad(x, PERCH_Y - 360, { text: 'MISS', shake: demoMode ? 3 : 8, volume: demoMode ? 0 : 0.45 });
    if (why === 'late') sfx('se_jump', 0.3);
    if (!demoMode && misses >= MISS_LIMIT) { hitStop = 0.45; finish(false); }
  }

  function shoot(x) {
    if (over) return 'over';
    frameCol = colOf(x); shutter = 0.14; camPose = 0.16;
    if (clock < launchT(0)) { tone(500, 0.04, { wave: 'triangle', volume: 0.05 }); return 'air'; }
    tone(1500, 0.025, { wave: 'square', volume: 0.06 });
    tone(700, 0.04, { wave: 'square', volume: 0.05 });
    var k = nearestShot(clock), ad = Math.abs(clock - shotT(k));
    if (ad > GOOD_W) { miss('off', -1); return 'miss'; }
    if (shot[k]) { miss('double', -1); return 'miss'; }
    shot[k] = true;
    if (frameCol !== hiPerch(k)) { miss(frameCol === loPerch(k) ? 'small' : 'empty', k); return 'miss'; }
    var perfect = ad <= PERFECT_W;
    if (perfect) nP++; else nG++;
    photos++; film.push(perfect ? 2 : 1);
    combo++; maxCombo = Math.max(maxCombo, combo);
    var stage = k < 6 ? 1 : (k < 12 ? 1.3 : 1.6);
    score += Math.round(((perfect ? 100 : 60) + Math.min(50, combo * 10)) * stage);
    game.feedback.good(PX[frameCol], PERCH_Y - 300, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.hop, size: perfect ? 52 : 44, count: 10, volume: demoMode ? 0 : 0.25 });
    if (!demoMode && photos === 8) { game.fx.popup(photos + ' / ' + NEEDED, W / 2, 560, { color: C.orange, size: 72 }); sfx('se_milestone', 0.45); }
    if (!demoMode && combo > 0 && combo % 5 === 0) game.fx.popup('COMBO ' + combo, W / 2, 460, { color: C.hop, size: 60 });
    return 'hit';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_LIMIT - misses) * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 260, { color: [C.gold, C.hop, C.orange][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.white, 0.15);
      sfx('se_success', 0.55);
    } else {
      game.fx.flash('#ffffff', 0.18);
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, photos: photos, total: NEEDED, perfect: nP, good: nG, miss: misses, maxCombo: maxCombo };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function cueBar(b) {
    if (demoMode) return;
    if (b === 0) game.audio.melody([['A4', 1.5], ['A4', 1.5], ['E5', 1]], { tempo: BPM, wave: 'triangle', volume: 0.04, bass: BASSES[0], bassVolume: 0.08 });
    else game.audio.melody(MEL[(b - 1) % 4], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: BASSES[(b - 1) % 4], bassVolume: 0.08 });
  }

  function on8th(e) {
    tickPulse = 1;
    var pos = e % 8;
    if (pos === 0 || pos === 3 || pos === 6) {
      accentPulse = 1;
      tone(pos === 3 ? 'E4' : 'A3', 0.06, { wave: 'square', volume: 0.06 });
    } else {
      tone(2400, 0.012, { wave: 'triangle', volume: 0.018 });
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    for (var b = 0; b < NBARS; b++) if (b > cuedBar && clock + 0.06 >= b * BAR) { cuedBar = b; cueBar(b); }
    for (var e = 0; e < NBARS * 8; e++) if (prevClock < e * EIGHT && clock >= e * EIGHT) on8th(e);
    // 跳躍の合図(小さなバネ音)
    for (var k = 0; k < SHOTS; k++) { var l = launchT(k); if (prevClock < l && clock >= l) tone(500, 0.05, { wave: 'sine', volume: 0.04, slide: 400 }); }
    if (over) return;
    for (var j = 0; j < SHOTS; j++) {
      if (shot[j] || clock <= shotT(j) + GOOD_W) continue;
      shot[j] = true;
      frameCol = -1;
      miss('late', j);
      if (over) return;
    }
    if (clock >= shotT(SHOTS - 1) + 0.5 || clock > TIME_LIMIT) finish(misses < MISS_LIMIT);
  }

  function tickFx(dt) {
    tickPulse = Math.max(0, tickPulse - dt * 6);
    accentPulse = Math.max(0, accentPulse - dt * 4);
    if (shutter > 0) shutter -= dt;
    if (camPose > 0) camPose -= dt;
    if (reveal.t > 0) reveal.t -= dt;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 240) return;
    var r = shoot(x);
    game.fx.burst(x, Math.min(y, PERCH_Y), { color: r === 'hit' ? C.gold : (r === 'miss' ? C.red : C.gray), count: 4, speed: 140 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000033', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function card(x, y, w, h, col) {
    game.draw.rect(x + 6, y + 10, w, h, '#000000', 0.08);
    game.draw.rect(x, y, w, h, col || C.white, 0.94);
  }
  // 柔らかい楕円の影
  function shadow(x, y, rx, ry, a) {
    for (var i = -ry; i <= ry; i += 3) {
      var w = rx * Math.sqrt(Math.max(0, 1 - (i * i) / (ry * ry)));
      game.draw.rect(x - w, y + i, w * 2, 3, C.soft, a);
    }
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.42, C.bg0], [0.6, C.bg1], [1, '#c8e2c2']]);
    // 遠くの丸い丘と雲(淡色の塊)
    game.draw.circle(200, 860, 260, '#d0e8cc');
    game.draw.circle(760, 900, 340, '#c8e4c4');
    for (var c = 0; c < 3; c++) {
      var cx = ((t * 18 + c * 380) % (W + 300)) - 150;
      game.draw.circle(cx, 360 + c * 60, 46, C.white, 0.9);
      game.draw.circle(cx + 50, 350 + c * 60, 60, C.white, 0.9);
      game.draw.circle(cx + 110, 365 + c * 60, 40, C.white, 0.9);
    }
    // 地面
    game.draw.rect(0, 1000, W, 440, '#bfe0b8');
    for (var g = 0; g < 9; g++) game.draw.circle(60 + g * 125, 1010, 38, '#b0d8a8');
  }

  function drawMounds() {
    var t = game.time.elapsed;
    for (var p = 0; p < 4; p++) {
      var x = PX[p], hs = hopState(p);
      // 跳ぶ二匹の塚は着地の拍まで枠で示す(観察対象)
      var cand = false;
      for (var k = 0; k < SHOTS; k++) if ((pairs[k].a === p || pairs[k].b === p) && clock >= launchT(k) && clock < shotT(k) + GOOD_W) cand = true;
      shadow(x, PERCH_Y + 58, 110, 18, 0.1);
      game.draw.circle(x, PERCH_Y + 70, 105, C.moundD);
      game.draw.circle(x, PERCH_Y + 60, 100, C.mound);
      game.draw.circle(x - 30, PERCH_Y + 30, 30, C.white, 0.35);
      if (cand) {
        game.draw.rect(x - 112, PERCH_Y - 760, 6, 820, C.orange, 0.25);
        game.draw.rect(x + 106, PERCH_Y - 760, 6, 820, C.orange, 0.25);
      }
      // 到達した高さの目盛り線(着地後もしばらく残る)
      if (hs.peak > 0) {
        var my = PERCH_Y - 30 - hs.peak;
        game.draw.rect(x - 90, my - 4, 180, 8, C.ink, 0.75);
        game.draw.circle(x - 90, my, 10, C.ink);
        game.draw.circle(x + 90, my, 10, C.ink);
      }
      // バッタ(影は高く跳ぶほど小さく薄い)
      var hy = PERCH_Y - 30 - hs.y;
      var sh = Math.max(0.3, 1 - hs.y / 900);
      shadow(x, PERCH_Y, 60 * sh, 12 * sh, 0.18 * sh);
      var white = reveal.t > 0 && reveal.p === p;
      var bob = hs.flying ? 0 : Math.sin(t * 6 + p) * 4 - accentPulse * 6;
      game.draw.sprite(hs.flying ? HOP_JUMP : HOP_SIT, white ? HOP_WHITE : HOP_PAL, x, hy + bob, white ? 15 : 12, { anchor: 'center', flipX: p >= 2 });
    }
  }

  function drawCamera() {
    // シャッター枠
    if (shutter > 0 && frameCol >= 0) {
      var fx = PX[frameCol];
      game.draw.rect(fx - 120, PERCH_Y - 760, 240, 820, C.white, shutter * 3);
      game.draw.rect(fx - 120, PERCH_Y - 760, 240, 10, C.ink); game.draw.rect(fx - 120, PERCH_Y + 50, 240, 10, C.ink);
      game.draw.rect(fx - 120, PERCH_Y - 760, 10, 820, C.ink); game.draw.rect(fx + 110, PERCH_Y - 760, 10, 820, C.ink);
    }
    // 親指ゾーン: 写真家とフィルム
    game.draw.rect(0, 1440, W, H - 1440, '#a8d0a0');
    shadow(W / 2, 1745, 150, 22, 0.15);
    game.draw.sprite(camPose > 0 ? CAMMAN_B : CAMMAN_A, CAM_PAL, W / 2, 1620, 18, { anchor: 'center' });
    if (shutter > 0) game.draw.circle(W / 2 - 18, 1620, 40, C.white, 0.8);
    for (var i = 0; i < NEEDED; i++) {
      var v = film[i], fx2 = 120 + i * 60;
      game.draw.sprite(FILM, { f: C.ink, g: v === undefined ? '#e0e8e0' : (v === 0 ? C.red : (v === 2 ? C.gold : C.hop)) }, fx2, 1830, 12, { anchor: 'center' });
    }
  }

  function drawHud() {
    card(20, 16, W - 40, 210, C.white);
    label('SCORE ' + score, 60, 70, 40, C.ink, 'left');
    label(photos + ' / ' + NEEDED, W - 60, 70, 44, C.orange, 'right');
    for (var i = 0; i < MISS_LIMIT; i++) game.draw.circle(80 + i * 60, 150, 20, i < MISS_LIMIT - misses ? C.hop : C.gray);
    // 8分の升目: 3-3-2 の頭が橙。カーソルが拍を進む
    var cur = clock >= 0 ? Math.floor(clock / EIGHT) % 8 : -1;
    for (var c = 0; c < 8; c++) {
      var acc = c === 0 || c === 3 || c === 6;
      var on = c === cur;
      var cx = W / 2 - 175 + c * 50;
      game.draw.circle(cx, 150, on ? (acc ? 22 + accentPulse * 6 : 14) : (acc ? 16 : 9), on ? (acc ? C.orange : C.ink) : (acc ? '#ffc8b0' : C.gray));
    }
    if (combo >= 2) label('COMBO ' + combo, W - 60, 162, 34, C.hop, 'right');
    var prog = Math.max(0, Math.min(1, clock / (NBARS * BAR)));
    game.draw.rect(60, 198, W - 120, 10, '#e4ece4');
    game.draw.rect(60, 198, (W - 120) * prog, 10, C.orange);
  }

  function drawScene() {
    drawWorld();
    drawMounds();
    drawCamera();
  }

  function drawResult(showTap) {
    var top = H * 0.26;
    card(70, top, W - 140, H * 0.37, C.white);
    game.draw.rect(70, top, W - 140, 14, won ? C.hop : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.305, 90, won ? C.hop : C.red);
    label('SCORE ' + score, W / 2, H * 0.36, 56, C.ink);
    label(photos + ' / ' + NEEDED, W / 2, H * 0.405, 50, C.orange);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + misses, W / 2, H * 0.45, 32, C.ink);
    label('COMBO ' + maxCombo, W / 2, H * 0.485, 34, C.hop);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.53, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.53, 42, C.ink);
    if (!won) {
      var left = 0;
      for (var k = 0; k < SHOTS; k++) if (!shot[k]) left++;
      label('あと' + Math.max(1, left) + '枚!', W / 2, H * 0.575, 48, C.red);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.612, 32, C.ink);
  }

  // ---- ATTRACT: 実ロジックで二匹を見比べ、高い方の列を着地の拍で撮る。1周おきに低い方を撮ってMISSを見せる ----
  var demo = { t: 0, n: 0, next: 0, hx: W / 2, hy: PERCH_Y + 120, press: 0 };
  var DEMO_START = BAR * 0.5;
  var DEMO_CYC = BAR * 2 + EIGHT * 6 + 0.45 - DEMO_START;
  function demoReset() {
    initRun(true);
    clock = DEMO_START; prevClock = clock; cuedBar = 99;
    demo.n++; demo.next = 0; demo.press = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    tickFx(dt);
    var k = demo.next;
    if (k < SHOTS) {
      var wrong = demo.n % 2 === 0 && k === 4;
      var target = wrong ? loPerch(k) : hiPerch(k);
      var decided = clock >= (launchT(k) + shotT(k)) / 2;
      var tx = decided ? PX[target] : W / 2, ty = decided ? PERCH_Y + 140 : PERCH_Y + 260;
      demo.hx += (tx - demo.hx) * Math.min(1, dt * 12);
      demo.hy += (ty - demo.hy) * Math.min(1, dt * 12);
      if (clock >= shotT(k) + 0.012) {
        shoot(PX[target]);
        demo.press = 0.12; demo.next++;
      }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      card(20, 16, W - 40, 210, C.white);
      label(GAME_TITLE, W / 2, 92, 82 + Math.sin(t * 3) * 3, C.hop);
      label('HI-SCORE ' + game.best, W / 2, 180, 34, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.145, 48, C.orange);
      else label('TAP TO START', W / 2, H * 0.145, 44, C.ink);
      return;
    }

    if (state === S.RESULT) {
      tickFx(dt);
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      tickFx(dt);
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      tickFx(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      card(140, H * 0.4, W - 280, 150, C.white);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.orange);
    }
    // 最初の1回だけ、高い方の列を着地の拍で押す手を薄く見せる
    if (clock >= launchT(0) && clock < shotT(0) + 0.25 && !over) {
      game.draw.hand(PX[hiPerch(0)], PERCH_Y + 140, { press: Math.abs(clock - shotT(0)) < 0.08, scale: 12, alpha: 0.45 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
