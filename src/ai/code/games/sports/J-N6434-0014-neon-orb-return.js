// J-N6434-0014-neon-orb-return.js
// ネオン光球リターン — 発射塔から曲がって飛来する光球を、打ち返し帯の中で素早いひと振りで斬り返す
// 操作: 光球が下の打ち返し帯に入ったら、光球を横切るように素早く指で線を引く。遅い線や帯の外では返らない
// 終わり: 10球打ち返せばCLEAR。3球通すかTIME UPでGAME OVER
// @mechanic: slice
// @theme: rooftop_orb_return_drill
// 世界観: 夜の発電塔の屋上で、打ち返し訓練中の見習い整備ロボが、試験塔から曲がって撃ち出される光球を電磁ブレードのひと振りで次々と跳ね返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した数と最大コンボ
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + 疑似グロー、点滅が命
  var STYLE = { bg: ['#0a0628', '#1a0c48', '#2a1060'], main: ['#30f0ff', '#ff3cc8'], accent: ['#fff04a', '#ff5050'] };
  var C = {
    bg1: '#0a0628', bg2: '#1a0c48', bg3: '#3a1470', cyan: '#30f0ff', pink: '#ff3cc8',
    yellow: '#fff04a', red: '#ff5050', white: '#ffffff', grid: '#6a2ab0', green: '#50ff9a'
  };

  var TITLE = 'ORB RETURN';
  var TIME_LIMIT = 13;
  var NEEDED = 10;
  var MAX_LOST = 3;
  var ZONE_TOP = H * 0.58, ZONE_BOT = H * 0.72;
  var ZONE_MID = (ZONE_TOP + ZONE_BOT) / 2;
  var TOWER_X = W / 2, TOWER_Y = H * 0.19;
  var ORB_R = 44;
  var MIN_SPEED = 1100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BOT_A = [
    '...cccc...',
    '..cwwwwc..',
    '..cwkkwc..',
    '...cccc...',
    '.pppppppp.',
    'p.pppppp.p',
    '..pp..pp..',
    '..pp..pp..'
  ];
  var BOT_B = [
    '...cccc...',
    '..cwwwwc..',
    '..cwkkwc..',
    '...cccc..p',
    '.pppppppp.',
    '..pppppp..',
    '..pp..pp..',
    '.pp....pp.'
  ];
  var BOT_PAL = { c: '#30f0ff', w: '#ffffff', k: '#0a0628', p: '#ff3cc8' };
  var TOWER = ['..yy..', '.yyyy.', 'yyrryy', 'yyrryy', '.yyyy.', '..pp..', '..pp..', '.pppp.'];
  var TOWER_PAL = { y: '#fff04a', r: '#ff5050', p: '#ff3cc8' };

  var orbs, returned, lost, combo, maxCombo, timeLeft, spawnT, launchN, tele, phase, phaseT, endOk, focusX, focusY, swipe, trail, hitStopT;
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, sw: null, n: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  function glowTxt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: C.bg1, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    orbs = []; returned = 0; lost = 0; combo = 0; maxCombo = 0; timeLeft = TIME_LIMIT;
    spawnT = 0.6; launchN = 0; tele = null; phase = 'ready'; phaseT = 0.8; endOk = false;
    focusX = W / 2; focusY = ZONE_MID; swipe = null; trail = []; hitStopT = 0;
  }

  function planLaunch() {
    var tx = game.random(W * 0.2, W * 0.8);
    var curve = (launchN % 3 === 2 ? 1 : 0.3) * (Math.random() < 0.5 ? -1 : 1) * game.random(120, 260);
    var dur = Math.max(0.8, 1.35 - launchN * 0.045);
    tele = { tx: tx, curve: curve, dur: dur, t: 0.6 };
  }

  function launch() {
    orbs.push({ x0: TOWER_X, tx: tele.tx, curve: tele.curve, t: 0, dur: tele.dur, x: TOWER_X, y: TOWER_Y, back: false, vx: 0, vy: 0, gold: combo >= 4 });
    launchN++;
    tele = null;
  }

  function orbPos(o) {
    var k = o.t / o.dur;
    var yEnd = ZONE_MID;
    o.x = o.x0 + (o.tx - o.x0) * k + Math.sin(Math.PI * Math.min(1, k)) * o.curve;
    o.y = TOWER_Y + (yEnd - TOWER_Y) * k;
  }

  function segHits(x1, y1, x2, y2, cx, cy, r) {
    var vx = x2 - x1, vy = y2 - y1, wx = cx - x1, wy = cy - y1;
    var l2 = vx * vx + vy * vy;
    var t = l2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / l2)) : 0;
    var px = x1 + vx * t - cx, py = y1 + vy * t - cy;
    return px * px + py * py <= r * r;
  }

  // ひと振りの線分で光球を斬り返す(実プレイ・デモ共通)
  function slash(x1, y1, x2, y2, speed, live) {
    if (speed < MIN_SPEED) return false;
    var any = false;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (o.back || o.y < ZONE_TOP - 20 || o.y > ZONE_BOT + 30) continue;
      if (!segHits(x1, y1, x2, y2, o.x, o.y, ORB_R + 26)) continue;
      o.back = true; any = true;
      var dx = x2 - x1, dl = Math.max(1, Math.abs(dx));
      o.vx = (dx / dl) * 500 + game.random(-120, 120); o.vy = -1900;
      var perfect = Math.abs(o.y - ZONE_MID) < 45;
      returned += o.gold ? 2 : 1; combo++; maxCombo = Math.max(maxCombo, combo);
      hitStopT = 0.06;
      if (live) {
        game.feedback.good(o.x, o.y - 70, { text: perfect ? 'PERFECT' : 'GOOD', color: o.gold ? C.yellow : (perfect ? C.cyan : C.green) });
        game.audio.tone(520 + Math.min(combo, 10) * 70, 0.08, { wave: 'square', volume: 0.07 });
        if (combo === 5) { game.fx.popup('FEVER', W / 2, H * 0.40, { color: C.yellow, size: 70 }); game.audio.play('se_powerup', 0.5); }
        if (returned >= 5 && returned - (o.gold ? 2 : 1) < 5) { game.fx.popup('あと' + (NEEDED - returned) + '球!', W / 2, H * 0.47, { color: C.cyan, size: 50 }); game.audio.play('se_milestone', 0.5); }
      }
    }
    return any;
  }

  function stepWorld(dt, live) {
    if (hitStopT > 0) { hitStopT -= dt; return; }
    if (tele) { tele.t -= dt; if (tele.t <= 0) launch(); }
    else {
      spawnT -= dt;
      if (spawnT <= 0) { planLaunch(); spawnT = Math.max(0.75, 1.25 - launchN * 0.04); if (live) game.audio.tone('A5', 0.05, { wave: 'sawtooth', volume: 0.04 }); }
    }
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i];
      if (o.back) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.y < -80) orbs.splice(i, 1);
        continue;
      }
      o.t += dt;
      if (o.t <= o.dur) orbPos(o);
      else { o.y += (ZONE_MID - TOWER_Y) / o.dur * dt; }
      if (o.y > ZONE_BOT + 50) {
        lost++; combo = 0;
        focusX = o.x; focusY = ZONE_BOT + 50;
        if (live) game.feedback.bad(o.x, ZONE_BOT, { text: 'MISS' });
        orbs.splice(i, 1);
      }
    }
    for (var k = trail.length - 1; k >= 0; k--) { trail[k].life -= dt; if (trail[k].life <= 0) trail.splice(k, 1); }
  }

  function drawBg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg3]]);
    game.draw.rect(0, 0, W, H, C.pink, 0.03 + 0.03 * Math.sin(el * 1.7));
    // 遠景のビル群
    for (var b = 0; b < 9; b++) {
      var bh = 180 + (b * 97) % 260;
      game.draw.rect(b * 125, H * 0.52 - bh, 100, bh, '#140a38');
      if (Math.floor(el * 2 + b) % 3 === 0) game.draw.rect(b * 125 + 30, H * 0.52 - bh + 40, 16, 16, C.yellow, 0.6);
    }
    // 床グリッド(奥へ収束)
    for (var g = 0; g < 9; g++) {
      var gy = H * 0.52 + g * g * 12;
      game.draw.line(0, gy, W, gy, C.grid, 2);
    }
    for (var v = -4; v <= 4; v++) game.draw.line(W / 2 + v * 40, H * 0.52, W / 2 + v * 260, H, C.grid, 2);
    // 打ち返し帯
    var pulse = 0.12 + 0.06 * Math.sin(el * 6);
    game.draw.rect(0, ZONE_TOP, W, ZONE_BOT - ZONE_TOP, C.cyan, pulse);
    game.draw.line(0, ZONE_TOP, W, ZONE_TOP, C.cyan, 4);
    game.draw.line(0, ZONE_BOT, W, ZONE_BOT, C.cyan, 4);
    game.draw.line(0, ZONE_MID, W, ZONE_MID, C.cyan, 1);
    // 試験塔
    var tw = tele && Math.floor(el * 16) % 2 === 0;
    game.draw.circle(TOWER_X, TOWER_Y, 90, tw ? C.red : C.pink, tw ? 0.45 : 0.15);
    game.draw.sprite(TOWER, TOWER_PAL, TOWER_X, TOWER_Y, 14, { anchor: 'center' });
  }

  function drawPlay() {
    var el = game.time.elapsed;
    // telegraph: 次の光球の予告線
    if (tele) {
      for (var d = 1; d <= 10; d++) {
        var k = d / 10;
        var px = TOWER_X + (tele.tx - TOWER_X) * k + Math.sin(Math.PI * k) * tele.curve;
        var py = TOWER_Y + (ZONE_MID - TOWER_Y) * k;
        game.draw.circle(px, py, 8, C.red, 0.3 + 0.4 * (Math.floor(el * 14) % 2));
      }
    }
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i], col = o.gold ? C.yellow : (o.back ? C.green : C.pink);
      game.draw.circle(o.x, o.y, ORB_R * 1.7, col, 0.18);
      game.draw.circle(o.x, o.y, ORB_R, col);
      game.draw.circle(o.x - 12, o.y - 12, ORB_R * 0.35, C.white, 0.8);
    }
    for (var t = 0; t < trail.length; t++) {
      var tr = trail[t];
      game.draw.line(tr.x1, tr.y1, tr.x2, tr.y2, C.cyan, 18 * tr.life / 0.25 + 2);
    }
    var bob = Math.sin(el * 5) * 6;
    game.draw.sprite(Math.floor(el * 4) % 2 ? BOT_A : BOT_B, BOT_PAL, W / 2, H * 0.80 + bob, 16, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.085, C.bg1, 0.7);
    game.draw.line(0, H * 0.085, W, H * 0.085, C.pink, 3);
    glowTxt(Math.min(returned, NEEDED) + ' / ' + NEEDED, W * 0.28, H * 0.04, 58, C.cyan);
    for (var i = 0; i < MAX_LOST; i++) game.draw.circle(W * 0.62 + i * 64, H * 0.04, 22, i < MAX_LOST - lost ? C.green : '#402060');
    if (combo >= 2) glowTxt('x' + combo, W * 0.9, H * 0.04, 46, combo >= 5 ? C.yellow : C.pink);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, H * 0.095, W - 80, 14, '#301050');
    game.draw.rect(40, H * 0.095, (W - 80) * frac, 14, frac < 0.25 ? C.red : C.cyan);
  }

  function scoreOf() { return returned * 100 + maxCombo * 40 + Math.round(timeLeft * 20); }

  function drawResult() {
    game.draw.rect(0, H * 0.30, W, H * 0.24, C.bg1, 0.85);
    glowTxt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 100, endOk ? C.yellow : C.red);
    glowTxt(Math.min(returned, NEEDED) + ' / ' + NEEDED + '   COMBO ' + maxCombo, W / 2, H * 0.42, 44, C.white);
    if (endOk && scoreOf() > game.best) glowTxt('NEW RECORD', W / 2, H * 0.49, 54, C.yellow);
    else if (!endOk) glowTxt('あと' + (NEEDED - returned) + '球!', W / 2, H * 0.49, 54, C.cyan);
    else glowTxt('BEST ' + game.best, W / 2, H * 0.49, 42, C.white);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.sw = null; demo.n = 0; spawnT = 0.1; }
    stepWorld(dt, false);
    if (demo.sw) {
      var s = demo.sw;
      s.k += dt / 0.14;
      var k0 = Math.max(0, s.k - dt / 0.14), k1 = Math.min(1, s.k);
      var ax = s.x1 + (s.x2 - s.x1) * k0, ay = s.y1 + (s.y2 - s.y1) * k0;
      var bx = s.x1 + (s.x2 - s.x1) * k1, by = s.y1 + (s.y2 - s.y1) * k1;
      trail.push({ x1: ax, y1: ay, x2: bx, y2: by, life: 0.25 });
      slash(ax, ay, bx, by, 3000, false);
      demo.gx = bx; demo.gy = by; demo.press = true;
      if (s.k >= 1) demo.sw = null;
      return;
    }
    demo.press = false;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (o.back) continue;
      demo.gx += (o.x - 200 - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (ZONE_MID + 60 - demo.gy) * Math.min(1, dt * 6);
      // 3球目はあえて見送って MISS を見せる
      if (launchN === 3 && o === orbs[orbs.length - 1]) break;
      if (o.y > ZONE_MID - 30) {
        demo.sw = { x1: o.x - 220, y1: o.y + 70, x2: o.x + 220, y2: o.y - 70, k: 0 };
      }
      break;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play') { game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.05 }); game.fx.burst(x, y, { color: C.grid, count: 4, speed: 120 }); }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    swipe = { x: x, y: y, t: game.time.elapsed, hit: false };
    if (phase === 'play') game.audio.play('se_tap', 0.12);
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !swipe || phase !== 'play') return;
    var now = game.time.elapsed;
    var dtm = Math.max(0.008, now - swipe.t);
    var dist = Math.hypot(x - swipe.x, y - swipe.y);
    var speed = dist / dtm;
    if (dist > 6) {
      trail.push({ x1: swipe.x, y1: swipe.y, x2: x, y2: y, life: 0.25 });
      if (slash(swipe.x, swipe.y, x, y, speed, true)) swipe.hit = true;
      else if (speed > MIN_SPEED && Math.random() < 0.3) game.audio.tone(900, 0.03, { wave: 'sawtooth', volume: 0.03 });
      swipe.x = x; swipe.y = y; swipe.t = now;
    }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !swipe) return;
    if (phase === 'play' && !swipe.hit && Math.hypot(x - swipe.x, y - swipe.y) > 40) game.audio.tone('E3', 0.06, { wave: 'triangle', volume: 0.05 });
    swipe = null;
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!orbs) initGame();
      stepDemo(dt);
      drawBg(); drawPlay();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      glowTxt(TITLE, W / 2, H * 0.07, 96, C.cyan);
      glowTxt('HI-SCORE ' + game.best, W / 2, H * 0.115, 40, C.yellow);
      if (Math.floor(el * 1.8) % 2 === 0) glowTxt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.yellow);
      else glowTxt('INSERT COIN', W / 2, H * 0.93, 46, C.pink);
      return;
    }
    if (state === S.RESULT) {
      drawBg(); drawPlay(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) glowTxt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepWorld(dt, true);
      if (returned >= NEEDED) { endOk = true; phase = 'stop'; phaseT = 0.45; focusX = W / 2; focusY = ZONE_MID; }
      else if (lost >= MAX_LOST) { endOk = false; phase = 'stop'; phaseT = 0.45; }
      else if (timeLeft <= 0) { timeLeft = 0; endOk = false; phase = 'stop'; phaseT = 0.45; focusX = W / 2; focusY = ZONE_MID; }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.yellow, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#30f0ff', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        if (endOk) game.end.success(scoreOf(), { returned: returned, maxCombo: maxCombo, lost: lost });
        else game.end.failure({ returned: returned, maxCombo: maxCombo, lost: lost });
        return;
      }
    }

    drawBg(); drawPlay(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY, 80 + (0.45 - phaseT) * 160, C.white, 0.45);
      game.draw.circle(focusX, focusY, ORB_R * 1.4, endOk ? C.yellow : C.red);
    }
    if (phase === 'ready') glowTxt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 110, C.yellow);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['E5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['E5', 0.5], ['C5', 1],
      ['D4', 0.5], ['D5', 0.5], ['A4', 0.5], ['F4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E4', 1]
    ], { tempo: 156, wave: 'sawtooth', volume: 0.04, loop: true, bass: [['E2', 1], ['E2', 1], ['A2', 1], ['A2', 1], ['D2', 1], ['D2', 1], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
