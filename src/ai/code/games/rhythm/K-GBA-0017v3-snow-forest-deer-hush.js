// K-GBA-0017v3-snow-forest-deer-hush.js
// 雪森の鹿の群れ — 裏拍で続く群れの足音に乗って歩き、枝の折れる音が鳴った瞬間に群れの誰より早く足を止める
// 操作: 画面を押さえている間、若い鹿が群れと一緒に裏拍で歩く。群れが止まっている間は指を離して待ち、群れが歩き出す裏拍の頭で押す(ずれでPERFECT/GOOD)。枝の折れる音が鳴ったら指を離して止まる(他の鹿より速ければ勝ち)。音の前に離す・誰かより遅い・止まっている間に押すはMISS
// 終わり: 4回の物音を乗り切ればCLEAR(反応の速さ+裏拍の点+残り命)。MISS3回でGAME OVER
// @mechanic: reaction_duel
// @theme: snow_forest_deer_herd_hush
// 世界観: 雪の森を渡る鹿の群れ。若い鹿が裏拍で続く群れの足音に歩調を合わせ、枝の折れる音が森に響いた瞬間、群れの誰より早く立ち止まって耳を澄ます
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・一番に止まれた回数・最速の反応秒・PERFECT/GOOD/MISS数
// スタイル: 70s VECTOR

