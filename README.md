# HomeTown POS Complete Backend

Complete modular Node.js + Express + MongoDB backend generated after analyzing the uploaded React POS folder.

The frontend contains pages for access, accounts, admin, audit, catalogue, categories, customers, data import/export, hardware, inventory, invoices, login, manager, master data, notifications, offers, offline sales, online sales, orders, payments, POS billing, reports, returns, SAP, sessions, settings, stores and support. This backend provides route groups for those modules and more.

## Structure

Every business module has:

```txt
model.js
service.js
controller.js
routes.js
```

## Run

```bash
npm install
copy .env.example .env
npm run seed
npm run dev
```

## Base URL

```txt
http://localhost:5003/api/pos
```

## Login examples

```json
{ "email": "kailash.vaishanv@praxisretail.in", "password": "Password@123" }
```

```json
{ "email": "punit.singh@praxisretail.in", "password": "Password@123" }
```

```json
{ "username": "700438", "password": "manager@123" }
```

Use returned `data.token` as:

```txt
Authorization: Bearer <token>
```

See `API_LIST.md` for complete endpoints.
