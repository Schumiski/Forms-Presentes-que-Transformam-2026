# Formulário PQT - Nova Versão

Página estática de formulário com 3 etapas:

1. Introdução
2. Preenchimento do formulário
3. Mensagem final após preenchimento

## Como usar

Abra `index.html` em um navegador ou publique a pasta no GitHub Pages.

## Estrutura

- `index.html`
- `styles.css`
- `script.js`
- `admin.html` — página de gestão dos formulários preenchidos
- `admin.css`
- `admin.js`

## Página de gestão

`admin.html` lista os formulários preenchidos (dados da planilha via Apps Script) e permite:

- Busca por nome, e-mail, celular, evento, cidade e data
- Filtro por status de acompanhamento
- Alteração de status (Novo, Em contato, Aprovado, Concluído)
- Visualização dos detalhes de cada resposta
- Exportação em CSV

## Segurança

- **Login validado no servidor (Apps Script)** — nenhuma senha ou token fica no código
  publicado (GitHub Pages). A senha é armazenada apenas como hash SHA-256 nas
  Script Properties do projeto do Apps Script.
- **Sessão temporária** — cada login gera um token aleatório que expira em 30 minutos.
  Listar registros e alterar status exigem sessão válida.
- **Anti força bruta** — 5 tentativas de login erradas bloqueiam por 15 minutos.
- **Anti-bot no formulário público** — honeypot oculto (campo "website"), tempo mínimo
  de preenchimento (3 s) e limite de tamanho do payload.
- **Content-Security-Policy** e `no-referrer` em todas as páginas.
- Escapes de HTML na exibição dos dados (anti-XSS).

### Configuração

1. Implante o `apps-script.gs` como aplicativo da web (Executar como: "Eu" / Acesso: "Qualquer pessoa")
2. Em `script.js` e `admin.js`, cole a URL da implantação em `APPS_SCRIPT_URL`
3. No editor do Apps Script, execute **uma única vez** a função
   `configureAdminPassword("sua-senha-forte")` para definir a senha do painel
4. Publique a pasta ou abra `admin.html` em um navegador

> Acesso rápido ao painel no site: atalho `Ctrl + Shift + A` (script.js).
> Se o painel pedir login novamente sozinho, a sessão expirou (30 min) — basta entrar de novo.