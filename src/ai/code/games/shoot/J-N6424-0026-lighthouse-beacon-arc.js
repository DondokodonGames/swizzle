// J-N6424-0026-lighthouse-beacon-arc.js
// ライトハウス・ビーコンアーク — 放物線を読んで光の信号弾を放ち、漂う標識ブイに命中させる
// 操作: 灯台の砲座をタップすると、表示中の放物線に沿って信号弾が放たれる。軌道が的に重なった瞬間を狙う
// 終わり: 規定回数命中できれば成功。持ち弾を使い切って未達なら失敗
// @mechanic: trajectory
// @theme: lighthouse_beacon_arc
// 世界観: 灯台守りの見習いが沖を漂う標識ブイへ向け、放物線を読んで光の信号弾を撃ち込み、位置を知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中させた回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光ライン、面塗りは最小限
  var C = {
    bg: '#050912', bg2: '#01030a', line: '#3fe0ff', lineDim: '#1a5a66',
    buoy: '#ff5a3d', buoyRing: '#ffd23f', orb: '#3fe0ff', orbCore: '#e0fbff',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#e0fbff', white: '#ffffff',
  };

  var GAME_TITLE = 'BEACON ARC';
  var TOWER_X = W * 0.5, TOWER_Y = H * 0.82;
  var NEED = 5;
  var AMMO = 8;
  var MAX_TIME = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TOWER = ['.##.', '####', '####', '####'];

  function bg() {
    var pulse = 0.05 + 0.05 * Math.sin(game.time.elapsed * 1.5);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.line, pulse * 0.15);
    game.draw.line(0, H * 0.86, W, H * 0.86, C.lineDim, 3);
    game.draw.sprite(TOWER, { '#': C.line }, TOWER_X, TOWER_Y, 14, { anchor: 'center' });
  }

  var buoy, hits, misses, ammoLeft, halfCalled, roundClock;
  var arcT, arcActive, arcTargetT;
  var done, endWait, finished, ready, hitStop, shake;

  function newBuoy() {
    buoy = { x: W * 0.2 + Math.random() * W * 0.6, y: H * 0.28, dir: Math.random() < 0.5 ? -1 : 1, speed: 90 + Math.random() * 60 };
  }

  function initGame() {
    newBuoy();
    hits = 0; misses = 0; ammoLeft = AMMO; halfCalled = false; roundClock = 0;
    arcActive = false; arcT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function arcPointFor(tx, ty, t) {
    // 放物線: 発射角固定、tは0..1
    var x = TOWER_X + (tx - TOWER_X) * t;
    var peak = 420;
    var y = TOWER_Y - (TOWER_Y - ty) * t - Math.sin(Math.PI * t) * peak * 0.4;
    return { x: x, y: y };
  }
  var arcTargetX, arcTargetY;

  function drawScene() {
    game.draw.circle(buoy.x, buoy.y, 44, C.buoyRing);
    game.draw.circle(buoy.x, buoy.y, 30, C.buoy);
    // ghost arc preview: 現在のブイ位置に撃った場合の見本軌道(狙いの参考。実弾の着弾には使わない)
    for (var i = 0; i <= 10; i++) {
      var t = i / 10;
      var p = arcPointFor(buoy.x, H * 0.28, t);
      game.draw.circle(p.x, p.y, 3, C.lineDim, 0.6);
    }
    if (arcActive) {
      var pt = arcPointFor(arcTargetX, arcTargetY, arcT);
      game.draw.circle(pt.x, pt.y, 16, C.orbCore);
      game.draw.circle(pt.x, pt.y, 26, C.orb, 0.4);
    }
  }

  function fireArc(atBuoyX, atBuoyY) {
    if (finished || ready > 0 || arcActive || ammoLeft <= 0) return;
    arcActive = true; arcT = 0;
    arcTargetX = atBuoyX; arcTargetY = atBuoyY;
    ammoLeft--;
    game.audio.play('se_jump', 0.3);
  }

  function resolveArc() {
    arcActive = false;
    var hit = Math.abs(buoy.x - arcTargetX) < 70;
    if (hit) {
      hits++;
      game.feedback.good(buoy.x, buoy.y, { text: 'GOOD', color: C.good });
      game.fx.burst(buoy.x, buoy.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.35);
      if (!halfCalled && hits >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', buoy.x, buoy.y - 60, { color: C.gold, size: 30 }); }
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(buoy.x, buoy.y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      newBuoy();
    } else {
      misses++;
      game.feedback.bad(arcTargetX, arcTargetY, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (ammoLeft <= 0 && !finished) { finished = true; ok = false; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) fireArc(Math.max(W * 0.1, Math.min(W * 0.9, x)), H * 0.28);
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepBuoy(dt) {
    buoy.x += buoy.dir * buoy.speed * dt;
    if (buoy.x < W * 0.14 || buoy.x > W * 0.86) buoy.dir *= -1;
  }

  function stepArc(dt) {
    if (!arcActive) return;
    arcT += dt / 0.55;
    if (arcT >= 1) { arcT = 1; resolveArc(); }
  }

  var demo = { t: 0, gx: TOWER_X, gy: TOWER_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepBuoy(dt); stepArc(dt);
    demo.gx = TOWER_X; demo.gy = TOWER_Y;
    if (!arcActive && Math.floor(cyc / 1.5) !== demo.lastShot) {
      demo.lastShot = Math.floor(cyc / 1.5);
      var lead = buoy.x + buoy.dir * buoy.speed * 0.55;
      fireArc(Math.max(W * 0.1, Math.min(W * 0.9, lead)), H * 0.28);
      demo.press = true;
    } else {
      demo.press = arcActive;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (buoy === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '個!', W / 2, H * 0.18, 22, C.ink);
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
      stepBuoy(dt); stepArc(dt);
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false;
        game.feedback.bad(TOWER_X, TOWER_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 26, C.ink);
    txt(ammoLeft + ' / ' + AMMO, W * 0.84, H * 0.06, 18, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 112, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
