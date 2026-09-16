#!/bin/bash
cd /data/workspace/dakame
rm -rf node_modules
npm install --global=false --no-save --no-audit --no-fund --no-optional --maxsockets 16 \
  typescript@5.7 @types/node@22 @types/react@19 @types/react-dom@19 \
  react@19 react-dom@19 next@16.3.5 jose@5 \
  @upstash/redis @upstash/ratelimit date-fns@4 lucide-react@0.469 \
  > /data/workspace/dakame/inst3.log 2>&1
echo "EXIT=$?" >> /data/workspace/dakame/inst3.log
