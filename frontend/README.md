# Garagem Inteligente Unificada

## Visão Geral do Projeto

A "Garagem Inteligente Unificada" é uma aplicação web interativa construída com HTML, CSS e JavaScript, utilizando os princípios da Programação Orientada a Objetos (POO). O projeto simula o gerenciamento de uma garagem virtual, permitindo ao usuário adicionar, controlar e monitorar diferentes tipos de veículos (Carro Casual, Carro Esportivo, Caminhão, Moto e Bicicleta), além de gerenciar o histórico de manutenções.

O backend em Node.js/Express serve como o cérebro da aplicação, conectando-se a um banco de dados MongoDB Atlas para **persistência de dados** e fornecendo diversas APIs (Application Programming Interfaces) para o frontend consumir.

## Funcionalidades Principais

*   **Gestão de Veículos com Persistência (CRUD Completo)**:
    *   **Adicionar Novos Veículos (Create - POST)**: Crie novos veículos através de um formulário no frontend, com os dados sendo salvos de forma **persistente** no MongoDB Atlas. Validação de dados (ex: placa única) é aplicada no backend.
    *   **Visualizar Veículos Existentes (Read - GET)**: Todos os veículos salvos no MongoDB são carregados e exibidos dinamicamente na sidebar do frontend, permitindo sua seleção e visualização detalhada.
    *   **Editar Veículos (Update - PUT)**: Altere os dados de um veículo (modelo, cor, etc.) através de um formulário de edição, com as mudanças salvas no MongoDB.
    *   **Excluir Veículos (Delete - DELETE)**: Remova permanentemente um veículo do banco de dados com uma confirmação.
*   **Controle e Simulação de Veículos**:
    *   Controle individual de cada veículo (ligar, desligar, acelerar, frear, buzinar).
    *   Funcionalidades específicas por tipo de veículo (ex: turbo para Carro Esportivo, carregar/descarregar para Caminhão).
*   **Registro e Histórico de Manutenção**:
    *   Registro e visualização de histórico e agendamentos de manutenção para cada veículo (dados persistidos no LocalStorage para manutenções).
*   **Integração com APIs Externas e Internas**:
    *   **Previsão do Tempo**: Consulta a previsão do tempo de cidades utilizando a API OpenWeatherMap (acessada de forma segura via backend Node.js, atuando como proxy).
    *   **Múltiplos Endpoints de Informação (Backend)**:
        *   **Veículos em Destaque**: `GET /api/garagem/veiculos-destaque` - Retorna uma lista de veículos com características especiais.
        *   **Serviços de Oficina**: `GET /api/garagem/servicos-oferecidos` - Lista os tipos de serviços que a garagem oferece.
        *   **Ferramentas Essenciais**: `GET /api/garagem/ferramentas-essenciais/:idFerramenta` - Retorna detalhes de uma ferramenta específica por ID.

## Tecnologias Utilizadas

*   **Frontend**:
    *   HTML5
    *   CSS3 (com Flexbox/Grid para layout)
    *   JavaScript (ES6+ com Módulos e Programação Orientada a Objetos)
    *   `LocalStorage` (para persistência do histórico de manutenções específico de cada veículo, além da gestão principal de veículos no MongoDB)
*   **Backend**:
    *   Node.js (ambiente de execução JavaScript)
    *   Express.js (framework web para Node.js)
    *   Mongoose (ODM para MongoDB, facilitando modelagem e interação com o DB)
    *   `dotenv` (para gerenciar variáveis de ambiente)
    *   `cors` (para permitir comunicação entre frontend e backend em origens diferentes)
*   **Banco de Dados**:
    *   MongoDB Atlas (Serviço de banco de dados NoSQL na nuvem para persistência principal de veículos)
*   **APIs Externas**:
    *   API OpenWeatherMap (para dados de previsão do tempo)
*   **Deploy (Publicação)**:
    *   Render.com (para deploy do backend Node.js e frontend)

