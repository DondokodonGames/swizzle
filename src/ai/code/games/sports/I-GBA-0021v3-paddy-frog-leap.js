// I-GBA-0021v3-paddy-frog-leap.js
// パディフロッグリープ — 押し続けて後ろ脚に力を溜め、次の蓮の葉にちょうど届く強さで離して跳び移る
// 操作: 押している間カエルが脚を縮めて力が溜まる。溜めた強さで跳ぶ距離が決まる。満タンでキュッと鳴った後も押し続けると脚がつって弱く跳んでしまう
// 終わり: 5枚の葉を渡り切って向こうの畦に着けばCLEAR。水に落ちるのが3回、または時間切れでGAME OVER
// @mechanic: hold_charge
// @theme: paddy_frog_leaf_leap
// 世界観: 田植え前の水を張った田んぼで、子ガエルが後ろ脚に力を溜め、流れで少しずつ漂う蓮の葉へ一枚ずつ跳び移って向こうの畦を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った葉の数・PERFECT着地数・落水回数
// スタイル: 90s HANDHELD COLOR
var STYLE = { bg: ['#9fb8a0', '#6f9a86', '#46705f'], main: ['#6a8c3a', '#3d5a2a'], accent: ['#e0c060', '#c85a4a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var WATER_Y = H * 0.6;
  var FROG_SX = W * 0.2;
  var RANGE = 700;
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var SPLASH_MAX = 3;
  var GAPS = [380, 560, 470, 700, 520];
  var RADII = [92, 86, 80, 76, 70];
  var RATES = [0.95, 1.0, 1.08, 1.15, 1.22];
  var DRIFT = [0, 0, 40, 30, 55];

  var FROG_SIT = [
    '..ee..ee..',
    '.eWeeeWe..',
    '.gggggggg.',
    'gggggggggg',
    'gyyyyyyyyg',
    'gg.gggg.gg',
    'g........g',
  ];
  var FROG_COIL = [
    '..........',
    '..ee..ee..',
    '.eWeeeWe..',
    'gggggggggg',
    'gyyyyyyyyg',
    'gggggggggg',
    'gg......gg',
  ];
  var FROG_AIR = [
    '..ee..ee..',
    '.eWeeeWe..',
    '.gggggggg.',
    '.gyyyyyyg.',
    '..gggggg..',
    '.g......g.',
    'g........g',
  ];
  var FROG_PAL = { e: '#24382c', W: '#f4f0d8', g: '#c0dc68', y: '#f0e8a8' };
  var LEAF = ['..llllll..', '.llLLllll.', 'llllllLlll', '.llllllll.', '..llllll..'];
  var SEED = ['.s.', 'sss', '.s.', '.s.'];

  var G = { scene: 'ATTRACT' };

  function newRun() {
    G.leaves = [{ wx: 0, r: 100, drift: 0 }];
    var acc = 0;
    for (var i = 0; i < GAPS.length; i++) {
      acc += GAPS[i];
      G.leaves.push({ wx: acc, r: RADII[i], drift: DRIFT[i] });
    }
    G.on = 0; G.charge = 0; G.holding = false; G.overT = 0; G.full = false;
    G.hop = null; G.swim = 0; G.freeze = null; G.idle = 0;
    G.camX = 0; G.clock = TIME_LIMIT; G.count = 0; G.perfect = 0; G.splash = 0;
    G.ready = 0.8; G.over = false; G.endT = 0; G.win = false; G.score = 0; G.record = false;
    G.frogX = 0; G.frogY = 0; G.t = 0;
  }

  function leafX(i) {
    var L = G.leaves[i];
    return L.wx + (L.drift ? Math.sin(G.t * 2.4 + i) * L.drift : 0);
  }
  function scr(wx) { return wx - G.camX + FROG_SX; }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 2, y + 3, { size: size, color: '#24382c', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function paintPaddy() {
    var t = game.time.elapsed;
    game.draw.gradient(0, WATER_Y, [[0, '#c8d8b8'], [1, STYLE.bg[0]]]);
    for (var m = 0; m < 5; m++) {
      var mx = ((m * 300 - G.camX * 0.15) % (W + 400) + W + 400) % (W + 400) - 200;
      for (var s = 0; s < 60; s += 6) game.draw.rect(mx - 160 + s * 2.6, WATER_Y - 150 + s, 320 - s * 5.2, 6, '#8aa890', 0.8);
    }
    game.draw.gradient(WATER_Y, H, [[0, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var r = 0; r < 6; r++) {
      var ry = WATER_Y + 40 + r * 110;
      var shift = (G.camX * (0.4 + r * 0.12)) % 120;
      for (var c = -1; c < 11; c++) {
        game.draw.sprite(SEED, { s: '#5f8a4a' }, c * 120 - shift + (r % 2) * 60, ry, 5 + r, { anchor: 'center', alpha: 0.5 });
      }
    }
    for (var w = 0; w < 8; w++) {
      var wy = WATER_Y + 20 + w * 90 + Math.sin(t * 1.5 + w) * 6;
      game.draw.rect(((w * 170 + t * 30) % (W + 200)) - 100, wy, 120, 4, '#c8dcc8', 0.35);
    }
    var bankX = scr(G.leaves[G.leaves.length - 1].wx) + 110;
    if (bankX < W + 50) {
      game.draw.rect(bankX, WATER_Y - 40, W - bankX + 40, H - WATER_Y + 40, '#8a7248');
      game.draw.rect(bankX, WATER_Y - 40, W - bankX + 40, 14, '#a88c5a');
    }
  }

  function paintLeaves() {
    for (var i = 0; i < G.leaves.length; i++) {
      var x = scr(leafX(i));
      if (x < -200 || x > W + 200) continue;
      var L = G.leaves[i];
      var px = L.r / 5;
      var bob = Math.sin(game.time.elapsed * 2 + i) * 4;
      game.draw.circle(x, WATER_Y + 34, L.r * 1.05, '#24382c', 0.25);
      game.draw.sprite(LEAF, { l: STYLE.main[0], L: '#a8c070' }, x, WATER_Y + 18 + bob, px, { anchor: 'center' });
      if (i === G.on + 1 && G.scene === 'PLAYING') {
        var a = 0.25 + 0.2 * Math.sin(game.time.elapsed * 6);
        game.draw.circle(x, WATER_Y + 18, L.r * 0.3, STYLE.accent[0], a);
      }
    }
  }

  function paintFrog() {
    var fx, fy, art = FROG_SIT;
    if (G.hop) {
      var k = 1 - G.hop.t / G.hop.dur;
      fx = scr(G.hop.x0 + (G.hop.x1 - G.hop.x0) * k);
      fy = WATER_Y - 20 - Math.sin(k * Math.PI) * G.hop.h;
      art = FROG_AIR;
    } else if (G.swim > 0) {
      fx = scr(leafX(G.on)) + G.swim * 260;
      fy = WATER_Y + 30;
      art = FROG_AIR;
    } else {
      fx = scr(leafX(G.on));
      fy = WATER_Y - 20 + Math.sin(game.time.elapsed * 3) * 3;
      if (G.holding) art = FROG_COIL;
    }
    var shake = G.full ? Math.sin(game.time.elapsed * 70) * 6 : 0;
    var size = 16 + (G.holding ? G.charge * 3 : 0);
    game.draw.circle(fx, WATER_Y + 4, 60, '#24382c', 0.3);
    game.draw.sprite(art, FROG_PAL, fx + shake, fy - 52, size, { anchor: 'center' });
    G.frogX = fx; G.frogY = fy - 52;
    if (G.holding) {
      for (var d = 0; d < 10; d++) {
        var on = d < Math.round(G.charge * 10);
        var ang = Math.PI * (1 + d / 9);
        game.draw.circle(fx + Math.cos(ang) * 120, fy - 40 + Math.sin(ang) * 120, 12, on ? (G.full ? STYLE.accent[1] : STYLE.accent[0]) : '#24382c', on ? 1 : 0.35);
      }
    }
  }

  function paintGauge() {
    var gx = 120, gy = H * 0.85, gw = W - 240;
    game.draw.rect(gx - 8, gy - 30, gw + 16, 60, '#24382c', 0.7);
    game.draw.rect(gx, gy - 20, gw * G.charge, 40, G.full ? (Math.floor(game.time.elapsed * 12) % 2 ? STYLE.accent[1] : '#f4f0d8') : STYLE.accent[0]);
    game.draw.rect(gx + gw - 30, gy - 30, 30, 60, '#f4f0d8', 0.35);
    game.draw.sprite(FROG_COIL, FROG_PAL, gx + gw * G.charge, gy - 60, 4, { anchor: 'center' });
  }

  // ── 跳躍の解決(実プレイとデモで共通) ───────────────────────────────────────
  function leap(power, real) {
    if (G.hop || G.swim > 0 || G.freeze) return;
    var x0 = leafX(G.on);
    var x1 = x0 + power * RANGE;
    G.hop = { x0: x0, x1: x1, dur: 0.35 + power * 0.25, t: 0.35 + power * 0.25, h: 80 + power * 260, real: real };
    G.charge = 0; G.holding = false; G.full = false; G.overT = 0; G.idle = 0;
    game.audio.play('se_jump', 0.45);
  }

  function landHop() {
    var h = G.hop; G.hop = null;
    var ti = G.on + 1;
    if (ti >= G.leaves.length) return;
    var err = Math.abs(h.x1 - leafX(ti));
    var L = G.leaves[ti];
    if (err <= L.r) {
      G.on = ti;
      var perfect = err <= L.r * 0.3;
      game.feedback.good(G.frogX, G.frogY - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#f4f0d8' });
      if (h.real) {
        G.count++;
        if (perfect) G.perfect++;
        if (G.count === 3) {
          game.fx.popup('NICE', W * 0.5, H * 0.3, { color: STYLE.accent[0], size: 64 });
          game.audio.play('se_milestone', 0.45);
        }
        if (G.count >= NEEDED) closeRun(true);
      }
    } else {
      G.freeze = { t: 0.45, x: scr(h.x1), y: WATER_Y, real: h.real };
      game.audio.tone('C3', 0.1, { wave: 'triangle', volume: 0.1 });
    }
  }

  function closeRun(win) {
    if (G.over) return;
    G.over = true; G.win = win; G.endT = 1.2;
    G.score = G.count * 100 + G.perfect * 50 + (win ? Math.round(G.clock * 20) : 0);
    G.record = win && G.score > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.5);
  }

  function advance(dt, real) {
    G.t += dt;
    if (G.freeze) {
      G.freeze.t -= dt;
      if (G.freeze.t <= 0) {
        game.feedback.bad(G.freeze.x, G.freeze.y - 40, { text: 'MISS', shake: 14, flashColor: '#c8dcf0' });
        game.fx.burst(G.freeze.x, G.freeze.y, { color: '#e8f4ff', count: 16, speed: 300 });
        if (G.freeze.real) {
          G.splash++;
          if (G.splash >= SPLASH_MAX) closeRun(false);
        }
        G.swim = G.freeze.idle ? 0 : 1; G.freeze = null;
      }
      return;
    }
    if (G.swim > 0) { G.swim = Math.max(0, G.swim - dt * 1.8); return; }
    if (G.hop) {
      G.hop.t -= dt;
      if (G.hop.t <= 0) landHop();
    } else if (G.holding) {
      var rate = RATES[Math.min(G.on, RATES.length - 1)];
      if (!G.full) {
        G.charge = Math.min(1, G.charge + rate * dt);
        if (G.charge >= 1) { G.full = true; G.overT = 0; game.audio.play('se_powerup', 0.4); }
      } else {
        G.overT += dt;
        if (Math.floor(G.overT * 16) % 3 === 0) game.audio.tone('B5', 0.03, { wave: 'square', volume: 0.03 });
        if (G.overT > 0.45) leap(0.28, real);
      }
    } else {
      G.idle += dt;
      if (real && G.idle > 3) {
        G.idle = 0;
        G.freeze = { t: 0.45, x: G.frogX, y: WATER_Y, real: true, idle: true };
      }
    }
    var targetCam = leafX(G.on);
    if (G.hop) targetCam = G.hop.x0;
    G.camX += (targetCam - G.camX) * Math.min(1, dt * 4);
  }

  // ── ATTRACT: ちょうどで離す成功1回 + 溜めすぎて脚がつる失敗1回 ─────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.8, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { newRun(); G.ready = 0; demo.step = 0; }
    if (!G.hop && !G.freeze && G.swim <= 0) {
      if (demo.step === 0 && cyc > 0.5) { G.holding = true; demo.step = 1; }
      if (demo.step === 1 && G.holding) {
        var need = (leafX(1) - leafX(0)) / RANGE;
        if (G.charge >= need) { leap(G.charge, false); demo.step = 2; }
      }
      if (demo.step === 2 && cyc > 2.6) { G.holding = true; demo.step = 3; }
    }
    demo.press = G.holding;
    advance(dt, false);
  }

  game.onPress(function (x, y) {
    if (G.scene !== 'PLAYING' || G.over) return;
    if (G.ready > 0 || G.hop || G.swim > 0 || G.freeze) {
      game.audio.tone('D3', 0.04, { wave: 'square', volume: 0.04 });
      return;
    }
    G.holding = true; G.charge = 0; G.full = false;
    game.audio.play('se_tap', 0.25);
    game.fx.burst(G.frogX, G.frogY + 30, { color: '#c8dcc8', count: 4, speed: 90 });
  });

  game.onRelease(function (x, y) {
    if (G.scene !== 'PLAYING') return;
    if (G.holding) {
      game.fx.burst(G.frogX, G.frogY + 30, { color: '#e8f4ff', count: 6, speed: 180 });
      leap(G.charge, true);
    }
  });

  game.onTap(function (x, y) {
    switch (G.scene) {
      case 'ATTRACT':
        game.audio.play('se_coin', 0.5);
        G.scene = 'PLAYING'; newRun();
        break;
      case 'RESULT':
        game.audio.play('se_tap', 0.3);
        G.scene = 'ATTRACT'; newRun(); demo.t = 0;
        break;
      default:
        break;
    }
  });

  function paintHud() {
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(LEAF, { l: i < G.count ? STYLE.main[0] : '#4a5a50', L: i < G.count ? '#a8c070' : '#5a6a60' }, 110 + i * 90, 90, 7, { anchor: 'center' });
    }
    for (var s = 0; s < SPLASH_MAX; s++) {
      game.draw.sprite(FROG_SIT, FROG_PAL, W - 100 - s * 90, 90, 5, { anchor: 'center', alpha: s < SPLASH_MAX - G.splash ? 1 : 0.2 });
    }
    label(G.count + ' / ' + NEEDED, W * 0.5, 190, 44, '#f4f0d8');
    var fr = Math.max(0, G.clock / TIME_LIMIT);
    game.draw.rect(80, 230, W - 160, 16, '#24382c', 0.6);
    game.draw.rect(80, 230, (W - 160) * fr, 16, G.clock < 4 ? STYLE.accent[1] : STYLE.accent[0]);
  }

  function paintScene() {
    paintPaddy();
    paintLeaves();
    paintFrog();
    if (G.freeze) {
      var k = 0.45 - G.freeze.t;
      game.draw.circle(G.freeze.x, G.freeze.y, 40 + k * 200, '#ffffff', 0.5);
      game.draw.circle(G.freeze.x, G.freeze.y, 30, '#ffffff', 0.9);
    }
  }

  game.onUpdate(function (dt) {
    switch (G.scene) {
      case 'ATTRACT':
        if (!G.leaves) newRun();
        stepDemo(dt);
        paintScene();
        paintGauge();
        game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
        label('PADDY LEAP', W * 0.5, H * 0.08, 80, STYLE.accent[0]);
        label('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.125, 36, '#f4f0d8');
        if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) label('► 100円 投入 ◄', W * 0.5, H * 0.95, 46, STYLE.accent[0]);
        else label('INSERT COIN', W * 0.5, H * 0.95, 38, '#f4f0d8');
        return;
      case 'RESULT':
        G.t += dt;
        paintScene();
        game.draw.rect(90, H * 0.2, W - 180, 500, '#24382c', 0.82);
        label(G.win ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.26, 100, G.win ? STYLE.accent[0] : STYLE.accent[1]);
        label(G.count + ' / ' + NEEDED, W * 0.5, H * 0.33, 64, '#f4f0d8');
        label('SCORE ' + G.score, W * 0.5, H * 0.38, 46, '#f4f0d8');
        label('PERFECT ' + G.perfect, W * 0.5, H * 0.42, 38, STYLE.accent[0]);
        if (G.record) label('NEW RECORD', W * 0.5, H * 0.46, 52, STYLE.accent[0]);
        else label('BEST ' + (game.best || 0), W * 0.5, H * 0.46, 40, '#f4f0d8');
        if (!G.win) label('あと' + (NEEDED - G.count) + '枚!', W * 0.5, H * 0.5, 46, STYLE.accent[1]);
        if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, '#f4f0d8');
        return;
      default:
        break;
    }

    if (G.over) {
      G.endT -= dt; G.t += dt;
      if (G.endT <= 0) {
        G.scene = 'RESULT';
        var st = { leaves: G.count, perfect: G.perfect, splash: G.splash };
        if (G.win) game.end.success(G.score, st); else game.end.failure(st);
      }
    } else if (G.ready > 0) {
      G.ready -= dt; G.t += dt;
      if (G.ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      advance(dt, true);
      if (!G.freeze && !G.over) {
        G.clock -= dt;
        if (G.clock <= 0) {
          G.clock = 0; G.holding = false;
          game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: STYLE.accent[1], size: 80 });
          closeRun(false);
        }
      }
    }

    paintScene();
    paintGauge();
    paintHud();
    if (G.ready > 0) label(G.ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.42, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 1],
    ], { tempo: 112, wave: 'triangle', volume: 0.07, loop: true, bass: true });
    G.scene = 'ATTRACT';
    newRun();
  });
})(game);
