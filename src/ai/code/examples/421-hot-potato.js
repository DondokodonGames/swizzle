// 421-hot-potato.js
// ホットポテト — 燃える松明が爆ぜる前に、次の芸人の方向へスワイプでパスし続ける
// 操作: 松明を持つ芸人から、次の芸人がいる方向へスワイプ
// 成功: 制限時間内に 6 回パス  失敗: 時間切れ
// @mechanic: swipe_direction
// @theme: circus
// 世界観: サーカスの火吹き芸人たちが、燃える松明を輪になって手早く回し受けする
// variation: 物量型(進むほど松明の加熱が速くなる)
// spice: フィーバータイム(2回パスすると数秒だけ得点2倍)
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP(サーカス)
  var C = {
    tent: '#4a1030', red: '#ff425f', gold: '#ffd23f', cream: '#fff2e0',
    flame: '#ff8a1e', teal: '#3fe0d0', purple: '#a24bff', dark: '#1a0614', pink: '#ff6fb5',
  };

  var GAME_TITLE = 'HOT POTATO';
  var MAX_TIME = 10;
  var NEEDED = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // 芸人3人: up(上) / left(左下) / right(右下)
  var people = [
    { key: 'up', x: W * 0.5, y: H * 0.26 },
    { key: 'left', x: W * 0.2, y: H * 0.62 },
    { key: 'right', x: W * 0.8, y: H * 0.62 },
  ];
  var holder, heat, torch, score, passes, timeLeft, done;
  var ready, fever, hitStop, feedback, feedbackOk;

  // 火吹き芸人スプライト(顔つき)
  var CLOWN = [
    '..RRRR..',
    '.RCCCCR.',
    'RCEWWECR',
    'RCWWWWCR',
    'RCWMMWCR',
    'RCCCCCCR',
    '.TTTTTT.',
    '.T.TT.T.',
  ];
  var CLOWN_COL = { R: C.red, C: C.cream, E: '#2a0a14', W: '#ffd9c0', M: C.red, T: C.teal };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.dark, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  function tentBg() {
    game.draw.gradient(0, H, [[0, '#6a1540'], [0.5, '#4a1030'], [1, '#240818']]);
    // テントのストライプ
    for (var i = 0; i < 12; i++) {
      game.draw.line(W / 2, 0, (i / 11) * W * 1.6 - W * 0.3, H, i % 2 ? C.red : C.gold, 3);
    }
    game.draw.circle(W / 2, 0, 60, C.gold, 0.5);
  }

  function drawTorch(x, y, hot) {
    game.draw.rect(x - 8, y, 16, 70, '#7a4a24');
    var f = 30 + Math.sin(game.time.elapsed * 20) * 8 + hot * 30;
    game.draw.circle(x, y - 10, f, C.flame, 0.9);
    game.draw.circle(x, y - 20, f * 0.6, C.gold, 1);
    if (hot > 0.6) game.draw.circle(x, y - 10, f + 12, C.red, 0.3 * hot);
  }

  function initGame() {
    holder = 0; heat = 0; torch = null; score = 0; passes = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; hitStop = 0; feedback = 0; feedbackOk = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.28); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function pass(dir) {
    if (torch) return;
    var from = people[holder], to = null, ti = -1;
    for (var i = 0; i < people.length; i++) if (people[i].key === dir && i !== holder) { to = people[i]; ti = i; }
    if (!to) { // 自分の位置へのスワイプ=空振り(軽ペナルティ)
      feedback = 0.3; feedbackOk = false; hitStop = 0.2;
      game.feedback.bad(from.x, from.y, { text: 'MISS' });
      return;
    }
    torch = { x: from.x, y: from.y, tx: to.x, ty: to.y, t: 0, to: ti };
    game.audio.play('se_jump');
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    pass(dir);
  });

  function completePass() {
    holder = torch.to; torch = null; heat = Math.max(0, heat - 0.5);
    passes++;
    var gain = fever > 0 ? 200 : 100; score += gain;
    feedback = 0.3; feedbackOk = true;
    game.feedback.good(people[holder].x, people[holder].y, { text: '+' + gain, color: C.teal });
    if (passes === 2) { fever = 3.5; game.audio.play('se_milestone'); }
    if (passes >= NEEDED) finish(true);
  }

  // ATTRACT ゴースト実演: 松明が芸人間を回る + 手のフリック
  var d = { holder: 0, torch: null, t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    d.t += dt;
    if (!d.torch) {
      if (d.t > 0.6) {
        var from = people[d.holder], next = (d.holder + 1) % 3;
        d.torch = { x: from.x, y: from.y, tx: people[next].x, ty: people[next].y, t: 0, to: next };
        d.t = 0; d.press = true;
      } else d.press = false;
      d.gx = people[d.holder].x + 60; d.gy = people[d.holder].y + 40;
    } else {
      d.torch.t += dt * 1.6;
      d.torch.x = d.torch.x + (d.torch.tx - d.torch.x) * Math.min(1, dt * 6);
      d.torch.y = d.torch.y + (d.torch.ty - d.torch.y) * Math.min(1, dt * 6);
      d.gx = d.torch.x; d.gy = d.torch.y + 30;
      if (Math.hypot(d.torch.x - d.torch.tx, d.torch.y - d.torch.ty) < 30) {
        game.feedback.good(d.torch.tx, d.torch.ty, { text: '+100', color: C.teal });
        d.holder = d.torch.to; d.torch = null; d.t = 0;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      tentBg(); stepDemo(dt);
      for (var i = 0; i < people.length; i++) game.draw.sprite(CLOWN, CLOWN_COL, people[i].x, people[i].y, 12, { anchor: 'center' });
      var tx = d.torch ? d.torch.x : people[d.holder].x, ty = d.torch ? d.torch.y : people[d.holder].y - 90;
      drawTorch(tx, ty, 0.3);
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.44, 84, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.pink);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.cream);
      }
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.5, 40, C.teal);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      tentBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(CLOWN, CLOWN_COL, W / 2, H * 0.34, 20, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.54, 90, resultSuccess ? C.teal : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.63, 56, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.69, 42, C.gold);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.76, 54, C.pink);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.8, 46, C.teal);
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
        if (fever > 0) fever -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        if (!torch) {
          heat += dt * (0.28 + passes * 0.03); // 物量型: 加熱が速く
          if (heat >= 1) { // 持ちすぎて爆発
            game.feedback.bad(people[holder].x, people[holder].y, { text: 'BURN' });
            heat = 0.4; hitStop = 0.35;
          }
        } else {
          torch.x += (torch.tx - torch.x) * Math.min(1, dt * 9);
          torch.y += (torch.ty - torch.y) * Math.min(1, dt * 9);
          if (Math.hypot(torch.x - torch.tx, torch.y - torch.ty) < 24) completePass();
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    tentBg();
    for (var p = 0; p < people.length; p++) {
      var hot = (p === holder && !torch) ? heat : 0;
      if (hot > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(people[p].x, people[p].y, 110, C.red, 0.2);
      game.draw.sprite(CLOWN, CLOWN_COL, people[p].x, people[p].y, 12, { anchor: 'center' });
    }
    var htx = torch ? torch.x : people[holder].x, hty = torch ? torch.y : people[holder].y - 90;
    drawTorch(htx, hty, torch ? 0.3 : heat);

    // HUD
    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.purple : C.teal);
    game.draw.rect(60, 40, W - 120, 26, C.tent, 0.6);
    // 加熱ゲージ(telegraph)
    game.draw.rect(W / 2 - 200, 96, 400 * Math.min(1, heat), 22, heat > 0.6 ? C.red : C.flame);
    game.draw.rect(W / 2 - 200, 96, 400, 22, C.tent, 0.6);
    txt(passes + ' / ' + NEEDED, W / 2, 168, 46, C.teal);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.4, 52, C.purple);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 92, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['G4', 0.5], ['E5', 0.5], ['D5', 1],
       ['A4', 0.5], ['C5', 0.5], ['F5', 0.5], ['E5', 0.5], ['C5', 1], ['G4', 1]],
      { tempo: 160, wave: 'square', volume: 0.08, loop: true,
        bass: [['C3', 1], ['G2', 1], ['C3', 1], ['A2', 1], ['F2', 1], ['G2', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
