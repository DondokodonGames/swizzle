// D-20172021-0012-target-wheel-throw.js
// ターゲットホイール・スロー — 回転する的に狙いを定めてブレードを投げ込み、刺さった跡を避けて命中させる
// 操作: 回転する的の頂点にある照準に合わせてタップし、まだ何も刺さっていない場所へブレードを投げる
// 終わり: 規定本数を空いた場所に刺せれば成功。刺さっている場所へ投げてしまうと失敗
// @mechanic: aim_shoot
// @theme: rotating_target_throw
// 世界観: 大道芸の的当て師が高速回転する的に照準を合わせ、空いた場所だけを狙ってブレードを投げ込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中させた本数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る
  var C = {
    bg1: '#f4f2ec', bg2: '#dedad0', wheel: '#141414', wheelRim: '#000000',
    slotOpen: '#f4f2ec', slotUsed: '#141414', reticle: '#e02020', reticleSafe: '#141414',
    blade: '#141414', good: '#141414', bad: '#e02020', gold: '#e02020', ink: '#141414', white: '#f4f2ec',
  };

  var GAME_TITLE = 'WHEEL THROW';
  var SLOTS = 10;
  var NEED = 6;
  var R = 320;
  var CX = W * 0.5, CY = H * 0.42;
  var ROUND_LIMIT = 17;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#000000', pulse * 0.5);
    game.draw.sprite(PERFORMER, { '#': C.ink }, W * 0.5, H * 0.86, 22, { anchor: 'center' });
  }

  var slots, angle, omega, hits, misses, roundClock;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    slots = new Array(SLOTS).fill(false);
    angle = 0; omega = 1.6; hits = 0; misses = 0; roundClock = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function reticleSlot() {
    var a = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(a / (Math.PI * 2 / SLOTS)) % SLOTS;
  }

  function drawScene() {
    game.draw.circle(CX, CY, R + 30, C.wheelRim);
    game.draw.circle(CX, CY, R + 10, C.wheel);
    for (var i = 0; i < SLOTS; i++) {
      var a = angle + i * (Math.PI * 2 / SLOTS);
      var sx = CX + Math.cos(a) * R;
      var sy = CY + Math.sin(a) * R;
      game.draw.circle(sx, sy, 34, slots[i] ? C.slotUsed : C.slotOpen);
      if (slots[i]) game.draw.line(sx - 16, sy, sx + 16, sy, C.blade, 8);
    }
    game.draw.circle(CX, CY, 26, C.wheelRim);
    // reticle at top
    var rs = reticleSlot();
    var danger = slots[rs];
    var rGlow = 0.5 + 0.3 * Math.sin(game.time.elapsed * 8);
    game.draw.line(CX, CY - R - 70, CX, CY - R - 10, danger ? C.reticle : C.reticleSafe, 8);
    game.draw.circle(CX, CY - R - 70, 20, danger ? C.reticle : C.reticleSafe, danger ? rGlow : 1);
  }

  function throwBlade(x, y) {
    if (finished || ready > 0) return;
    var rs = reticleSlot();
    if (slots[rs]) {
      misses++;
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, CY - R - 70, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    slots[rs] = true; hits++;
    omega += 0.16;
    game.feedback.good(CX, CY - R - 70, { text: 'HIT', color: C.good });
    game.audio.play('se_good', 0.35);
    if (!halfCalled && hits === Math.ceil(NEED / 2)) {
      halfCalled = true;
      game.fx.popup('NICE', CX, CY - R - 130, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (hits >= NEED) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) throwBlade(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.3;
    if (cyc < dt || demo.t <= dt) resetDemo();
    angle += omega * dt;
    if (cyc > 0.6 && cyc < 0.75 && !finished) {
      throwBlade(CX, CY - R - 70);
      demo.press = true;
    } else {
      demo.press = false;
    }
    demo.gx = CX; demo.gy = H * 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (slots === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      angle += omega * dt;
      roundClock += dt;
      if (roundClock >= ROUND_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var pct = Math.max(0, 1 - roundClock / ROUND_LIMIT);
    var lowTime = pct < 0.25 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 16, C.wheelRim, 0.15);
    game.draw.rect(60, 150, (W - 120) * pct, 16, lowTime ? C.bad : C.wheelRim);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['B3', 0.2], ['D4', 0.2], ['G4', 0.35]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
