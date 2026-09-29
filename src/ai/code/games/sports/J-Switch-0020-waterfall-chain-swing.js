// J-Switch-0020-waterfall-chain-swing.js
// 大滝の鎖場渡り — 岩壁の張り出しから垂れる古い鎖にぶら下がり、押している間こいで勢いを溜め、ちょうど次の鎖に届く勢いで手を離して跳び移り、滝つぼを越えて向こうの岩棚まで渡り切る
// 操作: どこでも押している間こいで勢いが溜まる(下のメーターが伸びる)。緑の帯で離すと次の鎖へ届く。足りないと手前の滝つぼへ、溜めすぎると飛び越えて滝つぼへ。溜めすぎたまま握り続けても手が滑る。後半の鎖は滝の風で揺れて帯も動く(社内メモ。画面には出さない)
// 終わり: 向こうの岩棚まで渡ればCLEAR。3回滝つぼに落ちる/時間切れでGAME OVER
// @mechanic: hold_charge
// @theme: waterfall_chain_swing
// 世界観: 初夏の山奥の大滝で、岩茸採りの見習いの少年が、向こう側の岩棚で待つ親方のもとへ採りたての岩茸の籠を届けるため、滝つぼの上の岩壁に古くから垂らされた鎖に次々とぶら下がって勢いをつけて跳び移り、しぶきの舞う滝つぼを越えて渡り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った鎖の数・芯で届いた(PERFECT)数・落ちた回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい空、原色 + 白縁、光の柱、祝祭演出
  var STYLE = { bg: ['#3fd0ff', '#b8f0ff'], main: ['#ffe03a', '#ff4a7a', '#2f6bff'], accent: ['#ffffff', '#27d17f'] };
  var C = { yellow: '#ffe03a', pink: '#ff4a7a', blue: '#2f6bff', white: '#ffffff', green: '#27d17f', ink: '#16204a', water: '#1d8fe0', steel: '#8a97b0', red: '#ff3b3b' };

  var TITLE = 'FALLS CHAIN HOP';
  var TIME_LIMIT = 15;
  var MAX_FALL = 3;
  var RAIL_Y = H * 0.16;
  var HAND_Y = H * 0.41;
  var WATER_Y = H * 0.66;
  var DMAX = 640;
  var CHARGE_RATE = 1.0;
  var OVER = 1.32;
  var FLY_T = 0.55;
  var IDLE_T = 2.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BOY = {
    hang: [['.y..y.', '.f..f.', '.bbbb.', '.bffb.', '.bbbb.', 'oooooo', '.oooo.', '.o..o.', '.k..k.'], ['.y..y.', '.f..f.', '.bbbb.', '.bffb.', '.bbbb.', 'oooooo', '.oooo.', 'o....o', 'k....k']],
    fly: [['y....y', 'f.bb.f', '.bbbb.', '.bffb.', '.bbbb.', 'oooooo', 'o.oo.o', 'k....k', '......']],
    fall: [['......', '.bbbb.', '.bffb.', 'fbbbbf', 'oooooo', '.oooo.', '.o..o.', '.k..k.', '......']]
  };
  var BOY_PAL = { y: '#ffe03a', f: '#ffd0a8', b: '#5a3a2a', o: '#2f6bff', k: '#16204a' };
  var BASKET = ['w....w', '.wwww.', 'gmgmgm', 'wwwwww', 'wbwbww', '.wwww.'];
  var BASKET_PAL = { w: '#c98a3a', g: '#3b4a2a', m: '#6d7d4a', b: '#8a5a22' };
  var GULL = [['w...w', '.w.w.', '..w..'], ['.....', 'wwpww', '..w..']];

  var chains, cur, charge, holding, mode, modeT, flyFrom, flyTo, flyOk, flyPerfect, reached, perfects, falls, timeLeft, ready, hitStop, pendingBad, finished, done, endWait, ok, timeUp, camX, idle, swingPh, milestoneShown, runT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function buildChains() {
    chains = [];
    var x = 260;
    chains.push({ x: x, sway: 0, quay: false });
    var n = 5;
    for (var i = 1; i <= n; i++) {
      x += 320 + Math.random() * 230;
      chains.push({ x: x, sway: i >= 3 ? 40 + (i - 3) * 25 : 0, ph: Math.random() * 6, quay: false });
    }
    x += 330 + Math.random() * 180;
    chains.push({ x: x, sway: 0, quay: true });
  }

  function chainX(i, t) {
    var c = chains[i];
    if (!c) return 0;
    return c.x + (c.sway ? Math.sin(t * 1.7 + c.ph) * c.sway : 0);
  }

  function reachFor(i) { return chains[i].quay ? 110 : Math.max(44, 64 - (i - 1) * 4); }

  function initGame() {
    buildChains();
    cur = 0; charge = 0; holding = false; mode = 'hang'; modeT = 0;
    flyFrom = null; flyTo = null; flyOk = false; flyPerfect = false;
    reached = 0; perfects = 0; falls = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    hitStop = 0; pendingBad = null; finished = false; done = false; endWait = 0; ok = false; timeUp = false;
    camX = chains[0].x - W * 0.25; idle = 0; swingPh = 0; milestoneShown = false; runT = 0;
  }

  function finishRound(win) {
    if (finished) return;
    finished = true; done = true; ok = win; endWait = 1.6;
    if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play(win ? 'se_success' : 'se_failure', 0.5); }
  }

  function grabPos() {
    var amp = mode === 'charge' ? Math.min(1, charge) * 0.55 : 0.08;
    var a = Math.sin(swingPh) * amp;
    var cx = chainX(cur, runT);
    var len = HAND_Y - RAIL_Y;
    return { x: cx + Math.sin(a) * len, y: RAIL_Y + Math.cos(a) * len, a: a };
  }

  function startCharge() {
    if (mode !== 'hang') return false;
    mode = 'charge'; modeT = 0; charge = 0; idle = 0;
    return true;
  }

  function release() {
    if (mode !== 'charge') return;
    var p = grabPos();
    var dist = charge * DMAX;
    var next = cur + 1;
    var landX = chainX(cur, runT) + dist;
    var targetX = chainX(next, runT + FLY_T);
    var err = Math.abs(landX - targetX);
    flyOk = err <= reachFor(next);
    flyPerfect = err <= 18;
    flyFrom = { x: p.x, y: p.y };
    flyTo = { x: flyOk ? targetX : landX, y: chains[next].quay ? WATER_Y - 150 : HAND_Y, err: landX - targetX };
    mode = 'fly'; modeT = 0;
    game.audio.play('se_jump', 0.35);
  }

  function slip(kind) {
    // 溜めすぎ / 握り疲れ: その場から落ちる
    var p = grabPos();
    flyFrom = { x: p.x, y: p.y };
    flyTo = { x: p.x + (kind === 'over' ? 60 : 0), y: WATER_Y, err: 0 };
    flyOk = false;
    mode = 'fly'; modeT = 0;
    game.audio.tone('B2', 0.14, { wave: 'square', volume: 0.12 });
  }

  function landed() {
    var next = cur + 1;
    if (flyOk) {
      cur = next; reached++;
      mode = 'hang'; modeT = 0; charge = 0; idle = 0;
      if (flyPerfect) perfects++;
      game.feedback.good(flyTo.x, flyTo.y - 120, { text: flyPerfect ? 'PERFECT' : 'GOOD', color: flyPerfect ? C.yellow : C.green, size: flyPerfect ? 64 : 52 });
      game.audio.play(flyPerfect ? 'se_powerup' : 'se_coin', 0.35);
      if (chains[cur].quay) { if (state === S.PLAYING) { game.fx.flash('#ffffff', 0.2); finishRound(true); } mode = 'goal'; return; }
      if (state === S.PLAYING && !milestoneShown && reached >= 3) {
        milestoneShown = true;
        game.fx.popup(reached + ' / ' + (chains.length - 1), W / 2, H * 0.22, { color: C.yellow, size: 60 });
        game.audio.play('se_milestone', 0.4);
      }
    } else {
      mode = 'fall'; modeT = 0;
      falls++;
      hitStop = 0.4;
      pendingBad = { x: flyTo.x - camX, y: WATER_Y - 60 };
      game.fx.burst(flyTo.x - camX, WATER_Y, { color: C.white, count: 16, speed: 360 });
      game.audio.play('se_break', 0.3);
      if (state === S.PLAYING && falls >= MAX_FALL) finishRound(false);
    }
  }

  function stepPlay(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && pendingBad) {
        game.feedback.bad(pendingBad.x, pendingBad.y, { text: 'MISS', shake: 12 });
        pendingBad = null;
      }
      return false;
    }
    runT += dt;
    modeT += dt;
    if (mode === 'hang') {
      swingPh += dt * 3;
      idle += dt;
      if (idle >= IDLE_T && !finished) slip('idle');
    } else if (mode === 'charge') {
      swingPh += dt * (4 + charge * 5);
      charge += CHARGE_RATE * dt;
      if (charge >= OVER) slip('over');
    } else if (mode === 'fly') {
      if (modeT >= FLY_T) landed();
    } else if (mode === 'fall') {
      if (modeT >= 0.9 && !finished) { mode = 'hang'; modeT = 0; charge = 0; idle = 0; }
    }
    return true;
  }

  function followCam(dt) {
    var target = (mode === 'fly' && flyTo ? Math.min(flyTo.x, chainX(cur + 1, runT)) : chainX(cur, runT)) - W * 0.28;
    camX += (target - camX) * Math.min(1, dt * 3);
  }

  // ---------- 描画 ----------
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, WATER_Y, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 光の柱
    for (var i = 0; i < 5; i++) {
      var px = ((i * 260 - camX * 0.15 + t * 40) % (W + 300) + W + 300) % (W + 300) - 150;
      game.draw.rect(px, 230, 70, WATER_Y - 230, C.white, 0.12 + 0.06 * Math.sin(t * 2 + i));
    }
    // 奥の岩壁(パララックス)
    var bo = ((-camX * 0.4) % 300 + 300) % 300;
    for (var b = -1; b < 5; b++) {
      var bx = b * 300 + bo;
      game.draw.rect(bx, H * 0.3 + (b % 2) * 40, 280, WATER_Y - H * 0.3, b % 2 ? '#9a86b8' : '#ad9bc8');
      game.draw.rect(bx, H * 0.3 + (b % 2) * 40, 280, 14, C.white, 0.7);
      game.draw.rect(bx + 30, H * 0.42 + (b % 3) * 60, 60, 24, C.green);
    }
    // 大滝
    var fx = ((W * 0.55 - camX * 0.25) % (W + 500) + W + 500) % (W + 500) - 250;
    game.draw.rect(fx, 230, 240, WATER_Y - 230, '#e6f7ff');
    for (var s = 0; s < 10; s++) {
      var sy = 230 + ((t * 700 + s * 110) % (WATER_Y - 230));
      game.draw.rect(fx + 16 + (s % 4) * 54, sy, 18, 70, C.white);
    }
    game.draw.circle(fx + 120, WATER_Y, 150, C.white, 0.35 + 0.1 * Math.sin(t * 6));
    game.draw.sprite(GULL[Math.floor(t * 3) % 2], { w: C.white, p: '#ffd3e0' }, W * 0.7 + Math.sin(t * 0.9) * 140, H * 0.27 + Math.cos(t * 1.4) * 20, 9, { anchor: 'center' });
    // 岩の張り出しと鉄の横棒
    game.draw.rect(0, 226, W, RAIL_Y - 226 + 10, '#6b5a86');
    game.draw.rect(0, RAIL_Y - 4, W, 12, C.white);
    var off = ((camX % 160) + 160) % 160;
    for (var k = -1; k < 8; k++) game.draw.circle(k * 160 - off + 80, RAIL_Y - 50, 22, '#7d6c98');
    game.draw.rect(0, RAIL_Y + 2, W, 10, C.yellow);
    // 水
    game.draw.gradient(WATER_Y, H * 0.74, [[0, C.water], [1, '#1466b8']]);
    for (var r = 0; r < 8; r++) {
      var rx = ((r * 170 - camX + Math.sin(t + r) * 30) % W + W) % W;
      game.draw.rect(rx, WATER_Y + 20 + (r % 3) * 30, 90, 6, C.white, 0.5);
    }
  }

  function drawChain(x0, y0, x1, y1, hot) {
    var n = 14;
    for (var i = 0; i <= n; i++) {
      var k = i / n;
      game.draw.circle(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, i % 2 ? 7 : 10, hot ? C.yellow : C.steel);
    }
  }

  function drawChains() {
    var t = game.time.elapsed;
    for (var i = 0; i < chains.length; i++) {
      var cx = chainX(i, runT) - camX;
      if (cx < -300 || cx > W + 300) continue;
      if (chains[i].quay) {
        game.draw.rect(cx - 90, WATER_Y - 110, W, H * 0.74 - WATER_Y + 110, '#7d6c98');
        game.draw.rect(cx - 90, WATER_Y - 110, W, 22, C.green);
        game.draw.rect(cx - 90, WATER_Y - 88, W, 8, C.white);
        game.draw.rect(cx - 60, WATER_Y - 220, 16, 110, C.ink);
        game.draw.rect(cx - 44, WATER_Y - 220, 70, 42, C.pink);
        game.draw.circle(cx + 140, WATER_Y - 170 + Math.sin(t * 3) * 6, 40, C.yellow);
        game.draw.sprite(BASKET, BASKET_PAL, cx + 140, WATER_Y - 170 + Math.sin(t * 3) * 6, 10, { anchor: 'center' });
        continue;
      }
      var isCur = i === cur && mode !== 'fly';
      var g = isCur ? grabPos() : { x: chainX(i, runT) + Math.sin(t * 1.3 + i) * 6, y: HAND_Y };
      drawChain(chainX(i, runT) - camX, RAIL_Y, g.x - camX, g.y, i === cur + 1 && mode === 'charge');
      game.draw.rect(chainX(i, runT) - camX - 30, RAIL_Y - 8, 60, 22, C.ink);
      game.draw.circle(g.x - camX, g.y + 14, 18, '#c8d0e0');
    }
  }

  function drawBoy() {
    var t = game.time.elapsed;
    var x, y, frames;
    if (mode === 'hang' || mode === 'charge' || mode === 'goal') {
      if (mode === 'goal') { x = chainX(cur, runT) - camX; y = WATER_Y - 200 + Math.abs(Math.sin(t * 8)) * -30; frames = BOY.fly; }
      else { var g = grabPos(); x = g.x - camX; y = g.y + 50; frames = BOY.hang; }
    } else if (mode === 'fly') {
      var k = Math.min(1, modeT / FLY_T);
      x = flyFrom.x + (flyTo.x - flyFrom.x) * k - camX;
      var arc = flyOk || flyTo.y < WATER_Y ? 240 : 120;
      y = flyFrom.y + (flyTo.y - flyFrom.y) * k - Math.sin(k * Math.PI) * arc + 50;
      frames = BOY.fly;
    } else {
      x = flyTo.x - camX; y = WATER_Y + Math.min(1, modeT / 0.4) * 60; frames = BOY.fall;
    }
    var f = frames[Math.floor(t * 6) % frames.length];
    var hl = mode === 'fall' && hitStop > 0;
    if (hl) game.draw.circle(x, y, 90 + (0.4 - hitStop) * 160, '#ffffff', hitStop * 1.6);
    game.draw.sprite(f, hl ? { y: '#fff', f: '#fff', b: '#fff', o: '#fff', k: '#fff' } : BOY_PAL, x, y, 13 * (hl ? 1.2 : 1), { anchor: 'center' });
    if (mode === 'charge' && charge > 1.05) {
      game.draw.circle(x, y - 110, 16 + Math.sin(t * 40) * 5, C.red, 0.8);
    }
  }

  function drawMeter() {
    var t = game.time.elapsed;
    var top = H * 0.74;
    game.draw.gradient(top, H, [[0, '#ffffff'], [0.15, '#e8f6ff'], [1, '#bfe6ff']]);
    game.draw.rect(0, top, W, 10, C.yellow);
    var mx = 90, my = H * 0.82, mw = W - 180, mh = 70;
    game.draw.rect(mx - 8, my - 8, mw + 16, mh + 16, C.ink);
    game.draw.rect(mx, my, mw, mh, '#dfe8ff');
    var sc = mw / OVER;
    // 次の鎖に届く帯(着地時の位置で予測)
    var next = cur + 1;
    if (chains[next] && (mode === 'hang' || mode === 'charge')) {
      var need = (chainX(next, runT + FLY_T) - chainX(cur, runT)) / DMAX;
      var band = reachFor(next) / DMAX;
      var pb = 18 / DMAX;
      game.draw.rect(mx + (need - band) * sc, my, band * 2 * sc, mh, C.green, 0.85);
      game.draw.rect(mx + (need - pb) * sc, my, pb * 2 * sc, mh, C.yellow);
    }
    game.draw.rect(mx + 1.0 * sc, my, (OVER - 1.0) * sc, mh, C.red, 0.35 + 0.2 * Math.sin(t * 6));
    var fillW = Math.min(OVER, charge) * sc;
    game.draw.rect(mx, my + mh * 0.3, fillW, mh * 0.4, mode === 'charge' ? C.blue : '#9fb0d0');
    game.draw.rect(mx + fillW - 6, my - 14, 12, mh + 28, C.ink);
    // 握りボタン
    var bx = W / 2, by = H * 0.92;
    var pr = holding;
    game.draw.circle(bx, by + 10, 96, C.ink);
    game.draw.circle(bx, by + (pr ? 8 : 0), 88 + (pr ? 0 : Math.sin(t * 4) * 4), pr ? C.blue : C.pink);
    game.draw.circle(bx - 26, by - 26 + (pr ? 8 : 0), 26, C.white, 0.45);
    game.draw.sprite(BASKET, BASKET_PAL, bx, by + (pr ? 8 : 0), 11, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.ink, 0.88);
    txt(reached + ' / ' + (chains.length - 1), 70, 86, 62, C.yellow, 'left');
    for (var i = 0; i < MAX_FALL; i++) game.draw.circle(W - 90 - i * 66, 86, 24, i < falls ? C.red : '#34406a');
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 168, W - 120, 24, '#34406a');
    game.draw.rect(60, 168, (W - 120) * frac, 24, low ? C.red : C.green);
  }

  function drawAll() {
    drawBack();
    drawChains();
    drawBoy();
    drawMeter();
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.8));
  }

  // ---------- 入力 ----------
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    holding = true;
    if (ready <= 0 && !finished && hitStop <= 0 && startCharge()) {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(W / 2, H * 0.92, { color: C.yellow, count: 5, speed: 140 });
    } else {
      game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    holding = false;
    if (mode === 'charge' && hitStop <= 0) release();
    else game.fx.burst(W / 2, H * 0.92, { color: C.white, count: 3, speed: 80 });
  });

  // ---------- ATTRACT 実演(本番の startCharge/release/stepPlay を使う) ----------
  var demo = { t: 0, fail: false, stage: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var P = 3.4;
    var cyc = demo.t % P;
    if (cyc < dt || demo.t <= dt) {
      demo.fail = Math.floor(demo.t / P) % 2 === 1;
      initGame(); ready = 0;
      chains[1].x = chains[0].x + 400; chains[1].sway = 0;
      camX = chains[0].x - W * 0.28;
      demo.stage = 0;
    }
    if (demo.stage === 0 && cyc > 0.5 && mode === 'hang') { startCharge(); holding = true; demo.stage = 1; }
    if (demo.stage === 1 && mode === 'charge') {
      var need = (chainX(1, runT + FLY_T) - chainX(0, runT)) / DMAX;
      var goal = demo.fail ? need - 0.2 : need;
      if (charge >= goal) { release(); holding = false; demo.stage = 2; }
    }
    stepPlay(dt);
    followCam(dt);
  }

  game.onUpdate(function(dt) {
    if (chains === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll();
      game.draw.hand(W / 2, H * 0.92, { press: holding, scale: 14 });
      game.draw.rect(0, 0, W, 226, C.ink, 0.88);
      txt(TITLE, W / 2, 86, 84, C.yellow);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 176, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.78, 44, C.pink);
      else txt('INSERT COIN', W / 2, H * 0.78, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawAll();
      game.draw.rect(0, H * 0.28, W, H * 0.34, C.ink, 0.86);
      txt(ok ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, ok ? C.yellow : C.red);
      txt(reached + ' / ' + (chains.length - 1), W / 2, H * 0.42, 72, C.white);
      txt('PERFECT ' + perfects + '   MISS ' + falls, W / 2, H * 0.49, 40, C.white);
      if (ok && resultScore() >= game.best) txt('NEW RECORD', W / 2, H * 0.545, 50, C.yellow);
      else txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.545, 40, C.white);
      if (!ok) txt('あと' + (chains.length - 1 - reached) + '本!', W / 2, H * 0.595, 46, C.pink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.78, 40, C.ink);
      return;
    }

    // PLAYING
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
      if (ready <= 0 && holding) startCharge();
    } else {
      var running = stepPlay(dt);
      if (done) {
        if (hitStop <= 0) {
          endWait -= dt;
          if (endWait <= 0) {
            state = S.RESULT;
            var stats = { chains: reached, perfect: perfects, fall: falls };
            if (ok) game.end.success(resultScore(), stats);
            else game.end.failure(stats);
          }
        }
      } else if (running) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; timeUp = true;
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
          finishRound(false);
        }
      }
    }
    followCam(dt);
    drawAll();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, C.yellow);
  });

  function resultScore() { return reached * 100 + perfects * 50 + Math.round(timeLeft * 10); }

  game.onStart(function() {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['A5', 0.5], ['F5', 0.5], ['G5', 1], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 2]], { tempo: 156, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
