// I-GBA-0037-suds-scrub-clean.js
// サッズスクラブ — 泡だらけの鍋を指でこすって、時間内に汚れを全部落とす
// 操作: 汚れのシミの上を指で素早く往復させてこすり落とす
// 終わり: 全ての汚れを落とせば成功。時間切れで汚れが残っていれば失敗
// @mechanic: rub
// @theme: kitchen_pot_scrub
// 世界観: 厨房のシンクに置かれた顔つきの鍋。こびりついた汚れのシミをタイムリミット内にこすり落として輝きを取り戻す
// 残るもの: 正誤(CLEAR/GAME OVER) + 落とせた汚れの数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 光沢のある金属/陶器質感、ハイライトとシャドウのグラデーションで立体感
  var C = {
    bg: '#3a4048', bg2: '#20242a', pot: '#c8ccd2', potDark: '#8a9098', potShine: '#ffffff',
    dirt: '#5a4030', dirtDark: '#3a2818', suds: '#dff5ff', sudsDark: '#a8d8e8',
    good: '#3fe06a', bad: '#ff4d5e', gold: '#ffd23f', white: '#f4f6f8', ink: '#101214',
  };

  var GAME_TITLE = 'SUDS SCRUB';
  var CX = W * 0.5, CY = H * 0.44, POT_R = 300;
  var TIME_LIMIT = 12.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BRUSH = ['.#.', '###', '.#.', '###', '.#.'];

  var DIRT_SPOTS = [
    { ox: -160, oy: -80, r: 70 },
    { ox: 130, oy: -140, r: 60 },
    { ox: -60, oy: 90, r: 65 },
    { ox: 180, oy: 60, r: 55 },
    { ox: 10, oy: -20, r: 50 },
  ];
  var SCRUB_NEED = 900; // 累積往復距離

  var spots, cleanedCount, timeLeft, cursorX, cursorY, lastX, lastY, hasLast;
  var done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  function initGame() {
    spots = [];
    for (var i = 0; i < DIRT_SPOTS.length; i++) {
      var d = DIRT_SPOTS[i];
      spots.push({ x: CX + d.ox, y: CY + d.oy, r: d.r, scrub: 0, clean: false });
    }
    cleanedCount = 0;
    timeLeft = TIME_LIMIT;
    cursorX = CX; cursorY = CY - POT_R * 0.6;
    hasLast = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function potFace() {
    var pct = cleanedCount / spots.length;
    return pct >= 1 ? 'happy' : (pct >= 0.5 ? 'ok' : 'sad');
  }

  function drawPot() {
    game.draw.circle(CX, CY, POT_R, C.potDark);
    game.draw.circle(CX, CY, POT_R - 14, C.pot);
    game.draw.circle(CX - 90, CY - 110, 60, C.potShine, 0.35);
    // 顔
    var face = potFace();
    game.draw.circle(CX - 60, CY - 20, 14, C.ink);
    game.draw.circle(CX + 60, CY - 20, 14, C.ink);
    if (face === 'happy') {
      game.draw.line(CX - 60, CY + 40, CX, CY + 65, C.ink, 10);
      game.draw.line(CX, CY + 65, CX + 60, CY + 40, C.ink, 10);
    } else if (face === 'ok') {
      game.draw.line(CX - 50, CY + 45, CX + 50, CY + 45, C.ink, 10);
    } else {
      game.draw.line(CX - 60, CY + 55, CX, CY + 35, C.ink, 10);
      game.draw.line(CX, CY + 35, CX + 60, CY + 55, C.ink, 10);
    }
  }

  function drawDirt() {
    for (var i = 0; i < spots.length; i++) {
      var sp = spots[i];
      if (sp.clean) continue;
      var pct = 1 - Math.min(1, sp.scrub / SCRUB_NEED);
      game.draw.circle(sp.x, sp.y, sp.r * pct, C.dirtDark, 0.9);
      game.draw.circle(sp.x, sp.y, sp.r * pct * 0.7, C.dirt, 0.9);
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * 0.1 + i * 90, W, H * 0.1 + i * 90 - 40, '#ffffff05', 3);
    }
  }

  function drawSuds() {
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2 + game.time.elapsed * 0.3;
      var r = POT_R + 20 + Math.sin(game.time.elapsed * 2 + i) * 8;
      game.draw.circle(CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.6, 10 + (i % 3) * 4, C.suds, 0.5);
    }
  }

  function applyScrub(x, y, dist) {
    for (var i = 0; i < spots.length; i++) {
      var sp = spots[i];
      if (sp.clean) continue;
      var d = Math.hypot(x - sp.x, y - sp.y);
      if (d < sp.r + 20) {
        sp.scrub += dist;
        game.fx.burst(x, y, { color: C.suds, count: 2, speed: 90 });
        if (sp.scrub >= SCRUB_NEED) {
          sp.clean = true;
          cleanedCount++;
          game.feedback.good(sp.x, sp.y, { text: 'CLEAN', color: C.good, size: 26 });
          game.audio.play('se_good', 0.35);
          if (!halfShown && cleanedCount >= Math.ceil(spots.length / 2)) {
            halfShown = true;
            game.fx.popup('HALFWAY!', CX, CY - POT_R - 40, { color: C.gold, size: 38 });
            game.audio.play('se_milestone', 0.4);
          }
          if (cleanedCount >= spots.length) {
            ok = true; finished = true; hitStop = 0.12;
            finish();
          }
        }
      }
    }
  }

  function onScrubMove(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    cursorX = x; cursorY = y;
    if (hasLast) {
      var dist = Math.hypot(x - lastX, y - lastY);
      if (dist > 1) applyScrub(x, y, dist);
    }
    lastX = x; lastY = y; hasLast = true;
  }

  game.onPress(function(x, y) {
    hasLast = false;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.08);
    onScrubMove(x, y);
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && Math.random() < 0.15) game.audio.play('se_tap', 0.03);
    onScrubMove(x, y);
  });
  game.onRelease(function(x, y) {
    hasLast = false;
    if (state === S.PLAYING) game.fx.burst(x, y, { color: C.sudsDark, count: 4, speed: 60 });
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

  var demo = { t: 0, gx: CX, gy: CY, press: false, target: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      demo.target = 0;
    }
    var sp = spots[demo.target];
    if (!sp) return;
    var wob = Math.sin(demo.t * 14) * (sp.r * 0.5);
    demo.gx = sp.x + wob;
    demo.gy = sp.y;
    demo.press = true;
    if (!sp.clean) {
      var d = Math.hypot(demo.gx - sp.x, demo.gy - sp.y);
      var moved = Math.abs(wob - (demo._lastWob || 0));
      demo._lastWob = wob;
      if (d < sp.r + 20) sp.scrub += moved;
      if (sp.scrub >= SCRUB_NEED) {
        sp.clean = true;
        cleanedCount++;
        demo.target = Math.min(spots.length - 1, demo.target + 1);
        demo._lastWob = 0;
      }
    }
    cursorX = demo.gx; cursorY = demo.gy;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (spots === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSuds();
      drawPot();
      drawDirt();
      game.draw.sprite(BRUSH, { '#': C.gold }, demo.gx, demo.gy, 9, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
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
      drawSuds();
      drawPot();
      drawDirt();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleanedCount + ' / ' + spots.length, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (spots.length - cleanedCount) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleanedCount, { cleaned: cleanedCount, total: spots.length });
        else game.end.failure({ cleaned: cleanedCount, total: spots.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        ok = false; finished = true; hitStop = 0.35; shake = 0.25;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSuds();
    drawPot();
    drawDirt();

    txt(cleanedCount + ' / ' + spots.length, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (!finished) game.draw.sprite(BRUSH, { '#': C.gold }, cursorX, cursorY, 9, { anchor: 'center' });
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['E4', 0.4], ['G4', 0.4], ['E4', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
