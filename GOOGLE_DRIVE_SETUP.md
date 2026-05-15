# ☁️ Configuração do Google Drive — FinanceFlow

Este guia explica como ativar o backup e sincronização automática com o Google Drive.

---

## Como funciona

- Todos os seus dados financeiros são salvos em um arquivo JSON **no seu próprio Google Drive** (pasta oculta `appDataFolder` — visível apenas para o FinanceFlow).
- O app nunca acessa outros arquivos da sua conta.
- A sincronização é **automática**: 2 segundos após qualquer alteração, os dados são enviados para a nuvem.
- Você pode **restaurar** os dados em qualquer dispositivo fazendo login com a mesma conta Google.

---

## Passo a passo

### 1. Criar um projeto no Google Cloud Console

1. Acesse [https://console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **"Select a project"** → **"New Project"**
3. Dê um nome (ex: `FinanceFlow`) → **"Create"**

### 2. Ativar a Google Drive API

1. No menu lateral: **APIs & Services → Library**
2. Busque **"Google Drive API"** → clique nela → **"Enable"**

### 3. Configurar a tela de consentimento OAuth

1. **APIs & Services → OAuth consent screen**
2. Selecione **"External"** → **"Create"**
3. Preencha:
   - **App name**: `FinanceFlow`
   - **User support email**: seu e-mail
   - **Developer contact**: seu e-mail
4. Clique em **"Save and Continue"** em todas as etapas
5. Em **"Test users"**, adicione seu e-mail Google → **"Add"**

### 4. Criar as credenciais OAuth

1. **APIs & Services → Credentials → "+ Create Credentials" → "OAuth 2.0 Client ID"**
2. **Application type**: `Web application`
3. **Name**: `FinanceFlow Web`
4. Em **"Authorized redirect URIs"**, adicione:
   ```
   http://localhost:8081/oauth/google-callback
   exp://localhost:8081/--/oauth/google-callback
   ```
   > O URI exato para builds nativos aparece na tela **Configurações → Google Drive** dentro do app.
5. Clique em **"Create"**
6. Copie o **Client ID** (formato: `xxxxx.apps.googleusercontent.com`)

### 5. Configurar o .env

```bash
# No terminal, na raiz do projeto:
cp .env.example .env
```

Abra o `.env` e adicione seu Client ID:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

### 6. Reiniciar o Metro Bundler

```bash
npx expo start --clear
```

---

## Usando no app

1. Abra o app → **Configurações** (ícone de engrenagem no dashboard)
2. Role até a seção **"Google Drive"** → toque em **"Gerenciar backup"**
3. Toque em **"Entrar com Google"**
4. Autorize o acesso → pronto! ✅

O ícone ☁️ na tela de configurações ficará **azul** quando conectado e indicará a data do último sync.

---

## Resolução de conflitos

Quando você conecta em um novo dispositivo que já tem dados locais E há um backup na nuvem, o app pergunta:

- **☁️ Restaurar do Google Drive** — substitui os dados locais pelo backup
- **📱 Manter dados locais** — faz upload dos dados atuais para a nuvem (sobrescreve o backup)

---

## Segurança

| O FinanceFlow acessa | O FinanceFlow NÃO acessa |
|---|---|
| Pasta oculta `appDataFolder` | Seus arquivos do Drive |
| Apenas o arquivo `financeflow-data.json` | Fotos, documentos, e-mails |

Os tokens de acesso são armazenados no **Keychain (iOS)** / **Keystore (Android)** via `expo-secure-store` — nunca em texto puro.

---

## Troubleshooting

| Problema | Solução |
|---|---|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID não configurado` | Verifique se o `.env` foi criado e o Metro foi reiniciado com `--clear` |
| `redirect_uri_mismatch` | Adicione o URI exato mostrado no app em "Authorized redirect URIs" no Console |
| `access_denied` | Seu e-mail não está na lista de test users. Adicione em OAuth consent screen → Test users |
| Token expirado | O app renova automaticamente. Se falhar, toque em "Verificar" na tela de sync |
