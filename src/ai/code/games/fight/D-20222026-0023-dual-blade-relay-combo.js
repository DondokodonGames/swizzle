// D-20222026-0023-dual-blade-relay-combo.js
// デュアルブレード・リレーコンボ — 二刀の剣士コンビが、左右のボタンを交互に叩いて連携コンボを途切れさせず敵を打ち倒す
// 操作: 画面下の左右2つの剣アイコンを、途切れさせず交互にタップし続ける
// 終わり: 制限時間内に規定コンボ数に到達すれば成功。時間切れで失敗
// @mechanic: alternate_tap
// @theme: dual_blade_relay_combo
// 世界観: 二刀の剣士コンビが息を合わせ、左右の刃を交互に振るって連携コンボを絶やさず眼前の敵を打ち倒す
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達したコンボ数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめキャラ、濃い輪郭線、原色ハイライト
  var STYLE = {
    bg: ['#331a3a', '#180a20'],
    main: ['#ff5d5d', '#3ec6ff'],
    accent: ['#ffffff', '#140a1c'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#5fe0a0', bad: '#ff4d5e', gold: '#ffde59',
  };
  var L_COL = STYLE.main[0], R_COL = STYLE.main[1];

  var GAME_TITLE = 'BLADE RELAY';
  var TIME_LIMIT = 12;
  var COMBO_TARGET = 12;
  var L_BTN = { x: W * 0.27, y: H * 0.84, r: 130 };
  var R_BTN = { x: W * 0.73, y: H * 0.84, r: 130 };
  var ENEMY_X = W * 0.5, ENEMY_Y = H * 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BLADE_FRAME = ['..#..', '..#..', '..#..', '.###.', '..#..'];
  var ENEMY_FRAME = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
  var HERO_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var combo, expectSide, flashL, flashR, enemyHitAnim, mistakes;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function initGame() {
    combo = 0; expectSide = 0; flashL = 0; flashR = 0; enemyHitAnim = 0; mistakes = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function drawScene() {
    var eb = Math.sin(game.time.elapsed * 3) * 6 - enemyHitAnim * 20;
    game.draw.sprite(ENEMY_FRAME, { '#': '#8a6bd6' }, ENEMY_X, ENEMY_Y + eb, 24, { anchor: 'center' });
    game.draw.sprite(HERO_FRAMES[Math.floor(game.time.elapsed * 4) % 2], { '#': L_COL }, ENEMY_X - 190, ENEMY_Y + 220, 16, { anchor: 'center' });
    game.draw.sprite(HERO_FRAMES[Math.floor(game.time.elapsed * 4 + 1) % 2], { '#': R_COL }, ENEMY_X + 190, ENEMY_Y + 220, 16, { anchor: 'center' });

    var lGlow = 0.3 + (expectSide === 0 ? 0.35 + 0.15 * Math.sin(game.time.elapsed * 8) : 0) + flashL;
    var rGlow = 0.3 + (expectSide === 1 ? 0.35 + 0.15 * Math.sin(game.time.elapsed * 8) : 0) + flashR;
    game.draw.circle(L_BTN.x, L_BTN.y, L_BTN.r, L_COL, Math.min(1, lGlow));
    game.draw.circle(R_BTN.x, R_BTN.y, R_BTN.r, R_COL, Math.min(1, rGlow));
    game.draw.sprite(BLADE_FRAME, { '#': C.white }, L_BTN.x, L_BTN.y, 22, { anchor: 'center' });
    game.draw.sprite(BLADE_FRAME, { '#': C.white }, R_BTN.x, R_BTN.y, 22, { anchor: 'center' });
  }

  function tryTap(side, x, y) {
    if (side === expectSide) {
      combo++;
      enemyHitAnim = 1;
      if (side === 0) flashL = 1; else flashR = 1;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good, size: 20 });
      game.audio.play('se_tap', 0.3);
      expectSide = 1 - expectSide;
      if (!halfCalled && combo >= Math.ceil(COMBO_TARGET / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', ENEMY_X, ENEMY_Y - 140, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (combo >= COMBO_TARGET) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(ENEMY_X, ENEMY_Y, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      mistakes++;
      combo = Math.max(0, combo - 2);
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
  }

  function sideAt(x, y) {
    if (Math.hypot(x - L_BTN.x, y - L_BTN.y) < L_BTN.r) return 0;
    if (Math.hypot(x - R_BTN.x, y - R_BTN.y) < R_BTN.r) return 1;
    return -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var side = sideAt(x, y);
    if (side >= 0) tryTap(side, x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0 };
  function resetDemo() { initGame(); demo.idx = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.2 / COMBO_TARGET;
    var slot = Math.min(COMBO_TARGET - 1, Math.floor(cyc / per));
    var localT = (cyc - slot * per) / per;
    var btn = expectSide === 0 ? L_BTN : R_BTN;
    demo.gx = btn.x; demo.gy = btn.y; demo.press = localT < 0.5;
    if (localT > 0.4 && slot === demo.idx) {
      demo.idx = slot + 1;
      tryTap(expectSide, btn.x, btn.y);
    }
  }

  game.onUpdate(function(dt) {
    if (flashL > 0) flashL -= dt * 3;
    if (flashR > 0) flashR -= dt * 3;
    if (enemyHitAnim > 0) enemyHitAnim -= dt * 3;

    if (state === S.ATTRACT) {
      if (combo === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(combo + ' / ' + COMBO_TARGET, W / 2, H * 0.12, 28, C.gold);
      if (!ok) txt('あと' + (COMBO_TARGET - combo) + '!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(combo, { combo: combo, mistakes: mistakes });
        else game.end.failure({ combo: combo, mistakes: mistakes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(ENEMY_X, ENEMY_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(combo + ' / ' + COMBO_TARGET, W / 2, H * 0.06, 28, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#00000044');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.15], ['G4', 0.15], ['B4', 0.15], ['E5', 0.3]], { tempo: 165, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
