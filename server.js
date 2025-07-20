const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar utilidades
const Logger = require('./utils/logger');
const { isValidUrl, getPlatformFromUrl, validateScrapedData, cleanPrice, cleanTitle } = require('./utils/validators');
const ProductCache = require('./utils/cache');
const { getPlatformShortName } = require('./utils/urlCleaner');

// Importar scrapers
const { scrapeAliExpress } = require('./scrapers/aliexpress');
const scrapeAmazon = require('./scrapers/amazon');
const scrapeEbay = require('./scrapers/ebay');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear logger principal
const logger = new Logger('SERVER');

// Crear instancia de caché
const productCache = new ProductCache();

// --- Endpoints principales ---

// Health check simple
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.2.0'
  });
});



// Endpoint para limpiar caché
app.post('/api/cache/clear', (req, res) => {
  const deleted = productCache.clear();
  logger.info(`Caché limpiado: ${deleted} elementos eliminados`);
  res.json({
    success: true,
    message: `Caché limpiado exitosamente`,
    deleted,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para forzar actualización de URLs específicas
app.post('/api/cache/refresh', (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({
      success: false,
      error: 'URLs requeridas como array'
    });
  }

  const results = productCache.forceRefresh(urls);
  logger.info(`Forzando actualización de ${urls.length} URLs`);
  
  res.json({
    success: true,
    message: 'URLs marcadas para actualización',
    results,
    timestamp: new Date().toISOString()
  });
});

// Comparación de múltiples productos
app.post('/api/compare', async (req, res) => {
  const startTime = Date.now();
  const { products } = req.body;
  
  if (!products || !Array.isArray(products) || products.length === 0) {
    logger.error('Productos no proporcionados o inválidos');
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere un array de productos' 
    });
  }

  if (products.length > 10) {
    logger.error('Demasiados productos (máximo 10)');
    return res.status(400).json({ 
      success: false, 
      error: 'Máximo 10 productos por comparación' 
    });
  }

  logger.info(`Iniciando comparación de ${products.length} productos`);

  try {
    const results = [];
    const errors = [];
    const quantities = [];

    // Procesar productos en paralelo
    const promises = products.map(async (product, index) => {
      const { url, quantity = 1 } = product;
      
      try {
        if (!isValidUrl(url)) {
          throw new Error('URL inválida');
        }

        const platform = getPlatformFromUrl(url);
        if (!platform) {
          throw new Error('Plataforma no soportada');
        }

        // Verificar caché primero
        const cachedData = productCache.get(url);
        if (cachedData) {
          logger.info(`✓ Cache hit: ${index + 1}/${products.length}: ${url}`);
          return {
            url: url,
            platform,
            data: cachedData,
            validation: validateScrapedData(cachedData),
            success: true,
            quantity,
            fromCache: true,
            ttl: productCache.getTTL(url)
          };
        }

        logger.info(`Procesando ${index + 1}/${products.length}: ${url}`);

        let scrapedData;
        switch (platform) {
          case 'aliexpress':
            scrapedData = await scrapeAliExpress(url);
            break;
          case 'amazon':
            scrapedData = await scrapeAmazon(url);
            break;
          case 'ebay':
            scrapedData = await scrapeEbay(url);
            break;
          default:
            throw new Error(`Plataforma no implementada: ${platform}`);
        }

        // Limpiar datos
        const cleanedData = {
          ...scrapedData,
          Producto: cleanTitle(scrapedData.Producto),
          Precio: cleanPrice(scrapedData.Precio)
        };

        // Guardar en caché
        productCache.set(url, cleanedData);
        logger.success(`✓ Cache set: ${url}`);

        return {
          url: url,
          platform,
          data: cleanedData,
          validation: validateScrapedData(cleanedData),
          success: true,
          quantity,
          fromCache: false
        };

      } catch (error) {
        logger.error(`Error procesando ${url}: ${error.message}`);
        return {
          url: url,
          platform: getPlatformFromUrl(url) || 'unknown',
          error: error.message,
          success: false,
          quantity
        };
      }
    });

    const allResults = await Promise.all(promises);
    
    // Separar éxitos y errores
    allResults.forEach(result => {
      if (result.success) {
        results.push(result);
        quantities.push(result.quantity);
      } else {
        errors.push(result);
        quantities.push(result.quantity);
      }
    });

    const duration = Date.now() - startTime;

    logger.success(`Comparación completada en ${duration}ms`);
    logger.info(`Éxitos: ${results.length}, Errores: ${errors.length}`);

    res.json({
      success: true,
      totalUrls: products.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      quantities,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error en comparación: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    availableEndpoints: [
      'GET /health',
      'POST /api/compare',
      'POST /api/cache/clear',
      'POST /api/cache/refresh'
    ]
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  logger.error(`Error no manejado: ${error.message}`);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: error.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.success(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  logger.info(`⚖️ Comparador: http://localhost:${PORT}/api/compare`);
  logger.info(`🌐 Frontend: http://localhost:${PORT}`);
}); 