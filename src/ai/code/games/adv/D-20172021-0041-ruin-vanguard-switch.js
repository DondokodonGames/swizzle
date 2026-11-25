// D-20172021-0041-ruin-vanguard-switch.js
// ルインヴァンガードスイッチ — 遺跡の広間で迫る守護獣を、槍の前衛と双剣の後衛を切り替えて迎え撃つ
// 操作: 左下ボタンで槍役、右下ボタンで双剣役に切り替える。守護獣の色タグに合う方を出して迎撃する
// 終わり: 規定数を撃退すれば成功。被弾3回、または時間切れで撃退数が足りなければ失敗
// @mechanic: alternate_tap
// @theme: ruin_vanguard_switch
// 世界観: 荒野の遺跡に踏み込んだ二人組の探索隊が、広間に次々現れる守護獣の弱点属性を見極め、前衛と後衛を瞬時に入れ替えて迎え撃つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃退数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き、表情のあるスプライト
  var C = {
    sky1: '#2b1f4a', sky2: '#4a3170', floorFar: '#3a2a5c', floorNear: '#5a3f82',
    pillar: '#6b4a94', pillarDark: '#42305f',
    heroL: '#3fd0e0', heroLDark: '#1f8a96', heroR: '#ff8a3d', heroRDark: '#b85a1e',
    tagL: '#3fd0e0', tagR: '#ff8a3d', enemy: '#8f4fbf', enemyDark: '#5c2f82',
    good: '#39e07a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#180f2c', white: '#ffffff',
    heart: '#ff5577', heartOff: '#3a2a50',
  };

  var GAME_TITLE = 'RUIN SWITCH';
  var TIME_LIMIT = 9.0;
  var NEEDED = 5;
  var HEALTH_MAX = 3;
  var APPROACH_TIME = 1.0;
  var STRIKE_Y = H * 0.60;
  var SPAWN_Y = H * 0.24;
  var BTN_L = { x: W * 0.27, y: H * 0.865, r: 110 };
  var BTN_R = { x: W * 0.73, y: H * 0.865, r: 110 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_A = ['..#..', '.###.', '#####', '..#..', '.#.#.'];
  var HERO_B = ['..#..', '.###.', '#####', '.#.#.', '#...#'];
  var ENEMY_A = ['#.#.#', '#####', '.###.', '#.#.#'];
  var ENEMY_B = ['#.#.#', '#####', '.#.#.', '#...#'];

  var activeHero, kills, misses, health, roundTime, spawnTimer, enemy, spawnSeq;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    // far pillars layer
    for (var i = 0; i < 3; i++) {
      var px = W * (0.15 + i * 0.35);
      game.draw.rect(px - 30, H * 0.20, 60, H * 0.42, C.floorFar, 0.9);
    }
    // near floor layer
    game.draw.rect(0, H * 0.62, W, H * 0.30, C.floorNear, 1);
    game.draw.rect(0, H * 0.62, W, 10, C.pillarDark, 1);
    for (var j = 0; j < 5; j++) {
      var lx = (j + 0.5) * (W / 5);
      game.draw.rect(lx - 4, H * 0.62, 8, H * 0.30, C.pillarDark, 0.4);
    }
  }

  function heroFrame(side) {
    var bob = Math.sin(game.time.elapsed * 5) > 0 ? HERO_A : HERO_B;
    return bob;
  }

  function drawButtons() {
    var glowL = activeHero === 'L' ? 1 : 0.35;
    var glowR = activeHero === 'R' ? 1 : 0.35;
    game.draw.circle(BTN_L.x, BTN_L.y, BTN_L.r, C.heroLDark, 0.5);
    game.draw.circle(BTN_L.x, BTN_L.y, BTN_L.r * (activeHero === 'L' ? 0.85 : 0.7), C.heroL, glowL);
    game.draw.sprite(heroFrame('L'), { '#': C.white }, BTN_L.x, BTN_L.y, 14, { anchor: 'center' });
    game.draw.circle(BTN_R.x, BTN_R.y, BTN_R.r, C.heroRDark, 0.5);
    game.draw.circle(BTN_R.x, BTN_R.y, BTN_R.r * (activeHero === 'R' ? 0.85 : 0.7), C.heroR, glowR);
    game.draw.sprite(heroFrame('R'), { '#': C.white }, BTN_R.x, BTN_R.y, 14, { anchor: 'center' });
  }

  function drawEnemy() {
    if (!enemy) return;
    var frame = Math.sin(game.time.elapsed * 6) > 0 ? ENEMY_A : ENEMY_B;
    var pal = { '#': enemy.tag === 'L' ? C.tagL : C.tagR };
    var y = enemy.y;
    if (enemy.resolved) {
      var t = enemy.postT / 0.28;
      if (enemy.hit) { y -= t * 30; game.draw.sprite(frame, pal, enemy.x + (Math.random() - 0.5) * 12, y, 30 * (1 + t * 0.6), { anchor: 'center', alpha: Math.max(0, 1 - t) }); }
      else { y += t * 90; game.draw.sprite(frame, pal, enemy.x, y, 30 * (1 - t * 0.4), { anchor: 'center', alpha: Math.max(0, 1 - t) }); }
      return;
    }
    game.draw.sprite(frame, pal, enemy.x, y, 30, { anchor: 'center' });
    // telegraph tag diamond above head
    var tagCol = enemy.tag === 'L' ? C.tagL : C.tagR;
    var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
    if (blink) game.draw.circle(enemy.x, y - 70, 20, tagCol, 0.9);
    game.draw.circle(enemy.x, y - 70, 20, tagCol, 0.3);
  }

  function drawHUD() {
    txt(kills + ' / ' + NEEDED, W * 0.5, H * 0.065, 34, C.ink);
    var barW = W - 140;
    var pct = Math.max(0, 1 - roundTime / TIME_LIMIT);
    game.draw.rect(70, 150, barW, 16, '#2a1d44', 1);
    game.draw.rect(70, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    for (var i = 0; i < HEALTH_MAX; i++) {
      var hx = W * 0.5 - (HEALTH_MAX - 1) * 26 + i * 52;
      game.draw.circle(hx, H * 0.115, 18, i < health ? C.heart : C.heartOff);
    }
  }

  function switchHero(side) {
    if (activeHero === side) return;
    activeHero = side;
    game.audio.play('se_tap', 0.2);
  }

  function spawnEnemy(forcedTag) {
    spawnSeq++;
    var tag = forcedTag || (Math.random() < 0.5 ? 'L' : 'R');
    enemy = { tag: tag, t: 0, x: W * 0.5, y: SPAWN_Y, resolved: false, hit: false, postT: 0 };
  }

  function resolveEnemy() {
    if (!enemy || enemy.resolved) return;
    enemy.resolved = true;
    enemy.postT = 0;
    if (activeHero === enemy.tag) {
      enemy.hit = true;
      kills++;
      game.feedback.good(enemy.x, enemy.y, { text: 'HIT', color: C.good });
      game.fx.burst(enemy.x, enemy.y, { color: C.good, count: 16, speed: 340 });
      game.audio.play('se_good', 0.35);
      hitStop = 0.15;
      if (!halfCalled && kills >= Math.ceil(NEEDED / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (kills >= NEEDED) { ok = true; finished = true; hitStop = 0.25; finish(); }
    } else {
      enemy.hit = false;
      misses++;
      health--;
      game.feedback.bad(enemy.x, enemy.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      shake = 0.28;
      if (health <= 0) { ok = false; finished = true; finish(); }
    }
  }

  function initGame() {
    activeHero = 'L'; kills = 0; misses = 0; health = HEALTH_MAX;
    roundTime = 0; spawnTimer = 0.5; spawnSeq = 0; enemy = null;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
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
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var dL = Math.hypot(x - BTN_L.x, y - BTN_L.y);
      var dR = Math.hypot(x - BTN_R.x, y - BTN_R.y);
      if (dL <= BTN_L.r) switchHero('L');
      else if (dR <= BTN_R.r) switchHero('R');
    }
  });

  var demo = { t: 0, gx: BTN_L.x, gy: BTN_L.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.7;
    if (cyc < dt || demo.t <= dt) resetDemo();

    if (cyc < 1.15) {
      if (!enemy) spawnEnemy('L');
      enemy.t += dt; enemy.y = SPAWN_Y + (STRIKE_Y - SPAWN_Y) * Math.min(1, enemy.t / APPROACH_TIME);
      if (cyc > 0.55 && cyc < 1.0) { demo.gx = BTN_L.x; demo.gy = BTN_L.y; demo.press = true; switchHero('L'); }
      else demo.press = false;
      if (cyc >= 1.05 && !enemy.resolved) resolveEnemy();
    } else if (cyc < 1.5) {
      demo.press = false;
    } else if (cyc < 2.65) {
      var t2 = cyc - 1.5;
      if (!enemy || enemy.resolved) { spawnEnemy('R'); }
      enemy.t = t2; enemy.y = SPAWN_Y + (STRIKE_Y - SPAWN_Y) * Math.min(1, t2 / APPROACH_TIME);
      demo.gx = BTN_L.x; demo.gy = BTN_L.y; demo.press = false; // hand stays put: mismatch demo
      if (t2 >= APPROACH_TIME - dt && !enemy.resolved) resolveEnemy();
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (kills === undefined) initGame();
      stepDemo(dt);
      bg();
      drawButtons();
      drawEnemy();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawButtons();
      drawEnemy();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(kills + ' / ' + NEEDED, W / 2, H * 0.145, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - kills) + '体!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    var shakeX = 0, shakeY = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 18 * shake; shakeY = (Math.random() - 0.5) * 18 * shake; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kills, { kills: kills, misses: misses });
        else game.end.failure({ kills: kills, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundTime += dt;
      if (enemy && enemy.resolved) {
        enemy.postT += dt;
        if (enemy.postT >= 0.28) { enemy = null; spawnTimer = 0.35 + Math.random() * 0.2; }
      } else if (!enemy) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) spawnEnemy();
      } else {
        enemy.t += dt;
        enemy.y = SPAWN_Y + (STRIKE_Y - SPAWN_Y) * Math.min(1, enemy.t / APPROACH_TIME);
        if (enemy.t >= APPROACH_TIME) resolveEnemy();
      }
      if (roundTime >= TIME_LIMIT && !finished) {
        ok = kills >= NEEDED;
        finished = true;
        if (!ok) { game.feedback.bad(W * 0.5, STRIKE_Y, { text: 'TIME UP' }); game.audio.play('se_bad', 0.3); }
        finish();
      }
    }

    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 3; i++) {
      var px = W * (0.15 + i * 0.35) + shakeX * 0.3;
      game.draw.rect(px - 30, H * 0.20, 60, H * 0.42, C.floorFar, 0.9);
    }
    game.draw.rect(0 + shakeX, H * 0.62 + shakeY, W, H * 0.30, C.floorNear, 1);
    game.draw.rect(0 + shakeX, H * 0.62 + shakeY, W, 10, C.pillarDark, 1);
    for (var j = 0; j < 5; j++) {
      var lx = (j + 0.5) * (W / 5) + shakeX;
      game.draw.rect(lx - 4, H * 0.62, 8, H * 0.30, C.pillarDark, 0.4);
    }
    drawButtons();
    drawEnemy();
    drawHUD();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['Eb4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
