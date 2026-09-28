// J-GC4-0009-lantern-cord-draw.js
// ランタンドロー — 光る蛍が提灯にとまった瞬間に誰より早く紐を引く。蛾がとまった時に引くとフライング
// 操作: 蛍が提灯にとまって光ったら即タップ。光らない蛾がとまった時・合図の前に触るとフライング(その回は負け)
// 終わり: 5回勝負で先に3勝すればCLEAR。3敗(遅れ・フライング)か時間切れでGAME OVER
// @mechanic: reaction_duel
// @theme: lantern_cord_draw
// 世界観: 夏祭りの宵、川沿いの灯籠番たちが、合図の蛍が自分の提灯にとまった瞬間に誰より早く紐を引いて灯りをともす早灯しの勝負に見習いが挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 勝ち数・最速反応(秒)のスコア
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドットの画面に、横帯のカラーセロハンを重ねる
  var STYLE = {
    bg: ['#030303', '#0c0c0c', '#181818'],
    main: ['#f5f5f5', '#9a9a9a', '#3a3a3a'],
    accent: ['#ffd23f', '#5cff8a'],
  };
  var BAND_TOP = '#ffd23f';
  var BAND_MID = '#5cff8a';
  var BAND_BOT = '#ff8a3d';

  var GAME_TITLE = 'LANTERN DRAW';
  var TIME_LIMIT = 15;
  var ROUNDS = 5;
  var WIN_NEED = 3;
  var RIVAL_T = [0.4, 0.36, 0.33, 0.3, 0.28];
  var LANTERN_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KEEPER = [
    '...www...',
    '..wwwww..',
    '...w.w...',
    '..wwwww..',
    '.w.www.w.',
    'w..www..w',
    '...w.w...',
    '..ww.ww..',
  ];
  var LANTERN = [
    '..wwwww..',
    '.wwwwwww.',
    'w.......w',
    'wwwwwwwww',
    'w.......w',
    'wwwwwwwww',
    'w.......w',
    '.wwwwwww.',
    '..wwwww..',
  ];
  var FIREFLY = ['w.w', '.w.', 'www'];
  var MOTH = ['ww...ww', 'www.www', '.wwwww.', '..www..', '.w.w.w.'];

  var round, wins, losses, phase, phaseT, waitT, feint, sigT, react, rivalLit, results, timeLeft, ready, freeze, ended, endWait, won, score, best, fly, pull, lit;

  function initGame() {
    round = 0;
    wins = 0;
    losses = 0;
    results = [];
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    best = 0;
    pull = 0;
    startRound();
  }

  function startRound() {
    phase = 'wait';
    waitT = game.random(0.8, 1.5);
    phaseT = 0;
    feint = null;
    if (round >= 1 && Math.random() < 0.55) {
      feint = { at: game.random(0.3, waitT * 0.6), dur: 0.5 };
      waitT += 0.5;
    }
    sigT = 0;
    react = -1;
    rivalLit = -1;
    lit = false;
    fly = { x: W * 0.5 + game.random(-300, 300), y: H * 0.3, ph: Math.random() * 6 };
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  function roundOver(win, demo) {
    results.push(win);
    if (win) wins++; else losses++;
    phase = 'show';
    phaseT = 0.55;
    if (!demo && win && wins === 2) {
      game.fx.popup(wins + ' / ' + WIN_NEED, W * 0.5, H * 0.24, { color: BAND_TOP, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function pullCord(demo) {
    if (ended || freeze) return;
    pull = 0.25;
    if (!demo) game.audio.play('se_tap', 0.4);
    if (phase === 'wait') {
      // フライング(蛾・合図前)
      var fx = feint && phaseT >= feint.at && phaseT < feint.at + feint.dur ? W * 0.5 : W * 0.5;
      phase = 'freeze';
      freeze = { t: 0.4, x: fx, y: LANTERN_Y, done: function () {
        game.feedback.bad(W * 0.5, LANTERN_Y - 160, { text: 'MISS' });
        roundOver(false, demo);
      } };
      return;
    }
    if (phase === 'signal') {
      react = sigT;
      lit = true;
      var t = RIVAL_T[Math.min(round, RIVAL_T.length - 1)];
      var gain = Math.round((t - react) * 1000);
      score += 100 + gain * 2;
      if (best === 0 || react < best) best = react;
      phase = 'freeze';
      freeze = { t: 0.3, x: W * 0.5, y: LANTERN_Y, win: true, done: function () {
        game.feedback.good(W * 0.5, LANTERN_Y - 160, { text: react < 0.22 ? 'PERFECT' : 'NICE', color: BAND_MID, count: 20, volume: demo ? 0 : undefined });
        game.fx.popup(react.toFixed(2), W * 0.5, LANTERN_Y + 180, { color: STYLE.main[0], size: 60 });
        roundOver(true, demo);
      } };
      return;
    }
  }

  function stepWorld(dt, demo) {
    if (pull > 0) pull -= dt;
    if (fly) fly.ph += dt;
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    if (phase === 'wait') {
      phaseT += dt;
      if (phaseT >= waitT) {
        phase = 'signal';
        sigT = 0;
        if (!demo) game.audio.tone('A6', 0.12, { wave: 'square', volume: 0.1 });
      }
    } else if (phase === 'signal') {
      sigT += dt;
      var rt = RIVAL_T[Math.min(round, RIVAL_T.length - 1)];
      if (sigT >= rt) {
        rivalLit = round % 2;
        phase = 'freeze';
        freeze = { t: 0.35, x: rivalLit === 0 ? W * 0.15 : W * 0.85, y: LANTERN_Y + 60, done: function () {
          game.feedback.bad(W * 0.5, LANTERN_Y - 160, { text: 'MISS' });
          roundOver(false, demo);
        } };
      }
    } else if (phase === 'show') {
      phaseT -= dt;
      if (phaseT <= 0) {
        round++;
        if (wins >= WIN_NEED || losses >= ROUNDS - WIN_NEED + 1 || round >= ROUNDS) {
          if (!demo) {
            var ok = wins >= WIN_NEED;
            if (ok) { score += Math.round(timeLeft * 20); game.feedback.good(W * 0.5, H * 0.3, { text: 'CLEAR', color: BAND_TOP, count: 36 }); }
            endGame(ok);
          } else demoOver = true;
          return;
        }
        startRound();
      }
    }
  }

  var demoOver = false;

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 川面のさざ波(白ドット列)
    for (var r = 0; r < 6; r++) {
      var yy = H * 0.66 + r * 34;
      for (var i = 0; i < 14; i++) {
        var xx = ((i * 90 + t * (30 + r * 12)) % (W + 90)) - 45;
        game.draw.rect(xx, yy, 36, 5, STYLE.main[1], 0.35 + 0.15 * Math.sin(t * 2 + i + r));
      }
    }
    // 星
    for (var s = 0; s < 24; s++) game.draw.rect((s * 211) % W, (s * 157) % (H * 0.3) + 60, 5, 5, STYLE.main[0], 0.3 + 0.3 * Math.sin(t * 3 + s));
  }

  function drawLantern(x, y, px, on, alpha) {
    var t = game.time.elapsed;
    game.draw.line(x, y - px * 6, x, y - px * 14, STYLE.main[1], 4);
    if (on) game.draw.circle(x, y, px * 9 + Math.sin(t * 12) * 6, STYLE.main[0], 0.25 * alpha);
    game.draw.sprite(LANTERN, { w: on ? STYLE.main[0] : STYLE.main[2] }, x, y, px, { anchor: 'center', alpha: alpha });
    if (on) game.draw.rect(x - px * 3.5, y - px * 1.5, px * 7, px * 3, STYLE.main[0], 0.9 * alpha);
  }

  function drawStage() {
    var t = game.time.elapsed;
    // 両脇の灯籠番(演出だけの相手、半透明)
    for (var s = 0; s < 2; s++) {
      var sx = s === 0 ? W * 0.15 : W * 0.85;
      var litR = rivalLit === s;
      drawLantern(sx, LANTERN_Y + 60, 12, litR, 0.55);
      game.draw.sprite(KEEPER, { w: STYLE.main[1] }, sx, H * 0.6 + Math.sin(t * 2 + s) * 6, 12, { anchor: 'center', alpha: 0.45 });
    }
    // 自分の提灯と紐
    drawLantern(W * 0.5, LANTERN_Y, 22, lit, 1);
    var cordY = LANTERN_Y + 110 + (pull > 0 ? 60 : 0);
    game.draw.line(W * 0.5 + 60, LANTERN_Y + 90, W * 0.5 + 60, cordY + 180, STYLE.main[0], 5);
    game.draw.circle(W * 0.5 + 60, cordY + 190, 16, STYLE.main[0]);
    game.draw.sprite(KEEPER, { w: STYLE.main[0] }, W * 0.5, H * 0.66 + (pull > 0 ? 12 : Math.sin(t * 2) * 5), 22, { anchor: 'center' });
    // 蛍(待ち中はうろつき、合図で提灯にとまって光る)
    if (phase === 'wait' || phase === 'freeze' || phase === 'signal') {
      var onLantern = phase === 'signal' || (phase === 'freeze' && freeze && freeze.win);
      var fx = onLantern ? W * 0.5 - 60 : fly.x + Math.sin(fly.ph * 2.3) * 160;
      var fy = onLantern ? LANTERN_Y - 60 : fly.y + Math.cos(fly.ph * 1.7) * 90;
      if (onLantern) {
        game.draw.circle(fx, fy, 70 + Math.sin(t * 25) * 10, BAND_MID, 0.45);
        game.draw.circle(fx, fy, 30, '#ffffff', 0.9);
      } else game.draw.circle(fx, fy, 16, STYLE.main[1], 0.5);
      game.draw.sprite(FIREFLY, { w: STYLE.main[0] }, fx, fy, 10, { anchor: 'center' });
    }
    // 蛾(フェイント):光らずにとまる
    if (feint && phase === 'wait' && phaseT >= feint.at && phaseT < feint.at + feint.dur) {
      var k = (phaseT - feint.at) / feint.dur;
      var mx = W * 0.5 + 40 + Math.sin(k * 20) * 14;
      game.draw.sprite(MOTH, { w: STYLE.main[1] }, mx, LANTERN_Y - 70 - Math.sin(Math.PI * k) * 20, 14, { anchor: 'center' });
    }
    if (freeze) {
      var a = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(freeze.x, freeze.y, 120 + (0.4 - freeze.t) * 260, '#ffffff', 0.3 * a);
    }
  }

  function drawBands() {
    game.draw.rect(0, 0, W, H * 0.2, BAND_TOP, 0.16);
    game.draw.rect(0, H * 0.2, W, H * 0.45, BAND_MID, 0.07);
    game.draw.rect(0, H * 0.65, W, H * 0.35, BAND_BOT, 0.12);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(game.time.elapsed * 2));
  }

  function drawHud() {
    for (var i = 0; i < ROUNDS; i++) {
      var cx = W * 0.5 - 240 + i * 120, cy = H * 0.05;
      if (i < results.length) {
        if (results[i]) game.draw.circle(cx, cy, 30, STYLE.main[0]);
        else { game.draw.line(cx - 26, cy - 26, cx + 26, cy + 26, STYLE.main[0], 8); game.draw.line(cx - 26, cy + 26, cx + 26, cy - 26, STYLE.main[0], 8); }
      } else game.draw.circle(cx, cy, 30, STYLE.main[2], i === round ? 1 : 0.5);
    }
    txt(wins + ' / ' + WIN_NEED, W * 0.2, H * 0.1, 48, STYLE.main[0]);
    txt('SCORE ' + score, W * 0.72, H * 0.1, 38, STYLE.main[0]);
    var bw = W - 160;
    game.draw.rect(80, H * 0.13, bw, 10, STYLE.main[2]);
    game.draw.rect(80, H * 0.13, bw * Math.max(0, timeLeft / TIME_LIMIT), 10, STYLE.main[0]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.3, W, H * 0.25, '#000000', 0.8);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.36, 96, STYLE.main[0]);
    txt('SCORE ' + score, W * 0.5, H * 0.43, 50, STYLE.main[0]);
    if (!won) txt('あと' + (WIN_NEED - wins) + '勝!', W * 0.5, H * 0.49, 48, STYLE.main[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.49, 48, STYLE.main[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.49, 44, STYLE.main[0]);
  }

  // ── ATTRACT ゴースト実演(同じpullCordで勝負) ─────────────
  var demo = { t: 0, press: 0, planned: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demoOver || round === undefined || round >= 3) {
      demoOver = false;
      initGame();
      ready = 0;
      // 2回戦は必ず蛾のフェイントを出し、つられて引く失敗例を見せる
      demo.planned = -1;
    }
    if (round === 1 && phase === 'wait' && !feint && phaseT < 0.05) {
      feint = { at: 0.3, dur: 0.55 };
      waitT = Math.max(waitT, 1.3);
    }
    demo.press = Math.max(0, demo.press - dt);
    if (freeze) return;
    if (phase === 'signal' && sigT >= 0.2 && round !== 1) { demo.press = 0.2; pullCord(true); }
    if (round === 1 && phase === 'wait' && feint && phaseT > feint.at + 0.2) { demo.press = 0.2; pullCord(true); }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      game.audio.stopBgm();
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    if (phase === 'show' || freeze) { game.audio.play('se_tap', 0.1); return; }
    pullCord(false);
    game.fx.burst(x, y, { color: STYLE.main[0], count: 5, speed: 150 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawStage();
      game.draw.hand(W * 0.5 + 60, LANTERN_Y + 330, { press: demo.press > 0, scale: 13 });
      txt(GAME_TITLE, W * 0.5, H * 0.08, 86, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.13, 40, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.9, 48, STYLE.main[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.9, 42, STYLE.main[0]);
      drawBands();
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawStage();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.9, 40, STYLE.main[0]);
      drawBands();
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawStage();
      drawHud();
      drawOutcome();
      drawBands();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { wins: wins, losses: losses, fastest: best ? Math.round(best * 1000) : 0 };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
    } else {
      // 勝負の最中(待ち・合図)だけ時間が減る
      if (!freeze && (phase === 'wait' || phase === 'signal')) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          freeze = { t: 0.4, x: W * 0.5, y: LANTERN_Y, done: function () {
            game.feedback.bad(W * 0.5, LANTERN_Y - 160, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawStage();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.22, 110, STYLE.main[0]);
    drawBands();
  });

  game.onStart(function () {
    game.audio.melody(
      [['E4', 1], ['G4', 1], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 1], ['R', 2]],
      { tempo: 84, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 4], ['E2', 4]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
