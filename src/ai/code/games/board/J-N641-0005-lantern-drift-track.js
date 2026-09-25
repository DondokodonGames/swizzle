// J-N641-0005-lantern-drift-track.js
// 宙吊り提灯の灯追い — 5つの提灯が順番に灯る様子を記憶し、消えた後に同じ順でタップして再現する
// 操作: 宙に浮かぶ5つの提灯が点灯する順番をよく見て覚え、全て消えたら同じ順番でタップする
// 終わり: 全て正しい順番でタップできれば成功。順番違いか時間切れで失敗
// @mechanic: memory_sequence
// @theme: lantern_drift_light_track
// 世界観: 灯り職人見習いの旅人が、夜道に宙吊りになった5つの提灯が順番に灯っていく様子を目で覚え、消灯後に同じ順で灯芯を指し示す
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく再現した提灯数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮、地平線へ収束する床
  var C = {
    bg: '#1a1030', bg2: '#0a0618', horizon: '#3a2a5a', floorA: '#2a1e48', floorB: '#221838',
    lanternOff: '#3a2a5a', lanternShow: '#ffb347', lanternDone: '#7cd94a', light: '#fff2c0',
    good: '#7cd94a', badc: '#ff4d5e', gold: '#ffd400', ink: '#f0e8ff',
  };

  var GAME_TITLE = 'LANTERN TRACK';
  var N = 5;
  var TIME_LIMIT = 13;
  var SHOW_GAP = 0.5;

  var X0 = [];
  for (var i = 0; i < N; i++) X0.push(W * (0.14 + i * 0.18));
  var LY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#08040f', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPR = ['.##.', '####', '####', '.##.'];

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.55, W, 4, C.horizon, 0.8);
    for (var i = 0; i < 12; i++) {
      var frac = i / 12;
      var y = H * 0.55 + frac * frac * H * 0.4;
      var w = W * (0.2 + frac * 1.3);
      game.draw.rect(W / 2 - w / 2, y, w, Math.max(2, 18 * frac), i % 2 === 0 ? C.floorA : C.floorB, 0.7);
    }
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.3);
    game.draw.rect(0, 0, W, H, C.lanternShow, pulse * 0.2);
  }

  var order, phase, showIdx, showT, hit, timeLeft;
  var done, endWait, finished, ready, hitStop, shake;

  function buildOrder() {
    order = [0, 1, 2, 3, 4];
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
  }

  function initGame() {
    buildOrder();
    phase = 'show'; showIdx = 0; showT = 0; hit = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function lanternAt(x, y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < N; i++) {
      var d = Math.hypot(X0[i] - x, LY - y);
      if (d < bd) { bd = d; best = i; }
    }
    return bd <= 100 ? best : -1;
  }

  function drawScene() {
    for (var i = 0; i < N; i++) {
      var col = C.lanternOff;
      var lit = false;
      if (phase === 'show' && order[showIdx] === i) { col = C.lanternShow; lit = true; }
      else if (phase === 'input' && order.indexOf(i) < hit) { col = C.lanternDone; }
      var bob = Math.sin(game.time.elapsed * 2 + i) * 6;
      if (lit) game.draw.circle(X0[i], LY + bob - 10, 34, C.light, 0.5);
      game.draw.sprite(LANTERN_SPR, { '#': col, '.': lit ? C.gold : C.lanternOff }, X0[i], LY + bob, 26, { anchor: 'center' });
    }
  }

  function resolveTap(i) {
    if (phase !== 'input' || finished || ready > 0) return;
    if (order[hit] === i) {
      hit++;
      hitStop = 0.08;
      game.feedback.good(X0[i], LY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (hit === 3) game.fx.popup('あと' + (N - hit) + '!', W / 2, H * 0.2, { color: C.gold, size: 30 });
      if (hit >= N) {
        ok = true; finished = true; hitStop = 0.2;
        game.feedback.good(X0[i], LY, { text: 'CLEAR', color: C.good });
        game.fx.burst(X0[i], LY, { color: C.gold, count: 22, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.25;
      game.feedback.bad(X0[i], LY, { text: 'MISS' });
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var i = lanternAt(x, y);
      if (i >= 0) resolveTap(i);
      else game.audio.play('se_tap', 0.15);
    }
  });

  var demo = { t: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { buildOrder(); phase = 'show'; showIdx = 0; showT = 0; hit = 0; }
    if (phase === 'show') {
      showT += dt;
      if (showT >= SHOW_GAP) {
        showT = 0; showIdx++;
        game.audio.play('se_tap', 0.12);
        if (showIdx >= N) phase = 'input';
      }
    } else if (phase === 'input') {
      var p = cyc - N * SHOW_GAP;
      var step = Math.floor(p / 0.45);
      if (step > hit && step <= N) {
        var idx = order[hit];
        hit++;
        game.feedback.good(X0[idx], LY, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg(game.time.elapsed);
      stepDemo(dt);
      drawScene();
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.badc);
      txt(hit + ' / ' + N, W / 2, H * 0.15, 26, C.gold);
      if (!ok) txt('あと' + (N - hit) + '灯!', W / 2, H * 0.2, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hit, { hit: hit, total: N });
        else game.end.failure({ hit: hit, total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); phase = 'show'; showIdx = 0; showT = 0; }
    } else if (phase === 'show') {
      showT += dt;
      if (showT >= SHOW_GAP) {
        showT = 0; showIdx++;
        game.audio.play('se_tap', 0.12);
        if (showIdx >= N) phase = 'input';
      }
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, LY, { text: 'MISS' });
        game.audio.play('se_failure', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    drawScene();

    if (phase === 'input') {
      txt(hit + ' / ' + N, W / 2, H * 0.08, 26, C.ink);
      var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
      game.draw.rect(60, 150, W - 120, 14, C.floorB, 0.6);
      game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.badc : C.gold);
    } else if (phase === 'show') {
      txt(GAME_TITLE, W / 2, H * 0.08, 26, C.ink);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 108, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
