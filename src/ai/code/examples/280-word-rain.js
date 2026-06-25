// 280-word-rain.js
// ワードレイン — 降ってくる文字を素早くタップして単語を完成させる
// 操作: タップで文字を選択（表示される単語の順番通りに）
// 成功: 10単語完成  失敗: 5回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02040a',
    letter: '#1e3a5f',
    letHi:  '#3b82f6',
    active: '#22c55e',
    actHi:  '#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    word:   '#fde68a',
    wordHi: '#fef3c7',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var WORDS = ['CAT','DOG','SUN','RUN','FLY','WIN','ICE','SKY','RED','ZAP','ACE','BIG','CUP','DIM','EGG'];
  var currentWord = null;
  var currentIdx = 0;
  var letters = [];
  var completed = 0;
  var NEEDED = 10;
  var mistakes = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  function nextWord() {
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    currentIdx = 0;
  }

  function spawnLetter() {
    // Needed letter + decoy letters
    var needed = currentWord ? currentWord[currentIdx] : null;
    // Spawn the needed letter with 50% chance, else a random letter
    var isNeeded = needed && Math.random() < 0.5;
    var letter = isNeeded ? needed : String.fromCharCode(65 + Math.floor(Math.random() * 26));
    letters.push({
      x: 80 + Math.random() * (W - 160),
      y: H * 0.16,
      vy: 80 + Math.random() * 60,
      letter: letter,
      needed: isNeeded && letter === needed,
      r: 46,
      flash: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = letters.length - 1; i >= 0; i--) {
      var l = letters[i];
      var dx = tx - l.x, dy = ty - l.y;
      if (dx * dx + dy * dy < (l.r + 10) * (l.r + 10)) {
        if (!currentWord) break;
        var needed = currentWord[currentIdx];
        if (l.letter === needed) {
          // Correct
          currentIdx++;
          l.flash = 0.4;
          for (var pi = 0; pi < 5; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: l.x, y: l.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.actHi });
          }
          if (currentIdx >= currentWord.length) {
            completed++;
            feedback = currentWord + ' 完成！';
            feedbackCol = C.actHi;
            feedbackTimer = 0.7;
            game.audio.play('se_success', 0.6);
            letters = [];
            nextWord();
            if (completed >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(completed * 200 + Math.ceil(timeLeft) * 80); }, 400);
            }
          } else {
            game.audio.play('se_tap', 0.3);
          }
        } else {
          mistakes++;
          l.flash = -0.4;
          feedback = 'ミス！ (' + mistakes + '/' + MAX_MISS + ')';
          feedbackCol = C.wrong;
          feedbackTimer = 0.5;
          game.audio.play('se_failure', 0.4);
          if (mistakes >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done && letters.length < 10) {
      spawnLetter();
      spawnTimer = 0.6 + Math.random() * 0.5;
    }

    for (var i = letters.length - 1; i >= 0; i--) {
      var l = letters[i];
      l.y += l.vy * dt;
      if (l.flash > 0) l.flash -= dt * 2;
      if (l.flash < 0) l.flash += dt * 2;
      if (l.y > H + 60) letters.splice(i, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target word display
    if (currentWord) {
      game.draw.text('目標: ', W / 2 - 60, H * 0.2, { size: 36, color: C.ui });
      for (var wi = 0; wi < currentWord.length; wi++) {
        var charX = W / 2 - (currentWord.length - 1) * 40 + wi * 80;
        var isHit = wi < currentIdx;
        var isNext = wi === currentIdx;
        var charCol = isHit ? C.actHi : (isNext ? C.word : C.ui);
        var charSize = isNext ? 72 : 56;
        game.draw.rect(charX - 30, H * 0.23, 60, 66, isNext ? C.word : C.letter, isNext ? 0.2 : 0.1);
        game.draw.text(currentWord[wi], charX, H * 0.27, { size: charSize, color: charCol, bold: true });
      }
    }

    // Letters
    for (var i2 = 0; i2 < letters.length; i2++) {
      var l2 = letters[i2];
      var isNeededLetter = currentWord && l2.letter === currentWord[currentIdx];
      var col = isNeededLetter ? C.active : C.letter;
      var hiCol = isNeededLetter ? C.actHi : C.letHi;
      var flash = Math.abs(l2.flash);
      var badFlash = l2.flash < 0;
      if (flash > 0) { col = badFlash ? C.wrong : C.active; hiCol = badFlash ? C.wrongHi : C.actHi; }
      game.draw.circle(l2.x, l2.y, l2.r + (isNeededLetter ? 6 * Math.sin(elapsed * 6) : 0), col, 0.85);
      game.draw.circle(l2.x, l2.y, l2.r * 0.6, hiCol, 0.2);
      game.draw.text(l2.letter, l2.x, l2.y + 16, { size: 56, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2.5, p.col, p.life * 0.8);
    }

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.87, { size: 48, color: feedbackCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 26 + mi * 52, H * 0.93, 14, mi < mistakes ? C.wrong : '#020408');
    }

    game.draw.text(completed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    nextWord();
    spawnTimer = 0.3;
  });
})(game);
