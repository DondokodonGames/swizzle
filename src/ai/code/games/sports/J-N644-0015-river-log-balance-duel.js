// J-N644-0015-river-log-balance-duel.js
// リバーログバランスデュエル — 川に浮かぶ丸太の上で、対岸の相手が仕掛ける揺さぶりに耐えて立ち続ける
// 操作: 丸太が傾いた側をタップして踏ん張り、水平に戻す。対岸の相手が仕掛ける大きな揺さぶりは予告を見て備える
// 終わり: 制限時間耐えきれば成功。傾きが限界を超えて丸太から落ちれば失敗
// @mechanic: balance
// @theme: river_log_balance_duel
// 世界観: 川に浮かぶ一本の丸太。対岸の木こりが仕掛ける大きな揺さぶりの予告を見極め、傾いた側を踏ん張り続けて丸太の上に立ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ。塗りを使わない
  var C = {
    bg: '#020a12', bg2: '#04141e', line: '#39c8ff', line2: '#39ffb0', danger: '#ff3a5a',
    gold: '#ffd400', white: '#e8f6ff', ink: '#020a12',
  };

  var GAME_TITLE = 'LOG BALANCE';
  var DUR = 20;
  var CX = W * 0.5, CY = H * 0.42;
  var LIMIT = 55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var tilt, tiltVel, elapsed, done, endWait, finished, ready, hitStop, shake, milestoneShown;
  var bumpT, bumpDur, bumpSide, bumpTelegraphed, bumpFired;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LUMBERJACK = ['.##.', '####', '.##.', '#..#'];
  var RIVAL_JACK = ['.##.', '####'];

  function vline(x1, y1, x2, y2, w) { game.draw.line(x1, y1, x2, y2, C.line, w || 4); }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var e = game.time.elapsed;
    for (var i = 0; i < 6; i++) {
      var y = H * 0.62 + i * 40 + (e * 60 % 40);
      game.draw.line(0, y, W, y - 10, C.line2, 2);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(e * 1.3));
  }

  function newBump() {
    bumpT = 0;
    bumpDur = Math.max(1.6, 3.4 - elapsed * 0.06);
    bumpSide = Math.random() < 0.5 ? -1 : 1;
    bumpTelegraphed = false; bumpFired = false;
  }

  function initGame() {
    tilt = 0; tiltVel = 0; elapsed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newBump();
  }

  function support(side) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if ((side < 0 && tilt < 0) || (side > 0 && tilt > 0)) {
      tiltVel += -Math.sign(tilt) * 70;
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

  function drawLog(t, crashed) {
    var rad = t * Math.PI / 180;
    var hw = 260;
    var lx = CX - Math.cos(rad) * hw, ly = CY - Math.sin(rad) * hw * 0.5;
    var rx = CX + Math.cos(rad) * hw, ry = CY + Math.sin(rad) * hw * 0.5;
    if (crashed) {
      vline(lx, ly + 320, rx, ry + 320, 22);
    } else {
      vline(lx, ly, rx, ry, 22);
      vline(CX, CY, CX, CY + 140, 10);
      if (Math.abs(t) > LIMIT * 0.65) {
        var blink = Math.floor(game.time.elapsed * 11) % 2 === 0;
        if (blink) game.draw.circle(t > 0 ? rx : lx, t > 0 ? ry : ly, 40, C.danger, 0.4);
      }
    }
    game.draw.circle(CX, H * 0.7, 380, C.line, 0.04);
  }

  function drawRival() {
    var e = game.time.elapsed;
    var lunge = bumpTelegraphed && !bumpFired ? Math.min(30, (bumpT - bumpDur * 0.55) / (bumpDur * 0.25) * 30) : 0;
    game.draw.sprite(RIVAL_JACK, { '#': bumpTelegraphed && !bumpFired ? C.danger : C.line }, W * 0.86 - lunge, H * 0.62 + Math.sin(e * 2) * 4, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { tilt = 0; tiltVel = 34; newBump(); }
    tiltVel += Math.sin(cyc * 2.4) * 44 * dt;
    tilt += tiltVel * dt;
    if (Math.abs(tilt) > 18 && cyc % 1.1 < 0.3) {
      var side = tilt > 0 ? 1 : -1;
      tiltVel += -side * 70 * dt * 10;
      demo.gx = CX + side * 260; demo.gy = CY + 60;
      demo.press = true;
    } else demo.press = false;
    tilt = Math.max(-42, Math.min(42, tilt));
  }

  function stepBump(dt) {
    bumpT += dt;
    var p = bumpT / bumpDur;
    if (p > 0.55 && !bumpTelegraphed) bumpTelegraphed = true;
    if (p >= 0.85 && !bumpFired) {
      bumpFired = true;
      tiltVel += bumpSide * 130;
      game.fx.flash(C.danger, 0.12);
      game.audio.play('se_bad', 0.25);
    }
    if (p >= 1) newBump();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLog(tilt, false);
      drawRival();
      game.draw.sprite(LUMBERJACK, { '#': C.line }, CX, CY + 300, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLog(tilt, !ok);
      drawRival();
      game.draw.sprite(LUMBERJACK, { '#': C.line }, CX, CY + 300, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.line2 : C.danger);
      txt(Math.round(elapsed) + 's', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
      tiltVel += Math.sin(elapsed * 1.4) * 60 * dt;
      tilt += tiltVel * dt;
      tiltVel *= 0.98;
      stepBump(dt);
      if (!milestoneShown && elapsed >= DUR * 0.5) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (Math.abs(tilt) >= LIMIT) {
        ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (elapsed >= DUR) {
        ok = true; finished = true; hitStop = 0.12;
        game.feedback.good(CX, CY, { text: 'CLEAR', color: C.line2 });
        game.fx.burst(CX, CY, { color: C.gold, count: 18, speed: 340 });
        game.audio.play('se_success', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLog(tilt, finished && !ok);
    drawRival();
    game.draw.sprite(LUMBERJACK, { '#': C.line }, CX, CY + 300, 22, { anchor: 'center' });

    txt(Math.round(elapsed) + ' / ' + DUR, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.line, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, elapsed / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['F3', 0.4], ['A3', 0.4], ['D3', 0.8]], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
