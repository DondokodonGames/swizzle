// K-DS-0034-falling-orb-flick.js
// フォーリングオーブフリック — 落ちてくる玉が受け台に届く瞬間に弾き返す
// 操作: 3レーンのいずれかを落ちてくる玉が受け台に届いた瞬間、そのレーンをタップして弾き返す
// 終わり: 規定数(6個)を全て弾き返せば成功。1個でも受け台に落とせば失敗
// @mechanic: flick_launch
// @theme: falling_orb_flick
// 世界観: 独自デザインのブロック造形の番人が守る三本の落下口。落ちてくる玉が受け台に触れる寸前で弾き返し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き返せた個数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: ブロック状の面、濃淡2段の疑似立体シェーディング
  var C = {
    bg: '#2a3a5a', bg2: '#1a2440', lane: '#3a4a72', laneEdge: '#526096',
    orb: '#ffb43a', orbDark: '#a86a10', good: '#4affa0', bad: '#ff4a5a',
    gold: '#ffe23a', white: '#eef4ff', ink: '#0a0e1c',
  };

  var GAME_TITLE = 'ORB FLICK';
  var TOTAL = 6;
  var LANES = 3;
  var CATCH_Y = H * 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var flicked, done, endWait, finished;
  var ready, hitStop, shake, round, orb, flickFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARDIAN = ['#.#.#', '#####', '.###.'];

  function laneX(i) { return W * (0.22 + i * 0.28); }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < LANES; i++) {
      game.draw.rect(laneX(i) - 70, H * 0.1, 140, H * 0.62, C.lane, 0.4);
      game.draw.rect(laneX(i) - 70, H * 0.1, 140, 6, C.laneEdge, 0.6);
    }
  }

  function newOrb() {
    var n = Math.min(round, TOTAL - 1);
    return { lane: Math.floor(Math.random() * LANES), y: H * 0.14, speed: Math.min(H * 0.95, H * 0.55 + n * H * 0.055), resolved: false };
  }

  function initGame() {
    flicked = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; flickFlash = 0;
    orb = newOrb();
  }

  function flick(x) {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var lane = 0, bd = 1e9;
    for (var i = 0; i < LANES; i++) { var d = Math.abs(x - laneX(i)); if (d < bd) { bd = d; lane = i; } }
    var closeEnough = Math.abs(orb.y - CATCH_Y) < 130;
    if (lane === orb.lane && closeEnough) {
      orb.resolved = true;
      flicked++; hitStop = 0.08; flickFlash = 0.15;
      game.feedback.good(laneX(orb.lane), CATCH_Y, { text: 'FLICK', color: C.good });
      game.fx.burst(laneX(orb.lane), CATCH_Y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (flicked === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, CATCH_Y - 240, { color: C.gold, size: 36 });
      if (flicked >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      orb = newOrb();
    } else {
      game.feedback.bad(laneX(lane), CATCH_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  function failOrb() {
    orb.resolved = true;
    hitStop = 0.3;
    game.feedback.bad(laneX(orb.lane), CATCH_Y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) flick(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    for (var i = 0; i < LANES; i++) {
      game.draw.rect(laneX(i) - 60, CATCH_Y + 40, 120, 22, C.laneEdge);
    }
    game.draw.sprite(GUARDIAN, { '#': C.gold }, W * 0.5, H * 0.86, 26, { anchor: 'center' });
    if (orb && !orb.resolved) {
      var near = Math.abs(orb.y - CATCH_Y) < 130;
      if (near) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(laneX(orb.lane), CATCH_Y, 60, C.gold, 0.3);
      }
      game.draw.circle(laneX(orb.lane), orb.y, 26, C.orbDark, 0.5);
      game.draw.circle(laneX(orb.lane), orb.y, 20, C.orb);
    }
  }

  var demo = { t: 0, gx: laneX(1), gy: H * 0.92, press: false, o: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.o = newOrb(); demo.o.lane = 1; demo.o.speed = H * 0.55; }
    demo.o.y += demo.o.speed * dt;
    orb = demo.o;
    var near = Math.abs(demo.o.y - CATCH_Y) < 130;
    demo.gx = laneX(demo.o.lane);
    if (near && !demo.o.resolved) {
      demo.o.resolved = true;
      demo.press = true; flickFlash = 0.15;
      game.feedback.good(laneX(demo.o.lane), CATCH_Y, { text: 'FLICK', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.o.resolved) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(flicked + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - flicked) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(flicked, { flicked: flicked, total: TOTAL });
        else game.end.failure({ flicked: flicked, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      orb.y += orb.speed * dt;
      if (orb.y > CATCH_Y + 60 && !orb.resolved) failOrb();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(flicked + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, H * 0.72, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, H * 0.72, (W - 120) * (flicked / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
