// K-GBA-0025v3-schoolroom-xylo-waltz.js
// 分校の木琴ワルツ — 先生が三拍子の1小節で叩いた木琴の数を数え、次の小節で同じ数ぴったりを三拍子の8分に乗せて叩き返す。途中から隣の子のカスタネットが混ざる(数えない)
// 操作: 先生の小節は聞いて見るだけ(入力は効かない)。自分の小節になったら画面のどこでもタップで手前の木琴を1回叩く(下の木琴を押せばその鍵盤、上ならば左から順の鍵盤)。叩くたびに一番近い8分の頭(1小節=三拍子で6コマ)からのずれでPERFECT/GOOD。コマから外れた一打・同じコマの二度打ちは枠を叩いた音でMISS(数に入らない)。数の叩きすぎはその場でMISS、小節の終わりで足りなくてもMISS。黒板に自分の数が正の字で残り、小節の終わりに先生の数が黄色で並ぶ
// 終わり: 6回(2→3→4→カスタネット入り3→5→カスタネット入り5)を通してMISS 2回以内ならCLEAR(判定点+数ぴったりボーナス+無視したカスタネット)。MISS3回でGAME OVER
// @mechanic: count_exact
// @theme: schoolroom_xylophone_waltz
// 世界観: 山あいの分校の音楽室で、学級委員が先生の叩いた木琴の数を三拍子の伴奏の中で聞き分け、隣の子のカスタネットに惑わされずに同じ数だけ木琴で打ち返す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・数を合わせた回数
// スタイル: 90s LOW POLY

