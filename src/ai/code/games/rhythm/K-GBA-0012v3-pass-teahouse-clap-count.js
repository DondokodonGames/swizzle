// K-GBA-0012v3-pass-teahouse-clap-count.js
// 峠の茶屋の返し手拍子 — 旅人が1小節で打った手拍子の数を覚え、次の小節で同じ数ぴったりを拍の頭に打ち返す。途中で拍型が4分から8分へ切り替わる
// 操作: 1回は2小節。1小節目は旅人が手拍子を打つ(数は画面に残らないので耳と目で数える)。2小節目で画面のどこでも叩くと看板娘が手拍子を返し、盆に湯のみが1つ並ぶ。叩くたびに一番近い拍の頭(前半は4分、後半は8分)からのずれでPERFECT/GOOD。ずれすぎ・同じ拍の二度打ち・数の打ちすぎはその場でMISS、小節の終わりで足りなくてもMISS
// 終わり: 4回(3回→2回→切り替わり後5回→6回)を通して MISS 2回以内ならCLEAR(判定の点+数ぴったりボーナス)。MISS 3回でGAME OVER
// @mechanic: count_exact
// @theme: mountain_pass_clap_teahouse
// 世界観: 峠の茶屋の軒先で、看板娘が縁台に腰かけた旅人の打った手拍子を聞き取り、同じ数だけ手拍子を打ち返してもてなす。途中で旅人の拍子が4分から細かい8分へ変わる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・数を合わせた回数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ。黒地に細い線、テキスト枠のウィンドウUI、市松ディザで中間色
  var STYLE = { bg: ['#000000', '#0000ff', '#00ffff'], main: ['#ffffff', '#ffff00', '#ff0000'], accent: ['#ff00ff', '#00ff00'] };
  var C = {
    black: STYLE.bg[0], blue: STYLE.bg[1], cyan: STYLE.bg[2],
    white: STYLE.main[0], yellow: STYLE.main[1], red: STYLE.main[2],
    magenta: STYLE.accent[0], green: STYLE.accent[1],
  };

  var GAME_TITLE = 'CLAP BACK';
  var BPM = 120;
  var SPB = 60 / BPM;
  var MISS_MAX = 3;
  var TIME_LIMIT = 18;
  // 小節の並び: お手本→返し ×2、切り替わりの1小節、お手本→返し ×2
  var BARS = [
    { kind: 'call', r: 0 }, { kind: 'resp', r: 0 }, { kind: 'call', r: 1 }, { kind: 'resp', r: 1 },
    { kind: 'switch', r: -1 },
    { kind: 'call', r: 2 }, { kind: 'resp', r: 2 }, { kind: 'call', r: 3 }, { kind: 'resp', r: 3 },
  ];
  var SWITCH_BAR = 4;
  var ROUND_POOLS = [
    { grid: 4, pool: [[0, 1, 3], [0, 2, 3], [0, 1, 2]] },
    { grid: 4, pool: [[0, 2], [1, 3], [0, 3]] },
    { grid: 8, pool: [[0, 1, 2, 4, 6], [0, 2, 3, 4, 6], [0, 2, 4, 5, 6]] },
    { grid: 8, pool: [[0, 1, 3, 4, 5, 7], [0, 2, 3, 5, 6, 7], [0, 1, 2, 4, 5, 6]] },
  ];
  var CALL_BAR = [0, 2, 5, 7], RESP_BAR = [1, 3, 6, 8];

  // 前半(4分のゆったり)と後半(8分で跳ねる)の2曲。どちらもオリジナル、2小節で1周
  var SONG_A = [['G4', 1], ['A4', 1], ['C5', 1], ['A4', 1], ['D5', 1], ['C5', 1], ['A4', 2]];
  var BASS_A = [['C3', 2], ['G2', 2], ['A2', 2], ['G2', 2]];
  var SONG_B = [
    ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
    ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
  ];
  var BASS_B = [
    ['C3', 0.5], ['C3', 0.5], ['G2', 0.5], ['G2', 0.5], ['A2', 0.5], ['A2', 0.5], ['G2', 0.5], ['G2', 0.5],
    ['F2', 0.5], ['F2', 0.5], ['C3', 0.5], ['C3', 0.5], ['G2', 0.5], ['G2', 0.5], ['C3', 0.5], ['C3', 0.5],
  ];
  function startSong(partB) {
    if (partB) game.audio.melody(SONG_B, { tempo: BPM, wave: 'square', volume: 0.04, loop: true, bass: BASS_B, bassVolume: 0.06 });
    else game.audio.melody(SONG_A, { tempo: BPM, wave: 'square', volume: 0.04, loop: true, bass: BASS_A, bassVolume: 0.06 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, flashT, lastSlot, lastBar;
  var rounds, travT, girlT, slotFlash, warnT, turnDone, warnDone, partB, padT, dither;
  var score, perfects, goods, misses, clears, over, won, outroT, prevBest, milestone;

  function gridOf(bi) { var b = BARS[bi]; if (!b) return 4; if (b.kind === 'switch') return 8; return ROUND_POOLS[b.r].grid; }
  function slotLen(grid) { return 4 * SPB / grid; }
  function goodW(grid) { return grid === 8 ? 0.1 : 0.13; }
  function perfectW(grid) { return grid === 8 ? 0.055 : 0.07; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; lastSlot = -1; lastBar = -1;
    travT = 0; girlT = 0; slotFlash = []; warnT = 0; turnDone = {}; warnDone = false; partB = false; padT = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; clears = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    rounds = [];
    for (var i = 0; i < ROUND_POOLS.length; i++) {
      var rp = ROUND_POOLS[i];
      var pick = rp.pool[Math.floor(game.random(0, rp.pool.length)) % rp.pool.length];
      rounds.push({ grid: rp.grid, slots: pick, n: pick.length, claps: [], count: 0, failed: false, resolved: false });
    }
    if (!dither) buildDither();
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    startSong(false);
  }

  function barStart(bi) { return bi * 4 * SPB; }

  // ---- 拍クロック(1本だけ)。小節内のマス(4分/8分)はこの時計から割り出す ----
  function onSlot(bi, k) {
    var b = BARS[bi];
    var grid = gridOf(bi);
    var vol = demoMode ? 0.5 : 1;
    var onBeat = grid === 4 || k % 2 === 0;
    slotFlash[k] = 1;
    if (bi === SWITCH_BAR && k === 0) {
      // 拍型の切り替わり: 曲を差し替え、提灯が8つになる
      partB = true; startSong(true);
      game.fx.flash(C.magenta, 0.2);
      game.fx.burst(W / 2, H * 0.36, { color: C.magenta, count: 24, speed: 420 });
      game.audio.play('se_powerup', 0.4);
    }
    game.audio.tone(onBeat ? (k === 0 ? 392 : 523) : 784, 0.025, { wave: 'square', volume: (onBeat ? 0.05 : 0.025) * vol });
    if (b && b.kind === 'call' && rounds[b.r].slots.indexOf(k) >= 0) {
      // 旅人の手拍子(数は画面に残さない)
      travT = 0.16;
      game.audio.tone(1900, 0.04, { wave: 'square', volume: 0.12 * vol, slide: -900 });
      game.audio.tone(140, 0.05, { wave: 'triangle', volume: 0.12 * vol });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; }
    songT = beatN * SPB + beatT;
    var bi = Math.floor(beatN / 4);
    if (bi < BARS.length) {
      var grid = gridOf(bi);
      var tRel = songT - barStart(bi);
      var k = Math.min(grid - 1, Math.floor(tRel / slotLen(grid)));
      if (bi !== lastBar || k !== lastSlot) { lastBar = bi; lastSlot = k; onSlot(bi, k); }
      var b = BARS[bi];
      // 返しの番の予告: お手本の小節の最後の半拍で上がる音
      if (b.kind === 'call' && tRel >= 3.5 * SPB && !turnDone[bi]) {
        turnDone[bi] = true;
        game.audio.tone(660, 0.12, { wave: 'square', volume: demoMode ? 0.03 : 0.06, slide: 330 });
      }
      // 拍型切り替えの予告: 切り替わり前の小節の最後の拍で提灯が点滅し、音が駆け上がる
      if (bi === SWITCH_BAR - 1 && tRel >= 3 * SPB && !warnDone) {
        warnDone = true; warnT = SPB;
        game.audio.tone(523, 0.4, { wave: 'square', volume: demoMode ? 0.04 : 0.08, slide: 1046 });
      }
    }
    for (var i = 0; i < slotFlash.length; i++) if (slotFlash[i] > 0) slotFlash[i] -= dt * 4;
    // 返しの小節の締め(足りなければMISS)
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      if (!rd.resolved && songT > barStart(RESP_BAR[r] + 1) + goodW(rd.grid)) resolveRound(r);
    }
    if (!demoMode && !over && rounds[rounds.length - 1].resolved && hitStop <= 0) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
  }

  function missRound(r, why) {
    var rd = rounds[r];
    rd.failed = true; rd.resolved = true;
    misses++;
    hitStop = 0.42; flashT = 0.42;
    game.feedback.bad(W * 0.7, H * 0.42, { text: why, shake: demoMode ? 4 : 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function resolveRound(r) {
    var rd = rounds[r];
    if (rd.resolved) return;
    if (rd.count < rd.n) { missRound(r, 'あと' + (rd.n - rd.count) + '回'); return; }
    rd.resolved = true; clears++;
    score += rd.grid === 8 ? 300 : 200;
    game.feedback.good(W * 0.7, H * 0.4, { text: rd.n + ' / ' + rd.n, color: C.yellow, size: 60, count: 16, volume: 0.3 });
    if (!demoMode && clears === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(clears + ' / ' + rounds.length, W / 2, H * 0.2, { color: C.cyan, size: 72 });
    }
  }

  // 手拍子を返す(入力とデモで共通)
  function clap() {
    if (!running || hitStop > 0) return 'none';
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      var sl = slotLen(rd.grid), gw = goodW(rd.grid);
      var tRel = songT - barStart(RESP_BAR[r]);
      if (tRel < -gw || tRel > (rd.grid - 1) * sl + gw) continue;
      if (rd.resolved) return 'none';
      var k = Math.max(0, Math.min(rd.grid - 1, Math.round(tRel / sl)));
      var off = tRel - k * sl;
      girlT = 0.16;
      if (Math.abs(off) > gw || rd.claps.indexOf(k) >= 0) { missRound(r, 'MISS'); return 'miss'; }
      if (rd.count + 1 > rd.n) { rd.count++; missRound(r, 'MISS'); return 'miss'; }
      rd.count++; rd.claps.push(k);
      if (Math.abs(off) <= perfectW(rd.grid)) { perfects++; score += 100; game.feedback.good(W * 0.7, H * 0.47, { text: 'PERFECT', color: C.cyan, size: 48, count: 8, volume: 0.22 }); }
      else { goods++; score += 50; game.feedback.good(W * 0.7, H * 0.47, { text: 'GOOD', color: C.green, size: 42, count: 5, volume: 0.18 }); }
      return 'ok';
    }
    return 'none';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += clears * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(500, 1100), { color: i % 2 ? C.yellow : C.magenta, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    padT = 0.14;
    var res = clap();
    if (res === 'ok') game.audio.tone(1500, 0.04, { wave: 'square', volume: 0.12, slide: -700 });
    else if (res === 'none') game.audio.tone(170, 0.05, { wave: 'triangle', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  // テキスト枠のウィンドウ(細い二重線)
  function frame(x, y, w, h, col) {
    game.draw.rect(x, y, w, h, C.black);
    game.draw.line(x, y, x + w, y, col, 2); game.draw.line(x, y + h, x + w, y + h, col, 2);
    game.draw.line(x, y, x, y + h, col, 2); game.draw.line(x + w, y, x + w, y + h, col, 2);
    game.draw.line(x + 8, y + 8, x + w - 8, y + 8, col, 1); game.draw.line(x + 8, y + h - 8, x + w - 8, y + h - 8, col, 1);
  }

  // 市松ディザの山並み(起動時に一度だけ組む)
  function buildDither() {
    dither = [];
    for (var j = 0; j < 28; j++) {
      for (var i = 0; i < 85; i++) {
        var x = 30 + i * 12, y = 300 + j * 12;
        var ridge = 420 + Math.sin(x * 0.006) * 90 + Math.sin(x * 0.017 + 1) * 30;
        if (y > ridge && (i + j) % 2 === 0) dither.push([x, y, y > ridge + 120 ? 1 : 0]);
      }
    }
  }

  var TRAVELER = [
    ['....yyyyyy....', '..yyyyyyyyyy..', 'yyyyyyyyyyyyyy', '....ssssss....', '....skssks....', '....ssssss....', '...bbbbbbbb...', '..bbbbbbbbbb..', '.sbbbbbbbbbbs.', '..bbbbbbbbbb..', '...bbbbbbbb...', '...bb....bb...', '...bb....bb...', '..rrr....rrr..'],
    ['....yyyyyy....', '..yyyyyyyyyy..', 'yyyyyyyyyyyyyy', '....ssssss....', '....skssks....', '....ssssss....', '...bbbbbbbb...', '..bbbbssbbbb..', '..bbbbssbbbb..', '..bbbbbbbbbb..', '...bbbbbbbb...', '...bb....bb...', '...bb....bb...', '..rrr....rrr..'],
  ];
  var TPAL = { y: C.yellow, s: C.white, k: C.black, b: C.blue, r: C.red };
  var GIRL = [
    ['...kkkkkk...', '..kkkkkkkk..', '..kssssssk..', '..skssssks..', '...ssmmss...', '....ssss....', '..rrrrrrrr..', '.rrrrrrrrrr.', 's.rrwwwwrr.s', '..rrwwwwrr..', '..rrrrrrrr..', '...rr..rr...', '...rr..rr...', '..kkk..kkk..'],
    ['...kkkkkk...', '..kkkkkkkk..', '..kssssssk..', '..skssssks..', '...ssmmss...', '....ssss....', '..rrrrrrrr..', '.rrrrssrrrr.', '..rrrssrrr..', '..rrwwwwrr..', '..rrrrrrrr..', '...rr..rr...', '...rr..rr...', '..kkk..kkk..'],
  ];
  var GPAL = { k: '#7f7f7f', s: C.white, m: C.red, r: C.magenta, w: C.white };
  var HAND = ['..ss....', '.sssss..', '.ssssss.', 'sssssss.', 'sssssss.', '.sssss..', '.ssss...', '..sss...'];

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.black], [1, '#000020']]);
    // 景色ウィンドウ
    var border = partB ? C.magenta : C.cyan;
    if (warnT > 0 && Math.floor(t * 14) % 2 === 0) border = C.yellow;
    frame(16, 244, W - 32, 930, border);
    for (var i = 0; i < dither.length; i++) game.draw.rect(dither[i][0], dither[i][1], 12, 12, dither[i][2] ? C.green : C.blue);
    // 雲(細線)
    for (var c = 0; c < 3; c++) { var cx = ((c * 360 + t * 30) % (W + 200)) - 100; game.draw.line(cx, 330 + c * 40, cx + 160, 330 + c * 40, C.white, 2); }
    // 軒と提灯(拍を見せる)
    game.draw.rect(28, 640, W - 56, 30, C.red);
    game.draw.line(28, 670, W - 28, 670, C.yellow, 2);
    var grid = running ? gridOf(Math.min(BARS.length - 1, Math.floor(beatN / 4))) : (partB ? 8 : 4);
    for (var k = 0; k < grid; k++) {
      var lx = grid === 4 ? 210 + k * 220 : 120 + k * 120;
      var lr = grid === 4 ? 34 : 22;
      var on = running && k === lastSlot ? Math.max(0, slotFlash[k] || 0) : 0;
      var warn = warnT > 0 && Math.floor(t * 14) % 2 === 0;
      game.draw.line(lx, 670, lx, 700, C.white, 2);
      game.draw.circle(lx, 700 + lr, lr, warn ? C.magenta : (on > 0 ? C.yellow : C.red));
      if (on > 0) game.draw.circle(lx, 700 + lr, lr + 14, C.yellow, 0.35 * on);
    }
    // のれん
    for (var n = 0; n < 3; n++) game.draw.rect(590 + n * 110, 760, 100, 130, partB ? C.magenta : C.blue);
    // 縁台と傘
    game.draw.rect(140, 1040, 360, 26, C.red);
    game.draw.rect(160, 1066, 16, 70, C.red); game.draw.rect(464, 1066, 16, 70, C.red);
    for (var u = 0; u < 5; u++) game.draw.rect(180 - u * 26, 770 + u * 22, 300 + u * 52, 22, u % 2 ? C.red : C.white);
    game.draw.line(330, 880, 330, 1040, C.white, 3);
    // 旅人(縁台)と看板娘
    game.draw.sprite(TRAVELER[travT > 0 ? 1 : 0], TPAL, 320, 960 + Math.sin(t * 2) * 3, 10, { anchor: 'center' });
    if (travT > 0) game.draw.circle(320, 975, 70, C.white, 0.3);
    game.draw.sprite(GIRL[girlT > 0 ? 1 : 0], GPAL, 760, 950 + Math.sin(t * 2.4 + 1) * 3, 10, { anchor: 'center' });
    // 盆と湯のみ(自分が返した数)
    var bi = Math.floor(beatN / 4);
    var b = BARS[Math.min(BARS.length - 1, bi)];
    var rd = b && b.r >= 0 ? rounds[b.r] : null;
    game.draw.rect(640, 1100, 240, 14, C.yellow);
    if (rd && b.kind === 'resp') {
      for (var q = 0; q < rd.count; q++) {
        var qx = 660 + (q % 4) * 56, qy = 1070 - Math.floor(q / 4) * 44;
        game.draw.rect(qx, qy, 36, 30, rd.failed && q === rd.count - 1 ? C.red : C.white);
        game.draw.rect(qx + 4, qy + 4, 28, 6, C.green);
      }
    }
    if (flashT > 0) game.draw.circle(760, 1000, 80 + (1 - flashT / 0.42) * 160, C.white, 0.7 * flashT / 0.42);
  }

  function drawGrid() {
    var bi = Math.min(BARS.length - 1, Math.floor(beatN / 4));
    var b = BARS[bi];
    var grid = gridOf(bi);
    frame(16, 1194, W - 32, 220, b.kind === 'resp' ? C.yellow : C.white);
    var cw = grid === 4 ? 200 : 104, gap = grid === 4 ? 30 : 14;
    var total = grid * cw + (grid - 1) * gap;
    var rd = b.r >= 0 ? rounds[b.r] : null;
    for (var k = 0; k < grid; k++) {
      var x = W / 2 - total / 2 + k * (cw + gap), y = 1250;
      var cur = running && k === lastSlot;
      game.draw.rect(x, y, cw, 110, cur ? C.blue : C.black);
      game.draw.line(x, y, x + cw, y, C.white, 1); game.draw.line(x, y + 110, x + cw, y + 110, C.white, 1);
      game.draw.line(x, y, x, y + 110, C.white, 1); game.draw.line(x + cw, y, x + cw, y + 110, C.white, 1);
      // お手本は叩いた瞬間だけ光る(数は残らない)
      if (b.kind === 'call' && rd && rd.slots.indexOf(k) >= 0 && cur && (slotFlash[k] || 0) > 0) game.draw.rect(x + 10, y + 10, cw - 20, 90, C.white);
      if (b.kind === 'resp' && rd && rd.claps.indexOf(k) >= 0) game.draw.rect(x + 10, y + 10, cw - 20, 90, C.cyan);
    }
  }

  function drawPad() {
    var t = game.time.elapsed;
    frame(16, 1440, W - 32, H - 1456, C.white);
    var shut = padT > 0;
    var gapX = shut ? 46 : 110 + Math.sin(t * 3) * 6;
    game.draw.sprite(HAND, { s: C.white }, W / 2 - gapX, H * 0.86, 22, { anchor: 'center' });
    game.draw.sprite(HAND, { s: C.white }, W / 2 + gapX, H * 0.86, 22, { anchor: 'center', flipX: true });
    if (shut) game.draw.circle(W / 2, H * 0.86, 120, C.yellow, 0.3);
  }

  function drawHud() {
    frame(16, 16, W - 32, 200, C.white);
    label('SCORE ' + score, 60, 100, 50, C.white, 'left');
    label('BEST ' + prevBest, 60, 170, 30, C.cyan, 'left');
    var bi = Math.min(BARS.length - 1, Math.floor(beatN / 4));
    var rr = BARS[bi].r >= 0 ? BARS[bi].r : 2;
    label((rr + 1) + ' / ' + rounds.length, W - 60, 100, 52, C.yellow, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 250 + i * 70, 140, 40, 40, i < misses ? C.red : C.blue);
    var progress = Math.min(1, songT / (BARS.length * 4 * SPB));
    game.draw.rect(40, 196, (W - 80) * progress, 6, C.green);
  }

  // ---- ATTRACT: 実ロジックで1回目は3つぴったり、2回目は打ちすぎてMISS、切り替わり後の8分で5つ返す ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = 7 * 4 * SPB + 0.3;
  var DEMO_CLAPS = [[0, 1, 2], [0, 1, 2], [0, 1, 2, 3, 4]];
  var demoDone = {};
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demoDone = {}; }
    demo.press = padT > 0;
    var nt = songT + dt;
    for (var r = 0; r < DEMO_CLAPS.length; r++) {
      var sl = slotLen(rounds[r].grid);
      for (var j = 0; j < DEMO_CLAPS[r].length; j++) {
        var key = r + ':' + j;
        var when = barStart(RESP_BAR[r]) + DEMO_CLAPS[r][j] * sl;
        if (!demoDone[key] && nt >= when - 0.005 && hitStop <= 0 && !rounds[r].resolved) { demoDone[key] = true; padT = 0.14; clap(); demo.press = true; }
      }
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (travT > 0) travT -= dt;
    if (girlT > 0) girlT -= dt;
    if (padT > 0) padT -= dt;
    if (warnT > 0) warnT -= dt;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(); drawGrid(); drawPad();
      game.draw.hand(W / 2 + 40, H * 0.86 + 50, { press: demo.press, scale: 15 });
      frame(16, 16, W - 32, 200, C.white);
      label(GAME_TITLE, W / 2, 112, 78 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 185, 34, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.94, 46, C.yellow);
      else label('TAP TO START', W / 2, H * 0.94, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawGrid(); drawPad();
      frame(60, H * 0.26, W - 120, H * 0.32, won ? C.cyan : C.red);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.cyan : C.red);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.435, 34, C.yellow);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.49, 50, C.magenta);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.49, 38, C.cyan);
      if (!won) label('あと' + Math.max(1, rounds.length - clears) + '回!', W / 2, H * 0.53, 44, C.yellow);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 34, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, cleared: clears, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(); drawGrid(); drawPad(); drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.yellow);
    if (over && won) label('FINISH', W / 2, H * 0.3, 100, C.yellow);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
