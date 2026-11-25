// D-20172021-0039-nightshift-anomaly-watch.js
// ナイトシフト・アノマリー・ウォッチ — 整然と作業をこなす技師たちの中に紛れた一人だけ挙動のおかしい人影を制限時間内に見抜く
// 操作: 並ぶ技師たちを見比べ、動きのリズムだけ違う一人を制限時間内にタップする
// 終わり: 挙動のおかしい一人を当てれば成功。違う相手を選ぶ/時間切れは失敗
// @mechanic: spot
// @theme: nightshift_anomaly_watch
// 世界観: 深夜稼働の工場フロアを巡回する保安検査官が、整然と作業をこなす技師たちの中に紛れた一人だけ挙動のおかしい人影を制限時間内に見抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜くまでの残り時間
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: ほぼ単色の陰影、強いコントラスト、影は塗りつぶしのみ
  var C = {
    bg: '#12140f', bg2: '#08090a', floor: '#1c1f18', floorLine: '#2c3024',
    worker: '#d8d8cc', workerDark: '#3a3c34', beam: '#e8e8dc',
    good: '#4cc86a', bad: '#e0503c', gold: '#e8d878', white: '#eceee2', ink: '#08090a',
  };

  var GAME_TITLE = 'ANOMALY WATCH';
  var TIME_LIMIT = 10;
  var GRID = 3;
  var CELL = 260;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var suspIdx, playT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_SPRITE = ['.##.', '####', '.##.', '#..#', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.beam, pulse * 0.3);
    var sweepX = (Math.sin(game.time.elapsed * 0.6) * 0.5 + 0.5) * W;
    game.draw.rect(sweepX - 4, 0, 8, H, C.beam, 0.05);
    for (var i = 0; i < GRID; i++) {
      var yy = H * 0.24 + i * CELL;
      game.draw.line(BOARD_X - 420, yy, BOARD_X + 420, yy, C.floorLine, 2, 0.3);
    }
  }

  function cellPos(i) {
    var cx = i % GRID, cy = Math.floor(i / GRID);
    return { x: BOARD_X + (cx - 1) * CELL, y: BOARD_Y + (cy - 1) * CELL };
  }

  function initGame() {
    suspIdx = Math.floor(Math.random() * GRID * GRID);
    playT = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawWorkers() {
    for (var i = 0; i < GRID * GRID; i++) {
      var p = cellPos(i);
      var isSusp = i === suspIdx;
      var freq = isSusp ? 6.2 : 3;
      var amp = isSusp ? 12 : 7;
      var bob = Math.sin(game.time.elapsed * freq + i * 0.15) * amp;
      var tint = isSusp && Math.floor(game.time.elapsed * 6.2) % 3 === 0 ? C.bad : C.worker;
      game.draw.circle(p.x, p.y + 60, 46, C.workerDark, 0.5);
      game.draw.sprite(WORKER_SPRITE, { '#': tint }, p.x, p.y + bob, 20, { anchor: 'center' });
    }
  }

  function resolvePick(i, x, y) {
    if (finished || done) return;
    if (i === suspIdx) {
      ok = true; finished = true;
      hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      ok = false; finished = true;
      hitStop = 0.32; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished || done) return;
    game.audio.play('se_tap', 0.1);
    for (var i = 0; i < GRID * GRID; i++) {
      var p = cellPos(i);
      if (game.hit.circle(x, y, 8, p.x, p.y, 70)) { resolvePick(i, p.x, p.y); return; }
    }
    game.feedback.bad(x, y, { text: 'MISS' });
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { suspIdx = Math.floor(Math.random() * GRID * GRID); }
    var p = cellPos(suspIdx);
    if (cyc < 1.6) {
      var t2 = cyc / 1.6;
      demo.gx = BOARD_X + (p.x - BOARD_X) * t2;
      demo.gy = H * 0.9 + (p.y - H * 0.9) * t2;
      demo.press = false;
    } else if (cyc < 1.8) {
      demo.press = true;
    } else {
      demo.gx = p.x; demo.gy = p.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (suspIdx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawWorkers();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWorkers();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(Math.max(0, Math.round(TIME_LIMIT - playT)) + ' / ' + TIME_LIMIT, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと1歩!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.max(0, Math.round(TIME_LIMIT - playT)), { timeLeft: Math.max(0, Math.round(TIME_LIMIT - playT)) });
        else game.end.failure({ timeLeft: Math.max(0, Math.round(TIME_LIMIT - playT)) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      if (Math.floor(playT * 2) === Math.floor(TIME_LIMIT) && Math.floor((playT - dt) * 2) !== Math.floor(TIME_LIMIT)) {
        game.audio.play('se_milestone', 0.2);
      }
      if (playT >= TIME_LIMIT) {
        finished = true; ok = false;
        hitStop = 0.25; shake = 0.2;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawWorkers();

    txt(Math.max(0, Math.ceil(TIME_LIMIT - playT)) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - playT / TIME_LIMIT), 16, playT > TIME_LIMIT * 0.7 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.25], ['D3', 0.25], ['F3', 0.25], ['G3', 0.5]], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
