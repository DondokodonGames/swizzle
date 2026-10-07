// I-GBA-0028v2-houseboat-roof-plug-toss.js
// 屋形船の栓投げ — 揺れる船の天井にあく雨漏り穴へ、揺れを読んで木栓を投げ当てて塞ぐ
// 操作: 天井の穴(または染みが広がり始めた場所)をタップすると、船頭が木栓を投げる。船が揺れているので少し先を狙う
// 終わり: 18秒以内に10個塞げば成功。船底の水があふれる/時間切れで失敗
// @mechanic: aim_shoot
// @theme: houseboat_rain_leak_plugging
// 世界観: 大雨で増水した川に浮かぶ屋形船の中で、船頭が揺れる屋根裏にぽつぽつ開く雨漏り穴へ木栓を投げ当て、座敷が水浸しになる前に塞いでまわる
// 残るもの: 正誤(CLEAR/GAME OVER) + 塞いだ穴の数と命中率
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定5色 + 提灯の橙だけを強い差し色に
  var STYLE = { bg: ['#1b1f3b', '#2d3263', '#53a8b6'], main: ['#6e4a3a', '#a8765a', '#e8dcc2'], accent: ['#ff8c2a', '#ff4f5e'] };
  var N = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], water: STYLE.bg[2], plank: STYLE.main[0], plankHi: STYLE.main[1],
    paper: STYLE.main[2], lamp: STYLE.accent[0], alert: STYLE.accent[1], ok: '#8ee3a0', dark: '#0e1026',
  };

  var GAME_TITLE = 'RAIN PLUG';
  var TIME_LIMIT = 18;
  var NEEDED = 10;
  var FLIGHT = 0.28;
  var ROOF_TOP = Math.round(H * 0.16);
  var ROOF_BOT = Math.round(H * 0.5);
  var FLOOR_Y = Math.round(H * 0.62);
  var THROWER = { x: W / 2, y: Math.round(H * 0.8) };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var now = S.ATTRACT;
  var saved = false;

  var holes, pegs, shots, flood, plugged, thrown, hits, clockLeft, ready, hold, done, wrapT, rock, spawnGap, calloutGiven, focusHole, runT;

  function show(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: N.dark, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var BOATMAN_A = ['...kkkk...', '..kkkkkk..', 'kkkkkkkkkk', '...ffff...', '...ffff...', '..bbbbbb..', '.bbbbbbbb.', 'ff.bbbb.ff', '...bbbb...', '...b..b...'];
  var BOATMAN_B = ['...kkkk..f', '..kkkkkkf.', 'kkkkkkkkkk', '...ffff...', '...ffff...', '..bbbbbb..', '.bbbbbbbb.', 'f..bbbb...', '...bbbb...', '...b..b...'];
  var BOAT_PAL = { k: '#c9a860', f: '#f0c8a0', b: '#2d5a8c' };
  var PEG = ['.pp.', 'pppp', '.pp.', '.pp.', '.pp.'];
  var LANTERN = ['.oooo.', 'oooooo', 'oyyyyo', 'oooooo', 'oyyyyo', 'oooooo', '.oooo.'];

  function swayAt(t) {
    var amp = 70 + Math.min(1, runT / TIME_LIMIT) * 110;
    return amp * Math.sin(t * 1.9) + amp * 0.3 * Math.sin(t * 3.3 + 1);
  }

  function initGame() {
    holes = []; pegs = []; shots = []; flood = 0; plugged = 0; thrown = 0; hits = 0;
    clockLeft = TIME_LIMIT; ready = 0.8; hold = 0; done = false; wrapT = 0; rock = 0;
    spawnGap = 0.3; calloutGiven = false; focusHole = null; runT = 0; saved = false;
  }

  function openHole() {
    if (holes.length >= 5) return;
    var wx, wy, tries = 0;
    do {
      wx = game.random(170, W - 170); wy = game.random(ROOF_TOP + 90, ROOF_BOT - 70); tries++;
      var clash = false;
      for (var i = 0; i < holes.length; i++) if (Math.hypot(holes[i].wx - wx, holes[i].wy - wy) < 170) clash = true;
    } while (clash && tries < 8);
    holes.push({ wx: wx, wy: wy, age: 0, warn: 0.7 });
    game.audio.tone('B5', 0.05, { wave: 'square', volume: 0.05 });
  }

  function holeScreenX(h, t) { return h.wx + swayAt(t); }

  function throwPeg(x, y) {
    shots.push({ tx: x, ty: y, t: 0 });
    thrown++;
    game.audio.play('se_jump', 0.3);
  }

  // 着弾判定。戻り値 {kind:'early'|'hit'|'miss', x, y}
  function landPeg(s) {
    var tt = game.time.elapsed;
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      var hx = holeScreenX(h, tt);
      if (Math.hypot(hx - s.tx, h.wy - s.ty) < 66) {
        holes.splice(i, 1);
        pegs.push({ wx: h.wx, wy: h.wy });
        return { kind: h.age < h.warn ? 'early' : 'hit', x: hx, y: h.wy };
      }
    }
    return { kind: 'miss', x: s.tx, y: s.ty };
  }

  function stepShots(dt, cb) {
    for (var i = shots.length - 1; i >= 0; i--) {
      shots[i].t += dt;
      if (shots[i].t >= FLIGHT) { var s = shots[i]; shots.splice(i, 1); cb(landPeg(s)); }
    }
  }

  function stepHoles(dt) {
    var open = 0;
    for (var i = 0; i < holes.length; i++) {
      holes[i].age += dt;
      if (holes[i].age >= holes[i].warn) open++;
    }
    return open;
  }

  function finish(win) {
    if (done) return;
    done = true; saved = win; wrapT = 1.3;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.5);
  }

  function onLanding(r) {
    if (done) return;
    if (r.kind === 'miss') {
      game.feedback.bad(r.x, r.y, { text: 'MISS', color: N.alert, size: 40, count: 5 });
      return;
    }
    plugged++; hits++;
    if (r.kind === 'early') game.feedback.good(r.x, r.y, { text: 'PERFECT', color: N.lamp, size: 46 });
    else game.feedback.good(r.x, r.y, { text: 'GOOD', color: N.ok, size: 42 });
    flood = Math.max(0, flood - 0.04);
    if (!calloutGiven && plugged === 5) {
      calloutGiven = true;
      game.fx.popup('NICE', W / 2, H * 0.3, { color: N.lamp, size: 72 });
      game.audio.play('se_milestone', 0.45);
    }
    if (plugged >= NEEDED) {
      hold = 0.35; focusHole = { x: r.x, y: r.y, t: 0 };
      game.fx.burst(r.x, r.y, { color: N.lamp, count: 28, speed: 460 });
      finish(true);
    }
  }

  game.onTap(function(x, y) {
    if (now === S.ATTRACT) { game.audio.play('se_coin'); now = S.PLAYING; initGame(); return; }
    if (now === S.RESULT) { now = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done) return;
    if (ready > 0 || shots.length >= 2) { game.audio.play('se_tap', 0.12); game.fx.burst(x, y, { color: N.paper, count: 3, speed: 90 }); return; }
    game.audio.play('se_tap', 0.1);
    throwPeg(x, Math.min(y, ROOF_BOT + 40));
  });

  // ---- 描画 ----
  function cabin() {
    var t = game.time.elapsed;
    var sw = swayAt(t);
    game.draw.gradient(0, H, [[0, N.night], [0.5, N.dusk], [1, N.night]]);
    // 窓の外の雨
    for (var r = 0; r < 26; r++) {
      var rx = (r * 83 + t * 120) % W;
      var ry = (r * 211 + t * 1400) % (H * 0.3);
      game.draw.rect(rx, ROOF_BOT + 10 + ry * 0.3, 3, 26, N.water, 0.5);
    }
    // 屋根の板(揺れで横に流れる)
    for (var y = ROOF_TOP; y < ROOF_BOT; y += 40) {
      game.draw.rect(0, y, W, 36, (y / 40) % 2 ? N.plank : N.plankHi);
      for (var b = -1; b < 6; b++) game.draw.rect(((b * 240 + sw + (y % 80) * 1.5) % (W + 240)), y, 6, 36, N.dark, 0.5);
    }
    game.draw.rect(0, ROOF_BOT, W, 16, N.dark);
    // 提灯
    var lx = W * 0.85 + sw * 0.5, ly = ROOF_BOT + 90 + Math.sin(t * 1.9) * 8;
    game.draw.line(W * 0.85, ROOF_BOT, lx, ly - 40, N.dark, 4);
    game.draw.circle(lx, ly, 70, N.lamp, 0.15 + 0.08 * Math.sin(t * 4));
    game.draw.sprite(LANTERN, { o: N.lamp, y: '#ffd9a0' }, lx, ly, 12, { anchor: 'center' });
    // 座敷と浸水
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#3a2e2a');
    for (var tt = 0; tt < 4; tt++) game.draw.rect(tt * 270 + 10, FLOOR_Y + 20, 250, 180, '#a89a6a', 0.8);
    var lvl = flood * 260;
    if (lvl > 1) {
      game.draw.rect(0, FLOOR_Y + 220 - lvl, W, lvl, N.water, 0.75);
      for (var wv = 0; wv < 8; wv++) game.draw.rect((wv * 150 + t * 80) % W, FLOOR_Y + 220 - lvl, 70, 6, N.paper, 0.5);
    }
    game.draw.rect(0, FLOOR_Y + 220, W, H - FLOOR_Y - 220, '#241c1a');
  }

  function drawHoles() {
    var t = game.time.elapsed;
    for (var i = 0; i < pegs.length; i++) {
      game.draw.sprite(PEG, { p: N.paper }, pegs[i].wx + swayAt(t), pegs[i].wy, 12, { anchor: 'center' });
    }
    for (var h = 0; h < holes.length; h++) {
      var ho = holes[h];
      var hx = holeScreenX(ho, t);
      if (ho.age < ho.warn) {
        var k = ho.age / ho.warn;
        game.draw.circle(hx, ho.wy, 20 + k * 30, N.dark, 0.3 + k * 0.4);
        if (Math.floor(t * 12) % 2 === 0) game.draw.circle(hx, ho.wy, 56, N.alert, 0.35);
      } else {
        game.draw.circle(hx, ho.wy, 46, N.dark);
        game.draw.circle(hx, ho.wy, 30, N.water);
        var dropY = ((t * 900 + h * 173) % (FLOOR_Y + 200 - ho.wy));
        game.draw.rect(hx - 5, ho.wy + 40, 10, dropY * 0.6, N.water, 0.7);
        game.draw.circle(hx, ho.wy + 40 + dropY, 11, N.water);
      }
    }
  }

  function drawShots() {
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i], k = s.t / FLIGHT;
      var px = THROWER.x + (s.tx - THROWER.x) * k;
      var py = THROWER.y - 120 + (s.ty - THROWER.y + 120) * k - Math.sin(k * 3.14) * 120;
      game.draw.sprite(PEG, { p: N.paper }, px, py, 10, { anchor: 'center' });
      game.draw.circle(s.tx, s.ty, 16 + (1 - k) * 30, N.lamp, 0.25);
    }
  }

  function drawBoatman(throwing) {
    var fr = throwing ? BOATMAN_B : BOATMAN_A;
    game.draw.sprite(fr, BOAT_PAL, THROWER.x, THROWER.y + Math.sin(game.time.elapsed * 1.9) * 8, 18, { anchor: 'center' });
    for (var i = 0; i < 4; i++) game.draw.sprite(PEG, { p: N.paper }, THROWER.x + 170 + i * 40, THROWER.y + 70, 8, { anchor: 'center' });
  }

  function drawHud() {
    show(plugged + ' / ' + NEEDED, W / 2, 62, 46, N.paper);
    game.draw.rect(80, 110, W - 160, 20, N.dark);
    var blink = clockLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(84, 114, (W - 168) * Math.max(0, clockLeft / TIME_LIMIT), 12, blink ? N.alert : N.lamp);
    // 浸水メーター(75%超で点滅予告)
    game.draw.rect(W - 70, FLOOR_Y + 10, 36, 240, N.dark);
    var fcol = flood > 0.75 && Math.floor(game.time.elapsed * 10) % 2 === 0 ? N.alert : N.water;
    game.draw.rect(W - 64, FLOOR_Y + 16 + 228 * (1 - flood), 24, 228 * flood, fcol);
  }

  // ---- ATTRACT: 揺れを読んで先を狙う命中2回 → 今の位置を狙って外す1回 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.4, press: false, n: 0, next: 0.5 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; runT = 6; demo.n = 0; demo.next = 0.7;
      holes.push({ wx: W * 0.35, wy: ROOF_TOP + 200, age: 0.8, warn: 0.7 });
      holes.push({ wx: W * 0.68, wy: ROOF_TOP + 420, age: 0.3, warn: 0.7 });
      holes.push({ wx: W * 0.5, wy: ROOF_TOP + 300, age: 0, warn: 0.7 });
    }
    stepHoles(dt);
    demo.press = false;
    var tgt = holes[0];
    if (tgt) {
      var lead = demo.n === 2 ? 0 : FLIGHT;
      demo.gx = holeScreenX(tgt, game.time.elapsed + lead) + (demo.n === 2 ? -90 : 0);
      demo.gy = tgt.wy;
      if (cyc >= demo.next && demo.n < 3) {
        throwPeg(demo.gx, demo.gy);
        demo.press = true; demo.n++; demo.next = cyc + 0.9;
      }
    }
    stepShots(dt, function(r) {
      if (r.kind === 'miss') { game.fx.burst(r.x, r.y, { color: N.alert, count: 8, speed: 220 }); game.audio.play('se_bad', 0.15); }
      else { game.fx.burst(r.x, r.y, { color: N.ok, count: 10, speed: 260 }); game.audio.play('se_good', 0.18); }
    });
  }

  game.onUpdate(function(dt) {
    if (now === S.ATTRACT) {
      stepDemo(dt);
      cabin();
      drawHoles();
      drawShots();
      drawBoatman(shots.length > 0);
      game.draw.hand(demo.gx, demo.gy + 10, { press: demo.press || shots.length > 0, scale: 13 });
      show(GAME_TITLE, W / 2, 80, 76, N.lamp);
      show('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 150, 34, N.paper);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) show('► 100円 投入 ◄', W / 2, H * 0.94, 44, N.lamp);
      else show('INSERT COIN', W / 2, H * 0.94, 34, N.paper);
      return;
    }

    if (now === S.RESULT) {
      cabin();
      drawHoles();
      drawBoatman(false);
      var acc = thrown > 0 ? Math.round(hits / thrown * 100) : 0;
      var sc = plugged * 100 + acc * 2;
      show(saved ? 'CLEAR' : (clockLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, 420, 92, saved ? N.ok : N.alert);
      show('SCORE ' + sc, W / 2, 530, 50, N.paper);
      show(acc + '%', W / 2, 610, 42, N.lamp);
      if (saved && sc >= game.best) show('NEW RECORD', W / 2, 690, 50, N.lamp);
      else show('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 690, 36, N.paper);
      if (!saved) show('あと' + (NEEDED - plugged) + '個!', W / 2, 780, 50, N.lamp);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) show('TAP TO CONTINUE', W / 2, H * 0.94, 34, N.paper);
      return;
    }

    if (done) {
      if (hold > 0) { hold -= dt; if (focusHole) focusHole.t += dt; }
      else {
        wrapT -= dt;
        if (wrapT <= 0) {
          now = S.RESULT;
          var accuracy = thrown > 0 ? Math.round(hits / thrown * 100) : 0;
          if (saved) game.end.success(plugged * 100 + accuracy * 2, { plugged: plugged, thrown: thrown, accuracy: accuracy });
          else game.end.failure({ plugged: plugged, thrown: thrown, accuracy: accuracy });
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      clockLeft -= dt; runT += dt;
      spawnGap -= dt;
      if (spawnGap <= 0) { openHole(); spawnGap = Math.max(0.75, 1.5 - runT * 0.05); }
      var open = stepHoles(dt);
      stepShots(dt, onLanding);
      flood = Math.max(0, flood + (open * 0.05 - 0.02) * dt);
      if (!done && flood >= 1) {
        flood = 1; hold = 0.5;
        var worst = holes[0] || { wx: W / 2, wy: ROOF_BOT };
        focusHole = { x: holeScreenX(worst, game.time.elapsed), y: worst.wy, t: 0 };
        game.feedback.bad(W / 2, FLOOR_Y + 100, { text: 'MISS', color: N.alert });
        game.fx.shake(14, 0.4);
        finish(false);
      }
      if (!done && clockLeft <= 0) {
        clockLeft = 0; hold = 0.45;
        var hh = holes[0] || { wx: W / 2, wy: ROOF_BOT - 60 };
        focusHole = { x: holeScreenX(hh, game.time.elapsed), y: hh.wy, t: 0 };
        game.feedback.bad(W / 2, H * 0.35, { text: 'TIME UP', color: N.alert });
        finish(false);
      }
    }

    cabin();
    drawHoles();
    drawShots();
    if (done && hold > 0 && focusHole) game.draw.circle(focusHole.x, focusHole.y, 70 + focusHole.t * 120, '#ffffff', 0.5);
    drawBoatman(shots.length > 0);
    drawHud();
    if (ready > 0) show(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, N.lamp);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.75], ['C5', 0.25], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['E4', 1], [null, 1],
    ], { tempo: 116, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 2], ['E2', 2], ['G2', 2], ['E2', 2]] });
    now = S.ATTRACT;
    initGame();
  });
})(game);
