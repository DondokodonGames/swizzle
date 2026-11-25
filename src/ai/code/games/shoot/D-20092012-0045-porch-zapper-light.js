// D-20092012-0045-porch-zapper-light.js
// 軒先ザッパーライト — 灯りに群がる虫を指で次々にタップして退治する
// 操作: 灯りの周りに現れる虫を、消える前に素早くタップして倒す
// 終わり: 規定数を退治すれば成功。制限時間切れなら失敗
// @mechanic: chase
// @theme: porch_zapper_light
// 世界観: 夜更けの軒先に灯る誘蛾灯へ次々と群がる虫を、番人が指先ひとつで捕まえては退治していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 退治した数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var C = {
    bg: '#0a0e24', bg2: '#151a3a', lamp: '#ffe066', lampGlow: '#fff3b0',
    ink: '#050510', white: '#ffffff', gold: '#ffd23d',
    good: '#4dff9e', bad: '#ff4d6a', bug: '#7c4dff', bugWing: '#c8b6ff',
  };

  var GAME_TITLE = 'ZAPPER LIGHT';
  var TOTAL = 8;
  var TIME_LIMIT = 18;
  var LAMP_X = W * 0.5, LAMP_Y = H * 0.20;
  var FIELD_X0 = W * 0.16, FIELD_X1 = W * 0.84, FIELD_Y0 = H * 0.30, FIELD_Y1 = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var bug, caught, timeLeft, bugLife, halfShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUG_A = ['.#.#.', '#####', '.###.', '#.#.#'];
  var BUG_B = ['#...#', '.###.', '#####', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    // 誘蛾灯のジジッという明滅(常時、画面全体の明るさが小刻みに揺れる)
    var flicker = (Math.floor(game.time.elapsed * 3) % 2 === 0) ? 0.16 : 0.05;
    game.draw.rect(0, 0, W, H, C.lampGlow, flicker);
    var pulse = 0.5 + Math.sin(game.time.elapsed * 4) * 0.15;
    game.draw.circle(LAMP_X, LAMP_Y, 220, C.lampGlow, 0.1 + pulse * 0.08);
    game.draw.circle(LAMP_X, LAMP_Y, 46, C.lamp);
    game.draw.circle(LAMP_X, LAMP_Y, 46, C.lampGlow, 0.4);
  }

  function newBug() {
    var x = game.random(FIELD_X0, FIELD_X1);
    var y = game.random(FIELD_Y0, FIELD_Y1);
    return { x: x, y: y, life: bugLife, age: 0 };
  }

  function drawBug() {
    if (!bug) return;
    var frame = Math.floor(game.time.elapsed * 10) % 2 === 0 ? BUG_A : BUG_B;
    var scaleIn = Math.min(1, bug.age / 0.15);
    // 常時のホバリング揺らぎ(羽ばたきのブレ)。センターX付近の静止判定対策も兼ねる
    var bx = bug.x + Math.sin(game.time.elapsed * 9) * 10;
    var by = bug.y + Math.cos(game.time.elapsed * 6.5) * 8;
    game.draw.sprite(frame, { '#': C.bug, '.': null }, bx, by, 12 * scaleIn, { anchor: 'center' });
    // 明滅+白縁(狙う物の記号文法)
    if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
      game.draw.circle(bx, by, 58, C.white, 0.12);
    }
  }

  function initGame() {
    caught = 0; timeLeft = TIME_LIMIT; halfShown = false; bugLife = 1.1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    bug = newBug();
  }

  function catchBug() {
    if (!bug) return;
    caught++;
    game.feedback.good(bug.x, bug.y, { text: 'GOOD', color: C.good, sound: 'se_break' });
    game.fx.burst(bug.x, bug.y, { color: C.gold, count: 14, speed: 320 });
    bugLife = Math.max(0.5, bugLife - 0.05);
    if (!halfShown && caught >= Math.ceil(TOTAL / 2)) {
      halfShown = true;
      game.fx.popup('HALFWAY!', W * 0.5, H * 0.46, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.5);
    }
    if (caught >= TOTAL) { ok = true; finished = true; hitStop = 0.1; finish(); return; }
    bug = newBug();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (bug && Math.hypot(x - bug.x, y - bug.y) <= 70) {
      catchBug();
    } else {
      game.audio.play('se_tap', 0.15);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LAMP_X, gy: LAMP_Y, press: false };
  function stepDemo(dt) {
    if (bug === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      caught = 0; halfShown = false; bugLife = 1.1;
      bug = { x: LAMP_X + 130, y: LAMP_Y + 240, life: bugLife, age: 0.2 };
      demo.fired = false;
    }
    if (bug) bug.age += dt;
    if (cyc > 0.35 && cyc < 0.6) { demo.gx = bug.x; demo.gy = bug.y; demo.press = true; }
    else if (cyc >= 0.6 && !demo.fired) { demo.fired = true; demo.press = false; catchBug(); if (bug) { bug.x = LAMP_X + 130; bug.y = LAMP_Y + 240; bug.age = 0.2; } }
    else if (cyc < 0.35) { demo.fired = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBug();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.62, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBug();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TOTAL - caught) + '匹!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: caught, total: TOTAL };
        if (ok) game.end.success(caught, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(LAMP_X, LAMP_Y, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      } else if (bug) {
        bug.age += dt;
        if (bug.age >= bug.life) { bug = newBug(); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBug();

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    var warn = timeLeft < 3;
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, warn ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
