// K-DS-0010v3-ice-shelf-penguin-cue.js
// 氷棚の一番乗り — 群れが拍ごとに鳴き交わす中、見張り役の合図が拍の前に食い込んで鳴った瞬間に、群れの誰より早く海へ飛び込む
// 操作: 画面のどこでも押すと自分のペンギン(白い印の上)が海へ飛び込む。見張り役(橙のくちばし)は1拍前に胸をふくらませ、裏拍(次の強拍を食う位置)で合図を鳴く。その瞬間に押す(合図からのずれでPERFECT/GOOD)。後ろの仲間が表拍で同じような声を出しても動かない。合図の前・後ろの仲間の声・何もない時に押す(フライング)、群れの一番速い仲間より遅いはMISS
// 終わり: 7小節(約14.5秒)・合図6回を通してMISS 2回以内ならCLEAR(一番乗りの点+反応の速さ+残り命)。MISS 3回でGAME OVER
// @mechanic: reaction_duel
// @theme: ice_shelf_penguin_first_dive
// 世界観: 南極の氷棚の縁に並ぶペンギンの群れ。仲間が拍を刻むように鳴き交わす中、見張り役の食い込む合図の声だけを聞き分けて、群れの一羽が真っ先に海へ飛び込む
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・一番乗りの回数・最速の反応秒・PERFECT/GOOD/MISS数
// スタイル: NEO-RETRO

