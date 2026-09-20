// I-GBA-0039-vault-pry-open.js
// ヴォルトプライオープン — 閉じたままの石扉を、両手の指でそれぞれの端をつまんで時間内にこじ開ける
// 操作: 画面左右それぞれの端を指でつかみ、両手同時に外側へ引っぱって扉をこじ開ける
// 終わり: 時間内に扉を全開にできれば成功。時間切れなら失敗
// @mechanic: coop_2zone
// @theme: block_vault_door
// 世界観: ブロック積みの地下遺跡。固く閉じた扉を、両手で左右の端をつかみ同時に引いてこじ開ける探検者
// 残るもの: 正誤(CLEAR/GAME OVER) + 開いた扉の到達%
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 太いブロック単位、上面明・側面暗の疑似立体
  var C = {
    bg: '#241a12', bg2: '#140e0a', stone: '#8a7256', stoneDark: '#5a4832', stoneTop: '#a89070',
    gold: '#ffd23f', good: '#4dff8a', bad: '#ff4d5e', white: '#f2e8d8', ink: '#0c0806',
  };

  var GAME_TITLE = 'VAULT PRY';
  var CX = W * 0.5, CY = H * 0.42;
  var DOOR_W = 420, DOOR_H = 620;
  var TIME_LIMIT = 17.0;
  var PROGRESS_TARGET = 1000;
  var DECAY_RATE = 60; // 両手が揃わない間の減衰

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BLOCK = ['####', '####', '####', '####'];

  var progress, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, halfShown;
  var leftTouch, rightTouch;

  function initGame() {
    progress = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
    leftTouch = null; rightTouch = null;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) {
      var bx = (i % 5) * (W / 5) + 40;
      var by = Math.floor(i / 5) * 70 + H * 0.78;
      game.draw.sprite(BLOCK, { '#': C.stoneDark }, bx, by, 12, { anchor: 'center' });
    }
  }

  function drawVault(open) {
    var gap = open * (DOOR_W * 0.95);
    // 左扉
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 4; c++) {
        var bx = CX - gap - DOOR_W / 2 + c * 40 + 20;
        var by = CY - DOOR_H / 2 + r * 62 + 30;
        game.draw.sprite(BLOCK, { '#': c === 3 ? C.stoneTop : C.stone }, bx, by, 10, { anchor: 'center' });
      }
    }
    // 右扉
    for (var r2 = 0; r2 < 10; r2++) {
      for (var c2 = 0; c2 < 4; c2++) {
        var bx2 = CX + gap - DOOR_W / 2 + c2 * 40 + 20;
        var by2 = CY - DOOR_H / 2 + r2 * 62 + 30;
        game.draw.sprite(BLOCK, { '#': c2 === 0 ? C.stoneTop : C.stone }, bx2, by2, 10, { anchor: 'center' });
      }
    }
    // 内側の闇(開いた分だけ見える)
    game.draw.rect(CX - gap * 0.5, CY - DOOR_H / 2, gap, DOOR_H, C.ink, 0.7);
    game.draw.rect(CX - 12, CY - DOOR_H / 2 - 30, 24, DOOR_H + 60, C.gold, open > 0.05 ? 0 : 0.5);
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    var zone = x < W * 0.5 ? 'L' : 'R';
    var rec = { id: id, x: x, y: y, zone: zone };
    if (zone === 'L') leftTouch = rec; else rightTouch = rec;
    game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var moved = 0;
    if (leftTouch && leftTouch.id === id) { moved = Math.max(0, leftTouch.x - x); leftTouch.x = x; leftTouch.y = y; }
    else if (rightTouch && rightTouch.id === id) { moved = Math.max(0, x - rightTouch.x); rightTouch.x = x; rightTouch.y = y; }
    if (moved > 0 && leftTouch && rightTouch) {
      var before = progress / PROGRESS_TARGET;
      progress = Math.min(PROGRESS_TARGET, progress + moved * 1.4);
      var after = progress / PROGRESS_TARGET;
      game.fx.burst(x, y, { color: C.gold, count: 2, speed: 80 });
      if (before < 0.5 && after >= 0.5 && !halfShown) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, CY - DOOR_H * 0.6, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (progress >= PROGRESS_TARGET) {
        ok = true; finished = true; hitStop = 0.12;
        game.feedback.good(CX, CY, { text: 'OPEN', color: C.good });
        game.audio.play('se_success', 0.4);
        finish();
      }
    }
  });
  game.onRelease(function(x, y, id) {
    if (leftTouch && leftTouch.id === id) leftTouch = null;
    if (rightTouch && rightTouch.id === id) rightTouch = null;
    if (state === S.PLAYING) game.fx.burst(x, y, { color: C.stoneTop, count: 3, speed: 60 });
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

  var demo = { t: 0, gxL: CX - 250, gxR: CX + 250, gy: CY, pressL: false, pressR: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var p = Math.min(1, cyc / 3.0);
    demo.pressL = p < 0.9; demo.pressR = p < 0.9;
    demo.gxL = CX - 250 - p * 60;
    demo.gxR = CX + 250 + p * 60;
    progress = Math.max(progress || 0, p * PROGRESS_TARGET);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawVault(progress / PROGRESS_TARGET);
      game.draw.hand(demo.gxL, demo.gy, { press: demo.pressL, scale: 14 });
      game.draw.hand(demo.gxR, demo.gy, { press: demo.pressR, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawVault(progress / PROGRESS_TARGET);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      var pct = Math.round((progress / PROGRESS_TARGET) * 100);
      txt(pct + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.round((progress / PROGRESS_TARGET) * 100);
        if (ok) game.end.success(pctF, { pct: pctF }); else game.end.failure({ pct: pctF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!(leftTouch && rightTouch)) progress = Math.max(0, progress - DECAY_RATE * dt);
      if (timeLeft <= 0) {
        timeLeft = 0;
        ok = false; finished = true; hitStop = 0.35; shake = 0.25;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawVault(progress / PROGRESS_TARGET);

    var pctH = Math.round((progress / PROGRESS_TARGET) * 100);
    txt(pctH + ' / 100', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.4], ['C4', 0.4], ['E4', 0.4], ['C4', 0.4]], { tempo: 120, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
