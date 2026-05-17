# Como criar seu próprio blog com Notion, Astro e Vercel

Este guia mostra como duplicar um projeto de blog pronto, conectar com uma database do Notion e publicar na Vercel com atualização automática. A ideia é que você escreva no Notion, mude o status do post para publicado, e o site faça o rebuild sozinho até o texto aparecer no blog.

No final, você terá um blog seu, com seu próprio conteúdo, seu próprio repositório no GitHub e uma estrutura pronta para customizar a UI com Codex, Claude Code ou qualquer agente de código. O objetivo aqui não é prender você a este visual, mas entregar um esqueleto funcional que você consiga adaptar para o seu estilo.

Se você veio pelo vídeo, use os títulos do post para pular direto para a etapa em que está: template do GitHub, template do Notion, integration, Vercel, deploy hook, webhook ou teste final. Se você chegou direto por aqui, dá para seguir em ordem do começo ao fim.

## O que você vai fazer

Você vai duplicar dois templates: um template de código no GitHub e um template de database no Notion. Depois vai conectar os dois na Vercel usando variáveis de ambiente.

O caminho principal não exige clonar o projeto, instalar dependências ou rodar terminal. Isso só será necessário se você quiser editar o código localmente, trocar a UI, criar componentes novos ou pedir para um agente de código modificar o projeto a partir do seu computador.

Para publicar o blog do jeito mais simples, o fluxo é: duplicar o template no GitHub, duplicar o template no Notion, criar uma integration no Notion, importar o repo na Vercel, preencher as environment variables e configurar o webhook para o deploy automático.

## Contas necessárias

Você precisa ter uma conta no GitHub, uma conta na Vercel e uma conta no Notion. Se você ainda não tem uma delas, crie antes de começar.

GitHub:
https://github.com

Vercel:
https://vercel.com

Notion:
https://notion.so

## Duplicar o template do GitHub

Abra o repositório do starter:

https://github.com/alexandre-axioma/blog-notion-template

Clique em `Use this template` e crie um novo repositório na sua conta. Se quiser ir direto para a tela de criação, use este link:

https://github.com/alexandre-axioma/blog-notion-template/generate

Você pode dar o nome que quiser. Um nome simples seria `meu-blog`.

Depois que o repositório for criado, você não precisa clonar nada ainda. A Vercel consegue importar esse repositório diretamente do GitHub.

## Duplicar o template do Notion

Abra o template do Notion:

https://fixed-sushi-1bf.notion.site/Blog-Notion-Template-f1d13d4a408c8285a99c01101e736767?pvs=74

Clique em `Duplicate` e escolha a workspace onde seu blog vai viver. O Notion vai copiar a página, a database, as views e alguns posts de exemplo.

Depois de duplicar, abra a database e confira se os posts exemplo apareceram. Você pode apagar, editar ou manter esses posts enquanto testa.

## Entender a database

Você não precisa criar essas propriedades manualmente, porque elas já vêm no template. Esta lista serve para você entender para que cada campo existe.

| Propriedade | Para que serve |
| --- | --- |
| `Titulo` | O título do post. Também é usado para gerar o slug se o campo `Slug` estiver vazio. |
| `Status` | Controla se o post aparece no blog. Use `Publicado` para publicar. |
| `Data de Publicação` | Define a data do post e permite agendar posts. |
| `Resumo do Conteúdo` | Aparece na home, no SEO e em previews. |
| `Categoria` | Agrupa posts por tema. |
| `Tags` | Adiciona palavras-chave ou temas secundários. |
| `Slug` | Define a URL do post. Exemplo: `meu-primeiro-post`. |
| `Link` | Campo opcional para guardar uma referência externa. |
| `Quantidade de Palavras` | Ajuda o blog a calcular tempo aproximado de leitura. |
| `Hero` | Imagem principal do post. |
| `Thumb` | Imagem usada em cards/listagens. |
| `SEO Score` | Campo opcional usado pelo extra de auditoria SEO. |

Para um post aparecer no blog, use `Status` como `Publicado`, `Published` ou `Publish`.

Para agendar um post, use `Status` como `Programado` ou `Scheduled` e coloque uma data futura em `Data de Publicação`. O post só aparece depois que essa data passar.

## Criar a integration do Notion

Agora você precisa criar uma integration para o site conseguir ler a database do Notion.

Acesse a área de developers do Notion:

https://www.notion.so/profile/integrations

Clique em `New integration` ou `New connection`, dê um nome como `Meu Blog`, escolha a workspace onde você duplicou o template e crie a connection.

Na aba `Configuration`, copie o `Access token`. Esse valor será usado depois na Vercel como `NOTION_TOKEN`.

Ainda na aba `Configuration`, deixe as capabilities no mínimo necessário para o blog:

- `Read content`: ligado
- `Update content`: desligado, a não ser que você queira usar o extra de SEO depois
- `Insert content`: desligado
- `No user information`: selecionado

Se você quiser usar o extra de SEO automático no futuro, volte aqui e ligue `Update content`, porque esse extra precisa escrever o `SEO Score` de volta no Notion.

## Liberar acesso à database

Criar a integration não basta. Você também precisa dizer quais páginas ou databases essa integration pode acessar.

Na página da sua connection, abra a aba `Content access`.

Clique em `Edit access`.

Selecione a página ou database duplicada do template, por exemplo `Blog Notion Template` ou `Blog Content Management`.

Salve.

Se essa etapa ficar vazia, o site não consegue ler seus posts, mesmo que o token esteja correto.

## Copiar o ID da database

Abra a database duplicada no Notion. Você precisa pegar o ID dela para colocar na Vercel.

