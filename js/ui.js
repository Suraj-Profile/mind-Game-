const UI = {
    screens: ['home-screen', 'game-screen', 'result-screen'],

    init() {
        this.initTheme();
        this.updateStats();
        this.setupEventListeners();
        this.renderDifficultyGrid();
    },

    initTheme() {
        const savedTheme = localStorage.getItem('mathMind_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('mathMind_theme', newTheme);
        this.updateThemeIcon(newTheme);
        this.showToast(`Switched to ${newTheme} mode`, 'info');
    },

    updateThemeIcon(theme) {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.textContent = theme === 'light' ? '☀️' : '🌙';
        }
    },

    showScreen(screenId) {
        this.screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    },

    updateStats() {
        const totalPointsEl = document.getElementById('total-points');
        if (totalPointsEl) totalPointsEl.textContent = State.totalXP;
        const rank = State.getRank();
        const currentRankEl = document.getElementById('current-rank');
        if (currentRankEl) currentRankEl.textContent = rank;
        const rankModalEl = document.getElementById('rank-name-modal');
        if (rankModalEl) rankModalEl.textContent = rank;

        // Modal progress bar (simplified calculation)
        const progress = (State.totalXP % 1000) / 10;
        const rankBar = document.getElementById('rank-progress-bar');
        if (rankBar) rankBar.style.width = `${progress}%`;

        // Refresh difficulty grid so unlock requirements update when XP changes
        this.renderDifficultyGrid();
    },

    renderDifficultyGrid() {
        const btns = document.querySelectorAll('.diff-btn');
        // XP thresholds for locked modes (keep in sync with State.checkUnlocks)
        const thresholds = { hard: 1000, expert: 5000, master: 15000 };
        btns.forEach(btn => {
            const level = btn.dataset.level;
            // If player already has enough XP for this level, ensure it's unlocked in state
            if (thresholds[level] && State.totalXP >= thresholds[level] && !State.unlockedLevels.includes(level)) {
                State.unlockedLevels.push(level);
                State.save();
            }
            if (State.unlockedLevels.includes(level)) {
                btn.removeAttribute('data-locked');
                const lock = btn.querySelector('.lock-icon');
                if (lock) lock.remove();
                // remove any unlock requirement badge when unlocked
                const req = btn.querySelector('.unlock-req');
                if (req) req.remove();
            }

            btn.onclick = () => {
                if (btn.hasAttribute('data-locked')) {
                    const threshold = thresholds[level];
                    const levelName = level.charAt(0).toUpperCase() + level.slice(1);

                    // If player already has enough XP, unlock immediately
                    if (threshold && State.totalXP >= threshold) {
                        if (!State.unlockedLevels.includes(level)) {
                            State.unlockedLevels.push(level);
                            State.save();
                        }

                        this.showToast(`${levelName} unlocked!`, 'success');
                        // Re-render grid and select the newly unlocked level
                        this.renderDifficultyGrid();
                        const newBtn = document.querySelector(`.diff-btn[data-level="${level}"]`);
                        if (newBtn) {
                            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
                            newBtn.classList.add('selected');
                            State.difficulty = level;
                        }
                        return;
                    }

                    // Otherwise, inform how much is needed
                    const needed = threshold ? Math.max(0, threshold - State.totalXP) : null;
                    if (needed && needed > 0) {
                        this.showToast(`${needed} XP needed to unlock ${levelName}.`, 'info');
                    } else {
                        this.showToast('Level Locked! Gain more XP to unlock.', 'error');
                    }
                    return;
                }

                btns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                State.difficulty = level;

                // If Game is available, start the game immediately for this difficulty
                if (window.Game && typeof window.Game.start === 'function') {
                    window.Game.start();
                }
            };
        });

        // Select first by default (guarded)
        if (btns && btns.length > 0) {
            // if none selected, select the first
            const anySelected = Array.from(btns).some(b => b.classList.contains('selected'));
            if (!anySelected) btns[0].classList.add('selected');
        }
    },

    setupEventListeners() {
        // Operator Toggles
        const opBtns = document.querySelectorAll('.op-btn');
        if (opBtns && opBtns.length) {
            opBtns.forEach(btn => {
                btn.onclick = () => {
                    const op = btn.dataset.op;
                    btn.classList.toggle('active');

                    if (btn.classList.contains('active')) {
                        if (!State.selectedOperators.includes(op)) State.selectedOperators.push(op);
                        // notify enabled
                        this.showToast(this.getOpName(op) + ' enabled', 'info');
                    } else {
                        State.selectedOperators = State.selectedOperators.filter(o => o !== op);
                        // Ensure at least one
                        if (State.selectedOperators.length === 0) {
                            State.selectedOperators.push(op);
                            btn.classList.add('active');
                            this.showToast(this.getOpName(op) + ' enabled', 'info');
                        } else {
                            this.showToast(this.getOpName(op) + ' disabled', 'info');
                        }
                    }
                };
            });
        }

        // Timer Select
        const timerSelect = document.getElementById('timer-select');
        if (timerSelect) timerSelect.onchange = (e) => {
            State.timeLimit = parseInt(e.target.value);
            State.save();
        };

        // Game mode selection removed — app runs in default challenge mode

        // Profile/settings/export/import removed - nothing to wire here

        // Stats button
        const statsBtn = document.getElementById('stats-btn');
        if (statsBtn) statsBtn.onclick = () => {
            this.renderWeakAreas();
            const modal = document.getElementById('stats-modal');
            if (modal) modal.classList.add('active');
        };

        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) closeModalBtn.onclick = () => {
            const modal = document.getElementById('stats-modal');
            if (modal) modal.classList.remove('active');
        };

        // Theme Toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.onclick = () => this.toggleTheme();

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const gameScreen = document.getElementById('game-screen');
                if (gameScreen.classList.contains('active')) {
                    document.getElementById('submit-btn').click();
                }
            }
        });
    },

    renderWeakAreas() {
        const list = document.getElementById('weak-areas-list');
        if (!list) return;
        list.innerHTML = '';

        const sorted = Object.entries(State.weakAreas || {}).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            list.innerHTML = '<p>No data yet. Play more games!</p>';
            return;
        }

        sorted.forEach(([op, count]) => {
            const div = document.createElement('div');
            div.className = 'weak-area-item';
            div.innerHTML = `<span>${this.getOpName(op)}</span><span>${count} mistakes</span>`;
            list.appendChild(div);
        });
    },

    getOpName(op) {
        const names = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division', pct: 'Percentage', sim: 'Simplification', sq: 'Squares', root: 'Roots', bodmas: 'BODMAS', cube: 'Cubes', pow4: 'Powers (x⁴)', mod: 'Modulus' };
        return names[op] || op;
    },


    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);

        // Simple style for toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: type === 'error' ? '#ef4444' : '#8b5cf6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
            zIndex: 1000,
            transition: 'opacity 0.3s'
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
};

window.UI = UI;
