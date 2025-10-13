const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD'); // ← conexión a la base de datos

//Se MODIFICO Domingo 10-05-2025
// ========================================
// 🟢 Ruta GET - Listar todos los productos
// ========================================
router.get('/', (req, res) => {
  const sql = `
    SELECT p.*, c.nombre_categoria 
    FROM productos p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    ORDER BY p.id_producto DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
  });
});

// ==================================================
// 🟢 Ruta POST - Agregar producto (con verificación)
// ==================================================
router.post('/', (req, res) => {
  const { codigo_barras, nombre_producto, id_categoria, id_proveedor, precio_compra, precio_venta, stock_actual, stock_minimo, stock_maximo, creado_por, nombre_creador } = req.body;

  // Validar campos obligatorios
  if (!codigo_barras || !nombre_producto || !id_categoria || !precio_compra || !precio_venta) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  // 1️⃣ Verificar si ya existe el producto
  const verificarSql = 'SELECT id_producto, codigo_barras, nombre_producto FROM productos WHERE codigo_barras = ?';

  db.query(verificarSql, [codigo_barras], (err, results) => {
    if (err) {
      console.error('Error al verificar producto:', err);
      return res.status(500).json({ error: 'Error al verificar producto en la base de datos' });
    }

    console.log(`🔍 Verificando código de barras: ${codigo_barras}`);
    console.log(`📊 Resultados encontrados: ${results.length}`);
    if (results.length > 0) {
      console.log(`⚠️ Producto existente:`, results[0]);
    }

    if (results.length > 0) {
      // 2️⃣ Producto duplicado → no insertar
      return res.status(409).json({ 
        error: 'El producto con este código de barras ya existe',
        producto_existente: results[0]
      });
    }

    // 3️⃣ Si no existe, insertar normalmente
    const insertarSql = `
      INSERT INTO productos 
      (codigo_barras, nombre_producto, id_categoria, id_proveedor, precio_compra, precio_venta, stock_actual, stock_minimo, stock_maximo, creado_por, nombre_creador)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertarSql, [
      codigo_barras,
      nombre_producto,
      id_categoria,
      id_proveedor || null,
      precio_compra,
      precio_venta,
      stock_actual || 0,
      stock_minimo || 0,
      stock_maximo || 0,
      creado_por || null,
      nombre_creador || null
    ], (err, result) => {
      if (err) {
        console.error('Error al insertar producto:', err);
        return res.status(500).json({ error: 'Error al insertar producto' });
      }

      res.status(201).json({
        mensaje: 'Producto agregado correctamente',
        id: result.insertId
      });
    });
  });
});

// ======================================================
// 🟡 Ruta GET - Buscar producto por código de barras
// ======================================================
router.get('/buscar/:codigo_barras', (req, res) => {
  const { codigo_barras } = req.params;

  const sql = 'SELECT * FROM productos WHERE codigo_barras = ?';

  db.query(sql, [codigo_barras], (err, results) => {
    if (err) {
      console.error('Error al buscar producto:', err);
      return res.status(500).json({ error: 'Error al buscar producto' });
    }

    if (results.length === 0) {
      return res.status(404).json({
        mensaje: 'Producto no encontrado',
        codigo_barras: codigo_barras,
        encontrado: false
      });
    }

    res.json({
      mensaje: 'Producto encontrado',
      producto: results[0],
      encontrado: true
    });
  });
});

