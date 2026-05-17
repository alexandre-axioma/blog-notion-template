# Notion Astro Blog Starter

Starter para criar um blog estático com conteúdo no Notion, build em Astro e deploy automático na Vercel.

O fluxo final é:

```txt
Notion -> Notion webhook -> Vercel deploy hook -> Astro build -> blog publicado
```

## Caminho mais simples

Você não precisa clonar o projeto nem rodar terminal para publicar o blog pela primeira vez. O caminho principal é:

1. Duplicar o template do GitHub.
2. Duplicar o template do Notion.
3. Criar uma Notion integration.
4. Liberar acesso à database em `Content access`.
5. Anotar as environment variables que já existem.
6. Opcional: preparar SEO audit.
7. Importar o repo na Vercel.
8. Configurar as environment variables.
9. Criar deploy hook e webhook.
10. Testar criando um post no Notion.

Use o clone local apenas quando quiser customizar UI, UX ou código.

## Templates

GitHub template:

https://github.com/alexandre-axioma/blog-notion-template/generate

Notion template:

https://fixed-sushi-1bf.notion.site/Blog-Notion-Template-f1d13d4a408c8285a99c01101e736767?pvs=74

## Variáveis

Você consegue preparar estas variáveis antes de criar o projeto na Vercel:

```env
NOTION_TOKEN=cole_a_chave_da_integration_do_notion
NOTION_BLOG_DATABASE_ID=id_da_sua_database
```

Use em `NOTION_BLOG_DATABASE_ID` o ID da database `Blog Content Management`, não o ID da página/painel `Blog Notion Template`.

Se quiser ativar SEO audit desde o começo, prepare também:

```env
SEO_AUDIT_SECRET=um_texto_secreto_forte
PAGESPEED_API_KEY=sua_chave_do_pagespeed_ou_vazio
```

Estas duas variáveis só existem depois que o projeto já foi criado na Vercel:

```env
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
NOTION_WEBHOOK_VERIFICATION_TOKEN=token_que_apareceu_no_log
```

## Notion integration

Crie uma connection em:

https://www.notion.so/profile/integrations

Na aba `Configuration`, copie o `Access token`. Use esse valor em `NOTION_TOKEN`.

Capabilities recomendadas para o fluxo principal:

- `Read content`: ligado
- `Update content`: desligado, exceto se você ativar SEO audit depois
- `Insert content`: desligado
- `No user information`: selecionado

Depois vá em `Content access`, clique em `Edit access` e selecione a página principal duplicada, `Blog Notion Template`. Se o Notion mostrar a database `Blog Content Management` separadamente, selecione ela também. Sem essa etapa, o build não consegue ler os posts.

No template, `Blog Notion Template` é a página/painel visual. `Blog Content Management` é a database real dos posts. O código consulta a database, então o ID usado em `NOTION_BLOG_DATABASE_ID` precisa vir de `Blog Content Management`.

Se a URL da database tiver `?v=`, use o ID antes de `?v=`. O valor depois de `?v=` é o ID da view, não da database.

## Publicação automática

Depois do primeiro deploy na Vercel:

1. Crie um deploy hook em `Settings` -> `Git` -> `Deploy Hooks`.
2. Salve a URL em `VERCEL_DEPLOY_HOOK_URL`.
3. No `Overview` da Vercel, copie a URL em `Production Deployment` -> `Domains`.
4. Se quiser domínio próprio, configure o domínio na Vercel antes de criar o webhook.
5. Crie uma webhook subscription no Notion apontando para `SUA_URL_DO_BLOG/api/notion-webhook`.
6. Em eventos, marque apenas `page.created`, `page.properties_updated` e `page.deleted`.
7. Deixe desmarcados `page.content_updated`, `Database`, `Data source`, `View`, `Comment` e outros grupos que não sejam `Page`.
8. Copie o verification token dos logs da Vercel.
9. Salve em `NOTION_WEBHOOK_VERIFICATION_TOKEN`.
10. Faça redeploy.

Este starter ignora `page.content_updated` para evitar deploy em todo autosave do Notion. Para publicar atualizações, altere uma propriedade relevante, como `Status`, `Slug`, `Categoria`, `Tags` ou `Data de Publicação`.

## Guia completo

O passo a passo completo está em:

docs/post-guia-blog-notion-astro-vercel.md

## Customizar localmente

Depois que o blog estiver funcionando, clone o repo se quiser editar o código:

```bash
git clone URL_DO_SEU_REPOSITORIO_CRIADO_A_PARTIR_DO_TEMPLATE
cd meu-blog
npm install
cp .env.example .env.local
npm run dev
```

Principais arquivos de UI:

```txt
src/pages/index.astro
src/pages/[slug].astro
src/pages/about.astro
src/layouts/BaseLayout.astro
src/styles/global.css
```

## SEO automático opcional

Existe uma rota opcional em `/api/seo-audit`. Para ativar, ligue `Update content` na Notion integration antes de criar o projeto na Vercel e configure:

```env
SEO_AUDIT_SECRET=um_texto_secreto_forte
PAGESPEED_API_KEY=sua_chave_do_pagespeed_ou_vazio
```

Um exemplo de workflow agendado está em `docs/seo-audit-workflow.example.yml`.
