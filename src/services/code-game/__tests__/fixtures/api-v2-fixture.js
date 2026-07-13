// api-v2-fixture.js
// APIフィクスチャ — サンドボックスAPI v2 の全機能を使う検証用ミニゲーム
// 操作: タップ — 的をタップで GOOD、外すと MISS。押しっぱなしでキャラが追従
// 成功: 3回 GOOD  失敗: 10秒経過
// @mechanic: aim_shoot
// @theme: arcade
// 世界観: テスト技師が的を撃ち抜いてAPIの動作を確かめる
//
// このファイルは配信用ゲームではなく、スモークハーネスとテストのための
// フィクスチャ。game.* API v2 の全メソッドを少なくとも1回ずつ呼ぶ。
// v3ゲート(validator v3 + score≥80 + smoke: WARN0 + attract_motion)のゴールド参照でもある。

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var NEEDED = 3;
  var MAX_TIME = 10;

  var goods, misses, timeLeft, target, done, resultSuccess;
  var heroX = W / 2, heroY = H * 0.8;

  var HERO = [
    '.YY.',
    'YYYY',
    '.BB.',
    '.YY.',
  ];
  var HERO_COL = { Y: '#ffe600', B: '#00cfff' };

  function newTarget() {
    target = {
      x: W * 0.2 + game.random(0, W * 0.6),
      y: H * 0.25 + game.random(0, H * 0.35),
      r: 120,
    };
  }

  function initGame() {
    goods = 0; misses = 0; timeLeft = MAX_TIME; done = false;
    newTarget();
  }

  // ── ATTRACTゴースト実演(§2.1) ──
  // 実ゲームと同じ的+feedbackを流用し、手カーソルを的まで動かして「タップ」する。
  var demo = { tx: W * 0.5, ty: H * 0.35, r: 120, gx: W * 0.5, gy: H * 0.85, t: 0, press: false };
  function demoNewTarget() {
    demo.tx = W * 0.22 + game.random(0, W * 0.56);
    demo.ty = H * 0.24 + game.random(0, H * 0.22);
  }
  function stepDemo(dt) {
    demo.t += dt;
    demo.gx += (demo.tx - demo.gx) * Math.min(1, dt * 3);
    demo.gy += (demo.ty - demo.gy) * Math.min(1, dt * 3);
    var near = game.hit.circle(demo.gx, demo.gy, 10, demo.tx, demo.ty, demo.r);
    demo.press = near;
    if (near && demo.t > 0.45) {
      game.feedback.good(demo.gx, demo.gy, { text: '+100' }); // 実ロジックの成功演出を流用
      demoNewTarget();
      demo.t = 0; demo.gx = W * 0.5; demo.gy = H * 0.85; // 手を戻して再度寄せる(動きを作る)
    }
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      initGame();
      state = S.PLAYING;
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (game.hit.circle(x, y, 10, target.x, target.y, target.r)) {
      goods++;
      game.feedback.good(x, y, { text: '+100' });
      game.fx.popup(goods + '/' + NEEDED, W / 2, H * 0.1, { color: '#ffffff', size: 40 });
      newTarget();
      if (goods >= NEEDED) {
        done = true; resultSuccess = true;
        game.audio.play('se_success');
        game.audio.stopBgm();
        state = S.RESULT;
        setTimeout(function() { game.end.success(goods * 100, { goods: goods, misses: misses }); }, 600);
      }
    } else {
      misses++;
      game.feedback.bad(x, y);
    }
  });

  game.onSwipe(function(dir) { game.audio.play('se_tap', 0.5); });
  game.onHold(function(x, y, d) { game.audio.tone('C5', 0.1, { wave: 'triangle', volume: 0.1 }); });
  game.onPress(function(x, y, id) { game.audio.tone(880, 0.03, { volume: 0.05 }); });
  game.onRelease(function(x, y, id) {});
  game.onMove(function(x, y, id) {});

  game.onUpdate(function(dt) {
    game.draw.clear('#101020');
    game.draw.gradient(0, H, ['#182848', '#080810']);

    if (state === S.ATTRACT) {
      stepDemo(dt); // ゴーストが実ロジックで1サイクル遊んで見せる(手が動く)
      game.draw.text('API FIXTURE', W / 2, H * 0.08, { size: 64, color: '#ffe600', bold: true });
      game.draw.text('BEST ' + game.best, W / 2, H * 0.14, { size: 40, color: '#00ff9f' });
      // 実ゲームと同じ的を描き、手カーソルが寄っていく
      game.draw.circle(demo.tx, demo.ty, demo.r, '#ff2079', 0.8);
      game.draw.circle(demo.tx, demo.ty, demo.r * 0.5, '#ffe600');
      game.draw.sprite(HERO, HERO_COL, W / 2, H * 0.68, 24, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      game.draw.text('TAP TO START', W / 2, H * 0.86, { size: 48, color: '#ffffff' });
      return;
    }

    if (state === S.RESULT) {
      game.draw.text(resultSuccess ? 'CLEAR!' : 'TIME UP', W / 2, H * 0.4, { size: 72, color: resultSuccess ? '#00ff9f' : '#ff2079', bold: true });
      game.draw.text('SCORE ' + (goods * 100), W / 2, H * 0.5, { size: 56, color: '#ffffff' });
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true; resultSuccess = false;
        game.audio.play('se_failure');
        game.audio.stopBgm();
        state = S.RESULT;
        setTimeout(function() { game.end.failure({ goods: goods, misses: misses }); }, 600);
        return;
      }
    }

    // 押しっぱなしでキャラ追従(連続入力の検証)
    if (game.input.pressing) {
      heroX += (game.input.x - heroX) * Math.min(1, dt * 8);
    }
    if (game.touches.length > 1) {
      game.draw.text('MULTI x' + game.touches.length, W / 2, H * 0.9, { size: 32, color: '#00cfff' });
    }

    // HUD (上部12%)
    game.draw.rect(40, 30, (W - 80) * (timeLeft / MAX_TIME), 30, '#ff6600');
    game.draw.text(goods + ' / ' + NEEDED, W / 2, H * 0.06, { size: 48, color: '#ffffff', bold: true });

    // 的
    game.draw.circle(target.x, target.y, target.r, '#ff2079', 0.8);
    game.draw.circle(target.x, target.y, target.r * 0.5, '#ffe600');

    // キャラ
    game.draw.sprite(HERO, HERO_COL, heroX, heroY, 20, { anchor: 'center', flipX: heroX < W / 2 });
    game.draw.line(heroX, heroY - 100, target.x, target.y, '#ffffff', 2);
  });
})(game);
