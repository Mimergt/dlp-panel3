# Memoria De Trabajo - DLP Paneles

Este archivo documenta el historial tecnico y resumen de conversaciones para retomar trabajo sin perder contexto.

## 2026-06-09

### Resumen de conversacion
- Se definio renovar por completo el panel de pedidos.
- Se evaluo arquitectura y se eligio enfoque hibrido: backend WordPress/WooCommerce + frontend SPA.
- Se aclaro que SPA puede vivir en el mismo servidor de WordPress, sin necesidad obligatoria de VPS.
- Se confirmo prioridad por plugin liviano, evitando dependencias pesadas.
- Se solicito crear plugin nuevo independiente con nombre DLP Paneles y version inicial 1.0.0.
- Se solicito usar repo nuevo: https://github.com/Mimergt/dlp-panel3.git.
- Se pidio revertir cambios hechos en el plugin anterior para dejarlo intacto.

### Acciones ejecutadas
- Se revirtieron cambios del plugin anterior manejoPedidos2 y se eliminaron archivos SPA agregados alli.
- Se clono el repo nuevo dlp-panel3 desde GitHub (repo vacio).
- Se creo estructura base funcional del nuevo plugin DLP Paneles:
  - dlp-paneles.php
  - includes/rest.php
  - includes/shortcode.php
  - assets/panel.js
  - assets/panel.css
- Se creo plan actualizado de implementacion en PLAN_IMPLEMENTACION.md.

### Estado actual
- Plugin nuevo operativo en version 1.0.0 con shortcode [dlp_paneles].
- API REST base implementada con endpoints para:
  - listar pedidos del panel
  - cambiar estado
  - cancelar con motivo
- Frontend SPA liviano implementado con polling cada 30s.

### Pendientes inmediatos
- Probar en entorno WordPress real con usuarios supervisor y tienda.
- Agregar reasignacion de tienda, prioridad y notas internas.
- Sustituir prompt de cancelacion por modal UI.
- Preparar primer commit y push del repo nuevo.

## 2026-06-09 (iteracion 1.1.1)

### Resumen de conversacion
- Se solicito continuar la implementacion del plugin nuevo en la carpeta dlp-paneles.
- Se avanzaron los pendientes de fase 1.1 para operacion: reasignacion de tienda, prioridad y nota interna por pedido.

### Cambios realizados
- Version del plugin actualizada de 1.0.0 a 1.1.1.
- API REST extendida con endpoints:
  - POST /pedido/{id}/meta
  - POST /pedido/{id}/tienda
- Payload del panel enriquecido con:
  - tiendas accesibles por usuario
  - nota interna por pedido
- UI del detalle del pedido actualizada para:
  - cambiar tienda
  - guardar prioridad
  - guardar nota interna

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css
- README.md
- PLAN_IMPLEMENTACION.md

### Estado
- Fase 1.1 completada en version 1.1.1.
- Pendiente siguiente: mejorar UX de cancelacion (modal) y hardening adicional.

## 2026-06-09 (iteracion 1.1.2)

### Resumen de conversacion
- En pruebas reales se detectaron dos incidencias:
  - error intermitente `Failed to fetch` al refrescar panel
  - pedidos no filtrados correctamente por tienda

### Cambios realizados
- Version actualizada a 1.1.2.
- Se ajusto la logica de supervisor para evitar que `shop_manager` se trate automaticamente como supervisor.
- Se agrego criterio explicito de supervisor por meta de usuario `_dlp_paneles_supervisor = 1` o capability `manage_options`.
- Se reforzo filtro por tienda con `meta_query` tipo numerico.
- Se robustecio polling en frontend con timeout + reintento y aviso de red no bloqueante.

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css
- README.md

### Estado
- Correcciones listas para validacion en entorno WordPress.

## 2026-06-09 (iteracion 1.1.3)

### Resumen de conversacion
- Persistia visualizacion de pedidos de otras tiendas para usuarios como `multistore_user`.
- Persistia error intermitente `Failed to fetch`.
- Se solicito priorizar logica de obtencion/filtrado antes de mejoras esteticas.

### Cambios realizados
- Version actualizada a 1.1.3.
- Filtro por tienda reescrito para usar primero metas de usuario:
  - `extra_store_name`
  - `tienda_asignada` (fallback)
- Se forzo que usuarios con rol `multistore_user` no sean tratados como supervisor.
- Estados visibles del panel reducidos al flujo operativo y agrupados en 2 columnas:
  - `processing`/`prep`
  - `lpr`/`rtp`
- Polling de frontend reforzado quitando `AbortController` con timeout agresivo.
- Fetch ahora maneja respuestas no JSON y reintenta sin bloquear la operacion.

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- README.md

### Estado
- Version 1.1.3 lista para validacion en usuarios `multistore_user` de tienda.

## 2026-06-09 (iteracion 1.1.4)

### Resumen de conversacion
- El filtrado y fetch mejoraron, pero faltaba separar visualmente pedidos en `prep`.
- Se solicito mostrar totales en titulos de columnas con formato `(N)`.

### Cambios realizados
- Version actualizada a 1.1.4.
- Se separo columna `Preparacion` de `Procesando`.
- Se ajustaron titulos de columnas para mostrar totales en parentesis.

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- README.md

### Estado
- Pendiente de validacion funcional en panel con pedidos `processing`, `prep` y `lpr/rtp`.

## 2026-06-09 (iteracion 1.1.5)

### Resumen de conversacion
- Se solicito definir columnas una por una con nombres de operacion exactos.

### Cambios realizados
- Version actualizada a 1.1.5.
- Nombres de columnas ajustados:
  - `Recibidos` -> estado `processing`
  - `En preparacion` -> estado `prep`
  - `Enviado / LPR` -> estados `lpr`/`rtp`
- Etiqueta de estado `prep` mostrada como `Preparando` en tarjetas/detalle.

### Archivos tocados
- dlp-paneles.php
- assets/js/panel.js
- README.md

### Estado
- Listo para validar en tienda con pedidos en los 3 bloques de estado.

## 2026-06-09 (iteracion 1.1.6)

### Resumen de conversacion
- Se reporto que no se veia aplicado el cambio en algunos entornos.
- Se solicito micro ajuste de colores y revisar aplicacion real de cambios.

### Cambios realizados
- Version actualizada a 1.1.6.
- Se agrego versionado de assets por `filemtime` en shortcode para evitar cache stale.
- Se aplicaron colores diferenciados por columna para mejorar lectura operativa.

### Archivos tocados
- dlp-paneles.php
- includes/shortcode.php
- assets/js/panel.js
- assets/css/panel.css
- README.md

### Estado
- Cambio listo para validar visualmente con recarga normal del panel.

## 2026-06-09 (iteracion 1.1.7)

### Resumen de conversacion
- Se solicito usar la guia visual como referencia, empezando solo por el header.
- Se pidio: marca/logo DEL PUENTE, nombre tienda, fecha/hora y boton de cerrar sesion.

### Cambios realizados
- Version actualizada a 1.1.7.
- Header redisenado con:
  - logo y titulo de marca
  - badge de tienda activa
  - fecha/hora en vivo
  - boton Cerrar Sesion

### Archivos tocados
- dlp-paneles.php
- includes/shortcode.php
- assets/js/panel.js
- assets/css/panel.css
- README.md

### Estado
- Listo para validacion visual del header en desktop y mobile.

## 2026-06-09 (iteracion 1.1.8)

### Resumen de conversacion
- Se solicito activar modo app para la pagina `/pedidos/` y aislarla de estilos/scripts del theme.

### Cambios realizados
- Version actualizada a 1.1.8.
- Se implemento `includes/app_mode.php` con render directo HTML para `/pedidos/`.
- En modo app se cargan solo assets del plugin y configuracion JS del panel.
- No depende del contenido/shortcode de la pagina para dibujar el panel.

### Archivos tocados
- dlp-paneles.php
- includes/app_mode.php
- README.md

### Estado
- Listo para probar en `/pedidos/` con pagina publicada.

## 2026-09-16 (iteracion 1.1.9)

### Resumen de conversacion
- El sitio ya usa `/pedidos/` para el panel v2 anterior (plugin `manejodepedidos2`), en uso activo en produccion.
- Se solicito cambiar el slug del modo app de DLP Paneles (v3) para evitar colision con el panel v2.

### Cambios realizados
- Version actualizada a 1.1.9.
- Slug por defecto del modo app cambiado de `pedidos` a `orders` en `includes/app_mode.php`.
- El filtro `dlp_paneles_app_slug` sigue disponible para override.

### Archivos tocados
- dlp-paneles.php
- includes/app_mode.php
- README.md

