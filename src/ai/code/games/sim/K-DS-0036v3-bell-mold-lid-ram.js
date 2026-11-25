// K-DS-0036v3-bell-mold-lid-ram.js
// 鐘型の蓋固め — 1小節ごとに速まる拍の頭から槌を短く連打して鋳型の蓋の砂を外の輪から順に打ち固め、槌が上がる間は手を止める
// 操作: 画面のどこでも押すと槌を打つ(押した瞬間で判定)。拍の頭の一打はずれでPERFECT/GOOD(固め+2/+1)、続く連打は1打+1(1拍に2打まで)。拍の後半は槌が持ち上がって次の場所へ回る「上げ」(下の物差しの赤い区間)で、ここで打つとMISS(固め−2)。輪ごとに固めの目盛りが旗(9)に届けば締まる。職人は1小節で輪を一周し、小節が変わるたびに速さが上がる(0.65秒前に炉が燃え上がり笛が鳴り、次の速さの数字が出て予告)。目盛りが足りないまま小節が終わる時は0.65秒前に目盛りが赤く点滅する
// 終わり: 前奏2拍+5小節(92→106→120→134→148BPM・約11.6秒)。5つの輪を回り切って緩みが1輪以内ならCLEAR(判定点+連打+締まった輪のボーナス)。緩んだ輪が2つでGAME OVER
// @mechanic: mash
// @theme: bell_foundry_mold_lid_ram
// 世界観: 鐘を鋳る鋳物工場の鋳込み場で、職人が丸い鋳型の蓋の周りを一周ずつ歩きながら、拍の頭ごとに槌を連打して外の輪から中心へ砂を打ち固め、親方の吹く炉の笛に合わせて手を速めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・締めた輪の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: HYPERCASUAL 3D
var STYLE = { bg: ['#fff7ec', '#ffe2c6'], main: ['#ff7a3d', '#3d5afe', '#2b2b3a'], accent: ['#21c87a', '#ff4f6d'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊、真下に柔らかい半透明の影。見た目どおりの当たり
  var CREAM = STYLE.bg[0], PEACH = STYLE.bg[1];
  var ORANGE = STYLE.main[0], BLUE = STYLE.main[1], INK = STYLE.main[2];
  var GREEN = STYLE.accent[0], PINK = STYLE.accent[1];
  var SAND = '#f3d6a4', GRAIN = '#d8ad72', FIRM = '#a8643a', RIM = '#5b6472', SKIN = '#ffd3b0', GOLD = '#ffc531', CORAL = '#ffb3a8', MINT = '#a8ecc9';

  var GAME_TITLE = 'MOLD RAM';
  var STAGES = [92, 106, 120, 134, 148];
  var LEAD = 2;                       // 前奏の拍(鐘が速さを刻む)
  var TIME_LIMIT = 11.6;              // 前奏2拍 + 5小節
  var READY_T = 0.8;
  var PERFECT_W = 0.05;
  var RAM_END = 0.56;                 // 拍のここから先は槌が上がる
  var RAM_CAP = 2;                    // 1拍あたりの連打の上限
  var TARGET = 9, GAUGE_MAX = 16;
  var LIVES = 2;

  var LID_X = 540, LID_Y = 850, R0 = 310, RW = 56, WALK_R = 370;
  var GAUGE_Y = Math.round(H * 0.68), RULER_Y = Math.round(H * 0.73);
  var BTN_X = W / 2, BTN_Y = Math.round(H * 0.865), BTN_R = 150;
  var SEG = 225, RULER_X = 90;

  // 伴奏(オリジナル)。拍ごとの断片を拍クロックから、その時の速さで鳴らす
  var MEL = [
    [['D5', 0.5], ['F#5', 0.5]], [['A5', 0.5], ['F#5', 0.5]], [['G5', 0.5], ['E5', 0.5]], [['C#5', 0.5], ['A4', 0.5]],
    [['D5', 0.5], ['A4', 0.5]], [['B4', 0.5], ['D5', 0.5]], [['E5', 0.5], ['G5', 0.5]], [['F#5', 0.5], ['E5', 0.5]]
  ];
  var BASS = ['D3', 'D3', 'G2', 'A2', 'B2', 'G2', 'A2', 'A2'];

  // ---- スプライト(顔と小物) ----
  var FACE = {
    norm: ['.k...k.', '.k...k.', '.......', '..kkk..', '.......'],
    push: ['kk...kk', '.......', '..kkk..', '..k.k..', '..kkk..'],
    joy: ['.k...k.', 'k.k.k.k', '.......', '.k...k.', '..kkk..'],
    oops: ['k.k.k.k', '.k...k.', 'k.k.k.k', '.......', '..kkk..']
  };
  var PAL_FACE = { k: INK };
  var BELL = ['...o...', '..ooo..', '.ooooo.', '.ooooo.', '.ooooo.', 'ooooooo', '...o...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var stages, nStages, bp, readyT, lastBeat, headChk, inspectIdx;
  var comp, headHit, ramN, firm, loose, warned;
  var lives, score, combo, maxCombo, nPerfect, nGood, nMiss, nRam;
  var hitStop, pendingBad, failRing, over, won, outroT, demoMode, prevBest, resultT;
  var beatPulse, slamT, pressT, liftMissT, joyT, oopsT, rampWarn, dangerWarn, flare, milestoneDone;

  function initRun(demo) {
    demoMode = !!demo;
    stages = demo ? [92, 106] : STAGES.slice();
    nStages = stages.length;
    bp = demo ? -0.4 : 0; readyT = demo ? 0 : READY_T;
    lastBeat = -1; headChk = LEAD; inspectIdx = 0;
    comp = []; firm = []; loose = []; warned = [];
    for (var s = 0; s < nStages; s++) { comp.push(0); firm.push(false); loose.push(false); warned.push(false); }
    headHit = {}; ramN = {};
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nRam = 0;
    hitStop = 0; pendingBad = null; failRing = -1; over = false; won = false; outroT = 0;
    prevBest = game.best; resultT = 0;
    beatPulse = 0; slamT = 0; pressT = 0; liftMissT = 0; joyT = 0; oopsT = 0; rampWarn = 0; dangerWarn = 0; flare = 0; milestoneDone = false;
  }

  // ---- 拍クロック(1本)。速さは小節の頭でだけ段を上がる ----
  function stageOf(b) { return b < LEAD ? -1 : Math.floor((b - LEAD) / 4); }
  function bpmAt(b) { var s = stageOf(b); return stages[Math.max(0, Math.min(nStages - 1, s))]; }
  function spbAt(b) { return 60 / bpmAt(b); }
  function goodW(spb) { return Math.min(0.1, spb * 0.2); }
  function stageEnd(s) { return LEAD + 4 * (s + 1); }
  function curStage() { return Math.max(0, Math.min(nStages - 1, stageOf(Math.floor(Math.max(0, bp))))); }

  function onBeat(b) {
    var v = demoMode ? 0.35 : 1;
    beatPulse = 1;
    var s = stageOf(b);
    if (s >= nStages) return;
    var k = s < 0 ? b : (b - LEAD) % 4;
    var bpm = bpmAt(b);
    game.audio.melody(MEL[(Math.max(0, s) * 4 + k) % 8], { tempo: bpm, wave: 'triangle', volume: 0.06 * v, bass: [[BASS[(Math.max(0, s) * 4 + k) % 8], 1]], bassVolume: 0.08 * v, bassWave: 'triangle' });
    // 鐘の刻み: 小節の頭は高く
    game.audio.tone(k === 0 ? 1760 : 1320, 0.05, { wave: 'sine', volume: (k === 0 ? 0.09 : 0.05) * v });
    if (s >= 0 && k === 0 && !demoMode && s > 0) game.fx.popup(String(bpm), 230, 470, { color: ORANGE, size: 64 });
  }

  // 槌を1回打つ(本番の指もATTRACTのゴーストも同じ関数)
  function ram() {
    pressT = 0.1; slamT = 0.09;
    if (over || bp < 0) return 'warm';
    var bi = Math.floor(bp), frac = bp - bi, spb = spbAt(bi);
    var gw = goodW(spb);
    var after = frac * spb, before = (1 - frac) * spb;
    var target = bi, off = 0, kind;
    if (before <= gw) { target = bi + 1; off = before; kind = 'head'; }
    else if (after <= gw) { off = after; kind = 'head'; }
    else if (frac <= RAM_END) kind = 'ram';
    else kind = 'lift';
    var s = stageOf(target);
    if (s < 0 || s >= nStages) return 'warm';
    if (kind === 'head' && headHit[target]) kind = 'ram';
    var p = rammerPos();
    if (kind === 'head') {
      headHit[target] = true;
      var perfect = off <= PERFECT_W;
      comp[s] += perfect ? 2 : 1;
      combo++; maxCombo = Math.max(maxCombo, combo);
      if (perfect) nPerfect++; else nGood++;
      var pts = (perfect ? 100 : 60) + Math.min(10, combo) * 10;
      score += pts;
      game.feedback.good(p.x, p.y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? ORANGE : BLUE, size: perfect ? 58 : 46, count: perfect ? 12 : 7, volume: demoMode ? 0.03 : 0.08 });
      if (!demoMode && combo >= 6 && combo % 6 === 0) {
        game.fx.popup('x' + combo, W - 170, 330, { color: PINK, size: 76 });
        game.audio.play('se_milestone', 0.35);
      }
      return perfect ? 'perfect' : 'good';
    }
    if (kind === 'ram') {
      ramN[target] = (ramN[target] || 0) + 1;
      if (ramN[target] > RAM_CAP) return 'full';
      comp[s] += 1; nRam++;
      score += 20;
      game.fx.burst(p.x, p.y, { color: GRAIN, count: 6, speed: 220, size: 9, life: 0.35 });
      return 'ram';
    }
    // 上げの間に打った: 槌が砂の縁を叩いて崩す
    comp[s] = Math.max(0, comp[s] - 2);
    combo = 0; nMiss++;
    liftMissT = 0.35; oopsT = 0.6;
    game.feedback.bad(p.x, p.y - 80, { text: 'MISS', shake: demoMode ? 2 : 8, volume: demoMode ? 0.05 : 0.45 });
    return 'lift';
  }

  function inspect(s) {
    if (comp[s] >= TARGET) {
      firm[s] = true;
      var bonus = 200 + s * 60 + Math.max(0, comp[s] - TARGET) * 15;
      score += bonus;
      joyT = 0.9;
      game.fx.popup('NICE', LID_X, LID_Y - R0 + s * RW - 40, { color: GREEN, size: 84 });
      game.fx.burst(LID_X, LID_Y - R0 + s * RW + 30, { color: GREEN, count: 16, speed: 360 });
      if (!demoMode) {
        game.audio.play('se_powerup', 0.4);
        var n = 0;
        for (var i = 0; i < nStages; i++) if (firm[i]) n++;
        if (!milestoneDone && n >= 3) {
          milestoneDone = true;
          game.fx.popup(n + ' / ' + nStages, W / 2, 420, { color: BLUE, size: 80 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    } else {
      // 緩んだ輪: その輪を白く光らせて止める
      loose[s] = true;
      if (!demoMode) lives--;
      combo = 0;
      hitStop = 0.45; failRing = s; oopsT = 1.2;
      pendingBad = { x: LID_X, y: LID_Y - R0 + s * RW + 30 };
      if (!demoMode) game.audio.play('se_break', 0.4);
    }
  }

  function releaseStop() {
    var p = pendingBad;
    pendingBad = null; failRing = -1;
    if (p) game.feedback.bad(p.x, p.y - 40, { text: 'MISS', shake: demoMode ? 3 : 14, volume: demoMode ? 0.05 : 0.6 });
    if (!demoMode && lives <= 0) finishRun(false);
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 460 + (i % 2) * 160, { color: [ORANGE, BLUE, GREEN, GOLD][i % 4], count: 22, speed: 480 });
      game.fx.flash(GOLD, 0.18);
      game.audio.play('se_success', 0.55);
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 560, { color: PINK, size: 80 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var nf = 0;
    for (var i = 0; i < nStages; i++) if (firm[i]) nf++;
    var stats = { score: score, firmRings: nf, total: nStages, perfect: nPerfect, good: nGood, miss: nMiss, rams: nRam, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function stepRun(dt) {
    if (over) return;
    if (readyT > 0) {
      var was = readyT;
      readyT -= dt;
      if (was > 0.35 && readyT <= 0.35) game.audio.play('se_tap', 0.4);
      return;
    }
    bp += dt / spbAt(Math.floor(Math.max(0, bp)));
    var bi = Math.floor(bp);
    while (lastBeat < bi) { lastBeat++; if (lastBeat >= 0) onBeat(lastBeat); }
    // 拍の頭を打ち逃した → 連続が切れる
    while (headChk < LEAD + 4 * nStages && bp > headChk + goodW(spbAt(headChk)) / spbAt(headChk)) {
      if (!headHit[headChk]) combo = 0;
      headChk++;
    }
    // 予告: 小節の終わり0.65秒前(目盛り不足の赤点滅 / 次の速さ)
    if (inspectIdx < nStages) {
      var s = inspectIdx;
      var remain = (stageEnd(s) - bp) * spbAt(stageEnd(s) - 1);
      if (remain <= 0.65 && !warned[s]) {
        warned[s] = true;
        var v = demoMode ? 0.3 : 1;
        if (comp[s] < TARGET) { dangerWarn = remain; game.audio.tone(330, 0.2, { wave: 'square', volume: 0.06 * v, slide: -120 }); }
        if (s + 1 < nStages) {
          rampWarn = remain + 0.4; flare = 1;
          game.audio.tone(660, Math.max(0.2, remain * 0.9), { wave: 'sine', volume: 0.07 * v, slide: 660 });
        }
      }
      if (bp >= stageEnd(s)) {
        inspect(s);
        inspectIdx++;
        if (hitStop > 0) return;
      }
    }
    if (!demoMode && !over && inspectIdx >= nStages) finishRun(lives > 0);
  }

  function tick(dt) {
    beatPulse = Math.max(0, beatPulse - dt * 4);
    slamT = Math.max(0, slamT - dt);
    pressT = Math.max(0, pressT - dt);
    liftMissT = Math.max(0, liftMissT - dt);
    joyT = Math.max(0, joyT - dt);
    oopsT = Math.max(0, oopsT - dt);
    rampWarn = Math.max(0, rampWarn - dt);
    dangerWarn = Math.max(0, dangerWarn - dt);
    flare = Math.max(0, flare - dt * 1.2);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.5) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 230) return;
    var res = ram();
    if (res === 'perfect' || res === 'good') {
      game.audio.tone(150, 0.14, { wave: 'sine', volume: 0.3, slide: -60 });
      game.audio.tone(res === 'perfect' ? 1400 : 900, 0.03, { wave: 'square', volume: 0.05 });
    } else if (res === 'ram') {
      game.audio.tone(210, 0.07, { wave: 'triangle', volume: 0.16, slide: -90 });
    } else if (res === 'full' || res === 'warm') {
      game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(BTN_X, BTN_Y, { color: SAND, count: 4, speed: 140 });
    }
  });

  // ---- 描画ヘルパー ----
  function shadow(x, y, r) {
    // 真下の柔らかい影(横に並べた円で平たい楕円を作る)
    for (var i = -2; i <= 2; i++) game.draw.circle(x + i * r * 0.32, y + r * 0.92, r * 0.42, '#000000', 0.05);
  }
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x, y + 5, { size: sz, color: '#00000022', bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function pill(x, y, w, h, col, a) {
    game.draw.rect(x + h / 2, y, Math.max(0, w - h), h, col, a);
    game.draw.circle(x + h / 2, y + h / 2, h / 2, col, a);
    game.draw.circle(x + w - h / 2, y + h / 2, h / 2, col, a);
  }

  // 槌の位置: 小節の4拍で輪を一周。上げの間に次の場所へ回る
  function beatAngle() {
    if (bp < LEAD) return -Math.PI / 2;
    var rel = bp - LEAD - curStage() * 4;
    var k = Math.floor(rel), frac = rel - k;
    var m = Math.max(0, Math.min(1, (frac - RAM_END) / (1 - RAM_END)));
    m = m * m * (3 - 2 * m);
    return -Math.PI / 2 + (Math.min(4, k + m)) * Math.PI / 2;
  }
  function rammerPos() {
    var a = beatAngle(), rc = R0 - curStage() * RW - RW / 2;
    return { x: LID_X + Math.cos(a) * rc, y: LID_Y + Math.sin(a) * rc, a: a };
  }
  function liftAmt() {
    if (bp < LEAD) return 0.4 + Math.sin(game.time.elapsed * 4) * 0.2;
    var frac = bp - Math.floor(bp);
    if (slamT > 0) return 0;
    if (frac <= RAM_END) return Math.min(0.25, frac * 0.4);
    return Math.sin(Math.min(1, (frac - RAM_END) / (1 - RAM_END)) * Math.PI) * 0.9 + 0.2;
  }

  // ---- 描画 ----
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, CREAM], [0.55, PEACH], [1, '#ffd2b0']]);
    // 炉(左上): 丸い塊、口が燃え上がる
    shadow(190, 360, 110);
    game.draw.circle(190, 360, 118, '#e86a3a');
    game.draw.circle(190, 330, 92, '#f0884f');
    var fl = 0.5 + 0.2 * Math.sin(t * 9) + flare * 0.5;
    game.draw.circle(190, 392, 46 + flare * 26, GOLD, Math.min(1, fl));
    game.draw.circle(190, 392, 28 + flare * 18, '#fff3c4', Math.min(1, fl));
    if (flare > 0) for (var i = 0; i < 4; i++) game.draw.circle(190 + Math.sin(t * 7 + i) * 30, 300 - i * 40 - flare * 40, 18 - i * 3, GOLD, flare * 0.8);
    // 鐘棚(右上): 締めた輪ごとに小さな鐘が並ぶ
    game.draw.rect(560, 256, 440, 14, RIM, 0.5);
    for (var b = 0; b < nStages; b++) {
      var bx = 620 + b * 92;
      game.draw.line(bx, 270, bx, 296, RIM, 4);
      game.draw.sprite(BELL, { o: firm[b] ? GOLD : (loose[b] ? PINK : '#e8dccb') }, bx, 334, 12, { anchor: 'center' });
    }
  }

  function drawLid() {
    var t = game.time.elapsed;
    var cs = curStage();
    game.draw.circle(LID_X + 10, LID_Y + 26, R0 + 30, '#000000', 0.1);
    game.draw.circle(LID_X, LID_Y, R0 + 26, RIM);
    game.draw.circle(LID_X, LID_Y - 4, R0 + 16, '#7a8493');
    for (var s = 0; s < 5; s++) {
      var ro = R0 - s * RW;
      if (s >= nStages) { game.draw.circle(LID_X, LID_Y, ro, '#e9cf9e'); continue; }
      var active = s === cs && !over && bp >= LEAD - 0.5 && inspectIdx === s;
      if (active) game.draw.circle(LID_X, LID_Y, ro + 10, dangerWarn > 0 && Math.floor(t * 14) % 2 === 0 ? PINK : ORANGE, 0.55 + beatPulse * 0.4);
      var p = firm[s] ? 1 : Math.min(1, comp[s] / TARGET);
      var fail = failRing === s && hitStop > 0;
      game.draw.circle(LID_X, LID_Y, ro + (fail ? 8 : 0), fail ? '#ffffff' : SAND);
      if (!fail && p > 0) game.draw.circle(LID_X, LID_Y, ro, FIRM, p * 0.8);
      if (!fail && p < 1) {
        for (var g = 0; g < 12; g++) {
          var a = g * Math.PI / 6 + s * 0.4;
          game.draw.circle(LID_X + Math.cos(a) * (ro - RW / 2), LID_Y + Math.sin(a) * (ro - RW / 2), 9, GRAIN, (1 - p) * 0.9);
        }
      }
      if (firm[s]) for (var h = 0; h < 5; h++) {
        var aa = -Math.PI * 0.8 + h * 0.18;
        game.draw.circle(LID_X + Math.cos(aa) * (ro - RW / 2), LID_Y + Math.sin(aa) * (ro - RW / 2), 6, '#ffffff', 0.5);
      }
      if (loose[s] && !fail) for (var c = 0; c < 4; c++) {
        var ca = c * 1.6 + s;
        var x1 = LID_X + Math.cos(ca) * (ro - 8), y1 = LID_Y + Math.sin(ca) * (ro - 8);
        var x2 = LID_X + Math.cos(ca + 0.12) * (ro - RW + 10), y2 = LID_Y + Math.sin(ca + 0.12) * (ro - RW + 10);
        game.draw.line(x1, y1, x2, y2, PINK, 6);
      }
      game.draw.circle(LID_X, LID_Y, ro - RW + 4, '#c8a676');
    }
    // 湯口(中心)
    game.draw.circle(LID_X, LID_Y, 30, RIM);
    game.draw.circle(LID_X, LID_Y - 4, 20, '#8d96a4');
  }

  function drawWorker(front) {
    var t = game.time.elapsed;
    var p = rammerPos();
    var sy = Math.sin(p.a);
    if ((sy > 0.05) !== front) return;
    var wx = LID_X + Math.cos(p.a) * WALK_R, wy = LID_Y + sy * WALK_R;
    var lift = liftAmt();
    var bob = -beatPulse * 8 + Math.sin(t * 6) * 3;
    shadow(wx, wy, 58);
    // 職人: 丸い体と頭 + 顔
    game.draw.circle(wx, wy + bob, 60, BLUE);
    game.draw.circle(wx - 18, wy - 16 + bob, 20, '#ffffff', 0.25);
    game.draw.circle(wx, wy - 76 + bob, 44, SKIN);
    game.draw.circle(wx, wy - 112 + bob, 30, ORANGE);
    var face = oopsT > 0 ? FACE.oops : (joyT > 0 ? FACE.joy : (slamT > 0 || pressT > 0 ? FACE.push : FACE.norm));
    game.draw.sprite(face, PAL_FACE, wx, wy - 72 + bob, 9, { anchor: 'center' });
  }

  // 槌(長柄の丸い打ち頭)は蓋と職人の上に描く。上げの間は浮いて影が離れる
  function drawRammer() {
    var t = game.time.elapsed;
    var p = rammerPos();
    var wx = LID_X + Math.cos(p.a) * WALK_R, wy = LID_Y + Math.sin(p.a) * WALK_R;
    var bob = -beatPulse * 8 + Math.sin(t * 6) * 3;
    var lift = liftAmt();
    var hx = p.x, hy = p.y - lift * 120;
    game.draw.circle(p.x + 6, p.y + 10, 40 - lift * 12, '#000000', 0.16 - lift * 0.06);
    game.draw.line(wx, wy - 40 + bob, hx, hy - 30, '#8a5a34', 16);
    var headCol = liftMissT > 0 ? PINK : (lift > 0.5 ? CORAL : ORANGE);
    game.draw.circle(hx, hy - 20, 48 + (slamT > 0 ? 8 : 0), headCol);
    game.draw.circle(hx - 14, hy - 36, 16, '#ffffff', 0.45);
  }

  function drawGauge() {
    var t = game.time.elapsed;
    var s = curStage();
    var x0 = 150, w = W - 300, h = 46;
    pill(x0 - 8, GAUGE_Y - 8, w + 16, h + 16, '#ffffff');
    pill(x0, GAUGE_Y, w, h, '#efe3d2');
    var v = s < nStages ? (firm[s] ? Math.max(TARGET, comp[s]) : comp[s]) : 0;
    var f = Math.min(1, v / GAUGE_MAX);
    var warn = dangerWarn > 0 && Math.floor(t * 14) % 2 === 0;
    if (f > 0) pill(x0, GAUGE_Y, Math.max(h, w * f), h, warn ? PINK : (v >= TARGET ? GREEN : ORANGE));
    // 旗(目標の目盛り)
    var fx = x0 + w * TARGET / GAUGE_MAX;
    game.draw.line(fx, GAUGE_Y - 34, fx, GAUGE_Y + h + 6, INK, 6);
    game.draw.rect(fx, GAUGE_Y - 34, 42, 26, v >= TARGET ? GREEN : PINK);
    for (var k = 1; k < GAUGE_MAX; k++) game.draw.rect(x0 + w * k / GAUGE_MAX - 1, GAUGE_Y + h - 12, 3, 10, '#00000022');
  }

  function drawRuler() {
    var s = curStage();
    var st = LEAD + s * 4;
    pill(RULER_X - 30, RULER_Y - 40, SEG * 4 + 60, 80, '#ffffff');
    for (var k = 0; k < 4; k++) {
      var b = st + k, x = RULER_X + k * SEG;
      var spb = spbAt(b), gf = goodW(spb) / spb;
      game.draw.rect(x + gf * SEG, RULER_Y - 12, (RAM_END - gf) * SEG, 24, MINT);
      game.draw.rect(x + RAM_END * SEG, RULER_Y - 12, (1 - RAM_END - gf) * SEG, 24, CORAL);
      var hit = headHit[b], past = bp > b + gf;
      game.draw.circle(x, RULER_Y, 22, hit ? GREEN : (past ? '#cfc6bb' : GOLD));
    }
    game.draw.circle(RULER_X + 4 * SEG, RULER_Y, 22, GOLD, 0.5);
    var rel = Math.max(-0.2, Math.min(4, bp - st));
    var cx = RULER_X + rel * SEG;
    game.draw.circle(cx + 3, RULER_Y + 6, 20, '#000000', 0.12);
    game.draw.circle(cx, RULER_Y, 18, INK);
    game.draw.circle(cx - 5, RULER_Y - 5, 6, '#ffffff', 0.6);
  }

  function drawButton() {
    var pr = pressT > 0;
    var r = BTN_R - (pr ? 14 : 0) + (pr ? 0 : beatPulse * 6);
    shadow(BTN_X, BTN_Y, r);
    game.draw.circle(BTN_X, BTN_Y + (pr ? 8 : 0), r, liftMissT > 0 ? PINK : ORANGE);
    game.draw.circle(BTN_X - r * 0.3, BTN_Y - r * 0.32 + (pr ? 8 : 0), r * 0.3, '#ffffff', 0.35);
    // 槌の印
    var cy = BTN_Y + (pr ? 8 : 0);
    game.draw.line(BTN_X - 50, cy + 70, BTN_X + 30, cy - 20, '#ffffff', 18);
    game.draw.circle(BTN_X + 40, cy - 34, 42, '#ffffff');
  }

  function drawRampSign() {
    var t = game.time.elapsed;
    var s = curStage();
    var showNext = rampWarn > 0 && s + 1 < nStages;
    var bpm = showNext ? stages[Math.min(nStages - 1, inspectIdx + 1)] : bpmAt(Math.floor(Math.max(0, bp)));
    var y = 540;
    pill(80, y - 46, 230, 92, showNext && Math.floor(t * 10) % 2 === 0 ? GOLD : '#ffffff');
    // 振り子(拍で振れる)
    var a = Math.sin(bp * Math.PI) * 0.5;
    game.draw.line(130, y + 30, 130 + Math.sin(a) * 40, y - 30, INK, 6);
    game.draw.circle(130 + Math.sin(a) * 40, y - 30, 10, ORANGE);
    label(String(bpm), 230, y + 18, 54, INK);
    if (showNext) { game.draw.line(290, y - 10, 300, y - 30, PINK, 6); game.draw.line(300, y - 30, 310, y - 10, PINK, 6); }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#ffffff', 0.75);
    label('SCORE ' + score, 40, 90, 52, INK, 'left');
    label('BEST ' + game.best, W - 40, 90, 34, BLUE, 'right');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BELL, { o: i < lives ? GOLD : '#d9d2c8' }, W - 70 - i * 80, 160, 9, { anchor: 'center' });
    if (combo >= 2) label('x' + combo, 40, 180, 46, PINK, 'left');
    var progress = Math.max(0, Math.min(1, bp / (LEAD + 4 * nStages)));
    pill(260, 150, 520, 26, '#efe3d2');
    if (progress > 0) pill(260, 150, Math.max(26, 520 * progress), 26, ORANGE);
  }

  function drawScene() {
    drawWorld();
    drawWorker(false);
    drawLid();
    drawWorker(true);
    drawRammer();
    drawRampSign();
    drawGauge();
    drawRuler();
    drawButton();
  }

  function drawResult(showTap) {
    var y0 = H * 0.25;
    pill(70, y0, W - 140, H * 0.36, '#ffffff', 0.95);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? GREEN : PINK);
    label('SCORE ' + score, W / 2, H * 0.38, 64, INK);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.425, 36, BLUE);
    var nf = 0;
    for (var i = 0; i < nStages; i++) if (firm[i]) nf++;
    game.draw.sprite(BELL, { o: GOLD }, W / 2 - 150, H * 0.463, 10, { anchor: 'center' });
    label(nf + ' / ' + nStages, W / 2 + 10, H * 0.478, 54, ORANGE);
    label('x' + maxCombo, W / 2, H * 0.52, 44, PINK);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.565, 62, PINK);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.565, 44, INK);
    if (!won) label('あと' + Math.max(1, nStages - nf - 1) + '輪!', W / 2, H * 0.6, 48, ORANGE);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.64, 36, INK);
  }

  // ---- ATTRACT: 実ロジックで2小節。拍の頭+2連打で輪を締め、2小節目に一度だけ「上げ」で打ってMISS ----
  var demo = { t: 0, ev: [], ei: 0, pressT: 0 };
  function demoPlan() {
    var ev = [];
    for (var s = 0; s < 2; s++) {
      for (var k = 0; k < 4; k++) {
        var b = LEAD + s * 4 + k;
        ev.push(b, b + 0.22, b + 0.42);
        if (s === 1 && k === 1) ev.push(b + 0.78);
      }
    }
    return ev;
  }
  var DEMO_CYC = 0.4 * 60 / 92 + (LEAD + 4) * 60 / 92 + 4 * 60 / 106 + 1.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.ev = demoPlan(); demo.ei = 0; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) releaseStop(); }
    else stepRun(dt);
    while (demo.ei < demo.ev.length && bp >= demo.ev[demo.ei] && hitStop <= 0) {
      var res = ram();
      if (res === 'perfect' || res === 'good') game.audio.tone(150, 0.1, { wave: 'sine', volume: 0.05, slide: -60 });
      demo.ei++; demo.pressT = 0.09;
    }
    demo.pressT = Math.max(0, demo.pressT - dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tick(dt);

    if (state === S.ATTRACT) {
      if (!stages) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(BTN_X + 40, BTN_Y + (demo.pressT > 0 ? 10 : 50), { press: demo.pressT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, '#ffffff', 0.8);
      var bob = Math.sin(t * 3) * 6;
      label(GAME_TITLE, W / 2 + 6, 120 + bob, 116, ORANGE);
      label(GAME_TITLE, W / 2, 114 + bob, 116, INK);
      label('HI-SCORE ' + game.best, W / 2, 200, 38, BLUE);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 46, ORANGE);
      else label('TAP TO START', W / 2, H * 0.975, 42, INK);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) releaseStop();
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      stepRun(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) {
      pill(90, H * 0.4, W - 180, 170, ORANGE);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 122, 110, '#ffffff');
    }
    // 前奏の間だけ、槌のボタンに手を薄く出す
    if (!over && readyT <= 0 && bp < LEAD) {
      var ph = bp - Math.floor(bp);
      game.draw.hand(BTN_X + 40, BTN_Y + (ph < 0.15 ? 10 : 50), { press: ph < 0.15, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
