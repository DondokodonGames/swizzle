// J-N6424-0029-festival-rake-haul.js
// 縁日レーキハウル — 降ってくる縁起物のコインだけを熊手でかき集め、石ころは避ける
// 操作: 指で熊手を左右にドラッグして真下を通るコインを受け止める。石ころには触れない
// 終わり: 規定個数のコインを集めれば成功。石ころを3回受ける/時間切れで失敗
// @mechanic: drag_follow
// @theme: festival_rake_haul
// 世界観: 縁日の屋台に立つ参加者が、降ってくる縁起物のコインだけを熊手でかき集め、混じる石ころを避ける
// 残るもの: 正誤(CLEAR/GAME OVER) + かき集めたコイン数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 濃い夜店の紺に暖色ネオン、走査線は使わずソリッドな帯
  var C = {
    bg: '#241333', bg2: '#0f0819', lantern: '#ff8a3d', stall: '#5a3a6a',
    coin: '#ffd93d', coinDark: '#c79a1e', rock: '#6a6258', rockDark: '#3a352c',
    rake: '#8a6a4a', rakeHead: '#c99a5a', good: '#39c96a', bad: '#ff4d5e',
    gold: '#ffd93d', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'RAKE HAUL';
  var RAKE_Y = H * 0.78;
  var NEED = 8;
  var MAX_MISS = 3;
  var MAX_TIME = 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0f0819', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALLKEEPER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.05 + 0.05 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.lantern, pulse * 0.15);
    game.draw.circle(W * 0.14, H * 0.14, 40, C.lantern, 0.5);
    game.draw.circle(W * 0.86, H * 0.14, 40, C.lantern, 0.5);
    game.draw.rect(0, H * 0.9, W, H * 0.1, C.stall);
  }

  var items, rakeX, hits, misses, halfCalled, roundClock, spawnT;
  var done, endWait, finished, ready, hitStop, shake;

  function spawnItem() {
    var isCoin = Math.random() < 0.62;
    items.push({ x: W * 0.14 + Math.random() * W * 0.72, y: H * 0.1, coin: isCoin, dead: false });
  }

  function initGame() {
    items = []; spawnT = 0.7; rakeX = W * 0.5;
    hits = 0; misses = 0; halfCalled = false; roundClock = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead) continue;
      if (it.coin) {
        game.draw.circle(it.x, it.y, 30, C.coinDark);
        game.draw.circle(it.x, it.y, 22, C.coin);
      } else {
        game.draw.circle(it.x, it.y, 28, C.rockDark);
        game.draw.circle(it.x, it.y, 18, C.rock);
      }
    }
    game.draw.rect(rakeX - 90, RAKE_Y, 180, 16, C.rakeHead);
    for (var t = 0; t < 5; t++) game.draw.line(rakeX - 80 + t * 40, RAKE_Y + 16, rakeX - 80 + t * 40, RAKE_Y + 46, C.rake, 8);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(STALLKEEPER, { '#': C.ink }, W * 0.5, H * 0.9 + bob, 10, { anchor: 'center' });
  }

  function moveRake(x) {
    rakeX = Math.max(W * 0.14, Math.min(W * 0.86, x));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.06); moveRake(x); }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) {
      if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
      moveRake(x);
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
    if (spawnT <= 0) { spawnItem(); spawnT = 0.55 + Math.random() * 0.35; }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.dead) { items.splice(i, 1); continue; }
      it.y += 460 * dt;
      if (Math.abs(it.x - rakeX) < 90 && it.y >= RAKE_Y - 10 && it.y <= RAKE_Y + 30) {
        it.dead = true;
        if (it.coin) {
          hits++;
          game.feedback.good(it.x, RAKE_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.4);
          game.fx.burst(it.x, RAKE_Y, { color: C.gold, count: 14, speed: 320 });
          if (!halfCalled && hits >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', it.x, RAKE_Y - 70, { color: C.gold, size: 30 }); }
          if (hits >= NEED) {
            finished = true; ok = true; hitStop = 0.3;
            game.feedback.good(it.x, RAKE_Y, { text: 'CLEAR', color: C.good });
            game.audio.play('se_success', 0.5);
            finish();
          }
        } else {
          misses++;
          hitStop = 0.25; shake = 0.2;
          game.fx.flash(C.bad, 0.15);
          game.feedback.bad(it.x, RAKE_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          if (misses >= MAX_MISS) { finished = true; ok = false; finish(); }
        }
        continue;
      }
      if (it.y > H * 0.94) items.splice(i, 1);
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: RAKE_Y, press: true };
  function resetDemo() {
    items = []; hits = 0; misses = 0; rakeX = W * 0.5;
    items.push({ x: W * 0.3, y: H * 0.12, coin: true, dead: false });
    items.push({ x: W * 0.7, y: H * 0.2, coin: false, dead: false });
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    for (var i = 0; i < items.length; i++) items[i].y += 380 * dt;
    var target = null, bd = 1e9;
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.coin && !it.dead && it.y < bd) { bd = it.y; target = it; }
    }
    if (target) {
      moveRake(target.x); demo.gx = rakeX; demo.gy = RAKE_Y;
      if (target.y >= RAKE_Y - 10 && !target.dead) {
        target.dead = true; hits++;
        game.feedback.good(target.x, RAKE_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.25);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      bg();
      drawItems();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawItems();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '個!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
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
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false;
        game.feedback.bad(rakeX, RAKE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawItems();
    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 26, C.ink);
    txt('MISS ' + misses + '/' + MAX_MISS, W * 0.84, H * 0.06, 18, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F#4', 0.25], ['A4', 0.25], ['D5', 0.45]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
