// K-DS-0045v2-highland-inn-flour-rub.js
// 高原の宿の粉まぶし — 2拍ごとに粉の上へ跳び乗ってくる野菜に、着地の拍の頭で指を置き、乗っている2拍のあいだ往復にこすって粉をまとわせる。いが栗はこすらない
// 操作: 粉の台(大きな丸)の上で操作する。野菜は左の棚で待ち、拍の頭ちょうどに粉の台へ跳び乗る(台のまわりの点の輪が縮んで閉じる瞬間)。その瞬間に指を置き(拍の頭からのずれでPERFECT/GOOD)、そのまま左右に往復してこする。白く粉が回りきると光る。2拍後に右のかごへ跳んでいくので、次の着地の前に指を離して置き直す。着地で指を置けない・粉が半分も付かないままかごへ行く はMISS。赤いとげの いが栗は0.7秒前から赤い点滅と警告音で予告され、台に乗っている間にこすると MISS(触らなければNICE)
// 終わり: 11個(野菜8個+いが栗3個、小→中→大と粉の要る量が増える、112BPM・24拍・約13秒)を流し終えてMISS 2回以内ならCLEAR(判定の点+粉が回りきった数のボーナス)。MISS 3回でGAME OVER
// @mechanic: rub
// @theme: highland_inn_flour_dusting
// 世界観: 高原の民宿の台所で、宿の娘が、2拍ごとに粉の台へ跳び乗ってくる夕飯の天ぷら用の野菜に拍の頭で指を置き、こすって粉をまとわせては隣のかごへ送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・粉をまとわせた数・PERFECT/GOOD/MISS数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var STYLE = { bg: ['#fdf8f0', '#f1e4d2'], main: ['#ff9a3c', '#9a64d8', '#6cc060'], accent: ['#e8483c', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白に近い淡い背景、単色の丸い塊、真下に柔らかい影(薄い円の重ね)。当たり判定は見た目の丸そのもの
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    pumpkin: STYLE.main[0], eggplant: STYLE.main[1], zucchini: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1],
    ink: '#4a3a34', soft: '#b8a898', board: '#efd3a8', boardDk: '#d9b682', flour: '#fffdf6',
    sky: '#cfe8f6', hill1: '#a8d8b0', hill2: '#8cc4a0', gold: '#ffbf3c', good: '#4ac07a', potato: '#d8a070'
  };
  var VEG = [C.pumpkin, C.eggplant, C.zucchini, C.potato];

  var GAME_TITLE = 'FLOUR RUB';
  var BPM = 112;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.15;
  var MISS_MAX = 3;
  var SEQ = ['S', 'S', 'M', 'B', 'M', 'L', 'M', 'B', 'L', 'B', 'L'];
  var DEMO_SEQ = ['S', 'M', 'B', 'M', 'B'];
  var VEG_TOTAL = 8;                  // 野菜の数(いが栗を除く)
  var FIRST_LAND = 2;                  // 前奏2拍のあと、2拍ごとに着地
  var NEED = { S: 650, M: 900, L: 1150 };
  var RAD = { S: 62, M: 78, L: 94, B: 72 };
  var TIME_LIMIT = 13;                 // 2 + 11×2 = 24拍 ≒ 12.9秒
  var PLATE_X = 540, PLATE_Y = Math.round(H * 0.645), PLATE_R = 300;
  var WAIT_X = 180, WAIT_Y = 800, EXIT_X = 900, EXIT_Y = 800;
  var HOP = 0.22;
  var DOT_Y = Math.round(H * 0.88);

  // 宿の台所の歌(オリジナル)。2小節ぶんを拍クロックから1小節ずつ鳴らす
  var MEL = [
    [['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1]],
    [['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 0.5], ['G4', 0.5], ['G4', 1]]
  ];
  var BASS = [
    [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]],
    [['C3', 1], ['G2', 1], ['D3', 1], ['G2', 1]]
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, animT, beatPulse;
  var items, pressing, lastX, lastY, dirX, strokeLen, rubPulse, flashItem;
  var score, perfects, goods, misses, coated, fulls, nices, over, won, outroT, prevBest, milestone;
  animT = 0;

  function ri(n) { return Math.floor(game.random(0, n)) % n; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; beatPulse = 0; rubPulse = 0; flashItem = null;
    pressing = false; lastX = 0; lastY = 0; dirX = 0; strokeLen = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; coated = 0; fulls = 0; nices = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    var seq = isDemo ? DEMO_SEQ : SEQ;
    items = [];
    for (var k = 0; k < seq.length; k++) {
      items.push({ kind: seq[k], land: FIRST_LAND + k * 2, col: VEG[ri(4)], onset: 0, dist: 0, coat: 0, full: false, missed: false, resolved: false, burrRub: 0, warn: 0, shake: 0 });
    }
    if (isDemo) startClock();
  }
  function totalBeats() { return FIRST_LAND + items.length * 2; }
  function landT(it) { return it.land * SPB; }
  function leaveT(it) { return (it.land + 2) * SPB; }

  // ---- 拍クロック(1本だけ) ----
  function startClock() { running = true; beatN = 0; beatT = 0; songT = 0; onBeat(0); }
  function stepClock(dt) {
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
  }
  function onBeat(b) {
    if (b > totalBeats()) return;
    var vol = demoMode ? 0.5 : 1;
    beatPulse = 0.15;
    game.audio.tone(b % 4 === 0 ? 1180 : 880, 0.03, { wave: 'triangle', volume: (b % 4 === 0 ? 0.07 : 0.045) * vol });
    if (b % 4 === 0 && b < totalBeats()) {
      var k = Math.floor(b / 4) % 2;
      game.audio.melody(MEL[k], { tempo: BPM, wave: 'triangle', volume: 0.05 * vol, bass: BASS[k], bassWave: 'sine', bassVolume: 0.1 * vol });
    }
    for (var i = 0; i < items.length; i++) {
      if (items[i].land === b) game.audio.tone(items[i].kind === 'B' ? 240 : 420, 0.07, { wave: 'sine', volume: 0.12 * vol, slide: -140 });
    }
  }

  function itemOnPlate() {
    for (var i = 0; i < items.length; i++) if (songT >= landT(items[i]) && songT < leaveT(items[i])) return items[i];
    return null;
  }
  function activeItem() {
    var a = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind !== 'B' && it.onset && !it.missed && songT < leaveT(it)) a = it;
    }
    return a;
  }

  function missItem(it, x, y) {
    if (it) it.missed = true;
    misses++;
    hitStop = 0.42; flashItem = it;
    if (it) it.shake = 0.42;
    game.feedback.bad(x, y - 140, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function resolve(it) {
    it.resolved = true;
    if (it.kind === 'B') {
      if (!it.missed) {
        nices++; score += 80;
        game.fx.popup('NICE', EXIT_X - 40, EXIT_Y - 170, { color: C.good, size: 56 });
        game.audio.tone('E6', 0.08, { wave: 'triangle', volume: 0.08 });
      }
      return;
    }
    if (it.missed) return;
    if (it.coat < 0.5) { missItem(it, EXIT_X, EXIT_Y); return; }
    coated++;
    score += Math.round(it.coat * 40);
    if (!demoMode && coated === 4 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('4 / ' + VEG_TOTAL, W / 2, H * 0.3, { color: C.gold, size: 80 });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    stepClock(dt);
    if (beatPulse > 0) beatPulse -= dt;
    if (rubPulse > 0) rubPulse -= dt;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.shake > 0) it.shake -= dt;
      // いが栗の予告(着地の0.7秒前と0.45秒前に警告音)
      if (it.kind === 'B') {
        var lead = landT(it) - songT;
        if (it.warn === 0 && lead <= 0.7) { it.warn = 1; game.audio.tone(988, 0.06, { wave: 'square', volume: demoMode ? 0.03 : 0.06 }); }
        if (it.warn === 1 && lead <= 0.45) { it.warn = 2; game.audio.tone(988, 0.06, { wave: 'square', volume: demoMode ? 0.03 : 0.06 }); }
      } else if (!it.onset && !it.missed && songT > landT(it) + GOOD_W) {
        missItem(it, PLATE_X, PLATE_Y);
      }
      if (!it.resolved && songT >= leaveT(it)) resolve(it);
      if (over) return;
    }
    if (!demoMode && !over && (songT >= totalBeats() * SPB || songT > TIME_LIMIT)) finish(misses < MISS_MAX);
  }

  function inZone(x, y) { return Math.hypot(x - PLATE_X, y - PLATE_Y) <= PLATE_R + 60; }

  function grade(d, x, y) {
    if (Math.abs(d) <= PERFECT_W) {
      perfects++; score += 100;
      game.feedback.good(x, y, { text: 'PERFECT', color: C.gold, size: 54, count: 10, volume: 0.22, sound: 'se_good' });
      return 2;
    }
    goods++; score += 60;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good, size: 46, count: 6, volume: 0.18, sound: 'se_good' });
    return 1;
  }

  // 指を置く(入力とデモで共通)
  function pressAt(x, y) {
    if (!running || over) return 'none';
    if (!inZone(x, y)) return 'none';
    pressing = true; lastX = x; lastY = y; dirX = 0; strokeLen = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind === 'B' || it.onset || it.missed) continue;
      var d = songT - landT(it);
      if (Math.abs(d) <= GOOD_W) { it.onset = grade(d, PLATE_X, PLATE_Y - RAD[it.kind] - 90); return 'ok'; }
    }
    return 'cont';
  }
  function releaseAt() { pressing = false; }

  // こする(入力とデモで共通)
  function rubMove(x, y) {
    if (!pressing || !running || over) return;
    var dx = x - lastX;
    var d = Math.hypot(dx, y - lastY);
    lastX = x; lastY = y;
    if (!inZone(x, y) || d > 260 || d < 1) return;
    var p = itemOnPlate();
    if (p && p.kind === 'B' && !p.missed) {
      p.burrRub += d;
      if (p.burrRub > 90) missItem(p, PLATE_X, PLATE_Y);
      return;
    }
    var a = activeItem();
    if (a) {
      a.dist += d;
      a.coat = Math.min(1, a.dist / NEED[a.kind]);
      if (!a.full && a.coat >= 1) {
        a.full = true; fulls++; score += 60;
        game.audio.play('se_powerup', 0.3);
        game.fx.burst(PLATE_X, PLATE_Y, { color: C.white, count: 18, speed: 380 });
      }
    }
    if (dx * dirX < 0 && strokeLen > 40) {
      strokeLen = 0; rubPulse = 0.1;
      game.audio.tone(1900 + ri(5) * 120, 0.03, { wave: 'sawtooth', volume: a ? 0.025 : 0.012 });
      if (a) game.fx.burst(x, y, { color: C.flour, count: 4, speed: 160 });
    }
    if (dx !== 0) dirX = dx > 0 ? 1 : -1;
    strokeLen += Math.abs(dx);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false; pressing = false;
    if (ok) {
      score += fulls * 30 + (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(180, 900), game.random(700, 1300), { color: i % 2 ? C.gold : C.white, count: 22, speed: 440 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || readyT > 0) return;
    var res = pressAt(x, y);
    if (res === 'none') game.audio.play('se_tap', 0.15);
    else if (res === 'cont') game.audio.tone(520, 0.03, { wave: 'sine', volume: 0.05 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    rubMove(x, y);
    if (rubPulse > 0.09) game.fx.burst(x, y, { color: C.flour, count: 1, speed: 60 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    releaseAt();
    game.audio.tone(360, 0.03, { wave: 'sine', volume: 0.04 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y + 5, { size: sz, color: '#d6c4ae', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var GIRL = [
    [
      '...rrrrrr...',
      '..rrrrrrrr..',
      '.rrkkkkkkrr.',
      '..kssssssk..',
      '..skssssks..',
      '..ssssssss..',
      '...sspmss...',
      '....aaaa....',
      '..aaaaaaaa..',
      '.saawwwwaas.',
      '.s.awwwwa.s.',
      '...awwwwa...'
    ],
    [
      '...rrrrrr...',
      '..rrrrrrrr..',
      '.rrkkkkkkrr.',
      '..kssssssk..',
      '..sbssssbs..',
      '..ssssssss..',
      '...ssmmss...',
      's...aaaa...s',
      '.s.aaaaaa.s.',
      '..aawwwwaa..',
      '...awwwwa...',
      '...awwwwa...'
    ]
  ];
  var GPAL = { r: '#ff7a6a', k: '#5a3a2a', s: '#ffd8b8', b: '#c89878', p: '#ff9a9a', m: '#c0504a', a: '#7ab8e8', w: '#ffffff' };

  function softShadow(x, y, r) {
    for (var i = -2; i <= 2; i++) game.draw.circle(x + i * r * 0.3, y, r * 0.42, '#000000', 0.05);
  }

  function blob(x, y, r, col, coat, fl, sq) {
    var ry = r * (sq || 1);
    softShadow(x, y + r * 0.95, r);
    game.draw.circle(x, y, ry, fl ? C.white : col);
    game.draw.circle(x + r * 0.1, y + r * 0.16, ry * 0.86, '#000000', 0.08);
    game.draw.circle(x - r * 0.32, y - r * 0.36, r * 0.32, C.white, 0.5);
    if (coat > 0) {
      game.draw.circle(x, y, ry * 1.02, C.flour, Math.min(0.85, coat * 0.85));
      for (var k = 0; k < Math.floor(coat * 8); k++) {
        var a = k * 2.4;
        game.draw.circle(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.55, r * 0.08, C.white);
      }
    }
    game.draw.circle(x - r * 0.28, y - r * 0.02, r * 0.1, C.ink);
    game.draw.circle(x + r * 0.28, y - r * 0.02, r * 0.1, C.ink);
    game.draw.circle(x - r * 0.46, y + r * 0.2, r * 0.1, '#ff8a8a', 0.5);
    game.draw.circle(x + r * 0.46, y + r * 0.2, r * 0.1, '#ff8a8a', 0.5);
    game.draw.circle(x, y - ry - 4, r * 0.14, '#5a8a3a');
  }

  function burr(x, y, r, fl, warn) {
    softShadow(x, y + r * 0.95, r);
    for (var k = 0; k < 14; k++) {
      var a = k / 14 * Math.PI * 2 + animT * 0.5;
      game.draw.line(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a) * r * 1.32, y + Math.sin(a) * r * 1.32, fl ? C.white : '#b83028', 8);
    }
    game.draw.circle(x, y, r, fl ? C.white : C.red);
    game.draw.circle(x - r * 0.3, y - r * 0.34, r * 0.3, C.white, 0.45);
    game.draw.line(x - r * 0.45, y - r * 0.3, x - r * 0.12, y - r * 0.15, C.ink, 7);
    game.draw.line(x + r * 0.45, y - r * 0.3, x + r * 0.12, y - r * 0.15, C.ink, 7);
    game.draw.circle(x - r * 0.26, y + r * 0.02, r * 0.09, C.ink);
    game.draw.circle(x + r * 0.26, y + r * 0.02, r * 0.09, C.ink);
    if (warn) for (var j = 0; j < 16; j++) {
      var b = j / 16 * Math.PI * 2;
      game.draw.circle(x + Math.cos(b) * r * 1.7, y + Math.sin(b) * r * 1.7, 9, C.red, 0.8);
    }
  }

  function itemPos(it) {
    var t = songT, L = landT(it), Lv = leaveT(it);
    var inS = L - 2 * SPB - 0.35;
    if (t < inS) return null;
    if (t < L - 2 * SPB) { var k0 = (t - inS) / 0.35; return { x: -140 + (WAIT_X + 140) * k0, y: WAIT_Y, sq: 1 }; }
    if (t < L - HOP) return { x: WAIT_X, y: WAIT_Y, sq: 1 };
    if (t < L) { var k1 = (t - (L - HOP)) / HOP; return { x: WAIT_X + (PLATE_X - WAIT_X) * k1, y: WAIT_Y + (PLATE_Y - WAIT_Y) * k1 - Math.sin(k1 * Math.PI) * 220, sq: 1 }; }
    if (t < L + 0.1) return { x: PLATE_X, y: PLATE_Y + 10, sq: 0.82 };
    if (t < Lv - HOP) return { x: PLATE_X, y: PLATE_Y, sq: 1 };
    if (t < Lv) { var k2 = (t - (Lv - HOP)) / HOP; return { x: PLATE_X + (EXIT_X - PLATE_X) * k2, y: PLATE_Y + (EXIT_Y - PLATE_Y) * k2 - Math.sin(k2 * Math.PI) * 220, sq: 1 }; }
    return null;
  }

  function drawKitchen() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // 窓の外の高原(なだらかな丘)
    game.draw.gradient(250, 600, [[0, C.sky], [1, '#e8f4fb']]);
    game.draw.circle(260, 720, 300, C.hill1);
    game.draw.circle(760, 760, 380, C.hill2);
    game.draw.circle(900, 330, 50, '#fff6d0');
    for (var m = 1; m < 4; m++) game.draw.rect(m * 270 - 8, 250, 16, 350, C.white);
    // 宿の娘(調理台の向こう)
    var rubbing = pressing && !!activeItem();
    var fr = rubbing && rubPulse > 0 ? 1 : (beatPulse > 0.08 ? 1 : 0);
    game.draw.sprite(GIRL[fr], GPAL, W / 2, 500 + Math.sin(animT * 3) * 4 - (beatPulse > 0 ? 6 : 0), 14, { anchor: 'center' });
    // 調理台
    game.draw.rect(0, 600, W, H - 600, '#f6e6cc');
    game.draw.rect(0, 600, W, 14, C.white, 0.8);
    game.draw.rect(0, 614, W, 8, '#000000', 0.05);
    // 待ちの棚と送り先のかご
    softShadow(WAIT_X, WAIT_Y + 80, 130);
    game.draw.circle(WAIT_X, WAIT_Y + 40, 120, '#ead8bc');
    game.draw.circle(WAIT_X, WAIT_Y + 30, 112, '#f8ecd8');
    softShadow(EXIT_X, EXIT_Y + 90, 150);
    game.draw.circle(EXIT_X, EXIT_Y + 40, 140, '#e0b070');
    game.draw.circle(EXIT_X, EXIT_Y + 20, 120, '#c8904c');
    for (var p = 0; p < Math.min(coated, VEG_TOTAL); p++) {
      game.draw.circle(EXIT_X - 70 + (p % 4) * 46, EXIT_Y + 30 - Math.floor(p / 4) * 34, 26, C.flour);
    }
  }

  function drawPlate() {
    softShadow(PLATE_X, PLATE_Y + PLATE_R * 0.92, PLATE_R * 0.9);
    game.draw.circle(PLATE_X, PLATE_Y + 14, PLATE_R, C.boardDk);
    game.draw.circle(PLATE_X, PLATE_Y, PLATE_R, C.board);
    game.draw.circle(PLATE_X - 70, PLATE_Y - 90, PLATE_R * 0.5, C.white, 0.18);
    game.draw.circle(PLATE_X, PLATE_Y, 220, C.flour, 0.9);
    game.draw.circle(PLATE_X, PLATE_Y, 180, C.white);
    for (var k = 0; k < 18; k++) {
      var a = k * 0.35 + 0.3;
      game.draw.circle(PLATE_X + Math.cos(a) * (230 + (k % 3) * 18), PLATE_Y + Math.sin(a) * (230 + (k % 3) * 18), 7, C.white, 0.8);
    }
    // 次の着地までの縮む点の輪(閉じた瞬間が拍の頭)
    var nxt = null;
    for (var i = 0; i < items.length; i++) if (landT(items[i]) > songT - 0.05) { nxt = items[i]; break; }
    if (running && nxt) {
      var lead = landT(nxt) - songT;
      if (lead < SPB * 1.6) {
        var rr = RAD[nxt.kind] + 20 + Math.max(0, lead) / (SPB * 1.6) * 220;
        var col = nxt.kind === 'B' ? C.red : C.gold;
        for (var j = 0; j < 24; j++) {
          var b = j / 24 * Math.PI * 2;
          game.draw.circle(PLATE_X + Math.cos(b) * rr, PLATE_Y + Math.sin(b) * rr, lead < 0.06 ? 13 : 9, col, 0.85);
        }
      }
    }
    if (pressing && rubPulse > 0) game.draw.circle(PLATE_X, PLATE_Y, PLATE_R + 20, C.white, 0.25);
  }

  function drawItems() {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      var p = itemPos(it);
      if (!p) continue;
      var sh = it.shake > 0 ? Math.sin(it.shake * 80) * 12 : 0;
      var fl = hitStop > 0 && flashItem === it;
      var r = RAD[it.kind] * (fl ? 1.15 : 1);
      if (it.kind === 'B') {
        var lead = landT(it) - songT;
        var warn = lead > 0 && lead <= 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0;
        burr(p.x + sh, p.y, r, fl, warn);
      } else {
        blob(p.x + sh, p.y, r, it.col, it.coat, fl, p.sq);
        if (it.full && Math.floor(game.time.elapsed * 8) % 2 === 0) game.draw.circle(p.x, p.y - r - 40, 12, C.gold);
      }
    }
  }

  function drawDots() {
    var bInBar = running ? beatN % 4 : -1;
    for (var k = 0; k < 4; k++) {
      var x = W / 2 - 240 + k * 160;
      var big = k % 2 === 0;
      softShadow(x, DOT_Y + 34, 40);
      game.draw.circle(x, DOT_Y, big ? 34 : 24, k === bInBar ? C.gold : '#e6d6c0');
      game.draw.circle(x - 8, DOT_Y - 10, big ? 10 : 7, C.white, 0.7);
    }
  }

  function drawScene() {
    drawKitchen();
    drawPlate();
    drawItems();
    drawDots();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white, 0.92);
    label('SCORE ' + score, 60, 90, 50, C.ink, 'left');
    label('BEST ' + prevBest, 60, 165, 32, C.soft, 'left');
    label(coated + ' / ' + VEG_TOTAL, W - 60, 90, 54, C.ink, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 220 + i * 66, 168, 22, i < misses ? C.red : '#e6d6c0');
    var prog = Math.min(1, songT / (totalBeats() * SPB));
    game.draw.rect(60, 210, W - 120, 12, '#ece0d0');
    game.draw.rect(60, 210, (W - 120) * prog, 12, C.gold);
  }

  // ---- ATTRACT: 実ロジックで野菜は着地の拍に指を置いてこすり、1つ目のいが栗は触らずNICE、2つ目のいが栗はこすってMISS ----
  var demo = { t: 0, hx: W / 2, hy: H * 0.8, press: false, phase: 0, liftT: 0 };
  var DEMO_LEN = (FIRST_LAND + DEMO_SEQ.length * 2) * SPB + 0.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.liftT = 0; demo.hx = PLATE_X + 300; demo.hy = PLATE_Y + 330; }
    stepPlay(dt);
    if (pressing) {
      demo.phase += dt * Math.PI * 2 * (1.6 / SPB);
      demo.hx = PLATE_X + Math.sin(demo.phase) * 150;
      demo.hy = PLATE_Y + 30;
      rubMove(demo.hx, demo.hy);
      if (songT >= demo.liftT) releaseAt();
    } else {
      var nxt = null;
      for (var i = 0; i < items.length; i++) if (landT(items[i]) > songT - 0.03) { nxt = items[i]; break; }
      var tx = PLATE_X + 300, ty = PLATE_Y + 330;
      if (nxt && nxt.kind !== 'B' && landT(nxt) - songT < 0.5) { tx = PLATE_X; ty = PLATE_Y + 30; }
      if (nxt && nxt === items[4] && landT(nxt) - songT < 0.5) { tx = PLATE_X; ty = PLATE_Y + 30; }
      demo.hx += (tx - demo.hx) * Math.min(1, dt * 9);
      demo.hy += (ty - demo.hy) * Math.min(1, dt * 9);
      if (nxt && songT >= landT(nxt) && (nxt.kind !== 'B' || nxt === items[4])) {
        pressAt(PLATE_X, PLATE_Y + 30);
        demo.phase = 0; demo.hx = PLATE_X; demo.hy = PLATE_Y + 30;
        demo.liftT = landT(nxt) + (nxt.kind === 'B' ? 0.6 : 1.55 * SPB);
      }
    }
    demo.press = pressing;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    else animT += dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.white, 0.92);
      label(GAME_TITLE, W / 2, 104 + Math.sin(t * 3) * 3, 88, C.pumpkin);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.red);
      else label('TAP TO START', W / 2, H * 0.955, 44, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(60, H * 0.26, W - 120, H * 0.33, C.white, 0.95);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.good : C.red);
      label('SCORE ' + score, W / 2, H * 0.385, 58, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.43, 34, C.soft);
      label(coated + ' / ' + VEG_TOTAL, W / 2, H * 0.475, 46, C.ink);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 52, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 40, C.soft);
      if (!won) label('あと' + Math.max(1, VEG_TOTAL - coated) + '個!', W / 2, H * 0.225, 60, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, coated: coated, fullCoat: fulls, perfect: perfects, good: goods, miss: misses, nice: nices };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.pumpkin);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.pumpkin);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
