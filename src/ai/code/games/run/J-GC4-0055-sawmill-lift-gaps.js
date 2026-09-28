// J-GC4-0055-sawmill-lift-gaps.js
// 製材所の昇降台 — 勝手に上下する昇降台を押さえて止め、流れてくる角材の束の隙間の高さに体を合わせてくぐらせる
// 操作: 押している間だけ昇降台のブレーキがかかって止まる(ブレーキの残りは減り、離すと戻る)。離すと台はまた上下に動き出す。レールの印が次の隙間の高さ
// 終わり: 20秒間しのげばCLEAR。角材に3回ぶつかる(台から落ちる)とGAME OVER
// @mechanic: gap_fit
// @theme: sawmill_lift_gaps
// 世界観: 山あいの製材所で、見習い大工が上下に動く昇降台に乗って仕上げ場へ向かう。流れてくる角材の束の隙間に合わせて台を止め、最後まで振り落とされずに乗り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった束の数・PERFECT数
// スタイル: TOON SHADE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = {
    bg: ['#fde9c8', '#f7c98a', '#9fd3e8'],
    main: ['#c97a3a', '#e8a35c', '#7a4a24'],
    accent: ['#3a8fd8', '#ff5a4a'],
  };
  var LINE = '#22160e';
  var BLUE = STYLE.accent[0];
  var RED = STYLE.accent[1];
  var GREEN = '#4cc46a';
  var GOLD = '#ffcc33';

  var GAME_TITLE = 'SAWMILL LIFT';
  var TIME_LIMIT = 20;
  var MAX_HITS = 3;
  var COL_X = 300;
  var TOP_Y = 470;
  var BOT_Y = 1290;
  var BODY_H = 150;
  var WALL_W = 120;
  var WALL_V = 520;
  var BRAKE_DRAIN = 1 / 3;
  var BRAKE_FILL = 1 / 1.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var WORKER = [
    [
      '..yyyy..',
      '.yyyyyy.',
      '..ssss..',
      '..s.s...',
      '.bbbbbb.',
      'b.bbbb.b',
      '..bbbb..',
      '..k..k..',
    ],
    [
      '..yyyy..',
      '.yyyyyy.',
      '..ssss..',
      '..s.s...',
      '.bbbbbb.',
      '.bbbbbb.',
      '..bbbb..',
      '.k....k.',
    ],
  ];
  var WORKER_PAL = { y: GOLD, s: '#f2c49a', b: BLUE, k: LINE };
  var HAT = ['.yy.', 'yyyy'];
  var SAW = ['..w..', '.www.', 'wwwww', '.www.', '..w..'];

  var liftY, liftDir, liftV, braking, brake, walls, spawnT, passed, perfects, hits, timeLeft, ready;
  var hitStop, hitWall, ended, endWait, won, score, playT, knock;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x - 3, y, { size: size, color: LINE, bold: true, align: align || 'center' });
    game.draw.text(s, x + 3, y, { size: size, color: LINE, bold: true, align: align || 'center' });
    game.draw.text(s, x, y + 4, { size: size, color: LINE, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    liftY = (TOP_Y + BOT_Y) / 2;
    liftDir = -1;
    liftV = 260;
    braking = false;
    brake = 1;
    walls = [];
    spawnT = 0.6;
    passed = 0;
    perfects = 0;
    hits = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitWall = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    playT = 0;
    knock = 0;
  }

  function gapSize() {
    return Math.max(215, 290 - playT * 4);
  }

  function predictLift(tau) {
    // ブレーキなしで tau 秒後に台がいる高さ(端で折り返す)
    var y = liftY, d = liftDir;
    for (var k = 0; k < tau; k += 0.02) {
      y += d * liftV * 0.02;
      if (y < TOP_Y) { y = TOP_Y; d = 1; }
      if (y > BOT_Y) { y = BOT_Y; d = -1; }
    }
    return y;
  }

  function spawnWall() {
    var g = gapSize();
    // 隙間は台の通り道の上に置く(到着の1.1秒前までに通る高さ)=必ず合わせられる
    var arrive = (W + 40 + WALL_W / 2 - COL_X) / WALL_V;
    var y = predictLift(game.random(0.25, arrive - 1.1));
    var top = y - BODY_H / 2 - g / 2 + game.random(-g * 0.15, g * 0.15);
    top = Math.max(TOP_Y - BODY_H - 10, Math.min(BOT_Y - g + 10, top));
    walls.push({ x: W + 40, gapTop: top, gapH: g, judged: false, ph: Math.random() * 6 });
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function bodyTop() { return liftY - BODY_H; }

  function stepWorld(dt, demo) {
    playT += dt;
    if (knock > 0) knock -= dt;
    // ブレーキ
    var holding = braking && brake > 0;
    if (holding) brake = Math.max(0, brake - BRAKE_DRAIN * dt);
    else brake = Math.min(1, brake + BRAKE_FILL * dt * (braking ? 0 : 1));
    if (braking && brake <= 0 && !demo && Math.random() < dt * 4) game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.04 });
    liftV = 240 + Math.min(1, playT / TIME_LIMIT) * 90;
    if (!holding) {
      liftY += liftDir * liftV * dt;
      if (liftY < TOP_Y) { liftY = TOP_Y; liftDir = 1; }
      if (liftY > BOT_Y) { liftY = BOT_Y; liftDir = -1; }
    }
    // 角材の束
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnWall();
      spawnT = game.random(1.7, 2.3) - Math.min(0.35, playT * 0.02);
    }
    for (var i = walls.length - 1; i >= 0; i--) {
      var w = walls[i];
      w.x -= WALL_V * dt;
      // 通過判定: 束が体の列に重なった瞬間
      if (!w.judged && w.x + WALL_W / 2 <= COL_X) {
        w.judged = true;
        var top = bodyTop(), bot = liftY;
        var inside = top >= w.gapTop - 4 && bot <= w.gapTop + w.gapH + 4;
        if (!inside) {
          hitStop = 0.45;
          hitWall = w;
          return;
        }
        passed++;
        var mid = (top + bot) / 2, gmid = w.gapTop + w.gapH / 2;
        var perfect = Math.abs(mid - gmid) < 24;
        if (perfect) perfects++;
        score += perfect ? 150 : 100;
        game.feedback.good(COL_X + 120, mid - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: GREEN, count: perfect ? 14 : 6, volume: demo ? 0 : undefined });
        if (!demo && passed === 5) {
          game.fx.popup('x' + passed, W / 2, 330, { color: GOLD, size: 60 });
          game.audio.play('se_milestone', 0.5);
        }
      }
      if (w.x < -WALL_W - 40) walls.splice(i, 1);
    }
  }

  function resolveHit(demo) {
    hits++;
    knock = 0.5;
    game.feedback.bad(COL_X, liftY - 200, { text: 'MISS', volume: demo ? 0 : undefined });
    if (!demo) game.audio.play('se_break', 0.3);
    hitWall = null;
    if (hits >= MAX_HITS && !demo) endGame(false, demo);
  }

  // ── 描画(輪郭→明→暗の順) ──
  function toonRect(x, y, w, h, light, dark) {
    game.draw.rect(x - 5, y - 5, w + 10, h + 10, LINE);
    game.draw.rect(x, y, w, h, light);
    game.draw.rect(x + w * 0.62, y, w * 0.38, h, dark);
  }

  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[2]], [0.3, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 遠景の山と製材所の屋根
    for (var m = 0; m < 5; m++) {
      var mx = m * 260 - 40;
      for (var s = 0; s < 12; s++) game.draw.rect(mx + s * 10, 380 - s * 12, 260 - s * 20, 12, '#8fbf9f', 0.6);
    }
    game.draw.rect(0, 400, W, 30, LINE);
    game.draw.rect(0, 405, W, 20, '#b0603a');
    // 回る丸鋸(遠景・危害なし)
    game.draw.sprite(SAW, { w: '#d8d8d8' }, W - 120, 330 + Math.sin(t * 3) * 6, 16, { anchor: 'center', alpha: 0.7 });
    // 床
    game.draw.rect(0, BOT_Y + 60, W, 20, LINE);
    game.draw.rect(0, BOT_Y + 80, W, H - BOT_Y - 80, '#a86a3a');
    for (var p = 0; p < 12; p++) game.draw.rect(p * 100 + ((t * 40) % 100), BOT_Y + 120, 60, 10, '#7a4a24', 0.6);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawRail() {
    var t = game.time.elapsed;
    // 昇降レール
    game.draw.rect(COL_X - 110, TOP_Y - BODY_H - 40, 16, BOT_Y - TOP_Y + BODY_H + 110, LINE);
    game.draw.rect(COL_X - 106, TOP_Y - BODY_H - 40, 8, BOT_Y - TOP_Y + BODY_H + 110, '#8a8a8a');
    // 次の隙間の高さの印(予告)
    var next = null;
    for (var i = 0; i < walls.length; i++) if (!walls[i].judged && (!next || walls[i].x < next.x)) next = walls[i];
    if (next) {
      var eta = (next.x - COL_X) / WALL_V;
      var blink = eta < 0.8 && Math.floor(t * 12) % 2 === 0;
      game.draw.rect(COL_X - 140, next.gapTop, 20, next.gapH, blink ? '#ffffff' : GOLD, 0.95);
      game.draw.rect(COL_X - 140, next.gapTop, 60, 8, LINE);
      game.draw.rect(COL_X - 140, next.gapTop + next.gapH - 8, 60, 8, LINE);
    }
  }

  function drawLift() {
    var t = game.time.elapsed;
    var holding = braking && brake > 0;
    var shake = knock > 0 ? Math.sin(t * 60) * 12 : 0;
    // 台とピストン
    toonRect(COL_X - 90, liftY, 180, 34, STYLE.main[1], STYLE.main[0]);
    game.draw.rect(COL_X - 14, liftY + 38, 28, BOT_Y + 60 - liftY - 38, LINE);
    game.draw.rect(COL_X - 8, liftY + 38, 16, BOT_Y + 60 - liftY - 38, '#9a9a9a');
    if (holding) {
      game.draw.rect(COL_X - 100, liftY + 8, 14, 20, RED);
      game.draw.rect(COL_X + 86, liftY + 8, 14, 20, RED);
    }
    var frame = Math.floor(t * 3) % 2;
    game.draw.sprite(WORKER[frame], WORKER_PAL, COL_X + shake + Math.sin(t * 1.5) * 3, liftY - BODY_H / 2 + Math.sin(t * 4) * 3, 19, { anchor: 'center' });
    if (hitStop > 0) {
      var g = (0.45 - hitStop) * 120;
      game.draw.rect(COL_X - 90 - g / 2, bodyTop() - g / 2, 180 + g, BODY_H + g, '#ffffff', 0.45);
    }
  }

  function drawWalls() {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var hl = hitWall === w;
      // 上の束
      var y0 = 240;
      var h1 = w.gapTop - y0;
      if (h1 > 0) {
        toonRect(w.x, y0, WALL_W, h1, hl ? '#ffffff' : STYLE.main[1], hl ? '#ffe0e0' : STYLE.main[0]);
        for (var a = y0 + 40; a < w.gapTop - 20; a += 60) game.draw.rect(w.x, a, WALL_W, 6, LINE, 0.5);
      }
      var y2 = w.gapTop + w.gapH;
      var h2 = BOT_Y + 60 - y2;
      if (h2 > 0) {
        toonRect(w.x, y2, WALL_W, h2, hl ? '#ffffff' : STYLE.main[1], hl ? '#ffe0e0' : STYLE.main[0]);
        for (var b = y2 + 40; b < BOT_Y + 40; b += 60) game.draw.rect(w.x, b, WALL_W, 6, LINE, 0.5);
      }
    }
  }

  function drawThumb() {
    var t = game.time.elapsed;
    var y = H * 0.84;
    var holding = braking && brake > 0;
    game.draw.circle(W / 2, y, 150, LINE);
    game.draw.circle(W / 2, y, 140, holding ? RED : '#ffffff', holding ? 0.9 : 0.55 + 0.1 * Math.sin(t * 3));
    game.draw.circle(W / 2 + 40, y, 100, holding ? '#c83a2a' : '#e8e8e8', 0.6);
    game.draw.sprite(HAT, { y: GOLD }, W / 2, y, 30, { anchor: 'center' });
    // ブレーキ残量
    game.draw.rect(W / 2 - 200, y + 180, 400, 26, LINE);
    game.draw.rect(W / 2 - 196, y + 184, 392 * brake, 18, brake < 0.25 ? RED : GREEN);
    // 残りヘルメット
    for (var i = 0; i < MAX_HITS; i++) game.draw.sprite(HAT, { y: i < MAX_HITS - hits ? GOLD : '#8a7a6a' }, 90 + i * 90, y + 190, 14, { anchor: 'center' });
  }

  function drawScene() {
    drawBackground();
    drawRail();
    drawWalls();
    drawLift();
    drawThumb();
  }

  function drawHud() {
    txt(String(Math.ceil(timeLeft)), W - 70, 120, 64, '#ffffff', 'right');
    txt('SCORE ' + score, 70, 110, 38, '#ffffff', 'left');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(66, 160, W - 132, 24, LINE);
    game.draw.rect(70, 164, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? RED : GREEN);
  }

  // ── ATTRACT ゴースト実演: 隙間の高さに来たら押さえて止める ──
  var demo = { t: 0, loop: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.loop++; }
    var next = null;
    for (var i = 0; i < walls.length; i++) if (!walls[i].judged && (!next || walls[i].x < next.x)) next = walls[i];
    braking = false;
    if (next) {
      var mid = (bodyTop() + liftY) / 2, gmid = next.gapTop + next.gapH / 2;
      var eta = (next.x - COL_X) / WALL_V;
      // 失敗例: 偶数周の2つ目の束は見送らない
      var sloppy = demo.loop % 2 === 0 && passed >= 1;
      if (!sloppy && eta < 1.4 && Math.abs(mid - gmid) < 40) braking = true;
    }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(true);
    } else {
      stepWorld(dt, true);
    }
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ended || ready > 0) return;
    braking = true;
    if (brake > 0) {
      game.audio.tone('G3', 0.06, { wave: 'square', volume: 0.05 });
      game.fx.burst(COL_X, liftY + 20, { color: '#ffffff', count: 4, speed: 120 });
    } else {
      game.audio.play('se_tap', 0.1);
    }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    braking = false;
    game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.04 });
  });

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
  });

  game.onUpdate(function (dt) {
    if (liftY === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 50, H * 0.85 + (braking ? 0 : 50), { press: braking, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.085, 74, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.125, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 42, GOLD);
      else txt('INSERT COIN', W / 2, H * 0.965, 32, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 230, W, 420, LINE, 0.7);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 350, 88, won ? GREEN : RED);
      txt('SCORE ' + score, W / 2, 430, 46, '#ffffff');
      txt(passed + '   PERFECT ' + perfects, W / 2, 500, 40, GOLD);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 570, 42, GOLD);
      else txt('BEST ' + (game.best || 0), W / 2, 570, 34, '#ffffff');
      if (!won) txt('あと' + Math.max(0.1, timeLeft).toFixed(1) + '秒!', W / 2, 625, 36, GOLD);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 34, '#ffffff');
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { passed: passed, perfects: perfects, hits: hits };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(false);
    } else {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && hitStop <= 0 && !ended) {
        timeLeft = 0;
        score += 300 + (MAX_HITS - hits) * 100;
        game.feedback.good(COL_X, liftY - 220, { text: 'CLEAR', color: GREEN, count: 30 });
        endGame(true, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2 + 120, H * 0.4, 96, GOLD);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['D4', 0.5]],
      { tempo: 126, wave: 'square', volume: 0.045, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
