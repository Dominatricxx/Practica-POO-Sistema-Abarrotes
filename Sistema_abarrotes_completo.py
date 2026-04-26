from abc import ABC, abstractmethod
from datetime import datetime

# ============================================================
# 1. EXCEPCIONES (utils/)
# ============================================================
class SinStockException(Exception):
    pass

# ============================================================
# 2. PATRÓN STRATEGY - DESCUENTOS VARIABLES (patterns/strategy/)
# ============================================================
class IEstrategiaDescuento(ABC):
    @abstractmethod
    def aplicar(self, detalles_carrito):
        """Recibe la lista de objetos DetalleVenta para analizar productos."""
        pass

class SinDescuento(IEstrategiaDescuento):
    def aplicar(self, detalles_carrito):
        return 0

class DescuentoPorcentajeTotal(IEstrategiaDescuento):
    def __init__(self, porcentaje):
        self.porcentaje = porcentaje
        
    def aplicar(self, detalles_carrito):
        subtotal = sum(d.subtotal_detalle for d in detalles_carrito)
        return subtotal * (self.porcentaje / 100)

class Descuento3x2PorCategoria(IEstrategiaDescuento):
    """Aplica 3x2: por cada 3 productos de una misma categoría, se descuenta el precio de uno."""
    def __init__(self, categoria_promo):
        self.categoria_promo = categoria_promo.lower()

    def aplicar(self, detalles_carrito):
        descuento_total = 0
        for d in detalles_carrito:
            if d.producto.categoria.lower() == self.categoria_promo:
                # Si es unitario y lleva 3 o más
                if d.cantidad >= 3:
                    veces_promo = int(d.cantidad // 3)
                    descuento_total += veces_promo * d.precio_unitario
        return descuento_total

# ============================================================
# 3. MODELO (model/)
# ============================================================
class Producto(ABC):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        self.codigoBarra = codigoBarra
        self.nombre = nombre
        self.categoria = categoria
        self.precioCompra = precioCompra
        self.precioVenta = precioVenta
        self.__stock = stock

    @property
    def stock(self): return self.__stock

    def actualizar_stock(self, cantidad):
        self.__stock -= cantidad

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
        raise SinStockException(f"Sin stock de {self.nombre}")

class ProductoGranel(Producto):
    def calcularImpuesto(self): return self.precioVenta * 0.08
    def vender(self, cantidad):
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            return True
        raise SinStockException(f"Peso insuficiente de {self.nombre}")

class DetalleVenta:
    def __init__(self, producto, cantidad):
        self.producto = producto
        self.cantidad = cantidad
        self.precio_unitario = producto.precioVenta
        self.subtotal_detalle = self.precio_unitario * cantidad

    def __str__(self):
        return f"{self.producto.nombre:<12} x{self.cantidad:>4} ${self.subtotal_detalle:>8.2f}"

class Venta:
    def __init__(self, folio, cliente=None):
        self.folio = folio
        self.fecha = datetime.now()
        self.cliente = cliente
        self.carrito = []
        self.estrategia_descuento = SinDescuento() # Por defecto
        self.__subtotal = 0.0
        self.__total = 0.0

    def set_estrategia(self, estrategia: IEstrategiaDescuento):
        """El carrito recibe la estrategia sin modificar su código interno."""
        self.estrategia_descuento = estrategia
        self._recalcular()

    def agregar_producto(self, producto, cantidad):
        if producto.vender(cantidad):
            self.carrito.append(DetalleVenta(producto, cantidad))
            self._recalcular()
            return True
        return False

    def _recalcular(self):
        # 1. Subtotal base
        self.__subtotal = sum(d.subtotal_detalle for d in self.carrito)
        # 2. Impuestos
        iva = sum(d.producto.calcularImpuesto() * d.cantidad for d in self.carrito)
        # 3. Aplicar Estrategia de Descuento (Pattern Strategy)
        monto_descuento = self.estrategia_descuento.aplicar(self.carrito)
        
        self.__total = (self.__subtotal + iva) - monto_descuento

    def generar_ticket(self):
        t = f"\n=== TICKET DON PEPE ===\nFolio: {self.folio}\n"
        t += f"Descuento Aplicado: {type(self.estrategia_descuento).__name__}\n"
        t += "-"*27 + "\n"
        for d in self.carrito: t += f"{str(d)}\n"
        t += "-"*27 + "\n"
        t += f"TOTAL: ${self.__total:>10.2f}\n"
        return t

# ============================================================
# 4. PRUEBA DE DESCUENTOS VARIABLES
# ============================================================
if __name__ == "__main__":
    # 1. Crear productos
    leche = ProductoUnitario("101", "Leche LALA", "Lacteos", 10, 20, 100)
    jabon = ProductoUnitario("102", "Jabon", "Limpieza", 5, 15, 100)

    # 2. Iniciar Venta
    venta = Venta(folio="V-3x2")
    
    # 3. Escenario: Cliente compra 3 leches
    venta.agregar_producto(leche, 3) # Total sin promo: 60 + IVA
    venta.agregar_producto(jabon, 1)

    # 4. APLICAR ESTRATEGIA 3x2 EN LÁCTEOS
    # El código de la Venta no cambia, solo le 'inyectamos' la estrategia
    venta.set_estrategia(Descuento3x2PorCategoria("Lacteos"))
    
    print(venta.generar_ticket())

    # 5. CAMBIAR A ESTRATEGIA DE 10% TOTAL
    venta.set_estrategia(DescuentoPorcentajeTotal(10))
    print(venta.generar_ticket())
