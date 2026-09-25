// D-20132016-0041-sky-block-stack.js
// スカイブロックスタック — 左右に揺れるブロックをタップで落として高く積み上げる
// 操作: 画面をタップして、頭上を左右に動くブロックを真下に落とす
// 終わり: 規定段数(8段)積めば成功。全くずれて落下すれば失敗
// @mechanic: stack
// @theme: floating_tower_builder
// 世界観: 雲の上に浮かぶ石工の作業場。風で揺れるブロックを狙い澄まして落とし、天まで届く塔を積む職人
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ段数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きく太い縁取りブロック、明快な原色
  var C = {
    bg: '#6fb8e0', bg2: '#3f7fb8', cloud: '#ffffff', tower: '#c9a06a', towerEdge: '#8a6a3e',
    block: '#e0623a', blockEdge: '#a03a1a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400',
    white: '#ffffff', ink: '#1a1008',
  };

  var GAME_TITLE = 'SKY STACK';
  var TOTAL = 8;
  var BASE_Y = H * 0.78;
  var BLOCK_H = 86;
  var BLOCK_W0 = 320;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var height, done, endWait, finished;
  var ready, hitStop, shake;
  var stackBlocks, curX, curW, curDir, curSpeed, camOff;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) {
      var cx = ((i * 260 + game.time.elapsed * 14) % (W + 400)) - 200;
      var cy = H * 0.15 + i * 70 + 10 * Math.sin(game.time.elapsed * 0.8 + i);
      game.draw.circle(cx, cy, 60, C.cloud, 0.5);
      game.draw.circle(cx + 60, cy + 10, 46, C.cloud, 0.5);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.2));
  }

  function newBlock(w, level) {
    var speed = 260 + level * 16;
    return { x: W * 0.5 - w / 2, w: w, dir: level % 2 === 0 ? 1 : -1, speed: speed };
  }

  function initGame() {
    height = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    camOff = 0;
    stackBlocks = [{ x: W * 0.5 - BLOCK_W0 / 2, w: BLOCK_W0 }];
    var cb = newBlock(BLOCK_W0, 1);
    curX = cb.x; curW = cb.w; curDir = cb.dir; curSpeed = cb.speed;
  }

  function towerScreenY(level) {
    return BASE_Y - level * BLOCK_H + camOff;
  }

  var MASON_SPRITE = ['.##.', '####', '.##.', '#.##'];
  function drawMason() {
    var bob = Math.sin(game.time.elapsed * 2.4) * 4;
    game.draw.sprite(MASON_SPRITE, { '#': C.ink }, W * 0.16, BASE_Y - 30 + bob, 18, { anchor: 'center' });
  }

  function drawTower() {
    for (var i = 0; i < stackBlocks.length; i++) {
      var b = stackBlocks[i];
      var y = towerScreenY(i);
      if (y < -100 || y > H + 100) continue;
      game.draw.rect(b.x, y - BLOCK_H, b.w, BLOCK_H, C.towerEdge);
      game.draw.rect(b.x + 6, y - BLOCK_H + 6, b.w - 12, BLOCK_H - 12, C.tower);
      for (var s = 0; s < b.w; s += 60) game.draw.line(b.x + s, y - BLOCK_H, b.x + s, y, '#00000018', 2);
    }
  }

  function drawCurrent() {
    if (finished) return;
    var y = towerScreenY(stackBlocks.length);
    var bob = Math.sin(game.time.elapsed * 4) * 3;
    game.draw.rect(curX, y - BLOCK_H + bob, curW, BLOCK_H, C.blockEdge);
    game.draw.rect(curX + 6, y - BLOCK_H + 6 + bob, curW - 12, BLOCK_H - 12, C.block);
    game.draw.line(curX - 20, y - BLOCK_H / 2 + bob, curX, y - BLOCK_H / 2 + bob, C.ink, 4);
    game.draw.line(curX + curW, y - BLOCK_H / 2 + bob, curX + curW + 20, y - BLOCK_H / 2 + bob, C.ink, 4);
  }

  function dropBlock() {
    var below = stackBlocks[stackBlocks.length - 1];
    var left = Math.max(curX, below.x);
    var right = Math.min(curX + curW, below.x + below.w);
    var overlap = right - left;
    game.audio.play('se_tap', 0.1);
    if (overlap <= 24) {
      ok = false; finished = true;
      hitStop = 0.3;
      game.feedback.bad(curX + curW / 2, towerScreenY(stackBlocks.length) - BLOCK_H / 2, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    var perfect = overlap >= curW * 0.92;
    var newW = perfect ? curW : overlap;
    var newX = perfect ? below.x + (below.w - curW) / 2 * 0 + left - (curW - overlap) * 0 : left;
    if (perfect) { newX = curX; newW = curW; }
    stackBlocks.push({ x: newX, w: newW });
    height++;
    hitStop = perfect ? 0.05 : 0.1;
    game.feedback.good(newX + newW / 2, towerScreenY(stackBlocks.length - 1) - BLOCK_H / 2, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good });
    game.fx.burst(newX + newW / 2, towerScreenY(stackBlocks.length - 1) - BLOCK_H / 2, { color: perfect ? C.gold : C.good, count: perfect ? 20 : 10, speed: 300 });
    game.audio.play(perfect ? 'se_powerup' : 'se_good', 0.4);
    if (height === 4) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 38 });
    if (height >= TOTAL) { ok = true; finished = true; finish(); return; }
    var cb = newBlock(newW, height + 1);
    curX = cb.x; curW = cb.w; curDir = cb.dir; curSpeed = cb.speed;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    dropBlock();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.5;
    if (cyc < dt || demo.t <= dt) initGame();
    var lvl = stackBlocks.length;
    var margin = curW * 0.06;
    curX += curDir * curSpeed * dt;
    if (curX <= -20) { curX = -20; curDir = 1; }
    if (curX + curW >= W + 20) { curX = W + 20 - curW; curDir = -1; }
    if (cyc > 0.9 && cyc < 1.02) {
      demo.press = true;
      dropBlock();
    } else demo.press = false;
    camOff += (Math.max(0, (stackBlocks.length - 5) * BLOCK_H) - camOff) * Math.min(1, dt * 3);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stackBlocks === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTower();
      drawMason();
      drawCurrent();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower();
      drawMason();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(height + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - height) + '段!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(height, { height: height, total: TOTAL });
        else game.end.failure({ height: height, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      curX += curDir * curSpeed * dt;
      if (curX <= 0) { curX = 0; curDir = 1; }
      if (curX + curW >= W) { curX = W - curW; curDir = -1; }
    }
    if (shake > 0) shake -= dt;
    camOff += (Math.max(0, (stackBlocks.length - 5) * BLOCK_H) - camOff) * Math.min(1, dt * 3);

    bg();
    drawTower();
    drawMason();
    drawCurrent();

    txt(height + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (height / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.3]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
