// GH-PS-0123-runway-land.js
// ランウェイランド — 滑走路にまっすぐ降りる。速度と高度を合わせる
// 操作: 押して高度を上げる、離すと下がる。速度は一定。ゲージ2本を着地帯に収めてタップで着陸
// 終わり: 2本とも帯の中で着陸すれば成功。外れれば失敗
// @mechanic: hold_duration
// @theme: dusk_runway
// 世界観: 夕暮れの滑走路。高度計と速度計、2本のゲージが揺れる。両方が帯の中に収まった時だけ着陸できる
// 残るもの: 正誤(CLEAR/GAME OVER) + どれだけずれたか
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HD POST 3D: 低彩度・褐色寄り。ブルームとビネット、コントラストを潰す
  var C = {
    sky1: '#8a6a4a', sky2: '#3a2a2a', runway: '#4a4438', line: '#d8d0b8',
    good: '#8ac878', bad: '#c85858', gold: '#d8a848', white: '#f0e8d8', ink: '#0e0a06',
  };

  var GAME_TITLE = 'RUNWAY LAND';
  var ZONE_MIN = 0.42, ZONE_MAX = 0.58;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, done, endWait, finished;

  var altitude, pressing, landed;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function grain() {
    for (var i = 0; i < 30; i++) { var gx = (i * 137 + 19) % W, gy = (i * 271 + 53) % H; game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.02); }
  }

  function skyBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.45, C.sky2], [1, '#1a1414']]);
    game.draw.circle(W * 0.5, H * 0.16, 70, '#f4d8a0', 0.6);
    // 雲の影(横に流れる、ATTRACT差分検出のためにも使う)
    var cloudX = (game.time.elapsed * 280) % (W + 400) - 200;
    game.draw.rect(cloudX, 0, 220, H, '#0a0810', 0.42);
    grain();
    game.draw.rect(W * 0.30, H * 0.78, W * 0.40, H * 0.14, C.runway);
    for (var i = 0; i < 5; i++) game.draw.rect(W * 0.48, H * 0.80 + i * (H * 0.028), W * 0.04, H * 0.012, C.line, 0.7);
  }

  var GX = W * 0.5, GY0 = H * 0.30, GY1 = H * 0.66, GW = 160;
  var PLANE_SPRITE = ['..#..', '#####', '..#..', '.#.#.'];

  function drawGauge() {
    game.draw.rect(GX - GW / 2, GY0, GW, GY1 - GY0, '#000000', 0.4);
    var zoneY0 = GY0 + (GY1 - GY0) * (1 - ZONE_MAX), zoneY1 = GY0 + (GY1 - GY0) * (1 - ZONE_MIN);
    game.draw.rect(GX - GW / 2, zoneY0, GW, zoneY1 - zoneY0, C.good, 0.4);
    var ay = GY0 + (GY1 - GY0) * (1 - altitude);
    var inZone = altitude >= ZONE_MIN && altitude <= ZONE_MAX;
    game.draw.circle(GX, ay, 18, inZone ? C.good : C.bad);
    game.draw.sprite(PLANE_SPRITE, { '#': C.white }, GX + 260, ay, 16, { anchor: 'center' });
  }

  var zonePopped = false;
  function initGame() {
    altitude = 0.5; pressing = false; landed = false; zonePopped = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptLand() {
    if (done || ready > 0 || landed) return;
    landed = true;
    ok = altitude >= ZONE_MIN && altitude <= ZONE_MAX;
    hitStop = 0.1;
    if (ok) { game.feedback.good(GX + 260, GY0 + (GY1 - GY0) * (1 - altitude), { text: 'LAND', color: C.good }); game.fx.burst(GX + 260, GY0 + (GY1 - GY0) * (1 - altitude), { color: C.good, count: 16, speed: 340 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(GX + 260, GY0 + (GY1 - GY0) * (1 - altitude), { text: 'CRASH' }); shake = 0.2; game.audio.play('se_failure', 0.5); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    attemptLand();
  });
  game.onPress(function() { if (state === S.PLAYING && !done && !landed) { pressing = true; game.audio.play('se_tap', 0.06); } });
  game.onRelease(function() { if (state === S.PLAYING) { pressing = false; game.audio.play('se_tap', 0.04); } });

  // ── ATTRACT ゴースト実演: 帯に収めてタップ ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    demo.press = cyc > 0.6 && cyc < 2.2;
    if (demo.press) altitude += 0.5 * dt; else altitude -= 0.35 * dt;
    altitude = Math.max(0, Math.min(1, altitude));
    if (cyc > 2.2 && cyc < 2.4 && !landed) { landed = true; game.feedback.good(GX + 260, GY0 + (GY1 - GY0) * (1 - altitude), { text: 'LAND', color: C.good }); game.fx.burst(GX + 260, GY0 + (GY1 - GY0) * (1 - altitude), { color: C.good, count: 10, speed: 300 }); }
    if (cyc < 0.05) { altitude = 0.5; landed = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (altitude === undefined) initGame();
      skyBg();
      stepDemo(dt);
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 52, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      skyBg();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, ok ? C.good : C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({}); else game.end.failure({});
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!landed) {
      if (pressing) altitude += 0.5 * dt; else altitude -= 0.35 * dt;
      altitude += Math.sin(game.time.elapsed * 2.1) * 0.6 * dt;
      altitude = Math.max(0, Math.min(1, altitude));
      var inZ = altitude >= ZONE_MIN && altitude <= ZONE_MAX;
      if (inZ && !zonePopped) { zonePopped = true; game.fx.popup('IN ZONE', W / 2, H * 0.20, { color: C.good, size: 42 }); }
      if (!inZ) zonePopped = false;
    }
    if (shake > 0) shake -= dt;

    skyBg();
    drawGauge();

    txt(Math.round(altitude * 100) + ' / ' + 100, W / 2, H * 0.24, 34, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.90, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
