// J-N6424-0041-moonlight-spire-hop.js
// ムーンライト・スパイア・ホップ — 月光で編まれた足場は明滅している。実体化した一瞬だけ跳び移って塔を登る
// 操作: 上の足場が明るく実体化した瞬間にタップして跳び移る(半透明のうちに跳ぶとすり抜けて戻される)
// 終わり: 8段登って巣に着けば成功。すり抜け3回、立っている足場の崩落、または13秒の時間切れで失敗
// @mechanic: timing_one_shot
// @theme: moonlit_tower_ascent
// 世界観: 月夜にだけ現れる光の塔で、足場は月光が固まっては消える幻。からくりフクロウの雛が、足元が崩れる前に実体化した足場へ跳び移り、塔頂の巣へ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数とPERFECT数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + 疑似グロー(半透明の重ね描き)、点滅が命
  var STYLE = { bg: ['#07061a', '#1a0f3d', '#2b1560'], main: ['#29f3ff', '#ff4fd8', '#f4f4ff'], accent: ['#fff35c', '#ff3b5c'] };

  var TITLE = 'MOON SPIRE';
  var TIME_LIMIT = 13;
  var NEEDED = 8;
  var LIVES = 3;
  var STEP_H = 270;
  var BASE_Y = H * 0.62;
  var PLAT_W = 250;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var OWL_A = ['..o....o..', '..oooooo..', '.oyyooyyo.', '.oykoykyo.', '.oyyooyyo.', 'woooaaooow', 'wwoffffoww', '.wofffffo.', '..offffo..', '...a..a...'];
  var OWL_B = ['..o....o..', '..oooooo..', '.oyyooyyo.', '.oykoykyo.', 'woyyooyyow', 'wwooaaooww', '..offffo..', '..offffo..', '..offffo..', '...a..a...'];
  var OWL_FALL = ['w........w', 'ww.o..o.ww', '.woooooow.', '.oxyooxyo.', '.oyyooyyo.', '..ooaaoo..', '..offffo..', '..offffo..', '...offo...', '...a..a...'];
  var OWL_PAL = { o: '#8a7cff', y: '#fff35c', k: '#07061a', a: '#ffb84f', w: '#29f3ff', f: '#d8d2ff', x: '#ff3b5c' };
  var NEST = ['b........b', 'bb.eeee.bb', '.bbbbbbbb.', '..bbbbbb..'];
  var NEST_PAL = { b: '#ff4fd8', e: '#fff35c' };
  var WING = ['w......w', 'ww....ww', 'www..www', '.wwwwww.', '..wwww..'];

  var g = null;
  var demo = { t: 0, gx: W / 2, gy: H * 0.82, press: false, pressT: 0, tries: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x + 2, y + 2, { size: size, color: color, bold: true, align: 'center' });
  }

  function platX(i) { return i % 2 === 0 ? W * 0.36 : W * 0.64; }

  function newClimb(isDemo) {
    return {
      demo: isDemo, level: 0, lives: LIVES, perfect: 0, streak: 0, score: 0,
      phase: game.random(0, 1), period: 1.05, decay: 2.8, decayMax: 2.8,
      jump: null, cam: 0, camT: 0, hitStop: 0, hit: null, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, milestone: false, warned: false
    };
  }

  // materialization of the next foothold: 0 = ghost, 1 = fully solid (peak of the cycle)
  function solidity() {
    var p = g.phase % 1;
    return Math.max(0, 1 - Math.abs(p - 0.5) * 2.2);
  }

  function tryJump() {
    if (g.jump || g.over || g.hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    var m = solidity();
    game.audio.play('se_jump', 0.3);
    var fromX = platX(g.level), toX = platX(g.level + 1);
    if (m >= 0.55) {
      var perfect = m >= 0.86;
      g.jump = { t: 0, dur: 0.28, fromX: fromX, toX: toX, ok: true, perfect: perfect };
    } else {
      g.jump = { t: 0, dur: 0.5, fromX: fromX, toX: toX, ok: false };
    }
  }

  function land() {
    var j = g.jump;
    g.jump = null;
    if (j.ok) {
      g.level++;
      g.camT = g.level * STEP_H;
      g.streak++;
      if (j.perfect) g.perfect++;
      var pts = (j.perfect ? 200 : 100) * (g.streak >= 3 ? 2 : 1);
      g.score += pts;
      var ly = BASE_Y - STEP_H;
      if (!g.demo) {
        game.feedback.good(platX(g.level), ly - 120, { text: j.perfect ? 'PERFECT' : 'GOOD', color: j.perfect ? STYLE.accent[0] : STYLE.main[0] });
        if (!g.milestone && g.level >= 4) { g.milestone = true; game.fx.popup(g.level + ' / ' + NEEDED, W / 2, H * 0.3, { color: STYLE.main[1], size: 64 }); game.audio.play('se_milestone', 0.4); }
      } else {
        game.audio.tone(j.perfect ? 'E6' : 'C6', 0.08, { wave: 'square', volume: 0.05 });
      }
      g.period = Math.max(0.72, 1.05 - g.level * 0.05);
      g.phase = game.random(0, 0.25);
      g.decayMax = Math.max(1.7, 2.8 - g.level * 0.16);
      g.decay = g.decayMax;
      g.warned = false;
      if (g.level >= NEEDED && !g.demo) {
        g.over = true; g.win = true; g.hitStop = 0.5; g.hit = 'nest';
        game.fx.burst(W / 2, BASE_Y - STEP_H - 80, { color: STYLE.accent[0], count: 40, speed: 600 });
      }
    } else {
      g.streak = 0;
      g.hit = 'ghost'; g.hitStop = 0.4;
      if (!g.demo) {
        g.lives--;
        game.feedback.bad(platX(g.level + 1), BASE_Y - STEP_H - 40, { text: 'MISS' });
        if (g.lives <= 0) { g.over = true; g.win = false; g.hitStop = 0.6; }
      } else {
        game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.06 });
      }
    }
  }

  function step(dt) {
    g.cam += (g.camT - g.cam) * Math.min(1, dt * 10);
    if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) { if (g.hit !== 'nest') g.hit = null; if (g.over) g.endWait = 0.6; }
      return;
    }
    if (g.over) return;
    g.phase += dt / g.period;
    if (g.jump) {
      g.jump.t += dt;
      if (g.jump.t >= g.jump.dur) land();
      return;
    }
    g.decay -= dt;
    if (g.decay < 0.8 && !g.warned) { g.warned = true; game.audio.tone('A2', 0.1, { wave: 'sawtooth', volume: 0.06 }); }
    if (g.decay <= 0) {
      if (g.demo) { g.decay = g.decayMax; return; }
      g.over = true; g.win = false; g.hit = 'floor'; g.hitStop = 0.6;
      game.audio.play('se_break', 0.4);
      game.feedback.bad(platX(g.level), BASE_Y - 30, { text: 'MISS' });
      return;
    }
    if (g.demo) {
      var m = solidity();
      var p = g.phase % 1;
      var wantMiss = demo.tries % 4 === 3;
      if ((!wantMiss && m >= 0.9 && p < 0.5) || (wantMiss && m > 0.2 && m < 0.35 && p < 0.5)) {
        demo.tries++;
        demo.press = true; demo.pressT = 0.2;
        tryJump();
      }
    }
  }

  function drawPlatform(x, y, alpha, core, flash) {
    var col = core ? STYLE.main[2] : STYLE.main[0];
    game.draw.rect(x - PLAT_W / 2 - 10, y - 16, PLAT_W + 20, 32, STYLE.main[0], alpha * 0.25);
    game.draw.rect(x - PLAT_W / 2, y - 8, PLAT_W, 16, col, alpha);
    game.draw.line(x - PLAT_W / 2, y + 14, x + PLAT_W / 2, y + 14, STYLE.main[1], 3);
    if (flash) game.draw.rect(x - PLAT_W / 2 - 30, y - 40, PLAT_W + 60, 80, '#ffffff', 0.7);
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var s = 0; s < 40; s++) {
      var sx = (s * 263) % W;
      var sy = ((s * 491 + g.cam * 0.2) % (H * 0.9));
      game.draw.rect(sx, sy, 5, 5, '#ffffff', 0.3 + 0.3 * Math.sin(t * 3 + s));
    }
    game.draw.circle(W * 0.8, H * 0.16, 80, '#f4f4ff', 0.9);
    game.draw.circle(W * 0.8, H * 0.16, 120 + Math.sin(t * 2) * 8, STYLE.main[1], 0.15);
    // tower spine (neon grid scrolling with the camera)
    for (var k = -2; k < 12; k++) {
      var yy = BASE_Y + 60 - k * STEP_H + (g.cam % STEP_H);
      game.draw.line(W * 0.2, yy, W * 0.8, yy, STYLE.main[1], 2);
    }
    game.draw.line(W * 0.2, 0, W * 0.2, H, STYLE.main[1], 3);
    game.draw.line(W * 0.8, 0, W * 0.8, H, STYLE.main[1], 3);
    game.draw.rect(0, 0, W, H, STYLE.main[1], 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawTower() {
    var t = game.time.elapsed;
    var offset = g.cam - g.level * STEP_H;
    // past footholds (dissolved)
    for (var i = Math.max(0, g.level - 2); i < g.level; i++) {
      drawPlatform(platX(i), BASE_Y + (g.level - i) * STEP_H + offset, 0.12, false, false);
    }
    // current foothold with decay bar + cracks telegraph
    var curY = BASE_Y + offset;
    var decayFrac = Math.max(0, g.decay / g.decayMax);
    var flick = g.decay < 0.8 && Math.floor(t * 12) % 2 === 0;
    if (!(g.hit === 'floor' && g.hitStop <= 0)) drawPlatform(platX(g.level), curY, flick ? 0.4 : 1, true, g.hit === 'floor' && g.hitStop > 0);
    game.draw.rect(platX(g.level) - PLAT_W / 2, curY + 26, PLAT_W * decayFrac, 8, flick ? STYLE.accent[1] : STYLE.accent[0]);
    // next foothold: materializes and dissolves
    if (g.level < NEEDED) {
      var m = solidity();
      var nx = platX(g.level + 1), ny = BASE_Y - STEP_H + offset;
      drawPlatform(nx, ny, 0.12 + m * 0.88, m >= 0.86, g.hit === 'ghost' && g.hitStop > 0);
      if (m >= 0.86) game.draw.circle(nx, ny, 150, STYLE.accent[0], 0.18);
      for (var j = 2; j <= 3 && g.level + j <= NEEDED; j++) drawPlatform(platX(g.level + j), BASE_Y - STEP_H * j + offset, 0.1, false, false);
    }
    var nestY = BASE_Y - (NEEDED - g.level) * STEP_H + offset - 70;
    if (nestY > -100) {
      if (g.hit === 'nest') game.draw.circle(platX(NEEDED), nestY, 140, '#ffffff', 0.5);
      game.draw.sprite(NEST, NEST_PAL, platX(NEEDED), nestY + Math.sin(t * 3) * 5, 18, { anchor: 'center' });
    }
    // owl
    var ox = platX(g.level), oy = curY - 90;
    var art = Math.floor(t * 5) % 2 ? OWL_A : OWL_B;
    if (g.jump) {
      var u = Math.min(1, g.jump.t / g.jump.dur);
      if (g.jump.ok) {
        ox = g.jump.fromX + (g.jump.toX - g.jump.fromX) * u;
        oy = curY - 90 - STEP_H * u - Math.sin(u * Math.PI) * 90;
      } else {
        var up = u < 0.5 ? u * 2 : (1 - u) * 2;
        ox = g.jump.fromX + (g.jump.toX - g.jump.fromX) * up * 0.8;
        oy = curY - 90 - STEP_H * up;
        art = u < 0.5 ? OWL_A : OWL_FALL;
      }
    }
    if (g.hit === 'floor' && g.hitStop <= 0.3 && g.over) { oy += 200; art = OWL_FALL; }
    if (g.hit === 'ghost' || g.hit === 'floor') art = OWL_FALL;
    game.draw.circle(ox, oy + 10, 70, STYLE.main[0], 0.12);
    game.draw.sprite(art, OWL_PAL, ox + Math.sin(t * 2.3) * 4, oy + Math.cos(t * 3.1) * 5, 14, { anchor: 'center' });
  }

  function drawPad() {
    var t = game.time.elapsed;
    var m = g.level < NEEDED ? solidity() : 0;
    game.draw.circle(W / 2, H * 0.84, 140, STYLE.main[0], 0.12 + m * 0.3);
    game.draw.circle(W / 2, H * 0.84, 110, STYLE.bg[1], 0.9);
    game.draw.sprite(WING, { w: m >= 0.86 ? STYLE.accent[0] : STYLE.main[0] }, W / 2, H * 0.84 + Math.sin(t * 4) * 5, 16, { anchor: 'center' });
  }

  function drawHud() {
    txt(g.level + ' / ' + NEEDED, W / 2, 100, 64, STYLE.main[0]);
    // altimeter on the right edge
    game.draw.rect(W - 60, 260, 16, H * 0.5, '#2b1560');
    game.draw.rect(W - 60, 260 + H * 0.5 * (1 - g.level / NEEDED), 16, H * 0.5 * g.level / NEEDED, STYLE.main[1]);
    for (var l = 0; l < LIVES; l++) game.draw.sprite(WING, { w: l < g.lives ? STYLE.main[0] : '#3a3060' }, 80 + l * 90, 70, 7, { anchor: 'center' });
    if (g.streak >= 3) txt('x2', W - 110, 100, 52, STYLE.accent[0]);
    var frac = Math.max(0, g.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 205, W - 120, 14, '#2b1560');
    game.draw.rect(60, 205, (W - 120) * frac, 14, g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? STYLE.accent[1] : STYLE.main[0]);
  }

  function initGame() {
    g = newClimb(false);
  }

  function finishClimb() {
    state = S.RESULT;
    game.audio.stopBgm();
    var stats = { floors: g.level, perfect: g.perfect, lives: g.lives };
    if (g.win) {
      g.score += g.lives * 150 + Math.round(g.timeLeft * 20);
      game.audio.play('se_success', 0.5);
      game.end.success(g.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1]], { tempo: 160, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 2], ['F2', 2]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (g.ready > 0) { game.audio.play('se_tap', 0.1); return; }
    tryJump();
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!g || !g.demo) g = newClimb(true);
      demo.t += dt;
      var cyc = demo.t % 6.5;
      if (cyc < dt || demo.t <= dt) { g = newClimb(true); demo.tries = 0; }
      if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
      if (g.level >= NEEDED - 2) g = newClimb(true);
      step(dt);
      drawWorld();
      drawTower();
      drawPad();
      game.draw.hand(W / 2 + 30, H * 0.84 + (demo.press ? 0 : 30), { press: demo.press, scale: 14 });
      txt(TITLE, W / 2 + Math.sin(t * 1.2) * 6, H * 0.08, 84, STYLE.main[1]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 36, STYLE.main[0]);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, STYLE.main[0]);
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawTower();
      game.draw.rect(0, 0, W, H, STYLE.bg[0], 0.5);
      if (g.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.accent[0], count: 5, speed: 300 });
        txt('CLEAR', W / 2, H * 0.3, 120, STYLE.accent[0]);
      } else {
        txt(g.lives <= 0 || g.hit === 'floor' ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.3, 100, STYLE.accent[1]);
        txt('あと' + (NEEDED - g.level) + '段!', W / 2, H * 0.37, 60, STYLE.main[0]);
      }
      txt(g.level + ' / ' + NEEDED, W / 2, H * 0.45, 64, STYLE.main[2]);
      txt('PERFECT ' + g.perfect, W / 2, H * 0.5, 44, STYLE.main[1]);
      txt('SCORE ' + g.score, W / 2, H * 0.55, 48, STYLE.main[2]);
      if (g.win && g.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.6, 52, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.6, 40, STYLE.main[0]);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, STYLE.main[0]);
      return;
    }
    // PLAYING
    if (g.ready > 0) {
      g.ready -= dt;
      g.phase += dt / g.period;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!g.over) {
        g.timeLeft -= dt;
        if (g.timeLeft <= 0) {
          g.timeLeft = 0; g.over = true; g.win = false; g.hitStop = 0.45; g.jump = null;
          game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (g.over && g.endWait > 0) {
        g.endWait -= dt;
        if (g.endWait <= 0) { finishClimb(); return; }
      }
    }
    drawWorld();
    drawTower();
    drawPad();
    drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 1], ['B4', 0.5], ['C5', 0.5], ['A4', 1], ['E4', 1]], { tempo: 100, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    g = newClimb(true);
    demo.t = 0;
  });
})(game);
