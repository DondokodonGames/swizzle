// K-DS-0019v3-shallow-sea-raft-stomp.js
// いかだの踏ん張り — 跳ねる拍に乗って左右から寄せる波を、同じ側の足で踏み返して傾くいかだを真ん中に保つ
// 操作: 画面を横に4つに分けた足場(左外・左内・右内・右外)を押して踏む。波は左右の端から近づき、拍の頭か跳ねた裏(拍の2/3)にいかだへ当たって、来た側を持ち上げる。当たる拍の点で、波が来た側の足場を踏めば打ち消せる(ずれでPERFECT/GOOD)。大きい波(高い白波)は外側、小さい波は内側で踏むと丸ごと消える(内外を取り違えると半分残る)。反対側を踏むと傾きが倍になりMISS。波の無い拍の点で踏むと、その側が少し沈む(傾きの立て直し)。拍の点から外れた踏みは揺れるだけ
// 終わり: 7小節(約16秒・21波)を落ちずに踏ん張ればCLEAR(判定と水平を保った割合でスコア)。傾きが限界を越えて海に落ちたらGAME OVER
// @mechanic: balance
// @theme: shallow_sea_raft_castaway_play
// 世界観: 夏休みの遠浅の海で、漂流ごっこをする子が手作りのいかだの上に立ち、左右から寄せる波に合わせて足を踏み鳴らし、傾くいかだを真ん中に保って浜に流れ着くまで踏ん張る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・水平を保てた割合・最大コンボ
// スタイル: 90s LOW POLY

