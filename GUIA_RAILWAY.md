# 🚀 Guía: Migrar Base de Datos MySQL a Railway

## 📋 Paso 1: Exportar tu Base de Datos Local

### Opción A: Desde MySQL Workbench
1. Abre MySQL Workbench
2. Conecta a tu base de datos local
3. Ve a: **Server → Data Export**
4. Selecciona la base de datos: `inventario`
5. Marca: **Export to Self-Contained File**
6. Marca: **Include Create Schema**
7. Guarda como: `inventario_backup.sql`
8. Click en **Start Export**

### Opción B: Desde la Terminal
```bash
mysqldump -u root -p12345 inventario > inventario_backup.sql
```

---

## 🌐 Paso 2: Crear Base de Datos en Railway

1. Ve a: https://railway.app
2. Click en **Login** → Usa tu cuenta de GitHub
3. Click en **New Project**
4. Selecciona **Provision MySQL**
5. Espera 30 segundos a que se cree

### 📝 Copiar Credenciales

1. Click en tu servicio MySQL
2. Ve a la pestaña **Variables**
3. Copia estos valores:

```
MYSQL_HOST: containers-us-west-xxx.railway.app
MYSQL_PORT: 6543
MYSQL_USER: root
MYSQL_PASSWORD: xxxxxxxxxxxxxxxxx
MYSQL_DATABASE: railway
```

---

## 📤 Paso 3: Importar tu Base de Datos a Railway

### Opción A: Desde MySQL Workbench

1. Abre MySQL Workbench
2. Click en el **+** junto a "MySQL Connections"
3. Configura la conexión:
   - **Connection Name**: Railway - SOWIN
   - **Hostname**: (pega el MYSQL_HOST de Railway)
   - **Port**: (pega el MYSQL_PORT de Railway)
   - **Username**: root
   - **Password**: (click en Store in Keychain → pega el MYSQL_PASSWORD)
4. Click en **Test Connection** → debe decir "Successfully"
5. Click en **OK**
6. Conecta a Railway
7. Ve a: **Server → Data Import**
8. Selecciona: **Import from Self-Contained File**
9. Busca tu archivo: `inventario_backup.sql`
10. Click en **Start Import**

### Opción B: Desde la Terminal

```bash
mysql -h containers-us-west-xxx.railway.app -P 6543 -u root -pTU_PASSWORD railway < inventario_backup.sql
```

*(Reemplaza con tus credenciales de Railway)*

---

## ⚙️ Paso 4: Actualizar tu Backend

### 1. Edita el archivo `.env`

Abre: `BACKEND\.env`

```env
# 🌐 PRODUCCIÓN - Railway (Descomenta para usar en línea)
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6543
DB_USER=root
DB_PASSWORD=tu_password_de_railway
DB_NAME=railway

# 💻 LOCAL - MySQL Workbench (Comenta cuando uses Railway)
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=12345
# DB_NAME=inventario

PORT=3000
```

### 2. Actualiza ConexionBDD.js (si es necesario)

Si tu archivo no tiene el puerto, actualízalo:

```javascript
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,  // ← Agrega esta línea
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

---

## 🔄 Paso 5: Cambiar entre Local y Producción

### Para usar Railway (En línea):
```env
# Descomenta estas líneas
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6543
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=railway

# Comenta estas líneas
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=12345
# DB_NAME=inventario
```

### Para usar Local:
```env
# Comenta estas líneas
# DB_HOST=containers-us-west-xxx.railway.app
# DB_PORT=6543
# DB_USER=root
# DB_PASSWORD=tu_password
# DB_NAME=railway

# Descomenta estas líneas
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345
DB_NAME=inventario
```

---

## ✅ Paso 6: Probar la Conexión

1. Reinicia tu servidor backend:
```bash
node index.js
```

2. Deberías ver:
```
✅ Conectado a la base de datos MySQL
🚀 Servidor corriendo en http://localhost:3000
```

3. Prueba tu frontend y verifica que todo funcione

---

## 🎯 Ventajas de Railway

✅ **500 horas gratis** al mes  
✅ **Acceso desde cualquier lugar** (no solo localhost)  
✅ **Backups automáticos**  
✅ **SSL incluido** (conexión segura)  
✅ **Fácil de escalar** cuando crezcas  

---

## 🔒 Seguridad

⚠️ **IMPORTANTE**: Nunca subas tu archivo `.env` a GitHub

Agrega esto a tu `.gitignore`:
```
.env
node_modules/
```

---

## 🆘 Solución de Problemas

### Error: "Access denied"
- Verifica que copiaste bien el password de Railway
- Asegúrate de no tener espacios extra

### Error: "Can't connect to MySQL server"
- Verifica el HOST y PORT
- Asegúrate de tener conexión a internet

### Error: "Unknown database"
- Verifica que el nombre de la base de datos sea `railway`
- O cambia DB_NAME en tu .env

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway: https://railway.app → Tu proyecto → Deployments
2. Verifica la consola de tu backend
3. Prueba la conexión desde MySQL Workbench primero

---

## 🎉 ¡Listo!

Ahora tu aplicación puede conectarse a una base de datos en línea y funcionar desde cualquier lugar.