// ======================================================
// 🟣 Ruta POST - Recepción desde Barcode to PC
// ======================================================
router.post('/barcode-scan', (req, res) => {
  console.log('📱 Datos recibidos de Barcode to PC:', req.body);

  const {
    barcode,
    device_name,
    scan_session,
    timestamp,
    session_name
  } = req.body;

  if (!barcode) {
    return res.status(400).json({
      error: 'Código de barras requerido',
      success: false
    });
  }

  const buscarSql = 'SELECT * FROM productos WHERE codigo_barras = ?';

  db.query(buscarSql, [barcode], (err, results) => {
    if (err) {
      console.error('Error al buscar producto:', err);
      return res.status(500).json({
        error: 'Error al buscar producto',
        success: false
      });
    }

    if (results.length > 0) {
      const producto = results[0];
      console.log('✅ Producto encontrado:', producto.nombre_producto);

      res.json({
        success: true,
        mensaje: 'Producto encontrado',
        producto: {
          id: producto.id_producto,
          codigo_barras: producto.codigo_barras,
          nombre: producto.nombre_producto,
          precio_venta: producto.precio_venta,
          stock_actual: producto.stock_actual
        },
        accion: 'encontrado',
        metadata: {
          device_name,
          scan_session,
          session_name,
          timestamp: timestamp || new Date().toISOString()
        }
      });
    } else {
      console.log('❌ Producto no encontrado:', barcode);

      res.json({
        success: true,
        mensaje: 'Producto no encontrado - requiere registro manual',
        codigo_barras: barcode,
        accion: 'registro_requerido',
        metadata: {
          device_name,
          scan_session,
          session_name,
          timestamp: timestamp || new Date().toISOString()
        }
      });
    }
  });
});

