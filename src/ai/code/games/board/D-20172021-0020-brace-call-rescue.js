// D-20172021-0020-brace-call-rescue.js
// ブレイスコール・レスキュー — 挟まれたロボットを支える3本の支柱から、抜いても崩れない1本を瞬時に見極めて抜く
// 操作: 画面下の3本の支柱のうち、亀裂が最も深い(安全な)支柱をタップで選ぶ。3本抜くまで繰り返す
// 終わり: 3回正しく見極めれば成功。1回でも支えを外すと崩落して失敗
// @mechanic: judge
// @theme: collapse_brace_rescue
// 世界観: 坑道崩落の救助隊員が、瓦礫に挟まれた作業ロボットを支える支柱群を一瞥し、抜いても崩れない支柱だけを瞬時に選んで撤去する
// 残るもの: 正誤(CLEAR/GAME OVER) + 見極めた支柱数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 多色、巨大キャラ、床影、間合いで魅せる
  var C = {
    bg: '#2a2f3d', bg2: '#171a24', rock: '#4a4238', rockDark: '#332c24',
    beam: '#8a6a3a', beamCrack: '#20180c', beamSafe: '#c99a4a',
    bot: '#4ac9e0', botDark: '#217a8a',
    good: '#38d67a', bad: '#ff4d5e', gold: '#ffd24a', ink: '#eef4ff', shadow: '#00000055',
  };

  var GAME_TITLE = 'BRACE CALL';
  var TIME_LIMIT = 13;
  var NEEDED = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0c12', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.####.', '######', '.#.##.', '.#..#.'];

  var slots = [W * 0.24, W * 0.5, W * 0.76];
  var BEAM_Y = H * 0.66, BEAM_H = 300, BEAM_W = 110;
  var BOT_X = W * 0.5, BOT_Y = H * 0.36;

  var round, correctIdx, cracks, wrongIdx, hitCount, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.86, W, H * 0.14, C.rockDark, 1);
  }

  function newRound() {
    correctIdx = Math.floor(Math.random() * 3);
    cracks = [1, 1, 1];
    cracks[correctIdx] = 3;
  }

  function drawBeam(i, highlight) {
    var x = slots[i];
    var col = highlight === i ? C.beamSafe : C.beam;
    game.draw.rect(x - BEAM_W / 2, BEAM_Y - BEAM_H / 2, BEAM_W, BEAM_H, col);
    game.draw.rect(x - BEAM_W / 2, BEAM_Y - BEAM_H / 2, BEAM_W, 14, C.rockDark, 1);
    for (var k = 0; k < cracks[i]; k++) {
      var cy = BEAM_Y - BEAM_H / 2 + 40 + k * 60 + Math.sin(game.time.elapsed * 3 + i + k) * 4;
      game.draw.line(x - 24, cy - 14, x + 6, cy + 16, C.beamCrack, 6);
      game.draw.line(x + 6, cy + 16, x - 10, cy + 34, C.beamCrack, 6);
    }
  }

  function drawScene(showCorrect) {
    for (var i = 0; i < 3; i++) drawBeam(i, showCorrect ? correctIdx : -1);
    var wob = Math.sin(game.time.elapsed * 2) * 4;
    game.draw.circle(BOT_X, BOT_Y + 120, 80, C.shadow);
    game.draw.sprite(BOT_SPRITE, { '#': C.bot }, BOT_X, BOT_Y + wob, 26, { anchor: 'center' });
  }

  function initGame() {
    round = 0; hitCount = 0; wrongIdx = -1; halfCalled = false;
    newRound();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }
  var timeLeft;

  function attempt(i, x, y) {
    if (finished || ready > 0) return;
    if (i === correctIdx) {
      hitCount++;
      round++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.15);
      if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', BOT_X, BOT_Y - 180, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (round >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(BOT_X, BOT_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newRound();
      }
    } else {
      wrongIdx = i;
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
      for (var i = 0; i < 3; i++) {
        var d = Math.abs(x - slots[i]);
        if (y > BEAM_Y - BEAM_H / 2 - 40 && y < BEAM_Y + BEAM_H / 2 + 40 && d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && bd < BEAM_W) attempt(best, x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: slots[1], gy: BEAM_Y, press: false, resolved: false };
  function resetDemo() { initGame(); demo.resolved = false; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = 4.2 / NEEDED;
    var localCyc = cyc % seg;
    if (localCyc < dt * 2) demo.resolved = false;
    var tx = slots[correctIdx];
    if (localCyc < seg * 0.55) {
      var t2 = localCyc / (seg * 0.55);
      demo.gx = W * 0.5 + (tx - W * 0.5) * t2;
      demo.gy = H * 0.86 + (BEAM_Y - H * 0.86) * t2;
      demo.press = false;
    } else {
      demo.gx = tx; demo.gy = BEAM_Y; demo.press = true;
      if (!demo.resolved) {
        demo.resolved = true;
        game.feedback.good(tx, BEAM_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.25);
        round++;
        if (round < NEEDED) newRound();
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (correctIdx === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
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
      drawScene(!ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(hitCount + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - hitCount) + '本!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hitCount, { braces: hitCount, total: NEEDED });
        else game.end.failure({ braces: hitCount, total: NEEDED });
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
        game.feedback.bad(BOT_X, BOT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(false);

    txt(hitCount + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.rockDark, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
