// I-DS-0021-taffy-pull-stretch.js
// タフィープル — 両手でつまんだ飴生地を、示された長さまで一気に引き伸ばす
// 操作: 画面上の飴の両端をそれぞれ指でつまみ、2本指を左右に引き離して目標の長さまで伸ばす
// 終わり: 4回連続で目標の許容範囲内まで伸ばせば成功。範囲を外れて伸ばしすぎる/離しすぎると失敗
// @mechanic: pinch_zone
// @theme: taffy_pull_workshop
// 世界観: 下町の飴細工工房。修行中の職人が、師匠の示す長さの札どおりに飴生地を両手で伸ばして仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功させた本数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報と遊びを分割
  var C = {
    bg: '#fff3e6', bg2: '#ffe2c9', taffy: '#ffb37a', taffyDark: '#e88a44',
    hand: '#ffd9b0', good: '#5fd67a', bad: '#ff6f7a', gold: '#ffb400',
    white: '#ffffff', ink: '#6b4a2c',
  };

  var GAME_TITLE = 'TAFFY PULL';
  var CY = H * 0.46;
  var CX = W * 0.5;
  var ROUNDS = 4;
  var TOL = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, targetLen, curLen, leftId, rightId, leftX, rightX;
  var done, endWait, finished, ready, hitStop, shake, resolving;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.line(0, H * 0.78, W, H * 0.78, '#00000010', 4);
  }

  function newRound(r) {
    return Math.min(560, 220 + r * 90);
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false; resolving = false;
    ready = 0.8; hitStop = 0; shake = 0;
    targetLen = newRound(0); curLen = 140;
    leftId = null; rightId = null; leftX = CX - 70; rightX = CX + 70;
  }

  function drawTaffy(len, color) {
    var lx = CX - len / 2, rx = CX + len / 2;
    game.draw.line(lx, CY, rx, CY, C.taffyDark, 46);
    game.draw.line(lx, CY, rx, CY, color, 34);
    game.draw.sprite(HAND_SPRITE, { '#': C.hand }, lx, CY, 9, { anchor: 'center' });
    game.draw.sprite(HAND_SPRITE, { '#': C.hand }, rx, CY, 9, { anchor: 'center', flipX: true });
  }

  function evalRelease() {
    if (resolving || done || ready > 0 || finished) return;
    resolving = true;
    var diff = Math.abs(curLen - targetLen);
    if (diff <= TOL) {
      cleared++;
      game.feedback.good(CX, CY, { text: 'NICE', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (cleared === Math.ceil(ROUNDS / 2)) game.fx.popup('HALFWAY!', CX, CY - 160, { color: C.gold, size: 38 });
      hitStop = 0.12;
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      targetLen = newRound(round); curLen = 140; leftId = null; rightId = null;
      resolving = false;
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (x < CX && leftId === null) { leftId = id; leftX = x; game.feedback.good(x, y, { text: '', sound: 'se_tap', count: 4 }); }
    else if (x >= CX && rightId === null) { rightId = id; rightX = x; game.feedback.good(x, y, { text: '', sound: 'se_tap', count: 4 }); }
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (id === leftId) leftX = Math.min(x, CX - 20);
    if (id === rightId) rightX = Math.max(x, CX + 20);
    if (leftId !== null && rightId !== null) curLen = rightX - leftX;
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftId) leftId = 'done';
    if (id === rightId) rightId = 'done';
    if (leftId === 'done' && rightId === 'done') evalRelease();
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX - 70, gy: CY, gx2: CX + 70, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { curLen = 140; targetLen = 340; }
    if (cyc < 2.2) {
      var p = cyc / 2.2;
      curLen = 140 + (targetLen - 140) * p;
      demo.press = true;
    } else {
      demo.press = false;
    }
    demo.gx = CX - curLen / 2; demo.gy = CY; demo.gx2 = CX + curLen / 2;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      game.draw.line(CX - targetLen / 2 - TOL, CY - 60, CX - targetLen / 2 - TOL, CY + 60, '#00000020', 4);
      game.draw.line(CX + targetLen / 2 + TOL, CY - 60, CX + targetLen / 2 + TOL, CY + 60, '#00000020', 4);
      drawTaffy(curLen, C.taffy);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx2, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTaffy(curLen, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '本!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
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
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.line(CX - targetLen / 2 - TOL, CY - 70, CX - targetLen / 2 - TOL, CY + 70, C.gold, 5);
    game.draw.line(CX + targetLen / 2 + TOL, CY - 70, CX + targetLen / 2 + TOL, CY + 70, C.gold, 5);
    if (!finished) drawTaffy(curLen, C.taffy);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000018', 1);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['A4', 0.4], ['C5', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
