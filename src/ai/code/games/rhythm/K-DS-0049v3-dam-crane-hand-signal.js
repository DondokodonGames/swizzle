// K-DS-0049v3-dam-crane-hand-signal.js
// ダム現場の合図返し — 教官が拍の頭ごとに上げる左右の腕の合図を見て、次の拍の頭で左手と右手の操作レバーの同じ側(両腕なら両手同時)を引き返す
// 操作: 画面の左半分=左レバー(橙)、右半分=右レバー(水色)。押した瞬間で判定、両手同時押し可。教官は拍の半拍前から腕を上げ、拍の頭で画面の左の腕(橙の旗)・右の腕(水色の旗)・両腕のどれかを掲げて笛を吹く。その次の拍の頭で同じ側のレバーを引く(両腕なら両方とも拍の頭に)。拍の頭からのずれでPERFECT/GOOD。違う側・片手だけ・拍外れ・引き漏らしはMISS(教官の正しい腕が白く光る)。合図の無い拍の空引きは連続が切れるだけ。中央の計器の輪が縮みきる時が返す拍。前半4小節は「合図の拍→返す拍」が交互、サイレンと堤の警告灯の点滅で予告したあと後半3小節は毎拍合図が出るので、一つ前の合図(薄く残る腕の残像)を返しながら次の合図を見る
// 終わり: 前奏1小節+7小節(116BPM・32拍・約16.6秒・19回)を返し切ってMISS 3回以内ならCLEAR(判定点+連続ボーナス+両手合図で打ったブロック数)。MISS 4回で教官が腕を組んで作業中止のGAME OVER
// @mechanic: coop_2zone
// @theme: dam_crane_hand_signal
// 世界観: 山あいのダム工事現場で、クレーン操縦台に座った見習いが堤の上の教官の両腕の合図を拍ごとに見て、左右のレバーを同じ手で返し、バケットを運んで堤のブロックを積んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・返した合図の数・積んだブロック数・最大コンボ
// スタイル: VOXEL BLOCK
var STYLE = { bg: ['#8cc8ff', '#e6f2ff'], main: ['#d8d8d0', '#ffd84a', '#ff9a3c'], accent: ['#5ce0ff', '#ff5050'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で描き、等角に積む。影は落とさず明度差だけで立体を出す
  var SKY = STYLE.bg[0], SKY2 = STYLE.bg[1];
  var CON = STYLE.main[0], YEL = STYLE.main[1], ORG = STYLE.main[2];
  var CYN = STYLE.accent[0], RED = STYLE.accent[1];
  var INK = '#1c2433', WHT = '#ffffff';

  var GAME_TITLE = 'CRANE SIGNAL';
  var BPM = 116;
  var SPB = 60 / BPM;            // 1拍 約0.517秒
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11, OFF_W = 0.2;
  var READY_T = 0.8;
  var TIME_LIMIT = 17;           // 前奏1小節+7小節 = 32拍 × 0.517秒 = 16.6秒
  var MISS_MAX = 4;
  var ECHO_BEAT = 20;            // ここから毎拍の合図(1拍遅れで返す)
  var CX = 540, CY = 520;        // 教官の位置

  // 合図 [通しの拍, 手: 1=左 2=右 3=両手]。返すのは次の拍の頭
  var SIG = [
    [4, 1], [6, 2], [8, 2], [10, 1],
    [12, 3], [14, 1], [16, 2], [18, 3],
    [20, 1], [21, 2], [22, 3], [23, 1], [24, 2], [25, 2], [26, 3], [27, 1], [28, 3], [29, 2], [30, 1]
  ];
  var BARS = 8;
  var DEMO_SIG = [[4, 1], [6, 2], [8, 3], [9, 1], [10, 2], [11, 1]];
  var DEMO_BARS = 4;
  var DEMO_ECHO = 8;
  var DEMO_FAIL = 4;             // デモは5回目で左右を取り違えてMISS

  // ---- 立方体(上面t/左面l/右面r) ----
  var CUBE = [
    '....tt....',
    '..tttttt..',
    'tttttttttt',
    'llttttttrr',
    'llllttrrrr',
    'lllllrrrrr',
    'lllllrrrrr',
    'lllllrrrrr',
    '.llllrrrr.',
    '...llrr...'
  ];
  function pal3(t, l, r) { return { t: t, l: l, r: r }; }
  var P_CON = pal3('#e4e4dc', '#a8a8a0', '#76766e');
  var P_WATER = pal3('#7ad0ff', '#3a94d8', '#2264a8');
  var P_YEL = pal3('#ffe27a', '#d8a428', '#a07414');
  var P_ORG = pal3('#ffb86a', '#e0782a', '#a8501a');
  var P_CYN = pal3('#9af0ff', '#3cc0e0', '#1c88a8');
  var P_RED = pal3('#ff8a8a', '#d84040', '#982828');
  var P_WHT = pal3('#ffffff', '#e8e8e8', '#d0d0d0');
  var P_ROCK = pal3('#9a8c78', '#6e6250', '#4c4234');
  var P_DARK = pal3('#5a6478', '#3a4256', '#262c3c');

  var BOSS = [
    '..yyyyyy..',
    '.yyyyyyyy.',
    'yyyyyyyyyy',
    '..ssssss..',
    '..skssks..',
    '..ssssss..',
    '..sswwss..',
    '.oooooooo.',
    'oowwoowwoo',
    'oooooooooo',
    'oowwoowwoo',
    '.oooooooo.',
    '.bbb..bbb.',
    '.bbb..bbb.',
    'kkkk..kkkk'
  ];
  var BOSS_BLOW = [
    '..yyyyyy..',
    '.yyyyyyyy.',
    'yyyyyyyyyy',
    '..ssssss..',
    '..skssks..',
    '..ssssss..',
    '..ssmmss..',
    '.oooooooo.',
    'oowwoowwoo',
    'oooooooooo',
    'oowwoowwoo',
    '.oooooooo.',
    '.bbb..bbb.',
    '.bbb..bbb.',
    'kkkk..kkkk'
  ];
  var BOSS_PAL = { y: YEL, s: '#ffd2a8', k: INK, w: WHT, o: ORG, b: '#3a4a78', m: RED };
  var HAND = ['.ssss.', 'ssssss', 'ssssss', 'ssssss', '.ssss.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, sigs, beats, endT, echoB, running, songT, schedB, beatN, readyT, realT, hitStop;
  var score, combo, maxCombo, perfects, goods, misses, answered, blocks, heights, trolley, drop;
  var leverT, leverCol, missFx, over, won, outroT, prevBest, beatPulse, ms;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function buildSong() {
    var src = demoMode ? DEMO_SIG : SIG;
    var nb = demoMode ? DEMO_BARS : BARS;
    echoB = demoMode ? DEMO_ECHO : ECHO_BEAT;
    sigs = [];
    for (var i = 0; i < src.length; i++) {
      sigs.push({ b: src[i][0], hand: src[i][1], ts: src[i][0] * SPB, t: (src[i][0] + 1) * SPB, res: '', got: [0, 0, 0], idx: i });
    }
    beats = [];
    for (var b = 0; b < nb * 4; b++) beats.push(b * SPB);
    endT = nb * 4 * SPB;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    buildSong();
    running = demoMode; songT = 0; schedB = 0; beatN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; answered = 0; blocks = 0;
    heights = [2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 2, 3];
    trolley = 6; drop = null;
    leverT = [0, 0, 0]; leverCol = [YEL, YEL, YEL]; missFx = null;
    over = false; won = false; outroT = 0; prevBest = game.best; beatPulse = 0; ms = false;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル・Dメジャーの現場の行進)。表拍のベースとスネア、後半は刻みが倍になる ----
  var MEL = ['D5', 'F#5', 'A5', 'F#5', 'G5', 'E5', 'C#5', 'E5', 'D5', 'A4', 'B4', 'C#5', 'D5', 'F#5', 'E5', 'D5'];
  var BAS = ['D3', 'A2', 'D3', 'A2', 'G2', 'D3', 'A2', 'E3'];
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4), intro = bar === 0, echo = b >= echoB;
    game.audio.melody([[intro ? 'R' : MEL[b % MEL.length], 0.5], ['R', 0.5]], { tempo: BPM, wave: 'square', volume: 0.026, bass: [[BAS[Math.floor(b / 2) % BAS.length], 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: b % 4 === 0 ? 0.16 : 0.12 });
    game.audio.melody(echo ? [[180, 0.1], ['R', 0.4], [180, 0.1], ['R', 0.4]] : [[b % 2 ? 200 : 120, 0.12], ['R', 0.88]], { tempo: BPM, wave: 'sawtooth', volume: 0.03 });
    if (intro) game.audio.tone(b % 4 === 0 ? 1175 : 880, 0.05, { wave: 'triangle', volume: 0.08 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < beats.length && songT >= beats[schedB] - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < beats.length && songT >= beats[beatN + 1]) { beatN++; onBeat(beatN); }
    for (var i = 0; i < sigs.length; i++) {
      var s = sigs[i];
      if (!s.res && songT > s.t + GOOD_W + 0.02) { missSig(s, 0); if (over || hitStop > 0) return; }
    }
    if (drop) { drop.t += dt; if (drop.t > 0.35) { heights[drop.col] = Math.min(7, heights[drop.col] + 1); drop = null; } }
    if (songT >= endT + 0.1) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function onBeat(b) {
    beatPulse = 1;
    for (var i = 0; i < sigs.length; i++) {
      if (sigs[i].b === b) {
        var h = sigs[i].hand;
        if (h & 1) sfx(1568, 0.12, { wave: 'square', volume: 0.05 });
        if (h & 2) sfx(2093, 0.12, { wave: 'square', volume: 0.05 });
      }
    }
    if (b === echoB - 2 || b === echoB - 1) {
      sfx(660, 0.22, { wave: 'sawtooth', volume: 0.04, slide: 220 });
      sfx(880, 0.22, { wave: 'square', volume: 0.025, slide: -220 });
    }
    if (b === echoB && !demoMode) { game.audio.play('se_powerup', 0.35); game.fx.flash(YEL, 0.12); }
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function pull(side) {
    if (!running || hitStop > 0 || over) return;
    leverT[side] = 0.16; leverCol[side] = YEL;
    var best = null, bd = 99;
    for (var i = 0; i < sigs.length; i++) {
      var s = sigs[i];
      if (s.res) continue;
      var d = Math.abs(songT - s.t);
      if (d <= OFF_W && d < bd) { bd = d; best = s; }
    }
    if (!best) { whiff(); return; }
    var dd = songT - best.t;
    if (Math.abs(dd) > GOOD_W) { missSig(best, side); return; }
    if (!(best.hand & side)) { missSig(best, side); return; }
    if (best.got[side]) { sfx(500, 0.02, { wave: 'square', volume: 0.02 }); return; }
    best.got[side] = Math.abs(dd) + 0.0001;
    if ((best.hand & 1) && !best.got[1]) { sfx(740, 0.03, { wave: 'square', volume: 0.04 }); return; }
    if ((best.hand & 2) && !best.got[2]) { sfx(740, 0.03, { wave: 'square', volume: 0.04 }); return; }
    resolve(best);
  }

  function resolve(s) {
    var worst = Math.max(s.got[1], s.got[2]);
    var w = worst <= PERFECT_W ? 'PERFECT' : 'GOOD';
    s.res = w;
    answered++;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 60) + Math.min(combo, 10) * 10;
    if (s.hand & 1) leverCol[1] = w === 'PERFECT' ? YEL : CYN;
    if (s.hand & 2) leverCol[2] = w === 'PERFECT' ? YEL : CYN;
    var px = s.hand === 1 ? 270 : (s.hand === 2 ? 810 : 540);
    if (demoMode) game.fx.popup(w, px, 1330, { color: w === 'PERFECT' ? YEL : CYN, size: 46 });
    else game.feedback.good(px, 1330, { text: w, color: w === 'PERFECT' ? YEL : CYN, size: w === 'PERFECT' ? 54 : 44, count: 10, volume: 0.1 });
    sfx(s.hand === 2 ? 988 : 784, 0.06, { wave: 'triangle', volume: 0.08 });
    // クレーンが動く: 左=トロリーを左へ / 右=右へ / 両手=バケットを下ろしてブロックを打つ
    if (s.hand === 1) trolley = Math.max(0, trolley - 1);
    else if (s.hand === 2) trolley = Math.min(heights.length - 1, trolley + 1);
    else {
      blocks++; score += 50;
      drop = { col: trolley, t: 0 };
      sfx(220, 0.12, { wave: 'triangle', volume: 0.1, slide: -80 });
    }
    if (!demoMode && answered === 10 && !ms) {
      ms = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE 10', W / 2, 860, { color: YEL, size: 90 });
      for (var k = 0; k < 4; k++) game.fx.burst(200 + k * 230, 900, { color: k % 2 ? ORG : CYN, count: 12, speed: 320 });
    }
  }

  function whiff() {
    if (combo > 0 && !demoMode) game.feedback.bad(CX, 1700, { text: null, shake: 2, volume: 0.12, flashColor: SKY });
    else sfx(260, 0.04, { wave: 'square', volume: 0.03 });
    combo = 0;
  }

  function missSig(s, side) {
    s.res = 'miss';
    misses++; combo = 0;
    hitStop = 0.42;
    missFx = { hand: s.hand, t: 0.42 };
    if (side) leverCol[side] = RED;
    sfx(140, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', CX, CY - 260, { color: RED, size: 56 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(CX, CY - 260, { text: 'MISS', shake: 10, flashColor: WHT });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 120;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 7; i++) game.fx.burst(120 + i * 140, 760 + (i % 3) * 140, { color: [YEL, ORG, CYN, WHT][i % 4], count: 16, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (missFx) missFx.t = hitStop;
      if (hitStop <= 0) { missFx = null; if (!demoMode) game.audio.play('se_tap', 0.2); }
      return;
    }
    stepPlay(dt);
  }

  // ---- 入力: 左半分=左レバー、右半分=右レバー(両手同時可) ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var side = x < W / 2 ? 1 : 2;
    game.audio.tone(side === 1 ? 392 : 523, 0.03, { wave: 'square', volume: 0.03 });
    pull(side);
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
  function cube(x, y, s, pal, alpha) {
    game.draw.sprite(CUBE, pal, x, y, s, { anchor: 'center', alpha: alpha === undefined ? 1 : alpha });
  }

  // 教官の腕の上がり具合(0=下ろす 1=掲げる)と、毎拍の時は一つ前の合図の残像
  function poseAt() {
    var cur = null, prev = null;
    for (var i = 0; i < sigs.length; i++) {
      if (songT >= (sigs[i].b - 0.5) * SPB) { prev = cur; cur = sigs[i]; }
    }
    var out = { hand: 0, amt: 0, ghost: 0, ghostAmt: 0 };
    if (!cur) return out;
    var rise = clamp((songT - (cur.b - 0.5) * SPB) / (0.5 * SPB), 0, 1);
    var lower = clamp((songT - (cur.b + 1.3) * SPB) / (0.4 * SPB), 0, 1);
    out.hand = cur.hand; out.amt = rise * (1 - lower);
    if (prev && prev.b === cur.b - 1 && songT < (prev.b + 1.45) * SPB) { out.ghost = prev.hand; out.ghostAmt = 1; }
    return out;
  }

  function armEnd(side, amt) {
    var dir = side === 1 ? -1 : 1;
    var dx = 70 + 170 * amt, dy = 110 - 300 * amt;
    return { x: CX + dir * dx, y: CY + dy };
  }
  function drawArm(side, amt, alpha, flash) {
    var dir = side === 1 ? -1 : 1;
    var sx = CX + dir * 62, sy = CY - 20;
    var e = armEnd(side, amt);
    var pal = flash ? P_WHT : (side === 1 ? P_ORG : P_CYN);
    for (var k = 0; k <= 4; k++) {
      var f = k / 4;
      cube(sx + (e.x - sx) * f, sy + (e.y - sy) * f, flash ? 5 : 4, k === 4 ? pal : P_YEL, alpha);
    }
    // 旗(上がっている時だけ大きく開く)
    var fw = (flash ? 136 : 104) * Math.max(0.25, amt);
    var col = flash ? WHT : (side === 1 ? ORG : CYN);
    game.draw.rect(dir < 0 ? e.x - fw : e.x, e.y - 84, fw, 68, col, alpha);
    game.draw.rect(dir < 0 ? e.x - fw : e.x, e.y - 84, fw, 12, WHT, alpha * 0.6);
  }

  function drawSite() {
    var t = game.time.elapsed;
    game.draw.gradient(230, 1100, [[0, SKY], [1, SKY2]]);
    // 遠くの山(立方体の段)
    for (var m = 0; m < 12; m++) {
      var hgt = 2 + ((m * 7) % 4);
      for (var k = 0; k < hgt; k++) cube(m * 96 + 20, 760 - k * 40, 8, P_ROCK, 0.55);
    }
    // 堤の上(教官の足場)と警告灯
    for (var c = 0; c < 9; c++) cube(220 + c * 80, 690, 8, P_CON);
    var echoNow = beatN >= echoB;
    var warn = beatN >= echoB - 4 && beatN < echoB && Math.floor(t * 8) % 2 === 0;
    for (var l = 0; l < 2; l++) {
      var lx = l ? 900 : 180;
      cube(lx, 650, 6, warn || (echoNow && running) ? P_RED : P_DARK);
      if (warn) game.draw.circle(lx, 630, 46, RED, 0.25);
    }
    // 貯水池の水と、積んでいく堤(手前)
    game.draw.gradient(800, 1300, [[0, '#7ad0ff'], [1, '#3a94d8']]);
    for (var wv = 0; wv < 14; wv++) cube(wv * 80 + 20, 840 + Math.sin(t * 2 + wv) * 4, 8, P_WATER, 0.8);
    for (var col = 0; col < heights.length; col++) {
      var x = 60 + col * 80;
      for (var hh = 0; hh < heights[col]; hh++) cube(x, 1240 - hh * 40, 8, P_CON);
    }
    // クレーン: 右の塔と腕、トロリーとバケット
    for (var tw = 0; tw < 9; tw++) cube(990, 1220 - tw * 52, 5, P_YEL);
    for (var jb = 0; jb < 12; jb++) cube(110 + jb * 80, 900, 4, P_YEL);
    var tx = 60 + trolley * 80;
    game.draw.rect(tx - 30, 912, 60, 20, INK);
    var bucketY = 1010;
    if (drop) bucketY = 1010 + Math.min(1, drop.t / 0.2) * (1180 - heights[drop.col] * 40 - 1010);
    game.draw.line(tx - 16, 932, tx - 16, bucketY - 30, INK, 3);
    game.draw.line(tx + 16, 932, tx + 16, bucketY - 30, INK, 3);
    cube(tx, bucketY, 6, P_DARK);
    if (!drop) cube(tx, bucketY - 30, 4, P_CON);
    else if (drop.t > 0.2) cube(tx, 1240 - heights[drop.col] * 40, 8, P_WHT, 0.8);
  }

  function drawBoss() {
    var t = game.time.elapsed;
    var p = poseAt();
    var blow = p.amt > 0.9 && beatPulse > 0.3;
    var crossed = over && !won;
    game.draw.sprite(blow ? BOSS_BLOW : BOSS, BOSS_PAL, CX, CY + 10 + (beatPulse > 0.7 ? -4 : 0), 13, { anchor: 'center' });
    if (crossed) {
      for (var k = -2; k <= 2; k++) { cube(CX + k * 34, CY + 10 + k * 20, 4, P_RED); cube(CX - k * 34, CY + 10 + k * 20, 4, P_RED); }
      return;
    }
    if (p.ghost) {
      if (p.ghost & 1) drawArm(1, 1, 0.35, false);
      if (p.ghost & 2) drawArm(2, 1, 0.35, false);
    }
    var mf = missFx ? missFx.hand : 0;
    for (var side = 1; side <= 2; side++) {
      if (mf) { drawArm(side, mf & side ? 1.08 : 0, 1, !!(mf & side)); continue; }
      var a = p.hand & side ? p.amt : 0;
      drawArm(side, a, 1, false);
    }
    var hel = Math.floor(t * 6) % 2 === 0 && beatN >= echoB - 4 && running;
    if (hel) game.draw.circle(CX, CY - 92, 16, RED);
  }

  // 操縦台(親指ゾーン): 左右のレバー。中央の計器の輪が縮みきる時が返す拍
  function drawCab() {
    var t = game.time.elapsed;
    game.draw.gradient(1300, H, [[0, '#4a5670'], [1, '#262c3c']]);
    game.draw.rect(0, 1300, W, 26, '#76808f');
    game.draw.rect(0, 1440, W, 12, YEL);
    for (var st = 0; st < 14; st++) game.draw.rect(st * 80, 1440, 40, 12, INK);
    for (var side = 1; side <= 2; side++) {
      var lx = side === 1 ? 270 : 810;
      var down = leverT[side] > 0 ? 1 : 0;
      cube(lx, 1800, 14, P_DARK);
      for (var k = 0; k < 4; k++) cube(lx, 1740 - k * 50 + down * k * 22, 5, P_CON);
      var kp = side === 1 ? P_ORG : P_CYN;
      var ky = 1560 + down * 70;
      if (leverT[side] > 0 && leverCol[side] === RED) kp = P_RED;
      else if (leverT[side] > 0) kp = P_YEL;
      cube(lx, ky, 11, kp);
      game.draw.sprite(HAND, { s: '#ffd2a8' }, lx + (side === 1 ? 70 : -70), ky + 30, 12, { anchor: 'center' });
    }
    // 計器: 次に返す拍へ縮む輪と、合図の残り回数
    var next = null;
    for (var i = 0; i < sigs.length; i++) if (!sigs[i].res && sigs[i].t > songT - GOOD_W) { next = sigs[i]; break; }
    game.draw.circle(540, 1640, 92, INK);
    game.draw.circle(540, 1640, 70, '#3a4256');
    if (next && running && songT >= next.ts - 0.5 * SPB) {
      var pr = clamp((next.t - songT) / SPB, 0, 1.5);
      var r = 40 + pr * 50;
      for (var s2 = 0; s2 < 24; s2++) {
        var a1 = s2 / 24 * Math.PI * 2, a2 = (s2 + 1) / 24 * Math.PI * 2;
        game.draw.line(540 + Math.cos(a1) * r, 1640 + Math.sin(a1) * r, 540 + Math.cos(a2) * r, 1640 + Math.sin(a2) * r, YEL, 8);
      }
    }
    game.draw.circle(540, 1640, 34, beatPulse > 0.5 ? YEL : '#76808f');
    for (var b = 0; b < 4; b++) {
      var on = beatN >= 0 && beatN % 4 === b;
      cube(450 + b * 60, 1790, 4, on ? (beatN >= echoB ? P_RED : P_YEL) : P_DARK);
    }
  }

  function drawScene() {
    drawSite();
    drawBoss();
    drawCab();
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.06);
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, '#2a3450'], [1, '#1c2433']]);
    game.draw.rect(0, 222, W, 8, YEL);
    label('SCORE ' + score, 40, 64, 44, WHT, 'left');
    label('BEST ' + prevBest, 40, 120, 28, YEL, 'left');
    label(answered + ' / ' + sigs.length, W - 40, 64, 44, CYN, 'right');
    for (var i = 0; i < MISS_MAX; i++) cube(W - 260 + i * 60, 126, 4, i < MISS_MAX - misses ? P_YEL : P_DARK);
    cube(80, 180, 4, P_CON);
    label(String(blocks), 120, 180, 34, WHT, 'left');
    if (combo >= 2) label(combo + ' COMBO', W - 40, 182, 30, ORG, 'right');
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(0, 212, W * progress, 8, ORG);
  }

  function drawResult(t) {
    var y0 = H * 0.25, hh = H * 0.37;
    game.draw.rect(60, y0, W - 120, hh, '#1c2433', 0.94);
    game.draw.rect(60, y0, W - 120, 14, won ? YEL : RED);
    game.draw.rect(60, y0 + hh - 14, W - 120, 14, ORG);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, won ? YEL : RED);
    label('SCORE ' + score, W / 2, H * 0.36, 58, WHT);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 32, CYN);
    label(answered + ' / ' + sigs.length, W / 2, H * 0.45, 50, ORG);
    label('COMBO ' + maxCombo + '   ' + blocks, W / 2, H * 0.49, 38, YEL);
    cube(W / 2 + 170, H * 0.49, 4, P_CON);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 56, YEL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, YEL);
    if (!won) {
      var left = 0;
      for (var i = 0; i < sigs.length; i++) if (!sigs[i].res) left++;
      label('あと' + Math.max(1, left) + '回', W / 2, H * 0.215, 58, RED);
    }
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 34, WHT);
  }

  // ---- ATTRACT: 実ロジックで合図を見て次の拍に同じ側を引く。5回目は左右を取り違えてMISS ----
  var demo = { t: 0, done: {}, pl: 0, pr: 0 };
  var DEMO_LEN = DEMO_BARS * 4 * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.pl = 0; demo.pr = 0; }
    if (demo.pl > 0) demo.pl -= dt;
    if (demo.pr > 0) demo.pr -= dt;
    tickWorld(dt);
    if (!running || hitStop > 0) return;
    for (var i = 0; i < sigs.length; i++) {
      var s = sigs[i];
      if (s.res || demo.done[i]) continue;
      if (songT >= s.t - 0.01) {
        demo.done[i] = true;
        var h = i === DEMO_FAIL ? (s.hand === 1 ? 2 : 1) : s.hand;
        if (h & 1) { demo.pl = 0.16; pull(1); }
        if (h & 2) { demo.pr = 0.16; pull(2); }
      }
      break;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    for (var l = 1; l <= 2; l++) if (leverT[l] > 0) leverT[l] -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(270, demo.pl > 0 ? 1600 : 1540, { press: demo.pl > 0, scale: 13 });
      game.draw.hand(810, demo.pr > 0 ? 1600 : 1540, { press: demo.pr > 0, scale: 13 });
      game.draw.gradient(0, 230, [[0, '#2a3450'], [1, '#1c2433']]);
      game.draw.rect(0, 222, W, 8, YEL);
      label(GAME_TITLE, W / 2, 98 + Math.sin(t * 3) * 4, 88, Math.floor(t * 3) % 2 ? YEL : ORG);
      label('HI-SCORE ' + game.best, W / 2, 184, 36, CYN);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, YEL);
      else label('TAP TO START', W / 2, H * 0.965, 40, WHT);
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
      if (hitStop > 0) { hitStop -= dt; if (missFx) missFx.t = hitStop; if (hitStop <= 0) missFx = null; }
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, answered: answered, blocks: blocks, maxCombo: maxCombo };
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
      game.draw.rect(0, H * 0.42, W, 170, '#1c2433', 0.88);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 90, 110, YEL);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? YEL : RED);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
