// J-N6424-0024-deepwreck-claw-salvage.js
// ディープレック・クロウサルベージ — 沈没船から漂う財宝だけを見極めて鉤爪を撃ち込み回収する
// 操作: 漂う獲物をタップすると狙った座標へ鉤爪が伸びる。宝箱に当てれば回収、岩に当てれば失敗
// 終わり: 規定個数の財宝を回収できれば成功。3回岩を掴む/時間切れで失敗
// @mechanic: aim_shoot
// @theme: deepwreck_claw_salvage
// 世界観: 深海探査船のクレーン操縦士が、沈没船の周りを漂う財宝だけを見極めて鉤爪を撃ち込み回収する
// 残るもの: 正誤(CLEAR/GAME OVER) + 回収した財宝数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面を色分けした平板ポリゴン感、輪郭は太め
  var C = {
    bg: '#0a3a52', bg2: '#031a28', water: '#0f5a78', wreck: '#2a3a3a',
    treasure: '#ffd23f', treasureDark: '#c79a1e', rock: '#5a5248', rockDark: '#332e28',
    claw: '#c0392b', clawArm: '#8a8478', good: '#39c96a', bad: '#ff4d5e',
    gold: '#ffd23f', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'CLAW SALVAGE';
  var NEED = 6;
  var MAX_MISS = 3;
  var MAX_TIME = 16;
  var CRANE_X = W * 0.5, CRANE_Y = H * 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#031a28', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_CRANE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.water, pulse * 0.3);
    game.draw.rect(W * 0.1, H * 0.72, W * 0.8, H * 0.1, C.wreck);
    game.draw.sprite(DIVER_CRANE, { '#': C.claw }, CRANE_X, CRANE_Y - 40, 10, { anchor: 'center' });
  }

  var items, hits, misses, halfCalled, roundClock;
  var done, endWait, finished, ready, hitStop, shake;
  var claw;

  function spawnItem() {
    var isTreasure = Math.random() < 0.55;
    var x = W * 0.18 + Math.random() * W * 0.64;
    var y = H * 0.42 + Math.random() * H * 0.24;
    var dir = Math.random() < 0.5 ? -1 : 1;
    return { x: x, y: y, type: isTreasure ? 'treasure' : 'rock', dir: dir, dead: false, t: Math.random() * 10 };
  }

  function initGame() {
    items = []; for (var i = 0; i < 5; i++) items.push(spawnItem());
    hits = 0; misses = 0; halfCalled = false; roundClock = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    claw = { active: false, x: CRANE_X, y: CRANE_Y, tx: CRANE_X, ty: CRANE_Y, t: 0 };
  }

  function drawItems(list) {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.dead) continue;
      if (it.type === 'treasure') {
        var glow = 0.5 + 0.3 * Math.sin(game.time.elapsed * 4 + it.t);
        game.draw.circle(it.x, it.y, 46, C.treasureDark);
        game.draw.circle(it.x, it.y, 34, C.treasure, 0.85 + glow * 0.15);
      } else {
        game.draw.circle(it.x, it.y, 42, C.rockDark);
        game.draw.circle(it.x, it.y, 30, C.rock);
      }
    }
    game.draw.line(CRANE_X, CRANE_Y, claw.x, claw.y, C.clawArm, 8);
    game.draw.circle(claw.x, claw.y, 20, C.claw);
  }

  function fireClaw(x, y) {
    if (finished || ready > 0 || claw.active) return;
    claw.active = true; claw.t = 0; claw.tx = x; claw.ty = y; claw.x = CRANE_X; claw.y = CRANE_Y;
    game.audio.play('se_tap', 0.2);
  }

  function resolveClaw() {
    var best = null, bd = 70;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead) continue;
      var dist = Math.hypot(it.x - claw.tx, it.y - claw.ty);
      if (dist < bd) { bd = dist; best = it; }
    }
    claw.active = false; claw.x = CRANE_X; claw.y = CRANE_Y;
    if (!best) {
      game.feedback.bad(claw.tx, claw.ty, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      return;
    }
    best.dead = true;
    if (best.type === 'treasure') {
      hits++;
      game.feedback.good(best.x, best.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      game.fx.burst(best.x, best.y, { color: C.gold, count: 16, speed: 340 });
      if (!halfCalled && hits >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', best.x, best.y - 70, { color: C.gold, size: 32 }); }
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(best.x, best.y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
    } else {
      misses++;
      hitStop = 0.3; shake = 0.25;
      game.fx.flash(C.bad, 0.15);
      game.feedback.bad(best.x, best.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      if (misses >= MAX_MISS) { finished = true; ok = false; finish(); return; }
    }
    items.push(spawnItem());
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) fireClaw(x, y);
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepItems(dt) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead) continue;
      it.x += it.dir * 60 * dt;
      if (it.x < W * 0.14 || it.x > W * 0.86) it.dir *= -1;
    }
  }

  function stepClaw(dt) {
    if (!claw.active) return;
    claw.t += dt;
    var travel = Math.min(1, claw.t / 0.28);
    claw.x = CRANE_X + (claw.tx - CRANE_X) * travel;
    claw.y = CRANE_Y + (claw.ty - CRANE_Y) * travel;
    if (travel >= 1) resolveClaw();
  }

  var demo = { t: 0, gx: CRANE_X, gy: CRANE_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepItems(dt);
    stepClaw(dt);
    if (!claw.active && Math.floor(cyc / 1.6) !== demo.lastShot) {
      demo.lastShot = Math.floor(cyc / 1.6);
      var target = null;
      for (var i = 0; i < items.length; i++) { if (items[i].type === 'treasure' && !items[i].dead) { target = items[i]; break; } }
      if (target) { demo.gx = target.x; demo.gy = target.y; fireClaw(target.x, target.y); demo.press = true; }
    } else {
      demo.press = claw.active;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      bg();
      drawItems(items);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawItems(items);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '個!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepItems(dt); stepClaw(dt);
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false;
        game.feedback.bad(CRANE_X, CRANE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawItems(items);
    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 26, C.ink);
    txt('MISS ' + misses + '/' + MAX_MISS, W * 0.84, H * 0.06, 18, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.35], ['F3', 0.35], ['A3', 0.35], ['D4', 0.6]], { tempo: 100, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
