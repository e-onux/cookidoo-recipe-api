# Tarif verisi, aktarım ve görsel

Repo API ayrıntıları için `README.md`, `src/app.js`, `src/cookidoo.js`, `src/modes.js` ve `src/image.js` esas alınır. Tarifler `recipes/` altında JSON olarak tutulur. API servis kapalıysa `npm start`; kaydedilmiş oturumla uygun olduğunda headless kullanılabilir. Etkileşimli giriş gerekirse kullanıcı tarayıcıda giriş yapar; şifre isteme. Kalıcı profili iki süreç aynı anda kullanmamalı; bir bağlantı oturumuyla oluşturma, görsel ve doğrulamayı ardışık yap.

## Adım örneği

```json
{
  "text": "Unu ekleyin. Kapağı kapatıp 3 dk/Hamur yoğurma modunda yoğurun.",
  "modes": [{"anchor": "3 dk/Hamur yoğurma", "name": "DOUGH", "timeSeconds": 180}]
}
```

Kaydedilen annotation: `{"type":"MODE","name":"DOUGH","data":{"time":180},"position":{"offset":...,"length":...}}`. `speed: dough` veya `speed: knead` yazmak eşdeğer değildir. Isıtma adımı `operations` içinde süre/sıcaklık/hız ile `TTS` olarak gönderilir. Aynı adımda farklı işaretler olabilir; birbirlerinin metin aralıklarını kaplamasın. Birincil işlem ile olası tekrarları ayır; koşullu su ekleme metnini otomatik olarak uygulanacak işlem gibi işaretleme.

## İçerik kontrolü

- Malzemeler tüm adımlarda doğru miktarlarla tüketiliyor mu? Üzeri, tezgâh, kabı yağlama ve isteğe bağlı miktarlar da listede mi?
- İkamede yalnızca isim mi değişti, yoksa su/yağ/protein ve hamur ağırlığı da değerlendirildi mi? “Süt eklenmez” ile “süt ürünü içermez” farklıdır.
- Her adımın başlangıç durumu ve bitiş ölçütü açık mı? Kabı boşaltma, kazıma, soğutma, kapak/ölçü kabı/Varoma kurulumu gerektiği yerde belirtiliyor mu?
- Cihaz ayarlarıyla fırın ayarları karıştırıldı mı? Cihaz modelinin sıcaklık ve aksesuar sınırı doğrulandı mı?
- Hazırlık ve toplam süre; bekleme, mayalanma ve soğumayı karşılıyor mu? İki tepsi sırayla pişiyorsa ek bekleme hesaba katılıyor mu?

## Kaydetme ve kurtarma

`POST /recipes`, `PATCH /recipes/:id`, ardından `POST /recipes/:id/image`. Adım veya malzeme PATCH'i tüm ilgili diziyi değiştirir. Mevcut tarifi düzenlerken önce tam ayrıntıyı oku; alakasız alanları kaybetme. Aynı başlık birden çok kez bulunursa kimliği yerel kayıtla veya içerikle belirle.

`PARTIAL_CREATE` kimliğini hemen yerel kayda yaz. Sonraki denemede aynı kimliği güncelle. Görsel işleminde ağ hatası varsa önce `GET` ile `image` alanını kontrol et; zaten kaydedilmiş olabilir. API token varsa dotenv üzerinden oku; loglama.

## Görsel

Imagegen yerleşik aracını kullanmadan önce imagegen becerisini oku. Uygun mevcut kapak kopyalanabilir; uyarlanan sonuç belirgin değişiyorsa yeni görsel oluştur. Promptu yerel kaynak notunda sakla. Yapay zekâ görseli tarifin denenmiş olduğu kanıtı değildir.

`service.uploadImage(id, {imageBase64, mimeType, imageOwnedByUser})` mevcut yardımcıyı kullanır. Dosya boyutu ve MIME içeriği doğrulanır. Cookidoo Cloudinary penceresi bir iframe'dir: sayfa düğmesi yerel dosya seçiciyi doğrudan açmaz. Yardımcı widget'ın kaydını bekler, iframe dosya inputuna yükler, kırpmayı onaylar, kaydetme PATCH yanıtını bekler. Bazı tariflerde son onay vardır, bazılarında doğrudan kayıt yapılır. Sırf onay penceresi görünmedi diye işlemi başarısız sayma. Güncel yardımcı çalışmıyorsa gözlenen arayüze göre düzelt; yeni upload endpointleri tahmin etme.

Kaydı yeniden okuyarak `image` doğrula; dönüştürme yer tutucusu içeren adresi README'deki kurala göre çöz. UI'da kapak ve başlığı birlikte gör. Hesaptaki başarı ile cihaz üzerinde pişirme başarısını ayrı raporla.
