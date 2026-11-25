// I-GBA-0044-gem-spot-stall.js
// ジェムスポットスタール — 瓜二つに並んだ宝石を見比べ、本物だけに光る小さな煌めきを見抜く
// 操作: 左右2つの宝石のうち、本物(かすかな煌めき付き)をタップする
// 終わり: 規定数(5問)を正しく見抜けば成功。誤答か制限時間切れで失敗
// @mechanic: judge
// @theme: gem_appraisal_stall
// 世界観: 路地裏の宝石鑑定スタール。鑑定士見習いが、瓜二つの2石から本物だけをその場で見抜いて仕分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜けた問題数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、パステル、上下に情報を分ける
  var C = {
    bg: '#ffe9f2', bg2: '#ffd7e8', card: '#ffffff', cardEdge: '#ffb6d5',
    gem: '#8fd3ff', gemEdge: '#ffffff', sparkle: '#fff275',
    accent: '#ff8fc7', good: '#63e6a0', bad: '#ff6b6b', gold: '#ffb703', white: '#ffffff', ink: '#3a2540',
  };

  var GAME_TITLE = 'GEM SPOT';
  var TOTAL = 5;
  var ROUND_TIME = 2.4;
  var MAX_TIME = TOTAL * ROUND_TIME; // judge = F族 8-15s
  var NEEDED = TOTAL;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var LX = W * 0.28, RX = W * 0.72, GY = H * 0.46;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GEM = ['..#..', '.###.', '#####', '.###.', '..#..'];
  var APPRAISER = ['.###.', '##.##', '.###.', '..#..', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.2 + i * 0.16), H * 0.20, 30, C.cardEdge, 0.25);
    game.draw.sprite(APPRAISER, { '#': C.accent }, W * 0.5, H * 0.12, 9, { anchor: 'center' });
  }

  var round, correctSide, sparkleAt, roundT, answered, timeLeft, placed, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake, revealBoth;

  function newRound(demoMode) {
    correctSide = demoMode ? 'right' : (Math.random() < 0.5 ? 'left' : 'right');
    roundT = 0; answered = false;
  }

  function initGame() {
    round = 0; placed = 0; timeLeft = MAX_TIME; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; revealBoth = false;
    newRound(false);
  }

  function drawGem(x, real, flashColor, sc) {
    var scale = sc || 20;
    game.draw.circle(x, GY, scale + 24, C.card);
    game.draw.circle(x, GY, scale + 24, flashColor || C.cardEdge, 0.9);
    game.draw.sprite(GEM, { '#': flashColor ? flashColor : C.gem }, x, GY, scale / 5, { anchor: 'center' });
    if (real) {
      var b = Math.floor(game.time.elapsed * 6) % 2 === 0;
      if (b || revealBoth) game.draw.circle(x + scale * 0.6, GY - scale * 0.6, 6, C.sparkle);
    }
  }

  function resolve(side, x, y) {
    if (answered || finished) return;
    answered = true;
    if (side === correctSide) {
      placed++;
      game.feedback.good(x, y, { text: placed >= TOTAL ? 'CLEAR' : 'NICE', color: C.good });
      if (!milestoneShown && placed >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.28, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (placed >= TOTAL) { ok = true; finished = true; hitStop = 0.2; revealBoth = true; finish(); }
      else { hitStop = 0.12; }
    } else {
      revealBoth = true;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      ok = false; finished = true; hitStop = 0.35;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished) {
      game.audio.play('se_tap', 0.2);
      var side = x < W * 0.5 ? 'left' : 'right';
      resolve(side, x < W * 0.5 ? LX : RX, GY);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: RX, gy: GY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { newRound(true); revealBoth = false; demo.gx = W * 0.5; demo.gy = H * 0.9; demo.press = false; }
    if (cyc > 1.2 && cyc < 2.4 && !answered) {
      var t = Math.min(1, (cyc - 1.2) / 0.5);
      var tx = correctSide === 'left' ? LX : RX;
      demo.gx = W * 0.5 + (tx - W * 0.5) * t;
      demo.gy = H * 0.9 + (GY - H * 0.9) * t;
      demo.press = t >= 1;
      if (t >= 1) { answered = true; game.feedback.good(tx, GY, { text: 'NICE', color: C.good }); game.audio.play('se_tap', 0.15); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGem(LX, correctSide === 'left');
      drawGem(RX, correctSide === 'right');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.accent);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawGem(LX, correctSide === 'left'); drawGem(RX, correctSide === 'right');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(placed + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.accent);
      if (!ok) txt('あと' + (TOTAL - placed) + '問!', W / 2, H * 0.155, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: TOTAL });
        else game.end.failure({ placed: placed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && answered && !finished) { round++; revealBoth = false; newRound(false); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt; timeLeft -= dt;
      if (roundT >= ROUND_TIME && !answered) {
        // タイムアップ予告: 残り0.6秒でカード縁が点滅(telegraph)
        revealBoth = true;
        game.feedback.bad(W / 2, GY, { text: 'MISS' });
        shake = 0.3; ok = false; finished = true; hitStop = 0.35; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var warn = !answered && roundT > ROUND_TIME - 0.6 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    drawGem(LX, correctSide === 'left', warn ? C.accent : null);
    drawGem(RX, correctSide === 'right', warn ? C.accent : null);

    txt(placed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000022', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (ROUND_TIME - roundT) / ROUND_TIME), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 56, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.5]], { tempo: 128, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
