// I-GBA-0029v2-toycafe-block-pull-turns.js
// おもちゃカフェの抜き取り番 — 店主と交互に積み木の塔から1本ずつ抜き、自分の番では崩れない1本を見極める
// 操作: 自分の番(手のマークが光る)に、抜いても段が支えを失わない積み木をタップして抜く。持ち時間の輪が尽きる前に選ぶ
// 終わり: 自分の番で6本抜ければ成功。支えの要を抜いて塔が崩れる/持ち時間切れ/全体の時間切れで失敗
// @mechanic: turn_attack
// @theme: toy_cafe_block_tower_turns
// 世界観: 木のおもちゃカフェで、客が店主と交互に積み木の塔から1本ずつ抜き取り、真ん中か両端のどちらかが残っていれば段は立つという釣り合いを読んで、崩す役を店主に回す
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いた本数と早抜きボーナス
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 上面/正面/側面の3明度で立方体を描く
  var STYLE = { bg: ['#f3e3c8', '#d8b88a', '#8a6242'], main: ['#e8c07a', '#f4d8a0', '#b88a4a'], accent: ['#4ab0e0', '#e0504a'] };
  var V = {
    cream: STYLE.bg[0], wall: STYLE.bg[1], shelf: STYLE.bg[2],
    face: STYLE.main[0], top: STYLE.main[1], side: STYLE.main[2], faceB: '#d9a864', topB: '#ecc890', sideB: '#a0763a',
    you: STYLE.accent[0], danger: STYLE.accent[1], ink: '#3a2618', white: '#ffffff', gold: '#ffc83a',
  };

  var GAME_TITLE = 'TOY TOWER';
  var TIME_LIMIT = 28;
  var NEEDED = 6;
  var ROWS = 12;
  var BW = 140, BH = 54, DEPTH = 14;
  var BASE_Y = Math.round(H * 0.7);
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var stage = S.ATTRACT;
  var champ = false;

  var tower, turn, turnClock, turnMax, pulls, cpuPulls, bonus, total, getReady, halt, gameDone, afterT, sliding, rubble, culprit, cpuThink, cpuPick, halfCheer, whyLost;

  function draw(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: V.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var OWNER_A = ['..hhhh..', '.hhhhhh.', '..ffff..', '.fmmmmf.', '..ffff..', '.aaaaaa.', 'aawwwwaa', '..wwww..', '..w..w..'];
  var OWNER_B = ['..hhhh..', '.hhhhhh.', '..ffff..', '.fmmmmf.', '..ffff..', '.aaaaaa.', '.awwwwa.', 'a.wwww.a', '..w..w..'];
  var OWNER_PAL = { h: '#5a3a22', f: '#f2c79a', m: '#5a3a22', a: '#f2c79a', w: '#3a7a5a' };
  var CUP = ['.s.s..', '..s.s.', 'cccccc', 'cccccch', 'cccccc.', '.cccc..'];
  var HANDICON = ['.w.w.w.', '.w.w.w.', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..'];

  function initGame() {
    tower = [];
    for (var r = 0; r < ROWS; r++) tower.push([1, 1, 1]);
    turn = 'you'; turnMax = 3.4; turnClock = turnMax; pulls = 0; cpuPulls = 0; bonus = 0; total = TIME_LIMIT;
    getReady = 0.8; halt = 0; gameDone = false; afterT = 0; sliding = null; rubble = []; culprit = null;
    cpuThink = 0; cpuPick = null; halfCheer = false; whyLost = ''; champ = false;
  }

  function rowStands(row) { return row[1] === 1 || (row[0] === 1 && row[2] === 1); }

  function wouldStand(r, i) {
    var row = tower[r].slice();
    row[i] = 0;
    return rowStands(row);
  }

  function removedCount() {
    var n = 0;
    for (var r = 0; r < ROWS; r++) for (var i = 0; i < 3; i++) if (!tower[r][i]) n++;
    return n;
  }

  function sway(r) { return Math.sin(game.time.elapsed * 2.2) * removedCount() * 0.6 * (r / ROWS); }

  function blockPos(r, i) {
    return { x: CX + (i - 1) * BW + sway(r), y: BASE_Y - (r + 1) * BH };
  }

  function safeList() {
    var out = [];
    for (var r = 0; r < ROWS - 1; r++) for (var i = 0; i < 3; i++) if (tower[r][i] && wouldStand(r, i)) out.push({ r: r, i: i });
    return out;
  }

  function blockAt(x, y) {
    for (var r = 0; r < ROWS; r++) for (var i = 0; i < 3; i++) {
      if (!tower[r][i]) continue;
      var p = blockPos(r, i);
      if (x > p.x - BW / 2 && x < p.x + BW / 2 && y > p.y && y < p.y + BH) return { r: r, i: i };
    }
    return null;
  }

  // 1本抜く(本番もデモもここを通る)。戻り値: 'safe' | 'fall' | 'locked'
  function pullBlock(r, i, who) {
    if (r >= ROWS - 1) return 'locked';
    var ok = wouldStand(r, i);
    var p = blockPos(r, i);
    tower[r][i] = 0;
    sliding = { x: p.x, y: p.y, t: 0, dir: who === 'you' ? -1 : 1 };
    if (!ok) {
      culprit = { x: p.x, y: p.y, t: 0 };
      for (var rr = r; rr < ROWS; rr++) for (var k = 0; k < 3; k++) {
        if (!tower[rr][k]) continue;
        var q = blockPos(rr, k);
        rubble.push({ x: q.x, y: q.y, vx: game.random(-320, 320), vy: game.random(-500, -100), row: rr });
        tower[rr][k] = 0;
      }
      return 'fall';
    }
    return 'safe';
  }

  function stepPieces(dt) {
    if (sliding) { sliding.t += dt; if (sliding.t > 0.4) sliding = null; }
    for (var i = 0; i < rubble.length; i++) { var b = rubble[i]; b.vy += 1900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
  }

  function closeGame(win, why) {
    if (gameDone) return;
    gameDone = true; champ = win; whyLost = why; afterT = 1.4;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.5);
  }

  function handOver() {
    turn = 'cpu'; cpuThink = 0.9; cpuPick = null;
  }

  function cpuStep(dt, live) {
    if (turn !== 'cpu' || sliding) return;
    if (!cpuPick) {
      var list = safeList();
      var sides = [];
      for (var i = 0; i < list.length; i++) if (list[i].i !== 1) sides.push(list[i]);
      var pool = sides.length ? sides : list;
      if (!pool.length) { if (live) closeGame(true, 'cpu'); return; }
      cpuPick = pool[Math.floor(game.random(0, pool.length))];
    }
    cpuThink -= dt;
    if (cpuThink <= 0) {
      pullBlock(cpuPick.r, cpuPick.i, 'cpu');
      cpuPulls++;
      game.audio.play('se_tap', 0.2);
      game.audio.tone('D4', 0.08, { wave: 'triangle', volume: 0.06 });
      turn = 'you';
      turnMax = Math.max(1.8, 3.4 - pulls * 0.25);
      turnClock = turnMax;
    }
  }

  game.onTap(function(x, y) {
    if (stage === S.ATTRACT) { game.audio.play('se_coin'); stage = S.PLAYING; initGame(); return; }
    if (stage === S.RESULT) { stage = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (gameDone) return;
    if (getReady > 0 || turn !== 'you' || sliding) {
      game.audio.play('se_tap', 0.1);
      game.fx.popup('…', x, y - 40, { color: V.ink, size: 30 });
      return;
    }
    var b = blockAt(x, y);
    if (!b) { game.audio.play('se_tap', 0.12); game.fx.burst(x, y, { color: V.wall, count: 3, speed: 80 }); return; }
    var p = blockPos(b.r, b.i);
    var res = pullBlock(b.r, b.i, 'you');
    if (res === 'locked') {
      game.feedback.bad(p.x, p.y, { text: 'MISS', color: V.danger, size: 34, count: 3, shake: 0 });
      return;
    }
    if (res === 'fall') {
      halt = 0.55;
      game.audio.play('se_break', 0.5);
      game.feedback.bad(p.x, p.y + BH / 2, { text: 'MISS', color: V.danger });
      game.fx.shake(16, 0.5);
      closeGame(false, 'fall');
      return;
    }
    pulls++;
    var quick = turnClock > turnMax * 0.5;
    bonus += Math.round(turnClock * 20);
    game.feedback.good(p.x, p.y, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? V.gold : V.you, size: 44 });
    if (!halfCheer && pulls === NEEDED / 2) {
      halfCheer = true;
      game.fx.popup('NICE', W / 2, H * 0.24, { color: V.gold, size: 70 });
      game.audio.play('se_milestone', 0.45);
    }
    if (pulls >= NEEDED) {
      halt = 0.35; culprit = { x: p.x, y: p.y, t: 0 };
      game.fx.burst(CX, BASE_Y - ROWS * BH, { color: V.gold, count: 28, speed: 440 });
      closeGame(true, 'win');
      return;
    }
    handOver();
  });

  // ---- 描画 ----
  function voxel(x, y, w, h, alt, alpha) {
    var f = alt ? V.faceB : V.face, t = alt ? V.topB : V.top, s = alt ? V.sideB : V.side;
    var a = alpha === undefined ? 1 : alpha;
    game.draw.rect(x - w / 2 + DEPTH, y - DEPTH, w, DEPTH, t, a);
    game.draw.rect(x + w / 2, y - DEPTH + 2, DEPTH, h, s, a);
    game.draw.rect(x - w / 2, y, w, h, f, a);
    game.draw.rect(x - w / 2, y, w, 3, V.ink, 0.35 * a);
    game.draw.rect(x - w / 2, y + h - 3, w, 3, V.ink, 0.35 * a);
    game.draw.rect(x - w / 2, y, 3, h, V.ink, 0.35 * a);
  }

  function cafe() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, V.cream], [0.55, V.wall], [1, '#b08a60']]);
    for (var s = 0; s < 3; s++) {
      var sy = 330 + s * 210;
      game.draw.rect(40, sy, 230, 18, V.shelf);
      game.draw.rect(W - 270, sy, 230, 18, V.shelf);
      for (var k = 0; k < 3; k++) {
        voxel(80 + k * 70, sy - 44, 40, 40, (k + s) % 2 === 0);
        voxel(W - 230 + k * 70, sy - 44, 40, 40, (k + s) % 2 === 1);
      }
    }
    // テーブル
    game.draw.rect(0, BASE_Y, W, 40, V.side);
    game.draw.rect(0, BASE_Y + 40, W, H - BASE_Y - 40, '#8a6242');
    for (var g = 0; g < 6; g++) game.draw.rect(0, BASE_Y + 80 + g * 90, W, 6, '#7a5436', 0.6);
    game.draw.sprite(CUP, { s: V.white, c: V.white, h: V.white }, W - 140, BASE_Y - 60, 12, { anchor: 'center' });
    game.draw.circle(W - 150 + Math.sin(t * 2) * 8, BASE_Y - 130 - (t * 40) % 60, 10, V.white, 0.4);
  }

  function drawTower() {
    var alive = rubble.length === 0;
    for (var r = 0; r < ROWS; r++) for (var i = 0; i < 3; i++) {
      var p = blockPos(r, i);
      if (!tower[r][i]) {
        if (alive) game.draw.rect(p.x - BW / 2 + 4, p.y + 4, BW - 14, BH - 12, V.ink, 0.6);
        continue;
      }
      voxel(p.x, p.y, BW - 6, BH - 4, r % 2 === 1);
      if (r === ROWS - 1) game.draw.rect(p.x - BW / 2 + 10, p.y + 18, BW - 26, 10, V.ink, 0.25);
    }
    if (sliding) {
      var k = sliding.t / 0.4;
      voxel(sliding.x + sliding.dir * k * 360, sliding.y + k * 60, BW - 6, BH - 4, false, 1 - k * 0.6);
    }
    for (var j = 0; j < rubble.length; j++) voxel(rubble[j].x, rubble[j].y, BW - 6, BH - 4, rubble[j].row % 2 === 1);
    if (culprit) {
      culprit.t += game.time.delta || 0.016;
      var g = 1 + Math.min(0.3, culprit.t);
      game.draw.rect(culprit.x - BW * g / 2, culprit.y - 6, BW * g, BH * g, V.white, Math.max(0, 0.8 - culprit.t));
    }
  }

  function drawPlayers() {
    var t = game.time.elapsed;
    var cpuOn = turn === 'cpu';
    var fr = cpuOn && Math.floor(t * 4) % 2 === 0 ? OWNER_B : OWNER_A;
    game.draw.sprite(fr, OWNER_PAL, W - 150, 250 + Math.sin(t * 2) * 5, 14, { anchor: 'center' });
    if (cpuOn && cpuPick) {
      var cp = blockPos(cpuPick.r, cpuPick.i);
      game.draw.sprite(HANDICON, { w: '#f2c79a' }, cp.x + BW / 2 + 40, cp.y + BH / 2, 8, { anchor: 'center', flipX: true });
    }
    // 手番の表示: 自分の手のマーク+持ち時間の輪
    var youOn = turn === 'you' && !gameDone;
    var ringX = W / 2, ringY = H * 0.86;
    game.draw.circle(ringX, ringY, 118, V.ink, 0.35);
    var frac = youOn ? turnClock / turnMax : 0;
    var hurry = youOn && turnClock < 1 && Math.floor(t * 10) % 2 === 0;
    for (var d = 0; d < 24; d++) {
      var ang = -1.5708 + d / 24 * 6.2832;
      var lit = d / 24 < frac;
      game.draw.circle(ringX + Math.cos(ang) * 100, ringY + Math.sin(ang) * 100, 12, lit ? (hurry ? V.danger : V.you) : '#6a5040');
    }
    game.draw.sprite(HANDICON, { w: youOn ? V.you : '#9a8a7a' }, ringX, ringY + (youOn ? Math.sin(t * 6) * 6 : 0), 16, { anchor: 'center' });
  }

  function drawHud() {
    draw(pulls + ' / ' + NEEDED, W / 2, 60, 46, V.ink);
    game.draw.rect(80, 108, W - 160, 22, V.ink, 0.4);
    var lowT = total < 6 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(84, 112, (W - 168) * Math.max(0, total / TIME_LIMIT), 14, lowT ? V.danger : V.gold);
    for (var i = 0; i < cpuPulls && i < 12; i++) voxel(W - 90 - (i % 6) * 30, 170 + Math.floor(i / 6) * 30, 22, 18, i % 2 === 0);
    for (var j = 0; j < pulls; j++) voxel(90 + j * 30, 170, 22, 18, j % 2 === 1);
  }

  // ---- ATTRACT: 本物の pullBlock() で 客→店主→客(要を抜いて崩す) ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false, act: 0, aim: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); getReady = 0; demo.act = 0; demo.aim = null;
      tower[2][0] = 0; tower[5][1] = 0; tower[7][2] = 0;
    }
    stepPieces(dt);
    cpuStep(dt, false);
    demo.press = false;
    if (turn === 'you' && !sliding && rubble.length === 0) {
      if (!demo.aim) {
        if (demo.act === 0) demo.aim = { r: 4, i: 0 };
        else if (demo.act === 1) demo.aim = { r: 5, i: 0 };
      }
      if (demo.aim) {
        var p = blockPos(demo.aim.r, demo.aim.i);
        demo.gx += (p.x - demo.gx) * Math.min(1, dt * 6);
        demo.gy += (p.y + BH / 2 - demo.gy) * Math.min(1, dt * 6);
        if (Math.hypot(demo.gx - p.x, demo.gy - p.y - BH / 2) < 14) {
          var res = pullBlock(demo.aim.r, demo.aim.i, 'you');
          demo.press = true; demo.act++; demo.aim = null;
          if (res === 'fall') { game.audio.play('se_break', 0.3); game.fx.shake(10, 0.4); }
          else { game.fx.burst(p.x, p.y, { color: V.you, count: 10, speed: 240 }); game.audio.play('se_good', 0.18); handOver(); }
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (stage === S.ATTRACT) {
      stepDemo(dt);
      cafe();
      drawTower();
      drawPlayers();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      draw(GAME_TITLE, W / 2, 80, 74, V.ink);
      draw('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 156, 34, V.danger);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) draw('► 100円 投入 ◄', W / 2, H * 0.965, 44, V.gold);
      else draw('INSERT COIN', W / 2, H * 0.965, 34, V.white);
      return;
    }

    if (stage === S.RESULT) {
      stepPieces(dt);
      cafe();
      drawTower();
      var sc = pulls * 100 + bonus;
      draw(champ ? 'CLEAR' : (whyLost === 'fall' ? 'GAME OVER' : 'TIME UP'), W / 2, 330, 90, champ ? V.you : V.danger);
      draw('SCORE ' + sc, W / 2, 430, 50, V.ink);
      draw(pulls + ' / ' + NEEDED, W / 2, 505, 40, V.ink);
      if (champ && sc >= game.best) draw('NEW RECORD', W / 2, 580, 50, V.gold);
      else draw('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 580, 36, V.ink);
      if (!champ) draw('あと' + (NEEDED - pulls) + '本!', W / 2, 660, 50, V.danger);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) draw('TAP TO CONTINUE', W / 2, H * 0.965, 34, V.white);
      return;
    }

    if (gameDone) {
      if (halt > 0) halt -= dt;
      else {
        stepPieces(dt);
        afterT -= dt;
        if (afterT <= 0) {
          stage = S.RESULT;
          var score = pulls * 100 + bonus;
          if (champ) game.end.success(score, { pulls: pulls, cpu: cpuPulls, bonus: bonus });
          else game.end.failure({ pulls: pulls, cpu: cpuPulls, bonus: bonus });
        }
      }
    } else if (getReady > 0) {
      getReady -= dt;
      if (getReady <= 0) game.audio.play('se_tap', 0.3);
    } else {
      total -= dt;
      stepPieces(dt);
      cpuStep(dt, true);
      if (turn === 'you' && !sliding) {
        var before = turnClock;
        turnClock -= dt;
        if (turnClock < 1 && Math.floor(before * 4) !== Math.floor(turnClock * 4)) game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.06 });
        if (turnClock <= 0) {
          turnClock = 0; halt = 0.45;
          culprit = { x: W / 2 - 60, y: H * 0.86 - 60, t: 0 };
          game.feedback.bad(W / 2, H * 0.8, { text: 'TIME UP', color: V.danger });
          closeGame(false, 'turn');
        }
      }
      if (!gameDone && total <= 0) {
        total = 0; halt = 0.45;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP', color: V.danger });
        closeGame(false, 'time');
      }
    }

    cafe();
    drawTower();
    drawPlayers();
    drawHud();
    if (getReady > 0) draw(getReady > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, V.danger);
  });

  game.onStart(function() {
    game.audio.melody([
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['Bb4', 0.5], ['G4', 0.5], ['E4', 1],
      ['F4', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1], [null, 1],
    ], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true, bass: [['F2', 2], ['C2', 2], ['Bb2', 2], ['C2', 2]] });
    stage = S.ATTRACT;
    initGame();
  });
})(game);
