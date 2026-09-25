// D-20092012-0050-tower-order-delivery.js
// タワーオーダー配送 — 窓の形に合う荷物だけをドラッグで届ける、増築タワーの配送係
// 操作: 下から出てくる荷物を、同じ形の窓までドラッグして届ける
// 終わり: 規定回数(6個)正しく届ければ成功。違う形の窓に入れる/時間切れで失敗
// @mechanic: gap_fit
// @theme: highrise_delivery_chute
// 世界観: 階を建て増したばかりの集合タワー。各階の住人は決まった形の荷物しか受け取らない。配送係が正しい窓へ荷物を通す
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく届けられた個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感のある面、内影っぽい二重枠、金属/木のような落ち着いた色
  var C = {
    bg: '#7a6a54', bg2: '#5a4c3a', wall: '#8f7d63', frame: '#3a3024',
    win: '#c9bda2', winDeep: '#463c2e', box: '#c97a3d', boxEdge: '#7a4a1e',
    good: '#5fd47a', bad: '#e0524f', gold: '#f2c14e', white: '#fff6e6', ink: '#241c12',
  };

  var GAME_TITLE = 'TOWER ORDER';
  var TOTAL = 6;
  var ITEM_TIME = 3.4;
  var WIN_X = [W * 0.22, W * 0.5, W * 0.78];
  var WIN_Y = H * 0.34;
  var WIN_R = 100;
  var TRAY_Y = H * 0.64;

  var SHAPES = ['O', 'S', 'T'];
  var SPR = {
    O: ['.###.', '#####', '#####', '#####', '.###.'],
    S: ['#####', '#####', '#####', '#####', '#####'],
    T: ['..#..', '.###.', '.###.', '#####', '#####'],
  };
  var PORTER = ['.##.', '####', '.##.', '#..#'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#00000010');
    game.draw.rect(0, H * 0.78, W, H * 0.3, C.wall);
    ambient(t);
  }

  var wins, delivered, item, itemT, done, endWait, finished, ready, hitStop, shake, flashWin;
  var dragging, dragX, dragY;

  function shuffle3(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function newItem(excludeLast) {
    var pool = SHAPES.filter(function(s) { return s !== excludeLast; });
    var shape = pool[Math.floor(game.random(0, pool.length))];
    return { shape: shape, x: W / 2, y: TRAY_Y, resolved: false };
  }

  function initGame() {
    wins = shuffle3(SHAPES);
    delivered = 0; done = false; endWait = 0; finished = false; flashWin = -1;
    ready = 0.8; hitStop = 0; shake = 0; dragging = false;
    item = newItem(null); itemT = ITEM_TIME;
  }

  function winAt(x, y) {
    for (var i = 0; i < WIN_X.length; i++) {
      if (Math.hypot(x - WIN_X[i], WIN_Y) < WIN_R && Math.abs(y - WIN_Y) < WIN_R) return i;
    }
    return -1;
  }

  function resolveDrop(i) {
    item.resolved = true;
    var good = wins[i] === item.shape;
    hitStop = good ? 0.1 : 0.3;
    flashWin = i;
    if (good) {
      delivered++;
      game.feedback.good(WIN_X[i], WIN_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(WIN_X[i], WIN_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (delivered === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.5, { color: C.gold, size: 38 });
      if (delivered >= TOTAL) { ok = true; finished = true; finish(); return; }
      var prevShape = item.shape;
      item = newItem(prevShape); itemT = ITEM_TIME;
    } else {
      game.feedback.bad(WIN_X[i], WIN_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || !item) return;
    if (Math.hypot(x - item.x, y - item.y) < 90) { dragging = true; dragX = x; dragY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) { if (dragging) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (!dragging) return;
    dragging = false;
    var i = winAt(x, y);
    if (i >= 0) resolveDrop(i);
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

  function drawWindows(t) {
    for (var i = 0; i < WIN_X.length; i++) {
      var flashed = flashWin === i && hitStop > 0;
      var r = WIN_R + (flashed ? 12 : 0);
      game.draw.rect(WIN_X[i] - r, WIN_Y - r, r * 2, r * 2, C.frame);
      game.draw.rect(WIN_X[i] - r + 10, WIN_Y - r + 10, r * 2 - 20, r * 2 - 20, flashed ? C.white : C.winDeep);
      game.draw.sprite(SPR[wins[i]], { '#': flashed ? C.gold : C.win }, WIN_X[i], WIN_Y + Math.sin(t * 2 + i) * 4, 16, { anchor: 'center' });
    }
  }

  function drawItem() {
    if (!item || item.resolved) return;
    var x = dragging ? dragX : item.x;
    var y = dragging ? dragY : item.y;
    game.draw.rect(x - 54, y - 54, 108, 108, C.boxEdge);
    game.draw.sprite(SPR[item.shape], { '#': C.box }, x, y, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W / 2, gy: TRAY_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      wins = shuffle3(SHAPES);
      item = newItem(null);
    }
    var goodIdx = wins.indexOf(item.shape);
    if (cyc < 0.8) { demo.gx = W / 2; demo.gy = TRAY_Y; demo.press = false; }
    else if (cyc < 1.8) {
      var p = (cyc - 0.8) / 1.0;
      demo.gx = W / 2 + (WIN_X[goodIdx] - W / 2) * p;
      demo.gy = TRAY_Y + (WIN_Y - TRAY_Y) * p;
      demo.press = true;
    } else {
      demo.press = false;
      if (!item.resolved) {
        item.resolved = true;
        flashWin = goodIdx;
        game.feedback.good(WIN_X[goodIdx], WIN_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawWindows(t);
      drawItem();
      game.draw.sprite(PORTER, { '#': C.gold }, W * 0.5, H * 0.86, 24, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawWindows(t);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(delivered + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - delivered) + '個!', W / 2, H * 0.16, 26, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
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
      if (hitStop <= 0) flashWin = -1;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
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
    if (shake > 0) shake -= dt;

    bg(t);
    drawWindows(t);
    drawItem();
    game.draw.sprite(PORTER, { '#': C.gold }, W * 0.5, H * 0.86 + Math.sin(t * 2) * 4, 24, { anchor: 'center' });

    txt(delivered + ' / ' + TOTAL, W / 2, H * 0.46, 30, C.white);
    game.draw.rect(60, 160, W - 120, 16, C.frame, 0.6);
    game.draw.rect(60, 160, (W - 120) * (itemT / ITEM_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['C5', 0.3], ['E5', 0.3], ['C5', 0.3]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
