-- ========================================
-- SCRIPT ALTERNATIVO - PASO A PASO
-- ========================================
USE inventario;

-- PASO 1: Ver las restricciones actuales
SHOW CREATE TABLE salidas;

-- PASO 2: Eliminar la constraint manualmente (reemplaza 'salidas_ibfk_1' con el nombre real)
ALTER TABLE salidas DROP FOREIGN KEY salidas_ibfk_1;

-- PASO 3: Eliminar la columna total (calculada)
ALTER TABLE salidas DROP COLUMN total;

-- PASO 4: Eliminar las otras columnas
ALTER TABLE salidas DROP COLUMN id_producto;
ALTER TABLE salidas DROP COLUMN cantidad;
ALTER TABLE salidas DROP COLUMN precio_unitario;

-- PASO 5: Agregar las nuevas columnas
ALTER TABLE salidas ADD COLUMN total DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE salidas ADD COLUMN efectivo DECIMAL(10,2) DEFAULT 0;
ALTER TABLE salidas ADD COLUMN cambio DECIMAL(10,2) DEFAULT 0;

-- PASO 6: Crear tabla detalle_salidas
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

-- PASO 7: Crear trigger
DELIMITER $$

DROP TRIGGER IF EXISTS actualizar_stock_venta$$

CREATE TRIGGER actualizar_stock_venta
AFTER INSERT ON detalle_salidas
FOR EACH ROW
BEGIN
  DECLARE nuevo_stock INT;
  DECLARE nombre_cajero_var VARCHAR(100);

  SELECT stock_actual INTO nuevo_stock 
  FROM productos 
  WHERE id_producto = NEW.id_producto;

  SELECT u.nombre_usuario INTO nombre_cajero_var
  FROM salidas s
  JOIN usuarios u ON s.id_usuario = u.id_usuario
  WHERE s.id_salida = NEW.id_salida;

  UPDATE productos
  SET stock_actual = stock_actual - NEW.cantidad
  WHERE id_producto = NEW.id_producto;

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

-- Verificar estructura final
DESCRIBE salidas;
DESCRIBE detalle_salidas;
