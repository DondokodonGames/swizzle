// D-20132016-0018-rolling-shard-tunnel.js
// ローリングシャード — 横向きに転がる鉱石が自動で進むトンネルを、指でドラッグして壁に触れぬよう誘導する
// 操作: 鉱石を指で上下にドラッグし、狭まるトンネルの壁や突起に触れないよう誘導し続ける
// 終わり: 制限時間まで壁に触れず進めば成功。壁や突起に触れれば失敗
// @mechanic: guide_path
// @theme: crystal_tunnel_roll
// 世界観: 地底を貫く結晶トンネル。転がる鉱石球を指で誘導し、狭まる壁と突き出す岩棚に触れぬよう最深部まで転がしきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ秒数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で、等角に積む
  var C = {
    bg1: '#1c1433', bg2: '#0a0618', wallTop: '#6a4fae', wallL: '#4a3480', wallR: '#3a2866',
    warn: '#ff3d5a', ball: '#ffd93d', ballDark: '#c99a00',
    good: '#37d97a', bad: '#ff3d5a', gold: '#ffd93d', white: '#f2eaff', ink: '#0a0618',
  };

  var GAME_TITLE = 'CRYSTAL ROLL';
  var MAX_TIME = 18;
  var BALL_X = W * 0.30;
  var COLS = 44;
  var COL_W = W / COLS;
  var PREVIEW = 3.0; // 画面全幅が表す先読み秒数
  var BASE_HALF = 220;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var progressTime, ballY, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, squeezeTimes;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function centerY(t) {
    return H * 0.52 + Math.sin(t * 1.05) * H * 0.14 + Math.sin(t * 0.4 + 1) * H * 0.05;
  }

  function squeezeAt(t) {
    for (var i = 0; i < squeezeTimes.length; i++) {
      var d = t - squeezeTimes[i];
      if (d > -0.35 && d < 0.55) {
        var k = 1 - Math.abs(d) / 0.55;
        return Math.max(0, k);
      }
    }
    return 0;
  }

  function halfWidthAt(t) {
    var sq = squeezeAt(t);
    return BASE_HALF - sq * (BASE_HALF - 90);
  }

  function initGame() {
    progressTime = 0; ballY = centerY(0); done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    squeezeTimes = [3.2, 6.4, 9.6, 12.8, 16.0];
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function drawTunnel() {
    for (var i = 0; i <= COLS; i++) {
      var x = i * COL_W;
      var tAhead = progressTime + (x - BALL_X) / W * PREVIEW;
      var cy = centerY(tAhead);
      var hw = halfWidthAt(tAhead);
      var sq = squeezeAt(tAhead);
      var warn = sq > 0 && sq < 1 && Math.floor(game.time.elapsed * 10) % 2 === 0;
      var topCol = warn ? C.warn : C.wallTop;
      game.draw.rect(x, 0, COL_W + 1, Math.max(0, cy - hw), warn ? C.warn : C.wallL, warn ? 0.7 : 1);
      game.draw.rect(x, cy - hw, COL_W + 1, 14, topCol);
      game.draw.rect(x, cy + hw - 14, COL_W + 1, 14, topCol);
      game.draw.rect(x, cy + hw, COL_W + 1, Math.max(0, H - (cy + hw)), warn ? C.warn : C.wallR, warn ? 0.7 : 1);
    }
  }

  function drawBall() {
    var bob = Math.sin(game.time.elapsed * 6) * 3;
    var spin = (game.time.elapsed * 220) % 360;
    game.draw.circle(BALL_X, ballY + bob, 34, C.ballDark);
    game.draw.circle(BALL_X, ballY + bob, 26, C.ball);
    game.draw.sprite(['.#.', '###', '.#.'], { '#': C.ballDark }, BALL_X + Math.sin(spin * Math.PI / 180) * 8, ballY + bob, 6, { anchor: 'center' });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING && !done && !finished && ready <= 0) { ballY = y; game.audio.play('se_tap', 0.04); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && !done && !finished && ready <= 0) ballY = y; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function checkCollision() {
    var cy = centerY(progressTime);
    var hw = halfWidthAt(progressTime);
    if (ballY < cy - hw + 20 || ballY > cy + hw - 20) {
      ok = false; finished = true; hitStop = 0.35;
      game.feedback.bad(BALL_X, ballY, { text: 'MISS' });
      shake = 0.3;
      finish();
      return true;
    }
    return false;
  }

  var demo = { t: 0, gx: BALL_X, gy: H * 0.5, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    progressTime = cyc;
    var target = centerY(progressTime);
    ballY += (target - ballY) * Math.min(1, dt * 3);
    demo.gx = BALL_X; demo.gy = ballY; demo.press = true;
    if (progressTime > 0.3 && progressTime < 4.7 && !milestoneShown) { milestoneShown = true; game.fx.popup(Math.round(progressTime) + ' / ' + MAX_TIME, W * 0.5, H * 0.2, { color: C.gold, size: 34 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progressTime === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTunnel();
      drawBall();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawTunnel(); drawBall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(Math.round(progressTime) + ' / ' + MAX_TIME, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, Math.round(MAX_TIME - progressTime)) + '秒!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var secs = Math.round(progressTime);
        if (ok) game.end.success(secs, { seconds: secs }); else game.end.failure({ seconds: secs });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      progressTime += dt;
      if (!milestoneShown && progressTime > MAX_TIME * 0.5) { milestoneShown = true; game.fx.popup(Math.round(progressTime) + ' / ' + MAX_TIME, BALL_X, H * 0.18, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
      if (checkCollision()) { /* finish済み */ }
      else if (progressTime >= MAX_TIME) {
        ok = true; finished = true;
        game.feedback.good(BALL_X, ballY, { text: 'CLEAR', color: C.good });
        game.fx.burst(BALL_X, ballY, { color: C.gold, count: 20, speed: 380 });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTunnel();
    drawBall();

    txt(Math.round(progressTime) + ' / ' + MAX_TIME, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000040');
    game.draw.rect(60, 150, (W - 120) * (progressTime / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
