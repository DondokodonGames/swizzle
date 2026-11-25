// J-N641vs3-0006-raft-oar-duel.js
// 川面オール押し合い — 揺れる筏の上で相手を丸太のオールで連打して押し出す
// 操作: 画面をタップ連打してオールを漕ぎ、押し合いゲージを自陣側に押し切る。ゲージが赤く光ったら特に強く連打する
// 終わり: 制限時間内にゲージを最後まで押し切れば成功。逆に押し切られる/時間切れなら失敗
// @mechanic: push_out
// @theme: river_raft_oar_push
// 世界観: 川下りの筏乗りが、狭い筏の上で向かい合う相手を丸太のオールで押し合い、先に相手を水へ落とした者が勝ち残る
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し切ったゲージの割合
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 対戦筐体風、巨大キャラ、床影で間合いを見せる
  var C = {
    bg: '#0e3a52', bg2: '#082638', water: '#146a8c', waterDark: '#0d4a63',
    raft: '#8a5a2c', raftDark: '#5e3a18', playerC: '#e8b23a', rivalC: '#3ac0e8',
    good: '#39e07a', badc: '#ff4d5e', gold: '#ffd400', ink: '#eaf6ff',
  };

  var GAME_TITLE = 'OAR PUSH';
  var TIME_LIMIT = 20;
  var GAUGE_MAX = 100;
  var WIN_GAUGE = 100;
  var LOSE_GAUGE = 0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#031824', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_SPR = ['.##.', '####', '.##.', '##.#'];
  var RIVAL_SPR = ['.##.', '####', '.##.', '#.##'];
  var RAFT_SPR = ['##########'];

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) {
      var y = H * 0.30 + i * 60 + 20 * Math.sin(t * 1.4 + i);
      game.draw.rect(0, y, W, 8, i % 2 === 0 ? C.water : C.waterDark, 0.5);
    }
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.5);
    game.draw.rect(0, 0, W, H, '#3ac0e8', pulse * 0.4);
  }

  function drawScene(push, playerX, rivalX, bob) {
    var raftY = H * 0.62;
    game.draw.sprite(RAFT_SPR, { '#': C.raft }, W * 0.5, raftY + 40, 46, { anchor: 'center' });
    game.draw.rect(W * 0.1, raftY + 60, W * 0.8, 14, C.raftDark, 0.8);
    game.draw.sprite(PLAYER_SPR, { '#': C.playerC }, playerX, raftY - 60 + bob, 36, { anchor: 'center' });
    game.draw.sprite(RIVAL_SPR, { '#': C.rivalC }, rivalX, raftY - 60 - bob, 36, { anchor: 'center' });
    game.draw.line(playerX, raftY - 60 + bob, rivalX, raftY - 60 - bob, '#c8a060', 10);
  }

  var gauge, playerX, rivalX, bob, timeLeft, milestoneCalled, dangerCalled, pushCount;
  var done, endWait, finished, ready, hitStop, shake, hot;

  function initGame() {
    gauge = 50; playerX = W * 0.34; rivalX = W * 0.66; bob = 0; timeLeft = TIME_LIMIT;
    milestoneCalled = false; dangerCalled = false; pushCount = 0; hot = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pushTap(power) {
    if (finished || ready > 0) return;
    gauge += power;
    hot = 0.12;
    bob = bob > 0 ? -18 : 18;
    pushCount++;
    if (pushCount % 4 === 0) game.feedback.good(playerX, H * 0.55, { text: 'GOOD', color: C.good, size: 26 });
    if (gauge >= 65 && gauge < 75 && !milestoneCalled) {
      milestoneCalled = true;
      game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (gauge >= WIN_GAUGE) { gauge = WIN_GAUGE; winRun(); }
    else if (gauge <= LOSE_GAUGE) { gauge = LOSE_GAUGE; loseRun(); }
  }

  function rivalPush(dt, intensity) {
    gauge -= intensity * dt;
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.2;
    game.fx.burst(rivalX, H * 0.55, { color: C.gold, count: 26, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.3; hitStop = 0.35;
    game.feedback.bad(playerX, H * 0.55, { text: 'MISS' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      game.audio.play('se_tap', 0.15);
      pushTap(6 + Math.random() * 2);
      game.fx.burst(playerX, H * 0.55, { color: C.playerC, count: 6, speed: 180 });
    }
  });

  var demo = { t: 0, gx: W * 0.34, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { gauge = 50; milestoneCalled = false; }
    var tapNow = Math.floor(cyc * 5) % 2 === 0 && cyc < 2.6;
    demo.press = tapNow;
    if (tapNow && (cyc * 5) % 1 < 0.3) { pushTap(5); }
    rivalPush(dt, 4);
    demo.gx = playerX; demo.gy = H * 0.55;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gauge === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      drawScene(gauge, playerX, rivalX, bob);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      drawScene(gauge, playerX, rivalX, bob);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.badc);
      txt(Math.round(gauge) + '%', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, Math.round(WIN_GAUGE - gauge)) + '%!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(gauge), { gauge: Math.round(gauge) });
        else game.end.failure({ gauge: Math.round(gauge) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      var intensity = 4 + (TIME_LIMIT - timeLeft) * 0.4;
      rivalPush(dt, intensity);
      if (gauge < 25 && !dangerCalled) {
        dangerCalled = true;
        game.feedback.bad(rivalX, H * 0.55, { text: 'MISS' });
        game.audio.play('se_bad', 0.25);
      }
      if (gauge >= 30) dangerCalled = false;
      if (hot > 0) hot -= dt; else bob *= 0.5;
      if (gauge <= LOSE_GAUGE) { gauge = LOSE_GAUGE; loseRun(); }
      else if (timeLeft <= 0) { timeLeft = 0; if (gauge > 55) winRun(); else loseRun(); }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    drawScene(gauge, playerX, rivalX, bob);

    var tbW = W - 120;
    game.draw.rect(60, 150, tbW, 24, '#3ac0e8', 0.4);
    game.draw.rect(60, 150, tbW * (gauge / GAUGE_MAX), 24, gauge > 65 ? C.gold : (gauge < 35 ? C.badc : C.playerC));
    txt(Math.round(gauge) + '%', W / 2, H * 0.06, 28, C.ink);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.text(Math.ceil(timeLeft) + '', W - 90, H * 0.06, { size: 26, color: lowTime ? C.badc : C.ink, bold: true, align: 'center' });
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