(function(game) {
  var STYLE = { bg: ['#10142c', '#1e2c5c'], main: ['#a9d8ea', '#eef6ff', '#5a74a8'], accent: ['#ff7b2e', '#264a8c'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた6色だけで完結。12px前後の大きなドット。差し色は橙1色(見張り役と本物の合図だけに使う)
  var C = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], ice: STYLE.main[0], snow: STYLE.main[1], mid: STYLE.main[2],
    hot: STYLE.accent[0], sea: STYLE.accent[1]
  };

  var GAME_TITLE = 'FIRST DIVE';
  var BPM = 116;
  var SPB = 60 / BPM;
  var LEAD = 0.06;
  var PERFECT_W = 0.1;        // 合図からこの秒数以内(0.06秒の食い気味まで許す)
  var EARLY_W = 0.06;
  var MISS_MAX = 3;
  var TOTAL_BEATS = 28;       // 7小節
  var TIME_LIMIT = 14.5;
  var RETURN_B = 1.5;         // 合図から1.5拍で群れが氷に戻る
  // 本物の合図は裏拍(x.5)で次の拍を食う。偽の声は表拍
  var EVENTS = [
    { b: 7.5, k: 'S', best: 0.46 }, { b: 10, k: 'D', who: 0 }, { b: 11.5, k: 'S', best: 0.42 },
    { b: 13.5, k: 'S', best: 0.4 }, { b: 16, k: 'D', who: 2 }, { b: 18, k: 'D', who: 1 },
    { b: 19.5, k: 'S', best: 0.37 }, { b: 21, k: 'D', who: 0 }, { b: 23.5, k: 'S', best: 0.34 },
    { b: 25.5, k: 'S', best: 0.32 }
  ];
  var DEMO_EVENTS = [{ b: 3.5, k: 'S', best: 0.45 }, { b: 6, k: 'D', who: 1 }, { b: 9.5, k: 'S', best: 0.42 }];
  var DEMO_BEATS = 12;
  var N_SIG = 6;
  var RIVALS = [0, 1, 3, 4], SPREAD = [0, 0.05, 0.09, 0.14];

  var ICE_Y = Math.round(H * 0.47), SEA_Y = Math.round(H * 0.58), PAD_Y = Math.round(H * 0.77);
  var FRONT_X = [150, 300, 460, 620, 770], ME = 2;
  var BACK_X = [230, 540, 700], BACK_Y = ICE_Y - 120;
  var LEAD_X = 940, LEAD_Y = ICE_Y - 48;
  var SLOT_Y = 268;

  // 伴奏(オリジナル): 旋律もベースも裏拍から次の拍へ食い込む
  var BARS_MEL = [
    [['C5', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 1], ['E5', 0.5], ['R', 0.5], ['A5', 0.5]],
    [['R', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 0.5]],
    [['E5', 0.5], ['G5', 0.5], ['R', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['G5', 0.5]],
    [['R', 0.5], ['C6', 1], ['A5', 0.5], ['G5', 1], ['R', 0.5], ['E5', 0.5]]
  ];
  var BARS_BASS = [
    [['C3', 1.5], ['C3', 1], ['G2', 1.5]], [['A2', 1.5], ['A2', 1], ['E2', 1.5]],
    [['F2', 1.5], ['F2', 1], ['C3', 1.5]], [['G2', 1.5], ['G2', 1], ['D3', 1.5]]
  ];

  // ---- スプライト(k=黒 w=白 b=くちばし・足 e=目) ----
  var P_STAND = ['...kk...', '..kkkk..', '.kekkek.', '.kkbbkk.', 'kkwwwwkk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', '.wwwwww.', '..b..b..'];
  var P_STEP = ['...kk...', '..kkkk..', '.kekkek.', '.kkbbkk.', 'kkwwwwkk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', '.wwwwww.', '.b....b.'];
  var P_INHALE = ['...kk...', '..kkkk..', '.kkkkkk.', '.kkbbkk.', 'kkwwwwkk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', '.wwwwww.', '..b..b..'];
  var P_CALL = ['...kk.b.', '..kkkkb.', '.kekkk..', '.kkkkbb.', 'kkwwwwkk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', '.wwwwww.', '..b..b..'];
  var P_OOPS = ['k..kk..k', '.kkkkkk.', '.kwkkwk.', '.kkbbkk.', '.kwwwwk.', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', '.wwwwww.', '.b....b.'];
  var MARK = ['w.....w', '.w...w.', '..w.w..', '...w...'];
  function pal(bill, flash) {
    if (flash) return { k: C.snow, w: C.snow, b: C.snow, e: C.snow };
    return { k: C.night, w: C.snow, b: bill, e: C.snow };
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, evs, endBeats, running, songT, beatN, barN, schedBar, readyT, hitStop, flashT, flashX, flashY;
  var pens, leadAnim, backAnim, marks, score, perfects, goods, misses, firsts, fastest, over, won, outroT, prevBest, milestone, beatPulse, ripples;

  function mkPen(x) { return { x: x, mode: 'stand', t: 0, back: 0 }; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = demoMode ? DEMO_EVENTS : EVENTS;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    evs = [];
    for (var i = 0; i < src.length; i++) {
      var e = src[i];
      // 仲間4羽の反応秒: 一番速い1羽がちょうど best。誰が速いかは回ごとに入れ替わる
      var rv = [99, 99, 99, 99, 99];
      for (var j = 0; j < RIVALS.length; j++) rv[RIVALS[(j + i) % RIVALS.length]] = (e.best || 0.5) + SPREAD[j];
      evs.push({ t: e.b * SPB, b: e.b, k: e.k, who: e.who || 0, best: e.best || 0, rv: rv, puffed: false, called: false, res: '', back: false });
    }
    running = false; songT = 0; beatN = 0; barN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashX = 0; flashY = 0; beatPulse = 0;
    pens = [];
    for (var j = 0; j < FRONT_X.length; j++) pens.push(mkPen(FRONT_X[j]));
    leadAnim = { mode: 'stand', t: 0 };
    backAnim = [{ mode: 'stand', t: 0 }, { mode: 'stand', t: 0 }, { mode: 'stand', t: 0 }];
    marks = []; ripples = [];
    score = 0; perfects = 0; goods = 0; misses = 0; firsts = 0; fastest = 9;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; onBeat(0); }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }

  function playBar(n) {
    if (demoMode) return;
    var k = n % 4;
    game.audio.melody(BARS_MEL[k], { tempo: BPM, wave: 'square', volume: 0.04, bass: BARS_BASS[k], bassWave: 'triangle', bassVolume: 0.08 });
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    beatPulse = 1;
    if (b % 4 === 0) { barN = b / 4; marks = []; }
    // 群れの鳴き交わし(表拍)
    sfxTone(b % 4 === 0 ? 523 : 440, 0.06, { wave: 'square', volume: b % 4 === 0 ? 0.05 : 0.03, slide: -120 });
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar * 4 < endBeats && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
    for (var i = 0; i < evs.length; i++) stepEvent(evs[i]);
    if (songT >= endBeats * SPB) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(misses < MISS_MAX);
  }

  function stepEvent(e) {
    // 予告: 鳴く1拍前(約0.52秒)に胸をふくらませる
    if (!e.puffed && songT >= e.t - SPB) {
      e.puffed = true;
      if (e.k === 'S') leadAnim = { mode: 'inhale', t: 0 }; else backAnim[e.who] = { mode: 'inhale', t: 0 };
      sfxTone(180, 0.18, { wave: 'sine', volume: 0.04, slide: 90 });
    }
    if (!e.called && songT >= e.t) {
      e.called = true;
      var slot = Math.round((e.b - barN * 4) * 2);
      marks.push({ slot: slot, real: e.k === 'S' });
      if (e.k === 'S') {
        leadAnim = { mode: 'call', t: 0 };
        sfxTone(988, 0.13, { wave: 'square', volume: 0.12, slide: -300 });
        sfxTone(1480, 0.07, { wave: 'square', volume: 0.05 });
      } else {
        backAnim[e.who] = { mode: 'call', t: 0 };
        sfxTone(880, 0.13, { wave: 'square', volume: 0.1, slide: -280 });
      }
    }
    if (e.k !== 'S' || !e.called) return;
    // 仲間はそれぞれの反応時間で飛び込む
    for (var k = 0; k < pens.length; k++) {
      if (k === ME) continue;
      var p = pens[k];
      if (p.mode === 'stand' && !e.back && songT >= e.t + e.rv[k]) { p.mode = 'dive'; p.t = 0; }
    }
    if (!e.res && songT >= e.t + e.best) { e.res = 'beaten'; missAt('beaten'); }
    if (!e.back && songT >= e.t + RETURN_B * SPB) {
      e.back = true;
      for (var j = 0; j < pens.length; j++) if (pens[j].mode === 'dive' || pens[j].mode === 'swim') { pens[j].mode = 'back'; pens[j].t = 0; }
    }
  }

  function good(x, y, text, col, sz) {
    if (demoMode) { game.fx.popup(text, x, y, { color: col, size: sz }); game.fx.burst(x, y, { color: col, count: 8, speed: 260 }); return; }
    game.feedback.good(x, y, { text: text, color: col, size: sz, count: 12, volume: 0.3 });
  }

  function missAt(why) {
    misses++;
    var me = pens[ME];
    if (why === 'beaten' && me.mode === 'stand') { me.mode = 'oops'; me.t = 0; }
    hitStop = 0.42; flashT = 0.42; flashX = me.x; flashY = ICE_Y - 70;
    if (demoMode) { game.fx.popup('MISS', me.x, ICE_Y - 260, { color: C.ice, size: 56 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(me.x, ICE_Y - 260, { text: 'MISS', shake: 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function activeSignal() {
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.k === 'S' && !e.res && songT >= e.t - EARLY_W && songT <= e.t + e.best) return e;
    }
    return null;
  }

  function diveAction() {
    var me = pens[ME];
    if (!running || hitStop > 0 || me.mode !== 'stand') return 'none';
    var e = activeSignal();
    me.mode = 'dive'; me.t = 0;
    if (!e) {
      // フライング(偽の声・何もない時・合図の前): ひとりで落ちて、すぐ氷に戻る
      me.back = 1.1;
      missAt('false');
      return 'miss';
    }
    var rt = songT - e.t;
    e.res = 'win';
    firsts++;
    if (rt < fastest) fastest = Math.max(0, rt);
    if (rt <= PERFECT_W) { perfects++; score += 200; good(me.x, ICE_Y - 250, 'PERFECT', C.hot, 56); }
    else { goods++; score += 100; good(me.x, ICE_Y - 250, 'GOOD', C.ice, 48); }
    score += Math.max(0, Math.round((e.best - Math.max(0, rt)) * 300));
    if (!demoMode && firsts === 3 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(firsts + ' / ' + N_SIG, W / 2, H * 0.36, { color: C.hot, size: 80 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    if (ok) {
      score += (MISS_MAX - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 900), game.random(900, 1300), { color: i % 2 ? C.hot : C.snow, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- ペンギンの動き ----
  function tickPen(p, dt) {
    p.t += dt;
    if (p.mode === 'dive' && p.t >= 0.3) {
      p.mode = 'swim'; p.t = 0;
      ripples.push({ x: p.x, t: 0 });
      game.fx.burst(p.x, SEA_Y + 30, { color: C.snow, count: 8, speed: 240 });
      sfxTone(200, 0.16, { wave: 'sawtooth', volume: 0.03, slide: -120 });
    }
    if (p.mode === 'swim' && p.back > 0 && p.t >= p.back) { p.mode = 'back'; p.t = 0; p.back = 0; }
    if (p.mode === 'back' && p.t >= 0.28) { p.mode = 'stand'; p.t = 0; }
    if (p.mode === 'oops' && p.t >= 0.6) { p.mode = 'stand'; p.t = 0; }
  }
  function tickAll(dt) {
    for (var i = 0; i < pens.length; i++) tickPen(pens[i], dt);
    leadAnim.t += dt; if (leadAnim.mode === 'call' && leadAnim.t > 0.35) leadAnim = { mode: 'stand', t: 0 };
    for (var j = 0; j < 3; j++) { backAnim[j].t += dt; if (backAnim[j].mode === 'call' && backAnim[j].t > 0.35) backAnim[j] = { mode: 'stand', t: 0 }; }
    for (var r = ripples.length - 1; r >= 0; r--) { ripples[r].t += dt; if (ripples[r].t > 0.9) ripples.splice(r, 1); }
  }
  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    tickAll(dt);
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var res = diveAction();
    if (res === 'ok') game.audio.play('se_jump', 0.4);
    else if (res === 'none') game.audio.tone(240, 0.04, { wave: 'square', volume: 0.03 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.night, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function snap(v) { return Math.round(v / 12) * 12; }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.4, C.dusk], [0.6, C.dusk], [1, C.night]]);
    // 星とオーロラ(大きいドット)
    for (var i = 0; i < 22; i++) {
      var sx = (i * 197) % W, sy = 250 + (i * 83) % 330;
      if ((i + Math.floor(t * 2)) % 7 !== 0) game.draw.rect(snap(sx), snap(sy), 12, 12, C.snow, 0.7);
    }
    for (var a = 0; a < 18; a++) {
      var ax = a * 60, ay = 420 + Math.sin(a * 0.6 + t * 0.8) * 50;
      game.draw.rect(ax, snap(ay), 60, 24, C.mid, 0.55);
      game.draw.rect(ax, snap(ay) + 24, 60, 12, C.ice, 0.25);
    }
    // 遠くの氷山
    game.draw.rect(60, ICE_Y - 260, 180, 120, C.mid);
    game.draw.rect(96, ICE_Y - 300, 96, 48, C.mid);
    game.draw.rect(780, ICE_Y - 230, 240, 96, C.mid);
    // 氷棚の上面(奥行き)と前面
    game.draw.rect(0, ICE_Y - 150, W, 150, C.ice);
    for (var g = 0; g < 9; g++) game.draw.rect(g * 120 + (g % 2) * 36, ICE_Y - 120 + (g % 3) * 36, 48, 12, C.snow);
    game.draw.rect(0, ICE_Y, W, SEA_Y - ICE_Y, C.mid);
    for (var c = 0; c < 10; c++) game.draw.rect(c * 108 + 24, ICE_Y + 24 + (c % 2) * 60, 12, 84, C.ice, 0.6);
    game.draw.rect(0, ICE_Y, W, 12, C.snow);
    // 見張り役の雪の台
    game.draw.rect(LEAD_X - 84, LEAD_Y, 168, 48, C.snow);
    // 海
    game.draw.rect(0, SEA_Y, W, PAD_Y - SEA_Y, C.sea);
    for (var w = 0; w < 14; w++) {
      var wx = snap((w * 151 + t * 36) % (W + 100) - 50), wy = SEA_Y + 48 + (w % 4) * 72;
      game.draw.rect(wx, wy, 36, 12, C.mid);
    }
    for (var r = 0; r < ripples.length; r++) {
      var rp = ripples[r], rw = snap(48 + rp.t * 200);
      game.draw.rect(rp.x - rw / 2, SEA_Y + 24, rw, 12, C.snow, 1 - rp.t);
    }
  }

  function penArt(mode, step) {
    if (mode === 'inhale') return P_INHALE;
    if (mode === 'call') return P_CALL;
    if (mode === 'oops') return P_OOPS;
    return step ? P_STEP : P_STAND;
  }

  function drawPens() {
    var step = Math.floor(songT / SPB) % 2 === 1;
    // 後ろの列(偽の声の主)
    for (var b = 0; b < BACK_X.length; b++) {
      var ba = backAnim[b];
      game.draw.sprite(penArt(ba.mode, step), pal(C.ice, false), BACK_X[b], BACK_Y - 40, 9, { anchor: 'center' });
      if (ba.mode === 'call') for (var q = 1; q <= 2; q++) game.draw.rect(BACK_X[b] + 30 + q * 20, BACK_Y - 84 - q * 6, 12, 12 + q * 12, C.snow);
    }
    // 見張り役
    var la = leadAnim, lpx = la.mode === 'inhale' ? 15 : 13;
    game.draw.sprite(penArt(la.mode, false), pal(C.hot, false), LEAD_X, LEAD_Y - 66 - (la.mode === 'inhale' ? 6 : 0), lpx, { anchor: 'center' });
    if (la.mode === 'inhale') {
      var pr = (game.time.elapsed * 8) % 1;
      game.draw.rect(LEAD_X - 96 - pr * 24, LEAD_Y - 168 - pr * 24, 192 + pr * 48, 12, C.hot, 0.8 - pr * 0.6);
    }
    if (la.mode === 'call') {
      for (var c = 1; c <= 3; c++) {
        game.draw.rect(LEAD_X - 40 - c * 36, LEAD_Y - 170 - c * 12, 12, 24 + c * 24, C.hot);
        game.draw.rect(LEAD_X + 52 + c * 36, LEAD_Y - 170 - c * 12, 12, 24 + c * 24, C.hot);
      }
    }
    // 前の列(自分は真ん中)
    for (var i = 0; i < pens.length; i++) {
      var p = pens[i], isMe = i === ME;
      var flash = isMe && flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
      var px = flash ? 15 : 12;
      if (p.mode === 'dive') {
        var u = Math.min(1, p.t / 0.3);
        game.draw.sprite(P_STAND, pal(isMe ? C.snow : C.ice, flash), p.x + u * 20, ICE_Y - 60 + u * (SEA_Y - ICE_Y + 80), px, { anchor: 'center', flipY: true });
      } else if (p.mode === 'swim') {
        game.draw.rect(p.x - 24, SEA_Y + 60 + Math.sin(game.time.elapsed * 5 + i) * 6, 48, 24, C.night);
        game.draw.rect(p.x - 12, SEA_Y + 60 + Math.sin(game.time.elapsed * 5 + i) * 6, 12, 12, C.snow);
      } else if (p.mode === 'back') {
        var v = Math.min(1, p.t / 0.28);
        game.draw.sprite(P_STAND, pal(isMe ? C.snow : C.ice, false), p.x, SEA_Y + 40 - v * (SEA_Y + 40 - (ICE_Y - 60)) - Math.sin(Math.PI * v) * 60, px, { anchor: 'center' });
      } else {
        var bob = p.mode === 'stand' ? -beatPulse * 8 : 0;
        var wob = p.mode === 'oops' ? Math.sin(game.time.elapsed * 30) * 8 : 0;
        game.draw.sprite(penArt(p.mode, step), pal(isMe ? C.snow : C.ice, flash), p.x + wob, ICE_Y - 60 + bob, px, { anchor: 'center' });
      }
      if (isMe && (p.mode === 'stand' || p.mode === 'oops')) game.draw.sprite(MARK, { w: C.snow }, p.x, ICE_Y - 186 + Math.sin(game.time.elapsed * 4) * 6, 13, { anchor: 'center' });
    }
    if (flashT > 0) game.draw.rect(flashX - 90, flashY - 90, 180, 180, C.snow, 0.5 * flashT / 0.42);
  }

  // 1小節の8分の枠: 大きい四角=表拍 / 小さい四角=裏拍。鳴いた位置に印が残る
  function drawSlots() {
    var cur = Math.floor(songT / (SPB / 2)) % 8;
    for (var k = 0; k < 8; k++) {
      var cx = 140 + k * 114, on = k % 2 === 0, s = on ? 76 : 44;
      var lit = running && k === cur;
      game.draw.rect(cx - s / 2, SLOT_Y - s / 2, s, s, lit ? C.snow : C.mid);
      if (!lit) game.draw.rect(cx - s / 2 + 8, SLOT_Y - s / 2 + 8, s - 16, s - 16, C.night);
    }
    for (var m = 0; m < marks.length; m++) {
      var mk = marks[m];
      if (mk.slot < 0 || mk.slot > 7) continue;
      var mx = 140 + mk.slot * 114;
      game.draw.rect(mx - 18, SLOT_Y + 52, 36, 36, mk.real ? C.hot : C.ice);
    }
  }

  function drawPad() {
    var me = pens[ME];
    var down = state === S.ATTRACT ? demo.press : (game.input.pressing && state === S.PLAYING);
    game.draw.rect(0, PAD_Y, W, H - PAD_Y, C.night);
    var y = PAD_Y + 60 + (down ? 12 : 0);
    game.draw.rect(120, y, W - 240, 260, down ? C.snow : C.ice);
    game.draw.rect(132, y + 12, W - 264, 236, down ? C.ice : C.mid);
    // 下向きの矢印(ドット)
    var ax = W / 2;
    game.draw.rect(ax - 24, y + 50, 48, 96, me.mode === 'stand' ? C.snow : C.night);
    for (var k = 0; k < 4; k++) game.draw.rect(ax - 96 + k * 24, y + 146 + k * 24, 192 - k * 48, 24, me.mode === 'stand' ? C.snow : C.night);
  }

  function drawScene() {
    drawWorld();
    drawPens();
    drawSlots();
    drawPad();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 220, C.night);
    label('SCORE ' + score, 60, 96, 54, C.snow, 'left');
    label('BEST ' + prevBest, 60, 168, 32, C.ice, 'left');
    label(firsts + ' / ' + N_SIG, W - 60, 96, 56, C.hot, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 250 + i * 72, 150, 36, 36, i < misses ? C.hot : C.mid);
    var progress = Math.min(1, songT / (endBeats * SPB));
    game.draw.rect(0, 208, W, 12, C.mid);
    game.draw.rect(0, 208, snap(W * progress), 12, C.snow);
  }

  // ---- ATTRACT: 実ロジックで 合図に一番乗り(PERFECT) / 後ろの偽の声で飛んでMISS / 2回目の合図でGOOD ----
  var demo = { t: 0, press: false, pt: 0 };
  var DEMO_LEN = DEMO_BEATS * SPB + 0.6;
  var DEMO_DELAY = [0.05, 0.12, 0.2];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = false; demo.pt = 0; }
    if (demo.pt > 0) { demo.pt -= dt; if (demo.pt <= 0) demo.press = false; }
    if (running && hitStop <= 0) {
      var nt = songT + dt;
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i];
        if (!e.demoDone && nt >= e.t + DEMO_DELAY[i]) {
          e.demoDone = true;
          diveAction(); demo.press = true; demo.pt = 0.2;
        }
      }
    }
    tickWorld(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, PAD_Y + 190, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 220, C.night);
      label(GAME_TITLE, W / 2, 112, 86 + Math.sin(t * 3) * 3, C.snow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.hot);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, PAD_Y + 20, 50, C.hot);
      else label('TAP TO START', W / 2, PAD_Y + 20, 46, C.snow);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(72, H * 0.25, W - 144, H * 0.35, C.night, 0.92);
      game.draw.rect(72, H * 0.25, W - 144, 12, C.hot);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.snow : C.hot);
      label('SCORE ' + score, W / 2, H * 0.37, 58, C.snow);
      label(firsts + ' / ' + N_SIG, W / 2, H * 0.415, 48, C.hot);
      label(fastest < 9 ? fastest.toFixed(2) + '秒' : '-', W / 2, H * 0.455, 40, C.ice);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.495, 34, C.ice);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 50, C.hot);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, C.ice);
      if (!won) label('あと' + Math.max(1, 4 - firsts) + '回!', W / 2, H * 0.22, 56, C.hot);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.585, 36, C.snow);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt; else tickAll(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, firsts: firsts, fastest: fastest < 9 ? +fastest.toFixed(2) : null, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 110, C.snow);
    if (over && won) label('FINISH', W / 2, H * 0.34, 100, C.hot);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
