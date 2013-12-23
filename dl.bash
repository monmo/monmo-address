#! /usr/bin/env bash
DIR=`dirname $0`
pushd $DIR

function gen_csv {
    name=$1
    url=$2
    version=$3

    mkdir -p data/$name
    pushd data/$name

    for i in {1..47};do
        BASE=`printf '%02d000-%s' $i $version`
        ZIP=$BASE.zip
        if [ ! -f $ZIP ]; then
            wget $url/$version/$ZIP
        fi
        unzip -u $ZIP
    done
    for f in `ls *.csv`; do
        echo $f
        iconv -f CP932 -t utf8 $f >> $f.utf8
        rm -f $f
    done
    popd
    rm ./data/$name.js

    for f in `find ./data/$name -name '*.utf8' | sort`; do
        echo $f
        ruby parse_csv.rb $f >> ./data/$name.js
        rm -f $f
    done
}
gen_csv 'town' 'http://nlftp.mlit.go.jp/isj/dls/data' '06.0b'
gen_csv 'address' 'http://nlftp.mlit.go.jp/isj/dls/data' '11.0a'

popd

