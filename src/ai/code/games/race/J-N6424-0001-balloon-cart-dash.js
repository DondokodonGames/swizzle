// J-N6424-0001-balloon-cart-dash.js
// 風船カート・ダッシュ — 風船を結んだ手作りカートを走らせ、飛来する障害物から風船を守り抜きゴールまで走り切る
// 操作: コースは自動で進む。飛来する棘の枝を見て、指を左右にホールドしてカートをレーンごと避ける
// 終わり: 規定時間、風船を割られずに走り切れば成功。3個割られれば失敗
// @mechanic: dodge
// @theme: balloon_cart_dash
// 世界観: 風船をいくつも結んだ手作りカートを走らせる少年が、飛来する棘の枝や石を避け続け風船を守り抜きゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 守り切った風船数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド、影で高さを示す、6〜8色
  var C = {
    bg: '#2a1a4a', bg2: '#1a0e2e', lane: '#4a3a7a', laneEdge: '#6a5aa0',
    cart: '#e06030', cartDark: '#a03a18', balloon1: '#ff4060', balloon2: '#40c0ff', balloon3: '#ffd400',
    hazard: '#7a3a20', hazardDark: '#4a2010',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#f0e8ff', white: '#ffffff',
  };

  var GAME_TITLE = 'BALLOON DASH';
  var RUN_TIME = 18;
  var LANES = 3;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var CART_Y = H * 0.72;
  var MAX_HITS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#100820', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART_SPR = ['.##.', '####', '####', '.##.'];
  var HAZ_SPR = ['#.#', '###', '#.#'];

  var lane, hazards, balloonsLeft, runClock, halfCalled, spawnTimer;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    for (var i = 0; i < LANES; i++) {
      game.draw.rect(LANE_X[i] - 90, H * 0.2, 180, H * 0.62, C.lane, 0.5);
      game.draw.rect(LANE_X[i] - 92, H * 0.2, 4, H * 0.62, C.laneEdge, 0.6);
      game.draw.rect(LANE_X[i] + 88, H * 0.2, 4, H * 0.62, C.laneEdge, 0.6);
    }
  }

  function drawCart(laneIdx, bcount) {
    var x = LANE_X[laneIdx];
    var colors = [C.balloon1, C.balloon2, C.balloon3];
    for (var b = 0; b < bcount; b++) {
      var by = CART_Y - 110 - b * 55 + Math.sin(game.time.elapsed * 3 + b) * 6;
      game.draw.circle(x + (b - 1) * 30, by, 26, colors[b % 3]);
      game.draw.line(x + (b - 1) * 30, by + 24, x, CART_Y - 30, colors[b % 3], 3);
    }
    game.draw.sprite(CART_SPR, { '#': C.cart }, x, CART_Y, 22, { anchor: 'center' });
  }

  function drawHazards() {
    for (var i = 0; i < hazards.length; i++) {
      var hz = hazards[i];
      var alpha = hz.warn > 0 ? (0.3 + 0.4 * Math.sin(game.time.elapsed * 20)) : 1;
      if (hz.warn > 0) {
        game.draw.rect(LANE_X[hz.lane] - 90, H * 0.24, 180, 40, C.bad, alpha * 0.5);
      } else {
        game.draw.sprite(HAZ_SPR, { '#': C.hazard }, LANE_X[hz.lane], hz.y, 16, { anchor: 'center' });
      }
    }
  }

  function initGame() {
    lane = 1; hazards = []; balloonsLeft = MAX_HITS; runClock = 0; halfCalled = false; spawnTimer = 1.1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function moveLane(dir) {
    if (finished || ready > 0) return;
    var nl = Math.max(0, Math.min(LANES - 1, lane + dir));
    if (nl === lane) { game.audio.play('se_tap', 0.06); return; }
    lane = nl;
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) moveLane(x < W / 2 ? -1 : 1);
  });
  game.onHold(function(x, y, duration) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.03); moveLane(x < W / 2 ? -1 : 1); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function spawnHazard() {
    var l = Math.floor(Math.random() * LANES);
    hazards.push({ lane: l, y: H * 0.24, warn: 0.6, speed: 620 + Math.random() * 120 });
  }

  var demo = { t: 0, gx: LANE_X[1], gy: CART_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { lane = 1; hazards = []; balloonsLeft = MAX_HITS; spawnTimer = 0.6; }
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 1.0 + Math.random() * 0.5; }
    for (var i = hazards.length - 1; i >= 0; i--) {
      var hz = hazards[i];
      if (hz.warn > 0) {
        hz.warn -= dt;
        if (hz.warn <= 0 && hz.lane === lane) {
          var nl = lane === 0 ? 1 : lane - 1;
          lane = nl; demo.gx = LANE_X[lane]; demo.press = true;
        }
      } else {
        hz.y += hz.speed * dt;
        if (hz.y > CART_Y + 40) hazards.splice(i, 1);
      }
    }
    demo.gy = CART_Y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hazards === undefined) initGame();
      stepDemo(dt);
      bg();
      drawHazards();
      drawCart(lane, balloonsLeft);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCart(lane, balloonsLeft);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(balloonsLeft + ' / ' + MAX_HITS, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.round(RUN_TIME - runClock) + 's!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(balloonsLeft, { balloonsLeft: balloonsLeft });
        else game.end.failure({ balloonsLeft: balloonsLeft });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      runClock += dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 0.85 + Math.random() * 0.5; }
      for (var i = hazards.length - 1; i >= 0; i--) {
        var hz = hazards[i];
        if (hz.warn > 0) {
          hz.warn -= dt;
          if (hz.warn <= 0) hz.y = H * 0.24;
        } else {
          hz.y += hz.speed * dt;
          if (hz.y > CART_Y - 20 && hz.y < CART_Y + 40 && hz.lane === lane) {
            hazards.splice(i, 1);
            balloonsLeft--;
            hitStop = 0.3; shake = 0.25;
            game.feedback.bad(LANE_X[lane], CART_Y, { text: 'MISS' });
            game.audio.play('se_bad', 0.4);
            if (balloonsLeft <= 0) {
              ok = false; finished = true;
              finish();
            }
            break;
          } else if (hz.y > CART_Y + 40) {
            hazards.splice(i, 1);
          }
        }
      }
      if (!halfCalled && runClock >= RUN_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (!finished && runClock >= RUN_TIME) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(LANE_X[lane], CART_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(LANE_X[lane], CART_Y, { color: C.gold, count: 20, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHazards();
    drawCart(lane, balloonsLeft);

    txt(balloonsLeft + ' / ' + MAX_HITS, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.min(1, runClock / RUN_TIME);
    game.draw.rect(60, 150, barW, 16, '#3a2a5a', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
