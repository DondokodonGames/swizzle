// D-20092012-0053-chokepoint-spot-watch.js
// チョークポイント監視盤 — 通路の分岐点から本物の隘路を見抜いて防衛陣を置き、迫る一団を迎撃する
// 操作: 通路上に重なる本物のポイントだけをタップして陣を置く。迎撃圏に敵が入ったら再度タップして倒す
// 終わり: 5体を防衛陣で全て迎撃すれば成功。陣の設置が間に合わず1体でも通路を抜けたら失敗
// @mechanic: spot
// @theme: monitor_defense_grid
// 世界観: 古びた監視モニター室。画面に映る通路の分岐から本物の隘路(チョークポイント)を見抜き、そこに防衛陣を置いて侵入者の列を止める管制官
// 残るもの: 正誤(CLEAR/GAME OVER) + 迎撃できた数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: リン光グリーン主体、走査線、単色に近い限定パレット
  var C = {
    bg: '#031a0c', bg2: '#04220f', scan: '#00ff6a', dim: '#0a4a26',
    lane: '#0f5a2e', laneEdge: '#00ff6a', decoy: '#0a4a26', decoyEdge: '#1a8a4a',
    tower: '#ffd23f', enemy: '#ff4d4d', warn: '#ffb000',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd23f', white: '#eaffea', ink: '#020e07',
  };

  var GAME_TITLE = 'CHOKEPOINT';
  var TOTAL = 5;
  var PATH = [
    { x: W * 0.5, y: H * 0.16 },
    { x: W * 0.74, y: H * 0.30 },
    { x: W * 0.30, y: H * 0.46 }, // CHOKE
    { x: W * 0.5, y: H * 0.68 },
  ];
  var CHOKE_IDX = 2;
  var DECOYS = [
    { x: W * 0.64, y: H * 0.46 },
    { x: W * 0.30, y: H * 0.60 },
    { x: W * 0.76, y: H * 0.60 },
  ];
  var TILE_R = 62;
  var RANGE_FRAC = 0.07;
  var REACT_WINDOW = 0.6;
  var ENEMY_DUR = 4.6;
  var SPAWN_GAP = 0.6;

  var SEG_LEN = [], TOTAL_LEN = 0, CHOKE_LEN = 0;
  (function() {
    var acc = 0;
    for (var i = 1; i < PATH.length; i++) {
      var d = Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
      SEG_LEN.push(d);
      acc += d;
      if (i === CHOKE_IDX) CHOKE_LEN = acc;
    }
    TOTAL_LEN = acc;
  })();

  function pointAtLen(len) {
    var acc = 0;
    for (var i = 1; i < PATH.length; i++) {
      if (len <= acc + SEG_LEN[i - 1] || i === PATH.length - 1) {
        var t = SEG_LEN[i - 1] > 0 ? Math.max(0, Math.min(1, (len - acc) / SEG_LEN[i - 1])) : 0;
        return {
          x: PATH[i - 1].x + (PATH[i].x - PATH[i - 1].x) * t,
          y: PATH[i - 1].y + (PATH[i].y - PATH[i - 1].y) * t,
        };
      }
      acc += SEG_LEN[i - 1];
    }
    return PATH[PATH.length - 1];
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_SPR = ['.#.', '###', '.#.'];
  var TOWER_SPR = ['#.#', '###', '.#.'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 20; i++) game.draw.rect(0, i * (H / 20), W, 2, '#00ff6a08');
    ambient(t);
  }

  function drawPath() {
    for (var i = 1; i < PATH.length; i++) {
      game.draw.line(PATH[i - 1].x, PATH[i - 1].y, PATH[i].x, PATH[i].y, C.laneEdge, 56);
      game.draw.line(PATH[i - 1].x, PATH[i - 1].y, PATH[i].x, PATH[i].y, C.lane, 44);
    }
  }

  var towerActive, enemies, killed, done, endWait, finished, ready, hitStop, shake, failReason;
  var searchFail;

  function newEnemies() {
    var list = [];
    for (var i = 0; i < TOTAL; i++) list.push({ t: -i * SPAWN_GAP, dur: ENEMY_DUR, resolved: false, triggered: false, triggerT: 0 });
    return list;
  }

  function initGame() {
    towerActive = false; enemies = newEnemies(); killed = 0;
    done = false; endWait = 0; finished = false; failReason = null; searchFail = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tileHit(x, y, tile) { return Math.hypot(x - tile.x, y - tile.y) < TILE_R; }

  function placeTower(x, y) {
    if (towerActive || finished || done) return;
    if (tileHit(x, y, PATH[CHOKE_IDX])) {
      towerActive = true;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 340 });
      game.audio.play('se_powerup', 0.4);
      return;
    }
    for (var i = 0; i < DECOYS.length; i++) {
      if (tileHit(x, y, DECOYS[i])) {
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        return;
      }
    }
  }

  function fireTower(x, y) {
    if (!towerActive || finished || done) return;
    if (!tileHit(x, y, PATH[CHOKE_IDX])) return;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.resolved && e.triggered) {
        e.resolved = true;
        killed++;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.fx.burst(PATH[CHOKE_IDX].x, PATH[CHOKE_IDX].y, { color: C.enemy, count: 14, speed: 300 });
        game.audio.play('se_good', 0.4);
        hitStop = 0.1;
        if (killed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.5, { color: C.gold, size: 38 });
        if (killed >= TOTAL) { ok = true; finished = true; finish(); }
        return;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    game.audio.play('se_tap', 0.1);
    if (!towerActive) placeTower(x, y);
    else fireTower(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTiles() {
    for (var i = 0; i < DECOYS.length; i++) {
      game.draw.circle(DECOYS[i].x, DECOYS[i].y, TILE_R, C.decoyEdge);
      game.draw.circle(DECOYS[i].x, DECOYS[i].y, TILE_R - 10, C.decoy);
    }
    var choke = PATH[CHOKE_IDX];
    var pulse = towerActive ? 0 : 6 * Math.sin(game.time.elapsed * 4);
    game.draw.circle(choke.x, choke.y, TILE_R + pulse, towerActive ? C.gold : C.laneEdge);
    game.draw.circle(choke.x, choke.y, TILE_R - 10 + pulse, towerActive ? C.tower : C.lane);
    if (towerActive) game.draw.sprite(TOWER_SPR, { '#': C.ink }, choke.x, choke.y, 12, { anchor: 'center' });
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.resolved || e.t < 0) continue;
      var len = Math.min(TOTAL_LEN, (e.t / e.dur) * TOTAL_LEN);
      var p = pointAtLen(len);
      if (e.triggered) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(p.x, p.y, 40, C.warn, 0.5);
      }
      game.draw.sprite(ENEMY_SPR, { '#': C.enemy }, p.x, p.y, 10, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: PATH[0].x, gy: PATH[0].y, press: false, phase: 'find' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { towerActive = false; enemies = newEnemies(); killed = 0; demo.phase = 'find'; }
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      e.t += dt;
      if (e.resolved || e.t < 0) continue;
      var len = Math.min(TOTAL_LEN, (e.t / e.dur) * TOTAL_LEN);
      var range = TOTAL_LEN * RANGE_FRAC;
      if (towerActive && !e.triggered && Math.abs(len - CHOKE_LEN) < range) { e.triggered = true; e.triggerT = 0; }
      if (e.triggered && !e.resolved) e.triggerT += dt;
    }
    if (cyc < 0.9) { demo.gx = PATH[0].x; demo.gy = PATH[0].y; demo.press = false; }
    else if (cyc < 1.4) {
      var p2 = (cyc - 0.9) / 0.5;
      demo.gx = PATH[0].x + (PATH[CHOKE_IDX].x - PATH[0].x) * p2;
      demo.gy = PATH[0].y + (PATH[CHOKE_IDX].y - PATH[0].y) * p2;
      demo.press = p2 > 0.8;
    } else {
      if (!towerActive) { towerActive = true; game.feedback.good(PATH[CHOKE_IDX].x, PATH[CHOKE_IDX].y, { text: 'GOOD', color: C.good }); game.audio.play('se_powerup', 0.25); }
      var anyTriggered = false;
      for (var k = 0; k < enemies.length; k++) {
        if (enemies[k].triggered && !enemies[k].resolved) { anyTriggered = true; break; }
      }
      if (anyTriggered) {
        demo.gx = PATH[CHOKE_IDX].x; demo.gy = PATH[CHOKE_IDX].y; demo.press = true;
        for (var m = 0; m < enemies.length; m++) {
          if (enemies[m].triggered && !enemies[m].resolved) {
            enemies[m].resolved = true; killed++;
            game.feedback.good(PATH[CHOKE_IDX].x, PATH[CHOKE_IDX].y, { text: 'GOOD', color: C.good });
            game.audio.play('se_good', 0.2);
            break;
          }
        }
      } else demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      drawPath();
      stepDemo(dt);
      drawTiles();
      drawEnemies();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.scan);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.scan);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawPath();
      drawTiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(killed + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - killed) + '体!', W / 2, H * 0.16, 26, C.scan);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.scan);
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
      var range = TOTAL_LEN * RANGE_FRAC;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.resolved || e.t < 0) { e.t += dt; continue; }
        e.t += dt;
        var len = Math.min(TOTAL_LEN, (e.t / e.dur) * TOTAL_LEN);
        if (towerActive && !e.triggered && Math.abs(len - CHOKE_LEN) < range) {
          e.triggered = true; e.triggerT = 0;
          game.audio.play('se_tap', 0.15);
        }
        if (e.triggered && !e.resolved) {
          e.triggerT += dt;
          if (e.triggerT > REACT_WINDOW) {
            e.resolved = true;
            ok = false; finished = true; hitStop = 0.35; shake = 0.35;
            game.feedback.bad(PATH[CHOKE_IDX].x, PATH[CHOKE_IDX].y, { text: 'MISS' });
            game.audio.play('se_bad', 0.4);
            finish();
            break;
          }
        }
        if (!towerActive && len >= CHOKE_LEN + range) {
          ok = false; finished = true; hitStop = 0.35; shake = 0.35;
          game.feedback.bad(PATH[CHOKE_IDX].x, PATH[CHOKE_IDX].y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
          break;
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawPath();
    drawTiles();
    if (!finished) drawEnemies();

    txt(killed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.scan);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
