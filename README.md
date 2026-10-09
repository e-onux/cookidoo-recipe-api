# Cookidoo tarif API (tarayıcı girişi + JSON API)

Bu proje kişisel Cookidoo tarifleri için REST API sunar. Playwright yalnızca ilk girişte veya oturum sona erdiğinde etkileşimli tarayıcıyı açar. Listeleme, okuma, oluşturma, güncelleme ve silme işlemleri aynı tarayıcı oturumuyla Cookidoo'nun gayriresmî JSON uç noktalarına gönderilir. Böylece şifre uygulamaya verilmez ve tarif adımlarına TM6/TM7 tarafından kullanılabilen süre–sıcaklık–hız işaretleri eklenebilir.

Uç noktalar Vorwerk tarafından yayımlanmış resmî bir API değildir ve değişebilir. JSON yapısı ile `TTS` açıklamaları için [recode-software/cookidoo-api](https://github.com/recode-software/cookidoo-api) çalışmasından yararlanılmıştır.

## Kurulum ve giriş

Node.js 20 veya üzeri gerekir.

```bash
npm install
npm run browser:install
cp .env.example .env
npm start
```

API yalnızca `127.0.0.1:8787` adresini dinler. İlk kullanımda `POST /auth/login` veya herhangi bir tarif isteği, Playwright Chromium tarayıcısını açar. Cookidoo oturumu yoksa **açılan tarayıcıda giriş yapın**. İstek, giriş tamamlanınca devam eder. Beş dakika içinde giriş tamamlanmazsa `LOGIN_REQUIRED` döner; tarayıcı açık kalır ve girişten sonra isteği tekrarlayabilirsiniz. Oturum `.local/browser-profile` içinde saklanır ve Git'e eklenmez. Bu, Codex'in yerleşik tarayıcısından ayrı bir profildir; orada açık oturum olması ilk Playwright girişini ortadan kaldırmaz.

Geçerli bir oturum profili zaten varsa görünür tarayıcı açmadan çalıştırmak için servisi `COOKIDOO_HEADLESS=true npm start` ile başlatabilirsiniz. Oturum sona ermişse giriş yapabilmek için bu ayarı kapatıp servisi yeniden başlatın.

İsteğe bağlı olarak `.env` içine güçlü bir `API_TOKEN` koyabilirsiniz. Bu durumda tüm isteklere `Authorization: Bearer <token>` başlığı ekleyin. Varsayılan ayar yalnızca yerel makineden gelen istekleri kabul eder.

## Uç noktalar

| Yöntem | Yol | İşlem |
| --- | --- | --- |
| `POST` | `/auth/login` | Gerekirse tarayıcıda giriş açar ve tamamlanmasını bekler |
| `GET` | `/recipes` | Kişisel tarifleri listeler |
| `POST` | `/recipes` | Tarif oluşturur |
| `GET` | `/recipes/:id` | Tarif ayrıntısını okur |
| `PATCH` | `/recipes/:id` | Verilen alanları günceller |
| `DELETE` | `/recipes/:id` | Tarifi siler |
| `GET` | `/health` | API'nin çalıştığını söyler |

Örnek:

```bash
curl -X POST http://127.0.0.1:8787/auth/login

curl -X POST http://127.0.0.1:8787/recipes \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Domates Çorbası",
    "ingredients": ["500 g domates", "200 g su", "1 tk tuz"],
    "steps": [
      "Domatesleri karıştırma kabına koyun.",
      {
        "text": "Suyu ekleyip 10 dk/100°C/hız 1 pişirin.",
        "operations": [{
          "anchor": "10 dk/100°C/hız 1",
          "timeSeconds": 600,
          "temperature": 100,
          "speed": "1"
        }],
        "ingredientLinks": [{
          "anchor": "Suyu",
          "ingredient": "200 g su"
        }]
      }
    ],
    "prepMinutes": 10,
    "totalMinutes": 30,
    "servings": 4,
    "servingUnit": "portion"
  }'

curl http://127.0.0.1:8787/recipes
curl http://127.0.0.1:8787/recipes/RECIPE_ID
curl -X PATCH http://127.0.0.1:8787/recipes/RECIPE_ID \
  -H 'Content-Type: application/json' \
  -d '{"title":"Yeni başlık","steps":["Yeni birinci adım."]}'
curl -X DELETE http://127.0.0.1:8787/recipes/RECIPE_ID
```

`title` oluştururken zorunludur. `ingredients` metin dizisidir. Bir adım düz metin veya aşağıdaki nesne olabilir:

| Alan | Açıklama |
| --- | --- |
| `text` | Cookidoo'da gösterilecek adım |
| `operations[].anchor` | Adım içinde işaretlenecek birebir metin |
| `operations[].timeSeconds` | Cihaz süresi, saniye |
| `operations[].temperature` | Sayısal sıcaklık |
| `operations[].temperatureUnit` | `C` veya `F`; varsayılan `C` |
| `operations[].speed` | Cihaz hızı; ör. `1`, `3.5` |
| `operations[].direction` | `CW` veya ters yön için `CCW` |
| `ingredientLinks[].anchor` | Adımda malzeme çipi olacak metin |
| `ingredientLinks[].ingredient` | Malzeme listesindeki tam açıklama |
| `occurrence` | Aynı işaret birden çok kez geçiyorsa 1 tabanlı sıra |

`anchor` adım metninde yoksa istek Cookidoo'ya değişiklik göndermeden `ANNOTATION_ANCHOR_NOT_FOUND` hatası verir. Düz metin adımlar çalışmaya devam eder fakat cihaz işlemi içermez. `PATCH` ile verilen `ingredients` veya `steps` dizisi ilgili listenin tamamının yerine geçer; verilmeyen alanlar korunur. Meta bilgiler ve adımlar Cookidoo'nun gerektirdiği şekilde iki ayrı `PATCH` isteğiyle kaydedilir. Oluşturma sonrasında hata oluşursa `PARTIAL_CREATE` tarif kimliğini içerir.

Tarif yanıtında `id`, `url`, `title`, `ingredients`, düz metin `steps`, cihaz işaretlerini içeren `stepDetails`, süreler, porsiyon ve tarihler bulunur. Cookidoo hesabındaki içerik ayrıca yerel bir veritabanına kopyalanmaz.

## Doğrulama

```bash
npm test
```

Testler HTTP sözleşmesini, girdi doğrulamasını ve Cookidoo'ya gönderilen `TTS` veri yapısını denetler. Gerçek hesap üzerinde otomatik test çalıştırmaz.

## Uygulama yaklaşımı

Cookidoo'nun giriş sayfası Playwright'ın kalıcı profilinde açılır. Giriş tamamlandıktan sonra Playwright `APIRequestContext`, aynı profilin çerezleriyle `/created-recipes/{locale}` uç noktalarını çağırır. Oturum çerezleri yalnızca `.local/browser-profile` içinde tutulur; `.gitignore` bunların projeye eklenmesini engeller. Uygulama Cookidoo e-posta adresini veya şifresini istemez.
