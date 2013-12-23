function to_loc (rec){
  rec.loc = { 
    type: 'Point', 
    coordinates: [Number(rec.lon),Number(rec.lat)] 
  };
  delete(rec.lat);
  delete(rec.lon);
  return rec;
}
function pref_master(rec){
  return db.pref_master.findAndModify({
    query: {
      name: rec.pref
    },
    update: {
      $setOnInsert: {
        name: rec.pref
      }
    },
    new: true,
    upsert: true
  });
}
function set_city_to_pref(city){
  return db.pref_master.findAndModify({
    query: {
      _id: city.pref
    },
    update: {
      $addToSet: {
        cities: [city._id, city.name]
      }
    },
    new: true,
    upsert: true
  });
}
function city_master(rec, pref){
  return db.city_master.findAndModify({
    query: {
      full: rec.city_full
    },
    update: {
      $setOnInsert: {
        pref: pref._id,
        pref_name: pref.name,
        name: rec.city,
        towns: []
      }
    },
    new: true,
    upsert: true
  });
}
function set_town_to_city(town){
  return db.city_master.findAndModify({
    query: {
      _id: town.city
    },
    update: {
      $addToSet: {
        towns: [town._id, town.name]
      }
    },
    new: true,
    upsert: true
  });
}
function town_master(rec, pref, city){
  return db.town_master.findAndModify({
    query: {
      full: rec.town_full
    },
    update: {
      $setOnInsert: {
        pref: pref._id,
        pref_name: pref.name,
        city: city._id,
        city_name: city.name,
        name: rec.town,
        blocks: []
      }
    },
    new: true,
    upsert: true
  });
}
function set_block_to_town(block){
  return db.town_master.findAndModify({
    query: {
      _id: block.town
    },
    update: {
      $addToSet: {
        blocks: [block._id, block.name]
      }
    },
    new: true,
    upsert: true
  });
}

function block_master(rec, pref, city, town){
  return db.block_master.findAndModify({
    query: {
      full: rec.block_full,
    },
    update: {
      full: rec.block_full,
      pref: pref._id,
      pref_name: pref.name,
      city: city._id,
      city_name: city.name,
      town: town._id,
      town_name: town.name,
      name: rec.block,
      loc: rec.loc
    },
    new: true,
    upsert: true
  });
}

db.region_master.drop();
db.region_master.ensureIndex({name:1},{unique: true});
db.pref_master.drop();
db.pref_master.ensureIndex({name:1},{unique: true});
db.city_master.drop();
db.city_master.ensureIndex({full:1},{unique: true});
db.town_master.drop();
db.town_master.ensureIndex({full:1},{unique: true});
db.block_master.drop()
db.block_master.ensureIndex({full:1},{unique: true});

function to_block(rec) {
  if (rec.city == '糟屋郡須惠町') {
     rec.city = '糟屋郡須恵町'
  }
  rec.town = utils.to_kanji(rec.town);
  rec.block = utils.to_fullint(rec.block);

  rec.city_full = rec.pref + ' ' + rec.city
  rec.town_full = rec.city_full + ' ' + rec.town
  rec.block_full = rec.town_full + ' ' + rec.block
  delete(rec.csnum);
  delete(rec.csx);
  delete(rec.csy);
  delete(rec.before);
  delete(rec.after);
  return rec;
}

var cur = db.address_raw.find();
while(cur.hasNext()){
  var rec = cur.next();
  rec = to_loc(rec);
  rec = to_block(rec);
  var pref = pref_master(rec);
  var city = city_master(rec, pref);
  var town = town_master(rec, pref, city);
  var block = block_master(rec, pref, city, town);

  set_city_to_pref(city);
  set_town_to_city(town);
  set_block_to_town(block);
}

db.block_master.ensureIndex({loc: '2dsphere'})
db.block_master.find( { loc: { $near: { $geometry : { type: 'Point', coordinates: [139.660713,35.57638] }, $maxDistance: 300} } } )

var REGION_MAP = {
  '北海道' : [
    '北海道'
  ],
  '東北' : [
    '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'
  ],
  '関東' : [
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'
  ],
  '中部' : [
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'
  ],
  '近畿' : [
    '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'
  ],
  '中国' : [
    '鳥取県', '島根県', '岡山県', '広島県', '山口県'
  ],
  '四国' : [
    '徳島県', '香川県', '愛媛県', '高知県'
  ],
  '九州' : [
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県'
  ],
  '沖縄' : [
    '沖縄県'
  ]
};

function region_master(){
  for(var region in REGION_MAP ){
    var prefs = [];
    for ( var i in REGION_MAP[region] ){
      var pref_name = REGION_MAP[region][i];
      var pref = db.pref_master.findAndModify({
        query: { name: pref_name },
        update: { $set: { region: region } },
        new: true,
        upsert: true
      });    
      prefs.push([pref._id, pref.name]);
    }

    db.region_master.findAndModify({
      query: { 
        name: region
      },
      update: {
        name: region,
        prefs: prefs
      },
      new: true,
      upsert: true
    });
  }
}

