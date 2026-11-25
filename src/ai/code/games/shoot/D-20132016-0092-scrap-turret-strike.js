// D-20132016-0092-scrap-turret-strike.js
// スクラップタレットストライク — 廃品置き場の据え置き砲台で、迫るスクラップドローンを狙い撃つ
// 操作: 画面に現れるドローンをタップして撃つ。命中判定の外をタップすると外れる
// 終わり: 規定数(4機)を全て撃破すれば成功。1機でも砲台に到達されれば失敗
// @mechanic: aim_shoot
// @theme: scrapyard_turret_defense
// 世界観: 荒野の廃品置き場に据えられた一基の見張り砲台。夜な夜な迷い込むスクラップドローンを、命中前の一瞬を狙って撃破する
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度パレット、輪郭くっきり、金属質のハイライト
  var STYLE = { bg: ['#2a2a3a', '#141420'], main: ['#8a9aac', '#4a5a6c'], accent: ['#ffb347', '#ff4d4d'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], dune: '#3a3448', duneDark: '#241f30',
    drone: STYLE.main[0], droneDark: STYLE.main[1], turret: '#7a8a9c', turretDark: '#4a5560',
    gold: STYLE.accent[0], bad: STYLE.accent[1], good: '#5dffb0', white: '#f2f2f6', ink: '#0c0c12',
  };

  var GAME_TITLE = 'SCRAP TURRET';
  var TOTAL = 4;
  var TX = W * 0.5, TY = H * 0.78;
  var HIT_R = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE_SPRITE = ['.###.', '#####', '.#.#.'];
  var TURRET_SPRITE = ['..#..', '#####', '.###.'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    for (var i = 0; i < 5; i++) {
      game.draw.circle(W * (0.1 + i * 0.22), H * (0.55 + 0.02 * Math.sin(e * 0.4 + i)), 60, C.duneDark, 0.4);
    }
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.dune);
    game.draw.rect(0, H * 0.82, W, 6, C.duneDark);
  }

  function newDrone() {
    var side = Math.random() < 0.5 ? -1 : 1;
    return {
      t: 0, dur: Math.max(1.6, 2.6 - round * 0.2),
      x0: CX0() + side * W * 0.35, y0: H * 0.1 + Math.random() * H * 0.08,
      telegraphed: false, resolved: false, shot: false,
    };
  }
  function CX0() { return TX; }

  var round, drone, kills, done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    round = 0; kills = 0; ok = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    drone = newDrone();
  }

  function dronePos(d) {
    var p = Math.min(1, d.t / d.dur);
    return { x: d.x0 + (TX - d.x0) * p, y: d.y0 + (TY - d.y0) * p, p: p };
  }

  function resolveHit(x, y) {
    if (!drone || drone.resolved || ready > 0 || done || finished) return;
    var pos = dronePos(drone);
    var dist = Math.hypot(x - pos.x, y - pos.y);
    if (dist > HIT_R) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      return;
    }
    drone.resolved = true; drone.shot = true;
    hitStop = 0.12;
    kills++;
    game.feedback.good(pos.x, pos.y, { text: 'HIT', color: C.good });
    game.fx.burst(pos.x, pos.y, { color: C.gold, count: 16, speed: 360 });
    game.audio.play('se_break', 0.45);
    if (kills === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', TX, TY - 260, { color: C.gold, size: 40 });
    if (kills >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    drone = newDrone();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveHit(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawDrone(d) {
    if (!d) return;
    var pos = dronePos(d);
    if (pos.p > 0.55) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, HIT_R + 20, C.bad, 0.22);
    }
    game.draw.circle(pos.x, pos.y, HIT_R * 0.7, C.droneDark, 0.4);
    game.draw.sprite(DRONE_SPRITE, { '#': C.drone }, pos.x, pos.y, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: TX, gy: TY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!drone) { drone = newDrone(); drone.dur = 1.8; round = 0; }
    drone.t += dt;
    var pos = dronePos(drone);
    var p = pos.p;
    if (p > 0.55 && p < 0.68 && !drone.telegraphed) {
      drone.telegraphed = true;
      demo.gx = pos.x; demo.gy = pos.y; demo.press = true;
      game.feedback.good(pos.x, pos.y, { text: 'HIT', color: C.good });
      game.audio.play('se_break', 0.25);
      drone.shot = true;
    }
    if (drone.shot && p > 0.7) { demo.press = false; }
    if (p >= 1) { drone = null; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      game.draw.sprite(TURRET_SPRITE, { '#': C.turret }, TX, TY, 22, { anchor: 'center' });
      if (drone && !drone.shot) drawDrone(drone);
      else if (drone && drone.shot) drawDrone(drone);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      game.draw.sprite(TURRET_SPRITE, { '#': ok ? C.good : C.bad }, TX, TY, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(kills + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - kills) + '機!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kills, { kills: kills, total: TOTAL });
        else game.end.failure({ kills: kills, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      drone.t += dt;
      if (drone.t / drone.dur >= 1 && !drone.resolved) {
        drone.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(TX, TY, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.sprite(TURRET_SPRITE, { '#': C.turret }, TX, TY, 22, { anchor: 'center' });
    if (!finished) drawDrone(drone);

    txt(kills + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (kills / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
