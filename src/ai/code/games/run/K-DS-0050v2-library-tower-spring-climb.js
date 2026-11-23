// K-DS-0050v2-library-tower-spring-climb.js
// 図書塔のばね靴のぼり — 弾む拍の頂点ごとに次の棚がある列を押して一段上へ踏み込み、段ごとに速まる拍に乗って天窓の閲覧台まで登る
// 操作: 下画面の3つの列パッド(画面の左/中/右の3等分ならどこを押しても同じ)。司書見習いはばね靴で拍ごとに弾み、拍の頭で頂点に来る。次に踏む棚(白縁で明滅し、その列のパッドも光る)がある列を拍の頭に押すと一段上の棚へ踏み込む(ずれでPERFECT/GOOD)。違う列を押すと空を踏んで一段下の棚へ落ちる。拍から外れた押し・同じ拍の二度押しはつまずき(登れない)。押さずに過ぎた拍は弾むだけで時間が減る。その次の棚も薄く光って先読みできる。速さが上がる小節の頭から下画面に次の速さの数字が点滅し、3拍目・4拍目にチャイムが鳴って予告
// 終わり: 前奏1小節+9小節(100→120→140BPM・各3小節・36拍・約20.7秒)のうちに28段登って天窓の棚に着けばCLEAR(余った拍がボーナス)。拍を使い切ったらTIME UPでGAME OVER
// @mechanic: camera_climb
// @theme: library_tower_spring_shoe_climb
// 世界観: 天井まで本棚が続く円い図書塔で、ばね靴をはいた司書見習いが返却本を頭に積んで弾み、拍の頂点ごとに上の棚へ跳び移って一冊ずつ本を返しながら天窓の閲覧台を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・登った段数・PERFECT/GOOD数・落ちた回数・最大コンボ
// スタイル: 2000s HANDHELD PASTEL

