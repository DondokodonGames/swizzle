// D-20132016-0087-guard-break-counter.js
// ガードブレイク・カウンター — 敵将の渾身の一撃、閃光の合図で先んじて迎え討つ
// 操作: 敵将が光る"本物の合図"の瞬間だけタップ。フェイントの弱い光では押さない
// 終わり: 本物の合図で反応できれば成功。フェイントに反応/合図を逃せば失敗
// @mechanic: reaction_duel
// @theme: wanderer_guard_counter
// 世界観: 荒野を旅する用心棒が、隊列を組んだ僚友と共に一瞬だけ隙を見せる敵将の渾身の一撃を、渾身のタイミングで迎え討つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応にかかった時間(ms)
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度な擬似ドット、繊細なグラデーション影
  var C = {
    bg: '#241014', bg2: '#160a0c', ground: '#3a1c1c', sand: '#4a2a20',
    ally: '#48c0ff', enemy: '#ff4d3d', feint: '#8a3a2a', real: '#ffe64d',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f8eee0', ink: '#0a0604',
  };

  var GAME_TITLE = 'GUARD BREAK';
  var WANDERER = ['.##.', '####', '.##.', '#.##'];
  var ENEMY = ['.##.', '####', '####', '.##.'];
  var ALLY = ['.#.', '###', '.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.58, W, H * 0.18, C.ground);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  // シーケンス: readyWind(僚友整列) -> feintAt(偽の閃き) -> realAt(本物の合図) -> resolved/timeout
  var t, feintAt, realAt, feintDone, resolved, resultKind, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function initGame() {
    t = 0;
    feintAt = 1.0 + game.random(0, 0.8);
    realAt = feintAt + 0.9 + game.random(0, 1.2);
    feintDone = false; resolved = false; resultKind = null; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onReact(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    resolved = true;
    var inRealWindow = t >= realAt && t <= realAt + 0.35;
    if (!inRealWindow) {
      // フェイントに釣られた、または本物の合図の前後を外した -> フライング/反応遅れ
      resultKind = t < realAt ? 'early' : 'late';
      ok = false; finished = true; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      finish();
      return;
    }
    // 本物の合図の窓内での反応
    resultKind = 'hit';
    ok = true; finished = true; hitStop = 0.1;
    game.feedback.good(x, y, { text: 'PERFECT' });
    game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.1);
    onReact(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function glowState() {
    // フェイント窓: feintAt-0.15 ~ feintAt+0.35 (弱い光)
    // 本物予告: realAt-0.7 ~ realAt (だんだん強まる警告) 本物合図: realAt ~ realAt+0.35
    if (!feintDone && t > feintAt - 0.15 && t < feintAt + 0.35) return 'feint';
    if (t >= realAt - 0.7 && t < realAt) return 'telegraph';
    if (t >= realAt && t < realAt + 0.35) return 'real';
    return 'none';
  }

  function drawScene(glow) {
    var bobT = game.time.elapsed;
    var ex = W * 0.5, ey = H * 0.4;
    game.draw.sprite(ALLY, { '#': C.ally }, W * 0.22 + Math.sin(bobT * 1.6) * 6, H * 0.78, 16, { anchor: 'center' });
    game.draw.sprite(ALLY, { '#': C.ally }, W * 0.78 + Math.sin(bobT * 1.6 + 1) * 6, H * 0.78, 16, { anchor: 'center' });
    game.draw.sprite(WANDERER, { '#': C.gold }, W * 0.5 + Math.sin(bobT * 1.4) * 5, H * 0.78, 20, { anchor: 'center' });

    var glowColor = glow === 'feint' ? C.feint : (glow === 'telegraph' ? C.feint : (glow === 'real' ? C.real : null));
    if (glowColor) {
      var r = glow === 'real' ? 170 : 110 + Math.sin(bobT * 10) * 20;
      game.draw.circle(ex, ey, r, glowColor, glow === 'real' ? 0.5 : 0.28);
    }
    game.draw.sprite(ENEMY, { '#': C.enemy }, ex + Math.sin(bobT * 1.1) * 4, ey + Math.cos(bobT * 1.3) * 3, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  var demoFeintAt = 1.0, demoRealAt = 2.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { t = 0; resolved = false; }
    t = cyc;
    demo.press = false;
    if (Math.abs(t - demoRealAt) < 0.06) {
      demo.press = true;
      game.fx.burst(W * 0.5, H * 0.4, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.18);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var g = t > demoFeintAt - 0.15 && t < demoFeintAt + 0.35 ? 'feint'
        : (t >= demoRealAt - 0.7 && t < demoRealAt ? 'telegraph'
        : (t >= demoRealAt && t < demoRealAt + 0.35 ? 'real' : 'none'));
      drawScene(g);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
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
      drawScene('none');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      if (!ok) txt(resultKind === 'early' ? 'あと一瞬!' : 'あと一瞬!', W / 2, H * 0.13, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var ms = Math.round((t - realAt) * 1000);
        if (ok) game.end.success(Math.max(0, ms), { reactMs: ms }); else game.end.failure({ reactMs: ms });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      t += dt;
      if (t > feintAt + 0.35) feintDone = true;
      if (!milestoneShown && t >= realAt - 0.7) {
        milestoneShown = true;
        game.fx.popup('NICE', W * 0.5, H * 0.28, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (!resolved && t >= realAt + 0.5) {
        resolved = true; finished = true; ok = false; resultKind = 'timeout'; hitStop = 0.3;
        game.feedback.bad(W * 0.5, H * 0.4, { text: 'MISS' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(finished ? 'none' : glowState());
    var progressFrac = Math.max(0, Math.min(1, t / (realAt + 0.5)));
    game.draw.rect(60, H * 0.06, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, H * 0.06, (W - 120) * progressFrac, 14, C.gold);
    txt((finished ? 1 : 0) + ' / ' + 1, W / 2, H * 0.045, 26, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
