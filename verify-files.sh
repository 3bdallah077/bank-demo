#!/usr/bin/env bash
# يتحقق إن النسخة دي كاملة (التسجيل + prod + النشر)
set -u
fail=0
chk() { if [ -e "$2" ]; then printf "  ✅ %s\n" "$1"; else printf "  ❌ %s  ← ناقص: %s\n" "$1" "$2"; fail=1; fi; }
has() { if grep -q "$2" "$3" 2>/dev/null; then printf "  ✅ %s\n" "$1"; else printf "  ❌ %s  ← مش موجود في %s\n" "$1" "$3"; fail=1; fi; }

echo "== ملفات لازم تكون موجودة =="
chk "RegisterController (إنشاء حساب)"  src/main/java/com/example/bankdemo/web/RegisterController.java
chk "application-prod.properties"       src/main/resources/application-prod.properties
chk "Dockerfile"                        Dockerfile
chk "render.yaml"                       render.yaml
chk "CI workflow"                       .github/workflows/ci.yml
chk "deploy.sh"                         deploy.sh

echo "== محتوى لازم يكون موجود =="
has "كارت Create an account"   "Create an account" src/main/resources/static/index.html
has "registerForm في app.js"    "registerForm"      src/main/resources/static/app.js
has "register في AuthInterceptor" "register"        src/main/java/com/example/bankdemo/web/AuthInterceptor.java
has "openFor في AdminService"   "openFor"           src/main/java/com/example/bankdemo/service/AdminService.java
has "actuator في pom.xml"       "actuator"          pom.xml

echo "== git =="
echo "  commits: $(git log --oneline 2>/dev/null | wc -l)"
git status --short 2>/dev/null | head -3
[ -z "$(git status --porcelain 2>/dev/null)" ] && echo "  ✅ working tree نظيف"

echo
if [ "$fail" = "0" ]; then echo "✅ النسخة كاملة — ارفعها"; else echo "❌ النسخة ناقصة — مترفعهاش"; fi
exit $fail
