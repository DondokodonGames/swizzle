// J-N644-0007-twin-balloon-guard.js
// ツインバルーンガード — 上段の的の風船を割りながら、下段から迫る針を叩いて自分の風船を守り抜く
// 操作: 画面上半分に浮かぶ的の風船はタップして割る。画面下半分から迫る針もタップして叩き落とす
// 終わり: 自分の風船が割れる前に規定数(8個)の的を割れば成功。自分の風船が3回刺されれば失敗
// @mechanic: coop_2zone
// @theme: carnival_dual_zone_balloon
// 世界観: 見世物小屋の射的名人が、片目で的の風船を狙い撃ちしながら、もう片方の注意で自分の風船へ迫る針を叩き落とし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った的の数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#1b1035', bg2: '#120a24', accent: '#ff4d8d',
    balloonA: '#4dd6ff', balloonB: '#ffd24d', balloonC: '#8dff4d',
    own: '#ff4d8d', ownHurt: '#ff9f9f', needle: '#e8e8f0',
    good: '#8dff4d', bad: '#ff4d4d', gold: '#ffd24d', ink: '#0a0616', white: '#f4f2ff',
  };
  var BALLOON_COLORS = [C.balloonA, C.balloonB, C.balloonC];

  var GAME_TITLE = 'TWIN GUARD';
  var TIME_LIMIT = 20;
  var NEEDED = 8;
  var MAX_HP = 3;
  var SPAWN_INT = 0.9, DART_INT = 1.1;
  var OWN_X = W * 0.5, OWN_Y = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MARKSMAN_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.line(0, H * 0.52, W, H * 0.52, C.accent, 4);
  }

  var balloons, darts, popped, hp, spawnT, dartT, timeLeft, hitFlash;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    balloons = []; darts = []; popped = 0; hp = MAX_HP;
    spawnT = 0.3; dartT = 0.6; timeLeft = TIME_LIMIT; hitFlash = 0;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnBalloon() {
    balloons.push({
      x: game.random(W * 0.16, W * 0.84), y: game.random(H * 0.16, H * 0.44),
      r: 60, c: BALLOON_COLORS[Math.floor(game.random(0, 3))], phase: game.random(0, 6),
    });
  }
  function spawnDart() {
    var fromLeft = Math.random() < 0.5;
    darts.push({ x: fromLeft ? W * 0.1 : W * 0.9, y: H * 0.58, t: 0, dur: game.random(1.1, 1.6), fromLeft: fromLeft });
  }

  function popBalloon(i, x, y) {
    balloons.splice(i, 1);
    popped++;
    game.feedback.good(x, y, { text: '+1', color: C.gold });
    game.fx.burst(x, y, { color: C.gold, count: 14, speed: 300 });
    game.audio.play('se_good', 0.35);
    if (popped === Math.ceil(NEEDED / 2) && !halfCalled) {
      halfCalled = true;
      game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (popped >= NEEDED) {
      ok = true; finished = true; hitStop = 0.2;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function deflectDart(i, x, y) {
    darts.splice(i, 1);
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.fx.burst(x, y, { color: C.needle, count: 10, speed: 260 });
    game.audio.play('se_break', 0.35);
  }

  function ownHit() {
    hp--;
    hitFlash = 0.25; shake = 0.15;
    game.feedback.bad(OWN_X, OWN_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    if (hp <= 0) {
      ok = false; finished = true; hitStop = 0.3;
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function attemptTap(x, y) {
    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i];
      if (game.hit.circle(x, y, 4, b.x, b.y, b.r)) { popBalloon(i, x, y); return; }
    }
    for (var j = 0; j < darts.length; j++) {
      var d = darts[j];
      var dp = dartPos(d);
      if (game.hit.circle(x, y, 4, dp.x, dp.y, 56)) { deflectDart(j, dp.x, dp.y); return; }
    }
    game.audio.play('se_tap', 0.08);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function dartPos(d) {
    var t = Math.min(1, d.t / d.dur);
    var sx = d.fromLeft ? W * 0.1 : W * 0.9;
    return { x: sx + (OWN_X - sx) * t, y: H * 0.58 + (OWN_Y - (H * 0.58)) * t };
  }

  function stepPlay(dt) {
    spawnT -= dt;
    if (spawnT <= 0 && balloons.length < 4) { spawnBalloon(); spawnT = SPAWN_INT + game.random(-0.2, 0.3); }
    dartT -= dt;
    if (dartT <= 0 && darts.length < 3) { spawnDart(); dartT = DART_INT + game.random(-0.2, 0.4); }
    for (var i = darts.length - 1; i >= 0; i--) {
      darts[i].t += dt;
      if (darts[i].t >= darts[i].dur) { darts.splice(i, 1); ownHit(); if (finished) return; }
    }
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0; finished = true; ok = false; hitStop = 0.25; shake = 0.2;
      game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i];
      var bob = Math.sin(game.time.elapsed * 2.2 + b.phase) * 8;
      game.draw.circle(b.x, b.y + bob, b.r, b.c);
      game.draw.line(b.x, b.y + bob + b.r, b.x, b.y + bob + b.r + 26, C.white, 3);
    }
    for (var j = 0; j < darts.length; j++) {
      var dp = dartPos(darts[j]);
      var danger = darts[j].t / darts[j].dur > 0.72;
      game.draw.circle(dp.x, dp.y, danger && Math.floor(game.time.elapsed * 12) % 2 === 0 ? 34 : 26, C.needle);
    }
    var hurt = hitFlash > 0;
    game.draw.circle(OWN_X, OWN_Y, 100, hurt ? C.ownHurt : C.own);
    for (var k = 0; k < MAX_HP; k++) {
      game.draw.circle(OWN_X - 60 + k * 60, OWN_Y + 150, 14, k < hp ? C.accent : C.ink, k < hp ? 1 : 0.3);
    }
    game.draw.sprite(MARKSMAN_SPRITE, { '#': C.white }, W * 0.5, H * 0.06 + 90, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.3, press: false };
  function resetDemo() { initGame(); spawnBalloon(); balloons[0].x = W * 0.5; balloons[0].y = H * 0.3; spawnDart(); darts[0].dur = 1.6; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (balloons[0]) { balloons[0].t = (balloons[0].t || 0); }
    if (darts[0]) darts[0].t += dt;
    if (darts[0] && darts[0].t >= darts[0].dur) darts.splice(0, 1);
    if (cyc < 1.0) {
      demo.gx = W * 0.5; demo.gy = H * 0.3; demo.press = cyc > 0.85;
      if (demo.press && balloons.length) { popped++; balloons.splice(0, 1); game.feedback.good(demo.gx, demo.gy, { text: '+1', color: C.gold }); game.audio.play('se_good', 0.2); }
    } else if (cyc < 2.6) {
      var dp = darts[0] ? dartPos(darts[0]) : { x: OWN_X, y: OWN_Y };
      demo.gx = dp.x; demo.gy = dp.y; demo.press = cyc > 2.3;
      if (demo.press && darts[0]) { darts.splice(0, 1); game.feedback.good(dp.x, dp.y, { text: 'GOOD', color: C.good }); game.audio.play('se_break', 0.2); }
    } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (hitFlash > 0) hitFlash -= dt;

    if (state === S.ATTRACT) {
      if (balloons === undefined) { initGame(); }
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(popped + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - popped) + '個!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(popped, { popped: popped, needed: NEEDED, hp: hp });
        else game.end.failure({ popped: popped, needed: NEEDED, hp: hp });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(popped + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, tbW, 14, C.ink, 0.4);
    game.draw.rect(60, 160, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['C5', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
