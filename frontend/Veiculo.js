
// ginteligente/Veiculo.js
// Conteúdo COMPLETO da classe base (abstrata) Veiculo

// Importa funções auxiliares e a classe Manutencao
import { atualizarEstadoBotoes, atualizarStatusVeiculo, atualizarInfoVeiculo, mostrarFeedback, tocarSom } from './funcoesAuxiliares.js';
import { Manutencao } from './Manutencao.js'; 

/**
 * @class Veiculo
 * @abstract
 * @classdesc Classe abstrata que serve como base para todos os tipos de veículos (Carro, Moto, Bicicleta, etc.).
 * Não deve ser instanciada diretamente. Define funcionalidades e atributos comuns a todos os veículos.
 */
export class Veiculo {
    /**
     * Construtor da classe Veiculo.
     * @constructor
     * @param {string} m - O modelo do veículo (Ex: "Fusca", "Titan").
     * @param {string} c - A cor do veículo (Ex: "Azul", "Vermelho").
     * @param {string} [id=null] - ID opcional. Se não fornecido (primeira criação), será gerado. Usado para restaurar estado de veículos.
     * @param {Array} [historico=[]] - Array opcional de dados de histórico de manutenção (em formato JSON para recarregar).
     */
    constructor(m, c, id = null, historico = []) {
        // Impede que a classe abstrata 'Veiculo' seja instanciada diretamente.
        // O `this.constructor === Veiculo` verifica se a classe que está sendo instanciada é a própria `Veiculo`.
        if (this.constructor === Veiculo) {
            throw new Error("Erro: A classe abstrata 'Veiculo' não pode ser instanciada diretamente. Use uma subclasse como Carro, Moto, etc.");
        }
        
        /** @member {string} */
        this.modelo = m || 'Modelo Desconhecido'; // Define o modelo do veículo
        /** @member {string} */
        this.cor = c || 'Cor Indefinida'; // Define a cor do veículo
        /** @member {boolean} */
        this.ligado = false; // Estado inicial: desligado (para veículos com motor)
        /** @member {number} */
        this.velocidade = 0; // Velocidade inicial: 0 km/h

        // As propriedades `tipo` (tipo lógico, ex: 'carro') e `idPrefix` (prefixo para IDs HTML, ex: 'carro')
        // serão definidas por um método protegido nas subclasses (`_setTipoEIdPrefix`).
        this.tipo = ''; 
        this.idPrefix = '';
        this._setTipoEIdPrefix(); // Chamada inicial para definir tipo e prefixo ao instanciar uma subclasse

        /** @member {string} */
        // Gera um ID único se um não for fornecido. O ID é essencial para identificar veículos no sistema.
        // Combina o tipo, uma versão limpa do modelo, e um hash aleatório.
        this.id = id || `${this.tipo}_${(m || 'desconhecido').replace(/\s+/g, '_').toLowerCase()}_${Date.now().toString(36).substring(2, 7)}`;

        /** @member {Manutencao[]} */
        // Restaura ou inicializa o histórico de manutenções.
        // Mapeia os dados do histórico (que vêm em JSON ao carregar do localStorage) para instâncias de `Manutencao`.
        this.historicoManutencao = Array.isArray(historico)
            ? historico.map(item => Manutencao.fromJSON(item)).filter(m => m instanceof Manutencao)
            : [];
        // Ordena o histórico: os mais recentes primeiro
        this.historicoManutencao.sort((a, b) => b.data.getTime() - a.data.getTime());
    }

    /**
     * Método protegido para ser sobrescrito por subclasses. Define o `tipo` lógico do veículo
     * e o `idPrefix` (usado para encontrar elementos HTML relacionados na UI).
     * @function _setTipoEIdPrefix
     * @protected
     */
    _setTipoEIdPrefix() {
        // A lógica de detecção de classe para prefixos foi movida para este método.
        // A subclasse deve chamar este método ou sobrescrevê-lo completamente.
        // Para garantir, cada subclasse agora tem sua própria sobrescrita de `_setTipoEIdPrefix`.
        const className = this.constructor.name.toLowerCase();
        this.tipo = className; // Ex: 'carro', 'moto'
        this.idPrefix = className; // Usado para IDs no HTML (ex: 'carro-velocidade')

        // Ajustes para nomes de IDs específicos no HTML se eles não baterem com o nome da classe
        if (className === 'carroesportivo') this.idPrefix = 'esportivo';
    }

