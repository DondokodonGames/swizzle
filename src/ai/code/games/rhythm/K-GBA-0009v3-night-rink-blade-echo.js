// K-GBA-0009v3-night-rink-blade-echo.js
// 夜のリンク 刃あと返し — 先輩が一小節で氷に刻んだ左右の刃あとの順と拍を覚え、次の小節で同じ拍に滑り返す
// 操作: 先輩の小節(上の列)は見て聞くだけで入力は効かない。自分の小節(下の列)になったら、覚えた順に左足=画面左半分/右足=画面右半分を、刻まれたのと同じ拍(8分)でタップ。足違い・拍ずれ・余計な一歩はMISS
// 終わり: 4ラウンド(お手本1小節→返し1小節 x4)を返し切ればCLEAR(PERFECT/GOOD/コンボ+きれいに返したラウンド+残り命)。MISS3回でGAME OVER
// @mechanic: memory_sequence
// @theme: night_rink_blade_echo
// 世界観: 冬の夜の屋外スケートリンクで、ペア演技の新人が、先輩が一小節で氷に刻んでみせた左右の刃あとの順を覚え、次の小節で同じ拍のまま滑り返して息を合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・きれいに返せたラウンド数・最大コンボ
// スタイル: NEO-RETRO

(function(game) {
  var STYLE = { bg: ['#1d2140', '#2c3366'], main: ['#e4ecff', '#8f9fd6', '#5560a8'], accent: ['#ff4f7b', '#ffd1dc'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた6色だけで完結。大きいドット(12px)、差し色はピンク1色(=自分の足あと)
  var C = {
    navy: STYLE.bg[0], deep: STYLE.bg[1], ice: STYLE.main[0], frost: STYLE.main[1], mid: STYLE.main[2],
    pink: STYLE.accent[0], pale: STYLE.accent[1]
  };

  var GAME_TITLE = 'BLADE ECHO';
  var HUD_H = Math.round(H * 0.12);
  var BPM = 112, SPB = 60 / BPM, EIGHTH = SPB / 2, BAR = SPB * 4;
  var PERFECT_W = 0.06, GOOD_W = 0.12;
  var READY_T = 0.8;
  var TIME_LIMIT = 17.2;
  var LIVES = 3;
  var LANE_X0 = 170, SLOT_DX = 106;
  var CALL_Y = 650, RESP_Y = 1110, PAD_Y = Math.round(H * 0.86);
  var DEMO_CYC = 5.0;
  // ラウンドごとのお手本: [8分のコマ, 足(0=左 1=右)]。後半は8分の連打と休みが入る
  var ROUNDS = [
    [[0, 0], [2, 1], [4, 0], [6, 1]],
    [[0, 0], [2, 0], [4, 1]],
    [[0, 0], [2, 1], [3, 1], [6, 0]],
    [[0, 1], [1, 0], [4, 1], [5, 0], [6, 1]]
  ];

  // 伴奏(オリジナル): お手本の小節は分散和音、返しの小節は白玉で隙間を空ける。ベースが拍を刻む
  var CALL_TUNE = [
    [['C4', 1], ['E4', 1], ['G4', 1], ['E4', 1]], [['A3', 1], ['C4', 1], ['E4', 1], ['C4', 1]],
    [['F3', 1], ['A3', 1], ['C4', 1], ['A3', 1]], [['G3', 1], ['B3', 1], ['D4', 1], ['B3', 1]]
  ];
  var CALL_BASS = [
    [['C3', 2], ['G2', 2]], [['A2', 2], ['E2', 2]], [['F2', 2], ['C3', 2]], [['G2', 2], ['D3', 2]]
  ];
  var RESP_TUNE = [
    [['C4', 2], ['G3', 2]], [['A3', 2], ['E4', 2]], [['F3', 2], ['C4', 2]], [['G3', 2], ['C4', 2]]
  ];
  var RESP_BASS = [
    [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1]], [['A2', 1], ['A2', 1], ['E2', 1], ['E2', 1]],
    [['F2', 1], ['F2', 1], ['C3', 1], ['C3', 1]], [['G2', 1], ['G2', 1], ['C3', 1], ['C3', 1]]
  ];
  var FOOT_NOTE = ['E5', 'A5'];

  // ---- スプライト(大きいドット) ----
  // 先輩: 左で蹴る / 右で蹴る / 見守る
  var SENIOR = [
    ['...dd.....', '..dffd....', '..dffd....', '...mmmm...', '..cccccc..', '.c.cccc.c.', 'c..cccc..c', '...cccc...', '...c..c...', '..c....c..', '.c.....c..', 'ww....ww..'],
    ['.....dd...', '....dffd..', '....dffd..', '...mmmm...', '..cccccc..', '.c.cccc.c.', 'c..cccc..c', '...cccc...', '...c..c...', '..c....c..', '..c.....c.', '..ww....ww'],
    ['...dd.....', '..dffd....', '..dffd....', '..mmmm....', '..cccc....', '.cccccc...', 'c.cccc.c..', '..cccc....', '..c..c....', '..c..c....', '..c..c....', '.ww..ww...']
  ];
  var SENPAL = { d: '#1d2140', f: '#ffd1dc', m: '#8f9fd6', c: '#5560a8', w: '#1d2140' };
  // 新人(ピンクのマフラー=自分): 左 / 右 / 待ち
  var JUNIOR = [
    ['...dd.....', '..dffd....', '..dffd....', '...pppp...', '..iiiiii..', '.i.iiii.i.', 'i..iiii..i', '...iiii...', '...i..i...', '..i....i..', '.i.....i..', 'ww....ww..'],
    ['.....dd...', '....dffd..', '....dffd..', '...pppp...', '..iiiiii..', '.i.iiii.i.', 'i..iiii..i', '...iiii...', '...i..i...', '..i....i..', '..i.....i.', '..ww....ww'],
    ['...dd.....', '..dffd....', '..dffd....', '..pppp....', '..iiii....', '.iiiiii...', 'i.iiii.i..', '..iiii....', '..i..i....', '..i..i....', '..i..i....', '.ww..ww...']
  ];
  var JUNPAL = { d: '#1d2140', f: '#ffd1dc', p: '#ff4f7b', i: '#2c3366', w: '#5560a8' };
  var WHITE = { d: '#ffffff', f: '#ffffff', p: '#ffffff', i: '#ffffff', w: '#ffffff', m: '#ffffff', c: '#ffffff' };
  var BOOT = ['..###...', '..###...', '..####..', '..#####.', '.#######', '########', 'w......w', 'wwwwwwww'];
  // 氷の刃あと(左足は上、右足は下にずれる)
  var MARK = ['.####.', '######', '.####.'];
  var PINE = ['....#....', '...###...', '..#####..', '...###...', '.#######.', '..#####..', '#########', '....#....'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, lives, score, combo, maxCombo, nPerfect, nGood, nMiss, roundRes, roundDirty, marks;
  var hitStop, over, won, outroT, cuedBar, lastBeat, padFlash, seniorStep, juniorStep, demoMode, prevBest, failX, failY, lockShake;
  var beatPulse = 0;

  function buildEvents(demo) {
    var list = [];
    for (var r = 0; r < ROUNDS.length; r++) {
      var flip = (!demo && game.random(0, 1) < 0.5) ? 1 : 0;
      for (var i = 0; i < ROUNDS[r].length; i++) {
        var sl = ROUNDS[r][i][0];
        list.push({ r: r, slot: sl, foot: ROUNDS[r][i][1] ^ flip, callT: 2 * r * BAR + sl * EIGHTH, respT: (2 * r + 1) * BAR + sl * EIGHTH, shown: false, res: 0 });
      }
    }
    return list;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; evs = buildEvents(demo);
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0;
    roundRes = [0, 0, 0, 0]; roundDirty = [false, false, false, false]; marks = [];
    hitStop = 0; over = false; won = false; outroT = 0; cuedBar = -1; lastBeat = -99;
    padFlash = [0, 0]; seniorStep = 2; juniorStep = 2; prevBest = game.best; failX = -999; failY = -999; lockShake = 0;
  }

  function slotX(sl) { return LANE_X0 + sl * SLOT_DX; }
  function barOf(t) { return Math.floor(t / BAR); }

  // ---- 判定 ----
  function checkRound(r) {
    if (r < 0 || r >= ROUNDS.length || roundRes[r]) return;
    for (var i = 0; i < evs.length; i++) if (evs[i].r === r && !evs[i].res) return;
    roundRes[r] = roundDirty[r] ? 2 : 1;
    if (roundRes[r] === 1) {
      score += 300;
      if (!demoMode) {
        game.fx.popup('NICE', W / 2, RESP_Y - 190, { color: C.pink, size: 76 });
        game.audio.play('se_milestone', 0.45);
      }
    }
  }

  function hitEvent(e, grade, x) {
    e.res = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += Math.round((grade === 1 ? 100 : 60) * (1 + Math.min(8, combo) * 0.15));
    marks.push({ x: x, foot: e.foot, ok: true, r: e.r });
    juniorStep = e.foot;
    var y = RESP_Y + (e.foot ? 46 : -46);
    game.feedback.good(x, y - 70, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.pink : C.pale, size: grade === 1 ? 48 : 40, count: grade === 1 ? 14 : 8, volume: demoMode ? 0.04 : 0.2 });
    if (!demoMode && combo >= 2) game.audio.tone(523 * Math.pow(2, Math.min(12, combo) / 12), 0.05, { wave: 'triangle', volume: 0.05 });
    checkRound(e.r);
  }

  function missEvent(e, x, y) {
    if (e) { e.res = 3; roundDirty[e.r] = true; }
    combo = 0; nMiss++; lives--;
    failX = x; failY = y;
    if (lives <= 0 && !demoMode) {
      hitStop = 0.45;
      game.feedback.bad(x, y, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(x, y, { text: 'MISS', shake: demoMode ? 4 : 9, volume: demoMode ? 0.04 : 0.6 });
    }
    if (e) checkRound(e.r);
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, RESP_Y - 120 + (i % 2) * 80, { color: i % 2 ? C.pink : C.ice, count: 18, speed: 420 });
      game.fx.flash(C.pale, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var clean = 0;
    for (var r = 0; r < roundRes.length; r++) if (roundRes[r] === 1) clean++;
    var stats = { score: score, perfect: nPerfect, good: nGood, miss: nMiss, cleanRounds: clean, maxCombo: maxCombo, lives: Math.max(0, lives) };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 左右の一歩を受け取る(本番の指もATTRACTのゴーストも同じ関数)
  function stepFoot(foot) {
    padFlash[foot] = 0.18;
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      var d = Math.abs(clock - e.respT);
      if (d <= GOOD_W && d < bd) { bd = d; best = e; }
    }
    var bar = barOf(clock);
    var x = slotX((clock - (bar % 2 ? bar : bar - 1) * BAR) / EIGHTH);
    if (best) {
      x = slotX((clock - (2 * best.r + 1) * BAR) / EIGHTH);
      if (best.foot === foot) hitEvent(best, bd <= PERFECT_W ? 1 : 2, x);
      else {
        marks.push({ x: x, foot: foot, ok: false, r: best.r });
        missEvent(best, x, RESP_Y + (foot ? 46 : -46));
      }
      return 'judged';
    }
    if (clock >= 0 && bar % 2 === 1 && bar < 8) {
      // お手本に無い拍で踏んだ(余計な一歩)
      var rr = (bar - 1) / 2;
      roundDirty[rr] = true;
      marks.push({ x: x, foot: foot, ok: false, r: rr });
      missEvent(null, x, RESP_Y + (foot ? 46 : -46));
      return 'extra';
    }
    lockShake = 0.2;
    return 'locked';
  }

  // 拍クロック: 小節頭に伴奏を出し、毎拍チック。お手本の刃あとは拍クロックで鳴る
  function beatClock() {
    var nb = Math.floor((clock + 0.06) / BAR);
    if (!demoMode && nb > cuedBar && nb >= 0 && nb < 8) {
      cuedBar = nb;
      var r = Math.floor(nb / 2);
      if (nb % 2 === 0) game.audio.melody(CALL_TUNE[r], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: CALL_BASS[r], bassVolume: 0.08 });
      else game.audio.melody(RESP_TUNE[r], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: RESP_BASS[r], bassVolume: 0.08 });
    }
    var bi = Math.floor(clock / SPB);
    if (bi !== lastBeat) {
      lastBeat = bi;
      if (clock >= 0 && clock < 8 * BAR) {
        beatPulse = 1;
        var inBar = ((bi % 4) + 4) % 4;
        if (!demoMode) game.audio.tone(inBar === 0 ? 1100 : 1700, 0.025, { wave: 'square', volume: 0.025 });
        // お手本の小節の4拍目: 次は自分の番(パッドが点滅+上がる2音)
        if (inBar === 3 && barOf(clock) % 2 === 0 && !demoMode) {
          game.audio.tone(660, 0.05, { wave: 'square', volume: 0.05 });
          game.audio.tone(990, 0.06, { wave: 'square', volume: 0.05, slide: 120 });
        }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    for (var p = 0; p < 2; p++) if (padFlash[p] > 0) padFlash[p] -= dt;
    if (lockShake > 0) lockShake -= dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      // お手本: 先輩が拍どおりに刻む
      if (!e.shown && clock >= e.callT) {
        e.shown = true; seniorStep = e.foot;
        if (!demoMode) game.audio.tone(FOOT_NOTE[e.foot], 0.09, { wave: 'square', volume: 0.08 });
      }
      // 返しの窓を過ぎても踏まれなかった
      if (!e.res && clock > e.respT + GOOD_W) {
        missEvent(e, slotX(e.slot), RESP_Y + (e.foot ? 46 : -46));
        if (over) return;
      }
    }
    if (!over && clock >= 8 * BAR + GOOD_W) finishRun(lives > 0);
    if (!over && clock > TIME_LIMIT + 0.5) finishRun(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
    if (state === S.PLAYING && over) game.fx.burst(x, y, { color: C.frost, count: 3, speed: 80 });
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    var foot = x < W / 2 ? 0 : 1;
    // 足ごとの音程で即座に鳴らす(左=低 / 右=高)
    game.audio.tone(FOOT_NOTE[foot], 0.08, { wave: 'square', volume: 0.07 });
    var r = stepFoot(foot);
    if (r === 'locked') {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(foot ? 790 : 290, PAD_Y, { color: C.mid, count: 4, speed: 90 });
    }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.navy, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ring(x, y, r, col, w) {
    var n = 24, lx = x + r, ly = y;
    for (var i = 1; i <= n; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      game.draw.line(lx, ly, nx, ny, col, w);
      lx = nx; ly = ny;
    }
  }
  function roundRect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  function phase() {
    var bar = barOf(clock);
    if (clock < 0) return { bar: -1, resp: false, inBar: 0, r: 0 };
    return { bar: bar, resp: bar % 2 === 1, inBar: clock - bar * BAR, r: Math.min(ROUNDS.length - 1, Math.floor(bar / 2)) };
  }

  function drawRink() {
    var t = game.time.elapsed;
    game.draw.clear(C.navy);
    game.draw.gradient(0, 560, [[0, C.navy], [1, C.deep]]);
    for (var s = 0; s < 14; s++) {
      var on = Math.floor(t * 2 + s * 1.7) % 4 !== 0;
      game.draw.rect((s * 157) % W, HUD_H + 90 + (s * 53) % 120, 6, 6, C.frost, on ? 0.9 : 0.3);
    }
    for (var p = 0; p < 7; p++) game.draw.sprite(PINE, { '#': C.mid }, 60 + p * 160, 470 + (p % 2) * 14, 12, { anchor: 'center' });
    // 電球の飾り紐: 拍で明滅(1拍目はピンク)
    game.draw.line(0, 400, W / 2, 440, C.mid, 4); game.draw.line(W / 2, 440, W, 400, C.mid, 4);
    var ph = phase(), down = ph.bar >= 0 && Math.floor(ph.inBar / SPB) === 0;
    for (var b = 0; b < 11; b++) {
      var bx = 48 + b * 98, byy = 402 + Math.sin(b / 10 * Math.PI) * 38;
      var lit = (b % 2 === 0) === (lastBeat % 2 === 0);
      game.draw.circle(bx, byy + 14, 12 + (lit ? beatPulse * 6 : 0), lit ? (down ? C.pink : C.ice) : C.mid);
    }
    // リンク(板塀+氷)
    roundRect(30, 520, W - 60, 1000, 60, C.mid);
    roundRect(54, 544, W - 108, 952, 48, C.ice);
    for (var k = 0; k < 6; k++) game.draw.rect(120 + k * 150, 600 + (k * 137) % 820, 180, 6, C.frost, 0.35);
    game.draw.rect(54, 880, W - 108, 10, C.frost, 0.6);
    game.draw.circle(W / 2, 885, 70, C.frost, 0.25);
  }

  function drawLane(y, active, cursorX, col) {
    for (var sl = 0; sl < 8; sl++) {
      var x = slotX(sl), big = sl % 2 === 0;
      game.draw.rect(x - 3, y - (big ? 70 : 40), 6, big ? 140 : 80, active ? col : C.frost, active ? 0.55 : 0.35);
    }
    if (active && cursorX !== null) game.draw.rect(cursorX - 5, y - 92, 10, 184, col);
  }

  function drawMarks() {
    var ph = phase(), i, e;
    // お手本の刃あと(上の列): 返しの小節に入ると霜で消える
    for (i = 0; i < evs.length; i++) {
      e = evs[i];
      if (!e.shown || e.r !== ph.r) continue;
      var a = 1;
      if (ph.resp) a = Math.max(0, 1 - ph.inBar / 0.25);
      if (a > 0) game.draw.sprite(MARK, { '#': C.mid }, slotX(e.slot), CALL_Y + (e.foot ? 46 : -46), 14, { anchor: 'center', alpha: a });
    }
    // 返しの列: 自分の刃あと(ピンク=合っている / 灰=違う)と、取りこぼした正解(赤い輪で答え合わせ)
    for (i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.r !== ph.r) continue;
      game.draw.sprite(MARK, { '#': m.ok ? C.pink : C.mid }, m.x, RESP_Y + (m.foot ? 46 : -46), 14, { anchor: 'center' });
    }
    for (i = 0; i < evs.length; i++) {
      e = evs[i];
      if (e.r === ph.r && e.res === 3) ring(slotX(e.slot), RESP_Y + (e.foot ? 46 : -46), 46, C.pink, 5);
    }
  }

  function drawSkaters() {
    var ph = phase();
    var bob = beatPulse * 8;
    // 先輩: お手本の小節は上の列を滑る。返しの小節は右端で見守る
    var sx = ph.bar >= 0 && !ph.resp ? slotX(ph.inBar / EIGHTH) : 980;
    var sFr = ph.bar >= 0 && !ph.resp ? seniorStep : 2;
    game.draw.sprite(SENIOR[sFr], SENPAL, sx, CALL_Y - 150 - bob, 14, { anchor: 'center', flipX: ph.resp });
    // 新人: 返しの小節は下の列を滑る。お手本の間は左端で待つ
    var jx = ph.resp ? slotX(ph.inBar / EIGHTH) : 92;
    var big = hitStop > 0;
    if (big) game.draw.circle(jx, RESP_Y - 150, 120, '#ffffff', 0.5);
    game.draw.sprite(JUNIOR[ph.resp ? juniorStep : 2], big ? WHITE : JUNPAL, jx, RESP_Y - 150 - bob, big ? 17 : 14, { anchor: 'center' });
    if (big && failX > -900) ring(failX, failY, 60 + (0.45 - hitStop) * 140, '#ffffff', 8);
  }

  function drawPads() {
    var ph = phase();
    var t = game.time.elapsed;
    var handoff = ph.bar >= 0 && !ph.resp && ph.inBar >= 3 * SPB && ph.bar < 7;
    var live = ph.resp || handoff;
    var blink = handoff && Math.floor(t * 10) % 2 === 0;
    for (var f = 0; f < 2; f++) {
      var x0 = f ? 560 : 60, cx = f ? 790 : 290;
      var shakeX = lockShake > 0 ? Math.sin(t * 80) * 8 : 0;
      roundRect(x0 + shakeX, PAD_Y - 150, 460, 300, 40, live ? (blink ? C.pale : C.pink) : C.deep);
      roundRect(x0 + 14 + shakeX, PAD_Y - 136, 432, 272, 30, padFlash[f] > 0 ? C.ice : C.navy);
      game.draw.sprite(BOOT, { '#': live ? C.pink : C.mid, w: C.ice }, cx + shakeX, PAD_Y + (padFlash[f] > 0 ? 10 : 0), 18, { anchor: 'center', flipX: f === 0 });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, HUD_H, C.navy);
    game.draw.rect(0, HUD_H - 10, W, 10, C.mid);
    label('SCORE ' + score, 50, 66, 40, C.ice, 'left');
    var ph = phase();
    label((ph.bar >= 0 ? ph.r + 1 : 1) + ' / ' + ROUNDS.length, W / 2, 66, 40, C.pink);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BOOT, { '#': i < lives ? C.pink : C.deep, w: i < lives ? C.ice : C.deep }, W - 70 - i * 90, 66, 7, { anchor: 'center' });
    // 進捗: 4ラウンドの丸(きれいに返す=ピンク / ミスあり=灰)と小節バー
    for (var r = 0; r < ROUNDS.length; r++) {
      var col = roundRes[r] === 1 ? C.pink : (roundRes[r] === 2 ? C.frost : C.deep);
      game.draw.circle(W / 2 - 150 + r * 100, 150, 22, C.mid);
      game.draw.circle(W / 2 - 150 + r * 100, 150, 16, col);
    }
    var progress = Math.max(0, Math.min(1, clock / (8 * BAR)));
    game.draw.rect(50, 196, W - 100, 12, C.deep);
    game.draw.rect(50, 196, (W - 100) * progress, 12, C.frost);
    if (combo >= 2) label('COMBO x' + combo, W - 50, 150, 30, C.pale, 'right');
  }

  function drawScene() {
    var ph = phase();
    drawRink();
    drawLane(CALL_Y, ph.bar >= 0 && !ph.resp, ph.bar >= 0 && !ph.resp ? slotX(ph.inBar / EIGHTH) : null, C.mid);
    drawLane(RESP_Y, ph.resp, ph.resp ? slotX(ph.inBar / EIGHTH) : null, C.pink);
    drawMarks();
    drawSkaters();
    drawPads();
  }

  function drawResult(showTap) {
    var clean = 0;
    for (var r = 0; r < roundRes.length; r++) if (roundRes[r] === 1) clean++;
    roundRect(40, H * 0.30, W - 80, H * 0.31, 40, C.navy);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.345, 96, won ? C.pink : C.frost);
    label('SCORE ' + score, W / 2, H * 0.41, 56, C.ice);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.455, 34, C.pale);
    label('NICE ' + clean + ' / ' + ROUNDS.length, W / 2, H * 0.495, 36, C.pink);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 52, C.pink);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, C.frost);
    if (!won) {
      var left = 0;
      for (var i = 0; i < evs.length; i++) if (evs[i].res === 0 || evs[i].res === 3) left++;
      label('あと' + Math.max(1, left) + '歩!', W / 2, H * 0.58, 44, C.pink);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.625, 36, C.ice);
  }

  // ---- ATTRACT: 実ロジックで1ラウンド。先輩の4歩を見て、3歩は同じ拍で返し、最後の1歩だけ足を間違えてMISS ----
  var demo = { t: 0, x: W / 2, y: PAD_Y, press: false, gi: 0, pressT: 0 };
  function demoReset() {
    initRun(true);
    clock = -0.3; demo.gi = 0; demo.pressT = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var tx = W / 2, ty = PAD_Y + 40;
    if (demo.gi < ROUNDS[0].length) {
      var e = evs[demo.gi];
      var foot = demo.gi === ROUNDS[0].length - 1 ? 1 - e.foot : e.foot;
      if (clock > e.respT - SPB * 1.2) tx = foot ? 790 : 290;
      if (clock >= e.respT) { stepFoot(foot); demo.gi++; demo.pressT = 0.16; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 12);
    demo.y += (ty - demo.y) * Math.min(1, dt * 12);
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, HUD_H, C.navy);
      game.draw.rect(0, HUD_H - 10, W, 10, C.mid);
      label(GAME_TITLE, W / 2, 86, 86 + Math.sin(t * 3) * 3, C.pink);
      label('HI-SCORE ' + game.best, W / 2, 176, 36, C.ice);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.74, 52, C.pink);
      else label('TAP TO START', W / 2, H * 0.74, 46, C.ice);
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
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.46, W, 150, C.navy, 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.pink);
    }
    // 開始時お手本: 最初の返しの小節に入る直前、踏むべき側のパッドに手を1回出す
    if (!over && clock > BAR - SPB && clock < BAR + 0.2) {
      var fe = evs[0];
      game.draw.hand(fe.foot ? 790 : 290, PAD_Y + 30, { press: clock >= BAR - 0.05, scale: 13, alpha: 0.8 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
