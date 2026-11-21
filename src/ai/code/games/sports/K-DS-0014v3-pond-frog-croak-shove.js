// K-DS-0014v3-pond-frog-croak-shove.js
// 夜池のケロ押し — 隣のカエルが拍の頭で鳴いたら、その裏拍にぴたりと鳴き返して縄張りの石の境目を一歩ずつ押し戻し、相手を石から池へ押し出す
// 操作: 画面のどこでもタップで鳴く。相手が拍の頭で鳴いたら、その拍の裏(半拍後)でタップ。裏拍のずれでPERFECT/GOOD、合えば境目が一歩相手側へ進む。相手の声の後の裏で鳴き漏らす・拍の頭に声を重ねる・相手が黙った拍の裏や拍の間で鳴くと、逆に一歩押し込まれる。相手が喉袋を大きく膨らませた次の拍(1拍前に膨らみと低いうなりで予告)は大鳴きで、返せば二歩・漏らせば二歩。下の帯に相手の声(輪)と返す場所(菱形)が右から流れてくる
// 終わり: 境目を相手の石の端まで押し切る(相手が池に落ちる)とCLEAR(判定点+連続+大鳴き返し+残り拍)。自分の石の端まで押し込まれるか、10小節(20秒)で押し切れなければGAME OVER
// @mechanic: push_out
// @theme: night_pond_frog_croak_shove
// 世界観: 夜の池のほとりで、若いカエルが隣のカエルと鳴き合い、相手の声の裏拍に鳴き返して縄張りの平たい石の境目を押し戻し、相手を石から池へ押し出す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・押し込んだ最大歩数・PERFECT/GOOD/MISS数・大鳴き返し数・最大連続
// スタイル: 1BIT INK
var STYLE = { bg: ['#000000', '#141414'], main: ['#f4f1e8', '#000000', '#f4f1e8'], accent: ['#f4f1e8', '#000000'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK(夜): 黒い紙に白インクの2値だけ。中間調は網点と線の太さで作る
  var WI = STYLE.main[0], BK = STYLE.main[1];

  var GAME_TITLE = 'KERO SHOVE';
  var BPM = 120, SPB = 60 / BPM, BAR = SPB * 4;
  var BARS = 10, BEATS = BARS * 4;
  var TIME_LIMIT = 20;                 // 10小節 × 2秒
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.1;
  var GOAL = 10, LOSE = -4;            // 境目の歩数: +10で相手が落ちる / -4で自分が落ちる

  var BOUND0 = 880, STEP = 52, GAP = 105;
  var STONE_X = 300, STONE_W = 480;
  var STONE_TOP = BOUND0 - (GOAL - 0.5) * STEP - GAP;
  var STONE_BOT = BOUND0 - (LOSE + 0.5) * STEP + GAP;
  var FROG_X = STONE_X + STONE_W / 2;
  var TL_Y = Math.round(H * 0.82), PH_X = 200, PPS = 360;   // 下の帯(流れる譜面)
  var MOON_X = 900, MOON_Y = 420;

  // 相手の鳴き方(1小節4拍: 0=黙る 1=鳴く 2=大鳴き)。序盤は疎ら → 中盤に大鳴き → 終盤は詰まる
  var POOL_A = [[1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 0, 1]];
  var POOL_B = [[1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 0], [1, 0, 2, 0], [0, 1, 0, 2]];
  var POOL_C = [[1, 1, 1, 0], [1, 1, 0, 2], [2, 0, 1, 1], [1, 1, 1, 1], [1, 2, 0, 1]];
  var DEMO_PAT = [[1, 0, 1, 0], [1, 0, 2, 0]];

  // 伴奏(オリジナル)。拍の頭は低音だけ、裏拍に小さな合いの手(返す場所の目安)
  var ROOTS = ['A2', 'A2', 'F2', 'G2'];
  var OFFS = [['E4', 'G4', 'A4', 'G4'], ['C5', 'A4', 'G4', 'E4'], ['A4', 'C5', 'D5', 'C5'], ['B4', 'G4', 'E4', 'D4']];

  // ---- スプライト(上向き。相手は上下反転) ----
  var FROG = [
    ['..ww.....ww..', '.wwww...wwww.', '.wbbw...wbbw.', '.wwwwwwwwwww.', '..wwwwwwwww..', '.wwwbwwwbwww.', 'wwwwwwbwwwwww', 'w.wwwwwwwww.w', 'w..wwwwwww..w', 'ww.wwwwwww.ww', '...wwwbwww...', '..ww.....ww..', '.ww.......ww.', 'ww.........ww'],
    ['..ww.....ww..', '.wwww...wwww.', '.wbbw...wbbw.', '.wwwwwwwwwww.', '.wwwwwwwwwww.', '.wwwbwwwbwww.', 'wwwwwwbwwwwww', 'w.wwwwwwwww.w', 'w..wwwwwww..w', 'ww.wwwwwww.ww', '...wwwbwww...', '..www...www..', '...ww...ww...', '.............'],
    ['..ww.....ww..', '.wwww...wwww.', '.wbbw...wbbw.', '.wwwwwwwwwww.', 'w.wwwwwwwww.w', 'w.wwbwwwbww.w', '..wwwwbwwww..', '..wwwwwwwww..', '...wwwbwww...', '...wwwwwww...', '....w...w....', '....w...w....', '...ww...ww...', '...w.....w...']
  ];
  var RIVAL = [
    ['..ww.....ww..', '.wwww...wwww.', '.wbbw...wbbw.', '.wwwwwwwwwww.', '..wbwbwbwbw..', '.wwwwwwwwwww.', 'wwbwbwbwbwbww', 'w.wwwwwwwww.w', 'w..wbwbwbw..w', 'ww.wwwwwww.ww', '...wbwbwbw...', '..ww.....ww..', '.ww.......ww.', 'ww.........ww'],
    ['..ww.....ww..', '.wwww...wwww.', '.wbbw...wbbw.', '.wwwwwwwwwww.', '.wwbwbwbwbww.', '.wwwwwwwwwww.', 'wwbwbwbwbwbww', 'w.wwwwwwwww.w', 'w..wbwbwbw..w', 'ww.wwwwwww.ww', '...wbwbwbw...', '..www...www..', '...ww...ww...', '.............'],
    ['..ww.....ww..', '.wwww...wwww.', '.wbbw...wbbw.', '.wwwwwwwwwww.', 'w.wbwbwbwbw.w', 'w.wwwwwwwww.w', '..wbwbwbwbw..', '..wwwwwwwww..', '...wbwbwbw...', '...wwwwwww...', '....w...w....', '....w...w....', '...ww...ww...', '...w.....w...']
  ];
  var MOTH = [['w.w', '.w.'], ['.w.', 'www']];
  var PAL = { w: WI, b: BK };
  var PAL_INV = { w: BK, b: WI };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, p, pVis, bestP, score, combo, maxCombo, nPerfect, nGood, nMiss, nBig;
  var hitStop, over, won, timeUp, outroT, lastBeat, lastCue, demoMode, prevBest, failX, failY, resultT;
  var croakT, bigNow, puffT, myCroakT, rivalHopT, myHopT, fallT, beatPulse, offPulse, milestoneDone, ripples, taps;

  function buildEvents(demo) {
    var bars = [];
    if (demo) bars = DEMO_PAT;
    else {
      for (var b = 0; b < BARS; b++) {
        var pool = b < 3 ? POOL_A : (b < 7 ? POOL_B : POOL_C);
        bars.push(pool[Math.floor(game.random(0, pool.length)) % pool.length]);
      }
    }
    var list = [];
    for (var bb = 0; bb < bars.length; bb++) {
      for (var k = 0; k < 4; k++) {
        var c = bars[bb][k];
        if (!c) continue;
        var bi = bb * 4 + k;
        list.push({ bi: bi, t: bi * SPB, off: bi * SPB + SPB / 2, big: c === 2, shown: false, puffed: false, res: 0 });
      }
    }
    return list;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    evs = buildEvents(demo);
    p = 0; pVis = 0; bestP = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nBig = 0;
    hitStop = 0; over = false; won = false; timeUp = false; outroT = 0; lastBeat = -99; lastCue = -1;
    prevBest = game.best; failX = -999; failY = -999; resultT = 0;
    croakT = 0; bigNow = false; puffT = 0; myCroakT = 0; rivalHopT = 0; myHopT = 0; fallT = 0;
    beatPulse = 0; offPulse = 0; milestoneDone = false; ripples = []; taps = [];
  }

  function boundY(v) { return BOUND0 - v * STEP; }

  // ---- 音 ----
  function rivalVoice(big) {
    if (big) { game.audio.tone(98, 0.3, { wave: 'square', volume: 0.12, slide: -20 }); game.audio.tone(196, 0.22, { wave: 'square', volume: 0.05, slide: -40 }); }
    else { game.audio.tone(147, 0.12, { wave: 'square', volume: 0.08, slide: -30 }); game.audio.tone(294, 0.06, { wave: 'square', volume: 0.03 }); }
  }
  function myVoice(perfect) {
    game.audio.tone(262, 0.09, { wave: 'square', volume: 0.07, slide: 70 });
    if (perfect) game.audio.tone(523, 0.07, { wave: 'square', volume: 0.04, slide: 60 });
  }
  function playBeat(bi) {
    var bar = Math.floor(bi / 4), k = bi % 4;
    var row = OFFS[bar % 4];
    var hi = bar >= 7 ? 0.035 : 0.025;
    game.audio.melody([['R', 0.5], [row[k], 0.5]], { tempo: BPM, wave: 'square', volume: hi, bass: [[k === 0 || k === 2 ? ROOTS[bar % 4] : 'R', 0.5], ['R', 0.5]], bassVolume: 0.09, bassWave: 'triangle' });
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) playBeat(cue); }
    var half = Math.floor(clock / (SPB / 2));
    if (half === lastBeat) return;
    lastBeat = half;
    if (clock < 0 || half >= BEATS * 2) return;
    if (half % 2 === 0) {
      beatPulse = 1;
      if (!demoMode) game.audio.tone(half % 8 === 0 ? 1200 : 900, 0.02, { wave: 'square', volume: 0.02 });
    } else {
      offPulse = 1;
    }
  }

  // ---- 押し引き ----
  function pushForward(n, grade, e) {
    p += n; bestP = Math.max(bestP, p);
    rivalHopT = 0.28; myHopT = 0.2;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    if (e.big) nBig++;
    score += (grade === 1 ? 120 : 70) + (e.big ? 200 : 0) + Math.min(10, combo) * 10;
    var fy = boundY(pVis) + GAP;
    game.feedback.good(FROG_X, fy - 120, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: WI, size: grade === 1 ? 54 : 44,
      count: e.big ? 22 : (grade === 1 ? 14 : 8), flashColor: WI, volume: demoMode ? 0.03 : 0.15
    });
    if (!demoMode) {
      game.audio.play('se_jump', 0.25);
      if (e.big) game.fx.popup('+2', FROG_X + 170, boundY(p) - 40, { color: WI, size: 64 });
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W / 2 + 300, 330, { color: WI, size: 60 });
      if (!milestoneDone && p >= Math.ceil(GOAL / 2)) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, boundY(p) - 200, { color: WI, size: 84 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    ripples.push({ x: FROG_X, y: boundY(p) - GAP, t: 0, big: e.big });
    if (!demoMode && p >= GOAL) finishRun(true);
  }

  function pushBack(n, x, y) {
    p -= n;
    combo = 0; nMiss++;
    myHopT = 0; rivalHopT = 0;
    hitStop = 0.35; failX = x; failY = y;
    game.feedback.bad(x, y - 120, { text: 'MISS', color: WI, flashColor: WI, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (n >= 2 && !demoMode) game.fx.popup('-2', FROG_X + 170, y, { color: WI, size: 60 });
    if (!demoMode && p <= LOSE) { game.audio.play('se_break', 0.4); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8; fallT = 0;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      var left = Math.max(0, BEATS - Math.floor(clock / SPB));
      score += left * 20 + 500;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, STONE_TOP - 20 + (i % 2) * 60, { color: WI, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, steps: bestP, perfect: nPerfect, good: nGood, miss: nMiss, bigCounter: nBig, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 鳴き返す(本番の指もATTRACTのゴーストも同じ関数)
  function croak() {
    myCroakT = 0.2;
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res || !e.shown) continue;
      var d = Math.abs(clock - e.off);
      if (d <= GOOD_W && d < bd) { bd = d; best = e; }
    }
    var fy = boundY(pVis) + GAP;
    if (best) {
      var grade = bd <= PERFECT_W ? 1 : 2;
      best.res = grade;
      pushForward(best.big ? 2 : 1, grade, best);
      return grade === 1 ? 'perfect' : 'good';
    }
    // 拍の頭に声を重ねた / 黙った拍の裏 / 拍の間 → 押し込まれる
    pushBack(1, FROG_X, fy);
    return 'miss';
  }

  function stepRun(dt) {
    clock += dt;
    if (croakT > 0) croakT -= dt;
    if (puffT > 0) puffT -= dt;
    if (myCroakT > 0) myCroakT -= dt;
    if (rivalHopT > 0) rivalHopT -= dt;
    if (myHopT > 0) myHopT -= dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      // 大鳴きの予告: 1拍前から喉袋が膨らみ、低いうなり
      if (e.big && !e.puffed && clock >= e.t - SPB) {
        e.puffed = true; puffT = SPB;
        if (!demoMode) game.audio.tone(82, 0.45, { wave: 'triangle', volume: 0.1, slide: 50 });
      }
      if (!e.shown && clock >= e.t) {
        e.shown = true; croakT = e.big ? 0.38 : 0.2; bigNow = e.big; puffT = 0;
        ripples.push({ x: FROG_X, y: boundY(pVis) - GAP, t: 0, big: e.big });
        if (!demoMode) rivalVoice(e.big);
      }
      // 裏拍を過ぎても鳴き返さなかった
      if (!e.res && e.shown && clock > e.off + GOOD_W) {
        e.res = 3;
        pushBack(e.big ? 2 : 1, FROG_X, boundY(pVis) + GAP);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && !over && clock >= BARS * BAR + GOOD_W) { timeUp = true; finishRun(false); }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    taps.push({ x: x, y: y, t: 0 });
    var res = croak();
    if (res === 'perfect' || res === 'good') myVoice(res === 'perfect');
    else game.audio.tone(140, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -50 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 4, { size: sz, color: col === BK ? WI : BK, bold: true, align: a, font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a, font: 'monospace' });
  }
  function frame(x, y, w, h, th) {
    game.draw.rect(x, y, w, th, WI); game.draw.rect(x, y + h - th, w, th, WI);
    game.draw.rect(x, y, th, h, WI); game.draw.rect(x + w - th, y, th, h, WI);
  }
  // 網点の輪(1bitの波紋)
  function dotRing(x, y, r, n, sz) {
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      game.draw.rect(x + Math.cos(a) * r - sz / 2, y + Math.sin(a) * r * 0.55 - sz / 2, sz, sz, WI);
    }
  }
  // 白い円の外周だけ(内側を黒で抜く)
  function hollow(x, y, r, w) { game.draw.circle(x, y, r, WI); game.draw.circle(x, y, r - w, BK); }

  // ---- 描画 ----
  function drawPond() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 水面の網点(奥ほど細かく薄く)
    for (var j = 0; j < 26; j++) {
      var y = 250 + j * 46;
      var gap = 90 - (j % 4) * 12, len = 6 + (j % 3) * 6;
      var off = (t * (10 + j % 5 * 4) + j * 37) % gap;
      for (var x = -gap + off; x < W; x += gap) {
        if (x > STONE_X - 30 && x < STONE_X + STONE_W + 30 && y > STONE_TOP - 20 && y < STONE_BOT + 20) continue;
        game.draw.rect(x, y, len, 3, WI, 0.55);
      }
    }
    // 月の映り込み(拍の頭でふくらむ)
    var mr = 46 + beatPulse * 10;
    hollow(MOON_X, MOON_Y, mr + 10, 4);
    game.draw.circle(MOON_X, MOON_Y, mr - 6, WI);
    for (var d = 0; d < 3; d++) dotRing(MOON_X, MOON_Y, mr + 26 + d * 18, 18 + d * 6, 4);
    for (var s = 0; s < 6; s++) game.draw.rect(MOON_X - 60 + s * 24, MOON_Y + 90 + s * 18 + Math.sin(t * 2 + s) * 4, 40 - s * 4, 3, WI);
    // 蓮の葉(切れ込みのある輪)
    var pads = [[120, 520, 60], [170, 1180, 74], [950, 1000, 66], [1000, 760, 40], [90, 860, 36]];
    for (var i = 0; i < pads.length; i++) {
      var pd = pads[i], bob = Math.sin(t * 1.3 + i) * 3;
      hollow(pd[0], pd[1] + bob, pd[2], 6);
      game.draw.line(pd[0], pd[1] + bob, pd[0] + pd[2], pd[1] + bob - pd[2] * 0.3, BK, 10);
    }
    // 岸の葦(手前ほど太い線)
    for (var r = 0; r < 9; r++) {
      var rx = (r < 5 ? 20 + r * 34 : W - 20 - (r - 5) * 38), sway = Math.sin(t * 1.1 + r) * 10;
      var th = 3 + (r % 3) * 3;
      game.draw.line(rx, 1440, rx + sway, 1220 - (r % 4) * 60, WI, th);
      game.draw.rect(rx + sway - th, 1220 - (r % 4) * 60 - 50, th * 2 + 4, 50, WI);
    }
    // 蛾(2コマ)
    for (var m = 0; m < 2; m++) {
      var mx = MOON_X - 120 + Math.sin(t * 0.9 + m * 3) * 140, my = MOON_Y - 40 + Math.cos(t * 1.4 + m) * 60;
      game.draw.sprite(MOTH[Math.floor(t * 8 + m) % 2], PAL, mx, my, 7, { anchor: 'center' });
    }
  }

  function drawStone() {
    var by = boundY(pVis);
    // 石の縁(太い白線)
    game.draw.rect(STONE_X - 12, STONE_TOP - 12, STONE_W + 24, STONE_BOT - STONE_TOP + 24, WI);
    game.draw.rect(STONE_X, STONE_TOP, STONE_W, STONE_BOT - STONE_TOP, BK);
    // 相手の縄張り=細い線の疎らな網、自分の縄張り=太い線の密な網
    for (var y = STONE_TOP + 14; y < by - 6; y += 30) game.draw.rect(STONE_X + 14, y, STONE_W - 28, 2, WI, 0.6);
    for (var y2 = by + 12; y2 < STONE_BOT - 6; y2 += 16) game.draw.rect(STONE_X + 14, y2, STONE_W - 28, 5, WI, 0.8);
    // 歩数の刻み(石の左右の縁)
    for (var k = LOSE; k <= GOAL; k++) {
      var ky = boundY(k);
      var big = k === 0 || k === GOAL || k === LOSE;
      game.draw.rect(STONE_X - 44, ky - (big ? 6 : 3), big ? 30 : 18, big ? 12 : 6, WI);
      game.draw.rect(STONE_X + STONE_W + 14, ky - (big ? 6 : 3), big ? 30 : 18, big ? 12 : 6, WI);
    }
    // 境目: 石に寝かせた葦の茎
    game.draw.rect(STONE_X - 60, by - 9, STONE_W + 120, 18, BK);
    game.draw.rect(STONE_X - 60, by - 6, STONE_W + 120, 12, WI);
    game.draw.circle(STONE_X + STONE_W + 70, by, 18, WI);
  }

  function drawFrogs() {
    var t = game.time.elapsed;
    var by = boundY(pVis);
    // 相手(上・頭が下向き)
    var ry = by - GAP - (rivalHopT > 0 ? Math.sin(rivalHopT / 0.28 * Math.PI) * 30 : 0);
    var rpx = 12;
    if (over && won) {
      fallT += game.time.delta;
      var f = Math.min(1, fallT / 0.9);
      ry = by - GAP - 60 - f * 90;
      rpx = Math.max(2, 12 * (1 - f * 0.85));
      if (f < 1) dotRing(FROG_X, ry, 40 + f * 160, 24, 6);
    }
    // 大鳴きの予告: 喉袋が膨らむ(点滅する網点の輪)
    if (puffT > 0) {
      var pp = 1 - puffT / SPB;
      var pr = 30 + pp * 46;
      if (Math.floor(t * 16) % 2 === 0) dotRing(FROG_X, ry + 70, pr + 40, 22, 6);
      hollow(FROG_X - 64, ry + 52, pr * 0.7, 5);
      hollow(FROG_X + 64, ry + 52, pr * 0.7, 5);
    }
    var rfr = rivalHopT > 0 ? 2 : Math.floor(t * 1.7) % 2;
    game.draw.sprite(RIVAL[rfr], PAL, FROG_X, ry, rpx, { anchor: 'center', flipY: true });
    if (croakT > 0) {
      var cr = (bigNow ? 46 : 30) * Math.min(1, croakT / 0.12);
      game.draw.circle(FROG_X - 64, ry + 52, cr, WI);
      game.draw.circle(FROG_X + 64, ry + 52, cr, WI);
    }
    // 自分(下・頭が上向き)
    var my = by + GAP - (myHopT > 0 ? Math.sin(myHopT / 0.2 * Math.PI) * 22 : 0);
    var flash = hitStop > 0 && failX > -900;
    if (over && !won && !demoMode) my += Math.min(140, (1.8 - outroT) * 160);
    if (flash) {
      game.draw.circle(FROG_X, my, 130, WI);
      game.draw.sprite(FROG[0], PAL_INV, FROG_X, my, 15, { anchor: 'center' });
    } else {
      var mfr = myHopT > 0 ? 2 : Math.floor(t * 1.7 + 0.5) % 2;
      game.draw.sprite(FROG[mfr], PAL, FROG_X, my, 12, { anchor: 'center' });
      if (myCroakT > 0) {
        var mr = 26 * Math.min(1, myCroakT / 0.1);
        game.draw.circle(FROG_X - 60, my - 56, mr, WI);
        game.draw.circle(FROG_X + 60, my - 56, mr, WI);
      }
    }
    // 波紋
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      rp.t += game.time.delta;
      if (rp.t > 0.6) { ripples.splice(i, 1); continue; }
      dotRing(rp.x, rp.y, 80 + rp.t * (rp.big ? 420 : 260), rp.big ? 30 : 20, rp.big ? 7 : 5);
    }
  }

  function noteX(time) { return PH_X + (time - clock) * PPS; }

  function drawTimeline() {
    var y = TL_Y;
    game.draw.rect(0, y - 92, W, 184, BK);
    game.draw.rect(0, y - 92, W, 6, WI); game.draw.rect(0, y + 86, W, 6, WI);
    // 拍の線: 頭=長い線(小節頭は太い)、裏=短い点
    var b0 = Math.max(0, Math.floor(clock / SPB) - 1);
    for (var bi = b0; bi < b0 + 12 && bi <= BEATS; bi++) {
      var x = noteX(bi * SPB);
      if (x < 40 || x > W - 20) continue;
      var bar = bi % 4 === 0;
      game.draw.rect(x - (bar ? 4 : 2), y - 60, bar ? 8 : 4, 120, WI, bar ? 0.9 : 0.5);
      var ox = noteX(bi * SPB + SPB / 2);
      if (ox > 40 && ox < W - 20) game.draw.rect(ox - 3, y + 44, 6, 6, WI, 0.6);
    }
    // 相手の声(輪/大鳴きはトゲ付き二重輪)と返す場所(菱形)
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      var hx = noteX(e.t), ax = noteX(e.off);
      if (ax < 20 || hx > W + 40) continue;
      if (hx > 30) {
        if (e.big) {
          for (var s = 0; s < 8; s++) {
            var a = s / 8 * Math.PI * 2;
            game.draw.line(hx + Math.cos(a) * 34, y - 20 + Math.sin(a) * 34, hx + Math.cos(a) * 50, y - 20 + Math.sin(a) * 50, WI, 5);
          }
          hollow(hx, y - 20, 32, 6);
          game.draw.circle(hx, y - 20, 14, WI);
        } else {
          hollow(hx, y - 20, 24, 6);
        }
      }
      // 返す場所
      if (e.res === 1 || e.res === 2) {
        game.draw.circle(ax, y + 20, e.res === 1 ? 26 : 20, WI);
      } else if (e.res === 3) {
        game.draw.line(ax - 18, y + 2, ax + 18, y + 38, WI, 6);
        game.draw.line(ax + 18, y + 2, ax - 18, y + 38, WI, 6);
      } else {
        var dsz = e.big ? 22 : 16;
        game.draw.rect(ax - dsz * 0.35, y + 20 - dsz, dsz * 0.7, dsz * 2, WI);
        game.draw.rect(ax - dsz, y + 20 - dsz * 0.35, dsz * 2, dsz * 0.7, WI);
        game.draw.rect(ax - dsz * 0.7, y + 20 - dsz * 0.7, dsz * 1.4, dsz * 1.4, WI);
      }
    }
    // 再生位置(自分のカエルの頭)
    game.draw.rect(PH_X - 5, y - 86, 10, 172, WI);
    hollow(PH_X, y + 20, 34 + offPulse * 8, 5);
    game.draw.sprite(FROG[0], PAL, PH_X - 110, y, 5, { anchor: 'center' });
  }

  function drawTaps() {
    for (var i = taps.length - 1; i >= 0; i--) {
      var tp = taps[i];
      tp.t += game.time.delta;
      if (tp.t > 0.35) { taps.splice(i, 1); continue; }
      dotRing(tp.x, tp.y, 30 + tp.t * 300, 16, 6);
    }
  }

  function drawHitFlash() {
    if (hitStop <= 0 || failX < -900) return;
    var q = 1 - hitStop / 0.35;
    for (var k = 0; k < 2; k++) dotRing(failX, failY, 120 + q * 140 + k * 30, 28, 8);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, BK);
    game.draw.rect(0, 222, W, 8, WI);
    label('SCORE ' + score, 40, 74, 42, WI, 'left');
    if (combo >= 2) label('x' + combo, W - 40, 74, 42, WI, 'right');
    // 押し合いメーター(左=自分の端 / 右=相手の端)
    var mx0 = 180, mx1 = W - 180, my = 140;
    game.draw.rect(mx0, my - 5, mx1 - mx0, 10, WI);
    for (var k = LOSE; k <= GOAL; k++) {
      var kx = mx0 + (k - LOSE) / (GOAL - LOSE) * (mx1 - mx0);
      game.draw.rect(kx - 3, my - 18, 6, 36, WI);
    }
    var px = mx0 + (Math.max(LOSE, Math.min(GOAL, pVis)) - LOSE) / (GOAL - LOSE) * (mx1 - mx0);
    hollow(px, my, 26, 6);
    game.draw.sprite(FROG[0], PAL, mx0 - 70, my, 4, { anchor: 'center' });
    game.draw.sprite(RIVAL[0], PAL, mx1 + 70, my, 4, { anchor: 'center', flipY: true });
    // 残り時間(縮むバー)
    var remain = Math.max(0, Math.min(1, 1 - clock / (BARS * BAR)));
    game.draw.rect(40, 192, W - 80, 14, WI, 0.25);
    game.draw.rect(40, 192, (W - 80) * remain, 14, WI);
  }

  function drawScene() {
    drawPond();
    drawStone();
    drawFrogs();
    drawTimeline();
    drawTaps();
    drawHitFlash();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.36;
    game.draw.rect(40, y0, W - 80, hh, BK);
    frame(40, y0, W - 80, hh, 10);
    frame(60, y0 + 20, W - 120, hh - 40, 3);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, WI);
    if (timeUp) label('TIME UP', W / 2, H * 0.37, 44, WI);
    label('SCORE ' + score, W / 2, H * 0.415, 58, WI);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.46, 34, WI);
    label(Math.max(0, bestP) + ' / ' + GOAL, W / 2, H * 0.5, 44, WI);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 56, WI);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 42, WI);
    if (!won) label('あと' + Math.max(1, GOAL - Math.max(0, bestP)) + '歩!', W / 2, H * 0.585, 48, WI);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.618, 34, WI);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周は裏拍で全部返して押し戻す、偶数周は大鳴きの頭に声を重ねて押し込まれる ----
  var demo = { t: 0, x: 780, y: H * 0.9, press: false, pressT: 0, next: 0, plan: [], cyc: 0 };
  var DEMO_CYC = 2 * BAR + 0.8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++; demo.next = 0;
      var fail = demo.cyc % 2 === 0;
      demo.plan = [];
      for (var i = 0; i < evs.length; i++) demo.plan.push(fail && evs[i].big ? evs[i].t + 0.01 : evs[i].off);
    }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    if (demo.next < demo.plan.length && hitStop <= 0 && clock >= demo.plan[demo.next]) {
      croak(); demo.pressT = 0.14; demo.next++;
      taps.push({ x: demo.x, y: demo.y - 10, t: 0 });
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    offPulse = Math.max(0, offPulse - dt * 5);
    pVis += (p - pVis) * Math.min(1, dt * 12);

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y + (demo.press ? 0 : 30), { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, BK);
      game.draw.rect(0, 222, W, 8, WI);
      label(GAME_TITLE, W / 2, 104, 92 + Math.sin(t * 3) * 3, WI);
      label('HI-SCORE ' + game.best, W / 2, 182, 36, WI);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, WI);
      else label('TAP TO START', W / 2, H * 0.955, 42, WI);
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
      game.draw.rect(0, H * 0.43, W, 170, BK);
      frame(0, H * 0.43, W, 170, 6);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.43 + 115, 100, WI);
    }
    // 最初の返しの直前だけ、手を1回出す
    if (!over && evs.length && clock > evs[0].t - SPB && clock < evs[0].off + 0.25) {
      game.draw.hand(780, H * 0.9, { press: clock >= evs[0].off - 0.04, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
