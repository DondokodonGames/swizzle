// GH-PS2-0054-bike-jack.js
// バイクジャック — 走っている相手に飛び乗る瞬間を合わせる
// 操作: バイクが横に並んだ瞬間にタップして飛び乗る
// 終わり: 早すぎ/遅すぎは失敗。ぴったりで成功
// @mechanic: timing_one_shot
// @theme: highway_chase
// 世界観: 斜め見下ろしの道路。相手のバイクが横に並ぶ一瞬だけ飛び移れる。ずれれば道に落ちる
// 残るもの: 正誤(CLEAR/GAME OVER) + ずれの大きさ
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s ISO: 菱形グリッド、影で高さを示す
  var C = {
    road1: '#4a4a3a', road2: '#3a3a2c', grid: '#5a5a48',
    bike1: '#3a5a8a', bike2: '#8a3a3a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#141210',
  };

  var GAME_TITLE = 'BIKE JACK';
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, diffM = 0;

  var offset, speed, done, endWait, resolved;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function roadBg() {
    game.draw.gradient(0, H, [[0, '#2a2a20'], [1, '#1a1a12']]);
    for (var i = 0; i < 10; i++) {
      var t = i / 9;
      var yy = H * 0.16 + t * H * 0.62;
      var w = 40 + t * (W * 0.9);
      game.draw.rect(CX - w / 2, yy, w, 6, C.grid, 0.35);
    }
    for (var j = -6; j <= 6; j++) game.draw.line(CX + j * 60, H * 0.16, CX + j * 260, H * 0.80, C.grid, 2);
  }

  var BIKE_SPRITE = ['.##.', '####', '.#.#'];

  function drawBikes() {
    var y = H * 0.42;
    game.draw.circle(CX, y + 40, 60, '#000000', 0.3);
    game.draw.sprite(BIKE_SPRITE, { '#': C.bike1 }, CX, y, 22, { anchor: 'center' });
    var x2 = CX + offset;
    game.draw.circle(x2, y + 40, 60, '#000000', 0.3);
    game.draw.sprite(BIKE_SPRITE, { '#': C.bike2 }, x2, y, 22, { anchor: 'center' });
  }

  function initGame() {
    offset = -300; speed = 260; done = false; endWait = 0; resolved = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptJump() {
    if (done || ready > 0 || resolved) return;
    resolved = true;
    hitStop = 0.1;
    diffM = Math.round(Math.abs(offset) * 0.02 * 10) / 10;
    ok = Math.abs(offset) < 30;
    if (ok) { game.feedback.good(CX, H * 0.42, { text: 'JACK!', color: C.good }); game.fx.burst(CX, H * 0.42, { color: C.gold, count: 16, speed: 380 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(CX + offset, H * 0.42, { text: diffM + 'm' }); shake = 0.15; game.audio.play('se_failure', 0.4); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    attemptJump();
  });

  // ── ATTRACT ゴースト実演: 横に並んだ瞬間だけタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.62, press: false, off: -300 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    demo.off = -300 + Math.min(1, cyc / 1.15) * 300;
    offset = demo.off;
    demo.press = cyc > 1.05 && cyc < 1.25;
    if (cyc > 1.05 && cyc < 1.08) { game.feedback.good(CX, H * 0.42, { text: 'JACK!', color: C.good }); game.fx.burst(CX, H * 0.42, { color: C.gold, count: 10, speed: 300 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (offset === undefined) initGame();
      roadBg();
      stepDemo(dt);
      drawBikes();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 58, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.15, 30, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 50, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 34, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      roadBg();
      drawBikes();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, ok ? C.white : C.bad);
      txt(diffM + 'm', W / 2, H * 0.62, 54, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 36, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; if (ok) game.end.success({ diff: diffM }); else game.end.failure({ diff: diffM }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!resolved) {
      var prevOff = offset;
      offset += speed * dt;
      if (prevOff < -50 && offset >= -50) game.fx.popup('CLOSE', W / 2, H * 0.20, { color: C.gold, size: 42 });
      if (offset > 340) { resolved = true; ok = false; diffM = 99; game.feedback.bad(CX + 300, H * 0.42, { text: 'MISS' }); finish(); }
    }
    if (shake > 0) shake -= dt;

    roadBg();
    drawBikes();

    var frac = Math.max(0, Math.min(1, (offset + 300) / 600));
    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.5);
    game.draw.rect(60 + (W - 120) * 0.45, 40, (W - 120) * 0.10, 20, C.good, 0.5);
    game.draw.rect(60 + (W - 120) * frac - 6, 40, 12, 20, C.gold);
    txt(Math.round(frac * 100) + ' / ' + 100, W / 2, 100, 30, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 74, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
