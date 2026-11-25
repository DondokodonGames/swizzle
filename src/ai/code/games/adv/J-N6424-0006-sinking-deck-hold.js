// J-N6424-0006-sinking-deck-hold.js
// 沈む甲板ホールド — 難破しかけた帆船の甲板で、監視の光が灯る間だけ静止し、消えた隙に安全な足場へ動いて踏みとどまる
// 操作: サーチライトが甲板を照らしている間は指を触れない。消えた瞬間だけタップして安全な足場へ飛び移る
// 終わり: 規定時間、沈む甲板から安全な足場へ移り続けられれば成功。光っている間に触れる/沈めば失敗
// @mechanic: freeze
// @theme: sinking_ship_deck
// 世界観: 難破しかけた帆船の甲板員見習いが、渦巻く海を照らすサーチライトが灯る間だけ静止し、消えた隙に安全な足場へ移り最後まで踏みとどまる
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var C = {
    sea: '#1a3a5a', sea2: '#0e2038', deck: '#8a5a2a', deckDark: '#5a3a18', deckSunk: '#2a1a0a',
    sailor: '#e0c060', sailorDark: '#a08030', light: '#fff8d0',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#e8f0ff', white: '#ffffff',
  };

  var GAME_TITLE = 'DECK HOLD';
  var SURVIVE_TIME = 13;
  var DECK_Y = H * 0.62, DECK_X = [W * 0.3, W * 0.5, W * 0.7];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#04101c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SAILOR_SPR = ['.##.', '####', '.##.', '#..#'];

  var pos, lit, litTimer, sunk, survived, decksLevel;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.sea], [1, C.sea2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
    for (var i = 0; i < 3; i++) {
      var wy = H * (0.15 + i * 0.06) + Math.sin(game.time.elapsed * 1.5 + i) * 10;
      game.draw.line(0, wy, W, wy, '#ffffff', 3);
    }
  }

  function drawDeck() {
    for (var i = 0; i < DECK_X.length; i++) {
      var sunkAmt = sunk[i] ? 40 : 0;
      game.draw.rect(DECK_X[i] - 90, DECK_Y - 30 + sunkAmt, 180, 60 - sunkAmt, sunk[i] ? C.deckSunk : (i === pos ? C.deck : C.deckDark));
    }
    var bob = Math.sin(game.time.elapsed * 4) * 5;
    game.draw.sprite(SAILOR_SPR, { '#': C.sailor }, DECK_X[pos], DECK_Y - 70 + bob, 22, { anchor: 'center' });
    if (lit) {
      game.draw.circle(DECK_X[pos], DECK_Y - 20, 160, C.light, 0.35);
    }
  }

  function initGame() {
    pos = 1; lit = false; litTimer = 1.3; sunk = [false, false, false]; survived = 0; decksLevel = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tryMove(dir) {
    if (finished || ready > 0) return;
    if (lit) {
      ok = false; finished = true; hitStop = 0.4; shake = 0.35;
      game.feedback.bad(DECK_X[pos], DECK_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.5);
      finish();
      return;
    }
    var np = pos + dir;
    if (np < 0 || np >= DECK_X.length || sunk[np]) {
      game.audio.play('se_tap', 0.08);
      return;
    }
    pos = np;
    game.feedback.good(DECK_X[pos], DECK_Y, { text: 'GOOD', color: C.good });
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryMove(x < W / 2 ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function sinkRandomOther() {
    var candidates = [];
    for (var i = 0; i < DECK_X.length; i++) if (i !== pos && !sunk[i]) candidates.push(i);
    if (candidates.length > 0) sunk[candidates[Math.floor(Math.random() * candidates.length)]] = true;
    if (candidates.length === DECK_X.length - 1) {
      // reset unsunk tiles except current to keep board playable
      for (var j = 0; j < DECK_X.length; j++) if (j !== pos) sunk[j] = false;
    }
  }

  var demo = { t: 0, gx: DECK_X[1], gy: DECK_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    litTimer -= dt;
    if (litTimer <= 0) {
      lit = !lit;
      litTimer = lit ? 1.1 : 1.4;
      if (!lit) sinkRandomOther();
    }
    var seg = cyc % 2.5;
    if (!lit && seg < dt && sunk[pos === 0 ? 1 : 0] !== undefined) {
      var target = pos === 0 ? 1 : 0;
      if (!sunk[target]) { pos = target; demo.gx = DECK_X[pos]; demo.press = true; }
    } else demo.press = false;
    demo.gy = DECK_Y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sunk === undefined) initGame();
      stepDemo(dt);
      bg();
      drawDeck();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.floor(game.best) + 's' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDeck();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(survived.toFixed(1) + 's' + ' / ' + SURVIVE_TIME + 's', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, (SURVIVE_TIME - survived)).toFixed(1) + 's!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(survived * 10), { survivedSec: Number(survived.toFixed(1)) });
        else game.end.failure({ survivedSec: Number(survived.toFixed(1)) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      litTimer -= dt;
      if (litTimer <= 0) {
        lit = !lit;
        litTimer = lit ? (1.1 - Math.min(0.4, survived * 0.02)) : (1.4 - Math.min(0.5, survived * 0.02));
        if (!lit) sinkRandomOther();
        if (lit) game.audio.play('se_tap', 0.15);
      }
      if (sunk[pos]) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(DECK_X[pos], DECK_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (Math.floor(survived) === Math.floor(SURVIVE_TIME / 2) && Math.floor(survived) > Math.floor(survived - dt)) {
        game.fx.popup('NICE', DECK_X[pos], DECK_Y - 140, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (!finished && survived >= SURVIVE_TIME) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(DECK_X[pos], DECK_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(DECK_X[pos], DECK_Y, { color: C.gold, count: 20, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDeck();

    txt(survived.toFixed(1) + 's' + ' / ' + SURVIVE_TIME + 's', W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.min(1, survived / SURVIVE_TIME);
    game.draw.rect(60, 150, barW, 16, '#0a2038', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A3', 0.6]], { tempo: 96, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
