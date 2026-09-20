// I-3DS-0010-lantern-wish-blow.js
// ウィッシュブリーズ — 夜祭りの提灯守りが息を溜め願い札をちょうど良い強さで空へ吹き上げる
// 操作: 画面を長押しして息ゲージを溜め、狙いの帯に入ったら指を離して吹く。弱すぎ・溜めすぎは失敗
// 終わり: 規定回数(2回)、帯の中で離せば成功。帯を外す・溜めすぎて燃えれば失敗
// @mechanic: hold_charge
// @theme: lantern_wish_blow
// 世界観: 夜祭りの提灯守りが、灯芯の願い札に息を吹きかけて空へ舞い上げる。溜めすぎれば札が燃え尽きる
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功させた回数
// スタイル: 2000s HANDHELD PASTEL
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル基調+丸みのある太アウトライン
  var C = {
    bg: '#2a2440', bg2: '#453a63', lantern: '#ffcf8a', lanternDark: '#e08a4a',
    gauge: '#3a3255', sweet: '#8affc0', over: '#ff6b8a', good: '#8affc0', bad: '#ff6b8a',
    gold: '#ffe07a', white: '#fff6ea', ink: '#1c1730',
  };

  var GAME_TITLE = 'WISH BREEZE';
  var TOTAL = 2;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var won, done, endWait, finished;
  var ready, hitStop, shake;
  var charge, holding, sweetLo, sweetHi, overWarned, burst;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARDIAN = ['.###.', '#####', '.###.', '.#.#.'];

  function sweetFor(idx) {
    // 2回目は帯が狭くなる(精度プレッシャー)
    var w = idx === 0 ? 0.16 : 0.10;
    var center = 0.62;
    return { lo: center - w, hi: center + w };
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 20; i++) {
      var a = (i / 20) * Math.PI * 2 + game.time.elapsed * 0.15;
      game.draw.circle(CX + Math.cos(a) * 420, H * 0.2 + Math.sin(a) * 120, 3, '#ffffff20');
    }
  }

  function drawLantern(lift) {
    game.draw.circle(CX, CY - lift, 90, C.lanternDark);
    game.draw.circle(CX, CY - lift, 78, C.lantern);
    game.draw.sprite(GUARDIAN, { '#': C.gold }, CX, H * 0.72, 24, { anchor: 'center' });
  }

  function initGame() {
    won = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    charge = 0; holding = false; overWarned = false; burst = 0;
    var sw = sweetFor(0); sweetLo = sw.lo; sweetHi = sw.hi;
  }

  function startHold() {
    if (done || ready > 0 || finished) return;
    holding = true;
  }

  function releaseHold() {
    if (!holding || done || ready > 0 || finished) return;
    holding = false;
    var p = charge;
    if (p >= sweetLo && p <= sweetHi) {
      won++;
      hitStop = 0.15;
      burst = 1;
      game.feedback.good(CX, CY, { text: 'NICE', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_powerup', 0.4);
      if (won === 1 && TOTAL > 1) {
        game.fx.popup('あと1回!', CX, CY - 200, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.4);
      }
      if (won >= TOTAL) { ok = true; finished = true; hitStop = 0.2; finish(); return; }
      var sw = sweetFor(won); sweetLo = sw.lo; sweetHi = sw.hi;
      charge = 0; overWarned = false;
    } else {
      hitStop = 0.3;
      game.feedback.bad(CX, CY, { text: p < sweetLo ? 'WEAK' : 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); startHold(); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.fx.burst(x, y, { color: C.gold, count: 4, speed: 100 }); releaseHold(); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { charge = 0; var sw = sweetFor(0); sweetLo = sw.lo; sweetHi = sw.hi; }
    if (cyc < 2.0) {
      demo.press = true;
      charge = Math.min(1.05, (cyc / 2.0) * (sweetLo + (sweetHi - sweetLo) * 0.5) / 1);
      charge = (cyc / 2.0) * ((sweetLo + sweetHi) / 2);
    } else if (cyc < 2.15) {
      demo.press = false;
      if (charge >= sweetLo && charge <= sweetHi) {
        game.feedback.good(CX, CY, { text: 'NICE', color: C.good });
        game.audio.play('se_powerup', 0.25);
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (charge === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLantern(charge * 60);
      game.draw.rect(CX - 140, H * 0.58, 280, 24, C.gauge);
      game.draw.rect(CX - 140 + (sweetLo * 280), H * 0.58, (sweetHi - sweetLo) * 280, 24, C.sweet, 0.7);
      game.draw.rect(CX - 140, H * 0.58, Math.min(280, charge * 280), 24, C.gold, 0.9);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLantern(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(won + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - won) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(won, { won: won, total: TOTAL });
        else game.end.failure({ won: won, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (holding) {
        charge += dt * 0.5;
        // telegraph: 溜めすぎ(燃え尽き)ゾーンに入る0.5〜0.8秒前から警告
        if (charge > sweetHi + 0.08 && !overWarned) {
          overWarned = true;
        }
        if (charge > 1.0) {
          charge = 1.0;
          hitStop = 0.35;
          holding = false;
          game.feedback.bad(CX, CY, { text: 'BURN' });
          shake = 0.35;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;
    if (burst > 0) burst -= dt;

    bg();
    var overDanger = holding && charge > sweetHi;
    var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
    drawLantern(charge * 60);
    game.draw.rect(CX - 140, H * 0.58, 280, 24, C.gauge);
    game.draw.rect(CX - 140 + (sweetLo * 280), H * 0.58, (sweetHi - sweetLo) * 280, 24, C.sweet, 0.7);
    if (overDanger && blink) game.draw.rect(CX + sweetHi * 280 - 140, H * 0.58, (1 - sweetHi) * 280, 24, C.over, 0.9);
    game.draw.rect(CX - 140, H * 0.58, Math.min(280, charge * 280), 24, holding ? C.gold : C.lanternDark, 0.95);

    txt(won + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 1]], { tempo: 100, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