// ==================================================================
// 🔵 Ruta POST - Registrar producto desde escaneo (datos mínimos)
// ==================================================================
router.post('/registrar-desde-barcode', (req, res) => {
  const {
    codigo_barras,
    nombre_producto,
    id_categoria = 1, // Categoría por defecto
    precio_compra = 0,
    precio_venta = 0,
    stock_actual = 1,
    device_name,
    scan_session
  } = req.body;

  if (!codigo_barras || !nombre_producto) {
    return res.status(400).json({
      error: 'Código de barras y nombre del producto son obligatorios',
      success: false
    });
  }

  const verificarSql = 'SELECT id_producto FROM productos WHERE codigo_barras = ?';

  db.query(verificarSql, [codigo_barras], (err, results) => {
    if (err) {
      console.error('Error al verificar producto:', err);
      return res.status(500).json({
        error: 'Error al verificar producto',
        success: false
      });
    }

    if (results.length > 0) {
      return res.status(409).json({
        error: 'El producto con este código de barras ya existe',
        success: false
      });
    }

    const insertarSql = `
      INSERT INTO productos 
      (codigo_barras, nombre_producto, id_categoria, precio_compra, precio_venta, stock_actual)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertarSql, [
      codigo_barras,
      nombre_producto,
      id_categoria,
      precio_compra,
      precio_venta,
      stock_actual
    ], (err, result) => {
      if (err) {
        console.error('Error al insertar producto:', err);
        return res.status(500).json({
          error: 'Error al registrar producto',
          success: false
        });
      }

      console.log('✅ Producto registrado desde código de barras:', nombre_producto);

      res.status(201).json({
        mensaje: 'Producto registrado correctamente',
        producto: {
          id: result.insertId,
          codigo_barras,
          nombre_producto,
          id_categoria,
          precio_compra,
          precio_venta,
          stock_actual
        },
        success: true,
        metadata: {
          device_name,
          scan_session,
          timestamp: new Date().toISOString()
        }
      });
    });
  });
});


// ======================================================
// 🔴 Ruta DELETE - Eliminar producto y sus registros relacionados
// ======================================================
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // 1️⃣ Eliminar detalles de salidas (ventas) relacionados
  db.query('DELETE FROM detalle_salidas WHERE id_producto = ?', [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar detalle_salidas:', err);
      return res.status(500).json({ error: 'Error al eliminar detalle de salidas' });
    }

    console.log(`✅ Eliminados ${result.affectedRows} registros de detalle_salidas`);

    // 2️⃣ Eliminar movimientos relacionados
    db.query('DELETE FROM movimientos WHERE id_producto = ?', [id], (err, result) => {
      if (err) {
        console.error('Error al eliminar movimientos:', err);
        return res.status(500).json({ error: 'Error al eliminar movimientos' });
      }

      console.log(`✅ Eliminados ${result.affectedRows} registros de movimientos`);

      // 3️⃣ Eliminar entradas relacionadas
      db.query('DELETE FROM entradas WHERE id_producto = ?', [id], (err, result) => {
        if (err) {
          console.error('Error al eliminar entradas:', err);
          return res.status(500).json({ error: 'Error al eliminar entradas' });
        }

        console.log(`✅ Eliminados ${result.affectedRows} registros de entradas`);

        // 4️⃣ Eliminar producto
        db.query('DELETE FROM productos WHERE id_producto = ?', [id], (err, result) => {
          if (err) {
            console.error('Error al eliminar producto:', err);
            return res.status(500).json({ error: 'Error al eliminar producto' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
          }

          console.log(`✅ Producto ${id} eliminado correctamente`);
          res.json({ 
            mensaje: 'Producto eliminado correctamente',
            detalles: 'Se eliminaron todos los registros relacionados (ventas, movimientos, entradas)'
          });
        });
      });
    });
  });
});


// ======================================================
// 🔵 Ruta PUT - Actualizar producto existente
// ======================================================
router.put('/:id_producto', (req, res) => {
  const { id_producto } = req.params;
  const {
    codigo_barras,
    nombre_producto,
    id_categoria,
    id_proveedor,
    precio_compra,
    precio_venta,
    stock_actual,
    stock_minimo,
    stock_maximo
  } = req.body;

  // Validar campos obligatorios
  if (!codigo_barras || !nombre_producto || !id_categoria || !precio_compra || !precio_venta) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  // ✅ Verificar si el código de barras ya pertenece a otro producto
  const verificarDuplicado = `
    SELECT id_producto FROM productos
    WHERE codigo_barras = ? AND id_producto <> ?
  `;

  db.query(verificarDuplicado, [codigo_barras, id_producto], (err, results) => {
    if (err) {
      console.error('Error al verificar duplicado:', err);
      return res.status(500).json({ error: 'Error al verificar duplicado' });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'El código de barras ya pertenece a otro producto' });
    }

    // ✅ Actualizar producto si no hay duplicado
    const sql = `
      UPDATE productos
      SET codigo_barras = ?, nombre_producto = ?, id_categoria = ?, id_proveedor = ?,
          precio_compra = ?, precio_venta = ?, stock_actual = ?,
          stock_minimo = ?, stock_maximo = ?
      WHERE id_producto = ?
    `;

    db.query(sql, [
      codigo_barras,
      nombre_producto,
      id_categoria,
      id_proveedor || null,
      precio_compra,
      precio_venta,
      stock_actual,
      stock_minimo || 0,
      stock_maximo || 0,
      id_producto
    ], (err, result) => {
      if (err) {
        console.error('Error al actualizar producto:', err);
        return res.status(500).json({ error: 'Error al actualizar producto' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({ mensaje: 'Producto actualizado correctamente' });
    });
  });
});


// ======================================================
// 🔴 Ruta POST - Eliminar movimientos por fecha o meses
// ======================================================
router.post('/eliminar-movimientos', (req, res) => {
  const { mesesConservar, fechaInicio, fechaFin } = req.body;

  let sql = 'DELETE FROM entradas WHERE 1=1';
  const params = [];

  // Si se especifican meses a conservar
  if (mesesConservar) {
    sql += ' AND fecha < DATE_SUB(NOW(), INTERVAL ? MONTH)';
    params.push(mesesConservar);
  }

  // Si se especifica un rango de fechas
  if (fechaInicio && fechaFin) {
    sql += ' AND fecha BETWEEN ? AND ?';
    params.push(fechaInicio, fechaFin);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al eliminar movimientos:', err);
      return res.status(500).json({ error: 'Error al eliminar movimientos' });
    }

    res.json({
      mensaje: 'Movimientos eliminados correctamente',
      eliminados: result.affectedRows
    });
  });
});

// ======================================================
// 🟢 Ruta GET - Buscar producto por código de barras
// ======================================================
router.get('/buscar/:codigo', (req, res) => {
  const { codigo } = req.params;

  const sql = 'SELECT id_producto, codigo_barras, nombre_producto FROM productos WHERE codigo_barras = ?';

  db.query(sql, [codigo], (err, results) => {
    if (err) {
      console.error('Error al buscar producto:', err);
      return res.status(500).json({ error: 'Error al buscar producto' });
    }

    if (results.length > 0) {
      // Producto encontrado
      res.json({
        encontrado: true,
        producto: results[0]
      });
    } else {
      // Producto no encontrado
      res.json({
        encontrado: false
      });
    }
  });
});

module.exports = router;
