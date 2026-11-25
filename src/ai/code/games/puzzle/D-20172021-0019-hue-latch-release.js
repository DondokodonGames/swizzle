// D-20172021-0019-hue-latch-release.js
// ヒューラッチ・リリース — シュートに詰まった色玉の下で、今露出している玉と同じ色の留めピンだけを見極めて抜く
// 操作: チュート周囲4方向の留めピンから、中央下端の玉と同じ色のピンをタップして抜く。ピン配置は毎回入れ替わる
// 終わり: 4個すべて正しいピンで抜けば成功。違う色のピンを抜くと即座に失敗
// @mechanic: gap_fit
// @theme: cargo_pin_release
// 世界観: 深夜の仕分け倉庫で、荷物シュートに詰まった色玉の下端を見極め、対応する留めピンだけを抜いて荷崩れなく流し切る整備士
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いたピン数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4階調の黄緑寄りモノクロ、残像感、画面枠
  var C = {
    bg: '#c6d68a', bg2: '#a9bd68', ink: '#213318', frame: '#2c4020',
    tube: '#7f9a52', tubeDark: '#5c7238',
    good: '#2f5e22', bad: '#7a2418', gold: '#3a5a24', white: '#eef6d8',
  };
  var COLORS = ['#e0483c', '#3f7de0', '#3fae4a', '#d99a1e'];
  var NAMES = 4;

  var GAME_TITLE = 'PIN RELEASE';
  var TIME_LIMIT = 18;
  var NEEDED = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#152008', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TUBE_X = W * 0.5, TUBE_Y = H * 0.42, TUBE_W = 220, TUBE_H = 560;
  var PIN_SPRITE = ['.##.', '####', '.##.'];
  var MECH_SPRITE = ['.##.', '####', '#.##', '.##.'];

  var pinPos = [
    { x: TUBE_X - TUBE_W * 0.5 - 90, y: TUBE_Y - 140 },
    { x: TUBE_X + TUBE_W * 0.5 + 90, y: TUBE_Y - 140 },
    { x: TUBE_X - TUBE_W * 0.5 - 90, y: TUBE_Y + 220 },
    { x: TUBE_X + TUBE_W * 0.5 + 90, y: TUBE_Y + 220 },
  ];

  var stackOrder, step, timeLeft, done, endWait, finished, ready, hitStop, shake;
  var pinColorIdx, wrongPin, halfCalled;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function reshufflePins() {
    pinColorIdx = shuffle([0, 1, 2, 3]);
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#eef6d8', pulse);
    game.draw.rect(0, 0, W, 18, C.frame, 1);
    game.draw.rect(0, H - 18, W, 18, C.frame, 1);
    game.draw.sprite(MECH_SPRITE, { '#': C.frame }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  function drawTube() {
    game.draw.rect(TUBE_X - TUBE_W / 2, TUBE_Y - TUBE_H / 2, TUBE_W, TUBE_H, C.tubeDark);
    game.draw.rect(TUBE_X - TUBE_W / 2 + 10, TUBE_Y - TUBE_H / 2 + 10, TUBE_W - 20, TUBE_H - 20, C.tube);
    var slot = TUBE_H / NEEDED;
    for (var s2 = 0; s2 < stackOrder.length; s2++) {
      if (s2 < step) continue;
      var posInStack = s2 - step; // 0 = bottom-most visible
      var by = TUBE_Y + TUBE_H / 2 - 60 - posInStack * (slot * 0.9);
      var bob = posInStack === 0 ? Math.sin(game.time.elapsed * 3) * 6 : 0;
      game.draw.circle(TUBE_X, by + bob, 70, COLORS[stackOrder[s2]]);
      game.draw.circle(TUBE_X, by + bob, 70, '#00000022', 0);
    }
    // exit gate glow at bottom
    game.draw.rect(TUBE_X - TUBE_W / 2 - 6, TUBE_Y + TUBE_H / 2 - 8, TUBE_W + 12, 16, C.gold, 0.5 + 0.3 * Math.sin(game.time.elapsed * 4));
  }

  function drawPins(pressIdx) {
    for (var p = 0; p < pinPos.length; p++) {
      var pos = pinPos[p];
      var col = COLORS[pinColorIdx[p]];
      var wob = Math.sin(game.time.elapsed * 2.4 + p) * 3;
      game.draw.rect(pos.x - 34, pos.y - 16 + wob, 68, 32, C.tubeDark);
      game.draw.sprite(PIN_SPRITE, { '#': col }, pos.x, pos.y + wob, 12, { anchor: 'center' });
      if (p === pressIdx) game.draw.circle(pos.x, pos.y + wob, 46, '#ffffff', 0.25);
    }
  }

  function initGame() {
    stackOrder = [0, 1, 2, 3];
    shuffle(stackOrder);
    reshufflePins();
    step = 0; timeLeft = TIME_LIMIT; wrongPin = -1; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptPin(pIdx, x, y) {
    if (finished || ready > 0) return;
    var needColor = stackOrder[step];
    if (pinColorIdx[pIdx] === needColor) {
      step++;
      game.audio.play('se_tap', 0.15);
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      if (step === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', TUBE_X, TUBE_Y - 260, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (step >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        reshufflePins();
      }
    } else {
      wrongPin = pIdx;
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var best = -1, bd = 1e9;
      for (var i = 0; i < pinPos.length; i++) {
        var d = Math.hypot(x - pinPos[i].x, y - pinPos[i].y);
        if (d < bd) { bd = d; best = i; }
      }
      if (bd < 100) attemptPin(best, x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: pinPos[0].x, gy: pinPos[0].y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = 4.4 / NEEDED;
    var localCyc = cyc % seg;
    var needColor = stackOrder[Math.min(step, NEEDED - 1)];
    var targetPin = 0;
    for (var p = 0; p < pinColorIdx.length; p++) if (pinColorIdx[p] === needColor) targetPin = p;
    var tp = pinPos[targetPin];
    if (localCyc < seg * 0.6) {
      var t2 = localCyc / (seg * 0.6);
      demo.gx = W * 0.5 + (tp.x - W * 0.5) * t2;
      demo.gy = (H * 0.86) + (tp.y - H * 0.86) * t2;
      demo.press = false;
    } else {
      demo.gx = tp.x; demo.gy = tp.y; demo.press = true;
      if (localCyc >= seg * 0.6 && localCyc < seg * 0.6 + dt * 2 && step < NEEDED) {
        step++;
        if (step < NEEDED) reshufflePins();
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stackOrder === undefined) initGame();
      stepDemo(dt);
      bg();
      drawTube();
      drawPins(-1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTube();
      drawPins(wrongPin);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(step + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (NEEDED - step) + '個!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(step, { released: step, total: NEEDED });
        else game.end.failure({ released: step, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(TUBE_X, TUBE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTube();
    drawPins(-1);

    txt(step + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.tubeDark, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
