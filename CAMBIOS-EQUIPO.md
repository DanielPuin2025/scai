# SCAI — Pie de página y equipo de desarrollo

## Archivos modificados
- `src/routes/index.tsx`: pie de página único, debajo del contenido y alineado a la derecha; conserva el logotipo y los accesos existentes.
- `src/styles.css`: estilos aislados del pie y la ventana, tonos azules, detalles dorados, animación y adaptación móvil.
- `src/routes/coordinador.tsx`: metadatos sociales completos; sin cambios en el comportamiento del panel.
- `AGENTS.md`: regla de aislamiento de la ventana.
- `roadmap.md`: tareas de esta entrega.

## Archivos añadidos
- `src/components/scai/EquipoDesarrollo.tsx`: botón Ver, ventana accesible, X, cierre con Escape y devolución del foco.
- `src/assets/equipo/ingrid.png` y `sharik.png`: recortes de los píxeles originales de la referencia, sin retoque ni generación; se incluyen localmente para cargar al desplegar.
- Este documento.

## Verificación
- Compilación completa terminada sin errores; las dependencias emiten avisos habituales de empaquetado.
- Prueba sobre la copia compilada en computador (1280 × 1000) y celular (390 × 844): pie único, apertura con Ver, cierre con X y Escape, fotos cargadas, nombres y cargos correctos, sin desplazamiento horizontal ni errores de JavaScript.
- Ingrid a la izquierda y Sharik a la derecha; en celular aparecen en ese mismo orden, verticalmente.
- Cerrar la ventana conserva la dirección y el almacenamiento local. No se cambió la lógica de sesión, permisos, roles, funciones de servidor ni base de datos.
- No se realizaron pruebas con sesiones de los distintos roles: su funcionamiento autenticado no está verificado. La prueba se hizo sobre la pantalla principal real, sin datos ficticios.

## Uso
Conserva tu archivo `.env` y configuración privada actuales. Por seguridad, el ZIP entregado no incluye `.env`, dependencias, metadatos Git ni archivos compilados. No se añadieron dependencias. Se conservaron los archivos de bloqueo originales.
La aplicación abierta en Lovable no fue sustituida: esta entrega actualiza el ZIP, según la opción elegida.
