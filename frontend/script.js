// script.js

import { Carro } from './Carro.js';
import { CarroEsportivo } from './CarroEsportivo.js';
import { Caminhao } from './Caminhao.js';
import { Moto } from './Moto.js';
import { Bicicleta } from './Bicicleta.js';
// Não precisamos mais importar a classe Manutencao aqui no frontend.
import { mostrarFeedback } from './funcoesAuxiliares.js';

// Define a URL do backend. Mude para a URL do Render quando fizer o deploy.
const backendUrl = 'http://localhost:3001'; 

console.log(`[FRONTEND] O script será executado com o backend em: ${backendUrl}`);

// Variáveis Globais e Mapa de Classes
const veiculosInstanciados = {};
const classesVeiculos = {
    carro: Carro,
    esportivo: CarroEsportivo,
    caminhao: Caminhao,
    moto: Moto,
    bicicleta: Bicicleta
};
const sons = {
    ligar: document.getElementById('ligar-audio'),
    desligar: document.getElementById('desligar-audio'),
    acelerar: document.getElementById('acelerar-audio'),
    frear: document.getElementById('frear-audio'),
    buzina: document.getElementById('buzinar-audio')
};
window.sons = sons;
let veiculoAtivoId = null;

// Elementos DOM
const mainContent = document.getElementById('main-content');
const addVeiculoFormContainer = document.getElementById('add-veiculo-form-container');
const editVeiculoFormContainer = document.getElementById('edit-veiculo-form-container');
const welcomeMessage = document.getElementById('welcome-message');

// ===========================================================================
// FUNÇÕES DE LÓGICA DE MANUTENÇÃO (NOVAS - USANDO API)
// ===========================================================================

/**
 * Busca as manutenções de um veículo específico no backend.
 * @param {string} veiculoId - O _id do veículo no MongoDB.
 * @param {string} tipoVeiculoPrefix - O prefixo do tipo de veículo (ex: 'carro', 'moto').
 */
async function carregarManutencoes(veiculoId, tipoVeiculoPrefix) {
    const historicoLista = document.getElementById(`${tipoVeiculoPrefix}-historico-lista`);
    if (!historicoLista) return;
    historicoLista.innerHTML = '<li>Carregando manutenções...</li>';

    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculoId}/manutencoes`);
        if (!response.ok) {
            throw new Error('Falha ao buscar as manutenções do veículo.');
        }
        const manutencoes = await response.json();
        atualizarDisplayManutencaoUI(manutencoes, tipoVeiculoPrefix);
    } catch (error) {
        console.error(`Erro ao carregar manutenções para o veículo ${veiculoId}:`, error);
        mostrarFeedback(error.message, 'error');
        historicoLista.innerHTML = '<li>Erro ao carregar manutenções.</li>';
    }
}

/**
 * Atualiza a interface do usuário com a lista de manutenções.
 * @param {Array} manutencoes - Um array de objetos de manutenção vindos do backend.
 * @param {string} tipoVeiculoPrefix - O prefixo do tipo de veículo.
 */
function atualizarDisplayManutencaoUI(manutencoes, tipoVeiculoPrefix) {
    const historicoLista = document.getElementById(`${tipoVeiculoPrefix}-historico-lista`);
    if (!historicoLista) return;

    historicoLista.innerHTML = ''; // Limpa a lista atual

    if (manutencoes.length === 0) {
        historicoLista.innerHTML = '<li>Nenhum registro de manutenção encontrado.</li>';
        return;
    }

    manutencoes.forEach(manutencao => {
        const li = document.createElement('li');
        const dataFormatada = new Date(manutencao.data).toLocaleDateString('pt-BR');
        const custoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manutencao.custo);
        
        li.textContent = `${manutencao.descricaoServico} em ${dataFormatada} - ${custoFormatado} (KM: ${manutencao.quilometragem || 'N/A'})`;
        historicoLista.appendChild(li);
    });
}

/**
 * Lida com o envio do formulário de nova manutenção para o backend.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleAdicionarManutencao(event) {
    event.preventDefault();
    const form = event.target;
    const tipoVeiculo = form.dataset.tipo;
    
    const veiculo = veiculosInstanciados[veiculoAtivoId];
    if (!veiculo || !veiculo._id) {
        mostrarFeedback('Nenhum veículo ativo selecionado para adicionar manutenção.', 'error');
        return;
    }

    // Coleta os dados do formulário
    const dadosFormulario = {
        descricaoServico: form.querySelector(`#${tipoVeiculo}-manutencao-tipo`).value,
        data: form.querySelector(`#${tipoVeiculo}-manutencao-data`).value || new Date().toISOString(),
        custo: parseFloat(form.querySelector(`#${tipoVeiculo}-manutencao-custo`).value),
        quilometragem: parseInt(form.querySelector(`#${tipoVeiculo}-manutencao-descricao`).value, 10) || 0
    };

    if (!dadosFormulario.descricaoServico || isNaN(dadosFormulario.custo)) {
        mostrarFeedback('Descrição do Serviço e Custo são campos obrigatórios.', 'warning');
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculo._id}/manutencoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosFormulario),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar manutenção.');
        }

        mostrarFeedback('Manutenção adicionada com sucesso!', 'success');
        form.reset(); // Limpa o formulário
        
        // Recarrega a lista de manutenções para exibir a nova
        await carregarManutencoes(veiculo._id, tipoVeiculo);

    } catch (error) {
        console.error('Erro ao adicionar manutenção:', error);
        mostrarFeedback(error.message, 'error');
    }
}


