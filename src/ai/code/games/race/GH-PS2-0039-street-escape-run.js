// GH-PS2-0039-street-escape-run.js
// ストリートエスケープ — 影に追われながら路地を走り抜ける横スクロール逃走劇
// 操作: 上スワイプでジャンプ、下スワイプでスライディング。障害物の高さに合わせて使い分ける
// 終わり: 影に追いつかれると失敗。制限時間走り切れば逃げ切り成功
// @mechanic: camera_run
// @theme: alley_chase
// 世界観: 夜の裏路地。追ってくる巨大な影から、低い樽は跳んで越え、頭上のパイプは滑って潜り抜けて逃げ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 逃げ切った距離のスコア
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s MONO: 白ドット + カラーセロハンの帯。単色寄りの低情報量画面
  var C = {
    bg: '#0a0a0a', band: '#c23b3b', white: '#e8e8e8', dim: '#4a4a4a',
    shadow: '#050505', gold: '#ffd400', good: '#e8e8e8', bad: '#c23b3b', ink: '#000000',
  };

  var GAME_TITLE = 'STREET ESCAPE';
  var MAX_TIME = 18;
  var GROUND_Y = H * 0.68;
  var RUN_X = W * 0.28;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var dist, speed, obstacles, spawnTimer, action, actionT, gap, hitCount, MAX_HITS, totalTime, done, endWait, finished, ok, scrollX;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_A = ['.##.', '####', '.##.', '#..#'];
  var RUN_B = ['.##.', '####', '.##.', '.##.'];
  var JUMP_S = ['.##.', '####', '##.#', '....'];
  var SLIDE_S = ['....', '.##.', '####', '####'];

  function alleyBg() {
    game.draw.gradient(0, GROUND_Y, [[0, C.bg], [1, '#141414']]);
    // 白ドットの流れる背景(70s MONO)
    for (var i = 0; i < 40; i++) {
      var dx = ((i * 53 - scrollX * 0.5) % W + W) % W;
      var dy = (i * 71) % (GROUND_Y * 0.8);
      game.draw.circle(dx, dy, 2, C.white, 0.25);
    }
    // カラーセロハンの帯(単色差し色)
    game.draw.rect(0, GROUND_Y * 0.30, W, 14, C.band, 0.5);
    game.draw.rect(0, GROUND_Y * 0.55, W, 6, C.band, 0.3);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#161616');
    for (var j = -1; j < 14; j++) {
      var xx = ((j * 90 - scrollX) % (W + 90) + (W + 90)) % (W + 90) - 90;
      game.draw.rect(xx, GROUND_Y + 10, 3, H - GROUND_Y - 10, C.dim, 0.5);
    }
  }

  function drawChaser() {
    var chaseFrac = 1 - gap / 100;
    var cx = RUN_X - 150 - chaseFrac * 100;
    var s = 1 + chaseFrac * 0.6;
    game.draw.circle(cx, GROUND_Y - 10, 90 * s, C.shadow, 0.85);
    game.draw.circle(cx, GROUND_Y - 90 * s, 30 * s, '#ff2222', 0.55 + 0.2 * Math.sin(game.time.elapsed * 6));
  }

  function drawRunner(y, frame, hurt) {
    game.draw.circle(RUN_X, GROUND_Y + 6, 26, '#000000', 0.4);
    game.draw.sprite(frame, { '#': hurt ? C.bad : C.white, '.': null }, RUN_X, y, 20, { anchor: 'center' });
  }

  function initGame() {
    dist = 0; speed = 340; obstacles = []; spawnTimer = 1.1; action = 'run'; actionT = 0;
    gap = 100; hitCount = 0; MAX_HITS = 3; totalTime = 0; done = false; endWait = 0;
    finished = false; ok = false; scrollX = 0; ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnObstacle() {
    var isDuck = Math.random() < 0.5;
    obstacles.push({ x: W + 100, type: isDuck ? 'duck' : 'jump', t: 0, resolved: false });
  }

  function resolveHit(o) {
    hitCount++; gap = Math.max(0, gap - 34);
    hitStop = 0.32; shake = 0.3;
    game.feedback.bad(RUN_X, GROUND_Y - 40, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    if (gap <= 0) { ok = false; finished = true; finish(); }
  }

  function resolvePass(o) {
    dist += 8;
    game.feedback.good(o.x, GROUND_Y - 60, { text: null, count: 3, sound: 'se_tap' });
    if (gap < 100) gap = Math.min(100, gap + 3);
  }

  function doAction(kind) {
    if (done || ready > 0 || finished) return;
    action = kind; actionT = 0.42;
    game.audio.play(kind === 'jump' ? 'se_jump' : 'se_tap', 0.35);
    // その瞬間、判定窓内の直近の障害物を解決
    var near = null, bd = 1e9;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.resolved) continue;
      var d = Math.abs(o.x - RUN_X);
      if (d < 130 && d < bd) { bd = d; near = o; }
    }
    if (near) {
      near.resolved = true;
      var correct = (kind === 'jump' && near.type === 'jump') || (kind === 'duck' && near.type === 'duck');
      if (correct) resolvePass(near); else resolveHit(near);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.1);
    if (dir === 'up') doAction('jump');
    else if (dir === 'down') doAction('duck');
  });

  function finish() {
    if (done) return;
    done = true;
    finalScore = Math.round(dist);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: 実際の doAction() を使い、ジャンプ成功→スライド成功→避けそこねる失敗を見せる ──
  var demo = { t: 0, gx: RUN_X, gy: H * 0.90, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { obstacles = []; gap = 100; }
    scrollX += 240 * dt;
    dist += 240 * dt / 40;
    for (var i = obstacles.length - 1; i >= 0; i--) { obstacles[i].x -= 340 * dt; if (obstacles[i].x < -80) obstacles.splice(i, 1); }
    if (Math.abs(cyc - 0.4) < dt) obstacles.push({ x: W + 100, type: 'jump', t: 0, resolved: false });
    if (Math.abs(cyc - 2.0) < dt) obstacles.push({ x: W + 100, type: 'duck', t: 0, resolved: false });
    if (Math.abs(cyc - 3.6) < dt) obstacles.push({ x: W + 100, type: 'jump', t: 0, resolved: false });
    demo.press = false;
    for (var j = 0; j < obstacles.length; j++) {
      var o = obstacles[j];
      if (!o.resolved && Math.abs(o.x - RUN_X) < 24) {
        var kind = (cyc > 3.4) ? 'duck' : o.type; // 3回目はわざと間違えて失敗例を見せる
        doAction(kind);
        demo.press = true;
      }
    }
    if (actionT > 0) actionT -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (obstacles === undefined) initGame();
      alleyBg();
      drawChaser();
      stepDemo(dt);
      for (var i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);
      var frame = action === 'jump' && actionT > 0 ? JUMP_S : (action === 'duck' && actionT > 0 ? SLIDE_S : (Math.floor(game.time.elapsed * 10) % 2 ? RUN_A : RUN_B));
      drawRunner(GROUND_Y - 40, frame, false);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 48, C.white);
      txt('BEST ' + game.best + 'm', W / 2, H * 0.135, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      alleyBg();
      drawChaser();
      drawRunner(GROUND_Y - 40, ok ? RUN_A : JUMP_S, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt(finalScore + 'm', W / 2, H * 0.15, 40, C.white);
      if (!ok && finalScore >= 30) txt('あと少し!', W / 2, H * 0.21, 26, C.gold);
      var best = Math.max(game.best, finalScore);
      if (finalScore >= game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.26, 26, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { hitCount: hitCount }); else game.end.failure({ score: finalScore, hitCount: hitCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { ok = true; finished = true; finish(); }
      speed = 340 + totalTime * 8;
      scrollX += speed * dt;
      dist += speed * dt / 40;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(0.62, 1.3 - totalTime * 0.02); }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var o = obstacles[oi];
        o.x -= speed * dt;
        if (!o.resolved && o.x < RUN_X - 20) { resolveHit(o); o.resolved = true; }
        if (o.x < -100) obstacles.splice(oi, 1);
      }
      if (Math.floor(dist / 40) > Math.floor((dist - speed * dt / 40) / 40)) {
        game.fx.popup(Math.floor(dist) + 'm', W / 2, H * 0.22, { color: C.gold, size: 44 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    if (shake > 0) shake -= dt;
    if (actionT > 0) actionT -= dt;

    alleyBg();
    drawChaser();
    for (var o2 = 0; o2 < obstacles.length; o2++) drawObstacle(obstacles[o2]);
    var frame2 = action === 'jump' && actionT > 0 ? JUMP_S : (action === 'duck' && actionT > 0 ? SLIDE_S : (Math.floor(game.time.elapsed * 10) % 2 ? RUN_A : RUN_B));
    if (!finished) drawRunner(GROUND_Y - 40, frame2, false);

    game.draw.rect(60, 50, W - 120, 20, C.dim, 0.6);
    game.draw.rect(60, 50, (W - 120) * (gap / 100), 20, gap < 30 ? C.bad : C.white);
    txt(Math.floor(dist) + 'm', W / 2, 110, 34, C.white);
    txt(Math.floor(totalTime) + ' / ' + MAX_TIME, W * 0.86, 110, 24, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 74, C.gold);
  });

  function drawObstacle(o) {
    var warn = o.x - RUN_X < 220 && o.x - RUN_X > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    if (o.type === 'jump') {
      game.draw.rect(o.x - 34, GROUND_Y - 46, 68, 46, warn ? C.white : C.dim);
      game.draw.rect(o.x - 34, GROUND_Y - 46, 68, 8, C.band, 0.6);
    } else {
      game.draw.rect(o.x - 46, GROUND_Y - 130, 92, 26, warn ? C.white : C.dim);
      game.draw.rect(o.x - 46, GROUND_Y - 130, 92, 6, C.band, 0.6);
    }
  }

  game.onStart(function() {
    game.audio.melody(
      [['D4', 0.18], ['D4', 0.18], ['F4', 0.18], ['A4', 0.18], ['G4', 0.18], ['F4', 0.18]],
      { tempo: 150, wave: 'square', volume: 0.06, loop: true, bass: [['D3', 0.36], ['A2', 0.36]], bassWave: 'triangle', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
