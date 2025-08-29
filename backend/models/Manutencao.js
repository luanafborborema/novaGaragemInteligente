import mongoose from 'mongoose';

// Este é o Schema, ou "molde", para cada registro de manutenção no MongoDB.
const manutencaoSchema = new mongoose.Schema({
  // Descrição do serviço: um texto obrigatório.
  descricaoServico: {
    type: String,
    required: [true, 'A descrição do serviço é obrigatória.'],
    trim: true
  },
  // Data da manutenção: obrigatória, com valor padrão para o momento da criação.
  data: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Custo do serviço: número obrigatório, não pode ser negativo.
  custo: {
    type: Number,
    required: [true, 'O custo é obrigatório.'],
    min: [0, 'O custo não pode ser negativo.']
  },
  // Quilometragem do veículo no momento da manutenção: número, não pode ser negativo.
  quilometragem: {
    type: Number,
    min: [0, 'A quilometragem não pode ser negativa.'],
    default: 0
  },
  
  // O CAMPO MAIS IMPORTANTE: A CONEXÃO COM O VEÍCULO!
  // Aqui guardamos o _id de um documento da coleção 'veiculos'.
  veiculo: {
    type: mongoose.Schema.Types.ObjectId, // Tipo especial para guardar IDs do MongoDB.
    ref: 'Veiculo',                       // Informa ao Mongoose que este ID se refere a um modelo 'Veiculo'.
    required: [true, 'A manutenção deve estar associada a um veículo.']
  }
}, {
  // Adiciona os campos createdAt e updatedAt automaticamente, o que é uma ótima prática.
  timestamps: true
});

// Cria o modelo 'Manutencao' a partir do schema definido acima.
const Manutencao = mongoose.model('Manutencao', manutencaoSchema);

// Exporta o modelo para que possamos usá-lo em outros arquivos (como o server.js).
export default Manutencao;