    /** @returns {string} O tipo lógico do veículo (ex: 'carro', 'esportivo'). */
    getTipo() { 
        return this.tipo; 
    }

    /** @returns {string} O prefixo de ID usado nos elementos HTML associados a este veículo (ex: 'carro', 'moto', 'esportivo'). */
    getIdPrefix() { 
        return this.idPrefix; 
    }

    /**
     * Um método wrapper que chama a função auxiliar `atualizarEstadoBotoes`, passando
     * a própria instância do veículo (`this`). Isso simplifica a chamada na aplicação principal.
     */
    atualizarEstadoBotoesWrapper() {
        atualizarEstadoBotoes(this); // A função `atualizarEstadoBotoes` (de funcoesAuxiliares.js) lida com a lógica.
    }

    /**
     * Liga o veículo (para veículos com motor). Se já estiver ligado, informa ao usuário.
     * Para bicicletas, este método é sobrescrito nas subclasses.
     * @param {object} sons - O objeto contendo os elementos de áudio (`window.sons`).
     */
    ligar(sons) {
        if (this.ligado) {
            mostrarFeedback(`${this.modelo} já está ligado!`, 'warning');
        } else {
            this.ligado = true;
            if (sons && sons.ligar) tocarSom(sons.ligar, 0.4); // Toca o som de ligar (se disponível)
            this.atualizarStatus(); // Atualiza o status visual (ex: de "Desligado" para "Ligado")
            this.atualizarEstadoBotoesWrapper(); // Reabilita botões como 'acelerar'
            mostrarFeedback(`${this.modelo} foi ligado.`, 'success');
        }
    }

    /**
     * Desliga o veículo. O veículo precisa estar parado para ser desligado.
     * Se estiver em movimento ou já desligado, informa ao usuário.
     * Para bicicletas, este método é sobrescrito nas subclasses.
     * @param {object} sons - O objeto contendo os elementos de áudio (`window.sons`).
     */
    desligar(sons) {
        if (!this.ligado) {
            mostrarFeedback(`${this.modelo} já está desligado.`, 'warning');
            return;
        }
        if (this.velocidade > 0) {
            mostrarFeedback(`${this.modelo} precisa parar completamente para desligar!`, 'warning');
            return;
        }
        this.ligado = false;
        this.velocidade = 0; // Garante que a velocidade esteja zerada ao desligar
        if (sons && sons.desligar) tocarSom(sons.desligar, 0.3); // Toca som de desligar (se disponível)
        this.atualizarStatus(); // Atualiza o status visual
        this.atualizarVelocidade(); // Garante que a velocidade exibida seja 0
        this.atualizarEstadoBotoesWrapper(); // Desabilita botões de movimento
        mostrarFeedback(`${this.modelo} foi desligado.`, 'info');
    }

    /**
     * Método protegido para verificar se o veículo está em condições de acelerar.
     * @protected
     * @returns {boolean} True se pode acelerar, false caso contrário.
     */
    acelerarBase() {
        // Veículos com motor precisam estar ligados para acelerar.
        if (this.tipo !== 'bicicleta' && !this.ligado) { // Bicicletas não precisam 'ligar'
            mostrarFeedback(`Por favor, ligue o ${this.modelo} antes de acelerar!`, 'warning');
            return false;
        }
        return true;
    }

    /**
     * Método protegido para verificar se o veículo está em condições de frear.
     * @protected
     * @returns {boolean} True se pode frear (está em movimento), false caso contrário.
     */
    frearBase() {
        if (this.velocidade <= 0) {
            // Não exibe feedback aqui; quem chama o `frearBase` pode decidir se quer dar feedback.
            return false;
        }
        return true;
    }

    // Métodos "abstratos": devem ser implementados pelas subclasses.
    // Exibem um warning se chamados diretamente na classe Veiculo.
    /** @abstract @param {object} sons - O objeto contendo os elementos de áudio. */
    acelerar(sons) { 
        console.warn(`[Veiculo] O método 'acelerar()' não está implementado na subclasse ${this.constructor.name}.`); 
        mostrarFeedback("Ação de acelerar não configurada para este veículo.", 'warning');
    }
    /** @abstract @param {object} sons - O objeto contendo os elementos de áudio. */
    frear(sons) { 
        console.warn(`[Veiculo] O método 'frear()' não está implementado na subclasse ${this.constructor.name}.`); 
        mostrarFeedback("Ação de frear não configurada para este veículo.", 'warning');
    }

