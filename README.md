# Notion Astro Blog Starter

Starter para criar um blog estático com conteúdo no Notion, build em Astro e deploy automático na Vercel.

O fluxo final é:

```txt
Notion -> Notion webhook -> Vercel deploy hook -> Astro build -> blog publicado
```

## O que você vai precisar

- Uma conta no GitHub.
- Uma conta na Vercel.
- Uma conta no Notion.
- Node.js instalado para rodar localmente.

## 1. Duplicar o template do Notion

Duplique a database usada como modelo para o blog. Ela precisa ter estas propriedades:

| Propriedade | Tipo | Obrigatória |
| --- | --- | --- |
| `Titulo` | Title | Sim |
| `Status` | Status | Sim |
| `Data de Publicação` | Date | Sim |
| `Resumo do Conteúdo` | Rich text | Recomendado |
| `Categoria` | Select | Recomendado |
| `Tags` | Multi-select | Não |
| `Slug` | Rich text | Recomendado |
| `Link` | URL | Não |
| `Quantidade de Palavras` | Number | Não |
| `Hero` | Files & media | Não |
| `Thumb` | Files & media | Não |
| `SEO Score` | Number | Só para o extra de SEO |

Posts aparecem no blog quando:

- `Status` é `Publicado`, `Published` ou `Publish`; ou
- `Status` é `Programado` ou `Scheduled` e `Data de Publicação` já passou.

## 2. Criar a integration do Notion

1. Acesse `https://www.notion.so/profile/integrations`.
2. Crie uma nova internal integration.
3. Copie o token. Ele será usado em `NOTION_TOKEN`.
4. Abra sua database do blog no Notion.
5. Clique em `...`, depois em `Connections`, e adicione a integration.
6. Copie o ID da database. Ele será usado em `NOTION_BLOG_DATABASE_ID`.

## 3. Criar o projeto a partir deste template

No GitHub, crie um novo repositório usando este starter como template:

```txt
https://github.com/alexandre-axioma/blog-notion-template/generate
```

Depois, no seu computador:

```bash
git clone URL_DO_SEU_REPO_CRIADO_A_PARTIR_DO_TEMPLATE
cd blog
npm install
cp .env.example .env.local
```

Preencha:

```env
PUBLIC_SITE_URL=https://seu-blog.vercel.app
NOTION_TOKEN=cole_a_chave_da_integration_do_notion
NOTION_BLOG_DATABASE_ID=id_da_sua_database
VERCEL_DEPLOY_HOOK_URL=
NOTION_WEBHOOK_VERIFICATION_TOKEN=
SEO_AUDIT_SECRET=
PAGESPEED_API_KEY=
```

Rode localmente:

```bash
npm run dev
```

## 4. Publicar na Vercel

1. Na Vercel, importe o repositório do GitHub.
2. Use o preset `Astro`.
3. Configure as variáveis de ambiente:

```env
PUBLIC_SITE_URL=https://seu-blog.vercel.app
NOTION_TOKEN=cole_a_chave_da_integration_do_notion
NOTION_BLOG_DATABASE_ID=id_da_sua_database
```

4. Faça o primeiro deploy.
5. Depois do deploy, copie a URL pública gerada pela Vercel.
6. Atualize `PUBLIC_SITE_URL` na Vercel com a URL final.

## 5. Criar o deploy hook da Vercel

1. Abra o projeto na Vercel.
2. Vá em `Settings` -> `Git` -> `Deploy Hooks`.
3. Crie um hook, por exemplo `notion-blog-publish`.
4. Copie a URL do hook.
5. Salve na Vercel como:

```env
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
```

## 6. Criar o webhook do Notion

1. No Notion, abra as configurações da sua integration.
2. Crie um webhook apontando para:

```txt
https://seu-blog.vercel.app/api/notion-webhook
```

3. Durante a verificação, a Vercel vai registrar um `verification_token` nos logs da função.
4. Copie esse token.
5. Salve na Vercel como:

```env
NOTION_WEBHOOK_VERIFICATION_TOKEN=token_que_apareceu_no_log
```

6. Rode um novo deploy na Vercel para aplicar a variável.

## 7. Testar a publicação automática

1. Crie um post no Notion.
2. Preencha `Titulo`, `Resumo do Conteúdo`, `Categoria`, `Slug` e `Data de Publicação`.
3. Mude `Status` para `Publicado`.
4. Aguarde a Vercel receber o webhook e rodar o build.
5. Abra o blog e confirme que o post apareceu.

Este starter ignora eventos `page.content_updated` para evitar deploy em todo autosave do Notion. Para atualizar um texto já publicado, altere uma propriedade relevante, como `Status`, `Slug`, `Categoria`, `Tags` ou `Data de Publicação`, para disparar um novo rebuild.

## SEO automático opcional

Existe uma rota opcional em:

```txt
/api/seo-audit
```

Ela roda PageSpeed Insights para posts publicados e grava o resultado em `SEO Score` no Notion.

Para ativar:

```env
SEO_AUDIT_SECRET=um_texto_secreto_forte
PAGESPEED_API_KEY=sua_chave_do_pagespeed_ou_vazio
```

Chame a rota com header:

```bash
curl --request POST \
  --header "Authorization: Bearer SEU_SEO_AUDIT_SECRET" \
  "https://seu-blog.vercel.app/api/seo-audit"
```

Um exemplo de workflow agendado está em `docs/seo-audit-workflow.example.yml`.

## Customizar UI e UX

Os textos, marca, layout e componentes visuais ficam no código como placeholders. Depois que o blog estiver funcionando, adapte os arquivos em `src/pages`, `src/layouts` e `src/styles` para criar sua própria experiência visual.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run check
```
