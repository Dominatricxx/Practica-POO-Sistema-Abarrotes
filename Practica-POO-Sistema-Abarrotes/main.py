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
        self.codigoBarra, self.nombre, self.categoria = codigoBarra, nombre, categoria
        self.precioCompra, self.precioVenta = precioCompra, precioVenta
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
        if tipo.lower() == "unitario": return ProductoUnitario(*args)
        if tipo.lower() == "granel": return ProductoGranel(*args)
        raise ValueError("Tipo inválido")

class Inventario:
    _instancia = None
    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(Inventario, cls).__new__(cls)
            cls._instancia.productos = []
        return cls._instancia
    
    def agregar(self, p): self.productos.append(p)
    def buscar(self, cod): return next((p for p in self.productos if p.codigoBarra == cod), None)
    def listar(self): return [p.to_dict() for p in self.productos]
    def eliminar(self, cod):
        producto = self.buscar(cod)
        if producto:
            self.productos.remove(producto)
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

    def registrar_cliente(self, nombre, telefono, puntos_iniciales=0):
        cliente = Cliente(nombre, telefono, puntos_iniciales)
        self.clientes[telefono] = cliente
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
        
        puntos_ganados = 0
        if self.venta_actual['cliente']:
            cliente = self.clientes.get(self.venta_actual['cliente']['telefono'])
            if cliente:
                puntos_ganados = cliente.acumular_puntos(self.venta_actual['total'])
                self.venta_actual['cliente'] = cliente.to_dict()
        
        ticket = self._generar_ticket(puntos_ganados)
        self.ventas_realizadas.append(self.venta_actual)
        venta_completada = self.venta_actual
        self.venta_actual = None
        
        return {
            'ticket': ticket,
            'venta': venta_completada,
            'puntos_ganados': puntos_ganados
        }

    def _generar_ticket(self, puntos_ganados=0):
        t = f"""
        ╔════════════════════════════════════╗
        ║     ABARROTES DON PEPE              ║
        ╠════════════════════════════════════╣
        ║ Folio: {self.venta_actual['folio']:<25} ║
        ║ Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M'):<23} ║
        """
        
        if self.venta_actual['cliente']:
            t += f"\n║ Cliente: {self.venta_actual['cliente']['nombre']:<23} ║"
        
        t += "\n╠════════════════════════════════════╣\n"
        
        for d in self.venta_actual['carrito']:
            t += f"║ {d['producto']['nombre']:<20} x{d['cantidad']:>3}  ${d['subtotal_detalle']:>7.2f} ║\n"
        
        t += f"""
╠════════════════════════════════════╣
║ Subtotal:                    ${self.venta_actual['subtotal']:>8.2f} ║
║ Impuestos:                   ${self.venta_actual['impuestos']:>8.2f} ║
║ Descuento:                  -${self.venta_actual['descuento']:>8.2f} ║
╠════════════════════════════════════╣
║ TOTAL A PAGAR:               ${self.venta_actual['total']:>8.2f} ║
"""
        
        if puntos_ganados > 0:
            t += f"""
║ PUNTOS GANADOS:              {puntos_ganados:>8} ║
║ TOTAL PUNTOS:        {self.venta_actual['cliente']['puntos']:>8} ║
"""
        
        t += "╚════════════════════════════════════╝"
        return t

inventario = Inventario()
ctrl_inventario = InventarioController(inventario)
ctrl_ventas = VentasController(inventario)

# Datos de ejemplo
ctrl_inventario.registrar_producto("unitario", "101", "Leche", "Lacteos", 10, 20, 50)
ctrl_inventario.registrar_producto("unitario", "102", "Pan", "Panaderia", 5, 15, 60)
ctrl_inventario.registrar_producto("unitario", "103", "Huevos", "Lacteos", 8, 25, 100)
ctrl_inventario.registrar_producto("granel", "201", "Arroz", "Granos", 12, 22, 80)
ctrl_inventario.registrar_producto("granel", "202", "Frijol", "Granos", 15, 28, 70)

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
async def nueva_venta(folio: str, telefono_cliente: Optional[str] = None):
    venta = ctrl_ventas.nueva_venta(folio, telefono_cliente)
    return {"success": True, "venta": venta}

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
    return resultado

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

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  SISTEMA DE ABARROTES DON PEPE")
    print("=" * 50)
    print("\n✓ Servidor iniciado en: http://localhost:8000")
    print("✓ Presiona CTRL+C para detener\n")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)