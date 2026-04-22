from producto import Producto
from utils.sinstockexception import SinStockException

class ProductoGranel(Producto):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        super().__init__(codigoBarra, nombre, categoria, precioCompra, precioVenta, stock)
    
    def calcularImpuesto(self):
        return self.precioVenta * 0.08
    
    def vender(self, cantidad):
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            print(f" Vendiendo {cantidad:.2f} kg(s) de {self.nombre}")
            return True
        
        else:
            raise SinStockException(f" Ya no queda producto disponible de {self.nombre}")
