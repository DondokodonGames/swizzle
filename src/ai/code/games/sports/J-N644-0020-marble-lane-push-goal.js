// J-N644-0020-marble-lane-push-goal.js
// マーブルレーンプッシュゴール — 弾いた石を、道を塞ぐ相手の石をよけながらゴールの輪まで押し込む
// 操作: 石を指で軽くはじく。相手の石に当てず、ゴールの輪の中で止める
// 終わり: 規定回数(3回)続けてゴールの輪に止められれば成功。輪を外すか相手の石に当てれば失敗
// @mechanic: flick_launch
// @theme: courtyard_marble_push_goal
// 世界観: 石畳の中庭で行われる石はじき勝負。道の途中に構える相手の石を避けながら、自分の石をはじいてゴールの輪へ先に押し込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めたゴール数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度の高いポップカラー、丸い縁取り、賑やかな配色
  var C = {
    bg: '#2a0b4e', bg2: '#5a1a8e', laneA: '#ff5fa2', laneB: '#c2137a', laneEdge: '#ffd400',
    stone: '#00e0ff', stoneDark: '#0a4a52', blocker: '#ff3a3a', blockerDark: '#a01818',
    ring: '#ffd400', ringOut: '#39ff8a',
    good: '#39ff8a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#12002a',
  };

  var GAME_TITLE = 'MARBLE GOAL';
  var MAX_TIME = 13;
  var ROUNDS = 3;
  var START_X = W * 0.5, START_Y = H * 0.80;
  var LANE_TOP = H * 0.20, LANE_BOT = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, target, blocker, stone, launched, resolved, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, halfShown;
  var pressX, pressY, trailX, trailY, trailT, charging;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_STONE = ['.##.', '####', '.##.'];
  var RIVAL_STONE = ['####', '####'];

  function newRound() {
    var ringR = 128 - round * 18;
    target = { x: W * 0.5 + game.random(-140, 140), y: LANE_TOP + game.random(0, 80), r: Math.max(58, ringR) };
    blocker = { x: W * 0.5 + game.random(-160, 160), y: (LANE_TOP + LANE_BOT) * 0.5 + game.random(-60, 60), r: 46 };
  }

  function resetStone() {
    stone = { x: START_X, y: START_Y, vx: 0, vy: 0, moving: false };
    launched = false; resolved = false;
  }

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#1a0838'], [1, C.bg]]);
    var rows = 10;
    for (var r = 0; r < rows; r++) {
      var y = LANE_TOP + (LANE_BOT - LANE_TOP) * (r / rows);
      game.draw.rect(W * 0.14, y, W * 0.72, (LANE_BOT - LANE_TOP) / rows, r % 2 === 0 ? C.laneA : C.laneB, 0.5);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
  }

  function drawTarget() {
    var pulse = Math.sin(game.time.elapsed * 3) * 4;
    game.draw.circle(target.x, target.y + 10, target.r + 26 + pulse, C.ink, 0.25);
    game.draw.circle(target.x, target.y, target.r, C.ringOut, 0.85);
    game.draw.circle(target.x, target.y, target.r * 0.55, C.ring);
  }

  function drawBlocker() {
    var warn = Math.floor(game.time.elapsed * 6) % 2 === 0;
    if (stone.moving) {
      var d = Math.hypot(stone.x - blocker.x, stone.y - blocker.y);
      if (d < 160 && warn) game.draw.circle(blocker.x, blocker.y, blocker.r + 18, C.bad, 0.3);
    }
    var bob = Math.sin(game.time.elapsed * 2.4) * 5;
    game.draw.circle(blocker.x, blocker.y + 8, blocker.r + 4, C.blockerDark, 0.6);
    game.draw.sprite(RIVAL_STONE, { '#': C.blocker }, blocker.x, blocker.y + bob, 18, { anchor: 'center' });
  }

  function drawStone() {
    var idleBob = stone.moving ? 0 : Math.sin(game.time.elapsed * 3) * 4;
    game.draw.circle(stone.x, stone.y + 8, 26, C.stoneDark, 0.4);
    game.draw.sprite(PLAYER_STONE, { '#': C.stone }, stone.x, stone.y + idleBob, 14, { anchor: 'center' });
  }

  function initGame() {
    round = 0; hits = 0; timeLeft = MAX_TIME; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    charging = false;
    newRound(); resetStone();
  }

  function launch(vx, vy) {
    var spd = Math.hypot(vx, vy);
    if (spd < 220) { game.audio.play('se_tap', 0.15); return; }
    launched = true;
    stone.vx = vx; stone.vy = vy; stone.moving = true;
    game.audio.play('se_jump', 0.35);
  }

  function resolveLanding() {
    resolved = true;
    var d = Math.hypot(stone.x - target.x, stone.y - target.y);
    if (d <= target.r) {
      hits++;
      hitStop = 0.12;
      game.feedback.good(stone.x, stone.y, { text: 'NICE', color: C.good });
      game.fx.burst(stone.x, stone.y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (!halfShown && hits >= 1) { halfShown = true; game.fx.popup('HALFWAY!', W / 2, H * 0.15, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      if (hits >= ROUNDS) { ok = true; finished = true; hitStop = 0.18; game.audio.play('se_success', 0.5); finish(); return; }
      round++;
      newRound(); resetStone();
    } else {
      hitStop = 0.35;
      game.feedback.bad(stone.x, stone.y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function resolveBlockerHit() {
    hitStop = 0.35;
    game.feedback.bad(stone.x, stone.y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_break', 0.4);
    ok = false; finished = true; resolved = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished || launched) return;
    if (Math.hypot(x - stone.x, y - stone.y) > 90) return;
    pressX = x; pressY = y;
    trailX = x; trailY = y; trailT = game.time.elapsed;
    charging = true;
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (!charging) return;
    trailX = x; trailY = y; trailT = game.time.elapsed;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    if (!charging) return;
    charging = false;
    var vx = (x - pressX) * 2.4;
    var vy = (y - pressY) * 2.4;
    launch(vx, vy);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.2;
  }

  function updateStonePhysics(dt) {
    if (!stone.moving) return;
    stone.x += stone.vx * dt; stone.y += stone.vy * dt;
    stone.vx *= 0.92; stone.vy *= 0.92;
    if (stone.x < W * 0.16) { stone.x = W * 0.16; stone.vx *= -0.5; }
    if (stone.x > W * 0.84) { stone.x = W * 0.84; stone.vx *= -0.5; }
    if (!resolved && game.hit.circle(stone.x, stone.y, 14, blocker.x, blocker.y, blocker.r)) {
      stone.moving = false;
      resolveBlockerHit();
      return;
    }
    if (Math.hypot(stone.vx, stone.vy) < 12 || stone.y < LANE_TOP - 20) {
      stone.moving = false;
      if (!resolved) resolveLanding();
    }
  }

  var demo = { t: 0, gx: START_X, gy: START_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { round = round || 0; newRound(); resetStone(); }
    if (cyc < 0.9) {
      demo.press = true;
      demo.gx = START_X; demo.gy = START_Y - cyc * 40;
    } else if (cyc < 1.0) {
      demo.press = false;
      var away = { x: blocker.x + (blocker.x < W * 0.5 ? 120 : -120), y: (blocker.y + target.y) / 2 };
      launch((away.x - START_X) * 1.6 + (target.x - away.x) * 1.4, (target.y - START_Y) * 2.0);
    } else if (stone.moving) {
      demo.gx = stone.x; demo.gy = stone.y;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      updateStonePhysics(dt);
      drawTarget();
      drawBlocker();
      drawStone();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTarget();
      drawBlocker();
      drawStone();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + ROUNDS, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (ROUNDS - hits) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, rounds: ROUNDS }); else game.end.failure({ hits: hits, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateStonePhysics(dt);
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false; hitStop = 0.2;
        game.feedback.bad(stone.x, stone.y, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTarget();
    if (!finished) {
      drawBlocker();
      drawStone();
      if (charging) game.draw.line(pressX, pressY, trailX, trailY, C.gold, 6);
    }

    txt(hits + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