### Estado
- Pendiente: en WordPress, crear/publicar pagina con slug `orders` (o renombrar la pagina existente que apuntaba a `pedidos`) para que el modo app quede activo en la nueva ruta.
- El panel v2 (`manejodepedidos2`) sigue intacto en `/pedidos/`, sin cambios.

## 2026-09-16 (iteracion 1.1.10)

### Resumen de conversacion
- Ambos paneles (v2 y v3) ya conviven en el mismo WordPress (v2 en `/pedidos/`, v3 en `/orders/`).
- Se pidio simplificar el flujo operativo a: Procesando -> Enviada/LPR -> Completada (sin paso intermedio de preparacion).
- Se reporto que la tarjeta de pedido mostraba `Tiempo: 1891:06:28` (valor desbordado), mientras el panel v2 mostraba el tiempo correcto (`Tiempo Total 00:00:39`) para el mismo pedido.

### Diagnostico del bug de tiempo
- El panel v2 (`archivos/pedidos21.php`, `pedidos2.php`, `monitoreoDelivery/panelMonitoreo.php`) calcula el elapsed con:
  `strtotime(date('Y-m-d H:i:s')) - (3600 * 6)` contra `strtotime($order->get_date_created()->format('Y-m-d H:i:s'))`.
- El panel v3 (`includes/rest.php`) usaba `current_time('timestamp')` contra `WC_DateTime::getTimestamp()`, que no son directamente comparables (desalineacion de zona horaria) y producian un elapsed_seconds desbordado.
- Se replico exactamente el calculo del panel v2 en `rest.php` para mantener consistencia entre ambos paneles en el mismo sitio.

### Cambios realizados
- Version actualizada a 1.1.10.
- `includes/rest.php`:
  - Columnas fusionadas: `processing`/`prep` ahora se agrupan como `processing` (Procesando); se elimino el grupo `prep` de `counts`.
  - Transiciones de estado simplificadas: `processing`/`prep` -> `lpr`/`rtp`; `lpr`/`rtp` -> `completed`. Supervisor conserva reversas (`-> processing`) para casos excepcionales.
  - Corregido calculo de `elapsed_seconds` para igualar al panel v2.
- `assets/js/panel.js`:
  - Tablero reducido a 2 columnas: `Procesando` y `Enviada / LPR`.
  - `statusLabel`, `nextStatus` y `nextLabel` actualizados al flujo de 2 pasos.
- `assets/css/panel.css`:
  - Grid del tablero a 2 columnas; eliminados los estilos de la columna `prep`.

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css
- README.md

### Estado
- Listo para validar en `/orders/`: verificar que el tiempo de las tarjetas coincida con el panel v2 y que el flujo de botones sea Procesando -> Enviada/LPR -> Completar.
- Pendiente evaluar si se sigue avanzando hoy (modal de cancelacion, Fase 2) o se retoma en otra sesion.

## 2026-09-17 (iteracion 1.1.11 - correccion de 1.1.10)

### Resumen de conversacion
- El usuario aclaro que 1.1.10 malinterpreto el pedido: no queria reducir de 3 a 2 columnas.
- El tablero debia mantener 3 pasos: 1) Procesando, 2) Enviada / LPR, 3) Completada.
- Se envio screenshot del panel viejo (`/panelnuevo/`, version aun sin actualizar) mostrando el bug de tiempo (`1901:30:01`) para contexto, antes de que 1.1.10/1.1.11 se suban al hosting.

### Cambios realizados
- Version actualizada a 1.1.11.
- `includes/rest.php`:
  - `get_panel_statuses()` ahora incluye `completed`.
  - Nueva funcion `is_completed_status()`.
  - `get_panel_data()` separa la consulta en dos: pedidos activos (`processing`/`prep`/`lpr`/`rtp`, sin limite de fecha, hasta 180) y pedidos completados (solo del dia operativo actual via `date_created >= inicio del dia`, hasta 150) para que la columna `Completada` no crezca sin limite ni desplace pedidos activos del listado.
  - `counts` ahora es `{processing, shipped, completed}`.
- `assets/js/panel.js`:
  - Tablero vuelve a 3 columnas: `Procesando`, `Enviada / LPR`, `Completada`.
  - `statusLabel('completed')` = "Completada".
  - Nueva funcion `isFinalStatus()`: oculta los botones de accion (avanzar/cancelar) en el detalle cuando el pedido ya esta completado, y muestra una nota informativa en su lugar.
- `assets/css/panel.css`:
  - Grid del tablero vuelve a 3 columnas.
  - Estilos nuevos para `.dlp-col-completed` y `.dlp-final-note`.

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css
- README.md

### Estado
- Listo para subir al hosting (aun no se habia desplegado 1.1.10/1.1.11 al momento de esta correccion).
- Pendiente validar en `/orders/`: que aparezcan 3 columnas, que los pedidos completados hoy se vean en `Completada`, y que el tiempo ya no muestre valores desbordados.
- Pendiente evaluar si se sigue avanzando hoy (modal de cancelacion, Fase 2) o se retoma en otra sesion.

## 2026-09-17 (iteracion 1.1.12 - bug critico de estado)

### Resumen de conversacion
- El usuario reporto que la columna `Enviada / LPR` no mostraba ningun pedido en el sitio real.
- Indico que el estado real en WooCommerce es `wc-dlv` (visto en `post_status=wc-dlv&post_type=shop_order`), no `lpr`.

### Diagnostico
- Se confirmo via grep en todo `dlp_funciones` que el estado `lpr` NUNCA se usa en el codigo real del sitio.
- El estado real del flujo operativo es `dlv` (usado en `dlp-26-functions.php` y `manejodepedidos2/hora_envio/hora_envio_ajax.php` via `$order->update_status('dlv')` / `has_status('dlv')`).
- El estado `prep` tampoco existe en ningun flujo real (nunca se asigna a un pedido) - se mantiene igual por compatibilidad pero nunca tendra pedidos.
- El error se origino en la iteracion 1.1.3 (ver changelog), donde se asumio incorrectamente que el estado se llamaba `lpr` en vez de `dlv`. Este bug estuvo presente desde 1.1.3 hasta 1.1.11.

### Cambios realizados
- Version actualizada a 1.1.12.
- Reemplazado `'lpr'` por `'dlv'` en:
  - `includes/rest.php`: `get_panel_statuses()`, `is_shipped_status()`, consulta de pedidos activos, transiciones de estado (tienda y supervisor).
  - `assets/js/panel.js`: `statusLabel()`, `nextStatus()`, `nextLabel()`.
- La etiqueta visible "Enviada / LPR" no cambio, solo el estado interno que se consulta/compara.
- Nota: `cancel_order()` en `rest.php` ya usaba `'dlv'` correctamente desde el inicio (linea suelta que quedo bien por casualidad, no por diseno).

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- assets/js/panel.js
- README.md

### Estado
- Listo para subir al hosting y validar que los pedidos en estado `dlv`/`rtp` ahora aparezcan en la columna `Enviada / LPR`.
- Pendiente: el usuario va a concretar una lista extendida de cambios de UX para agrupar en la Fase 2 antes de seguir.

## 2026-09-17 (iteracion 1.2.0 - diseno nuevo, base)

### Resumen de conversacion
- El usuario trajo un boceto de diseno (Stitch) en `/Users/mimer/Downloads/stitch_panel_dlp/` (`code.html`, `screen.png`, `manifest.json`, `recursos_web.md`) con un rediseno completo del panel: tablero claro de 3 columnas con colores por estado + panel de detalle oscuro con tarjeta de tiempo/SLA, flujo operativo, detalle de productos con modificadores, datos de entrega y gestion de tienda/supervisor.
- Objetivo acordado: implementar primero el diseno base con los datos ya disponibles, y despues ir definiendo/activando botones y acciones nuevas una por una.
- Se pidio explicitamente registrar en esta memoria cada cosa identificada que le falta activar una accion real, para poder completarlas una por una despues del diseno base.

