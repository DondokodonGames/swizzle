// J-GC4-0034-stream-net-sweep.js
// 沢すくいの網さばき — 群れで泳いでくる小魚の列を、素早いひと振りの網の線でまとめてすくい上げる
// 操作: 群れを横切るように指で素早く線を引く(ゆっくり引くと魚が逃げる)。流れてくる小枝を網の線に入れると網が破れる
// 終わり: 制限時間内に20匹すくえばCLEAR。時間切れでGAME OVER
// @mechanic: slice
// @theme: mountain_stream_net_sweep
// 世界観: 雪解けの沢で、竹網を持った川漁師の見習いが、瀬を列になって上ってくる銀色の小魚の群れを網のひと振りでまとめてすくい、流れてくる小枝で網を破らないよう腰の魚籠を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + すくった数・ひと振りの最多すくい数・破れた回数
// スタイル: TOON SHADE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = {
    bg: ['#2c8fa8', '#56c0cc', '#1d5e70'],
    main: ['#e8f4f8', '#9fb8c8', '#1a1a24'],
    accent: ['#ffcf3a', '#ff5a4a'],
  };
  var OUTLINE = '#1a1a24';

  var GAME_TITLE = 'NET SWEEP';
  var TIME_LIMIT = 12;
  var NEEDED = 20;
  var NET_W = 62;
  var MIN_SPEED = 1300;
  var MIN_LEN = 180;
  var TOP = H * 0.2, BOTTOM = H * 0.76;

  var FISH = ['.ooooo..o', 'oLLLLLooo', 'oLeLLDDoo', 'oDDDDDooo', '.ooooo..o'];
  var FISH_E = ['.ooooo...', 'oLLLLLo.o', 'oLeLLDDoo', 'oDDDDDo.o', '.ooooo...'];
  var FISH_PAL = { o: OUTLINE, L: '#e8f4f8', D: '#9fb8c8', e: OUTLINE };
  var GOLD_PAL = { o: OUTLINE, L: '#ffe680', D: '#e8a820', e: OUTLINE };
  var TWIG = ['oo......', 'obboo...', '.obbbboo', '..oobbbo', '....ooo.'];
  var TWIG_PAL = { o: OUTLINE, b: '#8a5a2a' };
  var CREEL = ['.oooooo.', 'obbbbbbo', 'obBbBbBo', 'obbbbbbo', 'oBbBbBbo', '.oooooo.'];
  var STONE = ['.oooo.', 'oggggo', 'ogGggo', '.oooo.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: OUTLINE, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    g = {
      fish: [], twigs: [], flying: [], stroke: null, trail: null, caught: 0, bestStroke: 0,
      tears: 0, score: 0, timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, finished: false,
      done: false, ok: false, endWait: 0, schoolT: 0.2, twigT: 1.5, elapsed: 0, hl: null, half: false,
    };
  }

  function spawnSchool() {
    var fromLeft = game.random(0, 1) < 0.5;
    var n = 3 + Math.floor(game.random(0, 4));
    var y0 = game.random(TOP + 80, BOTTOM - 120);
    var vx = (fromLeft ? 1 : -1) * game.random(210, 300 + g.elapsed * 12);
    var vy = game.random(-60, 60);
    var shape = Math.floor(game.random(0, 3)) % 3; // 0=横一列 1=斜め 2=V字
    var goldIdx = game.random(0, 1) < 0.3 ? Math.floor(game.random(0, n)) : -1;
    for (var i = 0; i < n; i++) {
      var dx = -i * 95, dy = shape === 1 ? i * 55 : shape === 2 ? Math.abs(i - (n - 1) / 2) * 60 : 0;
      g.fish.push({ x: (fromLeft ? -80 : W + 80) + (fromLeft ? dx : -dx), y: y0 + dy, vx: vx, vy: vy, ph: game.random(0, 6), gold: i === goldIdx });
    }
  }

  function spawnTwig() {
    g.twigs.push({ x: game.random(W * 0.2, W * 0.8), y: TOP - 40, vy: game.random(90, 140), ph: game.random(0, 6) });
  }

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    var t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function strokeHits(pts, x, y, r) {
    for (var i = 1; i < pts.length; i++) if (segDist(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) < r) return true;
    return false;
  }

  function beginStroke(x, y) {
    g.stroke = { pts: [{ x: x, y: y }], t0: game.time.elapsed, len: 0 };
  }

  function extendStroke(x, y) {
    var s = g.stroke;
    if (!s) return;
    var last = s.pts[s.pts.length - 1];
    var d = Math.hypot(x - last.x, y - last.y);
    if (d < 6) return;
    s.pts.push({ x: x, y: y });
    s.len += d;
  }

  function endStroke(isDemo) {
    var s = g.stroke;
    g.stroke = null;
    if (!s) return;
    var dur = Math.max(0.03, game.time.elapsed - s.t0);
    var speed = s.len / dur;
    g.trail = { pts: s.pts, t: 0.35, ok: false };
    var end = s.pts[s.pts.length - 1];
    if (s.len < MIN_LEN) {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(end.x, end.y, { color: STYLE.main[0], count: 5, speed: 140 });
      return;
    }
    // 小枝を横切ったら網が破れる
    for (var t = 0; t < g.twigs.length; t++) {
      if (strokeHits(s.pts, g.twigs[t].x, g.twigs[t].y, 44)) {
        g.tears++;
        scatter(s.pts);
        game.feedback.bad(g.twigs[t].x, g.twigs[t].y, { text: 'MISS', shake: 10, sound: 'se_break' });
        return;
      }
    }
    if (speed < MIN_SPEED) {
      scatter(s.pts);
      game.feedback.bad(end.x, end.y, { text: 'MISS', shake: 4, size: 44 });
      return;
    }
    var got = 0, golds = 0;
    for (var i = g.fish.length - 1; i >= 0; i--) {
      var f = g.fish[i];
      if (strokeHits(s.pts, f.x, f.y, NET_W)) {
        got += f.gold ? 3 : 1;
        if (f.gold) golds++;
        g.flying.push({ x: f.x, y: f.y, t: 0, gold: f.gold });
        g.fish.splice(i, 1);
      }
    }
    if (got === 0) {
      game.audio.play('se_tap', 0.25);
      game.fx.burst(end.x, end.y, { color: STYLE.main[0], count: 8, speed: 220 });
      return;
    }
    g.trail.ok = true;
    g.caught += got;
    if (got > g.bestStroke) g.bestStroke = got;
    var big = got >= 4;
    g.score += got * 100 + (big ? got * 50 : 0);
    game.feedback.good(end.x, end.y, { text: big ? 'PERFECT' : 'x' + got, color: golds ? STYLE.accent[0] : '#ffffff', count: 8 + got * 3, sound: big ? 'se_powerup' : 'se_good' });
    if (!isDemo && !g.half && g.caught >= NEEDED / 2) {
      g.half = true;
      game.fx.popup(g.caught + ' / ' + NEEDED, W / 2, H * 0.3, { color: STYLE.accent[0], size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function scatter(pts) {
    var m = pts[Math.floor(pts.length / 2)];
    for (var i = 0; i < g.fish.length; i++) {
      var f = g.fish[i];
      var d = Math.hypot(f.x - m.x, f.y - m.y);
      if (d < 320) { f.vy += (f.y > m.y ? 1 : -1) * 260; f.vx *= 1.3; }
    }
  }

  function endRound(ok) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.stroke = null;
    g.hl = [W * 0.5, H * 0.85];
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 80);
    game.audio.play(ok ? 'se_coin' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    g.elapsed += dt;
    g.schoolT -= dt;
    if (g.schoolT <= 0) { spawnSchool(); g.schoolT = Math.max(0.7, 1.1 - g.elapsed * 0.03); }
    g.twigT -= dt;
    if (g.twigT <= 0) { spawnTwig(); g.twigT = game.random(1.4, 2.2); }
    for (var i = g.fish.length - 1; i >= 0; i--) {
      var f = g.fish[i];
      f.ph += dt * 9;
      f.x += f.vx * dt;
      f.y += (f.vy + Math.sin(f.ph) * 40) * dt;
      f.vy *= Math.pow(0.5, dt);
      if (f.y < TOP) f.y = TOP;
      if (f.y > BOTTOM) f.y = BOTTOM;
      if ((f.vx < 0 && f.x < -300) || (f.vx > 0 && f.x > W + 300)) g.fish.splice(i, 1);
    }
    for (var t = g.twigs.length - 1; t >= 0; t--) {
      var tw = g.twigs[t];
      tw.ph += dt; tw.y += tw.vy * dt; tw.x += Math.sin(tw.ph * 1.5) * 40 * dt;
      if (tw.y > BOTTOM + 60) g.twigs.splice(t, 1);
    }
    for (var k = g.flying.length - 1; k >= 0; k--) {
      var fl = g.flying[k];
      fl.t += dt * 2.2;
      if (fl.t >= 1) { g.flying.splice(k, 1); if (!isDemo) game.audio.play('se_coin', 0.15); }
    }
    if (g.trail) { g.trail.t -= dt; if (g.trail.t <= 0) g.trail = null; }
    if (isDemo) return;
    if (g.caught >= NEEDED) endRound(true);
    g.timeLeft -= dt;
    if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false); }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#3a7a4a'], [0.12, '#3a7a4a'], [0.16, STYLE.bg[1]], [0.5, STYLE.bg[0]], [0.8, STYLE.bg[2]], [0.84, '#6a5a44'], [1, '#4a3e30']]);
    // 流れの筋(トゥーン: 明暗2色)
    for (var r = 0; r < 16; r++) {
      var ry = TOP + ((r * 131) % (BOTTOM - TOP));
      var rx = ((r * 211 + t * 160) % (W + 240)) - 120;
      game.draw.rect(rx, ry, 150, 10, STYLE.main[0], 0.45);
      game.draw.rect(rx + 20, ry + 10, 110, 6, STYLE.bg[2], 0.35);
    }
    // 岸の石(遠景)
    for (var s = 0; s < 6; s++) {
      game.draw.sprite(STONE, { o: OUTLINE, g: '#8a9aa0', G: '#c8d4d8' }, 90 + s * 180, H * 0.14 + (s % 2) * 20 + Math.sin(t + s) * 3, 16, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function drawField() {
    var t = game.time.elapsed;
    for (var tw = 0; tw < g.twigs.length; tw++) {
      var w = g.twigs[tw];
      game.draw.sprite(TWIG, TWIG_PAL, w.x, w.y, 14, { anchor: 'center' });
    }
    for (var i = 0; i < g.fish.length; i++) {
      var f = g.fish[i];
      var art = Math.floor(f.ph / 3) % 2 ? FISH : FISH_E;
      game.draw.rect(f.x - 36, f.y + 22, 72, 10, STYLE.bg[2], 0.4);
      game.draw.sprite(art, f.gold ? GOLD_PAL : FISH_PAL, f.x, f.y, 9, { anchor: 'center', flipX: f.vx < 0 });
    }
    // 網の線
    var s = g.stroke;
    if (s) for (var p = 1; p < s.pts.length; p++) {
      game.draw.line(s.pts[p - 1].x, s.pts[p - 1].y, s.pts[p].x, s.pts[p].y, OUTLINE, NET_W * 0.5 + 8);
      game.draw.line(s.pts[p - 1].x, s.pts[p - 1].y, s.pts[p].x, s.pts[p].y, '#f4ecd0', NET_W * 0.5);
    }
    if (g.trail) {
      var a = g.trail.t / 0.35;
      var tp = g.trail.pts;
      for (var q = 1; q < tp.length; q++) game.draw.line(tp[q - 1].x, tp[q - 1].y, tp[q].x, tp[q].y, g.trail.ok ? STYLE.accent[0] : STYLE.accent[1], NET_W * 0.6 * a + 2);
    }
    // 魚籠へ飛ぶ魚
    for (var k = 0; k < g.flying.length; k++) {
      var fl = g.flying[k];
      var x = fl.x + (W / 2 - fl.x) * fl.t, y = fl.y + (H * 0.85 - fl.y) * fl.t - Math.sin(fl.t * Math.PI) * 200;
      game.draw.sprite(FISH, fl.gold ? GOLD_PAL : FISH_PAL, x, y, 7, { anchor: 'center' });
    }
  }

  function drawCreel() {
    var t = game.time.elapsed;
    var full = Math.min(1, g.caught / NEEDED);
    var hl = g.finished && g.hitStop > 0;
    if (hl) game.draw.circle(W / 2, H * 0.85, 150 + (0.5 - g.hitStop) * 160, '#ffffff', 0.5);
    game.draw.sprite(CREEL, { o: OUTLINE, b: '#c89a5a', B: '#8a6a3a' }, W / 2, H * 0.85 + Math.sin(t * 2) * 4, 26, { anchor: 'center' });
    game.draw.rect(W / 2 - 80, H * 0.85 - 70, 160 * full, 16, STYLE.accent[0]);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, OUTLINE, 0.55);
    txt(g.caught + ' / ' + NEEDED, W * 0.27, 84, 64, '#ffffff');
    txt('SCORE ' + g.score, W * 0.72, 84, 40, STYLE.accent[0]);
    var bw = W * 0.84, low = g.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.08, 168, bw, 26, OUTLINE);
    game.draw.rect(W * 0.08 + 4, 172, (bw - 8) * Math.max(0, g.timeLeft / TIME_LIMIT), 18, low ? STYLE.accent[1] : STYLE.main[0]);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, cyc: 0, swing: null, wait: 0.8, n: 0 };
  function planSwing() {
    var best = null, bn = 0;
    for (var i = 0; i < g.fish.length; i++) {
      var f = g.fish[i];
      if (f.x < 120 || f.x > W - 120) continue;
      var n = 0;
      for (var j = 0; j < g.fish.length; j++) if (Math.hypot(g.fish[j].x - f.x, g.fish[j].y - f.y) < 200) n++;
      if (n > bn) { bn = n; best = f; }
    }
    if (!best) return null;
    demo.n++;
    var ax = best.x - 260, ay = best.y - 140, bx = best.x + 260, by = best.y + 140;
    if (demo.cyc % 2 === 0 && demo.n === 2 && g.twigs.length) {
      var tw = g.twigs[0];
      ax = tw.x - 200; ay = tw.y - 100; bx = tw.x + 200; by = tw.y + 100;
    }
    return { ax: ax, ay: ay, bx: bx, by: by, t: 0 };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; demo.n = 0; demo.swing = null; demo.wait = 0.8; }
    step(dt, true);
    if (demo.swing) {
      var sw = demo.swing;
      sw.t += dt / 0.2;
      var k = Math.min(1, sw.t);
      demo.gx = sw.ax + (sw.bx - sw.ax) * k; demo.gy = sw.ay + (sw.by - sw.ay) * k;
      extendStroke(demo.gx, demo.gy);
      demo.press = true;
      if (sw.t >= 1) { endStroke(true); demo.swing = null; demo.wait = 0.7; }
    } else {
      demo.press = false;
      demo.wait -= dt;
      if (demo.wait <= 0) {
        var p = planSwing();
        if (p) { demo.swing = p; demo.gx = p.ax; demo.gy = p.ay; beginStroke(p.ax, p.ay); }
        else demo.wait = 0.2;
      }
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    beginStroke(x, y);
    game.audio.play('se_tap', 0.12);
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !g.stroke) return;
    extendStroke(x, y);
    if (g.stroke.len > 1100) { game.audio.play('se_jump', 0.2); endStroke(false); }
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !g.stroke || g.finished) return;
    extendStroke(x, y);
    game.audio.play('se_jump', 0.2);
    endStroke(false);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawField(); drawCreel();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 96, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.105, 42, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawField(); drawCreel();
      game.draw.rect(0, H * 0.3, W, H * 0.32, OUTLINE, 0.8);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 110, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.caught + ' / ' + NEEDED, W / 2, H * 0.43, 64, '#ffffff');
      txt('SCORE ' + g.score + '  x' + g.bestStroke, W / 2, H * 0.49, 46, STYLE.accent[0]);
      if (!g.ok) txt('あと' + Math.max(1, NEEDED - g.caught) + '匹!', W / 2, H * 0.55, 54, '#ffb0a0');
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.55, 56, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.55, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: g.caught, bestStroke: g.bestStroke, tears: g.tears };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.hl[0], g.hl[1] - 120, { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1] - 120, { text: 'TIME UP', shake: 14 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawField(); drawCreel(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1.5],
    ], { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
