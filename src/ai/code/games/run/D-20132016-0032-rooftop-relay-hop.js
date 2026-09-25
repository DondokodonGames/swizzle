// D-20132016-0032-rooftop-relay-hop.js
// ルーフトップ・リレーホップ — 自動で走る修理ロボが、迫る障害物をタップのジャンプで飛び越え続ける
// 操作: 前方から迫る障害物が予告線に触れたらタップしてジャンプ。着地までに次の合図が来る
// 終わり: 規定数(6個)を飛び越え切れば成功。ジャンプが遅れて衝突すれば失敗
// @mechanic: camera_run
// @theme: rooftop_robot_dash
// 世界観: 屋根伝いに部品を届ける修理ロボット。自動で前へ走りながら、突き出た配管や看板をタップのジャンプで飛び越え続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 飛び越えた個数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    sky: '#6cc7ff', sky2: '#bfe8ff', roofFar: '#8a97a8', roofNear: '#5a6678',
    body: '#ffcf4d', bodyDark: '#e0a020', outline: '#12141a',
    good: '#4dffb0', bad: '#ff4d5e', gold: '#ffe23d', white: '#ffffff', ink: '#12141a',
  };

  var GAME_TITLE = 'ROOFTOP HOP';
  var TOTAL = 6;
  var RUN_X = W * 0.28, GROUND_Y = H * 0.56;
  var JUMP_DUR = 0.5, JUMP_H = 150;
  var TELEGRAPH_X = W * 0.62, HIT_HALF = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, obst, jumpT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.outline, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_RUN_A = ['.##.', '####', '.oo.', '#..#', '.##.'];
  var BOT_RUN_B = ['.##.', '####', '.oo.', '.##.', '#..#'];
  var BOT_JUMP = ['.##.', '####', '.oo.', '.##.', '....'];

  function bg() {
    game.draw.gradient(0, GROUND_Y + 40, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, GROUND_Y + 40, W, H - GROUND_Y - 40, C.roofNear);
    for (var i = 0; i < 4; i++) game.draw.rect(80 + i * 260, H * 0.10, 140, GROUND_Y + 40 - H * 0.10, C.roofFar, 0.5);
    game.draw.line(0, GROUND_Y + 40, W, GROUND_Y + 40, C.outline, 6);
  }

  function newObst(i) {
    return { x: W * 1.15, speed: 780 + i * 55, resolved: false, telegraphed: false };
  }

  function initGame() {
    cleared = 0; jumpT = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    obst = newObst(0);
  }

  function jump() {
    if (jumpT > 0 || done || ready > 0 || hitStop > 0 || finished) return;
    jumpT = 0.0001;
    game.audio.play('se_jump', 0.35);
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
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function jumpHeight(t) { return t > 0 ? Math.sin(Math.min(1, t / JUMP_DUR) * Math.PI) * JUMP_H : 0; }

  function stepPlay(dt) {
    if (jumpT > 0) { jumpT += dt; if (jumpT > JUMP_DUR) jumpT = 0; }
    if (!obst) return;
    if (!obst.telegraphed && obst.x <= TELEGRAPH_X + 160) { obst.telegraphed = true; game.audio.tone(700, 0.08, { wave: 'square', volume: 0.1 }); }
    obst.x -= obst.speed * dt;
    if (Math.abs(obst.x - RUN_X) < HIT_HALF && !obst.resolved) {
      var airborne = jumpHeight(jumpT) > 60;
      if (airborne) {
        obst.resolved = true;
        cleared++;
        game.feedback.good(RUN_X, GROUND_Y - 100, { text: 'NICE', color: C.good });
        game.fx.burst(RUN_X, GROUND_Y - 40, { color: C.gold, count: 12, speed: 300 });
        game.audio.play('se_good', 0.3);
        if (cleared === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
        if (cleared >= TOTAL) { ok = true; finished = true; hitStop = 0.15; finish(); return; }
        obst = newObst(cleared);
      } else {
        obst.resolved = true;
        hitStop = 0.32;
        game.feedback.bad(RUN_X, GROUND_Y - 40, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawObst(o) {
    if (!o) return;
    if (o.telegraphed) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.line(TELEGRAPH_X, GROUND_Y - 220, TELEGRAPH_X, GROUND_Y + 30, C.bad, 5);
    }
    game.draw.rect(o.x - 24, GROUND_Y - 110, 48, 110, C.outline);
    game.draw.rect(o.x - 18, GROUND_Y - 104, 36, 98, '#ff8a4d');
  }

  function drawBot(x, y, jt) {
    var frame = jt > 0 ? BOT_JUMP : (Math.floor(game.time.elapsed * 8) % 2 === 0 ? BOT_RUN_A : BOT_RUN_B);
    game.draw.circle(x, GROUND_Y + 12, 34, C.outline, 0.25);
    game.draw.sprite(frame, { '#': C.body, o: C.bodyDark }, x, y, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.90, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { obst = newObst(0); jumpT = 0; }
    if (jumpT > 0) { jumpT += dt; if (jumpT > JUMP_DUR) jumpT = 0; }
    if (obst) {
      if (!obst.telegraphed && obst.x <= TELEGRAPH_X + 160) obst.telegraphed = true;
      obst.x -= obst.speed * dt;
      if (Math.abs(obst.x - TELEGRAPH_X - 40) < 6 && jumpT <= 0) { jumpT = 0.0001; demo.press = true; }
      else demo.press = jumpT > 0 && jumpT < 0.1;
      if (Math.abs(obst.x - RUN_X) < HIT_HALF && !obst.resolved) {
        obst.resolved = true;
        if (jumpHeight(jumpT) > 60) { cleared++; game.feedback.good(RUN_X, GROUND_Y - 100, { text: 'NICE', color: C.good }); game.fx.burst(RUN_X, GROUND_Y - 40, { color: C.gold, count: 10, speed: 300 }); }
        obst = newObst(cleared);
      }
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var skyPulse = 0.03 + 0.03 * Math.sin(elapsed * 1.3);

    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#ffffff', skyPulse);
      stepDemo(dt);
      drawBot(RUN_X, GROUND_Y - jumpHeight(jumpT), jumpT);
      drawObst(obst);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + TOTAL : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBot(RUN_X, GROUND_Y, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.12, 30, C.white);
      if (!ok && cleared === TOTAL - 1) txt('あと1個!', W / 2, H * 0.16, 24, C.gold);
      if (ok && (game.best === 0 || cleared >= game.best)) txt('NEW RECORD', W / 2, H * 0.16, 24, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL }); else game.end.failure({ cleared: cleared, total: TOTAL });
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
    game.draw.rect(0, 0, W, H, '#ffffff', skyPulse);
    drawBot(RUN_X, GROUND_Y - jumpHeight(jumpT), jumpT);
    drawObst(finished ? null : obst);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.outline, 0.4);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 145, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
