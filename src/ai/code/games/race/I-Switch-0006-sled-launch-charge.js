// I-Switch-0006-sled-launch-charge.js
// スレッジ・ランチ・チャージ — 雪山のロケットそりを押し続けて力を溜め、着地台の枠内で離して発射する
// 操作: 画面を押し続けるとパワーゲージが溜まる。狙いの枠内で指を離して発射する
// 終わり: 対岸の着地台の枠内に着地すれば成功。手前/奥に外せば失敗
// @mechanic: hold_charge
// @theme: snow_rocket_sled
// 世界観: 雪原を滑るロケットそり乗りのペンギン。谷を挟んだ対岸の着地台めがけ、溜めた勢いで一気に飛び出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 着地精度%
// スタイル: 80s ISO
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 寒色の雪原+暖色アクセント、太い輪郭のブロック影
  var C = {
    bg: '#0d1b3a', bg2: '#1c3466', snow: '#e8f3ff', snowShade: '#b9d3f0',
    gap: '#081226', pad: '#2a4a86', padEdge: '#ffb23c',
    good: '#5cffb0', bad: '#ff5c6e', gold: '#ffcf4d', white: '#ffffff', ink: '#050a18',
  };

  var GAME_TITLE = 'SLED LAUNCH';
  var CX = W * 0.5;
  var LAUNCH_Y = H * 0.72;
  var TRACK_Y = H * 0.36;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PENGUIN = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.line(0, H * (0.2 + i * 0.05), W, H * (0.18 + i * 0.05), '#ffffff08', 3);
  }

  var MIN_POW = 0.42, MAX_POW = 0.62; // 目標ゾーン(0-1)
  var power, charging, launched, sledX, sledY, landedT, accuracy;
  var done, endWait, finished, hitStop, shake, ready;

  function initGame() {
    power = 0; charging = false; launched = false;
    sledX = W * 0.14; sledY = LAUNCH_Y; landedT = 0; accuracy = 0;
    done = false; endWait = 0; finished = false;
    hitStop = 0; shake = 0; ready = 0.8;
    _milestoneFlag = false;
  }

  function resolveLaunch() {
    launched = true;
    game.audio.play('se_jump', 0.5);
    game.fx.burst(sledX, sledY, { color: C.gold, count: 10, speed: 260 });
  }

  function resolveOutcome() {
    var hit = power >= MIN_POW && power <= MAX_POW;
    accuracy = Math.max(0, 100 - Math.abs(power - (MIN_POW + MAX_POW) / 2) * 500);
    finished = true; ok = hit; hitStop = hit ? 0.15 : 0.35;
    if (hit) {
      game.feedback.good(sledX, sledY, { text: 'CLEAR', color: C.good });
      game.fx.burst(sledX, sledY, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(sledX, sledY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
    }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onPress(function() {
    if (state !== S.PLAYING || ready > 0 || launched || finished) return;
    charging = true;
    game.audio.play('se_tap', 0.05);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || ready > 0 || launched || finished || !charging) return;
    charging = false;
    resolveLaunch();
    game.audio.play('se_powerup', 0.4);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepPhysics(dt) {
    if (!launched) {
      if (charging) { power = Math.min(1, power + dt * 0.9); }
      sledX = W * (0.14 + power * 0.1);
      if (power >= 1 && charging) { charging = false; resolveLaunch(); }
      return;
    }
    landedT += dt;
    var p = Math.min(1, landedT / 0.7);
    var dist = power * (W * 0.72);
    sledX = W * 0.14 + dist * p;
    sledY = LAUNCH_Y - Math.sin(p * Math.PI) * 220;
    if (p >= 1) resolveOutcome();
  }

  function drawScene() {
    bg();
    game.draw.rect(0, LAUNCH_Y + 40, W * 0.28, H, C.snow);
    game.draw.rect(0, LAUNCH_Y + 40, W * 0.28, 14, C.snowShade);
    var padX = W * 0.14 + ((MIN_POW + MAX_POW) / 2) * (W * 0.72);
    var padW = (MAX_POW - MIN_POW) * (W * 0.72);
    game.draw.rect(padX - padW / 2, LAUNCH_Y + 40, padW, H, C.pad);
    game.draw.rect(padX - padW / 2, LAUNCH_Y + 40, padW, 14, C.padEdge);
    game.draw.rect(W * 0.14, LAUNCH_Y, W * 0.16, 30, C.snowShade);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { power = 0; charging = true; launched = false; landedT = 0; sledX = W * 0.14; sledY = LAUNCH_Y; }
    var targetPow = (MIN_POW + MAX_POW) / 2;
    if (!launched) {
      if (power < targetPow) { power = Math.min(targetPow, power + dt * 0.9); demo.press = true; }
      else if (charging) { charging = false; launched = true; landedT = 0; demo.press = false; game.audio.play('se_jump', 0.15); }
      sledX = W * (0.14 + power * 0.1);
    } else {
      landedT += dt;
      var p = Math.min(1, landedT / 0.7);
      sledX = W * 0.14 + (power * W * 0.72) * p;
      sledY = LAUNCH_Y - Math.sin(p * Math.PI) * 220;
      if (p >= 1) { accuracy = 100; }
    }
    demo.gx = W * 0.14; demo.gy = LAUNCH_Y + 60;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (power === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.rect(W * 0.14, LAUNCH_Y - 46, 8 + power * 200, 16, C.gold);
      game.draw.sprite(PENGUIN, { '#': C.gold }, sledX, sledY, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.sprite(PENGUIN, { '#': ok ? C.gold : C.bad }, sledX, sledY, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(accuracy) + '%', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var acc = Math.round(accuracy);
        if (ok) game.end.success(acc, { accuracy: acc }); else game.end.failure({ accuracy: acc });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepPhysics(dt);
      if (!finished && launched && landedT > 0.32 && !milestoneShown()) {
        showMilestone();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    game.draw.rect(W * 0.14, LAUNCH_Y - 46, 8 + power * 200, 16, C.gold);
    game.draw.sprite(PENGUIN, { '#': finished && !ok ? C.bad : C.gold }, sledX, sledY, 16, { anchor: 'center' });

    txt(Math.round(power * 100) + '%', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, sledX / (W * 0.86)), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  var _milestoneFlag = false;
  function milestoneShown() { return _milestoneFlag; }
  function showMilestone() {
    _milestoneFlag = true;
    game.fx.popup('FLYING!', sledX, sledY - 120, { color: C.gold, size: 38 });
    game.audio.play('se_milestone', 0.5);
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
    _milestoneFlag = false;
  });
})(game);
