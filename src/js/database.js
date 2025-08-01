const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class CotizacionesDB {
  constructor() {
    // Crear directorio database si no existe
    const dbDir = path.join(__dirname, '..', 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Conectar a la base de datos
    this.db = new Database(path.join(dbDir, 'cotizaciones.db'));
    this.initTables();
  }

  initTables() {
    // Tabla de cotizaciones
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id TEXT PRIMARY KEY,
        empresa TEXT NOT NULL,
        cliente TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        proyecto_servicio TEXT NOT NULL,
        fecha TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de productos/servicios de cada cotización
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cotizacion_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cotizacion_id TEXT NOT NULL,
        nombre_producto TEXT NOT NULL,
        concepto TEXT,
        unidades INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        imagen TEXT,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones (id) ON DELETE CASCADE
      )
    `);
  }

  // Crear nueva cotización
  crearCotizacion(datos) {
    const { id, empresa, cliente, telefono, email, proyecto_servicio, fecha, items } = datos;
    
    const stmt = this.db.prepare(`
      INSERT INTO cotizaciones (id, empresa, cliente, telefono, email, proyecto_servicio, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const itemStmt = this.db.prepare(`
      INSERT INTO cotizacion_items (cotizacion_id, nombre_producto, concepto, unidades, precio_unitario, imagen)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Transacción para insertar cotización e items
    const transaction = this.db.transaction(() => {
      stmt.run(id, empresa, cliente, telefono, email, proyecto_servicio, fecha);
      
      items.forEach(item => {
        itemStmt.run(
          id,
          item.nombre_producto,
          item.concepto,
          item.unidades,
          item.precio_unitario,
          item.imagen
        );
      });
    });

    return transaction();
  }

  // Obtener todas las cotizaciones
  obtenerCotizaciones() {
    const stmt = this.db.prepare(`
      SELECT id, empresa, proyecto_servicio as proyecto_o_servicio, fecha
      FROM cotizaciones 
      ORDER BY created_at DESC
    `);
    
    return stmt.all();
  }

  // Obtener cotización por ID con sus items
  obtenerCotizacion(id) {
    const cotizacionStmt = this.db.prepare(`
      SELECT * FROM cotizaciones WHERE id = ?
    `);
    
    const itemsStmt = this.db.prepare(`
      SELECT * FROM cotizacion_items WHERE cotizacion_id = ?
    `);

    const cotizacion = cotizacionStmt.get(id);
    if (cotizacion) {
      cotizacion.items = itemsStmt.all(id);
    }

    return cotizacion;
  }

  // Actualizar cotización
  actualizarCotizacion(id, datos) {
    const { empresa, cliente, telefono, email, proyecto_servicio, fecha, items } = datos;
    
    const updateStmt = this.db.prepare(`
      UPDATE cotizaciones 
      SET empresa = ?, cliente = ?, telefono = ?, email = ?, 
          proyecto_servicio = ?, fecha = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const deleteItemsStmt = this.db.prepare(`DELETE FROM cotizacion_items WHERE cotizacion_id = ?`);
    
    const insertItemStmt = this.db.prepare(`
      INSERT INTO cotizacion_items (cotizacion_id, nombre_producto, concepto, unidades, precio_unitario, imagen)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      updateStmt.run(empresa, cliente, telefono, email, proyecto_servicio, fecha, id);
      deleteItemsStmt.run(id);
      
      items.forEach(item => {
        insertItemStmt.run(
          id,
          item.nombre_producto,
          item.concepto,
          item.unidades,
          item.precio_unitario,
          item.imagen
        );
      });
    });

    return transaction();
  }

  // Eliminar cotización
  eliminarCotizacion(id) {
    const stmt = this.db.prepare(`DELETE FROM cotizaciones WHERE id = ?`);
    return stmt.run(id);
  }

  // Cerrar conexión
  close() {
    this.db.close();
  }
}

module.exports = CotizacionesDB;