### Cambios realizados
- Version actualizada a 1.2.0.
- `includes/rest.php`: nuevos campos en el payload de `/panel`: `items[]` (via `WC_Order_Item::get_formatted_meta_data()`, mismo dato que usa el panel v2 con `wc_display_item_meta()`), `total`, `payment_method_title`, `full_address`, `entry_time`. Nuevos helpers `get_order_items_payload()` y `format_full_address()`.
- `assets/js/panel.js`: reescritura completa de `renderCards()`/`renderDetail()`/`render()` para el nuevo markup (tarjetas con badges de tiempo por color, columna de detalle oscura con tarjeta SLA, flujo operativo, productos, cliente). Nueva funcion `downloadOrdersCsv()` para el boton "Descargar Pedidos".
- `assets/css/panel.css`: reescritura completa con tokens de color del boceto (`#C4372B`, `#16273A`, `#F5F8FA`, etc.), tablero claro + detalle oscuro, responsive.
- `includes/app_mode.php`: se agrego carga de Google Fonts (Inter) y se limpio el reset de `html,body`.
- Probado visualmente en navegador con datos simulados (servidor HTTP local temporal en `scratchpad`) antes de subir: layout, tarjetas, seleccion, pedido completado sin acciones, y sin errores de consola.

### Pendientes diseno nuevo (1.2.0) - accion o decision requerida
Esta lista se debe mantener actualizada a medida que se van resolviendo items. Marcar cada uno al completarlo.

1. ~~**Meta de tiempo (SLA)**~~ RESUELTO en 1.2.2: umbrales confirmados 45min (alerta) / 60min (atrasado). Siguen hardcodeados en `panel.js` (`TIME_WARNING_MINUTES`/`TIME_LATE_MINUTES`) - pendiente evaluar si deben ser configurables por tienda/tipo de pedido (el usuario aclaro que estos numeros "pueden cambiar" tras revision con el cliente).
2. ~~**Umbrales de color del badge de tiempo en tarjetas**~~ RESUELTO en 1.2.2: mismos umbrales que el SLA (45min/60min), unificados en una sola fuente (`timeTier()`).
3. **"Cliente frecuente"**: el boceto muestra un badge de cliente frecuente bajo el nombre. No implementado - requiere logica para contar pedidos previos por telefono/cliente. Pendiente de decidir criterio (cuantos pedidos, en que periodo).
4. ~~**"Descargar Pedidos"**~~ RESUELTO en 1.2.1: no era exportar, es un refresh forzado manual del panel (icono de sincronizar).
5. **"Cancelar pedido"**: se reubico como link secundario debajo de "Gestion de Tienda y Supervisor". Sigue usando `prompt()` nativo del navegador (Fase 2 original, aun sin modal propio). Confirmar si la ubicacion/estilo nuevo es la deseada.
6. **Reasignar tienda**: cambio de boton explicito "Reasignar tienda" a autosave al cambiar el `<select>`. Confirmar que este comportamiento (sin paso de confirmacion) es el deseado, ya que un clic accidental en el dropdown reasigna sin aviso.
7. **Marcar/Quitar Prioridad**: cambio de checkbox + boton "Guardar prioridad" a un boton toggle que aplica el cambio de inmediato al hacer clic. Confirmar que este comportamiento es el deseado.
8. **Costo extra de "upgrade"**: el boceto resalta en amarillo el precio adicional de un upgrade (`+Q10.00`) por separado de los demas modificadores. La implementacion actual muestra todos los modificadores (Carne/Complemento/Bebida/Upgrade) igual, porque no hay certeza de como WooFood expone ese extra de forma aislada en `get_formatted_meta_data()`. Pendiente revisar con un pedido real que tenga upgrades para ver el dato exacto.
9. **Columna "Completada" - formato de tiempo**: el boceto muestra la hora de ingreso (ej. `18:12`) en las tarjetas de esa columna; la implementacion actual muestra tiempo transcurrido (elapsed) igual que las demas columnas. Decidir si se prefiere mostrar hora de entrega/completado en vez de elapsed para pedidos completados.
10. **Logo de marca**: el boceto usa solo texto "DEL PUENTE" en rojo (sin imagen). Se quito el `<img>` del logo del header nuevo. Confirmar si se debe reincorporar el logo grafico en algun lugar.
11. **Validacion en sitio real**: falta probar en `/orders/` con datos reales, en particular que `get_formatted_meta_data()` devuelva las mismas etiquetas ("Carne", "Complemento", "Bebida") que se ven en el boceto - depende de como WooFood registra esos metadatos por producto. Si los labels salen distintos (ej. en ingles, o con prefijos raros), hay que ajustar `get_order_items_payload()`.
12. **Modal de cancelacion** (Fase 2 original, ver iteraciones previas): sigue sin resolverse, solo se reubico el boton.
13. **Wallboard, auditoria de cambios, hardening de permisos** (Fase 3 original): sin tocar en esta iteracion.

### Archivos tocados
- dlp-paneles.php
- includes/rest.php
- includes/app_mode.php
- assets/js/panel.js
- assets/css/panel.css
- README.md

### Estado
- Diseno base implementado y probado visualmente con datos simulados. Listo para subir al hosting y validar con datos reales.
- Pendiente ir resolviendo uno por uno los items de la lista de pendientes arriba, segun prioridad que defina el usuario.

## 2026-09-17 (iteracion 1.2.1 - ajuste header: boton "Descargar Pedidos")

### Resumen de conversacion
- El usuario empezo a revisar los pendientes de 1.2.0 desde el header.
- Aclaro que el boton "Descargar Pedidos" (que yo habia implementado como exportacion CSV, item 4 de pendientes) en realidad debia ser: cambiar el icono a uno de "sincronizar", y la accion debe ser forzar manualmente una recarga/descarga de los pedidos desde el servidor (no exportar un archivo).

### Cambios realizados
- Version actualizada a 1.2.1.
- `assets/js/panel.js`: se elimino `downloadOrdersCsv()` y el icono `download`. Se agrego icono `sync` (flechas circulares) y funcion `forceRefresh(button)` que llama a `loadPanel()` y aplica una clase `dlp2-spin` al icono mientras carga (feedback visual de que esta sincronizando).
- `assets/css/panel.css`: nueva animacion `dlp2-spin-anim` (rotacion continua) aplicada via clase `.dlp2-spin`.
- El texto del boton se dejo igual ("Descargar Pedidos") porque el usuario no pidio cambiarlo, solo el icono y la accion.
- Probado visualmente en navegador (servidor HTTP local temporal): clic en el boton dispara el refresh sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Pendiente #4 de la lista de 1.2.0 resuelto.
- El usuario esta revisando el resto de pendientes empezando por el header; continuar con los siguientes ajustes que indique.

## 2026-09-17 (iteracion 1.2.2 - umbrales de tiempo, reloj en vivo, tarjetas compactas)

