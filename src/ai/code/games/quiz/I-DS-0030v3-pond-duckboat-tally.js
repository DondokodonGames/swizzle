// I-DS-0030v3-pond-duckboat-tally.js
// アヒルボート数え — くるくる回って逃げ回るアヒル型ボートの中から黄色いボートの数を数え、指を上へ引いて札を数だけ灯して答える
// 操作: 池のボートが回っている間は見て数えるだけ。灯りが落ちたら画面を押したまま指を上へずらすと、ずらした分だけ左の札(アヒルの印)が1つずつ灯る。下へ戻せば減る。指を離した数が答え(0のまま離すと取り消し)(社内メモ。画面には出さない)
// 終わり: 3回の池で、2回以上黄色の数を言い当てればCLEAR。2回外す(答えずに時間切れも外れ)とGAME OVER
// @mechanic: counting
// @theme: park_pond_rental_duck_boats
// 世界観: 夕暮れの公園の貸しボート池で、ボート番の若者が、くるくる回って逃げ回るアヒル型ボートの中に黄色い貸し出し中の舟が何艘いるかを数え、桟橋の札に記していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 言い当てた回数・答えの速さ・スコア
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ。太さ違いの線を重ねて発光を作る
  var STYLE = { bg: ['#02040a', '#060c18'], main: ['#4af0ff', '#ffe84a', '#7aff9a'], accent: ['#ff4a6a', '#ffffff'] };
  var C = { cyan: STYLE.main[0], yellow: STYLE.main[1], green: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1], dim: '#1a3a4a' };

  var GAME_TITLE = 'DUCK COUNT';
  var ROUNDS = [
    { n: 6, ylo: 2, yhi: 3, sp: 0.9, obs: 2.6, flip: false, bridge: false },
    { n: 8, ylo: 3, yhi: 4, sp: 1.25, obs: 2.9, flip: true, bridge: false },
    { n: 10, ylo: 4, yhi: 6, sp: 1.55, obs: 3.2, flip: true, bridge: true },
  ];
  var ANSWER_T = 3.0;
  var MISS_MAX = 2;
  var STEP_PX = 80;
  var PCX = W / 2, PCY = Math.round(H * 0.42), PRX = 430, PRY = 400;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var boats, yellowN, round, rcfg, phase, phaseT, dial, pick, answered, rightN, misses, score, finalScore, fastest, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, revealK, lastAnswer;

  // ボート番の若者(発光ドット)
  var KEEP_A = ['..cccc..', '.cccccc.', '..c..c..', '..cccc..', '...cc...', '.cccccc.', 'c.cccc.c', '..c..c..', '..c..c..'];
  var KEEP_B = ['..cccc..', '.cccccc.', '..c..c..', '..cccc..', '...cc...', 'ccccccc.', '..cccc.c', '..c..c..', '.c....c.'];
  var KEEP_JOY = ['c.cccc.c', 'cccccccc', '..c..c..', '..cyyc..', '...cc...', '..cccc..', '..cccc..', '..c..c..', '.c....c.'];
  var KEEP_SAD = ['........', '..cccc..', '.cccccc.', '..c..c..', '..cccc..', '.cccccc.', 'c.cccc.c', '..c..c..', '..c..c..'];
  var DUCK_ICON = ['..yy....', '.yyyy...', '..yyyyyy', '.yyyyyyy', '..yyyyy.'];

  function glowLine(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '30', w * 4);
    game.draw.line(x1, y1, x2, y2, col + '70', w * 2);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function out(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color + '50', bold: true, align: 'center' });
    game.draw.text(str, x, y - 2, { size: sz, color: color, bold: true, align: 'center' });
  }
  // アヒル型ボートの輪郭(線だけ)。h=向き
  function duckBoat(x, y, h, s, col) {
    var pts = [[-1, -0.55], [0.6, -0.6], [1.05, -0.2], [1.05, 0.25], [0.6, 0.6], [-1, 0.55], [-1.25, 0]];
    var ch = Math.cos(h), sh = Math.sin(h);
    function P(p) { return { x: x + (p[0] * ch - p[1] * sh) * s, y: y + (p[0] * sh + p[1] * ch) * s * 0.8 }; }
    for (var i = 0; i < pts.length; i++) {
      var a = P(pts[i]), b = P(pts[(i + 1) % pts.length]);
      glowLine(a.x, a.y, b.x, b.y, col, 3);
    }
    // 首を上げたアヒルの頭(輪)とくちばし、尾の跳ね
    var hd = P([0.62, 0]), bk = P([1.05, 0]), bk2 = P([1.5, 0]), tl = P([-1.25, 0]), tl2 = P([-1.55, -0.25]);
    ring(hd.x, hd.y, s * 0.42, s * 0.42, col, 4, 12);
    game.draw.circle(hd.x, hd.y, s * 0.3, col + '30');
    glowLine(bk.x, bk.y, bk2.x, bk2.y, col, 6);
    glowLine(tl.x, tl.y, tl2.x, tl2.y, col, 3);
  }
  function ring(cx, cy, rx, ry, col, w, segs) {
    for (var i = 0; i < segs; i++) {
      var a = i / segs * Math.PI * 2, b = (i + 1) / segs * Math.PI * 2;
      game.draw.line(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cx + Math.cos(b) * rx, cy + Math.sin(b) * ry, col, w);
    }
  }

  function setupRound(k) {
    round = k; rcfg = ROUNDS[k];
    yellowN = Math.floor(game.random(rcfg.ylo, rcfg.yhi + 0.999));
    boats = [];
    var order = [];
    for (var i = 0; i < rcfg.n; i++) order.push(i < yellowN);
    for (var j = order.length - 1; j > 0; j--) { var q = Math.floor(Math.random() * (j + 1)); var tmp = order[j]; order[j] = order[q]; order[q] = tmp; }
    for (var b = 0; b < rcfg.n; b++) {
      boats.push({
        y: order[b], ocx: PCX + game.random(-120, 120), ocy: PCY + game.random(-110, 110),
        r: game.random(120, 300), a: (b / rcfg.n) * Math.PI * 2 + game.random(-0.3, 0.3),
        w: (Math.random() < 0.5 ? -1 : 1) * game.random(0.8, 1.4) * rcfg.sp, spin: game.random(2, 5) * (Math.random() < 0.5 ? -1 : 1),
        x: PCX, yy: PCY, h: 0, flipT: game.random(0.9, 2.2),
      });
    }
    phase = 'watch'; phaseT = 0; dial = null; pick = 0; answered = false; revealK = 0;
    placeBoats(0);
  }

  function placeBoats(dt) {
    for (var i = 0; i < boats.length; i++) {
      var b = boats[i];
      if (rcfg.flip) { b.flipT -= dt; if (b.flipT <= 0) { b.flipT = game.random(0.9, 1.8); b.w = -b.w; } }
      b.a += b.w * dt;
      b.h += b.spin * dt;
      var nx = b.ocx + Math.cos(b.a) * b.r, ny = b.ocy + Math.sin(b.a) * b.r * 0.9;
      // 池の縁の内側へ収める
      var ex = (nx - PCX) / (PRX - 60), ey = (ny - PCY) / (PRY - 60), e = Math.sqrt(ex * ex + ey * ey);
      if (e > 1) { nx = PCX + (nx - PCX) / e; ny = PCY + (ny - PCY) / e; }
      b.x = nx; b.yy = ny;
    }
  }

  function initGame() {
    misses = 0; rightN = 0; score = 0; finalScore = 0; fastest = 0; lastAnswer = -1;
    readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0;
    setupRound(0);
  }

  function submit(n) {
    if (phase !== 'answer' || answered) return;
    answered = true; lastAnswer = n;
    var ok = n === yellowN;
    phase = 'reveal'; revealK = 0;
    var p = { x: 150, y: H * 0.9 - n * 64 };
    if (ok) {
      rightN++; joyT = 1;
      var quick = phaseT < 1.2;
      var pts = 300 + Math.max(0, Math.round((ANSWER_T - phaseT) * 60));
      score += pts;
      if (!fastest || phaseT < fastest) fastest = phaseT;
      game.feedback.good(PCX, PCY, { text: quick ? 'PERFECT' : 'GOOD', color: C.yellow, size: 70 });
      game.fx.popup('+' + pts, PCX + 220, PCY - 120, { color: C.green, size: 46 });
      if (mode === S.PLAYING && rightN === 2) { game.audio.play('se_milestone', 0.5); game.fx.popup('NICE', W / 2, H * 0.17, { color: C.green, size: 84 }); }
    } else {
      misses++; sadT = 1;
      if (mode === S.PLAYING && misses >= MISS_MAX) {
        stopT = 0.6; stopKind = 'miss';
        game.fx.flash('#ffffff', 0.18);
        game.audio.play('se_break', 0.3);
      } else game.feedback.bad(p.x + 200, PCY + 300, { text: 'MISS', color: C.red, size: 62 });
    }
  }

  function stepRound(dt) {
    phaseT += dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (phase === 'watch') {
      placeBoats(dt);
      if (phaseT >= rcfg.obs) { phase = 'hide'; phaseT = 0; game.audio.play('se_jump', 0.3); }
    } else if (phase === 'hide') {
      placeBoats(dt * 0.4);
      if (phaseT >= 0.3) { phase = 'answer'; phaseT = 0; game.audio.tone('C6', 0.08, { wave: 'square', volume: 0.06 }); }
    } else if (phase === 'answer') {
      if (phaseT > ANSWER_T - 1 && Math.floor(phaseT * 4) !== Math.floor((phaseT - dt) * 4)) game.audio.tone('E6', 0.04, { wave: 'square', volume: 0.05 });
      if (phaseT >= ANSWER_T && !answered) { dial = null; submit(pick > 0 && dial ? pick : 0); }
    } else if (phase === 'reveal') {
      // 正解の再生: 黄色のボートを1艘ずつ灯して数える
      var k = Math.min(yellowN, Math.floor(phaseT / 0.16));
      if (k > revealK) { revealK = k; game.audio.tone(440 + k * 70, 0.05, { wave: 'triangle', volume: 0.07 }); }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? (misses === 0 ? 500 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, PCY + (i % 2) * 160 - 80, { color: i % 2 ? C.yellow : C.cyan, count: 18, speed: 520 });
      game.fx.flash(C.yellow, 0.22);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  // ---- 入力: 押して上へずらすと札が灯る。離した数が答え ----
  function dialDown(x, y) {
    if (phase !== 'answer' || answered) return false;
    dial = { y0: y, y: y }; pick = 0;
    return true;
  }
  function dialMove(y) {
    if (!dial) return;
    dial.y = y;
    var n = Math.max(0, Math.min(9, Math.floor((dial.y0 - y) / STEP_PX + 0.5)));
    if (n !== pick) {
      pick = n;
      game.audio.tone(330 + n * 60, 0.04, { wave: 'square', volume: 0.06 });
    }
  }
  function dialUp() {
    if (!dial) return;
    var n = pick; dial = null;
    if (n <= 0) { game.audio.tone('G3', 0.05, { wave: 'triangle', volume: 0.05 }); return; }
    submit(n);
  }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    if (dialDown(x, y)) game.audio.play('se_tap', 0.3);
    else { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: C.cyan, count: 4, speed: 120 }); }
  });
  game.onMove(function(x, y) { if (canPlay()) dialMove(y); });
  game.onRelease(function(x, y) {
    if (!canPlay() || !dial) return;
    dialUp();
    game.fx.burst(150, H * 0.9 - lastAnswer * 64, { color: C.yellow, count: 6, speed: 180 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function pond(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 遠景: 公園の木立と街灯(線)
    for (var i = 0; i < 8; i++) {
      var x = 70 + i * 135, top = 300 + (i % 3) * 30;
      glowLine(x, top, x - 40, top + 90, C.dim, 2); glowLine(x, top, x + 40, top + 90, C.dim, 2); glowLine(x - 40, top + 90, x + 40, top + 90, C.dim, 2);
    }
    var lit = phase === 'watch' || phase === 'reveal';
    ring(PCX, PCY, PRX, PRY, lit ? C.cyan : C.dim, 4, 48);
    ring(PCX, PCY, PRX + 20, PRY + 20, C.cyan + '40', 2, 48);
    for (var r = 0; r < 5; r++) {
      var rr = ((t * 40 + r * 90) % 420);
      ring(PCX + Math.sin(r) * 60, PCY + Math.cos(r) * 50, rr, rr * 0.7, C.cyan + (rr < 300 ? '28' : '10'), 2, 24);
    }
    // 桟橋(手前)
    glowLine(PCX - 120, PCY + PRY - 10, PCX - 120, PCY + PRY + 150, C.cyan, 3);
    glowLine(PCX + 120, PCY + PRY - 10, PCX + 120, PCY + PRY + 150, C.cyan, 3);
    for (var p = 0; p < 5; p++) glowLine(PCX - 120, PCY + PRY + p * 36, PCX + 120, PCY + PRY + p * 36, C.cyan + '90', 2);
  }

  function drawBoats(t) {
    var vis = phase === 'watch' ? 1 : phase === 'hide' ? Math.max(0, 1 - phaseT / 0.3) : phase === 'reveal' ? 1 : 0;
    if (vis <= 0) return;
    var big = stopT > 0 && stopKind === 'miss';
    var yi = 0;
    for (var i = 0; i < boats.length; i++) {
      var b = boats[i];
      if (phase === 'reveal') {
        if (!b.y) { duckBoat(b.x, b.yy, b.h, 40, C.dim); continue; }
        yi++;
        var on = yi <= revealK;
        var hl = big && Math.floor(t * 16) % 2 === 0;
        duckBoat(b.x, b.yy, b.h, on ? (big ? 70 : 54) : 40, hl ? C.white : on ? C.yellow : C.dim);
        if (on) out('' + yi, b.x, b.yy - 60, 40, C.yellow);
        continue;
      }
      if (vis < 1 && Math.random() > vis) continue;
      duckBoat(b.x, b.yy, b.h, 44, b.y ? C.yellow : C.cyan);
    }
    if (rcfg.bridge && phase !== 'reveal') {
      // 太鼓橋: 下をくぐるボートは隠れる
      game.draw.rect(PCX - 470, PCY - 70, 940, 130, STYLE.bg[0]);
      glowLine(PCX - 470, PCY - 70, PCX + 470, PCY - 70, C.green, 4);
      glowLine(PCX - 470, PCY + 60, PCX + 470, PCY + 60, C.green, 4);
      for (var k = 0; k < 9; k++) glowLine(PCX - 420 + k * 105, PCY - 70, PCX - 420 + k * 105, PCY - 100, C.green, 3);
    }
  }

  function drawPanel(t) {
    // 札掛け: 灯ったアヒル印の数=答え
    var bx = 150, by = H * 0.9;
    glowLine(bx - 70, by + 40, bx - 70, by - 9 * 64 - 10, C.cyan + 'a0', 3);
    for (var n = 1; n <= 9; n++) {
      var y = by - n * 64, on = n <= pick && (dial || phase === 'reveal' || answered);
      var col = on ? (phase === 'reveal' && lastAnswer !== yellowN ? C.red : C.yellow) : C.dim;
      game.draw.sprite(DUCK_ICON, { y: col }, bx, y, 9, { anchor: 'center' });
    }
    if (phase === 'answer') {
      var u = Math.max(0, 1 - phaseT / ANSWER_T);
      ring(W / 2 + 160, H * 0.83, 110, 110, C.dim, 4, 36);
      for (var s = 0; s < Math.floor(36 * u); s++) {
        var a = -Math.PI / 2 + s / 36 * Math.PI * 2, b2 = -Math.PI / 2 + (s + 1) / 36 * Math.PI * 2;
        glowLine(W / 2 + 160 + Math.cos(a) * 110, H * 0.83 + Math.sin(a) * 110, W / 2 + 160 + Math.cos(b2) * 110, H * 0.83 + Math.sin(b2) * 110, u < 0.34 ? C.red : C.green, 4);
      }
      out(dial ? '' + pick : '?', W / 2 + 160, H * 0.83 + 30, 110, dial ? C.yellow : C.cyan);
    }
    if (phase === 'reveal') {
      out('' + yellowN, W / 2 + 160, H * 0.83 + 30, 120, lastAnswer === yellowN ? C.green : C.red);
      if (lastAnswer !== yellowN && lastAnswer > 0) out((lastAnswer > yellowN ? '+' : '') + (lastAnswer - yellowN), W / 2 + 330, H * 0.83 - 60, 54, C.red);
    }
  }

  function drawKeeper(t) {
    var fr = sadT > 0 || (fin && !cleared) ? KEEP_SAD : (joyT > 0 || (fin && cleared)) ? KEEP_JOY : (Math.floor(t * 2) % 2 ? KEEP_A : KEEP_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 10)) * 26 : Math.sin(t * 2.5) * 4;
    game.draw.sprite(fr, { c: C.cyan, y: C.yellow }, PCX, PCY + PRY + 200 + hop, 12, { anchor: 'center' });
  }

  function drawHud(t) {
    for (var r = 0; r < ROUNDS.length; r++) {
      var x = W / 2 - 120 + r * 120, done = r < round || (r === round && answered);
      ring(x, 150, 34, 34, r === round ? C.white : C.dim, 3, 20);
      if (done) game.draw.circle(x, 150, 22, r < round || lastAnswer === yellowN ? C.green : C.red);
    }
    out(rightN + ' / ' + ROUNDS.length, 150, 170, 48, C.green);
    for (var m = 0; m < MISS_MAX; m++) ring(W - 110 - m * 64, 150, 22, 22, m < misses ? C.red : C.dim, 6, 16);
  }

  function drawScene(t) {
    pond(t);
    drawBoats(t);
    drawKeeper(t);
    drawPanel(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.25);
  }

  // ---- ATTRACT: 本物の stepRound と dial 入力。1回目は正しい数まで引いて当てる → 2回目は1つ足りずに外す ----
  var demo = { t: 0, x: W / 2 + 160, y: H * 0.86, press: false, k: 0, y0: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10.5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.k = 0; }
    stepRound(dt);
    if (phase === 'reveal' && phaseT > 1.2) {
      if (round < ROUNDS.length - 1) setupRound(round + 1);
    }
    demo.press = false;
    if (phase === 'answer' && !answered) {
      var want = round === 0 ? yellowN : yellowN - 1;
      if (!dial && phaseT > 0.35) { demo.y0 = H * 0.88; demo.y = demo.y0; dialDown(demo.x, demo.y); }
      if (dial) {
        demo.press = true;
        var goal = demo.y0 - want * STEP_PX;
        demo.y += (goal - demo.y) * Math.min(1, dt * 5);
        dialMove(demo.y);
        if (Math.abs(demo.y - goal) < 6 && pick === want) dialUp();
      }
    } else {
      demo.y += (H * 0.88 - demo.y) * Math.min(1, dt * 4);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 5, 100, C.yellow);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 200, 40, C.cyan);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.white);
      else out('TAP TO START', W / 2, H * 0.975, 42, C.green);
      return;
    }

    if (mode === S.RESULT) {
      stepRound(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, STYLE.bg[0], 0.92);
      ring(W / 2, H * 0.43, 440, 250, C.cyan + '80', 3, 40);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, cleared ? C.green : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.white);
      out(rightN + ' / ' + ROUNDS.length + (fastest ? '   ' + fastest.toFixed(1) + '秒' : ''), W / 2, H * 0.47, 42, C.yellow);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.yellow);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.cyan);
      if (!cleared) out('あと' + Math.max(1, 2 - rightN) + '回!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { correct: rightN, misses: misses, fastest: fastest };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      stepRound(dt);
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(PCX, PCY, { text: 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      stepRound(dt);
      if (phase === 'reveal' && phaseT > Math.max(0.9, yellowN * 0.16 + 0.35)) {
        if (round < ROUNDS.length - 1) { setupRound(round + 1); game.audio.play('se_jump', 0.3); }
        else if (stopT <= 0) { stopT = 0.4; stopKind = rightN >= 2 ? 'win' : 'miss'; if (rightN >= 2) game.audio.play('se_powerup', 0.45); }
      }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') ring(PCX, PCY, 100 + (0.4 - stopT) * 1500, 100 + (0.4 - stopT) * 1500, C.yellow, 6, 40);
    // 最初の答えの番だけ: 押して上へずらす手のお手本
    if (!fin && round === 0 && phase === 'answer' && !dial && !answered) {
      var g = (phaseT * 1.2) % 1;
      game.draw.hand(W / 2 + 160, H * 0.88 - g * 240, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.18, 120, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 1],
      ['F5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 1], ['F5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 1], ['B4', 1], ['C5', 1],
    ], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 3], ['F2', 3], ['G2', 3], ['C3', 3]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
