# DLP Paneles

Plugin WordPress para operacion de pedidos en alto volumen (roles tienda y supervisor).

## Version actual
- 1.4.0

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

## Incluido en 1.1.9
- Slug del modo app cambiado de `/pedidos/` a `/orders/` (el sitio ya usa `/pedidos/` para el panel v2 anterior). Sigue siendo configurable via filtro `dlp_paneles_app_slug`.

## Incluido en 1.1.10
- Estados `processing`/`prep` fusionados en un solo grupo `Procesando` (ya no hay paso intermedio de preparacion).
- Boton de accion unico por columna: "Marcar Enviada / LPR" y "Completar pedido".
- Corregido calculo de `Tiempo` en las tarjetas: desalineaba zonas horarias (`current_time('timestamp')` vs `WC_DateTime::getTimestamp()`) y mostraba valores desbordados tipo `1891:06:28`. Ahora usa el mismo calculo que el panel v2 (`manejoPedidos.php`).

## Incluido en 1.1.11
- Corregido: el tablero se mantiene en 3 columnas (no se reduce a 2). Flujo final:
  1. `Procesando` (`processing`/`prep`)
  2. `Enviada / LPR`
  3. `Completada` (`completed`) - antes desaparecia del panel al completarse, ahora se muestra.
- La columna `Completada` solo incluye pedidos completados en el dia operativo actual (para no acumular historico ni desplazar pedidos activos del listado).
- El detalle de un pedido completado ya no muestra botones de accion (no hay mas transiciones posibles).

## Incluido en 1.1.12
- Corregido bug critico: la columna `Enviada / LPR` no mostraba pedidos porque el plugin usaba el estado inventado `lpr`, que nunca existe en WooCommerce. El estado real registrado en el sitio es `dlv` (visto en `dlp-26-functions.php` y `hora_envio_ajax.php`). Se reemplazo `lpr` por `dlv` en todo el plugin (consultas, transiciones, frontend). La etiqueta visible sigue siendo "Enviada / LPR", solo cambio el estado interno que se consulta.

## Incluido en 1.2.0 (diseno nuevo, base)
- Rediseno completo del tablero y detalle de pedido siguiendo el boceto en `stitch_panel_dlp` (Stitch): tablero claro con columnas por color + panel de detalle oscuro.
- API REST ampliada con datos nuevos: `items[]` (productos con modificadores via `WC_Order_Item::get_formatted_meta_data()`), `total`, `payment_method_title`, `full_address`, `entry_time`.
- Detalle de pedido: tarjeta de tiempo con barra de progreso vs. meta operativa, tarjeta "Flujo operativo" con boton unico de siguiente paso, seccion de "Detalle de Productos" con modificadores y total a cobrar, datos de entrega con telefono como link `tel:`.
- "Marcar/Quitar Prioridad" pasa de checkbox+boton a un boton toggle que aplica el cambio de inmediato.
- Reasignar tienda pasa a aplicarse automaticamente al cambiar el `<select>` (sin boton "Reasignar" aparte).
- Boton "Descargar Pedidos" en el header (ver correccion en 1.2.1 mas abajo).
- "Cancelar pedido" se reubico como link secundario al final del detalle (sigue usando `prompt()` nativo, ver pendientes).
- Ver `MEMORIA_TRABAJO.md` seccion "Pendientes diseno nuevo (1.2.0)" para la lista completa de decisiones/acciones que aun faltan definir o activar.

## Incluido en 1.2.1
- Corregido boton "Descargar Pedidos": ya no exporta CSV. Ahora es un refresh forzado del panel (icono de sincronizar, gira mientras carga) para "forzar" manualmente una actualizacion de los pedidos sin esperar el polling automatico de 30s.

## Incluido en 1.2.2
- Umbrales de tiempo acordados: 45 min = primera alerta ("Por vencer"), 60 min = "Atrasado" (antes 30/60 provisionales). Aplican tanto al color del badge de tiempo en tarjetas como a la tarjeta de tiempo/SLA del detalle.
- Reloj en vivo: el tiempo transcurrido (tarjetas y detalle) ahora corre en tiempo real, segundo a segundo, sin esperar el refresco automatico de 30s. Los `:` de los formatos `mm:ss`/`hh:mm` parpadeaban (ver correccion en 1.2.3).
- Tarjetas de pedido mas compactas (menos espacio interno entre elementos).
- Nueva variante "mini" para las tarjetas de la columna `Completada`: id + tiempo en una fila, nombre + telefono en una sola fila (sin badge de tienda ni prioridad), siguiendo el boceto original.

## Incluido en 1.2.3
- Panel de detalle del pedido mas ancho (420px -> 500px). La columna `Completada` (tarjetas mini) se deja igual.
- Quitado el parpadeo de los `:` en los tiempos: con el reloj corriendo en vivo el parpadeo era redundante y distraia.
- Texto "Total a Cobrar" cambiado a "Total" en el detalle de productos.

## Incluido en 1.3.0 (tipo de pedido: Delivery / Pickup)
- Nuevo dato `order_type` en la API (`processing`/etc. no cambian, es independiente del estado): leido de la meta `woofood_order_type` de WooFood (`delivery` por defecto, `pickup` si aplica).
- Filtro "Todos / Delivery / Pickup" en el header, con contador por tipo. Es 100% client-side (no recarga el panel), y recalcula los contadores de cada columna segun el filtro activo.
- Badge de tipo (Delivery en azul, Pickup en amber) en las tarjetas (normales y mini) y en el detalle del pedido (header y titulo).
- Etiqueta de la direccion en el detalle cambia segun el tipo: "Entrega a domicilio (Delivery)" o "Retiro en tienda (Pickup)".
- Metodo de pago mucho mas visible: nuevo banner destacado en el detalle (icono + texto grande) en vez de una linea de texto pequena. Distingue con color pago ya realizado (verde) de pago pendiente en efectivo/contra entrega (amber) con una heuristica por texto del metodo de pago (pendiente confirmar si hay una forma mas confiable de saberlo).

## Incluido en 1.4.0 (vista expandida "Pedido")
- Nuevo boton "Abrir pedido" (icono expandir) en el header del detalle del pedido.
- Nueva vista "Pedido" a pantalla completa: reemplaza el tablero + detalle por una tarjeta unica de 3 columnas (Reloj KDS + Resumen de Cocina | Detalle de Productos + Totales | Datos de Entrega/Cliente + Gestion), con boton "Volver al tablero" y boton de cerrar (X).
- "Resumen de Cocina": agrupa automaticamente los modificadores de todos los productos del pedido (carne, complemento, bebida, upgrades) sumando cantidades. Heuristica provisional (detecta "(xN)" en el valor o usa la cantidad del producto) - pendiente validar con datos reales.
- "Progreso de preparacion": indicador visual de 3 pasos (Cocina / Enviar-LPR / Entregado) segun el estado del pedido.
- Desglose de totales: Subtotal, Tarifa de envio (nuevo dato `shipping_total` de la API) y Total.
- Todas las acciones (avanzar estado, prioridad, nota interna, reasignar tienda, cancelar) funcionan igual dentro de la vista expandida.

## Versionado acordado
- Ajustes pequenos: 1.1.1, 1.1.2, 1.1.3
- Cambios medianos: 1.2.0, 1.3.0, 1.4.0
- Cambios mayores: 2.0.0
