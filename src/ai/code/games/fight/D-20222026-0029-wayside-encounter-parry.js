// D-20222026-0029-wayside-encounter-parry.js
// ウェイサイド・エンカウンターパリィ — 道端で魔物と出くわした旅剣士が、得物の据わりが戻る刹那だけ斬りかかる
// 操作: 得物の輪(クールダウン環)が満ちて光った時だけ攻撃ゾーンをタップする。輪が満ちる前の連打は隙になる
// 終わり: 規定回数を輪が満ちた時だけ当てれば成功。隙を3回作る/時間切れで失敗
// @mechanic: cooldown_tap
// @theme: wayside_encounter_parry
// 世界観: 旅の途中で不意に魔物と出くわした剣士が、得物の据わりが戻る一瞬だけを狙って斬りかかる
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てた回数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色パレット、粗いドット感を大きめピクセルサイズのスプライトで表現
  var C = {
    bg: '#3a4a2a', bg2: '#28361c', panel: '#4a5a34', ring: '#8ab04a', ringDim: '#3a4828',
    hero: '#e8d878', enemy: '#c85a4a', good: '#8ab04a', bad: '#ff4d5e', gold: '#f0d048', ink: '#0c1408',
  };

  var GAME_TITLE = 'ENCOUNTER PARRY';
  var MAX_TIME = 12;
  var NEEDED = 5;
  var MAX_MISS = 3;
  var COOLDOWN = 0.85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#060a04', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_S = ['.##.', '####', '.##.', '#..#'];
  var ENEMY_S = ['#.##.#', '######', '.####.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
  }

  var hits, misses, cool, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    hits = 0; misses = 0; cool = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var HX = W * 0.5, HY = H * 0.28, EX = W * 0.5, EY = H * 0.6;
  var BTN_X = W * 0.5, BTN_Y = H * 0.82, BTN_R = 150;

  function drawScene() {
    bg();
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    game.draw.sprite(ENEMY_S, { '#': C.enemy }, HX, HY + bob, 22, { anchor: 'center' });
    game.draw.sprite(HERO_S, { '#': C.hero }, EX, EY, 22, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 200, HY - 100, 400, 14, C.ringDim, 0.5);
    game.draw.rect(W * 0.5 - 200, HY - 100, 400 * Math.max(0, (NEEDED - hits) / NEEDED), 14, C.enemy);

    var pct = cool <= 0 ? 1 : 1 - cool / COOLDOWN;
    game.draw.circle(BTN_X, BTN_Y, BTN_R, C.panel);
    game.draw.circle(BTN_X, BTN_Y, BTN_R * pct, cool <= 0 ? C.ring : C.ringDim, cool <= 0 ? 0.9 : 0.5);
    game.draw.sprite(HERO_S, { '#': cool <= 0 ? C.gold : C.ink }, BTN_X, BTN_Y, 16, { anchor: 'center' });
  }

  function attemptHit(x, y) {
    if (cool > 0) {
      misses += 1;
      shake = 0.2; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) {
        finished = true; ok = false; hitStop = 0.3;
        game.audio.play('se_failure', 0.5);
        finish();
      }
      return;
    }
    cool = COOLDOWN;
    hits += 1;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.fx.burst(HX, HY, { color: C.ring, count: 18, speed: 360 });
    game.audio.play('se_good', 0.4);
    if (hits === Math.ceil(NEEDED * 0.5)) {
      game.fx.popup('NICE', HX, HY - 140, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (hits >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var d = Math.hypot(x - BTN_X, y - BTN_Y);
      if (d < BTN_R) { attemptHit(x, y); }
      else { game.audio.play('se_tap', 0.15); game.feedback.bad(x, y, { text: 'MISS' }); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BTN_X, gy: BTN_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cool > 0) cool -= dt;
    demo.gx = BTN_X; demo.gy = BTN_Y;
    var slot = cyc % (COOLDOWN + 0.5);
    demo.press = slot > COOLDOWN && slot < COOLDOWN + 0.15;
    if (demo.press && cool <= 0 && !finished) attemptHit(BTN_X, BTN_Y);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '手!', W / 2, H * 0.18, 22, C.ink);
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
      roundClock += dt;
      if (cool > 0) cool -= dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', HX, HY - 140, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(EX, EY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.ringDim, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5]], { tempo: 120, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