(function(game) {
  var STYLE = { bg: ['#6f8fb8', '#d9c9a0'], main: ['#efe3c4', '#9a6436', '#2f5a46'], accent: ['#ffd23c', '#e2483a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点を毎フレームわずかに揺らす。窓の遠景はフォグで沈める
  var C = {
    sky: STYLE.bg[0], fog: STYLE.bg[1], wall: STYLE.main[0], wallS: '#d8c9a4', wood: STYLE.main[1], woodD: '#6a4426',
    board: STYLE.main[2], boardD: '#21402f', chalk: '#f4f4ec', yel: STYLE.accent[0], red: STYLE.accent[1],
    floorA: '#b98a58', floorB: '#a87a4a', key: '#c27a4a', keyD: '#8a4e2a', rail: '#4a3424', ink: '#1c1a24',
    navy: '#2c3a5c', teal: '#3a8a8a', skin: '#f2c8a0', white: '#ffffff', hill: '#6a8a74', hillD: '#557060'
  };

  var GAME_TITLE = 'XYLO WALTZ';
  var BPM = 120, SPB = 60 / BPM, BEATS_IN_BAR = 3, BAR = SPB * BEATS_IN_BAR, EIGHTH = SPB / 2, SLOTS = 6;
  var ROUNDS = 6, BARS = ROUNDS * 2, BEATS = BARS * BEATS_IN_BAR;
  var TIME_LIMIT = 18;                 // 12小節 × 1.5秒(三拍子)
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.1;
  var MISS_MAX = 3;
  // 先生の木琴(x)と隣の子のカスタネット(c)のコマ。1小節=8分6コマ
  var POOLS = [
    [{ x: [0, 2], c: [] }, { x: [0, 4], c: [] }, { x: [2, 4], c: [] }],
    [{ x: [0, 2, 4], c: [] }, { x: [0, 1, 2], c: [] }, { x: [0, 2, 3], c: [] }],
    [{ x: [0, 1, 2, 4], c: [] }, { x: [0, 2, 3, 4], c: [] }, { x: [0, 2, 4, 5], c: [] }],
    [{ x: [0, 2, 4], c: [3] }, { x: [0, 1, 4], c: [2] }, { x: [0, 2, 3], c: [4] }],
    [{ x: [0, 1, 2, 3, 4], c: [] }, { x: [0, 1, 2, 4, 5], c: [] }, { x: [0, 2, 3, 4, 5], c: [] }],
    [{ x: [0, 1, 2, 4, 5], c: [3] }, { x: [0, 1, 3, 4, 5], c: [2] }, { x: [0, 1, 2, 3, 5], c: [4] }]
  ];
  var DEMO_ROUND = { x: [0, 2, 4], c: [3] };
  var CAST_FROM = 3;                   // 4回目からカスタネット

  // 伴奏(オリジナル): ズン・チャッ・チャッの三拍子。根音は小節ごとに進む
  var PROG = ['C3', 'C3', 'F2', 'F2', 'G2', 'G2', 'A2', 'A2', 'F2', 'F2', 'G2', 'C3'];
  var PAH = { C3: ['E4', 'G4'], F2: ['A3', 'C4'], G2: ['B3', 'D4'], A2: ['C4', 'E4'] };
  var TEACH_NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
  var MY_NOTES = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5'];

  // ---- スプライト ----
  var TEACHER = [
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..skssks..', '...ssss...', '...smms...', '....ss....', '..cccccc..', '.cccccccc.', '.ccwwwwcc.', '.cccccccc.', '..cccccc..', '..dddddd..', '..dddddd..'],
    ['....hhhh..', '...hhhhhh.', '...hssssh.', '...skssks.', '....ssss..', '....smms..', '....ss....', '..cccccc..', '.cccccccc.', '.ccwwwwcc.', '.cccccccc.', '..cccccc..', '..dddddd..', '..dddddd..']
  ];
  var TPAL = { h: '#4a3020', s: C.skin, k: C.ink, m: C.red, c: C.teal, w: C.white, d: C.navy };
  var KID = [
    ['..hhhh..', '.hhhhhh.', '.hskskh.', '..ssss..', 'r.oooo.b', 's.oooo.s', '..oooo..', '..nnnn..', '..n..n..', '..n..n..', '.kk..kk.'],
    ['..hhhh..', '.hhhhhh.', '.hskskh.', '..ssss..', '...rb...', '.soooos.', '..oooo..', '..nnnn..', '..n..n..', '..n..n..', '.kk..kk.']
  ];
  var KPAL = { h: '#2a2018', s: C.skin, k: C.ink, o: '#e88a3a', n: C.navy, r: C.red, b: '#3a6ae2' };
  // 学級委員(後ろ姿、左腕に腕章)
  var REP = [
    ['....hhhh....', '...hhhhhh...', '...hhhhhh...', '....hhhh....', '.....ss.....', '..wwwwwwww..', '.ywwwwwwwww.', '.ywwwwwwwww.', '.swwwwwwwws.', '.s.wwwwww.s.', '...nnnnnn...', '...nnnnnn...', '...nn..nn...', '...ss..ss...', '..kkk..kkk..'],
    ['....hhhh....', '...hhhhhh...', '...hhhhhh...', '....hhhh....', '.s...ss...s.', '.swwwwwwwws.', '.ywwwwwwwww.', '.ywwwwwwwww.', '..wwwwwwww..', '...wwwwww...', '...nnnnnn...', '...nnnnnn...', '...nn..nn...', '...ss..ss...', '..kkk..kkk..']
  ];
  var RPAL = { h: '#2a2018', s: C.skin, w: C.white, y: C.yel, n: C.navy, k: C.ink };
  var WHITEPAL = { h: '#fff', s: '#fff', w: '#fff', y: '#fff', n: '#fff', k: '#fff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, rounds, calls, misses, score, perfects, goods, exacts, combo, demoMode, prevBest;
  var hitStop, over, won, outroT, lastBeat, lastCue, beatPulse, handoffT, failKey, flashT;
  var teachKey, teachT, kidT, repT, myKey, myKeyT, clunkT, eraseT;

  function pickRound(def) {
    return { n: def.x.length, xs: def.x, cs: def.c, count: 0, slots: [], marks: [], over: false, dirty: false, resolved: false, exact: false, reveal: false };
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    rounds = []; calls = [];
    var n = demo ? 1 : ROUNDS;
    for (var r = 0; r < n; r++) {
      var pool = POOLS[r];
      var def = demo ? DEMO_ROUND : pool[Math.floor(game.random(0, pool.length)) % pool.length];
      rounds.push(pickRound(def));
      var i;
      for (i = 0; i < def.x.length; i++) calls.push({ t: 2 * r * BAR + def.x[i] * EIGHTH, kind: 'x', key: Math.floor(game.random(0, 6)) % 6, done: false });
      for (i = 0; i < def.c.length; i++) calls.push({ t: 2 * r * BAR + def.c[i] * EIGHTH, kind: 'c', key: 0, done: false });
    }
    misses = 0; score = 0; perfects = 0; goods = 0; exacts = 0; combo = 0; prevBest = game.best;
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -99; lastCue = -1; beatPulse = 0;
    handoffT = 0; failKey = -1; flashT = 0;
    teachKey = -1; teachT = 0; kidT = 0; repT = 0; myKey = -1; myKeyT = 0; clunkT = 0; eraseT = 0;
  }

  function where() {
    if (clock < 0) return { bar: -1, resp: false, inBar: 0, r: 0 };
    var bar = Math.floor(clock / BAR);
    return { bar: bar, resp: bar % 2 === 1, inBar: clock - bar * BAR, r: Math.min(rounds.length - 1, Math.floor(bar / 2)) };
  }

  // ---- 音 ----
  function xylo(note, vol) {
    game.audio.tone(note, 0.16, { wave: 'triangle', volume: 0.13 * vol });
    game.audio.tone(note, 0.05, { wave: 'sine', volume: 0.05 * vol, slide: 1200 });
  }
  function castanet() {
    game.audio.tone(2600, 0.03, { wave: 'square', volume: 0.05, slide: -1400 });
    game.audio.tone(1700, 0.025, { wave: 'square', volume: 0.04 });
  }
  function waltzBeat(bi) {
    var bar = Math.floor(bi / BEATS_IN_BAR), b = bi % BEATS_IN_BAR;
    var root = PROG[Math.min(PROG.length - 1, bar)];
    if (b === 0) game.audio.melody([[root, 1]], { tempo: BPM, wave: 'triangle', volume: 0.12 });
    else game.audio.melody([[PAH[root][1], 0.5], ['R', 0.5]], { tempo: BPM, wave: 'square', volume: 0.03, bass: [[PAH[root][0], 0.5], ['R', 0.5]], bassWave: 'square', bassVolume: 0.03 });
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) waltzBeat(cue); }
    var bi = Math.floor(clock / SPB);
    if (bi === lastBeat) return;
    lastBeat = bi;
    if (clock < 0 || bi >= BEATS) return;
    beatPulse = 1;
    var bar = Math.floor(bi / BEATS_IN_BAR), b = bi % BEATS_IN_BAR;
    // 先生の小節の3拍目: 次は自分の番(木琴の枠が点滅し、上がる2音)
    if (bar % 2 === 0 && b === 2 && bar < BARS - 1) {
      handoffT = SPB;
      if (!demoMode) { game.audio.tone('G5', 0.05, { wave: 'square', volume: 0.04 }); game.audio.tone('C6', 0.07, { wave: 'square', volume: 0.04, slide: 60 }); }
    }
    // 自分の小節の頭で黒板を消す
    if (bar % 2 === 1 && b === 0) eraseT = 0;
    // カスタネットが入る回の1小節前: 隣の子が立ち上がって構える(音も鳴らす)
    if (!demoMode && bar === CAST_FROM * 2 - 1 && b === 0) { kidT = 0.5; castanet(); }
  }

  // ---- 判定 ----
  function markMiss(r, x, y) {
    misses++; combo = 0;
    hitStop = 0.34; flashT = 0.34;
    game.feedback.bad(x, y, { text: 'MISS', shake: demoMode ? 3 : 10, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && misses >= MISS_MAX) finishRun(false);
  }

  function resolveRound(r) {
    var rd = rounds[r];
    if (rd.resolved) return;
    rd.resolved = true; rd.reveal = true; eraseT = 0.0001;
    if (rd.over) return;
    if (rd.count < rd.n) { markMiss(r, W * 0.3, H * 0.2); game.fx.popup('あと' + (rd.n - rd.count) + '回', W * 0.3, H * 0.25, { color: C.yel, size: 52 }); return; }
    rd.exact = true; exacts++;
    score += 200 + rd.cs.length * 100;
    if (!demoMode) {
      game.fx.popup('NICE', W * 0.3, H * 0.22, { color: C.yel, size: 84 });
      game.audio.play('se_milestone', 0.4);
      if (exacts === 3) game.fx.popup(exacts + ' / ' + ROUNDS, W / 2, H * 0.38, { color: C.white, size: 64 });
    } else {
      game.fx.popup('NICE', W * 0.3, H * 0.22, { color: C.yel, size: 70 });
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 420 + (i % 2) * 120, { color: i % 2 ? C.yel : C.chalk, count: 16, speed: 400 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, perfect: perfects, good: goods, miss: misses, exact: exacts, rounds: ROUNDS };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 手前の木琴の鍵盤の形(奥が狭い台形。右ほど短い)
  var XB = { y0: Math.round(H * 0.785), y1: Math.round(H * 0.96), bl: 160, br: 920, fl: 40, fr: 1040 };
  function keyQuad(k) {
    var f0 = k / 6 + 0.012, f1 = (k + 1) / 6 - 0.012;
    var top = XB.y0 + 12 + k * 16, bot = XB.y1 - 14 - k * 8;
    var tl = XB.bl + (XB.br - XB.bl) * f0, tr = XB.bl + (XB.br - XB.bl) * f1;
    var t0 = (top - XB.y0) / (XB.y1 - XB.y0), t1 = (bot - XB.y0) / (XB.y1 - XB.y0);
    var l0 = XB.bl + (XB.fl - XB.bl) * t0, r0 = XB.br + (XB.fr - XB.br) * t0;
    var l1 = XB.bl + (XB.fl - XB.bl) * t1, r1 = XB.br + (XB.fr - XB.br) * t1;
    return [[l0 + (r0 - l0) * f0, top], [l0 + (r0 - l0) * f1, top], [l1 + (r1 - l1) * f1, bot], [l1 + (r1 - l1) * f0, bot]];
  }
  function keyAt(x, y) {
    if (y < XB.y0) return -1;
    var t = Math.min(1, (y - XB.y0) / (XB.y1 - XB.y0));
    var l = XB.bl + (XB.fl - XB.bl) * t, r = XB.br + (XB.fr - XB.br) * t;
    return Math.max(0, Math.min(5, Math.floor((x - l) / (r - l) * 6)));
  }
  function keyCenter(k) { var q = keyQuad(k); return { x: (q[0][0] + q[2][0]) / 2, y: (q[0][1] + q[2][1]) / 2 }; }

  // 1回叩く(本番の指も ATTRACT のゴーストも同じ関数)。戻り値で音を変える
  function strike(key) {
    repT = 0.16;
    var hitR = -1, tRel = 0;
    for (var r = 0; r < rounds.length; r++) {
      var tr = clock - (2 * r + 1) * BAR;
      if (tr >= -GOOD_W && tr <= (SLOTS - 1) * EIGHTH + GOOD_W) { hitR = r; tRel = tr; break; }
    }
    if (hitR < 0 || rounds[hitR].over || rounds[hitR].resolved) return 'locked';
    var rd = rounds[hitR];
    var k = Math.max(0, Math.min(SLOTS - 1, Math.round(tRel / EIGHTH)));
    var off = Math.abs(tRel - k * EIGHTH);
    if (key < 0) key = Math.min(5, rd.count);
    var kc = keyCenter(key);
    if (off > GOOD_W || rd.slots.indexOf(k) >= 0) {
      // コマから外れた / 同じコマの二度打ち: 枠を叩いてしまう(数に入らない)
      rd.dirty = true; rd.marks.push({ k: k, off: true, x: (tRel / EIGHTH) });
      failKey = key; clunkT = 0.2;
      markMiss(hitR, kc.x, kc.y - 90);
      return 'clunk';
    }
    rd.count++; rd.slots.push(k);
    myKey = key; myKeyT = 0.22;
    if (rd.count > rd.n) {
      // 叩きすぎ: その場でMISS、この回はもう数えない
      rd.over = true; rd.marks.push({ k: k, off: true, x: k });
      failKey = key;
      markMiss(hitR, kc.x, kc.y - 90);
      return 'over';
    }
    combo++;
    var perfect = off <= PERFECT_W;
    if (perfect) { perfects++; score += 100 + Math.min(8, combo) * 10; } else { goods++; score += 50 + Math.min(8, combo) * 5; }
    rd.marks.push({ k: k, off: false, perfect: perfect, x: k });
    game.feedback.good(kc.x, kc.y - 110, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yel : C.chalk, size: perfect ? 48 : 40, count: perfect ? 12 : 6, volume: demoMode ? 0.03 : 0.12 });
    return 'ok';
  }

  function stepRun(dt) {
    clock += dt;
    if (teachT > 0) teachT -= dt;
    if (kidT > 0) kidT -= dt;
    if (handoffT > 0) handoffT -= dt;
    if (myKeyT > 0) myKeyT -= dt;
    if (clunkT > 0) clunkT -= dt;
    if (eraseT > 0) eraseT += dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < calls.length; i++) {
      var c = calls[i];
      if (c.done || clock < c.t) continue;
      c.done = true;
      if (c.kind === 'x') { teachKey = c.key; teachT = 0.18; if (!demoMode) xylo(TEACH_NOTES[c.key], 1); }
      else { kidT = 0.2; if (!demoMode) castanet(); }
    }
    for (var r = 0; r < rounds.length; r++) {
      if (!rounds[r].resolved && clock >= (2 * r + 2) * BAR) { resolveRound(r); if (over) return; }
    }
    if (!demoMode && !over && (clock >= BARS * BAR + 0.05 || clock > TIME_LIMIT + 0.5)) finishRun(misses < MISS_MAX);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var key = keyAt(x, y);
    var res = strike(key);
    if (res === 'ok') {
      var rd = rounds[Math.min(rounds.length - 1, Math.floor(Math.floor(clock / BAR + 0.1) / 2))];
      xylo(MY_NOTES[Math.min(5, Math.max(0, myKey))], 1);
      // 連続で合うほど高い音が重なる
      if (combo >= 2) game.audio.tone(MY_NOTES[Math.min(5, rd ? rd.count - 1 : 0)], 0.05, { wave: 'sine', volume: 0.03 + Math.min(6, combo) * 0.006, slide: 600 });
    } else if (res === 'locked') {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, Math.max(y, XB.y0), { color: C.wood, count: 3, speed: 70 });
    } else {
      game.audio.tone(150, 0.08, { wave: 'square', volume: 0.08 });
    }
  });

  // ---- 描画(ローポリ) ----
  function jit(i) { return Math.sin(game.time.elapsed * 23 + i * 7.13) * 1.2; }
  function poly(pts, col, step) {
    var minY = 1e9, maxY = -1e9, i, q = [];
    for (i = 0; i < pts.length; i++) {
      q.push([pts[i][0] + jit(i + pts[i][0] * 0.01), pts[i][1] + jit(i * 3 + pts[i][1] * 0.01)]);
      if (q[i][1] < minY) minY = q[i][1];
      if (q[i][1] > maxY) maxY = q[i][1];
    }
    step = step || 3;
    for (var y = minY; y < maxY; y += step) {
      var yc = y + step / 2, lo = 1e9, hi = -1e9;
      for (i = 0; i < q.length; i++) {
        var a = q[i], b = q[(i + 1) % q.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          var xx = a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
          if (xx < lo) lo = xx;
          if (xx > hi) hi = xx;
        }
      }
      if (hi > lo) game.draw.rect(lo, y, hi - lo, step + 0.5, col);
    }
    return q;
  }
  function edge(q, col, w) { for (var i = 0; i < q.length; i++) { var a = q[i], b = q[(i + 1) % q.length]; game.draw.line(a[0], a[1], b[0], b[1], col, w || 2); } }
  function face(pts, col, line, step) { var q = poly(pts, col, step); if (line) edge(q, line, 2); }

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.35, C.fog], [1, C.floorB]]);
    // 奥の壁と左右の壁
    face([[90, 230], [990, 230], [990, 880], [90, 880]], C.wall, null, 6);
    face([[0, 230], [90, 230], [90, 880], [0, 980]], C.wallS, C.woodD, 6);
    face([[990, 230], [1080, 230], [1080, 980], [990, 880]], C.wallS, C.woodD, 6);
    // 窓(山と霧)
    face([[800, 300], [970, 300], [970, 520], [800, 520]], C.sky, null, 6);
    face([[800, 470], [860, 380], [930, 450], [970, 400], [970, 520], [800, 520]], C.hill, null, 4);
    face([[860, 520], [910, 430], [970, 500], [970, 520]], C.hillD, null, 4);
    game.draw.rect(800, 300 + Math.sin(t * 0.5) * 6 + 120, 170, 60, C.fog, 0.55);
    game.draw.rect(800, 300, 170, 220, C.fog, 0.18);
    edge([[800, 300], [970, 300], [970, 520], [800, 520]], C.woodD, 8);
    game.draw.line(885, 300, 885, 520, C.woodD, 6);
    // 床(板目は消失点へ)
    face([[90, 880], [990, 880], [1080, 980], [0, 980]], C.floorA, null, 5);
    game.draw.rect(0, 980, W, H - 980, C.floorA);
    for (var i = 0; i <= 8; i++) game.draw.line(90 + i * 112.5, 880, -460 + i * 250, H, C.floorB, 4);
    for (var j = 0; j < 6; j++) { var fy = 880 + j * j * 26 + j * 30; game.draw.rect(0, fy, W, 3, C.floorB); }
  }

  function drawBoard() {
    var w = where();
    face([[130, 280], [750, 280], [750, 570], [130, 570]], C.wood, C.woodD, 6);
    face([[146, 294], [734, 294], [734, 556], [146, 556]], C.board, C.boardD, 6);
    game.draw.rect(140, 568, 600, 12, C.woodD);
    game.draw.line(440, 310, 440, 540, C.boardD, 3);
    // 拍ランプ(1拍目が大きい)
    var cur = clock >= 0 && w.bar < BARS ? Math.floor(w.inBar / SPB) : -1;
    for (var b = 0; b < 3; b++) {
      var lx = 340 + b * 100, s = (b === 0 ? 22 : 15) + (b === cur ? beatPulse * 8 : 0);
      face([[lx, 256 - s], [lx + s, 256], [lx, 256 + s], [lx - s, 256]], b === cur ? C.yel : C.woodD, null, 2);
    }
    // 正の字: 自分の数(白)と先生の数(黄色、小節の終わりに出る)
    var rd = rounds[w.r];
    var showR = w.resp ? w.r : Math.floor(w.bar / 2) - 1;
    if (!w.resp && eraseT > 0 && eraseT < 0.55 && showR >= 0 && showR < rounds.length) rd = rounds[showR];
    else if (!w.resp) rd = null;
    if (rd) {
      tally(205, 425, Math.min(rd.count, 10), C.chalk);
      if (rd.reveal) {
        tally(510, 425, rd.n, C.yel);
        if (rd.exact) { ringLine(440, 425, 60, C.yel); } else { game.draw.line(400, 385, 480, 465, C.red, 8); game.draw.line(480, 385, 400, 465, C.red, 8); }
      }
    }
    // 黒板消しが通る
    if (!w.resp && eraseT > 0.4 && eraseT < 0.8) {
      var ex = 150 + (eraseT - 0.4) / 0.4 * 560;
      face([[ex - 40, 400], [ex + 40, 400], [ex + 40, 440], [ex - 40, 440]], '#c8b8a0', C.woodD, 3);
    }
  }
  function ringLine(x, y, r, col) {
    var n = 10, px = x + r, py = y;
    for (var i = 1; i <= n; i++) { var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r; game.draw.line(px, py, nx, ny, col, 6); px = nx; py = ny; }
  }
  // 正の字(5画で1つ)。ローポリなので線は少し揺れる
  function tally(x, y, n, col) {
    for (var i = 0; i < n; i++) {
      var g = Math.floor(i / 5), s = i % 5, gx = x + g * 120, h = 46;
      var j = jit(i) * 0.8;
      if (s === 0) game.draw.line(gx - 40, y - h + j, gx + 40, y - h - j, col, 7);
      if (s === 1) game.draw.line(gx + j, y - h, gx - j, y + h, col, 7);
      if (s === 2) game.draw.line(gx, y + j, gx + 34, y - j, col, 7);
      if (s === 3) game.draw.line(gx - 28 + j, y, gx - 28 - j, y + h, col, 7);
      if (s === 4) game.draw.line(gx - 50, y + h + j, gx + 50, y + h - j, col, 7);
    }
  }

  function drawFront() {
    var t = game.time.elapsed;
    var w = where();
    // ピアノとメトロノーム(拍ごとに左右へ振れる)
    face([[110, 700], [340, 700], [352, 724], [98, 724]], C.woodD, C.ink, 3);
    face([[98, 724], [352, 724], [352, 880], [98, 880]], '#3a2a20', C.ink, 4);
    game.draw.rect(112, 730, 226, 22, C.white);
    for (var k = 0; k < 9; k++) game.draw.rect(124 + k * 25, 730, 10, 13, C.ink);
    face([[280, 700], [320, 700], [306, 626], [294, 626]], C.wood, C.woodD, 2);
    var sw = clock >= 0 ? Math.sin(Math.PI * clock / SPB) : Math.sin(t * 3);
    game.draw.line(300, 694, 300 + sw * 34, 640, C.ink, 4);
    game.draw.rect(300 + sw * 28 - 6, 650, 12, 10, C.yel);
    // 先生(三拍子で揺れる)と先生の木琴
    var bob = beatPulse * 6;
    var tf = Math.floor(clock >= 0 ? clock / SPB : t * 2) % 2;
    game.draw.sprite(TEACHER[tf], TPAL, 540, 690 - bob, 8, { anchor: 'center' });
    var tq = [[410, 770], [670, 770], [690, 836], [390, 836]];
    face(tq, C.rail, C.ink, 3);
    for (var i = 0; i < 6; i++) {
      var x0 = 418 + i * 42, lit = teachT > 0 && teachKey === i;
      face([[x0, 774 + i * 2], [x0 + 34, 774 + i * 2], [x0 + 36, 830 - i], [x0 - 2, 830 - i]], lit ? C.yel : C.key, null, 2);
    }
    // 先生のばち(線)
    var tk = teachT > 0 ? teachKey : -1;
    var hx = tk >= 0 ? 435 + tk * 42 : 470, hy = tk >= 0 ? 790 : 720 + Math.sin(t * 3) * 6;
    game.draw.line(500, 712 - bob, hx, hy, C.woodD, 5); game.draw.circle(hx, hy, 9, C.red);
    game.draw.line(580, 712 - bob, tk >= 0 ? hx + 60 : 610, tk >= 0 ? 760 : hy, C.woodD, 5); game.draw.circle(tk >= 0 ? hx + 60 : 610, tk >= 0 ? 760 : hy, 9, C.red);
    // 隣の子とカスタネット(4回目から鳴らす)
    var castOn = demoMode || w.r >= CAST_FROM || kidT > 0;
    face([[868, 820], [944, 820], [950, 880], [862, 880]], C.woodD, C.ink, 3);
    game.draw.sprite(KID[kidT > 0 ? 1 : 0], castOn ? KPAL : { h: KPAL.h, s: KPAL.s, k: KPAL.k, o: KPAL.o, n: KPAL.n, r: KPAL.s, b: KPAL.s }, 905, 772 - (kidT > 0 ? 6 : 0), 7, { anchor: 'center' });
    if (kidT > 0 && castOn) game.draw.circle(905, 740, 26 + (0.2 - Math.min(0.2, kidT)) * 160, C.red, 0.35);
  }

  function drawRuler() {
    var w = where();
    var y = Math.round(H * 0.575), x0 = 240, dx = 120;
    var live = w.resp && w.bar < BARS;
    var rd = live ? rounds[w.r] : null;
    face([[x0 - 70, y - 40], [x0 + 5 * dx + 70, y - 40], [x0 + 5 * dx + 80, y + 40], [x0 - 80, y + 40]], live ? C.navy : '#8a8070', null, 4);
    for (var k = 0; k < SLOTS; k++) {
      var big = k % 2 === 0, s = big ? 20 : 11, x = x0 + k * dx;
      face([[x, y - s], [x + s, y], [x, y + s], [x - s, y]], live ? C.chalk : C.wallS, null, 2);
    }
    if (rd) {
      for (var i = 0; i < rd.marks.length; i++) {
        var m = rd.marks[i], mx = x0 + m.x * dx;
        if (m.off) { game.draw.line(mx - 18, y - 18, mx + 18, y + 18, C.red, 6); game.draw.line(mx + 18, y - 18, mx - 18, y + 18, C.red, 6); }
        else face([[mx, y - 26], [mx + 26, y], [mx, y + 26], [mx - 26, y]], m.perfect ? C.yel : C.chalk, C.ink, 2);
      }
      var cx = x0 + (w.inBar / EIGHTH) * dx;
      game.draw.rect(cx - 5, y - 52, 10, 104, C.yel);
    }
  }

  function drawRep() {
    var t = game.time.elapsed;
    var big = flashT > 0;
    var rx = 540, ry = Math.round(H * 0.68);
    var up = repT <= 0;
    if (big) game.draw.circle(rx, ry, 120, C.white, 0.5);
    game.draw.sprite(REP[up ? 1 : 0], big ? WHITEPAL : RPAL, rx, ry - (up ? Math.sin(t * 4) * 3 : 0), big ? 12 : 10, { anchor: 'center' });
    // ばち: 叩いた鍵盤へ伸びる。待ちは頭の横に構える
    var kc = myKeyT > 0 && myKey >= 0 ? keyCenter(myKey) : null;
    if (clunkT > 0 && failKey >= 0) { var fq = keyQuad(failKey); kc = { x: fq[0][0], y: fq[0][1] - 10 }; }
    var lx = kc ? kc.x - 30 : rx - 110, ly = kc ? kc.y : ry - 70 + Math.sin(t * 4) * 6;
    var rx2 = kc ? kc.x + 30 : rx + 110, ry2 = kc ? kc.y - 30 : ry - 70 - Math.sin(t * 4) * 6;
    game.draw.line(rx - 55, ry - 20, lx, ly, C.woodD, 7); game.draw.circle(lx, ly, 14, C.red);
    game.draw.line(rx + 55, ry - 20, rx2, ry2, C.woodD, 7); game.draw.circle(rx2, ry2, 14, C.red);
  }

  function drawXylo() {
    var t = game.time.elapsed;
    var w = where();
    var live = (w.resp && w.bar < BARS) || handoffT > 0;
    var blink = handoffT > 0 && Math.floor(t * 10) % 2 === 0;
    var frame = [[XB.bl - 30, XB.y0 - 10], [XB.br + 30, XB.y0 - 10], [XB.fr + 30, XB.y1 + 10], [XB.fl - 30, XB.y1 + 10]];
    face(frame, live ? (blink ? C.yel : C.rail) : '#3a3028', blink ? C.white : C.ink, 5);
    var rd = w.resp ? rounds[w.r] : null;
    for (var k = 0; k < 6; k++) {
      var q = keyQuad(k);
      var lit = myKeyT > 0 && myKey === k;
      var bad = flashT > 0 && failKey === k;
      face(q, bad ? C.white : (lit ? C.yel : (live ? C.key : C.keyD)), C.ink, 4);
      face([[q[3][0], q[3][1]], [q[2][0], q[2][1]], [q[2][0], q[2][1] + 14], [q[3][0], q[3][1] + 14]], C.keyD, null, 2);
    }
    if (rd) {
      // 叩いた数の小さな玉(本数の目安)
      for (var i = 0; i < Math.min(rd.count, 8); i++) game.draw.circle(XB.fl + 20 + i * 34, XB.y1 + 36, 12, rd.over && i === rd.count - 1 ? C.red : C.yel);
    }
  }

  function drawHud() {
    face([[0, 0], [W, 0], [W, 226], [0, 226]], C.navy, null, 8);
    game.draw.rect(0, 222, W, 8, C.ink);
    label('SCORE ' + score, 46, 70, 42, C.white, 'left');
    var w = where();
    label((w.r + 1) + ' / ' + ROUNDS, W / 2, 70, 46, C.yel);
    for (var i = 0; i < MISS_MAX; i++) {
      var x = W - 70 - i * 76, on = i < MISS_MAX - misses;
      face([[x, 46], [x + 24, 70], [x, 94], [x - 24, 70]], on ? C.red : '#4a4a5a', null, 2);
    }
    for (var r = 0; r < ROUNDS; r++) {
      var rx = W / 2 - 250 + r * 100, rd = rounds[r];
      var col = rd && rd.resolved ? (rd.exact ? C.yel : C.red) : '#4a5a7c';
      game.draw.circle(rx, 148, 18, col);
    }
    var progress = Math.max(0, Math.min(1, clock / (BARS * BAR)));
    game.draw.rect(46, 194, W - 92, 12, C.ink);
    game.draw.rect(46, 194, (W - 92) * progress, 12, C.yel);
  }

  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawScene() {
    drawRoom();
    drawBoard();
    drawFront();
    drawRuler();
    drawRep();
    drawXylo();
  }

  function drawResult(showTap) {
    var left = 0;
    for (var r = 0; r < rounds.length; r++) if (!rounds[r].exact) left++;
    face([[60, H * 0.27], [W - 60, H * 0.27], [W - 70, H * 0.62], [70, H * 0.62]], C.navy, won ? C.yel : C.red, 10);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.325, 96, won ? C.yel : C.red);
    label('SCORE ' + score, W / 2, H * 0.39, 56, C.white);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.435, 34, C.chalk);
    label('NICE ' + exacts + ' / ' + ROUNDS, W / 2, H * 0.475, 40, C.yel);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 52, C.yel);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 40, C.chalk);
    if (!won) label('あと' + Math.max(1, left) + '回!', W / 2, H * 0.56, 44, C.yel);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで1回。先生3打+カスタネット1打。奇数周は3つ返してNICE、偶数周はカスタネットまで数えて4つ叩きMISS ----
  var demo = { t: 0, x: W / 2, y: H * 0.88, press: false, pressT: 0, cyc: 0, done: 0 };
  var DEMO_CYC = 2 * BAR + 1.0;
  var DEMO_OK = [0, 2, 4], DEMO_NG = [0, 2, 3, 4];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.done = 0; demo.pressT = 0; }
    if (flashT > 0) flashT -= dt;
    if (repT > 0) repT -= dt;
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var plan = demo.cyc % 2 === 1 ? DEMO_OK : DEMO_NG;
    var target = keyCenter(Math.min(5, demo.done));
    if (demo.done < plan.length) {
      var when = BAR + plan[demo.done] * EIGHTH;
      if (clock >= when - 0.005 && hitStop <= 0) { strike(demo.done); demo.done++; demo.pressT = 0.15; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.x += (target.x - demo.x) * Math.min(1, dt * 10);
    demo.y += (target.y + 30 - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      face([[0, 0], [W, 0], [W, 226], [0, 226]], C.navy, null, 8);
      label(GAME_TITLE, W / 2, 90, 88 + Math.sin(t * 3) * 3, C.yel);
      label('HI-SCORE ' + game.best, W / 2, 178, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.982, 44, C.yel);
      else label('TAP TO START', W / 2, H * 0.982, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (flashT > 0) flashT -= dt;
    if (repT > 0) repT -= dt;
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      face([[0, H * 0.46], [W, H * 0.46], [W, H * 0.54], [0, H * 0.54]], C.navy, null, 6);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.yel);
    }
    // 最初の自分の小節の頭だけ、木琴の上に手を出す
    if (!over && clock > BAR - SPB && clock < BAR + 0.25) {
      var kc = keyCenter(0);
      game.draw.hand(kc.x, kc.y + 30, { press: clock >= BAR - 0.05, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
