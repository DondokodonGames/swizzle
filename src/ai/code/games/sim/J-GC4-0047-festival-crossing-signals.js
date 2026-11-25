// J-GC4-0047-festival-crossing-signals.js
// 花火玉の横断 — 祭りの大通りを渡る花火玉の台車のために、左手と右手でそれぞれの車線の信号を止める
// 操作: 画面下の左パネルを押している間は左から来る車線(手前)の荷車が止まり、右パネルを押している間は右から来る車線(奥)が止まる。止めすぎると渋滞メーターがあふれて信号が勝手に開く
// 終わり: 5個の花火玉を打ち上げ台まで渡らせればCLEAR。荷車に当たって花火玉が紙吹雪に散る(3回)か時間切れでGAME OVER
// @mechanic: coop_2zone
// @theme: festival_crossing_signals
// 世界観: 夏祭りの夜、花火職人の見習いが両手で二つの信号旗を操り、ぜんまい台車に載った花火玉を荷車の行き交う大通りの向こうの打ち上げ台まで一つも散らさずに渡す
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡した花火玉の数と散らした数
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きはスプライトの px スケール、接地影で位置を示す
  var STYLE = {
    bg: ['#141a3a', '#2b2d5e', '#4a3b6b'],
    main: ['#5a5f73', '#7c8196', '#c9c7d6'],
    accent: ['#3ee0ff', '#ff4fb4'],
  };
  var CYAN = STYLE.accent[0];
  var PINK = STYLE.accent[1];
  var GOLD = '#ffd34d';
  var GOOD_C = '#7dffa1';
  var BAD_C = '#ff5b5b';

  var GAME_TITLE = 'FESTIVAL CROSSING';
  var TIME_LIMIT = 24;
  var NEEDED = 5;
  var MAX_MISS = 3;

  var LANE_A = { y: 650, h: 190, dir: -1, stop: 720, px: 14 }; // 奥・右から来る
  var LANE_B = { y: 870, h: 190, dir: 1, stop: 360, px: 16 };  // 手前・左から来る
  var CROSS_X = 540;
  var BALL_START = 1370;
  var BALL_GOAL = 590;
  var CAR_W_A = 12 * 14, CAR_W_B = 12 * 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CART = [
    [
      '...rrrrrr...',
      '..rwwrrwwr..',
      '.rrrrrrrrrr.',
      'yrrrrrrrrrry',
      'rrrrrrrrrrrr',
      '.kk......kk.',
      '.kk......kk.',
    ],
    [
      '...rrrrrr...',
      '..rwwrrwwr..',
      '.rrrrrrrrrr.',
      'yrrrrrrrrrry',
      'rrrrrrrrrrrr',
      '..kk....kk..',
      '.kk......kk.',
    ],
  ];
  var BALL = [
    [
      '....f...',
      '...ff...',
      '..oooo..',
      '.oOooOo.',
      '.ooOOoo.',
      '..oooo..',
      '.bbbbbb.',
      '..k..k..',
    ],
    [
      '...f....',
      '...ff...',
      '..oooo..',
      '.oOooOo.',
      '.ooOOoo.',
      '..oooo..',
      '.bbbbbb.',
      '.k....k.',
    ],
  ];
  var BALL_PAL = { f: '#e8d9a0', o: '#ff8a3d', O: '#ffe070', b: '#8a5a3a', k: '#2a2030' };
  var LANTERN = ['.rr.', 'rRRr', 'rRRr', '.rr.'];

  var cars, balls, pend, spawnBallT, gateA, gateB, jamA, jamB, lockA, lockB, crossed, misses;
  var timeLeft, ready, hitStop, hitObj, ended, endWait, won, score, elapsedPlay, launches;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#0b0b1e', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    cars = [];
    balls = [];
    pend = [{ lane: LANE_A, t: 0.9 }, { lane: LANE_B, t: 1.5 }];
    spawnBallT = 0.4;
    gateA = false; gateB = false;
    jamA = 0; jamB = 0; lockA = 0; lockB = 0;
    crossed = 0; misses = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0; hitObj = null;
    ended = false; endWait = 0; won = false;
    score = 0; elapsedPlay = 0;
    launches = [];
  }

  function carSpeed() {
    return 430 + Math.min(1, elapsedPlay / TIME_LIMIT) * 170;
  }

  function scheduleCar(lane) {
    pend.push({ lane: lane, t: game.random(0.9, 1.9) });
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function laneOf(by) {
    if (by > LANE_A.y && by < LANE_A.y + LANE_A.h) return LANE_A;
    if (by > LANE_B.y && by < LANE_B.y + LANE_B.h) return LANE_B;
    return null;
  }

  function stepWorld(dt, demo) {
    elapsedPlay += dt;
    // 渋滞メーター: 止めている車の数だけ溜まる
    var stoppedA = 0, stoppedB = 0;
    for (var c = 0; c < cars.length; c++) {
      if (cars[c].stopped) { if (cars[c].lane === LANE_A) stoppedA++; else stoppedB++; }
    }
    jamA = Math.max(0, jamA + (stoppedA > 0 ? dt * 0.09 * Math.min(3, stoppedA) : -dt * 0.35));
    jamB = Math.max(0, jamB + (stoppedB > 0 ? dt * 0.09 * Math.min(3, stoppedB) : -dt * 0.35));
    if (jamA >= 1 && lockA <= 0) { lockA = 1.2; jamA = 0.45; if (!demo) game.audio.tone('C4', 0.35, { wave: 'sawtooth', volume: 0.08 }); }
    if (jamB >= 1 && lockB <= 0) { lockB = 1.2; jamB = 0.45; if (!demo) game.audio.tone('D4', 0.35, { wave: 'sawtooth', volume: 0.08 }); }
    if (lockA > 0) lockA -= dt;
    if (lockB > 0) lockB -= dt;
    var closedA = gateA && lockA <= 0;
    var closedB = gateB && lockB <= 0;

    // 車の出現(0.6秒前に前照灯で予告)
    for (var p = pend.length - 1; p >= 0; p--) {
      pend[p].t -= dt;
      if (pend[p].t <= 0) {
        var ln = pend[p].lane;
        var w = ln === LANE_A ? CAR_W_A : CAR_W_B;
        cars.push({ lane: ln, x: ln.dir > 0 ? -w - 10 : W + 10, w: w, v: carSpeed(), stopped: false, ph: Math.random() * 6 });
        pend.splice(p, 1);
        scheduleCar(ln);
      } else if (pend[p].t < 0.6 && !pend[p].warned) {
        pend[p].warned = true;
        if (!demo) game.audio.tone(pend[p].lane === LANE_A ? 'E5' : 'B4', 0.08, { wave: 'square', volume: 0.04 });
      }
    }

    // 車の移動と停止線・車間
    for (var i = cars.length - 1; i >= 0; i--) {
      var car = cars[i];
      var L = car.lane;
      var closed = L === LANE_A ? closedA : closedB;
      var nx = car.x + L.dir * car.v * dt;
      var stop = false;
      if (L.dir > 0) {
        var front = car.x + car.w;
        if (closed && front <= L.stop + 2 && front + car.v * dt > L.stop) { nx = L.stop - car.w; stop = true; }
        for (var j = 0; j < cars.length; j++) {
          var o = cars[j];
          if (o !== car && o.lane === L && o.x > car.x && nx + car.w > o.x - 24) { nx = Math.min(nx, o.x - 24 - car.w); stop = stop || o.stopped; }
        }
      } else {
        if (closed && car.x >= L.stop - 2 && car.x - car.v * dt < L.stop) { nx = L.stop; stop = true; }
        for (var k = 0; k < cars.length; k++) {
          var q = cars[k];
          if (q !== car && q.lane === L && q.x < car.x && nx < q.x + q.w + 24) { nx = Math.max(nx, q.x + q.w + 24); stop = stop || q.stopped; }
        }
      }
      car.stopped = stop;
      car.x = nx;
      if (car.x > W + 260 || car.x < -460) cars.splice(i, 1);
    }

    // 花火玉の出発
    spawnBallT -= dt;
    if (spawnBallT <= 0 && balls.length < 3) {
      balls.push({ x: CROSS_X + game.random(-30, 30), y: BALL_START, v: game.random(170, 205), ph: Math.random() * 6 });
      spawnBallT = game.random(2.4, 3.1);
      if (!demo) game.audio.play('se_tap', 0.2);
    }

    // 花火玉の前進と衝突
    for (var b = balls.length - 1; b >= 0; b--) {
      var ball = balls[b];
      ball.y -= ball.v * dt;
      var bl = laneOf(ball.y);
      if (bl) {
        for (var m = 0; m < cars.length; m++) {
          var cc = cars[m];
          if (cc.lane !== bl) continue;
          if (game.hit.rect(cc.x + 10, bl.y + 40, cc.w - 20, bl.h - 70, ball.x - 34, ball.y - 40, 68, 70)) {
            hitStop = 0.45;
            hitObj = { ball: ball, car: cc, demo: demo };
            balls.splice(b, 1);
            return;
          }
        }
      }
      if (ball.y <= BALL_GOAL) {
        balls.splice(b, 1);
        crossed++;
        score += 100 + Math.round(timeLeft * 5);
        launches.push({ x: ball.x, y: BALL_GOAL - 40, t: 0 });
        game.feedback.good(ball.x, BALL_GOAL - 60, { text: 'NICE', color: GOOD_C, count: 16, volume: demo ? 0 : undefined });
        if (!demo) game.audio.play('se_coin', 0.4);
        if (!demo && crossed === 3) {
          game.fx.popup(crossed + ' / ' + NEEDED, W / 2, H * 0.22, { color: GOLD, size: 64 });
          game.audio.play('se_milestone', 0.5);
        }
        if (crossed >= NEEDED && !demo) { endGame(true, demo); return; }
      }
    }
  }

  function resolveHit() {
    var o = hitObj;
    hitObj = null;
    if (!o) return;
    misses++;
    game.feedback.bad(o.ball.x, o.ball.y, { text: 'MISS', volume: o.demo ? 0 : undefined });
    // 花火玉は紙吹雪になって散るだけ
    game.fx.burst(o.ball.x, o.ball.y, { color: GOLD, count: 14, speed: 360 });
    game.fx.burst(o.ball.x, o.ball.y, { color: PINK, count: 14, speed: 300 });
    game.fx.burst(o.ball.x, o.ball.y, { color: CYAN, count: 10, speed: 260 });
    if (misses >= MAX_MISS && !o.demo) endGame(false, false);
  }

  function readGates() {
    var t = game.touches;
    gateA = false; gateB = false;
    for (var i = 0; i < t.length; i++) {
      if (t[i].y < H * 0.6) continue;
      if (t[i].x < W / 2) gateB = true; else gateA = true;
    }
  }

  // ── 描画 ──
  function drawBackground() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.25, STYLE.bg[1]], [0.3, STYLE.bg[2]], [1, '#241c34']]);
    // 遠景の屋台の提灯列(ビルボード)
    for (var i = 0; i < 9; i++) {
      var lx = i * 130 + 30;
      var ly = 400 + Math.sin(tt * 1.5 + i) * 6;
      game.draw.line(lx, 380, lx + 130, 380, '#6b5a7a', 3);
      game.draw.sprite(LANTERN, { r: '#b3283c', R: i % 2 ? '#ffb347' : '#ff6b6b' }, lx + 60, ly, 9, { anchor: 'center' });
    }
    for (var s = 0; s < 14; s++) {
      var sx = (s * 211 + 57) % W, sy = 250 + (s * 97) % 120;
      game.draw.circle(sx, sy, 3, '#ffffff', 0.3 + 0.3 * Math.sin(tt * 2 + s));
    }
    // 歩道
    game.draw.rect(0, 520, W, 130, '#6d6479');
    game.draw.rect(0, 1060, W, H - 1060, '#57506a');
    for (var k = 0; k < 10; k++) game.draw.rect(k * 110, 1060 + (k % 2) * 40, 104, 6, '#6d6479');
    // 車道
    game.draw.rect(0, LANE_A.y, W, LANE_A.h, '#3a3a48');
    game.draw.rect(0, LANE_B.y, W, LANE_B.h, '#43434f');
    game.draw.rect(0, LANE_A.y + LANE_A.h, W, LANE_B.y - LANE_A.y - LANE_A.h, '#2e2e3a');
    game.draw.rect(0, LANE_A.y, W, 6, '#9a98aa');
    game.draw.rect(0, LANE_B.y + LANE_B.h - 6, W, 6, '#9a98aa');
    for (var d = 0; d < 10; d++) game.draw.rect(d * 120 + 20, LANE_B.y - 12, 70, 8, '#e6e3c2');
    // 横断歩道
    for (var z = 0; z < 7; z++) {
      game.draw.rect(CROSS_X - 110, LANE_A.y + 12 + z * 58, 220, 30, '#d9d6e6', 0.55);
    }
    // 環境光の呼吸
    game.draw.rect(0, 0, W, H, STYLE.accent[1], 0.025 + 0.02 * Math.sin(tt * 1.2));
  }

  function drawStopBar(L, closed, lock, color) {
    var x = L.dir > 0 ? L.stop : L.stop;
    var a = closed ? 1 : 0.25;
    var col = lock > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0 ? BAD_C : color;
    game.draw.rect(x - 5, L.y + 8, 10, L.h - 16, col, a);
    if (closed) {
      for (var i = 0; i < 4; i++) game.draw.rect(x - (L.dir > 0 ? 34 : -24), L.y + 20 + i * 44, 10, 26, col, 0.8);
    }
  }

  function drawPend() {
    for (var p = 0; p < pend.length; p++) {
      if (pend[p].t > 0.6) continue;
      var L = pend[p].lane;
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      var ex = L.dir > 0 ? 0 : W - 90;
      if (blink) {
        game.draw.rect(ex, L.y + 50, 90, 26, '#fff6c0', 0.8);
        game.draw.rect(ex, L.y + 110, 90, 26, '#fff6c0', 0.8);
      }
    }
  }

  function drawCars() {
    var tt = game.time.elapsed;
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      var L = c.lane;
      var frame = c.stopped ? 0 : Math.floor(tt * 10 + c.ph) % 2;
      var col = L === LANE_A ? PINK : CYAN;
      var pal = { r: col, w: '#e8f6ff', y: '#fff6a0', k: '#1a1a24' };
      var bob = c.stopped ? 0 : Math.sin(tt * 18 + c.ph) * 2;
      game.draw.rect(c.x + 10, L.y + L.h - 50, c.w - 20, 14, '#000000', 0.35);
      game.draw.sprite(CART[frame], pal, c.x + c.w / 2, L.y + L.h / 2 + 10 + bob, L.px, { anchor: 'center', flipX: L.dir < 0 });
      if (hitObj && hitObj.car === c) game.draw.rect(c.x, L.y + 10, c.w, L.h - 20, '#ffffff', 0.55);
    }
  }

  function drawBalls() {
    var tt = game.time.elapsed;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      var depth = 0.8 + 0.2 * ((b.y - BALL_GOAL) / (BALL_START - BALL_GOAL));
      game.draw.rect(b.x - 32 * depth, b.y + 44 * depth, 64 * depth, 10, '#000000', 0.35);
      game.draw.sprite(BALL[Math.floor(tt * 8 + b.ph) % 2], BALL_PAL, b.x + Math.sin(tt * 5 + b.ph) * 3, b.y, 11 * depth, { anchor: 'center' });
    }
    if (hitObj) {
      var hb = hitObj.ball;
      var sc = 1 + (0.45 - hitStop) * 1.2;
      game.draw.circle(hb.x, hb.y, 70 * sc, '#ffffff', 0.7);
      game.draw.sprite(BALL[0], BALL_PAL, hb.x, hb.y, 12 * sc, { anchor: 'center' });
    }
  }

  function drawLaunchStand() {
    var tt = game.time.elapsed;
    game.draw.rect(CROSS_X - 140, 520, 280, 60, '#3a2b4a');
    game.draw.rect(CROSS_X - 120, 530, 240, 12, GOLD, 0.6 + 0.3 * Math.sin(tt * 3));
    for (var i = launches.length - 1; i >= 0; i--) {
      var l = launches[i];
      l.t += game.time.delta;
      var ly = l.y - l.t * 700;
      if (l.t < 0.45) game.draw.circle(l.x, ly, 10, GOLD);
      else {
        var r = (l.t - 0.45) * 380;
        for (var a = 0; a < 10; a++) {
          var ang = a * 0.628;
          game.draw.circle(l.x + Math.cos(ang) * r, l.y - 315 + Math.sin(ang) * r, 8, a % 2 ? PINK : CYAN, Math.max(0, 1 - (l.t - 0.45) * 1.6));
        }
      }
      if (l.t > 1.2) launches.splice(i, 1);
    }
    // 工房(花火玉の出発点)
    game.draw.rect(CROSS_X - 150, 1300, 300, 110, '#4a3a58');
    game.draw.rect(CROSS_X - 150, 1290, 300, 16, '#8a6a9a');
    game.draw.rect(CROSS_X - 50, 1330, 100, 80, '#221a2e');
  }

  function drawPanels(closedA, closedB) {
    var tt = game.time.elapsed;
    var y0 = H * 0.77;
    var ph = H * 0.19;
    // 左パネル = 手前車線(左から来る)
    var pulseL = 0.12 + 0.06 * Math.sin(tt * 2.2);
    game.draw.rect(30, y0, W / 2 - 45, ph, CYAN, closedB ? 0.55 : pulseL);
    game.draw.rect(30, y0, W / 2 - 45, 8, CYAN);
    game.draw.sprite(CART[0], { r: CYAN, w: '#e8f6ff', y: '#fff6a0', k: '#1a1a24' }, W * 0.25, y0 + ph * 0.42, 12, { anchor: 'center' });
    game.draw.rect(W * 0.25 + 110, y0 + ph * 0.2, 14, ph * 0.45, closedB ? BAD_C : '#ffffff', closedB ? 1 : 0.4);
    // 右パネル = 奥の車線(右から来る)
    var pulseR = 0.12 + 0.06 * Math.sin(tt * 2.2 + 1.5);
    game.draw.rect(W / 2 + 15, y0, W / 2 - 45, ph, PINK, closedA ? 0.55 : pulseR);
    game.draw.rect(W / 2 + 15, y0, W / 2 - 45, 8, PINK);
    game.draw.sprite(CART[0], { r: PINK, w: '#e8f6ff', y: '#fff6a0', k: '#1a1a24' }, W * 0.75, y0 + ph * 0.42, 12, { anchor: 'center', flipX: true });
    game.draw.rect(W * 0.75 - 124, y0 + ph * 0.2, 14, ph * 0.45, closedA ? BAD_C : '#ffffff', closedA ? 1 : 0.4);
    // 渋滞メーター
    game.draw.rect(60, y0 + ph - 46, W / 2 - 105, 18, '#1a1a2a');
    game.draw.rect(60, y0 + ph - 46, (W / 2 - 105) * Math.min(1, jamB), 18, jamB > 0.75 ? BAD_C : GOLD);
    game.draw.rect(W / 2 + 45, y0 + ph - 46, W / 2 - 105, 18, '#1a1a2a');
    game.draw.rect(W / 2 + 45, y0 + ph - 46, (W / 2 - 105) * Math.min(1, jamA), 18, jamA > 0.75 ? BAD_C : GOLD);
  }

  function drawScene() {
    var closedA = gateA && lockA <= 0;
    var closedB = gateB && lockB <= 0;
    drawBackground();
    drawLaunchStand();
    drawPend();
    drawStopBar(LANE_A, closedA, lockA, PINK);
    drawStopBar(LANE_B, closedB, lockB, CYAN);
    drawCars();
    drawBalls();
    drawPanels(closedA, closedB);
  }

  function drawHud() {
    txt(crossed + ' / ' + NEEDED, 70, 110, 54, GOLD, 'left');
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.sprite(BALL[0], BALL_PAL, W - 80 - i * 76, 95, 7, { anchor: 'center', alpha: i < MAX_MISS - misses ? 1 : 0.2 });
    }
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 170, W - 140, 18, '#1a1a2a');
    game.draw.rect(70, 170, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? BAD_C : CYAN);
  }

  // ── ATTRACT ゴースト実演: AIが同じ信号ロジックを操作 ──
  var demo = { t: 0, lx: W * 0.25, ly: H * 0.86, rx: W * 0.75, ry: H * 0.86 };
  function demoNeed(L) {
    // 花火玉がこの車線に入る直前〜通過中で、車が停止線より手前にいる
    for (var i = 0; i < balls.length; i++) {
      var by = balls[i].y;
      if (by < L.y + L.h + 150 && by > L.y - 60) return true;
    }
    return false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; spawnBallT = 0.2; }
    // 後半は奥の車線をわざと止め忘れて失敗例を見せる
    gateB = demoNeed(LANE_B);
    gateA = demoNeed(LANE_A) && cyc < 4.2;
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit();
    } else {
      stepWorld(dt, true);
    }
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ended) return;
    if (y >= H * 0.6) {
      game.audio.play('se_tap', 0.25);
      game.fx.burst(x, y, { color: x < W / 2 ? CYAN : PINK, count: 6, speed: 160 });
    } else {
      game.audio.tone('G3', 0.05, { wave: 'triangle', volume: 0.04 });
    }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || ended) return;
    if (y >= H * 0.6) game.audio.tone(x < W / 2 ? 'C5' : 'E5', 0.05, { wave: 'triangle', volume: 0.04 });
  });

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
  });

  game.onUpdate(function (dt) {
    if (!cars) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      if (gateB) game.draw.hand(W * 0.25, H * 0.87, { press: true, scale: 13 });
      else game.draw.hand(W * 0.22, H * 0.9, { press: false, scale: 13 });
      if (gateA) game.draw.hand(W * 0.75, H * 0.87, { press: true, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.075, 58, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 32, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.745, 44, GOLD);
      else txt('INSERT COIN', W / 2, H * 0.745, 34, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 84, won ? GOOD_C : BAD_C);
      txt('SCORE ' + score, W / 2, H * 0.155, 46, '#ffffff');
      txt(crossed + ' / ' + NEEDED, W / 2, H * 0.195, 40, GOLD);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.235, 40, GOLD);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.235, 34, STYLE.main[2]);
      if (!won) txt('あと' + (NEEDED - crossed) + '個!', W / 2, H * 0.3, 48, GOLD);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.745, 36, '#ffffff');
      return;
    }

    // PLAYING
    readGates();
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { crossed: crossed, scattered: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit();
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
        endGame(false, false);
      } else {
        stepWorld(dt, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, GOLD);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G4', 0.5], ['A4', 0.25], ['C5', 0.25], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.25], ['E4', 0.25], ['G4', 1]],
      { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
