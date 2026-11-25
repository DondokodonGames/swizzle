// D-20222026-0053-castleway-dash.js
// キャッスルウェイダッシュ — 築城中の城下道を駆け抜け、迫る足場の切れ目をタップで跳び越える
// 操作: 前方に切れ目が近づいたらタップしてジャンプし、着地を繰り返して城門まで走り抜ける
// 終わり: 規定回数のジャンプを成功させ城門に到達すれば成功。切れ目に落ちる/時間切れで失敗
// @mechanic: camera_run
// @theme: castleway_dash
// 世界観: 建設中の新しい王城を背に、使者の若者が足場が続く城下道を駆け抜け、切れ目を跳び越えて城門を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び越えた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭、明暗2色フラット
  var C = {
    bg: '#bfe6ff', bg2: '#e8f6ff', road: '#c9a06a', roadEdge: '#8a6a3a', gap: '#5a7a9a',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#20303a',
  };

  var GAME_TITLE = 'CASTLEWAY';
  var TIME_LIMIT = 18;
  var NEED = 6;
  var RUN_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPRITE = ['.##.', '####', '.##.', '.#.#'];
  var CASTLE_SPRITE = ['#.#.#', '#####', '#.#.#', '#####'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    // background castle-under-construction flavor only
    game.draw.sprite(CASTLE_SPRITE, { '#': '#8a7a6a' }, W * 0.5, H * 0.20, 26, { anchor: 'center' });
  }

  var runnerX, gapX, gapPassed, telegraphT, jumping, jumpT, hits, timeLeft;
  var done, endWait, finished, ready, hitStop, shake, halfCalled, speed;

  function nextGap() {
    gapX = W + 200;
    gapPassed = false;
    telegraphT = 0.7;
  }

  function initGame() {
    runnerX = W * 0.30;
    hits = 0; timeLeft = TIME_LIMIT; speed = 620;
    jumping = false; jumpT = 0;
    nextGap();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawScene() {
    game.draw.rect(0, RUN_Y + 40, W, H - (RUN_Y + 40), C.road);
    game.draw.rect(0, RUN_Y + 40, W, 8, C.roadEdge, 0.6);
    // gap marker
    if (gapX > -100 && gapX < W + 100) {
      var warn = telegraphT > 0 && Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.rect(gapX - 45, RUN_Y + 40, 90, H - (RUN_Y + 40), warn ? C.bad : C.gap);
    }
    var jy = RUN_Y - (jumping ? Math.sin(Math.min(1, jumpT / 0.5) * Math.PI) * 130 : 0);
    game.draw.sprite(RUNNER_SPRITE, { '#': C.gold }, runnerX, jy, 42, { anchor: 'center' });
  }

  function jump() {
    if (finished || ready > 0 || jumping) { game.audio.play('se_tap', 0.05); return; }
    jumping = true; jumpT = 0;
    game.audio.play('se_jump', 0.3);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) jump();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.30, gy: RUN_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 3.0;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(NEED - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    demo.gx = runnerX; demo.gy = jumping ? RUN_Y - 100 : RUN_Y;
    if (local > per * 0.55 && local < per * 0.55 + dt * 2 && !jumping) {
      jumping = true; jumpT = 0;
      demo.press = true;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      stepDemo(dt);
      gapX -= speed * dt;
      if (jumping) { jumpT += dt; if (jumpT > 0.5) { jumping = false; hits = Math.min(NEED, hits + 1); } }
      if (!gapPassed && gapX < runnerX) { gapPassed = true; nextGap(); }
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy - 60, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      gapX -= speed * dt;
      if (telegraphT > 0) telegraphT -= dt;
      if (jumping) {
        jumpT += dt;
        if (jumpT > 0.5) jumping = false;
      }
      // collision: if gap under runner while not jumping (mid-air)
      if (Math.abs(gapX - runnerX) < 45 && !gapPassed) {
        var midAir = jumping && jumpT > 0.12 && jumpT < 0.42;
        if (!midAir) {
          finished = true; ok = false; hitStop = 0.4; shake = 0.3;
          game.feedback.bad(runnerX, RUN_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        } else {
          gapPassed = true;
          hits++;
          game.feedback.good(runnerX, RUN_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.3);
          if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', runnerX, RUN_Y - 140, { color: C.gold, size: 32 });
          if (hits >= NEED) {
            finished = true; ok = true; hitStop = 0.3;
            game.fx.burst(runnerX, RUN_Y, { color: C.gold, count: 26, speed: 440 });
            game.audio.play('se_success', 0.5);
            finish();
          } else {
            speed += 20;
            nextGap();
          }
        }
      }
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(runnerX, RUN_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#8a6a3a', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
