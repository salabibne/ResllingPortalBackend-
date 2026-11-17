#!/bin/bash
# Online Uddokta Platform - cPanel hosting eligibility check.
# Run it in cPanel > Terminal:   bash check-cpanel.sh
# It only reads information and writes one temporary test file, which it deletes.

PASS=0; FAIL=0; WARN=0
ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
bad()  { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN+1)); }

echo "=================================================="
echo " Online Uddokta Platform - cPanel eligibility check"
echo "=================================================="

# 1. Node.js versions (need 20.19+, 22.12+ or 24+)
echo
echo "1) Node.js versions installed on this server"
VERSIONS=$(ls -d /opt/alt/alt-nodejs*/ /opt/cpanel/ea-nodejs*/ 2>/dev/null | grep -oE '[0-9]+' | sort -n | uniq | tr '\n' ' ')
if [ -n "$VERSIONS" ]; then
  echo "     found: $VERSIONS"
  BEST=$(echo "$VERSIONS" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -n | tail -1)
  if [ "$BEST" -ge 22 ]; then ok "Node $BEST available (needs 20.19+ / 22+)"
  elif [ "$BEST" -ge 20 ]; then warn "Only Node $BEST - must be 20.19 or newer; choose 20.19+ in Setup Node.js App"
  else bad "Newest Node is $BEST - this project needs Node 20.19 or newer"; fi
else
  if command -v node >/dev/null 2>&1; then echo "     node on PATH: $(node -v)"; ok "Node found on PATH"
  else warn "Could not list Node versions - check the version list in 'Setup Node.js App'"; fi
fi

# 2. Disk space and file count (uploaded images live on disk)
echo
echo "2) Disk space & file (inode) quota"
if command -v uapi >/dev/null 2>&1; then
  Q=$(uapi Quota get_quota_info 2>/dev/null)
  USED=$(echo "$Q" | awk '/megabytes_used:/{print $2; exit}')
  LIMIT=$(echo "$Q" | awk '/megabyte_limit:/{print $2; exit}')
  IUSED=$(echo "$Q" | awk '/inodes_used:/{print $2; exit}')
  ILIMIT=$(echo "$Q" | awk '/inode_limit:/{print $2; exit}')
  echo "     disk : ${USED:-?} MB used of ${LIMIT:-?} MB (0 = unlimited)"
  echo "     files: ${IUSED:-?} used of ${ILIMIT:-?} (0 = unlimited)"
  if [ -n "$LIMIT" ] && [ -n "$USED" ] && [ "${LIMIT%.*}" != "0" ]; then
    FREE=$(( ${LIMIT%.*} - ${USED%.*} ))
    if [ "$FREE" -ge 3000 ]; then ok "${FREE} MB free disk (app ~600 MB + images)"
    elif [ "$FREE" -ge 1000 ]; then warn "Only ${FREE} MB free - enough to start, images will fill it over time"
    else bad "Only ${FREE} MB free - need at least 1 GB (app + node_modules + images)"; fi
  else ok "Disk quota unlimited or not reported"; fi
else
  df -h "$HOME" 2>/dev/null | tail -1 | awk '{print "     free on home partition: "$4}'
  warn "uapi not available - check Disk Usage in cPanel"
fi

# 3. Can the app write image files into an uploads folder?
echo
echo "3) Writing a 5 MB test image file (the upload size limit)"
TEST_DIR="$HOME/.uddokta_upload_test"
mkdir -p "$TEST_DIR" 2>/dev/null
if head -c 5242880 /dev/urandom > "$TEST_DIR/test.jpg" 2>/dev/null; then
  SIZE=$(wc -c < "$TEST_DIR/test.jpg")
  if [ "$SIZE" -eq 5242880 ]; then ok "Wrote and read a 5 MB file in your home folder"
  else bad "File was cut short ($SIZE bytes) - disk quota full?"; fi
else
  bad "Cannot write files in your home folder"
fi
rm -rf "$TEST_DIR"

# 4. Memory / process limits (CloudLinux LVE)
echo
echo "4) Memory & process limits"
VMEM=$(ulimit -v)
NPROC=$(ulimit -u)
echo "     virtual memory limit: $VMEM KB   max processes: $NPROC"
if [ "$VMEM" = "unlimited" ] || [ "$VMEM" -ge 2000000 ] 2>/dev/null; then ok "Memory limit OK for running Node apps"
else warn "Memory limit is low ($VMEM KB) - build the frontend on your PC, not on the server"; fi

# 5. MySQL
echo
echo "5) MySQL / MariaDB"
if command -v mysql >/dev/null 2>&1; then ok "MySQL client present: $(mysql --version 2>/dev/null | head -c 80)"
else warn "mysql command not found - check 'MySQL Databases' exists in cPanel"; fi

echo
echo "=================================================="
echo " Result: $PASS passed, $WARN warnings, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then echo " This account can host the app and store uploaded images."
else echo " Fix the FAIL items (or ask your host) before deploying."; fi
echo "=================================================="
