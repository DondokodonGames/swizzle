// J-Switch-0009-meerkat-sentry-mimic.js
// 見張り塚の身振りまね — 隊長の掛け声と一緒に吹き出しへ出る身振りの絵を見て、下の3枚の構えから同じものを即座に選ぶ。後半は左右が逆の鏡写しが混ざる
// 操作: 隊長の吹き出しに描かれた身振りと同じ構えのカードを、下の3枚からタップ。吹き出しの輪が縮みきる前に答える(社内メモ。画面には出さない)
// 終わり: 8回正しく真似ればCLEAR。取り違え/間に合わないが2回で脱落(GAME OVER)、全体の時間切れもGAME OVER
// @mechanic: judge
// @theme: savanna_meerkat_drill
// 世界観: 朝焼けのサバンナの見張り塚で、ミーアキャット見張り隊の見習いが、隊長の掛け声と一緒に掲げられる身振りの絵と同じ構えを即座に取る朝の訓練。まちがえた仲間から巣穴へ引っ込み、最後まで立っていれば一人前
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく真似た回数・即答(PERFECT)数・最速の反応秒
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きく描いた主役、床影、多色で表情のある塗り
  var STYLE = { bg: ['#3b2a5c', '#f07a4a', '#f7d27a'], main: ['#d9a066', '#8a5a32', '#f3e2b8'], accent: ['#ffd23a', '#e8483a'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], sky3: STYLE.bg[2], sun: '#fff0b0', dirt: '#c98c4a', dirtD: '#94602e',
    grass: '#8f9a3c', grassD: '#5f6a26', tree: '#3a2618', fur: STYLE.main[0], furD: STYLE.main[1], belly: STYLE.main[2],
    ink: '#241408', white: '#ffffff', gold: STYLE.accent[0], bad: STYLE.accent[1], good: '#58d27a', card: '#fff4dc', cardEdge: '#b98a58'
  };

  var GAME_TITLE = 'SENTRY MIMIC';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var HEARTS = 2;
  var CARD_Y = H * 0.83, CARD_W = 290, CARD_H = 330;
  var CARD_X = [W * 0.19, W * 0.5, W * 0.81];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── 身振りの絵(腕の向き U/S/D の組み合わせで組み立てる) ───────────────
  var ARMS = ['U', 'S', 'D'];
  var ARM_CELLS = {
    U: [[3, 5], [2, 4], [2, 3], [1, 2], [1, 1]],
    S: [[3, 5], [2, 5], [1, 5], [0, 5]],
    D: [[3, 5], [2, 6], [2, 7], [1, 8]]
  };
  var BODY = [
    '....ttt....', '...tdtdt...', '....tnt....', '.....t.....', '....ttt....', '....tbt....', '....tbt....',
    '....tbt....', '....tbt....', '....ttt....', '....t.t....', '....t.t....', '...tt.tt...'
  ];
  var PAL = { t: C.fur, d: C.furD, n: C.ink, b: C.belly, h: C.furD };
  var PAL_GOLD = { t: C.gold, d: C.furD, n: C.ink, b: C.white, h: C.furD };
  var PAL_SIL = { t: '#6a4a3a', d: '#4a3024', n: '#241408', b: '#8a6448', h: '#4a3024' };
  var artCache = {};
  function poseArt(p) {
    var key = p[0] + p[1];
    if (artCache[key]) return artCache[key];
    var g = [];
    for (var r = 0; r < BODY.length; r++) g.push(BODY[r].split(''));
    limb(g, ARM_CELLS[p[0]], false);
    limb(g, ARM_CELLS[p[1]], true);
    var out = [];
    for (var k = 0; k < g.length; k++) out.push(g[k].join(''));
    artCache[key] = out;
    return out;
  }
  function limb(g, cells, mirror) {
    for (var i = 0; i < cells.length; i++) {
      var cx = mirror ? 10 - cells[i][0] : cells[i][0];
      g[cells[i][1]][cx] = i === cells.length - 1 ? 'h' : 't';
    }
  }
  var ACACIA = ['..gggggggg..', '.gggggggggg.', 'gggggggggggg', '.....tt.....', '.....tt.....', '....t..t....'];
  var HEART = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];

  function ri(n) { return Math.min(n - 1, Math.floor(game.random(0, n))); }
  function same(a, b) { return a[0] === b[0] && a[1] === b[1]; }

  // ── 状態 ─────────────────────────────────────────────────────────
  var step, readyT, timeLeft, lives, hits, perfects, fastest, callN, call, choices, answer, callT, callWin;
  var gapT, stopT, outroT, win, myPose, myHop, picked, wrongIdx, golden, bonus, halfShown, crew;

  function initGame() {
    step = 'ready'; readyT = 0.8; timeLeft = TIME_LIMIT; lives = HEARTS; hits = 0; perfects = 0; fastest = 9;
    callN = 0; call = ['S', 'S']; choices = []; answer = 0; callT = 0; callWin = 1.8; gapT = 0; stopT = 0; outroT = 0;
    win = false; myPose = ['D', 'D']; myHop = 0; picked = -1; wrongIdx = -1; golden = false; bonus = 0; halfShown = false;
    crew = [];
    for (var i = 0; i < 5; i++) crew.push({ x: W * (0.1 + i * 0.2), sink: 0, out: false, pose: ['D', 'D'] });
    newCall();
  }

  function newCall() {
    var p = [ARMS[ri(3)], ARMS[ri(3)]];
    if (callN >= 3 && p[0] === p[1]) p[1] = ARMS[(ARMS.indexOf(p[0]) + 1 + ri(2)) % 3];
    var list = [p];
    if (p[0] !== p[1]) list.push([p[1], p[0]]);
    var guard = 0;
    while (list.length < 3 && guard++ < 40) {
      var q = [p[0], p[1]];
      var side = ri(2);
      q[side] = ARMS[(ARMS.indexOf(q[side]) + 1 + ri(2)) % 3];
      var dup = false;
      for (var j = 0; j < list.length; j++) if (same(list[j], q)) dup = true;
      if (!dup) list.push(q);
    }
    for (var s = list.length - 1; s > 0; s--) { var r = ri(s + 1); var tmp = list[s]; list[s] = list[r]; list[r] = tmp; }
    choices = list;
    for (var a = 0; a < list.length; a++) if (same(list[a], p)) answer = a;
    call = p; callT = 0; picked = -1; wrongIdx = -1;
    callWin = Math.max(1.1, 1.8 - callN * 0.1);
    golden = callN % 4 === 3;
    callN++;
  }

  function shout(isDemo) {
    if (isDemo) return;
    game.audio.tone(golden ? 'E5' : 'A4', 0.08, { wave: 'square', volume: 0.05 });
    game.audio.tone(golden ? 'B5' : 'D5', 0.1, { wave: 'square', volume: 0.05, slide: 40 });
  }

  // 1枚選ぶ(実プレイ・デモ共用)
  function choose(i, isDemo) {
    if (step !== 'call' || picked >= 0) return;
    picked = i;
    var cx = CARD_X[i];
    if (i === answer) {
      hits++;
      myPose = [call[0], call[1]]; myHop = 0.35;
      var quick = callT < 0.6;
      if (quick) perfects++;
      if (callT < fastest) fastest = callT;
      if (golden) bonus += 150;
      for (var c = 0; c < crew.length; c++) if (!crew[c].out) crew[c].pose = [call[0], call[1]];
      if (!isDemo) {
        game.audio.play('se_jump', 0.3);
        if (golden) game.audio.play('se_coin', 0.45);
        game.feedback.good(cx, CARD_Y - 190, { text: quick ? 'PERFECT' : 'GOOD', color: golden ? C.gold : C.good, count: quick ? 16 : 8 });
        if (!halfShown && hits === NEEDED / 2) {
          halfShown = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.44, { color: C.gold, size: 72 });
        }
      }
      dropCrewmate();
      if (hits >= NEEDED) { finish(true, isDemo); return; }
      step = 'gap'; gapT = 0.35;
    } else {
      miss(i, isDemo);
    }
  }

  function miss(i, isDemo) {
    wrongIdx = i; lives--;
    myPose = i >= 0 ? [choices[i][0], choices[i][1]] : ['D', 'D'];
    if (!isDemo) game.feedback.bad(i >= 0 ? CARD_X[i] : W / 2, CARD_Y - 190, { text: 'MISS', color: C.bad });
    if (lives <= 0) { finish(false, isDemo); return; }
    step = 'hold'; stopT = 0.45;
  }

  function dropCrewmate() {
    // 背景の仲間は掛け声の節目で一人ずつ巣穴へ(演出のみ)
    if (callN % 2 === 0) {
      for (var c = 0; c < crew.length; c++) {
        if (!crew[c].out) { crew[c].out = true; crew[c].pose = [call[1], call[0]]; break; }
      }
    }
  }

  function finish(ok, isDemo) {
    win = ok; step = 'stop'; stopT = 0.55;
    if (isDemo) return;
    game.audio.stopBgm();
    if (ok) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else game.audio.play('se_failure', 0.6);
  }

  function advance(dt, isDemo) {
    if (myHop > 0) myHop -= dt;
    for (var c = 0; c < crew.length; c++) if (crew[c].out && crew[c].sink < 1) crew[c].sink += dt * 2;
    if (step === 'call') {
      callT += dt;
      if (callT >= callWin) { picked = 3; miss(-1, isDemo); }
    } else if (step === 'gap') {
      gapT -= dt;
      if (gapT <= 0) { step = 'call'; newCall(); shout(isDemo); }
    } else if (step === 'hold') {
      stopT -= dt;
      if (stopT <= 0) { step = 'gap'; gapT = 0.25; }
    }
  }

  // ── 入力 ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (step !== 'call') { game.audio.tone('C3', 0.04, { wave: 'triangle', volume: 0.03 }); return; }
    for (var i = 0; i < choices.length; i++) {
      if (Math.abs(x - CARD_X[i]) < CARD_W / 2 && Math.abs(y - CARD_Y) < CARD_H / 2) {
        game.audio.play('se_tap', 0.25);
        choose(i, false);
        return;
      }
    }
    game.fx.burst(x, y, { color: C.belly, count: 4, speed: 90 });
    game.audio.tone('D3', 0.05, { wave: 'triangle', volume: 0.03 });
  });

  // ── ATTRACT デモ(実ロジックで答える。3回目ごとに鏡写しを選んでしまう) ───────
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, n: 0, target: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) { initGame(); step = 'call'; demo.n = 0; demo.target = answer; }
    if (lives <= 0 || step === 'stop') { initGame(); step = 'call'; }
    var prev = step;
    advance(dt, true);
    if (prev !== 'call' && step === 'call') {
      demo.n++;
      demo.target = answer;
      if (demo.n % 3 === 2) for (var k = 0; k < choices.length; k++) if (k !== answer) { demo.target = k; break; }
    }
    var tx = step === 'call' ? CARD_X[demo.target] : W / 2;
    var ty = step === 'call' ? CARD_Y : H * 0.94;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 7);
    demo.press = step === 'call' && callT > 0.55;
    if (step === 'call' && callT > 0.7) choose(demo.target, true);
  }

  // ── 描画 ─────────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.28, C.sky2], [0.46, C.sky3], [0.47, C.dirt], [1, C.dirtD]]);
    game.draw.circle(W * 0.78, H * 0.4, 150, C.sun, 0.55 + 0.08 * Math.sin(t * 1.2));
    for (var a = 0; a < 3; a++) {
      game.draw.sprite(ACACIA, { g: C.grassD, t: C.tree }, W * (0.14 + a * 0.38) + Math.sin(t * 0.6 + a) * 6, H * 0.42 - a * 10, 14 - a * 2, { anchor: 'center', alpha: 0.85 });
    }
    for (var gx = 0; gx < W; gx += 36) {
      var sway = Math.sin(t * 2.2 + gx * 0.05) * 6;
      game.draw.line(gx, H * 0.47 + 34, gx + sway, H * 0.47, C.grass, 6);
    }
    for (var s = 0; s < 9; s++) game.draw.rect(0, H * 0.5 + s * 60, W, 3, C.dirtD, 0.4);
    game.draw.rect(0, 0, W, H, C.sun, 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawCaptain() {
    var t = game.time.elapsed;
    var cx = W * 0.27, cy = H * 0.3;
    // 見張り塚(蟻塚)
    for (var y = 0; y < 150; y += 5) {
      var hw = 40 + y * 0.8;
      game.draw.rect(cx - hw, cy + 110 + y, hw * 2, 5, y % 20 < 10 ? C.dirt : C.dirtD);
    }
    var shouting = step === 'call' && callT < 0.3;
    var bob = Math.sin(t * 3) * 5 + (shouting ? -12 : 0);
    game.draw.circle(cx, cy + 120, 80, C.ink, 0.25);
    game.draw.sprite(poseArt(step === 'call' || step === 'hold' ? call : ['S', 'D']), golden ? PAL_GOLD : PAL, cx + Math.sin(t * 1.7) * 3, cy + bob, 18, { anchor: 'center' });
    // 吹き出し(身振りの絵)と残り時間リング
    var bx = W * 0.66, by = H * 0.27;
    var pulse = step === 'call' ? 1 + 0.04 * Math.sin(t * 12) : 1;
    game.draw.line(cx + 90, cy - 40, bx - 120, by + 40, C.white, 18);
    game.draw.circle(bx, by, 190 * pulse, golden ? C.gold : C.white, 0.95);
    game.draw.circle(bx, by, 172 * pulse, C.card);
    if (step === 'call') {
      var left = 1 - callT / callWin;
      var segs = 28;
      for (var i = 0; i < segs * left; i++) {
        var ang = -Math.PI / 2 + (i / segs) * Math.PI * 2;
        game.draw.circle(bx + Math.cos(ang) * 182, by + Math.sin(ang) * 182, 11, left < 0.35 ? C.bad : C.good);
      }
      game.draw.sprite(poseArt(call), PAL, bx, by + 6, 11, { anchor: 'center' });
    } else {
      game.draw.sprite(poseArt(call), PAL, bx, by + 6, 11, { anchor: 'center', alpha: 0.35 });
    }
  }

  function drawCrew() {
    var t = game.time.elapsed;
    for (var c = 0; c < crew.length; c++) {
      var m = crew[c];
      var hx = m.x, hy = H * 0.64;
      game.draw.circle(hx, hy + 52, 44, C.ink, 0.55);
      if (m.sink < 1) {
        var art = poseArt(m.pose);
        game.draw.sprite(art, PAL_SIL, hx + Math.sin(t * 2 + c) * 3, hy + m.sink * 80 + Math.sin(t * 3 + c * 1.3) * 3, 6, { anchor: 'center', alpha: 1 - m.sink * 0.8 });
      }
    }
  }

  function drawMe() {
    var t = game.time.elapsed;
    var mx = W / 2, my = H * 0.55;
    var hop = myHop > 0 ? Math.sin((0.35 - myHop) / 0.35 * Math.PI) * 60 : 0;
    var sinkY = (state === S.RESULT || step === 'outro') && !win ? 70 : 0;
    game.draw.rect(mx - 110, my + 110, 220, 22, C.ink, 0.3);
    if (step === 'hold' && Math.floor(t * 14) % 2 === 0) game.draw.circle(mx, my, 150, C.white, 0.35);
    game.draw.sprite(poseArt(myPose), PAL, mx + Math.sin(t * 2.1) * 4, my - hop + sinkY + Math.sin(t * 3.4) * 4, 17, { anchor: 'center' });
    game.draw.rect(mx - 130, my + 118, 260, 40, C.dirtD);
  }

  function drawCards() {
    var t = game.time.elapsed;
    game.draw.rect(0, CARD_Y - CARD_H / 2 - 30, W, CARD_H + 60, C.ink, 0.25);
    for (var i = 0; i < choices.length; i++) {
      var cx = CARD_X[i];
      var live = step === 'call';
      var lift = live ? Math.sin(t * 4 + i * 2) * 6 : 0;
      var edge = C.cardEdge;
      if (step === 'hold' || (step === 'stop' && !win)) {
        if (i === wrongIdx && Math.floor(t * 14) % 2 === 0) edge = C.white;
        else if (i === answer) edge = C.good;
      }
      if (live) game.draw.rect(cx - CARD_W / 2 - 10, CARD_Y - CARD_H / 2 - 10 + lift, CARD_W + 20, CARD_H + 20, C.white, 0.35 + 0.25 * Math.sin(t * 6));
      game.draw.rect(cx - CARD_W / 2, CARD_Y - CARD_H / 2 + lift, CARD_W, CARD_H, edge);
      game.draw.rect(cx - CARD_W / 2 + 12, CARD_Y - CARD_H / 2 + 12 + lift, CARD_W - 24, CARD_H - 24, C.card);
      var sc = i === wrongIdx && step === 'hold' ? 14 : 12;
      game.draw.sprite(poseArt(choices[i]), PAL, cx, CARD_Y + lift, sc, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.7);
    txt(hits + ' / ' + NEEDED, W / 2, 88, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 64, 88, 50, C.white, 'left');
    for (var h = 0; h < HEARTS; h++) {
      game.draw.sprite(HEART, { r: h < lives ? C.bad : '#5a4034' }, W - 90 - h * 90, 88, 9, { anchor: 'center' });
    }
    game.draw.rect(60, 172, W - 120, 20, '#5a4034');
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.good);
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function scoreNow() { return hits * 100 + perfects * 50 + bonus + Math.round(timeLeft * 10); }

  // ── ループ ───────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (step === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawCaptain(); drawCrew(); drawMe(); drawCards();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 225, C.ink, 0.7);
      txt(GAME_TITLE, W / 2, 86 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 176, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawCrew(); drawMe();
      if (win) for (var f = 0; f < 10; f++) game.draw.rect((f * 131 + t * 220) % W, (f * 197 + t * 300) % (H * 0.7), 14, 22, f % 2 ? C.gold : C.good);
      game.draw.rect(0, H * 0.2, W, H * 0.2, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, win ? C.gold : C.bad);
      txt('SCORE ' + (win ? scoreNow() : 0), W / 2, H * 0.31, 46, C.white);
      if (win && scoreNow() >= game.best) txt('NEW RECORD', W / 2, H * 0.36, 42, C.gold);
      else if (!win) txt('あと' + Math.max(1, NEEDED - hits) + '回!', W / 2, H * 0.36, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.36, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (step === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { step = 'call'; callT = 0; shout(false); game.audio.play('se_tap', 0.4); }
    } else if (step === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { step = 'outro'; outroT = 1.3; }
    } else if (step === 'outro') {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { mimic: hits, perfect: perfects, fastest: fastest < 9 ? Math.round(fastest * 100) / 100 : 0 };
        if (win) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
        return;
      }
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP', color: C.bad });
        finish(false, false);
      } else advance(dt, false);
    }

    drawWorld(); drawCaptain(); drawCrew(); drawMe(); drawCards(); drawHud();
    if (step === 'ready') txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.gold);
    if (step === 'outro') {
      game.draw.rect(0, H * 0.4, W, 150, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 92, win ? C.gold : C.bad);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1],
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['C4', 1]
    ], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
