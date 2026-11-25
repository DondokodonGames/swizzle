// K-DS-0008v3-windy-hill-ox-sowing.js
// 風の丘の三拍子種蒔き — 牛の引く鋤が畝を往復する。三拍子の一拍目(鈴の鳴る拍)ごとに、鋤の後ろの土へつまんだ種を一粒ずつ離して蒔く
// 操作: 押すと袋から種をつまみ(押しっぱなしで保持)、離した瞬間に種が落ちる(離した瞬間で判定)。牛の鈴が鳴る一拍目に、縮む輪が重なった鋤の後ろの点へ離す。二拍目・三拍目や拍外れで離すと種は風に飛ばされMISS。石の点で離すと弾かれてMISS。蒔かずに一拍目を過ぎると土が空いてMISS
// 終わり: 144BPM・三拍子・前奏1小節+12小節(3畝×4点、約16秒)。MISS3回でGAME OVER、12小節を終えればCLEAR。石の点は0.7秒前に赤く点滅し警告音で予告
// @mechanic: drop_timing
// @theme: windy_hill_ox_sowing
// 世界観: 風の強い丘の麦畑で、種蒔き係が前を行く牛の引く鋤のあとを歩き、牛の首の鈴が鳴る一拍目ごとに鋤の起こした土へ種を一粒ずつ落として、三本の畝を往復しながら蒔いていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・蒔いた粒数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var STYLE = { bg: ['#b8c4a8', '#7a8a68'], main: ['#8a6a48', '#d8c890', '#4a5a3a'], accent: ['#c85a3a', '#f0e8c8'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度を落とした少色。太く単純な形で、密度を上げない
  var C = {
    sky: STYLE.bg[0], hill: STYLE.bg[1], soil: STYLE.main[0], wheat: STYLE.main[1], dgreen: STYLE.main[2],
    red: STYLE.accent[0], light: STYLE.accent[1],
    ink: '#2a2620', soilD: '#6a5038', soilL: '#a8885e', green: '#8aa86a', gold: '#e0b850', gray: '#8a8a7a', stone: '#9a9a8a'
  };

  var GAME_TITLE = 'WINDY SOWING';
  var BPM = 144;
  var SPB = 60 / BPM;
  var BAR = SPB * 3;
  var NBAR = 13;
  var NB = NBAR * 3;
  var SPOTS = 12;
  var STONE = [false, false, true, false, false, false, true, false, false, true, true, false];
  var NEEDED = 8;
  var MISS_LIMIT = 3;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var READY_T = 0.8;
  var TIME_LIMIT = 17;
  var WARN_LEAD = 0.7;
  var ROW_Y = [770, 990, 1210];
  var SPOT_X = [220, 430, 640, 850];
  var BAG_X = 540, BAG_Y = 1650;

  // 伴奏(オリジナル): 丘の三拍子。低音が一拍目、二・三拍目は和音の刻み
  var MEL = [
    [['B4', 2], ['D5', 1]], [['C5', 1], ['B4', 1], ['A4', 1]], [['G4', 2], ['B4', 1]], [['A4', 2], ['D4', 1]],
    [['E5', 2], ['D5', 1]], [['C5', 1], ['E5', 1], ['D5', 1]], [['B4', 2], ['A4', 1]], [['G4', 3]]
  ];
  var CH_G = [['G2', 1], ['B3', 1], ['D4', 1]];
  var CH_C = [['C3', 1], ['E3', 1], ['G3', 1]];
  var CH_D = [['D3', 1], ['A3', 1], ['C4', 1]];
  var BASS = [CH_G, CH_C, CH_G, CH_D, CH_C, CH_C, CH_D, CH_G];

  // ---- スプライト ----
  var OX_A = [
    '..........w.w.',
    '.........bbbb.',
    '.bbbbbbbbbbkbb',
    'tbbbwwbbbbbbbn',
    '.bbbwwwbbbbbb.',
    '.bbbbbbbbbbb..',
    '..bb.....bb...',
    '..b.b...b.b...',
    '..f.f...f.f...'
  ];
  var OX_B = [
    '..........w.w.',
    '.........bbbb.',
    '.bbbbbbbbbbkbb',
    'tbbbwwbbbbbbbn',
    '.bbbwwwbbbbbb.',
    '.bbbbbbbbbbb..',
    '..bb.....bb...',
    '...bb.....bb..',
    '...ff.....ff..'
  ];
  var OX_PAL = { w: '#f0e8c8', b: '#7a5a3a', k: '#1e1a14', n: '#c8a088', t: '#4a3a2a', f: '#2e2a20' };
  var SOW_A = [
    '...hhh...',
    '.hhhhhhh.',
    '..fffff..',
    '..fkfkf..',
    '..ffmff..',
    '...sss...',
    '.sssssss.',
    '.ssssssbb',
    '.f.sssbbb',
    '..ppppp..',
    '..pp.pp..',
    '..pp.pp..',
    '.oo...oo.'
  ];
  var SOW_DROP = [
    '...hhh...',
    '.hhhhhhh.',
    '..fffff..',
    '..fkfkf..',
    '..ffmff..',
    '...sss...',
    '.sssssssf',
    '.sssssbb.',
    '...sssbbb',
    '..ppppp..',
    '..pp.pp..',
    '.pp...pp.',
    'oo.....oo'
  ];
  var SOW_OH = [
    '..hhh....',
    'hhhhhhh..',
    '..fffff..',
    '..fwfwf..',
    '..ffmff..',
    '...sss...',
    'fsssssssf',
    '.ssssssbb',
    '...sssbbb',
    '..ppppp..',
    '..pp.pp..',
    '..pp.pp..',
    '.oo...oo.'
  ];
  var SOW_PAL = { h: '#d8c890', f: '#e8c8a0', k: '#1e1a14', w: '#ffffff', m: '#b86a5a', s: '#5a7a8a', b: '#a8885a', p: '#4a5a3a', o: '#2e2a20' };
  var SPROUT_A = ['.g.g.', '..g..', '..g..', '.mmm.'];
  var SPROUT_B = ['g..g.', '.gg..', '..g..', '.mmm.'];
  var ROCK = ['.rrr..', 'rrRrr.', 'rrrrrr', '.rrrr.'];
  var BAG = [
    '...tt.tt...',
    '....ttt....',
    '...bbbbb...',
    '..bbbbbbb..',
    '.bbbbbbbbb.',
    'bbbbsbbbbbb',
    'bbbsssbbbbb',
    'bbbbsbbbbbb',
    '.bbbbbbbbb.',
    '..bbbbbbb..'
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, prevClock, cuedBar, judged, sown, spotFlash, nSown, misses, score, nP, nG, combo, maxCombo;
  var over, won, outroT, hitStop, demoMode, prevBest, holding, dropPose, seeds, sowerHit;
  var beatPulse = 0, bellPulse = 0;
  var WIND = [];
  for (var wi = 0; wi < 10; wi++) WIND.push({ x: game.random(0, W), y: game.random(260, 1400), v: game.random(500, 800), l: game.random(60, 140) });

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; prevClock = clock; cuedBar = -99;
    judged = []; sown = []; spotFlash = []; nSown = 0; misses = 0; score = 0; nP = 0; nG = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    holding = false; dropPose = 0; seeds = []; sowerHit = 0;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function head(s) { return (s + 1) * BAR; }
  function spotPos(s) {
    var r = Math.floor(s / 4), i = s % 4;
    return { x: r % 2 === 0 ? SPOT_X[i] : SPOT_X[3 - i], y: ROW_Y[r] };
  }
  function ease(f) { return 1 - Math.pow(1 - f, 3); }
  function rowDir(r) { return r % 2 === 0 ? 1 : -1; }

  // 鋤の刃の位置: 一拍ごとに牛が一歩ずつ進み、一拍目に次の点へ着く
  function plough() {
    var c = Math.max(0, clock);
    var k = Math.min(NBAR - 1, Math.floor(c / BAR));
    var inBar = Math.min(BAR, c - k * BAR) / SPB;
    var bi = Math.min(2, Math.floor(inBar)), prog = (bi + ease(Math.min(1, inBar - bi))) / 3;
    var from = k === 0 ? { x: SPOT_X[0] - 210, y: ROW_Y[0] } : spotPos(k - 1);
    var to = k <= SPOTS - 1 ? spotPos(k) : { x: SPOT_X[3] + 260, y: ROW_Y[2] };
    if (clock < 0) { to = from; prog = 0; }
    var dir = to.x !== from.x ? (to.x > from.x ? 1 : -1) : rowDir(Math.min(2, Math.floor(Math.min(SPOTS - 1, k) / 4)));
    return { x: from.x + (to.x - from.x) * prog, y: from.y + (to.y - from.y) * prog, dir: dir };
  }
  function sowerPos() { var p = plough(); return { x: p.x - p.dir * 110, y: p.y - 70, dir: p.dir }; }

  // ---- 判定 ----
  function miss(why, s) {
    misses++; combo = 0; sowerHit = 0.32;
    var p = s >= 0 ? spotPos(s) : sowerPos();
    if (s >= 0) spotFlash[s] = 0.32;
    game.feedback.bad(p.x, p.y - 70, { text: 'MISS', shake: demoMode ? 3 : 8, volume: demoMode ? 0 : 0.45 });
    if (why === 'stone') sfx('se_break', 0.35);
    if (!demoMode && misses >= MISS_LIMIT) { hitStop = 0.45; finish(false); }
  }

  function grab() {
    if (over || clock < -0.5) return false;
    holding = true;
    tone(520, 0.03, { wave: 'triangle', volume: 0.05 });
    return true;
  }

  function drop() {
    if (!holding) return 'none';
    holding = false;
    if (over) return 'over';
    var sp = sowerPos(), hx = sp.x + sp.dir * 60, hy = sp.y + 10;
    dropPose = 0.2;
    if (clock < BAR - GOOD_W * 1.5) { tone(400, 0.04, { wave: 'triangle', volume: 0.05 }); return 'air'; }
    var j = Math.round(clock / SPB);
    var ad = Math.abs(clock - j * SPB);
    var s = j / 3 - 1;
    if (j % 3 !== 0 || ad > GOOD_W || s < 0 || s >= SPOTS) {
      // 一拍目以外・拍外れ: 種は風に飛ばされる
      seeds.push({ x: hx, y: hy, vx: 520, vy: -260, t: 0.7, kind: 'wind' });
      tone(900, 0.18, { wave: 'sine', volume: 0.05, slide: -500 });
      miss('wind', -1);
      return 'miss';
    }
    var p = spotPos(s);
    if (STONE[s]) {
      judged[s] = true;
      seeds.push({ x: p.x, y: p.y - 30, vx: -sp.dir * 260, vy: -420, t: 0.6, kind: 'bounce' });
      miss('stone', s);
      return 'miss';
    }
    if (judged[s]) {
      seeds.push({ x: hx, y: hy, vx: 520, vy: -260, t: 0.7, kind: 'wind' });
      miss('double', s);
      return 'miss';
    }
    judged[s] = true;
    var perfect = ad <= PERFECT_W;
    sown[s] = perfect ? 2 : 1;
    nSown++;
    if (perfect) nP++; else nG++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    score += (perfect ? 100 : 60) + Math.min(40, combo * 8);
    seeds.push({ x: hx, y: hy, tx: p.x, ty: p.y, t: 0.18, t0: 0.18, kind: 'fall' });
    game.feedback.good(p.x, p.y - 80, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: perfect ? 50 : 42, count: 8, volume: demoMode ? 0 : 0.25 });
    if (!demoMode && nSown === 4) { game.fx.popup(nSown + ' / ' + NEEDED, W / 2, 560, { color: C.gold, size: 72 }); sfx('se_milestone', 0.45); }
    if (!demoMode && combo > 0 && combo % 4 === 0) game.fx.popup('COMBO ' + combo, W / 2, 460, { color: C.red, size: 60 });
    return 'hit';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; holding = false;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_LIMIT - misses) * 150;
      for (var k = 0; k < 6; k++) game.fx.burst(140 + k * 160, 780 + (k % 3) * 200, { color: [C.gold, C.green, C.light][k % 3], count: 18, speed: 420 });
      game.fx.flash(C.light, 0.12);
      sfx('se_success', 0.55);
    } else {
      game.fx.flash('#ffffff', 0.18);
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, sown: nSown, total: NEEDED, perfect: nP, good: nG, miss: misses, maxCombo: maxCombo };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function cueBar(b) {
    if (demoMode) return;
    if (b === 0) game.audio.melody([['G4', 1], ['B4', 1], ['D5', 1]], { tempo: BPM, wave: 'triangle', volume: 0.035, bass: CH_G, bassVolume: 0.07 });
    else game.audio.melody(MEL[(b - 1) % 8], { tempo: BPM, wave: 'square', volume: 0.04, bass: BASS[(b - 1) % 8], bassVolume: 0.07 });
  }

  function onBeat(i) {
    beatPulse = 1;
    if (i % 3 === 0) {
      bellPulse = 1;
      tone(1320, 0.14, { wave: 'triangle', volume: 0.06 });
      tone(1980, 0.06, { wave: 'sine', volume: 0.03 });
    } else {
      tone(760, 0.03, { wave: 'square', volume: 0.025 });
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    for (var b = 0; b < NBAR; b++) if (b > cuedBar && clock + 0.06 >= b * BAR) { cuedBar = b; cueBar(b); }
    for (var i = 0; i < NB; i++) if (prevClock < i * SPB && clock >= i * SPB) onBeat(i);
    // 石の予告(0.7秒前): 赤く点滅 + コツコツ
    for (var s = 0; s < SPOTS; s++) {
      if (!STONE[s]) continue;
      var wt = head(s) - WARN_LEAD;
      if (prevClock < wt && clock >= wt) { tone(330, 0.07, { wave: 'square', volume: 0.06 }); tone(250, 0.09, { wave: 'square', volume: 0.06 }); }
    }
    if (over) return;
    for (var k = 0; k < SPOTS; k++) {
      if (judged[k] || clock <= head(k) + GOOD_W) continue;
      judged[k] = true;
      if (STONE[k]) {
        // 石を見送れた
        score += 30;
        var ps = spotPos(k);
        if (!demoMode) game.fx.popup('NICE', ps.x, ps.y - 80, { color: C.light, size: 40 });
      } else {
        miss('bare', k);
        if (over) return;
      }
    }
    if (clock >= NBAR * BAR || clock > TIME_LIMIT) finish(misses < MISS_LIMIT);
  }

  function tickFx(dt) {
    beatPulse = Math.max(0, beatPulse - dt * 4);
    bellPulse = Math.max(0, bellPulse - dt * 3);
    if (dropPose > 0) dropPose -= dt;
    if (sowerHit > 0) sowerHit -= dt;
    for (var s = 0; s < SPOTS; s++) if (spotFlash[s] > 0) spotFlash[s] -= dt;
    for (var k = seeds.length - 1; k >= 0; k--) {
      var sd = seeds[k];
      sd.t -= dt;
      if (sd.kind !== 'fall') { sd.x += sd.vx * dt; sd.y += sd.vy * dt; sd.vy += 900 * dt; }
      if (sd.t <= 0) seeds.splice(k, 1);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 240) return;
    if (grab()) game.fx.burst(BAG_X, BAG_Y - 60, { color: C.wheat, count: 3, speed: 90 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || hitStop > 0) return;
    var r = drop();
    if (r !== 'none') game.fx.burst(BAG_X, BAG_Y - 60, { color: r === 'hit' ? C.green : (r === 'miss' ? C.red : C.light), count: 4, speed: 140 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function box(x, y, w, h, edgeCol) {
    game.draw.rect(x, y, w, h, C.ink, 0.9);
    game.draw.rect(x, y, w, 8, edgeCol); game.draw.rect(x, y + h - 8, w, 8, edgeCol);
    game.draw.rect(x, y, 8, h, edgeCol); game.draw.rect(x + w - 8, y, 8, h, edgeCol);
  }

  function drawWorld(dt) {
    var t = game.time.elapsed;
    game.draw.gradient(0, 680, [[0, '#9aa890'], [0.5, C.sky], [1, '#d8dcc0']]);
    // 風に流れる雲(太く単純な塊)
    for (var c = 0; c < 3; c++) {
      var cx = ((t * (60 + c * 25) + c * 400) % (W + 400)) - 200, cy = 300 + c * 70;
      game.draw.rect(cx, cy, 200, 40, C.light, 0.8);
      game.draw.rect(cx + 40, cy - 30, 110, 40, C.light, 0.8);
    }
    // 丘と麦の帯
    game.draw.circle(540, 1560, 1060, C.hill);
    game.draw.rect(0, 600, W, 90, C.wheat);
    for (var k = 0; k < 28; k++) {
      var sx = 10 + k * 39, sway = Math.sin(t * 5 + k * 0.6) * 10 + 8;
      game.draw.rect(sx + sway, 560, 12, 50, C.wheat);
      game.draw.rect(sx + sway * 0.5, 590, 8, 30, C.gold);
    }
    // 畑
    game.draw.rect(0, 690, W, 750, C.soil);
    var pl = plough();
    for (var r = 0; r < 3; r++) {
      var ry = ROW_Y[r];
      game.draw.rect(90, ry - 30, 900, 60, C.soilL);
      // 鋤が通ったあと(起こした土)
      var x0 = 90, x1 = 90;
      if (ry < pl.y - 4 || clock >= NBAR * BAR) { x0 = 90; x1 = 990; }
      else if (Math.abs(pl.y - ry) < 4) {
        if (rowDir(r) > 0) { x0 = 90; x1 = Math.max(90, Math.min(990, pl.x)); }
        else { x0 = Math.max(90, Math.min(990, pl.x)); x1 = 990; }
      }
      if (x1 > x0) {
        game.draw.rect(x0, ry - 26, x1 - x0, 52, C.soilD);
        game.draw.rect(x0, ry - 6, x1 - x0, 12, '#4a3626');
      }
    }
    // 風の筋
    for (var w = 0; w < WIND.length; w++) {
      var wd = WIND[w];
      wd.x += wd.v * dt;
      if (wd.x > W + 100) { wd.x = -wd.l; wd.y = game.random(260, 1400); }
      game.draw.rect(wd.x, wd.y, wd.l, 5, C.light, 0.45);
    }
  }

  function nextSpot() {
    for (var s = 0; s < SPOTS; s++) if (!judged[s] && !STONE[s] && head(s) + GOOD_W > clock) return s;
    return -1;
  }

  function drawSpots() {
    var t = game.time.elapsed;
    var nx = nextSpot();
    var blink = Math.floor(t * 10) % 2 === 0;
    for (var s = 0; s < SPOTS; s++) {
      var p = spotPos(s), fl = spotFlash[s] > 0;
      if (STONE[s]) {
        var warn = !judged[s] && clock >= head(s) - WARN_LEAD && clock <= head(s) + GOOD_W;
        var rc = fl ? '#ffffff' : (warn && blink ? C.red : C.stone);
        game.draw.sprite(ROCK, { r: rc, R: fl ? '#ffffff' : '#6a6a5a' }, p.x, p.y - 8, fl ? 16 : 12, { anchor: 'center' });
        continue;
      }
      if (sown[s]) {
        var grow = Math.floor(t * 3 + s) % 2 === 0;
        game.draw.sprite(grow ? SPROUT_A : SPROUT_B, { g: C.green, m: '#4a3626' }, p.x, p.y - 22, 12, { anchor: 'center' });
        if (sown[s] === 2) game.draw.circle(p.x, p.y - 50, 6, C.gold);
      } else if (judged[s]) {
        game.draw.rect(p.x - 34, p.y - 10, 68, 20, fl ? '#ffffff' : C.ink, fl ? 1 : 0.5);
        game.draw.rect(p.x - 6, p.y - 22, 12, 44, fl ? '#ffffff' : C.red, fl ? 1 : 0.6);
      } else {
        game.draw.circle(p.x, p.y, 14, C.light, 0.55);
      }
      // 縮む輪: 一拍目に点へぴったり重なる
      if (s === nx) {
        var until = head(s) - clock;
        if (until < BAR && until > -GOOD_W) {
          var rr = 36 + Math.max(0, until) / BAR * 130;
          game.draw.circle(p.x, p.y, rr, C.light, 0.2);
          game.draw.circle(p.x, p.y, 36, C.gold, 0.35 + bellPulse * 0.3);
          game.draw.circle(p.x, p.y, 14, C.light);
        }
      }
    }
  }

  function drawActors() {
    var pl = plough(), t = game.time.elapsed;
    var step = Math.floor(Math.max(0, clock) / SPB) % 2 === 0;
    var ox = pl.x + pl.dir * 150, oy = pl.y - 40;
    // 鋤と綱
    game.draw.line(ox - pl.dir * 70, oy, pl.x + pl.dir * 20, pl.y - 6, '#4a3626', 8);
    game.draw.rect(pl.x - 10, pl.y - 30, 20, 40, C.ink);
    game.draw.rect(pl.x - 18 + pl.dir * 8, pl.y + 2, 26, 12, C.gray);
    // 牛
    game.draw.rect(ox - 60, oy + 40, 120, 12, C.ink, 0.25);
    game.draw.sprite(step ? OX_A : OX_B, OX_PAL, ox, oy - beatPulse * 4, 12, { anchor: 'center', flipX: pl.dir < 0 });
    // 首の鈴: 一拍目に揺れる
    var bx = ox + pl.dir * 58 + Math.sin(t * 20) * bellPulse * 10, by = oy + 22;
    game.draw.circle(bx, by, 12 + bellPulse * 4, C.gold);
    if (bellPulse > 0.2) game.draw.circle(bx, by, 26 + (1 - bellPulse) * 40, C.gold, bellPulse * 0.4);
    // 種蒔き係
    var sp = sowerPos();
    var art = sowerHit > 0 ? SOW_OH : (dropPose > 0 ? SOW_DROP : SOW_A);
    var sc = sowerHit > 0 ? 15 + sowerHit * 8 : 13;
    game.draw.rect(sp.x - 55, sp.y + 80, 110, 12, C.ink, 0.25);
    game.draw.sprite(art, sowerHit > 0 ? { h: '#ffffff', f: '#ffffff', k: '#1e1a14', w: '#1e1a14', m: '#ffffff', s: '#ffffff', b: '#ffffff', p: '#ffffff', o: '#ffffff' } : SOW_PAL, sp.x, sp.y - (step ? 3 : 0), sc, { anchor: 'center', flipX: sp.dir < 0 });
    if (holding) game.draw.circle(sp.x + sp.dir * 62, sp.y + 4, 10, C.wheat);
    // 種の動き
    for (var k = 0; k < seeds.length; k++) {
      var sd = seeds[k];
      if (sd.kind === 'fall') {
        var f = 1 - sd.t / sd.t0;
        game.draw.circle(sd.x + (sd.tx - sd.x) * f, sd.y + (sd.ty - sd.y) * f, 9, C.wheat);
      } else {
        game.draw.circle(sd.x, sd.y, 9, sd.kind === 'wind' ? C.light : C.wheat, Math.max(0, sd.t * 1.5));
      }
    }
  }

  function drawThumb() {
    game.draw.rect(0, 1440, W, H - 1440, C.dgreen);
    game.draw.rect(0, 1440, W, 10, C.ink, 0.4);
    var open = holding ? 1 : 0;
    var sc = 16 + bellPulse * 2;
    game.draw.circle(BAG_X, BAG_Y + 20, 190, holding ? C.wheat : C.green, holding ? 0.35 : 0.18);
    game.draw.sprite(BAG, { t: '#4a3626', b: holding ? C.gold : C.soilL, s: C.wheat }, BAG_X, BAG_Y, sc, { anchor: 'center' });
    if (open) game.draw.circle(BAG_X, BAG_Y - 110, 16, C.wheat);
    // 三拍子の点: 一拍目は大きい
    var bi = clock >= 0 ? Math.floor(clock / SPB) % 3 : -1;
    for (var k = 0; k < 3; k++) {
      var on = bi === k, r = k === 0 ? 30 : 18;
      game.draw.circle(BAG_X - 170 + k * 170, 1830, on ? r + beatPulse * 10 : r * 0.7, on ? (k === 0 ? C.gold : C.light) : C.gray);
    }
  }

  function drawHud() {
    box(20, 16, W - 40, 210, C.wheat);
    label('SCORE ' + score, 60, 70, 40, C.light, 'left');
    label(nSown + ' / ' + NEEDED, W - 60, 70, 44, C.gold, 'right');
    for (var i = 0; i < MISS_LIMIT; i++) game.draw.sprite(SPROUT_A, { g: i < MISS_LIMIT - misses ? C.green : C.gray, m: '#4a3626' }, 80 + i * 70, 150, 10, { anchor: 'center' });
    var bi = clock >= 0 ? Math.floor(clock / SPB) % 3 : -1;
    for (var k = 0; k < 3; k++) {
      var on = bi === k, r = k === 0 ? 24 : 14;
      game.draw.circle(W / 2 - 90 + k * 90, 150, on ? r + beatPulse * 8 : r * 0.7, on ? (k === 0 ? C.gold : C.light) : C.gray);
    }
    if (combo >= 2) label('COMBO ' + combo, W - 60, 160, 34, C.red, 'right');
    var prog = Math.max(0, Math.min(1, clock / (NBAR * BAR)));
    game.draw.rect(60, 196, W - 120, 10, C.gray);
    game.draw.rect(60, 196, (W - 120) * prog, 10, C.gold);
  }

  function scanlines() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.05); }

  function drawScene(dt) {
    drawWorld(dt);
    drawSpots();
    drawActors();
    drawThumb();
    scanlines();
  }

  function drawResult(showTap) {
    var top = H * 0.26;
    box(70, top, W - 140, H * 0.37, won ? C.gold : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.305, 90, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.36, 56, C.light);
    label(nSown + ' / ' + NEEDED, W / 2, H * 0.405, 50, C.green);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + misses, W / 2, H * 0.45, 32, C.light);
    label('COMBO ' + maxCombo, W / 2, H * 0.485, 34, C.gold);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.53, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.53, 42, C.light);
    if (!won) {
      var left = 0;
      for (var s = 0; s < SPOTS; s++) if (!STONE[s] && !judged[s]) left++;
      label('あと' + Math.max(1, left) + '粒!', W / 2, H * 0.575, 48, C.red);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.612, 32, C.light);
  }

  // ---- ATTRACT: 実ロジックで1畝(4点)を蒔く。一拍目の前につまみ、鈴の拍で離す。石は見送る(1周おきに石へ落としてMISSを見せる) ----
  var demo = { t: 0, n: 0, acts: [], ai: 0, hx: BAG_X, hy: BAG_Y, press: false };
  var DEMO_CYC = BAR * 5 + 0.4;
  function demoReset() {
    initRun(true);
    clock = 0; prevClock = 0; cuedBar = 99;
    demo.n++; demo.ai = 0; demo.acts = [];
    for (var s = 0; s < 4; s++) {
      if (STONE[s] && demo.n % 2 === 1) continue;
      demo.acts.push({ t: head(s) - SPB * 0.8, a: 'grab' });
      demo.acts.push({ t: head(s) + 0.012, a: 'drop' });
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    tickFx(dt);
    var act = demo.acts[demo.ai];
    if (act && clock >= act.t) {
      if (act.a === 'grab') grab(); else drop();
      demo.ai++;
    }
    var nextAct = demo.acts[demo.ai];
    var near = nextAct && nextAct.t - clock < SPB * 1.2;
    var ty = holding || near ? BAG_Y : BAG_Y - 240;
    demo.hx += (BAG_X + 40 - demo.hx) * Math.min(1, dt * 12);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 12);
    demo.press = holding;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 14 });
      box(20, 16, W - 40, 210, C.wheat);
      label(GAME_TITLE, W / 2, 92, 82 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 180, 34, C.light);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.145, 48, C.ink);
      else label('TAP TO START', W / 2, H * 0.145, 44, C.red);
      return;
    }

    if (state === S.RESULT) {
      tickFx(dt);
      drawScene(dt);
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

    drawScene(hitStop > 0 ? 0 : dt);
    drawHud();
    if (clock < 0) {
      box(140, H * 0.4, W - 280, 150, C.gold);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.gold);
    }
    // 最初の一点だけ、袋をつまんで鈴の拍で離す手を薄く見せる
    if (clock >= 0 && clock < head(0) + 0.3 && !over) {
      game.draw.hand(BAG_X + 40, BAG_Y, { press: clock > head(0) - SPB * 0.8 && clock < head(0), scale: 12, alpha: 0.45 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
