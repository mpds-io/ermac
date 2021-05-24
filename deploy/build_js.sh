#!/bin/bash

# TODO add brackets JS parser optimization
ROOT=$(dirname $0)/../
JSCOMP=$ROOT/third_party/jscomp/compiler.jar
JSTARGET=$ROOT/html5/gui.min.js
MTARGET=$ROOT/html5/m.min.js

echo '/* Author: Evgeny Blokhin, Tilde Materials Informatics */' > $JSTARGET
echo '/* Author: Evgeny Blokhin, Tilde Materials Informatics */' > $MTARGET

# Desktop GUI
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/jquery.tablesorter.js --compilation_level WHITESPACE_ONLY >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wNumb.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/nouislider.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/selectize.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/selectize_preserve_on_blur.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wmcore.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wmutils.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wmsettings.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/sliders.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/autocomplete.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/frouter.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/fevents.js >> $JSTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/fgui.js >> $JSTARGET

# Mobile GUI
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/selectize.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/selectize_preserve_on_blur.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wmcore.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wmutils.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/wmsettings.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/mrouter.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/mevents.js >> $MTARGET
java -jar $JSCOMP --jscomp_off checkTypes --language_in ECMASCRIPT5_STRICT --js $ROOT/html5/src_js/mgui.js >> $MTARGET

echo "NB check absense of errors in the compiler output"