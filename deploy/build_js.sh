#!/bin/bash

ROOT=$(dirname $0)/../
JSTARGET=$ROOT/ermac.min.js

npx esbuild $ROOT/src_js/modules/entry/main.js \
    --bundle \
    --format=iife \
    --minify \
    --outfile=$JSTARGET \
    --target=es2017 \
    --allow-overwrite \
    --external:jquery \
    --external:sifter \
    --external:microplugin

echo "NB check absence of errors in the compiler output"