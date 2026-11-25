// J-GC4-0030-pollen-balloon-harvest.js
// ふわふわ花粉便 — 指についてくる気球の下で振り子のように揺れるかごを操り、空に漂う花蜜の実をすくい集める
// 操作: 画面を押したまま指を動かすと気球がついてくる。実を拾うのは下で揺れるかごだけなので、揺れを先読みして寄せる
// 終わり: 制限時間内に実を15個集めればCLEAR。とげ玉にかごが当たると実をこぼす。時間切れでGAME OVER
// @mechanic: drag_follow
// @theme: pollen_balloon_harvest
// 世界観: 春の谷の上空で、気球乗りの見習いが綿毛の気球の下に吊るしたかごを振り子のように振り回し、風に漂う花蜜の実を集めて、とげだらけの綿毛玉をよけながら谷の菓子屋に届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた実の数・金の実の数・こぼした数
// スタイル: 2000s HANDHELD PASTEL

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var STYLE = {
    bg: ['#bfe3ff', '#ffe0f0', '#d8f5d0'],
    main: ['#ff9ec7', '#ffffff', '#7a6aa8'],
    accent: ['#ffd84d', '#ff6b8a'],
  };

  var GAME_TITLE = 'POLLEN FLIGHT';
  var TIME_LIMIT = 20;
  var NEEDED = 15;
  var ROPE = 250;
  var MINX = 110, MAXX = W - 110, MINY = H * 0.2, MAXY = H * 0.52;

  var BALLOON = [
    '..pppp..',
    '.pwpppp.',
    'pwpppppp',
    'pppppppp',
    'pppppppp',
    '.pppppp.',
    '..pppp..',
    '...pp...',
  ];
  var BALLOON_PAL = { p: '#ff9ec7', w: '#ffffff' };
  var BASKET = ['k......k', 'kkkkkkkk', 'bbbbbbbb', 'b.b.b.bb', '.bbbbbb.'];
  var BASKET_PAL = { k: '#7a6aa8', b: '#c98a4b' };
  var POD = ['.gg.', 'gyyg', 'gyyg', '.gg.'];
  var BURR = ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'];
  var CLOUD = ['..www...', '.wwwwww.', 'wwwwwwww'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    g = {
      bx: W / 2, by: H * 0.34, vx: 0, tx: W / 2, ty: H * 0.34, th: 0, om: 0,
      pods: [], burrs: [], warns: [], got: 0, golds: 0, spills: 0, score: 0,
      timeLeft: TIME_LIMIT, elapsed: 0, ready: 0.8, hitStop: 0, finished: false, done: false,
      ok: false, endWait: 0, podT: 0.3, burrT: 3.5, drag: null, wob: 0, hl: null, half: false,
    };
  }

  function basket() { return { x: g.bx + Math.sin(g.th) * ROPE, y: g.by + 90 + Math.cos(g.th) * ROPE }; }

  function spawnPod() {
    var left = game.random(0, 1) < 0.5;
    var gold = game.random(0, 1) < 0.14;
    g.pods.push({ x: left ? -40 : W + 40, y: game.random(H * 0.3, H * 0.74), vx: (left ? 1 : -1) * game.random(110, 200), ph: game.random(0, 6), gold: gold });
  }

  function spawnWarn() {
    var left = game.random(0, 1) < 0.5;
    var bk = basket();
    var y = Math.max(H * 0.3, Math.min(H * 0.76, bk.y + game.random(-160, 160)));
    g.warns.push({ left: left, y: y, t: 0 });
    game.audio.tone('B5', 0.06, { wave: 'square', volume: 0.05 });
  }

  function endRound(ok) {
    if (g.finished) return;
    var bk = basket();
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.hl = [bk.x, bk.y];
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 60);
    game.audio.play(ok ? 'se_powerup' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    g.elapsed += dt;
    // 気球は指へ追従(やや遅れ)
    var nbx = g.bx + (g.tx - g.bx) * Math.min(1, dt * 5);
    var nby = g.by + (g.ty - g.by) * Math.min(1, dt * 5);
    var nvx = (nbx - g.bx) / Math.max(dt, 0.001);
    var ax = (nvx - g.vx) / Math.max(dt, 0.001);
    ax = Math.max(-9000, Math.min(9000, ax));
    g.vx = nvx; g.bx = nbx; g.by = nby;
    // かご = 振り子
    var alpha = -(2400 / ROPE) * Math.sin(g.th) - (ax / ROPE) * Math.cos(g.th);
    g.om += alpha * dt;
    g.om *= Math.pow(0.5, dt);
    g.th += g.om * dt;
    g.th = Math.max(-1.3, Math.min(1.3, g.th));
    if (g.wob > 0) g.wob -= dt;
    var bk = basket();
    // 実
    g.podT -= dt;
    if (g.podT <= 0 && g.pods.length < 7) { spawnPod(); g.podT = game.random(0.45, 0.85); }
    for (var i = g.pods.length - 1; i >= 0; i--) {
      var p = g.pods[i];
      p.ph += dt * 2;
      p.x += p.vx * dt;
      p.y += Math.sin(p.ph) * 30 * dt;
      if (game.hit.circle(p.x, p.y, 36, bk.x, bk.y, 70)) {
        g.pods.splice(i, 1);
        var n = p.gold ? 3 : 1;
        g.got += n; if (p.gold) g.golds++;
        g.score += p.gold ? 300 : 100;
        game.feedback.good(p.x, p.y, { text: p.gold ? 'x3' : '+1', color: p.gold ? '#e8a800' : STYLE.main[2], count: p.gold ? 16 : 8, sound: 'se_coin' });
        if (!isDemo && !g.half && g.got >= 8) {
          g.half = true;
          game.fx.popup(g.got + ' / ' + NEEDED, W / 2, H * 0.3, { color: STYLE.main[2], size: 72 });
          game.audio.play('se_milestone', 0.5);
        }
        continue;
      }
      if (p.x < -80 || p.x > W + 80) g.pods.splice(i, 1);
    }
    // とげ玉(予告→横切る)
    if (g.elapsed > 3) {
      g.burrT -= dt;
      if (g.burrT <= 0) { spawnWarn(); g.burrT = Math.max(1.3, 2.6 - g.elapsed * 0.06); }
    }
    for (var w = g.warns.length - 1; w >= 0; w--) {
      var wr = g.warns[w];
      wr.t += dt;
      if (wr.t >= 0.65) {
        g.burrs.push({ x: wr.left ? -50 : W + 50, y: wr.y, vx: wr.left ? 520 : -520, hit: false });
        g.warns.splice(w, 1);
      }
    }
    for (var b = g.burrs.length - 1; b >= 0; b--) {
      var br = g.burrs[b];
      br.x += br.vx * dt;
      if (!br.hit && g.wob <= 0 && game.hit.circle(br.x, br.y, 40, bk.x, bk.y, 62)) {
        br.hit = true;
        var lost = Math.min(2, g.got);
        g.got -= lost; g.spills += lost; g.wob = 0.8;
        g.om += br.vx > 0 ? 4 : -4;
        game.feedback.bad(bk.x, bk.y, { text: 'MISS', shake: 12, sound: 'se_break' });
      }
      if (br.x < -100 || br.x > W + 100) g.burrs.splice(b, 1);
    }
    if (isDemo) return;
    if (g.got >= NEEDED) endRound(true);
    g.timeLeft -= dt;
    if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false); }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var c = 0; c < 5; c++) {
      var cx = ((c * 280 + t * (20 + c * 6)) % (W + 300)) - 150;
      game.draw.sprite(CLOUD, { w: '#ffffff' }, cx, H * (0.16 + c * 0.13), 22, { anchor: 'center', alpha: 0.7 });
    }
    // 丘(遠景)
    for (var h = 0; h < 4; h++) game.draw.circle(W * (h * 0.33), H * 1.02, 330, h % 2 ? '#b8e8a8' : '#a0dc90');
    // 相方の気球(演出のみ、遠く半透明)
    game.draw.sprite(BALLOON, { p: '#7a6aa8', w: '#ffffff' }, W * 0.85 + Math.sin(t * 0.7) * 60, H * 0.22 + Math.sin(t * 1.3) * 20, 8, { anchor: 'center', alpha: 0.3 });
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.5));
  }

  function drawField() {
    var t = game.time.elapsed;
    for (var w = 0; w < g.warns.length; w++) {
      var wr = g.warns[w];
      var bl = Math.floor(wr.t * 12) % 2 === 0;
      var x = wr.left ? 40 : W - 40;
      game.draw.circle(x, wr.y, 34, bl ? STYLE.accent[1] : '#ffffff');
      game.draw.rect(wr.left ? 80 : W * 0.3, wr.y - 3, W * 0.7 - 80, 6, STYLE.accent[1], bl ? 0.35 : 0.15);
    }
    for (var i = 0; i < g.pods.length; i++) {
      var p = g.pods[i];
      game.draw.circle(p.x, p.y, 44, '#ffffff', 0.6);
      game.draw.sprite(POD, p.gold ? { g: '#e8a800', y: '#fff3a0' } : { g: '#8ccf6a', y: STYLE.accent[0] }, p.x, p.y, 16, { anchor: 'center' });
    }
    for (var b = 0; b < g.burrs.length; b++) {
      var br = g.burrs[b];
      game.draw.sprite(BURR, { '#': '#7a4a8a' }, br.x, br.y + Math.sin(t * 20 + b) * 4, 16, { anchor: 'center' });
    }
    var bk = basket();
    game.draw.line(g.bx, g.by + 90, bk.x, bk.y - 30, STYLE.main[2], 5);
    game.draw.sprite(BALLOON, BALLOON_PAL, g.bx, g.by + Math.sin(t * 2) * 5, 26, { anchor: 'center' });
    var wobble = g.wob > 0 && Math.floor(t * 16) % 2 === 0;
    game.draw.sprite(BASKET, BASKET_PAL, bk.x, bk.y, 17, { anchor: 'center', alpha: wobble ? 0.5 : 1 });
    if (g.hl && g.hitStop > 0) game.draw.circle(g.hl[0], g.hl[1], 90 + (0.5 - g.hitStop) * 160, '#ffffff', 0.5);
  }

  function drawHud() {
    game.draw.rect(20, 20, W - 40, 200, '#ffffff', 0.7);
    txt(g.got + ' / ' + NEEDED, W * 0.28, 90, 64, STYLE.main[2]);
    txt('SCORE ' + g.score, W * 0.72, 90, 40, STYLE.accent[1]);
    var bw = W * 0.84, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.08, 160, bw, 22, '#e0d8f0');
    game.draw.rect(W * 0.08, 160, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 22, low ? STYLE.accent[1] : STYLE.main[0]);
    // 親指ゾーン: かごの収穫メーター
    game.draw.rect(W * 0.15, H * 0.9, W * 0.7, 28, '#ffffff', 0.7);
    game.draw.rect(W * 0.15, H * 0.9, W * 0.7 * Math.min(1, g.got / NEEDED), 28, STYLE.accent[0]);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, cyc: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; g.burrT = 1.5; demo.cyc++; }
    var bk = basket(), best = null, bd = 1e9;
    for (var i = 0; i < g.pods.length; i++) {
      var p = g.pods[i];
      if (p.x < 60 || p.x > W - 60) continue;
      var d = Math.abs(p.x - bk.x) + Math.abs(p.y - bk.y) * 0.7;
      if (d < bd) { bd = d; best = p; }
    }
    if (best) {
      g.tx = Math.max(MINX, Math.min(MAXX, best.x + best.vx * 0.35));
      g.ty = Math.max(MINY, Math.min(MAXY, best.y - ROPE - 90));
    }
    step(dt, true);
    demo.gx += (g.tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = H * 0.84 + (g.ty - H * 0.34) * 0.4;
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
    if (g.finished || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    g.drag = { x: x, y: y };
    game.audio.play('se_tap', 0.15);
    game.fx.burst(g.bx, g.by + 60, { color: '#ffffff', count: 5, speed: 140 });
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || g.finished || !g.drag) return;
    var dx = (x - g.drag.x) * 1.3, dy = (y - g.drag.y) * 1.3;
    g.drag.x = x; g.drag.y = y;
    if (g.ready > 0) return;
    g.tx = Math.max(MINX, Math.min(MAXX, g.tx + dx));
    g.ty = Math.max(MINY, Math.min(MAXY, g.ty + dy));
    if (game.random(0, 1) < 0.03) game.audio.play('se_tap', 0.03);
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !g.drag) return;
    g.drag = null;
    game.fx.burst(g.bx, g.by + 60, { color: STYLE.main[0], count: 3, speed: 90 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawField();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 88, STYLE.main[2]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 44, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[1]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, STYLE.main[2]);
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawField();
      game.draw.rect(60, H * 0.56, W - 120, H * 0.3, '#ffffff', 0.85);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.61, 108, g.ok ? '#e8a800' : STYLE.accent[1]);
      txt(g.got + ' / ' + NEEDED, W / 2, H * 0.68, 64, STYLE.main[2]);
      txt('SCORE ' + g.score, W / 2, H * 0.73, 48, STYLE.accent[1]);
      if (!g.ok) txt('あと' + Math.max(1, NEEDED - g.got) + '個!', W / 2, H * 0.79, 54, STYLE.accent[1]);
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.79, 56, '#e8a800');
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.79, 46, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, STYLE.main[2]);
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { pods: g.got, golds: g.golds, spilled: g.spills };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.hl[0], g.hl[1], { text: 'CLEAR', color: '#e8a800', count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1], { text: 'TIME UP', shake: 14 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_jump', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawField(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 120, STYLE.accent[1]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1.5],
    ], { tempo: 126, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
