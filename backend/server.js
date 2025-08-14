// server.js

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Veiculo from './models/Veiculo.js'; // Caminho para seu modelo de Veiculo.js
import path from 'path'; // Importa o módulo path para lidar com caminhos de arquivos
import { fileURLToPath } from 'url'; // Necessário para simular __dirname em módulos ES6

dotenv.config(); // Carrega variáveis de ambiente do .env

// Bloco para configurar __dirname em módulos ES6 (import.meta.url)
// Isso é essencial para que 'express.static' encontre a pasta correta, assumindo
// que o 'server.js' está em uma subpasta (e.g., 'backend/').
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
    // Em ambiente de desenvolvimento, isso pode impedir o servidor de iniciar sem a URI.
    // No Render, a ausência de variáveis fará o deploy falhar antes, o que é desejável.
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

// Conecta no banco
connectCrudDB();

// Configura Express
const app = express();
// Use process.env.PORT para que o Render (e outros hosts) possa atribuir a porta que ele usa.
// O valor 3001 é um fallback para desenvolvimento local, se não for definido em .env ou pelo ambiente.
const PORT = process.env.PORT || 3001; 

// Middlewares essenciais
app.use(cors()); // Permite requisições de outras origens (seu frontend no navegador)
app.use(express.json()); // Permite que o Express leia JSON no corpo das requisições

// MUITO IMPORTANTE para servir o frontend!
// Esta linha configura o Express para servir arquivos estáticos da pasta 'frontend'.
// `path.join(__dirname, '../frontend')` cria o caminho absoluto para a pasta 'frontend'.
// Assume que a estrutura do seu projeto é:
// novaGaragemInteligente/
// ├── backend/ (onde server.js está)
// └── frontend/ (onde os arquivos estáticos do frontend estão)
app.use(express.static(path.join(__dirname, '../frontend')));

// ===========================================
// Rotas da API de CRUD para Veículos (MongoDB)
// ===========================================

// ENDPOINT para criar um novo veículo (POST /api/veiculos)
app.post('/api/veiculos', async (req, res) => {
    try {
        const novoVeiculoData = req.body;
        const veiculoCriado = await Veiculo.create(novoVeiculoData); // Cria o documento no MongoDB
        
        console.log('[Servidor] Veículo criado com sucesso:', veiculoCriado);
        res.status(201).json(veiculoCriado); // Retorna o veículo criado com status 201 (Created)

    } catch (error) {
        console.error("[Servidor] Erro ao criar veículo:", error);
        if (error.code === 11000) { // Erro de duplicidade do MongoDB (ex: placa unique já existe)
            return res.status(409).json({ error: 'Erro: Veículo com esta placa já existe.' });
        }
        if (error.name === 'ValidationError') { // Erro de validação do Mongoose (campo obrigatório, etc.)
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ error: `Erros de validação: ${messages.join(' ')}` });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao criar veículo.' });
    }
});

// ENDPOINT para ler todos os veículos (GET /api/veiculos)
app.get('/api/veiculos', async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find(); // Busca todos os documentos na coleção 'veiculos'
        
        console.log('[Servidor] Buscando todos os veículos do DB.');
        res.json(todosOsVeiculos); // Retorna todos os veículos encontrados

    } catch (error) {
        console.error("[Servidor] Erro ao buscar veículos:", error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar veículos.' });
    }
});

// ENDPOINT para atualizar um veículo por ID (PUT /api/veiculos/:id)
app.put('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params; // Pega o ID do veículo da URL
        const dadosAtualizacao = req.body; // Pega os dados a serem atualizados do corpo da requisição

        // Encontra e atualiza o documento. `{ new: true }` retorna a versão atualizada.
        // `{ runValidators: true }` executa as validações do schema na atualização.
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, dadosAtualizacao, { new: true, runValidators: true });

        if (!veiculoAtualizado) {
            return res.status(404).json({ error: 'Veículo não encontrado para atualização.' });
        }
        
        console.log('[Servidor] Veículo atualizado com sucesso:', veiculoAtualizado);
        res.json(veiculoAtualizado);

    } catch (error) {
        console.error("[Servidor] Erro ao atualizar veículo:", error);
        if (error.code === 11000) { 
            return res.status(409).json({ error: 'Erro de duplicidade: Veículo com esta placa já existe.' });
        }
        if (error.name === 'ValidationError') { 
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ error: `Erros de validação: ${messages.join(' ')}` });
        }
        if (error.name === 'CastError' && error.path === '_id') { // Erro se o ID não for válido para o MongoDB
            return res.status(400).json({ error: 'ID de veículo inválido ou formato incorreto.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar veículo.' });
    }
});

// ENDPOINT para deletar um veículo por ID (DELETE /api/veiculos/:id)
app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params; // Pega o ID do veículo da URL

        const veiculoDeletado = await Veiculo.findByIdAndDelete(id); // Encontra e deleta o documento

        if (!veiculoDeletado) {
            return res.status(404).json({ error: 'Veículo não encontrado para remoção.' });
        }
        
        console.log('[Servidor] Veículo removido com sucesso:', veiculoDeletado);
        res.status(200).json({ message: 'Veículo removido com sucesso.', veiculo: veiculoDeletado });

    } catch (error) {
        console.error("[Servidor] Erro ao deletar veículo:", error);
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ error: 'ID de veículo inválido ou formato incorreto.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao deletar veículo.' });
    }
});


