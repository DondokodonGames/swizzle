// J-N6424-0051-dune-grip-tug.js
// 砂丘グリップ綱引き — 相手が握り直して手が開いた一瞬だけ引く。握っている最中に引くと綱が滑って押し戻される
// 操作: 画面タップで1回引く。相手の手が開いた(白く光る)間だけ有効。引いた直後は腕が回復するまで次を待つ
// 終わり: 旗を自陣の杭まで引き込めばCLEAR。旗が相手の杭を越える/時間切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: desert_caravan_night_tug
// 世界観: 砂漠の夜営地でキャラバンの見張り番が、砂丘の向こうの影の一団と一本綱を引き合い、相手が息をついて握り直す瞬間だけを狙って旗を自分の杭へたぐる
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功した引きの回数とPERFECT数
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット描画 + 画面に貼ったカラーセロハンの帯(琥珀/水色/緑)
  var MONO = { ink: '#050505', dot: '#f4f4f4', dim: '#6a6a6a', band1: '#ffb020', band2: '#40d0ff', band3: '#40ff70', warn: '#ff3030' };

  var GAME_TITLE = 'DUNE TUG';
  var TIME_LIMIT = 13;
  var NEEDED = 5;
  var ROPE_Y = H * 0.5;
  var LEFT_POST = W * 0.18;
  var RIGHT_POST = W * 0.82;
  var CENTER = W / 2;
  var REACH = W * 0.32;
  var PULL_GAIN = 0.21;
  var SLIP = 0.12;
  var CD_OK = 0.45;
  var CD_SLIP = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var GUARD = [
    '..###...',
    '.#####..',
    '..#.#...',
    '.#####..',
    '#.###.##',
    '..###...',
    '..#.#...',
    '.##.##..'
  ];
  var HOOD = [
    '...##...',
    '..####..',
    '..#..#..',
    '.######.',
    '##.##.#.',
    '..####..',
    '..#..#..',
    '.##..##.'
  ];
  var FIST = ['.###.', '#####', '#####', '.###.'];
  var PALM = ['#.#.#', '#.#.#', '#####', '.###.'];
  var BEAST = [
    '......##..',
    '..##..###.',
    '.####.#...',
    '#######...',
    '.######...',
    '.#.#.#.#..'
  ];

  var mark, pulls, perfects, slips, timeLeft, ready, hitStop, endWait, done, ok, why;
  var grip, cd, window_, flashT, pullAnim;

  function initGame() {
    mark = 0; pulls = 0; perfects = 0; slips = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
    grip = { mode: 'tight', t: 1.1 };
    cd = 0; window_ = 0.45; flashT = 0; pullAnim = 0;
  }

  function nextGrip() {
    if (grip.mode === 'tight') {
      if (Math.random() < 0.28) { grip.mode = 'twitch'; grip.t = 0.28; }
      else {
        grip.mode = 'open'; grip.t = window_;
        game.audio.tone('A5', 0.06, { wave: 'triangle', volume: 0.05 });
      }
    } else {
      grip.mode = 'tight'; grip.t = game.random(0.8, 1.4);
    }
  }

  function simStep(dt) {
    grip.t -= dt;
    if (grip.t <= 0) nextGrip();
    if (cd > 0) cd -= dt;
    if (flashT > 0) flashT -= dt;
    if (pullAnim > 0) pullAnim -= dt;
    mark -= 0.05 * dt;
    if (mark >= 1) return 'won';
    if (mark <= -1) return 'lost';
    return null;
  }

  // 1回の引き。結果: 'perfect' | 'good' | 'slip'
  function tryPull() {
    if (cd > 0 || grip.mode !== 'open') {
      mark -= SLIP; cd = CD_SLIP; slips++;
      return 'slip';
    }
    var early = grip.t > window_ * 0.5;
    mark += PULL_GAIN; cd = CD_OK; pulls++; pullAnim = 0.2;
    if (early) perfects++;
    grip.mode = 'tight'; grip.t = game.random(0.9, 1.5);
    window_ = Math.max(0.32, window_ - 0.025);
    return early ? 'perfect' : 'good';
  }

  function flagX() { return CENTER - mark * REACH; }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x, y, { size: size, color: color || MONO.dot, bold: true, align: 'center', font: 'monospace' });
  }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#101010'], [0.55, '#050505'], [1, '#121212']]);
    // 星(白ドット、瞬き)
    for (var i = 0; i < 40; i++) {
      var sx = (i * 263) % W, sy = (i * 131) % (H * 0.3) + H * 0.04;
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i));
      game.draw.rect(sx, sy, 6, 6, MONO.dot, tw);
    }
    game.draw.circle(W * 0.78, H * 0.16, 60, MONO.dot, 0.9);
    game.draw.circle(W * 0.76, H * 0.155, 54, MONO.ink);
    // 砂丘の稜線(点の連なり)
    for (var x = 0; x < W; x += 12) {
      var dy = Math.sin(x * 0.006 + 1) * 40 + Math.sin(x * 0.017) * 14;
      game.draw.rect(x, H * 0.36 + dy, 6, 6, MONO.dim);
      game.draw.rect(x, H * 0.66 + dy * 0.6, 6, 6, MONO.dot, 0.8);
    }
    // 遠くを歩く荷獣(常時bob)
    var bx = ((t * 30) % (W + 300)) - 150;
    game.draw.sprite(BEAST, { '#': MONO.dim }, bx, H * 0.33 + Math.sin(t * 3) * 4, 8, { anchor: 'center' });
    // 焚き火の明滅(環境光パルス)
    game.draw.rect(0, 0, W, H, MONO.dot, 0.02 + 0.02 * Math.sin(t * 5));
  }

  function drawTug() {
    var t = game.time.elapsed;
    var fx_ = flagX();
    var sag = Math.sin(t * 4) * 5;
    // 杭
    game.draw.rect(LEFT_POST - 8, ROPE_Y - 90, 16, 180, MONO.dot);
    game.draw.rect(RIGHT_POST - 8, ROPE_Y - 90, 16, 180, MONO.dim);
    // 綱(点線)
    for (var x = W * 0.06; x < W * 0.94; x += 18) {
      var yy = ROPE_Y + Math.sin((x / W) * Math.PI) * (8 + sag);
      game.draw.rect(x, yy - 4, 12, 8, MONO.dot);
    }
    // 旗
    var big = flashT > 0 ? 1.6 : 1;
    game.draw.rect(fx_ - 4, ROPE_Y - 120 * big, 8, 120 * big, MONO.dot);
    game.draw.rect(fx_, ROPE_Y - 120 * big, 60 * big, 40 * big, flashT > 0 ? MONO.dot : MONO.band1);
    // こちらの見張り番(左)
    var lean = pullAnim > 0 ? -16 : 0;
    for (var g = 0; g < 2; g++) {
      game.draw.sprite(GUARD, { '#': MONO.dot }, W * 0.08 + g * 70 + lean, ROPE_Y - 30 + Math.sin(t * 2 + g) * 4, 12, { anchor: 'center' });
    }
    // 影の一団(右、半透明)と握り手
    var twitchJ = grip.mode === 'twitch' ? Math.sin(t * 60) * 6 : 0;
    for (var h = 0; h < 3; h++) {
      game.draw.sprite(HOOD, { '#': MONO.dim }, W * 0.88 + h * 40, ROPE_Y - 40 - h * 10 + Math.sin(t * 2.2 + h) * 4, 12, { anchor: 'center', alpha: 0.7 });
    }
    var open = grip.mode === 'open';
    var hx = W * 0.72 + twitchJ, hy = ROPE_Y;
    if (open) game.draw.circle(hx, hy, 80, MONO.dot, 0.25 + 0.15 * Math.sin(t * 30));
    game.draw.sprite(open ? PALM : FIST, { '#': open ? MONO.dot : MONO.dim }, hx, hy, 18, { anchor: 'center' });
  }

  function drawArms() {
    // 親指ゾーン: 自分の両手。回復中は暗く、回復すると白く灯る
    var ready_ = cd <= 0;
    var y = H * 0.84;
    for (var s = -1; s <= 1; s += 2) {
      var x = W / 2 + s * 150;
      game.draw.sprite(FIST, { '#': ready_ ? MONO.dot : MONO.dim }, x, y + Math.sin(game.time.elapsed * 3 + s) * 5, 26, { anchor: 'center' });
    }
    var frac = ready_ ? 1 : 1 - cd / CD_SLIP;
    game.draw.rect(W * 0.25, H * 0.9, W * 0.5, 16, MONO.dim);
    game.draw.rect(W * 0.25, H * 0.9, W * 0.5 * Math.max(0, Math.min(1, frac)), 16, MONO.dot);
  }

  function drawCellophane() {
    game.draw.rect(0, 0, W, H * 0.24, MONO.band1, 0.22);
    game.draw.rect(0, H * 0.4, W, H * 0.2, MONO.band2, 0.16);
    game.draw.rect(0, H * 0.76, W, H * 0.24, MONO.band3, 0.18);
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      game.draw.rect(W / 2 - 150 + i * 64, 80, 44, 44, i < pulls ? MONO.dot : MONO.dim);
    }
    txt(pulls + ' / ' + NEEDED, W * 0.85, 102, 40);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 170, W - 160, 18, MONO.dim);
    game.draw.rect(80, 170, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? MONO.warn : MONO.dot);
  }

  // ── ATTRACT: 手が開いた瞬間に引く(成功)、握っている時に引いて滑る(失敗)を実ロジックで見せる
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: 0, planned: false, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { mark = 0; cd = 0; window_ = 0.45; grip = { mode: 'tight', t: 0.5 }; demo.cycle++; }
    var r = simStep(dt);
    if (r) mark = 0;
    if (demo.press > 0) demo.press -= dt;
    // 前半は手が開いた直後に引く。後半で1回だけ握り中に引いて滑る
    if (cyc < 4.5 && grip.mode === 'open' && grip.t < window_ - 0.1 && cd <= 0) {
      var res = tryPull(); demo.press = 0.15;
      game.fx.burst(W * 0.72, ROPE_Y, { color: MONO.dot, count: 8 });
      if (res !== 'slip') game.fx.popup(res === 'perfect' ? 'PERFECT' : 'GOOD', W * 0.72, ROPE_Y - 120, { color: MONO.band1, size: 44 });
    } else if (cyc > 4.6 && cyc < 4.6 + dt * 1.5 && grip.mode !== 'open') {
      tryPull(); demo.press = 0.15;
      game.fx.popup('MISS', W * 0.72, ROPE_Y - 120, { color: MONO.warn, size: 44 });
    }
    demo.gx = W / 2 + 150; demo.gy = H * 0.8;
  }

  function endRound(success, reason) {
    why = reason; flashT = 0.5; hitStop = 0.5;
    ok = success;
    game.fx.flash(MONO.dot, 0.15);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0) { game.audio.play('se_tap', 0.08); return; }
    var res = tryPull();
    if (res === 'slip') {
      game.feedback.bad(W * 0.72, ROPE_Y, { text: 'MISS', shake: 8 });
    } else {
      game.audio.play('se_tap', 0.3);
      game.feedback.good(W * 0.72, ROPE_Y, { text: res === 'perfect' ? 'PERFECT' : 'GOOD', color: MONO.band1 });
      if (pulls === 3) { game.audio.play('se_milestone', 0.4); game.fx.popup('3 / ' + NEEDED, CENTER, ROPE_Y - 220, { color: MONO.dot, size: 56 }); }
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (mark === undefined) initGame();
      stepDemo(dt);
      drawScene(); drawTug(); drawArms(); drawCellophane();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 84);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.13, 34);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, MONO.band1);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawTug(); drawCellophane();
      var score = pulls * 100 + perfects * 50;
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.3, 100, ok ? MONO.band3 : MONO.warn);
      txt(pulls + ' / ' + NEEDED, W / 2, H * 0.37, 56);
      txt('PERFECT ' + perfects + '  MISS ' + slips, W / 2, H * 0.62, 36);
      txt('SCORE ' + score, W / 2, H * 0.67, 44, MONO.band1);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.72, 48, MONO.band3);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - pulls) + '回!', W / 2, H * 0.72, 48);
      txt('BEST ' + game.best, W / 2, H * 0.76, 32, MONO.dim);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pulls: pulls, perfects: perfects, slips: slips };
        if (ok) game.end.success(pulls * 100 + perfects * 50, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flashT > 0) flashT -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.feedback.good(flagX(), ROPE_Y - 100, { text: 'CLEAR', color: MONO.band3, count: 26 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(flagX(), ROPE_Y - 100, { text: why === 'time' ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      var r = simStep(dt);
      if (r === 'won' || pulls >= NEEDED) endRound(true, 'won');
      else if (r === 'lost') endRound(false, 'lost');
      else if (timeLeft <= 0) { timeLeft = 0; endRound(false, 'time'); }
    }

    drawScene(); drawTug(); drawArms(); drawCellophane(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, MONO.band1);
  });

  game.onStart(function () {
    game.audio.melody(
      [['D4', 1], ['F4', 0.5], ['E4', 0.5], ['D4', 1], ['A3', 1], ['C4', 0.5], ['D4', 0.5], ['E4', 1], ['D4', 2]],
      { tempo: 96, wave: 'triangle', volume: 0.06, loop: true, bass: [['D2', 4], ['A1', 4], ['C2', 2], ['D2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
