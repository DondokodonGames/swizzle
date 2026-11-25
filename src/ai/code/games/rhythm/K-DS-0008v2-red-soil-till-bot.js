// K-DS-0008v2-red-soil-till-bot.js
// 赤土の交互耕し — 鼓動灯の拍が鳴る小節のあいだ左右の鍬腕を拍の頭で交互に打ち込み、拍に乗った打数だけ赤土の畝を旗まで伸ばす
// 操作: 画面の左半分=左腕、右半分=右腕(下端に台座を表示)。拍の鳴る小節では光っている側の台座を拍の頭で押す(左右交互・押した瞬間で判定)。拍に乗った1打で畝が1区画伸びる。拍外れ・同じ拍への2打目・光っていない側はMISS。拍の止む小節(鼓動灯が赤・排熱中)に押すと過熱でMISS
// 終わり: 132BPM・前奏1小節+7小節(約14.5秒)。畝が15区画先の旗に届けばCLEAR。MISS4回、または残りの拍では旗に届かなくなった時点でGAME OVER。拍の止む小節の0.7秒前に鼓動灯が赤く点滅し警告音で予告
// @mechanic: mash
// @theme: red_planet_soil_tilling
// 世界観: 赤い砂の惑星の開拓基地の外れで、二本腕の農作業ロボットが基地の鼓動灯の拍に合わせて硬い赤土へ鍬を左右交互に打ち込み、温室へ続く畝を旗まで耕し伸ばす
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・耕した区画数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 90s LOW POLY

