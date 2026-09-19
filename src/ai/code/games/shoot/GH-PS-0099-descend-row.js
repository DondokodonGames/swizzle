// GH-PS-0099-descend-row.js
// ディセンドロウ — 上から来る列を撃つ。減るほど速くなる
// 操作: 降りてくる敵をタップして撃つ。逃すと近づいて危険が増す
// 終わり: 全部倒せば成功。3体でも最下段に届けば失敗
// @mechanic: mash
// @theme: invader_column
// 世界観: 上から敵の列が降りてくる。数が減るほど速くなる。最下段に3体到達すると突破される
// 残るもの: 正誤(CLEAR/GAME OVER) + 倒した数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2010s FLAT MOBILE: 影なし・丸角・余白。ベタ塗り数色
  var C = {
    bg: '#eef2f6', enemy: '#5a6cf0', enemyDown: '#8a95f5', good: '#2ecc71', bad: '#e74c3c', gold: '#ffb020', ink: '#22252b', dim: '#8a8f98',
  };

  var GAME_TITLE = 'DESCEND ROW';
  var COLS = 4, ROWS = 3, LEAK_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, defeated = 0, leaked = 0;

  var enemies, descendY, speed, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#dfe6ee']]);
    game.draw.rect(0, H * 0.72, W, 6, C.bad, 0.4);
  }

  var ENEMY_SPRITE = ['.###.', '#####', '#.#.#'];

  function enemyPos(e) {
    return { x: W * (0.2 + e.col * 0.2), y: H * 0.20 + e.row * 90 + descendY };
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;
      var p = enemyPos(e);
      game.draw.circle(p.x, p.y, 44, C.enemy);
      game.draw.sprite(ENEMY_SPRITE, { '#': '#ffffff' }, p.x, p.y, 8, { anchor: 'center' });
    }
  }

  function initGame() {
    enemies = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) enemies.push({ row: r, col: c, dead: false });
    descendY = 0; speed = 40; defeated = 0; leaked = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function shoot(x, y) {
    if (done || ready > 0 || finished) return;
    var hitIdx = -1, best = 999;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].dead) continue;
      var p = enemyPos(enemies[i]);
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < 60 && d < best) { best = d; hitIdx = i; }
    }
    if (hitIdx === -1) { game.feedback.bad(x, y, { text: null }); game.audio.play('se_bad', 0.1); return; }
    enemies[hitIdx].dead = true; defeated++;
    hitStop = 0.03;
    var p2 = enemyPos(enemies[hitIdx]);
    game.feedback.good(p2.x, p2.y, { text: null, color: C.good });
    game.fx.burst(p2.x, p2.y, { color: C.gold, count: 10, speed: 300 });
    game.audio.play('se_good', 0.2);
    speed = 40 + (ROWS * COLS - defeated) * 0 + defeated * 3.5;
    if (defeated >= ROWS * COLS) { ok = true; finished = true; finish(); }
    else if (defeated % 4 === 0) game.fx.popup(defeated + ' / ' + (ROWS * COLS), W / 2, H * 0.12, { color: C.gold, size: 40 });
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    shoot(x, y);
  });

  var demo = { t: 0, gx: W * 0.3, gy: H * 0.30, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (enemies === undefined) initGame();
    var cyc = demo.t % 3.5;
    if (cyc < dt) initGame();
    descendY += 40 * dt;
    var alive = enemies.filter(function(e) { return !e.dead; });
    if (alive.length && cyc % 0.6 < 0.06) {
      var e = alive[0];
      var p = enemyPos(e);
      e.dead = true; defeated++;
      game.feedback.good(p.x, p.y, { text: null, color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 8, speed: 260 });
      demo.gx = p.x; demo.gy = p.y;
      demo.press = true;
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      fieldBg();
      stepDemo(dt);
      drawEnemies();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 48, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 24, C.dim);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 30, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 26, C.dim);
      }
      return;
    }

    if (state === S.RESULT) {
      fieldBg();
      drawEnemies();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.ink : C.bad);
      txt(defeated + ' / ' + (ROWS * COLS), W / 2, H * 0.13, 32, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 26, C.dim);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ defeated: defeated });
        else game.end.failure({ defeated: defeated });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      descendY += speed * dt;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.dead) continue;
        var p = enemyPos(e);
        if (p.y > H * 0.72 && !e.leaked) {
          e.leaked = true; e.dead = true; leaked++;
          shake = 0.1;
          if (leaked >= LEAK_LIMIT) { ok = false; finished = true; finish(); }
        }
      }
    }
    if (shake > 0) shake -= dt;

    fieldBg();
    drawEnemies();

    txt(defeated + ' / ' + (ROWS * COLS), W / 2, H * 0.06, 32, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
