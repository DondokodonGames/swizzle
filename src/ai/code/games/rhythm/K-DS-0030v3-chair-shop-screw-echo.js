// K-DS-0030v3-chair-shop-screw-echo.js
// 椅子工房のネジ返し — 親方が1小節で鳴らした締め音の数を聞いて数え、流れてきた脚の金具を次の小節で同じ回数ぴったり、拍に乗せてドライバーをひねって締める
// 操作: 1本の脚は2小節。1小節目は親方が左のネジを締める(キュッという締め音とネジ溝の回転を数える。3本目からは親方のドライバーが滑るコッという音が混ざるが数えない)。2小節目は自分の番: 画面のどこでも押して指を横か縦にスッと払うと、右のネジが1回(90度)締まる。払いが決まった瞬間の一番近い拍の頭からのずれでPERFECT/GOOD。払わずに押しただけでは空振り(罰なし)。拍外れ・同じ拍の二度締め・回数の締めすぎはその場でMISS、小節が終わって足りなくてもMISS。親方の回った拍と同じ拍で締めるとBONUS
// 終わり: 脚4本(2回→3回→滑り入り3回→滑り入り4回・約18秒)を締め終えればCLEAR(判定点+ぴったり+BONUS+残り)。MISS3回でGAME OVER
// @mechanic: count_exact
// @theme: chair_workshop_screw_count
// 世界観: 家具工房の組立台で、椅子職人の弟子が親方の締め音を数え、流れてくる椅子の脚の金具のネジを同じ回数だけドライバーで締めて4本脚の椅子を組み上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 組んだ脚の数・PERFECT/GOOD/MISS数・BONUS数・スコア
// スタイル: 1BIT INK
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 墨と紙の2値。中間調は市松・網点のディザ、力と距離は線の太さで語る
  var STYLE = { bg: ['#f3f0e6', '#e8e4d8'], main: ['#141414', '#f3f0e6'], accent: ['#141414', '#f3f0e6'] };
  var PAPER = STYLE.bg[0], PAPER2 = STYLE.bg[1], INK = STYLE.main[0];

  var GAME_TITLE = 'TWIST COUNT';
  var BPM = 120;
  var SPB = 60 / BPM;
  var LIVES = 3;
  var NROUNDS = 4;
  var TIME_LIMIT = 18;                    // 9小節(カウント1 + お手本/返し×4)
  var PERF = 0.07, GOODW = 0.13;
  var TWIST = 56;                          // 払いと見なす指の移動量(px)
  // 脚ごとのお手本の候補: t=締め(数える) s=滑り(数えない)。単位は拍
  var POOLS = [
    [{ t: [0, 2], s: [] }, { t: [0, 1], s: [] }, { t: [1, 3], s: [] }],
    [{ t: [0, 1, 2], s: [] }, { t: [0, 2, 3], s: [] }, { t: [0, 1, 3], s: [] }],
    [{ t: [0, 2, 3], s: [1] }, { t: [0, 1, 3], s: [2] }, { t: [1, 2, 3], s: [0] }],
    [{ t: [0, 1, 2, 3], s: [1.5] }, { t: [0, 1, 2, 3], s: [2.5] }]
  ];
  // デモ: 2回を正しく返し、3回の脚で4回締めてMISS
  var DEMO_ROUNDS = [{ t: [0, 2], s: [], plan: [0, 2] }, { t: [0, 1, 3], s: [], plan: [0, 1, 2, 3] }];

  // 伴奏(独自の旋律)。お手本の小節は低音と刻みだけにして締め音を聞かせ、返しの小節で旋律が入る
  var RESP_PHRASES = [
    [['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1]],
    [['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1], ['E5', 1]],
    [['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 1]],
    [['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 2]]
  ];
  var RESP_BASS = [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1]];
  var CALL_BASS = [['A2', 2], ['E2', 2]];

  var X_L = 400, X_R = 680, PY = H * 0.52;   // 左=親方のネジ 右=自分のネジ
  var MX = 290, MY = H * 0.245;               // 親方
  var PH_X = 712, PH_Y = H * 0.775;           // 自分の柄
  var CHX = 900, CHY = H * 0.245;             // 組み上がっていく椅子

  // 親方(胸から上、鉢巻と丸眼鏡)。0=ふつう 1=締める 2=うなずく
  var MASTER = [
    ['....kkkkkkkk....', '...kkkkkkkkkk...', '..kkkkkkkkkkkk..', '..kwkwkwkwkwkk..', '..kwwwwwwwwwwk..', '..kwkkkwwkkkwk..', '..kwkwkkkkwkwk..', '..kwkkkwwkkkwk..', '..kwwwwwwwwwwk..', '..kwwwwkkwwwwk..', '...kwkkkkkkwk...', '...kkkkkkkkkk...', '.kkkkwkkkkwkkkk.', 'kwwwwkwwwwkwwwwk', 'kwwwwwkwwkwwwwwk', 'kkkkkkkkkkkkkkkk'],
    ['....kkkkkkkk....', '...kkkkkkkkkk...', '..kkkkkkkkkkkk..', '..kwkwkwkwkwkk..', '..kwwwwwwwwwwk..', '..kwkkkwwkkkwk..', '..kwkkkkkkkkwk..', '..kwkkkwwkkkwk..', '..kwwwwwwwwwwk..', '..kwwwwkkwwwwk..', '...kkkkkkkkkk...', '...kkkkkkkkkk...', '.kkkkwkkkkwkkkk.', 'kwwwwkwwwwkwwwwk', 'kwwwwwkwwkwwwwwk', 'kkkkkkkkkkkkkkkk'],
    ['................', '....kkkkkkkk....', '...kkkkkkkkkk...', '..kkkkkkkkkkkk..', '..kwkwkwkwkwkk..', '..kwwwwwwwwwwk..', '..kwkkkwwkkkwk..', '..kwkwkkkkwkwk..', '..kwkkkwwkkkwk..', '..kwwwwwwwwwwk..', '..kwkwwkkwwkwk..', '...kwkkkkkkwk...', '.kkkkwkkkkwkkkk.', 'kwwwwkwwwwkwwwwk', 'kwwwwwkwwkwwwwwk', 'kkkkkkkkkkkkkkkk']
  ];
  var INK_PAL = { k: INK, w: PAPER };
  var FIST = ['.kkkkkkkk.', 'kwkwkwkwwk', 'kwkwkwkwwk', 'kkkkkkkkwk', 'kwwwwwwwwk', 'kwwwwwwwwk', '.kwwwwwwk.', '..kkkkkk..'];

  function ditherArt(w, h, mode) {
    var rows = [];
    for (var y = 0; y < h; y++) {
      var s = '';
      for (var x = 0; x < w; x++) {
        var on = mode === 2 ? (x + y) % 2 === 0 : mode === 4 ? (x % 2 === 0 && y % 2 === 0) : (x % 4 === 0 && y % 2 === 0 && (x / 4 + y / 2) % 2 === 0);
        s += on ? 'k' : '.';
      }
      rows.push(s);
    }
    return rows;
  }
  var D50 = ditherArt(40, 40, 2), D25 = ditherArt(40, 40, 4), D12 = ditherArt(40, 40, 8);
  var POST_SHADOW = ditherArt(60, 50, 2), PLATE_D = ditherArt(138, 12, 4), LAMP_D = ditherArt(36, 10, 2);
  function dither(art, x, y, w, h) {
    for (var yy = y; yy < y + h; yy += 120) {
      for (var xx = x; xx < x + w; xx += 120) game.draw.sprite(art, INK_PAL, xx, yy, 3);
    }
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, over, won, endT, prevBest, sent, stroke;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    var c = col || INK;
    var back = c === INK ? PAPER : INK;
    game.draw.text(s, x + 3, y + 3, { size: sz, color: back, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: c, bold: true, align: align || 'center' });
  }
  function barStart(b) { return b * 4 * SPB; }

  function newRun(defs, demo) {
    var rounds = [], ev = [];
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var rd = { cb: 1 + i * 2, rb: 2 + i * 2, calls: d.t.slice(), n: d.t.length, plan: d.plan || null, count: 0, slots: [], done: false, failed: false, last: i === defs.length - 1, mA: 0, mS: 0, pA: 0, pS: 0 };
      rounds.push(rd);
      for (var a = 0; a < d.t.length; a++) ev.push({ t: barStart(rd.cb) + d.t[a] * SPB, kind: 'turn', r: i });
      for (var b = 0; b < d.s.length; b++) ev.push({ t: barStart(rd.cb) + d.s[b] * SPB, kind: 'slip', r: i });
    }
    ev.sort(function (p, q) { return p.t - q.t; });
    return {
      demo: demo, rounds: rounds, ev: ev, evI: 0, t: 0, lastK: -1, lastBar: 0, k: -1, beatF: 0, cueT: 0, cued: {}, belled: {},
      mTurnT: 0, mSlipT: 0, pTurnT: 0, pSlipT: 0, spin: 0, frz: 0, frzRd: null, frzText: 'MISS',
      clears: 0, perf: 0, good: 0, miss: 0, bonus: 0, combo: 0, score: 0, mile: false, mood: 0, moodT: 0,
      end: barStart(2 + defs.length * 2 - 1 + 1)
    };
  }

  function initGame() {
    var defs = [];
    for (var i = 0; i < NROUNDS; i++) {
      var pool = POOLS[i];
      defs.push(pool[Math.floor(game.random(0, pool.length)) % pool.length]);
    }
    run = newRun(defs, false);
    readyT = 0.8; halt = 0; over = false; won = false; endT = 0; sent = false; stroke = null;
    prevBest = game.best || 0;
  }

  function curRound(r) {
    var bar = Math.floor(r.t / (4 * SPB) + 1e-6);
    for (var i = 0; i < r.rounds.length; i++) if (bar === r.rounds[i].cb || bar === r.rounds[i].rb) return r.rounds[i];
    return null;
  }
  function isResp(r) { var rd = curRound(r); return !!rd && Math.floor(r.t / (4 * SPB) + 1e-6) === rd.rb; }

  // ── 拍クロック(1本) ──
  function playBar(r, bar) {
    var rd = null;
    for (var i = 0; i < r.rounds.length; i++) if (r.rounds[i].cb === bar || r.rounds[i].rb === bar) rd = r.rounds[i];
    if (!rd) return;
    if (bar === rd.rb) {
      var ph = RESP_PHRASES[(rd.rb / 2 - 1) % RESP_PHRASES.length];
      game.audio.melody(ph, { tempo: BPM, wave: 'triangle', volume: 0.06, bass: RESP_BASS, bassWave: 'square', bassVolume: 0.035 });
    } else {
      game.audio.melody(CALL_BASS, { tempo: BPM, wave: 'triangle', volume: 0.07 });
    }
  }
  function onBeat(r, k, loud) {
    var q = k % 4;
    r.k = k; r.beatF = 0.15;
    if (loud) {
      game.audio.tone(q === 0 ? 880 : 660, 0.02, { wave: 'square', volume: q === 0 ? 0.035 : 0.022 });
      if (k < 4) game.audio.tone(q === 3 ? 'E4' : 'A3', 0.09, { wave: 'triangle', volume: 0.08 });
    }
  }

  function stepRun(r, dt, loud) {
    r.t += dt;
    var t = r.t;
    var k = Math.floor(t / SPB);
    if (k > r.lastK) { r.lastK = k; onBeat(r, k, loud); }
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud) playBar(r, nb); }
    // 親方の締め / 滑り
    while (r.evI < r.ev.length && t >= r.ev[r.evI].t) {
      var e = r.ev[r.evI++];
      if (e.kind === 'turn') {
        r.rounds[e.r].mA += Math.PI / 2; r.mTurnT = 0.16; r.mood = 1; r.moodT = 0.18;
        if (loud) { game.audio.tone(1500, 0.05, { wave: 'square', volume: 0.1, slide: -700 }); game.audio.tone(220, 0.05, { wave: 'triangle', volume: 0.1 }); }
      } else {
        r.mSlipT = 0.22;
        if (loud) { game.audio.tone(110, 0.07, { wave: 'triangle', volume: 0.14 }); game.audio.tone(90, 0.05, { wave: 'sawtooth', volume: 0.04 }); }
      }
    }
    // 返しの番の予告: お手本の小節の4拍目から柄が脈打ち、裏で鈴
    for (var i = 0; i < r.rounds.length; i++) {
      var rd = r.rounds[i];
      var cs = barStart(rd.cb);
      if (!r.cued[i] && t >= cs + 3 * SPB) { r.cued[i] = true; r.cueT = SPB * 1.1; }
      if (!r.belled[i] && t >= cs + 3.5 * SPB) { r.belled[i] = true; if (loud) game.audio.tone('E6', 0.12, { wave: 'triangle', volume: 0.06 }); }
      if (!rd.done && t > barStart(rd.rb + 1) + GOODW) resolveRound(r, rd, loud);
    }
    if (r.frz > 0) {
      r.frz -= dt;
      if (r.frz <= 0 && !(r.frzRd && r.frzRd.fin)) game.feedback.bad(X_R, PY - 40, { text: r.frzText, volume: loud ? 0.4 : 0, shake: r.demo ? 4 : 10, flashColor: INK, color: INK });
    }
    for (var j = 0; j < r.rounds.length; j++) {
      var w = r.rounds[j];
      w.mS += (w.mA - w.mS) * Math.min(1, dt * 22);
      w.pS += (w.pA - w.pS) * Math.min(1, dt * 22);
    }
    if (r.mTurnT > 0 || r.pTurnT > 0) r.spin += dt * 20;
    if (r.beatF > 0) r.beatF -= dt;
    if (r.cueT > 0) r.cueT -= dt;
    if (r.mTurnT > 0) r.mTurnT -= dt;
    if (r.mSlipT > 0) r.mSlipT -= dt;
    if (r.pTurnT > 0) r.pTurnT -= dt;
    if (r.pSlipT > 0) r.pSlipT -= dt;
    if (r.moodT > 0) { r.moodT -= dt; if (r.moodT <= 0) r.mood = 0; }
  }

  function failRound(r, rd, text, loud) {
    rd.done = true; rd.failed = true;
    r.miss++; r.combo = 0;
    r.frz = 0.38; r.frzRd = rd; r.frzText = text;
    if (loud) game.audio.tone(150, 0.14, { wave: 'sawtooth', volume: 0.08, slide: -60 });
    if (!r.demo && r.miss >= LIVES) { rd.fin = true; halt = 0.5; }
  }

  function resolveRound(r, rd, loud) {
    if (rd.done) return;
    if (rd.count < rd.n) { failRound(r, rd, 'あと' + (rd.n - rd.count) + '回', loud); return; }
    rd.done = true;
    r.clears++; r.combo++;
    r.score += 200 + r.combo * 50;
    var same = rd.slots.length === rd.calls.length;
    for (var i = 0; i < rd.calls.length && same; i++) if (rd.slots.indexOf(rd.calls[i]) < 0) same = false;
    r.mood = 2; r.moodT = 0.7;
    game.feedback.good(X_R, PY - 60, { text: rd.n + ' / ' + rd.n, color: INK, size: 64, count: 16, volume: loud ? 0.35 : 0 });
    if (same) {
      r.bonus++; r.score += 150;
      game.fx.popup('BONUS', X_R, PY - 200, { color: INK, size: 56 });
    }
    if (!r.demo && r.clears === 2 && !r.mile) {
      r.mile = true;
      game.fx.popup('NICE!', W / 2, H * 0.36, { color: INK, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  // ひねり1回(入力とデモで共通)。戻り値 ok / miss / none
  function twist(r, loud) {
    if (r.frz > 0) return 'none';
    var t = r.t;
    for (var i = 0; i < r.rounds.length; i++) {
      var rd = r.rounds[i];
      var tRel = t - barStart(rd.rb);
      if (tRel < -GOODW || tRel > 3 * SPB + GOODW) continue;
      if (rd.done) return 'none';
      var k = Math.max(0, Math.min(3, Math.round(tRel / SPB)));
      var off = tRel - k * SPB;
      rd.pA += Math.PI / 2; r.pTurnT = 0.16;
      if (loud) game.audio.tone(1500, 0.05, { wave: 'square', volume: 0.11, slide: -700 });
      if (Math.abs(off) > GOODW || rd.slots.indexOf(k) >= 0) { failRound(r, rd, 'MISS', loud); return 'miss'; }
      rd.count++; rd.slots.push(k);
      if (rd.count > rd.n) { failRound(r, rd, 'MISS', loud); return 'miss'; }
      if (Math.abs(off) <= PERF) { r.perf++; r.score += 100; game.feedback.good(X_R + 150, PY + 40, { text: 'PERFECT', color: INK, size: 44, count: 8, volume: loud ? 0.2 : 0 }); }
      else { r.good++; r.score += 50; game.feedback.good(X_R + 150, PY + 40, { text: 'GOOD', color: INK, size: 40, count: 5, volume: loud ? 0.16 : 0 }); }
      return 'ok';
    }
    return 'none';
  }
  function slip(r, loud) {
    r.pSlipT = 0.2;
    if (loud) game.audio.tone(130, 0.05, { wave: 'triangle', volume: 0.08 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) run.score += (LIVES - run.miss) * 150;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(400, 1100), { color: INK, count: 18, speed: 380 });
  }
  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { legs: run.clears, total: NROUNDS, perfect: run.perf, good: run.good, miss: run.miss, bonus: run.bonus };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押してスッと払う = 1回ひねる ──
  game.onPress(function (x, y, id) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(300, 0.03, { wave: 'square', volume: 0.03 }); return; }
    stroke = { id: id, x0: x, y0: y, done: false };
    game.fx.burst(x, y, { color: INK, count: 3, speed: 60 });
  });
  game.onMove(function (x, y, id) {
    if (state !== S.PLAYING || !stroke || stroke.id !== id || stroke.done) return;
    var dx = x - stroke.x0, dy = y - stroke.y0;
    if (dx * dx + dy * dy >= TWIST * TWIST) {
      stroke.done = true;
      var res = twist(run, true);
      if (res === 'none') slip(run, true);
      game.fx.burst(x, y, { color: INK, count: res === 'ok' ? 8 : 3, speed: 160 });
    }
  });
  game.onRelease(function (x, y, id) {
    if (state !== S.PLAYING || !stroke || stroke.id !== id) return;
    var s = stroke;
    stroke = null;
    if (s.done || over || halt > 0) return;
    var dx = x - s.x0, dy = y - s.y0;
    if (dx * dx + dy * dy >= TWIST * TWIST) { if (twist(run, true) === 'none') slip(run, true); }
    else { slip(run, true); game.fx.burst(X_R, PY, { color: INK, count: 3, speed: 70 }); }
  });
  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 2回を拍に乗せて返す → 3回の脚で4回締めてMISS ──
  var demo = { t: 0, run: null, hx: PH_X, hy: PH_Y, press: false, done: {} };
  var DEMO_LEN = 5 * 4 * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt || !demo.run) { demo.run = newRun(DEMO_ROUNDS, true); demo.done = {}; }
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var tx = PH_X - 70, ty = PH_Y + 40, press = false;
    for (var i = 0; i < r.rounds.length; i++) {
      var rd = r.rounds[i];
      for (var j = 0; j < rd.plan.length; j++) {
        var tau = barStart(rd.rb) + rd.plan[j] * SPB;
        var key = i + ':' + j;
        if (r.t >= tau - 0.12 && r.t < tau + 0.1) {
          press = true;
          tx = PH_X - 70 + Math.min(1, (r.t - (tau - 0.12)) / 0.14) * 150;
          if (!demo.done[key] && r.t >= tau) { demo.done[key] = true; twist(r, audioOk); }
        }
      }
    }
    demo.press = press;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * (press ? 30 : 8));
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──
  function drawDriver(tipX, tipY, hx, hy, ex, ey, phase, wide) {
    var ang = Math.atan2(hy - tipY, hx - tipX);
    var sx = tipX + Math.cos(ang) * 30, sy = tipY + Math.sin(ang) * 30;
    game.draw.line(sx, sy, hx, hy, INK, 20);
    game.draw.line(sx, sy, hx, hy, PAPER, 8);
    game.draw.line(hx, hy, ex, ey, INK, wide + 12);
    game.draw.line(hx, hy, ex, ey, PAPER, wide);
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    for (var i = -1; i <= 1; i++) {
      var o = Math.sin(phase + i * 1.2) * wide * 0.42;
      game.draw.line(hx + nx * o, hy + ny * o, ex + nx * o, ey + ny * o, INK, 4);
    }
  }

  function drawScrew(x, y, a, big) {
    var r = 46 * (big || 1);
    game.draw.circle(x + 6, y + 6, r, INK, 0.25);
    game.draw.circle(x, y, r, INK);
    game.draw.circle(x, y, r - 7, PAPER);
    game.draw.circle(x + 10, y + 10, r - 20, PAPER2);
    var c = Math.cos(a) * (r - 10), s = Math.sin(a) * (r - 10);
    game.draw.line(x - c, y - s, x + c, y + s, INK, 13 * (big || 1));
  }

  function partOffset(r, rd) {
    var cs = barStart(rd.cb), re = barStart(rd.rb + 1);
    if (r.t < cs) return rd === r.rounds[0] ? 0 : Math.min(900, (cs - r.t) / 0.3 * 900);
    if (!rd.last && r.t > re - 0.3) return -Math.min(900, (r.t - (re - 0.3)) / 0.3 * 900);
    return 0;
  }

  function drawPart(r, rd, ox) {
    var cx = 540 + ox;
    // 影(左上の光 → 右下へディザ)
    game.draw.sprite(POST_SHADOW, INK_PAL, cx - 180 + 26, PY - 150 + 26, 6);
    // 脚の木口(年輪)
    game.draw.rect(cx - 186, PY - 156, 372, 312, INK);
    game.draw.rect(cx - 178, PY - 148, 356, 296, PAPER);
    for (var g = 4; g >= 1; g--) {
      game.draw.circle(cx + 10, PY + 6, g * 34, INK);
      game.draw.circle(cx + 10, PY + 6, g * 34 - 4, PAPER);
    }
    game.draw.line(cx - 170, PY - 120, cx - 60, PY - 140, INK, 2);
    game.draw.line(cx + 60, PY + 132, cx + 160, PY + 112, INK, 2);
    // 金具の帯
    game.draw.rect(cx - 216, PY - 56, 432, 112, INK);
    game.draw.rect(cx - 208, PY - 48, 416, 96, PAPER);
    game.draw.sprite(PLATE_D, INK_PAL, cx - 207, PY + 12, 3);
    game.draw.rect(cx - 208, PY - 48, 416, 8, PAPER);
    drawScrew(cx - 140, PY, rd.mS, 1);
    var big = r.frz > 0 && r.frzRd === rd ? 1.5 : 1;
    if (big > 1) {
      game.draw.circle(cx + 140, PY, 110, INK);
      game.draw.circle(cx + 140, PY, 96, PAPER);
    }
    drawScrew(cx + 140, PY, rd.pS, big);
    // 自分が締めた数(自分の分だけ点で残る)
    for (var c = 0; c < rd.count; c++) game.draw.circle(cx + 260 + (c % 2) * 30, PY - 40 + Math.floor(c / 2) * 30, 10, INK);
  }

  function drawChairIcon(r, tt) {
    var legs = r.clears;
    var flip = over && won;
    game.draw.rect(CHX - 110, CHY + 50, 220, 26, INK);
    game.draw.rect(CHX - 104, CHY + 56, 208, 14, PAPER);
    for (var i = 0; i < 4; i++) {
      var lx = CHX - 96 + i * 64;
      if (i < legs) {
        if (flip) game.draw.line(lx, CHY + 76, lx, CHY + 170, INK, 12);
        else game.draw.line(lx, CHY + 50, lx, CHY - 50, INK, 12);
      } else game.draw.circle(lx, CHY + 40, 6, INK, 0.5 + 0.3 * Math.sin(tt * 4 + i));
    }
    if (flip) { game.draw.line(CHX + 104, CHY + 50, CHX + 104, CHY - 90, INK, 12); game.draw.line(CHX + 30, CHY - 60, CHX + 104, CHY - 60, INK, 8); }
  }

  function drawScene(r, tt) {
    game.draw.gradient(0, H, [[0, PAPER], [1, PAPER2]]);
    // 壁: 網点の陰と、吊るした椅子の影絵
    dither(D12, 0, 240, W, 380);
    for (var c = 0; c < 3; c++) {
      var hx = 470 + c * 110, sw = Math.sin(tt * 0.8 + c) * 6;
      game.draw.line(hx, 240, hx + sw, 300, INK, 3);
      game.draw.rect(hx - 40 + sw, 300, 80, 12, INK);
      game.draw.line(hx - 34 + sw, 312, hx - 40 + sw, 380, INK, 6);
      game.draw.line(hx + 34 + sw, 312, hx + 40 + sw, 380, INK, 6);
      game.draw.line(hx - 34 + sw, 300, hx - 34 + sw, 250, INK, 4);
    }
    // 組立台(板目は細線、手前の縁は太線)
    game.draw.rect(0, H * 0.33, W, H, PAPER);
    game.draw.line(0, H * 0.33, W, H * 0.33, INK, 10);
    for (var p = 0; p < 8; p++) {
      var py = H * 0.36 + p * 130;
      game.draw.line(0, py, W, py + Math.sin(p * 1.7) * 10, INK, 2);
      game.draw.line(120 + p * 97 % 700, py + 40, 260 + p * 97 % 700, py + 46, INK, 1);
    }
    dither(D12, 0, H * 0.86, W, H * 0.15);
    // 親方
    var mf = r.mood;
    var bob = r.beatF > 0 && !isResp(r) ? -r.beatF * 30 : 0;
    game.draw.sprite(MASTER[mf], INK_PAL, MX, MY + bob, 12, { anchor: 'center' });
    drawChairIcon(r, tt);
    // 流れてくる脚(今の脚 + 前の脚が抜けていく)
    var sliding = true;
    for (var i = 0; i < r.rounds.length; i++) {
      var q = r.rounds[i];
      var o = partOffset(r, q);
      if (Math.abs(o) < 899) { drawPart(r, q, o); if (Math.abs(o) <= 5) sliding = false; }
    }
    var cr = curRound(r);
    var phase = cr ? cr.mS * 2 : 0, pphase = cr ? cr.pS * 2 : 0;
    // 親方のドライバー(滑ると浮いて跳ねる)
    var lift = sliding ? -60 : 0;
    var sl = r.mSlipT > 0 ? r.mSlipT / 0.22 : 0;
    var mtx = X_L + sl * 40, mty = PY + lift - sl * 50;
    game.draw.line(MX + 40, MY + 90, 330 + sl * 30, 700 + lift - sl * 40, INK, 54);
    game.draw.line(MX + 40, MY + 90, 330 + sl * 30, 700 + lift - sl * 40, PAPER, 36);
    drawDriver(mtx, mty, 352 + sl * 36, 820 + lift - sl * 46, 330 + sl * 30, 712 + lift - sl * 40, phase, 46);
    game.draw.sprite(FIST, INK_PAL, 326 + sl * 30, 700 + lift - sl * 40, 9, { anchor: 'center' });
    if (r.mTurnT > 0) {
      for (var a = 0; a < 3; a++) {
        var aa = -1.2 + a * 0.4 + (1 - r.mTurnT / 0.16) * 0.8;
        game.draw.line(X_L + Math.cos(aa) * 80, PY + Math.sin(aa) * 80, X_L + Math.cos(aa + 0.3) * 80, PY + Math.sin(aa + 0.3) * 80, INK, 8);
      }
    }
    if (sl > 0) {
      for (var z = 0; z < 4; z++) game.draw.line(X_L, PY, X_L + Math.cos(z * 1.6) * 70 * sl, PY + Math.sin(z * 1.6) * 70 * sl, INK, 3);
    }
    // 自分のドライバー(親指ゾーンから)
    var psl = r.pSlipT > 0 ? Math.sin(r.pSlipT * 60) * 10 : 0;
    var pl = sliding ? 50 : 0;
    game.draw.line(760, H + 20, PH_X + 10, PH_Y + 30 + pl, INK, 96);
    game.draw.line(760, H + 20, PH_X + 10, PH_Y + 30 + pl, PAPER, 72);
    game.draw.line(745, H + 20, PH_X + 4, PH_Y + 40 + pl, INK, 3);
    drawDriver(X_R + psl, PY + pl, 700 + psl, 1300 + pl, PH_X + psl, PH_Y - 10 + pl, pphase, 60);
    game.draw.sprite(FIST, INK_PAL, PH_X + psl, PH_Y + 10 + pl, 13, { anchor: 'center' });
    if (r.pTurnT > 0) {
      for (var b = 0; b < 3; b++) {
        var bb = 0.4 + b * 0.5 + (1 - r.pTurnT / 0.16) * 0.8;
        game.draw.line(X_R + Math.cos(bb) * 84, PY + Math.sin(bb) * 84, X_R + Math.cos(bb + 0.35) * 84, PY + Math.sin(bb + 0.35) * 84, INK, 10);
      }
    }
    // 返しの番: 柄のまわりが拍ごとに脈打つ(予告は1拍前から)
    var resp = isResp(r);
    if ((resp && r.beatF > 0) || (r.cueT > 0 && Math.floor(tt * 12) % 2 === 0)) {
      var rr = 120 + (resp ? (0.15 - r.beatF) * 300 : 0);
      game.draw.circle(PH_X, PH_Y, rr, INK, 0.18);
      game.draw.circle(PH_X, PH_Y, rr - 12, PAPER, 0.18);
    }
  }

  function drawStroke() {
    if (!stroke || !game.input.pressing) return;
    var x = game.input.x, y = game.input.y;
    game.draw.line(stroke.x0, stroke.y0, x, y, INK, stroke.done ? 20 : 10);
    game.draw.circle(stroke.x0, stroke.y0, 12, INK);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.115, PAPER);
    game.draw.line(0, H * 0.115, W, H * 0.115, INK, 8);
    txt(String(r.score), 40, 64, 52, INK, 'left');
    txt(r.clears + ' / ' + r.rounds.length, W / 2, 64, 44, INK);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 72, alive = i < LIVES - r.miss;
      game.draw.circle(lx, 64, 24, INK);
      game.draw.circle(lx, 64, 18, alive ? PAPER : INK);
      game.draw.line(lx - 14, 64, lx + 14, 64, alive ? INK : PAPER, 6);
    }
    var resp = isResp(r);
    var bk = r.k >= 0 ? r.k % 4 : -1;
    for (var b = 0; b < 4; b++) {
      var x = W * 0.29 + b * W * 0.14, y = 168;
      game.draw.rect(x - 42, y - 16, 84, 32, INK);
      var on = b === bk && r.beatF > 0;
      if (resp) game.draw.rect(x - 36, y - 10, 72, 20, on ? INK : PAPER);
      else {
        game.draw.rect(x - 36, y - 10, 72, 20, PAPER);
        if (on) game.draw.sprite(LAMP_D, INK_PAL, x - 36, y - 10, 2);
      }
    }
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 112, INK);
      return;
    }
    game.draw.rect(80, H * 0.2, W - 160, H * 0.37, INK);
    game.draw.rect(92, H * 0.2 + 12, W - 184, H * 0.37 - 24, PAPER);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, INK);
    txt(run.clears + ' / ' + NROUNDS, W / 2, H * 0.32, 64, INK);
    txt('SCORE ' + run.score, W / 2, H * 0.375, 52, INK);
    txt('PERFECT ' + run.perf + '  GOOD ' + run.good, W / 2, H * 0.42, 38, INK);
    txt('BONUS ' + run.bonus, W / 2, H * 0.46, 38, INK);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.505, 56, INK);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.505, 44, INK);
    if (!won) txt('あと' + (NROUNDS - run.clears) + '本!', W / 2, H * 0.545, 46, INK);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, INK);
  }

  game.onUpdate(function (dt) {
    if (dt > 0.1) dt = 0.1;
    var tt = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.run, tt);
      game.draw.rect(0, 0, W, H * 0.115, PAPER);
      game.draw.line(0, H * 0.115, W, H * 0.115, INK, 8);
      txt(GAME_TITLE, W / 2, 84, 92, INK);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 172, 40, INK);
      if (demo.press) game.draw.line(PH_X - 70, demo.hy, demo.hx, demo.hy, INK, 14);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 16 });
      if (Math.floor(tt * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, INK);
      else txt('TAP TO START', W / 2, H * 0.965, 44, INK);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(X_R, PY - 40, { text: run.frzText, flashColor: INK, color: INK });
          run.frz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        var last = run.rounds[run.rounds.length - 1];
        if ((last.done && run.frz <= 0) || run.t > TIME_LIMIT + 0.6) finish(run.miss < LIVES);
      }
    }

    drawScene(run, tt);
    drawStroke();
    drawHud(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, INK);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
