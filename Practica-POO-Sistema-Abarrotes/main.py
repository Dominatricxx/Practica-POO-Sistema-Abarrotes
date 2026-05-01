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
import random
from dotenv import load_dotenv

load_dotenv()

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
    imagen_url: Optional[str] = ""

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
                stock REAL NOT NULL,
                imagen_url TEXT DEFAULT 'default.jpg'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo_cliente TEXT UNIQUE NOT NULL,
                telefono TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL DEFAULT '',
                puntos INTEGER DEFAULT 0,
                email TEXT,
                password TEXT,
                fecha_registro TEXT NOT NULL DEFAULT ''
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
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS empleados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL DEFAULT '',
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fecha_creacion TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def cargar_productos(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT codigoBarra, tipo, nombre, categoria, precioCompra, precioVenta, stock, imagen_url FROM productos')
        rows = cursor.fetchall()
        conn.close()
        return rows
    
    def guardar_producto(self, producto):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO productos 
            (codigoBarra, tipo, nombre, categoria, precioCompra, precioVenta, stock, imagen_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (producto.codigoBarra, producto.__class__.__name__, producto.nombre, 
            producto.categoria, producto.precioCompra, producto.precioVenta, 
            producto.stock, producto.imagen_url))
        conn.commit()
        conn.close()
    
    def eliminar_producto(self, codigoBarra):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM productos WHERE codigoBarra = ?', (codigoBarra,))
        conn.commit()
        conn.close()
    
    def cargar_clientes(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT id, codigo_cliente, telefono, nombre, apellido, puntos, email, password, fecha_registro FROM clientes')
        rows = cursor.fetchall()
        conn.close()
        return rows
    
    def guardar_cliente(self, cliente):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO clientes (id, codigo_cliente, telefono, nombre, apellido, puntos, email, password, fecha_registro)
            VALUES ((SELECT id FROM clientes WHERE telefono = ?), ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (cliente.telefono, cliente.codigo_cliente, cliente.telefono, cliente.nombre_cliente, cliente.apellido, cliente.puntos, cliente.email, cliente.password, cliente.fecha_registro))
        conn.commit()
        conn.close()
    
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
    
    def guardar_empleado(self, nombre, apellido, username, password):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO empleados (nombre, apellido, username, password, fecha_creacion)
            VALUES (?, ?, ?, ?, ?)
        ''', (nombre, apellido, username, password, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return True
    
    def verificar_empleado(self, username, password):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, nombre, apellido FROM empleados 
            WHERE username = ? AND password = ?
        ''', (username, password))
        resultado = cursor.fetchone()
        conn.close()
        if resultado:
            return True, resultado[1], resultado[2]
        return False, None, None

    def obtener_ultimo_folio(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT folio FROM ventas ORDER BY id DESC LIMIT 1')
        resultado = cursor.fetchone()
        conn.close()
        if resultado:
            folio = resultado[0]
            if folio.startswith('F-'):
                try:
                    return int(folio.split('-')[1])
                except:
                    return 100
        return 100
    
    def listar_empleados(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT id, nombre, apellido, username, fecha_creacion FROM empleados')
        empleados = cursor.fetchall()
        conn.close()
        return empleados
    
    def obtener_ventas_por_periodo(self, fecha_inicio):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT v.id, v.folio, v.fecha, v.total, v.descuento, v.puntos_ganados,
                   c.nombre as cliente_nombre
            FROM ventas v
            LEFT JOIN clientes c ON v.telefono_cliente = c.telefono
            WHERE v.fecha >= ?
            ORDER BY v.fecha DESC
        ''', (fecha_inicio,))
        ventas = cursor.fetchall()
        conn.close()
        return ventas
    
    def obtener_productos_vendidos_por_periodo(self, fecha_inicio):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT vd.codigoBarra, p.nombre, SUM(vd.cantidad) as total_vendido,
                   SUM(vd.subtotal_detalle) as total_ventas, p.stock as stock_actual,
                   SUM(vd.cantidad * p.precioCompra) as costo_total
            FROM ventas_detalle vd
            JOIN ventas v ON vd.venta_id = v.id
            JOIN productos p ON vd.codigoBarra = p.codigoBarra
            WHERE v.fecha >= ?
            GROUP BY vd.codigoBarra
            ORDER BY total_vendido DESC
        ''', (fecha_inicio,))
        productos = cursor.fetchall()
        conn.close()
        return productos
    
    def obtener_ganancias_por_periodo(self, fecha_inicio):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                SUM(vd.subtotal_detalle) as total_ventas,
                SUM(vd.cantidad * p.precioCompra) as total_costo,
                SUM(v.total) as total_con_descuento,
                SUM(v.descuento) as total_descuentos
            FROM ventas_detalle vd
            JOIN ventas v ON vd.venta_id = v.id
            JOIN productos p ON vd.codigoBarra = p.codigoBarra
            WHERE v.fecha >= ?
        ''', (fecha_inicio,))
        resultado = cursor.fetchone()
        conn.close()
        return resultado

class Cliente:
    def __init__(self, nombre, apellido, telefono, puntos_iniciales=0, email="", password="", fecha_registro=None, codigo_cliente=None):
        self.nombre_cliente = nombre
        self.apellido = apellido
        self.telefono = telefono
        self.puntos = puntos_iniciales
        self.email = email
        self.password = password
        self.fecha_registro = fecha_registro if fecha_registro else datetime.now().strftime("%Y-%m-%d %H:%M")
        self.codigo_cliente = codigo_cliente if codigo_cliente else self._generar_codigo_cliente()

    def _generar_codigo_cliente(self):
        return str(random.randint(100000, 999999))

    def acumular_puntos(self, monto_total):
        nuevos_puntos = int(monto_total // 10)
        self.puntos += nuevos_puntos
        return nuevos_puntos
    
    def to_dict(self):
        return {
            'id': self.codigo_cliente,
            'codigo_cliente': self.codigo_cliente,
            'nombre': self.nombre_cliente,
            'apellido': self.apellido,
            'telefono': self.telefono,
            'puntos': self.puntos,
            'email': self.email,
            'fecha_registro': self.fecha_registro
        }

class Producto(ABC):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock, imagen_url="default.jpg"):
        self.codigoBarra = codigoBarra
        self.nombre = nombre
        self.categoria = categoria
        self.precioCompra = precioCompra
        self.precioVenta = precioVenta
        self.__stock = stock
        self.imagen_url = imagen_url if imagen_url else "default.jpg"
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
        'tipo': self.__class__.__name__,
        'imagen_url': self.imagen_url
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
            if len(args) == 7:
                return ProductoUnitario(*args)
            return ProductoUnitario(*args, "")
        if tipo_lower == "granel" or tipo_lower == "productogranel":
            if len(args) == 7:
                return ProductoGranel(*args)
            return ProductoGranel(*args, "")
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
            imagen_url = row[7] if len(row) > 7 and row[7] else "default.jpg"
            producto = ProductoFactory.crear_producto(
                tipo, row[0], row[2], row[3], row[4], row[5], row[6], imagen_url
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

    def registrar_producto(self, tipo, codigo, nombre, cat, pc, pv, stock, imagen_url="default.jpg"):
        nuevo = ProductoFactory.crear_producto(tipo, codigo, nombre, cat, pc, pv, stock, imagen_url)
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
            cliente_id = row[0]
            codigo_cliente = row[1]
            telefono = row[2]
            nombre = row[3]
            apellido = row[4] if row[4] else ""
            puntos = row[5] if len(row) > 5 else 0
            email = row[6] if len(row) > 6 else ""
            password = row[7] if len(row) > 7 else ""
            fecha_registro = row[8] if len(row) > 8 else ""
            cliente = Cliente(nombre, apellido, telefono, puntos, email, password, fecha_registro, codigo_cliente)
            cliente.id = cliente_id
            self.clientes[telefono] = cliente

    def registrar_cliente(self, nombre, apellido, telefono, puntos_iniciales=0, email="", password=""):
        cliente = Cliente(nombre, apellido, telefono, puntos_iniciales, email, password)
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
            'descuento': 0.0,
            'puntos_usados': 0
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
        
        puntos_usados_en_venta = self.venta_actual.get('puntos_usados', 0)
        puntos_ganados = 0
        
        if self.venta_actual['cliente']:
            cliente = self.clientes.get(self.venta_actual['cliente']['telefono'])
            if cliente:
                if puntos_usados_en_venta == 0:
                    puntos_ganados = cliente.acumular_puntos(self.venta_actual['total'])
                self.venta_actual['cliente'] = cliente.to_dict()
                self.db.guardar_cliente(cliente)
        
        venta_id = None
        try:
            venta_id = self.db.guardar_venta(self.venta_actual, self.venta_actual['carrito'], puntos_ganados)
        except Exception as e:
            return {'error': f'Error al guardar en base de datos: {str(e)}'}
        
        for detalle in self.venta_actual['carrito']:
            codigo = detalle['producto']['codigoBarra']
            cantidad_vendida = detalle['cantidad']
            conn = sqlite3.connect(self.db.db_name)
            cursor = conn.cursor()
            cursor.execute('UPDATE productos SET stock = stock - ? WHERE codigoBarra = ?', (cantidad_vendida, codigo))
            conn.commit()
            conn.close()
        
        ticket = self._generar_ticket(puntos_ganados)
        
        try:
            self._guardar_ticket_archivo(ticket, self.venta_actual['folio'], venta_id)
        except Exception as e:
            print(f"Error al guardar ticket en archivo: {e}")
        
        self.ventas_realizadas.append(self.venta_actual)
        venta_finalizada = self.venta_actual
        self.venta_actual = None
        
        return {
            'ticket': ticket,
            'venta': venta_finalizada,
            'puntos_ganados': puntos_ganados
        }

    def _guardar_ticket_archivo(self, ticket, folio, venta_id):
        tickets_dir = os.path.join(BASE_DIR, "tickets")
        if not os.path.exists(tickets_dir):
            os.makedirs(tickets_dir)
        
        fecha_actual = datetime.now().strftime("%Y%m%d_%H%M%S")
        venta_id_str = str(venta_id) if venta_id is not None else "0"
        nombre_archivo = f"ticket_{folio}_{fecha_actual}_{venta_id_str}.txt"
        ruta_completa = os.path.join(tickets_dir, nombre_archivo)
        
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            f.write(ticket)
        
        print(f"Ticket guardado en: {ruta_completa}")

    def _guardar_ticket_archivo(self, ticket, folio, venta_id):
        tickets_dir = os.path.join(BASE_DIR, "tickets")
        if not os.path.exists(tickets_dir):
            os.makedirs(tickets_dir)
        
        fecha_actual = datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"ticket_{folio}_{fecha_actual}_{venta_id}.txt"
        ruta_completa = os.path.join(tickets_dir, nombre_archivo)
        
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            f.write(ticket)

    def _generar_ticket(self, puntos_ganados=0):
        ancho = 42
        ticket_lines = []
        ticket_lines.append("=" * ancho)
        ticket_lines.append("     ABARROTES DON PEPE")
        ticket_lines.append("=" * ancho)
        ticket_lines.append(f"Folio: {self.venta_actual['folio']}")
        ticket_lines.append(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        if self.venta_actual['cliente']:
            nombre_cliente = self.venta_actual['cliente']['nombre'][:20]
            ticket_lines.append(f"Cliente: {nombre_cliente}")
        
        ticket_lines.append("-" * ancho)
        
        for d in self.venta_actual['carrito']:
            nombre = d['producto']['nombre'][:18]
            cantidad = d['cantidad']
            subtotal = d['subtotal_detalle']
            ticket_lines.append(f"{nombre:<18} x{cantidad:>4}  ${subtotal:>7.2f}")
        
        ticket_lines.append("-" * ancho)
        ticket_lines.append(f"Subtotal:  ${self.venta_actual['subtotal']:>8.2f}")
        ticket_lines.append(f"Impuestos: ${self.venta_actual['impuestos']:>8.2f}")
        ticket_lines.append(f"Descuento: -${self.venta_actual['descuento']:>8.2f}")
        ticket_lines.append("=" * ancho)
        ticket_lines.append(f"TOTAL A PAGAR: ${self.venta_actual['total']:>8.2f}")
        
        if puntos_ganados > 0:
            ticket_lines.append("-" * ancho)
            ticket_lines.append(f"PUNTOS GANADOS: {puntos_ganados}")
            ticket_lines.append(f"TOTAL PUNTOS: {self.venta_actual['cliente']['puntos']}")
        
        ticket_lines.append("=" * ancho)
        
        return "\n".join(ticket_lines)

inventario = Inventario()
ctrl_inventario = InventarioController(inventario)
ctrl_ventas = VentasController(inventario)

db = DatabaseManager()
empleados = db.listar_empleados()
if len(empleados) == 0:
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
    db.guardar_empleado("Administrador", "Sistema", "admin", admin_password)

if len(inventario.productos) == 0:
    productos_data = [
        ("101", "Cloro", "Limpieza", "static\images\cloro.png"),
        ("102", "Jabon Liquido", "Limpieza", "static\images\jabon.png"),
        ("103", "Trapeador", "Limpieza", "static\images\trapeador.png"),
        ("201", "Coca Cola", "Bebidas", "static\images\cocacola.jpg"),
        ("202", "Jugo de Naranja", "Bebidas", "static\images\jugo.jpg"),
        ("203", "Agua Mineral", "Bebidas", "static\images\agua.png"),
        ("301", "Leche Entera", "Lacteos", "static\images\leche.png"),
        ("302", "Yogurt Fresa", "Lacteos", "static\images\yogurt.jpg"),
        ("303", "Queso Oaxaca", "Lacteos", "static\images\queso.png"),
        ("401", "Pechuga de Pollo", "Carnes", "static\images\pollo.png"),
        ("402", "Carne Molida", "Carnes", "static\images\carne.png"),
        ("403", "Chuleta de Cerdo", "Carnes", "static\images\chuleta.jpg"),
        ("501", "Tomate", "Verduras", "static\images\tomate.png"),
        ("502", "Cebolla", "Verduras", "static\images\cebolla.png"),
        ("503", "Papa", "Verduras", "static\images\papa.png"),
    ]
    
    for codigo, nombre, categoria, imagen_url in productos_data:
        ctrl_inventario.registrar_producto("unitario", codigo, nombre, categoria, 12, 25, 40, imagen_url)

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
        if producto.stock < 0:
            raise HTTPException(status_code=400, detail="El stock no puede ser negativo")
        
        nuevo = ctrl_inventario.registrar_producto(
            producto.tipo,
            producto.codigoBarra,
            producto.nombre,
            producto.categoria,
            producto.precioCompra,
            producto.precioVenta,
            producto.stock,
            producto.imagen_url if hasattr(producto, 'imagen_url') else ""
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
async def crear_cliente(request: Request):
    try:
        data = await request.json()
        nombre = data.get("nombre", "")
        apellido = data.get("apellido", "")
        telefono = data.get("telefono")
        puntos_iniciales = data.get("puntos_iniciales", 0)
        email = data.get("email", "")
        password = data.get("password", "")
        nombre = ' '.join(word.capitalize() for word in nombre.split())
        apellido = ' '.join(word.capitalize() for word in apellido.split())
        nuevo = ctrl_ventas.registrar_cliente(nombre, apellido, telefono, puntos_iniciales, email, password)
        return {"success": True, "cliente": nuevo}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
@app.post("/api/clientes/verificar")
async def verificar_cliente(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email y contrasena requeridos")
        
        conn = sqlite3.connect("abarrotes.db")
        cursor = conn.cursor()
        cursor.execute('''
            SELECT nombre, apellido, telefono, puntos, codigo_cliente FROM clientes 
            WHERE email = ? AND password = ?
        ''', (email, password))
        resultado = cursor.fetchone()
        conn.close()
        
        if resultado:
            return {
                "success": True,
                "nombre": resultado[0],
                "apellido": resultado[1],
                "telefono": resultado[2],
                "puntos": resultado[3],
                "codigo_cliente": resultado[4]
            }
        else:
            return {"success": False, "message": "Email o contrasena incorrectos"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/clientes/eliminar/{cliente_id}")
async def eliminar_cliente(cliente_id: str, request: Request):
    try:
        data = await request.json()
        admin_password = data.get("admin_password")
        admin_password_env = os.getenv('ADMIN_PASSWORD', 'admin123')
        
        if admin_password != admin_password_env:
            raise HTTPException(status_code=403, detail="Contrasena de administrador incorrecta")
        
        conn = sqlite3.connect("abarrotes.db")
        cursor = conn.cursor()
        
        cursor.execute('SELECT codigo_cliente, telefono FROM clientes WHERE codigo_cliente = ?', (cliente_id,))
        cliente = cursor.fetchone()
        
        if not cliente:
            conn.close()
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        telefono_cliente = cliente[1]
        
        cursor.execute('DELETE FROM clientes WHERE codigo_cliente = ?', (cliente_id,))
        conn.commit()
        conn.close()
        
        if telefono_cliente and telefono_cliente in ctrl_ventas.clientes:
            del ctrl_ventas.clientes[telefono_cliente]
        
        return {"success": True, "message": "Cliente eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ventas/nueva")
async def nueva_venta(request: Request):
    try:
        data = await request.json()
        folio = data.get("folio")
        telefono_cliente = data.get("telefono_cliente")
        
        if folio is None:
            db = DatabaseManager()
            ultimo_numero = db.obtener_ultimo_folio()
            folio = f"F-{ultimo_numero + 1}"
        
        venta = ctrl_ventas.nueva_venta(folio, telefono_cliente)
        return {"success": True, "venta": venta, "folio": folio}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/ventas/agregar-item")
async def agregar_item_venta(item: ItemVenta):
    resultado = ctrl_ventas.agregar_item(item.codigoBarra, item.cantidad)
    if "error" in resultado:
        return {"error": resultado["error"]}
    return {
        "success": True,
        "producto": resultado["producto"],
        "cantidad": resultado["cantidad"],
        "alertas": resultado["alertas"],
        "carrito_actual": resultado["carrito_actual"]
    }

@app.post("/api/ventas/descuento")
async def aplicar_descuento(descuento: AplicarDescuento):
    resultado = ctrl_ventas.aplicar_descuento(
        descuento.tipo,
        descuento.valor,
        descuento.categoria
    )
    return resultado

@app.post("/api/ventas/descuento-puntos")
async def aplicar_descuento_puntos(request: Request):
    try:
        data = await request.json()
        telefono_cliente = data.get("telefono_cliente")
        puntos_usados = data.get("puntos_usados")
        monto_descuento = data.get("monto_descuento")
        
        if not telefono_cliente or puntos_usados is None or monto_descuento is None:
            raise HTTPException(status_code=400, detail="Faltan datos requeridos")
        
        conn = sqlite3.connect("abarrotes.db")
        cursor = conn.cursor()
        
        cursor.execute('SELECT puntos FROM clientes WHERE telefono = ?', (telefono_cliente,))
        resultado = cursor.fetchone()
        
        if not resultado:
            conn.close()
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        puntos_actuales = resultado[0]
        
        if puntos_usados > puntos_actuales:
            conn.close()
            raise HTTPException(status_code=400, detail="Puntos insuficientes")
        
        nuevos_puntos = puntos_actuales - puntos_usados
        
        cursor.execute('UPDATE clientes SET puntos = ? WHERE telefono = ?', (nuevos_puntos, telefono_cliente))
        conn.commit()
        conn.close()
        
        if ctrl_ventas.venta_actual:
            ctrl_ventas.venta_actual['descuento'] = ctrl_ventas.venta_actual.get('descuento', 0) + monto_descuento
            ctrl_ventas.venta_actual['total'] = ctrl_ventas.venta_actual['subtotal'] + ctrl_ventas.venta_actual['impuestos'] - ctrl_ventas.venta_actual['descuento']
            ctrl_ventas.venta_actual['puntos_usados'] = ctrl_ventas.venta_actual.get('puntos_usados', 0) + puntos_usados
        
        if telefono_cliente in ctrl_ventas.clientes:
            ctrl_ventas.clientes[telefono_cliente].puntos = nuevos_puntos
        
        return {
            "success": True,
            "puntos_restantes": nuevos_puntos,
            "descuento_aplicado": monto_descuento
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ventas/cancelar")
async def cancelar_venta():
    puntos_a_devolver = 0
    telefono_cliente = None
    
    if ctrl_ventas.venta_actual:
        if ctrl_ventas.venta_actual.get('cliente'):
            telefono_cliente = ctrl_ventas.venta_actual['cliente'].get('telefono')
        
        if ctrl_ventas.venta_actual.get('carrito'):
            for item in ctrl_ventas.venta_actual['carrito']:
                producto = inventario.buscar(item['producto']['codigoBarra'])
                if producto:
                    cantidad = item['cantidad']
                    producto._Producto__stock = producto._Producto__stock + cantidad
                    db_conn = sqlite3.connect(inventario.db.db_name)
                    db_cursor = db_conn.cursor()
                    db_cursor.execute(
                        'UPDATE productos SET stock = ? WHERE codigoBarra = ?',
                        (producto._Producto__stock, producto.codigoBarra)
                    )
                    db_conn.commit()
                    db_conn.close()
        
        descuento_aplicado = ctrl_ventas.venta_actual.get('descuento', 0)
        
        if descuento_aplicado > 0 and ctrl_ventas.venta_actual.get('puntos_usados', 0) > 0:
            puntos_a_devolver = ctrl_ventas.venta_actual.get('puntos_usados', 0)
            
            if telefono_cliente and puntos_a_devolver > 0:
                conn = sqlite3.connect("abarrotes.db")
                cursor = conn.cursor()
                cursor.execute('SELECT puntos FROM clientes WHERE telefono = ?', (telefono_cliente,))
                resultado = cursor.fetchone()
                if resultado:
                    puntos_actuales = resultado[0]
                    nuevos_puntos = puntos_actuales + puntos_a_devolver
                    cursor.execute('UPDATE clientes SET puntos = ? WHERE telefono = ?', 
                                 (nuevos_puntos, telefono_cliente))
                    conn.commit()
                    
                    if telefono_cliente in ctrl_ventas.clientes:
                        ctrl_ventas.clientes[telefono_cliente].puntos = nuevos_puntos
                conn.close()
    
    ctrl_ventas.venta_actual = None
    return {
        "success": True,
        "puntos_devueltos": puntos_a_devolver,
        "puntos_usados": ctrl_ventas.venta_actual.get('puntos_usados', 0) if ctrl_ventas.venta_actual else 0
    }

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

@app.get("/api/reportes/ventas_detalle")
async def reporte_ventas_detalle(periodo: str = "todas"):
    db = DatabaseManager()
    
    now = datetime.now()
    
    if periodo == "dia":
        fecha_inicio = now.strftime("%Y-%m-%d")
    elif periodo == "semana":
        from datetime import timedelta
        fecha_inicio = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    elif periodo == "mes":
        fecha_inicio = now.strftime("%Y-%m-01")
    else:
        fecha_inicio = "2000-01-01"
    
    conn = sqlite3.connect(db.db_name)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, folio, fecha, total, descuento, puntos_ganados,
               telefono_cliente, subtotal, impuestos
        FROM ventas
        WHERE fecha >= ?
        ORDER BY fecha DESC
        LIMIT 50
    ''', (fecha_inicio,))
    ventas_rows = cursor.fetchall()
    
    ventas = []
    for v in ventas_rows:
        cliente_nombre = "Publico General"
        if v[6]:
            cursor.execute('SELECT nombre FROM clientes WHERE telefono = ?', (v[6],))
            cliente_result = cursor.fetchone()
            if cliente_result:
                cliente_nombre = cliente_result[0]
        
        ventas.append({
            "id": v[0],
            "folio": v[1],
            "fecha": v[2],
            "total": v[3],
            "descuento": v[4],
            "puntos_ganados": v[5],
            "cliente": cliente_nombre,
            "subtotal": v[7],
            "impuestos": v[8]
        })
    
    cursor.execute('''
        SELECT 
            COALESCE(SUM(total), 0) as ingresos_totales,
            COALESCE(SUM(subtotal), 0) as subtotal_total,
            COALESCE(SUM(descuento), 0) as descuentos_totales,
            COALESCE(SUM(impuestos), 0) as impuestos_totales,
            COUNT(*) as cantidad_ventas
        FROM ventas
        WHERE fecha >= ?
    ''', (fecha_inicio,))
    resumen = cursor.fetchone()
    
    cursor.execute('''
        SELECT COALESCE(SUM(vd.cantidad * p.precioCompra), 0) as costo_total
        FROM ventas_detalle vd
        JOIN productos p ON vd.codigoBarra = p.codigoBarra
        JOIN ventas v ON vd.venta_id = v.id
        WHERE v.fecha >= ?
    ''', (fecha_inicio,))
    costo_result = cursor.fetchone()
    
    cursor.execute('''
        SELECT vd.codigoBarra, p.nombre, SUM(vd.cantidad) as total_vendido,
               SUM(vd.subtotal_detalle) as total_ventas, p.stock as stock_actual,
               SUM(vd.cantidad * p.precioCompra) as costo_total
        FROM ventas_detalle vd
        JOIN productos p ON vd.codigoBarra = p.codigoBarra
        GROUP BY vd.codigoBarra, p.nombre, p.stock
        ORDER BY total_vendido DESC
    ''')
    productos_vendidos = cursor.fetchall()
    
    conn.close()
    
    ingresos_totales = resumen[0]
    subtotal_total = resumen[1]
    descuentos_totales = resumen[2]
    impuestos_totales = resumen[3]
    cantidad_ventas = resumen[4]
    costo_total = costo_result[0]
    
    ganancia_neta = subtotal_total - costo_total
    ganancia_real = ingresos_totales - costo_total
    
    return {
        "periodo": periodo,
        "total_ventas_bruto": subtotal_total,
        "total_costo_productos": costo_total,
        "total_ventas_neto": ingresos_totales,
        "ganancia_neta": ganancia_neta,
        "ganancia_real": ganancia_real,
        "total_descuentos": descuentos_totales,
        "cantidad_ventas": cantidad_ventas,
        "ventas": ventas,
        "productos_vendidos": [
            {
                "codigoBarra": p[0],
                "nombre": p[1],
                "total_vendido": p[2],
                "total_ventas": p[3],
                "stock_actual": p[4],
                "costo_total": p[5],
                "ganancia": p[3] - p[5]
            }
            for p in productos_vendidos
        ]
    }

@app.get("/api/reportes/resumen_completo")
async def reporte_resumen_completo():
    db = DatabaseManager()
    conn = sqlite3.connect(db.db_name)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) as total_ventas,
               COALESCE(SUM(total), 0) as ventas_totales,
               COALESCE(SUM(descuento), 0) as descuentos_totales,
               COALESCE(SUM(puntos_ganados), 0) as puntos_totales
        FROM ventas
    ''')
    resumen_general = cursor.fetchone()
    
    cursor.execute('''
        SELECT p.codigoBarra, p.nombre, p.stock, p.precioVenta, p.precioCompra,
               (p.precioVenta - p.precioCompra) as ganancia_por_unidad
        FROM productos p
        ORDER BY p.stock ASC
    ''')
    inventario_actual = cursor.fetchall()
    
    cursor.execute('''
        SELECT SUM(vd.cantidad) as total_unidades_vendidas,
               COALESCE(SUM(vd.subtotal_detalle), 0) as ingreso_total,
               COALESCE(SUM(vd.cantidad * p.precioCompra), 0) as costo_total
        FROM ventas_detalle vd
        JOIN productos p ON vd.codigoBarra = p.codigoBarra
    ''')
    total_vendido = cursor.fetchone()
    
    conn.close()
    
    return {
        "resumen_general": {
            "total_ventas_realizadas": resumen_general[0],
            "ingreso_bruto": resumen_general[1],
            "total_descuentos_aplicados": resumen_general[2],
            "ingreso_neto": resumen_general[1] - resumen_general[2],
            "puntos_totales_entregados": resumen_general[3]
        },
        "inventario_actual": [
            {
                "codigo": i[0],
                "nombre": i[1],
                "stock": i[2],
                "precio_venta": i[3],
                "precio_compra": i[4],
                "ganancia_por_unidad": i[5],
                "valor_inventario": i[2] * i[4]
            }
            for i in inventario_actual
        ],
        "resumen_ventas": {
            "unidades_vendidas": total_vendido[0] if total_vendido[0] else 0,
            "ingreso_total_ventas": total_vendido[1],
            "costo_total_productos": total_vendido[2],
            "ganancia_total": total_vendido[1] - total_vendido[2]
        }
    }

@app.post("/api/empleados/registrar")
async def registrar_empleado(request: Request):
    try:
        data = await request.json()
        nombre = data.get("nombre", "")
        apellido = data.get("apellido", "")
        username = data.get("username")
        password = data.get("password")
        
        if not nombre or not apellido or not username or not password:
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        nombre = ' '.join(word.capitalize() for word in nombre.split())
        apellido = ' '.join(word.capitalize() for word in apellido.split())
        
        db = DatabaseManager()
        db.guardar_empleado(nombre, apellido, username, password)
        return {"success": True, "message": "Empleado registrado exitosamente"}
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/empleados/verificar")
async def verificar_empleado(request: Request):
    try:
        data = await request.json()
        username = data.get("username")
        password = data.get("password")
        
        db = DatabaseManager()
        valido, nombre, apellido = db.verificar_empleado(username, password)
        
        if valido:
            return {"success": True, "nombre": nombre + " " + apellido}
        else:
            return {"success": False, "message": "Usuario o contraseña incorrectos"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/empleados/eliminar/{empleado_id}")
async def eliminar_empleado(empleado_id: int, request: Request):
    try:
        data = await request.json()
        admin_password = data.get("admin_password")
        admin_password_env = os.getenv('ADMIN_PASSWORD', 'admin123')
        
        if admin_password != admin_password_env:
            raise HTTPException(status_code=403, detail="Contrasena de administrador incorrecta")
        
        if empleado_id == 1:
            raise HTTPException(status_code=403, detail="No se puede eliminar al administrador principal")
        
        conn = sqlite3.connect("abarrotes.db")
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM empleados WHERE id = ?', (empleado_id,))
        empleado = cursor.fetchone()
        
        if not empleado:
            conn.close()
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        
        cursor.execute('DELETE FROM empleados WHERE id = ?', (empleado_id,))
        conn.commit()
        conn.close()
        
        ctrl_ventas.db = DatabaseManager()
        
        return {"success": True, "message": "Empleado eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/empleados/listar")
async def listar_empleados():
    db = DatabaseManager()
    empleados = db.listar_empleados()
    return [
        {
            "id": e[0],
            "nombre": e[1],
            "apellido": e[2],
            "username": e[3],
            "fecha_creacion": e[4]
        }
        for e in empleados
    ]

@app.post("/api/empleados/verificar-admin")
async def verificar_admin(request: Request):
    try:
        data = await request.json()
        password = data.get("password")
        admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
        
        if password == admin_password:
            return {"success": True}
        else:
            return {"success": False, "message": "Contrasena incorrecta"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/empleados/reestablecer-password")
async def reestablecer_password_empleado(request: Request):
    try:
        data = await request.json()
        username = data.get("username")
        admin_password = data.get("admin_password")
        nueva_password = data.get("nueva_password")
        
        if not username or not admin_password or not nueva_password:
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        admin_password_env = os.getenv('ADMIN_PASSWORD', 'admin123')
        if admin_password != admin_password_env:
            return {"success": False, "message": "Contrasena de administrador incorrecta"}
        
        conn = sqlite3.connect("abarrotes.db")
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM empleados WHERE username = ?', (username,))
        empleado = cursor.fetchone()
        
        if not empleado:
            conn.close()
            return {"success": False, "message": "Usuario no encontrado"}
        
        cursor.execute('UPDATE empleados SET password = ? WHERE username = ?', (nueva_password, username))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Contrasena reestablecida exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/clientes/reestablecer-password")
async def reestablecer_password_cliente(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        telefono = data.get("telefono")
        admin_password = data.get("admin_password")
        nueva_password = data.get("nueva_password")
        
        if not email or not telefono or not admin_password or not nueva_password:
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        admin_password_env = os.getenv('ADMIN_PASSWORD', 'admin123')
        if admin_password != admin_password_env:
            return {"success": False, "message": "Contrasena de administrador incorrecta"}
        
        conn = sqlite3.connect("abarrotes.db")
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM clientes WHERE email = ? AND telefono = ?', (email, telefono))
        cliente = cursor.fetchone()
        
        if not cliente:
            conn.close()
            return {"success": False, "message": "Cliente no encontrado. Verifica email y telefono"}
        
        cursor.execute('UPDATE clientes SET password = ? WHERE email = ? AND telefono = ?', (nueva_password, email, telefono))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Contrasena reestablecida exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/empleados/editar/{empleado_id}")
async def editar_empleado(empleado_id: int, request: Request):
    data = await request.json()
    admin_password = data.get("admin_password")
    nombre = data.get("nombre")
    apellido = data.get("apellido")
    username = data.get("username")
    password = data.get("password")
    
    admin_password_env = os.getenv('ADMIN_PASSWORD', 'admin123')
    if admin_password != admin_password_env:
        raise HTTPException(status_code=403, detail="Contrasena de administrador incorrecta")
    
    conn = sqlite3.connect("abarrotes.db")
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM empleados WHERE id = ?', (empleado_id,))
    empleado = cursor.fetchone()
    
    if not empleado:
        conn.close()
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    cursor.execute('UPDATE empleados SET nombre = ?, apellido = ?, username = ? WHERE id = ?',
                   (nombre, apellido, username, empleado_id))
    
    if password:
        cursor.execute('UPDATE empleados SET password = ? WHERE id = ?', (password, empleado_id))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Empleado actualizado exitosamente"}


@app.put("/api/clientes/editar/{cliente_id}")
async def editar_cliente(cliente_id: str, request: Request):
    data = await request.json()
    admin_password = data.get("admin_password")
    nombre = data.get("nombre")
    apellido = data.get("apellido")
    telefono = data.get("telefono")
    email = data.get("email")
    password = data.get("password")
    puntos = data.get("puntos")
    
    admin_password_env = os.getenv('ADMIN_PASSWORD', 'admin123')
    if admin_password != admin_password_env:
        raise HTTPException(status_code=403, detail="Contrasena de administrador incorrecta")
    
    conn = sqlite3.connect("abarrotes.db")
    cursor = conn.cursor()
    cursor.execute('SELECT codigo_cliente, telefono FROM clientes WHERE codigo_cliente = ?', (cliente_id,))
    cliente = cursor.fetchone()
    
    if not cliente:
        conn.close()
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    telefono_anterior = cliente[1]
    
    cursor.execute('UPDATE clientes SET nombre = ?, apellido = ?, telefono = ?, email = ?, puntos = ? WHERE codigo_cliente = ?',
                   (nombre, apellido, telefono, email, puntos, cliente_id))
    
    if password:
        cursor.execute('UPDATE clientes SET password = ? WHERE codigo_cliente = ?', (password, cliente_id))
    
    conn.commit()
    conn.close()
    
    if telefono_anterior in ctrl_ventas.clientes:
        cliente_obj = ctrl_ventas.clientes.pop(telefono_anterior)
        cliente_obj.nombre_cliente = nombre
        cliente_obj.apellido = apellido
        cliente_obj.telefono = telefono
        cliente_obj.email = email
        cliente_obj.puntos = puntos
        if password:
            cliente_obj.password = password
        ctrl_ventas.clientes[telefono] = cliente_obj
    
    return {"success": True, "message": "Cliente actualizado exitosamente"}

@app.get("/api/ventas/tickets")
async def obtener_tickets():
    tickets_dir = os.path.join(BASE_DIR, "tickets")
    if not os.path.exists(tickets_dir):
        return {"tickets": []}
    
    archivos = []
    for archivo in os.listdir(tickets_dir):
        if archivo.endswith('.txt'):
            ruta_completa = os.path.join(tickets_dir, archivo)
            with open(ruta_completa, 'r', encoding='utf-8') as f:
                contenido = f.read()
            archivos.append({
                "nombre": archivo,
                "contenido": contenido
            })
    
    archivos.sort(key=lambda x: x['nombre'], reverse=True)
    
    return {"tickets": archivos}

db = DatabaseManager()
folio_actual = db.obtener_ultimo_folio()
print(f"Folio actual: F-{folio_actual}")

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  SISTEMA DE ABARROTES DON PEPE")
    print("=" * 50)
    print("\n✓ Servidor iniciado en: http://localhost:8000")
    print("✓ Presiona CTRL+C para detener\n")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)