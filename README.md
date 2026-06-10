# DLP Paneles

Plugin WordPress para operacion de pedidos en alto volumen (roles tienda y supervisor).

## Version actual
- 1.1.1

## Shortcode
- [dlp_paneles]

## API REST base
- GET /wp-json/dlp-paneles/v1/panel
- POST /wp-json/dlp-paneles/v1/pedido/{id}/estado
- POST /wp-json/dlp-paneles/v1/pedido/{id}/cancelar
- POST /wp-json/dlp-paneles/v1/pedido/{id}/meta
- POST /wp-json/dlp-paneles/v1/pedido/{id}/tienda

## Incluido en 1.1.1
- Reasignacion de tienda desde el detalle del pedido.
- Prioridad editable por pedido.
- Nota interna editable por pedido.

## Versionado acordado
- Ajustes pequenos: 1.1.1, 1.1.2, 1.1.3
- Cambios medianos: 1.2.0
- Cambios mayores: 2.0.0
