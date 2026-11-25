// J-3DSDSDSTOP10-0012-tinsmith-solder-seam.js
// ブリキ継ぎ目のはんだ引き — チョークのお手本線を、はんだごての先で線幅からはみ出さずになぞり切る
// 操作: 光る始点に指を置き、そのまま線に沿って運ぶ。止まるとこてが焦げ、はみ出すと火花が散る。指を離したら先端から置き直す
// 終わり: 継ぎ目2本を引き切ればCLEAR(精度%がスコア)。はみ出し/焦がし3回・時間切れでGAME OVER
// @mechanic: guide_path
// @theme: tinsmith_lantern_seam
// 世界観: 港町のブリキ工房で、見習い職人が親方フクロウの見ている前で、ランタンの胴に引かれたチョークの継ぎ目線をはんだごてでなぞり、光が漏れない一本の継ぎ目に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞり精度%・仕上げた継ぎ目数・ぴったり区間数
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var STYLE = {
    bg: ['#1e1814', '#3a2e25', '#5c4a3a'],
    main: ['#9a8a78', '#c7b49a', '#e8dcc0'],
    accent: ['#ffb04a', '#ff6a3a'],
  };
  var D0 = '#1e1814', D1 = '#3a2e25', D2 = '#5c4a3a', T1 = '#9a8a78', T2 = '#c7b49a', CH = '#e8dcc0';
  var HOT = '#ffb04a', BURN = '#ff6a3a', SILV = '#dfe6ea';

  var GAME_TITLE = 'SOLDER SEAM';
  var TIME_LIMIT = 18;
  var SEAMS = 2;
  var STRIKES = 3;
  var SAMPLES = 110;
  var PANEL = { x: 120, y: Math.round(H * 0.2), w: W - 240, h: Math.round(H * 0.56) };
  var REPRESS_T = 2.5;

  var OWL_A = ['.b....b.', 'bbbbbbbb', 'bwwbbwwb', 'bwkbbkwb', 'bbbyybbb', '.bbbbbb.', '.bttttb.', '..y..y..'];
  var OWL_B = ['.b....b.', 'bbbbbbbb', 'bbbbbbbb', 'bkkbbkkb', 'bbbyybbb', '.bbbbbb.', '.bttttb.', '..y..y..'];
  var OWL_PAL = { b: '#7a6450', w: CH, k: D0, y: HOT, t: T2 };
  var IRON = ['..o..', '.ooo.', '.sss.', '.sss.', '.sss.', '.www.', '.www.', '.www.', '.www.'];
  var RIVET = ['.#.', '###', '.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function write(str, x, y, sz, col) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: D0, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // お手本の継ぎ目線を作る(1本目: 縦の波、2本目: 横のうねり)。ランダム位相で毎回少し変わる
  function buildSeam(kind) {
    var pts = [], ph = Math.random() * 0.6, amp = 0.8 + Math.random() * 0.25;
    for (var i = 0; i <= SAMPLES; i++) {
      var t = i / SAMPLES, x, y;
      if (kind === 0) {
        x = PANEL.x + PANEL.w / 2 + Math.sin((t * 2.2 + ph) * Math.PI) * PANEL.w * 0.32 * amp;
        y = PANEL.y + 90 + t * (PANEL.h - 180);
      } else {
        x = PANEL.x + 80 + t * (PANEL.w - 160);
        y = PANEL.y + PANEL.h / 2 + Math.sin((t * 3 + ph) * Math.PI) * PANEL.h * 0.3 * amp * (1 - t * 0.35);
      }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function halfWidth(i) { return 62 - (i / SAMPLES) * 24; }

  function initGame() {
    g = {
      seam: 0, pts: buildSeam(0), pi: 0, pen: false, px: 0, py: 0, heat: 0, lastPi: 0,
      devSum: 0, devN: 0, perfect: 0, run: 0, strikes: 0, wait: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, spark: null, sparkT: 0,
      finished: false, done: false, ok: false, endWait: 0, blink: 0,
    };
    g.px = g.pts[0].x; g.py = g.pts[0].y;
  }

  function accuracy() { return g.devN === 0 ? 100 : Math.max(0, Math.round(100 * (1 - g.devSum / g.devN / 50))); }
  function scoreOf() { return accuracy() * 10 + g.seam * 400 + g.perfect * 30; }

  function strike(x, y) {
    g.strikes++;
    g.pen = false; g.run = 0; g.heat = 0; g.wait = REPRESS_T;
    g.hitStop = 0.35; g.spark = { x: x, y: y }; g.sparkT = 0.5;
    game.fx.burst(x, y, { color: HOT, count: 18, speed: 380 });
    game.feedback.bad(x, y, { text: 'MISS', color: BURN, flashColor: BURN });
    if (g.strikes >= STRIKES) { g.finished = true; g.ok = false; finish(); }
  }

  function penDown(x, y) {
    if (g.finished) return;
    var tip = g.pts[g.pi];
    if (Math.hypot(x - tip.x, y - tip.y) <= 95) {
      g.pen = true; g.px = x; g.py = y; g.wait = 0; g.heat = Math.max(0, g.heat - 0.2);
      game.audio.tone('C4', 0.08, { wave: 'sawtooth', volume: 0.04 });
    } else {
      // 先端以外に置いた: 空振りを見せる(ペナルティなし)
      game.feedback.bad(x, y, { text: null, shake: 3, volume: 0.25 });
    }
  }

  function penMove(x, y) {
    if (!g.pen || g.finished || g.hitStop > 0) return;
    var best = 1e9, bi = g.pi;
    var lo = Math.max(0, g.pi - 3), hi = Math.min(SAMPLES, g.pi + 16);
    for (var j = lo; j <= hi; j++) {
      var d = Math.hypot(x - g.pts[j].x, y - g.pts[j].y);
      if (d < best) { best = d; bi = j; }
    }
    g.px = x; g.py = y;
    if (best > halfWidth(bi)) { strike(x, y); return; }
    if (bi > g.pi) {
      for (var k = g.pi + 1; k <= bi; k++) { g.devSum += best; g.devN++; }
      if (best < 14) {
        g.run += bi - g.pi;
        if (g.run >= 18) { g.run = 0; g.perfect++; game.fx.popup('PERFECT', x + 90, y - 60, { color: HOT, size: 38 }); game.audio.tone('G6', 0.07, { wave: 'triangle', volume: 0.05 }); }
      } else {
        g.run = 0;
      }
      g.pi = bi;
      g.heat = Math.max(0, g.heat - 0.12);
      if (Math.random() < 0.3) game.audio.tone(300 + g.pi * 4, 0.04, { wave: 'sawtooth', volume: 0.02 });
    }
    if (g.pi >= SAMPLES - 1) seamDone(x, y);
  }

  function seamDone(x, y) {
    g.seam++;
    g.pen = false;
    game.feedback.good(x, y, { text: accuracy() + '%', color: HOT, count: 20 });
    if (g.seam >= SEAMS) {
      g.finished = true; g.ok = true; g.hitStop = 0.3;
      finish();
      return;
    }
    game.audio.play('se_milestone', 0.5);
    game.fx.popup(g.seam + ' / ' + SEAMS, W / 2, PANEL.y + 60, { color: CH, size: 56 });
    g.pts = buildSeam(g.seam % 2); g.pi = 0; g.run = 0; g.heat = 0; g.wait = REPRESS_T;
  }

  function finish() {
    if (g.done) return;
    g.done = true; g.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(g.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function advance(dt) {
    if (g.sparkT > 0) g.sparkT -= dt;
    g.blink += dt;
    if (g.hitStop > 0) { g.hitStop -= dt; return; }
    if (g.finished) return;
    if (g.pen) {
      // こてを止めると焦げる(熱ゲージ)
      var moved = g.pi !== g.lastPi;
      g.lastPi = g.pi;
      if (!moved) g.heat += dt * 0.85;
      if (g.heat >= 1) { strike(g.px, g.py); return; }
      if (g.heat > 0.6 && Math.floor(g.blink * 8) % 2 === 0 && Math.random() < 0.2) game.audio.tone('E3', 0.05, { wave: 'square', volume: 0.03 });
    } else if (g.wait > 0) {
      g.wait -= dt;
      if (g.wait <= 0) { var tp = g.pts[g.pi]; strike(tp.x, tp.y); }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, D1], [0.5, D2], [1, D0]]);
    game.draw.rect(0, 0, W, H, HOT, 0.03 + 0.025 * Math.sin(t * 1.1));
    // 作業台の木目
    for (var i = 0; i < 14; i++) game.draw.line(0, H * 0.8 + i * 28, W, H * 0.8 + i * 28 + 10, D1, 4);
    // 吊りランプのブルーム
    var lx = W * 0.5 + Math.sin(t * 0.7) * 20;
    game.draw.circle(lx, 60, 260, HOT, 0.06);
    game.draw.circle(lx, 60, 150, HOT, 0.08);
    // ランタンの胴板
    game.draw.rect(PANEL.x - 16, PANEL.y - 16, PANEL.w + 32, PANEL.h + 32, D0, 0.6);
    game.draw.gradient(PANEL.y, PANEL.y + PANEL.h, [[0, '#8e8272'], [0.5, '#a89a86'], [1, '#6f6456']]);
    game.draw.rect(0, PANEL.y, PANEL.x, PANEL.h, D1);
    game.draw.rect(PANEL.x + PANEL.w, PANEL.y, W - PANEL.x - PANEL.w, PANEL.h, D1);
    for (var r = 0; r < 6; r++) {
      game.draw.sprite(RIVET, { '#': D2 }, PANEL.x + 30 + r * ((PANEL.w - 60) / 5), PANEL.y + 26, 8, { anchor: 'center' });
      game.draw.sprite(RIVET, { '#': D2 }, PANEL.x + 30 + r * ((PANEL.w - 60) / 5), PANEL.y + PANEL.h - 26, 8, { anchor: 'center' });
    }
    // 親方フクロウ(見ているだけ)
    var owl = Math.floor(t * 1.3) % 5 === 0 ? OWL_B : OWL_A;
    game.draw.sprite(owl, OWL_PAL, W - 150 + Math.sin(t * 1.7) * 6, H * 0.85 + Math.cos(t * 2.1) * 5, 16, { anchor: 'center' });
  }

  function drawSeam() {
    var p = g.pts;
    // 許容幅の帯(お手本)
    for (var i = 0; i <= SAMPLES; i++) game.draw.circle(p[i].x, p[i].y, halfWidth(i) + 4, '#6a5e50');
    for (var i2 = 0; i2 <= SAMPLES; i2++) game.draw.circle(p[i2].x, p[i2].y, halfWidth(i2), '#7f7263');
    // チョークの点線
    for (var j = 0; j <= SAMPLES; j += 3) game.draw.circle(p[j].x, p[j].y, 5, CH);
    // 仕上がったはんだ
    for (var k = 1; k <= g.pi; k++) {
      game.draw.line(p[k - 1].x, p[k - 1].y, p[k].x, p[k].y, SILV, 14);
    }
    // 先端(置き直す場所)を脈動で示す
    var tip = p[g.pi];
    if (!g.pen && !g.finished) {
      var pr = 30 + 12 * Math.sin(game.time.elapsed * 8);
      game.draw.circle(tip.x, tip.y, pr + 20, HOT, 0.25);
      game.draw.circle(tip.x, tip.y, pr, HOT, 0.6);
    }
    var end = p[SAMPLES];
    game.draw.circle(end.x, end.y, 22, SILV, 0.8);
    game.draw.circle(end.x, end.y, 12, D0);
  }

  function drawIron(x, y, pressed) {
    var sc = g.hitStop > 0 ? 18 : 14;
    var glow = g.heat;
    game.draw.circle(x, y, 40 + glow * 40, glow > 0.6 ? BURN : HOT, 0.18 + glow * 0.3);
    game.draw.sprite(IRON, { o: glow > 0.6 ? BURN : HOT, s: SILV, w: '#6b4b2e' }, x, y - 20 + (pressed ? 0 : -20), sc, { anchor: 'center' });
    if (g.sparkT > 0 && g.spark) {
      game.draw.circle(g.spark.x, g.spark.y, 70 * (1 + (0.5 - g.sparkT)), '#ffffff', g.sparkT);
    }
  }

  function drawVignette() {
    game.draw.rect(0, 0, W, 40, D0, 0.5);
    game.draw.rect(0, H - 60, W, 60, D0, 0.5);
    game.draw.rect(0, 0, 30, H, D0, 0.4);
    game.draw.rect(W - 30, 0, 30, H, D0, 0.4);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, D0, 0.8);
    write(g.seam + ' / ' + SEAMS, 190, 80, 54, CH);
    write(accuracy() + '%', W / 2, 80, 60, HOT);
    for (var s = 0; s < STRIKES; s++) game.draw.circle(W - 240 + s * 70, 80, 22, s < g.strikes ? BURN : D2);
    var frac = Math.max(0, g.timeLeft / TIME_LIMIT);
    var low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, W - 120, 22, D2);
    game.draw.rect(60, 160, (W - 120) * frac, 22, low ? BURN : T2);
    game.draw.rect(60, 196, (W - 120) * (g.pi / SAMPLES), 10, SILV);
    if (g.heat > 0.05) {
      game.draw.rect(W / 2 - 150, H * 0.8 - 40, 300, 18, D0);
      game.draw.rect(W / 2 - 150, H * 0.8 - 40, 300 * Math.min(1, g.heat), 18, g.heat > 0.6 ? BURN : HOT);
    }
  }

  function drawResult() {
    game.draw.rect(80, 620, W - 160, 520, D0, 0.9);
    write(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, 720, 88, g.ok ? HOT : BURN);
    write(accuracy() + '%', W / 2, 840, 70, CH);
    write(g.seam + ' / ' + SEAMS + '   PERFECT ' + g.perfect, W / 2, 940, 38, T2);
    var sc = scoreOf();
    if (g.ok && sc > game.best) write('NEW RECORD', W / 2, 1020, 48, HOT);
    else if (!g.ok) write('あと' + Math.max(1, Math.round((1 - g.pi / SAMPLES) * 100)) + '%!', W / 2, 1020, 46, HOT);
    write('BEST ' + Math.max(game.best, g.ok ? sc : 0), W / 2, 1090, 34, T1);
  }

  function drawWorld() {
    drawShop();
    drawSeam();
  }

  // ── ATTRACT: AIが同じ penDown/penMove を使ってなぞる(1本目は精密、終盤でわざとはみ出す)──
  var demo = { t: 0, gx: 0, gy: 0, press: false, fi: 0, down: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.5;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.fi = 0; demo.down = false; }
    if (!g.finished && g.hitStop <= 0) {
      if (!g.pen) {
        var tp = g.pts[g.pi];
        demo.gx = tp.x; demo.gy = tp.y;
        if (cyc > 0.4 && cyc < 4.6) penDown(tp.x, tp.y);
        demo.fi = g.pi;
      } else {
        demo.fi = Math.min(SAMPLES, demo.fi + dt * 44);
        var q = g.pts[Math.floor(demo.fi)];
        var wob = cyc > 3.3 ? (cyc - 3.3) * 110 : Math.sin(demo.t * 9) * 6;
        demo.gx = q.x + wob; demo.gy = q.y;
        penMove(demo.gx, demo.gy);
      }
    }
    demo.press = g.pen;
    advance(dt);
    g.wait = Math.min(g.wait, 1);
    if (g.done) { g.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); music();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || g.ready > 0 || g.done) return;
    game.audio.play('se_tap', 0.25);
    penDown(x, y);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || g.ready > 0) return;
    if (g.pen && Math.random() < 0.06) game.audio.tone('B2', 0.05, { wave: 'sawtooth', volume: 0.02 });
    penMove(x, y);
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !g.pen || g.finished) return;
    g.pen = false; g.wait = REPRESS_T;
    game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawWorld();
      drawIron(demo.gx, demo.gy, demo.press);
      game.draw.hand(demo.gx + 20, demo.gy + 30, { press: demo.press, scale: 13 });
      drawVignette();
      game.draw.rect(0, 0, W, 230, D0, 0.8);
      write(GAME_TITLE, W / 2, H * 0.045, 76, HOT);
      write('HI-SCORE ' + game.best, W / 2, 170, 34, T2);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.9, 46, HOT);
      else write('INSERT COIN', W / 2, H * 0.9, 40, CH);
      return;
    }
    if (state === S.RESULT) {
      drawWorld(); drawVignette(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.93, 38, CH);
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.hitStop > 0) g.hitStop -= dt;
      if (g.sparkT > 0) g.sparkT -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { accuracy: accuracy(), seams: g.seam, perfect: g.perfect, strikes: g.strikes };
        if (g.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) { game.audio.play('se_tap', 0.4); g.wait = REPRESS_T; }
    } else {
      if (g.hitStop <= 0) g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) {
        g.timeLeft = 0; g.finished = true; g.ok = false; g.hitStop = 0.4; g.pen = false;
        game.feedback.bad(g.px, g.py, { text: 'TIME UP' });
        finish();
      } else {
        advance(dt);
      }
    }

    drawWorld();
    drawIron(g.pen ? g.px : g.pts[g.pi].x, g.pen ? g.py : g.pts[g.pi].y, g.pen);
    drawVignette();
    drawHud();
    if (g.ready > 0) write(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, HOT);
    if (g.done) drawResult();
  });

  function music() {
    game.audio.melody(
      [['A3', 1], ['C4', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 1], ['A3', 1], ['G3', 0.5], ['B3', 0.5], ['C4', 2]],
      { tempo: 96, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 4], ['F2', 4]] }
    );
  }

  game.onStart(function () {
    music();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
