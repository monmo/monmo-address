# -*- coding: utf-8 -*-
require 'json'

address_header = ["pref", "city", "town", "block", "csnum", "csx", "csy", "lat", "lon", "house", "main", "before", "after"]
town_header = ["p_code", "pref", "c_code", "city", "t_code", "town", "lat", "lon", "org", "type"]
header = nil


#KANJI_MAP = Hash[[['０','１','２','３','４','５','６','７','８','９'],['〇','一','二','三','四','五','六','七','八','九']].transpose]
#def to_kanji(line)
#  while true do
#    matcher = line.match(/([０１２３４５６７８９]+)/)
#    return line if ! matcher
#    org = matcher[1]
#    if org.length == 2
#      word = ''
#      if org[0] != '１'
#        word = KANJI_MAP[org[0]]
#      end
#      word += '十'
#      if org[1] != '０'
#        word += KANJI_MAP[org[1]]
#      end
#      line.gsub!(Regexp.new(org),word)
#    else
#      line.gsub!(Regexp.new(org),KANJI_MAP[org])
#    end
#    p line
#  end
#end

File.open(ARGV[0],'r') do |fp|
  fp.each do |line|
    if line.match(/^"都道府県名"/)
      next
    end
    line.strip!
    line.gsub!(/"/,'')
    line.gsub!(/ケ/,'ヶ')
    current = line.split(',')
    if ! header
      header = address_header
      header = town_header if current.size == 10
      next
    end
    rec = Hash[[header,current].transpose]
    puts rec.to_json
  end
end
#city_regex = /市区町村/
#town_regex = /(.+)([一二三四十五万六千七百八十九十]+丁目)$/
