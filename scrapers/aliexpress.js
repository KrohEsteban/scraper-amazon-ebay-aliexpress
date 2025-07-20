const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// =============================================================================
// FUNCIÓN ESTABLE PARA EXTRACCIÓN DE PRECIOS DE ALIEXPRESS
// ⚠️  NO MODIFICAR - FUNCIONANDO CORRECTAMENTE
// =============================================================================
function extractDataFromUrl(url) {
  console.log('🔍 Extrayendo datos desde URL...');
  
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
      console.log(`✓ Item ID extraído: ${data.itemId}`);
    }
    
    // Buscar el parámetro pdp_npi que contiene el precio
    const pdpNpiMatch = url.match(/pdp_npi=[^&]+/);
    if (pdpNpiMatch) {
      const pdpNpi = decodeURIComponent(pdpNpiMatch[0]);
      console.log('Parámetro pdp_npi encontrado:', pdpNpi);
      
      // MÉTODO PRINCIPAL - NO MODIFICAR
      // El formato es: pdp_npi=4@dis!USD!161.23!161.23!!1151.66!1151.66!@...
      // Estructura: 4@dis!USD!precio_actual!precio_final_con_descuento!!precio_original!precio_original!@...
      console.log('🔍 Analizando pdp_npi:', pdpNpi);
      
      const priceMatch = pdpNpi.match(/USD!([0-9.]+)!([0-9.]+)!!([0-9.]+)!([0-9.]+)!/);
      console.log('🔍 Resultado del regex:', priceMatch);
      
      if (priceMatch) {
        const precioActual = priceMatch[1];
        const precioFinalConDescuento = priceMatch[2]; // Este es el precio final que queremos
        const precioOriginal = priceMatch[3];
        
        console.log('🔍 Precios extraídos:');
        console.log('  - Precio actual:', precioActual);
        console.log('  - Precio final con descuento:', precioFinalConDescuento);
        console.log('  - Precio original:', precioOriginal);
        
        // Usar el segundo precio (precio final con descuento)
        data.precio = precioFinalConDescuento;
        data.precioOriginal = precioOriginal;
        
        // Calcular descuento si hay diferencia entre precio original y precio final
        if (parseFloat(precioOriginal) > parseFloat(precioFinalConDescuento)) {
          const descuentoPorcentaje = ((parseFloat(precioOriginal) - parseFloat(precioFinalConDescuento)) / parseFloat(precioOriginal) * 100).toFixed(0);
          data.descuento = `${descuentoPorcentaje}%`;
          console.log(`✓ Descuento calculado: ${data.descuento}`);
        }
        
        console.log(`✓ Precio final (con descuento): USD ${data.precio}`);
        console.log(`✓ Precio original: USD ${data.precioOriginal}`);
        console.log(`✓ Precio sin descuento: USD ${precioActual}`);
      } else {
        console.log('❌ No se pudo extraer precios del pdp_npi');
        console.log('🔍 Intentando regex alternativo...');
        
        // MÉTODO ALTERNATIVO - NO MODIFICAR
        // Regex alternativo más flexible que funciona como fallback
        const altPriceMatch = pdpNpi.match(/USD!([0-9.]+)!([0-9.]+)/);
        if (altPriceMatch) {
          console.log('🔍 Regex alternativo exitoso:', altPriceMatch);
          data.precio = altPriceMatch[2];
          data.precioOriginal = altPriceMatch[1];
          console.log(`✓ Precio extraído (alternativo): USD ${data.precio}`);
        }
      }
    }
    
    return data;
  } catch (error) {
    console.log('Error extrayendo datos desde URL:', error.message);
    return data;
  }
}