(function(game) {
  var STYLE = { bg: ['#02040c', '#0a1428'], main: ['#7ff6ff', '#ffb347', '#e8f4ff'], accent: ['#ff5a6e', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。太さ違いの線を重ねて発光させ、面は塗らない
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], cyan: STYLE.main[0], amber: STYLE.main[1], snow: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1], dim: '#2a4a66', far: '#1c3a55', near: '#3f7598', good: '#7dffb0'
  };

  var GAME_TITLE = 'DEER HUSH';
  var BPM = 100, SPB = 60 / BPM;
  var PERFECT_W = 0.07, GOOD_W = 0.15;     // 歩き出し(裏拍の頭)の窓
  var REACT_P = 0.25;                       // 物音(拍の頭)からこの秒以内に止まれば PERFECT
  var RIVAL = [0.40, 0.36, 0.33, 0.31];     // 回ごとの群れで一番速い鹿の反応秒(だんだん速くなる)
  var SPREAD = [0, 0.05, 0.09, 0.14];
  var ROUNDS = 4, LIVES = 3, READY_T = 0.8;
  var TIME_LIMIT = 13.5;
  var GROUND_Y = Math.round(H * 0.6);
  var HERD_X = [900, 730, 560, 390, 220];   // 0=先頭の鹿 / 2=プレイヤーの若い鹿
  var ME = 2;
  var LANE_Y = Math.round(H * 0.7), NOW_X = 300, BEAT_PX = 170;
  var PAD_Y = Math.round(H * 0.775), PAD_H = 360;
  var DEMO_D = [1, 2], DEMO_FROM = 1.6, DEMO_TO = 10.6;
  var DEMO_CYC = (DEMO_TO - DEMO_FROM) * SPB;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 伴奏(オリジナル): 表拍はベースだけ、和音の刻みは裏拍に置く(群れの足音と同じ位置)
  var TUNE = [
    [['R', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['B5', 0.5], ['R', 0.5], ['G5', 0.5]],
    [['R', 0.5], ['F#5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['D6', 0.5], ['R', 0.5], ['A5', 0.5]],
    [['R', 0.5], ['G5', 0.5], ['R', 0.5], ['B5', 0.5], ['R', 0.5], ['E6', 0.5], ['R', 0.5], ['D6', 0.5]],
    [['R', 0.5], ['B5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['F#5', 0.5], ['R', 0.5], ['D#5', 0.5]]
  ];
  var BASS = [
    [['E2', 1], ['B2', 1], ['E2', 1], ['B2', 1]],
    [['D2', 1], ['A2', 1], ['D2', 1], ['A2', 1]],
    [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]],
    [['B2', 1], ['F#2', 1], ['B2', 1], ['B2', 1]]
  ];

  // ---- スプライト(1ドット線の線画。塗りなし) ----
  var ADULT_TOP = [
    '............#..#....',
    '.............#.#....',
    '..............##....',
    '.............#..##..',
    '..............#...#.',
    '..............#.###.',
    '.............#..#...',
    '.##.........#..#....',
    '...#########...#....',
    '..#............#....',
    '..#............#....',
    '...############.....'
  ];
  var ADULT_A = ADULT_TOP.concat(['...#.#......#.#.....', '..#...#....#...#....', '.#.....#..#.....#...', '#.......##.......#..']);
  var ADULT_B = ADULT_TOP.concat(['....#.#.....#.#.....', '....#.#.....#.#.....', '....#.#.....#.#.....', '....#.#.....#.#.....']);
  var FAWN_TOP = [
    '...........#.#..',
    '...........###..',
    '..........#...#.',
    '..........#..###',
    '.........#..#...',
    '.#......#..#....',
    '..#######..#....',
    '..#.o..o...#....',
    '..#...o....#....',
    '...########.....'
  ];
  var FAWN_A = FAWN_TOP.concat(['...#.#...#.#....', '..#...#.#...#...', '.#.....#.....#..']);
  var FAWN_B = FAWN_TOP.concat(['...#.#...#.#....', '...#.#...#.#....', '...#.#...#.#....']);
  var HOOF = ['.##..##.', '#..##..#', '#..##..#', '#..##..#', '.##..##.'];
  var PAL_RIVAL = { '#': STYLE.main[0], o: STYLE.main[0] };
  var PAL_LEAD = { '#': STYLE.main[2], o: STYLE.main[2] };
  var PAL_ME = { '#': STYLE.main[1], o: STYLE.main[2] };
  var PAL_WHITE = { '#': '#ffffff', o: '#ffffff' };

  // ---- 状態 ----
  var rounds, cur, holding, touchN, clock, lastHalf, cuedBar, endBeat, lives, score, nP, nG, nM, wins, fastest;
  var over, won, outroT, hitStop, demoMode, prevBest, scroll, lag, flashT, crackT, feintT, padFlash, graceT, nearText;
  var rankT, rankOrder, lastRt;
  var beatPulse = 0, offPulse = 0;
  var flakes = [];
  for (var fi = 0; fi < 46; fi++) flakes.push({ x: game.random(0, W), y: game.random(0, GROUND_Y), z: game.random(0.3, 1) });

  function shuffle(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); if (j > i) j = i; var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }

  function buildPlan(dl) {
    var out = [], R = 2.5;
    for (var i = 0; i < dl.length; i++) {
      var A = R + 1.5, X = A + dl[i];
      var sp = shuffle(SPREAD);
      var rv = [RIVAL[i] + sp[0], RIVAL[i] + sp[1], 0, RIVAL[i] + sp[2], RIVAL[i] + sp[3]];
      out.push({ R: R, A: A, X: X, feint: (dl[i] === 2 && i > 0) ? A + 1 : -1, rv: rv, best: RIVAL[i], resume: 0, react: 0, rt: -1 });
      R = X + 1.5;
    }
    return out;
  }

  function initRun(demo, dl) {
    demoMode = !!demo;
    rounds = buildPlan(dl || [1].concat(shuffle([1, 2, 2])));
    cur = 0; holding = false; touchN = 0;
    clock = -READY_T; lastHalf = -99; cuedBar = -1;
    endBeat = rounds[rounds.length - 1].X + 1.5;
    lives = LIVES; score = 0; nP = 0; nG = 0; nM = 0; wins = 0; fastest = 9;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    scroll = 0; lag = 0; flashT = 0; crackT = 9; feintT = 9; padFlash = 0; graceT = 0; nearText = '';
    rankT = 0; rankOrder = null; lastRt = -1;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 群れの歩き(拍で決まる) ----
  function deerWalking(k, t) {
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      if (t >= rd.R * SPB && t < rd.X * SPB + rd.rv[k]) return true;
    }
    return false;
  }
  function herdWalkingAtBeat(b) {
    for (var i = 0; i < rounds.length; i++) if (b >= rounds[i].R && b < rounds[i].X) return true;
    return false;
  }
  function meWalking() { return holding && clock >= 0 && !over; }
  function meX() { return HERD_X[ME] + lag; }

  // ---- 判定 ----
  function lose(x, y) {
    nM++;
    if (!demoMode) lives--;
    flashT = 0.3;
    var last = !demoMode && lives <= 0;
    game.feedback.bad(x, y, { text: 'MISS', shake: last ? 16 : (demoMode ? 3 : 8), volume: demoMode ? 0 : 0.5 });
    if (last) { hitStop = 0.45; finish(false); }
  }

  function resolveResume(rd, g) {
    rd.resume = g;
    var x = meX(), y = GROUND_Y - 190;
    if (g === 3) { lose(x, y); return; }
    if (g === 1) nP++; else nG++;
    score += g === 1 ? 100 : 50;
    game.feedback.good(x, y, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.amber : C.cyan, size: g === 1 ? 52 : 44, count: 6, volume: demoMode ? 0 : 0.25 });
  }

  function resolveReact(rd, g, rt, why) {
    rd.react = g; rd.rt = rt;
    cur++; graceT = 0.2; rankT = 1.6; lastRt = rt;
    var x = meX(), y = GROUND_Y - 200;
    // 止まった順(数字だけを鹿の上に出す)
    var times = [];
    for (var k = 0; k < 5; k++) times.push({ k: k, t: k === ME ? (g === 3 ? 99 : rt) : rd.rv[k] });
    times.sort(function(a, b) { return a.t - b.t; });
    rankOrder = [];
    for (var r = 0; r < times.length; r++) rankOrder[times[r].k] = r + 1;
    if (g === 3) {
      if (why === 'flinch') { rankOrder = null; nearText = 'あと' + Math.max(0.01, rd.X * SPB - clock).toFixed(2) + '秒!'; }
      lose(x, y);
      return;
    }
    wins++;
    if (rt < fastest) fastest = rt;
    if (g === 1) nP++; else nG++;
    score += 200 + Math.round((rd.best - rt) * 1000) + (g === 1 ? 100 : 0);
    game.feedback.good(x, y, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.amber : C.cyan, size: g === 1 ? 58 : 46, count: 14, volume: demoMode ? 0 : 0.35 });
    if (!demoMode) game.fx.popup(rt.toFixed(3), x, y - 120, { color: C.snow, size: 44 });
    if (g === 1) sfx('se_powerup', 0.3);
    if (!demoMode && wins === 2) {
      game.fx.popup(wins + ' / ' + ROUNDS, 540, 380, { color: C.amber, size: 72 });
      sfx('se_milestone', 0.45);
    }
  }

  function pressDown() {
    holding = true; padFlash = 0.15;
    if (over) return;
    tone(520, 0.04, { wave: 'triangle', volume: 0.08 });
    var rd = rounds[cur];
    if (!rd || rd.resume) return;
    var target = rd.R * SPB, ad = Math.abs(clock - target);
    if (ad <= GOOD_W) { resolveResume(rd, ad <= PERFECT_W ? 1 : 2); return; }
    if (clock < target) {
      if (graceT > 0 || clock < 0.25 * SPB) return;     // 止まった直後の触れ直し・前ノリ中は見逃す
      resolveResume(rd, 3);                              // 群れが止まっている間に動いた
    }
  }

  function releaseUp() {
    holding = false;
    if (over) return;
    var rd = rounds[cur];
    if (!rd || !rd.resume || rd.react) return;
    var X = rd.X * SPB;
    if (clock < X) { resolveReact(rd, 3, -1, 'flinch'); return; }   // 物音の前に止まった(フライング)
    var rt = clock - X;
    if (rt > rd.best) resolveReact(rd, 3, -1, 'slow');
    else resolveReact(rd, rt <= REACT_P ? 1 : 2, rt);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 640 + (i % 2) * 140, { color: [C.cyan, C.amber, C.snow][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.cyan, 0.12);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, firstStops: wins, rounds: ROUNDS, fastest: fastest < 9 ? +fastest.toFixed(3) : null, perfect: nP, good: nG, miss: nM };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.amber, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック(半拍刻み): 表拍=小さな刻み、裏拍=群れの足音。物音・予告は拍の頭に乗る
  function beatClock() {
    var nb = Math.floor((clock + 0.06) / (4 * SPB));
    if (!demoMode && nb > cuedBar && nb >= 0 && nb * 4 < endBeat) {
      cuedBar = nb;
      var i = nb % TUNE.length;
      game.audio.melody(TUNE[i], { tempo: BPM, wave: 'square', volume: 0.03, bass: BASS[i], bassVolume: 0.08 });
    }
    var hb = Math.floor(clock / (SPB / 2));
    if (hb === lastHalf) return;
    lastHalf = hb;
    if (clock < 0) return;
    var b = hb / 2;
    if (hb % 2 === 0) {
      beatPulse = 1;
      tone(1400, 0.02, { wave: 'square', volume: 0.025 });
    } else {
      offPulse = 1;
      if (herdWalkingAtBeat(b)) tone(130, 0.07, { wave: 'triangle', volume: 0.16 });
      if (meWalking()) tone(196, 0.05, { wave: 'triangle', volume: 0.1 });
    }
    for (var i2 = 0; i2 < rounds.length; i2++) {
      var rd = rounds[i2];
      if (b === rd.A) tone('A6', 0.06, { wave: 'triangle', volume: 0.06, slide: 300 });          // 先頭の鹿が耳を立てる(予告)
      if (b === rd.feint) { feintT = 0; tone(200, 0.16, { wave: 'triangle', volume: 0.12, slide: -120 }); }  // 枝の雪が落ちるだけ
      if (b === rd.X) {
        crackT = 0;
        tone(2400, 0.06, { wave: 'square', volume: 0.12, slide: -2000 });
        tone(110, 0.12, { wave: 'sawtooth', volume: 0.12 });
      }
      if (b === rd.X + 0.5) tone('E6', 0.04, { wave: 'square', volume: 0.05 });                 // 尾を振る=次の裏拍で歩き出す
    }
  }

  function stepRun(dt) {
    clock += dt;
    if (flashT > 0) flashT -= dt;
    if (graceT > 0) graceT -= dt;
    if (padFlash > 0) padFlash -= dt;
    if (rankT > 0) rankT -= dt;
    crackT += dt; feintT += dt;
    beatClock();
    var herd = deerWalking(0, clock), mine = meWalking();
    if (herd) scroll += 150 * dt;
    if (mine && !herd) lag += 90 * dt;
    else if (!mine && herd) lag -= 90 * dt;
    else lag += (0 - lag) * Math.min(1, dt * 1.5);
    lag = Math.max(-75, Math.min(75, lag));
    if (over) return;
    var rd = rounds[cur];
    if (rd && !rd.resume && clock > rd.R * SPB + GOOD_W) resolveResume(rd, 3);   // 歩き出しに遅れた
    if (over) return;
    rd = rounds[cur];
    if (rd && rd.resume && !rd.react && clock >= rd.X * SPB) {
      if (!holding) resolveReact(rd, 3, -1, 'idle');
      else if (clock > rd.X * SPB + rd.best) resolveReact(rd, 3, -1, 'slow');      // 誰かが先に止まった
    }
    if (over) return;
    if ((cur >= ROUNDS && clock > rounds[ROUNDS - 1].X * SPB + 0.9) || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true, DEMO_D); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || hitStop > 0) return;
    touchN++;
    game.fx.burst(x, y, { color: C.cyan, count: 3, speed: 80 });
    if (touchN === 1) pressDown();
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (touchN <= 0) return;
    touchN--;
    if (touchN === 0) { game.fx.burst(x, y, { color: C.amber, count: 2, speed: 60 }); releaseUp(); }
  });

  // ---- 描画(線だけ) ----
  function vline(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '30', w * 3.4);
    game.draw.line(x1, y1, x2, y2, col + '80', w * 1.9);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function vring(x, y, r, col, w, n) {
    n = n || 24;
    var px = x + r, py = y;
    for (var i = 1; i <= n; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      vline(px, py, nx, ny, col, w);
      px = nx; py = ny;
    }
  }
  function vrect(x, y, w, h, col, lw) {
    vline(x, y, x + w, y, col, lw); vline(x + w, y, x + w, y + h, col, lw);
    vline(x + w, y + h, x, y + h, col, lw); vline(x, y + h, x, y, col, lw);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: col + '50', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function sprite(art, pal, x, y, px, white) {
    var p = white ? PAL_WHITE : pal;
    game.draw.sprite(art, p, x, y, px * 1.18, { anchor: 'center', alpha: 0.22 });
    game.draw.sprite(art, p, x, y, px, { anchor: 'center' });
  }

  function drawSky() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, C.bg0], [1, '#000000']]);
    vring(170, 330, 62, C.snow, 2, 20);
    vline(150, 300, 190, 360, C.dim, 2);
    for (var s = 0; s < 14; s++) {
      var sx = (s * 263 + 90) % W, sy = 260 + (s * 97) % 300;
      vline(sx - 4, sy, sx + 4, sy, C.snow, 1.5);
    }
  }

  function tree(x, top, col, lw, seed) {
    vline(x, top, x, GROUND_Y, col, lw);
    for (var b = 0; b < 4; b++) {
      var by = top + 60 + b * 95, len = 70 + ((seed + b) % 3) * 30, dir = (b + seed) % 2 ? 1 : -1;
      vline(x, by + 40, x + dir * len, by, col, lw * 0.8);
      vline(x + dir * len * 0.4, by + 18, x + dir * len, by - 4, C.snow + '', lw * 0.5);
    }
  }

  function drawForest() {
    var span = 1500;
    for (var i = 0; i < 6; i++) {
      var x = ((i * 260 - scroll * 0.35) % span + span) % span - 200;
      tree(x, 420 + (i % 3) * 40, C.far, 2, i);
    }
    for (var j = 0; j < 4; j++) {
      var x2 = ((j * 380 + 120 - scroll) % span + span) % span - 200;
      tree(x2, 340 + (j % 2) * 60, C.near, 3, j + 1);
    }
    // 雪原の地面(流れる線)
    vline(0, GROUND_Y, W, GROUND_Y, C.snow, 2);
    for (var g = 0; g < 7; g++) {
      var gx = ((g * 190 - scroll * 1.4) % 1330 + 1330) % 1330 - 120;
      vline(gx, GROUND_Y + 40 + (g % 3) * 34, gx + 90, GROUND_Y + 40 + (g % 3) * 34, C.dim, 2);
    }
  }

  // 物音の枝(右上)と、雪が落ちるだけの枝(左上)
  function drawSignalTrees() {
    var tx = 960;
    vline(tx, 250, tx, GROUND_Y, C.near, 4);
    if (crackT < 1.2) {
      var fall = crackT * crackT * 900;
      vline(tx, 470, tx - 90, 440, C.near, 4);
      vline(tx - 90, 440 + fall, tx - 220, 400 + fall, C.snow, 4);
      if (crackT < 0.35) {
        var r = 40 + crackT * 500;
        vring(tx - 90, 440, r, C.white, 3, 18);
        vline(tx - 120, 380, tx - 80, 430, C.white, 4); vline(tx - 80, 430, tx - 130, 460, C.white, 4); vline(tx - 130, 460, tx - 70, 500, C.white, 4);
      }
    } else {
      vline(tx, 470, tx - 220, 400, C.near, 4);
      vline(tx - 60, 450, tx - 200, 402, C.snow, 2);
    }
    var fx = 120;
    vline(fx, 300, fx, GROUND_Y, C.far, 3);
    vline(fx, 520, fx + 170, 470, C.far, 3);
    if (feintT < 1.0) {
      for (var d = 0; d < 6; d++) {
        var dy = 470 + feintT * feintT * 1100 + d * 14, dx = fx + 110 + (d % 3) * 18;
        if (dy < GROUND_Y) vline(dx - 6, dy, dx + 6, dy, C.snow, 3);
      }
      if (feintT < 0.3) vring(fx + 130, 470, 30 + feintT * 200, C.dim, 2, 14);
    } else {
      for (var e = 0; e < 3; e++) vline(fx + 100 + e * 22, 468 - e * 6, fx + 114 + e * 22, 468 - e * 6, C.snow, 3);
    }
  }

  function alertOn() {
    var b = clock / SPB;
    for (var i = 0; i < rounds.length; i++) if (b >= rounds[i].A && b < rounds[i].X + 0.05) return true;
    return false;
  }

  function drawHerd() {
    var stepF = Math.floor(clock / SPB + 0.5) % 2;
    for (var k = 4; k >= 0; k--) {
      if (k === ME) continue;
      var walk = clock >= 0 && deerWalking(k, clock);
      var art = walk ? (stepF ? ADULT_A : ADULT_B) : ADULT_B;
      var bob = walk ? (stepF ? -4 : 0) : 0;
      sprite(art, k === 0 ? PAL_LEAD : PAL_RIVAL, HERD_X[k], GROUND_Y - 64 + bob, 8, false);
      if (rankT > 0 && rankOrder) label(String(rankOrder[k]), HERD_X[k] + 40, GROUND_Y - 190, 40, C.cyan);
    }
    // 先頭の鹿の耳立て(物音の予告)
    if (alertOn() && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      var hx = HERD_X[0] + 50, hy = GROUND_Y - 150;
      vline(hx - 30, hy - 30, hx - 40, hy - 70, C.red, 3);
      vline(hx, hy - 34, hx, hy - 78, C.red, 3);
      vline(hx + 30, hy - 30, hx + 40, hy - 70, C.red, 3);
    }
    // プレイヤーの若い鹿
    var mw = meWalking();
    var white = hitStop > 0 || flashT > 0.15;
    var mx = meX();
    var px = white ? 9.6 : 8;
    sprite(mw ? (stepF ? FAWN_A : FAWN_B) : FAWN_B, PAL_ME, mx, GROUND_Y - 52 + (mw && stepF ? -4 : 0), px, white);
    if (white) vring(mx, GROUND_Y - 60, 110, C.white, 3, 20);
    if (rankT > 0 && rankOrder) label(String(rankOrder[ME]), mx + 34, GROUND_Y - 170, rankOrder[ME] === 1 ? 64 : 44, rankOrder[ME] === 1 ? C.amber : C.red);
  }

  // 反応の物差し: 物音(拍の頭)から止まるまでの秒。群れの鹿の印と自分の印を並べる
  function drawMeter() {
    if (rankT <= 0) return;
    var rd = rounds[cur - 1];
    if (!rd) return;
    var x0 = 140, x1 = 940, y = 300, span = 0.6;
    vline(x0, y, x1, y, C.dim, 2);
    vline(x0, y - 24, x0, y + 24, C.white, 3);
    var pxs = function(t) { return x0 + Math.min(1, t / span) * (x1 - x0); };
    vline(pxs(REACT_P), y - 14, pxs(REACT_P), y + 14, C.amber + '', 2);
    for (var k = 0; k < 5; k++) {
      if (k === ME) continue;
      var xx = pxs(rd.rv[k]);
      vline(xx, y - 30, xx, y + 30, C.cyan, 3);
    }
    if (lastRt >= 0) {
      var mx = pxs(lastRt);
      vline(mx, y - 46, mx, y + 46, C.amber, 5);
      label(lastRt.toFixed(3), mx, y - 80, 36, C.amber);
    }
  }

  function drawLane() {
    var y = LANE_Y, bNow = clock / SPB;
    vline(60, y, W - 60, y, C.dim, 2);
    var h0 = Math.floor(bNow * 2) - 4;
    for (var hb = h0; hb < h0 + 16; hb++) {
      var b = hb / 2, x = NOW_X + (b - bNow) * BEAT_PX;
      if (x < 60 || x > W - 60 || b < 0) continue;
      if (hb % 2 === 0) vline(x, y - 12, x, y + 12, C.dim, 3);
      else {
        var col = herdWalkingAtBeat(b) ? C.cyan : C.dim;
        vline(x - 16, y - 22, x, y + 2, col, 3); vline(x + 16, y - 22, x, y + 2, col, 3);
      }
    }
    // 物音が来うる区間(耳立ての後だけ赤く出る)
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      if (bNow >= rd.A && !rd.react) {
        var xa = Math.max(60, NOW_X + (rd.A + 0.5 - bNow) * BEAT_PX), xb = Math.min(W - 60, NOW_X + (rd.A + 2 - bNow) * BEAT_PX);
        if (xb > xa && Math.floor(game.time.elapsed * 8) % 2 === 0) vline(xa, y + 30, xb, y + 30, C.red, 4);
      }
    }
    var cr = rounds[cur];
    if (cr && !cr.resume) {
      var xr = NOW_X + (cr.R - bNow) * BEAT_PX;
      if (xr > 60 && xr < W - 60) vring(xr, y - 8, 34, C.amber, 3, 16);
    }
    vline(NOW_X, y - 56, NOW_X, y + 46, C.snow, 3 + offPulse * 3);
  }

  function drawPad() {
    var on = holding && state === S.PLAYING;
    var col = padFlash > 0 ? C.white : (on ? C.amber : C.near);
    vrect(80, PAD_Y, W - 160, PAD_H, col, 3);
    vrect(100, PAD_Y + 20, W - 200, PAD_H - 40, col + '', 1.5);
    sprite(HOOF, { '#': on ? C.amber : C.cyan }, 540, PAD_Y + PAD_H / 2, 22, false);
    // 歩き出しの裏拍へ近づく輪
    var cr = rounds[cur];
    if (cr && !cr.resume && !over) {
      var lead = cr.R * SPB - clock;
      if (lead > 0 && lead < SPB * 1.4) vring(540, PAD_Y + PAD_H / 2, 110 + lead / (SPB * 1.4) * 170, C.amber, 3, 24);
    }
    if (on && meWalking()) {
      var ph = (clock / SPB) % 1;
      for (var c = 0; c < 3; c++) {
        var cx = 760 + c * 50 + ph * 30;
        vline(cx, PAD_Y + PAD_H / 2 - 30, cx + 24, PAD_Y + PAD_H / 2, C.amber, 3);
        vline(cx + 24, PAD_Y + PAD_H / 2, cx, PAD_Y + PAD_H / 2 + 30, C.amber, 3);
      }
    }
  }

  function drawFlakes(dt) {
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += (50 + f.z * 120) * dt;
      f.x -= (deerWalking(0, clock) ? 60 * f.z : 0) * dt;
      if (f.y > GROUND_Y) { f.y = 200; f.x = game.random(0, W); }
      if (f.x < 0) f.x += W;
      vline(f.x - 3 * f.z, f.y, f.x + 3 * f.z, f.y, C.snow, 1.5 + f.z);
    }
  }

  function drawHud() {
    vline(30, 230, W - 30, 230, C.dim, 2);
    label('SCORE ' + score, 40, 64, 40, C.snow, 'left');
    for (var i = 0; i < LIVES; i++) sprite(HOOF, { '#': i < lives ? C.amber : C.dim }, W - 70 - i * 90, 64, 7, false);
    sprite(FAWN_B, PAL_ME, W / 2 - 90, 72, 3, false);
    label(wins + ' / ' + ROUNDS, W / 2 + 30, 70, 40, C.amber);
    // 拍の点: 表拍は小さく、裏拍は大きく(足音の位置)
    var hb = Math.floor(clock / (SPB / 2));
    for (var d = 0; d < 8; d++) {
      var on = clock >= 0 && ((hb % 8) + 8) % 8 === d;
      var x = W / 2 - 245 + d * 70, off = d % 2 === 1;
      if (off) vring(x, 160, (on ? 18 + offPulse * 6 : 14), on ? C.cyan : C.dim, 2, 12);
      else vline(x - 6, 160, x + 6, 160, on ? C.snow : C.dim, 3);
    }
  }

  function drawScene(dt) {
    drawSky();
    drawForest();
    drawSignalTrees();
    drawHerd();
    drawMeter();
    drawFlakes(dt);
    drawLane();
    drawPad();
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    vrect(70, top, W - 140, H * 0.4, won ? C.cyan : C.red, 3);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 92, won ? C.cyan : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, C.snow);
    sprite(FAWN_B, PAL_ME, W / 2 - 130, H * 0.418, 4, false);
    label(wins + ' / ' + ROUNDS, W / 2 + 30, H * 0.418, 46, C.amber);
    label(fastest < 9 ? fastest.toFixed(3) : '-.---', W / 2, H * 0.462, 44, C.cyan);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.505, 34, C.snow);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 56, C.amber);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 42, C.snow);
    if (!won) label(nearText || ('あと' + Math.max(1, ROUNDS - wins) + '回!'), W / 2, H * 0.595, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.64, 34, C.snow);
  }

  // ---- ATTRACT: 実ロジックで裏拍に押して歩き、物音で離して一番に止まる。次は雪が落ちただけの音で離してMISSになる失敗例 ----
  var demo = { t: 0, i: 0, acts: [] };
  function demoReset() {
    initRun(true, DEMO_D);
    clock = DEMO_FROM * SPB; lastHalf = Math.floor(clock / (SPB / 2));
    var r0 = rounds[0], r1 = rounds[1];
    demo.acts = [
      { t: r0.R * SPB, k: 1 }, { t: r0.X * SPB + 0.2, k: 0 },
      { t: r1.R * SPB, k: 1 }, { t: r1.feint * SPB + 0.12, k: 0 }
    ];
    demo.i = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    while (demo.i < demo.acts.length && clock >= demo.acts[demo.i].t) {
      if (demo.acts[demo.i].k === 1) pressDown(); else releaseUp();
      demo.i++;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    offPulse = Math.max(0, offPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true, DEMO_D);
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(560, PAD_Y + (holding ? 190 : 110), { press: holding, scale: 14 });
      label(GAME_TITLE, W / 2, 88, 92 + Math.sin(t * 3) * 3, C.cyan);
      label('HI-SCORE ' + game.best, W / 2, 180, 36, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.43, 54, C.amber);
      else label('TAP TO START', W / 2, H * 0.43, 48, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
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

    drawScene(hitStop > 0 ? 0 : dt);
    drawHud();
    if (clock < 0) label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.43, 100, C.amber);
    // 開始時お手本: 最初の歩き出しの裏拍で押さえる手
    var r0 = rounds[0];
    if (!over && !r0.resume && clock > (r0.R - 1.2) * SPB) {
      var down = clock >= r0.R * SPB - 0.05;
      game.draw.hand(560, PAD_Y + (down ? 190 : 110), { press: down, scale: 13, alpha: 0.75 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true, DEMO_D);
    demo.t = 0;
  });
})(game);
