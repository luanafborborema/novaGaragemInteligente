// server.js

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Veiculo from './models/Veiculo.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authMiddleware from './middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Prevent common Mongoose deprecation/warning about strictQuery in newer versions
mongoose.set('strictQuery', false);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUriCrud = process.env.MONGO_URI_CRUD;

async function connectCrudDB() {
    if (!mongoUriCrud) {
        console.warn('⚠️ MONGO_URI_CRUD não configurada. O servidor continuará, mas a camada de persistência ficará indisponível.');
        return;
    }

    if (mongoose.connections[0].readyState) {
        console.log('ℹ️ Já conectado ao MongoDB.');
        return;
    }

    try {
        console.log('🔌 Conectando ao MongoDB...'); // nicer message
        await mongoose.connect(mongoUriCrud, { serverSelectionTimeoutMS: 5000 });
        console.log('🚀 Conectado ao MongoDB!');
    } catch (err) {
        // Log a compact message plus full error for debugging
        console.error('❌ Erro ao conectar ao MongoDB:', err && err.message ? err.message : err);
        // keep server running but mark mongoose disconnected
        try { console.error(err); } catch (e) {}
    }
}

// Tenta conectar ao banco; se não houver URI, o servidor ainda sobe (útil para desenvolvimento sem DB)
connectCrudDB();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// MUITO IMPORTANTE: Serve os arquivos estáticos (CSS, JS, imagens, sons) da pasta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ===========================================
// Rotas da API
// ===========================================

// ---------- Autenticação: Registro e Login ----------
const JWT_SECRET = process.env.JWT_SECRET || 'SEU_SEGREDO_SUPER_SECRETO_POR_EXEMPLO';

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ Aviso: JWT_SECRET não configurado. Usando segredo padrão - configure JWT_SECRET em produção para segurança.');
}

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !name.trim() || !email || !password) {
            // 16. Campos obrigatórios não preenchidos!
            return res.status(400).json({ success: false, error: 'Campos obrigatórios não preenchidos!' });
        }
        const devAutoVerify = process.env.DEV_AUTO_VERIFY === '1' || process.env.NODE_ENV !== 'production';

        const existing = await User.findOne({ email });
        if (existing) {
            // Se o usuário existe, mas não foi verificado, permite auto-verificar em dev para testes
            if (!existing.verified && devAutoVerify) {
                existing.verified = true;
                existing.verificationToken = null;
                await existing.save();
                // Mensagem customizada para dev auto-verify
                return res.status(200).json({ success: true, message: 'Conta já existia, mas foi verificada automaticamente (dev). Agora faça login.' });
            }
            // 11. Usuário já existe!
            return res.status(409).json({ success: false, error: 'Usuário já existe!' });
        }

        const hashed = await bcrypt.hash(password, 10);
        if (devAutoVerify) {
            const user = await User.create({ name: name.trim(), email, password: hashed, verified: true, verificationToken: null });
            // 1. Conta registrada com sucesso!
            return res.status(201).json({ success: true, message: 'Conta registrada com sucesso! (Verificada automaticamente em modo dev)', user: { id: user._id, name: user.name, email: user.email } });
        }

        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const user = await User.create({ name: name.trim(), email, password: hashed, verified: false, verificationToken });
        // 1. Conta registrada com sucesso! (com instrução de verificação)
    res.status(201).json({ success: true, message: 'Conta registrada com sucesso! Verifique seu email para ativar a conta.', verificationToken, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Erro no register:', err);
        // 14. Erro ao registrar a conta!
        res.status(500).json({ success: false, error: 'Erro ao registrar a conta!' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            // 16. Campos obrigatórios não preenchidos!
            return res.status(400).json({ success: false, error: 'Campos obrigatórios não preenchidos!' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // 12. Usuário não encontrado!
            return res.status(404).json({ success: false, error: 'Usuário não encontrado!' });
        }

        if (!user.verified) {
            // Mensagem de erro customizada para conta não verificada
            return res.status(403).json({ success: false, error: 'Conta não verificada. Verifique seu email para ativar a conta.', verificationToken: user.verificationToken });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            // 13. Senha incorreta!
            return res.status(401).json({ success: false, error: 'Senha incorreta!' });
        }

    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    // 2. Login realizado com sucesso!
    res.json({ success: true, message: 'Login realizado com sucesso!', token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Erro no login:', err);
        // 15. Erro ao fazer login!
        res.status(500).json({ success: false, error: 'Erro ao fazer login!' });
    }
});

// Endpoint para verificar token de email
app.get('/api/auth/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Token de verificação inválido.' });
        }
        user.verified = true;
        user.verificationToken = null;
        await user.save();
        res.json({ success: true, message: 'Email verificado com sucesso. Agora você pode fazer login.' });
    } catch (err) {
        console.error('Erro ao verificar token:', err);
        res.status(500).json({ success: false, error: 'Erro interno ao verificar token.' });
    }
});

