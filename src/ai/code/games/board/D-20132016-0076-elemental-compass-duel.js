// D-20132016-0076-elemental-compass-duel.js
// エレメンタル・コンパスデュエル — 手札の代わりに四方の属性札を振り、モンスターの属性を読んで打ち返す
// 操作: 敵モンスターの属性を見て、それに勝る属性の方向へ指を払う(上=火/下=水/左=風/右=土)
// 終わり: 先に相手の体力を0にすれば勝利。自分の体力が0になれば敗北
// @mechanic: swipe_direction
// @theme: elemental_compass_duel
// 世界観: 元素使いの決闘士が、手にした四方の属性札を振るい合う一度きりの決闘。方角そのものが札になる
// 残るもの: 正誤(CLEAR/GAME OVER) + 残った自分の体力
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管の縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030',
    fire: '#ff3d3d', water: '#2ecaff', wind: '#4dffa0', earth: '#e0a030',
    ally: '#ffe600', enemy: '#c04dff', good: '#39ff6a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };
  var EL = ['fire', 'water', 'wind', 'earth'];
  var EL_COLOR = { fire: C.fire, water: C.water, wind: C.wind, earth: C.earth };
  var BEATS = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire' };
  var DIR_EL = { up: 'fire', down: 'water', left: 'wind', right: 'earth' };
  var EL_DIR = { fire: 'up', water: 'down', wind: 'left', earth: 'right' };

  var GAME_TITLE = 'COMPASS DUEL';
  var CX = W * 0.5, CY = H * 0.42;
  var HP_MAX = 3;
  var ROUND_TIME = 2.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
  ];
  var ENEMY_FRAMES = [
    ['.####.', '##..##', '.####.', '#.##.#', '##..##'],
    ['.####.', '##..##', '.####.', '#.##.#', '.#..#.'],
  ];

  var pHp, eHp, enemyEl, roundT, resolved, finished, done, endWait, hitStop, shake, ready;

  function newRound() {
    enemyEl = EL[Math.floor(game.random(0, 4))];
    roundT = 0; resolved = false;
  }

  function initGame() {
    pHp = HP_MAX; eHp = HP_MAX; finished = false; done = false;
    endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newRound();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * (0.15 + i * 0.06), W, H * (0.15 + i * 0.06), '#ffffff', 0.03);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawFighters() {
    var bobY = Math.sin(game.time.elapsed * 2.2) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.6) * 3;
    game.draw.sprite(ALLY_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ally }, W * 0.28 + swayX, CY + bobY, 15, { anchor: 'center' });
    var flash = roundT > (ROUND_TIME - 0.7) && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.sprite(ENEMY_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': flash ? C.gold : C.enemy }, W * 0.72 - swayX, CY + bobY, 15, { anchor: 'center' });
    game.draw.circle(W * 0.72, CY - 130, 26, EL_COLOR[enemyEl]);
  }

  function drawHp() {
    var bw = W * 0.36, bh = 24;
    game.draw.rect(W * 0.06, H * 0.1, bw, bh, C.ink, 0.6);
    game.draw.rect(W * 0.06, H * 0.1, bw * (pHp / HP_MAX), bh, C.ally);
    game.draw.rect(W * 0.58, H * 0.1, bw, bh, C.ink, 0.6);
    game.draw.rect(W * 0.58 + bw * (1 - eHp / HP_MAX), H * 0.1, bw * (eHp / HP_MAX), bh, C.enemy);
  }

  function drawCompass() {
    var cx = CX, cy = H * 0.82, r = 150;
    var pts = { up: { x: cx, y: cy - r }, down: { x: cx, y: cy + r }, left: { x: cx - r, y: cy }, right: { x: cx + r, y: cy } };
    for (var d in pts) {
      var el = DIR_EL[d];
      game.draw.circle(pts[d].x, pts[d].y, 52, C.ink, 0.5);
      game.draw.circle(pts[d].x, pts[d].y, 40, EL_COLOR[el], 0.55);
    }
    game.draw.circle(cx, cy, 30, C.white, 0.12);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveSwipe(dir) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    var el = DIR_EL[dir];
    var correct = !!el && BEATS[el] === enemyEl;
    hitStop = correct ? 0.14 : 0.3;
    if (correct) {
      eHp--;
      game.feedback.good(W * 0.72, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(W * 0.72, CY, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (eHp === 1) { game.fx.popup('あと1!', CX, H * 0.24, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    } else {
      pHp--;
      game.feedback.bad(W * 0.28, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (eHp <= 0) { ok = true; finished = true; finish(); return; }
    if (pHp <= 0) { ok = false; finished = true; finish(); return; }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    game.audio.play('se_tap', 0.1);
    resolveSwipe(dir);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: CX, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    roundT += dt;
    if (cyc > 2.0 && !resolved) {
      var correctEl = null;
      for (var i = 0; i < EL.length; i++) if (BEATS[EL[i]] === enemyEl) correctEl = EL[i];
      var d = EL_DIR[correctEl];
      var pts = { up: { x: CX, y: H * 0.82 - 150 }, down: { x: CX, y: H * 0.82 + 150 }, left: { x: CX - 150, y: H * 0.82 }, right: { x: CX + 150, y: H * 0.82 } };
      demo.gx = pts[d].x; demo.gy = pts[d].y; demo.press = true;
      resolveSwipe(d);
    } else if (cyc < 2.0) {
      demo.press = false; demo.gx = CX; demo.gy = H * 0.82;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pHp === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters();
      drawHp();
      drawCompass();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.22, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFighters();
      drawHp();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 46, ok ? C.good : C.bad);
      txt(pHp + ' / ' + HP_MAX, W / 2, H * 0.29, 28, C.gold);
      if (!ok && pHp >= 1) txt('あと少し!', W / 2, H * 0.33, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pHp: pHp, eHp: eHp };
        if (ok) game.end.success(pHp, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= ROUND_TIME && !resolved) {
        var correctEl = null;
        for (var ci = 0; ci < EL.length; ci++) { if (BEATS[EL[ci]] === enemyEl) correctEl = EL[ci]; }
        var wrongDir = EL_DIR[correctEl] === 'up' ? 'down' : 'up';
        resolveSwipe(wrongDir);
      }
      if (resolved && hitStop <= 0 && !finished) { newRound(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFighters();
    drawHp();
    if (!finished) drawCompass();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 138, wave: 'sawtooth', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
