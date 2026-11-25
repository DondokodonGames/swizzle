// K-DS-0019v2-flower-stem-ant-climb.js
// 茎のぼりの見張りアリ — 光る葉を表拍ごとに踏んで、巨大な花の茎を一段ずつ登りきる
// 操作: 画面の左半分=左の葉、右半分=右の葉(下の丸ボタン)。次に踏む葉が拍の頭ごとに光るので、その側を拍の頭に押すと一段登る(ずれでPERFECT/GOOD)。葉は基本は左右交互だが、枯れた葉の段では同じ側が2回続く(その次の葉は1段先から薄く光り、枯れ葉は1拍前に揺れる)。光っていない側を押すと足を滑らせて一段落ちる。拍から外れた押し・同じ拍の二度押しはつまずき(登れない)。押さずに過ぎた拍はそのまま時間が減る
// 終わり: 8小節(32拍・約16.5秒)のうちに24段登って花に着けばCLEAR(余った拍がボーナス)。拍を使い切ったらGAME OVER
// @mechanic: camera_climb
// @theme: giant_flower_stem_ant_climb
// 世界観: 野原にそびえる巨大な花の茎で、アリの見張り役が左右に生えた葉を一段ずつ踏んで登り、花の先から遠くを見張るために拍に乗って上を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・登った段数・PERFECT/GOOD数・滑った回数・最大コンボ
// スタイル: 8bit HANDHELD

