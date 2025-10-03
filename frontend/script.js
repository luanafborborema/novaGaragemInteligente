// script.js
// Conteúdo COMPLETO e FINAL do arquivo JavaScript principal do frontend.

// Commit helper: pequena alteração para permitir commit (sem impacto runtime).

import { Carro } from './Carro.js';
import { CarroEsportivo } from './CarroEsportivo.js';
import { Caminhao } from './Caminhao.js';
import { Moto } from './Moto.js';
import { Bicicleta } from './Bicicleta.js';
import { Manutencao } from './Manutencao.js';
import { mostrarFeedback, MESSAGES } from './funcoesAuxiliares.js';

const backendLocalUrl = 'http://localhost:3001';
const backendRenderUrl = '';

// Detecta se estamos abrindo o frontend localmente (file://) ou em localhost.
const _isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
// Se local, usamos o backend local; se não, usamos caminhos relativos (backendRenderUrl vazio)
const backendUrl = _isLocalHost ? backendLocalUrl : backendRenderUrl;

console.log(`[FRONTEND] O script será executado com o backend em: ${backendUrl || '(relative)'} (detectedLocal=${_isLocalHost})`);

// Variáveis Globais e Mapa de Classes
const veiculosInstanciados = {};
let veiculoAtivoId = null;
var isVisitor = false; // visitor mode flag (use var so it's hoisted and available to event handlers early)

// Mapeamento de tipos do backend para as classes do frontend
const classesVeiculos = {
    carro: Carro,
    esportivo: CarroEsportivo,
    caminhao: Caminhao,
    moto: Moto,
    bicicleta: Bicicleta
};

// Elementos DOM (alguns usados durante inicialização)
const mainContent = document.getElementById('main-content');
const addVeiculoForm = document.getElementById('add-veiculo-form');
const editVeiculoFormContainer = document.getElementById('edit-veiculo-form-container');
const editVeiculoForm = document.getElementById('edit-veiculo-form');
const cancelEditVeiculoBtn = document.getElementById('cancel-edit-veiculo');
const authFeedback = document.getElementById('auth-feedback'); // Adicionado para feedback de autenticação
// (structure cleaned)

// Carrega a lista de veículos do backend (protegido) ou do endpoint público
async function carregarGaragem() {
    try {
        const token = getToken();
        const usePublic = isVisitor || !token;
        const path = usePublic ? '/api/veiculos/public' : '/api/veiculos';
        const fetcher = usePublic ? fetch : authorizedFetch;
        let response = await fetcher(`${backendUrl}${path}`);

        // Se token inválido, limpar e tentar endpoint público
        if (!usePublic && (response.status === 401 || response.status === 403)) {
            console.warn('[FRONTEND] Token inválido/expirado. Limpando token e consultando endpoint público.');
            setToken(null);
            showLoggedOutUI();
            mostrarAuthFeedback('Sessão expirada, faça login novamente!', 'error');
            response = await fetch(`${backendUrl}/api/veiculos/public`);
        }

        let data;
        try { data = await response.json(); } catch (e) { data = { success: false, error: 'Resposta inesperada do servidor ao carregar veículos.' }; }

        if (!response.ok || !data.success) {
            const errorMessage = data.error || 'Não foi possível carregar os veículos.';
            if (response.status === 401 || response.status === 403) {
                setToken(null);
                showLoggedOutUI();
                mostrarAuthFeedback('Sessão expirada, faça login novamente!', 'error');
                const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex';
            } else {
                mostrarFeedback(errorMessage, 'error');
            }
            throw new Error(errorMessage);
        }

        const veiculosDoBackend = data.veiculos || [];

        // If logged in, also try to fetch public vehicles and merge them so legacy entries appear
        let publicVeiculos = [];
        try {
            if (!usePublic) {
                const pubResp = await fetch(`${backendUrl}/api/veiculos/public`);
                let pubData = {};
                try { pubData = await pubResp.json(); } catch (e) { pubData = {}; }
                if (pubResp.ok && pubData && pubData.veiculos) {
                    publicVeiculos = pubData.veiculos || [];
                }
            }
        } catch (e) {
            console.warn('[FRONTEND] Falha ao buscar veículos públicos (não crítico):', e);
        }

        // Merge user vehicles with public vehicles; pub vehicles should not override user-owned ones
        const allVeiculosRaw = [...veiculosDoBackend];
        publicVeiculos.forEach(pub => {
            const idPub = pub._id || pub.id;
            const exists = veiculosDoBackend.some(v => (v._id || v.id) === idPub);
            if (!exists) allVeiculosRaw.push(pub);
        });

        // Limpa cache local
        Object.keys(veiculosInstanciados).forEach(key => delete veiculosInstanciados[key]);
        document.querySelectorAll('.veiculo-item').forEach(item => item.remove());

    allVeiculosRaw.forEach(dadosRaw => {
            // Normalize legacy or alternate backend shapes so older records also work
            const dados = {
                // prefer current fields, fall back to common legacy names
                _id: dadosRaw._id || dadosRaw.id || null,
                tipo: dadosRaw.tipo || dadosRaw.type || (dadosRaw.model && dadosRaw.model.toLowerCase && dadosRaw.model.toLowerCase().includes('bike') ? 'bicicleta' : null),
                modelo: dadosRaw.modelo || dadosRaw.model || dadosRaw.nome || 'Modelo Desconhecido',
                cor: dadosRaw.cor || dadosRaw.color || 'Cor Indefinida',
                placa: dadosRaw.placa || dadosRaw.plate || '',
                marca: dadosRaw.marca || dadosRaw.brand || '',
                ano: dadosRaw.ano || dadosRaw.year || null,
                capacidadeCarga: dadosRaw.capacidadeCarga || dadosRaw.capacity || undefined,
                cargaAtual: dadosRaw.cargaAtual || dadosRaw.currentLoad || 0,
                turboAtivado: typeof dadosRaw.turboAtivado !== 'undefined' ? dadosRaw.turboAtivado : (dadosRaw.turbo || false),
                historicoManutencao: dadosRaw.historicoManutencao || dadosRaw.history || []
            };

            const Classe = classesVeiculos[dados.tipo] || Carro;
            let instancia;
            try {
                if (dados.tipo === 'caminhao') {
                    // Caminhão: constructor(modelo, cor, capacidade, id, historico, cargaAtual)
                    instancia = new Classe(dados.modelo, dados.cor, dados.capacidadeCarga, dados._id, dados.historicoManutencao, dados.cargaAtual);
                } else if (dados.tipo === 'esportivo') {
                    // Esportivo: constructor(modelo, cor, id, historico, turboAtivado)
                    instancia = new Classe(dados.modelo, dados.cor, dados._id, dados.historicoManutencao, dados.turboAtivado);
                } else if (dados.tipo === 'bicicleta') {
                    instancia = new Classe(dados.modelo, dados.cor, dados._id, dados.historicoManutencao);
                } else {
                    instancia = new Classe(dados.modelo, dados.cor, dados._id, dados.historicoManutencao);
                }
            } catch (e) {
                console.warn('[FRONTEND] Falha ao instanciar veículo, fallback para Carro:', e, 'dados=', dados);
                instancia = new Carro(dados.modelo, dados.cor, dados._id, dados.historicoManutencao);
            }

            // Attach normalized metadata
            instancia._id = dados._id || instancia.id || (instancia._id || null);
            instancia.placa = dados.placa || instancia.placa || '';
            instancia.marca = dados.marca || instancia.marca || '';
            instancia.ano = dados.ano || instancia.ano || '';

            if (typeof instancia.capacidadeCarga !== 'undefined') instancia.capacidadeCarga = dados.capacidadeCarga || instancia.capacidadeCarga;
            if (typeof instancia.cargaAtual !== 'undefined') instancia.cargaAtual = dados.cargaAtual || instancia.cargaAtual || 0;
            if (typeof instancia.turboAtivado !== 'undefined') instancia.turboAtivado = dados.turboAtivado || instancia.turboAtivado || false;

            // Preserve owner information returned by the backend (populated 'owner' or legacy ownerName)
            // Backend may return owner as an object (populated) or as an id/string; normalize to either instancia.owner or __ownerName
            if (dadosRaw.owner) {
                // if owner is populated (object with name) keep it for display
                instancia.owner = dadosRaw.owner;
            } else if (dados.owner) {
                instancia.owner = dados.owner;
            } else if (dadosRaw.ownerName) {
                instancia.__ownerName = dadosRaw.ownerName;
            } else if (dados.ownerName) {
                instancia.__ownerName = dados.ownerName;
            }

            // mark instance as readonly if it came from publicVeiculos (i.e., not owned by user)
            const cameFromPublic = publicVeiculos.some(p => (p._id || p.id) === dadosRaw._id || (p._id || p.id) === dadosRaw.id);
            if (cameFromPublic) instancia.__readonly = true;
            veiculosInstanciados[instancia._id] = instancia;

            const li = document.createElement('li');
            li.className = 'veiculo-item';
            const displayTexto = instancia.placa && !instancia.placa.startsWith('BIKE-') ? `${instancia.modelo} (${instancia.placa})` : `${instancia.modelo} (Bicicleta)`;
            li.innerHTML = `<a href="#" data-veiculo-id="${instancia._id}">${displayTexto}</a>`;
            const sidebar = document.getElementById('sidebar-menu');
            const ref = document.querySelector('li[data-action]') || null;
            sidebar.insertBefore(li, ref);
        });

        if (Object.keys(veiculosInstanciados).length > 0) {
            mostrarVeiculoContainer(Object.keys(veiculosInstanciados)[0]);
        } else {
            const welcome = document.getElementById('welcome-message'); if (welcome) welcome.style.display = 'block';
        }

        // apply visitor UI restrictions after loading
        applyVisitorUI();
    } catch (error) {
        console.error('Erro ao carregar garagem:', error);
        mostrarFeedback(error.message, 'error');
    }
}


