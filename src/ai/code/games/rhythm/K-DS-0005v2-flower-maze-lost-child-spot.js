// K-DS-0005v2-flower-maze-lost-child-spot.js
// 花迷路の迷子さがし — 拍の頭ごとに生け垣の陰から次々顔を出す子どもの中から、迷子札と同じ「黄色い帽子+桃色の風車」の一人を見つけ、裏拍でタップする
// 操作: 2拍で1回。拍の頭で生け垣から顔が出て、次の拍の「裏」(半拍後)で消える前に当たりの子の顔をタップする。拍の頭の0.5秒前に生け垣が揺れて出る場所を予告。顔のまわりの輪が縮みきる瞬間が裏拍。違う子・空振り・拍外れ・見逃しはMISS(裏拍から遠い空タップは罰なし)
// 終わり: 10回(約14秒)を終えてMISSが2つ以内ならCLEAR。MISSが3つでGAME OVER。前半は帽子の色だけで見分けられ、中盤は帽子か風車だけが同じ子が混ざり、終盤は裏拍の直前に全員が別の生け垣へ潜り直す
// @mechanic: spot
// @theme: night_flower_maze_lost_child
// 世界観: 夜のライトアップをした花の迷路庭園で、案内係が拍ごとに生け垣の陰から顔を出す子どもたちの中から、迷子札に描かれた迷子の子を見つけ出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 見つけた回数・PERFECT数・最大コンボ・スコア
// スタイル: 80s NEON
(function (game) {
  var STYLE = { bg: ['#05041a', '#160a3a'], main: ['#00f0ff', '#ff2bd6', '#fff23a'], accent: ['#39ff6a', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒のグラデに、外周へ薄い同色を重ねた疑似グロー。点滅で拍を見せる
  var BG0 = STYLE.bg[0], BG1 = STYLE.bg[1];
  var CYAN = STYLE.main[0], MAG = STYLE.main[1], YEL = STYLE.main[2];
  var GRN = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#05041a', HEDGE = '#06281c', HEDGE2 = '#0a3a28', SKIN = '#ffcfa0', MISSC = '#ff3355';

  var GAME_TITLE = 'MAZE FINDER';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SONG_BEATS = 24;
  var TIME_LIMIT = 15;
  var PERF = 0.06, GOODW = 0.12, EDGE = 0.22, LATE = 0.12;
  var LIVES = 3;
  var ROW_Y = [620, 900, 1180];            // 生け垣の天端
  var ROW_S = [0.85, 1.0, 1.15];
  var COL_X = [[260, 540, 820], [200, 540, 880], [170, 540, 910]];
  var TARGET = { cap: YEL, pin: MAG };
  var DECOY_A = [{ cap: CYAN, pin: null }, { cap: WHITE, pin: CYAN }, { cap: GRN, pin: null }, { cap: CYAN, pin: YEL }];
  var DECOY_B = [{ cap: YEL, pin: CYAN }, { cap: CYAN, pin: MAG }, { cap: YEL, pin: null }, { cap: WHITE, pin: MAG }, { cap: GRN, pin: CYAN }];

  // [顔を出す拍, 段階(0=帽子で見分け 1=似た子が混ざる 2=潜り直す), 出る生け垣, 当たりの番号, 潜り直した先]
  var CHART = [
    [4, 0, [1, 3, 8], 1], [6, 0, [0, 5, 7], 2], [8, 0, [2, 4, 6], 0],
    [10, 1, [0, 2, 4, 6, 8], 3], [12, 1, [1, 3, 5, 7, 8], 0], [14, 1, [0, 2, 3, 5, 7], 4], [16, 1, [1, 2, 4, 6, 8], 2],
    [18, 2, [0, 3, 4, 5, 8], 1, [1, 2, 6, 7, 4]], [20, 2, [1, 2, 4, 6, 7], 3, [0, 5, 3, 8, 2]], [22, 2, [0, 2, 5, 6, 8], 0, [4, 7, 1, 3, 5]]
  ];
  // デモ: [.., ゴーストが押す顔の番号]。2回目は帽子だけ同じ子を押してMISS
  var DEMO_CHART = [[4, 0, [2, 4, 6], 1, null, 1], [6, 1, [0, 3, 5, 7, 8], 2, null, 1], [8, 2, [1, 3, 4, 6, 8], 3, [0, 5, 7, 2, 4], 3]];
  var DEMO_BEATS = 12;

  // 夜の庭園の伴奏(独自)。表拍にベースとキック、裏拍に短い和音の刻み(プレイヤーのタップも裏)
  var MEL = [
    [['E5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1]],
    [['C5', 0.5], ['R', 0.5], ['D5', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['E5', 1]],
    [['A5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1]],
    [['D5', 0.5], ['E5', 0.5], ['R', 0.5], ['C5', 0.5], ['B4', 1], ['R', 1]]
  ];
  var BASS = [
    [['A2', 1], ['A2', 1], ['F2', 1], ['G2', 1]],
    [['C3', 1], ['C3', 1], ['G2', 1], ['E2', 1]],
    [['A2', 1], ['E2', 1], ['F2', 1], ['G2', 1]],
    [['D3', 1], ['E3', 1], ['A2', 2]]
  ];

  var FACE = ['..cccccc..', '.cccccccc.', 'cccccccccc', '.hffffffh.', '.fkffffkf.', '.ffffffff.', '.ffmmmmff.', '..ffffff..'];
  var FACE_JOY = ['..cccccc..', '.cccccccc.', 'cccccccccc', '.hffffffh.', '.kkffffkk.', '.ffffffff.', '.fmmmmmmf.', '..ffmmff..'];
  var FACE_OOPS = ['..cccccc..', '.cccccccc.', 'cccccccccc', '.hffffffh.', '.fkffffkf.', '.ffffffff.', '.ffffmfff.', '..ffffff..'];
  var GUIDE = [
    ['....cccc....', '...cccccc...', '..cccccccc..', '...ffffff...', '...fkffkf...', '...ffffff...', '....ffff....', '..jjjjjjjj..',
      '.jjjjyjjjjf.', '.fjjjyjjjj..', '..jjjjjjjj..', '..jjjjjjjj..', '...pp..pp...', '...pp..pp...', '..kk....kk..'],
    ['....cccc....', '...cccccc...', '..cccccccc..', '...ffffff...', '...fkffkf...', '...ffffff...', '....ffff....', '..jjjjjjjj..',
      '.jjjjyjjjj..', '.fjjjyjjjjf.', '..jjjjjjjj..', '..jjjjjjjj..', '...pp..pp...', '...pp..pp...', '..kk....kk..'],
    ['....cccc..f.', '...cccccc.f.', '..cccccccc.f', '...ffffff..j', '...fkffkf.jj', '...ffffff.j.', '....ffff.j..', '..jjjjjjjj..',
      '.jjjjyjjjj..', '.fjjjyjjjj..', '..jjjjjjjj..', '..jjjjjjjj..', '...pp..pp...', '..pp....pp..', '.kk......kk.'],
    ['.f..cccc..f.', '.f.cccccc.f.', '.jcccccccj..', '..jffffffj..', '...fofsof...', '...ffffff...', '....ffff....', '..jjjjjjjj..',
      '..jjjyjjjj..', '..jjjyjjjj..', '..jjjjjjjj..', '..jjjjjjjj..', '...pp..pp...', '...pp..pp...', '..kk....kk..']
  ];
  var GUIDE_PAL = { c: MAG, f: SKIN, k: INK, o: WHITE, s: INK, j: '#2a3a8a', y: YEL, p: '#1a1a40' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltQ, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function glowRect(x, y, w, h, col, a) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, col, 0.12 * (a || 1));
    game.draw.rect(x - 2, y - 2, w + 4, h + 4, col, 0.3 * (a || 1));
    game.draw.rect(x, y, w, h, col, a || 1);
  }

  function slotPos(k) { var row = Math.floor(k / 3), col = k % 3; return { x: COL_X[row][col], y: ROW_Y[row], s: ROW_S[row], row: row }; }

  function newRun(chart, demo) {
    var rounds = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      var faces = [];
      for (var j = 0; j < c[2].length; j++) {
        var dl = c[1] === 0 ? DECOY_A : DECOY_B;
        var look = j === c[3] ? TARGET : dl[(j + i) % dl.length];
        faces.push({ slot: c[2][j], slot2: c[4] ? c[4][j] : c[2][j], look: look, wrong: false });
      }
      rounds.push({ n: c[0], phase: c[1], faces: faces, target: c[3], tPop: c[0] * SPB, tSwap: (c[0] + 1) * SPB, tTap: (c[0] + 1.5) * SPB, tEnd: (c[0] + 2) * SPB,
        res: '', resT: 0, fz: 0, fx: 0, fy: 0, fs: 1, endHalt: false, gFace: c[5] === undefined ? c[3] : c[5], gDone: false, popSnd: false, swapSnd: false });
    }
    return {
      demo: demo, rounds: rounds, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, lastHalf: -1, beatK: -1, halfK: -1, beatT: 0, halfT: 0,
      hits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      poseT: 0, pose: 0, beamT: 0, beamX: 0, beamY: 0
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltQ = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロック(1本) ──
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 3], ['E5', 0.5], ['G5', 0.5]], { tempo: BPM, wave: 'square', volume: 0.04, bass: [['A2', 1], ['A2', 1], ['A2', 1], ['E2', 1]], bassWave: 'triangle', bassVolume: 0.08 });
      return;
    }
    var i = (nb - 1) % MEL.length;
    game.audio.melody(MEL[i], { tempo: BPM, wave: 'square', volume: 0.045, bass: BASS[i], bassWave: 'triangle', bassVolume: 0.085 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var hk = Math.floor(t / (SPB / 2));
    if (hk > r.lastHalf) {
      r.lastHalf = hk; r.halfK = hk;
      var k = Math.floor(hk / 2);
      if (k < r.beats) {
        if (hk % 2 === 0) {
          r.beatK = k; r.beatT = 0.16;
          if (loud) game.audio.tone(72, 0.12, { wave: 'sine', volume: 0.22 });
        } else {
          r.halfT = 0.16;
          if (loud) { game.audio.tone(660, 0.05, { wave: 'square', volume: 0.025 }); game.audio.tone(880, 0.05, { wave: 'square', volume: 0.02 }); }
        }
      }
    }
    for (var i = 0; i < r.rounds.length; i++) {
      var q = r.rounds[i];
      if (!q.popSnd && t >= q.tPop) { q.popSnd = true; if (loud) game.audio.tone(1200, 0.04, { wave: 'triangle', volume: 0.05, slide: 400 }); }
      if (q.phase === 2 && !q.swapSnd && t >= q.tSwap) { q.swapSnd = true; if (loud) game.audio.tone(500, 0.08, { wave: 'triangle', volume: 0.06, slide: 600 }); }
      if (q.res === '' && t > q.tTap + LATE) missRound(r, q, -1, loud);
      if (q.res === 'miss') {
        if (q.fz > 0 && !q.endHalt) {
          q.fz -= dt;
          if (q.fz <= 0) game.feedback.bad(q.fx, q.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
        }
      }
    }
    if (r.beatT > 0) r.beatT -= dt;
    if (r.halfT > 0) r.halfT -= dt;
    if (r.poseT > 0) r.poseT -= dt;
    if (r.beamT > 0) r.beamT -= dt;
  }

  // 顔の今の位置と見えている量(0..1)
  function faceAt(q, f, t) {
    var swapped = q.phase === 2 && t >= q.tSwap;
    var sp = slotPos(swapped ? f.slot2 : f.slot);
    var v = 0;
    if (t >= q.tPop && t < q.tEnd) {
      v = Math.min(1, (t - q.tPop) / 0.1);
      if (q.phase === 2) {
        if (t >= q.tSwap - 0.1 && t < q.tSwap) v = Math.min(v, (q.tSwap - t) / 0.1);
        if (t >= q.tSwap) v = Math.min(1, (t - q.tSwap) / 0.1);
      }
      v = Math.min(v, (q.tEnd - t) / 0.1);
    }
    if (q.res === 'hit' && t >= q.tEnd && t < q.tEnd + 0.4) v = 1 - (t - q.tEnd) / 0.4;
    return { x: sp.x, y: sp.y - 66 * sp.s * Math.max(0, v), s: sp.s, v: Math.max(0, v), row: sp.row };
  }

  function current(r) {
    var t = r.songT;
    for (var i = 0; i < r.rounds.length; i++) {
      var q = r.rounds[i];
      if (q.res === '' && t >= q.tPop) return q;
    }
    return null;
  }

  function hitRound(r, q, d, loud) {
    q.res = 'hit'; q.resT = r.songT;
    var perfect = Math.abs(d) <= PERF;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfects++; else r.goods++;
    var gain = Math.round(((perfect ? 300 : 150) + r.combo * 20) * (q.phase === 0 ? 1 : q.phase === 1 ? 1.2 : 1.5));
    r.score += gain;
    var fp = faceAt(q, q.faces[q.target], r.songT);
    r.pose = 2; r.poseT = 0.4; r.beamT = 0.35; r.beamX = fp.x; r.beamY = fp.y;
    game.feedback.good(fp.x, fp.y - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : CYAN, count: perfect ? 18 : 10, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, fp.x, fp.y - 150, { color: MAG, size: 44 });
    if (loud) game.audio.tone(523 * Math.pow(1.06, Math.min(r.combo, 12)), 0.08, { wave: 'square', volume: 0.05 });
    if (!r.demo && r.hits === 5 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 5', W / 2, H * 0.36, { color: YEL, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missRound(r, q, fi, loud) {
    if (q.res !== '') return;
    var f = q.faces[fi >= 0 ? fi : q.target];
    if (fi >= 0) f.wrong = true;
    var fp = faceAt(q, f, r.songT);
    q.res = 'miss'; q.resT = r.songT; q.fz = 0.35; q.fx = fp.x; q.fy = fp.y; q.fs = fp.s;
    r.misses++; r.combo = 0; r.pose = 3; r.poseT = 0.5;
    if (loud) game.audio.tone(120, 0.16, { wave: 'sawtooth', volume: 0.07, slide: -40 });
    if (!r.demo && r.misses >= LIVES) { q.endHalt = true; halt = 0.5; haltQ = q; }
  }

  // タップ: 押した顔と時刻で判定(裏拍が狙い)
  function tapAt(r, x, y, loud) {
    var q = current(r);
    if (!q || Math.abs(r.songT - q.tTap) > EDGE) {
      if (loud) game.audio.tone(300, 0.04, { wave: 'triangle', volume: 0.04, slide: -100 });
      game.fx.burst(x, y, { color: CYAN, count: 4, speed: 120 });
      return;
    }
    var bi = -1, bd = 1e9;
    for (var j = 0; j < q.faces.length; j++) {
      var fp = faceAt(q, q.faces[j], r.songT);
      var dx = x - fp.x, dy = y - (fp.y + 10 * fp.s);
      var dd = dx * dx + dy * dy, rr = 95 * fp.s;
      if (fp.v > 0.3 && dd <= rr * rr && dd < bd) { bd = dd; bi = j; }
    }
    var d = r.songT - q.tTap;
    if (bi === q.target && Math.abs(d) <= GOODW) hitRound(r, q, d, loud);
    else missRound(r, q, bi, loud);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) run.score += (LIVES - run.misses) * 300;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { found: run.hits, total: CHART.length, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押した瞬間で判定 ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    tapAt(run, x, y, true);
  });
  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで 1回目は当たりを裏拍で、2回目は帽子だけ同じ子を押してMISS、3回目は潜り直した先を追って当てる ──
  var demo = { t: 0, run: null, hx: W / 2, hy: H * 0.86, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var q = current(r);
    var tx = W / 2 + Math.sin(game.time.elapsed * 1.7) * 160, ty = 1060;
    if (q && !q.gDone) {
      var fp = faceAt(q, q.faces[q.gFace], r.songT);
      if (r.songT >= q.tPop + 0.25) { tx = fp.x; ty = fp.y + 20; }
      if (r.songT >= q.tTap) { q.gDone = true; demo.press = 0.16; tapAt(r, fp.x, fp.y + 10, audioOk); }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 10);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──
  function drawBack(r, el) {
    game.draw.gradient(0, H, [[0, BG0], [0.55, BG1], [1, BG0]]);
    for (var s = 0; s < 40; s++) {
      var sx = (s * 263) % W, sy = 240 + (s * 137) % 260;
      var on = (Math.floor(el * 3 + s) % 5) !== 0;
      game.draw.rect(sx, sy, 4, 4, WHITE, on ? 0.8 : 0.2);
    }
    // 迷路の入口のネオンアーチと提灯の紐
    var ax = W / 2, ay = 470;
    for (var a = 0; a <= 16; a++) {
      var an = Math.PI + a / 16 * Math.PI;
      game.draw.rect(ax + Math.cos(an) * 220 - 5, ay + Math.sin(an) * 120 - 5, 10, 10, MAG, (a + Math.floor(el * 6)) % 3 === 0 ? 1 : 0.45);
    }
    for (var l = 0; l < 9; l++) {
      var lx = 60 + l * 120, ly = 300 + Math.sin(l * 0.9) * 18;
      if (l < 8) game.draw.line(lx, ly, lx + 120, 300 + Math.sin((l + 1) * 0.9) * 18, '#3a2a6a', 2);
      var lc = [CYAN, MAG, YEL][l % 3];
      var lit = r && (r.halfK % 3) === l % 3 && r.halfT > 0;
      game.draw.circle(lx, ly + 14, lit ? 22 : 16, lc, lit ? 0.35 : 0.15);
      game.draw.circle(lx, ly + 14, 8, lc, lit ? 1 : 0.6);
    }
    // 床のネオン格子(奥へ収束)
    for (var g = 0; g < 9; g++) {
      var gx = g * 135;
      game.draw.line(W / 2 + (gx - W / 2) * 0.4, 520, gx, H - 380, '#2a1a6a', 2);
    }
    for (var h2 = 0; h2 < 7; h2++) {
      var gy = 520 + Math.pow(h2 / 6, 1.6) * (H - 900);
      game.draw.line(0, gy, W, gy, '#2a1a6a', 2);
    }
  }

  function drawHedge(row, r, el) {
    var y = ROW_Y[row], s = ROW_S[row], hh = 150 * s;
    var x0 = 60 - row * 30, x1 = W - 60 + row * 30;
    game.draw.rect(x0, y, x1 - x0, hh, HEDGE);
    game.draw.rect(x0, y + hh * 0.5, x1 - x0, hh * 0.5, HEDGE2, 0.6);
    // ネオンの縁(疑似グロー)
    glowRect(x0, y - 3, x1 - x0, 6, GRN, 0.9);
    glowRect(x0, y + hh - 3, x1 - x0, 6, GRN, 0.5);
    // 花の点滅
    for (var f = 0; f < 14; f++) {
      var fx = x0 + 30 + f * ((x1 - x0 - 60) / 13), fy = y + 40 * s + ((f * 37) % 60) * s;
      var col = [MAG, YEL, CYAN][(f + row) % 3];
      var on = (Math.floor(el * 4) + f + row) % 4 !== 0;
      game.draw.circle(fx, fy, 14 * s, col, on ? 0.25 : 0.08);
      game.draw.circle(fx, fy, 6 * s, col, on ? 1 : 0.4);
    }
    // 揺れの予告(顔が出る/潜り直す0.5秒前)
    if (!r) return;
    var t = r.songT;
    for (var i = 0; i < r.rounds.length; i++) {
      var q = r.rounds[i];
      var pre = q.tPop - t, pre2 = q.phase === 2 ? q.tSwap - t : 9;
      for (var j = 0; j < q.faces.length; j++) {
        var k = -1;
        if (pre > 0 && pre <= 0.5) k = q.faces[j].slot;
        else if (pre2 > 0 && pre2 <= 0.4 && q.res === '') k = q.faces[j].slot2;
        if (k < 0 || Math.floor(k / 3) !== row) continue;
        var sp = slotPos(k);
        for (var n = 0; n < 6; n++) {
          var jx = sp.x - 60 * s + n * 24 * s + Math.sin(el * 50 + n) * 6;
          game.draw.rect(jx, y - 14 * s - Math.abs(Math.sin(el * 40 + n)) * 10, 10 * s, 14 * s, GRN, 0.9);
        }
      }
    }
  }

  function drawPin(x, y, s, col, el, fast) {
    game.draw.line(x, y, x, y + 90 * s, '#c8c8e0', 4);
    var sp = el * (fast ? 14 : 6);
    for (var b = 0; b < 4; b++) {
      var an = sp + b * Math.PI / 2;
      var px = x + Math.cos(an) * 22 * s, py = y + Math.sin(an) * 22 * s;
      game.draw.rect(px - 11 * s, py - 11 * s, 22 * s, 22 * s, col, 0.35);
      game.draw.rect(px - 8 * s, py - 8 * s, 16 * s, 16 * s, col);
    }
    game.draw.circle(x, y, 6 * s, WHITE);
  }

  function drawFaces(row, r, el) {
    var t = r.songT;
    for (var i = 0; i < r.rounds.length; i++) {
      var q = r.rounds[i];
      if (t < q.tPop || t > q.tEnd + 0.4) continue;
      for (var j = 0; j < q.faces.length; j++) {
        var f = q.faces[j];
        var fp = faceAt(q, f, t);
        if (fp.row !== row || fp.v <= 0) continue;
        var isT = j === q.target;
        var frozen = q.res === 'miss' && (q.fz > 0 || (q.endHalt && halt > 0)) && Math.abs(fp.x - q.fx) < 1 && Math.abs(fp.y - q.fy) < 1;
        var px = 10 * fp.s * (frozen ? 1.4 : 1);
        if (frozen) {
          game.draw.circle(fp.x, fp.y, 110 * fp.s, WHITE, 0.4);
          game.draw.sprite(FACE_OOPS, { c: WHITE, h: WHITE, f: WHITE, k: MISSC, m: MISSC }, fp.x, fp.y, px, { anchor: 'center' });
          continue;
        }
        var spr = q.res === 'hit' && isT ? FACE_JOY : (q.res === 'miss' && (f.wrong || isT) ? FACE_OOPS : FACE);
        if (f.look.pin) drawPin(fp.x + 72 * fp.s, fp.y - 30 * fp.s, fp.s, f.look.pin, el, q.res === 'hit' && isT);
        game.draw.circle(fp.x, fp.y - 10 * fp.s, 62 * fp.s, f.look.cap, 0.14);
        game.draw.sprite(spr, { c: f.look.cap, h: '#3a2a20', f: SKIN, k: INK, m: MAG }, fp.x, fp.y, px, { anchor: 'center' });
        // 裏拍へ縮む輪(タイミングの目印・全員に出る)
        if (q.res === '' && t <= q.tTap + LATE) {
          var a = Math.max(0, (q.tTap - t) / (q.tTap - q.tPop));
          var rr = 62 * fp.s + a * 90 * fp.s;
          for (var n = 0; n < 16; n++) {
            var an = n / 16 * Math.PI * 2;
            game.draw.rect(fp.x + Math.cos(an) * rr - 4, fp.y + Math.sin(an) * rr - 4, 8, 8, CYAN, 0.55);
          }
        }
        if (q.res === 'hit' && isT) game.draw.circle(fp.x, fp.y, 80 * fp.s, YEL, 0.25 + 0.15 * Math.sin(el * 20));
      }
    }
  }

  function drawGuide(r, el) {
    var gx = W / 2, gy = 1600;
    var fr = r.poseT > 0 ? r.pose : Math.floor(el * 2.5) % 2;
    game.draw.rect(gx - 70, gy + 66, 140, 14, MAG, 0.25);
    game.draw.sprite(GUIDE[fr], GUIDE_PAL, gx, gy, 10, { anchor: 'center' });
    // 提灯(拍で揺れる)
    var sw = Math.sin(el * Math.PI * BPM / 60) * 16;
    var lx = gx + 110 + sw, ly = gy - 10;
    game.draw.line(gx + 60, gy - 20, lx, ly - 30, '#c8c8e0', 3);
    game.draw.circle(lx, ly, 46, YEL, r.beatT > 0 ? 0.35 : 0.18);
    game.draw.rect(lx - 18, ly - 26, 36, 52, YEL);
    game.draw.rect(lx - 18, ly - 4, 36, 6, MAG);
    // 見つけた子へ光の線
    if (r.beamT > 0) {
      var a = r.beamT / 0.35;
      for (var n = 0; n < 12; n++) {
        var u = n / 12;
        game.draw.rect(lx + (r.beamX - lx) * u - 6, ly + (r.beamY - ly) * u - 6, 12, 12, YEL, a);
      }
    }
  }

  function drawZone(r) {
    var pulse = r && r.halfT > 0 ? r.halfT / 0.16 : 0;
    game.draw.rect(40, 1452, W - 80, 4, MAG, 0.4 + 0.5 * pulse);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 232, INK, 0.7);
    glowRect(0, 228, W, 4, CYAN, 0.8);
    txt(String(r.score), 60, 80, 52, CYAN, 'left');
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 64;
      if (i < LIVES - r.misses) { game.draw.circle(lx, 60, 22, MAG, 0.3); game.draw.circle(lx, 60, 14, MAG); }
      else game.draw.rect(lx - 20, 56, 40, 8, MISSC);
    }
    txt(r.hits + ' / ' + r.rounds.length, W - 60, 140, 38, YEL, 'right');
    // 迷子札: 黄色い帽子 + 桃色の風車
    game.draw.rect(60, 104, 220, 110, '#1a1040');
    glowRect(60, 104, 220, 4, YEL, 0.9);
    game.draw.sprite(FACE, { c: TARGET.cap, h: '#3a2a20', f: SKIN, k: INK, m: MAG }, 140, 164, 7, { anchor: 'center' });
    drawPin(220, 140, 0.7, TARGET.pin, game.time.elapsed, false);
    // 拍のランプ: 表=水色の丸、裏=桃色の菱(裏がタップの拍)
    var hk = Math.max(0, r.halfK);
    for (var b = 0; b < 8; b++) {
      var bx = 360 + b * 52, by = 186;
      var on = hk % 8 === b && hk < r.beats * 2;
      if (b % 2 === 0) game.draw.circle(bx, by, on ? 14 : 9, CYAN, on ? 1 : 0.35);
      else { var sz = on ? 18 : 11; game.draw.rect(bx - sz / 2, by - sz / 2, sz, sz, MAG, on ? 1 : 0.35); }
    }
    var prog = Math.min(1, r.songT / (r.beats * SPB));
    game.draw.rect(360, 214, 400 * prog, 6, YEL);
    if (r.combo >= 2) txt('x' + r.combo, W / 2, H * 0.735, 46, YEL);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 110, won ? YEL : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.2, W - 160, H * 0.36, INK, 0.86);
    glowRect(80, H * 0.2, W - 160, 8, won ? YEL : MISSC, 1);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, won ? YEL : MISSC);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.325, 64, WHITE);
    txt('SCORE ' + run.score, W / 2, H * 0.38, 52, CYAN);
    txt('PERFECT ' + run.perfects + '   x' + run.maxCombo, W / 2, H * 0.425, 40, WHITE);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.475, 56, YEL);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 44, WHITE);
    if (!won) txt('あと' + Math.max(1, CHART.length - run.hits) + '人!', W / 2, H * 0.53, 50, MAG);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, WHITE);
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.16);
  }

  function drawAll(r) {
    var el = game.time.elapsed;
    drawBack(r, el);
    for (var row = 0; row < 3; row++) { drawFaces(row, r, el); drawHedge(row, r, el); }
    drawZone(r);
    drawGuide(r, el);
    scan();
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, 0, W, 232, INK, 0.85);
      var blink = Math.floor(game.time.elapsed * 4) % 2 === 0;
      txt(GAME_TITLE, W / 2, 120, 92 + Math.sin(game.time.elapsed * 3) * 3, blink ? MAG : CYAN);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 196, 38, YEL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 46, YEL);
      else txt('TAP TO START', W / 2, H * 0.94, 44, CYAN);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.18; game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.6), { color: [CYAN, MAG, YEL][Math.floor(game.random(0, 3))], count: 16, speed: 320 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltQ.fx, haltQ.fy, { text: 'MISS', flashColor: MISSC });
          haltQ.fz = 0; haltQ.endHalt = false;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= SONG_BEATS * SPB || run.songT >= TIME_LIMIT) finish(run.misses < LIVES);
      }
    }

    drawAll(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, YEL);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
