// GH-PS-0050-strike-moment.js
// ストライクモーメント — 当たりの瞬間に竿を上げる。早いと逃げる、遅いと糸が切れる
// 操作: 浮きが沈んだ瞬間にタップ
// 終わり: 3投。釣れた数と、釣れた魚の大きさ(cm)が残る。外した理由(早い/遅い)も残る
// @mechanic: timing_one_shot
// @theme: night_pier
// 世界観: 夜の桟橋。浮きは何度か小さく揺れてから、本当の当たりで一気に沈む。揺れに反応すると早すぎて逃げる
// 残るもの: 3投ぶんの結果(釣れた大きさ cm、または逃した/切れたの理由)。合計サイズがSCORE
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // PIXEL HD: 多色+光。光源1つで陰影を統一
  var C = {
    sky1: '#0a1428', sky2: '#16294a', water1: '#0f3a52', water2: '#082436',
    pier: '#5a4028', pier2: '#3a2818', line: '#dcdcdc', float1: '#ff5040', float2: '#ffffff',
    fish: '#c8d840', fish2: '#8ba020', gold: '#ffd400', good: '#4dff7a', bad: '#ff3d5e', white: '#ffffff', ink: '#0a0a12',
  };

  var GAME_TITLE = 'STRIKE MOMENT';
  var CASTS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var cast, phase, phaseT, bites, biteIdx, results, done, endWait, floatY, floatBase;
  var ready, hitStop, shake, ripple;

  var FISH_SPRITE = ['..###.', '.#####', '######', '.#####', '..###.'];
  var FISH_PAL = { '#': C.fish };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  var FLOAT_X = W * 0.62, FLOAT_BASE_Y = H * 0.46;

  var STARS = (function() {
    var arr = [];
    for (var i = 0; i < 22; i++) arr.push({ x: (i * 97 + 31) % W, y: (i * 53 + 11) % (H * 0.30), r: 2 + (i % 3) });
    return arr;
  })();
  var BG_FISH = [
    { x: 0.15, y: 0.55, dir: 1, ph: 0 },
    { x: 0.82, y: 0.62, dir: -1, ph: 1.4 },
    { x: 0.10, y: 0.72, dir: 1, ph: 2.7 },
  ];
  var FISH_SIL = ['.##.', '####', '.##.'];
  var FISH_SIL_PAL = { '#': '#0a2838' };

  function pierBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.30, C.sky2], [0.34, C.water1], [1, C.water2]]);
    for (var s = 0; s < STARS.length; s++) {
      var st = STARS[s];
      game.draw.circle(st.x, st.y, st.r, '#ffffff', 0.4 + 0.3 * Math.sin(game.time.elapsed * 2 + s));
    }
    game.draw.circle(W * 0.20, H * 0.14, 70, '#f4e9b0', 0.85);
    // 波紋(常時ゆらぎ)
    for (var i = 0; i < 4; i++) {
      var t = (game.time.elapsed * 0.3 + i * 0.25) % 1;
      game.draw.circle(FLOAT_X, floatBase !== undefined ? floatBase : FLOAT_BASE_Y, 30 + t * 140, C.water1, (1 - t) * 0.3);
    }
    // 水面の遠景(背景魚のシルエット + 小波紋)。水域の空きを埋める
    for (var f = 0; f < BG_FISH.length; f++) {
      var bf = BG_FISH[f];
      var bx = W * bf.x + Math.sin(game.time.elapsed * 0.6 + bf.ph) * 60 * bf.dir;
      var by = H * bf.y + Math.sin(game.time.elapsed * 0.9 + bf.ph) * 10;
      game.draw.sprite(FISH_SIL, FISH_SIL_PAL, bx, by, 8, { anchor: 'center', flipX: bf.dir < 0 });
      game.draw.circle(bx, by, 24 + 6 * Math.sin(game.time.elapsed * 1.5 + bf.ph), C.water1, 0.25);
    }
    for (var w = 0; w < 6; w++) {
      var wx = (w * 190 + 40 + (game.time.elapsed * 14) % 190) % W;
      var wy = H * (0.40 + (w % 3) * 0.12);
      game.draw.circle(wx, wy, 14 + 4 * Math.sin(game.time.elapsed * 2 + w), '#ffffff', 0.06);
    }
    // 桟橋(下)
    game.draw.rect(0, H * 0.80, W, H * 0.20, C.pier);
    game.draw.rect(0, H * 0.80, W, 12, C.pier2);
    for (var p = 0; p < 8; p++) game.draw.rect(p * 150 + 20, H * 0.80, 8, H * 0.20, C.pier2, 0.6);
    // 桟橋の杭(左右の水面に立つ)
    game.draw.rect(W * 0.08 - 8, H * 0.62, 16, H * 0.20, C.pier2, 0.8);
    game.draw.rect(W * 0.90 - 8, H * 0.58, 16, H * 0.24, C.pier2, 0.8);
  }

  function initGame() {
    cast = 0; results = []; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0; ripple = 0;
    newCast();
  }

  function newCast() {
    phase = 'wait'; phaseT = 0.8 + Math.random() * 0.8;
    bites = 1 + Math.floor(Math.random() * 2);   // 揺れの回数(フェイント)
    biteIdx = 0; floatY = 0; floatBase = FLOAT_BASE_Y;
  }

  function settle(kind, size) {
    results.push({ kind: kind, size: size || 0 });
    hitStop = kind === 'catch' ? 0.15 : 0.1;
    if (kind === 'catch') {
      game.feedback.good(FLOAT_X, floatBase, { text: size + 'cm', color: C.gold });
      game.fx.burst(FLOAT_X, floatBase, { color: C.gold, count: 14, speed: 360 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(FLOAT_X, floatBase, { text: kind === 'early' ? '早い' : kind === 'late' ? '遅い' : 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.5);
    }
    if (kind === 'catch' && results.filter(function(r) { return r.kind === 'catch'; }).length === 2) {
      game.fx.popup('2匹目!', W / 2, H * 0.30, { color: C.gold, size: 52 });
    }
    cast++;
    if (cast >= CASTS) finish();
    else { phase = 'wait2'; phaseT = 1.0; }
  }

  function tapNow() {
    if (phase === 'feint') {
      settle('early');
    } else if (phase === 'bite') {
      var size = 15 + Math.round(Math.random() * 25 + Math.max(0, 8 - phaseT * 30));
      settle('catch', size);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = results.reduce(function(s, r) { return s + r.size; }, 0);
    game.audio.stopBgm();
    game.audio.play(finalScore > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    if (done || ready > 0 || hitStop > 0) return;
    tapNow();
  });

  function drawFloat(y, deep) {
    game.draw.line(FLOAT_X, H * 0.80, FLOAT_X, y, C.line, 2);
    game.draw.circle(FLOAT_X, y + 4, 6, '#000000', 0.3);
    game.draw.rect(FLOAT_X - 10, y - (deep ? 8 : 24), 20, deep ? 16 : 32, C.float1);
    game.draw.rect(FLOAT_X - 10, y - (deep ? 8 : 24), 20, 8, C.float2);
  }

  // ── ATTRACT ゴースト実演: 小さな揺れでは動かず、本当の沈みで手が落ちる ──
  var demo = { t: 0, gx: FLOAT_X, gy: H * 0.65, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.5;
    var deep = cyc > 2.0 && cyc < 2.5;
    var feintY = FLOAT_BASE_Y - Math.sin(demo.t * 8) * 6;
    var y = deep ? FLOAT_BASE_Y + 22 * Math.min(1, (cyc - 2.0) * 4) : feintY;
    demo.gy += ((deep ? H * 0.56 : H * 0.65) - demo.gy) * Math.min(1, dt * 5);
    demo.press = cyc > 2.0 && cyc < 2.2;
    if (cyc > 2.0 && cyc < 2.03) { game.feedback.good(FLOAT_X, FLOAT_BASE_Y, { text: '32cm', color: C.gold }); game.fx.burst(FLOAT_X, FLOAT_BASE_Y, { color: C.gold, count: 10, speed: 300 }); }
    drawFloat(y, deep);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cast === undefined) initGame();
      pierBg();
      stepDemo(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 68, C.white);
      txt('BEST ' + String(game.best) + 'cm', W / 2, H * 0.15, 36, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 54, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 42, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 36, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      pierBg();
      var caught = results.filter(function(r) { return r.kind === 'catch'; }).length;
      txt(caught > 0 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 60, caught > 0 ? C.white : C.bad);
      for (var i = 0; i < results.length; i++) {
        var r = results[i], y0 = H * 0.24 + i * 110;
        if (r.kind === 'catch') {
          game.draw.sprite(FISH_SPRITE, FISH_PAL, W * 0.30, y0, 12, { anchor: 'center' });
          txt(r.size + 'cm', W * 0.62, y0 + 10, 48, C.gold);
        } else {
          txt(r.kind === 'early' ? '早すぎた' : r.kind === 'late' ? '遅すぎた' : '外れ', W / 2, y0 + 10, 40, C.bad);
        }
      }
      txt('SCORE ' + String(finalScore) + 'cm', W / 2, H * 0.62, 54, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best + 'cm', W / 2, H * 0.68, 40, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.74, 44, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 40, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { results: results.map(function(r) { return r.kind + ':' + r.size; }).join(',') }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      phaseT -= dt;
      if (phase === 'wait2' && phaseT <= 0) newCast();
      if (phase === 'wait' && phaseT <= 0) { phase = biteIdx < bites ? 'feint' : 'bite'; phaseT = phase === 'feint' ? 0.35 : 0.9; }
      else if (phase === 'feint' && phaseT <= 0) { biteIdx++; phase = 'wait'; phaseT = 0.4 + Math.random() * 0.3; }
      else if (phase === 'bite' && phaseT <= 0) { settle('late'); }
    }
    if (shake > 0) shake -= dt;

    pierBg();
    var deep2 = phase === 'bite';
    var wobble = phase === 'feint' ? Math.sin(game.time.elapsed * 30) * 8 : Math.sin(game.time.elapsed * 3) * 3;
    var y1 = deep2 ? FLOAT_BASE_Y + 20 * Math.min(1, (0.9 - phaseT) * 4) : FLOAT_BASE_Y + wobble;
    drawFloat(y1, deep2);

    var frac = cast / CASTS;
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, C.gold);
    txt(cast + ' / ' + CASTS, W / 2, 106, 44, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.70, 84, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
