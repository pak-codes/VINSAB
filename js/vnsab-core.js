'use strict';

// ============================================================================
// VNSAB - VİDEO NETWORK SECURITY AD BLOCKER
// Sadece belirli sitelerde reklam engelleme sistemi
// ============================================================================

console.log('[VNSAB] 🎬 Yükleniyor (v3.0-FINAL)...');

// ============================================================================
// HEDEF DOMAIN LİSTESİ
// ============================================================================

const TARGET_DOMAINS = new Set([
    // Video Platformları
    'youtube.com',
    'youtu.be',
    
    // Sosyal Medya
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'reddit.com',
    
    // Türk Medya Siteleri
    'sozcu.com.tr',
    'haberturk.com',
    'hurriyet.com.tr',
    'milliyet.com.tr',
    'ntv.com.tr',
    
    // Arama Motorları
    'google.com',
    'bing.com',
    'yandex.com',
    
    // Diğer platformlar
    'twitch.tv',
    'netflix.com',
    'amazon.com'
]);

// ============================================================================
// HEDEF SİTE KONTROLÜ - GLOBAL FONKSİYON
// ============================================================================

function shouldBlockDomain(hostname) {
    if (!hostname) return false;
    
    // LOCALHOST KORUMASI - Local development asla engellenmez
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname === '[::1]' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.endsWith('.local')) {
        return false;
    }
    
    hostname = hostname.toLowerCase();
    const domainParts = hostname.split('.');
    
    // 1. Direkt eşleşme (youtube.com)
    if (TARGET_DOMAINS.has(hostname)) {
        return true;
    }
    
    // 2. Subdomain kontrolü (www.youtube.com, m.youtube.com)
    if (domainParts.length >= 2) {
        const baseDomain = domainParts.slice(-2).join('.');
        if (TARGET_DOMAINS.has(baseDomain)) {
            return true;
        }
    }
    
    // 3. Özel TLD kontrolü (sozcu.com.tr)
    if (domainParts.length >= 3) {
        const longDomain = domainParts.slice(-3).join('.');
        if (TARGET_DOMAINS.has(longDomain)) {
            return true;
        }
    }
    
    return false;
}

// ⚠️⚠️⚠️ KRİTİK: Bu fonksiyonu HEMEN global yap!
// vapi-background.js bu fonksiyonu kullanacak
window.VNSAB_shouldBlockDomain = shouldBlockDomain;

// HEMEN doğrula
console.log('[VNSAB] ✅ window.VNSAB_shouldBlockDomain SET EDİLDİ');
console.log('[VNSAB] 🧪 Test: typeof window.VNSAB_shouldBlockDomain =', typeof window.VNSAB_shouldBlockDomain);
console.log('[VNSAB] 🧪 Test: youtube.com =', window.VNSAB_shouldBlockDomain('youtube.com'));
console.log('[VNSAB] 🧪 Test: github.com =', window.VNSAB_shouldBlockDomain('github.com'));

console.log('[VNSAB] ✅ Hedef site kontrolü aktif');
console.log('[VNSAB] 🎯 Hedef domain sayısı:', TARGET_DOMAINS.size);

// ============================================================================
// ZARALI DOMAIN TESPİT SİSTEMİ (Ekstra koruma)
// ============================================================================

const MALICIOUS_PATTERNS = {
    domains: [
        'doubleclick.net',
        'googlesyndication.com',
        'googleadservices.com',
        'facebook.net',
        'fbcdn.net'
    ],
    
    patterns: [
        /(ads?|advert|promo|reklam)\./i,
        /(track|analytics|pixel|stats)\./i,
        /(doubleclick|adsystem|adserver)/i
    ]
};

function isMaliciousDomain(hostname) {
    if (!hostname) return false;
    hostname = hostname.toLowerCase();
    
    // 1. Direkt zararlı domain
    for (const domain of MALICIOUS_PATTERNS.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
            return true;
        }
    }
    
    // 2. Pattern eşleşmesi
    for (const pattern of MALICIOUS_PATTERNS.patterns) {
        if (pattern.test(hostname)) {
            return true;
        }
    }
    
    // 3. Runtime blacklist
    if (window.VNSAB_BLACKLIST && window.VNSAB_BLACKLIST.has(hostname)) {
        return true;
    }
    
    return false;
}

// ============================================================================
// YÖNETİM ARAYÜZÜ
// ============================================================================

