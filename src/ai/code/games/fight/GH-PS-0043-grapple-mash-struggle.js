// GH-PS-0043-grapple-mash-struggle.js
// アームロック — 組み合った腕を連打で押し倒す。放っておくと勝手に押し戻される
// 操作: 画面のどこでもいいので連打し続ける。腕の血管が光ったら渾身の連打で耐える
// 終わり: 相手の腕を倒しきれば成功。押し倒されるか、サドンデスで押し負ければ失敗
// @mechanic: mash
// @theme: arm_lock_table
// 世界観: 薄暗い酒場の卓、組んだ腕がせめぎ合う。連打を止めると自然に押し戻され、相手の血管が光ると渾身の一押しが来る。決着がつかなければ最後の力比べで決まる
// 残るもの: 正誤(CLEAR/GAME OVER) + 総タップ数 + 耐えたバースト数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s ISO: 菱形グリッドの床。高さは影の距離で示す。奥ほど小さくしない
  var C = {
    bg1: '#3a2848', bg2: '#1c1428', floor: '#4a3560', floorLine: '#6a4a88',
    p1: '#e05a4a', p2: '#4a7ae0', p1d: '#a03828', p2d: '#2a55b0',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4eeff', ink: '#140a1c',
  };

  var GAME_TITLE = 'ARM LOCK';
  var CX = W / 2, CY = H * 0.46;
  var MAX_TIME = 9.2, SUDDEN_DEATH_T = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var pos, taps, burstsSurvived, totalTime, sudden, sdTimeLeft;
  var burstState, burstT, burstWarnAt;
  var done, endWait, finished;
  var ready, hitStop, shake, armPulse;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function isoFloor() {
    game.draw.gradient(0, H * 0.58, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.58, W, H * 0.42, C.floor);
    for (var i = -4; i <= 10; i++) {
      game.draw.line(i * 130, H * 0.58, i * 130 + 420, H, C.floorLine, 2);
      game.draw.line(-200, H * 0.58 + i * 60, W + 200, H * 0.58 + i * 60 - 240, C.floorLine, 1);
    }
  }

  var FIST_SPRITE = ['.##.', '####', '####'];

  function drawArms() {
    var ang = pos * 34; // 度。+側=プレイヤー優勢で相手の腕が倒れる
    var rad = ang * Math.PI / 180;
    var reach = 210;
    var fx = CX + Math.sin(rad) * reach * 0.5;
    var fy = CY - Math.cos(rad) * 40;
    // 台
    game.draw.rect(CX - 220, CY + 120, 440, 60, C.floorLine);
    game.draw.rect(CX - 220, CY + 100, 440, 24, C.floor);
    // 前腕(プレイヤー=左下起点, 相手=右下起点)
    game.draw.line(CX - 200, CY + 140, fx, fy, C.p1, 46);
    game.draw.line(CX + 200, CY + 140, fx, fy, C.p2, 46);
    game.draw.circle(CX - 210, CY + 150, 48, C.p1d);
    game.draw.circle(CX + 210, CY + 150, 48, C.p2d);
    game.draw.sprite(FIST_SPRITE, { '#': C.gold }, fx, fy, 12, { anchor: 'center' });
    // 血管バースト警告(telegraph)
    if (burstState === 'warn') {
      var blink = Math.floor(game.time.elapsed * 13) % 2 === 0;
      if (blink) game.draw.circle(fx, fy, 60, C.bad, 0.55);
    } else if (burstState === 'active') {
      game.draw.circle(fx, fy, 70, C.gold, 0.35 + armPulse * 0.3);
    }
  }

  function initGame() {
    pos = 0; taps = 0; burstsSurvived = 0; totalTime = 0; sudden = false; sdTimeLeft = SUDDEN_DEATH_T;
    burstState = 'idle'; burstT = 1.4 + game.random(0, 1.2); burstWarnAt = 0.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; armPulse = 0;
  }

  function doTap(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    taps++;
    var gain = burstState === 'active' ? 0.020 : 0.030;
    pos = Math.min(1, pos + gain);
    game.audio.play('se_tap', 0.06);
    game.fx.burst(x, y, { color: C.p1, count: 4, speed: 140 });
    if (!sudden && pos >= 1) resolve(true);
    if (sudden && pos >= 1) resolve(true);
  }

  function resolve(win) {
    ok = win; finished = true;
    hitStop = 0.28;
    if (win) {
      game.feedback.good(CX, CY, { text: 'GREAT', color: C.gold });
      game.fx.burst(CX, CY, { color: C.gold, count: 22, speed: 420 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.32;
      game.audio.play('se_failure', 0.5);
    }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    doTap(x, y);
  });

  function stepBurst(dt) {
    if (burstState === 'idle') {
      burstT -= dt;
      if (burstT <= burstWarnAt) { burstState = 'warn'; game.audio.tone(200, 0.15, { wave: 'sine', volume: 0.12 }); }
    } else if (burstState === 'warn') {
      burstT -= dt;
      if (burstT <= 0) { burstState = 'active'; burstT = 0.9; game.audio.tone(120, 0.3, { wave: 'sawtooth', volume: 0.2, slide: -50 }); }
    } else if (burstState === 'active') {
      burstT -= dt;
      armPulse = Math.min(1, armPulse + dt * 3);
      pos -= (0.55 + totalTime * 0.02) * dt; // バースト中は強く押し戻される
      if (burstT <= 0) {
        burstState = 'idle'; burstT = 1.2 + game.random(0, 1.2); burstWarnAt = 0.45;
        if (pos > -0.9) { burstsSurvived++; game.fx.popup('NICE', CX, CY - 160, { color: C.good, size: 34 }); game.audio.play('se_milestone', 0.35); }
      }
    }
  }

  function stepMatch(dt) {
    stepBurst(dt);
    if (burstState !== 'active') pos -= 0.045 * (1 + totalTime * 0.03) * dt; // 常時の自然圧(離すと押し戻される)
    pos = Math.max(-1, Math.min(1, pos));
    if (pos <= -1) { resolve(false); return; }
    if (pos >= 1) { resolve(true); return; }
    totalTime += dt;
    if (!sudden && totalTime >= MAX_TIME) {
      sudden = true; sdTimeLeft = SUDDEN_DEATH_T; pos = 0;
      game.fx.flash(C.gold, 0.4);
      game.fx.burst(CX, CY, { color: C.gold, count: 26, speed: 460 });
      game.audio.play('se_powerup', 0.4);
    }
    if (sudden) {
      sdTimeLeft -= dt;
      if (sdTimeLeft <= 0) resolve(pos >= 0);
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (pos === undefined) initGame();
    if (!finished) {
      stepMatch(dt);
      var mashing = Math.floor(demo.t * 7) % 2 === 0;
      demo.press = mashing;
      if (mashing) doTap(CX, CY);
    } else { initGame(); }
    demo.gx = CX; demo.gy = CY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      isoFloor();
      stepDemo(dt);
      drawArms();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      isoFloor();
      drawArms();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt('TAP ' + taps, W / 2, H * 0.11, 30, C.gold);
      txt('BURST ' + burstsSurvived, W / 2, H * 0.155, 26, C.white);
      if (taps > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.20, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { taps: taps, bursts: burstsSurvived };
        if (ok) game.end.success(taps, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepMatch(dt);
    }
    if (shake > 0) shake -= dt;
    if (armPulse > 0 && burstState !== 'active') armPulse = Math.max(0, armPulse - dt * 3);

    isoFloor();
    drawArms();

    var progress = (pos + 1) / 2;
    game.draw.rect(60, 40, W - 120, 22, C.ink, 0.45);
    game.draw.rect(60, 40, (W - 120) * progress, 22, sudden ? C.bad : C.gold);
    if (sudden) {
      var sdBlink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (sdBlink) game.draw.rect(0, 0, W, H, C.gold, 0.06);
      txt(String(Math.ceil(sdTimeLeft * 10) / 10), W / 2, 108, 34, C.bad);
    } else {
      txt('TAP ' + taps, W / 2, 108, 28, C.white);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 66, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['E3', 0.15], ['E3', 0.15], ['A3', 0.15], ['E3', 0.15], ['G3', 0.15], ['E3', 0.15]],
      { tempo: 150, wave: 'sawtooth', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