(function (game) {
  var STYLE = { bg: ['#9fd3e6', '#e3eef0'], main: ['#2f7fb5', '#c98e4e', '#f4f1e6'], accent: ['#ff6a3d', '#ffe14d'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line。頂点は毎フレーム少し揺れ、遠景はフォグ色に沈む
  var SKY = STYLE.bg[0], FOG = STYLE.bg[1];
  var SEA = STYLE.main[0], LOG = STYLE.main[1], FOAM = STYLE.main[2];
  var CORAL = STYLE.accent[0], SUN = STYLE.accent[1];
  var INK = '#16324a';

  var TITLE = 'RAFT STOMP';
  var BPM = 104;
  var SPB = 60 / BPM;            // 1拍 約0.577秒
  var SW = 2 / 3;                // 跳ねた裏
  var LEAD = 0.06;
  var BARS = 7;
  var TIME_LIMIT = 16;           // 28拍 = 16.2秒。放置でも READY 0.8 + 16.2 + 余韻 1.7 = 18.7秒で終わる
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var WAVE_LEAD = 0.72;          // 波が端から当たるまで(予告)
  var PUSH = [0, 0.22, 0.4];     // 波の大きさごとの傾き
  var TRIM = 0.07;               // 波の無い拍の点で踏んだときの立て直し
  var DRIFT = 0.35;              // 傾きは放っておくと少しずつ大きくなる
  var MAX_ANGLE = 0.42;          // 傾き1.0 = 約24度で落ちる
  var STOP = 0.35, FALL_STOP = 0.55;
  var RAFT_X = 540, RAFT_Y = 1130, HALF = 320;
  var HORIZON = 760;
  var PAD_Y = Math.round(H * 0.86);
  var PAD_X = [135, 405, 675, 945];
  var MARK_X = [-250, -110, 110, 250];

  // 波: [拍(裏は +SW), 来る側, 大きさ]。後半は頭と裏の組、終盤は裏→次の頭の短い組
  var WAVES = [
    [2, 'L', 1], [4, 'R', 1], [6, 'L', 2],
    [8, 'R', 2], [9 + SW, 'L', 1], [11, 'R', 1],
    [12, 'L', 2], [13 + SW, 'R', 1], [15, 'L', 1],
    [16, 'R', 2], [16 + SW, 'L', 1], [18, 'R', 1], [18 + SW, 'L', 1],
    [20, 'L', 2], [20 + SW, 'R', 1], [21 + SW, 'L', 1], [22, 'R', 1],
    [24, 'R', 2], [24 + SW, 'L', 1], [25 + SW, 'R', 1], [26, 'L', 2]
  ];
  var DEMO_WAVES = [[2, 'L', 1], [3 + SW, 'R', 2], [5, 'L', 1], [6 + SW, 'R', 1]];
  var DEMO_PLAN = [1, 3, 2, 2];   // デモが踏む足場(0..3)。3つ目は反対側を踏んでしまう失敗例

  // 伴奏(オリジナル): 跳ねるシャッフル。頭は長いベース、裏は短い合いの手
  var MEL = [
    ['G4', 'B4', 'D5', 'B4', 'E5', 'D5', 'B4', 'A4'],
    ['G4', 'D5', 'G5', 'E5', 'D5', 'B4', 'A4', 'B4'],
    ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'C5'],
    ['D5', 'F#5', 'A5', 'F#5', 'G5', 'E5', 'D5', 'B4'],
    ['G4', 'B4', 'D5', 'G5', 'E5', 'D5', 'B4', 'D5'],
    ['C5', 'E5', 'A5', 'G5', 'D5', 'F#5', 'A5', 'F#5'],
    ['G5', 'D5', 'B4', 'G4', 'G4', 'G4', 'G4', 'G4']
  ];
  var ROOT = [['G2', 'D3'], ['G2', 'D3'], ['C3', 'G2'], ['D3', 'A2'], ['G2', 'D3'], ['C3', 'D3'], ['G2', 'G2']];

  // ---- スプライト: 紙の帽子をかぶった漂流ごっこの子 ----
  var KID = ['...pp.....', '..pppp....', '.pppppp...', '..hhhh....', '..ssss....', '..sKsK....', '..ssss....', '.bwbwbw...', 'sbwbwbws..', 's.wbwbw.s.', '..nnnn....', '..n..n....', '..s..s....', '.ss..ss...'];
  var KID_L = ['...pp.....', '..pppp....', '.pppppp...', '..hhhh....', '..ssss....', '..sKsK....', '..ssss....', '.bwbwbw.s.', 'sbwbwbws..', '..wbwbw...', '..nnnn....', 'nn...n....', 's....s....', '....ss....'];
  var KID_R = ['...pp.....', '..pppp....', '.pppppp...', '..hhhh....', '..ssss....', '..sKsK....', '..ssss....', 's.bwbwbw..', '.sbwbwbws.', '...wbwbw..', '...nnnn...', '...n...nn.', '...s....s.', '...ss.....'];
  var KID_WOB = ['...pp.....', '..pppp....', '.pppppp...', 's.hhhh..s.', '.sssss.s..', '..sKsK....', '..ssss....', '.bwbwbw...', '.bwbwbw...', '..wbwbw...', '..nnnn....', '.n....n...', '.s....s...', 'ss....ss..'];
  var KPAL = { p: '#f4f1e6', h: '#3a2a1a', s: '#f2c18e', K: '#16324a', b: '#2f6fb0', w: '#f4f1e6', n: '#c0563a' };
  var KWHITE = { p: '#ffffff', h: '#ffffff', s: '#ffffff', K: '#ffffff', b: '#ffffff', w: '#ffffff', n: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, waves, running, songT, beatN, schedBar, readyT, beatPulse, andPulse;
  var tilt, shown, frozen, stopT, fallT, fallen, badPending, badX, judgeW, judgeT, stompCol, stompT, padFlash;
  var score, perfects, goods, misses, combo, maxCombo, levelT, playT, over, won, outroT, prevBest, milestone;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = demoMode ? DEMO_WAVES : WAVES;
    waves = [];
    for (var i = 0; i < src.length; i++) {
      var b = src[i][0];
      waves.push({ t: b * SPB, side: src[i][1], size: src[i][2], off: b - Math.floor(b) > 0.01, warned: false, hitDone: false, answered: false, missed: false, pressed: false });
    }
    running = false; songT = 0; beatN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0; andPulse = 0;
    tilt = 0; shown = 0; frozen = -1; stopT = 0; fallT = 0; fallen = false; badPending = false; badX = RAFT_X;
    judgeW = ''; judgeT = 0; stompCol = -1; stompT = 0; padFlash = [0, 0, 0, 0];
    score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; levelT = 0; playT = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = 0;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function playBar(n) {
    if (demoMode) return;
    var m = MEL[n % MEL.length], r = ROOT[n % ROOT.length], mel = [], bass = [];
    var last = n === BARS - 1;
    for (var i = 0; i < 4; i++) {
      if (last && i >= 2) { mel.push(['G4', 2]); bass.push(['G2', 2]); break; }
      mel.push([m[i * 2], SW]); mel.push([m[i * 2 + 1], 1 - SW]);
      bass.push([r[i % 2], SW]); bass.push(['R', 1 - SW]);
    }
    game.audio.melody(mel, { tempo: BPM, wave: 'triangle', volume: 0.05, bass: bass, bassWave: 'sine', bassVolume: 0.11 });
  }

  // ---- 拍クロック(1本だけ)。ヒットストップ中も止めない ----
  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < BARS && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (beatN + 1) * SPB) {
      beatN++; beatPulse = 1;
      sfx(beatN % 4 === 0 ? 1175 : 880, 0.02, { wave: 'square', volume: beatN % 4 === 0 ? 0.03 : 0.018 });
    }
    var ph = songT / SPB - Math.floor(songT / SPB);
    if (ph >= SW && ph < SW + 0.1 && andPulse < 0.5) andPulse = 1;
  }

  function nearestGrid(T) {
    var k = Math.floor(T / SPB);
    var cands = [k, k + SW, k + 1, k - 1 + SW];
    var best = 0, bd = 99;
    for (var i = 0; i < cands.length; i++) { var d = Math.abs(T - cands[i] * SPB); if (d < bd) { bd = d; best = cands[i] * SPB; } }
    return best;
  }

  function say(word, col) {
    judgeW = word; judgeT = 0.45;
    if (demoMode) game.fx.popup(word, RAFT_X, 700, { color: col, size: 56 });
  }

  function failStop(x) {
    stopT = STOP; frozen = shown; badPending = true; badX = x;
    game.fx.flash('#ffffff', 0.07);
  }

  // ---- 踏む(4つの足場) ----
  function stomp(col) {
    if (!running || over || fallen) return 'none';
    stompCol = col; stompT = 0.18; padFlash[col] = 0.2;
    var side = col < 2 ? 'L' : 'R';
    var big = col === 0 || col === 3;
    var T = songT;
    var g = nearestGrid(T);
    var a = Math.abs(T - g);
    var mx = RAFT_X + MARK_X[col];
    if (a > GOOD_W) {
      // 拍の点から外れた踏み: いかだが少し揺れるだけ
      tilt += (side === 'L' ? -1 : 1) * 0.04;
      sfx(150, 0.06, { wave: 'triangle', volume: 0.04 });
      return 'off';
    }
    var w = null;
    for (var i = 0; i < waves.length; i++) {
      if (!waves[i].answered && !waves[i].missed && Math.abs(waves[i].t - g) < 0.02) { w = waves[i]; break; }
    }
    if (!w) {
      tilt += (side === 'L' ? -1 : 1) * TRIM * (big ? 2 : 1);
      sfx(big ? 196 : 262, 0.08, { wave: 'square', volume: 0.05 });
      game.fx.burst(mx, RAFT_Y, { color: LOG, count: 4, speed: 120 });
      return 'trim';
    }
    w.answered = true;
    var push = PUSH[w.size];
    var dir = w.side === 'L' ? 1 : -1;      // 左の波は左を持ち上げ、右へ傾ける
    if (side !== w.side) {
      // 反対側: 波と同じ向きにもう一押し
      tilt += dir * push;
      misses++; combo = 0;
      say('MISS', CORAL);
      sfx(130, 0.16, { wave: 'sawtooth', volume: 0.06, slide: -40 });
      failStop(mx);
      return 'miss';
    }
    var match = big === (w.size === 2);
    var perfect = match && a <= PERFECT_W;
    var cancel = match ? (perfect ? 1 : 0.85) : 0.5;
    tilt -= dir * push * cancel;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    score += perfect ? 100 + combo * 10 : 50 + combo * 5;
    say(perfect ? 'PERFECT' : 'GOOD', perfect ? SUN : FOAM);
    sfx(perfect ? 784 : 587, 0.1, { wave: 'square', volume: 0.07, slide: big ? -200 : 120 });
    game.fx.burst(mx, RAFT_Y, { color: perfect ? SUN : FOAM, count: perfect ? 12 : 7, speed: 260 });
    if (!demoMode) game.feedback.good(mx, RAFT_Y - 60, { text: null, color: SUN, count: 5, volume: 0.14 });
    if (combo === 8 || combo === 15) {
      if (!demoMode) game.audio.play('se_milestone', 0.4);
      game.fx.popup(combo + ' COMBO', W / 2, 620, { color: SUN, size: 74 });
    }
    return perfect ? 'perfect' : 'good';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (ok) {
      var pct = playT > 0 ? levelT / playT : 0;
      score += 300 + Math.round(pct * 500);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(400, 1100), { color: i % 2 ? SUN : CORAL, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (!running) return;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (andPulse > 0) andPulse = Math.max(0, andPulse - dt * 6);
    if (stompT > 0) stompT -= dt;
    if (judgeT > 0) judgeT -= dt;
    for (var p = 0; p < 4; p++) if (padFlash[p] > 0) padFlash[p] -= dt;
    if (fallen) {
      fallT -= dt;
      if (fallT <= 0 && badPending) {
        badPending = false;
        game.fx.burst(RAFT_X, RAFT_Y + 40, { color: FOAM, count: 24, speed: 480 });
        if (!demoMode) { game.feedback.bad(RAFT_X, RAFT_Y - 120, { text: null, shake: 12 }); finish(false); }
        else game.fx.shake(6, 0.2);
      }
      return;
    }
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      // 予告: 端に白波が立ち、ザッと鳴る
      if (!w.warned && songT >= w.t - WAVE_LEAD) {
        w.warned = true;
        sfx(w.size === 2 ? 320 : 640, 0.16, { wave: 'triangle', volume: 0.04, slide: w.size === 2 ? -160 : -300 });
      }
      // 当たる: 来た側を持ち上げる
      if (!w.hitDone && songT >= w.t) {
        w.hitDone = true;
        tilt += (w.side === 'L' ? 1 : -1) * PUSH[w.size];
        game.fx.burst(w.side === 'L' ? RAFT_X - HALF : RAFT_X + HALF, RAFT_Y + 20, { color: FOAM, count: 6 + w.size * 4, speed: 240 });
      }
      if (!w.answered && !w.missed && songT > w.t + GOOD_W) {
        w.missed = true;
        misses++; combo = 0;
        say('MISS', CORAL);
        sfx(110, 0.14, { wave: 'square', volume: 0.06 });
        failStop(w.side === 'L' ? RAFT_X - HALF + 60 : RAFT_X + HALF - 60);
      }
    }
    tilt += tilt * DRIFT * dt;
    playT += dt;
    if (Math.abs(tilt) < 0.25) levelT += dt;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        frozen = -1;
        if (badPending) {
          badPending = false;
          if (!demoMode) game.feedback.bad(badX, RAFT_Y - 80, { text: null, shake: 7 });
          else game.fx.shake(4, 0.12);
        }
      }
    }
    if (Math.abs(tilt) >= 1) {
      fallen = true; fallT = FALL_STOP; frozen = shown; badPending = true;
      tilt = tilt > 0 ? 1 : -1;
      sfx(90, 0.4, { wave: 'sawtooth', volume: 0.07, slide: -30 });
      game.fx.flash('#ffffff', 0.1);
    }
    var bob = Math.sin(Math.PI * 2 * songT / SPB) * 0.025;
    shown += ((tilt + bob) - shown) * Math.min(1, dt * 10);
    if (demoMode && Math.abs(tilt) > 0.8) tilt *= 0.9;
    if (!demoMode && !over && songT >= waves[waves.length - 1].t + 1.0) finish(true);
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(true);
  }

  // ---- 低ポリ描画 ----
  function tri(ax, ay, bx, by, cx, cy, col, step) {
    var p = [[ax, ay], [bx, by], [cx, cy]].sort(function (u, v) { return u[1] - v[1]; });
    var x0 = p[0][0], y0 = p[0][1], x1 = p[1][0], y1 = p[1][1], x2 = p[2][0], y2 = p[2][1];
    if (y2 - y0 < 1) return;
    var st = step || 2;
    for (var y = Math.floor(y0); y < y2; y += st) {
      var xa = x0 + (x2 - x0) * (y - y0) / (y2 - y0);
      var xb;
      if (y < y1) xb = y1 - y0 < 0.5 ? x1 : x0 + (x1 - x0) * (y - y0) / (y1 - y0);
      else xb = y2 - y1 < 0.5 ? x1 : x1 + (x2 - x1) * (y - y1) / (y2 - y1);
      var l = Math.min(xa, xb), r = Math.max(xa, xb);
      game.draw.rect(l, y, r - l + 1, st, col);
    }
  }
  function quad(a, b, c, d, col, step) { tri(a[0], a[1], b[0], b[1], c[0], c[1], col, step); tri(a[0], a[1], c[0], c[1], d[0], d[1], col, step); }
  function edge(a, b, col, w) { game.draw.line(a[0], a[1], b[0], b[1], col, w || 2); }
  function jit(i, j) { return Math.sin(game.time.elapsed * 31 + i * 7.1 + j * 3.3) * 1.3; }

  function drawSky() {
    game.draw.gradient(0, HORIZON, [[0, '#5fb2d8'], [0.7, SKY], [1, FOG]]);
    game.draw.circle(860, 420, 70, SUN, 0.9);
    // 遠くの岬(フォグに沈む)
    tri(-40, HORIZON, 180, 640 + jit(1, 1), 420, HORIZON, '#a9c9c4', 3);
    tri(260, HORIZON, 420, 690 + jit(2, 1), 600, HORIZON, '#b9d4cf', 3);
    tri(760, HORIZON, 960, 660 + jit(3, 1), 1140, HORIZON, '#a9c9c4', 3);
    game.draw.rect(0, HORIZON - 40, W, 40, FOG, 0.45);
  }

  var ROWS = [HORIZON, 800, 860, 950, 1080, 1260, 1460];
  var ROW_COL = ['#bcdde4', '#8cc3d8', '#5ea7cc', '#3f8fbf', '#2f7fb5', '#256c9e'];
  function drawSea() {
    var t = game.time.elapsed;
    var cols = 6, cw = (W + 120) / (cols - 1);
    var pts = [];
    for (var r = 0; r < ROWS.length; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        var amp = r === 0 ? 0 : 4 + r * 4;
        row.push([-60 + c * cw + jit(c, r), ROWS[r] + Math.sin(t * 1.8 + c * 1.3 + r * 0.9) * amp + jit(r, c)]);
      }
      pts.push(row);
    }
    for (var rr = 0; rr < ROWS.length - 1; rr++) {
      for (var cc = 0; cc < cols - 1; cc++) {
        var a = pts[rr][cc], b = pts[rr][cc + 1], c2 = pts[rr + 1][cc + 1], d = pts[rr + 1][cc];
        var base = ROW_COL[rr];
        var light = (b[1] - a[1]) > 0 ? '#ffffff' : '#000000';
        var st = rr < 2 ? 2 : 3;
        tri(a[0], a[1], b[0], b[1], c2[0], c2[1], base, st);
        tri(a[0], a[1], c2[0], c2[1], d[0], d[1], base, st);
        game.draw.rect(Math.min(a[0], d[0]), Math.min(a[1], b[1]), 6, 2, light, 0.1);
        edge(a, c2, '#ffffff22', 1);
      }
    }
    // フォグ: 水平線ぎわを白っぽく潰す
    game.draw.rect(0, HORIZON, W, 70, FOG, 0.5);
  }

  function rot(x, y, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return [RAFT_X + x * c - y * s, RAFT_Y + x * s + y * c];
  }

  function drawWaves() {
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      var left = w.t - songT;
      if (left > WAVE_LEAD || left < -0.25) continue;
      var p = Math.max(0, Math.min(1, 1 - left / WAVE_LEAD));
      var hgt = (w.size === 2 ? 130 : 72) * (0.5 + p * 0.5) * (left < 0 ? Math.max(0, 1 + left * 4) : 1);
      var edgeX = w.side === 'L' ? RAFT_X - HALF - 40 : RAFT_X + HALF + 40;
      var startX = w.side === 'L' ? -160 : W + 160;
      var x = startX + (edgeX - startX) * p;
      var base = RAFT_Y + 70;
      var wid = w.size === 2 ? 170 : 120;
      var dir = w.side === 'L' ? 1 : -1;
      var crest = [x + dir * wid * 0.25 + jit(i, 2), base - hgt];
      tri(x - wid, base, x + wid, base, crest[0], crest[1], '#4aa3d4', 2);
      tri(crest[0] - dir * 10, crest[1], crest[0] + dir * wid * 0.45, base - hgt * 0.45, crest[0] - dir * wid * 0.25, base - hgt * 0.55, FOAM, 2);
      edge([x - wid, base], crest, '#ffffff', 2);
      edge(crest, [x + wid, base], '#1f5f8a', 2);
    }
  }

  function targetCol(w) { return w.side === 'L' ? (w.size === 2 ? 0 : 1) : (w.size === 2 ? 3 : 2); }

  function drawRaft() {
    var ang = (frozen >= 0 ? frozen : shown) * MAX_ANGLE;
    var bl = rot(-HALF, -40, ang), br = rot(HALF, -40, ang), fr = rot(HALF, 40, ang), fl = rot(-HALF, 40, ang);
    var dfr = rot(HALF, 92, ang), dfl = rot(-HALF, 92, ang);
    // 水面の影
    tri(fl[0] - 20, RAFT_Y + 110, fr[0] + 20, RAFT_Y + 110, RAFT_X, RAFT_Y + 70, '#1d5a85', 3);
    // 前の面(丸太の小口)と上の面
    quad(fl, fr, dfr, dfl, '#8a5a2e', 2);
    quad(bl, br, fr, fl, LOG, 2);
    for (var k = 1; k < 7; k++) {
      var u = -HALF + k * (2 * HALF / 7);
      edge(rot(u, -40, ang), rot(u, 40, ang), '#7a4e26', 3);
      var c = rot(u - HALF / 7, 66, ang);
      game.draw.circle(c[0], c[1], 14, '#d9a868');
    }
    edge(bl, br, '#5a3818', 3); edge(br, fr, '#5a3818', 3); edge(fr, fl, '#5a3818', 3); edge(fl, bl, '#5a3818', 3);
    edge(fl, dfl, '#5a3818', 3); edge(fr, dfr, '#5a3818', 3); edge(dfl, dfr, '#5a3818', 3);
    // 縄の結び目
    for (var r2 = -1; r2 <= 1; r2 += 2) { var kn = rot(r2 * 200, 0, ang); game.draw.circle(kn[0], kn[1], 9, '#e8d6a8'); }
    // 足場の印: 予告中の波の足場は光る(大きい波=外側)
    var glow = [0, 0, 0, 0];
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      if (!w.answered && !w.missed && songT >= w.t - WAVE_LEAD && songT <= w.t + GOOD_W) glow[targetCol(w)] = 1;
    }
    for (var m = 0; m < 4; m++) {
      var mp = rot(MARK_X[m], 6, ang);
      var big = m === 0 || m === 3;
      var rr = big ? 34 : 24;
      if (glow[m]) { game.draw.circle(mp[0], mp[1], rr + 16 + beatPulse * 8, SUN, 0.45); }
      game.draw.circle(mp[0], mp[1], rr, glow[m] ? SUN : '#a8753e');
      game.draw.circle(mp[0], mp[1], rr - 8, stompCol === m && stompT > 0 ? FOAM : '#b9864d');
    }
    // マスト(棒と布の旗)と、拍で光るランタン
    var mb = rot(0, -36, ang), mt = rot(0, -330, ang);
    edge(mb, mt, '#6b4524', 8);
    var flap = Math.sin(songT * 6) * 20;
    var f1 = rot(0, -320, ang), f2 = rot(150, -280 + flap * 0.3, ang), f3 = rot(0, -220, ang);
    tri(f1[0], f1[1], f2[0] + flap, f2[1], f3[0], f3[1], CORAL, 2);
    edge(f1, [f2[0] + flap, f2[1]], '#a33a1e', 2); edge([f2[0] + flap, f2[1]], f3, '#a33a1e', 2);
    var lt = rot(0, -345, ang);
    game.draw.circle(lt[0], lt[1], 18 + beatPulse * 14, SUN, 0.35 + beatPulse * 0.5);
    game.draw.circle(lt[0], lt[1], 10 + andPulse * 8, '#ffffff', 0.4 + andPulse * 0.5);
    // 子ども
    var kp = rot(0, -40, ang);
    var white = stopT > 0 || (fallen && fallT > 0);
    var art = KID;
    if (fallen || Math.abs(shown) > 0.6) art = KID_WOB;
    else if (stompT > 0) art = stompCol < 2 ? KID_L : KID_R;
    var lean = shown * 40;
    var px = white ? 13 : 11;
    var ky = fallen && fallT <= 0 ? kp[1] + 200 : kp[1] - 14 * px / 2 + 4;
    if (!(fallen && fallT <= 0)) game.draw.sprite(art, white ? KWHITE : KPAL, kp[0] + lean, ky, px, { anchor: 'center' });
  }

  function drawGauge() {
    var cx = W / 2, cy = 470, R = 190;
    // 弧(多角形)と赤い限界域
    for (var i = 0; i < 12; i++) {
      var a0 = -Math.PI / 2 - 1.05 + i * 2.1 / 12, a1 = a0 + 2.1 / 12;
      var col = i < 2 || i > 9 ? CORAL : (i < 4 || i > 7 ? SUN : '#7fd18a');
      game.draw.line(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, col, 14);
    }
    var na = -Math.PI / 2 + Math.max(-1, Math.min(1, shown)) * 1.05;
    game.draw.line(cx, cy, cx + Math.cos(na) * (R - 20), cy + Math.sin(na) * (R - 20), INK, 7);
    game.draw.circle(cx, cy, 14, INK);
    // 跳ねる拍の帯: 1拍 = 長い頭 + 短い裏
    var x0 = 300, cw = 120;
    var bi = Math.floor(songT / SPB) % 4, ph = songT / SPB - Math.floor(songT / SPB);
    for (var b = 0; b < 4; b++) {
      var on = running && b === bi;
      game.draw.rect(x0 + b * cw, 520, cw * SW - 8, 22, on && ph < SW ? SUN : '#ffffff', on && ph < SW ? 1 : 0.5);
      game.draw.rect(x0 + b * cw + cw * SW, 520, cw * (1 - SW) - 8, 22, on && ph >= SW ? CORAL : '#ffffff', on && ph >= SW ? 1 : 0.35);
    }
  }

  function drawPads() {
    game.draw.gradient(1460, H, [[0, '#1f5f8a'], [1, '#123c5a']]);
    var glow = [0, 0, 0, 0];
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      if (!w.answered && !w.missed && songT >= w.t - WAVE_LEAD && songT <= w.t + GOOD_W) glow[targetCol(w)] = 1;
    }
    for (var p = 0; p < 4; p++) {
      var x = PAD_X[p], big = p === 0 || p === 3, r = big ? 118 : 96;
      var down = padFlash[p] > 0 ? 8 : 0;
      var pts = [];
      for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2 + 0.39; pts.push([x + Math.cos(a) * r + jit(p, k), PAD_Y + down + Math.sin(a) * r * 0.7]); }
      for (var q = 0; q < 8; q++) {
        var n = (q + 1) % 8;
        tri(x, PAD_Y + down, pts[q][0], pts[q][1], pts[n][0], pts[n][1], glow[p] ? (q % 2 ? SUN : '#f0c93c') : (q % 2 ? '#6fae5a' : '#5e9a4c'), 3);
      }
      for (var e = 0; e < 8; e++) edge(pts[e], pts[(e + 1) % 8], '#2d5a28', 2);
      // 足あと(外側は大きい)
      var fs = big ? 1.3 : 0.9;
      game.draw.circle(x, PAD_Y + down + 8 * fs, 22 * fs, INK, 0.75);
      for (var t2 = 0; t2 < 4; t2++) game.draw.circle(x - 21 * fs + t2 * 14 * fs, PAD_Y + down - 26 * fs, 7 * fs, INK, 0.75);
    }
  }

  function drawScene() {
    drawSky();
    drawSea();
    drawWaves();
    drawRaft();
    drawGauge();
    drawPads();
    if (judgeT > 0) label(judgeW, W / 2, 680, 62, judgeW === 'MISS' ? CORAL : (judgeW === 'PERFECT' ? SUN : FOAM));
  }

  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawHud() {
    label('SCORE ' + score, 50, 92, 50, FOAM, 'left');
    label('BEST ' + prevBest, 50, 156, 32, SUN, 'left');
    var done = 0;
    for (var i = 0; i < waves.length; i++) if (waves[i].answered || waves[i].missed) done++;
    label(done + ' / ' + waves.length, W - 50, 92, 46, FOAM, 'right');
    if (combo >= 2) label(combo + ' COMBO', W - 50, 156, 34, SUN, 'right');
    var prog = Math.min(1, songT / (waves[waves.length - 1].t + 1.0));
    game.draw.rect(0, 222, W, 8, INK, 0.4);
    game.draw.rect(0, 222, W * prog, 8, SUN);
  }

  // ---- ATTRACT: 実ロジックで波の側を踏む。3つ目は反対側を踏んで傾く失敗例 ----
  var demo = { t: 0, hx: PAD_X[1], press: 0 };
  var DEMO_LEN = 8.5 * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.hx = PAD_X[1]; demo.press = 0; }
    var w = null, k = -1;
    for (var i = 0; i < waves.length; i++) if (!waves[i].pressed && !waves[i].missed) { w = waves[i]; k = i; break; }
    if (w) {
      var col = DEMO_PLAN[k];
      if (songT >= w.t - WAVE_LEAD * 0.7) demo.hx += (PAD_X[col] - demo.hx) * Math.min(1, dt * 12);
      if (songT >= w.t + 0.01) { w.pressed = true; stomp(col); demo.press = 0.15; }
    }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var col = Math.max(0, Math.min(3, Math.floor(x / (W / 4))));
    var r = stomp(col);
    if (r === 'off') game.fx.burst(PAD_X[col], PAD_Y, { color: '#5e9a4c', count: 3, speed: 90 });
    else if (r === 'none') game.audio.tone(140, 0.03, { wave: 'triangle', volume: 0.03 });
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
      game.draw.hand(demo.hx, PAD_Y + 10, { press: demo.press > 0, scale: 15 });
      label(TITLE, W / 2, 110, 82 + Math.sin(t * 3) * 3, SUN);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, FOAM);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.75, 50, SUN);
      else label('TAP TO START', W / 2, H * 0.75, 46, FOAM);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(80, H * 0.24, W - 160, H * 0.37, INK, 0.88);
      game.draw.rect(80, H * 0.24, W - 160, 8, won ? SUN : CORAL);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, won ? SUN : CORAL);
      label('SCORE ' + score, W / 2, H * 0.36, 58, FOAM);
      label(Math.round(playT > 0 ? levelT / playT * 100 : 0) + '%', W / 2, H * 0.41, 54, SUN);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.455, 34, FOAM);
      label(maxCombo + ' COMBO', W / 2, H * 0.495, 36, FOAM);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 52, SUN);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, SUN);
      if (!won) {
        var left = 0;
        for (var i = 0; i < waves.length; i++) if (!waves[i].answered && !waves[i].missed) left++;
        label('あと' + Math.max(1, left) + '波', W / 2, H * 0.215, 56, CORAL);
      }
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.59, 36, FOAM);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      stepClock(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, levelPct: Math.round(playT > 0 ? levelT / playT * 100 : 0), maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = 0; beatN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 110, SUN);
    if (over && won) label('FINISH', W / 2, H * 0.44, 100, SUN);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
