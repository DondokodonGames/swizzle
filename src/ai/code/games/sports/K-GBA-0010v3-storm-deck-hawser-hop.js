// K-GBA-0010v3-storm-deck-hawser-hop.js
// 甲板ロープ輪くぐり — 回る係留索の輪が足元を通る拍の一点だけを狙って跳ぶ。4拍ごとに回転が一段速くなる
// 操作: 画面のどこをタップしても跳ぶ。下の羅針盤の針(=輪の位置)が真下の印に来た拍の頭で一度だけ跳ぶ。早跳び・遅れ・二度跳びはMISS。段が上がる直前に鐘が二度鳴り、次の段のランプが点滅する
// 終わり: 5段(92→104→116→128→140の速さ x4拍)計20回を跳び切ればCLEAR(PERFECT/GOOD x段の倍率+連続PERFECT)。MISS3回でGAME OVER
// @mechanic: timing_one_shot
// @theme: storm_deck_hawser_hop
// 世界観: 嵐明けの帆船の甲板で、見習い水夫が、甲板長の回す係留索の輪を足元に来る一瞬だけ跳び越え、だんだん速くなる回転に最後まで足を取られずに耐える
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・到達した段・最長連続PERFECT
// スタイル: 70s MONO

(function(game) {
  var STYLE = { bg: ['#0b0d10', '#1a1e22'], main: ['#f2f2ea', '#9aa0a0', '#4a5050'], accent: ['#ffb000', '#35d6ff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドットと灰色だけで描き、画面の帯ごとにセロハンの単色(上=琥珀 / 中=水色)を重ねる
  var C = {
    black: STYLE.bg[0], dark: STYLE.bg[1], white: STYLE.main[0], grey: STYLE.main[1], dim: STYLE.main[2],
    amber: STYLE.accent[0], cyan: STYLE.accent[1]
  };

  var GAME_TITLE = 'HAWSER HOP';
  var HUD_H = Math.round(H * 0.12);
  var STAGE_BPM = [92, 104, 116, 128, 140];
  var PERFECT_W = 0.055, GOOD_W = 0.11;
  var READY_T = 0.8;
  var LIVES = 3;
  var TIME_LIMIT = 11;
  var DEMO_CYC = 3.9;
  var MAN_X = 540, DECK_Y = Math.round(H * 0.62), AXIS_Y = 1095, HOLD_X = 200, CLEAT_X = 905;
  var DIAL_X = 540, DIAL_Y = Math.round(H * 0.865), DIAL_R = 200;

  // 拍の時刻: 4拍ごとに速さが一段上がる(段階的加速)
  var BT = [0];
  for (var si = 0; si < STAGE_BPM.length; si++) for (var bi0 = 0; bi0 < 4; bi0++) BT.push(BT[BT.length - 1] + 60 / STAGE_BPM[si]);
  var TOTAL = BT.length - 1;
  function stageOf(k) { return Math.max(0, Math.min(STAGE_BPM.length - 1, Math.floor((k - 1) / 4))); }

  // 甲板の掛け声(オリジナル): 矩形波の単音で、各段の4拍を刻む。段が上がるほど細かくなる
  var TUNE = [
    [['D4', 1], ['F4', 1], ['A4', 1], ['F4', 1]],
    [['D4', 1], ['A4', 1], ['G4', 1], ['F4', 1]],
    [['E4', 0.5], ['F4', 0.5], ['G4', 1], ['A4', 1], ['C5', 1]],
    [['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['G4', 0.5], ['A4', 1]],
    [['D5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5], ['D5', 1]]
  ];

  // ---- スプライト(白と灰の2階調) ----
  var BOY = [
    ['..cccc..', '.cccccc.', '..ffff..', '..ffff..', '.swswsw.', 's.wsws.s', 'f.swsw.f', '..pppp..', '..p..p..', '..p..p..', '.pp..pp.'],
    ['f.cccc.f', 's.cccc.s', '.sffffs.', '..ffff..', '..wsws..', '..swsw..', '..wsws..', '.pppppp.', 'pp....pp', '........', '........'],
    ['..........', '..........', '..........', '..........', '..........', '..........', 'cc........', 'ccff.sws..', 'ccffswswpp', '.cff.sw.pp', '..........']
  ];
  var BOYPAL = { c: '#f2f2ea', f: '#9aa0a0', s: '#f2f2ea', w: '#4a5050', p: '#9aa0a0' };
  var BOYWHITE = { c: '#ffffff', f: '#ffffff', s: '#ffffff', w: '#ffffff', p: '#ffffff' };
  var BOSUN = ['..gggg..', '.gggggg.', '..ffff..', '.fbbbbf.', '..bbbb..', '.cccccc.', 'cccccccc', 'c.cccc.c', '..cccc..', '..c..c..', '..c..c..', '.cc..cc.'];
  var BOSPAL = { g: '#f2f2ea', f: '#9aa0a0', b: '#f2f2ea', c: '#9aa0a0' };
  var GULL = [['#.....#', '.#...#.', '..#.#..', '...#...'], ['.......', '#.....#', '.#####.', '...#...']];
  var LIFE = ['.####.', '#....#', '#....#', '#....#', '.####.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, res, lives, score, streak, maxStreak, nPerfect, nGood, nMiss, hitStop, over, won, outroT;
  var lastBeat, cuedStage, jumpT, dialFlash, demoMode, prevBest, failK, bellT, stageShown;
  var beatPulse = 0;

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; res = []; for (var k = 0; k <= TOTAL; k++) res.push(0);
    lives = LIVES; score = 0; streak = 0; maxStreak = 0; nPerfect = 0; nGood = 0; nMiss = 0;
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = 0; cuedStage = -1;
    jumpT = 9; dialFlash = 0; prevBest = game.best; failK = -1; bellT = 0; stageShown = 0;
  }

  // 輪の位相: 0=足元(跳ぶ一点) / 0.5=頭上。開始時は頭上に構えてから最初の拍へ下ろす
  function ropePhase(t) {
    if (t < 0) return 0.5;
    if (t < BT[1]) return 0.5 + 0.5 * t / BT[1];
    for (var k = 2; k <= TOTAL; k++) if (t < BT[k]) return (t - BT[k - 1]) / (BT[k] - BT[k - 1]);
    var last = BT[TOTAL] - BT[TOTAL - 1];
    return ((t - BT[TOTAL]) / last) % 1;
  }
  function curStage() {
    for (var k = 1; k <= TOTAL; k++) if (clock < BT[k] + GOOD_W) return stageOf(k);
    return STAGE_BPM.length - 1;
  }
  function manY() { return DECK_Y - (jumpT < 0.3 ? Math.sin(jumpT / 0.3 * Math.PI) * 130 : 0); }

  // ---- 判定 ----
  function hitBeat(k, grade) {
    res[k] = grade;
    var st = stageOf(k);
    if (grade === 1) { nPerfect++; streak++; maxStreak = Math.max(maxStreak, streak); } else { nGood++; streak = 0; }
    score += Math.round((grade === 1 ? 100 : 50) * (1 + st * 0.25)) + (grade === 1 ? Math.min(10, streak) * 20 : 0);
    game.feedback.good(MAN_X, manY() - 220, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.white : C.grey, size: grade === 1 ? 52 : 42, count: grade === 1 ? 14 : 8, volume: demoMode ? 0.04 : 0.2 });
    if (!demoMode && streak >= 2) game.audio.tone(440 * Math.pow(2, Math.min(12, streak) / 12), 0.05, { wave: 'square', volume: 0.05 });
    if (k % 4 === 0 && k < TOTAL && !demoMode) {
      game.fx.popup((st + 2) + ' / ' + STAGE_BPM.length, W / 2, 380, { color: C.amber, size: 72 });
      game.audio.play('se_milestone', 0.45);
    }
    if (k >= TOTAL) finishRun(lives > 0);
  }

  function missBeat(k) {
    if (k > 0) res[k] = 3;
    streak = 0; nMiss++; lives--; failK = k;
    if (lives <= 0 && !demoMode) {
      hitStop = 0.45;
      game.feedback.bad(MAN_X, DECK_Y - 120, { text: 'MISS', shake: 16, flashColor: '#ffffff' });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(MAN_X, DECK_Y - 120, { text: 'MISS', shake: demoMode ? 4 : 10, volume: demoMode ? 0.04 : 0.6, flashColor: '#ffffff' });
    }
    if (!over && k >= TOTAL) finishRun(lives > 0);
  }

  function jump() {
    jumpT = 0; dialFlash = 0.15;
    if (clock < 0) return 'early';
    var best = -1, bd = 1e9, dbl = false;
    for (var k = 1; k <= TOTAL; k++) {
      var d = Math.abs(clock - BT[k]);
      if (d > GOOD_W) continue;
      if (res[k]) { dbl = true; continue; }
      if (d < bd) { bd = d; best = k; }
    }
    if (best > 0) { hitBeat(best, bd <= PERFECT_W ? 1 : 2); return 'hit'; }
    // 一点以外で跳んだ(早跳び・二度跳び): 着地で輪に足を取られる。次の一点は残るので跳び直せる
    missBeat(0);
    return dbl ? 'double' : 'miss';
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    if (ok) {
      score += lives * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 600 + (i % 2) * 140, { color: i % 2 ? C.amber : C.white, count: 18, speed: 420 });
      game.fx.flash(C.white, 0.18);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var reached = 0;
    for (var k = 1; k <= TOTAL; k++) if (res[k] === 1 || res[k] === 2) reached = stageOf(k) + 1;
    var stats = { score: score, perfect: nPerfect, good: nGood, miss: nMiss, stage: reached, maxStreak: maxStreak };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック: 各段の頭で掛け声を出し(その段の速さ)、輪が足元を打つ拍で鳴らす。段が上がる1拍前に鐘2回
  function beatClock() {
    for (var s = 0; s < STAGE_BPM.length; s++) {
      var at = BT[4 * s + 1] - 60 / STAGE_BPM[s];
      if (s > cuedStage && clock >= at - 0.06) {
        cuedStage = s;
        if (!demoMode) game.audio.melody(TUNE[s], { tempo: STAGE_BPM[s], wave: 'square', volume: 0.05 });
      }
    }
    var k = lastBeat + 1;
    if (k <= TOTAL && clock >= BT[k]) {
      lastBeat = k;
      beatPulse = 1;
      if (!demoMode) game.audio.tone(110, 0.06, { wave: 'square', volume: 0.08 });
      if (k % 4 === 3 && k < TOTAL - 1) {
        bellT = 0.6;
        if (!demoMode) { game.audio.tone(1568, 0.12, { wave: 'square', volume: 0.05 }); game.audio.tone(1568, 0.1, { wave: 'square', volume: 0.04, slide: -40 }); }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    jumpT += dt;
    if (dialFlash > 0) dialFlash -= dt;
    if (bellT > 0) bellT -= dt;
    beatClock();
    if (over) return;
    for (var k = 1; k <= TOTAL; k++) {
      if (!res[k] && clock > BT[k] + GOOD_W) {
        missBeat(k);
        if (over) return;
      }
    }
    if (!over && clock > TIME_LIMIT) finishRun(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
    if (state === S.PLAYING && over) game.fx.burst(x, y, { color: C.grey, count: 3, speed: 80 });
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    var r = jump();
    game.audio.play('se_jump', r === 'early' ? 0.1 : 0.3);
    if (r === 'early') game.fx.burst(DIAL_X, DIAL_Y, { color: C.dim, count: 4, speed: 90 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function ring(x, y, r, col, w, n) {
    n = n || 32;
    var lx = x, ly = y + r;
    for (var i = 1; i <= n; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.sin(a) * r, ny = y + Math.cos(a) * r;
      game.draw.line(lx, ly, nx, ny, col, w);
      lx = nx; ly = ny;
    }
  }

  function drawSea() {
    var t = game.time.elapsed;
    game.draw.clear(C.black);
    game.draw.gradient(HUD_H, 880, [[0, C.black], [1, C.dark]]);
    // 嵐明けの雲(右へ流れて切れていく)と朝日
    game.draw.circle(820, 700, 90, C.white);
    for (var b = 0; b < 6; b++) game.draw.rect(720, 640 + b * 22, 200, 6, C.black);
    for (var c = 0; c < 5; c++) {
      var cx = ((c * 260 + t * 22) % (W + 400)) - 200;
      game.draw.rect(cx, 330 + (c % 3) * 90, 240, 40, C.dim);
      game.draw.rect(cx + 40, 300 + (c % 3) * 90, 150, 34, C.dim);
    }
    for (var g = 0; g < 2; g++) {
      var gx = ((g * 520 + t * 60) % (W + 200)) - 100;
      game.draw.sprite(GULL[Math.floor(t * 4 + g) % 2], { '#': C.white }, gx, 520 + g * 70 + Math.sin(t * 2 + g) * 14, 8, { anchor: 'center' });
    }
    // 海(うねりの白い点線)
    var sway = Math.sin(t * 0.9) * 16;
    game.draw.rect(0, 880 + sway, W, 140, C.dark);
    for (var w = 0; w < 4; w++) {
      var off = (t * (40 + w * 20)) % 120;
      for (var x = -120 + off; x < W; x += 120) game.draw.rect(x, 900 + w * 30 + sway, 60, 6, w % 2 ? C.grey : C.dim);
    }
  }

  function drawShip() {
    var t = game.time.elapsed;
    // マストと帆桁、索具
    game.draw.rect(96, 250, 26, DECK_Y - 250, C.grey);
    game.draw.rect(20, 330, 200, 14, C.grey);
    game.draw.line(109, 260, 1000, 1000, C.dim, 4);
    game.draw.line(109, 260, 300, 1000, C.dim, 4);
    // 舷墻と甲板
    game.draw.rect(0, 1000, W, 40, C.grey);
    for (var p = 0; p < W; p += 90) game.draw.rect(p, 1040, 16, DECK_Y - 1040, C.dim);
    game.draw.rect(0, DECK_Y, W, 14, C.white);
    for (var d = 0; d < 6; d++) game.draw.rect(0, DECK_Y + 40 + d * 34, W, 4, C.dim);
    // 水たまり(朝日が揺れて映る)
    game.draw.rect(250, DECK_Y + 60, 160, 10, C.grey);
    game.draw.rect(690 + Math.sin(t * 2) * 6, DECK_Y + 120, 120, 8, C.grey);
    // 係留索の留め具(右)
    game.draw.rect(CLEAT_X - 30, 1060, 60, 18, C.white);
    game.draw.rect(CLEAT_X - 8, 1060, 16, 60, C.white);
  }

  function holdPos(ph) {
    var a = ph * Math.PI * 2;
    return { x: HOLD_X + Math.sin(a) * 30, y: AXIS_Y + Math.cos(a) * 34 };
  }
  function drawRope(front) {
    var ph = ropePhase(clock);
    var isFront = ph < 0.25 || ph > 0.75;
    if (isFront !== front) return;
    var hp = holdPos(ph), ex = CLEAT_X, ey = 1070;
    var midY = AXIS_Y + Math.cos(ph * Math.PI * 2) * 125;
    var col = hitStop > 0 ? '#ffffff' : (isFront ? C.white : C.grey);
    var lx = hp.x, ly = hp.y;
    for (var i = 1; i <= 16; i++) {
      var u = i / 16, x = hp.x + (ex - hp.x) * u, v = u * 2 - 1;
      var by = hp.y + (ey - hp.y) * u;
      var y = by + (midY - AXIS_Y) * (1 - v * v);
      game.draw.line(lx, ly, x, y, col, isFront ? 12 : 7);
      lx = x; ly = y;
    }
  }

  function drawPeople() {
    var ph = ropePhase(clock), hp = holdPos(ph);
    game.draw.sprite(BOSUN, BOSPAL, HOLD_X - 40, DECK_Y - 84 - beatPulse * 6, 14, { anchor: 'center' });
    game.draw.line(HOLD_X - 20, DECK_Y - 120, hp.x, hp.y, C.grey, 14);
    // 足元に来る一瞬の予告: 輪の影が甲板で広がる
    if (!over && clock >= 0) {
      var near = ph > 0.65 ? (ph - 0.65) / 0.35 : 0;
      game.draw.rect(MAN_X - 90 - near * 160, DECK_Y + 2, 180 + near * 320, 10, near > 0.75 ? C.white : C.dim);
    }
    var fr = BOY[0], px = 15, y = manY();
    if (failK >= 0 && (hitStop > 0 || (over && !won))) fr = BOY[2];
    else if (jumpT < 0.3) fr = BOY[1];
    if (hitStop > 0) {
      game.draw.circle(MAN_X, y - 90, 140, '#ffffff', 0.6);
      game.draw.sprite(fr, BOYWHITE, MAN_X, y - 96, 18, { anchor: 'center' });
      return;
    }
    game.draw.sprite(fr, BOYPAL, MAN_X, y - 82, px, { anchor: 'center' });
  }

  // 羅針盤: 針=輪の位置。真下の印が跳ぶ一点。窓の幅(GOOD/PERFECT)を弧で示す
  function drawDial() {
    var ph = ropePhase(clock);
    var st = curStage(), spb = 60 / STAGE_BPM[st];
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 26, dialFlash > 0 ? C.grey : C.dim);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.black);
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2;
      game.draw.line(DIAL_X + Math.sin(a) * (DIAL_R - 30), DIAL_Y + Math.cos(a) * (DIAL_R - 30), DIAL_X + Math.sin(a) * (DIAL_R - 6), DIAL_Y + Math.cos(a) * (DIAL_R - 6), C.dim, 6);
    }
    var gA = GOOD_W / spb * Math.PI * 2, pA = PERFECT_W / spb * Math.PI * 2;
    for (var s = -6; s <= 6; s++) {
      var aa = s / 6 * gA;
      game.draw.circle(DIAL_X + Math.sin(aa) * (DIAL_R - 16), DIAL_Y + Math.cos(aa) * (DIAL_R - 16), Math.abs(aa) <= pA ? 13 : 9, Math.abs(aa) <= pA ? C.white : C.grey);
    }
    var hot = ph > 0.8 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(DIAL_X - 22, DIAL_Y + DIAL_R - 4, 44, 40, hot ? C.white : C.grey);
    var na = ph * Math.PI * 2;
    game.draw.line(DIAL_X, DIAL_Y, DIAL_X + Math.sin(na) * (DIAL_R - 40), DIAL_Y + Math.cos(na) * (DIAL_R - 40), C.white, 14);
    game.draw.circle(DIAL_X, DIAL_Y, 28, C.white);
    game.draw.circle(DIAL_X, DIAL_Y, 12, C.black);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, HUD_H, C.black);
    label('SCORE ' + score, 40, 64, 40, C.white, 'left');
    label(Math.min(TOTAL, lastBeat) + ' / ' + TOTAL, W / 2, 64, 40, C.white);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LIFE, { '#': i < lives ? C.white : C.dim }, W - 70 - i * 80, 64, 9, { anchor: 'center' });
    // 速さの段ランプ(次の段は鐘と同時に点滅)
    var st = curStage();
    for (var s = 0; s < STAGE_BPM.length; s++) {
      var lit = s <= st && clock >= 0;
      var blink = bellT > 0 && s === st + 1 && Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.rect(W / 2 - 250 + s * 104, 128, 84, 34, C.dim);
      game.draw.rect(W / 2 - 244 + s * 104, 134, 72, 22, lit || blink ? C.white : C.black);
    }
    var progress = Math.max(0, Math.min(1, clock / BT[TOTAL]));
    game.draw.rect(40, 196, W - 80, 10, C.dim);
    game.draw.rect(40, 196, (W - 80) * progress, 10, C.white);
    if (streak >= 2) label('PERFECT x' + streak, W - 40, 196, 26, C.white, 'right');
  }

  // セロハンの帯(上=琥珀 / 中=水色)と走査線
  function drawCellophane() {
    game.draw.rect(0, 0, W, HUD_H, C.amber, 0.38);
    game.draw.rect(0, 860, W, DECK_Y + 260 - 860, C.cyan, 0.22);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, C.black, 0.18);
  }

  function drawScene() {
    drawSea();
    drawShip();
    drawRope(false);
    drawPeople();
    drawRope(true);
    drawDial();
    drawHud();
    drawCellophane();
  }

  function drawResult(showTap) {
    game.draw.rect(60, H * 0.29, W - 120, H * 0.31, C.black, 0.92);
    game.draw.rect(60, H * 0.29, W - 120, 8, C.white);
    var reached = 0;
    for (var k = 1; k <= TOTAL; k++) if (res[k] === 1 || res[k] === 2) reached = stageOf(k) + 1;
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 96, won ? C.white : C.grey);
    label('SCORE ' + score, W / 2, H * 0.40, 56, C.white);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 32, C.grey);
    label(reached + ' / ' + STAGE_BPM.length, W / 2, H * 0.49, 44, C.amber);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.535, 52, C.white);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.535, 40, C.grey);
    if (!won) label('あと' + Math.max(1, TOTAL - nPerfect - nGood) + '回!', W / 2, H * 0.575, 44, C.white);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.60, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで1段目の4拍を一点で跳び(PERFECT)、速くなった2段目の頭で早跳びしてMISS ----
  var demo = { t: 0, x: DIAL_X, y: DIAL_Y + 60, press: false, gi: 1, pressT: 0, halt: false };
  function demoReset() {
    initRun(true);
    clock = -0.2; demo.gi = 1; demo.pressT = 0; demo.halt = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    if (demo.halt) { clock += dt; jumpT += dt; if (dialFlash > 0) dialFlash -= dt; beatClock(); }
    else stepRun(dt);
    if (demo.gi <= 5 && !demo.halt) {
      // 5拍目だけ、わざと0.2秒早く跳ぶ(失敗例)。そのあとは判定を止めて余韻だけ見せる
      var at = demo.gi === 5 ? BT[5] - 0.2 : BT[demo.gi];
      if (clock >= at && !over) { jump(); demo.pressT = 0.15; if (demo.gi === 5) demo.halt = true; demo.gi++; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.x = DIAL_X + 120 + Math.sin(game.time.elapsed * 1.7) * 20;
    demo.y = DIAL_Y + 80 + (demo.press ? 0 : 20);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!res) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, HUD_H, C.black);
      label(GAME_TITLE, W / 2, 84, 84 + Math.sin(t * 3) * 3, C.white);
      label('HI-SCORE ' + game.best, W / 2, 176, 36, C.grey);
      game.draw.rect(0, 0, W, HUD_H, C.amber, 0.38);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.24, 52, C.white);
      else label('TAP TO START', W / 2, H * 0.24, 46, C.grey);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt; jumpT += dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    if (clock < 0) {
      game.draw.rect(0, H * 0.44, W, 160, C.black, 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44 + 80, 100, C.white);
    }
    // 開始時お手本: 最初の一点の直前に、手を1回だけ出す
    if (!over && clock > BT[1] - 0.45 && clock < BT[1] + 0.15) {
      game.draw.hand(DIAL_X + 120, DIAL_Y + 80, { press: clock >= BT[1] - 0.04, scale: 13, alpha: 0.8 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
