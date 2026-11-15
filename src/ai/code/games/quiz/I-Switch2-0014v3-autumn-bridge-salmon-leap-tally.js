// I-Switch2-0014v3-autumn-bridge-salmon-leap-tally.js
// 鮭跳ね数え — 秋の川の観察橋から、左右の岸で遡上する鮭が跳ねた数を見逃さず数え、合計を答える
// 操作: 見ている間は触らない。左岸と右岸で鮭が跳ねる(同時に両岸で跳ねることもある)。背びれだけ出す波紋は跳ねではないので数えない。観察が終わると下に4つの数字が出るので、合計と思う数字をタップする(3秒で答えないとMISS)
// 終わり: 3回の観察のうち2回以上正解すればCLEAR(正解の早さと難しさで得点)。2回間違えるとGAME OVER
// @mechanic: counting
// @theme: autumn_bridge_salmon_leap_tally
// 世界観: 秋の川にかかる観察橋で、自然観察員が左右の岸を行き来する目で遡上する鮭の跳ねた数を数え、両岸の合計を観察記録に書き込む
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・正解数・最大同時跳ね・答えた秒数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面はベタ塗り(横ストリップ)、輪郭は line、遠くはフォグで薄く。頂点は少し震える
  var STYLE = { bg: ['#c8d8e8', '#6a8aa8', '#2a4a6a'], main: ['#d86a3a', '#e8a848', '#4a7a4a'], accent: ['#ffffff', '#f0e0c0'] };
  var C = {
    fog: STYLE.bg[0], sky: STYLE.bg[1], river: STYLE.bg[2], leaf: STYLE.main[0], leaf2: STYLE.main[1], pine: STYLE.main[2],
    white: STYLE.accent[0], cream: STYLE.accent[1], ink: '#182030', salmon: '#c85a6a', salmon2: '#e8a0a8', bad: '#ff4a5a', ok: '#6ae08a', board: '#5a4030',
  };

  var GAME_TITLE = 'SALMON TALLY';
  var ROUNDS = 3;
  var ANSWER_T = 3;
  var WATER_TOP = 560, WATER_BOT = Math.round(H * 0.7);
  var LEFT = [170, 400], RIGHT = [680, 910];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, phase, phaseT, plan, leaps, ripples, total, maxSimul, choices, answer, correct, wrong, score, readyT, stopT, over, won, outroT, milestone, prevBest, pickFlash, answerLeft;

  var ROUND_CFG = [
    { watch: 4.0, min: 5, max: 7, simul: 1, fins: 2 },
    { watch: 5.0, min: 8, max: 11, simul: 3, fins: 3 },
    { watch: 6.0, min: 11, max: 14, simul: 4, fins: 4 },
  ];

  function makePlan(cfg) {
    var ev = [], n = Math.floor(game.random(cfg.min, cfg.max + 1)), simul = cfg.simul, t = 0.6;
    var i = 0;
    while (i < n) {
      var pair = simul > 0 && i < n - 1 && game.random(0, 1) < 0.45;
      var side = game.random(0, 1) < 0.5 ? 0 : 1;
      ev.push({ t: t, side: side, kind: 'leap' });
      i++;
      if (pair) { ev.push({ t: t + game.random(0, 0.12), side: 1 - side, kind: 'leap' }); i++; simul--; }
      t += game.random(0.35, 0.6);
    }
    for (var f = 0; f < cfg.fins; f++) ev.push({ t: game.random(0.5, cfg.watch - 0.8), side: game.random(0, 1) < 0.5 ? 0 : 1, kind: 'fin' });
    ev.sort(function(a, b) { return a.t - b.t; });
    // 全体を watch 時間に収める
    var last = ev[ev.length - 1].t;
    if (last > cfg.watch - 0.9) for (var k = 0; k < ev.length; k++) ev[k].t *= (cfg.watch - 0.9) / last;
    return { ev: ev, n: n };
  }

  function startRound() {
    var cfg = ROUND_CFG[round];
    plan = makePlan(cfg); leaps = []; ripples = []; total = plan.n; phase = 'watch'; phaseT = 0; answer = null; pickFlash = 0; answerLeft = ANSWER_T;
    // 4択: 正解 ± (1..3) を混ぜる
    var set = [total];
    while (set.length < 4) { var c = total + (game.random(0, 1) < 0.5 ? -1 : 1) * Math.floor(game.random(1, 4)); if (c > 0 && set.indexOf(c) < 0) set.push(c); }
    for (var s = set.length - 1; s > 0; s--) { var j = Math.floor(game.random(0, s + 1)); var tmp = set[s]; set[s] = set[j]; set[j] = tmp; }
    choices = set;
  }
  function initGame() {
    round = 0; correct = 0; wrong = 0; score = 0; readyT = 0.8; stopT = 0; over = false; won = false; outroT = 0; milestone = false; prevBest = game.best; maxSimul = 0;
    startRound();
  }

  function spawnEvent(e) {
    var xs = e.side === 0 ? LEFT : RIGHT;
    var x = game.random(xs[0], xs[1]), y = game.random(WATER_TOP + 60, WATER_BOT - 40);
    if (e.kind === 'leap') {
      leaps.push({ x: x, y: y, t: 0, side: e.side, flip: e.side === 1 });
      game.audio.tone(e.side === 0 ? 520 : 660, 0.08, { wave: 'triangle', volume: 0.06, slide: 200 });
      game.fx.burst(x, y, { color: C.white, count: 6, speed: 180 });
    } else {
      ripples.push({ x: x, y: y, t: 0 });
      game.audio.tone(240, 0.05, { wave: 'sine', volume: 0.03 });
    }
  }

  function stepWatch(dt) {
    var cfg = ROUND_CFG[round];
    var prev = phaseT; phaseT += dt;
    var simulNow = 0;
    for (var i = 0; i < plan.ev.length; i++) { var e = plan.ev[i]; if (e.t > prev && e.t <= phaseT) spawnEvent(e); }
    for (var l = leaps.length - 1; l >= 0; l--) { leaps[l].t += dt; if (leaps[l].t < 0.6) simulNow++; if (leaps[l].t > 0.9) leaps.splice(l, 1); }
    maxSimul = Math.max(maxSimul, simulNow);
    for (var r = ripples.length - 1; r >= 0; r--) { ripples[r].t += dt; if (ripples[r].t > 1.0) ripples.splice(r, 1); }
    if (phaseT >= cfg.watch) { phase = 'answer'; phaseT = 0; answerLeft = ANSWER_T; game.audio.play('se_powerup', 0.3); }
  }

  function pick(idx, demo) {
    if (phase !== 'answer' || answer !== null) return;
    answer = idx; pickFlash = 0.6; phase = 'show'; phaseT = 0;
    var ok = choices[idx] === total;
    if (ok) {
      correct++;
      var pts = 300 + Math.round(answerLeft * 50) + round * 100;
      if (!demo) score += pts;
      game.feedback.good(W / 2, H * 0.6, { text: 'PERFECT', color: C.leaf2, size: 64, sound: 'se_coin', volume: 0.4, count: 20 });
      game.fx.popup('+' + pts, W / 2, H * 0.52, { color: C.cream, size: 56 });
      if (!demo && !milestone && correct >= 2) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup(correct + ' / ' + ROUNDS, W / 2, H * 0.3, { color: C.leaf2, size: 80 }); }
    } else {
      wrong++; stopT = 0.45;
      game.feedback.bad(W / 2, H * 0.6, { text: 'MISS', shake: demo ? 4 : 10 });
      game.audio.play('se_bad', 0.4);
    }
  }

  function timeoutAnswer(demo) {
    answer = -1; phase = 'show'; phaseT = 0; wrong++; stopT = 0.3;
    game.feedback.bad(W / 2, H * 0.6, { text: 'MISS', shake: demo ? 3 : 6 });
    game.audio.play('se_bad', 0.4);
  }

  function nextRound(demo) {
    round++;
    if (!demo && wrong >= 2) { finish(false); return; }
    if (round >= ROUNDS) { if (demo) { round = 0; startRound(); } else finish(correct >= 2); return; }
    startRound();
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 1000), { color: [C.leaf, C.leaf2, C.cream][i % 3], count: 22, speed: 440 });
      game.fx.flash(C.white, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  function choiceAt(x, y) {
    if (y < H * 0.78 || y > H * 0.94) return -1;
    var idx = Math.floor((x - 60) / ((W - 120) / 4));
    return idx >= 0 && idx < 4 ? idx : -1;
  }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    if (phase === 'answer') { var i = choiceAt(x, y); if (i >= 0) pick(i, false); else game.audio.play('se_tap', 0.05); }
    else game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 });
  });

  // ---- 描画(ローポリ) ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function jit(i) { return Math.sin(game.time.elapsed * 3 + i * 1.7) * 2; }
  // 三角形(山・木)を横ストリップで塗り、輪郭を line で描く
  function tri(x, y, w, h, col, fog) {
    for (var s = 0; s < h; s += 6) { var k = s / h; game.draw.rect(x - (w / 2) * (1 - k), y - s - 6, w * (1 - k), 6, col, fog); }
    game.draw.line(x - w / 2, y, x, y - h, C.ink, 2); game.draw.line(x, y - h, x + w / 2, y, C.ink, 2);
  }

  function drawValley() {
    var t = game.time.elapsed;
    game.draw.gradient(0, WATER_TOP, [[0, C.fog], [1, C.sky]]);
    // 遠い山(フォグで薄い)
    tri(200 + jit(1), WATER_TOP - 60, 520, 300, C.sky, 0.6);
    tri(700 + jit(2), WATER_TOP - 60, 620, 360, C.sky, 0.7);
    tri(980 + jit(3), WATER_TOP - 60, 400, 240, C.sky, 0.6);
    // 両岸の紅葉と松(ローポリの木)
    for (var k = 0; k < 5; k++) {
      tri(40 + k * 80 + jit(k), WATER_TOP + 20, 90, 150 + (k % 2) * 40, k % 3 ? C.leaf : C.leaf2, 1);
      tri(W - 40 - k * 80 - jit(k + 5), WATER_TOP + 20, 90, 150 + (k % 2) * 40, k % 3 ? C.leaf2 : C.pine, 1);
    }
    // 川(横ストリップ、手前ほど濃く、流れの筋)
    for (var y = WATER_TOP; y < WATER_BOT + 120; y += 8) {
      var k2 = (y - WATER_TOP) / (WATER_BOT + 120 - WATER_TOP);
      game.draw.rect(0, y, W, 8, (Math.floor(y / 24) % 2) ? C.river : '#2e5276', 0.7 + k2 * 0.3);
    }
    for (var f = 0; f < 10; f++) {
      var fy = WATER_TOP + 30 + ((f * 97 + t * 90) % (WATER_BOT + 60 - WATER_TOP)), fx = 120 + (f * 211) % 860;
      game.draw.line(fx - 40, fy, fx + 40, fy + 2, C.fog, 3);
    }
    // 岸の線と橋の手すり(手前)
    game.draw.line(0, WATER_TOP + 20, W, WATER_TOP + 20, C.ink, 3);
    game.draw.rect(0, WATER_BOT + 120, W, H - WATER_BOT - 120, C.board);
    for (var p = 0; p < 7; p++) game.draw.rect(40 + p * 170, WATER_BOT + 60, 18, 70, C.board);
    game.draw.rect(0, WATER_BOT + 56, W, 14, '#7a5a40');
    game.draw.line(0, WATER_BOT + 56, W, WATER_BOT + 56, C.ink, 2);
    // 中央の目印(左右の岸の境)
    game.draw.line(W / 2, WATER_TOP + 20, W / 2, WATER_BOT + 56, C.cream, 2);
  }

  var SALMON = ['....sss.....', '..sssssss.p.', 'esssssssspp.', '..sssssss.p.', '....sss.....'];
  var SPAL = { s: '#c85a6a', e: '#182030', p: '#e8a0a8' };

  function drawLeaps() {
    for (var i = 0; i < leaps.length; i++) {
      var l = leaps[i];
      var u = Math.min(1, l.t / 0.75);
      var hgt = Math.sin(u * Math.PI) * 190;
      game.draw.circle(l.x, l.y, 30 + u * 30, C.white, 0.5 * (1 - u));
      if (l.t < 0.75) game.draw.sprite(SALMON, SPAL, l.x, l.y - hgt - 20, 8, { anchor: 'center', flipX: l.flip });
      else for (var d = 0; d < 5; d++) game.draw.circle(l.x - 30 + d * 15, l.y - 10 - (l.t - 0.75) * 200 * ((d % 2) + 1), 6, C.white, 0.8);
    }
    for (var r = 0; r < ripples.length; r++) {
      var rp = ripples[r];
      game.draw.circle(rp.x, rp.y, 20 + rp.t * 50, C.fog, 0.5 * (1 - rp.t));
      if (rp.t < 0.5) game.draw.rect(rp.x - 6, rp.y - 16 + rp.t * 10, 12, 16, C.salmon);
    }
  }

  function drawObserver() {
    // 手前の観察員(背中): 見ている側へ少し向く
    var t = game.time.elapsed;
    var lastSide = leaps.length ? leaps[leaps.length - 1].side : (Math.sin(t) > 0 ? 1 : 0);
    var ox = W / 2 + (lastSide === 0 ? -14 : 14);
    game.draw.rect(ox - 60, WATER_BOT + 150, 120, 200, C.pine);
    game.draw.circle(ox, WATER_BOT + 130, 44, '#e8c8a8');
    game.draw.rect(ox - 50, WATER_BOT + 92, 100, 24, C.leaf2);
    game.draw.circle(ox + (lastSide === 0 ? -70 : 70), WATER_BOT + 170, 26, C.board);
  }

  function drawBoard() {
    // 下: 観察記録の板と4つの数字
    game.draw.rect(40, H * 0.76, W - 80, H * 0.2, C.board);
    game.draw.rect(52, H * 0.77, W - 104, H * 0.18, C.cream);
    var cw = (W - 120) / 4;
    for (var i = 0; i < 4; i++) {
      var x = 60 + cw * i + cw / 2, y = H * 0.86;
      var on = phase === 'answer' || phase === 'show';
      var col = C.board;
      if (phase === 'show' && choices[i] === total) col = C.ok;
      if (phase === 'show' && answer === i && choices[i] !== total) col = C.bad;
      game.draw.rect(x - cw / 2 + 14, y - 80, cw - 28, 160, col, on ? 1 : 0.3);
      game.draw.line(x - cw / 2 + 14, y - 80, x + cw / 2 - 14, y - 80, C.ink, 2);
      label(on ? String(choices[i]) : '?', x, y + 24, 76, C.cream);
    }
    if (phase === 'answer') {
      var p = Math.max(0, answerLeft / ANSWER_T);
      game.draw.rect(60, H * 0.955, (W - 120) * p, 10, p < 0.35 ? C.bad : C.leaf2);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.82);
    label('SCORE ' + score, 270, 90, 56, C.cream);
    label('MISS ' + wrong, 270, 170, 36, C.bad);
    for (var i = 0; i < ROUNDS; i++) game.draw.circle(680 + i * 100, 80, 30, i < round ? (i < correct + (wrong - (round - correct)) && i < correct ? C.ok : C.bad) : (i === round ? C.leaf2 : '#444'));
    if (phase === 'watch') {
      var p = Math.min(1, phaseT / ROUND_CFG[round].watch);
      game.draw.rect(560, 150, 460, 20, '#333');
      game.draw.rect(560, 150, 460 * p, 20, C.leaf2);
      // 見る側の目印(左岸/右岸)
      game.draw.rect(560, 190, 220, 14, C.salmon2, 0.8); game.draw.rect(800, 190, 220, 14, C.salmon2, 0.8);
    }
  }

  function drawScene() {
    drawValley();
    drawLeaps();
    drawObserver();
    drawBoard();
  }

  function stepRound(dt, demo) {
    if (phase === 'watch') stepWatch(dt);
    else if (phase === 'answer') { answerLeft -= dt; if (answerLeft <= 0) timeoutAnswer(demo); }
    else if (phase === 'show') { phaseT += dt; if (pickFlash > 0) pickFlash -= dt; if (phaseT >= 1.0) nextRound(demo); }
  }

  // ---- ATTRACT: 観察→4択を実ロジックで見せる。2回に1回わざと隣の数字を押す ----
  var demo = { t: 0, press: 0, hx: W / 2, hy: H * 0.86, wrongNext: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { initGame(); readyT = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; return; }
    stepRound(dt, true);
    if (phase === 'answer' && answer === null && answerLeft < ANSWER_T - 0.9) {
      var idx = -1;
      for (var i = 0; i < 4; i++) if (choices[i] === total) idx = i;
      if (demo.wrongNext) idx = (idx + 1) % 4;
      demo.wrongNext = !demo.wrongNext;
      demo.hx = 60 + (W - 120) / 4 * idx + (W - 120) / 8; demo.hy = H * 0.86;
      pick(idx, true); demo.press = 0.2;
    }
    if (wrong >= 2 || (round === 0 && phase === 'watch' && phaseT < dt && demo.t > 5)) { if (wrong >= 2) demo.t = 0; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy + 30, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.82);
      label(GAME_TITLE, W / 2, 105, 84 + Math.sin(t * 3) * 3, C.leaf2);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.leaf);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.cream);
      label(correct + ' / ' + ROUNDS + '  MAX ' + maxSimul, W / 2, H * 0.435, 38, C.leaf2);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.leaf2);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.cream);
      if (!won) label('あと' + Math.max(1, 2 - correct) + '問!', W / 2, H * 0.25, 56, C.leaf);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, correct: correct, maxSimul: maxSimul, wrong: wrong };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
    } else {
      stepRound(dt, false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.leaf2);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.leaf2);
  });

  game.onStart(function() {
    // 秋の川のせせらぎ(オリジナル): ゆったりした5音
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1.5], ['R', 0.5],
      ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1.5], ['R', 0.5],
    ], { tempo: 108, wave: 'triangle', volume: 0.045, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
