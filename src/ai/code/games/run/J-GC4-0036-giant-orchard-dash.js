// J-GC4-0036-giant-orchard-dash.js
// 大果樹の並木道 — 熟れて落ちる巨大な果実の影を読み、3車線を切り替えて丘の蜜蔵まで駆け抜ける
// 操作: 画面の左半分タップ/左スワイプで左の車線へ、右半分タップ/右スワイプで右の車線へ
// 終わり: 一度も果実に当たらず時間いっぱい走り切ればCLEAR。果実に当たったらGAME OVER
// @mechanic: camera_run
// @theme: giant_orchard_avenue_run
// 世界観: 巣箱を抱えた蜂飼いの子が、熟れすぎた巨大果実がどさりと落ちる大果樹の並木道を、影を頼りに車線を選んで丘の上の蜜蔵まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破距離・よけた果実の数・拾った金の花粉
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 地平線へ収束する床を横ストリップで圧縮して塗る。少色+地平グラデ
  var STYLE = { bg: ['#f7c873', '#a6d6e8', '#5c9e3e'], main: ['#c9a36a', '#8a6a3e', '#3f7a2b'], accent: ['#e8412e', '#ffd84a'] };
  var C = {
    sky1: '#7fc4e0', sky2: '#f6d492', hill: '#6aa84f', hill2: '#4c8a39',
    road1: '#c9a36a', road2: '#b48c55', grass1: '#5c9e3e', grass2: '#4f8c34', edge: '#fff2c4',
    shadow: '#1d2a10', gold: '#ffd84a', red: '#e8412e', ink: '#2b1d0e', white: '#fffdf2', bad: '#ff4f3a', good: '#9cf06a'
  };

  var GAME_TITLE = 'ORCHARD DASH';
  var TIME_LIMIT = 20;
  var HORIZON = H * 0.3;
  var BASE_Y = H * 0.8;
  var LANE_W = 330;
  var ROAD_HALF = 560;
  var K = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, lane, laneX, fruits, spawnT, speed, scroll, dodged, pollen, hitFruit,
    hitStop, outro, ok, halfShown, runT, trees;

  // ── sprites ───────────────────────────────────────────────────────
  var RUNNER = [
    ['...hh...', '..hhhh..', '..ffff..', '.bbbbbb.', 'bbyyyybb', '.byyyyb.', '..pp.p..', '.pp...p.'],
    ['...hh...', '..hhhh..', '..ffff..', '.bbbbbb.', 'bbyyyybb', '.byyyyb.', '..p.pp..', '.p...pp.']
  ];
  var RUN_PAL = { h: '#6b3d1c', f: '#f2c396', b: '#3b6fb6', y: '#f2b52a', p: '#2b1d0e' };
  var FRUIT_A = ['...gg...', '..gg....', '.rrrrrr.', 'rrrrwrrr', 'rrrrrwrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..'];
  var FRUIT_B = ['....g...', '...gg...', '.oooooo.', 'oooooowo', 'oooooooo', 'oooooooo', '.oooooo.', '..oooo..'];
  var FRUIT_PAL_A = { g: '#3f8a2a', r: C.red, w: '#ffc2b0' };
  var FRUIT_PAL_B = { g: '#3f8a2a', o: '#f28b1f', w: '#ffe0a8' };
  var POLLEN = [['.y.', 'yyy', '.y.'], ['y.y', '.y.', 'y.y']];
  var TREE = ['..lll..', '.lllll.', 'lllrlll', 'llllll.', '.lllll.', '...t...', '...t...', '..ttt..'];
  var TREE_PAL = { l: '#3f7a2b', r: C.red, t: '#6b4a24' };
  var ARROW_L = ['...a', '..aa', '.aaa', 'aaaa', '.aaa', '..aa', '...a'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: '#2b1d0e', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 床に落ちる楕円の影(横ストリップで塗る)
  function flatShadow(x, y, rx, ry, alpha) {
    var n = 6;
    for (var i = 0; i < n; i++) {
      var k = (i + 0.5) / n * 2 - 1;
      var w = rx * Math.sqrt(1 - k * k);
      game.draw.rect(x - w, y + k * ry - ry / n, w * 2, (ry * 2) / n + 1, C.shadow, alpha);
    }
  }

  function proj(z) { return 1 / (1 + Math.max(0, z) * K); }
  function laneOffset(l) { return (l - 1) * LANE_W; }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; lane = 1; laneX = 0;
    fruits = []; spawnT = 0.9; speed = 0.5; scroll = 0; dodged = 0; pollen = 0; hitFruit = null;
    hitStop = 0; outro = 0; ok = false; halfShown = false; runT = 0;
    trees = [];
    for (var i = 0; i < 6; i++) trees.push({ z: i / 6, side: i % 2 ? 1 : -1 });
  }

  function spawnWave() {
    // 後半ほど2個同時(必ず1車線は空ける)
    var two = runT > 7 && Math.random() < Math.min(0.7, (runT - 7) * 0.08);
    var free = Math.floor(game.random(0, 3)) % 3;
    if (two) {
      for (var l = 0; l < 3; l++) {
        if (l !== free) fruits.push({ lane: l, z: 1.05, landZ: game.random(0.3, 0.55), kind: l % 2, landed: false, passed: false, gold: false });
      }
    } else {
      var one = (free + 1 + Math.floor(game.random(0, 2))) % 3;
      fruits.push({ lane: one, z: 1.05, landZ: game.random(0.3, 0.55), kind: Math.random() < 0.5 ? 0 : 1, landed: false, passed: false, gold: false });
    }
    if (Math.random() < 0.35) fruits.push({ lane: free, z: 1.2, landZ: 2, kind: 2, landed: true, passed: false, gold: true });
  }

  function moveLane(dir) {
    var nl = Math.max(0, Math.min(2, lane + dir));
    if (nl === lane) {
      game.audio.tone('C3', 0.06, { wave: 'square', volume: 0.06 });
      game.fx.shake(4, 0.08);
      return false;
    }
    lane = nl;
    game.audio.play('se_jump', 0.3);
    return true;
  }

  function stepWorld(dt, isDemo) {
    runT += dt;
    speed = 0.5 + Math.min(0.55, runT * 0.028);
    scroll += speed * dt * 10;
    var targetX = laneOffset(lane);
    laneX += (targetX - laneX) * Math.min(1, dt * 14);
    spawnT -= dt;
    if (spawnT <= 0) { spawnWave(); spawnT = Math.max(0.55, 1.15 - runT * 0.03); }
    for (var ti = 0; ti < trees.length; ti++) {
      trees[ti].z -= speed * dt;
      if (trees[ti].z < -0.05) trees[ti].z += 1;
    }
    for (var i = fruits.length - 1; i >= 0; i--) {
      var f = fruits[i];
      var wasAir = !f.landed;
      f.z -= speed * dt;
      if (wasAir && f.z <= f.landZ) {
        f.landed = true;
        if (!isDemo) { game.audio.play('se_break', 0.25); game.fx.shake(6, 0.12); }
      }
      if (!f.passed && f.z < 0.035) {
        f.passed = true;
        var dx = Math.abs(laneOffset(f.lane) - laneX);
        if (dx < LANE_W * 0.55) {
          if (f.gold) {
            if (!isDemo) { pollen++; game.audio.play('se_coin', 0.45); game.fx.popup('+1', W / 2 + laneX, BASE_Y - 200, { color: C.gold, size: 50 }); }
            fruits.splice(i, 1);
            continue;
          }
          if (!isDemo) { hit(f); return; }
          else game.fx.burst(W / 2 + laneX, BASE_Y - 100, { color: C.red, count: 6, speed: 200 });
        } else if (!f.gold && !isDemo) {
          dodged++;
          if (dx < LANE_W * 1.2) game.fx.popup('NICE', W / 2 + laneOffset(f.lane), BASE_Y - 220, { color: C.good, size: 40 });
        }
      }
      if (f.z < -0.2) fruits.splice(i, 1);
    }
  }

  function hit(f) {
    hitFruit = f; phase = 'stop'; hitStop = 0.55; ok = false;
    game.audio.stopBgm();
    game.fx.flash('#ffffff', 0.2);
    game.feedback.bad(W / 2 + laneX, BASE_Y - 160, { text: 'MISS' });
    game.audio.play('se_failure', 0.6);
  }

  function clear() {
    phase = 'stop'; hitStop = 0.5; ok = true; hitFruit = null;
    game.audio.stopBgm();
    game.feedback.good(W / 2 + laneX, BASE_Y - 220, { text: 'CLEAR', color: C.gold, count: 26 });
    game.audio.play('se_success', 0.6);
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'run') return;
    var moved = moveLane(x < W / 2 ? -1 : 1);
    if (moved) game.fx.burst(x, y, { color: C.edge, count: 5, speed: 160 });
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || phase !== 'run') return;
    if (dir === 'left' || dir === 'right') {
      moveLane(dir === 'left' ? -1 : 1);
    } else {
      game.audio.play('se_tap', 0.2);
    }
  });

  // ── demo(実ロジックで走り、影を見て車線を変える)──────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { fruits = []; runT = 2; spawnT = 0.4; lane = 1; }
    stepWorld(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.25;
    if (demo.cool <= 0) {
      // 近い脅威が自分の車線にあれば、空いている方へ
      var danger = false;
      for (var i = 0; i < fruits.length; i++) {
        var f = fruits[i];
        if (!f.gold && f.lane === lane && f.z < 0.45 && f.z > 0.05) danger = true;
      }
      if (danger) {
        var best = lane, bestD = -1;
        for (var l = 0; l < 3; l++) {
          if (Math.abs(l - lane) !== 1) continue;
          var nearest = 9;
          for (var j = 0; j < fruits.length; j++) if (!fruits[j].gold && fruits[j].lane === l && fruits[j].z > 0) nearest = Math.min(nearest, fruits[j].z);
          if (nearest > bestD) { bestD = nearest; best = l; }
        }
        var dir = best < lane ? -1 : 1;
        demo.gx = dir < 0 ? W * 0.22 : W * 0.78; demo.gy = H * 0.9;
        lane = best; demo.cool = 0.5;
        game.audio.play('se_tap', 0.12);
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HORIZON, [[0, C.sky1], [1, C.sky2]]);
    // 遠景の丘(ゆっくり揺れる)
    for (var hx = 0; hx < W; hx += 12) {
      var hh = 60 + Math.sin(hx * 0.006 + 1) * 40 + Math.sin(hx * 0.017) * 16;
      game.draw.rect(hx, HORIZON - hh, 12, hh, C.hill);
    }
    game.draw.rect(W * 0.7, HORIZON - 150, 90, 70, '#b5552e');   // 丘の上の蜜蔵
    game.draw.rect(W * 0.7 - 10, HORIZON - 170, 110, 24, '#7a3418');
    // 床: 横ストリップを奥ほど圧縮
    for (var y = HORIZON; y < H; y += 6) {
      var s = (y - HORIZON) / (BASE_Y - HORIZON);
      if (s <= 0.01) s = 0.01;
      var z = (1 / s - 1) / K;
      var band = Math.floor(z * 14 + scroll) % 2 === 0;
      game.draw.rect(0, y, W, 6, band ? C.grass1 : C.grass2);
      var half = ROAD_HALF * s;
      game.draw.rect(W / 2 - half, y, half * 2, 6, band ? C.road1 : C.road2);
      game.draw.rect(W / 2 - half - 10 * s, y, 10 * s + 1, 6, C.edge);
      game.draw.rect(W / 2 + half, y, 10 * s + 1, 6, C.edge);
      if (band) {
        game.draw.rect(W / 2 - LANE_W * 0.5 * s - 3 * s, y, 6 * s + 1, 6, C.edge, 0.7);
        game.draw.rect(W / 2 + LANE_W * 0.5 * s - 3 * s, y, 6 * s + 1, 6, C.edge, 0.7);
      }
    }
    game.draw.rect(0, 0, W, H, '#fff6d8', 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function drawTrees() {
    var sorted = trees.slice().sort(function(a, b) { return b.z - a.z; });
    for (var i = 0; i < sorted.length; i++) {
      var tr = sorted[i];
      var s = proj(tr.z);
      var x = W / 2 + tr.side * (ROAD_HALF + 220) * s;
      var y = HORIZON + (BASE_Y - HORIZON) * s;
      var sway = Math.sin(game.time.elapsed * 1.5 + i) * 4 * s;
      game.draw.sprite(TREE, TREE_PAL, x + sway, y - 4 * 44 * s, Math.max(2, 44 * s), { anchor: 'center' });
    }
  }

  function drawFruits() {
    var sorted = fruits.slice().sort(function(a, b) { return b.z - a.z; });
    for (var i = 0; i < sorted.length; i++) {
      var f = sorted[i];
      if (f.z < -0.1) continue;
      var s = proj(f.z);
      var x = W / 2 + laneOffset(f.lane) * s;
      var y = HORIZON + (BASE_Y - HORIZON) * s;
      if (f.gold) {
        var pf = POLLEN[Math.floor(game.time.elapsed * 6) % 2];
        game.draw.sprite(pf, { y: C.gold }, x, y - 60 * s - Math.sin(game.time.elapsed * 5) * 10 * s, Math.max(2, 26 * s), { anchor: 'center' });
        continue;
      }
      var size = 46 * s;
      var alt = f.landed ? 0 : (f.z - f.landZ) * 2400 * s;
      // 影(落下地点の予告): 高いほど小さく濃く点滅
      var blink = !f.landed && Math.floor(game.time.elapsed * 10) % 2 === 0;
      var shR = size * 4.6 * (f.landed ? 1 : 0.6 + 0.4 * (1 - Math.min(1, alt / 900)));
      flatShadow(x, y, shR, shR * 0.32, blink ? 0.55 : 0.35);
      var spr = f.kind === 0 ? FRUIT_A : FRUIT_B;
      var pal = f.kind === 0 ? FRUIT_PAL_A : FRUIT_PAL_B;
      var isHit = hitFruit === f;
      var scale = size * (isHit ? 1.35 : 1);
      if (y - alt - 4 * scale > -200) game.draw.sprite(spr, pal, x, y - alt - 4 * scale, scale, { anchor: 'center' });
      if (isHit && Math.floor(game.time.elapsed * 14) % 2 === 0) game.draw.circle(x, y - 4 * scale, 5 * scale, '#ffffff', 0.6);
    }
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var fr = RUNNER[Math.floor(t * 9) % 2];
    var bob = Math.abs(Math.sin(t * 9)) * 14;
    var x = W / 2 + laneX;
    flatShadow(x, BASE_Y + 4, 80, 18, 0.3);
    game.draw.sprite(fr, RUN_PAL, x, BASE_Y - 90 - bob, 22, { anchor: 'center', flipX: Math.sin(t * 2) > 0.9 });
  }

  function drawPads() {
    var t = game.time.elapsed;
    var pulse = 0.35 + 0.15 * Math.sin(t * 4);
    game.draw.sprite(ARROW_L, { a: C.white }, W * 0.12, H * 0.9, 16, { anchor: 'center', alpha: pulse });
    game.draw.sprite(ARROW_L, { a: C.white }, W * 0.88, H * 0.9, 16, { anchor: 'center', alpha: pulse, flipX: true });
  }

  function drawHud() {
    var progress = Math.min(1, 1 - timeLeft / TIME_LIMIT);
    game.draw.rect(0, 0, W, 220, '#2b1d0e', 0.35);
    txt(Math.round(progress * 100) + '%', 70, 80, 52, C.white, 'left');
    txt(String(dodged), W / 2, 80, 60, C.gold);
    game.draw.sprite(POLLEN[0], { y: C.gold }, W - 200, 80, 12, { anchor: 'center' });
    txt('x' + pollen, W - 130, 80, 44, C.gold, 'left');
    game.draw.rect(60, 160, W - 120, 22, '#2b1d0e', 0.6);
    game.draw.rect(60, 160, (W - 120) * progress, 22, timeLeft < 4 ? C.good : C.gold);
    game.draw.sprite(RUNNER[0], RUN_PAL, 60 + (W - 120) * progress, 150, 4, { anchor: 'center' });
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawTrees(); drawFruits(); drawRunner(); drawPads();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.14, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawTrees(); drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'run'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'run') {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (phase === 'run' && !halfShown && timeLeft <= TIME_LIMIT / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('50%', W / 2, H * 0.22, { color: C.gold, size: 72 });
      }
      if (phase === 'run' && timeLeft <= 0) { timeLeft = 0; clear(); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = dodged * 10 + pollen * 30;
        var stats = { dodged: dodged, pollen: pollen, percent: Math.round((TIME_LIMIT - timeLeft) / TIME_LIMIT * 100) };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawTrees(); drawFruits(); drawRunner(); drawPads(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.38, W, H * 0.2, '#2b1d0e', 0.55);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.43, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (dodged * 10 + pollen * 30), W / 2, H * 0.5, 44, C.white);
      var pct = Math.round((TIME_LIMIT - timeLeft) / TIME_LIMIT * 100);
      if (ok && dodged * 10 + pollen * 30 > game.best) txt('NEW RECORD', W / 2, H * 0.55, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!  ' + pct + '%', W / 2, H * 0.55, 40, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.55, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1]
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['C3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
