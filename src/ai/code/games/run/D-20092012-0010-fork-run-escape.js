// D-20092012-0010-fork-run-escape.js
// フォークラン・エスケープ — 追ってくる大きな影から、分かれ道を正しい方向へスワイプして逃げ切る小さな探検者
// 操作: 分岐点で安全な方の道が光るので、その方向へスワイプして進路を選ぶ
// 終わり: 規定数(5箇所)の分岐を正しく抜けきれば逃げ切り成功。誤った道へ進めば影に捕まり失敗
// @mechanic: swipe_direction
// @theme: fork_run_escape
// 世界観: 積み木で組まれた立方体の地下遺跡。小さな探検者が、追ってくる巨大な影から分かれ道を選びながら出口まで走り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた分岐数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg1: '#2a1f3a', bg2: '#140c20', blockTop: '#8a6fd8', blockLeft: '#5a4aa8', blockRight: '#3e3080',
    pathTop: '#3a2c58', pathLeft: '#241a40', shadowMon: '#1a0e28', shadowGlow: '#6a2aff',
    runner: '#ffd94a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffe14a', white: '#f4eefc', ink: '#120a1e',
  };

  var GAME_TITLE = 'FORK ESCAPE';
  var TOTAL = 5;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var RUNNER = ['.##.', '####', '.##.', '#..#'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function voxelBlock(x, y, s, topC, leftC, rightC, alpha) {
    game.draw.rect(x - s, y - s * 0.5, s * 2, s * 0.6, topC, alpha);
    game.draw.rect(x - s, y, s, s * 0.9, leftC, alpha);
    game.draw.rect(x, y, s, s * 0.9, rightC, alpha);
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      voxelBlock(W * (0.12 + (i % 2) * 0.76), H * (0.12 + i * 0.16), 46, C.blockTop, C.blockLeft, C.blockRight, 0.35);
    }
  }

  var forks, idx, shadowChase, done, endWait, finished, runnerX;
  var ready, hitStop, shake, milestoneDone;

  function buildForks() {
    forks = [];
    for (var i = 0; i < TOTAL; i++) {
      forks.push({ safe: Math.random() < 0.5 ? -1 : 1, resolved: false, y: H * 0.30 + i * 0 });
    }
  }

  function initGame() {
    buildForks();
    idx = 0; shadowChase = 0; runnerX = CX;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.08);
    if (dir === 'left') resolveFork(-1);
    else if (dir === 'right') resolveFork(1);
  });

  function resolveFork(pick) {
    var f = forks[idx];
    if (!f || f.resolved) return;
    f.resolved = true;
    var correct = pick === f.safe;
    hitStop = correct ? 0.1 : 0.35;
    if (correct) {
      runnerX = CX + pick * 90;
      game.feedback.good(runnerX, H * 0.55, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      idx++;
      shadowChase = Math.max(0, shadowChase - 0.16);
      if (idx === Math.ceil(TOTAL / 2) && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup('HALFWAY!', CX, H * 0.35, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.35);
      }
      if (idx >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      shake = 0.3;
      game.feedback.bad(CX + pick * 90, H * 0.55, { text: 'CAUGHT' });
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

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function tickChase(dt) {
    if (!finished) shadowChase += dt * 0.12;
    if (shadowChase > 1) shadowChase = 1;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var stepDur = 4.4 / (TOTAL + 1);
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    tickChase(dt);
    var wantIdx = Math.min(TOTAL, Math.floor(cyc / stepDur));
    while (idx < wantIdx && !finished) {
      var f = forks[idx];
      demo.gx = CX + f.safe * 220;
      demo.press = true;
      resolveFork(f.safe);
    }
    demo.gy = H * 0.9 + Math.sin(game.time.elapsed * 3) * 16;
    if (Math.floor(cyc / stepDur) === wantIdx && cyc % stepDur > stepDur * 0.5) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (idx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      drawShadow();
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawPath(); drawShadow(); drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(idx + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - idx) + '箇所!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(idx, { idx: idx, total: TOTAL });
        else game.end.failure({ idx: idx, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      tickChase(dt);
    }
    if (shake > 0) shake -= dt;

    bg(); drawPath(); drawShadow(); drawRunner();

    txt(idx + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (idx / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawPath() {
    var f = forks[idx];
    voxelBlock(CX - 90, H * 0.62, 100, C.pathTop, C.pathLeft, C.pathLeft, 0.9);
    voxelBlock(CX + 90, H * 0.62, 100, C.pathTop, C.pathLeft, C.pathLeft, 0.9);
    if (f && !f.resolved) {
      var pulse = 0.5 + 0.3 * Math.sin(game.time.elapsed * 6);
      game.draw.circle(CX + f.safe * 90, H * 0.62, 70, C.shadowGlow, pulse * 0.4);
    }
  }

  function drawShadow() {
    var sy = H * 0.85 + shadowChase * H * 0.10;
    var bob = Math.sin(game.time.elapsed * 3) * 10;
    game.draw.circle(runnerX + Math.cos(game.time.elapsed * 1.5) * 20, sy + bob, 90 + shadowChase * 40, C.shadowMon, 0.55);
  }

  function drawRunner() {
    var bob = Math.sin(game.time.elapsed * 4) * 8;
    game.draw.sprite(RUNNER, { '#': C.runner }, runnerX, H * 0.55 + bob, 15, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
