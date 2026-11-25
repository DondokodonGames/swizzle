// I-GBA-0042v2-airport-suitcase-bigfirst.js
// 大きい方から — 2つずつ台に載るスーツケースの大きさを瞬時に見比べ、大きい方をタップして先にベルトへ送り出す
// 操作: 左右の台に載った2つのうち、大きい(面積が広い)方をタップする。縦長と横長の見比べもある。手前のゲージが満タンになる前に決める
// 終わり: 3便(3組ずつ・差が小さくなる)を15秒以内に送り切ればCLEAR。見誤り/間に合わずが3回/時間切れでGAME OVER
// @mechanic: size_judge
// @theme: airport_baggage_counter_bigfirst
// 世界観: 空港の手荷物カウンターで、係員が2つずつ届くスーツケースを見比べ、ベルトが詰まらないよう大きい方から先に送り出していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく送った組数・最速判断・残り秒のスコア
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光。パララックス3層以上、光源を左上の1つに決めて陰影を統一、細かい4コマアニメ
  var STYLE = { bg: ['#1c2a4a', '#3a5a8a', '#8ac0e8'], main: ['#d8dde6', '#7a8aa0', '#2e3a4c'], accent: ['#ffcc3a', '#ff5a5a'] };
  var A = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], sky: STYLE.bg[2], floor: STYLE.main[0], steel: STYLE.main[1], dark: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], white: '#ffffff', ink: '#121822', ok: '#4ade80', belt: '#3a4250',
  };
  var BAGS = [['#e0563a', '#ff8a6a', '#9a3020'], ['#3a7ae0', '#6aa6ff', '#22489a'], ['#2ab58a', '#5adbb0', '#16765a'], ['#e6b02a', '#ffd86a', '#9a7414'], ['#9a5ae0', '#c08aff', '#5e3496'], ['#4a4f5a', '#7a808c', '#2a2e36']];

  var GAME_TITLE = 'BIG FIRST';
  var TIME_LIMIT = 15;
  var FLIGHTS = [
    { pairs: 3, diff: 0.32, limit: 2.4, contrast: false },
    { pairs: 3, diff: 0.18, limit: 2.0, contrast: true },
    { pairs: 3, diff: 0.10, limit: 1.7, contrast: true },
  ];
  var NEEDED = 9;
  var MISS_MAX = 3;
  var PAD_Y = Math.round(H * 0.62);
  var PADS = [300, 780];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var fl, cfg, pairN, pair, sent, misses, combo, maxCombo, fastest, score;
  var timeLeft, readyT, flightT, stopT, stopObj, fin, cleared, postT, warnT, nodT, sadT, cheerT, playT, finalScore, reveal, movers;

  // 係員(帽子とスカーフ)。待機4コマ
  var STAFF = [
    ['..nnnnnn..', '.nnnnnnnn.', '..ffffff..', '..fkffkf..', '..ffffff..', '...fssf...', '.nnnsnnnn.', 'nnnnnnnnnn', 'f.nnnnnn.f', '..nn..nn..'],
    ['..nnnnnn..', '.nnnnnnnn.', '..ffffff..', '..fkffkf..', '..ffffff..', '...fssf...', '.nnnssnnn.', 'nnnnnnnnnn', 'f.nnnnnn.f', '..nn..nn..'],
    ['..nnnnnn..', '.nnnnnnnn.', '..ffffff..', '..ffffff..', '..ffffff..', '...fssf...', '.nnnsnnnn.', 'nnnnnnnnnn', 'f.nnnnnn.f', '..nn..nn..'],
    ['..nnnnnn..', '.nnnnnnnn.', '..ffffff..', '..fkffkf..', '..ffffff..', '...fssf...', '.nnnnsnnn.', 'nnnnnnnnnn', 'f.nnnnnn.f', '.nn....nn.'],
  ];
  var STAFF_POINT = ['..nnnnnn..', '.nnnnnnnn.', '..ffffff..', '..fkffkf..', '..ffffff..', '...fssf..f', '.nnnsnnnf.', 'nnnnnnnnn.', 'f.nnnnnn..', '..nn..nn..'];
  var STAFF_SAD = ['..nnnnnn..', '.nnnnnnnn.', '..ffffff..', '..fkffkf..', '..fkkkkf..', '...fssf...', '.nnnsnnnn.', 'fnnnnnnnnf', '..nnnnnn..', '..nn..nn..'];
  var STAFF_JOY = ['f.nnnnnn.f', 'fnnnnnnnnf', '.fffffff..', '..fkffkf..', '..fkkkkf..', '...fssf...', '.nnnsnnnn.', '.nnnnnnnn.', '..nnnnnn..', '..nn..nn..'];
  var STAFF_PAL = { n: '#24365a', f: '#f2cda6', k: '#121822', s: '#ffcc3a' };
  var PLANE = ['......ww......', 'wwwwwwwwwwwwww', '.....wwww.....', '......ww......'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: A.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function dims(area, r) {
    var w = Math.sqrt(area / r), h = Math.sqrt(area * r);
    if (w > 400) { w = 400; h = area / w; }
    if (h > 470) { h = 470; w = area / h; }
    return { w: w, h: h };
  }

  function newPair(diff, contrast) {
    var big = game.random(95000, 135000);
    var d = diff + game.random(-0.03, 0.03);
    var small = big * (1 - d);
    var rb, rs;
    if (contrast) { var tall = game.random(0, 1) < 0.5; rb = tall ? game.random(1.35, 1.7) : game.random(0.55, 0.72); rs = tall ? game.random(0.6, 0.8) : game.random(1.3, 1.6); }
    else { rb = game.random(0.8, 1.3); rs = game.random(0.8, 1.3); }
    var bigLeft = game.random(0, 1) < 0.5;
    var cb = Math.floor(game.random(0, BAGS.length)) % BAGS.length, cs = (cb + 1 + Math.floor(game.random(0, BAGS.length - 1))) % BAGS.length;
    var bb = dims(big, rb), sb = dims(small, rs);
    var L = bigLeft ? { w: bb.w, h: bb.h, big: true, col: cb } : { w: sb.w, h: sb.h, big: false, col: cs };
    var Rr = bigLeft ? { w: sb.w, h: sb.h, big: false, col: cs } : { w: bb.w, h: bb.h, big: true, col: cb };
    return { bags: [L, Rr], t: 0, limit: cfg.limit, slide: 0.25, done: false };
  }

  function setupFlight(i) {
    cfg = FLIGHTS[i];
    pairN = 0;
    pair = newPair(cfg.diff, cfg.contrast);
  }

  function initGame() {
    fl = 0; sent = 0; misses = 0; combo = 0; maxCombo = 0; fastest = 99; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; flightT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; nodT = 0; sadT = 0; cheerT = 0; playT = 0; finalScore = 0; reveal = null; movers = [];
    setupFlight(0);
  }

  // 左右どちらかを選ぶ(本番・デモ共通)。side = 0 左 / 1 右 / -1 間に合わず
  function choose(side) {
    if (!pair || pair.done) return;
    pair.done = true;
    var bigSide = pair.bags[0].big ? 0 : 1;
    var right = side === bigSide;
    var bx = PADS[bigSide], by = PAD_Y - pair.bags[bigSide].h / 2;
    reveal = { t: 0.55, pair: pair, ok: right };
    movers.push({ bag: pair.bags[bigSide], x: PADS[bigSide], y: PAD_Y, d: 0 });
    movers.push({ bag: pair.bags[1 - bigSide], x: PADS[1 - bigSide], y: PAD_Y, d: -0.2 });
    if (right) {
      sent++;
      var used = pair.t;
      if (used < fastest) fastest = used;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      var pts = Math.round(100 + Math.max(0, pair.limit - used) * 80) * Math.min(3, combo);
      score += pts;
      nodT = 0.4;
      game.feedback.good(bx, by - 60, { text: used < 0.7 ? 'PERFECT' : 'GOOD', color: A.ok, size: 60 });
      game.fx.popup('+' + pts, bx, by - 200, { color: A.gold, size: 42 });
      game.audio.play('se_coin', 0.25);
    } else {
      misses++; combo = 0; sadT = 0.8;
      var wx = side < 0 ? W / 2 : PADS[side];
      if (mode === S.PLAYING && misses >= MISS_MAX) {
        stopT = 0.5; stopObj = { kind: 'miss', x: wx, y: PAD_Y - 200 };
        game.fx.flash('#ffffff', 0.12);
        game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      } else {
        game.feedback.bad(wx, PAD_Y - 260, { text: 'MISS', color: A.red, size: 58 });
      }
    }
    pairN++;
  }

  function stepPair(dt) {
    if (reveal) { reveal.t -= dt; }
    for (var m = movers.length - 1; m >= 0; m--) {
      var q = movers[m];
      q.d += dt;
      if (q.d > 0) { var k = Math.min(1, q.d / 0.45); q.x += (1150 - q.x) * k * 0.2; q.y += (H * 0.42 - q.y) * k * 0.2; }
      if (q.d > 0.7) movers.splice(m, 1);
    }
    if (nodT > 0) nodT -= dt;
    if (sadT > 0) sadT -= dt;
    if (cheerT > 0) cheerT -= dt;
    if (!pair) return;
    if (pair.slide > 0) { pair.slide -= dt; return; }
    if (pair.done) {
      if (!reveal || reveal.t <= 0.25) nextPair();
      return;
    }
    pair.t += dt;
    if (pair.t > pair.limit * 0.7 && Math.floor(pair.t * 8) !== Math.floor((pair.t - dt) * 8)) game.audio.tone('E5', 0.04, { wave: 'square', volume: 0.05 });
    if (pair.t >= pair.limit) choose(-1);
  }

  function nextPair() {
    if (stopT > 0 || fin) return;
    if (pairN >= cfg.pairs) {
      if (mode === S.PLAYING) {
        pair = null; flightT = 0.85; cheerT = 0.85;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE', W / 2, H * 0.36, { color: A.gold, size: 92 });
      } else { pairN = 0; pair = newPair(cfg.diff, cfg.contrast); }
      return;
    }
    pair = newPair(cfg.diff, cfg.contrast);
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.42 + (i % 2) * 200, { color: i % 2 ? A.gold : A.white, count: 18, speed: 520 });
      game.fx.flash(A.gold, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var o = stopObj;
    stopObj = null;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(o.x, o.y, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: A.red, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && flightT <= 0; }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay() || !pair || pair.done || pair.slide > 0) { game.audio.play('se_tap', 0.05); return; }
    game.audio.play('se_tap', 0.15);
    choose(x < W / 2 ? 0 : 1);
  });

  // ---- 描画 ----
  function terminal(t) {
    // 遠景: 夕暮れの滑走路と飛行機
    game.draw.gradient(0, Math.round(H * 0.42), [[0, A.night], [0.6, A.dusk], [1, A.sky]]);
    for (var s = 0; s < 18; s++) game.draw.rect((s * 61) % W, 250 + (s * 37) % 160, 4, 4, A.white, 0.5 + Math.sin(t * 3 + s) * 0.3);
    var px = (t * 60) % (W + 400) - 200;
    game.draw.sprite(PLANE, { w: '#e8eef6' }, px, 420 - (px / W) * 60, 10, { anchor: 'center' });
    game.draw.rect(0, Math.round(H * 0.40), W, 20, '#2a3346');
    for (var l = 0; l < 12; l++) game.draw.rect(l * 96 + ((t * 30) % 96), Math.round(H * 0.405), 30, 6, A.gold, 0.7);
    // 中景: 柱と窓枠(ゆっくり逆に流れる)
    for (var c = 0; c < 5; c++) { var cx = ((c * 260 - t * 12) % (W + 260) + W + 260) % (W + 260) - 130; game.draw.rect(cx, 230, 40, Math.round(H * 0.42) - 230, A.dark); game.draw.rect(cx, 230, 10, Math.round(H * 0.42) - 230, A.steel); }
    // 手荷物ベルト
    game.draw.rect(0, Math.round(H * 0.42), W, 60, A.belt);
    for (var b = 0; b < 16; b++) game.draw.rect(((b * 80 + t * 160) % (W + 80)) - 80, Math.round(H * 0.42) + 8, 40, 44, '#4a5262');
    // 近景: カウンターの床(左上の光源から斜めのハイライト)
    game.draw.gradient(Math.round(H * 0.45), H, [[0, '#c8ced8'], [0.3, A.floor], [1, '#a8b0bc']]);
    for (var r = 0; r < 4; r++) game.draw.rect(0, Math.round(H * 0.70) + r * 120, W, 4, '#b0b8c4');
    game.draw.rect(120, Math.round(H * 0.45), 160, H, A.white, 0.12);
  }

  function drawBag(b, x, baseY, s, white, t) {
    var w = b.w * s, h = b.h * s, col = BAGS[b.col];
    var left = x - w / 2, top = baseY - h;
    game.draw.rect(left + 14, top + 16, w, h, A.ink, 0.25);
    game.draw.rect(left, top, w, h, white ? A.white : col[0]);
    game.draw.rect(left, top, 10, h, white ? A.white : col[1]);
    game.draw.rect(left, top, w, 10, white ? A.white : col[1]);
    game.draw.rect(left + w - 10, top, 10, h, col[2], white ? 0.2 : 1);
    game.draw.rect(left, top + h - 10, w, 10, col[2], white ? 0.2 : 1);
    for (var k = 1; k <= 2; k++) game.draw.rect(left + w * k / 3 - 4, top + 12, 8, h - 24, col[2], 0.5);
    game.draw.rect(x - 40 * s, top - 34 * s, 80 * s, 14 * s, A.dark);
    game.draw.rect(x - 40 * s, top - 34 * s, 12 * s, 34 * s, A.dark);
    game.draw.rect(x + 28 * s, top - 34 * s, 12 * s, 34 * s, A.dark);
    game.draw.rect(left + w * 0.62, top + h * 0.2, 40 * s, 54 * s, A.gold);
    game.draw.circle(left + 24 * s, baseY + 8, 12 * s, A.ink);
    game.draw.circle(left + w - 24 * s, baseY + 8, 12 * s, A.ink);
  }

  function outline(x, baseY, w, h, col) {
    var l = x - w / 2, tp = baseY - h;
    game.draw.line(l, tp, l + w, tp, col, 6);
    game.draw.line(l + w, tp, l + w, baseY, col, 6);
    game.draw.line(l + w, baseY, l, baseY, col, 6);
    game.draw.line(l, baseY, l, tp, col, 6);
  }

  function drawPads(t) {
    for (var i = 0; i < 2; i++) {
      var x = PADS[i];
      game.draw.rect(x - 220, PAD_Y, 440, 40, A.steel);
      game.draw.rect(x - 220, PAD_Y, 440, 8, A.white, 0.6);
      game.draw.rect(x - 200, PAD_Y + 40, 400, 120, A.dark);
      // 押せる側の床(明るく縁を光らせる)
      var on = pair && !pair.done && pair.slide <= 0 && mode !== S.RESULT;
      game.draw.rect(x - 240, Math.round(H * 0.73), 480, 150, on ? A.white : A.steel, on ? 0.35 + Math.sin(t * 6 + i) * 0.1 : 0.15);
    }
  }

  function drawPair(t) {
    if (!pair) return;
    var off = pair.slide > 0 ? pair.slide / 0.25 : 0;
    for (var i = 0; i < 2; i++) {
      var b = pair.bags[i];
      if (pair.done) continue;
      var x = PADS[i] + (i === 0 ? -1 : 1) * off * 700;
      var pulse = 0.4 + Math.sin(t * 8) * 0.25;
      outline(x, PAD_Y, b.w + 26, b.h + 26, A.white);
      game.draw.rect(x - b.w / 2 - 13, PAD_Y - b.h - 13, b.w + 26, 6, A.white, pulse);
      drawBag(b, x, PAD_Y, 1, false, t);
    }
    if (!pair.done && pair.slide <= 0) {
      var k = pair.t / pair.limit, warn = k > 0.7 && Math.floor(t * 10) % 2 === 0;
      game.draw.rect(140, Math.round(H * 0.705), 800, 26, A.ink, 0.6);
      game.draw.rect(146, Math.round(H * 0.705) + 6, 788 * (1 - k), 14, warn ? A.red : A.gold);
    }
  }

  function drawReveal(t) {
    if (!reveal || reveal.t <= 0) return;
    var p = reveal.pair, bi = p.bags[0].big ? 0 : 1, si = 1 - bi;
    var big = p.bags[bi], small = p.bags[si];
    // 小さい方の輪郭を大きい方に重ねて、大きさの差を一瞬見せる
    outline(PADS[bi], PAD_Y, small.w, small.h, reveal.ok ? A.ok : A.red);
    outline(PADS[si], PAD_Y, big.w, big.h, A.gold);
  }

  function drawMovers(t) {
    for (var i = 0; i < movers.length; i++) {
      var q = movers[i];
      var stopped = stopObj && stopT > 0 && stopObj.kind === 'miss';
      var sc = stopped ? 1.15 + (0.5 - stopT) * 0.4 : (q.d > 0 ? Math.max(0.35, 1 - q.d * 1.1) : 1);
      var white = stopped && Math.floor(t * 16) % 2 === 0;
      drawBag(q.bag, q.x, q.y, sc, white, t);
    }
  }

  function drawStaff(t) {
    var fr;
    if (sadT > 0) fr = STAFF_SAD;
    else if (cheerT > 0 || (fin && cleared)) fr = STAFF_JOY;
    else if (nodT > 0) fr = STAFF_POINT;
    else fr = STAFF[Math.floor(t * 6) % 4];
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : Math.sin(t * 3) * 3;
    game.draw.rect(470, H * 0.905, 140, 16, A.ink, 0.3);
    game.draw.sprite(fr, STAFF_PAL, 540, H * 0.85 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, A.ink);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? A.red : A.gold);
    out(sent + ' / ' + NEEDED, W / 2, 116, 50, A.white);
    for (var f = 0; f < FLIGHTS.length; f++) {
      var done = f < fl || (f === fl && flightT > 0) || (fin && cleared);
      game.draw.sprite(PLANE, { w: done ? A.gold : (f === fl ? A.white : '#4a5a7a') }, 120 + f * 90, 176, 5, { anchor: 'center' });
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.rect(W - 130 - m * 64, 156, 40, 40, m < misses ? A.red : '#3a4250');
    out('' + score, W - 240, 116, 34, A.gold);
  }

  function drawScene(t) {
    terminal(t);
    drawPads(t);
    drawPair(t);
    drawReveal(t);
    drawMovers(t);
    drawStaff(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.06);
  }

  // ---- ATTRACT: 本物の choose() で 大きい方を2回送る → 3組目は縦長に釣られて小さい方を選び、輪郭で差を見せる ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0, at: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      cfg = { pairs: 99, diff: 0.25, limit: 9, contrast: true };
      pair = newPair(cfg.diff, cfg.contrast);
      demo.k = 0; demo.at = 0.75;
    }
    stepPair(dt);
    demo.press = false;
    if (!pair || pair.done || pair.slide > 0 || demo.k >= 3) return;
    var bigSide = pair.bags[0].big ? 0 : 1;
    var pick = demo.k === 2 ? 1 - bigSide : bigSide;
    demo.gx += (PADS[pick] - demo.gx) * Math.min(1, dt * 8);
    demo.gy += (PAD_Y - 140 - demo.gy) * Math.min(1, dt * 8);
    demo.at -= dt;
    if (demo.at < 0.1) demo.press = true;
    if (demo.at <= 0) { choose(pick); demo.k++; demo.at = 0.75; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 96, A.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, A.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, A.gold);
      else out('TAP TO START', W / 2, H * 0.955, 40, A.dark);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, A.ink, 0.85);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? A.ok : A.red);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, A.white);
      out(sent + ' / ' + NEEDED + '   ' + (fastest < 99 ? fastest.toFixed(2) + '秒' : '-'), W / 2, H * 0.45, 44, A.gold);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, A.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, A.white);
      if (!cleared) out('あと' + (NEEDED - sent) + '組!', W / 2, H * 0.27, 60, A.gold);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, A.dark);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { sent: sent, misses: misses, fastest: fastest < 99 ? +fastest.toFixed(2) : null, maxCombo: maxCombo, flights: fl + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (flightT > 0) {
      flightT -= dt;
      stepPair(dt);
      if (flightT <= 0) {
        if (fl >= FLIGHTS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          fl++;
          setupFlight(fl);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepPair(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0;
        stopT = 0.45; stopObj = { kind: 'time', x: W / 2, y: PAD_Y - 240 };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(W / 2, H * 0.43, 150 + (0.4 - stopT) * 1000, A.white, 0.3);
    if (!fin && readyT <= 0 && fl === 0 && sent === 0 && playT < 1.6 && pair && !pair.done && pair.slide <= 0) {
      var bs = pair.bags[0].big ? 0 : 1;
      game.draw.hand(PADS[bs], PAD_Y - 140, { press: Math.floor(t * 3) % 2 === 0, scale: 12, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, A.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['B4', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['B4', 1],
      ['C5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['E5', 1],
      ['D5', 0.5], ['F#5', 0.5], ['B5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
    ], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true, bass: [['E2', 2], ['C3', 2], ['A2', 2], ['B2', 2], ['E2', 2], ['B2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
