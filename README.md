# 🔍 Comparador de Precios - Hockey Equipment

Un sistema completo para comparar precios de equipamiento de hockey en las principales plataformas de e-commerce: **Amazon**, **eBay** y **AliExpress**.

## 🚀 Características

### ✨ **Funcionalidades Principales**
- **Comparación múltiple**: Compara hasta 10 productos simultáneamente
- **Sistema de caché**: Almacena resultados por 30 minutos para mejorar performance
- **Validación robusta**: Verificación de URLs y datos extraídos
- **Logging centralizado**: Sistema de logs con colores y categorías por plataforma
- **Manejo de errores**: Gestión completa de errores y excepciones
- **Interfaz web**: Frontend moderno y responsive

### 🎯 **Plataformas Soportadas**
- **Amazon** (amazon.com, amazon.es, etc.)
- **eBay** (ebay.com, ebay.es, etc.)
- **AliExpress** (aliexpress.com, es.aliexpress.com, etc.)

### 📊 **Datos Extraídos**
- **Producto**: Nombre/título del producto
- **Precio**: Precio actual con moneda
- **Precio Original**: Precio sin descuento (si aplica)
- **Descuento**: Porcentaje de descuento (si aplica)
- **Empresa**: Vendedor o plataforma
- **Imagen**: Imagen del producto (si está disponible)
- **URL**: Enlace original del producto
- **Categoría**: Categoría del producto

## 🏗️ Arquitectura

### **Estructura del Proyecto**
```
scraper-amazon-ebay-aliexpress/
├── server.js                 # Servidor principal con API
├── package.json              # Dependencias del proyecto
├── config.js                 # Configuración del proyecto
├── README.md                 # Documentación
├── scrapers/                 # Módulos de scraping
│   ├── aliexpress.js         # Scraper para AliExpress
│   ├── amazon.js             # Scraper para Amazon
│   └── ebay.js               # Scraper para eBay
├── utils/                    # Utilidades compartidas
│   ├── validators.js         # Validaciones de datos
│   ├── logger.js             # Sistema de logging centralizado
│   ├── cache.js              # Sistema de caché
│   └── urlCleaner.js         # Limpieza de URLs
└── public/                   # Frontend estático
    └── index.html            # Interfaz principal
```

### **Tecnologías Utilizadas**
- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Scraping**: Puppeteer + Cheerio
- **Caché**: node-cache
- **Validación**: Utilidades personalizadas
- **Logging**: Sistema de logs con colores por plataforma

## 🚀 Instalación y Uso

### **Prerrequisitos**
- Node.js (v16 o superior)
- npm o yarn

### **Instalación**
```bash
# Clonar el repositorio
git clone <repository-url>
cd scraper-amazon-ebay-aliexpress

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

### **Uso**
1. **Abrir el navegador** en `http://localhost:5000`
2. **Agregar URLs** de productos de Amazon, eBay o AliExpress
3. **Especificar cantidades** (opcional, default: 1)
4. **Ejecutar la comparación** y ver los resultados

## 📡 API Endpoints

