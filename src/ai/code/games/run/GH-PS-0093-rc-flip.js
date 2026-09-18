// GH-PS-0093-rc-flip.js
// RCフリップ — ラジコンでコースを走らせる。操作が視点と逆になる区間がある
// 操作: 指で左右にドラッグして操縦。逆走マーク区間では操作方向が反転する
// 終わり: ゴールまで持てば成功、道の外に落ちれば失敗。進んだ距離(m)が残る
// @mechanic: drag_follow
// @theme: neon_rc_track
// 世界観: 夜のRCコース。普段は指の方向どおりに動くが、視点が反転する区間だけ逆に動く。気づかず突っ込むと外に落ちる
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離(m)
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s NEON: 濃紺グラデ + 疑似グロー。点滅が命
  var C = {
    sky1: '#0a0a2a', sky2: '#12123a', road: '#1a1a3a', roadLine: '#3a3a6a',
    car: '#39ffea', reverse: '#ff2a6a', good: '#39ff6a', bad: '#ff2a6a', gold: '#ffd400', white: '#f0f0ff', ink: '#05050a',
  };

  var GAME_TITLE = 'RC FLIP';
  var TRACK_LEN = 46, ROAD_HALF = W * 0.30, CX = W / 2, CAR_Y = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, distM = 0;

  var carX, dist, segs, stick, done, endWait, crashed;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function glowCircle(x, y, r, color, a) { game.draw.circle(x, y, r * 1.6, color, a * 0.35); game.draw.circle(x, y, r, color, a); }

  function makeSegs() {
    var arr = []; var d = 6;
    while (d < TRACK_LEN) {
      var len = 4 + Math.random() * 5;
      var rev = Math.random() < 0.45;
      arr.push({ from: d, to: d + len, reverse: rev });
      d += len;
    }
    return arr;
  }

  function isReverseAt(d) {
    for (var i = 0; i < segs.length; i++) if (d >= segs[i].from && d < segs[i].to) return segs[i].reverse;
    return false;
  }

  function initGame() {
    carX = 0; dist = 0; segs = makeSegs(); crashed = false;
    done = false; endWait = 0;
    stick = { active: false, id: null, ox: 0, dx: 0 };
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var CAR_SPRITE = ['.##.', '####', '.##.'];
  var SIGN_SPRITE = ['.#.', '###', '.#.'];

  function trackBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    var rev = isReverseAt(dist);
    game.draw.rect(CX - ROAD_HALF, H * 0.14, ROAD_HALF * 2, H * 0.68, rev ? '#3a1030' : C.road);
    glowCircle(CX - ROAD_HALF, H * 0.5, 6, rev ? C.reverse : C.car, 0.8);
    glowCircle(CX + ROAD_HALF, H * 0.5, 6, rev ? C.reverse : C.car, 0.8);
    for (var i = 0; i < 12; i++) {
      var t = ((i / 12 + dist * 0.06) % 1);
      var yy = H * 0.14 + t * H * 0.68;
      game.draw.rect(CX - 6, yy, 12, 30, C.roadLine, 0.6);
    }
    if (rev) {
      var flick = Math.floor(game.time.elapsed * 6) % 2 === 0;
      if (flick) { game.draw.sprite(SIGN_SPRITE, { '#': C.reverse }, CX, H * 0.20, 14, { anchor: 'center' }); }
    }
  }

  function drawCar() {
    var x = CX + carX * ROAD_HALF;
    game.draw.circle(x, CAR_Y + 24, 40, '#000000', 0.35);
    game.draw.sprite(CAR_SPRITE, { '#': C.car }, x, CAR_Y, 16, { anchor: 'center' });
    glowCircle(x, CAR_Y, 46, C.car, 0.14);
  }

  function crash() {
    if (crashed) return;
    crashed = true; ok = false;
    var x = CX + carX * ROAD_HALF;
    game.feedback.bad(x, CAR_Y, { text: 'CRASH' });
    game.fx.burst(x, CAR_Y, { color: C.bad, count: 20, speed: 400 });
    shake = 0.3;
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    distM = Math.round(dist * 10) / 10;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5);
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onPress(function(x) {
    if (state !== S.PLAYING || crashed) return;
    stick.active = true; stick.ox = x; stick.dx = 0;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x) {
    if (!stick.active) return;
    stick.dx = x - stick.ox;
    if (Math.random() < 0.03) game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function() {
    stick.active = false; stick.dx = 0;
    game.audio.play('se_tap', 0.05);
  });

  // ── ATTRACT ゴースト実演: 逆走区間では逆方向にドラッグする ──
  var demo = { t: 0, gx: CX, gy: CAR_Y + 120, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    dist += dt * 3.2;
    if (dist > TRACK_LEN) { dist = 0; carX = 0; }
    var rev = isReverseAt(dist);
    var target = Math.sin(demo.t * 1.4) * (rev ? -0.6 : 0.6);
    carX += (target - carX) * Math.min(1, dt * 3);
    demo.gx = CX + Math.sin(demo.t * 1.4) * 160;
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (segs === undefined) initGame();
      trackBg();
      stepDemo(dt);
      drawCar();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 56, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 'm' : '-'), W / 2, H * 0.115, 28, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.93, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      trackBg();
      drawCar();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 56, ok ? C.good : C.bad);
      txt(distM + 'm', W / 2, H * 0.88, 44, C.gold);
      var best = Math.max(game.best, distM);
      if (distM > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.93, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(distM, { label: distM + 'm' }); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!crashed) {
      var prevDist = dist;
      dist += dt * 3.6;
      if (dist >= TRACK_LEN) {
        ok = true; crashed = true;
        var xEnd = CX + carX * ROAD_HALF;
        game.feedback.good(xEnd, CAR_Y, { text: 'GOAL', color: C.good });
        game.fx.burst(xEnd, CAR_Y, { color: C.good, count: 18, speed: 380 });
        finish();
      } else {
        var rev = isReverseAt(dist);
        var dxVal = stick.active ? stick.dx : 0;
        var eff = rev ? -dxVal : dxVal;
        carX += (eff / (W * 0.4)) * dt * 2.4;
        carX = Math.max(-1.15, Math.min(1.15, carX));
        if (Math.abs(carX) >= 1.05) crash();
        else if (Math.floor(dist / 10) > Math.floor(prevDist / 10)) game.fx.popup(Math.floor(dist) + 'm', W / 2, H * 0.24, { color: C.gold, size: 44 });
      }
    }
    if (shake > 0) shake -= dt;

    trackBg();
    drawCar();

    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.6);
    game.draw.rect(60, 40, (W - 120) * Math.min(1, dist / TRACK_LEN), 20, isReverseAt(dist) ? C.reverse : C.car);
    txt(Math.round(dist) + ' / ' + TRACK_LEN + 'm', W / 2, 100, 32, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 78, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
