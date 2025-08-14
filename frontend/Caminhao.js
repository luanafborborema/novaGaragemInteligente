// ginteligente/Caminhao.js
// Conteúdo COMPLETO da classe Caminhao

import { Carro } from './Carro.js'; // Caminhão herda de Carro (que por sua vez herda de Veiculo)
import { tocarSom, animarVeiculo, mostrarFeedback, atualizarInfoVeiculo } from './funcoesAuxiliares.js'; // Importa helpers específicos

/**
 * @class Caminhao
 * @extends Carro
 * @classdesc Representa um caminhão com funcionalidade de carga e capacidade,
 * estendendo a funcionalidade de um carro.
 */
export class Caminhao extends Carro {
    /**
     * Construtor da classe Caminhao.
     * @constructor
     * @param {string} modelo - O modelo do caminhão.
     * @param {string} cor - A cor do caminhão.
     * @param {number} [capacidade=5000] - A capacidade máxima de carga do caminhão em kg.
     * @param {string} [id] - ID opcional, usado ao recarregar de JSON (localStorage).
     * @param {Array} [historico] - Histórico de manutenções opcional, usado ao recarregar de JSON.
     * @param {number} [cargaAtual=0] - A carga atual do caminhão em kg, usada ao recarregar.
     */
    constructor(modelo, cor, capacidade = 5000, id = null, historico = [], cargaAtual = 0) {
        super(modelo, cor, id, historico); // Chama o construtor da classe Carro
        /** @member {number} */
        // Garante que a capacidade seja um número válido e não negativo, com 5000kg como padrão
        this.capacidadeCarga = Math.max(0, parseInt(capacidade, 10) || 5000);
        /** @member {number} */
        // Garante que a carga atual seja um número válido e não exceda a capacidade máxima
        this.cargaAtual = Math.max(0, Math.min(parseFloat(cargaAtual) || 0, this.capacidadeCarga));

        // Garante que o tipo e prefixo para elementos HTML sejam 'caminhao'
        this._setTipoEIdPrefix();
        this.atualizarInfoCaminhao(); // Atualiza o display de carga/capacidade inicial na UI
    }

    /**
     * Sobrescreve o método _setTipoEIdPrefix da classe base para definir o tipo e prefixo específicos de caminhão.
     * @override
     * @protected
     */
    _setTipoEIdPrefix() {
        this.tipo = 'caminhao'; // Define o tipo lógico do veículo
        this.idPrefix = 'caminhao'; // Define o prefixo usado nos IDs dos elementos HTML
    }

    /**
     * Carrega uma determinada quantidade de carga no caminhão.
     * @param {number|string} quantidade - A quantidade de carga a ser carregada em kg.
     * @returns {boolean} - Retorna true se a carga foi bem-sucedida, false caso contrário.
     */
    carregar(quantidade) {
        if (!this.ligado) {
             mostrarFeedback("Por favor, ligue o caminhão para carregar a carga.", 'warning');
             return false;
        }
        const q = parseFloat(quantidade); // Converte a quantidade para um número flutuante
        if (isNaN(q) || q <= 0) {
            mostrarFeedback("Quantidade de carga inválida. Informe um número positivo.", 'error');
            return false;
        }
        // Verifica se a carga a ser adicionada não excede a capacidade máxima
        if (this.cargaAtual + q <= this.capacidadeCarga) {
            this.cargaAtual += q; // Adiciona a carga
            this.atualizarInfoCaminhao(); // Atualiza o display de carga/capacidade na UI
            mostrarFeedback(`Caminhão carregado com ${q}kg. Carga atual: ${this.cargaAtual}/${this.capacidadeCarga}kg.`, 'success');
            // Chama a função global para salvar a garagem no localStorage
            if (typeof window.salvarGaragem === 'function') window.salvarGaragem();
            this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões (ex: habilita descarregar)
            return true;
        } else {
            const espacoLivre = this.capacidadeCarga - this.cargaAtual;
            mostrarFeedback(`Não é possível carregar ${q}kg. Capacidade máxima de ${this.capacidadeCarga}kg será excedida. Espaço livre: ${espacoLivre.toFixed(2)}kg.`, 'error');
            return false;
        }
    }

    /**
     * Descarrega uma determinada quantidade de carga do caminhão.
     * @param {number|string} quantidade - A quantidade de carga a ser descarregada em kg.
     * @returns {boolean} - Retorna true se a descarga foi bem-sucedida, false caso contrário.
     */
    descarregar(quantidade) {
         if (!this.ligado) {
             mostrarFeedback("Por favor, ligue o caminhão para descarregar a carga.", 'warning');
             return false;
        }
        const q = parseFloat(quantidade);
        if (isNaN(q) || q <= 0) {
            mostrarFeedback("Quantidade a descarregar inválida. Informe um número positivo.", 'error');
            return false;
        }
        // Verifica se há carga suficiente para descarregar a quantidade solicitada
        if (this.cargaAtual >= q) {
            this.cargaAtual -= q; // Remove a carga
            this.atualizarInfoCaminhao(); // Atualiza o display de carga/capacidade na UI
            mostrarFeedback(`Caminhão descarregado em ${q}kg. Carga restante: ${this.cargaAtual}kg.`, 'success');
            if (typeof window.salvarGaragem === 'function') window.salvarGaragem(); // Salva estado
             this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões (ex: desabilita descarregar se carga for 0)
            return true;
        } else {
            mostrarFeedback(`Não é possível descarregar ${q}kg. Carga atual é de apenas ${this.cargaAtual}kg.`, 'error');
            return false;
        }
    }

