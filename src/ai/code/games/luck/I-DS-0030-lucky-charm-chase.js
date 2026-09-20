// I-DS-0030-lucky-charm-chase.js
// 福だるま追いかけ — 逃げ回る縁起玉を指で連続タップして追いつき捕まえる
// 操作: 転がり逃げる縁起玉を指で連続タップし続け、距離を詰めて捕まえる
// 終わり: 制限時間内に捕まえれば成功。時間切れなら失敗
// @mechanic: chase
// @theme: festival_luck_booth
// 世界観: 夜店の福引き屋台。転がり出た縁起玉が逃げ回り、店番の子どもが連続タップで追いつめて捕まえる
// 残るもの: 正誤(CLEAR/GAME OVER) + 詰めた距離%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色ビビッド、太い白縁、星型パーティクル
  var C = {
    bg: '#ff7a3d', bg2: '#ff3d7a', stall: '#ffe14d', stallDark: '#e0a800',
    charm: '#ff4d4d', charmFace: '#fff2d0', kid: '#4d7aff',
    good: '#3dff8a', bad: '#ff3d3d', gold: '#ffe14d', white: '#ffffff', ink: '#2a1000',
  };

  var GAME_TITLE = 'CHARM CHASE';
  var TIME_LIMIT = 17;
  var ARENA_X0 = W * 0.1, ARENA_X1 = W * 0.9, ARENA_Y0 = H * 0.28, ARENA_Y1 = H * 0.68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, gap, timeLeft, milestoneShown;
  var ready, hitStop, shake;
  var charmX, charmY, charmVx, charmVy, kidX, kidY, closeness;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHARM_SPRITE = ['.####.', '######', '#.##.#', '######', '.####.'];
  var KID_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.68, W, H * 0.1, C.stall, 1);
    for (var i = 0; i < 6; i++) game.draw.rect(i * (W / 6), H * 0.68, 6, H * 0.1, C.stallDark, 0.5);
  }

  function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }

  function initGame() {
    gap = 1; timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    charmX = W * 0.5; charmY = ARENA_Y0 + 60;
    charmVx = game.random(-160, 160); charmVy = game.random(-120, 120);
    kidX = W * 0.5; kidY = ARENA_Y1 - 40; closeness = 0;
  }

  function updateCharm(dt) {
    charmX += charmVx * dt; charmY += charmVy * dt;
    if (charmX < ARENA_X0 + 40 || charmX > ARENA_X1 - 40) charmVx *= -1;
    if (charmY < ARENA_Y0 + 40 || charmY > ARENA_Y1 - 40) charmVy *= -1;
    charmX = Math.max(ARENA_X0 + 40, Math.min(ARENA_X1 - 40, charmX));
    charmY = Math.max(ARENA_Y0 + 40, Math.min(ARENA_Y1 - 40, charmY));
    // 距離が詰まるほど逃げ足が速くなる
    var speed = Math.hypot(charmVx, charmVy);
    var boost = 1 + closeness * 0.9;
    charmVx = (charmVx / speed) * 150 * boost;
    charmVy = (charmVy / speed) * 150 * boost;
  }

  function onCatchTap(x, y) {
    if (finished || ready > 0 || done) return;
    var d = dist(x, y, charmX, charmY);
    if (d < 90) {
      var gainD = dist(charmX, charmY, kidX, kidY);
      kidX = charmX; kidY = charmY;
      closeness = Math.min(1, closeness + 0.16);
      game.feedback.good(charmX, charmY, { text: 'NICE', color: C.good });
      game.fx.burst(charmX, charmY, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.35);
      // 逃走方向を反転させて弾く
      charmVx = game.random(-200, 200); charmVy = game.random(-160, 160);
      if (!milestoneShown && closeness >= 0.5) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', charmX, charmY - 100, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (closeness >= 1) {
        finished = true; ok = true; hitStop = 0.15;
        game.feedback.good(charmX, charmY, { text: 'CAUGHT!', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(x, y, { text: '' });
      game.audio.play('se_tap', 0.05);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onCatchTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: ARENA_Y0 + 80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { closeness = 0; charmX = W * 0.5; charmY = ARENA_Y0 + 60; }
    var beat = cyc % 0.85;
    demo.press = beat < 0.18;
    if (demo.press && beat + dt >= 0.18 * 0.5 && beat < dt + 0.02) {
      closeness = Math.min(1, closeness + 0.16);
      charmX += (Math.random() - 0.5) * 120;
      charmY += (Math.random() - 0.5) * 80;
      charmX = Math.max(ARENA_X0 + 60, Math.min(ARENA_X1 - 60, charmX));
      charmY = Math.max(ARENA_Y0 + 60, Math.min(ARENA_Y1 - 60, charmY));
      game.fx.burst(charmX, charmY, { color: C.gold, count: 6, speed: 180 });
    }
    demo.gx = charmX; demo.gy = charmY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gap === undefined) initGame();
      bg();
      stepDemo(dt);
      game.draw.sprite(CHARM_SPRITE, { '#': C.charm }, charmX, charmY, 12, { anchor: 'center' });
      game.draw.sprite(KID_SPRITE, { '#': C.kid }, kidX, kidY, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.stallDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.stallDark);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(CHARM_SPRITE, { '#': C.charm }, charmX, charmY, 12, { anchor: 'center' });
      game.draw.sprite(KID_SPRITE, { '#': C.kid }, kidX, kidY, 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(closeness * 100) + '%', W / 2, H * 0.13, 30, C.stallDark);
      if (!ok) txt('あと' + Math.max(1, Math.round((1 - closeness) * 100)) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(closeness * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      updateCharm(dt);
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(charmX, charmY, { text: 'TIME UP' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) game.draw.sprite(CHARM_SPRITE, { '#': C.charm }, charmX, charmY, 12, { anchor: 'center' });
    game.draw.sprite(KID_SPRITE, { '#': C.kid }, kidX, kidY, 14, { anchor: 'center' });

    txt(Math.round(closeness * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.stallDark, 0.4);
    game.draw.rect(60, 150, (W - 120) * closeness, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
