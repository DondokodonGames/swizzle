// D-20132016-0064-hollow-corridor-follow.js
// ホロウコリドーフォロー — 指に付いてくる小さな冒険者を導き、体当たりで雑魚を倒しながら罠を避けて出口へ進む
// 操作: 指でなぞった位置に冒険者がゆっくり付いてくる。雑魚には自然にぶつけて倒し、罠の光る床は避けて通る
// 終わり: 出口に制限時間内で着けば成功。罠に触れるか時間切れなら失敗
// @mechanic: drag_follow
// @theme: hollow_corridor_delve
// 世界観: 地下回廊に迷い込んだ小さな冒険者が、指の導きに付いてきながら行く手の弱い影を体当たりで蹴散らし、光る罠床を避けて奥の出口を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 倒した雑魚数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめ低解像度スプライト、太い輪郭線、彩度は中〜高
  var C = {
    bg: '#241018', bg2: '#341624', wall: '#4a2032', floor: '#1c0c14',
    hero: '#ffd23a', enemy: '#7fd8ff', enemyDk: '#2a7aa8', hazard: '#ff3d4d', hazardDk: '#7a0f18',
    exit: '#3ddc84', good: '#3ddc84', bad: '#ff4d5e', gold: '#ffd400', white: '#fff2f6', ink: '#160810',
  };

  var GAME_TITLE = 'HOLLOW DELVE';
  var TIME_LIMIT = 13;
  var START = { x: W * 0.5, y: H * 0.84 };
  var EXIT = { x: W * 0.5, y: H * 0.16, r: 90 };
  var ENEMIES = [
    { x: W * 0.30, y: H * 0.66, r: 68 },
    { x: W * 0.70, y: H * 0.48, r: 68 },
    { x: W * 0.50, y: H * 0.26, r: 68 },
  ];
  var HAZARDS = [
    { x: W * 0.70, y: H * 0.60, r: 62 },
    { x: W * 0.30, y: H * 0.38, r: 62 },
  ];
  var HERO_R = 26;
  var FOLLOW_RATE = 6.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var heroX, heroY, targetX, targetY, hasTarget, enemyAlive, defeated, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_S = ['.##.', '####', '.##.', '#..#'];
  var ENEMY_S = ['....', '.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(80, H * 0.12, W - 160, H * 0.66, C.floor);
    game.draw.rect(80, H * 0.12, W - 160, 14, C.wall);
    game.draw.rect(80, H * 0.12 + H * 0.66 - 14, W - 160, 14, C.wall);
    game.draw.line(START.x, START.y, EXIT.x, EXIT.y, '#ffffff', 3);
  }

  function drawExit(t) {
    var pulse = 0.5 + 0.3 * Math.sin(t * 3);
    game.draw.circle(EXIT.x, EXIT.y, EXIT.r + 16, C.exit, 0.15 + 0.1 * pulse);
    game.draw.circle(EXIT.x, EXIT.y, EXIT.r * 0.6, C.exit, 0.5);
  }

  function drawHazards(t) {
    for (var i = 0; i < HAZARDS.length; i++) {
      var hz = HAZARDS[i];
      var pulse = 0.35 + 0.25 * Math.sin(t * 5 + i);
      game.draw.circle(hz.x, hz.y, hz.r, C.hazardDk, 0.5);
      game.draw.circle(hz.x, hz.y, hz.r * 0.55, C.hazard, pulse);
    }
  }

  function drawEnemies(bob) {
    for (var i = 0; i < ENEMIES.length; i++) {
      if (!enemyAlive[i]) continue;
      var e = ENEMIES[i];
      game.draw.circle(e.x, e.y, e.r * 0.6, C.enemyDk, 0.5);
      game.draw.sprite(ENEMY_S, { '#': C.enemy }, e.x, e.y + bob, 14, { anchor: 'center' });
    }
  }

  function drawHero(x, y) {
    game.draw.circle(x, y, HERO_R + 6, C.hero, 0.2);
    game.draw.sprite(HERO_S, { '#': C.hero }, x, y, 12, { anchor: 'center' });
  }

  function initGame() {
    heroX = START.x; heroY = START.y; targetX = START.x; targetY = START.y; hasTarget = false;
    enemyAlive = ENEMIES.map(function() { return true; });
    defeated = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function setTarget(x, y) { targetX = x; targetY = y; hasTarget = true; }

  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.05); setTarget(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) setTarget(x, y); });

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

  function checkCollisions() {
    for (var i = 0; i < ENEMIES.length; i++) {
      if (!enemyAlive[i]) continue;
      var e = ENEMIES[i];
      if (Math.hypot(heroX - e.x, heroY - e.y) < HERO_R + e.r * 0.5) {
        enemyAlive[i] = false; defeated++;
        hitStop = 0.1;
        game.feedback.good(e.x, e.y, { text: 'GOOD', color: C.good });
        game.fx.burst(e.x, e.y, { color: C.good, count: 14, speed: 320 });
        game.audio.play('se_break', 0.4);
        if (defeated === Math.ceil(ENEMIES.length / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.5, { color: C.gold, size: 34 });
      }
    }
    for (var j = 0; j < HAZARDS.length; j++) {
      var hz = HAZARDS[j];
      if (Math.hypot(heroX - hz.x, heroY - hz.y) < HERO_R + hz.r * 0.55) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(heroX, heroY, { text: 'HIT' });
        game.audio.play('se_bad', 0.4);
        finish();
        return;
      }
    }
    if (Math.hypot(heroX - EXIT.x, heroY - EXIT.y) < EXIT.r * 0.5) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(EXIT.x, EXIT.y, { text: 'CLEAR', color: C.good });
      game.fx.burst(EXIT.x, EXIT.y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  var demo = { t: 0, gx: START.x, gy: START.y, press: true };
  var DEMO_WP = [START, { x: W * 0.30, y: H * 0.72 }, ENEMIES[0], { x: W * 0.42, y: H * 0.5 }, ENEMIES[1],
    { x: W * 0.50, y: H * 0.34 }, ENEMIES[2], EXIT];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      heroX = START.x; heroY = START.y;
      enemyAlive = ENEMIES.map(function() { return true; });
      defeated = 0;
    }
    var segDur = 3.2 / (DEMO_WP.length - 1);
    var segIdx = Math.min(DEMO_WP.length - 2, Math.floor(cyc / segDur));
    var segT = Math.min(1, (cyc - segIdx * segDur) / segDur);
    var a = DEMO_WP[segIdx], b = DEMO_WP[segIdx + 1];
    var tx = a.x + (b.x - a.x) * segT, ty = a.y + (b.y - a.y) * segT;
    demo.gx = tx; demo.gy = ty; demo.press = true;
    heroX += (tx - heroX) * Math.min(1, dt * FOLLOW_RATE);
    heroY += (ty - heroY) * Math.min(1, dt * FOLLOW_RATE);
    for (var i = 0; i < ENEMIES.length; i++) {
      if (!enemyAlive[i]) continue;
      var e = ENEMIES[i];
      if (Math.hypot(heroX - e.x, heroY - e.y) < HERO_R + e.r * 0.5) {
        enemyAlive[i] = false; defeated++;
        game.feedback.good(e.x, e.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_break', 0.25);
      }
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;

    if (state === S.ATTRACT) {
      if (heroX === undefined) initGame();
      bg();
      stepDemo(dt);
      drawHazards(game.time.elapsed);
      drawExit(game.time.elapsed);
      drawEnemies(bob);
      drawHero(heroX, heroY);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHazards(game.time.elapsed);
      drawExit(game.time.elapsed);
      drawEnemies(bob);
      drawHero(heroX, heroY);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(defeated + ' / ' + ENEMIES.length, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(defeated, { defeated: defeated, total: ENEMIES.length });
        else game.end.failure({ defeated: defeated, total: ENEMIES.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (hasTarget) {
        heroX += (targetX - heroX) * Math.min(1, dt * FOLLOW_RATE);
        heroY += (targetY - heroY) * Math.min(1, dt * FOLLOW_RATE);
      }
      checkCollisions();
      if (!finished) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
          game.feedback.bad(heroX, heroY, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHazards(game.time.elapsed);
    drawExit(game.time.elapsed);
    drawEnemies(bob);
    drawHero(heroX, heroY);

    txt(defeated + ' / ' + ENEMIES.length, W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.6);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['D4', 0.3], ['F4', 0.5]], { tempo: 124, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
