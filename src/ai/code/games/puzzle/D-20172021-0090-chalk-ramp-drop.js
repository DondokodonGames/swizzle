// D-20172021-0090-chalk-ramp-drop.js
// チョークランプ・ドロップ — 落ち続ける玉の下に指でチョークの坂を描き足し、転がしてゴールの穴へ導く
// 操作: 落下中の玉の進路を読み、行く手に指でチョークの坂線を描き足して玉を転がし、ゴールの穴へ誘導する
// 終わり: 制限時間内に玉をゴールの穴まで転がし込めば成功。画面下へ落下する/時間切れで失敗
// @mechanic: guide_path
// @theme: workshop_chalk_marble_drop
// 世界観: 玩具工房の見習い職人が、落ち続けるガラス玉の行く手に即興でチョークの坂を描き足し、作業台のゴール穴まで転がして届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + ゴールまでの到達度
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: くっきりした高解像度ピクセル調、濃い輪郭線+2段の陰影
  var C = {
    bg: '#3c2f22', bg2: '#241a10', board: '#5a4530', chalk: '#f5e6c8', chalkDark: '#c9b98a',
    marble: '#7fd8ff', marbleDark: '#2a8ac0', goal: '#ffce4a',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffce4a', ink: '#150f08', white: '#f5ece0',
  };

  var GAME_TITLE = 'RAMP DROP';
  var TIME_LIMIT = 18;
  var GRAVITY = 1500;
  var BALL_R = 26;
  var GOAL_R = 46;
  var START_X = W * 0.5, START_Y = H * 0.2;
  var GOAL_X = W * 0.5, GOAL_Y = H * 0.68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRAFTSMAN_SPRITE = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffce4a', pulse * 0.3);
    game.draw.sprite(CRAFTSMAN_SPRITE, { '#': C.chalk }, W * 0.14, H * 0.86, 12, { anchor: 'center' });
    var hazBlink = Math.floor(game.time.elapsed * 5) % 2 === 0;
    game.draw.rect(0, H * 0.9, W, 10, hazBlink ? C.bad : C.chalkDark, 0.7);
  }

  var bx, by, bvx, bvy, platforms, curStroke, progressMax, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    bx = START_X; by = START_Y; bvx = 0; bvy = 0;
    platforms = []; curStroke = null;
    progressMax = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R + 18, C.board, 0.6);
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R, C.goal, 0.5 + 0.3 * Math.sin(game.time.elapsed * 4));
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R - 16, C.bg2, 1);
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      game.draw.line(p.x1, p.y1, p.x2, p.y2, C.chalkDark, 18);
      game.draw.line(p.x1, p.y1, p.x2, p.y2, C.chalk, 10);
    }
    if (curStroke && curStroke.length > 1) {
      for (var j = 1; j < curStroke.length; j++) {
        game.draw.line(curStroke[j - 1].x, curStroke[j - 1].y, curStroke[j].x, curStroke[j].y, C.chalk, 10, 0.7);
      }
    }
    game.draw.circle(bx, by + 8, BALL_R * 0.7, '#000000', 0.2);
    game.draw.circle(bx, by, BALL_R, C.marble);
    game.draw.circle(bx - 7, by - 7, BALL_R * 0.35, C.white, 0.6);
    game.draw.circle(bx, by, BALL_R, C.marbleDark, 0.2);
  }

  function physicsStep(dt) {
    bvy += GRAVITY * dt;
    bx += bvx * dt;
    by += bvy * dt;
    if (bx < 40) { bx = 40; bvx *= -0.3; }
    if (bx > W - 40) { bx = W - 40; bvx *= -0.3; }
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      var vx = p.x2 - p.x1, vy = p.y2 - p.y1;
      var len2 = vx * vx + vy * vy;
      if (len2 < 1) continue;
      var t = Math.max(0, Math.min(1, ((bx - p.x1) * vx + (by - p.y1) * vy) / len2));
      var cx = p.x1 + vx * t, cy = p.y1 + vy * t;
      var dx = bx - cx, dy = by - cy;
      var dist = Math.hypot(dx, dy);
      var minDist = BALL_R + 9;
      if (dist < minDist && dist > 0.001) {
        var nx = dx / dist, ny = dy / dist;
        bx = cx + nx * minDist;
        by = cy + ny * minDist;
        var tx = vx / Math.sqrt(len2), ty = vy / Math.sqrt(len2);
        var vt = bvx * tx + bvy * ty;
        bvx = tx * vt * 0.985;
        bvy = ty * vt * 0.985 + 4;
      }
    }
    progressMax = Math.max(progressMax, Math.min(1, (by - START_Y) / (GOAL_Y - START_Y)));
    if (!halfCalled && progressMax >= 0.5) {
      halfCalled = true;
      game.fx.popup('HALFWAY!', bx, by - 70, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
  }

  function checkGoal() {
    if (Math.hypot(bx - GOAL_X, by - GOAL_Y) < GOAL_R + BALL_R * 0.5) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(GOAL_X, GOAL_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(GOAL_X, GOAL_Y, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_success', 0.45);
      finish();
      return true;
    }
    return false;
  }

  function checkFall() {
    if (by > H + 60) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(bx, H * 0.92, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return true;
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    curStroke = [{ x: x, y: y }];
    game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !curStroke) return;
    var last = curStroke[curStroke.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 12) return;
    curStroke.push({ x: x, y: y });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !curStroke) return;
    for (var i = 1; i < curStroke.length; i++) {
      platforms.push({ x1: curStroke[i - 1].x, y1: curStroke[i - 1].y, x2: curStroke[i].x, y2: curStroke[i].y });
    }
    if (platforms.length > 40) platforms.splice(0, platforms.length - 40);
    curStroke = null;
    game.audio.play('se_tap', 0.08);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: START_X, gy: START_Y, press: false };
  var DEMO_STROKE = [
    { x: W * 0.28, y: H * 0.42 }, { x: W * 0.5, y: H * 0.5 }, { x: W * 0.72, y: H * 0.42 },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) initGame();
    if (cyc < 0.55) {
      demo.gx = START_X; demo.gy = START_Y - 60; demo.press = false;
      physicsStep(dt);
    } else if (cyc < 1.4) {
      var t2 = (cyc - 0.55) / 0.85;
      var idx = Math.min(DEMO_STROKE.length - 1, Math.floor(t2 * DEMO_STROKE.length));
      var pt = DEMO_STROKE[idx];
      demo.gx = pt.x; demo.gy = pt.y; demo.press = true;
      if (!curStroke) curStroke = [{ x: DEMO_STROKE[0].x, y: DEMO_STROKE[0].y }];
      var lastp = curStroke[curStroke.length - 1];
      if (Math.hypot(pt.x - lastp.x, pt.y - lastp.y) > 4) curStroke.push({ x: pt.x, y: pt.y });
      physicsStep(dt);
    } else {
      if (curStroke) {
        for (var i = 1; i < curStroke.length; i++) platforms.push({ x1: curStroke[i - 1].x, y1: curStroke[i - 1].y, x2: curStroke[i].x, y2: curStroke[i].y });
        curStroke = null;
      }
      demo.press = false;
      demo.gx = bx; demo.gy = by;
      physicsStep(dt);
      if (!checkGoal()) checkFallDemo();
    }
  }
  function checkFallDemo() {
    if (by > H + 60) { bx = START_X; by = START_Y; bvx = 0; bvy = 0; platforms = []; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.round(progressMax * 100) + '%', W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(progressMax * 100), { progress: Math.round(progressMax * 100) });
        else game.end.failure({ progress: Math.round(progressMax * 100) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      physicsStep(dt);
      if (!checkGoal()) checkFall();
      roundClock += dt;
      if (!finished && roundClock >= TIME_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(bx, by, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(Math.round(progressMax * 100) + '%', W / 2, H * 0.06, 30, C.white);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#241a10', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.85, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
