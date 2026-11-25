// J-N6434-0026-lilypond-leaf-umbrella.js
// 蓮池の葉っぱ傘 — 押している間だけ傘が開いて風に流され、離すと真下へ落ちる。浮き葉の的の中心へ降りる
// 操作: 押して凧船から飛び、押し続けて傘で風に流される。的の真上に来たら離して傘を閉じ、落ちる(社内メモ。画面には出さない)
// 終わり: 3回の降下を全て浮き葉に着地できれば成功。池に落ちるか時間切れで失敗
// @mechanic: hold_duration
// @theme: lilypond_leaf_umbrella
// 世界観: 蓮池の上を渡る凧船から、カエルの配達見習いが葉っぱの傘で飛び降り、傘を開いている時間だけ風に流されて、浮き葉の的の中心へ降り立つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 3回の着地精度の合計点
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色 + 光、パララックス、細かいアニメ
  var STYLE = {
    bg: ['#ffb38a', '#ffe3b3', '#6ec6c9'],
    main: ['#3fae5a', '#2a7a3e', '#9be07a'],
    accent: ['#ffd23f', '#ff4f5e'],
  };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], water: STYLE.bg[2], water2: '#3d8fa6',
    leaf: STYLE.main[0], leafDark: STYLE.main[1], leafLight: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    cloud: '#fff6ea', wood: '#a0673a', ink: '#23324a', white: '#ffffff', sun: '#fff1a8',
  };

  var GAME_TITLE = 'LEAF DROP';
  var TIME_LIMIT = 15;
  var JUMPS = 3;
  var START_Y = H * 0.24;
  var LAND_Y = H * 0.70;
  var OPEN_VY = 170, SHUT_VY = 1100, SHUT_DRIFT = 0.15;
  var WAIT_MAX = 2.5;
  var PAD_R = 200;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──────────────────────────────────────
  var FROG = [
    ['..gg..gg..', '.gwkggwkg.', '.gggggggg.', '.ggrrrrgg.', '..gggggg..', '.g.gyyg.g.', 'g..gyyg..g', '...g..g...'],
    ['..gg..gg..', '.gwkggwkg.', '.gggggggg.', '.ggggrggg.', '..gggggg..', 'g..gyyg..g', '.g.gyyg.g.', '..g....g..'],
  ];
  var FROG_PAL = { g: '#58c24f', w: '#ffffff', k: '#23324a', r: '#ff4f5e', y: '#ffe9a0' };
  var UMB_OPEN = ['....llll....', '..llLLLLll..', '.lLLLLLLLLl.', 'lLlLLlLLlLLl', 'l.l..l..l..l', '.....s......', '.....s......'];
  var UMB_SHUT = ['..l..', '.lLl.', '.lLl.', '.lLl.', '..l..', '..s..', '..s..'];
  var UMB_PAL = { l: '#2a7a3e', L: '#3fae5a', s: '#a0673a' };
  var KITE = ['....rr....', '...rggr...', '..rgggrr..', '.rgggggr..', 'rrrrrrrrr.', '....w.....', '...w......'];
  var KITE_PAL = { r: '#ff4f5e', g: '#ffd23f', w: '#ffffff' };
  var CLOUD = ['..cccc....', '.cccccccc.', 'cccccccccc', '.cccccccc.'];
  var DRAGONFLY = ['b.b', '.k.', 'b.b'];
  var LOTUS = ['.p.p.', 'ppppp', '.ppp.'];

  // ── 状態 ─────────────────────────────────────────
  var jump, phase, phaseT, fx, fy, vx, wind, targetX, holdT, opened, released, gust, gustT, gustWarn;
  var scores, total, timeLeft, ready, stopT, doneT, ok, endReason, landDist, lastGrade, halfShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame(demoMode) {
    jump = 0; scores = []; total = 0; timeLeft = TIME_LIMIT;
    ready = demoMode ? 0 : 0.8; stopT = 0; doneT = 0; ok = false; endReason = ''; halfShown = false;
    setupJump();
    if (!demoMode) phase = 'ready';
  }

  // 風向き・風力から「ちょうど良い保持時間」を逆算して的を置く
  function setupJump() {
    var dir = jump % 2 === 0 ? 1 : -1;
    wind = dir * (140 + jump * 45 + Math.random() * 40);
    var tStar = 0.9 + Math.random() * 1.0;
    var startX = dir > 0 ? W * 0.16 : W * 0.84;
    var y = START_Y + OPEN_VY * tStar;
    var x = startX + wind * tStar;
    var tr = (LAND_Y - y) / SHUT_VY;
    x += wind * SHUT_DRIFT * tr;
    targetX = Math.max(170, Math.min(W - 170, x));
    fx = startX; fy = START_Y; vx = 0;
    holdT = 0; opened = false; released = false; landDist = 0; lastGrade = '';
    // 3回目は空中で突風(0.7秒前に木の葉のつむじで予告)
    gust = jump === 2 ? { at: 0.5 + Math.random() * 0.4, power: 1.35, fired: false } : null;
    gustT = 0; gustWarn = 0;
    phase = 'perch'; phaseT = WAIT_MAX;
  }

  // 押す = 飛び降りて傘を開く / 離す = 傘を閉じて落ちる(プレイヤーもデモAIも共通)
  function press(live) {
    if (phase === 'perch') {
      phase = 'fall'; opened = true; holdT = 0;
      if (live) { game.audio.play('se_jump', 0.35); game.fx.burst(fx, fy, { color: C.leafLight, count: 8, speed: 180 }); }
      return;
    }
    if (live) game.audio.play('se_tap', 0.1);
  }
  function release(live) {
    if (phase === 'fall' && opened) {
      opened = false; released = true;
      if (live) {
        game.audio.tone('G4', 0.1, { wave: 'triangle', volume: 0.1, slide: -200 });
        game.fx.burst(fx, fy - 60, { color: C.leaf, count: 6, speed: 140 });
      }
    }
  }

  function land(live) {
    phase = 'land'; phaseT = 0.8;
    fy = LAND_Y;
    landDist = Math.abs(fx - targetX);
    var pts = landDist < 40 ? 100 : landDist < 110 ? 60 : landDist < PAD_R ? 30 : 0;
    lastGrade = pts === 100 ? 'PERFECT' : pts === 60 ? 'GOOD' : pts === 30 ? 'NICE' : 'MISS';
    if (pts === 0) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'splash';
      if (live) {
        game.audio.stopBgm();
        game.feedback.bad(fx, LAND_Y - 120, { text: 'MISS', color: C.red, shake: 12 });
        game.audio.play('se_failure', 0.5);
      } else game.fx.burst(fx, LAND_Y, { color: C.white, count: 14, speed: 260 });
      return;
    }
    scores.push(pts); total += pts;
    if (live) {
      game.feedback.good(fx, LAND_Y - 140, { text: lastGrade, color: pts === 100 ? C.gold : C.leafLight, size: 60, count: pts === 100 ? 20 : 10 });
      if (scores.length === 2 && !halfShown) { halfShown = true; game.audio.play('se_milestone', 0.4); game.fx.popup(total + '', W / 2, H * 0.34, { color: C.gold, size: 70 }); }
    } else game.fx.burst(fx, LAND_Y, { color: C.gold, count: 12, speed: 220 });
  }

  function stepWorld(dt, live) {
    if (gustWarn > 0) gustWarn -= dt;
    if (phase === 'perch') {
      phaseT -= dt;
      if (live && phaseT < 0.6 && phaseT + dt >= 0.6) game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.06 });
      if (phaseT <= 0) {
        // 待ちすぎ: 足を滑らせて傘を開けないまま落ちる
        phase = 'fall'; opened = false; released = true;
        if (live) game.audio.tone('C4', 0.2, { wave: 'sawtooth', volume: 0.08, slide: -120 });
      }
    } else if (phase === 'fall') {
      if (opened) {
        holdT += dt;
        var w = wind;
        if (gust) {
          if (!gust.fired && holdT > gust.at - 0.7 && gustWarn <= 0) { gustWarn = 0.7; if (live) game.audio.tone('A3', 0.3, { wave: 'triangle', volume: 0.1, slide: 180 }); }
          if (!gust.fired && holdT >= gust.at) gust.fired = true;
          if (gust.fired) w = wind * gust.power;
        }
        fx += w * dt; fy += OPEN_VY * dt;
      } else {
        fx += wind * SHUT_DRIFT * dt; fy += SHUT_VY * dt;
      }
      if (fx < 40 || fx > W - 40) fx = Math.max(40, Math.min(W - 40, fx));
      if (fy >= LAND_Y) land(live);
    } else if (phase === 'land') {
      phaseT -= dt;
      if (phaseT <= 0) {
        jump++;
        if (jump >= JUMPS) {
          phase = 'stop'; stopT = 0.6; ok = true; endReason = 'clear';
          if (live) {
            game.audio.stopBgm();
            game.feedback.good(W / 2, H * 0.40, { text: 'CLEAR', color: C.gold, size: 90, count: 30 });
            game.audio.play('se_success', 0.55);
          }
        } else setupJump();
      }
    }
    if (live && phase !== 'stop' && phase !== 'done' && phase !== 'ready') {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        phase = 'stop'; stopT = 0.6; ok = false; endReason = 'time';
        game.audio.stopBgm();
        game.feedback.bad(fx, fy - 120, { text: 'TIME UP', color: C.red, shake: 8 });
        game.audio.play('se_failure', 0.5);
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, LAND_Y, [[0, C.sky1], [0.7, C.sky2], [1, '#ffeccc']]);
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(t * 1.3));
    game.draw.circle(W * 0.78, H * 0.13, 90, C.sun, 0.9);
    game.draw.circle(W * 0.78, H * 0.13, 130, C.sun, 0.25);
    // 風に流れる雲(3層パララックス)
    var windDir = wind >= 0 ? 1 : -1;
    for (var k = 0; k < 3; k++) {
      var sp = (20 + k * 25) * windDir;
      for (var i = 0; i < 3; i++) {
        var cx = ((i * 420 + t * sp) % (W + 400) + W + 400) % (W + 400) - 200;
        game.draw.sprite(CLOUD, { c: C.cloud }, cx, H * (0.30 + k * 0.1) + Math.sin(t + i) * 8, 10 + k * 4, { anchor: 'center', alpha: 0.45 + k * 0.2 });
      }
    }
    // 池
    game.draw.gradient(LAND_Y - 20, H, [[0, C.water], [1, C.water2]]);
    for (var y = LAND_Y; y < H; y += 26) {
      var sh = Math.sin(t * 2 + y * 0.05) * 40;
      game.draw.rect(80 + sh + (y % 3) * 120, y, 180, 4, C.white, 0.25);
    }
    game.draw.sprite(LOTUS, { p: '#ff9ad0' }, 120 + Math.sin(t * 1.5) * 6, LAND_Y + 120, 12, { anchor: 'center' });
    game.draw.sprite(LOTUS, { p: '#ffb8e0' }, W - 110 + Math.cos(t * 1.4) * 6, LAND_Y + 230, 12, { anchor: 'center' });
    game.draw.sprite(DRAGONFLY, { b: '#bff4ff', k: C.ink }, (t * 120) % W, LAND_Y - 60 + Math.sin(t * 6) * 20, 10, { anchor: 'center' });
  }

  function drawWind() {
    // 吹き流し(風向きと強さ) — 上空の旗
    var t = game.time.elapsed;
    var dir = wind >= 0 ? 1 : -1;
    var len = Math.min(5, Math.round(Math.abs(wind) / 60));
    var bx = W / 2, by = 290;
    game.draw.rect(bx - 4, by - 20, 8, 110, C.wood);
    for (var i = 0; i < len; i++) {
      var flap = Math.sin(t * 12 + i) * 6;
      game.draw.rect(bx + dir * (10 + i * 44) - (dir < 0 ? 40 : 0), by - 14 + flap, 40, 26, i % 2 ? C.white : C.red);
    }
    if (gustWarn > 0 && Math.floor(t * 12) % 2 === 0) {
      for (var q = 0; q < 8; q++) game.draw.sprite(['ll', 'l.'], { l: C.leafLight }, fx - dir * 200 + q * 30 * dir, fy - 100 + Math.sin(t * 20 + q) * 60, 8, { anchor: 'center' });
    }
  }

  function drawTarget(highlight) {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 2) * 4;
    game.draw.circle(targetX, LAND_Y + 20 + bob, PAD_R, C.leafDark);
    game.draw.circle(targetX, LAND_Y + 14 + bob, PAD_R - 10, C.leaf);
    game.draw.circle(targetX, LAND_Y + 14 + bob, 110, C.leafLight);
    game.draw.circle(targetX, LAND_Y + 14 + bob, 40, C.gold, 0.7 + 0.3 * Math.sin(t * 6));
    if (highlight) {
      game.draw.circle(targetX, LAND_Y + 14, 60, C.white, 0.4 + 0.3 * Math.sin(t * 30));
      game.draw.line(targetX, LAND_Y + 14, fx, LAND_Y + 14, C.red, 6);
    }
  }

  function drawJumper(highlight) {
    var t = game.time.elapsed;
    // 凧船(出発点)
    var dir = wind >= 0 ? 1 : -1;
    var kx = dir > 0 ? W * 0.16 : W * 0.84;
    game.draw.sprite(KITE, KITE_PAL, kx, START_Y - 140 + Math.sin(t * 2) * 8, 16, { anchor: 'center' });
    game.draw.rect(kx - 90, START_Y + 50 + Math.sin(t * 2) * 8, 180, 18, C.wood);
    game.draw.line(kx, START_Y - 90, kx, START_Y + 50, C.white, 3);
    // 影(真下の水面)
    if (phase !== 'land' || phaseT > 0) game.draw.circle(fx, LAND_Y + 16, 40 * (0.5 + (fy - START_Y) / (LAND_Y - START_Y) * 0.5), C.ink, 0.2);
    var f = Math.floor(t * 6) % 2;
    var bob = phase === 'perch' ? Math.sin(t * 5) * 6 : 0;
    var sway = phase === 'perch' ? Math.cos(t * 3) * 6 : 0;
    var yy = fy + bob;
    var sunk = phase === 'stop' && !ok && endReason === 'splash';
    if (highlight) game.draw.circle(fx, yy, 120, C.white, 0.35 + 0.3 * Math.sin(t * 30));
    if (opened) game.draw.sprite(UMB_OPEN, UMB_PAL, fx + sway, yy - 150, 16, { anchor: 'center' });
    else game.draw.sprite(UMB_SHUT, UMB_PAL, fx + 50 + sway, yy - 60, 12, { anchor: 'center' });
    game.draw.sprite(FROG[f], FROG_PAL, fx + sway, yy + (sunk ? 40 : 0), 13, { anchor: 'center', alpha: sunk ? 0.6 : 1 });
    if (phase === 'perch') {
      // 飛び降り待ちの残り(縮むリング)
      game.draw.circle(fx, yy, 50 + 50 * (phaseT / WAIT_MAX), C.gold, 0.25);
    }
  }

  function drawPad() {
    // 親指ゾーン: 押している間は傘が開く(傘アイコンが開閉)
    var t = game.time.elapsed;
    var py = H * 0.88;
    game.draw.circle(W / 2, py, 130, C.ink, 0.25);
    game.draw.circle(W / 2, py, 112, opened ? C.leafLight : C.white, 0.35 + 0.1 * Math.sin(t * 4));
    game.draw.sprite(opened ? UMB_OPEN : UMB_SHUT, UMB_PAL, W / 2, py, opened ? 12 : 14, { anchor: 'center' });
  }

  function drawHud() {
    txt(total + '', W / 2, 64, 56, C.ink);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 120, W - 160, 16, C.white, 0.6);
    game.draw.rect(80, 120, (W - 160) * (timeLeft / TIME_LIMIT), 16, low ? C.red : C.leaf);
    for (var i = 0; i < JUMPS; i++) {
      var sc = scores[i];
      game.draw.circle(W / 2 - 90 + i * 90, 190, 26, sc === undefined ? C.white : sc === 100 ? C.gold : C.leaf, sc === undefined ? 0.5 : 1);
    }
    txt(Math.min(jump + 1, JUMPS) + ' / ' + JUMPS, W - 120, 190, 34, C.ink);
  }

  function drawScene(highlight) {
    drawBack();
    drawTarget(highlight);
    drawWind();
    drawJumper(highlight);
    drawPad();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.36, W, H * 0.18, C.white, 0.8);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.40, 100, C.gold);
      txt(total + ' / ' + (JUMPS * 100), W / 2, H * 0.47, 46, C.leafDark);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.40, 90, C.red);
      if (endReason === 'splash') txt('あと' + Math.max(1, Math.round((landDist - PAD_R) / 10)) + 'cm!', W / 2, H * 0.47, 46, C.ink);
      else txt('あと' + (JUMPS - scores.length) + '回!', W / 2, H * 0.47, 46, C.ink);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.52, 34, C.ink);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.33, 52, C.red);
  }

  function calcScore() { return total + Math.round(timeLeft * 10); }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'perch' || phase === 'fall') press(true);
    else game.audio.play('se_tap', 0.08);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'fall' && opened) release(true);
    else game.fx.burst(x, y, { color: C.white, count: 2, speed: 60 });
  });

  // ── ATTRACT デモ: AIが同じ press/release で降りる。3回目はわざと離し遅れて池に落ちる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.88, press: false, tRel: 1, waitT: 0.4, jumpRef: -1, holdOn: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 11;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.jumpRef = -1; demo.holdOn = false; }
    if (phase === 'stop' || phase === 'done') { phase = 'hold'; }
    if (phase === 'perch' && demo.jumpRef !== jump) {
      demo.jumpRef = jump; demo.waitT = 0.35 + Math.random() * 0.3;
      // 的に合う保持時間を逆算(3回目は0.45秒離し遅れ)
      var d = Math.abs(targetX - fx) / Math.abs(wind);
      demo.tRel = Math.max(0.3, d * 0.86) + (jump === 2 ? 0.45 : 0);
    }
    if (phase === 'perch' && WAIT_MAX - phaseT >= demo.waitT) { press(false); demo.holdOn = true; }
    if (phase === 'fall' && opened && holdT >= demo.tRel) { release(false); demo.holdOn = false; }
    if (phase !== 'fall') demo.holdOn = false;
    demo.press = demo.holdOn;
    if (phase !== 'hold') stepWorld(dt, false);
  }

  function startMusic() {
    game.audio.melody([
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['F5', 1], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['Bb4', 0.5], ['G4', 0.5], ['C5', 1.5], [null, 0.5],
    ], { tempo: 104, wave: 'triangle', volume: 0.06, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (jump === undefined) initGame(true);
      stepDemo(dt);
      drawScene(phase === 'hold');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 84, C.white);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 34, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(!ok);
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'perch'; phaseT = WAIT_MAX; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { landed: scores.length, total: total, jumps: JUMPS };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    } else {
      stepWorld(dt, true);
    }

    drawScene((phase === 'stop' || phase === 'done') && !ok);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, C.gold);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
