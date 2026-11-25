// D-20092012-0009-glowlane-dash.js
// グローレーン・ダッシュ — 光る3車線を自動で走り続ける小さな配達ロボが、迫る障害物をスワイプでかわす
// 操作: 左右にスワイプしてレーンを切り替え、迫る障害物を避ける
// 終わり: 規定数(6個)の障害物を避けきればゴール成功。1回でも障害物に当たれば失敗
// @mechanic: dodge
// @theme: glowlane_dash
// 世界観: 夜の配送センターの光る3車線コース。小さな配達ロボが休みなく前進し、迫るコンテナをレーン移動でかわしてゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 避けた個数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい背景(白〜パステルグラデ)、太い白縁取り文字、光の柱・虹・星
  var C = {
    bg1: '#fff6e0', bg2: '#ffd9ec', lane: '#ffffff', laneLine: '#ffb0d8',
    bot: '#3aa0ff', botDark: '#1a70c8', ob: '#ff5a7a', obDark: '#c8203f',
    good: '#2ecc71', bad: '#ff4d5e', gold: '#ffb020', white: '#ffffff', ink: '#2a1a3a',
  };

  var GAME_TITLE = 'GLOWLANE DASH';
  var TOTAL = 6;
  var LANES = [W * 0.28, W * 0.5, W * 0.72];
  var BOT_Y = H * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var BOT = ['.##.', '####', '.##.', '#..#'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg(scroll) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg1]]);
    for (var i = 0; i < 6; i++) {
      var yy = ((i * 260 - scroll) % (H + 260) + (H + 260)) % (H + 260) - 130;
      game.draw.circle(W * (i % 2 === 0 ? 0.12 : 0.88), yy, 60, C.gold, 0.10);
    }
  }

  function drawLanes() {
    for (var i = 0; i < LANES.length; i++) {
      game.draw.rect(LANES[i] - 140, H * 0.15, 280, H * 0.65, C.lane, 0.5);
    }
    for (var j = 0; j <= LANES.length; j++) {
      var lx = j === 0 ? LANES[0] - 140 : j === LANES.length ? LANES[LANES.length - 1] + 140 : (LANES[j - 1] + LANES[j]) / 2;
      game.draw.line(lx, H * 0.15, lx, H * 0.80, C.laneLine, 4);
    }
  }

  var lane, dodged, obstacle, scroll, done, endWait, finished;
  var ready, hitStop, shake, milestoneDone, botBob;

  function newObstacle(idx) {
    var lanePick = Math.floor(game.random(0, LANES.length));
    return { lane: lanePick, y: -150, speed: 900 + idx * 55, telegraphed: false, resolved: false };
  }

  function initGame() {
    lane = 1; dodged = 0; scroll = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false; botBob = 0;
    obstacle = newObstacle(0);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.06);
    if (dir === 'left') changeLane(-1);
    else if (dir === 'right') changeLane(1);
  });

  function changeLane(d) {
    var next = lane + d;
    if (next < 0 || next >= LANES.length) {
      game.audio.play('se_tap', 0.15);
      game.fx.popup('あと1個!', LANES[lane], BOT_Y - 140, { color: C.gold, size: 30 });
      return;
    }
    lane = next;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(LANES[lane], BOT_Y, { color: C.bot, count: 6, speed: 200 });
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function updateObstacle(dt, dodgeCb) {
    if (!obstacle) return;
    obstacle.y += obstacle.speed * dt;
    var reveal = obstacle.y > BOT_Y - 700;
    if (reveal && !obstacle.telegraphed) obstacle.telegraphed = true;
    if (!obstacle.resolved && obstacle.y >= BOT_Y - 60) {
      obstacle.resolved = true;
      if (obstacle.lane === lane) {
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(LANES[lane], BOT_Y, { text: 'HIT' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else {
        dodged++;
        hitStop = 0.08;
        game.feedback.good(LANES[obstacle.lane], BOT_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.3);
        if (dodged === Math.ceil(TOTAL / 2) && !milestoneDone) {
          milestoneDone = true;
          game.fx.popup('HALFWAY!', W / 2, H * 0.35, { color: C.gold, size: 40 });
          game.audio.play('se_milestone', 0.35);
        }
        if (dodged >= TOTAL) {
          ok = true; finished = true; finish();
        } else {
          obstacle = newObstacle(dodged);
          if (dodgeCb) dodgeCb();
        }
      }
    }
  }

  var demo = { t: 0, gx: LANES[1], gy: BOT_Y - 140, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    scroll += 700 * dt;
    updateObstacle(dt, function() {});
    if (obstacle && obstacle.telegraphed && obstacle.lane !== lane && obstacle.y > BOT_Y - 550 && obstacle.y < BOT_Y - 200) {
      var d = obstacle.lane > lane ? 1 : (obstacle.lane < lane ? -1 : 0);
      if (d !== 0) { changeLaneDemo(d); }
    }
    demo.gx = LANES[lane] + Math.cos(game.time.elapsed * 2) * 14;
    demo.gy = BOT_Y - 140 + Math.sin(game.time.elapsed * 3) * 14;
  }
  function changeLaneDemo(d) {
    var next = lane + d;
    if (next < 0 || next >= LANES.length) return;
    lane = next;
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    botBob = Math.sin(game.time.elapsed * 4) * 8;
    if (state === S.ATTRACT) {
      if (dodged === undefined) initGame();
      bg(scroll);
      stepDemo(dt);
      drawLanes();
      drawObstacle();
      drawBot();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      demo.press = false;
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(scroll); drawLanes(); drawObstacle(); drawBot();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(dodged + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - dodged) + '個!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, total: TOTAL });
        else game.end.failure({ dodged: dodged, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      scroll += 700 * dt;
      updateObstacle(dt, null);
    }
    if (shake > 0) shake -= dt;

    bg(scroll); drawLanes(); drawObstacle(); drawBot();

    txt(dodged + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.12);
    game.draw.rect(60, 150, (W - 120) * (dodged / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawObstacle() {
    if (!obstacle || obstacle.y < -100 || obstacle.y > H + 100) return;
    var blink = obstacle.telegraphed && Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (obstacle.telegraphed) {
      game.draw.rect(LANES[obstacle.lane] - 100, BOT_Y - 30, 200, 8, C.bad, blink ? 0.8 : 0.3);
    }
    game.draw.rect(LANES[obstacle.lane] - 90, obstacle.y - 60, 180, 120, C.obDark);
    game.draw.rect(LANES[obstacle.lane] - 78, obstacle.y - 48, 156, 96, C.ob);
  }

  function drawBot() {
    game.draw.sprite(BOT, { '#': C.bot }, LANES[lane], BOT_Y - 140 + botBob, 16, { anchor: 'center' });
    game.draw.circle(LANES[lane], BOT_Y - 10, 40, C.botDark, 0.2);
  }

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.5]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
