// server.js

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Veiculo from './models/Veiculo.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Configuração para __dirname funcionar com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUriCrud = process.env.MONGO_URI_CRUD;

async function connectCrudDB() {
    if (!mongoUriCrud) {
        console.warn('⚠️  MONGO_URI_CRUD não configurada. O servidor continuará, mas a camada de persistência ficará indisponível.');
        return;
    }

    if (mongoose.connections[0].readyState) {
        console.log('ℹ️  Já conectado ao MongoDB.');
        return;
    }

    try {
        console.log('🔌 Tentando conectar ao MongoDB...');
        await mongoose.connect(mongoUriCrud, { serverSelectionTimeoutMS: 5000 });
        console.log('🚀 Conectado ao MongoDB Atlas!');
    } catch (err) {
        console.error('❌ Falha ao conectar ao MongoDB:', err && err.message ? err.message : err);
        console.error(err);
    }
}

// Tenta conectar ao banco; se não houver URI, o servidor ainda sobe (útil para desenvolvimento sem DB)
connectCrudDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Commit helper: comentário para diferenciar versão local antes do push

app.use(cors());
app.use(express.json());

// MUITO IMPORTANTE: Serve os arquivos estáticos (CSS, JS, imagens, sons) da pasta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ===========================================
// Rotas da API
// ===========================================

app.post('/api/veiculos', async (req, res) => {
    try {
        const novoVeiculoData = req.body;
        const veiculoCriado = await Veiculo.create(novoVeiculoData);
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Veículo com esta placa já existe.' });
        }
        res.status(500).json({ error: 'Erro interno ao criar veículo.' });
    }
});

app.get('/api/veiculos', async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find();
        res.json(todosOsVeiculos);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao buscar veículos.' });
    }
});

app.put('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!veiculoAtualizado) return res.status(404).json({ error: 'Veículo não encontrado.' });
        res.json(veiculoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao atualizar veículo.' });
    }
});

app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const veiculoDeletado = await Veiculo.findByIdAndDelete(id);
        if (!veiculoDeletado) return res.status(404).json({ error: 'Veículo não encontrado.' });
        res.status(200).json({ message: 'Veículo removido com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao deletar veículo.' });
    }
});

app.get('/api/previsao/:cidade', async (req, res) => {
    const { cidade } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Chave de API do clima não configurada.' });
    
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro na API do clima.');

        res.json({
            nomeCidade: data.name,
            pais: data.sys.country,
            temperaturaAtual: data.main.temp,
            sensacaoTermica: data.main.feels_like,
            descricaoClima: data.weather[0].description,
            iconeClima: data.weather[0].icon,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garagem/veiculos-destaque', (req, res) => {
    res.json([
        { id: 1, modelo: "Tesla Cybertruck", ano: 2024, destaque: "Design Futurista", imagemUrl: "/imagens/tesla.jpeg" },
        { id: 2, modelo: "Ford Maverick", ano: 2023, destaque: "Picape Híbrida", imagemUrl: "/imagens/maverick.jpeg" },
        { id: 3, modelo: "Porsche Taycan", ano: 2022, destaque: "Esportivo Elétrico", imagemUrl: "/imagens/porsche.jpeg" },
        { id: 4, modelo: "Honda Civic Type R", ano: 2024, destaque: "Alta Performance", imagemUrl: "/imagens/civic.jpeg" }
    ]);
});

app.get('/api/garagem/servicos-oferecidos', (req, res) => {
    res.json([
        { nome: "Troca de Óleo", descricao: "Uso de óleo sintético de alta qualidade.", precoEstimado: "R$ 250,00" },
        { nome: "Alinhamento e Balanceamento", descricao: "Ajuste da geometria da suspensão.", precoEstimado: "R$ 180,00" }
    ]);
});

app.get('/api/garagem/ferramentas-essenciais/:id', (req, res) => {
    const ferramentas = {
        'F01': { id: "F01", nome: "Jogo de Chaves", utilidade: "Reparos gerais.", categoria: "Manual" },
        'F02': { id: "F02", nome: "Macaco Hidráulico", utilidade: "Troca de pneus.", categoria: "Elevação" },
        'F03': { id: "F03", nome: "Chave de Impacto", utilidade: "Remoção de porcas.", categoria: "Elétrica" }
    };
    const ferramenta = ferramentas[req.params.id];
    if (ferramenta) res.json(ferramenta);
    else res.status(404).json({ error: 'Ferramenta não encontrada.' });
});

// ===========================================
// Rota Final - Serve o index.html
// ===========================================
// Esta rota "pega-tudo" deve ser a ÚLTIMA. Ela garante que, se a requisição não
// corresponder a nenhuma API acima, o Render tentará servir a página principal do seu site.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor rodando na porta ${PORT}`);
});

// Health check simples para debug local
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});