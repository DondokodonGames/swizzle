// I-Switch2-0005-signal-flag-duel.js
// シグナルフラッグデュエル — 片手に持った信号灯が光った瞬間だけ素早く押し込む反射勝負
// 操作: 灯りが「光った瞬間」だけタップする。光る前や消えてからのタップは失格
// 終わり: 規定回数(3回)全てフライングなしで正しく反応できれば成功。1回でもミスすれば失敗
// @mechanic: reaction_duel
// @theme: night_watch_signal_relay
// 世界観: 夜の岬に立つ見習い信号手。対岸の相方と交わす合図灯が瞬いた瞬間だけ手元の灯りを押し返す速さ勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功した合図の回数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#0c1018', bg2: '#0a0c14', sea: '#14202c', tower: '#242c38', towerEdge: '#3a4658',
    lampOff: '#3a2c20', lampOn: '#ffcf3a', accent: '#ff3d6a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'SIGNAL DUEL';
  var TOTAL = 3;
  var LX = W * 0.5, LY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var success, done, endWait, finished;
  var ready, hitStop, shake;
  var sig; // {t, waitDur, litDur, lit, resolved}

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WATCHER = ['.##.', '####', '.##.', '##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.62, W, H * 0.4, C.sea, 0.5);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * (0.65 + i * 0.05), W, H * (0.65 + i * 0.05), '#ffffff08', 3);
    }
    game.draw.rect(LX - 30, LY + 40, 60, 260, C.towerEdge);
    game.draw.rect(LX - 22, LY + 46, 44, 248, C.tower);
  }

  function newSignal(round) {
    return { t: 0, waitDur: 0.9 + Math.random() * (1.1 - round * 0.1), lit: false, resolved: false, litT: 0 };
  }

  function initGame() {
    success = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    sig = newSignal(0);
  }

  function attemptPress() {
    if (!sig || sig.resolved || ready > 0 || done || finished) return;
    var correct = sig.lit && sig.litT < 0.5;
    sig.resolved = true;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      success++;
      game.feedback.good(LX, LY, { text: 'GOOD', color: C.good });
      game.fx.burst(LX, LY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (success === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', LX, LY - 200, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(LX, LY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (success >= TOTAL) { ok = true; finished = true; finish(); return; }
    sig = newSignal(success);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); attemptPress(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLamp(s) {
    if (!s) return;
    // telegraph: 0.5-0.8s前から点滅する予告リング(灯る前)
    var pre = s.waitDur - s.t;
    if (!s.lit && pre > 0 && pre < 0.7) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(LX, LY, 70, C.accent, 0.2);
    }
    game.draw.circle(LX, LY, 56, s.lit ? C.lampOn : C.lampOff);
    game.draw.circle(LX, LY, 56, C.towerEdge, 0);
    if (s.lit) game.draw.circle(LX, LY, 90, C.lampOn, 0.18);
    game.draw.sprite(WATCHER, { '#': C.white }, LX, LY + 220, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LX, gy: H * 0.86, press: false, sig: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.sig) demo.sig = newSignal(0);
    demo.sig.t += dt;
    if (!demo.sig.lit && demo.sig.t >= demo.sig.waitDur) { demo.sig.lit = true; demo.sig.litT = 0; }
    if (demo.sig.lit) demo.sig.litT += dt;
    sig = demo.sig;
    if (demo.sig.lit && !demo.pressed && demo.sig.litT > 0.08) {
      demo.pressed = true; demo.press = true;
      game.feedback.good(LX, LY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (demo.sig.lit && demo.sig.litT > 0.6) {
      demo.sig = null; demo.press = false; demo.pressed = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLamp(sig);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLamp(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(success + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - success) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(success, { success: success, total: TOTAL });
        else game.end.failure({ success: success, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      sig.t += dt;
      if (!sig.lit && sig.t >= sig.waitDur) { sig.lit = true; sig.litT = 0; }
      if (sig.lit) {
        sig.litT += dt;
        if (sig.litT > 0.9 && !sig.resolved) {
          // 反応できず消灯
          sig.resolved = true;
          hitStop = 0.3;
          game.feedback.bad(LX, LY, { text: 'MISS' });
          shake = 0.25;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawLamp(sig);

    txt(success + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (success / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.5], ['A3', 0.5], ['C4', 0.5], ['E4', 1]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
