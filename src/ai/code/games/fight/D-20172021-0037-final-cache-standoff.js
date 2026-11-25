// D-20172021-0037-final-cache-standoff.js
// ファイナルケーシュ・スタンドオフ — 最後まで残った相手の守りが緩む瞬間を見極め、渾身の一撃を溜めて放つ最終対峙
// 操作: 指を押さえて力を溜め、相手の守りが緩んだ瞬間に指を離して一撃を放つ
// 終わり: 守りが緩んだ瞬間に十分溜めて放てば成功。タイミングを外す/溜め不足/時間切れは失敗
// @mechanic: hold_charge
// @theme: final_cache_standoff
// 世界観: 最後の1組まで絞られた撤収チームの一人が、残された最後の資材ケースを巡り、相手の守りが緩む一瞬を見極めて渾身の一撃を溜めて放つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 放った時の溜め量
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高密度ドット、強いリムライト、深い陰影
  var C = {
    bg: '#241820', bg2: '#120a10', ring: '#3a2430', ringEdge: '#5c3a48',
    rival: '#8a6a7a', rivalGuard: '#e0c840', rivalOpen: '#3ce07a', rivalDark: '#4a3040',
    hero: '#4cc8e0', heroDark: '#1c6a80',
    good: '#3ce07a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4eef2', ink: '#0a0608',
  };

  var GAME_TITLE = 'FINAL STANDOFF';
  var TIME_LIMIT = 11;
  var CX = W * 0.5, CY = H * 0.42;
  var PERIOD = 2.4, OPEN_A = 1.0, OPEN_B = 1.5, TELE_A = 0.4;
  var CHARGE_TIME = 0.9, MIN_RELEASE = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var charge, holding, cycleT, roundT, resolved, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var RIVAL_SPRITE = ['.##.', '####', '####', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffd400', pulse * 0.3);
    game.draw.circle(CX, CY, 320, C.ring, 0.6);
    game.draw.circle(CX, CY, 320, C.ringEdge, 0.2);
  }

  function initGame() {
    charge = 0; holding = false; cycleT = 0; roundT = 0; resolved = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function guardState() {
    var p = cycleT % PERIOD;
    if (p >= OPEN_A && p < OPEN_B) return 'open';
    if (p >= TELE_A && p < OPEN_A) return 'warn';
    return 'closed';
  }

  function drawScene() {
    var gs = guardState();
    var col = gs === 'open' ? C.rivalOpen : (gs === 'warn' ? C.rivalGuard : C.rivalDark);
    var bob = Math.sin(game.time.elapsed * 3) * 5;
    game.draw.circle(CX, CY - 120 + bob, 70, col, gs === 'open' ? 0.9 : 0.55);
    game.draw.sprite(RIVAL_SPRITE, { '#': C.rival }, CX, CY - 120 + bob, 18, { anchor: 'center' });
    game.draw.circle(CX, CY + 200, 60, C.heroDark, 0.5);
    game.draw.sprite(HERO_SPRITE, { '#': C.hero }, CX, CY + 200, 18, { anchor: 'center' });
    game.draw.rect(CX - 140, CY + 300, 280, 26, C.ink, 0.3);
    game.draw.rect(CX - 140, CY + 300, 280 * charge, 26, charge >= MIN_RELEASE ? C.good : C.gold);
  }

  function resolveRelease(x, y) {
    if (resolved || done || finished) return;
    resolved = true;
    var gs = guardState();
    if (gs === 'open' && charge >= MIN_RELEASE) {
      ok = true; finished = true;
      hitStop = 0.4;
      game.feedback.good(CX, CY - 120, { text: 'HIT', color: C.good });
      game.fx.burst(CX, CY - 120, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      ok = false; finished = true;
      hitStop = 0.32; shake = 0.3;
      game.feedback.bad(CX, CY + 200, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      holding = true;
      game.audio.play('se_tap', 0.1);
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !holding) { holding = false; return; }
    holding = false;
    game.audio.play('se_tap', 0.05);
    resolveRelease(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY + 200, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { charge = 0; cycleT = 0; resolved = false; }
    cycleT += dt;
    var gs = guardState();
    if (gs !== 'closed' || charge > 0) {
      if (charge < 1) charge = Math.min(1, charge + dt / CHARGE_TIME);
      demo.press = true;
    }
    if (gs === 'open' && !resolved && charge >= MIN_RELEASE) {
      resolved = true; demo.press = false;
      game.feedback.good(CX, CY - 120, { text: 'HIT', color: C.good });
      game.fx.burst(CX, CY - 120, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_good', 0.25);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cycleT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 34, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best * 100) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(Math.round(charge * 100) + ' / ' + 100, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと一息!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(charge * 100), { charge: Math.round(charge * 100) });
        else game.end.failure({ charge: Math.round(charge * 100) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); cycleT = 0; }
    } else if (!finished) {
      cycleT += dt;
      roundT += dt;
      if (holding && charge < 1) {
        var prevCharge = charge;
        charge = Math.min(1, charge + dt / CHARGE_TIME);
        if (prevCharge < MIN_RELEASE && charge >= MIN_RELEASE) {
          game.fx.popup('NICE', CX, CY + 250, { color: C.gold, size: 32 });
          game.audio.play('se_milestone', 0.3);
        }
        if (charge >= 1) game.audio.play('se_powerup', 0.2);
      }
      if (roundT >= TIME_LIMIT) {
        resolved = true;
        ok = false; finished = true;
        hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, CY + 200, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(Math.round(roundT) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, roundT / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 110, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