### Resumen de conversacion
- El usuario envio screenshots del panel real en produccion (con pedidos reales) y del ejemplo HTML de referencia.
- Confirmo los umbrales de tiempo (pendientes #1 y #2 de 1.2.0): 45 min para la primera alerta, 60 min para "Atrasado". Aclaro que estos numeros "pueden cambiar" cuando el cliente los revise.
- Pidio que los tiempos (tarjetas y detalle) corran en vivo segundo a segundo (hasta ahora solo se actualizaban al recargar el panel cada 30s), con los `:` de los segundos parpadeando.
- Señalo que las tarjetas de pedido tienen demasiado espacio interno entre elementos, y que las tarjetas de la columna "Completada" deberian tener un diseno "mini" (mas compacto), como en el HTML de ejemplo original.

### Cambios realizados
- Version actualizada a 1.2.2.
- `assets/js/panel.js`:
  - Nuevas constantes `TIME_WARNING_MINUTES = 45` y `TIME_LATE_MINUTES = 60`, usadas tanto en `timeTier()` (color del badge de tarjeta) como en `renderTimeCard()` (SLA del detalle) - una sola fuente de verdad.
  - Reloj en vivo: `state.loadedAt` guarda el momento del ultimo fetch exitoso; `liveElapsed(order)` suma el tiempo real transcurrido en el navegador al `elapsed_seconds` que mando el servidor. Nuevo `setInterval(updateLiveTimes, 1000)` que actualiza solo los badges de tiempo de las tarjetas (`[data-time-badge]`) y la tarjeta de tiempo del detalle (`.dlp2-time-card`) via `outerHTML`, sin re-renderizar todo el panel (se probo que no interrumpe la edicion de la nota interna).
  - `fmtCardTime()`/`fmtBigTime()` ahora envuelven el separador `:` en `<span class="dlp2-colon">` para el parpadeo CSS. El formato `mm:ss` (con colon) solo se usa por debajo del umbral de alerta (45min) en las tarjetas; el reloj grande del detalle siempre usa formato con colon.
  - Nueva variante "mini" de tarjeta para la columna `Completada`: `renderCards()` detecta `status === 'completed'` y genera un markup compacto (id + tiempo en una fila, nombre + telefono en una sola fila, sin badge de tienda ni prioridad), replicando el HTML de ejemplo original (`stitch_panel_dlp/code.html`).
  - Refactor: `renderTimeBadge()` y `renderTimeCard()` ahora aceptan segundos explicitos para poder reusarse tanto en el render inicial como en el ticker en vivo.
- `assets/css/panel.css`:
  - `.dlp2-card`: padding y gap reducidos (14px/10px -> 10-12px/6px) para tarjetas mas compactas.
  - Nuevas clases `.dlp2-card-mini`, `.dlp2-card-id-mini`, `.dlp2-time-badge-mini`, `.dlp2-card-mini-row` para la tarjeta compacta.
  - Nueva animacion `@keyframes dlp2-blink` aplicada a `.dlp2-colon` para el parpadeo de los `:`.
  - Pill "Meta" del detalle renombrada a "Atrasado a los" (ahora siempre muestra el umbral de 60min en vez de una meta separada de 30min).
- Probado visualmente en navegador: se confirmo que el tiempo de las tarjetas y del detalle avanza solo (sin recargar), que el input de nota interna no pierde el valor mientras el ticker corre, y que la tarjeta "mini" de Completada se ve compacta (id+tiempo arriba, nombre+telefono en una fila).

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Pendientes #1 y #2 de la lista de 1.2.0 resueltos (umbrales 45/60 confirmados, aunque el usuario indico que pueden ajustarse mas adelante).
- Pendiente subir a hosting y validar con datos reales que el parpadeo/ticking se vea bien y que la tarjeta mini luzca correctamente con pedidos reales de la columna Completada.
- Sigue pendiente el resto de la lista de 1.2.0 (items 3, 5-13).

## 2026-09-17 (iteracion 1.2.3 - ajustes UX: detalle mas ancho, sin parpadeo, texto Total)

### Resumen de conversacion
- El usuario confirmo que la columna de "Completada" (tarjetas mini) esta bien como quedo en 1.2.2.
- Pidio que la columna de detalle del pedido sea mas grande/ancha.
- El parpadeo de los `:` no le gusto: con el reloj ya corriendo en vivo segundo a segundo, el parpadeo es redundante ("como esta live los segundos ya con ese movimiento esta bien").
- Pidio cambiar el texto "Total a Cobrar" por solo "Total" en el detalle de productos.

### Cambios realizados
- Version actualizada a 1.2.3.
- `assets/css/panel.css`: `.dlp2-detail` de `420px` a `500px` de ancho. Eliminada la clase `.dlp2-colon` y el `@keyframes dlp2-blink` (ya no se usan).
- `assets/js/panel.js`: `fmtCardTime()`/`fmtBigTime()` vuelven a devolver un `:` literal (sin el span de parpadeo). Texto "Total a Cobrar" cambiado a "Total" en `renderProducts()`.
- Probado visualmente en navegador: detalle mas ancho, tiempos siguen corriendo en vivo (sin parpadeo), texto "Total" correcto, sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar en produccion.
- Sigue pendiente el resto de la lista de 1.2.0 (items 3, 5-13).

## 2026-09-17 (iteracion 1.3.0 - tipo de pedido Delivery / Pickup)

### Resumen de conversacion
- El usuario senalo que faltaba algo "super importante" desde el inicio: los pedidos son Delivery o Pickup, y eso no estaba reflejado en ningun lado del panel.
- Pidio: filtro "Todos / Delivery / Pickup" en el header, el mismo dato visible en las tarjetas de pedido, y en el detalle del pedido.
- Trajo un segundo boceto (`stitch_panel_dlp2222.zip`) mostrando como se veria.
- Aprovecho para pedir que el metodo de pago sea "mucho mas visible" en el detalle.

### Investigacion
- El tipo de pedido ya existe en el sitio real: meta `woofood_order_type` (WooFood), valores `delivery` (default) / `pickup`. Confirmado en `woofood-plugin/inc/func/order_type.php` (`woofood_get_order_types()`) y en el uso real del panel v2 (`manejodepedidos2/archivos/pedidos21.php`, variable `$order_type_text`).
- Nota: el boceto (code.html) tenia un bug visual en el ejemplo (el numero de item de producto se reemplazo por el texto completo "Entrega a domicilio (Delivery)", causando texto superpuesto en el screenshot). Se ignoro ese detalle por ser un error del generador del boceto, no un diseno intencional - se mantuvieron los numeros de item normales.

### Cambios realizados
- Version actualizada a 1.3.0.
- `includes/rest.php`: nuevo campo `order_type` en el payload de cada pedido (leido de `woofood_order_type`, normalizado a `delivery`/`pickup`).
- `assets/js/panel.js`:
  - Nuevos iconos `truck`, `bag`, `card`, `cash`.
  - `state.typeFilter` (`all`/`delivery`/`pickup`), `filteredOrders()`, `renderTypeTabs()` (tabs "Todos/Delivery/Pickup" con contador, 100% client-side, sin recargar el panel).
  - `renderTypePill()` (badge Delivery/Pickup) agregado a tarjetas normales, tarjetas mini, y detalle (header + titulo).
  - Columnas del tablero ahora cuentan solo los pedidos visibles segun el filtro activo (`countFor()` en `render()`), no el total del servidor.
  - `renderPaymentBanner()`: banner destacado con icono grande, reemplaza la mencion pequena de metodo de pago en la linea de meta. Heuristica `isCashPayment()` colorea verde (pago ya realizado) vs amber (cobrar en efectivo) segun el texto del metodo de pago - **provisional**, ver pendientes.
  - Etiqueta de direccion en el detalle cambia segun tipo (`Entrega a domicilio (Delivery)` / `Retiro en tienda (Pickup)`).
- `assets/css/panel.css`: estilos nuevos `.dlp2-type-tabs`, `.dlp2-type-tab*`, `.dlp2-type-pill*`, `.dlp2-payment-banner` y variantes.
- Probado visualmente en navegador con datos simulados (delivery + pickup mezclados): filtro funciona, contadores de columna se recalculan, badges se ven en tarjetas normales/mini/detalle, banner de pago visible y con color segun tipo, sin errores de consola.

### Pendientes nuevos (agregados a la lista de diseno)
14. **Heuristica de pago en efectivo**: `isCashPayment()` detecta "efectivo"/"contra entrega"/"cash" en el titulo del metodo de pago para decidir el color del banner. Confirmar con el usuario si esto es confiable o si hace falta un dato mas explicito (ej. meta especifica de WooCommerce/WooFood para "pago pendiente de cobro").
15. **Pickup sin direccion**: cuando un pedido pickup no tiene `full_address`, el bloque de direccion simplemente no se muestra. Evaluar si en su lugar se deberia mostrar algo como "Retirar en: {nombre de tienda}".

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con pedidos reales de ambos tipos.
- Sigue pendiente el resto de la lista de 1.2.0 (items 3, 5-13) mas los nuevos items 14-15.

## 2026-09-17 (iteracion 1.4.0 - vista expandida "Pedido")

### Resumen de conversacion
- El usuario pidio un boton de "expandir" en el titulo "Detalle del pedido" (icono tipo flechas diagonales) que abre una nueva vista "Pedido": una version ampliada de la columna de detalle, con mas espacio y detalle.
- Trajo un tercer boceto (`stitch_panel_dlp.zip`, distinto de los dos anteriores con el mismo nombre de carpeta) con el diseno de referencia: una "super-tarjeta" oscura a todo el ancho, con 3 columnas (Reloj KDS + Resumen de Cocina | Detalle de Productos + Totales | Datos de Entrega/Cliente + Gestion).

### Cambios realizados
- Version actualizada a 1.4.0.
- `includes/rest.php`: nuevo campo `shipping_total` en el payload (via `$order->get_shipping_total()`).
- `assets/js/panel.js`:
  - Nuevos iconos `expand`, `back`, `close`, `kitchen`, `check`.
  - `state.expandedOrderId`. Boton "Abrir pedido" agregado al header del detalle (`.dlp2-detail-header-actions`).
  - `renderExpandedOrder(order)`: la vista completa de 3 columnas. Reutiliza `renderTimeCard()` (reloj), `renderProductRow()` (ahora extraida de `renderProducts()` para compartirla), y la estructura de "Datos de Entrega y Cliente"/"Gestion de Tienda y Supervisor" del detalle normal.
  - `renderKitchenSummary()` + `aggregateKitchenItems()`: agrupa los modificadores de todos los productos del pedido (por categoria+valor), sumando cantidades. Detecta "(xN)" en el valor del modificador (formato que ya usa WooCommerce cuando el modificador aplica a un producto con cantidad >1) o usa `item.quantity` si no hay sufijo. **Heuristica provisional, no validada con datos reales.**
  - `renderPrepProgress()`: indicador visual de 3 pasos basado en `flowStep()`/`isFinalStatus()`.
  - `render()` ahora bifurca: si `state.expandedOrderId` apunta a un pedido existente, el `<main>` muestra `renderExpandedOrder()` en vez del tablero+detalle. El header (marca, filtro tipo, reloj, botones) se mantiene igual en ambos modos.
  - `updateLiveTimes()` generalizado: ya no busca `.dlp2-time-card` solo dentro de `.dlp2-detail`, sino en todo `root` (funciona tanto en el tablero como en la vista expandida).
  - Botones "Volver al tablero" y "X" usan `data-action="collapse-order"` (sin `data-order-id`, se maneja como caso especial antes del chequeo generico de acciones).
  - `save-note` ahora busca el input dentro de `.dlp2-detail` o `.dlp2-expanded` (antes solo buscaba en `.dlp2-detail`, lo que habria roto la nota interna dentro de la vista expandida).
  - `loadPanel()` limpia `state.expandedOrderId` si el pedido expandido deja de existir en la respuesta (ej. se completo y salio del rango del dia).
- `assets/css/panel.css`: bloque completo de estilos nuevos para `.dlp2-expanded*`, `.dlp2-kitchen-*`, `.dlp2-prep-*`, mas responsive para colapsar a 1 columna en pantallas chicas.
- Probado visualmente en navegador: boton "Abrir pedido" funciona, la vista expandida se ve muy cercana al boceto (resumen de cocina agrupa correctamente 3 productos con carne/complemento/bebida compartidos, ej. "Bebidas Frezka Rosa de Jamaica x5 unidades" = 1+3+1 de los 3 combos), "Volver al tablero" regresa correctamente, sin errores de consola.

### Notas / decisiones tomadas sin preguntar (documentar por si hay que ajustar)
- El boceto mostraba "Cliente frecuente - 12 pedidos previos" y "Canal: E-Commerce Web" en la vista expandida. **No se implementaron** porque no hay datos reales para eso (ver pendiente #3 de la lista de 1.2.0 sobre "cliente frecuente"). Se omitieron esas lineas en vez de inventar datos falsos.
- El boceto tenia un boton de accion primario distinto para cada paso ("Pasar a Enviar/LPR"), lo cual ya existe via `nextLabel()`/`data-action="advance"` - se reutilizo tal cual, ahora ubicado en la barra superior de la vista expandida en vez de en una tarjeta separada.
- "Cancelar pedido" se mantuvo como link secundario al final de la tercera columna (el boceto no lo mostraba, igual que en iteraciones anteriores).

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con datos reales, especialmente el Resumen de Cocina (la heuristica de agrupacion es lo mas incierto de esta iteracion).
- Sigue pendiente el resto de la lista de 1.2.0/1.3.0 (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.1 - quitar envio, rediseno tablero, cocina->acciones)

### Resumen de conversacion
- El usuario confirmo que la animacion de expandir "esta perfecta".
- Pidio quitar la tarifa de envio del desglose de totales: "no se calcula, es algo que hay que quitar".
- Pidio meter las 4 columnas del tablero principal (Procesando, Enviada/LPR, Completada, Detalle del pedido) dentro de un unico contenedor con bordes redondeados y sombra minimalista; quitar el borde/sombra de cada columna individual y en su lugar darle un fondo tenue del color de su categoria; dejar la columna de Detalle del pedido con su color actual pero con sombra/borde sutil tipo "capa" que se puede expandir.
- Pidio hacer mas pequenas las columnas Procesando y Enviada/LPR, y mas grande la columna de Detalle del pedido.
- En la vista expandida: el bloque "Resumen de Cocina" no se usa en la operacion real. Pidio reemplazarlo por una seccion "Acciones" con cambiar tienda, cancelar pedido, etc.
- Pidio explorar opciones para mostrar los productos/extras del pedido con mas detalle y mas grande, aprovechando el espacio que libero quitar el bloque de cocina.

### Cambios realizados
- Version actualizada a 1.4.1.
- `includes/rest.php`: eliminado el campo `shipping_total` (no se usa).
- `assets/js/panel.js`:
  - `renderExpandedOrder()`: quitada la fila "Tarifa de envio" del desglose de totales (ahora solo `Total`). Eliminadas `aggregateKitchenItems()`, `kitchenCategoryPlural()`, `kitchenUnitLabel()`, `renderKitchenSummary()` y el icono `kitchen` (ya no se usan).
  - Nueva funcion `renderActionsCard(order)`: tarjeta "Acciones" con tienda asignada, prioridad, bitacora interna y cancelar pedido - reemplaza el bloque de cocina en la primera columna de la vista expandida.
  - La tercera columna de la vista expandida quedo solo con "Datos de Entrega y Cliente" (se le quito la seccion de Gestion de Tienda y Supervisor, que ahora vive en la columna 1 dentro de Acciones).
  - Clases renombradas de `.dlp2-kitchen-*` a `.dlp2-panel-card*` (contenedor generico reutilizable, ya no especifico de cocina).
  - `render()`: las columnas del tablero ahora llevan clases `dlp2-column-processing`/`dlp2-column-shipped`/`dlp2-column-completed` para el fondo tenue por categoria.
- `assets/css/panel.css`:
  - Nuevas variables `--dlp-amber-tint`, `--dlp-blue-tint`, `--dlp-green-tint`.
  - `.dlp2-layout` ahora es el contenedor visual unico (fondo blanco, `border-radius:16px`, sombra minimalista) que envuelve tablero + detalle.
  - `.dlp2-column`: sin borde ni sombra propia, fondo tenue segun categoria (`.dlp2-column-processing/-shipped/-completed`).
  - `.dlp2-column` (Procesando/Enviada) `flex` de `1.1` a `0.8`; `.dlp2-column-narrow` (Completada) de `0.85` a `0.5`.
  - `.dlp2-detail`: ancho de `500px` a `620px`, `border-radius` de `10px` a `14px`, sombra reforzada en 2 capas para look de "capa" flotante.
  - Nuevos estilos `.dlp2-panel-card*`, `.dlp2-actions-card-body`, `.dlp2-cancel-link-block`. Eliminados los estilos `.dlp2-kitchen-item*` (ya no se usan).
- Probado visualmente en navegador: contenedor unico con sombra visible, columnas con tinte de color correcto, columna de detalle mas ancha y con sombra de "capa", vista expandida con "Acciones" en la primera columna y sin fila de envio, sin errores de consola.

### Pendiente (no resuelto en esta iteracion, requiere decision del usuario)
16. **Diseno de "Detalle de Productos" en la vista expandida**: el usuario pidio explorar opciones para mostrarlo "mejor, con mas detalle y mas grande", aprovechando el espacio libre que dejo quitar el bloque de cocina (la columna 3 tambien quedo con bastante espacio vacio). Se le presentaron opciones via pregunta directa en el chat antes de implementar, en vez de adivinar - ver respuesta del usuario en la conversacion para saber cual se eligio.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con datos reales.
- Pendiente resolver el item 16 (diseno de productos) segun lo que elija el usuario, y el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.2 - resuelto item 16: diseno de productos)

### Resumen de conversacion
- Se le presentaron al usuario 4 opciones para el item 16 (diseno de "Detalle de Productos" en la vista expandida): tarjetas grandes, grid de 2 columnas, estilo comanda/recibo, o combinacion de tarjetas grandes + usar el espacio de la columna 3.
- El usuario eligio la combinacion: tarjetas grandes + usar el espacio de la columna 3.

### Cambios realizados
- Version actualizada a 1.4.2.
- `assets/js/panel.js`: el bloque de totales (`dlp2-expanded-totals`) se movio de la columna de productos (columna 2) a la columna de "Datos de Entrega y Cliente" (columna 3), debajo de la tarjeta de cliente. Ahora incluye "Cantidad de items" ademas del "Total".
- `assets/css/panel.css`: nuevos estilos escopados a `.dlp2-expanded-products .dlp2-product*` (padding 16px, `border-radius:10px`, nombre/precio a 16px, modificadores a 13px con mas indentacion) para que las tarjetas de producto se vean notablemente mas grandes solo en la vista expandida (el tablero/detalle normal no cambia).
- Probado visualmente: tarjetas de producto mas grandes y legibles, columna 3 ahora usa el espacio libre con el resumen de items+total, sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Item 16 resuelto. Listo para subir al hosting y validar con datos reales.
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.3 - fondo de columnas, bug de contador en Completados, expandido a 2 columnas)

