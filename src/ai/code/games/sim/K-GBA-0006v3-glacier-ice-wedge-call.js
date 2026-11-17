// K-GBA-0006v3-glacier-ice-wedge-call.js
// 氷河の楔打ち — 相方が1小節ぶん楔を打ってみせた型を、次の1小節で自分の楔に同じ型で打ち返す。交互の番で割れ目を広げて氷塊を切り出す
// 操作: 画面のどこでも押すと自分の槌を振り下ろす(押した瞬間で判定)。相方の番(左が光る1小節)は見て聞くだけ、自分の番(右が光る1小節)で相方と同じ8分の位置を叩く。相方の番に叩く・型に無い拍を叩く・型の拍を外す/叩き漏らすはMISS
// 終わり: 5往復(10小節・約21秒)を返し切ればCLEAR(氷塊が切り離される)。MISSが3つでGAME OVER
// @mechanic: turn_attack
// @theme: glacier_ice_wedge_call
// 世界観: 氷河の上の氷切り場で、二人組の氷切り職人が交互の番で楔を打ち、相方の打った型を同じ拍で打ち返して割れ目を広げ、大きな氷塊を切り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 返せた打数・PERFECT数・最大コンボ・スコア
// スタイル: 8bit PC MONITOR
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ、高解像度の細線、テキスト枠のUI
  var STYLE = { bg: ['#000000', '#0000aa'], main: ['#00ffff', '#ffffff', '#0000ff'], accent: ['#ffff00', '#ff0000'] };
  var BLACK = STYLE.bg[0], NAVY = STYLE.bg[1], CYAN = STYLE.main[0], WHITE = STYLE.main[1], BLUE = STYLE.main[2];
  var YEL = STYLE.accent[0], RED = STYLE.accent[1], MAG = '#ff00ff', GREEN = '#00ff00';

  var GAME_TITLE = 'ICE WEDGE';
  var BPM = 112;
  var SPB = 60 / BPM;
  var BAR = 4 * SPB, HALF = SPB / 2;
  var PATTERNS = [
    [1, 0, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 0, 0, 1, 0],
    [1, 1, 0, 1, 0, 1, 1, 0]
  ];
  var DEMO_PATTERNS = [[1, 0, 1, 0, 1, 0, 1, 0], [1, 0, 0, 0, 1, 0, 1, 1]];
  var DEMO_WRONG = { round: 1, slot: 2 };   // デモ2往復目: 型に無い拍を叩いてMISS
  var ROUNDS = PATTERNS.length;
  var TIME_LIMIT = ROUNDS * 2 * BAR;
  var PERF = 0.06, GOODW = 0.12, EDGE = 0.2;
  var LIVES = 3;
  var BLOCK_L = W * 0.1, BLOCK_R = W * 0.9, BLOCK_T = H * 0.43, BLOCK_B = H * 0.66;
  var CX = W * 0.5;
  var AI_X = W * 0.27, YOU_X = W * 0.73, CUT_Y = BLOCK_T - 120;
  var ROW_CALL = H * 0.765, ROW_YOU = H * 0.865;

  // 伴奏: 相方の番と自分の番で響きを替える(独自)。打つ型は空けておき、拍だけを刻む
  var CALL_PHR = [['A4', 2], ['C5', 1], ['B4', 1]];
  var RESP_PHR = [['G4', 2], ['E4', 1], ['G4', 1]];
  var CALL_BASS = [['A2', 1], ['A2', 1], ['E2', 1], ['E2', 1]];
  var RESP_BASS = [['G2', 1], ['G2', 1], ['D2', 1], ['E2', 1]];

  var CUTTER = [
    ['....hhhh....', '...hhhhhh...', '...ffffff...', '...fkffkf...', '...ffffff...', '..cccccccc..', '.cccccccccc.', '.fcccccccc..', '..cccccccc..', '..cccccccc..', '..pppppppp..', '..pp....pp..', '..pp....pp..', '.bbb....bbb.'],
    ['....hhhh....', '...hhhhhh...', '...ffffff...', '...fkffkf...', '...ffffff...', '..cccccccc..', '.cccccccccc.', '..ccccccccf.', '..cccccccc..', '..cccccccc..', '..pppppppp..', '.ppp....ppp.', '.pp......pp.', 'bbb......bbb']
  ];
  var AI_PAL = { h: RED, f: '#ffccaa', k: BLACK, c: BLUE, p: NAVY, b: BLACK };
  var YOU_PAL = { h: YEL, f: '#ffccaa', k: BLACK, c: MAG, p: NAVY, b: BLACK };
  var WEDGE = ['wwwwww', 'wwwwww', '.wwww.', '.wwww.', '..ww..', '..ww..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: BLACK, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col, th) {
    var t = th || 3;
    game.draw.rect(x, y, w, t, col);
    game.draw.rect(x, y + h - t, w, t, col);
    game.draw.rect(x, y, t, h, col);
    game.draw.rect(x + w - t, y, t, h, col);
  }

  function newRun(pats, demo) {
    var calls = [], slots = [], total = 0;
    for (var r = 0; r < pats.length; r++) {
      var c0 = r * 2 * BAR, r0 = c0 + BAR;
      for (var j = 0; j < 8; j++) {
        if (!pats[r][j]) continue;
        calls.push({ t: c0 + j * HALF, round: r, j: j, done: false });
        slots.push({ t: r0 + j * HALF, round: r, j: j, res: '' });
        total += 2;
      }
    }
    return {
      demo: demo, pats: pats, calls: calls, slots: slots, total: total, songT: 0, lastBeat: -1, lastBar: -1,
      beatK: -1, beatT: 0, cueT: 0, aiT: 0, youT: 0, crack: 0, aiDepth: 0, youDepth: 0,
      hits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      judge: '', judgeT: 0, flashSlot: null, cleared: false, splitT: 0, wrongT: 0
    };
  }

  function initGame() {
    run = newRun(PATTERNS, false);
    readyT = 0.8; halt = 0; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  function barInfo(r, t) {
    var bar = Math.floor(t / BAR);
    return { bar: bar, round: Math.floor(bar / 2), call: bar % 2 === 0, start: bar * BAR };
  }

  // ── 拍クロック ──
  function onBar(r, bar, loud) {
    if (!loud || bar >= r.pats.length * 2) return;
    var call = bar % 2 === 0;
    game.audio.melody(call ? CALL_PHR : RESP_PHR, { tempo: BPM, wave: 'square', volume: 0.035, bass: call ? CALL_BASS : RESP_BASS, bassWave: 'triangle', bassVolume: 0.08 });
  }
  function onBeat(r, k, loud) {
    r.beatK = k; r.beatT = 0.12;
    var bar = Math.floor(k / 4), q = k % 4;
    if (bar >= r.pats.length * 2) return;
    if (loud) game.audio.tone(q === 0 ? 2093 : 1568, 0.025, { wave: 'square', volume: q === 0 ? 0.04 : 0.025 });
    // 番の交代を最後の拍で予告(音+枠の明滅)
    if (q === 3 && bar + 1 < r.pats.length * 2) {
      r.cueT = SPB;
      if (loud) game.audio.tone(bar % 2 === 0 ? 'C5' : 'G4', 0.12, { wave: 'triangle', volume: 0.06, slide: bar % 2 === 0 ? 260 : -160 });
    }
  }

  function aiStrike(r, c, loud) {
    c.done = true; r.aiT = 0.14; r.crack++; r.aiDepth = Math.min(40, r.aiDepth + 2);
    game.fx.burst(CX - 34, BLOCK_T, { color: CYAN, count: 5, speed: 160 });
    if (loud) { game.audio.tone(1760, 0.05, { wave: 'square', volume: 0.06 }); game.audio.tone(98, 0.08, { wave: 'triangle', volume: 0.1 }); }
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / BAR);
    if (nb > r.lastBar) { r.lastBar = nb; onBar(r, nb, loud); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) { r.lastBeat = k; onBeat(r, k, loud); }
    for (var i = 0; i < r.calls.length; i++) if (!r.calls[i].done && t >= r.calls[i].t) aiStrike(r, r.calls[i], loud);
    for (var s = 0; s < r.slots.length; s++) {
      var sl = r.slots[s];
      if (sl.res === '' && t > sl.t + GOODW) { sl.res = 'miss'; youMiss(r, CX + 34, BLOCK_T, loud); }
    }
    if (r.beatT > 0) r.beatT -= dt;
    if (r.cueT > 0) r.cueT -= dt;
    if (r.aiT > 0) r.aiT -= dt;
    if (r.youT > 0) r.youT -= dt;
    if (r.judgeT > 0) r.judgeT -= dt;
    if (r.wrongT > 0) r.wrongT -= dt;
  }

  // ── 自分の1打: 型の8分の拍の頭からのずれで判定 ──
  function youStrike(r, loud) {
    var t = r.songT;
    r.youT = 0.14;
    var best = null, bd = 99;
    for (var i = 0; i < r.slots.length; i++) {
      var sl = r.slots[i];
      if (sl.res !== '') continue;
      var d = Math.abs(t - sl.t);
      if (d <= EDGE && d < bd) { bd = d; best = sl; }
    }
    if (!best || bd > GOODW) {
      // 相方の番に叩いた / 型に無い拍を叩いた / 拍を外した
      if (best) best.res = 'miss';
      r.wrongT = 0.3;
      youMiss(r, CX + 34, BLOCK_T, loud);
      return;
    }
    var perfect = bd <= PERF;
    best.res = perfect ? 'perfect' : 'good';
    r.flashSlot = best; r.crack++; r.youDepth = Math.min(40, r.youDepth + 2);
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfects++; else r.goods++;
    r.score += (perfect ? 200 : 100) + r.combo * 10;
    r.judge = perfect ? 'PERFECT' : 'GOOD'; r.judgeT = 0.35;
    game.feedback.good(CX + 34, BLOCK_T - 20, { text: null, color: perfect ? YEL : WHITE, count: perfect ? 12 : 8, volume: loud ? 0.3 : 0 });
    if (loud) { game.audio.tone(1319, 0.05, { wave: 'square', volume: 0.06 }); game.audio.tone(110, 0.08, { wave: 'triangle', volume: 0.1 }); }
    if (r.hits === 10 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 10', W / 2, H * 0.37, { color: YEL, size: 76 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function youMiss(r, x, y, loud) {
    r.misses++; r.combo = 0; r.judge = 'MISS'; r.judgeT = 0.4;
    if (r.demo || r.misses < LIVES) {
      game.feedback.bad(x, y, { text: null, shake: 8, volume: loud ? 0.35 : 0, flashColor: RED });
      return;
    }
    if (!over && halt <= 0) halt = 0.5;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) { run.cleared = true; run.splitT = 0; run.score += (LIVES - run.misses) * 300; }
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) game.audio.play('se_break', 0.5);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { hits: run.hits, total: run.slots.length, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  game.onPress(function () {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(330, 0.03, { wave: 'square', volume: 0.03 }); return; }
    youStrike(run, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 相方の型→同じ型を返すを2往復。2往復目で型に無い拍を叩いてMISS ──
  var demo = { t: 0, run: null, press: 0, done: {} };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_PATTERNS.length * 2 * BAR + 0.6);
    if (cyc < dt || demo.t <= dt || !demo.run) { demo.run = newRun(DEMO_PATTERNS, true); demo.done = {}; }
    var r = demo.run;
    stepRun(r, dt, audioOk);
    for (var i = 0; i < r.slots.length; i++) {
      var sl = r.slots[i];
      if (!demo.done[i] && sl.res === '' && r.songT >= sl.t) { demo.done[i] = true; youStrike(r, audioOk); demo.press = 0.1; }
    }
    var wt = (DEMO_WRONG.round * 2 + 1) * BAR + DEMO_WRONG.slot * HALF;
    if (!demo.done.w && r.songT >= wt) { demo.done.w = true; youStrike(r, audioOk); demo.press = 0.1; }
    if (demo.press > 0) demo.press -= dt;
  }

  // ── 描画 ──
  function drawWorld(r) {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H * 0.43, [[0, BLACK], [1, NAVY]]);
    // 星と稜線(細線の線画)
    for (var s = 0; s < 24; s++) game.draw.rect((s * 211) % W, (s * 97) % (H * 0.25) + 60, 3, 3, WHITE, 0.4 + 0.4 * Math.sin(tt * 2 + s));
    var peaks = [[0, 0.36], [0.12, 0.27], [0.24, 0.33], [0.4, 0.22], [0.55, 0.31], [0.7, 0.24], [0.86, 0.32], [1, 0.28]];
    for (var p = 0; p < peaks.length - 1; p++) game.draw.line(peaks[p][0] * W, peaks[p][1] * H, peaks[p + 1][0] * W, peaks[p + 1][1] * H, WHITE, 3);
    for (var q = 0; q < peaks.length - 1; q++) game.draw.line(peaks[q][0] * W, peaks[q][1] * H + 30, peaks[q + 1][0] * W, peaks[q + 1][1] * H + 30, CYAN, 2);
    // 氷河の面(横の細線とディザ)
    game.draw.rect(0, H * 0.4, W, H * 0.6, BLUE);
    for (var y = H * 0.4; y < H; y += 24) game.draw.rect(0, y, W, 2, NAVY);
    for (var dy = 0; dy < 10; dy++) for (var dx = 0; dx < 18; dx++) if ((dx + dy) % 2 === 0) game.draw.rect(dx * 60 + 20, H * 0.68 + dy * 30, 6, 6, CYAN, 0.35);
    if (!r) return;
    // 氷塊(切り出す塊)
    var split = r.cleared ? Math.min(1, r.splitT * 1.5) : 0;
    var flash = halt > 0;
    var crackF = Math.min(1, r.crack / r.total);
    var leftCol = flash ? WHITE : CYAN;
    game.draw.rect(BLOCK_L, BLOCK_T, CX - BLOCK_L, BLOCK_B - BLOCK_T, leftCol);
    game.draw.rect(CX + split * 180, BLOCK_T + split * split * 120, BLOCK_R - CX, BLOCK_B - BLOCK_T, leftCol);
    for (var iy = 0; iy < 9; iy++) for (var ix = 0; ix < 12; ix++) if ((ix + iy) % 2 === 0) game.draw.rect(BLOCK_L + 20 + ix * 62 + (ix >= 6 ? split * 180 : 0), BLOCK_T + 18 + iy * 46 + (ix >= 6 ? split * split * 120 : 0), 6, 6, WHITE, 0.6);
    frame(BLOCK_L, BLOCK_T, CX - BLOCK_L, BLOCK_B - BLOCK_T, WHITE, 4);
    frame(CX + split * 180, BLOCK_T + split * split * 120, BLOCK_R - CX, BLOCK_B - BLOCK_T, WHITE, 4);
    // 割れ目(打つたびに下へ伸びる)
    var len = (BLOCK_B - BLOCK_T) * crackF, segs = Math.max(1, Math.round(crackF * 12));
    var px = CX, py = BLOCK_T;
    for (var c = 1; c <= segs; c++) {
      var nx = CX + ((c % 2) ? 14 : -14), ny = BLOCK_T + len * c / segs;
      game.draw.line(px, py, nx, ny, r.wrongT > 0 ? RED : BLACK, 6);
      px = nx; py = ny;
    }
    // 楔(左=相方、右=自分)
    game.draw.sprite(WEDGE, { w: WHITE }, CX - 34, BLOCK_T - 26 + r.aiDepth, 9, { anchor: 'center' });
    game.draw.sprite(WEDGE, { w: YEL }, CX + 34 + split * 180, BLOCK_T - 26 + r.youDepth, 9, { anchor: 'center' });
  }

  function drawCutter(x, pal, hitT, flip, active) {
    var tt = game.time.elapsed;
    var bob = Math.sin(tt * 3 + x) * 4;
    if (active) frame(x - 120, CUT_Y - 170, 240, 330, flip ? YEL : CYAN, 5);
    game.draw.sprite(CUTTER[hitT > 0 ? 1 : 0], pal, x, CUT_Y + bob, 12, { anchor: 'center', flipX: flip });
    var hx = flip ? x - 50 : x + 50, hy = CUT_Y - 10 + bob;
    var wx = flip ? CX + 34 : CX - 34;
    var tx = hitT > 0 ? wx : x + (flip ? -20 : 20), ty = hitT > 0 ? BLOCK_T - 70 : CUT_Y - 170 + bob;
    game.draw.line(hx, hy, tx, ty, '#aa5500', 10);
    game.draw.rect(tx - 34, ty - 24, 68, 48, WHITE);
    game.draw.rect(tx - 28, ty - 18, 56, 36, '#aa5500');
  }

  function drawPanel(r) {
    var info = barInfo(r, Math.max(0, r.songT));
    var round = Math.min(r.pats.length - 1, info.round);
    var started = state !== S.PLAYING || readyT <= 0;
    game.draw.rect(30, H * 0.715, W - 60, H * 0.2, BLACK, 0.85);
    frame(30, H * 0.715, W - 60, H * 0.2, WHITE, 3);
    var rows = [{ y: ROW_CALL, col: CYAN, call: true }, { y: ROW_YOU, col: YEL, call: false }];
    for (var rr = 0; rr < 2; rr++) {
      var row = rows[rr], active = started && info.call === row.call && info.round < r.pats.length;
      var blink = r.cueT > 0 && info.call !== row.call && Math.floor(game.time.elapsed * 12) % 2 === 0;
      frame(54, row.y - 52, 130, 104, active || blink ? row.col : BLUE, 5);
      game.draw.sprite(CUTTER[0], row.call ? AI_PAL : YOU_PAL, 119, row.y, 6, { anchor: 'center', flipX: !row.call });
      for (var j = 0; j < 8; j++) {
        var x = 250 + j * 98, big = j % 2 === 0, sz = big ? 64 : 44;
        var on = r.pats[round][j] === 1;
        var heard = false;
        for (var c = 0; c < r.calls.length; c++) if (r.calls[c].round === round && r.calls[c].j === j && r.calls[c].done) heard = true;
        frame(x - sz / 2, row.y - sz / 2, sz, sz, !row.call && heard ? YEL : active ? WHITE : BLUE, !row.call && heard ? 5 : 4);
        if (row.call) {
          if (heard) game.draw.rect(x - sz / 2 + 8, row.y - sz / 2 + 8, sz - 16, sz - 16, CYAN);
        } else if (on) {
          var res = '';
          for (var s = 0; s < r.slots.length; s++) if (r.slots[s].round === round && r.slots[s].j === j) res = r.slots[s].res;
          var col = res === 'perfect' ? YEL : res === 'good' ? WHITE : res === 'miss' ? RED : null;
          if (col) game.draw.rect(x - sz / 2 + 8, row.y - sz / 2 + 8, sz - 16, sz - 16, col);
        }
      }
      if (active) {
        var ph = (r.songT - info.start) / HALF;
        game.draw.rect(250 + Math.min(7.6, ph) * 98 - 3, row.y - 50, 6, 100, row.col);
      }
    }
    if (r.judgeT > 0) txt(r.judge, W * 0.73, H * 0.7, 52, r.judge === 'MISS' ? RED : r.judge === 'PERFECT' ? YEL : WHITE);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.115, BLACK);
    frame(16, 16, W - 32, H * 0.115 - 32, WHITE, 3);
    txt('SCORE ' + r.score, 50, 70, 40, WHITE, 'left');
    var info = barInfo(r, Math.max(0, r.songT));
    txt(Math.min(r.pats.length, info.round + 1) + ' / ' + r.pats.length, W * 0.6, 70, 40, CYAN);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 80 - i * 64, alive = i < LIVES - r.misses;
      game.draw.rect(lx - 22, 48, 44, 44, alive ? CYAN : BLACK);
      frame(lx - 22, 48, 44, 44, alive ? WHITE : RED, 3);
    }
    // 拍ランプ(4拍)
    var bk = r.beatK >= 0 ? r.beatK % 4 : -1;
    for (var k = 0; k < 4; k++) {
      var x = W * 0.3 + k * 60, on = k === bk && r.beatT > 0;
      game.draw.rect(x, 132, 44, 44, on ? (info.call ? CYAN : YEL) : BLACK);
      frame(x, 132, 44, 44, WHITE, 4);
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.83, 156, 40, YEL);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 110, won ? YEL : RED);
      return;
    }
    game.draw.rect(70, H * 0.16, W - 140, H * 0.33, BLACK);
    frame(70, H * 0.16, W - 140, H * 0.33, won ? YEL : RED, 5);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.21, 100, won ? YEL : RED);
    txt(run.hits + ' / ' + run.slots.length, W / 2, H * 0.275, 64, CYAN);
    txt('SCORE ' + run.score, W / 2, H * 0.33, 50, WHITE);
    txt('PERFECT ' + run.perfects + '  COMBO ' + run.maxCombo, W / 2, H * 0.375, 38, CYAN);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.42, 56, YEL);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.42, 44, WHITE);
    if (!won) {
      var info = barInfo(run, run.songT);
      txt('あと' + Math.max(1, run.pats.length - info.round) + '往復!', W / 2, H * 0.465, 48, YEL);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, WHITE);
  }

  function drawAll(r) {
    var info = barInfo(r, Math.max(0, r.songT));
    var live = (state !== S.PLAYING || readyT <= 0) && info.round < r.pats.length && !over;
    drawWorld(r);
    drawCutter(AI_X, AI_PAL, r.aiT, false, live && info.call);
    drawCutter(YOU_X, YOU_PAL, r.youT, true, live && !info.call);
    drawPanel(r);
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(W * 0.8, H * 0.9 + (demo.press > 0 ? 10 : -20) + Math.sin(game.time.elapsed * 2.4) * 8, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, H * 0.125, W, 150, BLACK, 0.8);
      frame(40, H * 0.125, W - 80, 150, CYAN, 3);
      txt(GAME_TITLE, W / 2, H * 0.153, 92, CYAN);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.193, 38, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, YEL);
      else txt('TAP TO START', W / 2, H * 0.965, 44, WHITE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (run.cleared) run.splitT += dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.2, H * 0.42), { color: [CYAN, WHITE, YEL][Math.floor(game.random(0, 3))], count: 14, speed: 320 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(CX, BLOCK_T + 120, { text: 'MISS', flashColor: RED });
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        if (halt <= 0 && !over && run.songT >= TIME_LIMIT + GOODW + 0.05) finish(true);
      }
    }

    drawAll(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.33, 120, YEL);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
