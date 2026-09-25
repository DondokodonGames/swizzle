// D-20092012-0057-blade-relic-clash.js
// ブレードレリッククラッシュ — 遺跡の守り手が放つ光弾を、素早い一線で斬り払って進む
// 操作: 飛んでくる光弾めがけて、指ですばやく線を引くように斬る(方向は問わない、速さが要)
// 終わり: 3体の守り手(計6発)を全て斬り払えば成功。1発でも斬れず被弾すれば失敗
// @mechanic: slice
// @theme: ruin_guardian_duel
// 世界観: 剣士が単身乗り込んだ遺跡の間。石像の守り手たちが放つ光弾を、剣の一閃で斬り払いながら奥へ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 斬り払えた発数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深みのあるシャドウ、金属光沢のハイライト、落ち着いた石×金の配色
  var C = {
    bg: '#1a1620', bg2: '#0c0a10', pillar: '#3a3444', pillarEdge: '#221e2a',
    hero: '#e8dcc0', heroEdge: '#8a7a5a', orb: '#7fe0ff', orbCore: '#ffffff',
    guardian: '#8a7050', guardianDown: '#3a3226', good: '#5fd47a', bad: '#ff4d5e',
    gold: '#ffd23f', white: '#ffffff', ink: '#0a0810', warn: '#ff5a3d',
  };

  var GAME_TITLE = 'BLADE RELIC';
  var TOTAL = 6;
  var ORDER = [0, 1, 2, 0, 1, 2];
  var HITS_TO_DOWN = 2;
  var HERO = { x: W * 0.5, y: H * 0.68 };
  var GUARD_X = [W * 0.2, W * 0.5, W * 0.8];
  var GUARD_Y = H * 0.24;
  var STRIKE_Y = H * 0.46;
  var PROJ_DUR = 1.35;
  var MIN_SPEED = 700;
  var STRIKE_R = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_SPR = ['.#.', '###', '.#.', '#.#'];
  var GUARD_SPR = ['###', '#.#', '###'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 3; i++) {
      game.draw.rect(W * (0.1 + i * 0.35), H * 0.12, 40, H * 0.5, C.pillarEdge);
      game.draw.rect(W * (0.1 + i * 0.35) + 6, H * 0.12, 28, H * 0.5, C.pillar);
    }
    ambient(t);
  }

  var guardHits, projIdx, proj, slicePts, done, endWait, finished, ready, hitStop, shake, sliced;

  function newProj(idx) {
    var g = ORDER[idx];
    return { g: g, t: 0, dur: PROJ_DUR + (Math.random() - 0.5) * 0.15, resolved: false };
  }

  function initGame() {
    guardHits = [0, 0, 0]; projIdx = 0; proj = newProj(0); slicePts = [];
    done = false; endWait = 0; finished = false; sliced = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function projPos(p) {
    var gx = GUARD_X[p.g];
    var t2 = Math.min(1, p.t / p.dur);
    return { x: gx + (HERO.x - gx) * t2, y: GUARD_Y + (STRIKE_Y - GUARD_Y) * t2, t: t2 };
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var tt = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    return Math.hypot(px - (ax + vx * tt), py - (ay + vy * tt));
  }

  function resolveSuccess() {
    if (!proj || proj.resolved || finished || done) return;
    proj.resolved = true;
    var g = proj.g;
    guardHits[g]++;
    sliced++;
    hitStop = 0.08;
    var pos = projPos(proj);
    game.feedback.good(pos.x, pos.y, { text: guardHits[g] >= HITS_TO_DOWN ? 'PERFECT' : 'GOOD', color: C.good });
    game.fx.burst(pos.x, pos.y, { color: C.orb, count: 16, speed: 340 });
    game.audio.play(guardHits[g] >= HITS_TO_DOWN ? 'se_break' : 'se_good', 0.4);
    if (sliced === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.14, { color: C.gold, size: 38 });
    if (sliced >= TOTAL) { ok = true; finished = true; finish(); return; }
    projIdx++;
    proj = newProj(projIdx);
  }

  function checkSlice(x, y, px, py) {
    if (state !== S.PLAYING || ready > 0 || done || finished || !proj || proj.resolved) return;
    var dist = Math.hypot(x - px, y - py);
    if (dist < 4) return;
    var speed = dist / (game.time.delta || 0.016);
    if (speed < MIN_SPEED) return;
    var pos = projPos(proj);
    if (distToSeg(pos.x, pos.y, px, py, x, y) < STRIKE_R) resolveSuccess();
  }

  var lastX = null, lastY = null;
  game.onPress(function(x, y) { lastX = x; lastY = y; game.audio.play('se_tap', 0.06); });
  game.onMove(function(x, y) {
    if (lastX !== null) checkSlice(x, y, lastX, lastY);
    lastX = x; lastY = y;
  });
  game.onRelease(function() { lastX = null; lastY = null; });
  game.onSwipe(function() {
    if (state === S.PLAYING && proj && !proj.resolved && ready <= 0 && !finished) {
      var pos = projPos(proj);
      if (pos.t > 0.15 && pos.t < 0.9) resolveSuccess();
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawGuardians(t) {
    for (var i = 0; i < GUARD_X.length; i++) {
      var down = guardHits[i] >= HITS_TO_DOWN;
      var bob = Math.sin(t * 2 + i * 2) * 5;
      game.draw.sprite(GUARD_SPR, { '#': down ? C.guardianDown : C.guardian }, GUARD_X[i], GUARD_Y + bob, 18, { anchor: 'center' });
    }
  }

  function drawHero(t) {
    var bob = Math.sin(t * 2.4) * 6;
    game.draw.sprite(HERO_SPR, { '#': C.hero }, HERO.x, HERO.y + bob, 24, { anchor: 'center' });
  }

  function drawProj(p) {
    if (!p || p.resolved) return;
    var pos = projPos(p);
    if (pos.t > 0.45) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, 50, C.warn, 0.4);
    }
    game.draw.circle(pos.x, pos.y, 26, C.orb);
    game.draw.circle(pos.x, pos.y, 10, C.orbCore);
  }

  var demo = { t: 0, gx: HERO.x, gy: HERO.y - 100, px: HERO.x, py: HERO.y - 100 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.7;
    if (cyc < dt || demo.t <= dt) { proj = newProj(projIdx % 3); }
    proj.t += dt;
    var pos = projPos(proj);
    if (pos.t < 0.55) { demo.px = demo.gx; demo.py = demo.gy; demo.gx = pos.x - 90; demo.gy = pos.y + 40; }
    else if (!proj.resolved) {
      proj.resolved = true;
      demo.px = pos.x - 140; demo.py = pos.y + 100;
      demo.gx = pos.x + 140; demo.gy = pos.y - 100;
      game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      projIdx++;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      drawGuardians(t);
      drawHero(t);
      stepDemo(dt);
      if (proj && !proj.resolved) drawProj(proj);
      game.draw.line(demo.px, demo.py, demo.gx, demo.gy, C.white, 6);
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawGuardians(t);
      drawHero(t);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(sliced + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - sliced) + '発!', W / 2, H * 0.16, 26, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(sliced, { sliced: sliced, total: TOTAL });
        else game.end.failure({ sliced: sliced, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      proj.t += dt;
      if (proj.t / proj.dur >= 1 && !proj.resolved) {
        proj.resolved = true;
        ok = false; finished = true; hitStop = 0.35; shake = 0.35;
        var pos = projPos(proj);
        game.feedback.bad(pos.x, pos.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawGuardians(t);
    drawHero(t);
    if (!finished) drawProj(proj);

    txt(sliced + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (sliced / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
