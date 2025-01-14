// app1.js

let currentLanguage = 'ar'; // اللغة الافتراضية
let translations = {}; // تخزين الترجمات

// دالة لتحميل الترجمات
function loadTranslations() {
    fetch('translations.json') // تحميل ملف الترجمة
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load translations.json');
            }
            return response.json();
        })
        .then(data => {
            if (data.languages) {
                translations = data.languages; // تخزين الترجمات
                setLanguage(currentLanguage); // تعيين اللغة الافتراضية
                addLanguageButtonEvents(); // ربط الأحداث بالأزرار
            } else {
                console.error('Invalid translation file format. Missing "languages" key.');
            }
        })
        .catch(error => console.error('Error loading translations:', error));
}

// دالة لتحديث النصوص بناءً على اللغة
function updateText() {
    if (!translations[currentLanguage]) {
        console.error(`Translations for language "${currentLanguage}" not found.`);
        return;
    }

    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const keys = key.split('['); // دعم المفاتيح المتداخلة
        let translation = translations[currentLanguage];
        keys.forEach(k => {
            const cleanKey = k.replace(']', '');
            if (translation) translation = translation[cleanKey];
        });
        element.textContent = translation || `Missing translation for "${key}"`;
    });

    // تحديث اتجاه النص
    document.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.body.style.textAlign = currentLanguage === 'ar' ? 'right' : 'left';

    // تحديث حالة الأزرار
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
    });
}

// دالة لتغيير اللغة
function setLanguage(lang) {
    if (!translations[lang]) {
        console.error(`Language "${lang}" not supported.`);
        return;
    }

    currentLanguage = lang; // تحديث اللغة الحالية
    updateText(); // تحديث النصوص في الصفحة
}

// دالة لإضافة الأحداث للأزرار
function addLanguageButtonEvents() {
    const buttons = document.querySelectorAll('.lang-btn');

    if (buttons.length === 0) {
        console.error('No language buttons found in the DOM.');
        return;
    }

    buttons.forEach(button => {
        button.addEventListener('click', function () {
            const lang = this.getAttribute('data-lang');
            setLanguage(lang); // تغيير اللغة عند النقر
        });
    });
}

// تحميل الترجمات عند بدء التشغيل
document.addEventListener('DOMContentLoaded', () => {
    loadTranslations(); // تحميل الترجمات
});