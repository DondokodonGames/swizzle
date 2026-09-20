// GH-PS-0030-flipper-knock.js
// フリッパーノック — フリッパーで玉を弾く。落ちる前に3つの的を全部倒す
// 操作: 押している間だけ力をためる。離すと玉が飛ぶ。狙った的の高さでちょうど離す
// 終わり: 3つの的。倒せた数が残る
// @mechanic: hold_charge
// @theme: pinball_table
// 世界観: 小さな盤の中、3つの的が高さ違いで並ぶ。ためた分だけ玉が高く飛ぶ。的の高さぴったりで離せば倒せる
// 残るもの: 倒した数(SCORE) + 挑戦した的の数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2010s FLAT MOBILE: 影なし・丸角・余白。ベタ塗り数色
  var C = {
    bg: '#eef0f6', table: '#5a6cf0', target: '#ff8a3a', targetDown: '#c8ccd8', ball: '#ffd400',
    good: '#2ecc71', bad: '#e74c3c', gold: '#ffb020', white: '#ffffff', ink: '#22252b', dim: '#8a8f98',
  };

  var GAME_TITLE = 'FLIPPER KNOCK';
  var TARGETS = [{ y: 0.22, down: false }, { y: 0.34, down: false }, { y: 0.46, down: false }];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, knocked = 0;

  var shotIdx, charging, power, ballY, flying, done, endWait, resolved;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2, LAUNCH_Y = H * 0.62;

  function tableBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#e0e4ee']]);
    // 盤の光の帯(横に流れる、ATTRACT差分検出のためにも使う)
    var pillarX = (game.time.elapsed * 300) % (W + 300) - 150;
    game.draw.rect(pillarX, 0, 200, H, '#3a2a8a', 0.14);
    game.draw.rect(W * 0.14, H * 0.16, W * 0.72, H * 0.50, C.table);
    for (var i = 0; i < TARGETS.length; i++) {
      var t = TARGETS[i];
      var y = H * t.y;
      game.draw.circle(CX, y, 46, t.down ? C.targetDown : C.target);
    }
  }

  var BALL_SPRITE = ['.#.', '###', '.#.'];

  function newShot() {
    charging = false; power = 0; ballY = LAUNCH_Y; flying = false; resolved = false;
  }

  function initGame() {
    shotIdx = 0; knocked = 0;
    for (var i = 0; i < TARGETS.length; i++) TARGETS[i].down = false;
    done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newShot();
  }

  function launch() {
    if (done || ready > 0 || flying || shotIdx >= TARGETS.length) return;
    flying = true;
  }

  function judgeLanding() {
    var target = TARGETS[shotIdx];
    var targetY = H * target.y;
    var reachY = LAUNCH_Y - power * (LAUNCH_Y - H * 0.14);
    var diff = Math.abs(reachY - targetY);
    hitStop = 0.08;
    if (diff < 40) {
      target.down = true; knocked++;
      game.feedback.good(CX, targetY, { text: 'DOWN', color: C.good });
      game.fx.burst(CX, targetY, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      game.feedback.bad(CX, reachY, { text: 'MISS' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
    }
    shotIdx++;
    if (shotIdx >= TARGETS.length) finish();
    else { newShot(); game.fx.popup(shotIdx + ' / ' + TARGETS.length, W / 2, H * 0.10, { color: C.gold, size: 42 }); }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = knocked * 100;
    game.audio.stopBgm();
    game.audio.play(knocked > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });
  game.onPress(function() {
    if (state !== S.PLAYING || done || flying || shotIdx >= TARGETS.length) return;
    charging = true; power = 0;
    game.audio.play('se_tap', 0.1);
  });
  game.onRelease(function() {
    if (!charging) return;
    charging = false;
    game.audio.play('se_tap', 0.15);
    launch();
  });

  // ── ATTRACT ゴースト実演: 的の高さでちょうど離す ──
  var demo = { t: 0, gx: CX, gy: H * 0.80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { for (var i = 0; i < TARGETS.length; i++) TARGETS[i].down = false; shotIdx = 0; }
    demo.press = cyc < 1.0;
    if (demo.press) { power = Math.min(1, cyc / 0.9); ballY = LAUNCH_Y; }
    else if (cyc < 1.6) {
      var t2 = TARGETS[0];
      var progress = (cyc - 1.0) / 0.6;
      ballY = LAUNCH_Y - progress * (LAUNCH_Y - H * t2.y);
      if (progress > 0.95 && !t2.down) { t2.down = true; game.feedback.good(CX, H * t2.y, { text: 'DOWN', color: C.good }); game.fx.burst(CX, H * t2.y, { color: C.gold, count: 10, speed: 300 }); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      tableBg();
      stepDemo(dt);
      if (!demo.press) game.draw.sprite(BALL_SPRITE, { '#': C.ball }, CX, ballY, 10, { anchor: 'center' });
      else game.draw.sprite(BALL_SPRITE, { '#': C.ball }, CX, LAUNCH_Y, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 46, C.ink);
      txt('BEST ' + game.best, W / 2, H * 0.13, 26, C.dim);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 42, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 32, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.dim);
      }
      return;
    }

    if (state === S.RESULT) {
      tableBg();
      txt(knocked >= 2 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, knocked >= 2 ? C.ink : C.bad);
      txt('DOWN ' + knocked + ' / ' + TARGETS.length, W / 2, H * 0.72, 40, C.gold);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.78, 28, C.dim);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.83, 30, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 30, C.dim);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: knocked + '/' + TARGETS.length }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (charging) {
      power = Math.min(1, power + dt * 0.9);
    } else if (flying) {
      ballY -= dt * 900;
      var topY = LAUNCH_Y - power * (LAUNCH_Y - H * 0.14);
      if (ballY <= topY) { ballY = topY; flying = false; judgeLanding(); }
    }
    if (shake > 0) shake -= dt;

    tableBg();
    if (shotIdx < TARGETS.length) game.draw.sprite(BALL_SPRITE, { '#': C.ball }, CX, charging ? LAUNCH_Y : ballY, 12, { anchor: 'center' });

    game.draw.rect(60, H * 0.70, W - 120, 24, C.white);
    game.draw.rect(60, H * 0.70, (W - 120) * power, 24, C.gold);
    txt(shotIdx + ' / ' + TARGETS.length, W / 2, H * 0.75, 34, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
