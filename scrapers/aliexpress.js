const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const Logger = require('../utils/logger');

// Crear logger para AliExpress
const logger = new Logger('ALIEXPRESS');

// --- Funciones específicas de AliExpress ---

function extractCompany() {
  return 'AliExpress';
}

function extractUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (error) {
    return url;
  }
}

// =============================================================================
// FUNCIÓN ESTABLE PARA EXTRACCIÓN DE PRECIOS DE ALIEXPRESS
// ⚠️  NO MODIFICAR - FUNCIONANDO CORRECTAMENTE
// =============================================================================
function extractDataFromUrl(url) {
  logger.debug('Extrayendo datos desde URL...');
  
  const data = {
    precio: 'No encontrado',
    moneda: 'USD',
    precioOriginal: 'No encontrado',
    descuento: null,
    itemId: null,
    categoria: null
  };
  
  try {
    // Extraer Item ID
    const itemIdMatch = url.match(/\/item\/(\d+)\.html/);
    if (itemIdMatch) {
      data.itemId = itemIdMatch[1];
      logger.success(`Item ID extraído: ${data.itemId}`);
    }
    
    // Buscar el parámetro pdp_npi que contiene el precio
    const pdpNpiMatch = url.match(/pdp_npi=[^&]+/);
    if (pdpNpiMatch) {
      const pdpNpi = decodeURIComponent(pdpNpiMatch[0]);
      logger.debug('Parámetro pdp_npi encontrado:', pdpNpi);
      
      // MÉTODO PRINCIPAL - NO MODIFICAR
      // El formato es: pdp_npi=4@dis!USD!161.23!161.23!!1151.66!1151.66!@...
      // Estructura: 4@dis!USD!precio_actual!precio_final_con_descuento!!precio_original!precio_original!@...
      logger.debug('Analizando pdp_npi:', pdpNpi);
      
      const priceMatch = pdpNpi.match(/USD!([0-9.]+)!([0-9.]+)!!([0-9.]+)!([0-9.]+)!/);
      logger.debug('Resultado del regex:', priceMatch);
      
      if (priceMatch) {
        const precioActual = priceMatch[1];
        const precioFinalConDescuento = priceMatch[2]; // Este es el precio final que queremos
        const precioOriginal = priceMatch[3];
        
        logger.debug('Precios extraídos:');
        logger.debug(`  - Precio actual: ${precioActual}`);
        logger.debug(`  - Precio final con descuento: ${precioFinalConDescuento}`);
        logger.debug(`  - Precio original: ${precioOriginal}`);
        
        // Usar el segundo precio (precio final con descuento)
        data.precio = precioFinalConDescuento;
        data.precioOriginal = precioOriginal;
        
        // Calcular descuento si hay diferencia entre precio original y precio final
        if (parseFloat(precioOriginal) > parseFloat(precioFinalConDescuento)) {
          const descuentoPorcentaje = ((parseFloat(precioOriginal) - parseFloat(precioFinalConDescuento)) / parseFloat(precioOriginal) * 100).toFixed(0);
          data.descuento = `${descuentoPorcentaje}%`;
          logger.success(`Descuento calculado: ${data.descuento}`);
        }
        
        logger.success(`Precio final (con descuento): USD ${data.precio}`);
        logger.success(`Precio original: USD ${data.precioOriginal}`);
        logger.debug(`Precio sin descuento: USD ${precioActual}`);
      } else {
        logger.warning('No se pudo extraer precios del pdp_npi');
        logger.debug('Intentando regex alternativo...');
        
        // MÉTODO ALTERNATIVO - NO MODIFICAR
        // Regex alternativo más flexible que funciona como fallback
        const altPriceMatch = pdpNpi.match(/USD!([0-9.]+)!([0-9.]+)/);
        if (altPriceMatch) {
          logger.debug('Regex alternativo exitoso:', altPriceMatch);
          data.precio = altPriceMatch[2];
          data.precioOriginal = altPriceMatch[1];
          logger.success(`Precio extraído (alternativo): USD ${data.precio}`);
        }
      }
    }
    
    return data;
  } catch (error) {
    logger.error(`Error extrayendo datos desde URL: ${error.message}`);
    return data;
  }
}

