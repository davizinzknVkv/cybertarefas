let modalGlobal = null;
let tempoElGlobal = null;
let progressoElGlobal = null;
let descricaoElGlobal = null;

// --- Início do Bloco Corrigido para o Modal de Processamento ---

// Variável global para controlar o timer do cronômetro
let countdownInterval = null;

// Função para garantir que o timer seja limpo e não cause erros
function limparIntervalo() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function iniciarModalGlobal(total) {
    if (document.getElementById('globalModalOverlay')) return;

    // Limpa qualquer timer antigo ao criar um novo modal
    limparIntervalo();

    const modalHTML = `
        <div id="globalModal" class="modal-container">
            <div class="modal-controls">
                <button id="minimizeModalBtn" class="modal-btn" title="Minimizar">-</button>
                <button id="closeModalBtn" class="modal-btn" title="Fechar">&times;</button>
            </div>
            <h2 id="modalTitle" class="modal-title">Processando Atividades</h2>
            <div class="modal-content">
                <div id="modalSpinner" class="spinner"></div>
                <p id="modalTaskName">Aguardando início...</p>
                <p id="modalProgress">Tarefa 0 de ${total}</p>
                <p id="modalTime" style="margin-top: 10px; font-weight: 600;"></p> <!-- Elemento para o tempo -->
                <div class="warning-box" style="background-color: rgba(255, 204, 0, 0.1); color: #ffcc00; padding: 10px; border-radius: 8px; margin-top: 20px;">
                    <p>⚠️ Não feche esta página até que todas as atividades sejam concluídas.</p>
                </div>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.id = 'globalModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = modalHTML;
    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('show'), 10);

    const modal = document.getElementById('globalModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const minimizeBtn = document.getElementById('minimizeModalBtn');

    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('show');
        limparIntervalo(); // IMPORTANTE: Limpa o timer ao fechar o modal
        setTimeout(() => overlay.remove(), 300);
    });

    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.classList.toggle('minimized');
    });
    
    modal.addEventListener('click', () => {
        if (modal.classList.contains('minimized')) {
            modal.classList.remove('minimized');
        }
    });
}

// Função para atualizar o modal (à prova de erros)
function atualizarModalGlobal(taskName, durationInSeconds, index, total) {
    const modalOverlay = document.getElementById('globalModalOverlay');
    if (!modalOverlay) {
        limparIntervalo(); // Garante que o timer pare se o modal sumir
        return;
    }

    const taskNameElement = document.getElementById('modalTaskName');
    if (taskNameElement) taskNameElement.textContent = taskName;

    const progressElement = document.getElementById('modalProgress');
    if (progressElement) progressElement.textContent = `Tarefa ${index} de ${total}`;

    atualizarTempo(durationInSeconds);
}

// Nova função de tempo com verificações de segurança
function atualizarTempo(duration) {
    limparIntervalo(); // Limpa qualquer timer anterior

    let timer = duration;
    
    countdownInterval = setInterval(() => {
        // A cada segundo, verifica se o elemento do tempo ainda existe
        const timeElement = document.getElementById('modalTime');
        if (!timeElement) {
            limparIntervalo(); // Se o modal foi fechado, para o timer
            return;
        }

        if (timer >= 0) {
            const minutes = Math.floor(timer / 60);
            let seconds = timer % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timeElement.textContent = `Aguarde: ${minutes}:${seconds}`;
            timer--;
        } else {
            timeElement.textContent = "Enviando resposta...";
            limparIntervalo(); // Para o timer quando o tempo acaba
        }
    }, 1000);
}

// --- Fim do Bloco Corrigido ---

// --- Modal de Seleção de Tarefas ---
function createTaskSelectionModal(tasks, onSelectCallback) {
    // Se o modal já existe, não faz nada
    if (document.getElementById('selectionModalOverlay')) return;

    // Cria a lista de tarefas em HTML
    const taskListHTML = tasks.map((task, index) => `
        <li class="task-item">
            <div class="task-info">
                <span class="task-title">${task.title}</span>
                <span class="task-type ${task.type.toLowerCase()}">${task.type}</span>
            </div>
            <button class="do-task-btn" data-index="${index}">Fazer</button>
        </li>
    `).join('');

    const modalHTML = `
        <div id="selectionModal" class="modal-container">
            <div class="modal-controls">
                <button id="closeSelectionModalBtn" class="modal-btn" title="Fechar">&times;</button>
            </div>
            <h2 class="modal-title">Selecione uma Atividade</h2>
            <div class="modal-content">
                <ul class="task-list">${taskListHTML}</ul>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.id = 'selectionModalOverlay';
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = modalHTML;
    document.body.appendChild(overlay);

    // Lógica para fechar o modal
    document.getElementById('closeSelectionModalBtn').addEventListener('click', () => {
        overlay.remove();
    });

    // Lógica para os botões "Fazer"
    document.querySelectorAll('.do-task-btn').forEach(button => {
        button.addEventListener('click', () => {
            const taskIndex = button.getAttribute('data-index');
            const selectedTask = tasks[taskIndex];
            onSelectCallback(selectedTask); // Executa a função que foi passada
            overlay.remove(); // Fecha o modal de seleção
        });
    });
}

// Adiciona animações necessárias
const estilo = document.createElement("style");
estilo.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}`;
document.head.appendChild(estilo);
