// J-N6434-0058-sky-orchard-railcart.js
// 空中果樹園トロッコ — 宙に浮くレールを走るトロッコで、左手で跳ねて上の実を、右手で鉤を下ろして下の実を摘む
// 操作: 左半分を押すとトロッコが跳ねる(上の実・レールの切れ目を越える)。右半分を押すと鉤が下りる(レール下にぶら下がる実)
// 終わり: 制限時間内に実を10個摘めば成功。切れ目に落ちる/時間切れで失敗
// @mechanic: coop_2zone
// @theme: sky_orchard_railcart
// 世界観: 雲の上に浮かぶ果樹園島どうしを結ぶ古いレールを、収穫番の見習いがトロッコで駆け抜け、枝の上と下に実った果実を両手で摘み分けて日暮れまでに籠を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 摘んだ実の数(上/下)・越えた切れ目数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、半透明円のブルームとビネット
  var STYLE = { bg: ['#8a7a6a', '#c9b79a'], main: ['#6e6358', '#b3a48c', '#3b342e'], accent: ['#f0c070', '#d06a4a'] };
  var C = { skyTop: '#6c6a78', skyMid: '#b59f86', skyLow: '#d8c7a6', rail: '#4a4038', tie: '#6e5a48', ink: '#221d19',
    fruit: '#e0a040', fruitLow: '#c46a50', leaf: '#6f8a5a', warn: '#e0503a', good: '#a8d080', bloom: '#fff0c8', white: '#f4ecdc' };

  var GAME_TITLE = 'SKY ORCHARD RAIL';
  var TIME_LIMIT = 18;
  var NEEDED = 10;
  var RAIL_Y = H * 0.5;
  var CART_X = 300;
  var HI_Y = RAIL_Y - 190;
  var LO_Y = RAIL_Y + 170;
  var GRAV = 2600, HOP_V = 960;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var scroll, speed, cy, cvy, air, hookT, items, gaps, nextSpawn, spawnN, picked, pickedHi, pickedLo, cleared;
  var timeLeft, ready, hitStop, finished, ok, done, endWait, score, falling, btnL, btnR, warnBeep;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: 'rgba(0,0,0,0.45)', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var CART_A = ['...hh....', '..hhhh...', '...ss....', '.mmmmmmm.', 'mMMMMMMMm', 'mMMMMMMMm', '.mmmmmmm.', '.w.....w.'];
  var CART_B = ['...hh....', '..hhhh...', '...ss....', '.mmmmmmm.', 'mMMMMMMMm', 'mMMMMMMMm', '.mmmmmmm.', '..w...w..'];
  var CART_PAL = { h: '#d06a4a', s: '#e8c8a0', m: '#3b342e', M: '#8a7a6a', w: '#221d19' };
  var FRUIT = ['..l..', '.fff.', 'fffff', 'fffff', '.fff.'];
  var HANG = ['..s..', '..s..', '.fff.', 'fffff', '.fff.'];
  var BIRD_A = ['b...b', '.b.b.', '..b..'];
  var BIRD_B = ['.....', 'bb.bb', '..b..'];
  var UP_ICON = ['...w...', '..www..', '.wwwww.', 'wwwwwww', '..www..', '..www..', '..www..'];
  var DN_ICON = ['..www..', '..www..', '..www..', 'wwwwwww', '.wwwww.', '..www..', '...w...'];

  function initGame() {
    scroll = 0; speed = 330; cy = RAIL_Y; cvy = 0; air = false; hookT = -1;
    items = []; gaps = []; nextSpawn = 520; spawnN = 0; picked = 0; pickedHi = 0; pickedLo = 0; cleared = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    score = 0; falling = false; btnL = 0; btnR = 0; warnBeep = 0;
  }

  function spawnAhead() {
    while (nextSpawn < scroll + W + 200) {
      spawnN++;
      if (spawnN % 4 === 0) {
        gaps.push({ x0: nextSpawn, x1: nextSpawn + 170, passed: false });
        items.push({ wx: nextSpawn + 85, hi: true, got: false });
        nextSpawn += 170 + 300;
      } else {
        items.push({ wx: nextSpawn, hi: game.random(0, 1) < 0.5, got: false });
        nextSpawn += game.random(200, 290);
      }
    }
  }

  function inGap(wx) {
    for (var i = 0; i < gaps.length; i++) if (wx > gaps[i].x0 + 18 && wx < gaps[i].x1 - 18) return gaps[i];
    return null;
  }

  // 左手: 跳ねる / 右手: 鉤 — プレイもデモもここを通る
  function hop(live) {
    btnL = 0.18;
    if (air || falling) { if (live) game.audio.tone(200, 0.04, { wave: 'square', volume: 0.03 }); return false; }
    air = true; cvy = -HOP_V;
    if (live) game.audio.play('se_jump', 0.35);
    return true;
  }
  function hook(live) {
    btnR = 0.18;
    if (hookT >= 0 || falling) { if (live) game.audio.tone(200, 0.04, { wave: 'square', volume: 0.03 }); return false; }
    hookT = 0;
    if (live) game.audio.tone('E3', 0.1, { wave: 'triangle', volume: 0.06, slide: -80 });
    return true;
  }
  function hookDepth() {
    if (hookT < 0) return 0;
    if (hookT < 0.1) return hookT / 0.1;
    if (hookT < 0.32) return 1;
    return Math.max(0, 1 - (hookT - 0.32) / 0.14);
  }

  function collect(it, live) {
    it.got = true; picked++;
    if (it.hi) pickedHi++; else pickedLo++;
    score += 100;
    if (live) {
      var sx = it.wx - scroll + CART_X, sy = it.hi ? HI_Y : LO_Y;
      game.feedback.good(sx, sy - 40, { text: 'GOOD', color: C.good, count: 10 });
      game.audio.play('se_coin', 0.35);
      if (picked === 5) { game.audio.play('se_milestone', 0.5); game.fx.popup(picked + ' / ' + NEEDED, W / 2, H * 0.24, { color: C.fruit, size: 66 }); }
      if (picked >= NEEDED) { finished = true; ok = true; hitStop = 0.45; score += Math.round(timeLeft * 30) + cleared * 50; }
    }
  }

  function stepWorld(dt, live) {
    if (falling) { cvy += GRAV * dt; cy += cvy * dt; return; }
    scroll += speed * dt;
    speed = Math.min(430, speed + dt * 5);
    spawnAhead();
    if (air) {
      cvy += GRAV * dt; cy += cvy * dt;
      if (cy >= RAIL_Y) {
        if (inGap(scroll)) { /* 切れ目の上では落下へ */ }
        else { cy = RAIL_Y; cvy = 0; air = false; if (live) game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.04 }); }
      }
    }
    if (!air && inGap(scroll)) {
      falling = true; cvy = 200;
      if (live) { finished = true; ok = false; hitStop = 0.5; game.audio.play('se_break', 0.5); }
      return;
    }
    if (air && cy > RAIL_Y + 30) {
      falling = true;
      if (live) { finished = true; ok = false; hitStop = 0.5; game.audio.play('se_break', 0.5); }
      return;
    }
    if (hookT >= 0) { hookT += dt; if (hookT > 0.46) hookT = -1; }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.got) continue;
      var dx = Math.abs(it.wx - scroll);
      if (dx > 70) continue;
      if (it.hi && cy < RAIL_Y - 110) collect(it, live);
      else if (!it.hi && hookDepth() > 0.8) collect(it, live);
    }
    for (var g = 0; g < gaps.length; g++) {
      if (!gaps[g].passed && scroll > gaps[g].x1) {
        gaps[g].passed = true; cleared++;
        if (live) game.fx.popup('NICE', CART_X, RAIL_Y - 120, { color: C.white, size: 40 });
      }
    }
    // 予告音: 切れ目が0.7秒以内に迫る
    warnBeep -= dt;
    if (live && warnBeep <= 0) {
      for (var q = 0; q < gaps.length; q++) {
        var ahead = (gaps[q].x0 - scroll) / speed;
        if (ahead > 0 && ahead < 0.7) { game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.04 }); warnBeep = 0.16; break; }
      }
    }
    items = items.filter(function(o) { return o.wx > scroll - 400; });
    gaps = gaps.filter(function(o) { return o.x1 > scroll - 600; });
    if (btnL > 0) btnL -= dt;
    if (btnR > 0) btnR -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    game.audio.play('se_tap', 0.15);
    if (x < W / 2) { if (hop(true)) game.fx.burst(CART_X, RAIL_Y + 10, { color: C.white, count: 6, speed: 160 }); }
    else if (hook(true)) game.fx.burst(CART_X, RAIL_Y + 40, { color: C.tie, count: 4, speed: 90 });
  });

  // ── ATTRACT: AI が本物の hop/hook/stepWorld で両手を使い分ける ──
  var demo = { t: 0, gx: W * 0.25, gy: H * 0.86, press: false, pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (falling) { stepWorld(dt, false); if (cy > H + 200) { initGame(); ready = 0; } return; }
    stepWorld(dt, false);
    demo.pt -= dt;
    var want = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.got) continue;
      var lead = (it.wx - scroll) / speed;
      if (it.hi && lead > 0.18 && lead < 0.26 && !air) want = 'L';
      if (!it.hi && lead > 0.05 && lead < 0.12 && hookT < 0) want = 'R';
    }
    for (var g = 0; g < gaps.length; g++) {
      var gl = (gaps[g].x0 - scroll) / speed;
      if (gl > 0.02 && gl < 0.1 && !air) want = 'L';
    }
    if (want === 'L') { hop(false); demo.pt = 0.2; demo.side = 'L'; }
    if (want === 'R') { hook(false); demo.pt = 0.2; demo.side = 'R'; }
    var tx = demo.side === 'R' ? W * 0.75 : W * 0.25;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 10);
    demo.gy = H * 0.86 + 20;
    demo.press = demo.pt > 0;
  }

  function sx(wx) { return wx - scroll + CART_X; }

  function drawScene(t) {
    var pulse = 0.05 + 0.04 * Math.sin(t * 1.2);
    game.draw.gradient(0, H, [[0, C.skyTop], [0.45, C.skyMid], [1, C.skyLow]]);
    game.draw.circle(W * 0.8, H * 0.14, 150, C.bloom, 0.25 + pulse);
    game.draw.circle(W * 0.8, H * 0.14, 260, C.bloom, 0.1);
    // 遠景の浮島(パララックス)
    for (var i = 0; i < 4; i++) {
      var ix = ((i * 420 - scroll * 0.2) % (W + 500) + W + 500) % (W + 500) - 250;
      var iy = H * 0.3 + (i % 2) * 90 + Math.sin(t * 0.7 + i) * 10;
      game.draw.circle(ix, iy, 110, '#8a8070', 0.55);
      game.draw.circle(ix, iy - 70, 80, C.leaf, 0.5);
      game.draw.rect(ix - 110, iy, 220, 40, '#7a6e60', 0.5);
    }
    for (var k = 0; k < 5; k++) {
      var cxp = ((k * 300 - scroll * 0.45) % (W + 400) + W + 400) % (W + 400) - 200;
      game.draw.circle(cxp, H * 0.66 + (k % 3) * 40, 120, C.white, 0.18);
    }
    // 見物の鳥(演出AI)
    game.draw.sprite(Math.floor(t * 4) % 2 ? BIRD_A : BIRD_B, { b: '#3b342e' }, W * 0.6 + Math.sin(t * 0.8) * 90, H * 0.2 + Math.cos(t * 1.3) * 20, 9, { anchor: 'center' });
  }

  function drawRail(t) {
    var segStart = scroll - CART_X - 50, segEnd = scroll + W;
    var cuts = gaps.slice().sort(function(a, b) { return a.x0 - b.x0; });
    var from = segStart;
    for (var i = 0; i <= cuts.length; i++) {
      var to = i < cuts.length ? cuts[i].x0 : segEnd;
      if (to > from) {
        game.draw.rect(sx(from), RAIL_Y + 34, to - from, 14, C.rail);
        for (var tx = Math.ceil(from / 60) * 60; tx < to; tx += 60) game.draw.rect(sx(tx), RAIL_Y + 30, 12, 26, C.tie);
      }
      if (i < cuts.length) {
        var lead = (cuts[i].x0 - scroll) / speed;
        var blink = lead < 0.7 && lead > -0.3 && Math.floor(t * 12) % 2 === 0;
        game.draw.rect(sx(cuts[i].x0) - 12, RAIL_Y + 16, 12, 44, blink ? C.warn : C.ink);
        game.draw.rect(sx(cuts[i].x1), RAIL_Y + 16, 12, 44, blink ? C.warn : C.ink);
        if (lead < 0.7 && lead > 0) game.draw.circle(sx(cuts[i].x0 + 85), RAIL_Y + 40, 60, C.warn, 0.15 + 0.1 * Math.sin(t * 20));
        from = cuts[i].x1;
      }
    }
    // 実
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.got) continue;
      var ix = sx(it.wx);
      if (ix < -60 || ix > W + 60) continue;
      var sway = Math.sin(t * 2 + it.wx) * 6;
      if (it.hi) {
        game.draw.circle(ix, HI_Y, 46, C.bloom, 0.18);
        game.draw.sprite(FRUIT, { l: C.leaf, f: C.fruit }, ix + sway * 0.3, HI_Y + sway * 0.4, 12, { anchor: 'center' });
      } else {
        game.draw.line(ix, RAIL_Y + 48, ix + sway, LO_Y - 30, C.leaf, 4);
        game.draw.sprite(HANG, { s: C.leaf, f: C.fruitLow }, ix + sway, LO_Y, 12, { anchor: 'center' });
      }
    }
  }

  function drawCart(t) {
    var d = hookDepth();
    if (d > 0) {
      var hy = cy + 40 + (LO_Y - RAIL_Y) * d;
      game.draw.line(CART_X + 10, cy + 20, CART_X + 10, hy, C.ink, 5);
      game.draw.rect(CART_X - 8, hy - 6, 36, 12, C.ink);
    }
    var fr = Math.floor(t * 8) % 2 ? CART_A : CART_B;
    var jig = air ? 0 : Math.sin(t * 30) * 2;
    if (falling && hitStop > 0) game.draw.circle(CART_X, cy, 110, C.white, 0.6);
    game.draw.sprite(fr, CART_PAL, CART_X, cy - 24 + jig, 13, { anchor: 'center' });
  }

  function drawVignette() {
    game.draw.rect(0, 0, 60, H, '#000000', 0.18);
    game.draw.rect(W - 60, 0, 60, H, '#000000', 0.18);
    game.draw.rect(0, H - 80, W, 80, '#000000', 0.15);
  }

  function drawButtons() {
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.ink, 0.35);
    game.draw.rect(W / 2 - 2, H * 0.78, 4, H * 0.18, C.white, 0.3);
    game.draw.circle(W * 0.25, H * 0.86, 120, btnL > 0 ? C.fruit : C.white, btnL > 0 ? 0.7 : 0.25);
    game.draw.circle(W * 0.75, H * 0.86, 120, btnR > 0 ? C.fruitLow : C.white, btnR > 0 ? 0.7 : 0.25);
    game.draw.sprite(UP_ICON, { w: C.white }, W * 0.25, H * 0.86, 16, { anchor: 'center' });
    game.draw.sprite(DN_ICON, { w: C.white }, W * 0.75, H * 0.86, 16, { anchor: 'center' });
  }

  function drawHud() {
    txt(picked + ' / ' + NEEDED, W / 2, 80, 66, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 20, C.ink, 0.6);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 20, lowTime ? C.warn : C.fruit);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (scroll === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawRail(t);
      drawCart(t);
      drawButtons();
      drawVignette();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 64, C.white);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, C.fruit);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, C.fruit);
      else txt('INSERT COIN', W / 2, H * 0.96, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawRail(t);
      drawVignette();
      game.draw.rect(0, H * 0.34, W, H * 0.3, C.ink, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.warn);
      txt(picked + ' / ' + NEEDED + '   (' + pickedHi + ' + ' + pickedLo + ')', W / 2, H * 0.47, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 48, C.fruit);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.59, 46, C.good);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.white);
      } else {
        txt('あと' + (NEEDED - picked) + '個!', W / 2, H * 0.53, 52, C.fruit);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (falling) { cvy += GRAV * dt * 0.5; cy += cvy * dt * 0.5; }
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { fruit: picked, high: pickedHi, low: pickedLo, gaps: cleared }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ fruit: picked, high: pickedHi, low: pickedLo, gaps: cleared }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.good, count: 28 });
        else game.feedback.bad(CART_X, RAIL_Y - 60, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.45; }
    }

    drawScene(t);
    drawRail(t);
    drawCart(t);
    drawButtons();
    drawVignette();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 96, C.fruit);
  });

  function music() {
    game.audio.melody([['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['Bb4', 0.5], ['G4', 0.5], ['F4', 1], ['C4', 0.5], ['E4', 0.5], ['G4', 1]], { tempo: 136, wave: 'triangle', volume: 0.045, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