    /**
     * Atualiza a exibição da velocidade do veículo na interface.
     */
    atualizarVelocidade() {
        atualizarInfoVeiculo(this.getIdPrefix(), { velocidade: this.velocidade }); // Chama função auxiliar
    }

    /**
     * Atualiza o status de operação do veículo na interface (ex: Ligado, Desligado, Parada, Pedalando).
     */
    atualizarStatus() {
        atualizarStatusVeiculo(this.getIdPrefix(), this.ligado, this.velocidade); // Chama função auxiliar
    }

     /**
      * Toca o som da buzina do veículo. Este é um comportamento padrão que pode ser sobrescrito nas subclasses.
      * @param {object} sons - O objeto contendo os elementos de áudio (`window.sons`).
      */
    buzinar(sons) {
        if (sons && sons.buzina) {
             tocarSom(sons.buzina, 0.5); // Toca o som de buzina padrão com volume 0.5
             console.log(`${this.modelo} buzinou!`);
        } else {
            console.warn("[Veiculo] Som de buzina padrão não encontrado!");
        }
        mostrarFeedback(`${this.modelo} buzinou!`, 'info');
    }

    /**
     * Adiciona um novo registro de manutenção ao histórico do veículo.
     * Valida o objeto de manutenção, adiciona-o e salva a garagem.
     * @param {Manutencao} manutencaoObj - Uma instância da classe `Manutencao`.
     * @returns {boolean} - Retorna `true` se a manutenção foi adicionada com sucesso, `false` caso contrário.
     */
    adicionarManutencao(manutencaoObj) {
        // Valida se o objeto recebido é de fato uma instância de Manutencao
        if (!(manutencaoObj instanceof Manutencao)) {
            mostrarFeedback("Erro interno: Objeto de manutenção inválido para adicionar.", 'error');
            console.error("[Veiculo] Tentativa de adicionar um objeto não-Manutencao ao histórico:", manutencaoObj);
            return false;
        }

        const validacao = manutencaoObj.validar(); // Valida os dados internos da Manutencao
        if (!validacao.valido) {
            // Se a validação falhar, exibe os erros para o usuário
            mostrarFeedback(`Erro nos dados da manutenção:\n- ${validacao.erros.join('\n- ')}`, 'error');
            return false;
        }

        this.historicoManutencao.push(manutencaoObj); // Adiciona a nova manutenção ao array de histórico
        // Reordena o histórico para que os registros mais recentes apareçam primeiro.
        this.historicoManutencao.sort((a, b) => b.data.getTime() - a.data.getTime());

        // Tenta salvar o estado atual da garagem na localStorage (requer `window.salvarGaragem` definida globalmente)
        if (typeof window.salvarGaragem === 'function') {
            window.salvarGaragem();
        } else {
            console.error("[Veiculo] A função global 'salvarGaragem()' não está definida! O histórico pode não ser persistido.");
        }

        this.atualizarDisplayManutencao(); // Atualiza a exibição das listas de manutenção na UI
        mostrarFeedback("Registro de manutenção adicionado com sucesso!", 'success');
        return true;
    }

    /**
     * Separa os registros de manutenção do veículo em histórico (manutenções passadas)
     * e agendamentos (manutenções futuras).
     * @returns {{historicoPassado: Manutencao[], agendamentosFuturos: Manutencao[]}} Um objeto contendo dois arrays de Manutencao.
     */
    getManutencoesSeparadas() {
        const agora = new Date(); // Data e hora atual para comparação
        const historicoPassado = [];
        const agendamentosFuturos = [];

        // Garante que historicoManutencao é um array para evitar erros
        if (!Array.isArray(this.historicoManutencao)) {
            this.historicoManutencao = [];
        }

        this.historicoManutencao.forEach(m => {
            // Verifica se 'm' é uma instância válida de Manutencao e se sua data é válida
            if (m instanceof Manutencao && m.data && !isNaN(m.data.getTime())) {
                if (m.data <= agora) { // Se a data da manutenção é igual ou anterior à data atual, é histórico
                    historicoPassado.push(m);
                } else { // Caso contrário, é um agendamento futuro
                    agendamentosFuturos.push(m);
                }
            } else {
                 console.warn("[Veiculo] Item inválido encontrado no histórico de manutenção:", m);
            }
        });

        // Ordena o histórico por data decrescente (mais recentes primeiro)
        historicoPassado.sort((a, b) => b.data.getTime() - a.data.getTime());
        // Ordena os agendamentos por data crescente (mais próximos primeiro)
        agendamentosFuturos.sort((a, b) => a.data.getTime() - b.data.getTime());

        return { historicoPassado, agendamentosFuturos };
    }

