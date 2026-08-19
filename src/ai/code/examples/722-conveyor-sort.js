// 722-conveyor-sort.js
// 郵袋仕分け — 流れてくる袋を、行き先の棚へ上下に振り分ける
// 操作: 手元に来た袋を、行き先の側へ上または下にスワイプ
// 成功: 12袋 仕分ける  失敗: 3回 誤配 or 13秒
// @mechanic: swipe_direction
// @theme: western
// 世界観: 西部の駅馬車郵便局。行き先の違う袋が一本のベルトで流れてくる
// variation: 精度型(ベルトが速くなり、袋の間隔が詰まっていく)
// spice: 黄金ターゲット(稀に金の袋。正しく振ると得点3倍)
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HOME: 3色 + 黒。輪郭線は持たない
  var C = { black: '#0b0b12', cream: '#e8d8a0', rust: '#c85a2a', sky: '#4a9ad4', white: '#ffffff' };

  var GAME_TITLE = 'MAIL SORT';
  var MAX_TIME = 13;
  var NEEDED = 12;
  var MISS_LIMIT = 3;

  var LANE_Y = H * 0.56;        // ベルトの高さ
  var GATE_X = W * 0.30;        // ここを過ぎると仕分けできない
  var TOP_Y = H * 0.30;
  var BOT_Y = H * 0.80;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var bags, sorted, misses, score, totalTime, done, spawnTimer, beltX;
  var ready, hitStop, feedback, feedbackOk, shake;

  // 郵袋(2フレーム: ベルトで揺れる)
  var BAG_A = [
    '.RRRR.',
    'RRRRRR',
    'RRKKRR',
    'RRRRRR',
    'RRRRRR',
    '.RRRR.',
  ];
  var BAG_B = [
    '.RRRR.',
    'RRRRRR',
    'RRRRRR',
    'RRKKRR',
    'RRRRRR',
    '.RRRR.',
  ];
  var UP_COL = { R: C.sky, K: C.black };
  var DOWN_COL = { R: C.rust, K: C.black };
  var GOLD_COL = { R: C.cream, K: C.black };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.16); }

  function officeBg() {
    game.draw.gradient(0, H, [[0, '#4a3520'], [0.5, '#2c1f14'], [1, '#160f0a']]);
    // 遠景: 板壁のタイル反復(8bit HOMEの要)
    for (var ry = 0; ry < 12; ry++) {
      for (var rx = 0; rx < 9; rx++) {
        var px = rx * 128 + (ry % 2 ? 64 : 0);
        game.draw.rect(px, ry * 170, 120, 10, '#6a4c2a');
      }
    }
    // 上下の棚(行き先)。色が行き先そのもの
    game.draw.rect(0, TOP_Y - 110, W, 150, C.sky, 0.45);
    game.draw.rect(0, TOP_Y + 40, W, 12, C.sky);
    game.draw.sprite(BAG_A, UP_COL, W * 0.5, TOP_Y - 34, 18, { anchor: 'center' });
    game.draw.rect(0, BOT_Y - 40, W, 150, C.rust, 0.45);
    game.draw.rect(0, BOT_Y - 52, W, 12, C.rust);
    game.draw.sprite(BAG_A, DOWN_COL, W * 0.5, BOT_Y + 36, 18, { anchor: 'center' });
    // ベルト(1方向スクロール)
    game.draw.rect(0, LANE_Y - 70, W, 140, '#7a6244');
    for (var t = 0; t < 20; t++) {
      var tx = ((t * 90 + beltX) % (W + 180)) - 90;
      game.draw.rect(tx, LANE_Y - 70, 44, 140, '#5c4830');
    }
    // 仕分け線(ここを過ぎると届かない = telegraph)
    game.draw.rect(GATE_X, LANE_Y - 80, 6, 160, C.cream, 0.8);
  }

  function spawn() {
    var tight = Math.min(1, sorted / NEEDED);
    var gold = Math.random() < 0.12;
    bags.push({
      x: W + 80,
      up: Math.random() < 0.5,
      gold: gold,
      speed: 300 + tight * 220,
      state: 'belt',
      vy: 0,
      y: LANE_Y,
      pop: 0,
    });
  }

  function initGame() {
    bags = []; sorted = 0; misses = 0; score = 0; totalTime = 0; done = false;
    spawnTimer = 0.15; beltX = 0; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = score;
    game.audio.stopBgm();
    if (success) {
      game.audio.play('se_success');
    } else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.rust, 0.25);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function headBag() {
    // 仕分け線より右にある、いちばん手前の袋
    var best = null;
    for (var i = 0; i < bags.length; i++) {
      var b = bags[i];
      if (b.state !== 'belt' || b.x < GATE_X) continue;
      if (!best || b.x < best.x) best = b;
    }
    return best;
  }

  function sort(dir) {
    var b = headBag();
    if (!b) return;
    var correct = (dir === 'up' && b.up) || (dir === 'down' && !b.up);
    if (correct) {
      sorted++;
      var gain = b.gold ? 300 : 100;
      score += gain;
      b.state = 'fly';
      b.vy = dir === 'up' ? -1500 : 1500;
      b.pop = 0.2;
      feedback = 0.3; feedbackOk = true;
      game.feedback.good(b.x, b.y, { text: '+' + gain, color: b.gold ? C.cream : C.sky });
      game.audio.play(b.gold ? 'se_milestone' : 'se_success', 0.5);
      if (sorted >= NEEDED) finish(true);
    } else {
      misses++;
      b.state = 'fly';
      b.vy = dir === 'up' ? -1500 : 1500;
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.3; shake = 0.3;
      game.audio.play('se_failure', 0.6);
      game.feedback.bad(b.x, b.y, { text: 'MISS' });
      if (misses >= MISS_LIMIT) finish(false);
    }
  }

  function drawBag(b) {
    var wob = Math.floor(game.time.elapsed * 10 + b.x * 0.02) % 2 === 0;
    var col = b.gold ? GOLD_COL : (b.up ? UP_COL : DOWN_COL);
    var scale = 21 * (1 + b.pop * 1.5);
    // telegraph: 仕分け線に近い袋は足元が光り「次はこれ」と示す
    if (b.state === 'belt' && b === headBag()) {
      game.draw.circle(b.x, b.y + 70, 40, C.cream, 0.35);
    }
    if (b.gold) game.draw.circle(b.x, b.y, 70, C.cream, 0.22);
    game.draw.sprite(wob ? BAG_A : BAG_B, col, b.x, b.y, scale, { anchor: 'center' });
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (dir === 'up' || dir === 'down') sort(dir);
  });

  // ── ATTRACT ゴースト実演: 手が袋に添えられ、色の側へ振る ──
  var demo = { t: 0, gx: W * 0.5, gy: LANE_Y, press: false, bx: W + 60, up: true };
  function stepDemo(dt) {
    demo.t += dt;
    demo.bx -= 320 * dt;
    if (demo.bx < GATE_X - 100) { demo.bx = W + 60; demo.up = !demo.up; }
    var atGate = demo.bx < W * 0.62 && demo.bx > GATE_X;
    if (atGate) {
      var ty = demo.up ? TOP_Y : BOT_Y;
      demo.gx += (demo.bx - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 3);
      if (!demo.press) {
        demo.press = true;
        game.feedback.good(demo.bx, LANE_Y, { text: '+100', color: demo.up ? C.sky : C.rust });
      }
    } else {
      demo.press = false;
      demo.gy += (LANE_Y - demo.gy) * Math.min(1, dt * 4);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      beltX = (beltX - 180 * dt) % 10000;
      officeBg();
      stepDemo(dt);
      var wob0 = Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.sprite(wob0 ? BAG_A : BAG_B, demo.up ? UP_COL : DOWN_COL, demo.bx, LANE_Y, 21, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.cream);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.sky);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.rust);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.cream);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, '#7a6a48');
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      officeBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 96, resultSuccess ? C.sky : C.rust);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.55, 58, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.62, 44, C.sky);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.70, 54, C.cream);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.75, 46, C.cream);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        beltX = (beltX - 260 * dt) % 10000;
        if (totalTime >= MAX_TIME) { finish(false); return; }
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = Math.max(0.42, 0.85 - sorted * 0.035);
        }
        for (var i = bags.length - 1; i >= 0; i--) {
          var b = bags[i];
          if (b.state === 'belt') {
            b.x -= b.speed * dt;
            if (b.x < -80) {
              // 仕分けそびれ = 誤配と同じ重さで数える
              bags.splice(i, 1);
              misses++;
              feedback = 0.4; feedbackOk = false;
              game.audio.play('se_failure', 0.5);
              game.feedback.bad(60, LANE_Y, { text: 'MISS' });
              if (misses >= MISS_LIMIT) { finish(false); return; }
            }
          } else {
            b.y += b.vy * dt;
            b.x -= b.speed * 0.3 * dt;
            if (b.y < -100 || b.y > H + 100) bags.splice(i, 1);
          }
          if (b.pop > 0) b.pop -= dt;
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    officeBg();
    for (var k = 0; k < bags.length; k++) drawBag(bags[k]);

    // HUD
    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 22, '#5c4830');
    game.draw.rect(60, 40, (W - 120) * frac, 22, frac < 0.25 ? C.rust : C.sky);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 92, 42, C.cream);
    txt(sorted + ' / ' + NEEDED, W * 0.16, 150, 44, C.sky);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.rect(W * 0.80 + m * 52, 134, 40, 30, m < (MISS_LIMIT - misses) ? C.cream : '#5c4830');
    }

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 96, C.cream);
    if (feedback > 0 && !feedbackOk && NEEDED - sorted <= 3) txt('あと' + (NEEDED - sorted) + '袋', W / 2, H * 0.24, 50, C.cream);

    scanlines();
  });

  game.onStart(function() {
    // 8bit HOME: 矩形波2 + 三角ベースの素朴な行進曲
    game.audio.melody(
      [['G4', 0.25], ['G4', 0.25], ['E4', 0.5], ['G4', 0.25], ['A4', 0.25], ['G4', 0.5],
       ['F4', 0.25], ['E4', 0.25], ['D4', 0.5], ['E4', 0.5], ['G4', 0.5]],
      { tempo: 150, wave: 'square', volume: 0.09, loop: true,
        bass: [['C3', 0.5], ['C3', 0.5], ['G2', 0.5], ['G2', 0.5]], bassWave: 'triangle', bassVolume: 0.07 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
