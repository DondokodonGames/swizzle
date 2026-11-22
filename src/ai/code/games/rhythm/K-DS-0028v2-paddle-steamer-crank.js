// K-DS-0028v2-paddle-steamer-crank.js
// 外輪船のワルツ — 伝声管から届く三拍子の掛け声に合わせ、1小節にクランク1周の速さで回し続けて湖の外輪船を桟橋まで進める
// 操作: 下の機関室窓の正面向きクランクに指を置き、離さずに反時計回りの円を描いて回す(取っ手が指の角度についてくる。逆回しは歯止めで止まる)。縁の3つのボルト(上=1拍目・左下=2拍目・右下=3拍目)を取っ手が通る瞬間が掛け声の拍の頭に合えばPERFECT/GOOD。早すぎ・遅すぎ・止まるとMISS。3拍そろった小節は外輪が大きく水をかく。3小節目までは調速機の紫の針が「今いるべき角度」を指し、取っ手との差が色で出るが、4小節目からは蒸気で計器が曇って針が消える(0.5秒前に汽笛+計器の点滅で予告、3小節目から湯気が出始める)
// 終わり: 前奏1小節+7小節(21拍・約12秒)を回し切って MISS 4回以内ならCLEAR。MISS 5回でGAME OVER
// @mechanic: rotate_gesture
// @theme: lake_paddle_steamer_crank
// 世界観: 湖の遊覧用の外輪船の機関室で、機関士が伝声管から届く三拍子の掛け声に合わせてハンドルを回し、外輪で湖の水をかいて桟橋まで船を漕ぎ進める
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・3拍そろった小節数・桟橋までの残り距離
// スタイル: 8bit PC MONITOR
var STYLE = { bg: ['#000000', '#2038d8'], main: ['#28d8d8', '#f0f0f0', '#e8e828'], accent: ['#d82828', '#d838d8'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;
  // 8bit PC MONITOR: 8色ベタ(黒・青・赤・紫・緑・水・黄・白)。高解像度に細い線、二重線の枠ウィンドウUI、中間色は市松ディザ
  var K0 = STYLE.bg[0], BLU = STYLE.bg[1], CYN = STYLE.main[0], WHT = STYLE.main[1], YEL = STYLE.main[2];
  var RED = STYLE.accent[0], MAG = STYLE.accent[1], GRN = '#28c828';

  var GAME_TITLE = 'PADDLE WALTZ';
  var BPM = 120;
  var SPB = 60 / BPM;
  var BAR = 3;                         // 三拍子
  var BAR_LEN = BAR * SPB;
  var BARS = 7;                        // 判定する小節(0小節目は掛け声だけの前奏)
  var FIRST = BAR;
  var LAST = BAR * (BARS + 1) - 1;
  var STEAM_BEAT = 9;                  // 湯気が出始める
  var WARN_BEAT = 11;                  // 汽笛(曇る0.5秒前)
  var FOG_BEAT = 12;                   // ここから針が見えない
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var MISS_MAX = 5;
  var HIT_STOP = 0.36;
  var TIME_LIMIT = 13.5;
  var TAU = Math.PI * 2;
  var STEP = TAU / 3;                  // 1拍 = 1/3周
  var TICK = STEP / 4;                 // 歯止めの1目盛り
  var CX = 540, CYC = Math.round(H * 0.75), CR = 270, KR = CR * 0.8;   // クランクは親指ゾーンにかかる
  var M_PER_BEAT = 10;
  var DIST = (LAST - FIRST + 1) * M_PER_BEAT;
  var TOP0 = Math.round(H * 0.13), TOP1 = Math.round(H * 0.484), BOT0 = Math.round(H * 0.503), BOT1 = Math.round(H * 0.9375);
  var WATER_Y = Math.round(H * 0.402), SHIP_X = 610;

  // 自作のワルツ(ヘ長調)。1小節ずつ拍クロックから鳴らす(ブン・チャッ・チャッ)
  var MEL = ['R', 'R', 'C5', 'F5', '-', 'A5', 'G5', 'F5', 'E5', 'F5', '-', 'C5', 'D5', 'E5', 'F5', 'G5', '-', 'A#5', 'A5', 'G5', 'F5', 'E5', 'G5', 'C6'];
  var ROOT = ['F2', 'F2', 'C3', 'F2', 'A#2', 'C3', 'F2', 'C3'];
  var STAB = [['A3', 'C4'], ['A3', 'C4'], ['G3', 'E4'], ['A3', 'C4'], ['A#3', 'D4'], ['G3', 'E4'], ['A3', 'C4'], ['G3', 'E4']];
  var CALL = ['A4', 'E4', 'E4'];        // 伝声管の掛け声(イチ・ニ・サン)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, readyT, beatN, beatT, songT, melNext, lateIdx;
  var res, barDone, theta, dispTheta, nextK, tickIdx, grab, lastA, backT, lastTickT;
  var score, combo, maxCombo, perfects, goods, misses, fullBars, okBeats;
  var hitStop, hitBolt, pendingBad, boltFx, lampFx, warnT, splashT, surgeT, speed, scrollX, smoke, fogK;
  var over, won, outroT, prevBest, milestoneDone, dispRem;

  // ── スプライト ─────────────────────────────────────────
  var SHIP = [
    '.........KK...............',
    '.........YY...............',
    '.........KK...............',
    '.........KK...............',
    '......WWWWWWWWWW..........',
    '......WCCWCCWCCW..........',
    '..WWWWWWWWWWWWWWWWWWWW....',
    '..WCWCWCWCWCWCWCWCWCWW....',
    'WWWWWWWWWWWWWWWWWWWWWWWWW.',
    '.WRRRRRRRRRRRRRRRRRRRRRRW.',
    '..WWWWWWWWWWWWWWWWWWWWWW..',
    '....KKKKKKKKKKKKKKKKKK....',
  ];
  var SHIP_PAL = { K: K0, Y: YEL, W: WHT, C: CYN, R: RED };
  var ENG_BASE = [
    '...KKKKK....',
    '..KKKKKKK...',
    '..WWWWWW....',
    '..WKWWKW....',
    '..WWWWWW....',
    '...WRRW.....',
    '..BBBBBB....',
    '.BBBBBBBB...',
    '.BBBBBBBB...',
    '.BBBBBBBB...',
    '..BBBBBB....',
    '..BB..BB....',
    '.KKK..KKK...',
  ];
  function engFrame(over1) {
    var f = ENG_BASE.slice();
    for (var k in over1) f[k] = over1[k];
    return f;
  }
  var ENG = [
    engFrame({ 5: '...WRRW..WW.', 6: '..BBBBBBBW..' }),   // 取っ手が上
    engFrame({ 9: '.BBBBBBBBBWW' }),                     // 取っ手が左下
    engFrame({ 7: '.BBBBBBBBBWW' }),                     // 取っ手が右下
    engFrame({ 3: '..WRWWRW....', 4: '..WWKKWW....', 7: 'WBBBBBBBBW..' }),   // しまった
  ];
  var ENG_PAL = { K: K0, W: WHT, R: RED, B: BLU };

  // ── 小道具 ─────────────────────────────────────────────
  function al(hex, a) {
    var v = Math.max(0, Math.min(255, Math.round(a * 255)));
    return hex + (v < 16 ? '0' : '') + v.toString(16);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: K0, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col) {
    game.draw.rect(x, y, w, h, K0);
    game.draw.line(x, y, x + w, y, col, 3);
    game.draw.line(x, y + h, x + w, y + h, col, 3);
    game.draw.line(x, y, x, y + h, col, 3);
    game.draw.line(x + w, y, x + w, y + h, col, 3);
    game.draw.line(x + 8, y + 8, x + w - 8, y + 8, col, 1);
    game.draw.line(x + 8, y + h - 8, x + w - 8, y + h - 8, col, 1);
    game.draw.line(x + 8, y + 8, x + 8, y + h - 8, col, 1);
    game.draw.line(x + w - 8, y + 8, x + w - 8, y + h - 8, col, 1);
    game.draw.rect(x - 4, y - 4, 12, 12, col);
    game.draw.rect(x + w - 8, y - 4, 12, 12, col);
    game.draw.rect(x - 4, y + h - 8, 12, 12, col);
    game.draw.rect(x + w - 8, y + h - 8, 12, 12, col);
  }
  function vq(v) { return armed ? (demoMode ? v * 0.4 : v) : 0.001; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function boltAng(j) { return -Math.PI / 2 - j * STEP; }
  function boltPos(j, r) { var a = boltAng(j); return { x: CX + Math.cos(a) * r, y: CYC + Math.sin(a) * r }; }
  function angAt(x, y) { return Math.atan2(y - CYC, x - CX); }

  // ── 進行 ───────────────────────────────────────────────
  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; readyT = isDemo ? 0 : 0.8;
    beatN = 0; beatT = 0; songT = 0; melNext = 0; lateIdx = FIRST;
    res = []; barDone = [];
    theta = 0; dispTheta = 0; nextK = 1; tickIdx = 0; grab = false; lastA = 0; backT = 0; lastTickT = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; fullBars = 0; okBeats = 0;
    hitStop = 0; hitBolt = -1; pendingBad = null; boltFx = [0, 0, 0]; lampFx = [0, 0, 0];
    warnT = 0; splashT = 0; surgeT = 0; speed = 30; scrollX = 0; smoke = []; fogK = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestoneDone = false; dispRem = DIST;
    if (isDemo) startClock();
  }

  function barNotes(b) {
    var out = [];
    for (var i = 0; i < BAR; i++) {
      var n = MEL[b * BAR + i];
      if (n === '-') { if (out.length) out[out.length - 1][1] += 1; else out.push(['R', 1]); }
      else out.push([n, 1]);
    }
    return out;
  }
  function playBar(b) {
    if (!armed || b < 0 || b >= ROOT.length) return;
    var q = demoMode ? 0.4 : 1;
    game.audio.melody(barNotes(b), {
      tempo: BPM, wave: 'square', volume: 0.04 * q,
      bass: [[ROOT[b], 1], [STAB[b][0], 1], [STAB[b][1], 1]], bassWave: 'triangle', bassVolume: 0.08 * q,
    });
  }

  // 拍クロック(1本だけ)
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    playBar(0); melNext = 1;
    onBeat(0);
  }
  function stepClock(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; songT = beatN * SPB + beatT; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (melNext < ROOT.length && songT >= melNext * BAR_LEN - 0.06) { playBar(melNext); melNext++; }
    checkLate();
    var fogTarget = songT >= FOG_BEAT * SPB - 0.04 ? 1 : (songT >= STEAM_BEAT * SPB ? 0.22 : 0);
    fogK += (fogTarget - fogK) * Math.min(1, dt * 5);
    if (!demoMode && !over && (songT > LAST * SPB + GOOD_W + 0.05 || songT > TIME_LIMIT)) finish(misses < MISS_MAX);
  }

  function onBeat(k) {
    var pos = k % BAR, bar = Math.floor(k / BAR);
    lampFx[pos] = 1;
    var q = demoMode ? 0.4 : 1;
    tone(CALL[pos], 0.1, { wave: 'square', volume: (pos === 0 ? 0.07 : 0.045) * q, slide: pos === 0 ? 70 : 30 });
    if (pos === 0) {
      tone(98, 0.12, { wave: 'sine', volume: 0.2 * q });
      checkLate();
      if (bar >= 2) evalBar(bar - 1);
    }
    if (k === WARN_BEAT) {
      warnT = 0.7;
      tone(587, 0.42, { wave: 'triangle', volume: 0.09 * q, slide: -40 });   // 汽笛(2音の和音)
      tone(740, 0.42, { wave: 'triangle', volume: 0.07 * q, slide: -50 });
    }
    if (k === FOG_BEAT) {
      tone(1800, 0.3, { wave: 'sawtooth', volume: 0.025 * q, slide: -1400 });   // 蒸気が噴く
      game.fx.burst(CX, CYC, { color: WHT, count: 16, speed: 260 });
    }
  }

  function checkLate() {
    while (lateIdx <= LAST && songT > lateIdx * SPB + GOOD_W) {
      if (!res[lateIdx]) { res[lateIdx] = 'late'; doMiss(lateIdx % BAR); }
      lateIdx++;
    }
  }

  function evalBar(j) {
    if (j < 1 || j > BARS || barDone[j]) return;
    barDone[j] = true;
    var all = true, allP = true;
    for (var i = 0; i < BAR; i++) {
      var r = res[j * BAR + i];
      if (r !== 'perfect' && r !== 'good') all = false;
      if (r !== 'perfect') allP = false;
    }
    if (!all) return;
    fullBars++;
    score += allP ? 220 : 140;
    surgeT = 0.6; speed = Math.min(320, speed + 90);
    var q = demoMode ? 0.4 : 1;
    tone(349, 0.4, { wave: 'triangle', volume: 0.06 * q });
    tone(440, 0.4, { wave: 'triangle', volume: 0.05 * q });
    tone(523, 0.5, { wave: 'square', volume: 0.03 * q });
    game.fx.burst(SHIP_X + 12, WATER_Y, { color: allP ? YEL : CYN, count: allP ? 22 : 14, speed: 380 });
    if (!demoMode && fullBars === 3 && !milestoneDone) {
      milestoneDone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, 560, { color: YEL, size: 96 });
    }
  }

  function doMiss(bolt) {
    misses++; combo = 0;
    hitStop = HIT_STOP; hitBolt = bolt;
    speed = Math.max(12, speed * 0.35);
    var p = boltPos(bolt, CR);
    pendingBad = { x: p.x, y: p.y - 100, t: 0.3 };
    tone(130, 0.22, { wave: 'sawtooth', volume: demoMode ? 0.035 : 0.1, slide: -60 });
    smoke.push({ x: SHIP_X - 56, y: WATER_Y - 196, r: 26, life: 1.4, dark: true });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 取っ手がボルトを通った(入力とデモで共通)
  function cross(k) {
    if (!running || over) return;
    var j = k % BAR;
    var tb = songT / SPB;
    var b = j + BAR * Math.round((tb - j) / BAR);
    if (b < FIRST) {
      boltFx[j] = 0.6;
      tone(j === 0 ? 1047 : 784, 0.04, { wave: 'square', volume: 0.04 * (demoMode ? 0.4 : 1) });
      return;
    }
    if (b > LAST) return;
    if (res[b] === 'late' || res[b] === 'miss') return;
    if (res[b]) { doMiss(j); return; }                       // 1小節に2周以上(速すぎ)
    var off = songT - b * SPB;
    if (Math.abs(off) > GOOD_W) { res[b] = 'miss'; doMiss(j); return; }
    combo++; if (combo > maxCombo) maxCombo = combo;
    okBeats++;
    boltFx[j] = 1; splashT = 0.35; speed = Math.min(320, speed + 60);
    smoke.push({ x: SHIP_X - 56, y: WATER_Y - 196, r: 14, life: 1.1, dark: false });
    var p = boltPos(j, CR);
    if (Math.abs(off) <= PERFECT_W) {
      res[b] = 'perfect'; perfects++; score += 100 + Math.min(combo, 10) * 10;
      game.feedback.good(p.x, p.y - 90, { text: 'PERFECT', color: YEL, size: 50, count: 10, volume: vq(0.25) });
    } else {
      res[b] = 'good'; goods++; score += 50;
      game.feedback.good(p.x, p.y - 90, { text: 'GOOD', color: CYN, size: 42, count: 6, volume: vq(0.2) });
    }
  }

  // 指の角度ぶんクランクを回す(反時計回りが正。逆回しは歯止めで止まる)
  function turnTo(x, y) {
    var a = angAt(x, y);
    var d = a - lastA;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    lastA = a;
    if (Math.abs(d) > 1.1) return;                 // 中心をまたいだ飛びは無視
    var ccw = -d;
    if (ccw < 0) {
      var floorT = tickIdx * TICK;
      if (theta + ccw < floorT && theta > floorT - 0.001) {
        if (backT <= 0) tone(180, 0.05, { wave: 'square', volume: 0.05 });
        backT = 0.25;
      }
      theta = Math.max(floorT, theta + ccw);
      return;
    }
    theta += ccw;
    var ticked = false;
    while (theta >= (tickIdx + 1) * TICK) { tickIdx++; if (tickIdx % 4 !== 0) ticked = true; }
    while (theta >= nextK * STEP) { cross(nextK); nextK++; }
    return ticked;
  }

  function finish(ok) {
    if (over) return;
    for (var j = 1; j <= BARS; j++) if (!barDone[j] && (j + 1) * BAR - 1 < lateIdx) evalBar(j);
    over = true; won = ok; outroT = 1.5; running = false; grab = false;
    game.audio.stopBgm();
    if (ok) {
      score += fullBars * 50;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, 420 + (i % 2) * 180, { color: [YEL, CYN, MAG, GRN, WHT][i], count: 20, speed: 420 });
      game.fx.flash(YEL, 0.15);
      if (score > prevBest) { game.fx.popup('NEW RECORD', W / 2, 640, { color: YEL, size: 72 }); game.audio.play('se_milestone', 0.5); }
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    var dx = x - CX, dy = y - CYC;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > CR * 0.3 && d < CR * 1.7) {
      grab = true; lastA = angAt(x, y);
      game.audio.tone(330, 0.04, { wave: 'square', volume: 0.06 });
      game.fx.burst(x, y, { color: CYN, count: 5, speed: 140 });
    } else {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(x, y, { color: WHT, count: 3, speed: 90 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !grab || over) return;
    if (turnTo(x, y) && game.time.elapsed - lastTickT > 0.04) {
      lastTickT = game.time.elapsed;   // 歯止めのカチカチ(回している手応え)
      game.audio.tone(2200, 0.015, { wave: 'square', volume: 0.015 });
    }
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    if (grab && !over) game.audio.tone(220, 0.04, { wave: 'triangle', volume: 0.05 });
    grab = false;
  });
  game.onTap(function() {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ── 描画 ───────────────────────────────────────────────
  function drawBack(t) {
    game.draw.gradient(0, H, [[0, '#000020'], [0.5, K0], [1, '#000018']]);
    for (var i = 0; i < 40; i++) {
      var sx = (i * 263) % W, sy = (i * 151) % H;
      game.draw.rect(sx, sy, 3, 3, i % 3 ? BLU : CYN, 0.5 + 0.4 * Math.sin(t * 1.5 + i));
    }
  }

  function drawLake(t) {
    var x0 = 24, x1 = W - 24, y0 = TOP0 + 12, y1 = TOP1 - 12;
    // 空(青ベタ)+ 太陽の市松の暈
    game.draw.rect(x0, y0, x1 - x0, 650 - y0, BLU);
    game.draw.circle(860, 360, 46, YEL);
    for (var r = 0; r < 12; r++) {
      var ra = r / 12 * TAU + t * 0.2;
      game.draw.rect(860 + Math.cos(ra) * 74 - 4, 360 + Math.sin(ra) * 74 - 4, 8, 8, YEL);
    }
    // 雲(細い白線の輪郭)
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 380 + 200 + scrollX * 0.05 + t * 8) % 1200) - 60;
      var cy = 330 + c * 50;
      game.draw.line(cx, cy, cx + 150, cy, WHT, 2);
      game.draw.line(cx + 20, cy - 16, cx + 110, cy - 16, WHT, 2);
      game.draw.line(cx + 40, cy - 30, cx + 80, cy - 30, WHT, 2);
    }
    // 遠い丘(段々のシルエット + 黒の市松ディザ)
    for (var h = 0; h < 44; h++) {
      var hx = x0 + h * 24;
      var hh = 40 + Math.round((Math.sin((h + scrollX * 0.004) * 0.45) * 26 + Math.sin(h * 0.9) * 10) / 8) * 8;
      game.draw.rect(hx, 650 - hh, 24, hh, GRN);
      for (var dy = 650 - hh + 16; dy < 650; dy += 16) game.draw.rect(hx + ((dy / 16) % 2 ? 0 : 12), dy, 12, 8, K0);
    }
    // 湖面(水と青の市松 + 流れる波線)
    game.draw.rect(x0, 650, x1 - x0, y1 - 650, BLU);
    for (var row = 0; row < 4; row++) {
      var yy = 650 + row * 8;
      for (var col = 0; col < 66; col += 2) game.draw.rect(x0 + (col + (row % 2)) * 16, yy, 16, 8, CYN);
    }
    for (var wv = 0; wv < 26; wv++) {
      var wy = 700 + (wv % 9) * 26;
      var wx = ((wv * 173 + scrollX * (0.6 + (wv % 9) * 0.08)) % 1140) - 40;
      game.draw.line(wx, wy, wx + 40 + (wv % 3) * 20, wy, CYN, 2);
    }
    // 桟橋(残り距離が近づくと左から現れる)
    var px = SHIP_X - 236 - dispRem * 9;
    if (px > x0 + 10) {
      game.draw.rect(Math.max(x0, px - 420), WATER_Y - 40, Math.min(420, px - x0), 14, YEL);
      for (var pp = 0; pp < 7; pp++) {
        var postX = px - 20 - pp * 60;
        if (postX > x0) game.draw.rect(postX, WATER_Y - 26, 10, 80, RED);
      }
      if (px - 30 > x0) {
        game.draw.line(px - 30, WATER_Y - 40, px - 30, WATER_Y - 150, WHT, 3);
        game.draw.rect(px - 30, WATER_Y - 150, 44, 26, Math.floor(t * 4) % 2 ? RED : MAG);
      }
    }
    if (dispRem > 0.5) label('あと ' + Math.ceil(dispRem) + 'm', x0 + 30, y0 + 40, 40, WHT, 'left');
  }

  function drawShip(t) {
    var bob = Math.round((Math.sin(t * 2.4) * 4 + (hitStop > 0 ? Math.sin(t * 70) * 5 : 0)) / 2) * 2;
    var sy = WATER_Y - 80 + bob;
    // 煙
    for (var i = 0; i < smoke.length; i++) {
      var s = smoke[i];
      game.draw.circle(s.x, s.y, s.r, s.dark ? '#303030' : WHT, Math.min(1, s.life) * 0.85);
      if (!s.dark) game.draw.circle(s.x, s.y, s.r * 0.55, BLU, Math.min(1, s.life) * 0.5);
    }
    game.draw.sprite(SHIP, SHIP_PAL, SHIP_X, sy, 16, { anchor: 'center' });
    // 外輪(クランクと同じ角度で反時計回り。輪と腕だけの線画で船体が透けて見える)
    var wx = SHIP_X + 40, wy = WATER_Y - 34 + bob, wr = 72;
    for (var rs = 0; rs < 16; rs++) {
      var r0 = rs / 16 * TAU, r1 = (rs + 1) / 16 * TAU;
      game.draw.line(wx + Math.cos(r0) * wr, wy + Math.sin(r0) * wr, wx + Math.cos(r1) * wr, wy + Math.sin(r1) * wr, K0, 7);
      game.draw.line(wx + Math.cos(r0) * wr, wy + Math.sin(r0) * wr, wx + Math.cos(r1) * wr, wy + Math.sin(r1) * wr, CYN, 3);
    }
    for (var k = 0; k < 8; k++) {
      var a = -Math.PI / 2 - dispTheta - k * TAU / 8;
      var ex = wx + Math.cos(a) * wr, ey = wy + Math.sin(a) * wr;
      game.draw.line(wx, wy, ex, ey, K0, 6);
      game.draw.line(wx, wy, ex, ey, CYN, 2);
      game.draw.rect(ex - 10, ey - 10, 20, 20, k === 0 ? YEL : RED);
    }
    game.draw.circle(wx, wy, 14, YEL);
    // 外輪覆い(上半分の弧)
    for (var s2 = 0; s2 < 10; s2++) {
      var a0 = Math.PI + s2 / 10 * Math.PI, a1 = Math.PI + (s2 + 1) / 10 * Math.PI;
      game.draw.line(wx + Math.cos(a0) * (wr + 18), wy + Math.sin(a0) * (wr + 18), wx + Math.cos(a1) * (wr + 18), wy + Math.sin(a1) * (wr + 18), s2 % 2 ? RED : YEL, 10);
    }
    // 手前の水(外輪の下半分が沈む)
    game.draw.rect(24, WATER_Y + 14, W - 48, TOP1 - 12 - WATER_Y - 14, BLU);
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 66; col += 2) game.draw.rect(24 + (col + row) * 16, WATER_Y + 14 + row * 8, 16, 8, CYN);
    }
    // 航跡(速さ)
    var wake = Math.min(1, speed / 260);
    for (var w = 0; w < 6; w++) {
      var lx = SHIP_X + 150 + w * 50 + ((t * speed) % 50);
      game.draw.line(lx, WATER_Y + 40 + w * 10, lx + 30 + wake * 60, WATER_Y + 40 + w * 10, WHT, 2);
    }
    if (splashT > 0 || surgeT > 0) {
      var n = surgeT > 0 ? 10 : 5;
      for (var d = 0; d < n; d++) {
        var da = d / n * Math.PI;
        var rr = 30 + (0.35 - Math.max(0, splashT)) * 300 + (surgeT > 0 ? 40 : 0);
        game.draw.rect(wx + 20 + Math.cos(da) * rr, WATER_Y + 10 - Math.sin(da) * rr * 0.6, 12, 12, CYN);
      }
    }
  }

  function drawEngineRoom(t) {
    frame(16, BOT0, W - 32, BOT1 - BOT0, CYN);
    // 監視盤の方眼
    for (var gx = 60; gx < W - 40; gx += 60) game.draw.line(gx, BOT0 + 20, gx, BOT1 - 20, al(BLU, 0.45), 1);
    for (var gy = BOT0 + 60; gy < BOT1 - 20; gy += 60) game.draw.line(28, gy, W - 28, gy, al(BLU, 0.45), 1);
    // 伝声管(拍ごとに掛け声の輪)
    game.draw.rect(118, BOT0 + 12, 24, 80, YEL);
    game.draw.rect(100, BOT0 + 88, 60, 30, YEL);
    for (var i = 0; i < 3; i++) {
      if (lampFx[i] > 0) {
        var rr = 40 + (1 - lampFx[i]) * 90;
        game.draw.circle(130, BOT0 + 104, rr, i === 0 ? YEL : WHT, 0.25 * lampFx[i]);
      }
    }
    // 拍ランプ 1・2・3
    for (var l = 0; l < 3; l++) {
      var lx = 700 + l * 120, ly = BOT0 + 70;
      var cur = running && beatN % BAR === l;
      var rad = l === 0 ? 34 : 24;
      game.draw.rect(lx - rad - 6, ly - rad - 6, rad * 2 + 12, rad * 2 + 12, CYN);
      game.draw.rect(lx - rad, ly - rad, rad * 2, rad * 2, cur ? (l === 0 ? YEL : WHT) : K0);
      if (lampFx[l] > 0) game.draw.rect(lx - rad - 14, ly - rad - 14, rad * 2 + 28, rad * 2 + 28, l === 0 ? YEL : WHT, 0.3 * lampFx[l]);
      game.draw.text('' + (l + 1), lx, ly + 2, { size: 30, color: cur ? K0 : CYN, bold: true, font: 'monospace' });
    }
    // 機関士(取っ手の位置で腕が変わる)
    var sec = ((Math.floor(dispTheta / STEP) % 3) + 3) % 3;
    var ef = hitStop > 0 ? ENG[3] : ENG[sec];
    game.draw.sprite(ef, ENG_PAL, 132, 1290 + Math.round(Math.sin(t * 3) * 2) * 2, 12, { anchor: 'center' });
    game.draw.rect(50, 1372, 160, 10, CYN);
  }

  function drawCrank(t) {
    var stop = hitStop > 0;
    // 外枠リング + 盤
    game.draw.circle(CX, CYC, CR + 14, CYN);
    game.draw.circle(CX, CYC, CR + 8, K0);
    game.draw.circle(CX, CYC, CR, BLU);
    for (var q = 0; q < 24; q++) {
      var qa = q / 24 * TAU;
      var r0 = q % 2 ? CR * 0.88 : CR * 0.8;
      game.draw.line(CX + Math.cos(qa) * r0, CYC + Math.sin(qa) * r0, CX + Math.cos(qa) * CR * 0.96, CYC + Math.sin(qa) * CR * 0.96, CYN, 2);
    }
    // 盤の市松(中間色)
    for (var dx = -3; dx <= 3; dx++) {
      for (var dy = -3; dy <= 3; dy++) {
        if ((dx + dy) % 2 === 0 && dx * dx + dy * dy < 10) game.draw.rect(CX + dx * 40 - 6, CYC + dy * 40 - 6, 12, 12, K0);
      }
    }
    // 3つのボルト(上=1拍目 大)
    for (var j = 0; j < 3; j++) {
      var bp = boltPos(j, CR);
      var big = j === 0;
      var flash = boltFx[j] > 0;
      var hit = stop && hitBolt === j;
      var rad = (big ? 30 : 20) * (hit ? 1.5 : 1) + (flash ? boltFx[j] * 12 : 0);
      game.draw.circle(bp.x, bp.y, rad + 6, hit ? RED : K0);
      game.draw.circle(bp.x, bp.y, rad, hit ? WHT : (flash ? GRN : (big ? YEL : WHT)));
      game.draw.line(bp.x - rad * 0.6, bp.y, bp.x + rad * 0.6, bp.y, K0, 3);
      var np = boltPos(j, CR + 64);
      game.draw.text('' + (j + 1), np.x, np.y, { size: big ? 48 : 36, color: big ? YEL : WHT, bold: true, font: 'monospace' });
    }
    // 回す向き(上の外側、左向きの矢印)
    for (var c = 0; c < 3; c++) {
      var ca = -Math.PI / 2 - 0.35 - c * 0.28;
      var cr = CR + 40 + Math.sin(t * 6 + c) * 4;
      var ax = CX + Math.cos(ca) * cr, ay = CYC + Math.sin(ca) * cr;
      var col = backT > 0 ? RED : MAG;
      game.draw.line(ax + 14, ay - 12, ax - 4, ay + 2, col, 5);
      game.draw.line(ax + 16, ay + 14, ax - 4, ay + 2, col, 5);
    }
    // 調速機の針(今いるべき角度)と取っ手との差
    if (running && fogK < 0.95) {
      var ideal = (songT / SPB) * STEP;
      var ia = -Math.PI / 2 - ideal;
      var na = 1 - fogK;
      game.draw.line(CX, CYC, CX + Math.cos(ia) * CR * 0.97, CYC + Math.sin(ia) * CR * 0.97, al(MAG, na), 6);
      var lag = ideal - dispTheta;
      var lc = Math.abs(lag) < STEP * 0.15 ? GRN : (Math.abs(lag) < STEP * 0.3 ? YEL : RED);
      var n = Math.min(14, Math.ceil(Math.abs(lag) / 0.08));
      for (var g = 1; g <= n; g++) {
        var ga = -Math.PI / 2 - dispTheta - lag * g / (n + 1);
        game.draw.rect(CX + Math.cos(ga) * KR * 1.08 - 5, CYC + Math.sin(ga) * KR * 1.08 - 5, 10, 10, al(lc, na));
      }
    }
    // 湯気(計器が曇る)
    if (fogK > 0.02) {
      for (var f = 0; f < 16; f++) {
        var fa = f / 16 * TAU + t * 0.4;
        var fr = CR * (0.35 + (f % 3) * 0.22);
        game.draw.circle(CX + Math.cos(fa) * fr, CYC + Math.sin(fa) * fr, 50 + (f % 4) * 12, WHT, 0.5 * fogK);
      }
    }
    if (warnT > 0 && Math.floor(t * 12) % 2 === 0) {
      game.draw.circle(CX, CYC, CR + 30, RED, 0.18);
      game.draw.rect(28, BOT0 + 12, W - 56, 10, RED);
    }
    // 腕と取っ手
    var ka = -Math.PI / 2 - dispTheta;
    var kx = CX + Math.cos(ka) * KR, ky = CYC + Math.sin(ka) * KR;
    game.draw.line(CX, CYC, kx, ky, stop ? WHT : CYN, 22);
    game.draw.line(CX, CYC, kx, ky, K0, 8);
    if (grab && !stop) game.draw.circle(kx, ky, 64, CYN, 0.35);
    var kr = stop ? 46 * (1 + hitStop / HIT_STOP * 0.5) : 46;
    game.draw.circle(kx, ky, kr + 6, K0);
    game.draw.circle(kx, ky, kr, stop ? WHT : YEL);
    game.draw.rect(kx - 10, ky - 10, 20, 20, RED);
    // 軸と歯止め
    game.draw.circle(CX, CYC, 44, RED);
    game.draw.circle(CX, CYC, 18, K0);
    var pawl = (tickIdx % 2) ? 8 : -8;
    game.draw.line(CX + 40, CYC - 50, CX + 64, CYC - 30 + pawl, backT > 0 ? RED : WHT, 6);
  }

  function drawHud() {
    frame(16, 16, W - 32, 206, CYN);
    label('SCORE ' + score, 52, 76, 46, WHT, 'left');
    label('BEST ' + prevBest, 52, 140, 30, YEL, 'left');
    var bar = Math.max(0, Math.min(BARS, Math.floor(songT / BAR_LEN)));
    label(bar + ' / ' + BARS, W / 2 + 40, 92, 52, CYN);
    for (var m = 0; m < MISS_MAX; m++) {
      var mx = W - 80 - m * 52;
      game.draw.rect(mx - 20, 58, 40, 40, RED);
      game.draw.rect(mx - 14, 64, 28, 28, m < misses ? RED : K0);
      if (m < misses) { game.draw.line(mx - 12, 66, mx + 12, 90, WHT, 4); game.draw.line(mx + 12, 66, mx - 12, 90, WHT, 4); }
    }
    if (combo >= 2) label('x' + combo, W - 52, 150, 40, YEL, 'right');
    var progress = Math.max(0, Math.min(1, songT / ((LAST + 1) * SPB)));
    game.draw.rect(40, 190, W - 80, 12, BLU);
    game.draw.rect(40, 190, (W - 80) * progress, 12, YEL);
  }

  function drawScene(t) {
    drawBack(t);
    frame(16, TOP0, W - 32, TOP1 - TOP0, WHT);
    drawLake(t);
    drawShip(t);
    drawEngineRoom(t);
    drawCrank(t);
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, K0, 0.12);
  }

  function drawResult(t) {
    frame(70, 300, W - 140, 600, YEL);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, 390, 92, won ? YEL : RED);
    label('SCORE ' + score, W / 2, 490, 56, WHT);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 570, 32, CYN);
    label(fullBars + ' / ' + BARS + '   x' + maxCombo, W / 2, 640, 44, GRN);
    if (won && score > prevBest) label('NEW RECORD', W / 2, 730, 56, Math.floor(t * 6) % 2 ? YEL : MAG);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 730, 42, YEL);
    var rem = Math.max(0, DIST - okBeats * M_PER_BEAT);
    if (!won && rem > 0) label('あと ' + rem + 'm', W / 2, 820, 50, RED);
  }

  // ── ATTRACT: 実ロジックで拍どおりに回す → 2小節目でもたついて MISS → 追いついて GOOD → 4小節目から曇っても拍どおり ──
  var demo = { t: 0, x: CX, y: CYC - KR };
  var DEMO_BEATS = 18;
  function demoLag(tb) {
    if (tb < 6.7) return 0;
    if (tb < 7.1) return (tb - 6.7) / 0.4 * 0.55;
    if (tb < 7.9) return 0.55;
    if (tb < 8.4) return 0.55 * (1 - (tb - 7.9) / 0.5);
    return 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) initGame(true);
    stepClock(dt);
    var tb = songT / SPB;
    var target = Math.max(0, tb - demoLag(tb)) * STEP;
    var a = -Math.PI / 2 - target;
    var fx = CX + Math.cos(a) * KR, fy = CYC + Math.sin(a) * KR;
    if (!grab) { grab = true; lastA = angAt(fx, fy); }
    else turnTo(fx, fy);
    demo.x = fx; demo.y = fy;
  }

  function tickFx(dt) {
    if (hitStop > 0) hitStop -= dt;
    if (backT > 0) backT -= dt;
    if (warnT > 0) warnT -= dt;
    if (splashT > 0) splashT -= dt;
    if (surgeT > 0) surgeT -= dt;
    for (var i = 0; i < 3; i++) { if (boltFx[i] > 0) boltFx[i] -= dt * 3; if (lampFx[i] > 0) lampFx[i] -= dt * 4; }
    if (hitStop <= 0) dispTheta = theta;
    if (pendingBad) {
      pendingBad.t -= dt;
      if (pendingBad.t <= 0) {
        game.feedback.bad(pendingBad.x, pendingBad.y, { text: 'MISS', shake: demoMode ? 4 : 10, volume: vq(0.45) });
        pendingBad = null;
      }
    }
    if (hitStop <= 0) {
      speed += (30 - speed) * Math.min(1, dt * 0.9);
      scrollX += speed * dt;
    }
    for (var s = smoke.length - 1; s >= 0; s--) {
      var p = smoke[s];
      p.life -= dt; p.x += (40 + speed * 0.5) * dt; p.y -= 70 * dt; p.r += 26 * dt;
      if (p.life <= 0) smoke.splice(s, 1);
    }
    var rem = Math.max(0, DIST - okBeats * M_PER_BEAT);
    dispRem += (rem - dispRem) * Math.min(1, dt * 4);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      tickFx(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: true, scale: 14 });
      frame(16, 16, W - 32, 206, CYN);
      var bob = Math.round(Math.sin(t * 2.5) * 2) * 3;
      game.draw.text(GAME_TITLE, W / 2 + 6, 92 + bob, { size: 92, color: RED, bold: true, align: 'center', font: 'monospace' });
      game.draw.text(GAME_TITLE, W / 2, 86 + bob, { size: 92, color: YEL, bold: true, align: 'center', font: 'monospace' });
      label('HI-SCORE ' + game.best, W / 2, 176, 36, CYN);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, YEL);
      else label('TAP TO START', W / 2, H * 0.965, 42, WHT);
      return;
    }

    if (state === S.RESULT) {
      tickFx(dt);
      drawScene(t);
      drawHud();
      drawResult(t);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, WHT);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, fullBars: fullBars, maxCombo: maxCombo, meters: okBeats * M_PER_BEAT };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { startClock(); game.audio.play('se_tap', 0.4); }
    } else {
      stepClock(dt);
    }
    tickFx(dt);

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.29, 110, YEL);
    if (over && won) label('FINISH', W / 2, H * 0.29, 100, YEL);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
