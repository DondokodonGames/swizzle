// I-Wii-0004v2-midnight-cat-creep.js
// 夜ふけの台所しのび足 — 流しに向かう家主が振り返る寸前まで猫が一歩ずつ忍び寄り、ぎりぎりで止まるほど高得点
// 操作: タップ1回で猫が一歩進む(足が上がっている間は動いている扱い)。家主の頭が回り始めたら(きしみ音+灯りのちらつき+赤い!)、目が向く寸前の最後の一歩で止まる。棚に手を伸ばすだけの動きは振り返りではない
// 終わり: 20秒以内に食卓の干物まで忍び寄ればCLEAR(止まった遅さの得点の合計がスコア)。目が向いた瞬間に足が上がっている/見られている間に踏み出す/時間切れでGAME OVER
// @mechanic: near_miss
// @theme: midnight_kitchen_cat_creep
// 世界観: 真夜中の台所で、つまみ食いの三毛猫が、流しで洗い物をする家主が振り返る寸前まで床板を一歩ずつ忍び寄り、食卓の干物を狙う
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(止まった遅さの合計・PERFECT数・歩数)
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色寄りの低彩度、光源にブルーム(半透明円の重ね)、四辺にビネット
  var STYLE = { bg: ['#2a231d', '#4a3d31', '#15110d'], main: ['#8a7a64', '#c8ab7c', '#5c6a6e'], accent: ['#ffc865', '#e0583e'] };
  var C = {
    wall: STYLE.bg[1], wallDark: STYLE.bg[0], night: STYLE.bg[2], plank: STYLE.main[0], plankHi: STYLE.main[1], steel: STYLE.main[2],
    lamp: STYLE.accent[0], red: STYLE.accent[1], white: '#f4ecdc', ink: '#0e0b08', good: '#a8e07a', moon: '#dfe6d8',
  };

  var GAME_TITLE = 'NIGHT PAWS';
  var TIME_LIMIT = 20;
  var NEEDED = 18;                 // 食卓までの歩数
  var STEP_DUR = 0.26;             // 足が上がっている時間(=動いている扱い)
  var PATH_A = { x: 400, y: Math.round(H * 0.7135) }, PATH_B = { x: 820, y: Math.round(H * 0.401) };
  var OWNER_X = 300, OWNER_Y = Math.round(H * 0.245);
  var PAD_X = W / 2, PAD_Y = Math.round(H * 0.885);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ラン状態(本番・デモ共通)
  var phase, phaseT, phaseDur, teleDur, lookDur, cycleN, feintNext;
  var steps, stepT, queued, lastStepEnd, steppedSinceLook, runT;
  var caughtT, caughtFlash, winT, padFlash, lastWord, lastWordT;
  // 本番だけの状態
  var score, perfects, perfectChain, countIn, over, won, endT, prevBest, playT, timeUp, halfShown;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 三毛猫(横向き・右上へ忍び寄る)。じっと/右足/左足/見つかった
  var CAT_STILL = [
    '.t...........o..o',
    't............oooo',
    't...........oewew',
    't..........wwwwnw',
    '.twwwooowwwwwww..',
    '..wwwooowwwwwww..',
    '..wwwwwwwwwwwww..',
    '...w.w.....w.w...',
  ];
  var CAT_STEP1 = [
    '.t...........o..o',
    't............oooo',
    't...........oewew',
    '.t.........wwwwnw',
    '..twwooowwwwwww..',
    '..wwwooowwwwwww..',
    '..wwwwwwwwwwwww..',
    '.w....w...w....w.',
  ];
  var CAT_STEP2 = [
    '.............o..o',
    'tt...........oooo',
    '..t.........oewew',
    '..t........wwwwnw',
    '..twwooowwwwwww..',
    '..wwwooowwwwwww..',
    '..wwwwwwwwwwwww..',
    '....ww......ww...',
  ];
  var CAT_CAUGHT = [
    't............o..o',
    't............oooo',
    't...........oEwEw',
    't..........wwwwnw',
    't.wwwooowwwwwww..',
    '.wwwwooowwwwwwww.',
    '.wwwwwwwwwwwwwww.',
    '.w..w.......w..w.',
  ];
  var CAT_PAL = { t: '#2a2018', o: '#d8883a', w: '#efe6d6', e: '#8ec04a', E: '#ffffff', n: '#e89090' };

  // 家主: 背中/振り向き途中/正面(目が光る)/棚へ手を伸ばす
  var OWNER_BACK = [
    '...hhhh...', '..hhhhhh..', '..hhhhhh..', '...ssss...', '.cccccccc.',
    'ccccaacccc', 'ccccaacccc', 'ccccaacccc', '.cccccccc.', '.pp....pp.',
  ];
  var OWNER_TURN = [
    '...hhhh...', '..hhhhss..', '..hhhses..', '...hsss...', '.cccccccc.',
    'ccccaacccc', 'cccccccccc', 'ccccaacccc', '.cccccccc.', '.pp....pp.',
  ];
  var OWNER_FRONT = [
    '...hhhh...', '..hssssh..', '..sEssEs..', '...smms...', '.cccccccc.',
    'cccwwwwccc', 'cccwwwwccc', 'cccwwwwccc', '.cccccccc.', '.pp....pp.',
  ];
  var OWNER_REACH = [
    'c..hhhh...', 'c.hhhhhh..', 'cchhhhhh..', 'cc.ssss...', '.cccccccc.',
    '.cccaacccc', '.cccaacccc', '.cccaacccc', '.cccccccc.', '.pp....pp.',
  ];
  var OWNER_PAL = { h: '#5a5048', s: '#d8b494', c: '#5c6a8a', a: '#e8dcc4', p: '#3a3430', E: '#fff2b0', m: '#8a4a3a', w: '#e8dcc4' };

  var FISH = ['.ggggggg..g', 'geggggggggg', 'gggggggggg.', '.gggggggg.g'];
  var FISH_PAL = { g: '#c0a47a', e: '#2a2018' };

  function catPos() {
    var p = (steps - (stepT > 0 ? stepT / STEP_DUR : 0)) / NEEDED;
    p = Math.max(0, Math.min(1, p));
    return { x: PATH_A.x + (PATH_B.x - PATH_A.x) * p, y: PATH_A.y + (PATH_B.y - PATH_A.y) * p, p: p };
  }

  function resetRun() {
    cycleN = 0; steps = 0; stepT = 0; queued = false; lastStepEnd = -9; steppedSinceLook = false; runT = 0;
    caughtT = 0; caughtFlash = 0; winT = 0; padFlash = 0; lastWord = ''; lastWordT = 0;
    nextCycle();
  }

  function initGame() {
    resetRun();
    score = 0; perfects = 0; perfectChain = 0; countIn = 0.8; over = false; won = false; endT = 0;
    prevBest = game.best; playT = 0; timeUp = false; halfShown = false;
  }

  // 1回の見回り: 背中(洗い物)→[棚への手伸ばし=フェイント]→振り向き予告→目が向く
  function nextCycle() {
    cycleN++;
    var k = Math.min(1, (cycleN - 1) / 5);
    phase = 'back'; phaseT = 0;
    if (state === S.ATTRACT) {
      phaseDur = cycleN === 1 ? 1.5 : 1.0; teleDur = 0.7; lookDur = 0.9; feintNext = false;
      return;
    }
    phaseDur = game.random(1.4, 2.3) * (1 - 0.4 * k);
    teleDur = 0.78 - 0.26 * k;       // 予告は 0.78s → 0.52s
    lookDur = 0.8 + 0.4 * k;
    feintNext = cycleN >= 3 && Math.random() < 0.45;
  }

  function word(w) { lastWord = w; lastWordT = 0.6; }

  function startStep() {
    stepT = STEP_DUR; steps++; steppedSinceLook = true; padFlash = 0.15;
    game.audio.tone(steps % 2 ? 330 : 294, 0.05, { wave: 'triangle', volume: 0.09 });
    if (phase === 'look') { caught(); return; }
    if (state === S.PLAYING && !halfShown && steps >= NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup(steps + '/' + NEEDED, PATH_B.x - 60, PATH_B.y - 120, { color: C.lamp, size: 64 });
    }
  }

  function doStep() {
    if (caughtT > 0 || winT > 0) return;
    if (phase === 'look') { startStep(); return; }
    if (stepT > 0) {
      if (!queued) { queued = true; padFlash = 0.1; game.audio.play('se_tap', 0.04); }
      return;
    }
    startStep();
  }

  function caught() {
    if (caughtT > 0) return;
    caughtT = 0.5; caughtFlash = 1; queued = false;
    game.audio.tone(880, 0.18, { wave: 'sawtooth', volume: 0.14, slide: -500 });
    perfectChain = 0;
  }

  function lookBegins() {
    if (stepT > 0 || queued) { caught(); return; }
    if (!steppedSinceLook) { word(''); return; }
    var gap = runT - lastStepEnd;
    var c = catPos();
    var pts, w, col;
    if (gap <= 0.22) { w = 'PERFECT'; pts = 300; col = C.lamp; }
    else if (gap <= 0.45) { w = 'GOOD'; pts = 150; col = C.good; }
    else if (gap <= 0.8) { w = 'NICE'; pts = 60; col = C.white; }
    else { w = ''; pts = 20; col = C.white; }
    steppedSinceLook = false;
    if (state === S.PLAYING) {
      if (w === 'PERFECT') { perfects++; perfectChain++; pts += (perfectChain - 1) * 100; } else perfectChain = 0;
      score += pts;
      if (perfectChain >= 2) { game.audio.play('se_powerup', 0.35); game.fx.popup('x' + perfectChain, c.x + 120, c.y - 160, { color: C.lamp, size: 72 }); }
    }
    word(w);
    game.feedback.good(c.x, c.y - 70, { text: w ? w + ' +' + pts : '+' + pts, color: col, size: w === 'PERFECT' ? 60 : 44, count: w === 'PERFECT' ? 16 : 6 });
  }

  function stepRun(dt) {
    runT += dt;
    if (padFlash > 0) padFlash -= dt;
    if (lastWordT > 0) lastWordT -= dt;
    if (stepT > 0) {
      stepT -= dt;
      if (stepT <= 0) {
        stepT = 0; lastStepEnd = runT;
        if (steps >= NEEDED) { reachTable(); return; }
        if (queued) { queued = false; startStep(); }
      }
    }
    phaseT += dt;
    if (phase === 'back' && phaseT >= phaseDur) {
      phaseT = 0;
      if (feintNext) { phase = 'feint'; feintNext = false; phaseDur = 0.6; game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.07 }); }
      else { phase = 'tele'; creak(0); }
    } else if (phase === 'feint' && phaseT >= phaseDur) {
      phase = 'back'; phaseT = 0; phaseDur = game.random(0.6, 1.1);
      game.audio.tone('G5', 0.06, { wave: 'square', volume: 0.07 });
    } else if (phase === 'tele') {
      if (phaseT >= teleDur * 0.5 && phaseT - dt < teleDur * 0.5) creak(1);
      if (phaseT >= teleDur) { phase = 'look'; phaseT = 0; game.audio.tone(196, 0.2, { wave: 'triangle', volume: 0.12 }); lookBegins(); }
    } else if (phase === 'look' && phaseT >= lookDur) {
      nextCycle();
    }
  }

  function creak(i) {
    game.audio.tone(150 + i * 70, 0.12, { wave: 'sawtooth', volume: 0.1, slide: 90 });
  }

  function reachTable() {
    winT = 0.5;
    var c = catPos();
    game.audio.play('se_jump', 0.5);
    game.fx.burst(c.x, c.y - 60, { color: C.lamp, count: 18, speed: 380 });
    if (state === S.PLAYING) {
      var bonus = Math.round(Math.max(0, TIME_LIMIT - playT) * 20);
      score += bonus;
      game.feedback.good(PATH_B.x, PATH_B.y - 180, { text: '+' + bonus, color: C.lamp, size: 56 });
      game.audio.play('se_coin', 0.5);
    }
  }

  // ── 描画 ──
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 600, [[0, C.night], [0.5, C.wallDark], [1, C.wall]]);
    // 窓と月(ブルーム)
    game.draw.rect(640, 270, 300, 200, '#1c2228');
    game.draw.circle(860, 330, 90, C.moon, 0.06);
    game.draw.circle(860, 330, 60, C.moon, 0.1);
    game.draw.circle(860, 330, 34, C.moon, 0.85);
    game.draw.rect(786, 270, 8, 200, C.wallDark);
    game.draw.rect(640, 366, 300, 8, C.wallDark);
    // 流し台
    game.draw.rect(60, 470, 520, 70, C.steel);
    game.draw.rect(60, 470, 520, 10, '#8a9a9e');
    game.draw.rect(60, 540, 520, 70, '#3a3028');
    game.draw.rect(250, 400, 12, 70, '#8a9a9e');
    game.draw.rect(250, 400, 60, 12, '#8a9a9e');
    // 吊り電球(ちらつき・予告で強まる)
    var flick = phase === 'tele' ? (Math.floor(t * 18) % 2 ? 0.5 : 0.15) : (phase === 'look' ? 0.6 : 0.18);
    game.draw.line(OWNER_X, 230, OWNER_X, 300, '#2a231d', 4);
    game.draw.circle(OWNER_X, 310, 120, C.lamp, flick * 0.25);
    game.draw.circle(OWNER_X, 310, 60, C.lamp, flick * 0.4);
    game.draw.circle(OWNER_X, 310, 18, C.lamp, 0.9);
    // 床板(奥ほど細い)
    game.draw.gradient(600, H, [[0, '#3a3026'], [0.6, '#4e4032'], [1, '#2a221a']]);
    var y = 600, hgt = 22;
    var row = 0;
    while (y < 1520) {
      game.draw.rect(0, y, W, hgt, row % 2 ? C.plank : '#7a6a56', 0.55);
      game.draw.rect(0, y + hgt - 3, W, 3, C.ink, 0.35);
      y += hgt; hgt += 4; row++;
    }
    // 食卓と干物
    game.draw.rect(660, 650, 360, 40, '#6a4e34');
    game.draw.rect(660, 650, 360, 8, '#8a6a48');
    game.draw.rect(680, 690, 20, 140, '#4a3624');
    game.draw.rect(980, 690, 20, 140, '#4a3624');
    game.draw.circle(860, 640, 70, C.white, 0.85);
    game.draw.circle(860, 640, 54, '#d8d0c0');
    if (!(winT > 0 || won)) {
      var glow = 0.25 + Math.sin(t * 5) * 0.12;
      game.draw.circle(860, 630, 96, C.lamp, glow * 0.4);
      game.draw.sprite(FISH, FISH_PAL, 860, 628, 10, { anchor: 'center' });
    }
    // 冷蔵庫の灯り
    game.draw.rect(1000, 330, 80, 330, '#cfc8b8', 0.8);
    game.draw.circle(1040, 600, 140, C.lamp, 0.05);
  }

  function drawGaze() {
    var a = 0;
    if (phase === 'tele') a = Math.floor(game.time.elapsed * 16) % 2 ? 0.1 : 0.03;
    else if (phase === 'look') a = 0.24;
    if (a <= 0) return;
    for (var y = 560; y < 1480; y += 10) {
      var hw = (y - 480) * 0.62;
      game.draw.rect(OWNER_X + 120 - hw, y, hw * 2, 10, C.lamp, a);
    }
  }

  function drawOwner() {
    var t = game.time.elapsed;
    var spr = OWNER_BACK;
    if (phase === 'tele') spr = OWNER_TURN;
    else if (phase === 'look') spr = OWNER_FRONT;
    else if (phase === 'feint') spr = OWNER_REACH;
    var scrub = phase === 'back' ? Math.sin(t * 9) * 6 : 0;
    game.draw.sprite(spr, OWNER_PAL, OWNER_X + scrub, OWNER_Y, 20, { anchor: 'center' });
    if (phase === 'look') {
      game.draw.circle(OWNER_X - 25, OWNER_Y - 45, 26, '#fff2b0', 0.25);
      game.draw.circle(OWNER_X + 25, OWNER_Y - 45, 26, '#fff2b0', 0.25);
    }
    if (phase === 'tele' && Math.floor(t * 10) % 2 === 0) {
      // 赤いトゲの吹き出し+「!」
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2;
        game.draw.line(OWNER_X + 120, OWNER_Y - 170, OWNER_X + 120 + Math.cos(a) * 62, OWNER_Y - 170 + Math.sin(a) * 62, C.red, 8);
      }
      game.draw.circle(OWNER_X + 120, OWNER_Y - 170, 44, C.red);
      label('!', OWNER_X + 120, OWNER_Y - 148, 64, C.white);
    }
  }

  function drawCat() {
    var c = catPos();
    var px = 12 - 4 * c.p;            // 奥ほど小さく(擬似奥行き)
    var spr = CAT_STILL;
    if (caughtT > 0 || (over && !won)) spr = CAT_CAUGHT;
    else if (stepT > 0) spr = steps % 2 ? CAT_STEP1 : CAT_STEP2;
    var lift = stepT > 0 ? -Math.sin((1 - stepT / STEP_DUR) * Math.PI) * 10 : 0;
    var breathe = stepT > 0 ? 0 : Math.sin(game.time.elapsed * 3) * 2;
    if (winT > 0 || won) { c = { x: 860, y: 600, p: 1 }; px = 7; lift = -Math.abs(Math.sin(game.time.elapsed * 8)) * 16; }
    game.draw.circle(c.x, c.y + px * 4.5, px * 6, C.ink, 0.35);
    var scale = px * (caughtFlash > 0 ? 1 + caughtFlash * 0.5 : 1);
    if (caughtFlash > 0) game.draw.circle(c.x, c.y, px * 12, '#ffffff', caughtFlash * 0.6);
    game.draw.sprite(spr, CAT_PAL, c.x, c.y + lift + breathe, scale, { anchor: 'center' });
    if (caughtT > 0) label('!', c.x + 40, c.y - 90, 72, C.red);
  }

  function drawPath() {
    for (var i = 1; i <= NEEDED; i++) {
      var p = i / NEEDED;
      var x = PATH_A.x + (PATH_B.x - PATH_A.x) * p, y = PATH_A.y + (PATH_B.y - PATH_A.y) * p;
      var done = i <= steps;
      game.draw.circle(x, y + 30, 8 - 3 * p, done ? C.plankHi : C.white, done ? 0.25 : 0.12);
    }
  }

  function drawPad() {
    var t = game.time.elapsed;
    var pulse = 1 + Math.sin(t * 5) * 0.04;
    var r = 120 * pulse * (padFlash > 0 ? 0.92 : 1);
    game.draw.circle(PAD_X, PAD_Y, r + 14, C.white, 0.18 + (padFlash > 0 ? 0.3 : 0));
    game.draw.circle(PAD_X, PAD_Y + 20, r * 0.55, '#e89090');
    for (var i = 0; i < 4; i++) {
      var a = Math.PI * (1.15 + i * 0.235);
      game.draw.circle(PAD_X + Math.cos(a) * r * 0.75, PAD_Y + 10 + Math.sin(a) * r * 0.75, r * 0.2, '#e89090');
    }
  }

  function vignette() {
    game.draw.rect(0, 0, W, 60, C.ink, 0.45);
    game.draw.rect(0, H - 80, W, 80, C.ink, 0.45);
    game.draw.rect(0, 0, 50, H, C.ink, 0.4);
    game.draw.rect(W - 50, 0, 50, H, C.ink, 0.4);
  }

  function drawWorld() {
    drawRoom(); drawGaze(); drawOwner(); drawPath(); drawCat(); drawPad(); vignette();
    if (lastWordT > 0 && lastWord) label(lastWord, W / 2, 1520, 64, lastWord === 'PERFECT' ? C.lamp : C.white);
  }

  function hud() {
    label(String(score), 200, 120, 72, C.white);
    label(steps + ' / ' + NEEDED, W - 190, 120, 52, C.lamp);
    var left = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(80, 178, W - 160, 22, C.ink, 0.6);
    game.draw.rect(80, 178, (W - 160) * left, 22, left < 0.25 ? C.red : C.plankHi);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0) { game.audio.play('se_tap', 0.05); return; }
    doStep();
  });

  // ── ATTRACT: 実ロジックで1周目はぎりぎりで止まってPERFECT、2周目は止まり損ねて見つかる ──
  var demo = { t: 0, gx: PAD_X, gy: PAD_Y, press: false, tapT: 0, resetT: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt || demo.resetT > 0 && (demo.resetT -= dt) <= 0) {
      demo.resetT = 0; resetRun(); demo.tapT = 0.3;
    }
    if (demo.resetT > 0) return;
    if (caughtT > 0) {
      caughtT -= dt; caughtFlash = Math.max(0, caughtFlash - dt * 1.5);
      if (caughtT <= 0) { game.feedback.bad(catPos().x, catPos().y - 60, { text: 'MISS' }); demo.resetT = 1.0; }
      return;
    }
    stepRun(dt);
    demo.tapT -= dt;
    demo.press = demo.tapT > 0.18;
    var wantTap = false;
    if (phase === 'back' || phase === 'feint') wantTap = true;
    else if (phase === 'tele') wantTap = cycleN >= 2 || (teleDur - phaseT) > STEP_DUR + 0.1;
    else if (phase === 'look') wantTap = cycleN >= 2;
    if (wantTap && demo.tapT <= 0 && stepT <= 0) { doStep(); demo.tapT = 0.34; }
    if (steps >= NEEDED - 1 && demo.resetT <= 0) demo.resetT = 0.8;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy + 10, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, 140, 96, C.lamp);
      label('HI-SCORE ' + game.best, W / 2, 205, 38, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1870, 44, C.lamp);
      else label('TAP TO START', W / 2, 1870, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(0, 250, W, 330, C.ink, 0.55);
      label(won ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, 340, 100, won ? C.lamp : C.red);
      label('SCORE ' + score, W / 2, 420, 58, C.white);
      label('PERFECT ' + perfects, W / 2, 480, 40, C.white);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 545, 52, C.lamp);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 545, 42, C.white);
      if (!won) label('あと' + Math.max(1, NEEDED - steps) + '歩!', W / 2, 1180, 64, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1870, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { steps: steps, perfect: perfects, timeLeft: Math.max(0, Math.round(TIME_LIMIT - playT)) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (caughtT > 0) {
      // hit-stop: 目が向いた瞬間で止め、猫を白く光らせて拡大
      caughtT -= dt; caughtFlash = Math.max(0.2, caughtFlash - dt);
      if (caughtT <= 0) {
        var c = catPos();
        game.feedback.bad(c.x, c.y - 60, { text: 'MISS' });
        over = true; won = false; finish();
      }
    } else if (winT > 0) {
      winT -= dt;
      if (winT <= 0) { over = true; won = true; finish(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      stepRun(dt);
      if (playT >= TIME_LIMIT && caughtT <= 0 && winT <= 0) {
        over = true; won = false; timeUp = true;
        game.feedback.bad(catPos().x, catPos().y - 60, { text: 'TIME UP' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, 1000, 120, C.lamp);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    winT = 0; caughtT = 0;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(420, 1300), { color: i % 2 ? C.lamp : C.white, count: 20, speed: 440 });
  }

  // しのび足の小夜曲(オリジナル)
  var TUNE = [
    ['E4', 0.5], ['R', 0.5], ['G4', 0.5], ['R', 0.5], ['F#4', 0.5], ['R', 0.5], ['D4', 1],
    ['E4', 0.5], ['R', 0.5], ['B3', 0.5], ['R', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1],
  ];
  var TUNE_OPTS = { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['B2', 2], ['C3', 2], ['B2', 2]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);
