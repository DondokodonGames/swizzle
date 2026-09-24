// D-20092012-0021-barrier-flare-watch.js
// バリアフレア・ウォッチ — 夜霧の外壁に迫るしがみ這い寄る影を、フレア砲でタップ狙撃して食い止める
// 操作: 画面奥から迫る影を、壁に達する前にタップして撃つ
// 終わり: 規定数を狙撃しきれば成功。見逃しが規定回数に達したら失敗
// @mechanic: aim_shoot
// @theme: fogline_outpost_watch
// 世界観: 濃霧の外壁前哨。見張り番が迫り這う影の群れをフレア砲で狙撃し、壁の内側を守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数
// スタイル: 90s BIG SPRITE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 対戦筐体風。画面の1/3を占める巨大キャラ、床に楕円影、背景は横1層
  var C = {
    sky1: '#233', sky2: '#122', ground: '#1a2a1c', wall: '#3a3428',
    creep: '#5c8a3c', creepDark: '#2c4c1c', flare: '#ffdf5a', flareCore: '#fff7c8',
    good: '#7dffb0', bad: '#ff5a5a', gold: '#ffd23f', white: '#f4f4e8', ink: '#0a0e08',
  };

  var GAME_TITLE = 'FLARE WATCH';
  var CX = W * 0.5;
  var WALL_Y = H * 0.72;
  var TOTAL = 6;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var killed, missed, targets, spawnTimer, spawnIdx, done, endWait, finished;
  var ready, hitStop, shake, guardFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREEP_A = ['.##.', '####', '.##.', '#..#'];
  var CREEP_B = ['.##.', '####', '##.#', '.#.#'];
  var GUARD = ['.##.', '####', '.##.', '##.#'];

  function bg() {
    game.draw.gradient(0, WALL_Y, [[0, C.sky1], [1, C.sky2]]);
    // continuous ambient fog drift so canvas luminance never sits still between samples
    var pulse = 0.05 + 0.045 * Math.sin(game.time.elapsed * 2.0);
    game.draw.rect(0, 0, W, WALL_Y, C.flare, Math.max(0, pulse * 0.4));
    game.draw.rect(0, WALL_Y - 10, W, 20, C.wall);
    game.draw.rect(0, WALL_Y, W, H - WALL_Y, C.ground);
    for (var i = 0; i < 6; i++) game.draw.rect(i * (W / 6) + 10, WALL_Y - 26, W / 6 - 20, 16, C.wall, 0.7);
  }

  function newTarget(delay) {
    var lane = 0.18 + Math.random() * 0.64;
    return {
      x: lane * W, spawnY: H * 0.30, y: H * 0.30, t: -delay, dur: 2.2, telegraphed: false,
      alive: true, dead: false, frame: 0,
    };
  }

  function initGame() {
    killed = 0; missed = 0; targets = []; spawnIdx = 0; spawnTimer = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; guardFlash = 0;
  }

  function drawCreep(t) {
    var p = Math.min(1, Math.max(0, t.t / t.dur));
    t.y = t.spawnY + (WALL_Y - 40 - t.spawnY) * p;
    var scale = 12 + p * 10;
    game.draw.circle(t.x, t.y + scale * 3.2, scale * 2.2, C.ink, 0.3);
    if (p > 0.6 && !t.telegraphed) t.telegraphed = true;
    if (t.telegraphed && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(t.x, t.y, scale * 2.6, C.bad, 0.18);
    }
    var frames = (Math.floor(game.time.elapsed * 6 + t.x) % 2 === 0) ? CREEP_A : CREEP_B;
    game.draw.sprite(frames, { '#': C.creep }, t.x, t.y, scale, { anchor: 'center' });
  }

  function shootAt(t, tx, ty) {
    t.alive = false; t.dead = true;
    killed++;
    game.feedback.good(tx, ty, { text: 'GOOD', color: C.good, size: 28 });
    game.fx.burst(tx, ty, { color: C.flare, count: 14, speed: 300 });
    game.audio.play('se_break', 0.4);
    if (killed === Math.ceil(TOTAL / 2)) {
      game.fx.popup('NICE', CX, H * 0.4, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (killed >= TOTAL) { ok = true; finished = true; finish(); }
  }

  function breach(t) {
    t.alive = false; t.dead = true;
    missed++;
    guardFlash = 0.3;
    game.feedback.bad(t.x, WALL_Y, { text: 'MISS', size: 26 });
    game.fx.shake(14, 0.2);
    game.audio.play('se_bad', 0.45);
    if (missed >= MISS_LIMIT) {
      ok = false; finished = true; hitStop = 0.4; shake = 0.4;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && !done) {
      game.audio.play('se_tap', 0.12);
      var hit = null, bestD = 1e9;
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t.alive) continue;
        var d = Math.hypot(t.x - x, t.y - y);
        if (d < 110 && d < bestD) { bestD = d; hit = t; }
      }
      if (hit) shootAt(hit, x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickField(dt) {
    if (spawnIdx < TOTAL && spawnTimer <= 0) {
      targets.push(newTarget(0));
      spawnIdx++;
      spawnTimer = 1.7 + Math.random() * 0.5;
    }
    spawnTimer -= dt;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t.alive) continue;
      t.t += dt;
      if (t.t >= t.dur) breach(t);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.5, press: false, targets: [], spawned: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.targets = [newTarget(0)]; killed = 0; missed = 0; demo._spawned2 = false; }
    targets = demo.targets;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t.alive) continue;
      t.t += dt;
      var p = t.t / t.dur;
      if (p > 0.5 && p < 0.66 && !t._shot) {
        t._shot = true;
        demo.gx = t.x; demo.gy = t.y; demo.press = true;
        shootAt(t, t.x, t.y);
      }
      if (p > 0.7) demo.press = false;
    }
    if (cyc > 1.3 && !demo._spawned2) {
      demo._spawned2 = true;
      demo.targets = targets.concat([newTarget(0)]);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targets === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < targets.length; i++) if (targets[i].alive) drawCreep(targets[i]);
      game.draw.sprite(GUARD, { '#': C.gold }, W * 0.5, WALL_Y + 60, 30, { anchor: 'center' });
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
      game.draw.sprite(GUARD, { '#': C.gold }, W * 0.5, WALL_Y + 60, 30, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(killed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - killed) + '体!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(killed, { killed: killed, total: TOTAL });
        else game.end.failure({ killed: killed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickField(dt);
    }
    if (shake > 0) shake -= dt;
    if (guardFlash > 0) guardFlash -= dt;

    bg();
    for (var j = 0; j < targets.length; j++) if (targets[j].alive) drawCreep(targets[j]);
    game.draw.sprite(GUARD, { '#': guardFlash > 0 ? C.bad : C.gold }, W * 0.5, WALL_Y + 60, 30, { anchor: 'center' });

    txt(killed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (killed / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 40, 220, 12, m < missed ? C.bad : C.wall);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
