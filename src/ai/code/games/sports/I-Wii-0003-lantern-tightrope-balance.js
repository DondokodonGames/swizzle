// I-Wii-0003-lantern-tightrope-balance.js
// 灯篭頭上バランス — 頭に灯篭を乗せて構え、突風の合図に合わせて左右タップで重心を保つ
// 操作: 突風が来る方向の予告を見て、傾く前に逆側(画面下の左/右ゾーン)をタップして体勢を戻す
// 終わり: 制限時間、綱から落ちずに渡り切れば成功。傾きが限界を超えれば落下で失敗
// @mechanic: balance
// @theme: rope_lantern_walker
// 世界観: 夜祭りの綱渡り芸。頭に灯篭を乗せた軽業師が、吹く風に逆らって左右に重心を戻しながら綱を渡り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡り切った秒数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁、平坦な2段影、彩度高めの原色
  var C = {
    bg: '#2a1840', bg2: '#160a28', rope: '#6a5030', ropeLit: '#8a7048',
    performer: '#e8c08a', gi: '#e04040', lantern: '#ffb63a',
    good: '#3cff8a', bad: '#ff3c3c', gold: '#ffd400', white: '#ffffff', ink: '#0a0608',
  };

  var GAME_TITLE = 'ROPE LANTERN';
  var TIME_LIMIT = 18;
  var CX = W * 0.5, CY = H * 0.5;
  var TILT_LIMIT = 42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, survived, milestoneShown;
  var ready, hitStop, shake;
  var tilt, tiltVel, gustTimer, gust;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WALKER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, CY + 90, W, 14, C.rope, 1);
    game.draw.rect(0, CY + 90, W, 4, C.ropeLit, 0.7);
  }

  function newGust() {
    return { dir: Math.random() < 0.5 ? -1 : 1, t: 0, warn: 0.65, force: game.random(38, 62), applied: false };
  }

  function initGame() {
    survived = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    tilt = 0; tiltVel = 0; gustTimer = 0; gust = newGust();
  }

  function counter(dir) {
    if (finished || ready > 0 || done) return;
    tiltVel += -dir * 26;
    game.audio.play('se_tap', 0.06);
    game.fx.burst(CX + tilt * 3, CY - 120, { color: C.lantern, count: 4, speed: 100 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    if (x < W * 0.5) counter(-1); else counter(1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5); else game.audio.play('se_success', 0.5);
    endWait = 1.3;
  }

  function updatePhysics(dt) {
    gust.t += dt;
    if (gust.t > gust.warn && !gust.applied) {
      gust.applied = true;
      tiltVel += gust.dir * gust.force;
    }
    if (gust.t > gust.warn + 0.9) gust = newGust();

    tilt += tiltVel * dt;
    tiltVel *= 0.92;
    tilt *= 0.985;
    if (Math.abs(tilt) >= TILT_LIMIT) {
      tilt = Math.sign(tilt) * TILT_LIMIT;
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(CX + tilt * 3, CY, { text: 'FALL' });
      shake = 0.32;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { tilt = 0; tiltVel = 0; gust = newGust(); gust.warn = 0.7; }
    gust.t += dt;
    if (gust.t > gust.warn && !gust.applied) {
      gust.applied = true;
      tiltVel += gust.dir * gust.force * 0.6;
      demo.gx = gust.dir > 0 ? W * 0.22 : W * 0.78;
      demo.press = true;
      tiltVel += -gust.dir * 30;
    }
    if (gust.t > gust.warn + 0.6) { demo.press = false; }
    tilt += tiltVel * dt; tiltVel *= 0.9; tilt *= 0.98;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      bg();
      stepDemo(dt);
      var lean = tilt * 0.6;
      game.draw.sprite(WALKER_SPRITE, { '#': C.gi }, CX + lean, CY, 18, { anchor: 'center' });
      game.draw.circle(CX + lean, CY - 130, 22, C.lantern);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      var leanR = tilt * 0.6;
      game.draw.sprite(WALKER_SPRITE, { '#': C.gi }, CX + leanR, CY, 18, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var secs = Math.round(survived);
        if (ok) game.end.success(secs, { survived: secs }); else game.end.failure({ survived: secs });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      updatePhysics(dt);
      if (!milestoneShown && survived >= TIME_LIMIT / 2) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (survived >= TIME_LIMIT) {
        survived = TIME_LIMIT; finished = true; ok = true; hitStop = 0.12;
        game.feedback.good(CX, CY, { text: 'SAFE!', color: C.good });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var lean2 = tilt * 0.6;
    if (gust.t <= gust.warn + 0.55) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (gust.t < gust.warn && blink) {
        var wx = gust.dir > 0 ? W * 0.85 : W * 0.15;
        game.draw.line(wx, CY - 40, wx - gust.dir * 60, CY - 40, C.bad, 8);
      }
    }
    game.draw.sprite(WALKER_SPRITE, { '#': C.gi }, CX + lean2, CY, 18, { anchor: 'center' });
    game.draw.circle(CX + lean2, CY - 130, 22, C.lantern);

    txt(Math.min(TIME_LIMIT, Math.round(survived)) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, survived / TIME_LIMIT), 16, C.gold);
    // 傾きゲージ(中央基準)
    game.draw.rect(W / 2 - 150, H * 0.86, 300, 20, C.ink, 0.4);
    game.draw.rect(W / 2 - 4 + (tilt / TILT_LIMIT) * 146, H * 0.86, 8, 20, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.4], ['A3', 0.4], ['C4', 0.4], ['F4', 0.8]], { tempo: 96, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
