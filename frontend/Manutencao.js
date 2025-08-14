// ginteligente/Manutencao.js
// Conteúdo COMPLETO da classe Manutencao

/**
 * @class Manutencao
 * @classdesc Representa um registro de manutenção para um veículo.
 * Guarda informações como data, tipo de serviço, custo e uma descrição.
 */
export class Manutencao {
    /**
     * Construtor da classe Manutencao.
     * @constructor
     * @param {string} d - A data e hora da manutenção no formato de input HTML (YYYY-MM-DDTHH:mm).
     * @param {string} t - O tipo de manutenção (ex: "Troca de Óleo", "Revisão de Freios").
     * @param {number|string} c - O custo da manutenção.
     * @param {string} [ds=''] - Uma descrição opcional da manutenção.
     */
    constructor(d, t, c, ds = '') {
        /** @member {Date} */
        // Tenta criar um objeto Date a partir da string fornecida. 
        // Adapta o formato "YYYY-MM-DDTHH:mm" (datetime-local) para ser reconhecido como "YYYY-MM-DD HH:mm".
        this.data = d ? new Date(d.replace('T', ' ')) : new Date('invalid date'); 
        if (isNaN(this.data.getTime())) { // Se o primeiro parse falhar, tenta como string ISO padrão
             this.data = d ? new Date(d) : new Date('invalid date');
        }

        /** @member {string} */
        this.tipo = t ? t.trim() : ''; // Remove espaços em branco
        /** @member {number} */
        // Converte o custo para um número flutuante; garante que não seja negativo, 0 se for inválido
        this.custo = parseFloat(c);
        if (isNaN(this.custo) || this.custo < 0) this.custo = 0; 

        /** @member {string} */
        this.descricao = ds ? ds.trim() : ''; // Remove espaços em branco
        
        /** @member {string} */
        // Gera um ID único para cada registro de manutenção, usando timestamp e um valor aleatório.
        this.id = `manut_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    }

    /**
     * Valida os dados do registro de manutenção para garantir que são válidos.
     * @function validar
     * @returns {{valido: boolean, erros: string[]}} - Um objeto contendo:
     * - `valido`: um booleano (true se os dados são válidos, false caso contrário).
     * - `erros`: um array de strings descrevendo os problemas encontrados.
     */
    validar() {
        const erros = []; // Array para armazenar mensagens de erro
        if (isNaN(this.data.getTime())) erros.push("Data/Hora inválida."); // Verifica se a data foi parseada corretamente
        if (!this.tipo) erros.push("O campo 'Tipo de Serviço' é obrigatório."); // Verifica se o tipo não está vazio
        if (isNaN(this.custo) || this.custo < 0) erros.push("O 'Custo' é inválido (deve ser um número igual ou maior que zero)."); // Verifica o custo
        return { valido: erros.length === 0, erros: erros }; // Retorna o resultado da validação
    }

    /**
     * Formata os detalhes da manutenção para exibição em uma lista de histórico (para registros passados).
     * Inclui um botão de remover o registro.
     * @function formatarParaHistorico
     * @returns {string} - Uma string HTML formatada com os detalhes e o botão de remoção.
     */
    formatarParaHistorico() {
        // Formata a data (dia/mês/ano) e o custo em moeda local (BRL)
        const dataFormatada = !isNaN(this.data.getTime()) ? this.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data Inv.';
        const custoFormatado = this.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // CORRIGIDO AQUI! Antes estava 'cFo - matado', agora é 'custoFormatado'
        let textoManutencao = `${this.tipo} em ${dataFormatada} - ${custoFormatado}`; 
        if (this.descricao) textoManutencao += ` (${this.descricao})`; // Adiciona descrição se existir
        
        // Retorna o HTML com o texto e o botão de remover (com o ID da manutenção no atributo data-id)
        return `${textoManutencao} <button class="remover-manutencao-btn" data-id="${this.id}" title="Remover registro">🗑️</button>`;
    }

    /**
     * Formata os detalhes da manutenção para exibição em uma lista de agendamentos (para registros futuros).
     * Inclui um botão de remover o agendamento.
     * @function formatarParaAgendamento
     * @returns {string} - Uma string HTML formatada com os detalhes e o botão de remoção.
     */
    formatarParaAgendamento() {
        // Formata a data e hora completas e o custo em moeda local (BRL)
        const dataHoraFormatada = !isNaN(this.data.getTime()) ? this.data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data/Hora Inv.';
        const custoFormatado = this.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        let textoAgendamento = `${this.tipo} p/ ${dataHoraFormatada} - ${custoFormatado}`;
        if (this.descricao) textoAgendamento += ` (${this.descricao})`;
        
        // Retorna o HTML com o texto e o botão de remover (com o ID da manutenção no atributo data-id)
        return `${textoAgendamento} <button class="remover-manutencao-btn" data-id="${this.id}" title="Remover agendamento">🗑️</button>`;
    }

    /**
     * Converte o objeto `Manutencao` para um formato de objeto simples, adequado para serialização JSON
     * (salvar na `localStorage` ou enviar via API).
     * @function toJSON
     * @returns {object} - Um objeto JavaScript simples contendo as propriedades relevantes para persistência.
     */
    toJSON() {
        return {
            // Salva a data como uma string ISO para manter o formato consistente ao salvar/carregar
            data: !isNaN(this.data.getTime()) ? this.data.toISOString() : null,
            tipo: this.tipo,
            custo: this.custo,
            descricao: this.descricao,
            id: this.id // Salva o ID único
        };
    }

    /**
     * Método estático para recriar uma instância de `Manutencao` a partir de um objeto JSON.
     * Útil ao carregar dados do `localStorage` ou de uma API.
     * @static
     * @function fromJSON
     * @param {object} jsonObject - O objeto JSON a ser convertido.
     * @returns {Manutencao|null} - Uma nova instância de `Manutencao` ou `null` se o `jsonObject` for inválido.
     */
    static fromJSON(jsonObject) {
        // Validação básica do objeto JSON recebido
        if (!jsonObject || typeof jsonObject.tipo === 'undefined' || typeof jsonObject.custo === 'undefined' || typeof jsonObject.data === 'undefined' || !jsonObject.id) {
             console.error("Objeto JSON inválido fornecido para Manutencao.fromJSON:", jsonObject);
             return null; // Retorna null se os dados essenciais não estiverem presentes
        }
        // Cria uma nova instância de Manutencao usando os dados do JSON.
        // O construtor Manutencao já lida com o parse da data string para Date.
        const m = new Manutencao(jsonObject.data, jsonObject.tipo, jsonObject.custo, jsonObject.descricao);
        m.id = jsonObject.id; // Garante que o ID original seja restaurado.
        return m;
    }
}