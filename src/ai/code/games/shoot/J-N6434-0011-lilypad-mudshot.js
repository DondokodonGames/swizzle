// J-N6434-0011-lilypad-mudshot.js
// 浮き葉のどろ玉修行 — 引いて放つどろ玉で、流れる浮き葉の上の藁的を先回りして水面へ倒す
// 操作: 画面を押して手前へ引き、着弾リングを浮き葉の行き先に合わせて離すと、どろ玉が弧を描いて飛ぶ
// 終わり: 制限時間内に藁的を5枚倒せばCLEAR。TIME UPでGAME OVER
// @mechanic: slingshot
// @theme: lilypad_straw_target_practice
// 世界観: 田んぼ水路の見張り番を目指す見習いガエルが、流れる浮き葉に立てた藁の丸的をどろ玉で先回りして倒し、夕暮れの修行試験を突破する
// 残るもの: 正誤(CLEAR/GAME OVER) + 倒した的の数と命中率
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色・太い形
  var STYLE = { bg: ['#a8c8a0', '#6c9a82', '#3e6a5a'], main: ['#e8e2b8', '#5a4632'], accent: ['#f0a848', '#d8584a'] };
  var C = {
    sky: '#c8d8a8', pondTop: '#7aa892', pondBot: '#3e6a5a', ripple: '#a8ccb8',
    pad: '#5c8c3c', padDark: '#44702c', ink: '#2c2a22', cream: '#f4eecc',
    gold: '#f0c048', good: '#8cd06c', bad: '#d8584a', mud: '#7a5638', bank: '#8a7a52'
  };

  var TITLE = 'MUDSHOT POND';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var FROG_X = W / 2, FROG_Y = H * 0.80;
  var POND_TOP = H * 0.16, POND_BOT = H * 0.66;
  var MAX_PULL = 380;
  var LANES = [H * 0.25, H * 0.38, H * 0.51];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FROG_IDLE = [
    '..gg....gg..',
    '.gwkg..gwkg.',
    '.gggggggggg.',
    'gggggggggggg',
    'gg.rrrrrr.gg',
    'gggggggggggg',
    '.gyyyyyyyyg.',
    '.gg.gggg.gg.',
    'gg..g..g..gg'
  ];
  var FROG_PULL = [
    '............',
    '..gg....gg..',
    '.gwkg..gwkg.',
    'gggggggggggg',
    'gg.rrrrrr.gg',
    'gggggggggggg',
    'gyyyyyyyyyyg',
    'gg..gggg..gg',
    'g...g..g...g'
  ];
  var FROG_PAL = { g: '#6aa048', w: '#f4eecc', k: '#2c2a22', r: '#d8584a', y: '#e8e2a0' };
  var STRAW = [
    '..oooo..',
    '.oyyyyo.',
    'oyrrrryo',
    'oyrwwryo',
    'oyrwwryo',
    'oyrrrryo',
    '.oyyyyo.',
    '..oooo..',
    '...bb...',
    '...bb...'
  ];
  var STRAW_PAL = { o: '#8a6a3a', y: '#e8d088', r: '#d8584a', w: '#f4eecc', b: '#5a4632' };
  var STRAW_GOLD = { o: '#a07820', y: '#f8e070', r: '#f0a848', w: '#fff8d0', b: '#5a4632' };
  var RIVAL = ['.cc.', 'cccc', 'cccc', 'c..c'];

  var pads, shot, pull, hits, shots, timeLeft, phase, phaseT, hitFx, lastX, lastY, comboHit, reload;
  var demo = { t: 0, gx: FROG_X, gy: FROG_Y + 60, press: false, fired: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function makePads() {
    pads = [];
    for (var i = 0; i < LANES.length; i++) {
      var dir = i % 2 === 0 ? 1 : -1;
      for (var k = 0; k < 2; k++) {
        pads.push({
          x: W * (0.2 + k * 0.55) + i * 60, y: LANES[i], lane: i,
          vx: dir * (120 + i * 40), r: 86 - i * 6,
          up: true, gold: false, fall: 0, respawn: 0, ph: Math.random() * 6
        });
      }
    }
    pads[2].gold = true;
  }

  function initGame() {
    makePads();
    shot = null; pull = null; hits = 0; shots = 0; timeLeft = TIME_LIMIT;
    phase = 'ready'; phaseT = 0.8; hitFx = null; lastX = W / 2; lastY = H * 0.4;
    comboHit = 0; reload = 0;
  }

  function landingFor(sx, sy, cx, cy) {
    var dx = sx - cx, dy = sy - cy;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 40) return null;
    var p = Math.min(len, MAX_PULL) / MAX_PULL;
    var nx = dx / len, ny = dy / len;
    var dist = 220 + 980 * p;
    return { x: FROG_X + nx * dist, y: FROG_Y + ny * dist, p: p };
  }

  function fire(sx, sy, cx, cy) {
    var L = landingFor(sx, sy, cx, cy);
    if (!L) {
      game.audio.tone('C3', 0.08, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(FROG_X, FROG_Y - 60, { color: C.mud, count: 4, speed: 120 });
      return;
    }
    shots++;
    shot = { x0: FROG_X, y0: FROG_Y - 50, tx: L.x, ty: L.y, t: 0, dur: 0.38 + 0.34 * L.p };
    reload = 0.35;
    game.audio.play('se_jump', 0.4);
  }

  function landShot() {
    var hitPad = null;
    for (var i = 0; i < pads.length; i++) {
      var pd = pads[i];
      if (!pd.up) continue;
      var dx = pd.x - shot.tx, dy = pd.y - 30 - shot.ty;
      if (dx * dx + dy * dy < (pd.r + 10) * (pd.r + 10)) { hitPad = pd; break; }
    }
    lastX = shot.tx; lastY = shot.ty;
    if (hitPad) {
      hitPad.up = false; hitPad.fall = 1; hitPad.respawn = 1.3;
      var gain = hitPad.gold ? 2 : 1;
      hits += gain; comboHit++;
      hitFx = { x: hitPad.x, y: hitPad.y - 40, t: 0.3 };
      if (state === S.PLAYING) {
        game.feedback.good(hitPad.x, hitPad.y - 80, { text: hitPad.gold ? 'x2' : (comboHit >= 2 ? 'NICE' : 'GOOD'), color: hitPad.gold ? C.gold : C.good });
        if (hits >= 3 && hits - gain < 3) {
          game.fx.popup('あと' + Math.max(0, NEEDED - hits) + '枚!', W / 2, H * 0.62, { color: C.gold, size: 50 });
          game.audio.play('se_milestone', 0.5);
        }
      } else {
        game.fx.burst(hitPad.x, hitPad.y - 40, { color: C.gold, count: 10, speed: 260 });
      }
      hitPad.gold = false;
    } else {
      comboHit = 0;
      game.fx.burst(shot.tx, shot.ty, { color: C.ripple, count: 10, speed: 200 });
      if (state === S.PLAYING) game.feedback.bad(shot.tx, shot.ty, { text: 'MISS', shake: 4, volume: 0.25 });
    }
    shot = null;
  }

  function stepWorld(dt) {
    var speedUp = 1 + hits * 0.12;
    for (var i = 0; i < pads.length; i++) {
      var pd = pads[i];
      pd.x += pd.vx * speedUp * dt;
      if (pd.x > W + 120) pd.x = -120;
      if (pd.x < -120) pd.x = W + 120;
      pd.ph += dt * 2.4;
      if (pd.fall > 0) pd.fall = Math.max(0, pd.fall - dt * 1.4);
      if (!pd.up) {
        pd.respawn -= dt;
        if (pd.respawn <= 0) { pd.up = true; pd.gold = Math.random() < 0.2; }
      }
    }
    if (shot) {
      shot.t += dt;
      if (shot.t >= shot.dur) landShot();
    }
    if (reload > 0) reload -= dt;
    if (hitFx) { hitFx.t -= dt; if (hitFx.t <= 0) hitFx = null; }
  }

  function drawScene() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.14, C.pondTop], [0.68, C.pondBot], [0.7, C.bank], [1, '#5a4e36']]);
    game.draw.rect(0, 0, W, H, '#f0e8b0', 0.04 + 0.04 * Math.sin(el * 1.6));
    // 遠景: 対岸の葦と見物の半透明ガエル
    for (var r = 0; r < 12; r++) {
      var rx = r * 96 + 30, sway = Math.sin(el * 1.5 + r) * 8;
      game.draw.line(rx, H * 0.16, rx + sway, H * 0.11, '#5c7a40', 8);
    }
    for (var s = 0; s < 3; s++) {
      game.draw.sprite(RIVAL, { c: '#3e5a32' }, W * (0.18 + s * 0.32), H * 0.125 + Math.sin(el * 2 + s * 2) * 6, 12, { anchor: 'center', alpha: 0.35 });
    }
    // 水面の波紋
    for (var w = 0; w < 9; w++) {
      var wy = POND_TOP + 60 + w * 100, wx = ((el * 40 + w * 170) % (W + 200)) - 100;
      game.draw.rect(wx, wy, 120, 5, C.ripple, 0.35);
    }
    // 浮き葉と的
    for (var i = 0; i < pads.length; i++) {
      var pd = pads[i], bob = Math.sin(pd.ph) * 6;
      game.draw.circle(pd.x, pd.y + 10, pd.r, C.padDark);
      game.draw.circle(pd.x, pd.y + bob * 0.3, pd.r - 8, C.pad);
      game.draw.rect(pd.x - 4, pd.y - pd.r + 10, 8, pd.r - 10, C.padDark);
      if (pd.up) {
        var hl = hitFx && Math.abs(hitFx.x - pd.x) < 5;
        game.draw.sprite(STRAW, pd.gold ? STRAW_GOLD : STRAW_PAL, pd.x, pd.y - 50 + bob, 10, { anchor: 'center' });
        if (pd.gold) game.draw.circle(pd.x, pd.y - 60 + bob, 58, C.gold, 0.18 + 0.1 * Math.sin(el * 8));
        if (hl) game.draw.circle(pd.x, pd.y - 50, 70, '#ffffff', 0.5);
      } else if (pd.fall > 0) {
        game.draw.sprite(STRAW, STRAW_PAL, pd.x + (1 - pd.fall) * 60, pd.y - 10 + (1 - pd.fall) * 60, 10, { anchor: 'center', flipY: true, alpha: pd.fall });
      }
    }
    // 岸と発射台
    game.draw.rect(0, H * 0.70, W, 14, '#6a5a3a');
    var pulling = pull && pull.active;
    game.draw.sprite(pulling ? FROG_PULL : FROG_IDLE, FROG_PAL, FROG_X, FROG_Y + Math.sin(el * 3) * 5, 14, { anchor: 'center' });
    if (reload <= 0 && !shot) game.draw.circle(FROG_X, FROG_Y - 80, 20, C.mud);
    // 引き中の照準(着弾リング)
    if (pulling) {
      var L = landingFor(pull.sx, pull.sy, pull.cx, pull.cy);
      game.draw.line(FROG_X, FROG_Y - 70, pull.cx, pull.cy, C.cream, 6);
      if (L) {
        for (var d = 1; d <= 6; d++) {
          var f = d / 7;
          game.draw.circle(FROG_X + (L.x - FROG_X) * f, FROG_Y - 70 + (L.y - FROG_Y + 70) * f - Math.sin(Math.PI * f) * 120, 8, C.cream, 0.7);
        }
        game.draw.circle(L.x, L.y, 40, C.gold, 0.35);
        game.draw.circle(L.x, L.y, 12, C.gold);
      }
    }
    // 飛んでいるどろ玉
    if (shot) {
      var t = Math.min(1, shot.t / shot.dur);
      var gx = shot.x0 + (shot.tx - shot.x0) * t, gy = shot.y0 + (shot.ty - shot.y0) * t;
      game.draw.circle(gx, gy, 14, '#2c3a30', 0.35);
      game.draw.circle(gx, gy - Math.sin(Math.PI * t) * 180, 22 + Math.sin(Math.PI * t) * 10, C.mud);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.10, '#2c3a30', 0.55);
    txt(Math.min(hits, NEEDED) + ' / ' + NEEDED, W * 0.5, H * 0.045, 58, C.cream);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(80, H * 0.085, W - 160, 18, '#1e2a22');
    game.draw.rect(80, H * 0.085, (W - 160) * frac, 18, frac < 0.25 && Math.floor(game.time.elapsed * 6) % 2 ? C.bad : C.gold);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(STRAW, i < hits ? STRAW_PAL : { o: '#44503a', y: '#44503a', r: '#44503a', w: '#44503a', b: '#44503a' }, W * 0.08 + i * 50, H * 0.045, 4, { anchor: 'center' });
    }
  }

  function endRound(ok) {
    phase = 'stop'; phaseT = 0.45;
    var tx = lastX, ty = lastY;
    if (!ok) {
      for (var i = 0; i < pads.length; i++) if (pads[i].up) { tx = pads[i].x; ty = pads[i].y - 50; break; }
    }
    hitFx = { x: tx, y: ty, t: 0.45 };
    roundOk = ok;
    lastX = tx; lastY = ty;
  }
  var roundOk = false;

  function scoreOf() {
    var acc = shots > 0 ? Math.round(Math.min(hits, shots) / shots * 100) : 0;
    return hits * 100 + acc * 3 + Math.round(Math.max(0, timeLeft) * 20);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.3, W, H * 0.32, '#1e2a22', 0.78);
    txt(roundOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, roundOk ? C.gold : C.bad);
    txt(Math.min(hits, NEEDED) + ' / ' + NEEDED, W / 2, H * 0.44, 60, C.cream);
    var acc = shots > 0 ? Math.round(Math.min(hits, shots) / shots * 100) : 0;
    txt(acc + '%', W / 2, H * 0.50, 44, C.good);
    var sc = roundOk ? scoreOf() : 0;
    if (roundOk && sc > game.best) txt('NEW RECORD', W / 2, H * 0.56, 52, C.gold);
    else if (!roundOk) txt('あと' + (NEEDED - hits) + '枚!', W / 2, H * 0.56, 52, C.gold);
    else txt('BEST ' + game.best, W / 2, H * 0.56, 40, C.cream);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.fired = 0; }
    var slot = Math.floor(cyc / 1.6), local = cyc - slot * 1.6;
    var tgt = null;
    for (var i = 0; i < pads.length; i++) if (pads[i].up) { if (!tgt || pads[i].lane === slot % 3) tgt = pads[i]; }
    if (!tgt) return;
    var sx = FROG_X, sy = FROG_Y + 40;
    if (local < 0.15) { demo.gx = sx; demo.gy = sy; demo.press = local > 0.05; if (local > 0.05) pull = { active: true, sx: sx, sy: sy, cx: sx, cy: sy }; return; }
    if (local < 0.85) {
      var lead = (0.85 - local) + 0.55;
      var px = tgt.x + tgt.vx * (1 + hits * 0.12) * lead, py = tgt.y - 30;
      var dx = px - FROG_X, dy = py - FROG_Y, dist = Math.sqrt(dx * dx + dy * dy);
      var p = Math.max(0, Math.min(1, (dist - 220) / 980)), len = Math.max(50, p * MAX_PULL);
      var k = Math.min(1, (local - 0.15) / 0.4);
      var ex = sx - dx / dist * len * k, ey = sy - dy / dist * len * k;
      pull = { active: true, sx: sx, sy: sy, cx: ex, cy: ey };
      demo.gx = ex; demo.gy = ey; demo.press = true;
      return;
    }
    if (pull && pull.active && demo.fired !== slot + 1) {
      fire(pull.sx, pull.sy, pull.cx, pull.cy);
      demo.fired = slot + 1;
    }
    pull = null; demo.press = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play' && !(pull && pull.active) && !shot) game.audio.play('se_tap', 0.15);
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    if (reload > 0 || shot) { game.audio.tone('A2', 0.06, { wave: 'square', volume: 0.05 }); return; }
    pull = { active: true, sx: x, sy: y, cx: x, cy: y, t: 0 };
    game.audio.play('se_tap', 0.3);
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pull || !pull.active) return;
    pull.cx = x; pull.cy = y;
    if (Math.random() < 0.08) game.audio.tone(200 + Math.min(1, Math.hypot(pull.sx - x, pull.sy - y) / MAX_PULL) * 400, 0.04, { wave: 'triangle', volume: 0.04 });
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pull || !pull.active) return;
    pull.cx = x; pull.cy = y; pull.active = false;
    if (phase === 'play') fire(pull.sx, pull.sy, pull.cx, pull.cy);
    else game.audio.play('se_tap', 0.1);
    pull = null;
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!pads) initGame();
      stepWorld(dt);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 80, C.cream);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.105, 38, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 52, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 46, C.cream);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 44, C.cream);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepWorld(dt);
      if (pull && pull.active) {
        pull.t += dt;
        if (pull.t > 3) { pull.active = false; fire(pull.sx, pull.sy, pull.cx, pull.cy); pull = null; }
      }
      if (hits >= NEEDED && !shot) endRound(true);
      else if (timeLeft <= 0) { timeLeft = 0; if (shot) landShot(); if (hits >= NEEDED) endRound(true); else endRound(false); }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (roundOk) {
          game.feedback.good(lastX, lastY, { text: 'CLEAR', color: C.gold, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#fff8d0', 0.3);
        } else {
          game.feedback.bad(lastX, lastY, { text: 'TIME UP' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        var acc = shots > 0 ? Math.round(Math.min(hits, shots) / shots * 100) : 0;
        if (roundOk) game.end.success(scoreOf(), { targets: hits, shots: shots, accuracy: acc });
        else game.end.failure({ targets: hits, shots: shots, accuracy: acc });
        return;
      }
    }

    drawScene();
    drawHud();
    if (phase === 'stop' && hitFx) {
      game.draw.circle(hitFx.x, hitFx.y, 90 + (0.45 - phaseT) * 120, '#ffffff', 0.55);
      game.draw.sprite(STRAW, STRAW_PAL, hitFx.x, hitFx.y, 16, { anchor: 'center' });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.gold);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 2]
    ], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 2], ['C3', 2], ['E2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
