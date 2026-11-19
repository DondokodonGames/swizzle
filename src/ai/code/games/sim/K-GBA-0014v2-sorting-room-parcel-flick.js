// K-GBA-0014v2-sorting-room-parcel-flick.js
// 仕分け室フリック — 拍の頭でシュートから落ちてきた小包を受けたその瞬間に、札の色の棚へ向けて指で弾き、次の拍で隣の局員の手へ届ける
// 操作: 小包は1拍かけて落ち、拍の頭で手元に着く。その瞬間に画面を指で弾く(押して素早く払って離す)。弾いた向きと長さがそのまま投げる向きと勢いになり、左右の棚の上段・下段のうち札と同じ色の口へ飛ぶ(弾き中は落下点の点線と光る口で予告)。離す時刻が拍外れ・勢い不足・別の口・見送りはMISS
// 終わり: 6小節(約17秒・小包17個)を送り切ればCLEAR。MISSが3つでGAME OVER。後半は小包が毎拍続けて落ちてくる
// @mechanic: flick_launch
// @theme: post_sorting_room_parcel_relay
// 世界観: 郵便局の仕分け室で、局員がシュートから落ちてくる小包を拍に乗せて左右の棚口へ弾き、隣の局員の手へ送り継ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 届けた個数・PERFECT数・最大コンボ・スコア
// スタイル: MODERN AD-GAME
(function (game) {
  var STYLE = { bg: ['#ffe7b8', '#ffc978'], main: ['#ff4b3e', '#2f7bff', '#ffd21f'], accent: ['#1b1b2f', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、大きいアイコン、飛ぶ数字。3秒で何をするか伝わる画面
  var WALL0 = STYLE.bg[0], WALL1 = STYLE.bg[1], RED = STYLE.main[0], BLUE = STYLE.main[1], YEL = STYLE.main[2];
  var OUT = STYLE.accent[0], WHITE = STYLE.accent[1];
  var GREEN = '#22cc66', PINK = '#ff4fa3', KRAFT = '#d99a5a', KRAFT_D = '#a86c36', FLOOR = '#c46f3c', WOOD = '#8a4f2a', SKIN = '#ffc99a';

  var GAME_TITLE = 'PARCEL FLICK';
  var BPM = 100;
  var SPB = 60 / BPM;
  var BARS = 7;                      // 0小節目はカウント
  var SONG_BEATS = BARS * 4;
  var PERF = 0.06, GOODW = 0.13, EDGE = 0.26, LATE = 0.2;
  var LIVES = 3;
  var HANDS = { x: W * 0.5, y: H * 0.645 };
  var CHUTE = { x: W * 0.5, y: H * 0.175 };
  var K_FLICK = 2.3;                 // 弾いた長さ → 届く距離
  var SLOT_R = 240;
  var SLOTS = [
    { x: W * 0.15, y: H * 0.5, col: GREEN }, { x: W * 0.19, y: H * 0.28, col: YEL },
    { x: W * 0.85, y: H * 0.5, col: BLUE }, { x: W * 0.81, y: H * 0.28, col: PINK }
  ];
  var PAD_Y = H * 0.87;
  // [手元に着く拍, 札の色(棚口)]
  var CHART = [[5, 2], [7, 0], [9, 3], [11, 1], [12, 2], [14, 3], [15, 0], [16, 1], [18, 2], [19, 3],
    [20, 0], [21, 2], [23, 1], [24, 3], [25, 1], [26, 2], [27, 0]];
  // デモ: [拍, 札, ゴーストが狙う口]。3個目は勢い不足で下の口へ飛んでMISS
  var DEMO_CHART = [[5, 2, 2], [7, 1, 1], [9, 3, 2]];
  var DEMO_BEATS = 12;

  // 仕分け室の行進曲(独自)
  var MEL = [
    [['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['G5', 0.5], ['C6', 1]],
    [['B5', 0.5], ['A5', 0.5], ['G5', 1], ['F5', 0.5], ['E5', 0.5], ['D5', 1]],
    [['E5', 0.5], ['F5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1]],
    [['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 2]]
  ];
  var BAS = [
    [['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5]],
    [['G2', 0.5], ['D3', 0.5], ['G2', 0.5], ['D3', 0.5], ['G2', 0.5], ['D3', 0.5], ['G2', 0.5], ['D3', 0.5]],
    [['A2', 0.5], ['E3', 0.5], ['A2', 0.5], ['E3', 0.5], ['F2', 0.5], ['C3', 0.5], ['F2', 0.5], ['C3', 0.5]],
    [['G2', 0.5], ['D3', 0.5], ['G2', 0.5], ['D3', 0.5], ['C3', 0.5], ['G3', 0.5], ['C3', 1]]
  ];

  var CLERK = [
    ['...bbbbbb...', '..bbbbbbbb..', '.yyyyyyyyyy.', '...ssssss...', '...ssssss...', '...skssks...', '...ssmmss...', '....ssss....', '..rrrrrrrr..', '.rrrrwwrrrr.', 'ssrrrwwrrrss', 'ss.rrrrrr.ss', '...nnnnnn...', '...nn..nn...', '..ooo..ooo..'],
    ['...bbbbbb...', '..bbbbbbbb..', '.yyyyyyyyyy.', '...ssssss...', '...ssssss...', '...skssks...', '...ssmmss...', 'ss..ssss..ss', 'ss.rrrrrr.ss', '.rrrrwwrrrr.', '..rrrwwrrr..', '...rrrrrr...', '...nnnnnn...', '...nn..nn...', '..ooo..ooo..']
  ];
  var CLERK_PAL = { b: BLUE, y: YEL, s: SKIN, k: OUT, m: RED, r: '#3a6ad0', w: WHITE, n: '#2a2a44', o: OUT };
  var MATE = ['..bbbbbb..', '.yyyyyyyy.', '..ssssss..', '..skssks..', '..ssmmss..', '...ssss...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltP, over, won, endT, prevBest, sent, sparkT, drag;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    var o = Math.max(4, sz * 0.09);
    game.draw.text(s, x - o, y, { size: sz, color: OUT, bold: true, align: align || 'center' });
    game.draw.text(s, x + o, y, { size: sz, color: OUT, bold: true, align: align || 'center' });
    game.draw.text(s, x, y - o, { size: sz, color: OUT, bold: true, align: align || 'center' });
    game.draw.text(s, x, y + o + 2, { size: sz, color: OUT, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function box(x, y, w, h, fill, th) {
    var t = th || 8;
    game.draw.rect(x - t, y - t, w + t * 2, h + t * 2, OUT);
    game.draw.rect(x, y, w, h, fill);
  }
  function blob(x, y, r, fill, th) {
    game.draw.circle(x, y, r + (th || 8), OUT);
    game.draw.circle(x, y, r, fill);
  }

  function newRun(chart, demo) {
    var ps = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      ps.push({ tCatch: c[0] * SPB, tDrop: (c[0] - 1) * SPB, slot: c[1], aim: c[2], res: '', dropped: false, tl: 0, lx: 0, ly: 0, arrived: false, fz: 0, fx: 0, fy: 0, post: 0, final: false, gain: 0, demoDone: false });
    }
    return {
      demo: demo, ps: ps, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, beatK: -1, beatT: 0,
      hits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      throwT: 0, aimX: 0, aimY: 0, aimOk: true, bounce: 0, mateT: [0, 0, 0, 0]
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltP = null; over = false; won = false; endT = 0; sent = false; sparkT = 0; drag = null;
    prevBest = game.best || 0;
  }

  // ── 拍クロック ──
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 2], ['G4', 0.5], ['R', 0.5], ['G4', 0.5], ['B4', 0.5]], { tempo: BPM, wave: 'square', volume: 0.05, bass: [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1]], bassWave: 'triangle', bassVolume: 0.08 });
      return;
    }
    var i = (nb - 1) % MEL.length;
    game.audio.melody(MEL[i], { tempo: BPM, wave: 'square', volume: 0.055, bass: BAS[i], bassWave: 'triangle', bassVolume: 0.075 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) {
      r.lastBeat = k; r.beatK = k;
      if (k < r.beats) {
        r.beatT = 0.15; r.bounce = 1;
        if (loud && k % 2 === 1) game.audio.tone(140, 0.05, { wave: 'sawtooth', volume: 0.05 });   // 2拍目・4拍目のスタンプ
      }
    }
    for (var i = 0; i < r.ps.length; i++) {
      var p = r.ps[i];
      if (!p.dropped && t >= p.tDrop) {
        p.dropped = true;
        if (loud) game.audio.tone(220, 0.06, { wave: 'square', volume: 0.06, slide: -80 });
      }
      if (p.res === '' && t > p.tCatch + LATE) missParcel(r, p, HANDS.x, HANDS.y + 140, loud);
      if (p.res === 'hit' && !p.arrived && t >= p.tl + SPB) {
        p.arrived = true;
        r.mateT[p.slot] = 0.35;
        var sl = SLOTS[p.slot];
        game.fx.popup('+' + p.gain, sl.x, sl.y - 110, { color: WHITE, size: 54 });
        game.fx.burst(sl.x, sl.y, { color: sl.col, count: 10, speed: 240 });
        if (loud) game.audio.tone(1320, 0.06, { wave: 'triangle', volume: 0.07 });
      }
      if (p.res === 'miss') {
        if (p.fz > 0 && !p.final) {
          p.fz -= dt;
          if (p.fz <= 0) game.feedback.bad(p.fx, p.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: RED });
        } else if (p.fz <= 0) p.post += dt;
      }
    }
    for (var m = 0; m < 4; m++) if (r.mateT[m] > 0) r.mateT[m] -= dt;
    if (r.beatT > 0) r.beatT -= dt;
    if (r.throwT > 0) r.throwT -= dt;
    r.bounce *= Math.pow(0.02, dt);
  }

  function landPoint(vx, vy) { return { x: HANDS.x + vx * K_FLICK, y: HANDS.y + vy * K_FLICK }; }
  function nearestSlot(px, py) {
    var best = -1, bd = SLOT_R * SLOT_R;
    for (var j = 0; j < SLOTS.length; j++) {
      var dx = px - SLOTS[j].x, dy = py - SLOTS[j].y, d2 = dx * dx + dy * dy;
      if (d2 <= bd) { bd = d2; best = j; }
    }
    return best;
  }

  function hitParcel(r, p, d, loud) {
    var perfect = Math.abs(d) <= PERF;
    p.res = 'hit'; p.tl = r.songT;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfects++; else r.goods++;
    p.gain = (perfect ? 200 : 100) + r.combo * 20;
    r.score += p.gain;
    game.feedback.good(HANDS.x, HANDS.y - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : WHITE, count: perfect ? 16 : 9, volume: loud ? 0.35 : 0 });
    if (r.combo > 0 && r.combo % 5 === 0) game.fx.popup('COMBO x' + r.combo, W / 2, H * 0.4, { color: YEL, size: 70 });
    if (r.hits === 8 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 8', W / 2, H * 0.47, { color: PINK, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missParcel(r, p, x, y, loud) {
    if (p.res !== '') return;
    p.res = 'miss'; p.fz = 0.35; p.post = 0; p.fx = x; p.fy = y;
    r.misses++; r.combo = 0;
    if (loud) game.audio.tone(110, 0.16, { wave: 'sawtooth', volume: 0.08, slide: -40 });
    if (!r.demo && r.misses >= LIVES) { p.final = true; halt = 0.5; haltP = p; }
  }

  // 弾く: 向き(vx,vy)と長さで飛ぶ先が決まる
  function flick(r, vx, vy, loud) {
    var best = null, bd = 99;
    for (var i = 0; i < r.ps.length; i++) {
      var p = r.ps[i];
      if (p.res !== '' || !p.dropped) continue;
      var dd = Math.abs(r.songT - p.tCatch);
      if (dd <= EDGE && dd < bd) { bd = dd; best = p; }
    }
    var len = Math.sqrt(vx * vx + vy * vy);
    var lp = landPoint(vx, vy);
    var j = len >= 50 && vy < -20 ? nearestSlot(lp.x, lp.y) : -1;
    r.throwT = 0.4; r.aimX = lp.x; r.aimY = lp.y;
    if (loud) game.audio.tone(300 + Math.min(len, 500) * 1.6, 0.08, { wave: 'square', volume: 0.06, slide: 260 });   // 勢いが音程
    if (!best) {
      r.aimOk = true;
      game.fx.burst(HANDS.x, HANDS.y, { color: WHITE, count: 4, speed: 120 });
      return;
    }
    var d = r.songT - best.tCatch;
    r.aimOk = j === best.slot;
    if (Math.abs(d) <= GOODW && j === best.slot) hitParcel(r, best, d, loud);
    else missParcel(r, best, HANDS.x, HANDS.y - 30, loud);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) run.score += (LIVES - run.misses) * 250;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { delivered: run.hits, total: CHART.length, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押して払って離す(離した時刻と、直近0.3秒の払いの向き・長さで判定) ──
  game.onPress(function (x, y, id) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    drag = { id: id, x: x, y: y, smp: [{ t: game.time.elapsed, x: x, y: y }] };
    game.audio.tone(520, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function (x, y, id) {
    if (!drag || id !== drag.id) return;
    drag.x = x; drag.y = y;
    drag.smp.push({ t: game.time.elapsed, x: x, y: y });
    if (drag.smp.length > 40) drag.smp.shift();
    // 指の軌跡に小さな粒(払っている手応え)
    if (drag.smp.length % 3 === 0) game.fx.burst(x, y, { color: YEL, count: 1, speed: 40 });
  });
  game.onRelease(function (x, y, id) {
    if (!drag || id !== drag.id) return;
    var d = drag;
    drag = null;
    if (state !== S.PLAYING || over || halt > 0 || readyT > 0) return;
    game.fx.burst(x, y, { color: WHITE, count: 3, speed: 90 });
    var s0 = flickStart(d, game.time.elapsed);
    flick(run, x - s0.x, y - s0.y, true);
  });
  function flickStart(d, now) {
    for (var i = 0; i < d.smp.length; i++) if (now - d.smp[i].t <= 0.3) return d.smp[i];
    return d.smp[d.smp.length - 1];
  }

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで2個を札の口へ弾き、3個目は勢い不足で下の口へ → MISS ──
  var demo = { t: 0, run: null, hx: W / 2, hy: PAD_Y, press: false, vx: 0, vy: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var p = null;
    for (var i = 0; i < r.ps.length; i++) if (!r.ps[i].demoDone) { p = r.ps[i]; break; }
    var tx = W / 2, ty = PAD_Y + Math.sin(game.time.elapsed * 3) * 10;
    demo.press = false;
    if (p) {
      var sl = SLOTS[p.aim];
      var vx = (sl.x - HANDS.x) / K_FLICK, vy = (sl.y - HANDS.y) / K_FLICK;
      var t0 = p.tCatch - 0.16;
      if (r.songT >= t0 - 0.3) { tx = W / 2; ty = PAD_Y; }
      if (r.songT >= t0) {
        var q = Math.min(1, (r.songT - t0) / 0.16);
        tx = W / 2 + vx * q; ty = PAD_Y + vy * q;
        demo.press = true;
        r.throwT = 0.05; r.aimX = HANDS.x + vx * q * K_FLICK; r.aimY = HANDS.y + vy * q * K_FLICK; r.aimOk = true;
        if (r.songT >= p.tCatch) { p.demoDone = true; flick(r, vx, vy, audioOk); }
      }
    }
    demo.hx += (tx - demo.hx) * Math.min(1, dt * (demo.press ? 30 : 8));
    demo.hy += (ty - demo.hy) * Math.min(1, dt * (demo.press ? 30 : 8));
  }

  // ── 描画 ──
  function drawRoom(r) {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, WALL0], [0.72, WALL1], [0.72, FLOOR], [1, '#a65a2e']]);
    // 床板
    for (var fy = H * 0.74; fy < H; fy += 60) game.draw.rect(0, fy, W, 6, '#9a5028');
    // 壁の仕分け棚(小さな棚口が並ぶ)
    for (var side = 0; side < 2; side++) {
      var x0 = side === 0 ? 20 : W - 340;
      box(x0, H * 0.14, 320, H * 0.55, WOOD, 10);
      for (var row = 0; row < 7; row++) {
        for (var c = 0; c < 3; c++) {
          var cx = x0 + 16 + c * 100, cy = H * 0.15 + 10 + row * 145;
          game.draw.rect(cx, cy, 88, 128, '#5c3018');
          if ((row * 3 + c + side) % 4 === 0) game.draw.rect(cx + 12, cy + 70, 64, 50, WHITE);
          else if ((row + c) % 3 === 0) game.draw.rect(cx + 18, cy + 60, 52, 60, KRAFT);
        }
      }
    }
    // シュート
    var sh = r && r.beatT > 0 ? r.beatT / 0.15 : 0;
    box(CHUTE.x - 120, 0, 240, CHUTE.y - 30, '#9aa6b8', 10);
    box(CHUTE.x - 150, CHUTE.y - 50, 300, 60, '#c8d0dc', 10);
    blob(CHUTE.x, CHUTE.y - 110, 26 + sh * 8, sh > 0 ? YEL : '#6a7488', 8);
    // ほこりの粒
    for (var i = 0; i < 6; i++) game.draw.circle((i * 211 + el * 20) % W, H * 0.3 + Math.sin(el + i) * 200, 5, WHITE, 0.5);
  }

  function drawSlots(r) {
    var next = null;
    for (var i = 0; i < r.ps.length; i++) {
      var p = r.ps[i];
      if (p.res === '' && p.dropped) { next = p; break; }
    }
    var aimJ = -1;
    if (drag || r.throwT > 0) {
      var lp = drag ? landPoint(drag.x - flickStart(drag, game.time.elapsed).x, drag.y - flickStart(drag, game.time.elapsed).y) : { x: r.aimX, y: r.aimY };
      aimJ = nearestSlot(lp.x, lp.y);
    }
    for (var j = 0; j < SLOTS.length; j++) {
      var s = SLOTS[j];
      var lit = next && next.slot === j;
      var pulse = lit ? 0.5 + 0.5 * Math.sin(game.time.elapsed * 18) : 0;
      box(s.x - 110, s.y - 95, 220, 190, lit ? s.col : '#5c3018', 12);
      game.draw.rect(s.x - 90, s.y - 75, 180, 150, '#3a1c0c');
      if (lit) game.draw.rect(s.x - 90, s.y - 75, 180, 150, s.col, 0.25 + pulse * 0.3);
      if (aimJ === j) game.draw.rect(s.x - 122, s.y - 107, 244, 214, WHITE, 0.35);
      // 隣の局員(棚の奥から手を出す)
      var pop = r.mateT[j] > 0 ? r.mateT[j] / 0.35 : 0;
      game.draw.sprite(MATE, CLERK_PAL, s.x, s.y - 20 - pop * 20, 9, { anchor: 'center' });
      blob(s.x - 60, s.y + 50 - pop * 30, 20, SKIN, 6);
      blob(s.x + 60, s.y + 50 - pop * 30, 20, SKIN, 6);
      blob(s.x + (j < 2 ? 95 : -95), s.y - 80, 22, s.col, 6);
    }
  }

  function parcelAt(x, y, sc, slot, white) {
    var w = 120 * sc, h = 96 * sc;
    if (white) { game.draw.circle(x, y, 120 * sc, WHITE, 0.4); box(x - w / 2, y - h / 2, w, h, WHITE, 10); return; }
    box(x - w / 2, y - h / 2, w, h, KRAFT, 8);
    game.draw.rect(x - w / 2, y - h / 2, w, h * 0.22, KRAFT_D);
    game.draw.rect(x - 8 * sc, y - h / 2, 16 * sc, h, '#e8c890');
    box(x + w * 0.12, y + h * 0.02, w * 0.28, h * 0.32, SLOTS[slot].col, 4);
    game.draw.rect(x - w * 0.3, y - h * 0.05, 10 * sc, 12 * sc, OUT);
    game.draw.rect(x - w * 0.12, y - h * 0.05, 10 * sc, 12 * sc, OUT);
  }

  function drawParcels(r) {
    var t = r.songT;
    for (var i = 0; i < r.ps.length; i++) {
      var p = r.ps[i];
      if (!p.dropped) continue;
      if (p.res === '') {
        if (t < p.tCatch) {
          var q = (t - p.tDrop) / SPB;
          parcelAt(HANDS.x, CHUTE.y + (HANDS.y - CHUTE.y) * q * q, 1, p.slot, false);
        } else parcelAt(HANDS.x, HANDS.y, 1, p.slot, false);
      } else if (p.res === 'hit' && !p.arrived) {
        var a = Math.min(1, (t - p.tl) / SPB), sl = SLOTS[p.slot];
        var px = HANDS.x + (sl.x - HANDS.x) * a, py = HANDS.y + (sl.y - HANDS.y) * a - Math.sin(a * Math.PI) * 260;
        parcelAt(px, py, 1 - a * 0.3, p.slot, false);
      } else if (p.res === 'miss') {
        if (p.fz > 0 || (p.final && halt > 0)) parcelAt(p.fx, p.fy, 1.45, p.slot, true);
        else if (p.post < 0.7) parcelAt(p.fx + p.post * 260, p.fy + p.post * p.post * 1600, 1, p.slot, false);
      }
    }
  }

  function drawClerk(r) {
    var f = r.throwT > 0.2 || drag ? 1 : 0;
    var by = H * 0.735 - r.bounce * 14;
    game.draw.circle(HANDS.x, H * 0.8, 120, OUT, 0.18);
    game.draw.sprite(CLERK[f], CLERK_PAL, HANDS.x, by, 15, { anchor: 'center' });
    // 投げた向き(点線)
    if (r.throwT > 0 || drag) {
      var lx = r.aimX, ly = r.aimY;
      if (drag) { var s0 = flickStart(drag, game.time.elapsed); var lp = landPoint(drag.x - s0.x, drag.y - s0.y); lx = lp.x; ly = lp.y; }
      var col = drag ? WHITE : r.aimOk ? YEL : RED;
      for (var n = 1; n <= 10; n++) {
        var a = n / 10;
        game.draw.circle(HANDS.x + (lx - HANDS.x) * a, HANDS.y + (ly - HANDS.y) * a - Math.sin(a * Math.PI) * 120, 9, col);
      }
    }
  }

  function drawPad() {
    box(W * 0.18, H * 0.8, W * 0.64, H * 0.15, drag ? '#ffe9a8' : WHITE, 10);
    var el = game.time.elapsed;
    for (var c = 0; c < 3; c++) {
      var cy = H * 0.915 - c * 70 - ((el * 120) % 70);
      game.draw.line(W / 2 - 70, cy + 40, W / 2, cy, BLUE, 16);
      game.draw.line(W / 2 + 70, cy + 40, W / 2, cy, BLUE, 16);
    }
  }

  function drawHud(r) {
    box(0, -10, W, 240, '#ffffff', 10);
    txt(String(r.score), 40, 70, 64, RED, 'left');
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 80 - i * 90;
      if (i < LIVES - r.misses) { box(lx - 30, 40, 60, 48, KRAFT, 5); game.draw.rect(lx - 5, 40, 10, 48, '#e8c890'); }
      else { box(lx - 30, 56, 60, 14, RED, 5); }
    }
    txt(r.hits + ' / ' + r.ps.length, W / 2, 70, 52, BLUE);
    // 拍ランプ(太い縁の丸4つ)
    var k = Math.max(0, r.beatK), q = k % 4;
    for (var b = 0; b < 4; b++) {
      var on = b === q && r.beatT > 0 && k < r.beats;
      blob(W / 2 - 225 + b * 150, 172, on ? 34 : 24, on ? (b === 0 ? RED : YEL) : '#e0d6c4', 7);
    }
    if (r.combo >= 2) txt('x' + r.combo, W * 0.5, H * 0.43, 60, YEL);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.46, 120, won ? YEL : RED);
      return;
    }
    box(80, H * 0.2, W - 160, H * 0.36, WHITE, 14);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 104, won ? YEL : RED);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.325, 66, BLUE);
    txt('SCORE ' + run.score, W / 2, H * 0.38, 56, RED);
    txt('PERFECT ' + run.perfects, W * 0.36, H * 0.425, 42, BLUE);
    txt('x' + run.maxCombo, W * 0.74, H * 0.425, 42, PINK);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.475, 60, PINK);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 46, BLUE);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.ps.length; i++) if (run.ps[i].res !== 'hit') left++;
      txt('あと' + left + '個!', W / 2, H * 0.53, 54, RED);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 46, WHITE);
  }

  function drawAll(r) {
    drawRoom(r);
    drawSlots(r);
    drawPad();
    drawClerk(r);
    drawParcels(r);
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 16 });
      box(60, H * 0.115, W - 120, 150, RED, 12);
      txt(GAME_TITLE, W / 2, H * 0.15, 104, YEL);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.19, 40, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, YEL);
      else txt('TAP TO START', W / 2, H * 0.975, 46, WHITE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.18; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.5), { color: [RED, BLUE, YEL, PINK][Math.floor(game.random(0, 4))], count: 16, speed: 340 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltP.fx, haltP.fy, { text: 'MISS', flashColor: RED });
          haltP.fz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= SONG_BEATS * SPB + 0.3) {
          game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: BPM, wave: 'square', volume: 0.06, bass: [['C3', 3]] });
          finish(true);
        }
      }
    }

    drawAll(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 130, YEL);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