// ===========================================================================
// FUNÇÕES PRINCIPAIS DE GERENCIAMENTO DE VEÍCULOS
// ===========================================================================

/** Atualiza a UI com os dados do veículo selecionado e carrega suas manutenções. */
function mostrarVeiculoContainer(veiculoId) {
    const veiculo = veiculosInstanciados[veiculoId];
    if (!veiculo) return;
    
    veiculoAtivoId = veiculoId;
    
    // Esconde todas as seções principais
    document.querySelectorAll('.veiculo-container').forEach(c => c.style.display = 'none');
    welcomeMessage.style.display = 'none';
    addVeiculoFormContainer.style.display = 'none';
    editVeiculoFormContainer.style.display = 'none';
    
    const prefix = veiculo.getIdPrefix();
    const container = document.getElementById(`${prefix}-container`);
    if (container) {
        container.style.display = 'block';
        
        // Preenche dados básicos do veículo
        container.querySelector(`#${prefix}-modelo`).textContent = veiculo.modelo;
        container.querySelector(`#${prefix}-placa`).textContent = veiculo.placa || '---';
        container.querySelector(`#${prefix}-cor`).textContent = veiculo.cor;
        container.querySelector(`#${prefix}-marca`).textContent = veiculo.marca;
        container.querySelector(`#${prefix}-ano`).textContent = veiculo.ano;

        // Atualiza status dinâmicos
        if (veiculo.atualizarStatus) veiculo.atualizarStatus();
        if (veiculo.atualizarVelocidade) veiculo.atualizarVelocidade();
        if (veiculo.atualizarEstadoBotoesWrapper) veiculo.atualizarEstadoBotoesWrapper();
        if (veiculo instanceof CarroEsportivo) veiculo.atualizarTurboDisplay();
        if (veiculo instanceof Caminhao) veiculo.atualizarInfoCaminhao();

        // CHAMA A FUNÇÃO PARA CARREGAR AS MANUTENÇÕES DO BACKEND
        carregarManutencoes(veiculo._id, prefix);
    }
}

