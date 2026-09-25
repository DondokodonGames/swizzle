// D-20222026-0059-rooftop-beat-hop.js
// ルーフトップビートホップ — 屋根を自動で走り抜けるキャラを、拍に合わせたタップでジャンプさせて障害物を避ける
// 操作: 曲の拍に合わせて障害物の手前でタップしジャンプする。早すぎ/遅すぎは失敗
// 終わり: 規定回数を拍どおりに跳び越えれば成功。拍を外す/衝突/時間切れで失敗
// @mechanic: rhythm
// @theme: rooftop_beat_hop
// 世界観: 夜の街並みを飛び越えて進む配達人が、曲の拍に合わせて屋根の継ぎ目を跳び越え、次の屋根へ渡っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 拍に合わせて跳べた回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るいグラデ、シンプルな塊フォルム
  var C = {
    bg: '#ffb870', bg2: '#ff8f5a', roof: '#5a4a6a', roofEdge: '#3a2f4a',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffe23f', ink: '#2a1f3a',
  };

  var GAME_TITLE = 'BEAT HOP';
  var TIME_LIMIT = 14;
  var NEED = 6;
  var BEAT = 0.85;
  var WINDOW = 0.16;
  var RUN_Y = H * 0.58;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
    game.draw.rect(0, RUN_Y + 40, W, H - (RUN_Y + 40), C.roof);
    game.draw.rect(0, RUN_Y + 40, W, 8, C.roofEdge, 0.6);
  }

  var beatT, hits, timeLeft, jumping, jumpT, gapVisibleX, gapSpawned;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    beatT = 0; hits = 0; timeLeft = TIME_LIMIT;
    jumping = false; jumpT = 0;
    gapSpawned = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function beatPhase() { return beatT % BEAT; }
  function inWindow() { var m = beatPhase(); return m < WINDOW || m > BEAT - WINDOW; }

  function drawScene() {
    var pulse = inWindow() ? 1.15 : 1.0;
    game.draw.circle(W * 0.5, RUN_Y + 60, 18 * pulse, C.gold, 0.6);
    if (gapSpawned) {
      var warn = Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.rect(W * 0.62 - 40, RUN_Y + 40, 80, H - (RUN_Y + 40), warn ? C.bad : '#3a2f4a');
    }
    var jy = RUN_Y - (jumping ? Math.sin(Math.min(1, jumpT / 0.4) * Math.PI) * 100 : 0);
    game.draw.sprite(COURIER_SPRITE, { '#': C.ink }, W * 0.5, jy, 40, { anchor: 'center' });
  }

  function onBeatTap() {
    if (finished || ready > 0) return;
    if (jumping) { game.audio.play('se_tap', 0.05); return; }
    if (inWindow()) {
      jumping = true; jumpT = 0;
      hits++;
      game.feedback.good(W * 0.5, RUN_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.35);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', W * 0.5, RUN_Y - 140, { color: C.gold, size: 32 });
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(W * 0.5, RUN_Y, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(W * 0.5, RUN_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onBeatTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: RUN_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    beatT = cyc;
    demo.press = inWindow() && beatPhase() < dt * 3;
    if (demo.press && !jumping && hits < NEED) {
      jumping = true; jumpT = 0;
      hits++;
      game.feedback.good(W * 0.5, RUN_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.2);
    }
    if (jumping) { jumpT += dt; if (jumpT > 0.4) jumping = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy - 60, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
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
      beatT += dt;
      if (jumping) { jumpT += dt; if (jumpT > 0.4) jumping = false; }
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, RUN_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#3a2f4a', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.2]], { tempo: 141, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
