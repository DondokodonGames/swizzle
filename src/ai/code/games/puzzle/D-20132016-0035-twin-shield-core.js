// D-20132016-0035-twin-shield-core.js
// ツインシールドコア — 左右の盾を両手で同時に回し、降ってくる隕石から中央の結晶核を守る
// 操作: 画面左半分と右半分をそれぞれ指で押さえて円を描き、左右の盾を独立して回す
// 終わり: 規定数(8個)の隕石を弾き返せば成功。1個でも核に直撃すれば失敗
// @mechanic: coop_2zone
// @theme: dual_relic_shield
// 世界観: 浮遊遺跡の中央に安置された結晶核。左右一対の古代の盾を両手で同時に操り、降り注ぐ隕石を弾き続ける守護者
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き返した隕石数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度パレット、ディザ風の細ストライプ、しっかりした縁取り
  var C = {
    bg: '#182038', bg2: '#0c1024', ring: '#3a4a78', ringEdge: '#5a6ea8',
    blade: '#ffcf4d', bladeEdge: '#a8843a', core: '#5ad0ff', coreEdge: '#1a7aa8',
    meteor: '#ff6a4d', meteorEdge: '#a83a1a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#eef2ff', ink: '#04060e',
  };

  var GAME_TITLE = 'TWIN SHIELD';
  var TOTAL = 8;
  var CXL = W * 0.27, CXR = W * 0.73, CY = H * 0.42;
  var SHIELD_R = 170;
  var BLADE_HALF = 0.62; // radians, half-width of each of the two blades

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var angL, angR, idleSpinL, idleSpinR, touchedL, touchedR;
  var events, seedN;
  function prng() { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return (seedN % 1000) / 1000; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) {
      game.draw.rect(0, i * (H / 8), W, 2, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3 + i));
    }
    game.draw.line(W * 0.5, H * 0.14, W * 0.5, H * 0.7, '#ffffff', 3);
  }

  function newEvent(idx, forcePair) {
    var side = prng() < 0.5 ? 'L' : 'R';
    return { side: side, y: -160, arrived: false };
  }

  function scheduleBatch() {
    events = [];
    var idx = 0;
    while (idx < TOTAL) {
      if (idx > 0 && idx % 3 === 0 && idx + 1 < TOTAL) {
        events.push({ side: 'L', y: -160 - idx * 40, arrived: false, pairId: idx });
        events.push({ side: 'R', y: -160 - idx * 40, arrived: false, pairId: idx });
        idx += 2;
      } else {
        events.push({ side: prng() < 0.5 ? 'L' : 'R', y: -160 - idx * 40, arrived: false });
        idx += 1;
      }
    }
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    angL = 0; angR = 0; idleSpinL = 0.5; idleSpinR = -0.5;
    touchedL = false; touchedR = false;
    seedN = 3;
    scheduleBatch();
  }

  function drawShield(cx, ang, touched) {
    game.draw.circle(cx, CY, SHIELD_R + 14, C.ringEdge, 0.5);
    game.draw.circle(cx, CY, SHIELD_R - 6, C.ring, 0.5);
    for (var b = 0; b < 2; b++) {
      var a0 = ang + b * Math.PI;
      var steps = 14;
      for (var s = 0; s < steps; s++) {
        var a = a0 + (s / (steps - 1) - 0.5) * BLADE_HALF * 2;
        var bx = cx + Math.cos(a) * SHIELD_R;
        var by = CY + Math.sin(a) * SHIELD_R;
        game.draw.circle(bx, by, 20, touched ? C.blade : C.bladeEdge);
      }
    }
    game.draw.circle(cx, CY, 22, touched ? C.gold : C.bladeEdge, 0.9);
  }

  var CORE_SPRITE = ['.##.', '####', '####', '.##.'];
  function drawCore(pulseR) {
    game.draw.circle(W * 0.5, CY, pulseR, C.coreEdge, 0.4);
    game.draw.sprite(CORE_SPRITE, { '#': C.core }, W * 0.5, CY, 11, { anchor: 'center' });
  }

  function coveredAtTop(ang) {
    var top = -Math.PI / 2;
    for (var b = 0; b < 2; b++) {
      var a0 = ang + b * Math.PI;
      var d = Math.atan2(Math.sin(top - a0), Math.cos(top - a0));
      if (Math.abs(d) < BLADE_HALF) return true;
    }
    return false;
  }

  function drawMeteor(ev) {
    if (ev.y > CY - SHIELD_R - 20) return;
    var cx = ev.side === 'L' ? CXL : CXR;
    var dist = CY - SHIELD_R - ev.y;
    var warn = dist < 260 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.circle(cx, ev.y, 24, warn ? C.bad : C.meteorEdge, 0.5);
    game.draw.circle(cx, ev.y, 18, warn ? C.bad : C.meteor);
  }

  function resolveEvent(ev) {
    ev.arrived = true;
    var cx = ev.side === 'L' ? CXL : CXR;
    var ang = ev.side === 'L' ? angL : angR;
    if (coveredAtTop(ang)) {
      passed++;
      hitStop = 0.06;
      game.feedback.good(cx, CY - SHIELD_R, { text: 'BLOCK', color: C.good });
      game.fx.burst(cx, CY - SHIELD_R, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.3);
      if (passed === 4) game.fx.popup('HALFWAY!', W * 0.5, H * 0.16, { color: C.gold, size: 36 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      ok = false; finished = true;
      hitStop = 0.35;
      game.feedback.bad(cx, CY, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function setAngle(side, x, y) {
    var cx = side === 'L' ? CXL : CXR;
    var a = Math.atan2(y - CY, x - cx);
    if (side === 'L') { angL = a; touchedL = true; } else { angR = a; touchedR = true; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    setAngle(x < W * 0.5 ? 'L' : 'R', x, y);
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    setAngle(x < W * 0.5 ? 'L' : 'R', x, y);
  });
  game.onRelease(function(x, y, id) {
    if (x < W * 0.5) touchedL = false; else touchedR = false;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.03);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var METEOR_SPEED = 300;

  var demo = { t: 0, gx: CXL, gy: CY - SHIELD_R, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { passed = 0; seedN = 3; scheduleBatch(); angL = 0; angR = 0; }
    angL += idleSpinL * dt * 0.6;
    angR += idleSpinR * dt * 0.6;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.arrived) continue;
      ev.y += METEOR_SPEED * dt;
      var cx = ev.side === 'L' ? CXL : CXR;
      if (ev.y >= CY - SHIELD_R - 90 && ev.y - METEOR_SPEED * dt < CY - SHIELD_R - 90) {
        var targetAng = -Math.PI / 2;
        if (ev.side === 'L') angL = targetAng; else angR = targetAng;
        demo.gx = cx; demo.gy = CY - SHIELD_R * 0.4;
        demo.press = true;
      }
      if (ev.y >= CY - SHIELD_R) {
        ev.arrived = true; passed++;
        game.fx.burst(cx, CY - SHIELD_R, { color: C.gold, count: 10, speed: 260 });
        game.audio.play('se_good', 0.2);
        demo.press = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (events === undefined) initGame();
      bg();
      stepDemo(dt);
      drawShield(CXL, angL, true);
      drawShield(CXR, angR, true);
      drawCore(30);
      for (var i = 0; i < events.length; i++) drawMeteor(events[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.9, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.9, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawShield(CXL, angL, false);
      drawShield(CXR, angR, false);
      drawCore(30);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '個!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.9, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { blocked: passed, total: TOTAL });
        else game.end.failure({ blocked: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!touchedL) angL += idleSpinL * dt;
      if (!touchedR) angR += idleSpinR * dt;
      for (var k = 0; k < events.length; k++) {
        var ev = events[k];
        if (ev.arrived) continue;
        ev.y += METEOR_SPEED * dt;
        if (ev.y >= CY - SHIELD_R) resolveEvent(ev);
        if (finished) break;
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawShield(CXL, angL, touchedL);
    drawShield(CXR, angR, touchedR);
    drawCore(30 + 4 * Math.sin(game.time.elapsed * 3));
    if (!finished) for (var m = 0; m < events.length; m++) drawMeteor(events[m]);

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
