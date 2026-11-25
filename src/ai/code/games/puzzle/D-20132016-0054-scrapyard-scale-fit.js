// D-20132016-0054-scrapyard-scale-fit.js
// スクラップ計量パズル — 廃品の球を台に乗せるか見送るかを選び、重さ100を超えずに詰め込む
// 操作: 待機中の廃品をタップして台の空いた場所に置く。スワイプで見送って次の廃品へ進める
// 終わり: 6個の廃品を処理し終えるまでに重さ100を超えず、重ねずに置けていれば成功。100を超えれば即失敗
// @mechanic: gap_fit
// @theme: junkyard_scale_platform
// 世界観: 廃品置き場の計量台。次々運ばれてくるスクラップ球を、載せるか見送るかを判断し100の上限内に詰め込む監督
// 残るもの: 正誤(CLEAR/GAME OVER) + 積み上げた総重量
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目/フェルト質感をgradient+細線で。ボタンは上明下暗+白ハイライト
  var C = {
    bg1: '#5a4530', bg2: '#3a2c1c', platform: '#8a6a44', platformHi: '#c9a878', platformLo: '#4a3822',
    scrap: '#9a9a9a', scrapHi: '#d8d8d8', scrapDark: '#5a5a5a', rivet: '#c9a020',
    good: '#5adf8a', bad: '#ff5a5a', gold: '#ffcf4a', white: '#f4ecd8', ink: '#241a10',
  };

  var GAME_TITLE = 'SCRAP SCALE';
  var PLAT_CX = W * 0.5, PLAT_CY = H * 0.44, PLAT_R = 330;
  var STAGE_X = W * 0.5, STAGE_Y = H * 0.80;
  var CAP = 100;
  var PER_ORB_TIME = 3.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var queue, qi, placed, total, orbTimer, busted;
  var done, endWait, finished, ready, hitStop, shake, pressStart;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GRAB_SPRITE = ['#.#', '###', '.#.'];
  var CRANE_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function radiusFor(v) { return 46 + v * 3.0; }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(elapsed * 1.2));
    for (var i = 0; i < 16; i++) game.draw.line(0, i * (H / 16), W, i * (H / 16) + 6, '#00000012', 3);
  }

  function drawPlatform() {
    game.draw.circle(PLAT_CX, PLAT_CY, PLAT_R + 14, C.platformLo);
    game.draw.circle(PLAT_CX, PLAT_CY, PLAT_R, C.platform);
    game.draw.circle(PLAT_CX, PLAT_CY - 40, PLAT_R - 40, C.platformHi, 0.18);
    for (var a = 0; a < 12; a++) {
      var ang = (a / 12) * Math.PI * 2;
      game.draw.circle(PLAT_CX + Math.cos(ang) * (PLAT_R - 20), PLAT_CY + Math.sin(ang) * (PLAT_R - 20), 7, C.rivet, 0.6);
    }
  }

  function drawOrb(o, dim) {
    var r = radiusFor(o.v);
    game.draw.circle(o.x, o.y, r + 5, C.scrapDark, dim ? 0.4 : 0.7);
    game.draw.circle(o.x, o.y, r, C.scrap, dim ? 0.5 : 1);
    game.draw.circle(o.x - r * 0.3, o.y - r * 0.3, r * 0.4, C.scrapHi, dim ? 0.4 : 0.6);
    txt(String(o.v), o.x, o.y + 12, Math.min(40, 20 + o.v), C.ink);
  }

  function initGame() {
    var base = [18, 22, 26, 20, 24];
    queue = [];
    for (var i = 0; i < base.length; i++) queue.push(Math.round(base[i] + game.random(-2, 2)));
    for (var s = queue.length - 1; s > 0; s--) { var j = Math.floor(game.random(0, s + 1)); var t = queue[s]; queue[s] = queue[j]; queue[j] = t; }
    qi = 0; placed = []; total = 0; orbTimer = PER_ORB_TIME; busted = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pressStart = null;
  }

  function currentValue() { return qi < queue.length ? queue[qi] : null; }

  function canPlaceAt(x, y, v) {
    var r = radiusFor(v);
    if (Math.hypot(x - PLAT_CX, y - PLAT_CY) + r > PLAT_R) return false;
    for (var i = 0; i < placed.length; i++) {
      var p = placed[i];
      if (Math.hypot(x - p.x, y - p.y) < r + radiusFor(p.v) - 4) return false;
    }
    return true;
  }

  function nextOrb() {
    qi++;
    orbTimer = PER_ORB_TIME;
    if (qi >= queue.length && !finished) {
      ok = !busted; finished = true;
      if (ok) game.feedback.good(PLAT_CX, PLAT_CY, { text: total >= 85 ? 'PERFECT' : 'CLEAR' });
      finish();
    }
  }

  function placeCurrent(x, y) {
    var v = currentValue();
    if (v === null || finished) return;
    if (!canPlaceAt(x, y, v)) { game.feedback.bad(x, y, { text: '' }); return; }
    placed.push({ x: x, y: y, v: v });
    total += v;
    game.feedback.good(x, y, { text: '', count: 10, sound: 'se_coin', volume: 0.3 });
    if (total > CAP) {
      busted = true; ok = false; finished = true; hitStop = 0.4; shake = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      finish();
      return;
    }
    if (total >= 50 && total - v < 50) { game.fx.popup('50', PLAT_CX, PLAT_CY - PLAT_R - 30, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    nextOrb();
  }

  function skipCurrent(x, y) {
    if (currentValue() === null || finished) return;
    game.audio.play('se_tap', 0.15);
    game.fx.flash('#ffffff', 0.08);
    nextOrb();
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { pressStart = { x: x, y: y }; game.audio.play('se_tap', 0.06); } });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressStart) return;
    var dx = x - pressStart.x, dy = y - pressStart.y;
    if (Math.hypot(dx, dy) > 90) { skipCurrent(x, y); }
    else { placeCurrent(x, y); }
    pressStart = null;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    orbTimer -= dt;
    if (orbTimer <= 0 && currentValue() !== null) {
      game.feedback.bad(STAGE_X, STAGE_Y, { text: '' });
      nextOrb();
    }
  }

  var demo = { t: 0, gx: STAGE_X, gy: STAGE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { queue = [20, 24, 18]; qi = 0; placed = []; total = 0; busted = false; }
    var spots = [{ x: PLAT_CX - 120, y: PLAT_CY + 60 }, { x: PLAT_CX + 120, y: PLAT_CY + 40 }, { x: PLAT_CX, y: PLAT_CY - 100 }];
    var segT = 2.1;
    var idx = Math.min(2, Math.floor(cyc / segT));
    var local = cyc - idx * segT;
    var target = spots[idx];
    if (local < 1.3) {
      var p = local / 1.3;
      demo.gx = STAGE_X + (target.x - STAGE_X) * p;
      demo.gy = STAGE_Y + (target.y - STAGE_Y) * p;
      demo.press = false;
    } else {
      demo.gx = target.x; demo.gy = target.y; demo.press = true;
      if (qi === idx && local > 1.35) { placed.push({ x: target.x, y: target.y, v: queue[idx] }); total += queue[idx]; qi++; }
    }
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (queue === undefined) initGame();
      stepDemo(dt);
      bg(el);
      drawPlatform();
      for (var i = 0; i < placed.length; i++) drawOrb(placed[i], false);
      if (currentValue() !== null && qi < 3) drawOrb({ x: demo.gx, y: STAGE_Y + 220, v: queue[qi] || 18 }, true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      drawPlatform();
      for (var r = 0; r < placed.length; r++) drawOrb(placed[r], false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(total + ' / ' + CAP, W / 2, H * 0.13, 28, C.gold);
      if (!ok && busted) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(total, { total: total, placed: placed.length }); else game.end.failure({ total: total, placed: placed.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    drawPlatform();
    for (var j = 0; j < placed.length; j++) drawOrb(placed[j], false);
    var cv = currentValue();
    if (cv !== null && !finished) {
      var bob = Math.sin(el * 2.5) * 4;
      drawOrb({ x: STAGE_X, y: STAGE_Y + bob, v: cv }, false);
      game.draw.circle(STAGE_X, STAGE_Y, radiusFor(cv) + 16, C.gold, 0.15);
      game.draw.sprite(GRAB_SPRITE, { '#': C.rivet }, STAGE_X, STAGE_Y - radiusFor(cv) - 60 + bob, 14, { anchor: 'center' });
    }
    var opBob = Math.sin(el * 1.8) * 5;
    game.draw.sprite(CRANE_SPRITE, { '#': C.platformHi, '.': null }, W * 0.14, H * 0.84 + opBob, 16, { anchor: 'center' });
    var flash = hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
    if (flash) game.draw.circle(STAGE_X, STAGE_Y, 120, C.white, 0.6);

    txt(total + ' / ' + CAP, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, Math.min(1, total / CAP) * (W - 120), 16, total > CAP * 0.85 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.35], ['C4', 0.35], ['E4', 0.35], ['A4', 0.5]], { tempo: 96, wave: 'triangle', volume: 0.055, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
