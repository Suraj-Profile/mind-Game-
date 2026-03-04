const Questions = {
    generate(difficulty, operators) {
        const op = operators[Math.floor(Math.random() * operators.length)];
        let q = { text: '', answer: 0, op: op };

        const range = this.getRange(difficulty);

        switch (op) {
            case 'add':
                const a = this.rand(range.min, range.max);
                const b = this.rand(range.min, range.max);
                q.text = `${a} + ${b}`;
                q.answer = a + b;
                break;
            case 'sub':
                const s1 = this.rand(range.min, range.max);
                const s2 = this.rand(range.min, s1); // Ensure positive result for easier levels
                q.text = `${s1} − ${s2}`;
                q.answer = s1 - s2;
                break;
            case 'mul':
                const m1 = this.rand(range.min, range.mulMax || range.max / 2);
                const m2 = this.rand(range.min, range.mulFactor || 12);
                q.text = `${m1} × ${m2}`;
                q.answer = m1 * m2;
                break;
            case 'div':
                const d2 = this.rand(2, range.mulFactor || 12);
                const ans = this.rand(range.min, range.mulMax || range.max / 2);
                const d1 = ans * d2;
                q.text = `${d1} ÷ ${d2}`;
                q.answer = ans;
                break;
            case 'pct':
                const p1 = [10, 20, 25, 50, 75][Math.floor(Math.random() * 5)];
                const p2 = this.rand(1, 10) * 10 * (difficulty === 'easy' ? 1 : 10);
                q.text = `${p1}% of ${p2}`;
                q.answer = (p1 / 100) * p2;
                break;
            case 'sim':
                // Simplification: (a + b) * c or similar
                const sa = this.rand(2, 10);
                const sb = this.rand(2, 10);
                const sc = this.rand(2, 5);
                q.text = `(${sa} + ${sb}) × ${sc}`;
                q.answer = (sa + sb) * sc;
                break;
            case 'sq':
                const base = this.rand(Math.max(range.min,2), Math.min(range.max, 50));
                q.text = `${base}²`;
                q.answer = base * base;
                break;
            case 'cube':
                // x^3
                // choose base so result stays reasonable within range
                const maxCubeBase = Math.max(2, Math.floor(Math.pow(range.max || 1000, 1/3)));
                const cubeBase = this.rand(Math.max(range.min, 2), Math.min(maxCubeBase, 50));
                q.text = `${cubeBase}³`;
                q.answer = cubeBase * cubeBase * cubeBase;
                break;
            case 'pow4':
                // x^4
                const maxPow4Base = Math.max(2, Math.floor(Math.pow(range.max || 10000, 1/4)));
                const pow4Base = this.rand(Math.max(range.min, 2), Math.min(maxPow4Base, 20));
                q.text = `${pow4Base}⁴`;
                q.answer = Math.pow(pow4Base, 4);
                break;
            case 'mod':
                // modulus: a % b (remainder)
                // choose b smaller so remainder is meaningful
                const ma = this.rand(range.min, range.max);
                const mb = this.rand(2, Math.min(12, Math.max(range.min, Math.floor(range.max / 10) || 12)));
                q.text = `${ma} % ${mb}`;
                q.answer = ma % mb;
                break;
            case 'root':
                // Perfect square root for simplicity
                const rbase = this.rand(2, Math.min(20, Math.floor(range.max ** 0.5)));
                q.text = `√${rbase * rbase}`;
                q.answer = rbase;
                break;
            case 'bodmas':
                // Build a small BODMAS expression with parentheses and mixed ops
                const x = this.rand(range.min, Math.min(range.max, 50));
                const y = this.rand(range.min, Math.min(range.max, 50));
                const z = this.rand(1, 12);
                // e.g. (x + y) × z - x
                q.text = `(${x} + ${y}) × ${z} - ${x}`;
                q.answer = (x + y) * z - x;
                break;
        }

        return q;
    },

    getRange(diff) {
        switch (diff) {
            case 'easy': return { min: 1, max: 20, mulMax: 10, mulFactor: 10 };
            case 'medium': return { min: 10, max: 100, mulMax: 50, mulFactor: 12 };
            case 'hard': return { min: 50, max: 500, mulMax: 100, mulFactor: 20 };
            case 'expert': return { min: 100, max: 2000, mulMax: 500, mulFactor: 50 };
            case 'master': return { min: 500, max: 10000, mulMax: 1000, mulFactor: 100 };
            default: return { min: 1, max: 20 };
        }
    },

    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

window.Questions = Questions;
