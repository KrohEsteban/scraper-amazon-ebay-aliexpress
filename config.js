// Configuración de impuestos y conversión de moneda para Argentina
module.exports = {
    // Impuestos de importación para Argentina (50% = 0.5)
    IMPORT_TAX_RATE: 0.5,
    
    // Tasa de conversión USD a ARS (pesos argentinos)
    USD_TO_ARS_RATE: 1200,
    
    // Configuración de monedas soportadas
    SUPPORTED_CURRENCIES: {
        USD: 'Dólar Estadounidense',
        US: 'Dólar Estadounidense',
        EUR: 'Euro',
        GBP: 'Libra Esterlina'
    },
    
    // Configuración de la aplicación
    APP_CONFIG: {
        MAX_URLS: 10,
        TIMEOUT: 30000,
        VERSION: '2.1.0'
    }
}; 