    /**
     * Atualiza os elementos HTML que exibem a carga atual e a capacidade de carga do caminhão.
     */
    atualizarInfoCaminhao() {
        // A função auxiliar `atualizarInfoVeiculo` atualiza partes da interface com base nos dados
        atualizarInfoVeiculo(this.getIdPrefix(), {
            carga: this.cargaAtual,
            capacidade: this.capacidadeCarga
        });
    }

    /**
     * Acelera o caminhão. O desempenho da aceleração é afetado pela quantidade de carga.
     * Caminhões aceleram mais lentamente, e mais ainda se estiverem muito carregados.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    acelerar(sons) {
        if (!this.acelerarBase()) return; // Verifica se o caminhão está ligado

        // Calcula um fator de desempenho com base na carga: quanto maior a carga, menor o fator.
        // A carga total para calcular o fator é multiplicada por 1.5 para um efeito mais perceptível
        const fatorCarga = 1 - (this.cargaAtual / (this.capacidadeCarga * 1.5)); 
        // Garante que o fator não seja negativo e tenha um valor mínimo para evitar divisão por zero ou aceleração muito baixa.
        const incrementoBase = 8; // Incremento de velocidade base para caminhão (menor que carro)
        const incremento = Math.max(1, incrementoBase * fatorCarga); // Acelera pelo menos 1km/h

        this.velocidade += incremento; // Adiciona o incremento à velocidade
        if (sons && sons.acelerar) tocarSom(sons.acelerar, 0.4); // Toca um som de motor pesado/caminhão
        animarVeiculo(this.getIdPrefix(), 'acelerando'); // Anima o caminhão
        this.atualizarVelocidade(); // Atualiza o display da velocidade
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões
    }

    /**
     * Freia o caminhão. A eficiência da frenagem também é afetada pela carga.
     * Caminhões freiam mais lentamente, e mais ainda se estiverem muito carregados.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    frear(sons) {
        if (!this.frearBase()) return; // Verifica se o caminhão está em movimento

        // Calcula um fator de frenagem: quanto maior a carga, mais difícil frear (maior o fator).
        const fatorCarga = 1 + (this.cargaAtual / (this.capacidadeCarga * 2)); 
        // Garante um decremento mínimo para frear.
        const decrementoBase = 12; // Decremento de velocidade base para caminhão (maior que aceleração, mas menor que carro freando)
        const decremento = Math.max(2, decrementoBase / fatorCarga); 

        this.velocidade = Math.max(0, this.velocidade - decremento); // Diminui a velocidade
        if (sons && sons.frearCaminhao) tocarSom(sons.frearCaminhao, 0.6); // Ex: som de freio a ar de caminhão
        else if (sons && sons.frear) tocarSom(sons.frear, 0.5); // Fallback para som genérico de freio
        animarVeiculo(this.getIdPrefix(), 'freando'); // Anima o caminhão
        this.atualizarVelocidade(); // Atualiza o display da velocidade

        if (this.velocidade === 0) {
            this.atualizarStatus(); // Atualiza o status se parou
        }
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões
    }

    /**
     * Toca a buzina do caminhão. Geralmente um som mais grave e alto.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    buzinar(sons) {
        // Se houver um som de buzina específico para caminhão (ex: sons.buzinaCaminhao)
        if (sons && sons.buzinaCaminhao) tocarSom(sons.buzinaCaminhao, 0.9); // Alto volume
        else super.buzinar(sons); // Caso contrário, usa o método `buzinar` da classe pai (`Carro` ou `Veiculo`)
        mostrarFeedback(`${this.modelo} buzinou! FOOM!`, 'info');
    }

    /**
     * Sobrescreve o método `toJSON` da classe pai (`Carro`) para incluir `capacidadeCarga` e `cargaAtual`.
     * Isso garante que os atributos específicos do caminhão sejam salvos e restaurados corretamente no `localStorage`.
     * @override
     * @returns {object} Um objeto simples contendo os dados do caminhão para serialização JSON.
     */
    toJSON() {
        const data = super.toJSON(); // Pega os dados da classe pai (`Carro`, que já pega de `Veiculo`)
        data.capacidadeCarga = this.capacidadeCarga; // Adiciona a capacidade de carga
        data.cargaAtual = this.cargaAtual; // Adiciona a carga atual
        return data;
    }
}