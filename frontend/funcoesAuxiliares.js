// novaGaragemInteligente/frontend/funcoesAuxiliares.js
// Conteúdo COMPLETO das funções auxiliares utilizadas em várias classes do projeto.

/**
 * Toca um elemento de áudio HTML, resetando a reprodução e definindo o volume.
 * @param {HTMLAudioElement} audioElement - O elemento <audio> HTML a ser tocado.
 * @param {number} [volume=0.5] - O volume do áudio, um número entre 0 e 1.
 */
export function tocarSom(audioElement, volume = 0.5) {
    if (audioElement && typeof audioElement.play === 'function') {
        audioElement.volume = Math.max(0, Math.min(1, volume));
        audioElement.currentTime = 0;
        audioElement.play().catch(error => console.warn("Erro ao tentar tocar som:", error));
    } else {
        console.warn("Tentativa de tocar um elemento de som inválido:", audioElement);
    }
}

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
        img.classList.remove('acelerando', 'freando');
        if (acaoCss) {
            img.classList.add(acaoCss);
            setTimeout(() => {
                img.classList.remove(acaoCss);
            }, 300);
        }
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

    const ligado = veiculo.ligado;
    const parado = veiculo.velocidade === 0;
    const botoes = container.querySelectorAll('.actions button[data-acao]');
    const cargaInput = container.querySelector(`#caminhao-carga-input`);

    botoes.forEach(botao => {
        const acao = botao.dataset.acao;
        let desabilitar = false;

        switch (acao) {
            case 'ligar':
                desabilitar = prefix !== 'bicicleta' && ligado;
                break;
            case 'desligar':
                desabilitar = prefix !== 'bicicleta' && (!ligado || !parado);
                break;
            case 'acelerar':
            case 'pedalar':
                desabilitar = prefix !== 'bicicleta' && !ligado;
                break;
            case 'frear':
                desabilitar = parado;
                break;
            case 'ativarTurbo':
                desabilitar = !ligado || (veiculo.turboAtivado === true);
                break;
            case 'desativarTurbo':
                desabilitar = (veiculo.turboAtivado === false || veiculo.turboAtivado === undefined);
                break;
            case 'carregar':
                desabilitar = !ligado;
                if (cargaInput && (!cargaInput.value || parseFloat(cargaInput.value) <= 0)) {
                    if (!desabilitar) desabilitar = true;
                }
                break;
            case 'descarregar':
                desabilitar = !ligado || veiculo.cargaAtual === 0;
                if (cargaInput && (!cargaInput.value || parseFloat(cargaInput.value) <= 0)) {
                    if (!(desabilitar) && veiculo.cargaAtual > 0) {
                        // permite descarregar tudo
                    } else if (!desabilitar) {
                        desabilitar = true;
                    }
                }
                break;
            case 'buzinar':
                desabilitar = false;
                break;
        }
        botao.disabled = desabilitar;
    });

    if (cargaInput) {
        cargaInput.disabled = !ligado;
    }
}
