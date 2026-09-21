// K-GBA-0029-drill-formation-march.js
// 隊列足踏み — 左右の足を交互に踏み続け、方向転換の合図が出た瞬間だけ逆側にスワイプして向きを変える
// 操作: 左右の足元パネルを交互にタップして足踏みを継続。矢印の合図が出たら合図の向きへスワイプ
// 終わり: 規定歩数(14歩)を隊列を崩さず踏み切れば成功。3回リズムか転換を外せば失敗
// @mechanic: alternate_tap
// @theme: drill_formation_march
// 世界観: 夜の練兵場に整列する隊列。太鼓のテンポで左右交互に足踏みを続け、合図が出た瞬間だけ隊列ごと向きを変える
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏み切れた歩数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 平坦な面色、単純な多角形の集合(ここは矩形/円で代替)、控えめな陰影
  var C = {
    sky: '#3a4a5a', ground: '#26323e', groundLine: '#1a242e',
    soldier: '#8ab0c8', panelL: '#4a5a6a', panelR: '#5a6a7a', panelHi: '#ffd94d',
    good: '#4de0a0', bad: '#ff5468', gold: '#ffd54d', white: '#f0f4f8', ink: '#0c1218',
  };

  var GAME_TITLE = 'DRILL MARCH';
  var TOTAL_STEPS = 14;
  var MAX_MISS = 3;
  var PANEL_L_X = W * 0.3, PANEL_R_X = W * 0.7, PANEL_Y = H * 0.62;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var steps, missed, done, endWait, finished, ready, hitStop, shake;
  var round, nextFoot, beatT, beatDur, facing, turnCue, turnT, turnDur;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SOLDIER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.ground]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.55 + i * 26, W, 2, C.groundLine);
  }

  function initGame() {
    steps = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; nextFoot = 0; beatT = 0; beatDur = 0.55; facing = 0;
    turnCue = false; turnT = 0; turnDur = 0;
    scheduleNext();
  }

  function scheduleNext() {
    beatT = 0; beatDur = Math.max(0.36, 0.58 - round * 0.014);
    // 5歩に1回、方向転換の合図を混ぜる
    turnCue = (round > 0 && round % 5 === 0);
    turnT = 0; turnDur = beatDur;
  }

  function stepOK(side) {
    if (turnCue) return; // 転換合図中は足踏み入力を無視(スワイプで受ける)
    if (side !== nextFoot) {
      registerMiss();
      return;
    }
    steps++;
    hitStop = 0.06;
    game.feedback.good(side === 0 ? PANEL_L_X : PANEL_R_X, PANEL_Y, { text: '', sound: 'se_tap', color: C.good });
    game.audio.play('se_tap', 0.2);
    if (steps === Math.ceil(TOTAL_STEPS / 2)) game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 40 });
    if (steps >= TOTAL_STEPS) { ok = true; finished = true; finish(); return; }
    nextFoot = 1 - nextFoot;
    round++;
    scheduleNext();
  }

  function turnOK(dir) {
    if (!turnCue) { game.audio.play('se_tap', 0.1); return; }
    var wantLeft = facing === 0;
    var correct = (wantLeft && dir === 'left') || (!wantLeft && dir === 'right');
    if (correct) {
      facing = 1 - facing;
      steps++;
      hitStop = 0.1;
      game.feedback.good(CX, CY, { text: 'TURN', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_milestone', 0.4);
      if (steps >= TOTAL_STEPS) { ok = true; finished = true; finish(); return; }
      round++;
      scheduleNext();
    } else {
      registerMiss();
    }
  }

  function registerMiss() {
    missed++;
    hitStop = 0.3;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    if (missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    round++;
    scheduleNext();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    if (ready > 0 || done || finished || turnCue) return;
    if (x < W * 0.5) stepOK(0); else stepOK(1);
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    if (ready > 0 || done || finished) return;
    if (dir === 'left' || dir === 'right') turnOK(dir);
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

  function drawScene() {
    game.draw.rect(PANEL_L_X - 90, PANEL_Y - 40, 180, 80, nextFoot === 0 && !turnCue ? C.panelHi : C.panelL);
    game.draw.rect(PANEL_R_X - 90, PANEL_Y - 40, 180, 80, nextFoot === 1 && !turnCue ? C.panelHi : C.panelR);
    var lean = facing === 0 ? -14 : 14;
    game.draw.sprite(SOLDIER, { '#': C.soldier }, CX + lean, CY, 26, { anchor: 'center' });
    if (turnCue) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      var wantLeft = facing === 0;
      if (blink) {
        game.draw.line(CX + (wantLeft ? -160 : 160), CY, CX + (wantLeft ? -260 : 260), CY, C.gold, 12);
      }
    }
  }

  var demo = { t: 0, gx: PANEL_L_X, gy: PANEL_Y, press: false, dFoot: 0, dBeatT: 0, dBeatDur: 0.5, dRound: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { demo.dFoot = 0; demo.dBeatT = 0; demo.dRound = 0; facing = 0; steps = 0; turnCue = false; demo.press = false; }
    demo.dBeatT += dt;
    turnCue = (demo.dRound > 0 && demo.dRound % 4 === 0);
    if (demo.dBeatT >= demo.dBeatDur) {
      demo.dBeatT = 0;
      if (turnCue) {
        var wantLeft = facing === 0;
        facing = 1 - facing;
        demo.gx = CX; demo.press = true;
        game.feedback.good(CX, CY, { text: 'TURN', color: C.good });
        game.audio.play('se_milestone', 0.25);
      } else {
        demo.gx = demo.dFoot === 0 ? PANEL_L_X : PANEL_R_X;
        demo.press = true;
        game.audio.play('se_tap', 0.12);
        demo.dFoot = 1 - demo.dFoot;
      }
      nextFoot = demo.dFoot;
      demo.dRound++;
    } else if (demo.dBeatT > demo.dBeatDur * 0.5) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(steps + ' / ' + TOTAL_STEPS, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL_STEPS - steps) + '歩!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(steps, { steps: steps, total: TOTAL_STEPS, missed: missed }); else game.end.failure({ steps: steps, total: TOTAL_STEPS, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT / beatDur >= 1) {
        registerMiss();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(steps + ' / ' + TOTAL_STEPS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (steps / TOTAL_STEPS), 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.bad : C.ink, i < missed ? 1 : 0.4);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.25], ['G3', 0.25], ['D4', 0.25], ['D4', 0.25]], { tempo: 138, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