// ---------- Rotas de veículos protegidas por JWT ----------
// ---------- Perfil do usuário: obter e atualizar (requer autenticação) ----------
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password -__v');
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        res.json({ success: true, user });
    } catch (err) {
        console.error('Erro em GET /api/auth/me', err);
        res.status(500).json({ success: false, error: 'Erro ao obter dados do usuário.' });
    }
});

app.patch('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const { password, name } = req.body;
        if (!password) return res.status(400).json({ success: false, error: 'Senha atual é necessária para alterações.' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ success: false, error: 'Senha incorreta.' });

        if (name && typeof name === 'string') user.name = name.trim();
        await user.save();
        // return updated user without password
        const safeUser = { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt };
        res.json({ success: true, message: 'Dados atualizados com sucesso.', user: safeUser });
    } catch (err) {
        console.error('Erro em PATCH /api/auth/me', err);
        res.status(500).json({ success: false, error: 'Erro ao atualizar dados do usuário.' });
    }
});
app.post('/api/veiculos', authMiddleware, async (req, res) => {
    try {
        const novoVeiculoData = { ...req.body, owner: req.userId };

        // Limitação: permitir no máximo 1 criação de carro por usuário a cada 60 segundos
        const tipoSolicitado = (req.body.tipo || '').toLowerCase();
        const tiposLimitados = ['carro', 'esportivo'];
        if (tiposLimitados.includes(tipoSolicitado)) {
            const limiteIntervaloMs = 60 * 1000; // 1 minuto
            const corte = new Date(Date.now() - limiteIntervaloMs);
            // Procura o último veículo criado pelo usuário do mesmo tipo
            const ultimo = await Veiculo.findOne({ owner: req.userId, tipo: { $in: tiposLimitados } }).sort({ createdAt: -1 }).limit(1);
            if (ultimo && ultimo.createdAt && ultimo.createdAt > corte) {
                // 429 Too Many Requests
                return res.status(429).json({ success: false, error: 'Taxa excedida: você só pode criar 1 carro a cada minuto. Aguarde um pouco antes de tentar novamente.' });
            }
        }

        const veiculoCriado = await Veiculo.create(novoVeiculoData);
        // Popula o campo owner (somente nome) antes de retornar
        await veiculoCriado.populate('owner', 'name');
        // 4. Dados salvos com sucesso!
        res.status(201).json({ success: true, message: 'Dados salvos com sucesso!', veiculo: veiculoCriado });
    } catch (error) {
        if (error.code === 11000) {
            // 11. Usuário já existe! (adaptado para placa de veículo)
            return res.status(409).json({ success: false, error: 'Veículo com esta placa já existe!' });
        }
        // 17. Erro no servidor, tente novamente!
        res.status(500).json({ success: false, error: 'Erro no servidor, tente novamente!' });
    }
});

app.get('/api/veiculos', authMiddleware, async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find({ owner: req.userId }).populate('owner', 'name');
        // 10. Operação concluída com sucesso!
        res.json({ success: true, message: 'Operação concluída com sucesso!', veiculos: todosOsVeiculos });
    } catch (error) {
        // 17. Erro no servidor, tente novamente!
        res.status(500).json({ success: false, error: 'Erro no servidor, tente novamente!' });
    }
});

app.put('/api/veiculos/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const veiculo = await Veiculo.findById(id);
        if (!veiculo) {
            // 12. Usuário não encontrado! (adaptado para veículo)
            return res.status(404).json({ success: false, error: 'Veículo não encontrado!' });
        }
        if (veiculo.owner.toString() !== req.userId) {
            // 20. Acesso negado, você não tem permissão!
            return res.status(403).json({ success: false, error: 'Acesso negado, você não tem permissão!' });
        }

        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        // 4. Dados salvos com sucesso!
        res.json({ success: true, message: 'Dados salvos com sucesso!', veiculo: veiculoAtualizado });
    } catch (error) {
        // 17. Erro no servidor, tente novamente!
        res.status(500).json({ success: false, error: 'Erro no servidor, tente novamente!' });
    }
});

