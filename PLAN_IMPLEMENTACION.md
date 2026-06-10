# Plan De Implementacion - DLP Paneles

## Estado
- Proyecto nuevo en repo limpio: dlp-panel3
- Plugin: DLP Paneles
- Version actual: 1.1.1

## Politica de versionado acordada
- Publicaciones incrementales pequenas: 1.1.1, 1.1.2, 1.1.3
- Cambio mediano/importante: 1.2.0
- Cambio mayor o gran rediseno: 2.0.0

## Alcance operativo inicial
- Roles: supervisor y tienda
- Estados visibles: processing, dlv, rtp
- Acciones: cambiar estado, cancelar con motivo
- Refresco: 30 segundos

## Fases tecnicas
1. Fase 1 (actual): base funcional del plugin nuevo
   - Shortcode nuevo [dlp_paneles]
   - API REST propia
   - SPA liviano sin dependencias pesadas
2. Fase 1.1 (completada en 1.1.1)
   - Reasignacion de tienda
   - Notas internas y prioridad
3. Fase 2
   - Modal de cancelacion y UX de operacion mejorada
3. Fase 3
   - Wallboard operativo
   - Auditoria de cambios
   - Hardening de permisos

## Criterios de liviandad
- Evitar frameworks pesados si no son necesarios
- No incluir node_modules en el plugin
- Mantener assets JS/CSS pequenos
