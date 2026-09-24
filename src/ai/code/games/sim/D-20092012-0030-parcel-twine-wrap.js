// D-20092012-0030-parcel-twine-wrap.js
// パーセル・ツイン・ラップ — 荷造り台の小包に指で円を描くように紐を巻きつけ、表面をできるだけ覆う
// 操作: 小包の縁に沿って指で円を描くように何周もなぞり、紐を巻きつける
// 終わり: 制限時間内に被覆率が目標に届けば成功。届かなければ失敗
// @mechanic: rotate_gesture
// @theme: parcel_wrapping_bench
// 世界観: 郵便集配所の荷造り台。見習いが小包に紐を何重にも巻きつけ、規定の被覆率まで仕上げて送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 被覆率%
// スタイル: SKEUOMORPH
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・革の質感をgradient+細線で。ボタンは上明下暗+白ハイライト
  var C = {
    bg1: '#5a4630', bg2: '#3a2c1c', bench: '#8a6a44', benchEdge: '#4a3620',
    box: '#c9a066', boxDark: '#8a6a3e', twine: '#e8d29a', twineDark: '#b89050',
    good: '#6fdf9a', bad: '#ff6a5a', gold: '#ffd23f', white: '#fff6e0', ink: '#2a1c10',
  };

  var GAME_TITLE = 'TWINE WRAP';
  var CX = W * 0.5, CY = H * 0.44;
  var BOX_W = 420, BOX_H = 300;
  var TIME_LIMIT = 11;
  var TARGET_WRAPS = 6.5;
  var R_MIN = 170, R_MAX = 340;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var accumRad, lastAngle, hasLast, timeLeft, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOX_SPRITE = ['######', '#....#', '#....#', '######'];

  function initGame() {
    accumRad = 0; lastAngle = 0; hasLast = false; timeLeft = TIME_LIMIT; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.62, W, H * 0.4, C.bench);
    game.draw.rect(0, H * 0.62, W, 10, C.benchEdge);
    for (var i = 0; i < 6; i++) game.draw.line(i * (W / 6), H * 0.64, i * (W / 6), H, C.benchEdge, 2);
  }

  function coverage() { return Math.min(1, accumRad / (TARGET_WRAPS * Math.PI * 2)); }

  function drawBox() {
    game.draw.circle(CX, CY + BOX_H * 0.55, 200, C.ink, 0.25);
    game.draw.sprite(BOX_SPRITE, { '#': C.boxDark }, CX, CY, 62, { anchor: 'center' });
    game.draw.rect(CX - BOX_W / 2 + 14, CY - BOX_H / 2 + 14, BOX_W - 28, BOX_H - 28, C.box);
    // twine coverage rises from bottom of box, with diagonal texture ticks
    var cov = coverage();
    var coverH = (BOX_H - 28) * cov;
    var topY = CY + BOX_H / 2 - 14 - coverH;
    game.draw.rect(CX - BOX_W / 2 + 14, topY, BOX_W - 28, coverH, C.twine, 0.92);
    var ticks = Math.floor(coverH / 16);
    for (var t = 0; t < ticks; t++) {
      var ty = topY + t * 16 + 8;
      game.draw.line(CX - BOX_W / 2 + 14, ty - 8, CX - BOX_W / 2 + 40, ty + 8, C.twineDark, 4);
      game.draw.line(CX - BOX_W / 2 + 40, ty - 8, CX + BOX_W / 2 - 14, ty + 8, C.twineDark, 3);
    }
    game.draw.rect(CX - BOX_W / 2, CY - BOX_H / 2, BOX_W, 10, C.boxDark);
    game.draw.rect(CX - BOX_W / 2, CY + BOX_H / 2 - 10, BOX_W, 10, C.boxDark);
  }

  function onRotateMove(x, y) {
    if (ready > 0 || finished || done) return;
    var dx = x - CX, dy = y - CY;
    var r = Math.hypot(dx, dy);
    if (r < R_MIN || r > R_MAX) { hasLast = false; return; }
    var ang = Math.atan2(dy, dx);
    if (hasLast) {
      var delta = ang - lastAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      accumRad += Math.abs(delta);
      if (Math.abs(delta) > 0.02) game.audio.play('se_tap', 0.02);
    }
    lastAngle = ang; hasLast = true;

    if (!milestoneShown && coverage() >= 0.5) {
      milestoneShown = true;
      game.fx.popup('NICE', CX, CY - 260, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.35);
    }
    if (coverage() >= 1) {
      ok = true; finished = true; hitStop = 0.1;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good, size: 30 });
      game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 340 });
      game.audio.play('se_success', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); hasLast = false; } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.005); onRotateMove(x, y); } });
  game.onRelease(function() { game.audio.play('se_tap', 0.02); hasLast = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.2;
  }

  var demo = { t: 0, gx: CX + 260, gy: CY, press: true, ang: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { accumRad = 0; milestoneShown = false; demo.ang = 0; }
    var spd = 3.4;
    demo.ang += dt * spd;
    accumRad += dt * spd;
    demo.gx = CX + Math.cos(demo.ang) * 260;
    demo.gy = CY + Math.sin(demo.ang) * 200;
    demo.press = cyc < 2.8;
    if (Math.floor(demo.ang / 0.6) !== Math.floor((demo.ang - dt * spd) / 0.6)) game.audio.play('se_tap', 0.015);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (accumRad === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBox();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBox();
      var pct = Math.round(coverage() * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round(coverage() * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBox();

    txt(Math.round(coverage() * 100) + '%', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, timeLeft < 3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
