// D-20132016-0055-pier-leap-shootdown.js
// ピア・リープ撃ち落とし — 水面のさざ波で跳ねる魚を見切り、宙に跳んだ瞬間を撃ち落として稼ぐ
// 操作: 水面にさざ波が立ったら身構え、跳ねた魚が宙にいる間にタップして撃つ
// 終わり: 規定尾数のうち半分以上を撃ち落とせば成功。届かなければ失敗
// @mechanic: aim_shoot
// @theme: night_pier_leap_gallery
// 世界観: 夜の桟橋にある射的小屋。仕掛けを沈めて誘い出した魚が跳ねる一瞬を狙い撃ちして稼ぐ夜番の射手
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃ち落とした尾数とコンボ
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: パララックス3層+統一光源、4〜8フレームの細かいアニメ
  var C = {
    sky1: '#0a1a3a', sky2: '#0e2a52', sky3: '#173a5a', moon: '#f4ecc8',
    sea1: '#0c3a5a', sea2: '#0a2848', ripple: '#bfe8ff',
    fish: '#ff9f43', fishHi: '#ffd27a', good: '#4dffa0', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f4ecff', ink: '#04070c', pier: '#3a2c1c', pierHi: '#5a4430',
  };

  var GAME_TITLE = 'PIER LEAP';
  var WATER_Y = H * 0.56;
  var TOTAL = 6, NEED = 3;
  var TELE_T = 0.65, AIR_T = 0.55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, caught, combo, bestCombo, fish, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH_SPRITE = ['..##', '####', '.##.'];
  var MOON_SPRITE = ['.##.', '####', '####', '.##.'];

  function bg(elapsed) {
    game.draw.gradient(0, WATER_Y, [[0, C.sky1], [1, C.sky3]]);
    game.draw.sprite(MOON_SPRITE, { '#': C.moon }, W * 0.78, H * 0.14, 14, { anchor: 'center' });
    game.draw.gradient(WATER_Y, H, [[0, C.sea1], [1, C.sea2]]);
    for (var i = 0; i < 6; i++) {
      var yy = WATER_Y + 40 + i * 60;
      var off = Math.sin(elapsed * 1.3 + i) * 20;
      game.draw.line(off, yy, W + off, yy, C.ripple, 2);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(elapsed * 1.4));
    game.draw.rect(0, WATER_Y - 24, W, 28, C.pier);
    game.draw.rect(0, WATER_Y - 24, W, 8, C.pierHi);
  }

  function newFish() {
    return { x: game.random(W * 0.25, W * 0.75), t: 0, phase: 'ripple', resolved: false, shot: false };
  }

  function initGame() {
    round = 0; caught = 0; combo = 0; bestCombo = 0; fish = newFish();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fishY(f) {
    if (f.phase === 'ripple') return WATER_Y;
    var p = f.t / AIR_T;
    var arc = Math.sin(Math.min(1, p) * Math.PI);
    return WATER_Y - arc * 260;
  }

  function onShot(x, y) {
    if (!fish || fish.resolved || finished || fish.phase !== 'air') return;
    var fy = fishY(fish);
    if (Math.hypot(x - fish.x, y - fy) < 100) {
      fish.resolved = true; fish.shot = true;
      caught++; combo++; if (combo > bestCombo) bestCombo = combo;
      hitStop = 0.12;
      game.feedback.good(fish.x, fy, { text: '', color: C.gold, count: 16, sound: 'se_break', volume: 0.35 });
      game.fx.burst(fish.x, fy, { color: C.gold, count: 16, speed: 340 });
      if (caught === Math.ceil(TOTAL / 2)) { game.fx.popup(caught + ' / ' + TOTAL, W * 0.5, H * 0.14, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (fish && fish.phase === 'air' && !fish.resolved) { onShot(x, y); }
      else { game.audio.play('se_tap', 0.06); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function nextRound() {
    round++;
    if (round >= TOTAL) {
      ok = caught >= NEED; finished = true;
      if (ok) game.feedback.good(W * 0.5, WATER_Y - 100, { text: 'CLEAR' });
      finish();
    } else {
      fish = newFish();
    }
  }

  function stepPlay(dt) {
    if (!fish || finished) return;
    fish.t += dt;
    if (fish.phase === 'ripple') {
      if (fish.t > TELE_T) { fish.phase = 'air'; fish.t = 0; }
    } else if (fish.phase === 'air') {
      if (fish.t >= AIR_T) {
        if (!fish.resolved) { combo = 0; game.feedback.bad(fish.x, WATER_Y, { text: '' }); }
        nextRound();
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: WATER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { fish = newFish(); fish.x = W * 0.55; }
    fish.t = cyc < TELE_T ? cyc : cyc - TELE_T;
    fish.phase = cyc < TELE_T ? 'ripple' : 'air';
    if (fish.phase === 'air' && !fish.resolved && fish.t > AIR_T * 0.4 && fish.t < AIR_T * 0.7) {
      fish.resolved = true;
      demo.gx = fish.x; demo.gy = fishY(fish); demo.press = true;
    }
    if (cyc < dt) fish.resolved = false;
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (fish === undefined) initGame();
      stepDemo(dt);
      bg(el);
      if (fish.phase === 'ripple') {
        var blink = Math.floor(el * 8) % 2 === 0;
        if (blink) game.draw.circle(fish.x, WATER_Y, 34, C.ripple, 0.5);
      } else {
        game.draw.sprite(FISH_SPRITE, { '#': fish.resolved ? C.gold : C.fish }, fish.x, fishY(fish), 16, { anchor: 'center' });
      }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (NEED - caught) + '!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL, bestCombo: bestCombo });
        else game.end.failure({ caught: caught, total: TOTAL, bestCombo: bestCombo });
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
    if (fish && !finished) {
      if (fish.phase === 'ripple') {
        var blink2 = Math.floor(el * 8) % 2 === 0;
        if (blink2) game.draw.circle(fish.x, WATER_Y, 34, C.ripple, 0.5);
        game.draw.circle(fish.x, WATER_Y, 60 * Math.min(1, fish.t / TELE_T), C.ripple, 0.15);
      } else {
        var flash = fish.resolved && hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
        game.draw.sprite(FISH_SPRITE, { '#': flash ? C.white : (fish.resolved ? C.gold : C.fish) }, fish.x, fishY(fish), flash ? 20 : 16, { anchor: 'center' });
      }
    }

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 26, C.white);
    if (combo > 1) txt('COMBO ' + combo, W * 0.5, H * 0.12, 22, C.gold);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['A4', 0.3], ['D5', 0.3], ['F5', 0.5]], { tempo: 120, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
