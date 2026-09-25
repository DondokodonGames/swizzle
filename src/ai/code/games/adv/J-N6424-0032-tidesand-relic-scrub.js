// J-N6424-0032-tidesand-relic-scrub.js
// タイドサンド・レリック・スクラブ — 沈みゆく渚の砂山を素早くこすり、飲み込まれる前に遺物を掘り出す
// 操作: 盛り上がった砂山の上で指を素早く左右に往復させてこすり、砂を払って遺物を露出させる
// 終わり: 規定数(3個)の遺物をこすり出せば成功。1つも取れないまま全ての山が沈めば失敗
// @mechanic: rub
// @theme: sinking_tideflat_relic_scrub
// 世界観: 干潟の発掘職人が、潮に沈みゆく砂山を次々こすり払い、飲み込まれる前に埋もれた遺物を掘り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘り出した遺物数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めのグラデ、太い白フチ、ポップな影
  var C = {
    bg: '#ffd77a', bg2: '#ff9d5c', sand: '#e8c07a', sandDark: '#c89a52',
    relic: '#ffe27a', relicDark: '#c98f2e', good: '#39d67a', bad: '#ff4d5e',
    gold: '#ff5da2', ink: '#5a3418', white: '#ffffff',
  };

  var GAME_TITLE = 'RELIC SCRUB';
  var NUM_MOUNDS = 4;
  var NEED_MOUNDS = 3;
  var SITE_TIME = 2.9;
  var PROGRESS_PER_SWIPE = 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIGGER = ['.##.', '####', '.#.#'];
  var RELIC = ['####', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.68, W, H * 0.32, '#3d8fb8', 0.5);
  }

  var MOUND_X = W * 0.5, MOUND_Y = H * 0.44, MOUND_R = 220;
  var siteIdx, progress, siteTimer, found, lastDX, lastSign, revealedCount;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    siteIdx = 0; progress = 0; siteTimer = SITE_TIME; found = false;
    lastDX = 0; lastSign = 0; revealedCount = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawMound() {
    var sinkT = 1 - Math.max(0, siteTimer / SITE_TIME);
    var r = MOUND_R * (1 - sinkT * 0.35);
    var warn = siteTimer < 0.8 && !found;
    var col = warn && Math.floor(game.time.elapsed * 10) % 2 === 0 ? C.bad : C.sand;
    game.draw.circle(MOUND_X, MOUND_Y, r, C.sandDark);
    game.draw.circle(MOUND_X, MOUND_Y, r * 0.9, col);
    var reveal = Math.min(1, progress / 100);
    game.draw.circle(MOUND_X, MOUND_Y, r * 0.42 * (0.5 + reveal * 0.5), C.relicDark, 0.3 + reveal * 0.4);
    if (reveal > 0.15) {
      game.draw.sprite(RELIC, { '#': C.relic }, MOUND_X, MOUND_Y, 18 + reveal * 10, { anchor: 'center', alpha: Math.min(1, reveal * 1.3) });
    }
    game.draw.sprite(DIGGER, { '#': C.ink }, W * 0.5, H * 0.78, 30, { anchor: 'center' });
  }

  function loseSite() {
    finished = true; ok = false; hitStop = 0.3; shake = 0.25;
    game.feedback.bad(MOUND_X, MOUND_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function nextSite() {
    if (revealedCount >= NEED_MOUNDS) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(MOUND_X, MOUND_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(MOUND_X, MOUND_Y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
      return;
    }
    siteIdx++;
    if (siteIdx >= NUM_MOUNDS) {
      if (revealedCount < NEED_MOUNDS) { loseSite(); return; }
    }
    progress = 0; siteTimer = SITE_TIME; found = false; lastDX = 0; lastSign = 0;
  }

  function scrubAt(x, y, dx) {
    if (finished || ready > 0) return;
    if (Math.hypot(x - MOUND_X, y - MOUND_Y) > MOUND_R) return;
    var sign = dx > 6 ? 1 : dx < -6 ? -1 : 0;
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
      progress += PROGRESS_PER_SWIPE;
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: C.sandDark, count: 4, speed: 120 });
      if (progress >= 100 && !found) {
        found = true;
        revealedCount++;
        game.feedback.good(MOUND_X, MOUND_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.45);
        game.fx.popup(revealedCount + '/' + NEED_MOUNDS, MOUND_X, MOUND_Y - 160, { color: C.gold, size: 30 });
        if (!halfCalled && revealedCount === Math.ceil(NEED_MOUNDS / 2)) { halfCalled = true; }
        nextSite();
      }
    }
    if (sign !== 0) lastSign = sign;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); lastDX = x; } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    scrubAt(x, y, x - lastDX);
    lastDX = x;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: MOUND_X, gy: MOUND_Y, press: false, dir: 1 };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 2.6) {
      demo.press = true;
      demo.dir *= (Math.floor(cyc / 0.22) % 2 === 0) ? 1 : -1;
      var sweep = Math.sin(cyc * 9) * 110;
      demo.gx = MOUND_X + sweep;
      demo.gy = MOUND_Y + 10;
      scrubAt(demo.gx, demo.gy, sweep > 0 ? 20 : -20);
    } else {
      demo.press = false;
      demo.gx = MOUND_X; demo.gy = MOUND_Y;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      stepDemo(dt);
      bg();
      drawMound();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMound();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(revealedCount + ' / ' + NEED_MOUNDS, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_MOUNDS - revealedCount) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(revealedCount, { relics: revealedCount, need: NEED_MOUNDS });
        else game.end.failure({ relics: revealedCount, need: NEED_MOUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      siteTimer -= dt;
      if (siteTimer <= 0 && !found) {
        game.feedback.bad(MOUND_X, MOUND_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        siteIdx++;
        if (siteIdx >= NUM_MOUNDS) { loseSite(); }
        else { progress = 0; siteTimer = SITE_TIME; found = false; lastSign = 0; }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMound();

    txt(revealedCount + ' / ' + NEED_MOUNDS, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 140;
    game.draw.rect(70, 150, tbW, 16, '#ffffff', 0.5);
    game.draw.rect(70, 150, tbW * Math.max(0, siteTimer / SITE_TIME), 16, siteTimer < 0.8 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
