# Mod seçimi ve kanıt düzeyleri

Araştırma: 11 Ekim 2026. Cihazın mod kataloğu ile Cookidoo kişisel tarif editörü ayrı yeteneklerdir. Yazılım, model, hesap ve bölge değiştikçe canlı editörü tekrar kontrol et.

## İşe göre mod seç

| Mod | Tarif içindeki kullanım | Dikkat / erişim |
|---|---|---|
| Hamur yoğurma / Teig kneten | Ekmek, brioche, pizza, makarna hamuru | `DOUGH`; süre, ısıtmasız. TM7 kabı 60°C altında olmalı; bu eşik mayanın ideal sıcaklığı değildir. |
| Püre / Pürieren | Çorba, püre, sos | `BLEND`; sıcak içeriğe ilişkin modelin kapak/hız kurallarını uygula. |
| Turbo | Kısa darbelerle doğrama | `TURBO`; sıcak karışım için kullanma; TM7'de 60°C üstünde devre dışı. |
| Isıtma / Erwärmen | Mevcut yiyeceği yeniden ısıtma | `WARM_UP`; mayayı süreyle 37°C'de karıştırmak için manuel TTS daha uygundur. Sıcak tutma ile aynı amaç değildir. |
| Pirinç / Reis kochen | Uygun tahılı otomatik pişirme | `RICE_COOKER`; çeşide göre resmî su/miktar yönergesi gerekir. |
| Buharda pişirme / Dampfgaren | Varoma ile sebze, balık, katmanlı yemek | Editörde `STEAMING` gözlendi; sıvı, süre, buhar delikleri ve aksesuarı tarifte belirt. |
| Kavurma / Anbraten | Modelin izin verdiği kavurma | TM7 editöründe `BROWNING` gözlendi. Kullanıcı TM6'da tarif üzerinden kavurmayı test ettiğini bildirdi; bu, belirli API kodunun doğrulanması değildir. Hedef modelin kabul ettiği gerçek annotation'ı incele. |
| Açık pişirme / Offenes Kochen | TM7'de kapağı açık, bıçak dönmeden pişirme | Cihaz modu; bu API'de kodu doğrulanmadı. Normal TTS'de kapaksız işlem taklidi yapma. |
| Yumurta / Eier kochen | İstenen kıvamda yumurta | Cihazda mevcut; kişisel tarif kodu doğrulanmadı. |
| Su ısıtma / Wasser erhitzen | Hedef sıcaklığa su hazırlama | Cihazda mevcut; kişisel tarif kodu doğrulanmadı. |
| Koyulaştırma / Andicken | Nişastalı sos, krema | Cihazda mevcut; kişisel tarif kodu doğrulanmadı. |
| Slow Cooking | Uzun ve nazik pişirme | Süre, sıvı ve gerekiyorsa bıçak koruyucu gereksinimini kaynaktan kontrol et. Kod doğrulanmadı. |
| Sous-vide | Kontrollü su banyosu | Resmî gıda/süre/sıcaklık ve aksesuar yönergesini araştır; rastgele kombinasyon önerme. Kod doğrulanmadı. |
| Fermantasyon / Fermentieren | Uygun düzenekte yoğurt veya mayalandırma | Kabın içinde hamur hacmi ve düzenek uygunluğunu kontrol et. Ekmekte mutlaka bu modu kullanmak gerekmez. Kod doğrulanmadı. |
| Ön temizleme / Vorspülen | Pişirme sonrasında kabı temizleme | Yemek pişirme adımı değildir; isteğe bağlı işlem sonrası not. |
| Soyma, rendeleme, dilimleme, spiral kesme | Uyumlu aksesuarla sebze hazırlama | Peeler/Cutter/Spiralizer uyumluluğunu ve kullanıcının aksesuarını doğrula. Kodlar doğrulanmadı. |
| Sensor | Uyumlu sensörle hedef pişme izlemi | Sensör ve uygun tarif gerektirir; süreyi otomatik olarak doğru kılmaz. |
| Şeker aşamaları | Karamel gibi özel işlemler | Resmî kaynak yalnızca Guided Cooking erişimini belirtir; kişisel tarifte kilidi taklit etme. |
| Manuel pişirme | Tartma, doğrama, karıştırma, sıcaklık-süre-hız işlemleri | `TTS`; ters yön `CCW`, kaşık hızı `soft`. Manuel fonksiyon her zaman ayrı özel mod değildir. |

## Bu repoda uygulanan mod sözleşmesi

