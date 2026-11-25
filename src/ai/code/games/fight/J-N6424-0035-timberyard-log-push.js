// J-N6424-0035-timberyard-log-push.js
// ティンバーヤード・ログプッシュ — 製材所の丸太台の上で挑む相手を連打の押し合いで弾き飛ばす
// 操作: 相手が組み合ってきた瞬間、画面を連打して押し合いに勝ち、丸太台から弾き出す
// 終わり: 規定数(3人)の挑戦者を弾き出せば成功。押し負けて丸太から落ちれば失敗
// @mechanic: push_out
// @theme: timberyard_log_push_duel
// 世界観: 山あいの製材所で行われる丸太乗り大会、選手が丸太台の上で挑戦者を次々と連打の押し合いで弾き出し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き出した人数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: くすんだ大地色、平坦な面、シンプルな輪郭
  var C = {
    bg: '#8fae6a', bg2: '#5c7c42', log: '#a3703c', logDark: '#6b4622',
    player: '#3a6ea0', rival: '#c0503a', good: '#39d67a', bad: '#ff4d5e',
    gold: '#ffd400', ink: '#25301a', white: '#ffffff',
  };

  var GAME_TITLE = 'LOG PUSH';
  var LOG_X = W * 0.5, LOG_Y = H * 0.5, LOG_HALF = 300;
  var NEED_WINS = 3;
  var MASH_TARGET = 12;
  var CONTACT_TIME = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LUMBERJACK = ['.##.', '####', '.#.#'];
  var CHALLENGER = ['.##.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  var meter, rivalMeter, playerPos, rivalDist, phase, contactTimer, wins;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;
  // phase: 'approach' rival walks in, 'duel' mash contact, resolved after

  function initGame() {
    meter = 0; rivalMeter = 0; playerPos = 0; rivalDist = 1; phase = 'approach';
    contactTimer = CONTACT_TIME; wins = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    game.draw.rect(LOG_X - LOG_HALF - 20, LOG_Y - 22, LOG_HALF * 2 + 40, 44, C.logDark);
    game.draw.rect(LOG_X - LOG_HALF, LOG_Y - 14, LOG_HALF * 2, 28, C.log);
    var px = LOG_X - 60 + playerPos * 40;
    game.draw.sprite(LUMBERJACK, { '#': C.player }, px, LOG_Y - 50, 30, { anchor: 'center' });
    if (phase !== 'result') {
      var rx = LOG_X + 60 + rivalDist * (LOG_HALF - 90);
      game.draw.sprite(CHALLENGER, { '#': C.rival }, rx, LOG_Y - 50, 30, { anchor: 'center', flipX: true });
    }
    // duel meters
    if (phase === 'duel') {
      var barW = 380;
      game.draw.rect(LOG_X - barW - 20, LOG_Y - 150, barW, 22, '#ffffff', 0.4);
      game.draw.rect(LOG_X - barW - 20, LOG_Y - 150, barW * Math.min(1, meter / MASH_TARGET), 22, C.good);
      game.draw.rect(LOG_X + 20, LOG_Y - 150, barW, 22, '#ffffff', 0.4);
      game.draw.rect(LOG_X + 20, LOG_Y - 150, barW * Math.min(1, rivalMeter / MASH_TARGET), 22, C.bad);
    }
  }

  function mash() {
    if (finished || ready > 0) return;
    if (phase !== 'duel') { game.audio.play('se_tap', 0.1); return; }
    meter++;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(LOG_X, LOG_Y - 60, { color: C.gold, count: 6, speed: 200 });
    checkDuel();
  }

  function checkDuel() {
    if (meter >= MASH_TARGET) {
      wins++;
      game.feedback.good(LOG_X, LOG_Y - 60, { text: 'GOOD', color: C.good });
      game.fx.burst(LOG_X + 200, LOG_Y - 60, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_break', 0.4);
      if (!halfCalled && wins === Math.ceil(NEED_WINS / 2)) { halfCalled = true; game.fx.popup('NICE', LOG_X, LOG_Y - 200, { color: C.gold, size: 32 }); }
      if (wins >= NEED_WINS) {
        finished = true; ok = true; hitStop = 0.3; phase = 'result';
        game.feedback.good(LOG_X, LOG_Y - 60, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        phase = 'approach'; rivalDist = 1; contactTimer = CONTACT_TIME; meter = 0; rivalMeter = 0;
      }
    } else if (rivalMeter >= MASH_TARGET) {
      finished = true; ok = false; hitStop = 0.4; shake = 0.3; phase = 'result';
      game.feedback.bad(LOG_X, LOG_Y - 60, { text: 'MISS' });
      game.audio.play('se_bad', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) mash();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (phase === 'approach') {
      rivalDist -= dt / 1.4;
      if (rivalDist <= 0) {
        rivalDist = 0; phase = 'duel'; meter = 0; rivalMeter = 0; contactTimer = CONTACT_TIME;
        game.audio.play('se_tap', 0.3);
        game.fx.flash(C.bad, 0.15);
      }
    } else if (phase === 'duel') {
      contactTimer -= dt;
      rivalMeter += (2.6 + wins * 0.5) * dt;
      checkDuel();
      if (!finished && contactTimer <= 0) {
        // stuck-safety: contact window times out, rival edges ahead automatically
        rivalMeter = MASH_TARGET;
        checkDuel();
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.7, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepPlay(dt);
    demo.gx = LOG_X; demo.gy = H * 0.7;
    if (phase === 'duel') {
      demo.press = Math.floor(cyc * 8) % 2 === 0;
      if (demo.press) mash();
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (meter === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(wins + ' / ' + NEED_WINS, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_WINS - wins) + '人!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(wins, { wins: wins, need: NEED_WINS });
        else game.end.failure({ wins: wins, need: NEED_WINS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(wins + ' / ' + NEED_WINS, W / 2, H * 0.06, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.25], ['G3', 0.25], ['C4', 0.25], ['E4', 0.5]], { tempo: 140, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