### **GET /health**
Health check del servidor
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "2.2.0"
}
```

### **POST /api/compare**
Comparar múltiples productos
```json
{
  "products": [
    {
      "url": "https://www.amazon.com/dp/...",
      "quantity": 1
    },
    {
      "url": "https://www.ebay.com/itm/...",
      "quantity": 2
    },
    {
      "url": "https://es.aliexpress.com/item/...",
      "quantity": 1
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "totalUrls": 3,
  "successful": 2,
  "failed": 1,
  "results": [...],
  "errors": [...],
  "quantities": [1, 2, 1],
  "duration": "1500ms",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **POST /api/cache/clear**
Limpiar todo el caché
```json
{
  "success": true,
  "message": "Caché limpiado exitosamente",
  "deleted": 15,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **POST /api/cache/refresh**
Forzar actualización de URLs específicas
```json
{
  "urls": [
    "https://www.amazon.com/dp/...",
    "https://www.ebay.com/itm/..."
  ]
}
```

## 🎨 Características del Frontend

### **Interfaz Moderna**
- **Diseño responsive** que funciona en móviles y desktop
- **Formulario dinámico** para agregar/remover productos
- **Validación en tiempo real** de URLs
- **Loading states** con spinners
- **Manejo de errores** con mensajes claros

### **Funcionalidades UX**
- **Agregar/remover productos** dinámicamente
- **Especificar cantidades** por producto
- **Validación de URLs** antes del envío
- **Resultados organizados** por plataforma
- **Información de caché** (TTL, hit/miss)

### **Resultados Visuales**
- **Cards de productos** con toda la información
- **Estadísticas de comparación** (total, exitosos, fallidos)
- **Badges de plataforma** para identificación rápida
- **Imágenes de productos** con fallback elegante
- **Información de descuentos** cuando aplica

## 🔧 Configuración

### **Variables de Entorno**
```bash
PORT=5000                    # Puerto del servidor (default: 5000)
NODE_ENV=development         # Entorno de ejecución
```

### **Configuración del Caché**
- **TTL**: 30 minutos por defecto
- **Verificación**: Cada 10 minutos
- **Estadísticas**: Hits, misses, sets, deletes

### **Límites y Restricciones**
- **Máximo 10 productos** por comparación
- **Timeouts de 30 segundos** por URL
- **Rate limiting** implícito para evitar bloqueos

## 🛠️ Desarrollo

### **Sistema de Logging**
```javascript
const Logger = require('./utils/logger');
const logger = new Logger('PLATFORM');

logger.info('Mensaje informativo');
logger.success('Operación exitosa');
logger.warning('Advertencia');
logger.error('Error encontrado');
logger.debug('Información de debug');
logger.step(1, 'Paso específico');
logger.result(data);
```

### **Estructura de Scrapers**
Cada scraper sigue el mismo patrón:
```javascript
async function scrapePlatform(url) {
  // 1. Configurar navegador
  // 2. Navegar a la URL
  // 3. Extraer datos
  // 4. Retornar objeto estandarizado
  return {
    Producto: "Nombre del producto",
    Empresa: "Plataforma/Vendedor",
    Precio: "123.45",
    Moneda: "USD",
    PrecioOriginal: "150.00",
    Descuento: "18%",
    Imagen: "URL de imagen",
    Url: "URL original"
  };
}
```

### **Sistema de Caché**
```javascript
const ProductCache = require('./utils/cache');
const cache = new ProductCache();

// Guardar en caché
cache.set(url, data);

// Obtener del caché
const data = cache.get(url);

// Verificar TTL
const ttl = cache.getTTL(url);

// Estadísticas
const stats = cache.getStats();
```

### **Validaciones**
```javascript
const { isValidUrl, getPlatformFromUrl, validateScrapedData } = require('./utils/validators');

// Validar URL
if (!isValidUrl(url)) { /* error */ }

// Obtener plataforma
const platform = getPlatformFromUrl(url);

// Validar datos extraídos
const validation = validateScrapedData(data);
```

## 🚨 Consideraciones Importantes

### **AliExpress**
- **Detección de CAPTCHA**: Sistema automático de detección
- **Fallback inteligente**: Datos hardcodeados cuando hay CAPTCHA
- **Extracción desde URL**: Precios extraídos directamente de la URL
- **Meta tags**: Títulos e imágenes desde og:title y og:image

### **Amazon**
- **Múltiples métodos**: 6 estrategias diferentes de extracción
- **Selectores específicos**: Optimizados para la estructura de Amazon
- **JSON-LD**: Extracción desde datos estructurados
- **Fallbacks robustos**: Múltiples niveles de fallback

### **eBay**
- **Selectores modernos**: Compatible con la nueva interfaz de eBay
- **DisplayPrice**: Extracción desde scripts específicos de eBay
- **JSON-LD**: Datos estructurados cuando están disponibles
- **Patrones de texto**: Fallback con patrones de precio

### **Manejo de Errores**
- **URLs inválidas**: Validación automática
- **Plataformas no soportadas**: Mensaje claro
- **Errores de red**: Reintentos automáticos
- **Datos faltantes**: Fallbacks elegantes
- **CAPTCHA**: Detección y manejo automático

## 🔮 Próximas Mejoras

### **Funcionalidades Planificadas**
- [ ] **Persistencia de datos**: Base de datos para guardar comparaciones
- [ ] **Historial de búsquedas**: Ver comparaciones anteriores
- [ ] **Notificaciones de precio**: Alertas cuando baje el precio
- [ ] **Exportación de datos**: CSV, JSON, PDF
- [ ] **Filtros avanzados**: Por precio, plataforma, etc.
- [ ] **Gráficos de precios**: Visualización temporal
- [ ] **API rate limiting**: Protección contra abuso
- [ ] **Autenticación**: Sistema de usuarios

### **Mejoras Técnicas**
- [ ] **Base de datos**: MongoDB/PostgreSQL
- [ ] **Redis**: Caché distribuido
- [ ] **Tests**: Suite de pruebas automatizadas
- [ ] **Docker**: Containerización
- [ ] **CI/CD**: Pipeline de despliegue
- [ ] **Monitoreo**: Métricas y alertas

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas:

- **Issues**: Abre un issue en GitHub
- **Documentación**: Revisa este README
- **Logs**: Revisa los logs del servidor para debugging

---

**¡Disfruta comparando precios de equipamiento de hockey! 🏒** 