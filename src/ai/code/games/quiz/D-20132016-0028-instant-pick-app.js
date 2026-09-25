// D-20132016-0028-instant-pick-app.js
// インスタントピック — 左右に出る図形を瞬時に見比べ、多い/大きい/速い方を選び続ける
// 操作: 左右のカードのうち「多い」「大きい」「速い」に見える方を素早くタップ
// 終わり: 規定回数(5回)正解し切れば成功。1回でも外す・遅れると失敗
// @mechanic: size_judge
// @theme: instant_compare_app
// 世界観: スマホの判定アプリ。次々出る左右のカードを一瞬で見比べ、量・大きさ・速さの優る方を選び続ける挑戦者
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解した回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影・グラデなし、丸角、ベタ塗り数色
  var C = {
    bg: '#eef1f7', card: '#ffffff', cardEdge: '#dfe4ee', dot: '#5b7cff',
    good: '#2ecf7a', bad: '#ff5c72', gold: '#ffb020', white: '#232838', ink: '#232838',
  };

  var GAME_TITLE = 'INSTANT PICK';
  var ROUNDS = 5, MAX_TIME = 12.5;
  var PREVIEW_T = 0.25, WINDOW_T = 1.55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var LX = W * 0.28, RX = W * 0.72, CY = H * 0.46;

  var MODES = ['count', 'size', 'speed'];
  var round, mode, leftVal, rightVal, winner, phase, phaseT, correct, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#c8cee0', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FACE = ['.##.', '####', '.oo.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#f6f8fc'], [1, C.bg]]);
  }

  function newRound(forceMode) {
    mode = forceMode || MODES[Math.floor(Math.random() * MODES.length)];
    if (mode === 'count') {
      var a = 2 + Math.floor(Math.random() * 4), b = a + 2 + Math.floor(Math.random() * 3);
      if (Math.random() < 0.5) { leftVal = a; rightVal = b; } else { leftVal = b; rightVal = a; }
    } else if (mode === 'size') {
      var s1 = 40 + Math.floor(Math.random() * 30), s2 = s1 + 45 + Math.floor(Math.random() * 25);
      if (Math.random() < 0.5) { leftVal = s1; rightVal = s2; } else { leftVal = s2; rightVal = s1; }
    } else {
      var f1 = 1.2 + Math.random() * 0.8, f2 = f1 + 1.8 + Math.random() * 1.2;
      if (Math.random() < 0.5) { leftVal = f1; rightVal = f2; } else { leftVal = f2; rightVal = f1; }
    }
    winner = leftVal > rightVal ? 'left' : 'right';
    phase = 'preview'; phaseT = PREVIEW_T;
  }

  function initGame() {
    round = 0; correct = 0; timeLeft = MAX_TIME; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawCard(x, active) {
    game.draw.rect(x - 150, CY - 190, 300, 380, C.cardEdge);
    game.draw.rect(x - 140, CY - 180, 280, 360, C.card);
    var v = x < W * 0.5 ? leftVal : rightVal;
    if (mode === 'count') {
      var n = v, cols = Math.ceil(Math.sqrt(n));
      for (var i = 0; i < n; i++) {
        var cx = x - 70 + (i % cols) * 50, cy = CY - 60 + Math.floor(i / cols) * 50;
        game.draw.circle(cx, cy, 18, C.dot);
      }
    } else if (mode === 'size') {
      game.draw.circle(x, CY, v, C.dot);
    } else {
      var blink = Math.sin(game.time.elapsed * v * Math.PI * 2) > 0;
      game.draw.circle(x, CY, 70, blink ? C.dot : C.cardEdge);
    }
  }

  function pickSide(px) { return px < W * 0.5 ? 'left' : 'right'; }

  function resolveRound(side) {
    round++;
    hitStop = side === winner ? 0.1 : 0.28;
    var cx = side === 'left' ? LX : RX;
    if (side === winner) {
      correct++;
      timeLeft = Math.min(MAX_TIME, timeLeft + 0.2);
      game.feedback.good(cx, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(cx, CY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (correct === Math.ceil(ROUNDS / 2)) { game.fx.popup('HALFWAY!', W / 2, H * 0.18, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (correct >= ROUNDS) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      shake = 0.22;
      game.feedback.bad(cx, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function tapPlay(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'active') return;
    game.audio.play('se_tap', 0.05);
    resolveRound(pickSide(x));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapPlay(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) { ok = false; finished = true; finish(); return; }
    phaseT -= dt;
    if (phase === 'preview' && phaseT <= 0) { phase = 'active'; phaseT = WINDOW_T; }
    else if (phase === 'active' && phaseT <= 0) { resolveRound(winner === 'left' ? 'right' : 'left'); }
  }

  // ── ATTRACT ゴースト実演: 実ロジックで正しい側へ→次周で誤タップ例 ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, done1: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { newRound(); demo.done1 = false; }
    phaseT -= dt;
    if (phase === 'preview' && phaseT <= 0) { phase = 'active'; phaseT = WINDOW_T; }
    if (phase === 'active' && !demo.done1) {
      var wantWrong = Math.floor(demo.t / 3.6) % 3 === 2;
      var side = wantWrong ? (winner === 'left' ? 'right' : 'left') : winner;
      var tx = side === 'left' ? LX : RX;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (CY - demo.gy) * Math.min(1, dt * 6);
      if (Math.abs(demo.gx - tx) < 10) {
        demo.press = true; demo.done1 = true;
        if (side === winner) { game.feedback.good(tx, CY, { text: 'GOOD', color: C.good }); game.fx.burst(tx, CY, { color: C.gold, count: 10, speed: 300 }); }
        else { game.feedback.bad(tx, CY, { text: 'MISS' }); }
      }
    } else if (phase === 'preview') {
      demo.gx += ((W * 0.5) - demo.gx) * Math.min(1, dt * 4);
      demo.gy += ((H * 0.86) - demo.gy) * Math.min(1, dt * 4);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 2.2) * 5;

    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#000000', 0.02 + 0.02 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      game.draw.sprite(FACE, { '#': C.dot, o: C.gold }, W * 0.5, H * 0.16 + bob * 0.3, 18, { anchor: 'center' });
      drawCard(LX, phase === 'active'); drawCard(RX, phase === 'active');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.68, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(FACE, { '#': C.dot, o: C.gold }, W * 0.5, H * 0.16, 18, { anchor: 'center' });
      drawCard(LX, false); drawCard(RX, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(correct + ' / ' + ROUNDS, W / 2, H * 0.68, 28, C.white);
      if (!ok && correct === ROUNDS - 1) txt('あと1問!', W / 2, H * 0.72, 24, C.gold);
      if (ok && (game.best === 0 || correct >= game.best)) txt('NEW RECORD', W / 2, H * 0.72, 24, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correct, { correct: correct, total: ROUNDS }); else game.end.failure({ correct: correct, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.sprite(FACE, { '#': C.dot, o: C.gold }, W * 0.5, H * 0.16 + bob * 0.3, 18, { anchor: 'center' });
    drawCard(LX, phase === 'active' && !finished); drawCard(RX, phase === 'active' && !finished);

    txt(correct + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, H * 0.68, W - 120, 16, C.cardEdge);
    game.draw.rect(60, H * 0.68, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.15], ['E5', 0.15], ['G5', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
