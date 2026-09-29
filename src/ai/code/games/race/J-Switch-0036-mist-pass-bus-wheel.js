// J-Switch-0036-mist-pass-bus-wheel.js
// 霧の峠の木炭バス — 大きなハンドルを指でぐるりと回し、つづら折りのカーブで路肩へ大きくはみ出さずに山頂の宿場まで走り切る
// 操作: 下の大ハンドルに指を置き、円を描くように回すとその分だけハンドルが切れる(右回り=右、左回り=左)。指を離すとハンドルはゆっくり戻る。路肩にはみ出すとガタガタ揺れ、出たままだと谷側へ落ちかけてミス(社内メモ。画面には出さない)
// 終わり: 峠の頂上の宿場に着けばCLEAR。路肩から大きく外れると1ミス、3ミスか時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: misty_pass_charcoal_bus
// 世界観: 霧の立ちこめる峠のつづら折りで、木炭バスの見習い運転手が、大きなハンドルを指でぐるりと回して谷側の路肩へはみ出さないよう曲がり続け、山頂の宿場まで乗客を送り届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走った距離%・ミス数・残り時間
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの4階調、画面枠、低コントラスト
  var STYLE = { bg: ['#9bbc0f', '#8bac0f', '#306230'], main: ['#0f380f', '#306230'], accent: ['#9bbc0f', '#0f380f'] };
  var G0 = STYLE.main[0], G1 = STYLE.main[1], G2 = STYLE.bg[1], G3 = STYLE.bg[0];

  var GAME_TITLE = 'PASS WHEEL';
  var TIME_LIMIT = 14;
  var SPEED = 560;              // バスの前進速度 px/s
  var COURSE = 6300;            // 峠道の全長
  var HALF = 150;               // 路面の半幅
  var CLIFF = 110;              // 路肩の幅(ここを越えると落ちかける)
  var SHOULDER_GRACE = 0.55;
  var MAX_LIVES = 3;
  var BUS_Y = H * 0.56;
  var WX = W / 2, WY = H * 0.845, WR = 190;
  var STEER_MAX = 2.4, STEER_GAIN = 290;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 道の中心線(キーフレームを余弦補間)
  var KEYS = [[0, 0], [600, 0], [1250, 250], [1900, -230], [2500, 260], [3050, -280], [3550, 290], [4050, -300], [4550, 300], [5050, -250], [5600, 120], [6300, 0], [7400, 0]];
  function offsetAt(s) {
    if (s <= KEYS[0][0]) return KEYS[0][1];
    for (var i = 1; i < KEYS.length; i++) {
      if (s <= KEYS[i][0]) {
        var a = KEYS[i - 1], b = KEYS[i];
        var t = (s - a[0]) / (b[0] - a[0]);
        var e = (1 - Math.cos(t * Math.PI)) / 2;
        return a[1] + (b[1] - a[1]) * e;
      }
    }
    return KEYS[KEYS.length - 1][1];
  }
  function centerAt(s) { return W / 2 + offsetAt(s); }

  // ── スプライト(4階調: a=G0 b=G1 c=G2 d=G3) ──
  var BUS = [
    '..aaaaaaaa..',
    '.abbbbbbbba.',
    '.abddbbddba.',
    '.abddbbddba.',
    '.abbbbbbbba.',
    '.abccccccba.',
    '.abccccccba.',
    '.abbbbbbbba.',
    '.abccccccba.',
    '.abccccccba.',
    '.abbbbbbbba.',
    'aaabbbbbbaaa',
    'aa.aaaaaa.aa',
    '...a....a...'
  ];
  var BUS2 = [
    '..aaaaaaaa..',
    '.abbbbbbbba.',
    '.abddbbddba.',
    '.abddbbddba.',
    '.abbbbbbbba.',
    '.abccccccba.',
    '.abccccccba.',
    '.abbbbbbbba.',
    '.abccccccba.',
    '.abccccccba.',
    '.abbbbbbbba.',
    'aaabbbbbbaaa',
    '.aaaaaaaaaa.',
    '..a......a..'
  ];
  var PAL = { a: G0, b: G1, c: G2, d: G3 };
  var WHITE_PAL = { a: '#ffffff', b: '#ffffff', c: '#ffffff', d: '#ffffff' };
  var PINE = ['...a...', '..aba..', '.abbba.', '..aba..', '.abbba.', 'abbbbba', '...a...'];
  var SIGN_L = ['aaaa', 'a.da', 'addd', 'a.da', 'aaaa', '.a..', '.a..'];
  var INN = ['...aa...', '..abba..', '.abbbba.', 'aaaaaaaa', 'acdcdcda', 'acdcdcda', 'accaacca', 'aaaaaaaa'];
  var PUFF = ['.bb.', 'bccb', 'bccb', '.bb.'];

  // ── 状態 ──
  var moveN = 0;
  var dist, busX, steer, grabbing, lastAng, tickAcc, lives, timeLeft, shoulderT, stall;
  var ready, hitStop, finished, ok, done, endWait, hitFx, halfShown, spinVis;
  var result = { pct: 0, misses: 0, time: 0, score: 0 };

  function initGame() {
    dist = 0; busX = centerAt(0); steer = 0; grabbing = false; lastAng = 0; tickAcc = 0;
    lives = MAX_LIVES; timeLeft = TIME_LIMIT; shoulderT = 0; stall = 0;
    ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    hitFx = null; halfShown = false; spinVis = 0;
  }

  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  function turnWheel(dA, live) {
    var before = steer;
    steer = Math.max(-STEER_MAX, Math.min(STEER_MAX, steer + dA));
    spinVis += steer - before;
    tickAcc += Math.abs(steer - before);
    if (tickAcc > 0.35) {
      tickAcc = 0;
      if (live) game.audio.tone(steer > 0 ? 'E5' : 'C5', 0.03, { wave: 'square', volume: 0.03 });
    }
  }

  // 走行1ステップ(PLAYING とデモで共用)。'fall' を返したらミス
  function stepDrive(dt, holding) {
    if (!holding) steer *= Math.pow(0.55, dt);
    if (stall > 0) { stall -= dt; return null; }
    dist += SPEED * dt;
    busX += steer * STEER_GAIN * dt;
    var off = Math.abs(busX - centerAt(dist));
    if (off > HALF) shoulderT += dt; else shoulderT = Math.max(0, shoulderT - dt * 2);
    if (off > HALF + CLIFF || shoulderT > SHOULDER_GRACE) return 'fall';
    return null;
  }

  function recover() {
    busX = centerAt(dist); steer = 0; shoulderT = 0; stall = 0.5;
  }

  function fall(live) {
    if (live) {
      lives--;
      hitStop = 0.5;
      hitFx = { x: busX, y: BUS_Y, t: 0.5 };
      game.fx.flash('#ffffff', 0.15);
      game.feedback.bad(busX, BUS_Y - 120, { text: 'MISS', color: G0, shake: 16 });
      if (lives <= 0) { finished = true; ok = false; finish(); return; }
    }
    recover();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
    result.pct = ok ? 100 : Math.min(99, Math.floor(dist / COURSE * 100));
    result.misses = MAX_LIVES - lives;
    result.time = Math.max(0, timeLeft);
    result.score = ok ? 300 + lives * 150 + Math.round(timeLeft * 40) : 0;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); startMusic(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    var d = Math.hypot(x - WX, y - WY);
    if (y > H * 0.6 && d > 40) {
      grabbing = true; lastAng = Math.atan2(y - WY, x - WX);
      game.audio.play('se_tap', 0.3);
      game.fx.burst(x, y, { color: G3, count: 5, speed: 120 });
    } else {
      game.audio.tone('G3', 0.05, { wave: 'square', volume: 0.04 });
      game.fx.burst(x, y, { color: G1, count: 3, speed: 60 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !grabbing || finished) return;
    if (Math.hypot(x - WX, y - WY) < 40) return;
    var a = Math.atan2(y - WY, x - WX);
    turnWheel(wrap(a - lastAng), true);
    lastAng = a;
    moveN++;
    if (moveN % 5 === 0) game.fx.burst(x, y, { color: G3, count: 1, speed: 50 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (grabbing) game.audio.tone('D4', 0.05, { wave: 'triangle', volume: 0.04 });
    grabbing = false;
  });

  // ── 描画 ──
  function drawRoad() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, G3], [0.5, G2], [1, G3]]);
    for (var y = 230; y < H * 0.72; y += 14) {
      var s = dist + (BUS_Y - y);
      var cx = centerAt(s);
      // 谷側(左)は暗く、山側(右)は明るい斜面
      game.draw.rect(0, y, cx - HALF - CLIFF, 14, G1);
      game.draw.rect(cx - HALF - CLIFF, y, CLIFF, 14, G2);
      game.draw.rect(cx + HALF, y, CLIFF, 14, G2);
      game.draw.rect(cx - HALF, y, HALF * 2, 14, G3);
      game.draw.rect(cx - HALF - 6, y, 6, 14, G0);
      game.draw.rect(cx + HALF, y, 6, 14, G0);
      if (Math.floor(s / 70) % 2 === 0) game.draw.rect(cx - 5, y, 10, 14, G1);
      if (s >= COURSE && s < COURSE + 14) game.draw.rect(cx - HALF, y, HALF * 2, 14, G0);
    }
    // 松と標識(カーブの手前)
    for (var k = 1; k < KEYS.length - 1; k++) {
      var ks = KEYS[k][0] - 250;
      var ky = BUS_Y - (ks - dist);
      if (ky > 240 && ky < H * 0.7) {
        var dir = KEYS[k + 1] && KEYS[k + 1][1] > KEYS[k][1] ? 1 : -1;
        var sx = centerAt(ks) + (HALF + CLIFF + 50) * (dir > 0 ? 1 : -1);
        game.draw.sprite(SIGN_L, PAL, sx, ky, 12, { anchor: 'center', flipX: dir < 0 });
      }
    }
    for (var p = 0; p < 16; p++) {
      var ps = Math.floor(dist / 400) * 400 + p * 400 - 1600;
      var py = BUS_Y - (ps - dist);
      if (py < 240 || py > H * 0.7) continue;
      var pcx = centerAt(ps);
      var side = p % 2 === 0 ? -1 : 1;
      game.draw.sprite(PINE, PAL, pcx + side * (HALF + CLIFF + 150 + (p % 3) * 40) + Math.sin(t * 1.5 + p) * 4, py, 10, { anchor: 'center' });
    }
    // 宿場
    var iy = BUS_Y - (COURSE + 120 - dist);
    if (iy > 150 && iy < H * 0.7) game.draw.sprite(INN, PAL, centerAt(COURSE) + HALF + 90, iy, 16, { anchor: 'center' });
    // 霧(流れる帯)
    for (var f = 0; f < 5; f++) {
      var fy = 300 + f * 180 + Math.sin(t * 0.6 + f) * 30;
      game.draw.rect(0, fy, W, 60, G3, 0.25 + 0.1 * Math.sin(t + f));
    }
  }

  function drawBus(dt) {
    var t = game.time.elapsed;
    var rumble = shoulderT > 0 ? Math.sin(t * 60) * 8 : 0;
    game.draw.rect(busX - 70, BUS_Y + 90, 140, 16, G0, 0.35);
    if (shoulderT > 0 && Math.floor(t * 14) % 2 === 0) game.draw.circle(busX, BUS_Y, 130, G0, 0.3);
    game.draw.sprite(Math.floor(t * 8) % 2 ? BUS : BUS2, PAL, busX + rumble + steer * 6, BUS_Y + Math.sin(t * 9) * 2, 11, { anchor: 'center' });
    // 木炭釜の煙
    for (var i = 0; i < 3; i++) {
      var ph = (t * 1.5 + i / 3) % 1;
      game.draw.sprite(PUFF, PAL, busX + 40 + Math.sin(ph * 6 + i) * 14, BUS_Y + 90 + ph * 160, 6 + ph * 6, { anchor: 'center', alpha: 1 - ph });
    }
  }

  function drawWheel(hx, hy) {
    // 親指ゾーン: 大ハンドル(スポークが切れ角どおりに回る)
    game.draw.rect(0, H * 0.72, W, H * 0.28, G1);
    game.draw.rect(0, H * 0.72, W, 8, G0);
    game.draw.circle(WX, WY, WR + 26, G0);
    game.draw.circle(WX, WY, WR + 8, G2);
    game.draw.circle(WX, WY, WR - 18, G1);
    for (var k = 0; k < 3; k++) {
      var a = steer + (-Math.PI / 2) + k * Math.PI * 2 / 3;
      game.draw.line(WX, WY, WX + Math.cos(a) * (WR - 10), WY + Math.sin(a) * (WR - 10), G0, 22);
    }
    var top = steer - Math.PI / 2;
    game.draw.circle(WX + Math.cos(top) * (WR - 2), WY + Math.sin(top) * (WR - 2), 22, G3);
    game.draw.circle(WX, WY, 46, G0);
    game.draw.circle(WX, WY, 30, G2);
    // 切れ角メーター
    game.draw.rect(WX - 300, WY - WR - 60, 600, 14, G0, 0.6);
    game.draw.rect(WX - 4 + steer / STEER_MAX * 290, WY - WR - 70, 10, 34, G3);
  }

  function drawHitFx(dt) {
    if (!hitFx || hitFx.t <= 0) return;
    hitFx.t -= dt;
    var k = (0.5 - hitFx.t) / 0.5;
    game.draw.circle(hitFx.x, hitFx.y, 120 + k * 120, '#ffffff', 0.6);
    game.draw.sprite(BUS, WHITE_PAL, hitFx.x, hitFx.y, 11 + k * 5, { anchor: 'center' });
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: G3, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color || G0, bold: true, align: 'center', font: 'monospace' });
  }

  function drawFrame() {
    game.draw.rect(0, 0, W, 230, G2);
    game.draw.rect(0, 222, W, 8, G0);
    game.draw.rect(0, 0, 14, H, G0);
    game.draw.rect(W - 14, 0, 14, H, G0);
    game.draw.rect(0, 0, W, H, G3, 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.4));
  }

  function drawHud() {
    var pct = Math.min(100, Math.floor(dist / COURSE * 100));
    txt(pct + '%', W / 2, 70, 60);
    var bw = W - 200;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(100, 138, bw, 20, G1);
    if (!low) game.draw.rect(100, 138, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, G0);
    for (var i = 0; i < MAX_LIVES; i++) game.draw.sprite(BUS, PAL, 80 + i * 60, 196, 3, { anchor: 'center', alpha: i < lives ? 1 : 0.25 });
    txt(lives + ' / ' + MAX_LIVES, W - 130, 196, 34);
  }

  // ── ATTRACT ゴースト実演(実ロジック stepDrive/turnWheel を使う) ──
  var demo = { t: 0, gx: WX, gy: WY - WR, press: false, letGo: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) {
      dist = 0; busX = centerAt(0); steer = 0; shoulderT = 0; stall = 0;
      demo.letGo = Math.floor(demo.t / 5.0) % 2 === 1;
    }
    // 先の道の中心へ向かう切れ角を、ハンドルを回して作る(失敗回は2つ目のカーブで手を離す)
    var hold = !(demo.letGo && dist > 1500 && dist < 2600);
    if (hold) {
      var want = Math.max(-STEER_MAX, Math.min(STEER_MAX, (centerAt(dist + 260) - busX) / (STEER_GAIN * 0.6)));
      turnWheel(Math.max(-4 * dt, Math.min(4 * dt, want - steer)), false);
    }
    var top = steer - Math.PI / 2;
    demo.gx = WX + Math.cos(top) * WR; demo.gy = WY + Math.sin(top) * WR; demo.press = hold;
    if (!hold) demo.gy -= 80;
    if (stepDrive(dt, hold) === 'fall') {
      game.fx.flash('#ffffff', 0.1);
      game.fx.burst(busX, BUS_Y, { color: G0, count: 14, speed: 260 });
      recover(); demo.letGo = false;
    }
  }

  // ── メインループ(1回だけ登録) ──
  game.onUpdate(function(dt) {
    if (dist === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawRoad();
      drawBus(dt);
      drawWheel();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      drawFrame();
      txt(GAME_TITLE, W / 2, 80, 72);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 36);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, G3);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, G3);
      return;
    }

    if (state === S.RESULT) {
      drawRoad();
      drawBus(dt);
      drawWheel();
      drawFrame();
      game.draw.rect(W * 0.06, H * 0.27, W * 0.88, H * 0.33, G3);
      game.draw.rect(W * 0.06, H * 0.27, W * 0.88, 10, G0);
      game.draw.rect(W * 0.06, H * 0.6 - 10, W * 0.88, 10, G0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, ok ? G0 : G1);
      txt(result.pct + '%', W / 2, H * 0.41, 62);
      if (ok) txt('SCORE ' + result.score, W / 2, H * 0.47, 50);
      else txt('あと' + (100 - result.pct) + '%!', W / 2, H * 0.47, 50);
      txt('MISS ' + result.misses + '   ' + result.time.toFixed(1) + '秒', W / 2, H * 0.52, 34, G1);
      var isNew = ok && result.score >= game.best && result.score > 0;
      txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.565, 38);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, G3);
      return;
    }

    // PLAYING
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { percent: result.pct, misses: result.misses, timeLeft: Math.round(result.time * 10) / 10 };
        if (ok) game.end.success(result.score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      var wasShoulder = shoulderT > 0;
      var ev = stepDrive(dt, grabbing && game.input.pressing);
      if (!wasShoulder && shoulderT > 0) game.audio.tone('C3', 0.1, { wave: 'sawtooth', volume: 0.06 });
      if (ev === 'fall') fall(true);
      if (!finished && !halfShown && dist > COURSE * 0.5) {
        halfShown = true;
        game.fx.popup('50%', busX, BUS_Y - 160, { color: G0, size: 60 });
        game.audio.play('se_milestone', 0.5);
        game.feedback.good(busX, BUS_Y - 100, { text: 'NICE', color: G0 });
      }
      if (!finished && dist >= COURSE) {
        finished = true; ok = true;
        game.fx.burst(busX, BUS_Y - 60, { color: G0, count: 28, speed: 440 });
        game.feedback.good(W / 2, H * 0.36, { text: 'CLEAR', color: G0, size: 86 });
        game.audio.play('se_success', 0.6);
        finish();
      } else if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4;
        game.feedback.bad(busX, BUS_Y - 100, { text: 'TIME UP', color: G0 });
        game.audio.play('se_failure', 0.5);
        finish();
      }
    }

    drawRoad();
    drawBus(dt);
    drawHitFx(dt);
    drawWheel();
    if (grabbing && game.input.pressing) game.draw.circle(game.input.x, game.input.y, 30, G3, 0.5);
    drawFrame();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110);
  });

  function startMusic() {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 1], ['B4', 1],
      ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 2]
    ], { tempo: 138, wave: 'square', volume: 0.06, loop: true, bass: [['E2', 2], ['A2', 2], ['D2', 2], ['A2', 2]] });
  }

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    game.audio.bgm('bgm_cute');
  });
})(game);
