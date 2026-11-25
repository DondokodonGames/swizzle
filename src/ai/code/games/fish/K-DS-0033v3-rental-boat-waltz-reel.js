// K-DS-0033v3-rental-boat-waltz-reel.js
// 貸しボートのワルツ釣り — 魚が食いつく小節の1拍目に竿を立て、三拍子の粒で示された拍数のあいだ立て続けて、最後の粒の拍の頭でぴたりと離して引き上げる
// 操作: 画面のどこでも押し続けると竿を立てる(押した瞬間と離した瞬間で判定)。浮きに「!」が出て波紋が広がる1拍半後、小節の1拍目に魚が食う。その頭で押し、下の粒(3つで1小節)の数の拍だけ押し続け、最後の粒(魚印)の拍の頭で離す。押す・離すとも拍の頭からのずれでPERFECT/GOOD。食う前の早押し・押し遅れ・早離し・押しすぎはMISS。粒の数は2→4→3→5→4と小節をまたぎ、4匹目からは押している間も粒が灯らないのでワルツの拍を数える。最後は金の魚(2倍)
// 終わり: 12小節(144BPMの三拍子・約15秒・5匹)を終えて MISS 2回以内ならCLEAR(判定の点+釣果ボーナス)。MISS 3回でGAME OVER
// @mechanic: hold_duration
// @theme: rental_boat_waltz_reel
// 世界観: 晴れた湖に浮かぶ貸しボートの上で、釣り好きの少年が岸から流れるワルツの三拍子に合わせ、食いついた一拍目から竿を立て続けて決められた拍数ぴったりで魚を引き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・釣った数・PERFECT/GOOD/MISS数
// スタイル: 2000s ARCADE POP
var STYLE = { bg: ['#fff6fb', '#bfe8ff'], main: ['#ff4fa3', '#2fa8ff', '#ffd400'], accent: ['#ffffff', '#4bd66b'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステル地・原色・太い白縁。光の柱、虹、星の「光り物」をたっぷり
  var C = {
    pink: STYLE.main[0], blue: STYLE.main[1], yellow: STYLE.main[2], white: STYLE.accent[0], green: STYLE.accent[1],
    sky: STYLE.bg[1], paper: STYLE.bg[0], lake: '#3cb6f0', lakeDk: '#1c7fd0', wood: '#ff9a3c', woodDk: '#d0601c',
    orange: '#ff7a1a', purple: '#9b5cff', red: '#ff3355', ink: '#3a2a5a', skin: '#ffd2a8', cap: '#2fa8ff'
  };

  var GAME_TITLE = 'WALTZ REEL';
  var BPM = 144;
  var SPB = 60 / BPM;            // 1拍 ≒ 0.417秒
  var BAR = 3;                   // 三拍子
  var BARS = 12;                 // 36拍 = 15秒
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var TELL = 1.5;                // 予告は食う1拍半前(≒0.63秒)
  var MISS_MAX = 3;
  var HIT_STOP = 0.45;

  // bite = 食う拍(必ず小節の1拍目)、n = 立て続ける拍数
  var PLANS = [
    [{ bite: 3, n: 2 }, { bite: 9, n: 4 }, { bite: 15, n: 3 }, { bite: 21, n: 5 }, { bite: 30, n: 4 }],
    [{ bite: 3, n: 3 }, { bite: 9, n: 2 }, { bite: 15, n: 4 }, { bite: 21, n: 5 }, { bite: 30, n: 4 }]
  ];
  var DEMO_PLAN = [{ bite: 3, n: 2 }, { bite: 9, n: 4 }];
  var DEMO_BEATS = 15;
  var DARK_FROM = 3;             // 4匹目から粒が灯らない

  // 岸のスピーカーから流れるワルツ(オリジナル)。ズン・チャッ・チャッの伴奏
  var MEL = [
    [['D5', 2], ['B4', 1]], [['G4', 1], ['A4', 1], ['B4', 1]], [['C5', 2], ['E5', 1]], [['D5', 3]],
    [['B4', 2], ['G4', 1]], [['A4', 1], ['B4', 1], ['C5', 1]], [['D5', 2], ['F#5', 1]], [['G5', 3]],
    [['E5', 2], ['C5', 1]], [['B4', 1], ['C5', 1], ['D5', 1]], [['A4', 2], ['F#4', 1]], [['G4', 3]]
  ];
  var ROOT = ['G2', 'G2', 'C3', 'D3', 'G2', 'D3', 'D3', 'G2', 'C3', 'G2', 'D3', 'G2'];
  var CHORD = { G2: ['B3', 'D4'], C3: ['E4', 'G4'], D3: ['F#4', 'A4'] };

  // ---- 配置 ----
  var LAKE_Y = H * 0.4;
  var BOAT_X = W * 0.34, BOAT_Y = H * 0.47;
  var FLOAT_X = W * 0.78, FLOAT_Y = LAKE_Y + 70;
  var PIP_Y = H * 0.625, METER_Y = H * 0.7;
  var BTN_X = W / 2, BTN_Y = H * 0.865;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var soundOn = false; // 最初の入力までは音を積まない

  var demoMode, catches, totalBeats, running, songT, beatN, nextBar, readyT;
  var held, touchN, active, hitStop, flashT, flashKind, flashCatch, beatFlash, splashT, landT, pillarT, reelT;
  var score, landed, perfects, goods, misses, streak, maxStreak, over, won, outroT, prevBest, milestone;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = isDemo ? DEMO_PLAN : PLANS[Math.floor(game.random(0, PLANS.length)) % PLANS.length];
    catches = [];
    for (var i = 0; i < src.length; i++) {
      catches.push({ bite: src[i].bite, n: src[i].n, idx: i, pressed: false, res: '', warned: false, gold: !isDemo && i === src.length - 1, dark: !isDemo && i >= DARK_FROM });
    }
    totalBeats = isDemo ? DEMO_BEATS : BAR * BARS;
    running = false; songT = 0; beatN = -1; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    held = false; touchN = 0; active = null;
    hitStop = 0; flashT = 0; flashKind = ''; flashCatch = null; beatFlash = 0; splashT = 0; landT = 0; pillarT = 0; reelT = 0;
    score = 0; landed = 0; perfects = 0; goods = 0; misses = 0; streak = 0; maxStreak = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) running = true;
  }

  function vol() { return demoMode ? 0.45 : 1; }
  function beep(f, d, o) { if (soundOn) game.audio.tone(f, d, o); }

  function playBar(b) {
    if (!soundOn) return;
    var root = ROOT[b % ROOT.length], ch = CHORD[root];
    var bass = [[root, 1], [ch[0], 1], [ch[1], 1]];
    game.audio.melody(MEL[b % MEL.length], { tempo: BPM, wave: 'square', volume: 0.028 * vol(), bass: bass, bassWave: 'triangle', bassVolume: 0.06 * vol() });
  }

  function nextCatch() {
    for (var i = 0; i < catches.length; i++) if (!catches[i].res) return catches[i];
    return null;
  }

  // ---- 拍クロック(1本だけ)----
  function onBeat(k) {
    if (k >= totalBeats) return;
    beatFlash = 1;
    var pos = k % BAR;
    if (pos === 0) pillarT = 0.5;
    beep(pos === 0 ? 1568 : 1175, 0.025, { wave: 'triangle', volume: (pos === 0 ? 0.05 : 0.03) * vol() });
    var c = active;
    if (c && held && !c.res && k > c.bite && k <= c.bite + c.n) {
      // 立てている間は1拍ごとにリールが鳴り、音が上がる(拍数の可聴化)
      reelT = 0.18;
      beep(440 * Math.pow(1.12, k - c.bite), 0.06, { wave: 'square', volume: 0.05 * vol() });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (beatN + 1 <= songT / SPB) { beatN++; onBeat(beatN); }
    while (nextBar < totalBeats / BAR && songT >= nextBar * BAR * SPB - 0.06) { playBar(nextBar); nextBar++; }
    for (var i = 0; i < catches.length; i++) {
      var c = catches[i];
      if (c.res) continue;
      var bt = c.bite * SPB, rt = (c.bite + c.n) * SPB;
      if (!c.warned && songT >= bt - TELL * SPB) {
        // 予告: 浮きに「!」と波紋、ピピッ
        c.warned = true; splashT = 0.5;
        beep(1319, 0.05, { wave: 'square', volume: 0.07 * vol() });
        beep(1760, 0.07, { wave: 'square', volume: 0.06 * vol() });
      }
      if (!c.pressed && songT > bt + GOOD_W) { missCatch(c, 'nobite'); continue; }
      if (c.pressed && songT > rt + GOOD_W) { missCatch(c, 'long'); active = null; }
    }
    if (!demoMode && !over && songT >= totalBeats * SPB + 0.1) finish(misses < MISS_MAX);
  }

  // ---- 判定 ----
  function pressRod() {
    if (!running || over || hitStop > 0) return 'none';
    var c = nextCatch();
    if (!c || c.pressed) return 'none';
    var d = songT - c.bite * SPB;
    if (Math.abs(d) <= GOOD_W) {
      c.pressed = true; active = c;
      if (Math.abs(d) <= PERFECT_W) { perfects++; score += 50; c.pr = 'PERFECT'; }
      else { goods++; score += 25; c.pr = 'GOOD'; }
      game.feedback.good(FLOAT_X, FLOAT_Y - 120, { text: c.pr, color: c.pr === 'PERFECT' ? C.pink : C.blue, size: 46, count: 8, volume: soundOn ? 0.2 : 0.001 });
      return 'ok';
    }
    if (d < -GOOD_W && d >= -TELL * SPB - 0.05) { missCatch(c, 'spook'); return 'miss'; }
    return 'none';
  }

  function releaseRod() {
    var c = active;
    active = null;
    if (!c || c.res || !running || over) return 'none';
    var d = songT - (c.bite + c.n) * SPB;
    if (d < -GOOD_W) { missCatch(c, 'short'); return 'miss'; }
    if (Math.abs(d) > GOOD_W) return 'none';
    var mult = c.gold ? 2 : 1;
    landed++; streak++;
    if (streak > maxStreak) maxStreak = streak;
    landT = 0.8;
    if (Math.abs(d) <= PERFECT_W) {
      c.res = 'perfect'; perfects++; score += (100 + c.n * 15) * mult;
      game.feedback.good(BOAT_X + 120, BOAT_Y - 220, { text: 'PERFECT', color: C.pink, size: 60, count: 18, volume: soundOn ? 0.3 : 0.001 });
    } else {
      c.res = 'good'; goods++; score += (60 + c.n * 15) * mult;
      game.feedback.good(BOAT_X + 120, BOAT_Y - 220, { text: 'GOOD', color: C.blue, size: 52, count: 10, volume: soundOn ? 0.25 : 0.001 });
    }
    game.fx.burst(BOAT_X + 120, BOAT_Y - 140, { color: c.gold ? C.yellow : C.green, count: c.gold ? 30 : 14, speed: 480 });
    beep(784 * Math.pow(1.06, Math.min(streak, 6)), 0.1, { wave: 'square', volume: 0.08 });
    if (!demoMode && !milestone && landed === 3) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(landed + ' / ' + catches.length, W / 2, H * 0.2, { color: C.purple, size: 84 });
    }
    return 'ok';
  }

  function missCatch(c, kind) {
    c.res = 'miss';
    misses++; streak = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP; flashKind = kind; flashCatch = c;
    var y = kind === 'spook' || kind === 'nobite' ? FLOAT_Y : FLOAT_Y + 120;
    game.feedback.bad(FLOAT_X, y, { text: 'MISS', shake: demoMode ? 4 : 10, volume: soundOn ? 0.5 : 0.001 });
    if (kind === 'short') {
      var left = Math.max(1, Math.round(c.bite + c.n - songT / SPB));
      game.fx.popup('あと' + left + '拍', W / 2, PIP_Y - 110, { color: C.pink, size: 56 });
    }
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false; active = null;
    game.audio.stopBgm();
    if (ok) {
      score += landed * 30 + maxStreak * 25;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(140, 940), game.random(300, 1000), { color: [C.pink, C.yellow, C.blue][i % 3], count: 22, speed: 460 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, H * 0.17, { color: C.pink, size: 76 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 押し続ける = 竿を立てる / 離す = 引き上げる ----
  game.onPress(function(x, y, id) {
    soundOn = true;
    if (state !== S.PLAYING || over) return;
    touchN++;
    if (held) return;
    held = true;
    var r = pressRod();
    game.audio.tone(r === 'ok' ? 660 : 392, 0.05, { wave: 'triangle', volume: 0.08 });
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    touchN = Math.max(0, touchN - 1);
    if (touchN > 0 || !held) return;
    held = false;
    if (over) return;
    var r = releaseRod();
    if (r === 'none') game.audio.play('se_tap', 0.2);
    else if (r === 'ok') game.audio.tone(1047, 0.08, { wave: 'square', volume: 0.07 });
  });
  game.onTap(function(x, y) {
    soundOn = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- スプライト ----
  function alter(src, changes) {
    var res = [];
    src.forEach(function(row, i) { res.push(changes[i] || row); });
    return res;
  }
  var BOY = [
    '...cccccc...', '..cccccccc..', '.cccccccccvv', '.hffffffffh.', '.fkffffffkf.', '.ffffffffff.',
    '.frffmmffrf.', '..ffffffff..', '...ssssss...', '..ssssssss..', '.ssssssssss.', '.ssssssssss.'
  ];
  var BOY_PULL = alter(BOY, { 4: '.fkkffffkkf.', 6: '.frfmmmmfrf.' });
  var BOY_JOY = alter(BOY, { 4: '.fkffffffkf.', 6: '.frmmmmmmrf.' });
  var BOY_OOPS = alter(BOY, { 4: '.kkffffffkk.', 6: '.frfffmmfrf.' });
  var BPAL = { c: C.cap, v: C.cap, h: C.ink, f: C.skin, k: C.ink, r: '#ff9ab5', m: C.red, s: C.yellow };
  var FISH = ['.....ooo...', '...oooooo.o', '.ooooooooo.', 'ooekooooooo', '.ooooooooo.', '...oooooo.o', '.....ooo...'];
  var OPAL = { o: C.orange, e: C.white, k: C.ink };
  var GPAL = { o: C.yellow, e: C.white, k: C.ink };
  var WPAL = { o: C.white, e: C.white, k: C.white };
  var STAR = ['..y..', '..y..', 'yyyyy', '..y..', '..y..'];

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var o = { size: sz, color: C.white, bold: true, align: align || 'center' };
    var e = Math.max(3, sz * 0.07);
    game.draw.text(str, x - e, y, o); game.draw.text(str, x + e, y, o);
    game.draw.text(str, x, y - e, o); game.draw.text(str, x, y + e, o);
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function pill(x, y, w, h, col, a) {
    var r = h / 2, al = a === undefined ? 1 : a;
    game.draw.rect(x + r, y, w - h, h, col, al);
    game.draw.circle(x + r, y + r, r, col, al);
    game.draw.circle(x + w - r, y + r, r, col, al);
  }

  function drawSkyLake(t) {
    game.draw.gradient(0, H, [[0, C.paper], [0.34, C.sky], [0.4, C.lake], [0.6, C.lakeDk], [0.62, '#ffe6f3'], [1, C.paper]]);
    // 虹(点の弧)
    var rb = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
    for (var b = 0; b < rb.length; b++) {
      var R = 520 - b * 26;
      for (var a = 0; a <= 36; a++) {
        var ang = Math.PI + a / 36 * Math.PI;
        game.draw.circle(W * 0.62 + Math.cos(ang) * R, LAKE_Y - 10 + Math.sin(ang) * R * 0.62, 12, rb[b], 0.55);
      }
    }
    // 光の柱(小節の1拍目)
    if (pillarT > 0) {
      for (var p = 0; p < 4; p++) game.draw.rect(90 + p * 270, 230, 90, LAKE_Y - 230, C.white, pillarT * 0.6);
    }
    // 雲と岸
    for (var cl = 0; cl < 3; cl++) {
      var cx = ((t * 30 + cl * 400) % (W + 300)) - 150, cy = 330 + cl * 70;
      game.draw.circle(cx, cy, 50, C.white); game.draw.circle(cx + 50, cy - 20, 60, C.white); game.draw.circle(cx + 110, cy, 46, C.white);
    }
    for (var h = 0; h < 8; h++) game.draw.circle(h * 160 + 40, LAKE_Y + 30, 110, C.green);
    game.draw.rect(0, LAKE_Y, W, 40, '#2fa84e');
    // 星のきらめき
    for (var s = 0; s < 10; s++) {
      var tw = (Math.sin(t * 4 + s * 1.7) + 1) / 2;
      game.draw.sprite(STAR, { y: s % 2 ? C.yellow : C.white }, (s * 211 + 70) % W, 260 + (s * 97) % 300, 4 + tw * 4, { anchor: 'center', alpha: 0.4 + tw * 0.6 });
    }
    // 湖面のきらめき
    for (var w = 0; w < 14; w++) {
      var wx = (w * 157 + t * 40) % W, wy = LAKE_Y + 140 + (w * 53) % 300;
      pill(wx, wy, 60, 10, C.white, 0.5);
    }
  }

  function rodTip() {
    var bend = active && held ? 60 + reelT * 120 : 0;
    var up = active && held ? 1 : 0;
    return [BOAT_X + 330 - up * 60, BOAT_Y - 260 - up * 120 + bend];
  }

  function drawBoat(t) {
    var stop = flashT > 0 && hitStop > 0;
    var rock = running ? (beatN % BAR === 0 ? beatFlash * 10 : beatFlash * 4) : Math.sin(t * 2) * 6;
    var by = BOAT_Y + rock;
    // 船体(太い白縁)
    pill(BOAT_X - 250, by - 16, 500, 110, C.white);
    pill(BOAT_X - 238, by - 6, 476, 90, C.wood);
    game.draw.rect(BOAT_X - 200, by + 40, 400, 16, C.woodDk);
    label('7', BOAT_X - 150, by + 30, 46, C.blue);
    // オール
    game.draw.line(BOAT_X - 190, by - 4, BOAT_X - 330, by + 90, C.woodDk, 12);
    // 少年
    var spr = BOY;
    if (over && state !== S.ATTRACT) spr = won ? BOY_JOY : BOY_OOPS;
    else if (stop) spr = BOY_OOPS;
    else if (landT > 0) spr = BOY_JOY;
    else if (active && held) spr = BOY_PULL;
    game.draw.sprite(spr, BPAL, BOAT_X, by - 110, 14, { anchor: 'center' });
    // 竿と糸
    var tip = rodTip();
    var hx = BOAT_X + 70, hy = by - 70;
    var mx = (hx + tip[0]) / 2 + (active && held ? 40 : 0), my = (hy + tip[1]) / 2 + (active && held ? 50 : 0);
    game.draw.line(hx, hy, mx, my, C.white, 14);
    game.draw.line(mx, my, tip[0], tip[1], C.white, 10);
    game.draw.line(hx, hy, mx, my, C.pink, 8);
    game.draw.line(mx, my, tip[0], tip[1], C.pink, 5);
    var fy = floatY(t);
    game.draw.line(tip[0], tip[1], FLOAT_X, fy, C.ink, 2);
  }

  function floatY(t) {
    var c = nextCatch();
    var y = FLOAT_Y + Math.sin(t * 3) * 6;
    if (c && running && c.warned && !c.pressed) y += Math.sin(t * 40) * 8;
    if (active && held) y += 24;
    return y;
  }

  function drawWater(t) {
    var stop = flashT > 0 && hitStop > 0;
    var c = active || nextCatch();
    var fy = floatY(t);
    // 予告の波紋と「!」
    if (c && running && c.warned && !c.pressed && !c.res) {
      var ph = (t * 3) % 1;
      pill(FLOAT_X - 50 - ph * 70, FLOAT_Y + 20, 100 + ph * 140, 14, C.white, 1 - ph);
      label('!', FLOAT_X + 70, FLOAT_Y - 110 + Math.sin(t * 20) * 6, 96, C.red);
    }
    // 浮き
    game.draw.circle(FLOAT_X, fy, 26, C.white);
    game.draw.circle(FLOAT_X, fy - 6, 20, C.red);
    game.draw.rect(FLOAT_X - 18, fy, 36, 14, C.white);
    // 糸の先の魚(拍ごとに一段ずつ水面へ寄る)
    var fishY = FLOAT_Y + 210;
    if (active && held && !active.res) {
      var prog = Math.min(1, Math.max(0, (songT / SPB - active.bite) / active.n));
      fishY = FLOAT_Y + 210 - Math.floor(prog * active.n) / active.n * 150;
      game.draw.line(FLOAT_X, fy + 10, FLOAT_X, fishY, C.ink, 2);
      game.draw.sprite(FISH, active.gold ? GPAL : OPAL, FLOAT_X, fishY, 11, { anchor: 'center' });
    } else if (c && running && c.warned && !c.res) {
      game.draw.sprite(FISH, c.gold ? GPAL : OPAL, FLOAT_X + 90 - Math.min(1, (songT - (c.bite - TELL) * SPB) / (TELL * SPB)) * 90, fishY, 11, { anchor: 'center', alpha: 0.7 });
    }
    if (stop && flashCatch) {
      var k = flashT / HIT_STOP;
      var hy = flashKind === 'spook' || flashKind === 'nobite' ? FLOAT_Y + 210 : FLOAT_Y + 130;
      game.draw.circle(FLOAT_X, hy, 100 + (1 - k) * 80, C.white, 0.6 * k);
      game.draw.sprite(FISH, WPAL, FLOAT_X + (1 - k) * 120, hy, 15, { anchor: 'center' });
    }
    // 釣れた魚が跳ね上がる
    if (landT > 0) {
      var u = 1 - landT / 0.8;
      game.draw.sprite(FISH, OPAL, FLOAT_X - u * 380, FLOAT_Y - Math.sin(u * Math.PI) * 300, 12, { anchor: 'center' });
    }
  }

  // 粒: 3つで1小節。最後の粒(魚印)の拍で離す。押している間は1拍ごとに灯る(4匹目から灯らない)
  function drawPips(t) {
    var c = active || nextCatch();
    pill(70, PIP_Y - 90, W - 140, 180, C.white);
    pill(84, PIP_Y - 76, W - 168, 152, '#ffe6f3');
    if (!c) return;
    var n = c.n, x0 = W / 2 - ((n - 1) * 130 + Math.floor((n - 1) / 3) * 40) / 2;
    var held2 = c === active && held;
    var cnt = held2 ? Math.floor(songT / SPB - c.bite + 1e-6) : 0;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * 130 + Math.floor(i / 3) * 40;
      var big = (c.bite + i) % BAR === 0;
      var r = big ? 46 : 36;
      var lit = held2 && !c.dark && cnt > i;
      var bad = flashT > 0 && hitStop > 0 && flashCatch === c;
      game.draw.circle(x, PIP_Y, r + 8, C.white);
      game.draw.circle(x, PIP_Y, r, bad ? C.red : (lit ? (c.gold ? C.yellow : C.pink) : (c.dark ? '#d9c8f0' : '#ffc4df')));
      if (i === n - 1) game.draw.sprite(FISH, c.gold ? GPAL : OPAL, x, PIP_Y, 5, { anchor: 'center' });
      if (i > 0 && i % 3 === 0) game.draw.rect(x - 85, PIP_Y - 50, 8, 100, C.purple);
    }
  }

  // ワルツの拍(ズン・チャッ・チャッ)
  function drawMeter(t) {
    var pos = running && beatN >= 0 ? beatN % BAR : -1;
    for (var i = 0; i < BAR; i++) {
      var x = W / 2 + (i - 1) * 200;
      var r = i === 0 ? 54 : 38;
      var on = i === pos;
      if (on) game.draw.circle(x, METER_Y, r + 16 + beatFlash * 14, C.yellow, 0.5);
      game.draw.circle(x, METER_Y, r + 8, C.white);
      game.draw.circle(x, METER_Y, r, on ? (i === 0 ? C.pink : C.blue) : '#cfe9ff');
    }
  }

  function drawButton(t) {
    var c = nextCatch();
    var live = running && c && !c.pressed && c.warned;
    var pr = held ? 14 : 0;
    var rb = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
    for (var i = 0; i < rb.length; i++) game.draw.circle(BTN_X, BTN_Y, 200 - i * 6 - pr, rb[i], live ? 1 : 0.5);
    game.draw.circle(BTN_X, BTN_Y, 160 - pr, C.white);
    game.draw.circle(BTN_X, BTN_Y, 140 - pr, held ? C.pink : (live ? C.yellow : C.blue));
    // 竿の握りのアイコン
    game.draw.rect(BTN_X - 16, BTN_Y - 90 + pr, 32, 150, C.white);
    game.draw.circle(BTN_X + 40, BTN_Y + 20, 26, C.white);
    if (live && Math.floor(t * 8) % 2 === 0) game.draw.circle(BTN_X, BTN_Y, 220, C.yellow, 0.3);
  }

  function drawHud() {
    pill(20, 20, W - 40, 190, C.pink);
    pill(32, 32, W - 64, 166, C.white);
    label('SCORE ' + score, 70, 86, 50, C.pink, 'left');
    label('BEST ' + prevBest, 70, 156, 34, C.blue, 'left');
    label(landed + ' / ' + catches.length, W - 70, 86, 54, C.purple, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 250 + m * 66, 156, 20, m < misses ? C.red : '#e8dff5');
    var p = Math.max(0, Math.min(1, songT / (totalBeats * SPB)));
    game.draw.rect(90, 196, (W - 180) * p, 10, C.yellow);
  }

  function drawScene(t) {
    drawSkyLake(t);
    drawBoat(t);
    drawWater(t);
    drawPips(t);
    drawMeter(t);
    drawButton(t);
  }

  // ---- ATTRACT: 実ロジックで 2拍立てて離す(PERFECT)→4拍のところを3拍で離す(MISS・あと1拍) ----
  var demo = { t: 0, hx: BTN_X + 80, hy: BTN_Y + 80, press: false, done: [] };
  var DEMO_LEN = DEMO_BEATS * SPB + 0.6;
  var DEMO_ACTS = [[3 * SPB, 1], [5 * SPB + 0.02, 0], [9 * SPB + 0.08, 1], [12 * SPB, 0]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = []; demo.press = false; }
    var nt = songT + dt;
    for (var i = 0; i < DEMO_ACTS.length; i++) {
      var a = DEMO_ACTS[i];
      if (demo.done[i] || nt < a[0]) continue;
      demo.done[i] = true;
      if (a[1] === 1) { held = true; demo.press = true; pressRod(); }
      else { held = false; demo.press = false; releaseRod(); }
    }
    stepPlay(dt);
    var tx = demo.press ? BTN_X : BTN_X + 90, ty = demo.press ? BTN_Y : BTN_Y + 90;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 16);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 16);
  }

  function tick(dt) {
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (splashT > 0) splashT -= dt;
    if (landT > 0) landT -= dt;
    if (pillarT > 0) pillarT -= dt;
    if (reelT > 0) reelT -= dt;
    if (beatFlash > 0) beatFlash = Math.max(0, beatFlash - dt * 4);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tick(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      pill(20, 20, W - 40, 190, C.pink);
      pill(32, 32, W - 64, 166, C.white);
      label(GAME_TITLE, W / 2, 96, 92 + Math.sin(t * 3) * 4, C.pink);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 170, 34, C.blue);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.76, 46, C.pink);
      else label('TAP TO START', W / 2, H * 0.76, 42, C.blue);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      pill(70, 250, W - 140, 600, C.pink);
      pill(84, 264, W - 168, 572, C.white);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 380, 96, won ? C.pink : C.purple);
      label('SCORE ' + score, W / 2, 480, 58, C.ink);
      label(landed + ' / ' + catches.length, W / 2, 556, 48, C.orange);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 626, 32, C.blue);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 700, 54, C.pink);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 700, 42, C.blue);
      if (!won) label('あと' + Math.max(1, catches.length - (MISS_MAX - 1) - landed) + '匹!', W / 2, 770, 46, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.76, 40, C.purple);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, landed: landed, perfect: perfects, good: goods, miss: misses, maxStreak: maxStreak };
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
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.pink);
    if (over && won) label('FINISH', W / 2, H * 0.3, 104, C.pink);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
