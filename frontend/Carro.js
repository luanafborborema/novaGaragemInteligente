// ginteligente/Carro.js
// Conteúdo COMPLETO da classe Carro

import { Veiculo } from './Veiculo.js'; // Carro herda da classe base Veiculo
import { tocarSom, animarVeiculo, mostrarFeedback } from './funcoesAuxiliares.js'; // Importa helpers específicos

/**
 * @class Carro
 * @extends Veiculo
 * @classdesc Representa um carro comum, herdando as características básicas de um Veículo.
 */
export class Carro extends Veiculo {
    /**
     * Construtor da classe Carro.
     * @constructor
     * @param {string} modelo - O modelo do carro.
     * @param {string} cor - A cor do carro.
     * @param {string} [id] - ID opcional, usado ao recarregar de JSON (localStorage).
     * @param {Array} [historico] - Histórico de manutenções opcional, usado ao recarregar de JSON.
     */
    constructor(modelo, cor, id = null, historico = []) {
        // Chama o construtor da classe pai (Veiculo)
        super(modelo, cor, id, historico);
        // Atributos específicos do Carro, se houver, seriam inicializados aqui.
        // Por exemplo, tipo de pneu, número de portas, etc.
        // Garante que o tipo e prefixo para elementos HTML sejam 'carro'
        this._setTipoEIdPrefix(); // Chama para garantir que o tipo e idPrefix sejam 'carro'
    }

    /**
     * Sobrescreve o método _setTipoEIdPrefix da classe base para definir o tipo e prefixo específicos de carro.
     * @override
     * @protected
     */
    _setTipoEIdPrefix() {
        this.tipo = 'carro'; // Define o tipo lógico do veículo
        this.idPrefix = 'carro'; // Define o prefixo usado nos IDs dos elementos HTML
    }

    /**
     * Aumenta a velocidade do carro em uma quantidade padrão.
     * Este método sobrescreve o método `acelerar` da classe `Veiculo`.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    acelerar(sons) {
        // Chama `acelerarBase()` da classe `Veiculo` para verificar se o carro está ligado e pode acelerar
        if (!this.acelerarBase()) return; // Se o carro não estiver ligado, o feedback já será dado por `acelerarBase`.

        this.velocidade += 10; // Aumenta a velocidade em 10 km/h
        if (sons && sons.acelerar) tocarSom(sons.acelerar, 0.5); // Toca o som de acelerar
        animarVeiculo(this.getIdPrefix(), 'acelerando'); // Anima a imagem do carro na UI
        this.atualizarVelocidade(); // Atualiza o display da velocidade na UI
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões de ação
    }

    /**
     * Diminui a velocidade do carro.
     * Este método sobrescreve o método `frear` da classe `Veiculo`.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    frear(sons) {
        // Chama `frearBase()` da classe `Veiculo` para verificar se o carro está em movimento
        if (!this.frearBase()) return; // Se o carro já estiver parado, a função simplesmente retorna.

        this.velocidade = Math.max(0, this.velocidade - 10); // Diminui a velocidade em 10 km/h, garantindo que não seja menor que 0
        if (sons && sons.frear) tocarSom(sons.frear, 0.5); // Toca o som de frear
        animarVeiculo(this.getIdPrefix(), 'freando'); // Anima a imagem do carro na UI
        this.atualizarVelocidade(); // Atualiza o display da velocidade na UI

        // Se o carro parou completamente após frear
        if (this.velocidade === 0) {
            this.atualizarStatus(); // Atualiza o status para "Parado" na UI
        }
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões (ex: desabilita freio se parado)
    }

    /**
     * Toca a buzina do carro. Este método sobrescreve o método `buzinar` da classe `Veiculo`.
     * Se um som específico para buzina de carro estiver disponível, ele o utiliza; caso contrário,
     * chama o método `buzinar` da superclasse para usar o som padrão.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    buzinar(sons) {
        // Verifica se há um som de buzina específico para carro (ex: sons.buzinaCarro)
        if (sons && sons.buzinaCarro) { 
            tocarSom(sons.buzinaCarro, 0.6); // Toca o som com um volume específico
        } else {
            // Se não houver som específico, chama o método `buzinar` da classe `Veiculo` (pai)
            super.buzinar(sons); 
        }
        mostrarFeedback(`${this.modelo} buzinou!`, 'info'); // Feedback na UI
    }

    // Os métodos `atualizarVelocidade`, `atualizarStatus`, `ligar`, `desligar`, etc.,
    // são herdados de `Veiculo` e são usados diretamente ou adaptados conforme a necessidade.
    // O método `toJSON` padrão de `Veiculo` também serve aqui, pois `Carro` (comum) não introduz
    // atributos específicos que precisem de salvamento extra além dos de `Veiculo`.
}