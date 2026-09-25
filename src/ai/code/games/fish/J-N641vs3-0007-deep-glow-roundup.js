// J-N641vs3-0007-deep-glow-roundup.js
// 深海発光生物ラウンドアップ — 逃げ惑う発光生物の群れを連続タップで追い詰めて全て捕獲する
// 操作: 画面内で泳ぎ回る発光生物を指で連続タップして追い詰める。3回当てれば1匹捕獲できる
// 終わり: 制限時間内に全ての発光生物を捕獲できれば成功。1匹でも残れば失敗
// @mechanic: chase
// @theme: deep_sea_glow_roundup
// 世界観: 深海探査員が、暗い海溝で散らばり逃げる発光生物の群れを制限時間内に連続タップで追い詰め、全て採集ネットに収める
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕獲した発光生物の数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、細かい光の粒
  var C = {
    bg: '#020b1a', bg2: '#041c33', diver: '#dfe8ff', diverDark: '#8aa0d8',
    glow: '#5ff2ff', glowDark: '#1899b0', hit: '#ffe36a', good: '#39e07a',
    badc: '#ff4d5e', gold: '#ffd400', ink: '#eaf6ff',
  };

  var GAME_TITLE = 'GLOW ROUNDUP';
  var TIME_LIMIT = 20;
  var GOAL = 4;
  var HP_PER = 3;
  var CATCH_R = 100;
  var FLEE_SPEED = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000814', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPR = ['.##.', '####', '.##.', '.##.'];
  var GLOW_SPR = ['.#.', '###', '.#.'];

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 14; i++) {
      var px = (i * 137) % W;
      var py = (i * 91 + t * 30) % H;
      game.draw.circle(px, py, 3, '#5ff2ff', 0.25 + 0.2 * Math.sin(t * 2 + i));
    }
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.2);
    game.draw.rect(0, 0, W, H, C.glow, pulse * 0.3);
    game.draw.sprite(DIVER_SPR, { '#': C.diverDark }, W * 0.5, H * 0.90, 20, { anchor: 'center', alpha: 0.5 });
  }

  function drawCreature(cr) {
    if (cr.caught) return;
    var frame = Math.floor(game.time.elapsed * 6 + cr.seed) % 2 === 0;
    var pal = { '#': cr.flash > 0 ? C.hit : C.glow };
    game.draw.sprite(GLOW_SPR, pal, cr.x, cr.y + (frame ? -4 : 4), 26, { anchor: 'center' });
    // stamina pips
    for (var i = 0; i < HP_PER; i++) {
      game.draw.circle(cr.x - 20 + i * 20, cr.y - 44, 5, i < (HP_PER - cr.hp) ? C.hit : C.glowDark);
    }
  }

  var creatures, caughtCount, timeLeft, milestoneCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function spawnCreatures() {
    creatures = [];
    for (var i = 0; i < GOAL; i++) {
      creatures.push({
        x: W * (0.2 + 0.6 * Math.random()), y: H * (0.3 + 0.35 * Math.random()),
        vx: (Math.random() < 0.5 ? 1 : -1) * (100 + Math.random() * 60),
        vy: (Math.random() < 0.5 ? 1 : -1) * (60 + Math.random() * 40),
        hp: HP_PER, flash: 0, caught: false, seed: Math.random() * 10,
      });
    }
  }

  function initGame() {
    spawnCreatures(); caughtCount = 0; timeLeft = TIME_LIMIT; milestoneCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptTap(x, y) {
    var nearest = null, nd = 1e9;
    for (var i = 0; i < creatures.length; i++) {
      var cr = creatures[i];
      if (cr.caught) continue;
      var d = Math.hypot(cr.x - x, cr.y - y);
      if (d < CATCH_R && d < nd) { nd = d; nearest = cr; }
    }
    if (!nearest) {
      game.audio.play('se_tap', 0.15);
      game.fx.flash('#5ff2ff', 0.05);
      return;
    }
    nearest.hp--;
    nearest.flash = 0.15;
    var away = Math.hypot(nearest.x - x, nearest.y - y) || 1;
    nearest.vx = (nearest.x - x) / away * FLEE_SPEED * 1.4;
    nearest.vy = (nearest.y - y) / away * FLEE_SPEED * 1.4;
    if (nearest.hp <= 0) {
      nearest.caught = true; caughtCount++;
      game.feedback.good(nearest.x, nearest.y, { text: caughtCount >= GOAL ? 'CLEAR' : 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      game.fx.burst(nearest.x, nearest.y, { color: C.gold, count: 16, speed: 340 });
      if (!milestoneCalled && caughtCount >= Math.ceil(GOAL / 2)) {
        milestoneCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (caughtCount >= GOAL) winRun();
    } else {
      game.feedback.good(nearest.x, nearest.y, { text: '', color: C.hit, count: 4 });
      game.audio.play('se_tap', 0.25);
    }
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.2;
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.25; hitStop = 0.3;
    game.feedback.bad(W * 0.5, H * 0.5, { text: 'MISS' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) attemptTap(x, y);
  });

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { spawnCreatures(); caughtCount = 0; demo.idx = 0; }
    for (var i = 0; i < creatures.length; i++) {
      var cr = creatures[i];
      if (cr.caught) continue;
      cr.x += cr.vx * dt; cr.y += cr.vy * dt;
      if (cr.x < 100 || cr.x > W - 100) cr.vx *= -1;
      if (cr.y < H * 0.22 || cr.y > H * 0.66) cr.vy *= -1;
      if (cr.flash > 0) cr.flash -= dt;
    }
    var target = null;
    for (var k = 0; k < creatures.length; k++) { if (!creatures[k].caught) { target = creatures[k]; break; } }
    if (target) {
      demo.gx += (target.x - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (target.y - demo.gy) * Math.min(1, dt * 3);
      if (Math.hypot(target.x - demo.gx, target.y - demo.gy) < 30 && Math.floor(cyc * 3) % 2 === 0) {
        demo.press = true;
        attemptTap(demo.gx, demo.gy);
      } else demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (creatures === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      for (var i = 0; i < creatures.length; i++) drawCreature(creatures[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      for (var j = 0; j < creatures.length; j++) drawCreature(creatures[j]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.badc);
      txt(caughtCount + ' / ' + GOAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL - caughtCount) + '匹!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caughtCount, { caught: caughtCount, goal: GOAL });
        else game.end.failure({ caught: caughtCount, goal: GOAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      for (var k = 0; k < creatures.length; k++) {
        var cr = creatures[k];
        if (cr.caught) continue;
        cr.x += cr.vx * dt; cr.y += cr.vy * dt;
        if (cr.x < 100 || cr.x > W - 100) cr.vx *= -1;
        if (cr.y < H * 0.22 || cr.y > H * 0.66) cr.vy *= -1;
        cr.vx *= Math.pow(0.5, dt);
        cr.vy *= Math.pow(0.5, dt);
        if (Math.hypot(cr.vx, cr.vy) < 60) { cr.vx += (Math.random() - 0.5) * 40; cr.vy += (Math.random() - 0.5) * 40; }
        if (cr.flash > 0) cr.flash -= dt;
      }
      if (timeLeft <= 0) { timeLeft = 0; loseRun(); }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    for (var m = 0; m < creatures.length; m++) drawCreature(creatures[m]);

    txt(caughtCount + ' / ' + GOAL, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#0d3350', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.badc : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 120, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
