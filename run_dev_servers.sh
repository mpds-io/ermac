#!/bin/bash

cd $(dirname $0)/html5
php -S localhost:8070 &
php -S localhost:8075 &
