// D-20222026-0026-lineup-volley-guard.js
// ラインナップ・ヴォレーガード — 横一列に構えた守備隊が、行き交う標的を狙い撃ち、頑丈な的には連続技を叩き込む
// 操作: 画面上を左右に動く標的を直接タップして撃つ。頑丈な金色の的は2連続タップで撃破する
// 終わり: 規定数を時間内に撃破すれば成功。時間切れは失敗
// @mechanic: aim_shoot
// @theme: guard_lineup_volley
// 世界観: 城壁の狭間に横一列で構える守備隊が、次々現れる侵入標的を狙い撃ち、頑丈な影には連続の一撃を放って退ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に蛍光色の輪郭、グロー感は太めの同色半透明レイヤーで代用
  var C = {
    bg: '#0a0620', bg2: '#160a30', grid: '#3a1a6a',
    target: '#3cf0ff', targetDk: '#0a80a0', boss: '#ffd24d', bossDk: '#a07800',
    guard: '#ff3cd0', good: '#3cf0ff', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f0eaff',
  };

  var GAME_TITLE = 'VOLLEY GUARD';
  var MAX_TIME = 15;
  var NEEDED = 6; // 通常4 + ボス1(2ヒット) を数えると計6ヒット相当
  var LANES = [H * 0.24, H * 0.34, H * 0.44];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#080414', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_S = ['.##.', '####', '.##.'];
  var BOSS_S = ['#.##.#', '######', '#.##.#', '.####.'];
  var GUARD_S = ['.##.', '####', '#..#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.guard, pulse * 0.25);
    for (var i = 0; i < 5; i++) {
      game.draw.line(0, H * 0.12 + i * 40, W, H * 0.12 + i * 40, C.grid, 3);
    }
    for (var g = 0; g < 3; g++) {
      var gx = W * (0.24 + g * 0.26);
      var gy = H * 0.9 + Math.sin(game.time.elapsed * 2 + g) * 5;
      game.draw.sprite(GUARD_S, { '#': C.guard }, gx, gy, 14, { anchor: 'center' });
    }
  }

  var targets, hits, roundClock, halfCalled, bossSpawned, nextSpawn;
  var done, endWait, finished, ready, hitStop, shake;

  function spawnTarget(isBoss) {
    var lane = LANES[Math.floor(Math.random() * LANES.length)];
    var fromLeft = Math.random() < 0.5;
    targets.push({
      lane: lane, x: fromLeft ? -80 : W + 80, dir: fromLeft ? 1 : -1,
      speed: 260 + game.random(0, 140),
      r: isBoss ? 76 : 56, boss: !!isBoss, hp: isBoss ? 2 : 1,
      stun: 0, dead: false,
    });
  }

  function initGame() {
    targets = []; hits = 0; roundClock = 0; halfCalled = false; bossSpawned = false; nextSpawn = 0.2;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.dead) continue;
      var bob = Math.sin(game.time.elapsed * 3 + i) * 4;
      var sp = t.boss ? BOSS_S : ENEMY_S;
      var col = t.boss ? (t.hp < 2 ? C.bossDk : C.boss) : C.target;
      if (t.stun > 0) game.draw.circle(t.x, t.lane + bob, t.r * 0.9, '#ffffff', 0.35);
      game.draw.sprite(sp, { '#': col }, t.x, t.lane + bob, t.boss ? 16 : 13, { anchor: 'center' });
      if (t.boss) {
        game.draw.rect(t.x - 60, t.lane - 100, 120, 10, '#2a1050', 0.6);
        game.draw.rect(t.x - 60, t.lane - 100, 120 * (t.hp / 2), 10, C.gold);
      }
    }
  }

  function shootAt(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.dead || t.stun > 0) continue;
      var d = Math.hypot(x - t.x, y - t.lane);
      if (d < t.r && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.15);
      return;
    }
    var t = targets[best];
    t.hp -= 1;
    if (t.hp <= 0) {
      t.dead = true;
      hits += 1;
      game.feedback.good(t.x, t.lane, { text: t.boss ? 'GOOD' : 'NICE', color: t.boss ? C.gold : C.good });
      game.fx.burst(t.x, t.lane, { color: t.boss ? C.gold : C.target, count: t.boss ? 26 : 16, speed: 380 });
      game.audio.play(t.boss ? 'se_powerup' : 'se_good', 0.4);
      if (hits === Math.ceil(NEEDED * 0.5)) {
        game.fx.popup('NICE', t.x, t.lane - 70, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (hits >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      t.stun = 0.35;
      game.feedback.good(t.x, t.lane, { text: 'GOOD', color: C.gold });
      game.audio.play('se_tap', 0.3);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) shootAt(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.dead) continue;
      if (t.stun > 0) { t.stun -= dt; continue; }
      t.x += t.dir * t.speed * dt;
    }
    if (cyc > nextSpawn && targets.length < 3 && hits < NEEDED) {
      spawnTarget(!bossSpawned && hits >= 2);
      if (!bossSpawned && hits >= 2) bossSpawned = true;
      nextSpawn = cyc + 0.9;
    }
    var target = null;
    for (var j = 0; j < targets.length; j++) { if (!targets[j].dead && targets[j].stun <= 0) { target = targets[j]; break; } }
    if (target) {
      demo.gx = target.x; demo.gy = target.lane; demo.press = (Math.floor(cyc * 3) % 3 === 0);
      if (demo.press && Math.random() < 0.4) shootAt(target.x, target.lane);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targets === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '体!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (t.dead) continue;
        if (t.stun > 0) { t.stun -= dt; continue; }
        t.x += t.dir * t.speed * dt;
        if (t.x < -100 || t.x > W + 100) t.dead = true;
      }
      if (roundClock > nextSpawn && targets.length < 3) {
        var wantBoss = !bossSpawned && hits >= 2;
        spawnTarget(wantBoss);
        if (wantBoss) bossSpawned = true;
        nextSpawn = roundClock + 0.9;
      }
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.34, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.grid, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
