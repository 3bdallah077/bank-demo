# تشغيل bank-demo على اللاب — خطوة بخطوة

مشروع Spring Boot (Java + MySQL) بواجهة HTML/JS جاهزة. الأسماء والأرصدة كلها وهمية للتدريب.

> **أول حاجة مهمة:** الملف اللي في الدرايف اسمه `bank-demo-7d0f1bc3.pdf` حجمه 780 كيلو، لكنه **مش PDF** — هو أرشيف ZIP باسم غلط. لو حاولت تفتحه بـ Adobe هيديك خطأ. حوّله لـ `.zip` وفكّه.

---

## 0) تجهيز الملفات

**Linux / macOS:**
```bash
mv bank-demo-7d0f1bc3.pdf bank-demo.zip
unzip bank-demo.zip -d ~/projects/
cd ~/projects/bank-demo
```

**Windows:** غيّر الامتداد لـ `.zip` (فعّل "إظهار امتدادات الملفات")، كليك يمين → Extract All.

هتلاقي جوه: `src/` , `pom.xml` , `db/` , `tests/` , `docs/` , `README.md`.

---

## 1) المتطلبات على اللاب

| البرنامج | النسخة | التأكد |
|---|---|---|
| JDK | 11 أو 17 | `java -version` |
| Maven | 3.6+ | `mvn -v` |
| MySQL | 8.x (أو MariaDB 10.6+) | `mysql --version` |

تثبيت سريع:

- **Ubuntu/Debian:** `sudo apt install -y openjdk-17-jdk maven mysql-server`
- **Windows:** JDK من adoptium.net + Maven من maven.apache.org + MySQL Installer (اختار "MySQL Server" و"MySQL Workbench").
- **macOS:** `brew install openjdk@17 maven mysql` ثم `brew services start mysql`

---

## 2) تجهيز قاعدة البيانات

شغّل MySQL الأول (`sudo service mysql start` على لينكس، أو من Services على ويندوز).

```bash
cd ~/projects/bank-demo

# 1) تحميل السكيما + البيانات النموذجية
mysql -u root -p < db/bank_system_sample.sql

# 2) توحيد باسورد الحسابات الخمسة لـ Demo@1234
mysql -u root -p < db/demo-passwords.sql
```

> الملفات محفوظة بأسطر ويندوز (CRLF). لو ظهر خطأ غريب: `sed -i 's/\r$//' db/*.sql` قبل الاستيراد.

التأكد إن البيانات دخلت:
```bash
mysql -u root -p -e "USE bank_system; SELECT id,account_number,balance FROM accounts;"
```

لازم تشوف 3 حسابات: `EGP-001-1234567890` (5000) , `EGP-002-0987654321` (3000) , `EGP-003-5555555555` (10000).

---

## 3) ضبط الاتصال بالقاعدة

التطبيق بيقرأ من متغيرات بيئة (مفيش باسورد مكتوب في الكود):

**Linux / macOS:**
```bash
export DB_URL='jdbc:mysql://localhost:3306/bank_system?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
export DB_USERNAME=root
export DB_PASSWORD='الباسورد_بتاعك'
```

**Windows PowerShell:**
```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/bank_system?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="الباسورد_بتاعك"
```

**Windows CMD:**
```cmd
set DB_USERNAME=root
set DB_PASSWORD=الباسورد_بتاعك
```

> `allowPublicKeyRetrieval=true` مهم جدًا مع MySQL 8، من غيره غالبًا هتلاقي خطأ `Public Key Retrieval is not allowed`.

---

## 4) التشغيل

```bash
cd ~/projects/bank-demo
mvn spring-boot:run
```

أول مرة بياخد وقت (بينزّل المكتبات من الإنترنت). لما تشوف:

```
Tomcat started on port(s): 8080 (http)
Started BankDemoApplication in 4.4 seconds
```

افتح المتصفح على **http://localhost:8080**

طريقة تانية (أسرع في التشغيل بعد أول build):
```bash
mvn -DskipTests package
java -jar target/bank-demo-1.0.0.jar
```

لو بورت 8080 مشغول: `PORT=8090 mvn spring-boot:run` ثم `http://localhost:8090`.

---

## 5) الدخول

الباسورد للخمسة كلهم: **`Demo@1234`**

| Username | Role | يقدر يعمل إيه |
|---|---|---|
| `customer1` | CUSTOMER | حساباته: رصيد، إيداع، سحب، تحويل، سجل الحركات |
| `teller1` | TELLER | بحث عن أي حساب + إيداع/سحب لصالح عميل |
| `manager1` | MANAGER | تقرير يومي، مراجعة إنذارات الاحتيال، كل الحركات، audit log |
| `admin1` | ADMIN | إنشاء/تعطيل/تفعيل مستخدمين، تغيير صلاحيات، فتح حسابات |
| `auditor1` | AUDITOR | قراءة فقط: audit log + الحركات + الإنذارات |

الحسابات النموذجية: `EGP-001-1234567890` و `EGP-002-0987654321` لـ customer1، و `EGP-003-5555555555` لـ teller1 (السامبل داتا كده أصلًا).

---

## 6) أعادة ضبط البيانات

الاختبارات بتكتب في القاعدة. عشان ترجع للأصل:

```bash
mysql -u root -p < db/bank_system_sample.sql && mysql -u root -p < db/demo-passwords.sql
```
(التطبيق مش محتاج restart، بيقرأ من القاعدة كل مرة.)

---

## 7) تشغيل الاختبارات الجاهزة (اختياري)

```bash
# 66 فحص API — لازم القاعدة تكون نضيفة
BASE=http://localhost:8080 python3 tests/api_smoke_test.py

# اختبار واجهة في Chrome (محتاج node + puppeteer-core)
cd tests && npm i puppeteer-core
SHOTS=../docs/screenshots node ui_e2e.js
```

