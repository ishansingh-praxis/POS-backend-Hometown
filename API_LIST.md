# API List

Base URL: `http://localhost:5003/api/pos`

## Auth
- POST /auth/login
- POST /auth/login-email
- GET /auth/me
- POST /auth/logout
- POST /auth/change-password

## Modules
### admins
- GET /admins
- POST /admins
- POST /admins/bulk
- GET /admins/:id
- PUT /admins/:id
- PATCH /admins/:id/status
- DELETE /admins/:id

### managers
- GET /managers
- POST /managers
- POST /managers/bulk
- GET /managers/:id
- PUT /managers/:id
- PATCH /managers/:id/status
- DELETE /managers/:id

### cashiers
- GET /cashiers
- POST /cashiers
- POST /cashiers/bulk
- GET /cashiers/:id
- PUT /cashiers/:id
- PATCH /cashiers/:id/status
- DELETE /cashiers/:id

### users
- GET /users
- POST /users
- POST /users/bulk
- GET /users/:id
- PUT /users/:id
- PATCH /users/:id/status
- DELETE /users/:id

### /roles
- GET /roles
- POST /roles
- POST /roles/bulk
- GET /roles/:id
- PUT /roles/:id
- PATCH /roles/:id/status
- DELETE /roles/:id

### /permissions
- GET /permissions
- POST /permissions
- POST /permissions/bulk
- GET /permissions/:id
- PUT /permissions/:id
- PATCH /permissions/:id/status
- DELETE /permissions/:id

### /stores
- GET /stores
- POST /stores
- POST /stores/bulk
- GET /stores/:id
- PUT /stores/:id
- PATCH /stores/:id/status
- DELETE /stores/:id

### /categories
- GET /categories
- POST /categories
- POST /categories/bulk
- GET /categories/:id
- PUT /categories/:id
- PATCH /categories/:id/status
- DELETE /categories/:id

### /products
- GET /products
- POST /products
- POST /products/bulk
- GET /products/:id
- PUT /products/:id
- PATCH /products/:id/status
- DELETE /products/:id

### /product-variants
- GET /product-variants
- POST /product-variants
- POST /product-variants/bulk
- GET /product-variants/:id
- PUT /product-variants/:id
- PATCH /product-variants/:id/status
- DELETE /product-variants/:id

### /inventory
- GET /inventory
- POST /inventory
- POST /inventory/bulk
- GET /inventory/:id
- PUT /inventory/:id
- PATCH /inventory/:id/status
- DELETE /inventory/:id

### /inventory-movements
- GET /inventory-movements
- POST /inventory-movements
- POST /inventory-movements/bulk
- GET /inventory-movements/:id
- PUT /inventory-movements/:id
- PATCH /inventory-movements/:id/status
- DELETE /inventory-movements/:id

### /customers
- GET /customers
- POST /customers
- POST /customers/bulk
- GET /customers/:id
- PUT /customers/:id
- PATCH /customers/:id/status
- DELETE /customers/:id

### /customer-addresses
- GET /customer-addresses
- POST /customer-addresses
- POST /customer-addresses/bulk
- GET /customer-addresses/:id
- PUT /customer-addresses/:id
- PATCH /customer-addresses/:id/status
- DELETE /customer-addresses/:id

### /carts
- GET /carts
- POST /carts
- POST /carts/bulk
- GET /carts/:id
- PUT /carts/:id
- PATCH /carts/:id/status
- DELETE /carts/:id

### /cart-items
- GET /cart-items
- POST /cart-items
- POST /cart-items/bulk
- GET /cart-items/:id
- PUT /cart-items/:id
- PATCH /cart-items/:id/status
- DELETE /cart-items/:id

### /billing
- GET /billing
- POST /billing
- POST /billing/bulk
- GET /billing/:id
- PUT /billing/:id
- PATCH /billing/:id/status
- DELETE /billing/:id

### /orders
- GET /orders
- POST /orders
- POST /orders/bulk
- GET /orders/:id
- PUT /orders/:id
- PATCH /orders/:id/status
- DELETE /orders/:id

### /order-items
- GET /order-items
- POST /order-items
- POST /order-items/bulk
- GET /order-items/:id
- PUT /order-items/:id
- PATCH /order-items/:id/status
- DELETE /order-items/:id

### /payments
- GET /payments
- POST /payments
- POST /payments/bulk
- GET /payments/:id
- PUT /payments/:id
- PATCH /payments/:id/status
- DELETE /payments/:id

### /invoices
- GET /invoices
- POST /invoices
- POST /invoices/bulk
- GET /invoices/:id
- PUT /invoices/:id
- PATCH /invoices/:id/status
- DELETE /invoices/:id

### /invoice-items
- GET /invoice-items
- POST /invoice-items
- POST /invoice-items/bulk
- GET /invoice-items/:id
- PUT /invoice-items/:id
- PATCH /invoice-items/:id/status
- DELETE /invoice-items/:id

