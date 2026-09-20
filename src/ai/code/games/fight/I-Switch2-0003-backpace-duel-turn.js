// I-Switch2-0003-backpace-duel-turn.js
// バックペースデュエル — 背中合わせに構え、指定された歩数ぶんだけ押し続けてから振り向いて放つ
// 操作: ボタンを押し続けて歩数ゲージを溜め、指定の歩数ちょうどで離す(早すぎ・遅すぎは失敗)
// 終わり: 規定回数(3回)すべて指定歩数ぴったりで離せれば成功。外せば失敗
// @mechanic: hold_duration
// @theme: back_to_back_energy_duel
// 世界観: 荒野の決闘場。背中合わせに立つ二人の決闘者(自分とAIの相手)が、決められた歩数だけ歩みを保ち、合図で振り向いてエネルギー弾を放つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 決着させた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管のような縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030', ground: '#2a0a40', groundLine: '#4a1868',
    player: '#00e5ff', rival: '#ff2e88', gaugeBg: '#241040', gaugeFill: '#ffe600',
    targetMark: '#39ff6a', good: '#39ff6a', bad: '#ff3355', gold: '#ffe600',
    white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'BACK PACE';
  var TOTAL = 3;
  var PX = W * 0.5, PY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var won, done, endWait, finished;
  var ready, hitStop, shake;
  var round, pacing, paceT, targetPace, tol, resolved, facing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DUELIST_WALK = ['.##.', '####', '.##.', '#.#.'];
  var DUELIST_TURN = ['.##.', '####', '##.#', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.6, W, H * 0.3, C.ground);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.6 + i * 30, W, H * 0.6 + i * 30, C.groundLine, 2);
  }

  function newRound(r) {
    targetPace = 1.0 + game.random(0.3, 0.9) - r * 0.05;
    tol = Math.max(0.14, 0.26 - r * 0.05);
    pacing = false; paceT = 0; resolved = false; facing = false;
  }

  function initGame() {
    won = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0;
    newRound(0);
  }

  function onPressWalk(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    pacing = true; paceT = 0;
    game.audio.play('se_tap', 0.05);
    game.fx.burst(PX, PY, { color: C.player, count: 4, speed: 100 });
  }

  function onReleaseWalk() {
    if (state !== S.PLAYING || !pacing || resolved) return;
    pacing = false;
    resolved = true;
    facing = true;
    var diff = Math.abs(paceT - targetPace);
    var success = diff <= tol;
    if (success) {
      won++;
      hitStop = 0.1;
      game.feedback.good(PX, PY, { text: 'PERFECT', color: C.good });
      game.fx.burst(PX, PY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_powerup', 0.4);
      if (won === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 40 });
      if (won >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound(round);
      ready = 0.35;
    } else {
      hitStop = 0.35;
      game.feedback.bad(PX, PY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { game.audio.play('se_tap', 0.03); onPressWalk(x, y); });
  game.onRelease(function(x, y) { game.fx.burst(x, y, { color: C.gaugeFill, count: 6, speed: 100 }); onReleaseWalk(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawDuelists(turned) {
    game.draw.sprite(turned ? DUELIST_TURN : DUELIST_WALK, { '#': C.player }, PX - 90, PY, 20, { anchor: 'center' });
    game.draw.sprite(turned ? DUELIST_TURN : DUELIST_WALK, { '#': C.rival }, PX + 90, PY, 20, { anchor: 'center', flipX: true });
  }

  function drawGauge() {
    var gx = 80, gw = W - 160, gy = H * 0.78, gh = 30;
    game.draw.rect(gx, gy, gw, gh, C.gaugeBg);
    var targetX = gx + gw * Math.min(1, targetPace / 2.2);
    var tolPx = gw * (tol / 2.2);
    game.draw.rect(targetX - tolPx, gy, tolPx * 2, gh, C.targetMark, 0.35);
    if (pacing) {
      var fillW = gw * Math.min(1, paceT / 2.2);
      game.draw.rect(gx, gy, fillW, gh, C.gaugeFill);
    }
    game.draw.line(targetX, gy - 8, targetX, gy + gh + 8, C.targetMark, 4);
  }

  var demo = { t: 0, gx: PX, gy: PY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { round = 0; newRound(0); targetPace = 1.2; tol = 0.24; }
    if (cyc < 0.2) { demo.press = false; pacing = false; paceT = 0; facing = false; }
    else if (cyc < targetPace + 0.2) { demo.press = true; pacing = true; paceT = cyc - 0.2; }
    else if (cyc < targetPace + 0.35) {
      if (pacing) {
        pacing = false; facing = true;
        game.feedback.good(PX, PY, { text: 'PERFECT', color: C.good });
        game.audio.play('se_powerup', 0.2);
      }
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDuelists(facing);
      drawGauge();
      game.draw.hand(demo.gx, H * 0.9, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDuelists(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(won + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - won) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(won, { won: won, total: TOTAL });
        else game.end.failure({ won: won, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (pacing) {
        paceT += dt;
        if (paceT > targetPace + tol + 0.6 && !resolved) {
          // 溜めすぎて自滅
          resolved = true; pacing = false;
          hitStop = 0.35;
          game.feedback.bad(PX, PY, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDuelists(facing);
    drawGauge();

    txt(won + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 210, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 210, (W - 120) * (won / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['A4', 0.3], ['D5', 0.3], ['A4', 0.6]], { tempo: 118, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