/**
 * Mostra o container do veículo selecionado e atualiza todos os campos da UI
 * incluindo velocidade, status e histórico de manutenção.
 * Esta é uma função global usada por várias partes do script.
 */
function mostrarVeiculoContainer(id) {
    if (!id) return;
    const veiculo = veiculosInstanciados[id];
    if (!veiculo) {
        console.warn('[FRONTEND] mostrarVeiculoContainer: veículo não encontrado para id=', id);
        return;
    }
    veiculoAtivoId = id;

    // Esconde todas as containers e mostra a do tipo apropriado
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('add-veiculo-form-container').style.display = 'none';
    document.querySelectorAll('.veiculo-container').forEach(c => c.style.display = 'none');

    const prefix = veiculo.getIdPrefix();
    const container = document.getElementById(`${prefix}-container`);
    if (container) container.style.display = 'block';

    // Atualiza campos textuais básicos (modelo, marca, ano, placa, cor)
    const setIfExists = (sel, value) => { const el = document.getElementById(sel); if (el) el.textContent = value ?? ''; };
    setIfExists(`${prefix}-modelo`, veiculo.modelo);
    setIfExists(`${prefix}-marca`, veiculo.marca || '---');
    setIfExists(`${prefix}-ano`, veiculo.ano || '---');
    setIfExists(`${prefix}-placa`, veiculo.placa || (veiculo.getTipo() === 'bicicleta' ? 'Bicicleta' : '---'));
    setIfExists(`${prefix}-cor`, veiculo.cor || '---');
    // Owner display (try instance.owner.name, or instance.owner, or fallback)
    const ownerName = (veiculo.owner && veiculo.owner.name) ? veiculo.owner.name : (veiculo.owner && typeof veiculo.owner === 'string' ? veiculo.owner : (veiculo.__ownerName || '-'));
    setIfExists(`${prefix}-owner`, ownerName);

    // Atualiza velocidade, status, info específicos (carga/turbo)
    if (typeof veiculo.atualizarVelocidade === 'function') veiculo.atualizarVelocidade();
    if (typeof veiculo.atualizarStatus === 'function') veiculo.atualizarStatus();
    if (typeof veiculo.atualizarInfoCaminhao === 'function') veiculo.atualizarInfoCaminhao();
    if (typeof veiculo.atualizarTurboDisplay === 'function') veiculo.atualizarTurboDisplay();

    // Atualiza manutenção e botões
    if (typeof window.atualizarDisplayManutencaoUI === 'function') window.atualizarDisplayManutencaoUI(veiculo);
    if (typeof veiculo.atualizarEstadoBotoesWrapper === 'function') veiculo.atualizarEstadoBotoesWrapper();

    // Disable editing if this instance is readonly (public legacy vehicle)
    const isReadOnlyInstance = !!veiculo.__readonly;
    document.querySelectorAll('button[data-acao="editar"], button[data-acao="excluir"]').forEach(b => {
        // only disable buttons that belong to the current container (match data-tipo)
        const btnTipo = b.dataset.tipo;
        // only consider visitor-mode as disabling when there is no token present (avoid stale flag blocking logged-in users)
        if (btnTipo === veiculo.getIdPrefix()) b.disabled = isReadOnlyInstance || (isVisitor && !getToken());
    });
    document.querySelectorAll(`.manutencao-form[data-tipo]`).forEach(form => {
        if (form.dataset.tipo === veiculo.getTipo()) {
            form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = isReadOnlyInstance || (isVisitor && !getToken()));
        }
    });

    // Ensure visitor restrictions applied for other UI elements
    applyVisitorUI();
}

function applyVisitorUI() {
    // Only treat visitor-mode as disabling when there's no auth token — avoids blocking a logged-in session if isVisitor flag wasn't cleared.
    const disable = isVisitor && !getToken();
    document.querySelectorAll('button[data-acao="editar"], button[data-acao="excluir"]').forEach(b => b.disabled = disable);
    document.querySelectorAll('.manutencao-form input, .manutencao-form textarea, .manutencao-form button').forEach(el => el.disabled = disable);
    const addLink = document.querySelector('#sidebar-menu a[data-action="mostrarFormAddVeiculo"]');
    if (addLink) addLink.style.display = disable ? 'none' : 'block';
}



