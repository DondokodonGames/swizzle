// D-20172021-0017-span-pier-stack.js
// スパン・ピア・スタック — 左右に揺れる橋桁を的確なタイミングで落とし、演出付きのライバルと並行して橋を積み上げる
// 操作: 左右に揺れる橋桁が土台の真上に来た瞬間にタップして落とし、はみ出さないよう重ねていく
// 終わり: 規定段数を崩さず積み上げれば橋が架かり成功。土台からはみ出して落下すると失敗
// @mechanic: stack
// @theme: bridge_pier_stack
// 世界観: 渓谷にかかる橋の建設班が、演出付きのライバル班と並行しながら左右に揺れる橋桁を絶妙な位置で積み重ね、崩さずに対岸まで橋を架ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 積み上げた段数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var C = {
    bg1: '#5a5248', bg2: '#28241e', pier: '#c8a878', pierDark: '#8a6c48',
    moving: '#e8c898', movingEdge: '#fff2d0', rival: '#8a9aa8',
    good: '#8fd67a', bad: '#ff6a5a', gold: '#ffcf6a', ink: '#f4ecd8', white: '#ffffff',
  };

  var GAME_TITLE = 'SPAN STACK';
  var DROPS_NEEDED = 8;
  var BLOCK_H = 84;
  var BASE_Y = H * 0.78;
  var BASE_W = 380;
  var MIN_W = 36;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#100c08', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.6);
    game.draw.circle(W * 0.5, H * 0.3, 220, C.bg1, 0.25);
    // rival silhouette bridge (visual only, no real state)
    var rn = Math.min(6, Math.floor(game.time.elapsed * 0.5) % 7);
    for (var i = 0; i <= rn; i++) {
      game.draw.rect(W * 0.16 - 40, H * 0.30 - i * 30, 80, 24, C.rival, 0.35);
    }
    txt('RIVAL', W * 0.16, H * 0.20, 16, C.rival, 'center');
  }

  var stack, movX, movDir, movSpeed, camOff, drops, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    stack = [{ x: W * 0.5, w: BASE_W }];
    movX = W * 0.5; movDir = 1; movSpeed = 260; camOff = 0; drops = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function topBlock() { return stack[stack.length - 1]; }

  function screenY(row) { return BASE_Y - (row * BLOCK_H - camOff); }

  function drawScene() {
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      var sy = screenY(i);
      if (sy < H * 0.12 || sy > H * 0.95) continue;
      game.draw.rect(b.x - b.w / 2, sy - BLOCK_H / 2 + 6, b.w, BLOCK_H - 12, C.pier);
      game.draw.rect(b.x - b.w / 2, sy - BLOCK_H / 2 + 6, b.w, 8, C.pierDark);
    }
    if (!finished) {
      var top = topBlock();
      var my = screenY(stack.length);
      game.draw.rect(movX - top.w / 2, my - BLOCK_H / 2 + 6, top.w, BLOCK_H - 12, C.moving);
      game.draw.rect(movX - top.w / 2, my - BLOCK_H / 2 + 6, top.w, 8, C.movingEdge);
      game.draw.sprite(WORKER, { '#': C.ink }, movX, my - BLOCK_H, 16, { anchor: 'center' });
    }
  }

  function dropBlock(x, y) {
    if (finished || ready > 0) return;
    var top = topBlock();
    var left = Math.max(top.x - top.w / 2, movX - top.w / 2);
    var right = Math.min(top.x + top.w / 2, movX + top.w / 2);
    var overlap = right - left;
    if (overlap < MIN_W) {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    var newX = (left + right) / 2;
    stack.push({ x: newX, w: overlap });
    drops++;
    camOff += BLOCK_H;
    movSpeed += 22;
    game.feedback.good(x, y, { text: 'PIER', color: C.good });
    game.audio.play('se_milestone', 0.3);
    if (!halfCalled && drops === Math.ceil(DROPS_NEEDED / 2)) {
      halfCalled = true;
      game.fx.popup('NICE', newX, screenY(stack.length - 1) - 60, { color: C.gold, size: 32 });
    }
    movX = newX;
    if (drops >= DROPS_NEEDED) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) dropBlock(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    movX += movDir * movSpeed * dt;
    var top = topBlock();
    var half = top.w / 2;
    if (movX > top.x + half + 60) movDir = -1;
    if (movX < top.x - half - 60) movDir = 1;
    if (cyc > 0.6 && cyc < 0.75 && !finished) {
      dropBlock(movX, screenY(stack.length));
      demo.press = true;
    } else {
      demo.press = false;
    }
    demo.gx = movX; demo.gy = H * 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stack === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(drops + ' / ' + DROPS_NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (DROPS_NEEDED - drops) + '段!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(drops, { drops: drops, total: DROPS_NEEDED });
        else game.end.failure({ drops: drops, total: DROPS_NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      movX += movDir * movSpeed * dt;
      var top = topBlock();
      var half = top.w / 2;
      if (movX > top.x + half + 60) movDir = -1;
      if (movX < top.x - half - 60) movDir = 1;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(drops + ' / ' + DROPS_NEEDED, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.2);
    game.draw.rect(60, 150, (W - 120) * (drops / DROPS_NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.4]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
