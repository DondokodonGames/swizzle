// K-DS-0051v2-island-beach-bell-drums.js
// 浜辺の宴の鈴と太鼓 — 左手で拍の頭ごとに鈴を振り続け、右手は裏拍に灯った側の太鼓だけを打って、南の島の浜辺の宴を踊らせ続ける
// 操作: 画面の左半分=鈴(押した瞬間に振る)、右半分の上=高い太鼓・下=低い太鼓(両手同時押し可)。鈴は拍の頭ごとに毎拍振る(左下の鈴の輪が閉じる瞬間)。太鼓は裏拍(拍と拍のまん中)に、上の灯籠が灯り点線の輪が閉じていく側だけを打つ(輪は0.8秒前から縮み始める)。上の譜面帯で次の小節までの鈴と太鼓の並びも見える。鈴の振り遅れ・振り忘れ・拍の裏での鈴、灯っていない側の太鼓、灯りがない時の太鼓、裏拍からずれた太鼓はMISS
// 終わり: 前奏1小節(鈴だけ)+7小節(112BPM・32拍・約17秒、鈴30回+太鼓20打)を通してMISS 5回以内ならCLEAR。MISS 6回で踊りの輪が止まってGAME OVER
// @mechanic: coop_2zone
// @theme: island_beach_party_bell_drums
// 世界観: 夕暮れの南の島の浜辺の宴で、打楽器奏者が左手の鈴の棒で拍の頭を刻み続けながら、右手で裏拍に灯る側の高い太鼓と低い太鼓を打ち分けて、浜で踊る人たちの輪を止めずに盛り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・鈴と太鼓それぞれの成功数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 90s BIG SPRITE

