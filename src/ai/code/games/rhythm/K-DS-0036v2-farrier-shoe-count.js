// K-DS-0036v2-farrier-shoe-count.js
// 蹄鉄屋の返し打ち — 親方が1小節で蹄鉄を打った数を聞き取り、次の小節で槌を振り下ろして8分の拍に乗せ、同じ数ぴったりで止める
// 操作: 画面を上から下へ素早くなぞる(振り下ろす)と槌を1回打つ(なぞりが一定距離を越えた瞬間で判定)。押すだけでは槌が上がるだけで打たない。1回は2小節: 1小節目は奥の親方が自分の金床で蹄鉄を打つ(数は画面に残らないので音と火花で数える。下の灯の枠が水色)。2小節目は枠が黄色になり自分の番。打つたびに一番近い8分の拍からのずれでPERFECT/GOOD、蹄鉄に釘穴が1つ光る。ずれすぎ・同じ8分の二度打ち・数の打ちすぎはその場でMISS、小節の終わりで足りなくてもMISS(馬の蹄に合わない)。親方の小節に振っても金床の縁を叩くだけ(罰なし)。番の交代は0.6秒前に金床が点滅し上がる音で予告
// 終わり: 4回(親方の打数 2→3→4→5、104BPM・8小節・約18.5秒)を通してCLEAR(判定点+ぴったりボーナス+残り)。MISS3回でGAME OVER
// @mechanic: count_exact
// @theme: village_farrier_shoe_count
// 世界観: 村の蹄鉄屋で、若い蹄鉄工が奥の金床で親方の打った数を聞き取り、同じ数だけ槌を振り下ろして蹄鉄を打ち、蹄を上げて待つ馬に合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・数ぴったりの蹄鉄の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 80s NEON
var STYLE = { bg: ['#0b0a33', '#02000f'], main: ['#00f0ff', '#ff2bd6', '#ffe14d'], accent: ['#ffffff', '#ff4a3a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒のグラデに、シアン/マゼンタ/イエロー/白の発光線。線は同色の薄い太線を重ねた疑似グロー、点滅が命
  var NAVY = STYLE.bg[0], DEEP = STYLE.bg[1];
  var CYAN = STYLE.main[0], MAG = STYLE.main[1], YEL = STYLE.main[2];
  var WHITE = STYLE.accent[0], RED = STYLE.accent[1];
  var DARK = '#1c0b40', ORANGE = '#ff8a1f', DIM = '#3a3470';

  var GAME_TITLE = 'ANVIL ECHO';
  var BPM = 104, SPB = 60 / BPM, EIGHTH = SPB / 2, BAR = SPB * 4;
  var ROUNDS = 4;
  var TIME_LIMIT = 18.5;               // 8小節 × 2.31秒
  var READY_T = 0.8;
  var PERFECT_W = 0.055, GOOD_W = 0.095;
  var MISS_MAX = 3;
  var FLICK_PX = 70;

  // 親方の打つ8分の位置(小節内0〜7)。回ごとに数が増え、後半は8分の連打が混ざる
  var POOLS = [
    [[0, 4], [0, 6], [2, 4]],
    [[0, 2, 4], [0, 2, 6], [0, 4, 6]],
    [[0, 1, 2, 4], [0, 2, 3, 4], [0, 2, 4, 5]],
    [[0, 1, 2, 4, 6], [0, 2, 3, 4, 6], [0, 1, 3, 4, 6]]
  ];

  // 配置
  var HORIZON = Math.round(H * 0.47);
  var M_X = 250, M_Y = 760, M_ANVIL_X = 420, M_ANVIL_Y = 830;
  var HORSE_X = 860, HORSE_Y = 590, HOOF_X = 870, HOOF_Y = 1010;
  var A_X = 190, A_Y = 1150;
  var ANVIL_X = 600, ANVIL_Y = Math.round(H * 0.6);
  var LAMP_Y = Math.round(H * 0.715);
  var PAD_X = W / 2, PAD_TOP = Math.round(H * 0.79), PAD_BOT = Math.round(H * 0.94);
  var BUCKET_X = 990, BUCKET_Y = 1196;

  // 伴奏(オリジナル)。1拍ずつの断片を拍クロックから鳴らす: 8分の低音の跳ね + シンセの短い節
  var MEL = [
    [[['A4', 0.5], ['C5', 0.5]], [['E5', 1]], [['D5', 0.5], ['C5', 0.5]], [['B4', 1]]],
    [[['A4', 0.5], ['E5', 0.5]], [['G5', 0.5], ['E5', 0.5]], [['D5', 1]], [['E5', 0.5], ['B4', 0.5]]]
  ];
  var ROOT = [['A2', 'A2', 'F2', 'G2'], ['A2', 'C3', 'D3', 'E2']];
  var OCT = { A2: 'A3', F2: 'F3', G2: 'G3', C3: 'C4', D3: 'D4', E2: 'E3' };

  // ---- スプライト ----
  var MASTER = [
    ['....oooo....', '...oddddo...', '..odwddwdo..', '..oddddddo..', '..owwwwwwo..', '...owwwwo...', '....owwo....',
     '..ommmmmmo..', '.ommmmmmmmo.', 'odmmmmmmmmdo', 'od.mmmmmm.do', '...mmmmmm...', '...oo..oo...', '...oo..oo...'],
    ['....oooo....', '...oddddo...', '..ododdodo..', '..oddddddo..', '..owwkkwwo..', '...owwwwo...', '....owwo....',
     '..ommmmmmo..', '.ommmmmmmmo.', 'odmmmmmmmmdo', 'od.mmmmmm.do', '...mmmmmm...', '..oo....oo..', '..oo....oo..']
  ];
  var PAL_M = { o: CYAN, d: DARK, w: WHITE, m: MAG, k: '#000000' };
  var APPR = [
    ['...yyyyyy...', '..yyyyyyyyy.', '..oddddddo..', '..odwddwdo..', '..oddddddo..', '...oddddo...', '..occcccco..',
     '.occcccccco.', '.occcccccco.', '..occcccco..', '..ommmmmmo..', '..ommmmmmo..', '..oo....oo..', '..oo....oo..'],
    ['...yyyyyy...', '..yyyyyyyyy.', '..oddddddo..', '..ododdodo..', '..oddddddo..', '...odkkdo...', '..occcccco..',
     '.occcccccco.', '.occcccccco.', '..occcccco..', '..ommmmmmo..', '..ommmmmmo..', '.oo......oo.', '.oo......oo.']
  ];
  var PAL_A = { o: YEL, y: YEL, d: DARK, w: WHITE, k: '#000000', c: CYAN, m: MAG };
  var HORSE = [
    '..........mm....', '.........mddm...', '........mdddmyy.', '.......mddddmyyy', '......mdwwddmyyy', '.....mddwkdddmyy',
    '....mddddddddmyy', '...mdddddddddmy.', '..mddddddddddm..', '.mdddddddddddm..', 'mndddddddddddm..', 'mddddddddddddm..',
    '.mmmddddddddddm.', '....mdddddddddm.', '....mddddddddddm', '....mddddddddddm'
  ];
  var HORSE_BLINK = HORSE.slice();
  HORSE_BLINK[4] = '......mdddddmyyy';
  HORSE_BLINK[5] = '.....mddkkdddmyy';
  var HORSE_JOY = HORSE.slice();
  HORSE_JOY[4] = '......mdkkddmyyy';
  HORSE_JOY[5] = '.....mdkddkddmyy';
  HORSE_JOY[10] = 'mnddddddddddwm..';
  var PAL_H = { m: MAG, d: '#3c1468', w: WHITE, k: '#000000', y: YEL, n: MAG };
  var PAL_WHITE = { m: WHITE, d: WHITE, w: WHITE, k: WHITE, y: WHITE, n: WHITE, o: WHITE, c: WHITE };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, rounds, misses, score, combo, maxCombo, nPerfect, nGood, nMiss, nExact;
  var hitStop, pendingBad, failAt, over, won, outroT, demoMode, prevBest, resultT, milestoneDone;
  var lastSlot, lampT, lampM, beatPulse, masterT, swingT, sparkT, joyT, oopsT, turnWarn, endWarn, flyT, flyHoles, flick, stars;

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    rounds = [];
    var n = demo ? 1 : ROUNDS;
    for (var r = 0; r < n; r++) {
      var pool = POOLS[r];
      var slots = demo ? [0, 2, 4] : pool[Math.floor(game.random(0, pool.length)) % pool.length];
      rounds.push({ slots: slots, n: slots.length, hits: 0, used: {}, over: false, judged: false, ok: false, warned: false, endWarned: false });
    }
    misses = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nExact = 0;
    hitStop = 0; pendingBad = null; failAt = null; over = false; won = false; outroT = 0;
    prevBest = game.best; resultT = 0; milestoneDone = false;
    lastSlot = -1; lampT = [0, 0, 0, 0, 0, 0, 0, 0]; lampM = [0, 0, 0, 0, 0, 0, 0, 0];
    beatPulse = 0; masterT = 0; swingT = 0; sparkT = 0; joyT = 0; oopsT = 0;
    turnWarn = 0; endWarn = 0; flyT = 0; flyHoles = 0; flick = null;
    if (!stars) {
      stars = [];
      for (var i = 0; i < 40; i++) stars.push({ x: game.random(0, W), y: game.random(240, HORIZON - 40), p: game.random(0, 6) });
    }
  }

  function isCall(b) { return b % 2 === 0; }
  function roundOf(b) { return Math.floor(b / 2); }
  function curRound() {
    if (!rounds || !rounds.length) return null;
    if (clock < 0) return rounds[0];
    return rounds[Math.min(rounds.length - 1, roundOf(Math.floor(clock / BAR)))];
  }
  function inResponse() { return clock >= 0 && !isCall(Math.floor(clock / BAR)) && roundOf(Math.floor(clock / BAR)) < rounds.length; }

  // ---- 音 ----
  function playSlot(b, k, v) {
    var beat = k / 2, ph = Math.floor(b / 1) % 2;
    if (k % 2 === 0) {
      game.audio.melody(MEL[ph][beat], { tempo: BPM, wave: 'square', volume: 0.026 * v, bass: [[ROOT[ph][beat], 0.5], [OCT[ROOT[ph][beat]], 0.5]], bassVolume: 0.07 * v, bassWave: 'sawtooth' });
      game.audio.tone(k === 0 ? 80 : 100, 0.09, { wave: 'triangle', volume: 0.16 * v, slide: -40 });
    } else {
      game.audio.tone(5200, 0.02, { wave: 'square', volume: 0.012 * v });
    }
  }
  function masterClang(v) {
    game.audio.tone(1175, 0.1, { wave: 'square', volume: 0.07 * v });
    game.audio.tone(2350, 0.06, { wave: 'triangle', volume: 0.04 * v });
    game.audio.tone(130, 0.07, { wave: 'triangle', volume: 0.12 * v });
  }

  // 拍クロック(1本)。8分のマスごとに伴奏・親方の打撃・予告を出す
  function onSlot(s) {
    var b = Math.floor(s / 8), k = s % 8;
    var r = roundOf(b);
    if (r >= rounds.length) return;
    var R = rounds[r];
    var v = demoMode ? 0.4 : 1;
    playSlot(b, k, v);
    lampT[k] = 1;
    if (k % 2 === 0) beatPulse = 1;
    if (isCall(b)) {
      if (R.slots.indexOf(k) >= 0) {
        masterT = 0.16; lampM[k] = 0.3;
        masterClang(v);
        game.fx.burst(M_ANVIL_X, M_ANVIL_Y - 20, { color: k % 2 ? MAG : YEL, count: 8, speed: 260, size: 8, life: 0.4 });
      }
      if (k === 6 && !R.warned) {
        R.warned = true; turnWarn = 2 * EIGHTH;
        game.audio.tone(523, 0.45, { wave: 'square', volume: 0.05 * v, slide: 523 });
      }
    } else if (k === 6 && !R.endWarned) {
      R.endWarned = true; endWarn = 2 * EIGHTH + GOOD_W;
      game.audio.tone(880, 0.05, { wave: 'square', volume: 0.04 * v });
    }
  }

  // ---- 判定 ----
  function missHit(x, y, kind) {
    misses++; nMiss++; combo = 0;
    hitStop = 0.42; pendingBad = { x: x, y: y }; failAt = { x: x, y: y, kind: kind };
    oopsT = 1.1;
    if (!demoMode) game.audio.play(kind === 'over' ? 'se_break' : 'se_bad', 0.35);
  }
  function releaseStop() {
    var p = pendingBad;
    pendingBad = null; failAt = null;
    if (p) game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: demoMode ? 3 : 14, volume: demoMode ? 0.05 : 0.6 });
    if (!demoMode && misses >= MISS_MAX) finishRun(false);
  }

  // 槌を1回打ち下ろす(本番の指もATTRACTのゴーストも同じ関数)
  function strike() {
    swingT = 0.16;
    var b0 = Math.floor(clock / BAR);
    var rb = -1;
    if (clock >= 0 && !isCall(b0)) rb = b0;
    else if (isCall(b0) && clock >= (b0 + 1) * BAR - GOOD_W) rb = b0 + 1;
    var r = rb >= 0 ? roundOf(rb) : -1;
    if (rb < 0 || r >= rounds.length || rounds[r].judged || rounds[r].over) return 'clank';
    var R = rounds[r];
    var k = Math.round((clock - rb * BAR) / EIGHTH);
    if (k > 7) return 'clank';
    if (k < 0) k = 0;
    var d = Math.abs(clock - (rb * BAR + k * EIGHTH));
    var sx = ANVIL_X, sy = ANVIL_Y - 30;
    if (d > GOOD_W) { missHit(sx, sy, 'off'); return 'miss'; }
    if (R.used[k]) { missHit(sx, sy, 'double'); return 'miss'; }
    R.used[k] = true;
    if (R.hits >= R.n) { R.hits++; R.over = true; missHit(sx, sy, 'over'); return 'miss'; }
    R.hits++;
    var perfect = d <= PERFECT_W;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (perfect) nPerfect++; else nGood++;
    var pts = (perfect ? 100 : 60) + Math.min(10, combo) * 10;
    score += pts;
    sparkT = 0.22;
    game.feedback.good(sx + 40, sy - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : CYAN, size: perfect ? 60 : 48, count: perfect ? 16 : 9, volume: demoMode ? 0.03 : 0.1 });
    game.fx.burst(sx, sy, { color: ORANGE, count: 10, speed: 520, size: 7, life: 0.35 });
    if (!demoMode && combo >= 4 && combo % 4 === 0) game.fx.popup('x' + combo, W - 160, 330, { color: MAG, size: 72 });
    return perfect ? 'perfect' : 'good';
  }
  function anvilRing(perfect) {
    game.audio.tone(1568, 0.12, { wave: 'square', volume: demoMode ? 0.02 : 0.06 });
    game.audio.tone(perfect ? 3136 : 2093, 0.16, { wave: 'triangle', volume: demoMode ? 0.015 : 0.05 });
    game.audio.tone(160, 0.08, { wave: 'square', volume: demoMode ? 0.03 : 0.08, slide: -60 });
  }

  function judgeRound(r) {
    var R = rounds[r];
    R.judged = true;
    if (R.over) return;
    if (R.hits === R.n) {
      R.ok = true; nExact++;
      score += 300 + r * 100;
      flyT = 0.6; flyHoles = R.hits; joyT = 1.4;
      game.fx.popup('NICE', HOOF_X - 40, HOOF_Y - 200, { color: YEL, size: 92 });
      game.fx.burst(HOOF_X, HOOF_Y, { color: YEL, count: 18, speed: 380 });
      if (!demoMode) {
        game.audio.play('se_powerup', 0.4);
        if (!milestoneDone && nExact >= 2) {
          milestoneDone = true;
          game.fx.popup(nExact + ' / ' + ROUNDS, W / 2, 400, { color: CYAN, size: 84 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    } else {
      missHit(HOOF_X, HOOF_Y, 'short');
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, 420 + (i % 2) * 140, { color: [CYAN, MAG, YEL][i % 3], count: 20, speed: 460 });
      game.fx.flash(MAG, 0.18);
      game.audio.play('se_success', 0.55);
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 520, { color: YEL, size: 80 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, exactShoes: nExact, total: ROUNDS, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function stepRun(dt) {
    clock += dt;
    var s8 = Math.floor((clock + 0.02) / EIGHTH);
    while (lastSlot < s8) { lastSlot++; if (lastSlot >= 0) onSlot(lastSlot); }
    for (var r = 0; r < rounds.length; r++) {
      var R = rounds[r];
      if (!R.judged && clock >= (2 * r + 1) * BAR + 7 * EIGHTH + GOOD_W + 0.02) {
        judgeRound(r);
        if (hitStop > 0) return;
      }
    }
    if (!demoMode && !over && clock >= ROUNDS * 2 * BAR) finishRun(misses < MISS_MAX);
  }

  function tick(dt) {
    beatPulse = Math.max(0, beatPulse - dt * 4);
    masterT = Math.max(0, masterT - dt);
    swingT = Math.max(0, swingT - dt);
    sparkT = Math.max(0, sparkT - dt);
    joyT = Math.max(0, joyT - dt);
    oopsT = Math.max(0, oopsT - dt);
    turnWarn = Math.max(0, turnWarn - dt);
    endWarn = Math.max(0, endWarn - dt);
    flyT = Math.max(0, flyT - dt);
    for (var k = 0; k < 8; k++) { lampT[k] = Math.max(0, lampT[k] - dt * 4); lampM[k] = Math.max(0, lampM[k] - dt); }
  }

  // ---- 入力: 上から下へなぞって槌を振り下ろす ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.5) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || clock < -0.05 || hitStop > 0 || y < 230) return;
    flick = { id: id, x: x, y0: y, y: y, done: false };
    game.audio.tone(300, 0.07, { wave: 'triangle', volume: 0.04, slide: 260 });
  });
  game.onMove(function(x, y, id) {
    if (!flick || flick.done || flick.id !== id) return;
    flick.y = y;
    if (y - flick.y0 >= FLICK_PX && hitStop <= 0 && !over) {
      flick.done = true;
      var res = strike();
      if (res === 'perfect' || res === 'good') anvilRing(res === 'perfect');
      else if (res === 'clank') {
        game.audio.tone(620, 0.05, { wave: 'square', volume: 0.05, slide: -300 });
        game.fx.burst(ANVIL_X - 230, ANVIL_Y + 10, { color: DIM, count: 5, speed: 160 });
      }
    }
  });
  game.onRelease(function(x, y, id) {
    if (!flick || flick.id !== id) return;
    var f = flick;
    flick = null;
    if (f.done) return;
    if (y - f.y0 >= FLICK_PX * 0.45 && state === S.PLAYING && hitStop <= 0 && !over) {
      var res = strike();
      if (res === 'perfect' || res === 'good') anvilRing(res === 'perfect');
      else if (res === 'clank') game.audio.tone(620, 0.05, { wave: 'square', volume: 0.05, slide: -300 });
    } else {
      // 押しただけ: 槌が上がって下りる(打たない)
      game.fx.burst(x, y, { color: CYAN, count: 4, speed: 120, size: 8 });
    }
  });

  // ---- 描画ヘルパー ----
  function nline(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '22', w * 3.2);
    game.draw.line(x1, y1, x2, y2, col + '55', w * 1.9);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function nrect(x, y, w, h, col, lw) {
    nline(x, y, x + w, y, col, lw); nline(x + w, y, x + w, y + h, col, lw);
    nline(x + w, y + h, x, y + h, col, lw); nline(x, y + h, x, y, col, lw);
  }
  function ndot(x, y, r, col, a) {
    var al = a === undefined ? 1 : a;
    game.draw.circle(x, y, r * 1.7, col, 0.1 * al);
    game.draw.circle(x, y, r * 1.3, col, 0.22 * al);
    game.draw.circle(x, y, r, col, al);
  }
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x, y + 5, { size: sz, color: col + '40', bold: true, align: a });
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function drawShoe(cx, cy, r, col, lw, holes, overN) {
    var px = 0, py = 0;
    for (var i = 0; i <= 12; i++) {
      var a = Math.PI * (i / 12);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.5;
      if (i > 0) nline(px, py, x, y, col, lw);
      px = x; py = y;
    }
    nline(cx + r, cy, cx + r * 0.9, cy - r * 0.3, col, lw);
    nline(cx - r, cy, cx - r * 0.9, cy - r * 0.3, col, lw);
    if (holes === undefined) return;
    for (var j = 0; j < 6; j++) {
      var aa = Math.PI * (0.12 + 0.152 * j);
      var hx = cx + Math.cos(aa) * r, hy = cy + Math.sin(aa) * r * 0.5;
      if (j < holes) ndot(hx, hy, r * 0.07, j < holes - overN ? WHITE : RED);
      else game.draw.circle(hx, hy, r * 0.05, DARK);
    }
  }

  // ---- 描画 ----
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, DEEP], [0.3, NAVY], [0.46, '#2b0b55'], [0.47, '#120530'], [1, DEEP]]);
    // 夜空の窓と星
    nrect(90, 300, 900, 520, DIM, 4);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + s.p));
      game.draw.circle(s.x, s.y, 3, WHITE, tw);
    }
    ndot(170, 380, 46, MAG, 0.5);
    // 梁と吊りランプ
    nline(0, 262, W, 262, MAG, 5);
    for (var b = 0; b < 4; b++) nline(140 + b * 270, 262, 140 + b * 270, 300, MAG, 3);
    var sw = Math.sin(t * 1.4) * 18;
    nline(540, 262, 540 + sw, 360, CYAN, 2);
    ndot(540 + sw, 372, 14 + beatPulse * 6, YEL);
    // 床の発光グリッド(手前へ流れる)
    var floorBot = Math.round(H * 0.75);
    nline(0, HORIZON, W, HORIZON, MAG, 4);
    for (var v = -6; v <= 6; v++) game.draw.line(540, HORIZON, 540 + v * 230, floorBot, MAG + '66', 3);
    var ph = (t * 0.7) % 1;
    for (var j = 0; j < 7; j++) {
      var f = (j + ph) / 7;
      var yy = HORIZON + (floorBot - HORIZON) * f * f;
      game.draw.line(0, yy, W, yy, MAG + '55', 3);
    }
  }

  function drawMaster() {
    var t = game.time.elapsed;
    var striking = masterT > 0;
    var R = curRound();
    var myTurn = clock >= 0 && isCall(Math.floor(clock / BAR)) && !over;
    if (myTurn) game.draw.circle(M_ANVIL_X - 60, M_ANVIL_Y + 20, 210, CYAN, 0.1);
    // 親方の金床(小さめ・奥)
    nrect(M_ANVIL_X - 80, M_ANVIL_Y, 160, 22, CYAN, 3);
    nline(M_ANVIL_X - 80, M_ANVIL_Y + 6, M_ANVIL_X - 130, M_ANVIL_Y + 4, CYAN, 3);
    nrect(M_ANVIL_X - 30, M_ANVIL_Y + 22, 60, 40, CYAN, 3);
    drawShoe(M_ANVIL_X, M_ANVIL_Y - 4, 34, striking ? YEL : ORANGE, 4);
    var bob = Math.sin(t * 3) * 4 - beatPulse * 5;
    game.draw.sprite(MASTER[striking ? 1 : 0], PAL_M, M_X, M_Y + bob, 11, { anchor: 'center' });
    // 槌: 振り上げ ↔ 打ち下ろし
    var sx = M_X + 50, sy = M_Y - 10 + bob;
    var hx = striking ? M_ANVIL_X - 6 : M_X + 120, hy = striking ? M_ANVIL_Y - 30 : M_Y - 150 + beatPulse * 10;
    if (R && turnWarn > 0 && !striking) { hx = M_X + 170; hy = M_Y - 60; }  // 番を渡す: 槌で見習いを指す
    nline(sx, sy, hx, hy, CYAN, 6);
    game.draw.rect(hx - 26, hy - 18, 52, 36, DARK);
    nrect(hx - 26, hy - 18, 52, 36, CYAN, 3);
    if (striking) for (var i = 0; i < 6; i++) {
      var a = Math.PI * (1.1 + i * 0.16);
      nline(M_ANVIL_X + Math.cos(a) * 40, M_ANVIL_Y - 10 + Math.sin(a) * 26, M_ANVIL_X + Math.cos(a) * 90, M_ANVIL_Y - 10 + Math.sin(a) * 60, YEL, 3);
    }
  }

  function drawHorse() {
    var t = game.time.elapsed;
    var blink = Math.floor(t * 1.3) % 5 === 0;
    var frame = joyT > 0 ? HORSE_JOY : (oopsT > 0 || blink ? HORSE_BLINK : HORSE);
    var shake = oopsT > 0 ? Math.sin(t * 50) * 6 : 0;
    var nod = joyT > 0 ? Math.abs(Math.sin(t * 10)) * -18 : beatPulse * 8;
    // 首と胴(右の外へ)
    nline(HORSE_X + 60, HORSE_Y + 110, HORSE_X + 150, HORSE_Y + 300, MAG, 5);
    nline(HORSE_X + 120, HORSE_Y - 40, W + 20, HORSE_Y + 220, MAG, 5);
    nline(HORSE_X + 150, HORSE_Y + 300, W + 20, HORSE_Y + 300, MAG, 5);
    // 上げた前脚と蹄台
    nline(HOOF_X + 140, HORSE_Y + 300, HOOF_X + 40, HOOF_Y - 70, MAG, 6);
    nline(HOOF_X - 60, HOOF_Y + 60, HOOF_X + 60, HOOF_Y + 60, CYAN, 4);
    nline(HOOF_X, HOOF_Y + 60, HOOF_X, HOOF_Y + 170, CYAN, 4);
    nline(HOOF_X - 50, HOOF_Y + 170, HOOF_X + 50, HOOF_Y + 170, CYAN, 4);
    game.draw.circle(HOOF_X, HOOF_Y, 58, DARK);
    game.draw.circle(HOOF_X, HOOF_Y, 58, MAG, endWarn > 0 && Math.floor(t * 14) % 2 === 0 ? 0.6 : 0.25);
    game.draw.circle(HOOF_X, HOOF_Y, 40, DARK);
    if (joyT > 0 && flyT <= 0) drawShoe(HOOF_X, HOOF_Y + 6, 52, YEL, 5);
    if (hitStop > 0 && failAt && failAt.kind === 'short') {
      // 足りない蹄鉄: 蹄が白く光って大きくなる
      game.draw.circle(HOOF_X, HOOF_Y, 76, WHITE, 0.9);
      drawShoe(HOOF_X, HOOF_Y + 6, 82, WHITE, 8);
    }
    game.draw.circle(HORSE_X, HORSE_Y, 170, MAG, 0.08);
    game.draw.sprite(frame, PAL_H, HORSE_X + shake, HORSE_Y + nod, 14, { anchor: 'center' });
  }

  function drawAnvil(R) {
    var t = game.time.elapsed;
    var myTurn = inResponse() && !over;
    var warnBlink = turnWarn > 0 && Math.floor(t * 14) % 2 === 0;
    if (myTurn || warnBlink) game.draw.circle(ANVIL_X, ANVIL_Y + 40, 300, YEL, warnBlink ? 0.2 : 0.09);
    var fail = hitStop > 0 && failAt && failAt.x === ANVIL_X;
    var col = fail ? WHITE : (myTurn ? YEL : CYAN);
    // 金床: 天板・角・胴・台
    game.draw.rect(ANVIL_X - 220, ANVIL_Y, 440, 44, DARK);
    nrect(ANVIL_X - 220, ANVIL_Y, 440, 44, col, 4);
    for (var i = 0; i < 5; i++) nline(ANVIL_X - 220 - i * 28, ANVIL_Y + 6 + i * 6, ANVIL_X - 248 - i * 28, ANVIL_Y + 10 + i * 6, col, 4);
    game.draw.rect(ANVIL_X - 80, ANVIL_Y + 44, 160, 80, DARK);
    nrect(ANVIL_X - 80, ANVIL_Y + 44, 160, 80, col, 4);
    nrect(ANVIL_X - 170, ANVIL_Y + 124, 340, 34, col, 4);
    // 蹄鉄(打つたびに釘穴が光る)
    if (R && flyT <= 0.3) {
      var holes = clock >= 0 && !isCall(Math.floor(clock / BAR)) ? Math.min(6, R.hits) : (R.judged ? Math.min(6, R.hits) : 0);
      if (R.judged && R.ok) holes = -1;
      if (holes >= 0) {
        var big = fail ? 1.25 : 1;
        var shoeCol = fail ? WHITE : (sparkT > 0 ? YEL : ORANGE);
        drawShoe(ANVIL_X + 10, ANVIL_Y - 26, 120 * big, shoeCol, fail ? 12 : 9, holes, R.over ? Math.max(1, R.hits - R.n) : 0);
      }
    }
    if (flyT > 0) {
      var p = 1 - flyT / 0.6;
      var fx = ANVIL_X + (HOOF_X - ANVIL_X) * p, fy = ANVIL_Y - 26 + (HOOF_Y - ANVIL_Y + 26) * p - Math.sin(p * Math.PI) * 220;
      drawShoe(fx, fy, 120 - 68 * p, YEL, 9 - 4 * p, flyHoles, 0);
    }
    if (sparkT > 0) {
      for (var k = 0; k < 9; k++) {
        var a = Math.PI * (1.05 + k * 0.11);
        var r1 = 60 + (0.22 - sparkT) * 900;
        nline(ANVIL_X + Math.cos(a) * r1 * 0.6, ANVIL_Y - 40 + Math.sin(a) * r1 * 0.5, ANVIL_X + Math.cos(a) * r1, ANVIL_Y - 40 + Math.sin(a) * r1 * 0.8, k % 2 ? YEL : WHITE, 3);
      }
    }
    // 焼き入れの水桶(小節の終わりの予告で湯気)
    game.draw.rect(BUCKET_X - 50, BUCKET_Y, 100, 90, DARK);
    nrect(BUCKET_X - 50, BUCKET_Y, 100, 90, CYAN, 3);
    if (endWarn > 0) for (var q = 0; q < 4; q++) {
      var yy = BUCKET_Y - 30 - ((t * 160 + q * 40) % 150);
      ndot(BUCKET_X - 30 + q * 20 + Math.sin(t * 6 + q) * 10, yy, 12, WHITE, 0.5);
    }
  }

  function drawApprentice() {
    var t = game.time.elapsed;
    var lifted = flick && !flick.done;
    var striking = swingT > 0.06;
    var bob = Math.sin(t * 3.4) * 4 - beatPulse * 6;
    if (oopsT > 0 && !striking) bob += Math.sin(t * 40) * 4;
    game.draw.sprite(APPR[striking || oopsT > 0 ? 1 : 0], hitStop > 0 ? PAL_WHITE : PAL_A, A_X, A_Y + bob, 13, { anchor: 'center' });
    var sx = A_X + 70, sy = A_Y - 20 + bob;
    var hx, hy;
    if (striking) { hx = ANVIL_X - 40; hy = ANVIL_Y - 60; }
    else if (lifted) { hx = A_X + 160; hy = A_Y - 330; }
    else { hx = A_X + 230; hy = A_Y - 220 + beatPulse * 14; }
    nline(sx, sy, hx, hy, YEL, 8);
    game.draw.rect(hx - 44, hy - 30, 88, 60, DARK);
    nrect(hx - 44, hy - 30, 88, 60, YEL, 4);
  }

  function drawLamps(R) {
    var t = game.time.elapsed;
    var b = clock >= 0 ? Math.floor(clock / BAR) : -1;
    var resp = b >= 0 && !isCall(b);
    var frameCol = resp ? YEL : CYAN;
    if (turnWarn > 0 && Math.floor(t * 14) % 2 === 0) frameCol = YEL;
    nrect(70, LAMP_Y - 62, W - 140, 124, frameCol, 4);
    var cur = b >= 0 && !over ? Math.floor((clock - b * BAR) / EIGHTH + 0.5) % 8 : -1;
    for (var k = 0; k < 8; k++) {
      var x = 160 + k * 108;
      var r = k % 2 === 0 ? 30 : 16;
      var col = DIM, a = 0.9;
      if (lampT[k] > 0) { col = WHITE; a = 0.35 + lampT[k] * 0.6; }
      if (lampM[k] > 0) { col = MAG; a = 1; r += 8; }
      if (resp && R && R.used[k]) { col = YEL; a = 1; }
      ndot(x, LAMP_Y, r, col, a);
      if (k === cur) game.draw.circle(x, LAMP_Y + 46, 7, frameCol);
    }
  }

  function drawPad() {
    var t = game.time.elapsed;
    var lifted = flick && !flick.done;
    nline(PAD_X, PAD_TOP, PAD_X, PAD_BOT, lifted ? YEL : DIM, 6);
    for (var i = 0; i < 3; i++) {
      var y = PAD_TOP + 60 + ((t * 220 + i * 90) % 270);
      var c = inResponse() ? YEL : DIM;
      nline(PAD_X - 60, y - 34, PAD_X, y, c, 6);
      nline(PAD_X + 60, y - 34, PAD_X, y, c, 6);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, DEEP);
    nline(0, 228, W, 228, CYAN, 3);
    label('SCORE ' + score, 40, 86, 50, CYAN, 'left');
    label('BEST ' + game.best, W - 40, 86, 34, MAG, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      drawShoe(W - 80 - i * 86, 150, 26, on ? MAG : DIM, 4);
    }
    for (var r = 0; r < ROUNDS; r++) {
      var R = rounds[r], col = DIM;
      if (R) { if (R.ok) col = YEL; else if (R.judged) col = RED; else if (curRound() === R && clock >= 0) col = CYAN; }
      drawShoe(70 + r * 90, 150, 30, col, 5);
    }
    if (combo >= 2) label('x' + combo, 470, 168, 44, MAG, 'left');
    var progress = Math.max(0, Math.min(1, clock / (ROUNDS * 2 * BAR)));
    game.draw.rect(40, 206, W - 80, 10, DIM);
    game.draw.rect(40, 206, (W - 80) * progress, 10, CYAN);
  }

  function drawScene() {
    var R = curRound();
    drawWorld();
    drawMaster();
    drawHorse();
    drawAnvil(R);
    drawApprentice();
    drawLamps(R);
    drawPad();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.12);
  }

  function drawResult(showTap) {
    var y0 = H * 0.27;
    game.draw.rect(60, y0, W - 120, H * 0.34, DEEP, 0.92);
    nrect(60, y0, W - 120, H * 0.34, won ? CYAN : RED, 5);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? YEL : RED);
    label('SCORE ' + score, W / 2, H * 0.39, 62, WHITE);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.435, 36, CYAN);
    drawShoe(W / 2 - 110, H * 0.475, 40, YEL, 6);
    label(nExact + ' / ' + ROUNDS, W / 2 + 40, H * 0.49, 54, YEL);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 62, MAG);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 44, WHITE);
    if (!won) label('あと' + Math.max(1, ROUNDS - nExact) + '足!', W / 2, H * 0.58, 50, ORANGE);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 34, WHITE);
  }

  // ---- ATTRACT: 実ロジックで1回(親方3打)。奇数周は3回でぴたりと止めてNICE、偶数周は4回目を打ってMISS ----
  var demo = { t: 0, cyc: 0, plan: [], pi: 0 };
  var DEMO_CYC = 2 * BAR + 0.9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++;
      demo.plan = demo.cyc % 2 === 0 ? [0, 2, 4, 6] : [0, 2, 4];
      demo.pi = 0;
    }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) releaseStop(); }
    else stepRun(dt);
    if (demo.pi < demo.plan.length && hitStop <= 0 && clock >= BAR + demo.plan[demo.pi] * EIGHTH) {
      var res = strike();
      if (res === 'perfect' || res === 'good') anvilRing(res === 'perfect');
      demo.pi++;
    }
  }
  function demoHand() {
    var hy = PAD_TOP - 10, press = false;
    for (var i = 0; i < demo.plan.length; i++) {
      var T = BAR + demo.plan[i] * EIGHTH;
      if (clock >= T - 0.16 && clock <= T + 0.06) {
        var p = Math.max(0, Math.min(1, (clock - (T - 0.16)) / 0.16));
        hy = PAD_TOP - 10 + p * 210; press = true;
      }
    }
    game.draw.hand(PAD_X + 50, hy, { press: press, scale: 15 });
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tick(dt);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene();
      demoHand();
      game.draw.rect(0, 0, W, 230, DEEP);
      nline(0, 228, W, 228, MAG, 3);
      var bob = Math.sin(t * 3) * 6;
      label(GAME_TITLE, W / 2 + 6, 112 + bob, 112, MAG);
      label(GAME_TITLE, W / 2, 106 + bob, 112, Math.floor(t * 3) % 2 === 0 ? CYAN : WHITE);
      label('HI-SCORE ' + game.best, W / 2, 196, 38, YEL);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 46, YEL);
      else label('INSERT COIN', W / 2, H * 0.975, 42, CYAN);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) releaseStop();
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(60, H * 0.4, W - 120, 170, DEEP, 0.85);
      nrect(60, H * 0.4, W - 120, 170, MAG, 5);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 122, 110, YEL);
    }
    // 最初の自分の番だけ、振り下ろしの手を薄く出す
    var R0 = rounds[0];
    if (!over && R0 && R0.hits === 0 && clock > BAR - 0.3 && clock < 2 * BAR) {
      var ph = (t * 2.2) % 1;
      game.draw.hand(PAD_X + 50, PAD_TOP - 10 + ph * 210, { press: ph > 0.15, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
