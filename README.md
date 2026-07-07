# Top Teaser Backend

Backend Node.js pour la plateforme d'envoi de mails en masse.

## Stack

- Node.js
- Express
- TypeScript
- MySQL/MariaDB, administrable via phpMyAdmin

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

L'API demarre par defaut sur `http://localhost:4000`.

Documentation Swagger :

- UI : `http://localhost:4000/docs`
- OpenAPI JSON : `http://localhost:4000/openapi.json`

## Structure

```txt
src/
  config/       Configuration applicative
  database/     Connexion MySQL et schema MVP
  modules/      Modules metier
  routes/       Routes API globales
  server.ts     Point d'entree HTTP
```

## Providers email

Le backend utilise une abstraction `MailProvider`.
Pour changer de service plus tard, on modifie `MAIL_PROVIDER` dans `.env` :

```env
MAIL_PROVIDER=postmark
```

Providers prevus :

- `postmark`
- `sendgrid`
- `mailgun`
- `brevo`
- `amazon-ses`

Les routes de diagnostic sont :

- `GET /api/mail/providers`
- `GET /api/mail/providers/active`
