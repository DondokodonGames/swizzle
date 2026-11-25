// J-GC4-0010-harvest-hoop-toss.js
// ヘイトス — 藁玉を指で弾いて、揺れる吊り輪の中へ投げ入れる。10球で6本通せば勝ち
// 操作: 手前の藁玉に指を置き、狙う方向へ素早く弾いて離す。弾く向きで左右、弾く速さで飛距離が決まる。輪は揺れているので先を読む
// 終わり: 10球投げ終えた時点で6本以上通せばCLEAR。足りない/時間切れでGAME OVER(球を持ったまま3秒で1球失う)
// @mechanic: flick_launch
// @theme: harvest_hoop_toss
// 世界観: 夕暮れの収穫祭で、農家の子が刈り入れを終えた畑の真ん中から藁玉を弾き投げ、納屋の梁から揺れる吊り輪に次々と通して祭りの的当てに挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 通した本数・金の輪・命中精度のスコア
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var STYLE = {
    bg: ['#3b2f2a', '#7a5a43', '#c49a6c'],
    main: ['#e8c07d', '#f3e6cf', '#2a211c'],
    accent: ['#f28c38', '#9dc08b'],
  };

  var GAME_TITLE = 'HAY TOSS';
  var TIME_LIMIT = 20;
  var BALLS = 10;
  var NEEDED = 6;
  var BX = W * 0.5;
  var BY = H * 0.82;
  var FLIGHT = 0.6;
  var IDLE_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var HAY = [
    '..yyyy..',
    '.yYyyYy.',
    'yyyYyyyy',
    'yYyyyYyy',
    'yyyYyyYy',
    'yYyyyyyy',
    '.yyYyYy.',
    '..yyyy..',
  ];
  var HAY_PAL = { y: '#d9b26a', Y: '#a9803f' };
  var KID_A = [
    '..hhhh..',
    '.hhhhhh.',
    '..ffff..',
    '..fkfk..',
    '.oooooo.',
    'f.oooo.f',
    '..bbbb..',
    '..b..b..',
  ];
  var KID_B = [
    '..hhhh.f',
    '.hhhhhhf',
    '..ffff.o',
    '..fkfko.',
    '.ooooo..',
    'f.oooo..',
    '..bbbb..',
    '.b....b.',
  ];
  var KID_PAL = { h: '#c98a3a', f: '#f0c9a0', k: '#2a211c', o: '#7c8f5a', b: '#5a4636' };

  var hoops, ball, flights, thrown, hits, golds, timeLeft, ready, freeze, ended, endWait, won, score, idle, grab, samples, lastMile, kidT, accSum;

  function initGame() {
    hoops = [
      { cx: W * 0.5, A: 300, w: 1.3, ph: 0, y: H * 0.34, r: 78, gold: true },
      { cx: W * 0.5, A: 330, w: 0.9, ph: 2, y: H * 0.45, r: 92, gold: false },
      { cx: W * 0.5, A: 280, w: 0.7, ph: 4, y: H * 0.56, r: 100, gold: false },
    ];
    ball = { ready: true, x: BX, y: BY };
    flights = [];
    thrown = 0;
    hits = 0;
    golds = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    idle = 0;
    grab = false;
    samples = [];
    lastMile = 0;
    kidT = 0;
    accSum = 0;
    swingT = 0;
  }

  var swingT = 0;
  function hoopX(h, t) { return h.cx + h.A * Math.sin(h.w * t + h.ph); }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  // 弾いた速度ベクトルから着地点を決めて投げる(プレイヤー/デモ共用)
  function launch(vx, vy, demo) {
    if (!ball.ready || ended || thrown >= BALLS) return false;
    var sp = Math.hypot(vx, vy);
    if (vy > -400 || sp < 600) return false;
    var dist = 300 + Math.min(1, (sp - 600) / 2600) * 1150;
    var lx = BX + (vx / sp) * dist;
    var ly = BY + (vy / sp) * dist;
    flights.push({ sx: BX, sy: BY, lx: lx, ly: ly, k: 0 });
    ball.ready = false;
    thrown++;
    idle = 0;
    kidT = 0.3;
    if (!demo) game.audio.play('se_jump', 0.4);
    return true;
  }

  function resolve(f, demo) {
    var best = null, bd = 1e9;
    for (var i = 0; i < hoops.length; i++) {
      var h = hoops[i];
      var dx = Math.abs(f.lx - hoopX(h, swingT)), dy = Math.abs(f.ly - h.y);
      if (dx < h.r && dy < 70 && dx < bd) { bd = dx; best = h; }
    }
    if (best) {
      var pts = best.gold ? 200 : 100;
      var perfect = bd < 25;
      hits++;
      if (best.gold) golds++;
      accSum += 1 - bd / best.r;
      score += pts + (perfect ? 50 : 0);
      game.feedback.good(hoopX(best, swingT), best.y - 70, { text: perfect ? 'PERFECT' : best.gold ? 'x2' : 'GOOD', color: best.gold ? STYLE.main[0] : STYLE.accent[1], count: 18, volume: demo ? 0 : undefined });
      if (!demo && hits === 3 && lastMile === 0) {
        lastMile = 3;
        game.fx.popup(hits + ' / ' + NEEDED, W * 0.5, H * 0.24, { color: STYLE.main[0], size: 66 });
        game.audio.play('se_milestone', 0.5);
      }
      afterThrow(demo);
    } else {
      freeze = { t: 0.3, x: f.lx, y: f.ly, done: function () {
        game.feedback.bad(f.lx, f.ly, { text: 'MISS', shake: 6 });
        afterThrow(demo);
      } };
    }
  }

  function afterThrow(demo) {
    if (thrown >= BALLS) {
      if (!demo) {
        var ok = hits >= NEEDED;
        if (ok) { score += Math.round(timeLeft * 20); game.feedback.good(W * 0.5, H * 0.4, { text: 'CLEAR', color: STYLE.main[0], count: 36 }); }
        endGame(ok);
      } else demoOver = true;
      return;
    }
    ball.ready = true;
  }

  var demoOver = false;

  function stepWorld(dt, demo) {
    if (kidT > 0) kidT -= dt;
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    swingT += dt;
    for (var i = flights.length - 1; i >= 0; i--) {
      var f = flights[i];
      f.k += dt / FLIGHT;
      if (f.k >= 1) { flights.splice(i, 1); resolve(f, demo); return; }
    }
    if (ball.ready && !grab && !demo) {
      idle += dt;
      if (idle >= IDLE_LIMIT) {
        idle = 0;
        ball.ready = false;
        thrown++;
        freeze = { t: 0.35, x: BX, y: BY, done: function () {
          game.feedback.bad(BX, BY - 80, { text: 'MISS' });
          afterThrow(false);
        } };
      }
    }
  }

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.62, [[0, '#5b4a5e'], [0.55, STYLE.accent[0]], [1, STYLE.bg[2]]]);
    game.draw.gradient(H * 0.62, H, [[0, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 沈む夕日のブルーム
    game.draw.circle(W * 0.72, H * 0.6, 260, '#ffcf8a', 0.12);
    game.draw.circle(W * 0.72, H * 0.6, 160, '#ffdca8', 0.2);
    game.draw.circle(W * 0.72, H * 0.6, 90, '#fff0d0', 0.5);
    // 納屋の梁(輪を吊る)
    game.draw.rect(0, H * 0.22, W, 34, '#4a3326');
    game.draw.rect(0, H * 0.22 + 34, W, 8, '#2a1d15', 0.6);
    // 畑の畝(奥ほど細い)
    for (var r = 0; r < 9; r++) {
      var y = H * 0.63 + Math.pow(r / 9, 1.6) * H * 0.37;
      game.draw.rect(0, y, W, 4 + r * 2, '#5a4030', 0.6);
    }
    // 積まれた藁山
    for (var s = 0; s < 3; s++) {
      var sx = s * 380 + 120;
      game.draw.circle(sx, H * 0.64, 70, '#a9803f', 0.8);
      game.draw.circle(sx + 20, H * 0.63, 40, '#d9b26a', 0.5);
    }
    // 漂う籾殻
    for (var p = 0; p < 12; p++) {
      var px = (p * 97 + t * 25) % W;
      var py = (p * 173 + Math.sin(t + p) * 40) % (H * 0.6) + H * 0.25;
      game.draw.rect(px, py, 6, 3, STYLE.main[1], 0.35);
    }
  }

  function drawVignette() {
    game.draw.rect(0, 0, W, 60, '#000000', 0.25);
    game.draw.rect(0, H - 80, W, 80, '#000000', 0.3);
    game.draw.rect(0, 0, 40, H, '#000000', 0.2);
    game.draw.rect(W - 40, 0, 40, H, '#000000', 0.2);
    game.draw.rect(0, 0, W, H, '#f3b872', 0.03 + 0.025 * Math.sin(game.time.elapsed * 1.7));
  }

  function drawHoop(h) {
    var x = hoopX(h, swingT);
    var col = h.gold ? STYLE.main[0] : '#b98a5a';
    game.draw.line(h.cx + (x - h.cx) * 0.2, H * 0.22 + 34, x, h.y - 50, '#6b5040', 5);
    game.draw.circle(x, h.y, h.r + 20, col, 0.12);
    var prev = null;
    for (var i = 0; i <= 16; i++) {
      var a = (i / 16) * Math.PI * 2;
      var p = { x: x + Math.cos(a) * h.r, y: h.y + Math.sin(a) * h.r * 0.38 };
      if (prev) game.draw.line(prev.x, prev.y, p.x, p.y, col, 12);
      prev = p;
    }
    if (h.gold) game.draw.circle(x, h.y - h.r * 0.38 - 16, 10, '#fff0b0', 0.8 + 0.2 * Math.sin(game.time.elapsed * 8));
  }

  function drawPlay() {
    for (var i = hoops.length - 1; i >= 0; i--) drawHoop(hoops[i]);
    for (var f = 0; f < flights.length; f++) {
      var fl = flights[f];
      var k = fl.k;
      var x = fl.sx + (fl.lx - fl.sx) * k;
      var y = fl.sy + (fl.ly - fl.sy) * k - Math.sin(Math.PI * k) * 240;
      var sc = 12 - 5 * k;
      game.draw.circle(fl.sx + (fl.lx - fl.sx) * k, fl.sy + (fl.ly - fl.sy) * k + 20, 30 * (1 - k * 0.4), '#000000', 0.2);
      game.draw.sprite(HAY, HAY_PAL, x, y, sc, { anchor: 'center' });
    }
    // 弾く前の藁玉と、放置の導火リング
    var kid = kidT > 0 ? KID_B : KID_A;
    game.draw.sprite(kid, KID_PAL, W * 0.22, H * 0.84 + Math.sin(game.time.elapsed * 3) * 5, 16, { anchor: 'center' });
    if (ball.ready) {
      var bx = grab ? ball.x : BX, by = grab ? ball.y : BY;
      game.draw.circle(BX, BY + 40, 50, '#000000', 0.25);
      if (state === S.PLAYING && !grab && idle > 0) {
        var left = 1 - idle / IDLE_LIMIT;
        for (var s = 0; s < 20 * left; s++) {
          var a = (s / 20) * Math.PI * 2 - Math.PI / 2;
          game.draw.circle(BX + Math.cos(a) * 95, BY + Math.sin(a) * 95, 8, left < 0.35 ? '#ff5a3c' : STYLE.main[1], 0.8);
        }
      }
      game.draw.sprite(HAY, HAY_PAL, bx, by, 12, { anchor: 'center' });
    }
    if (freeze) {
      var fa = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(freeze.x, freeze.y, 60 + (0.35 - freeze.t) * 240, '#ffffff', 0.35 * fa);
    }
  }

  function drawHud() {
    txt(hits + ' / ' + NEEDED, W * 0.2, H * 0.05, 60, STYLE.main[1]);
    txt('SCORE ' + score, W * 0.76, H * 0.05, 38, STYLE.main[1]);
    for (var i = 0; i < BALLS; i++) {
      game.draw.sprite(HAY, HAY_PAL, W * 0.5 - 315 + i * 70, H * 0.1, 5, { anchor: 'center', alpha: i < BALLS - thrown ? 1 : 0.2 });
    }
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.13, bw, 12, '#000000', 0.35);
    game.draw.rect(80, H * 0.13, bw * Math.max(0, timeLeft / TIME_LIMIT), 12, low ? '#ff5a3c' : STYLE.main[0]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.3, W, H * 0.25, STYLE.main[2], 0.78);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.36, 96, won ? STYLE.main[0] : '#ff7a5a');
    txt('SCORE ' + score, W * 0.5, H * 0.43, 50, STYLE.main[1]);
    if (!won) txt('あと' + Math.max(1, NEEDED - hits) + '本!', W * 0.5, H * 0.49, 48, STYLE.main[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.49, 48, STYLE.main[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.49, 44, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演(同じlaunchで投げる) ─────────────
  var demo = { t: 0, gx: BX, gy: BY, press: false, wait: 0.6, n: 0, aim: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demoOver || !hoops || thrown >= 4) {
      demoOver = false;
      initGame();
      ready = 0;
      demo.wait = 0.5;
      demo.aim = null;
    }
    if (!ball.ready || freeze) { demo.press = false; demo.gx += (BX - demo.gx) * Math.min(1, dt * 5); demo.gy += (BY - demo.gy) * Math.min(1, dt * 5); return; }
    demo.wait -= dt;
    if (demo.wait > 0.3) { demo.gx = BX; demo.gy = BY; demo.press = false; return; }
    if (!demo.aim) {
      demo.n++;
      var h = hoops[demo.n % 3];
      var tx = h.cx + h.A * Math.sin(h.w * (swingT + FLIGHT + 0.3) + h.ph);
      // 3球目はわざと外して失敗例を見せる
      if (demo.n % 3 === 0) tx += 190;
      var dx = tx - BX, dy = h.y - BY, dist = Math.hypot(dx, dy);
      var sp = 600 + ((dist - 300) / 1150) * 2600;
      demo.aim = { vx: dx / dist * sp, vy: dy / dist * sp, ux: dx / dist, uy: dy / dist };
    }
    // 指で弾く動き(0.3秒)
    var k = 1 - Math.max(0, demo.wait) / 0.3;
    demo.gx = BX + demo.aim.ux * 180 * k;
    demo.gy = BY + demo.aim.uy * 180 * k;
    demo.press = true;
    if (demo.wait <= 0) {
      launch(demo.aim.vx, demo.aim.vy, true);
      demo.aim = null;
      demo.wait = 0.9;
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    if (ball.ready && !freeze && Math.hypot(x - BX, y - BY) < 260) {
      grab = true;
      samples = [{ x: x, y: y, t: game.time.elapsed }];
      ball.x = BX; ball.y = BY;
      game.audio.play('se_tap', 0.3);
    } else {
      game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 90 });
    }
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !grab) return;
    samples.push({ x: x, y: y, t: game.time.elapsed });
    if (samples.length > 12) samples.shift();
    ball.x = BX + (x - BX) * 0.25;
    ball.y = BY + (y - BY) * 0.25;
    if (Math.random() < 0.2) game.fx.burst(ball.x, ball.y, { color: '#d9b26a', count: 1, speed: 60 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !grab) return;
    grab = false;
    samples.push({ x: x, y: y, t: game.time.elapsed });
    var now = game.time.elapsed;
    var first = samples[0];
    for (var i = samples.length - 1; i >= 0; i--) { if (now - samples[i].t > 0.12) { first = samples[i]; break; } first = samples[i]; }
    var dt = Math.max(0.016, now - first.t);
    var vx = (x - first.x) / dt, vy = (y - first.y) / dt;
    if (!launch(vx, vy, false)) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(BX, BY, { color: STYLE.main[1], count: 4, speed: 120 });
    } else {
      game.fx.burst(BX, BY, { color: '#d9b26a', count: 10, speed: 260 });
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawPlay();
      game.draw.hand(demo.gx, demo.gy + 20, { press: demo.press, scale: 13 });
      drawVignette();
      txt(GAME_TITLE, W * 0.5, H * 0.08, 100, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.135, 40, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.94, 48, STYLE.main[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.94, 42, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawPlay();
      drawVignette();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawPlay();
      drawVignette();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, thrown: thrown, golds: golds, accuracy: hits ? Math.round((accSum / hits) * 100) : 0 };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      if (!freeze) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          flights = [];
          freeze = { t: 0.4, x: BX, y: BY, done: function () {
            game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawPlay();
    drawVignette();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.66, 110, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['D4', 1], ['F#4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1], ['F#4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2]],
      { tempo: 110, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
