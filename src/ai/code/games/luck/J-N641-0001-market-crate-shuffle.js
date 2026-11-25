// J-N641-0001-market-crate-shuffle.js
// 露店の木箱シャッフル探し — 宝石が入った木箱を見せてから入れ替え、止まった後にどれか見抜く
// 操作: 木箱が入れ替わる様子をよく見て覚え、止まったら宝石が入っていると思う木箱を1つタップする
// 終わり: 正しい木箱を当てれば成功。外れれば失敗
// @mechanic: spot
// @theme: market_stall_crate_find
// 世界観: 旅の露店商が並べた4つの木箱の1つに宝石を見せてから素早く入れ替え、客が最後にどの箱に入っているかを見抜けるか試す
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解までの入れ替え回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・光沢、gradientで厚みを作る
  var C = {
    bg: '#5a3a1e', bg2: '#3a2410', tableL: '#7a5228', tableD: '#5a3a1a',
    crate: '#a87840', crateD: '#7a5428', gem: '#ff5fd0', gemGlow: '#ffd0f4',
    good: '#7cd94a', badc: '#ff4d5e', gold: '#ffd400', ink: '#f5e6cc',
  };

  var GAME_TITLE = 'CRATE FIND';
  var N = 4;
  var SWAPS = 5;
  var CRATE_SPR = ['####', '#..#', '####'];
  var X0 = [W * 0.22, W * 0.42, W * 0.62, W * 0.82];
  var CY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#1a0f06', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.42, W, H * 0.3, C.tableL, 1);
    for (var i = 0; i < 10; i++) game.draw.rect(0, H * 0.42 + i * 20, W, 3, C.tableD, 0.4);
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.3);
    game.draw.rect(0, 0, W, H, C.gem, pulse * 0.25);
  }

  // pos[i] = crate slot index currently holding the gem tracked by slot; we track gemSlot directly
  var slotOrder, gemSlot, revealed, phase, phaseT, swapsDone, pendingSwap;
  var pick, timeLeft, resultShown;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    slotOrder = [0, 1, 2, 3];
    gemSlot = Math.floor(Math.random() * N);
    revealed = true; phase = 'show'; phaseT = 0.9; swapsDone = 0; pendingSwap = null;
    pick = -1; resultShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function crateX(slot) { return X0[slot]; }

  function drawScene() {
    for (var i = 0; i < N; i++) {
      var x = pendingSwap && (i === pendingSwap.a || i === pendingSwap.b) ?
        pendingSwap.x[i === pendingSwap.a ? 0 : 1] : crateX(i);
      var lift = (finished && resultShown && i === gemSlot) ? -30 : 0;
      var openLid = (revealed && i === gemSlot) || (finished && resultShown && i === gemSlot);
      if (openLid) {
        game.draw.circle(x, CY + lift - 6, 20, C.gemGlow, 0.6);
        game.draw.sprite(['.#.', '###', '.#.'], { '#': C.gem }, x, CY + lift - 10, 18, { anchor: 'center' });
      }
      game.draw.sprite(CRATE_SPR, { '#': C.crateD, '.': C.crate }, x, CY + lift, 30, { anchor: 'center' });
      if (finished && resultShown && i === pick && pick !== gemSlot) {
        game.draw.circle(x, CY, 60, C.badc, 0.25);
      }
    }
  }

  function beginSwap() {
    var a = Math.floor(Math.random() * N);
    var b = (a + 1 + Math.floor(Math.random() * (N - 1))) % N;
    pendingSwap = { a: a, b: b, t: 0, dur: 0.32, x: [crateX(a), crateX(b)] };
  }

  function tickSwap(dt) {
    if (!pendingSwap) { beginSwap(); game.audio.play('se_tap', 0.15); return; }
    pendingSwap.t += dt;
    var t = Math.min(1, pendingSwap.t / pendingSwap.dur);
    var ax = crateX(pendingSwap.a), bx = crateX(pendingSwap.b);
    pendingSwap.x[0] = ax + (bx - ax) * t;
    pendingSwap.x[1] = bx + (ax - bx) * t;
    if (t >= 1) {
      if (gemSlot === pendingSwap.a) gemSlot = pendingSwap.b;
      else if (gemSlot === pendingSwap.b) gemSlot = pendingSwap.a;
      swapsDone++;
      pendingSwap = null;
      game.audio.play('se_tap', 0.12);
      if (swapsDone >= SWAPS) phase = 'guess';
    }
  }

  function attemptPick(x, y) {
    if (finished || ready > 0 || phase !== 'guess') return;
    var best = -1, bd = 1e9;
    for (var i = 0; i < N; i++) {
      var d = Math.hypot(crateX(i) - x, CY - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (bd > 110) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.2); return; }
    pick = best;
    finished = true; resultShown = true;
    if (pick === gemSlot) {
      ok = true; hitStop = 0.2;
      game.feedback.good(crateX(pick), CY, { text: 'CLEAR', color: C.good });
      game.fx.burst(crateX(pick), CY, { color: C.gold, count: 24, speed: 400 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; shake = 0.25; hitStop = 0.35;
      game.feedback.bad(crateX(pick), CY, { text: 'MISS' });
      game.audio.play('se_failure', 0.5);
    }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptPick(x, y);
  });

  var demo = { t: 0, gx: X0[0], gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.postFinish = 0; }
    if (phase === 'show') {
      phaseT -= dt;
      if (phaseT <= 0) { revealed = false; phase = 'swap'; }
    } else if (phase === 'swap') {
      tickSwap(dt);
    } else if (phase === 'guess' && !finished) {
      demo.gx += (crateX(gemSlot) - demo.gx) * Math.min(1, dt * 3);
      demo.gy = CY;
      if (Math.abs(demo.gx - crateX(gemSlot)) < 12) { demo.press = true; attemptPick(demo.gx, demo.gy); }
    }
    // ATTRACT死角対策: 決着後は長く静止させず素早く次サイクルへ
    if (finished) {
      demo.postFinish = (demo.postFinish || 0) + dt;
      if (demo.postFinish > 0.7) { demo.t = 0; initGame(); demo.postFinish = 0; }
    } else {
      demo.postFinish = 0;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (slotOrder === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      drawScene();
      game.draw.hand(demo.gx, demo.gy - 60, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.badc);
      if (!ok) txt('あと1手!', W / 2, H * 0.16, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(SWAPS, { swaps: SWAPS, hit: 1 });
        else game.end.failure({ swaps: SWAPS, hit: 0 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'show') {
        phaseT -= dt;
        if (phaseT <= 0) { revealed = false; phase = 'swap'; }
      } else if (phase === 'swap') {
        tickSwap(dt);
        if (swapsDone === Math.ceil(SWAPS / 2) && !pendingSwap) {
          game.fx.popup('NICE', W * 0.5, H * 0.36, { color: C.gold, size: 30 });
        }
      } else if (phase === 'guess') {
        timeLeft -= dt;
      }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    drawScene();

    txt(phase === 'guess' ? 'GO!' : (swapsDone + ' / ' + SWAPS), W / 2, H * 0.08, 28, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
