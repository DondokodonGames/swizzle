// D-20222026-0038-outland-rally-chase.js
// アウトランド・ラリーチェイス — 広野を渡る旗手が、散らばる仲間を連続タップで呼び集め、対抗する隊より先に部隊を満たす
// 操作: 野を駆ける仲間の姿を連続タップで呼び止めて集める。逃げ切られる前に捕まえる
// 終わり: 規定人数を対抗の隊より先に集めれば成功。時間切れ/届かなければ失敗
// @mechanic: chase
// @theme: outland_rally_chase
// 世界観: 広野を行く旗手が、散らばる仲間たちを次々呼び止めて部隊に加え、演出だけで進む対抗の隊より先に頭数を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた人数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: くすんだ中彩度、輪郭に薄い陰影の縁取りを1段だけ足す
  var C = {
    bg: '#5a6a48', bg2: '#38402a', field: '#6a7a54', fieldDk: '#4a5638',
    ally: '#e8c868', allyDk: '#a8883c', rival: '#c86a5a',
    good: '#8ac878', bad: '#ff4d5e', gold: '#ffd24d', ink: '#1c2010',
  };

  var GAME_TITLE = 'RALLY CHASE';
  var MAX_TIME = 20;
  var NEEDED = 6;
  var RIVAL_MAX = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0c06', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_S = ['.##.', '####', '.##.', '#..#'];
  var FLAG_S = ['#', '#', '#####', '#', '#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.1 + i * 0.22), H * (0.2 + (i % 2) * 0.06), 60, C.fieldDk, 0.25);
    game.draw.sprite(FLAG_S, { '#': C.rival }, W * 0.5, H * 0.14, 10, { anchor: 'center' });
  }

  var allies, captured, rivalCount, roundClock, halfCalled, spawnT;
  var done, endWait, finished, ready, hitStop, shake;

  function spawnAlly() {
    var edge = Math.floor(Math.random() * 4);
    var x = W * 0.5 + (Math.random() - 0.5) * W * 0.7;
    var y = H * 0.35 + Math.random() * H * 0.32;
    var ang = game.random(0, Math.PI * 2);
    allies.push({ x: x, y: y, vx: Math.cos(ang) * 90, vy: Math.sin(ang) * 90, r: 56, alive: true });
  }

  function initGame() {
    allies = []; captured = 0; rivalCount = 0; roundClock = 0; halfCalled = false; spawnT = 0.2;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < allies.length; i++) {
      var a = allies[i];
      if (!a.alive) continue;
      var bob = Math.sin(game.time.elapsed * 3 + i) * 5;
      game.draw.sprite(ALLY_S, { '#': C.ally }, a.x, a.y + bob, 15, { anchor: 'center' });
    }
    game.draw.circle(W * 0.28, H * 0.94, 46, C.ally);
    txt(String(captured), W * 0.28, H * 0.94 + 12, 34, '#1c2010');
    game.draw.circle(W * 0.72, H * 0.94, 46, C.rival);
    txt(String(rivalCount), W * 0.72, H * 0.94 + 12, 34, '#1c2010');
  }

  function moveAllies(dt) {
    var pf = { x0: W * 0.08, x1: W * 0.92, y0: H * 0.28, y1: H * 0.72 };
    for (var i = allies.length - 1; i >= 0; i--) {
      var a = allies[i];
      if (!a.alive) { allies.splice(i, 1); continue; }
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < pf.x0 || a.x > pf.x1) a.vx *= -1;
      if (a.y < pf.y0 || a.y > pf.y1) a.vy *= -1;
      a.x = Math.max(pf.x0, Math.min(pf.x1, a.x));
      a.y = Math.max(pf.y0, Math.min(pf.y1, a.y));
    }
  }

  function tryCatch(x, y) {
    for (var i = 0; i < allies.length; i++) {
      var a = allies[i];
      if (!a.alive) continue;
      if (Math.hypot(x - a.x, y - a.y) < a.r) {
        a.alive = false;
        captured += 1;
        game.feedback.good(a.x, a.y, { text: 'GOOD', color: C.good });
        game.fx.burst(a.x, a.y, { color: C.gold, count: 16, speed: 320 });
        game.audio.play('se_coin', 0.4);
        if (captured === Math.ceil(NEEDED * 0.5)) {
          game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 30 });
          game.audio.play('se_milestone', 0.3);
        }
        if (captured >= NEEDED) {
          finished = true; ok = true; hitStop = 0.3;
          game.audio.play('se_success', 0.5);
          finish();
        }
        return;
      }
    }
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_tap', 0.12);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryCatch(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    spawnT -= dt;
    if (spawnT <= 0 && allies.length < 3 && cyc < 3.8) { spawnAlly(); spawnT = game.random(0.6, 0.9); }
    moveAllies(dt);
    var target = null;
    for (var i = 0; i < allies.length; i++) { if (allies[i].alive) { target = allies[i]; break; } }
    if (target) {
      demo.gx = target.x; demo.gy = target.y;
      demo.press = Math.floor(cyc * 3) % 3 === 0;
      if (demo.press && Math.random() < 0.5) tryCatch(target.x, target.y);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (allies === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.bad);
      txt(captured + ' / ' + NEEDED, W / 2, H * 0.14, 24, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - captured) + '人!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { captured: captured, rival: rivalCount };
        if (ok) game.end.success(captured, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      spawnT -= dt;
      if (spawnT <= 0 && allies.length < 3) { spawnAlly(); spawnT = game.random(0.6, 0.9); }
      moveAllies(dt);
      rivalCount = Math.min(RIVAL_MAX, Math.floor((roundClock / MAX_TIME) * RIVAL_MAX));
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = captured >= NEEDED; hitStop = 0.25;
        if (!ok) { shake = 0.2; game.feedback.bad(W * 0.5, H * 0.5, { text: 'MISS' }); game.audio.play('se_bad', 0.4); }
        else game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(captured + ' / ' + NEEDED, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.fieldDk, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['B3', 0.2], ['D4', 0.2], ['G4', 0.4]], { tempo: 145, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
