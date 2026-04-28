from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from abc import ABC, abstractmethod
import json
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(f"Directorio base: {BASE_DIR}")
print(f"Templates existe: {os.path.exists(os.path.join(BASE_DIR, 'templates'))}")
print(f"Static existe: {os.path.exists(os.path.join(BASE_DIR, 'static'))}")

app = FastAPI(title="Sistema de Abarrotes Don Pepe")

static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)


class ProductoCreate(BaseModel):
    tipo: str
    codigoBarra: str
    nombre: str
    categoria: str
    precioCompra: float
    precioVenta: float
    stock: float

class ItemVenta(BaseModel):
    codigoBarra: str
    cantidad: float

class ClienteCreate(BaseModel):
    nombre: str
    telefono: str
    puntos_iniciales: Optional[int] = 0

class AplicarDescuento(BaseModel):
    tipo: str
    valor: Optional[float] = None
    categoria: Optional[str] = None

class SinStockException(Exception):
    pass

class IStockObserver(ABC):
    @abstractmethod
    def actualizar(self, producto): pass

class AlertaBajoStock(IStockObserver):
    def actualizar(self, producto):
        if producto.stock < 5:
            return f"⚠️ '{producto.nombre}' bajo en stock: {producto.stock:.2f}"
        return None

class IEstrategiaDescuento(ABC):
    @abstractmethod
    def aplicar(self, detalles_carrito): pass

class SinDescuento(IEstrategiaDescuento):
    def aplicar(self, detalles_carrito): return 0

class DescuentoPorcentaje(IEstrategiaDescuento):
    def __init__(self, porcentaje): self.porcentaje = porcentaje
    def aplicar(self, detalles_carrito):
        subtotal = sum(d['subtotal_detalle'] for d in detalles_carrito)
        return subtotal * (self.porcentaje / 100)

class DescuentoFijo(IEstrategiaDescuento):
    def __init__(self, monto): self.monto = monto
    def aplicar(self, detalles_carrito): return self.monto

