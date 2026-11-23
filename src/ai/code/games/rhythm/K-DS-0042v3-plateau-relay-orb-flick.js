// K-DS-0042v3-plateau-relay-orb-flick.js
// 高原中継所の信号玉ワルツ — 前の中継所から2拍かけて跳ねて届いた信号の玉を、三拍子の1拍目で横へ弾き、2拍目・3拍目と跳ねて次の1拍目に光った受信皿へ着く勢いで送り継ぐ
// 操作: 画面を押して右へなぞり、指を離した瞬間に受け台の玉が飛ぶ。なぞった長さがそのまま玉の飛ぶ距離(押している間、下の操作盤に近・中・遠の3つの刻みが出て、前半は届く先の跳ね道も点線で出る)。離す時刻を1拍目の頭に合わせる(ずれでPERFECT/GOOD、早すぎ・遅れ・見送りはMISSで玉がこぼれる)。玉は2拍目・3拍目に地面で跳ね、次の1拍目に着地。着地点が光っている受信皿(次の的はその小節の2拍目に灯が点滅して予告、後半は3拍目)から外れるとMISS。皿の真ん中ならNICE。玉が受け台に来る前に離しても空振り(罰なし)
// 終わり: 108BPM・3拍子の前奏1小節+10小節(約18秒・玉10個)を送り終えればCLEAR(判定+着地+真ん中+連続+残り)。MISS3回でGAME OVER。7個目から霧が出て跳ね道の点線が消え、皿も小さくなる
// @mechanic: flick_launch
// @theme: plateau_radio_relay_orb_waltz
// 世界観: 雲海を見下ろす高原の電波中継所で、ヘッドセットの技師が前の中継所から跳ねて届く信号の玉を三拍子の1拍目に弾き、光った受信皿へ跳ね送って次の中継所へ合図をつないでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・届けた玉の数・真ん中に入れた数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 90s PRE-RENDER
var STYLE = { bg: ['#141a2e', '#a0607a'], main: ['#8c96a6', '#c8a060', '#1c2230'], accent: ['#4ad8ff', '#ffb84a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 動かない1枚絵の夕景(粒状ノイズ・金属の照り返し)。動くのは玉・技師(ドット)・灯だけ
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], steel: STYLE.main[0], brass: STYLE.main[1], ink: STYLE.main[2],
    cyan: STYLE.accent[0], amber: STYLE.accent[1], green: '#7cf08a', hi: '#e8eef6', bad: '#ff5050',
    grass: '#3a4a3a', grassHi: '#5f7a52', cloud: '#c8bcd0', cloudDk: '#8a7f9c', plate: '#3a4250', plateDk: '#262c38', gold: '#ffd25a'
  };

  var GAME_TITLE = 'SIGNAL WALTZ';
  var BPM = 108;
  var SPB = 60 / BPM;              // 0.556秒
  var BAR = SPB * 3;               // 3拍子 1小節 = 1.667秒
  var FLICKS = 10;
  var TIME_LIMIT = 19;             // 前奏1小節 + 10小節 = 18.3秒
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.15;
  var LIVES = 3;
  var FOG_FROM = 6;                // 7個目から霧
  var MIN_DRAG = 60;
  var RIDGE = 1180;                // 尾根の地面
  var CR_X = 200, CR_Y = 1124;     // 受け台
  var DISH_Y = 1092;               // 受信皿の口
  var RX = [500, 700, 920];        // 受信皿(近・中・遠): 受け台からの距離 300 / 500 / 720
  var RCOL = [C.green, C.amber, C.cyan];
  var RPITCH = ['E5', 'A5', 'D6'];
  var RAIL_Y = 1700;
  var DEMO_SEQ = [0, 1, 2, 1];
  var DEMO_ERR = [0, 10, -200, 0];   // 3個目はなぞりが短くて手前に落ちる例

  // 伴奏(オリジナルのワルツ): 1拍目にベース+旋律、2・3拍目は和音の刻み。4小節で一巡
  var LEAD = ['D5', 'F5', 'A5', 'G5', 'Bb4', 'D5', 'E5', 'G5', 'C5', 'F5', 'A5', 'C6'];
  var BASS = ['D3', 'G2', 'C3', 'F2'];
  var CHORD = [['F4', 'A4'], ['Bb4', 'D5'], ['E4', 'G4'], ['A4', 'C5']];

  // ── スプライト ─────────────────────────────────────
  var TECH_PAL = { y: '#e8c040', Y: '#fff0a0', h: '#20242c', s: '#d8a880', e: '#101010', o: '#4a6a8a', O: '#6a8aaa', b: '#c8a060', k: '#20242c', m: '#8a3a2a' };
  var TECH_IDLE = [
    '...yyyyyy...',
    '..yYyyyyyy..',
    '.hyyyyyyyyh.',
    '.hssssssssh.',
    '.hsesssessh.',
    '..ssssssss..',
    '..sssmmsss..',
    '...ssssss...',
    '..oooooooo..',
    '.oOoobbooOo.',
    '.soooooooos.',
    '.s.oooooo.s.',
    '...oo..oo...',
    '...oo..oo...',
    '..kkk..kkk..'
  ];
  var TECH_FLICK = [
    '...yyyyyy...',
    '..yYyyyyyy..',
    '.hyyyyyyyyh.',
    '.hssssssssh.',
    '.hsesssessh.',
    '..ssssssss..',
    '..sssmmsss..',
    '...ssssss...',
    '..oooooooo..',
    '.oOoobboooss',
    '.soooooooo..',
    '.s.oooooo...',
    '...oo..oo...',
    '..oo....oo..',
    '.kkk....kkk.'
  ];
  var TECH_CHEER = [
    's..yyyyyy..s',
    's.yYyyyyyy.s',
    'ohyyyyyyyyho',
    'ohssssssssho',
    '.hsesssessh.',
    '..ssssssss..',
    '..ssmmmmss..',
    '...ssssss...',
    '..oooooooo..',
    '..oOobbooO..',
    '..oooooooo..',
    '...oooooo...',
    '...oo..oo...',
    '...oo..oo...',
    '..kkk..kkk..'
  ];
  var TECH_OOPS = [
    '............',
    '...yyyyyy...',
    '..yYyyyyyy..',
    '.hyyyyyyyyh.',
    '.hssssssssh.',
    '.hseesseesh.',
    '..ssssssss..',
    '..ssmmmmss..',
    '.s.oooooo.s.',
    '.soOobbooOs.',
    '..oooooooo..',
    '...oooooo...',
    '...oo..oo...',
    '...oo..oo...',
    '..kkk..kkk..'
  ];

  // 粒状ノイズ(1枚絵として固定)
  var GRAIN = [];
  var gs = 11;
  function grnd() { gs = (gs * 9301 + 49297) % 233280; return gs / 233280; }
  for (var g = 0; g < 360; g++) GRAIN.push([grnd() * W, 230 + grnd() * (H - 230), 2 + grnd() * 3, grnd() < 0.5 ? '#ffffff' : '#000000', 0.03 + grnd() * 0.05]);
  var STARS = [];
  for (var st = 0; st < 40; st++) STARS.push([grnd() * W, 240 + grnd() * 420, 1.5 + grnd() * 2.5, grnd() * 6]);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null;

  function makeSeq() {
    var seq = [0, 1];
    for (var k = 2; k < FLICKS; k++) {
      var t = Math.floor(game.random(0, 3)) % 3;
      if (t === seq[k - 1]) t = (t + 1 + (Math.floor(game.random(0, 2)) % 2)) % 3;
      seq.push(t);
    }
    return seq;
  }

  function newRun(isDemo) {
    var seq = isDemo ? DEMO_SEQ.slice() : makeSeq();
    var fl = [];
    for (var k = 0; k < seq.length; k++) {
      var tF = (k + 1) * BAR;
      fl.push({
        k: k, tgt: seq[k], tF: tF, litT: tF - (k < FOG_FROM ? 2 : 1) * SPB,
        rel: -1, len: 0, landX: 0, caught: false, center: false, grade: 0, landed: false, dropT: -1, hops: 0, pinged: false, inHop: 0
      });
    }
    return {
      demo: isDemo, fl: fl, cur: 0, n: seq.length, endT: (seq.length + 1) * BAR,
      clock: isDemo ? -0.2 : -READY_T, realT: 0, cueB: -1, lastBeat: -1,
      score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, sent: 0, centers: 0,
      drag: null, hitStop: 0, flashAt: null, pendingBad: null, beatPulse: 0, pose: 0, poseT: 0,
      rings: [], over: false, won: false, outroT: 0, prevBest: game.best, milestone: false, ended: false, fogA: 0
    };
  }

  function sfx(f, d, o) { if (!run.demo) game.audio.tone(f, d, o); }

  // ── 拍クロック(1本)。伴奏は melody を0.06秒先に予約して拍の頭に合わせる ──
  function cueAudio() {
    var total = Math.round(run.endT / SPB);
    for (var b = run.cueB + 1; b < total; b++) {
      if (run.clock + 0.06 < b * SPB) break;
      run.cueB = b;
      if (!run.demo) playBeat(b);
    }
  }
  function playBeat(b) {
    var pos = b % 3, bar = Math.floor(b / 3) % 4;
    if (pos === 0) {
      game.audio.melody([[LEAD[bar * 3], 1]], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: [[BASS[bar], 0.9]], bassWave: 'sine', bassVolume: 0.16 });
    } else {
      var ch = CHORD[bar];
      game.audio.melody([[LEAD[bar * 3 + pos], 0.6], ['R', 0.4]], { tempo: BPM, wave: 'square', volume: 0.022, bass: [[ch[0], 0.3], [ch[1], 0.3]], bassWave: 'triangle', bassVolume: 0.05 });
    }
  }
  function onBeat(b) {
    run.beatPulse = 1;
    var pos = b % 3;
    sfx(pos === 0 ? 98 : 520, pos === 0 ? 0.1 : 0.03, { wave: pos === 0 ? 'triangle' : 'square', volume: pos === 0 ? 0.2 : 0.03 });
  }

  function dishW(f) { return f.k < FOG_FROM ? 78 : 58; }

  // ── 玉の位置(実ロジックの時刻から求める) ──
  function arc(xa, ya, xb, yb, u, hgt) {
    return { x: xa + (xb - xa) * u, y: ya + (yb - ya) * u - hgt * 4 * u * (1 - u) };
  }
  function orbPos(f) {
    var c = run.clock;
    if (c < f.tF - BAR) return null;
    if (f.dropT >= 0) {
      var dt = c - f.dropT;
      if (dt > 0.9) return null;
      return { x: CR_X - dt * 140, y: CR_Y + dt * dt * 1100, a: 1 - dt / 0.9 };
    }
    if (f.rel < 0) {
      if (c < f.tF - 2 * SPB) return arc(-100, RIDGE - 22, 40, RIDGE - 22, (c - (f.tF - BAR)) / SPB, 150);
      if (c < f.tF - SPB) return arc(40, RIDGE - 22, CR_X, CR_Y, (c - (f.tF - 2 * SPB)) / SPB, 130);
      return { x: CR_X, y: CR_Y - Math.abs(Math.sin(c * 9)) * 6, a: 1 };
    }
    var u = (c - f.rel) / SPB;
    var P = f.landX - CR_X;
    var x1 = CR_X + P / 3, x2 = CR_X + P * 2 / 3;
    var yEnd = f.caught ? DISH_Y : RIDGE - 22;
    var h = 50 + P * 0.16;
    if (u < 1) return arc(CR_X, CR_Y, x1, RIDGE - 22, u, h);
    if (u < 2) return arc(x1, RIDGE - 22, x2, RIDGE - 22, u - 1, h);
    if (u < 3) return arc(x2, RIDGE - 22, f.landX, yEnd, u - 2, h);
    var after = c - (f.rel + BAR);
    if (f.caught) {
      if (after > 0.7) return null;
      return { x: f.landX, y: DISH_Y - Math.max(0, after - 0.25) * 2200, a: 1 - Math.max(0, after - 0.25) / 0.45 };
    }
    if (after > 0.8) return null;
    return { x: f.landX + after * 60, y: RIDGE - 22 + after * 20, a: 1 - after / 0.8 };
  }

  // ── 判定(本番の指もATTRACTのゴーストも同じ関数) ──────────────
  function release(len) {
    var f = run.fl[run.cur];
    if (!f || run.over) return 'none';
    if (run.clock < f.tF - SPB) {                       // 玉がまだ受け台に来ていない: 空振り(罰なし)
      sfx(260, 0.06, { wave: 'sine', volume: 0.05, slide: -60 });
      return 'whiff';
    }
    var d = run.clock - f.tF;
    run.pose = 1; run.poseT = 0.3;
    if (Math.abs(d) > GOOD_W) { dropOrb(f, d < 0 ? 'early' : 'late'); return 'miss'; }
    var P = Math.max(90, Math.min(860, len));
    f.rel = run.clock; f.len = len; f.landX = CR_X + P;
    var off = Math.abs(f.landX - RX[f.tgt]);
    f.caught = off <= dishW(f); f.center = off <= 24;
    f.grade = Math.abs(d) <= PERFECT_W ? 1 : 2;
    if (f.grade === 1) run.perfect++; else run.good++;
    run.score += f.grade === 1 ? 100 : 60;
    run.cur++;
    // 発射音の高さ = 勢い
    sfx(220 + P * 0.9, 0.14, { wave: 'sawtooth', volume: 0.06, slide: 420 });
    game.feedback.good(CR_X + 40, CR_Y - 90, {
      text: f.grade === 1 ? 'PERFECT' : 'GOOD', color: f.grade === 1 ? C.cyan : C.amber, size: f.grade === 1 ? 54 : 46,
      count: f.grade === 1 ? 12 : 7, volume: run.demo ? 0 : 0.18
    });
    return 'fly';
  }

  function dropOrb(f, why) {
    f.dropT = run.clock;
    run.cur++;
    missAt(CR_X, CR_Y, why);
  }

  function missAt(x, y, why) {
    run.miss++; run.combo = 0;
    run.hitStop = 0.4; run.flashAt = { x: x, y: y };
    run.pendingBad = { x: x, y: y - 80 };
    run.pose = 3; run.poseT = 1.0;
    sfx(why === 'short' ? 180 : 140, 0.2, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function flushBad() {
    if (!run.pendingBad) return;
    var pb = run.pendingBad;
    run.pendingBad = null; run.flashAt = null;
    game.feedback.bad(pb.x, pb.y, { text: 'MISS', color: C.bad, flashColor: C.hi, shake: run.demo ? 3 : 12, volume: run.demo ? 0 : 0.55 });
    if (!run.demo && run.miss >= LIVES) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function land(f) {
    f.landed = true;
    if (f.caught) {
      run.sent++; run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo);
      var gain = 80 + Math.min(10, run.combo) * 10 + (f.center ? 120 : 0);
      run.score += gain;
      if (f.center) run.centers++;
      run.rings.push({ x: RX[f.tgt], y: 760, t: 0, col: RCOL[f.tgt] });
      sfx(RPITCH[f.tgt], 0.25, { wave: 'triangle', volume: 0.12 });
      sfx(880 + Math.min(10, run.combo) * 60, 0.08, { wave: 'square', volume: 0.04 });
      game.feedback.good(f.landX, DISH_Y - 70, { text: f.center ? 'NICE' : '+' + gain, color: f.center ? C.gold : RCOL[f.tgt], size: f.center ? 60 : 44, count: f.center ? 16 : 8, volume: run.demo ? 0 : 0.15 });
      if (!run.demo && run.combo === 5 && !run.milestone) {
        run.milestone = true;
        game.fx.popup('x5', W / 2, 520, { color: C.gold, size: 90 });
        game.audio.play('se_milestone', 0.45);
      }
    } else {
      missAt(f.landX, RIDGE - 30, f.landX < RX[f.tgt] ? 'short' : 'long');
    }
  }

  function stepRun(dt) {
    run.clock += dt;
    cueAudio();
    var bi = Math.floor(run.clock / SPB);
    var lastB = Math.round(run.endT / SPB) - 1;
    while (run.lastBeat < bi && run.lastBeat < lastB) { run.lastBeat++; onBeat(run.lastBeat); }
    for (var i = 0; i < run.fl.length; i++) {
      var f = run.fl[i];
      // 跳ね入り(2拍目)と受け台への着き(3拍目)
      if (f.inHop === 0 && run.clock >= f.tF - 2 * SPB) { f.inHop = 1; sfx(1400, 0.03, { wave: 'square', volume: 0.035 }); }
      if (f.inHop === 1 && run.clock >= f.tF - SPB) { f.inHop = 2; sfx(700, 0.05, { wave: 'triangle', volume: 0.08 }); }
      // 次の受信皿の予告
      if (!f.pinged && run.clock >= f.litT) { f.pinged = true; sfx(RPITCH[f.tgt], 0.08, { wave: 'square', volume: 0.05 }); sfx(RPITCH[f.tgt], 0.08, { wave: 'sine', volume: 0.06 }); }
      if (f.rel >= 0 && !f.landed) {
        var hop = Math.floor((run.clock - f.rel) / SPB);
        if (hop > f.hops && hop < 3) { f.hops = hop; sfx(1800, 0.025, { wave: 'square', volume: 0.04 }); }
        if (run.clock >= f.rel + BAR) { land(f); if (run.hitStop > 0) return; }
      }
    }
    if (run.over) return;
    var cf = run.fl[run.cur];
    if (cf && run.clock > cf.tF + GOOD_W) { dropOrb(cf, 'late'); return; }
    if (!run.demo && !cf) {
      var busy = false;
      for (var j = 0; j < run.fl.length; j++) if (run.fl[j].rel >= 0 && !run.fl[j].landed) busy = true;
      if (!busy) finishRun(run.miss < LIVES);
    }
  }

  function finishRun(ok) {
    if (run.over) return;
    run.over = true; run.won = ok; run.outroT = 2.2; run.drag = null;
    if (run.demo) return;
    game.audio.stopBgm();
    if (ok) {
      run.score += (LIVES - run.miss) * 200 + 300;
      for (var i = 0; i < 3; i++) {
        game.fx.burst(RX[i], 780, { color: RCOL[i], count: 20, speed: 400 });
        run.rings.push({ x: RX[i], y: 760, t: -i * 0.15, col: RCOL[i] });
      }
      game.fx.burst(CR_X, CR_Y - 120, { color: C.gold, count: 24, speed: 460 });
      game.fx.flash(C.hi, 0.25);
      game.audio.play('se_success', 0.55);
      run.pose = 2; run.poseT = 2.2;
    } else {
      game.audio.play('se_failure', 0.5);
      run.pose = 3; run.poseT = 2.2;
    }
  }

  function endGame() {
    var stats = { score: run.score, sent: run.sent, center: run.centers, perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (run.won) game.end.success(run.score, stats); else game.end.failure(stats);
  }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; run = newRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; run = newRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || run.over || run.hitStop > 0 || y < 230) return;
    run.drag = { x0: x, x: x, y: y };
    run.pose = 1; run.poseT = 0.15;
    game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !run.drag) return;
    var before = run.drag.x - run.drag.x0;
    run.drag.x = x;
    var now = x - run.drag.x0;
    // 刻みを越えるたびに小さく鳴る(近・中・遠)
    for (var i = 0; i < 3; i++) {
      var mark = RX[i] - CR_X;
      if ((before < mark) !== (now < mark)) game.audio.tone(RPITCH[i], 0.03, { wave: 'sine', volume: 0.04 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !run.drag) return;
    var len = x - run.drag.x0;
    run.drag = null;
    if (run.over || run.hitStop > 0) return;
    if (len < MIN_DRAG) { game.audio.tone(200, 0.04, { wave: 'sine', volume: 0.04 }); return; }
    release(len);
  });

  // ── 描画 ─────────────────────────────────────────
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function rivet(x, y) {
    game.draw.circle(x, y, 8, '#000000', 0.5);
    game.draw.circle(x - 1, y - 1, 6, C.steel);
    game.draw.circle(x - 3, y - 3, 2.5, C.hi, 0.8);
  }
  function mast(x, yB, yT, w) {
    var lx0 = x - w, rx0 = x + w, lx1 = x - w * 0.3, rx1 = x + w * 0.3;
    game.draw.line(lx0, yB, lx1, yT, '#0c0f16', 12);
    game.draw.line(rx0, yB, rx1, yT, '#0c0f16', 12);
    game.draw.line(lx0, yB, lx1, yT, C.steel, 6);
    game.draw.line(rx0, yB, rx1, yT, '#5a6474', 6);
    var n = Math.max(3, Math.round((yB - yT) / 70));
    for (var i = 0; i < n; i++) {
      var ya = yB - (yB - yT) * i / n, yb = yB - (yB - yT) * (i + 1) / n;
      var wa = w - (w * 0.7) * i / n, wb = w - (w * 0.7) * (i + 1) / n;
      game.draw.line(x - wa, ya, x + wb, yb, '#6a7484', 3);
      game.draw.line(x + wa, ya, x - wb, yb, '#4a5464', 3);
    }
    game.draw.line(lx0 + 2, yB, lx1 + 2, yT, C.hi, 1.5);
  }
  function dish(x, y, r, col, lit) {
    // 受信皿(上向きのパラボラ)。金属の照り返し
    game.draw.rect(x - 8, y, 16, RIDGE - y, '#0c0f16');
    game.draw.rect(x - 4, y, 6, RIDGE - y, C.steel);
    for (var i = 0; i < 6; i++) {
      var k = i / 5;
      var w = r * (0.35 + 0.65 * k);
      game.draw.rect(x - w - 3, y - i * 6 - 3, w * 2 + 6, 9, '#0c0f16');
      game.draw.rect(x - w, y - i * 6 - 2, w * 2, 6, i < 3 ? '#4a5464' : '#8c96a6');
    }
    game.draw.rect(x - r, y - 32, r * 2, 4, C.hi, 0.7);
    if (lit) game.draw.circle(x, y - 22, r * 0.6, col, 0.35);
  }

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, RIDGE, [[0, C.sky0], [0.45, '#3a3054'], [0.8, C.sky1], [1, '#e0a070']]);
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      game.draw.rect(s[0], s[1], s[2], s[2], C.hi, 0.35 + 0.35 * Math.sin(t * 1.5 + s[3]));
    }
    // 遠い山並み(金属質の青灰)
    game.draw.circle(160, 1380, 420, '#2c3046');
    game.draw.circle(620, 1460, 520, '#262a3e');
    game.draw.circle(1040, 1400, 440, '#2c3046');
    game.draw.circle(160, 1380, 420, '#6a6a90', 0.12);
    // 尾根の草地と崖
    game.draw.rect(0, RIDGE, W, 30, C.grassHi);
    game.draw.gradient(RIDGE + 30, 1470, [[0, C.grass], [1, '#1a2028']]);
    for (var g = 0; g < 40; g++) game.draw.rect(g * 28 + (g % 3) * 5, RIDGE - 6 - (g % 4) * 3, 6, 10 + (g % 4) * 3, C.grassHi);
    // 雲海(崖の下でゆっくり流れる)
    for (var c = 0; c < 7; c++) {
      var cx = ((c * 190 + t * (14 + c * 3)) % (W + 300)) - 150;
      game.draw.circle(cx, 1330 + (c % 3) * 40, 90 + (c % 2) * 40, C.cloudDk, 0.55);
      game.draw.circle(cx + 40, 1310 + (c % 3) * 40, 70 + (c % 2) * 30, C.cloud, 0.45);
    }
    // 中継所の大鉄塔(技師の持ち場)と、前の中継所へ伸びる電線
    mast(96, RIDGE, 430, 70);
    game.draw.line(0, 470, 96, 450, '#0c0f16', 4);
    game.draw.circle(130, 470, 58, '#0c0f16');
    game.draw.circle(126, 466, 50, C.steel);
    game.draw.circle(116, 456, 20, C.hi, 0.6);
    var blink = Math.floor(t * 2) % 2 === 0;
    game.draw.circle(96, 420, 12, blink ? C.bad : '#5a2020');
  }

  function drawGrain() {
    for (var i = 0; i < GRAIN.length; i++) {
      var g = GRAIN[i];
      game.draw.rect(g[0], g[1], g[2], g[2], g[3], g[4]);
    }
  }

  function nextTarget() {
    var f = run.fl[run.cur];
    return f && run.clock >= f.litT ? f : null;
  }

  function drawReceivers() {
    var t = game.time.elapsed;
    var nf = nextTarget();
    for (var i = 0; i < 3; i++) {
      var x = RX[i];
      var top = 700 + i * 40;
      mast(x, RIDGE, top, 34);
      // 飛んでいる玉の行き先は点灯、次の的は点滅 + 着地の幅を示す
      var flying = false;
      for (var j = 0; j < run.fl.length; j++) { var f = run.fl[j]; if (f.rel >= 0 && !f.landed && f.tgt === i) flying = true; }
      var isNext = nf && nf.tgt === i;
      var on = flying || (isNext && Math.floor(t * 10) % 2 === 0);
      game.draw.circle(x, top - 10, 30, '#000000', 0.5);
      game.draw.circle(x, top - 10, 24, on ? RCOL[i] : '#30343c');
      if (on) { game.draw.circle(x, top - 10, 46, RCOL[i], 0.25); game.draw.circle(x - 7, top - 17, 7, C.hi, 0.8); }
      var dw = nf && nf.tgt === i ? dishW(nf) : 70;
      dish(x, DISH_Y + 20, 60, RCOL[i], on);
      if (isNext) {
        game.draw.rect(x - dw, RIDGE + 6, dw * 2, 10, RCOL[i], 0.8);
        game.draw.rect(x - dw - 3, RIDGE - 8, 6, 30, RCOL[i]);
        game.draw.rect(x + dw - 3, RIDGE - 8, 6, 30, RCOL[i]);
      }
    }
  }

  function drawOrbs() {
    for (var i = 0; i < run.fl.length; i++) {
      var f = run.fl[i];
      var p = orbPos(f);
      if (!p) continue;
      var a = p.a === undefined ? 1 : Math.max(0, p.a);
      var flash = run.flashAt && Math.abs(run.flashAt.x - p.x) < 40 && Math.abs(run.flashAt.y - p.y) < 60;
      // 接地の影
      if (p.y < RIDGE) game.draw.rect(p.x - 20, RIDGE - 4, 40, 6, '#000000', 0.3 * a);
      var r = flash ? 34 : 22;
      game.draw.circle(p.x, p.y, r + 14, flash ? C.hi : C.cyan, 0.25 * a);
      game.draw.circle(p.x, p.y, r + 2, '#0a2a3a', a);
      game.draw.circle(p.x, p.y, r, flash ? C.hi : '#2aa8d8', a);
      game.draw.circle(p.x - 4, p.y - 4, r * 0.6, flash ? C.hi : C.cyan, a);
      game.draw.circle(p.x - 8, p.y - 9, r * 0.25, C.hi, a);
    }
  }

  function drawPreview() {
    if (!run.drag) return;
    var f = run.fl[run.cur];
    var fog = f && f.k >= FOG_FROM;
    var len = run.drag.x - run.drag.x0;
    if (len < MIN_DRAG || fog) return;
    var P = Math.max(90, Math.min(860, len));
    var lx = CR_X + P;
    var pts = [[CR_X, CR_Y], [CR_X + P / 3, RIDGE - 22], [CR_X + P * 2 / 3, RIDGE - 22], [lx, RIDGE - 22]];
    var h = 50 + P * 0.16;
    for (var s = 0; s < 3; s++) {
      for (var k = 1; k < 10; k += 2) {
        var u = k / 10;
        var q = arc(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], u, h);
        game.draw.circle(q.x, q.y, 6, C.hi, 0.75);
      }
    }
    game.draw.rect(lx - 4, RIDGE - 40, 8, 50, C.hi);
  }

  function drawTech() {
    var spr = TECH_IDLE;
    if (run.poseT > 0) spr = run.pose === 1 ? TECH_FLICK : run.pose === 2 ? TECH_CHEER : run.pose === 3 ? TECH_OOPS : TECH_IDLE;
    var bob = run.beatPulse * 6;
    game.draw.rect(60, RIDGE - 4, 120, 8, '#000000', 0.35);
    game.draw.sprite(spr, TECH_PAL, 118, RIDGE - 92 - bob, 12, { anchor: 'center' });
    // 受け台
    game.draw.rect(CR_X - 40, CR_Y + 20, 80, RIDGE - CR_Y - 20, '#0c0f16');
    game.draw.rect(CR_X - 36, CR_Y + 22, 72, 12, C.brass);
    game.draw.rect(CR_X - 36, CR_Y + 22, 72, 3, '#fff0c0', 0.8);
    game.draw.rect(CR_X - 8, CR_Y + 34, 16, RIDGE - CR_Y - 34, C.steel);
  }

  function drawFog() {
    var f = run.fl[Math.min(run.cur, run.fl.length - 1)];
    var want = !run.demo && f && f.k >= FOG_FROM && !run.over ? 1 : 0;
    run.fogA += (want - run.fogA) * 0.04;
    if (run.fogA < 0.02) return;
    var t = game.time.elapsed;
    for (var i = 0; i < 6; i++) {
      var x = ((i * 230 + t * 40) % (W + 400)) - 200;
      game.draw.circle(x, 1080 + (i % 2) * 60, 170, C.cloud, 0.3 * run.fogA);
    }
    game.draw.rect(0, 980, W, 200, C.cloud, 0.16 * run.fogA);
  }

  function drawRings(dt) {
    for (var i = run.rings.length - 1; i >= 0; i--) {
      var r = run.rings[i];
      r.t += dt;
      if (r.t < 0) continue;
      if (r.t > 0.9) { run.rings.splice(i, 1); continue; }
      var rad = 40 + r.t * 320;
      for (var k = 0; k < 2; k++) {
        var rr = rad - k * 50;
        if (rr <= 0) continue;
        game.draw.line(r.x - rr, r.y - rr * 0.4, r.x, r.y - rr * 0.9, r.col, 5);
        game.draw.line(r.x, r.y - rr * 0.9, r.x + rr, r.y - rr * 0.4, r.col, 5);
      }
    }
  }

  // 操作盤: 押している間、押した所から近・中・遠の刻み(受信皿までの距離)が出る
  function drawConsole() {
    game.draw.gradient(1470, H, [[0, C.plate], [1, C.plateDk]]);
    game.draw.rect(0, 1470, W, 6, C.hi, 0.4);
    game.draw.rect(0, 1476, W, 4, '#000000', 0.5);
    rivet(30, 1500); rivet(W - 30, 1500); rivet(30, H - 30); rivet(W - 30, H - 30);
    game.draw.rect(80, RAIL_Y - 26, W - 160, 52, '#0c0f16');
    game.draw.rect(86, RAIL_Y - 20, W - 172, 40, '#1c222c');
    game.draw.rect(86, RAIL_Y - 20, W - 172, 4, C.hi, 0.25);
    var nf = nextTarget();
    var x0 = run.drag ? run.drag.x0 : 130;
    for (var i = 0; i < 3; i++) {
      var mx = x0 + (RX[i] - CR_X);
      var hot = nf && nf.tgt === i;
      var col = mx > W - 20 ? C.bad : RCOL[i];
      var a = run.drag ? 1 : 0.35;
      if (hot && run.drag && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(Math.min(mx, W - 20), RAIL_Y, 34, col, 0.4);
      game.draw.rect(Math.min(mx, W - 20) - 5, RAIL_Y - 44, 10, 88, col, a);
    }
    if (run.drag) {
      var len = Math.max(0, run.drag.x - run.drag.x0);
      game.draw.rect(run.drag.x0, RAIL_Y - 8, len, 16, C.cyan, 0.85);
      game.draw.circle(run.drag.x0, RAIL_Y, 16, C.hi);
      game.draw.circle(run.drag.x0 + len, RAIL_Y, 24, '#0a2a3a');
      game.draw.circle(run.drag.x0 + len, RAIL_Y, 18, '#2aa8d8');
    }
    // 拍ランプ(3拍子。1拍目は大きい)
    var cur = run.lastBeat >= 0 ? run.lastBeat % 3 : -1;
    for (var b = 0; b < 3; b++) {
      var lit = b === cur;
      var bx = W / 2 + (b - 1) * 150, br = b === 0 ? 34 : 24;
      game.draw.circle(bx, 1830, br + 8, '#000000', 0.5);
      game.draw.circle(bx, 1830, br + (lit ? run.beatPulse * 8 : 0), lit ? (b === 0 ? C.amber : C.cyan) : '#30343c');
      if (lit) game.draw.circle(bx - br * 0.3, 1830 - br * 0.3, br * 0.3, C.hi, 0.7);
    }
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, C.plate], [1, C.plateDk]]);
    game.draw.rect(0, 222, W, 8, '#000000');
    game.draw.rect(0, 220, W, 2, C.hi, 0.4);
    label('SCORE ' + run.score, 40, 88, 48, C.amber, 'left');
    if (run.combo >= 2) label('x' + run.combo, 40, 170, 42, C.cyan, 'left');
    // 残り(MISSで消える信号玉)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - run.miss;
      var lx = W - 70 - i * 70;
      game.draw.circle(lx, 76, 24, '#000000', 0.5);
      game.draw.circle(lx, 76, 20, on ? '#2aa8d8' : '#30343c');
      if (on) game.draw.circle(lx - 6, 70, 7, C.hi, 0.8);
    }
    // 玉の進み(10個)
    for (var k = 0; k < run.fl.length; k++) {
      var f = run.fl[k];
      var col = f.landed ? (f.caught ? (f.center ? C.gold : C.cyan) : C.bad) : f.dropT >= 0 ? C.bad : '#30343c';
      game.draw.rect(360 + k * 62, 156, 46, 30, '#000000', 0.6);
      game.draw.rect(363 + k * 62, 159, 40, 24, col);
    }
  }

  function drawScene(dt) {
    drawBackdrop();
    drawReceivers();
    drawRings(dt);
    drawTech();
    drawPreview();
    drawOrbs();
    drawFog();
    drawGrain();
    drawConsole();
  }

  function drawResult(showTap) {
    var y0 = H * 0.25, hh = H * 0.42;
    game.draw.rect(40, y0 - 8, W - 80, hh + 16, '#000000');
    game.draw.gradient(y0, y0 + hh, [[0, C.plate], [1, C.plateDk]]);
    game.draw.rect(48, y0, W - 96, 6, run.won ? C.cyan : C.bad);
    rivet(70, y0 + 30); rivet(W - 70, y0 + 30); rivet(70, y0 + hh - 30); rivet(W - 70, y0 + hh - 30);
    label(run.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, run.won ? C.cyan : C.bad);
    label('SCORE ' + run.score, W / 2, H * 0.38, 62, C.amber);
    label(run.sent + ' / ' + run.n, W / 2, H * 0.44, 66, C.cyan);
    label('NICE ' + run.centers, W / 2, H * 0.485, 40, C.gold);
    label('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.525, 34, C.hi);
    if (run.won && run.score > run.prevBest) label('NEW RECORD', W / 2, H * 0.575, 62, C.gold);
    else label('BEST ' + Math.max(run.prevBest, run.won ? run.score : 0), W / 2, H * 0.575, 46, C.amber);
    if (!run.won) label('あと' + Math.max(1, run.n - run.sent) + '個!', W / 2, H * 0.625, 52, C.bad);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.7, 40, C.hi);
  }

  // ── ATTRACT: 実ロジックで4個。3個目はなぞりが短く手前に落ちてMISSになる例 ──
  var demo = { t: 0, x: 130, y: RAIL_Y, down: false, k: -1 };
  var DEMO_CYC = (DEMO_SEQ.length + 1) * BAR + 1.8;
  function ghost(dt) {
    var f = run.fl[run.cur];
    if (!f || run.over) {
      if (demo.down) { run.drag = null; demo.down = false; }
      demo.x += (130 - demo.x) * Math.min(1, dt * 4);
      return;
    }
    var L = RX[f.tgt] - CR_X + DEMO_ERR[f.k];
    var tStart = f.tF - SPB * 1.15, tEnd = f.tF - 0.07;
    if (!demo.down) {
      demo.x += (130 - demo.x) * Math.min(1, dt * 8);
      if (run.clock >= tStart) { demo.down = true; demo.x = 130; run.drag = { x0: 130, x: 130, y: RAIL_Y }; }
      return;
    }
    var k = Math.max(0, Math.min(1, (run.clock - tStart) / (tEnd - tStart)));
    k = 1 - (1 - k) * (1 - k);
    demo.x = 130 + L * k;
    run.drag.x = demo.x;
    if (run.clock >= f.tF) {
      run.drag = null; demo.down = false;
      release(L);
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { run = newRun(true); demo.down = false; demo.x = 130; }
    if (run.hitStop > 0) { run.hitStop -= dt; if (run.hitStop <= 0) flushBad(); return; }
    if (run.clock < run.endT + 0.6) stepRun(dt);
    ghost(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (!run) run = newRun(true);
    run.beatPulse = Math.max(0, run.beatPulse - dt * 4);
    run.poseT = Math.max(0, run.poseT - dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.x, RAIL_Y, { press: demo.down, scale: 14 });
      game.draw.gradient(0, 230, [[0, C.plate], [1, C.plateDk]]);
      game.draw.rect(0, 222, W, 8, '#000000');
      label(GAME_TITLE, W / 2, 106 + Math.sin(t * 3) * 6, 92, C.cyan);
      label('HI-SCORE ' + game.best, W / 2, 190, 38, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1560, 46, C.gold);
      else label('TAP TO START', W / 2, 1560, 42, C.hi);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ── PLAYING ──
    run.realT += dt;
    if (!run.over && run.realT >= READY_T + TIME_LIMIT + 2.5) { run.hitStop = 0; run.pendingBad = null; finishRun(run.miss < LIVES); }
    if (run.hitStop > 0) {
      run.hitStop -= dt;
      if (run.hitStop <= 0) flushBad();
    } else if (run.over) {
      run.outroT -= dt;
      if (run.outroT <= 0 && !run.ended) { run.ended = true; state = S.RESULT; endGame(); }
    } else {
      var wasReady = run.clock < -0.35;
      stepRun(dt);
      if (wasReady && run.clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(dt);
    drawHud();
    if (run.clock < 0) {
      game.draw.rect(0, H * 0.4 - 10, W, 190, '#000000', 0.8);
      game.draw.gradient(H * 0.4, H * 0.4 + 170, [[0, C.plate], [1, C.plateDk]]);
      label(run.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 115, 110, C.cyan);
    }
    if (run.over && run.hitStop <= 0 && run.outroT < 1.4) drawResult(state === S.RESULT);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    run = newRun(true);
    demo.t = 0;
  });
})(game);
