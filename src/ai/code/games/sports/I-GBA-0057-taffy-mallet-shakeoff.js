// I-GBA-0057-taffy-mallet-shakeoff.js
// 水飴もちシェイクオフ — 木槌の先にべっとり絡んだ水飴を、時間内に連打して振り落とす
// 操作: 画面を連打して木槌を振り、絡んだ水飴を弾き飛ばす
// 終わり: 規定量を振り落とせれば成功。時間切れなら失敗
// @mechanic: mash
// @theme: taffy_mallet_shakeoff
// 世界観: 縁日の水飴屋台。練りすぎて木槌にべったり絡みついた水飴を、閉店の鐘が鳴る前に叩き落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 振り落とした量
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景と祝祭演出
  var C = {
    bg: '#ffdd55', bg2: '#ff9f43', stall: '#ff5e5e', stallDark: '#c23b3b',
    mallet: '#8a5a34', malletHead: '#5c3a1e', taffy: '#ffe680', taffyDark: '#e0b400',
    good: '#2ecc71', bad: '#e74c3c', gold: '#ffffff', ink: '#2b1400', white: '#fff8e8',
  };

  var GAME_TITLE = 'TAFFY SHAKEOFF';
  var CX = W * 0.5, MY = H * 0.5;
  var NEEDED = 14;
  var LIMIT = 9.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, taffyAmt, timeLeft, swingT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALL_SPRITE = ['######', '#....#', '#....#', '######'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.sprite(STALL_SPRITE, { '#': C.stallDark }, W * 0.5, H * 0.14, 36, { anchor: 'center' });
    game.draw.rect(W * 0.1, H * 0.2, W * 0.8, 10, C.stall);
    for (var i = 0; i < 6; i++) game.draw.circle(W * (0.12 + i * 0.16), H * 0.08, 14, i % 2 ? C.stallDark : C.stall);
  }

  function drawMallet(swing, amt) {
    var s = Math.sin(swing) * 22;
    game.draw.line(CX, MY + 60, CX + s, MY - 10, C.mallet, 20);
    game.draw.rect(CX + s - 46, MY - 60, 92, 56, C.malletHead);
    // 絡んだ水飴(残量に応じて量を変える、横1pxストリップ的な段状塗り)
    var blobs = Math.ceil(amt / 8);
    for (var i = 0; i < blobs; i++) {
      var ang = (i / Math.max(1, blobs)) * Math.PI * 2;
      game.draw.circle(CX + s + Math.cos(ang) * 50, MY - 30 + Math.sin(ang) * 40, 20, C.taffy);
    }
    if (blobs > 0) game.draw.circle(CX + s, MY - 30, 34, C.taffyDark, 0.5);
  }

  function initGame() {
    hits = 0; taffyAmt = 100; timeLeft = LIMIT; swingT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function doMash() {
    if (finished || done || ready > 0) return;
    hits++;
    swingT = 0.001;
    taffyAmt = Math.max(0, taffyAmt - 100 / NEEDED);
    game.feedback.good(CX + game.random(-60, 60), MY - 30, { color: C.taffyDark, count: 6, sound: 'se_tap' });
    game.audio.play('se_tap', 0.2);
    if (hits === Math.ceil(NEEDED / 2)) {
      game.fx.popup('HALFWAY!', CX, MY - 200, { color: C.taffyDark, size: 40 });
      game.audio.play('se_milestone', 0.35);
    }
    if (hits >= NEEDED) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(CX, MY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, MY, { color: C.taffy, count: 22, speed: 420 });
      game.audio.play('se_break', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) doMash();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: MY + 220, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { hits = 0; taffyAmt = 100; }
    swingT += dt * 9;
    var tapEvery = 0.28;
    var idx = Math.floor(cyc / tapEvery);
    var within = cyc - idx * tapEvery;
    demo.press = within < 0.12;
    if (within < dt && idx < NEEDED && cyc < 3.2) doMash();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      bg();
      stepDemo(dt);
      drawMallet(swingT, taffyAmt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.28, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.32, 22, C.stallDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.stallDark);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMallet(swingT, ok ? 0 : taffyAmt);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.33, 30, C.stallDark);
      if (!ok) txt('あと1回!', W / 2, H * 0.37, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, MY, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    swingT *= (1 - dt * 3);
    if (shake > 0) shake -= dt;

    bg();
    drawMallet(swingT, taffyAmt);

    txt(hits + ' / ' + NEEDED, W / 2, H * 0.42, 32, C.ink);
    game.draw.rect(60, H * 0.46, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, H * 0.46, (W - 120) * Math.max(0, timeLeft / LIMIT), 16, timeLeft < 2.5 ? C.bad : C.stallDark);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 58, C.stallDark);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['G4', 0.25], ['B4', 0.25], ['D5', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
