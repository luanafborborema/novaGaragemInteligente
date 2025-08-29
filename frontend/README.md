# Garagem Inteligente Unificada

## Visão Geral do Projeto

A "Garagem Inteligente Unificada" é uma aplicação web interativa construída com HTML, CSS e JavaScript, utilizando os princípios da Programação Orientada a Objetos. O projeto simula o gerenciamento de uma garagem virtual, permitindo ao usuário adicionar, controlar e monitorar diferentes tipos de veículos.

O backend em Node.js/Express serve como o cérebro da aplicação, conectando-se a um banco de dados MongoDB Atlas para **persistência de dados** de veículos e manutenções, além de fornecer APIs para o frontend consumir.

## Funcionalidades Principais

*   **Gestão de Veículos com Persistência (CRUD Completo)**:
    *   **Adicionar (Create - POST)**: Crie novos veículos que são salvos no MongoDB.
    *   **Visualizar (Read - GET)**: Carrega e exibe todos os veículos salvos no banco de dados.
    *   **Editar (Update - PUT)**: Altera os dados de um veículo.
    *   **Excluir (Delete - DELETE)**: Remove permanentemente um veículo.
*   **Gestão de Manutenções (Sub-Recurso)**:
    *   Crie e liste registros de manutenção **associados a um veículo específico**.
    *   Os dados de manutenção são salvos no MongoDB, estabelecendo um relacionamento com os veículos.
*   **Integração com APIs**:
    *   **Previsão do Tempo**: Consulta a API OpenWeatherMap de forma segura através do backend.
    *   Endpoints de informação sobre a garagem (veículos em destaque, serviços, etc.).

## Tecnologias Utilizadas

*   **Frontend**: HTML5, CSS3, JavaScript (ES6+ com Módulos e POO).
*   **Backend**: Node.js, Express.js, Mongoose.
*   **Banco de Dados**: MongoDB Atlas.
*   **Deploy**: Render.com.

## Endpoints da API

### Veículos

*   `POST /api/veiculos`: Cria um novo veículo.
*   `GET /api/veiculos`: Lista todos os veículos.
*   `PUT /api/veiculos/:id`: Atualiza um veículo existente.
*   `DELETE /api/veiculos/:id`: Deleta um veículo.

### Manutenções (Sub-Recursos de Veículo)

A API suporta o gerenciamento de manutenções como um sub-recurso de um veículo, demonstrando um relacionamento de dados um-para-muitos (One-to-Many).

*   **`GET /api/veiculos/:veiculoId/manutencoes`**
    *   **Descrição**: Lista todas as manutenções associadas a um veículo específico, ordenadas pela data mais recente.
    *   **Parâmetros de URL**: `veiculoId` (ID do veículo).
    *   **Resposta de Sucesso (200 OK)**: Um array de objetos de manutenção.

*   **`POST /api/veiculos/:veiculoId/manutencoes`**
    *   **Descrição**: Cria um novo registro de manutenção para um veículo específico. O endpoint primeiro valida se o veículo existe.
    *   **Parâmetros de URL**: `veiculoId` (ID do veículo).
    *   **Corpo da Requisição (JSON)**:
        ```json
        {
          "descricaoServico": "Troca de pastilhas de freio",
          "data": "2024-08-20T10:00:00.000Z",
          "custo": 350.50,
          "quilometragem": 85000
        }
        ```
    *   **Resposta de Sucesso (201 Created)**: O objeto da manutenção recém-criada.

### Relacionamento entre Coleções

No MongoDB, temos duas coleções principais: `veiculos` e `manutencoes`. O relacionamento é estabelecido da seguinte forma:

- Cada documento na coleção **`manutencoes`** contém um campo chamado `veiculo`.
- Este campo armazena o `_id` (do tipo `ObjectId`) do documento correspondente na coleção **`veiculos`**.

Isso cria uma referência direta, permitindo que a aplicação consulte de forma eficiente todas as manutenções que pertencem a um único veículo.

## Como Usar e Testar Localmente

1.  **Clone o repositório**.
2.  **Configure o Backend**:
    *   Navegue até a pasta `backend/`.
    *   Instale as dependências: `npm install`.
    *   Crie um arquivo `.env` e adicione `PORT`, `OPENWEATHER_API_KEY` e `MONGO_URI_CRUD`.
    *   Inicie o servidor: `node server.js`.
3.  **Execute o Frontend**:
    *   Abra o arquivo `frontend/index.html` em um navegador.