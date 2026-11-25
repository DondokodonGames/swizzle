// I-GBA-0030v2-mikan-seam-slice.js
// 蜜柑の筋むき — 放射状に走る皮の筋に沿って、中心から外へすっと素早い線を引き、一枚ずつ皮を切り分ける
// 操作: 蜜柑のへそから外へ伸びる筋の上を、筋と同じ向きに素早くなぞる(なぞり線で切る)。筋を外れて果肉を横切ると汁が飛ぶ
// 終わり: 14秒以内に筋を12本切れば成功(蜜柑3個)。果肉を3回傷つける/時間切れで失敗
// @mechanic: slice
// @theme: winter_fruit_shop_mikan_peel
// 世界観: 冬の果物屋の店先で、女将が試食用の蜜柑を筋に沿ってすっすっと切り分けてむき、回る皿の上で次々と花むきに仕上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 切った筋の本数と最大コンボ
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = { bg: ['#2ec4ff', '#ffffff', '#ff3d7f'], main: ['#ff9a1a', '#ffd23a', '#fff3c4'], accent: ['#00e07a', '#ff2a3a'] };
  var M = {
    sky: STYLE.bg[0], snow: STYLE.bg[1], awning: STYLE.bg[2], peel: STYLE.main[0], peelHi: STYLE.main[1],
    pith: STYLE.main[2], ok: STYLE.accent[0], ng: STYLE.accent[1], ink: '#1a1033', wood: '#9a5a2a',
  };

  var GAME_TITLE = 'MIKAN SLICE';
  var TIME_LIMIT = 14;
  var NEEDED = 12;
  var HURT_MAX = 3;
  var FRUIT_SEAMS = [3, 4, 5];
  var FRUIT_SPIN = [0, 0.35, 0.7];
  var C0 = { x: W / 2, y: Math.round(H * 0.45) };
  var R = 290;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var cur = S.ATTRACT;
  var peeledAll = false;

  var fruit, fruitIdx, cuts, hurt, combo, maxCombo, lastCut, secs, readyIn, stopFor, fin, postT, stroke, trail, slideIn, milestoneHit, spotlight;

  function out(str, x, y, sz, color) {
    game.draw.text(str, x - 3, y, { size: sz, color: M.ink, bold: true, align: 'center' });
    game.draw.text(str, x + 3, y, { size: sz, color: M.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y + 4, { size: sz, color: M.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var OKAMI_A = ['...kkkk...', '..kkkkkk..', '...ffff...', '...f..f...', '...ffff...', '..wwwwww..', '.wwppppww.', 'ff.pppp.ff', '...pppp...', '...p..p...'];
  var OKAMI_B = ['...kkkk...', '..kkkkkk..', '...ffff...', '...f..f...', '...ffff...', '..wwwwww.f', '.wwppppwf.', 'f..pppp...', '...pppp...', '...p..p...'];
  var OKAMI_PAL = { k: '#2a1a3a', f: '#ffd0a8', w: '#ffffff', p: '#3a6ad8' };
  var MINI = ['.gg.', 'oooo', 'oooo', '.oo.'];
  var FLAKE = ['.s.', 'sss', '.s.'];

  function makeFruit(i) {
    var n = FRUIT_SEAMS[i];
    var seams = [];
    for (var k = 0; k < n; k++) seams.push({ a: k / n * 6.2832 + game.random(-0.2, 0.2), cut: false, glow: 0 });
    return { n: n, seams: seams, rot: game.random(0, 6.28), spin: FRUIT_SPIN[i] * (i % 2 ? -1 : 1), popped: 0 };
  }

  function initGame() {
    fruitIdx = 0; fruit = makeFruit(0); cuts = 0; hurt = 0; combo = 0; maxCombo = 0; lastCut = -9;
    secs = TIME_LIMIT; readyIn = 0.8; stopFor = 0; fin = false; postT = 0; stroke = null; trail = [];
    slideIn = 0; milestoneHit = false; spotlight = null; peeledAll = false;
  }

  function seamAngle(s) { return s.a + fruit.rot; }

  function angleGap(a, b) {
    var d = Math.abs(((a - b) % Math.PI + Math.PI) % Math.PI);
    return Math.min(d, Math.PI - d);
  }

  // なぞり線の判定(本番もデモも同じ)。戻り値 {kind:'cut'|'flesh'|'air'|'slow', seam, x, y}
  function judgeStroke(x0, y0, x1, y1, dur) {
    var len = Math.hypot(x1 - x0, y1 - y0);
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var touchesFruit = Math.hypot(mx - C0.x, my - C0.y) < R + 30 || Math.hypot(x0 - C0.x, y0 - C0.y) < R || Math.hypot(x1 - C0.x, y1 - C0.y) < R;
    if (len < 150 || !touchesFruit) return { kind: 'air', x: mx, y: my };
    if (dur > 0.5) return { kind: 'slow', x: mx, y: my };
    var dir = Math.atan2(y1 - y0, x1 - x0);
    var best = null, bestScore = 1e9;
    for (var i = 0; i < fruit.seams.length; i++) {
      var s = fruit.seams[i];
      if (s.cut) continue;
      var a = seamAngle(s);
      var ux = Math.cos(a), uy = Math.sin(a);
      var along = (mx - C0.x) * ux + (my - C0.y) * uy;
      var perp = Math.abs(-(mx - C0.x) * uy + (my - C0.y) * ux);
      var gap = angleGap(dir, a);
      if (gap < 0.3 && perp < 70 && along > R * 0.1 && along < R + 80) {
        var sc = gap * 200 + perp;
        if (sc < bestScore) { bestScore = sc; best = s; }
      }
    }
    if (best) {
      best.cut = true; best.glow = 0.5;
      return { kind: 'cut', seam: best, x: mx, y: my };
    }
    return { kind: 'flesh', x: mx, y: my };
  }

  function fruitDone() {
    for (var i = 0; i < fruit.seams.length; i++) if (!fruit.seams[i].cut) return false;
    return true;
  }

  function nextFruit() {
    fruitIdx = (fruitIdx + 1) % FRUIT_SEAMS.length;
    fruit = makeFruit(fruitIdx);
    slideIn = 0.35;
  }

  function stepFruit(dt) {
    fruit.rot += fruit.spin * dt;
    for (var i = 0; i < fruit.seams.length; i++) if (fruit.seams[i].glow > 0) fruit.seams[i].glow -= dt;
    if (slideIn > 0) slideIn -= dt;
    for (var t = trail.length - 1; t >= 0; t--) { trail[t].life -= dt; if (trail[t].life <= 0) trail.splice(t, 1); }
  }

  function ending(win) {
    if (fin) return;
    fin = true; peeledAll = win; postT = 1.3;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.5);
  }

  function applyResult(r) {
    if (r.kind === 'air') { game.audio.play('se_tap', 0.1); return; }
    if (r.kind === 'slow') {
      game.audio.tone('C4', 0.1, { wave: 'triangle', volume: 0.06 });
      game.fx.popup('…', r.x, r.y - 40, { color: M.ink, size: 40 });
      combo = 0;
      return;
    }
    if (r.kind === 'flesh') {
      hurt++; combo = 0;
      game.feedback.bad(r.x, r.y, { text: 'MISS', color: M.ng, size: 48 });
      game.fx.burst(r.x, r.y, { color: M.peelHi, count: 14, speed: 360 });
      if (hurt >= HURT_MAX) { stopFor = 0.5; spotlight = { x: r.x, y: r.y, t: 0 }; ending(false); }
      return;
    }
    cuts++;
    var t = game.time.elapsed;
    combo = t - lastCut < 0.9 ? combo + 1 : 1;
    lastCut = t;
    if (combo > maxCombo) maxCombo = combo;
    game.feedback.good(r.x, r.y, { text: combo >= 3 ? 'COMBO ' + combo : (combo === 2 ? 'GREAT' : 'GOOD'), color: M.ok, size: 50 });
    game.fx.popup('+' + combo, r.x + 90, r.y - 70, { color: M.peelHi, size: 44 });
    if (fruitDone()) {
      game.audio.play('se_coin', 0.4);
      game.fx.burst(C0.x, C0.y, { color: M.peel, count: 24, speed: 480 });
      if (!milestoneHit) {
        milestoneHit = true;
        game.fx.popup('NICE', W / 2, H * 0.22, { color: M.peelHi, size: 80 });
        game.audio.play('se_milestone', 0.45);
      }
      if (cuts >= NEEDED) { stopFor = 0.35; spotlight = { x: C0.x, y: C0.y, t: 0 }; ending(true); return; }
      nextFruit();
    }
  }

  game.onPress(function(x, y) {
    if (cur !== S.PLAYING || fin || readyIn > 0) return;
    stroke = { x0: x, y0: y, x: x, y: y, t0: game.time.elapsed };
    trail.push({ x: x, y: y, life: 0.25 });
    game.audio.play('se_tap', 0.08);
  });

  game.onMove(function(x, y) {
    if (!stroke) return;
    stroke.x = x; stroke.y = y;
    trail.push({ x: x, y: y, life: 0.25 });
    if (trail.length % 4 === 0) game.audio.tone('A6', 0.02, { wave: 'sine', volume: 0.02, slide: 400 });
  });

  game.onRelease(function(x, y) {
    if (!stroke || cur !== S.PLAYING || fin) { stroke = null; return; }
    var st = stroke; stroke = null;
    if (slideIn > 0) { game.audio.play('se_tap', 0.1); return; }
    applyResult(judgeStroke(st.x0, st.y0, x, y, game.time.elapsed - st.t0));
  });

  game.onTap(function(x, y) {
    if (cur === S.ATTRACT) { game.audio.play('se_coin'); cur = S.PLAYING; initGame(); return; }
    if (cur === S.RESULT) { cur = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function shopfront() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, M.sky], [0.6, '#9fe6ff'], [1, '#ffe2f0']]);
    for (var s = 0; s < 9; s++) game.draw.rect(s * 120, 230, 60, 70, s % 2 ? M.snow : M.awning);
    game.draw.rect(0, 296, W, 10, M.ink);
    for (var f = 0; f < 14; f++) {
      var fx = (f * 97 + Math.sin(t + f) * 30 + 2000) % W;
      var fy = (f * 173 + t * 90) % (H * 0.7);
      game.draw.sprite(FLAKE, { s: M.snow }, fx, 310 + fy, 5, { anchor: 'center', alpha: 0.8 });
    }
    // 回る皿と台
    game.draw.circle(C0.x, C0.y + 30, R + 70, M.ink);
    game.draw.circle(C0.x, C0.y + 20, R + 60, '#e8f4ff');
    game.draw.circle(C0.x, C0.y + 20, R + 36, '#c8e0f0');
    game.draw.rect(0, H * 0.74, W, H * 0.26, M.wood);
    game.draw.rect(0, H * 0.74, W, 14, M.ink);
    for (var c = 0; c < 7; c++) game.draw.sprite(MINI, { g: M.ok, o: M.peel }, 640 + (c % 4) * 90, H * 0.8 + Math.floor(c / 4) * 70, 12, { anchor: 'center' });
  }

  function drawFruit() {
    var off = slideIn > 0 ? slideIn * 1600 : 0;
    var cx = C0.x + off, cy = C0.y;
    game.draw.circle(cx, cy + 12, R + 14, M.ink);
    game.draw.circle(cx, cy, R + 8, M.ink);
    game.draw.circle(cx, cy, R, M.peel);
    game.draw.circle(cx - R * 0.35, cy - R * 0.35, R * 0.28, M.peelHi, 0.55);
    // むけた房(両隣の筋が切れた区画は白い内皮が見える)
    var seams = fruit.seams;
    var n = seams.length;
    for (var i = 0; i < n; i++) {
      var s1 = seams[i], s2 = seams[(i + 1) % n];
      if (!s1.cut || !s2.cut) continue;
      var a1 = seamAngle(s1), a2 = seamAngle(s2);
      if (a2 < a1) a2 += 6.2832;
      var mid = (a1 + a2) / 2, half = (a2 - a1) / 2;
      for (var d = 0.25; d <= 0.92; d += 0.09) {
        var rr = R * d * Math.sin(Math.min(1.2, half)) * 0.85;
        game.draw.circle(cx + Math.cos(mid) * R * d, cy + Math.sin(mid) * R * d, rr, M.pith);
      }
    }
    for (var k = 0; k < n; k++) {
      var s = seams[k], a = seamAngle(s);
      var ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
      if (s.cut) {
        game.draw.line(cx, cy, ex, ey, M.snow, 10);
        if (s.glow > 0) game.draw.line(cx, cy, ex, ey, M.peelHi, 22 * s.glow * 2);
      } else {
        game.draw.line(cx, cy, ex, ey, '#d9700a', 8);
        for (var dd = 0.2; dd < 1; dd += 0.2) game.draw.circle(cx + Math.cos(a) * R * dd, cy + Math.sin(a) * R * dd, 7, '#d9700a');
      }
    }
    game.draw.circle(cx, cy, 22, M.ok);
    game.draw.circle(cx, cy, 10, '#0a8a4a');
  }

  function drawTrail() {
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      game.draw.line(a.x, a.y, b.x, b.y, M.snow, 4 + b.life * 60);
    }
  }

  function drawOkami(active) {
    var fr = active ? OKAMI_B : OKAMI_A;
    game.draw.sprite(fr, OKAMI_PAL, 190, H * 0.84 + Math.sin(game.time.elapsed * 3) * 6, 18, { anchor: 'center' });
  }

  function drawHud() {
    out(cuts + ' / ' + NEEDED, W / 2, 60, 50, M.snow);
    game.draw.rect(76, 106, W - 152, 30, M.ink);
    var lowT = secs < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(82, 112, (W - 164) * Math.max(0, secs / TIME_LIMIT), 18, lowT ? M.ng : M.peelHi);
    for (var i = 0; i < HURT_MAX; i++) game.draw.circle(W / 2 - 60 + i * 60, 180, 18, i < hurt ? M.ng : M.snow);
    for (var f = 0; f < FRUIT_SEAMS.length; f++) game.draw.sprite(MINI, { g: M.ok, o: f < fruitIdx || (fin && peeledAll) ? M.pith : M.peel }, 120 + f * 70, 180, 10, { anchor: 'center' });
  }

  // ---- ATTRACT: 本物の judgeStroke() で 筋を2本切る → 果肉を横切って失敗 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.45, press: false, k: 0, sw: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyIn = 0; demo.k = 0; demo.sw = null;
      fruit = makeFruit(1); fruit.spin = 0.2;
    }
    stepFruit(dt);
    demo.press = false;
    if (!demo.sw && demo.k < 3 && cyc > 0.5 + demo.k * 1.0) {
      var x0, y0, x1, y1;
      if (demo.k < 2) {
        var sm = fruit.seams[demo.k];
        var a = seamAngle(sm) + fruit.spin * 0.25;
        x0 = C0.x + Math.cos(a) * 40; y0 = C0.y + Math.sin(a) * 40;
        x1 = C0.x + Math.cos(a) * (R + 40); y1 = C0.y + Math.sin(a) * (R + 40);
      } else {
        var b = seamAngle(fruit.seams[3]) + 0.75;
        x0 = C0.x + Math.cos(b + 1.57) * 200 + Math.cos(b) * 150; y0 = C0.y + Math.sin(b + 1.57) * 200 + Math.sin(b) * 150;
        x1 = C0.x - Math.cos(b + 1.57) * 200 + Math.cos(b) * 150; y1 = C0.y - Math.sin(b + 1.57) * 200 + Math.sin(b) * 150;
      }
      demo.sw = { x0: x0, y0: y0, x1: x1, y1: y1, t: 0 };
    }
    if (demo.sw) {
      var w = demo.sw;
      w.t += dt;
      var k = Math.min(1, w.t / 0.25);
      demo.gx = w.x0 + (w.x1 - w.x0) * k; demo.gy = w.y0 + (w.y1 - w.y0) * k;
      demo.press = true;
      trail.push({ x: demo.gx, y: demo.gy, life: 0.25 });
      if (k >= 1) {
        var r = judgeStroke(w.x0, w.y0, w.x1, w.y1, 0.25);
        if (r.kind === 'cut') { game.fx.burst(r.x, r.y, { color: M.ok, count: 10, speed: 280 }); game.audio.play('se_good', 0.2); }
        else { game.fx.burst(r.x, r.y, { color: M.peelHi, count: 14, speed: 320 }); game.audio.play('se_bad', 0.2); game.fx.shake(6, 0.2); }
        demo.sw = null; demo.k++;
      }
    } else if (demo.k < 3) {
      demo.gx += (C0.x - demo.gx) * Math.min(1, dt * 4);
      demo.gy += (C0.y - demo.gy) * Math.min(1, dt * 4);
    }
  }

  game.onUpdate(function(dt) {
    if (cur === S.ATTRACT) {
      stepDemo(dt);
      shopfront();
      drawFruit();
      drawTrail();
      drawOkami(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 90, 80, M.peelHi);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 176, 36, M.snow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.95, 46, M.peelHi);
      else out('INSERT COIN', W / 2, H * 0.95, 36, M.snow);
      return;
    }

    if (cur === S.RESULT) {
      shopfront();
      drawFruit();
      drawOkami(false);
      var sc = cuts * 50 + maxCombo * 30;
      out(peeledAll ? 'CLEAR' : (secs <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, 150, 100, peeledAll ? M.ok : M.ng);
      out('SCORE ' + sc, W / 2, 1480, 56, M.snow);
      out('COMBO ' + maxCombo, W / 2, 1560, 42, M.peelHi);
      if (peeledAll && sc >= game.best) out('NEW RECORD', W / 2, 1640, 54, M.peelHi);
      else out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 1640, 40, M.snow);
      if (!peeledAll) out('あと' + (NEEDED - cuts) + '本!', W / 2, 250, 56, M.peelHi);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.95, 36, M.snow);
      return;
    }

    if (fin) {
      if (stopFor > 0) { stopFor -= dt; if (spotlight) spotlight.t += dt; }
      else {
        postT -= dt;
        if (postT <= 0) {
          cur = S.RESULT;
          var score = cuts * 50 + maxCombo * 30;
          if (peeledAll) game.end.success(score, { cuts: cuts, combo: maxCombo, hurt: hurt });
          else game.end.failure({ cuts: cuts, combo: maxCombo, hurt: hurt });
        }
      }
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) game.audio.play('se_tap', 0.3);
    } else {
      secs -= dt;
      stepFruit(dt);
      if (secs <= 0) {
        secs = 0; stopFor = 0.45; spotlight = { x: C0.x, y: C0.y, t: 0 };
        game.feedback.bad(C0.x, C0.y, { text: 'TIME UP', color: M.ng });
        ending(false);
      }
    }

    shopfront();
    drawFruit();
    drawTrail();
    if (fin && stopFor > 0 && spotlight) game.draw.circle(spotlight.x, spotlight.y, 60 + spotlight.t * 300, M.snow, 0.5);
    drawOkami(!!stroke);
    drawHud();
    if (readyIn > 0) out(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, C0.y, 110, M.peelHi);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1],
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], [null, 1],
    ], { tempo: 176, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['G2', 2]] });
    cur = S.ATTRACT;
    initGame();
  });
})(game);
