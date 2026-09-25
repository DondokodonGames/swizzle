// D-20172021-0056-shaftcart-swarm-run.js
// シャフトカート・スウォームラン — 自動前進する採掘カートを車線移動で操り、迫る虫の群れと岩を避けて自動砲台で切り抜ける
// 操作: 画面の左右半分をタップして3車線の間をカートごと切り替え、奥から迫る岩と虫を避ける
// 終わり: 制限時間いっぱい走り抜ければ成功。3回衝突すると失敗
// @mechanic: camera_run
// @theme: shaftcart_swarm_run
// 世界観: 崩落中の坑道を自動前進する採掘カートの操縦士が、自動砲台に守られながら車線を素早く切り替え、迫り来る岩塊と発光する坑内虫の群れをかわして出口まで走り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走り抜けた秒数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 奥行きを疑似遠近で表現。遠くは小さく暗く、手前は大きく明るい
  var C = {
    bg: '#1a1008', bg2: '#3a2414', rail: '#2a1c10', railLine: '#8a6a3a',
    cart: '#ffb347', cartDark: '#a86a1a', rock: '#6a5040', bug: '#8bff6a',
    crystal: '#5ad4ff',
    good: '#5aff9a', bad: '#ff4d5e', gold: '#ffd24a', white: '#fff3e0', ink: '#100a06',
  };

  var GAME_TITLE = 'SHAFT RUN';
  var TIME_LIMIT = 20;
  var MAX_HIT = 3;
  var LANES = 3;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var CART_Y = H * 0.8;
  var VANISH_Y = H * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART_SPR = ['#####', '#####', '.###.'];
  var ROCK_SPR = ['.##.', '####', '####'];
  var BUG_SPR = ['#.#', '###', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffb347', pulse * 0.15);
    for (var l = 0; l < LANES; l++) {
      game.draw.line(LANE_X[l], VANISH_Y, LANE_X[l] - (LANE_X[l] - W * 0.5) * 2.2, CART_Y + 200, C.railLine, 2, 0.2);
    }
  }

  function laneXAt(lane, progress) {
    var vx = W * 0.5;
    var lx = LANE_X[lane];
    return vx + (lx - vx) * progress;
  }
  function yAt(progress) { return VANISH_Y + (CART_Y - VANISH_Y) * progress; }
  function scaleAt(progress) { return 6 + progress * 20; }

  var cartLane, hits, elapsed, halfCalled, obstacles, spawnTimer, power, holding;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    cartLane = 1; hits = 0; elapsed = 0; halfCalled = false;
    obstacles = []; spawnTimer = 0.9; power = 0; holding = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnObstacle() {
    var lane = Math.floor(game.random(0, LANES));
    var isCrystal = game.random(0, 1) < 0.28;
    obstacles.push({ lane: lane, progress: 0, isCrystal: isCrystal, resolved: false, seed: game.random(0, 10) });
  }

  function switchLane(dir) {
    if (ready > 0 || finished || done) return;
    cartLane = Math.max(0, Math.min(LANES - 1, cartLane + dir));
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) switchLane(x < W * 0.5 ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var SPEED_BASE = 0.62;
  function stepWorld(dt) {
    var speed = SPEED_BASE + Math.min(0.35, elapsed * 0.015);
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = 0.85 - Math.min(0.35, elapsed * 0.02); }
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.progress += speed * dt;
      if (o.progress >= 1 && !o.resolved) {
        o.resolved = true;
        if (o.lane === cartLane) {
          if (o.isCrystal) {
            power = Math.min(3, power + 1);
            game.feedback.good(LANE_X[cartLane], CART_Y, { text: '+1', color: C.crystal });
            game.audio.play('se_coin', 0.3);
            if (power >= 3) { power = 0; game.fx.popup('OVERCHARGE', W / 2, H * 0.3, { color: C.crystal, size: 34 }); game.audio.play('se_powerup', 0.4); }
          } else {
            hits++;
            hitStop = 0.28; shake = 0.3;
            game.feedback.bad(LANE_X[cartLane], CART_Y, { text: 'HIT' });
            game.audio.play('se_bad', 0.4);
            if (hits >= MAX_HIT) { ok = false; finished = true; finish(); return; }
          }
        } else if (o.isCrystal) {
          game.audio.play('se_tap', 0.05);
        }
      }
      if (o.progress >= 1.15) obstacles.splice(i, 1);
    }
  }

  function drawTrack() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var p = Math.min(1, o.progress);
      var x = laneXAt(o.lane, p), y = yAt(p), sc = scaleAt(p);
      var warn = p < 0.55;
      var col = o.isCrystal ? C.crystal : C.rock;
      if (warn) game.draw.circle(x, y, sc * 1.6, col, 0.18);
      game.draw.sprite(o.isCrystal ? ['.#.', '###', '.#.'] : ROCK_SPR, { '#': col }, x, y, sc, { anchor: 'center' });
    }
  }
  function drawCart() {
    var bob = Math.sin(game.time.elapsed * 10) * 3;
    var flash = hitStop > 0 && Math.floor(game.time.elapsed * 30) % 2 === 0;
    game.draw.circle(LANE_X[cartLane], CART_Y + 20, 60, C.cartDark, 0.4);
    game.draw.sprite(CART_SPR, { '#': flash ? '#ffffff' : C.cart }, LANE_X[cartLane], CART_Y + bob, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LANE_X[1], gy: CART_Y - 220, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) initGame();
    var danger = null, best = 2;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.isCrystal || o.resolved) continue;
      if (o.progress > 0.45 && o.progress < best) { best = o.progress; danger = o; }
    }
    if (danger && danger.lane === cartLane) {
      switchLane(danger.lane === 0 ? 1 : -1);
      demo.press = true;
    } else demo.press = false;
    demo.gx += (LANE_X[cartLane] - demo.gx) * Math.min(1, dt * 6);
    demo.gy = CART_Y - 220;
    stepWorld(dt);
    elapsed += dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (obstacles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTrack();
      drawCart();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTrack(); drawCart();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.floor(elapsed) + 's / ' + TIME_LIMIT + 's', W / 2, H * 0.13, 28, C.gold);
      if (!ok && elapsed >= TIME_LIMIT - 3) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(elapsed) * 10, { survived: Math.floor(elapsed), hits: hits });
        else game.end.failure({ survived: Math.floor(elapsed), hits: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsed += dt;
      stepWorld(dt);
      if (!halfCalled && elapsed >= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('折り返し!', LANE_X[cartLane], CART_Y - 140, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (elapsed >= TIME_LIMIT) { ok = true; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTrack();
    drawCart();

    txt(Math.min(TIME_LIMIT, Math.floor(elapsed)) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 30, C.white);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.ink, 0.5);
    game.draw.rect(60, 150, barW * Math.min(1, elapsed / TIME_LIMIT), 16, C.gold);
    for (var m2 = 0; m2 < MAX_HIT; m2++) game.draw.circle(W - 60 - m2 * 40, 210, 12, m2 < hits ? C.bad : '#4a3020');
    for (var p2 = 0; p2 < 3; p2++) game.draw.circle(60 + p2 * 36, 210, 12, p2 < power ? C.crystal : '#4a3020');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['G3', 0.2], ['B3', 0.2], ['E4', 0.35]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
