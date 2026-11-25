// J-N6434-0017-whirlcove-float-paddle.js
// 渦の入り江の浮き輪こぎ — 左手と右手で左右の水かきを別々にこぎ、渦に吸い込まれないよう舵を取って対岸へ進む
// 操作: 画面の左半分を押すと左の水かき(右へ曲がる)、右半分で右の水かき(左へ曲がる)。左右同時押しでまっすぐ強くこぐ
// 終わり: 対岸の桟橋に着けばCLEAR。渦の中心に3回吸い込まれるかTIME UPでGAME OVER
// @mechanic: coop_2zone
// @theme: whirlpool_cove_float_crossing
// 世界観: 入り江の薬草小屋で働く見習い薬師のハリネズミが、潮どきに渦がいくつも巻く水面を浮き輪で横切り、夕方までに対岸の桟橋へ薬草籠を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離の割合と同時こぎの回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル・白縁の丸い形・上下に情報を分ける
  var STYLE = { bg: ['#bfe6f5', '#a8c8f0', '#c8b8f0'], main: ['#ffffff', '#f5a8c0'], accent: ['#ffd878', '#f07888'] };
  var C = {
    water1: '#bfe6f5', water2: '#a8c8f0', water3: '#c8b8f0', foam: '#ffffff', pink: '#f5a8c0',
    yellow: '#ffd878', red: '#f07888', ink: '#4a4068', mint: '#a8f0d0', sand: '#f8e8c0', bank: '#b8e0a8', swirl: '#8aa8e0'
  };

  var TITLE = 'WHIRL COVE';
  var TIME_LIMIT = 18;
  var LIVES = 3;
  var GOAL = 4400;
  var PY = H * 0.62;
  var STROKE = 95, TURN = 0.26, RETAIN = 0.5;
  var PULL_R = 250, CORE_R = 58;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var HOG = [
    '.s.s.s.s.',
    'sssssssss',
    'ssffffffs',
    'sfwkffwkf',
    '.ffffnfff',
    '..fpppff.',
    '...fff...'
  ];
  var HOG_PAL = { s: '#8a6a58', f: '#f8d8c0', w: '#ffffff', k: '#4a4068', n: '#4a4068', p: '#f5a8c0' };
  var HUT = ['..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwddww.', '.wwddww.'];
  var HUT_PAL = { r: '#f07888', w: '#ffffff', d: '#8a6a58' };
  var GULL = ['w...w', '.w.w.', '..w..'];

  var pl, pools, camY, lives, timeLeft, dual, phase, phaseT, endOk, lastL, lastR, strokeL, strokeR, spin, focusX, focusY, best, halfShown;
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, cd: 0, side: 1, won: false };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function makePools() {
    pools = [];
    var xs = [0.35, 0.68, 0.28, 0.72, 0.5, 0.3, 0.7, 0.42, 0.62];
    for (var i = 0; i < xs.length; i++) {
      pools.push({ x: W * xs[i], y: -420 - i * 440, ph: i, dir: i % 2 ? 1 : -1, warn: 0 });
    }
  }

  function initGame() {
    pl = { x: W / 2, y: 0, vx: 0, vy: 0, hd: 0 };
    makePools();
    camY = 0; lives = LIVES; timeLeft = TIME_LIMIT; dual = 0; phase = 'ready'; phaseT = 0.8; endOk = false;
    lastL = -9; lastR = -9; strokeL = 0; strokeR = 0; spin = 0; focusX = W / 2; focusY = PY; best = 0; halfShown = false;
  }

  // 片側の水かき(実プレイ・デモ共通)。side: -1=左, 1=右
  function paddle(side, live) {
    var now = game.time.elapsed;
    if (spin > 0) return 'stuck';
    if (side < 0) { lastL = now; strokeL = 0.25; pl.hd += TURN; }
    else { lastR = now; strokeR = 0.25; pl.hd -= TURN; }
    var boost = STROKE;
    var both = Math.abs(lastL - lastR) < 0.16;
    if (both) { boost += 70; dual++; lastL = -9; lastR = -9; }
    pl.vx += Math.sin(pl.hd) * boost;
    pl.vy += -Math.cos(pl.hd) * boost;
    if (live) {
      if (both) game.feedback.good(W / 2, PY - 140, { text: 'NICE', color: C.mint, sound: 'se_jump', count: 8 });
      else game.audio.tone(side < 0 ? 'E5' : 'G5', 0.06, { wave: 'triangle', volume: 0.07 });
    }
    return both ? 'both' : 'one';
  }

  function stepWorld(dt, live) {
    var el = game.time.elapsed;
    if (strokeL > 0) strokeL -= dt;
    if (strokeR > 0) strokeR -= dt;
    var r = Math.pow(RETAIN, dt);
    pl.vx *= r; pl.vy *= r;
    // 横向きの潮
    pl.vx += Math.sin(el * 0.7) * 40 * dt;
    var caught = null;
    for (var i = 0; i < pools.length; i++) {
      var p = pools[i];
      p.ph += dt * 3 * p.dir;
      var dx = p.x - pl.x, dy = p.y - pl.y, d = Math.hypot(dx, dy);
      p.warn = d < PULL_R + 60 ? 1 : 0;
      if (d < PULL_R && d > 1) {
        var k = 1 - d / PULL_R;
        pl.vx += (dx / d * 520 * k + (-dy / d) * 260 * k * p.dir) * dt;
        pl.vy += (dy / d * 520 * k + (dx / d) * 260 * k * p.dir) * dt;
        if (live && Math.random() < dt * 4) game.audio.tone(300 - k * 120, 0.08, { wave: 'sine', volume: 0.05 });
      }
      if (d < CORE_R && spin <= 0) caught = p;
    }
    if (spin > 0) {
      spin -= dt;
      pl.hd += dt * 14;
      if (spin <= 0) {
        // 渦の下流へ押し戻される
        pl.y += 260; pl.vx = 0; pl.vy = 0; pl.hd = 0;
        pl.x = Math.max(120, Math.min(W - 120, pl.x + (pl.x < W / 2 ? 170 : -170)));
      }
    }
    pl.x += pl.vx * dt; pl.y += pl.vy * dt;
    if (pl.x < 90) { pl.x = 90; pl.vx = Math.abs(pl.vx) * 0.5; }
    if (pl.x > W - 90) { pl.x = W - 90; pl.vx = -Math.abs(pl.vx) * 0.5; }
    if (pl.y > 200) { pl.y = 200; pl.vy = 0; }
    pl.hd = Math.max(-1.3, Math.min(1.3, pl.hd));
    if (-pl.y > best) best = -pl.y;
    camY += (pl.y - camY) * Math.min(1, dt * 5);
    return caught;
  }

  function sy(wy) { return PY + (wy - camY); }

  function drawScene() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.water3], [0.5, C.water2], [1, C.water1]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(el * 1.4));
    // 水面のきらめき(スクロール)
    for (var i = 0; i < 16; i++) {
      var wy = ((i * 170 - camY * 1) % (H + 170) + H + 170) % (H + 170) - 80;
      var wx = (i * 263 + Math.sin(el + i) * 30) % W;
      game.draw.rect(wx, wy, 80, 8, C.foam, 0.5);
    }
    // 両岸
    game.draw.rect(0, 0, 50, H, C.bank);
    game.draw.rect(W - 50, 0, 50, H, C.bank);
    for (var b = 0; b < 12; b++) {
      var by = ((b * 190 - camY) % (H + 190) + H + 190) % (H + 190) - 60;
      game.draw.circle(40, by, 36, '#98d088');
      game.draw.circle(W - 40, by + 90, 36, '#98d088');
    }
    // 対岸の桟橋と小屋
    var gy = sy(-GOAL);
    if (gy > -300) {
      game.draw.rect(0, gy - 400, W, 400, C.sand);
      game.draw.rect(W / 2 - 140, gy - 20, 280, 40, '#c8a080');
      game.draw.sprite(HUT, HUT_PAL, W / 2, gy - 150 + Math.sin(el * 2) * 4, 22, { anchor: 'center' });
    }
    // 渦
    for (var k = 0; k < pools.length; k++) {
      var p = pools[k], py = sy(p.y);
      if (py < -300 || py > H + 300) continue;
      var warnOn = p.warn && Math.floor(el * 10) % 2 === 0;
      game.draw.circle(p.x, py, PULL_R, warnOn ? C.red : C.swirl, warnOn ? 0.2 : 0.12);
      for (var ring = 0; ring < 4; ring++) {
        var rr = PULL_R * (0.25 + ring * 0.22);
        for (var d = 0; d < 6; d++) {
          var a = p.ph * (1.6 - ring * 0.3) + d * Math.PI / 3 + ring;
          game.draw.circle(p.x + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.8, 10 - ring, C.foam, 0.8);
        }
      }
      game.draw.circle(p.x, py, CORE_R, C.ink, 0.5);
      game.draw.circle(p.x, py, CORE_R * 0.5, C.ink, 0.7);
    }
    // 鳥
    for (var g = 0; g < 2; g++) {
      var gx = ((el * 90 + g * 520) % (W + 200)) - 100;
      game.draw.sprite(GULL, { w: '#ffffff' }, gx, H * 0.2 + g * 70 + Math.sin(el * 3 + g) * 10, 8, { anchor: 'center' });
    }
    // 主役(浮き輪+水かき)
    var px = pl.x, ppy = sy(pl.y) + Math.sin(el * 3) * 5;
    var fx = Math.sin(pl.hd), fy = -Math.cos(pl.hd);
    var lx = px - fy * 95, ly = ppy + fx * 95, rx = px + fy * 95, ry = ppy - fx * 95;
    var sL = strokeL > 0 ? 40 : -10, sR = strokeR > 0 ? 40 : -10;
    game.draw.line(lx - fx * sL, ly - fy * sL, lx + fx * 30, ly + fy * 30, C.ink, 10);
    game.draw.line(rx - fx * sR, ry - fy * sR, rx + fx * 30, ry + fy * 30, C.ink, 10);
    game.draw.circle(px, ppy, 92, C.foam);
    game.draw.circle(px, ppy, 80, C.pink);
    for (var st = 0; st < 4; st++) {
      var sa = pl.hd + st * Math.PI / 2 + Math.PI / 4;
      game.draw.circle(px + Math.cos(sa) * 80, ppy + Math.sin(sa) * 80, 16, C.foam);
    }
    game.draw.circle(px, ppy, 48, C.water2);
    game.draw.sprite(HOG, HOG_PAL, px, ppy - 10, 11, { anchor: 'center', flipX: pl.hd > 0.1 });
    game.draw.circle(px + fx * 120, ppy + fy * 120, 12, C.yellow, 0.8);
  }

  function drawPads() {
    var el = game.time.elapsed;
    var y = H * 0.87;
    var lOn = strokeL > 0, rOn = strokeR > 0;
    game.draw.circle(W * 0.22, y, 120, '#ffffff', 0.9);
    game.draw.circle(W * 0.22, y, 104, lOn ? C.yellow : C.pink);
    game.draw.circle(W * 0.78, y, 120, '#ffffff', 0.9);
    game.draw.circle(W * 0.78, y, 104, rOn ? C.yellow : C.mint);
    // 水かきアイコン(曲がる向きの矢じり)
    game.draw.line(W * 0.22 - 40, y + 30, W * 0.22 + 30, y - 30, C.ink, 14);
    game.draw.line(W * 0.78 + 40, y + 30, W * 0.78 - 30, y - 30, C.ink, 14);
    game.draw.circle(W * 0.22 + 30, y - 30, 16, C.ink);
    game.draw.circle(W * 0.78 - 30, y - 30, 16, C.ink);
    game.draw.line(W / 2, H * 0.78, W / 2, H * 0.97, '#ffffff', 4 + Math.sin(el * 4) * 2);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.09, '#ffffff', 0.75);
    var pct = Math.min(100, Math.round(best / GOAL * 100));
    txt(pct + '%', W * 0.5, H * 0.035, 56, C.ink);
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(80 + i * 70, H * 0.035, 26, i < lives ? C.pink : '#d8d0e8');
      game.draw.circle(80 + i * 70, H * 0.035, 12, '#ffffff');
    }
    txt('x' + dual, W * 0.88, H * 0.035, 42, C.mint);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(50, H * 0.07, W - 100, 16, '#d8d0e8');
    game.draw.rect(50, H * 0.07, (W - 100) * frac, 16, frac < 0.25 ? C.red : C.yellow);
    // 進捗の小地図
    game.draw.rect(W - 40, H * 0.12, 12, H * 0.3, '#ffffff', 0.7);
    game.draw.circle(W - 34, H * 0.42 - H * 0.3 * Math.min(1, best / GOAL), 14, C.pink);
  }

  function scoreOf() { return 1000 + Math.round(timeLeft * 40) + dual * 20 + lives * 100; }

  function drawResult() {
    game.draw.rect(60, H * 0.28, W - 120, H * 0.25, '#ffffff', 0.9);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, endOk ? C.pink : C.red);
    var pct = Math.min(100, Math.round(best / GOAL * 100));
    txt(pct + '%   x' + dual, W / 2, H * 0.40, 46, C.ink);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.47, 54, C.pink);
    else if (!endOk) txt('あと' + Math.max(1, Math.round((GOAL - best) / 10)) + 'm!', W / 2, H * 0.47, 54, C.ink);
    else txt('BEST ' + game.best, W / 2, H * 0.47, 42, C.ink);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.cd = 0.3; pl.y = -1500; camY = pl.y; best = 1500; demo.won = false; }
    var c = stepWorld(dt, false);
    if (c) { spin = 0.8; }
    demo.cd -= dt;
    demo.press = demo.cd > 0.2;
    if (best >= GOAL) {
      if (!demo.won) { demo.won = true; game.fx.burst(pl.x, sy(pl.y), { color: C.pink, count: 24, speed: 380 }); }
      return;
    }
    // 次の渦を避ける目標向き
    var want = 0;
    for (var i = 0; i < pools.length; i++) {
      var p = pools[i], ahead = pl.y - p.y;
      if (ahead > -60 && ahead < 520) { want = (pl.x < p.x ? -0.5 : 0.5) * (1 - ahead / 700); break; }
    }
    if (demo.cd <= 0) {
      var err = want - pl.hd;
      var side = Math.abs(err) < 0.12 ? -demo.side : (err > 0 ? -1 : 1);
      demo.side = side;
      paddle(side, false);
      if (Math.abs(err) < 0.12 && demo.t % 2 < 1) { paddle(-side, false); }
      demo.gx = side < 0 ? W * 0.22 : W * 0.78; demo.gy = H * 0.87;
      demo.cd = 0.3;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') game.audio.play('se_tap', 0.1);
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || phase !== 'play') return;
    var side = x < W / 2 ? -1 : 1;
    var r = paddle(side, true);
    if (r === 'stuck') game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.05 });
    else game.fx.burst(x, y, { color: side < 0 ? C.pink : C.mint, count: 5, speed: 160 });
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!pl) initGame();
      stepDemo(dt);
      drawScene(); drawPads();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 90, C.pink);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.105, 40, C.ink);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.75, 52, C.red);
      else txt('INSERT COIN', W / 2, H * 0.75, 46, C.ink);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawPads(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.75, 44, C.ink);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      var c = stepWorld(dt, true);
      if (c) {
        lives--; spin = 0.8; focusX = c.x; focusY = sy(c.y);
        game.feedback.bad(c.x, sy(c.y) - 120, { text: 'MISS' });
        if (lives <= 0) { endOk = false; phase = 'stop'; phaseT = 0.5; }
      } else if (best >= GOAL) {
        endOk = true; phase = 'stop'; phaseT = 0.45; focusX = pl.x; focusY = sy(pl.y);
      } else if (timeLeft <= 0) {
        timeLeft = 0; endOk = false; phase = 'stop'; phaseT = 0.45; focusX = pl.x; focusY = sy(pl.y);
      }
      if (phase === 'play' && best >= GOAL / 2 && !halfShown) {
        halfShown = true;
        game.fx.popup('50%', W / 2, H * 0.30, { color: C.pink, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.pink, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#ffffff', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        var pct = Math.min(100, Math.round(best / GOAL * 100));
        if (endOk) game.end.success(scoreOf(), { progress: pct, dualStrokes: dual, lives: lives });
        else game.end.failure({ progress: pct, dualStrokes: dual });
        return;
      }
    }

    drawScene(); drawPads(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY, 110 + (0.5 - phaseT) * 160, '#ffffff', 0.5);
      game.draw.sprite(HOG, HOG_PAL, focusX, focusY, 18, { anchor: 'center' });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 110, C.pink);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
      ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1]
    ], { tempo: 126, wave: 'triangle', volume: 0.055, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
