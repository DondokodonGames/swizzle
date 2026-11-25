// GH-Wii-0008-corner-combat.js
// コーナーコンバット — 4隅で撃ち合い、最後の1人になる(2〜4人)
// 操作: 自分の角(隅)を連打して撃つ。当たると相手のHPが減る
// 終わり: 順位(誰が最後まで残ったか) + 撃墜数
// @mechanic: duel_2p
// @theme: block_arena
// 世界観: 4隅に分かれたブロックの闘技場。連打で撃ち、当てれば相手が1体減る。残り1人になるまで、または時間切れまで
// 残るもの: 勝者(ラベル) + 勝者の撃墜数(SCORE)
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var PCOL = ['#4a8ae8', '#e84a5a', '#e8c84a', '#4ae87a'];
  var C = {
    bg1: '#2a2440', bg2: '#181432', floorA: '#3a3458', floorB: '#443c66',
    white: '#ffffff', ink: '#0a0814', gold: '#ffd400', bad: '#ff4d5e',
  };

  var GAME_TITLE = 'CORNER COMBAT';
  var ROUND_TIME = 20, HP_START = 3, FIRE_COOLDOWN = 0.32;
  var PLAYERS = [
    { name: 'P1', x: W * 0.22, y: H * 0.30 },
    { name: 'P2', x: W * 0.78, y: H * 0.30 },
    { name: 'P3', x: W * 0.22, y: H * 0.74 },
    { name: 'P4', x: W * 0.78, y: H * 0.74 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var winnerName = '', winnerKOs = 0;

  var hp, alive, cooldown, kos, tracers, done, endWait, elapsedRound, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUN_SPRITE = ['##..', '####', '..##'];
  var GUN_PAL = { '#': C.gold };

  function voxel(x, y, s, colIdx) {
    var col = PCOL[colIdx];
    game.draw.rect(x - s, y - s * 1.4, s * 2, s * 1.4, col);
    game.draw.rect(x - s, y - s * 1.4, s * 2, s * 0.4, '#ffffff', 0.25);
    game.draw.rect(x - s, y - s * 0.2, s * 2, s * 0.3, '#000000', 0.25);
    game.draw.sprite(GUN_SPRITE, GUN_PAL, x, y + s * 0.1, s * 0.28, { anchor: 'center' });
  }

  function arenaBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var gx = 0; gx < W; gx += 90) {
      for (var gy = H * 0.14; gy < H * 0.88; gy += 90) {
        var chk = (Math.floor(gx / 90) + Math.floor(gy / 90)) % 2 === 0;
        game.draw.rect(gx, gy, 90, 90, chk ? C.floorA : C.floorB, 0.7);
      }
    }
    game.draw.line(0, H * 0.5, W, H * 0.5, C.bg2, 3);
    game.draw.line(W / 2, H * 0.14, W / 2, H * 0.88, C.bg2, 3);
  }

  function initGame() {
    hp = [HP_START, HP_START, HP_START, HP_START];
    alive = [true, true, true, true];
    cooldown = [0, 0, 0, 0];
    kos = [0, 0, 0, 0];
    tracers = [];
    done = false; endWait = 0; elapsedRound = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function aliveCount() { var n = 0; for (var i = 0; i < 4; i++) if (alive[i]) n++; return n; }

  function fire(shooter) {
    if (!alive[shooter] || cooldown[shooter] > 0 || finished) return;
    cooldown[shooter] = FIRE_COOLDOWN;
    var others = [];
    for (var i = 0; i < 4; i++) if (i !== shooter && alive[i]) others.push(i);
    if (others.length === 0) return;
    var target = others[Math.floor(Math.random() * others.length)];
    tracers.push({ a: shooter, b: target, t: 0.15 });
    hp[target]--;
    if (hp[target] <= 0) {
      alive[target] = false;
      kos[shooter]++;
      game.feedback.bad(PLAYERS[target].x, PLAYERS[target].y, { text: 'KO' });
      game.fx.burst(PLAYERS[target].x, PLAYERS[target].y, { color: PCOL[target], count: 16, speed: 380 });
      game.audio.play('se_failure', 0.35);
      shake = 0.15;
      if (aliveCount() === 2) game.fx.popup('FINAL 2', W / 2, H * 0.5, { color: C.gold, size: 54 });
    } else {
      game.feedback.good(PLAYERS[target].x, PLAYERS[target].y, { text: 'HIT', color: C.gold });
      game.audio.play('se_good', 0.3);
    }
  }

  function zoneOf(x, y) {
    var left = x < W / 2, top = y < H / 2;
    if (left && top) return 0; if (!left && top) return 1;
    if (left && !top) return 2; return 3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    game.audio.play('se_tap', 0.1);
    fire(zoneOf(x, y));
  });

  function resolveEnd() {
    if (finished) return;
    finished = true;
    var best = 0;
    for (var i = 1; i < 4; i++) { if (hp[i] > hp[best] || (hp[i] === hp[best] && kos[i] > kos[best])) best = i; }
    winnerName = PLAYERS[best].name;
    winnerKOs = kos[best];
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play('se_success', 0.5);
    endWait = 1.4;
  }

  // ── ATTRACT ゴースト実演: 4隅を順番に連打 ──
  var demoIdx = 0, demoT = 0;
  function stepDemo(dt) {
    demoT += dt;
    if (demoT > 0.5) { demoT = 0; demoIdx = (demoIdx + 1) % 4; fire(demoIdx); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hp === undefined) initGame();
      arenaBg();
      stepDemo(dt);
      for (var p = 0; p < 4; p++) if (alive[p]) voxel(PLAYERS[p].x, PLAYERS[p].y, 46, p);
      game.draw.hand(PLAYERS[demoIdx].x, PLAYERS[demoIdx].y + 90, { press: demoT < 0.15, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 54, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      arenaBg();
      for (var p2 = 0; p2 < 4; p2++) if (alive[p2]) voxel(PLAYERS[p2].x, PLAYERS[p2].y, 50, p2);
      txt(winnerName + ' WIN', W / 2, H * 0.08, 64, C.white);
      for (var r = 0; r < 4; r++) txt(PLAYERS[r].name + (alive[r] ? ' HP' + Math.max(0, hp[r]) : ' GAME OVER') + ' KO' + kos[r], W / 2, H * 0.16 + r * 0.045 * H, 30, alive[r] ? C.white : C.bad);
      var best = Math.max(game.best, winnerKOs);
      txt('BEST KO ' + best, W / 2, H * 0.90, 34, C.gold);
      if (winnerKOs > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.95, 32, C.gold);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(winnerKOs, { label: winnerName + ' WIN' }); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      for (var c = 0; c < 4; c++) if (cooldown[c] > 0) cooldown[c] -= dt;
      for (var tI = tracers.length - 1; tI >= 0; tI--) { tracers[tI].t -= dt; if (tracers[tI].t <= 0) tracers.splice(tI, 1); }
      if (aliveCount() <= 1) resolveEnd();
      else if (elapsedRound >= ROUND_TIME) resolveEnd();
    }
    if (shake > 0) shake -= dt;

    arenaBg();
    for (var tr = 0; tr < tracers.length; tr++) {
      var t2 = tracers[tr];
      game.draw.line(PLAYERS[t2.a].x, PLAYERS[t2.a].y, PLAYERS[t2.b].x, PLAYERS[t2.b].y, C.gold, 5);
    }
    for (var p3 = 0; p3 < 4; p3++) {
      if (!alive[p3]) { game.draw.circle(PLAYERS[p3].x, PLAYERS[p3].y, 40, C.ink, 0.4); continue; }
      voxel(PLAYERS[p3].x, PLAYERS[p3].y, 44, p3);
      game.draw.rect(PLAYERS[p3].x - 44, PLAYERS[p3].y - 100, 88, 12, C.ink, 0.6);
      game.draw.rect(PLAYERS[p3].x - 44, PLAYERS[p3].y - 100, 88 * (hp[p3] / HP_START), 12, PCOL[p3]);
    }
    var liveTouches = game.touches;
    for (var lt = 0; lt < liveTouches.length; lt++) game.draw.circle(liveTouches[lt].x, liveTouches[lt].y, 50, C.gold, 0.12);

    txt(Math.max(0, Math.ceil(ROUND_TIME - elapsedRound)) + ' / ' + ROUND_TIME + 's', W / 2, H * 0.06, 36, C.white);
    txt(aliveCount() + ' / 4', W / 2, H * 0.94, 30, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 84, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
