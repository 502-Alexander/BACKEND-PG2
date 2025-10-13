-- ========================================
-- REVERTIR TODOS LOS CAMBIOS EN SALIDAS
-- ========================================
USE inventario;

-- 1. Eliminar el trigger si existe
DROP TRIGGER IF EXISTS actualizar_stock_venta;

-- 2. Eliminar la tabla detalle_salidas si existe
DROP TABLE IF EXISTS detalle_salidas;

-- 3. Eliminar las columnas nuevas de salidas (si existen)
-- Verificar primero qué columnas tiene la tabla
SHOW COLUMNS FROM salidas;

-- Eliminar columnas agregadas (efectivo, cambio)
SET @col_efectivo = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'inventario' AND TABLE_NAME = 'salidas' AND COLUMN_NAME = 'efectivo');
SET @sql_efectivo = IF(@col_efectivo > 0, 'ALTER TABLE salidas DROP COLUMN efectivo', 'SELECT "efectivo no existe"');
PREPARE stmt FROM @sql_efectivo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_cambio = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'inventario' AND TABLE_NAME = 'salidas' AND COLUMN_NAME = 'cambio');
SET @sql_cambio = IF(@col_cambio > 0, 'ALTER TABLE salidas DROP COLUMN cambio', 'SELECT "cambio no existe"');
PREPARE stmt FROM @sql_cambio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Recrear la tabla salidas con su estructura original
DROP TABLE IF EXISTS salidas;

CREATE TABLE salidas (
    id_salida INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_usuario INT,
    nombre_cajero VARCHAR(100),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Verificar la estructura
DESCRIBE salidas;

SELECT 'Tabla salidas restaurada a su estado original' AS Resultado;