app.delete('/api/veiculos/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const veiculo = await Veiculo.findById(id);
        if (!veiculo) {
            // 12. Usuário não encontrado! (adaptado para veículo)
            return res.status(404).json({ success: false, error: 'Veículo não encontrado!' });
        }
        if (veiculo.owner.toString() !== req.userId) {
            // 20. Acesso negado, você não tem permissão!
            return res.status(403).json({ success: false, error: 'Acesso negado, você não tem permissão!' });
        }

        await Veiculo.findByIdAndDelete(id);
        // 10. Operação concluída com sucesso!
        res.status(200).json({ success: true, message: 'Operação concluída com sucesso!' });
    } catch (error) {
        // 17. Erro no servidor, tente novamente!
        res.status(500).json({ success: false, error: 'Erro no servidor, tente novamente!' });
    }
});

app.get('/api/previsao/:cidade', async (req, res) => {
    const { cidade } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'Chave de API do clima não configurada.' });

    try {
        // 22. Verificando dados, aguarde...
        console.log('Verificando dados, aguarde...');
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro na API do clima.');

        res.json({
            success: true,
            message: 'Operação concluída com sucesso!', // 10. Operação concluída com sucesso!
            nomeCidade: data.name,
            pais: data.sys.country,
            temperaturaAtual: data.main.temp,
            sensacaoTermica: data.main.feels_like,
            descricaoClima: data.weather[0].description,
            iconeClima: data.weather[0].icon,
        });
    } catch (error) {
        // 17. Erro no servidor, tente novamente!
        res.status(500).json({ success: false, error: 'Erro no servidor, tente novamente!' });
    }
});

app.get('/api/garagem/veiculos-destaque', (req, res) => {
    // 10. Operação concluída com sucesso!
    res.json({
        success: true,
        message: 'Operação concluída com sucesso!',
        veiculos: [
            { id: 1, modelo: "Tesla Cybertruck", ano: 2024, destaque: "Design Futurista", imagemUrl: "/imagens/tesla.jpeg" },
            { id: 2, modelo: "Ford Maverick", ano: 2023, destaque: "Picape Híbrida", imagemUrl: "/imagens/maverick.jpeg" },
            { id: 3, modelo: "Porsche Taycan", ano: 2022, destaque: "Esportivo Elétrico", imagemUrl: "/imagens/porsche.jpeg" },
            { id: 4, modelo: "Honda Civic Type R", ano: 2024, destaque: "Alta Performance", imagemUrl: "/imagens/civic.jpeg" }
        ]
    });
});

app.get('/api/garagem/servicos-oferecidos', (req, res) => {
    // 10. Operação concluída com sucesso!
    res.json({
        success: true,
        message: 'Operação concluída com sucesso!',
        servicos: [
            { nome: "Troca de Óleo", descricao: "Uso de óleo sintético de alta qualidade.", precoEstimado: "R$ 250,00" },
            { nome: "Alinhamento e Balanceamento", descricao: "Ajuste da geometria da suspensão.", precoEstimado: "R$ 180,00" }
        ]
    });
});

app.get('/api/garagem/ferramentas-essenciais/:id', (req, res) => {
    const ferramentas = {
        'F01': { id: "F01", nome: "Jogo de Chaves", utilidade: "Reparos gerais.", categoria: "Manual" },
        'F02': { id: "F02", nome: "Macaco Hidráulico", utilidade: "Troca de pneus.", categoria: "Elevação" },
        'F03': { id: "F03", nome: "Chave de Impacto", utilidade: "Remoção de porcas.", categoria: "Elétrica" }
    };
    const ferramenta = ferramentas[req.params.id];
    if (ferramenta) {
        // 10. Operação concluída com sucesso!
        res.json({ success: true, message: 'Operação concluída com sucesso!', ferramenta: ferramenta });
    } else {
        // 17. Erro no servidor, tente novamente! (adaptado para ferramenta não encontrada)
        res.status(404).json({ success: false, error: 'Ferramenta não encontrada!' });
    }
});

// Rota pública para visitantes verem veículos (somente leitura)
app.get('/api/veiculos/public', async (req, res) => {
    try {
        // Incluir o nome do owner (quando disponível) para exibição pública
        const veiculos = await Veiculo.find().populate('owner', 'name').select('-__v');
        // 10. Operação concluída com sucesso!
        res.json({ success: true, message: 'Operação concluída com sucesso!', veiculos: veiculos });
    } catch (err) {
        // 17. Erro no servidor, tente novamente!
        res.status(500).json({ success: false, error: 'Erro no servidor, tente novamente!' });
    }
});


// Rota Final - Serve o index.html
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