function sort_func(a,b){
  return utils.to_int(a,4) < utils.to_int(b,4);
}


function mod_pref(){
  var regex0 = /^((?:蒲郡市)|(?:小郡市))(.*)$/;
  var regex1 = /^(.+[郡]+)(.*)$/;
  var regex2 = /^(.+[市]+)(.*)$/;
  var cur = db.pref_master.find();
  while( cur.hasNext() ) {
    var pref = cur.next();
    var cities = {};
    for( var i in pref.cities ){
      var city_id = pref.cities[i][0];
      var city_name = pref.cities[i][1];
      var first = city_name;
      var second = '';
      var matcher = regex0.exec(city_name);
      if ( !matcher ) {
        matcher = regex1.exec(city_name);
      }
      if ( !matcher ) {
        matcher = regex2.exec(city_name);
      }else{
        if (/市/.test(matcher[1])) {
          print(pref.name + ' : ' + matcher[1] + ':' + matcher[2]); // @@@
        }
        if (/市/.test(matcher[2])) {
          print(pref.name + ' : ' + matcher[1] + ':' + matcher[2]); // @@@
        }
      }
      if ( matcher ){
        first = matcher[1];
        second = matcher[2];
      }
      if ( ! cities[first] ) {
        cities[first] = {};
      }
      if ( second === "" ) {
        cities[first] = city_id;
      }else{
        cities[first][second] = city_id;
      }
    }
    var sorted_cities = utils.hash_sort(cities,sort_func);
    for( var i in sorted_cities ) {
      sorted_cities[i] = utils.hash_sort(sorted_cities[i],sort_func);
    }
    db.pref_master.update({
      _id: pref._id
    },{
      $set: {
        city_tree: sorted_cities
      }
    });
  }
}

function mod_city(){
  var cur = db.city_master.find();
  var regex1 = /^(.+?)([一二三四五六七八九一〇十]+丁目.*)$/;
  while( cur.hasNext() ) {
    var city = cur.next();
    var towns = {};
    var CV= new str_cvalue();
    for( var i in city.towns ){
      var town_id = city.towns[i][0];
      var town_name = city.towns[i][1];
      var matcher = regex1.exec(town_name);
      if ( !matcher ) {
        CV.set(town_name);
      }
    }
    CV.calc();
    
    for( var i in city.towns ){
      var town_id = city.towns[i][0];
      var town_name = city.towns[i][1];
      var first = town_name;
      var second = "";
      var matcher = regex1.exec(town_name);
      if ( !matcher ) {
        matcher = CV.parse(town_name);
      }
      if ( matcher ) {
        first = matcher[1];
        second = matcher[2];
      }
      CV.set(town_name);
      if ( !towns[first] ) {
        towns[first] = {};
      }
      if ( second === "" ) {
        towns[first] = town_id;
      }else{
        towns[first][second] = town_id;
      }
    }
    var sorted_towns = utils.hash_sort(towns,sort_func);
    for( var i in sorted_towns ) {
      sorted_towns[i] = utils.hash_sort(sorted_towns[i],sort_func);
    }
    db.city_master.update({
      _id: city._id
    },{
      $set: {
        town_tree: sorted_towns
      }
    });
  }
}

function mod_town(){
  var cur = db.town_master.find();
  while( cur.hasNext() ) {
    var town = cur.next();
    db.town_master.update({
      _id: town._id
    },{
      $set: {
        blocks: utils.sort(town.blocks,function(a,b){ return a[1] < b[1];})
      }
    });    
  }
}

mod_pref();
mod_city();
mod_town();

//db.town_raw.find();
//while(cur.hasNext()){
//  var rec = cur.next();
//  rec = to_loc(rec);
//  pref_master(rec);
//  city_master(rec);
//  town_master(rec);
//}
//db.town_master.ensureIndex({loc: '2dsphere'})
//db.town_master.find( { loc: { $near: { $geometry : { type: 'Point', coordinates: [139.660713,35.57638] }, $maxDistance: 300} } } )
//var pref_master_by_id = {
//}
//var pref_master = {
//}
//var cur = db.pref_master.find();
//while(cur.hasNext()){
//  var rec = cur.next();
//  pref_master_by_id[rec._id] = rec.name;
//  pref_master[rec.name] = rec._id;
//}
//var city_master_by_id = {
//}
//var city_master = {
//}
//var cur = db.city_master.find();
//while(cur.hasNext()){
//  var rec = cur.next();
//  city_master_by_id[rec._id] = rec.name;
//  city_master[pref_master_by_id[rec.p_code]+rec.name] = rec._id;
//}
//var town_master = {
//}
//var cur = db.town_master.find();
//while(cur.hasNext()){
//  var rec = cur.next();
//  town_master[pref_master_by_id[rec.p_code]+city_master_by_id[rec.c_code]+rec.name] = rec._id;
//}


