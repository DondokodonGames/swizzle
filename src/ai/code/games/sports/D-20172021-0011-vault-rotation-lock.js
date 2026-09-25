// D-20172021-0011-vault-rotation-lock.js
// ボルト・ローテーション・ロック — 助走から跳び上がり、指定された回転数ぴったりで着地を決める
// 操作: 宙に浮いている間、指定回転数に届くまでタップして回転を足す。届いたらそれ以上は押さない
// 終わり: 着地時に回転数が指定数とぴったり一致すれば成功。多すぎ/足りなければ失敗
// @mechanic: count_exact
// @theme: vault_rotation_lock
// 世界観: 体操競技の跳馬選手が助走から跳び上がり、指定された回転数ぴったりで着地を決めにいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた回転数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var C = {
    bg1: '#9fd8e8', bg2: '#e8f4a8', mat: '#3a5aa8', matDark: '#203a78',
    gym: '#ff8a3a', gymDark: '#c85a10', suit: '#ffffff',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd400', ink: '#102030', white: '#ffffff',
  };

  var GAME_TITLE = 'VAULT LOCK';
  var RUNUP_DUR = 1.8;
  var FLIGHT_DUR = 12.5;
  var TAP_GAP = 0.4;

  var P = { RUNUP: 0, FLIGHT: 1, DONE: 2 };
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a1420', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GYM_FRAMES = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.mat);
    game.draw.rect(0, H * 0.78, W, 10, C.matDark);
  }

  var phase, phaseT, target, count, rot, runX, tapCooldown, lastTapGood;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    phase = P.RUNUP; phaseT = 0; target = 3 + Math.floor(Math.random() * 3);
    count = 0; rot = 0; runX = W * 0.14; tapCooldown = 0; lastTapGood = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawScene() {
    var gy = H * 0.72;
    if (phase === P.RUNUP) {
      var t = Math.min(1, phaseT / RUNUP_DUR);
      runX = W * 0.14 + t * (W * 0.34);
      var frame = Math.floor(game.time.elapsed * 10) % 2;
      game.draw.sprite(GYM_FRAMES[frame], { '#': C.gym }, runX, H * 0.76, 26, { anchor: 'center' });
    } else {
      var arc = Math.min(1, phaseT / FLIGHT_DUR);
      var fx = W * 0.5;
      var fy = H * 0.76 - Math.sin(Math.min(1, arc * 1.4)) * H * 0.28;
      game.draw.circle(fx, H * 0.9, 40 * (1 - arc * 0.3), C.matDark, 0.25);
      var spinFrame = Math.floor(rot * 2) % 2;
      game.draw.sprite(GYM_FRAMES[spinFrame], { '#': C.gym }, fx, fy, 30, { anchor: 'center' });
    }
  }

  function addRotation(x, y) {
    if (count >= target) {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3; phase = P.DONE;
      game.feedback.bad(x, y, { text: '回り過ぎ' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    count++; rot += 1;
    game.feedback.good(x, y, { text: '+1', color: C.good });
    game.audio.play('se_jump', 0.35);
    if (!halfCalled && count === Math.ceil(target / 2)) {
      halfCalled = true;
      game.fx.popup('NICE', x, y - 90, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (count === target) {
      game.fx.popup('LOCK!', x, y - 60, { color: C.gold, size: 30 });
      game.audio.play('se_powerup', 0.35);
    }
  }

  function land() {
    phase = P.DONE;
    if (count === target) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(runX, H * 0.76, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, H * 0.76, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; finished = true; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(W * 0.5, H * 0.76, { text: '回転不足' });
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && phase === P.FLIGHT) {
      if (tapCooldown > 0) { game.audio.play('se_tap', 0.05); return; }
      tapCooldown = TAP_GAP;
      addRotation(x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.76, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var total = RUNUP_DUR + FLIGHT_DUR + 1.2;
    var cyc = demo.t % total;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    if (cyc < RUNUP_DUR) {
      phase = P.RUNUP; phaseT = cyc;
      demo.gx = W * 0.5; demo.gy = H * 0.9; demo.press = false;
    } else if (cyc < RUNUP_DUR + FLIGHT_DUR) {
      phase = P.FLIGHT; phaseT = cyc - RUNUP_DUR;
      var wantCount = Math.min(target, Math.floor((phaseT / (FLIGHT_DUR * 0.6)) * target));
      while (count < wantCount && count < target) addRotation(W * 0.5, H * 0.55);
      demo.gx = W * 0.5; demo.gy = H * 0.55; demo.press = phaseT % 1 < 0.15;
    } else if (phase !== P.DONE) {
      land();
    }
    if (tapCooldown > 0) tapCooldown -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
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
      txt(count + ' / ' + target, W / 2, H * 0.13, 28, C.gold);
      if (!ok && count < target) txt('あと' + (target - count) + '回転!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(count, { count: count, target: target });
        else game.end.failure({ count: count, target: target });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (tapCooldown > 0) tapCooldown -= dt;
      if (phase === P.RUNUP) {
        phaseT += dt;
        if (phaseT >= RUNUP_DUR) { phase = P.FLIGHT; phaseT = 0; game.audio.play('se_jump', 0.4); }
      } else if (phase === P.FLIGHT) {
        phaseT += dt;
        if (phaseT >= FLIGHT_DUR) land();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(count + ' / ' + target, W / 2, H * 0.06, 32, C.ink);
    var pct = phase === P.FLIGHT ? Math.max(0, 1 - phaseT / FLIGHT_DUR) : 1;
    var lowTime = phase === P.FLIGHT && pct < 0.25 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.3);
    game.draw.rect(60, 150, (W - 120) * pct, 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
