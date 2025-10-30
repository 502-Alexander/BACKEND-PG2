const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD');

// ✅ Ruta GET - Listar todas las entradas
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      e.id_entrada,
      e.id_producto,
      p.nombre_producto,
      e.id_usuario,
      e.nombre_usuario,
      e.fecha,
      e.cantidad,
      e.precio_unitario,
      e.total
    FROM entradas e
    INNER JOIN productos p ON e.id_producto = p.id_producto
    ORDER BY e.fecha DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener entradas:', err);
      return res.status(500).json({ error: 'Error al obtener entradas' });
    }
    res.json(results);
  });
});

// ✅ Ruta GET - Obtener una entrada por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      e.id_entrada,
      e.id_producto,
      p.nombre_producto,
      e.id_usuario,
      e.nombre_usuario,
      e.fecha,
      e.cantidad,
      e.precio_unitario,
      e.total
    FROM entradas e
    INNER JOIN productos p ON e.id_producto = p.id_producto
    WHERE e.id_entrada = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener la entrada:', err);
      return res.status(500).json({ error: 'Error al obtener la entrada' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json(results[0]);
  });
});

// ✅ Ruta POST - Crear nueva entrada
// ✅ Ruta POST - Crear nueva entrada (VERSIÓN CORREGIDA)
// ✅ Ruta POST CORREGIDA - Sin la columna 'total'
router.post('/', (req, res) => {
  const { id_producto, cantidad, precio_unitario, id_usuario, nombre_usuario } = req.body;

  if (!id_producto || !cantidad || !precio_unitario) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (id_producto, cantidad, precio_unitario)' });
  }

  // SQL CORREGIDO - Quitar 'total' de las columnas
  const sql = `
    INSERT INTO entradas (id_producto, id_usuario, nombre_usuario, cantidad, precio_unitario, fecha)
    VALUES (?, ?, ?, ?, ?, CURDATE())
  `;

  const values = [
    id_producto, 
    id_usuario || null, 
    nombre_usuario || null, 
    cantidad, 
    precio_unitario
  ];

  console.log('🔍 Ejecutando SQL:', sql);
  console.log('🔍 Con valores:', values);

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error al crear la entrada:', err);
      return res.status(500).json({ 
        error: 'Error al crear la entrada: ' + err.message,
        sqlMessage: err.sqlMessage 
      });
    }

    // Obtener la entrada recién creada para incluir el total calculado
    const selectSql = `
      SELECT e.*, p.nombre_producto 
      FROM entradas e 
      INNER JOIN productos p ON e.id_producto = p.id_producto 
      WHERE e.id_entrada = ?
    `;

    db.query(selectSql, [result.insertId], (selectErr, selectResults) => {
      if (selectErr) {
        console.error('Error al obtener entrada creada:', selectErr);
        // Aún así responder éxito, pero sin el total
        return res.status(201).json({
          mensaje: 'Entrada registrada correctamente',
          entrada: {
            id_entrada: result.insertId,
            id_producto,
            id_usuario,
            nombre_usuario,
            cantidad,
            precio_unitario
          }
        });
      }

      const entradaCreada = selectResults[0];
      
      res.status(201).json({
        mensaje: 'Entrada registrada correctamente',
        entrada: {
          id_entrada: entradaCreada.id_entrada,
          id_producto: entradaCreada.id_producto,
          id_usuario: entradaCreada.id_usuario,
          nombre_usuario: entradaCreada.nombre_usuario,
          cantidad: entradaCreada.cantidad,
          precio_unitario: entradaCreada.precio_unitario,
          total: entradaCreada.total, // Este viene de la BD (calculado automáticamente)
          fecha: entradaCreada.fecha,
          nombre_producto: entradaCreada.nombre_producto
        }
      });
    });
  });
});

// ✅ Ruta PUT - Actualizar una entrada existente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { id_producto, cantidad, precio_unitario } = req.body;

  if (!id_producto || !cantidad || !precio_unitario) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (id_producto, cantidad, precio_unitario)' });
  }

  const sql = `
    UPDATE entradas
    SET id_producto = ?, cantidad = ?, precio_unitario = ?
    WHERE id_entrada = ?
  `;

  db.query(sql, [id_producto, cantidad, precio_unitario, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar la entrada:', err);
      return res.status(500).json({ error: 'Error al actualizar la entrada' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json({
      mensaje: 'Entrada actualizada correctamente',
      entrada: {
        id_entrada: parseInt(id),
        id_producto,
        cantidad,
        precio_unitario
      }
    });
  });
});

// ✅ Ruta DELETE - Eliminar una entrada
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM entradas WHERE id_entrada = ?', [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar la entrada:', err);
      return res.status(500).json({ error: 'Error al eliminar la entrada' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json({ mensaje: 'Entrada eliminada correctamente' });
  });
});

// ✅ Ruta GET - Obtener estadísticas de entradas por producto
router.get('/stats/productos', (req, res) => {
  const sql = `
    SELECT 
      p.id_producto,
      p.nombre_producto,
      COUNT(e.id_entrada) AS total_entradas,
      SUM(e.cantidad) AS cantidad_total,
      SUM(e.total) AS valor_total
    FROM entradas e
    INNER JOIN productos p ON e.id_producto = p.id_producto
    GROUP BY p.id_producto, p.nombre_producto
    ORDER BY p.nombre_producto ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener estadísticas de entradas:', err);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
    res.json(results);
  });
});

module.exports = router;
