// I-GBA-0025-pillar-shove-topple.js
// ピラーショウブトップル — 円の中に立つ木柱に連打で勢いをぶつけ、時間内に倒す
// 操作: 円内の木柱を連続タップで押し、勢いゲージを満タンにして倒す
// 終わり: 制限時間内に押し倒せれば成功。倒せなければ失敗
// @mechanic: push_out
// @theme: training_yard_pillar_shove
// 世界観: 道場の稽古場、円の中に立つ丸太の的を連打の勢いだけで押し倒そうとする力比べの修行
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した勢い%
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 太い輪郭線、彩度高めの大きなキャラ表現
  var C = {
    bg: '#d97b3a', bg2: '#a8501f', ring: '#6b3f1e', ringLine: '#3a2410',
    pillar: '#caa06a', pillarDark: '#8a6a3a', good: '#7aff5a', bad: '#ff5a4a',
    gold: '#ffe14d', white: '#fff6e0', ink: '#1a0e04',
  };

  var GAME_TITLE = 'PILLAR SHOVE';
  var DUR = 20;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var power, lean, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIGHTER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(CX, CY + 220, 340, C.ring);
    game.draw.circle(CX, CY + 220, 320, C.ringLine, 0.5);
  }

  function initGame() {
    power = 0; lean = 0; timeLeft = DUR; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function shove(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    power = Math.min(100, power + 6);
    lean = Math.min(60, lean + 5);
    game.feedback.good(CX + (game.random(-40, 40)), CY, { text: '', color: C.gold, size: 18, count: 4 });
    game.audio.play('se_tap', 0.15);
    if (!milestoneShown && power >= 50) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.4);
    }
    if (power >= 100) {
      ok = true; hitStop = 0.15;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_break', 0.5);
      finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) shove(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawPillar(l, fallen) {
    var topX = CX + l;
    if (fallen) {
      game.draw.line(CX - 80, CY + 70, CX + 160, CY + 20, C.pillarDark, 40);
      game.draw.line(CX - 80, CY + 70, CX + 160, CY + 20, C.pillar, 26);
    } else {
      game.draw.line(CX, CY + 90, topX, CY - 110, C.pillarDark, 44);
      game.draw.line(CX, CY + 90, topX, CY - 110, C.pillar, 30);
      if (l > 40) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(topX, CY - 110, 40, C.bad, 0.3);
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: CY + 260, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { power = 0; lean = 0; }
    if (cyc < 2.6) {
      power = Math.min(100, (cyc / 2.6) * 100);
      lean = Math.min(60, power * 0.6);
      demo.press = Math.floor(cyc * 6) % 2 === 0;
      demo.gx = CX + (demo.press ? 20 : -20);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawPillar(lean, power >= 100);
      game.draw.sprite(FIGHTER, { '#': C.gold }, CX, CY + 260, 24, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawPillar(lean, ok);
      game.draw.sprite(FIGHTER, { '#': C.gold }, CX, CY + 260, 24, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(power) + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(power);
        if (ok) game.end.success(pct, { power: pct }); else game.end.failure({ power: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      lean = Math.max(0, lean - dt * 8);
      power = Math.max(0, power - dt * 3);
      if (timeLeft <= 0) {
        ok = false; finished = true;
        hitStop = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPillar(lean, power >= 100);
    game.draw.sprite(FIGHTER, { '#': C.gold }, CX, CY + 260, 24, { anchor: 'center' });

    txt(Math.round(power) + '%', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (power / 100), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A2', 0.3], ['A2', 0.3], ['C3', 0.3], ['E3', 0.6]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
