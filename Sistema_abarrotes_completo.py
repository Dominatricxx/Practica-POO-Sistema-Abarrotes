from abc import ABC, abstractmethod
from datetime import datetime

# ============================================================
# 1. UTILS & EXCEPTIONS (Folder: utils/)
# ============================================================
class SinStockException(Exception):
    """Excepción para cuando no hay suficiente producto."""
    pass

# ============================================================
# 2. PATTERNS - OBSERVER (Folder: patterns/observer/)
# ============================================================
class IStockObserver(ABC):
    @abstractmethod
    def actualizar(self, producto): pass

class AlertaBajoStock(IStockObserver):
    def actualizar(self, producto):
        # Si el stock baja de 5 unidades/kg, lanza una alerta
        if producto.stock < 5:
            print(f"\n🔔 [SISTEMA]: ALERTA DE INVENTARIO - El producto '{producto.nombre}' tiene stock bajo: {producto.stock:.2f}")

# ============================================================
# 3. PATTERNS - STRATEGY (Folder: patterns/strategy/)
# ============================================================
class EstrategiaDescuento(ABC):
    @abstractmethod
    def aplicar(self, total): pass

class SinDescuento(EstrategiaDescuento):
    def aplicar(self, total): return 0

class DescuentoPorcentaje(EstrategiaDescuento):
    def __init__(self, porcentaje): self.porcentaje = porcentaje
    def aplicar(self, total): return total * (self.porcentaje / 100)

class DescuentoFijo(EstrategiaDescuento):
    def __init__(self, monto): self.monto = monto
    def aplicar(self, total): return self.monto

# ============================================================
# 4. MODEL (Folder: model/)
# ============================================================
class Producto(ABC):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        self.codigoBarra = codigoBarra
        self.nombre = nombre
        self.categoria = categoria
        self.precioCompra = precioCompra
        self.precioVenta = precioVenta
        self.__stock = stock
        self._observadores = [] # Para el patrón Observer

    @property
    def stock(self): return self.__stock

    def agregar_observador(self, obs): self._observadores.append(obs)

    def notificar(self):
        for obs in self._observadores: obs.actualizar(self)

    def actualizar_stock(self, cantidad):
        self.__stock -= cantidad
        self.notificar() # Avisa a los observadores tras cada venta

    @abstractmethod
    def calcularImpuesto(self): pass

    @abstractmethod
    def vender(self, cantidad): pass

class ProductoUnitario(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.16
    def vender(self, cantidad):
        if not isinstance(cantidad, int): raise ValueError("Solo unidades enteras")
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            return True
        raise SinStockException(f"Sin stock de {self.nombre}")

class ProductoGranel(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.08
    def vender(self, cantidad):
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            return True
        raise SinStockException(f"Sin peso suficiente de {self.nombre}")

class Inventario:
    _instancia = None
    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(Inventario, cls).__new__(cls)
            cls._instancia.productos = []
        return cls._instancia
    
    def agregar_producto(self, producto): self.productos.append(producto)
    def buscar_por_codigo(self, codigo):
        return next((p for p in self.productos if p.codigoBarra == codigo), None)

class Cliente:
    def __init__(self, nombre, telefono, puntos=0):
        self.nombre_cliente = nombre
        self.telefono = telefono
        self.puntos_acumulados = puntos

class DetalleVenta:
    def __init__(self, producto, cantidad):
        self.producto = producto
        self.cantidad = cantidad
        self.precio_unitario = producto.precioVenta
        self.subtotal_detalle = self.precio_unitario * cantidad

class Venta:
    def __init__(self, folio, cliente=None):
        self.folio = folio
        self.fecha = datetime.now()
        self.cliente = cliente
        self.carrito = []
        self.estrategia_descuento = SinDescuento()
        self.__subtotal, self.__total = 0.0, 0.0

    def agregar_producto(self, producto, cantidad):
        if producto.vender(cantidad):
            self.carrito.append(DetalleVenta(producto, cantidad))
            self._recalcular()
            return True
        return False

    def _recalcular(self):
        self.__subtotal = sum(d.subtotal_detalle for d in self.carrito)
        iva = sum(d.producto.calcularImpuesto() * d.cantidad for d in self.carrito)
        bruto = self.__subtotal + iva
        descuento = self.estrategia_descuento.aplicar(bruto)
        self.__total = bruto - descuento

    def generar_ticket(self):
        t = f"\n--- ABARROTES DON PEPE ---\nFolio: {self.folio}\nCliente: {self.cliente.nombre_cliente if self.cliente else 'General'}\n"
        t += "-"*30 + "\n"
        for d in self.carrito:
            t += f"{d.producto.nombre:<12} x{d.cantidad:>4} ${d.subtotal_detalle:>8.2f}\n"
        t += "-"*30 + "\n"
        t += f"TOTAL FINAL:      ${self.__total:>8.2f}\n"
        return t

# ============================================================
# 5. PATTERNS - FACTORY (Folder: patterns/factory/)
# ============================================================
class ProductoFactory:
    @staticmethod
    def crear_producto(tipo, *args):
        if tipo == "unitario": return ProductoUnitario(*args)
        if tipo == "granel": return ProductoGranel(*args)
        raise ValueError("Tipo inválido")

# ============================================================
# 6. CONTROLLERS (Folder: controller/)
# ============================================================
class VentasController:
    def __init__(self, inventario):
        self.inventario = inventario
        self.venta_actual = None

    def iniciar_venta(self, folio, cliente=None):
        self.venta_actual = Venta(folio, cliente)

    def evento_agregar_producto(self, codigo, cantidad):
        p = self.inventario.buscar_por_codigo(codigo)
        if p:
            try:
                return self.venta_actual.agregar_producto(p, cantidad)
            except SinStockException as e: print(f"Error: {e}")
        return False

    def evento_cobrar(self, estrategia=None):
        if estrategia: self.venta_actual.estrategia_descuento = estrategia
        self.venta_actual._recalcular()
        return self.venta_actual.generar_ticket()

# ============================================================
# 7. MAIN / PRUEBA
# ============================================================
if __name__ == "__main__":
    # Setup inicial
    inv = Inventario()
    alerta = AlertaBajoStock()
    
    # Crear productos usando la Factory
    p1 = ProductoFactory.crear_producto("unitario", "101", "Atun", "Enlatados", 10, 20, 6) # Casi bajo stock
    p1.agregar_observador(alerta)
    inv.agregar_producto(p1)

    # El controlador orquesta la venta
    ctrl = VentasController(inv)
    ctrl.iniciar_venta(folio="001")
    
    print("Agregando 2 latas...")
    ctrl.evento_agregar_producto("101", 2) # Esto bajará el stock a 4 y disparará la alerta
    
    # Cobrar con descuento de porcentaje (Strategy)
    ticket = ctrl.evento_cobrar(estrategia=DescuentoPorcentaje(10))
    print(ticket)
