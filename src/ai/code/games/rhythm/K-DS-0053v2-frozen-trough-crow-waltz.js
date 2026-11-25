// K-DS-0053v2-frozen-trough-crow-waltz.js
// 凍った水桶のカラス — 三拍子の一拍目にだけくちばしを打ち付け、水桶の縁のつららの数ぴったりで氷を割って、割れたらもう打たずに水を飲む
// 操作: 画面のどこかを押している間カラスが首を振りかぶり、離した瞬間にくちばしを氷へ打ち付ける(素早いタップは押した瞬間で判定)。三拍子の一拍目(下の大きな灯・閉じていく輪)の頭で打つとPERFECT/GOOD、つららが1本落ちる。桶の縁のつららと札の数字が残りの回数。最後の1本で氷が割れたら、桶の残りの一拍目は水を飲む拍(大きな灯に赤いトゲ印・水音)で、そこで打つと水しぶきでMISS。2拍目・3拍目や拍の外で打つ・同じ小節で二度打つのもMISS(2つ目の桶からは隣の柱のカラスが2・3拍目に鳴いて誘う)。桶ごとの小節数は つらら+1 なので一拍目を1回見送っても間に合うが、足りないまま桶の時間が終わるとMISS
// 終わり: 前奏1小節+桶4つ(つらら2→3→4→5本、168BPMの三拍子18小節・約20秒)を回り終えてMISS 2回以内ならCLEAR(判定点+連続+ぴったり割った桶のBONUS+残りの羽)。MISS 3回でカラスが凍えて納屋の屋根へ飛び去りGAME OVER
// @mechanic: count_exact
// @theme: frozen_trough_crow_waltz
// 世界観: 冬の牧場の朝、凍った水桶の縁に降りたカラスが、三拍子の一拍目ごとにくちばしで氷をつつき、縁のつららの数ぴったりで氷を割って水を飲み、隣の桶へ渡っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・ぴったり割った桶の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: PIXEL HD
var STYLE = { bg: ['#9ec9ef', '#f7d9c4'], main: ['#1d1b2e', '#a7e3ff', '#8a5a3a'], accent: ['#ffd860', '#ff6a4a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: パララックス4層(遠い雪山・納屋と森・柵・手前の雪だまり)、光源は左上の低い冬の太陽に統一(左上に縁の光・右へ長い影)、細かい多フレームのアニメ
  var SKY = STYLE.bg[0], DAWN = STYLE.bg[1], CROWK = STYLE.main[0], ICE = STYLE.main[1], WOODC = STYLE.main[2];
  var SUN = STYLE.accent[0], WARN = STYLE.accent[1];
  var WHITE = '#ffffff', SNOW = '#eef6ff', SNOWS = '#b9cce6', INK = '#141322', WOODD = '#5a3a26', WOODL = '#b98252', WATER = '#2a5a8a', BARN = '#a8383a';

  var GAME_TITLE = 'ICE PECK';
  var BPM = 168;
  var SPB = 60 / BPM;          // 1拍 約0.357秒
  var BAR = SPB * 3;           // 三拍子1小節 約1.07秒
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.1, OFF_W = 0.16;
  var TAP_MAX = 0.12;          // これより短い押しは「タップ」として押した瞬間で判定
  var READY_T = 0.8;
  var TIME_LIMIT = 21;         // 19小節 × 1.07秒 ≒ 20.4秒。放置でも READY 0.8 + 20.4 + 余韻 2.4 ≒ 24秒で終わる
  var COUNTS = [2, 3, 4, 5];
  var DEMO_COUNTS = [2, 3];
  var MISS_MAX = 3;
  var SPACING = 760;
  var TR_CX = 640;             // 今の桶の画面上の中心
  var RIM_BACK = 1060, RIM_FRONT = 1110, TR_BOT = 1330, TR_HALF = 270;
  var PECK_X = 600, PECK_Y = 1082;
  var CROW_X = 400, CROW_Y = 996, PX = 12;
  var LAMP_Y = 1700;

  // ---- スプライト(左上から光) ----
  var BODY_A = [
    '.......mmmmm....',
    '.....mmkkkkkm...',
    '...mmkkkkkkkkm..',
    '..mhhkkkkkkkkkm.',
    '.mhhkkkkkkkkkkk.',
    'mhkkkkkkkkkkkkk.',
    'kkkkkkkkkkkkkkk.',
    'kkk.kkkkkkkkkk..',
    'k....kkkkkkkk...',
    '.......f..f.....',
    '......ff..ff....'
  ];
  var BODY_B = [
    '......mmmmmm....',
    '....mmkkkkkkm...',
    '...mkkkkkkkkkm..',
    '..mhhkkkkkkkkkm.',
    '.mhhkkkkkkkkkkkk',
    'mhkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkk.',
    'kkk.kkkkkkkkkk..',
    'k....kkkkkkkk...',
    '.......f..f.....',
    '......ff..ff....'
  ];
  var BODY_FLAP = [
    '.hh.........hh..',
    '.mhh.......hhm..',
    '..mkk.mmm.kkm...',
    '...mkkkkkkkkm...',
    '..mkkkkkkkkkkm..',
    '.mkkkkkkkkkkkkk.',
    'kkkkkkkkkkkkkkk.',
    'kkk.kkkkkkkkkk..',
    'k....kkkkkkkk...',
    '.......f..f.....',
    '......ff..ff....'
  ];
  var HEAD_FWD = [
    '...mmmm.....',
    '..mhkkkm....',
    '.mkkykkkbbb.',
    '.kkkkkkkbbbb',
    '..kkkkk.....'
  ];
  var HEAD_UP = [
    '.........bb.',
    '........bbb.',
    '...mmmmbbb..',
    '..mhkkkkb...',
    '.mkkykkk....',
    '.kkkkkkk....',
    '..kkkkk.....'
  ];
  var HEAD_DOWN = [
    '...mmmm.....',
    '..mhkkkm....',
    '.mkkykkkk...',
    '.kkkkkkkkb..',
    '..kkkkk.bbb.',
    '.........bb.',
    '..........b.'
  ];
  var CROW_PAL = { k: CROWK, m: '#34315a', h: '#8a88c8', b: '#5a5a6e', y: SUN, f: '#9a7a5a' };
  var CROW_FLASH = { k: WHITE, m: WHITE, h: WHITE, b: WHITE, y: WHITE, f: WHITE };
  var ICICLE = ['hii', 'hii', '.ii', '.ii', '.i.', '.i.'];
  var ICI_PAL = { h: WHITE, i: ICE };
  var FEATHER = ['..m.', '.mk.', '.hk.', 'mkk.', 'hk..', 'k...'];
  var FLAKE = ['.w.', 'www', '.w.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, troughs, slots, nBars, endT, running, songT, schedB, beatN, readyT, realT, hitStop;
  var pressing, pressT, crow, falls;
  var score, combo, maxCombo, perfects, goods, misses, exact, bonuses, over, won, outroT, prevBest, beatPulse;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var counts = demoMode ? DEMO_COUNTS : COUNTS;
    var bar = demoMode ? 0 : 1;   // 本番は前奏1小節
    troughs = []; slots = [];
    for (var k = 0; k < counts.length; k++) {
      var tr = { n: counts[k], rem: counts[k], start: bar, last: bar + counts[k], broken: false, brokeT: 0, over: false, short: false, done: false, slots: [], cracks: [], drank: false };
      for (var b = tr.start; b <= tr.last; b++) {
        var s = { t: b * BAR, k: k, bar: b, res: '' };
        slots.push(s); tr.slots.push(s);
      }
      tr.hopStart = tr.last * BAR + SPB;
      tr.hopEnd = (tr.last + 1) * BAR;
      troughs.push(tr);
      bar = tr.last + 1;
    }
    nBars = bar;
    endT = nBars * BAR;
    running = demoMode; songT = demoMode ? -0.3 : 0; schedB = 0; beatN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    pressing = false; pressT = 0;
    crow = { peckT: 0, drinkT: 0, flashT: 0, shiverT: 0, flyT: 0 };
    falls = [];
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; exact = 0; bonuses = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; beatPulse = 0;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル、ニ短調のワルツ。ズン・チャッ・チャッ) ----
  var MEL = [['A4', 'D5', 'F5'], ['G5', 'F5', 'D5'], ['E5', 'C#5', 'A4'], ['D5', 'F5', 'A5'],
    ['Bb5', 'A5', 'F5'], ['G5', 'Bb5', 'D5'], ['C#5', 'E5', 'A5'], ['D5', 'R', 'R']];
  var ROOTS = ['D2', 'G2', 'A2', 'D2', 'Bb1', 'G2', 'A2', 'D2'];
  var PAH = ['F3', 'Bb3', 'C#4', 'F3', 'D4', 'Bb3', 'C#4', 'F3'];
  function curTrough(b) {
    for (var k = 0; k < troughs.length; k++) if (b >= troughs[k].start && b <= troughs[k].last) return k;
    return -1;
  }
  function playBeat(n) {
    if (demoMode) return;
    var bar = Math.floor(n / 3), i = n % 3, h = bar % 8;
    var mel = bar === 0 ? 'R' : MEL[h][i];
    var bass = i === 0 ? [[ROOTS[h], 1]] : [[PAH[h], 0.4], ['R', 0.6]];
    game.audio.melody([[mel, 1]], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: bass, bassWave: i === 0 ? 'triangle' : 'square', bassVolume: i === 0 ? 0.17 : 0.035 });
    if (i === 0) game.audio.melody([[2093, 0.15], ['R', 0.85]], { tempo: BPM, wave: 'sine', volume: 0.05 });
    // 2つ目の桶からは隣の柱のカラスが2・3拍目に鳴いて誘う(数えない)
    var k = curTrough(bar);
    if (i > 0 && k >= 1) game.audio.melody([[i === 1 ? 560 : 500, 0.35], ['R', 0.65]], { tempo: BPM, wave: 'sawtooth', volume: 0.03 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    var nb = nBars * 3;
    while (schedB < nb && songT >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < nb && songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
    for (var k = 0; k < troughs.length; k++) {
      var tr = troughs[k];
      if (tr.done) continue;
      var lastT = tr.last * BAR;
      if (songT > lastT + OFF_W + 0.15) {
        tr.done = true;
        if (tr.broken && !tr.over) {
          exact++; bonuses++;
          score += 200;
          game.fx.popup('BONUS', TR_CX, RIM_BACK - 260, { color: SUN, size: 64 });
          if (!demoMode) game.audio.play('se_milestone', 0.45);
        } else if (!tr.broken) {
          tr.short = true;
          missAt('short', tr);
          if (over || hitStop > 0) return;
        }
      }
    }
    if (songT >= endT + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function onBeat(n) {
    beatPulse = 1;
    var bar = Math.floor(n / 3), i = n % 3;
    var k = curTrough(bar);
    if (k < 0) return;
    var tr = troughs[k];
    // 割れた桶の残りの一拍目は水を飲む拍
    if (i === 0 && tr.broken && bar > 0 && songT > tr.brokeT + 0.2) {
      crow.drinkT = 0.5;
      sfx(330, 0.12, { wave: 'sine', volume: 0.06, slide: 120 });
    }
  }

  function camAt(t) {
    for (var k = 0; k < troughs.length - 1; k++) {
      var tr = troughs[k];
      if (t < tr.hopStart) return k;
      if (t < tr.hopEnd) { var u = (t - tr.hopStart) / (tr.hopEnd - tr.hopStart); return k + u * u * (3 - 2 * u); }
    }
    return troughs.length - 1;
  }
  function hopArc(t) {
    for (var k = 0; k < troughs.length - 1; k++) {
      var tr = troughs[k];
      if (t >= tr.hopStart && t < tr.hopEnd) return Math.sin((t - tr.hopStart) / (tr.hopEnd - tr.hopStart) * Math.PI) * 150;
    }
    return 0;
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function peckAt(t) {
    if (!running || over || hitStop > 0) return;
    crow.peckT = 0.2;
    if (t < BAR - OFF_W && !demoMode) { sfx(900, 0.03, { wave: 'square', volume: 0.03 }); return; }   // 前奏の小節は素振り(罰なし)
    var best = null, bd = 9;
    for (var i = 0; i < slots.length; i++) {
      var d = Math.abs(t - slots[i].t);
      if (d < bd) { bd = d; best = slots[i]; }
    }
    if (!best || bd > OFF_W) { missAt('off', null); return; }
    var tr = troughs[best.k];
    if (best.res) { missAt('double', tr); return; }
    if (tr.broken) { best.res = 'over'; tr.over = true; missAt('splash', tr); return; }
    if (bd > GOOD_W) { best.res = 'miss'; missAt('off', tr); return; }
    hitAt(best, tr, bd);
  }

  function icicleX(tr, j) { return TR_CX - TR_HALF + 70 + j * ((TR_HALF * 2 - 140) / Math.max(1, tr.n - 1)); }

  function hitAt(s, tr, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    s.res = w;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 60) + combo * 10;
    tr.rem--;
    var j = tr.rem;
    falls.push({ x: icicleX(tr, j), y: RIM_FRONT + 30, vy: 0 });
    var ang = tr.n - tr.rem;
    tr.cracks.push({ a: ang * 1.7, l: 60 + ang * 22 });
    if (demoMode) game.fx.popup(w, PECK_X, PECK_Y - 200, { color: SUN, size: 52 });
    else game.feedback.good(PECK_X, PECK_Y - 200, { text: w, color: w === 'PERFECT' ? SUN : WHITE, size: w === 'PERFECT' ? 56 : 46, count: 10 });
    game.fx.burst(PECK_X, PECK_Y, { color: ICE, count: 10, speed: 280 });
    sfx(1760, 0.04, { wave: 'square', volume: 0.06 });
    sfx(2637, 0.07, { wave: 'triangle', volume: 0.05 });
    if (tr.rem <= 0) {
      tr.broken = true; tr.brokeT = songT;
      game.fx.burst(PECK_X + 40, PECK_Y, { color: WHITE, count: 22, speed: 420 });
      game.fx.burst(PECK_X + 40, PECK_Y, { color: WATER, count: 12, speed: 260 });
      if (!demoMode) { game.audio.play('se_break', 0.5); game.fx.popup('CLEAR', TR_CX, RIM_BACK - 320, { color: ICE, size: 60 }); }
    }
  }

  function missAt(why, tr) {
    misses++; combo = 0;
    hitStop = 0.4; crow.flashT = 0.45; crow.shiverT = 1.0;
    var mx = PECK_X, my = PECK_Y - 220;
    if (why === 'splash') game.fx.burst(PECK_X + 40, PECK_Y, { color: WATER, count: 18, speed: 380 });
    sfx(130, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -40 });
    var txt = why === 'short' && tr ? 'あと' + tr.rem : 'MISS';
    if (demoMode) { game.fx.popup(txt, mx, my, { color: WARN, size: 62 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(mx, my, { text: txt, shake: 10, flashColor: WHITE });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.4; running = false;
    if (ok) {
      score += (MISS_MAX - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 7; i++) game.fx.burst(140 + i * 135, 700 + (i % 3) * 160, { color: [SUN, ICE, WHITE, WARN][i % 4], count: 16, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
      crow.flyT = 0.01;
    }
  }

  function tickWorld(dt) {
    if (crow.flashT > 0) crow.flashT -= dt;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (crow.peckT > 0) crow.peckT -= dt;
    if (crow.drinkT > 0) crow.drinkT -= dt;
    if (crow.shiverT > 0) crow.shiverT -= dt;
    for (var i = falls.length - 1; i >= 0; i--) {
      var f = falls[i];
      f.vy += 2600 * dt; f.y += f.vy * dt;
      if (f.y > TR_BOT + 60) { game.fx.burst(f.x, TR_BOT + 60, { color: ICE, count: 6, speed: 160 }); falls.splice(i, 1); }
    }
    stepPlay(dt);
  }

  // ---- 入力: 押す=振りかぶる / 離す=打ち付ける ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || y < 230) return;
    pressing = true; pressT = songT;
    if (readyT <= 0) game.audio.tone(440, 0.04, { wave: 'triangle', volume: 0.03, slide: 200 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    pressing = false;
    if (over || readyT > 0 || !running) return;
    var t = songT - pressT < TAP_MAX ? pressT : songT;
    game.audio.tone(1200, 0.03, { wave: 'square', volume: 0.03 });
    peckAt(t);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ring(x, y, r, col, w) {
    for (var i = 0; i < 24; i++) {
      var a1 = i / 24 * Math.PI * 2, a2 = (i + 1) / 24 * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w);
    }
  }
  function pixMountain(cx, base, hw, hgt, col, cap) {
    for (var y = 0; y < hgt; y += 8) {
      var w = hw * (1 - y / hgt);
      game.draw.rect(Math.round((cx - w) / 8) * 8, base - y - 8, Math.round(w * 2 / 8) * 8, 8, y > hgt * 0.62 ? cap : col);
    }
  }
  function pine(x, base, s) {
    for (var i = 0; i < 4; i++) {
      var w = (4 - i) * 22 * s;
      game.draw.rect(x - w, base - (i + 1) * 34 * s, w * 2, 34 * s, '#3c5a5e');
      game.draw.rect(x - w, base - (i + 1) * 34 * s, w * 0.8, 10 * s, SNOW);
    }
    game.draw.rect(x - 8 * s, base, 16 * s, 20 * s, WOODD);
  }

  function drawWorld(cam) {
    var t = game.time.elapsed;
    // 第0層: 空と低い冬の太陽(光源)
    game.draw.gradient(230, 900, [[0, SKY], [0.75, DAWN], [1, '#ffe6d0']]);
    game.draw.circle(170, 380, 120, SUN, 0.12);
    game.draw.circle(170, 380, 80, SUN, 0.25);
    game.draw.circle(170, 380, 46, '#fff4c0');
    // 第1層: 遠い雪山
    var o1 = -(cam * SPACING * 0.12) % 1400;
    for (var m = 0; m < 4; m++) pixMountain(o1 + m * 480 + 120, 860, 300, 300 - (m % 2) * 80, '#8aa6c8', SNOW);
    // 第2層: 納屋・サイロ・針葉樹
    var o2 = -(cam * SPACING * 0.4) % 1600;
    for (var r = 0; r < 3; r++) {
      var bx = o2 + r * 800 + 560;
      game.draw.rect(bx, 740, 220, 150, BARN);
      game.draw.rect(bx, 740, 60, 150, '#c85050');
      for (var rf = 0; rf < 6; rf++) game.draw.rect(bx - 16 + rf * 16, 700 + rf * 8, 252 - rf * 32, 8, SNOW);
      game.draw.rect(bx + 80, 800, 60, 90, '#6a2028');
      game.draw.rect(bx + 250, 660, 80, 230, '#9aa0b0');
      game.draw.rect(bx + 250, 660, 24, 230, '#c4c8d4');
      game.draw.circle(bx + 290, 660, 40, SNOW);
      pine(bx - 120, 880, 1); pine(bx + 400, 880, 0.8);
    }
    // 雪の地面
    game.draw.gradient(880, 1440, [[0, SNOW], [1, '#d6e6fa']]);
    for (var d = 0; d < 40; d++) game.draw.rect((((d * 211 - cam * SPACING) % 1100) + 1100) % 1100, 900 + (d * 67) % 520, 8, 8, SNOWS);
    // 第3層: 柵と隣の柱(誘いのカラス)
    var o3 = -cam * SPACING;
    for (var f = -1; f < 12; f++) {
      var fx = ((o3 + f * 190) % 2280 + 2280) % 2280 - 200;
      game.draw.rect(fx, 880, 26, 150, WOODD);
      game.draw.rect(fx, 880, 8, 150, WOODL);
      game.draw.rect(fx, 872, 26, 10, SNOW);
    }
    game.draw.rect(0, 910, W, 16, WOODD); game.draw.rect(0, 910, W, 5, WOODL);
    game.draw.rect(0, 970, W, 16, WOODD); game.draw.rect(0, 970, W, 5, WOODL);
    // 降る雪(ちらつき)
    for (var s = 0; s < 18; s++) {
      var sx = (s * 137 + Math.sin(t + s) * 30 + t * 20) % W, sy = 240 + ((s * 97 + t * 60) % 1200);
      game.draw.sprite(FLAKE, { w: WHITE }, sx, sy, s % 3 === 0 ? 6 : 4, { anchor: 'center', alpha: 0.8 });
    }
  }

  function drawDecoy(cam) {
    var k = Math.floor(cam + 0.5);
    if (k < 1) return;
    var cawing = running && beatN >= 0 && beatN % 3 !== 0 && curTrough(Math.floor(beatN / 3)) >= 1 && songT - beatN * SPB < 0.2;
    var x = 960, y = 820;
    game.draw.rect(x - 20, 840, 40, 190, WOODD);
    game.draw.rect(x - 20, 840, 12, 190, WOODL);
    game.draw.sprite(BODY_A, CROW_PAL, x, y, 6, { anchor: 'center', flipX: true });
    game.draw.sprite(cawing ? HEAD_UP : HEAD_FWD, CROW_PAL, x - 22, y - 32, 6, { anchor: 'center', flipX: true });
    if (cawing) for (var n = 0; n < 3; n++) game.draw.line(x - 70 - n * 16, y - 60 - n * 6, x - 86 - n * 16, y - 70 - n * 6, INK, 4);
  }

  function drawTrough(k, sx) {
    var tr = troughs[k];
    if (!tr) return;
    var L = sx - TR_HALF, R = sx + TR_HALF;
    // 右へ伸びる長い影(光源は左上)
    game.draw.rect(L + 60, TR_BOT - 10, TR_HALF * 2 + 90, 40, '#9fb4d4', 0.6);
    // 氷の面(奥の縁〜手前の縁)
    if (!tr.broken) {
      game.draw.rect(L + 10, RIM_BACK, TR_HALF * 2 - 20, RIM_FRONT - RIM_BACK, ICE);
      game.draw.rect(L + 10, RIM_BACK, TR_HALF * 2 - 20, 10, WHITE);
      for (var g = 0; g < 6; g++) game.draw.rect(L + 40 + g * 80, RIM_BACK + 18 + (g % 2) * 12, 40, 6, '#d6f4ff');
      for (var c = 0; c < tr.cracks.length; c++) {
        var cr = tr.cracks[c];
        var ex = PECK_X - TR_CX + sx + Math.cos(cr.a) * cr.l, ey = PECK_Y + Math.sin(cr.a) * cr.l * 0.25;
        game.draw.line(PECK_X - TR_CX + sx, PECK_Y, ex, ey, '#4a7aa8', 5);
        game.draw.line(ex, ey, ex + Math.cos(cr.a + 0.8) * 30, ey + 6, '#4a7aa8', 3);
      }
    } else {
      game.draw.rect(L + 10, RIM_BACK, TR_HALF * 2 - 20, RIM_FRONT - RIM_BACK, WATER);
      game.draw.rect(L + 10, RIM_BACK, TR_HALF * 2 - 20, 8, '#4a8ac0');
      var tt = game.time.elapsed;
      for (var w = 0; w < 3; w++) {
        var rr = ((tt * 60 + w * 40) % 120);
        game.draw.rect(PECK_X - TR_CX + sx + 40 - rr, RIM_BACK + 26 + w * 6, rr * 2, 4, '#8ac4ee', 1 - rr / 120);
      }
      game.draw.rect(L + 20, RIM_BACK + 4, 90, 22, ICE);
      game.draw.rect(R - 130, RIM_BACK + 8, 100, 20, ICE);
    }
    // 桶の板(左上の光)
    game.draw.rect(L - 12, RIM_BACK - 12, 24, TR_BOT - RIM_BACK + 12, WOODD);
    game.draw.rect(R - 12, RIM_BACK - 12, 24, TR_BOT - RIM_BACK + 12, WOODD);
    game.draw.rect(L, RIM_FRONT, TR_HALF * 2, TR_BOT - RIM_FRONT, WOODC);
    for (var p = 0; p < 4; p++) {
      game.draw.rect(L, RIM_FRONT + p * 55, TR_HALF * 2, 6, WOODL);
      game.draw.rect(L, RIM_FRONT + p * 55 + 49, TR_HALF * 2, 6, WOODD);
    }
    game.draw.rect(L - 12, RIM_FRONT - 10, TR_HALF * 2 + 24, 16, WOODL);
    game.draw.rect(L - 12, RIM_FRONT - 10, TR_HALF * 2 + 24, 5, '#e0b080');
    game.draw.rect(L - 12, RIM_BACK - 14, TR_HALF * 2 + 24, 10, '#c89a6a');
    // 縁のつらら = 残りの回数
    for (var j = 0; j < tr.rem; j++) {
      var ix = icicleX(tr, j) - TR_CX + sx;
      var sw = Math.sin(game.time.elapsed * 3 + j) * 2;
      game.draw.sprite(ICICLE, ICI_PAL, ix + sw, RIM_FRONT + 38, 14, { anchor: 'center' });
    }
    // 札(残りの数字)
    var tx = R - 70, ty = RIM_FRONT + 120;
    game.draw.line(tx, RIM_FRONT, tx, ty - 40, INK, 4);
    game.draw.rect(tx - 44, ty - 40, 88, 80, WOODD);
    game.draw.rect(tx - 38, ty - 34, 76, 68, '#f2e2c4');
    label(String(tr.rem), tx, ty + 22, 56, tr.broken ? '#4a8ac0' : INK);
  }

  function drawCrow(cam) {
    var t = game.time.elapsed;
    var arc = hopArc(songT);
    var fly = crow.flyT > 0 ? crow.flyT : 0;
    var cx = CROW_X + fly * 500, cy = CROW_Y - arc - fly * fly * 900;
    var shiver = crow.shiverT > 0 ? Math.sin(t * 60) * 4 : 0;
    var lunge = crow.peckT > 0 ? Math.sin(crow.peckT / 0.2 * Math.PI) : 0;
    cx += lunge * 26 + shiver; cy += lunge * 30;
    var pal = crow.flashT > 0 && Math.floor(crow.flashT * 20) % 2 === 0 ? CROW_FLASH : CROW_PAL;
    var sc = crow.flashT > 0 ? 1.25 : 1;
    // 影(右へ)
    if (fly <= 0) game.draw.rect(cx - 20 + 70, CROW_Y + 64, 200 - arc * 0.5, 16, '#7a90b4', 0.5);
    var body = fly > 0 || arc > 20 ? BODY_FLAP : (Math.floor(t * 2.6) % 2 ? BODY_A : BODY_B);
    game.draw.sprite(body, pal, cx, cy, PX * sc, { anchor: 'center' });
    var head = HEAD_FWD, hx = cx + 64, hy = cy - 62;
    if (demoMode ? demo.hold : pressing) { head = HEAD_UP; hx = cx + 44; hy = cy - 96; }
    if (crow.peckT > 0 || crow.drinkT > 0) { head = HEAD_DOWN; hx = cx + 96 + lunge * 20; hy = cy - 6 + lunge * 20; }
    game.draw.line(cx + 40, cy - 30, hx - 10, hy + 10, pal.k, 54 * sc);
    game.draw.line(cx + 34, cy - 40, hx - 20, hy, pal.h, 8);
    game.draw.sprite(head, pal, hx, hy, PX * sc, { anchor: 'center' });
    // 白い息
    if (Math.floor(t * 1.5) % 3 === 0 && fly <= 0) game.draw.circle(hx + 80 + (t * 40) % 40, hy - 10 - (t * 30) % 30, 14, WHITE, 0.4);
  }

  function drawLamps() {
    // 親指ゾーン: 手前の雪だまりと三拍子の灯(大=一拍目、小=2・3拍目)
    game.draw.gradient(1440, H, [[0, '#dfeafa'], [1, '#a9bedc']]);
    for (var b = 0; b < 14; b++) game.draw.rect(b * 80, 1440 + Math.sin(b * 1.7) * 10, 90, 24, WHITE);
    var bar = Math.max(0, Math.floor(Math.max(0, songT) / BAR));
    var pos = songT / SPB - bar * 3;
    var k = curTrough(bar), tr = k >= 0 ? troughs[k] : null;
    var xs = [300, 610, 820], rs = [96, 52, 52];
    var nextBar = songT - bar * BAR > OFF_W ? bar + 1 : bar;
    var kn = curTrough(nextBar), trn = kn >= 0 ? troughs[kn] : null;
    var danger = !!(trn && trn.broken);
    for (var i = 0; i < 3; i++) {
      var now = running && beatN === bar * 3 + i;
      var col = i === 0 ? (danger ? WARN : SUN) : ICE;
      game.draw.circle(xs[i] + 6, LAMP_Y + 8, rs[i], '#7a8aa8', 0.5);
      game.draw.circle(xs[i], LAMP_Y, rs[i], INK);
      game.draw.circle(xs[i], LAMP_Y, rs[i] - 10, now ? col : '#5a6a88');
      game.draw.circle(xs[i] - rs[i] * 0.3, LAMP_Y - rs[i] * 0.3, rs[i] * 0.22, WHITE, now ? 0.8 : 0.3);
      if (now) ring(xs[i], LAMP_Y, rs[i] + 10 + beatPulse * 14, WHITE, 4);
    }
    // 次の一拍目へ閉じていく輪
    if (running) {
      var lead = (bar + 1) * BAR - songT;
      var lk = clamp(lead / BAR, 0, 1);
      ring(xs[0], LAMP_Y, rs[0] + lk * 180, danger ? WARN : SUN, 6);
    }
    if (danger) {
      for (var sp = 0; sp < 8; sp++) {
        var a = sp / 8 * Math.PI * 2 + game.time.elapsed * 2;
        game.draw.line(xs[0], LAMP_Y - 150, xs[0] + Math.cos(a) * 46, LAMP_Y - 150 + Math.sin(a) * 46, WARN, 10);
      }
      game.draw.circle(xs[0], LAMP_Y - 150, 22, WATER);
    }
    if (running && pos >= 0 && pos < 3) {
      var px = pos < 1 ? lerp(xs[0], xs[1], pos) : (pos < 2 ? lerp(xs[1], xs[2], pos - 1) : lerp(xs[2], 1000, pos - 2));
      game.draw.rect(px - 4, LAMP_Y + 120, 8, 40, INK);
    }
    if (tr) for (var f = 0; f < tr.n; f++) game.draw.sprite(ICICLE, f < tr.rem ? ICI_PAL : { h: '#7a8aa8', i: '#7a8aa8' }, 140 + f * 50, 1860, 6, { anchor: 'center' });
  }

  function drawScene() {
    var cam = camAt(songT);
    drawWorld(cam);
    drawDecoy(cam);
    var base = Math.floor(cam);
    for (var k = base - 1; k <= base + 1; k++) {
      if (k < 0 || k >= troughs.length) continue;
      drawTrough(k, TR_CX + (k - cam) * SPACING);
    }
    drawCrow(cam);
    for (var i = 0; i < falls.length; i++) game.draw.sprite(ICICLE, ICI_PAL, falls[i].x, falls[i].y, 14, { anchor: 'center' });
    drawLamps();
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.04);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK);
    game.draw.rect(0, 222, W, 8, '#34315a');
    label('SCORE ' + score, 40, 92, 52, WHITE, 'left');
    label('BEST ' + prevBest, 40, 160, 32, SUN, 'left');
    var doneN = 0;
    for (var k = 0; k < troughs.length; k++) if (troughs[k].broken) doneN++;
    label(doneN + ' / ' + troughs.length, W - 40, 92, 52, ICE, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(FEATHER, i < MISS_MAX - misses ? CROW_PAL : { m: '#444', k: '#333', h: '#555' }, W - 190 + i * 60, 165, 9, { anchor: 'center' });
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(0, 222, W * progress, 8, SUN);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.37;
    game.draw.rect(64, y0, W - 128, hh, INK, 0.92);
    game.draw.rect(64, y0, W - 128, 8, won ? SUN : WARN);
    game.draw.rect(64, y0 + hh - 8, W - 128, 8, ICE);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, won ? SUN : WARN);
    label('SCORE ' + score, W / 2, H * 0.36, 60, WHITE);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, ICE);
    label(exact + ' / ' + troughs.length, W / 2, H * 0.45, 54, WHITE);
    label('BONUS x' + bonuses + '   COMBO ' + maxCombo, W / 2, H * 0.495, 38, SUN);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 58, SUN);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 42, SUN);
    if (!won) {
      var left = 0;
      for (var k = 0; k < troughs.length; k++) if (!troughs[k].broken) left++;
      label('あと' + Math.max(1, left) + '個', W / 2, H * 0.21, 60, WARN);
    }
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 36, WHITE);
  }

  // ---- ATTRACT: ゴーストが2・3拍目で押して振りかぶり、一拍目で離して打つ。1つ目の桶は2回で割って水の拍は待つ。2つ目の桶は割れた後の一拍目でも打って水しぶきMISS ----
  var demo = { t: 0, hold: false, done: {} };
  var DEMO_LEN = 7 * BAR + 1.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.hold = false; }
    tickWorld(dt);
    if (!running || hitStop > 0) return;
    var next = null;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i], tr = troughs[s.k];
      var want = !s.res && !demo.done[i] && (s.k === 1 || !tr.broken);
      if (want && s.t > songT - 0.05) { next = { s: s, i: i }; break; }
    }
    demo.hold = !!(next && next.s.t - songT < SPB * 1.6 && next.s.t - songT > -0.05);
    if (next && songT >= next.s.t - 0.008) {
      demo.done[next.i] = true; demo.hold = false;
      peckAt(songT);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(560, demo.hold ? 1640 : 1600, { press: demo.hold, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK);
      game.draw.rect(0, 222, W, 8, '#34315a');
      label(GAME_TITLE, W / 2, 124 + Math.sin(t * 3) * 4, 100, Math.floor(t * 3) % 2 ? ICE : WHITE);
      label('HI-SCORE ' + game.best, W / 2, 202, 34, SUN);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.94, 46, INK);
      else label('TAP TO START', W / 2, H * 0.94, 42, '#34315a');
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
      if (hitStop > 0) hitStop -= dt;
      else if (crow.flyT > 0) crow.flyT += dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, exact: exact, troughs: troughs.length, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
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
    if (readyT > 0) {
      game.draw.rect(0, H * 0.4, W, 170, INK, 0.85);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 118, 110, SUN);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.5, 100, won ? SUN : WARN);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
