// I-Wii-0001-guard-flash-react.js
// 構え早撃ち — 縦の構えを保ち、合図の閃光が走った瞬間だけ指でタップして先手を取る
// 操作: 予備動作(構えの盛り上がり)を見て早タップせず我慢し、閃光が出た瞬間にタップする
// 終わり: 規定回数(4回)全てで正しく反応できれば成功。早撃ちか反応漏れが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: dojo_torch_duel
// 世界観: 灯りを落とした道場の対峙。縦の構えを取った門下生が、師範の閃光の合図だけを頼りに先手を取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きく太い輪郭、濃い影、少色数のはっきりした塗り
  var C = {
    bg: '#1c1418', bg2: '#0c0808', floor: '#2c2028', torch: '#ff8a2a',
    gi: '#e8e0d4', giDark: '#a89c88', skin: '#d8a878',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0e8f4', ink: '#0a0608',
  };

  var GAME_TITLE = 'GUARD FLASH';
  var ROUNDS = 4;
  var CX = W * 0.5, CY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, cleared, milestoneShown;
  var ready, hitStop, shake;
  var RP = { idle: 0, windup: 1, go: 2, resolved: 3 };
  var roundPhase, phaseT, flash, bestReactMs, lastReactMs;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GI_SPRITE = ['.####.', '######', '#.##.#', '##..##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.62, W, H * 0.2, C.floor, 1);
    if (flash > 0) game.draw.rect(0, 0, W, H, '#ffffff', Math.min(0.55, flash));
  }

  function newRoundTimes() {
    return { idleDur: game.random(0.5, 1.0), windupDur: game.random(0.5, 0.8) };
  }

  function initGame() {
    cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    roundPhase = RP.idle; phaseT = 0; flash = 0; bestReactMs = 0; lastReactMs = 0;
    var rt = newRoundTimes(); roundPhase = RP.idle; phaseT = 0;
    curTimes = rt;
  }

  var curTimes;

  function onTapDuel(x, y) {
    if (finished || ready > 0 || done) return;
    if (roundPhase === RP.idle || roundPhase === RP.windup) {
      // 早撃ち
      roundPhase = RP.resolved;
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (roundPhase === RP.go) {
      roundPhase = RP.resolved;
      lastReactMs = Math.round(phaseT * 1000);
      cleared++;
      hitStop = 0.1;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 12, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && cleared >= Math.ceil(ROUNDS / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (cleared >= ROUNDS) {
        finished = true; ok = true;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        curTimes = newRoundTimes();
        roundPhase = RP.idle; phaseT = 0;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onTapDuel(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function updateRound(dt) {
    phaseT += dt;
    if (flash > 0) flash -= dt * 2;
    if (roundPhase === RP.idle && phaseT >= curTimes.idleDur) {
      roundPhase = RP.windup; phaseT = 0;
      game.audio.play('se_tap', 0.1);
    } else if (roundPhase === RP.windup && phaseT >= curTimes.windupDur) {
      roundPhase = RP.go; phaseT = 0;
      flash = 1;
      game.audio.play('se_powerup', 0.3);
    } else if (roundPhase === RP.go && phaseT >= 0.65) {
      // 反応漏れ
      roundPhase = RP.resolved;
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function drawDuelist(lean, windup) {
    game.draw.sprite(GI_SPRITE, { '#': C.gi }, CX, CY + lean, 30, { anchor: 'center' });
    if (windup > 0) {
      game.draw.circle(CX, CY - 160 - windup * 40, 22, C.torch, 0.5 + windup * 0.4);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demoPhase = 0; }
    // idle(0-0.9) -> windup(0.9-1.5) -> go(1.5) -> resolved
    if (cyc < 0.9) { demoPhase = 0; demo.press = false; }
    else if (cyc < 1.5) { demoPhase = 1; demo.press = false; }
    else if (cyc < 2.0) {
      demoPhase = 2;
      if (!demo.tapped) { demo.press = true; demo.tapped = true; game.fx.burst(CX, CY, { color: C.gold, count: 8, speed: 220 }); game.audio.play('se_good', 0.2); }
    } else { demoPhase = 3; demo.press = false; demo.tapped = false; }
  }
  var demoPhase = 0;

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundPhase === undefined) initGame();
      bg();
      stepDemo(dt);
      var windupAmt = demoPhase === 1 ? Math.min(1, (demo.t % 3.2 - 0.9) / 0.6) : (demoPhase >= 2 ? 1 : 0);
      drawDuelist(0, windupAmt);
      if (demoPhase === 2) game.draw.rect(0, 0, W, H, '#ffffff', 0.3);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawDuelist(0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateRound(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var windup2 = roundPhase === RP.windup ? Math.min(1, phaseT / curTimes.windupDur) : (roundPhase === RP.go || roundPhase === RP.resolved ? 1 : 0);
    if (!finished || hitStop > 0) drawDuelist(0, windup2); else drawDuelist(0, windup2);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
