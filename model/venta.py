from datetime import datetime
from detalleventa import DetalleVenta

class Venta:
    def __init__(self, folio, cliente=None):
        self.folio = folio
        self.fecha = datetime.now()
        self.cliente = cliente
        self.carrito = []
        self.__subtotal = 0.0
        self.__total = 0.0
    
    def agregar_producto(self, producto, cantidad):
        if producto.vender(cantidad):
            nuevo_detalle = DetalleVenta(producto, cantidad)
            self.carrito.append(nuevo_detalle)
            self._recalcular_totales()
            return True
        return False
    
    def _recalcular_totales(self):
        self.__subtotal = sum(item.subtotal_detalle for item in self.carrito)
        impuestos = sum(item.producto.calcularImpuesto() * item.cantidad for item in self.carrito)
        self.__total = self.__subtotal + impuestos
    
    def generar_ticket(self):
        ticket = f"=== ABARROTES DON PEPE ===\n"
        ticket += f"Folio: {self.folio}\n"
        ticket += f"Fecha: {self.fecha.strftime('%d/%m/%Y %H:%M')}\n"
        ticket += f"Cliente: {self.cliente.nombre_cliente if self.cliente else 'Publico General'}\n"
        ticket += f"=" * 27 + "\n"

        for item in self.carrito:
            ticket += f"{str(item)}\n"
        
        ticket += f"=" * 27 + "\n"
        ticket += f"Subtotal: ${self.__subtotal:>10.2f}\n"
        ticket += f"Total:    ${self.__total:>10.2f}\n"
        ticket += "  ¡Gracias por su compra   !"
        return ticket
