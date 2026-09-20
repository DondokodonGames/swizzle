// I-GBA-0059-teapot-pour-control.js
// 急須の一滴 — 湯呑みに湯を注ぐ。長押しで注ぎ続け、溢れる寸前で指を離す
// 操作: 画面を長押しして急須を傾け注ぐ。狙いの量に届く直前で指を離す
// 終わり: 目標量の範囲内で止められれば成功。溢れさせるか少なすぎれば失敗
// @mechanic: hold_duration
// @theme: teapot_pour_control
// 世界観: 静かな茶室。見習いが客人の湯呑みに湯を注ぐ。溢れさせても注ぎ足りなくても作法違反になる
// 残るもの: 正誤(CLEAR/GAME OVER) + 注いだ量(目標との差)
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る
  var C = {
    bg: '#f2ede2', bg2: '#e8e0d0', ink: '#1a1712', inkSoft: '#8a8276',
    water: '#2a2620', target: '#3a3428', good: '#1a1712', bad: '#1a1712', white: '#f8f4ea',
  };

  var GAME_TITLE = 'TEAPOT POUR';
  var CX = W * 0.5, CUP_Y = H * 0.62, CUP_W = 180, CUP_H = 130;
  var TARGET_MIN = 62, TARGET_MAX = 78; // %
  var FILL_RATE = 42; // %/秒
  var LIMIT = 6.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var fill, pouring, timeLeft, done, endWait, finished, milestoneHit;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var POT_SPRITE = ['..####', '.#....#', '##....#', '.#....#', '..####'];

  function ditherRect(x, y, w, h, color, density) {
    // 1BIT INK: 塗りの代わりに横ストリップの間引きでディザ表現
    var step = 6;
    for (var yy = 0; yy < h; yy += step) {
      for (var xx = 0; xx < w; xx += step) {
        if ((xx + yy) % (step * 2) < step * density) game.draw.rect(x + xx, y + yy, 3, 3, color);
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.line(0, H * 0.9, W, H * 0.9, C.inkSoft, 3);
    game.draw.sprite(POT_SPRITE, { '#': C.ink }, W * 0.28, H * 0.28, 20, { anchor: 'center' });
  }

  function drawCup(fillPct) {
    var x = CX - CUP_W / 2, y = CUP_Y - CUP_H / 2;
    game.draw.line(x, y, x, y + CUP_H, C.ink, 6);
    game.draw.line(x + CUP_W, y, x + CUP_W, y + CUP_H, C.ink, 6);
    game.draw.line(x, y + CUP_H, x + CUP_W, y + CUP_H, C.ink, 6);
    var fh = (CUP_H - 12) * Math.min(1, fillPct / 100);
    if (fh > 1) ditherRect(x + 6, y + CUP_H - 6 - fh, CUP_W - 12, fh, C.water, fillPct > 100 ? 2 : 1);
    // 目標帯(壁の内側に薄い線)
    var minY = y + CUP_H - 6 - (CUP_H - 12) * (TARGET_MIN / 100);
    var maxY = y + CUP_H - 6 - (CUP_H - 12) * (TARGET_MAX / 100);
    game.draw.line(x - 14, minY, x, minY, C.inkSoft, 3);
    game.draw.line(x - 14, maxY, x, maxY, C.inkSoft, 3);
    if (fillPct > 100) {
      // 溢れ演出
      ditherRect(x - 10, y + CUP_H - 4, CUP_W + 20, 24, C.water, 1);
    }
  }

  function drawPot(pouring) {
    var tilt = pouring ? 34 : 0;
    game.draw.line(CX - 60, H * 0.4, CX + 60 + tilt, H * 0.4 - tilt * 0.4, C.ink, 10);
    game.draw.circle(CX + 60 + tilt, H * 0.4 - tilt * 0.4, 14, C.ink);
    if (pouring) {
      game.draw.line(CX + 74 + tilt, H * 0.4 - tilt * 0.4 + 6, CX + 74 + tilt, CUP_Y - CUP_H / 2 - 10, C.water, 5);
    }
  }

  function initGame() {
    fill = 0; pouring = false; timeLeft = LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneHit = false;
  }

  function resolveStop() {
    if (finished || done || ready > 0) return;
    pouring = false;
    finished = true;
    if (fill >= TARGET_MIN && fill <= TARGET_MAX) {
      ok = true; hitStop = 0.25;
      game.feedback.good(CX, CUP_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, CUP_Y, { color: C.ink, count: 16, speed: 300 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; hitStop = 0.35; shake = 0.25;
      game.feedback.bad(CX, CUP_Y, { text: fill > TARGET_MAX ? 'MISS' : 'MISS' });
      game.audio.play('se_failure', 0.4);
    }
    finish();
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished && ready <= 0 && !done) {
      pouring = true;
      game.audio.play('se_tap', 0.1);
    }
  });
  game.onRelease(function() {
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); resolveStop(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { fill = 0; pouring = false; milestoneHit = false; }
    var holdDur = (TARGET_MIN + (TARGET_MAX - TARGET_MIN) * 0.5) / FILL_RATE;
    demo.press = cyc < holdDur;
    pouring = demo.press;
    if (pouring) fill = Math.min(130, fill + FILL_RATE * dt);
    if (!milestoneHit && fill >= 40) { milestoneHit = true; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fill === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPot(pouring);
      drawCup(fill);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.inkSoft);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.inkSoft);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPot(false);
      drawCup(fill);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, C.ink);
      txt(Math.round(fill) + ' / ' + TARGET_MAX, W / 2, H * 0.13, 28, C.inkSoft);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.inkSoft);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var fillR = Math.round(fill);
        if (ok) game.end.success(fillR, { fill: fillR }); else game.end.failure({ fill: fillR });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (pouring) {
        fill += FILL_RATE * dt;
        if (!milestoneHit && fill >= TARGET_MIN - 15) {
          milestoneHit = true;
          game.fx.popup('もうすぐ!', CX, CUP_Y - 160, { color: C.ink, size: 32 });
          game.audio.play('se_milestone', 0.3);
        }
      }
      if (fill > 100) {
        // 溢れて即失敗(telegraphは目標帯の可視化で事前予告済み)
        ok = false; finished = true; hitStop = 0.35; shake = 0.3; pouring = false;
        game.feedback.bad(CX, CUP_Y, { text: 'MISS' });
        game.audio.play('se_failure', 0.4);
        finish();
      } else if (timeLeft <= 0) {
        resolveStop();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPot(pouring);
    drawCup(fill);

    txt(Math.round(fill) + ' / 100', W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.inkSoft, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / LIMIT), 16, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.6], ['A4', 0.6], ['F4', 1.2]], { tempo: 84, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
