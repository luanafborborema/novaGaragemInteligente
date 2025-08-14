// ginteligente/Bicicleta.js (ou a pasta onde estão suas classes JS)
// CONTEÚDO COMPLETO DO ARQUIVO: SUBSTITUA TUDO QUE JÁ EXISTE POR ISTO.

// Importa a classe base `Veiculo` da qual `Bicicleta` vai herdar. O caminho deve estar correto.
import { Veiculo } from './Veiculo.js'; 
// Importa funções auxiliares necessárias de `funcoesAuxiliares.js`.
import { tocarSom, animarVeiculo, mostrarFeedback } from './funcoesAuxiliares.js'; 
// (Nota: `atualizarStatusVeiculo` e `atualizarEstadoBotoes` são importadas na classe base `Veiculo.js` ou diretamente pelo `script.js` principal para manipulação do DOM.)

/**
 * @class Bicicleta
 * @extends Veiculo
 * @classdesc Representa uma bicicleta na Garagem Inteligente.
 * As bicicletas têm um comportamento simplificado de "ligar/desligar" (pois não possuem motor)
 * e métodos específicos para pedalar e frear.
 */
export class Bicicleta extends Veiculo {
    /**
     * Construtor da classe Bicicleta.
     * @constructor
     * @param {string} modelo - O modelo da bicicleta (ex: "Caloi 10").
     * @param {string} cor - A cor da bicicleta (ex: "Vermelha").
     * @param {string} [id=null] - ID opcional, usado principalmente para recarregar o veículo do `localStorage`.
     * @param {Array} [historico=[]] - Histórico de manutenções opcional, usado ao recarregar de JSON.
     */
    constructor(modelo, cor, id = null, historico = []) {
        // Chama o construtor da classe pai `Veiculo` para inicializar atributos básicos como modelo, cor, ID e histórico.
        super(modelo, cor, id, historico); 
        /** @member {boolean} */
        // Para a lógica da aplicação, a bicicleta é considerada "sempre pronta" ou "ligada" (pois não tem motor para ligar/desligar).
        this.ligado = true; 
        /** @member {number} */
        this.velocidade = 0; // Inicia a bicicleta parada.

        // Define o tipo e prefixo para o objeto e para uso em IDs de elementos HTML, específicos para "bicicleta".
        this._setTipoEIdPrefix(); 
        // Atualiza o display de status inicial da bicicleta na UI (deve ser "Parada").
        this.atualizarStatus();
    }

    /**
     * Sobrescreve o método `_setTipoEIdPrefix` da classe base (`Veiculo`) para definir o tipo e prefixo de ID como 'bicicleta'.
     * Isso garante que os elementos HTML na interface possam ser corretamente identificados para esta instância.
     * @override
     * @protected
     */
    _setTipoEIdPrefix() {
        this.tipo = 'bicicleta';
        this.idPrefix = 'bicicleta';
    }

    /**
     * Sobrescreve o método `ligar` da classe `Veiculo`.
     * Para uma bicicleta, não há uma ação de "ligar" um motor. Este método apenas fornece feedback ao usuário.
     * @override
     */
    ligar() {
        mostrarFeedback("A bicicleta já está pronta para pedalar! Use o botão 'Pedalar' para iniciar.", 'info');
        // Não altera o estado `this.ligado` nem os botões, pois a lógica de ligar/desligar é conceitualmente diferente para bicicletas.
    }

    /**
     * Sobrescreve o método `desligar` da classe `Veiculo`.
     * Para uma bicicleta, "desligar" significa parar. Este método dá feedback ao usuário baseado na velocidade.
     * @override
     */
    desligar() {
        mostrarFeedback(this.velocidade > 0 ? "Para desligar, primeiro use o freio e pare completamente!" : "A bicicleta já está parada. Nenhuma ação necessária.", 'info');
        // Não altera o estado `this.ligado`. A bicicleta só "para" ao frear a velocidade para 0.
    }

