// I-GBA-0026-teacup-tray-balance.js
// ティーカップトレイバランス — 今にも傾いて落ちそうなお盆を、傾いた側をタップして支え倒れないようにする
// 操作: トレイが傾いた側を見て、その側をタップして下から支え水平に戻す
// 終わり: 制限時間耐えきれば成功。傾きが限界を超えて崩れれば失敗
// @mechanic: balance
// @theme: teahouse_tray_balancing
// 世界観: 茶房の給仕見習いが、揺れる卓の上で今にも滑り落ちそうな茶器の盆を、傾いた側を支え続けて守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白背景+黒線画1色、アクセントのみ1色差す
  var C = {
    bg: '#f4f0e6', bg2: '#e8e0cc', ink: '#181410', tray: '#181410', trayFill: '#f4f0e6',
    cup: '#181410', accent: '#c23b2a',
    good: '#2a8a4a', bad: '#c23b2a', gold: '#c23b2a', white: '#181410',
  };

  var GAME_TITLE = 'TRAY BALANCE';
  var DUR = 18;
  var CX = W * 0.5, CY = H * 0.4;
  var LIMIT = 55; // 度

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var tilt, tiltVel, wobble, elapsed, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, crashSide;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WAITER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.62, W, 6, C.ink, 0.5);
  }

  function initGame() {
    tilt = 0; tiltVel = 0; wobble = 0.6; elapsed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; crashSide = 0;
  }

  function support(side) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if ((side < 0 && tilt < 0) || (side > 0 && tilt > 0)) {
      tiltVel += -Math.sign(tilt) * 60;
      game.feedback.good(CX + side * 260, CY + 60, { text: '', color: C.gold, size: 14, count: 3 });
      game.audio.play('se_good', 0.2);
    } else {
      game.feedback.bad(CX + side * 260, CY + 60, {});
      game.audio.play('se_tap', 0.12);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) support(x < CX ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTray(t, crashed) {
    var rad = t * Math.PI / 180;
    var hw = 260;
    var lx = CX - Math.cos(rad) * hw, ly = CY - Math.sin(rad) * hw * 0.5;
    var rx = CX + Math.cos(rad) * hw, ry = CY + Math.sin(rad) * hw * 0.5;
    if (crashed) {
      game.draw.line(lx, ly + 260, rx, ry + 260, C.tray, 18);
      game.draw.circle((lx + rx) / 2, (ly + ry) / 2 + 260, 24, C.cup);
    } else {
      game.draw.line(lx, ly, rx, ry, C.tray, 18);
      game.draw.line(CX, CY, CX, CY + 140, C.ink, 10);
      game.draw.circle(lx, ly - 22, 20, C.cup);
      game.draw.circle(CX, CY - 22 - Math.sin(rad) * 0, 20, C.cup);
      game.draw.circle(rx, ry - 22, 20, C.cup);
      if (Math.abs(t) > LIMIT * 0.65) {
        var blink = Math.floor(game.time.elapsed * 11) % 2 === 0;
        if (blink) game.draw.circle(t > 0 ? rx : lx, t > 0 ? ry : ly, 34, C.accent, 0.4);
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { tilt = 0; tiltVel = 30; }
    tiltVel += Math.sin(cyc * 2.2) * 40 * dt;
    tilt += tiltVel * dt;
    if (Math.abs(tilt) > 18 && cyc % 1.1 < 0.3) {
      var side = tilt > 0 ? 1 : -1;
      tiltVel += -side * 60 * dt * 10;
      demo.gx = CX + side * 260; demo.gy = CY + 60;
      demo.press = true;
    } else demo.press = false;
    tilt = Math.max(-40, Math.min(40, tilt));
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawTray(tilt, false);
      game.draw.sprite(WAITER, { '#': C.ink }, CX, CY + 300, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTray(tilt, !ok);
      game.draw.sprite(WAITER, { '#': C.ink }, CX, CY + 300, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(elapsed) + 's', W / 2, H * 0.13, 32, C.accent);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var sec = Math.round(elapsed);
        if (ok) game.end.success(sec, { seconds: sec }); else game.end.failure({ seconds: sec });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsed += dt;
      wobble = Math.min(3.2, wobble + dt * 0.12);
      tiltVel += Math.sin(elapsed * wobble) * 90 * dt;
      tilt += tiltVel * dt;
      tiltVel *= 0.98;
      if (!milestoneShown && elapsed >= DUR * 0.5) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.accent, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (Math.abs(tilt) >= LIMIT) {
        ok = false; finished = true;
        crashSide = tilt > 0 ? 1 : -1;
        hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (elapsed >= DUR) {
        ok = true; finished = true;
        hitStop = 0.12;
        game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, CY, { color: C.accent, count: 18, speed: 340 });
        game.audio.play('se_success', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTray(tilt, finished && !ok);
    game.draw.sprite(WAITER, { '#': C.ink }, CX, CY + 300, 22, { anchor: 'center' });

    txt(Math.round(elapsed) + 's / ' + DUR + 's', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, elapsed / DUR), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['D4', 0.4], ['E4', 0.4], ['C4', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
