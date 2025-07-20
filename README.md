# 🔍 Comparador de Precios - Hockey Equipment

Un sistema completo para comparar precios de equipamiento de hockey en las principales plataformas de e-commerce: **Amazon**, **eBay** y **AliExpress**.

## 🚀 Características

### ✨ **Funcionalidades Principales**
- **Comparación múltiple**: Compara hasta 10 productos simultáneamente
- **Scraping individual**: Extrae datos detallados de un producto específico
- **Interfaz moderna**: Diseño responsive y intuitivo
- **Validación robusta**: Verificación de URLs y datos extraídos
- **Logging avanzado**: Sistema de logs con colores y categorías
- **Manejo de errores**: Gestión completa de errores y excepciones

### 🎯 **Plataformas Soportadas**
- **Amazon** (amazon.com, amazon.es, etc.)
- **eBay** (ebay.com, ebay.es, etc.)
- **AliExpress** (aliexpress.com, es.aliexpress.com, etc.)

### 📊 **Datos Extraídos**
- **Producto**: Nombre/título del producto
- **Precio**: Precio actual con moneda
- **Empresa**: Vendedor o plataforma
- **Imagen**: Imagen del producto (si está disponible)
- **URL**: Enlace original del producto

## 🏗️ Arquitectura

### **Estructura del Proyecto**
```
cursor-view-pracing-hockey-equipament/
├── server.js                 # Servidor principal con API
├── package.json              # Dependencias del proyecto
├── README.md                 # Documentación
├── scrapers/                 # Módulos de scraping
│   ├── aliexpress.js         # Scraper para AliExpress
│   ├── amazon.js             # Scraper para Amazon
│   └── ebay.js               # Scraper para eBay
├── utils/                    # Utilidades compartidas
│   ├── validators.js         # Validaciones de datos
│   └── logger.js             # Sistema de logging
├── public/                   # Frontend estático
│   ├── index.html            # Interfaz principal
│   ├── css/                  # Estilos CSS
│   └── js/                   # JavaScript del frontend
└── data/                     # Datos temporales
```

### **Tecnologías Utilizadas**
- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Scraping**: Puppeteer + Cheerio
- **Validación**: Utilidades personalizadas
- **Logging**: Sistema de logs con colores

## 🚀 Instalación y Uso

### **Prerrequisitos**
- Node.js (v16 o superior)
- npm o yarn

### **Instalación**
```bash
# Clonar el repositorio
git clone <repository-url>
cd cursor-view-pracing-hockey-equipament

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

### **Uso**
1. **Abrir el navegador** en `http://localhost:5000`
2. **Seleccionar el modo**:
   - **Comparación Múltiple**: Comparar varios productos
   - **Producto Individual**: Extraer datos de un producto
3. **Agregar URLs** de productos de Amazon, eBay o AliExpress
4. **Ejecutar la comparación** y ver los resultados

## 📡 API Endpoints

### **GET /health**
Health check del servidor
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "2.0.0"
}
```

### **GET /api/info**
Información del API
```json
{
  "name": "Price Scraper API",
  "version": "2.0.0",
  "description": "API para extraer precios de Amazon, eBay y AliExpress",
  "endpoints": {...},
  "supportedPlatforms": ["amazon", "ebay", "aliexpress"]
}
```

### **POST /api/scrape**
Extraer datos de una URL
```json
{
  "url": "https://www.amazon.com/dp/..."
}
```

### **POST /api/compare**
Comparar múltiples URLs
```json
{
  "urls": [
    "https://www.amazon.com/dp/...",
    "https://www.ebay.com/itm/...",
    "https://es.aliexpress.com/item/..."
  ]
}
```

## 🎨 Características del Frontend

### **Interfaz Moderna**
- **Diseño responsive** que funciona en móviles y desktop
- **Tabs intuitivos** para diferentes funcionalidades
- **Animaciones suaves** y efectos hover
- **Colores por plataforma** (Amazon: naranja, eBay: verde, AliExpress: rojo)

### **Funcionalidades UX**
- **Agregar/remover URLs** dinámicamente
- **Validación en tiempo real** de URLs
- **Loading states** con spinners
- **Manejo de errores** con mensajes claros
- **Comparación automática** de precios
- **Detección del mejor precio** automática

### **Resultados Visuales**
- **Cards de productos** con toda la información
- **Estadísticas de comparación** (total, exitosos, fallidos)
- **Badges de plataforma** para identificación rápida
- **Imágenes de productos** con fallback elegante
- **Mensajes de error** detallados

## 🔧 Configuración

### **Variables de Entorno**
```bash
PORT=5000                    # Puerto del servidor (default: 5000)
NODE_ENV=development         # Entorno de ejecución
```

### **Personalización**
- **Límite de URLs**: Modificar en `server.js` línea 108
- **Timeouts**: Ajustar en los scrapers individuales
- **Estilos**: Editar CSS en `public/index.html`

## 🛠️ Desarrollo

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
    Imagen: "URL de imagen",
    Url: "URL original"
  };
}
```

### **Sistema de Logging**
```javascript
const Logger = require('./utils/logger');
const logger = new Logger('PLATFORM');

logger.info('Mensaje informativo');
logger.success('Operación exitosa');
logger.warning('Advertencia');
logger.error('Error encontrado');
logger.debug('Información de debug');
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
- **Captcha manual**: Es posible que necesites completar captchas manualmente
- **Navegador visible**: Se abre un navegador visible para evitar bloqueos
- **Timeouts largos**: Puede tomar más tiempo debido a las protecciones

### **Límites y Restricciones**
- **Máximo 10 URLs** por comparación
- **Timeouts de 30 segundos** por URL
- **Rate limiting** implícito para evitar bloqueos

### **Manejo de Errores**
- **URLs inválidas**: Validación automática
- **Plataformas no soportadas**: Mensaje claro
- **Errores de red**: Reintentos automáticos
- **Datos faltantes**: Fallbacks elegantes

## 🔮 Próximas Mejoras

### **Funcionalidades Planificadas**
- [ ] **Persistencia de datos**: Guardar comparaciones
- [ ] **Historial de búsquedas**: Ver comparaciones anteriores
- [ ] **Notificaciones de precio**: Alertas cuando baje el precio
- [ ] **Exportación de datos**: CSV, JSON, PDF
- [ ] **Filtros avanzados**: Por precio, plataforma, etc.
- [ ] **Gráficos de precios**: Visualización temporal

### **Mejoras Técnicas**
- [ ] **Base de datos**: MongoDB/PostgreSQL
- [ ] **Autenticación**: Sistema de usuarios
- [ ] **API rate limiting**: Protección contra abuso
- [ ] **Caché**: Redis para mejorar performance
- [ ] **Tests**: Suite de pruebas automatizadas

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
- **Email**: [tu-email@ejemplo.com]
- **Documentación**: Revisa este README

---

**¡Disfruta comparando precios de equipamiento de hockey! 🏒** 