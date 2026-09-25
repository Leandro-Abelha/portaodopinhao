# Portal do Pinhão

Site de notícias com painel administrativo. Node + Express, banco Postgres e fotos no Supabase, hospedado na Vercel.

## Variáveis de ambiente
Veja `.env.example`. Na Vercel: Project → Settings → Environment Variables.

| Variável | Onde pegar |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → Transaction pooler |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (chave privada) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Você escolhe. Criam o primeiro acesso ao painel; depois de entrar, troque a senha em Minha conta |

A chave `service_role` dá acesso total ao banco: nunca coloque no GitHub nem em código.

## Rodar no computador
    npm install
    cp .env.example .env   # preencha
    npm start

Site em http://localhost:3000 e painel em http://localhost:3000/admin.

## Limites
- Foto: JPG, PNG ou WEBP, até 4 MB (limite de envio da Vercel).