    /**
     * Atualiza as listas de histórico e agendamentos na interface do usuário (UI) do veículo.
     * Esta função depende de `atualizarDisplayManutencaoUI` definida no script principal.
     */
    atualizarDisplayManutencao() {
        // Chamada da função auxiliar que realmente manipula o DOM.
        // `atualizarDisplayManutencaoUI` é exportada de funcoesAuxiliares e depois importada no script.js.
        // Mas esta chamada aqui está incorreta porque atualizarDisplayManutencaoUI não está importada aqui
        // (ela precisa do elemento UL, que está no contexto do `script.js`).
        // Então, na prática, esta chamada deve ser um wrapper para uma função do script.js
        // A lógica de `script.js` agora lida com o `atualizarDisplayManutencaoUI` corretamente.
        // O `script.js` chamará `veiculo.atualizarDisplayManutencaoUI()` para cada instância.
        if (typeof window.atualizarDisplayManutencaoUI === 'function') {
            window.atualizarDisplayManutencaoUI(this);
        } else {
             // Caso a função global ainda não esteja acessível.
             // Para esta estrutura, é esperado que o script.js chame isto,
             // ou que este método aqui realmente tenha a lógica do DOM,
             // o que eu fiz em script.js em atualizarDisplayManutencaoUI.
             // Manterei esta lógica, mas é uma interação importante entre POO e o Script.js principal
        }
    }

     /**
      * Remove um registro de manutenção específico do histórico do veículo pelo seu ID único.
      * @param {string} idManutencao - O ID da manutenção a ser removida.
      * @returns {boolean} - True se a manutenção foi removida com sucesso, false caso contrário.
      */
     removerManutencao(idManutencao) {
        const index = this.historicoManutencao.findIndex(m => m.id === idManutencao);

        if (index > -1) { // Se a manutenção for encontrada
            this.historicoManutencao.splice(index, 1); // Remove 1 item a partir do índice encontrado

            // Salva o estado da garagem novamente após a remoção.
            if (typeof window.salvarGaragem === 'function') {
                window.salvarGaragem();
            } else {
                console.error("[Veiculo] A função global 'salvarGaragem()' não está definida! A remoção pode não ser persistida.");
            }

            this.atualizarDisplayManutencao(); // Atualiza a exibição da UI para refletir a remoção
            mostrarFeedback("Registro de manutenção removido com sucesso!", 'info');
            return true;
        } else {
            mostrarFeedback("Não foi possível encontrar o registro de manutenção para remover.", 'error');
            return false;
        }
    }

     /**
      * Converte o objeto `Veiculo` para um formato de objeto simples, adequado para serialização JSON
      * (para salvar na `localStorage` ou enviar via API). Este método é chamado automaticamente
      * quando `JSON.stringify()` é usado em uma instância de Veiculo.
      * @returns {object} Um objeto simples contendo os dados do veículo e suas manutenções para persistência.
      */
     toJSON() {
         return {
             id: this.id, // ID único do veículo
             tipo: this.tipo, // O tipo de veículo (ex: 'carro', 'esportivo') é essencial para recriar a instância correta
             modelo: this.modelo,
             cor: this.cor,
             // Você pode incluir a placa se ela for um atributo da classe Veiculo, exemplo: `placa: this.placa,`
             
             // Inclui atributos específicos de subclasses (como capacidade/carga para caminhão, turbo para esportivo)
             // Assegura que esses atributos só são incluídos se existirem e não forem undefined/null.
             ...(typeof this.capacidadeCarga !== 'undefined' && { capacidadeCarga: this.capacidadeCarga }), 
             ...(typeof this.cargaAtual !== 'undefined' && { cargaAtual: this.cargaAtual }),             
             ...(typeof this.turboAtivado !== 'undefined' && { turboAtivado: this.turboAtivado }), 

             // Converte cada objeto Manutencao no histórico para JSON antes de salvar
             historicoManutencao: this.historicoManutencao.map(m => m.toJSON())
         };
     }
}