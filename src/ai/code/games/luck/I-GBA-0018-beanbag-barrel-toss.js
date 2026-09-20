// I-GBA-0018-beanbag-barrel-toss.js
// ビーンバッグ樽投げ — 屋台の的樽めがけ、引いて放して狙いと強さを決めて投げ入れる
// 操作: 指を引いて角度と強さを決め、離すとその通りに投げる(スリングショット)
// 終わり: 樽の中に命中すれば成功。外せば失敗
// @mechanic: slingshot
// @theme: carnival_barrel_toss_stall
// 世界観: 縁日の射的ならぬ投げ入れ屋台。転がる的樽の中にビーンバッグを投げ込む一発勝負の屋台芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中精度%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの原色、太い白縁取り、丸みのあるUI
  var C = {
    bg: '#ffb703', bg2: '#fb8500', stall: '#023047', stallLine: '#ffffff',
    bag: '#8ecae6', bagDark: '#219ebc', barrel: '#6f4518', barrelRim: '#a5693a',
    good: '#38b000', bad: '#e5383b', gold: '#ffee32', white: '#ffffff', ink: '#101820',
  };

  var GAME_TITLE = 'BARREL TOSS';
  var LX = W * 0.5, LY = H * 0.82;
  var barrelX, barrelDir;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dragging, dragX, dragY, bag, done, endWait, finished, accuracy;
  var ready, hitStop, shake, fullPowerShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VENDOR = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.30, W, 10, C.stallLine, 0.5);
    game.draw.rect(0, H * 0.68, W, 60, C.stall);
  }

  function drawBarrel() {
    game.draw.circle(barrelX, H * 0.42, 76, C.barrelRim);
    game.draw.circle(barrelX, H * 0.42, 56, C.barrel);
    game.draw.circle(barrelX, H * 0.42, 30, C.ink, 0.5);
  }

  function initGame() {
    barrelX = W * 0.5; barrelDir = 1;
    dragging = false; dragX = LX; dragY = LY;
    bag = null; done = false; endWait = 0; finished = false; accuracy = 0;
    ready = 0.8; hitStop = 0; shake = 0; fullPowerShown = false;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || bag) return;
    dragging = true; dragX = x; dragY = y;
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (!dragging) return;
    var dx = x - LX, dy = y - LY;
    var d = Math.hypot(dx, dy);
    var max = 260;
    if (d > max) { dx *= max / d; dy *= max / d; }
    dragX = LX + dx; dragY = LY + dy;
    if (!fullPowerShown && Math.hypot(dx, dy) / max > 0.8) {
      fullPowerShown = true;
      game.fx.popup('NICE', LX, LY - 260, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.4);
    }
  });
  game.onRelease(function() {
    if (!dragging) return;
    dragging = false;
    var dx = LX - dragX, dy = LY - dragY;
    var power = Math.min(1, Math.hypot(dx, dy) / 260);
    if (power < 0.15) { game.feedback.bad(LX, LY, {}); game.audio.play('se_bad', 0.3); return; }
    launch(dx, dy, power);
  });

  function launch(dx, dy, power) {
    var speed = 900 + power * 1400;
    var norm = Math.hypot(dx, dy) || 1;
    bag = { x: LX, y: LY, vx: (dx / norm) * speed, vy: (dy / norm) * speed, power: power };
    game.audio.play('se_jump', 0.4);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveBag() {
    var d = Math.hypot(bag.x - barrelX, bag.y - H * 0.42);
    accuracy = Math.max(0, Math.round(100 - Math.min(100, (d / 6))));
    if (d < 56) {
      ok = true; hitStop = 0.12;
      game.feedback.good(barrelX, H * 0.42, { text: 'IN!', color: C.good });
      game.fx.burst(barrelX, H * 0.42, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_good', 0.4);
    } else {
      ok = false; hitStop = 0.3;
      game.feedback.bad(bag.x, bag.y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    finished = true;
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: LX, gy: LY, press: false, bag: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.bag = null; barrelX = W * 0.5; barrelDir = 1; }
    barrelX += barrelDir * dt * 90;
    if (barrelX > W * 0.65 || barrelX < W * 0.35) barrelDir *= -1;
    if (cyc < 1.0) {
      var p = cyc / 1.0;
      demo.gx = LX - p * 180; demo.gy = LY - p * 130; demo.press = true;
    } else if (cyc < 1.15 && !demo.bag) {
      var dx = LX - demo.gx, dy = LY - demo.gy;
      var norm = Math.hypot(dx, dy) || 1;
      demo.bag = { x: LX, y: LY, vx: (dx / norm) * 1500, vy: (dy / norm) * 1500 };
      demo.press = false;
    } else if (demo.bag) {
      demo.bag.x += demo.bag.vx * dt; demo.bag.y += demo.bag.vy * dt; demo.bag.vy += 900 * dt;
      demo.gx = demo.bag.x; demo.gy = demo.bag.y;
    }
    bag = demo.bag;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBarrel();
      game.draw.sprite(VENDOR, { '#': C.gold }, LX, LY, 22, { anchor: 'center' });
      if (bag) { game.draw.circle(bag.x, bag.y, 22, C.bagDark); game.draw.circle(bag.x, bag.y, 16, C.bag); }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBarrel();
      game.draw.sprite(VENDOR, { '#': C.gold }, LX, LY, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(accuracy + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(accuracy, { accuracy: accuracy });
        else game.end.failure({ accuracy: accuracy });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      barrelX += barrelDir * dt * 130;
      if (barrelX > W * 0.72 || barrelX < W * 0.28) barrelDir *= -1;
      if (bag) {
        bag.x += bag.vx * dt; bag.y += bag.vy * dt; bag.vy += 1100 * dt;
        if (Math.abs(bag.y - H * 0.42) < 40 && Math.abs(bag.x - barrelX) < 40) resolveBag();
        else if (bag.y > H * 0.9 || bag.x < -80 || bag.x > W + 80) {
          accuracy = 0; ok = false; hitStop = 0.25;
          game.feedback.bad(bag.x, Math.min(bag.y, H * 0.85), { text: 'MISS' });
          shake = 0.2;
          game.audio.play('se_bad', 0.4);
          finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBarrel();
    if (dragging) {
      game.draw.line(LX, LY, dragX, dragY, C.stallLine, 8);
      game.draw.circle(dragX, dragY, 26, C.bagDark);
      game.draw.circle(dragX, dragY, 18, C.bag);
    } else if (!bag) {
      game.draw.circle(LX, LY, 22, C.bagDark);
      game.draw.circle(LX, LY, 16, C.bag);
    }
    if (bag) { game.draw.circle(bag.x, bag.y, 22, C.bagDark); game.draw.circle(bag.x, bag.y, 16, C.bag); }
    game.draw.sprite(VENDOR, { '#': C.gold }, LX, LY, 22, { anchor: 'center' });

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F#4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
