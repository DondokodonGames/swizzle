// D-20172021-0080-fuseline-beat-switch.js
// フューズライン・ビートスイッチ — 拍に合わせてタップし、電流ラインの通る軌道を上下に切り替えて断線ヒューズを避ける
// 操作: 拍のリズムに合わせてタップし、電流ラインを上段/下段レールへ切り替えて、迫る断線ヒューズを避け続ける
// 終わり: 規定回数(9拍)避け切れば成功。判定の瞬間に断線ヒューズと同じレールにいれば失敗
// @mechanic: rhythm
// @theme: fuseline_beat_switch
// 世界観: 配電盤点検ロボットが、拍に合わせてタップして電流ラインの通る軌道を上下に切り替え、迫る断線ヒューズを避けながら奥の端子まで送電する
// 残るもの: 正誤(CLEAR/GAME OVER) + 避け切った拍数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、差し色1色だけ強く
  var C = {
    bg: '#141824', bg2: '#0a0c14', rail: '#242c3c', railGlow: '#3ad6ff',
    fuse: '#ff5a3c', fuseWarn: '#ffcf3a', current: '#3ad6ff', currentCore: '#eafcff',
    good: '#3ad6ff', bad: '#ff5a3c', gold: '#ffcf3a', white: '#eef2f8', ink: '#080a10',
  };

  var GAME_TITLE = 'FUSE SWITCH';
  var TOTAL = 9;
  var BEAT = 1.1;
  var JUDGE_T = BEAT * 0.82;
  var TELE_T = JUDGE_T - 0.5;
  var RAIL_Y = [H * 0.42, H * 0.62];
  var LINE_X = W * 0.30;
  var FUSE_X = W * 0.70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT = ['.###.', '#####', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var amb = 0.12 + 0.12 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.railGlow, amb);
    var bob = Math.sin(game.time.elapsed * 2.2) * 10;
    game.draw.sprite(BOT, { '#': C.gold }, W * 0.14 + bob, H * 0.14, 14, { anchor: 'center' });
  }

  function drawRails() {
    for (var r = 0; r < 2; r++) {
      game.draw.rect(W * 0.10, RAIL_Y[r] - 6, W * 0.80, 12, C.rail, 0.9);
    }
  }

  function drawFuse(phase) {
    var col = C.fuseWarn;
    var alpha = 0.5;
    if (phase < TELE_T) { col = C.fuseWarn; alpha = 0.35; }
    else if (phase < JUDGE_T) { col = C.fuse; alpha = 0.55 + 0.35 * Math.sin(game.time.elapsed * 16); }
    else { col = judged && !judgeOk ? C.fuse : C.fuseWarn; alpha = 0.3; }
    game.draw.rect(FUSE_X - 30, RAIL_Y[fuseLane] - 34, 60, 68, col, alpha);
    game.draw.rect(FUSE_X - 30, RAIL_Y[fuseLane] - 34, 60, 8, C.white, 0.25);
  }

  function drawLine() {
    var y = RAIL_Y[curLane];
    game.draw.circle(LINE_X, y, 30, C.current, 0.9);
    game.draw.circle(LINE_X, y, 14, C.currentCore, 0.95);
  }

  var passed, curLane, fuseLane, beatT, judged, judgeOk, halfShown;
  var done, endWait, finished, ready, hitStop, shake;

  function pickFuseLane() { return Math.floor(game.random(0, 2)); }

  function initGame() {
    passed = 0; halfShown = false;
    curLane = 0; fuseLane = pickFuseLane();
    beatT = 0; judged = false; judgeOk = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function toggle() {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    curLane = curLane === 0 ? 1 : 0;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(LINE_X, RAIL_Y[curLane], { color: C.current, count: 6, speed: 160 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    toggle();
  });

  function judgeNow() {
    judged = true;
    judgeOk = curLane !== fuseLane;
    if (judgeOk) {
      passed++;
      hitStop = 0.05;
      game.feedback.good(LINE_X, RAIL_Y[curLane], { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfShown && passed >= Math.ceil(TOTAL / 2)) { halfShown = true; game.fx.popup('HALFWAY!', W * 0.5, H * 0.25, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.35); }
      if (passed >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); }
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(FUSE_X, RAIL_Y[fuseLane], { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % BEAT;
    if (cyc < dt || demo.t <= dt) { fuseLane = pickFuseLane(); judged = false; }
    beatT = cyc;
    if (!judged && beatT >= JUDGE_T * 0.5 && curLane === fuseLane) {
      curLane = curLane === 0 ? 1 : 0;
      demo.gx = W * 0.5; demo.gy = RAIL_Y[curLane]; demo.press = true;
      game.fx.burst(LINE_X, RAIL_Y[curLane], { color: C.current, count: 6, speed: 160 });
      game.audio.play('se_tap', 0.1);
    } else { demo.press = false; }
    if (!judged && beatT >= JUDGE_T) {
      judged = true;
      game.feedback.good(LINE_X, RAIL_Y[curLane], { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fuseLane === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRails();
      drawFuse(beatT);
      drawLine();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRails();
      drawFuse(0);
      drawLine();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.10, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '拍!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { beats: passed, total: TOTAL });
        else game.end.failure({ beats: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); beatT = 0; judged = false; }
    } else if (!finished) {
      beatT += dt;
      if (!judged && beatT >= JUDGE_T) judgeNow();
      if (!finished && beatT >= BEAT) {
        beatT -= BEAT;
        fuseLane = pickFuseLane();
        judged = false;
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRails();
    drawFuse(ready > 0 ? -1 : beatT);
    drawLine();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.rail, 0.9);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.15], ['C5', 0.15], ['G4', 0.15], ['G4', 0.15]], { tempo: 164, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
