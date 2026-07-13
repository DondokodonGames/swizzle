// api-v2-fixture.js
// APIv2フィクスチャ — サンドボックスAPI v2 の全機能を使う検証用ミニゲーム
// 操作: タップ — 的をタップで GOOD、外すと MISS。押しっぱなしでキャラが追従
// 成功: 3回 GOOD  失敗: 8秒経過
//
// このファイルは配信用ゲームではなく、スモークハーネスとテストのための
// フィクスチャ。game.* API v2 の全メソッドを少なくとも1回ずつ呼ぶ。

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var NEEDED = 3;
  var MAX_TIME = 8;

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
      game.draw.text('API V2 FIXTURE', W / 2, H * 0.08, { size: 64, color: '#ffe600', bold: true });
      game.draw.text('BEST ' + game.best, W / 2, H * 0.14, { size: 40, color: '#00ff9f' });
      game.draw.text('TAP TO START', W / 2, H * 0.5, { size: 48, color: '#ffffff' });
      game.draw.sprite(HERO, HERO_COL, W / 2, H * 0.65, 24, { anchor: 'center' });
      // ATTRACTゴースト実演: 手カーソルがタップ位置に降りて押す(pressを周期で切替)
      var pressing = Math.floor(game.time.elapsed * 2) % 2 === 0;
      game.draw.hand(W / 2, H * 0.55, { press: pressing, scale: 14 });
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
    game.draw.image('missing_asset', 0, 0, 1, 1);
  });
})(game);
