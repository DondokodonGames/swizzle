// D-20092012-0004-candy-rope-feed.js
// キャンディロープフィード — 吊るされた飴を、ロープをなぞって切りながら下の生き物の口へ落とす
// 操作: 飴を吊るすロープを指でなぞって切る。切ると飴が落ちて弾む
// 終わり: 飴が口の中に着地すれば成功。地面や棘に落ちれば失敗
// @mechanic: trace
// @theme: candy_rope_feed
// 世界観: 洞穴の巣に住む小さな生き物。天井から吊るされた飴を、ロープをなぞり切って口元まで届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した落下進捗%
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い彩度、丸み、光沢ハイライト
  var STYLE = {
    bg: ['#ffe9d6', '#ffd3b0'],
    main: ['#ff9fc7', '#ffd23d', '#8a5a3a'],
    accent: ['#6ad6ff', '#ff5a5a'],
  };
  var C = {
    skyTop: STYLE.bg[0], skyBot: STYLE.bg[1],
    candy: STYLE.main[0], candyLight: STYLE.main[1], rope: STYLE.main[2],
    creature: STYLE.accent[0], bad: STYLE.accent[1],
    good: '#4dd88a', gold: '#ffb23d', white: '#4a2a1a', ink: '#3a2010',
  };

  var GAME_TITLE = 'CANDY FEED';
  var GROUND_Y = H * 0.86;
  var MOUTH = { x: W * 0.5, y: H * 0.78 };
  var GRAVITY = 1500;
  var CANDY_R = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE_F = [
    ['.####.', '#.##.#', '######'],
    ['.####.', '#.##.#', '#.##.#'],
  ];
  var CANDY_SPR = ['.##.', '####', '####', '.##.'];

  // ロープ2本: それぞれ天井のアンカーから飴の上部まで。切ると落下
  function buildRopes() {
    return [
      { ax: W * 0.30, ay: H * 0.06, cut: false },
      { ax: W * 0.70, ay: H * 0.06, cut: false },
    ];
  }

  var ropes, candy, spikes, cutCount, progress, phase, settleT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    ropes = buildRopes();
    candy = { x: W * 0.5, y: H * 0.30, vx: 0, vy: 0 };
    spikes = [{ x: W * 0.18, y: GROUND_Y }, { x: W * 0.82, y: GROUND_Y }];
    cutCount = 0; progress = 0; phase = 'hang'; settleT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function tryCut(x1, y1, x2, y2) {
    if (phase !== 'hang') return;
    for (var i = 0; i < ropes.length; i++) {
      var r = ropes[i];
      if (r.cut) continue;
      var d = distToSeg((x1 + x2) / 2, (y1 + y2) / 2, r.ax, r.ay, candy.x, candy.y - CANDY_R);
      if (d < 46) {
        r.cut = true;
        cutCount++;
        game.audio.play('se_break', 0.4);
        game.fx.popup('', r.ax, r.ay, { color: C.gold, size: 1 });
        var stillHeld = false;
        for (var j = 0; j < ropes.length; j++) if (!ropes[j].cut) stillHeld = true;
        if (!stillHeld) { phase = 'fall'; candy.vx = game.random(-40, 40); }
      }
    }
  }

  function updateFall(dt, isDemo) {
    if (phase !== 'fall') return;
    candy.vy += GRAVITY * dt;
    candy.x += candy.vx * dt;
    candy.y += candy.vy * dt;
    var beforePct = progress;
    progress = Math.max(progress, Math.min(100, Math.round((candy.y / MOUTH.y) * 100)));
    if (beforePct < 50 && progress >= 50 && !isDemo) game.fx.popup('あと半分!', candy.x, candy.y - 60, { color: C.gold, size: 34 });

    for (var i = 0; i < spikes.length; i++) {
      var sp = spikes[i];
      if (Math.hypot(candy.x - sp.x, candy.y - sp.y) < CANDY_R + 30) {
        phase = 'settle'; settleT = 0.4;
        if (!isDemo) {
          ok = false; finished = true;
          hitStop = 0.3;
          game.feedback.bad(candy.x, candy.y, { text: 'MISS' });
          shake = 0.28;
          game.audio.play('se_failure', 0.4);
        }
        return;
      }
    }
    if (Math.hypot(candy.x - MOUTH.x, candy.y - MOUTH.y) < CANDY_R + 50) {
      phase = 'settle'; settleT = 0.4;
      if (!isDemo) {
        ok = true; finished = true;
        hitStop = 0.15;
        game.feedback.good(MOUTH.x, MOUTH.y, { text: 'YUM', color: C.good });
        game.fx.burst(MOUTH.x, MOUTH.y, { color: C.candy, count: 18, speed: 360 });
        game.audio.play('se_success', 0.5);
      }
      return;
    }
    if (candy.y > GROUND_Y || candy.x < 0 || candy.x > W) {
      phase = 'settle'; settleT = 0.4;
      if (!isDemo) {
        ok = false; finished = true;
        hitStop = 0.25;
        game.feedback.bad(candy.x, GROUND_Y, { text: 'MISS' });
        shake = 0.2;
        game.audio.play('se_failure', 0.4);
      }
    }
  }

  function onDragPoint(x, y) {
    if (state !== S.PLAYING || ready > 0 || done) return;
    if (onDragPoint.px !== undefined) tryCut(onDragPoint.px, onDragPoint.py, x, y);
    onDragPoint.px = x; onDragPoint.py = y;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); onDragPoint.px = x; onDragPoint.py = y; } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDragPoint(x, y);
  });
  game.onRelease(function() { onDragPoint.px = undefined; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.30, gy: H * 0.06, press: true, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.idx = 0; }
    if (phase === 'hang') {
      var r = ropes[demo.idx];
      if (r) {
        var swayX = r.ax + Math.sin(game.time.elapsed * 3) * 6;
        demo.gx = swayX; demo.gy = r.ay + 40;
        demo.press = true;
        onDragPoint(demo.gx - 20, demo.gy);
        onDragPoint(demo.gx + 20, demo.gy);
        demo.idx++;
      }
    } else if (phase === 'fall') {
      updateFall(dt, true);
      demo.gx = candy.x; demo.gy = candy.y;
      demo.press = false;
    } else if (phase === 'settle') {
      settleT -= dt;
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.skyTop], [1, C.skyBot]]);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#e0a06a');
    game.draw.rect(0, 0, W, 30, C.rope, 0.6);
  }

  function drawScene() {
    var f = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(CREATURE_F[f], { '#': C.creature }, MOUTH.x, MOUTH.y, 20, { anchor: 'center' });
    game.draw.circle(MOUTH.x, MOUTH.y + 30, 30, C.ink, 0.7);
    for (var i = 0; i < spikes.length; i++) {
      var sp = spikes[i];
      game.draw.circle(sp.x, sp.y, 34, C.bad);
      game.draw.circle(sp.x, sp.y - 20, 14, C.bad);
    }
    for (var j = 0; j < ropes.length; j++) {
      var r = ropes[j];
      if (r.cut) continue;
      game.draw.line(r.ax, r.ay, candy.x, candy.y - CANDY_R, C.rope, 6);
    }
    var cf = Math.floor(game.time.elapsed * 8) % 2;
    game.draw.sprite(CANDY_SPR, { '#': cf === 0 ? C.candy : C.candyLight }, candy.x, candy.y, 11, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(progress + ' / 100', W / 2, H * 0.13, 30, C.white);
      if (!ok) txt('あと' + (100 - progress) + '%!', W / 2, H * 0.17, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(progress, { pct: progress }); else game.end.failure({ pct: progress });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      if (phase === 'fall') updateFall(dt, false);
      else if (phase === 'settle') { settleT -= dt; if (settleT <= 0 && !done) finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(progress + ' / 100', W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