### Resumen de conversacion
- El usuario pidio quitar el fondo de color de las 3 columnas de estado del tablero (Procesando, Enviada/LPR, Completada), agregado en la iteracion 1.4.1.
- Pidio ademas hacer la columna Completada un poco mas grande y la de Detalle del pedido un poco mas pequena.
- Reporto un bug: en pedidos Completados el contador de tiempo seguia corriendo en el panel (solo visualmente); el contador debia detenerse al pasar a Completado y usar el meta que WooCommerce ya guarda.
- Pidio rediseñar la vista expandida "Pedido" (introducida en 1.4.0) para usar 2 columnas para los productos y 1 columna para el resto de la informacion.

### Cambios realizados
- Version actualizada a 1.4.3.
- `assets/css/panel.css`: eliminadas las variables `--dlp-amber-tint`/`--dlp-blue-tint`/`--dlp-green-tint` y las reglas `.dlp2-column-processing/-shipped/-completed` (fondo de color); `.dlp2-column` ahora usa `background: transparent`. `.dlp2-column-narrow` (Completada) paso de `flex: 0.5` a `flex: 0.65`. `.dlp2-detail` (Detalle del pedido) de `620px` a `560px`.
- `includes/rest.php`: el calculo de `elapsed_seconds` ahora usa una fecha de referencia distinta segun el estado -- para pedidos `completed` usa `$order->get_date_completed()` (meta `_date_completed` que WooCommerce ya guarda al completar) en vez de la hora actual del servidor, congelando el tiempo transcurrido. Para el resto de estados sigue usando la hora actual, sin cambios de comportamiento.
- `assets/js/panel.js`: `liveElapsed()` ya no le suma tiempo en vivo a los pedidos con `group === 'completed'` (antes seguia sumando segundos desde el ultimo fetch aunque el pedido ya estuviera completado). `render()` ya no agrega las clases de tinte a las columnas del tablero (innecesarias tras quitar el fondo).
- `assets/js/panel.js` + `assets/css/panel.css`: `renderExpandedOrder()` reestructurado de 3 columnas a 2 -- la primera columna agrupa todo lo que antes estaba repartido en columnas 1 y 3 (tiempo, progreso de preparacion, Acciones, Datos de Entrega y Cliente, totales); la segunda columna (`dlp2-expanded-col-mid`) muestra solo el Detalle de Productos, ahora en una grilla CSS de 2 columnas (`.dlp2-expanded-products { display:grid; grid-template-columns: repeat(2,1fr); }`, con fallback a 1 columna en mobile). `.dlp2-expanded-grid` paso de `repeat(3,1fr)` a `1fr 1.6fr` para darle mas espacio a productos.
- Probado visualmente con datos simulados (pedido activo con contador corriendo + pedido completado con contador congelado + vista expandida en 2 columnas), sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con datos reales, en especial el bug del contador (`_date_completed` depende de que WooCommerce lo haya seteado correctamente en pedidos existentes; pedidos ya completados antes de este fix podrian no tener esa meta y usarian la hora actual como fallback).
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.4 - precio unitario, orden de Acciones, bug de prioridad, divisor, paginacion)

