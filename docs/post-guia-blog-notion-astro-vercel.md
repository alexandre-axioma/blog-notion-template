# Como criar seu próprio blog com Notion, Astro e Vercel

Este guia mostra como duplicar um projeto de blog pronto, conectar com uma database do Notion e publicar na Vercel com atualização automática. A ideia é que você escreva no Notion, mude o status do post para publicado, e o site faça o rebuild sozinho até o texto aparecer no blog.

No final, você terá um blog seu, com seu próprio conteúdo, seu próprio repositório no GitHub e uma estrutura pronta para customizar a UI com Codex, Claude Code ou qualquer agente de código. O objetivo aqui não é prender você a este visual, mas entregar um esqueleto funcional que você consiga adaptar para o seu estilo.

Se você veio pelo vídeo, use os títulos do post para pular direto para a etapa em que está: contas necessárias, template do GitHub, template do Notion, integration, Vercel, deploy hook, webhook ou teste final. Se você chegou direto por aqui, dá para seguir em ordem do começo ao fim.

## O que você vai construir

Você vai criar um blog estático gerado com Astro.

O conteúdo fica no Notion. O site é publicado na Vercel. Quando você muda uma propriedade importante no Notion, como `Status`, `Slug`, `Categoria`, `Tags` ou `Data de Publicação`, o Notion chama um webhook, e esse webhook dispara um novo deploy na Vercel.

Este starter não faz deploy a cada letra que você digita no corpo do post. Isso é intencional. O Notion salva o conteúdo várias vezes enquanto você escreve, e seria ruim gerar um novo deploy a cada autosave.

O fluxo recomendado é escrever o post no Notion, revisar, mudar `Status` para `Publicado`, esperar a Vercel rebuildar e abrir o blog para confirmar que o post apareceu.

## Contas necessárias

Você precisa ter:

- Uma conta no GitHub
- Uma conta na Vercel
- Uma conta no Notion
- Node.js instalado no computador, se quiser rodar localmente

Se você só quer publicar direto na Vercel, ainda assim recomendo rodar localmente pelo menos uma vez. Isso ajuda a confirmar que o Notion está conectado corretamente.

## Duplicar o template do GitHub

Abra o repositório do starter:

```txt
https://github.com/alexandre-axioma/blog-notion-template
```

Clique em `Use this template` e crie um novo repositório na sua conta. Se quiser ir direto para a tela de criação, use:

```txt
https://github.com/alexandre-axioma/blog-notion-template/generate
```

Sugestão de nome:

```txt
meu-blog
```

Depois, clone o repositório no seu computador:

```bash
git clone URL_DO_SEU_REPOSITORIO_CRIADO_A_PARTIR_DO_TEMPLATE
cd meu-blog
```

Instale as dependências:

```bash
npm install
```

## Duplicar o template do Notion

Abra o template da database do Notion:

```txt
COLE_AQUI_O_LINK_DO_TEMPLATE_DO_NOTION
```

Clique em `Duplicate` para copiar a database para sua própria workspace.

A database precisa ter estas propriedades:

| Propriedade | Tipo |
| --- | --- |
| `Titulo` | Title |
| `Status` | Status |
| `Data de Publicação` | Date |
| `Resumo do Conteúdo` | Rich text |
| `Categoria` | Select |
| `Tags` | Multi-select |
| `Slug` | Rich text |
| `Link` | URL |
| `Quantidade de Palavras` | Number |
| `Hero` | Files & media |
| `Thumb` | Files & media |
| `SEO Score` | Number |

Para o post aparecer no blog, use um destes status:

```txt
Publicado
Published
Publish
```

Para agendar um post, use:

```txt
Programado
Scheduled
```

Nesse caso, o post só aparece depois que `Data de Publicação` já passou.

## Criar a integration do Notion

Agora você precisa criar uma chave para o site conseguir ler sua database.

1. Acesse:

```txt
https://www.notion.so/profile/integrations
```

2. Clique em `New integration`.
3. Dê um nome, por exemplo:

```txt
Meu Blog
```

4. Escolha sua workspace.
5. Crie a integration.
6. Copie o token da integration.

Você vai usar esse valor como:

```env
NOTION_TOKEN=cole_a_chave_da_integration_do_notion
```

