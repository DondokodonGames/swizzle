// D-20092012-0066-harvest-crate-line.js
// ハーベストクレート・ライン — ベルトに流れる収穫クレートを色の合う出荷レーンへドラッグして送る
// 操作: ベルト中央に止まったクレートを、同じ色の出荷レーン(下段3つ)までドラッグして離す
// 終わり: 8個出荷できれば成功。レーン間違い/据え置きすぎ(据え置き猶予切れ)が3回で失敗
// @mechanic: drag_sort
// @theme: harvest_shipping_line
// 世界観: 小さな出荷小屋のベルトライン。赤い実・緑葉・黄穂の3種が次々流れてくる。持ち場の作業員は色を見極め、対応するレーンまで運んで出荷する
// 残るもの: 正誤(CLEAR/GAME OVER) + 出荷できた個数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、パステル背景、上下に情報と遊びを分ける
  var C = {
    bg1: '#eaf6e0', bg2: '#d8ecc8', belt: '#c8b898', beltEdge: '#a8935e',
    red: '#ff8a7a', green: '#7ccf6a', yellow: '#ffd25a',
    white: '#ffffff', ink: '#3a3020', good: '#3fbf6a', bad: '#ff5a6a', gold: '#ff9a1a',
  };
  var TCOL = { red: C.red, green: C.green, yellow: C.yellow };
  var TYPES = ['red', 'green', 'yellow'];
  var CRATE_SPR = ['.###.', '#####', '#####', '#####', '.###.'];

  var GAME_TITLE = 'CRATE LINE';
  var NEEDED = 8, MAX_FAILS = 3;
  var ITEM_TIMEOUT = 3.6;

  var PICK = { x: W * 0.5, y: H * 0.44 };
  var BINS = [
    { type: 'red', x: W * 0.20, y: H * 0.82 },
    { type: 'green', x: W * 0.5, y: H * 0.82 },
    { type: 'yellow', x: W * 0.80, y: H * 0.82 },
  ];
  var BIN_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3));
    game.draw.rect(0, H * 0.32, W, H * 0.24, C.belt, 0.9);
    for (var i = 0; i < 10; i++) {
      var bx = ((game.time.elapsed * 90 + i * 110) % (W + 120)) - 60;
      game.draw.rect(bx, H * 0.32, 8, H * 0.24, C.beltEdge, 0.5);
    }
  }

  var shipped, fails, item, dragging, dragX, dragY, done, endWait, finished, ready, hitStop, shake;

  function spawnItem() {
    item = { type: TYPES[Math.floor(game.random(0, 3))], t: ITEM_TIMEOUT, x: PICK.x, y: PICK.y };
  }

  function initGame() {
    shipped = 0; fails = 0; dragging = false; dragX = 0; dragY = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    spawnItem();
  }

  function tryStart(x, y) {
    if (!item || dragging) return;
    if (Math.hypot(x - item.x, y - item.y) < 130) {
      dragging = true; dragX = x; dragY = y;
      game.audio.play('se_tap', 0.15);
    }
  }
  function tryDrag(x, y) {
    if (!dragging) return;
    dragX = x; dragY = y; item.x = x; item.y = y;
  }
  function tryEnd(x, y) {
    if (!dragging || !item) return;
    dragging = false;
    var bin = null;
    for (var i = 0; i < BINS.length; i++) {
      if (Math.hypot(x - BINS[i].x, y - BINS[i].y) < BIN_R) { bin = BINS[i]; break; }
    }
    if (bin && bin.type === item.type) {
      shipped++;
      hitStop = 0.1;
      game.feedback.good(bin.x, bin.y, { text: '+1', color: C.good });
      game.fx.burst(bin.x, bin.y, { color: TCOL[bin.type], count: 14, speed: 300 });
      game.audio.play('se_success', 0.32);
      if (shipped === Math.ceil(NEEDED / 2)) { game.fx.popup(shipped + ' / ' + NEEDED, W / 2, H * 0.20, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
      item = null;
      if (shipped >= NEEDED) { ok = true; finished = true; finish(); return; }
      spawnItem();
    } else {
      registerFail(x, y);
      item.x = PICK.x; item.y = PICK.y;
    }
  }
  function registerFail(x, y) {
    fails++;
    hitStop = 0.24; shake = 0.2;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    if (fails >= MAX_FAILS) { ok = false; finished = true; finish(); }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBins() {
    for (var i = 0; i < BINS.length; i++) {
      var b = BINS[i];
      var sway = Math.sin(game.time.elapsed * 1.6 + i) * 3;
      game.draw.circle(b.x, b.y + sway, BIN_R, C.white, 0.9);
      game.draw.circle(b.x, b.y + sway, BIN_R - 14, TCOL[b.type], 0.85);
      game.draw.sprite(CRATE_SPR, { '#': C.ink }, b.x, b.y + sway, 16, { anchor: 'center' });
    }
  }
  function drawItem() {
    if (!item) return;
    var bob = dragging ? 0 : Math.sin(game.time.elapsed * 3) * 6;
    game.draw.circle(item.x, item.y + bob, 76, '#000000', 0.15);
    game.draw.circle(item.x, item.y + bob, 70, TCOL[item.type], 1);
    game.draw.sprite(CRATE_SPR, { '#': C.white }, item.x, item.y + bob, 14, { anchor: 'center' });
    if (!dragging) {
      var frac = Math.max(0, item.t / ITEM_TIMEOUT);
      game.draw.circle(item.x, item.y + bob, 82, C.ink, 0.25);
      for (var a = 0; a < 16; a++) {
        if (a / 16 > frac) continue;
        var ang = -Math.PI / 2 + (a / 16) * Math.PI * 2;
        game.draw.circle(item.x + Math.cos(ang) * 82, item.y + bob + Math.sin(ang) * 82, 4, C.gold);
      }
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING && !finished && !done && ready <= 0) tryStart(x, y); });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && dragging) { if (Math.random() < 0.1) game.audio.play('se_tap', 0.03); tryDrag(x, y); }
  });
  game.onRelease(function(x, y) { if (state === S.PLAYING && dragging) { game.audio.play('se_tap', 0.08); tryEnd(x, y); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: PICK.x, gy: PICK.y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { spawnItem(); shipped = 0; fails = 0; dragging = false; }
    if (cyc < 0.4) { demo.gx = item ? item.x : PICK.x; demo.gy = item ? item.y : PICK.y; demo.press = false; }
    else if (cyc < 0.6) { if (item && !dragging) tryStart(item.x, item.y); demo.press = true; }
    else if (cyc < 2.2 && item) {
      var target = BINS.filter(function(b) { return b.type === item.type; })[0];
      var t1 = (cyc - 0.6) / 1.6;
      var nx = PICK.x + (target.x - PICK.x) * t1, ny = PICK.y + (target.y - PICK.y) * t1;
      demo.gx = nx; demo.gy = ny;
      tryDrag(nx, ny);
    } else if (cyc < 2.4 && item) {
      var target2 = BINS.filter(function(b) { return b.type === item.type; })[0];
      tryEnd(target2.x, target2.y);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (item === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBins();
      drawItem();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBins();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(shipped + ' / ' + NEEDED, W / 2, H * 0.13, 30, C.ink);
      if (!ok && shipped >= NEEDED - 1) txt('あと1個!', W / 2, H * 0.17, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(shipped * 100, { shipped: shipped }); else game.end.failure({ shipped: shipped, fails: fails });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && item && !dragging) {
      item.t -= dt;
      if (item.t <= 0) { registerFail(item.x, item.y); item.x = PICK.x; item.y = PICK.y; item.t = ITEM_TIMEOUT; }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBins();
    drawItem();

    txt(shipped + ' / ' + NEEDED, W / 2, 100, 34, C.ink);
    for (var f = 0; f < MAX_FAILS; f++) game.draw.circle(W - 70 - f * 44, 100, 13, f < fails ? C.bad : '#00000030', 1);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['B4', 0.3], ['D5', 0.3], ['G5', 0.6]], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true, bass: [['G3', 0.6]], bassWave: 'sine', bassVolume: 0.05 });
    state = S.ATTRACT;
    initGame();
  });
})(game);