const VNSABManager = {
    // Yeni domain ekle
    addDomain(domain) {
        const cleanDomain = domain.toLowerCase().trim();
        if (cleanDomain && !TARGET_DOMAINS.has(cleanDomain)) {
            TARGET_DOMAINS.add(cleanDomain);
            console.log(`[VNSAB] ➕ Eklendi: ${cleanDomain} (Toplam: ${TARGET_DOMAINS.size})`);
            
            // Storage'a kaydet
            this.saveDomains();
            return true;
        }
        return false;
    },
    
    // Domain kaldır
    removeDomain(domain) {
        const cleanDomain = domain.toLowerCase().trim();
        if (TARGET_DOMAINS.delete(cleanDomain)) {
            console.log(`[VNSAB] ➖ Kaldırıldı: ${cleanDomain} (Toplam: ${TARGET_DOMAINS.size})`);
            
            // Storage'a kaydet
            this.saveDomains();
            return true;
        }
        return false;
    },
    
    // Tüm domainleri listele
    listDomains() {
        return Array.from(TARGET_DOMAINS).sort();
    },
    
    // Test et
    testDomain(domain) {
        const isTarget = shouldBlockDomain(domain);
        const isMalicious = isMaliciousDomain(domain);
        
        console.log(`
╔══════════════════════════════════════════
║ 🧪 VNSAB Test: ${domain}
║ 
║ Hedef Site: ${isTarget ? '✅ EVET (reklam engelleme AKTİF)' : '❌ HAYIR (normal tarayıcı gibi)'}
║ Zararlı: ${isMalicious ? '⚠️ EVET' : '✅ Hayır'}
╚══════════════════════════════════════════
        `);
        
        return { isTarget, isMalicious };
    },
    
    // İstatistikler
    getStats() {
        return {
            version: '3.0-FINAL',
            targetCount: TARGET_DOMAINS.size,
            domains: this.listDomains(),
            maliciousPatterns: MALICIOUS_PATTERNS.domains.length,
            uBlockIntegrated: typeof µBlock !== 'undefined'
        };
    },
    
    // Zararlı domain ekle (runtime)
    addMaliciousDomain(domain) {
        if (!window.VNSAB_BLACKLIST) {
            window.VNSAB_BLACKLIST = new Set();
        }
        window.VNSAB_BLACKLIST.add(domain.toLowerCase());
        console.log(`[VNSAB] ⚠️ Zararlı listeye eklendi: ${domain}`);
    },
    
    // Domainleri storage'a kaydet
    async saveDomains() {
        try {
            await browser.storage.local.set({
                vnsab_target_domains: Array.from(TARGET_DOMAINS)
            });
            console.log('[VNSAB] 💾 Domainler kaydedildi');
        } catch (error) {
            console.error('[VNSAB] ❌ Kaydetme hatası:', error);
        }
    },
    
    // Domainleri storage'dan yükle
    async loadDomains() {
        try {
            const data = await browser.storage.local.get('vnsab_target_domains');
            if (data.vnsab_target_domains && Array.isArray(data.vnsab_target_domains)) {
                data.vnsab_target_domains.forEach(domain => TARGET_DOMAINS.add(domain));
                console.log(`[VNSAB] 📂 ${data.vnsab_target_domains.length} domain yüklendi`);
            }
        } catch (error) {
            console.error('[VNSAB] ❌ Yükleme hatası:', error);
        }
    }
};

// ============================================================================
// BAŞLANGLIÇ
// ============================================================================

// Global erişim
window.VNSAB = VNSABManager;

// Kaydedilmiş domainleri yükle
VNSABManager.loadDomains().then(() => {
    console.log(`
╔═══════════════════════════════════════════╗
║       ✅ VNSAB v3.0-FINAL HAZIR!         ║
║                                           ║
║  🎯 Hedef Domain: ${TARGET_DOMAINS.size.toString().padStart(3)} adet              ║
║  🔥 Mod: Sadece hedef sitelerde engelle   ║
║  💡 Diğer siteler: Normal tarayıcı        ║
║  🛡️  Zararlı filtre: ${MALICIOUS_PATTERNS.domains.length} pattern               ║
║                                           ║
║  📝 Kullanım:                             ║
║     VNSAB.testDomain('youtube.com')      ║
║     VNSAB.addDomain('example.com')       ║
║     VNSAB.removeDomain('example.com')    ║
║     VNSAB.getStats()                     ║
╚═══════════════════════════════════════════╝
    `);
    
    // Test yap
    console.log('[VNSAB] 🧪 Otomatik Test:');
    console.log('  youtube.com:', shouldBlockDomain('youtube.com') ? '✅' : '❌');
    console.log('  github.com:', shouldBlockDomain('github.com') ? '✅ (YANLIŞ!)' : '❌ (DOĞRU)');
});

// Debug: Hangi listener'ların aktif olduğunu göster
setTimeout(() => {
    console.log('[VNSAB] 🔍 Debug Bilgisi:');
    console.log('  - vapi-background.js hedef kontrolü kullanıyor: ✅');
    console.log('  - shouldBlockDomain global: ✅');
    console.log('  - uBlock entegrasyonu:', typeof µBlock !== 'undefined' ? '✅' : '⏳ Bekleniyor...');
}, 2000);
