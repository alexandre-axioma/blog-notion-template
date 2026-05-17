# Checklist da aula

Use este checklist para gravar o passo a passo do zero até o blog automático.

## Antes de gravar

- Criar ou separar uma conta GitHub de teste.
- Criar ou separar uma conta Vercel de teste.
- Criar uma workspace Notion de teste.
- Publicar o template de database do Notion e deixar o link pronto.
- Criar um repositório novo a partir deste starter.

## Demo de abertura

- Mostrar o blog final publicado.
- Mostrar a database do Notion.
- Criar ou publicar um post mudando `Status` para `Publicado`.
- Mostrar a Vercel recebendo o deploy.
- Mostrar o post no blog.

## Instalação

- Criar repo a partir do GitHub template.
- Duplicar o template do Notion.
- Criar uma Notion integration.
- Copiar `NOTION_TOKEN`.
- Abrir `Content access`.
- Usar `Edit access` para liberar `Blog Notion Template` e, se aparecer, `Blog Content Management`.
- Copiar `NOTION_BLOG_DATABASE_ID` da database `Blog Content Management`, não da página `Blog Notion Template`.
- Opcional: ligar `Update content` na integration para SEO audit.
- Opcional: gerar/anotar `SEO_AUDIT_SECRET` em `https://bitwarden.com/password-generator/`.
- Opcional: criar/anotar `PAGESPEED_API_KEY` em `https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com`.
- Na chave do PageSpeed: `Create credentials` -> `API key`, restrição de API `PageSpeed Insights API`, `Application restrictions` como `None`.
- Importar repo na Vercel.
- Configurar env vars já disponíveis.
- Fazer o primeiro deploy.
- Copiar a URL em `Production Deployment` -> `Domains`.
- Se for usar domínio próprio, configurar domínio antes do webhook.
- Criar Vercel deploy hook.
- Salvar `VERCEL_DEPLOY_HOOK_URL`.
- Criar Notion webhook usando `URL_DO_BLOG/api/notion-webhook`.
- No webhook, marcar apenas `page.created`, `page.properties_updated` e `page.deleted`.
- Desmarcar `page.content_updated`, `Database`, `Data source`, `View`, `Comment` e outros grupos.
- Copiar `verification_token` dos logs da Vercel.
- Salvar `NOTION_WEBHOOK_VERIFICATION_TOKEN`.
- Fazer redeploy.
- Voltar no Notion, clicar `Verify`, colar o token e confirmar.
- Publicar um post de teste pelo Notion.
- Opcional: para SEO automático, criar no GitHub Actions os repository secrets `SEO_AUDIT_SECRET` e `SEO_AUDIT_URL`.
- Opcional: rodar o workflow `SEO audit` manualmente uma vez.
- Opcional: explicar que o workflow roda a cada 15 minutos e recalcula `SEO Score` dos posts publicados para evitar score antigo.

## Extra

- Rodar SEO audit apenas depois do fluxo principal funcionar.
