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
