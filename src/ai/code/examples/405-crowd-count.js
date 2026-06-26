// 405-crowd-count.js
// 群衆カウント — 素早く集まりの人数を目測し正確にタップ
// 操作: 表示された群衆の数を見て正しい数字ゾーンをタップ
// 成功: 8問正解  失敗: 3回大外れ or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a18',
    crowd:  '#4f46e5',
    crowdHi:'#818cf8',
    crowdVar0:'#6d28d9',
    crowdVar1:'#7c3aed',
    crowdVar2:'#4f46e5',
    panel:  '#1e1b4b',
    correct:'#22c55e',
    close:  '#f97316',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var phase = 'show';   // show, answer, result
  var showTimer = 1.8;
  var crowd = [];
  var crowdCount = 0;
  var resultTimer = 0;
  var correct = 0;
  var NEEDED = 8;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var resultText = '';
  var particles = [];

  // Answer choices
  var choices = [];
  var choiceW = (W - 80) / 3;
  var choiceH = 160;
  var choiceY = H * 0.78;

  function generateRound() {
    crowdCount = 5 + Math.floor(Math.random() * 36);  // 5-40 people
    crowd = [];
    for (var i = 0; i < crowdCount; i++) {
      var bx = 80 + Math.random()*(W-160);
      var by = H*0.22 + Math.random()*H*0.38;
      crowd.push({ x:bx, y:by, col:[C.crowd,C.crowdHi,C.crowdVar0,C.crowdVar1,C.crowdVar2][Math.floor(Math.random()*5)], r: 18+Math.random()*10 });
    }
    // Generate 3 choices
    var correctPos = Math.floor(Math.random()*3);
    choices = [];
    var used = [crowdCount];
    for (var ci = 0; ci < 3; ci++) {
      if (ci === correctPos) {
        choices.push(crowdCount);
      } else {
        var offset = Math.floor(Math.random()*6+2) * (Math.random()<0.5?1:-1);
        var val = Math.max(1, crowdCount + offset);
        while (used.indexOf(val) !== -1) { val = Math.max(1, crowdCount + offset + (Math.random()<0.5?1:-1)); }
        choices.push(val);
        used.push(val);
      }
    }
    phase = 'show';
    showTimer = 1.8;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'answer') return;
    if (ty < choiceY || ty > choiceY+choiceH) return;
    var choiceIdx = Math.floor((tx - 40) / (choiceW));
    if (choiceIdx < 0 || choiceIdx > 2) return;
    var chosen = choices[choiceIdx];
    if (chosen === crowdCount) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.7;
      resultText = '正解！' + crowdCount + '人';
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random()*Math.PI*2;
        particles.push({ x:W/2, y:H*0.5, vx:Math.cos(ang)*200, vy:Math.sin(ang)*200, life:0.6, col:C.correct });
      }
      if (correct >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(correct*400+Math.ceil(timeLeft)*80); }, 700); return; }
    } else {
      var diff = Math.abs(chosen - crowdCount);
      if (diff <= 3) {
        flashCol = C.close;
        resultText = '惜しい！' + crowdCount + '人だった';
      } else {
        wrong++;
        flashCol = C.wrong;
        resultText = 'ハズレ！' + crowdCount + '人だった';
        game.audio.play('se_failure', 0.4);
        if (wrong >= MAX_WRONG && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); return; }
      }
    }
    phase = 'result';
    resultTimer = 1.2;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) phase = 'answer';
    }

    if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0) generateRound();
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Crowd area
    if (phase === 'show') {
      for (var ci2 = 0; ci2 < crowd.length; ci2++) {
        var p2 = crowd[ci2];
        game.draw.circle(p2.x, p2.y, p2.r, p2.col, 0.9);
        game.draw.circle(p2.x, p2.y-p2.r*0.6, p2.r*0.55, C.crowdHi, 0.7); // head
      }
      game.draw.text('何人いる？', W/2, H*0.68, { size: 52, color: C.text, bold: true });
    } else if (phase === 'answer') {
      // Show blurred/hidden crowd and choices
      for (var ci3 = 0; ci3 < crowd.length; ci3++) {
        var p3 = crowd[ci3];
        game.draw.circle(p3.x, p3.y, p3.r*1.5, p3.col, 0.15);
      }
      game.draw.rect(0, H*0.2, W, H*0.45, '#000', 0.5);
      game.draw.text('記憶した数は？', W/2, H*0.46, { size: 52, color: C.text, bold: true });
      game.draw.text('？', W/2, H*0.38, { size: 120, color: C.crowdHi, bold: true });

      // Choice buttons
      for (var ci4 = 0; ci4 < 3; ci4++) {
        var bx = 40 + ci4*choiceW + choiceW/2;
        game.draw.rect(40+ci4*choiceW+8, choiceY, choiceW-16, choiceH, C.panel, 0.9);
        game.draw.text(choices[ci4]+'', bx, choiceY+choiceH/2+20, { size: 72, color: C.text, bold: true });
        game.draw.text('人', bx+30, choiceY+choiceH/2+54, { size: 36, color: C.ui });
      }
    } else if (phase === 'result') {
      for (var ci5 = 0; ci5 < crowd.length; ci5++) {
        var p5 = crowd[ci5];
        game.draw.circle(p5.x, p5.y, p5.r, p5.col, 0.7);
        game.draw.circle(p5.x, p5.y-p5.r*0.6, p5.r*0.55, C.crowdHi, 0.5);
      }
      game.draw.text(resultText, W/2, H*0.68, { size: 48, color: flashCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var pr = particles[pp2];
      game.draw.circle(pr.x, pr.y, 9*pr.life, pr.col, pr.life*0.8);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2-(MAX_WRONG-1)*40+wi*80, H*0.935, 16, wi < wrong ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.crowd : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateRound();
  });
})(game);
