// server.js

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Veiculo from './models/Veiculo.js';
import Manutencao from './models/Manutencao.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUriCrud = process.env.MONGO_URI_CRUD;

async function connectCrudDB() {
  if (mongoose.connections[0].readyState) {
    console.log("✅ Mongoose já está conectado.");
    return;
  }

  if (!mongoUriCrud) {
    console.error("❌ ERRO: MONGO_URI_CRUD não está definida! Por favor, defina-a no .env (local) ou nas variáveis de ambiente do Render (deploy).");
    return;
  }

  try {
    await mongoose.connect(mongoUriCrud, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    console.log("🚀 Conectado ao MongoDB Atlas!");

    mongoose.connection.on('disconnected', () =>
      console.warn("⚠️ Mongoose foi desconectado!")
    );

    mongoose.connection.on('error', (err) =>
      console.error("❌ Erro de conexão Mongoose:", err)
    );

  } catch (err) {
    console.error("❌ Falha ao conectar ao MongoDB:", err.message);
  }
}

connectCrudDB();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// CRUD de Veículos
app.post('/api/veiculos', async (req, res) => {
    try {
        const novoVeiculoData = req.body;
        const veiculoCriado = await Veiculo.create(novoVeiculoData);
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Erro: Veículo com esta placa já existe.' });
        }
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ error: `Erros de validação: ${messages.join(' ')}` });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao criar veículo.' });
    }
});

app.get('/api/veiculos', async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find();
        res.json(todosOsVeiculos);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor ao buscar veículos.' });
    }
});

app.put('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dadosAtualizacao = req.body;
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, dadosAtualizacao, { new: true, runValidators: true });
        if (!veiculoAtualizado) {
            return res.status(404).json({ error: 'Veículo não encontrado para atualização.' });
        }
        res.json(veiculoAtualizado);
    } catch (error) {
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ error: 'ID de veículo inválido ou formato incorreto.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar veículo.' });
    }
});

app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const veiculoDeletado = await Veiculo.findByIdAndDelete(id);
        if (!veiculoDeletado) {
            return res.status(404).json({ error: 'Veículo não encontrado para remoção.' });
        }
        res.status(200).json({ message: 'Veículo removido com sucesso.', veiculo: veiculoDeletado });
    } catch (error) {
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ error: 'ID de veículo inválido ou formato incorreto.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao deletar veículo.' });
    }
});

// Rotas de Manutenção
app.post('/api/veiculos/:veiculoId/manutencoes', async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) {
            return res.status(404).json({ error: 'Veículo não encontrado. Impossível adicionar manutenção.' });
        }
        const novaManutencao = await Manutencao.create({
            ...req.body,
            veiculo: veiculoId
        });
        res.status(201).json(novaManutencao);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: `Erros de validação: ${messages.join(' ')}` });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao criar manutenção.' });
    }
});

app.get('/api/veiculos/:veiculoId/manutencoes', async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) {
            return res.status(404).json({ error: 'Veículo não encontrado.' });
        }
        const manutencoes = await Manutencao.find({ veiculo: veiculoId }).sort({ data: -1 });
        res.status(200).json(manutencoes);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor ao buscar manutenções.' });
    }
});

// Previsão do Tempo
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
app.get('/api/previsao/:cidade', async (req, res) => {
  const { cidade } = req.params;
  if (!OPENWEATHER_API_KEY) {
    return res.status(500).json({ error: 'Chave de API do clima não configurada no servidor.' });
  }
  try {
    const urlOpenWeather = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`;
    const responseOpenWeather = await fetch(urlOpenWeather); // Usando o fetch nativo
    if (!responseOpenWeather.ok) {
      const errorData = await responseOpenWeather.json().catch(() => ({}));
      return res.status(responseOpenWeather.status).json({ error: errorData.message || 'Erro na API externa.' });
    }
    const data = await responseOpenWeather.json();
    const previsaoFormatada = {
      nomeCidade: data.name,
      pais: data.sys.country,
      temperaturaAtual: data.main.temp,
      sensacaoTermica: data.main.feels_like,
      temperaturaMax: data.main.temp_max,
      temperaturaMin: data.main.temp_min,
      descricaoClima: data.weather[0].description,
      iconeClima: data.weather[0].icon,
      velocidadeVento: data.wind.speed
    };
    res.json(previsaoFormatada);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor ao processar a previsão.' });
  }
});

// Rotas da Garagem
const veiculosDestaque = [
  { id: 1, modelo: "Tesla Cybertruck", ano: 2024, destaque: "Design Futurista, Elétrico e Potente", imagemUrl: "imagens/tesla.jpeg" },
  { id: 2, modelo: "Ford Maverick Híbrida", ano: 2023, destaque: "Picape compacta, híbrida e versátil", imagemUrl: "imagens/maverick.jpeg" },
  { id: 3, modelo: "Porsche Taycan", ano: 2022, destaque: "Esportivo elétrico de alta performance", imagemUrl: "imagens/porsche.jpeg" },
  { id: 4, modelo: "Honda Civic Type R", ano: 2024, destaque: "Carro esportivo de alto desempenho", imagemUrl: "imagens/civic.jpeg" }
];
app.get('/api/garagem/veiculos-destaque', (req, res) => res.json(veiculosDestaque));

const servicosGaragem = [
  { id: "S01", nome: "Troca de Óleo e Filtro", descricao: "Uso de óleo sintético de alta qualidade e troca de filtro de óleo.", precoEstimado: "R$ 250,00" },
  { id: "S02", nome: "Balanceamento e Alinhamento", descricao: "Equilíbrio de rodas e ajuste da geometria da suspensão para sua segurança.", precoEstimado: "R$ 180,00" },
  { id: "S03", nome: "Revisão Geral do Sistema de Freios", descricao: "Verificação completa de pastilhas, discos, fluido e ajuste geral do sistema.", precoEstimado: "R$ 350,00" }
];
app.get('/api/garagem/servicos-oferecidos', (req, res) => res.json(servicosGaragem));

const ferramentasEssenciais = [
  { id: "F01", nome: "Jogo de Chaves Combinadas", utilidade: "Para parafusos e porcas de diferentes tamanhos, essencial para pequenos reparos.", categoria: "Manual" },
  { id: "F02", nome: "Macaco Hidráulico Automotivo", utilidade: "Para levantar veículos com segurança durante a troca de pneus ou manutenções.", categoria: "Elevação" },
  { id: "F03", nome: "Chave de Impacto Elétrica", utilidade: "Facilita a remoção e aperto rápido de porcas de roda e outros fixadores pesados.", categoria: "Elétrica" }
];
app.get('/api/garagem/ferramentas-essenciais/:idFerramenta', (req, res) => {
  const { idFerramenta } = req.params;
  const ferramenta = ferramentasEssenciais.find(f => f.id === idFerramenta);
  if (ferramenta) {
    res.json(ferramenta);
  } else {
    res.status(404).json({ error: 'Ferramenta não encontrada com o ID fornecido.' });
  }
});

// Rota Raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor rodando na porta ${PORT}`);
});