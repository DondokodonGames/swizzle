// D-20222026-0027-banner-turn-clash.js
// 番手クラッシュ — 二陣営が交互に旗を掲げる合戦場で、自陣の旗が立つ刹那だけ太刀を振るう
// 操作: 自陣の旗印が掲げられている間だけ盤中央をタップして攻める。敵陣の旗の間は手を出さない
// 終わり: 敵陣を規定回数崩せば成功。自陣の体力が尽きる/時間切れで失敗
// @mechanic: turn_attack
// @theme: banner_turn_duel
// 世界観: 二つの陣が旗印を交互に掲げて合戦する野で、足軽組頭が自陣の旗が立つ刹那だけを狙って太刀を振るう
// 残るもの: 正誤(CLEAR/GAME OVER) + 崩した数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 墨一色の濃淡のみ。彩色は最小限のアクセントに留める
  var C = {
    bg: '#e8e2d0', bg2: '#d4cbb0', ink: '#20180c', inkSoft: '#4a4030',
    player: '#20180c', enemy: '#8a2016',
    good: '#2a7a3a', bad: '#8a2016', gold: '#c08a20', white: '#e8e2d0',
  };

  var GAME_TITLE = 'BANNER CLASH';
  var MAX_TIME = 22;
  var TURN_LEN = 2.0;
  var TELEGRAPH = 0.5;
  var ENEMY_HP = 4;
  var PLAYER_HP = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_S = ['.##.', '####', '.##.', '#..#'];
  var ENEMY_S = ['##.#', '.###', '##.#', '#..#'];
  var BANNER_S = ['#', '#', '#', '#', '#####'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.ink, pulse * 0.15);
    game.draw.line(0, H * 0.5, W, H * 0.5, C.inkSoft, 4);
  }

  var turn, turnT, hits, damageTaken, tappedThisTurn, roundClock, halfCalled, telegraphed;
  var done, endWait, finished, ready, hitStop, shake;

  function switchTurn(t) {
    turn = t; turnT = 0; tappedThisTurn = false; telegraphed = false;
  }

  function initGame() {
    hits = 0; damageTaken = 0; roundClock = 0; halfCalled = false;
    switchTurn('player');
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var PX = W * 0.5, PY = H * 0.78;
  var EX = W * 0.5, EY = H * 0.26;
  var ZONE_R = 220;

  function drawScene() {
    bg();
    var glowP = turn === 'player' ? (0.25 + 0.15 * Math.sin(game.time.elapsed * 8)) : 0.06;
    var glowE = turn === 'enemy' ? (0.25 + 0.15 * Math.sin(game.time.elapsed * 8)) : 0.06;
    game.draw.circle(PX, PY, ZONE_R, C.player, glowP);
    game.draw.circle(EX, EY, ZONE_R, C.enemy, glowE);
    game.draw.sprite(PLAYER_S, { '#': C.player }, PX, PY, 26, { anchor: 'center' });
    game.draw.sprite(ENEMY_S, { '#': C.enemy }, EX, EY, 26, { anchor: 'center' });
    var bannerX = turn === 'player' ? PX + 140 : EX + 140;
    var bannerY = turn === 'player' ? PY : EY;
    var bcol = turn === 'player' ? C.player : C.enemy;
    var bscale = telegraphed && turnT < TELEGRAPH ? 12 + 4 * Math.sin(game.time.elapsed * 20) : 14;
    game.draw.sprite(BANNER_S, { '#': bcol }, bannerX, bannerY, bscale, { anchor: 'center' });

    game.draw.rect(W * 0.5 - 220, PY + 130, 440, 14, C.inkSoft, 0.3);
    game.draw.rect(W * 0.5 - 220, PY + 130, 440 * Math.max(0, (PLAYER_HP - damageTaken) / PLAYER_HP), 14, C.player);
    game.draw.rect(W * 0.5 - 220, EY - 150, 440, 14, C.inkSoft, 0.3);
    game.draw.rect(W * 0.5 - 220, EY - 150, 440 * Math.max(0, (ENEMY_HP - hits) / ENEMY_HP), 14, C.enemy);
  }

  function strikeAttempt(x, y) {
    var dCenter = Math.hypot(x - W * 0.5, y - H * 0.5);
    if (turn !== 'player' || tappedThisTurn) {
      damageTaken += 1;
      shake = 0.25; hitStop = 0.2;
      game.feedback.bad(EX, EY, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (damageTaken >= PLAYER_HP) {
        finished = true; ok = false; hitStop = 0.35;
        game.audio.play('se_failure', 0.5);
        finish();
      }
      return;
    }
    tappedThisTurn = true;
    hits += 1;
    game.feedback.good(EX, EY, { text: 'GOOD', color: C.good });
    game.fx.burst(EX, EY, { color: C.player, count: 20, speed: 380 });
    game.audio.play('se_good', 0.4);
    if (hits === Math.ceil(ENEMY_HP / 2)) {
      game.fx.popup('NICE', EX, EY - 180, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (hits >= ENEMY_HP) {
      finished = true; ok = true; hitStop = 0.35;
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      switchTurn('enemy');
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      game.audio.play('se_tap', 0.15);
      strikeAttempt(x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PX, gy: PY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    tickTurn(dt);
    demo.gx = W * 0.5; demo.gy = H * 0.5;
    if (turn === 'player' && turnT > TELEGRAPH + 0.3 && !tappedThisTurn) {
      demo.press = true;
      strikeAttempt(W * 0.5, H * 0.5);
    } else {
      demo.press = false;
    }
  }

  function tickTurn(dt) {
    turnT += dt;
    if (!telegraphed && turnT >= TURN_LEN - TELEGRAPH) {
      telegraphed = true;
      game.audio.play('se_tap', 0.12);
    }
    if (turnT >= TURN_LEN) {
      if (turn === 'enemy') switchTurn('player');
      else switchTurn('enemy');
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (turn === undefined) initGame();
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
      txt(hits + ' / ' + ENEMY_HP, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, ENEMY_HP - hits) + '手!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, damageTaken: damageTaken });
        else game.end.failure({ hits: hits, damageTaken: damageTaken });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      tickTurn(dt);
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', EX, EY - 180, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(PX, PY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(hits + ' / ' + ENEMY_HP, W / 2, H * 0.06, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.inkSoft, 0.3);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.25], ['G3', 0.25], ['B3', 0.25], ['E4', 0.5]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
