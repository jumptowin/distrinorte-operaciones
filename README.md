# DistriNorte · Operaciones

Aplicación web del centro de distribución de DistriNorte S.A. (Corrientes y Resistencia). Gestiona stock por ubicación, compras a proveedores, pedidos de clientes, hojas de ruta e indicadores. Funciona primero en el celular y se adapta a la computadora.

Demo: https://distrinorte-operaciones.vercel.app

## Funciones logísticas

| Función | Qué hace |
|---|---|
| Reposición por stock mínimo | Detecta productos en o bajo el mínimo y emite la orden de compra por el lote de reposición. |
| Recepción y trazabilidad | Registra ingresos, egresos y ajustes por ubicación; el stock se actualiza solo con movimientos. |
| Preparación de pedidos | Picking por ubicación con egreso automático y cambio de estado a PREPARADO. |
| Planificación de rutas | Hojas de ruta con vehículo activo, chofer con licencia vigente y control de peso; registro de entrega o rechazo. |
| Indicadores | Pedidos abiertos, entregas a tiempo, rechazos, productos a reponer, compras pendientes y ocupación de depósitos. |

## Estructura

```
index.html, styles.css, app.js   Aplicación (HTML, CSS y JavaScript, sin compilación)
config.js                        URL y clave pública de Supabase
docs/documento_descriptivo.md    Descripción del negocio
docs/diagramas/                  MER y modelo relacional (draw.io y PNG)
docs/sql/                        Creación de la base, datos de ejemplo y pruebas, seguridad RLS
```

## Base de datos (Supabase)

En el SQL Editor del proyecto, ejecutar en orden:

1. `docs/sql/01_crear_base.sql`
2. `docs/sql/02_datos_y_pruebas.sql` (solo la Parte A; las pruebas de la Parte B se corren de a una y deben dar error)
3. `docs/sql/03_seguridad_rls.sql`

## Variables de entorno

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | URL del proyecto (Project Settings > API) |
| `SUPABASE_ANON_KEY` | Clave pública anon / publishable |

Copiar `.env.example` como `.env` para guardar los valores localmente; `.env` no se sube (está en `.gitignore`). Como la aplicación es estática, los mismos valores se cargan en `config.js`. Solo va la clave pública: los permisos los controlan las políticas RLS. Nunca usar la clave secreta (service_role) en el código.

## Publicar en Vercel

1. Importar el repositorio en Vercel (Add New > Project).
2. Framework: Other. Sin comando de compilación; directorio de salida: raíz.
3. Deploy.

## Ejecutar localmente

Servir la carpeta con cualquier servidor estático, por ejemplo `npx serve .`, y abrir la dirección que indica.

Todos los datos de ejemplo son ficticios.
