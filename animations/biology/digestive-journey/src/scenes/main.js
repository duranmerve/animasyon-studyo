// ============================================================
//  BOOT — load the character, then start
// ============================================================
loadAvatar().then(boot).catch(e => {
  console.error(e);
  $('err').style.display = 'flex';
  $('err').textContent = 'Karakter modeli yüklenemedi. Sayfayı yenileyip tekrar deneyin. (' + (e && e.message || e) + ')';
});