class Descuento3x2PorCategoria(IEstrategiaDescuento):
    def __init__(self, categoria): self.categoria = categoria.lower()
    def aplicar(self, detalles_carrito):
        desc = 0
        for d in detalles_carrito:
            if d['producto'].categoria.lower() == self.categoria and d['cantidad'] >= 3:
                veces = int(d['cantidad'] // 3)
                desc += veces * d['precio_unitario']
        return desc

class DatabaseManager:
    def __init__(self, db_name="abarrotes.db"):
        self.db_name = db_name
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS productos (
                codigoBarra TEXT PRIMARY KEY,
                tipo TEXT NOT NULL,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                precioCompra REAL NOT NULL,
                precioVenta REAL NOT NULL,
                stock REAL NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clientes (
                telefono TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                puntos INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folio TEXT NOT NULL,
                fecha TEXT NOT NULL,
                telefono_cliente TEXT,
                subtotal REAL NOT NULL,
                impuestos REAL NOT NULL,
                descuento REAL NOT NULL,
                total REAL NOT NULL,
                puntos_ganados INTEGER DEFAULT 0,
                FOREIGN KEY (telefono_cliente) REFERENCES clientes (telefono)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ventas_detalle (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL,
                codigoBarra TEXT NOT NULL,
                cantidad REAL NOT NULL,
                precio_unitario REAL NOT NULL,
                subtotal_detalle REAL NOT NULL,
                impuesto_detalle REAL NOT NULL,
                FOREIGN KEY (venta_id) REFERENCES ventas (id),
                FOREIGN KEY (codigoBarra) REFERENCES productos (codigoBarra)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def guardar_producto(self, producto):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO productos 
            (codigoBarra, tipo, nombre, categoria, precioCompra, precioVenta, stock)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (producto.codigoBarra, producto.__class__.__name__, producto.nombre, 
              producto.categoria, producto.precioCompra, producto.precioVenta, producto.stock))
        conn.commit()
        conn.close()
    
    def cargar_productos(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM productos')
        rows = cursor.fetchall()
        conn.close()
        return rows
    
    def eliminar_producto(self, codigoBarra):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM productos WHERE codigoBarra = ?', (codigoBarra,))
        conn.commit()
        conn.close()
    
    def guardar_cliente(self, cliente):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO clientes (telefono, nombre, puntos)
            VALUES (?, ?, ?)
        ''', (cliente.telefono, cliente.nombre_cliente, cliente.puntos))
        conn.commit()
        conn.close()
    
    def cargar_clientes(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM clientes')
        rows = cursor.fetchall()
        conn.close()
        return rows
    
    def guardar_venta(self, venta, detalles, puntos_ganados):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO ventas 
            (folio, fecha, telefono_cliente, subtotal, impuestos, descuento, total, puntos_ganados)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (venta['folio'], venta['fecha'], 
              venta['cliente']['telefono'] if venta['cliente'] else None,
              venta['subtotal'], venta['impuestos'], venta['descuento'], 
              venta['total'], puntos_ganados))
        
        venta_id = cursor.lastrowid
        
        for detalle in detalles:
            cursor.execute('''
                INSERT INTO ventas_detalle 
                (venta_id, codigoBarra, cantidad, precio_unitario, subtotal_detalle, impuesto_detalle)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (venta_id, detalle['producto']['codigoBarra'], detalle['cantidad'],
                  detalle['precio_unitario'], detalle['subtotal_detalle'], detalle['impuesto_detalle']))
        
        conn.commit()
        conn.close()
        return venta_id

class Cliente:
    def __init__(self, nombre, telefono, puntos_iniciales=0):
        self.nombre_cliente = nombre
        self.telefono = telefono
        self.puntos = puntos_iniciales

    def acumular_puntos(self, monto_total):
        nuevos_puntos = int(monto_total // 10)
        self.puntos += nuevos_puntos
        return nuevos_puntos
    
    def to_dict(self):
        return {
            'nombre': self.nombre_cliente,
            'telefono': self.telefono,
            'puntos': self.puntos
        }

class Producto(ABC):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        self.codigoBarra = codigoBarra
        self.nombre = nombre
        self.categoria = categoria
        self.precioCompra = precioCompra
        self.precioVenta = precioVenta
        self.__stock = stock
        self._observadores = []

    @property
    def stock(self): return self.__stock

    def agregar_observador(self, obs): self._observadores.append(obs)
    
    def notificar(self):
        alertas = []
        for obs in self._observadores:
            alerta = obs.actualizar(self)
            if alerta:
                alertas.append(alerta)
        return alertas

    def actualizar_stock(self, cantidad):
        self.__stock -= cantidad
        return self.notificar()

    @abstractmethod
    def calcularImpuesto(self): pass
    
    @abstractmethod
    def vender(self, cantidad): pass
    
    def to_dict(self):
        return {
            'codigoBarra': self.codigoBarra,
            'nombre': self.nombre,
            'categoria': self.categoria,
            'precioCompra': self.precioCompra,
            'precioVenta': self.precioVenta,
            'stock': self.stock,
            'tipo': self.__class__.__name__
        }

class ProductoUnitario(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.16
    def vender(self, cantidad):
        if cantidad <= self.stock:
            return self.actualizar_stock(cantidad)
        raise SinStockException(f"No hay piezas de {self.nombre}")

class ProductoGranel(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.08
    def vender(self, cantidad):
        if cantidad <= self.stock:
            return self.actualizar_stock(cantidad)
        raise SinStockException(f"Peso insuficiente de {self.nombre}")

class ProductoFactory:
    @staticmethod
    def crear_producto(tipo, *args):
        tipo_lower = tipo.lower()
        if tipo_lower == "unitario" or tipo_lower == "productounitario":
            return ProductoUnitario(*args)
        if tipo_lower == "granel" or tipo_lower == "productogranel":
            return ProductoGranel(*args)
        raise ValueError("Tipo inválido")

class Inventario:
    _instancia = None
    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(Inventario, cls).__new__(cls)
            cls._instancia.productos = []
            cls._instancia.db = DatabaseManager()
            cls._instancia.cargar_desde_bd()
        return cls._instancia
    
    def cargar_desde_bd(self):
        rows = self.db.cargar_productos()
        for row in rows:
            tipo = row[1]
            if tipo == "ProductoUnitario":
                tipo = "unitario"
            elif tipo == "ProductoGranel":
                tipo = "granel"
            producto = ProductoFactory.crear_producto(
                tipo, row[0], row[2], row[3], row[4], row[5], row[6]
            )
            producto.agregar_observador(AlertaBajoStock())
            self.productos.append(producto)
    
    def agregar(self, p):
        self.productos.append(p)
        self.db.guardar_producto(p)
    
    def buscar(self, cod):
        return next((p for p in self.productos if p.codigoBarra == cod), None)
    
    def listar(self):
        return [p.to_dict() for p in self.productos]
    
    def eliminar(self, cod):
        producto = self.buscar(cod)
        if producto:
            self.productos.remove(producto)
            self.db.eliminar_producto(cod)
            return True
        return False

class InventarioController:
    def __init__(self, inventario):
        self.inventario = inventario

    def registrar_producto(self, tipo, codigo, nombre, cat, pc, pv, stock):
        nuevo = ProductoFactory.crear_producto(tipo, codigo, nombre, cat, pc, pv, stock)
        nuevo.agregar_observador(AlertaBajoStock())
        self.inventario.agregar(nuevo)
        return nuevo.to_dict()

class VentasController:
    def __init__(self, inventario):
        self.inventario = inventario
        self.venta_actual = None
        self.clientes = {}
        self.ventas_realizadas = []
        self.db = DatabaseManager()
        self.cargar_clientes_desde_bd()
    
    def cargar_clientes_desde_bd(self):
        rows = self.db.cargar_clientes()
        for row in rows:
            cliente = Cliente(row[1], row[0], row[2])
            self.clientes[row[0]] = cliente

    def registrar_cliente(self, nombre, telefono, puntos_iniciales=0):
        cliente = Cliente(nombre, telefono, puntos_iniciales)
        self.clientes[telefono] = cliente
        self.db.guardar_cliente(cliente)
        return cliente.to_dict()

    def obtener_cliente(self, telefono):
        return self.clientes.get(telefono)

    def listar_clientes(self):
        return [c.to_dict() for c in self.clientes.values()]

    def nueva_venta(self, folio, telefono_cliente=None):
        cliente = self.clientes.get(telefono_cliente) if telefono_cliente else None
        self.venta_actual = {
            'folio': folio,
            'fecha': datetime.now().isoformat(),
            'cliente': cliente.to_dict() if cliente else None,
            'carrito': [],
            'total': 0.0,
            'subtotal': 0.0,
            'impuestos': 0.0,
            'descuento': 0.0
        }
        return self.venta_actual

    def agregar_item(self, codigo, cantidad):
        producto = self.inventario.buscar(codigo)
        if not producto:
            return {'error': f'Producto {codigo} no encontrado'}
        
        try:
            alertas = producto.vender(cantidad)
            
            detalle = {
                'producto': producto.to_dict(),
                'cantidad': cantidad,
                'precio_unitario': producto.precioVenta,
                'subtotal_detalle': producto.precioVenta * cantidad,
                'impuesto_detalle': producto.calcularImpuesto() * cantidad
            }
            
            self.venta_actual['carrito'].append(detalle)
            self._recalcular()
            
            return {
                'success': True,
                'producto': producto.nombre,
                'cantidad': cantidad,
                'alertas': alertas,
                'carrito_actual': self.venta_actual['carrito']
            }
        except SinStockException as e:
            return {'error': str(e)}

    def _recalcular(self):
        subtotal = sum(d['subtotal_detalle'] for d in self.venta_actual['carrito'])
        impuestos = sum(d['impuesto_detalle'] for d in self.venta_actual['carrito'])
        
        self.venta_actual['subtotal'] = subtotal
        self.venta_actual['impuestos'] = impuestos
        self.venta_actual['total'] = subtotal + impuestos - self.venta_actual.get('descuento', 0)

    def aplicar_descuento(self, tipo, valor=None, categoria=None):
        detalles = self.venta_actual['carrito']
        
        if tipo == 'porcentaje' and valor:
            estrategia = DescuentoPorcentaje(valor)
        elif tipo == 'fijo' and valor:
            estrategia = DescuentoFijo(valor)
        elif tipo == '3x2' and categoria:
            # Convertir detalles a formato compatible
            class DetalleWrapper:
                def __init__(self, detalle):
                    self.producto = type('ProductoWrapper', (), {})()
                    self.producto.categoria = detalle['producto']['categoria']
                    self.cantidad = detalle['cantidad']
                    self.precio_unitario = detalle['precio_unitario']
                    self.subtotal_detalle = detalle['subtotal_detalle']
            
            wrapper_detalles = [DetalleWrapper(d) for d in detalles]
            estrategia = Descuento3x2PorCategoria(categoria)
            descuento = estrategia.aplicar(wrapper_detalles)
        else:
            estrategia = SinDescuento()
            descuento = 0
            
        if tipo != '3x2':
            descuento = estrategia.aplicar(detalles)
            
        self.venta_actual['descuento'] = descuento
        self._recalcular()
        
        return {'descuento_aplicado': descuento, 'total_nuevo': self.venta_actual['total']}

    def finalizar_venta(self):
        if not self.venta_actual:
            return {'error': 'No hay venta activa'}
        
        if not self.venta_actual.get('carrito') or len(self.venta_actual['carrito']) == 0:
            return {'error': 'No hay productos en el carrito'}
        
        puntos_ganados = 0
        if self.venta_actual['cliente']:
            cliente = self.clientes.get(self.venta_actual['cliente']['telefono'])
            if cliente:
                puntos_ganados = cliente.acumular_puntos(self.venta_actual['total'])
                self.venta_actual['cliente'] = cliente.to_dict()
                self.db.guardar_cliente(cliente)
        
        try:
            self.db.guardar_venta(self.venta_actual, self.venta_actual['carrito'], puntos_ganados)
        except Exception as e:
            return {'error': f'Error al guardar en base de datos: {str(e)}'}
        
        ticket = self._generar_ticket(puntos_ganados)
        self.ventas_realizadas.append(self.venta_actual)
        self.venta_actual = None
        
        return {
            'ticket': ticket,
            'venta': self.ventas_realizadas[-1],
            'puntos_ganados': puntos_ganados
        }

    def _generar_ticket(self, puntos_ganados=0):
        ticket_lines = []
        ticket_lines.append("=" * 48)
        ticket_lines.append("     ABARROTES DON PEPE")
        ticket_lines.append("=" * 48)
        ticket_lines.append(f"Folio: {self.venta_actual['folio']}")
        ticket_lines.append(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        if self.venta_actual['cliente']:
            ticket_lines.append(f"Cliente: {self.venta_actual['cliente']['nombre']}")
        
        ticket_lines.append("-" * 48)
        
        for d in self.venta_actual['carrito']:
            nombre = d['producto']['nombre'][:20]
            cantidad = d['cantidad']
            subtotal = d['subtotal_detalle']
            ticket_lines.append(f"{nombre:<20} x{cantidad:>3}  ${subtotal:>7.2f}")
        
        ticket_lines.append("-" * 48)
        ticket_lines.append(f"Subtotal: ${self.venta_actual['subtotal']:>8.2f}")
        ticket_lines.append(f"Impuestos: ${self.venta_actual['impuestos']:>8.2f}")
        ticket_lines.append(f"Descuento: -${self.venta_actual['descuento']:>8.2f}")
        ticket_lines.append("=" * 48)
        ticket_lines.append(f"TOTAL A PAGAR: ${self.venta_actual['total']:>8.2f}")
        
        if puntos_ganados > 0:
            ticket_lines.append("-" * 48)
            ticket_lines.append(f"PUNTOS GANADOS: {puntos_ganados}")
            ticket_lines.append(f"TOTAL PUNTOS: {self.venta_actual['cliente']['puntos']}")
        
        ticket_lines.append("=" * 48)
        
        return "\n".join(ticket_lines)

inventario = Inventario()
ctrl_inventario = InventarioController(inventario)
ctrl_ventas = VentasController(inventario)

if len(inventario.productos) == 0:
    ctrl_inventario.registrar_producto("unitario", "101", "Cloro", "Limpieza", 12, 25, 40)
    ctrl_inventario.registrar_producto("unitario", "102", "Jabón Liquido", "Limpieza", 8, 18, 35)
    ctrl_inventario.registrar_producto("unitario", "103", "Trapeador", "Limpieza", 15, 35, 20)
    ctrl_inventario.registrar_producto("unitario", "201", "Coca Cola", "Bebidas", 10, 22, 60)
    ctrl_inventario.registrar_producto("unitario", "202", "Jugo de Naranja", "Bebidas", 8, 18, 45)
    ctrl_inventario.registrar_producto("unitario", "203", "Agua Mineral", "Bebidas", 5, 12, 80)
    ctrl_inventario.registrar_producto("unitario", "301", "Leche Entera", "Lacteos", 12, 25, 30)
    ctrl_inventario.registrar_producto("unitario", "302", "Yogurt Fresa", "Lacteos", 6, 15, 40)
    ctrl_inventario.registrar_producto("unitario", "303", "Queso Oaxaca", "Lacteos", 18, 45, 25)
    ctrl_inventario.registrar_producto("unitario", "401", "Pechuga de Pollo", "Carnes", 25, 55, 20)
    ctrl_inventario.registrar_producto("unitario", "402", "Carne Molida", "Carnes", 22, 50, 25)
    ctrl_inventario.registrar_producto("unitario", "403", "Chuleta de Cerdo", "Carnes", 20, 48, 15)
    ctrl_inventario.registrar_producto("unitario", "501", "Tomate", "Verduras", 8, 18, 30)
    ctrl_inventario.registrar_producto("unitario", "502", "Cebolla", "Verduras", 6, 15, 35)
    ctrl_inventario.registrar_producto("unitario", "503", "Papa", "Verduras", 5, 12, 40)
    ctrl_ventas.registrar_cliente("Ana Lopez", "555-9876", 5)
    ctrl_ventas.registrar_cliente("Edgar Rocha", "664-9866", 0)

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    try:
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception as e:
        return HTMLResponse(content=f"""
        <html>
            <body>
                <h1>Error al cargar la página</h1>
                <p>Error: {str(e)}</p>
                <hr>
                <h3>Debug Info:</h3>
                <pre>
Directorios:
- templates/: {os.listdir('templates') if os.path.exists('templates') else 'No existe'}
- static/: {os.listdir('static') if os.path.exists('static') else 'No existe'}
                </pre>
            </body>
        </html>
        """, status_code=500)

@app.get("/api/productos")
async def get_productos():
    return inventario.listar()

@app.post("/api/productos")
async def crear_producto(producto: ProductoCreate):
    try:
        nuevo = ctrl_inventario.registrar_producto(
            producto.tipo,
            producto.codigoBarra,
            producto.nombre,
            producto.categoria,
            producto.precioCompra,
            producto.precioVenta,
            producto.stock
        )
        return {"success": True, "producto": nuevo}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/productos/{codigo}")
async def eliminar_producto(codigo: str):
    if inventario.eliminar(codigo):
        return {"success": True, "message": "Producto eliminado"}
    raise HTTPException(status_code=404, detail="Producto no encontrado")

@app.get("/api/clientes")
async def get_clientes():
    return ctrl_ventas.listar_clientes()

@app.post("/api/clientes")
async def crear_cliente(cliente: ClienteCreate):
    nuevo = ctrl_ventas.registrar_cliente(
        cliente.nombre,
        cliente.telefono,
        cliente.puntos_iniciales
    )
    return {"success": True, "cliente": nuevo}

@app.post("/api/ventas/nueva")
async def nueva_venta(request: Request):
    try:
        data = await request.json()
        folio = data.get("folio")
        telefono_cliente = data.get("telefono_cliente")
        venta = ctrl_ventas.nueva_venta(folio, telefono_cliente)
        return {"success": True, "venta": venta}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/ventas/agregar-item")
async def agregar_item_venta(item: ItemVenta):
    resultado = ctrl_ventas.agregar_item(item.codigoBarra, item.cantidad)
    return resultado

@app.post("/api/ventas/descuento")
async def aplicar_descuento(descuento: AplicarDescuento):
    resultado = ctrl_ventas.aplicar_descuento(
        descuento.tipo,
        descuento.valor,
        descuento.categoria
    )
    return resultado

@app.post("/api/ventas/finalizar")
async def finalizar_venta():
    resultado = ctrl_ventas.finalizar_venta()
    if "error" in resultado:
        raise HTTPException(status_code=400, detail=resultado["error"])
    return {
        "success": True,
        "ticket": resultado["ticket"],
        "puntos_ganados": resultado["puntos_ganados"]
    }

@app.get("/api/ventas/actual")
async def venta_actual():
    if ctrl_ventas.venta_actual:
        return ctrl_ventas.venta_actual
    return {"venta_activa": False}

@app.get("/test")
async def test():
    return {"message": "Servidor funcionando correctamente"}

@app.get("/check")
async def check():
    import os
    template_path = os.path.join("templates", "index.html")
    static_path = os.path.join("static", "script.js")
    return {
        "template_exists": os.path.exists(template_path),
        "static_exists": os.path.exists(static_path),
        "current_directory": os.getcwd(),
        "files_in_templates": os.listdir("templates") if os.path.exists("templates") else [],
        "files_in_static": os.listdir("static") if os.path.exists("static") else []
    }

@app.get("/api/reportes/ventas")
async def reporte_ventas():
    db = DatabaseManager()
    conn = sqlite3.connect(db.db_name)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT v.folio, v.fecha, v.total, c.nombre, v.puntos_ganados
        FROM ventas v
        LEFT JOIN clientes c ON v.telefono_cliente = c.telefono
        ORDER BY v.fecha DESC
        LIMIT 50
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    return {
        "ventas": [
            {
                "folio": row[0],
                "fecha": row[1],
                "total": row[2],
                "cliente": row[3] if row[3] else "Público General",
                "puntos_ganados": row[4]
            }
            for row in rows
        ]
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  SISTEMA DE ABARROTES DON PEPE")
    print("=" * 50)
    print("\n✓ Servidor iniciado en: http://localhost:8000")
    print("✓ Presiona CTRL+C para detener\n")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)