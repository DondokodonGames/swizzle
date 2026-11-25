// J-N644-0018-statue-garden-mimic.js
// スタチューガーデンミミック — 庭園の先導像が目を光らせた合図の間だけ、示された方向へ動きを真似る
// 操作: 先導像の目が光る合図の瞬間だけ、示された矢印の方向へ指を払って動きを真似る。光っていない間は何も押さない
// 終わり: 規定回数(5回)真似できれば成功。合図なしに動く/合図に遅れると即座に見咎められ失敗
// @mechanic: freeze
// @theme: garden_statue_mimic_watch
// 世界観: 月夜の庭園、先導する石像が目を光らせた一瞬だけ手本の動きを示す。見習いの小石像はその合図の間だけ動きを真似て倣い、光っていない間はじっと固まって見咎められないようにする
// 残るもの: 正誤(CLEAR/GAME OVER) + 真似できた回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラット単色、太めの丸角ライン、影は使わない
  var C = {
    bg: '#dff0e4', bg2: '#c8e6cf', hedge: '#4a8a5a', hedgeDark: '#356a3f',
    statue: '#c7c2b0', statueDark: '#a49e88', eyeOff: '#7a7568', eyeOn: '#ffd23a',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd23a', ink: '#12321c', white: '#ffffff',
  };

  var GAME_TITLE = 'GARDEN MIMIC';
  var NEEDED = 5;
  var CX = W * 0.5, CY = H * 0.40;
  var DIRS = ['up', 'down', 'left', 'right'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STATUE_DORMANT = ['.####.', '######', '#.##.#', '######', '.#..#.'];
  var STATUE_CUE = ['.####.', '######', '#.##.#', '######', '.#..#.'];

  var mimicked, phase, phaseT, cueDir, done, endWait, finished, ready, hitStop, shake, caught;

  function newPhase() {
    var r = Math.random();
    if (r < 0.65) { phase = 'dormant'; phaseT = 0.9 + Math.random() * 0.6; }
    else { phase = 'cue'; phaseT = Math.max(0.55, 0.95 - mimicked * 0.05); cueDir = DIRS[Math.floor(game.random(0, 4))]; }
  }

  function initGame() {
    mimicked = 0; done = false; endWait = 0; caught = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newPhase();
  }

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(e * 1.3));
    for (var i = 0; i < 5; i++) {
      game.draw.rect(60 + i * (W - 120) / 4, H * 0.62, 40, H * 0.2, i % 2 === 0 ? C.hedge : C.hedgeDark);
    }
  }

  function drawStatue() {
    var lit = phase === 'cue';
    game.draw.circle(CX, CY + 20, 190, C.statueDark, 0.4);
    game.draw.sprite(lit ? STATUE_CUE : STATUE_DORMANT, { '#': C.statue }, CX, CY, 30, { anchor: 'center' });
    game.draw.circle(CX - 40, CY - 30, 14, lit ? C.eyeOn : C.eyeOff, lit ? 0.95 : 0.6);
    game.draw.circle(CX + 40, CY - 30, 14, lit ? C.eyeOn : C.eyeOff, lit ? 0.95 : 0.6);
    if (lit) {
      var pulse = 0.4 + 0.3 * Math.sin(game.time.elapsed * 12);
      game.draw.circle(CX, CY, 220, C.eyeOn, 0.08 + pulse * 0.05);
      drawArrow(cueDir);
    }
  }

  function drawArrow(dir) {
    var ax = CX, ay = CY + 260, len = 70, w = 36;
    var bob = 1 + 0.15 * Math.sin(game.time.elapsed * 10);
    if (dir === 'up') {
      game.draw.line(ax, ay + len * bob, ax, ay - len * bob, C.gold, 14);
      game.draw.line(ax - w, ay - len * bob * 0.4, ax, ay - len * bob, C.gold, 14);
      game.draw.line(ax + w, ay - len * bob * 0.4, ax, ay - len * bob, C.gold, 14);
    } else if (dir === 'down') {
      game.draw.line(ax, ay - len * bob, ax, ay + len * bob, C.gold, 14);
      game.draw.line(ax - w, ay + len * bob * 0.4, ax, ay + len * bob, C.gold, 14);
      game.draw.line(ax + w, ay + len * bob * 0.4, ax, ay + len * bob, C.gold, 14);
    } else if (dir === 'left') {
      game.draw.line(ax + len * bob, ay, ax - len * bob, ay, C.gold, 14);
      game.draw.line(ax - len * bob * 0.4, ay - w, ax - len * bob, ay, C.gold, 14);
      game.draw.line(ax - len * bob * 0.4, ay + w, ax - len * bob, ay, C.gold, 14);
    } else {
      game.draw.line(ax - len * bob, ay, ax + len * bob, ay, C.gold, 14);
      game.draw.line(ax + len * bob * 0.4, ay - w, ax + len * bob, ay, C.gold, 14);
      game.draw.line(ax + len * bob * 0.4, ay + w, ax + len * bob, ay, C.gold, 14);
    }
  }

  function attempt(dir) {
    if (done || ready > 0 || hitStop > 0 || caught) return;
    if (phase === 'cue') {
      if (dir === cueDir) {
        mimicked++;
        hitStop = 0.1;
        game.feedback.good(CX, CY - 260, { text: 'GOOD', color: C.good });
        game.fx.burst(CX, CY - 260, { color: C.gold, count: 14, speed: 320 });
        game.audio.play('se_good', 0.35);
        if (mimicked === Math.ceil(NEEDED / 2)) { game.fx.popup('HALFWAY!', CX, H * 0.2, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
        if (mimicked >= NEEDED) { ok = true; caught = true; finish(); }
        else newPhase();
      } else {
        caught = true; ok = false; hitStop = 0.3; shake = 0.3;
        game.feedback.bad(CX, CY - 260, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    } else {
      caught = true; ok = false; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(CX, CY - 260, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function autoMiss() {
    caught = true; ok = false; hitStop = 0.3; shake = 0.3;
    game.feedback.bad(CX, CY - 260, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onSwipe(function(dir) {
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.1); attempt(dir); }
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: CX, gy: CY, press: false, phase: 'dormant', phaseT: 1.2 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    if (demo.phaseT <= 0) {
      if (demo.phase === 'dormant') { demo.phase = 'cue'; demo.phaseT = 0.85; cueDir = DIRS[Math.floor(game.random(0, 4))]; }
      else { demo.phase = 'dormant'; demo.phaseT = 1.2; }
    }
    phase = demo.phase;
    var pts = { up: { x: CX, y: CY - 200 }, down: { x: CX, y: CY + 200 }, left: { x: CX - 200, y: CY }, right: { x: CX + 200, y: CY } };
    if (demo.phase === 'cue' && demo.phaseT < 0.5 && demo.phaseT > 0.35) {
      demo.press = true;
      var p = pts[cueDir];
      demo.gx = p.x; demo.gy = p.y;
      game.feedback.good(CX, CY - 260, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    } else if (demo.phase === 'cue') {
      demo.press = false;
    } else {
      demo.press = false; demo.gx = CX; demo.gy = CY;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawStatue();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStatue();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(mimicked + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (NEEDED - mimicked) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(mimicked, { mimicked: mimicked, needed: NEEDED });
        else game.end.failure({ mimicked: mimicked, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!caught) {
      phaseT -= dt;
      if (phaseT <= 0) {
        if (phase === 'cue') autoMiss();
        else newPhase();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawStatue();

    txt(mimicked + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
