// 문제 데이터 관리
class ProblemApp {
    constructor() {
        this.problems = this.loadProblems();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderAddedProblems();
        this.renderStudyProblems();
        this.updateStats();
    }

    setupEventListeners() {
        // 문제 추가
        document.getElementById('addProblemBtn').addEventListener('click', () => this.addProblem());
        document.getElementById('problemText').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.addProblem();
        });

        // 이미지 미리보기
        document.getElementById('imageInput').addEventListener('change', (e) => this.previewImage(e));

        // 재시작 버튼
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartWithUnsolved());
        }
    }

    previewImage(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                preview.innerHTML = `<img src="${event.target.result}" alt="미리보기">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    }

    addProblem() {
        const problemText = document.getElementById('problemText').value.trim();
        const answerText = document.getElementById('answerText').value.trim();
        const imageInput = document.getElementById('imageInput');

        if (!problemText || !answerText) {
            alert('문제와 정답을 모두 입력해주세요!');
            return;
        }

        const problem = {
            id: Date.now(),
            text: problemText,
            answer: answerText,
            image: null,
            status: 'pending', // pending, solved, unsure
            isAnswerHidden: true
        };

        // 이미지가 있으면 처리
        if (imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                problem.image = event.target.result;
                this.problems.push(problem);
                this.saveProblems();
                this.renderAddedProblems();
                this.renderStudyProblems();
                this.updateStats();
                this.clearForm();
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            this.problems.push(problem);
            this.saveProblems();
            this.renderAddedProblems();
            this.renderStudyProblems();
            this.updateStats();
            this.clearForm();
        }
    }

    clearForm() {
        document.getElementById('problemText').value = '';
        document.getElementById('answerText').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('imagePreview').innerHTML = '';
    }

    // ============ 왼쪽 섹션: 추가된 문제 목록 렌더링 ============
    renderAddedProblems() {
        const container = document.getElementById('addedProblems');

        if (this.problems.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">추가된 문제가 없습니다.</p>';
            return;
        }

        container.innerHTML = this.problems.map((problem, index) => {
            const statusClass = problem.status === 'solved' ? 'solved' : 
                               problem.status === 'unsure' ? 'unsure' : '';
            const statusText = problem.status === 'solved' ? '✓' : 
                              problem.status === 'unsure' ? '?' : '○';

            return `
                <div class="added-problem-item ${statusClass}">
                    <span class="added-problem-item-text" title="${this.escapeHtml(problem.text)}">
                        <strong>${statusText}</strong> ${this.escapeHtml(problem.text.substring(0, 30))}${problem.text.length > 30 ? '...' : ''}
                    </span>
                    <button class="added-problem-item-btn" onclick="app.deleteProblem(${problem.id})" title="삭제">×</button>
                </div>
            `;
        }).join('');
    }

    // ============ 오른쪽 섹션: 공부 문제 렌더링 ============
    renderStudyProblems() {
        const container = document.getElementById('problemsContainer');
        const completionMessage = document.getElementById('completionMessage');
        const emptyStudy = document.getElementById('emptyStudy');

        // 모든 문제가 풀었음 상태인지 확인
        const allSolved = this.problems.length > 0 && this.problems.every(p => p.status === 'solved');

        if (this.problems.length === 0) {
            container.innerHTML = '';
            completionMessage.classList.add('hidden');
            emptyStudy.classList.remove('hidden');
            return;
        }

        emptyStudy.classList.add('hidden');

        if (allSolved) {
            container.innerHTML = '';
            completionMessage.classList.remove('hidden');
            const solvedCount = this.problems.filter(p => p.status === 'solved').length;
            const unsureCount = this.problems.filter(p => p.status === 'unsure').length;
            document.getElementById('completionStats').textContent = 
                `풀었음: ${solvedCount} | 모르겠음: ${unsureCount} | 총 ${this.problems.length}개 문제`;
            return;
        } else {
            completionMessage.classList.add('hidden');
        }

        container.innerHTML = this.problems.map((problem, index) => {
            const statusClass = problem.status === 'solved' ? 'solved' : 
                               problem.status === 'unsure' ? 'unsure' : '';
            const statusText = problem.status === 'solved' ? '✓ 풀었음' : 
                              problem.status === 'unsure' ? '? 모르겠음' : '○ 미해결';
            const statusLabel = problem.status === 'solved' ? 'status-solved' : 
                               problem.status === 'unsure' ? 'status-unsure' : 'status-pending';

            return `
                <div class="problem-card ${statusClass}">
                    <div class="problem-header">
                        <span class="problem-status ${statusLabel}">${statusText}</span>
                    </div>

                    <div class="problem-content">
                        <div class="problem-text">
                            ${this.escapeHtml(problem.text)}
                        </div>
                        ${problem.image ? `
                            <div class="problem-image">
                                <img src="${problem.image}" alt="문제 이미지">
                            </div>
                        ` : ''}
                    </div>

                    <div class="problem-answer ${problem.isAnswerHidden ? 'hidden' : ''}">
                        <div class="answer-label">✓ 정답:</div>
                        <div class="answer-text">${this.escapeHtml(problem.answer)}</div>
                    </div>

                    <div class="problem-buttons">
                        <button class="btn btn-secondary btn-small" onclick="app.toggleAnswerHide(${problem.id})">
                            ${problem.isAnswerHidden ? '정답 보기' : '정답 숨기기'}
                        </button>
                        <button class="btn btn-primary btn-small" onclick="app.showAnswer(${problem.id})">
                            정답 표시
                        </button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteProblem(${problem.id})">
                            삭제
                        </button>
                    </div>

                    <div class="problem-buttons-action">
                        <button class="btn btn-success btn-small" onclick="app.markSolved(${problem.id})">
                            ✓ 풀었음
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="app.markUnsure(${problem.id})">
                            ? 모르겠음
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleAnswerHide(id) {
        const problem = this.problems.find(p => p.id === id);
        if (problem) {
            problem.isAnswerHidden = !problem.isAnswerHidden;
            this.saveProblems();
            this.renderStudyProblems();
        }
    }

    showAnswer(id) {
        const problem = this.problems.find(p => p.id === id);
        if (problem) {
            problem.isAnswerHidden = false;
            this.saveProblems();
            this.renderStudyProblems();
        }
    }

    markSolved(id) {
        const problem = this.problems.find(p => p.id === id);
        if (problem) {
            problem.status = 'solved';
            this.saveProblems();
            this.renderAddedProblems();
            this.renderStudyProblems();
            this.updateStats();
        }
    }

    markUnsure(id) {
        const problem = this.problems.find(p => p.id === id);
        if (problem) {
            problem.status = 'unsure';
            this.saveProblems();
            this.renderAddedProblems();
            this.renderStudyProblems();
            this.updateStats();
        }
    }

    deleteProblem(id) {
        if (confirm('이 문제를 삭제하시겠습니까?')) {
            this.problems = this.problems.filter(p => p.id !== id);
            this.saveProblems();
            this.renderAddedProblems();
            this.renderStudyProblems();
            this.updateStats();
        }
    }

    restartWithUnsolved() {
        const unsolvedProblems = this.problems.filter(p => p.status !== 'solved');
        if (unsolvedProblems.length === 0) {
            alert('모든 문제를 완료했습니다!');
            return;
        }

        // 미해결 문제들을 섞기 (shuffle)
        const shuffled = unsolvedProblems.sort(() => Math.random() - 0.5);
        
        // 상태 리셋 (solved 유지)
        this.problems = this.problems.map(p => {
            if (p.status === 'solved') {
                return p;
            } else {
                return { ...p, status: 'pending', isAnswerHidden: true };
            }
        });

        this.saveProblems();
        this.renderAddedProblems();
        this.renderStudyProblems();
        this.updateStats();
    }

    updateStats() {
        const solved = this.problems.filter(p => p.status === 'solved').length;
        const unsure = this.problems.filter(p => p.status === 'unsure').length;
        const total = this.problems.length;

        document.getElementById('solvedCount').textContent = solved;
        document.getElementById('unsureCount').textContent = unsure;
        document.getElementById('totalCount').textContent = total;
    }

    saveProblems() {
        localStorage.setItem('problems', JSON.stringify(this.problems));
    }

    loadProblems() {
        const saved = localStorage.getItem('problems');
        return saved ? JSON.parse(saved) : [];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 앱 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProblemApp();
});