// =============================================================================
// FUNCIÓN MEJORADA PARA EXTRACCIÓN DESDE META TAGS
// ✅ FUNCIÓN MEJORADA - CON MODO MANUAL PARA CAPTCHA
// =============================================================================
async function extractTitleAndImageFromMetaTags(url) {
  logger.debug('Extrayendo título e imagen desde meta tags...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false, // Cambiar a false para modo visible
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configuración anti-bot mejorada
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    
    // Configurar viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    logger.info(`Navegando a: ${url}`);
    
    // Navegar con timeout más largo y esperar a que la página esté completamente cargada
    await page.goto(url, { 
      waitUntil: 'networkidle0', // Esperar hasta que no haya actividad de red
      timeout: 60000 // 60 segundos de timeout
    });
    
    // Esperar un poco más para asegurar que todo esté cargado
    await page.waitForTimeout(5000);
    
    let html = await page.content();
    let $ = cheerio.load(html);
    
    logger.debug('HTML obtenido, analizando meta tags...');
    
    // DETECTAR SI HAY CAPTCHA - Función más robusta
    function detectCaptcha($) {
      const bodyText = $('body').text().toLowerCase();
      const pageTitle = $('title').text().toLowerCase();
      
      const captchaIndicators = [
        'captcha',
        'verify',
        'robot',
        'security check',
        'human verification',
        'please verify',
        'prove you are human',
        'security verification'
      ];
      
      return captchaIndicators.some(indicator => 
        bodyText.includes(indicator) || pageTitle.includes(indicator)
      );
    }
    
    let hasCaptcha = detectCaptcha($);
    
    if (hasCaptcha) {
      logger.warning('CAPTCHA DETECTADO - Abriendo navegador para resolución manual');
      logger.info('Por favor, completa el CAPTCHA manualmente en el navegador que se abrió');
      logger.info('El scraper esperará hasta que el CAPTCHA esté resuelto...');
      
      // Esperar hasta que el CAPTCHA esté resuelto (máximo 5 minutos)
      const maxWaitTime = 5 * 60 * 1000; // 5 minutos
      const startTime = Date.now();
      
      while (hasCaptcha && (Date.now() - startTime) < maxWaitTime) {
        logger.debug('Esperando resolución del CAPTCHA...');
        await page.waitForTimeout(15000); // Esperar 15 segundos
        
        try {
          // Recargar el contenido de la página
          html = await page.content();
          $ = cheerio.load(html);
          
          // Verificar si aún hay CAPTCHA
          hasCaptcha = detectCaptcha($);
          
          if (!hasCaptcha) {
            logger.success('CAPTCHA resuelto exitosamente - Continuando con extracción');
            // Esperar un poco más para que la página se estabilice
            await page.waitForTimeout(3000);
            html = await page.content();
            $ = cheerio.load(html);
          }
        } catch (error) {
          logger.warning(`Error verificando CAPTCHA: ${error.message}`);
          // Continuar esperando
        }
      }
      
      if (hasCaptcha) {
        logger.error('Tiempo de espera agotado para CAPTCHA - Devolviendo "No encontrado"');
        await browser.close();
        return { titulo: 'No encontrado', imagen: 'No encontrada', captcha: true };
      }
    }
    
    // Extraer título desde meta tags con logging detallado
    let titulo = '';
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const titleTag = $('title').text();
    
    logger.debug('Meta tags encontrados:');
    logger.debug(`  - og:title: ${ogTitle ? `"${ogTitle}"` : 'No encontrado'}`);
    logger.debug(`  - twitter:title: ${twitterTitle ? `"${twitterTitle}"` : 'No encontrado'}`);
    logger.debug(`  - title tag: ${titleTag ? `"${titleTag}"` : 'No encontrado'}`);
    
    if (ogTitle) {
      titulo = ogTitle.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      logger.success(`Título encontrado en og:title: "${titulo}"`);
    } else if (twitterTitle) {
      titulo = twitterTitle.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      logger.success(`Título encontrado en twitter:title: "${titulo}"`);
    } else if (titleTag) {
      titulo = titleTag.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      logger.success(`Título encontrado en title tag: "${titulo}"`);
    } else {
      logger.warning('No se encontró ningún título');
      titulo = 'No encontrado';
    }
    
    // Extraer imagen desde meta tags con logging detallado
    let imagen = '';
    const ogImage = $('meta[property="og:image"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    
    logger.debug('Meta tags de imagen encontrados:');
    logger.debug(`  - og:image: ${ogImage ? `"${ogImage}"` : 'No encontrado'}`);
    logger.debug(`  - twitter:image: ${twitterImage ? `"${twitterImage}"` : 'No encontrado'}`);
    
    if (ogImage) {
      imagen = ogImage;
      logger.success(`Imagen encontrada en og:image: "${imagen}"`);
    } else if (twitterImage) {
      imagen = twitterImage;
      logger.success(`Imagen encontrada en twitter:image: "${imagen}"`);
    } else {
      logger.warning('No se encontró ninguna imagen');
      imagen = 'No encontrada';
    }
    
    await browser.close();
    
    logger.debug('Resultado final:');
    logger.debug(`  - Título: ${titulo ? `"${titulo}"` : 'Vacío'}`);
    logger.debug(`  - Imagen: ${imagen ? `"${imagen}"` : 'Vacía'}`);
    
    return { titulo, imagen, captcha: false };
    
  } catch (error) {
    logger.error(`Error extrayendo desde meta tags: ${error.message}`);
    return { titulo: 'No encontrado', imagen: 'No encontrada', captcha: false };
  }
}

// =============================================================================
// SCRAPER PRINCIPAL DE ALIEXPRESS - VERSIÓN SIN HARCODEADO
// ✅ FUNCIÓN INTELIGENTE - SIN FALLBACK HARCODEADO
// =============================================================================
async function scrapeAliExpress(url) {
  logger.info('=== INICIANDO SCRAPER ALIEXPRESS INTELIGENTE ===');
  
  try {
    // Extraer datos desde URL (método más confiable)
    const urlData = extractDataFromUrl(url);
    
    // OBTENER DESDE META TAGS
    logger.debug('Extrayendo desde meta tags...');
    const metaData = await extractTitleAndImageFromMetaTags(url);
    
    let producto, imagen;
    
    if (metaData.captcha) {
      // CAPTCHA NO RESUELTO - DEVOLVER "NO ENCONTRADO"
      logger.warning('Captcha no resuelto, devolviendo "No encontrado"');
      producto = 'No encontrado';
      imagen = 'No encontrada';
    } else {
      // Usar datos de meta tags si están disponibles
      producto = metaData.titulo;
      imagen = metaData.imagen;
      logger.success(`Título desde meta tags: "${producto}"`);
      logger.success(`Imagen desde meta tags: "${imagen}"`);
    }
    
    logger.success(`Precio desde URL: USD ${urlData.precio}`);
    
    // Delay simulado para mantener consistencia
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      Producto: producto,
      Empresa: extractCompany(),
      Precio: urlData.precio,
      Moneda: urlData.moneda,
      PrecioOriginal: urlData.precioOriginal,
      Descuento: urlData.descuento,
      ItemId: urlData.itemId,
      Categoria: 'Ice Hockey Equipment',
      Imagen: imagen,
      Url: extractUrl(url)
    };

  } catch (error) {
    logger.error('Error en scraping AliExpress:', error);
    
    // Fallback con datos básicos
    const urlData = extractDataFromUrl(url);
    
    return {
      Producto: 'No encontrado',
      Empresa: extractCompany(),
      Precio: urlData.precio,
      Moneda: urlData.moneda,
      PrecioOriginal: urlData.precioOriginal,
      Descuento: urlData.descuento,
      ItemId: urlData.itemId,
      Categoria: 'Ice Hockey Equipment',
      Imagen: 'No encontrada',
      Url: extractUrl(url)
    };
  }
}

// =============================================================================
// EXPORTACIÓN - NO MODIFICAR
// =============================================================================
module.exports = { scrapeAliExpress };

// =============================================================================
// NOTA IMPORTANTE:
// Este archivo está funcionando correctamente. 
// 
// FUNCIONES PROTEGIDAS (NO MODIFICAR):
// - extractDataFromUrl() - Extracción de precios desde URL
// 
// FUNCIONES ACTIVAS:
// - extractTitleAndImageFromMetaTags() - Extracción desde meta tags con resolución manual de CAPTCHA
// - scrapeAliExpress() - Función principal inteligente
// 
// COMPORTAMIENTO ACTUAL:
// - Intenta extraer datos desde meta tags (og:title, og:image)
// - Si detecta CAPTCHA, abre navegador visible y espera resolución manual (máximo 5 minutos)
// - Si el CAPTCHA se resuelve, continúa con la extracción normal
// - Si el CAPTCHA no se resuelve en tiempo, devuelve "No encontrado"
// - Si no encuentra meta tags, devuelve "No encontrado"
// - Los precios siempre se extraen desde URL (método confiable)
// ============================================================================= 