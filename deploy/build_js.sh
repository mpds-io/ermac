#!/bin/bash

ROOT=$(dirname $0)/../
JSCOMP=$ROOT/third_party/jscomp/compiler.jar
JSTARGET=$ROOT/ermac.min.js

cat $ROOT/src_js/third_party/jquery.min.js >> $JSTARGET

java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/jquery.tablesorter.js --compilation_level WHITESPACE_ONLY >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/wNumb.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/nouislider.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/selectize.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/selectize_preserve_on_blur.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT_NEXT    --js $ROOT/src_js/third_party/optimade_mpds_nlp.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/darkmode.js >> $JSTARGET

java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/wmsettings.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT_NEXT    --js $ROOT/src_js/wmcore.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/sliders.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT_NEXT    --js $ROOT/src_js/ptable.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/third_party/autocomplete.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/router.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/events.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT_NEXT    --js $ROOT/src_js/markup.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/main_logic.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/startup.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/src_js/run.js >> $JSTARGET

echo "NB check absense of errors in the compiler output"
