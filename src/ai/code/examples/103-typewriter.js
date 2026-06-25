// 103-typewriter.js
// タイプライター — 表示される文字をスワイプ方向で正確に入力するキーパッドゲーム
// 操作: 4方向スワイプで文字セットを選択してタップで確定
// 成功: 8文字正確に入力  失敗: 3回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#070608',
    key:     '#1a1820',
    keyHi:   '#2d2a38',
    active:  '#6d28d9',
    activeHi:'#8b5cf6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    letter:  '#e2e8f0',
    ui:      '#475569'
  };

  // 4 panels, each with 3 characters (12 total options)
  // Panel accessed by swipe direction, letter selected by position (tap area)
  var PANELS = {
    up:    { chars: ['A', 'E', 'I'], label: '↑' },
    right: { chars: ['O', 'U', 'T'], label: '→' },
    down:  { chars: ['N', 'S', 'R'], label: '↓' },
    left:  { chars: ['L', 'H', 'M'], label: '←' }
  };

  var WORDS = ['STONE','LIGHT','FLAME','CLOUD','BLAST','TOWER','STORM','ARROW',
               'ROUTE','LUNAR','HEART','SOLAR'];

  var currentWord = '';
  var targetIdx = 0;
  var activePanel = null;
  var typed = [];
  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var usedWords = {};

  function pickWord() {
    var available = WORDS.filter(function(w) { return !usedWords[w]; });
    if (available.length === 0) { usedWords = {}; available = WORDS.slice(); }
    var word = available[Math.floor(Math.random() * available.length)];
    usedWords[word] = true;
    return word;
  }

  function nextWord() {
    currentWord = pickWord();
    targetIdx = 0;
    typed = [];
    activePanel = null;
  }

  function getTargetChar() {
    return currentWord[targetIdx] || '';
  }

  function findCharPanel(ch) {
    for (var dir in PANELS) {
      var p = PANELS[dir];
      for (var i = 0; i < p.chars.length; i++) {
        if (p.chars[i] === ch) return { dir: dir, pos: i };
      }
    }
    return null;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (PANELS[dir]) {
      activePanel = dir;
      game.audio.play('se_tap', 0.3);
    }
  });

  // Panel layout: center = 3 big tap zones
  var PANEL_Y = H * 0.48;
  var SLOT_W = W / 3;
  var SLOT_H = 180;

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!activePanel) return;
    // Determine which slot was tapped (left/center/right)
    var slot = -1;
    if (ty > PANEL_Y - SLOT_H / 2 && ty < PANEL_Y + SLOT_H / 2) {
      if (tx < SLOT_W) slot = 0;
      else if (tx < SLOT_W * 2) slot = 1;
      else slot = 2;
    }
    if (slot < 0) { activePanel = null; return; }

    var ch = PANELS[activePanel].chars[slot];
    var target = getTargetChar();

    if (ch === target) {
      typed.push(ch);
      targetIdx++;
      feedbackOk = true;
      feedback = 0.2;
      game.audio.play('se_tap', 0.8);
      activePanel = null;

      if (targetIdx >= currentWord.length) {
        // Word complete
        score++;
        game.audio.play('se_success');
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 50 + Math.ceil(timeLeft) * 10); }, 400);
          return;
        }
        setTimeout(nextWord, 400);
      }
    } else {
      // Wrong letter
      misses++;
      feedbackOk = false;
      feedback = 0.4;
      activePanel = null;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target word display
    var wordY = H * 0.25;
    for (var ci = 0; ci < currentWord.length; ci++) {
      var cx = W / 2 + (ci - (currentWord.length - 1) / 2) * 100;
      var isTyped = ci < targetIdx;
      var isNext = ci === targetIdx;
      game.draw.rect(cx - 40, wordY - 52, 80, 80, isTyped ? '#0f2d18' : (isNext ? '#2d1f3d' : '#0a0a12'));
      game.draw.text(currentWord[ci], cx, wordY, {
        size: 72,
        color: isTyped ? '#22c55e' : (isNext ? '#a78bfa' : '#334155'),
        bold: true
      });
      if (isNext) {
        var pulse = 0.5 + 0.5 * Math.abs(Math.sin(game.time.elapsed * 4));
        game.draw.rect(cx - 40, wordY - 52, 80, 80, '#8b5cf6', pulse * 0.2);
      }
    }

    // Next char hint
    var nextChar = getTargetChar();
    if (nextChar) {
      var loc = findCharPanel(nextChar);
      if (loc) {
        game.draw.text('→ ' + PANELS[loc.dir].label + ' スワイプして「' + nextChar + '」を選べ', W / 2, H * 0.35, {
          size: 36, color: '#6d28d9'
        });
      }
    }

    // Keyboard panel (center area)
    var dirs = ['up', 'right', 'down', 'left'];
    var dirX = [W / 2, W * 0.85, W / 2, W * 0.15];
    var dirY = [H * 0.42, H * 0.5, H * 0.58, H * 0.5];

    for (var di = 0; di < dirs.length; di++) {
      var dir2 = dirs[di];
      var panel = PANELS[dir2];
      var isActive = activePanel === dir2;
      var px = dirX[di], py = dirY[di];
      var pColor = isActive ? C.active : C.key;
      game.draw.circle(px, py, isActive ? 60 : 48, pColor);
      game.draw.text(panel.label, px, py - 8, { size: 36, color: isActive ? '#fff' : '#4a4560' });
      game.draw.text(panel.chars.join(''), px, py + 24, { size: 24, color: isActive ? C.activeHi : '#4a4560' });
    }

    // If panel active, show 3 slots
    if (activePanel) {
      var ap = PANELS[activePanel];
      for (var si = 0; si < 3; si++) {
        var slotX = SLOT_W * si + SLOT_W / 2;
        game.draw.rect(SLOT_W * si + 8, PANEL_Y - SLOT_H / 2, SLOT_W - 16, SLOT_H, C.keyHi);
        game.draw.rect(SLOT_W * si + 8, PANEL_Y - SLOT_H / 2, SLOT_W - 16, 6, C.activeHi, 0.5);
        game.draw.text(ap.chars[si], slotX, PANEL_Y, {
          size: 96, color: ap.chars[si] === nextChar ? C.active : C.letter, bold: true
        });
      }
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '✓' : '✗', W * 0.9, H * 0.25, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 72;
      game.draw.circle(sx, 140, 22, s < score ? C.correct : '#0a0a12');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx2 = W / 2 + (m - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx2, 204, 18, m < misses ? C.wrong : '#0a0a12');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, '#070608');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide bottom
    game.draw.text('スワイプでパネル選択 → タップで文字', W / 2, H * 0.91, { size: 36, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    nextWord();
  });
})(game);
