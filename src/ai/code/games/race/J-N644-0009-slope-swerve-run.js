// J-N644-0009-slope-swerve-run.js
// スロープスワーブラン — 一本道の斜面を滑り降りながら迫る岩を左右へ避け、転ばず滑り切る
// 操作: 画面を押したまま左右にドラッグして滑走位置をずらし、迫る岩をよける
// 終わり: 制限時間中、耐久3回分の被弾で済めば成功。被弾が4回目に達すると失敗
// @mechanic: dodge
// @theme: downhill_slope_swerve
// 世界観: 雪山の滑走者が、一本道の斜面を滑り降りながら次々と迫る岩を左右へ体をずらしてかわし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 滑り切った時間
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮。地平線へ収束する床
  var C = {
    sky: '#bfe6ff', sky2: '#eaf7ff', road: '#f2f2f2', roadAlt: '#dfeaf2',
    rock: '#7a6a5a', rockDark: '#4d4033', skier: '#ff5c4d', skierDark: '#c93b2e',
    good: '#4de08a', bad: '#ff5c4d', gold: '#ffd24d', ink: '#1a2230', white: '#ffffff',
  };

  var GAME_TITLE = 'SLOPE SWERVE';
  var TIME_LIMIT = 18;
  var MAX_HP = 3;
  var HORIZON_Y = H * 0.30, FOOT_Y = H * 0.82;
  var CENTERX = W * 0.5;
  var HIT_TOL = 0.32;
  var APPROACH = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SKIER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var ROCK_SPRITE = ['.##.', '####'];

  function widthAt(t) { return 90 + t * (W * 0.82 - 90); }
  function yAt(t) { return HORIZON_Y + t * (FOOT_Y - HORIZON_Y); }
  function xAt(norm, t) { return CENTERX + norm * widthAt(t) * 0.5; }

  function bg() {
    game.draw.gradient(0, HORIZON_Y, [[0, C.sky], [1, C.sky2]]);
    var bands = 22;
    for (var i = 0; i < bands; i++) {
      var t0 = i / bands, t1 = (i + 1) / bands;
      var y0 = yAt(t0), y1 = yAt(t1);
      var w0 = widthAt(t0);
      var scroll = (game.time.elapsed * 1.4 + i) % 2;
      var col = scroll < 1 ? C.road : C.roadAlt;
      game.draw.rect(CENTERX - w0 / 2, y0, w0, Math.max(2, y1 - y0 + 1), col);
    }
  }

  var rocks, playerNorm, targetNorm, dragging, hp, timeLeft, hitFlash;
  var done, endWait, finished, ready, hitStop, shake, halfCalled, spawnT;

  function initGame() {
    rocks = []; playerNorm = 0; targetNorm = 0; dragging = false;
    hp = MAX_HP; timeLeft = TIME_LIMIT; hitFlash = 0; spawnT = 0.6;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnRock() {
    rocks.push({ norm: game.random(-0.85, 0.85), t: 0, warned: false });
  }

  function ownHit() {
    hp--;
    hitFlash = 0.25; shake = 0.2;
    game.feedback.bad(xAt(playerNorm, 1), FOOT_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    if (hp <= 0) {
      ok = false; finished = true; hitStop = 0.3;
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function setTarget(x) {
    var norm = (x - CENTERX) / (widthAt(1) * 0.5);
    targetNorm = Math.max(-1, Math.min(1, norm));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) { dragging = true; game.audio.play('se_tap', 0.08); setTarget(x); }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && dragging) {
      if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
      setTarget(x);
    }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) { dragging = false; game.audio.play('se_tap', 0.04); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    playerNorm += (targetNorm - playerNorm) * Math.min(1, dt * 8);
    spawnT -= dt;
    if (spawnT <= 0 && rocks.length < 3) { spawnRock(); spawnT = 1.0 + game.random(-0.15, 0.35); }
    for (var i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      r.t += dt / APPROACH;
      if (!r.warned && r.t > 0.65) { r.warned = true; game.audio.play('se_tap', 0.06); }
      if (r.t >= 1) {
        if (Math.abs(r.norm - playerNorm) < HIT_TOL) { rocks.splice(i, 1); ownHit(); if (finished) return; }
        else { rocks.splice(i, 1); game.fx.popup('NICE', xAt(r.norm, 1), FOOT_Y - 60, { color: C.gold, size: 24 }); }
      }
    }
    timeLeft -= dt;
    if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', CENTERX, H * 0.2, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (timeLeft <= 0) {
      timeLeft = 0; ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(CENTERX, FOOT_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(CENTERX, FOOT_Y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      var x = xAt(r.norm, r.t), y = yAt(r.t);
      var sz = 14 + r.t * 60;
      var danger = r.t > 0.8 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.sprite(ROCK_SPRITE, { '#': danger ? C.bad : C.rock }, x, y, sz / 4, { anchor: 'center' });
    }
    var px = xAt(playerNorm, 1);
    game.draw.circle(px, FOOT_Y + 60, 50, C.skierDark, 0.4);
    game.draw.sprite(SKIER_SPRITE, { '#': hitFlash > 0 ? C.bad : C.skier }, px, FOOT_Y, 30, { anchor: 'center' });
    for (var k = 0; k < MAX_HP; k++) {
      game.draw.circle(W * 0.5 - 60 + k * 60, H * 0.16, 14, k < hp ? C.gold : C.ink, k < hp ? 1 : 0.3);
    }
  }

  var demo = { t: 0, gx: CENTERX, gy: FOOT_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { resetDemo(); spawnRock(); rocks[0].norm = 0.5; }
    if (rocks.length === 0) spawnRock();
    var r = rocks[0];
    r.t += dt / APPROACH;
    if (r.t >= 1) { rocks.splice(0, 1); }
    targetNorm = r ? r.norm * -0.7 : 0;
    playerNorm += (targetNorm - playerNorm) * Math.min(1, dt * 8);
    demo.gx = xAt(playerNorm, 1); demo.gy = FOOT_Y; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (hitFlash > 0) hitFlash -= dt;

    if (state === S.ATTRACT) {
      if (rocks === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hp + ' / ' + MAX_HP, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(TIME_LIMIT), { hp: hp, cleared: TIME_LIMIT });
        else game.end.failure({ hp: hp, survived: TIME_LIMIT - timeLeft });
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

    txt(Math.ceil(timeLeft) + 's', W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.15);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['B3', 0.2], ['D4', 0.2], ['G4', 0.4]], { tempo: 140, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
