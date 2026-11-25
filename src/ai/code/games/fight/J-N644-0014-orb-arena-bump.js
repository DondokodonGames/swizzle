// J-N644-0014-orb-arena-bump.js
// オーブアリーナバンプ — 巨大球に乗って迫る挑戦者を連打の勢いで弾き飛ばし、円形の台に残り続ける
// 操作: 台の縁から迫ってくる挑戦者の球に連打で体当たりし、弾き飛ばす。押し負けると台から落ちる
// 終わり: 規定数(4体)を弾き飛ばせば成功。1体でも弾き返せず台へ達すれば失敗
// @mechanic: push_out
// @theme: festival_orb_arena_bump
// 世界観: 空に浮かぶ祭りの円形闘技台、巨大な球に乗った新入りが次々に迫る挑戦者の球を連打の押し合いで弾き飛ばし、自分だけが台の上に残り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き飛ばした数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 太い輪郭線、彩度高めの大きなキャラ表現
  var C = {
    bg: '#3a1a5e', bg2: '#1a0a30', platform: '#8a5aff', platformEdge: '#5a2ad0',
    player: '#ffd400', rival: '#ff5a5a', rivalDim: '#c23a3a',
    good: '#39ff8a', bad: '#ff3355', gold: '#ffd400', white: '#fff6ff', ink: '#12002a',
  };

  var GAME_TITLE = 'ORB ARENA';
  var TOTAL = 4;
  var CX = W * 0.5, CY = H * 0.5, PLATFORM_R = 320;
  var WINDOW_START = 4.2, WINDOW_STEP = 0.35, WINDOW_MIN = 2.6;
  var POWER_NEEDED = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_ORB = ['.####.', '######', '######', '.####.'];
  var RIVAL_ORB = ['.####.', '######', '.####.'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    game.draw.circle(CX, CY + 80, PLATFORM_R, C.platform);
    game.draw.circle(CX, CY + 80, PLATFORM_R - 24, C.platformEdge, 0.4);
  }

  var beaten, power, windowT, windowDur, rivalDist, resolved, finished, done, endWait, hitStop, shake, ready, halfShown;

  function newRival() {
    power = 0; windowT = 0;
    windowDur = Math.max(WINDOW_MIN, WINDOW_START - beaten * WINDOW_STEP);
    resolved = false;
  }

  function initGame() {
    beaten = 0; finished = false; done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8; halfShown = false;
    newRival();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function shove(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    power = Math.min(POWER_NEEDED, power + 9);
    game.audio.play('se_tap', 0.15);
    game.feedback.good(x, y, { text: '', color: C.gold, size: 14, count: 4 });
    if (power >= POWER_NEEDED) {
      resolved = true;
      beaten++;
      hitStop = 0.16;
      game.feedback.good(CX, CY - 100, { text: 'HIT', color: C.good });
      game.fx.burst(CX, CY - 100, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_break', 0.45);
      if (!halfShown && beaten >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
      if (beaten >= TOTAL) { ok = true; finished = true; finish(); return; }
      newRival();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) shove(x, y);
  });

  function drawScene(rivalProgress, telegraph) {
    rivalDist = 1 - rivalProgress;
    var rx = CX, ry = CY - 100 - rivalDist * 330;
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    if (!finished) {
      if (telegraph) {
        var warn = rivalProgress > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (warn) game.draw.circle(rx, ry, 70, C.bad, 0.35);
      }
      game.draw.circle(rx, ry + 20, 62, C.rivalDim, 0.6);
      game.draw.sprite(RIVAL_ORB, { '#': C.rival }, rx, ry + bob, 16, { anchor: 'center' });
    }
    game.draw.circle(CX, CY + 60, 70, C.rivalDim, 0.4);
    var pushJitter = power > 0 ? Math.sin(game.time.elapsed * 30) * 3 : 0;
    game.draw.sprite(PLAYER_ORB, { '#': C.player }, CX + pushJitter, CY + 60, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: CY + 200, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { beaten = 0; newRival(); halfShown = false; }
    windowT += dt;
    var p = windowT / windowDur;
    if (p < 0.85) {
      power = Math.min(POWER_NEEDED, p * 1.3 * POWER_NEEDED);
      demo.press = Math.floor(cyc * 8) % 2 === 0;
      demo.gx = CX + (demo.press ? 16 : -16); demo.gy = CY + 200;
      if (power >= POWER_NEEDED && !resolved) {
        resolved = true; beaten++;
        game.feedback.good(CX, CY - 100, { text: 'HIT', color: C.good });
        game.audio.play('se_break', 0.3);
        newRival();
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beaten === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene(Math.min(1, windowT / windowDur), true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(1, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(beaten + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - beaten) + '体!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(beaten, { beaten: beaten, total: TOTAL });
        else game.end.failure({ beaten: beaten, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      windowT += dt;
      power = Math.max(0, power - dt * 4);
      if (windowT >= windowDur && !resolved) {
        resolved = true;
        finished = true; ok = false; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(CX, CY + 60, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(Math.min(1, windowT / windowDur), true);
    else drawScene(1, false);

    txt(beaten + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (power / POWER_NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['A3', 0.2], ['E3', 0.2], ['C4', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