---

## 8) مشاكل شائعة وحلولها

**1) `Schema-validation: wrong column type ... column [new_values] ... found [longtext], but expecting [json]`**
دي بتحصل لو شغّلت على **MariaDB** (نوع `json` عندها اختصار لـ `longtext`).
الحل: في `src/main/java/com/example/bankdemo/model/AuditLog.java` و `DailyReport.java` بدّل `columnDefinition = "json"` بـ `columnDefinition = "longtext"` وأعد البناء. (أنا عملتها هنا واشتغل تمام.)
أو استخدم MySQL 8 الحقيقي ومش هتحتاج أي تعديل.

**2) `Communications link failure` / `Connection refused`**
MySQL مش شغال، أو البورت مش 3306: `sudo service mysql status` ثم شغّله.

**3) `Access denied for user 'root'@'localhost'`**
الباسورد غلط في `DB_PASSWORD`، أو عامل مستخدم تاني. ممكن تعمل مستخدم للتطبيق:
```sql
CREATE USER 'bankdemo'@'localhost' IDENTIFIED BY 'bankdemo';
GRANT ALL PRIVILEGES ON bank_system.* TO 'bankdemo'@'localhost';
```
وتستخدم `DB_USERNAME=bankdemo DB_PASSWORD=bankdemo`.

**4) `Port 8080 was already in use`**
`PORT=8090 mvn spring-boot:run` — أو اقفل البرنامج اللي واخد البورت.

**5) `UnsupportedClassVersionError`**
نسخة Java قديمة. الـ pom مستهدف Java 11، فمحتاج JDK 11+. لو عندك 17 تمام (هيشتغل). لو عندك 8 → رقّي.

**6) `mvn: command not found`**
Maven مش متسطّب أو مش على الـ PATH. أو استخدم الـ wrapper لو موجود، أو نزّله من maven.apache.org وضيف `bin` للـ PATH.

**7) الصفحة بتفتح بيضاء**
افتح من `http://localhost:8080` بالظبط (مش `file://` على فايل HTML) — الواجهة متخدمة من Spring Boot نفسه.

---

## 9) بديل سريع: MySQL في Docker

لو مش عايز تسطّب MySQL على الجهاز:

```bash
docker run -d --name bank-mysql -p 3306:3306 \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -e MYSQL_DATABASE=bank_system mysql:8

# استنى ~20 ثانية لحد ما يبدأ، بعدين:
docker exec -i bank-mysql mysql -uroot bank_system < db/bank_system_sample.sql
docker exec -i bank-mysql mysql -uroot bank_system < db/demo-passwords.sql

# التطبيق بالإعدادات الافتراضية (root وباسورد فاضية وبورت 3306)
mvn spring-boot:run
```

---

## 10) إعدادات إضافية مفيدة

| متغير | الافتراضي | الاستخدام |
|---|---|---|
| `PORT` | 8080 | بورت التطبيق |
| `FRAUD_THRESHOLD` | 1000.00 | أي حركة ≥ الرقم ده تتحول لـ fraud flag |
| `LOCK_MINUTES` | 15 | مدة قفل الحساب بعد 3 محاولات دخول خطأ |
| `FAIL_TRANSFER_AFTER_DEBIT` | false | `true` = كل تحويل يفشل بعد الخصم، لاختبار atomicity (NFR-05) |
| `server.servlet.session.timeout` | 10m | مدة الجلسة (مكتوبة في `application.properties`) |

---

ملاحظة: المشروع ده تطبيق تعليمي بسيط (HTTP عادي، بدون HTTPS أو CSRF token) — مناسب للتجربة على اللاب فقط.

---

## 11) الفتح من الموبايل (نفس شبكة الواي فاي)

التطبيق بيسمع على كل الشبكات (`java` بيـbind على `0.0.0.0`)، فمش محتاج تعديل كود — بس تعرف IP اللاب وتسمح للبورت في الفايروول.

**1) اعرف IP اللاب:**
- لينكس: `hostname -I` أو `ip -4 addr show | grep inet`
- ماك: `ipconfig getifaddr en0`
- ويندوز: `ipconfig` → خانة "IPv4 Address" (شكلها `192.168.x.x`)

**2) من متصفح الموبايل:**
```
http://192.168.x.x:8080
```
(نفس شبكة الواي فاي — لو الموبايل على 4G مش هيشتغل.)

**3) الفايروول لو مش فاتح:**

```bash
# Ubuntu / Debian
sudo ufw allow 8080/tcp

# Fedora / RHEL
sudo firewall-cmd --add-port=8080/tcp --permanent && sudo firewall-cmd --reload
```
**ويندوز:** أول مرة بتشغّل فيها التطبيق هيسألك Windows Defender — اختار **Allow access** على **Private networks**. أو:
```powershell
New-NetFirewallRule -DisplayName "bank-demo 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -Profile Private
```
**ماك:** System Settings → Network → Firewall → Options → اسمح لـ Java.

**4) الواجهة متوافقة مع الموبايل** — فيها media queries بتخلي الأزرار والكروت والجداول تترتب على شاشة صغيرة (الجداول العريضة بتتزحلق أفقيًا بدل ما تبوّظ الصفحة، والإنبوتس بخط 16px عشان iOS ميعملش zoom تلقائي).

> **فرق مهم:** لو استخدمت لينك البريفيو (`https://8080-xxxx.e2b.app`) ده بيشتغل من أي موبايل في أي مكان — لأن السيرفر على السحابة مش على اللاب. أما `192.168.x.x:8080` فهو اللاب نفسه، فمحتاج نفس الواي فاي.
