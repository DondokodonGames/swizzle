// J-N6424-0022-spindle-perch-hold.js
// スピンドルパーチホールド — 回転台でぐるぐる回された直後、揺れる足場で規定時間持ちこたえる
// 操作: 回転が止まったら、傾いた方向と逆側をタップして重心を戻し、足場から落ちないよう耐える
// 終わり: 規定時間バランスを保てれば成功。傾きが限界を超えて落下すれば失敗
// @mechanic: balance
// @theme: spin_platform_endurance
// 世界観: 見世物小屋の軽業師が回転台でグルグル回された直後、目を回しながらも揺れる足場の上でバランスを取り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 持ちこたえた時間
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 太い輪郭・大きめキャラ、パレットは限定色
  var C = {
    bg: '#2a1e3d', bg2: '#160f24', ring: '#ff9f4a', ringDark: '#c76b1e',
    perch: '#5a3c7a', perchTop: '#8a63b8', acrobat: '#ffd23f', acrobatDark: '#c79a1e',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'PERCH HOLD';
  var CX = W * 0.5, CY = H * 0.5;
  var TIME_LIMIT = 15; // balance帯域(15〜25s)の下限に合わせた合計尺(SPIN+HOLD)
  var HOLD_TIME = 13;
  var SPIN_TIME = 2;
  var TILT_MAX = 1.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#160f24', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ACROBAT_L = ['.##.', '####', '##..', '.##.'];
  var ACROBAT_R = ['.##.', '####', '..##', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.ring, pulse * 0.4);
    game.draw.circle(CX, CY + 260, 320, C.ring, 0.15);
  }

  var spinT, phase, tilt, tiltVel, timeLeft, hitCount, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    spinT = SPIN_TIME; phase = 'spin'; tilt = 0; tiltVel = 0;
    timeLeft = HOLD_TIME; hitCount = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene(spinAngle) {
    game.draw.circle(CX, CY + 220, 240, C.perch);
    game.draw.rect(CX - 240, CY + 200, 480, 24, C.perchTop);
    var px = CX + tilt * 220, py = CY + 40 + Math.abs(tilt) * 30;
    var sprite = tilt < 0 ? ACROBAT_L : ACROBAT_R;
    var dizzy = phase === 'spin' ? spinAngle : 0;
    game.draw.sprite(sprite, { '#': C.acrobat }, px + Math.sin(dizzy) * 20, py, 26, { anchor: 'center' });
    game.draw.line(CX - 260, CY + 240, CX + 260, CY + 240, C.ringDark, 8);
    var markX = CX + tilt * 260;
    game.draw.circle(markX, CY + 240, 14, Math.abs(tilt) > TILT_MAX * 0.7 ? C.bad : C.gold);
  }

  function counterTilt(dir, x, y) {
    if (finished || ready > 0 || phase !== 'hold') return;
    tiltVel -= dir * 1.7;
    game.audio.play('se_tap', 0.15);
    game.feedback.good(x, y, { text: '', color: C.gold, size: 0 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var dir = x < W / 2 ? -1 : 1;
      counterTilt(dir, x, y);
    }
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPhysics(dt) {
    if (phase === 'spin') {
      spinT -= dt;
      if (spinT <= 0) { phase = 'hold'; tilt = 0.55 * (Math.random() < 0.5 ? -1 : 1); tiltVel = 0; }
      return;
    }
    tiltVel += (Math.random() - 0.5) * 2.6 * dt;
    tiltVel *= Math.max(0.4, 1 - 0.5 * dt);
    tilt += tiltVel * dt;
    tilt = Math.max(-1.3, Math.min(1.3, tilt));
    if (Math.abs(tilt) > TILT_MAX * 0.75 && Math.floor(game.time.elapsed * 6) % 2 === 0) {
      // telegraph near-fall
    }
    if (Math.abs(tilt) >= TILT_MAX) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.fx.flash(C.bad, 0.2);
      game.feedback.bad(CX + tilt * 220, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    timeLeft -= dt;
    if (!halfCalled && timeLeft <= HOLD_TIME * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', CX, CY - 260, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (timeLeft <= 0) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  var demo = { t: 0, gx: CX, gy: CY };
  function resetDemo() { initGame(); phase = 'hold'; tilt = 0.5; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    tilt += Math.sin(demo.t * 3) * 0.4 * dt;
    tilt *= 0.985;
    var dir = tilt > 0 ? 1 : -1;
    demo.gx = tilt > 0 ? W * 0.72 : W * 0.28; demo.gy = H * 0.86;
    if (Math.floor(demo.t * 3) % 3 === 0) tiltVel -= dir * 0.3 * dt * 30;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(demo.t * 6);
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
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
      drawScene(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt((HOLD_TIME - Math.max(0, timeLeft)).toFixed(1) + 's / ' + HOLD_TIME + 's', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, timeLeft).toFixed(1) + 's!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var held = HOLD_TIME - Math.max(0, timeLeft);
        if (ok) game.end.success(HOLD_TIME, { held: Math.round(held * 10) / 10 });
        else game.end.failure({ held: Math.round(held * 10) / 10 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPhysics(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(0);
    txt(Math.max(0, timeLeft).toFixed(1) + ' / ' + HOLD_TIME, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var progress = phase === 'spin' ? 1 : Math.max(0, 1 - Math.abs(tilt) / TILT_MAX);
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.2);
    game.draw.rect(60, 150, tbW * progress, 16, progress < 0.3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 108, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