## Como Usar e Testar Localmente

Para rodar a Garagem Inteligente no seu computador:

1.  **Clone o repositório**:
    `git clone https://github.com/SEU_USUARIO_GITHUB/NOME_DO_SEU_REPOSITORIO.git`
    *   **(Substitua `SEU_USUARIO_GITHUB/NOME_DO_SEU_REPOSITORIO` pelo link real do seu projeto no GitHub)**
2.  **Configurar o Backend**:
    *   Navegue até a pasta `backend/`: `cd NOME_DO_SEU_REPOSITORIO/backend`
    *   Instale as dependências: `npm install`
    *   Crie um arquivo `.env` na pasta `backend/` e adicione as seguintes variáveis de ambiente, **substituindo pelos seus valores reais**:
        ```
        PORT=3001
        OPENWEATHER_API_KEY=SUA_CHAVE_OPENWEATHER_MAP_AQUI
        MONGO_URI_CRUD=mongodb+srv://SEU_USUARIO_DB:SUA_SENHA_DB@SEU_CLUSTER_URL/garagemDB?retryWrites=true&w=majority&appName=SEU_APP_NAME
        ```
        *   Obtenha `OPENWEATHER_API_KEY` do OpenWeatherMap.
        *   Obtenha `MONGO_URI_CRUD` do seu [MongoDB Atlas](https://cloud.mongodb.com/) (configurando usuário, senha e Network Access para o seu IP local e `0.0.0.0/0` para o Render).
    *   Inicie o servidor backend: `node server.js`
        *   Você deverá ver mensagens de que o servidor está rodando na porta 3001 e que a conexão com o MongoDB Atlas foi bem-sucedida.

3.  **Executar o Frontend**:
    *   Navegue até a pasta `frontend/`: `cd NOME_DO_SEU_REPOSITORIO/frontend`
    *   Garanta que as pastas `imagens/` e `sons/` estão dentro da pasta `frontend/`.
    *   Abra o arquivo `index.html` diretamente em um navegador web moderno (Chrome, Firefox, Edge).

4.  **Testes da Aplicação Local**:
    *   **Adicionar Veículo**: Clique em "➕ Adicionar Veículo", preencha os dados e salve. Verifique se ele aparece na sidebar. **Recarregue a página (F5)**: O veículo deve permanecer na sidebar, confirmando a persistência no MongoDB.
    *   **Previsão do Tempo**: Selecione um veículo e, na seção de Previsão, digite uma cidade e clique em "Ver Previsão".
    *   **Outras Seções (Destaques, Serviços, Ferramentas)**: Verifique se as informações são carregadas e exibidas corretamente.

## API Key e Credenciais - Segurança

**⚠️ ALERTA DE SEGURANÇA CRÍTICO! ⚠️**

A chave de API da OpenWeatherMap e a string de conexão do MongoDB Atlas **NUNCA** devem ser expostas diretamente no código-fonte em um repositório público do GitHub.

Neste projeto, a `OPENWEATHER_API_KEY` e a `MONGO_URI_CRUD` são gerenciadas como **Variáveis de Ambiente**:

*   **Localmente**: Armazenadas no arquivo `backend/.env` (que é ignorado pelo Git através do `.gitignore`).
*   **No Deploy (Render)**: Configuras como variáveis de ambiente no painel do serviço no Render.com, protegendo suas credenciais.

## Deploy da Aplicação (Versão Pública na Nuvem)

Para que sua aplicação seja acessível publicamente no Render.com, as seguintes configurações são importantes:

*   **Web Service**: Criar um Web Service para seu projeto Node.js/Express.
*   **Build Command**: `npm install`
*   **Start Command**: `node server.js`
*   **Root Directory**: Apontar para a pasta `backend` onde seu `package.json` e `server.js` estão.
*   **Variáveis de Ambiente**: Adicionar `MONGO_URI_CRUD` e `OPENWEATHER_API_KEY` no painel "Environment" do Render.