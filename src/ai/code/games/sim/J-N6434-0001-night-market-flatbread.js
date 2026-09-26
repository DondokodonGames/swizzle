// J-N6434-0001-night-market-flatbread.js
// 夜市の平焼きパン — 注文札の数ぴったりに具を乗せ、生地を叩いて出す。1個でも多い/少ないと焦げて台無し
// 操作: 下の具の箱をタップするたびに1個乗る。数がそろったら生地をタップして出す
// 終わり: 3枚出せばCLEAR。2枚台無しにする/時間切れでGAME OVER
// @mechanic: count_exact
// @theme: night_market_flatbread_order
// 世界観: 川沿いの夜市で屋台を任された見習い焼き手が、客の差し出す注文札の数どおりに輪切りの実・茸・葉を鉄板の生地へ乗せ、行列が崩れる前に3枚焼き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 出した枚数とぴったり数
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、ベタ塗り数色
  var F = {
    night1: '#1f2a4d', night2: '#3b3f7a', stall: '#ff7a59', stall2: '#ffd166', plate: '#f2f4f8',
    dough: '#f6d7a7', dough2: '#e8b979', crust: '#c98b4a', ink: '#1b1f33', mint: '#2ec4b6',
    red: '#ef476f', leaf: '#3fbf5f', cap: '#a0714f', white: '#ffffff', lamp: '#ffe29a'
  };

  var GAME_TITLE = 'FLATBREAD';
  var TIME_LIMIT = 16;
  var NEEDED = 3;
  var STRIKES = 2;
  var DOUGH_X = W / 2, DOUGH_Y = H * 0.5, DOUGH_R = 230;
  var BIN_Y = H * 0.84;
  var BIN_X = [W * 0.2, W * 0.5, W * 0.8];
  var BIN_R = 120;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ICONS = [
    ['.rrrr.', 'rryyrr', 'ryrryr', 'ryrryr', 'rryyrr', '.rrrr.'],
    ['.cccc.', 'cccccc', 'cwccwc', '..ss..', '..ss..', '.ssss.'],
    ['....gg', '..ggg.', '.gggg.', 'ggggg.', 'gg.g..', 'g.....']
  ];
  var ICON_PAL = [{ r: F.red, y: '#ffb3c1' }, { c: F.cap, w: F.white, s: '#f3e3cf' }, { g: F.leaf }];
  var GUEST = [
    ['..hhh...', '.hhhhh..', '..fff...', '..fff...', '.bbbbb..', 'bbbbbbb.', '.bbbbb..', '.b...b..'],
    ['..hhh...', '.hhhhh..', '..fff...', '..fff...', '.bbbbb..', 'bbbbbbb.', '.bbbbb..', '..b.b...']
  ];

  var order, placed, pieces, served, ruined, exactStreak, timeLeft, ready, hitStop, endWait, done, ok, why;
  var doughFlash, burnT, serveAnim, orderNo;

  function newOrder() {
    orderNo++;
    var kinds = orderNo === 1 ? 2 : 3;
    var maxN = orderNo === 1 ? 3 : (orderNo === 2 ? 4 : 5);
    order = [0, 0, 0];
    var start = Math.floor(game.random(0, 3));
    for (var k = 0; k < kinds; k++) order[(start + k) % 3] = 1 + Math.floor(game.random(1, maxN));
    placed = [0, 0, 0];
    pieces = [];
    burnT = 0;
  }

  function initGame() {
    served = 0; ruined = 0; exactStreak = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
    doughFlash = 0; serveAnim = 0; orderNo = 0;
    newOrder();
  }

  function addTopping(kind) {
    placed[kind]++;
    var n = pieces.length;
    var a = n * 2.39996, rr = 40 + (n % 5) * 34;
    pieces.push({ kind: kind, x: Math.cos(a) * rr, y: Math.sin(a) * rr, drop: 0.18 });
    if (order[kind] === 0) return 'wrong';
    if (placed[kind] > order[kind]) return 'over';
    if (placed[kind] === order[kind]) return 'hit';
    return 'ok';
  }

  function isExact() {
    for (var k = 0; k < 3; k++) if (placed[k] !== order[k]) return false;
    return true;
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x, y, { size: size, color: color || F.white, bold: true, align: 'center' });
  }

  function roundRect(x, y, w, h, r, color, a) {
    game.draw.rect(x + r, y, w - r * 2, h, color, a);
    game.draw.rect(x, y + r, w, h - r * 2, color, a);
    game.draw.circle(x + r, y + r, r, color, a);
    game.draw.circle(x + w - r, y + r, r, color, a);
    game.draw.circle(x + r, y + h - r, r, color, a);
    game.draw.circle(x + w - r, y + h - r, r, color, a);
  }

  function drawMarket() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, F.night1], [0.55, F.night2], [1, F.night1]]);
    // 提灯の列(常時揺れる)
    for (var i = 0; i < 7; i++) {
      var lx = 80 + i * 155, ly = H * 0.16 + Math.sin(t * 1.5 + i) * 10;
      game.draw.line(lx, H * 0.13, lx, ly - 30, F.lamp, 3);
      game.draw.circle(lx, ly, 30, i % 2 ? F.stall : F.lamp);
      game.draw.circle(lx, ly, 48, F.lamp, 0.12 + 0.06 * Math.sin(t * 3 + i));
    }
    // 屋台のひさし(フラットな縞)
    for (var s = 0; s < 8; s++) game.draw.rect(s * (W / 8), H * 0.25, W / 8, 60, s % 2 ? F.stall : F.white);
    for (var s2 = 0; s2 < 8; s2++) game.draw.circle(s2 * (W / 8) + W / 16, H * 0.25 + 60, W / 16, s2 % 2 ? F.stall : F.white);
    // 鉄板の台
    roundRect(W * 0.08, H * 0.34, W * 0.84, H * 0.34, 40, '#2b3160');
    game.draw.rect(0, 0, W, H, F.lamp, 0.02 + 0.02 * Math.sin(t * 1.1));
  }

  function drawGuestAndTicket() {
    var t = game.time.elapsed;
    // 客(列の先頭だけ実体、後ろは半透明の影)
    for (var q = 2; q >= 0; q--) {
      var gx = W * 0.22 - q * 70, gy = H * 0.215 - q * 10 + Math.sin(t * 2.2 + q) * 5;
      game.draw.sprite(GUEST[Math.floor(t * 2 + q) % 2], { h: '#20264a', f: '#f1c27d', b: q === 0 ? F.mint : '#4b5190' }, gx, gy, 12, { anchor: 'center', alpha: q === 0 ? 1 : 0.4 });
    }
    // 注文札
    roundRect(W * 0.36, H * 0.13, W * 0.56, 150, 24, F.white);
    var col = 0;
    for (var k = 0; k < 3; k++) {
      if (order[k] === 0) continue;
      var ix = W * 0.44 + col * 190;
      game.draw.sprite(ICONS[k], ICON_PAL[k], ix, H * 0.13 + 75, 11, { anchor: 'center' });
      txt('x' + order[k], ix + 85, H * 0.13 + 78, 52, F.ink);
      col++;
    }
  }

  function drawDough() {
    var t = game.time.elapsed;
    var pop = serveAnim > 0 ? 1 + serveAnim * 0.6 : 1;
    var r = DOUGH_R * pop;
    var burnt = burnT > 0;
    game.draw.circle(DOUGH_X, DOUGH_Y, r + 18, burnt ? '#3a2a22' : F.crust);
    game.draw.circle(DOUGH_X, DOUGH_Y, r, doughFlash > 0 ? F.white : (burnt ? '#6b4a33' : F.dough));
    game.draw.circle(DOUGH_X - 60, DOUGH_Y - 50, 30, F.dough2, 0.6);
    game.draw.circle(DOUGH_X + 80, DOUGH_Y + 60, 22, F.dough2, 0.6);
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      var lift = p.drop > 0 ? p.drop * 500 : 0;
      game.draw.sprite(ICONS[p.kind], ICON_PAL[p.kind], DOUGH_X + p.x * pop, DOUGH_Y + p.y * pop - lift, 9, { anchor: 'center' });
    }
    // 湯気
    for (var s = 0; s < 3; s++) {
      var sy = DOUGH_Y - r - 40 - ((t * 60 + s * 40) % 120);
      game.draw.circle(DOUGH_X - 60 + s * 60, sy, 16, F.white, 0.15);
    }
  }

  function drawBins() {
    for (var k = 0; k < 3; k++) {
      var bx = BIN_X[k];
      var pulse = order[k] > 0 && placed[k] < order[k] ? 0.08 * Math.sin(game.time.elapsed * 5) : 0;
      game.draw.circle(bx, BIN_Y, BIN_R * (1 + pulse), F.white);
      game.draw.circle(bx, BIN_Y, BIN_R * 0.82, k === 0 ? '#ffe3e8' : (k === 1 ? '#f3e3cf' : '#dff5e3'));
      game.draw.sprite(ICONS[k], ICON_PAL[k], bx, BIN_Y, 16, { anchor: 'center' });
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W * 0.1 + i * 70, 80, 26, i < served ? F.stall2 : '#4b5190');
    for (var j = 0; j < STRIKES; j++) game.draw.circle(W * 0.9 - j * 70, 80, 22, j < ruined ? F.red : '#4b5190');
    txt(served + ' / ' + NEEDED, W / 2, 80, 48);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    roundRect(70, 150, W - 140, 22, 11, '#4b5190');
    var bw = (W - 140) * Math.max(0, timeLeft / TIME_LIMIT);
    if (bw > 22) roundRect(70, 150, bw, 22, 11, low ? F.red : F.mint);
  }

  function tickVisual(dt) {
    for (var i = 0; i < pieces.length; i++) if (pieces[i].drop > 0) pieces[i].drop = Math.max(0, pieces[i].drop - dt);
    if (doughFlash > 0) doughFlash -= dt;
    if (serveAnim > 0) serveAnim -= dt;
    if (burnT > 0) { burnT -= dt; if (burnT <= 0) newOrder(); }
  }

  // ── ATTRACT: 札どおりに乗せて出す(成功)→ 1個多く乗せて出す(焦げる=失敗)を実ロジックで
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, step: 0, clock: 0, plan: [], fail: false };
  function buildPlan(extra) {
    var plan = [];
    for (var k = 0; k < 3; k++) for (var n = 0; n < order[k]; n++) plan.push(k);
    if (extra) plan.push(plan[0]);
    plan.push(-1);
    return plan;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { orderNo = 0; newOrder(); demo.plan = buildPlan(false); demo.step = 0; demo.clock = 0.5; demo.fail = false; }
    tickVisual(dt);
    if (burnT > 0) return;
    demo.clock -= dt;
    demo.press = demo.clock < 0.12;
    if (demo.clock <= 0 && demo.step < demo.plan.length) {
      var a = demo.plan[demo.step++];
      if (a >= 0) {
        addTopping(a); demo.gx = BIN_X[a]; demo.gy = BIN_Y;
        game.fx.burst(BIN_X[a], BIN_Y, { color: F.white, count: 4 });
      } else {
        demo.gx = DOUGH_X; demo.gy = DOUGH_Y;
        if (isExact()) { serveAnim = 0.3; doughFlash = 0.15; game.fx.popup('PERFECT', DOUGH_X, DOUGH_Y - 280, { color: F.stall2, size: 56 }); newOrder(); demo.plan = buildPlan(true); demo.step = 0; }
        else { burnT = 0.8; game.fx.popup('MISS', DOUGH_X, DOUGH_Y - 280, { color: F.red, size: 56 }); demo.plan = []; }
      }
      demo.clock = 0.4;
    }
    if (demo.step < demo.plan.length) {
      var nx = demo.plan[demo.step] >= 0 ? BIN_X[demo.plan[demo.step]] : DOUGH_X;
      var ny = demo.plan[demo.step] >= 0 ? BIN_Y : DOUGH_Y;
      demo.gx += (nx - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (ny - demo.gy) * Math.min(1, dt * 8);
    }
  }

  function strike(x, y) {
    ruined++; exactStreak = 0; burnT = 0.8;
    game.feedback.bad(x, y, { text: 'MISS' });
    if (ruined >= STRIKES) { hitStop = 0.5; doughFlash = 0.5; why = 'burn'; ok = false; }
  }

  function serve() {
    if (isExact()) {
      served++; exactStreak++;
      serveAnim = 0.35; doughFlash = 0.15;
      game.feedback.good(DOUGH_X, DOUGH_Y - 200, { text: exactStreak >= 2 ? 'PERFECT' : 'GOOD', color: F.stall2, count: 16 });
      game.audio.play('se_coin', 0.4);
      if (served === NEEDED - 1) { game.audio.play('se_milestone', 0.4); game.fx.popup('あと1枚!', W / 2, H * 0.3, { color: F.white, size: 50 }); }
      if (served >= NEEDED) { hitStop = 0.45; ok = true; why = 'clear'; }
      else newOrder();
    } else {
      strike(DOUGH_X, DOUGH_Y);
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0 || burnT > 0) { game.audio.play('se_tap', 0.06); return; }
    for (var k = 0; k < 3; k++) {
      if (game.hit.circle(x, y, 1, BIN_X[k], BIN_Y, BIN_R)) {
        var res = addTopping(k);
        game.audio.play('se_tap', 0.3);
        game.fx.burst(BIN_X[k], BIN_Y, { color: F.white, count: 5 });
        if (res === 'wrong' || res === 'over') strike(DOUGH_X, DOUGH_Y);
        else if (res === 'hit') game.audio.tone('E5', 0.08, { wave: 'sine', volume: 0.06 });
        return;
      }
    }
    if (game.hit.circle(x, y, 1, DOUGH_X, DOUGH_Y, DOUGH_R + 20)) { serve(); return; }
    game.fx.burst(x, y, { color: F.lamp, count: 2, speed: 60 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      stepDemo(dt);
      drawMarket(); drawGuestAndTicket(); drawDough(); drawBins();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.045, 72, F.stall2);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.085, 32);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, F.stall2);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawMarket(); drawDough();
      var score = served * 100 + exactStreak * 20 + (ok ? Math.ceil(timeLeft) * 10 : 0);
      roundRect(W * 0.1, H * 0.62, W * 0.8, H * 0.28, 40, F.white);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.67, 96, ok ? F.mint : F.red);
      txt(served + ' / ' + NEEDED, W / 2, H * 0.73, 52, F.ink);
      txt('SCORE ' + score, W / 2, H * 0.78, 40, F.ink);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.83, 44, F.stall);
      else if (!ok) txt('あと' + (NEEDED - served) + '枚!', W / 2, H * 0.83, 44, F.stall);
      txt('BEST ' + game.best, W / 2, H * 0.87, 30, F.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { served: served, ruined: ruined };
        if (ok) game.end.success(served * 100 + exactStreak * 20 + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (doughFlash > 0) doughFlash -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.fx.burst(DOUGH_X, DOUGH_Y, { color: F.stall2, count: 30, speed: 420 }); game.audio.play('se_success', 0.5); }
        else { game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      tickVisual(dt);
      if (timeLeft <= 0) {
        timeLeft = 0; hitStop = 0.5; doughFlash = 0.5; ok = false; why = 'time';
        game.feedback.bad(DOUGH_X, DOUGH_Y, { text: 'TIME UP' });
      }
    }

    drawMarket(); drawGuestAndTicket(); drawDough(); drawBins(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, DOUGH_Y, 100, F.stall2);
  });

  game.onStart(function () {
    game.audio.melody(
      [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 1]],
      { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F2', 2], ['A2', 2], ['G2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
