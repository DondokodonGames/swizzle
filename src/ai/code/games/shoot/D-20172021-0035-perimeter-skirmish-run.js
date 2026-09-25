// D-20172021-0035-perimeter-skirmish-run.js
// ペリメーター・スカーミッシュ・ラン — 短時間の局地戦闘区画で、出現する敵ドローンを狙い撃ちしつつ補給ケースを回収し戦果を稼ぐ
// 操作: 出現する敵ドローン/補給ケースを制限時間内にタップして仕留める・回収する
// 終わり: 規定戦果(8)を制限時間内に稼げば成功。届かなければ失敗
// @mechanic: aim_shoot
// @theme: perimeter_skirmish_solo_run
// 世界観: 短時間の局地戦闘区画に単独で投入された特殊部隊員が、出現する敵ドローンを狙い撃ちしながら散らばる補給ケースを回収し、時間内に規定戦果を挙げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 稼いだ戦果
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 地平線+奥へ収束する擬似パース床、彩度低めの軍用配色
  var C = {
    sky: '#1a2438', sky2: '#0c1220', floor: '#2a3a2c', floorLine: '#3e5240',
    enemy: '#e04c4c', enemyDark: '#8a2424', crate: '#e0c840', crateDark: '#8a6a1c',
    good: '#3ce07a', bad: '#ff4d5e', gold: '#ffd400', white: '#eef4ff', ink: '#080c10',
  };

  var GAME_TITLE = 'SKIRMISH RUN';
  var TIME_LIMIT = 14;
  var GOAL = 8;
  var HORIZON = H * 0.32;
  var FIELD_TOP = H * 0.34, FIELD_BOT = H * 0.68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var score, kills, collects, done, endWait, finished;
  var ready, hitStop, shake;
  var targets, spawnT, playT, halfCalled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_SPRITE = ['#.#', '###', '.#.'];
  var CRATE_SPRITE = ['###', '#.#', '###'];
  var GUN_SPRITE = ['.#.', '###', '.#.', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, HORIZON, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, 0, W, HORIZON, '#e0c840', pulse * 0.25);
    game.draw.rect(0, HORIZON, W, H - HORIZON, C.floor);
    for (var i = 1; i < 9; i++) {
      var yy = HORIZON + (H - HORIZON) * (i / 9) * (i / 9);
      game.draw.line(0, yy, W, yy, C.floorLine, 2, 0.4);
    }
    game.draw.sprite(GUN_SPRITE, { '#': C.crateDark }, W * 0.5, H * 0.86, 20, { anchor: 'center' });
  }

  function initGame() {
    score = 0; kills = 0; collects = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    targets = []; spawnT = 0.5; playT = 0; halfCalled = false;
  }

  function spawnTarget() {
    var type = Math.random() < 0.68 ? 'enemy' : 'crate';
    var x = W * 0.18 + Math.random() * W * 0.64;
    var y = FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP);
    targets.push({ x: x, y: y, type: type, life: 1.3, max: 1.3 });
  }

  function drawTargets() {
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var warn = t.life < 0.4;
      var blink = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
      var r = 40 + Math.sin(game.time.elapsed * 6 + i) * 3;
      if (t.type === 'enemy') {
        game.draw.circle(t.x, t.y, r, blink ? C.white : C.enemyDark, 0.9);
        game.draw.sprite(ENEMY_SPRITE, { '#': blink ? C.enemyDark : C.enemy }, t.x, t.y, 16, { anchor: 'center' });
      } else {
        game.draw.circle(t.x, t.y, r, blink ? C.white : C.crateDark, 0.9);
        game.draw.sprite(CRATE_SPRITE, { '#': blink ? C.crateDark : C.crate }, t.x, t.y, 16, { anchor: 'center' });
      }
    }
  }

  function tryHit(x, y) {
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      if (game.hit.circle(x, y, 10, t.x, t.y, 50)) {
        targets.splice(i, 1);
        score++;
        hitStop = 0.05;
        if (t.type === 'enemy') {
          kills++;
          game.feedback.good(t.x, t.y, { text: 'HIT', color: C.good });
          game.fx.burst(t.x, t.y, { color: C.enemy, count: 14, speed: 300 });
          game.audio.play('se_break', 0.35);
        } else {
          collects++;
          game.feedback.good(t.x, t.y, { text: 'GET', color: C.gold });
          game.audio.play('se_coin', 0.35);
        }
        if (score === Math.ceil(GOAL / 2)) game.fx.popup('あと' + (GOAL - score) + '!', W * 0.5, H * 0.3, { color: C.gold, size: 34 });
        if (score >= GOAL) {
          ok = true; finished = true;
          game.audio.play('se_success', 0.5);
          finish();
        }
        return true;
      }
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var hit = tryHit(x, y);
    if (!hit) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.12); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { targets = []; spawnT = 0.2; score = 0; }
    spawnT -= dt;
    if (spawnT <= 0 && targets.length < 3) { spawnTarget(); spawnT = 0.8; }
    for (var i = targets.length - 1; i >= 0; i--) {
      targets[i].life -= dt;
      if (targets[i].life <= 0) targets.splice(i, 1);
    }
    if (targets.length > 0 && Math.floor(cyc * 2) % 2 === 0) {
      var tt = targets[0];
      demo.gx = tt.x; demo.gy = tt.y; demo.press = true;
      if (Math.random() < 0.3) tryHit(tt.x, tt.y);
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targets === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTargets();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTargets();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(score + ' / ' + GOAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL - score) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { kills: kills, collects: collects });
        else game.end.failure({ kills: kills, collects: collects });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      if (!halfCalled && playT >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.audio.play('se_milestone', 0.3);
      }
      spawnT -= dt;
      if (spawnT <= 0 && targets.length < 4) { spawnTarget(); spawnT = 0.85; }
      for (var i = targets.length - 1; i >= 0; i--) {
        targets[i].life -= dt;
        if (targets[i].life <= 0) targets.splice(i, 1);
      }
      if (playT >= TIME_LIMIT) {
        finished = true;
        ok = score >= GOAL;
        if (!ok) { hitStop = 0.25; shake = 0.2; game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' }); }
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawTargets();

    txt(score + ' / ' + GOAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - playT / TIME_LIMIT), 16, playT > TIME_LIMIT * 0.75 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.15], ['G3', 0.15], ['B3', 0.15], ['E4', 0.3]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
