// D-20092012-0034-lantern-peg-shot.js
// ランタンペグショット — 玉を引いて放ち、光る色の提灯釘だけを撃ち落とす
// 操作: 手前の玉入れ袋を指で引いて離す(スリングショット)。狙いと強さは引いた分だけ
// 終わり: 持ち球(4発)以内に光る提灯釘を全て消せば成功。撃ち尽くせば失敗
// @mechanic: slingshot
// @theme: lantern_peg_festival
// 世界観: 夜店の玉打ち台。台の提灯提灯マスコットが見守る中、盤面に並ぶ提灯釘のうち光る色だけを玉で撃ち落とす一発勝負の的当て
// 残るもの: 正誤(CLEAR/GAME OVER) + 消せた光り釘の数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: #0f380f〜#9bbc0f の4階調のみ、残像+低コントラスト、画面枠
  var C = {
    c0: '#0f380f', c1: '#1f4d1f', c2: '#306230', c3: '#8bac0f', c4: '#9bbc0f',
  };
  var STYLE = { bg: [C.c0, C.c1], main: [C.c2, C.c3], accent: [C.c4, '#ffffff'] };

  var GAME_TITLE = 'PEG SHOT';
  var SHOTS_TOTAL = 4;
  var LAUNCH = { x: W * 0.5, y: H * 0.82 };
  var PULL_MAX = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.c0, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN = ['.####.', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.c1], [1, C.c0]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 3, C.c0, 0.3);
    game.draw.rect(0, 0, W, 14, C.c0);
    game.draw.rect(0, H - 14, W, 14, C.c0);
    game.draw.rect(0, 0, 14, H, C.c0);
    game.draw.rect(W - 14, 0, 14, H, C.c0);
  }

  function makePegs() {
    var rows = [
      { y: H * 0.24, xs: [0.28, 0.5, 0.72] },
      { y: H * 0.38, xs: [0.18, 0.4, 0.62, 0.84] },
      { y: H * 0.52, xs: [0.3, 0.5, 0.7] },
    ];
    var arr = [];
    var idx = 0;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].xs.length; c++) {
        arr.push({ x: W * rows[r].xs[c], y: rows[r].y, r: 30, alive: true, target: false, id: idx++ });
      }
    }
    // 3個を光る対象(target)に指定(分散させる)
    var targetIdx = [1, 4, 8];
    for (var i = 0; i < targetIdx.length; i++) arr[targetIdx[i]].target = true;
    return arr;
  }

  var pegs, shots, cleared, targetTotal, ball, pulling, pullX, pullY, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    pegs = makePegs();
    targetTotal = 0;
    for (var i = 0; i < pegs.length; i++) if (pegs[i].target) targetTotal++;
    shots = SHOTS_TOTAL; cleared = 0;
    ball = null; pulling = false; pullX = LAUNCH.x; pullY = LAUNCH.y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function launchBall(px, py) {
    var dx = LAUNCH.x - px, dy = LAUNCH.y - py;
    var d = Math.hypot(dx, dy);
    if (d < 20) return; // 引きが弱すぎ
    var nx = dx / d, ny = dy / d;
    var speed = 700 + Math.min(d, PULL_MAX) * 3.2;
    ball = { x: LAUNCH.x, y: LAUNCH.y, vx: nx * speed, vy: ny * speed, alive: true };
    shots--;
    game.audio.play('se_jump', 0.4);
  }

  function resolvePegHit(peg, bx, by) {
    if (peg.target) {
      peg.alive = false;
      cleared++;
      game.feedback.good(bx, by, { text: 'HIT', color: C.c4 });
      game.fx.burst(bx, by, { color: C.c4, count: 16, speed: 340 });
      game.audio.play('se_break', 0.4);
      if (!milestoneShown && cleared >= Math.ceil(targetTotal / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', bx, by - 70, { color: C.c4, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.feedback.bad(bx, by, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
    ball = null;
    checkEnd();
  }

  function checkEnd() {
    if (finished || done) return;
    if (cleared >= targetTotal) {
      finished = true; ok = true; hitStop = 0.15;
      finish();
    } else if (shots <= 0 && !ball) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      finish();
    }
  }

  function stepBall(dt) {
    if (!ball) return;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < 30) { ball.x = 30; ball.vx *= -1; }
    if (ball.x > W - 30) { ball.x = W - 30; ball.vx *= -1; }
    for (var i = 0; i < pegs.length; i++) {
      var p = pegs[i];
      if (!p.alive) continue;
      if (game.hit.circle(ball.x, ball.y, 14, p.x, p.y, p.r)) {
        resolvePegHit(p, ball.x, ball.y);
        return;
      }
    }
    if (ball.y < H * 0.08 || ball.y > H) {
      ball = null;
      game.feedback.bad(LAUNCH.x, H * 0.4, { text: 'MISS' });
      checkEnd();
    }
  }

  function drawPegs() {
    for (var i = 0; i < pegs.length; i++) {
      var p = pegs[i];
      if (!p.alive) continue;
      var col = p.target ? C.c4 : C.c2;
      var pulse = p.target ? (Math.sin(game.time.elapsed * 4 + p.id) * 4) : 0;
      game.draw.circle(p.x, p.y, p.r + pulse * 0 + (p.target ? 4 : 0), C.c1, 0.6);
      game.draw.circle(p.x, p.y, p.r, col);
      if (p.target) game.draw.circle(p.x, p.y, p.r * 0.4, '#ffffff', 0.5 + Math.sin(game.time.elapsed * 5 + p.id) * 0.2);
    }
  }

  function drawBallAndSling() {
    var bx = Math.cos(game.time.elapsed * 2) * 3;
    game.draw.sprite(LANTERN, { '#': C.c4 }, LAUNCH.x + bx, LAUNCH.y + 60, 10, { anchor: 'center' });
    if (pulling) {
      game.draw.line(LAUNCH.x, LAUNCH.y, pullX, pullY, C.c3, 8);
      game.draw.circle(pullX, pullY, 16, C.c4);
    } else if (!ball && !done) {
      game.draw.circle(LAUNCH.x, LAUNCH.y, 16, C.c4);
    }
    if (ball) game.draw.circle(ball.x, ball.y, 14, C.c4);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || ball) return;
    var d = Math.hypot(x - LAUNCH.x, y - LAUNCH.y);
    if (d < 120) { pulling = true; pullX = x; pullY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pulling) return;
    var dx = x - LAUNCH.x, dy = y - LAUNCH.y;
    var d = Math.hypot(dx, dy);
    if (d > PULL_MAX) { dx = dx / d * PULL_MAX; dy = dy / d * PULL_MAX; }
    pullX = LAUNCH.x + dx; pullY = LAUNCH.y + dy;
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !pulling) return;
    pulling = false;
    launchBall(pullX, pullY);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, phase: 'pull', gx: LAUNCH.x, gy: LAUNCH.y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { pegs = makePegs(); shots = SHOTS_TOTAL; cleared = 0; ball = null; }
    var target = null;
    for (var i = 0; i < pegs.length; i++) if (pegs[i].alive && pegs[i].target) { target = pegs[i]; break; }
    if (cyc < 1.2) {
      var p = cyc / 1.2;
      var aimX = target ? target.x : LAUNCH.x;
      var aimY = target ? target.y : LAUNCH.y * 0.5;
      var pdx = (LAUNCH.x - aimX), pdy = (LAUNCH.y - aimY);
      var pd = Math.hypot(pdx, pdy);
      var nx = pd > 0 ? pdx / pd : 0, ny = pd > 0 ? pdy / pd : -1;
      demo.gx = LAUNCH.x + nx * 150 * p;
      demo.gy = LAUNCH.y + ny * 150 * p;
      demo.press = true;
      pullX = demo.gx; pullY = demo.gy; pulling = true;
    } else if (cyc < 1.35) {
      if (pulling) { pulling = false; launchBall(pullX, pullY); }
      demo.press = false;
    } else {
      stepBall(dt);
      demo.gx = LAUNCH.x + Math.sin(game.time.elapsed * 2.2) * 70;
      demo.gy = LAUNCH.y + Math.cos(game.time.elapsed * 1.6) * 30;
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pegs === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPegs();
      drawBallAndSling();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 24 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.c4);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.c3);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.c4);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.c3);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPegs();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.c4 : '#e0f090');
      txt(cleared + ' / ' + targetTotal, W / 2, H * 0.13, 30, C.c3);
      if (!ok) txt('あと' + Math.max(0, targetTotal - cleared) + '個!', W / 2, H * 0.18, 24, C.c4);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.c4);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: targetTotal, shots: SHOTS_TOTAL - shots });
        else game.end.failure({ cleared: cleared, total: targetTotal });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBall(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPegs();
    drawBallAndSling();

    txt(cleared + ' / ' + targetTotal, W / 2, H * 0.06, 30, C.c4);
    for (var i = 0; i < SHOTS_TOTAL; i++) {
      var sx = W * 0.5 - (SHOTS_TOTAL - 1) * 22 + i * 44;
      game.draw.circle(sx, H * 0.145, 10, i < shots ? C.c4 : C.c1);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.c4);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
