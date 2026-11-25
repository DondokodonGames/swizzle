// J-N6434-0045-bathhouse-squirt-frog.js
// 湯船のかえる水てっぽう — 湯の流れに乗って横切る浮きおもちゃの帆を、水が届くまでの間を見越してねらい撃つ
// 操作: 撃ちたい場所をタップすると、手元のかえる水てっぽうから水が飛ぶ(届くまで少し時間がかかる)
// 終わり: 水タンクが空になる前に帆を8枚回せばCLEAR。水切れ/時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: bathhouse_squirt_frog
// 世界観: 閉店後の銭湯で番台の孫娘が、ゴムのかえる水てっぽうで湯船を流れる浮き舟の風車帆を撃って回し、明日の子ども湯の目玉となる的当ての腕を試す
// 残るもの: 正誤(CLEAR/GAME OVER) + 回した帆の数と命中率のスコア
// スタイル: HYPERCASUAL 3D
var STYLE = { bg: ['#f4f8fb', '#cfeaf5'], main: ['#3cb7e0', '#ffffff', '#e8eef2'], accent: ['#4bd36a', '#ff8a3d'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg1: '#f4f8fb', bg2: '#cfeaf5', water: '#3cb7e0', waterL: '#8fdaf2', tile: '#e8eef2', tileL: '#ffffff',
    frog: '#4bd36a', frogD: '#2f9c4a', orange: '#ff8a3d', gold: '#ffc93d', ink: '#27425a', red: '#ff5a5f', white: '#ffffff', shadow: '#9fb3c2',
  };

  var GAME_TITLE = 'SQUIRT FROG';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var TANK = 14;
  var NOZZLE_X = W * 0.5, NOZZLE_Y = H * 0.8;
  var FLIGHT = 0.26;
  var LANES = [H * 0.3, H * 0.44, H * 0.58];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FROG_A = [
    '.gg..gg.',
    'gwkggwkg',
    'gggggggg',
    'gggggggg',
    '.gppppg.',
    'gg....gg',
  ];
  var FROG_B = [
    '.gg..gg.',
    'gwkggwkg',
    'gggggggg',
    'ggggoggg',
    '.gppppg.',
    'g......g',
  ];
  var FROG_PAL = { g: C.frog, w: C.white, k: C.ink, p: C.frogD, o: C.orange };
  var BOAT = ['...m...', '..mmm..', '...s...', 'hhhhhhh', '.hhhhh.'];
  var BOAT_SPIN = ['.m...m.', '..m.m..', '...s...', 'hhhhhhh', '.hhhhh.'];
  var DUCK = ['..yy...', '.yyky..', '.yyyyoo', 'yyyyyy.', '.yyyy..'];
  var GIRL = ['..bbbb..', '.bbbbbb.', '.bffffb.', '..fkfk..', '..ffff..', '.pppppp.', 'pppppppp'];

  var boats, shots, drops, hits, used, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait, spawnT, combo, frogKick, nextMs;

  function initGame() {
    boats = []; shots = []; drops = [];
    hits = 0; used = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null;
    finished = false; ok = false; endWait = 0; spawnT = 0; combo = 0; frogKick = 0; nextMs = 4;
    for (var i = 0; i < 3; i++) addBoat(i, true);
  }

  function addBoat(lane, initial) {
    var dir = lane % 2 === 0 ? 1 : -1;
    var sp = (170 + lane * 60 + game.random(0, 70)) * (initial ? 1 : 1.15);
    var gold = !initial && game.random(0, 1) < 0.2;
    boats.push({
      lane: lane, x: initial ? game.random(W * 0.2, W * 0.8) : (dir > 0 ? -80 : W + 80), y: LANES[lane],
      vx: dir * sp * (gold ? 1.5 : 1), gold: gold, spun: 0, r: gold ? 58 : 72, flash: 0,
    });
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: C.shadow, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function fire(tx, ty, demoMode) {
    if (!demoMode && used >= TANK) return false;
    used++;
    frogKick = 0.15;
    shots.push({ tx: tx, ty: ty, t: 0 });
    game.audio.play('se_jump', 0.25);
    return true;
  }

  function resolveShot(sh, demoMode) {
    var hit = null;
    for (var i = 0; i < boats.length; i++) {
      var b = boats[i];
      if (b.spun > 0) continue;
      if (Math.hypot(b.x - sh.tx, b.y - 30 - sh.ty) < b.r + 26) { hit = b; break; }
    }
    for (var d = 0; d < 6; d++) drops.push({ x: sh.tx, y: sh.ty, vx: game.random(-260, 260), vy: game.random(-420, -120), life: 0.45 });
    if (hit) {
      var gain = hit.gold ? 2 : 1;
      hits += gain; combo++;
      hit.spun = 0.9; hit.flash = 0.25;
      game.audio.play('se_coin', 0.3);
      game.feedback.good(hit.x, hit.y - 90, { text: hit.gold ? 'x2' : (combo >= 3 ? 'PERFECT' : 'GOOD'), color: hit.gold ? C.gold : C.frog, count: 12 });
      if (!demoMode && hits >= nextMs && hits < NEEDED) {
        nextMs += 4;
        game.audio.play('se_milestone', 0.4);
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.orange, size: 64 });
      }
      if (!demoMode && hits >= NEEDED) { focus = hit; hitStop = 0.4; pendingEnd = 'clear'; finished = true; }
    } else {
      combo = 0;
      game.feedback.bad(sh.tx, sh.ty, { text: 'MISS', shake: 5, flashColor: '#9fd8ff' });
    }
    // 水切れ: 最後の一発が着いた時点で足りなければ終了
    if (!demoMode && !finished && used >= TANK && shots.length === 0 && hits < NEEDED) {
      focus = { tank: true }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
      game.audio.play('se_break', 0.4);
    }
  }

  function stepWorld(dt, demoMode) {
    frogKick = Math.max(0, frogKick - dt);
    for (var i = boats.length - 1; i >= 0; i--) {
      var b = boats[i];
      b.x += b.vx * dt;
      if (b.flash > 0) b.flash -= dt;
      if (b.spun > 0) { b.spun -= dt; if (b.spun <= 0) { boats.splice(i, 1); addBoat(b.lane, false); continue; } }
      if (b.x < -120 || b.x > W + 120) { boats.splice(i, 1); addBoat(b.lane, false); }
    }
    for (var s = shots.length - 1; s >= 0; s--) {
      var sh = shots[s];
      sh.t += dt;
      if (sh.t >= FLIGHT) { shots.splice(s, 1); resolveShot(sh, demoMode); }
    }
    for (var d = drops.length - 1; d >= 0; d--) {
      var dr = drops[d];
      dr.x += dr.vx * dt; dr.y += dr.vy * dt; dr.vy += 1400 * dt; dr.life -= dt;
      if (dr.life <= 0) drops.splice(d, 1);
    }
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.bg1], [0.2, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.water, pulse);
    // 壁のタイル
    for (var ty = H * 0.1; ty < H * 0.22; ty += 60) for (var tx = 0; tx < W; tx += 90) game.draw.rect(tx + 4, ty + 4, 82, 52, C.tileL, 0.8);
    // 湯船 (柔らかい影の丸い塊)
    game.draw.rect(40, H * 0.23 + 20, W - 80, H * 0.44, C.shadow, 0.35);
    game.draw.rect(30, H * 0.23, W - 60, H * 0.44, C.water);
    for (var r = 0; r < 3; r++) {
      var wy = LANES[r] + 26;
      for (var x = 40; x < W - 40; x += 60) {
        var wav = Math.sin(game.time.elapsed * 3 + x * 0.02 + r) * 8;
        game.draw.rect(x, wy + wav, 40, 10, C.waterL, 0.7);
      }
    }
    game.draw.rect(20, H * 0.67, W - 40, 40, C.tileL);
    game.draw.rect(20, H * 0.67 + 40, W - 40, 16, C.shadow, 0.5);
    // 湯気
    for (var st = 0; st < 5; st++) {
      var sy = H * 0.24 - ((game.time.elapsed * 60 + st * 70) % 200);
      game.draw.circle(W * (0.15 + st * 0.18) + Math.sin(game.time.elapsed + st) * 20, sy, 30, C.white, 0.35);
    }
  }

  function drawBoats() {
    for (var i = 0; i < boats.length; i++) {
      var b = boats[i];
      var bob = Math.sin(game.time.elapsed * 4 + b.x * 0.01) * 6;
      var hl = focus === b || b.flash > 0;
      game.draw.circle(b.x, b.y + 30, 60, C.shadow, 0.35);
      if (hl) game.draw.circle(b.x, b.y - 20, 110, C.white, 0.7);
      if (b.gold) {
        game.draw.sprite(DUCK, { y: C.gold, k: C.ink, o: C.orange }, b.x, b.y - 10 + bob, 20, { anchor: 'center', flipX: b.vx < 0 });
      } else {
        var art = b.spun > 0 && Math.floor(game.time.elapsed * 16) % 2 ? BOAT_SPIN : BOAT;
        var blink = b.spun <= 0 && Math.floor(game.time.elapsed * 4 + i) % 2 === 0;
        game.draw.sprite(art, { m: b.spun > 0 ? C.frog : (blink ? C.white : C.orange), s: C.ink, h: C.red }, b.x, b.y - 30 + bob, 20, { anchor: 'center' });
      }
    }
  }

  function drawShots() {
    for (var s = 0; s < shots.length; s++) {
      var sh = shots[s];
      var k = sh.t / FLIGHT;
      for (var j = 0; j < 6; j++) {
        var kk = Math.max(0, k - j * 0.05);
        var x = NOZZLE_X + (sh.tx - NOZZLE_X) * kk;
        var y = NOZZLE_Y - 60 + (sh.ty - NOZZLE_Y + 60) * kk - Math.sin(kk * Math.PI) * 120;
        game.draw.circle(x, y, 16 - j * 2, C.water, 0.9);
      }
      game.draw.circle(sh.tx, sh.ty, 40 + 20 * k, C.ink, 0.25);
    }
    for (var d = 0; d < drops.length; d++) game.draw.circle(drops[d].x, drops[d].y, 10, C.waterL);
  }

  function drawFrog(pose) {
    var bob = Math.sin(game.time.elapsed * 3.2) * 6;
    var sway = Math.cos(game.time.elapsed * 1.6) * 5;
    var art = frogKick > 0 ? FROG_B : FROG_A;
    game.draw.circle(NOZZLE_X, NOZZLE_Y + 70, 120, C.shadow, 0.35);
    if (pose === 'down') {
      game.draw.sprite(FROG_A, FROG_PAL, NOZZLE_X, NOZZLE_Y + 20, 20, { anchor: 'center', flipY: true });
    } else {
      var jump = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 7)) * 70 : 0;
      game.draw.sprite(art, FROG_PAL, NOZZLE_X + sway, NOZZLE_Y + bob + jump - (frogKick > 0 ? 14 : 0), 22, { anchor: 'center' });
    }
    game.draw.sprite(GIRL, { b: C.ink, f: '#ffd9b8', k: C.ink, p: C.orange }, W * 0.16 + sway, H * 0.88 + bob * 0.5, 14, { anchor: 'center' });
  }

  function drawTank() {
    var left = Math.max(0, TANK - used);
    var hl = focus && focus.tank;
    var x0 = W * 0.72, y0 = H * 0.86;
    if (hl) game.draw.circle(x0 + 110, y0 + 40, 170, C.white, 0.8);
    game.draw.rect(x0 - 10, y0 - 10, 240, 120, C.shadow, 0.4);
    for (var i = 0; i < TANK; i++) {
      var col = i < left ? C.water : C.tile;
      game.draw.rect(x0 + (i % 7) * 32, y0 + Math.floor(i / 7) * 52, 26, 44, col);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.09, C.white, 0.85);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(BOAT, { m: i < hits ? C.frog : C.tile, s: C.ink, h: i < hits ? C.red : C.shadow }, W * 0.07 + i * 70, H * 0.04, 7, { anchor: 'center' });
    }
    txt(hits + '/' + NEEDED, W * 0.85, H * 0.04, 54, C.ink);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(50, H * 0.078, W - 100, 16, C.tile);
    game.draw.rect(50, H * 0.078, (W - 100) * frac, 16, low ? C.red : C.frog);
  }

  // ── ATTRACTデモ: 先を読んで撃つ(成功)と、今の位置を撃って外す(失敗)を交互に ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false, next: 0.8, n: 0, tx: W / 2, ty: H * 0.5 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.next = 0.7; demo.n = 0; }
    stepWorld(dt, true);
    demo.next -= dt;
    var tgt = null;
    for (var i = 0; i < boats.length; i++) {
      var b = boats[i];
      if (b.spun > 0 || b.x < W * 0.15 || b.x > W * 0.85) continue;
      if (!tgt || Math.abs(b.x - W / 2) < Math.abs(tgt.x - W / 2)) tgt = b;
    }
    if (tgt) {
      var lead = demo.n % 4 === 3 ? 0 : FLIGHT;
      demo.tx = tgt.x + tgt.vx * lead * (demo.n % 4 === 3 ? -1.2 : 1);
      demo.ty = tgt.y - 30;
    }
    demo.gx += (demo.tx - demo.gx) * Math.min(1, dt * 10);
    demo.gy += (demo.ty - demo.gy) * Math.min(1, dt * 10);
    demo.press = demo.next < 0.12;
    if (demo.next <= 0 && tgt) {
      demo.next = 0.75; demo.n++;
      fire(demo.gx, demo.gy, true);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || finished || ready > 0.3) return;
    if (fire(x, Math.min(y, H * 0.66), false)) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(NOZZLE_X, NOZZLE_Y - 60, { color: C.waterL, count: 4, speed: 180 });
    } else {
      game.audio.tone('C3', 0.1, { wave: 'square', volume: 0.08 });
    }
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: C.frog, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(W / 2, H * 0.5, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  function scoreNow() { return hits * 100 + Math.round((used > 0 ? hits / used : 0) * 100); }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.5);

    if (state === S.ATTRACT) {
      if (boats === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawBoats();
      drawShots();
      drawFrog('');
      drawTank();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.white, 0.85);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.frog);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.orange);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawBoats();
      drawFrog(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.35, { color: C.water, count: 4 });
      game.draw.rect(0, H * 0.24, W, H * 0.3, C.white, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 100, ok ? C.frog : C.red);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.36, 58, C.ink);
      txt(hits + '/' + NEEDED, W / 2, H * 0.41, 46, C.ink);
      if (ok && scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.47, 50, C.orange);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.47, 42, C.ink);
      if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '枚!', W / 2, H * 0.515, 44, C.orange);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(scoreNow(), { hits: hits, shots: used });
        else game.end.failure({ hits: hits, shots: used });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = null;
        game.fx.popup('TIME UP', W / 2, H * 0.45, { color: C.red, size: 80 });
      }
    }

    drawBg(pulse);
    drawBoats();
    drawShots();
    drawFrog('');
    drawTank();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.orange);
  });

  game.onStart(function() {
    game.audio.melody([
      ['F5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['F5', 0.5], ['E5', 0.5], ['G5', 0.5], ['F5', 1.5], [0, 0.5],
    ], { tempo: 132, wave: 'triangle', volume: 0.07, loop: true, bass: [['F2', 2], ['C3', 2], ['Bb2', 2], ['F2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
