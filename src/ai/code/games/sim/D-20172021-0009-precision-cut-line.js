// D-20172021-0009-precision-cut-line.js
// プレシジョン・カットライン — 流れてくる素材を規定の断裁マークめがけて指を走らせ正確に切る
// 操作: 落ちてくる素材が中央の断裁マークに重なった瞬間、指を素早く走らせて素材の上を横切る
// 終わり: 規定数を断裁マークで正確に切れれば成功。切り逃しや見送りが多いと失敗
// @mechanic: slice
// @theme: factory_precision_cut
// 世界観: 部品検品ラインの整備ロボットが、流れてくる素材を規定の断裁マークで一つずつ正確に断つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 断裁できた個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感テクスチャ、木目・金属光沢、gradientで厚みを作る
  var C = {
    bg1: '#5a4a38', bg2: '#3a2e22', belt: '#8a7458', beltDark: '#6a5640',
    part: '#d8c898', partDark: '#a89468', mark: '#ff9f1c', markGlow: '#ffd27a',
    arm: '#7a8a94', armDark: '#4a5a64', blade: '#e8f0f4',
    good: '#39d67a', bad: '#ff4d5e', gold: '#ffd400', ink: '#20160c', white: '#fff6e0',
  };

  var GAME_TITLE = 'CUT LINE';
  var TOTAL = 6;
  var NEED = 5;
  var MAX_MISS = 2;
  var CUT_Y = H * 0.55;
  var TOL = 100;
  var TRAVEL = 1.9;
  var GAP = 1.85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#150c04', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PART_SPR = ['.####.', '######', '######', '.####.'];
  var ARM_SPR = ['..##..', '.####.', '..##..', '.####.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.18, W, H * 0.62, C.belt);
    for (var i = 0; i < 10; i++) {
      var by = H * 0.18 + ((i * 70 + game.time.elapsed * 120) % (H * 0.62));
      game.draw.rect(0, by, W, 8, C.beltDark, 0.5);
    }
  }

  var parts, spawned, cut, misses, roundClock, lastPos, armX, armY, sliceFlash;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    parts = [];
    for (var i = 0; i < TOTAL; i++) {
      parts.push({ x: W * (0.38 + Math.random() * 0.24), spawnAt: i * GAP, y: -999, done: false, miss: false });
    }
    spawned = 0; cut = 0; misses = 0; roundClock = 0; halfCalled = false;
    lastPos = null; armX = W * 0.5; armY = H * 0.9; sliceFlash = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function activePart() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.spawnAt <= roundClock && !p.done && !p.miss && p.y < H * 0.95) return p;
    }
    return null;
  }

  function drawScene() {
    game.draw.rect(0, CUT_Y - 6, W, 12, C.mark, 0.85);
    var glowA = 0.3 + 0.25 * Math.sin(game.time.elapsed * 5);
    game.draw.rect(0, CUT_Y - TOL, W, TOL * 2, C.markGlow, glowA * 0.25);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.spawnAt > roundClock || p.y >= H * 0.95) continue;
      var col = p.done ? C.good : p.miss ? C.bad : C.part;
      game.draw.sprite(PART_SPR, { '#': col }, p.x, p.y, 20, { anchor: 'center' });
    }
    game.draw.sprite(ARM_SPR, { '#': C.arm }, armX, armY, 26, { anchor: 'center' });
    if (sliceFlash > 0) {
      game.draw.line(armX - 140, CUT_Y - 40, armX + 140, CUT_Y + 40, C.blade, 10);
    }
  }

  function resolvePart(p, x, y) {
    var dy = Math.abs(p.y - CUT_Y);
    if (dy <= TOL) {
      p.done = true; cut++;
      game.feedback.good(x, y, { text: 'CUT', color: C.good });
      game.audio.play('se_break', 0.4);
      sliceFlash = 0.15;
      if (!halfCalled && cut === Math.ceil(NEED / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', x, y - 80, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (cut >= NEED) {
        ok = true; finished = true; hitStop = 0.3;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(x, y, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      p.miss = true; misses++;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      if (misses > MAX_MISS) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        finish();
      }
    }
  }

  function checkSlice(x, y) {
    var p = activePart();
    if (!p) return;
    var d = Math.hypot(p.x - x, p.y - y);
    if (d < 110) resolvePart(p, x, y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.08);
    armX = x; armY = y; lastPos = { x: x, y: y };
    checkSlice(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.03);
    armX = x; armY = y;
    if (lastPos) checkSlice(x, y);
    lastPos = { x: x, y: y };
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) game.audio.play('se_tap', 0.03);
    lastPos = null;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.7, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (GAP * TOTAL + 1.2);
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    roundClock = cyc;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.spawnAt > roundClock) continue;
      var t = (roundClock - p.spawnAt) / TRAVEL;
      p.y = -80 + Math.min(1.15, t) * (H * 1.0);
      if (!p.done && !p.miss && p.y > CUT_Y - 20 && p.y < CUT_Y + 20) {
        resolvePart(p, p.x, p.y);
      } else if (!p.done && !p.miss && p.y >= H * 0.95) {
        p.miss = true;
      }
    }
    var ap = activePart();
    if (ap) { demo.gx = ap.x; demo.gy = ap.y; demo.press = Math.abs(ap.y - CUT_Y) < TOL * 1.4; }
    else { demo.gx = W * 0.5; demo.gy = H * 0.75; demo.press = false; }
    armX = demo.gx; armY = demo.gy;
    if (sliceFlash > 0) sliceFlash -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (parts === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(cut + ' / ' + NEED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - cut) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (sliceFlash > 0) sliceFlash -= dt;

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cut, { cut: cut, misses: misses });
        else game.end.failure({ cut: cut, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.spawnAt > roundClock) continue;
        var t = (roundClock - p.spawnAt) / TRAVEL;
        p.y = -80 + Math.min(1.2, t) * (H * 1.0);
        if (!p.done && !p.miss && p.y >= H * 0.95) {
          p.miss = true; misses++;
          if (misses > MAX_MISS) {
            ok = false; finished = true; hitStop = 0.3; shake = 0.25;
            finish();
          }
        }
      }
      if (!finished && roundClock > TOTAL * GAP + TRAVEL + 0.5) {
        ok = cut >= NEED; finished = true; hitStop = 0.2;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(cut + ' / ' + NEED, W / 2, H * 0.06, 30, C.white);
    var pct = Math.max(0, 1 - roundClock / (TOTAL * GAP + TRAVEL));
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.25);
    game.draw.rect(60, 150, (W - 120) * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.35]], { tempo: 132, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
