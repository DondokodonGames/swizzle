// K-DS-0001-conveyor-part-drop.js
// パーツ差し込みライン — 流れてくる箱に部品を落とすタイミングを合わせる玩具工場ライン
// 操作: シュートの真下に箱が来た瞬間にタップして部品を落とす
// 終わり: 規定数(7個)を箱に収めれば成功。3回外せば失敗
// @mechanic: drop_timing
// @theme: toy_assembly_line
// 世界観: 玩具工場の組み立てライン。天井のシュートから部品が落ち、下を流れる箱にタイミングよく収める作業員ロボットの視点
// 残るもの: 正誤(CLEAR/GAME OVER) + 収めた個数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定色の明るいプライマリカラー、大きめドット
  var C = {
    bg: '#1a1a3a', bg2: '#12122a', belt: '#2b2f6b', beltEdge: '#0d0f28',
    box: '#e8a33d', boxDark: '#a8641a', boxIn: '#3a2410',
    part: '#4dd0e1', partDark: '#1c6e7a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f5f5f5', ink: '#0a080c',
  };

  var GAME_TITLE = 'PART DROP';
  var TOTAL = 7;
  var MISS_LIMIT = 3;
  var CHUTE_X = W * 0.5;
  var CHUTE_TOP = H * 0.24;
  var BELT_Y = H * 0.56;
  var DROP_HALF = 100;
  var MISS_X = W * 0.74;
  var BOX_W = 170, BOX_H = 96;
  var SPEED = 260;
  var PERIOD = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ARM_IDLE = ['.####.', '###### ', '.####.', '..##..'];
  var ARM_PUSH = ['######', '.####.', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.rect(W * (0.08 + i * 0.16), H * 0.15, 26, H * 0.28, '#ffffff08');
    }
    game.draw.line(CHUTE_X, 0, CHUTE_X, CHUTE_TOP, C.partDark, 40);
  }

  var boxes, filled, misses, armPush, armT, done, endWait, finished, ready, hitStop, shake, dropFlash;

  function initGame() {
    boxes = []; filled = 0; misses = 0;
    armPush = false; armT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; dropFlash = null;
    spawnTimer = 0.3;
  }
  var spawnTimer = 0.3;

  function spawnBox() {
    boxes.push({ x: -BOX_W, has: false, counted: false });
  }

  function tryDrop() {
    if (ready > 0 || done || finished || hitStop > 0) return;
    armPush = true; armT = 0.15;
    game.audio.play('se_tap', 0.15);
    var target = null;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (!b.has && !b.counted && Math.abs(b.x + BOX_W / 2 - CHUTE_X) < DROP_HALF) { target = b; break; }
    }
    if (target) {
      target.has = true; target.counted = true; filled++;
      dropFlash = { x: CHUTE_X, y: BELT_Y, ok: true, t: 0.18 };
      hitStop = 0.12;
      game.feedback.good(CHUTE_X, BELT_Y, { text: 'IN', color: C.good });
      game.audio.play('se_coin', 0.3);
      if (filled === Math.ceil(TOTAL / 2)) {
        game.fx.popup(filled + ' / ' + TOTAL, CHUTE_X, BELT_Y - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.3);
      }
      if (filled >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      dropFlash = { x: CHUTE_X, y: BELT_Y, ok: false, t: 0.3 };
      hitStop = 0.3;
      misses++;
      shake = 0.2;
      game.feedback.bad(CHUTE_X, BELT_Y, { text: 'MISS' });
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryDrop();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepBoxes(dt) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      b.x += SPEED * dt;
      if (!b.has && !b.counted && b.x > MISS_X) {
        b.counted = true;
        misses++;
        shake = 0.15;
        game.feedback.bad(b.x, BELT_Y, { text: 'MISS' });
        hitStop = Math.max(hitStop, 0.25);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
      }
    }
    while (boxes.length && boxes[0].x > W + BOX_W) boxes.shift();
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !finished) { spawnBox(); spawnTimer = PERIOD; }
  }

  function drawScene(bList, armPushLocal) {
    bg();
    game.draw.line(0, BELT_Y + BOX_H * 0.5 + 14, W, BELT_Y + BOX_H * 0.5 + 14, C.beltEdge, 10);
    game.draw.line(0, BELT_Y + BOX_H * 0.5, W, BELT_Y + BOX_H * 0.5, C.belt, 20);
    for (var i = 0; i < bList.length; i++) {
      var b = bList[i];
      var bx = b.x, by = BELT_Y;
      game.draw.rect(bx, by - BOX_H / 2, BOX_W, BOX_H, C.boxDark);
      game.draw.rect(bx + 10, by - BOX_H / 2 + 10, BOX_W - 20, BOX_H - 28, C.boxIn);
      if (b.has) game.draw.circle(bx + BOX_W / 2, by - 6, 26, C.part);
      game.draw.rect(bx, by - BOX_H / 2, BOX_W, 8, C.box);
    }
    // drop zone marker
    var pulse = 0.4 + 0.3 * Math.abs(Math.sin(game.time.elapsed * 4));
    game.draw.line(CHUTE_X - DROP_HALF, BELT_Y - BOX_H / 2 - 6, CHUTE_X - DROP_HALF, BELT_Y + BOX_H / 2 + 6, C.gold, 3);
    game.draw.line(CHUTE_X + DROP_HALF, BELT_Y - BOX_H / 2 - 6, CHUTE_X + DROP_HALF, BELT_Y + BOX_H / 2 + 6, C.gold, 3);
    // chute + arm
    game.draw.rect(CHUTE_X - 34, CHUTE_TOP - 40, 68, 40, C.partDark);
    game.draw.sprite(armPushLocal ? ARM_PUSH : ARM_IDLE, { '#': C.white }, CHUTE_X, CHUTE_TOP - 60, 12, { anchor: 'center' });
    if (armPushLocal) game.draw.circle(CHUTE_X, CHUTE_TOP + 6, 20, C.part, pulse);
  }

  var demo = { t: 0, gx: CHUTE_X, gy: BELT_Y, press: false, boxes: [], spawnT: 0, filled: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { demo.boxes = []; demo.spawnT = 0; demo.filled = 0; }
    demo.spawnT -= dt;
    if (demo.spawnT <= 0) { demo.boxes.push({ x: -BOX_W, has: false, counted: false }); demo.spawnT = PERIOD; }
    demo.press = false;
    for (var i = 0; i < demo.boxes.length; i++) {
      var b = demo.boxes[i];
      b.x += SPEED * dt;
      if (!b.has && !b.counted && Math.abs(b.x + BOX_W / 2 - CHUTE_X) < 18) {
        b.has = true; b.counted = true; demo.filled++;
        demo.press = true; demo.gx = CHUTE_X; demo.gy = BELT_Y;
      }
    }
    while (demo.boxes.length && demo.boxes[0].x > W + BOX_W) demo.boxes.shift();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.boxes, demo.press);
      game.draw.hand(demo.gx, demo.gy + 40, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(boxes, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(filled + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - filled <= 2) txt('あと' + (TOTAL - filled) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(filled, { filled: filled, total: TOTAL, misses: misses });
        else game.end.failure({ filled: filled, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBoxes(dt);
    }
    if (armT > 0) { armT -= dt; if (armT <= 0) armPush = false; }
    if (dropFlash) { dropFlash.t -= dt; if (dropFlash.t <= 0) dropFlash = null; }
    if (shake > 0) shake -= dt;

    drawScene(boxes, armPush);
    if (dropFlash) {
      game.draw.circle(dropFlash.x, dropFlash.y, dropFlash.ok ? 50 : 60, dropFlash.ok ? C.good : C.bad, 0.35);
    }

    txt(filled + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (filled / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.25]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
