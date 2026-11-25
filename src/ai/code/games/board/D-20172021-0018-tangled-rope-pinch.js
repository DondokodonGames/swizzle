// D-20172021-0018-tangled-rope-pinch.js
// タングルド・ロープ・ピンチ — 絡まったロープの結び目を、正しい順番で両端を同時につまんで一つずつほどく
// 操作: 光っている結び目の両端(左右のマーカー)を2本指で同時につまむようにタップして外す
// 終わり: すべての結び目を順番どおりにほどけば成功。時間内に外せない結び目があれば失敗
// @mechanic: pinch_zone
// @theme: tangled_rope_untangle
// 世界観: 荷造り係が複雑に絡まったロープの前に立ち、光る結び目の両端を順番に2本指でつまんで一つずつ丁寧にほどいていく
// 残るもの: 正誤(CLEAR/GAME OVER) + ほどいた結び目数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形、密度を抑える
  var C = {
    bg1: '#c8b898', bg2: '#a89468', rope: '#8a6a3a', ropeDone: '#6a8a5a',
    knot: '#e8d0a0', knotActive: '#ffd400', markerA: '#3a8ae8', markerB: '#e85a3a',
    good: '#5a9868', bad: '#c85a3a', gold: '#ffd400', ink: '#2a2014', white: '#f4ecd8',
  };

  var GAME_TITLE = 'ROPE UNTIE';
  var KNOT_COUNT = 4;
  var TIMEOUT_PER = 3.4;
  var RADIUS = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#1a1408', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_SPR = ['.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.5);
  }

  var knots, curIdx, knotClock, roundClock;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function buildKnots() {
    var arr = [];
    for (var i = 0; i < KNOT_COUNT; i++) {
      var y = H * 0.30 + i * (H * 0.13);
      arr.push({
        ax: W * 0.26 + (Math.random() * 60 - 30), ay: y,
        bx: W * 0.74 + (Math.random() * 60 - 30), by: y + (Math.random() * 40 - 20),
        done: false,
      });
    }
    return arr;
  }

  function initGame() {
    knots = buildKnots();
    curIdx = 0; knotClock = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    // rope path connecting all knot pairs
    for (var i = 0; i < knots.length; i++) {
      var k = knots[i];
      var col = k.done ? C.ropeDone : C.rope;
      game.draw.line(k.ax, k.ay, k.bx, k.by, col, 14);
      if (i > 0) {
        var p = knots[i - 1];
        game.draw.line(p.bx, p.ay, k.ax, k.ay, C.rope, 10);
      }
    }
    for (var j = 0; j < knots.length; j++) {
      var kk = knots[j];
      var active = j === curIdx && !finished;
      var glow = 0.5 + 0.4 * Math.sin(game.time.elapsed * 6);
      if (kk.done) {
        game.draw.circle(kk.ax, kk.ay, 26, C.ropeDone);
        game.draw.circle(kk.bx, kk.by, 26, C.ropeDone);
      } else {
        game.draw.circle(kk.ax, kk.ay, active ? 40 : 30, active ? C.knotActive : C.knot, active ? glow : 0.7);
        game.draw.circle(kk.bx, kk.by, active ? 40 : 30, active ? C.knotActive : C.knot, active ? glow : 0.7);
        if (active) {
          game.draw.sprite(HAND_SPR, { '#': C.markerA }, kk.ax, kk.ay - 60, 10, { anchor: 'center' });
          game.draw.sprite(HAND_SPR, { '#': C.markerB }, kk.bx, kk.by - 60, 10, { anchor: 'center' });
        }
      }
    }
  }

  function resolveKnot() {
    var k = knots[curIdx];
    k.done = true;
    game.feedback.good((k.ax + k.bx) / 2, (k.ay + k.by) / 2, { text: 'UNTIE', color: C.good });
    game.fx.burst(k.ax, k.ay, { color: C.gold, count: 10, speed: 260 });
    game.fx.burst(k.bx, k.by, { color: C.gold, count: 10, speed: 260 });
    game.audio.play('se_good', 0.35);
    curIdx++;
    knotClock = 0;
    if (!halfCalled && curIdx === Math.ceil(KNOT_COUNT / 2)) {
      halfCalled = true;
      game.fx.popup('NICE', W / 2, H * 0.22, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (curIdx >= KNOT_COUNT) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(W / 2, H * 0.5, { text: 'CLEAR', color: C.good });
      game.fx.burst(W / 2, H * 0.5, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function failRound(x, y) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function checkPinch() {
    if (finished || ready > 0 || curIdx >= knots.length) return;
    var t = game.touches;
    if (!t || t.length < 2) return;
    var k = knots[curIdx];
    for (var i = 0; i < t.length; i++) {
      for (var j = 0; j < t.length; j++) {
        if (i === j) continue;
        var da = Math.hypot(t[i].x - k.ax, t[i].y - k.ay);
        var db = Math.hypot(t[j].x - k.bx, t[j].y - k.by);
        if (da < RADIUS && db < RADIUS) { resolveKnot(); return; }
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.06);
    checkPinch();
  });
  game.onMove(function() {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    checkPinch();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.26, gy: H * 0.3, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var total = KNOT_COUNT * 2.0 + 1.2;
    var cyc = demo.t % total;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    var perKnot = 2.0;
    var idx = Math.min(KNOT_COUNT - 1, Math.floor(cyc / perKnot));
    var within = cyc - idx * perKnot;
    var k = knots[Math.min(curIdx, knots.length - 1)];
    demo.gx = k.ax; demo.gy = k.ay; demo.press = within > 0.5 && within < 1.4;
    if (within > 0.9 && within < 1.1 && curIdx < KNOT_COUNT) {
      resolveKnot();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (knots === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      var k2 = knots[Math.min(curIdx, knots.length - 1)];
      game.draw.hand(k2.bx, k2.by, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(curIdx + ' / ' + KNOT_COUNT, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, KNOT_COUNT - curIdx) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(curIdx, { untied: curIdx, total: KNOT_COUNT });
        else game.end.failure({ untied: curIdx, total: KNOT_COUNT });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      knotClock += dt;
      checkPinch();
      if (!finished && knotClock >= TIMEOUT_PER) {
        var k = knots[curIdx];
        failRound(k ? (k.ax + k.bx) / 2 : W / 2, k ? (k.ay + k.by) / 2 : H / 2);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(curIdx + ' / ' + KNOT_COUNT, W / 2, H * 0.06, 30, C.ink);
    var pct = Math.max(0, 1 - knotClock / TIMEOUT_PER);
    var lowTime = pct < 0.3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.3);
    game.draw.rect(60, 150, (W - 120) * pct, 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['E4', 0.3]], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
