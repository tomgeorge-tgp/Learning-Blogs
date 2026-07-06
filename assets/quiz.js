/**
 * quiz.js — Reusable quiz widget for Tom George's learning system
 *
 * Usage:
 *   <div id="quiz"></div>
 *   <script src="../assets/engine.js"></script>
 *   <script src="../assets/quiz.js"></script>
 *   <script>initQuiz('quiz', QUIZ_DATA, '0001')</script>
 *
 * QUIZ_DATA format:
 *   [{ q: "Question text", options: ["A", "B", "C", "D"], answer: 1, explanation: "Why B is correct" }]
 *   answer is 0-indexed.
 *
 * The optional third argument (lessonId) connects the quiz to the LearningEngine:
 * results are persisted, XP is awarded, and the next spaced-repetition review is scheduled.
 */

function initQuiz(containerId, data, lessonId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let current = 0;
  let score = 0;
  let answered = false;

  function render() {
    if (current >= data.length) {
      showScore();
      return;
    }

    const item = data[current];
    container.innerHTML = `
      <div class="quiz-progress">Question ${current + 1} of ${data.length}</div>
      <div class="quiz-question">${item.q}</div>
      <ul class="quiz-options">
        ${item.options.map((opt, i) => `
          <li><button class="quiz-option" data-index="${i}">${opt}</button></li>
        `).join('')}
      </ul>
      <div class="quiz-feedback" id="qf"></div>
      <div class="quiz-nav">
        <button class="btn btn-primary" id="next-btn" disabled>
          ${current + 1 < data.length ? 'Next question →' : 'See results'}
        </button>
      </div>
    `;

    answered = false;

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;

        const chosen = parseInt(btn.dataset.index);
        const correct = item.answer;
        const fb = document.getElementById('qf');

        container.querySelectorAll('.quiz-option').forEach(b => {
          b.disabled = true;
          if (parseInt(b.dataset.index) === correct) b.classList.add('correct');
        });

        if (chosen === correct) {
          score++;
          btn.classList.add('correct');
          fb.className = 'quiz-feedback correct show';
          fb.innerHTML = `<strong>Correct.</strong> ${item.explanation}`;
        } else {
          btn.classList.add('wrong');
          fb.className = 'quiz-feedback wrong show';
          fb.innerHTML = `<strong>Not quite.</strong> ${item.explanation}`;
        }

        document.getElementById('next-btn').disabled = false;
      });
    });

    document.getElementById('next-btn').addEventListener('click', () => {
      current++;
      render();
    });
  }

  function showScore() {
    const pct = Math.round((score / data.length) * 100);
    let msg;
    if (pct === 100) { msg = "Perfect! 🎯"; }
    else if (pct >= 70) { msg = "Solid work 💪"; }
    else { msg = "Keep going 🔄"; }

    // Persist the result via the LearningEngine (if present) — awards XP and
    // schedules the next spaced-repetition review with SM-2.
    let engineLines = '';
    if (lessonId && window.LearningEngine) {
      const result = LearningEngine.recordQuizResult(lessonId, score, data.length);
      engineLines += `<div class="quiz-xp-line">+${result.xpGained} XP earned</div>`;
      engineLines += `<div class="quiz-review-line">Next review in ${result.nextReviewDays} day${result.nextReviewDays === 1 ? '' : 's'}</div>`;
      if (result.newAchievements && result.newAchievements.length > 0) {
        engineLines += `<div class="quiz-xp-line">🏆 Achievement unlocked: ${result.newAchievements.map(a => a.label).join(', ')}</div>`;
      }
    }

    container.innerHTML = `
      <div class="quiz-score show">
        <div style="font-size:2.5rem;margin-bottom:0.5rem">${pct}%</div>
        <div style="font-size:1rem;font-weight:400;color:var(--muted)">${score}/${data.length} correct</div>
        <div style="margin-top:0.75rem;font-size:0.9rem">${msg}</div>
        ${engineLines}
        <button class="btn btn-secondary" style="margin-top:1rem" id="${containerId}-retry">Retry quiz</button>
      </div>
    `;

    document.getElementById(`${containerId}-retry`).addEventListener('click', () => {
      initQuiz(containerId, data, lessonId);
    });
  }

  render();
}
