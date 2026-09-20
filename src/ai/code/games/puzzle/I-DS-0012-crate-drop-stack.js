// I-DS-0012-crate-drop-stack.js
// クレートドロップスタック — 落ちてくる木箱を指でつまんで動かし、崩れないよう塔に積み上げる
// 操作: 落下中の木箱を指で押さえて左右に動かし、今積まれている塔の真上に重なるよう位置を合わせて着地させる
// 終わり: 制限時間内に木箱を6個崩さず積み上げれば成功。ずれて崩れる/時間切れなら失敗
// @mechanic: stack
// @theme: dockyard_crate_tower_stack
// 世界観: 波止場の荷捌き場。荷役係が次々落ちてくる木箱を指先で誘導し、崩さずに高い塔へ積み上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 積み上げた個数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 背景2〜3層で奥行き、大きめキャラ、暗色輪郭+ハイライト、もっとも汎用
  var C = {
    sky: '#3a5a7a', sky2: '#1e2f42', hill: '#284258', ground: '#5a4230', groundDark: '#3a2a1c',
    crate: '#d99a4a', crateDark: '#a86a20', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f4ecff', ink: '#0a0a12', okZone: '#4dff8a', badZone: '#ff4d5e',
  };

  var GAME_TITLE = 'CRATE STACK';
  var DUR = 22;
  var TOTAL = 6;
  var BLOCK_H = 70, BLOCK_W = 150, ALIGN_TOL = 78;
  var SPAWN_Y = H * 0.20, STACK_BASE_Y = H * 0.78, FALL_SPEED = 260;
  var CENTER_X = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CRATE_SPR = ['####', '#XX#', '#XX#', '####'];

  var stacked, towerX, itemX, itemY, pressing, timeLeft, milestoneShown, collapsed;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, H * 0.60, W, H * 0.10, C.hill, 0.6);
    game.draw.rect(0, H * 0.74, W, H * 0.26, C.ground);
    game.draw.rect(0, H * 0.74, W, 8, C.groundDark);
    game.draw.sprite(WORKER, { '#': C.white }, W * 0.16, H * 0.86, 14, { anchor: 'center' });
  }

  function targetY() { return STACK_BASE_Y - stacked * BLOCK_H; }

  function drawTower() {
    for (var i = 0; i < stacked; i++) {
      var y = STACK_BASE_Y - i * BLOCK_H - BLOCK_H / 2;
      game.draw.sprite(CRATE_SPR, { '#': C.crateDark, X: C.crate }, towerX, y, 20, { anchor: 'center' });
    }
  }

  function drawFalling(x, y, good) {
    game.draw.circle(x, targetY() + BLOCK_H / 2, ALIGN_TOL, good ? C.okZone : C.badZone, 0.18);
    game.draw.sprite(CRATE_SPR, { '#': C.crateDark, X: C.crate }, x, y, 20, { anchor: 'center' });
  }

  function spawnItem() {
    itemX = W * (0.28 + game.random(0, 0.44));
    itemY = SPAWN_Y;
  }

  function initGame() {
    stacked = 0; towerX = CENTER_X; pressing = false; timeLeft = DUR;
    milestoneShown = false; collapsed = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    spawnItem();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressing = true; itemX = x;
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing || finished) return;
    itemX = x;
  });
  game.onRelease(function() { pressing = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepFall(dt) {
    itemY += FALL_SPEED * (1 + stacked * 0.04) * dt;
    if (itemY >= targetY()) {
      var offset = Math.abs(itemX - towerX);
      if (offset > ALIGN_TOL) {
        collapsed = true; ok = false; finished = true; hitStop = 0.3; shake = 0.3;
        game.feedback.bad(itemX, targetY(), { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
        return;
      }
      towerX = towerX * 0.55 + itemX * 0.45;
      stacked++;
      hitStop = 0.08;
      game.feedback.good(towerX, targetY(), { text: stacked + '/' + TOTAL, color: C.good });
      game.fx.burst(towerX, targetY(), { color: C.gold, count: 12, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (!milestoneShown && stacked >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.18, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (stacked >= TOTAL) { ok = true; finished = true; finish(); return; }
      spawnItem();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stacked === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTower();
      drawFalling(itemX, itemY, Math.abs(itemX - towerX) <= ALIGN_TOL);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower();
      if (!collapsed) drawFalling(itemX, itemY, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(stacked + ' / ' + TOTAL, W / 2, H * 0.10, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - stacked) + '個!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stacked, { stacked: stacked, total: TOTAL }); else game.end.failure({ stacked: stacked, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      stepFall(dt);
      if (timeLeft <= 0 && !finished) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(itemX, itemY, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTower();
    if (!finished || ok) drawFalling(itemX, itemY, Math.abs(itemX - towerX) <= ALIGN_TOL);

    txt(stacked + ' / ' + TOTAL, W / 2, H * 0.04, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  var demo = { t: 0, gx: CENTER_X, gy: SPAWN_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { stacked = 0; towerX = CENTER_X; milestoneShown = false; spawnItem(); }
    itemY += FALL_SPEED * 1.4 * dt;
    itemX += (towerX - itemX) * Math.min(1, dt * 3);
    demo.gx = itemX; demo.gy = itemY;
    demo.press = true;
    if (itemY >= targetY()) {
      towerX = towerX * 0.6 + itemX * 0.4;
      stacked = Math.min(TOTAL, stacked + 1);
      spawnItem();
    }
  }

  game.onStart(function() {
    game.audio.melody([['G3', 0.25], ['B3', 0.25], ['D4', 0.25], ['G4', 0.5]], { tempo: 118, wave: 'square', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
