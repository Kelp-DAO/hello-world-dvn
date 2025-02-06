#!/usr/bin

npm run init-context \
&& (pm2 delete all --force > /dev/null 2>&1 || true) \
&& pm2 start pm2.config.cjs \
&& pm2 monit
