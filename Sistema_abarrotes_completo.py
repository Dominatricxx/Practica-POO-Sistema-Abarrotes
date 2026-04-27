from abc import ABC, abstractmethod
from datetime import datetime

# ============================================================
# 1. UTILS & EXCEPTIONS
# ============================================================
class SinStockException(Exception):
    pass

# ============================================================
# 2. PATRONES DE DISEÑO (Observer & Strategy)
# ============================================================
class IStockObserver(ABC):
    @abstractmethod
    def actualizar(self, producto): pass

class AlertaBajoStock(IStockObserver):
    def actualizar(self, producto):
        if producto.stock < 5:
            print(f"\n[ALERTA INVENTARIO] ⚠️ '{producto.nombre}' bajo en stock: {producto.stock:.2f}")

class IEstrategiaDescuento(ABC):
    @abstractmethod
    def aplicar(self, detalles_carrito): pass

class SinDescuento(IEstrategiaDescuento):
    def aplicar(self, detalles_carrito): return 0

class DescuentoPorcentaje(IEstrategiaDescuento):
    def __init__(self, porcentaje): self.porcentaje = porcentaje
    def aplicar(self, detalles_carrito):
        subtotal = sum(d.subtotal_detalle for d in detalles_carrito)
        return subtotal * (self.porcentaje / 100)

class DescuentoFijo(IEstrategiaDescuento):
    def __init__(self, monto): self.monto = monto
    def aplicar(self, detalles_carrito): return self.monto

class Descuento3x2PorCategoria(IEstrategiaDescuento):
    def __init__(self, categoria): self.categoria = categoria.lower()
    def aplicar(self, detalles_carrito):
        desc = 0
        for d in detalles_carrito:
            if d.producto.categoria.lower() == self.categoria and d.cantidad >= 3:
                veces = int(d.cantidad // 3)
                desc += veces * d.precio_unitario
        return desc

# ============================================================
# 3. MODELO (model/)
# ============================================================
class Cliente:
    def __init__(self, nombre, telefono, puntos_iniciales=0):
        self.nombre_cliente = nombre
        self.telefono = telefono
        self.puntos = puntos_iniciales

    def acumular_puntos(self, monto_total):
        # Regla: 1 punto por cada $10 gastados
        nuevos_puntos = int(monto_total // 10)
        self.puntos += nuevos_puntos
        return nuevos_puntos

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
        for obs in self._observadores: obs.actualizar(self)

    def actualizar_stock(self, cantidad):
        self.__stock -= cantidad
        self.notificar()

    @abstractmethod
    def calcularImpuesto(self): pass
    @abstractmethod
    def vender(self, cantidad): pass

class ProductoUnitario(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.16
    def vender(self, cantidad):
        if not isinstance(cantidad, int): return False
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            return True
        raise SinStockException(f"No hay piezas de {self.nombre}")

class ProductoGranel(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.08
    def vender(self, cantidad):
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            return True
        raise SinStockException(f"Peso insuficiente de {self.nombre}")

class DetalleVenta:
    def __init__(self, producto, cantidad):
        self.producto, self.cantidad = producto, cantidad
        self.precio_unitario = producto.precioVenta
        self.subtotal_detalle = self.precio_unitario * cantidad

class Venta:
    def __init__(self, folio, cliente=None):
        self.folio, self.fecha = folio, datetime.now()
        self.cliente = cliente
        self.carrito, self.estrategia_descuento = [], SinDescuento()
        self.__total = 0.0

    @property
    def total(self): return self.__total

    def agregar_producto(self, producto, cantidad):
        if producto.vender(cantidad):
            self.carrito.append(DetalleVenta(producto, cantidad))
            self._recalcular()
            return True
        return False

    def _recalcular(self):
        sub = sum(d.subtotal_detalle for d in self.carrito)
        imp = sum(d.producto.calcularImpuesto() * d.cantidad for d in self.carrito)
        desc = self.estrategia_descuento.aplicar(self.carrito)
        self.__total = (sub + imp) - desc

    def generar_ticket(self, puntos_ganados=0):
        nombre_c = self.cliente.nombre_cliente if self.cliente else "Publico General"
        t = f"\n=== ABARROTES DON PEPE ===\nFolio: {self.folio}\nCliente: {nombre_c}\n" + "-"*30 + "\n"
        if self.estrategia_descuento:
            t += f"Descuento asignado: {type(self.estrategia_descuento).__name__}\n"

        for d in self.carrito: 
            t += f"{d.producto.nombre:<15} x{d.cantidad:>4} ${d.subtotal_detalle:>8.2f}\n"
        t += "-"*30 + f"\nTOTAL A PAGAR:    ${self.__total:>8.2f}\n"
        if self.cliente:
            t += f"PUNTOS GANADOS:   {puntos_ganados}\n"
            t += f"TOTAL PUNTOS:     {self.cliente.puntos}\n"
        return t

# ============================================================
# 4. FACTORY & SINGLETON
# ============================================================
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

# ============================================================
# 5. CONTROLADORES
# ============================================================
class InventarioController:
    def __init__(self, inventario):
        self.inventario = inventario

    def registrar_producto(self, tipo, codigo, nombre, cat, pc, pv, stock):
        nuevo = ProductoFactory.crear_producto(tipo, codigo, nombre, cat, pc, pv, stock)
        nuevo.agregar_observador(AlertaBajoStock())
        self.inventario.agregar(nuevo)

class VentasController:
    def __init__(self, inventario):
        self.inventario, self.venta_actual = inventario, None

    def nueva_venta(self, folio, cliente=None):
        self.venta_actual = Venta(folio, cliente)

    def agregar_item(self, codigo, cantidad):
        p = self.inventario.buscar(codigo)
        if p:
            try: self.venta_actual.agregar_producto(p, cantidad)
            except SinStockException as e: print(f"❌ {e}")

    def cobrar(self, estrategia=SinDescuento()):
        self.venta_actual.set_estrategia = estrategia # Asignación simple
        self.venta_actual.estrategia_descuento = estrategia
        self.venta_actual._recalcular()
        
        ganados = 0
        if self.venta_actual.cliente:
            ganados = self.venta_actual.cliente.acumular_puntos(self.venta_actual.total)
            
        print(self.venta_actual.generar_ticket(ganados))

# ============================================================
# 6. EJECUCIÓN
# ============================================================
if __name__ == "__main__":
    bodega = Inventario()
    ctrl_inv = InventarioController(bodega)
    ctrl_vta = VentasController(bodega)

    ctrl_inv.registrar_producto("unitario", "101", "Leche", "Lacteos", 10, 20, 50)
    ctrl_inv.registrar_producto("unitario", "102", "Pan", "Pan", 5, 15, 60)
    
    # Cliente con 5 puntos previos
    cliente_leal = Cliente("Ana Lopez", "555-9876", puntos_iniciales=5)
    cliente_leal2 = Cliente("Edgar Rocha", "664-9866", puntos_iniciales=0)

    numero_venta = 100
    numero_venta += 1

    print("--- VENTA PARA CLIENTE CON PUNTOS ---")
    ctrl_vta.nueva_venta(f"F-{numero_venta}", cliente_leal)
    ctrl_vta.agregar_item("101", 10) # Gasta $200 + IVA
    ctrl_vta.cobrar(Descuento3x2PorCategoria("Lacteos"))

    ctrl_vta.nueva_venta(f"F-{numero_venta}", cliente_leal2)
    ctrl_vta.agregar_item("102", 20)
    ctrl_vta.cobrar(DescuentoPorcentaje(50))
