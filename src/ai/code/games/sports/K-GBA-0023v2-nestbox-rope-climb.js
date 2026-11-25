// K-GBA-0023v2-nestbox-rope-climb.js
// 巣箱見回りの綱登り — 拍ごとに左右の手を交互に伸ばして綱を手繰り、拍を外さず梢の巣箱まで登りきる
// 操作: 画面下の左右2つのパッドを拍の頭ごとに左→右→左…と交互に押し、押した側の手を伸ばして綱をつかむ。最初の1小節は合図だけ。拍の頭ちょうどでPERFECT、少しずれるとGOOD。大きくずれる・同じ側を続けて押す・押し忘れはMISSで手が滑り、その拍は登れない。序盤は次に伸ばす手のパッドが光るが、中盤は小節頭だけ、終盤は光らない(上げている手と逆の手を出す)
// 終わり: 綱を20手つかんで梢に着けばCLEAR(PERFECT/GOODの点+残り拍ボーナス)。MISS 4回で綱を滑り降りてGAME OVER
// @mechanic: alternate_tap
// @theme: nestbox_rope_climb
// 世界観: 大木の幹に掛けた綱を、樹上の巣箱を点検する庭師が拍ごとに左右の手で手繰って登り、梢の巣箱まで上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・つかんだ手数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var STYLE = { bg: ['#2a4a6a', '#9cc4c0'], main: ['#7a5034', '#4f8a3a', '#d8c08a'], accent: ['#ff8a3c', '#fff08a'] };
  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点は毎フレーム微小に揺れる、遠景はフォグで沈める
  var C = {
    sky0: STYLE.bg[0], sky1: '#5a8aa0', sky2: STYLE.bg[1], fog: '#b8d4cc',
    barkA: '#4e3220', barkB: STYLE.main[0], barkC: '#94643e', barkD: '#86583a', seam: '#2e1c10',
    leafA: STYLE.main[1], leafB: '#3a6c2c', leafC: '#6aa850', rope: STYLE.main[2], ropeD: '#9a8048',
    box: '#c8884a', boxD: '#8a5a30', roof: '#5a3424', hole: '#1e120a',
    hot: STYLE.accent[0], gold: STYLE.accent[1],
    padA: '#3c6a5c', padB: '#1e3a32', padLit: '#8ae0c0', glove: '#f4ead0',
    good: '#8aff9a', bad: '#ff5a4a', white: '#ffffff', ink: '#14201c', grass: '#4a7a34',
  };

  var GAME_TITLE = 'NESTBOX CLIMB';
  var BPM = 120;
  var SPB = 60 / BPM;          // 1拍 0.5秒
  var BAR = 4;                 // 4拍子(表拍)
  var LEAD = 4;                // 最初の1小節は合図だけ(判定なし)
  var JUDGE_N = 24;            // 判定する拍(6小節)
  var LAST = LEAD + JUDGE_N - 1;
  var GOAL = 20;               // 梢までの手数
  var MAX_MISS = 4;
  var PERFECT_W = 0.07;        // 拍の頭からのずれ(秒)
  var GOOD_W = 0.15;
  var TIME_LIMIT = 14;         // (LEAD + JUDGE_N) 拍 × 0.5秒
  var RUNG = 118;              // 1手で上がる高さ(px)
  var NESTS = [7, 14];         // 途中の巣箱(手数)
  var GY = H * 0.46;           // 手元の画面上の高さ
  var ROPE_X = W / 2;
  var PADS = [{ x: W * 0.25, y: H * 0.86 }, { x: W * 0.75, y: H * 0.86 }];

  // 庭師の口笛(オリジナル)。4小節 = 16拍で1周、表拍に乗る
  var TUNE = [
    ['G4', 1], ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1],
    ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['A4', 2],
    ['B4', 1], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 1],
    ['D5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 2],
  ];
  var TUNE_BASS = [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['E2', 1], ['B2', 1], ['D2', 1], ['A2', 1],
                   ['C3', 1], ['G3', 1], ['G2', 1], ['D3', 1], ['D2', 1], ['A2', 1], ['G2', 1], ['D3', 1]];
  function startSong(quiet) {
    game.audio.melody(TUNE, { tempo: BPM, wave: 'square', volume: quiet ? 0.02 : 0.04, loop: true, bass: TUNE_BASS, bassWave: 'triangle', bassVolume: quiet ? 0.035 : 0.07 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT;
  var res, height, dispH, handUp, reachT, slipT, slipHand, hitStop, padFlash, beatPulse;
  var score, combo, maxCombo, perfects, goods, misses, over, won, outroT, prevBest, nestSeen, timeUp;

  function handFor(b) { return (b - LEAD) % 2 === 0 ? 0 : 1; }   // 0=左手 1=右手

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    res = [];
    for (var i = 0; i <= LAST + 1; i++) res.push(0);
    height = 0; dispH = 0; handUp = 1; reachT = 0; slipT = 0; slipHand = 0; hitStop = 0;
    padFlash = [0, 0]; beatPulse = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; nestSeen = [false, false]; timeUp = false;
    if (isDemo) { startClock(); startSong(true); }
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    onBeat(0);
  }

  function onBeat(b) {
    var v = demoMode ? 0.4 : 1;
    beatPulse = 1;
    if (b < LEAD) {
      game.audio.tone(b === LEAD - 1 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.08 * v });
    } else if (b % BAR === 0) {
      game.audio.tone(98, 0.14, { wave: 'sine', volume: 0.24 * v });
    } else {
      game.audio.tone(1250, 0.025, { wave: 'square', volume: 0.035 * v });
    }
  }

  function stepClock(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    // 押し忘れ: 拍の頭 + GOOD 窓を過ぎたら手が滑る
    for (var b = LEAD; b <= LAST; b++) {
      if (b * SPB > songT) break;
      if (res[b] === 0 && songT > b * SPB + GOOD_W) slip(b, handFor(b));
      if (over) break;
    }
    if (!demoMode && !over && songT >= TIME_LIMIT) { timeUp = true; finish(height >= GOAL); }
  }

  // ---- 判定 ----
  function grab(side) {
    padFlash[side] = 0.16;
    var b = Math.round(songT / SPB);
    var off = songT - b * SPB;
    if (b < LEAD || b > LAST || res[b] !== 0) {
      // 判定対象のない空振り(罰なし): 綱に触れるだけ
      game.audio.tone(side ? 520 : 440, 0.04, { wave: 'triangle', volume: 0.05 });
      return;
    }
    var a = Math.abs(off);
    if (side !== handFor(b)) { slip(b, side); return; }        // 同じ手を続けて出した
    if (a <= PERFECT_W) catchRope(b, side, 2);
    else if (a <= GOOD_W) catchRope(b, side, 1);
    else slip(b, side);                                        // 早すぎ
  }

  function handPos(side) { return { x: ROPE_X + (side ? 14 : -14), y: GY - 40 }; }

  function catchRope(b, side, q) {
    res[b] = q;
    height++;
    handUp = side; reachT = 0.12;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    var hp = handPos(side);
    if (q === 2) {
      perfects++;
      score += 100 + Math.min(combo, 10) * 10;
      game.feedback.good(hp.x + (side ? 150 : -150), hp.y, { text: 'PERFECT', color: C.gold, size: 46, count: 10, volume: demoMode ? 0.12 : 0.25 });
    } else {
      goods++;
      score += 50 + Math.min(combo, 10) * 5;
      game.feedback.good(hp.x + (side ? 150 : -150), hp.y, { text: 'GOOD', color: C.good, size: 40, count: 6, volume: demoMode ? 0.1 : 0.2 });
    }
    game.audio.tone(330 + height * 22, 0.07, { wave: 'triangle', volume: demoMode ? 0.04 : 0.09 });
    for (var i = 0; i < NESTS.length; i++) {
      if (height === NESTS[i] && !nestSeen[i]) {
        nestSeen[i] = true;
        var nx = i % 2 === 0 ? 175 : W - 175;
        game.fx.popup('NICE!', nx, GY - 160, { color: C.gold, size: 60 });
        game.fx.burst(nx, GY - 40, { color: C.leafC, count: 14, speed: 300 });
        game.audio.play('se_milestone', demoMode ? 0.15 : 0.45);
      }
    }
    if (!demoMode && combo > 0 && combo % 8 === 0) game.fx.popup('COMBO ' + combo, W / 2, GY - 260, { color: C.hot, size: 64 });
    if (!demoMode && height >= GOAL) finish(true);
  }

  function slip(b, side) {
    res[b] = -1;
    misses++; combo = 0;
    slipT = 0.45; slipHand = side; hitStop = 0.4;
    var hp = handPos(side);
    game.feedback.bad(hp.x, hp.y - 30, { text: 'MISS', shake: demoMode ? 4 : 10, volume: demoMode ? 0.15 : 0.5 });
    if (!demoMode && misses >= MAX_MISS) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += Math.max(0, LAST - beatN) * 30 + maxCombo * 10;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(180, 900), game.random(300, 800), { color: i % 2 ? C.gold : C.leafC, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    var side = x < W / 2 ? 0 : 1;
    if (readyT > 0 || !running) { padFlash[side] = 0.12; game.audio.tone(300, 0.03, { wave: 'triangle', volume: 0.04 }); return; }
    grab(side);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- ローポリ描画ヘルパー ----
  function jit(k) { return Math.sin(game.time.elapsed * 13 + k * 2.1) * 1.4; }
  function poly(p, col, al, strip) {
    var st = strip || 5, n = p.length / 2, y0 = 1e9, y1 = -1e9, i;
    for (i = 0; i < n; i++) { if (p[i * 2 + 1] < y0) y0 = p[i * 2 + 1]; if (p[i * 2 + 1] > y1) y1 = p[i * 2 + 1]; }
    y0 = Math.max(y0, -st); y1 = Math.min(y1, H + st);
    for (var y = y0; y < y1; y += st) {
      var yc = y + st * 0.5, xl = 1e9, xr = -1e9;
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n;
        var ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
          var xx = ax + (yc - ay) * (bx - ax) / (by - ay);
          if (xx < xl) xl = xx;
          if (xx > xr) xr = xx;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, st + 0.6, col, al);
    }
  }
  function edge(p, col, w) {
    var n = p.length / 2;
    for (var i = 0; i < n; i++) { var j = (i + 1) % n; game.draw.line(p[i * 2], p[i * 2 + 1], p[j * 2], p[j * 2 + 1], col, w); }
  }
  function hexPts(cx, cy, rx, ry, k) {
    var p = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      p.push(cx + Math.cos(a) * rx + jit(k + i), cy + Math.sin(a) * ry + jit(k + i + 3));
    }
    return p;
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // ---- 世界(綱と幹) ----
  var SEG = 170;
  var TRUNK_X = [300, 420, 540, 660, 780];
  var TRUNK_SHADE = [C.barkA, C.barkB, C.barkC, C.barkD];
  function camY() { return dispH * RUNG; }
  function sy(w) { return GY - (w - camY()); }   // ワールド高さ(上が正) → 画面y
  function trunkX(c, r) {
    var wob = (c === 0 || c === 4) ? ((r * 29 + c * 7) % 5 - 2) * 6 : ((r * 37 + c * 53) % 9 - 4) * 9;
    return TRUNK_X[c] + wob + jit(r * 5 + c);
  }
  var TOP_W = GOAL * RUNG + 260;   // 幹の上端(梢の中)

  function drawSky() {
    game.draw.gradient(0, H, [[0, C.sky0], [0.55, C.sky1], [1, C.sky2]]);
    var par = camY() * 0.16;
    for (var i = 0; i < 4; i++) {
      var cx = ((i * 290 + game.time.elapsed * 14) % (W + 300)) - 150, cy = 300 + i * 120 + par * 0.4;
      poly([cx - 120, cy, cx - 40, cy - 46, cx + 70, cy - 40, cx + 130, cy], C.white, 0.35, 6);
    }
    for (var k = 0; k < 7; k++) {
      var x = k * 170 + 20, base = H * 0.8 + par, hgt = 280 + (k * 73 % 5) * 50;
      poly([x - 110, base, x + 110, base, x + jit(k) * 3, base - hgt], C.leafB, 0.6, 6);
    }
    game.draw.rect(0, 0, W, H, C.fog, 0.3);
  }

  function drawGround() {
    var gy = sy(-270);
    if (gy > H + 40) return;
    poly([0, gy, W, gy, W, H + 10, 0, H + 10], C.grass, 1, 8);
    poly([TRUNK_X[0] - 120, gy + 8, TRUNK_X[0] + 20, gy - 90, TRUNK_X[0] + 60, gy + 8], C.barkA, 1, 5);
    poly([TRUNK_X[4] + 120, gy + 8, TRUNK_X[4] - 20, gy - 90, TRUNK_X[4] - 60, gy + 8], C.barkB, 1, 5);
    for (var i = 0; i < 9; i++) poly([i * 130, gy + 4, i * 130 + 30, gy - 34, i * 130 + 60, gy + 4], C.leafC, 0.8, 4);
  }

  function drawTrunk() {
    var cy = camY();
    var r0 = Math.max(-2, Math.floor((cy + GY - H) / SEG) - 1);
    var r1 = Math.min(Math.ceil(TOP_W / SEG), Math.ceil((cy + GY) / SEG) + 1);
    for (var r = r0; r <= r1; r++) {
      var ya = sy(r * SEG), yb = sy((r + 1) * SEG);
      for (var c = 0; c < 4; c++) {
        var q = [trunkX(c, r), ya, trunkX(c + 1, r), ya, trunkX(c + 1, r + 1), yb, trunkX(c, r + 1), yb];
        poly(q, TRUNK_SHADE[(c + (r % 3 === 0 ? 1 : 0)) % 4], 1, 6);
      }
      game.draw.line(trunkX(0, r), ya, trunkX(4, r), ya, C.seam, 3);
    }
    // 小枝の葉
    for (var t = 0; t < 3; t++) {
      var lw = (3 + t * 7) * RUNG + 60, ly = sy(lw), side = t % 2 === 0 ? 1 : -1;
      if (ly < -120 || ly > H + 120) continue;
      var bx = side > 0 ? TRUNK_X[4] : TRUNK_X[0];
      poly([bx, ly, bx + side * 150, ly - 50, bx + side * 160, ly - 30, bx, ly + 16], C.barkB, 1, 4);
      poly([bx + side * 120, ly - 110, bx + side * 230, ly - 40, bx + side * 110, ly + 10], C.leafA, 1, 5);
      poly([bx + side * 170, ly - 90, bx + side * 260, ly - 10, bx + side * 150, ly + 20], C.leafB, 1, 5);
    }
  }

  var BIRD = [
    ['..yyy..', '.yyyyy.', 'yeyyyyo', '.yyyyy.', '..y.y..'],
    ['..yyy..', '.yyyyy.', 'yeyyyyo', 'wyyyyyw', '..y.y..'],
  ];
  var BIRD_PAL = { y: '#7ac8f0', e: '#14201c', o: '#ff8a3c', w: '#4a8ab0' };

  function drawNest(w, side, seen, k) {
    var y = sy(w);
    if (y < -200 || y > H + 200) return;
    var bx = side < 0 ? TRUNK_X[0] : TRUNK_X[4];
    var cx = side < 0 ? 175 : W - 175;
    poly([bx, y + 40, cx, y + 60, cx, y + 80, bx, y + 70], C.barkB, 1, 4);
    var front = [cx - 62 + jit(k), y - 70, cx + 62 + jit(k + 1), y - 70, cx + 62, y + 70, cx - 62, y + 70];
    poly(front, C.box, 1, 5);
    poly([cx + side * 62, y - 70, cx + side * 86, y - 56, cx + side * 86, y + 80, cx + side * 62, y + 70], C.boxD, 1, 5);
    poly([cx - 80, y - 66, cx + jit(k + 2), y - 140, cx + 80, y - 66], C.roof, 1, 5);
    edge(front, C.seam, 3);
    game.draw.circle(cx, y - 14, 24, C.hole);
    if (seen) {
      var f = Math.floor(game.time.elapsed * 4) % 2;
      game.draw.sprite(BIRD[f], BIRD_PAL, cx + Math.sin(game.time.elapsed * 3 + k) * 6, y - 30, 9, { anchor: 'center', flipX: side > 0 });
    }
  }

  function drawCanopy() {
    var y = sy(GOAL * RUNG + 200);
    if (y > H + 400) return;
    var rows = [[-420, 80, C.leafB], [-300, -60, C.leafA], [0, -170, C.leafC], [300, -60, C.leafA], [420, 80, C.leafB],
                [-160, 160, C.leafA], [160, 160, C.leafB], [0, 40, C.leafA]];
    for (var i = 0; i < rows.length; i++) {
      var cx = W / 2 + rows[i][0], cy = y + rows[i][1];
      poly([cx - 220 + jit(i), cy + 120, cx + jit(i + 2) * 2, cy - 200, cx + 220 + jit(i + 4), cy + 120], rows[i][2], 1, 6);
    }
    drawNest(GOAL * RUNG + 90, -1, height >= GOAL, 9);
  }

  function drawRope() {
    var top = Math.max(0, sy(TOP_W - 140)), bot = Math.min(H, sy(-270));
    if (bot <= top) return;
    game.draw.line(ROPE_X, top, ROPE_X, bot, C.ropeD, 20);
    game.draw.line(ROPE_X - 3, top, ROPE_X - 3, bot, C.rope, 10);
    var cy = camY();
    var off = ((cy % 34) + 34) % 34;
    for (var y = top - 34 + off; y < bot; y += 34) {
      if (y < top) continue;
      game.draw.line(ROPE_X - 9, y, ROPE_X + 9, y + 14, C.ropeD, 3);
    }
  }

  // ---- 庭師(背中向き)。腕は line、体は sprite ----
  var BODY = [
    ['....hhhhh....', '..hhhhhhhhh..', '....kkkkk....', '.....sss.....', '...ccccccc...', '..ccacccacc..', '..ccacccacc..',
     '...caaaaac...', '....ppppp....', '....pp.pp....', '...pp...pp...', '...bb...pp...', '........bb...'],
    ['....hhhhh....', '..hhhhhhhhh..', '....kkkkk....', '.....sss.....', '...ccccccc...', '..ccacccacc..', '..ccacccacc..',
     '...caaaaac...', '....ppppp....', '....pp.pp....', '...pp...pp...', '...pp...bb...', '...bb........'],
    ['....hhhhh....', '..hhhhhhhhh..', '....kkkkk....', '.....sss.....', '...ccccccc...', '..ccacccacc..', '..ccacccacc..',
     '...caaaaac...', '....ppppp....', '...pp...pp...', '..pp.....pp..', '.bb.......bb.', '.............'],
  ];
  var BODY_PAL = { h: '#e8c860', k: '#5a3a24', s: '#e0a878', c: '#d8643c', a: '#2e6a3a', p: '#3c4a6a', b: '#3a2618' };

  function drawGardener() {
    var t = game.time.elapsed;
    var ph = running ? beatT / SPB : (t * 2) % 1;
    var bob = Math.sin(ph * Math.PI) * 6;
    var drop = slipT > 0 ? 34 * (slipT / 0.45) : 0;
    var bx = ROPE_X + (slipT > 0 ? Math.sin(slipT * 40) * 8 : 0), by = GY + 175 + bob + drop;
    var r = reachT > 0 ? reachT / 0.12 : 0;
    var hands = [null, null];
    hands[handUp] = { x: ROPE_X + (handUp ? 14 : -14), y: GY - 40 + r * 100 };
    hands[1 - handUp] = { x: ROPE_X + (handUp ? -14 : 14), y: GY + 60 + bob };
    if (slipT > 0) hands[slipHand] = { x: ROPE_X + (slipHand ? 90 : -90), y: GY - 60 + Math.sin(slipT * 50) * 20 };
    var fr = slipT > 0 ? 2 : (handUp === 0 ? 0 : 1);
    game.draw.circle(bx, by + 40, 96, C.ink, 0.18);
    game.draw.sprite(BODY[fr], BODY_PAL, bx, by, 15, { anchor: 'center' });
    var sh = [{ x: bx - 60, y: by - 34 }, { x: bx + 60, y: by - 34 }];
    for (var s = 0; s < 2; s++) {
      var hd = hands[s];
      var elbow = { x: (sh[s].x + hd.x) / 2 + (s ? 26 : -26), y: (sh[s].y + hd.y) / 2 };
      game.draw.line(sh[s].x, sh[s].y, elbow.x, elbow.y, C.ink, 30);
      game.draw.line(elbow.x, elbow.y, hd.x, hd.y, C.ink, 30);
      game.draw.line(sh[s].x, sh[s].y, elbow.x, elbow.y, BODY_PAL.c, 20);
      game.draw.line(elbow.x, elbow.y, hd.x, hd.y, BODY_PAL.c, 20);
      var big = hitStop > 0 && s === slipHand ? 1.8 : 1;
      var gp = [hd.x, hd.y - 22 * big, hd.x + 20 * big, hd.y, hd.x, hd.y + 22 * big, hd.x - 20 * big, hd.y];
      poly(gp, hitStop > 0 && s === slipHand ? C.white : C.glove, 1, 3);
      edge(gp, C.seam, 3);
    }
  }

  // ---- 親指ゾーン(左右パッド)と拍ランプ ----
  function guideOn(b) {
    var j = b - LEAD;
    if (j < 0 || b > LAST) return false;
    if (j < 8) return true;
    if (j < 14) return b % BAR === 0;
    return false;
  }

  function drawPads() {
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.ink, 0.55);
    var nb = Math.floor(songT / SPB + 0.5);
    if (songT - nb * SPB > -0.02 && res[nb] !== 0) nb++;
    if (!running) nb = -1;
    for (var s = 0; s < 2; s++) {
      var p = PADS[s];
      var lit = padFlash[s] > 0;
      var guide = nb >= LEAD && guideOn(nb) && handFor(nb) === s;
      var depth = lit ? 4 : 14;
      poly(hexPts(p.x, p.y + 14, 210, 150, s * 7), C.padB, 1, 6);
      var top = hexPts(p.x, p.y + 14 - depth, 210, 150, s * 7 + 20);
      var pulse = guide ? 0.5 + 0.5 * Math.sin(game.time.elapsed * 14) : 0;
      poly(top, lit ? C.padLit : C.padA, 1, 6);
      if (guide) poly(top, C.gold, 0.25 + pulse * 0.3, 6);
      edge(top, lit ? C.white : C.ink, 4);
      // 手袋アイコン(左右で親指の向きが逆)
      var gx = p.x, gy = p.y - depth + 10, m = s ? 1 : -1;
      poly([gx - 60, gy + 60, gx - 60, gy - 30, gx + 60, gy - 30, gx + 60, gy + 60], C.glove, 1, 4);
      for (var f = 0; f < 4; f++) poly([gx - 58 + f * 30, gy - 30, gx - 58 + f * 30, gy - 96 + Math.abs(f - 1.5) * 12, gx - 34 + f * 30, gy - 96 + Math.abs(f - 1.5) * 12, gx - 34 + f * 30, gy - 30], C.glove, 1, 4);
      poly([gx + m * 60, gy + 10, gx + m * 104, gy - 34, gx + m * 116, gy - 16, gx + m * 60, gy + 40], C.glove, 1, 4);
      edge([gx - 60, gy + 60, gx - 60, gy - 30, gx + 60, gy - 30, gx + 60, gy + 60], C.seam, 3);
      // 拍が近づくと縮む予告リング
      if (guide) {
        var tt = nb * SPB - songT;
        if (tt > 0 && tt < SPB) {
          var k = 1 + (tt / SPB) * 0.7;
          edge(hexPts(p.x, p.y - depth, 210 * k, 150 * k, 40 + s), C.gold, 6);
        }
      }
    }
  }

  function drawBeatLamps() {
    var pos = ((beatN % BAR) + BAR) % BAR;
    for (var i = 0; i < BAR; i++) {
      var x = W / 2 - 225 + i * 150, y = H * 0.735, r = i === 0 ? 34 : 24;
      var on = running && i === pos ? Math.max(0, 1 - beatT / (SPB * 0.7)) : 0;
      var d = [x, y - r - 6, x + r + 6, y, x, y + r + 6, x - r - 6, y];
      poly(d, C.ink, 0.6, 3);
      var d2 = [x, y - r, x + r, y, x, y + r, x - r, y];
      poly(d2, i === 0 ? C.hot : C.rope, 0.3 + on * 0.7, 3);
      if (on > 0.5) edge(d2, C.white, 3);
    }
  }

  function drawScene() {
    drawSky();
    drawTrunk();
    for (var i = 0; i < NESTS.length; i++) drawNest(NESTS[i] * RUNG + 40, i % 2 === 0 ? -1 : 1, nestSeen[i], i * 3);
    drawGround();
    drawRope();
    drawCanopy();
    drawGardener();
    drawBeatLamps();
    drawPads();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.8);
    label('SCORE ' + score, 60, 92, 52, C.white, 'left');
    label('BEST ' + prevBest, 60, 170, 30, C.rope, 'left');
    label(height + ' / ' + GOAL, W - 60, 92, 58, C.gold, 'right');
    for (var i = 0; i < MAX_MISS; i++) {
      var x = W - 300 + i * 70, y = 165;
      var d = [x, y - 18, x + 18, y, x, y + 18, x - 18, y];
      poly(d, i < misses ? C.bad : C.padB, 1, 3);
    }
    var progress = Math.min(1, height / GOAL);
    game.draw.rect(0, 222, W, 8, '#000000');
    game.draw.rect(0, 222, W * progress, 8, C.leafC);
  }

  // ---- ATTRACT: 実ロジックで交互に綱をつかみ、途中で1回だけ同じ手を出してMISS ----
  var demo = { t: 0, x: PADS[0].x, y: PADS[0].y, press: 0 };
  var DEMO_BEATS = LEAD + 12;
  var DEMO_WRONG = LEAD + 7;
  function demoSide(b) { return b === DEMO_WRONG ? handFor(b - 1) : handFor(b); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB + 0.6);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = 0; }
    var prev = songT;
    stepClock(dt);
    var nb = Math.floor(songT / SPB) + 1;
    var side = nb >= LEAD ? demoSide(nb) : 0;
    demo.x += (PADS[side].x - demo.x) * Math.min(1, dt * 10);
    demo.y += (PADS[side].y - 10 - demo.y) * Math.min(1, dt * 10);
    for (var b = LEAD; b < DEMO_BEATS; b++) {
      if (prev < b * SPB && songT >= b * SPB) { grab(demoSide(b)); demo.press = 0.14; demo.x = PADS[demoSide(b)].x; }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  function settleHeight(dt) {
    if (hitStop > 0) return;
    dispH += (height - dispH) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) if (padFlash[s] > 0) padFlash[s] -= dt;
    if (reachT > 0) reachT -= dt;
    if (slipT > 0) slipT -= dt;
    if (hitStop > 0) hitStop -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      settleHeight(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 196, 36, C.rope);
      game.draw.rect(0, H * 0.6, W, 110, C.ink, 0.55);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.6 + 74, 54, C.gold);
      else label('TAP TO START', W / 2, H * 0.6 + 72, 48, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.24, W, H * 0.36, C.ink, 0.86);
      label(won ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.31, 100, won ? C.gold : C.bad);
      label('SCORE ' + score, W / 2, H * 0.37, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 36, C.rope);
      label('COMBO ' + maxCombo + '   ' + height + ' / ' + GOAL, W / 2, H * 0.455, 36, C.leafC);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.505, 52, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.505, 40, C.rope);
      if (!won) label('あと' + Math.max(1, GOAL - height) + '手!', W / 2, H * 0.205, 60, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 38, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (!won) dispH = Math.max(0, dispH - dt * 10);   // 綱を滑り降りて地面へ
      else settleHeight(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, grabs: height, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) { startClock(); startSong(false); }
      } else {
        stepClock(dt);
      }
      settleHeight(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.36, 110, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
