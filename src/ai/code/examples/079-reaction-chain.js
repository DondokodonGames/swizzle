// 079-reaction-chain.js
// リアクションチェーン — 画面に現れたアイコンをルールに従って素早く判断する
// 操作: 赤→タップ、青→スワイプ上、緑→スワイプ下、黄→なにもしない
// 成功: 12回正確に反応  失敗: 5回間違える or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    ui:      '#475569',
    correct: '#22c55e',
    wrong:   '#ef4444'
  };

  var ACTIONS = [
    { color: '#ef4444', name: '赤', action: 'tap', instruction: 'タップ！' },
    { color: '#3b82f6', name: '青', action: 'swipe_up', instruction: '↑スワイプ！' },
    { color: '#22c55e', name: '緑', action: 'swipe_down', instruction: '↓スワイプ！' },
    { color: '#eab308', name: '黄', action: 'nothing', instruction: '動くな！' }
  ];

  var currentAction = null;
  var phase = 'wait';  // 'show' | 'wait'
  var showTimer = 0;
  var SHOW_TIME = 1.1;
  var responded = false;
  var waitTimer = 0;

  var score = 0;
  var needed = 12;
  var wrongs = 0;
  var maxWrongs = 5;
  var timeLeft = 20;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var flashColor = '#fff';

  function nextChallenge() {
    currentAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    phase = 'show';
    showTimer = SHOW_TIME;
    responded = false;
    // For 'nothing' action, we need a timeout to check if player didn't act
    if (currentAction.action === 'nothing') {
      waitTimer = SHOW_TIME;
    }
  }

  function onCorrect() {
    score++;
    feedbackOk = true;
    feedback = 0.4;
    flashColor = C.correct;
    game.audio.play('se_tap', 0.8);
    if (score >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 8); }, 400);
    }
  }

  function onWrong() {
    wrongs++;
    feedbackOk = false;
    feedback = 0.4;
    flashColor = C.wrong;
    game.audio.play('se_failure', 0.6);
    if (wrongs >= maxWrongs && !done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 400);
    }
  }

  game.onTap(function(x, y) {
    if (done || responded || phase !== 'show') return;
    responded = true;
    if (currentAction.action === 'tap') onCorrect();
    else onWrong();
  });

  game.onSwipe(function(dir) {
    if (done || responded || phase !== 'show') return;
    responded = true;
    if (currentAction.action === 'swipe_up' && dir === 'up') onCorrect();
    else if (currentAction.action === 'swipe_down' && dir === 'down') onCorrect();
    else if (currentAction.action === 'nothing') onWrong();
    else onWrong();
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

    if (phase === 'show') {
      showTimer -= dt;
      if (currentAction.action === 'nothing' && !responded) {
        waitTimer -= dt;
        if (waitTimer <= 0) {
          // Time's up for 'nothing' — if they didn't respond, that's correct!
          responded = true;
          onCorrect();
        }
      }
      if (showTimer <= 0 && !responded) {
        // Didn't respond in time
        if (currentAction.action === 'nothing') {
          // Already handled above
        } else {
          onWrong();
        }
        responded = true;
      }
      if (showTimer <= -0.3 || responded) {
        phase = 'wait';
        setTimeout(nextChallenge, 400);
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (phase === 'show' && currentAction) {
      var ac = currentAction;
      var t = Math.max(0, showTimer / SHOW_TIME);
      var pulse = 0.7 + 0.3 * Math.sin(game.time.elapsed * 10);

      // Big color orb
      game.draw.circle(W / 2, H * 0.42, 200 + pulse * 20, ac.color, pulse * 0.15);
      game.draw.circle(W / 2, H * 0.42, 180, ac.color, 0.9);
      game.draw.circle(W / 2 - 50, H * 0.42 - 60, 60, '#fff', 0.25);

      // Action instruction
      game.draw.text(ac.name, W / 2, H * 0.42, { size: 100, color: '#fff', bold: true });
      game.draw.text(ac.instruction, W / 2, H * 0.65, { size: 72, color: ac.color, bold: true });

      // Timer ring (shrinking)
      var arcR = 240;
      game.draw.circle(W / 2, H * 0.42, arcR, '#fff', t * 0.2);
    } else if (phase === 'wait') {
      game.draw.text('?', W / 2, H * 0.42, { size: 100, color: '#334155', bold: true });
    }

    // Feedback flash
    if (feedback > 0) {
      if (feedbackOk) {
        game.draw.text('正解！', W / 2, H * 0.25, { size: 80, color: C.correct, bold: true });
      } else {
        game.draw.text('不正解！', W / 2, H * 0.25, { size: 80, color: C.wrong, bold: true });
      }
    }

    // Rules legend (small, at bottom)
    var rules = [
      { color: '#ef4444', text: '赤=タップ' },
      { color: '#3b82f6', text: '青=↑' },
      { color: '#22c55e', text: '緑=↓' },
      { color: '#eab308', text: '黄=待機' }
    ];
    for (var i = 0; i < rules.length; i++) {
      var rx = W / 2 + (i - 1.5) * 220;
      game.draw.circle(rx - 60, H * 0.82, 20, rules[i].color);
      game.draw.text(rules[i].text, rx, H * 0.82, { size: 32, color: '#64748b' });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#04080c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 72;
      game.draw.circle(sx, 128, 24, s < score ? C.correct : '#0a1428');
    }
    for (var w = 0; w < maxWrongs; w++) {
      var wx = W / 2 + (w - (maxWrongs - 1) / 2) * 56;
      game.draw.circle(wx, 200, 18, w < wrongs ? C.wrong : '#0a1428');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    setTimeout(nextChallenge, 600);
  });
})(game);
