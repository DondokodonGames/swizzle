// D-20092012-0052-harvest-crate-sort.js
// ハーベストクレートソート — 収穫した作物の大きさを瞬時に見極め、対応する方向へ弾き飛ばして仕分ける
// 操作: 出てきた作物の大きさ(小/中/大)を見て、左/下/右へスワイプして正しいシュートへ弾き飛ばす
// 終わり: 規定個数(7個)正しく仕分ければ成功。違う方向に弾く/時間切れで失敗
// @mechanic: swipe_direction
// @theme: harvest_shipping_yard
// 世界観: 収穫期の出荷場。台車で流れてくる作物を一瞬で見極め、大きさに応じた方向へ弾き飛ばして仕分けるベテランの早業
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく仕分けられた個数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定色パレット、輪郭のはっきりした塊、素朴な暖色
  var C = {
    bg: '#4a7a3a', bg2: '#2f5a26', crateWood: '#a86a34', crateEdge: '#6a4018',
    veg: '#ff8a2a', vegLeaf: '#4caa4a', good: '#5fd47a', bad: '#e0524f',
    gold: '#ffd23f', white: '#ffffff', ink: '#1a2410',
  };

  var GAME_TITLE = 'CRATE SORT';
  var TOTAL = 7;
  var ITEM_TIME = 3.2;
  // 0=small->left, 1=medium->down, 2=large->right
  var DIRS = ['left', 'down', 'right'];
  var CHUTE_X = [W * 0.16, W * 0.5, W * 0.84];
  var CHUTE_Y = [H * 0.42, H * 0.74, H * 0.42];
  var TRAY_X = W / 2, TRAY_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VEG_SPR = ['.##.', '####', '####', '.##.'];
  var FARMER = ['.##.', '####', '.##.', '#..#'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 7; i++) game.draw.line(0, H * (0.2 + i * 0.09), W, H * (0.2 + i * 0.09), '#00000012', 3);
    ambient(t);
  }

  var delivered, item, itemT, done, endWait, finished, ready, hitStop, shake, flashCrate;
  var flyDir, flyT;

  function newItem(exclude) {
    var pool = [0, 1, 2].filter(function(s) { return s !== exclude; });
    var s = pool[Math.floor(game.random(0, pool.length))];
    return { size: s, x: W / 2, y: TRAY_Y, resolved: false };
  }

  function initGame() {
    delivered = 0; done = false; endWait = 0; finished = false; flashCrate = -1;
    ready = 0.8; hitStop = 0; shake = 0; flyT = 0;
    item = newItem(-1); itemT = ITEM_TIME;
  }

  function resolveSwipe(dir) {
    item.resolved = true;
    var i = DIRS.indexOf(dir);
    var good = i === item.size;
    hitStop = good ? 0.1 : 0.3;
    flashCrate = good ? i : -1;
    flyDir = dir; flyT = 0.28;
    if (good) {
      delivered++;
      game.feedback.good(CHUTE_X[i], CHUTE_Y[i], { text: 'GOOD', color: C.good });
      game.fx.burst(CHUTE_X[i], CHUTE_Y[i], { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (delivered === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.5, { color: C.gold, size: 38 });
      if (delivered >= TOTAL) { ok = true; finished = true; finish(); return; }
    } else {
      game.feedback.bad(item.x, item.y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished || !item || item.resolved) return;
    if (DIRS.indexOf(dir) < 0) return;
    resolveSwipe(dir);
  });

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

  var CHUTE_R = [46, 60, 74];
  function drawChutes(t) {
    for (var i = 0; i < CHUTE_X.length; i++) {
      var flashed = flashCrate === i && hitStop > 0;
      var r = CHUTE_R[i] + (flashed ? 8 : 0);
      var bob = Math.sin(t * 2 + i) * 3;
      game.draw.circle(CHUTE_X[i], CHUTE_Y[i] + bob, r + 8, C.crateEdge);
      game.draw.circle(CHUTE_X[i], CHUTE_Y[i] + bob, r, flashed ? C.white : C.crateWood);
    }
  }

  function itemPos() {
    if (!item) return { x: TRAY_X, y: TRAY_Y };
    if (item.resolved && flyT > 0) {
      var i = DIRS.indexOf(flyDir);
      var p = 1 - flyT / 0.28;
      return { x: TRAY_X + (CHUTE_X[i] - TRAY_X) * p, y: TRAY_Y + (CHUTE_Y[i] - TRAY_Y) * p };
    }
    return { x: TRAY_X, y: TRAY_Y };
  }

  function drawItem() {
    if (!item) return;
    if (item.resolved && flyT <= 0) return;
    var p = itemPos();
    var scale = 12 + item.size * 8;
    game.draw.sprite(VEG_SPR, { '#': C.veg }, p.x, p.y, scale, { anchor: 'center' });
    game.draw.circle(p.x, p.y - scale * 1.6, scale * 0.4, C.vegLeaf);
  }

  var demo = { t: 0, gx: TRAY_X, gy: TRAY_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    if (cyc < dt || demo.t <= dt) { item = newItem(-1); flyT = 0; flashCrate = -1; }
    var goodIdx = item.size;
    if (cyc < 0.9) {
      demo.gx = TRAY_X; demo.gy = TRAY_Y; demo.press = false;
    } else if (cyc < 1.15) {
      var p = (cyc - 0.9) / 0.25;
      demo.gx = TRAY_X + (CHUTE_X[goodIdx] - TRAY_X) * p * 0.6;
      demo.gy = TRAY_Y + (CHUTE_Y[goodIdx] - TRAY_Y) * p * 0.6;
      demo.press = true;
      if (!item.resolved) { item.resolved = true; flyDir = DIRS[goodIdx]; flyT = 0.28; flashCrate = goodIdx; game.audio.play('se_good', 0.2); }
    } else {
      demo.press = false;
      if (flyT > 0) flyT -= dt;
      if (flyT <= 0 && flashCrate === goodIdx) {
        flashCrate = -1;
        game.feedback.good(CHUTE_X[goodIdx], CHUTE_Y[goodIdx], { text: 'GOOD', color: C.good });
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawChutes(t);
      drawItem();
      game.draw.sprite(FARMER, { '#': C.gold }, W * 0.5, H * 0.88, 24, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawChutes(t);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(delivered + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - delivered) + '個!', W / 2, H * 0.16, 26, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(delivered, { delivered: delivered, total: TOTAL });
        else game.end.failure({ delivered: delivered, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) flashCrate = -1;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (item && item.resolved) {
        if (flyT > 0) flyT -= dt;
        if (flyT <= 0) {
          var prevSize = item.size;
          item = newItem(prevSize); itemT = ITEM_TIME;
        }
      } else {
        itemT -= dt;
        if (itemT <= 0 && item && !item.resolved) {
          item.resolved = true;
          hitStop = 0.3;
          game.feedback.bad(item.x, item.y, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawChutes(t);
    drawItem();
    game.draw.sprite(FARMER, { '#': C.gold }, W * 0.5, H * 0.88 + Math.sin(t * 2) * 4, 24, { anchor: 'center' });

    txt(delivered + ' / ' + TOTAL, W / 2, H * 0.48, 30, C.white);
    game.draw.rect(60, 170, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 170, (W - 120) * (itemT / ITEM_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.3]], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
