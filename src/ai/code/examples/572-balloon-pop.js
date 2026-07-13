// 572-balloon-pop.js
// バルーンポップ — お題と同じ紋章の宙玉だけを見分けてタップで割る。違う紋章はミス
// 操作: 上に示された紋章と同じ宙玉をタップ
// 成功: 制限時間内に 8 個割る  失敗: 時間切れ
// @mechanic: spot
// @theme: dungeon
// 世界観: 迷宮の魔術師見習いが、封印の紋章を読み、同じ紋章の宙玉だけを割って解呪する
// variation: 精度型(進むほど宙玉が小さく多くなる)
// spice: 黄金ターゲット(稀に光る宙玉=得点2倍が出る)
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO(琥珀フォスファ・単色)
  var C = {
    black: '#080400', amber: '#ffb000', amberDim: '#7a5400', amberLo: '#3a2800',
    white: '#fff2cc', red: '#ff5a2a', glow: '#ffe08a',
  };

  var GAME_TITLE = 'BALLOON POP';
  var MAX_TIME = 13;
  var NEEDED = 8;

  // 4種の紋章(6x6 ドット)
  var RUNES = [
    ['..AA..', '.A..A.', 'A....A', 'A....A', '.A..A.', '..AA..'], // 円
    ['A....A', '.A..A.', '..AA..', '..AA..', '.A..A.', 'A....A'], // ×
    ['AAAAAA', 'A....A', 'A.AA.A', 'A.AA.A', 'A....A', 'AAAAAA'], // 枠
    ['..AA..', '.AAAA.', 'AA..AA', 'AA..AA', '.AAAA.', '..AA..'], // 菱
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var orbs, target, spawnT, popped, timeLeft, done;
  var ready, hitStop, feedback, feedbackOk;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 6) game.draw.rect(0, sy, W, 2, '#000000', 0.28); }

  function dungeonBg() {
    game.draw.gradient(0, H, [[0, '#100a02'], [1, '#040200']]);
    // 石壁のグリッド
    for (var y = 100; y < H; y += 120) for (var x = 0; x < W; x += 140) game.draw.rect(x + 4, y + 4, 132, 112, C.amberLo, 0.35);
  }

  function runeColorFor(o) {
    if (o.gold) return C.white;
    return o.rune === target ? C.amber : C.amberDim;
  }
  function drawOrb(o) {
    var col = runeColorFor(o);
    game.draw.circle(o.x, o.y, o.r, col, o.gold && Math.floor(game.time.elapsed * 8) % 2 ? 0.5 : 0.28);
    game.draw.circle(o.x, o.y, o.r - 6, C.black, 0.5);
    // 紋章
    var pal = {}; pal.A = col;
    game.draw.sprite(RUNES[o.rune], pal, o.x, o.y, o.r / 4, { anchor: 'center' });
  }

  function spawnOrb() {
    var small = Math.min(30, popped * 4);
    orbs.push({
      x: 120 + game.random(0, W - 240), y: H + 80,
      r: 88 - small + game.random(-6, 6),
      rune: Math.floor(Math.random() * RUNES.length),
      vy: -(120 + popped * 12 + game.random(0, 60)),
      gold: Math.random() < 0.14,
    });
  }
  function initGame() {
    orbs = []; target = Math.floor(Math.random() * RUNES.length); spawnT = 0; popped = 0;
    timeLeft = MAX_TIME; done = false; ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false;
    for (var i = 0; i < 4; i++) spawnOrb();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = _score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }
  var _score = 0;

  function tapAt(x, y) {
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i];
      if (game.hit.circle(x, y, 10, o.x, o.y, o.r)) {
        if (o.rune === target) {
          popped++;
          var gain = o.gold ? 200 : 100; _score += gain;
          feedback = 0.3; feedbackOk = true;
          game.feedback.good(o.x, o.y, { text: o.gold ? 'GOLD +200' : '+100', color: o.gold ? C.white : C.amber });
          if (o.gold) game.audio.play('se_milestone');
          orbs.splice(i, 1);
          if (popped >= NEEDED) { finish(true); return; }
          spawnOrb();
        } else {
          feedback = 0.3; feedbackOk = false; hitStop = 0.3;
          game.feedback.bad(o.x, o.y, { text: 'WRONG' });
          target = Math.floor(Math.random() * RUNES.length); // 誤爆でお題が変わる
        }
        return;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; _score = 0; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    tapAt(x, y);
  });

  function targetBanner(cx, cy) {
    game.draw.rect(cx - 90, cy - 90, 180, 180, C.amberLo, 0.5);
    game.draw.rect(cx - 90, cy - 90, 180, 8, C.amber);
    var pal = { A: C.amber };
    game.draw.sprite(RUNES[target], pal, cx, cy, 22, { anchor: 'center' });
  }

  // ATTRACT ゴースト実演: 手がお題と同じ紋章の玉へ
  var d = { orbs: null, t: 0, target: 0, gx: W / 2, gy: H * 0.8, press: false };
  function stepDemo(dt) {
    if (!d.orbs) {
      d.orbs = [];
      for (var i = 0; i < 4; i++) d.orbs.push({ x: 180 + i * 230, y: H * 0.4 + Math.sin(i) * 120, r: 80, rune: i % RUNES.length, gold: false });
      d.target = 1;
    }
    d.t += dt;
    for (var j = 0; j < d.orbs.length; j++) d.orbs[j].y += Math.sin(d.t * 2 + j) * 20 * dt;
    var tgt = d.orbs[d.target];
    d.gx += (tgt.x - d.gx) * Math.min(1, dt * 3);
    d.gy += (tgt.y + 30 - d.gy) * Math.min(1, dt * 3);
    d.press = Math.hypot(d.gx - tgt.x, d.gy - tgt.y - 30) < 90;
    if (d.press && Math.floor(d.t * 2) % 2 === 0) {
      game.feedback.good(tgt.x, tgt.y, { text: '+100', color: C.amber });
      d.target = (d.target + 1) % d.orbs.length;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      dungeonBg(); stepDemo(dt);
      for (var i = 0; i < d.orbs.length; i++) {
        var o = d.orbs[i], col = o.rune === d.target % RUNES.length ? C.amber : C.amberDim;
        game.draw.circle(o.x, o.y, o.r, col, 0.28);
        game.draw.sprite(RUNES[o.rune], { A: col }, o.x, o.y, o.r / 4, { anchor: 'center' });
      }
      targetBanner(W / 2, H * 0.16);
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.62, 80, C.amber);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.68, 40, C.glow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.amber);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      dungeonBg();
      if (hitStop > 0) hitStop -= dt;
      targetBanner(W / 2, H * 0.24);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.48, 88, resultSuccess ? C.amber : C.red);
      txt('SCORE ' + String(_score).padStart(6, '0'), W / 2, H * 0.58, 56, C.white);
      var best = Math.max(game.best, _score);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.64, 42, C.amber);
      if (_score > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.71, 54, C.glow);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.75, 46, C.amber);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        for (var i = orbs.length - 1; i >= 0; i--) {
          orbs[i].y += orbs[i].vy * dt;
          orbs[i].x += Math.sin(game.time.elapsed * 2 + i) * 20 * dt;
          if (orbs[i].y < -100) { orbs.splice(i, 1); spawnOrb(); }
        }
        while (orbs.length < 5) spawnOrb();
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    dungeonBg();
    for (var k = 0; k < orbs.length; k++) drawOrb(orbs[k]);
    targetBanner(W / 2, 150);

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 260, (W - 120) * frac, 22, C.amber);
    game.draw.rect(60, 260, W - 120, 22, C.amberLo, 0.6);
    txt('SCORE ' + String(_score).padStart(6, '0'), W * 0.28, 150, 40, C.white, 'center');
    txt(popped + ' / ' + NEEDED, W * 0.72, 150, 44, C.amber, 'center');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 92, C.amber);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.5], ['Eb4', 0.5], ['G4', 0.5], ['Eb4', 0.5], ['Ab4', 0.5], ['G4', 0.5], ['C4', 1],
       ['Bb3', 0.5], ['D4', 0.5], ['F4', 0.5], ['Eb4', 0.5], ['C4', 1], ['G3', 1]],
      { tempo: 108, wave: 'triangle', volume: 0.09, loop: true,
        bass: [['C2', 1], ['C2', 1], ['Ab1', 1], ['Bb1', 1], ['F1', 1], ['G1', 1]], bassWave: 'square', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    _score = 0;
    initGame();
  });
})(game);
