// J-N6434-0049-comet-fair-star-swap.js
// 彗星市の星とりっこ — パチンコで星玉を放って向こう岸の星籠をゆらし星を奪い、飛んでくる彗星玉は撃ち落として自分の星を守る
// 操作: 押したまま手前に引いて狙いをつけ、離すと引いた向きの反対へ星玉が飛ぶ(強く引くほど遠くへ)
// 終わり: 星を10個ためればCLEAR。手持ちの星が0になる/時間切れでGAME OVER
// @mechanic: slingshot
// @theme: comet_fair_star_swap
// 世界観: 百年に一度の彗星市の夜、星見やぐらの見習い番が、向こうの丘をめぐるからくり鶴の星籠を星玉でゆらして星を分けてもらい、鶴が投げ返す彗星玉は撃ち落として自分の星壺を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + ためた星の数と撃ち落とした彗星玉の数
// スタイル: MODE7 PSEUDO
var STYLE = { bg: ['#0b0f2e', '#3a2a6e'], main: ['#6e5acf', '#2b2360', '#f0e6ff'], accent: ['#ffd84a', '#ff5f7e'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    sky1: '#0b0f2e', sky2: '#3a2a6e', floorA: '#6e5acf', floorB: '#2b2360', pale: '#f0e6ff', gold: '#ffd84a', pink: '#ff5f7e',
    ink: '#070920', white: '#ffffff', teal: '#4ae0d0', wood: '#8a5a3a',
  };

  var GAME_TITLE = 'STAR SWAP';
  var TIME_LIMIT = 16;
  var NEEDED = 10;
  var START_STARS = 3;
  var HORIZON = H * 0.22;
  var SX = W * 0.5, SY = H * 0.8;
  var MAX_PULL = 300;
  var FLIGHT = 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CRANE_A = [
    '.......rr...',
    '......wwwk..',
    '.....ww.....',
    'w...www.....',
    'wwwwwwww....',
    '.wwwwwww....',
    '...w..w.....',
  ];
  var CRANE_B = [
    '.......rr...',
    '......wwwk..',
    'ww...ww.....',
    '.wwwwww.....',
    '..wwwwww....',
    '..wwwwww....',
    '...w..w.....',
  ];
  var CAGE = ['..gggg..', '.g.yy.g.', 'g.yyyy.g', 'g.yyyy.g', '.g.yy.g.', '..gggg..'];
  var STAR = ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'];
  var COMET = ['..pp', '.ppp', 'pppw', '.pp.'];
  var JAR = ['.bbbb.', 'b....b', 'byyyyb', 'byyyyb', 'byyyyb', '.bbbb.'];
  var KEEPER = ['..hh..', '.hhhh.', '.fkfk.', '..ff..', '.tttt.', 'tttttt', '.t..t.'];

  var stars, shots, comets, pops, crane, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var aiming, pullX, pullY, volleyT, intercepts, lost, nextMs;

  function initGame() {
    stars = START_STARS; shots = []; comets = []; pops = [];
    crane = { x: W * 0.5, dir: 1, sp: 230, y: H * 0.3, knock: 0 };
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null; finished = false; ok = false; endWait = 0;
    aiming = false; pullX = SX; pullY = SY; volleyT = 2.6; intercepts = 0; lost = 0; nextMs = 6;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 奥行き: 画面のyから見かけの大きさを出す(地平線に近いほど小さい)
  function depthScale(y) { return Math.max(0.35, Math.min(1.2, (y - HORIZON) / (SY - HORIZON))); }

  function landingFor(px, py) {
    var dx = SX - px, dy = SY - py;
    var len = Math.min(MAX_PULL, Math.hypot(dx, dy));
    var ang = Math.atan2(dy, dx);
    return { x: SX + Math.cos(ang) * len * 3.4, y: SY + Math.sin(ang) * len * 3.4, len: len };
  }

  function shoot(px, py, demoMode) {
    var L = landingFor(px, py);
    if (L.len < 40) { game.audio.play('se_tap', 0.1); return; }
    shots.push({ tx: L.x, ty: L.y, t: 0 });
    game.audio.play('se_jump', 0.3);
  }

  function launchComet(prog) {
    comets.push({ fx: crane.x, fy: crane.y + 20, t: -0.7, dur: 1.6 - prog * 0.3, x: crane.x, y: crane.y, hit: false });
    game.audio.tone('D5', 0.3, { wave: 'sawtooth', volume: 0.05, slide: -400 });
  }

  function jarPos() { return { x: W * 0.8, y: H * 0.86 }; }

  function resolveShot(sh, demoMode) {
    // 彗星玉を撃ち落とす
    for (var c = 0; c < comets.length; c++) {
      var cm = comets[c];
      if (cm.t <= 0 || cm.hit) continue;
      if (Math.hypot(cm.x - sh.tx, cm.y - sh.ty) < 110 * depthScale(cm.y) + 40) {
        cm.hit = true; intercepts++; stars++;
        game.feedback.good(cm.x, cm.y - 50, { text: 'NICE', color: C.teal, count: 12, sound: 'se_break', volume: 0.35 });
        checkWin(demoMode, { x: cm.x, y: cm.y });
        return;
      }
    }
    // 星籠をゆらす
    if (Math.hypot(crane.x - sh.tx, crane.y + 40 - sh.ty) < 120) {
      var gain = crane.knock <= 0 ? 2 : 1;
      stars += gain; crane.knock = 0.5;
      for (var p = 0; p < gain; p++) pops.push({ x: crane.x, y: crane.y + 40, t: 0, d: 0.7 + p * 0.15 });
      game.audio.play('se_coin', 0.35);
      game.feedback.good(crane.x, crane.y - 60, { text: gain === 2 ? 'x2' : 'GOOD', color: C.gold, count: 14 });
      checkWin(demoMode, { x: crane.x, y: crane.y });
      return;
    }
    game.feedback.bad(sh.tx, sh.ty, { text: 'MISS', shake: 4, flashColor: '#6e5acf' });
  }

  function checkWin(demoMode, at) {
    if (!demoMode && stars >= nextMs && stars < NEEDED) { nextMs += 3; game.audio.play('se_milestone', 0.4); game.fx.popup(stars + '', W / 2, H * 0.5, { color: C.gold, size: 70 }); }
    if (!demoMode && stars >= NEEDED) { focus = { jar: true }; hitStop = 0.45; pendingEnd = 'clear'; finished = true; }
    if (demoMode && stars >= NEEDED) stars = START_STARS;
  }

  function stepWorld(dt, prog, demoMode) {
    crane.x += crane.dir * crane.sp * (1 + prog * 0.5) * dt;
    if (crane.x > W * 0.85) { crane.x = W * 0.85; crane.dir = -1; }
    if (crane.x < W * 0.15) { crane.x = W * 0.15; crane.dir = 1; }
    if (crane.knock > 0) crane.knock -= dt;
    volleyT -= dt;
    if (volleyT <= 0) { launchComet(prog); volleyT = 3.2 - prog * 1.0; }
    for (var s = shots.length - 1; s >= 0; s--) {
      shots[s].t += dt;
      if (shots[s].t >= FLIGHT) { var sh = shots[s]; shots.splice(s, 1); resolveShot(sh, demoMode); }
    }
    var jp = jarPos();
    for (var c = comets.length - 1; c >= 0; c--) {
      var cm = comets[c];
      cm.t += dt;
      if (cm.hit) { comets.splice(c, 1); continue; }
      if (cm.t < 0) continue;
      var k = Math.min(1, cm.t / cm.dur);
      cm.x = cm.fx + (jp.x - cm.fx) * k;
      cm.y = cm.fy + (jp.y - cm.fy) * k * k;
      if (k >= 1) {
        comets.splice(c, 1);
        stars--; lost++;
        if (demoMode) { game.feedback.bad(jp.x, jp.y - 80, { text: 'MISS', shake: 4 }); if (stars <= 0) stars = START_STARS; continue; }
        if (stars <= 0) {
          stars = 0; focus = { comet: { x: jp.x, y: jp.y } }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
          game.audio.play('se_break', 0.4);
        } else {
          game.feedback.bad(jp.x, jp.y - 80, { text: 'MISS' });
        }
      }
    }
    for (var p = pops.length - 1; p >= 0; p--) {
      pops[p].t += dt;
      if (pops[p].t >= pops[p].d) pops.splice(p, 1);
    }
  }

  function drawBg(pulse) {
    game.draw.gradient(0, HORIZON, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.pale, pulse);
    for (var s = 0; s < 18; s++) {
      var tw = 0.3 + 0.6 * Math.abs(Math.sin(game.time.elapsed * 1.5 + s));
      game.draw.circle((s * 211) % W, 30 + (s * 53) % (HORIZON - 40), 4, C.pale, tw);
    }
    // 疑似回転拡大の床: 奥ほど圧縮された帯
    var scroll = game.time.elapsed * 0.6;
    for (var y = HORIZON; y < H; y += 4) {
      var z = 1 / ((y - HORIZON) / (H - HORIZON) + 0.05);
      var band = Math.floor(z * 1.2 + scroll) % 2;
      game.draw.rect(0, y, W, 4, band ? C.floorA : C.floorB);
    }
    game.draw.gradient(HORIZON, HORIZON + 160, [[0, 'rgba(58,42,110,0.9)'], [1, 'rgba(58,42,110,0)']]);
    // 奥の丘
    game.draw.rect(0, HORIZON - 30, W, 30, C.floorB);
  }

  function drawCrane() {
    var sc = depthScale(crane.y);
    var bob = Math.sin(game.time.elapsed * 3) * 8;
    var shake = crane.knock > 0 ? Math.sin(game.time.elapsed * 50) * 14 : 0;
    game.draw.circle(crane.x, crane.y + 110, 70, C.ink, 0.35);
    game.draw.sprite(Math.floor(game.time.elapsed * 4) % 2 ? CRANE_A : CRANE_B, { r: C.pink, w: C.pale, k: C.ink }, crane.x, crane.y - 40 + bob, 13 * sc + 4, { anchor: 'center', flipX: crane.dir < 0 });
    var blink = Math.floor(game.time.elapsed * 4) % 2 === 0;
    if (blink) game.draw.circle(crane.x + shake, crane.y + 45 + bob, 80, C.white, 0.18);
    game.draw.sprite(CAGE, { g: C.wood, y: C.gold }, crane.x + shake, crane.y + 45 + bob, 14, { anchor: 'center' });
    // 発射前の予告線
    if (volleyT < 0.7) {
      var jp = jarPos();
      var bl = Math.floor(game.time.elapsed * 14) % 2 === 0;
      for (var i = 1; i < 8; i++) {
        var k = i / 8;
        game.draw.circle(crane.x + (jp.x - crane.x) * k, crane.y + (jp.y - crane.y) * k * k, 10, C.pink, bl ? 0.8 : 0.3);
      }
    }
  }

  function drawProjectiles() {
    for (var c = 0; c < comets.length; c++) {
      var cm = comets[c];
      if (cm.t < 0) continue;
      var sc = depthScale(cm.y);
      game.draw.circle(cm.x, cm.y, 60 * sc, C.pink, 0.35);
      game.draw.sprite(COMET, { p: C.pink, w: C.white }, cm.x, cm.y, 16 * sc + 4, { anchor: 'center' });
    }
    for (var s = 0; s < shots.length; s++) {
      var sh = shots[s];
      var k = sh.t / FLIGHT;
      var x = SX + (sh.tx - SX) * k;
      var y = SY + (sh.ty - SY) * k - Math.sin(k * Math.PI) * 140;
      var sc = depthScale(y);
      game.draw.circle(x, y, 26 * sc, C.gold);
      game.draw.circle(sh.tx, sh.ty, 30 * depthScale(sh.ty), C.gold, 0.25);
    }
    for (var p = 0; p < pops.length; p++) {
      var pp = pops[p];
      var kk = pp.t / pp.d;
      var jp = jarPos();
      game.draw.sprite(STAR, { y: C.gold }, pp.x + (jp.x - pp.x) * kk, pp.y + (jp.y - pp.y) * kk - Math.sin(kk * Math.PI) * 200, 8, { anchor: 'center' });
    }
  }

  function drawSling(active) {
    var bob = Math.sin(game.time.elapsed * 2.4) * 5;
    game.draw.sprite(KEEPER, { h: C.ink, f: '#f2c9a0', k: C.ink, t: C.teal }, W * 0.16, H * 0.87 + bob, 16, { anchor: 'center' });
    // 二股
    game.draw.line(SX - 90, SY - 60, SX, SY + 120, C.wood, 22);
    game.draw.line(SX + 90, SY - 60, SX, SY + 120, C.wood, 22);
    var bx = aiming ? pullX : SX, by = aiming ? pullY : SY - 40;
    game.draw.line(SX - 90, SY - 60, bx, by, C.pale, 6);
    game.draw.line(SX + 90, SY - 60, bx, by, C.pale, 6);
    game.draw.circle(bx, by, 30, C.gold);
    if (active && !aiming) game.draw.circle(SX, SY - 40, 80, C.gold, 0.12 + 0.08 * Math.sin(game.time.elapsed * 5));
    if (aiming) {
      var L = landingFor(pullX, pullY);
      for (var i = 1; i <= 10; i++) {
        var k = i / 10;
        var x = SX + (L.x - SX) * k, y = SY + (L.y - SY) * k - Math.sin(k * Math.PI) * 140;
        game.draw.circle(x, y, 8 * depthScale(y) + 2, C.pale, 0.7);
      }
      game.draw.circle(L.x, L.y, 40 * depthScale(L.y), C.gold, 0.5);
    }
    // 星壺
    var jp = jarPos();
    var hl = focus && (focus.jar || focus.comet);
    if (hl) game.draw.circle(jp.x, jp.y, 150, C.white, 0.6 + 0.3 * Math.sin(game.time.elapsed * 30));
    game.draw.sprite(JAR, { b: C.pale, y: stars > 0 ? C.gold : C.floorB }, jp.x, jp.y + Math.cos(game.time.elapsed * 2) * 4, 22, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.1, C.ink, 0.6);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(STAR, { y: i < stars ? C.gold : C.floorB }, W * 0.07 + i * 72, H * 0.04, 7, { anchor: 'center' });
    }
    txt(stars + '/' + NEEDED, W * 0.87, H * 0.04, 50, C.gold);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(50, H * 0.08, W - 100, 16, C.floorB);
    game.draw.rect(50, H * 0.08, (W - 100) * frac, 16, low ? C.pink : C.teal);
  }

  // ── ATTRACTデモ: 籠を先読みして引き→放す。彗星玉が来たら撃ち落とす。3発目はわざと引きが弱い ──
  var demo = { t: 0, gx: SX, gy: SY, press: false, phase: 0, pt: 0.6, n: 0, tx: SX, ty: SY };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; volleyT = 2.2; demo.phase = 0; demo.pt = 0.5; demo.n = 0; }
    stepWorld(dt, 0.2, true);
    demo.pt -= dt;
    if (demo.phase === 0 && demo.pt <= 0) {
      // 狙いを決める(彗星玉を優先)
      var target = null;
      for (var c = 0; c < comets.length; c++) if (comets[c].t > 0.3 && !comets[c].hit) target = comets[c];
      var ax, ay;
      if (target) {
        var k2 = Math.min(1, (target.t + 0.7 + FLIGHT) / target.dur), jp = jarPos();
        ax = target.fx + (jp.x - target.fx) * k2; ay = target.fy + (jp.y - target.fy) * k2 * k2;
      } else {
        ax = crane.x + crane.dir * crane.sp * 1.2 * (0.7 + FLIGHT); ay = crane.y + 40;
        ax = Math.max(W * 0.15, Math.min(W * 0.85, ax));
      }
      var weak = demo.n % 3 === 2 ? 0.7 : 1;
      demo.tx = SX - (ax - SX) / 3.4 * weak; demo.ty = SY - (ay - SY) / 3.4 * weak;
      demo.phase = 1; demo.pt = 0.7; aiming = true; pullX = SX; pullY = SY - 40;
    } else if (demo.phase === 1) {
      pullX += (demo.tx - pullX) * Math.min(1, dt * 8);
      pullY += (demo.ty - pullY) * Math.min(1, dt * 8);
      if (demo.pt <= 0) { aiming = false; demo.n++; shoot(pullX, pullY, true); demo.phase = 0; demo.pt = 0.5; }
    }
    demo.gx = aiming ? pullX : SX; demo.gy = aiming ? pullY : SY - 40;
    demo.press = aiming;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0.2) return;
    if (y > H * 0.55) {
      aiming = true; pullX = x; pullY = y;
      game.audio.play('se_tap', 0.15);
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    var dx = x - SX, dy = y - SY, len = Math.hypot(dx, dy);
    if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; }
    pullX = SX + dx; pullY = SY + dy;
    if (game.random(0, 1) < 0.05) game.audio.tone(200 + len, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    aiming = false;
    if (finished) return;
    shoot(pullX, pullY, false);
    game.fx.burst(SX, SY - 40, { color: C.gold, count: 5, speed: 200 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished && y <= H * 0.55) game.fx.burst(x, y, { color: C.pale, count: 3, speed: 100 });
  });

  function finishNow() {
    var jp = jarPos();
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(jp.x, jp.y - 120, { text: 'CLEAR', color: C.gold, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(jp.x, jp.y - 120, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  function scoreNow() { return stars * 100 + intercepts * 50; }

  game.onUpdate(function(dt) {
    var pulse = 0.02 + 0.03 * Math.sin(game.time.elapsed * 1.5);

    if (state === S.ATTRACT) {
      if (stars === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawCrane();
      drawProjectiles();
      drawSling(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.pale);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawCrane();
      drawSling(false);
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.3, { color: C.gold, count: 4 });
      game.draw.rect(0, H * 0.4, W, H * 0.24, C.ink, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 100, ok ? C.gold : C.pink);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.52, 56, C.pale);
      if (ok && scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 48, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 42, C.pale);
      if (!ok) txt('あと' + Math.max(1, NEEDED - stars) + '個!', W / 2, H * 0.63, 46, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.pale);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(scoreNow(), { stars: stars, intercepts: intercepts });
        else game.end.failure({ stars: stars, intercepts: intercepts });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, Math.min(1, (TIME_LIMIT - timeLeft) / TIME_LIMIT), false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = { jar: true }; aiming = false;
        game.fx.popup('TIME UP', W / 2, H * 0.45, { color: C.pink, size: 80 });
      }
    }

    drawBg(pulse);
    drawCrane();
    drawProjectiles();
    drawSling(!finished && ready <= 0);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1.5], [0, 0.5],
    ], { tempo: 126, wave: 'sine', volume: 0.08, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
