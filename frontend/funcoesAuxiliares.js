// novaGaragemInteligente/frontend/funcoesAuxiliares.js
// Conteúdo COMPLETO das funções auxiliares utilizadas em várias classes do projeto.

/**
 * Toca um elemento de áudio HTML, resetando a reprodução e definindo o volume.
 * @param {HTMLAudioElement} audioElement - O elemento <audio> HTML a ser tocado.
 * @param {number} [volume=0.5] - O volume do áudio, um número entre 0 e 1.
 */
// Som removido: função tocarSom agora é um no-op para evitar chamadas a elementos de áudio removidos.
export function tocarSom() { /* som removido */ }

// Variável global para armazenar o ID do timeout do feedback
let feedbackTimeout;

/**
 * Exibe uma mensagem de feedback para o usuário na interface da aplicação.
 * @param {string} mensagem - O texto da mensagem a ser exibida.
 * @param {string} [tipo='info'] - O tipo de feedback (ex: 'info', 'success', 'warning', 'error').
 */
export function mostrarFeedback(mensagem, tipo = 'info') {
    const feedbackMessageDiv = document.getElementById('feedback-message');
    if (!feedbackMessageDiv) {
        console.error("[Auxiliar] Elemento #feedback-message não encontrado!");
        return;
    }

    clearTimeout(feedbackTimeout);
    feedbackMessageDiv.textContent = mensagem;
    feedbackMessageDiv.className = `feedback ${tipo}`;
    feedbackMessageDiv.style.display = 'block';

    feedbackTimeout = setTimeout(() => {
        if (feedbackMessageDiv) feedbackMessageDiv.style.display = 'none';
    }, 5000);
}

// Centralized user-visible messages that can be reused across the frontend.
export const MESSAGES = {
    SESSION_EXPIRED: 'Sessão expirada, faça login novamente!',
    SESSION_STARTED: 'Sessão iniciada corretamente!',
    REQUIRED_NAME: 'Campos obrigatórios não preenchidos! (Nome)',
    REQUIRED_EMAIL: 'Campos obrigatórios não preenchidos! (Email)',
    REQUIRED_PASSWORD: 'Campos obrigatórios não preenchidos! (Senha)',
    PASSWORDS_MISMATCH: 'As senhas não conferem. Por favor, confirme sua senha.',
    INVALID_EMAIL_PROMPT: 'O email informado parece inválido. Deseja tentar registrar mesmo assim?',
    INVALID_EMAIL_CANCELLED: 'Registro cancelado: Email inválido.',
    PASSWORD_WEAK_CONFIRM: 'Senha muito fraca, escolha outra. Deseja prosseguir mesmo assim?',
    REGISTER_CANCELLED_WEAK: 'Registro cancelado: Senha muito fraca.',
    VERIFYING_DATA: 'Verificando dados, aguarde...',
    ACCOUNT_CREATED_REDIRECTING: 'Conta criada, redirecionando...',
};

/**
 * Atualiza informações textuais de um veículo na interface do usuário.
 * @param {string} idPrefix - O prefixo do ID do veículo (ex: 'carro', 'moto', 'esportivo').
 * @param {object} dados - Um objeto com pares chave-valor para atualizar no HTML.
 */
export function atualizarInfoVeiculo(idPrefix, dados) {
    for (const key in dados) {
        const elId = `${idPrefix}-${key}`;
        const el = document.getElementById(elId);
        if (el) {
            let valor = dados[key];

            if (key === 'velocidade') {
                valor = `${Math.round(valor)} km/h`;
            } else if (key === 'turbo') {
                valor = dados[key] ? "Ativado" : "Desativado";
            } else if (idPrefix === 'caminhao' && (key === 'carga' || key === 'capacidade')) {
                const cargaSpan = document.getElementById('caminhao-carga');
                const capacidadeSpan = document.getElementById('caminhao-capacidade');
                if (cargaSpan && capacidadeSpan) {
                    if (dados['carga'] !== undefined) cargaSpan.textContent = dados['carga'].toFixed(0);
                    if (dados['capacidade'] !== undefined) capacidadeSpan.textContent = dados['capacidade'].toFixed(0);
                    continue;
                }
            }

            if (el.tagName === 'INPUT') {
                el.value = valor;
            } else {
                el.textContent = valor.toString();
            }
        }
    }
}

/**
 * Atualiza o texto e a classe CSS do status do veículo na interface.
 * @param {string} idPrefix - O prefixo do ID do veículo.
 * @param {boolean} ligado - Indica se o veículo está ligado.
 * @param {number} [velocidade=0] - Velocidade atual (para bicicleta).
 */
export function atualizarStatusVeiculo(idPrefix, ligado, velocidade = 0) {
    const elId = `${idPrefix}-status`;
    const el = document.getElementById(elId);
    if (el) {
        let statusTexto = 'Desligado';
        let statusClasse = 'status-desligado';

        if (idPrefix === 'bicicleta') {
            statusTexto = velocidade > 0 ? "Pedalando" : "Parada";
            statusClasse = velocidade > 0 ? 'status-pedalando' : 'status-parada';
        } else if (ligado) {
            statusTexto = "Ligado";
            statusClasse = 'status-ligado';
        }

        el.textContent = statusTexto;
        el.classList.remove('status-ligado', 'status-desligado', 'status-parada', 'status-pedalando');
        el.classList.add(statusClasse);
    }
}

/**
 * Aplica uma classe CSS temporária à imagem do veículo para simular uma animação.
 * @param {string} idPrefix - O prefixo do ID do veículo.
 * @param {string} acaoCss - Classe CSS a ser aplicada ('acelerando' ou 'freando').
 */
export function animarVeiculo(idPrefix, acaoCss) {
    const imgId = `${idPrefix}-img`;
    const img = document.getElementById(imgId);
    if (img) {
        // animações visuais removidas para simplificar a UI
        img.classList.remove('acelerando', 'freando');
    }
}

/**
 * Habilita ou desabilita os botões de ação na interface do veículo.
 * @param {object} veiculo - Instância do objeto de veículo.
 */
export function atualizarEstadoBotoes(veiculo) {
    if (!veiculo || !veiculo.getIdPrefix) return;

    const prefix = veiculo.getIdPrefix();
    const container = document.getElementById(`${prefix}-container`);
    if (!container) return;

    // Simplified: only keep Editar/Excluir enabled state; all other action buttons were removed.
    const botoes = container.querySelectorAll('.actions button[data-acao]');
    botoes.forEach(botao => {
        const acao = botao.dataset.acao;
        if (acao === 'editar' || acao === 'excluir') {
            botao.disabled = false;
        } else {
            // Shouldn't exist anymore in HTML, but defensively disable
            botao.disabled = true;
        }
    });
}
