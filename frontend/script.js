// script.js
// Conteúdo COMPLETO e CORRIGIDO do arquivo JavaScript principal do frontend.

import { Carro } from './Carro.js';
import { CarroEsportivo } from './CarroEsportivo.js';
import { Caminhao } from './Caminhao.js';
import { Moto } from './Moto.js';
import { Bicicleta } from './Bicicleta.js';
import { Manutencao } from './Manutencao.js';
import { mostrarFeedback } from './funcoesAuxiliares.js';

const backendLocalUrl = 'http://localhost:3001';
const backendRenderUrl = ''; // Coloque aqui sua URL pública do Render quando tiver
const backendUrl = backendLocalUrl;

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
const editVeiculoFormContainer = document.getElementById('edit-veiculo-form-container');
const editVeiculoForm = document.getElementById('edit-veiculo-form');
const cancelEditVeiculoBtn = document.getElementById('cancel-edit-veiculo');

// ===========================================================================
// FUNÇÕES PRINCIPAIS DE GERENCIAMENTO
// ===========================================================================

/** Atualiza a UI com os dados do veículo selecionado. */
function mostrarVeiculoContainer(veiculoId) {
    const veiculo = veiculosInstanciados[veiculoId];
    if (!veiculo) return;
    
    veiculoAtivoId = veiculoId;
    
    document.querySelectorAll('.veiculo-container').forEach(c => c.style.display = 'none');
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('add-veiculo-form-container').style.display = 'none';
    editVeiculoFormContainer.style.display = 'none';
    
    const prefix = veiculo.getIdPrefix();
    const container = document.getElementById(`${prefix}-container`);
    if (container) {
        container.style.display = 'block';
        container.querySelector(`#${prefix}-modelo`).textContent = veiculo.modelo;
        container.querySelector(`#${prefix}-placa`).textContent = veiculo.placa || '---';
        container.querySelector(`#${prefix}-cor`).textContent = veiculo.cor;

        if (veiculo.atualizarStatus) veiculo.atualizarStatus();
        if (veiculo.atualizarVelocidade) veiculo.atualizarVelocidade();
        if (veiculo.atualizarDisplayManutencao) veiculo.atualizarDisplayManutencao();
        if (veiculo.atualizarEstadoBotoesWrapper) veiculo.atualizarEstadoBotoesWrapper();
        if (veiculo instanceof CarroEsportivo && veiculo.atualizarTurboDisplay) veiculo.atualizarTurboDisplay();
        if (veiculo instanceof Caminhao && veiculo.atualizarInfoCaminhao) veiculo.atualizarInfoCaminhao();
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
            let instancia;
            
            if (dados.tipo === 'caminhao') {
                instancia = new Classe(dados.modelo, dados.cor, dados.capacidadeCarga, dados._id, [], dados.cargaAtual);
            } else if (dados.tipo === 'esportivo') {
                instancia = new Classe(dados.modelo, dados.cor, dados._id, [], dados.turboAtivado);
            } else {
                instancia = new Classe(dados.modelo, dados.cor, dados._id);
            }

            instancia._id = dados._id;
            instancia.placa = dados.placa;
            instancia.marca = dados.marca;
            instancia.ano = dados.ano;

            // Adiciona ao mapa local
            veiculosInstanciados[instancia._id] = instancia;

            // Adiciona à sidebar
            const li = document.createElement('li');
            li.className = 'veiculo-item';
            const displayTexto = instancia.placa && !instancia.placa.startsWith('BIKE-') 
                               ? `${instancia.modelo} (${instancia.placa})`
                               : `${instancia.modelo} (Bicicleta)`;
            li.innerHTML = `<a href="#" data-veiculo-id="${instancia._id}">${displayTexto}</a>`;
            document.getElementById('sidebar-menu').insertBefore(li, document.querySelector('li[data-action]'));
        });

        if (Object.keys(veiculosInstanciados).length > 0) {
            mostrarVeiculoContainer(Object.keys(veiculosInstanciados)[0]);
        } else {
            document.getElementById('welcome-message').style.display = 'block';
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
    const nomeCidadeSpan = document.getElementById(`nome-cidade-previsao-${tipoVeiculo}`);
    const botao = document.getElementById(`verificar-clima-btn-${tipoVeiculo}`);

    resultadoDiv.innerHTML = '<p>Buscando previsão...</p>';
    botao.disabled = true;

    try {
        const url = `${backendUrl}/api/previsao/${encodeURIComponent(cidade)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro desconhecido ao buscar previsão.');
        }

        nomeCidadeSpan.textContent = `${data.nomeCidade}, ${data.pais}`;
        resultadoDiv.innerHTML = `
            <div class="previsao-atual-card">
                <h5>${data.descricaoClima}</h5>
                <img src="https://openweathermap.org/img/wn/${data.iconeClima}@2x.png" alt="${data.descricaoClima}">
                <p>Temp: ${data.temperaturaAtual.toFixed(1)}°C</p>
                <p>Sensação: ${data.sensacaoTermica.toFixed(1)}°C</p>
            </div>`;
    } catch (error) {
        console.error('Erro ao buscar previsão:', error);
        mostrarFeedback(error.message, 'error');
        resultadoDiv.innerHTML = `<p style="color:red;">Falha ao buscar previsão.</p>`;
    } finally {
        botao.disabled = false;
    }
}

// ===========================================================================
// CONFIGURAÇÃO DOS EVENTOS
// ===========================================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarGaragem();
    
    // Event listener para toda a área de conteúdo principal
    mainContent.addEventListener('click', (e) => {
        const target = e.target;
        
        // Botão de Ver Previsão
        if (target.classList.contains('verificar-clima-btn-veiculo')) {
            const tipo = target.dataset.veiculoTipo;
            const cidadeInput = document.getElementById(`cidade-previsao-input-${tipo}`);
            if (cidadeInput) {
                buscarPrevisaoTempo(cidadeInput.value, tipo);
            }
        }

        // Ações de POO dos veículos
        if (target.dataset.acao) {
            const veiculo = veiculosInstanciados[veiculoAtivoId];
            if (!veiculo) return;

            const acao = target.dataset.acao;
            if (typeof veiculo[acao] === 'function') {
                veiculo[acao](window.sons);
            }
        }
    });

    // Event listener para a sidebar
    document.getElementById('sidebar-menu').addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        e.preventDefault();

        if (link.dataset.action === 'mostrarFormAddVeiculo') {
            document.querySelectorAll('.veiculo-container, #edit-veiculo-form-container').forEach(c => c.style.display = 'none');
            document.getElementById('welcome-message').style.display = 'none';
            document.getElementById('add-veiculo-form-container').style.display = 'block';
            document.getElementById('add-veiculo-form').reset();
        } else if (link.dataset.veiculoId) {
            mostrarVeiculoContainer(link.dataset.veiculoId);
        }
    });
    
    // Formulário de adicionar novo veículo
    document.getElementById('add-veiculo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const tipo = formData.get('tipo');
        let placa = formData.get('placa');

        if (tipo !== 'bicicleta' && !placa) {
            return mostrarFeedback('A placa é obrigatória para este tipo de veículo.', 'warning');
        }

        const dadosParaBackend = {
            tipo: tipo,
            modelo: formData.get('modelo'),
            marca: formData.get('marca'),
            ano: Number(formData.get('ano')),
            cor: formData.get('cor'),
            placa: (tipo === 'bicicleta') 
                ? `BIKE-${Math.random().toString(36).substring(2, 9).toUpperCase()}` 
                : placa.toUpperCase()
        };

        if (tipo === 'caminhao') {
            dadosParaBackend.capacidadeCarga = Number(formData.get('capacidade')) || 0;
            dadosParaBackend.cargaAtual = 0;
        }

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
            console.error('Erro ao adicionar veículo:', error);
            mostrarFeedback(error.message, 'error');
        }
    });
});