// Função para exibir feedback dentro do overlay de autenticação
let authFeedbackTimeout;
function mostrarAuthFeedback(mensagem, tipo = 'info') {
    const authFeedbackDiv = document.getElementById('auth-feedback');
    if (!authFeedbackDiv) {
        console.error("[Auth Feedback] Elemento #auth-feedback não encontrado!");
        return;
    }

    clearTimeout(authFeedbackTimeout); // Limpa qualquer timeout anterior
    authFeedbackDiv.textContent = mensagem;
    authFeedbackDiv.className = `auth-feedback ${tipo}`; // Adiciona a classe para estilização de cor
    authFeedbackDiv.style.display = 'block';

    // Oculta a mensagem após alguns segundos (opcional)
    authFeedbackTimeout = setTimeout(() => {
        if (authFeedbackDiv) authFeedbackDiv.style.display = 'none';
    }, 8000); // Exibe por 8 segundos
}


// -------------------- AUTENTICAÇÃO FRONTEND --------------------
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
}

async function authorizedFetch(url, options = {}) {
    const token = getToken();
    options.headers = options.headers || {};
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, options);
}

function showLoggedInUI(email) {
    const formsEl = document.getElementById('auth-forms');
    const loggedEl = document.getElementById('auth-logged');
    const emailEl = document.getElementById('auth-user-email');
    if (formsEl) formsEl.style.display = 'none';
    if (loggedEl) loggedEl.style.display = 'block';
    if (emailEl) emailEl.textContent = email || 'Usuário';

    // Also set a greeting in the welcome area
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.innerHTML = `<h1>Olá ${email || 'Usuário'}!</h1><p>Use o menu à esquerda para gerenciar seus veículos.</p>`;

    // Persist display name so it survives reloads
    if (email) localStorage.setItem('userName', email);

    // Ensure visitor flag is cleared (persisted + runtime) so the UI allows mutating actions
    try { localStorage.removeItem('visitor'); } catch (e) { /* ignore */ }
    try { isVisitor = false; } catch (e) { /* ignore */ }

    // Show success feedback
    mostrarAuthFeedback(MESSAGES.SESSION_STARTED || 'Sessão iniciada corretamente!', 'success');

    // Also populate the sidebar account block if present
    try { showAccountInSidebar(email); } catch (e) { /* ignore */ }
}

function showLoggedOutUI() {
    const formsEl = document.getElementById('auth-forms');
    const loggedEl = document.getElementById('auth-logged');
    const emailEl = document.getElementById('auth-user-email');
    if (formsEl) formsEl.style.display = 'block';
    if (loggedEl) loggedEl.style.display = 'none';
    if (emailEl) emailEl.textContent = '';
    // A mensagem de logout será mostrada pelo handleLogout

    // hide sidebar account block
    const acc = document.getElementById('sidebar-account'); if (acc) acc.style.display = 'none';
}

/**
 * Show account info in the sidebar when user is logged in
 * @param {string} displayName
 */
function showAccountInSidebar(displayName) {
    const accountBlock = document.getElementById('sidebar-account');
    const nameEl = document.getElementById('account-name');
    if (!accountBlock || !nameEl) return;
    nameEl.textContent = displayName || localStorage.getItem('userName') || '-';
    accountBlock.style.display = 'block';

    // wire buttons
    const viewBtn = document.getElementById('sidebar-account-view');
    const editBtn = document.getElementById('sidebar-account-edit');
    const logoutBtn = document.getElementById('sidebar-logout-btn');

    if (viewBtn) viewBtn.onclick = handleAccountView;
    if (editBtn) editBtn.onclick = handleAccountEdit;
    if (logoutBtn) logoutBtn.onclick = handleLogout;
}

async function handleAccountView() {
    try {
        const resp = await authorizedFetch(`${backendUrl}/api/auth/me`);
        if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) {
                setToken(null); showLoggedOutUI(); mostrarAuthFeedback(MESSAGES.SESSION_EXPIRED, 'error');
                const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex';
                return;
            }
            const txt = await resp.text(); mostrarFeedback('Erro ao obter dados da conta: ' + txt, 'error');
            return;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await resp.text();
            console.warn('handleAccountView: server returned non-json response', text.substring(0, 300));
            mostrarFeedback('Resposta inesperada do servidor ao obter dados da conta.', 'error');
            return;
        }

        const data = await resp.json();
        // show a simple modal-like prompt with user data (read-only)
        const info = `Nome: ${data.user.name || '-'}\nEmail: ${data.user.email || '-'}\nCriado em: ${data.user.createdAt || '-'}`;
        alert(info);
    } catch (e) {
        console.error('Erro fetching account info', e); mostrarFeedback('Erro ao obter informações da conta.', 'error');
    }
}

