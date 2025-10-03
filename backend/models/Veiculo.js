// models/Veiculo.js

import mongoose from 'mongoose';

const VeiculoSchema = new mongoose.Schema({
    modelo: {
        type: String,
        required: [true, 'O modelo é obrigatório.'],
        trim: true
    },
    cor: {
        type: String,
        required: [true, 'A cor é obrigatória.'],
        trim: true
    },
    placa: {
        type: String,
        required: [true, 'A placa é obrigatória para veículos com registro.'],
        unique: true, // Garante que não haverá placas duplicadas
        uppercase: true,
        trim: true
    },
    marca: {
        type: String,
        required: [true, 'A marca é obrigatória.'],
        trim: true
    },
    ano: {
        type: Number,
        required: [true, 'O ano é obrigatório.'],
        min: [1900, 'O ano mínimo permitido é 1900.']
    },
    // NOVIDADE IMPORTANTE: Campo para armazenar o tipo do veículo (carro, moto, etc.)
    tipo: {
        type: String,
        required: [true, 'O tipo de veículo é obrigatório.'],
        enum: ['carro', 'esportivo', 'caminhao', 'moto', 'bicicleta'] // Garante que apenas estes valores são aceitos
    },
    // Campos opcionais que dependem do tipo
    capacidadeCarga: {
        type: Number
    },
    cargaAtual: {
        type: Number
    },
    turboAtivado: {
        type: Boolean
    }
    ,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true // Adiciona campos createdAt e updatedAt automaticamente
});

const Veiculo = mongoose.model('Veiculo', VeiculoSchema);

export default Veiculo;