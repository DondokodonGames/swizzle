// I-Wii-0022-rope-ladder-climb.js
// ロープラダー・クライム — 崩れゆく崖の縄ばしごを左右交互に踏んで、落ちる前に登り切る
// 操作: 画面下の左右ゾーンを交互にタップしてロープばしごを登る。同じ側を連続で踏むと足が滑る
// 終わり: てっぺんに着けば成功。崩落に追いつかれるか滑って落ちれば失敗
// @mechanic: alternate_tap
// @theme: crumbling_cliff_rope_ladder
// 世界観: 崩れゆく崖に垂れた縄ばしごを、登山者が左右の足場を交互に踏みながら崩落より速く登り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中間色多め、丁寧なグラデーション、彩度高い自然色
  var C = {
    bg: '#2a4a6a', bg2: '#123048', cliff: '#5a4636', cliffDark: '#3a2c22',
    rope: '#c8a050', good: '#5ee06a', bad: '#ff5a4d', gold: '#ffd23f', white: '#ffffff', ink: '#0e1420',
  };

  var GAME_TITLE = 'ROPE CLIMB';
  var STEPS_NEEDED = 10;
  var LX = W * 0.32, RX = W * 0.68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLIMBER_L = ['.##.', '####', '.##.', '#.#.'];
  var CLIMBER_R = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W * 0.18, H, C.cliffDark);
    game.draw.rect(W * 0.82, 0, W * 0.18, H, C.cliffDark);
  }

  var progress, lastSide, chase, done, endWait, finished, climbY;
  var ready, hitStop, shake;

  function initGame() {
    progress = 0; lastSide = 0; chase = -0.6; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; climbY = 0;
  }

  function step(side, x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    if (side === lastSide) {
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.2;
      hitStop = 0.15;
      game.audio.play('se_bad', 0.3);
      return;
    }
    lastSide = side;
    progress++;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.audio.play('se_tap', 0.15);
    if (progress === Math.floor(STEPS_NEEDED * 0.6)) {
      game.fx.popup('あと' + (STEPS_NEEDED - progress) + '段!', W * 0.5, H * 0.4, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.4);
    }
    if (progress >= STEPS_NEEDED) {
      ok = true; finished = true; hitStop = 0.15;
      game.fx.burst(W * 0.5, H * 0.3, { color: C.gold, count: 18, speed: 340 });
      finish();
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (y < H * 0.72) return;
    var side = x < W * 0.5 ? -1 : 1;
    step(side, x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    climbY += (progress - climbY) * 0.001; // smoothing not critical
    var t = Math.min(1, progress / STEPS_NEEDED);
    var charY = H * 0.62 - t * H * 0.32;
    // rope ladder rungs
    for (var i = 0; i < 8; i++) {
      var ry = H * 0.72 - i * 60 + (t * H * 0.32) % 60;
      game.draw.line(LX, ry, RX, ry, C.rope, 8);
    }
    game.draw.line(LX, H * 0.1, LX, H * 0.85, C.rope, 6);
    game.draw.line(RX, H * 0.1, RX, H * 0.85, C.rope, 6);
    var cx = lastSide <= 0 ? LX : RX;
    game.draw.sprite(lastSide <= 0 ? CLIMBER_L : CLIMBER_R, { '#': C.gold }, cx, charY, 11, { anchor: 'center' });
    // chase (crumbling rockfall) from below, telegraphs by rising warning line
    var chaseY = H * 0.9 - Math.max(0, chase) * H * 0.55;
    var danger = chaseY > charY - 90;
    var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
    if (danger && blink) game.draw.rect(W * 0.15, chaseY - 40, W * 0.7, 8, C.bad, 0.8);
    game.draw.rect(0, chaseY, W, H - chaseY, C.cliffDark, 0.9);
    game.draw.rect(0, chaseY - 10, W, 14, C.bad, 0.6);
  }

  var demo = { t: 0, gx: LX, gy: H * 0.72, press: false, side: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; lastSide = 0; chase = -0.6; }
    var target = Math.min(STEPS_NEEDED, Math.floor((cyc / 2.6) * STEPS_NEEDED));
    while (progress < target) {
      var s = lastSide <= 0 ? 1 : -1;
      lastSide = s; progress++;
      demo.side = s; demo.press = true;
      game.feedback.good(s < 0 ? LX : RX, H * 0.7, { text: 'GOOD', color: C.good, sound: false });
      game.audio.play('se_tap', 0.08);
    }
    demo.gx = demo.side < 0 ? LX : RX; demo.gy = H * 0.72;
    chase = -0.6 + (cyc / 3.2) * 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(progress + ' / ' + STEPS_NEEDED, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (STEPS_NEEDED - progress) + '段!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(progress, { steps: progress });
        else game.end.failure({ steps: progress });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      chase += dt * 0.09;
      var charY = H * 0.62 - (progress / STEPS_NEEDED) * H * 0.32;
      var chaseY = H * 0.9 - Math.max(0, chase) * H * 0.55;
      if (chaseY <= charY + 20) {
        ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(W * 0.5, charY, { text: 'MISS' });
        shake = 0.35;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(progress + ' / ' + STEPS_NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (progress / STEPS_NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
