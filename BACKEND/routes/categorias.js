const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD');

// Ruta GET para listar todas las categorías
router.get('/', (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY nombre_categoria ASC', (err, results) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      return res.status(500).json({ error: 'Error al obtener categorías' });
    }
    res.json(results);
  });
});

// Ruta GET para obtener una categoría específica por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM categorias WHERE id_categoria = ?', [id], (err, results) => {
    if (err) {
      console.error('Error al obtener categoría:', err);
      return res.status(500).json({ error: 'Error al obtener categoría' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(results[0]);
  });
});

// Ruta POST para crear una nueva categoría
router.post('/', (req, res) => {
  const { nombre_categoria } = req.body;

  if (!nombre_categoria) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  }

  const sql = 'INSERT INTO categorias (nombre_categoria) VALUES (?)';

  db.query(sql, [nombre_categoria], (err, result) => {
    if (err) {
      console.error('Error al crear categoría:', err);
      return res.status(500).json({ error: 'Error al crear categoría' });
    }

    res.status(201).json({
      mensaje: 'Categoría creada correctamente',
      categoria: {
        id_categoria: result.insertId,
        nombre_categoria
      }
    });
  });
});

// Ruta PUT para actualizar una categoría
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre_categoria } = req.body;

  if (!nombre_categoria) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  }

  const sql = 'UPDATE categorias SET nombre_categoria = ? WHERE id_categoria = ?';

  db.query(sql, [nombre_categoria, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar categoría:', err);
      return res.status(500).json({ error: 'Error al actualizar categoría' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({
      mensaje: 'Categoría actualizada correctamente',
      categoria: {
        id_categoria: parseInt(id),
        nombre_categoria
      }
    });
  });
});

// Ruta DELETE para eliminar una categoría
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Verificar si hay productos asociados a esta categoría
  db.query('SELECT COUNT(*) as count FROM productos WHERE id_categoria = ?', [id], (err, results) => {
    if (err) {
      console.error('Error al verificar productos:', err);
      return res.status(500).json({ error: 'Error al verificar productos asociados' });
    }

    if (results[0].count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar la categoría porque tiene productos asociados',
        productos_asociados: results[0].count
      });
    }

    // Eliminar categoría
    db.query('DELETE FROM categorias WHERE id_categoria = ?', [id], (err, result) => {
      if (err) {
        console.error('Error al eliminar categoría:', err);
        return res.status(500).json({ error: 'Error al eliminar categoría' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      res.json({ mensaje: 'Categoría eliminada correctamente' });
    });
  });
});

// Ruta GET para obtener categorías con conteo de productos
router.get('/stats/conteo-productos', (req, res) => {
  const sql = `
    SELECT 
      c.id_categoria,
      c.nombre_categoria,
      COUNT(p.id_producto) as total_productos
    FROM categorias c
    LEFT JOIN productos p ON c.id_categoria = p.id_categoria
    GROUP BY c.id_categoria, c.nombre_categoria
    ORDER BY c.nombre_categoria ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener estadísticas de categorías:', err);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
    res.json(results);
  });
});

module.exports = router;

