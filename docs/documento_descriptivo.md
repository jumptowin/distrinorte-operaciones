# Documento descriptivo: DistriNorte S.A.

## Contexto de la empresa

DistriNorte S.A. es un centro de distribución mayorista que abastece a almacenes, autoservicios y supermercados de Corrientes y Resistencia. Compra alimentos, bebidas y artículos de limpieza a proveedores de la región, los guarda en dos depósitos (Depósito Central en Corrientes y Depósito Norte en Resistencia), arma los pedidos de los comercios y los entrega con flota propia. Sus problemas logísticos son: quiebres de stock porque las compras se hacen tarde, falta de historial de qué entró y qué salió de cada ubicación, vehículos que salen con poca carga o con más peso del permitido, y desconocimiento de cuántas entregas se cumplen en la fecha prometida.

## Actores y roles

| Rol | Qué hace en la aplicación |
|---|---|
| Encargado de compras | Ve las alertas de reposición, emite órdenes de compra y las cancela. |
| Operario de depósito | Registra la recepción de mercadería, prepara pedidos (picking) y hace ajustes de inventario. |
| Administración de ventas | Carga los pedidos de los clientes con su fecha comprometida y puede cancelarlos. |
| Planificador de transporte | Arma hojas de ruta con vehículo, chofer y pedidos, y registra la salida y el cierre. |
| Chofer | Registra cada entrega (quién recibió) o el rechazo con su motivo. |
| Gerencia | Consulta el panel de indicadores y la ocupación de los depósitos. |

## Datos del negocio

- PROVEEDOR (cuit, razón social, teléfono, plazo de entrega en días). Provee muchos productos.
- PRODUCTO (sku, descripción, unidad de medida, peso unitario, stock mínimo, lote de reposición). Tiene un solo proveedor.
- DEPOSITO (código, nombre, dirección) y UBICACION (pasillo, estante, nivel, capacidad en unidades), que depende del depósito.
- STOCK: cantidad de cada producto en cada ubicación.
- CLIENTE (cuit, razón social, dirección de entrega, zona).
- PEDIDO (número, fecha, fecha comprometida, estado) con renglones (producto y cantidad).
- ORDEN_COMPRA (número, proveedor, fecha, estado, fecha de recepción) con renglones (producto y cantidad).
- MOVIMIENTO_STOCK (fecha y hora, tipo INGRESO, EGRESO o AJUSTE, producto, ubicación, cantidad, pedido u orden de compra de origen, observación).
- VEHICULO (patente, descripción, capacidad en kg, activo) y CHOFER (legajo, nombre, vencimiento de licencia).
- HOJA_RUTA (número, fecha, vehículo, chofer, estado, salida y regreso) que agrupa ENTREGAS (pedido, orden de visita, estado, fecha y hora, receptor, motivo de rechazo).

## Funciones logísticas

1. **Reposición por stock mínimo.** Suma el stock de cada producto en todas las ubicaciones y lo compara con su stock mínimo. Si está en el mínimo o por debajo y no hay una compra pendiente, sugiere una orden de compra por el lote de reposición al proveedor del producto. Datos: stock, producto, órdenes pendientes. Resultado: alerta y orden de compra.
2. **Recepción y trazabilidad de stock.** Toda entrada, salida o ajuste se registra como un movimiento con fecha, ubicación y origen (orden de compra o pedido). El stock se actualiza solo a partir de los movimientos. Datos: movimiento, ubicación, orden de compra. Resultado: stock al día e historial consultable.
3. **Preparación de pedidos (picking).** Para cada renglón del pedido el operario elige de qué ubicación retira; se genera un egreso por renglón y el pedido pasa a PREPARADO. Datos: pedido, stock por ubicación. Resultado: pedido listo para despachar o aviso de faltante.
4. **Planificación de rutas.** Se arma una hoja de ruta con un vehículo activo y un chofer con licencia vigente, se agregan pedidos preparados con su orden de visita y se controla que el peso total no supere la capacidad del vehículo. Datos: hoja de ruta, pedidos, pesos, vehículo. Resultado: carga y porcentaje de aprovechamiento del vehículo, y registro de cada entrega o rechazo.
5. **Indicadores de gestión.** Pedidos abiertos, porcentaje de entregas a tiempo (entregadas hasta la fecha comprometida), entregas rechazadas, productos a reponer, compras pendientes y ocupación de cada depósito. Resultado: panel para decidir compras, turnos de picking y uso de la flota.

## Reglas del negocio

- La cantidad en stock nunca es negativa y la suma de una ubicación no supera su capacidad.
- El stock solo cambia mediante movimientos; un egreso siempre indica el pedido y un ajuste siempre lleva observación.
- Una orden de compra solo incluye productos de su proveedor. RECIBIDA exige fecha de recepción.
- Estados del pedido: PENDIENTE, PREPARADO, DESPACHADO, ENTREGADO, RECHAZADO o CANCELADO. Solo se carga en una hoja de ruta un pedido PREPARADO y cada pedido va en una sola hoja.
- Estados de la hoja de ruta: PLANIFICADA, EN_CURSO (con hora de salida) y CERRADA (con hora de regreso). Un vehículo o chofer no puede tener dos hojas EN_CURSO.
- Una entrega ENTREGADA requiere receptor y una RECHAZADA requiere motivo.
- Desde la aplicación no se borra ningún registro y no se modifican pedidos, compras, hojas o entregas cerrados.

## Pantallas y reportes

- **Panel:** indicadores, ocupación por depósito, alertas de reposición y hojas de ruta abiertas.
- **Stock:** stock por producto con barra de nivel, filtro "a reponer" y ocupación de cada ubicación.
- **Compras:** sugerencias de reposición con botón para emitir la orden, lista de órdenes y registro de recepción eligiendo ubicación y cantidad recibida.
- **Pedidos:** alta de pedidos con varios renglones y fecha comprometida, preparación (picking) y cancelación.
- **Rutas:** alta de hojas de ruta, agregado de pedidos con control de capacidad, salida, registro de entrega o rechazo y cierre.
- **Movimientos:** historial de movimientos y alta de ajustes de inventario.
- **Flota:** vehículos activos o fuera de servicio y choferes con licencia vigente o vencida.

## Datos de ejemplo

3 proveedores, 6 productos (dos bajo el mínimo), 2 depósitos con 7 ubicaciones, 4 clientes de Corrientes, Resistencia e Ituzaingó, 4 pedidos (uno entregado, uno preparado y dos pendientes), 3 vehículos (uno fuera de servicio), 3 choferes (uno con licencia vencida), una hoja de ruta cerrada y una orden de compra pendiente. Todos los datos son ficticios.

## Requisitos técnicos

Aplicación web estática (HTML, CSS y JavaScript) que funcione primero en el celular y se adapte a la computadora, conectada a una base PostgreSQL en Supabase con la librería supabase-js y la clave pública (anon). La seguridad se resuelve con políticas RLS en la base. Debe poder publicarse en Vercel sin paso de compilación. La URL y la clave pública se configuran en config.js; ninguna clave secreta va en el código.
