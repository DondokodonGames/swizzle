// GH-PS-0038-sugoroku-dash.js
// スゴロクダッシュ — サイコロを振って進む。止まったマスの指示で戻る・休む・進む
// 操作: 回る数字が欲しい目に来た瞬間にタップして止める
// 終わり: 5回の手番以内にゴールすれば成功。届かなければ失敗
// @mechanic: counting
// @theme: board_race
// 世界観: 10マスの道。回る数字を止めて進む。矢印マスに止まると前後にずれる。5手番でゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 使った手番数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s ARCADE POP: 原色 + 白縁。明るい背景、光の柱と祝祭演出
  var C = {
    bg1: '#ffe066', bg2: '#ff9a3a', path: '#ffffff', pathLine: '#4a3a8a',
    trap: '#ff4d5e', bonus: '#4dcf8a', neutral: '#8a7ac8', gold: '#ffd400', white: '#ffffff', ink: '#241a4a', bad: '#ff4d5e', good: '#4dcf8a',
  };

  var GAME_TITLE = 'SUGOROKU DASH';
  var SQUARES = 10, MAX_ROLLS = 5;
  var SPECIAL = {}; // idx -> +2 / -2

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, rolls = 0, pos = 0;

  var dieVal, spinning, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PATH_X0 = W * 0.5 - 400, PATH_Y = H * 0.30, STEP = 90;
  var ARROW_UP = ['..#..', '.###.', '#####', '..#..', '..#..'];
  var ARROW_DOWN = ['..#..', '..#..', '#####', '.###.', '..#..'];

  function squarePos(i) {
    var row = Math.floor(i / 5), col = i % 5;
    var x = PATH_X0 + (row % 2 === 0 ? col : 4 - col) * STEP * 2;
    var y = PATH_Y + row * (H * 0.16);
    return { x: x, y: y };
  }

  function boardBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, C.bg2], [1, '#e8703a']]);
    // 光の柱(横に流れる、ATTRACT差分検出のためにも使う)
    var pillarX = (game.time.elapsed * 340) % (W + 300) - 150;
    game.draw.rect(pillarX, 0, 220, H, '#ffffff', 0.16);
    for (var i = 0; i < 6; i++) game.draw.rect(i * 190 + 10, 0, 40, H, '#ffffff', 0.06);
    for (var s = 0; s < SQUARES; s++) {
      var p = squarePos(s);
      var col = SPECIAL[s] === 1 ? C.bonus : SPECIAL[s] === -1 ? C.trap : C.path;
      game.draw.circle(p.x, p.y, 60, C.ink);
      game.draw.circle(p.x, p.y, 52, col);
      if (SPECIAL[s] === 1) game.draw.sprite(ARROW_UP, { '#': C.ink }, p.x, p.y, 8, { anchor: 'center' });
      if (SPECIAL[s] === -1) game.draw.sprite(ARROW_DOWN, { '#': C.ink }, p.x, p.y, 8, { anchor: 'center' });
      if (s === SQUARES - 1) txt('GOAL', p.x, p.y + 84, 24, C.ink);
    }
  }

  function drawToken() {
    var p = squarePos(Math.min(SQUARES - 1, pos));
    game.draw.circle(p.x, p.y - 70, 30, C.gold);
    game.draw.circle(p.x, p.y - 70, 30, C.ink, 0.0);
  }

  function initGame() {
    pos = 0; rolls = 0; done = false; endWait = 0; finished = false; spinning = true; dieVal = 1;
    SPECIAL = {};
    var idxs = [2, 4, 6, 7];
    for (var i = idxs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t; }
    SPECIAL[idxs[0]] = 1; SPECIAL[idxs[1]] = 1; SPECIAL[idxs[2]] = -1; SPECIAL[idxs[3]] = -1;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function stopDie() {
    if (done || ready > 0 || finished || !spinning) return;
    spinning = false;
    hitStop = 0.1;
    game.audio.play('se_tap', 0.2);
    var move = dieVal;
    pos = Math.min(SQUARES - 1, pos + move);
    rolls++;
    game.feedback.good(squarePos(pos).x, squarePos(pos).y, { text: '+' + move, color: C.gold });
    var sp = SPECIAL[pos];
    if (sp === 1) { pos = Math.min(SQUARES - 1, pos + 2); game.feedback.good(squarePos(pos).x, squarePos(pos).y, { text: 'BONUS', color: C.good }); game.fx.burst(squarePos(pos).x, squarePos(pos).y, { color: C.good, count: 12, speed: 320 }); game.audio.play('se_success', 0.3); }
    else if (sp === -1) { pos = Math.max(0, pos - 2); game.feedback.bad(squarePos(pos).x, squarePos(pos).y, { text: 'BACK' }); shake = 0.1; game.audio.play('se_bad', 0.3); }
    if (pos >= SQUARES - 1) { ok = true; finished = true; game.fx.burst(squarePos(SQUARES - 1).x, squarePos(SQUARES - 1).y, { color: C.gold, count: 20, speed: 400 }); finish(); }
    else if (rolls >= MAX_ROLLS) { ok = false; finished = true; finish(); }
    else { spinning = true; game.fx.popup(rolls + ' / ' + MAX_ROLLS, W / 2, H * 0.90, { color: C.gold, size: 40 }); }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    stopDie();
  });

  var DIE_X = W * 0.5, DIE_Y = H * 0.86;
  function drawDie() {
    game.draw.circle(DIE_X, DIE_Y, 76, C.ink);
    game.draw.circle(DIE_X, DIE_Y, 68, C.white);
    txt(String(dieVal), DIE_X, DIE_Y + 20, 58, C.ink);
  }

  // ── ATTRACT ゴースト実演: 欲しい目で止める ──
  var demo = { t: 0, gx: DIE_X, gy: DIE_Y - 100, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (pos === undefined) initGame();
    dieVal = 1 + Math.floor((demo.t * 12) % 6);
    var cyc = demo.t % 1.3;
    demo.press = cyc > 1.05 && cyc < 1.2;
    if (demo.press && cyc > 1.05 && cyc < 1.08) { game.feedback.good(DIE_X, DIE_Y - 100, { text: '+' + dieVal, color: C.gold }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pos === undefined) initGame();
      boardBg();
      stepDemo(dt);
      drawToken();
      drawDie();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 48, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.135, 26, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.16, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.16, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawToken();
      drawDie();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 52, ok ? C.good : C.bad);
      txt(rolls + ' / ' + MAX_ROLLS, W / 2, H * 0.16, 32, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ rolls: rolls });
        else game.end.failure({ rolls: rolls });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (spinning) {
      dieVal = 1 + Math.floor((game.time.elapsed * 12) % 6);
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawToken();
    drawDie();

    txt(rolls + ' / ' + MAX_ROLLS, W / 2, H * 0.10, 36, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 62, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
