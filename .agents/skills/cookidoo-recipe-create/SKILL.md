---
name: cookidoo-recipe-create
description: Thermomix TM7/TM6 için açık Türkçe yönergeler, gerçek cihaz modu adımları ve kapak görseliyle Cookidoo kişisel tarifleri oluşturur, uyarlar ve doğrular. Kullanıcı Cookidoo hesabına veya Thermomix cihazına tarif eklenmesini istediğinde kullan.
---

# Görselli Thermomix tarifi oluşturma

Bu repodaki `CookidooService` ve yerel API ile çalış. Repo kökünü mevcut çalışma alanından bul; makineye özgü sabit yollar yazma.

1. Kullanıcının cihazını ve elindeki malzemeleri konuşmadan belirle. Kullanıcının hem TM6 hem TM7'si vardır. Hedef modeli konuşma ve tariften belirle; farklı modelde aynı mod kodunun çalışacağını varsayma. Gerekli aksesuar bilinmiyorsa erişimi varsayma. Kopya istendiğinde özgün tarifi değiştirme.
2. [Mod rehberini](references/thermomix-modes.md) oku. Yemeğe uygun bütün mod seçeneklerini değerlendir; bir tarifte bütün modları zorla kullanma. Yoğurma gereken bir ekmekte `DOUGH` kullan; sayısal hızla taklit etme ve destekleniyorsa yalnızca “elle seçin” metniyle yetinme. Canlı editördeki model ve mod erişimini kontrol et. Desteklenmeyen modu API alanı uydurarak gönderme.
3. [Tarif ve aktarım sözleşmesini](references/recipe-workflow.md) oku. Benzer resmî Cookidoo tariflerini ve Vorwerk yönergelerini araştır. Erişilemeyen hazırlık adımlarını okumuş gibi sunma; oran karşılaştırması ile doğrulanmış cihaz ayarını ayır. Kaynakları ve doğrulama tarihini yerel bir kaynak notuna yaz. Uyarlamanın mutfakta denenmiş olduğunu iddia etme.
4. Malzeme listesi ile adımları birlikte hazırla. Gram, sıcaklık, süre, hız/mod, kapak ve aksesuar kullanımını açıkça belirt. Aynı malzemenin hamur/üzeri gibi kullanımını ayır; küçük ek miktarları da listele. Mayalanma ve pişmede süreye ek olarak gözlenebilir sonuç belirt. Kullanıcının Türkçe yönergelerini fasih ve anlaşılır yaz; cihaz arayüzü Almancaysa gerekirse Türkçe modun yanında Almanca adını kullan.
5. Hamur, kıvam ve cihaz kapasitesini değerlendir. Porsiyon artınca süreleri körlemesine çarpma; gerektiğinde partiye böl. Fırın, tava, elde şekillendirme ve kap dışında mayalanma adımları düz metin kalabilir. Otomatik cihaz adımlarını `operations`, özel mod adımlarını `modes` ile işaretle. Koşullu ek işlem için mod işaretinin zorunlu olarak çalıştırılmadığından emin ol; gerekirse ayrı bir “gerekiyorsa” adımı yap.
6. Yerel tarif JSON'unu kaydet ve her işaretin `anchor` metnini kontrol et. `servingUnit` için Cookidoo'nun kabul ettiği kodu kullan: ekmekte `piece`, porsiyonda `portion`; `adet` gönderme. Tarif oluşturma/aktarma istenmişse hesapta kaydet; yalnızca taslak istenmişse yerelde bırak.
7. Varsayılan olarak kapak görselini de tamamla. Kullanıcının mevcut uygun görselini kullan veya imagegen becerisini yükleyip yerleşik görsel üretim aracını kullan. Gerçek tarife uygun, yazısız, dolguyu/alkolü yanlış göstermeyen ve merkezden kırpılabilir bir görsel üret. Görsel yapay zekâ üretimiyse gerçek pişirme fotoğrafı diye sunma. Son dosyayı `recipes/` altında sakla.
8. Önce tarif kimliğini kaydet, sonra `POST /recipes/:id/image` veya `service.uploadImage` ile kapağı yükle. PNG/JPEG en fazla 10 MiB; base64 çıktısını veya oturum bilgilerini loglama. Hak beyanını yalnızca kullanıcıya ait/kullanımı yetkili görsellerde gönder. Yükleme yeni reçete oluşturmayı gerektirmez.
9. Tarifin yeniden okunmuş malzemelerini, adım metinlerini, miktarını, `stepDetails[].operations`, `stepDetails[].modes` ve `image` alanını beklenen içerikle karşılaştır. Metinde geçen mod adı başarılı otomasyon kanıtı değildir: kayıtta `type: MODE`, doğru `name` ve parametreler bulunmalıdır. Tarifi yeniden açıp kapağın göründüğünü doğrula. Hesap kaydı cihazın fiziksel olarak senkronlandığı/çalıştırıldığı anlamına gelmez.
10. Ağ hatası veya `PARTIAL_CREATE` durumunda önce dönen kimliği oku; aynı tarifi tekrar oluşturma. İki sonuçsuz kurtarma denemesinden sonra mevcut kimliği, kalan eksiği ve hata nedenini bildir. Tamamlandı demeden önce içerik ve görsel doğrulamasını bitir.

Son yanıt: Cookidoo bağlantısı, kullanılan temel modlar ve varsa kalan sınırlama. Beceriyi repoya eklemek otomatik olarak tüm projeler için küresel kurulum yapmaz.
