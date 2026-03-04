const Game = {
    currentQuestion: null,
    timeLeft: 0,
    timerId: null,
    isPaused: false,

    init() {
        UI.init();
        this.setupButtons();
    },

    setupButtons() {
        const el = id => document.getElementById(id);
        const startBtn = el('start-game-btn'); if (startBtn) startBtn.onclick = () => this.start();
        const quitBtn = el('quit-btn'); if (quitBtn) quitBtn.onclick = () => this.end(true);
        const submitBtn = el('submit-btn'); if (submitBtn) submitBtn.onclick = () => this.checkAnswer();
        const playAgain = el('play-again-btn'); if (playAgain) playAgain.onclick = () => this.start();
        const homeBtn = el('home-btn'); if (homeBtn) homeBtn.onclick = () => UI.showScreen('home-screen');

        // Power-ups (guarded)
        const puHint = el('pu-hint'); if (puHint) puHint.onclick = () => this.usePowerUp('hint');
        const puSkip = el('pu-skip'); if (puSkip) puSkip.onclick = () => this.usePowerUp('skip');
        const puTime = el('pu-time'); if (puTime) puTime.onclick = () => this.usePowerUp('time');
        const pu5050 = el('pu-5050'); if (pu5050) pu5050.onclick = () => this.usePowerUp('5050');

        const reviewBtn = el('mistake-review-btn');
        if (reviewBtn) reviewBtn.onclick = () => {
            if (!Array.isArray(State.mistakes) || State.mistakes.length === 0) {
                UI.showToast('No mistakes to review yet!', 'info');
                return;
            }
            this.startReview();
        };

        const dailyBtn = el('daily-challenge-btn');
        if (dailyBtn) dailyBtn.onclick = () => {
            const today = new Date().toDateString();
            if (State.dailyLastCompleted === today) {
                UI.showToast('Daily Challenge already completed!', 'info');
                return;
            }
            this.startDaily();
        };
    },

    start() {
        State.resetSession();
        // reset daily/review flags when starting a fresh game
        this.isDaily = false;
        this.isReview = false;
        // Default to challenge behavior (single fixed mode)
        this.mode = 'challenge';
        this.timeLeft = State.timeLimit;
        this.updatePowerUpUI();
        UI.showScreen('game-screen');
        this.nextQuestion();
        this.startTimer();
    },

    startDaily() {
        State.resetSession();
        State.difficulty = 'hard'; // Force hard for daily
        this.isDaily = true; // set before timer so end() recognizes daily
        this.timeLeft = 60; // 1 min sprint
        UI.showScreen('game-screen');
        this.nextQuestion();
        this.startTimer();
    },

    startReview() {
        // Simplified review: play through last 5 mistakes
        State.resetSession();
        this.reviewPool = [...State.mistakes];
        UI.showScreen('game-screen');
        this.nextReviewQuestion();
        this.isReview = true;
    },

    nextReviewQuestion() {
        if (this.reviewPool.length === 0) {
            this.end();
            return;
        }
        this.currentQuestion = this.reviewPool.shift();
        this.displayQuestion();
    },

    nextQuestion() {
        this.currentQuestion = Questions.generate(State.difficulty, State.selectedOperators);
        this.displayQuestion();
    },

    displayQuestion() {
        const qText = document.getElementById('question-text');
        qText.textContent = this.currentQuestion.text;

        const input = document.getElementById('answer-input');
        input.value = '';
        input.focus();

        document.getElementById('answer-reveal').classList.remove('visible');

        // Track when question shown for fast-answer bonus
        this.questionStartTime = Date.now();

        // Update progress bar (visual only)
        document.getElementById('game-progress').style.width = '0%';
    },

    checkAnswer() {
        const input = document.getElementById('answer-input');
        const userAnswer = parseFloat(input.value);

        if (isNaN(userAnswer)) return;

        State.totalQuestions++;

        if (Math.abs(userAnswer - this.currentQuestion.answer) < 0.01) {
            this.handleCorrect(userAnswer);
        } else {
            this.handleWrong(userAnswer);
        }
    },

    handleCorrect(userAnswer) {
        State.correctCount++;
        State.currentStreak++;
        State.bestStreakSession = Math.max(State.bestStreakSession, State.currentStreak);

        // Scoring: base + fast bonus + streak bonus
        const base = 10; // +10 per correct
        const timeTaken = (Date.now() - (this.questionStartTime || Date.now())) / 1000;
        const fastBonus = timeTaken <= 5 ? 5 : 0; // +5 for fast answers
        const streakBonus = Math.floor(State.currentStreak / 5) * 5; // every 5 streaks adds extra
        const xp = base + fastBonus + streakBonus;
        State.addXP(xp);
        State.totalAttempts++;
        State.totalCorrect++;

        // Record session history
        State.sessionHistory.push({
            text: this.currentQuestion.text,
            userAnswer: userAnswer,
            correctAnswer: this.currentQuestion.answer,
            correct: true,
            op: this.currentQuestion.op || null
        });

        this.updateHUD();
        this.feedback('correct');

        if (this.isReview) {
            this.nextReviewQuestion();
        } else {
            this.nextQuestion();
        }
    },

    handleWrong(userAnswer) {
        State.recordMistake(this.currentQuestion, this.currentQuestion.op);
        // Record session history
        State.sessionHistory.push({
            text: this.currentQuestion.text,
            userAnswer: userAnswer,
            correctAnswer: this.currentQuestion.answer,
            correct: false,
            op: this.currentQuestion.op || null
        });
        State.currentStreak = 0;

        this.updateHUD();
        this.feedback('wrong');

        // Show correct answer briefly
        const reveal = document.getElementById('answer-reveal');
        reveal.textContent = `Correct: ${this.currentQuestion.answer}`;
        reveal.classList.add('visible');

        setTimeout(() => {
            if (this.isReview) {
                this.nextReviewQuestion();
            } else {
                this.nextQuestion();
            }
        }, 1500);
    },

    calculateXP() {
        let base = 10;
        if (State.difficulty === 'medium') base = 20;
        if (State.difficulty === 'hard') base = 50;
        if (State.difficulty === 'expert') base = 100;
        if (State.difficulty === 'master') base = 250;

        // Streak multiplier
        const mult = 1 + (State.currentStreak * 0.1);
        return Math.floor(base * mult);
    },

    updateHUD() {
        document.getElementById('streak-count').textContent = State.currentStreak;
        document.getElementById('streak-count').parentElement.classList.toggle('active', State.currentStreak > 0);
    },

    feedback(type) {
        const card = document.querySelector('.question-card');
        card.style.borderColor = type === 'correct' ? 'var(--correct)' : 'var(--wrong)';
        setTimeout(() => card.style.borderColor = 'var(--glass-border)', 300);
    },

    startTimer() {
        if (this.timerId) clearInterval(this.timerId);

        this.updateTimerUI();

        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();

            if (this.timeLeft <= 0) {
                // Reveal correct answer and optionally a simple step
                const reveal = document.getElementById('answer-reveal');
                reveal.textContent = `Time! Answer: ${this.currentQuestion.answer}`;
                reveal.classList.add('visible');
                setTimeout(() => this.end(), 1200);
            }
        }, 1000);
    },

    updateTimerUI() {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        document.getElementById('timer-text').textContent =
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        const progress = (this.timeLeft / State.timeLimit) * 283;
        document.getElementById('timer-bar').style.strokeDashoffset = 283 - progress;

        if (this.timeLeft <= 10) {
            document.getElementById('timer-bar').style.stroke = 'var(--wrong)';
        } else {
            document.getElementById('timer-bar').style.stroke = 'var(--accent-secondary)';
        }
    },

    usePowerUp(type) {
        if (State.powerUps[type] <= 0) return;

        switch (type) {
            case 'hint':
                const ans = this.currentQuestion.answer.toString();
                document.getElementById('answer-input').placeholder = `Ends with ...${ans.slice(-1)}`;
                break;
            case 'skip':
                this.nextQuestion();
                break;
            case 'time':
                this.timeLeft += 20;
                this.updateTimerUI();
                break;
            case '5050':
                UI.showToast('50/50 applied! Answer is likely between ' + (this.currentQuestion.answer - 10) + ' and ' + (this.currentQuestion.answer + 10));
                break;
        }

        State.powerUps[type]--;
        this.updatePowerUpUI();
    },

    updatePowerUpUI() {
        document.getElementById('hint-count').textContent = State.powerUps.hint;
        document.getElementById('skip-count').textContent = State.powerUps.skip;
        document.getElementById('time-count').textContent = State.powerUps.time;
        document.getElementById('5050-count').textContent = State.powerUps['5050'];

        for (const [key, count] of Object.entries(State.powerUps)) {
            const id = key === '5050' ? 'pu-5050' : `pu-${key}`;
            document.getElementById(id).disabled = count <= 0;
        }
    },

    end(isQuit = false) {
        clearInterval(this.timerId);

        if (this.isDaily && !isQuit) {
            State.dailyLastCompleted = new Date().toDateString();
            State.addXP(500); // Daily bonus
            UI.showToast('Daily Challenge Complete! +500 XP', 'success');
        }

        this.isDaily = false;
        this.isReview = false;

        document.getElementById('xp-gained').textContent = `+${State.sessionXP}`;
        const acc = State.totalQuestions > 0 ? Math.round((State.correctCount / State.totalQuestions) * 100) : 0;
        document.getElementById('accuracy-score').textContent = `${acc}%`;
        document.getElementById('best-streak').textContent = State.bestStreakSession;

        // Show unlocked levels if any
        const newUnlock = State.checkUnlocks();
        const unlockedList = document.getElementById('unlocked-list');
        unlockedList.innerHTML = '';
        if (newUnlock) {
            unlockedList.innerHTML = `<div class="reward-item"><span>🚀</span> Unlocked ${newUnlock.charAt(0).toUpperCase() + newUnlock.slice(1)} Mode!</div>`;
        } else {
            unlockedList.innerHTML = '<p class="empty-msg">No new ranks today. Keep grinding!</p>';
        }

        // Render session results separated into correct / incorrect lists
        const correctListEl = document.getElementById('correct-list');
        const wrongListEl = document.getElementById('wrong-list');
        const correctCountEl = document.getElementById('correct-count');
        const wrongCountEl = document.getElementById('wrong-count');
        const attemptedCountEl = document.getElementById('attempted-count');

        const hist = State.sessionHistory || [];
        const correctItems = hist.filter(h => h.correct);
        const wrongItems = hist.filter(h => !h.correct);

        // Update counts
        if (correctCountEl) correctCountEl.textContent = correctItems.length;
        if (wrongCountEl) wrongCountEl.textContent = wrongItems.length;
        if (attemptedCountEl) attemptedCountEl.textContent = hist.length;

        // Helper to render a list or an empty message
        const renderList = (container, items, emptyMsg) => {
            if (!container) return;
            if (items.length === 0) {
                container.innerHTML = `<p class="empty-msg">${emptyMsg}</p>`;
                return;
            }

            container.innerHTML = items.map(item => {
                return `
                    <div class="history-item ${item.correct ? 'correct' : 'wrong'}">
                        <div class="q-text">${item.text}</div>
                        <div class="answers">
                            <span class="user">You: ${item.userAnswer}</span>
                            <span class="correct-ans">Ans: ${item.correctAnswer}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        renderList(correctListEl, correctItems, 'No correct answers this session.');
        renderList(wrongListEl, wrongItems, 'No incorrect answers this session.');

        State.save();
        UI.updateStats();
        UI.showScreen('result-screen');
    }
};

window.onload = () => {
    try {
        Game.init();
    } catch (e) {
        // Safe fallback: show a toast and log error so UI doesn't completely break
        console.error('Game initialization error:', e);
        if (window.UI && typeof window.UI.showToast === 'function') UI.showToast('Initialization error. Check console.', 'error');
    }
};
window.Game = Game;
