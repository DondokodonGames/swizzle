// J-N644-0021-mineshaft-boulder-dash.js
// マインシャフトボルダーダッシュ — 背後に迫る巨大な岩から逃げ切るため、連打で全力疾走し続ける
// 操作: 連打(タップ連打)で全力疾走する。岩との距離が詰まるほど激しく連打が必要になる
// 終わり: 規定時間(8秒)、岩に飲まれず走り切れば出口へ到達し成功。距離がゼロになれば飲まれて失敗
// @mechanic: mash
// @theme: mineshaft_boulder_chase
// 世界観: 崩落し始めた坑道を走り抜ける見習い採掘夫。背後から転がってくる巨大な岩に飲まれないよう、連打で全力疾走を続けて出口を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 保った距離の割合
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット絵、暖色の坑道照明+深い岩肌の陰影
  var C = {
    sky1: '#3a2010', sky2: '#140a04', rock: '#5a3a20', rockDark: '#2a1608',
    miner: '#e0c060', boulder: '#7a5030', boulderDark: '#3a2010',
    gold: '#ffcf40', good: '#7aff6a', bad: '#ff4d4d', white: '#fff0d8', ink: '#140a04',
  };

  var GAME_TITLE = 'BOULDER DASH';
  var TIME_LIMIT = 8;
  var MAX_GAP = 1;
  var DECAY_PER_SEC = 0.16;
  var TAP_GAIN = 0.05;
  var MINER_Y = H * 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MINER_SPRITE = ['.##.', '####', '.##.'];
  var ROCK_SPRITE = ['##.##', '#####', '.###.', '..#..'];

  function bg(gapRatio) {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(e * 1.3));
    var scroll = (e * 320) % 100;
    for (var s = -1; s < 20; s++) game.draw.rect(0, s * 100 - scroll, W, 5, C.rockDark, 0.25);
    game.draw.circle(W * 0.5, H * -0.05, 200, C.boulderDark, 0.18);
  }

  function drawBoulder(gapRatio) {
    var y = MINER_Y + 260 * gapRatio;
    var scale = 30 - gapRatio * 8;
    var shakeAmt = (1 - gapRatio) * 10;
    var sx = W * 0.5 + Math.sin(game.time.elapsed * 26) * shakeAmt;
    game.draw.circle(sx, y + 40, scale * 3.2, C.boulderDark, 0.4);
    game.draw.sprite(ROCK_SPRITE, { '#': C.boulder }, sx, y, scale, { anchor: 'center' });
  }

  var gap, timeLeft, done, endWait, finished, ready, hitStop, shake, halfShown, mashFlash;

  function initGame() {
    gap = MAX_GAP; timeLeft = TIME_LIMIT; ok = false; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; mashFlash = 0;
  }

  function onMash() {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    gap = Math.min(MAX_GAP, gap + TAP_GAIN);
    mashFlash = 0.08;
    game.audio.play('se_tap', 0.18);
    if (!halfShown && timeLeft <= TIME_LIMIT / 2) { halfShown = true; game.fx.popup('あと少し!', W / 2, H * 0.3, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    onMash();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.88, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { gap = MAX_GAP; }
    gap = Math.max(0.15, gap - DECAY_PER_SEC * dt);
    var tapPhase = (cyc * 6) % 1;
    demo.press = tapPhase < 0.4;
    if (demo.press && gap < MAX_GAP) gap = Math.min(MAX_GAP, gap + TAP_GAIN * 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gap === undefined) initGame();
      bg(1 - gap);
      stepDemo(dt);
      drawBoulder(gap);
      var bob = Math.sin(game.time.elapsed * 10) * 5;
      game.draw.sprite(MINER_SPRITE, { '#': C.miner }, W * 0.5, MINER_Y + bob, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(1 - gap);
      drawBoulder(gap);
      game.draw.sprite(MINER_SPRITE, { '#': ok ? C.good : C.bad }, W * 0.5, MINER_Y, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(gap * 100) + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(gap * 100), { gapPercent: Math.round(gap * 100) });
        else game.end.failure({ gapPercent: Math.round(gap * 100) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      gap = Math.max(0, gap - DECAY_PER_SEC * dt);
      timeLeft -= dt;
      if (gap <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.3;
        game.feedback.bad(W * 0.5, MINER_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (timeLeft <= 0) {
        ok = true; finished = true; hitStop = 0.2;
        game.feedback.good(W * 0.5, MINER_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(W * 0.5, MINER_Y, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (mashFlash > 0) mashFlash -= dt;

    bg(1 - gap);
    if (!finished) drawBoulder(gap);
    var bob2 = mashFlash > 0 ? 0 : Math.sin(game.time.elapsed * 14) * 4;
    game.draw.sprite(MINER_SPRITE, { '#': C.miner }, W * 0.5, MINER_Y + bob2, 20, { anchor: 'center' });

    txt(Math.round(gap * 100) + '%', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * gap, 16, gap < 0.3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.16], ['D3', 0.16], ['F3', 0.16], ['A3', 0.32]], { tempo: 168, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
