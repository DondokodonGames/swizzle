// D-20092012-0065-elemental-ward-duel.js
// エレメンタルウォード・デュエル — 敵の放つ属性攻撃を見切り、それを打ち消す属性の盾を選ぶ
// 操作: 敵が放つ属性(炎/氷/雷)を見て、その属性に打ち勝つ盾アイコンを即タップする
// 終わり: 規定回数(5回)全て正しい盾で防げば成功。盾違い/出遅れで失敗
// @mechanic: judge
// @theme: elemental_arena_duel
// 世界観: 円形の闘技場。対峙する獣が炎・氷・雷のいずれかを放ってくる。盾持ちの闘士は打ち消す属性を瞬時に選び受け止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 防いだ回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒グラデ + 発光4色、点滅が命
  var C = {
    bg1: '#0a0022', bg2: '#160038', ring: '#2a0a52',
    fire: '#ff5533', ice: '#33c8ff', bolt: '#ffe033',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffe033', white: '#ffffff', ink: '#04021a',
  };

  var GAME_TITLE = 'WARD DUEL';
  var NEEDED = 5;
  var WAIT_MIN = 0.5, WAIT_MAX = 1.0;
  var CUE_WIN = 1.05;

  // 三すくみ: index i の攻撃を打ち消せるのは index (i+1)%3 の盾
  var TYPES = ['fire', 'ice', 'bolt'];
  var COUNTER = { fire: 'ice', ice: 'bolt', bolt: 'fire' };
  var TCOL = { fire: C.fire, ice: C.ice, bolt: C.bolt };
  var ZONES = [
    { type: 'fire', x: W * 0.22 },
    { type: 'ice', x: W * 0.5 },
    { type: 'bolt', x: W * 0.78 },
  ];
  var ZY = H * 0.84, ZW = 260, ZH = 180;
  var CUE_Y = H * 0.36;

  var FIRE_SPR = ['..#..', '.###.', '.###.', '#####', '#####'];
  var ICE_SPR = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];
  var BOLT_SPR = ['..##.', '.##..', '#####', '..##.', '.##..'];
  var BEAST_A = ['.####.', '######', '##..##', '######', '.#..#.'];
  var BEAST_B = ['.####.', '######', '##oo##', '######', '.#..#.'];

  function sprFor(type) { return type === 'fire' ? FIRE_SPR : type === 'ice' ? ICE_SPR : BOLT_SPR; }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    game.draw.circle(W * 0.5, CUE_Y + 60, 320, C.ring, 0.25);
    game.draw.circle(W * 0.5, CUE_Y + 60, 240, C.ring, 0.2);
  }

  var hits, cueType, roundT, cueTime, cued, resolved, hitZone;
  var done, endWait, finished, ready, hitStop, shake, flashState, beastFlash;

  function newRound() {
    roundT = 0; cueTime = game.random(WAIT_MIN, WAIT_MAX); cued = false; resolved = false;
    cueType = TYPES[Math.floor(game.random(0, 3))];
    hitZone = -1;
  }

  function initGame() {
    hits = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0; beastFlash = 0;
    newRound();
  }

  function zoneAt(x, y) {
    for (var i = 0; i < ZONES.length; i++) {
      var zx = ZONES[i].x;
      if (x >= zx - ZW / 2 && x <= zx + ZW / 2 && y >= ZY - ZH / 2 && y <= ZY + ZH / 2) return i;
    }
    return -1;
  }

  function resolveZone(i) {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || resolved) return;
    if (!cued) return;
    resolved = true;
    hitZone = i;
    if (ZONES[i].type === COUNTER[cueType]) {
      hits++; hitStop = 0.08; flashState = 1; beastFlash = 0.2;
      game.feedback.good(ZONES[i].x, ZY, { text: 'GOOD', color: C.good });
      game.fx.burst(ZONES[i].x, ZY, { color: TCOL[ZONES[i].type], count: 14, speed: 280 });
      game.audio.play('se_good', 0.35);
      if (hits === 3) game.fx.popup(hits + ' / ' + NEEDED, W / 2, CUE_Y - 180, { color: C.gold, size: 40 });
      if (hits >= NEEDED) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      flashState = -1; hitStop = 0.35; beastFlash = 0.3;
      game.feedback.bad(ZONES[i].x, ZY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    var i = zoneAt(x, y);
    if (i >= 0) { game.audio.play('se_tap', 0.1); resolveZone(i); } else game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (finished) return;
    roundT += dt;
    if (!cued && roundT >= cueTime) {
      cued = true;
      game.audio.play('se_powerup', 0.3);
    }
    if (!resolved && cued && roundT >= cueTime + CUE_WIN) {
      resolved = true;
      flashState = -1; hitStop = 0.3; beastFlash = 0.3;
      game.feedback.bad(W / 2, CUE_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawBeast() {
    var bob = Math.sin(game.time.elapsed * 2.4) * 8;
    var spr = beastFlash > 0 ? BEAST_B : (Math.floor(game.time.elapsed * 3) % 2 === 0 ? BEAST_A : BEAST_B);
    game.draw.circle(W * 0.5, CUE_Y - 100 + 70, 80, '#000000', 0.2);
    game.draw.sprite(spr, { '#': beastFlash > 0 ? C.white : '#9a7ac0', 'o': C.bad }, W * 0.5, CUE_Y - 100 + bob, 18, { anchor: 'center' });
  }

  function drawCue() {
    if (!cued || resolved) return;
    var col = TCOL[cueType];
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (blink) game.draw.circle(W / 2, CUE_Y, 130, col, 0.3);
    game.draw.sprite(sprFor(cueType), { '#': col }, W / 2, CUE_Y, 20, { anchor: 'center' });
  }

  function drawZones() {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var sway = Math.sin(game.time.elapsed * 1.8 + i) * 3;
      var active = cued && z.type === COUNTER[cueType];
      game.draw.rect(z.x - ZW / 2, ZY - ZH / 2 + sway, ZW, ZH, '#12063a', 0.9);
      game.draw.rect(z.x - ZW / 2, ZY - ZH / 2 + sway, ZW, 8, i === hitZone ? (flashState > 0 ? C.good : C.bad) : (active ? TCOL[z.type] : '#4a2a80'), 0.9);
      game.draw.sprite(sprFor(z.type), { '#': TCOL[z.type] }, z.x, ZY + sway, 14, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, drt: 0, dCue: 0.6, dType: 'ice', dDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.1;
    if (cyc < dt || demo.t <= dt) { demo.drt = 0; demo.dDone = false; hitZone = -1; flashState = 0; }
    demo.drt += dt;
    roundT = demo.drt; cueTime = demo.dCue; cued = demo.drt >= demo.dCue; cueType = demo.dType; resolved = demo.dDone;
    if (cued && !demo.dDone && demo.drt < demo.dCue + 0.35) {
      var wantType = COUNTER[demo.dType];
      var zi = TYPES.indexOf(wantType);
      if (demo.drt < demo.dCue + 0.06) { demo.gx = W / 2; demo.gy = H * 0.86; demo.press = false; }
      else if (demo.drt < demo.dCue + 0.2) { demo.gx = ZONES[zi].x; demo.gy = ZY; demo.press = false; }
      else { demo.press = true; demo.dDone = true; hitZone = zi; flashState = 1; }
    }
  }

  game.onUpdate(function(dt) {
    if (beastFlash > 0) beastFlash -= dt;

    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBeast();
      drawCue();
      drawZones();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + NEEDED : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBeast();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (NEEDED - hits) + '回!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.85;

    bg();
    drawBeast();
    drawCue();
    drawZones();

    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / NEEDED), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
