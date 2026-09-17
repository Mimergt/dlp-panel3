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
