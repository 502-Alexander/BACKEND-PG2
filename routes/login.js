const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD'); // ← conexión a la base de datos
const bcrypt = require('bcrypt'); // Para encriptar contraseñas

// ======================================================
// 🟢 Ruta GET - Listar todos los usuarios con su rol
// ======================================================
router.get('/', (req, res) => {
  const sql = `
    SELECT u.id_usuario, u.nombre_usuario, u.id_rol, r.nombre_rol
    FROM usuarios u
    LEFT JOIN roles r ON u.id_rol = r.id_rol
    ORDER BY u.id_usuario ASC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }
    res.json(results);
  });
});

// ======================================================
// 🟢 Ruta POST - Registrar nuevo usuario
// ======================================================
router.post('/register', async (req, res) => {
  const { nombre_usuario, contrasena, id_rol } = req.body;

  if (!nombre_usuario || !contrasena || !id_rol) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // Encriptar contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    const sql = `
      INSERT INTO usuarios (nombre_usuario, contrasena, id_rol)
      VALUES (?, ?, ?)
    `;
    db.query(sql, [nombre_usuario, hash, id_rol], (err, result) => {
      if (err) {
        console.error('Error al registrar usuario:', err);
        return res.status(500).json({ error: 'Error al registrar usuario' });
      }
      res.status(201).json({
        mensaje: 'Usuario registrado correctamente',
        id_usuario: result.insertId,
      });
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ======================================================
// 🔵 Ruta POST - Login de usuario
// ======================================================
router.post('/login', (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const sql = `
    SELECT u.*, r.nombre_rol
    FROM usuarios u
    LEFT JOIN roles r ON u.id_rol = r.id_rol
    WHERE u.nombre_usuario = ?
  `;

  db.query(sql, [nombre_usuario], async (err, results) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({ error: 'Error al iniciar sesión' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = results[0];
    const passwordMatch = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 🔹 Obtener permisos (módulos asignados al usuario)
    const sqlPermisos = `
      SELECT m.id_modulo, m.nombre_modulo
      FROM permisos_usuario p
      INNER JOIN modulos m ON p.id_modulo = m.id_modulo
      WHERE p.id_usuario = ?
    `;

    db.query(sqlPermisos, [usuario.id_usuario], (err2, permisos) => {
      if (err2) {
        console.error('Error al obtener permisos:', err2);
        return res.status(500).json({ error: 'Error al obtener permisos del usuario' });
      }

      res.json({
        mensaje: 'Inicio de sesión exitoso',
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.nombre_rol,
        permisos, // ✅ ← lista de módulos a los que puede acceder
      });
    });
  });
});

// ======================================================
// 🟡 Ruta PUT - Actualizar usuario o rol
// ======================================================
router.put('/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  const { nombre_usuario, contrasena, id_rol } = req.body;

  let sql = `UPDATE usuarios SET `;
  const params = [];

  if (nombre_usuario) {
    sql += `nombre_usuario = ?, `;
    params.push(nombre_usuario);
  }

  if (contrasena) {
    const hash = await bcrypt.hash(contrasena, 10);
    sql += `contrasena = ?, `;
    params.push(hash);
  }
    

  if (id_rol) {
    sql += `id_rol = ?, `;
    params.push(id_rol);
  }

  // Eliminar coma final
  sql = sql.slice(0, -2);
  sql += ` WHERE id_usuario = ?`;
  params.push(id_usuario);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al actualizar usuario:', err);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario actualizado correctamente' });
  });
});

// ======================================================
// 🔴 Ruta DELETE - Eliminar usuario (preservando historial)
// ======================================================
router.delete('/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  // 1️⃣ Eliminar permisos del usuario (tiene ON DELETE CASCADE)
  db.query('DELETE FROM permisos_usuario WHERE id_usuario = ?', [id_usuario], (err) => {
    if (err) {
      console.error('Error al eliminar permisos del usuario:', err);
      return res.status(500).json({ error: 'Error al eliminar permisos del usuario' });
    }

    // 2️⃣ Eliminar el usuario
    // Las constraints ON DELETE SET NULL pondrán automáticamente:
    // - entradas.id_usuario = NULL
    // - movimientos.id_usuario = NULL  
    // - productos.creado_por = NULL
    // - salidas.id_usuario = NULL
    // PERO el nombre_usuario se mantiene para historial
    db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id_usuario], (err, result) => {
      if (err) {
        console.error('Error al eliminar usuario:', err);
        return res.status(500).json({ error: 'Error al eliminar usuario' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ 
        mensaje: 'Usuario eliminado correctamente', 
        info: 'Los registros históricos se mantienen con el nombre del usuario preservado'
      });
    });
  });
});


// ======================================================
// 🟢 Ruta GET - Listar todos los roles
// ======================================================
router.get('/roles', (req, res) => {
  const sql = `SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol ASC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener roles:', err);
      return res.status(500).json({ error: 'Error al obtener roles' });
    }
    res.json(results);
  });
});

