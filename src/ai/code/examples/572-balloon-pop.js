// 572-balloon-pop.js
// 封印選び — 壁に浮かぶ無数の印から、掲げられた1つだけを見つけて潰す
// 操作: 上に掲げられた印と同じ印をタップ
// 成功: 8個 見つける  失敗: 3回 別の印を潰す or 13秒
// @mechanic: spot
// @theme: dungeon
// 世界観: 遺跡の封印室。壁に浮く偽の印に触れると松明が1つ落ちる
// variation: 精度型(印が小さくなり、似た形が混ざっていく)
// spice: 黄金ターゲット(稀に光る印が出る。潰すと得点3倍)
// 注: 様式が単色のため「色で見分ける」は成立しない。見分けの手がかりを色→印の形に置き換えた
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s MONO パレット(白ドット + 帯のセロハン単色)
  var C = { white: '#ffffff', dim: '#9a9a9a', dark: '#2a2a2a', band1: '#39ff6a', band2: '#ff9a2a' };

  var GAME_TITLE = 'SEAL HUNT';
  var MAX_TIME = 13;
  var NEEDED = 8;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var seals, wanted, found, misses, score, totalTime, done;
  var ready, hitStop, feedback, feedbackOk, shake, goldTimer;

  // 印は4種の形。単色なので「形」だけが手がかりになる
  var GLYPHS = [
    ['.XX.', 'X..X', 'X..X', '.XX.'],   // 0: 環
    ['XXXX', '.X..', '.X..', 'XXXX'],   // 1: 柱
    ['X..X', '.XX.', '.XX.', 'X..X'],   // 2: 交差
    ['XXXX', 'X...', 'X...', 'XXXX'],   // 3: 鉤
  ];
  var GLYPH_COL = { X: C.white };
  var GLYPH_GOLD = { X: C.band2 };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.22); }

  function stoneBg() {
    game.draw.gradient(0, H, [[0, '#101010'], [0.5, '#050505'], [1, '#000000']]);
    // 遠景: 石壁の目地
    for (var ry = 0; ry < 14; ry++) {
      game.draw.line(0, 180 + ry * 130, W, 180 + ry * 130, C.dark, 3);
      var off = ry % 2 ? 130 : 0;
      for (var rx = 0; rx < 5; rx++) game.draw.line(off + rx * 260, 180 + ry * 130, off + rx * 260, 310 + ry * 130, C.dark, 3);
    }
    // 70s MONO の要: 画面帯ごとの単色オーバーレイ(ブラウン管のセロハン)
    game.draw.rect(0, 0, W, H * 0.30, C.band2, 0.12);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.band1, 0.10);
  }

  function makeSeal(i) {
    // 精度型: 進むほど小さく、似た形(環と交差)が混ざりやすくなる
    var tight = Math.min(1, found / NEEDED);
    var px = 16 - tight * 5;
    return {
      g: Math.floor(Math.random() * GLYPHS.length),
      x: 120 + Math.random() * (W - 240),
      y: H * 0.34 + Math.random() * (H * 0.50),
      px: px,
      gold: false,
      pop: 0,
      id: i,
    };
  }

  function layout() {
    seals = [];
    var n = 9 + Math.min(6, found);
    for (var i = 0; i < n; i++) seals.push(makeSeal(i));
    // 正解が最低1つ含まれることを保証する
    var has = false;
    for (var k = 0; k < seals.length; k++) if (seals[k].g === wanted) has = true;
    if (!has) seals[Math.floor(Math.random() * seals.length)].g = wanted;
    // 黄金ターゲット: たまに1つだけ光る正解を混ぜる
    if (goldTimer <= 0 && Math.random() < 0.3) {
      for (var m = 0; m < seals.length; m++) {
        if (seals[m].g === wanted) { seals[m].gold = true; goldTimer = 4; break; }
      }
    }
  }

  function initGame() {
    wanted = Math.floor(Math.random() * GLYPHS.length);
    found = 0; misses = 0; score = 0; totalTime = 0; done = false;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false; shake = 0; goldTimer = 0;
    layout();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = score;
    game.audio.stopBgm();
    if (success) {
      game.audio.play('se_success');
    } else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.white, 0.2);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function hit(s, x, y) {
    if (s.g === wanted) {
      found++;
      var gain = s.gold ? 300 : 100;
      score += gain;
      s.pop = 0.25;
      feedback = 0.35; feedbackOk = true;
      game.feedback.good(x, y, { text: '+' + gain, color: C.white });
      game.audio.play(s.gold ? 'se_milestone' : 'se_success', 0.5);
      game.fx.burst(x, y, { color: s.gold ? C.band2 : C.white, count: 10, speed: 320 });
      if (found >= NEEDED) { finish(true); return; }
      // 次の一手: お題を変えて壁を組み直す
      wanted = Math.floor(Math.random() * GLYPHS.length);
      layout();
    } else {
      misses++;
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.32; shake = 0.32;
      game.audio.play('se_failure', 0.6);
      game.feedback.bad(x, y, { text: 'MISS' });
      if (misses >= MISS_LIMIT) finish(false);
    }
  }

  function drawSeal(s) {
    var art = GLYPHS[s.g];
    var scale = s.px * (1 + s.pop * 2);
    var glow = s.gold && Math.floor(game.time.elapsed * 8) % 2 === 0;
    if (s.gold) game.draw.circle(s.x, s.y, scale * 4, C.band2, glow ? 0.35 : 0.18);
    game.draw.sprite(art, s.gold ? GLYPH_GOLD : GLYPH_COL, s.x, s.y, scale, { anchor: 'center' });
  }

  // 上部の掲示: 探す印(telegraph)
  function wantedBoard(g, big) {
    game.draw.rect(W / 2 - 190, 118, 380, 190, '#000000');
    game.draw.rect(W / 2 - 190, 118, 380, 6, C.white, 0.7);
    game.draw.rect(W / 2 - 190, 302, 380, 6, C.white, 0.7);
    var pulse = big ? 26 + Math.sin(game.time.elapsed * 6) * 2 : 24;
    game.draw.sprite(GLYPHS[g], GLYPH_COL, W / 2, 214, pulse, { anchor: 'center' });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    for (var i = 0; i < seals.length; i++) {
      var s = seals[i];
      var r = s.px * 2.4;
      if (Math.abs(x - s.x) < r && Math.abs(y - s.y) < r) { hit(s, x, y); return; }
    }
    // 何も無い壁を叩いた: 空振りは減点しないが手応えは返す
    game.feedback.bad(x, y, { text: 'MISS' });
    feedback = 0.25; feedbackOk = false;
    game.audio.play('se_tap', 0.3);
  });

  // ── ATTRACT ゴースト実演: 掲示の印と同じものへ手が伸びて潰す ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false, target: null, want: 0 };
  function demoSeals() {
    return [
      { g: 0, x: W * 0.30, y: H * 0.50, px: 16 },
      { g: 1, x: W * 0.68, y: H * 0.44, px: 16 },
      { g: 2, x: W * 0.50, y: H * 0.68, px: 16 },
    ];
  }
  function stepDemo(dt) {
    demo.t += dt;
    var list = demoSeals();
    var cyc = demo.t % 2.4;
    demo.want = Math.floor(demo.t / 2.4) % 3;
    var tgt = list[demo.want];
    if (cyc < 1.4) {
      demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 3.5);
      demo.gy += (tgt.y - demo.gy) * Math.min(1, dt * 3.5);
      demo.press = false;
    } else if (cyc < 1.8) {
      if (!demo.press) {
        demo.press = true;
        game.feedback.good(tgt.x, tgt.y, { text: '+100', color: C.white });
      }
    } else {
      demo.press = false;
    }
    return list;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stoneBg();
      var list = stepDemo(dt);
      wantedBoard(list[demo.want].g, true);
      for (var i0 = 0; i0 < list.length; i0++) {
        game.draw.sprite(GLYPHS[list[i0].g], GLYPH_COL, list[i0].x, list[i0].y, list[i0].px, { anchor: 'center' });
      }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.white);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.10, 38, C.band1);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.band2);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 38, C.dim);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      stoneBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 96, C.white);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.53, 58, C.band1);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.60, 44, C.dim);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.68, 54, C.band2);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.73, 46, C.white);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (goldTimer > 0) goldTimer -= dt;
        if (totalTime >= MAX_TIME) { finish(false); return; }
      }
      for (var p = 0; p < seals.length; p++) if (seals[p].pop > 0) seals[p].pop -= dt;
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    stoneBg();
    for (var i = 0; i < seals.length; i++) drawSeal(seals[i]);
    wantedBoard(wanted, true);

    // HUD: 残時間 + スコア + 進捗 + 残り松明(ミス許容)
    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 22, C.dark);
    game.draw.rect(60, 40, (W - 120) * frac, 22, frac < 0.25 ? C.band2 : C.band1);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 92, 42, C.white);
    txt(found + ' / ' + NEEDED, W * 0.16, 214, 46, C.band1);
    for (var t = 0; t < MISS_LIMIT; t++) {
      game.draw.circle(W * 0.86 - t * 56, 214, 18, t < (MISS_LIMIT - misses) ? C.band2 : C.dark);
    }

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.52, 96, C.white);
    if (feedback > 0 && !feedbackOk && NEEDED - found <= 3) txt('あと' + (NEEDED - found) + '個', W / 2, H * 0.30, 50, C.band2);

    scanlines();
  });

  game.onStart(function() {
    // 70s MONO: 矩形波の単音。無音の間が緊張を作る
    game.audio.melody(
      [['A3', 0.5], ['R', 0.5], ['C4', 0.5], ['R', 0.5], ['E4', 0.5], ['R', 0.5], ['C4', 1],
       ['G3', 0.5], ['R', 0.5], ['B3', 0.5], ['R', 1.5]],
      { tempo: 120, wave: 'square', volume: 0.08, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