### Resumen de conversacion
- El usuario reviso 1.4.3 y pidio, en el Detalle de Productos (tablero y vista expandida), mostrar precio unitario x cantidad y luego el Total de esa linea, en vez de solo el total.
- Pidio mover la tarjeta "Acciones" al final de la primera columna de la vista expandida (en vez de ir justo despues del progreso de preparacion).
- Reporto un bug de UX: una tarjeta con prioridad se ve resaltada con un borde grueso que se confunde con la tarjeta seleccionada (la que esta en el panel de Detalle), como se ve en captura adjunta.
- Pidio una linea divisoria sutil (estilo emboss/sombra interna) entre las columnas del tablero.
- Pidio pensar en paginacion: que cada columna cargue solo ~10-12 pedidos inicialmente con un boton "Cargar mas" que traiga 20 mas, para que el sistema no se sature si una columna acumula muchos pedidos. Tambien confirmo que la columna Completada debe seguir mostrando solo los pedidos del dia operativo actual (ya implementado desde 1.1.11/version inicial del rediseno, sin cambios necesarios).

### Cambios realizados
- Version actualizada a 1.4.4.
- `assets/js/panel.js`: `renderProductRow()` ahora calcula `unitPrice = item.total / item.quantity` y muestra una fila `Q[unitario] x [cantidad]` junto con `Total: Q[total de linea]` (antes solo mostraba el total de linea en el encabezado del producto). Aplica tanto al detalle normal del tablero como a la vista expandida, ya que ambas comparten la misma funcion.
- `assets/js/panel.js`: `renderExpandedOrder()` reordenado -- la tarjeta "Acciones" ahora se renderiza al final de la primera columna, despues de Datos de Entrega/Cliente y Totales.
- `assets/js/panel.js` + `assets/css/panel.css`: `.dlp2-card-priority` paso de `border: 2px solid` (las 4 caras) a solo `border-left: 3px solid` con ajuste de padding, para que la prioridad se note pero no compita visualmente con `.dlp2-card-active` (el resaltado de seleccion).
- `assets/css/panel.css`: nueva regla `.dlp2-column + .dlp2-column` con `border-left` sutil + `box-shadow: inset` (efecto emboss) para separar las columnas del tablero.
- `assets/js/panel.js`: agregada paginacion client-side por columna (`state.columnLimits`, `COLUMN_INITIAL_LIMIT = 12`, `COLUMN_LOAD_MORE = 20`). `renderCards()` corta la lista al limite vigente de esa columna y agrega un boton "Cargar mas" (`data-action="load-more"`) cuando quedan pedidos por mostrar; el click handler incrementa el limite de esa columna y vuelve a renderizar. No requirio cambios en el backend (los datos ya vienen completos en cada `/panel`, solo se limita cuanto se pinta).
- Se confirmo que `includes/rest.php` ya filtra los pedidos completados por `date_created >= today_start_ts` (dia operativo actual) desde una iteracion anterior; no se toco.
- Probado visualmente con un dataset simulado de 25 pedidos completados: se muestran 12 + boton "Cargar 13 mas (13 restantes)"; al hacer click carga el resto y el boton desaparece. Prioridad ahora se ve como barra lateral, sin confundirse con la seleccion. Sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con datos reales.
- La paginacion es solo de render (client-side); si en el futuro el volumen de pedidos crece mucho tambien podria valer la pena paginar la llamada a la API (`/panel`) en vez de traer todo de una vez -- no fue necesario para este pedido concreto.
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.5 - agrupar modificadores de producto, orden de pill Delivery/Pickup)

### Resumen de conversacion
- El usuario reviso 1.4.4 y envio captura del Detalle de Productos: los modificadores de WooFood se veian como pares de lineas sueltas sin relacion visual clara, ej. "• : aqui tu carne favorita" seguido de "• Premium Blend: Q0.00".
- Pidio que se vea como titulo ("Tu carne favorita") + subtitulo ("• Premium Blend: Q0.00"), con el precio resaltado y mas grande.
- Pidio que en la columna de Detalle del pedido (y por extension la vista expandida) el pill de tipo de pedido (Delivery/Pickup) se muestre antes del pill de estado, en el titulo: "Pedido #166501 [Delivery] [Completada]".

### Cambios realizados
- Version actualizada a 1.4.5.
- `assets/js/panel.js`: nueva funcion `renderProductMeta(meta)` que reemplaza el mapeo plano anterior. WooFood entrega los modificadores en pares -- una meta sin `label` (la descripcion del grupo, ej. "aqui tu carne favorita") seguida de la meta con la opcion elegida y su precio (ej. "Premium Blend: Q0.00"). La funcion detecta ese patron y agrupa cada par como un titulo (`.dlp2-product-mod-title`, con primera letra en mayuscula via el nuevo helper `capitalizeFirst()`) + una fila subtitulo con bullet y el precio en su propio span (`.dlp2-product-mod-price`). Los casos que no siguen el patron (ej. meta de "Upgrade") se siguen mostrando como fila suelta, igual que antes.
- `assets/css/panel.css`: nuevas reglas `.dlp2-product-mod`, `.dlp2-product-mod-title`, `.dlp2-product-mod-row`, `.dlp2-product-mod-price` (precio en verde `#34D399`, negrita, mas grande que el resto del texto); tamanos aumentados en la vista expandida (`.dlp2-expanded-products .dlp2-product-mod-title/-price`); aumentado el espaciado entre grupos de modificadores (`.dlp2-product-meta` gap de 2px a 8px, 10px en expandida).
- `assets/js/panel.js`: `renderDetail()` -- se agrego `renderTypePill(order, false)` en `.dlp2-detail-title-row` justo antes del pill de estado, y se quito el pill de tipo que estaba duplicado en `.dlp2-detail-header-actions` (quedaba redundante). `renderExpandedOrder()` -- se invirtio el orden dentro de `.dlp2-expanded-badges`: ahora el pill de tipo va antes del pill de estado, igual que en el tablero.
- Probado visualmente con datos simulados replicando la estructura real de metas de WooFood (grupos de carne/complemento/bebida + un caso de Upgrade + un producto sin modificadores), en el detalle normal y en la vista expandida. Sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con datos reales de pedidos con modificadores.
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.6 - bug de precio base vs total, boton Sincronizar)