O jeito mais simples é abrir a database como página inteira e copiar a URL do navegador. A URL vai ter uma sequência grande de letras e números. Essa sequência é o ID da database.

Você usará esse valor como `NOTION_BLOG_DATABASE_ID`.

Pode colar o ID com ou sem hífens. O código normaliza isso.

## Publicar na Vercel

Agora vamos colocar o blog no ar.

Acesse a Vercel:

https://vercel.com

Clique em `Add New` e depois em `Project`.

Importe o repositório que você criou a partir do template do GitHub.

A Vercel deve detectar o framework `Astro`. Antes do primeiro deploy, adicione estas environment variables:

| Nome | Valor |
| --- | --- |
| `NOTION_TOKEN` | O access token da sua Notion integration |
| `NOTION_BLOG_DATABASE_ID` | O ID da sua database duplicada |

Você não precisa configurar `PUBLIC_SITE_URL` para o primeiro deploy. A Vercel gera uma URL automaticamente, e o projeto tenta usar essa URL nas partes que precisam de endereço absoluto.

Se você colocar um domínio próprio depois, ou se quiser forçar uma URL canônica específica, adicione também:

| Nome | Valor |
| --- | --- |
| `PUBLIC_SITE_URL` | A URL final do seu blog, como `https://blog.seudominio.com` |

Faça o deploy.

Quando terminar, abra a URL pública do projeto e confirme se os posts `Publicado` aparecem no blog.

## Criar o deploy hook da Vercel

Agora vamos criar a URL que o Notion vai chamar para mandar a Vercel rebuildar o site.

No projeto da Vercel, vá em `Settings`, depois `Git`, e procure por `Deploy Hooks`.

Crie um deploy hook com um nome como `notion-blog-publish`.

Escolha a branch principal do projeto, normalmente `main`.

Copie a URL gerada.

Agora volte em `Settings`, depois `Environment Variables`, e adicione:

| Nome | Valor |
| --- | --- |
| `VERCEL_DEPLOY_HOOK_URL` | A URL do deploy hook que você acabou de copiar |

Faça um novo deploy para essa variável entrar no ambiente do site.

## Criar o webhook do Notion

Agora o Notion precisa saber qual URL chamar quando a database mudar.

O endpoint do webhook no seu site será a URL do seu blog com `/api/notion-webhook` no final.

Exemplo:

https://meu-blog.vercel.app/api/notion-webhook

Na página da sua connection do Notion, abra a aba `Webhooks`.

Clique para criar uma nova subscription.

Cole a URL do webhook do seu site.

Durante a configuração, o Notion envia um token de verificação para essa rota. O código do template já responde corretamente e também registra esse token nos logs da função na Vercel.

Na Vercel, abra os logs da função ou do deployment e procure uma linha parecida com `Notion webhook verification token`. Copie o token.

Depois adicione mais uma environment variable na Vercel:

| Nome | Valor |
| --- | --- |
| `NOTION_WEBHOOK_VERIFICATION_TOKEN` | O token de verificação que apareceu nos logs |

Faça redeploy.

Depois disso, o webhook já deve estar pronto para validar as chamadas do Notion.

## Testar publicação automática

Agora vem o teste principal.

No Notion, crie um novo post na database do blog. Preencha `Titulo`, `Resumo do Conteúdo`, `Categoria`, `Slug` e `Data de Publicação`.

No campo `Status`, escolha `Publicado`.

Na Vercel, você deve ver um novo deployment começando sozinho. Quando o deploy terminar, abra a home do blog e confirme que o novo post apareceu.

Se o post apareceu, o fluxo principal está funcionando: Notion, webhook, Vercel e blog publicado.

## Como atualizar um post depois

Este starter ignora mudanças no corpo do texto para evitar deploy em todo autosave do Notion.

Então, se você editar apenas um parágrafo no corpo do post, talvez a Vercel não faça deploy automaticamente.

Para publicar uma atualização, altere uma propriedade relevante depois de editar. Exemplos:

- mudar `Status`
- atualizar `Slug`
- alterar `Categoria`
- alterar `Tags`
- ajustar `Data de Publicação`

O jeito mais simples é editar o texto, mudar `Status` para outro valor e depois mudar de volta para `Publicado`.

## Customizar a UI

Até aqui você já tem um blog publicado e funcionando automaticamente. Só agora faz sentido mexer no código, se você quiser mudar a UI, criar novas páginas ou adaptar a experiência visual.

Você pode fazer isso de duas formas: editando localmente no seu computador ou pedindo para um agente de código, como Codex ou Claude Code, clonar o repositório e fazer as mudanças.

Os principais arquivos de UI são:

```txt
src/pages/index.astro
src/pages/[slug].astro
src/pages/about.astro
src/layouts/BaseLayout.astro
src/styles/global.css
```

Se for trabalhar localmente, aí sim você pode clonar o repo:

```bash
git clone URL_DO_SEU_REPOSITORIO_CRIADO_A_PARTIR_DO_TEMPLATE
cd meu-blog
npm install
cp .env.example .env.local
npm run dev
```

No `.env.local`, use as mesmas variáveis que você colocou na Vercel.

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

Se quiser ativar depois, volte na integration do Notion e ligue `Update content`. Depois configure na Vercel:

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
- A integration tem acesso à página/database em `Content access`.
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

Você criou um repositório GitHub com o código do blog, uma database Notion para escrever posts, uma integration do Notion para o site ler a database, um projeto na Vercel para publicar o blog, um deploy hook da Vercel e um webhook do Notion para publicar automaticamente.

O resultado é um blog seu, editável pelo Notion, com deploy automático e pronto para customização.