    /**
     * Sobrescreve o método `acelerar` da classe `Veiculo`. Para bicicletas, isso simula a ação de pedalar.
     * Aumenta a velocidade da bicicleta em um pequeno incremento.
     * @override
     * @param {object} sons - O objeto `window.sons` que contém os elementos de áudio para tocar.
     */
    acelerar(sons) { // Este método é chamado para a ação 'pedalar' na UI
        // Chama `acelerarBase()` da classe `Veiculo`. Para bicicleta, isso passa sempre, pois `this.ligado` é sempre `true`.
        if (!this.acelerarBase()) return; 
        
        this.velocidade += 5; // Aumenta a velocidade da bicicleta em 5 km/h por "pedalada".
        animarVeiculo(this.getIdPrefix(), 'acelerando'); // Aplica uma animação visual na imagem da bicicleta.
        this.atualizarVelocidade(); // Atualiza o display numérico da velocidade na UI.
        this.atualizarStatus(); // Atualiza o status textual (ex: "Parada" -> "Pedalando").
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado de habilitação/desabilitação dos botões da UI.

        // Tenta tocar um som específico de pedalar se configurado, ou um som genérico de acelerar (com volume baixo).
        if (sons && sons.pedal) tocarSom(sons.pedal, 0.4); // Exemplo: se `window.sons.pedal` existir.
        else if (sons && sons.acelerar) tocarSom(sons.acelerar, 0.2); // Fallback para som genérico de acelerar, bem baixo.
        mostrarFeedback(`${this.modelo} está pedalando a ${this.velocidade} km/h.`, 'info');
    }

    /**
     * Sobrescreve o método `frear` da classe `Veiculo`. Simula a ação de frear uma bicicleta.
     * Diminui a velocidade da bicicleta e, se a velocidade chega a zero, atualiza o status para "Parada".
     * @override
     * @param {object} sons - O objeto `window.sons` que contém os elementos de áudio para tocar.
     */
    frear(sons) {
        // Chama `frearBase()` da classe `Veiculo` para verificar se a bicicleta está em movimento.
        if (!this.frearBase()) return; 
        
        this.velocidade = Math.max(0, this.velocidade - 5); // Diminui a velocidade em 5 km/h, garantindo que não fique negativa.
        animarVeiculo(this.getIdPrefix(), 'freando'); // Aplica uma animação visual na imagem da bicicleta.
        this.atualizarVelocidade(); // Atualiza o display numérico da velocidade na UI.

        if (this.velocidade === 0) {
            this.atualizarStatus(); // Se a velocidade for zero, o status muda para "Parada".
            mostrarFeedback(`${this.modelo} parou completamente.`, 'info');
        } else {
            mostrarFeedback(`${this.modelo} está freando para ${this.velocidade} km/h.`, 'info');
        }
        this.atualizarEstadoBotoesWrapper(); // Atualiza o estado dos botões.

        // Tenta tocar um som específico de freio de bicicleta se configurado, ou um som genérico de frear.
        if (sons && sons.freioBike) tocarSom(sons.freioBike, 0.4); // Exemplo: se `window.sons.freioBike` existir.
        else if (sons && sons.frear) tocarSom(sons.frear, 0.3); // Fallback para som genérico de frear.
    }

    /**
     * Sobrescreve o método `buzinar` da classe `Veiculo`. Para bicicletas, simula tocar a campainha.
     * Toca um som específico de campainha, se disponível.
     * @override
     * @param {object} sons - O objeto `window.sons` que contém os elementos de áudio.
     */
    buzinar(sons) {
        // Se `window.sons.campainha` (um som de campainha específico) existir, toca-o.
        if (sons && sons.campainha) {
             tocarSom(sons.campainha, 0.5); // Toca o som da campainha.
             mostrarFeedback(`${this.modelo} tocou a campainha! Trim trim!`, 'info');
        } else {
            // Se não houver um som de campainha específico, chama o método `buzinar` da classe pai `Veiculo` como fallback.
            super.buzinar(sons); 
            mostrarFeedback(`${this.modelo} buzinou! (Som de campainha genérico)`, 'info');
        }
    }

    /**
     * Sobrescreve o método `atualizarStatus` da classe `Veiculo`.
     * Embora chame a versão do pai, esta é sobrescrita para garantir que a lógica
     * para bicicletas em `funcoesAuxiliares.js` seja aplicada.
     * @override
     */
    atualizarStatus() {
        // A função auxiliar `atualizarStatusVeiculo` (importada em `Veiculo.js` de `funcoesAuxiliares.js`)
        // já contém a lógica especial para o `idPrefix === 'bicicleta'` que define os status "Parada" ou "Pedalando".
        super.atualizarStatus(); // Chama a implementação do método na classe base.
    }

    // Os métodos `atualizarVelocidade`, `atualizarEstadoBotoesWrapper` e `toJSON` (para persistência)
    // são herdados diretamente da classe `Veiculo` e são suficientes, pois `Bicicleta` não introduz atributos adicionais que precisem ser salvos, além dos básicos e do histórico de manutenção.
}