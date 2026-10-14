-- DistriNorte S.A. - Datos ficticios (PARTE A, correr junta)
-- y pruebas de reglas (PARTE B, de a una: todas deben dar ERROR)
-- ---------- PARTE A ----------
INSERT INTO proveedor VALUES
 ('30711111119','Alimentos del Litoral S.A.','0379-4400001',3),
 ('30722222228','Bebidas NEA S.R.L.','0362-4400002',2),
 ('30733333337','Limpieza Total S.A.','0379-4400003',5);
INSERT INTO producto VALUES
 ('ALM-001','Yerba mate 1 kg x 10','CAJA',10.500,'30711111119',30,40),
 ('ALM-002','Arroz largo fino 1 kg x 10','CAJA',10.300,'30711111119',20,30),
 ('BEB-001','Agua mineral 2 L x 6','CAJA',12.400,'30722222228',30,40),
 ('BEB-002','Gaseosa cola 1,5 L x 6','CAJA',9.600,'30722222228',25,40),
 ('LIM-001','Lavandina 1 L x 12','CAJA',12.800,'30733333337',30,30),
 ('LIM-002','Detergente 750 ml x 12','CAJA',9.900,'30733333337',15,20);
INSERT INTO deposito VALUES
 ('D1','Depósito Central','Ruta 12 km 1030, Corrientes'),
 ('D2','Depósito Norte','Av. Sarmiento 2500, Resistencia');
INSERT INTO ubicacion VALUES
 ('D1','A',1,1,100), ('D1','A',1,2,100), ('D1','B',1,1,80), ('D1','B',2,1,80), ('D1','C',1,1,60),
 ('D2','A',1,1,60), ('D2','A',1,2,60);
-- Stock inicial: se carga con movimientos de INGRESO (así queda registrado de dónde vino)
INSERT INTO movimiento_stock (fecha_hora, tipo, sku, codigo_deposito, pasillo, estante, nivel, cantidad, observacion) VALUES
 ('2026-10-01 08:00-03','INGRESO','ALM-001','D1','A',1,1,60,'Stock inicial'),
 ('2026-10-01 08:00-03','INGRESO','ALM-002','D1','A',1,2,40,'Stock inicial'),
 ('2026-10-01 08:00-03','INGRESO','BEB-001','D1','B',1,1,70,'Stock inicial'),
 ('2026-10-01 08:00-03','INGRESO','BEB-002','D1','B',2,1,50,'Stock inicial'),
 ('2026-10-01 08:00-03','INGRESO','LIM-001','D2','A',1,1,30,'Stock inicial'),
 ('2026-10-01 08:00-03','INGRESO','LIM-002','D2','A',1,2,12,'Stock inicial'),
 ('2026-10-01 08:00-03','INGRESO','ALM-001','D2','A',1,1,20,'Stock inicial');
INSERT INTO cliente VALUES
 ('30744444446','Supermercado San Martín','Junín 1200, Corrientes','Corrientes Centro'),
 ('30755555555','Autoservicio La Esquina','Av. 9 de Julio 800, Resistencia','Resistencia'),
 ('20123456786','Almacén Don Pedro','Belgrano 455, Ituzaingó','Ituzaingó'),
 ('30766666664','Mayorista El Puerto','Av. Costanera 50, Corrientes','Corrientes Centro');
INSERT INTO pedido (cuit_cliente, fecha, fecha_compromiso) VALUES
 ('30744444446','2026-10-12','2026-10-13'),  -- 1 se entrega
 ('30755555555','2026-10-13','2026-10-15'),  -- 2 queda PREPARADO
 ('20123456786','2026-10-13','2026-10-16'),  -- 3 queda PENDIENTE
 ('30766666664','2026-10-13','2026-10-15');  -- 4 queda PENDIENTE
INSERT INTO detalle_pedido VALUES
 (1,'ALM-001',10), (1,'BEB-001',8), (2,'BEB-002',12), (2,'LIM-001',5),
 (3,'ALM-002',6), (4,'ALM-001',20), (4,'BEB-001',15), (4,'LIM-002',4);
-- Preparación (picking) de los pedidos 1 y 2: egresos desde las ubicaciones
INSERT INTO movimiento_stock (fecha_hora, tipo, sku, codigo_deposito, pasillo, estante, nivel, cantidad, nro_pedido) VALUES
 ('2026-10-12 15:00-03','EGRESO','ALM-001','D1','A',1,1,10,1),
 ('2026-10-12 15:00-03','EGRESO','BEB-001','D1','B',1,1,8,1),
 ('2026-10-13 09:00-03','EGRESO','BEB-002','D1','B',2,1,12,2),
 ('2026-10-13 09:00-03','EGRESO','LIM-001','D2','A',1,1,5,2);
