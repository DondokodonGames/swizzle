// J-N644-0012-gear-dial-hop.js
// ギアダイヤルホップ — 塔の回転歯車盤で光る安全区画へ跳び移り、縮む区画に飲まれる前を生き延びる
// 操作: 4方向に配置された歯車区画のうち光っている安全な区画へ、指を払って跳び移る
// 終わり: 規定回数(6回)跳び移り続ければ成功。方向を外す/間に合わなければ即座に落下して失敗
// @mechanic: swipe_direction
// @theme: clocktower_gear_dial_hop
// 世界観: 時計塔の見習い機工士が、回転する巨大歯車盤の上で刻一刻と縮んでいく区画を読み、光る安全区画だけへ跳び移り続けて塔底へ落ちずに生き残る
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び移れた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管の縁取り
  var C = {
    bg: '#0a0018', bg2: '#160030',
    safe: '#39ff6a', hazard: '#ff3d6a', dim: '#3a1a5a', ring: '#ffe600',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
    bot: '#4dd8ff',
  };

  var GAME_TITLE = 'GEAR HOP';
  var CX = W * 0.5, CY = H * 0.5, PAD_R = 210;
  var NEEDED = 6;
  var ROUND_TIME_START = 1.75, ROUND_TIME_MIN = 0.95, ROUND_TIME_STEP = 0.11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_FRAMES = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  var DIRS = ['up', 'down', 'left', 'right'];
  function padPos(d) {
    if (d === 'up') return { x: CX, y: CY - PAD_R };
    if (d === 'down') return { x: CX, y: CY + PAD_R };
    if (d === 'left') return { x: CX - PAD_R, y: CY };
    return { x: CX + PAD_R, y: CY };
  }

  var hops, safeDir, roundT, roundDur, resolved, finished, done, endWait, hitStop, shake, ready, botAt, botX, botY, halfShown;

  function newRound() {
    safeDir = DIRS[Math.floor(game.random(0, 4))];
    roundT = 0;
    roundDur = Math.max(ROUND_TIME_MIN, ROUND_TIME_START - hops * ROUND_TIME_STEP);
    resolved = false;
  }

  function initGame() {
    hops = 0; finished = false; done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    halfShown = false;
    botAt = 'up'; var p = padPos('up'); botX = p.x; botY = p.y;
    newRound();
  }

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    var rot = e * 0.4;
    for (var i = 0; i < 10; i++) {
      var a = rot + (i / 10) * Math.PI * 2;
      game.draw.line(CX, CY, CX + Math.cos(a) * (PAD_R + 90), CY + Math.sin(a) * (PAD_R + 90), C.dim, 3);
    }
  }

  function drawPads(showHazardShrink) {
    for (var i = 0; i < DIRS.length; i++) {
      var d = DIRS[i], p = padPos(d);
      var isSafe = d === safeDir;
      if (isSafe) {
        var pulse = 0.75 + 0.2 * Math.sin(game.time.elapsed * 8);
        game.draw.circle(p.x, p.y, 92, C.ink, 0.5);
        game.draw.circle(p.x, p.y, 78, C.safe, pulse);
        game.draw.circle(p.x, p.y, 40, C.white, 0.25);
      } else {
        var shrink = showHazardShrink ? Math.max(0.25, 1 - (roundT / roundDur) * 0.7) : 1;
        var late = roundT / roundDur > 0.55 && Math.floor(game.time.elapsed * 10) % 2 === 0;
        game.draw.circle(p.x, p.y, 92, C.ink, 0.4);
        game.draw.circle(p.x, p.y, 78 * shrink, late ? C.hazard : C.dim, 0.75);
      }
    }
    game.draw.circle(CX, CY, 34, C.ring, 0.5);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveSwipe(dir) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    var correct = dir === safeDir;
    var p = padPos(dir || safeDir);
    hitStop = correct ? 0.12 : 0.32;
    if (correct) {
      hops++;
      botAt = dir; botX = p.x; botY = p.y;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_jump', 0.4);
      if (!halfShown && hops >= Math.ceil(NEEDED / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
      if (hops >= NEEDED) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      var badP = padPos(dir || (safeDir === 'up' ? 'down' : 'up'));
      game.feedback.bad(badP.x, badP.y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    game.audio.play('se_tap', 0.1);
    resolveSwipe(dir);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: CX, gy: CY - PAD_R, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { hops = 0; newRound(); halfShown = false; }
    roundT += dt;
    if (roundT > roundDur * 0.62 && !resolved) {
      var p = padPos(safeDir);
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      resolveSwipe(safeDir);
    } else if (!resolved) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hops === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPads(true);
      var bob = Math.sin(game.time.elapsed * 3) * 5;
      game.draw.sprite(BOT_FRAMES[Math.floor(game.time.elapsed * 4) % 2], { '#': C.bot }, botX, botY + bob, 16, { anchor: 'center' });
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
      drawPads(false);
      game.draw.sprite(BOT_FRAMES[0], { '#': ok ? C.good : C.bad }, botX, botY, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hops + ' / ' + NEEDED, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (NEEDED - hops) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hops, { hops: hops, needed: NEEDED });
        else game.end.failure({ hops: hops, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundDur && !resolved) resolveSwipe(null);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawPads(true);
    var bob2 = hitStop > 0 && !ok ? 0 : Math.sin(game.time.elapsed * 3) * 5;
    game.draw.sprite(BOT_FRAMES[Math.floor(game.time.elapsed * 4) % 2], { '#': C.bot }, botX, botY + bob2, 16, { anchor: 'center' });

    txt(hops + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.15], ['C4', 0.15], ['E4', 0.15], ['A4', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
