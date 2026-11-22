// K-DS-0033v2-ice-hole-float-lift.js
// 氷穴の浮き上げ — 跳ねる8分(タータ)ごとに揺れる浮きが沈む拍に、ぎりぎり合わせて竿を上げる。早すぎると浮きが当たりの線まで「あと何cm」だったかが残る
// 操作: 画面のどこかを押して上へはじくと竿を上げる(はじきが一定の長さに届いた瞬間で判定)。浮きは跳ねる8分ごとに小さく揺れ、魚が寄ると沈む1拍前から2回つつかれ(コツ・コツ+氷下の影+下の譜面の魚印)、沈む拍の頭で黄色い当たり線を越える。その瞬間に上げるとPERFECT/GOOD(近いほど加点)。早上げは「あと○cm」と線で差を見せてMISS、上げ遅れは餌を取られてMISS。沈む位置は前半が拍の頭、後半は跳ねた裏(3連の3つ目)が増え、沈む速さも上がる
// 終わり: 6小節(100BPM・約14秒・8尾)を終えて MISS 2回以内ならCLEAR(判定の点+近さの点、最後の金の魚は2倍)。MISS 3回でGAME OVER
// @mechanic: near_miss
// @theme: ice_hole_float_lift
// 世界観: 凍った湖の穴釣りで、防寒着の釣り人が氷の穴に浮かぶ浮きを見つめ、跳ねる拍で揺れる浮きが当たりの線を越える一瞬にぎりぎりまで引きつけて竿を上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・釣った尾数・PERFECT/GOOD/MISS数・いちばん惜しかった差(cm)
// スタイル: 8bit PC MONITOR
var STYLE = { bg: ['#000000', '#2040c0'], main: ['#40d0e0', '#f0f0f0', '#30c050'], accent: ['#f0e040', '#d03030'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ・細い線・枠線のテキスト窓UI。中間色は市松ディザで作る
  var C = {
    black: STYLE.bg[0], blue: STYLE.bg[1], cyan: STYLE.main[0], white: STYLE.main[1], green: STYLE.main[2],
    yellow: STYLE.accent[0], red: STYLE.accent[1], magenta: '#c040c0'
  };

  var GAME_TITLE = 'ICE HOLE';
  var BPM = 100;
  var SPB = 60 / BPM;            // 1拍 = 0.6秒
  var SW = 2 / 3;                // 跳ねる8分: 長(2/3拍)+短(1/3拍)
  var BAR = 4;
  var BARS = 6;                  // 24拍 = 14.4秒
  var PERFECT_W = 0.05;
  var GOOD_W = 0.13;
  var EARLY_MAX = 0.6;           // これより前の早上げは「その魚」の早合わせ
  var MISS_MAX = 3;
  var HIT_STOP = 0.45;
  var FLICK_PX = 50;
  var BITE_CM = 20;              // 当たり線の深さ
  var PX_CM = 9;

  // 沈む拍(拍単位)。x + SW は跳ねた裏
  var PLANS = [
    [3, 6, 9, 11 + SW, 14, 16 + SW, 19 + SW, 22],
    [3, 6, 8 + SW, 11, 13 + SW, 16 + SW, 19, 21 + SW]
  ];
  var DEMO_PLAN = [2, 4 + SW, 7];
  var DEMO_BEATS = 9;

  // 伴奏(オリジナル)。1小節 = 跳ねる8分 x8(長・短の組)と4分のウォーキングベース
  var MEL = [
    ['A4', 'R', 'C5', 'A4', 'E5', 'R', 'D5', 'C5'],
    ['B4', 'R', 'D5', 'B4', 'E5', 'R', 'G4', 'R'],
    ['A4', 'C5', 'E5', 'R', 'G5', 'E5', 'D5', 'R'],
    ['C5', 'R', 'B4', 'A4', 'G4', 'R', 'E4', 'R'],
    ['A4', 'R', 'C5', 'A4', 'E5', 'G5', 'A5', 'R'],
    ['G5', 'E5', 'D5', 'R', 'C5', 'B4', 'A4', 'R']
  ];
  var BASS = [
    ['A2', 'C3', 'E3', 'G3'], ['E2', 'G2', 'B2', 'D3'], ['F2', 'A2', 'C3', 'E3'],
    ['E2', 'G#2', 'B2', 'E3'], ['A2', 'C3', 'E3', 'G3'], ['D3', 'E3', 'E2', 'A2']
  ];

  // ---- 配置 ----
  var ICE_TOP = H * 0.42, ICE_BOT = ICE_TOP + 60;
  var HOLE_X = W * 0.5, HOLE_W = 150;
  var SURF_Y = ICE_TOP + 40;                    // 穴の水面(浮きの休む高さ)
  var LINE_Y = SURF_Y + BITE_CM * PX_CM;        // 当たり線
  var GAUGE_X = W * 0.83;
  var TL_Y = H * 0.705, TL_X0 = 300, TL_PX = 230; // 下の譜面(1拍 = 230px)
  var GRIP_X = W / 2, GRIP_Y = H * 0.87;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var soundOn = false; // 最初の入力までは音を積まない

  var demoMode, sinks, totalBeats, running, songT, gridN, nextBar, readyT;
  var hitStop, flashT, flashKind, liftT, twitchT, padT, nibT, ripT, beatFlash, gap, gapT, gapKind, catchT;
  var score, caught, perfects, goods, misses, streak, maxStreak, closest, over, won, outroT, prevBest, milestone;
  var flick;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = isDemo ? DEMO_PLAN : PLANS[Math.floor(game.random(0, PLANS.length)) % PLANS.length];
    sinks = [];
    for (var i = 0; i < src.length; i++) {
      var dd = isDemo ? 0.3 : 0.3 - i * 0.02;   // 沈む速さ(後半ほど速い)
      sinks.push({ beat: src[i], t: src[i] * SPB, dd: dd, res: '', gold: !isDemo && i === src.length - 1, nib: [false, false] });
    }
    totalBeats = isDemo ? DEMO_BEATS : BAR * BARS;
    running = false; songT = 0; gridN = -1; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashKind = ''; liftT = 0; twitchT = 0; padT = 0; nibT = 0; ripT = 0; beatFlash = 0;
    gap = 0; gapT = 0; gapKind = ''; catchT = 0;
    score = 0; caught = 0; perfects = 0; goods = 0; misses = 0; streak = 0; maxStreak = 0; closest = -1;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    flick = null;
    if (isDemo) running = true;
  }

  function vol() { return demoMode ? 0.45 : 1; }
  function beep(f, d, o) { if (soundOn) game.audio.tone(f, d, o); }

  function playBar(b) {
    if (!soundOn) return;
    var m = MEL[b % MEL.length], mel = [], bass = [];
    for (var i = 0; i < m.length; i++) mel.push([m[i], i % 2 === 0 ? SW : 1 - SW]);
    var bl = BASS[b % BASS.length];
    for (var j = 0; j < bl.length; j++) bass.push([bl[j], 1]);
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.026 * vol(), bass: bass, bassWave: 'triangle', bassVolume: 0.065 * vol() });
  }

  // 跳ねる8分の格子(拍の頭と 2/3 拍目)
  function gridTime(n) { return (Math.floor(n / 2) + (n % 2 ? SW : 0)) * SPB; }

  // 次の(未決の)沈み
  function pendingSink() {
    for (var i = 0; i < sinks.length; i++) if (!sinks[i].res) return sinks[i];
    return null;
  }

  // 浮きの深さ(cm)。沈む拍の頭でちょうど当たり線に届く
  function floatDepth() {
    var sk = pendingSink();
    var base = 0;
    if (sk && running) {
      var u = songT - (sk.t - sk.dd);
      if (u >= 0) base = BITE_CM * u / sk.dd;
    }
    if (catchT > 0) base = 0;
    var bob = beatFlash * 3 + nibT * 9;
    return Math.min(46, base + bob);
  }

  // ---- 拍クロック(1本。跳ねる8分の格子もここから)----
  function onGrid(n) {
    var onHead = n % 2 === 0;
    if (gridTime(n) >= totalBeats * SPB) return;
    beatFlash = 1;
    beep(onHead ? 2400 : 1800, 0.015, { wave: 'square', volume: (onHead ? 0.018 : 0.012) * vol() });
    var gt = gridTime(n);
    for (var i = 0; i < sinks.length; i++) {
      var sk = sinks[i];
      if (sk.res) continue;
      // つつき(予告): 沈む1拍前と、その次の跳ね
      var k = -1;
      if (Math.abs(gt - (sk.t - SPB)) < 0.01) k = 0;
      else if (gt > sk.t - SPB + 0.01 && gt < sk.t - 0.01) k = 1;
      if (k >= 0 && !sk.nib[k]) {
        sk.nib[k] = true; nibT = 1; ripT = 0.5;
        beep(k === 0 ? 1175 : 1397, 0.04, { wave: 'square', volume: 0.06 * vol() });
      }
      if (Math.abs(gt - sk.t) < 0.01) {
        beep(523, 0.16, { wave: 'sine', volume: 0.1 * vol(), slide: -300 });
      }
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (gridTime(gridN + 1) <= songT) { gridN++; onGrid(gridN); }
    while (nextBar < totalBeats / BAR && songT >= nextBar * BAR * SPB - 0.06) { playBar(nextBar); nextBar++; }
    for (var i = 0; i < sinks.length; i++) {
      var sk = sinks[i];
      if (sk.res) continue;
      if (songT > sk.t + GOOD_W) {
        // 上げ遅れ: 餌を取られる
        sk.res = 'late';
        missFish('late', Math.round((songT - sk.t) * BITE_CM / sk.dd));
      }
    }
    if (!demoMode && !over && songT >= totalBeats * SPB + 0.2) finish(misses < MISS_MAX);
  }

  // ---- 判定 ----
  function lift() {
    liftT = 0.35;
    if (!running || over || hitStop > 0) return 'none';
    var sk = pendingSink();
    if (!sk) { missFish('empty', 0); return 'miss'; }
    var d = songT - sk.t;
    var cm = Math.round(Math.abs(d) * BITE_CM / sk.dd);
    if (d < -GOOD_W) {
      if (d < -EARLY_MAX) { missFish('empty', 0); return 'miss'; }
      sk.res = 'early';
      missFish('early', Math.min(99, cm));
      return 'miss';
    }
    // 当たり: 近いほど加点。早めのGOODにも差を残す
    caught++; streak++;
    if (streak > maxStreak) maxStreak = streak;
    var near = Math.max(0, Math.round(50 * (1 - Math.abs(d) / GOOD_W)));
    var mult = sk.gold ? 2 : 1;
    catchT = 0.7; gap = cm; gapT = 1.0; gapKind = d < 0 ? 'early' : 'over';
    if (Math.abs(d) <= PERFECT_W) {
      sk.res = 'perfect'; perfects++; score += (100 + near) * mult;
      game.feedback.good(HOLE_X, SURF_Y - 160, { text: 'PERFECT', color: C.yellow, size: 56, count: 14, volume: soundOn ? 0.28 : 0.001 });
    } else {
      sk.res = 'good'; goods++; score += (60 + near) * mult;
      game.feedback.good(HOLE_X, SURF_Y - 160, { text: 'GOOD', color: C.cyan, size: 48, count: 8, volume: soundOn ? 0.22 : 0.001 });
    }
    beep(660 * Math.pow(1.08, Math.min(streak, 8)), 0.08, { wave: 'square', volume: 0.08 });
    if (sk.gold) game.fx.burst(HOLE_X, SURF_Y - 60, { color: C.yellow, count: 26, speed: 520 });
    if (!demoMode && !milestone && caught === 4) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(caught + ' / ' + sinks.length, W / 2, H * 0.2, { color: C.yellow, size: 80 });
    }
    return 'ok';
  }

  function missFish(kind, cm) {
    misses++; streak = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP; flashKind = kind;
    gap = cm; gapT = 1.2; gapKind = kind;
    if (kind === 'early' && (closest < 0 || cm < closest)) closest = cm;
    var fy = kind === 'late' ? LINE_Y + 120 : SURF_Y;
    game.feedback.bad(HOLE_X, fy, { text: 'MISS', shake: demoMode ? 4 : 10, volume: soundOn ? 0.5 : 0.001 });
    if (kind === 'early') game.fx.popup('あと' + cm + 'cm', GAUGE_X - 40, SURF_Y + 60, { color: C.yellow, size: 52 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false; flick = null;
    game.audio.stopBgm();
    if (ok) {
      score += caught * 20 + maxStreak * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(380, 900), { color: i % 2 ? C.cyan : C.yellow, count: 20, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, H * 0.17, { color: C.yellow, size: 72 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 押して上へはじく = 竿を上げる ----
  game.onPress(function(x, y, id) {
    soundOn = true;
    if (state !== S.PLAYING || over) return;
    flick = { y0: y, done: false };
    padT = 0.12;
    game.audio.tone(330, 0.03, { wave: 'square', volume: 0.05 });
  });
  game.onMove(function(x, y, id) {
    if (!flick || flick.done || state !== S.PLAYING || over) return;
    if (flick.y0 - y >= FLICK_PX) {
      flick.done = true;
      if (lift() === 'none') game.audio.play('se_tap', 0.2);
    }
  });
  game.onRelease(function(x, y, id) {
    var f = flick;
    flick = null;
    if (!f || state !== S.PLAYING || over) return;
    if (!f.done) { twitchT = 0.2; game.audio.play('se_tap', 0.2); }
  });
  game.onTap(function(x, y) {
    soundOn = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- スプライト ----
  function edit(src, rows) {
    var copy = src.slice();
    Object.keys(rows).forEach(function(k) { copy[+k] = rows[k]; });
    return copy;
  }
  var ANGLER = [
    '....wwwwww....', '...wwrrrrww...', '..wwrrrrrrww..', '..wrffffffrw..', '..wrfkffkfrw..', '..wrffffffrw..',
    '...rrffffrr...', '..rrrrrrrrrr..', '.rrrrrrrrrrrr.', 'rrrrrrrrrrrrrr', 'rrrryyyyrrrrrr', '.rrrrrrrrrrrr.',
    '..bbbbbbbbbb..', '..bbbbbbbbbb..', '..bb......bb..', '.kkk......kkk.'
  ];
  var ANGLER_UP = edit(ANGLER, { 4: '..wrfkffkfrw..', 6: '...rrfkkfrr...' });
  var ANGLER_JOY = edit(ANGLER, { 4: '..wrkffffkrw..', 6: '...rrkkkkrr...' });
  var ANGLER_OOPS = edit(ANGLER, { 4: '..wrkkffkkrw..', 6: '...rrfkkfrr...' });
  var APAL = { w: C.white, r: C.red, f: '#f0c090', k: C.black, y: C.yellow, b: C.blue };
  var FLOAT = ['.rr.', 'rrrr', 'rrrr', 'wwww', 'wwww', '.ww.', '.kk.'];
  var FPAL = { r: C.red, w: C.white, k: C.black };
  var FISH = ['....gg..g', '.gggggggg', 'ggkggggg.', '.gggggggg', '....gg..g'];
  var FISHS = ['....bb..b', '.bbbbbbbb', 'bbbbbbbb.', '.bbbbbbbb', '....bb..b'];
  var GPAL = { g: C.green, k: C.black };
  var GOLD = { g: C.yellow, k: C.black };
  var SPAL = { b: C.black };
  var WPAL = { g: C.white, k: C.white, r: C.white, w: C.white, b: C.white };

  // ---- 描画ヘルパー ----
  function dither(x, y, w, h, c1, c2, cell) {
    game.draw.rect(x, y, w, h, c1);
    for (var yy = 0; yy < h; yy += cell) {
      for (var xx = ((yy / cell) % 2) * cell; xx < w; xx += cell * 2) game.draw.rect(x + xx, y + yy, cell, cell, c2);
    }
  }
  function frame(x, y, w, h, col) {
    game.draw.rect(x, y, w, h, C.black);
    game.draw.line(x, y, x + w, y, col, 3); game.draw.line(x, y + h, x + w, y + h, col, 3);
    game.draw.line(x, y, x, y + h, col, 3); game.draw.line(x + w, y, x + w, y + h, col, 3);
    game.draw.line(x + 8, y + 8, x + w - 8, y + 8, col, 1); game.draw.line(x + 8, y + h - 8, x + w - 8, y + h - 8, col, 1);
    game.draw.line(x + 8, y + 8, x + 8, y + h - 8, col, 1); game.draw.line(x + w - 8, y + 8, x + w - 8, y + h - 8, col, 1);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  function drawWorld(t) {
    // 夜明け前の空(青と黒の市松で中間色)と遠くの針葉樹・釣り小屋
    game.draw.gradient(0, H, [[0, C.black], [0.5, C.black], [1, C.blue]]);
    game.draw.gradient(0, ICE_TOP, [[0, C.black], [0.6, C.black], [1, C.blue]]);
    dither(0, ICE_TOP - 150, W, 48, C.black, C.blue, 12);
    for (var s = 0; s < 18; s++) game.draw.rect((s * 197 + 40) % W, 260 + (s * 71) % 220, 3, 3, C.white);
    for (var p = 0; p < 9; p++) {
      var px = 30 + p * 128, ph = 70 + (p * 37) % 50;
      for (var l = 0; l < 5; l++) game.draw.rect(px - l * 9, ICE_TOP - ph + l * (ph / 5), 18 + l * 18, ph / 5, C.green);
    }
    game.draw.rect(820, ICE_TOP - 110, 140, 110, C.magenta);
    game.draw.rect(810, ICE_TOP - 130, 160, 24, C.white);
    game.draw.rect(870, ICE_TOP - 60, 40, 60, C.black);
    // 氷(白とシアンの市松)と穴
    dither(0, ICE_TOP, W, ICE_BOT - ICE_TOP, C.white, C.cyan, 10);
    game.draw.line(0, ICE_TOP, W, ICE_TOP, C.white, 3);
    // 氷の下の水(青と黒の市松)
    game.draw.gradient(ICE_BOT, TL_Y - 90, [[0, C.blue], [1, C.black]]);
    dither(0, ICE_BOT + 160, W, 36, C.blue, C.black, 12);
    game.draw.rect(HOLE_X - HOLE_W / 2, ICE_TOP, HOLE_W, ICE_BOT - ICE_TOP, C.blue);
    game.draw.line(HOLE_X - HOLE_W / 2, ICE_TOP, HOLE_X - HOLE_W / 2, ICE_BOT, C.cyan, 2);
    game.draw.line(HOLE_X + HOLE_W / 2, ICE_TOP, HOLE_X + HOLE_W / 2, ICE_BOT, C.cyan, 2);
    if (ripT > 0) {
      var rw = (1 - ripT / 0.5) * 60;
      game.draw.line(HOLE_X - 30 - rw, SURF_Y, HOLE_X + 30 + rw, SURF_Y, C.white, 2);
    }
    game.draw.line(HOLE_X - HOLE_W / 2, SURF_Y, HOLE_X + HOLE_W / 2, SURF_Y, C.cyan, 2);
  }

  function drawGauge(t) {
    // ものさし(細線)。黄色 = 当たり線
    game.draw.line(GAUGE_X, SURF_Y, GAUGE_X, SURF_Y + 42 * PX_CM, C.white, 2);
    for (var cm = 0; cm <= 40; cm += 5) {
      var y = SURF_Y + cm * PX_CM;
      game.draw.line(GAUGE_X, y, GAUGE_X + (cm % 10 === 0 ? 34 : 18), y, C.white, 2);
      if (cm % 10 === 0) label('' + cm, GAUGE_X + 70, y, 26, C.cyan);
    }
    var lineBlink = pendingSink() && songT > pendingSink().t - SPB && Math.floor(t * 12) % 2 === 0;
    game.draw.line(HOLE_X - 230, LINE_Y, GAUGE_X + 40, LINE_Y, lineBlink ? C.white : C.yellow, 3);
    var fy = SURF_Y + floatDepth() * PX_CM;
    game.draw.line(GAUGE_X - 34, fy, GAUGE_X, fy, C.red, 6);
    // 差の線(あと○cm / 越えた分)
    if (gapT > 0 && gap > 0) {
      var gy0 = LINE_Y, gy1 = gapKind === 'early' ? LINE_Y - gap * PX_CM : LINE_Y + gap * PX_CM;
      gy1 = Math.max(SURF_Y - 40, Math.min(TL_Y - 120, gy1));
      var col = gapKind === 'early' ? C.yellow : C.red;
      game.draw.line(GAUGE_X - 60, gy0, GAUGE_X - 60, gy1, col, 8);
      game.draw.line(GAUGE_X - 80, gy1, GAUGE_X - 40, gy1, col, 4);
      if (gapKind === 'early') label('あと' + gap + 'cm', GAUGE_X - 70, (gy0 + gy1) / 2 - 10, 34, C.yellow, 'right');
      else label(gap + 'cm', GAUGE_X - 80, (gy0 + gy1) / 2, 34, C.red, 'right');
    }
  }

  function drawHoleCast(t) {
    var stop = flashT > 0 && hitStop > 0;
    var sk = pendingSink();
    // 氷の下の魚の影(沈む1拍前から寄ってくる)
    if (sk && running && songT > sk.t - SPB * 1.3 && catchT <= 0) {
      var a = Math.min(1, (songT - (sk.t - SPB * 1.3)) / (SPB * 0.8));
      var fx = HOLE_X + 260 - a * 230;
      game.draw.sprite(sk.gold ? FISH : FISHS, sk.gold ? GOLD : SPAL, fx, LINE_Y + 120, 12, { anchor: 'center', alpha: 0.4 + a * 0.6 });
    }
    // 糸と餌
    var fy = SURF_Y + floatDepth() * PX_CM;
    var tipX = HOLE_X - 40, tipY = SURF_Y - 300 + (liftT > 0 ? -60 : 0);
    game.draw.line(tipX, tipY, HOLE_X, fy - 30, C.white, 1);
    game.draw.line(HOLE_X, fy + 30, HOLE_X, LINE_Y + 110 + (fy - SURF_Y) * 0.5, C.white, 1);
    game.draw.circle(HOLE_X, LINE_Y + 114 + (fy - SURF_Y) * 0.5, 6, C.yellow);
    // 浮き
    if (stop && flashKind === 'early') {
      var k = flashT / HIT_STOP;
      game.draw.circle(HOLE_X, fy, 70 + (1 - k) * 60, C.white, 0.5 * k);
      game.draw.sprite(FLOAT, WPAL, HOLE_X, fy, 15, { anchor: 'center' });
    } else {
      game.draw.sprite(FLOAT, FPAL, HOLE_X, fy, 11, { anchor: 'center' });
    }
    // 上げ遅れ: 餌を取った魚を白く拡大
    if (stop && flashKind === 'late') {
      var k2 = flashT / HIT_STOP;
      game.draw.circle(HOLE_X + 60, LINE_Y + 120, 90 + (1 - k2) * 60, C.white, 0.5 * k2);
      game.draw.sprite(FISH, WPAL, HOLE_X + 60 + (1 - k2) * 80, LINE_Y + 120, 15, { anchor: 'center' });
    }
    // 釣れた魚が上がる
    if (catchT > 0) {
      var up = (0.7 - catchT) / 0.7;
      game.draw.sprite(FISH, GPAL, HOLE_X, SURF_Y - 40 - up * 200, 13, { anchor: 'center' });
    }
  }

  function drawAngler(t) {
    var stop = flashT > 0 && hitStop > 0;
    var spr = ANGLER;
    if (over && state !== S.ATTRACT) spr = won ? ANGLER_JOY : ANGLER_OOPS;
    else if (stop) spr = ANGLER_OOPS;
    else if (catchT > 0) spr = ANGLER_JOY;
    else if (liftT > 0) spr = ANGLER_UP;
    var ax = 250, ay = ICE_TOP - 112;
    var tw = twitchT > 0 ? Math.sin(twitchT * 60) * 4 : 0;
    var breathe = Math.floor(t * 1.5) % 2;
    // バケツの椅子
    game.draw.rect(ax - 50, ICE_TOP - 50, 100, 50, C.cyan);
    game.draw.line(ax - 50, ICE_TOP - 50, ax + 50, ICE_TOP - 50, C.white, 3);
    game.draw.sprite(spr, APAL, ax + tw, ay + breathe * 2, 9, { anchor: 'center' });
    // 白い息(ディザの小さな雲)
    if (breathe) { game.draw.rect(ax + 74, ay - 40, 12, 12, C.white); game.draw.rect(ax + 92, ay - 52, 12, 12, C.white); }
    // 竿(上げると立つ)
    var tipX = HOLE_X - 40, tipY = SURF_Y - 300 + (liftT > 0 ? -60 : 0);
    game.draw.line(ax + 50, ay + 20, tipX, tipY, C.yellow, 5);
    game.draw.line(ax + 50, ay + 20, ax + 90, ay + 2, C.red, 9);
  }

  // 下の譜面: 長い棒 = 拍の頭、短い棒 = 跳ねた裏。魚印 = 沈む位置
  function drawTimeline(t) {
    frame(40, TL_Y - 90, W - 80, 180, C.cyan);
    var now = running ? songT / SPB : 0;
    game.draw.rect(TL_X0 - 3, TL_Y - 70, 6, 140, C.yellow);
    for (var b = Math.floor(now) - 2; b < now + 4; b++) {
      if (b < 0 || b >= totalBeats) continue;
      var x = TL_X0 + (b - now) * TL_PX;
      if (x > 60 && x < W - 60) game.draw.line(x, TL_Y - 40, x, TL_Y + 40, C.white, b % BAR === 0 ? 5 : 3);
      var x2 = TL_X0 + (b + SW - now) * TL_PX;
      if (x2 > 60 && x2 < W - 60) game.draw.line(x2, TL_Y - 18, x2, TL_Y + 18, C.cyan, 3);
    }
    for (var i = 0; i < sinks.length; i++) {
      var sk = sinks[i];
      var sx = TL_X0 + (sk.beat - now) * TL_PX;
      if (sx < 60 || sx > W - 80) continue;
      var col = sk.res === 'perfect' || sk.res === 'good' ? C.green : (sk.res ? C.red : (sk.gold ? C.yellow : C.white));
      game.draw.sprite(FISH, { g: col, k: C.black }, sx, TL_Y - 56, 6, { anchor: 'center' });
      game.draw.circle(sx, TL_Y, 12, col);
    }
  }

  // 親指ゾーン: 竿の握り(上へはじく溝)
  function drawGrip(t) {
    frame(60, H * 0.765, W - 120, H * 0.21, C.white);
    var sk = pendingSink();
    var live = running && sk && songT > sk.t - SPB && !over;
    var pr = padT > 0 ? 8 : 0;
    game.draw.rect(GRIP_X - 70 + pr, GRIP_Y - 150, 140 - pr * 2, 300, live ? C.yellow : C.blue);
    game.draw.rect(GRIP_X - 54 + pr, GRIP_Y - 134, 108 - pr * 2, 268, C.black);
    for (var c = 0; c < 3; c++) {
      var cy = GRIP_Y + 90 - c * 80 - (live ? (t * 180) % 80 : 0);
      if (cy < GRIP_Y - 120) continue;
      var col = live ? C.yellow : C.cyan;
      game.draw.line(GRIP_X - 36, cy, GRIP_X, cy - 34, col, 6);
      game.draw.line(GRIP_X + 36, cy, GRIP_X, cy - 34, col, 6);
    }
    // 糸巻き(拍ごとに回る)
    var ang = (running ? songT / SPB : t) * Math.PI;
    game.draw.circle(GRIP_X + 250, GRIP_Y, 70, C.blue);
    game.draw.circle(GRIP_X + 250, GRIP_Y, 54, C.black);
    game.draw.line(GRIP_X + 250, GRIP_Y, GRIP_X + 250 + Math.cos(ang) * 54, GRIP_Y + Math.sin(ang) * 54, C.white, 4);
    game.draw.circle(GRIP_X - 250, GRIP_Y, 30 + beatFlash * 14, C.cyan);
  }

  function drawHud() {
    frame(20, 16, W - 40, 200, C.cyan);
    label('SCORE ' + score, 60, 76, 46, C.white, 'left');
    label('BEST ' + prevBest, 60, 146, 32, C.yellow, 'left');
    label(caught + ' / ' + sinks.length, W - 60, 76, 50, C.white, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.rect(W - 230 + m * 60, 130, 40, 30, m < misses ? C.red : C.blue);
    var p = Math.max(0, Math.min(1, songT / (totalBeats * SPB)));
    game.draw.rect(60, 182, (W - 120) * p, 10, C.cyan);
  }

  function drawScene(t) {
    drawWorld(t);
    drawAngler(t);
    drawHoleCast(t);
    drawGauge(t);
    drawTimeline(t);
    drawGrip(t);
  }

  // ---- ATTRACT: 実ロジックで 沈む拍ぴったり(PERFECT)→早上げ(MISS・あと○cm)→少し遅れ(GOOD) ----
  var demo = { t: 0, hx: GRIP_X + 40, hy: GRIP_Y + 60, press: false, flicked: false, done: [] };
  var DEMO_LEN = DEMO_BEATS * SPB + 0.8;
  var DEMO_ACTS = [
    [2 * SPB - 0.2, 'down'], [2 * SPB, 'lift'], [2 * SPB + 0.25, 'up'],
    [(4 + SW) * SPB - 0.38, 'down'], [(4 + SW) * SPB - 0.2, 'lift'], [(4 + SW) * SPB + 0.05, 'up'],
    [7 * SPB - 0.15, 'down'], [7 * SPB + 0.07, 'lift'], [7 * SPB + 0.3, 'up']
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = []; demo.press = false; demo.flicked = false; }
    var nt = songT + dt;
    for (var i = 0; i < DEMO_ACTS.length; i++) {
      var a = DEMO_ACTS[i];
      if (demo.done[i] || nt < a[0]) continue;
      demo.done[i] = true;
      if (a[1] === 'down') { demo.press = true; demo.flicked = false; padT = 0.12; }
      else if (a[1] === 'lift') { demo.flicked = true; lift(); }
      else demo.press = false;
    }
    stepPlay(dt);
    var tx = GRIP_X + 60, ty = GRIP_Y + 80;
    if (demo.press) { tx = GRIP_X; ty = demo.flicked ? GRIP_Y - 120 : GRIP_Y + 40; }
    var k = Math.min(1, dt * (demo.flicked ? 22 : 12));
    demo.hx += (tx - demo.hx) * k;
    demo.hy += (ty - demo.hy) * k;
  }

  function tick(dt) {
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (liftT > 0) liftT -= dt;
    if (twitchT > 0) twitchT -= dt;
    if (padT > 0) padT -= dt;
    if (nibT > 0) nibT = Math.max(0, nibT - dt * 6);
    if (ripT > 0) ripT -= dt;
    if (gapT > 0) gapT -= dt;
    if (catchT > 0) catchT -= dt;
    if (beatFlash > 0) beatFlash = Math.max(0, beatFlash - dt * 5);
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.black, 0.16); }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tick(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      frame(20, 16, W - 40, 200, C.cyan);
      label(GAME_TITLE, W / 2 + 4, 94, 90, C.blue);
      label(GAME_TITLE, W / 2, 90, 90, C.cyan);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 172, 34, C.yellow);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.24, 46, C.yellow);
      else label('TAP TO START', W / 2, H * 0.24, 42, C.white);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      frame(80, 240, W - 160, 560, C.yellow);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 330, 92, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, 430, 56, C.white);
      label(caught + ' / ' + sinks.length, W / 2, 500, 46, C.cyan);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 566, 32, C.white);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 640, 52, C.yellow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 640, 40, C.yellow);
      if (!won) label('あと' + Math.max(1, sinks.length - (MISS_MAX - 1) - caught) + '尾!', W / 2, 712, 46, C.red);
      if (closest >= 0) label('あと' + closest + 'cm', W / 2, 766, 36, C.yellow);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.24 + 640, 40, C.white);
      scanlines();
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, caught: caught, perfect: perfects, good: goods, miss: misses, closestCm: closest };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0.06 && nextBar === 0) { playBar(0); nextBar = 1; }
      if (readyT <= 0) running = true;
    } else {
      stepPlay(dt);
      if (!over && songT > totalBeats * SPB + 1) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.yellow);
    if (over && won) label('FINISH', W / 2, H * 0.3, 100, C.yellow);
    scanlines();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
