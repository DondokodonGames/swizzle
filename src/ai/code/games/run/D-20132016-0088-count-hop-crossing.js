// D-20132016-0088-count-hop-crossing.js
// カウント・ホップ・クロッシング — 川面の飛び石を、ちょうど規定数だけ跳んで渡り切る
// 操作: 画面をタップするたびに1歩前へ。目印の石にちょうど止まるよう跳ぶ回数を数える
// 終わり: 目印の石にちょうど止まれば成功。数え間違えて踏み越す/届かなければ失敗
// @mechanic: count_exact
// @theme: exact_step_river_crossing
// 世界観: 見知らぬ渡り鳥を追う旅人が、川面に並ぶ飛び石をちょうどN歩で渡り切り、対岸の目印にぴったり止まる
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳んだ歩数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い色面、丸みのある縁取り、柔らかい影
  var C = {
    bg: '#dff0ec', bg2: '#c7e6de', river: '#8fd0e6', riverDark: '#6bb8d2',
    stone: '#e8ddc8', stoneEdge: '#c9b98e', target: '#ffd166', good: '#3fbf7f',
    bad: '#ff6b6b', gold: '#e8a13a', white: '#ffffff', ink: '#20302c',
  };

  var GAME_TITLE = 'COUNT HOP';
  var TIME_LIMIT = 16;
  var N_STONES = 9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TRAVELER = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.3, W, H * 0.5, C.river);
    for (var i = 0; i < 10; i++) {
      var yy = H * 0.32 + i * (H * 0.46 / 10) + Math.sin(game.time.elapsed * 1.2 + i) * 4;
      game.draw.rect(0, yy, W, 3, C.riverDark, 0.4);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function stoneX(i) {
    // 蛇行させて視認しやすく
    return W * 0.5 + Math.sin(i * 1.15) * W * 0.22;
  }
  function stoneY(i) {
    return H * 0.75 - (i / N_STONES) * H * 0.42;
  }

  var target, hop, roundOver, overshoot, timeLeft, hopBounce;
  var done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    target = 5 + Math.floor(game.random(0, 3)); // 5-7歩
    hop = 0; roundOver = false; overshoot = false; timeLeft = TIME_LIMIT; hopBounce = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function doHop(x, y) {
    if (finished || ready > 0 || done) return;
    hop++;
    hopBounce = 1;
    game.audio.play('se_jump', 0.3);
    game.fx.burst(stoneX(hop), stoneY(hop), { color: C.gold, count: 8, speed: 200 });
    if (hop === target - 1 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('NICE', W * 0.5, H * 0.25, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.35);
    }
    if (hop === target) {
      finished = true; ok = true; hitStop = 0.12;
      game.feedback.good(stoneX(hop), stoneY(hop), { text: 'PERFECT' });
      game.fx.burst(stoneX(hop), stoneY(hop), { color: C.gold, count: 20, speed: 380 });
      finish();
    } else if (hop > target) {
      finished = true; ok = false; overshoot = true; hitStop = 0.3;
      game.feedback.bad(stoneX(hop), stoneY(hop), { text: 'MISS' });
      shake = 0.3;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    doHop(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawStones() {
    for (var i = 0; i <= N_STONES; i++) {
      var x = stoneX(i), y = stoneY(i);
      var isTarget = i === target;
      var warn = isTarget && hop === target - 1 && Math.floor(game.time.elapsed * 8) % 2 === 0;
      var col = isTarget ? C.target : C.stone;
      game.draw.circle(x, y + 6, 44, C.stoneEdge, 0.5);
      game.draw.circle(x, y, 40, warn ? C.gold : col);
      if (isTarget) game.draw.circle(x, y, 50, C.gold, 0.3);
    }
  }

  function drawTraveler() {
    var cur = Math.min(hop, target + 2);
    var bx = stoneX(cur), by = stoneY(cur) - 30 - Math.abs(Math.sin(hopBounce * Math.PI)) * 40;
    game.draw.sprite(TRAVELER, { '#': C.ink }, bx, by, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 0.55;
    var cyc = demo.t % (per * 6 + 0.6);
    if (cyc < dt || demo.t <= dt) { hop = 0; target = 5; hopBounce = 0; }
    var idx = Math.floor(cyc / per);
    var within = (cyc % per) / per;
    if (idx <= 5) {
      demo.gx = stoneX(Math.min(idx + 1, 5)); demo.gy = stoneY(Math.min(idx + 1, 5));
      demo.press = within > 0.4 && within < 0.7;
      var targetHop = idx;
      if (demo.press && hop < targetHop + 1) {
        hop = targetHop + 1; hopBounce = 1;
        game.audio.play('se_jump', 0.15);
        if (hop === target) game.fx.burst(stoneX(hop), stoneY(hop), { color: C.gold, count: 14, speed: 300 });
      }
    } else {
      demo.press = false;
    }
    if (hopBounce > 0) hopBounce = Math.max(0, hopBounce - dt * 2.2);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawStones();
      drawTraveler();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStones();
      drawTraveler();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hop + ' / ' + target, W / 2, H * 0.13, 28, C.gold);
      if (!ok && Math.abs(hop - target) <= 1) txt('あと1歩!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hop, { hop: hop, target: target }); else game.end.failure({ hop: hop, target: target });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        shake = 0.25;
        finish();
      }
    }
    if (hopBounce > 0) hopBounce = Math.max(0, hopBounce - dt * 2.2);
    if (shake > 0) shake -= dt;

    bg();
    drawStones();
    drawTraveler();

    txt(hop + ' / ' + target, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.stoneEdge, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
