// J-N6424-0018-thunder-cellar-step.js
// 雷光の地下工房 — 稲光が一瞬だけ照らした床の抜け穴を覚え、真っ暗な地下室を一歩ずつ出口の階段まで進む
// 操作: 上下左右のスワイプで見習いを1マスずつ歩かせる(タップはランタンを振るだけ)。立ち止まると足元の床板がきしんで崩れる
// 終わり: 2部屋ぶん出口の階段へたどり着けば成功。抜け穴を踏む/立ち止まり過ぎて床が抜ける/時間切れで失敗
// @mechanic: swipe_direction
// @theme: thunder_cellar_memory_walk
// 世界観: 停電した時計工房の地下室に閉じ込められた見習い時計職人が、窓から差す稲光が床を照らす一瞬で抜け穴の配置を覚え、暗闇を手探りで地上への階段まで歩き切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた部屋数と残り時間スコア
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ、細い線、枠で区切るUI
  var PAL = {
    night: '#050a1c', wall: '#101a3a', floor: '#3c5aa8', floorLit: '#7fa2ff', seam: '#1c2a5c',
    pit: '#000000', spike: '#ff3355', lamp: '#ffd84a', stair: '#39e07a', cyan: '#58e8ff',
    white: '#ffffff', red: '#ff3355', ink: '#c8d4ff'
  };

  var TITLE = 'DARK STEP';
  var COLS = 5, ROWS = 7, CELL = 150;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.2;
  var ROOMS = 2;
  var TIME_LIMIT = 14;
  var SHOW_TIME = 1.1;        // 部屋に入った直後の稲光
  var BOLT_EVERY = 3.6;       // 以後、ときどき一瞬だけ光る
  var CREAK_AT = 2.0, FALL_AT = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var grid, exitCol, pr, pc, roomsDone, timeLeft, lightT, boltT, idle, steps;
  var ready, freeze, endWait, over, won, culprit, lastCreak, walkAnim;

  var KID = [
    ['..yy....', '.yyyy...', '.wbwb...', '.bbbbL..', 'bbbbbL..', '.b..b...'],
    ['..yy....', '.yyyy...', '.wbwb...', '.bbbbL..', 'bbbbbL..', 'b....b..']
  ];
  var KID_PAL = { y: '#ffd84a', w: '#ffffff', b: '#58e8ff', L: '#ffd84a' };
  var PIT = ['r.r.r.r.', '.kkkkkk.', 'rkkkkkkr', '.kkkkkk.', 'rkkkkkkr', '.kkkkkk.', 'rkkkkkkr', '.r.r.r.r'];
  var PIT_PAL = { r: '#ff3355', k: '#000000' };
  var STAIR = ['gggggggg', 'g......g', 'gggggggg', '.g....g.', '.gggggg.', '..g..g..', '..gggg..'];
  var CLOCK = ['.cccc.', 'c.w..c', 'c.w..c', 'c.www.', 'c....c', '.cccc.', '..pp..', '..pp..', '..pp..', '.pppp.'];

  function makeRoom() {
    var g = [], r, c;
    for (r = 0; r < ROWS; r++) { g.push([]); for (c = 0; c < COLS; c++) g[r].push(Math.random() < 0.62 ? 1 : 0); }
    // 保証された抜け道を上へ向かって掘る
    c = 2; r = ROWS - 1; g[r][c] = 0;
    while (r > 0) {
      var roll = Math.random();
      if (roll < 0.45 && c > 0 && g[r][c - 1] !== 2) { c--; }
      else if (roll < 0.9 && c < COLS - 1) { c++; }
      else { r--; }
      if (c < 0) c = 0;
      g[r][c] = 2;
      if (Math.random() < 0.5) { r--; if (r >= 0) g[r][c] = 2; }
      if (r < 0) r = 0;
    }
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (g[r][c] === 2) g[r][c] = 0;
    g[ROWS - 1][2] = 0;
    return { cells: g, exit: c };
  }

  function enterRoom() {
    var m = makeRoom();
    grid = m.cells; exitCol = m.exit;
    pr = ROWS - 1; pc = 2;
    lightT = SHOW_TIME; boltT = BOLT_EVERY; idle = 0; lastCreak = 0;
  }

  function initGame() {
    roomsDone = 0; timeLeft = TIME_LIMIT; steps = 0;
    ready = 0.8; freeze = 0; endWait = 0; over = false; won = false; culprit = null; walkAnim = 0;
    enterRoom();
  }

  function cellX(c) { return GX + c * CELL + CELL / 2; }
  function cellY(r) { return GY + r * CELL + CELL / 2; }

  // 実ロジック: 1歩進む。'bump' | 'pit' | 'exit' | 'ok'
  function tryStep(dir) {
    var nr = pr, nc = pc;
    if (dir === 'up') nr--; else if (dir === 'down') nr++; else if (dir === 'left') nc--; else nc++;
    if (nr === -1 && nc === exitCol) { pr = -1; pc = nc; return 'exit'; }
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return 'bump';
    pr = nr; pc = nc; idle = 0; lastCreak = 0; walkAnim = 0.18;
    if (grid[nr][nc] === 1) { culprit = { r: nr, c: nc }; return 'pit'; }
    return 'ok';
  }

  function lightLevel() {
    if (lightT > 0) return Math.min(1, lightT / 0.25);
    if (boltT < 0.22 && boltT > 0) return 0.85;
    return 0;
  }

  function drawBack() {
    var hum = 0.05 + 0.04 * Math.sin(game.time.elapsed * 1.7);
    game.draw.gradient(0, H, [[0, PAL.night], [0.6, PAL.wall], [1, PAL.night]]);
    game.draw.rect(0, 0, W, H, PAL.cyan, hum * 0.35);
    // 高窓と雨
    var win = lightLevel();
    game.draw.rect(W * 0.38, H * 0.125, W * 0.24, 70, win > 0 ? PAL.white : '#1a2448', 0.9);
    for (var i = 0; i < 7; i++) {
      var rx = W * 0.39 + ((i * 37 + game.time.elapsed * 240) % (W * 0.22));
      game.draw.line(rx, H * 0.128, rx - 8, H * 0.128 + 50, PAL.cyan, 2);
    }
    // 振り子時計(常に揺れる遠景)
    var sway = Math.sin(game.time.elapsed * 2.4) * 14;
    game.draw.sprite(CLOCK, { c: PAL.ink, w: PAL.lamp, p: PAL.seam }, W * 0.08 + sway, H * 0.12 + Math.cos(game.time.elapsed * 2.4) * 4, 7, { anchor: 'center' });
    game.draw.sprite(CLOCK, { c: PAL.ink, w: PAL.lamp, p: PAL.seam }, W * 0.92 - sway, H * 0.12, 7, { anchor: 'center', flipX: true });
  }

  function drawRoom(showAll) {
    var L = showAll ? 1 : lightLevel();
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX + c * CELL, y = GY + r * CELL;
        game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, PAL.seam, 1);
        if (L > 0) {
          if (grid[r][c] === 1) game.draw.sprite(PIT, PIT_PAL, x + CELL / 2, y + CELL / 2, 17, { anchor: 'center', alpha: L });
          else game.draw.rect(x + 8, y + 8, CELL - 16, CELL - 16, PAL.floorLit, L);
        }
      }
    }
    // 出口の階段は常に見える(ゴール)
    var ex = cellX(exitCol), ey = GY - CELL / 2;
    var glow = 0.5 + 0.5 * Math.sin(game.time.elapsed * 5);
    game.draw.rect(ex - CELL / 2 + 6, ey - CELL / 2 + 10, CELL - 12, CELL - 16, PAL.stair, 0.18 + glow * 0.2);
    game.draw.sprite(STAIR, { g: PAL.stair }, ex, ey + 6, 14, { anchor: 'center' });
    // 床のきしみ(立ち止まりの予告)
    if (pr >= 0 && idle > CREAK_AT) {
      var k = (idle - CREAK_AT) / (FALL_AT - CREAK_AT);
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.rect(cellX(pc) - CELL / 2 + 6, cellY(pr) - CELL / 2 + 6, CELL - 12, CELL - 12, PAL.red, blink ? 0.2 + k * 0.4 : 0.1);
      game.draw.line(cellX(pc) - 50, cellY(pr) - 30, cellX(pc) + 10, cellY(pr) + 40 * k, PAL.red, 5);
      game.draw.line(cellX(pc) + 40, cellY(pr) - 45, cellX(pc) - 5, cellY(pr) + 10, PAL.red, 4);
    }
  }

  function drawKid() {
    var ky = pr >= 0 ? cellY(pr) : GY - CELL / 2;
    var kx = cellX(pc);
    var bob = Math.sin(game.time.elapsed * 7) * 5 - walkAnim * 60;
    // 手元のランタン灯り(自分の足元だけ)
    game.draw.circle(kx, ky, CELL * 0.62, PAL.lamp, 0.13 + 0.04 * Math.sin(game.time.elapsed * 9));
    game.draw.sprite(KID[Math.floor(game.time.elapsed * 6) % 2], KID_PAL, kx, ky + bob, 13, { anchor: 'center' });
  }

  function drawPad() {
    var cx = W / 2, cy = H * 0.84;
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 4);
    game.draw.rect(cx - 250, cy - 170, 500, 340, PAL.wall, 0.8);
    game.draw.line(cx - 250, cy - 170, cx + 250, cy - 170, PAL.cyan, 3);
    var ARW = ['...c...', '..ccc..', '.ccccc.', 'ccccccc', '..ccc..', '..ccc..'];
    var DWN = ['..ccc..', '..ccc..', 'ccccccc', '.ccccc.', '..ccc..', '...c...'];
    var col = { c: PAL.cyan };
    game.draw.sprite(ARW, col, cx, cy - 100, 12, { anchor: 'center', alpha: 0.5 + pulse * 0.4 });
    game.draw.sprite(DWN, col, cx, cy + 100, 12, { anchor: 'center', alpha: 0.5 + pulse * 0.4 });
    game.draw.line(cx - 200, cy, cx - 90, cy, PAL.cyan, 14);
    game.draw.line(cx + 90, cy, cx + 200, cy, PAL.cyan, 14);
    game.draw.circle(cx, cy, 36, PAL.lamp, 0.4 + pulse * 0.3);
  }

  function drawHud() {
    game.draw.text(roomsDone + ' / ' + ROOMS, W / 2, H * 0.045, { size: 50, color: PAL.lamp, bold: true, align: 'center', font: 'monospace' });
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 150, bw, 18, PAL.seam, 1);
    game.draw.rect(80, 150, bw * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? PAL.red : PAL.cyan, 1);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.36, W, H * 0.3, PAL.night, 0.85);
    game.draw.line(0, H * 0.36, W, H * 0.36, won ? PAL.stair : PAL.red, 6);
    game.draw.text(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, { size: 96, color: won ? PAL.stair : PAL.red, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(roomsDone + ' / ' + ROOMS, W / 2, H * 0.5, { size: 60, color: PAL.lamp, bold: true, align: 'center', font: 'monospace' });
    var sc = score();
    if (won && sc > game.best) game.draw.text('NEW RECORD', W / 2, H * 0.56, { size: 54, color: PAL.lamp, bold: true, align: 'center' });
    else game.draw.text('BEST ' + game.best, W / 2, H * 0.56, { size: 44, color: PAL.ink, bold: true, align: 'center' });
    if (!won) game.draw.text('あと' + (ROOMS - roomsDone) + '部屋!', W / 2, H * 0.62, { size: 48, color: PAL.white, bold: true, align: 'center' });
  }

  function score() { return roomsDone * 100 + (won ? Math.floor(timeLeft * 10) : 0); }

  function lose(x, y, why) {
    if (over) return;
    over = true; won = false; freeze = 0.5;
    lightT = 0.6; // 真相を照らす
    game.fx.flash('#ffffff', 0.18);
    game.feedback.bad(x, y, { text: why, color: PAL.red, size: 64 });
    game.audio.play('se_break', 0.5);
    endWait = 1.8;
  }

  function stepFeedback(res) {
    if (res === 'bump') { game.audio.play('se_tap', 0.3); game.fx.shake(6, 0.12); return; }
    if (res === 'pit') { game.audio.play('se_jump', 0.4); lose(cellX(pc), cellY(pr), 'MISS'); return; }
    steps++;
    if (res === 'exit') {
      roomsDone++;
      game.feedback.good(cellX(pc), GY - CELL / 2, { text: roomsDone >= ROOMS ? 'CLEAR' : 'NICE', color: PAL.stair, size: 64 });
      if (roomsDone >= ROOMS) {
        over = true; won = true; freeze = 0.4; endWait = 1.8;
        game.fx.burst(cellX(pc), GY - CELL / 2, { color: PAL.lamp, count: 40, speed: 600 });
        game.audio.play('se_success', 0.6);
      } else {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(roomsDone + ' / ' + ROOMS, W / 2, H * 0.3, { color: PAL.lamp, size: 70 });
        enterRoom();
      }
      return;
    }
    game.audio.tone(steps % 2 ? 'C4' : 'E4', 0.06, { wave: 'square', volume: 0.12 });
  }

  // ── ATTRACT: 実ロジックで1部屋を歩いて見せる(奇数周は抜け穴を踏む失敗例) ──
  var demo = { t: 0, cyc: 0, plan: [], idx: 0, next: 0, gx: 540, gy: 960, press: false, dead: 0 };
  function planPath() {
    // BFSで出口までの道順を求める
    var q = [[ROWS - 1, 2]], prev = {}, seen = {}, goal = null;
    seen[(ROWS - 1) + ',2'] = true;
    while (q.length) {
      var cur = q.shift();
      if (cur[0] === 0 && cur[1] === exitCol) { goal = cur; break; }
      var nb = [[-1, 0, 'up'], [0, -1, 'left'], [0, 1, 'right'], [1, 0, 'down']];
      for (var i = 0; i < nb.length; i++) {
        var r = cur[0] + nb[i][0], c = cur[1] + nb[i][1];
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c] === 1 || seen[r + ',' + c]) continue;
        seen[r + ',' + c] = true; prev[r + ',' + c] = [cur, nb[i][2]]; q.push([r, c]);
      }
    }
    var path = ['up'];
    while (goal && prev[goal[0] + ',' + goal[1]]) { var p = prev[goal[0] + ',' + goal[1]]; path.unshift(p[1]); goal = p[0]; }
    return path;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demo.restart) {
      demo.restart = false; initGame(); ready = 0; demo.plan = planPath(); demo.idx = 0; demo.next = SHOW_TIME + 0.2; demo.dead = 0;
      demo.fail = demo.cyc % 2 === 1; demo.cyc++;
    }
    if (lightT > 0) lightT -= dt;
    boltT -= dt; if (boltT <= 0) boltT = BOLT_EVERY;
    if (walkAnim > 0) walkAnim -= dt;
    if (demo.dead > 0) { demo.dead -= dt; if (demo.dead <= 0) demo.restart = true; demo.press = false; return; }
    demo.next -= dt;
    var dir = demo.plan[demo.idx] || 'up';
    if (demo.fail && demo.idx === 2) {
      // 失敗例: 隣の抜け穴へ踏み込む
      var tries = ['left', 'right', 'up'];
      for (var i = 0; i < tries.length; i++) {
        var r = pr + (tries[i] === 'up' ? -1 : 0), c = pc + (tries[i] === 'left' ? -1 : tries[i] === 'right' ? 1 : 0);
        if (r >= 0 && c >= 0 && c < COLS && grid[r][c] === 1) { dir = tries[i]; break; }
      }
    }
    var ox = dir === 'left' ? -130 : dir === 'right' ? 130 : 0, oy = dir === 'up' ? -130 : dir === 'down' ? 130 : 0;
    var kx = cellX(pc), ky = pr >= 0 ? cellY(pr) : GY;
    var ph = Math.max(0, Math.min(1, 1 - demo.next / 0.4));
    demo.gx = kx + ox * ph; demo.gy = ky + 60 + oy * ph; demo.press = ph > 0.05;
    if (demo.next <= 0) {
      var res = tryStep(dir);
      demo.idx++; demo.next = 0.42;
      if (res === 'pit') { lightT = 0.6; demo.dead = 1.0; game.fx.burst(cellX(pc), cellY(pr), { color: PAL.red, count: 16, speed: 300 }); }
      else if (res === 'exit') { demo.dead = 0.9; game.fx.burst(cellX(pc), GY - CELL / 2, { color: PAL.lamp, count: 16, speed: 300 }); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.cyc = 0; return; }
    if (!over) { game.audio.play('se_tap', 0.15); game.fx.burst(cellX(pc), pr >= 0 ? cellY(pr) : GY, { color: PAL.lamp, count: 5, speed: 120 }); }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || over || ready > 0) return;
    if (lightT > 0) lightT = Math.min(lightT, 0.25); // 歩き出したら稲光は消える
    stepFeedback(tryStep(dir));
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame();
      stepDemo(dt);
      drawBack(); drawRoom(false); drawKid(); drawPad();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.text(TITLE, W / 2, H * 0.05, { size: 84, color: PAL.lamp, bold: true, align: 'center', font: 'monospace' });
      game.draw.text('BEST ' + game.best, W / 2, H * 0.095, { size: 38, color: PAL.ink, bold: true, align: 'center' });
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) game.draw.text('► 100円 投入 ◄', W / 2, H * 0.955, { size: 46, color: PAL.lamp, bold: true, align: 'center' });
      else game.draw.text('INSERT COIN', W / 2, H * 0.955, { size: 40, color: PAL.ink, bold: true, align: 'center' });
      return;
    }
    if (state === S.RESULT) {
      drawBack(); drawRoom(true); drawKid(); drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) game.draw.text('TAP TO CONTINUE', W / 2, H * 0.94, { size: 40, color: PAL.ink, bold: true, align: 'center' });
      return;
    }

    if (walkAnim > 0) walkAnim -= dt;
    if (over) {
      if (freeze > 0) freeze -= dt;
      if (lightT > 0 && !won) lightT = Math.max(lightT - dt * 0.2, 0.3);
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (won) game.end.success(score(), { rooms: roomsDone, steps: steps, timeLeft: Math.floor(timeLeft) });
        else game.end.failure({ rooms: roomsDone, steps: steps });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      if (lightT > 0) lightT -= dt;
      else {
        boltT -= dt;
        if (boltT <= 0) { boltT = BOLT_EVERY; game.audio.tone('A2', 0.25, { wave: 'noise', volume: 0.12 }); }
        idle += dt;
        if (idle > CREAK_AT && idle - lastCreak > 0.3) { lastCreak = idle; game.audio.tone('D3', 0.08, { wave: 'sawtooth', volume: 0.1 }); }
        if (idle > FALL_AT && pr >= 0) { culprit = { r: pr, c: pc }; lose(cellX(pc), cellY(pr), 'MISS'); }
      }
      if (timeLeft <= 0 && !over) { timeLeft = 0; culprit = { r: Math.max(0, pr), c: pc }; lose(cellX(pc), cellY(Math.max(0, pr)), 'TIME UP'); }
    }

    drawBack();
    drawRoom(over && !won);
    if (culprit && over && !won) {
      var cx = cellX(culprit.c), cy = cellY(culprit.r);
      var zoom = 1 + Math.max(0, freeze) * 0.8;
      game.draw.rect(cx - CELL * 0.5 * zoom, cy - CELL * 0.5 * zoom, CELL * zoom, CELL * zoom, PAL.white, 0.35 + 0.3 * Math.sin(game.time.elapsed * 20));
    }
    if (!(over && !won && freeze <= 0)) drawKid();
    drawPad();
    drawHud();
    if (ready > 0) game.draw.text(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, { size: 110, color: PAL.lamp, bold: true, align: 'center', font: 'monospace' });
    if (over && freeze <= 0) drawOutcome();
  });

  game.onStart(function() {
    game.audio.melody([['E3', 1], ['G3', 0.5], ['B3', 0.5], ['A3', 1], ['F3', 1], ['E3', 0.5], ['C3', 0.5], ['D3', 1]], { tempo: 104, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
