// D-20172021-0042-paddock-dash-trial.js
// パドックダッシュトライアル — 追い込み特訓で俊足の相棒獣を鍛え上げ、そのまま直線コースを走らせて着順を競う
// 操作: 特訓ゾーンを連打して足のステータスを鍛え、時間が来たら自動で始まる直線レースの結果を見守る
// 終わり: 1〜2着に入れば成功。3〜4着なら失敗
// @mechanic: mash
// @theme: paddock_dash_trial
// 世界観: 牧場育ちの俊足の相棒獣を託された若い調教師が、出走直前の追い込み特訓で全力を絞り出し、直線コースの着順に賭ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 着順
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色 + 地平グラデ、横ストリップを奥ほど圧縮、地平線へ収束する床
  var C = {
    sky1: '#ffb463', sky2: '#ff7a3d', horizon: '#ffe0a0',
    track1: '#3a7d3f', track2: '#2e6432', lane: '#e8d9a0',
    beast: '#4fd6c0', beastDark: '#238a78', rival: '#e8895a', rivalDark: '#a85632',
    good: '#39e07a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#2a1608', white: '#ffffff',
  };

  var GAME_TITLE = 'PADDOCK DASH';
  var PREP_TIME = 5.0;
  var RACE_TIME = 3.0;
  var TIME_LIMIT = PREP_TIME + RACE_TIME;
  var NEEDED = 26;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BEAST_A = ['.#.#.', '#####', '.###.', '#...#'];
  var BEAST_B = ['.#.#.', '#####', '.###.', '.#.#.'];

  var PREP_BTN = { x: W * 0.5, y: H * 0.83, r: 150 };

  var phase, gauge, tapCount, prepClock, raceClock, placement, halfCalled, bumpCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function skyFloor(shakeX) {
    game.draw.gradient(0, H * 0.42, [[0, C.sky1], [1, C.sky2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.40, W, 10, C.horizon, 1);
    var strips = 22;
    for (var i = 0; i < strips; i++) {
      var t = i / strips;
      var y = H * 0.40 + t * t * (H * 0.55);
      var hgt = 4 + t * t * 20;
      var col = i % 2 === 0 ? C.track1 : C.track2;
      game.draw.rect(0 + shakeX, y, W, hgt, col, 1);
    }
    // converging lane lines
    var vx = W * 0.5;
    for (var l = -2; l <= 2; l++) {
      if (l === 0) continue;
      game.draw.line(vx + shakeX, H * 0.40, vx + l * W * 0.55 + shakeX, H, C.lane, 4);
    }
  }

  function drawPrep() {
    var pct = gauge / 100;
    var frame = tapCount % 2 === 0 ? BEAST_A : BEAST_B;
    game.draw.circle(PREP_BTN.x, PREP_BTN.y, PREP_BTN.r, C.beastDark, 0.5);
    game.draw.circle(PREP_BTN.x, PREP_BTN.y, PREP_BTN.r * 0.78, C.beast, 0.85);
    game.draw.sprite(frame, { '#': C.white }, PREP_BTN.x, PREP_BTN.y, 20, { anchor: 'center' });
    var barW = W - 140;
    game.draw.rect(70, H * 0.60, barW, 34, '#2a1608', 0.5);
    game.draw.rect(70, H * 0.60, barW * pct, 34, C.gold);
    txt(Math.floor(gauge) + ' / ' + 100, W * 0.5, H * 0.575, 30, C.ink);
    var prepPct = Math.max(0, 1 - prepClock / PREP_TIME);
    game.draw.rect(70, 150, barW, 16, '#2a1608', 0.5);
    game.draw.rect(70, 150, barW * prepPct, 16, prepPct < 0.25 ? C.bad : C.white);
  }

  function laneX(rank) { return W * (0.28 + rank * 0.22); }

  function drawRace(shakeX) {
    var t = Math.min(1, raceClock / RACE_TIME);
    var scale = 14 + t * t * 58;
    var yPos = H * 0.44 + t * t * (H * 0.40);
    // rivals fixed pace at mid placement
    for (var r = 0; r < 3; r++) {
      var rr = (r + 1) * 0.33;
      var ry = H * 0.44 + rr * rr * (H * 0.40) * (0.92 + r * 0.03);
      var rscale = 14 + rr * rr * 58 * (0.9 + r * 0.05);
      game.draw.sprite(BEAST_A, { '#': C.rival }, laneX((r + 1) / 3) + shakeX, ry, rscale, { anchor: 'center', alpha: Math.min(1, t * 3) });
    }
    var myLane = laneX(placement !== undefined ? (placement - 1) / 3 : 0.5);
    var frame = Math.sin(game.time.elapsed * 12) > 0 ? BEAST_A : BEAST_B;
    game.draw.sprite(frame, { '#': C.beast }, myLane + shakeX, yPos, scale, { anchor: 'center' });
  }

  function computePlacement() {
    var g = gauge + (Math.random() * 10 - 5);
    if (g >= 84) return 1;
    if (g >= 58) return 2;
    if (g >= 32) return 3;
    return 4;
  }

  function initGame() {
    phase = 'prep'; gauge = 0; tapCount = 0; prepClock = 0; raceClock = 0; placement = 4;
    halfCalled = false; bumpCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function doTap(x, y) {
    if (phase !== 'prep') return;
    var d = Math.hypot(x - PREP_BTN.x, y - PREP_BTN.y);
    if (d > PREP_BTN.r * 1.3) return;
    tapCount++;
    gauge = Math.min(100, gauge + (gauge < 70 ? 5 : 2.5));
    game.fx.burst(x, y, { color: C.gold, count: 6, speed: 180 });
    if (!halfCalled && gauge >= 50) { halfCalled = true; game.fx.popup('NICE', PREP_BTN.x, PREP_BTN.y - 190, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    if (!bumpCalled && gauge >= 90) { bumpCalled = true; game.fx.popup('あと少し!', PREP_BTN.x, PREP_BTN.y - 190, { color: C.gold, size: 28 }); game.audio.play('se_powerup', 0.3); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0) { game.audio.play('se_tap', 0.12); doTap(x, y); }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0) { game.audio.play('se_tap', 0.12); doTap(x, y); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var DEMO_PREP = 2.4, DEMO_RACE = 1.8, DEMO_CYCLE = DEMO_PREP + DEMO_RACE + 0.6;
  var demo = { t: 0, gx: PREP_BTN.x, gy: PREP_BTN.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < DEMO_PREP) {
      phase = 'prep'; prepClock = (cyc / DEMO_PREP) * PREP_TIME;
      demo.gx = PREP_BTN.x; demo.gy = PREP_BTN.y;
      var beat = Math.floor(cyc * 7);
      demo.press = beat % 2 === 0;
      if (beat !== Math.floor((cyc - dt) * 7)) doTap(PREP_BTN.x, PREP_BTN.y);
    } else if (phase === 'prep') {
      phase = 'race'; raceClock = 0; placement = 1; ok = true;
    } else {
      raceClock = Math.min(RACE_TIME, ((cyc - DEMO_PREP) / DEMO_RACE) * RACE_TIME);
      demo.press = false; demo.gx = laneX((placement - 1) / 3); demo.gy = H * 0.6;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gauge === undefined) initGame();
      stepDemo(dt);
      skyFloor(0);
      if (phase === 'prep') drawPrep(); else drawRace(0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      skyFloor(0);
      drawRace(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(placement + '位', W / 2, H * 0.15, 34, C.gold);
      if (!ok) txt('あと' + (placement - 2) + '着差!', W / 2, H * 0.20, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    var shakeX = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 14 * shake; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(gauge), { placement: placement, gauge: Math.floor(gauge) });
        else game.end.failure({ placement: placement, gauge: Math.floor(gauge) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'prep') {
        prepClock += dt;
        if (prepClock >= PREP_TIME) { phase = 'race'; raceClock = 0; placement = computePlacement(); }
      } else {
        raceClock += dt;
        if (raceClock >= RACE_TIME) {
          finished = true;
          ok = placement <= 2;
          hitStop = 0.35;
          var lx = laneX((placement - 1) / 3);
          if (ok) { game.feedback.good(lx, H * 0.8, { text: placement + '位!', color: C.good }); game.fx.burst(lx, H * 0.8, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); }
          else { game.feedback.bad(lx, H * 0.8, { text: placement + '位' }); game.audio.play('se_failure', 0.4); shake = 0.2; }
          finish();
        }
      }
    }

    skyFloor(shakeX);
    if (phase === 'prep') drawPrep(); else drawRace(shakeX);
    if (phase === 'race') txt(Math.max(0, RACE_TIME - raceClock).toFixed(1) + 's', W * 0.5, H * 0.065, 26, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F#4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