// ======================================
// Rotas da API de Previsão do Tempo (Proxy)
// ======================================
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

app.get('/api/previsao/:cidade', async (req, res) => {
  const { cidade } = req.params;

  if (!OPENWEATHER_API_KEY) {
    return res.status(500).json({ error: 'Chave de API do clima não configurada no servidor (OPENWEATHER_API_KEY). O servidor não pode buscar a previsão.' });
  }

  try {
    const urlOpenWeather = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`;
    const responseOpenWeather = await fetch(urlOpenWeather); // Faz a requisição à API externa

    if (!responseOpenWeather.ok) {
      const errorData = await responseOpenWeather.json().catch(() => ({}));
      // Retorna o status e a mensagem de erro da API externa para o frontend
      return res.status(responseOpenWeather.status).json({ error: errorData.message || 'Erro ao buscar dados do clima na API externa.' });
    }

    const data = await responseOpenWeather.json(); // Pega a resposta da API externa

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

    res.json(previsaoFormatada); // Envia os dados formatados para o frontend

  } catch (error) {
    console.error("[Servidor] Erro ao processar requisição de previsão:", error);
    res.status(500).json({ error: 'Erro interno do servidor ao processar a previsão.' });
  }
});

// ======================================
// Rotas para Dados da Garagem (Atividade B2.P1.A9)
// ======================================
const veiculosDestaque = [
  { id: 1, modelo: "Tesla Cybertruck", ano: 2024, destaque: "Design Futurista, Elétrico e Potente", imagemUrl: "imagens/tesla.jpeg" },
  { id: 2, modelo: "Ford Maverick Híbrida", ano: 2023, destaque: "Picape compacta, híbrida e versátil", imagemUrl: "imagens/maverick.jpeg" },
  { id: 3, modelo: "Porsche Taycan", ano: 2022, destaque: "Esportivo elétrico de alta performance", imagemUrl: "imagens/porsche.jpeg" },
  { id: 4, modelo: "Honda Civic Type R", ano: 2024, destaque: "Carro esportivo de alto desempenho", imagemUrl: "imagens/civic.jpeg" }
];

const servicosGaragem = [
  { id: "S01", nome: "Troca de Óleo e Filtro", descricao: "Uso de óleo sintético de alta qualidade e troca de filtro de óleo.", precoEstimado: "R$ 250,00" },
  { id: "S02", nome: "Balanceamento e Alinhamento", descricao: "Equilíbrio de rodas e ajuste da geometria da suspensão para sua segurança.", precoEstimado: "R$ 180,00" },
  { id: "S03", nome: "Revisão Geral do Sistema de Freios", descricao: "Verificação completa de pastilhas, discos, fluido e ajuste geral do sistema.", precoEstimado: "R$ 350,00" }
];

const ferramentasEssenciais = [
  { id: "F01", nome: "Jogo de Chaves Combinadas", utilidade: "Para parafusos e porcas de diferentes tamanhos, essencial para pequenos reparos.", categoria: "Manual" },
  { id: "F02", nome: "Macaco Hidráulico Automotivo", utilidade: "Para levantar veículos com segurança durante a troca de pneus ou manutenções.", categoria: "Elevação" },
  { id: "F03", nome: "Chave de Impacto Elétrica", utilidade: "Facilita a remoção e aperto rápido de porcas de roda e outros fixadores pesados.", categoria: "Elétrica" }
];

// GET para veículos em destaque
app.get('/api/garagem/veiculos-destaque', (req, res) => {
  res.json(veiculosDestaque);
});

// GET para serviços de oficina
app.get('/api/garagem/servicos-oferecidos', (req, res) => {
  res.json(servicosGaragem);
});

// GET para detalhes de ferramentas (com parâmetro de ID)
app.get('/api/garagem/ferramentas-essenciais/:idFerramenta', (req, res) => {
  const { idFerramenta } = req.params;
  const ferramenta = ferramentasEssenciais.find(f => f.id === idFerramenta);
  if (ferramenta) {
    res.json(ferramenta);
  } else {
    res.status(404).json({ error: 'Ferramenta não encontrada com o ID fornecido.' });
  }
});

// ======================================
// Rota Raiz (Serve como teste de que o servidor está rodando)
// ======================================
// Se a requisição não cair em nenhuma das rotas acima, ela pode tentar carregar o index.html
// por causa do express.static, mas uma rota de '/' específica pode ser útil para debug no Render.
app.get('/', (req, res) => {
    // Redireciona para o index.html se quiser que a rota raiz do backend carregue o frontend
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
    // Ou, para uma mensagem simples de servidor online:
    // res.send('Servidor da Garagem Inteligente Online e servindo arquivos estáticos! Acesse a rota correta.');
});


// ======================================
// Iniciar o Servidor
// ======================================
app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor rodando na porta ${PORT}`);
});