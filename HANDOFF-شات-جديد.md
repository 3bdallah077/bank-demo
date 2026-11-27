# 📌 تسليم الحالة — اقرأ ده الأول

اخر تحديث: 2026-11-27 · كل اللينكات **متحقق منها بـ curl** (كود 200 + الحجم مطابق)

---

## 1️⃣ روابط التحميل (استخدم `drive.usercontent.google.com` بالظبط)

> ⚠️ **مهم:** صيغة `https://drive.google.com/uc?export=download&id=...` **بترجع HTML 404**
> مش الملف. الصيغة الوحيدة الشغالة هي اللي تحت دي. متغيّرهاش.

### أ) الريبو الكامل (Java + قاعدة البيانات + git history)
```
https://drive.usercontent.google.com/download?id=1CvZjOrVje1UI3934FkAAtd-KuiYncAst&export=download&confirm=t
```
| | |
|---|---|
| الاسم | `bank-demo-COMPLETE-repo.zip` |
| الحجم | **41,115,189 بايت** |
| SHA-256 (أول 24) | `272ad5d58a5c68cfb17e2933` |
| المحتوى | 385 ملف، 4 commits، فولدر `bank-demo/` |

### ب) حزمة النشر على Vercel (ديمو واجهة، ملف واحد)
```
https://drive.usercontent.google.com/download?id=1RoByqqvJOp7uPj4F-_TRjolOG5aIqSDD&export=download&confirm=t
```
| | |
|---|---|
| الاسم | `vercel-deploy.zip` |
| الحجم | **16,009 بايت** |
| المحتوى | `index.html` (self-contained) + `vercel.json` + `package.json` + `README.md` |

### ج) نسخة تشغيل ويندوز (للمستخدم على لابه)
```
https://drive.usercontent.google.com/download?id=1j_-PTSSk16UX8Nfwim52JlcFFDBLkEux&export=download&confirm=t
```
`bank-demo-windows-fixed.zip` — 38,842,635 بايت

---

## 2️⃣ المشروع: Classroom Bank Demo

| الطبقة | التقنية |
|---|---|
| Frontend | **HTML + CSS + JavaScript عادي** (fetch، مفيش framework) |
| Backend | **Java 17 / Spring Boot 2.7.18** (Web, Data JPA, Validation, Actuator) |
| Database | سكيما `bank_system` بتاعت الكورس (6 جداول) — MySQL أو H2 |

**تحذير لازم يتقال:** بيانات وهمية، مفيش فلوس حقيقية.

بيانات الدخول (كلهم `Demo@1234`): `customer1` · `teller1` · `manager1` · `admin1` · `auditor1`

---

## 3️⃣ المطلوب من الشات الجديد

1. **رفع الريبو على GitHub** — الريبو جاهز وعنده git history، مش محتاج غير `git remote add` + `push`
2. **لينك دائم** — على **Render** (اللي بيشغّل Java + قاعدة بيانات)
3. **Vercel** — المستخدم عايزه، بس **مستحيل** يشغّل Java هناك (التفاصيل تحت)

---

## 4️⃣ Vercel: الحقيقة الكاملة (متضيّعش وقت)

**Vercel مش بيشغّل التطبيق ده.** السببين تقنيين وحاسمين:

1. **مفيش Java runtime.** الرسمي: Node, Bun, Python, Go, Ruby, Rust, Wasm, Edge, Container. مفيش JVM.
2. **الـ filesystem للقراءة فقط** عدا `/tmp` — والتوثيق نفسه بيقول
   «a file-based database such as SQLite can't persist your application's data in a function».
   يعني MySQL/H2 مستحيلين.

**كمان:** الـ container runtime Beta + scale-to-zero بعد 5 دقايق + محتاج `services`/`rewrites`
في `vercel.json` (ميزة جديدة، مش مضمونة على Hobby).

### اللي اتعمل بدل كده ✅
ديمو واجهة في ملف `index.html` واحد: نفس الفرونت اند الحقيقي + mock لنفس الـ REST contract
في المتصفح بنفس بيانات السكيما. **13/13 فحص ناجح** في متصفح حقيقي.
النشر: `cd vercel-deploy && npx vercel --prod`

### ⚠️ الـ connector بيفشل
`create_deployment` بيفشل مهما كانت الصيغة:
- `project_settings` كـ object → «Instance type "object" is invalid. Expected "string"»
- `project_settings` كـ JSON string → «The `projectSettings` object is required for new projects, but is missing»
- الملفات: `files[0].data should be string` رغم إن كلها strings

**الخلاصة:** النشر من الـ connector مسدود على الأقل في الوقت الحالي. **متكرّرهاش أكتر من محاولة.**
الحل: `npx vercel --prod` من جهاز المستخدم (الملفات جاهزة في `vercel-deploy.zip`).

**مشروع فاضي على حساب المستخدم:** `bank-demo-online-demo` (`prj_ggF5a6TFaUMlGr8glNN8DhmLeKEG`)
اتعمل بالغلط — امسحه أو استخدمه، بس مش هينفع ينشر من هنا.

---

## 5️⃣ نشر التطبيق الحقيقي: Render

