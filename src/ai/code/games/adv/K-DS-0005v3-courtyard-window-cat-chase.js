// K-DS-0005v3-courtyard-window-cat-chase.js
// 窓渡りの猫 — 拍ごとに隣の窓へ移る猫を懐中電灯の光で追い、移った先の窓へ指を滑らせて着地の拍の頭(後半は半拍食う)ちょうどに照らす
// 操作: 指を置いた窓を少年の懐中電灯が照らす。猫は上下左右の隣の窓へ跳ぶ。跳ぶ前に猫がその向きへ身構え、矢印が出て、猫の下の帯が満ちきる瞬間に着地する(白い帯=拍の頭、橙の帯=半拍前に食う)。その瞬間に指を移った先の窓へ滑らせる(押し直してもよい)。早く入りすぎ・遅れ・見失いはMISS。ほかの窓に触れても罰なし
// 終わり: 7小節(約20秒・21跳び)を追い切ればCLEAR(猫が少年の腕へ降りてくる)。MISSが3つで猫が屋根へ逃げてGAME OVER。3小節目から「1・2・3の裏」の食いの跳びになる
// @mechanic: chase
// @theme: apartment_courtyard_window_cat
// 世界観: 古いアパートの中庭で、猫探しを頼まれた少年が、窓から窓へ渡っていく猫を懐中電灯で照らし続けて見失わないように追いかける
// 残るもの: 正誤(CLEAR/GAME OVER) + 照らせた回数・食いの跳びを照らした数・PERFECT数・最大コンボ・スコア
// スタイル: 2010s FLAT MOBILE
(function (game) {
  var STYLE = { bg: ['#ffd9a8', '#ffb889'], main: ['#e8705a', '#2e3a5c', '#5aa880'], accent: ['#ffe066', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影もグラデも無いベタ塗り。丸角・大きな余白・アイコン的な形。判定は面の色変化で見せる
  var SKY = STYLE.bg[0], SKY2 = STYLE.bg[1];
  var BRICK = STYLE.main[0], NAVY = STYLE.main[1], LEAF = STYLE.main[2];
  var LAMP = STYLE.accent[0], WHITE = STYLE.accent[1];
  var ORANGE = '#ff8a3d', BRICK2 = '#d45f4c', WIN = '#3e4c70', GROUND = '#7cb894', MISSC = '#ef4b5f', CATC = '#f2a03d', INK = '#26304a';

  var GAME_TITLE = 'WINDOW CAT';
  var BPM = 96;
  var SPB = 60 / BPM;
  var SONG_BEATS = 32;
  var TIME_LIMIT = 21;
  var PERF = 0.06, GOODW = 0.13, EDGE = 0.22, LATE = 0.15;
  var LIVES = 3;
  var COLS_X = [200, 413, 627, 840];
  var ROWS_Y = [420, 650, 880, 1110];
  var WIN_W = 150, WIN_H = 170;
  var BOY_X = W / 2, BOY_Y = 1610;
  var START = 13;

  // [着地の拍(.5 は半拍前に食う), 窓(行*4+列)]。1〜2小節は拍の頭、3小節目から 0・1・2.5 の食い
  var CHART = [[4, 14], [6, 10], [8, 11], [9, 7], [10, 6], [11, 5],
    [12, 9], [13, 8], [14.5, 4], [16, 5], [17, 1], [18.5, 2], [20, 6], [21, 7], [22.5, 11], [24, 10], [25, 9], [26.5, 5],
    [28, 6], [29.5, 2], [31, 3]];
  // デモ: [拍, 窓, ゴーストの着く時刻ずれ]。3跳び目(食い)は拍の頭まで待ってしまいMISS
  var DEMO_CHART = [[4, 14, 0], [5, 10, 0], [6.5, 11, 0.32], [8, 7, 0]];
  var DEMO_BEATS = 12;

  // 中庭の伴奏(独自)。3小節目から旋律とベースが3拍目の前の裏へ食う
  var MEL = [
    [['F5', 1], ['A5', 1], ['G5', 1], ['E5', 1]],
    [['F5', 0.5], ['G5', 0.5], ['A5', 1], ['C6', 2]],
    [['A5', 1], ['G5', 1.5], ['F5', 1.5]],
    [['C6', 1], ['A5', 1.5], ['G5', 1.5]],
    [['F5', 1], ['G5', 1.5], ['A5', 1.5]],
    [['G5', 1], ['E5', 1.5], ['C5', 1.5]],
    [['F5', 1], ['A5', 1.5], ['C6', 1.5]]
  ];
  var BASS = [
    [['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1]],
    [['A#2', 1], ['C3', 1], ['F2', 2]],
    [['F2', 1], ['F2', 1.5], ['C3', 1.5]],
    [['A#2', 1], ['A#2', 1.5], ['C3', 1.5]],
    [['D3', 1], ['D3', 1.5], ['A2', 1.5]],
    [['G2', 1], ['C3', 1.5], ['C3', 1.5]],
    [['F2', 1], ['C3', 1.5], ['F2', 1.5]]
  ];

  var CAT_SIT = [
    ['o........o..', 'oo......oo..', 'oooooooooo..', 'oeoooooeoo..', 'ooosppsooo..', '.oooooooo...', '.oowwwwoo.t.', 'ooowwwwooo.t', 'oooooooooo.t', '.oo.oo.oo.t.'],
    ['o........o..', 'oo......oo..', 'oooooooooo..', 'oeoooooeoo..', 'ooosppsooo..', '.oooooooo...', '.oowwwwoo..t', 'ooowwwwooo.t', 'oooooooooot.', '.oo.oo.oo...']
  ];
  var CAT_CROUCH = ['..........o.o', '.........oooo', '.........oeoo', 'tooooooooooop', '.ooosooosooo.', '.oooooooooo..', '.oo......oo..'];
  var CAT_JUMP = ['..........o.o', 't........oooo', '.t.......oeoo', '..oooooooooop', '.ooosooosooo..', 'oo........oo.', 'o..........o.'];
  var CAT_PAL = { o: CATC, e: INK, s: '#d07a20', p: '#ff7f9f', w: WHITE, t: CATC };
  var CAT_WHITE = { o: WHITE, e: MISSC, s: WHITE, p: WHITE, w: WHITE, t: WHITE };
  var BOY = [
    ['...hhhhhh...', '..hhhhhhhh..', '..hhhhhhhh..', '...ffffff...', '..jjjjjjjj..', '.jjjjjjjjjj.', '.fjjjjjjjjf.', '..jjjjjjjj..', '...nnnnnn...', '...nn..nn...', '...nn..nn...', '..ss....ss..'],
    ['...hhhhhh...', '..hhhhhhhh..', '..hhhhhhhh..', '...ffffff...', '..jjjjjjjj..', '.jjjjjjjjjj.', '.fjjjjjjjjf.', '..jjjjjjjj..', '...nnnnnn...', '..nn....nn..', '..nn....nn..', '.ss......ss.'],
    ['.f.hhhhhh.f.', '.fhhhhhhhhf.', '..hhhhhhhh..', '...ffffff...', '..jjjjjjjj..', '..jjjjjjjj..', '..jjjjjjjj..', '..jjjjjjjj..', '...nnnnnn...', '...nn..nn...', '...nn..nn...', '..ss....ss..']
  ];
  var BOY_PAL = { h: '#3a2a20', f: '#f2c49a', j: LEAF, n: NAVY, s: WHITE };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltQ, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rr(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - 2 * r, h, col, a);
    game.draw.rect(x, y + r, r, h - 2 * r, col, a);
    game.draw.rect(x + w - r, y + r, r, h - 2 * r, col, a);
    game.draw.circle(x + r, y + r, r, col, a);
    game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a);
    game.draw.circle(x + w - r, y + h - r, r, col, a);
  }

  function winC(w) { return { x: COLS_X[w % 4], y: ROWS_Y[Math.floor(w / 4)] }; }
  function winAt(x, y) {
    for (var w = 0; w < 16; w++) {
      var c = winC(w);
      if (Math.abs(x - c.x) <= WIN_W / 2 + 28 && Math.abs(y - c.y) <= WIN_H / 2 + 28) return w;
    }
    return -1;
  }

  function newRun(chart, demo) {
    var hops = [], prevT = 2 * SPB, prevW = START;
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      var tL = c[0] * SPB;
      var air = Math.min(0.3, 0.5 * (tL - prevT));
      var a = winC(prevW), b = winC(c[1]);
      hops.push({ beat: c[0], win: c[1], from: prevW, tL: tL, tJump: tL - air, tPrev: prevT, sync: c[0] % 1 !== 0,
        dx: Math.sign(b.x - a.x), dy: Math.sign(b.y - a.y), res: '', fz: 0, fx: 0, fy: 0, opened: false, endHalt: false,
        gT: c[2] || 0, gGo: false, gDone: false, landSnd: false });
      prevT = tL; prevW = c[1];
    }
    return {
      demo: demo, hops: hops, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, lastHalf: -1, beatK: -1, halfK: -1, beatT: 0,
      hits: 0, syncHits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      finger: null, fWin: -1, glowT: 0, poseT: 0, pose: 0
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltQ = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロック(1本) ──
  function pushBar(nb) { return nb >= 3; }
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 3], ['C5', 0.5], ['E5', 0.5]], { tempo: BPM, wave: 'square', volume: 0.04, bass: [['F2', 1], ['R', 1], ['F2', 1], ['C3', 1]], bassWave: 'triangle', bassVolume: 0.08 });
      return;
    }
    var i = Math.min(nb - 1, MEL.length - 1);
    game.audio.melody(MEL[i], { tempo: BPM, wave: 'square', volume: 0.045, bass: BASS[i], bassWave: 'triangle', bassVolume: 0.085 });
  }
  function halfDrum(hk) {
    var nb = Math.floor(hk / 8), pos = hk % 8;
    if (nb === 0) { if (pos % 2 === 0) game.audio.tone(pos === 0 ? 2200 : 1700, 0.025, { wave: 'square', volume: 0.03 }); return; }
    var kick = pushBar(nb) ? (pos === 0 || pos === 2 || pos === 5) : (pos === 0 || pos === 4);
    var clap = pushBar(nb) ? pos === 6 : (pos === 2 || pos === 6);
    if (kick) game.audio.tone(76, 0.12, { wave: 'sine', volume: 0.22 });
    if (clap) game.audio.tone(240, 0.05, { wave: 'square', volume: 0.05, slide: -90 });
    game.audio.tone(3000, 0.01, { wave: 'square', volume: 0.01 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) { r.lastBeat = k; r.beatK = k; if (k < r.beats) r.beatT = 0.16; }
    var hk = Math.floor(t / (SPB / 2));
    if (hk > r.lastHalf) { r.lastHalf = hk; r.halfK = hk; if (loud && k < r.beats) halfDrum(hk); }
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (!h.landSnd && t >= h.tL) { h.landSnd = true; if (loud) game.audio.tone(h.sync ? 990 : 740, 0.04, { wave: 'triangle', volume: 0.06 }); }
      if (h.res === '') {
        // 判定が開く時点ですでに着地先を照らしていたら「早すぎ」
        if (!h.opened && t >= h.tL - EDGE) {
          h.opened = true;
          if (r.fWin === h.win && firstPending(r) === h) { missHop(r, h, loud); continue; }
        }
        if (t > h.tL + LATE) missHop(r, h, loud);
      }
      if (h.res === 'miss' && h.fz > 0 && !h.endHalt) {
        h.fz -= dt;
        if (h.fz <= 0) game.feedback.bad(h.fx, h.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
      }
    }
    if (r.beatT > 0) r.beatT -= dt;
    if (r.glowT > 0) r.glowT -= dt;
    if (r.poseT > 0) r.poseT -= dt;
  }

  function firstPending(r) {
    for (var i = 0; i < r.hops.length; i++) if (r.hops[i].res === '') return r.hops[i];
    return null;
  }

  // 猫の位置: 最後に着地した窓 / 跳んでいる途中
  function catAt(r, t) {
    var w = START, flying = null, next = null;
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (t >= h.tL) { w = h.win; continue; }
      if (t >= h.tJump) flying = h;
      next = h;
      break;
    }
    var c = winC(w);
    if (flying) {
      var a = winC(flying.from), b = winC(flying.win);
      var p = (t - flying.tJump) / (flying.tL - flying.tJump);
      return { x: a.x + (b.x - a.x) * p, y: a.y + 40 + (b.y - a.y) * p - Math.sin(p * Math.PI) * 70, mode: 'jump', hop: flying };
    }
    if (next && t >= next.tL - 0.6) return { x: c.x, y: c.y + 40, mode: 'crouch', hop: next };
    if (!next && r.hops.length && t >= r.hops[r.hops.length - 1].tL + 0.3 && r.demo === false && won) {
      var q = Math.min(1, (t - r.hops[r.hops.length - 1].tL - 0.3) / 0.5);
      return { x: c.x + (BOY_X - c.x) * q, y: c.y + 40 + (BOY_Y - 120 - c.y - 40) * q - Math.sin(q * Math.PI) * 160, mode: 'jump', hop: null };
    }
    return { x: c.x, y: c.y + 40, mode: 'sit', hop: next };
  }

  function hitHop(r, h, d, loud) {
    h.res = 'hit';
    var perfect = Math.abs(d) <= PERF;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (h.sync) r.syncHits++;
    if (perfect) r.perfects++; else r.goods++;
    var gain = Math.round(((perfect ? 300 : 150) + r.combo * 20) * (h.sync ? 1.5 : 1));
    r.score += gain; r.glowT = 0.3; r.pose = 2; r.poseT = 0.3;
    var c = winC(h.win);
    game.feedback.good(c.x, c.y - 30, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? LAMP : WHITE, count: perfect ? 16 : 8, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, c.x, c.y - 140, { color: h.sync ? ORANGE : WHITE, size: 44 });
    if (loud) game.audio.tone(587 * Math.pow(1.06, Math.min(r.combo, 12)), 0.07, { wave: 'square', volume: 0.05 });
    if (!r.demo && r.hits === 10 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 10', W / 2, H * 0.5, { color: LAMP, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missHop(r, h, loud) {
    if (h.res !== '') return;
    var c = winC(h.win);
    h.res = 'miss'; h.fz = 0.35; h.fx = c.x; h.fy = c.y + 40;
    r.misses++; r.combo = 0; r.pose = 1; r.poseT = 0.5;
    if (loud) game.audio.tone(120, 0.16, { wave: 'sawtooth', volume: 0.07, slide: -40 });
    if (!r.demo && r.misses >= LIVES) { h.endHalt = true; halt = 0.5; haltQ = h; }
  }

  // 指が窓に入った瞬間で判定(押した/滑り込んだ)
  function enterWin(r, w, loud) {
    var h = firstPending(r);
    if (!h || w !== h.win) return false;
    var d = r.songT - h.tL;
    if (d < -EDGE) return false;
    if (Math.abs(d) <= GOODW) hitHop(r, h, d, loud);
    else missHop(r, h, loud);
    return true;
  }
  function moveFinger(r, x, y, loud) {
    r.finger = { x: x, y: y };
    var w = winAt(x, y);
    var changed = w !== r.fWin;
    r.fWin = w;
    if (changed && w >= 0) return enterWin(r, w, loud) ? 2 : 1;
    return 0;
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
    var stats = { lit: run.hits, total: CHART.length, syncHits: run.syncHits, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押す/滑らせる = 照らす窓を変える ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    run.fWin = -1;
    var res = moveFinger(run, x, y, true);
    if (res === 1) game.audio.tone(880, 0.03, { wave: 'triangle', volume: 0.04 });
    else if (res === 0) game.fx.burst(x, y, { color: LAMP, count: 3, speed: 90 });
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !run.finger || over || halt > 0) return;
    if (moveFinger(run, x, y, true) === 1) game.audio.tone(880, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onRelease(function () {
    if (state !== S.PLAYING || !run.finger) return;
    run.finger = null; run.fWin = -1;
    game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで指を窓から窓へ滑らせて2回照らす → 食いの跳びを拍の頭まで待ってMISS → また照らす ──
  var demo = { t: 0, run: null, hx: W / 2, hy: H * 0.86 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) {
      demo.run = newRun(DEMO_CHART, true);
      var s0 = winC(START);
      demo.run.finger = { x: s0.x, y: s0.y }; demo.run.fWin = START;
    }
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var h = null;
    for (var i = 0; i < r.hops.length; i++) if (!r.hops[i].gDone) { h = r.hops[i]; break; }
    if (h) {
      var a = winC(h.from), b = winC(h.win);
      var tArr = h.tL + h.gT, t0 = tArr - 0.12;
      var p = Math.max(0, Math.min(1, (r.songT - t0) / 0.12));
      var fx = a.x + (b.x - a.x) * p, fy = a.y + (b.y - a.y) * p;
      if (r.songT >= t0) moveFinger(r, fx, fy, audioOk);
      if (p >= 1) { h.gDone = true; moveFinger(r, b.x, b.y, audioOk); }
    }
    if (r.finger) { demo.hx = r.finger.x; demo.hy = r.finger.y + 10; }
  }

  // ── 描画 ──
  function drawBack(r, el) {
    // ベタの2帯(空/中庭の地面)。gradient の段差で平面の帯を作る
    game.draw.gradient(0, H, [[0, SKY], [0.12, SKY], [0.12, SKY2], [0.76, SKY2], [0.76, GROUND], [1, GROUND]]);
    // 遠くの屋根(アイコン的な三角の代わりに段の矩形)
    for (var i = 0; i < 6; i++) rr(i * 190 - 20, 210 + (i % 2) * 20, 160, 80, 16, '#f5a37e');
    // 洗濯ひもと旗
    game.draw.line(0, 270, W, 250, WHITE, 3);
    for (var f = 0; f < 9; f++) {
      var fx = 40 + f * 120, sw = Math.sin(el * 3 + f) * 5;
      rr(fx + sw, 262 - f * 2, 50, 40, 10, [LAMP, WHITE, LEAF][f % 3]);
    }
  }

  function drawBuilding(r, el) {
    rr(70, 290, W - 140, 1080, 36, BRICK);
    game.draw.rect(70, 1330, W - 140, 40, BRICK2);
    // 雨どいと逃げメーター(猫が屋根へ近づく)
    rr(W - 60, 300, 26, 1060, 13, NAVY);
    var lead = r ? r.misses : 0;
    for (var m = 0; m < LIVES; m++) rr(W - 70, 360 + m * 300, 46, 46, 23, m < lead ? MISSC : '#4a5a80');
    var cat = r ? catAt(r, r.songT) : null;
    var lit = r && r.finger ? r.fWin : -1;
    for (var w = 0; w < 16; w++) {
      var c = winC(w);
      var x = c.x - WIN_W / 2, y = c.y - WIN_H / 2;
      var on = w === lit;
      var hitGlow = on && r.glowT > 0;
      rr(x - 10, y - 10, WIN_W + 20, WIN_H + 20, 22, BRICK2);
      rr(x, y, WIN_W, WIN_H, 18, hitGlow ? WHITE : on ? LAMP : WIN);
      // カーテンと植木鉢(窓ごとに違う)
      var cc = [LEAF, WHITE, '#ffb3c1', LAMP][w % 4];
      if (!on) { rr(x + 8, y + 8, 40, WIN_H - 30, 12, cc, 0.85); rr(x + WIN_W - 48, y + 8, 40, WIN_H - 30, 12, cc, 0.85); }
      game.draw.rect(x - 14, y + WIN_H - 6, WIN_W + 28, 14, WHITE);
      if (w % 3 === 1) { rr(x + 20, y + WIN_H - 40, 40, 34, 8, '#c9744a'); game.draw.circle(x + 40, y + WIN_H - 48, 20, LEAF); }
    }
    // 跳ぶ向きの矢印と、猫の下で満ちる帯(満ちきると着地)
    if (cat && cat.hop && (cat.mode === 'crouch' || cat.mode === 'sit') && r.songT >= cat.hop.tL - 0.6) {
      var h = cat.hop;
      var col = h.sync ? ORANGE : WHITE;
      for (var k = 0; k < 3; k++) {
        var px = cat.x + h.dx * (95 + k * 34), py = cat.y - 40 + h.dy * (110 + k * 34);
        var bl = (Math.floor(el * 10) + k) % 3 === 0 ? 1 : 0.55;
        game.draw.line(px - h.dx * 18 - h.dy * 20, py - h.dy * 18 - h.dx * 20, px, py, col, 10);
        game.draw.line(px - h.dx * 18 + h.dy * 20, py - h.dy * 18 + h.dx * 20, px, py, col, 10);
        game.draw.circle(px, py, 5, col, bl);
      }
    }
    if (cat && cat.hop && r.songT < cat.hop.tL) {
      var h2 = cat.hop, st = Math.max(h2.tPrev, h2.tL - 1.2);
      var pr = Math.max(0, Math.min(1, (r.songT - st) / (h2.tL - st)));
      var bx = winC(h2.from).x - 60, by = winC(h2.from).y + WIN_H / 2 + 14;
      rr(bx, by, 120, 22, 11, NAVY);
      if (pr > 0.1) rr(bx, by, 120 * pr, 22, 11, h2.sync ? ORANGE : WHITE);
    }
  }

  function drawCat(r, el) {
    var cat = catAt(r, r.songT);
    // MISS の猫(白く大きく止まる)
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (h.res === 'miss' && (h.fz > 0 || (h.endHalt && halt > 0))) {
        rr(h.fx - 90, h.fy - 90, 180, 150, 40, WHITE, 0.6);
        game.draw.sprite(CAT_SIT[0], CAT_WHITE, h.fx, h.fy - 10, 11, { anchor: 'center' });
        return;
      }
    }
    var flip = cat.hop ? cat.hop.dx < 0 : false;
    if (cat.mode === 'jump') game.draw.sprite(CAT_JUMP, CAT_PAL, cat.x, cat.y, 9, { anchor: 'center', flipX: flip });
    else if (cat.mode === 'crouch') game.draw.sprite(CAT_CROUCH, CAT_PAL, cat.x, cat.y + 10, 9, { anchor: 'center', flipX: flip });
    else game.draw.sprite(CAT_SIT[Math.floor(el * 2) % 2], CAT_PAL, cat.x, cat.y - 10, 9, { anchor: 'center' });
  }

  function drawBoy(r, el) {
    // 懐中電灯の光(ベタの半透明の帯)
    var tx, ty;
    if (r.finger) { tx = r.finger.x; ty = r.finger.y; }
    else { var c = winC(START); tx = c.x; ty = c.y; }
    var sx = BOY_X + 40, sy = BOY_Y - 80;
    for (var n = 0; n < 14; n++) {
      var u = n / 13, wd = 20 + u * 110;
      game.draw.rect(sx + (tx - sx) * u - wd / 2, sy + (ty - sy) * u - wd / 2, wd, wd, LAMP, r.finger ? 0.1 : 0.04);
    }
    if (r.finger) game.draw.circle(tx, ty, 110, LAMP, 0.18);
    var fr = r.poseT > 0 ? r.pose : 0;
    if (fr === 0 && r.beatT > 0) fr = 1;
    rr(BOY_X - 70, BOY_Y + 50, 140, 24, 12, '#5f9a78');
    game.draw.sprite(BOY[fr], BOY_PAL, BOY_X, BOY_Y, 11, { anchor: 'center' });
    rr(sx - 12, sy - 24, 30, 50, 8, NAVY);
    game.draw.circle(sx + 3, sy - 24, 12, LAMP);
    // 中庭の木
    game.draw.rect(160, 1430, 24, 140, '#8a5a3a');
    game.draw.circle(172, 1420, 80, LEAF);
    game.draw.circle(130, 1460, 50, '#4a9870');
  }

  function drawHud(r) {
    rr(30, 24, W - 60, 200, 32, WHITE);
    txt(String(r.score), 80, 110, 56, NAVY, 'left');
    txt(r.hits + ' / ' + r.hops.length, W - 80, 110, 44, BRICK, 'right');
    // 拍の点: 表=紺の丸、裏=小さな橙
    var hk = Math.max(0, r.halfK);
    for (var b = 0; b < 8; b++) {
      var on = hk % 8 === b && hk < r.beats * 2;
      var bx = 360 + b * 48;
      if (b % 2 === 0) game.draw.circle(bx, 90, on ? 18 : 12, on ? NAVY : '#c8cede');
      else game.draw.circle(bx, 90, on ? 12 : 7, on ? ORANGE : '#e8d8c8');
    }
    var prog = Math.min(1, r.songT / (r.beats * SPB));
    rr(80, 160, W - 160, 24, 12, '#e8e2da');
    if (prog > 0.03) rr(80, 160, (W - 160) * prog, 24, 12, LEAF);
    if (r.combo >= 2) txt('x' + r.combo, W / 2, H * 0.735, 48, NAVY);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      rr(140, H * 0.4 - 100, W - 280, 150, 40, won ? LEAF : MISSC);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, WHITE);
      return;
    }
    rr(90, H * 0.2, W - 180, H * 0.37, 40, WHITE);
    rr(90, H * 0.2, W - 180, 120, 40, won ? LEAF : MISSC);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2 + 90, 88, WHITE);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.34, 64, NAVY);
    txt('SCORE ' + run.score, W / 2, H * 0.395, 52, BRICK);
    txt('PERFECT ' + run.perfects, W * 0.38, H * 0.44, 40, NAVY);
    game.draw.circle(W * 0.66, H * 0.44 - 12, 16, ORANGE);
    txt('x' + run.syncHits, W * 0.74, H * 0.44, 40, ORANGE);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.49, 56, ORANGE);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.49, 44, NAVY);
    if (!won) txt('あと' + Math.max(1, CHART.length - run.hits) + '回!', W / 2, H * 0.54, 50, BRICK);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 44, NAVY);
  }

  function drawAll(r) {
    var el = game.time.elapsed;
    drawBack(r, el);
    drawBuilding(r, el);
    drawBoy(r, el);
    drawCat(r, el);
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: true, scale: 16 });
      rr(30, 24, W - 60, 200, 32, NAVY);
      txt(GAME_TITLE, W / 2, 120, 92 + Math.sin(game.time.elapsed * 3) * 3, LAMP);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 190, 38, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 46, NAVY);
      else txt('TAP TO START', W / 2, H * 0.95, 44, BRICK);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          run.songT += dt;
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.6), { color: [LAMP, ORANGE, LEAF][Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
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
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, NAVY);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
