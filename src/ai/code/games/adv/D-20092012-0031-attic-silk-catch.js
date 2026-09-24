// D-20092012-0031-attic-silk-catch.js
// アティック・シルクキャッチ — 薄暗い屋根裏の梁から、飛び交う小虫めがけて糸をフリックして捕らえる
// 操作: 小虫が現れた方向へスワイプして糸を弾き飛ばし捕らえる
// 終わり: 規定数を全て捕らえれば成功。1匹でも逃せば失敗
// @mechanic: flick_launch
// @theme: attic_rafter_weaver
// 世界観: 薄暗い屋根裏の梁の主。四方の隙間から現れる小虫めがけて糸をフリックで撃ち出し、次々と捕らえていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕らえた数
// スタイル: 1BIT INK
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。中間色はディザ(市松/網点)、線の太さで距離と力を語る
  var C = {
    bg: '#0c0c10', bg2: '#18181e', ink: '#f2f2f0', dim: '#68686c',
    good: '#f2f2f0', bad: '#f2f2f0', gold: '#f2f2f0', white: '#f2f2f0', black: '#050506',
  };

  var GAME_TITLE = 'SILK CATCH';
  var CX = W * 0.5, CY = H * 0.42;
  var TOTAL = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, round, bug, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPIDER = ['#.#.#', '#####', '.###.', '#.#.#'];
  var BUG = ['.#.', '###', '.#.'];

  function dither(x, y, w, h, color) {
    var step = 8;
    for (var yy = y; yy < y + h; yy += step) {
      for (var xx = x + ((Math.floor((yy - y) / step) % 2) * step); xx < x + w; xx += step * 2) {
        game.draw.rect(xx, yy, step, step, color, 0.5);
      }
    }
  }

  function newBug() {
    var dir = Math.floor(Math.random() * 4); // 0 up,1 down,2 left,3 right
    return { dir: dir, t: 0, dur: Math.max(0.55, 0.95 - round * 0.06), telegraphed: false, resolved: false };
  }

  function bugPos(b) {
    var p = Math.min(1, b.t / b.dur);
    var fromX = CX, fromY = CY;
    if (b.dir === 0) { fromX = CX; fromY = CY - 320; }
    else if (b.dir === 1) { fromX = CX; fromY = CY + 320; }
    else if (b.dir === 2) { fromX = CX - 340; fromY = CY; }
    else { fromX = CX + 340; fromY = CY; }
    return { x: fromX + (CX - fromX) * p, y: fromY + (CY - fromY) * p };
  }

  function initGame() {
    caught = 0; round = 0; bug = newBug();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.rect(0, H * 0.12 + i * H * 0.02, W, 6, C.dim, 0.4);
    dither(0, H * 0.85, W, H * 0.15, C.dim);
    // continuous ambient flicker (triangle wave, avoids sine's flat zero-slope peak/trough)
    var ph = (game.time.elapsed % 5.3) / 5.3;
    var tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    game.draw.rect(0, 0, W, H, C.ink, 0.05 + tri * 0.11);
  }

  function drawSpider() {
    var wob = Math.sin(game.time.elapsed * 4) * 6;
    game.draw.line(CX, 0, CX, CY - 40, C.dim, 2);
    game.draw.sprite(SPIDER, { '#': C.ink }, CX + wob * 0.3, CY, 26, { anchor: 'center' });
  }

  function drawBug(b) {
    if (b.resolved) return;
    var pos = bugPos(b);
    var p = b.t / b.dur;
    if (p > 0.4) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, 46, C.ink, 0.15);
    }
    game.draw.sprite(BUG, { '#': C.ink }, pos.x, pos.y, 14, { anchor: 'center' });
  }

  function resolveCatch(swipeDir) {
    if (!bug || bug.resolved || ready > 0 || done || finished) return;
    bug.resolved = true;
    var correct = swipeDir === bug.dir;
    var pos = bugPos(bug);
    hitStop = correct ? 0.12 : 0.35;
    if (correct) {
      caught++;
      game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good, size: 28 });
      game.fx.burst(pos.x, pos.y, { color: C.ink, count: 14, speed: 300 });
      game.audio.play('se_coin', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) {
        game.fx.popup('NICE', CX, CY - 220, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
    } else {
      game.feedback.bad(pos.x, pos.y, { text: 'MISS', size: 26 });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    bug = newBug();
  }

  function dirFromSwipe(d) { return d === 'up' ? 0 : d === 'down' ? 1 : d === 'left' ? 2 : 3; }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.1);
    resolveCatch(dirFromSwipe(dir));
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

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.b) { demo.b = newBug(); demo.b.dur = 0.9; round = 0; }
    demo.b.t += dt; bug = demo.b;
    var p = demo.b.t / demo.b.dur;
    if (p > 0.5 && p < 0.66 && !demo.b.telegraphed) {
      demo.b.telegraphed = true;
      var pos = bugPos(demo.b);
      demo.gx = pos.x; demo.gy = pos.y; demo.press = true;
      game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good, size: 28 });
      game.audio.play('se_coin', 0.25);
    }
    if (p >= 1) { demo.b = null; demo.press = false; demo.gx = CX; demo.gy = H * 0.86; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSpider();
      if (bug) drawBug(bug);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSpider();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.ink);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '匹!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      bug.t += dt;
      if (bug.t / bug.dur >= 1 && !bug.resolved) {
        bug.resolved = true;
        hitStop = 0.35;
        var pos = bugPos(bug);
        game.feedback.bad(pos.x, pos.y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSpider();
    if (!finished) drawBug(bug);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.dim, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 58, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A3', 0.4]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
