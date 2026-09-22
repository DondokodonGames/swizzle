// K-X-0028-rival-accuracy-duel.js
// ライバルアキュラシーデュエル — 同じ譜面を上下に分かれたライバルと同時に叩き、正確さで得点を競う
// 操作: 下段の自分のラインに音符が重なった瞬間にタップする。上段はライバルが自動で演奏する
// 終わり: 全12音符を終えた時点で自分の得点がライバルを上回れば成功。届かなければ失敗
// @mechanic: duel_2p
// @theme: rival_accuracy_duel
// 世界観: 一台の筐体を上下に分けた対戦演奏台。同じ譜面が上下同時に流れ、上段のライバルと下段の自分、正確に打てた分だけ得点が積み上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + 自分とライバルの得点
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深い陰影とハイライトの帯、少し彩度を落とした質感
  var C = {
    bg: '#0e1420', bg2: '#060a12', panel: '#182236', accent: '#3fa0ff',
    rival: '#ff5f6d', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400',
    white: '#eef3fb', ink: '#03060c',
  };

  var GAME_TITLE = 'RIVAL BEAT';
  var TOTAL = 12;
  var CX = W * 0.5;
  var R_LINE = H * 0.20, R_SPAWN = H * 0.08;
  var P_LINE = H * 0.80, P_SPAWN = H * 0.36;
  var MID = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, note, playerScore, rivalScore, rivalResult, rivalFlashed, flashP, flashR;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_S = ['.##.', '####', '.##.', '####', '#..#'];
  var RIVAL_S = ['.##.', '####', '.##.', '####', '#..#'];

  function beatDur(i) { return Math.max(1.15, 1.5 - i * (0.35 / (TOTAL - 1))); }

  function newNote() { return { t: 0, dur: beatDur(round), resolved: false }; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, MID - 4, W, 8, '#ffffff18');
  }

  function drawRival(flashHot) {
    game.draw.sprite(RIVAL_S, { '#': C.rival }, CX, H * 0.13, 16, { anchor: 'center' });
    game.draw.rect(CX - 150, R_LINE - 6, 300, 12, flashHot ? C.white : '#ffffff30');
    if (!finished) {
      var p = Math.min(1.3, (note ? note.t / note.dur : 0));
      var y = R_SPAWN + (R_LINE - R_SPAWN) * p;
      game.draw.circle(CX, y, 26, C.rival, 0.85);
    }
  }

  function drawPlayer(flashHot) {
    game.draw.rect(CX - 150, P_LINE - 8, 300, 16, flashHot ? C.white : '#ffffff30');
    if (!finished && note) {
      var p = Math.min(1.3, note.t / note.dur);
      var y = P_SPAWN + (P_LINE - P_SPAWN) * p;
      game.draw.circle(CX, y, 38, C.accent);
    }
    game.draw.sprite(PLAYER_S, { '#': C.accent }, CX, H * 0.90, 20, { anchor: 'center' });
  }

  function initGame() {
    round = 0; note = newNote(); playerScore = 0; rivalScore = 0;
    rivalResult = null; rivalFlashed = false; flashP = 0; flashR = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function rollRival() {
    var r = Math.random();
    if (r < 0.62) return { grade: 2, pts: 100 };
    if (r < 0.9) return { grade: 1, pts: 55 };
    return { grade: 0, pts: 0 };
  }

  function checkEnd() {
    if (round >= TOTAL) {
      ok = playerScore > rivalScore;
      finished = true; finish(); return true;
    }
    return false;
  }

  function resolvePlayer() {
    if (state !== S.PLAYING || ready > 0 || done || finished || !note || note.resolved) return;
    note.resolved = true;
    var ratio = note.t / note.dur;
    flashP = 0.15;
    if (ratio >= 0.9 && ratio <= 1.1) {
      playerScore += 100; hitStop = 0.08;
      game.feedback.good(CX, P_LINE, { text: 'PERFECT', color: C.gold });
    } else if (ratio >= 0.7 && ratio <= 1.3) {
      playerScore += 55; hitStop = 0.06;
      game.feedback.good(CX, P_LINE, { text: 'GOOD', color: C.good });
    } else {
      hitStop = 0.2; shake = 0.15;
      game.feedback.bad(CX, P_LINE, { text: 'MISS' });
    }
    advance();
  }

  function advance() {
    round++;
    if (round === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', CX, MID - 60, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
    if (checkEnd()) return;
    note = newNote();
    rivalResult = rollRival();
    rivalFlashed = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); rivalResult = rollRival(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); resolvePlayer(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: P_LINE, press: false, n: null, did: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) { demo.n = newNote(); demo.n.dur = 1.7; demo.did = false; }
    demo.n.t += dt;
    note = demo.n;
    demo.gx = CX + Math.sin(game.time.elapsed * 2.3) * 12;
    demo.gy = P_LINE + Math.cos(game.time.elapsed * 2.0) * 8;
    var ratio = demo.n.t / demo.n.dur;
    demo.press = ratio > 0.85 && ratio < 1.0;
    if (demo.press && !demo.did) { demo.did = true; flashP = 0.15; game.feedback.good(CX, P_LINE, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.2 }); }
    if (ratio > 0.6 && ratio < 0.7 && !rivalFlashed) { rivalFlashed = true; flashR = 0.15; game.audio.play('se_tap', 0.1); }
    if (ratio >= 1.3) rivalFlashed = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRival(flashR > 0);
      drawPlayer(flashP > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.30, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.34, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRival(false);
      drawPlayer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.30, 44, ok ? C.good : C.bad);
      txt('YOU ' + playerScore, W / 2, H * 0.35, 26, C.accent);
      txt('RIVAL ' + rivalScore, W / 2, H * 0.39, 26, C.rival);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(playerScore, { playerScore: playerScore, rivalScore: rivalScore });
        else game.end.failure({ playerScore: playerScore, rivalScore: rivalScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      note.t += dt;
      var ratio = note.t / note.dur;
      if (rivalResult && !rivalFlashed && ratio > 0.75 && ratio < 0.85) {
        rivalFlashed = true; flashR = 0.15;
        rivalScore += rivalResult.pts;
        game.audio.play(rivalResult.grade > 0 ? 'se_good' : 'se_bad', 0.15);
      }
      if (ratio > 1.35 && !note.resolved) {
        note.resolved = true;
        hitStop = 0.2; shake = 0.15;
        game.feedback.bad(CX, P_LINE, { text: 'MISS' });
        advance();
      }
    }
    if (flashP > 0) flashP -= dt;
    if (flashR > 0) flashR -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawRival(flashR > 0);
    drawPlayer(flashP > 0);

    txt('YOU ' + playerScore + '  RIVAL ' + rivalScore, W / 2, H * 0.44, 26, C.white);
    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, H * 0.47, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, H * 0.47, (W - 120) * (round / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.2], ['A4', 0.2], ['C5', 0.2], ['F5', 0.4]], { tempo: 142, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
