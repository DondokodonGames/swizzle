// J-N644-0008-ore-block-mash.js
// オアブロックマッシュ — 頭上に浮かぶ鉱石ブロックを連打で叩き割り、時間内に一番多く宝石を集める
// 操作: 頭上のブロックを連打してひびを入れ、割れたら中の宝石を回収する。割れたら次のブロックが現れる
// 終わり: 規定数(12個)の宝石を時間内に集めれば成功。時間切れで届かなければ失敗
// @mechanic: mash
// @theme: overhead_ore_mining
// 世界観: 坑道の採掘職人が、天井にめり込んだ鉱石ブロックへ向けて拳を連打し、砕けた中から宝石を掘り出し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた宝石数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドット、タイル反復背景
  var C = {
    bg: '#2b1d14', bg2: '#1a120c', block: '#8a5a34', blockCrack: '#5c3a20',
    gem: '#4de0ff', gemDark: '#1c9fd9',
    good: '#4de0ff', bad: '#ff5c4d', gold: '#ffd24d', ink: '#0d0805', white: '#f4ede0',
  };

  var GAME_TITLE = 'ORE MASH';
  var TIME_LIMIT = 11;
  var NEEDED = 12;
  var BLOCK_HITS = 4;
  var GEM_PER_BLOCK = 2;
  var BX = W * 0.5, BY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MINER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var GEM_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect((i * 190) % W, H * 0.66, 170, 8, C.blockCrack, 0.4);
  }

  var gems, hits, blockX, timeLeft, shakeT, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newBlock() {
    hits = 0;
    blockX = W * (0.32 + 0.36 * Math.floor(game.random(0, 3)) / 2);
  }

  function initGame() {
    gems = 0; timeLeft = TIME_LIMIT; shakeT = 0;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newBlock();
  }

  function hitBlock(x, y) {
    hits++;
    shakeT = 0.1;
    game.feedback.good(x, y, { text: '', color: C.block, count: 4, sound: 'se_tap' });
    game.audio.play('se_tap', 0.15);
    if (hits >= BLOCK_HITS) {
      gems += GEM_PER_BLOCK;
      game.fx.burst(blockX, BY, { color: C.gem, count: 18, speed: 380 });
      game.fx.popup('+' + GEM_PER_BLOCK, blockX, BY - 60, { color: C.gold, size: 30 });
      game.audio.play('se_break', 0.45);
      if (gems >= Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', blockX, BY - 120, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (gems >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newBlock();
      }
    }
  }

  function attemptTap(x, y) {
    if (game.hit.circle(x, y, 4, blockX, BY, 130)) {
      hitBlock(x, y);
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene() {
    if (shakeT > 0) shakeT -= 1 / 60;
    var jitter = shakeT > 0 ? game.random(-6, 6) : 0;
    var sz = 160 - hits * 14;
    game.draw.rect(blockX - sz / 2 + jitter, BY - sz / 2, sz, sz, C.block);
    for (var i = 0; i < hits; i++) {
      game.draw.line(blockX - sz / 2 + 10 + i * 8, BY - sz / 2 + 6, blockX - sz / 2 + 4 + i * 8, BY + sz / 2 - 6, C.blockCrack, 3);
    }
    var bob = Math.sin(game.time.elapsed * 2) * 6;
    game.draw.sprite(MINER_SPRITE, { '#': C.white }, W * 0.5, H * 0.82 + bob, 26, { anchor: 'center' });
    game.draw.sprite(GEM_SPRITE, { '#': C.gemDark }, W * 0.5, H * 0.82 - 130, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: BX, gy: BY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.gx = blockX; demo.gy = BY;
    demo.press = Math.floor(cyc * 6) % 2 === 0;
    if (demo.press && Math.floor(cyc * 6) !== Math.floor((cyc - dt) * 6)) {
      hitBlock(blockX, BY);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gems === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(gems + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - gems) + '個!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(gems, { gems: gems, needed: NEEDED });
        else game.end.failure({ gems: gems, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.25; shake = 0.2;
        game.feedback.bad(BX, BY, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(gems + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.4);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['D4', 0.2], ['E4', 0.2], ['G4', 0.4]], { tempo: 170, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
