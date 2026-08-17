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

### Configuração

1. Implante o `apps-script.gs` como aplicativo da web (Executar como: "Eu" / Acesso: "Qualquer pessoa")
2. Em `admin.js`, cole a URL da implantação em `APPS_SCRIPT_URL`
3. Altere `ADMIN_PASSWORD` (senha de acesso) em `admin.js`
4. Defina o mesmo valor secreto em `ADMIN_TOKEN` (admin.js) e `ADMIN_TOKEN` (apps-script.gs)
5. Publique a pasta ou abra `admin.html` em um navegador
