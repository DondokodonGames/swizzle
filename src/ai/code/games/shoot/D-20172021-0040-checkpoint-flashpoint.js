// D-20172021-0040-checkpoint-flashpoint.js
// チェックポイント・フラッシュポイント — 過熱したライフルの冷却を待ちながら現れる敵影を撃ち抜き、拠点の制圧ゲージを押し上げる
// 操作: 現れる敵影をタップして撃つ。撃った直後は冷却待ちで、明けるまで次弾は出ない
// 終わり: 制限時間内に制圧ゲージを満たせば成功。満たせなければ失敗
// @mechanic: cooldown_tap
// @theme: checkpoint_flashpoint_solo_push
// 世界観: 前線の奪還作戦に単独で加わった突撃兵が、過熱するライフルの冷却を待ちながら出現する敵影を撃ち抜き、拠点の制圧ゲージを押し上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し上げた制圧率
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高コントラストの軍用グレー×アクセントオレンジ、太い枠線UI
  var C = {
    bg: '#2c3238', bg2: '#14181c', field: '#3a4048', fieldEdge: '#525a64',
    enemyWarn: '#e0c840', enemyLive: '#e0503c', enemyDark: '#141618',
    good: '#3ce07a', bad: '#ff4d5e', gold: '#ffa63c', white: '#eef2f4', ink: '#0a0c0e',
  };

  var GAME_TITLE = 'FLASHPOINT';
  var TIME_LIMIT = 13;
  var GOAL = 8;
  var COOLDOWN = 0.55;
  var WARN_TIME = 0.45, LIVE_TIME = 0.85, GAP = 0.25;
  var FIELD_TOP = H * 0.3, FIELD_BOT = H * 0.64;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, cool, enemy, spawnT, playT, halfCalled, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_SPRITE = ['.#.', '###', '.#.', '#.#'];
  var GUN_SPRITE = ['..##', '####', '..##'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffa63c', pulse * 0.25);
    game.draw.rect(W * 0.1, FIELD_TOP, W * 0.8, FIELD_BOT - FIELD_TOP, C.field, 0.5);
    game.draw.rect(W * 0.1, FIELD_TOP, W * 0.8, 6, C.fieldEdge);
    game.draw.sprite(GUN_SPRITE, { '#': C.fieldEdge }, W * 0.5, H * 0.86, 22, { anchor: 'center' });
  }

  function initGame() {
    hits = 0; cool = 0; enemy = null; spawnT = 0.5; playT = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnEnemy() {
    enemy = {
      x: W * 0.22 + Math.random() * W * 0.56,
      y: FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP),
      t: 0, state: 'warn',
    };
  }

  function tickEnemy(dt) {
    if (!enemy) {
      spawnT -= dt;
      if (spawnT <= 0) spawnEnemy();
      return;
    }
    enemy.t += dt;
    if (enemy.state === 'warn' && enemy.t >= WARN_TIME) { enemy.state = 'live'; enemy.t = 0; }
    else if (enemy.state === 'live' && enemy.t >= LIVE_TIME) { enemy = null; spawnT = GAP; }
  }

  function drawEnemy() {
    if (!enemy) return;
    var col = enemy.state === 'live' ? C.enemyLive : C.enemyWarn;
    var blink = enemy.state === 'warn' && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.circle(enemy.x, enemy.y, 48, blink ? C.enemyDark : col, 0.85);
    game.draw.sprite(ENEMY_SPRITE, { '#': C.ink }, enemy.x, enemy.y, 16, { anchor: 'center' });
  }

  function fire(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (cool > 0) { game.audio.play('se_tap', 0.06); return; }
    cool = COOLDOWN;
    if (enemy && enemy.state === 'live' && game.hit.circle(x, y, 10, enemy.x, enemy.y, 52)) {
      hits++;
      hitStop = 0.06;
      game.feedback.good(enemy.x, enemy.y, { text: 'HIT', color: C.good });
      game.fx.burst(enemy.x, enemy.y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_break', 0.35);
      enemy = null; spawnT = GAP;
      if (hits === Math.ceil(GOAL / 2)) game.fx.popup('あと' + (GOAL - hits) + '!', W * 0.5, H * 0.24, { color: C.gold, size: 32 });
      if (hits >= GOAL) {
        ok = true; finished = true;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    fire(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.45, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { enemy = null; spawnT = 0.3; hits = 0; cool = 0; }
    if (cool > 0) cool -= dt;
    tickEnemy(dt);
    if (enemy && enemy.state === 'live') {
      demo.gx = enemy.x; demo.gy = enemy.y;
      if (!demo.press && cool <= 0) {
        demo.press = true;
        fire(enemy.x, enemy.y);
      }
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (spawnT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawEnemy();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 34, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEnemy();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + GOAL, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL - hits) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, goal: GOAL });
        else game.end.failure({ hits: hits, goal: GOAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      if (cool > 0) cool -= dt;
      tickEnemy(dt);
      if (!halfCalled && playT >= TIME_LIMIT * 0.5) { halfCalled = true; game.audio.play('se_milestone', 0.25); }
      if (playT >= TIME_LIMIT) {
        finished = true; ok = hits >= GOAL;
        if (!ok) { hitStop = 0.25; shake = 0.2; game.feedback.bad(W * 0.5, H * 0.45, { text: 'TIME UP' }); }
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawEnemy();

    txt(hits + ' / ' + GOAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, hits / GOAL), 16, C.gold);
    game.draw.rect(60, 178, (W - 120) * Math.max(0, cool / COOLDOWN), 8, C.bad, 0.7);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.15], ['G3', 0.15], ['B3', 0.15], ['E4', 0.3]], { tempo: 138, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
