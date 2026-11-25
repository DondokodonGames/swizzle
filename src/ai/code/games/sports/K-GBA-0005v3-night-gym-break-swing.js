// K-GBA-0005v3-night-gym-break-swing.js
// 夜の体育館 溜め打ち — 拍を数えながらバットを溜め、球が届く拍の頭でちょうど離して振り抜く。伴奏と灯りが消える小節でも拍を保つ
// 操作: 画面を押し続けるとバットを引いて溜まる(右の溜めメーターが半分で打てる、満タンでPERFECTが出せる)。天井の投球機が拍の頭で球を出し、2拍(遅い球は3拍)後の拍の頭で打点に届くので、その瞬間に指を離して振る。拍外れ・溜め不足・見送りはMISS
// 終わり: 6小節(約15秒・8球)を打ち切ればCLEAR。MISSが3つでGAME OVER。4小節目と6小節目は伴奏・拍ランプ・照明が消え、球は出た瞬間しか見えない(直前の拍で灯りが明滅して予告)
// @mechanic: hold_charge
// @theme: night_gym_break_batting
// 世界観: 灯りを落とした夜の体育館で、居残り練習の打者が天井から吊った投球機の球を、溜めたバットで拍の頭に迎え打つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 打った数・暗闇で打った数・PERFECT数・スコア
// スタイル: HD POST 3D
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度の褐色寄り、半透明円の重ねでブルーム、四辺を落とすビネット
  var STYLE = { bg: ['#16120e', '#3a3028'], main: ['#8a7458', '#5e6a70', '#c8b48c'], accent: ['#f0d8a0', '#d07848'] };
  var BG0 = STYLE.bg[0], BG1 = STYLE.bg[1], WOOD = STYLE.main[0], STEEL = STYLE.main[1], SAND = STYLE.main[2];
  var GLOW = STYLE.accent[0], EMBER = STYLE.accent[1];
  var INK = '#0a0806', WALL = '#2a241e', FLOOR_D = '#4a3a28', FLOOR_L = '#6a5238', BALLC = '#ece4d4', SKIN = '#c8a080', MISSC = '#c8504a';

  var GAME_TITLE = 'NIGHT GYM';
  var BPM = 100;
  var SPB = 60 / BPM;
  var BARS = 6;                     // 0小節目はカウント
  var TIME_LIMIT = (BARS * 4 + 1) * SPB;
  var BREAKS = [3, 5];              // 伴奏・拍ランプ・照明が消える小節
  var PERF = 0.07, GOODW = 0.14, EDGE = 0.24;
  var HALF = 0.45 * SPB, FULL = 0.9 * SPB;
  var LIVES = 3;
  var MX = W * 0.5, MY = H * 0.27;   // 投球機の口
  var HX = W * 0.6, HY = H * 0.62;   // 打点
  var BX = W * 0.46, BY = H * 0.71;  // 打者
  var METER_X = W * 0.87, METER_Y0 = H * 0.8, METER_H = H * 0.22;
  var PAD_Y = H * 0.885;
  // [球が出る拍, 届くまでの拍数]
  var CHART = [[4, 2], [6, 2], [9, 2], [12, 2], [14, 2], [17, 2], [19, 3], [22, 2]];
  // デモ: [出る拍, 拍数, ゴーストが押す拍(届く拍からの差), 離す拍の差]
  var DEMO_CHART = [[4, 2, -1.4, 0], [8, 2, -1.4, 0], [12, 2, -1.4, -0.5]];
  var DEMO_BREAKS = [2];
  var DEMO_BEATS = 16;

  // 夜の体育館の伴奏(独自の旋律・Aマイナー)。小節頭で1小節ずつ鳴らす
  var PHRASES = [
    [['A4', 1], ['C5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 0.5], ['B4', 0.5]],
    [['E5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1]],
    [['A4', 0.5], ['A4', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1]],
    [['C5', 1], ['B4', 0.5], ['A4', 0.5], ['E4', 1], ['A4', 1]]
  ];
  var BASSES = [
    [['A2', 1], ['A2', 1], ['F2', 1], ['G2', 1]],
    [['C3', 1], ['G2', 1], ['E2', 1], ['E2', 1]],
    [['F2', 1], ['F2', 1], ['D2', 1], ['E2', 1]],
    [['A2', 1], ['E2', 1], ['A2', 1], ['A2', 1]]
  ];

  var BATTER = [
    ['.........b..', '...hhhh..b..', '..hhhhhh.b..', '..hhhhhh.b..', '...ssss..b..', '..jjjjjjsb..', '.jjjjjjjjs..', '.jjjjjjjj...', '.sjjjjjj....', '..jjjjjj....', '..pppppp....', '..pp..pp....', '..pp..pp....', '.ppp..ppp...', '.kk....kk...', '............'],
    ['............', '...hhhh.....', '..hhhhhh..bb', '..hhhhhh.bb.', '...ssss.bb..', '..jjjjjjs...', '.jjjjjjjjs..', '.jjjjjjjj...', '..jjjjjjj...', '..jjjjjj....', '..pppppp....', '.ppp..pp....', '.pp...ppp...', 'pp.....pp...', 'kk.....kk...', '............'],
    ['............', '....hhhh....', '...hhhhhh...', '...hhhhhh...', '....ssss....', 'bbbsjjjjjj..', '..bbsjjjjjj.', '....jjjjjjj.', '....jjjjjj..', '....jjjjjj..', '....pppppp..', '....pp..pp..', '...pp...pp..', '..pp.....pp.', '..kk.....kk.', '............']
  ];
  var BAT_PAL = { h: '#3a4048', s: SKIN, j: STEEL, p: SAND, k: INK, b: GLOW };
  var MACHINE = ['......rr......', '......rr......', '..mmmmmmmmmm..', '.mmwwmmmmwwmm.', '.mwwwwmmwwwwm.', '.mmwwmmmmwwmm.', '..mmmmmmmmmm..', '.....mggm.....'];
  var MACH_PAL = { r: STEEL, m: '#4a4440', w: '#7a7068', g: EMBER };
  var GRIP = ['..gggggggggggggg', '.gtgtgtgtggggggg', '..gggggggggggggg'];
  var GRIP_PAL = { g: WOOD, t: SAND };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltBall, over, won, endT, prevBest, sent, sparkT, holdId;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2.2, col, a * 0.12);
    game.draw.circle(x, y, r * 1.5, col, a * 0.22);
    game.draw.circle(x, y, r, col, a);
  }

  function newRun(chart, breaks, demo) {
    var balls = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      balls.push({ tFire: c[0] * SPB, tArr: (c[0] + c[1]) * SPB, pressAt: c[2], relAt: c[3], fired: false, res: '', freeze: 0, post: 0, fly: 0, fx: 0, fy: 0, final: false, blind: false });
    }
    return {
      demo: demo, balls: balls, breaks: breaks, songT: 0, lastBeat: -1, lastBar: 0, beatK: -1, dark: false,
      holding: false, holdT: 0, full: false, swingT: 0, fireT: 0, beatT: 0, warnT: 0, lightT: 0,
      hits: 0, blindHits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false
    };
  }
  function isBreak(r, bar) { return r.breaks.indexOf(bar) >= 0; }

  function initGame() {
    run = newRun(CHART, BREAKS, false);
    readyT = 0.8; halt = 0; haltBall = null; over = false; won = false; endT = 0; sent = false; sparkT = 0; holdId = null;
    prevBest = game.best || 0;
  }

  // ── 拍クロック ──
  function playBar(bar) {
    var i = (bar - 1) % PHRASES.length;
    game.audio.melody(PHRASES[i], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: BASSES[i], bassWave: 'square', bassVolume: 0.035 });
  }
  function onBeat(r, k, loud) {
    var bar = Math.floor(k / 4), q = k % 4;
    r.beatK = k;
    var wasDark = r.dark;
    r.dark = isBreak(r, bar);
    if (r.dark) {
      if (!wasDark && loud) game.audio.tone(70, 0.25, { wave: 'sawtooth', volume: 0.06, slide: -30 });
      return;   // 抜けた小節: 伴奏も拍ランプも出さない
    }
    r.beatT = 0.14;
    if (wasDark) { r.lightT = 0.4; if (loud) game.audio.tone(140, 0.1, { wave: 'square', volume: 0.08 }); }
    if (loud) {
      game.audio.tone(q === 0 ? 95 : 80, 0.09, { wave: 'triangle', volume: q === 0 ? 0.16 : 0.11 });
      game.audio.tone(q === 0 ? 1760 : 1320, 0.03, { wave: 'square', volume: 0.03 });
      if (bar === 0) game.audio.tone(q === 3 ? 'E5' : 'A4', 0.12, { wave: 'triangle', volume: 0.07 });
    }
    // 予告: 次の小節が抜けるなら最後の拍で灯りが明滅し、下降音
    if (q === 3 && isBreak(r, bar + 1)) {
      r.warnT = SPB;
      if (loud) game.audio.tone(900, SPB * 0.8, { wave: 'square', volume: 0.04, slide: -620 });
    }
  }

  function ballPos(b, t) {
    var p = (t - b.tFire) / (b.tArr - b.tFire);
    return { x: MX + (HX - MX) * p, y: MY + (HY - MY) * p - Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * 70, r: 8 + 26 * Math.max(0, p) * Math.max(0, p), p: p };
  }
  function ballSeen(r, b, t) {
    if (t - b.tFire < 0.35 * SPB) return true;
    return !isBreak(r, Math.floor(t / SPB / 4));
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) { r.lastBeat = k; onBeat(r, k, loud); }
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) {
      r.lastBar = nb;
      if (loud && nb >= 1 && nb < BARS && !isBreak(r, nb)) playBar(nb);
      if (loud && nb === BARS && !r.demo) game.audio.melody([['A4', 0.5], ['E5', 0.5], ['A5', 2]], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: [['A2', 3]] });
    }
    for (var i = 0; i < r.balls.length; i++) {
      var b = r.balls[i];
      if (!b.fired && t >= b.tFire) {
        b.fired = true; r.fireT = 0.3;
        if (loud) game.audio.tone(220, 0.08, { wave: 'square', volume: 0.07, slide: 180 });
      }
      if (b.res === '' && b.fired && t > b.tArr + EDGE) missBall(r, b, loud);
      if (b.res === 'miss') {
        if (b.freeze > 0 && !b.final) {
          b.freeze -= dt;
          if (b.freeze <= 0) game.feedback.bad(b.fx, b.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
        } else if (b.freeze <= 0) b.post += dt;
      }
      if (b.res === 'hit') b.fly += dt;
    }
    if (r.holding) {
      r.holdT += dt;
      if (!r.full && r.holdT >= FULL) {
        r.full = true;
        if (loud) game.audio.tone(1568, 0.06, { wave: 'triangle', volume: 0.06 });
      }
    }
    if (r.swingT > 0) r.swingT -= dt;
    if (r.fireT > 0) r.fireT -= dt;
    if (r.beatT > 0) r.beatT -= dt;
    if (r.warnT > 0) r.warnT -= dt;
    if (r.lightT > 0) r.lightT -= dt;
  }

  function startHold(r, loud) {
    r.holding = true; r.holdT = 0; r.full = false;
    if (loud) game.audio.tone(300, 0.05, { wave: 'triangle', volume: 0.05, slide: 120 });
  }

  function releaseSwing(r, loud) {
    var hold = r.holdT;
    r.holding = false; r.holdT = 0; r.full = false; r.swingT = 0.28;
    var best = null, bd = 99;
    for (var i = 0; i < r.balls.length; i++) {
      var c = r.balls[i];
      if (c.res !== '' || !c.fired) continue;
      var dd = Math.abs(r.songT - c.tArr);
      if (dd <= EDGE && dd < bd) { bd = dd; best = c; }
    }
    if (!best) {
      // 球の来ない所での素振り(罰なし)
      if (loud) game.audio.tone(200, 0.08, { wave: 'triangle', volume: 0.06, slide: -90 });
      game.fx.burst(HX, HY, { color: SAND, count: 4, speed: 100 });
      return;
    }
    var ad = Math.abs(r.songT - best.tArr);
    if (ad > GOODW || hold < HALF) { missBall(r, best, loud); return; }
    var perfect = ad <= PERF && hold >= FULL;
    var blind = isBreak(r, Math.floor((best.tArr - 0.01) / SPB / 4)) || isBreak(r, Math.floor((best.tFire + 0.4 * SPB) / SPB / 4));
    best.res = 'hit'; best.fly = 0; best.blind = blind;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (blind) r.blindHits++;
    if (perfect) r.perfects++; else r.goods++;
    r.score += ((perfect ? 300 : 150) + r.combo * 20) * (blind ? 2 : 1);
    game.feedback.good(HX, HY, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GLOW : SAND, count: perfect ? 18 : 10, volume: loud ? 0.4 : 0 });
    if (loud) game.audio.tone(perfect ? 1480 : 1100, 0.08, { wave: 'square', volume: 0.07 });
    if (r.hits === 4 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 4', W / 2, H * 0.45, { color: GLOW, size: 78 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missBall(r, b, loud) {
    if (b.res !== '') return;
    var p = ballPos(b, Math.min(r.songT, b.tArr + 0.1));
    b.res = 'miss'; b.freeze = 0.35; b.post = 0; b.fx = p.x; b.fy = p.y;
    r.misses++; r.combo = 0;
    if (loud) game.audio.tone(120, 0.14, { wave: 'sawtooth', volume: 0.08 });
    if (!r.demo && r.misses >= LIVES) { b.final = true; halt = 0.5; haltBall = b; }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    run.holding = false;
    if (ok) run.score += (LIVES - run.misses) * 200;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { hits: run.hits, total: CHART.length, blindHits: run.blindHits, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押して溜め、離して振る ──
  game.onPress(function (x, y, id) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0 || run.holding) { game.audio.tone(330, 0.03, { wave: 'square', volume: 0.03 }); return; }
    holdId = id;
    startHold(run, true);
    game.fx.burst(W / 2, PAD_Y, { color: GLOW, count: 4, speed: 90 });
  });

  game.onRelease(function (x, y, id) {
    if (state !== S.PLAYING || !run.holding || id !== holdId) return;
    holdId = null;
    if (over || halt > 0) { run.holding = false; game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    game.fx.burst(BX + 80, BY - 60, { color: SAND, count: 3, speed: 140 });
    releaseSwing(run, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 明るい小節で1球、灯りの消えた小節で1球(拍を数えて打つ)、3球目は離すのが早くてMISS ──
  var demo = { t: 0, run: null, hy: PAD_Y };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, DEMO_BREAKS, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var next = null;
    for (var i = 0; i < r.balls.length; i++) if (r.balls[i].res === '') { next = r.balls[i]; break; }
    if (next) {
      var pressT = next.tArr + next.pressAt * SPB, relT = next.tArr + next.relAt * SPB;
      if (!r.holding && r.songT >= pressT && r.songT < relT) startHold(r, audioOk);
      if (r.holding && r.songT >= relT) releaseSwing(r, audioOk);
    }
    var ty = r.holding ? PAD_Y + Math.min(1, r.holdT / FULL) * 60 : PAD_Y - 40 + Math.sin(game.time.elapsed * 3) * 10;
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──
  function drawGym(r) {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, BG0], [0.3, BG1], [0.36, FLOOR_D], [1, FLOOR_L]]);
    // 奥の壁と高窓(月明かり)
    game.draw.rect(0, H * 0.12, W, H * 0.24, WALL);
    for (var w = 0; w < 5; w++) {
      var wx = 90 + w * 210;
      game.draw.rect(wx, H * 0.15, 120, 80, STEEL, 0.35 + 0.05 * Math.sin(tt * 0.7 + w));
      game.draw.rect(wx + 56, H * 0.15, 8, 80, WALL);
    }
    // 天井のトラス
    game.draw.rect(0, H * 0.125, W, 10, '#3a342e');
    for (var tx = 0; tx < W; tx += 90) game.draw.line(tx, H * 0.13, tx + 90, H * 0.19, '#3a342e', 4);
    game.draw.rect(0, H * 0.19, W, 8, '#3a342e');
    // 床板(消失点へ収束する目地 + 奥ほど詰まる横の継ぎ目)
    for (var i = -9; i <= 9; i++) game.draw.line(W / 2 + i * 34, H * 0.36, W / 2 + i * 210, H, '#3e3022', 3);
    for (var n = 1; n < 12; n++) { var fy = H * 0.36 + H * 0.64 * (n / 12) * (n / 12); game.draw.rect(0, fy, W, 3, '#3e3022'); }
    // コートの白線(かすれた)
    game.draw.rect(W * 0.18, H * 0.5, W * 0.64, 6, SAND, 0.25);
    // スポットライトの円錐(唯一残った灯り)
    var lit = r && r.dark ? 0.35 : 1;
    for (var y = H * 0.14; y < H * 0.84; y += 28) {
      var cw = 70 + (y - H * 0.14) * 0.62;
      game.draw.rect(W * 0.53 - cw / 2, y, cw, 28, GLOW, 0.035 * lit);
    }
    bloom(W * 0.53, H * 0.135, 22, GLOW, 0.8 * lit);
    game.draw.rect(BX - 90, BY + 96, 200, 22, INK, 0.3);
    game.draw.rect(BX - 60, BY + 90, 140, 34, INK, 0.3);
  }

  function drawPlay(r) {
    var tt = game.time.elapsed, t = r.songT;
    // 投球機(拍ランプ付き)
    game.draw.line(MX, H * 0.19, MX, MY - 70, STEEL, 6);
    game.draw.sprite(MACHINE, MACH_PAL, MX, MY - 30, 12, { anchor: 'center' });
    var bk = r.beatK >= 0 ? r.beatK % 4 : -1;
    for (var l = 0; l < 4; l++) {
      var lx = MX - 66 + l * 44, on = !r.dark && l === bk && r.beatT > 0;
      game.draw.circle(lx, MY - 92, 11, INK);
      if (on) bloom(lx, MY - 92, 9, l === 0 ? EMBER : GLOW, 1);
      else game.draw.circle(lx, MY - 92, 7, '#3a342e');
    }
    if (r.fireT > 0) bloom(MX, MY + 8, 18, EMBER, r.fireT / 0.3);
    // 打点の枠(ストライクゾーン)
    var zp = !r.dark && r.beatT > 0 ? r.beatT / 0.14 : 0;
    game.draw.rect(HX - 70, HY - 70, 140, 6, SAND, 0.3 + 0.4 * zp);
    game.draw.rect(HX - 70, HY + 64, 140, 6, SAND, 0.3 + 0.4 * zp);
    game.draw.rect(HX - 70, HY - 70, 6, 140, SAND, 0.3 + 0.4 * zp);
    game.draw.rect(HX + 64, HY - 70, 6, 140, SAND, 0.3 + 0.4 * zp);
    // 球
    for (var i = 0; i < r.balls.length; i++) {
      var b = r.balls[i];
      if (!b.fired) continue;
      if (b.res === '') {
        if (!ballSeen(r, b, t)) continue;
        var p = ballPos(b, t);
        game.draw.circle(p.x + 10, HY + 150 - (1 - Math.min(1, p.p)) * 120, p.r * 0.9, INK, 0.3);
        bloom(p.x, p.y, p.r, BALLC, 1);
        game.draw.rect(p.x - p.r * 0.6, p.y - 2, p.r * 1.2, 4, MISSC, 0.6);
      } else if (b.res === 'hit' && b.fly < 1) {
        var hx = HX - b.fly * 420, hy = HY - b.fly * 1100 + b.fly * b.fly * 300;
        bloom(hx, hy, Math.max(4, 30 - b.fly * 26), b.blind ? EMBER : GLOW, 1 - b.fly * 0.6);
      } else if (b.res === 'miss') {
        if (b.freeze > 0) {
          game.draw.circle(b.fx, b.fy, 90, '#ffffff', 0.35);
          game.draw.circle(b.fx, b.fy, 52, '#ffffff');
        } else if (b.post < 0.6) {
          game.draw.circle(b.fx + b.post * 200, b.fy + b.post * 500, 30, BALLC, 1 - b.post / 0.6);
        }
      }
    }
    // 打者(溜めるほど引く)
    var f = r.swingT > 0 ? 2 : r.holding && r.holdT >= HALF ? 1 : 0;
    game.draw.sprite(BATTER[f], BAT_PAL, BX, BY, 13, { anchor: 'center' });
    if (r.holding && r.full) bloom(BX + 60, BY - 70, 16, GLOW, 0.5 + 0.3 * Math.sin(tt * 20));
    // 溜めメーター(半分=打てる、満タン=PERFECTが出せる)
    var c = r.holding ? Math.min(1, r.holdT / FULL) : 0;
    game.draw.rect(METER_X - 30, METER_Y0 - METER_H, 60, METER_H, INK, 0.7);
    game.draw.rect(METER_X - 22, METER_Y0 - METER_H * c, 44, METER_H * c, c >= 1 ? GLOW : c >= 0.5 ? SAND : WOOD);
    game.draw.rect(METER_X - 40, METER_Y0 - METER_H * 0.5, 80, 6, SAND);
    game.draw.rect(METER_X - 40, METER_Y0 - METER_H, 80, 6, GLOW);
    if (c >= 1) bloom(METER_X, METER_Y0 - METER_H, 20, GLOW, 0.6);
    // 暗転(抜けた小節)と予告の明滅
    if (r.dark) game.draw.rect(0, H * 0.12, W, H * 0.73, INK, 0.62);
    if (r.warnT > 0 && Math.floor(tt * 14) % 2 === 0) game.draw.rect(0, H * 0.12, W, H * 0.73, INK, 0.45);
    if (r.lightT > 0) game.draw.rect(0, 0, W, H, GLOW, r.lightT * 0.3);
    // 握り(親指ゾーン)
    game.draw.rect(W * 0.2, PAD_Y - 100, W * 0.6, 200, r.holding ? WOOD : INK, r.holding ? 0.55 : 0.45);
    game.draw.rect(W * 0.2, PAD_Y - 100, W * 0.6, 6, r.holding ? GLOW : SAND, 0.8);
    game.draw.sprite(GRIP, GRIP_PAL, W / 2, PAD_Y, 22, { anchor: 'center' });
  }

  function vignette() {
    for (var i = 0; i < 6; i++) {
      var th = 26 + i * 26;
      game.draw.rect(0, 0, th, H, INK, 0.08);
      game.draw.rect(W - th, 0, th, H, INK, 0.08);
      game.draw.rect(0, H - th, W, th, INK, 0.08);
    }
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.115, INK, 0.6);
    txt(String(r.score), 40, 66, 52, GLOW, 'left');
    txt(r.hits + ' / ' + r.balls.length, W / 2, 66, 42, SAND);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 76, alive = i < LIVES - r.misses;
      if (alive) bloom(lx, 66, 20, BALLC, 1);
      else { game.draw.circle(lx, 66, 20, '#3a342e'); game.draw.rect(lx - 22, 63, 44, 6, MISSC); }
    }
    // 拍ランプ(抜けた小節は消灯、予告の拍は赤く明滅)
    var bk = r.beatK >= 0 ? r.beatK % 4 : -1;
    for (var k = 0; k < 4; k++) {
      var x = W * 0.29 + k * W * 0.14, y = H * 0.09;
      game.draw.rect(x - 40, y - 14, 80, 28, '#2a241e');
      var warn = r.warnT > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (!r.dark && k === bk && r.beatT > 0) game.draw.rect(x - 34, y - 9, 68, 18, k === 0 ? EMBER : GLOW);
      else if (warn) game.draw.rect(x - 34, y - 9, 68, 18, MISSC, 0.7);
    }
    if (r.combo >= 2) txt('x' + r.combo, HX + 140, HY - 110, 46, GLOW);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 112, won ? GLOW : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.21, W - 160, H * 0.35, INK, 0.82);
    bloom(W / 2, H * 0.21, 30, won ? GLOW : MISSC, 0.5);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, won ? GLOW : MISSC);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.325, 64, SAND);
    txt('SCORE ' + run.score, W / 2, H * 0.38, 52, GLOW);
    txt('PERFECT ' + run.perfects, W * 0.4, H * 0.425, 40, SAND);
    game.draw.rect(W * 0.62 - 34, H * 0.425 - 26, 68, 52, INK);
    bloom(W * 0.62, H * 0.425, 14, EMBER, 1);
    txt('x' + run.blindHits, W * 0.7, H * 0.425, 40, EMBER);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.475, 56, GLOW);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 44, SAND);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.balls.length; i++) if (run.balls[i].res === '') left++;
      txt('あと' + left + '球!', W / 2, H * 0.53, 50, EMBER);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, SAND);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawGym(demo.run);
      drawPlay(demo.run);
      vignette();
      drawHud(demo.run);
      game.draw.hand(W / 2 + 40, demo.hy, { press: demo.run.holding, scale: 16 });
      game.draw.rect(0, H * 0.125, W, 160, INK, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.153, 100, GLOW);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.196, 40, SAND);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, GLOW);
      else txt('TAP TO START', W / 2, H * 0.965, 44, SAND);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.22; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.45), { color: [GLOW, EMBER, SAND][Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltBall.fx, haltBall.fy, { text: 'MISS', flashColor: MISSC });
          haltBall.freeze = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= TIME_LIMIT + 0.3) finish(true);
      }
    }

    drawGym(run);
    drawPlay(run);
    vignette();
    drawHud(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, GLOW);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
