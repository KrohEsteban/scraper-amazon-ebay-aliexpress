const NodeCache = require('node-cache');
const crypto = require('crypto');

class ProductCache {
    constructor() {
        // Cache con TTL de 30 minutos por defecto
        this.cache = new NodeCache({ 
            stdTTL: 1800, // 30 minutos
            checkperiod: 600, // Verificar expiración cada 10 minutos
            useClones: false // Mejor rendimiento
        });
        
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    // Generar clave única para cada URL
    generateKey(url) {
        return crypto.createHash('md5').update(url).digest('hex');
    }

    // Obtener producto del caché
    get(url) {
        const key = this.generateKey(url);
        const cached = this.cache.get(key);
        
        if (cached) {
            this.stats.hits++;
            return cached;
        }
        
        this.stats.misses++;
        return null;
    }

    // Guardar producto en caché
    set(url, data) {
        const key = this.generateKey(url);
        this.cache.set(key, {
            ...data,
            cachedAt: new Date().toISOString(),
            url: url
        });
        this.stats.sets++;
    }

    // Eliminar producto específico del caché
    delete(url) {
        const key = this.generateKey(url);
        const deleted = this.cache.del(key);
        if (deleted > 0) {
            this.stats.deletes++;
        }
        return deleted > 0;
    }

    // Limpiar todo el caché
    clear() {
        const deleted = this.cache.flushAll();
        this.stats.deletes += deleted;
        return deleted;
    }

    // Obtener estadísticas del caché
    getStats() {
        return {
            ...this.stats,
            size: this.cache.keys().length,
            keys: this.cache.keys().length,
            ttl: this.cache.getTtl(this.cache.keys()[0]) || null
        };
    }

    // Verificar si una URL está en caché
    has(url) {
        const key = this.generateKey(url);
        return this.cache.has(key);
    }

    // Obtener TTL restante de una URL
    getTTL(url) {
        const key = this.generateKey(url);
        const ttl = this.cache.getTtl(key);
        if (ttl) {
            return Math.max(0, Math.floor((ttl - Date.now()) / 1000));
        }
        return 0;
    }

    // Forzar actualización de productos específicos
    forceRefresh(urls) {
        const results = [];
        urls.forEach(url => {
            const deleted = this.delete(url);
            results.push({ url, refreshed: deleted });
        });
        return results;
    }
}

module.exports = ProductCache; 