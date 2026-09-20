// I-GBA-0008-bellows-blast.js
// ベローズブラスト — 洞窟の奥、埃で詰まった通気口を大蛇腹のふいごで押し続けて溜め、勢いよく吹き飛ばす
// 操作: 画面下のふいごを長押しして風圧を溜め、満タンで離すと一気に吹き飛ぶ。離すタイミングで威力が決まる
// 終わり: 規定量(満タン)まで溜めて詰まり物を吹き飛ばせば成功。溜め切る前に離すと失敗
// @mechanic: hold_charge
// @theme: cave_vent_bellows
// 世界観: 洞窟探検家が、埃で詰まった通気口の前で大きなふいごを踏み込み、風を溜めて一気に解放する
// 残るもの: 正誤(CLEAR/GAME OVER) + 溜まった風圧%
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む。影は落とさず明度差だけで立体を出す
  var C = {
    bg: '#2a1f18', bg2: '#3d2c20', rockTop: '#6b5540', rockLeft: '#4a3a2c', rockRight: '#3a2c20',
    bellowsTop: '#c98a4a', bellowsLeft: '#a96f38', bellowsRight: '#8a5a2c',
    dust: '#8a7a68', good: '#7de88a', bad: '#ff7d5c', gold: '#ffd166', white: '#f2e8d8', ink: '#1a120c',
  };

  var GAME_TITLE = 'BELLOWS BLAST';
  var CX = W * 0.5, VENT_Y = H * 0.4, PUMP_Y = H * 1440 / 1920;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var charge, holding, done, endWait, finished, ready, hitStop, shake, released, clogged;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var EXPLORER = ['.##.', '####', '.##.', '#..#'];

  function voxel(x, y, s, top, left, right) {
    game.draw.rect(x - s, y - s * 0.5, s * 2, s * 0.5, top);
    game.draw.rect(x - s, y, s, s, left);
    game.draw.rect(x, y, s, s, right);
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) voxel(80 + i * 180, H * 0.16, 36, C.rockTop, C.rockLeft, C.rockRight);
    voxel(CX, VENT_Y, 90, C.rockTop, C.rockLeft, C.rockRight);
    if (clogged) {
      for (var d = 0; d < 5; d++) game.draw.circle(CX - 40 + d * 20, VENT_Y - 20 + (d % 2) * 10, 14, C.dust, 0.8);
    }
  }

  function initGame() {
    charge = 0; holding = false; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    released = false; clogged = true;
  }

  function drawBellows(squeeze) {
    var h = 120 - squeeze * 40;
    voxel(CX, PUMP_Y, 70, C.bellowsTop, C.bellowsLeft, C.bellowsRight);
    game.draw.rect(CX - 50, PUMP_Y - h, 100, h, C.bellowsLeft, 0.9);
    game.draw.sprite(EXPLORER, { '#': C.white }, CX, PUMP_Y - h - 60, 22, { anchor: 'center' });
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || done) return;
    holding = true;
    game.audio.play('se_tap', 0.05);
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (!holding) return;
    holding = false;
    if (finished || ready > 0 || done) return;
    released = true;
    var success = charge >= 0.95;
    hitStop = success ? 0.15 : 0.3;
    if (success) {
      ok = true; finished = true; clogged = false;
      game.feedback.good(CX, VENT_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, VENT_Y, { color: C.gold, count: 26, speed: 460 });
      game.audio.play('se_break', 0.5);
      finish();
    } else {
      game.feedback.bad(CX, PUMP_Y, { text: 'あと' + Math.max(1, Math.round((1 - charge) * 100)) + '%!' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true;
      finish();
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: PUMP_Y, press: false, charge: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.charge = 0; clogged = true; }
    if (cyc < 2.2) { demo.press = true; demo.charge = Math.min(1, cyc / 2.15); }
    else if (cyc < 2.3 && demo.charge < 1) {
      demo.charge = 1;
      game.feedback.good(CX, VENT_Y, { text: 'CLEAR', color: C.good });
      game.audio.play('se_break', 0.3);
      clogged = false;
    } else { demo.press = false; }
    charge = demo.charge;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBellows(charge);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 22, C.gold);
      game.draw.rect(W * 0.25, H * 0.2, W * 0.5, 20, C.ink, 0.4);
      game.draw.rect(W * 0.25, H * 0.2, W * 0.5 * charge, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBellows(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(charge * 100) + '%', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round((1 - charge) * 100)) + '%!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(charge * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (holding) {
        var before = charge;
        charge = Math.min(1, charge + dt / 2.2);
        if (before < 0.5 && charge >= 0.5) { game.fx.popup('HALF!', CX, VENT_Y - 120, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.3); }
        if (before < 1 && charge >= 1) game.audio.play('se_powerup', 0.4);
      } else {
        charge = Math.max(0, charge - dt * 0.4);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBellows(charge);

    txt(Math.round(charge * 100) + ' / ' + 100, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(W * 0.25, H * 0.16, W * 0.5, 24, C.ink, 0.4);
    game.draw.rect(W * 0.25, H * 0.16, W * 0.5 * charge, 24, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['A3', 0.4], ['D4', 0.6]], { tempo: 100, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
