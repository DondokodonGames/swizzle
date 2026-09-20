// I-Wii-0015-hook-set-pull.js
// フックセットプル — 竿先が跳ねた合図の瞬間、竿を手前へ強く引いて針を掛ける
// 操作: 浮きが沈む合図が出た瞬間、竿の握りを指で下(手前)へ強く素早くドラッグして引き合わせる
// 終わり: 5回のアタリを合図の直後に強く引き合わせられれば成功。早すぎ/弱すぎ/遅すぎで1回でも外すと失敗
// @mechanic: slingshot
// @theme: riverside_hook_set
// 世界観: 川辺の桟橋に立つ釣り人。浮きが消える一瞬のアタリを見極め、竿を力いっぱい引いて魚に針を掛ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 掛けられた匹数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 一回り大きい黒縁 + 明暗2色のみの塗り、中間調なし
  var C = {
    bg: '#7fd6e8', bg2: '#c9f0ee', water: '#3aa0c8', waterDark: '#1c6f90',
    rod: '#8a5a2c', rodDark: '#5c3a18', bite: '#ff5040', good: '#3dd67a', bad: '#ff5040',
    gold: '#ffd24d', white: '#ffffff', ink: '#0a1a20',
  };

  var GAME_TITLE = 'HOOK SET';
  var HX = W * 0.5, HY = H * 0.62; // 握り基準位置
  var TOTAL = 5;
  var GOOD_MIN = 0.15, GOOD_MAX = 0.55; // 合図後の許容タイミング窓(秒)
  var NEED_PULL = 220; // 必要な引く距離

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, thrown, done, endWait, finished, ready, hitStop, shake;
  var biteT, biteActive, biteResolved, waitT, pulling, pullStartY, gripY, missed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ANGLER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H * 0.5, [[0, C.bg], [1, C.bg2]]);
    game.draw.gradient(H * 0.5, H, [[0, C.waterDark], [1, C.water]]);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.5 + i * 40, W, H * 0.5 + i * 40 - 10, '#ffffff18', 3);
  }

  function newWait() {
    return 1.0 + Math.random() * 1.4;
  }

  function initGame() {
    caught = 0; thrown = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    biteActive = false; biteResolved = false; biteT = 0; waitT = newWait();
    pulling = false; pullStartY = HY; gripY = HY; missed = false;
  }

  function drawScene() {
    game.draw.sprite(ANGLER, { '#': C.ink }, W * 0.25, H * 0.72, 16, { anchor: 'center' });
    game.draw.line(W * 0.25, H * 0.66, HX, gripY, C.rodDark, 10);
    game.draw.line(HX, gripY, HX + 260, H * 0.5 - (gripY - HY) * 0.6, C.rod, 8);
    // 浮き
    var floatY = biteActive ? H * 0.5 + 30 : H * 0.5 - 4 + Math.sin(game.time.elapsed * 3) * 4;
    game.draw.circle(HX + 260, floatY, 14, biteActive ? C.bite : C.white);
  }

  function resolveMiss(reason) {
    game.feedback.bad(HX, gripY, { text: reason });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    hitStop = 0.3;
    ok = false; finished = true; finish();
  }

  function resolveHit() {
    caught++;
    game.feedback.good(HX, gripY, { text: 'HOOKED', color: C.good });
    game.fx.burst(HX, gripY, { color: C.gold, count: 18, speed: 360 });
    game.audio.play('se_good', 0.4);
    if (caught === 3) game.fx.popup('あと2匹!', HX, gripY - 200, { color: C.gold, size: 34 });
    hitStop = 0.12;
    thrown++;
    if (thrown >= TOTAL) { ok = true; finished = true; finish(); return; }
    biteActive = false; biteResolved = false; biteT = 0; waitT = newWait();
    pulling = false; gripY = HY;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    pulling = true; pullStartY = y;
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pulling || done || finished) return;
    gripY = HY + Math.max(0, y - pullStartY);
    if (!biteActive && !missed) { missed = true; }
    var dist = y - pullStartY;
    if (dist >= NEED_PULL && !biteResolved) {
      biteResolved = true;
      pulling = false;
      if (biteActive && biteT >= GOOD_MIN && biteT <= GOOD_MAX) resolveHit();
      else resolveMiss(biteActive ? (biteT < GOOD_MIN ? 'TOO SOON' : 'TOO LATE') : 'NO BITE');
    }
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    pulling = false; gripY = HY;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: HX, gy: HY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { biteActive = false; biteT = 0; gripY = HY; }
    if (cyc < 1.2) { biteActive = false; demo.press = false; }
    else if (cyc < 1.2 + GOOD_MAX + 0.15) {
      if (!biteActive) { biteActive = true; biteT = 0; }
      biteT += dt;
      if (biteT > GOOD_MIN && biteT < GOOD_MAX + 0.1) {
        demo.press = true;
        gripY = Math.min(HY + NEED_PULL + 20, gripY + dt * 900);
      }
    } else {
      demo.press = false; gripY = HY; biteActive = false;
    }
    demo.gx = HX; demo.gy = gripY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (caught === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '匹!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!biteActive) {
        waitT -= dt;
        if (waitT <= 0) {
          biteActive = true; biteT = 0;
          game.audio.play('se_tap', 0.3);
        }
      } else {
        biteT += dt;
        if (biteT > GOOD_MAX + 0.3 && !biteResolved) {
          biteResolved = true;
          resolveMiss('あと少し!');
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000018', 1);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 1]], { tempo: 96, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
