// I-Switch2-0001-mirror-stance-duel.js
// ミラースタンス — 相方と同じ構えを同時に取り、光の合図と同時にボタンを押す反射勝負
// 操作: 画面下の構えゾーンを指で押さえて溜め、光る合図が出た瞬間だけ離してタップし直す
// 終わり: 規定回数(3回)すべて合図後に反応できれば成功。合図前のフライングか反応漏れで失敗
// @mechanic: reaction_duel
// @theme: mirror_stance_duel
// 世界観: 鏡合わせの道場で向き合う二人の演武家。同じ構えを同時に取って静止し、光の合図と同時に技を繰り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応成功回数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、鮮明な縁取り、深いコントラスト
  var C = {
    bg: '#12141c', bg2: '#1c2030', dojoFloor: '#26202a', dojoLine: '#40384a',
    player: '#3fb0ff', rival: '#ff6a4a', cue: '#ffe14a', cueOff: '#3a3428',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f4ff', ink: '#0a0a12',
  };

  var GAME_TITLE = 'MIRROR STANCE';
  var TOTAL = 3;
  var PX = W * 0.32, RX = W * 0.68, FY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var won, done, endWait, finished;
  var ready, hitStop, shake;
  var round, phase, phaseT, cueDelay, holding, resolved;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STANCE_READY = ['.##.', '####', '.##.', '#.#.'];
  var STANCE_STRIKE = ['.##.', '####', '##.#', '.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(W * 0.1, H * 0.5, W * 0.8, H * 0.16, C.dojoFloor);
    for (var i = 0; i < 8; i++) game.draw.line(W * 0.1, H * 0.5 + i * 20, W * 0.9, H * 0.5 + i * 20, C.dojoLine, 1);
  }

  function newRound(r) {
    // phase: 'hold'(構え保持) -> 合図待ち -> 'cue'
    phase = 'hold'; phaseT = 0;
    cueDelay = 0.8 + game.random(0.3, 1.0) - r * 0.05;
    holding = false; resolved = false;
  }

  function initGame() {
    won = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0;
    newRound(0);
  }

  function onPressStance(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (phase === 'hold') {
      holding = true;
      game.audio.play('se_tap', 0.05);
      game.fx.burst(x, y, { color: C.player, count: 4, speed: 100 });
    } else if (phase === 'cue' && !resolved) {
      resolved = true;
      won++;
      hitStop = 0.1;
      game.feedback.good(PX, FY, { text: 'PERFECT', color: C.good });
      game.fx.burst(PX, FY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (won === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 40 });
      if (won >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound(round);
      ready = 0.3;
    } else if (phase === 'wait' && !resolved) {
      // フライング: 合図前に離した/押し直した
      resolved = true;
      hitStop = 0.35;
      game.feedback.bad(PX, FY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function onReleaseStance() {
    if (state !== S.PLAYING || phase !== 'hold') return;
    holding = false;
    phase = 'wait'; phaseT = 0;
    game.audio.play('se_tap', 0.03);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { game.audio.play('se_tap', 0.02); onPressStance(x, y); });
  game.onRelease(function(x, y) { game.fx.burst(x, y, { color: C.player, count: 4, speed: 90 }); onReleaseStance(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFighters(cueOn) {
    game.draw.sprite(cueOn ? STANCE_STRIKE : STANCE_READY, { '#': C.player }, PX, FY, 22, { anchor: 'center' });
    game.draw.sprite(cueOn ? STANCE_STRIKE : STANCE_READY, { '#': C.rival }, RX, FY, 22, { anchor: 'center', flipX: true });
    game.draw.circle(W * 0.5, FY, 16, cueOn ? C.cue : C.cueOff);
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false, cueOn: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { round = 0; newRound(0); cueDelay = 1.2; phase = 'hold'; }
    if (cyc < 0.3) { demo.press = false; demo.cueOn = false; }
    else if (cyc < cueDelay + 0.3) { demo.press = true; demo.cueOn = false; }
    else if (cyc < cueDelay + 0.45) { demo.press = true; demo.cueOn = true; game.feedback.good(PX, FY, { text: 'PERFECT', color: C.good }); }
    else { demo.press = false; demo.cueOn = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters(demo.cueOn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawFighters(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(won + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
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
      phaseT += dt;
      if (phase === 'hold' && holding && phaseT >= cueDelay) {
        phase = 'cue'; phaseT = 0;
        game.audio.play('se_milestone', 0.3);
      } else if (phase === 'hold' && !holding && phaseT > 1.5 && !resolved) {
        // 構えを保持しないまま長時間放置 → 失敗
        resolved = true;
        hitStop = 0.35;
        game.feedback.bad(PX, FY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else if (phase === 'cue' && phaseT > 0.5 && !resolved) {
        resolved = true;
        hitStop = 0.35;
        game.feedback.bad(PX, FY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else if (phase === 'wait' && phaseT > 0.6 && !resolved) {
        // 構えを離したまま戻ってこない
        phase = 'hold'; phaseT = 0;
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFighters(phase === 'cue');

    txt(won + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (won / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
