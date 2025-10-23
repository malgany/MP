# Widget for ChatKit Marketplace

Aplicação Node.js com autenticação via Google OAuth 2.0 e área interna protegida. O backend usa Express, Passport e Prisma para persistir dados de usuários em PostgreSQL.

## Stack principal
- Node.js 18+
- Express 5
- Passport + `passport-google-oauth20`
- Express Session
- Prisma ORM (PostgreSQL)
- dotenv para configuração

## Pré-requisitos
- Node.js ≥ 18
- PostgreSQL ≥ 14 em execução (local ou remoto)
- Credenciais de OAuth 2.0 do Google (Client ID / Secret) com redirect `http://localhost:3000/auth/google/callback`

## Configuração inicial
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
3. Preencha o `.env` com:
   - `PORT`
   - `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `BASE_URL`
   - `DATABASE_URL` (ex.: `postgresql://user:password@localhost:5432/mp?schema=public`)
4. Verifique que o `.env` permanece fora do versionamento (`.gitignore` já cobre).

## Banco de dados & Prisma
- Ajuste `DATABASE_URL` para apontar para o banco desejado.
- Para aplicar as migrações existentes:
  ```bash
  npx prisma migrate deploy
  ```
- Para criar novas migrações sempre utilize:
  ```bash
  npm run prisma:migrate -- --name <nome-da-migracao>
  ```
- Após alterar o schema, gere o client:
  ```bash
  npm run prisma:generate
  ```

## Execução
- Executar em modo padrão:
  ```bash
  npm run start
  ```
- O servidor ficará disponível em `http://localhost:3000`.

## Fluxo de autenticação
- Usuário acessa `/` e clica em “Entrar com Google”.
- Após o consentimento, a aplicação cria/atualiza o usuário no banco (tabelas `User` e `Account`) e redireciona para `/app`.
- `/app` é protegido; acessos sem sessão válida retornam para `/`.
- O botão “Sair” executa `/auth/logout`, encerrando a sessão.

## Estrutura de pastas
- `src/app.js` – configuração Express.
- `src/config/passport.js` – estratégia Google e serialização.
- `src/routes` – rotas (`auth` inclui login/logout).
- `src/middleware` – middlewares (ex.: `ensureAuthenticated`).
- `src/db/prisma.js` – instância compartilhada do Prisma Client.
- `src/repositories` – acesso aos dados (ex.: `userRepository`).
- `public/` – assets e páginas estáticas (`index.html`, `app.html`).
- `prisma/` – schema e migrações SQL.

## Rotina diária sugerida
1. Tenha o PostgreSQL rodando.
2. Garanta que o `.env` esteja atualizado.
3. Rode `npm run start` para servir a aplicação.
4. Sempre que alterar o schema, gere nova migração e rode `npx prisma migrate deploy` antes de iniciar o servidor em produção.

## Testes manuais recomendados
1. Aplicar migrações com `npx prisma migrate deploy`.
2. Iniciar o servidor (`npm run start`).
3. Autenticar com uma conta de teste no Google.
4. Validar que `/app` só é acessível autenticado e que `/auth/logout` encerra a sessão.
