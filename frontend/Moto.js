// ginteligente/Moto.js
// Conteúdo COMPLETO da classe Moto

import { Veiculo } from './Veiculo.js'; // Moto herda da classe base Veiculo
import { tocarSom, animarVeiculo, mostrarFeedback } from './funcoesAuxiliares.js'; // Importa helpers específicos

/**
 * @class Moto
 * @extends Veiculo
 * @classdesc Representa uma moto, estendendo a funcionalidade de um Veículo básico.
 */
export class Moto extends Veiculo {
    /**
     * Construtor da classe Moto.
     * @constructor
     * @param {string} modelo - O modelo da moto.
     * @param {string} cor - A cor da moto.
     * @param {string} [id] - ID opcional, usado ao recarregar de JSON (localStorage).
     * @param {Array} [historico] - Histórico de manutenções opcional, usado ao recarregar de JSON.
     */
    constructor(modelo, cor, id = null, historico = []) {
        super(modelo, cor, id, historico); // Chama o construtor da classe pai (Veiculo)
        // Garante que o tipo e prefixo para elementos HTML sejam 'moto'
        this._setTipoEIdPrefix();
    }

    /**
     * Sobrescreve o método _setTipoEIdPrefix da classe base para definir o tipo e prefixo específicos de moto.
     * @override
     * @protected
     */
    _setTipoEIdPrefix() {
        this.tipo = 'moto'; // Define o tipo lógico
        this.idPrefix = 'moto'; // Define o prefixo usado para IDs HTML (ex: 'moto-velocidade')
    }

    /**
     * Aumenta a velocidade da moto. As motos geralmente têm uma aceleração rápida.
     * Este método sobrescreve o método `acelerar` da classe `Veiculo`.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    acelerar(sons) {
        // Chama `acelerarBase()` da classe `Veiculo` para verificar se a moto está ligada
        if (!this.acelerarBase()) return; 

        this.velocidade += 18; // Incrementa a velocidade (aceleração mais rápida que um carro comum)
        if (sons && sons.acelerar) tocarSom(sons.acelerar, 0.6); // Som de aceleração de moto
        animarVeiculo(this.getIdPrefix(), 'acelerando'); // Anima a imagem da moto
        this.atualizarVelocidade(); // Atualiza o display da velocidade na UI
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões (ex: freio é habilitado)
    }

    /**
     * Diminui a velocidade da moto. As motos geralmente têm uma frenagem eficiente.
     * Este método sobrescreve o método `frear` da classe `Veiculo`.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    frear(sons) {
        // Chama `frearBase()` da classe `Veiculo` para verificar se a moto está em movimento
        if (!this.frearBase()) return; 

        this.velocidade = Math.max(0, this.velocidade - 15); // Decremento da velocidade (frenagem eficiente)
        if (sons && sons.frear) tocarSom(sons.frear, 0.7); // Som de freio de moto
        animarVeiculo(this.getIdPrefix(), 'freando'); // Anima a imagem da moto
        this.atualizarVelocidade(); // Atualiza o display da velocidade na UI

        if (this.velocidade === 0) {
            this.atualizarStatus(); // Se parou, atualiza o status na UI
        }
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões (ex: freio é desabilitado)
    }

    /**
     * Toca a buzina da moto. Pode ser um som diferente/mais agudo.
     * @override
     * @param {object} sons - O objeto global contendo elementos de áudio (`window.sons`).
     */
    buzinar(sons) {
        // Se houver um som de buzina específico para moto (ex: sons.buzinaMoto)
        if (sons && sons.buzinaMoto) tocarSom(sons.buzinaMoto, 0.6); 
        else super.buzinar(sons); // Caso contrário, chama o método `buzinar` da classe pai (`Veiculo`)
        mostrarFeedback(`${this.modelo} buzinou! Bibi!`, 'info');
    }

    // Os métodos atualizarVelocidade, atualizarStatus, ligar, desligar, etc.,
    // são herdados de Veiculo e funcionam corretamente.
    // O toJSON padrão de Veiculo também serve aqui, pois Moto não tem atributos
    // extras que precisam ser salvos.
}