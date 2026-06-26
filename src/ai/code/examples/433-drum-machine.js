// 433-drum-machine.js
// ドラムマシン — 4ビートパターンを暗記して再現する
// 操作: 4つのドラムパッドをタップ（上=ハイハット、中L=スネア、中R=キック、下=クラッシュ）
// 成功: 5パターン完璧再現  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#080408',
    pad0:   '#fbbf24',
    pad0Hi: '#fde68a',
    pad1:   '#a855f7',
    pad1Hi: '#d8b4fe',
    pad2:   '#ef4444',
    pad2Hi: '#fca5a5',
    pad3:   '#3b82f6',
    pad3Hi: '#93c5fd',
    beat:   '#22c55e',
    empty:  '#1e293b',
    active: '#fff',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var PADS = [
    { name: 'ハイハット', col: C.pad0, hi: C.pad0Hi, x: W*0.25, y: H*0.62 },
    { name: 'スネア',    col: C.pad1, hi: C.pad1Hi, x: W*0.75, y: H*0.62 },
    { name: 'キック',    col: C.pad2, hi: C.pad2Hi, x: W*0.25, y: H*0.76 },
    { name: 'クラッシュ', col: C.pad3, hi: C.pad3Hi, x: W*0.75, y: H*0.76 }
  ];
  var PAD_R = 140;

  var BEATS = 8;  // 8 steps per pattern
  var patterns = [];
  var currentPattern = [];
  var playerInput = [];
  var phase = 'demo';  // demo, play, result
  var demoStep = 0;
  var demoTimer = 0;
  var DEMO_BEAT = 0.35;  // seconds per beat
  var playStep = 0;
  var patternIdx = 0;

  var solved = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var padFlash = [-1, -1, -1, -1];  // flash timer per pad

  function generatePattern() {
    var p = [];
    for (var i = 0; i < BEATS; i++) {
      p.push(Math.floor(Math.random() * 4));  // 0-3 = which pad
    }
    return p;
  }

  function startDemo() {
    currentPattern = generatePattern();
    demoStep = 0;
    demoTimer = DEMO_BEAT;
    phase = 'demo';
    playerInput = [];
    playStep = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'play') return;

    // Which pad was tapped?
    var hitPad = -1;
    for (var pi = 0; pi < PADS.length; pi++) {
      var dx = tx - PADS[pi].x;
      var dy = ty - PADS[pi].y;
      if (Math.sqrt(dx*dx + dy*dy) < PAD_R) { hitPad = pi; break; }
    }
    if (hitPad < 0) return;

    padFlash[hitPad] = 0.3;
    game.audio.play('se_tap', 0.4);

    var expected = currentPattern[playStep];
    if (hitPad === expected) {
      playerInput.push(hitPad);
      playStep++;

      if (playStep >= BEATS) {
        // Completed pattern!
        solved++;
        flashCol = C.correct;
        flashAnim = 0.9;
        game.audio.play('se_success', 0.7);
        if (solved >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(solved * 800 + Math.ceil(timeLeft) * 80); }, 800);
          return;
        }
        phase = 'result';
        setTimeout(function() { startDemo(); }, 1200);
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.7;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
      // Reset this pattern attempt
      playStep = 0;
      playerInput = [];
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;
    for (var pi2 = 0; pi2 < 4; pi2++) {
      if (padFlash[pi2] > 0) padFlash[pi2] -= dt * 4;
    }

    if (phase === 'demo') {
      demoTimer -= dt;
      if (demoTimer <= 0) {
        if (demoStep < BEATS) {
          var pad = currentPattern[demoStep];
          padFlash[pad] = 0.4;
          game.audio.play('se_tap', 0.3);
          demoStep++;
          demoTimer = DEMO_BEAT;
        } else {
          // Demo done — player's turn
          phase = 'play';
          playStep = 0;
          playerInput = [];
          demoTimer = 0;
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Pattern display (top area)
    var seqX = 60;
    var seqY = H * 0.15;
    var stepW = (W - 120) / BEATS;
    for (var si = 0; si < BEATS; si++) {
      var stepX = seqX + si * stepW + stepW/2;
      var isCurrent = (phase === 'demo' && si === demoStep - 1) ||
                      (phase === 'play' && si < playStep);
      var beatPad = currentPattern[si];
      var col = isCurrent ? PADS[beatPad].hi : PADS[beatPad].col;
      var alpha = phase === 'demo' && si < demoStep ? 0.9 :
                  phase === 'play' && si < playStep ? 0.7 : 0.25;
      game.draw.circle(stepX, seqY + 30, stepW*0.38, col, alpha);
      // Beat marker below
      var beatLine = phase === 'demo' && si === demoStep - 1;
      if (beatLine) game.draw.circle(stepX, seqY + 70, 8, '#fff', 0.9);
      else game.draw.circle(stepX, seqY + 70, 6, C.ui, 0.5);
    }

    // Progress arrow
    if (phase === 'play') {
      var arrowX = seqX + playStep * stepW + stepW/2;
      game.draw.circle(arrowX, seqY + 105, 12, C.beat, 0.9);
    }

    // Phase label
    var phaseText = phase === 'demo' ? '覚えて！' : phase === 'play' ? '再現して！' : '完璧！';
    var phaseCol = phase === 'demo' ? C.pad0Hi : phase === 'play' ? C.beat : C.correct;
    game.draw.text(phaseText, W/2, H*0.28, { size: 52, color: phaseCol, bold: true });

    // Pads
    for (var pi3 = 0; pi3 < PADS.length; pi3++) {
      var pad = PADS[pi3];
      var flash = Math.max(0, padFlash[pi3]);
      var alpha2 = 0.6 + flash * 0.4;
      game.draw.circle(pad.x, pad.y, PAD_R + 16, pad.col, flash * 0.3);
      game.draw.circle(pad.x, pad.y, PAD_R, pad.col, alpha2);
      game.draw.circle(pad.x - PAD_R*0.28, pad.y - PAD_R*0.28, PAD_R*0.25, '#fff', 0.2 + flash*0.3);
      game.draw.text(pad.name, pad.x, pad.y + 20, { size: 36, color: flash > 0.1 ? '#fff' : pad.hi, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(solved + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beat : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    startDemo();
  });
})(game);
