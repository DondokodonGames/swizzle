// I-GBA-0034-airlock-boot-dock.js
// エアロックブーツドック — 落ちてくるブーツを正しい形のソケットへ収める
// 操作: 落下してくるブーツの形(丸/角/スリット)を見て、対応するソケットをタップして収める
// 終わり: 目標数を先に収めればCLEAR。ミス3回でGAME OVER
// @mechanic: gap_fit
// @theme: airlock_boot_dock
// 世界観: 宇宙ステーションの整備ベイ。次々降りてくるブーツを、形の合うドッキングソケットに収めて出撃準備を整える整備ロボットの話
// 残るもの: 正誤(CLEAR/GAME OVER) + 収めた数/ミス数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺背景+ネオンの発光線、限定色
  var C = {
    bg1: '#160a28', bg2: '#05030c', grid: '#3a1a6a', panel: '#241242',
    cyan: '#3af0ff', magenta: '#ff3ad0', yellow: '#ffe94d',
    good: '#4dff9a', bad: '#ff4d6a', gold: '#ffe94d', white: '#f4eaff', ink: '#08040f',
  };

  var GAME_TITLE = 'BOOT DOCK';
  var SHAPES = ['circle', 'square', 'slot'];
  var TARGET = 8;
  var LOSE_MISS = 3;
  var LANE_X = W * 0.5;
  var SPAWN_Y = H * 0.22;
  var LIMIT_Y = H * 0.70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var score, misses, sockets, cap, ready, hitStop, shake, done, endWait, finished, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), C.grid, 2);
    for (var j = 0; j < 6; j++) game.draw.line(j * (W / 6), 0, j * (W / 6), H, C.grid, 2);
  }

  function makeSockets() {
    var xs = [W * 0.22, W * 0.5, W * 0.78];
    var s = [];
    for (var i = 0; i < 3; i++) s.push({ shape: SHAPES[i], x: xs[i], y: H * 0.84 });
    return s;
  }

  var BOOT_A = ['.##.', '####', '####', '.##.'];
  var BOOT_B = ['####', '#..#', '#..#', '####'];

  function drawShapeIcon(shape, x, y, size, color) {
    if (shape === 'circle') {
      game.draw.circle(x, y, size, color);
      game.draw.circle(x, y, size * 0.4, C.ink);
    } else if (shape === 'square') {
      game.draw.rect(x - size, y - size, size * 2, size * 2, color);
      game.draw.rect(x - size * 0.4, y - size * 0.4, size * 0.8, size * 0.8, C.ink);
    } else {
      game.draw.rect(x - size * 0.4, y - size, size * 0.8, size * 2, color);
      game.draw.rect(x - size * 0.15, y - size * 0.6, size * 0.3, size * 1.2, C.ink);
    }
  }

  function drawSockets(list, warnGlow) {
    for (var i = 0; i < list.length; i++) {
      var sk = list[i];
      game.draw.circle(sk.x, sk.y, 130, C.panel);
      game.draw.circle(sk.x, sk.y, 130, C.cyan, warnGlow ? 0.9 : 0.35);
      drawShapeIcon(sk.shape, sk.x, sk.y, 54, C.cyan);
    }
  }

  function drawCapsule(c) {
    if (!c || !c.alive) return;
    var t = c.t / c.life;
    var y = SPAWN_Y + (LIMIT_Y - SPAWN_Y) * t;
    var warn = t > 0.65;
    var glow = warn && Math.floor(c.t * 10) % 2 === 0 ? C.bad : C.magenta;
    var frame = Math.floor(c.t * 6) % 2 === 0 ? BOOT_A : BOOT_B;
    game.draw.circle(LANE_X, y, 76, glow, 0.9);
    game.draw.sprite(frame, { '#': C.white }, LANE_X, y, 16, { anchor: 'center' });
    drawShapeIcon(c.shape, LANE_X, y - 92, 30, C.yellow);
  }

  function drawThreshold(warnFlash) {
    game.draw.line(W * 0.1, LIMIT_Y, W * 0.9, LIMIT_Y, warnFlash ? C.bad : C.cyan, warnFlash ? 10 : 4);
  }

  function spawnCapsule(life) {
    return { shape: SHAPES[Math.floor(Math.random() * 3)], t: 0, life: life, alive: true };
  }

  function initGame() {
    score = 0; misses = 0; sockets = makeSockets();
    cap = spawnCapsule(2.0);
    ready = 0.8; hitStop = 0; shake = 0;
    done = false; endWait = 0; finished = false; milestoneShown = false;
  }

  function nextRound() {
    var life = Math.max(1.15, 2.0 - score * 0.07);
    cap = spawnCapsule(life);
  }

  function onMiss(x, y) {
    misses++;
    hitStop = 0.32; shake = 0.22;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    cap.alive = false;
    if (misses >= LOSE_MISS) { ok = false; finished = true; finish(); }
  }

  function onHit(x, y) {
    var golden = (score + 1) % 4 === 0;
    score += golden ? 2 : 1;
    game.feedback.good(x, y, { text: golden ? 'GOLDEN!' : 'FIT!', color: golden ? C.gold : C.good });
    game.fx.burst(x, y, { color: golden ? C.gold : C.cyan, count: golden ? 24 : 14, speed: 360 });
    game.audio.play(golden ? 'se_powerup' : 'se_coin', 0.45);
    cap.alive = false;
    if (!milestoneShown && score >= TARGET / 2) {
      milestoneShown = true;
      game.fx.popup('HALFWAY', W / 2, H * 0.3, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (score >= TARGET) { ok = true; finished = true; finish(); }
  }

  function tapAt(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < sockets.length; i++) {
      var d = Math.hypot(x - sockets[i].x, y - sockets[i].y);
      if (d < bd) { bd = d; best = sockets[i]; }
    }
    if (!best || bd > 190) { game.audio.play('se_tap', 0.12); return; }
    game.audio.play('se_tap', 0.15);
    if (!cap.alive) return;
    if (best.shape === cap.shape) onHit(best.x, best.y);
    else onMiss(best.x, best.y);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || ready > 0 || finished) return;
    tapAt(x, y);
  });

  // ── ATTRACT デモ: 実ロジックを流用(成功1回+失敗1回) ──
  var demo = { t: 0, gx: LANE_X, gy: H * 0.84, press: false, cap: null, phase: 'in', sockets: makeSockets() };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) {
      demo.cap = { shape: 'circle', t: 0, life: 2.0, alive: true };
      demo.phase = 'success';
    }
    if (demo.phase === 'success' && cyc >= 2.9 && demo.cap.shape !== '__done') {
      demo.cap = { shape: 'square', t: 0, life: 2.0, alive: true };
      demo.phase = 'fail';
    }
    if (demo.cap.alive) {
      demo.cap.t += dt;
      var target = demo.sockets[demo.phase === 'success' ? 0 : 2];
      if (demo.phase === 'success') {
        var tt = Math.min(1, demo.cap.t / 1.6);
        demo.gx = LANE_X + (target.x - LANE_X) * tt;
        demo.gy = (SPAWN_Y + (LIMIT_Y - SPAWN_Y) * (demo.cap.t / demo.cap.life)) + (target.y - (SPAWN_Y + (LIMIT_Y - SPAWN_Y) * (demo.cap.t / demo.cap.life))) * tt;
        demo.press = tt > 0.85;
        if (demo.cap.t >= 1.62 && demo.cap.alive) { demo.cap.alive = false; game.fx.burst(target.x, target.y, { color: C.cyan, count: 12, speed: 300 }); }
      } else {
        // 失敗デモ: 手を動かさずタイムアウトさせる(危険telegraph実演)
        demo.gx = LANE_X; demo.gy = H * 0.9; demo.press = false;
        if (demo.cap.t >= demo.cap.life) demo.cap.alive = false;
      }
    }
    sockets = demo.sockets; cap = demo.cap;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var warnFlash = cap && cap.alive && (cap.t / cap.life) > 0.65 && Math.floor(cap.t * 10) % 2 === 0;
      drawThreshold(warnFlash);
      drawSockets(sockets, false);
      drawCapsule(cap);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSockets(sockets, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 52, ok ? C.good : C.bad);
      txt('DOCKED ' + score + ' / ' + TARGET, W / 2, H * 0.14, 30, C.white);
      if (ok && score >= game.best) txt('NEW RECORD', W / 2, H * 0.19, 26, C.gold);
      else txt(ok ? 'MISS ' + misses : 'あと' + Math.max(1, TARGET - score) + '!', W / 2, H * 0.19, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { docked: score, misses: misses });
        else game.end.failure({ docked: score, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cap.t += dt;
      if (cap.alive && cap.t >= cap.life) onMiss(LANE_X, LIMIT_Y);
      if (!cap.alive && !finished) nextRound();
    }
    if (shake > 0) shake -= dt;

    bg();
    var wf = cap && cap.alive && (cap.t / cap.life) > 0.65 && Math.floor(cap.t * 10) % 2 === 0;
    drawThreshold(wf);
    drawSockets(sockets, hitStop > 0);
    drawCapsule(cap);

    txt('SCORE ' + score + ' / ' + TARGET, W / 2, H * 0.05, 32, C.white);
    game.draw.rect(60, 130, W - 120, 20, C.ink, 0.5);
    game.draw.rect(60, 130, (W - 120) * Math.min(1, score / TARGET), 20, C.cyan);
    txt('MISS ' + misses + ' / ' + LOSE_MISS, W - 90, H * 0.05, 22, C.bad, 'right');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['E3', 0.5], ['G3', 0.5], ['C4', 1]], { tempo: 100, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
