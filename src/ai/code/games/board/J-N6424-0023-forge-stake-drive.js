// J-N6424-0023-forge-stake-drive.js
// フォージステークドライブ — 左右の柄を交互に振り下ろして杭を目標の深さまで打ち込む
// 操作: 画面左右のハンマーゾーンを交互にタップして杭を打ち込む。同じ側の連打は空振りになる
// 終わり: 規定の深さまで打ち込めれば成功。時間切れで杭が浅いままなら失敗
// @mechanic: alternate_tap
// @theme: forge_stake_drive
// 世界観: 祭りの鍛冶見習いが力自慢の一輪出店で、左右の柄を交互に振り下ろして杭を目標の深さまで打ち込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち込んだ深さ
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺背景にネオンの縁取り、彩度高いアクセント2色
  var C = {
    bg: '#150a2a', bg2: '#050212', neonA: '#ff2fd0', neonB: '#2fe0ff',
    stake: '#c9a95a', stakeDark: '#8a6f34', anvil: '#3a2f5a', anvilTop: '#5a4a8a',
    hammerL: '#ff2fd0', hammerR: '#2fe0ff', good: '#39c96a', bad: '#ff4d5e',
    gold: '#ffe14a', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'STAKE DRIVE';
  var TIME_LIMIT = 11;
  var STAKE_TOP_Y = H * 0.34, STAKE_BOT_Y = H * 0.7;
  var GOAL_DEPTH = 10;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#050212', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_L = ['.##.', '####', '#.#.', '.#.#'];
  var SMITH_R = ['.##.', '####', '.#.#', '#.#.'];

  function bg() {
    var pulse = 0.05 + 0.05 * Math.sin(game.time.elapsed * 1.6);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.neonB, pulse * 0.2);
    game.draw.line(60, H * 0.9, W - 60, H * 0.9, C.neonA, 6);
  }

  var depth, lastSide, timeLeft, hitStop, shake, done, endWait, finished, ready, halfCalled;
  var hammerFlash;

  function initGame() {
    depth = 0; lastSide = null; timeLeft = TIME_LIMIT; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    hammerFlash = [0, 0];
  }

  function drawScene() {
    var cx = W / 2;
    var stakeY = STAKE_TOP_Y + (depth / GOAL_DEPTH) * (STAKE_BOT_Y - STAKE_TOP_Y);
    game.draw.rect(cx - 200, STAKE_BOT_Y, 400, 40, C.anvil);
    game.draw.rect(cx - 200, STAKE_BOT_Y, 400, 10, C.anvilTop);
    game.draw.rect(cx - 22, stakeY, 44, STAKE_BOT_Y - stakeY + 10, C.stake);
    game.draw.rect(cx - 22, stakeY, 44, 10, C.stakeDark);
    var bobL = Math.sin(game.time.elapsed * 2.4) * 6;
    var bobR = Math.sin(game.time.elapsed * 2.4 + 1.4) * 6;
    game.draw.sprite(SMITH_L, { '#': C.neonA }, W * 0.22, H * 0.5 + bobL, 12, { anchor: 'center', flipY: hammerFlash[0] > 0.5 });
    game.draw.sprite(SMITH_R, { '#': C.neonB }, W * 0.78, H * 0.5 + bobR, 12, { anchor: 'center', flipY: hammerFlash[1] > 0.5 });
    game.draw.circle(W * 0.22, H * 0.36, 60 + hammerFlash[0] * 30, C.hammerL, 0.25 + hammerFlash[0] * 0.4);
    game.draw.circle(W * 0.78, H * 0.36, 60 + hammerFlash[1] * 30, C.hammerR, 0.25 + hammerFlash[1] * 0.4);
  }

  function hitSide(side, x, y) {
    if (finished || ready > 0) return;
    hammerFlash[side] = 1;
    if (lastSide === side) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      return;
    }
    lastSide = side;
    depth++;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.audio.play('se_break', 0.35);
    game.fx.shake(6, 0.08);
    if (!halfCalled && depth >= Math.ceil(GOAL_DEPTH / 2)) { halfCalled = true; game.fx.popup('NICE', x, y - 60, { color: C.gold, size: 30 }); }
    if (depth >= GOAL_DEPTH) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(W / 2, STAKE_BOT_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(W / 2, STAKE_BOT_Y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var side = x < W / 2 ? 0 : 1;
      hitSide(side, x, y);
    }
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.22, gy: H * 0.36, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var beat = Math.floor(cyc / 0.42);
    var side = beat % 2;
    demo.gx = side === 0 ? W * 0.22 : W * 0.78; demo.gy = H * 0.36;
    var withinBeat = cyc - beat * 0.42;
    demo.press = withinBeat < 0.12;
    if (!demo.lastBeat || demo.lastBeat < beat) {
      demo.lastBeat = beat;
      if (lastSide !== side && depth < GOAL_DEPTH) {
        lastSide = side; depth++;
        hammerFlash[side] = 1;
        game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
        game.audio.play('se_break', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (hammerFlash) {
      hammerFlash[0] = Math.max(0, hammerFlash[0] - dt * 3);
      hammerFlash[1] = Math.max(0, hammerFlash[1] - dt * 3);
    }
    if (state === S.ATTRACT) {
      if (depth === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(depth + ' / ' + GOAL_DEPTH, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL_DEPTH - depth) + '!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(depth, { depth: depth, goal: GOAL_DEPTH });
        else game.end.failure({ depth: depth, goal: GOAL_DEPTH });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, STAKE_BOT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(depth + ' / ' + GOAL_DEPTH, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.15);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['G3', 0.2], ['D4', 0.2], ['D4', 0.2]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