Canlı Cookidoo editörünün yayımladığı `pl-customer-recipes-1.174.12` betiğinde `getAnnotationType`, `getAnnotationName`, `getAnnotationData` incelendi. Resmî destek metinleri eski olabilir: 2025 tarihli bir sayfa özel mod eklemeyi dışlarken başka sayfa ithal edilmiş dört modu tanıyor. Mevcut JS yedi kod gösteriyor; bu, her hesap/modelin yedisini kabul edeceğinin garantisi değildir.

Kod doğrulaması `src/modes.js` içindedir. `DOUGH` 1–1200 saniye; `BLEND` 10–300 saniye ve 6–8 arası editördeki yarım hızlar; `TURBO` 0,5/1/2 saniye; `WARM_UP` editördeki 37–90°C seçenekleri ve soft/1/2; `RICE_COOKER` parametresiz. `STEAMING` şu an yalnızca doğrulanmış `Varoma` aksesuarı ile; `BROWNING` yalnızca doğrulanmış `Gentle` gücüyle uygulanır. Diğer aksesuar/güç seçeneklerini tahmin etme. Turbo darbe sayısı gibi model özel alanları bu sürümde uygulanmadı.

## Kaynaklar

- [Vorwerk TM7 mod kataloğu](https://support-gb.vorwerk.com/hc/en-gb/related/click?data=BAh7CjobZGVzdGluYXRpb25fYXJ0aWNsZV9pZGwrCBy68t7TEDoYcmVmZXJyZXJfYXJ0aWNsZV9pZGwrCJyM%2B07TEDoLbG9jYWxlSSIKZW4tZ2IGOgZFVDoIdXJsSSJYL2hjL2VuLWdiL2FydGljbGVzLzE4NTAyMTY0NTkzMTgwLVdoYXQtbW9kZXMtYXJlLWF2YWlsYWJsZS1vbi10aGUtbmV3LVRoZXJtb21peC1UTTcGOwhUOglyYW5raQk%3D--ecb2b6bb37c94c13d9bf9836808038645e15e7b4): modların ve aksesuarların kapsamı.
- [Vorwerk TM7 işlevleri](https://globalsupport.vorwerk.com/hc/en-us/articles/22779771378076-What-to-know-about-functionalities-and-modes-of-TM7): dough/turbo sıcaklık kısıtları, ısıtma ve sıcak tutma ayrımı.
- [Kişisel tarif ve cihaz](https://support-gb.vorwerk.com/hc/en-gb/articles/18203509519772-My-Created-recipes-and-my-Thermomix-device): ithal modların tanınması, TM5 sınırlaması.
- [Tarif öğeleri ekleme](https://support-gb.vorwerk.com/hc/en-gb/articles/18203542577948-Create-Add-elements-to-your-recipes): 2025 tarihli eski düzenleyici kısıtları; güncel canlı arayüzle birlikte değerlendir.
- [Resmî brioche burger ekmeği](https://cookidoo.thermomix.com/recipes/recipe/en-US/r401992): malzeme ve model karşılaştırması; açık web sayfasında hazırlık adımları bulunmadığından tam yöntem doğrulanmadı.
- [İncelenen editör betiği](https://patternlib-all.prod.external.eu-tm-prod.vorwerk-digital.com/pl-customer-recipes-1.174.12-988133d81eeef67f13c3aac8115b0475.js): özel MODE kodları ve veri alanları, 11 Ekim 2026.

Canlı kayıt doğrulaması: DOUGH annotation gönderimi kabul edildi; Cookidoo GET yanıtında ad `dough` olarak normalize edildi. Bu repo okuma katmanında adı yeniden büyük harfe çevirir. Sütlü ve quarklı brioche tariflerinde ikişer 180 saniyelik gerçek MODE adımı kaydedildi. Diğer altı modun canlı hesaba yazılması bu çalışma kapsamında denenmedi; şema testleri canlı cihaz doğrulaması yerine geçmez.

## Kullanıcının cihaz testi

11 Ekim 2026: Kullanıcının hem TM6 hem TM7 cihazı var. Kullanıcı, TM6’da tarif üzerinden yüksek sıcaklıkta kavurmayı çalıştırıp test ettiğini bildirdi. Bu gözlemi geçerli kullanıcı kanıtı olarak dikkate al. Test edilen tarif kimliği, annotation kodu ve firmware sürümü verilmediği için bunu `BROWNING` kodunun TM6’da doğrulanması veya bütün tariflerin otomatik uyumluluğu olarak sunma. Resmî belgelerdeki Guided Cooking kısıtıyla kullanıcının gözlemini birlikte açıkla.
