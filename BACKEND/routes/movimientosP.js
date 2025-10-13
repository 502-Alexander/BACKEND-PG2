const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD'); // ← conexión a la base de datos

// ========================================
// 🟢 Ruta GET - Listar todos los movimientos
// ========================================
router.get('/', (req, res) => {
  const sql = `
    SELECT m.*, p.nombre_producto, p.codigo_barras
    FROM movimientos m
    JOIN productos p ON m.id_producto = p.id_producto
    ORDER BY m.fecha DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener movimientos:', err);
      return res.status(500).json({ error: 'Error al obtener movimientos' });
    }
    res.json(results);
  });
});

// ==================================================
// 🟢 Ruta POST - Agregar movimiento
// ==================================================
router.post('/', (req, res) => {
  const { id_producto, tipo_movimiento, cantidad, stock_resultante, origen_movimiento } = req.body;

  if (!id_producto || !tipo_movimiento || !cantidad || stock_resultante === undefined) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const sql = `
    INSERT INTO movimientos 
    (id_producto, tipo_movimiento, cantidad, stock_resultante, origen_movimiento)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sql, [id_producto, tipo_movimiento, cantidad, stock_resultante, origen_movimiento || 'AJUSTE_INVENTARIO'], (err, result) => {
    if (err) {
      console.error('Error al registrar movimiento:', err);
      return res.status(500).json({ error: 'Error al registrar movimiento' });
    }
    res.status(201).json({
      mensaje: 'Movimiento registrado correctamente',
      id_movimiento: result.insertId
    });
  });
});

// ======================================================
// 🟡 Ruta GET - Buscar movimientos por producto
// ======================================================
router.get('/producto/:id_producto', (req, res) => {
  const { id_producto } = req.params;
  const sql = `
    SELECT m.*, p.nombre_producto, p.codigo_barras
    FROM movimientos m
    JOIN productos p ON m.id_producto = p.id_producto
    WHERE m.id_producto = ?
    ORDER BY m.fecha DESC
  `;
  db.query(sql, [id_producto], (err, results) => {
    if (err) {
      console.error('Error al buscar movimientos:', err);
      return res.status(500).json({ error: 'Error al buscar movimientos' });
    }
    res.json(results);
  });
});

// ======================================================
// 🔴 Ruta DELETE - Eliminar movimiento por ID
// ======================================================
router.delete('/:id_movimiento', (req, res) => {
  const { id_movimiento } = req.params;
  db.query('DELETE FROM movimientos WHERE id_movimiento = ?', [id_movimiento], (err, result) => {
    if (err) {
      console.error('Error al eliminar movimiento:', err);
      return res.status(500).json({ error: 'Error al eliminar movimiento' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    res.json({ mensaje: 'Movimiento eliminado correctamente' });
  });
});

// ======================================================
// 🔵 Ruta POST - Filtrar movimientos por fecha o tipo
// ======================================================
router.post('/filtrar', (req, res) => {
  const { fechaInicio, fechaFin, tipo_movimiento } = req.body;
  let sql = `
    SELECT m.*, p.nombre_producto, p.codigo_barras
    FROM movimientos m
    JOIN productos p ON m.id_producto = p.id_producto
    WHERE 1=1
  `;
  const params = [];

  if (fechaInicio && fechaFin) {
    sql += ' AND m.fecha BETWEEN ? AND ?';
    params.push(fechaInicio, fechaFin);
  }

  if (tipo_movimiento) {
    sql += ' AND m.tipo_movimiento = ?';
    params.push(tipo_movimiento);
  }

  sql += ' ORDER BY m.fecha DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al filtrar movimientos:', err);
      return res.status(500).json({ error: 'Error al filtrar movimientos' });
    }
    res.json(results);
  });
});

module.exports = router;
