// K-DS-0012-triple-guard-duel.js
// 三重構え演武 — 立て札の型が仕掛ける三種の攻めを見切り、正しい構えで受け返す
// 操作: 画面下の3つの構えゾーン(しゃがむ/斬る/跳ぶ)から、攻めの型に合う構えを見て選んでタップ
// 終わり: 規定本数(6本)を全て正しい構えで受ければ成功。誤った構え/受け遅れが1回でもあれば失敗
// @mechanic: judge
// @theme: dojo_practice_dummy
// 世界観: 型稽古の道場。中央に立つ稽古人形が三種の型(高い振り/低い薙ぎ/直突き)で仕掛けてくる。見習い剣士は型を見極め、しゃがむ・跳ぶ・斬るの三つの構えから正しいものを選んで受け返す
// 残るもの: 正誤(免許皆伝/未熟)+ 受けた本数とコンボ倍率
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 6〜8色、菱形グリッド、影で高さを示す
  var C = {
    bg: '#1c1408', bg2: '#2c2010', floorA: '#3a2c18', floorB: '#453422',
    dummy: '#8a7050', dummyDark: '#5a4630', wood: '#6a4a2a',
    crouch: '#3dc9ff', slice: '#ff5540', jump: '#ffd23d',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4ecd8', ink: '#0a0602',
  };

  var GAME_TITLE = 'GUARD DUEL';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.42;
  var ZONES = [
    { id: 'crouch', x: W * 0.22, y: H * 0.80, r: 110, color: C.crouch },
    { id: 'slice',  x: W * 0.5,  y: H * 0.80, r: 110, color: C.slice },
    { id: 'jump',   x: W * 0.78, y: H * 0.80, r: 110, color: C.jump },
  ];
  var TYPES = ['crouch', 'slice', 'jump']; // 型: 高い振り→しゃがむ / 直突き→斬る / 低い薙ぎ→跳ぶ

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DUMMY_IDLE = ['.##.', '####', '.##.', '.##.', '#..#'];
  var DUMMY_HIGH = ['/##.', '####', '.##.', '.##.', '#..#'];
  var DUMMY_LOW  = ['.##\\', '####', '.##.', '.##.', '#..#'];
  var DUMMY_THRUST = ['.##.', '####-', '.##.', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    // 菱形グリッド床(80s ISO)
    var step = 90;
    for (var gy = 0; gy < 14; gy++) {
      for (var gx = -2; gx < 8; gx++) {
        var ox = W * 0.5 + (gx - gy % 2 * 0.5) * step;
        var oy = H * 0.58 + gy * (step * 0.42);
        if (oy > H * 0.98) continue;
        var col = (gx + gy) % 2 === 0 ? C.floorA : C.floorB;
        game.draw.line(ox - step * 0.48, oy, ox, oy - step * 0.2, col, 3);
        game.draw.line(ox, oy - step * 0.2, ox + step * 0.48, oy, col, 3);
        game.draw.line(ox + step * 0.48, oy, ox, oy + step * 0.2, col, 3);
        game.draw.line(ox, oy + step * 0.2, ox - step * 0.48, oy, col, 3);
      }
    }
    game.draw.circle(CX, CY + 130, 150, C.ink, 0.25);
  }

  function dummySprite(type, telegraphed) {
    var frame = DUMMY_IDLE;
    if (telegraphed) {
      if (type === 'crouch') frame = DUMMY_HIGH;
      else if (type === 'jump') frame = DUMMY_LOW;
      else frame = DUMMY_THRUST;
    }
    game.draw.sprite(frame, { '#': C.dummy, '/': C.dummyDark, '\\': C.dummyDark, '-': C.dummyDark }, CX, CY, 26, { anchor: 'center' });
  }

  function zoneIcon(id, x, y, color) {
    if (id === 'crouch') {
      // 下向き矢印(しゃがむ)
      game.draw.line(x, y - 34, x, y + 20, color, 10);
      game.draw.line(x - 24, y - 2, x, y + 26, color, 10);
      game.draw.line(x + 24, y - 2, x, y + 26, color, 10);
    } else if (id === 'jump') {
      // 上向き矢印(跳ぶ)
      game.draw.line(x, y + 34, x, y - 20, color, 10);
      game.draw.line(x - 24, y + 2, x, y - 26, color, 10);
      game.draw.line(x + 24, y + 2, x, y - 26, color, 10);
    } else {
      // 斜め斬撃(斬る)
      game.draw.line(x - 30, y + 30, x + 30, y - 30, color, 12);
      game.draw.line(x - 10, y + 34, x + 34, y - 10, color, 6);
    }
  }

  function drawZones(activeId, resultId) {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var isActive = activeId === z.id;
      var a = isActive ? 0.55 : 0.22;
      game.draw.circle(z.x, z.y, z.r, z.color, a);
      game.draw.circle(z.x, z.y, z.r, z.color, isActive ? 1 : 0.5);
      zoneIcon(z.id, z.x, z.y, C.white);
      if (resultId && resultId === z.id) {
        game.draw.circle(z.x, z.y, z.r + 14, ok ? C.good : C.bad, 0.8);
      }
    }
  }

  var round, req, roundT, roundDur, telegraphed, resolved, combo, comboMult, done, endWait, finished;
  var ready, hitStop, shake, resultZone;

  function newRound(idx) {
    var type = TYPES[Math.floor(game.random(0, 3))];
    var dur = Math.max(0.85, 1.35 - idx * 0.08);
    return { type: type, dur: dur };
  }

  function initGame() {
    round = 0; combo = 0; comboMult = 1; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; resultZone = null;
    req = newRound(0); roundT = 0; telegraphed = false; resolved = false;
  }

  function resolvePick(zoneId) {
    if (resolved || ready > 0 || done || finished || !telegraphed) return;
    resolved = true;
    resultZone = zoneId;
    var correct = zoneId === req.type;
    var pWin = roundT / req.dur;
    var inWindow = pWin >= 0.45 && pWin <= 1.05;
    var success = correct && inWindow;
    hitStop = success ? 0.12 : 0.32;
    if (success) {
      combo++; comboMult = 1 + Math.floor(combo / 2) * 0.5;
      game.feedback.good(ZONES.filter(function(z){return z.id===zoneId;})[0].x, ZONES.filter(function(z){return z.id===zoneId;})[0].y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (round + 1 === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
    } else {
      combo = 0; comboMult = 1;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    round++;
    if (!success) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (Math.hypot(x - z.x, y - z.y) <= z.r) { game.audio.play('se_tap', 0.15); resolvePick(z.id); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ZONES[1].x, gy: ZONES[1].y, press: false, k: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { round = 0; combo = 0; comboMult = 1; req = newRound(0); roundT = 0; telegraphed = false; resolved = false; demo.k = 0; }
    roundT += dt;
    if (roundT / req.dur > 0.35) telegraphed = true;
    var pWin = roundT / req.dur;
    if (!resolved && pWin >= 0.6 && pWin < 0.72) {
      resolved = true;
      var target = ZONES.filter(function(z){ return z.id === req.type; })[0];
      demo.gx = target.x; demo.gy = target.y; demo.press = true; resultZone = req.type;
      game.feedback.good(target.x, target.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
      combo++; round++;
    }
    if (pWin >= 1) {
      demo.press = false; demo.gx = ZONES[1].x; demo.gy = ZONES[1].y;
      req = newRound(round % 3); roundT = 0; telegraphed = false; resolved = false; resultZone = null;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      dummySprite(req.type, telegraphed);
      drawZones(null, resultZone);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
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
      dummySprite('crouch', false);
      drawZones(null, null);
      txt(ok ? '免許皆伝' : '未熟', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - round) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var score = round * 100 * comboMult;
        if (ok) game.end.success(score, { dodged: round, total: TOTAL, combo: combo });
        else game.end.failure({ dodged: round, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT / req.dur > 0.35) telegraphed = true;
      if (roundT / req.dur >= 1.1 && !resolved) {
        resolved = true; resultZone = null;
        combo = 0; comboMult = 1;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    dummySprite(req.type, telegraphed);
    drawZones(telegraphed && !resolved ? null : null, resultZone);
    if (telegraphed && !resolved) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, CY - 160, 20, C.bad, 0.8);
    }

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    txt('x' + comboMult.toFixed(1), W / 2, H * 0.115, 24, C.gold);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['A3', 0.4], ['D4', 0.6]], { tempo: 110, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
