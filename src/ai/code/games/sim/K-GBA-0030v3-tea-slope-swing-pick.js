// K-GBA-0030v3-tea-slope-swing-pick.js
// 茶畑の跳ね摘み — 左右の畝に交互に新芽が出る跳ねる拍に乗り、左右の手を交互にタップして摘み取る
// 操作: 左右の畝を斜面の上から新芽が下りてくる。手元の摘み線に着いた瞬間、左の畝の芽は画面下の左半分、右の畝の芽は右半分をタップ。芽は必ず左右交互で、跳ねる8分(長・短)の拍に乗って来る。逆の手・摘み逃しはMISS(芽が落ちる)。芽のない所で押すとコンボが切れる
// 終わり: 6小節(導入1小節+摘み5小節・29芽)を摘み切ればCLEAR(PERFECT/GOOD/コンボ+残りかご)。芽を4つ落とすとGAME OVER
// @mechanic: alternate_tap
// @theme: tea_slope_swing_pick
// 世界観: 山の斜面に段々と続く茶畑で、茶摘みの娘が左右の畝のあいだを上りながら、跳ねる拍で交互に顔を出す新芽を左右の手で摘んで背中のかごへ入れる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・摘んだ芽の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: NEO-RETRO

(function(game) {
  var STYLE = { bg: ['#22303c', '#2f5a3a'], main: ['#5e9a4e', '#2f5a3a', '#f1e6c8'], accent: ['#d4ff3a', '#e8577a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた6色だけで完結。12pxの大きいドット。差し色は新芽の黄緑1色
  var C = { night: STYLE.bg[0], deep: STYLE.bg[1], bush: STYLE.main[0], cream: STYLE.main[2], shoot: STYLE.accent[0], pink: STYLE.accent[1] };
  var DOT = 12;

  var GAME_TITLE = 'TEA SWING';
  var BPM = 100, SPB = 60 / BPM, BAR = SPB * 4, SW = 2 / 3;   // 跳ねる8分: 裏は拍の2/3の位置
  var PERFECT_W = 0.05, GOOD_W = 0.09;
  var READY_T = 0.8;
  var BARS = 6;
  var TIME_LIMIT = 14.4;                     // 6小節
  var LIVES = 4;
  var LOOK = 1.8;                            // 芽が斜面の上に見えてから摘み線まで(秒)
  var VP_Y = Math.round(H * 0.245), HIT_Y = Math.round(H * 0.69), KP = 0.6;
  var PAD_Y = Math.round(H * 0.875);
  // 小節ごとの芽の位置(拍。.667 が跳ねる裏)。後半ほど裏が増える
  var CHART = [
    [],
    [0, 1, 2, 3],
    [0, 1, 1 + SW, 2, 3],
    [0, SW, 1, 2, 2 + SW, 3],
    [0, SW, 1, 1 + SW, 2, 3, 3 + SW],
    [0, SW, 1, 1 + SW, 2, 2 + SW, 3]
  ];
  // デモ: 導入2拍のあと跳ねる8分。7つ目だけ同じ手で押してMISS
  var DEMO_NOTES = [2, 2 + SW, 3, 3 + SW, 4, 4 + SW, 5, 6, 6 + SW, 7];
  var DEMO_WRONG_AT = 6, DEMO_CYC = 8 * SPB + 0.5;

  // 伴奏(オリジナル): 長・短の跳ねる旋律と、拍を刻むベース。小節頭で1小節ずつ鳴らして拍クロックに同期
  var L2 = SW, S1 = 1 - SW;
  var TUNE = [
    [['R', 4]],
    [['G4', L2], ['A4', S1], ['B4', L2], ['D5', S1], ['E5', 1], ['D5', L2], ['B4', S1]],
    [['A4', L2], ['B4', S1], ['D5', 1], ['B4', L2], ['A4', S1], ['G4', 1]],
    [['E5', L2], ['D5', S1], ['E5', L2], ['G5', S1], ['A5', 1], ['G5', L2], ['E5', S1]],
    [['D5', L2], ['E5', S1], ['D5', L2], ['B4', S1], ['A4', L2], ['B4', S1], ['D5', 1]],
    [['G5', L2], ['E5', S1], ['D5', L2], ['B4', S1], ['A4', 1], ['G4', 1]]
  ];
  var BASS = [
    [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]],
    [['G2', 1], ['D3', 1], ['E2', 1], ['B2', 1]],
    [['C3', 1], ['G2', 1], ['D3', 1], ['A2', 1]],
    [['E2', 1], ['B2', 1], ['C3', 1], ['G2', 1]],
    [['C3', 1], ['G2', 1], ['D3', 1], ['D3', 1]],
    [['G2', 1], ['D3', 1], ['G2', 2]]
  ];

  // ---- スプライト(大きいドット) ----
  // 茶摘みの娘: 立ち / 左を摘む / 右を摘む / 驚き
  var GIRL = [
    ['...pppp...', '..pppppp..', '..pcccc...', '..cnccnc..', '..cccccc..', '...cccc...', '..bbbbbb..', '.bbbccbbb.', 'cbbbccbbbc', '..bbccbb..', '..bbbbbb..', '..bb..bb..', '..nn..nn..'],
    ['...pppp...', '..pppppp..', '..pcccc...', '..cnccnc..', '..cccccc..', 'cc.cccc...', '.cbbbbbb..', '..bbccbbb.', '..bbccbbbc', '..bbccbb..', '..bbbbbb..', '..bb..bb..', '..nn..nn..'],
    ['...pppp...', '..pppppp..', '...cccc.p.', '..cnccnc..', '..cccccc..', '...cccc.cc', '..bbbbbbc.', '.bbbccbb..', 'cbbbccbb..', '..bbccbb..', '..bbbbbb..', '..bb..bb..', '..nn..nn..'],
    ['...pppp...', '..pppppp..', '..pcccc...', '..nccccn..', '..cnccnc..', '...cnnc...', '..bbbbbb..', 'c.bbccbb.c', '.bbbccbbb.', '..bbccbb..', '..bbbbbb..', '..bb..bb..', '..nn..nn..']
  ];
  var GPAL = { p: C.pink, c: C.cream, n: C.night, b: C.bush };
  var GPAL_HIT = { p: C.cream, c: C.cream, n: C.cream, b: C.cream };
  var SHOOT = [
    ['.s...s.', '.ss.ss.', '..sss..', '...s...', '...b...'],
    ['s.....s', '.ss.ss.', '..sss..', '...s...', '...b...']
  ];
  var HAND = ['..c.c.c..', '..c.c.c..', '.cc.c.c..', '.ccccccc.', '.ccccccc.', '..ccccc..', '..ccccc..'];
  var BASKET = ['cccccccc', 'c.c.c.cc', 'cc.c.c.c', 'c.c.c.cc', '.cccccc.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, notes, nBars, lastHalf, cuedBar, lives, score, combo, maxCombo, nP, nG, nM, picked, lastSide;
  var over, won, outroT, hitStop, demoMode, prevBest, pickT, pickSide, padFlash, missFx, halfShown, comboShown, drops;
  var beatPulse = 0;

  function snap(v) { return Math.round(v / DOT) * DOT; }

  function initRun(demo) {
    demoMode = !!demo;
    notes = [];
    var beatsList = [];
    if (demoMode) beatsList = DEMO_NOTES.slice();
    else for (var b = 0; b < CHART.length; b++) for (var i = 0; i < CHART[b].length; i++) beatsList.push(b * 4 + CHART[b][i]);
    for (var k = 0; k < beatsList.length; k++) {
      var bt = beatsList[k];
      notes.push({ t: bt * SPB, side: k % 2, swung: Math.abs(bt - Math.round(bt)) > 0.1, res: 0, dropT: 0 });
    }
    nBars = demoMode ? 2 : BARS;
    clock = -READY_T; lastHalf = -99; cuedBar = -1;
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nP = 0; nG = 0; nM = 0; picked = 0; lastSide = -1;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    pickT = 0; pickSide = 0; padFlash = [0, 0]; missFx = 0; halfShown = false; comboShown = false; drops = [];
  }
  function songEnd() { return demoMode ? 8 * SPB : BARS * BAR; }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function pick(side) {
    padFlash[side] = 0.14;
    if (over || clock < -0.1) return 'idle';
    var best = null, bd = 9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res) continue;
      var d = Math.abs(clock - n.t);
      if (d <= GOOD_W && d < bd) { bd = d; best = n; }
    }
    if (!best) {
      // 芽の無い所で押した(同じ手の続け打ちを含む): コンボだけ切れる
      combo = 0;
      game.feedback.bad(side ? W * 0.75 : W * 0.25, PAD_Y - 200, { text: null, shake: demoMode ? 1 : 3, volume: demoMode ? 0 : 0.2, flashColor: C.deep });
      lastSide = side;
      return 'empty';
    }
    lastSide = side;
    if (best.side !== side) { missNote(best, 'hand'); return 'wrong'; }
    var g = bd <= PERFECT_W ? 1 : 2;
    best.res = g;
    picked++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (g === 1) nP++; else nG++;
    score += Math.round((g === 1 ? 100 : 60) * (1 + Math.min(10, combo) * 0.1) * (best.swung ? 1.2 : 1));
    pickT = 0.16; pickSide = side;
    var hx = laneX(side, 1);
    game.feedback.good(hx, HIT_Y - 90, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.shoot : C.cream, size: g === 1 ? 48 : 40, count: g === 1 ? 12 : 7, volume: demoMode ? 0 : 0.16 });
    if (!demoMode && combo >= 2) game.audio.tone(side ? 784 : 587, 0.05, { wave: 'square', volume: 0.04 });
    if (!demoMode && !halfShown && picked >= Math.ceil(notes.length / 2)) {
      halfShown = true;
      game.fx.popup('NICE', W / 2, VP_Y + 120, { color: C.shoot, size: 80 });
      game.audio.play('se_milestone', 0.45);
    }
    if (!demoMode && !comboShown && combo >= 12) {
      comboShown = true;
      game.fx.popup('COMBO 12', W / 2, VP_Y + 220, { color: C.cream, size: 60 });
    }
    return 'hit';
  }

  function missNote(n, why) {
    n.res = 3;
    combo = 0; nM++; lives--; missFx = 0.35;
    drops.push({ x: laneX(n.side, 1), y: HIT_Y, vy: -300, t: 0.8 });
    var x = laneX(n.side, 1);
    if (lives <= 0 && !demoMode) {
      hitStop = 0.5;
      game.feedback.bad(x, HIT_Y - 90, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(x, HIT_Y - 90, { text: 'MISS', shake: demoMode ? 3 : 9, volume: demoMode ? 0 : 0.55 });
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(snap(120 + i * 170), HIT_Y - 260 + (i % 2) * 90, { color: i % 2 ? C.shoot : C.cream, count: 18, speed: 400 });
      game.fx.flash(C.shoot, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, picked: picked, total: notes.length, perfect: nP, good: nG, miss: nM, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック(1つ)。小節頭で伴奏、拍と跳ねる裏でハイハット ----
  function beatClock() {
    var nb = Math.floor((clock + 0.06) / BAR);
    if (!demoMode && nb > cuedBar && nb >= 0 && nb < nBars) {
      cuedBar = nb;
      game.audio.melody(TUNE[Math.min(TUNE.length - 1, nb)], { tempo: BPM, wave: 'square', volume: 0.045, bass: BASS[Math.min(BASS.length - 1, nb)], bassVolume: 0.09 });
    }
    // 拍(0)と跳ねる裏(2/3)の2点で刻む
    var bi = Math.floor(clock / SPB), ph = clock / SPB - bi;
    var hi = bi * 2 + (ph >= SW ? 1 : 0);
    if (hi !== lastHalf) {
      lastHalf = hi;
      if (clock >= 0 && clock < songEnd()) {
        if (hi % 2 === 0) beatPulse = 1;
        if (!demoMode) game.audio.tone(hi % 2 === 0 ? 1500 : 2100, 0.025, { wave: 'square', volume: hi % 2 === 0 ? 0.03 : 0.018 });
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    if (pickT > 0) pickT -= dt;
    if (missFx > 0) missFx -= dt;
    for (var p = 0; p < 2; p++) if (padFlash[p] > 0) padFlash[p] -= dt;
    for (var d = drops.length - 1; d >= 0; d--) {
      var dr = drops[d];
      dr.t -= dt; dr.vy += 1500 * dt; dr.y += dr.vy * dt;
      if (dr.t <= 0) drops.splice(d, 1);
    }
    beatClock();
    if (over) return;
    for (var i = 0; i < notes.length; i++) {
      if (!notes[i].res && clock > notes[i].t + GOOD_W) {
        missNote(notes[i], 'late');
        if (over) return;
      }
    }
    if (clock >= songEnd() || clock >= TIME_LIMIT + 0.3) finishRun(lives > 0);
  }

  // ---- 入力: 画面下の左右(押した瞬間に判定) ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || hitStop > 0) return;
    var side = x < W / 2 ? 0 : 1;
    var r = pick(side);
    // 摘む音: 左は低め・右は高め。空振りはこもった音
    game.audio.tone(r === 'hit' ? (side ? 1047 : 784) : 330, 0.05, { wave: r === 'hit' ? 'square' : 'triangle', volume: r === 'hit' ? 0.05 : 0.04 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.night, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 遠近: 時間の先(秒)→ 0(手元)〜1(斜面の上)
  function depth(z) { return z * (1 + KP) / (z + KP); }
  function rowY(f) { return HIT_Y - (HIT_Y - VP_Y) * f; }
  function laneX(side, near) {
    var t = near;                                // 1=手元 0=奥
    var cx = W / 2 - (60 + 210 * t);
    return side ? W - cx : cx;
  }
  function laneHalf(t) { return 14 + 108 * t; }

  function drawField() {
    var t = game.time.elapsed;
    game.draw.clear(C.night);
    game.draw.gradient(0, VP_Y + 40, [[0, C.night], [1, C.deep]]);
    // 朝日と山の稜線(段々の大きいドット)
    for (var sy = -4; sy <= 4; sy++) {
      var hw = Math.sqrt(16 - sy * sy) * DOT;
      game.draw.rect(snap(W * 0.78 - hw), 300 + sy * DOT, snap(hw * 2), DOT, C.cream);
    }
    for (var mx = 0; mx < W; mx += DOT * 3) {
      var mh = 60 + Math.abs(Math.sin(mx * 0.006) * 90) + Math.abs(Math.sin(mx * 0.017) * 30);
      game.draw.rect(mx, snap(VP_Y + 30 - mh), DOT * 3, snap(mh) + 12, C.deep);
    }
    // 斜面(畝の外側は濃い緑、間の道は夜色)
    game.draw.rect(0, VP_Y + 30, W, HIT_Y + 90 - VP_Y, C.deep);
    for (var y = VP_Y + 30; y < HIT_Y + 84; y += DOT) {
      var near = (y - VP_Y) / (HIT_Y - VP_Y);
      var f = 1 - near;
      var z = f * KP / (1 + KP - Math.min(1, f));
      var band = Math.floor((clock + z * LOOK) / (SPB / 2)) % 2 === 0;
      var lx = laneX(0, near), rx = laneX(1, near), hw2 = laneHalf(near);
      game.draw.rect(snap(lx + hw2), y, snap(rx - lx - hw2 * 2), DOT, C.night);
      game.draw.rect(snap(lx - hw2), y, snap(hw2 * 2), DOT, band ? C.bush : C.deep);
      game.draw.rect(snap(rx - hw2), y, snap(hw2 * 2), DOT, band ? C.bush : C.deep);
    }
    // 摘み線(手元)。拍でふくらむ
    for (var s = 0; s < 2; s++) {
      var hx = laneX(s, 1), w2 = laneHalf(1) + 20 + beatPulse * 12;
      game.draw.rect(snap(hx - w2), HIT_Y - 6, DOT * 2, DOT, C.cream);
      game.draw.rect(snap(hx + w2) - DOT * 2, HIT_Y - 6, DOT * 2, DOT, C.cream);
      game.draw.rect(snap(hx - w2), HIT_Y - 6 + DOT, DOT, DOT * 2, C.cream);
      game.draw.rect(snap(hx + w2) - DOT, HIT_Y - 6 + DOT, DOT, DOT * 2, C.cream);
    }
  }

  function drawShoots() {
    var t = game.time.elapsed;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res) continue;
      var ahead = n.t - clock;
      if (ahead > LOOK || ahead < -GOOD_W) continue;
      var f = depth(Math.max(0, ahead) / LOOK);
      var near = 1 - f;
      var x = laneX(n.side, near), y = rowY(f) - 10;
      var px = Math.max(3, Math.round(4 + 10 * near));
      var fr = Math.floor(t * 6 + i) % 2;
      // 手元が近い芽は白縁で明滅(押せる物)
      if (ahead < SPB * 0.5 && Math.floor(t * 14) % 2 === 0) game.draw.rect(snap(x - px * 5), snap(y - px * 3.5), snap(px * 10), snap(px * 7), C.cream);
      game.draw.sprite(SHOOT[fr], { s: C.shoot, b: C.bush }, x, y, px, { anchor: 'center' });
    }
    for (var d = 0; d < drops.length; d++) game.draw.sprite(SHOOT[0], { s: C.pink, b: C.pink }, drops[d].x, drops[d].y, 10, { anchor: 'center', flipY: true });
  }

  function drawGirl() {
    var fr = missFx > 0 ? 3 : (pickT > 0 ? 1 + pickSide : 0);
    var big = hitStop > 0;
    var y = HIT_Y - 70 - (pickT > 0 ? 0 : beatPulse * 10);
    if (big) game.draw.rect(W / 2 - 120, y - 140, 240, 280, C.cream);
    game.draw.sprite(GIRL[fr], big ? GPAL_HIT : GPAL, W / 2, y, big ? 16 : 13, { anchor: 'center' });
    game.draw.sprite(BASKET, { c: C.cream }, W / 2 + 70, y + 10, 8, { anchor: 'center' });
  }

  function drawSwingRow() {
    // いまの小節の拍(大)と跳ねる裏(小)。この小節の芽は左=桃・右=黄緑で灯る
    var y = snap(H * 0.755);
    var bar = Math.max(0, Math.floor(clock / BAR));
    var x0 = 120, span = W - 240;
    game.draw.rect(x0, y + 4, span, 4, C.deep);
    for (var b = 0; b < 4; b++) {
      for (var h = 0; h < 2; h++) {
        var pos = b + (h ? SW : 0), tt = bar * BAR + pos * SPB;
        var x = snap(x0 + pos / 4 * span);
        var note = null;
        for (var i = 0; i < notes.length; i++) if (Math.abs(notes[i].t - tt) < 0.02) note = notes[i];
        var sz = h ? DOT : DOT * 2;
        var col = note ? (note.res === 3 ? C.deep : (note.side ? C.shoot : C.pink)) : C.deep;
        if (note && (note.res === 1 || note.res === 2)) col = C.cream;
        game.draw.rect(x - sz / 2, y + 6 - sz / 2, sz, sz, col);
      }
    }
    if (clock >= 0 && clock < songEnd()) {
      var cx = snap(x0 + ((clock - bar * BAR) / SPB) / 4 * span);
      game.draw.rect(cx - 3, y - 24, 6, 60, C.cream);
    }
  }

  function drawPads() {
    for (var s = 0; s < 2; s++) {
      var cx = s ? W * 0.75 : W * 0.25;
      var fl = padFlash[s] > 0;
      var nextSide = -1;
      for (var i = 0; i < notes.length; i++) if (!notes[i].res) { nextSide = notes[i].side; break; }
      var on = nextSide === s && !over;
      game.draw.rect(snap(cx - 228), PAD_Y - 156, 456, 312, on ? (s ? C.shoot : C.pink) : C.deep);
      game.draw.rect(snap(cx - 216), PAD_Y - 144, 432, 288, fl ? C.cream : C.night);
      game.draw.sprite(HAND, { c: on ? (s ? C.shoot : C.pink) : C.bush }, cx, PAD_Y + (fl ? 12 : 0), 16, { anchor: 'center', flipX: s === 1 });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.night);
    game.draw.rect(0, 216, W, DOT, C.deep);
    label('SCORE ' + score, 48, 66, 40, C.cream, 'left');
    label(picked + ' / ' + notes.length, W / 2, 66, 40, C.shoot);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(SHOOT[0], { s: i < lives ? C.shoot : C.deep, b: i < lives ? C.bush : C.deep }, W - 66 - i * 72, 66, 8, { anchor: 'center' });
    var prog = Math.max(0, Math.min(1, clock / songEnd()));
    game.draw.rect(48, 150, W - 96, DOT, C.deep);
    game.draw.rect(48, 150, snap((W - 96) * prog), DOT, C.bush);
    if (combo >= 3) label('COMBO ' + combo, W - 48, 190, 32, C.pink, 'right');
  }

  function drawScene() {
    drawField();
    drawShoots();
    drawGirl();
    drawSwingRow();
    drawPads();
  }

  function drawResult(showTap) {
    var y0 = snap(H * 0.27), y1 = snap(H * 0.62);
    game.draw.rect(60, y0 - DOT, W - 120, y1 - y0 + DOT * 2, C.pink);
    game.draw.rect(72, y0, W - 144, y1 - y0, C.night);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 96, won ? C.shoot : C.pink);
    label('SCORE ' + score, W / 2, H * 0.385, 56, C.cream);
    label(picked + ' / ' + notes.length, W / 2, H * 0.43, 48, C.shoot);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.47, 32, C.cream);
    label('COMBO ' + maxCombo, W / 2, H * 0.505, 38, C.pink);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 54, C.shoot);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, C.bush);
    if (!won) label('あと' + Math.max(1, notes.length - picked - nM) + '芽!', W / 2, H * 0.59, 44, C.shoot);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.645, 34, C.cream);
  }

  // ---- ATTRACT: 実ロジックで跳ねる拍に乗って左右交互に摘む。7つ目だけ同じ手で押してMISS ----
  var demo = { t: 0, x: W * 0.25, y: PAD_Y, press: 0, gi: 0 };
  function demoReset() {
    initRun(true);
    clock = -0.3; demo.gi = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    if (demo.press > 0) demo.press -= dt;
    var tx = demo.x;
    if (demo.gi < notes.length) {
      var n = notes[demo.gi];
      var side = demo.gi === DEMO_WRONG_AT ? 1 - n.side : n.side;
      if (n.t - clock < 0.17) tx = side ? W * 0.75 : W * 0.25;
      if (clock >= n.t) {
        if (!n.res) pick(side);
        demo.gi++; demo.press = 0.1;
      }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 22);
    demo.y = PAD_Y + 20;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!notes) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 228, C.night);
      game.draw.rect(0, 216, W, DOT, C.deep);
      label(GAME_TITLE, W / 2, 86, 88 + Math.sin(t * 3) * 3, C.shoot);
      label('HI-SCORE ' + game.best, W / 2, 176, 36, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.35, 52, C.pink);
      else label('TAP TO START', W / 2, H * 0.35, 46, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.46, W, 150, C.night);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.shoot);
    }
    // 開始時お手本: 最初の芽が摘み線に着く直前、左の手パッドに薄い手を出す
    if (!over && clock > notes[0].t - SPB && clock < notes[0].t + 0.15) {
      game.draw.hand(W * 0.25, PAD_Y + 20, { press: clock >= notes[0].t - 0.05, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
