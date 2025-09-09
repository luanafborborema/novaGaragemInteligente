// script.js
// Conteúdo COMPLETO e FINAL do arquivo JavaScript principal do frontend.

// Commit helper: pequena alteração para permitir commit (sem impacto runtime).

import { Carro } from './Carro.js';
import { CarroEsportivo } from './CarroEsportivo.js';
import { Caminhao } from './Caminhao.js';
import { Moto } from './Moto.js';
import { Bicicleta } from './Bicicleta.js';
import { Manutencao } from './Manutencao.js';
import { mostrarFeedback } from './funcoesAuxiliares.js';

const backendLocalUrl = 'http://localhost:3001';
// Em produção usamos caminhos relativos para falar com o backend do mesmo host
const backendRenderUrl = '';

// Detecta se estamos abrindo o frontend localmente (file://) ou em localhost.
const _isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
// Se local, usamos o backend local; se não, usamos caminhos relativos (backendRenderUrl vazio)
const backendUrl = _isLocalHost ? backendLocalUrl : backendRenderUrl;

console.log(`[FRONTEND] O script será executado com o backend em: ${backendUrl || '(relative)'} (detectedLocal=${_isLocalHost})`);

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
const addVeiculoForm = document.getElementById('add-veiculo-form');
const editVeiculoFormContainer = document.getElementById('edit-veiculo-form-container');
const editVeiculoForm = document.getElementById('edit-veiculo-form');
const cancelEditVeiculoBtn = document.getElementById('cancel-edit-veiculo');

// ===========================================================================
// FUNÇÕES PRINCIPAIS DE GERENCIAMENTO
// ===========================================================================

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
        if (veiculo.atualizarEstadoBotoesWrapper) veiculo.atualizarEstadoBotoesWrapper();
        if (veiculo instanceof CarroEsportivo) veiculo.atualizarTurboDisplay();
        if (veiculo instanceof Caminhao) veiculo.atualizarInfoCaminhao();
    }
}

async function carregarGaragem() {
    try {
        const response = await fetch(`${backendUrl}/api/veiculos`);
        if (!response.ok) throw new Error('Não foi possível carregar os veículos.');
        
        const veiculosDoBackend = await response.json();
        
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

            veiculosInstanciados[instancia._id] = instancia;

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

async function buscarPrevisaoTempo(cidade, tipoVeiculo) {
    if (!cidade) {
        mostrarFeedback('Digite o nome de uma cidade.', 'warning');
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
            throw new Error(data.error || 'Erro ao buscar previsão.');
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
        mostrarFeedback(error.message, 'error');
        resultadoDiv.innerHTML = `<p style="color:red;">Falha ao buscar previsão.</p>`;
    } finally {
        botao.disabled = false;
    }
}

function preencherFormularioEdicao(veiculo) {
    document.getElementById('edit-veiculo-id').value = veiculo._id;
    document.getElementById('edit-veiculo-placa-original').value = veiculo.placa;
    document.getElementById('edit-veiculo-tipo').value = veiculo.getTipo();
    document.getElementById('edit-veiculo-modelo-title').textContent = veiculo.modelo;
    document.getElementById('edit-modelo').value = veiculo.modelo;
    document.getElementById('edit-placa').value = veiculo.placa;
    document.getElementById('edit-cor').value = veiculo.cor;
    document.getElementById('edit-marca').value = veiculo.marca || '';
    document.getElementById('edit-ano').value = veiculo.ano || '';

    const editPlacaInput = document.getElementById('edit-placa');
    editPlacaInput.closest('.mb-3').style.display = (veiculo.getTipo() === 'bicicleta') ? 'none' : 'block';
    
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('add-veiculo-form-container').style.display = 'none';
    document.querySelectorAll('.veiculo-container').forEach(c => c.style.display = 'none');
    editVeiculoFormContainer.style.display = 'block';
}

// ===========================================================================
// CONFIGURAÇÃO DOS EVENTOS
// ===========================================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarGaragem();
    
    mainContent.addEventListener('click', async (e) => {
        const target = e.target;
        const veiculo = veiculosInstanciados[veiculoAtivoId];

        // Botão de Ver Previsão
        if (target.classList.contains('verificar-clima-btn-veiculo')) {
            const tipo = target.dataset.veiculoTipo;
            const cidadeInput = document.getElementById(`cidade-previsao-input-${tipo}`);
            if (cidadeInput) buscarPrevisaoTempo(cidadeInput.value, tipo);
        }

        // Ações de POO, Editar e Excluir
        if (target.dataset.acao) {
            if (!veiculo) return;
            const acao = target.dataset.acao;

            // LÓGICA DE EDITAR
            if (acao === 'editar') {
                preencherFormularioEdicao(veiculo);
                return;
            }

            // LÓGICA DE EXCLUIR
            if (acao === 'excluir') {
                if (!confirm(`Tem certeza que deseja excluir o veículo "${veiculo.modelo}"?`)) return;
                try {
                    const response = await fetch(`${backendUrl}/api/veiculos/${veiculo._id}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    mostrarFeedback(`"${veiculo.modelo}" foi excluído.`, 'success');
                    await carregarGaragem();
                } catch (error) {
                    mostrarFeedback(error.message, 'error');
                }
                return;
            }
            
            // Ações de POO
            if (typeof veiculo[acao] === 'function') {
                veiculo[acao](window.sons);
            }
        }
    });

    document.getElementById('sidebar-menu').addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        e.preventDefault();
        
        if (link.dataset.action === 'mostrarFormAddVeiculo') {
            document.querySelectorAll('.veiculo-container, #edit-veiculo-form-container').forEach(c => c.style.display = 'none');
            document.getElementById('welcome-message').style.display = 'none';
            document.getElementById('add-veiculo-form-container').style.display = 'block';
            addVeiculoForm.reset();
        } else if (link.dataset.veiculoId) {
            mostrarVeiculoContainer(link.dataset.veiculoId);
        }
    });
    
    addVeiculoForm.addEventListener('submit', async (e) => {
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
            marca: formData.get('marca') || formData.get('modelo').split(' ')[0],
            ano: Number(formData.get('ano')) || new Date().getFullYear(),
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
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            mostrarFeedback(`"${data.modelo}" criado com sucesso!`, 'success');
            await carregarGaragem();
            mostrarVeiculoContainer(data._id);
        } catch (error) {
            mostrarFeedback(error.message, 'error');
        }
    });

    editVeiculoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const veiculoId = document.getElementById('edit-veiculo-id').value;
        const dadosAtualizacao = {
            modelo: document.getElementById('edit-modelo').value,
            placa: document.getElementById('edit-placa').value.toUpperCase(),
            cor: document.getElementById('edit-cor').value,
            marca: document.getElementById('edit-marca').value,
            ano: Number(document.getElementById('edit-ano').value)
        };
        try {
            const response = await fetch(`${backendUrl}/api/veiculos/${veiculoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizacao)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            mostrarFeedback(`"${data.modelo}" atualizado com sucesso!`, 'success');
            await carregarGaragem();
            mostrarVeiculoContainer(data._id);
        } catch (error) {
            mostrarFeedback(error.message, 'error');
        }
    });

    cancelEditVeiculoBtn.addEventListener('click', () => {
        editVeiculoFormContainer.style.display = 'none';
        if(veiculoAtivoId) mostrarVeiculoContainer(veiculoAtivoId);
    });
});