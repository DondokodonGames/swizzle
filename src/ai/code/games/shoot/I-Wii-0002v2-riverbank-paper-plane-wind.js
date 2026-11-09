// I-Wii-0002v2-riverbank-paper-plane-wind.js
// 紙飛行機の風よみ — 吹き流しで風の向きと強さを読み、流される分だけ狙いをずらしてタップし、揺れる輪の的に紙飛行機をくぐらせる
// 操作: 画面のどこかをタップすると、少年がその点めがけて紙飛行機を投げる。飛んでいる間ずっと横風に流される(遠い的ほど飛ぶ時間が長く、大きく流される)。吹き流しのなびく向きの反対側へ狙いをずらし、揺れている輪の先回りもする。1機ずつ投げる(社内メモ。画面には出さない)
// 終わり: 紙飛行機8機のうち5機を輪に通せばCLEAR。8機を投げ切っても5機に届かない、または18秒を超えるとGAME OVER
// @mechanic: aim_shoot
// @theme: autumn_riverbank_paper_plane_meet
// 世界観: 秋の河原の紙飛行機大会で、少年が土手から川風を読み、竹竿に吊られて揺れる輪の的へ自作の紙飛行機を次々とくぐらせていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪に通した数・ど真ん中の数・スコア
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横ストリップを奥ほど圧縮して床を描く。地平線から上は空グラデ
  var STYLE = { bg: ['#f8c890', '#7ab0e0'], main: ['#c8b060', '#8aa850', '#4a88c8'], accent: ['#ff5a3a', '#ffffff'] };
  var C = {
    grassA: STYLE.main[0], grassB: STYLE.main[1], river: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    ink: '#2a2a3a', pole: '#c89a4a', ring: '#ff5a3a', gold: '#ffd84a', sky: '#9ac8f0', far: '#8a9ab8',
  };

  var GAME_TITLE = 'KAMI HIKOKI';
  var TIME_LIMIT = 18;
  var PLANES = 8;
  var NEEDED = 5;
  var HY = 600;
  var BOYX = W / 2, BOYY = 1600;
  var DRIFT = 300;
  // 的の配置: 奥行き(z)と揺れ幅。投げるほど風が強く、輪が小さく遠く、よく揺れる
  var TARGETS = [
    { x: 0.0, z: 2.4, sway: 0.0, wind: 0.25 },
    { x: -0.3, z: 3.0, sway: 0.25, wind: 0.4 },
    { x: 0.35, z: 2.2, sway: 0.4, wind: 0.55 },
    { x: -0.2, z: 3.8, sway: 0.3, wind: 0.6 },
    { x: 0.2, z: 3.2, sway: 0.55, wind: 0.75 },
    { x: -0.35, z: 4.4, sway: 0.45, wind: 0.85 },
    { x: 0.1, z: 3.6, sway: 0.7, wind: 0.95 },
    { x: 0.0, z: 4.8, sway: 0.6, wind: 1.0 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var tg, tIdx, ringT, wind, windShown, plane, thrown, hitsN, centers, combo, score, finalScore, nearest, timeLeft, readyT, stopT, stopKind, fin, cleared, postT, warnT, joyT, sadT, milestone, scroll, fluff, lastMiss;

  var BOY_A = ['..hhhh..', '.hhhhhh.', '.hssssh.', '..skks..', '..ssss..', '.bbbbbb.', 'sbbbbbbs', '..bbbb..', '..nnnn..', '..n..n..', '.kk..kk.'];
  var BOY_THROW = ['..hhhh.s', '.hhhhhhs', '.hssssbs', '..skksb.', '..ssssb.', '.bbbbbb.', 'sbbbbbb.', '..bbbb..', '..nnnn..', '..n..n..', '.kk..kk.'];
  var BOY_JOY = ['s.hhhh.s', 'shhhhhhs', '.hssssh.', '..s..s..', '..smms..', '.bbbbbb.', '.bbbbbb.', '..bbbb..', '..nnnn..', '.n....n.', 'kk....kk'];
  var BOY_SAD = ['........', '..hhhh..', '.hhhhhh.', '.hssssh.', '..skks..', '..skks..', '.bbbbbb.', 'sbbbbbbs', '..nnnn..', '..n..n..', '.kk..kk.'];
  var BOY_PAL = { h: '#3a2a1a', s: '#f8c8a0', k: '#2a2a3a', b: '#3a8ad8', n: '#2a3a5a', m: '#d84a3a' };
  var PLANE_C = ['....w....', '...www...', '..wwwww..', '.wwwgwww.', 'wwww.wwww', '....w....'];
  var PLANE_L = ['ww.......', '.wwww....', '..wwwww..', '...wwgww.', '....www..', '.....w...'];
  var PLANE_R = ['.......ww', '....wwww.', '..wwwww..', '.wwgwww..', '..www....', '...w.....'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#2a2a3a88', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function proj(x, z, h) { return { x: W / 2 + x * 900 / z, y: HY + (1100 - h * 700) / z, s: 1 / z }; }

  function ringPos(t) {
    var sw = tg.sway * Math.sin(t * (1.6 + tIdx * 0.12) + tIdx);
    return proj(tg.x + sw, tg.z, 1.0);
  }
  function flightT(ay) { return 0.45 + Math.max(0, (BOYY - ay)) / 1000 * 1.0; }

  function setupTarget(k) {
    tIdx = k; tg = TARGETS[Math.min(k, TARGETS.length - 1)]; ringT = 0;
    wind = tg.wind * (Math.random() < 0.5 ? -1 : 1);
    game.audio.tone('D4', 0.25, { wave: 'triangle', volume: 0.05, slide: wind > 0 ? 120 : -120 });
  }

  function initGame() {
    hitsN = 0; centers = 0; combo = 0; score = 0; finalScore = 0; thrown = 0; nearest = 0; lastMiss = 0;
    plane = null; windShown = 0; scroll = 0; fluff = [];
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0; warnT = 0; joyT = 0; sadT = 0; milestone = false;
    for (var i = 0; i < 14; i++) fluff.push({ x: game.random(0, W), y: game.random(HY + 40, 1500), v: game.random(0.6, 1.4) });
    setupTarget(0);
  }

  // 投げる(本番もデモも同じ)
  function throwAt(ax, ay) {
    if (plane || thrown >= PLANES) return false;
    ay = Math.max(HY + 60, Math.min(BOYY - 200, ay));
    plane = { ax: ax, ay: ay, t: 0, T: flightT(ay), x: BOYX + 60, y: BOYY - 120, w: wind, done: false };
    thrown++;
    game.audio.play('se_jump', 0.35);
    return true;
  }

  function landPlane() {
    var p = plane, r = ringPos(game.time.elapsed), rr = 330 * r.s;
    var d = Math.hypot(p.x - r.x, p.y - r.y);
    p.done = true; p.dt = 0;
    if (d < rr) {
      hitsN++; combo++; joyT = 0.8;
      var center = d < rr * 0.4;
      if (center) centers++;
      var pts = (center ? 400 : 250) * Math.min(3, combo);
      score += pts;
      p.hit = true;
      game.feedback.good(r.x, r.y, { text: center ? 'PERFECT' : 'GOOD', color: C.gold, size: 62 });
      game.fx.popup('+' + pts, r.x + 160, r.y - 120, { color: C.white, size: 44 });
      if (combo >= 2) game.fx.popup('x' + Math.min(3, combo), r.x - 160, r.y - 120, { color: C.red, size: 48 });
      if (mode === S.PLAYING && !milestone && hitsN >= 3) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 84 }); }
      if (mode === S.PLAYING && hitsN >= NEEDED && stopT <= 0) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.45); }
    } else {
      combo = 0; sadT = 0.8; p.hit = false;
      var miss = Math.round((d - rr) / Math.max(0.15, r.s) / 10);
      lastMiss = Math.max(1, miss);
      if (!nearest || lastMiss < nearest) nearest = lastMiss;
      game.audio.play('se_break', 0.2);
      if (mode === S.PLAYING && (thrown >= PLANES && hitsN < NEEDED)) {
        stopT = 0.55; stopKind = 'miss'; p.culprit = true;
        game.fx.flash('#ffffff', 0.2);
      } else {
        game.feedback.bad(p.x, p.y, { text: 'MISS', color: C.red, size: 54 });
        game.fx.popup('あと' + lastMiss + 'cm', p.x, p.y - 90, { color: C.white, size: 40 });
      }
    }
  }

  function stepWorld(dt) {
    ringT += dt; scroll += dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    windShown += (wind - windShown) * Math.min(1, dt * 3);
    for (var i = 0; i < fluff.length; i++) {
      var f = fluff[i];
      f.x += windShown * 260 * f.v * dt; f.y += Math.sin(scroll * 2 + i) * 20 * dt;
      if (f.x > W + 20) f.x = -20; if (f.x < -20) f.x = W + 20;
    }
    if (plane) {
      var p = plane;
      if (!p.done) {
        p.t += dt;
        var u = Math.min(1, p.t / p.T);
        // まっすぐ狙った点へ向かいつつ、飛んでいる時間ぶん横風に流される
        var bx = BOYX + 60 + (p.ax - BOYX - 60) * u, by = BOYY - 120 + (p.ay - BOYY + 120) * u - Math.sin(u * Math.PI) * 140;
        p.x = bx + p.w * DRIFT * p.T * u * u; p.y = by;
        if (Math.random() < 0.2) game.audio.tone(700 + u * 300, 0.02, { wave: 'triangle', volume: 0.02 });
        if (u >= 1) landPlane();
      } else {
        p.dt += dt;
        if (!p.hit) p.y += 500 * dt;
        if (p.dt > 0.7 && stopT <= 0) {
          plane = null;
          if (p.hit && tIdx < TARGETS.length - 1) setupTarget(tIdx + 1);
          else if (!p.hit) { wind = (Math.abs(wind) + 0.05) * (Math.random() < 0.5 ? -1 : 1); game.audio.tone('D4', 0.25, { wave: 'triangle', volume: 0.05, slide: wind > 0 ? 120 : -120 }); }
        }
      }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 + (PLANES - thrown) * 150 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.4 + (i % 2) * 160, { color: i % 2 ? C.gold : C.white, count: 18, speed: 520 });
      game.fx.flash(C.white, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) return;
    if (!throwAt(x, y)) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.white, count: 3, speed: 100 }); }
  });

  // ---- 描画 ----
  function streamer(x, z, t) {
    var b = proj(x, z, 0), top = proj(x, z, 1.8);
    game.draw.line(b.x, b.y, top.x, top.y, C.pole, Math.max(2, 10 * b.s));
    var len = (60 + Math.abs(windShown) * 220) * b.s * 2, dir = windShown >= 0 ? 1 : -1;
    for (var k = 0; k < 5; k++) {
      var wob = Math.sin(t * 9 + k + x * 3) * 10 * b.s;
      game.draw.rect(dir > 0 ? top.x + k * len / 5 : top.x - (k + 1) * len / 5, top.y + wob, len / 5 + 1, 24 * b.s + 4, k % 2 ? C.white : C.red);
    }
  }

  function scene(t) {
    game.draw.gradient(0, HY, [[0, STYLE.bg[1]], [0.75, C.sky], [1, STYLE.bg[0]]]);
    // 遠景: 向こう岸の山と鉄橋
    for (var m = 0; m < 7; m++) game.draw.circle(m * 180, HY + 30, 150 + (m % 3) * 40, C.far, 0.8);
    game.draw.rect(0, HY - 70, W, 14, '#6a6a7a');
    for (var b = 0; b < 12; b++) game.draw.line(b * 100, HY - 56, b * 100 + 50, HY - 10, '#6a6a7a', 6);
    // MODE7 床: 奥ほど圧縮した帯
    for (var y = HY; y < H; y += 6) {
      var z = 1100 / (y - HY + 1);
      var band = Math.floor(z * 3 + scroll * 0.5) % 2;
      var col = (z > 5.2 && z < 6.6) ? (band ? C.river : '#5a98d8') : (band ? C.grassA : C.grassB);
      game.draw.rect(0, y, W, 6, col);
    }
    // 吹き流し(奥と手前)
    streamer(-0.75, 5.5, t); streamer(0.8, 3.0, t); streamer(-0.9, 1.6, t);
    for (var i = 0; i < fluff.length; i++) game.draw.circle(fluff[i].x, fluff[i].y, 6, C.white, 0.7);
  }

  function drawRing(t) {
    var r = ringPos(game.time.elapsed), rr = 330 * r.s;
    var base = proj(tg.x, tg.z, 0);
    var big = stopT > 0 && stopKind === 'miss';
    // 竹竿と吊り糸
    game.draw.line(base.x - 260 * r.s, base.y, base.x - 260 * r.s, r.y - rr - 150 * r.s, C.pole, Math.max(3, 14 * r.s));
    game.draw.line(base.x - 260 * r.s, r.y - rr - 150 * r.s, r.x, r.y - rr - 150 * r.s, C.pole, Math.max(2, 10 * r.s));
    game.draw.line(r.x, r.y - rr - 150 * r.s, r.x, r.y - rr, C.ink, 3);
    game.draw.circle(base.x, base.y, 120 * r.s, '#000000', 0.2);
    // 輪(太い赤の輪 + 白縁 + 明滅)
    var on = Math.floor(t * 4) % 2 === 0;
    for (var k = 0; k < 28; k++) {
      var a1 = k / 28 * Math.PI * 2, a2 = (k + 1) / 28 * Math.PI * 2;
      game.draw.line(r.x + Math.cos(a1) * rr, r.y + Math.sin(a1) * rr, r.x + Math.cos(a2) * rr, r.y + Math.sin(a2) * rr, C.white, Math.max(6, 70 * r.s));
      game.draw.line(r.x + Math.cos(a1) * rr, r.y + Math.sin(a1) * rr, r.x + Math.cos(a2) * rr, r.y + Math.sin(a2) * rr, big && on ? C.white : (k % 4 < 2 ? C.ring : C.gold), Math.max(4, 50 * r.s));
    }
    if (on) game.draw.circle(r.x, r.y, rr * 0.4, C.gold, 0.25);
  }

  function drawPlane(t) {
    if (!plane) return;
    var p = plane, u = p.done ? 1 : Math.min(1, p.t / p.T);
    var sc = 13 - u * 8 * (1 - (p.ay - HY) / (BOYY - HY));
    var spr = p.w > 0.2 ? PLANE_R : p.w < -0.2 ? PLANE_L : PLANE_C;
    var big = p.culprit && stopT > 0;
    var hl = big && Math.floor(t * 16) % 2 === 0;
    game.draw.circle(p.x, p.y + 40 + (1 - u) * 60, 20 * sc / 10, '#000000', 0.2);
    game.draw.sprite(spr, { w: hl ? '#ffff80' : C.white, g: C.red }, p.x, p.y, big ? sc * 2 : Math.max(4, sc), { anchor: 'center' });
    if (p.done && !p.hit) game.draw.circle(p.x, p.y + 30, 30 + p.dt * 60, C.white, 0.3 * Math.max(0, 1 - p.dt));
  }

  function drawBoy(t) {
    var throwing = plane && !plane.done && plane.t < 0.25;
    var fr = (sadT > 0 || (fin && !cleared)) ? BOY_SAD : (joyT > 0 || (fin && cleared)) ? BOY_JOY : throwing ? BOY_THROW : BOY_A;
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 10)) * 26 : Math.sin(t * 2.4) * 4;
    game.draw.circle(BOYX, BOYY + 90, 90, '#000000', 0.25);
    game.draw.sprite(fr, BOY_PAL, BOYX, BOYY + hop, 15, { anchor: 'center' });
    // 手に持った次の紙飛行機
    if (!plane && thrown < PLANES) game.draw.sprite(PLANE_C, { w: C.white, g: C.red }, BOYX + 100, BOYY - 60 + hop, 10, { anchor: 'center' });
    // 残りの紙飛行機(足元)
    for (var i = 0; i < PLANES - thrown; i++) game.draw.sprite(PLANE_C, { w: C.white, g: C.red }, 120 + (i % 4) * 90, 1720 + Math.floor(i / 4) * 70, 7, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 220, '#2a2a3a', 0.35);
    game.draw.rect(70, 36, W - 140, 26, '#00000055');
    game.draw.rect(76, 42, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 14, low ? C.red : C.white);
    out(hitsN + ' / ' + NEEDED, W / 2, 160, 60, C.white);
    out('' + score, 150, 160, 40, C.gold);
    // 吹き流しの計器: 向き=なびく側、長さ=強さ
    var cx = W - 200, dir = windShown >= 0 ? 1 : -1, len = 30 + Math.abs(windShown) * 130;
    game.draw.line(cx, 100, cx, 190, C.pole, 8);
    for (var k = 0; k < 4; k++) game.draw.rect(dir > 0 ? cx + k * len / 4 : cx - (k + 1) * len / 4, 100 + Math.sin(t * 10 + k) * 5, len / 4 + 1, 30, k % 2 ? C.white : C.red);
  }

  function drawScene(t) {
    scene(t);
    drawRing(t);
    drawPlane(t);
    drawBoy(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.04);
  }

  // ---- ATTRACT: 本物の throwAt()。1機目は風と揺れを読んで輪に通す → 2機目は輪の真ん中を狙って風に流される ----
  var demo = { t: 0, x: W / 2, y: H * 0.6, press: false, pt: 0, n: 0, wait: 0.9 };
  function aimFor(compensate) {
    var r0 = ringPos(game.time.elapsed);
    var T = flightT(r0.y);
    var r1 = ringPos(game.time.elapsed + T);
    return { x: compensate ? r1.x - wind * DRIFT * T : r0.x, y: r1.y };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.n = 0; demo.wait = 0.9; }
    stepWorld(dt);
    if (demo.pt > 0) demo.pt -= dt;
    if (!plane && thrown < PLANES) {
      var a = aimFor(demo.n % 2 === 0);
      demo.x += (a.x - demo.x) * Math.min(1, dt * 6); demo.y += (a.y - demo.y) * Math.min(1, dt * 6);
      demo.wait -= dt;
      if (demo.wait <= 0) { throwAt(a.x, a.y); demo.n++; demo.pt = 0.25; demo.wait = 1.2; }
    }
    demo.press = demo.pt > 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 240, '#2a2a3a', 0.35);
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 5, 100, C.white);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 200, 40, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.white);
      else out('TAP TO START', W / 2, H * 0.975, 42, C.gold);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#2a2a3a', 0.85);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, cleared ? C.gold : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.white);
      out(hitsN + ' / ' + NEEDED + '   PERFECT ' + centers, W / 2, H * 0.47, 42, C.gold);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.white);
      if (!cleared) out('あと' + Math.max(1, NEEDED - hitsN) + '機!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { rings: hitsN, perfects: centers, thrown: thrown, nearestMissCm: nearest };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else {
          var px = plane ? plane.x : W / 2, py = plane ? plane.y : H / 2;
          game.feedback.bad(px, py, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: C.red, size: 62 });
          ending(false);
        }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepWorld(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') { var rp = ringPos(game.time.elapsed); game.draw.circle(rp.x, rp.y, 100 + (0.45 - stopT) * 1500, C.white, 0.3); }
    // 1機目だけ: 輪の風上側を指す手のお手本
    if (!fin && readyT <= 0 && thrown === 0 && !plane) {
      var a = aimFor(true);
      game.draw.hand(a.x, a.y + Math.sin(t * 6) * 10, { press: Math.sin(t * 6) > 0.7, scale: 11, alpha: 0.45 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.white);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 2],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 0.5], ['G5', 1.5],
    ], { tempo: 126, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
