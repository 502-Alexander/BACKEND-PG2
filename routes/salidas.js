const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD'); // Conexión a la base de datos

// ==================================================
// 🟢 GET - Listar todas las salidas
// ==================================================
router.get('/', (req, res) => {
  const sql = `
    SELECT s.id_salida, s.id_producto, p.nombre_producto, 
           s.id_usuario, s.nombre_cajero, s.fecha, 
           s.cantidad, s.precio_unitario, s.total
    FROM salidas s
    INNER JOIN productos p ON s.id_producto = p.id_producto
    ORDER BY s.fecha DESC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener salidas:', err);
      return res.status(500).json({ error: 'Error al obtener salidas' });
    }
    res.json(results);
  });
});

// ==================================================
// 🟢 POST - Registrar nueva salida
// ==================================================
router.post('/', (req, res) => {
  const { id_producto, id_usuario, nombre_cajero, cantidad, precio_unitario } = req.body;

  // ✅ Validar campos obligatorios
  if (!id_producto || !id_usuario || !cantidad || !precio_unitario) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  // Verificar si el producto existe
  db.query('SELECT id_producto, stock_actual FROM productos WHERE id_producto = ?', [id_producto], (err, results) => {
    if (err) {
      console.error('Error al verificar producto:', err);
      return res.status(500).json({ error: 'Error al verificar producto' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const stockActual = results[0].stock_actual;

    // Verificar stock disponible
    if (stockActual < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente para realizar la salida' });
    }

    // Registrar la salida
    const sqlInsert = `
      INSERT INTO salidas (id_producto, id_usuario, nombre_cajero, cantidad, precio_unitario)
      VALUES (?, ?, ?, ?, ?, CURDATE())
    `;

    db.query(sqlInsert, [id_producto, id_usuario, nombre_cajero || null, cantidad, precio_unitario], (err, result) => {
      if (err) {
        console.error('Error al registrar salida:', err);
        return res.status(500).json({ error: 'Error al registrar salida' });
      }

      // Actualizar stock del producto
      const sqlUpdateStock = 'UPDATE productos SET stock_actual = stock_actual - ? WHERE id_producto = ?';
      db.query(sqlUpdateStock, [cantidad, id_producto], (err) => {
        if (err) {
          console.error('Error al actualizar stock:', err);
          return res.status(500).json({ error: 'Error al actualizar stock del producto' });
        }

        res.status(201).json({
          mensaje: 'Salida registrada correctamente',
          id: result.insertId
        });
      });
    });
  });
});

// ==================================================
// 🟡 GET - Buscar salidas por producto o cajero
// ==================================================
router.get('/buscar', (req, res) => {
  const { producto, cajero } = req.query;

  if (!producto && !cajero) {
    return res.status(400).json({ error: 'Debe proporcionar producto o cajero para la búsqueda' });
  }

  let sql = `
    SELECT s.*, p.nombre_producto 
    FROM salidas s
    INNER JOIN productos p ON s.id_producto = p.id_producto
    WHERE 1=1
  `;
  const params = [];

  if (producto) {
    sql += ' AND p.nombre_producto LIKE ?';
    params.push(`%${producto}%`);
  }

  if (cajero) {
    sql += ' AND s.nombre_cajero LIKE ?';
    params.push(`%${cajero}%`);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al buscar salidas:', err);
      return res.status(500).json({ error: 'Error al buscar salidas' });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron resultados' });
    }

    res.json({
      mensaje: 'Resultados encontrados',
      salidas: results
    });
  });
});

// ==================================================
// 🔵 PUT - Actualizar salida existente
// ==================================================
router.put('/:id_salida', (req, res) => {
  const { id_salida } = req.params;
  const { cantidad, precio_unitario, nombre_cajero } = req.body;

  if (!cantidad || !precio_unitario) {
    return res.status(400).json({ error: 'Los campos cantidad y precio_unitario son obligatorios' });
  }

  const sql = `
    UPDATE salidas
    SET cantidad = ?, precio_unitario = ?, nombre_cajero = ?
    WHERE id_salida = ?
  `;

  db.query(sql, [cantidad, precio_unitario, nombre_cajero || null, id_salida], (err, result) => {
    if (err) {
      console.error('Error al actualizar salida:', err);
      return res.status(500).json({ error: 'Error al actualizar salida' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    res.json({ mensaje: 'Salida actualizada correctamente' });
  });
});

// ==================================================
// 🔴 DELETE - Eliminar salida
// ==================================================
router.delete('/:id_salida', (req, res) => {
  const { id_salida } = req.params;

  // Recuperar cantidad y producto para reponer stock antes de eliminar
  db.query('SELECT id_producto, cantidad FROM salidas WHERE id_salida = ?', [id_salida], (err, results) => {
    if (err) {
      console.error('Error al obtener salida:', err);
      return res.status(500).json({ error: 'Error al obtener salida' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    const { id_producto, cantidad } = results[0];

    // Eliminar la salida
    db.query('DELETE FROM salidas WHERE id_salida = ?', [id_salida], (err, result) => {
      if (err) {
        console.error('Error al eliminar salida:', err);
        return res.status(500).json({ error: 'Error al eliminar salida' });
      }

      // Reponer stock del producto
      db.query('UPDATE productos SET stock_actual = stock_actual + ? WHERE id_producto = ?', [cantidad, id_producto], (err) => {
        if (err) {
          console.error('Error al reponer stock:', err);
          return res.status(500).json({ error: 'Error al reponer stock del producto' });
        }

        res.json({ mensaje: 'Salida eliminada y stock actualizado correctamente' });
      });
    });
  });
});

// ==================================================
// 🟢 GET - Obtener todos los detalles de salidas (para Dashboard)
// ==================================================
router.get('/detalle-salidas', (req, res) => {
  const sql = `
    SELECT ds.id_detalle, ds.id_salida, ds.id_producto, 
           p.nombre_producto, ds.cantidad, ds.precio_unitario, ds.total
    FROM detalle_salidas ds
    INNER JOIN productos p ON ds.id_producto = p.id_producto
    ORDER BY ds.id_detalle DESC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener detalles de salidas:', err);
      return res.status(500).json({ error: 'Error al obtener detalles de salidas' });
    }
    res.json(results);
  });
});

// ==================================================
// 🟣 POST - Filtrar salidas por fecha o cajero
// ==================================================
router.post('/filtrar', (req, res) => {
  const { fecha_inicio, fecha_fin, nombre_cajero } = req.body;

  let sql = `
    SELECT s.*, p.nombre_producto 
    FROM salidas s
    INNER JOIN productos p ON s.id_producto = p.id_producto
    WHERE 1=1
  `;
  const params = [];

  if (fecha_inicio && fecha_fin) {
    sql += ' AND DATE(s.fecha) BETWEEN ? AND ?';
    params.push(fecha_inicio, fecha_fin);
  }

  if (nombre_cajero) {
    sql += ' AND s.nombre_cajero LIKE ?';
    params.push(`%${nombre_cajero}%`);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al filtrar salidas:', err);
      return res.status(500).json({ error: 'Error al filtrar salidas' });
    }

    res.json({
      mensaje: 'Salidas filtradas correctamente',
      salidas: results
    });
  });
});

module.exports = router;
