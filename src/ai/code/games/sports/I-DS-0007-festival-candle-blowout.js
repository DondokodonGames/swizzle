// I-DS-0007-festival-candle-blowout.js
// フェスティバルキャンドルブロウ — 指を長押しして息を溜め、離した勢いで並んだ灯りを吹き消す
// 操作: 画面を長押しして息ゲージを溜め、離すと溜めた強さぶん遠くまで息が届いて灯りを吹き消す
// 終わり: 制限時間内に灯り3つを全て吹き消せば成功。時間切れなら失敗
// @mechanic: hold_charge
// @theme: festival_candle_blowout_stall
// 世界観: 縁日の出店。挑戦者が息を溜めて一気に吹き放ち、遠くの灯りほど強い一息でまとめて消す腕試し
// 残るもの: 正誤(CLEAR/GAME OVER) + 消せた灯りの数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 背景2〜3層、大きめキャラ、暗色輪郭+ハイライト
  var C = {
    sky: '#2a1840', sky2: '#120a24', hillFar: '#3a2458', hillNear: '#221238',
    stall: '#7a4a2a', stallDark: '#4a2c18', flame: '#ffb020', flameCore: '#fff2a0',
    wick: '#5a4030', gust: '#bfe8ff', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f4ecff', ink: '#0a0614',
  };

  var GAME_TITLE = 'CANDLE BLOW';
  var DUR = 12;
  var CHARGE_TIME = 1.1;
  var MOUTH_X = W * 0.5, MOUTH_Y = H * 0.86;
  var MAX_REACH = H * 0.60;
  var CANDLES = [
    { x: W * 0.30, y: H * 0.62 },
    { x: W * 0.70, y: H * 0.46 },
    { x: W * 0.50, y: H * 0.28 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var charge, holding, out, lit, timeLeft, milestoneShown, gustAnim;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.sky2]]);
    game.draw.circle(W * 0.5, H * 0.86, 340, C.hillFar, 0.35);
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.hillNear);
  }

  function drawCandle(c, isOut) {
    game.draw.rect(c.x - 14, c.y, 28, 90, C.stallDark);
    game.draw.rect(c.x - 10, c.y, 20, 80, C.stall);
    if (!isOut) {
      game.draw.circle(c.x, c.y - 22, 22, C.flame);
      game.draw.circle(c.x, c.y - 26, 12, C.flameCore);
    } else {
      game.draw.line(c.x - 8, c.y - 20, c.x + 8, c.y - 4, C.wick, 5);
    }
  }

  function initGame() {
    charge = 0; holding = false; out = [false, false, false];
    lit = 0; timeLeft = DUR; milestoneShown = false; gustAnim = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function doBlow() {
    var reach = charge * MAX_REACH;
    gustAnim = 1;
    var hitAny = false;
    for (var i = 0; i < CANDLES.length; i++) {
      if (out[i]) continue;
      var dist = MOUTH_Y - CANDLES[i].y;
      if (reach >= dist) {
        out[i] = true; lit++;
        hitAny = true;
        game.feedback.good(CANDLES[i].x, CANDLES[i].y - 20, { text: lit + '/' + CANDLES.length, color: C.good });
        game.fx.burst(CANDLES[i].x, CANDLES[i].y - 20, { color: C.gold, count: 12, speed: 300 });
        game.audio.play('se_break', 0.35);
        if (!milestoneShown && lit >= Math.ceil(CANDLES.length / 2)) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.4);
        }
      }
    }
    if (!hitAny) {
      game.feedback.bad(MOUTH_X, MOUTH_Y - 60, { text: null, shake: false });
    } else {
      game.audio.play('se_powerup', 0.3);
    }
    if (lit >= CANDLES.length) { ok = true; finished = true; finish(); }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holding = true;
    game.audio.play('se_tap', 0.08);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding || finished) { holding = false; return; }
    holding = false;
    doBlow();
    charge = 0;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (out === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < CANDLES.length; i++) drawCandle(CANDLES[i], out[i]);
      if (gustAnim > 0) { game.draw.circle(MOUTH_X, MOUTH_Y - charge * MAX_REACH * 0.5, charge * MAX_REACH * 0.5, C.gust, gustAnim * 0.25); gustAnim -= dt * 1.6; }
      game.draw.rect(MOUTH_X - 70, H * 0.90, 140, 22, C.ink, 0.4);
      game.draw.rect(MOUTH_X - 66, H * 0.905, 132 * charge, 14, C.gust);
      game.draw.sprite(PERFORMER, { '#': C.white }, MOUTH_X, H * 0.94, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.98, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.98, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = 0; j < CANDLES.length; j++) drawCandle(CANDLES[j], out[j]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(lit + ' / ' + CANDLES.length, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと' + (CANDLES.length - lit) + '個!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(lit, { lit: lit, total: CANDLES.length }); else game.end.failure({ lit: lit, total: CANDLES.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (holding) charge = Math.min(1, charge + dt / CHARGE_TIME);
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(MOUTH_X, MOUTH_Y - 100, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (gustAnim > 0) gustAnim -= dt * 1.6;
    if (shake > 0) shake -= dt;

    bg();
    for (var k = 0; k < CANDLES.length; k++) drawCandle(CANDLES[k], out[k]);
    if (gustAnim > 0) game.draw.circle(MOUTH_X, MOUTH_Y - charge * MAX_REACH * 0.5, Math.max(10, charge * MAX_REACH * 0.5), C.gust, gustAnim * 0.3);
    game.draw.sprite(PERFORMER, { '#': C.white }, MOUTH_X, H * 0.94, 14, { anchor: 'center' });

    txt(lit + ' / ' + CANDLES.length, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(MOUTH_X - 140, H * 0.90, 280, 26, C.ink, 0.4);
    game.draw.rect(MOUTH_X - 134, H * 0.905, 268 * charge, 14, C.gust);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  var demo = { t: 0, gx: MOUTH_X, gy: MOUTH_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { out = [false, false, false]; lit = 0; milestoneShown = false; charge = 0; }
    if (cyc < 1.6) {
      charge = Math.min(1, cyc / 1.4);
      demo.press = true;
    } else if (cyc < 1.7) {
      demo.press = false;
      if (charge > 0.05) { doBlow(); charge = 0; }
    } else {
      demo.press = false;
    }
    demo.gx = MOUTH_X; demo.gy = MOUTH_Y;
  }

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['D3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