(function(game) {
  var STYLE = { bg: ['#2a1420', '#c8603c'], main: ['#b4462a', '#e08a4e', '#6e2a1e'], accent: ['#5ad8c8', '#f4e4b0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップ塗りのベタ、輪郭は line。頂点を毎フレーム微小に揺らし、遠景はフォグで潰す
  var C = {
    skyTop: STYLE.bg[0], skyLow: STYLE.bg[1], soil: STYLE.main[0], soilLit: STYLE.main[1], soilDark: STYLE.main[2],
    teal: STYLE.accent[0], cream: STYLE.accent[1],
    ink: '#1a0c10', fog: '#d89a78', mesa: '#8a3a2a', mesaLit: '#b85a3e', metal: '#a4aeb8', metalD: '#5a6270',
    crust: '#7a2c1e', red: '#ff4a3a', green: '#8ae0a0', gold: '#ffd060', gray: '#6a5a5a'
  };

  var GAME_TITLE = 'RED SOIL TILL';
  var BPM = 132;
  var SPB = 60 / BPM;
  var BAR = SPB * 4;
  var BARS = ['L', 'W', 'W', 'R', 'W', 'W', 'R', 'W'];   // L=前奏 W=拍の鳴る小節 R=拍の止む小節(排熱)
  var NB = BARS.length * 4;
  var NEEDED = 15;
  var MISS_LIMIT = 4;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var READY_T = 0.8;
  var TIME_LIMIT = 15;
  var WARN_LEAD = 0.7;
  var ARM_T = 0.16;
  var FX0 = 110, SEG = 56, FURROW_Y = 1180;
  var PAD_Y = 1660, PAD_R = 165, PAD_X = [270, 810];

  // 伴奏(オリジナル): 乾いた開拓地の作業歌。拍の鳴る小節だけ旋律、止む小節は低い持続音
  var MEL = [
    [['D5', 1], ['F5', 0.5], ['A5', 0.5], ['G5', 1], ['F5', 1]],
    [['A5', 0.5], ['G5', 0.5], ['F5', 1], ['E5', 1], ['D5', 1]],
    [['F5', 1], ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 1]],
    [['G5', 0.5], ['F5', 0.5], ['E5', 1], ['C5', 1], ['D5', 1]]
  ];
  var BASS = [['D3', 1], ['D3', 1], ['A2', 1], ['C3', 1]];

  // ---- スプライト ----
  var BOT_A = [
    '....a....',
    '....a....',
    '.mmmmmmm.',
    '.mkkkkkm.',
    '.mkekekm.',
    '.mkkkkkm.',
    '.mmmmmmm.',
    '...ddd...',
    '.bbbbbbb.',
    '.bbbcbbb.',
    '.bbbbbbb.',
    '.ww...ww.',
    'wwww.wwww'
  ];
  var BOT_B = [
    '.....a...',
    '....a....',
    '.mmmmmmm.',
    '.mkkkkkm.',
    '.mkekekm.',
    '.mkkkkkm.',
    '.mmmmmmm.',
    '...ddd...',
    '.bbbbbbb.',
    '.bbbcbbb.',
    '.bbbbbbb.',
    '.ww...ww.',
    '.www.www.'
  ];
  var BOT_OOPS = [
    '...a.a...',
    '....a....',
    '.mmmmmmm.',
    '.mkkkkkm.',
    '.mekkkem.',
    '.mkkekkm.',
    '.mmmmmmm.',
    '...ddd...',
    '.bbbbbbb.',
    '.bbbcbbb.',
    '.bbbbbbb.',
    '.ww...ww.',
    'wwww.wwww'
  ];
  var BOT_PAL = { a: '#5a6270', m: '#a4aeb8', k: '#1a2a30', e: '#5ad8c8', d: '#5a6270', b: '#e08a4e', c: '#5ad8c8', w: '#3a3a44' };
  var BOT_PAL_HOT = { a: '#5a6270', m: '#ffffff', k: '#1a2a30', e: '#ff4a3a', d: '#ffffff', b: '#ffffff', c: '#ff4a3a', w: '#3a3a44' };
  var CELL = ['.mm.', 'mccm', 'mccm', 'mccm'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, prevClock, cuedBar, struck, tilled, misses, score, nP, nG, combo, maxCombo;
  var over, won, outroT, hitStop, demoMode, prevBest, botX, botHit, armT, padFlash, steam, warnOn;
  var beatPulse = 0;

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; prevClock = clock; cuedBar = -99;
    struck = []; tilled = 0; misses = 0; score = 0; nP = 0; nG = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    botX = segX(0) + 20; botHit = 0; armT = [0, 0]; padFlash = [0, 0]; steam = []; warnOn = false;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function barOf(i) { return Math.floor(i / 4); }
  function isWork(i) { return i >= 0 && i < NB && BARS[barOf(i)] === 'W'; }
  function segX(k) { return FX0 + k * SEG; }
  function barNow() { return Math.max(0, Math.min(BARS.length - 1, Math.floor(clock / BAR))); }
  function restSoon() {
    var b = barNow();
    if (clock < 0) return false;
    if (BARS[b] === 'R') return true;
    var nb = b + 1;
    return nb < BARS.length && BARS[nb] === 'R' && clock >= nb * BAR - WARN_LEAD;
  }

  // ---- 低ポリ描画ヘルパー(横ストリップ塗り) ----
  function poly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { if (pts[i][1] < minY) minY = pts[i][1]; if (pts[i][1] > maxY) maxY = pts[i][1]; }
    for (var y = Math.floor(minY); y < maxY; y += 2) {
      var xl = 1e9, xr = -1e9, yy = y + 1;
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          var x = a[0] + (yy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, 2, col, alpha);
    }
  }
  function edge(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      game.draw.line(a[0], a[1], b[0], b[1], col, w || 3);
    }
  }
  function jit(i) { return Math.sin(game.time.elapsed * 9 + i * 1.7) * 1.6; }
  function J(x, y, i) { return [x + jit(i), y + jit(i + 5)]; }

  // ---- 判定 ----
  function miss(why) {
    misses++; combo = 0; botHit = 0.32;
    game.feedback.bad(botX, FURROW_Y - 200, { text: 'MISS', shake: demoMode ? 3 : 8, volume: demoMode ? 0 : 0.45 });
    if (why === 'heat') {
      for (var s = 0; s < 4; s++) steam.push({ x: botX + game.random(-50, 50), y: FURROW_Y - 230, t: 0.8 });
      sfx('se_break', 0.35);
    }
    if (!demoMode && misses >= MISS_LIMIT) { hitStop = 0.45; finish(false); }
  }

  function strike(side) {
    padFlash[side] = 0.12;
    if (over) return 'over';
    if (clock < BAR - GOOD_W * 1.5) { tone(320, 0.04, { wave: 'triangle', volume: 0.06 }); return 'air'; }
    armT[side] = ARM_T;
    var j = Math.max(0, Math.min(NB - 1, Math.round(clock / SPB)));
    var ad = Math.abs(clock - j * SPB);
    tone(side ? 190 : 150, 0.05, { wave: 'square', volume: 0.1 });
    if (BARS[barOf(j)] === 'R') { miss('heat'); return 'miss'; }
    if (BARS[barOf(j)] !== 'W') return 'air';
    if (ad > GOOD_W) { miss('off'); return 'miss'; }
    if (struck[j]) { miss('double'); return 'miss'; }
    struck[j] = true;
    if (j % 2 !== side) { miss('side'); return 'miss'; }
    var perfect = ad <= PERFECT_W;
    if (perfect) nP++; else nG++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    score += (perfect ? 100 : 60) + Math.min(50, combo * 5);
    tilled++;
    var sx = segX(tilled - 1) + SEG / 2;
    game.fx.burst(sx, FURROW_Y - 20, { color: C.soilLit, count: 6, speed: 220 });
    game.feedback.good(sx, FURROW_Y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: perfect ? 50 : 42, count: 8, volume: demoMode ? 0 : 0.25 });
    if (!demoMode && tilled === 8) { game.fx.popup(tilled + ' / ' + NEEDED, W / 2, 520, { color: C.gold, size: 72 }); sfx('se_milestone', 0.45); }
    if (!demoMode && combo > 0 && combo % 8 === 0) game.fx.popup('COMBO ' + combo, W / 2, 420, { color: C.teal, size: 60 });
    if (!demoMode && tilled >= NEEDED) finish(true);
    return 'hit';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      var left = 0;
      for (var i = 0; i < NB; i++) if (isWork(i) && i * SPB > clock + GOOD_W) left++;
      score += (MISS_LIMIT - misses) * 200 + left * 50;
      for (var k = 0; k < 6; k++) game.fx.burst(140 + k * 160, 760 + (k % 2) * 200, { color: [C.gold, C.teal, C.cream][k % 3], count: 18, speed: 420 });
      game.fx.flash(C.cream, 0.12);
      sfx('se_success', 0.55);
    } else {
      game.fx.flash('#ffffff', 0.18);
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, tilled: tilled, total: NEEDED, perfect: nP, good: nG, miss: misses, maxCombo: maxCombo };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function cueBar(b) {
    if (demoMode) return;
    var t = BARS[b];
    if (t === 'L') game.audio.melody([['D4', 1], ['R', 1], ['D4', 1], ['A4', 1]], { tempo: BPM, wave: 'triangle', volume: 0.04, bass: [['D2', 2], ['A2', 2]], bassVolume: 0.06 });
    else if (t === 'W') game.audio.melody(MEL[b % MEL.length], { tempo: BPM, wave: 'square', volume: 0.045, bass: BASS, bassVolume: 0.08 });
    else game.audio.melody([['F4', 2], ['E4', 2]], { tempo: BPM, wave: 'sine', volume: 0.05, bass: [['D2', 4]], bassVolume: 0.05 });
  }

  function onBeat(i) {
    beatPulse = 1;
    var bt = BARS[barOf(i)];
    if (bt === 'W') {
      tone(i % 2 ? 'A2' : 'D2', 0.09, { wave: 'square', volume: 0.1 });
      tone(i % 4 === 0 ? 'D5' : 'A4', 0.04, { wave: 'triangle', volume: 0.05 });
    } else if (bt === 'L') {
      tone(i % 4 === 3 ? 'E5' : 'A4', 0.06, { wave: 'square', volume: 0.07 });
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    for (var b = 0; b < BARS.length; b++) {
      if (b > cuedBar && clock + 0.06 >= b * BAR) { cuedBar = b; cueBar(b); }
      // 拍の止む小節の予告(0.7秒前): 鼓動灯が赤く点滅 + 警告音
      if (BARS[b] === 'R') {
        var wt = b * BAR - WARN_LEAD;
        if (prevClock < wt && clock >= wt) { tone(660, 0.12, { wave: 'sawtooth', volume: 0.07, slide: -300 }); tone(440, 0.12, { wave: 'sawtooth', volume: 0.05, slide: -200 }); }
      }
    }
    for (var i = 0; i < NB; i++) if (prevClock < i * SPB && clock >= i * SPB) onBeat(i);
    if (over) return;
    if (!demoMode) {
      var remain = 0;
      for (var j = 0; j < NB; j++) if (isWork(j) && !struck[j] && j * SPB + GOOD_W > clock) remain++;
      if (tilled + remain < NEEDED) {
        botHit = 0.32;
        game.feedback.bad(botX, FURROW_Y - 200, { text: 'MISS', shake: 12, volume: 0.5 });
        hitStop = 0.45; finish(false); return;
      }
    }
    if (clock >= NB * SPB + 0.2 || clock > TIME_LIMIT) finish(tilled >= NEEDED);
  }

  function tickFx(dt) {
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (botHit > 0) botHit -= dt;
    for (var s = 0; s < 2; s++) { if (armT[s] > 0) armT[s] -= dt; if (padFlash[s] > 0) padFlash[s] -= dt; }
    var tx = segX(Math.min(tilled, NEEDED)) + 20;
    botX += (tx - botX) * Math.min(1, dt * 8);
    if (restSoon() && BARS[barNow()] === 'R' && Math.random() < dt * 8) steam.push({ x: botX + game.random(-40, 40), y: FURROW_Y - 230, t: 0.9 });
    for (var k = steam.length - 1; k >= 0; k--) {
      steam[k].t -= dt; steam[k].y -= 120 * dt;
      if (steam[k].t <= 0) steam.splice(k, 1);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 240) return;
    var side = x < W / 2 ? 0 : 1;
    var r = strike(side);
    game.fx.burst(PAD_X[side], PAD_Y, { color: r === 'hit' ? C.teal : (r === 'miss' ? C.red : C.cream), count: 4, speed: 140 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function box(x, y, w, h, edgeCol) {
    game.draw.rect(x, y, w, h, C.ink, 0.88);
    game.draw.rect(x, y, w, 6, edgeCol); game.draw.rect(x, y + h - 6, w, 6, edgeCol);
    game.draw.rect(x, y, 6, h, edgeCol); game.draw.rect(x + w - 6, y, 6, h, edgeCol);
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 640, [[0, C.skyTop], [0.55, '#7a3030'], [1, C.skyLow]]);
    // 二つの月
    game.draw.circle(820, 330, 44, '#e8c8a8', 0.85);
    game.draw.circle(808, 322, 44, '#c8a088', 0.4);
    game.draw.circle(200, 290, 18, '#d8b8a0', 0.7);
    // 遠景の台地(低ポリ + フォグ)
    var m1 = [J(0, 640, 1), J(60, 520, 2), J(230, 490, 3), J(330, 560, 4), J(380, 640, 5)];
    var m2 = [J(560, 640, 6), J(650, 540, 7), J(760, 470, 8), J(900, 490, 9), J(1000, 600, 10), J(1080, 640, 11)];
    poly(m1, C.mesa); poly([m1[1], m1[2], [200, 640], [40, 640]], C.mesaLit);
    poly(m2, C.mesa); poly([m2[2], m2[3], [860, 640], [740, 640]], C.mesaLit);
    edge(m1, C.soilDark, 2); edge(m2, C.soilDark, 2);
    game.draw.rect(0, 560, W, 80, C.fog, 0.32);
    // 地面(遠いほどフォグ)
    game.draw.rect(0, 640, W, 800, C.soil);
    for (var r = 0; r < 9; r++) {
      var gy = 640 + r * r * 10;
      game.draw.line(0, gy + jit(r), W, gy + jit(r + 2), C.soilDark, 2);
    }
    for (var v = -6; v <= 6; v++) game.draw.line(540 + v * 30 + jit(v), 640, 540 + v * 260, 1440, C.soilDark, 2);
    game.draw.rect(0, 636, W, 50, C.fog, 0.45);
    game.draw.rect(0, 686, W, 40, C.fog, 0.2);
    // 開拓基地のドーム(低ポリ)
    var dome = [];
    for (var d = 0; d <= 6; d++) { var a = Math.PI + d * Math.PI / 6; dome.push(J(190 + Math.cos(a) * 140, 790 + Math.sin(a) * 120, 20 + d)); }
    poly(dome, C.metalD);
    poly([dome[2], dome[3], dome[4], [260, 790], [120, 790]], C.metal);
    edge(dome, C.ink, 3);
    game.draw.rect(160, 750, 60, 40, C.ink, 0.7);
    // 鼓動灯の柱: 拍で脈打つ。止む小節とその予告は赤く点滅
    game.draw.line(330, 790, 330 + jit(30), 600, C.metalD, 8);
    var red = restSoon();
    var blink = Math.floor(t * 10) % 2 === 0;
    var bc = red ? (blink || BARS[barNow()] === 'R' ? C.red : C.cream) : C.teal;
    game.draw.circle(330, 590, 26 + beatPulse * 22, bc, 0.25 + beatPulse * 0.3);
    game.draw.circle(330, 590, 20, bc);
    // 温室(旗の先)
    var gh = [J(960, 1000, 40), J(1010, 940, 41), J(1070, 1000, 42), J(1070, 1080, 43), J(960, 1080, 44)];
    poly(gh, C.teal, 0.35); edge(gh, C.cream, 3);
  }

  function drawFurrow() {
    var fy = FURROW_Y;
    game.draw.rect(FX0 - 20, fy - 40, NEEDED * SEG + 40, 70, C.soilDark, 0.5);
    for (var k = 0; k < NEEDED; k++) {
      var x = segX(k);
      if (k < tilled) {
        var top = [J(x + 6, fy - 34, k), J(x + SEG - 8, fy - 34, k + 1), [x + SEG - 2, fy - 14], [x, fy - 14]];
        poly([[x, fy - 14], [x + SEG - 2, fy - 14], [x + SEG - 2, fy + 18], [x, fy + 18]], C.soilDark);
        poly(top, C.soilLit);
        edge(top, C.ink, 2);
      } else {
        poly([[x, fy - 6], [x + SEG - 4, fy - 6], [x + SEG - 4, fy + 10], [x, fy + 10]], C.crust);
        game.draw.line(x + 8, fy, x + 26, fy + 6, C.ink, 2);
        game.draw.line(x + 26, fy + 6, x + 40, fy - 2, C.ink, 2);
      }
    }
    // 旗(15区画先)
    var fx = segX(NEEDED) + 6, wv = Math.sin(game.time.elapsed * 6) * 10;
    game.draw.line(fx, fy + 10, fx, fy - 170, C.metal, 6);
    var flag = [[fx, fy - 170], [fx + 80, fy - 145 + wv * 0.4], [fx, fy - 115]];
    poly(flag, tilled >= NEEDED ? C.gold : C.teal);
    edge(flag, C.ink, 2);
  }

  function drawBot() {
    var bx = botX, by = FURROW_Y - 110;
    var hot = botHit > 0;
    var sc = hot ? 14 + botHit * 10 : 12;
    var rest = clock >= 0 && BARS[barNow()] === 'R';
    var art = hot ? BOT_OOPS : (beatPulse > 0.5 && !rest ? BOT_B : BOT_A);
    // 影
    game.draw.rect(bx - 70, FURROW_Y + 24, 140, 14, C.ink, 0.35);
    // 腕と鍬(左右)
    for (var s = 0; s < 2; s++) {
      var dir = s === 0 ? -1 : 1;
      var shx = bx + dir * 46, shy = by - 6;
      var p = armT[s] > 0 ? armT[s] / ARM_T : 0;
      var tipX = bx + dir * (rest ? 80 : 110 - p * 64);
      var tipY = rest ? by - 120 : (by - 90 + p * 200);
      game.draw.line(shx, shy, (shx + tipX) / 2 + dir * 20, (shy + tipY) / 2 - 20, C.metalD, 12);
      game.draw.line((shx + tipX) / 2 + dir * 20, (shy + tipY) / 2 - 20, tipX, tipY, C.metal, 10);
      var blade = [[tipX - 22, tipY], [tipX + 22, tipY], [tipX + 14 * dir, tipY + 30]];
      poly(blade, s === 0 ? C.teal : C.cream);
      edge(blade, C.ink, 2);
    }
    game.draw.sprite(art, hot ? BOT_PAL_HOT : BOT_PAL, bx, by - beatPulse * 6, sc, { anchor: 'center' });
    for (var k = 0; k < steam.length; k++) game.draw.circle(steam[k].x, steam[k].y, 18 + (0.9 - steam[k].t) * 30, C.cream, Math.max(0, steam[k].t * 0.5));
  }

  // 次に打つ拍(拍の鳴る小節のみ)
  function nextWorkBeat() {
    for (var i = 0; i < NB; i++) if (isWork(i) && !struck[i] && i * SPB + GOOD_W > clock) return i;
    return -1;
  }

  function drawPads() {
    game.draw.rect(0, 1440, W, H - 1440, C.ink, 0.55);
    var nw = nextWorkBeat();
    var rest = clock >= 0 && BARS[barNow()] === 'R';
    var warn = restSoon();
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    for (var s = 0; s < 2; s++) {
      var px = PAD_X[s], lit = nw >= 0 && nw % 2 === s && clock >= nw * SPB - SPB * 1.2 && !rest;
      var hex = [];
      for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; hex.push(J(px + Math.cos(a) * PAD_R, PAD_Y + Math.sin(a) * PAD_R * 0.8, 50 + k + s * 6)); }
      var col = rest ? '#5a1e1e' : (lit ? C.teal : C.metalD);
      if (padFlash[s] > 0) col = '#ffffff';
      poly(hex, col);
      poly([hex[3], hex[4], hex[5], [px, PAD_Y]], rest ? '#7a2a2a' : (lit ? '#8af0e0' : C.metal), 0.6);
      edge(hex, warn && blink ? C.red : C.ink, warn && blink ? 8 : 4);
      // 鍬の刃アイコン(左右)
      var dir = s === 0 ? -1 : 1;
      poly([[px - 40, PAD_Y - 20], [px + 40, PAD_Y - 20], [px + 30 * dir, PAD_Y + 40]], rest ? C.gray : C.ink, 0.8);
      if (rest) for (var w = 0; w < 3; w++) game.draw.line(px - 50 + w * 50, PAD_Y - 70 - Math.sin(game.time.elapsed * 8 + w) * 8, px - 40 + w * 50, PAD_Y - 110, C.red, 5);
      // 縮む輪: 拍の頭で台座にぴったり重なる
      if (lit && nw >= 0) {
        var until = nw * SPB - clock;
        if (until > -GOOD_W) {
          var rr = PAD_R * 0.8 + Math.max(0, until) / SPB * 110;
          game.draw.circle(px, PAD_Y, rr, C.cream, 0.18);
          game.draw.circle(px, PAD_Y, PAD_R * 0.8, C.cream, 0.12 + beatPulse * 0.2);
        }
      }
    }
  }

  function drawHud() {
    box(20, 16, W - 40, 210, C.teal);
    label('SCORE ' + score, 60, 70, 40, C.cream, 'left');
    label(tilled + ' / ' + NEEDED, W - 60, 70, 44, C.gold, 'right');
    for (var i = 0; i < MISS_LIMIT; i++) game.draw.sprite(CELL, { m: C.metal, c: i < MISS_LIMIT - misses ? C.teal : C.gray }, 70 + i * 60, 150, 10, { anchor: 'center' });
    var b = barNow(), inBar = clock >= 0 ? Math.floor(clock / SPB) % 4 : -1;
    var rest = clock >= 0 && BARS[b] === 'R';
    for (var k = 0; k < 4; k++) {
      var on = !rest && inBar === k;
      game.draw.circle(W / 2 - 120 + k * 80, 150, on ? 20 + beatPulse * 10 : 14, rest ? '#5a1e1e' : (on ? C.teal : C.gray));
    }
    if (combo >= 2) label('COMBO ' + combo, W - 60, 160, 34, C.teal, 'right');
    var prog = Math.max(0, Math.min(1, clock / (NB * SPB)));
    game.draw.rect(60, 198, W - 120, 10, C.gray);
    game.draw.rect(60, 198, (W - 120) * prog, 10, C.teal);
    for (var bb = 0; bb < BARS.length; bb++) if (BARS[bb] === 'R') game.draw.rect(60 + (W - 120) * bb / BARS.length, 198, (W - 120) / BARS.length, 10, C.red, 0.6);
  }

  function scanlines() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.06); }

  function drawScene() {
    drawWorld();
    drawFurrow();
    drawBot();
    drawPads();
    scanlines();
  }

  function drawResult(showTap) {
    var top = H * 0.26;
    box(70, top, W - 140, H * 0.37, won ? C.gold : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.305, 90, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.36, 56, C.cream);
    label(tilled + ' / ' + NEEDED, W / 2, H * 0.405, 50, C.teal);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + misses, W / 2, H * 0.45, 32, C.cream);
    label('COMBO ' + maxCombo, W / 2, H * 0.485, 34, C.teal);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.53, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.53, 42, C.cream);
    if (!won) label('あと' + Math.max(1, NEEDED - tilled) + '区画!', W / 2, H * 0.575, 48, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.612, 32, C.cream);
  }

  // ---- ATTRACT: 実ロジックで左右交互に拍の頭で打ち込み、畝が伸びる。拍の止む小節は手を止める(1周おきに押して過熱MISSを見せる) ----
  var demo = { t: 0, n: 0, next: 4, hx: PAD_X[0], hy: PAD_Y, press: 0, badDone: false };
  var DEMO_START = BAR - 0.3;
  var DEMO_CYC = BAR * 4 + 0.35 - DEMO_START;
  function demoReset() {
    initRun(true);
    clock = DEMO_START; prevClock = clock; cuedBar = 99;
    demo.n++; demo.next = 4; demo.press = 0; demo.badDone = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    tickFx(dt);
    var nw = nextWorkBeat();
    var restBar = BARS[barNow()] === 'R';
    var tx = nw >= 0 && !restBar ? PAD_X[nw % 2] : W / 2, ty = restBar ? PAD_Y - 220 : PAD_Y;
    // 失敗例: 偶数周は拍の止む小節の1拍目で押してしまう
    if (demo.n % 2 === 0 && restBar && !demo.badDone) { tx = PAD_X[0]; ty = PAD_Y; }
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 14);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 14);
    if (demo.n % 2 === 0 && restBar && !demo.badDone && clock >= 12 * SPB + 0.01) {
      demo.badDone = true; strike(0); demo.press = 0.12;
    } else if (nw >= 0 && nw === demo.next && clock >= nw * SPB + 0.012) {
      strike(nw % 2); demo.press = 0.12; demo.next = nw + 1;
      while (demo.next < NB && !isWork(demo.next)) demo.next++;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy + 20, { press: demo.press > 0, scale: 14 });
      box(20, 16, W - 40, 210, C.teal);
      label(GAME_TITLE, W / 2, 92, 82 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 180, 34, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.145, 48, C.cream);
      else label('TAP TO START', W / 2, H * 0.145, 44, C.teal);
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
      box(140, H * 0.4, W - 280, 150, C.gold);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.gold);
    }
    // 最初の小節だけ、光る台座を拍に合わせて交互に押す手を薄く見せる
    if (clock >= BAR - SPB && clock < BAR + SPB * 2 && !over) {
      var nw = nextWorkBeat();
      if (nw >= 0) game.draw.hand(PAD_X[nw % 2], PAD_Y + 20, { press: Math.abs(clock - nw * SPB) < 0.1, scale: 12, alpha: 0.45 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
