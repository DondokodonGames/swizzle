// I-3DS-0011-cheer-surge-mash.js
// チアサージ — 応援団長が声援ゲージを連打で押し上げてスタジアムを沸かせる
// 操作: 制限時間内に画面を連打してゲージを右端まで押し上げる。連続で叩くほど倍率が上がる
// 終わり: 時間内にゲージが満タンになれば成功。満タンにできなければ失敗
// @mechanic: mash
// @theme: stadium_cheer_meter
// 世界観: 満員のスタジアム、応援団長が声援ゲージを連打で押し上げ観客席全体を沸かせようとする
// 残るもの: 正誤(CLEAR/TIME UP) + 到達したゲージ%
// スタイル: 2010s FLAT MOBILE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: フラットな単色面+細い影のみ、グラデーション控えめ
  var C = {
    bg: '#1c2b4a', bg2: '#243863', crowd: '#2f4a7a', bar: '#16223a',
    fill: '#ff5c7a', fillHot: '#ffd23f', good: '#4ee08a', bad: '#ff5c7a',
    gold: '#ffd23f', white: '#f4f7ff', ink: '#0e1626',
  };

  var GAME_TITLE = 'CHEER SURGE';
  var TIME_LIMIT = 10;
  var CX = W * 0.5, CY = H * 0.40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var gauge, combo, comboT, mult, timeLeft, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake, bounce;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LEADER_A = ['.#.#.', '#####', '.###.', '#.#.#'];
  var LEADER_B = ['#.#.#', '#####', '.###.', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) {
      game.draw.circle(W * (i / 8) + 40, H * 0.20, 22, C.crowd);
    }
  }

  function drawLeader() {
    var frame = Math.floor(game.time.elapsed * 10) % 2 === 0 ? LEADER_A : LEADER_B;
    game.draw.sprite(frame, { '#': C.gold }, CX, CY - bounce, 26, { anchor: 'center' });
  }

  function initGame() {
    gauge = 0; combo = 0; comboT = 0; mult = 1; timeLeft = TIME_LIMIT; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; bounce = 0;
  }

  function tap(x, y) {
    if (done || ready > 0 || finished) return;
    combo++;
    comboT = 0.5;
    mult = 1 + Math.min(3, Math.floor(combo / 5)) * 0.5;
    gauge = Math.min(1, gauge + 0.045 * mult);
    bounce = 20;
    game.feedback.good(x, y, { text: mult > 1 ? 'x' + mult : null, color: C.gold, size: 22 });
    game.audio.play('se_tap', 0.15);
    if (!milestoneShown && gauge >= 0.5) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', CX, CY - 180, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (gauge >= 1) {
      ok = true; finished = true; hitStop = 0.18;
      game.fx.burst(CX, CY, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.2;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { gauge = 0; combo = 0; mult = 1; }
    var tapEvery = 0.16;
    var idxNow = Math.floor(cyc / tapEvery);
    var idxPrev = Math.floor((cyc - dt) / tapEvery);
    if (cyc < 2.4 && idxNow !== idxPrev) {
      demo.press = true;
      combo++;
      mult = 1 + Math.min(3, Math.floor(combo / 5)) * 0.5;
      gauge = Math.min(1, gauge + 0.045 * mult);
      bounce = 20;
      if (gauge >= 1) { gauge = 1; }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gauge === undefined) initGame();
      bg();
      stepDemo(dt);
      if (bounce > 0) bounce -= dt * 80;
      drawLeader();
      game.draw.rect(90, H * 0.62, W - 180, 46, C.bar);
      game.draw.rect(90, H * 0.62, (W - 180) * gauge, 46, gauge > 0.7 ? C.fillHot : C.fill);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLeader();
      var pct = Math.round(gauge * 100);
      txt(ok ? 'CLEAR' : 'TIME UP', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round(gauge * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      comboT -= dt;
      if (comboT <= 0) { combo = 0; mult = 1; }
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (bounce > 0) bounce -= dt * 80;

    bg();
    drawLeader();
    game.draw.rect(90, H * 0.62, W - 180, 46, C.bar);
    game.draw.rect(90, H * 0.62, (W - 180) * gauge, 46, gauge > 0.7 ? C.fillHot : C.fill);

    txt(Math.round(gauge * 100) + '%', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