### Resumen de conversacion
- El usuario reporto un bug con capturas: un combo de Q75 con un extra de Tiky de Q5 se mostraba como "Q80.00 x 1" en la parte de arriba de la tarjeta (como si esa fuera el precio base/unitario) y luego el extra de Q5 volvia a aparecer abajo, dando la sensacion de que el calculo estaba mal o que no quedaba claro que era "total de que".
- Pidio tambien cambiar el texto del boton "Descargar Pedidos" a "Sincronizar".
- Pidio en general mejorar el formato de la seccion de productos para que quede claro que numero es cual.

### Cambios realizados
- Version actualizada a 1.4.6.
- Causa raiz del bug: `item.total` (el total de linea que manda WooCommerce) ya incluye el costo de los extras/modificadores. El codigo anterior calculaba el "precio unitario" como `item.total / quantity`, mostrando el total-con-extras como si fuera el precio base, y luego mostraba el precio de cada extra otra vez en su propia fila -- visualmente parecia que se sumaba de mas.
- `assets/js/panel.js`: nuevo helper `parseMoneyString()` que extrae el numero de textos como "Q5.00" o "Papas grandes +Q10.00". `renderProductMeta()` ahora devuelve `{ html, modifiersTotal }`, sumando el precio de cada extra (de los grupos titulo+subtitulo y del caso "Upgrade"). `renderProductRow()` calcula `baseTotal = item.total - modifiersTotal` y muestra ese precio base (dividido entre la cantidad) junto al nombre del producto, en vez del total-con-extras.
- `assets/js/panel.js` + `assets/css/panel.css`: reordenada la tarjeta de producto -- arriba el nombre + precio base x cantidad; en medio los extras con su propio precio; al final una fila "Total" separada por una linea divisoria (`.dlp2-product-linetotal`), mostrando la suma real (precio base + extras). Se eliminaron las clases `.dlp2-product-pricing`/`.dlp2-product-unit` (ya no se usan) y se agrego `.dlp2-product-baseprice`.
- `assets/js/panel.js`: texto del boton de refresh manual del header cambiado de "Descargar Pedidos" a "Sincronizar" (sin cambios de funcionalidad).
- Probado visualmente reproduciendo el caso exacto reportado (combo Q75 + extra Tiky Q5 = Total Q80): ahora se ve "Q75.00 x 1" arriba, "Tiky Q5.00" y "Papas fritas Q0.00" como extras, y "Total Q80.00" claramente separado al final. Sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y validar con datos reales, en especial pedidos con varios extras para confirmar que el precio base calculado coincide con el precio real del combo en el catalogo.
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.4.7 - aclarar textos de "Total", demo de transiciones)

### Resumen de conversacion
- El usuario reviso 1.4.6 y pidio aclarar los textos: el "Total" de cada producto individual debe decir "Total del Producto", y el "Total" general del pedido debe decir "Total del Pedido". Aplica tanto al detalle normal como a la vista expandida.
- Pidio ademas 4 opciones de animacion para abrir/cerrar el panel expandido "Pedido", mas lentas o distintas a la actual (que hoy es un swap instantaneo de innerHTML sin transicion real), para probarlas antes de decidir cual implementar.

### Cambios realizados
- Version actualizada a 1.4.7.
- `assets/js/panel.js`: texto "Total" -> "Total del Producto" en `.dlp2-product-linetotal` (dentro de cada tarjeta de producto, compartido por el detalle normal y la vista expandida); "Total" -> "Total del Pedido" en `.dlp2-total-row` (detalle normal) y en `.dlp2-expanded-totals-row.dlp2-expanded-totals-final` (vista expandida).
- Se genero un archivo HTML de demo (fuera del plugin, no se toco codigo de produccion) con 4 variantes de transicion para abrir/cerrar un panel tipo "Pedido expandido", seleccionables con botones: (1) deslizar desde la derecha, (2) zoom suave desde el centro con rebote leve, (3) deslizar desde abajo tipo hoja modal, (4) crossfade con el tablero desenfocandose de fondo. Se envio el archivo al usuario para que pruebe cada una y elija; falta implementar la elegida en el codigo real (`renderExpandedOrder`/`render()` actualmente hacen swap instantaneo del HTML sin transicion).

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js

### Estado
- Cambios de texto listos para subir al hosting.
- Pendiente: el usuario debe elegir una de las 4 variantes de transicion de la demo para implementarla en el codigo real del panel.
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.5.0 - animacion real de abrir/cerrar "Pedido")

### Resumen de conversacion
- Ninguna de las 4 variantes de la demo anterior le gusto al usuario. Pidio una quinta opcion especifica: que el panel se expanda hacia la izquierda (no muy rapido) para abrir, y que se reduzca de vuelta al tamano de la columna de detalle para cerrar.
- Se genero una nueva demo (`demo_transicion_izquierda.html`) con ese concepto exacto (panel anclado al borde derecho, animando `left`, con selector de velocidad 0.4s/0.65s/0.9s) y se envio al usuario.
- El usuario probo la demo y eligio la velocidad lenta (0.9s). Pidio implementarla en el codigo real.
- De paso, en una captura de la vista expandida real, pidio quitar el boton "Volver al tablero" y que el boton de cerrar se vea "en una capa superior", en blanco o con contraste sobre el fondo oscuro (en vez de mezclarse con la barra superior oscura).

### Cambios realizados (cambio arquitectonico, no solo visual)
- Version actualizada a 1.5.0.
- Causa raiz de por que no habia animacion real: `render()` hacia `root.innerHTML = ...` completo en cada actualizacion (poll cada 30s, cualquier click), destruyendo y recreando todos los nodos. Una transicion CSS no puede animarse si el elemento se destruye y se vuelve a crear; necesitaba un nodo estable que solo cambie de clase/posicion.
- `assets/js/panel.js`: nueva funcion `ensureSkeleton()` que crea una sola vez un esqueleto persistente (`#dlp2-app` con `display:contents` para no romper el flex-column de `#dlp-paneles-root`, mas `#dlp2-header-slot`, `#dlp2-netwarn-slot`, `.dlp2-stage` con `#dlp2-board-slot` y `#dlp2-expanded-overlay`). `render()` ahora actualiza el `innerHTML` de cada slot por separado en vez de reemplazar todo `root`, dejando el nodo `#dlp2-expanded-overlay` intacto entre renders (nunca se destruye mientras esta abierto o animandose).
- Logica de apertura/cierre en `render()`: al abrir, se actualiza el contenido del overlay, se fuerza un reflow (`overlay.offsetWidth`) y se agrega la clase `is-open` en el siguiente frame (`requestAnimationFrame`) para que el navegador anime desde la posicion "cerrada" (alineada con el ancho de la columna) hasta la posicion "abierta" (todo el ancho). Al cerrar, se quita `is-open` (dispara la animacion de reduccion) y solo se limpia el `innerHTML` del overlay cuando termina la transicion (`transitionend`), para que el contenido siga visible mientras se reduce en vez de desaparecer de golpe. Si el panel ya estaba abierto y solo llega un refresco de datos (polling), el contenido se actualiza sin reiniciar la animacion.
- `renderExpandedOrder()`: se quito el boton "Volver al tablero" y el divisor que lo acompañaba; el boton de cerrar se movio fuera del flujo del topbar (ya no vive dentro de `.dlp2-expanded-right`).
- `updateLiveTimes()`: como ahora el tablero y el overlay expandido pueden coexistir en el DOM al mismo tiempo (antes eran mutuamente excluyentes), se separo en dos busquedas independientes (`refreshTimeCard` para `#dlp2-board-slot` y para `#dlp2-expanded-overlay`) en vez de un solo `querySelector` que solo encontraba la primera coincidencia.
- `assets/css/panel.css`: `.dlp2-expanded-overlay` es el nuevo elemento animado -- `position:absolute` dentro de `.dlp2-stage` (que ahora es `position:relative; flex:1` y carga el margen que antes tenia `.dlp2-layout`), ancho igual al de `.dlp2-detail` (560px) cuando esta cerrado (`left: calc(100% - 560px - 14px)`) y `left:14px` (todo el ancho) cuando tiene la clase `is-open`, con `transition: left 0.9s cubic-bezier(0.22,1,0.36,1)`. Tiene tambien `opacity:0` por defecto y solo se hace visible con la clase `is-visible` (que se agrega junto con el contenido y se quita recien cuando termina de cerrarse) -- esto evita que la caja oscura vacia tape el panel de Detalle del pedido real cuando esta "cerrada" pero sin contenido. El contenido interno (topbar + grid) se desvanece mientras el panel esta angosto y solo se ve nitido cuando termina de expandirse (`transition-delay: 0.55s` en los hijos directos), para que no se vea el grid de 2 columnas comprimido durante la animacion.
- El boton de cerrar (`.dlp2-expanded-close`) se redisenio: `position:absolute` flotando arriba a la derecha del overlay, fondo blanco solido, sin borde, con sombra, en vez del boton oscuro integrado en la barra superior.
- En pantallas angostas (`max-width:1100px`) se desactiva toda la animacion: el overlay vuelve a comportarse como un bloque normal (`position:relative`, sin transicion) que aparece debajo del tablero solo cuando esta abierto, igual que el comportamiento previo a este cambio, ya que ahi no existe una columna de detalle de ancho fijo con la que alinear la animacion.
- Probado visualmente: abrir (crece hacia la izquierda en ~0.9s), cerrar (se reduce de vuelta a la columna, sin dejar residuo), refresco de datos con el panel ya abierto (no reinicia la animacion, no hace flicker), y el caso movil (aparece como bloque simple, boton de cerrar bien ubicado). Sin errores de consola en ningun caso.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting y probar con datos reales, prestando atencion especial a la animacion en distintos anchos de pantalla y con el polling automatico de 30s activo mientras el pedido esta expandido.
- Sigue pendiente el resto de la lista previa (items 3, 5-15).

