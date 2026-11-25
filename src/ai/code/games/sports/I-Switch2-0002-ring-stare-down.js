// I-Switch2-0002-ring-stare-down.js
// リングステアダウン — 向かい合った相手と仕切り、見られている間は動かず合図で立ち合う
// 操作: 相手に見られている(視線マーカー点灯)間はボタンに触れず我慢し、視線が外れた合図の瞬間だけタップする
// 終わり: 規定回数(3回)すべて合図の瞬間だけ動ければ成功。見られている間に動くか反応漏れで失敗
// @mechanic: freeze
// @theme: ring_face_off
// 世界観: 土俵際で向かい合う二人の力士(自分とAIの相手)。仕切り線で見つめ合い、視線が外れた合図の瞬間にだけ立ち合う
// 残るもの: 正誤(CLEAR/GAME OVER) + 立ち合い成功回数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体の集合で表現、平坦色+輪郭、ブロック単位の陰影
  var C = {
    bg: '#2a1c14', bg2: '#3a2818', ring: '#c89050', ringEdge: '#8a5a2a', ringLine: '#f0d0a0',
    player: '#3fa0ff', rival: '#ff6040', eyeOn: '#ffe14a', eyeOff: '#5a5040',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff4e0', ink: '#100a06',
  };

  var GAME_TITLE = 'STARE DOWN';
  var TOTAL = 3;
  var PX = W * 0.32, RX = W * 0.68, FY = H * 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var won, done, endWait, finished;
  var ready, hitStop, shake;
  var round, watching, watchT, watchDur, cueOn, resolved, safeTapAllowed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIKISHI_STILL = ['.##.', '####', '.##.', '#..#'];
  var RIKISHI_CHARGE = ['.##.', '####', '##.#', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(W * 0.5, H * 0.48, 320, C.ringEdge);
    game.draw.circle(W * 0.5, H * 0.48, 300, C.ring);
    game.draw.circle(W * 0.5, H * 0.48, 300, C.ringLine, 0.15);
  }

  function newRound(r) {
    watching = true; watchT = 0;
    watchDur = 1.0 + game.random(0.4, 1.1) - r * 0.05;
    cueOn = false; resolved = false; safeTapAllowed = false;
  }

  function initGame() {
    won = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0;
    newRound(0);
  }

  function onTapRing(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    if (watching) {
      // 見られている間に動いた → 反則負け
      resolved = true;
      hitStop = 0.35;
      game.feedback.bad(PX, FY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
      return;
    }
    if (cueOn) {
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
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); onTapRing(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFighters(charge) {
    game.draw.sprite(charge ? RIKISHI_CHARGE : RIKISHI_STILL, { '#': C.player }, PX, FY, 22, { anchor: 'center' });
    game.draw.sprite(charge ? RIKISHI_CHARGE : RIKISHI_STILL, { '#': C.rival }, RX, FY, 22, { anchor: 'center', flipX: true });
    game.draw.circle(RX - 40, FY - 30, 14, watching ? C.eyeOn : C.eyeOff);
  }

  var demo = { t: 0, gx: PX, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { round = 0; newRound(0); watchDur = 1.4; }
    watching = cyc < watchDur;
    cueOn = cyc >= watchDur && cyc < watchDur + 0.35;
    demo.press = false;
    if (cueOn && cyc < watchDur + 0.1) {
      demo.press = true;
      game.feedback.good(PX, FY, { text: 'PERFECT', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters(cueOn);
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
      watchT += dt;
      if (watching && watchT >= watchDur) {
        watching = false; cueOn = true; watchT = 0;
        game.audio.play('se_milestone', 0.3);
      } else if (!watching && cueOn && watchT > 0.45 && !resolved) {
        // 合図を逃した
        resolved = true;
        hitStop = 0.35;
        game.feedback.bad(PX, FY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFighters(cueOn);

    txt(won + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (won / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.26, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