/** Carrega os veículos do backend e os adiciona na interface. */
async function carregarGaragem() {
    try {
        const response = await fetch(`${backendUrl}/api/veiculos`);
        if (!response.ok) throw new Error('Não foi possível carregar os veículos do servidor.');
        
        const veiculosDoBackend = await response.json();
        
        // Limpa estado atual
        Object.keys(veiculosInstanciados).forEach(key => delete veiculosInstanciados[key]);
        document.querySelectorAll('.veiculo-item').forEach(item => item.remove());

        veiculosDoBackend.forEach(dados => {
            const Classe = classesVeiculos[dados.tipo] || classesVeiculos.carro;
            // A lógica de manutenção foi removida daqui, pois será carregada sob demanda
            let instancia = new Classe(dados.modelo, dados.cor, dados._id, []);

            // Atribui propriedades do backend para a instância do frontend
            instancia._id = dados._id;
            instancia.placa = dados.placa;
            instancia.marca = dados.marca;
            instancia.ano = dados.ano;

            veiculosInstanciados[instancia._id] = instancia;

            // Adiciona à sidebar
            const li = document.createElement('li');
            li.className = 'veiculo-item';
            const displayTexto = dados.placa ? `${dados.modelo} (${dados.placa})` : dados.modelo;
            li.innerHTML = `<a href="#" data-veiculo-id="${dados._id}">${displayTexto}</a>`;
            document.getElementById('sidebar-menu').appendChild(li);
        });

        if (veiculosDoBackend.length > 0) {
            mostrarVeiculoContainer(veiculosDoBackend[0]._id);
        } else {
            welcomeMessage.style.display = 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar garagem:', error);
        mostrarFeedback(error.message, 'error');
    }
}

/** Lida com a busca da previsão do tempo. */
async function buscarPrevisaoTempo(cidade, tipoVeiculo) {
    if (!cidade) {
        mostrarFeedback('Por favor, digite o nome de uma cidade.', 'warning');
        return;
    }
    const resultadoDiv = document.getElementById(`previsao-tempo-resultado-${tipoVeiculo}`);
    resultadoDiv.innerHTML = '<p>Buscando previsão...</p>';

    try {
        const response = await fetch(`${backendUrl}/api/previsao/${encodeURIComponent(cidade)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro desconhecido.');

        resultadoDiv.innerHTML = `
            <h5>${data.descricaoClima}</h5>
            <img src="https://openweathermap.org/img/wn/${data.iconeClima}@2x.png" alt="${data.descricaoClima}">
            <p>Temperatura: ${data.temperaturaAtual.toFixed(1)}°C</p>`;
    } catch (error) {
        mostrarFeedback(error.message, 'error');
        resultadoDiv.innerHTML = `<p style="color:red;">Falha ao buscar previsão.</p>`;
    }
}

// ===========================================================================
// CONFIGURAÇÃO DOS EVENTOS
// ===========================================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarGaragem();
    
    // Listener para ações nos veículos (botões de ligar, acelerar, etc.)
    mainContent.addEventListener('click', (e) => {
        const target = e.target;
        const veiculo = veiculosInstanciados[veiculoAtivoId];
        
        if (target.classList.contains('verificar-clima-btn-veiculo')) {
            const tipo = target.dataset.veiculoTipo;
            const cidadeInput = document.getElementById(`cidade-previsao-input-${tipo}`);
            buscarPrevisaoTempo(cidadeInput.value, tipo);
        } else if (target.dataset.acao && veiculo) {
            const acao = target.dataset.acao;
            if (typeof veiculo[acao] === 'function') {
                veiculo[acao](window.sons);
            }
        }
    });

    // Listener para o menu da sidebar
    document.getElementById('sidebar-menu').addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        e.preventDefault();

        if (link.dataset.action === 'mostrarFormAddVeiculo') {
            document.querySelectorAll('.veiculo-container, #edit-veiculo-form-container').forEach(c => c.style.display = 'none');
            welcomeMessage.style.display = 'none';
            addVeiculoFormContainer.style.display = 'block';
        } else if (link.dataset.veiculoId) {
            mostrarVeiculoContainer(link.dataset.veiculoId);
        }
    });
    
    // Listener para o formulário de ADICIONAR veículo
    document.getElementById('add-veiculo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const dadosParaBackend = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${backendUrl}/api/veiculos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaBackend)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar veículo.');
            }
            const novoVeiculo = await response.json();
            mostrarFeedback(`"${novoVeiculo.modelo}" foi criado com sucesso!`, 'success');
            await carregarGaragem();
            mostrarVeiculoContainer(novoVeiculo._id);
        } catch (error) {
            mostrarFeedback(error.message, 'error');
        }
    });

    // NOVO: Adiciona listener para TODOS os formulários de manutenção
    document.querySelectorAll('.manutencao-form').forEach(form => {
        form.addEventListener('submit', handleAdicionarManutencao);
    });
});