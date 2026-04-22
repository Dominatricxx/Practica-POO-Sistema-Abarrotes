from abc import ABC, abstractmethod

class Producto(ABC):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        self.codigoBarra = codigoBarra
        self.nombre = nombre
        self.categoria = categoria
        self.precioCompra = precioCompra
        self.precioVenta = precioVenta
        self.__stock = stock
    
    @abstractmethod
    def calcularImpuesto(self):
        pass
    
    @abstractmethod
    def vender(self, cantidad):
        pass
