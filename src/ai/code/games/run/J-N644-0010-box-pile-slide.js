// J-N644-0010-box-pile-slide.js
// ボックスパイルスライド — 崩れる箱の山を指で追いかけながら滑り降り、中身を集めて合計点を稼ぐ
// 操作: 指を画面上で左右に動かすとキャラがそのまま付いてくる。落ちてくる箱の下で受け止めて中身を回収する
// 終わり: 規定点(20点)を集めれば成功。爆弾箱に3回当たる、または時間切れなら失敗
// @mechanic: drag_follow
// @theme: falling_box_pile_courier
// 世界観: 崩れかけの荷物倉庫で働く配達人が、山から滑り落ちてくる木箱の下に指のとおりに滑り込み、当たり箱の中身だけを拾い集める
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた合計点
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg: '#c9a97a', bg2: '#a8895c', box: '#d9a865', boxTop: '#f0c988', boxSide: '#a87a3f',
    bomb: '#e05a4d', bombTop: '#ff8a7a', bombSide: '#a33a2d',
    courier: '#4d7cff', courierDark: '#2a4bb0',
    good: '#4de08a', bad: '#ff5c4d', gold: '#ffd24d', ink: '#2a1a0a', white: '#fff6e6',
  };

  var GAME_TITLE = 'BOX SLIDE';
  var TIME_LIMIT = 18;
  var NEEDED = 20;
  var MAX_HP = 3;
  var FALL_DUR = 1.6;
  var CATCH_Y = H * 0.80, TOP_Y = H * 0.18;
  var CATCH_R = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
  }

  function drawBox(x, y, sz, isBomb, danger) {
    var top = isBomb ? (danger ? C.bombTop : C.bombTop) : C.boxTop;
    var side = isBomb ? C.bombSide : C.boxSide;
    var face = isBomb ? (danger ? C.bad : C.bomb) : C.box;
    game.draw.rect(x - sz / 2, y - sz / 2, sz, sz, face);
    game.draw.rect(x - sz / 2, y - sz / 2, sz, sz * 0.3, top, 0.6);
    game.draw.rect(x + sz / 2 - sz * 0.2, y - sz / 2, sz * 0.2, sz, side, 0.5);
  }

  var boxes, score, hp, playerX, timeLeft, hitFlash, spawnT;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    boxes = []; score = 0; hp = MAX_HP; playerX = W * 0.5;
    timeLeft = TIME_LIMIT; hitFlash = 0; spawnT = 0.5;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnBox() {
    var isBomb = Math.random() < 0.22;
    var val = isBomb ? 0 : (1 + Math.floor(game.random(0, 3)));
    boxes.push({ x: game.random(W * 0.16, W * 0.84), t: 0, isBomb: isBomb, val: val, warned: false });
  }

  function catchBox(b) {
    if (b.isBomb) {
      hp--;
      hitFlash = 0.25; shake = 0.2;
      game.feedback.bad(playerX, CATCH_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      if (hp <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.audio.play('se_failure', 0.5);
        finish();
      }
    } else {
      score += b.val;
      game.feedback.good(playerX, CATCH_Y, { text: '+' + b.val, color: C.gold });
      game.fx.burst(playerX, CATCH_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_coin', 0.4);
      if (score >= Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', playerX, CATCH_Y - 140, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (score >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); playerX = x; } });
  game.onMove(function(x, y) {
    if (state === S.PLAYING) {
      if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
      playerX = x;
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    spawnT -= dt;
    if (spawnT <= 0 && boxes.length < 4) { spawnBox(); spawnT = 0.85 + game.random(-0.15, 0.3); }
    for (var i = boxes.length - 1; i >= 0; i--) {
      var b = boxes[i];
      b.t += dt / FALL_DUR;
      if (!b.warned && b.isBomb && b.t > 0.7) b.warned = true;
      if (b.t >= 1) {
        boxes.splice(i, 1);
        if (Math.abs(b.x - playerX) < CATCH_R) { catchBox(b); if (finished) return; }
      }
    }
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0; finished = true; hitStop = 0.2;
      if (score >= NEEDED) { ok = true; game.audio.play('se_success', 0.5); }
      else { ok = false; game.audio.play('se_failure', 0.4); }
      game.feedback[ok ? 'good' : 'bad'](playerX, CATCH_Y, { text: ok ? 'CLEAR' : 'TIME UP' });
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var y = TOP_Y + b.t * (CATCH_Y - TOP_Y);
      var sz = 60 + b.t * 60;
      var danger = b.isBomb && b.t > 0.7 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      drawBox(b.x, y, sz, b.isBomb, danger);
    }
    game.draw.circle(playerX, CATCH_Y + 70, 60, C.courierDark, 0.4);
    game.draw.sprite(COURIER_SPRITE, { '#': hitFlash > 0 ? C.bad : C.courier }, playerX, CATCH_Y, 28, { anchor: 'center' });
    for (var k = 0; k < MAX_HP; k++) {
      game.draw.circle(W * 0.5 - 60 + k * 60, H * 0.16, 14, k < hp ? C.gold : C.ink, k < hp ? 1 : 0.3);
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: CATCH_Y, press: true };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { resetDemo(); spawnBox(); boxes[0].x = W * 0.5; boxes[0].isBomb = false; boxes[0].val = 2; }
    if (boxes.length === 0) spawnBox();
    var b = boxes[0];
    b.t += dt / FALL_DUR;
    playerX += (b.x - playerX) * Math.min(1, dt * 6);
    demo.gx = playerX; demo.gy = CATCH_Y; demo.press = true;
    if (b.t >= 1) {
      boxes.splice(0, 1);
      score += b.val;
      game.feedback.good(playerX, CATCH_Y, { text: '+' + b.val, color: C.gold });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (hitFlash > 0) hitFlash -= dt;

    if (state === S.ATTRACT) {
      if (boxes === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(score + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - score) + '点!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { score: score, needed: NEEDED });
        else game.end.failure({ score: score, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(score + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.15);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
