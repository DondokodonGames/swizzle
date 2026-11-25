// D-20132016-0061-skyway-coin-dash.js
// スカイウェイコインダッシュ — 自動で走り続ける配達ロボをタップでジャンプさせ、コインを拾いながらゲートまで駆け抜ける
// 操作: タップでジャンプ。迫る障害物の直前で跳んで飛び越える
// 終わり: 規定数(6個)の障害物をすべて飛び越えゲートに着けば成功。1つでも当たれば失敗
// @mechanic: camera_run
// @theme: courier_skyway_dash
// 世界観: 高架の配達ロボが自動走行するスカイウェイを駆け抜け、道中のクレートを跳び越えながら浮かぶコインを拾いゲートを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めたコイン数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+太い黒縁、ドロップシャドウ風の二重塗り
  var C = {
    bg: '#0f2a5c', bg2: '#153a7a', ground: '#0a1e40', groundEdge: '#ffcc00',
    bot: '#ff5da2', crate: '#ffcc00', crateDk: '#b38600', coin: '#fff36b',
    good: '#3ddc84', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0a1030',
  };

  var GAME_TITLE = 'SKYWAY DASH';
  var TOTAL = 6;
  var GROUND_Y = H * 0.74;
  var PLAYER_X = W * 0.28;
  var GRAVITY = 2600;
  var JUMP_V = 1450;
  var CLEAR_HEIGHT = 60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, coins, py, vy, grounded, crate, done, endWait, finished;
  var ready, hitStop, shake, idx;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_RUN = ['.##.', '####', '.##.', '#..#'];
  var BOT_JUMP = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 6; i++) {
      var x = ((i * 220) - (game.time.elapsed * 260) % 220 + W) % (W + 220) - 110;
      game.draw.rect(x, H * 0.2, 50, H * 0.5, '#ffffff', 0.04);
    }
    game.draw.rect(0, GROUND_Y + 40, W, H - GROUND_Y - 40, C.ground);
    game.draw.rect(0, GROUND_Y + 36, W, 8, C.groundEdge);
  }

  function newObstacle(i) {
    var dur = Math.max(1.4, 2.0 - i * 0.1);
    return { t: 0, dur: dur, resolved: false, telegraphed: false };
  }

  function initGame() {
    passed = 0; coins = 0; py = GROUND_Y; vy = 0; grounded = true;
    idx = 0; crate = newObstacle(0);
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function doJump() {
    if (!grounded || finished || ready > 0) return;
    vy = -JUMP_V; grounded = false;
    game.audio.play('se_jump', 0.4);
    game.feedback.good(PLAYER_X, py, { text: '', color: C.white, count: 4, sound: false });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) doJump();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveCrate() {
    var airHeight = GROUND_Y - py;
    if (airHeight >= CLEAR_HEIGHT) {
      passed++; coins++;
      hitStop = 0.08;
      game.feedback.good(crateX(crate), GROUND_Y - 40, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 38 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      idx++; crate = newObstacle(idx);
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(crateX(crate), GROUND_Y - 30, { text: 'HIT' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function crateX(cr) {
    var p = Math.min(1, cr.t / cr.dur);
    return (W + 90) + (PLAYER_X - (W + 90)) * p;
  }

  function drawCrate(cr) {
    if (!cr) return;
    var x = crateX(cr);
    var p = cr.t / cr.dur;
    var blink = p > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (blink) game.draw.line(x, GROUND_Y - 120, x, GROUND_Y + 30, C.bad, 4);
    game.draw.rect(x - 44, GROUND_Y - 76 + 6, 88, 76, C.crateDk);
    game.draw.rect(x - 44, GROUND_Y - 76, 88, 70, C.crate);
    var coinY = GROUND_Y - 200 + Math.sin(game.time.elapsed * 5) * 10;
    game.draw.circle(x, coinY, 22, C.coin);
  }

  function drawBot(y, jump) {
    var frame = Math.floor(game.time.elapsed * 8) % 2 === 0 ? BOT_RUN : BOT_JUMP;
    game.draw.sprite(jump ? BOT_JUMP : frame, { '#': C.bot }, PLAYER_X, y, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: PLAYER_X, gy: GROUND_Y - 60, press: false, dpy: GROUND_Y, dvy: 0, dgrounded: true, dcrate: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.dpy = GROUND_Y; demo.dvy = 0; demo.dgrounded = true; demo.dcrate = newObstacle(0); demo.dcrate.dur = 1.7; }
    if (!demo.dgrounded) {
      demo.dvy += GRAVITY * dt; demo.dpy += demo.dvy * dt;
      if (demo.dpy >= GROUND_Y) { demo.dpy = GROUND_Y; demo.dvy = 0; demo.dgrounded = true; }
    }
    if (demo.dcrate) {
      demo.dcrate.t += dt;
      var p = demo.dcrate.t / demo.dcrate.dur;
      if (p > 0.52 && demo.dgrounded) {
        demo.dvy = -JUMP_V; demo.dgrounded = false;
        demo.gx = PLAYER_X - 30; demo.gy = demo.dpy - 40; demo.press = true;
        game.audio.play('se_jump', 0.2);
      }
      if (p >= 1) {
        game.feedback.good(PLAYER_X, GROUND_Y - 40, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.2);
        demo.dcrate = null;
      }
    }
    demo.gx = PLAYER_X - 30; demo.gy = demo.dpy - 60;
    demo.press = !demo.dgrounded;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (py === undefined) initGame();
      bg();
      stepDemo(dt);
      if (demo.dcrate) drawCrate(demo.dcrate);
      drawBot(demo.dpy, !demo.dgrounded);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBot(py, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(coins + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(coins, { coins: coins, total: TOTAL });
        else game.end.failure({ coins: coins, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!grounded) {
        vy += GRAVITY * dt; py += vy * dt;
        if (py >= GROUND_Y) { py = GROUND_Y; vy = 0; grounded = true; }
      }
      crate.t += dt;
      if (crate.t >= crate.dur && !crate.resolved) { crate.resolved = true; resolveCrate(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawCrate(crate);
    drawBot(py, !grounded);

    txt(coins + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 168, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
