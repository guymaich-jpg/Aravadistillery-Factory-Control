// Apply stored language/direction before first paint to avoid flash
(function() {
  var lang = localStorage.getItem('factory_lang') || 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  // Apply stored theme (or system default) before paint to prevent flash
  var storedTheme = localStorage.getItem('factory_theme');
  if (storedTheme) {
    document.documentElement.setAttribute('data-theme', storedTheme);
  } else {
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
  var storedPalette = localStorage.getItem('factory_palette');
  if (storedPalette) {
    document.documentElement.setAttribute('data-palette', storedPalette);
  }
})();
