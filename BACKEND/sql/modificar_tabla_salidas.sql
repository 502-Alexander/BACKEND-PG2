-- ========================================
-- MODIFICAR ESTRUCTURA DE TABLA SALIDAS
-- ========================================
USE inventario;

-- 0. Verificar las restricciones existentes
-- SELECT CONSTRAINT_NAME 
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_NAME = 'salidas' AND TABLE_SCHEMA = 'inventario';

-- 1. Eliminar restricciones de clave foránea si existen
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = 'salidas' 
    AND COLUMN_NAME = 'id_producto' 
    AND TABLE_SCHEMA = 'inventario'
    AND CONSTRAINT_NAME != 'PRIMARY'
    LIMIT 1
);

SET @sql = IF(@constraint_name IS NOT NULL, 
    CONCAT('ALTER TABLE salidas DROP FOREIGN KEY ', @constraint_name), 
    'SELECT "No hay constraint para id_producto"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Eliminar la columna total primero (porque es calculada)
ALTER TABLE salidas
DROP COLUMN total;

-- 3. Ahora eliminar las columnas que no necesitamos
ALTER TABLE salidas
DROP COLUMN id_producto,
DROP COLUMN cantidad,
DROP COLUMN precio_unitario;

-- 4. Agregar columnas para total, efectivo y cambio (ahora como campos normales)
ALTER TABLE salidas
ADD COLUMN total DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN efectivo DECIMAL(10,2) DEFAULT 0,
ADD COLUMN cambio DECIMAL(10,2) DEFAULT 0;

-- ========================================
-- CREAR TABLA DETALLE_SALIDAS
-- ========================================
CREATE TABLE IF NOT EXISTS detalle_salidas (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_salida INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_salida) REFERENCES salidas(id_salida) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- ========================================
-- TRIGGER PARA ACTUALIZAR STOCK EN VENTAS
-- ========================================
DELIMITER $$

DROP TRIGGER IF EXISTS actualizar_stock_venta$$

CREATE TRIGGER actualizar_stock_venta
AFTER INSERT ON detalle_salidas
FOR EACH ROW
BEGIN
  DECLARE nuevo_stock INT;
  DECLARE nombre_cajero_var VARCHAR(100);

  -- Obtener el stock actual antes de la salida
  SELECT stock_actual INTO nuevo_stock 
  FROM productos 
  WHERE id_producto = NEW.id_producto;

  -- Obtener el nombre del cajero
  SELECT u.nombre_usuario INTO nombre_cajero_var
  FROM salidas s
  JOIN usuarios u ON s.id_usuario = u.id_usuario
  WHERE s.id_salida = NEW.id_salida;

  -- Actualizar el stock en productos
  UPDATE productos
  SET stock_actual = stock_actual - NEW.cantidad
  WHERE id_producto = NEW.id_producto;

  -- Registrar el movimiento
  INSERT INTO movimientos (
    id_producto, 
    tipo_movimiento, 
    origen_movimiento, 
    cantidad, 
    stock_resultante,
    id_usuario,
    nombre_usuario
  )
  SELECT 
    NEW.id_producto, 
    'SALIDA',
    'SALIDA',
    NEW.cantidad, 
    nuevo_stock - NEW.cantidad,
    s.id_usuario,
    nombre_cajero_var
  FROM salidas s
  WHERE s.id_salida = NEW.id_salida;
END$$

DELIMITER ;

-- ========================================
-- VERIFICAR ESTRUCTURA
-- ========================================
DESCRIBE salidas;
DESCRIBE detalle_salidas;