UPDATE pedido SET estado = 'PREPARADO' WHERE nro_pedido IN (1,2);
INSERT INTO vehiculo VALUES
 ('AE123BC','Utilitario Fiorino',650,true), ('AD456FG','Camión liviano 3,5 t',3500,true), ('AB789CD','Furgón Sprinter',1500,false);
INSERT INTO chofer VALUES
 (1001,'Ramiro Ficticio','2028-05-31'), (1002,'Lucía Inventada','2027-11-30'), (1003,'Hugo Ejemplo','2025-01-31');
-- Hoja de ruta 1: sale con el pedido 1 y se cierra
INSERT INTO hoja_ruta (fecha, patente, legajo_chofer) VALUES ('2026-10-13','AD456FG',1001);
INSERT INTO entrega (nro_pedido, id_hoja, orden_visita) VALUES (1,1,1);
UPDATE hoja_ruta SET estado = 'EN_CURSO', fecha_hora_salida = '2026-10-13 08:30-03' WHERE id_hoja = 1;
UPDATE pedido SET estado = 'DESPACHADO' WHERE nro_pedido = 1;
UPDATE entrega SET estado = 'ENTREGADA', fecha_hora_entrega = '2026-10-13 10:05-03', receptor = 'María Recepción' WHERE id_entrega = 1;
UPDATE pedido SET estado = 'ENTREGADO' WHERE nro_pedido = 1;
UPDATE hoja_ruta SET estado = 'CERRADA', fecha_hora_regreso = '2026-10-13 12:40-03' WHERE id_hoja = 1;
-- Orden de compra pendiente para reponer lavandina (quedó bajo el mínimo)
INSERT INTO orden_compra (cuit_proveedor, fecha) VALUES ('30733333337','2026-10-13');
INSERT INTO detalle_orden_compra VALUES (1,'LIM-001',30);

-- Consultas de control
SELECT sku, descripcion, unidades, stock_minimo, a_reponer, compra_en_curso FROM v_stock_producto ORDER BY sku;
SELECT * FROM v_ocupacion_deposito ORDER BY codigo;
SELECT id_hoja, estado, entregas, carga_kg, pct_carga FROM v_hojas_ruta;
SELECT * FROM v_indicadores;

-- ---------- PARTE B: deben dar ERROR ----------
-- B1 egreso mayor que el stock de la ubicación (ALM-002 tiene 40 en D1-A-1-2)
INSERT INTO movimiento_stock (tipo, sku, codigo_deposito, pasillo, estante, nivel, cantidad, nro_pedido) VALUES ('EGRESO','ALM-002','D1','A',1,2,50,3);
-- B2 ingreso que supera la capacidad de la ubicación (D1-C-1-1 admite 60)
INSERT INTO movimiento_stock (tipo, sku, codigo_deposito, pasillo, estante, nivel, cantidad, observacion) VALUES ('INGRESO','LIM-002','D1','C',1,1,70,'Prueba');
-- B3 orden de compra con un producto de otro proveedor
INSERT INTO detalle_orden_compra VALUES (1,'BEB-001',10);
-- B4 hoja de ruta con chofer de licencia vencida
INSERT INTO hoja_ruta (fecha, patente, legajo_chofer) VALUES ('2026-10-14','AE123BC',1003);
-- B5 hoja de ruta con un vehículo inactivo
INSERT INTO hoja_ruta (fecha, patente, legajo_chofer) VALUES ('2026-10-14','AB789CD',1002);
-- B6 cargar en una hoja un pedido que no está PREPARADO (correr las dos líneas juntas)
INSERT INTO hoja_ruta (fecha, patente, legajo_chofer) VALUES ('2026-10-14','AE123BC',1002); INSERT INTO entrega (nro_pedido, id_hoja, orden_visita) VALUES (3,(SELECT max(id_hoja) FROM hoja_ruta),1);
-- B7 superar la capacidad del vehículo: el pedido 2 pesa 179,2 kg (correr las tres líneas juntas)
UPDATE vehiculo SET capacidad_kg = 100 WHERE patente = 'AE123BC'; INSERT INTO hoja_ruta (fecha, patente, legajo_chofer) VALUES ('2026-10-14','AE123BC',1002); INSERT INTO entrega (nro_pedido, id_hoja, orden_visita) VALUES (2,(SELECT max(id_hoja) FROM hoja_ruta),1);
-- B8 entrega rechazada sin motivo
UPDATE entrega SET estado = 'RECHAZADA', receptor = NULL WHERE id_entrega = 1;
-- B9 ajuste de stock sin observación
INSERT INTO movimiento_stock (tipo, sku, codigo_deposito, pasillo, estante, nivel, cantidad) VALUES ('AJUSTE','ALM-001','D1','A',1,1,-2);
