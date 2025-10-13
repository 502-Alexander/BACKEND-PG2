const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD'); // Conexión a la base de datos

// ========================================
// 🟢 Ruta GET - Listar todos los proveedores
// ========================================
router.get('/', (req, res) => {
  db.query('SELECT * FROM proveedores', (err, results) => {
    if (err) {
      console.error('Error al obtener proveedores:', err);
      return res.status(500).json({ error: 'Error al obtener proveedores' });
    }
    res.json(results);
  });
});

// ==================================================
// 🟢 Ruta POST - Agregar proveedor (con verificación)
// ==================================================
router.post('/', (req, res) => {
  const {
    nombre_proveedor,
    nit,
    telefono,
    email,
    direccion,
    ciudad,
    pais,
    valor,
    activo
  } = req.body;

  // Validar campos obligatorios
  if (!nombre_proveedor) {
    return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
  }

  // 1️⃣ Verificar si el proveedor ya existe
  const verificarSql = 'SELECT id_proveedor FROM proveedores WHERE nombre_proveedor = ?';

  db.query(verificarSql, [nombre_proveedor], (err, results) => {
    if (err) {
      console.error('Error al verificar proveedor:', err);
      return res.status(500).json({ error: 'Error al verificar proveedor en la base de datos' });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'El proveedor ya existe' });
    }

    // 2️⃣ Insertar proveedor nuevo
    const insertarSql = `
      INSERT INTO proveedores 
      (nombre_proveedor, nit, telefono, email, direccion, ciudad, pais, valor, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertarSql, [
      nombre_proveedor,
      nit || null,
      telefono || null,
      email || null,
      direccion || null,
      ciudad || null,
      pais || null,
      valor || 0,
      activo !== undefined ? activo : true
    ], (err, result) => {
      if (err) {
        console.error('Error al insertar proveedor:', err);
        return res.status(500).json({ error: 'Error al insertar proveedor' });
      }

      res.status(201).json({
        mensaje: 'Proveedor agregado correctamente',
        id: result.insertId
      });
    });
  });
});

// ======================================================
// 🟡 Ruta GET - Buscar proveedor por nombre o NIT
// ======================================================
router.get('/buscar', (req, res) => {
  const { nombre, nit } = req.query;

  if (!nombre && !nit) {
    return res.status(400).json({ error: 'Debe proporcionar nombre o NIT para la búsqueda' });
  }

  const sql = nombre
    ? 'SELECT * FROM proveedores WHERE nombre_proveedor LIKE ?'
    : 'SELECT * FROM proveedores WHERE nit = ?';

  const param = nombre ? [`%${nombre}%`] : [nit];

  db.query(sql, param, (err, results) => {
    if (err) {
      console.error('Error al buscar proveedor:', err);
      return res.status(500).json({ error: 'Error al buscar proveedor' });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    res.json({
      mensaje: 'Proveedor encontrado',
      proveedores: results
    });
  });
});

// ======================================================
// 🔵 Ruta PUT - Actualizar proveedor existente
// ======================================================
router.put('/:id_proveedor', (req, res) => {
  const { id_proveedor } = req.params;
  const {
    nombre_proveedor,
    nit,
    telefono,
    email,
    direccion,
    ciudad,
    pais,
    valor,
    activo
  } = req.body;

  if (!nombre_proveedor) {
    return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
  }

  // ✅ Verificar si el nombre ya pertenece a otro proveedor
  const verificarDuplicado = `
    SELECT id_proveedor FROM proveedores
    WHERE nombre_proveedor = ? AND id_proveedor <> ?
  `;

  db.query(verificarDuplicado, [nombre_proveedor, id_proveedor], (err, results) => {
    if (err) {
      console.error('Error al verificar duplicado:', err);
      return res.status(500).json({ error: 'Error al verificar duplicado' });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'Ya existe otro proveedor con ese nombre' });
    }

    const sql = `
      UPDATE proveedores
      SET nombre_proveedor = ?, nit = ?, telefono = ?, email = ?, 
          direccion = ?, ciudad = ?, pais = ?, valor = ?, activo = ?
      WHERE id_proveedor = ?
    `;

    db.query(sql, [
      nombre_proveedor,
      nit || null,
      telefono || null,
      email || null,
      direccion || null,
      ciudad || null,
      pais || null,
      valor || 0,
      activo !== undefined ? activo : true,
      id_proveedor
    ], (err, result) => {
      if (err) {
        console.error('Error al actualizar proveedor:', err);
        return res.status(500).json({ error: 'Error al actualizar proveedor' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      res.json({ mensaje: 'Proveedor actualizado correctamente' });
    });
  });
});

// ======================================================
// 🔴 Ruta DELETE - Eliminar proveedor
// ======================================================
router.delete('/:id_proveedor', (req, res) => {
  const { id_proveedor } = req.params;

  // Verificar si el proveedor tiene productos relacionados
  db.query('SELECT COUNT(*) AS total FROM productos WHERE id_proveedor = ?', [id_proveedor], (err, results) => {
    if (err) {
      console.error('Error al verificar productos del proveedor:', err);
      return res.status(500).json({ error: 'Error al verificar relaciones' });
    }

    if (results[0].total > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: el proveedor tiene productos asociados' });
    }

    const sql = 'DELETE FROM proveedores WHERE id_proveedor = ?';

    db.query(sql, [id_proveedor], (err, result) => {
      if (err) {
        console.error('Error al eliminar proveedor:', err);
        return res.status(500).json({ error: 'Error al eliminar proveedor' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      res.json({ mensaje: 'Proveedor eliminado correctamente' });
    });
  });
});

// ======================================================
// 🟣 Ruta POST - Buscar proveedores inactivos o por país
// ======================================================
router.post('/filtrar', (req, res) => {
  const { activo, pais } = req.body;

  let sql = 'SELECT * FROM proveedores WHERE 1=1';
  const params = [];

  if (activo !== undefined) {
    sql += ' AND activo = ?';
    params.push(activo);
  }

  if (pais) {
    sql += ' AND pais LIKE ?';
    params.push(`%${pais}%`);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al filtrar proveedores:', err);
      return res.status(500).json({ error: 'Error al filtrar proveedores' });
    }

    res.json({
      mensaje: 'Proveedores filtrados correctamente',
      proveedores: results
    });
  });
});

module.exports = router;