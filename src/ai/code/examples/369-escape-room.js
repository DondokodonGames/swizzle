// 369-escape-room.js
// 脱出ゲーム — 4桁コードを解読して扉を開ける
// 操作: タップで数字を選んで順番に入力
// 成功: 3部屋脱出  失敗: 5回間違える or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a14',
    door:   '#1e293b',
    doorHi: '#334155',
    panel:  '#1e1b4b',
    panelHi:'#312e81',
    btn:    '#3730a3',
    btnHi:  '#4f46e5',
    correct:'#22c55e',
    wrong:  '#ef4444',
    hint:   '#fbbf24',
    hintHi: '#fef3c7',
    digit:  '#a5f3fc',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var ROOMS = 3;
  var room = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var mistakes = 0;
  var MAX_MISTAKES = 5;

  var code = [];          // 4-digit secret code
  var input = [];         // player's current input
  var clues = [];         // Mastermind-style clue history [{guess, blacks, whites}]
  var particles = [];
  var shakeAnim = 0;
  var successAnim = 0;
  var doorOpenAnim = 0;

  function generateCode() {
    code = [];
    var digits = [0,1,2,3,4,5,6,7,8,9];
    for (var i = digits.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = digits[i]; digits[i] = digits[j]; digits[j] = tmp;
    }
    code = digits.slice(0, 4);
    clues = [];
    input = [];
  }

  function checkGuess(guess) {
    var blacks = 0, whites = 0;
    var codeCopy = code.slice();
    var guessCopy = guess.slice();
    // Exact matches
    for (var i = 0; i < 4; i++) {
      if (guessCopy[i] === codeCopy[i]) { blacks++; codeCopy[i] = -1; guessCopy[i] = -2; }
    }
    // Color matches
    for (var i2 = 0; i2 < 4; i2++) {
      if (guessCopy[i2] === -2) continue;
      var idx = codeCopy.indexOf(guessCopy[i2]);
      if (idx >= 0) { whites++; codeCopy[idx] = -1; }
    }
    return { blacks: blacks, whites: whites };
  }

  // Number pad layout: 1-9 then 0
  var padNums = [1,2,3,4,5,6,7,8,9,0];
  var padCols = 3;
  var padW = 200, padH = 160;
  var padStartX = W / 2 - padCols * padW / 2;
  var padStartY = H * 0.62;

  game.onTap(function(tx, ty) {
    if (done || doorOpenAnim > 0) return;

    // Check pad taps
    for (var i = 0; i < 10; i++) {
      var col = i % padCols;
      var row = Math.floor(i / padCols);
      var px = padStartX + col * padW;
      var py = padStartY + row * padH;
      if (tx >= px && tx < px + padW && ty >= py && ty < py + padH) {
        if (input.length < 4) {
          input.push(padNums[i]);
          game.audio.play('se_tap', 0.3);
          if (input.length === 4) {
            // Submit guess
            setTimeout(function() {
              var result = checkGuess(input);
              clues.push({ guess: input.slice(), blacks: result.blacks, whites: result.whites });
              if (result.blacks === 4) {
                // Correct!
                successAnim = 1.0;
                doorOpenAnim = 1.5;
                game.audio.play('se_success', 0.7);
                for (var pi = 0; pi < 15; pi++) {
                  var ang = Math.random() * Math.PI * 2;
                  particles.push({ x: W/2, y: H*0.4, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250-80, life:0.8, col: C.correct });
                }
                setTimeout(function() {
                  room++;
                  if (room >= ROOMS && !done) {
                    done = true;
                    game.end.success(room * 800 + Math.ceil(timeLeft) * 50 - mistakes * 80);
                  } else if (!done) {
                    generateCode();
                    doorOpenAnim = 0;
                    successAnim = 0;
                  }
                }, 1600);
              } else {
                mistakes++;
                shakeAnim = 0.4;
                game.audio.play('se_failure', 0.3);
                input = [];
                if (mistakes >= MAX_MISTAKES && !done) {
                  done = true;
                  setTimeout(function() { game.end.failure(); }, 500);
                }
              }
            }, 100);
          }
        }
        return;
      }
    }

    // Delete last digit
    if (input.length > 0 && tx < W * 0.3 && ty > padStartY + 3 * padH) {
      input.pop();
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (shakeAnim > 0) shakeAnim -= dt * 3;
    if (successAnim > 0) successAnim -= dt;
    if (doorOpenAnim > 0) doorOpenAnim -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Door
    var doorW = 480, doorH = 540;
    var doorX = W / 2 - doorW / 2;
    var doorY = H * 0.16;
    var openOff = doorOpenAnim > 0 ? (1 - doorOpenAnim) * doorW * 0.5 : 0;
    var shakeOff = shakeAnim > 0 ? Math.sin(elapsed * 40) * 14 * shakeAnim : 0;
    game.draw.rect(doorX + shakeOff - openOff, doorY, doorW - openOff * 2, doorH, C.door, 0.95);
    game.draw.rect(doorX + shakeOff - openOff + 10, doorY + 10, doorW - openOff * 2 - 20, doorH - 20, C.doorHi, 0.3);
    // Keyhole
    if (doorOpenAnim <= 0) {
      game.draw.circle(W / 2 + shakeOff, doorY + doorH * 0.6, 28, '#0f172a', 0.9);
      game.draw.rect(W / 2 - 10 + shakeOff, doorY + doorH * 0.6, 20, 40, '#0f172a', 0.9);
    }

    // Room number
    game.draw.text('部屋 ' + (room + 1) + ' / ' + ROOMS, W / 2, doorY - 40, { size: 40, color: C.ui });

    // Input display
    var inputY = H * 0.54;
    for (var i = 0; i < 4; i++) {
      var ix = W / 2 - 180 + i * 120;
      game.draw.rect(ix - 44, inputY - 44, 88, 88, C.panel, 0.9);
      if (i < input.length) {
        game.draw.text(input[i] + '', ix, inputY + 12, { size: 52, color: C.digit, bold: true });
      } else {
        game.draw.text('_', ix, inputY + 12, { size: 52, color: C.ui });
      }
    }

    // Clue history (last 4)
    var histStart = Math.max(0, clues.length - 4);
    for (var ci = histStart; ci < clues.length; ci++) {
      var cl = clues[ci];
      var hy = inputY + 120 + (ci - histStart) * 70;
      // Guess digits
      for (var gi = 0; gi < 4; gi++) {
        game.draw.text(cl.guess[gi] + '', W / 2 - 160 + gi * 90, hy, { size: 36, color: C.ui });
      }
      // Blacks (correct pos)
      for (var bi = 0; bi < cl.blacks; bi++) {
        game.draw.circle(W / 2 + 130 + bi * 36, hy - 8, 12, C.correct, 0.9);
      }
      // Whites (correct digit wrong pos)
      for (var wi = 0; wi < cl.whites; wi++) {
        game.draw.circle(W / 2 + 130 + (cl.blacks + wi) * 36, hy - 8, 12, C.hint, 0.9);
      }
    }

    // Number pad
    for (var pi2 = 0; pi2 < 10; pi2++) {
      var col = pi2 % padCols;
      var row = Math.floor(pi2 / padCols);
      var px = padStartX + col * padW;
      var py = padStartY + row * padH;
      game.draw.rect(px + 8, py + 8, padW - 16, padH - 16, C.btn, 0.85);
      game.draw.text(padNums[pi2] + '', px + padW / 2, py + padH / 2 + 16, { size: 56, color: '#fff', bold: true });
    }

    // Hint label
    game.draw.text('黒=位置◎  黄=数字○', W / 2, padStartY - 30, { size: 30, color: C.ui });

    // Mistakes
    for (var mi = 0; mi < MAX_MISTAKES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISTAKES - 1) * 28 + mi * 56, H * 0.935, 14, mi < mistakes ? C.wrong : '#0f0f20', 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.panelHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateCode();
  });
})(game);
