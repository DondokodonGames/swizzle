// J-3DSDSDSTOP10-0013-rooftop-robot-penalty.js
// 屋上ロボPK — 押して溜め、キーパーロボのいない側へ離して蹴り込む。溜めすぎはバーの上へ
// 操作: 蹴りたい側(左/中/右)を押し続けてパワーを溜め、離して蹴る。押したまま左右に動かすと狙いが変わる
// 終わり: 4点決めればCLEAR。ボール7球を使い切る/時間切れでGAME OVER
// @mechanic: hold_charge
// @theme: rooftop_robot_penalty
// 世界観: 夕暮れのビル屋上コートで、ブリキの見習いロボが古参のキーパーロボにPK勝負を挑み、構えの傾きを読んで空いた側へ溜めた一蹴りを決める
// 残るもの: 正誤(CLEAR/GAME OVER) + ゴール数・ぴったり溜め(PERFECT)数・使った球数
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = {
    bg: ['#4b1fd1', '#ff6fb5', '#1a0b52'],
    main: ['#ffffff', '#00c8ff', '#2ee07a'],
    accent: ['#ffe100', '#ff2d55'],
  };
  var INK = '#12051f', WHITE = '#ffffff', CYAN = '#00c8ff', LIME = '#2ee07a', YEL = '#ffe100', RED = '#ff2d55', PUR = '#4b1fd1';

  var GAME_TITLE = 'ROBO PK';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var BALLS = 7;
  var GOAL_Y = Math.round(H * 0.25);
  var GOAL_L = 170, GOAL_R = W - 170;
  var BALL_Y = Math.round(H * 0.73);
  var LANES = [W * 0.28, W * 0.5, W * 0.72];
  var CHARGE_RATE = 0.85;
  var SWEET = [0.6, 0.92];
  var PERFECT_BAND = [0.8, 0.92];
  var AIM_WAIT = 3;

  var KICKER_A = ['..yy..', '.yyyy.', 'yywwyy', '.yyyy.', 'cc..cc', '.cccc.', '.c..c.', 'cc..cc'];
  var KICKER_B = ['..yy..', '.yyyy.', 'yywwyy', '.yyyy.', 'cc..cc', '.cccc.', '.c...c', 'cc...c'];
  var KICKER_PAL = { y: YEL, w: INK, c: CYAN };
  var KEEPER_A = ['..rrrr..', '.rrrrrr.', 'rrwwwwrr', 'rrwkkwrr', '.rrrrrr.', 'gg.rr.gg', 'gg.rr.gg', '..r..r..', '.rr..rr.'];
  var KEEPER_B = ['..rrrr..', '.rrrrrr.', 'rrwwwwrr', 'rrkwwkrr', '.rrrrrr.', 'gg.rr.gg', '.g.rr.g.', '..r..r..', '.rr..rr.'];
  var KEEPER_PAL = { r: RED, w: WHITE, k: INK, g: LIME };
  var BALL = ['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'];
  var BALL_PAL = { w: WHITE, k: INK };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var m = null;

  function pop(str, x, y, sz, col) {
    game.draw.text(str, x + 5, y + 6, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function box(x, y, w, h, col) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, INK);
    game.draw.rect(x, y, w, h, col);
  }

  function initGame() {
    m = {
      phase: 'aim', aimT: AIM_WAIT, lane: 1, power: 0, charging: false,
      ball: { x: W / 2, y: BALL_Y, s: 1, t: 0, tx: 0, ty: 0, over: false },
      keeper: { lane: 1, x: LANES[1], target: 1, lean: 0, moveCd: 1.1, dive: 0 },
      goals: 0, used: 0, perfect: 0, streak: 0, outcome: '', afterT: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: null,
      finished: false, done: false, ok: false, endWait: 0,
    };
  }

  function laneFromX(x) { return x < W * 0.39 ? 0 : x > W * 0.61 ? 2 : 1; }

  function beginCharge(x) {
    if (m.phase !== 'aim' || m.finished) return;
    m.phase = 'charge'; m.charging = true; m.power = 0; m.lane = laneFromX(x);
    game.audio.tone('C4', 0.08, { wave: 'square', volume: 0.05 });
  }

  function kick() {
    if (m.phase !== 'charge') return;
    m.charging = false;
    m.used++;
    m.phase = 'fly';
    var p = m.power;
    var b = m.ball;
    b.t = 0; b.tx = LANES[m.lane] + (m.lane - 1) * 40; b.ty = GOAL_Y + 70 - Math.min(1, p) * 60;
    b.over = p > SWEET[1];
    b.dur = 0.75 - Math.min(1, p) * 0.4;
    game.audio.play('se_jump', 0.5);
    game.fx.popup(Math.round(Math.min(1.25, p) * 100) + '%', W / 2 + 180, BALL_Y - 80, { color: p > SWEET[1] ? RED : p >= SWEET[0] ? LIME : WHITE, size: 50 });
    // キーパーは蹴った方向へ飛びつく(弱い球ほど間に合う)
    var k = m.keeper;
    // 傾いていた側へはそのまま飛ぶ(予告どおり)。弱い球には追いつく
    k.dive = p < SWEET[0] ? 1 : 0.55;
    if (k.lean === 0) k.target = k.lane;
    if (p < SWEET[0]) k.target = m.lane;
    k.lean = 0;
  }

  function resolve() {
    var b = m.ball, k = m.keeper, p = m.power;
    m.phase = 'after'; m.afterT = 0.75;
    var perfect = p >= PERFECT_BAND[0] && p <= PERFECT_BAND[1];
    var saved = !b.over && (p < SWEET[0] || (k.lane === m.lane && !perfect));
    if (b.over) {
      m.outcome = 'over'; m.streak = 0;
      m.hl = { x: b.x, y: b.y }; m.hitStop = 0.35;
      game.feedback.bad(b.x, GOAL_Y - 60, { text: 'MISS' });
    } else if (saved) {
      m.outcome = 'save'; m.streak = 0;
      m.hl = { x: k.x, y: GOAL_Y + 40 }; m.hitStop = 0.35;
      game.feedback.bad(k.x, GOAL_Y - 40, { text: 'MISS', color: RED });
    } else {
      m.outcome = 'goal'; m.goals++; m.streak++;
      if (perfect) m.perfect++;
      m.hl = { x: b.x, y: b.y }; m.hitStop = 0.25;
      game.feedback.good(b.x, b.y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : LIME, count: 22 });
      game.fx.shake(10, 0.2);
      if (m.goals === 2) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.42, { color: YEL, size: 70 });
      }
      if (m.goals >= NEEDED) { m.finished = true; m.ok = true; finish(); return; }
    }
    if (m.used >= BALLS && !m.finished) { m.finished = true; m.ok = false; finish(); }
  }

  function nextBall() {
    m.phase = 'aim'; m.aimT = AIM_WAIT; m.power = 0; m.hl = null;
    m.ball = { x: W / 2, y: BALL_Y, s: 1, t: 0, tx: 0, ty: 0, over: false };
    m.keeper.dive = 0;
  }

  function finish() {
    if (m.done) return;
    m.done = true; m.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(m.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function run(dt) {
    if (m.hitStop > 0) { m.hitStop -= dt; return; }
    var k = m.keeper;
    // キーパー: 構えを傾けて(予告)から隣の列へ移る
    if (m.phase === 'aim' || m.phase === 'charge') {
      k.moveCd -= dt;
      if (k.moveCd <= 0.6 && k.lean === 0) {
        var opts = k.lane === 1 ? [0, 2] : [1, k.lane === 0 ? 2 : 0];
        k.target = opts[Math.floor(Math.random() * opts.length)];
        k.lean = k.target > k.lane ? 1 : -1;
      }
      if (k.moveCd <= 0) { k.lane = k.target; k.lean = 0; k.moveCd = 0.9 + Math.random() * 0.7; }
    }
    if (m.phase === 'fly' && k.dive > 0) {
      k.lane = k.target;
    }
    k.x += (LANES[k.lane] - k.x) * Math.min(1, dt * (m.phase === 'fly' ? 9 : 6));

    if (m.phase === 'aim') {
      m.aimT -= dt;
      if (m.aimT <= 0 && !m.finished) {
        // 構えたまま蹴らない: 1球失う
        m.used++; m.streak = 0;
        game.feedback.bad(W / 2, BALL_Y - 60, { text: 'MISS' });
        if (m.used >= BALLS) { m.finished = true; m.ok = false; finish(); }
        else nextBall();
      }
    } else if (m.phase === 'charge') {
      m.power += CHARGE_RATE * dt;
      if (Math.floor(m.power * 10) !== Math.floor((m.power - CHARGE_RATE * dt) * 10)) {
        game.audio.tone(220 + m.power * 500, 0.05, { wave: 'square', volume: 0.04 });
        if (Math.abs(m.power - SWEET[0]) < 0.06) game.audio.play('se_powerup', 0.3);
      }
      if (m.power >= 1.25) kick();
    } else if (m.phase === 'fly') {
      var b = m.ball;
      b.t += dt;
      var q = Math.min(1, b.t / b.dur);
      b.x = W / 2 + (b.tx - W / 2) * q;
      var ty = b.over ? GOAL_Y - 260 : b.ty;
      b.y = BALL_Y + (ty - BALL_Y) * q - Math.sin(q * Math.PI) * (b.over ? 180 : 90);
      b.s = 1 - q * 0.45;
      if (q >= 1) resolve();
    } else if (m.phase === 'after') {
      m.afterT -= dt;
      if (m.afterT <= 0 && !m.finished) nextBall();
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawCourt() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#1a0b52'], [0.35, PUR], [0.62, '#ff6fb5'], [1, '#ffb36b']]);
    game.draw.rect(0, 0, W, H, WHITE, 0.03 + 0.03 * Math.sin(t * 1.5));
    // ビル群
    for (var i = 0; i < 8; i++) {
      var bh = 180 + ((i * 97) % 160);
      game.draw.rect(i * 140 - 20, GOAL_Y - 40 - bh, 120, bh, '#2a1070');
      if (Math.floor(t * 2 + i) % 3 === 0) game.draw.rect(i * 140 + 20, GOAL_Y - bh, 22, 22, YEL);
    }
    // コート
    game.draw.rect(0, GOAL_Y - 40, W, H - GOAL_Y + 40, '#2b7a4b');
    for (var s = 0; s < 6; s++) game.draw.rect(0, GOAL_Y - 40 + s * 200, W, 100, '#2f8653');
    game.draw.line(0, GOAL_Y + 150, W, GOAL_Y + 150, WHITE, 8);
    game.draw.circle(W / 2, BALL_Y, 16, WHITE);
    // フェンス
    for (var f = 0; f < 12; f++) game.draw.line(f * 100, GOAL_Y - 120, f * 100 + 60, GOAL_Y - 40, '#8f7cff', 3);
    // ゴール(太い縁取り)
    game.draw.rect(GOAL_L - 14, GOAL_Y - 150, 28, 200, INK);
    game.draw.rect(GOAL_R - 14, GOAL_Y - 150, 28, 200, INK);
    game.draw.rect(GOAL_L - 14, GOAL_Y - 164, GOAL_R - GOAL_L + 28, 28, INK);
    game.draw.rect(GOAL_L - 6, GOAL_Y - 150, 12, 196, WHITE);
    game.draw.rect(GOAL_R - 6, GOAL_Y - 150, 12, 196, WHITE);
    game.draw.rect(GOAL_L - 6, GOAL_Y - 156, GOAL_R - GOAL_L + 12, 12, WHITE);
    for (var n = 1; n < 9; n++) game.draw.line(GOAL_L + n * (GOAL_R - GOAL_L) / 9, GOAL_Y - 140, GOAL_L + n * (GOAL_R - GOAL_L) / 9, GOAL_Y + 40, 'rgba(255,255,255,0.35)', 2);
  }

  function drawKeeper() {
    var t = game.time.elapsed, k = m.keeper;
    var art = Math.floor(t * 4) % 2 === 0 ? KEEPER_A : KEEPER_B;
    var lx = k.x + k.lean * 26 + Math.sin(t * 3) * 5;
    var ly = GOAL_Y - 20 + Math.cos(t * 5) * 4;
    game.draw.circle(lx, GOAL_Y + 56, 60, INK, 0.3);
    var sc = m.hl && m.outcome === 'save' && m.hitStop > 0 ? 17 : 14;
    game.draw.sprite(art, KEEPER_PAL, lx, ly, sc, { anchor: 'center' });
    if (k.lean !== 0 && Math.floor(t * 10) % 2 === 0) {
      // 移る側への予告矢印
      var ax = lx + k.lean * 110;
      game.draw.line(lx + k.lean * 70, ly - 80, ax, ly - 80, YEL, 12);
      game.draw.line(ax, ly - 80, ax - k.lean * 30, ly - 105, YEL, 12);
      game.draw.line(ax, ly - 80, ax - k.lean * 30, ly - 55, YEL, 12);
    }
  }

  function drawShooter() {
    var t = game.time.elapsed, b = m.ball;
    // 狙い線
    if (m.phase === 'aim' || m.phase === 'charge') {
      var tx = LANES[m.lane];
      for (var d = 1; d < 8; d++) {
        var q = d / 8;
        game.draw.circle(W / 2 + (tx - W / 2) * q, BALL_Y + (GOAL_Y - BALL_Y) * q, 9, m.phase === 'charge' ? YEL : WHITE, 0.7);
      }
    }
    var kx = W / 2 - 110, ky = BALL_Y + 40 + Math.sin(t * 3) * 6;
    var kart = m.phase === 'fly' || Math.floor(t * 3) % 2 === 0 ? KICKER_B : KICKER_A;
    game.draw.sprite(kart, KICKER_PAL, kx, ky, 15, { anchor: 'center' });
    var bs = (m.hl && m.hitStop > 0 && m.outcome !== 'save' ? 20 : 14) * b.s;
    game.draw.circle(b.x, (m.phase === 'fly' ? BALL_Y + (GOAL_Y - BALL_Y) * Math.min(1, b.t / (b.dur || 1)) : b.y) + 30 * b.s, 40 * b.s, INK, 0.25);
    game.draw.circle(b.x, b.y, 42 * b.s, INK);
    game.draw.sprite(BALL, BALL_PAL, b.x, b.y, bs, { anchor: 'center' });
    if (m.hl && m.hitStop > 0) game.draw.circle(m.hl.x, m.hl.y, 110, WHITE, 0.35);
  }

  function drawMeter() {
    // 親指ゾーン: 3列の押し場所 + パワー計
    var y0 = H * 0.8;
    for (var i = 0; i < 3; i++) {
      var cx = LANES[i];
      var on = m.phase === 'charge' && m.lane === i;
      game.draw.circle(cx, y0 + 60, 70, INK);
      game.draw.circle(cx, y0 + 60, 60, on ? YEL : '#6a3cff');
      game.draw.sprite(BALL, BALL_PAL, cx, y0 + 60, 8, { anchor: 'center' });
    }
    var bx = 110, bw = W - 220, by = H * 0.9;
    box(bx, by, bw, 50, '#2a1070');
    game.draw.rect(bx + bw * (SWEET[0] / 1.25), by, bw * ((SWEET[1] - SWEET[0]) / 1.25), 50, LIME);
    game.draw.rect(bx + bw * (PERFECT_BAND[0] / 1.25), by, bw * ((PERFECT_BAND[1] - PERFECT_BAND[0]) / 1.25), 50, YEL);
    game.draw.rect(bx + bw * (SWEET[1] / 1.25), by, bw * (1 - SWEET[1] / 1.25), 50, RED);
    var px = bx + bw * Math.min(1, m.power / 1.25);
    game.draw.rect(px - 8, by - 20, 16, 90, INK);
    game.draw.rect(px - 4, by - 16, 8, 82, WHITE);
  }

  function drawHud() {
    box(30, 30, W - 60, 180, '#1a0b52');
    pop(m.goals + ' / ' + NEEDED, 200, 100, 64, YEL);
    for (var i = 0; i < BALLS; i++) {
      game.draw.circle(560 + i * 64, 90, 24, INK);
      game.draw.circle(560 + i * 64, 90, 18, i < m.used ? '#5a4a8a' : WHITE);
    }
    var frac = Math.max(0, m.timeLeft / TIME_LIMIT);
    var low = m.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 158, W - 120, 26, INK);
    game.draw.rect(64, 162, (W - 128) * frac, 18, low ? RED : CYAN);
    if (m.phase === 'aim' && m.aimT < 1.5 && !m.finished) {
      game.draw.rect(W / 2 - 100, BALL_Y + 110, 200 * (m.aimT / 1.5), 12, RED);
    }
  }

  function scoreOf() { return m.goals * 1000 + m.perfect * 300 + Math.round(m.timeLeft * 40); }

  function drawResult() {
    box(90, 620, W - 180, 500, '#1a0b52');
    pop(m.ok ? 'CLEAR' : 'GAME OVER', W / 2, 720, 96, m.ok ? LIME : RED);
    pop(m.goals + ' / ' + NEEDED, W / 2, 840, 70, YEL);
    pop('PERFECT ' + m.perfect, W / 2, 930, 44, WHITE);
    var sc = scoreOf();
    if (m.ok && sc > game.best) pop('NEW RECORD', W / 2, 1010, 54, YEL);
    else if (!m.ok) pop('あと' + (NEEDED - m.goals) + '点!', W / 2, 1010, 54, CYAN);
    pop('BEST ' + Math.max(game.best, m.ok ? sc : 0), W / 2, 1080, 36, WHITE);
  }

  function drawAll() {
    drawCourt();
    drawKeeper();
    drawShooter();
    drawMeter();
  }

  // ── ATTRACT: 同じ beginCharge/kick を AI が使う(空いた列へぴったり溜め → わざと溜めすぎ)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, goalPower: 0.86, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { initGame(); m.ready = 0; m.keeper.moveCd = 1.4; demo.n = 0; }
    if (m.phase === 'aim' && m.aimT < AIM_WAIT - 0.5 && !m.finished) {
      var free = m.keeper.lane === 0 ? 2 : 0;
      if (m.keeper.lean !== 0) free = m.keeper.lane;
      demo.goalPower = demo.n % 2 === 0 ? 0.86 : 1.2;
      demo.gx = LANES[free]; demo.gy = H * 0.8 + 60;
      beginCharge(demo.gx);
      demo.n++;
    } else if (m.phase === 'charge') {
      if (m.power >= demo.goalPower) kick();
    }
    demo.press = m.phase === 'charge';
    run(dt);
    if (m.done) { m.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); bgm();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || m.ready > 0 || m.done) return;
    game.audio.play('se_tap', 0.3);
    beginCharge(x);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || m.phase !== 'charge') return;
    var ln = laneFromX(x);
    if (ln !== m.lane) { m.lane = ln; game.audio.tone('E5', 0.04, { wave: 'square', volume: 0.04 }); }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || m.phase !== 'charge') return;
    game.fx.burst(m.ball.x, m.ball.y, { color: WHITE, count: 8, speed: 200 });
    kick();
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!m) initGame();
      stepDemo(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      box(30, 30, W - 60, 180, '#1a0b52');
      pop(GAME_TITLE, W / 2, H * 0.045, 88, YEL);
      pop('HI-SCORE ' + game.best, W / 2, 170, 36, WHITE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) pop('► 100円 投入 ◄', W / 2, H * 0.5, 54, YEL);
      else pop('INSERT COIN', W / 2, H * 0.5, 48, WHITE);
      return;
    }
    if (state === S.RESULT) {
      drawAll(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) pop('TAP TO CONTINUE', W / 2, H * 0.965, 40, WHITE);
      return;
    }

    if (m.done) {
      m.endWait -= dt;
      if (m.hitStop > 0) m.hitStop -= dt;
      if (m.endWait <= 0) {
        state = S.RESULT;
        var stats = { goals: m.goals, perfect: m.perfect, balls: m.used };
        if (m.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (m.ready > 0) {
      m.ready -= dt;
      if (m.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (m.hitStop <= 0) m.timeLeft -= dt;
      if (m.timeLeft <= 0 && !m.finished) {
        m.timeLeft = 0; m.finished = true; m.ok = false; m.hitStop = 0.4;
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' });
        finish();
      } else {
        run(dt);
      }
    }

    drawAll();
    drawHud();
    if (m.ready > 0) pop(m.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 110, YEL);
    if (m.done) drawResult();
  });

  function bgm() {
    game.audio.melody(
      [['C5', 0.5], ['C5', 0.5], ['G5', 1], ['E5', 0.5], ['F5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 2]],
      { tempo: 168, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 2], ['E3', 2], ['F3', 2], ['G3', 2]] }
    );
  }

  game.onStart(function () {
    bgm();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
