// D-20172021-0005-parade-fan-chase.js
// パレードファンチェイス — 広場に紛れ込んだ操り人形の観客を次々にタップで仲間にし、迫るライバル一座からかわす
// 操作: 広場をうろつく人形の観客をタップして仲間にする。金色の観客は仲間2人分の価値
// 終わり: 規定数(5人)を仲間にできれば成功。時間切れになれば失敗
// @mechanic: chase
// @theme: puppet_plaza_parade
// 世界観: 夜市の広場に立つ一座の操り人形師。うろつく観客人形を次々に仲間へ誘いながら、同じ観客を狙うライバル一座の巡回からわずかに出し抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 仲間にできた観客数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい原色、太い白フチ、ポップな光沢
  var STYLE = { bg: ['#ff9ecb', '#ff6fa8'], main: ['#ffd24d', '#e0a020'], accent: ['#4dd0ff', '#ff4d4d'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], plaza: '#ffe9c2', plazaLine: '#f2cf94',
    fan: STYLE.main[0], fanDark: STYLE.main[1], golden: '#fff35c', rival: '#8a5ac0', rivalDark: '#5a3480',
    gold: '#ffe066', good: STYLE.accent[0], bad: STYLE.accent[1], white: '#ffffff', ink: '#3a1a2a',
  };

  var GAME_TITLE = 'PARADE CHASE';
  var TARGET = 5;
  var TIME_LIMIT = 18;
  var FIELD = { x0: W * 0.12, y0: H * 0.2, x1: W * 0.88, y1: H * 0.76 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FAN_SPRITE = ['.#.', '###', '.#.'];
  var RIVAL_SPRITE = ['#.#', '###', '#.#', '#.#'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.plaza);
    for (var gx = 0; gx < 6; gx++) game.draw.circle(W * (gx / 5), H * 0.88, 10, C.plazaLine, 0.6);
  }

  function rndPos() {
    return { x: FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0), y: FIELD.y0 + Math.random() * (FIELD.y1 - FIELD.y0) };
  }

  var fans, rival, recruited, done, endWait, finished, elapsedT, milestoneShown;
  var ready, hitStop, shake;

  function makeFan(golden) {
    var p = rndPos();
    return { x: p.x, y: p.y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, golden: !!golden, alive: true, warn: false };
  }

  function initGame() {
    recruited = 0; done = false; endWait = 0; finished = false; elapsedT = 0; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
    fans = [makeFan(false), makeFan(false), makeFan(false)];
    var rp = rndPos();
    rival = { x: rp.x, y: rp.y, target: null };
  }

  function tapAt(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = 0; i < fans.length; i++) {
      var f = fans[i];
      if (!f.alive) continue;
      if (Math.hypot(x - f.x, y - f.y) < 66) {
        f.alive = false;
        var gain = f.golden ? 2 : 1;
        recruited = Math.min(TARGET, recruited + gain);
        hitStop = 0.08;
        game.feedback.good(f.x, f.y, { text: f.golden ? 'NICE' : 'GET', color: C.good });
        game.fx.burst(f.x, f.y, { color: f.golden ? C.golden : C.gold, count: f.golden ? 20 : 12, speed: 320 });
        game.audio.play(f.golden ? 'se_powerup' : 'se_coin', 0.45);
        if (!milestoneShown && recruited >= Math.ceil(TARGET / 2)) { milestoneShown = true; game.fx.popup('HALFWAY!', f.x, f.y - 160, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
        fans.push(makeFan(Math.random() < 0.18));
        if (recruited >= TARGET) { ok = true; finished = true; finish(); }
        return;
      }
    }
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapAt(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepFans(dt) {
    for (var i = 0; i < fans.length; i++) {
      var f = fans[i];
      if (!f.alive) continue;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < FIELD.x0 || f.x > FIELD.x1) f.vx *= -1;
      if (f.y < FIELD.y0 || f.y > FIELD.y1) f.vy *= -1;
    }
  }

  function stepRival(dt, resolveHits) {
    if (!rival.target || !rival.target.alive) {
      var best = null, bd = 1e9;
      for (var i = 0; i < fans.length; i++) {
        if (!fans[i].alive) continue;
        var d = Math.hypot(fans[i].x - rival.x, fans[i].y - rival.y);
        if (d < bd) { bd = d; best = fans[i]; }
      }
      rival.target = best;
    }
    if (!rival.target) return;
    var t = rival.target;
    var dx = t.x - rival.x, dy = t.y - rival.y;
    var d2 = Math.hypot(dx, dy);
    var spd = 110;
    if (d2 > 1) { rival.x += (dx / d2) * spd * dt; rival.y += (dy / d2) * spd * dt; }
    t.warn = d2 < 140;
    if (resolveHits && d2 < 44) {
      t.alive = false;
      hitStop = 0.15;
      game.feedback.bad(t.x, t.y, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.35);
      fans.push(makeFan(Math.random() < 0.18));
      rival.target = null;
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.5;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    stepFans(dt);
    stepRival(dt, false);
    if (!demo.busy) {
      var target = null, bd = 1e9;
      for (var i = 0; i < fans.length; i++) {
        if (!fans[i].alive) continue;
        var d = Math.hypot(fans[i].x - W * 0.5, fans[i].y - H * 0.5);
        if (d < bd) { bd = d; target = fans[i]; }
      }
      if (target && cyc > 1.0 && cyc < 1.3) {
        demo.busy = true; demo.gx = target.x; demo.gy = target.y; demo.press = true;
        tapAt(target.x, target.y);
      }
    }
    if (cyc > 1.5) { demo.busy = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(recruited + ' / ' + TARGET, W / 2, H * 0.13, 30, C.ink);
      if (!ok) txt('あと' + (TARGET - recruited) + '人!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(recruited, { recruited: recruited, total: TARGET });
        else game.end.failure({ recruited: recruited, total: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepFans(dt);
      stepRival(dt, true);
      if (!finished) {
        elapsedT += dt;
        if (elapsedT >= TIME_LIMIT) {
          finished = true; ok = false; hitStop = 0.15;
          game.feedback.bad(rival.x, rival.y, { text: 'TIME UP' });
          shake = 0.25;
          game.audio.play('se_failure', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(recruited + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.2);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (TIME_LIMIT - elapsedT) / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  function drawScene() {
    for (var i = 0; i < fans.length; i++) {
      var f = fans[i];
      if (!f.alive) continue;
      if (f.warn) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(f.x, f.y, 60, C.bad, 0.25);
      }
      game.draw.sprite(FAN_SPRITE, { '#': f.golden ? C.golden : C.fan }, f.x, f.y, f.golden ? 15 : 13, { anchor: 'center' });
    }
    if (rival) game.draw.sprite(RIVAL_SPRITE, { '#': C.rival }, rival.x, rival.y, 16, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
