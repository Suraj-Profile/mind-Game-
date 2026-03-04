const State = {
    // Persistent stats
    totalXP: parseInt(localStorage.getItem('mathMind_xp')) || 0,
    bestStreakLocal: parseInt(localStorage.getItem('mathMind_bestStreak')) || 0,
    // Ensure all difficulty levels are available by default; merge with any saved value
    unlockedLevels: (() => {
        const all = ['easy', 'medium', 'hard', 'expert', 'master'];
        try {
            const saved = JSON.parse(localStorage.getItem('mathMind_levels'));
            if (Array.isArray(saved)) return Array.from(new Set([...saved, ...all]));
        } catch (e) {}
        return all;
    })(),
    mistakes: JSON.parse(localStorage.getItem('mathMind_mistakes')) || [],
    weakAreas: JSON.parse(localStorage.getItem('mathMind_weakAreas')) || {}, // { 'add': 5, 'mul': 12 } - count of mistakes
    dailyLastCompleted: localStorage.getItem('mathMind_dailyDate') || null,
    // Accuracy tracking
    totalAttempts: parseInt(localStorage.getItem('mathMind_attempts')) || 0,
    totalCorrect: parseInt(localStorage.getItem('mathMind_correct')) || 0,

    // Current session stats
    sessionXP: 0,
    currentStreak: 0,
    bestStreakSession: 0,
    correctCount: 0,
    totalQuestions: 0,
    sessionHistory: [],
    
    // Game Config
    difficulty: 'easy',
    timeLimit: 60,
    selectedOperators: ['add', 'sub'],
    
    
    // Power-up counts
    powerUps: {
        hint: 3,
        skip: 2,
        time: 1,
        '5050': 1
    },

    save() {
        localStorage.setItem('mathMind_xp', this.totalXP);
        localStorage.setItem('mathMind_bestStreak', Math.max(this.bestStreakLocal, this.bestStreakSession));
        localStorage.setItem('mathMind_levels', JSON.stringify(this.unlockedLevels));
        localStorage.setItem('mathMind_mistakes', JSON.stringify(this.mistakes.slice(-50))); // Keep last 50
        localStorage.setItem('mathMind_weakAreas', JSON.stringify(this.weakAreas));
        localStorage.setItem('mathMind_dailyDate', this.dailyLastCompleted);
        localStorage.setItem('mathMind_attempts', this.totalAttempts);
        localStorage.setItem('mathMind_correct', this.totalCorrect);
    },

    addXP(amount) {
        this.sessionXP += amount;
        this.totalXP += amount;
        this.checkUnlocks();
        this.save();
    },

    recordMistake(question, operator) {
        this.mistakes.push(question);
        this.weakAreas[operator] = (this.weakAreas[operator] || 0) + 1;
            this.totalAttempts++;
        this.save();
    },

    checkUnlocks() {
        const levels = ['easy', 'medium', 'hard', 'expert', 'master'];
        const thresh = { 'hard': 1000, 'expert': 5000, 'master': 15000 };
        
        for (const [level, xp] of Object.entries(thresh)) {
            if (this.totalXP >= xp && !this.unlockedLevels.includes(level)) {
                this.unlockedLevels.push(level);
                return level; // Return unlocked level name for UI feedback
            }
        }
        return null;
    },

    getRank() {
            const ranks = [
                { name: 'Rookie', xp: 0 },
                { name: 'Learner', xp: 1000 },
                { name: 'Solver', xp: 3000 },
                { name: 'Thinker', xp: 7000 },
                { name: 'Speed King', xp: 15000 },
                { name: 'Math Ninja', xp: 30000 },
                { name: 'Brain Master', xp: 60000 }
            ];
            let current = ranks[0].name;
            for (const r of ranks) {
                if (this.totalXP >= r.xp) current = r.name;
            }
            return current;
    },

    

    resetSession() {
        this.sessionXP = 0;
        this.currentStreak = 0;
        this.bestStreakSession = 0;
        this.correctCount = 0;
        this.totalQuestions = 0;
        this.sessionHistory = [];
    }
};

window.State = State;
