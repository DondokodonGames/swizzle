// D-20222026-0033-corsair-broadside-charge.js
// コルセア・ブロードサイドチャージ — 波間に浮かぶ他家の砦へ、舷側砲の込めを見切って一斉に放つ
// 操作: 舷側砲を指で押し込んで込め、砦の門が開く帯に来た瞬間に指を離して撃つ
// 終わり: 開いた帯の中で放てれば成功。早すぎ/込めすぎ/時間切れは失敗
// @mechanic: hold_charge
// @theme: corsair_broadside_charge
// 世界観: 波間の孤島に建つ他家の砦を狙う海賊船の砲手が、演出だけで描かれる敵の門の開きを見切り、舷側砲を一度だけ込めて放つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 込めた量
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目/皮革を思わせる濃茶の面と、金属パーツのハイライト線で立体感を出す
  var C = {
    bg: '#2a1a10', bg2: '#160c08', sea: '#1c3a4a', seaDk: '#0e2230',
    fort: '#8a7a5a', fortDk: '#4a3e2a', cannon: '#3a2a1c', brass: '#c8a04a',
    good: '#8ac878', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f0e4c8',
  };

  var GAME_TITLE = 'BROADSIDE';
  var MAX_TIME = 13;
  var MAX_CHARGE = 1.7;
  var WIN_LO = 0.55, WIN_HI = 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0604', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FORT_S = ['#.##.#', '######', '#....#', '######'];
  var SHIP_S = ['..##..', '.####.', '######'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.sea);
    for (var i = 0; i < 4; i++) {
      game.draw.line(0, H * 0.55 + i * 26 + Math.sin(game.time.elapsed * 1.5 + i) * 4, W, H * 0.55 + i * 26, C.seaDk, 3);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
    game.draw.sprite(SHIP_S, { '#': C.fortDk }, W * 0.18, H * 0.82, 14, { anchor: 'center' });
  }

  var charging, charge, milestoneShown, gateFlash, roundClock;
  var done, endWait, finished, ready, hitStop, shake, result;

  function initGame() {
    charging = false; charge = 0; milestoneShown = false; gateFlash = 0; roundClock = 0;
    done = false; endWait = 0; finished = false; result = null;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var FX = W * 0.5, FY = H * 0.3;
  var CX = W * 0.5, CY = H * 0.82, CR = 150;

  function drawScene() {
    bg();
    game.draw.sprite(FORT_S, { '#': C.fort }, FX, FY, 22, { anchor: 'center' });
    if (gateFlash > 0) game.draw.rect(FX - 90, FY - 20, 180, 40, C.gold, 0.4 * (gateFlash / 0.6));
    game.draw.circle(CX, CY, CR, C.cannon);
    game.draw.circle(CX, CY, CR * 0.6, C.brass, 0.3);

    var barX0 = W * 0.5 - 220, barX1 = W * 0.5 + 220, barY = H * 0.62;
    game.draw.rect(barX0, barY, barX1 - barX0, 22, C.fortDk, 0.6);
    game.draw.rect(barX0 + (barX1 - barX0) * (WIN_LO / MAX_CHARGE), barY, (barX1 - barX0) * ((WIN_HI - WIN_LO) / MAX_CHARGE), 22, C.gold, 0.6);
    game.draw.rect(barX0, barY, (barX1 - barX0) * Math.min(1, charge / MAX_CHARGE), 22, C.brass);
  }

  function releaseCharge(x, y) {
    charging = false;
    var t = charge / MAX_CHARGE;
    finished = true;
    if (t >= WIN_LO / MAX_CHARGE && t <= WIN_HI / MAX_CHARGE) {
      ok = true; hitStop = 0.35;
      game.feedback.good(FX, FY, { text: 'GOOD', color: C.good });
      game.fx.burst(FX, FY, { color: C.gold, count: 26, speed: 420 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var d = Math.hypot(x - CX, y - CY);
    if (d < CR + 30) {
      charging = true; charge = 0; milestoneShown = false;
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.brass, count: 6, speed: 150 });
    }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING && charging) releaseCharge(x, y);
    else if (state === S.PLAYING) game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.gx = CX; demo.gy = CY;
    if (cyc < 0.4) { demo.press = false; }
    else if (cyc < 0.4 + (WIN_LO + (WIN_HI - WIN_LO) * 0.5)) {
      if (!charging) { charging = true; charge = 0; }
      demo.press = true;
      charge += dt;
      if (!milestoneShown && charge >= WIN_LO * 0.6) { milestoneShown = true; game.fx.popup('NICE', FX, FY - 140, { color: C.gold, size: 28 }); game.audio.play('se_milestone', 0.25); }
    } else if (charging) {
      demo.press = false;
      releaseCharge(CX, CY);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      if (!ok) txt('あと少し!', W / 2, H * 0.14, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(1, { charge: charge });
        else game.end.failure({ charge: charge });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (charging) {
        charge += dt;
        if (!milestoneShown && charge >= WIN_LO * 0.6) {
          milestoneShown = true;
          game.fx.popup('NICE', FX, FY - 140, { color: C.gold, size: 28 });
          game.audio.play('se_milestone', 0.25);
        }
        if (charge >= MAX_CHARGE) {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.fortDk, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.25], ['A3', 0.25], ['C4', 0.25], ['F4', 0.5]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
