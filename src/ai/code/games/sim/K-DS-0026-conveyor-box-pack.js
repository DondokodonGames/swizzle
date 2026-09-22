// K-DS-0026-conveyor-box-pack.js
// コンベアボックスパック — ベルトを流れる品物を、箱が真下に来た瞬間に落として詰める
// 操作: ベルトの品物の真下を左右に動く箱が通った瞬間にタップして品物を落とし入れる
// 終わり: 規定数(6個)を全て詰めれば成功。1個でも外せば失敗
// @mechanic: drop_timing
// @theme: conveyor_box_pack
// 世界観: 独自デザインの梱包工。頭上のベルトを流れる品物の真下に、往復する箱を重ねた瞬間に落として詰めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 梱包できた個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感のあるベージュ/木目調、影と光沢で立体感を出す
  var C = {
    bg: '#d8c8a8', bg2: '#c0ae86', belt: '#6a5438', beltLine: '#8a7250',
    item: '#e0803a', itemDark: '#8a4a1a', box: '#b98a4a', boxDark: '#7a5a28',
    good: '#3a9a4a', bad: '#c93a3a', gold: '#e0a020', white: '#fff8ee', ink: '#2a1c0c',
  };

  var GAME_TITLE = 'BOX PACK';
  var TOTAL = 6;
  var BELT_Y = H * 0.38;
  var BOX_Y = H * 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var packed, thrown, done, endWait, finished;
  var ready, hitStop, shake, round, item, boxX, boxDir, boxSpeed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['.##.', '####', '.##.', '#.##'];
  var ITEM_SPR = ['###', '#.#', '###'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, BELT_Y - 30, W, 60, C.belt);
    for (var i = 0; i < 10; i++) {
      var x = ((i * 130) + (game.time.elapsed * 60)) % (W + 130) - 65;
      game.draw.rect(x, BELT_Y - 26, 8, 52, C.beltLine, 0.5);
    }
  }

  function newItem() {
    var n = Math.min(round, TOTAL - 1);
    return { x: -60, speed: Math.min(W * 0.55, W * 0.28 + n * W * 0.03), resolved: false };
  }

  function initGame() {
    packed = 0; thrown = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    boxX = W * 0.5; boxDir = 1; boxSpeed = W * 0.5;
    item = newItem();
  }

  function drop() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var d = Math.abs(item.x - boxX);
    if (d < 70) {
      item.resolved = true;
      packed++; thrown++;
      hitStop = 0.08;
      game.feedback.good(boxX, BOX_Y, { text: 'PACKED', color: C.good });
      game.fx.burst(boxX, BOX_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_coin', 0.4);
      if (packed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, BOX_Y - 200, { color: C.gold, size: 38 });
      if (packed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      item = newItem();
    } else {
      game.feedback.bad(boxX, BOX_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  function failItem() {
    item.resolved = true;
    thrown++;
    hitStop = 0.3;
    game.feedback.bad(item.x, BELT_Y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) drop();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    game.draw.sprite(WORKER, { '#': C.itemDark }, W * 0.5, H * 0.86, 28, { anchor: 'center' });
    game.draw.rect(boxX - 90, BOX_Y - 10, 180, 90, C.boxDark);
    game.draw.rect(boxX - 80, BOX_Y - 4, 160, 76, C.box);
    if (item && !item.resolved) {
      var overBox = Math.abs(item.x - boxX) < 90;
      if (overBox) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(item.x, BELT_Y, 56, C.gold, 0.3);
      }
      game.draw.sprite(ITEM_SPR, { '#': C.item }, item.x, BELT_Y, 18, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, it: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.it = newItem(); demo.it.speed = W * 0.45; boxX = W * 0.5; boxDir = 1; }
    demo.it.x += demo.it.speed * dt;
    item = demo.it;
    var d = Math.abs(demo.it.x - boxX);
    if (d < 70 && !demo.it.resolved) {
      demo.it.resolved = true;
      demo.press = true;
      game.feedback.good(boxX, BOX_Y, { text: 'PACKED', color: C.good });
      game.audio.play('se_coin', 0.2);
    }
    if (demo.it.resolved) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(packed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - packed) + '個!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(packed, { packed: packed, total: TOTAL });
        else game.end.failure({ packed: packed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      boxX += boxDir * boxSpeed * dt;
      if (boxX > W * 0.82) { boxX = W * 0.82; boxDir = -1; }
      if (boxX < W * 0.18) { boxX = W * 0.18; boxDir = 1; }
      item.x += item.speed * dt;
      if (item.x > W + 60 && !item.resolved) failItem();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(packed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.boxDark, 0.5);
    game.draw.rect(60, 150, (W - 120) * (packed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.5], ['B3', 0.5], ['D4', 0.5], ['G4', 1]], { tempo: 124, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
