// D-20092012-0054-horde-strike-line.js
// ホードストライクライン — 四方八方から迫る群れを、拠点に届く前に片っ端からタップで撃つ
// 操作: 画面各所から中央の拠点へ迫ってくる敵を、届く前にタップして撃破する
// 終わり: 規定数(8体)撃破すれば成功。1体でも拠点に到達すれば失敗
// @mechanic: aim_shoot
// @theme: core_siege_outpost
// 世界観: 荒野にぽつんと立つ小さな拠点。四方から押し寄せる群れを、見張り番が届く前に片っ端から撃ち落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破できた数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめの塊、はっきりした縁取り、彩度中〜高
  var C = {
    bg: '#2a1a10', bg2: '#150c08', ground: '#3a2818', base: '#ffd23f', baseCore: '#fff6c9',
    enemy: '#7fce4a', enemyDark: '#3a7a24', gold: '#ffb000', good: '#5fd47a', bad: '#e0524f',
    warn: '#ff5a3d', white: '#ffffff', ink: '#180d06',
  };

  var GAME_TITLE = 'STRIKE LINE';
  var TOTAL = 8;
  var CX = W * 0.5, CY = H * 0.46;
  var RX = 420, RY = 480;
  var BASE_R = 100;
  var HIT_R = 82;
  var TRAVEL_DUR = 2.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_SPR = ['.##.', '####', '.##.', '#..#'];
  var BASE_SPR = ['#.#.#', '#####', '.###.', '..#..'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, CY, RY + 40, '#00000020');
    for (var i = 0; i < 5; i++) game.draw.circle(CX, CY, 120 + i * 90, '#ffffff', 0.02);
    ambient(t);
  }

  var enemies, killed, spawned, spawnT, spawnGap, done, endWait, finished, ready, hitStop, shake, lastKillPt;

  function newEnemy(idx) {
    var ang = game.random(0, Math.PI * 2);
    return {
      sx: CX + Math.cos(ang) * RX, sy: CY + Math.sin(ang) * RY,
      t: 0, dur: TRAVEL_DUR + (Math.random() - 0.5) * 0.3,
      resolved: false, gold: idx % 3 === 2,
    };
  }

  function initGame() {
    enemies = []; killed = 0; spawned = 0; spawnT = 0; spawnGap = 1.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; lastKillPt = null;
  }

  function posOf(e) {
    var p = Math.min(1, e.t / e.dur);
    return { x: e.sx + (CX - e.sx) * p, y: e.sy + (CY - e.sy) * p, p: p };
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.resolved) continue;
      var pos = posOf(e);
      var d = Math.hypot(x - pos.x, y - pos.y);
      if (d < HIT_R && d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) {
      var e = enemies[best];
      e.resolved = true;
      var pos = posOf(e);
      killed++;
      hitStop = 0.08;
      lastKillPt = pos;
      game.feedback.good(pos.x, pos.y, { text: e.gold ? 'PERFECT' : 'GOOD', color: e.gold ? C.gold : C.good });
      game.fx.burst(pos.x, pos.y, { color: e.gold ? C.gold : C.enemyDark, count: e.gold ? 20 : 12, speed: 320 });
      game.audio.play(e.gold ? 'se_powerup' : 'se_good', 0.4);
      if (killed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.2, { color: C.gold, size: 38 });
      if (killed >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      game.audio.play('se_tap', 0.1);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBase(t, hurt) {
    var pulse = 1 + 0.04 * Math.sin(t * 3);
    game.draw.circle(CX, CY, BASE_R * pulse, hurt ? C.warn : C.baseCore, 0.3);
    game.draw.sprite(BASE_SPR, { '#': hurt ? C.warn : C.base }, CX, CY, 16, { anchor: 'center' });
  }

  function drawEnemy(e) {
    var pos = posOf(e);
    var near = pos.p > 0.72;
    if (near) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, 44, C.warn, 0.4);
    }
    game.draw.sprite(ENEMY_SPR, { '#': e.gold ? C.gold : C.enemy }, pos.x, pos.y, 14, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, e: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { demo.e = newEnemy(0); demo.e.dur = 1.9; }
    demo.e.t += dt;
    var pos = posOf(demo.e);
    if (pos.p < 0.6) { demo.gx = pos.x; demo.gy = pos.y - 40; demo.press = false; }
    else if (!demo.e.resolved) {
      demo.e.resolved = true;
      demo.press = true;
      demo.gx = pos.x; demo.gy = pos.y;
      game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      drawBase(t, false);
      stepDemo(dt);
      if (demo.e && !demo.e.resolved) drawEnemy(demo.e);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawBase(t, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(killed + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - killed) + '体!', W / 2, H * 0.16, 26, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
      spawnT -= dt;
      if (spawnT <= 0 && spawned < TOTAL) {
        enemies.push(newEnemy(spawned));
        spawned++;
        spawnT = spawnGap;
        spawnGap = Math.max(0.85, spawnGap - 0.06);
      }
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.resolved) continue;
        e.t += dt;
        var pos = posOf(e);
        if (pos.p >= 1) {
          e.resolved = true;
          ok = false; finished = true; hitStop = 0.35; shake = 0.35;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
          break;
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawBase(t, false);
    if (!finished) { for (var j = 0; j < enemies.length; j++) if (!enemies[j].resolved) drawEnemy(enemies[j]); }

    txt(killed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (killed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.25]], { tempo: 140, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