async function handleAccountEdit() {
    // Ask for password confirmation before allowing sensitive updates
    const currentPassword = prompt('Para editar seus dados, confirme sua senha atual:');
    if (!currentPassword) { mostrarFeedback('Edição cancelada: senha não informada.', 'warning'); return; }

    // For simplicity, ask for new name (email change is not implemented here)
    const newName = prompt('Novo nome (deixe em branco para manter o atual):');
    if (newName === null) { mostrarFeedback('Edição cancelada.', 'info'); return; }

    try {
        const resp = await authorizedFetch(`${backendUrl}/api/auth/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: currentPassword, name: newName })
        });
        if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) { setToken(null); showLoggedOutUI(); mostrarAuthFeedback(MESSAGES.SESSION_EXPIRED, 'error'); const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex'; return; }
            const txt = await resp.text(); mostrarFeedback('Falha ao atualizar dados da conta: ' + (txt || resp.statusText), 'error'); return;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const txt = await resp.text(); mostrarFeedback('Resposta inesperada do servidor ao atualizar conta: ' + (txt || resp.statusText), 'error'); return;
        }

        const data = await resp.json();
        if (!data.success) { mostrarFeedback(data.error || 'Falha ao atualizar dados da conta.', 'error'); return; }
        // success
        mostrarFeedback(data.message || 'Dados atualizados com sucesso.', 'success');
        if (data.user && data.user.name) {
            localStorage.setItem('userName', data.user.name);
            showLoggedInUI(data.user.name + ' (' + (data.user.email || '') + ')');
        }
    } catch (e) {
        console.error('Erro updating account', e); mostrarFeedback('Erro ao atualizar conta.', 'error');
    }
}

async function handleRegister(email, password) {
    console.debug('[FRONTEND] handleRegister called with email=', email);
    if (authFeedback) authFeedback.style.display = 'none'; // Esconde feedback anterior

    // Basic validations with many user-facing messages
    const nameInput = document.getElementById('register-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        mostrarAuthFeedback(MESSAGES.REQUIRED_NAME, 'error');
        return false;
    }
    if (!email || !email.trim()) {
        mostrarAuthFeedback(MESSAGES.REQUIRED_EMAIL, 'error'); // 16. Campos obrigatórios não preenchidos!
        return false;
    }
    const emailTrim = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
        mostrarAuthFeedback('Email inválido: formato incorreto.', 'error');
        const proceed = confirm(MESSAGES.INVALID_EMAIL_PROMPT);
        if (!proceed) {
            mostrarAuthFeedback(MESSAGES.INVALID_EMAIL_CANCELLED, 'info');
            return false;
        }
    }

    if (!password) {
        mostrarAuthFeedback(MESSAGES.REQUIRED_PASSWORD, 'error'); // 16. Campos obrigatórios não preenchidos!
        return false;
    }
    
    const confirmPassword = document.getElementById('register-password-confirm').value;
    if (password !== confirmPassword) {
        mostrarAuthFeedback(MESSAGES.PASSWORDS_MISMATCH, 'warning'); // 23. Confirme sua senha para continuar.
        return false;
    }


    // Evaluate password strength (0..4)
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) {
        const proceed = confirm(MESSAGES.PASSWORD_WEAK_CONFIRM); // 26. Senha muito fraca, escolha outra.
        if (!proceed) { mostrarAuthFeedback(MESSAGES.REGISTER_CANCELLED_WEAK, 'info'); return false; }
        mostrarAuthFeedback('Aviso: você optou por prosseguir com senha fraca.', 'warning');
    } else if (score === 2) {
        const proceed = confirm('Senha de força média. Deseja prosseguir?');
        if (!proceed) { mostrarAuthFeedback('Registro cancelado: escolha uma senha mais segura.', 'info'); return false; }
    } else {
        // mostrarAuthFeedback('Senha aceita. Verificando dados, aguarde...', 'info'); // 22. Verificando dados, aguarde...
    }

    mostrarAuthFeedback(MESSAGES.VERIFYING_DATA, 'info'); // 22. Verificando dados, aguarde...
    try {
        const res = await fetch(`${backendUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: emailTrim, password })
        });
        console.debug('[FRONTEND] register response status=', res.status);
        let data;
        try { data = await res.json(); } catch (e) { data = { success: false, error: 'Resposta inesperada do servidor.' }; }
        console.debug('[FRONTEND] register response body=', data);

        if (data.success) {
            mostrarAuthFeedback(data.message || MESSAGES.ACCOUNT_CREATED_REDIRECTING, 'success');
            // If backend returned user info, show name in UI quickly
            if (data.user && data.user.name) {
                showLoggedInUI(data.user.name + ' (' + (data.user.email || '') + ')');
            }
            // 24. Conta criada, redirecionando...
            setTimeout(() => {
                mostrarAuthFeedback(MESSAGES.ACCOUNT_CREATED_REDIRECTING, 'info');
                const tabLoginEl = document.getElementById('tab-login');
                if (tabLoginEl) tabLoginEl.click();
            }, 3000); // Aguarda 3 segundos antes de redirecionar para a aba de login
            return true;
        } else {
            const feedbackType = (res.status === 409 || res.status === 400) ? 'warning' : 'error';
            mostrarAuthFeedback(data.error || 'Erro ao registrar a conta!', feedbackType); // 14. Erro ao registrar a conta!
            return false;
        }
    } catch (err) {
        console.error('Register network/error', err);
        mostrarAuthFeedback('Erro no servidor, tente novamente!', 'error'); // 17. Erro no servidor, tente novamente!
        return false;
    }
}

async function handleLogin(email, password) {
    console.debug('[FRONTEND] handleLogin called with email=', email);
    if (authFeedback) authFeedback.style.display = 'none'; // Esconde feedback anterior

    if (!email || !email.trim()) {
        mostrarAuthFeedback(MESSAGES.REQUIRED_EMAIL, 'error'); // 16. Campos obrigatórios não preenchidos!
        return false;
    }
    if (!password) {
        mostrarAuthFeedback(MESSAGES.REQUIRED_PASSWORD, 'error'); // 16. Campos obrigatórios não preenchidos!
        return false;
    }

    mostrarAuthFeedback(MESSAGES.VERIFYING_DATA, 'info'); // 22. Verificando dados, aguarde...
    try {
        const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password })
        });
        console.debug('[FRONTEND] login response status=', res.status);
        let data;
        try { data = await res.json(); } catch (e) { data = { success: false, error: 'Resposta inesperada do servidor.' }; }
        console.debug('[FRONTEND] login response body=', data);

        if (data.success) {
            if (data.token) setToken(data.token);
            mostrarAuthFeedback('Login realizado com sucesso!', 'success'); // 2. Login realizado com sucesso!
            isVisitor = false;
            // clear persisted visitor flag if present so UI won't treat this session as visitor
            localStorage.removeItem('visitor');
            // Prefer backend-provided name if available
                const displayName = (data.user && data.user.name) ? data.user.name : email.trim();
                showLoggedInUI(displayName);
                // Persist user name separately (used for greeting on future reloads)
                if (data.user && data.user.name) localStorage.setItem('userName', data.user.name);
            const overlayEl = document.getElementById('auth-overlay');
            if (overlayEl) overlayEl.style.display = 'none';
            await carregarGaragem();
            return true;
        } else {
            const feedbackType = (res.status === 404 || res.status === 401 || res.status === 403) ? 'error' : 'warning';
            mostrarAuthFeedback(data.error || 'Erro ao fazer login!', feedbackType); // 15. Erro ao fazer login!
            if (res.status === 403 && data.verificationToken) {
                // Mensagem específica para conta não verificada com opção de auto-verificar em dev
                const tryVerify = confirm('Sua conta pode não estar verificada. Deseja tentar verificar automaticamente? (Apenas para desenvolvimento)');
                if (tryVerify) {
                    mostrarAuthFeedback('Verificação em andamento...', 'info'); // 29. Verificação em andamento...
                    const vresp = await fetch(`${backendUrl}/api/auth/verify/${data.verificationToken}`);
                    if (vresp.ok) {
                        mostrarAuthFeedback('Verificação automática concluída. Tente entrar novamente.', 'success');
                    } else {
                        mostrarAuthFeedback('Falha ao verificar automaticamente.', 'error');
                    }
                }
            }
            return false;
        }
    } catch (err) {
        console.error('Login network/error', err);
        mostrarAuthFeedback('Erro no servidor, tente novamente!', 'error'); // 17. Erro no servidor, tente novamente!
        return false;
    }
}

function handleLogout() {
    setToken(null);
    showLoggedOutUI();
    isVisitor = false;
    localStorage.removeItem('visitor');
    document.querySelectorAll('.veiculo-item').forEach(i => i.remove());
    Object.keys(veiculosInstanciados).forEach(k => delete veiculosInstanciados[k]);
    document.getElementById('welcome-message').style.display = 'block';
    mostrarAuthFeedback('Logout realizado com sucesso!', 'success'); // 6. Logout realizado com sucesso!
    // show auth overlay modal again to require login/visitor selection
    const overlayEl = document.getElementById('auth-overlay');
    if (overlayEl) overlayEl.style.display = 'flex';
}