(function (game) {
  var STYLE = { bg: ['#fff4fa', '#dcecff'], main: ['#ffb6d2', '#9fd4ff', '#ffe89a'], accent: ['#ffffff', '#7a5c9e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステルの面に白縁の丸い形。上画面=塔(遊び)、下画面=タッチパネル(列パッドと拍の計器)
  var C = {
    white: STYLE.accent[0], ink: STYLE.accent[1], inkSoft: '#a898c8',
    pink: STYLE.main[0], pinkD: '#f07aa8', blue: STYLE.main[1], blueD: '#5aa8e6',
    yel: STYLE.main[2], yelD: '#f0b840', mint: '#b4f0d4', mintD: '#4cc090', lav: '#e2d6ff',
    wood: '#f2d6b8', woodD: '#d8a880', wall: '#fbeef4', shell: '#f4f0fa', peach: '#ffd2b8'
  };
  var BOOK_COLS = ['#ffb6d2', '#9fd4ff', '#ffe89a', '#b4f0d4', '#d8c8ff', '#ffc8a8'];

  var TITLE = 'SPRING STACKS';
  var STAGE_BPM = [100, 120, 140];
  var PLAY_BARS = [100, 100, 100, 100, 120, 120, 120, 140, 140, 140]; // 前奏1小節 + 3段×3小節
  var DEMO_BARS = [100, 100, 120, 120];
  var TIME_LIMIT = 21;            // 2.4 + 7.2 + 6.0 + 5.14 = 20.74秒。放置でも READY 0.8 + 20.8 + 余韻 1.7 ≒ 23.3秒で終わる
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var TRIP_STOP = 0.32, FALL_STOP = 0.42, HOP = 0.14, DROP = 0.24;
  var STEP = 200, BOUNCE = 200;   // 頂点の高さ = 一段の高さ。頂点で押すと次の棚の高さにいる
  var COL_X = [270, 540, 810];
  var PAD_X = [190, 540, 890];
  var LEDGE_W = 230;
  var TOP_Y1 = Math.round(H * 0.58);   // 上画面の下端
  var BOT_Y0 = Math.round(H * 0.62);   // 下画面の上端
  var INFO_Y = Math.round(H * 0.69);   // 計器の段
  var PAD_Y = Math.round(H * 0.87);    // 列パッドの中心
  var PAD_W = 290, PAD_H = 220;
  var CUR_SY = 900;                    // 今いる棚の画面Y
  var JUDGE_Y = Math.round(H * 0.17);  // 判定文字の高さ

  // 棚の並び(L/C/R)。序盤は隣の列、後半は左右の端から端へ跳ぶ
  var LEDGES = 'CLCRCLLCRRCLRCCLRRCLRLCRLLCR';
  var DEMO_LEDGES = 'CLRRCLRCLR';
  var DEMO_TRAP = 3;                   // デモはこの段で1回だけ違う列を押して落ちる

  // 伴奏(オリジナル): 8分の三角波のメロディ + 4分のベース。段ごとに調が上がる
  var MEL = [
    [['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'G5'], ['F5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5', 'E5'], ['C5', 'E5', 'G5', 'C6', 'B5', 'G5', 'A5', 'B5']],
    [['D5', 'F#5', 'A5', 'F#5', 'B5', 'A5', 'F#5', 'A5'], ['G5', 'B5', 'D6', 'B5', 'A5', 'F#5', 'E5', 'F#5'], ['D5', 'F#5', 'A5', 'D6', 'C#6', 'A5', 'B5', 'C#6']],
    [['E5', 'G#5', 'B5', 'G#5', 'C#6', 'B5', 'G#5', 'B5'], ['A5', 'C#6', 'E6', 'C#6', 'B5', 'G#5', 'F#5', 'G#5'], ['E5', 'G#5', 'B5', 'E6', 'D#6', 'B5', 'C#6', 'E6']]
  ];
  var BASS = [
    [['C3', 'G2', 'C3', 'G2'], ['F2', 'C3', 'F2', 'C3'], ['C3', 'G2', 'G2', 'B2']],
    [['D3', 'A2', 'D3', 'A2'], ['G2', 'D3', 'G2', 'D3'], ['D3', 'A2', 'A2', 'C#3']],
    [['E3', 'B2', 'E3', 'B2'], ['A2', 'E3', 'A2', 'E3'], ['E3', 'B2', 'B2', 'E3']]
  ];

  // ---- スプライト(白縁はシルエットを4方向にずらして先に描く) ----
  var LIB_UP = [
    '....pppp....', '..pppppppp..', '..hhhhhhhh..', '.hhsssssshh.', '.hskssssksh.', '.hscsssscsh.', '..hssmmssh..',
    's.dddddddd.s', 'sddaaaaaadds', '.ddaaaaaadd.', '..ddaaaadd..', '..dddddddd..', '...l....l...', '...l....l...', '..bb....bb..'
  ];
  var LIB_SQUASH = [
    '....pppp....', '..pppppppp..', '..hhhhhhhh..', '.hhsssssshh.', '.hskssssksh.', '.hscsssscsh.', '..hssmmssh..',
    '..dddddddd..', 'sddaaaaaadds', 'sddaaaaaadds', '.dddddddddd.', '..l......l..', '.bb......bb.'
  ];
  var LIB_FALL = [
    '.pppp.......', 'pppppp......', '..hhhhhhhh..', '.hhsssssshh.', '.hskssssksh.', '.hskssssksh.', '..hsskkssh..',
    's..dddddd..s', 's.ddaaaadd.s', '..ddaaaadd..', '..dddddddd..', '.l........l.', 'bb........bb'
  ];
  var PAL = { p: C.pinkD, h: '#a07cc8', s: '#ffe4d2', k: C.ink, c: '#ff9ab8', m: '#e0607a', d: C.blue, a: C.white, l: C.ink, b: C.pinkD };
  var PAL_RIM = { p: C.white, h: C.white, s: C.white, k: C.white, c: C.white, m: C.white, d: C.white, a: C.white, l: C.white, b: C.white };
  var PAL_HIT = { p: C.white, h: C.white, s: C.white, k: C.pink, c: C.white, m: C.pink, d: C.white, a: C.white, l: C.pink, b: C.white };
  var ARROW = ['..w..', '.www.', 'wwwww', '..w..', '..w..'];
  var STAR = ['...y...', '...y...', '.yyyyy.', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, cols, N, beatAt, barAt, barBpm, totalBeats, stepFrom;
  var running, songT, beatN, schedBar, readyT, beatPulse;
  var cur, used, passBeat, camY, hopT, hopFromX, hopFromY, standUntil, stepAt;
  var stopT, stopKind, frozen, dropT, dropFrom;
  var judgeW, judgeT, padT, announce, stageFlash, curBpm;
  var score, perfects, goods, falls, trips, idle, combo, maxCombo, over, won, outroT, prevBest, milestone;

  function colOf(ch) { return ch === 'L' ? 0 : ch === 'R' ? 2 : 1; }
  function ledgeY(i) { return -i * STEP; }
  function hash(n) { var s = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); }

  function buildClock(bars) {
    beatAt = []; barAt = []; barBpm = [];
    var t = 0;
    for (var b = 0; b < bars.length; b++) {
      barAt.push(t); barBpm.push(bars[b]);
      for (var i = 0; i < 4; i++) { beatAt.push(t); t += 60 / bars[b]; }
    }
    beatAt.push(t);
    totalBeats = bars.length * 4;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = demoMode ? DEMO_LEDGES : LEDGES;
    cols = [1];
    for (var i = 0; i < src.length; i++) cols.push(colOf(src.charAt(i)));
    N = src.length;
    buildClock(demoMode ? DEMO_BARS : PLAY_BARS);
    stepFrom = demoMode ? 1 : 4;
    running = false; songT = 0; beatN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0;
    cur = 0; used = {}; passBeat = stepFrom;
    camY = ledgeY(0) - CUR_SY;
    hopT = 0; hopFromX = COL_X[1]; hopFromY = 0; standUntil = -9; stepAt = -9;
    stopT = 0; stopKind = ''; frozen = null; dropT = 0; dropFrom = null;
    judgeW = ''; judgeT = 0; padT = [0, 0, 0]; announce = 0; stageFlash = 0; curBpm = barBpm[0];
    score = 0; perfects = 0; goods = 0; falls = 0; trips = 0; idle = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function playBar(b) {
    if (demoMode || over) return;
    var bpm = barBpm[b];
    var stage = Math.max(0, STAGE_BPM.indexOf(bpm));
    var mel = [], bass = [];
    if (b === 0) {
      mel = [['C6', 0.5], ['R', 1.5], ['G5', 0.5], ['R', 0.5], ['G5', 0.5], ['B5', 0.5]];
      bass = [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]];
    } else {
      var inStage = (b - 1) % 3;
      var m = MEL[stage][inStage], bs = BASS[stage][inStage];
      for (var i = 0; i < 8; i++) mel.push([m[i], 0.5]);
      for (var j = 0; j < 4; j++) bass.push([bs[j], 1]);
    }
    game.audio.melody(mel, { tempo: bpm, wave: 'triangle', volume: 0.08, bass: bass, bassWave: 'triangle', bassVolume: 0.12 });
  }

  // ---- 拍クロック(1本だけ。小節ごとにBPMが段階的に上がる)。ヒットストップ中も止めない ----
  function onBeat(k) {
    beatPulse = 1;
    var inBar = k % 4, bar = Math.floor(k / 4);
    sfx(inBar === 0 ? 1568 : 1175, 0.025, { wave: 'sine', volume: inBar === 0 ? 0.05 : 0.03 });
    if (inBar === 0) {
      if (bar > 0 && barBpm[bar] > barBpm[bar - 1]) {
        stageFlash = 1; announce = 0;
        if (!demoMode) game.audio.play('se_powerup', 0.4);
        game.fx.popup(String(barBpm[bar]), W / 2, 420, { color: C.pinkD, size: 110 });
      }
      curBpm = barBpm[bar];
      if (bar + 1 < barBpm.length && barBpm[bar + 1] > barBpm[bar]) announce = 1;
    }
    // 予告チャイム(次の小節で速くなる時だけ。3拍目と4拍目)
    if (bar + 1 < barBpm.length && barBpm[bar + 1] > barBpm[bar] && inBar >= 2) {
      sfx(inBar === 2 ? 1319 : 1760, 0.12, { wave: 'triangle', volume: 0.09 });
    }
  }

  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < barAt.length && songT >= barAt[schedBar] - LEAD) { playBar(schedBar); schedBar++; }
    while (beatN + 1 < totalBeats && songT >= beatAt[beatN + 1]) { beatN++; onBeat(beatN); }
  }

  function beatSpan(t) {
    var n = totalBeats;
    if (t < 0) { var s0 = 60 / barBpm[0]; var a0 = Math.floor(t / s0) * s0; return [a0, a0 + s0]; }
    if (t >= beatAt[n]) { var s1 = 60 / barBpm[barBpm.length - 1]; var a1 = beatAt[n] + Math.floor((t - beatAt[n]) / s1) * s1; return [a1, a1 + s1]; }
    var k = Math.max(0, Math.min(n - 1, beatN));
    while (k > 0 && t < beatAt[k]) k--;
    while (k + 1 < n && t >= beatAt[k + 1]) k++;
    return [beatAt[k], beatAt[k + 1]];
  }
  function nextLanding(t) {
    var sp = beatSpan(t), mid = (sp[0] + sp[1]) / 2;
    if (t < mid) return mid;
    var sp2 = beatSpan(sp[1] + 0.001);
    return (sp2[0] + sp2[1]) / 2;
  }
  function clockT() { return running ? songT : -Math.max(0, readyT); }
  // 弾みの高さ: 拍の頭で頂点、拍の裏で着地
  function bounceH() {
    var t = clockT();
    if (stepAt <= t && t < standUntil) return 0;
    var sp = beatSpan(t);
    var u = Math.max(0, Math.min(1, (t - sp[0]) / (sp[1] - sp[0])));
    var d = Math.min(u, 1 - u);
    return BOUNCE * (1 - 4 * d * d);
  }
  function nearestBeat() {
    var best = -1, bd = 99;
    for (var k = Math.max(0, beatN - 1); k <= Math.min(totalBeats - 1, beatN + 2); k++) {
      var d = Math.abs(songT - beatAt[k]);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  // 司書見習いの足元(ワールド座標)
  function herWorld() {
    if (stopT > 0 && frozen) return { x: frozen.x, y: frozen.y };
    var tx = COL_X[cols[cur]], ty = ledgeY(cur) - bounceH();
    if (dropT > 0 && dropFrom) {
      var k = 1 - dropT / DROP;
      return { x: dropFrom.x + (tx - dropFrom.x) * k, y: dropFrom.y + (ty - dropFrom.y) * k * k };
    }
    if (hopT > 0) {
      var q = 1 - hopT / HOP, e = 1 - (1 - q) * (1 - q);
      return { x: hopFromX + (tx - hopFromX) * e, y: hopFromY + (ty - hopFromY) * e - Math.sin(Math.PI * q) * 30 };
    }
    return { x: tx, y: ty };
  }

  function say(word) {
    judgeW = word; judgeT = 0.45;
    if (demoMode) game.fx.popup(word, W / 2, JUDGE_Y, { color: word === 'MISS' ? C.blueD : C.pinkD, size: 60 });
  }

  function startStop(kind, x, y) {
    stopKind = kind; stopT = kind === 'fall' ? FALL_STOP : TRIP_STOP;
    frozen = { x: x, y: y };
    if (kind === 'fall') game.fx.flash(C.white, 0.12);
  }

  // ---- 踏み込む ----
  function stepCol(col) {
    if (!running || over) return 'none';
    padT[col] = 0.15;
    if (stopT > 0 || dropT > 0) return 'busy';
    var k = nearestBeat();
    if (k < 0) return 'none';
    if (k < stepFrom) return 'free';
    var off = songT - beatAt[k];
    var p = herWorld();
    if (used[k] || Math.abs(off) > GOOD_W) {
      used[k] = true;
      trips++; combo = 0;
      startStop('trip', p.x, p.y);
      say('MISS');
      sfx(240, 0.09, { wave: 'square', volume: 0.05, slide: -80 });
      return 'trip';
    }
    used[k] = true;
    if (col !== cols[cur + 1]) {
      falls++; combo = 0;
      startStop('fall', COL_X[col], ledgeY(cur) - bounceH());
      say('MISS');
      sfx(660, 0.25, { wave: 'triangle', volume: 0.09, slide: -420 });
      return 'fall';
    }
    var perfect = Math.abs(off) <= PERFECT_W;
    hopFromX = p.x; hopFromY = p.y; hopT = HOP;
    cur++;
    stepAt = songT; standUntil = nextLanding(songT);
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    var mul = 1 + Math.max(0, STAGE_BPM.indexOf(barBpm[Math.floor(k / 4)])) * 0.5;
    score += Math.round((perfect ? 100 + combo * 10 : 50 + combo * 5) * mul);
    var sx = COL_X[cols[cur]], sy = ledgeY(cur) - camY;
    say(perfect ? 'PERFECT' : 'GOOD');
    game.fx.burst(sx, sy, { color: perfect ? C.yelD : C.blueD, count: perfect ? 12 : 7, speed: 260 });
    if (!demoMode) game.feedback.good(sx, sy - 160, { text: null, color: C.pinkD, count: 5, volume: 0.15 });
    sfx(perfect ? 1047 : 880, 0.07, { wave: 'triangle', volume: 0.1, slide: 160 });
    if (!milestone && cur >= Math.ceil(N / 2)) {
      milestone = true;
      if (!demoMode) game.audio.play('se_milestone', 0.4);
      game.fx.popup(cur + ' / ' + N, W / 2, 540, { color: C.pinkD, size: 84 });
    }
    if (!demoMode && cur >= N) finish(true);
    return perfect ? 'perfect' : 'good';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (ok) {
      var spare = Math.max(0, totalBeats - 1 - Math.max(0, beatN));
      score += 500 + spare * 60;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 900), { color: BOOK_COLS[i], count: 16, speed: 380 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (hopT > 0) hopT = Math.max(0, hopT - dt);
    if (judgeT > 0) judgeT -= dt;
    for (var i = 0; i < 3; i++) if (padT[i] > 0) padT[i] -= dt;
    if (stageFlash > 0) stageFlash = Math.max(0, stageFlash - dt * 1.5);
    if (!running) return;
    // 押さずに過ぎた拍
    while (passBeat < totalBeats && songT > beatAt[passBeat] + GOOD_W) {
      if (!used[passBeat] && cur < N && !over) { idle++; combo = 0; }
      passBeat++;
    }
    // ヒットストップ明け: 白く固まった後に feedback.bad、落ちる/着地し直す
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        stopT = 0;
        if (stopKind === 'fall') cur = Math.max(0, cur - 1);
        if (!demoMode) game.feedback.bad(frozen.x, frozen.y - camY - 80, { text: null, shake: stopKind === 'fall' ? 10 : 5 });
        else game.fx.shake(5, 0.15);
        dropFrom = { x: frozen.x, y: frozen.y }; dropT = DROP;
        stepAt = songT; standUntil = nextLanding(songT + DROP);
        frozen = null;
      }
    }
    if (dropT > 0) dropT = Math.max(0, dropT - dt);
    // カメラ: 今いる棚を画面の下寄りに保って上へ追う
    var goal = won ? ledgeY(N) - 1000 : ledgeY(cur) - CUR_SY;
    camY += (goal - camY) * Math.min(1, dt * 6);
    if (!demoMode && !over && songT > beatAt[totalBeats - 1] + GOOD_W + 0.05) finish(false);
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(false);
  }

  // ---- 描画ヘルパー ----
  function txt(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: a });
    game.draw.text(str, x - 2, y - 2, { size: sz, color: C.white, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function rrect(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - 2 * r, h, col, a);
    game.draw.rect(x, y + r, r, h - 2 * r, col, a);
    game.draw.rect(x + w - r, y + r, r, h - 2 * r, col, a);
    game.draw.circle(x + r, y + r, r, col, a);
    game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a);
    game.draw.circle(x + w - r, y + h - r, r, col, a);
  }
  function pill(x, y, w, h, col) {
    var r = h / 2;
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.circle(x + r, y + r, r, col);
    game.draw.circle(x + w - r, y + r, r, col);
  }
  function rimSprite(art, x, y, px) {
    var o = Math.max(4, px * 0.5);
    game.draw.sprite(art, PAL_RIM, x - o, y, px, { anchor: 'center' });
    game.draw.sprite(art, PAL_RIM, x + o, y, px, { anchor: 'center' });
    game.draw.sprite(art, PAL_RIM, x, y - o, px, { anchor: 'center' });
    game.draw.sprite(art, PAL_RIM, x, y + o, px, { anchor: 'center' });
  }

  // ---- 上画面: 塔の内側 ----
  function drawTower() {
    var prog = N > 0 ? cur / N : 0;
    game.draw.gradient(0, TOP_Y1, [[0, prog > 0.66 ? '#e8dcff' : prog > 0.33 ? '#ffe2ea' : '#e4f2ff'], [1, C.wall]]);
    // 奥の壁の本棚(視差 0.55)
    var par = camY * 0.55, rowH = 140;
    var r0 = Math.floor(par / rowH) - 1;
    for (var r = r0; r < r0 + 11; r++) {
      var y = r * rowH - par;
      if (y < -20 || y > TOP_Y1 + rowH) continue;
      if (((r % 6) + 6) % 6 === 2) {
        // 丸窓(白縁)
        var wx = ((r % 2) + 2) % 2 ? 300 : 780;
        game.draw.circle(wx, y - 60, 76, C.white, 0.9);
        game.draw.circle(wx, y - 60, 64, prog > 0.66 ? '#c8b4f0' : prog > 0.33 ? '#ffc8b0' : '#bfe2ff');
        game.draw.rect(wx - 3, y - 124, 6, 128, C.white, 0.9);
        game.draw.rect(wx - 64, y - 63, 128, 6, C.white, 0.9);
        continue;
      }
      game.draw.rect(30, y, W - 60, 14, C.woodD, 0.55);
      var x = 44, seed = r * 31;
      while (x < W - 60) {
        var bw = 24 + Math.floor(hash(seed++) * 22);
        var bh = 74 + Math.floor(hash(seed++) * 44);
        game.draw.rect(x, y - bh, bw - 5, bh, BOOK_COLS[Math.floor(hash(seed++) * BOOK_COLS.length)], 0.5);
        x += bw;
      }
    }
    // 円筒の壁の丸み(両端を濃く)
    game.draw.rect(0, 0, 40, TOP_Y1, C.lav, 0.9);
    game.draw.rect(W - 40, 0, 40, TOP_Y1, C.lav, 0.9);
    game.draw.rect(40, 0, 30, TOP_Y1, C.lav, 0.4);
    game.draw.rect(W - 70, 0, 30, TOP_Y1, C.lav, 0.4);
  }

  function drawSkylight() {
    var gy = ledgeY(N) - 420 - camY;
    if (gy < -260 || gy > TOP_Y1 + 200) return;
    var t = game.time.elapsed;
    game.draw.circle(W / 2, gy, 210, C.white, 0.95);
    game.draw.circle(W / 2, gy, 190, '#c8e4ff');
    game.draw.circle(W / 2, gy + 40, 150, '#ffe2f0', 0.8);
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2 + t * 0.4;
      game.draw.sprite(STAR, { y: C.yelD }, W / 2 + Math.cos(a) * 110, gy + Math.sin(a) * 110, 6, { anchor: 'center' });
    }
    game.draw.circle(W / 2, gy, 190 + Math.sin(t * 4) * 6, C.yel, 0.15);
  }

  function drawLedge(i, x, y, filled, isNext, isAfter) {
    var hw = LEDGE_W / 2;
    var blink = isNext && (beatPulse > 0.4 || Math.floor(game.time.elapsed * 6) % 2 === 0);
    if (isNext) game.draw.circle(x, y + 6, 150, C.white, blink ? 0.45 : 0.2);
    if (isAfter) game.draw.circle(x, y + 6, 120, C.white, 0.15);
    // 棚の奥の本(返却待ちの隙間が1冊ぶん)
    for (var b = 0; b < 6; b++) {
      var bx = x - hw + 16 + b * 34;
      if (b === 2 && !filled) continue;
      var bh = 54 + ((b + i) % 3) * 9;
      game.draw.rect(bx, y - bh, 26, bh, b === 2 ? C.pinkD : BOOK_COLS[(b + i) % BOOK_COLS.length]);
      game.draw.rect(bx + 4, y - bh + 10, 18, 5, C.white, 0.7);
    }
    pill(x - hw - 8, y - 8, LEDGE_W + 16, 42, C.white);
    pill(x - hw, y, LEDGE_W, 26, blink ? C.yel : isAfter ? C.lav : C.wood);
    game.draw.rect(x - hw + 14, y + 18, LEDGE_W - 28, 5, C.woodD, 0.6);
    if (isNext) game.draw.sprite(ARROW, { w: blink ? C.pinkD : C.white }, x, y - 110 + Math.sin(game.time.elapsed * 8) * 6, 9, { anchor: 'center' });
  }

  function drawLedges() {
    var t = game.time.elapsed;
    for (var i = 1; i <= N; i++) {
      var sy = ledgeY(i) - camY;
      if (sy < 120 || sy > TOP_Y1 + 60) continue;
      var isNext = !over && i === cur + 1, isAfter = !over && i === cur + 2;
      drawLedge(i, COL_X[cols[i]], sy + (isNext ? Math.sin(t * 8) * 4 : 0), i <= cur, isNext, isAfter);
    }
    var fy = ledgeY(0) - camY;
    if (fy < TOP_Y1) {
      game.draw.rect(0, fy, W, TOP_Y1 - fy, C.woodD);
      game.draw.rect(0, fy, W, 10, C.white, 0.8);
      for (var c = 0; c < 6; c++) game.draw.rect(60 + c * 170, fy + 26, 120, 10, C.wood);
    }
  }

  function drawSpring(x, y0, len) {
    var n = 4, seg = len / n;
    for (var i = 0; i < n; i++) {
      game.draw.line(x - 13, y0 + i * seg, x + 13, y0 + (i + 0.5) * seg, C.inkSoft, 7);
      game.draw.line(x + 13, y0 + (i + 0.5) * seg, x - 13, y0 + (i + 1) * seg, C.inkSoft, 7);
    }
  }

  function drawLibrarian() {
    var p = herWorld();
    var sx = p.x, feet = p.y - camY;
    var h = bounceH();
    var hit = stopT > 0;
    var t = clockT();
    var standing = !hit && ((stepAt <= t && t < standUntil) || h < 36);
    var coil = hit ? 46 : standing ? 22 : 30 + Math.min(1, h / BOUNCE) * 30;
    var art = hit ? LIB_FALL : standing ? LIB_SQUASH : LIB_UP;
    var px = hit ? 12 : 10;
    var sh = art.length * px;
    var cy = feet - coil - sh / 2;
    // 足元の影(棚の上)
    var ly = ledgeY(cur) - camY;
    if (!hit && dropT <= 0) game.draw.circle(sx, ly + 4, Math.max(18, 46 - h * 0.12), C.ink, 0.15);
    drawSpring(sx - 26, feet - coil, coil);
    drawSpring(sx + 26, feet - coil, coil);
    rimSprite(art, sx, cy, px);
    game.draw.sprite(art, hit ? PAL_HIT : PAL, sx, cy, px, { anchor: 'center' });
    if (hit) game.draw.circle(sx, cy, 110, C.white, 0.3);
    // 頭の返却本の山(残りの冊数ぶん・最大6冊)
    var top = cy - sh / 2;
    var left = Math.min(6, N - cur);
    for (var i = 0; i < left; i++) {
      var bx = sx - 36 + ((i % 2) ? 6 : -2);
      game.draw.rect(bx - 3, top - (i + 1) * 17 - 3, 78, 18, C.white);
      game.draw.rect(bx, top - (i + 1) * 17, 72, 13, BOOK_COLS[i % BOOK_COLS.length]);
    }
  }

  function drawTopHud(showPlay) {
    rrect(24, 20, W - 48, 176, 40, C.white, 0.92);
    rrect(36, 32, W - 72, 152, 32, C.lav, 0.55);
    if (!showPlay) return;
    txt('SCORE ' + score, 70, 82, 48, C.ink, 'left');
    txt('BEST ' + prevBest, 70, 142, 30, C.inkSoft, 'left');
    txt(cur + ' / ' + N, W - 70, 82, 52, C.pinkD, 'right');
    if (combo >= 2) txt(combo + ' COMBO', W - 70, 142, 30, C.blueD, 'right');
  }

  // ---- 下画面: タッチパネル(拍の計器 + 列パッド) ----
  function drawBottom(showPads) {
    var t = game.time.elapsed;
    // ちょうつがい
    game.draw.rect(0, TOP_Y1, W, BOT_Y0 - TOP_Y1, C.shell);
    game.draw.rect(0, TOP_Y1, W, 8, C.inkSoft, 0.35);
    rrect(70, TOP_Y1 + 22, 120, 34, 17, C.lav);
    rrect(W - 190, TOP_Y1 + 22, 120, 34, 17, C.lav);
    game.draw.gradient(BOT_Y0, H, [[0, '#eef6ff'], [1, '#ffeef6']]);
    rrect(16, BOT_Y0 + 8, W - 32, H - BOT_Y0 - 24, 36, C.white, 0.35);
    // メトロノーム(振り子は拍の頭で端に来る)
    var mx = 190, my = INFO_Y + 70;
    for (var r = 0; r < 6; r++) game.draw.rect(mx - 40 - r * 12, my - 150 + r * 26, 80 + r * 24, 26, r % 2 ? C.pink : '#ffc8dc');
    game.draw.rect(mx - 116, my + 6, 232, 20, C.pinkD);
    var sp = beatSpan(clockT());
    var u = Math.max(0, Math.min(1, (clockT() - sp[0]) / (sp[1] - sp[0])));
    var side = ((Math.max(0, beatN) % 2) === 0 ? 1 : -1);
    var th = 0.5 * side * Math.cos(Math.PI * u);
    var bx = mx + Math.sin(th) * 150, by = my - Math.cos(th) * 150;
    game.draw.line(mx, my, bx, by, C.ink, 8);
    game.draw.circle(bx, by + 30, 22, beatPulse > 0.4 ? C.yelD : C.ink);
    txt(String(curBpm), mx, my + 70, 44, C.ink);
    // 拍の点(4つ)
    for (var i = 0; i < 4; i++) {
      var on = running && beatN >= 0 && beatN % 4 === i;
      var rr = on ? 30 + beatPulse * 10 : 24;
      game.draw.circle(430 + i * 90, INFO_Y - 10, rr + 6, C.white);
      game.draw.circle(430 + i * 90, INFO_Y - 10, rr, on ? (i === 0 ? C.pinkD : C.yelD) : C.lav);
    }
    // 速さの段(100/120/140)。次の段は予告中に点滅
    var stIdx = Math.max(0, STAGE_BPM.indexOf(curBpm));
    for (var s = 0; s < STAGE_BPM.length; s++) {
      var blink = announce > 0 && s === stIdx + 1 && Math.floor(t * 8) % 2 === 0;
      var col = s === stIdx ? C.pinkD : blink ? C.yelD : C.lav;
      rrect(380 + s * 112, INFO_Y + 50, 100, 60, 30, C.white);
      rrect(386 + s * 112, INFO_Y + 56, 88, 48, 24, col);
      game.draw.text(String(STAGE_BPM[s]), 430 + s * 112, INFO_Y + 81, { size: 30, color: C.white, bold: true });
    }
    if (stageFlash > 0) game.draw.rect(0, BOT_Y0, W, H - BOT_Y0, C.yel, stageFlash * 0.25);
    // 塔の高さ計(右)
    var gx = 960, gy0 = INFO_Y + 110, gy1 = INFO_Y - 120;
    pill(gx - 22, gy1 - 10, 44, gy0 - gy1 + 20, C.white);
    game.draw.rect(gx - 12, gy1, 24, gy0 - gy1, C.lav);
    var fillH = (gy0 - gy1) * (N > 0 ? cur / N : 0);
    game.draw.rect(gx - 12, gy0 - fillH, 24, fillH, C.mintD);
    game.draw.sprite(STAR, { y: C.yelD }, gx, gy1 - 30, 7, { anchor: 'center' });
    game.draw.circle(gx, gy0 - fillH, 16, C.pinkD);
    if (!showPads) return;
    // 列パッド
    var nextCol = !over && cur < N ? cols[cur + 1] : -1;
    for (var c = 0; c < 3; c++) {
      var down = padT[c] > 0;
      var lit = c === nextCol && running && (beatPulse > 0.4 || Math.floor(t * 6) % 2 === 0);
      var px = PAD_X[c] - PAD_W / 2, py = PAD_Y - PAD_H / 2 + (down ? 8 : 0);
      rrect(px - 8, py - 8 + (down ? 0 : 6), PAD_W + 16, PAD_H + 16, 48, C.inkSoft, 0.35);
      rrect(px - 8, py - 8, PAD_W + 16, PAD_H + 16, 48, C.white);
      rrect(px, py, PAD_W, PAD_H, 40, lit ? C.yel : c === nextCol ? '#fff6d0' : (down ? C.lav : '#f4eefc'));
      // 棚のアイコン + 上向き矢印
      pill(PAD_X[c] - 80, py + PAD_H - 70 + (down ? 0 : 0), 160, 30, lit ? C.pinkD : C.woodD);
      game.draw.sprite(ARROW, { w: lit ? C.pinkD : C.inkSoft }, PAD_X[c], py + 80, 12, { anchor: 'center' });
    }
  }

  function drawScene(showPads) {
    drawTower();
    drawSkylight();
    drawLedges();
    drawLibrarian();
    if (judgeT > 0) txt(judgeW, W / 2, JUDGE_Y, 72, judgeW === 'MISS' ? C.blueD : C.pinkD);
    drawBottom(showPads);
  }

  // ---- ATTRACT: 実ロジックで拍の頭に光る列を押して登る。1回だけ違う列を押して落ちる ----
  var demo = { t: 0, hx: PAD_X[1], press: 0, trapped: false, lastK: 0 };
  var DEMO_LEN = 6.8;   // 12拍(100BPM×8 + 120BPM×4)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.trapped = false; demo.lastK = 0; demo.press = 0; }
    var col = cols[Math.min(N, cur + 1)];
    if (cur === DEMO_TRAP && !demo.trapped) col = (col + 1) % 3;
    demo.hx += (PAD_X[col] - demo.hx) * Math.min(1, dt * 10);
    var k = nearestBeat();
    if (k >= stepFrom && k > demo.lastK && songT >= beatAt[k] && songT - beatAt[k] < 0.06 && stopT <= 0 && dropT <= 0 && cur < N) {
      demo.lastK = k;
      var r = stepCol(col);
      if (r === 'fall') demo.trapped = true;
      demo.press = 0.16;
    }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var col = x < W / 3 ? 0 : x < W * 2 / 3 ? 1 : 2;
    var r = stepCol(col);
    if (r === 'busy') game.audio.tone(150, 0.04, { wave: 'square', volume: 0.03 });
    else if (r === 'free') { game.audio.tone(523, 0.05, { wave: 'triangle', volume: 0.05 }); game.fx.burst(x, y, { color: C.lav, count: 4, speed: 90 }); }
  });
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(true);
      drawTopHud(false);
      game.draw.hand(demo.hx, PAD_Y + 10, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, 86 + Math.sin(t * 3) * 4, 84, C.pinkD);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 158, 36, C.ink);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.pinkD);
      else txt('TAP TO START', W / 2, H * 0.975, 42, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      drawTopHud(false);
      rrect(100, 280, W - 200, 520, 50, C.white, 0.95);
      rrect(116, 296, W - 232, 488, 40, won ? '#fff6d0' : '#eef0ff');
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 390, 104, won ? C.pinkD : C.blueD);
      txt('SCORE ' + score, W / 2, 500, 64, C.ink);
      txt(cur + ' / ' + N, W / 2, 590, 56, C.pinkD);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, 690, 56, C.yelD);
      else txt('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 690, 44, C.inkSoft);
      if (!won) txt('あと' + Math.max(1, N - cur) + '段', W / 2, 760, 46, C.pinkD);
      rrect(60, BOT_Y0 + 300, W - 120, 330, 44, C.white, 0.95);
      txt('PERFECT ' + perfects + '   GOOD ' + goods, W / 2, BOT_Y0 + 380, 44, C.ink);
      txt('MISS ' + (falls + trips), W / 2, BOT_Y0 + 450, 44, C.blueD);
      txt(maxCombo + ' COMBO', W / 2, BOT_Y0 + 520, 44, C.pinkD);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, BOT_Y0 + 590, 38, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, height: cur, total: N, perfect: perfects, good: goods, falls: falls, trips: trips, idleBeats: idle, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      tickWorld(dt);
      if (readyT <= 0) { running = true; songT = -0.1; beatN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene(true);
    drawTopHud(true);
    if (readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.pinkD);
    if (over) txt(won ? 'FINISH' : 'TIME UP', W / 2, H * 0.3, 110, won ? C.pinkD : C.blueD);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
