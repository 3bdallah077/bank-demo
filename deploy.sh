#!/usr/bin/env bash
# ============================================================================
#  One command from this folder to a permanent public URL.
#  Usage:   ./deploy.sh
#  Needs:   git, a GitHub account, a Render account (both free)
# ============================================================================
set -e

bold() { printf '\033[1m%s\033[0m\n' "$*"; }

bold "1/4  Repository status"
git rev-parse --git-dir > /dev/null || { echo "not a git repo"; exit 1; }
echo "    branch : $(git rev-parse --abbrev-ref HEAD)"
echo "    commits: $(git rev-list --count HEAD)"
echo "    files  : $(git ls-files | wc -l) tracked"
echo "    size   : $(du -sh .git | cut -f1) in .git  (the 43 MB jar is NOT tracked)"

bold "2/4  Push to GitHub"
if ! git remote | grep -q origin; then
  read -r -p "    Your empty GitHub repo URL (https://github.com/USER/REPO.git): " URL
  git remote add origin "$URL"
fi
git push -u origin HEAD

bold "3/4  Deploy on Render (one click)"
REPO_URL=$(git remote get-url origin | sed -e 's#\.git$##' -e 's#git@github.com:#https://github.com/#')
echo "    Open this in your browser:"
echo "      https://render.com/deploy?repo=${REPO_URL}"
echo
echo "    Render reads render.yaml automatically:"
echo "      runtime   : docker"
echo "      health    : /actuator/health"
echo "      env       : SPRING_PROFILES_ACTIVE=prod, DB_PATH=/app/data/bank_system"
echo "    Press Create, wait ~3 minutes, then open the URL Render gives you."

bold "4/4  Optional: the UI-only demo on Vercel"
echo "    cd vercel-deploy && npx vercel --prod"

bold "Done. Login with customer1 / Demo@1234 (also teller1, manager1, admin1, auditor1)."
