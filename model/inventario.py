class Inventario:
    _instancia = None

    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(Inventario, cls).__new__(cls)
            cls._instancia.productos = []
        return cls._instancia
    
    def agregar_producto(self, producto):
        self.productos.append(producto)
        print(f" Producto '{producto.nombre}' registrado en el sistema.")
    
    def buscar_por_codigo(self, codigo):
        for p in self.productos:
            if p.codigoBarra == codigo:
                return p
        return None
    
    def listar_por_categoria(self, categoria):
        return [p for p in self.productos if p.categoria.lower() == categoria.lower()]
    
    def obtener_todo(self):
        return self.productos
