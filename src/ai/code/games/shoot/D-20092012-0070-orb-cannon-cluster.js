// D-20092012-0070-orb-cannon-cluster.js
// オーブキャノン・クラスター — 下の砲台から色玉を撃ち上げ、同じ色を3つ以上つなげて割り落とす
// 操作: 下段4レーンのいずれかをタップして、今装填中の色の玉をそのレーンへ撃ち上げる
// 終わり: 4回そろえて割れば成功。いずれかのレーンが積み上がり天井に届くと失敗
// @mechanic: aim_shoot
// @theme: orb_cannon_cluster
// 世界観: 塔の最上階に据えられた色玉砲台。撃ち上げた玉は上のクラスターに積み重なり、同じ色が3つ以上つながると弾けて消える
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 対戦/ベルト筐体、巨大キャラ、床に楕円影、背景は横1層
  var C = {
    bg1: '#101a2c', bg2: '#0a1220', tower: '#1c2a44', towerEdge: '#2e4468',
    c0: '#ff5a5a', c1: '#5ab4ff', c2: '#ffd85a', c3: '#7cff8a',
    cannon: '#8ab0d8', cannonDark: '#5a7ea8',
    good: '#7cff8a', bad: '#ff4d5e', gold: '#ffd85a', white: '#eef4ff', ink: '#060a14',
  };
  var COLORS = [C.c0, C.c1, C.c2, C.c3];

  var GAME_TITLE = 'ORB CANNON';
  var COLS = 4, ROWS = 5;
  var NEEDED = 4;
  var MAX_TIME = 18;
  var CELL = 190;
  var GX = W * 0.5, TOP_Y = H * 0.24;
  var LANE_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CANNON_SPR = ['..##..', '.####.', '######', '######'];

  function laneX(c) { return GX + (c - (COLS - 1) / 2) * CELL; }
  function rowY(r) { return H * 0.62 - r * CELL; } // ROWS-1 が最上段付近

  var stacks; // stacks[col] = [colorIdx,...] 下から積む
  var pops, timeLeft, shots, projectile, nextColor;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    stacks = [];
    for (var c = 0; c < COLS; c++) {
      var col = [];
      var h = Math.floor(game.random(1, 3));
      for (var r = 0; r < h; r++) col.push(Math.floor(game.random(0, COLORS.length)));
      stacks.push(col);
    }
    pops = 0; timeLeft = MAX_TIME; shots = 0; projectile = null; nextColor = Math.floor(game.random(0, COLORS.length));
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function neighborsSameColor(col, row, color, seen) {
    var key = col + ',' + row;
    if (seen[key]) return [];
    seen[key] = true;
    if (!stacks[col] || stacks[col][row] !== color) return [];
    var group = [[col, row]];
    var deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < deltas.length; i++) {
      var nc = col + deltas[i][0], nr = row + deltas[i][1];
      if (nc >= 0 && nc < COLS) group = group.concat(neighborsSameColor(nc, nr, color, seen));
    }
    return group;
  }

  function fireLane(c) {
    if (ready > 0 || finished || done || projectile) return;
    if (stacks[c].length >= ROWS) { overflow(c); return; }
    game.audio.play('se_jump', 0.3);
    projectile = { col: c, y0: LANE_Y, y1: rowY(stacks[c].length), t: 0, dur: 0.22, color: nextColor };
  }

  function overflow(c) {
    hitStop = 0.3; shake = 0.25;
    game.feedback.bad(laneX(c), rowY(ROWS - 1), { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function landProjectile() {
    var c = projectile.col, color = projectile.color;
    stacks[c].push(color);
    var row = stacks[c].length - 1;
    var group = neighborsSameColor(c, row, color, {});
    projectile = null;
    if (group.length >= 3) {
      hitStop = 0.1;
      var px = laneX(c), py = rowY(row);
      game.feedback.good(px, py, { text: 'POP', color: C.good });
      game.fx.burst(px, py, { color: COLORS[color], count: 16, speed: 340 });
      game.audio.play('se_success', 0.32);
      var byCol = {};
      for (var i = 0; i < group.length; i++) {
        var gc = group[i][0], gr = group[i][1];
        (byCol[gc] = byCol[gc] || []).push(gr);
      }
      for (var col in byCol) {
        var rows = byCol[col].sort(function(a, b) { return b - a; });
        for (var k = 0; k < rows.length; k++) stacks[col].splice(rows[k], 1);
      }
      pops++;
      if (pops === Math.ceil(NEEDED / 2)) { game.fx.popup(pops + ' / ' + NEEDED, W / 2, TOP_Y - 100, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
      if (pops >= NEEDED) { ok = true; finished = true; finish(); return; }
    } else {
      game.audio.play('se_tap', 0.1);
    }
    nextColor = Math.floor(game.random(0, COLORS.length));
    for (var cc = 0; cc < COLS; cc++) if (stacks[cc].length >= ROWS) { overflow(cc); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    for (var c = 0; c < COLS; c++) {
      if (Math.abs(x - laneX(c)) < CELL / 2) { fireLane(c); return; }
    }
    game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    game.draw.rect(GX - COLS * CELL / 2 - 20, TOP_Y - 100, COLS * CELL + 40, H * 0.5, C.tower, 0.5);
    game.draw.line(GX - COLS * CELL / 2 - 20, rowY(ROWS - 1) - CELL / 2, GX + COLS * CELL / 2 + 20, rowY(ROWS - 1) - CELL / 2, C.bad, 4);
  }

  function drawStacks() {
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < stacks[c].length; r++) {
        var sway = Math.sin(game.time.elapsed * 1.6 + c + r) * 2;
        game.draw.circle(laneX(c), rowY(r) + sway, CELL / 2 - 16, stacks[c][r], 1);
        game.draw.circle(laneX(c), rowY(r) + sway, CELL / 2 - 16, '#00000020', 1);
        game.draw.circle(laneX(c), rowY(r) + sway, CELL / 2 - 26, stacks[c][r], 1);
      }
    }
  }

  function drawCannon() {
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    game.draw.circle(GX, LANE_Y + 130, 200, '#000000', 0.15);
    game.draw.sprite(CANNON_SPR, { '#': C.cannonDark }, GX, LANE_Y + 60 + bob, 28, { anchor: 'center' });
    game.draw.circle(GX, LANE_Y - 20 + bob, 40, nextColor !== undefined ? COLORS[nextColor] : C.white);
  }

  function drawProjectile() {
    if (!projectile) return;
    var t = Math.min(1, projectile.t / projectile.dur);
    var x = laneX(projectile.col), y = projectile.y0 + (projectile.y1 - projectile.y0) * t;
    game.draw.circle(x, y, 42, COLORS[projectile.color], 1);
  }

  var demo = { t: 0, gx: GX, gy: LANE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      stacks = [[0], [1, 1], [2], [0]]; pops = 0; projectile = null; nextColor = 1;
    }
    if (cyc < 0.4) { demo.gx = laneX(1); demo.gy = LANE_Y; demo.press = false; }
    else if (cyc < 0.6) { if (!projectile) fireLane(1); demo.press = true; }
    if (projectile) {
      projectile.t += dt;
      if (projectile.t >= projectile.dur) landProjectile();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stacks === undefined) initGame();
      bg();
      stepDemo(dt);
      drawStacks();
      drawProjectile();
      drawCannon();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStacks();
      drawCannon();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(pops + ' / ' + NEEDED, W / 2, H * 0.12, 28, C.white);
      if (!ok && pops >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.16, 24, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (!finished && projectile) {
      projectile.t += dt;
      if (projectile.t >= projectile.dur) landProjectile();
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pops * 100, { pops: pops }); else game.end.failure({ pops: pops });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(GX, TOP_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawStacks();
    drawProjectile();
    drawCannon();

    txt(pops + ' / ' + NEEDED, W / 2, 100, 32, C.white);
    if (!finished) {
      var frac = Math.max(0, timeLeft / MAX_TIME);
      game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.3]], { tempo: 138, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