Agora conecte a integration na database:

1. Abra a database do blog no Notion.
2. Clique nos três pontos `...`.
3. Vá em `Connections`.
4. Adicione a integration que você acabou de criar.

Se você não fizer isso, o site não consegue ler seus posts.

## Copiar o ID da database do Notion

Abra a database no navegador e copie o ID da URL.

A URL normalmente parece com algo assim:

```txt
https://www.notion.so/workspace/Nome-da-database-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

O ID é a sequência grande de letras e números no final.

Você vai usar esse valor como:

```env
NOTION_BLOG_DATABASE_ID=id_da_sua_database
```

Pode colar com ou sem hífens.

## Rodar o projeto localmente

Na pasta do projeto, copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha:

```env
PUBLIC_SITE_URL=http://localhost:4321
NOTION_TOKEN=cole_a_chave_da_integration_do_notion
NOTION_BLOG_DATABASE_ID=id_da_sua_database
VERCEL_DEPLOY_HOOK_URL=
NOTION_WEBHOOK_VERIFICATION_TOKEN=
SEO_AUDIT_SECRET=
PAGESPEED_API_KEY=
```

Agora rode:

```bash
npm run dev
```

Abra:

```txt
http://localhost:4321
```

Se houver posts com `Status` como `Publicado`, eles devem aparecer no blog.

## Publicar na Vercel

Agora vamos colocar o blog no ar.

1. Acesse:

```txt
https://vercel.com
```

2. Clique em `Add New` -> `Project`.
3. Importe o repositório que você criou no GitHub.
4. A Vercel deve detectar o framework `Astro`.
5. Antes do deploy, adicione estas environment variables:

```env
PUBLIC_SITE_URL=https://seu-projeto.vercel.app
NOTION_TOKEN=cole_a_chave_da_integration_do_notion
NOTION_BLOG_DATABASE_ID=id_da_sua_database
```

6. Faça o primeiro deploy.

Depois que a Vercel terminar, copie a URL final do projeto. Ela será parecida com:

```txt
https://meu-blog.vercel.app
```

Volte nas environment variables da Vercel e confirme:

```env
PUBLIC_SITE_URL=https://meu-blog.vercel.app
```

Depois faça um novo deploy para garantir que essa URL entrou no build.

## Criar o deploy hook da Vercel

O deploy hook é uma URL especial da Vercel.

Quando essa URL recebe uma chamada, a Vercel faz um novo deploy.

É isso que vamos usar para atualizar o blog automaticamente quando o Notion avisar que algo mudou.

Na Vercel:

1. Abra o projeto.
2. Vá em `Settings`.
3. Vá em `Git`.
4. Procure por `Deploy Hooks`.
5. Crie um novo hook.
6. Nome sugerido:

```txt
notion-blog-publish
```

7. Escolha a branch principal do projeto.
8. Copie a URL gerada.

Agora adicione na Vercel:

```env
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
```

Faça redeploy depois de adicionar essa variável.

## Criar o webhook do Notion

Agora o Notion precisa saber qual URL chamar quando a database mudar.

O endpoint do webhook no seu site será:

```txt
https://seu-projeto.vercel.app/api/notion-webhook
```

Troque `seu-projeto.vercel.app` pela URL real do seu projeto.

No Notion:

1. Abra a página da sua integration.
2. Procure a área de webhooks.
3. Crie um novo webhook.
4. Cole a URL:

```txt
https://seu-projeto.vercel.app/api/notion-webhook
```

Durante a configuração, o Notion envia um token de verificação para essa rota.

Esse token aparece nos logs da função na Vercel.

Na Vercel:

1. Abra o projeto.
2. Vá em `Functions` ou nos logs do deployment.
3. Procure por uma linha parecida com:

```txt
Notion webhook verification token: ...
```

4. Copie o token.
5. Adicione na Vercel:

```env
NOTION_WEBHOOK_VERIFICATION_TOKEN=token_que_apareceu_no_log
```

6. Faça redeploy.

Depois disso, o webhook já deve estar pronto.

## Testar publicação automática

Agora vem o teste principal.

No Notion:

1. Crie um novo post.
2. Preencha `Titulo`.
3. Preencha `Resumo do Conteúdo`.
4. Escolha uma `Categoria`.
5. Preencha `Slug`, por exemplo:

```txt
meu-primeiro-post
```

6. Preencha `Data de Publicação` com hoje.
7. Mude `Status` para:

```txt
Publicado
```

Resultado esperado:

```txt
Notion envia webhook
Vercel recebe a chamada
Vercel faz novo deploy
O post aparece no blog
```

Na Vercel, você deve ver um novo deployment começando sozinho.

Quando ele terminar, abra:

```txt
https://seu-projeto.vercel.app
```

Seu post deve aparecer na home.

## Como atualizar um post depois

Este starter ignora mudanças no corpo do texto para evitar deploy em todo autosave do Notion.

Então, se você editar apenas um parágrafo no corpo do post, talvez a Vercel não faça deploy automaticamente.

Para publicar uma atualização, altere uma propriedade relevante depois de editar. Exemplos:

- mudar `Status`
- atualizar `Slug`
- alterar `Categoria`
- alterar `Tags`
- ajustar `Data de Publicação`

O jeito mais simples é usar o fluxo:

```txt
1. Edite o texto
2. Mude Status para Rascunho
3. Mude Status de volta para Publicado
```

Isso dispara um novo rebuild.

## Customizar a UI

O starter já vem com uma interface pronta, mas ela é só um ponto de partida.

Você pode trocar tudo:

- header
- home
- página do post
- tipografia
- cores
- cards
- bio do autor
- layout de categorias
- página sobre

Os principais arquivos são:

```txt
src/pages/index.astro
src/pages/[slug].astro
src/pages/about.astro
src/layouts/BaseLayout.astro
src/styles/global.css
```

Um bom prompt para um agente de código seria:

```txt
Quero transformar este blog Astro em uma interface com estilo [descreva seu estilo].
Mantenha a integração com Notion funcionando.
Não altere api/notion-webhook.ts nem src/lib/notion sem necessidade.
Adapte a home, a página de post e o CSS global.
```

## SEO automático opcional

O starter também tem uma rota opcional para rodar PageSpeed Insights e gravar o resultado no Notion.

Isso não é necessário para o blog funcionar.

Se quiser ativar depois, configure:

```env
SEO_AUDIT_SECRET=um_texto_secreto_forte
PAGESPEED_API_KEY=sua_chave_do_pagespeed_ou_vazio
```

Depois chame:

```bash
curl --request POST \
  --header "Authorization: Bearer SEU_SEO_AUDIT_SECRET" \
  "https://seu-projeto.vercel.app/api/seo-audit"
