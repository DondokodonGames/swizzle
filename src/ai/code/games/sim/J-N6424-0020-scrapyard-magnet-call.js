// J-N6424-0020-scrapyard-magnet-call.js
// スクラップヤード磁力コール — 3本のシュートを流れる部品から本物の金属だけを瞬時に見極めて磁石を落とす
// 操作: 中央/左/右いずれかのシュートに金属部品が来た瞬間、その列をタップして電磁石を落とす
// 終わり: 規定個数の金属を正しく回収できれば成功。非金属に3回落とす/時間切れで失敗
// @mechanic: judge
// @theme: scrapyard_magnet_sort
// 世界観: 廃品置き場の電磁石オペレーターが、流れてくる部品の中から光る本物の金属だけを瞬時に見極めて磁力で吸い上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 回収した金属数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: リベット・金属光沢の帯を横ストリップで表現、影は控えめグラデ
  var C = {
    bg: '#5a5248', bg2: '#332e28', rail: '#726a5c', railDark: '#443f36',
    metal: '#ffd24a', metalCore: '#fff4c2', junk: '#8b7d68', junkDark: '#5c5142',
    magnet: '#3d3a35', magnetRim: '#c0392b', good: '#39c96a', bad: '#ff4d5e',
    gold: '#ffd24a', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'MAGNET CALL';
  var LANES = 3;
  var LANE_X = [W * 0.22, W * 0.5, W * 0.78];
  var CATCH_Y = H * 0.62;
  var NEED = 6;
  var MAX_MISS = 3;
  var MAX_TIME = 14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#1a1712', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OPERATOR = ['.##.', '####', '.#.#', '.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.gold, pulse * 0.25);
    for (var l = 0; l < LANES; l++) {
      game.draw.rect(LANE_X[l] - 90, H * 0.16, 180, H * 0.62, C.rail, 1);
      game.draw.rect(LANE_X[l] - 90, H * 0.16, 180, H * 0.62, C.railDark, 0.25);
    }
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(OPERATOR, { '#': C.gold }, W * 0.5, H * 0.9 + bob, 9, { anchor: 'center' });
  }

  var items, magFlash, spawnT, misses, hits, halfCalled, roundClock;

  function spawnItem() {
    var lane = Math.floor(game.random(0, LANES));
    var isMetal = Math.random() < 0.5;
    items.push({ lane: lane, y: H * 0.12, metal: isMetal, dead: false });
  }

  function initGame() {
    items = []; magFlash = [0, 0, 0]; spawnT = 0.9;
    misses = 0; hits = 0; halfCalled = false; roundClock = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var done, endWait, finished, ready, hitStop, shake;

  function drawItems(list) {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.dead) continue;
      var x = LANE_X[it.lane];
      if (it.metal) {
        game.draw.circle(x, it.y, 34, C.metal);
        game.draw.circle(x, it.y, 18, C.metalCore, 0.7);
      } else {
        game.draw.rect(x - 32, it.y - 24, 64, 48, C.junk);
        game.draw.rect(x - 32, it.y - 24, 64, 12, C.junkDark, 0.5);
      }
    }
    for (var l2 = 0; l2 < LANES; l2++) {
      var f = magFlash[l2];
      game.draw.rect(LANE_X[l2] - 44, CATCH_Y - 18, 88, 36, C.magnet);
      game.draw.rect(LANE_X[l2] - 44, CATCH_Y - 18, 88, 8, C.magnetRim, 0.6 + f * 0.4);
      if (f > 0) game.draw.circle(LANE_X[l2], CATCH_Y, 60 + (1 - f) * 40, C.gold, f * 0.5);
    }
  }

  function resolveLane(lane, x, y) {
    if (finished || ready > 0) return;
    var best = null, bestDist = 999;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead || it.lane !== lane) continue;
      var dist = Math.abs(it.y - CATCH_Y);
      if (dist < 130 && dist < bestDist) { best = it; bestDist = dist; }
    }
    magFlash[lane] = 1;
    if (!best) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      return;
    }
    best.dead = true;
    if (best.metal) {
      hits++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      game.fx.burst(x, CATCH_Y, { color: C.gold, count: 12, speed: 300 });
      if (!halfCalled && hits >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', x, y - 70, { color: C.gold, size: 32 }); }
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(x, CATCH_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      misses++;
      hitStop = 0.3; shake = 0.25;
      game.fx.flash(C.bad, 0.15);
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      if (misses >= MAX_MISS) {
        finished = true; ok = false;
        finish();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var lane = 0, best = 1e9;
      for (var l = 0; l < LANES; l++) { var dd = Math.abs(x - LANE_X[l]); if (dd < best) { best = dd; lane = l; } }
      resolveLane(lane, x, y);
    }
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepItems(dt) {
    spawnT -= dt;
    if (spawnT <= 0) { spawnItem(); spawnT = 0.85 + Math.random() * 0.4; }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.dead) { items.splice(i, 1); continue; }
      it.y += 420 * dt;
      if (it.y > H * 0.78) {
        items.splice(i, 1);
        if (it.metal) {
          misses++;
          hitStop = 0.25; shake = 0.2;
          game.feedback.bad(LANE_X[it.lane], CATCH_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.3);
          if (misses >= MAX_MISS) { finished = true; ok = false; finish(); }
        }
      }
    }
    for (var l2 = 0; l2 < LANES; l2++) if (magFlash[l2] > 0) magFlash[l2] = Math.max(0, magFlash[l2] - dt * 3);
  }

  var demo = { t: 0, gx: LANE_X[1], gy: CATCH_Y, press: false };
  function resetDemo() {
    items = []; magFlash = [0, 0, 0]; hits = 0; misses = 0;
    items.push({ lane: 0, y: H * 0.2, metal: false, dead: false });
    items.push({ lane: 1, y: H * 0.36, metal: true, dead: false });
    items.push({ lane: 2, y: H * 0.16, metal: false, dead: false });
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    for (var i = 0; i < items.length; i++) items[i].y += 380 * dt;
    var target = null, bd = 999;
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.metal && !it.dead) { var dist = Math.abs(it.y - CATCH_Y); if (dist < bd) { bd = dist; target = it; } }
    }
    if (target) {
      demo.gx = LANE_X[target.lane]; demo.gy = CATCH_Y;
      if (target.y >= CATCH_Y - 30 && !target.dead) {
        target.dead = true;
        hits++;
        magFlash[target.lane] = 1;
        game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.25);
      }
    }
    for (var k = 0; k < items.length; k++) if (magFlash[k] > 0) magFlash[k] = Math.max(0, magFlash[k] - dt * 3);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      bg();
      drawItems(items);
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawItems(items);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '個!', W / 2, H * 0.18, 24, C.ink);
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
      stepItems(dt);
      maxTimeTick(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawItems(items);
    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 28, C.ink);
    txt('MISS ' + misses + '/' + MAX_MISS, W * 0.84, H * 0.06, 20, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  function maxTimeTick(dt) {
    roundClock += dt;
    if (roundClock >= MAX_TIME) {
      finished = true; ok = false;
      game.feedback.bad(W / 2, CATCH_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.45]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