// ======================================================
// 🟢 Ruta POST - Crear nuevo rol
// ======================================================
router.post('/roles', (req, res) => {
  const { nombre_rol } = req.body;

  if (!nombre_rol) {
    return res.status(400).json({ error: 'El nombre del rol es obligatorio' });
  }

  const sql = `INSERT INTO roles (nombre_rol) VALUES (?)`;

  db.query(sql, [nombre_rol], (err, result) => {
    if (err) {
      console.error('Error al crear rol:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'El rol ya existe' });
      }
      return res.status(500).json({ error: 'Error al crear rol' });
    }
    res.status(201).json({
      mensaje: 'Rol creado correctamente',
      id_rol: result.insertId,
    });
  });
});

// ======================================================
// 🟢 Ruta DELETE - Eliminar rol
// ======================================================
router.delete('/roles/:id_rol', (req, res) => {
  const { id_rol } = req.params;

  // Verificar si hay usuarios con este rol
  const sqlVerificar = `SELECT COUNT(*) as cantidad FROM usuarios WHERE id_rol = ?`;
  
  db.query(sqlVerificar, [id_rol], (err, results) => {
    if (err) {
      console.error('Error al verificar usuarios con el rol:', err);
      return res.status(500).json({ error: 'Error al verificar el rol' });
    }

    const cantidadUsuarios = results[0].cantidad;
    
    if (cantidadUsuarios > 0) {
      return res.status(400).json({ 
        error: `No se puede eliminar el rol porque tiene ${cantidadUsuarios} usuario(s) asignado(s)` 
      });
    }

    // Si no hay usuarios, proceder a eliminar el rol
    const sqlEliminar = `DELETE FROM roles WHERE id_rol = ?`;
    
    db.query(sqlEliminar, [id_rol], (err, result) => {
      if (err) {
        console.error('Error al eliminar rol:', err);
        return res.status(500).json({ error: 'Error al eliminar rol' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      res.json({ mensaje: 'Rol eliminado correctamente' });
    });
  });
});

// ======================================================
// 🟣 Rutas para gestión de módulos y permisos
// ======================================================

// =============================================
// 🔹 GET - Listar todos los módulos disponibles
// =============================================
router.get('/modulos', (req, res) => {
  const sql = 'SELECT * FROM modulos ORDER BY id_modulo ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener módulos:', err);
      return res.status(500).json({ error: 'Error al obtener módulos' });
    }
    res.json(results);
  });
});

// =============================================
// 🔹 GET - Listar permisos de un usuario
// =============================================
router.get('/permisos/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  const sql = `
    SELECT p.id_permiso, m.id_modulo, m.nombre_modulo
    FROM permisos_usuario p
    INNER JOIN modulos m ON p.id_modulo = m.id_modulo
    WHERE p.id_usuario = ?
  `;

  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener permisos del usuario:', err);
      return res.status(500).json({ error: 'Error al obtener permisos' });
    }
    res.json(results);
  });
});

// =============================================
// 🔹 POST - Asignar permisos a un usuario
// =============================================
router.post('/permisos/asignar', (req, res) => {
  const { id_usuario, modulos } = req.body;

  if (!id_usuario || !Array.isArray(modulos)) {
    return res.status(400).json({ error: 'Datos inválidos. Debe enviar id_usuario y un array de modulos.' });
  }

  // Primero, eliminamos los permisos actuales del usuario
  const deleteSql = 'DELETE FROM permisos_usuario WHERE id_usuario = ?';
  db.query(deleteSql, [id_usuario], (err) => {
    if (err) {
      console.error('Error al eliminar permisos previos:', err);
      return res.status(500).json({ error: 'Error al actualizar permisos' });
    }

    if (modulos.length === 0) {
      return res.json({ mensaje: 'Permisos actualizados correctamente (sin módulos asignados)' });
    }

    // Insertar los nuevos permisos
    const values = modulos.map(id_modulo => [id_usuario, id_modulo]);
    const insertSql = 'INSERT INTO permisos_usuario (id_usuario, id_modulo) VALUES ?';

    db.query(insertSql, [values], (err2) => {
      if (err2) {
        console.error('Error al asignar permisos:', err2);
        return res.status(500).json({ error: 'Error al asignar permisos' });
      }

      res.json({ mensaje: 'Permisos asignados correctamente' });
    });
  });
});

// =============================================
// 🔹 DELETE - Eliminar todos los permisos de un usuario
// =============================================
router.delete('/permisos/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  const sql = 'DELETE FROM permisos_usuario WHERE id_usuario = ?';

  db.query(sql, [id_usuario], (err, result) => {
    if (err) {
      console.error('Error al eliminar permisos:', err);
      return res.status(500).json({ error: 'Error al eliminar permisos' });
    }

    res.json({ mensaje: 'Permisos eliminados correctamente' });
  });
});

module.exports = router;