(function (game) {
  var STYLE = { bg: ['#ff9a5a', '#7a4a8a'], main: ['#f2d27a', '#3aa0c8', '#a0643a'], accent: ['#ffef8a', '#ff5a4a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大な奏者、床に楕円の影、背景は横1層の浜辺
  var C = {
    sky0: STYLE.bg[0], sky1: '#e86a7a', sky2: STYLE.bg[1], sea: '#4a6aa8', seaL: '#8ab0e0', sand: '#f0c890', sandD: '#d8a870',
    palm: '#3a2a3a', hat: STYLE.main[0], top: STYLE.main[1], wood: STYLE.main[2], woodD: '#6e4224', rope: '#f0e0b0',
    gold: '#ffd24a', lit: STYLE.accent[0], red: STYLE.accent[1], ink: '#2a1a24', white: '#ffffff', good: '#7ae07a', bad: '#ff5a6a'
  };

  var TITLE = 'BEACH BEAT';
  var BPM = 112;
  var SPB = 60 / BPM;              // 1拍 約0.536秒
  var BARS = 8;
  var TOTAL_BEATS = BARS * 4;
  var TIME_LIMIT = 17.2;           // 32拍 = 17.1秒。放置でも READY 0.8 + 17.2 + 余韻 1.7 = 19.7秒で終わる
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11, NEAR_W = 0.2;
  var MAX_MISS = 6;
  var HIT_STOP = 0.32;
  var BELL_FROM = 2;               // 鈴は1小節目の3拍目から(GO直後の2拍は罰なし)
  var SPLIT_Y = Math.round(H * 0.70);               // 右半分の上下の境(上=高い太鼓、下=低い太鼓)
  var DRUM = {
    H: { x: 800, y: Math.round(H * 0.58), rx: 118, ry: 38, body: 250, f: 392 },
    L: { x: 812, y: Math.round(H * 0.81), rx: 150, ry: 48, body: 200, f: 196 }
  };
  var BELL_X = 210, BELL_Y = Math.round(H * 0.88);  // 左下の鈴の輪
  var MAN_X = 360, MAN_Y = Math.round(H * 0.55);    // 奏者の中心
  var SHEET_Y = Math.round(H * 0.16);               // 譜面帯

  // 太鼓の並び: [小節, 拍(その拍の裏で打つ), 側]
  var DRUMS = [
    [1, 1, 'H'], [1, 3, 'H'],
    [2, 1, 'L'], [2, 3, 'L'],
    [3, 0, 'H'], [3, 2, 'L'],
    [4, 1, 'H'], [4, 2, 'L'], [4, 3, 'H'],
    [5, 0, 'L'], [5, 1, 'H'], [5, 3, 'L'],
    [6, 0, 'H'], [6, 1, 'L'], [6, 2, 'H'], [6, 3, 'L'],
    [7, 0, 'L'], [7, 1, 'L'], [7, 2, 'H'], [7, 3, 'H']
  ];
  var DEMO_DRUMS = [[0, 1, 'H'], [0, 3, 'L'], [1, 0, 'H'], [1, 2, 'L']];
  var DEMO_TRAP = 3;               // デモはこの太鼓で逆の側を打ってしまう
  var DEMO_LEN = 2 * 4 * SPB;

  // 伴奏(オリジナル): 三角波の明るい旋律 + 表拍のベース
  var MEL = [
    ['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'F5', 'E5'],
    ['D5', 'F5', 'A5', 'C6', 'A5', 'F5', 'G5', 'F5'],
    ['E5', 'G5', 'C6', 'D6', 'C6', 'A5', 'G5', 'E5'],
    ['F5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'G5']
  ];
  var BASS = [['C3', 'G2', 'C3', 'G2'], ['D3', 'A2', 'D3', 'A2'], ['C3', 'G2', 'E2', 'G2'], ['F2', 'C3', 'G2', 'G2']];

  // ---- スプライト ----
  var MAN = [
    '......HHHH......', '.....HHHHHH.....', '....HhhhhhhH....', 'HHHHHHHHHHHHHHHH', '....kssssssk....', '....sesssses....',
    '....ssssssss....', '....smwwwwms....', '.....ssmmss.....', '......SSSS......', '...tttttttttt...', '..tTTTTTTTTTTt..',
    '..tttttttttttt..', '..tTTTTTTTTTTt..', '..tttttttttttt..', '..pppppppppppp..', '..pppp....pppp..', '..ssss....ssss..',
    '..SSSS....SSSS..', '.bbbbb....bbbbb.'
  ];
  var MAN_OOPS = MAN.slice(0, 5).concat(['....seessees....', '....ssssssss....', '.....smmmms.....', '.....ssmmss.....']).concat(MAN.slice(9));
  var MAN_PAL = { H: C.hat, h: C.red, k: '#3a2418', s: '#c88a5a', S: '#a06a40', e: C.ink, m: '#7a2a20', w: C.white, t: C.top, T: C.white, p: '#f08a3a', b: '#6e4224' };
  var MAN_HIT = { H: C.white, h: C.white, k: C.white, s: C.white, S: C.white, e: C.red, m: C.red, w: C.white, t: C.white, T: C.white, p: C.white, b: C.white };
  var BELLS = ['.y.y.y.', 'yyyyyyy', '.y.y.y.', '...w...', '...w...', '...w...', '...w...'];
  var BELLS_PAL = { y: C.gold, w: C.woodD };
  var DANCER_A = ['.hh.', '.ff.', 'rbbr', '.bb.', '.ll.', 'l..l'];
  var DANCER_B = ['.hh.', 'rffr', '.bb.', '.bb.', 'l..l', 'l..l'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, bells, drums, running, songT, halfN, schedBar, readyT, beatPulse, endT;
  var bellArm, drumArm, drumSide, stopT, stopWhat, stumbleT, judgeW, judgeT, judgeX, judgeY;
  var score, perfects, goods, misses, bellOk, drumOk, combo, maxCombo, over, won, outroT, prevBest, milestone, comboMile;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var bars = demoMode ? 2 : BARS;
    bells = [];
    for (var k = demoMode ? 0 : BELL_FROM; k < bars * 4; k++) bells.push({ t: k * SPB, res: '' });
    var spec = demoMode ? DEMO_DRUMS : DRUMS;
    drums = [];
    for (var i = 0; i < spec.length; i++) drums.push({ t: (spec[i][0] * 4 + spec[i][1] + 0.5) * SPB, side: spec[i][2], res: '' });
    endT = bars * 4 * SPB;
    running = false; songT = 0; halfN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0;
    bellArm = 0; drumArm = 0; drumSide = 'H'; stopT = 0; stopWhat = ''; stumbleT = 0;
    judgeW = ''; judgeT = 0; judgeX = W / 2; judgeY = 600;
    score = 0; perfects = 0; goods = 0; misses = 0; bellOk = 0; drumOk = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; comboMile = 0;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function playBar(b) {
    if (demoMode || over || b >= BARS) return;
    var m = MEL[b % 4], bs = BASS[b % 4], mel = [], bass = [];
    if (b === 0) { for (var r = 0; r < 4; r++) { mel.push(['R', 0.5]); mel.push([r % 2 ? 'G5' : 'E5', 0.5]); } }
    else for (var i = 0; i < 8; i++) mel.push([m[i], 0.5]);
    for (var j = 0; j < 4; j++) bass.push([bs[j], 1]);
    game.audio.melody(mel, { tempo: BPM, wave: 'triangle', volume: 0.08, bass: bass, bassWave: 'triangle', bassVolume: 0.14 });
  }

  // ---- 拍クロック(1本だけ。8分で数える: 偶数=拍の頭、奇数=裏拍)。ヒットストップ中も止めない ----
  function onHalf(h) {
    if (h % 2 === 0) beatPulse = 1;
  }
  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < BARS && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (halfN + 1) * SPB / 2) { halfN++; onHalf(halfN); }
  }

  function say(word, x, y) {
    judgeW = word; judgeT = 0.42; judgeX = x; judgeY = y;
  }

  function addHit(perfect, isDrum, x, y) {
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    var base = perfect ? 100 + combo * 5 : 50 + combo * 3;
    score += Math.round(base * (isDrum ? 1.5 : 1));
    say(perfect ? 'PERFECT' : 'GOOD', x, y - 120);
    game.fx.burst(x, y, { color: isDrum ? C.lit : C.gold, count: perfect ? 10 : 6, speed: 260 });
    if (!demoMode && combo >= 16 && comboMile < 16) {
      comboMile = 16;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('16 COMBO', W / 2, H * 0.3, { color: C.lit, size: 80 });
    }
    if (!milestone && bellOk + drumOk >= Math.ceil((bells.length + drums.length) / 2)) {
      milestone = true;
      if (!demoMode) game.audio.play('se_milestone', 0.35);
      game.fx.popup((bellOk + drumOk) + ' / ' + (bells.length + drums.length), W / 2, H * 0.24, { color: C.gold, size: 64 });
    }
  }

  function addMiss(what, x, y) {
    misses++; combo = 0;
    stopT = HIT_STOP; stopWhat = what; stumbleT = 0.6;
    say('MISS', x, y - 120);
    sfx(150, 0.16, { wave: 'sawtooth', volume: 0.07, slide: -60 });
  }

  // ---- 左手: 鈴(拍の頭) ----
  function shakeBell() {
    if (!running || over) return 'none';
    bellArm = 0.16;
    sfx(2093, 0.05, { wave: 'triangle', volume: 0.07 });
    sfx(2637, 0.07, { wave: 'triangle', volume: 0.05 });
    var k = Math.round(songT / SPB);
    var off = songT - k * SPB;
    var n = null;
    for (var i = 0; i < bells.length; i++) if (Math.abs(bells[i].t - k * SPB) < 0.01) { n = bells[i]; break; }
    if (!n && k * SPB < (bells.length ? bells[0].t : 0)) return 'free';
    if (n && !n.res && Math.abs(off) <= GOOD_W) {
      n.res = 'ok'; bellOk++;
      addHit(Math.abs(off) <= PERFECT_W, false, BELL_X, BELL_Y);
      if (!demoMode) game.feedback.good(BELL_X, BELL_Y - 200, { text: null, color: C.gold, count: 4, volume: 0.12 });
      return 'ok';
    }
    if (n && !n.res && Math.abs(off) <= NEAR_W) n.res = 'miss';
    addMiss('bell', BELL_X, BELL_Y);
    return 'miss';
  }

  // ---- 右手: 灯った側の太鼓(裏拍) ----
  function hitDrum(side) {
    if (!running || over) return 'none';
    drumArm = 0.16; drumSide = side;
    var d = DRUM[side];
    sfx(d.f, 0.14, { wave: 'sine', volume: 0.16, slide: -d.f * 0.3 });
    var n = null, bd = 99;
    for (var i = 0; i < drums.length; i++) {
      if (drums[i].res) continue;
      var dd = Math.abs(songT - drums[i].t);
      if (dd < bd) { bd = dd; n = drums[i]; }
    }
    if (n && bd <= GOOD_W && n.side === side) {
      n.res = 'ok'; drumOk++;
      addHit(bd <= PERFECT_W, true, d.x, d.y);
      if (!demoMode) game.feedback.good(d.x, d.y - 160, { text: null, color: C.lit, count: 5, volume: 0.12 });
      return 'ok';
    }
    if (n && bd <= NEAR_W) n.res = 'miss';
    addMiss(side, d.x, d.y);
    return 'miss';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (ok) {
      score += 300 + (MAX_MISS - misses) * 80;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 900), { color: i % 2 ? C.lit : C.red, count: 16, speed: 380 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judgeT > 0) judgeT -= dt;
    if (bellArm > 0) bellArm -= dt;
    if (drumArm > 0) drumArm -= dt;
    if (stumbleT > 0) stumbleT -= dt;
    if (!running) return;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        stopT = 0;
        var px = stopWhat === 'bell' ? BELL_X : DRUM[stopWhat].x, py = stopWhat === 'bell' ? BELL_Y : DRUM[stopWhat].y;
        if (!demoMode) game.feedback.bad(px, py - 60, { text: null, shake: 8 });
        else game.fx.shake(5, 0.15);
        if (!demoMode && misses >= MAX_MISS) finish(false);
      }
    }
    if (over) return;
    // 振り忘れ・打ち忘れ
    for (var i = 0; i < bells.length; i++) {
      if (!bells[i].res && songT > bells[i].t + GOOD_W) { bells[i].res = 'miss'; addMiss('bell', BELL_X, BELL_Y); }
    }
    for (var j = 0; j < drums.length; j++) {
      if (!drums[j].res && songT > drums[j].t + GOOD_W) { drums[j].res = 'miss'; addMiss(drums[j].side, DRUM[drums[j].side].x, DRUM[drums[j].side].y); }
    }
    if (!demoMode && songT >= endT + 0.15) finish(misses < MAX_MISS);
    if (!demoMode && songT > TIME_LIMIT + 0.6) finish(false);
  }

  // ---- 描画 ----
  function txt(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    for (var dy = -ry; dy < ry; dy += 4) {
      var k = 1 - ((dy + 2) / ry) * ((dy + 2) / ry);
      if (k <= 0) continue;
      var hw = rx * Math.sqrt(k);
      game.draw.rect(cx - hw, cy + dy, hw * 2, 4, col, a);
    }
  }
  function dotRing(cx, cy, rx, ry, col, n, sz) {
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      game.draw.circle(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, sz, col);
    }
  }

  function drawBeach() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.22, C.sky1], [0.38, C.sky2], [0.39, C.sea], [0.46, C.sea], [0.47, C.sand], [1, C.sandD]]);
    game.draw.circle(540, H * 0.385, 150, C.lit, 0.55);
    for (var g = 0; g < 6; g++) game.draw.rect(300 + ((g * 97 + t * 40) % 480), H * 0.4 + g * 18, 120 - g * 12, 6, C.seaL, 0.6);
    // ヤシの木(左右)
    var palms = [[70, 880], [1010, 820]];
    for (var p = 0; p < 2; p++) {
      var px = palms[p][0], py = palms[p][1];
      for (var s = 0; s < 8; s++) game.draw.rect(px - 18 + s * (p ? -4 : 4), py - s * 70, 36, 74, C.palm);
      for (var l = 0; l < 5; l++) {
        var a = (l / 5) * Math.PI + Math.sin(t * 1.5 + l) * 0.08;
        var tx = px + (p ? -28 : 28), ty = py - 560;
        for (var q = 1; q <= 6; q++) game.draw.circle(tx + Math.cos(a) * q * 34, ty - Math.sin(a) * q * 20 + q * q * 3, 22 - q * 2, C.palm);
      }
    }
    // 灯りの綱(拍の頭で光る)
    for (var i = 0; i < 11; i++) {
      var lx = 40 + i * 100, ly = 430 + Math.sin(i / 10 * Math.PI) * 70;
      game.draw.line(lx, ly, lx + 100, 430 + Math.sin((i + 1) / 10 * Math.PI) * 70, C.ink, 3);
      var on = (i + Math.max(0, Math.floor(songT / SPB))) % 3 === 0;
      game.draw.circle(lx, ly + 18, 14 + (on ? beatPulse * 6 : 0), on ? C.lit : C.red, on ? 1 : 0.7);
    }
    // 踊る人たち(拍の頭で弾む。MISSでつまずく。連続が伸びると輪に加わる)
    var n = 3 + Math.min(4, Math.floor(combo / 6));
    for (var d = 0; d < n; d++) {
      var dx = 680 + (d - (n - 1) / 2) * 86, dy = H * 0.485 - (stumbleT > 0 ? 0 : beatPulse * 18);
      var art = stumbleT > 0 ? DANCER_B : (Math.floor(Math.max(0, songT) / SPB) + d) % 2 ? DANCER_A : DANCER_B;
      game.draw.sprite(art, { h: C.ink, f: '#c88a5a', r: '#c88a5a', b: [C.red, C.top, C.hat, '#f08a3a'][d % 4], l: C.ink }, dx, dy, 9, { anchor: 'center', flipX: stumbleT > 0 && d % 2 === 0 });
    }
  }

  function drawDrum(side) {
    var d = DRUM[side];
    var t = game.time.elapsed;
    var next = null;
    for (var i = 0; i < drums.length; i++) if (!drums[i].res && drums[i].side === side && drums[i].t - songT < 1.5 * SPB && drums[i].t - songT > -GOOD_W) { next = drums[i]; break; }
    var hit = stopT > 0 && stopWhat === side;
    var struck = drumArm > 0 && drumSide === side;
    // 灯籠(灯る側)
    var lx = d.x + d.rx + 30, ly = d.y - 130;
    game.draw.line(lx, ly - 60, lx, d.y + 20, C.woodD, 6);
    game.draw.circle(lx, ly, 34, next ? C.lit : '#7a5a4a');
    if (next) game.draw.circle(lx, ly, 60 + Math.sin(t * 12) * 6, C.lit, 0.3);
    ellipse(d.x, d.y + d.body + 10, d.rx * 1.2, 26, C.ink, 0.25);
    game.draw.rect(d.x - d.rx * 0.86, d.y, d.rx * 1.72, d.body, hit ? C.white : C.wood);
    game.draw.rect(d.x - d.rx * 0.86, d.y, 26, d.body, C.woodD);
    for (var z = 0; z < 6; z++) {
      var zx = d.x - d.rx * 0.8 + z * d.rx * 0.32;
      game.draw.line(zx, d.y + 20, zx + d.rx * 0.16, d.y + d.body - 20, C.rope, 6);
      game.draw.line(zx + d.rx * 0.16, d.y + d.body - 20, zx + d.rx * 0.32, d.y + 20, C.rope, 6);
    }
    var sc = hit ? 1.15 : 1;
    ellipse(d.x, d.y, d.rx * sc + 10, d.ry * sc + 8, C.woodD);
    var headCol = hit ? C.white : struck ? C.lit : next && Math.floor(t * 10) % 2 === 0 && next.t - songT < 0.7 ? '#fff6c8' : C.rope;
    ellipse(d.x, d.y, d.rx * sc, d.ry * sc, headCol);
    // 迫る点線の輪(裏拍で太鼓の縁に重なる)
    if (next) {
      var k = Math.max(0, (next.t - songT) / (1.5 * SPB));
      dotRing(d.x, d.y, d.rx * (1 + k * 1.6), d.ry * (1 + k * 1.6), C.lit, 18, 9);
    }
  }

  function drawBellPad() {
    var t = game.time.elapsed;
    var hit = stopT > 0 && stopWhat === 'bell';
    game.draw.circle(BELL_X, BELL_Y, 150, C.ink, 0.25);
    game.draw.circle(BELL_X, BELL_Y, 136, hit ? C.white : bellArm > 0 ? C.lit : '#f6dca0');
    game.draw.circle(BELL_X, BELL_Y, 136 - 14, hit ? C.white : '#ffe8b8');
    game.draw.sprite(BELLS, BELLS_PAL, BELL_X, BELL_Y + (bellArm > 0 ? 10 : 0), 18, { anchor: 'center' });
    // 拍の頭で閉じる輪
    if (running) {
      var u = ((songT / SPB) % 1 + 1) % 1;
      var r = 136 + (1 - u) * 110;
      dotRing(BELL_X, BELL_Y, r, r, C.gold, 20, 8);
    }
  }

  function drawMan() {
    var t = game.time.elapsed;
    var hit = stopT > 0;
    var px = 22;
    var bob = hit ? 0 : beatPulse * 10;
    var cy = MAN_Y - bob;
    ellipse(MAN_X, MAN_Y + 250, 240, 40, C.ink, 0.3);
    // 木箱の腰掛け
    game.draw.rect(MAN_X - 150, MAN_Y + 150, 300, 110, C.woodD);
    game.draw.rect(MAN_X - 140, MAN_Y + 160, 280, 20, C.wood);
    var art = stumbleT > 0 ? MAN_OOPS : MAN;
    var sc = hit ? px * 1.08 : px;
    game.draw.sprite(art, hit ? MAN_HIT : MAN_PAL, MAN_X, cy, sc, { anchor: 'center' });
    // 左腕 → 鈴の棒
    var shL = { x: MAN_X - 5 * px, y: cy - 3 * px };
    var hL = { x: BELL_X + 20, y: MAN_Y + (bellArm > 0 ? 40 : -30) - bob };
    game.draw.line(shL.x, shL.y, hL.x, hL.y, '#a06a40', 30);
    game.draw.circle(hL.x, hL.y, 22, '#c88a5a');
    game.draw.sprite(BELLS, BELLS_PAL, hL.x, hL.y - 60, 12, { anchor: 'center' });
    // 右腕 → 太鼓
    var shR = { x: MAN_X + 5 * px, y: cy - 3 * px };
    var target = drumArm > 0 ? DRUM[drumSide] : null;
    var hR = target ? { x: target.x - 40, y: target.y - 20 } : { x: MAN_X + 230, y: MAN_Y + 40 + Math.sin(t * 6) * 10 };
    game.draw.line(shR.x, shR.y, hR.x, hR.y, '#a06a40', 30);
    game.draw.circle(hR.x, hR.y, 24, '#c88a5a');
  }

  function drawSheet() {
    var x0 = 60, x1 = W - 60, y = SHEET_Y;
    game.draw.rect(x0 - 20, y - 70, x1 - x0 + 40, 150, C.ink, 0.75);
    var slot = 56, headX = 200;
    var hNow = songT / (SPB / 2);
    // 拍の線
    for (var h = Math.floor(hNow) - 3; h < Math.floor(hNow) + 18; h++) {
      var x = headX + (h - hNow) * slot;
      if (x < x0 || x > x1) continue;
      if (h % 2 === 0) game.draw.rect(x - 2, y - 56, 4, 122, (h / 2) % 4 === 0 ? C.lit : '#8a7a90');
    }
    for (var i = 0; i < bells.length; i++) {
      var bx = headX + (bells[i].t / (SPB / 2) - hNow) * slot;
      if (bx < x0 || bx > x1) continue;
      game.draw.circle(bx, y - 30, 14, bells[i].res === 'ok' ? C.good : bells[i].res === 'miss' ? C.bad : C.gold);
    }
    for (var j = 0; j < drums.length; j++) {
      var dx = headX + (drums[j].t / (SPB / 2) - hNow) * slot;
      if (dx < x0 || dx > x1) continue;
      var col = drums[j].res === 'ok' ? C.good : drums[j].res === 'miss' ? C.bad : drums[j].side === 'H' ? C.lit : C.wood;
      game.draw.rect(dx - 16, drums[j].side === 'H' ? y + 2 : y + 36, 32, 26, col);
    }
    game.draw.rect(headX - 4, y - 66, 8, 142, C.white, 0.9);
  }

  function drawHud(showPlay) {
    game.draw.gradient(0, 230, [[0, '#3a1a3a'], [1, '#5a2a4a']]);
    game.draw.rect(0, 224, W, 6, C.gold);
    if (!showPlay) return;
    txt('SCORE ' + score, 40, 70, 50, C.white, 'left');
    txt('BEST ' + prevBest, 40, 135, 32, C.hat, 'left');
    txt((bellOk + drumOk) + ' / ' + (bells.length + drums.length), W - 40, 70, 46, C.lit, 'right');
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 60 - m * 50, 145, 16, m < MAX_MISS - misses ? C.red : '#6a4a5a');
    if (combo >= 3) txt(combo + ' COMBO', W / 2, 190, 34, C.lit);
  }

  function drawScene() {
    drawBeach();
    drawSheet();
    drawDrum('H');
    drawDrum('L');
    drawMan();
    drawBellPad();
    if (judgeT > 0) txt(judgeW, judgeX, judgeY, 60, judgeW === 'MISS' ? C.bad : C.lit);
  }

  // ---- ATTRACT: 左のゴーストが毎拍鈴を振り、右のゴーストが裏拍に灯る太鼓を打つ。1回だけ逆の太鼓を打つ ----
  var demo = { t: 0, lx: BELL_X, ly: BELL_Y, rx: DRUM.H.x, ry: DRUM.H.y, lp: 0, rp: 0, bi: 0, di: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.bi = 0; demo.di = 0; demo.lp = 0; demo.rp = 0; }
    var b = bells[demo.bi];
    if (b && songT >= b.t && !b.res) { shakeBell(); demo.lp = 0.15; demo.bi++; }
    else if (b && b.res) demo.bi++;
    var d = drums[demo.di];
    if (d) {
      var side = demo.di === DEMO_TRAP ? (d.side === 'H' ? 'L' : 'H') : d.side;
      demo.rx += (DRUM[side].x + 40 - demo.rx) * Math.min(1, dt * 9);
      demo.ry += (DRUM[side].y + 20 - demo.ry) * Math.min(1, dt * 9);
      if (songT >= d.t && !d.res) { hitDrum(side); demo.rp = 0.15; demo.di++; }
      else if (d.res) demo.di++;
    }
    if (demo.lp > 0) demo.lp -= dt;
    if (demo.rp > 0) demo.rp -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var r = x < W / 2 ? shakeBell() : hitDrum(y < SPLIT_Y ? 'H' : 'L');
    if (r === 'free') game.fx.burst(x, y, { color: C.gold, count: 4, speed: 100 });
    else if (r === 'none') game.audio.tone(140, 0.04, { wave: 'square', volume: 0.03 });
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
      game.draw.hand(BELL_X + 30, BELL_Y + 20 + (demo.lp > 0 ? 0 : -24), { press: demo.lp > 0, scale: 14 });
      game.draw.hand(demo.rx, demo.ry + (demo.rp > 0 ? 0 : -24), { press: demo.rp > 0, scale: 14 });
      txt(TITLE, W / 2, 90 + Math.sin(t * 3) * 4, 96, C.lit);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 180, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.lit);
      else txt('TAP TO START', W / 2, H * 0.975, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud(false);
      game.draw.rect(80, H * 0.2, W - 160, H * 0.46, C.ink, 0.9);
      game.draw.rect(96, H * 0.2 + 16, W - 192, H * 0.46 - 32, '#4a2a4a', 0.95);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 104, won ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.33, 62, C.white);
      txt((bellOk + drumOk) + ' / ' + (bells.length + drums.length), W / 2, H * 0.385, 54, C.lit);
      txt(bellOk + ' / ' + bells.length + '   ' + drumOk + ' / ' + drums.length, W / 2, H * 0.43, 38, C.hat);
      txt('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.47, 34, C.white);
      txt(maxCombo + ' COMBO', W / 2, H * 0.51, 38, C.lit);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.56, 56, C.gold);
      else txt('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.56, 42, C.hat);
      if (!won) txt('あと' + Math.max(1, Math.ceil((endT - Math.max(0, songT)) / SPB)) + '拍', W / 2, H * 0.61, 50, C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, bells: bellOk, bellTotal: bells.length, drums: drumOk, drumTotal: drums.length, perfect: perfects, good: goods, misses: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      tickWorld(dt);
      if (readyT <= 0) { running = true; songT = -0.1; halfN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud(true);
    if (readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, C.lit);
    if (over) txt(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.36, 110, won ? C.good : C.bad);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
