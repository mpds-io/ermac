#!/bin/bash

ROOT=$(dirname $0)/../
JSTARGET=$ROOT/dist/dev-bundle.js

mkdir -p $ROOT/dist

npx esbuild $ROOT/src_js/modules/entry/main.js \
    --bundle \
    --format=iife \
    --outfile=$JSTARGET \
    --target=es2017 \
    --sourcemap \
    --allow-overwrite \
    --external:jquery \
    --external:sifter \
    --external:microplugin

echo "NB check absence of errors in the compiler output"