# DLP Paneles

Plugin WordPress para operacion de pedidos en alto volumen (roles tienda y supervisor).

## Version actual
- 1.1.8

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

## Incluido en 1.1.2
- Correccion de alcance: usuarios de tienda ven solo pedidos de sus tiendas asociadas.
- Supervisores ahora se determinan por `manage_options` o meta de usuario `_dlp_paneles_supervisor = 1`.
- Polling mas robusto con timeout/reintento y aviso de red no bloqueante.

## Incluido en 1.1.3
- Filtro de tiendas basado en usuario `multistore_user` usando meta de usuario `extra_store_name` y fallback `tienda_asignada`.
- Estados visibles del panel ajustados a operacion: `processing`, `prep`, `lpr`, `rtp` (agrupados en 2 columnas).
- Se elimino timeout agresivo de fetch; polling con reintentos y manejo robusto de respuestas no JSON.

## Incluido en 1.1.4
- `prep` se muestra en columna independiente.
- Titulos de columnas muestran total en formato `(N)`.

## Incluido en 1.1.5
- Columna 1 renombrada a `Recibidos` (solo estado `processing`).
- Columna 2 renombrada a `En preparacion` (solo estado `prep`).
- Columna 3 renombrada a `Enviado / LPR` (estados `lpr`/`rtp`, con flujo de completar).

## Incluido en 1.1.6
- Cache busting de assets por `filemtime` para reflejar cambios de JS/CSS en cada despliegue.
- Micro ajuste visual: colores diferenciados por columna (`Recibidos`, `En preparacion`, `Enviado / LPR`).

## Incluido en 1.1.7
- Header nuevo con logo/titulo `DEL PUENTE`.
- Muestra nombre de tienda en header.
- Muestra fecha/hora actual y boton `Cerrar Sesion`.

## Incluido en 1.1.8
- Modo app para `/pedidos/` renderizado desde plugin (sin layout del theme).
- Carga exclusiva de assets del plugin en esa ruta (sin CSS/JS de Divi para esa vista).
- Soporta cambio de slug via filtro `dlp_paneles_app_slug`.

## Versionado acordado
- Ajustes pequenos: 1.1.1, 1.1.2, 1.1.3
- Cambios medianos: 1.2.0
- Cambios mayores: 2.0.0