async function buscarPrevisaoTempo(cidade, tipoVeiculo) {
    if (!cidade) {
        mostrarFeedback('Digite o nome de uma cidade.', 'warning');
        return;
    }

    const resultadoDiv = document.getElementById(`previsao-tempo-resultado-${tipoVeiculo}`);
    const nomeCidadeSpan = document.getElementById(`nome-cidade-previsao-${tipoVeiculo}`);
    const botao = document.getElementById(`verificar-clima-btn-${tipoVeiculo}`);

    resultadoDiv.innerHTML = '<p>Buscando previsão...</p>';
    botao.disabled = true;

    try {
        const url = `${backendUrl}/api/previsao/${encodeURIComponent(cidade)}`;
        const response = await fetch(url);
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { success: false, error: 'Resposta inesperada do servidor para previsão.' };
        }

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro ao buscar previsão.');
        }

        nomeCidadeSpan.textContent = `${data.nomeCidade}, ${data.pais}`;
        resultadoDiv.innerHTML = `
            <div class="previsao-atual-card">
                <h5>${data.descricaoClima}</h5>
                <img src="https://openweathermap.org/img/wn/${data.iconeClima}@2x.png" alt="${data.descricaoClima}">
                <p>Temp: ${data.temperaturaAtual.toFixed(1)}°C</p>
                <p>Sensação: ${data.sensacaoTermica.toFixed(1)}°C</p>
            </div>`;
        mostrarFeedback('Operação concluída com sucesso! Previsão do tempo atualizada.', 'success'); // 10. Operação concluída com sucesso!
    } catch (error) {
        mostrarFeedback(error.message, 'error');
        resultadoDiv.innerHTML = `<p style="color:red;">Falha ao buscar previsão.</p>`;
    } finally {
        botao.disabled = false;
    }
}

function preencherFormularioEdicao(veiculo) {
    document.getElementById('edit-veiculo-id').value = veiculo._id;
    document.getElementById('edit-veiculo-placa-original').value = veiculo.placa;
    document.getElementById('edit-veiculo-tipo').value = veiculo.getTipo();
    document.getElementById('edit-veiculo-modelo-title').textContent = veiculo.modelo;
    document.getElementById('edit-modelo').value = veiculo.modelo;
    document.getElementById('edit-placa').value = veiculo.placa;
    document.getElementById('edit-cor').value = veiculo.cor;
    document.getElementById('edit-marca').value = veiculo.marca || '';
    document.getElementById('edit-ano').value = veiculo.ano || '';

    const editPlacaInput = document.getElementById('edit-placa');
    editPlacaInput.closest('.mb-3').style.display = (veiculo.getTipo() === 'bicicleta') ? 'none' : 'block';
    
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('add-veiculo-form-container').style.display = 'none';
    document.querySelectorAll('.veiculo-container').forEach(c => c.style.display = 'none');
    editVeiculoFormContainer.style.display = 'block';
}

// Global function to update maintenance display (called by Veiculo class)
window.atualizarDisplayManutencaoUI = function(veiculo) {
    const { historicoPassado, agendamentosFuturos } = veiculo.getManutencoesSeparadas();
    
    const historicoList = document.getElementById(`${veiculo.getIdPrefix()}-historico-lista`);
    const agendamentosList = document.getElementById(`${veiculo.getIdPrefix()}-agendamentos-lista`);

    if (historicoList) {
        historicoList.innerHTML = ''; // Limpa a lista existente
        if (historicoPassado.length === 0) {
            historicoList.innerHTML = '<li>Nenhum registro.</li>';
        } else {
            historicoPassado.forEach(manutencao => {
                const li = document.createElement('li');
                li.innerHTML = manutencao.formatarParaHistorico();
                historicoList.appendChild(li);
            });
        }
    }

    if (agendamentosList) {
        agendamentosList.innerHTML = ''; // Limpa a lista existente
        if (agendamentosFuturos.length === 0) {
            agendamentosList.innerHTML = '<li>Nenhum agendamento.</li>';
        } else {
            agendamentosFuturos.forEach(manutencao => {
                const li = document.createElement('li');
                li.innerHTML = manutencao.formatarParaAgendamento();
                agendamentosList.appendChild(li);
            });
        }
    }
     // Adicionar event listeners para os botões de remover manutenção
     document.querySelectorAll('.remover-manutencao-btn').forEach(btn => {
        btn.onclick = (e) => {
            const manutencaoId = e.target.dataset.id;
            if (confirm('Tem certeza que deseja remover este registro de manutenção?')) {
                veiculo.removerManutencao(manutencaoId);
            }
        };
    });
};