```

Você também pode criar um GitHub Action agendado para chamar essa rota de tempos em tempos.

## Problemas comuns

### O blog abriu, mas não aparece nenhum post

Verifique:

- O post está com `Status` igual a `Publicado`, `Published` ou `Publish`.
- A integration foi conectada à database.
- `NOTION_TOKEN` está correto.
- `NOTION_BLOG_DATABASE_ID` está correto.
- `Data de Publicação` não está no futuro.

### A Vercel falhou no build

Verifique os logs.

Os erros mais comuns são:

- variável de ambiente faltando
- database sem permissão para a integration
- propriedade do Notion com nome diferente
- imagem ou arquivo do Notion inacessível

### O webhook não dispara deploy

Verifique:

- `VERCEL_DEPLOY_HOOK_URL` está salvo na Vercel.
- `NOTION_WEBHOOK_VERIFICATION_TOKEN` está salvo na Vercel.
- Você fez redeploy depois de adicionar as variáveis.
- A URL do webhook no Notion aponta para `/api/notion-webhook`.
- Você mudou uma propriedade relevante, não apenas o corpo do texto.

### Editei o texto e nada mudou no site

Isso é esperado se você editou apenas o corpo do post.

Para publicar a nova versão, altere uma propriedade relevante no Notion, como `Status`, `Categoria`, `Tags`, `Slug` ou `Data de Publicação`.

## Recapitulando

Você criou:

- um repositório GitHub com o código do blog
- uma database Notion para escrever posts
- uma integration do Notion para o site ler os posts
- um projeto na Vercel para publicar o blog
- um deploy hook da Vercel
- um webhook do Notion para publicar automaticamente

O resultado é um blog seu, editável pelo Notion, com deploy automático e pronto para customização.
