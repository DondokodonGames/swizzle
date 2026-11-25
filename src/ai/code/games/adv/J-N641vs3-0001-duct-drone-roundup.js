// J-N641vs3-0001-duct-drone-roundup.js
// ダクト・ドローン・ラウンドアップ — 保守ロボットが通気ダクトの中を逃げ回る点検ドローンを追い、制限時間内に全機拿捕する
// 操作: 画面をタップした位置へ保守ロボットが移動する。ドローンに触れると拿捕
// 終わり: 制限時間内に全ドローンを拿捕すれば成功。時間切れで未拿捕が残ればGAME OVER
// @mechanic: chase
// @theme: duct_drone_roundup
// 世界観: 保守用ダクト網に紛れ込んだ小型整備ロボットが、逃げ回る不審な点検ドローンたちを制限時間内に全機拿捕し、ダクト内を掃討する
// 残るもの: 正誤(CLEAR/GAME OVER) + 拿捕数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: くすんだグリーン単色系モノクロモニタ、走査線
  var C = {
    bg: '#0a1a0a', bg2: '#122912', duct: '#1f3d1f', ductEdge: '#2f5c2f',
    bot: '#8fff8f', botDark: '#3a8a3a', drone: '#ffcf3a', droneDark: '#a5820a',
    good: '#8fff8f', bad: '#ff5c5c', gold: '#ffcf3a', white: '#eaffea',
  };

  var GAME_TITLE = 'DUCT ROUNDUP';
  var TIME_LIMIT = 20;
  var DRONE_COUNT = 3;
  var BOT_SPEED = 640;
  var CATCH_R = 70;
  var ARENA_R = 430;
  var CX = W * 0.5, CY = H * 0.48;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var DRONE_SPRITE = ['#.#', '###', '#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, CY, ARENA_R, C.duct, 0.5);
    game.draw.circle(CX, CY, ARENA_R, C.ductEdge, 0);
    var t = game.time.elapsed;
    for (var i = 0; i < 8; i++) {
      var yy = ((t * 90 + i * 90) % H);
      game.draw.rect(0, yy, W, 2, C.ductEdge, 0.25);
    }
  }

  var botX, botY, botTX, botTY, drones, caught, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function clampArena(x, y) {
    var dx = x - CX, dy = y - CY;
    var d = Math.hypot(dx, dy);
    if (d > ARENA_R - 40) {
      var s = (ARENA_R - 40) / d;
      return { x: CX + dx * s, y: CY + dy * s };
    }
    return { x: x, y: y };
  }

  function spawnDrones() {
    var list = [];
    for (var i = 0; i < DRONE_COUNT; i++) {
      var ang = (i / DRONE_COUNT) * Math.PI * 2 + game.random(0, 0.6);
      list.push({ x: CX + Math.cos(ang) * 260, y: CY + Math.sin(ang) * 220, caught: false, bob: game.random(0, 6) });
    }
    return list;
  }

  function initGame() {
    botX = CX; botY = CY + 300; botTX = botX; botTY = botY;
    drones = spawnDrones(); caught = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      if (d.caught) continue;
      var bob = Math.sin(game.time.elapsed * 4 + d.bob) * 5;
      game.draw.sprite(DRONE_SPRITE, { '#': C.drone }, d.x, d.y + bob, 20, { anchor: 'center' });
    }
    game.draw.sprite(BOT_SPRITE, { '#': C.bot }, botX, botY, 24, { anchor: 'center' });
  }

  function tryCatch() {
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      if (d.caught) continue;
      if (Math.hypot(botX - d.x, botY - d.y) < CATCH_R) {
        d.caught = true; caught++;
        game.feedback.good(d.x, d.y, { text: 'GOOD', color: C.good });
        game.fx.burst(d.x, d.y, { color: C.gold, count: 14, speed: 300 });
        game.audio.play('se_good', 0.35);
        if (caught === DRONE_COUNT - 1) game.fx.popup('NICE', CX, CY - 260, { color: C.gold, size: 32 });
        if (caught >= DRONE_COUNT) {
          finished = true; ok = true;
          game.feedback.good(botX, botY, { text: 'CLEAR', color: C.good });
          game.audio.play('se_success', 0.5);
          finish();
        }
        return true;
      }
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var p = clampArena(x, y);
      botTX = p.x; botTY = p.y;
      game.audio.play('se_tap', 0.08);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepDrones(dt) {
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      if (d.caught) continue;
      var dx = d.x - botX, dy = d.y - botY;
      var dist = Math.hypot(dx, dy) || 1;
      var flee = dist < 340;
      var wx = Math.cos(game.time.elapsed * 1.3 + i * 2) * 40;
      var wy = Math.sin(game.time.elapsed * 1.1 + i * 3) * 40;
      var tx = flee ? d.x + (dx / dist) * 90 : CX + wx;
      var ty = flee ? d.y + (dy / dist) * 90 : CY + wy;
      var p = clampArena(tx, ty);
      d.x += (p.x - d.x) * Math.min(1, dt * (flee ? 4 : 1.2));
      d.y += (p.y - d.y) * Math.min(1, dt * (flee ? 4 : 1.2));
    }
  }

  function stepRound(dt) {
    roundClock += dt;
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) { halfCalled = true; }
    var dx = botTX - botX, dy = botTY - botY;
    var dist = Math.hypot(dx, dy);
    if (dist > 4) {
      var step = Math.min(dist, BOT_SPEED * dt);
      botX += (dx / dist) * step;
      botY += (dy / dist) * step;
    }
    stepDrones(dt);
    tryCatch();
    if (roundClock >= TIME_LIMIT) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(botX, botY, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var alive = null;
    for (var i = 0; i < drones.length; i++) if (!drones[i].caught) { alive = drones[i]; break; }
    if (alive) {
      botTX = alive.x; botTY = alive.y;
      demo.gx = alive.x; demo.gy = alive.y; demo.press = true;
    }
    var dx = botTX - botX, dy = botTY - botY;
    var dist = Math.hypot(dx, dy);
    if (dist > 4) {
      var step = Math.min(dist, BOT_SPEED * dt * 0.7);
      botX += (dx / dist) * step;
      botY += (dy / dist) * step;
    }
    stepDrones(dt);
    tryCatch();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (botX === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 34, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(caught + ' / ' + DRONE_COUNT, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, DRONE_COUNT - caught) + '機!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught });
        else game.end.failure({ caught: caught });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(caught + ' / ' + DRONE_COUNT, W * 0.5, H * 0.07, 30, C.white);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#2f5c2f', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['D4', 0.2], ['F4', 0.2], ['G4', 0.4]], { tempo: 135, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
