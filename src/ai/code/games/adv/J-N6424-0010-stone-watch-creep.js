// J-N6424-0010-stone-watch-creep.js
// ストーンウォッチ・クリープ — 巨石番人の目玉レンズが閉じている間だけ指を押さえて忍び寄り、開いた瞬間は離して静止する
// 操作: 画面を押し続けると忍び寄る。番人の目玉レンズが開く直前(警告色)には必ず指を離す
// 終わり: 目玉に見つからず終点まで到達すれば成功。開眼中に押していた(押した)瞬間に発覚で失格
// @mechanic: freeze
// @theme: sentinel_eye_creep
// 世界観: 遺跡地下に居座る巨石番人の閉じた目玉レンズの隙をついて、夜間の探索者が終点の祭壇まで気配を殺して忍び寄る
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、細かいアニメ
  var C = {
    bg: '#241a2e', bg2: '#120c18', floor: '#3a2a44', floorLine: '#4e3a5c',
    statue: '#5a4a6a', statueDark: '#382a44', eyeClosed: '#3fae6a', eyeWarn: '#e0b23f',
    eyeOpen: '#ff4444', hero: '#ffd9a0', heroDark: '#c98f4a',
    good: '#5be08a', bad: '#ff4d5e', gold: '#ffd24a', ink: '#f3e8ff', white: '#ffffff',
  };

  var GAME_TITLE = 'SENTINEL CREEP';
  var MAX_TIME = 13;
  var CREEP_RATE = 0.145;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0610', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STATUE = ['..####..', '.######.', '########', '.##..##.', '.######.'];
  var HERO = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.02 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.statue, pulse * 0.3);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * 0.62 + i * 14, W, H * 0.62 + i * 14, C.floorLine, 0.12);
    }
  }

  var progress, eyeState, eyeTimer, pressing, caught, quarterHit;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    progress = 0; eyeState = 'closed'; eyeTimer = 1.4 + game.random(0, 0.8);
    pressing = false; caught = false; quarterHit = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function catchPlayer(x, y) {
    ok = false; finished = true; caught = true; hitStop = 0.35; shake = 0.3; pressing = false;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressing = true;
    if (eyeState === 'open') { catchPlayer(x, y); return; }
    game.audio.play('se_tap', 0.12);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    pressing = false;
    if (eyeState === 'warn') {
      game.feedback.good(x, y, { text: 'NICE', color: C.gold, size: 24 });
      game.audio.play('se_milestone', 0.25);
    } else {
      game.audio.play('se_tap', 0.08);
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepCreep(dt) {
    eyeTimer -= dt;
    if (eyeState === 'closed' && eyeTimer <= 0) { eyeState = 'warn'; eyeTimer = 0.6; }
    else if (eyeState === 'warn' && eyeTimer <= 0) {
      eyeState = 'open'; eyeTimer = 1.0 + game.random(0, 0.4);
      if (pressing) { catchPlayer(W * 0.5, H * 0.3); return; }
    } else if (eyeState === 'open' && eyeTimer <= 0) {
      eyeState = 'closed'; eyeTimer = 1.3 + game.random(0, 0.9);
    }
    if (pressing && eyeState !== 'open') {
      progress = Math.min(1, progress + CREEP_RATE * dt);
      var q = Math.floor(progress * 4);
      if (q > quarterHit && q < 4) {
        quarterHit = q;
        game.fx.popup('NICE', W * 0.5, H * 0.34, { color: C.gold, size: 30 });
        game.audio.play('se_coin', 0.3);
      }
    }
    if (!finished && progress >= 1) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(W * 0.5, H * 0.55, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, H * 0.55, { color: C.gold, count: 22, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    } else if (!finished && progress < 1 && eyeTimer <= -99) {
      // unreachable safety no-op
    }
  }

  function drawScene() {
    var eyeCol = eyeState === 'closed' ? C.eyeClosed : eyeState === 'warn' ? C.eyeWarn : C.eyeOpen;
    game.draw.rect(W * 0.5 - 180, H * 0.14, 360, 260, C.statueDark, 1);
    game.draw.sprite(STATUE, { '#': C.statue }, W * 0.5, H * 0.28, 30, { anchor: 'center' });
    var eyeOpenAmt = eyeState === 'open' ? 1 : eyeState === 'warn' ? 0.5 : 0.15;
    game.draw.circle(W * 0.5, H * 0.28, 26 + eyeOpenAmt * 20, eyeCol, 0.9);
    if (eyeState === 'open') {
      var a = 0.4 + 0.4 * Math.sin(game.time.elapsed * 18);
      game.draw.circle(W * 0.5, H * 0.28, 70, C.eyeOpen, a * 0.3);
    }
    var hx = W * 0.5 - 260 + progress * 520;
    var bob = pressing ? Math.sin(game.time.elapsed * 12) * 6 : 0;
    game.draw.sprite(HERO, { '#': pressing ? C.hero : C.heroDark }, hx, H * 0.6 + bob, 14, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 260, H * 0.66, 520, 8, C.floorLine, 0.5);
    game.draw.rect(W * 0.5 + 220, H * 0.6, 40, 60, C.gold, 0.85);
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.8;
    if (cyc < dt || demo.t <= dt) initGame();
    var wantHold = eyeState !== 'open';
    if (wantHold && !pressing) { pressing = true; }
    if (!wantHold && pressing) { pressing = false; }
    stepCreep(dt);
    demo.gx = W * 0.5; demo.gy = H * 0.85; demo.press = pressing;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      var pct = Math.round(progress * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.round(progress * 100);
        if (ok) game.end.success(pctF, { progressPct: pctF });
        else game.end.failure({ progressPct: pctF, caught: caught });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepCreep(dt);
      if (!finished) {
        var timeLeft = MAX_TIME - game.time.elapsed;
        if (timeLeft <= 0) {
          ok = false; finished = true; hitStop = 0.2; shake = 0.15;
          game.feedback.bad(W * 0.5, H * 0.55, { text: 'MISS' });
          game.audio.play('se_bad', 0.35);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(Math.round(progress * 100) + ' / ' + 100, W / 2, H * 0.05, 28, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.floorLine, 1);
    game.draw.rect(60, 150, barW * progress, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.5], ['F3', 0.5], ['A3', 0.5], ['D4', 0.7]], { tempo: 92, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
