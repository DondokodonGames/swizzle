// K-GBA-0010-jump-rope-landing.js
// 縄跳びランディング — 一定のリズムで跳び続け、縄が足元を通る瞬間だけジャンプを合わせる
// 操作: 縄が足元を通過する寸前だけジャンプが効く。それ以外のタップは無効で連打すると引っかかる
// 終わり: 10回すべて正しい瞬間に跳べば成功。連打/タイミングを外せば失敗
// @mechanic: cooldown_tap
// @theme: handheld_jump_rope_meet
// 世界観: 90年代ハンドヘルド風の運動会種目。回る縄が足元を通る瞬間だけジャンプが効く、我慢比べの縄跳び
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳べた回数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: くっきりした4〜5色、太い輪郭線、視認性の高い屋外背景
  var C = {
    bg: '#3ac0e0', bg2: '#1a90c0', ground: '#5ac860', groundDark: '#308038',
    rope: '#ffe000', ropeDark: '#a08000', good: '#3dff8a', bad: '#ff3d5a',
    gold: '#ffffff', white: '#08202c', ink: '#08202c',
  };

  var GAME_TITLE = 'JUMP LANDING';
  var TOTAL = 10;
  var CX = W * 0.5, GY = H * 0.62;
  var BEAT = 0.8;
  var WIN = 0.14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var jumped, done, endWait, finished, ready, hitStop, shake, jumpIdx, jumpStart, resolvedThis, cd, hop;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KID = ['.##.', '####', '.##.', '#..#'];
  var KID_UP = ['.##.', '####', '.##.', '.##.'];

  function beatDur(idx) { return Math.max(0.55, BEAT - Math.floor(idx / 5) * 0.06); }
  function jumpTime(i) {
    var t = 0.8;
    for (var k = 0; k < i; k++) t += beatDur(k);
    return t;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, GY + 40, W, H - GY - 40, C.groundDark);
    game.draw.rect(0, GY + 40, W, 10, C.ground);
  }

  function initGame() {
    jumped = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; jumpIdx = 0; jumpStart = jumpTime(0); resolvedThis = false; cd = beatDur(0); hop = 0;
  }

  function failJump(x, y) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successJump() {
    jumped++;
    hop = 1;
    hitStop = 0.08;
    game.feedback.good(CX, GY, { text: 'GOOD', color: C.good });
    game.fx.burst(CX, GY, { color: C.gold, count: 10, speed: 260 });
    game.audio.play('se_jump', 0.4);
    if (jumped === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, GY - 260, { color: C.gold, size: 40 });
    if (jumped >= TOTAL) { ok = true; finished = true; finish(); return; }
    jumpIdx++;
    cd = beatDur(jumpIdx);
    jumpStart = jumpStart + cd;
    resolvedThis = false;
  }

  function tryTap(x, y) {
    if (ready > 0 || done || finished) return;
    if (resolvedThis) { failJump(x, y); return; }
    var t = game.time.elapsed - jumpStart;
    resolvedThis = true;
    if (Math.abs(t) <= WIN) successJump();
    else failJump(x, y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(ropeP) {
    var ry = GY + Math.sin(ropeP * Math.PI * 2) * 60;
    var passSoon = false;
    if (!finished && !done && ready <= 0) {
      var t = jumpStart - game.time.elapsed;
      passSoon = t < cd * 0.35 && t > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    }
    game.draw.line(CX - 300, ry, CX + 300, ry, passSoon ? C.bad : C.ropeDark, 10);
    game.draw.line(CX - 300, ry, CX + 300, ry, passSoon ? C.gold : C.rope, 5);
    game.draw.sprite(hop > 0 ? KID_UP : KID, { '#': C.white }, CX, GY - (hop > 0 ? 50 : 0), 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, idx: 0, start: 0.8, cur: BEAT, rope: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.idx = 0; demo.start = 0.8; demo.pressedThis = false; demo.cur = BEAT; hop = 0; }
    demo.rope = (cyc / demo.cur) % 1;
    var tt = cyc - demo.start;
    if (tt > -0.06 && tt < 0.06 && !demo.pressedThis) {
      demo.pressedThis = true;
      demo.gx = CX; demo.gy = GY; demo.press = true;
      hop = 1;
      game.feedback.good(CX, GY, { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.25);
    } else if (tt < -0.1) {
      demo.press = false; hop = 0;
    }
    if (tt > demo.cur * 0.5) { demo.idx++; demo.start += demo.cur; demo.pressedThis = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(demo.rope);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, '#a06a00');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, '#a06a00');
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(jumped + ' / ' + TOTAL, W / 2, H * 0.13, 32, '#a06a00');
      if (!ok) txt('あと' + (TOTAL - jumped) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(jumped, { jumped: jumped, total: TOTAL });
        else game.end.failure({ jumped: jumped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (hop > 0) hop -= dt * 3;
      var t = game.time.elapsed - jumpStart;
      if (t > WIN && !resolvedThis) { resolvedThis = true; failJump(CX, GY); }
    }
    if (shake > 0) shake -= dt;

    bg();
    var ropeP = finished ? 0 : ((game.time.elapsed - (jumpStart - cd)) / cd);
    if (!finished) drawScene(ropeP);

    txt(jumped + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (jumped / TOTAL), 16, '#ffffff');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, '#a06a00');
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['G4', 0.2], ['B4', 0.2], ['D5', 0.4]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
