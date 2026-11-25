// J-N644-0013-grain-sack-tug-pull.js
// グレインサックタグプル — 綱の左右を交互に手繰り、重い穀物袋を自陣まで引き寄せる
// 操作: 綱の左手側/右手側のグリップを左右交互にタップして手繰る。同じ側を連続で押すと綱が滑る
// 終わり: 制限時間内に袋を自陣まで引き切れば成功。引き切れず時間切れになれば失敗
// @mechanic: alternate_tap
// @theme: harvest_sack_tug_pull
// 世界観: 収穫祭の綱引き場、見習い力自慢が対岸の相手チーム(演出のみ)と重い穀物袋を挟んで綱を引き合い、左右交互の手繰りだけで自陣まで手繰り寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き寄せた進捗%
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: #0f380f〜#9bbc0f の4階調のみ、残像+低コントラスト、画面枠
  var C = {
    c0: '#0f380f', c1: '#1f4d1f', c2: '#306230', c3: '#8bac0f', c4: '#9bbc0f',
  };

  var GAME_TITLE = 'SACK PULL';
  var TIME_LIMIT = 9;
  var GRIP_L_X = W * 0.27, GRIP_R_X = W * 0.73, GRIP_Y = H * 0.85, GRIP_R = 130;
  var ROPE_Y = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.c0, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND = ['.##.', '####', '.##.'];
  var SACK = ['.####.', '######', '######', '.####.'];
  var RIVAL = ['.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.c1], [1, C.c0]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 3, C.c0, 0.3);
    game.draw.rect(0, 0, W, 14, C.c0);
    game.draw.rect(0, H - 14, W, 14, C.c0);
    game.draw.rect(0, 0, 14, H, C.c0);
    game.draw.rect(W - 14, 0, 14, H, C.c0);
  }

  var progress, vel, lastSide, combo, timeLeft, done, endWait, finished, ready, hitStop, shake, halfShown;

  function initGame() {
    progress = 0; vel = 0; lastSide = null; combo = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function pull(side, x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (side === lastSide) {
      combo = 0;
      progress = Math.max(0, progress - 3);
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      lastSide = side;
      return;
    }
    lastSide = side;
    combo++;
    var gain = 4 + Math.min(4, Math.floor(combo / 4));
    progress = Math.min(100, progress + gain);
    game.audio.play('se_tap', 0.2);
    game.feedback.good(x, y, { text: '', color: C.c4, count: 5 });
    if (combo === 6) { game.fx.popup('NICE', W * 0.5, ROPE_Y - 120, { color: C.c4, size: 34 }); game.audio.play('se_milestone', 0.3); }
    if (!halfShown && progress >= 50) {
      halfShown = true;
      game.fx.popup('HALFWAY!', W * 0.5, ROPE_Y - 160, { color: C.c4, size: 36 });
      game.audio.play('se_milestone', 0.35);
    }
    if (progress >= 100) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(W * 0.5, ROPE_Y, { text: 'CLEAR', color: C.c4, count: 18 });
      game.fx.burst(W * 0.5, ROPE_Y, { color: C.c4, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var dL = Math.hypot(x - GRIP_L_X, y - GRIP_Y);
      var dR = Math.hypot(x - GRIP_R_X, y - GRIP_Y);
      if (dL <= GRIP_R) pull('L', x, y);
      else if (dR <= GRIP_R) pull('R', x, y);
    }
  });

  function drawGrips() {
    game.draw.circle(GRIP_L_X, GRIP_Y, GRIP_R, C.c2);
    game.draw.sprite(HAND, { '#': C.c4 }, GRIP_L_X, GRIP_Y, 26, { anchor: 'center' });
    game.draw.circle(GRIP_R_X, GRIP_Y, GRIP_R, C.c2);
    game.draw.sprite(HAND, { '#': C.c4 }, GRIP_R_X, GRIP_Y, 26, { anchor: 'center' });
  }

  function drawRope() {
    var sackX = W * 0.5 + (W * 0.26) * (1 - progress / 50);
    var sway = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.line(W * 0.1, ROPE_Y + sway * 0.3, sackX, ROPE_Y, C.c3, 14);
    game.draw.line(sackX, ROPE_Y, W * 0.9, ROPE_Y - sway * 0.3, C.c3, 14);
    game.draw.rect(W * 0.12, ROPE_Y + 40, W * 0.06, 10, C.c4);
    game.draw.rect(W * 0.82, ROPE_Y - 50, W * 0.06, 10, C.c4);
    game.draw.sprite(SACK, { '#': C.c2 }, sackX, ROPE_Y - 60 + sway * 0.4, 20, { anchor: 'center' });
    game.draw.sprite(RIVAL, { '#': C.c1, '.': null }, W * 0.9, ROPE_Y - 130, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: GRIP_L_X, gy: GRIP_Y, press: false, side: 'L' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.side = 'L'; }
    var step = 0.22;
    var phase = cyc % step;
    if (cyc < 2.8) {
      demo.gx = demo.side === 'L' ? GRIP_L_X : GRIP_R_X;
      demo.gy = GRIP_Y;
      demo.press = phase < step * 0.4;
      if (phase < dt && progress < 100) {
        pull(demo.side, demo.gx, demo.gy);
        demo.side = demo.side === 'L' ? 'R' : 'L';
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRope();
      drawGrips();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.c4);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.c3);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.c4);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.c3);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRope();
      drawGrips();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.c4 : '#e0f090');
      txt(Math.round(progress) + ' / 100', W / 2, H * 0.13, 28, C.c3);
      if (!ok) txt('あと' + Math.max(0, 100 - Math.round(progress)) + '%!', W / 2, H * 0.18, 24, C.c4);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.c4);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(progress);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      progress = Math.max(0, progress - dt * 1.4);
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, ROPE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRope();
    drawGrips();

    txt(Math.round(progress) + ' / 100', W / 2, H * 0.06, 30, C.c4);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.c1, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? '#e0f090' : C.c4);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 56, C.c4);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.2], ['E3', 0.2], ['C3', 0.2], ['G3', 0.4]], { tempo: 158, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
