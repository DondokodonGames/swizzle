// J-N6424-0002-sinking-tile-hop.js
// 沈む床タイル・ホップ — 沈んでいく床タイルの中から安全なタイルを瞬時に見つけて飛び移り続ける
// 操作: 割れて沈み始めたタイルを避け、まだ沈んでいない安全なタイルを素早くタップして飛び移る
// 終わり: 規定回数、安全なタイルへ跳び続ければ成功。沈むタイルを踏む/遅れれば失敗
// @mechanic: spot
// @theme: sinking_ruin_tiles
// 世界観: 遺跡の試練を受ける見習い冒険者が、次々沈んでいく床タイルの中から安全な一枚を瞬時に見極めて飛び移り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡り切ったタイル数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップで奥ほど圧縮、地平線へ収束する床
  var C = {
    sky: '#0a1428', sky2: '#1a2e4a', tileSafe: '#3a7ac0', tileSafeDark: '#2a5a90',
    tileSink: '#c04030', tileGone: '#0a1020', hero: '#f0d060', heroDark: '#a08020',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#e8f0ff', white: '#ffffff',
  };

  var GAME_TITLE = 'TILE HOP';
  var GRID = 3;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.5, CELL = 260;
  var TARGET_HOPS = 6;
  var ROUND_TIME = 1.9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000814', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_SPR = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.sky2], [1, C.sky]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function cellPos(i) {
    var cx = i % GRID, cy = Math.floor(i / GRID);
    return { x: BOARD_X + (cx - 1) * CELL, y: BOARD_Y + (cy - 1) * CELL };
  }

  function drawBoard(tiles, heroIdx) {
    for (var i = 0; i < GRID * GRID; i++) {
      var p = cellPos(i);
      var t = tiles[i];
      var col = t.state === 'gone' ? C.tileGone : (t.state === 'sink' ? C.tileSink : (i % 2 === 0 ? C.tileSafe : C.tileSafeDark));
      var sinkOff = t.state === 'sink' ? t.timer * 10 : 0;
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6 + sinkOff, CELL - 12, CELL - 12 - sinkOff, col);
      if (t.state === 'sink') {
        var flick = Math.sin(game.time.elapsed * 24) > 0;
        if (flick) game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, 8, C.white, 0.6);
      }
    }
    var hp = cellPos(heroIdx);
    var bob = Math.sin(game.time.elapsed * 5) * 6;
    game.draw.sprite(HERO_SPR, { '#': C.hero }, hp.x, hp.y + bob, 26, { anchor: 'center' });
  }

  var tiles, heroIdx, hops, sinkTimer, sinkTarget;
  var done, endWait, finished, ready, hitStop, shake;

  function newTiles(exclude) {
    var arr = [];
    for (var i = 0; i < GRID * GRID; i++) arr.push({ state: 'safe', timer: 0 });
    return arr;
  }

  function pickSinkTarget() {
    var candidates = [];
    for (var i = 0; i < GRID * GRID; i++) if (i !== heroIdx && tiles[i].state === 'safe') candidates.push(i);
    if (candidates.length === 0) return -1;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function startSink() {
    sinkTarget = pickSinkTarget();
    if (sinkTarget >= 0) { tiles[sinkTarget].state = 'sink'; tiles[sinkTarget].timer = 0; }
    sinkTimer = ROUND_TIME;
  }

  function initGame() {
    tiles = newTiles();
    heroIdx = 4;
    hops = 0;
    startSink();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptHop(i) {
    if (i === heroIdx) { game.audio.play('se_tap', 0.06); return; }
    var t = tiles[i];
    if (t.state === 'gone') {
      game.feedback.bad(cellPos(i).x, cellPos(i).y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      finish();
      return;
    }
    heroIdx = i;
    hops++;
    game.feedback.good(cellPos(i).x, cellPos(i).y, { text: 'GOOD', color: C.good });
    game.audio.play('se_jump', 0.25);
    if (hops === Math.ceil(TARGET_HOPS / 2)) {
      game.fx.popup('NICE', cellPos(i).x, cellPos(i).y - 150, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (t.state === 'sink') startSink();
    if (hops >= TARGET_HOPS) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(cellPos(i).x, cellPos(i).y, { text: 'CLEAR', color: C.good });
      game.fx.burst(cellPos(i).x, cellPos(i).y, { color: C.gold, count: 22, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var cx = Math.round((x - BOARD_X) / CELL) + 1;
      var cy = Math.round((y - BOARD_Y) / CELL) + 1;
      if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) { game.audio.play('se_tap', 0.05); return; }
      attemptHop(cy * GRID + cx);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    sinkTimer -= dt;
    if (sinkTarget >= 0) tiles[sinkTarget].timer += dt;
    if (sinkTimer <= 0) {
      if (sinkTarget >= 0) tiles[sinkTarget].state = 'gone';
      startSink();
    }
    var seg = cyc % 1.1;
    if (seg < dt) {
      var candidates = [];
      for (var i = 0; i < GRID * GRID; i++) if (tiles[i].state === 'safe' && i !== heroIdx) candidates.push(i);
      if (candidates.length > 0) {
        var pick = candidates[Math.floor(Math.random() * candidates.length)];
        var p = cellPos(pick);
        demo.gx = p.x; demo.gy = p.y; demo.press = true;
        heroIdx = pick;
        hops++;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_jump', 0.15);
      }
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tiles === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard(tiles, heroIdx);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard(tiles, heroIdx);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hops + ' / ' + TARGET_HOPS, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_HOPS - hops) + '回!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hops, { hops: hops, target: TARGET_HOPS });
        else game.end.failure({ hops: hops, target: TARGET_HOPS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      sinkTimer -= dt;
      if (sinkTarget >= 0) tiles[sinkTarget].timer += dt;
      if (sinkTimer <= 0) {
        if (sinkTarget >= 0) tiles[sinkTarget].state = 'gone';
        if (sinkTarget === heroIdx) {
          ok = false; finished = true; hitStop = 0.35; shake = 0.3;
          game.feedback.bad(cellPos(heroIdx).x, cellPos(heroIdx).y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        } else {
          startSink();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard(tiles, heroIdx);

    txt(hops + ' / ' + TARGET_HOPS, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.min(1, hops / TARGET_HOPS);
    game.draw.rect(60, 150, barW, 16, '#0e1a30', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['Eb4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
