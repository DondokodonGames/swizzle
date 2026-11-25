// D-20222026-0037-numeral-cannon-stack.js
// ニューメラルキャノンスタック — 振れる砲身部品を的確に積み上げ、数字を伸ばして巨砲へ仕立て上げる
// 操作: 左右に揺れる砲身部品を、真下の部品とずれが少ない位置でタップして積む
// 終わり: 規定の高さまで積み上げれば成功。大きくずれて崩す/時間切れは失敗
// @mechanic: stack
// @theme: numeral_cannon_stack
// 世界観: 前線の技師が振れる砲身部品を的確に積み上げ、数字を伸ばして一基の巨砲へ仕立て上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ段数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 緑燐光1色基調、走査線を薄く重ねる
  var C = {
    bg: '#08160c', bg2: '#040a06', scan: '#0c2414', block: '#3cff8a', blockDk: '#1a8a4a',
    fort: '#c85a4a', good: '#3cff8a', bad: '#ff4d5e', gold: '#ffe23c', ink: '#c8ffdc',
  };

  var GAME_TITLE = 'CANNON STACK';
  var MAX_TIME = 18;
  var NEEDED = 5;
  var BASE_X = W * 0.5, BASE_Y = H * 0.78, BH = 66;
  var START_W = 420, MIN_W = 90;
  var TOP_Y = H * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#020604', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FORT_S = ['#.##.#', '######', '#....#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.1);
    for (var i = 0; i < 20; i++) game.draw.rect(0, i * (H / 20), W, 2, C.scan, 0.3);
    game.draw.sprite(FORT_S, { '#': C.fort }, W * 0.84, H * 0.86, 16, { anchor: 'center' });
  }

  var stack, falling, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    stack = [{ x: BASE_X, w: START_W }];
    spawnFalling();
    roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnFalling() {
    var top = stack[stack.length - 1];
    falling = { x: BASE_X, w: top.w, dir: (Math.random() < 0.5 ? -1 : 1), speed: 260 + stack.length * 22, phase: game.random(0, Math.PI) };
  }

  function drawScene() {
    bg();
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      var y = BASE_Y - i * BH;
      game.draw.rect(b.x - b.w / 2, y - BH + 6, b.w, BH - 8, i === stack.length - 1 ? C.block : C.blockDk);
      txt(String(i + 1), b.x, y - BH / 2 + 10, 22, '#04140a');
    }
    if (falling && !finished) {
      var fx = BASE_X + Math.sin(game.time.elapsed * 2.4 + falling.phase) * (W * 0.28);
      falling.x = fx;
      var y2 = TOP_Y;
      game.draw.rect(falling.x - falling.w / 2, y2 - BH / 2, falling.w, BH - 8, C.block, 0.9);
      txt(String(stack.length + 1), falling.x, y2 + 8, 22, '#04140a');
    }
  }

  function dropBlock(x, y) {
    if (!falling || finished) return;
    var top = stack[stack.length - 1];
    var left = Math.max(falling.x - falling.w / 2, top.x - top.w / 2);
    var right = Math.min(falling.x + falling.w / 2, top.x + top.w / 2);
    var overlap = right - left;
    var landY = BASE_Y - stack.length * BH;
    if (overlap < MIN_W) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(falling.x, landY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    var newW = overlap;
    var newX = (left + right) / 2;
    stack.push({ x: newX, w: newW });
    game.feedback.good(newX, landY, { text: 'GOOD', color: C.good });
    game.fx.burst(newX, landY, { color: C.gold, count: 16, speed: 320 });
    game.audio.play('se_good', 0.35);
    if (stack.length - 1 === Math.ceil(NEEDED * 0.5)) {
      game.fx.popup('NICE', BASE_X, TOP_Y - 60, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (stack.length - 1 >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      spawnFalling();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.15); dropBlock(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BASE_X, gy: TOP_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (falling) {
      var fx = BASE_X + Math.sin(game.time.elapsed * 2.4 + falling.phase) * (W * 0.28);
      demo.gx = fx; demo.gy = TOP_Y;
      demo.press = Math.abs(fx - BASE_X) < 20;
      if (demo.press && !finished) dropBlock(fx, TOP_Y);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stack === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.bad);
      txt((stack.length - 1) + ' / ' + NEEDED, W / 2, H * 0.14, 24, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - (stack.length - 1)) + '段!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { levels: stack.length - 1, needed: NEEDED };
        if (ok) game.end.success(stack.length - 1, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', BASE_X, TOP_Y - 60, { color: C.gold, size: 26 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BASE_X, TOP_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt((stack.length - 1) + ' / ' + NEEDED, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.blockDk, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.15], ['G3', 0.15], ['B3', 0.15], ['E4', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
