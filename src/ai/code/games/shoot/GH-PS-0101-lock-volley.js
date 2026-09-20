// GH-PS-0101-lock-volley.js
// ロックボレー — ロックオンして一斉に撃つ。ロック数が多いほど高得点
// 操作: 制限時間内にできるだけ多くの敵をタップしてロックオン。時間切れで一斉に撃つ
// 終わり: ロックできた数がそのままスコアになる
// @mechanic: reaction_duel
// @theme: ink_squadron
// 世界観: 白黒の画面に浮かぶ敵影。ロックした敵にだけ印が付く。制限時間が来たら、印の付いた敵だけ一斉に消える
// 残るもの: ロック数(SCORE) + BEST
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 1BIT INK: 白黒2値。ディザで階調、線の太さで語る
  var C = {
    paper: '#f0ece0', ink: '#141210', mid: '#8a8478', gold: '#ffb020',
  };

  var GAME_TITLE = 'LOCK VOLLEY';
  var ENEMY_N = 8, LOCK_TIME = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, locked = 0;

  var enemies, timeLeft, fired, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function dither(x, y, w, h, a) {
    for (var yy = 0; yy < h; yy += 6) {
      for (var xx = (yy % 12 === 0 ? 0 : 6); xx < w; xx += 12) game.draw.rect(x + xx, y + yy, 3, 3, C.ink, a);
    }
  }

  function paperBg() {
    game.draw.gradient(0, H, [[0, '#e8e2d2'], [0.5, C.paper], [1, '#e2dccc']]);
    dither(0, H * 0.86, W, H * 0.14, 0.4);
    dither(0, 0, W, H * 0.08, 0.25);
  }

  var ENEMY_SPRITE = ['.###.', '#####', '.#.#.'];

  function genEnemies() {
    var arr = [];
    for (var i = 0; i < ENEMY_N; i++) {
      arr.push({ x: W * (0.15 + (i % 4) * 0.23), y: H * (0.24 + Math.floor(i / 4) * 0.16), locked: false });
    }
    return arr;
  }

  function initGame() {
    enemies = genEnemies(); timeLeft = LOCK_TIME; locked = 0; fired = false;
    done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tryLock(x, y) {
    if (done || ready > 0 || fired) return;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.locked) continue;
      if (Math.hypot(x - e.x, y - e.y) < 70) {
        e.locked = true; locked++;
        hitStop = 0.03;
        game.feedback.good(e.x, e.y, { text: null, color: C.ink });
        game.audio.play('se_tap', 0.2);
        if (locked === ENEMY_N) game.fx.popup('ALL LOCK', W / 2, H * 0.14, { color: C.gold, size: 44 });
        return;
      }
    }
    game.feedback.bad(x, y, { text: null });
    game.audio.play('se_bad', 0.15);
  }

  function volley() {
    if (fired) return;
    fired = true;
    finalScore = locked * 100;
    for (var i = 0; i < enemies.length; i++) if (enemies[i].locked) game.fx.burst(enemies[i].x, enemies[i].y, { color: C.ink, count: 14, speed: 340 });
    game.feedback.good(W / 2, H * 0.5, { text: locked + ' HIT', color: C.ink });
    shake = 0.2;
    game.audio.play(locked > 0 ? 'se_success' : 'se_failure');
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tryLock(x, y);
  });

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      game.draw.sprite(ENEMY_SPRITE, { '#': C.ink }, e.x, e.y, 14, { anchor: 'center' });
      if (e.locked) { game.draw.circle(e.x, e.y, 60, C.ink, 0.0); game.draw.line(e.x - 60, e.y - 60, e.x + 60, e.y + 60, C.ink, 4); game.draw.line(e.x - 60, e.y + 60, e.x + 60, e.y - 60, C.ink, 4); }
    }
  }

  // ── ATTRACT ゴースト実演: できるだけ多くタップしてロック ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) enemies = genEnemies();
    if (cyc < 3.0) {
      var idx = Math.floor(cyc / 0.35);
      if (idx < enemies.length && !enemies[idx].locked) {
        var e = enemies[idx];
        demo.gx += (e.x - demo.gx) * Math.min(1, dt * 8);
        demo.gy += (e.y - demo.gy) * Math.min(1, dt * 8);
        if (cyc % 0.35 < 0.06) { e.locked = true; game.feedback.good(e.x, e.y, { text: null, color: C.ink }); }
      }
      demo.press = (cyc % 0.35) < 0.1;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (enemies === undefined) initGame();
      paperBg();
      stepDemo(dt);
      drawEnemies();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.05, 52, C.ink);
      txt('BEST ' + game.best, W / 2, H * 0.09, 28, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 44, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      paperBg();
      drawEnemies();
      txt(locked > 0 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.05, 50, C.ink);
      txt('LOCK ' + locked + ' / ' + ENEMY_N, W / 2, H * 0.11, 34, C.ink);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.16, 30, C.ink);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.21, 32, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: locked + '/' + ENEMY_N }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!fired) {
      timeLeft -= dt;
      if (timeLeft <= 0) volley();
    }
    if (shake > 0) shake -= dt;

    paperBg();
    drawEnemies();

    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.4);
    game.draw.rect(60, 40, (W - 120) * Math.max(0, timeLeft / LOCK_TIME), 20, C.ink);
    txt(locked + ' / ' + ENEMY_N, W / 2, 100, 40, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 70, C.ink);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
