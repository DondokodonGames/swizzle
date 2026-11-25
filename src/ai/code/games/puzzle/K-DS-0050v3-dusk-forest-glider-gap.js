// K-DS-0050v3-dusk-forest-glider-gap.js
// 夕暮れの森のムササビすり抜け — 裏拍ごとに迫る枝と枝の隙間を見極め、その隙間を裏拍の瞬間に押して体を丸め、木から木へ滑空していく
// 操作: 枝の壁が右から流れてきて、ムササビの子の前の線(足元の物差しの金の線)に裏拍(拍と拍のまん中)ちょうどで重なる。その瞬間に、壁の隙間の高さを押すとムササビが丸まってそこへ飛び込みすり抜ける(押した瞬間の裏拍からのずれでPERFECT/GOOD)。押した高さが枝・赤いとげのやぶで塞がれた穴なら枝にぶつかってMISS。裏拍からずれた押し・押し忘れもMISS(広げた体のまま枝にぶつかる)。壁が遠いうちの押しは羽ばたいて高さを変えるだけ(罰なし)。壁は2拍前に画面へ入り、葉ずれの音で予告。0.7秒前から本当の隙間の縁が白く点滅する。後半は隙間が細くなり、とげのやぶで塞がれた偽の穴が混ざる
// 終わり: 前奏1小節+8小節(108BPM・36拍・20秒・枝の壁22枚)を抜けて巣の木に着けばCLEAR。3回ぶつかったらGAME OVER
// @mechanic: gap_fit
// @theme: dusk_forest_flying_squirrel_gap
// 世界観: 夕暮れの森で、巣立ちしたばかりのムササビの子が、裏拍ごとに迫る枝と枝の隙間に体を丸めてすり抜けながら、木から木へ滑空して母のいる巣の木へ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・抜けた壁の数・PERFECT/GOOD数・ぶつかった回数・最大コンボ
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var STYLE = { bg: ['#e9b98f', '#6f6a85'], main: ['#b8946a', '#7f9a62', '#6b5240'], accent: ['#e8a040', '#c0584a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 日焼けした液晶のような低彩度の少色。太く単純な形で密度を上げない
  var C = {
    sky0: STYLE.bg[0], sky1: '#b98d93', sky2: STYLE.bg[1], sun: '#f2d6a0',
    far: '#8a907a', mid: '#5f6a58', branch: STYLE.main[2], branchD: '#4e3c30', leaf: STYLE.main[1], leafD: '#5f7a4a',
    fur: STYLE.main[0], furD: '#7d6048', cream: '#efe2bc', eye: '#2b2622', nose: '#6a4034', tail: '#a07e58',
    amber: STYLE.accent[0], thorn: STYLE.accent[1], thornD: '#8a3a32',
    ink: '#3a3440', paper: '#f3e9cf', good: '#a8c878', bad: '#d0604e', white: '#fff8e8', ground: '#4a4a3e'
  };

  var TITLE = 'GLIDE GAP';
  var BPM = 108;
  var SPB = 60 / BPM;              // 1拍 約0.556秒
  var BARS = 9;                    // 前奏1小節 + 8小節
  var TOTAL_BEATS = BARS * 4;
  var TIME_LIMIT = 20;             // 36拍 = 20.0秒。放置でも READY 0.8 + 20 + 余韻 1.7 = 22.5秒で終わる
  var LEAD = 0.06;
  var PERFECT_W = 0.06, GOOD_W = 0.12, NEAR_W = 0.19;
  var MAX_MISS = 3;
  var HIT_STOP = 0.36;
  var SQ_X = 300;                                  // ムササビ(すり抜けの線)のX
  var PF_TOP = Math.round(H * 0.17);               // 遊びの上端
  var PF_BOT = Math.round(H * 0.70);               // 遊びの下端
  var GROUND_Y = Math.round(H * 0.735);            // 森の地面
  var RULER_Y = Math.round(H * 0.84);              // 拍の物差し
  var APPROACH = 2;                                // 壁は2拍前に画面へ入る
  var SPEED = (W + 160 - SQ_X) / (APPROACH * SPB); // px/秒
  var GH = { W: 110, M: 90, N: 74 };               // 隙間の半分の高さ(広い/ふつう/細い)

  // 枝の壁: [小節, 拍(0〜3。その拍の裏で届く), 隙間の中心Y, 太さ, とげのやぶで塞がれた偽の穴のY(0=なし)]
  var WALLS = [
    [1, 1, 820, 'W', 0], [1, 3, 700, 'W', 0],
    [2, 0, 900, 'W', 0], [2, 2, 620, 'W', 0],
    [3, 0, 760, 'M', 0], [3, 1, 980, 'M', 0], [3, 3, 560, 'M', 0],
    [4, 0, 860, 'M', 0], [4, 2, 1120, 'M', 0], [4, 3, 700, 'M', 0],
    [5, 1, 600, 'M', 1060], [5, 3, 1000, 'M', 540],
    [6, 0, 760, 'M', 0], [6, 1, 1100, 'M', 640], [6, 2, 520, 'N', 0],
    [7, 0, 820, 'N', 0], [7, 1, 1040, 'N', 0], [7, 2, 760, 'N', 1200], [7, 3, 560, 'N', 0],
    [8, 0, 900, 'N', 0], [8, 2, 640, 'M', 1080], [8, 3, 840, 'W', 0]
  ];
  var DEMO_WALLS = [[0, 1, 760, 'W', 0], [0, 3, 1000, 'W', 0], [1, 0, 620, 'M', 0], [1, 2, 960, 'M', 520], [2, 0, 780, 'W', 0]];
  var DEMO_TRAP = 3;               // デモはこの壁でとげのやぶの穴を押してぶつかる
  var DEMO_LEN = 3 * 4 * SPB;      // 3小節

  // 伴奏(オリジナル): 表拍にベース、裏拍に短い和音の刻み(Am - F - C - G)
  var STABS = [['E5', 'C5', 'E5', 'A5'], ['F5', 'C5', 'A4', 'C5'], ['G5', 'E5', 'C5', 'E5'], ['D5', 'B4', 'G4', 'B4']];
  var BASS = [['A2', 'A2', 'E2', 'A2'], ['F2', 'F2', 'C3', 'F2'], ['C3', 'C3', 'G2', 'C3'], ['G2', 'G2', 'D3', 'G2']];

  // ---- スプライト ----
  var GLIDE_A = [
    '...F.........F..F..', '...FF........FFfff.', '....fffffffffffffff', 'tt.ttcccccccccfffef', 'tttttccccccccccfffn',
    '.tt.ttcccccccccff..', '....fffffffffffff..', '...FF........FF....', '...F.........F.....'
  ];
  var GLIDE_B = [
    '....F.......F...F..', '...FF.......FFfff..', '....fffffffffffffff', 'tt.ttcccccccccfffef', 'tttttccccccccccfffn',
    '.tt.ttcccccccccff..', '....fffffffffffff..', '...FF.......FF.....', '....F.......F......'
  ];
  var BALL = ['.....F.F..', '..ffffff..', '.fffffffff', 'ffcccccfef', 'fcccccccfn', 'tfccccccf.', 'ttfffffff.', '.tt.......'];
  var HURT = [
    '................F..', '...............fff.', '....fffffffffffffff', 'tt.ttcccccccccfffxf', 'tttttccccccccccfffn',
    '.tt.ttcccccccccff..', '....fffffffffffff..', '....F........F.....', '....F........F.....'
  ];
  var SQ_PAL = { F: C.furD, f: C.fur, c: C.cream, t: C.tail, e: C.eye, n: C.nose, x: C.eye };
  var SQ_INK = { F: C.ink, f: C.ink, c: C.ink, t: C.ink, e: C.ink, n: C.ink, x: C.ink };
  var SQ_HIT = { F: C.white, f: C.white, c: C.white, t: C.white, e: C.bad, n: C.white, x: C.bad };
  var THORN = ['r..r..r', '.rrRrr.', 'rRrrrRr', '.rrRrr.', 'r..r..r'];
  var THORN_PAL = { r: C.thorn, R: C.thornD };
  var ACORN = ['.bb.', 'bbbb', 'aaaa', 'aaaa', '.aa.'];
  var ACORN_PAL = { b: C.furD, a: C.amber };
  var ACORN_OFF = { b: '#6a6258', a: '#8a8070' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, walls, running, songT, halfN, schedBar, readyT, beatPulse;
  var sqY, sqTarget, flapT, tuckT, stopT, tumbleT, hitWall, judgeW, judgeT, endT;
  var score, perfects, goods, misses, passed, combo, maxCombo, over, won, outroT, prevBest, milestone, spawnSeen;

  function buildWalls(spec) {
    var out = [];
    for (var i = 0; i < spec.length; i++) {
      var s = spec[i];
      out.push({ t: (s[0] * 4 + s[1] + 0.5) * SPB, gy: s[2], sz: s[3], dg: s[4], res: '', flash: 0, shake: 0 });
    }
    return out;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    walls = buildWalls(demoMode ? DEMO_WALLS : WALLS);
    running = false; songT = 0; halfN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0;
    sqY = 800; sqTarget = 800; flapT = 0; tuckT = 0; stopT = 0; tumbleT = 0; hitWall = null;
    judgeW = ''; judgeT = 0;
    endT = (demoMode ? 3 : BARS) * 4 * SPB;
    score = 0; perfects = 0; goods = 0; misses = 0; passed = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; spawnSeen = {};
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function clampY(y) { return Math.max(PF_TOP + 60, Math.min(PF_BOT - 40, y)); }

  function playBar(b) {
    if (demoMode || over || b >= BARS) return;
    var ch = b % 4;
    var mel = [], bass = [];
    for (var i = 0; i < 4; i++) { mel.push(['R', 0.5]); mel.push([STABS[ch][i], 0.5]); }
    for (var j = 0; j < 4; j++) bass.push([BASS[ch][j], 1]);
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.05, bass: bass, bassWave: 'triangle', bassVolume: 0.13 });
  }

  // ---- 拍クロック(1本だけ。8分単位で数え、偶数=表拍・奇数=裏拍)。ヒットストップ中も止めない ----
  function onHalf(h) {
    if (h % 2 === 0) {
      beatPulse = 1;
      sfx((h / 2) % 4 === 0 ? 1320 : 990, 0.02, { wave: 'square', volume: (h / 2) % 4 === 0 ? 0.03 : 0.018 });
    } else {
      sfx(2640, 0.012, { wave: 'square', volume: 0.012 });
    }
  }

  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < BARS && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (halfN + 1) * SPB / 2) { halfN++; onHalf(halfN); }
  }

  function wallX(w) { return SQ_X + (w.t - songT) * SPEED; }

  function nearestWall() {
    var best = null, bd = 99;
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (w.res) continue;
      var d = Math.abs(songT - w.t);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  function say(word, col) {
    judgeW = word; judgeT = 0.45;
  }

  function missWall(w, why) {
    w.res = 'miss'; w.flash = 0.45; w.shake = 0.4;
    misses++; combo = 0;
    stopT = HIT_STOP; hitWall = w;
    say('MISS', C.bad);
    sfx(why === 'thorn' ? 300 : 180, 0.16, { wave: 'sawtooth', volume: 0.07, slide: -90 });
    game.fx.burst(SQ_X + 40, sqY, { color: why === 'thorn' ? C.thorn : C.leaf, count: 10, speed: 260 });
  }

  // ---- 丸まってすり抜ける(押した高さと裏拍からのずれで判定) ----
  function tuckAt(y) {
    if (!running || over) return 'none';
    if (stopT > 0) return 'busy';
    var ty = clampY(y);
    var w = nearestWall();
    if (!w || Math.abs(songT - w.t) > NEAR_W) {
      sqTarget = ty; flapT = 0.22;
      sfx(520, 0.05, { wave: 'triangle', volume: 0.05, slide: 120 });
      return 'flap';
    }
    var off = songT - w.t;
    sqTarget = ty;
    if (Math.abs(off) > GOOD_W) { missWall(w, 'time'); return 'miss'; }
    var gh = GH[w.sz];
    if (Math.abs(ty - w.gy) > gh - 12) {
      missWall(w, w.dg && Math.abs(ty - w.dg) <= gh ? 'thorn' : 'branch');
      return 'miss';
    }
    var perfect = Math.abs(off) <= PERFECT_W;
    w.res = 'ok'; w.shake = 0.3;
    sqTarget = w.gy; tuckT = 0.34;
    passed++; combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    var mul = w.sz === 'N' ? 1.5 : w.dg ? 1.3 : 1;
    score += Math.round((perfect ? 100 + combo * 10 : 60 + combo * 5) * mul);
    say(perfect ? 'PERFECT' : 'GOOD', perfect ? C.amber : C.good);
    game.fx.burst(SQ_X + 60, w.gy, { color: perfect ? C.amber : C.leaf, count: perfect ? 12 : 7, speed: 280 });
    if (!demoMode) game.feedback.good(SQ_X + 60, w.gy - 60, { text: null, color: C.amber, count: 5, volume: 0.15 });
    sfx(perfect ? 1175 : 880, 0.07, { wave: 'square', volume: 0.06, slide: 200 });
    if (!milestone && passed >= Math.ceil(walls.length / 2)) {
      milestone = true;
      if (!demoMode) game.audio.play('se_milestone', 0.4);
      game.fx.popup(passed + ' / ' + walls.length, W / 2, H * 0.3, { color: C.amber, size: 84 });
    }
    return perfect ? 'perfect' : 'good';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (ok) {
      score += 300 + (MAX_MISS - misses) * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(300, 980), game.random(400, 1100), { color: i % 2 ? C.amber : C.leaf, count: 16, speed: 360 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judgeT > 0) judgeT -= dt;
    if (flapT > 0) flapT -= dt;
    if (tuckT > 0) tuckT -= dt;
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (w.flash > 0) w.flash -= dt;
      if (w.shake > 0) w.shake -= dt;
      // 葉ずれの予告(画面に入った瞬間)
      if (!spawnSeen[i] && wallX(w) < W + 120) {
        spawnSeen[i] = true;
        sfx(w.dg ? 330 : 140, 0.09, { wave: 'sawtooth', volume: 0.025, slide: w.dg ? 220 : 60 });
      }
    }
    if (!running) return;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        stopT = 0;
        if (!demoMode) game.feedback.bad(SQ_X + 30, sqY - 40, { text: null, shake: 9 });
        else game.fx.shake(6, 0.15);
        tumbleT = 0.45; sqTarget = clampY(sqY + 140);
        if (!demoMode && misses >= MAX_MISS) finish(false);
      }
    } else if (!over) {
      // 押し忘れ: 広げた体のまま枝にぶつかる
      for (var j = 0; j < walls.length; j++) {
        if (!walls[j].res && songT > walls[j].t + GOOD_W) { missWall(walls[j], 'none'); break; }
      }
    }
    if (tumbleT > 0) tumbleT -= dt;
    // ゆっくり沈む滑空 + ふわふわ
    if (stopT <= 0) {
      if (tuckT <= 0 && flapT <= 0) sqTarget = clampY(sqTarget + 26 * dt);
      sqY += (sqTarget - sqY) * Math.min(1, dt * (tuckT > 0 ? 28 : 9));
    }
    if (!demoMode && !over && songT >= endT) finish(misses < MAX_MISS);
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(false);
  }

  // ---- 描画 ----
  function txt(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }

  function drawForest() {
    var t = game.time.elapsed;
    var scroll = (running ? songT : t * 0.3) * SPEED;
    game.draw.gradient(0, GROUND_Y, [[0, C.sky0], [0.55, C.sky1], [1, C.sky2]]);
    game.draw.circle(820, 430, 120, C.sun, 0.8);
    game.draw.circle(820, 430, 160, C.sun, 0.2);
    // 遠い森(視差 0.15)
    for (var i = 0; i < 9; i++) {
      var fx = ((i * 170 - scroll * 0.15) % 1530 + 1530) % 1530 - 200;
      var top = 700 + (i % 3) * 70;
      game.draw.rect(fx + 50, top, 40, GROUND_Y - top, C.far);
      game.draw.circle(fx + 70, top, 110, C.far);
    }
    // 近い幹(視差 0.5)
    for (var k = 0; k < 5; k++) {
      var mx = ((k * 330 - scroll * 0.5) % 1650 + 1650) % 1650 - 250;
      game.draw.rect(mx, PF_TOP - 40, 70, GROUND_Y - PF_TOP + 40, C.mid);
      game.draw.rect(mx + 10, PF_TOP - 40, 14, GROUND_Y - PF_TOP + 40, '#6f7a66');
    }
    // 地面と下草
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground);
    for (var g = 0; g < 12; g++) {
      var gx = ((g * 110 - scroll * 0.9) % 1320 + 1320) % 1320 - 120;
      game.draw.circle(gx, GROUND_Y + 6, 46, '#56604a');
    }
  }

  function drawBranchSeg(x, y0, y1, sh) {
    if (y1 - y0 < 4) return;
    game.draw.rect(x - 34 + sh, y0, 68, y1 - y0, C.branchD);
    game.draw.rect(x - 26 + sh, y0, 40, y1 - y0, C.branch);
    for (var y = y0 + 40; y < y1 - 20; y += 120) {
      game.draw.circle(x - 46 + sh, y, 34, C.leafD);
      game.draw.circle(x + 44 + sh, y + 60, 30, C.leaf);
    }
  }

  function drawWall(w) {
    var x = wallX(w);
    if (x < -160 || x > W + 160) return;
    var t = game.time.elapsed;
    var gh = GH[w.sz];
    var sh = w.shake > 0 ? Math.sin(t * 60) * 8 : 0;
    var holes = [[w.gy - gh, w.gy + gh, false]];
    if (w.dg) holes.push([w.dg - gh, w.dg + gh, true]);
    holes.sort(function (a, b) { return a[0] - b[0]; });
    var y = PF_TOP - 100;
    for (var i = 0; i < holes.length; i++) {
      drawBranchSeg(x, y, holes[i][0], sh);
      // 枝先のこぶ(穴の縁)
      game.draw.circle(x + sh, holes[i][0], 38, C.branchD);
      game.draw.circle(x + sh, holes[i][1], 38, C.branchD);
      game.draw.circle(x - 30 + sh, holes[i][0] - 18, 26, C.leaf);
      game.draw.circle(x + 30 + sh, holes[i][1] + 18, 26, C.leaf);
      if (holes[i][2]) {
        // 偽の穴: 赤いとげのやぶで塞がれている
        for (var ty = holes[i][0] + 24; ty < holes[i][1] - 10; ty += 42) game.draw.sprite(THORN, THORN_PAL, x + sh, ty, 10, { anchor: 'center' });
      }
      y = holes[i][1];
    }
    drawBranchSeg(x, y, GROUND_Y, sh);
    // 本当の隙間: 0.7秒前から縁が白く点滅 + 丸まった体の目安の輪
    var dtA = w.t - songT;
    if (!w.res && dtA < 1.25 * SPB && dtA > -GOOD_W) {
      var on = Math.floor(t * 10) % 2 === 0;
      game.draw.rect(x - 44, w.gy - gh - 4, 88, 10, C.white, on ? 0.95 : 0.4);
      game.draw.rect(x - 44, w.gy + gh - 6, 88, 10, C.white, on ? 0.95 : 0.4);
      game.draw.circle(x, w.gy, 46, C.white, 0.18);
    }
    if (w.flash > 0) {
      game.draw.rect(x - 40, PF_TOP - 100, 80, GROUND_Y - PF_TOP + 100, C.white, Math.min(0.7, w.flash * 1.6));
    }
  }

  function drawHome() {
    var x = SQ_X + (endT - songT) * SPEED + 260;
    if (x > W + 300) return;
    game.draw.rect(x - 90, PF_TOP - 100, 180, GROUND_Y - PF_TOP + 100, C.branchD);
    game.draw.rect(x - 70, PF_TOP - 100, 50, GROUND_Y - PF_TOP + 100, C.branch);
    game.draw.circle(x, 760, 66, C.ink);
    game.draw.circle(x, 760, 52, '#2a2228');
    game.draw.circle(x - 16, 744, 8, C.amber);
    game.draw.circle(x + 16, 744, 8, C.amber);
    game.draw.circle(x, PF_TOP - 60, 230, C.leafD);
    game.draw.circle(x - 80, PF_TOP + 40, 140, C.leaf);
  }

  function drawSquirrel() {
    var t = game.time.elapsed;
    var y = sqY + (stopT > 0 ? 0 : Math.sin(t * 5) * 8);
    if (stopT > 0) {
      game.draw.circle(SQ_X, y, 150, C.white, 0.3);
      game.draw.sprite(HURT, SQ_HIT, SQ_X, y, 18, { anchor: 'center' });
      return;
    }
    if (tumbleT > 0) {
      game.draw.sprite(HURT, SQ_INK, SQ_X - 4, y + 6, 15, { anchor: 'center', alpha: 0.45, flipY: Math.floor(t * 12) % 2 === 0 });
      game.draw.sprite(HURT, SQ_PAL, SQ_X - 10, y, 15, { anchor: 'center', flipY: Math.floor(t * 12) % 2 === 0 });
      return;
    }
    if (tuckT > 0) {
      game.draw.sprite(BALL, SQ_INK, SQ_X + 6, y + 6, 12, { anchor: 'center', alpha: 0.45 });
      game.draw.sprite(BALL, SQ_PAL, SQ_X, y, 12, { anchor: 'center' });
      game.draw.circle(SQ_X - 70, y, 20, C.cream, 0.4);
      game.draw.circle(SQ_X - 120, y + 4, 12, C.cream, 0.25);
      return;
    }
    var fr = flapT > 0 ? (Math.floor(t * 16) % 2 ? GLIDE_B : GLIDE_A) : (beatPulse > 0.5 ? GLIDE_B : GLIDE_A);
    game.draw.sprite(fr, SQ_INK, SQ_X + 6, y + 6, 15, { anchor: 'center', alpha: 0.45 });
    game.draw.sprite(fr, SQ_PAL, SQ_X, y, 15, { anchor: 'center' });
  }

  function drawRuler() {
    var x0 = 40, x1 = W - 40;
    game.draw.rect(0, RULER_Y - 110, W, 220, '#3e3a3c');
    game.draw.rect(x0, RULER_Y - 4, x1 - x0, 8, '#6a6258');
    var hNow = Math.floor(songT / (SPB / 2));
    for (var h = hNow - 3; h <= hNow + 10; h++) {
      var x = SQ_X + (h * SPB / 2 - songT) * SPEED;
      if (x < x0 || x > x1) continue;
      if (h % 2 === 0) game.draw.circle(x, RULER_Y, (h / 2) % 4 === 0 ? 20 : 14, (h / 2) % 4 === 0 ? C.paper : '#b8ae98');
      else game.draw.rect(x - 4, RULER_Y - 16, 8, 32, '#8a8070');
    }
    // 壁の印: 小さな縦帯に隙間の位置を描く(とげの穴は赤)
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var wx = wallX(w);
      if (wx < x0 || wx > x1) continue;
      var top = RULER_Y - 96, hh = 80;
      var sc = hh / (PF_BOT - PF_TOP);
      game.draw.rect(wx - 12, top, 24, hh, w.res === 'miss' ? C.bad : w.res === 'ok' ? C.good : C.branch);
      game.draw.rect(wx - 12, top + (w.gy - GH[w.sz] - PF_TOP) * sc, 24, GH[w.sz] * 2 * sc, C.paper);
      if (w.dg) game.draw.rect(wx - 12, top + (w.dg - GH[w.sz] - PF_TOP) * sc, 24, GH[w.sz] * 2 * sc, C.thorn);
    }
    // すり抜けの線(金)
    game.draw.rect(SQ_X - 5, RULER_Y - 104, 10, 208, C.amber, 0.85 + beatPulse * 0.15);
    game.draw.circle(SQ_X, RULER_Y + 100, 12, C.amber);
  }

  function drawHud(showPlay) {
    game.draw.rect(0, 0, W, 230, '#3e3a3c');
    game.draw.rect(0, 222, W, 8, C.furD);
    if (!showPlay) return;
    txt('SCORE ' + score, 50, 70, 50, C.paper, 'left');
    txt('BEST ' + prevBest, 50, 135, 32, '#b8ae98', 'left');
    txt(passed + ' / ' + walls.length, W - 50, 70, 50, C.amber, 'right');
    for (var i = 0; i < MAX_MISS; i++) game.draw.sprite(ACORN, i < MAX_MISS - misses ? ACORN_PAL : ACORN_OFF, W - 80 - i * 70, 150, 11, { anchor: 'center' });
    if (combo >= 3) txt(combo + ' COMBO', W / 2, 180, 34, C.good);
    // 進み具合(巣の木まで)
    var prog = Math.max(0, Math.min(1, songT / endT));
    game.draw.rect(300, 120, 420, 14, '#5a5450');
    game.draw.rect(300, 120, 420 * prog, 14, C.amber);
  }

  function drawScene() {
    drawForest();
    drawHome();
    for (var i = walls.length - 1; i >= 0; i--) drawWall(walls[i]);
    drawSquirrel();
    // 日焼けした液晶の色かぶり
    game.draw.rect(0, PF_TOP - 100, W, GROUND_Y - PF_TOP + 100, '#f0d8a0', 0.07);
    if (judgeT > 0) txt(judgeW, SQ_X + 200, sqY - 190, 64, judgeW === 'MISS' ? C.bad : C.amber);
    drawRuler();
  }

  // ---- ATTRACT: 実ロジックで裏拍に隙間を押してすり抜ける。1回だけとげのやぶの穴を押してぶつかる ----
  var demo = { t: 0, hx: SQ_X + 300, hy: 800, press: 0, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.idx = 0; demo.press = 0; }
    var w = demo.idx < walls.length ? walls[demo.idx] : null;
    if (w && w.res) { demo.idx++; w = demo.idx < walls.length ? walls[demo.idx] : null; }
    if (w) {
      var aimY = demo.idx === DEMO_TRAP && w.dg ? w.dg : w.gy;
      demo.hx += (SQ_X + 300 - demo.hx) * Math.min(1, dt * 8);
      demo.hy += (aimY - demo.hy) * Math.min(1, dt * 7);
      if (songT >= w.t && songT - w.t < 0.06 && stopT <= 0 && !w.res) {
        tuckAt(aimY);
        demo.press = 0.16;
      }
    }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var r = tuckAt(y);
    if (r === 'busy') game.audio.tone(140, 0.04, { wave: 'square', volume: 0.03 });
    else if (r === 'flap') game.fx.burst(x, y, { color: C.cream, count: 3, speed: 90 });
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
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, 92 + Math.sin(t * 3) * 4, 92, C.amber);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 178, 38, C.paper);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 48, C.amber);
      else txt('TAP TO START', W / 2, H * 0.955, 44, C.paper);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud(false);
      game.draw.rect(90, H * 0.2, W - 180, H * 0.44, C.ink);
      game.draw.rect(104, H * 0.2 + 14, W - 208, H * 0.44 - 28, C.paper);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, won ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.33, 60, C.ink);
      txt(passed + ' / ' + walls.length, W / 2, H * 0.385, 54, C.furD);
      txt('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.435, 34, C.ink);
      txt(maxCombo + ' COMBO', W / 2, H * 0.48, 38, C.furD);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.53, 54, C.amber);
      else txt('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.53, 42, C.furD);
      if (!won) txt('あと' + Math.max(1, walls.length - passed) + '本', W / 2, H * 0.58, 50, C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.paper);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (won) sqTarget = 760;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, passed: passed, total: walls.length, perfect: perfects, good: goods, misses: misses, maxCombo: maxCombo };
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
    if (readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, C.amber);
    if (over) txt(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.42, 110, won ? C.good : C.bad);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