// ===========================================================================
// CONFIGURAÇÃO DOS EVENTOS
// ===========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.debug('[FRONTEND] DOMContentLoaded fired. backendUrl=', backendUrl, 'isVisitor=', isVisitor);
    // Early-hook auth overlay elements and switchTab so other startup logic can call it
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabVisitor = document.getElementById('tab-visitor');
    const loginPane = document.getElementById('login-form');
    const registerPane = document.getElementById('register-form');
    const visitorPane = document.getElementById('visitor-pane');
    const authOverlay = document.getElementById('auth-overlay');
    const visitorBtn = document.getElementById('visitor-btn');

    function switchTab(tab) {
        if (!tabLogin || !tabRegister || !tabVisitor || !loginPane || !registerPane || !visitorPane) return;
        tabLogin.classList.remove('active'); tabRegister.classList.remove('active'); tabVisitor.classList.remove('active');
        loginPane.style.display = 'none'; registerPane.style.display = 'none'; visitorPane.style.display = 'none';
        if (tab === 'login') { tabLogin.classList.add('active'); loginPane.style.display = 'block'; }
        if (tab === 'register') { tabRegister.classList.add('active'); registerPane.style.display = 'block'; }
        if (tab === 'visitor') { tabVisitor.classList.add('active'); visitorPane.style.display = 'block'; }
        if (authFeedback) authFeedback.style.display = 'none'; // Esconde feedback ao trocar de aba
    }
    
    // Determine auth state from localStorage; show modal overlay if not authenticated and not visitor
    const token = localStorage.getItem('token');
    const visitorFlag = localStorage.getItem('visitor');
    if (visitorFlag === '1') isVisitor = true; // '1' para garantir que é string '1'

    if (getToken()) {
        showLoggedInUI(); // Tentativa de mostrar UI logada sem email específico
        // Tenta carregar garagem; se não autorizado, limpa token
        const resp = await authorizedFetch(`${backendUrl}/api/veiculos`);
        if (resp.status === 401 || resp.status === 403) {
            setToken(null);
            showLoggedOutUI();
                mostrarAuthFeedback(MESSAGES.SESSION_EXPIRED, 'error'); // 19. Sessão expirada, faça login novamente!
                mostrarAuthFeedback(MESSAGES.SESSION_EXPIRED, 'error'); // 19. Sessão expirada, faça login novamente!
            document.getElementById('auth-overlay').style.display = 'flex';
        } else {
            await carregarGaragem();
        }
    } else if (isVisitor) {
        showLoggedOutUI(); // Mesmo como visitante, mostramos a UI "deslogada" para ver o botão de visitante.
        document.getElementById('auth-overlay').style.display = 'none'; // Esconde se já é visitante
        mostrarAuthFeedback('Entrou em modo Visitante. Visualização somente leitura.', 'info');
        await carregarGaragem(); // Carrega os dados públicos para o visitante
    } else {
        // Se não há token e não é visitante, mostrar overlay de autenticação
        const overlayEl = document.getElementById('auth-overlay');
        if (overlayEl) overlayEl.style.display = 'flex';
        switchTab('login'); // Começa na aba de login
    }

    // If there's a persisted userName (from previous login), show greeting even if we don't have full user info yet
    const persistedName = localStorage.getItem('userName');
    if (persistedName) {
        const welcome = document.getElementById('welcome-message');
        if (welcome) welcome.innerHTML = `<h1>Olá ${persistedName}!</h1><p>Use o menu à esquerda para gerenciar seus veículos.</p>`;
    }
    
    mainContent.addEventListener('click', async (e) => {
        const target = e.target;
        const veiculo = veiculosInstanciados[veiculoAtivoId];

        // Botão de Ver Previsão
        if (target.classList.contains('verificar-clima-btn-veiculo')) {
            const tipo = target.dataset.veiculoTipo;
            const cidadeInput = document.getElementById(`cidade-previsao-input-${tipo}`);
            if (cidadeInput) buscarPrevisaoTempo(cidadeInput.value, tipo);
        }

        // Ações de POO, Editar e Excluir
        if (target.dataset.acao) {
            // Se o veiculoAtivoId for nulo ou o veículo não estiver instanciado, não permite ações
            if (!veiculo) {
                mostrarFeedback('Nenhum veículo selecionado para esta ação.', 'warning');
                return;
            }
            const acao = target.dataset.acao;

            // LÓGICA DE EDITAR
            if (acao === 'editar') {
                if (isVisitor) { mostrarFeedback('Visitantes não podem editar veículos.', 'warning'); return; }
                preencherFormularioEdicao(veiculo);
                return;
            }

            // LÓGICA DE EXCLUIR
            if (acao === 'excluir') {
                if (isVisitor) { mostrarFeedback('Visitantes não podem excluir veículos.', 'warning'); return; }
                if (!confirm(`Tem certeza que deseja excluir o veículo "${veiculo.modelo}"?`)) return;
                try {
                        // Use a robust id: prefer _id, then id, then try instance method getId()
                        const idToDelete = veiculo._id || veiculo.id || (typeof veiculo.getId === 'function' ? veiculo.getId() : null);
                        if (!idToDelete) throw new Error('Identificador do veículo não encontrado.');
                        const encodedId = encodeURIComponent(idToDelete);
                        const response = await authorizedFetch(`${backendUrl}/api/veiculos/${encodedId}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok || !data.success) {
                            // If unauthorized, prompt login
                            if (response.status === 401 || response.status === 403) {
                                setToken(null);
                                showLoggedOutUI();
                                mostrarAuthFeedback(MESSAGES.SESSION_EXPIRED, 'error');
                                const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex';
                                throw new Error(data.error || 'Ação não autorizada. Faça login para continuar.');
                            }
                            throw new Error(data.error || 'Erro ao excluir veículo.');
                    }
                    mostrarFeedback(data.message || `"${veiculo.modelo}" foi excluído.`, 'success'); // 10. Operação concluída com sucesso!
                    await carregarGaragem();
                } catch (error) {
                    mostrarFeedback(error.message, 'error');
                }
                return;
            }
            
            // Ações de POO (ligar, acelerar, etc.)
            // 'pedalar' é exposto no HTML para bicicletas, mapearemos para o método 'acelerar' da classe
            // Removed vehicle control actions: only keep maintenance and management actions
            const mutateActions = ['adicionarManutencao','editar','excluir'];
            // Only block mutate actions when we are in visitor mode AND there is no token present.
            // This avoids blocking real logged-in users when the runtime flag is out-of-sync.
            if (isVisitor && !getToken() && mutateActions.includes(acao)) {
                // Debug: log runtime values to help diagnose false visitor state
                console.debug('[DEBUG] Blocked mutate action for visitor (no token)', { acao, isVisitor, tokenPresent: !!getToken(), veiculoId: veiculo ? (veiculo._id || veiculo.id || veiculo.idPrefix) : null, veiculoOwner: veiculo ? veiculo.owner : null });
                // Pergunta ao visitante se quer registrar/entrar para habilitar a ação
                const goRegister = confirm('Ação disponível apenas para usuários registrados. Deseja criar uma conta ou entrar para continuar?');
                if (goRegister) {
                    const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex';
                    const tabLoginEl = document.getElementById('tab-login'); if (tabLoginEl) tabLoginEl.click();
                }
                return;
            }
            // Mapear ações que não correspondem diretamente ao nome do método
            const method = (acao === 'pedalar') ? 'acelerar' : acao;

            if (typeof veiculo[method] === 'function') {
                // Ações de manutenção requerem um formulário e tratamento especial
                if (acao === 'adicionarManutencao') {
                    const form = target.closest('.manutencao-form');
                    const data = form.querySelector(`#${veiculo.getIdPrefix()}-manutencao-data`).value;
                    const tipo = form.querySelector(`#${veiculo.getIdPrefix()}-manutencao-tipo`).value;
                    const custo = form.querySelector(`#${veiculo.getIdPrefix()}-manutencao-custo`).value;
                    const descricao = form.querySelector(`#${veiculo.getIdPrefix()}-manutencao-descricao`).value;
                    
                    const novaManutencao = new Manutencao(data, tipo, custo, descricao);
                    veiculo.adicionarManutencao(novaManutencao); // Chama o método na instância do veículo
                    form.reset(); // Limpa o formulário após adicionar
                    } else {
                    // Mutating vehicle-control actions were removed. For backward compatibility,
                    // editing and deleting are handled elsewhere; any other actions are ignored.
                    mostrarFeedback('Ações de controle (ligar/andar/carregar/buzinar) foram removidas desta versão.', 'info');
                }
            }
        }
    });

    document.getElementById('sidebar-menu').addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        e.preventDefault();
        
        if (link.dataset.action === 'mostrarFormAddVeiculo') {
            if (isVisitor) { mostrarFeedback('Apenas usuários com conta podem criar veículos. Faça login ou registre-se.', 'warning'); return; }
            document.querySelectorAll('.veiculo-container, #edit-veiculo-form-container').forEach(c => c.style.display = 'none');
            document.getElementById('welcome-message').style.display = 'none';
            document.getElementById('add-veiculo-form-container').style.display = 'block';
            addVeiculoForm.reset();
            document.getElementById('add-caminhao-capacidade-group').style.display = 'none'; // Esconder ao abrir form
        } else if (link.dataset.veiculoId) {
            mostrarVeiculoContainer(link.dataset.veiculoId);
        }
    });

    // Lógica para mostrar/esconder campo de capacidade de carga do caminhão
    document.getElementById('add-tipo').addEventListener('change', (e) => {
        const tipoSelecionado = e.target.value;
        const caminhaoCapacidadeGroup = document.getElementById('add-caminhao-capacidade-group');
        if (tipoSelecionado === 'caminhao') {
            caminhaoCapacidadeGroup.style.display = 'block';
            caminhaoCapacidadeGroup.querySelector('input').setAttribute('required', 'required');
        } else {
            caminhaoCapacidadeGroup.style.display = 'none';
            caminhaoCapacidadeGroup.querySelector('input').removeAttribute('required');
        }
    });
    
    addVeiculoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isVisitor) {
            const goLogin = confirm('Para registrar um veículo você precisa estar logado. Deseja entrar ou criar uma conta agora?');
            if (goLogin) {
                const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex';
                const tabRegister = document.getElementById('tab-register'); if (tabRegister) tabRegister.click();
            }
            return;
        }
        
        const formData = new FormData(e.target);
        const tipo = formData.get('tipo');
        let placa = formData.get('placa');

        if (tipo !== 'bicicleta' && !placa) {
            return mostrarFeedback('A placa é obrigatória para este tipo de veículo.', 'warning');
        }

        const dadosParaBackend = {
            tipo: tipo,
            modelo: formData.get('modelo'),
            marca: formData.get('marca') || formData.get('modelo').split(' ')[0],
            ano: Number(formData.get('ano')) || new Date().getFullYear(),
            cor: formData.get('cor'),
            placa: (tipo === 'bicicleta') 
                ? `BIKE-${Math.random().toString(36).substring(2, 9).toUpperCase()}` 
                : placa.toUpperCase()
        };
        
        if (tipo === 'caminhao') {
            dadosParaBackend.capacidadeCarga = Number(formData.get('capacidade')) || 0;
            dadosParaBackend.cargaAtual = 0;
        }

        try {
            const response = await authorizedFetch(`${backendUrl}/api/veiculos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaBackend)
            });
            
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao criar veículo.');
            }
            
            mostrarFeedback(data.message || `"${data.veiculo.modelo}" criado com sucesso!`, 'success'); // 4. Dados salvos com sucesso!
            await carregarGaragem();
            mostrarVeiculoContainer(data.veiculo._id); // Acessa o _id do veiculo retornado
        } catch (error) {
            mostrarFeedback(error.message, 'error');
        }
    });

    editVeiculoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isVisitor) { mostrarFeedback('Visitantes não podem editar veículos.', 'warning'); return; }
        const veiculoId = document.getElementById('edit-veiculo-id').value;
        const dadosAtualizacao = {
            modelo: document.getElementById('edit-modelo').value,
            placa: document.getElementById('edit-placa').value.toUpperCase(),
            cor: document.getElementById('edit-cor').value,
            marca: document.getElementById('edit-marca').value,
            ano: Number(document.getElementById('edit-ano').value)
        };
        try {
            const response = await authorizedFetch(`${backendUrl}/api/veiculos/${veiculoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizacao)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao atualizar veículo.');
            }
            
            mostrarFeedback(data.message || `"${data.veiculo.modelo}" atualizado com sucesso!`, 'success'); // 4. Dados salvos com sucesso!
            await carregarGaragem();
            mostrarVeiculoContainer(data.veiculo._id);
        } catch (error) {
            mostrarFeedback(error.message, 'error');
        }
    });

    // Event listener para os formulários de manutenção
    document.querySelectorAll('.manutencao-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isVisitor) {
                const goLogin = confirm('Para agendar ou registrar uma manutenção você precisa estar logado. Deseja entrar ou criar uma conta agora?');
                if (goLogin) {
                    const overlay = document.getElementById('auth-overlay'); if (overlay) overlay.style.display = 'flex';
                    const tabLoginEl = document.getElementById('tab-login'); if (tabLoginEl) tabLoginEl.click();
                }
                return;
            }

            const veiculoTipo = form.dataset.tipo;
            const veiculoAtivo = veiculosInstanciados[veiculoAtivoId];

            if (!veiculoAtivo || veiculoAtivo.getTipo() !== veiculoTipo) {
                mostrarFeedback('Nenhum veículo ativo ou tipo de veículo incompatível para adicionar manutenção.', 'error');
                return;
            }

            const data = form.querySelector(`#${veiculoAtivo.getIdPrefix()}-manutencao-data`).value;
            const tipo = form.querySelector(`#${veiculoAtivo.getIdPrefix()}-manutencao-tipo`).value;
            const custo = form.querySelector(`#${veiculoAtivo.getIdPrefix()}-manutencao-custo`).value;
            const descricao = form.querySelector(`#${veiculoAtivo.getIdPrefix()}-manutencao-descricao`).value;
            
            const novaManutencao = new Manutencao(data, tipo, custo, descricao);
            
            // O método adicionarManutencao da classe Veiculo já lida com feedback e salvamento
            const sucesso = veiculoAtivo.adicionarManutencao(novaManutencao);
            if (sucesso) {
                form.reset(); // Limpa o formulário apenas se a adição for bem-sucedida
            }
        });
    });

    // Hook auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    console.debug('[FRONTEND] auth elements:', { loginFormExists: !!loginForm, registerFormExists: !!registerForm, logoutBtnExists: !!logoutBtn });

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name') ? document.getElementById('register-name').value.trim() : '';
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-password-confirm').value;
            // Validação de senhas antes de chamar handleRegister
            if (!name) { mostrarAuthFeedback('Por favor informe seu nome completo.', 'warning'); return; }
            if (password !== confirm) { mostrarAuthFeedback('As senhas não conferem. Por favor, confirme sua senha.', 'warning'); return; } // 23. Confirme sua senha para continuar.
            console.debug('[FRONTEND] submitting register form, name=', name, 'email=', email);
            const ok = await handleRegister(email, password);
            if (ok) registerForm.reset();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const ok = await handleLogin(email, password);
            if (ok) loginForm.reset();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            handleLogout();
        });
    }

    // Hook overlay tabs and visitor button (elements and switchTab already created earlier)
    if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));
    if (tabVisitor) tabVisitor.addEventListener('click', () => switchTab('visitor'));

    if (visitorBtn) visitorBtn.addEventListener('click', async () => {
        isVisitor = true;
        authOverlay.style.display = 'none';
        // persist visitor flag
        localStorage.setItem('visitor', '1');
        showLoggedOutUI(); // Ainda mostra a UI de deslogado, mas com o overlay escondido
        mostrarAuthFeedback('Entrou em modo Visitante. Visualização somente leitura.', 'info');
        await carregarGaragem(); // Carrega os dados públicos
    });

    // allow opening auth overlay from sidebar button
    const openAuthBtn = document.getElementById('open-auth-btn');
    if (openAuthBtn) openAuthBtn.addEventListener('click', () => {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'flex';
        // Ao abrir o modal, se não estiver logado, garante que a aba de login seja a inicial
        if (!getToken()) {
            switchTab('login');
        }
        if (authFeedback) authFeedback.style.display = 'none'; // Esconde feedback ao abrir modal
    });

    // password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            const input = document.getElementById(target);
            if (!input) return;
            if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
            else { input.type = 'password'; btn.textContent = '👁️'; }
        });
    });

    // password strength meter for register
    const pwdInput = document.getElementById('register-password');
    const pwdBar = document.querySelector('#password-strength .bar');
    const pwdLabel = document.querySelector('#password-strength .label');
    function evaluatePassword(pwd) {
        let score = 0;
        if (pwd.length >= 8) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
        return score; // 0..4
    }
    if (pwdInput && pwdBar && pwdLabel) { // Verifica se os elementos existem antes de adicionar o listener
        pwdInput.addEventListener('input', () => {
            const score = evaluatePassword(pwdInput.value);
            const pct = (score / 4) * 100;
            pwdBar.style.width = pct + '%';
            let txt = 'Fraca';
            if (score >= 3) txt = 'Boa';
            if (score === 4) txt = 'Forte';
            pwdLabel.textContent = txt;
            pwdBar.style.background = score <=1 ? '#dc3545' : score ===2 ? '#ffc107' : '#28a745';
        });
    }

    cancelEditVeiculoBtn.addEventListener('click', () => {
        editVeiculoFormContainer.style.display = 'none';
        if(veiculoAtivoId) mostrarVeiculoContainer(veiculoAtivoId);
    });

    // Chamadas para carregar os veículos em destaque, serviços e ferramentas
    async function carregarDestaques() {
        const container = document.getElementById('cards-veiculos-destaque');
        if (!container) return;
        container.innerHTML = '<p>Carregando destaques...</p>';
        try {
            const response = await fetch(`${backendUrl}/api/garagem/veiculos-destaque`);
            const text = await response.text();
            console.debug('[FRONTEND] veiculos-destaque raw response:', text);
            let data;
            try { data = JSON.parse(text); } catch (e) { data = { success: false, error: 'Resposta inválida do servidor.' }; }
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao carregar veículos em destaque.');
            }
            container.innerHTML = ''; // Limpa "Carregando..."
            data.veiculos.forEach(veiculo => {
                const card = document.createElement('div');
                card.className = 'veiculo-card-destaque';
                card.innerHTML = `
                    <img src="${veiculo.imagemUrl}" alt="${veiculo.modelo}">
                    <h3>${veiculo.modelo}</h3>
                    <p>Ano: ${veiculo.ano}</p>
                    <p>${veiculo.destaque}</p>
                `;
                container.appendChild(card);
            });
            if (data.veiculos.length === 0) {
                container.innerHTML = '<p>Nenhum veículo em destaque no momento.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar destaques:', error);
            container.innerHTML = `<p style="color:red;">Falha ao carregar veículos em destaque: ${error.message}</p>`;
            mostrarFeedback(`Erro ao carregar destaques: ${error.message}`, 'error');
        }
    }

    async function carregarServicos() {
        const lista = document.getElementById('lista-servicos-oferecidos');
        if (!lista) return;
        lista.innerHTML = '<p>Carregando serviços...</p>';
        try {
            const response = await fetch(`${backendUrl}/api/garagem/servicos-oferecidos`);
                const text = await response.text();
                console.debug('[FRONTEND] servicos-oferecidos raw response:', text);
                let data;
                try { data = JSON.parse(text); } catch (e) { data = { success: false, error: 'Resposta inválida do servidor.' }; }
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao carregar serviços.');
            }
            lista.innerHTML = ''; // Limpa "Carregando..."
            data.servicos.forEach(servico => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${servico.nome}</strong>: ${servico.descricao} (Estimado: ${servico.precoEstimado})`;
                lista.appendChild(li);
            });
            if (data.servicos.length === 0) {
                lista.innerHTML = '<p>Nenhum serviço oferecido no momento.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            lista.innerHTML = `<p style="color:red;">Falha ao carregar serviços: ${error.message}</p>`;
            mostrarFeedback(`Erro ao carregar serviços: ${error.message}`, 'error');
        }
    }

    async function carregarFerramentas() {
        const botoesContainer = document.getElementById('botoes-ferramentas');
        const detalheContainer = document.getElementById('detalhe-ferramenta');
        if (!botoesContainer || !detalheContainer) return;

        const ferramentasIds = ['F01', 'F02', 'F03']; // IDs das ferramentas disponíveis
        botoesContainer.innerHTML = ''; // Limpa botões anteriores
        detalheContainer.innerHTML = '<p>Clique em um dos botões acima para ver os detalhes de uma ferramenta específica.</p>';

        ferramentasIds.forEach(id => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-info btn-sm me-2';
            btn.textContent = `Ver ${id}`;
            btn.dataset.ferramentaId = id;
            btn.addEventListener('click', async () => {
                detalheContainer.innerHTML = '<p>Carregando detalhe da ferramenta...</p>';
                try {
                    const response = await fetch(`${backendUrl}/api/garagem/ferramentas-essenciais/${id}`);
                    const data = await response.json();
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || 'Erro ao carregar detalhe da ferramenta.');
                    }
                    const ferramenta = data.ferramenta;
                    detalheContainer.innerHTML = `
                        <p><strong>ID:</strong> ${ferramenta.id}</p>
                        <p><strong>Nome:</strong> ${ferramenta.nome}</p>
                        <p><strong>Utilidade:</strong> ${ferramenta.utilidade}</p>
                        <p><strong>Categoria:</strong> ${ferramenta.categoria}</p>
                    `;
                    mostrarFeedback('Detalhes da ferramenta carregados com sucesso!', 'success'); // 10. Operação concluída com sucesso!
                } catch (error) {
                    console.error(`Erro ao carregar detalhe da ferramenta ${id}:`, error);
                    detalheContainer.innerHTML = `<p style="color:red;">Falha ao carregar detalhe da ferramenta: ${error.message}</p>`;
                    mostrarFeedback(`Erro ao carregar detalhe da ferramenta ${id}: ${error.message}`, 'error');
                }
            });
            botoesContainer.appendChild(btn);
        });
    }

    // Chamar as funções de carregamento para as novas seções
    carregarDestaques();
    carregarServicos();
    carregarFerramentas();

});

// Expose global wrappers so inline onclick in HTML works even when module scope would prevent direct calls.
window._doLogin = async function (ev) {
    try {
        ev && ev.preventDefault && ev.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        console.debug('[FRONTEND] _doLogin called');
        await handleLogin(email, password);
    } catch (err) { console.error('Error in _doLogin', err); }
};

window._doRegister = async function (ev) {
    try {
        ev && ev.preventDefault && ev.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-password-confirm').value;
        console.debug('[FRONTEND] _doRegister called');
        if (password !== confirm) { mostrarAuthFeedback('As senhas não conferem. Por favor, confirme sua senha.', 'warning'); return; }
        await handleRegister(email, password);
    } catch (err) { console.error('Error in _doRegister', err); }
};