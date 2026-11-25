// D-20092012-0044-deskside-paper-toss.js
// デスクサイド紙くず投げ — 扇風機の風向きを読み、指ではじいた紙くずをゴミ箱へ入れる
// 操作: 紙くずを指ではじく(フリック)。飛ばす方向と強さは指の動きで決まる
// 終わり: 規定回数ゴミ箱に入れれば成功。既定の投げ切り回数で入らなければ失敗
// @mechanic: flick_launch
// @theme: deskside_paper_toss
// 世界観: 残業中のオフィスでうちわ代わりの扇風機が首を振る中、机の主が丸めた紙くずを指ではじき、風向きを読んでゴミ箱へ沈める
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功した投数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影・グラデ無し、ベタ塗り数色、丸角、大きい余白
  var C = {
    bg: '#eef1f5', desk: '#d8dee6', ink: '#2b3140',
    white: '#ffffff', gold: '#f5a623',
    good: '#3ecf8e', bad: '#ef5350', paper: '#f4f4f4', bin: '#8a94a6',
  };

  var GAME_TITLE = 'PAPER TOSS';
  var TOTAL = 4;
  var START_X = W * 0.5, START_Y = H * 0.70;
  var BIN_X = W * 0.5, BIN_Y = H * 0.32, BIN_R = 78;
  var GRAV = 900;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var thrown, success, wind, windT, paper, dragStart, dragging, halfShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];
  var FAN = ['.####.', '#.##.#', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.desk]]);
    game.draw.rect(0, H * 0.78, W, H * 0.3, C.desk);
  }

  function currentWind() {
    // 扇風機が首を振る: -1〜1 のサイン波
    return Math.sin(windT * 1.3) * 1;
  }

  function drawFan() {
    var fx = W * 0.18, fy = H * 0.42;
    var ang = currentWind();
    game.draw.circle(fx, fy, 60, '#c7ceda');
    game.draw.sprite(FAN, { '#': C.ink }, fx + ang * 14, fy, 12, { anchor: 'center' });
    // 風向き矢印(常時見える記号)
    var ax = fx + 90 + ang * 30;
    game.draw.line(fx + 70, fy, ax, fy, C.gold, 6);
    game.draw.line(ax, fy, ax - 14, fy - 10, C.gold, 6);
    game.draw.line(ax, fy, ax - 14, fy + 10, C.gold, 6);
  }

  function drawBin() {
    game.draw.rect(BIN_X - BIN_R, BIN_Y - 20, BIN_R * 2, 40, C.bin);
    game.draw.circle(BIN_X, BIN_Y, BIN_R * 0.55, C.ink, 0.5);
  }

  function drawPaper() {
    if (!paper) return;
    game.draw.circle(paper.x, paper.y, 22, C.paper);
    game.draw.circle(paper.x, paper.y, 22, C.ink, 0.15);
  }

  var idleT;
  function newPaper() {
    idleT = 0;
    return { x: START_X, y: START_Y, vx: 0, vy: 0, flying: false };
  }

  function initGame() {
    thrown = 0; success = 0; halfShown = false;
    windT = game.random(0, 6);
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    paper = newPaper(); dragStart = null; dragging = false;
  }

  function launch(vx, vy) {
    paper.vx = vx; paper.vy = vy; paper.flying = true;
    game.audio.play('se_jump', 0.4);
  }

  function resolveThrow(hit) {
    thrown++;
    if (hit) {
      success++;
      game.feedback.good(BIN_X, BIN_Y, { text: 'NICE', color: C.good, sound: 'se_coin' });
      game.fx.burst(BIN_X, BIN_Y, { color: C.gold, count: 16, speed: 300 });
      if (!halfShown && success >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, H * 0.5, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      game.feedback.bad(paper.x, paper.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
    if (success >= TOTAL) { ok = true; finished = true; hitStop = 0.1; finish(); return; }
    if (thrown >= TOTAL + 2) { ok = false; finished = true; hitStop = 0.15; finish(); return; }
    paper = newPaper();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || !paper || paper.flying) return;
    if (Math.hypot(x - paper.x, y - paper.y) < 90) { dragging = true; dragStart = { x: x, y: y }; game.audio.play('se_tap', 0.2); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !dragging || !dragStart) { dragging = false; return; }
    dragging = false;
    var dx = dragStart.x - x, dy = dragStart.y - y;
    var dist = Math.hypot(dx, dy);
    if (dist < 20) { dragStart = null; return; }
    var power = Math.min(1400, dist * 5.5);
    var vx = (dx / dist) * power;
    var vy = -(dy / dist) * power * 0.9 - 200;
    if (vy > -300) vy = -300;
    launch(vx, vy);
    dragStart = null;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: START_X, gy: START_Y, press: false };
  function stepDemo(dt) {
    if (paper === undefined) initGame();
    demo.t += dt;
    windT += dt;
    var cyc = demo.t % 1.5;
    if (cyc < dt || demo.t <= dt) {
      paper = newPaper(); thrown = 0; success = 0; halfShown = false;
      demo.fired = false;
    }
    if (paper.flying) {
      paper.vy += GRAV * dt;
      paper.x += paper.vx * dt + currentWind() * 60 * dt;
      paper.y += paper.vy * dt;
      demo.gx = paper.x; demo.gy = paper.y;
      if (Math.hypot(paper.x - BIN_X, paper.y - BIN_Y) < BIN_R * 0.6 && paper.vy > 0) {
        resolveThrow(true); demo.fired = false;
      } else if (paper.y > H * 0.9 || paper.x < -60 || paper.x > W + 60) {
        resolveThrow(false); demo.fired = false;
      }
    } else {
      demo.gx = paper.x; demo.gy = paper.y;
      if (cyc > 0.3 && cyc < 0.55) { demo.press = true; }
      else if (cyc >= 0.55 && !demo.fired) {
        demo.fired = true; demo.press = false;
        var aim = -(currentWind()) * 220;
        launch(aim, -900);
      } else if (cyc < 0.3) { demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFan();
      drawBin();
      drawPaper();
      game.draw.sprite(WORKER, { '#': C.ink, '.': null }, START_X, H * 0.80, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFan(); drawBin(); drawPaper();
      game.draw.sprite(WORKER, { '#': C.ink, '.': null }, START_X, H * 0.80, 18, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(success + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TOTAL - success) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { success: success, thrown: thrown, total: TOTAL };
        if (ok) game.end.success(success, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      windT += dt;
      if (paper && paper.flying) {
        paper.vy += GRAV * dt;
        paper.x += paper.vx * dt + currentWind() * 60 * dt;
        paper.y += paper.vy * dt;
        if (Math.hypot(paper.x - BIN_X, paper.y - BIN_Y) < BIN_R * 0.6 && paper.vy > 0) {
          resolveThrow(true);
        } else if (paper.y > H * 0.95 || paper.x < -60 || paper.x > W + 60) {
          resolveThrow(false);
        }
      } else if (paper && !dragging) {
        idleT += dt;
        if (idleT > 2.4) { launch((game.random(-1, 1)) * 300, -900); }
      }
      if (dragging && dragStart) { paper.x = dragStart.x; paper.y = dragStart.y; }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFan();
    drawBin();
    drawPaper();
    game.draw.sprite(WORKER, { '#': C.ink, '.': null }, START_X, H * 0.80, 18, { anchor: 'center' });

    txt(success + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
