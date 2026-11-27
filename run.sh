#!/usr/bin/env bash
# bank-demo — تشغيل بأمر واحد على Linux / macOS
# الاستخدام:  ./run.sh          (وبيسألك على باسورد MySQL)
#        أو: DB_PASSWORD=yourpass ./run.sh
set -u

DB_NAME="bank_system"
DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-}"
PORT="${PORT:-8080}"

cd "$(dirname "$0")" || exit 1

say()  { printf "\033[1;36m==> %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m[!] %s\033[0m\n" "$*"; }
die()  { printf "\033[1;31m[x] %s\033[0m\n" "$*"; exit 1; }

# ---------- 1) فحص المتطلبات ----------
say "فحص Java و Maven و MySQL"
command -v java >/dev/null 2>&1 || die "Java مش متسطّبة. نزّل JDK 11 أو أحدث: sudo apt install openjdk-17-jdk"
command -v mvn  >/dev/null 2>&1 || die "Maven مش متسطّب: sudo apt install maven"
JAVA_MAJOR="$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')"
[ "${JAVA_MAJOR:-0}" -ge 11 ] 2>/dev/null || die "نسخة Java قديمة ($JAVA_MAJOR). محتاج 11+"

MYSQL_BIN=""
for c in mysql mariadb; do command -v "$c" >/dev/null 2>&1 && MYSQL_BIN="$c" && break; done
[ -n "$MYSQL_BIN" ] || die "عميل MySQL مش موجود. نزّل mysql-client أو mysql-server"

# ---------- 2) التأكد إن السيرفر شغال ----------
if ! "$MYSQL_BIN" -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e "SELECT 1" >/dev/null 2>&1; then
  say "محاولة تشغيل خدمة قاعدة البيانات..."
  (sudo service mysql start 2>/dev/null || sudo service mariadb start 2>/dev/null || brew services start mysql 2>/dev/null) >/dev/null 2>&1
  sleep 3
fi

# ---------- 3) سؤال الباسورد لو مش متحدد ----------
if [ -z "$DB_PASS" ]; then
  printf "باسورد MySQL للمستخدم '%s' (Enter لو مفيش باسورد): " "$DB_USER"
  read -r -s DB_PASS; echo
fi

if ! "$MYSQL_BIN" -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e "SELECT 1" >/dev/null 2>&1; then
  die "مش قادر أدخل على MySQL. اتأكد إن السيرفر شغال والباسورد صح، وبعدين شغّل السكريبت تاني."
fi
say "الاتصال بـ MySQL تمام"

# ---------- 4) تحميل البيانات لو القاعدة مش موجودة ----------
HAS_DB="$("$MYSQL_BIN" -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -N -B -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='users';" 2>/dev/null)"
if [ "${HAS_DB:-0}" -eq 0 ]; then
  say "استيراد السكيما والبيانات النموذجية (أول مرة فقط)"
  sed 's/\r$//' db/bank_system_sample.sql | "$MYSQL_BIN" -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"}
  sed 's/\r$//' db/demo-passwords.sql     | "$MYSQL_BIN" -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"}
  say "البيانات جاهزة — الباسورد للجميع: Demo@1234"
else
  say "قاعدة $DB_NAME موجودة بالفعل — مش هلمس بياناتك"
fi

# ---------- 5) تشغيل التطبيق ----------
export DB_URL="jdbc:mysql://127.0.0.1:3306/${DB_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
export DB_USERNAME="$DB_USER"
export DB_PASSWORD="$DB_PASS"
export PORT

say "تشغيل التطبيق على http://localhost:$PORT  (Ctrl+C للإيقاف)"
printf "    مستخدمين: customer1 / teller1 / manager1 / admin1 / auditor1 — الباسورد Demo@1234\n\n"
exec mvn -q spring-boot:run
