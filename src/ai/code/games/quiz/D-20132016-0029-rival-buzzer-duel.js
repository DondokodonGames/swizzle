// D-20132016-0029-rival-buzzer-duel.js
// ライバルブザーデュエル — 合図ランプが光った瞬間、隣のライバルより先にボタンを叩く
// 操作: 中央のランプが光るまで我慢し、光った瞬間だけボタンをタップ。光る前に押すと即失格
// 終わり: 規定回数(4回)すべてライバルより先に押せれば成功。1回でも遅れる/フライングすれば失敗
// @mechanic: reaction_duel
// @theme: rival_buzzer_booth
// 世界観: 早押しブースの対決台。ランプが灯った刹那だけライバルより早くボタンを叩く挑戦者。回を追うごとにライバルの反応も速くなる
// 残るもの: 正誤(CLEAR/GAME OVER) + 勝ち抜いた回数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var C = {
    bg: '#241236', bg2: '#150a22', player: '#4dd2ff', rival: '#ff6b4d',
    lampOff: '#3a2a52', lampOn: '#ffe23d', good: '#3dff9e', bad: '#ff3d5e',
    gold: '#ffe23d', white: '#ffffff', ink: '#100818',
  };

  var GAME_TITLE = 'BUZZER DUEL';
  var TOTAL = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CX = W * 0.5, LAMP_Y = H * 0.38;
  var PX = W * 0.26, RX = W * 0.74, CHAR_Y = H * 0.56;
  var BTN_Y = H * 0.86;

  var won, round, rnd, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHAMP = ['.##.', '####', '.oo.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.line(0, H * 0.10 + i * 40, W, H * 0.10 + i * 40 - 60, '#ffffff05', 4);
  }

  function newRound(r) {
    return { phase: 'wait', t: 0, waitT: 0.6 + Math.random() * 0.8, aiDelay: Math.max(0.30, 0.72 - r * 0.08), rt: 0 };
  }

  function initGame() {
    won = 0; round = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    rnd = newRound(0);
  }

  function react() {
    if (ready > 0 || done || hitStop > 0 || finished || !rnd) return;
    game.audio.play('se_tap', 0.05);
    if (rnd.phase === 'wait') {
      // ランプ点灯前のフライング
      hitStop = 0.3;
      game.feedback.bad(CX, LAMP_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    } else if (rnd.phase === 'live') {
      won++;
      hitStop = 0.1;
      rnd.phase = 'won';
      game.feedback.good(PX, CHAR_Y, { text: 'WIN', color: C.good });
      game.fx.burst(CX, LAMP_Y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_powerup', 0.4);
      if (won === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, LAMP_Y - 200, { color: C.gold, size: 40 });
      if (won >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; rnd = newRound(round);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) react();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateRound(c, dt) {
    c.t += dt;
    if (c.phase === 'wait' && c.t >= c.waitT) { c.phase = 'live'; c.t = 0; game.audio.play('se_milestone', 0.3); }
    else if (c.phase === 'live') {
      c.rt += dt;
      if (c.rt >= c.aiDelay && !finished) {
        // ライバルに先を越された
        c.phase = 'lost';
        hitStop = 0.32;
        game.feedback.bad(RX, CHAR_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawLamp(c) {
    var lit = c.phase === 'live' || c.phase === 'won';
    game.draw.circle(CX, LAMP_Y - 130, 20, C.lampOff, 0.7);
    game.draw.circle(CX, LAMP_Y - 130, 20, lit ? C.lampOn : C.lampOff);
    if (lit) game.draw.circle(CX, LAMP_Y - 130, 40, C.lampOn, 0.25);
  }

  function drawChar(x, col, bobY, reacting) {
    game.draw.sprite(CHAMP, { '#': col, o: C.gold }, x, CHAR_Y + bobY, 20, { anchor: 'center' });
    game.draw.rect(x - 60, BTN_Y - 20, 120, 60, reacting ? C.gold : '#3a2a52');
    game.draw.rect(x - 52, BTN_Y - 12, 104, 44, reacting ? '#fff3a0' : '#241a34');
  }

  var demo = { t: 0, gx: PX, gy: BTN_Y, press: false, reacted: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { rnd = newRound(1); demo.reacted = false; }
    updateRound(rnd, dt);
    if (rnd.phase === 'live' && !demo.reacted) {
      demo.reacted = true;
      rnd.phase = 'won';
      demo.press = true;
      game.feedback.good(PX, CHAR_Y, { text: 'WIN', color: C.good });
      game.fx.burst(CX, LAMP_Y, { color: C.gold, count: 10, speed: 300 });
      game.audio.play('se_powerup', 0.25);
    }
    if (rnd.phase !== 'live') demo.press = Math.floor(demo.t * 6) % 3 === 0 && rnd.phase === 'won';
    demo.gx += (PX - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (BTN_Y - demo.gy) * Math.min(1, dt * 5);
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 2) * 5;

    if (state === S.ATTRACT) {
      if (rnd === undefined) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      drawLamp(rnd);
      drawChar(PX, C.player, bob, rnd.phase === 'live' || rnd.phase === 'won');
      drawChar(RX, C.rival, -bob, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + TOTAL : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLamp(rnd);
      drawChar(PX, C.player, 0, false);
      drawChar(RX, C.rival, 0, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(won + ' / ' + TOTAL, W / 2, H * 0.14, 30, C.white);
      if (!ok && won === TOTAL - 1) txt('あと1本!', W / 2, H * 0.19, 24, C.gold);
      if (ok && (game.best === 0 || won >= game.best)) txt('NEW RECORD', W / 2, H * 0.19, 24, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(won, { won: won, total: TOTAL }); else game.end.failure({ won: won, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateRound(rnd, dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLamp(rnd);
    drawChar(PX, C.player, bob, rnd.phase === 'live'); drawChar(RX, C.rival, -bob, false);

    txt(won + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 160, W - 120, 16, '#ffffff22', 0.5);
    game.draw.rect(60, 160, (W - 120) * (won / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