1. ارفع الريبو على GitHub
2. render.com → **New** → **Web Service** → اربط الريبو
3. Language **Docker** (هيقرا `Dockerfile` لوحده) · Instance **Free**
4. Health check path: **`/actuator/health`**
5. Environment:
   ```
   SPRING_PROFILES_ACTIVE=prod
   DB_PATH=/app/data/bank_system
   ```
6. Create → 3 دقايق → `https://bank-demo-xxxx.onrender.com`

**تحذيرات:**
- الخطة المجانية **بتنام** بعد 15 دقيقة → أول طلب ~30 ثانية
- القرص **مؤقت** → إعادة النشر بترجّع البيانات لأصلها. للثبات: Render Disk مدفوع أو MySQL مُدار

الخطوات كاملة في `bank-demo/DEPLOY.md`.

---

## 6️⃣ ✅ اللي خلص واتجرّب فعليًا

### المتطلبات
- **FR-01 … FR-13** متحققة من الـ PDF
- **FR-14 (إضافة بطلب المستخدم)** — تسجيل ذاتي: أي حد يعمل حساب → `CUSTOMER` + حساب بـ 0.00 EGP
  في نفس الـ transaction، وبيدخل على طول
- NFR-02 (BCrypt 60 حرف) · NFR-04 (session 10 دقايق) · NFR-05 (ACID) · NFR-10 · NFR-11

### الاختبارات
| الاختبار | النتيجة |
|---|---|
| newman على الـ collection | **59/59 assertion** (40 request) |
| متصفح — تسجيل حساب جديد | **11/11** |
| متصفح — الديمو الثابت | **13/13** |
| newman على آخر jar (نفس ملفات Vercel) | **59/59** |
| تسجيل → إعادة تشغيل السيرفر → البيانات موجودة | ✅ إثبات إنها في الداتابيز |
| `prod` profile + `/actuator/health` | ✅ `{"status":"UP"}` |

### ❌ الناقص (اتقال للمستخدم بصراحة)
- **NFR-08** — مفيش Jira board
- **NFR-09** — اتجرّب على Chromium (Brave/Edge)، **مش Firefox**
- **NFR-07** — قابلية الاستخدام مش مقاسة
- **ديدو على Vercel** — الديمو mock في المتصفح، مش الباك اند

---

## 7️⃣ 🐛 المشاكل اللي اتحلّت (متكرّرهاش)

### أ) باج في `run.bat` — اتحل ✅
`[X] Java is too old` + `The filename, directory name, or volume label syntax is incorrect`
**السبب:** `for /f` بيقرأ نسخة Java من مسار فيه مسافات (`C:\Program Files\...`) → فاضي → "قديمة"
**الحل:** كتابة لملف مؤقت + `findstr` + عرض `Using Java: <path>`
**الملف:** `windows/run.bat`

### ب) ويندوز بيحظر الـ `.bat` — اتحل ✅
رسالة «منعت ميزة التحكم الذكي ... ملفاً غير آمن» = Mark-of-the-Web.
الحل: `Unblock-File` أو Properties → Unblock.

### ج) لينك الدرايف بيرجع HTML — اتحل ✅
`drive.google.com/uc?export=download` = HTML. استخدم **`drive.usercontent.google.com/download?...`**

### د) ملفين بنفس الاسم على الدرايف — اتحل ✅
واحد حجمه 0 بايت (من `update_file_content`). اتشال للـ trash.
النسخة الشغالة اتسمّت `bank-demo-COMPLETE-repo.zip`.

### هـ) GitHub connector ❌
`list_connector_tools("github")` → `unsupported`. **مفيش رفع من هنا.**

---

## 8️⃣ 🧪 أوامر التحقق السريعة

```bash
cd bank-demo
mvn -q -DskipTests package                 # → target/bank-demo-1.0.0.jar
java -jar target/bank-demo-1.0.0.jar       # → http://localhost:8080 (H2، بدون MySQL)

# زي السيرفر
DB_PATH=./data/bank_system java -jar target/bank-demo-1.0.0.jar --spring.profiles.active=prod

# اختبارات
npx newman run api/postman_collection.json --env-var baseUrl=http://localhost:8080
curl http://localhost:8080/actuator/health   # {"status":"UP"}
```
**Java:** اتجرّب على `openjdk 21.0.13` — أي نسخة **17+** تمام (**متطلبش 17 بالذات**)

---

## 9️⃣ 💬 أسلوب التعامل

- **عامية مصرية**، ردود بسيطة
- **مبتدئ تقنيًا:** مسمّيات الشاشة والزرار، مش مصطلحات
- **اتوه قبل كده** في: نافذة Notepad، امتداد `.bat` المخفي، رسالة الحظر
  → أي خطوة جديدة = «اضغط إيه، هتشوف إيه، علامة النجاح إيه»
- **بيحب الصراحة** في الناقص
- **لو حاجة مستحيلة:** سطر واحد يوضح السبب + البديل فورًا

---

## 🔟 أول رد في الشات الجديد

> «الريبو جاهز بـ git history، والـ Dockerfile متجرب.
> محتاج منك: (1) ريبو فاضي على GitHub + اللينك، (2) حساب Render.
> وأنا ماشي معاك خطوة بخطوة لحد اللينك الدائم.»