(function (game) {
  var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f', '#8bac0f'], accent: ['#0f380f', '#9bbc0f'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの4階調だけ。残像(少し遅れて追う薄い像)・低コントラスト・画面枠
  var G3 = STYLE.bg[0], G2 = STYLE.bg[1], G1 = STYLE.main[0], G0 = STYLE.main[1];

  var TITLE = 'STEM CLIMB';
  var BPM = 116;
  var SPB = 60 / BPM;             // 1拍 約0.517秒(表拍のみ)
  var LEAD = 0.06;
  var BARS = 8;
  var TOTAL_BEATS = BARS * 4;
  var TIME_LIMIT = 17;            // 32拍 = 16.6秒。放置でも READY 0.8 + 16.6 + 余韻 1.6 = 19秒で終わる
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var SLIP_STOP = 0.38, TRIP_STOP = 0.3;
  var STEP = 170;
  var BASE_Y = 1250;
  var ANT_SCREEN_Y = 1080;
  var LCD_X0 = 36, LCD_X1 = W - 36, LCD_Y0 = 36, LCD_Y1 = Math.round(H * 0.75);
  var BTN_Y = Math.round(H * 0.88), BTN_LX = 270, BTN_RX = 810, BTN_R = 140;

  // 葉の並び(L/R)。前半は交互、後半は枯れ葉の段で同じ側が続く
  var SIDES = 'LRLRLRLLRLRRLRLLRLRRLLRL';
  var DEMO_SIDES = 'LRLLRLRL';
  var DEMO_TRAP = 3;               // デモはこの段で「いつもの交互」を押して滑る

  // 伴奏(オリジナル): 表拍のベースと8分の行進。拍の頭がはっきり聞こえる
  var MEL = [
    ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'D5'],
    ['C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5'],
    ['E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'G5'],
    ['D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5'],
    ['C5', 'E5', 'G5', 'C6', 'A5', 'G5', 'A5', 'C6'],
    ['D6', 'C6', 'A5', 'G5', 'A5', 'G5', 'E5', 'D5'],
    ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5'],
    ['C6', 'A5', 'G5', 'E5', 'D5', 'E5', 'C5', 'C5']
  ];
  var BASS = [['C3', 'G2'], ['A2', 'E2'], ['F2', 'C3'], ['G2', 'D3'], ['C3', 'G2'], ['A2', 'E2'], ['F2', 'C3'], ['G2', 'C3']];

  // ---- スプライト(4階調) ----
  var ANT_A = ['..a.....a..', '...a...a...', '....hhh....', '...hhhhh...', '.l..hhh..l.', '..l.ttt.l..', 'l..ttttt...', '.l.ttttt.l.', '....ttt...l', '..l.bbb.l..', '.l.bbbbb...', '...bbbbb..l', '....bbb....'];
  var ANT_B = ['.a.......a.', '..a.....a..', '....hhh....', '...hhhhh...', '..l.hhh.l..', '.l..ttt..l.', '...ttttt..l', '.l.ttttt.l.', 'l...ttt....', '...lbbbl...', '..lbbbbbl..', '.l.bbbbb.l.', '....bbb....'];
  var ANT_SLIP = ['a.........a', '.a.......a.', '..l.hhh.l..', '.l.hhhhh.l.', 'l...hhh...l', '....ttt....', '...ttttt...', 'l..ttttt..l', '.l..ttt..l.', '..l.bbb.l..', '...bbbbb...', '...bbbbb...', '....bbb....'];
  var ANT_PAL = { a: G1, h: G0, t: G0, b: G0, l: G1 };
  var ANT_WHITE = { a: G3, h: G3, t: G3, b: G3, l: G3 };
  var LEAF = ['......vvvv....', '...vvvvvvvvvv.', '.vvvvmmmmmmmmm', '..vvvvvvvvvvv.', '....vvvvvvv...'];
  var LEAF_DEAD = ['..........d...', '.......dd.d...', '....dd...dddd.', '...d..........', '..d...........'];
  var FLAG = ['fff.', 'ffff', 'fff.', 'p...', 'p...', 'p...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, sides, running, songT, beatN, schedBar, readyT, beatPulse;
  var cur, used, passBeat, camY, ghostCam, hopT, hopFrom, stopT, stopKind, badPending, judgeW, judgeT, btnL, btnR, ghostAnt;
  var score, perfects, goods, slips, trips, idle, combo, maxCombo, over, won, outroT, prevBest, milestone, creakFor;

  function leafY(i) { return BASE_Y - i * STEP; }
  function sideOf(i) { return i >= 1 && i <= sides.length ? sides.charAt(i - 1) : ''; }
  function antPos(i) {
    if (i <= 0) return { x: 540, y: BASE_Y + 40 };
    return { x: sideOf(i) === 'L' ? 410 : 670, y: leafY(i) - 58 };
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    sides = demoMode ? DEMO_SIDES : SIDES;
    running = false; songT = 0; beatN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0;
    cur = 0; used = {}; passBeat = 1;
    camY = BASE_Y - ANT_SCREEN_Y; ghostCam = camY;
    hopT = 0; hopFrom = antPos(0);
    stopT = 0; stopKind = ''; badPending = false; judgeW = ''; judgeT = 0; btnL = 0; btnR = 0;
    ghostAnt = { x: 540, y: antPos(0).y - camY };
    score = 0; perfects = 0; goods = 0; slips = 0; trips = 0; idle = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = 0; creakFor = -1;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function playBar(n) {
    if (demoMode) return;
    var m = MEL[n % MEL.length], b = BASS[n % BASS.length], mel = [], bass = [];
    for (var i = 0; i < 8; i++) mel.push([m[i], 0.5]);
    for (var j = 0; j < 4; j++) bass.push([b[j % 2], 1]);
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.035, bass: bass, bassWave: 'triangle', bassVolume: 0.1 });
  }

  // ---- 拍クロック(1本だけ)。ヒットストップ中も止めない ----
  function onBeat(b) {
    beatPulse = 1;
    sfx(b % 4 === 0 ? 1760 : 1320, 0.02, { wave: 'square', volume: b % 4 === 0 ? 0.03 : 0.018 });
    // 枯れ葉の段の予告: 次に踏む葉が「同じ側の2回目」なら、反対側の枯れ葉が1拍前に揺れてきしむ
    if (cur < sides.length && sideOf(cur + 2) === sideOf(cur + 1) && creakFor !== cur + 2 && cur + 2 <= sides.length) {
      creakFor = cur + 2;
      sfx(196, 0.12, { wave: 'sawtooth', volume: 0.03, slide: -40 });
    }
  }

  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < BARS && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
  }

  function say(word, x, y, size) {
    judgeW = word; judgeT = 0.45;
    if (demoMode) game.fx.popup(word, x, y, { color: G0, size: size || 54 });
  }

  // ---- 踏む ----
  function stepSide(side) {
    if (!running || over) return 'none';
    if (side === 'L') btnL = 0.14; else btnR = 0.14;
    if (stopT > 0) return 'busy';
    var k = Math.round(songT / SPB);
    if (k < 0 || k >= TOTAL_BEATS) return 'none';
    var off = songT - k * SPB;
    var p = antPos(cur);
    if (used[k] || Math.abs(off) > GOOD_W) {
      used[k] = true;
      trips++; combo = 0;
      stopT = TRIP_STOP; stopKind = 'trip'; badPending = true;
      say('MISS', p.x, p.y - camY - 150);
      sfx(220, 0.08, { wave: 'square', volume: 0.05, slide: -60 });
      return 'trip';
    }
    used[k] = true;
    if (side !== sideOf(cur + 1)) {
      slips++; combo = 0;
      hopFrom = { x: p.x, y: p.y }; hopT = 0.2;
      cur = Math.max(0, cur - 1);
      stopT = SLIP_STOP; stopKind = 'slip'; badPending = true;
      say('MISS', p.x, p.y - camY - 150);
      sfx(330, 0.22, { wave: 'square', volume: 0.07, slide: -260 });
      game.fx.flash(G3, 0.08);
      return 'slip';
    }
    var perfect = Math.abs(off) <= PERFECT_W;
    hopFrom = { x: p.x, y: p.y }; hopT = 0.16;
    cur++;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    score += perfect ? 100 + combo * 10 : 50 + combo * 5;
    var np = antPos(cur);
    say(perfect ? 'PERFECT' : 'GOOD', np.x, np.y - camY - 150);
    sfx(perfect ? 1047 : 784, 0.07, { wave: 'square', volume: 0.06, slide: 120 });
    game.fx.burst(np.x, np.y - camY + 40, { color: G1, count: perfect ? 10 : 6, speed: 220 });
    if (!demoMode) game.feedback.good(np.x, np.y - camY, { text: null, color: G0, count: 4, volume: 0.12 });
    if (cur === 12 && milestone < 12) {
      milestone = 12;
      if (!demoMode) game.audio.play('se_milestone', 0.4);
      game.fx.popup('12 / ' + sides.length, W / 2, 560, { color: G0, size: 72 });
    }
    if (!demoMode && cur >= sides.length) finish(true);
    return perfect ? 'perfect' : 'good';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (ok) {
      var spare = Math.max(0, TOTAL_BEATS - Math.ceil(songT / SPB));
      score += 300 + spare * 40;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 900), { color: i % 2 ? G0 : G1, count: 16, speed: 380 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (!running) return;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (hopT > 0) hopT = Math.max(0, hopT - dt);
    if (judgeT > 0) judgeT -= dt;
    if (btnL > 0) btnL -= dt;
    if (btnR > 0) btnR -= dt;
    // 押さずに過ぎた拍
    while (passBeat < TOTAL_BEATS && songT > passBeat * SPB + GOOD_W) {
      if (!used[passBeat] && cur < sides.length) { idle++; combo = 0; }
      passBeat++;
    }
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0 && badPending) {
        badPending = false;
        var p = antPos(cur);
        if (!demoMode) game.feedback.bad(p.x, p.y - camY, { text: null, shake: stopKind === 'slip' ? 9 : 5 });
        else game.fx.shake(5, 0.15);
      }
    }
    // カメラ: 見張りアリを画面の下寄りに保って上へ追う(残像用の遅れカメラも)
    var goal = antPos(cur).y - ANT_SCREEN_Y;
    if (cur >= sides.length) goal = leafY(sides.length) - 860;
    camY += (goal - camY) * Math.min(1, dt * 7);
    ghostCam += (camY - ghostCam) * Math.min(1, dt * 9);
    if (!demoMode && !over && songT >= TOTAL_BEATS * SPB - 0.15) finish(false);
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(false);
  }

  // ---- 描画 ----
  function txt(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: G2, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawSky() {
    game.draw.rect(0, 0, W, H, G3);
    // 低い位置ほど市松のディザで濃くなる(遠い草むら)
    var band = Math.max(LCD_Y0, Math.round(1250 - camY * 0.2));
    for (var row = 0, y = band; y < LCD_Y1; y += 16, row++) {
      for (var x = LCD_X0 + (row % 2) * 16; x < LCD_X1; x += 32) game.draw.rect(x, y, 16, 16, G2);
    }
    // 雲(視差 0.3)
    for (var c = 0; c < 4; c++) {
      var cy = ((c * 420 - camY * 0.3) % 1600 + 1600) % 1600 - 100;
      var cx = 150 + (c * 337) % 760;
      game.draw.rect(cx, cy, 180, 40, G2);
      game.draw.rect(cx + 30, cy - 26, 110, 30, G2);
    }
    // 遠くの草の葉(視差 0.5)
    for (var g = 0; g < 7; g++) {
      var gx = 80 + g * 150, top = 900 - (g % 3) * 160 - camY * 0.5;
      game.draw.line(gx, top, gx + 30, LCD_Y1, G2, 10);
    }
  }

  function drawFlower(cam, alpha) {
    var fy = leafY(sides.length) - 300 - cam;
    if (fy < -400 || fy > LCD_Y1 + 300) return;
    for (var p = 0; p < 8; p++) {
      var a = p / 8 * Math.PI * 2 + Math.sin(game.time.elapsed) * 0.05;
      game.draw.circle(540 + Math.cos(a) * 160, fy + Math.sin(a) * 90, 92, G2, alpha);
      game.draw.circle(540 + Math.cos(a) * 160, fy + Math.sin(a) * 90, 70, G3, alpha);
    }
    game.draw.circle(540, fy, 96, G1, alpha);
    for (var d = 0; d < 10; d++) game.draw.rect(540 - 60 + (d * 37) % 120, fy - 50 + (d * 53) % 100, 12, 12, G0, alpha);
  }

  function drawStem(cam, alpha) {
    var top = leafY(sides.length) - 260 - cam;
    game.draw.rect(518, Math.max(LCD_Y0, top), 44, LCD_Y1 - Math.max(LCD_Y0, top), G1, alpha);
    game.draw.rect(518, Math.max(LCD_Y0, top), 6, LCD_Y1 - Math.max(LCD_Y0, top), G0, alpha);
    game.draw.rect(556, Math.max(LCD_Y0, top), 6, LCD_Y1 - Math.max(LCD_Y0, top), G0, alpha);
    var ground = BASE_Y + 90 - cam;
    if (ground < LCD_Y1) game.draw.rect(LCD_X0, ground, LCD_X1 - LCD_X0, LCD_Y1 - ground, G1, alpha);
  }

  function drawLeaves(cam, alpha, live) {
    var t = game.time.elapsed;
    for (var i = 1; i <= sides.length; i++) {
      var y = leafY(i) - cam;
      if (y < LCD_Y0 - 60 || y > LCD_Y1 + 60) continue;
      var s = sideOf(i);
      var x = s === 'L' ? 540 - 104 : 540 + 104;
      var pal = { v: G2, m: G1 };
      if (live && i === cur + 1) {
        var on = beatPulse > 0.35 || Math.floor(t * 6) % 2 === 0;
        pal = on ? { v: G0, m: G3 } : { v: G1, m: G3 };
      } else if (live && i === cur + 2) {
        pal = { v: G1, m: G2 };
      } else if (i <= cur) {
        pal = { v: G2, m: G2 };
      }
      game.draw.sprite(LEAF, pal, x, y, 14, { anchor: 'center', flipX: s === 'R', alpha: alpha });
      // 枯れ葉: 交互なら葉があるはずの反対側
      if (i >= 2 && sideOf(i) === sideOf(i - 1)) {
        var dx = s === 'L' ? 540 + 104 : 540 - 104;
        var shake = live && creakFor === i && i > cur ? Math.sin(t * 40) * 6 : 0;
        game.draw.sprite(LEAF_DEAD, { d: G1 }, dx + shake, y + 4, 14, { anchor: 'center', flipX: s === 'L', alpha: alpha });
      }
    }
  }

  function antScreen() {
    var p = antPos(cur);
    if (hopT > 0) {
      var k = 1 - hopT / 0.16;
      k = Math.max(0, Math.min(1, k));
      return { x: hopFrom.x + (p.x - hopFrom.x) * k, y: hopFrom.y + (p.y - hopFrom.y) * k - Math.sin(Math.PI * k) * 50 - camY };
    }
    return { x: p.x, y: p.y - camY };
  }

  function drawAnt() {
    var a = antScreen();
    ghostAnt.x += (a.x - ghostAnt.x) * 0.35; ghostAnt.y += (a.y - ghostAnt.y) * 0.35;
    var frame = stopKind === 'slip' && stopT > 0 ? ANT_SLIP : (Math.floor(songT / SPB) % 2 ? ANT_B : ANT_A);
    game.draw.sprite(frame, ANT_PAL, ghostAnt.x, ghostAnt.y, 11, { anchor: 'center', alpha: 0.3 });
    var white = stopT > 0;
    game.draw.sprite(frame, white ? ANT_WHITE : ANT_PAL, a.x, a.y, white ? 13 : 11, { anchor: 'center' });
    if (white) game.draw.circle(a.x, a.y, 70, G0, 0.25);
    game.draw.sprite(FLAG, { f: G1, p: G0 }, a.x + 62, a.y - 50, 9, { anchor: 'center' });
  }

  function drawDevice() {
    // LCDの外側を本体の色で覆って画面枠にする
    game.draw.rect(0, 0, W, LCD_Y0, G1);
    game.draw.rect(0, 0, LCD_X0, LCD_Y1, G1);
    game.draw.rect(LCD_X1, 0, W - LCD_X1, LCD_Y1, G1);
    game.draw.gradient(LCD_Y1, H, [[0, G1], [1, G0]]);
    game.draw.rect(LCD_X0 - 8, LCD_Y0 - 8, LCD_X1 - LCD_X0 + 16, 8, G0);
    game.draw.rect(LCD_X0 - 8, LCD_Y1, LCD_X1 - LCD_X0 + 16, 8, G0);
    game.draw.rect(LCD_X0 - 8, LCD_Y0, 8, LCD_Y1 - LCD_Y0, G0);
    game.draw.rect(LCD_X1, LCD_Y0, 8, LCD_Y1 - LCD_Y0, G0);
    // 拍ランプ(電源ランプの位置)
    game.draw.circle(90, LCD_Y1 + 60, 14, beatPulse > 0.3 ? G3 : G2);
    // 左右の足ボタン
    var bs = [[BTN_LX, btnL], [BTN_RX, btnR]];
    for (var i = 0; i < 2; i++) {
      var bx = bs[i][0], down = bs[i][1] > 0;
      game.draw.circle(bx, BTN_Y + 10, BTN_R, G0);
      game.draw.circle(bx, BTN_Y + (down ? 8 : 0), BTN_R - 12, down ? G1 : G2);
      game.draw.circle(bx - 40, BTN_Y - 44 + (down ? 8 : 0), 26, G3, down ? 0.2 : 0.5);
      game.draw.sprite(['..f..', '.fff.', 'fffff', '..f..', '..f..'], { f: G0 }, bx, BTN_Y + (down ? 8 : 0), 14, { anchor: 'center', flipX: i === 1 });
    }
    // スピーカー穴
    for (var s = 0; s < 5; s++) game.draw.line(840 + s * 34, LCD_Y1 + 40, 800 + s * 34, LCD_Y1 + 110, G0, 6);
  }

  function drawLcdHud() {
    game.draw.rect(LCD_X0, LCD_Y0, LCD_X1 - LCD_X0, 194, G3);
    game.draw.rect(LCD_X0, LCD_Y0 + 190, LCD_X1 - LCD_X0, 6, G1);
  }

  function drawScene() {
    drawSky();
    drawStem(ghostCam, 0.3);
    drawLeaves(ghostCam, 0.3, false);
    drawFlower(camY, 1);
    drawStem(camY, 1);
    drawLeaves(camY, 1, true);
    drawAnt();
    // ドット格子(液晶の粒)
    for (var y = LCD_Y0; y < LCD_Y1; y += 12) game.draw.rect(LCD_X0, y, LCD_X1 - LCD_X0, 1, G2, 0.25);
    if (judgeT > 0) txt(judgeW, W / 2, 330, 64, G0);
  }

  function drawHud(showPlay) {
    drawLcdHud();
    if (showPlay) {
      txt('SCORE ' + score, 70, 100, 48, G0, 'left');
      txt('BEST ' + prevBest, 70, 160, 30, G1, 'left');
      txt(cur + ' / ' + sides.length, W - 70, 100, 48, G0, 'right');
      var left = Math.max(0, TOTAL_BEATS - Math.max(0, Math.floor(songT / SPB)));
      for (var i = 0; i < TOTAL_BEATS; i++) game.draw.rect(W - 70 - (TOTAL_BEATS - i) * 13, 150, 9, 22, i < left ? G0 : G2);
    }
    // 右端の高さ計
    var x = LCD_X1 - 30, y0 = LCD_Y1 - 60, y1 = 300;
    game.draw.rect(x - 4, y1, 8, y0 - y1, G1);
    var py = y0 - (y0 - y1) * (cur / sides.length);
    game.draw.rect(x - 14, py - 8, 28, 16, G0);
    game.draw.circle(x, y1, 14, G1);
  }

  // ---- ATTRACT: 実ロジックで拍ごとに光る葉を踏む。枯れ葉の段で交互に押して滑る ----
  var demo = { t: 0, hx: BTN_LX, press: 0, trapped: false, lastK: -1 };
  var DEMO_LEN = 11 * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.trapped = false; demo.lastK = 0; demo.press = 0; }
    var k = Math.round(songT / SPB);
    var side = sideOf(cur + 1);
    if (cur === DEMO_TRAP && !demo.trapped) side = sideOf(cur) === 'L' ? 'R' : 'L';
    var goalX = side === 'L' ? BTN_LX : BTN_RX;
    demo.hx += (goalX - demo.hx) * Math.min(1, dt * 12);
    if (k >= 1 && k > demo.lastK && songT >= k * SPB + 0.01 && cur < sides.length && stopT <= 0) {
      demo.lastK = k;
      var r = stepSide(side);
      if (r === 'slip') demo.trapped = true;
      demo.press = 0.15;
    }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var r = stepSide(x < W / 2 ? 'L' : 'R');
    if (r === 'busy') game.audio.tone(140, 0.04, { wave: 'square', volume: 0.03 });
    else if (r === 'none') game.fx.burst(x, y, { color: G1, count: 3, speed: 80 });
  });
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      drawHud(false);
      drawDevice();
      game.draw.hand(demo.hx, BTN_Y + 20, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, 112, 80 + Math.sin(t * 3) * 3, G0);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, G1);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.7, 50, G0);
      else txt('TAP TO START', W / 2, H * 0.7, 46, G1);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud(false);
      drawDevice();
      game.draw.rect(90, H * 0.22, W - 180, H * 0.4, G0);
      game.draw.rect(104, H * 0.22 + 14, W - 208, H * 0.4 - 28, G3);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, G0);
      txt('SCORE ' + score, W / 2, H * 0.34, 58, G0);
      txt(cur + ' / ' + sides.length, W / 2, H * 0.39, 52, G1);
      txt('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + (slips + trips), W / 2, H * 0.435, 32, G0);
      txt(maxCombo + ' COMBO', W / 2, H * 0.475, 36, G1);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.525, 52, G0);
      else txt('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.525, 40, G1);
      if (!won) txt('あと' + Math.max(1, sides.length - cur) + '段', W / 2, H * 0.575, 50, G0);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.67, 36, G0);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      stepClock(dt);
      if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
      if (hopT > 0) hopT = Math.max(0, hopT - dt);
      if (won) { camY += (leafY(sides.length) - 860 - camY) * Math.min(1, dt * 5); ghostCam = camY; }
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, height: cur, total: sides.length, perfect: perfects, good: goods, slips: slips, trips: trips, idleBeats: idle, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = 0; beatN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud(true);
    drawDevice();
    if (readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, G0);
    if (over) txt(won ? 'FINISH' : 'TIME UP', W / 2, H * 0.42, 100, G0);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
