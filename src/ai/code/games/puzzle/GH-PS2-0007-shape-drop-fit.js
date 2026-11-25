// GH-PS2-0007-shape-drop-fit.js
// シェイプソーター — 落ちてくる立体ブロックを、形の合う穴へドラッグして通す
// 操作: 落下中のブロックを左右にドラッグし、同じ形の穴の真上に合わせて通過させる
// 終わり: 規定個数を通せば成功。3回穴に詰まらせれば失敗
// @mechanic: gap_fit
// @theme: voxel_sorter
// 世界観: 木箱の仕分け台。上から丸・四角・三角のブロックが落ちてくる。台には同じ形の穴が並び、合わない穴に落とすと詰まる
// 残るもの: 正誤(CLEAR/GAME OVER) + 通した個数 + 連続成功数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む。影は落とさず明度差だけ
  var C = {
    bg1: '#3a3050', bg2: '#221c34', tray: '#4a4266', trayDark: '#2c2740',
    top: '#e8dcc8', left: '#b8a888', right: '#8a7a62',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f0ff', ink: '#100c18',
  };

  var GAME_TITLE = 'SHAPE SORTER';
  var NEEDED = 8, JAM_LIMIT = 3;
  var FLOOR_Y = H * 0.78;
  var SHAPES = ['circle', 'square', 'triangle'];
  var SHAPE_COLOR = { circle: '#5ad0ff', square: '#ff9a4a', triangle: '#a8ff5a' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, jams, streak, bestStreak, holeCount, holes;
  var shapeX, shapeY, shapeKind, fallSpeed, warnPulse;
  var done, endWait, finished, mascotMood;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function sorterBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 7; i++) game.draw.rect(0, i * (H / 7), W, 2, '#ffffff06');
  }

  var TRI = ['..#..', '.###.', '#####'];
  var SQR = ['#####', '#...#', '#####'];
  var CIR = ['.###.', '#...#', '.###.'];
  var SPRITE_BY_KIND = { circle: CIR, square: SQR, triangle: TRI };

  function drawVoxel(x, y, size, colorTop, colorLeft, colorRight) {
    var h = size * 0.55;
    game.draw.rect(x - size / 2, y - h / 2, size, h, colorTop);
    game.draw.rect(x - size / 2, y + h / 2 - 8, size * 0.5, 16, colorLeft);
    game.draw.rect(x, y + h / 2 - 8, size * 0.5, 16, colorRight);
  }

  function drawShapeBlock(x, y, kind, size) {
    var c = SHAPE_COLOR[kind];
    drawVoxel(x, y, size, C.top, C.left, C.right);
    game.draw.sprite(SPRITE_BY_KIND[kind], { '#': c }, x, y - size * 0.06, size / 8, { anchor: 'center' });
  }

  function holeXs() {
    if (holeCount === 2) return [W * 0.32, W * 0.68];
    return [W * 0.2, W * 0.5, W * 0.8];
  }

  function setupHoles() {
    var xs = holeXs();
    holes = [];
    var pool = SHAPES.slice();
    for (var i = 0; i < xs.length; i++) {
      var k = pool.splice(Math.floor(game.random(0, pool.length)), 1)[0];
      holes.push({ x: xs[i], kind: k });
    }
  }

  var MASCOT_SPRITE = { idle: ['.###.', '#.#.#', '#####'], happy: ['.###.', '#.#.#', '.###.'], dizzy: ['.###.', '#*#*#', '#####'] };

  function drawMascot() {
    var spr = mascotMood > 0.4 ? MASCOT_SPRITE.happy : mascotMood < -0.4 ? MASCOT_SPRITE.dizzy : MASCOT_SPRITE.idle;
    var pal = { '#': C.tray, '*': C.bad };
    drawVoxel(W * 0.88, H * 0.92, 150, C.top, C.left, C.right);
    game.draw.sprite(spr, { '#': C.trayDark }, W * 0.88, H * 0.90, 16, { anchor: 'center' });
  }

  function drawTray() {
    game.draw.rect(0, FLOOR_Y, W, H * 0.10, C.tray);
    game.draw.rect(0, FLOOR_Y, W, 10, C.trayDark);
    for (var i = 0; i < holes.length; i++) {
      var hh = holes[i];
      var timeToFloor = fallSpeed > 0 ? (FLOOR_Y - shapeY) / fallSpeed : 99;
      var isTarget = hh.kind === shapeKind;
      var pulse = timeToFloor < 0.7 && timeToFloor > -0.3;
      var glow = pulse ? (Math.floor(game.time.elapsed * 14) % 2 === 0) : false;
      game.draw.circle(hh.x, FLOOR_Y + 46, 66, C.trayDark);
      if (pulse && glow) game.draw.circle(hh.x, FLOOR_Y + 46, 74, isTarget ? C.good : C.bad, 0.5);
      game.draw.sprite(SPRITE_BY_KIND[hh.kind], { '#': SHAPE_COLOR[hh.kind] }, hh.x, FLOOR_Y + 46, 9, { anchor: 'center' });
    }
    drawMascot();
  }

  function newShape() {
    shapeKind = SHAPES[Math.floor(game.random(0, SHAPES.length))];
    shapeX = holeXs()[Math.floor(game.random(0, holeCount))];
    shapeY = H * 0.16;
    warnPulse = 0;
  }

  function initGame() {
    passed = 0; jams = 0; streak = 0; bestStreak = 0; holeCount = 2;
    setupHoles();
    fallSpeed = 260;
    mascotMood = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newShape();
  }

  function onDrag(x) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    shapeX = Math.max(90, Math.min(W - 90, x));
  }

  function landShape() {
    var nearest = null, best = 1e9;
    for (var i = 0; i < holes.length; i++) {
      var d = Math.abs(shapeX - holes[i].x);
      if (d < best) { best = d; nearest = holes[i]; }
    }
    var fit = nearest && nearest.kind === shapeKind && best < 70;
    hitStop = 0.14;
    if (fit) {
      passed++; streak++; bestStreak = Math.max(bestStreak, streak);
      mascotMood = 1;
      game.feedback.good(shapeX, FLOOR_Y + 40, { text: streak >= 3 ? 'x' + streak : null, color: C.good });
      game.audio.play('se_tap', 0.2);
      if (streak >= 3) { game.fx.popup('x' + streak, W / 2, H * 0.18, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (passed >= 5 && holeCount === 2) { holeCount = 3; setupHoles(); game.fx.popup('+HOLE', W / 2, H * 0.22, { color: C.gold, size: 34 }); }
      fallSpeed = Math.min(460, fallSpeed + 14);
      if (passed >= NEEDED) { ok = true; finished = true; game.fx.burst(shapeX, FLOOR_Y, { color: C.gold, count: 20, speed: 380 }); game.audio.play('se_success', 0.5); finish(); return; }
      newShape();
    } else {
      jams++; streak = 0; mascotMood = -1;
      game.feedback.bad(shapeX, FLOOR_Y + 40, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      if (jams >= JAM_LIMIT) { ok = false; finished = true; finish(); return; }
      newShape();
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); onDrag(x); } });
  game.onMove(function(x) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.4, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (shapeX === undefined) initGame();
    if (!finished) {
      shapeY += fallSpeed * dt;
      var tgt = null, best = 1e9;
      for (var i = 0; i < holes.length; i++) { if (holes[i].kind === shapeKind) tgt = holes[i]; }
      if (tgt) shapeX += (tgt.x - shapeX) * Math.min(1, dt * 3.4);
      demo.gx = shapeX; demo.gy = shapeY;
      demo.press = true;
      if (shapeY >= FLOOR_Y) { landShape(); if (finished) initGame(); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      sorterBg();
      stepDemo(dt);
      drawTray();
      if (!finished) drawShapeBlock(shapeX, shapeY, shapeKind, 150);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      sorterBg();
      drawTray();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + NEEDED, W / 2, H * 0.12, 32, C.gold);
      if (!ok && passed >= NEEDED - 1) txt('あと1個!', W / 2, H * 0.165, 28, C.bad);
      txt('BEST x' + bestStreak, W / 2, H * 0.205, 26, C.white);
      if (passed > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.25, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { passed: passed, jams: jams, bestStreak: bestStreak };
        if (ok) game.end.success(passed, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      shapeY += fallSpeed * dt;
      if (shapeY >= FLOOR_Y) landShape();
    }
    if (shake > 0) shake -= dt;
    if (mascotMood !== 0) mascotMood *= Math.max(0, 1 - dt * 2);

    sorterBg();
    drawTray();
    if (!finished) drawShapeBlock(shapeX, shapeY, shapeKind, 150);

    txt(passed + ' / ' + NEEDED, W / 2, H * 0.055, 32, C.white);
    txt('JAM ' + jams + '/' + JAM_LIMIT, W * 0.85, H * 0.055, 24, jams > 0 ? C.bad : C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['E5', 0.2], ['C5', 0.2], ['G4', 0.2], ['C5', 0.2], ['E5', 0.2], ['G5', 0.2]],
      { tempo: 132, wave: 'triangle', volume: 0.07, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