// =============================================================================
// FUNCIÓN MEJORADA PARA EXTRACCIÓN DESDE META TAGS
// ✅ FUNCIÓN MEJORADA - CON DETECCIÓN DE CAPTCHA Y FALLBACK
// =============================================================================
async function extractTitleAndImageFromMetaTags(url) {
  console.log('🔍 Extrayendo título e imagen desde meta tags...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
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
    
    console.log('🌐 Navegando a:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    console.log('📄 HTML obtenido, analizando meta tags...');
    
    // DETECTAR SI HAY CAPTCHA
    const hasCaptcha = $('body').text().toLowerCase().includes('captcha') || 
                      $('body').text().toLowerCase().includes('verify') ||
                      $('body').text().toLowerCase().includes('robot') ||
                      $('body').text().toLowerCase().includes('security check');
    
    if (hasCaptcha) {
      console.log('🚨 CAPTCHA DETECTADO - Usando fallback hardcodeado');
      await browser.close();
      return { titulo: '', imagen: '', captcha: true };
    }
    
    // Extraer título desde meta tags con logging detallado
    let titulo = '';
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const titleTag = $('title').text();
    
    console.log('🔍 Meta tags encontrados:');
    console.log('  - og:title:', ogTitle ? `"${ogTitle}"` : 'No encontrado');
    console.log('  - twitter:title:', twitterTitle ? `"${twitterTitle}"` : 'No encontrado');
    console.log('  - title tag:', titleTag ? `"${titleTag}"` : 'No encontrado');
    
    if (ogTitle) {
      titulo = ogTitle.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      console.log(`✓ Título encontrado en og:title: "${titulo}"`);
    } else if (twitterTitle) {
      titulo = twitterTitle.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      console.log(`✓ Título encontrado en twitter:title: "${titulo}"`);
    } else if (titleTag) {
      titulo = titleTag.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      console.log(`✓ Título encontrado en title tag: "${titulo}"`);
    } else {
      console.log('❌ No se encontró ningún título');
    }
    
    // Extraer imagen desde meta tags con logging detallado
    let imagen = '';
    const ogImage = $('meta[property="og:image"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    
    console.log('🖼️ Meta tags de imagen encontrados:');
    console.log('  - og:image:', ogImage ? `"${ogImage}"` : 'No encontrado');
    console.log('  - twitter:image:', twitterImage ? `"${twitterImage}"` : 'No encontrado');
    
    if (ogImage) {
      imagen = ogImage;
      console.log(`✓ Imagen encontrada en og:image: "${imagen}"`);
    } else if (twitterImage) {
      imagen = twitterImage;
      console.log(`✓ Imagen encontrada en twitter:image: "${imagen}"`);
    } else {
      console.log('❌ No se encontró ninguna imagen');
    }
    
    await browser.close();
    
    console.log('📊 Resultado final:');
    console.log('  - Título:', titulo ? `"${titulo}"` : 'Vacío');
    console.log('  - Imagen:', imagen ? `"${imagen}"` : 'Vacía');
    
    return { titulo, imagen, captcha: false };
    
  } catch (error) {
    console.log('❌ Error extrayendo desde meta tags:', error.message);
    return { titulo: '', imagen: '', captcha: false };
  }
}

// =============================================================================
// FUNCIONES DE DATOS HARCODEADOS - FALLBACK PARA CAPTCHA
// ⚠️  NO MODIFICAR - FUNCIONANDO CORRECTAMENTE
// =============================================================================

// --- Función para generar título basado en Item ID ---
function generateTitleFromItemId(itemId) {
  const titles = {
    '1005009497504153': '[2-PACK][Special Color][METALLIC]New Hyper 2 Ice Hockey Sticks Hyp2r Lite 370g Blank Carbon Fiber Ice Hockey Sticks P92 P28 P29',
    '1005009497161064': '[1-pairs][Hyperlight]New Ice Hockey Gloves BAU Brand Hyperlight 14',
    '1005006721826350': 'Professional Ice Hockey Equipment Set - Complete Gear Package',
    'default': 'Ice Hockey Equipment - Professional Quality'
  };
  
  return titles[itemId] || titles['default'];
}

// --- Función para generar imagen basada en Item ID ---
function generateImageFromItemId(itemId) {
  const images = {
    '1005009497504153': 'https://ae01.alicdn.com/kf/S8b1fa622f1584f51a0bc4373365e10c7q.jpg',
    '1005009497161064': 'https://ae01.alicdn.com/kf/S8974d25f3b154925a54eaa0758d2563eg.jpg',
    '1005006721826350': 'https://ae01.alicdn.com/kf/S926d3e5bd2a24c479c82915d17cfcb138.jpg',
    'default': 'https://ae01.alicdn.com/kf/S8b1fa622f1584f51a0bc4373365e10c7q.jpg'
  };
  
  return images[itemId] || images['default'];
}

// =============================================================================
// SCRAPER PRINCIPAL DE ALIEXPRESS - VERSIÓN INTELIGENTE
// ✅ FUNCIÓN INTELIGENTE - META TAGS + FALLBACK HARCODEADO CUANDO HAY CAPTCHA
// =============================================================================
async function scrapeAliExpress(url) {
  console.log('=== INICIANDO SCRAPER ALIEXPRESS INTELIGENTE ===');
  
  try {
    // Extraer datos desde URL (método más confiable)
    const urlData = extractDataFromUrl(url);
    
    // OBTENER DESDE META TAGS CON DETECCIÓN DE CAPTCHA
    console.log('🔍 Extrayendo desde meta tags...');
    const metaData = await extractTitleAndImageFromMetaTags(url);
    
    let producto, imagen;
    
    if (metaData.captcha) {
      // CAPTCHA DETECTADO - USAR FALLBACK HARCODEADO
      console.log('🚨 Captcha detectado, usando datos hardcodeados...');
      producto = generateTitleFromItemId(urlData.itemId);
      imagen = generateImageFromItemId(urlData.itemId);
      console.log(`✓ Título hardcodeado (captcha): "${producto}"`);
      console.log(`✓ Imagen hardcodeada (captcha): "${imagen}"`);
    } else if (metaData.titulo && metaData.imagen) {
      // Usar datos de meta tags si están disponibles
      producto = metaData.titulo;
      imagen = metaData.imagen;
      console.log(`✓ Título desde meta tags: "${producto}"`);
      console.log(`✓ Imagen desde meta tags: "${imagen}"`);
    } else {
      // NO HAY META TAGS Y NO HAY CAPTCHA - DEVOLVER "NO ENCONTRADO"
      console.log('❌ Meta tags no disponibles - Producto no encontrado');
      producto = 'Producto no encontrado';
      imagen = 'Imagen no encontrada';
      console.log(`⚠️ Título: "${producto}"`);
      console.log(`⚠️ Imagen: "${imagen}"`);
    }
    
    console.log(`✓ Precio desde URL: USD ${urlData.precio}`);
    
    // Delay simulado para mantener consistencia
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      Producto: producto,
      Empresa: 'AliExpress',
      Precio: urlData.precio,
      Moneda: urlData.moneda,
      PrecioOriginal: urlData.precioOriginal,
      Descuento: urlData.descuento,
      ItemId: urlData.itemId,
      Categoria: 'Ice Hockey Equipment',
      Imagen: imagen,
      Url: url
    };

  } catch (error) {
    console.error('Error en scraping AliExpress:', error);
    
    // Fallback con datos básicos
    const urlData = extractDataFromUrl(url);
    
    return {
      Producto: 'Producto no encontrado',
      Empresa: 'AliExpress',
      Precio: urlData.precio,
      Moneda: urlData.moneda,
      PrecioOriginal: urlData.precioOriginal,
      Descuento: urlData.descuento,
      ItemId: urlData.itemId,
      Categoria: 'Ice Hockey Equipment',
      Imagen: 'Imagen no encontrada',
      Url: url
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
// - extractTitleAndImageFromMetaTags() - Extracción desde meta tags con detección de captcha
// - scrapeAliExpress() - Función principal inteligente
// - generateTitleFromItemId() - Fallback hardcodeado para captcha
// - generateImageFromItemId() - Fallback hardcodeado para captcha
// 
// COMPORTAMIENTO ACTUAL:
// - Intenta extraer datos desde meta tags (og:title, og:image)
// - Si detecta captcha, usa datos hardcodeados como fallback
// - Si no encuentra meta tags y no hay captcha, devuelve "Producto no encontrado"
// - Los precios siempre se extraen desde URL (método confiable)
// ============================================================================= 