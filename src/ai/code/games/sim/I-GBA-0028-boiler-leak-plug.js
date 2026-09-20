// I-GBA-0028-boiler-leak-plug.js
// ボイラーリークプラグ — あちこちから噴き出す配管の水漏れを、両手の指で同時に押さえて塞ぐ
// 操作: 漏れた箇所を指で押さえ続ける。同時に複数箇所が噴き出したら両手の指で同時に塞ぐ
// 終わり: 制限時間、塞ぎ漏らしを規定回数未満に抑えれば成功。塞ぎ漏らしが上限に達すれば失敗
// @mechanic: coop_2zone
// @theme: boiler_room_pipe_leak
// 世界観: 地下ボイラー室の整備士が、次々弾ける配管の水漏れ箇所を両手の指で同時に押さえ続け、部屋が浸水する前に凌ぎきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 塞いだ箇所の数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色グラデ、大きく丸いUI、疑似立体のハイライト
  var C = {
    bg: '#3a5a78', bg2: '#22384a', pipe: '#7a8a94', pipeDark: '#4a5860',
    leak: '#5fd0ff', leakDark: '#1c8ac0', plug: '#ffd24d',
    good: '#5aff8a', bad: '#ff5a5a', gold: '#ffd24d', white: '#f4f8fc', ink: '#0a1420',
  };

  var GAME_TITLE = 'LEAK PLUG';
  var DUR = 22;
  var MISS_LIMIT = 4;
  var SPOTS = [
    { x: W * 0.25, y: H * 0.28 }, { x: W * 0.75, y: H * 0.28 },
    { x: W * 0.2, y: H * 0.46 }, { x: W * 0.8, y: H * 0.46 },
    { x: W * 0.35, y: H * 0.60 }, { x: W * 0.65, y: H * 0.60 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var leaks, plugged, missed, spawnT, done, endWait, finished, timeLeft, pressed;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENGINEER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < SPOTS.length; i++) {
      game.draw.line(SPOTS[i].x, H * 0.14, SPOTS[i].x, SPOTS[i].y, C.pipeDark, 26);
      game.draw.line(SPOTS[i].x, H * 0.14, SPOTS[i].x, SPOTS[i].y, C.pipe, 16);
    }
  }

  function initGame() {
    leaks = {}; plugged = 0; missed = 0; spawnT = 0.7; timeLeft = DUR;
    done = false; endWait = 0; finished = false; pressed = {};
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function spawnLeak() {
    var free = [];
    for (var i = 0; i < SPOTS.length; i++) if (!leaks[i]) free.push(i);
    if (!free.length) return;
    var idx = free[Math.floor(game.random(0, free.length))];
    leaks[idx] = { t: 0, telegraph: 0.6, limit: 2.3, plugged: false };
  }

  function nearestLeak(x, y) {
    var best = -1, bestD = 90;
    for (var k in leaks) {
      var s = SPOTS[k];
      var d = Math.hypot(s.x - x, s.y - y);
      if (leaks[k].t >= leaks[k].telegraph && !leaks[k].plugged && d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  function tryPlug(id, x, y) {
    var idx = nearestLeak(x, y);
    if (idx === -1) { game.feedback.bad(x, y, {}); game.audio.play('se_tap', 0.1); return; }
    leaks[idx].plugged = true;
    pressed[id] = idx;
    plugged++;
    game.feedback.good(SPOTS[idx].x, SPOTS[idx].y, { text: '', color: C.good, size: 16, count: 4 });
    game.audio.play('se_good', 0.3);
    if (!milestoneShown && plugged === 5) {
      milestoneShown = true;
      game.fx.popup('NICE!', W / 2, H * 0.2, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    tryPlug(id, x, y);
  });
  game.onRelease(function(x, y, id) {
    if (pressed[id] !== undefined) game.audio.play('se_tap', 0.05);
    delete pressed[id];
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLeaks() {
    for (var k in leaks) {
      var s = SPOTS[k], l = leaks[k];
      if (l.plugged) { game.draw.circle(s.x, s.y, 30, C.plug); continue; }
      if (l.t < l.telegraph) {
        var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
        if (blink) game.draw.circle(s.x, s.y, 40, C.bad, 0.4);
      } else {
        game.draw.circle(s.x, s.y, 36, C.leakDark);
        game.draw.circle(s.x, s.y, 24, C.leak);
      }
    }
  }

  var demo = { t: 0, gx: SPOTS[0].x, gy: SPOTS[0].y, gx2: SPOTS[1].x, gy2: SPOTS[1].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { leaks = {}; leaks[0] = { t: 0.6, telegraph: 0.6, plugged: false }; leaks[1] = { t: 0, telegraph: 1.4, plugged: false }; }
    for (var k in leaks) leaks[k].t += dt;
    if (leaks[0] && leaks[0].t >= leaks[0].telegraph && !leaks[0].plugged) {
      leaks[0].plugged = true; demo.gx = SPOTS[0].x; demo.gy = SPOTS[0].y; demo.press = true;
      game.feedback.good(SPOTS[0].x, SPOTS[0].y, { color: C.good, size: 16, count: 3 });
      game.audio.play('se_good', 0.2);
    }
    if (leaks[1] && leaks[1].t >= leaks[1].telegraph && !leaks[1].plugged) {
      leaks[1].plugged = true; demo.gx2 = SPOTS[1].x; demo.gy2 = SPOTS[1].y;
      game.feedback.good(SPOTS[1].x, SPOTS[1].y, { color: C.good, size: 16, count: 3 });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLeaks();
      game.draw.sprite(ENGINEER, { '#': C.gold }, W * 0.5, H * 0.82, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.hand(demo.gx2, demo.gy2, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      game.draw.sprite(ENGINEER, { '#': ok ? C.gold : C.bad }, W * 0.5, H * 0.82, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(plugged + ' PLUGGED', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(plugged, { plugged: plugged, missed: missed });
        else game.end.failure({ plugged: plugged, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawnLeak(); spawnT = Math.max(0.5, 1.0 - plugged * 0.02); }
      for (var k in leaks) {
        var l = leaks[k];
        if (l.plugged) continue;
        l.t += dt;
        if (l.t > l.limit) {
          delete leaks[k];
          missed++;
          game.feedback.bad(SPOTS[k].x, SPOTS[k].y, {});
          game.audio.play('se_bad', 0.3);
          if (missed >= MISS_LIMIT) {
            ok = false; finished = true;
            hitStop = 0.3; shake = 0.25;
            game.feedback.bad(W / 2, H * 0.4, { text: 'MISS' });
            game.audio.play('se_bad', 0.4);
            finish();
          }
        }
      }
      for (var k2 in leaks) if (leaks[k2].plugged) leaks[k2].t += dt;
      for (var k3 in leaks) if (leaks[k3].plugged && leaks[k3].t > leaks[k3].limit + 0.9) delete leaks[k3];
      if (!finished && timeLeft <= 0) {
        ok = true; finished = true;
        hitStop = 0.12;
        game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: C.good });
        game.fx.burst(W / 2, H * 0.4, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLeaks();
    game.draw.sprite(ENGINEER, { '#': C.gold }, W * 0.5, H * 0.82, 22, { anchor: 'center' });

    txt(plugged + ' PLUGGED', W / 2, H * 0.055, 28, C.white);
    txt('MISS ' + missed + '/' + MISS_LIMIT, W / 2, H * 0.09, 22, C.bad);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.25], ['F3', 0.25], ['A3', 0.25], ['D4', 0.5]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
