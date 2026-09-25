// J-N6424-0012-scrapyard-blast-run.js
// スクラップヤード・ブラストラン — 警告標識が立つ解体エリアから、爆発する前に指で解体ボットを引っぱって逃げ切る
// 操作: 画面を押して解体ボットを直接ドラッグで動かす。警告標識が点滅するエリアからは爆発前に離れる
// 終わり: 制限時間いっぱい爆発に巻き込まれず生き延びれば成功。爆発範囲に残っていると失格
// @mechanic: drag_follow
// @theme: scrapyard_blast_evac
// 世界観: 解体現場の遠隔操作オペレーターが、次々に立つ起爆警告標識の輪から解体ボットを指でドラッグして安全域へ逃がし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 生存時間
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var C = {
    bg: '#ffdd55', bg2: '#ffb020', ground: '#d99a2a', groundDark: '#b87d1c',
    bot: '#2a6fe0', botDark: '#153a80', warn: '#ff4444', warnCore: '#ff8a2a',
    good: '#22c268', bad: '#ff3333', gold: '#ffffff', ink: '#241800', outline: '#241800',
  };

  var GAME_TITLE = 'BLAST RUN';
  var MAX_TIME = 17;
  var WARN_T = 0.7;
  var BLAST_T = 0.25;
  var FIELD_TOP = H * 0.16, FIELD_BOT = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.outline, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT = ['.####.', '######', '#.##.#', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.03 * Math.sin(game.time.elapsed * 1.5);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    for (var i = 0; i < 5; i++) {
      game.draw.rect(60 + i * 210, H * 0.82, 120, 40, i % 2 === 0 ? C.ground : C.groundDark, 0.5);
    }
  }

  var bot, zones, spawnGap, survived, done, endWait, finished, ready, hitStop, shake, milestoneAt;

  function initGame() {
    bot = { x: W * 0.5, y: H * 0.5 };
    zones = []; spawnGap = 0.9; survived = 0; milestoneAt = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnZone() {
    var x = W * 0.18 + game.random(0, 1) * W * 0.64;
    var y = FIELD_TOP + game.random(0, 1) * (FIELD_BOT - FIELD_TOP);
    zones.push({ x: x, y: y, t: WARN_T, phase: 'warn', r: 130 });
  }

  function moveBot(x, y) {
    bot.x = Math.max(50, Math.min(W - 50, x));
    bot.y = Math.max(FIELD_TOP, Math.min(FIELD_BOT, y));
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.1);
    moveBot(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    moveBot(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function caughtByBlast(z) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(bot.x, bot.y, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function stepField(dt) {
    survived += dt;
    spawnGap -= dt;
    if (spawnGap <= 0 && zones.length < 2) {
      spawnZone();
      spawnGap = 1.5 + game.random(0, 0.6) - Math.min(0.6, survived * 0.02);
    }
    for (var i = zones.length - 1; i >= 0; i--) {
      var z = zones[i];
      z.t -= dt;
      if (z.phase === 'warn' && z.t <= 0) { z.phase = 'blast'; z.t = BLAST_T; game.audio.play('se_break', 0.3); }
      else if (z.phase === 'blast' && z.t <= 0) {
        game.fx.popup('', z.x, z.y, { color: C.warn, size: 1 });
        zones.splice(i, 1);
        continue;
      }
      if (z.phase === 'blast' && game.hit.circle(bot.x, bot.y, 30, z.x, z.y, z.r)) {
        caughtByBlast(z);
        return;
      }
    }
    var m = Math.floor(survived / (MAX_TIME / 3));
    if (m > milestoneAt && m < 3) {
      milestoneAt = m;
      game.fx.popup('NICE', bot.x, bot.y - 90, { color: '#ffffff', size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (!finished && survived >= MAX_TIME) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(bot.x, bot.y, { text: 'CLEAR', color: C.good });
      game.fx.burst(bot.x, bot.y, { color: '#ffffff', count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function drawField() {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (z.phase === 'warn') {
        var a = 0.3 + 0.3 * Math.sin(game.time.elapsed * 14);
        game.draw.circle(z.x, z.y, z.r, C.warn, a * 0.5);
        game.draw.circle(z.x, z.y, 30, C.warnCore, 0.9);
      } else {
        game.draw.circle(z.x, z.y, z.r, C.warn, 0.75);
        game.draw.circle(z.x, z.y, z.r * 0.55, '#ffffff', 0.6);
      }
    }
    var bob = Math.sin(game.time.elapsed * 9) * 4;
    game.draw.sprite(BOT, { '#': C.bot }, bot.x, bot.y + bob, 13, { anchor: 'center' });
    game.draw.circle(bot.x, bot.y + 34, 22, C.botDark, 0.35);
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) initGame();
    stepField(dt);
    var danger = null;
    for (var i = 0; i < zones.length; i++) {
      if (zones[i].t < 0.55) { danger = zones[i]; break; }
    }
    var tx = danger ? (danger.x < W * 0.5 ? W * 0.78 : W * 0.22) : W * 0.5;
    var ty = danger ? (danger.y < H * 0.5 ? FIELD_BOT - 40 : FIELD_TOP + 40) : H * 0.5;
    moveBot(bot.x + (tx - bot.x) * Math.min(1, dt * 4), bot.y + (ty - bot.y) * Math.min(1, dt * 4));
    demo.gx = bot.x; demo.gy = bot.y; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bot) initGame();
      bg();
      stepDemo(dt);
      drawField();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + 's' : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawField();
      var s = Math.round(survived * 10) / 10;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(s + 's', W / 2, H * 0.13, 28, C.ink);
      if (!ok) txt('あと' + Math.max(1, Math.round(MAX_TIME - s)) + '秒!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var sF = Math.round(survived * 10) / 10;
        if (ok) game.end.success(sF, { survivedSec: sF });
        else game.end.failure({ survivedSec: sF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepField(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawField();
    txt(Math.round(survived) + ' / ' + MAX_TIME, W / 2, H * 0.05, 28, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.groundDark, 1);
    game.draw.rect(60, 150, barW * Math.min(1, survived / MAX_TIME), 16, '#ffffff');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, '#ffffff');
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.15], ['G4', 0.15], ['B4', 0.15], ['E5', 0.3]], { tempo: 168, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