### /returns
- GET /returns
- POST /returns
- POST /returns/bulk
- GET /returns/:id
- PUT /returns/:id
- PATCH /returns/:id/status
- DELETE /returns/:id

### /refunds
- GET /refunds
- POST /refunds
- POST /refunds/bulk
- GET /refunds/:id
- PUT /refunds/:id
- PATCH /refunds/:id/status
- DELETE /refunds/:id

### /exchanges
- GET /exchanges
- POST /exchanges
- POST /exchanges/bulk
- GET /exchanges/:id
- PUT /exchanges/:id
- PATCH /exchanges/:id/status
- DELETE /exchanges/:id

### /discounts
- GET /discounts
- POST /discounts
- POST /discounts/bulk
- GET /discounts/:id
- PUT /discounts/:id
- PATCH /discounts/:id/status
- DELETE /discounts/:id

### /coupons
- GET /coupons
- POST /coupons
- POST /coupons/bulk
- GET /coupons/:id
- PUT /coupons/:id
- PATCH /coupons/:id/status
- DELETE /coupons/:id

### /offers
- GET /offers
- POST /offers
- POST /offers/bulk
- GET /offers/:id
- PUT /offers/:id
- PATCH /offers/:id/status
- DELETE /offers/:id

### /online-sales
- GET /online-sales
- POST /online-sales
- POST /online-sales/bulk
- GET /online-sales/:id
- PUT /online-sales/:id
- PATCH /online-sales/:id/status
- DELETE /online-sales/:id

### /offline-sales
- GET /offline-sales
- POST /offline-sales
- POST /offline-sales/bulk
- GET /offline-sales/:id
- PUT /offline-sales/:id
- PATCH /offline-sales/:id/status
- DELETE /offline-sales/:id

### /sap
- GET /sap
- POST /sap
- POST /sap/bulk
- GET /sap/:id
- PUT /sap/:id
- PATCH /sap/:id/status
- DELETE /sap/:id

### /sap-mappings
- GET /sap-mappings
- POST /sap-mappings
- POST /sap-mappings/bulk
- GET /sap-mappings/:id
- PUT /sap-mappings/:id
- PATCH /sap-mappings/:id/status
- DELETE /sap-mappings/:id

### /accounting
- GET /accounting
- POST /accounting
- POST /accounting/bulk
- GET /accounting/:id
- PUT /accounting/:id
- PATCH /accounting/:id/status
- DELETE /accounting/:id

### /reports
- GET /reports
- POST /reports
- POST /reports/bulk
- GET /reports/:id
- PUT /reports/:id
- PATCH /reports/:id/status
- DELETE /reports/:id

### /dashboard
- GET /dashboard
- POST /dashboard
- POST /dashboard/bulk
- GET /dashboard/:id
- PUT /dashboard/:id
- PATCH /dashboard/:id/status
- DELETE /dashboard/:id

### /audit-logs
- GET /audit-logs
- POST /audit-logs
- POST /audit-logs/bulk
- GET /audit-logs/:id
- PUT /audit-logs/:id
- PATCH /audit-logs/:id/status
- DELETE /audit-logs/:id

### /settings
- GET /settings
- POST /settings
- POST /settings/bulk
- GET /settings/:id
- PUT /settings/:id
- PATCH /settings/:id/status
- DELETE /settings/:id

### /notifications
- GET /notifications
- POST /notifications
- POST /notifications/bulk
- GET /notifications/:id
- PUT /notifications/:id
- PATCH /notifications/:id/status
- DELETE /notifications/:id

### /master-data
- GET /master-data
- POST /master-data
- POST /master-data/bulk
- GET /master-data/:id
- PUT /master-data/:id
- PATCH /master-data/:id/status
- DELETE /master-data/:id

### /import-export
- GET /import-export
- POST /import-export
- POST /import-export/bulk
- GET /import-export/:id
- PUT /import-export/:id
- PATCH /import-export/:id/status
- DELETE /import-export/:id

### /hardware
- GET /hardware
- POST /hardware
- POST /hardware/bulk
- GET /hardware/:id
- PUT /hardware/:id
- PATCH /hardware/:id/status
- DELETE /hardware/:id

### /sessions
- GET /sessions
- POST /sessions
- POST /sessions/bulk
- GET /sessions/:id
- PUT /sessions/:id
- PATCH /sessions/:id/status
- DELETE /sessions/:id

### /security
- GET /security
- POST /security
- POST /security/bulk
- GET /security/:id
- PUT /security/:id
- PATCH /security/:id/status
- DELETE /security/:id

### /support
- GET /support
- POST /support
- POST /support/bulk
- GET /support/:id
- PUT /support/:id
- PATCH /support/:id/status
- DELETE /support/:id

### /backup
- GET /backup
- POST /backup
- POST /backup/bulk
- GET /backup/:id
- PUT /backup/:id
- PATCH /backup/:id/status
- DELETE /backup/:id

### /access
- GET /access
- POST /access
- POST /access/bulk
- GET /access/:id
- PUT /access/:id
- PATCH /access/:id/status
- DELETE /access/:id