## 2026-09-17 (iteracion 1.6.0 - panel de supervisor: filtro de tienda, carga progresiva, bloquear cliente)

### Resumen de conversacion
- El usuario pidio trabajar el "panel del supervisor": basicamente el mismo panel, pero con pedidos de todas las tiendas y un filtro de tienda en el header, a la par de Delivery/Pickup.
- Anticipando que el supervisor puede ver muchos pedidos a la vez (todas las tiendas juntas), pidio que la carga no traiga todo de una vez sino progresivamente (ej. 10, luego 25, luego 50...) para que no se sature.
- Sugirio hacer una copia del plugin para el panel de supervisor, pero dejo la decision de arquitectura de mi lado.
- Pidio agregar un boton "Bloquear al cliente" en las acciones del pedido, que agregue un meta al usuario, usando como referencia el plugin "User Blocker" (https://wordpress.org/plugins/user-blocker/) que ya usa el sitio.

### Decision de arquitectura
- Se opto por NO duplicar el plugin. El backend (`includes/rest.php`) ya distinguia claramente supervisor vs. tienda por permisos desde el diseño original (`is_supervisor_user()`, `get_accessible_store_ids()` ya devuelve todas las tiendas para el supervisor). Duplicar el plugin hubiera significado mantener dos copias sincronizadas para cada ajuste de diseno futuro (y ya llevamos muchas iteraciones de diseno). Se extendio el mismo codigo con logica condicionada por rol/cantidad de tiendas en vez de bifurcar el proyecto.

### Investigacion previa (plugin User Blocker)
- Se reviso el codigo fuente del plugin (via SVN de wordpress.org, `plugins.svn.wordpress.org/user-blocker/trunk/`) para saber exactamente como bloquea a un usuario, en vez de adivinar el nombre de un meta. Hallazgo: el filtro `authenticate` (`ublk_auth_signon` en `user_blocker.php`) deniega el login si el user meta `is_active` es exactamente `'n'`. Para desbloquear, el propio plugin borra ese meta (`delete_user_meta`). No hace falta llamar ninguna funcion del plugin, solo escribir/borrar ese meta con esa convencion -- el plugin solo necesita estar activo en el sitio para que el bloqueo tenga efecto real al iniciar sesion.

### Cambios realizados
- Version actualizada a 1.6.0.
- `includes/rest.php`:
  - `/panel` ahora acepta `page` y `per_page` opcionales. El conteo por columna (`counts`) se calcula sobre TODOS los pedidos elegibles del usuario, pero la hidratacion cara (items + meta formateada via `get_order_items_payload()`) solo se hace para los pedidos que caen dentro de la pagina pedida (`$eligible_index >= $offset && < $offset + $per_page`). La respuesta ahora incluye `pagination: { page, per_page, total, has_more }`.
  - Cada pedido en el payload ahora incluye `customer_id` (`$order->get_customer_id()`) y `customer_blocked` (`get_user_meta($customer_id, 'is_active', true) === 'n'`).
  - Nuevo endpoint `POST /pedido/{id}/cliente-bloqueo` (`toggle_customer_block`): solo permitido para supervisores (`is_supervisor_user`); si el pedido es de un cliente invitado (`customer_id` 0) devuelve error 400; si no, hace `update_user_meta($customer_id, 'is_active', 'n')` (+ `block_msg_permenant`) para bloquear, o `delete_user_meta($customer_id, 'is_active')` para desbloquear.
- `assets/js/panel.js`:
  - Nuevo filtro de tienda (`renderStoreFilter()`, `state.storeFilter`) junto a los tabs de Delivery/Pickup dentro de un nuevo wrapper `.dlp2-header-center` (para que ambos controles queden juntos y no los separe el `justify-content:space-between` del header). Solo se pinta si `state.stores.length > 1`. `filteredOrders()` ahora filtra por tipo Y tienda a la vez.
  - `loadPanel(pageSize)` implementa la carga progresiva: arranca en `PAGE_SIZE_STEPS = [10, 25, 50, 100, 200, 330]`, y si `pagination.has_more` es true en la respuesta, se vuelve a llamar a si misma con el siguiente tamano de la lista, sin esperar al proximo refresco automatico de 30s. El refresco periodico (`setInterval`) reutiliza el ultimo tamano ya conocido (`state.currentPageSize`) en vez de reiniciar la rampa desde 10 cada vez.
  - Se corrigieron 5 sitios que hacian `.then(loadPanel)` (reasignar tienda, cancelar, prioridad, guardar nota, avanzar estado): al no envolverlos en una funcion, el objeto de respuesta de la API previa se pasaba sin querer como `pageSize` a `loadPanel`, lo que hubiera roto la URL de la siguiente carga.
  - Nuevo boton "Bloquear Cliente" / "Desbloquear Cliente" (`renderBlockCustomerButton()`), agregado tanto en la seccion "Gestion de Tienda y Supervisor" del detalle normal como en la tarjeta "Acciones" de la vista expandida. Solo se muestra si `state.scope === 'supervisor'`. Si el pedido no tiene cuenta de cliente asociada, el boton aparece deshabilitado con un tooltip explicando por que. Al hacer click pide confirmacion (`confirm()`) antes de llamar al endpoint, dado que es una accion sensible (afecta el login del cliente en todo el sitio, no solo este pedido).
- `assets/css/panel.css`: `.dlp2-header-center`, `.dlp2-store-filter` (select con el mismo lenguaje visual que los tabs), `.dlp2-toggle-btn:disabled` (atenuado, cursor not-allowed) y `.dlp2-toggle-btn.dlp2-block-btn-active` (resaltado en rojo cuando el cliente ya esta bloqueado).
- Probado visualmente con un dataset simulado de 37 pedidos elegibles en 3 tiendas: la carga escalo exactamente 10 -> 25 -> 50 (confirmado via los logs de las llamadas simuladas) y se detuvo al cubrir el total; el filtro de tienda oculta correctamente los pedidos de otras tiendas; el boton de bloqueo aparece habilitado para pedidos con cuenta, deshabilitado para invitados, en rojo cuando ya esta bloqueado, y desaparece por completo cuando `scope` no es `supervisor`. Sin errores de consola.

### Archivos tocados
- dlp-paneles.php
- README.md
- MEMORIA_TRABAJO.md
- includes/rest.php
- assets/js/panel.js
- assets/css/panel.css

### Estado
- Listo para subir al hosting. Pendiente de validar en el sitio real: que el plugin User Blocker este activo para que el bloqueo tenga efecto real al iniciar sesion, y probar con un pedido de un cliente invitado real para confirmar el mensaje de "sin cuenta".
- Sigue pendiente el resto de la lista previa (items 3, 5-15).
