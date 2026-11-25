// D-20132016-0082-golem-core-finisher.js
// ゴーレムコア・フィニッシャー — ひび割れた石巨人の核を、残り耐久ぴったりの回数だけ打って砕く
// 操作: 核が残っている回数だけ「打つ」ボタンをタップする。多く打ちすぎると反動で失敗
// 終わり: 表示された残り耐久とちょうど同じ回数で止められれば成功。撃ちすぎ・撃たなすぎは失敗
// @mechanic: count_exact
// @theme: golem_core_finisher
// 世界観: 見習い魔導士が、ひび割れた石巨人の最後の一戦に挑む。核に残る亀裂の数ぴったりを打ち抜けば砕け散る一撃必殺の間合い
// 残るもの: 正誤(CLEAR/GAME OVER) + 打った回数と正解の耐久
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮、地平線から上は空グラデ
  var C = {
    sky1: '#1a1030', sky2: '#3a2050', floorA: '#2a1a40', floorB: '#241636',
    golem: '#7a6858', golemDark: '#4a3e34', core: '#ff5a3a', coreGlow: '#ffcf6a',
    mage: '#6ad0ff', good: '#4dffa0', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f0ff', ink: '#120a1c',
  };

  var GAME_TITLE = 'CORE FINISHER';
  var HORIZON = H * 0.5;
  var CORE_X = W * 0.5, CORE_Y = H * 0.4;
  var BTN_X = W * 0.5, BTN_Y = H * 0.84;
  var MAX_TIME = 18;
  var CONFIRM_WAIT = 0.55;
  var TARGET_MIN = 4, TARGET_MAX = 7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MAGE_SPRITE = ['..#..', '.###.', '#####', '.#.#.', '.#.#.'];
  var GOLEM_SPRITE = ['##.##.##', '########', '.######.', '.##..##.', '.##..##.'];
  var BTN_SPRITE = ['.###.', '#####', '#####', '.###.'];

  function drawFloor() {
    game.draw.gradient(0, HORIZON, [[0, C.sky1], [1, C.sky2]]);
    var stripes = 12;
    for (var i = 0; i < stripes; i++) {
      var t0 = i / stripes, t1 = (i + 1) / stripes;
      var y0 = HORIZON + (H - HORIZON) * Math.pow(t0, 1.5);
      var y1 = HORIZON + (H - HORIZON) * Math.pow(t1, 1.5);
      var wScale = 0.32 + 0.68 * t1;
      var sw = W * wScale;
      var sx = (W - sw) / 2;
      game.draw.rect(sx, y0, sw, y1 - y0 + 2, i % 2 === 0 ? C.floorA : C.floorB);
    }
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  var target, count, timeLeft, sinceLastTap, lastJudge, halfCalled, dangerFlag;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    target = TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
    count = 0; timeLeft = MAX_TIME; sinceLastTap = 999; lastJudge = '';
    halfCalled = false; dangerFlag = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function strike() {
    if (finished || ready > 0) return;
    count++; sinceLastTap = 0;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(CORE_X, CORE_Y, { color: C.coreGlow, count: 10, speed: 240 });
    shake = 0.08;
    if (count > target) {
      lastJudge = 'over';
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(CORE_X, CORE_Y, { text: 'MISS' });
      game.audio.play('se_break', 0.4);
      finish();
      return;
    }
    game.feedback.good(BTN_X, BTN_Y, { text: 'HIT', color: C.gold, size: 30 });
    if (!halfCalled && count >= Math.ceil(target / 2)) {
      halfCalled = true;
      game.fx.popup('NICE', CORE_X, CORE_Y - 200, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.35);
    }
    if (count === target - 1) dangerFlag = true;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    if (Math.hypot(x - BTN_X, y - BTN_Y) < 150) strike();
    else { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(coreCount, tgt, warn) {
    drawFloor();
    game.draw.sprite(GOLEM_SPRITE, { '#': coreCount >= tgt ? C.golemDark : C.golem }, W * 0.5, H * 0.32 + Math.sin(game.time.elapsed * 1.2) * 5, 26, { anchor: 'center' });
    var glow = 0.55 + 0.45 * Math.sin(game.time.elapsed * (warn ? 9 : 3));
    game.draw.circle(CORE_X, CORE_Y, 60, warn ? C.bad : C.core, glow);
    game.draw.circle(CORE_X, CORE_Y, 30, C.coreGlow, 0.8);
    game.draw.sprite(MAGE_SPRITE, { '#': C.mage }, W * 0.5, H * 0.7 + Math.sin(game.time.elapsed * 1.6) * 4, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: BTN_X, gy: BTN_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    sinceLastTap += dt;
    var stepDur = 1.6 / target;
    var wantCount = Math.min(target, Math.floor(cyc / stepDur));
    demo.gx = BTN_X; demo.gy = BTN_Y;
    if (wantCount > count && count < target) {
      count++;
      demo.press = true;
      game.feedback.good(BTN_X, BTN_Y, { text: 'HIT', color: C.gold, size: 30 });
      game.audio.play('se_tap', 0.12);
      game.fx.burst(CORE_X, CORE_Y, { color: C.coreGlow, count: 8, speed: 220 });
    } else {
      demo.press = cyc - (count - 1) * stepDur < stepDur * 0.4 && count > 0;
    }
    if (count >= target && cyc > 1.9 && cyc < 1.98 && lastJudge !== 'won') {
      lastJudge = 'won';
      game.feedback.good(CORE_X, CORE_Y, { text: 'CLEAR', color: C.good });
      game.audio.play('se_success', 0.25);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (target === undefined) initGame();
      stepDemo(dt);
      drawScene(count, target, count === target - 1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(count, target, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(count + ' / ' + target, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと1撃!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(count, { count: count, target: target });
        else game.end.failure({ count: count, target: target });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      sinceLastTap += dt;
      if (count > 0 && count === target && sinceLastTap >= CONFIRM_WAIT) {
        ok = true; finished = true; hitStop = 0.15;
        game.feedback.good(CORE_X, CORE_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(CORE_X, CORE_Y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.4);
        finish();
      } else if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.3;
        game.feedback.bad(CORE_X, CORE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene(count, target, dangerFlag && count === target - 1 && sinceLastTap > 0.4);

    txt(count + ' / ' + target, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    var tp = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 150, (W - 120) * tp, 16, tp < 0.2 ? C.bad : C.gold);
    game.draw.sprite(BTN_SPRITE, { '#': C.gold }, BTN_X, BTN_Y, 30, { anchor: 'center' });
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 92, wave: 'sawtooth', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
