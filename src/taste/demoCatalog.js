// Matched by artist and song title against Apple's public catalog. Artwork is
// bundled locally; album provenance is recorded in public/demo-covers/sources.json.
// These are catalog metadata, not measured audio features.
const CATALOG = {
  "tame impala|the less i know the better": {
    "album": "Currents",
    "coverUrl": "/demo-covers/currents.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/the-less-i-know-the-better/1440838039?i=1440838488&uo=4",
    "trackId": 1440838488
  },
  "beach house|space song": {
    "album": "Depression Cherry",
    "coverUrl": "/demo-covers/depression-cherry.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/space-song/997913392?i=997914096&uo=4",
    "trackId": 997914096
  },
  "cigarettes after sex|apocalypse": {
    "album": "Cigarettes After Sex",
    "coverUrl": "/demo-covers/cigarettes-after-sex.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/apocalypse/1217977525?i=1217977755&uo=4",
    "trackId": 1217977755
  },
  "men i trust|show me how": {
    "album": "Show Me How - Single",
    "coverUrl": "/demo-covers/show-me-how.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/show-me-how/1719975687?i=1719975688&uo=4",
    "trackId": 1719975688
  },
  "mac demarco|chamber of reflection": {
    "album": "Salad Days",
    "coverUrl": "/demo-covers/salad-days.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/chamber-of-reflection/6789834398?i=6789834619&uo=4",
    "trackId": 6789834619
  },
  "tame impala|breathe deeper": {
    "album": "The Slow Rush",
    "coverUrl": "/demo-covers/catalog-1497230760.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/breathe-deeper/1497230760?i=1497231158&uo=4",
    "trackId": 1497231158
  },
  "hyukoh|tomboy": {
    "album": "23",
    "coverUrl": "/demo-covers/catalog-1450778313.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tomboy/1450778313?i=1450778317&uo=4",
    "trackId": 1450778317
  },
  "cigarettes after sex|sunsetz": {
    "album": "Cigarettes After Sex",
    "coverUrl": "/demo-covers/cigarettes-after-sex.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sunsetz/1217977525?i=1217977722&uo=4",
    "trackId": 1217977722
  },
  "beach house|myth": {
    "album": "Bloom",
    "coverUrl": "/demo-covers/catalog-509665145.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/myth/509665145?i=509665325&uo=4",
    "trackId": 509665325
  },
  "mac demarco|ode to viceroy": {
    "album": "2",
    "coverUrl": "/demo-covers/catalog-6789812611.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/ode-to-viceroy/6789812611?i=6789812667&uo=4",
    "trackId": 6789812667
  },
  "beach house|silver soul": {
    "album": "Teen Dream (Bonus Track Version)",
    "coverUrl": "/demo-covers/catalog-349535407.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/silver-soul/349535407?i=349535422&uo=4",
    "trackId": 349535422
  },
  "men i trust|tailwhip": {
    "album": "Tailwhip - Single",
    "coverUrl": "/demo-covers/catalog-1720768197.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tailwhip/1720768197?i=1720768199&uo=4",
    "trackId": 1720768199
  },
  "tame impala|eventually": {
    "album": "Currents",
    "coverUrl": "/demo-covers/currents.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/eventually/1440838039?i=1440838298&uo=4",
    "trackId": 1440838298
  },
  "cigarettes after sex|sweet": {
    "album": "Cigarettes After Sex",
    "coverUrl": "/demo-covers/cigarettes-after-sex.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sweet/1217977525?i=1217977757&uo=4",
    "trackId": 1217977757
  },
  "hyukoh|wiing wiing": {
    "album": "20 - EP",
    "coverUrl": "/demo-covers/catalog-1450779334.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/wi-ing-wi-ing/1450779334?i=1450779338&uo=4",
    "trackId": 1450779338
  },
  "mac demarco|my kind of woman": {
    "album": "2",
    "coverUrl": "/demo-covers/catalog-6789812611.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/my-kind-of-woman/6789812611?i=6789813255&uo=4",
    "trackId": 6789813255
  },
  "men i trust|numb": {
    "album": "Numb - Single",
    "coverUrl": "/demo-covers/catalog-1458981357.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/numb/1458981357?i=1458981361&uo=4",
    "trackId": 1458981361
  },
  "tame impala|borderline": {
    "album": "The Slow Rush",
    "coverUrl": "/demo-covers/catalog-1497230760.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/borderline/1497230760?i=1497230972&uo=4",
    "trackId": 1497230972
  },
  "cigarettes after sex|k.": {
    "album": "Cigarettes After Sex",
    "coverUrl": "/demo-covers/cigarettes-after-sex.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/k/1217977525?i=1217977706&uo=4",
    "trackId": 1217977706
  },
  "the drums|days": {
    "album": "Portamento",
    "coverUrl": "/demo-covers/catalog-1581702290.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/days/1581702290?i=1581702294&uo=4",
    "trackId": 1581702294
  },
  "tame impala|let it happen": {
    "album": "Currents",
    "coverUrl": "/demo-covers/currents.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/let-it-happen/1440838039?i=1440838060&uo=4",
    "trackId": 1440838060
  },
  "beach house|master of none": {
    "album": "Beach House",
    "coverUrl": "/demo-covers/catalog-1248058009.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/master-of-none/1248058009?i=1248058067&uo=4",
    "trackId": 1248058067
  },
  "mac demarco|on the level": {
    "album": "This Old Dog",
    "coverUrl": "/demo-covers/catalog-6789830961.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/on-the-level/6789830961?i=6789831682&uo=4",
    "trackId": 6789831682
  },
  "men i trust|seven": {
    "album": "Seven - Single",
    "coverUrl": "/demo-covers/catalog-1720792668.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/seven/1720792668?i=1720792669&uo=4",
    "trackId": 1720792669
  },
  "alvvays|archie, marry me": {
    "album": "Alvvays",
    "coverUrl": "/demo-covers/catalog-1651310191.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/archie-marry-me/1651310191?i=1651310198&uo=4",
    "trackId": 1651310198
  },
  "alvvays|dreams tonite": {
    "album": "Antisocialites",
    "coverUrl": "/demo-covers/catalog-1651326694.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dreams-tonite/1651326694?i=1651326697&uo=4",
    "trackId": 1651326697
  },
  "alvvays|in undertow": {
    "album": "Antisocialites",
    "coverUrl": "/demo-covers/catalog-1651326694.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/in-undertow/1651326694?i=1651326696&uo=4",
    "trackId": 1651326696
  },
  "alvvays|adult diversion": {
    "album": "Alvvays",
    "coverUrl": "/demo-covers/catalog-1651310191.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/adult-diversion/1651310191?i=1651310195&uo=4",
    "trackId": 1651310195
  },
  "slowdive|sugar for the pill": {
    "album": "Slowdive",
    "coverUrl": "/demo-covers/catalog-1210172617.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sugar-for-the-pill/1210172617?i=1210172774&uo=4",
    "trackId": 1210172774
  },
  "slowdive|alison": {
    "album": "Souvlaki",
    "coverUrl": "/demo-covers/catalog-292885238.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/alison/292885238?i=292885253&uo=4",
    "trackId": 292885253
  },
  "slowdive|when the sun hits": {
    "album": "Souvlaki",
    "coverUrl": "/demo-covers/catalog-292885238.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/when-the-sun-hits/292885238?i=292885262&uo=4",
    "trackId": 292885262
  },
  "slowdive|star roving": {
    "album": "Slowdive",
    "coverUrl": "/demo-covers/catalog-1210172617.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/star-roving/1210172617?i=1210172772&uo=4",
    "trackId": 1210172772
  },
  "cocteau twins|heaven or las vegas": {
    "album": "Heaven Or Las Vegas (Remastered)",
    "coverUrl": "/demo-covers/catalog-258198881.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/heaven-or-las-vegas/258198881?i=258200075&uo=4",
    "trackId": 258200075
  },
  "cocteau twins|cherry-coloured funk": {
    "album": "Heaven Or Las Vegas (Remastered)",
    "coverUrl": "/demo-covers/catalog-258198881.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/cherry-coloured-funk/258198881?i=258198956&uo=4",
    "trackId": 258198956
  },
  "cocteau twins|iceblink luck": {
    "album": "Heaven Or Las Vegas (Remastered)",
    "coverUrl": "/demo-covers/catalog-258198881.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/iceblink-luck/258198881?i=258199466&uo=4",
    "trackId": 258199466
  },
  "cocteau twins|lorelei": {
    "album": "Treasure",
    "coverUrl": "/demo-covers/catalog-1027469081.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/lorelei/1027469081?i=1027469102&uo=4",
    "trackId": 1027469102
  },
  "mazzy star|fade into you": {
    "album": "So Tonight That I Might See",
    "coverUrl": "/demo-covers/catalog-1440848808.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/fade-into-you/1440848808?i=1440848810&uo=4",
    "trackId": 1440848810
  },
  "mazzy star|flowers in december": {
    "album": "Among My Swan",
    "coverUrl": "/demo-covers/catalog-724609718.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/flowers-in-december/724609718?i=724610254&uo=4",
    "trackId": 724610254
  },
  "mazzy star|into dust": {
    "album": "So Tonight That I Might See",
    "coverUrl": "/demo-covers/catalog-1440848808.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/into-dust/1440848808?i=1440848824&uo=4",
    "trackId": 1440848824
  },
  "mazzy star|blue light": {
    "album": "So Tonight That I Might See",
    "coverUrl": "/demo-covers/catalog-1440848808.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/blue-light/1440848808?i=1440848818&uo=4",
    "trackId": 1440848818
  },
  "mild high club|homage": {
    "album": "Skiptracing",
    "coverUrl": "/demo-covers/catalog-1110226847.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/homage/1110226847?i=1110226862&uo=4",
    "trackId": 1110226862
  },
  "mild high club|windowpane": {
    "album": "Timeline",
    "coverUrl": "/demo-covers/catalog-1014767571.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/windowpane/1014767571?i=1014767682&uo=4",
    "trackId": 1014767682
  },
  "mild high club|skiptracing": {
    "album": "Skiptracing",
    "coverUrl": "/demo-covers/catalog-1110226847.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/skiptracing/1110226847?i=1110226861&uo=4",
    "trackId": 1110226861
  },
  "mild high club|tesselation": {
    "album": "Skiptracing",
    "coverUrl": "/demo-covers/catalog-1110226847.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tesselation/1110226847?i=1110226864&uo=4",
    "trackId": 1110226864
  },
  "crumb|locket": {
    "album": "Locket - EP",
    "coverUrl": "/demo-covers/catalog-1465125802.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/locket/1465125802?i=1465126178&uo=4",
    "trackId": 1465126178
  },
  "crumb|plants": {
    "album": "Locket - EP",
    "coverUrl": "/demo-covers/catalog-1465125802.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/plants/1465125802?i=1465125973&uo=4",
    "trackId": 1465125973
  },
  "crumb|ghostride": {
    "album": "Jinx",
    "coverUrl": "/demo-covers/catalog-1456789832.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/ghostride/1456789832?i=1456789839&uo=4",
    "trackId": 1456789839
  },
  "crumb|part iii": {
    "album": "Jinx",
    "coverUrl": "/demo-covers/catalog-1456789832.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/part-iii/1456789832?i=1456789843&uo=4",
    "trackId": 1456789843
  },
  "still woozy|goodie bag": {
    "album": "Goodie Bag - Single",
    "coverUrl": "/demo-covers/catalog-1483283927.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/goodie-bag/1483283927?i=1483283935&uo=4",
    "trackId": 1483283935
  },
  "still woozy|habit": {
    "album": "Lately - EP",
    "coverUrl": "/demo-covers/catalog-1483298321.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/habit/1483298321?i=1483298326&uo=4",
    "trackId": 1483298326
  },
  "still woozy|window": {
    "album": "If This Isn’t Nice, I Don’t Know What Is",
    "coverUrl": "/demo-covers/catalog-1580843107.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/window/1580843107?i=1580843384&uo=4",
    "trackId": 1580843384
  },
  "still woozy|cooks": {
    "album": "Cooks - Single",
    "coverUrl": "/demo-covers/catalog-1483284061.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/cooks/1483284061?i=1483284065&uo=4",
    "trackId": 1483284065
  },
  "boy pablo|everytime": {
    "album": "Roy Pablo - EP",
    "coverUrl": "/demo-covers/catalog-1234864053.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/everytime/1234864053?i=1234864149&uo=4",
    "trackId": 1234864149
  },
  "boy pablo|feeling lonely": {
    "album": "Soy Pablo - EP",
    "coverUrl": "/demo-covers/catalog-1435798612.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/feeling-lonely/1435798612?i=1435798616&uo=4",
    "trackId": 1435798616
  },
  "boy pablo|dance, baby!": {
    "album": "Roy Pablo - EP",
    "coverUrl": "/demo-covers/catalog-1234864053.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dance-baby/1234864053?i=1234864272&uo=4",
    "trackId": 1234864272
  },
  "boy pablo|hey girl": {
    "album": "Wachito Rico",
    "coverUrl": "/demo-covers/catalog-1519352199.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/hey-girl/1519352199?i=1519352206&uo=4",
    "trackId": 1519352206
  },
  "japanese breakfast|be sweet": {
    "album": "Jubilee",
    "coverUrl": "/demo-covers/catalog-1553364590.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/be-sweet/1553364590?i=1553364593&uo=4",
    "trackId": 1553364593
  },
  "japanese breakfast|kokomo, in": {
    "album": "Jubilee",
    "coverUrl": "/demo-covers/catalog-1553364590.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/kokomo-in/1553364590?i=1553364594&uo=4",
    "trackId": 1553364594
  },
  "japanese breakfast|the body is a blade": {
    "album": "Soft Sounds from Another Planet",
    "coverUrl": "/demo-covers/catalog-1227860261.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/the-body-is-a-blade/1227860261?i=1227860282&uo=4",
    "trackId": 1227860282
  },
  "japanese breakfast|road head": {
    "album": "Soft Sounds from Another Planet",
    "coverUrl": "/demo-covers/catalog-1227860261.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/road-head/1227860261?i=1227860275&uo=4",
    "trackId": 1227860275
  },
  "the marías|hush": {
    "album": "CINEMA",
    "coverUrl": "/demo-covers/catalog-1563957170.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/hush/1563957170?i=1563957173&uo=4",
    "trackId": 1563957173
  },
  "the marías|cariño": {
    "album": "Superclean, Vol. II - EP",
    "coverUrl": "/demo-covers/catalog-1436703562.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/cari%C3%B1o/1436703562?i=1436703569&uo=4",
    "trackId": 1436703569
  },
  "the marías|only in my dreams": {
    "album": "Superclean, Vol. I - EP",
    "coverUrl": "/demo-covers/catalog-1302158479.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/only-in-my-dreams/1302158479?i=1302158487&uo=4",
    "trackId": 1302158487
  },
  "the marías|ruthless": {
    "album": "Superclean, Vol. II - EP",
    "coverUrl": "/demo-covers/catalog-1436703562.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/ruthless/1436703562?i=1436703568&uo=4",
    "trackId": 1436703568
  },
  "the xx|intro": {
    "album": "xx",
    "coverUrl": "/demo-covers/catalog-1850810462.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/intro/1850810462?i=1850810463&uo=4",
    "trackId": 1850810463
  },
  "the xx|angels": {
    "album": "Coexist",
    "coverUrl": "/demo-covers/catalog-555642294.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/angels/555642294?i=555642308&uo=4",
    "trackId": 555642308
  },
  "the xx|islands": {
    "album": "xx",
    "coverUrl": "/demo-covers/catalog-1850810462.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/islands/1850810462?i=1850810466&uo=4",
    "trackId": 1850810466
  },
  "the xx|crystalised": {
    "album": "xx",
    "coverUrl": "/demo-covers/catalog-1850810462.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/crystalised/1850810462?i=1850810465&uo=4",
    "trackId": 1850810465
  },
  "khruangbin|friday morning": {
    "album": "Con Todo El Mundo",
    "coverUrl": "/demo-covers/catalog-1299241642.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/friday-morning/1299241642?i=1299241652&uo=4",
    "trackId": 1299241652
  },
  "khruangbin|august 10": {
    "album": "Con Todo El Mundo",
    "coverUrl": "/demo-covers/catalog-1299241642.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/august-10/1299241642?i=1299241646&uo=4",
    "trackId": 1299241646
  },
  "khruangbin|time (you and i)": {
    "album": "Mordechai",
    "coverUrl": "/demo-covers/catalog-1501585499.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/time-you-and-i/1501585499?i=1501585505&uo=4",
    "trackId": 1501585505
  },
  "khruangbin|so we won't forget": {
    "album": "Mordechai",
    "coverUrl": "/demo-covers/catalog-1501585499.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/so-we-wont-forget/1501585499?i=1501585812&uo=4",
    "trackId": 1501585812
  },
  "clairo|bags": {
    "album": "Immunity",
    "coverUrl": "/demo-covers/catalog-1893175128.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/bags/1893175128?i=1893175134&uo=4",
    "trackId": 1893175134
  },
  "clairo|sofia": {
    "album": "Immunity",
    "coverUrl": "/demo-covers/catalog-1893175128.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sofia/1893175128?i=1893175139&uo=4",
    "trackId": 1893175139
  },
  "clairo|amoeba": {
    "album": "Sling",
    "coverUrl": "/demo-covers/catalog-1571215405.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/amoeba/1571215405?i=1571215410&uo=4",
    "trackId": 1571215410
  },
  "clairo|pretty girl": {
    "album": "diary 001 - EP",
    "coverUrl": "/demo-covers/catalog-1893174883.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/pretty-girl/1893174883?i=1893174888&uo=4",
    "trackId": 1893174888
  },
  "wave to earth|seasons": {
    "album": "summer flows 0.02 - EP",
    "coverUrl": "/demo-covers/catalog-1781856626.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/seasons/1781856626?i=1781856632&uo=4",
    "trackId": 1781856632
  },
  "wave to earth|bad": {
    "album": "0.1 flaws and all.",
    "coverUrl": "/demo-covers/catalog-1770274106.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/bad/1770274106?i=1770274109&uo=4",
    "trackId": 1770274109
  },
  "wave to earth|love.": {
    "album": "0.1 flaws and all.",
    "coverUrl": "/demo-covers/catalog-1770274106.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/love/1770274106?i=1770274550&uo=4",
    "trackId": 1770274550
  },
  "wave to earth|peach eyes": {
    "album": "0.1 flaws and all.",
    "coverUrl": "/demo-covers/catalog-1770274106.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/peach-eyes/1770274106?i=1770274119&uo=4",
    "trackId": 1770274119
  },
  "daft punk|get lucky": {
    "album": "Random Access Memories",
    "coverUrl": "/demo-covers/random-access-memories.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/get-lucky/617154241?i=617154366&uo=4",
    "trackId": 617154366
  },
  "kavinsky|nightcall": {
    "album": "Nightcall",
    "coverUrl": "/demo-covers/catalog-1442447952.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/nightcall/1442447952?i=1442447970&uo=4",
    "trackId": 1442447970
  },
  "justice|d.a.n.c.e.": {
    "album": "Justice",
    "coverUrl": "/demo-covers/justice.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/d-a-n-c-e/259751732?i=259751997&uo=4",
    "trackId": 259751997
  },
  "the weeknd|blinding lights": {
    "album": "After Hours",
    "coverUrl": "/demo-covers/catalog-1499378108.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/blinding-lights/1499378108?i=1499378607&uo=4",
    "trackId": 1499378607
  },
  "daft punk|harder, better, faster, stronger": {
    "album": "Discovery",
    "coverUrl": "/demo-covers/discovery.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/harder-better-faster-stronger/697194953?i=697195787&uo=4",
    "trackId": 697195787
  },
  "the weeknd|starboy": {
    "album": "Starboy",
    "coverUrl": "/demo-covers/starboy.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/starboy-feat-daft-punk/1440870373?i=1440870375&uo=4",
    "trackId": 1440870375
  },
  "justice|genesis": {
    "album": "Justice",
    "coverUrl": "/demo-covers/justice.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/genesis/259751732?i=259751738&uo=4",
    "trackId": 259751738
  },
  "kavinsky|pacific coast highway": {
    "album": "Nightcall",
    "coverUrl": "/demo-covers/catalog-1442447952.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/pacific-coast-highway/1442447952?i=1442448165&uo=4",
    "trackId": 1442448165
  },
  "daft punk|around the world": {
    "album": "Homework",
    "coverUrl": "/demo-covers/catalog-696884422.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/around-the-world/696884422?i=696886431&uo=4",
    "trackId": 696886431
  },
  "gesaffelstein, the weeknd|lost in the fire": {
    "album": "Hyperion",
    "coverUrl": "/demo-covers/catalog-1453895416.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/lost-in-the-fire/1453895416?i=1453895423&uo=4",
    "trackId": 1453895423
  },
  "daft punk|one more time": {
    "album": "Discovery",
    "coverUrl": "/demo-covers/discovery.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/one-more-time/697194953?i=697195462&uo=4",
    "trackId": 697195462
  },
  "justice|safe and sound": {
    "album": "Woman",
    "coverUrl": "/demo-covers/catalog-1151157609.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/safe-and-sound/1151157609?i=1151158104&uo=4",
    "trackId": 1151158104
  },
  "kavinsky|odd look": {
    "album": "Outrun",
    "coverUrl": "/demo-covers/outrun.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/odd-look/1440873249?i=1440873368&uo=4",
    "trackId": 1440873368
  },
  "daft punk|instant crush": {
    "album": "Random Access Memories",
    "coverUrl": "/demo-covers/random-access-memories.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/instant-crush/617154241?i=617154362&uo=4",
    "trackId": 617154362
  },
  "the weeknd|save your tears": {
    "album": "After Hours",
    "coverUrl": "/demo-covers/after-hours.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/save-your-tears/1499385848?i=1499386369&uo=4",
    "trackId": 1499386369
  },
  "justice|waters of nazareth": {
    "album": "Justice",
    "coverUrl": "/demo-covers/justice.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/waters-of-nazareth/259751732?i=259753668&uo=4",
    "trackId": 259753668
  },
  "kavinsky|protovision": {
    "album": "Outrun",
    "coverUrl": "/demo-covers/outrun.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/protovision/1440873249?i=1440873363&uo=4",
    "trackId": 1440873363
  },
  "daft punk|digital love": {
    "album": "Discovery",
    "coverUrl": "/demo-covers/discovery.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/digital-love/697194953?i=697195633&uo=4",
    "trackId": 697195633
  },
  "the weeknd|take my breath": {
    "album": "Dawn FM",
    "coverUrl": "/demo-covers/catalog-1603171516.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/take-my-breath/1603171516?i=1603171531&uo=4",
    "trackId": 1603171531
  },
  "justice|we are your friends": {
    "album": "We Are Your Friends",
    "coverUrl": "/demo-covers/catalog-1663629922.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/we-are-your-friends-justice-vs-simian/1663629922?i=1663629931&uo=4",
    "trackId": 1663629931
  },
  "daft punk|something about us": {
    "album": "Discovery",
    "coverUrl": "/demo-covers/discovery.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/something-about-us/697194953?i=697195941&uo=4",
    "trackId": 697195941
  },
  "the weeknd|i feel it coming": {
    "album": "Starboy",
    "coverUrl": "/demo-covers/catalog-1440871397.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/i-feel-it-coming-feat-daft-punk/1440871397?i=1440872309&uo=4",
    "trackId": 1440872309
  },
  "m83|midnight city": {
    "album": "Hurry up, We're Dreaming",
    "coverUrl": "/demo-covers/catalog-1674216738.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/midnight-city/1674216738?i=1674217008&uo=4",
    "trackId": 1674217008
  },
  "gesaffelstein|pursuit": {
    "album": "Aleph",
    "coverUrl": "/demo-covers/catalog-705962680.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/pursuit/705962680?i=705962876&uo=4",
    "trackId": 705962876
  },
  "gesaffelstein|hate or glory": {
    "album": "Aleph",
    "coverUrl": "/demo-covers/catalog-705962680.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/hate-or-glory/705962680?i=705962901&uo=4",
    "trackId": 705962901
  },
  "gesaffelstein|aleph": {
    "album": "Aleph",
    "coverUrl": "/demo-covers/catalog-705962680.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/aleph/705962680?i=705962896&uo=4",
    "trackId": 705962896
  },
  "m83|wait": {
    "album": "Hurry up, We're Dreaming",
    "coverUrl": "/demo-covers/catalog-1674216738.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/wait/1674216738?i=1674217581&uo=4",
    "trackId": 1674217581
  },
  "m83|reunion": {
    "album": "Hurry up, We're Dreaming",
    "coverUrl": "/demo-covers/catalog-1674216738.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/reunion/1674216738?i=1674217187&uo=4",
    "trackId": 1674217187
  },
  "m83|outro": {
    "album": "Hurry up, We're Dreaming",
    "coverUrl": "/demo-covers/catalog-1674216738.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/outro/1674216738?i=1674219107&uo=4",
    "trackId": 1674219107
  },
  "chvrches|the mother we share": {
    "album": "The Bones of What You Believe",
    "coverUrl": "/demo-covers/catalog-1771703110.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/the-mother-we-share/1771703110?i=1771703112&uo=4",
    "trackId": 1771703112
  },
  "chvrches|clearest blue": {
    "album": "Every Open Eye",
    "coverUrl": "/demo-covers/catalog-1771710587.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/clearest-blue/1771710587?i=1771710895&uo=4",
    "trackId": 1771710895
  },
  "chvrches|leave a trace": {
    "album": "Every Open Eye (Extended Edition)",
    "coverUrl": "/demo-covers/catalog-1771718231.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/leave-a-trace/1771718231?i=1771718233&uo=4",
    "trackId": 1771718233
  },
  "chvrches|recover": {
    "album": "The Bones of What You Believe",
    "coverUrl": "/demo-covers/catalog-1771703110.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/recover/1771703110?i=1771703578&uo=4",
    "trackId": 1771703578
  },
  "purity ring|fineshrine": {
    "album": "Shrines",
    "coverUrl": "/demo-covers/catalog-535907905.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/fineshrine/535907905?i=535908171&uo=4",
    "trackId": 535908171
  },
  "purity ring|obedear": {
    "album": "Shrines",
    "coverUrl": "/demo-covers/catalog-535907905.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/obedear/535907905?i=535908185&uo=4",
    "trackId": 535908185
  },
  "purity ring|begin again": {
    "album": "Another Eternity",
    "coverUrl": "/demo-covers/catalog-953409287.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/begin-again/953409287?i=953409301&uo=4",
    "trackId": 953409301
  },
  "carpenter brut|turbo killer": {
    "album": "Trilogy",
    "coverUrl": "/demo-covers/catalog-1440894748.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/turbo-killer/1440894748?i=1440894872&uo=4",
    "trackId": 1440894872
  },
  "carpenter brut|le perv": {
    "album": "Trilogy",
    "coverUrl": "/demo-covers/catalog-1440894748.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/le-perv/1440894748?i=1440894860&uo=4",
    "trackId": 1440894860
  },
  "carpenter brut|paradise warfare": {
    "album": "Trilogy",
    "coverUrl": "/demo-covers/catalog-1440894748.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/paradise-warfare/1440894748?i=1440894870&uo=4",
    "trackId": 1440894870
  },
  "carpenter brut|roller mobster": {
    "album": "Trilogy",
    "coverUrl": "/demo-covers/catalog-1440894748.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/roller-mobster/1440894748?i=1440894861&uo=4",
    "trackId": 1440894861
  },
  "the midnight|sunset": {
    "album": "Endless Summer",
    "coverUrl": "/demo-covers/catalog-1758759164.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sunset/1758759164?i=1758759167&uo=4",
    "trackId": 1758759167
  },
  "the midnight|los angeles": {
    "album": "Days of Thunder",
    "coverUrl": "/demo-covers/catalog-1758760030.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/los-angeles/1758760030?i=1758760038&uo=4",
    "trackId": 1758760038
  },
  "the midnight|days of thunder": {
    "album": "Days of Thunder",
    "coverUrl": "/demo-covers/catalog-1758760030.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/days-of-thunder/1758760030?i=1758760036&uo=4",
    "trackId": 1758760036
  },
  "the midnight|vampires": {
    "album": "Endless Summer",
    "coverUrl": "/demo-covers/catalog-1758759164.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/vampires/1758759164?i=1758759413&uo=4",
    "trackId": 1758759413
  },
  "gunship|tech noir": {
    "album": "GUNSHIP",
    "coverUrl": "/demo-covers/catalog-998104509.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tech-noir/998104509?i=998104512&uo=4",
    "trackId": 998104512
  },
  "gunship|fly for your life": {
    "album": "GUNSHIP",
    "coverUrl": "/demo-covers/catalog-998104509.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/fly-for-your-life/998104509?i=998104756&uo=4",
    "trackId": 998104756
  },
  "gunship|dark all day": {
    "album": "Dark All Day",
    "coverUrl": "/demo-covers/catalog-1406634586.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dark-all-day-feat-tim-cappello-indiana/1406634586?i=1406634588&uo=4",
    "trackId": 1406634588
  },
  "fm-84|running in the night": {
    "album": "Atlas",
    "coverUrl": "/demo-covers/catalog-1842390497.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/running-in-the-night/1842390497?i=1842390499&uo=4",
    "trackId": 1842390499
  },
  "fm-84|don't want to change your mind": {
    "album": "Atlas",
    "coverUrl": "/demo-covers/catalog-1842390497.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dont-want-to-change-your-mind-feat-ollie-wride/1842390497?i=1842390775&uo=4",
    "trackId": 1842390775
  },
  "fm-84|arcade summer": {
    "album": "Atlas",
    "coverUrl": "/demo-covers/catalog-1842390497.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/arcade-summer/1842390497?i=1842390773&uo=4",
    "trackId": 1842390773
  },
  "com truise|brokendate": {
    "album": "Galactic Melt",
    "coverUrl": "/demo-covers/catalog-679488051.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/brokendate/679488051?i=679488187&uo=4",
    "trackId": 679488187
  },
  "com truise|propagation": {
    "album": "Iteration",
    "coverUrl": "/demo-covers/catalog-1218824738.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/propagation/1218824738?i=1218825104&uo=4",
    "trackId": 1218825104
  },
  "com truise|open": {
    "album": "In Decay",
    "coverUrl": "/demo-covers/catalog-679252017.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/open/679252017?i=679252352&uo=4",
    "trackId": 679252352
  },
  "kiasmos|looped": {
    "album": "Kiasmos",
    "coverUrl": "/demo-covers/catalog-1451077320.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/looped/1451077320?i=1451077338&uo=4",
    "trackId": 1451077338
  },
  "kiasmos|burnt": {
    "album": "Kiasmos",
    "coverUrl": "/demo-covers/catalog-1451077320.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/burnt/1451077320?i=1451077827&uo=4",
    "trackId": 1451077827
  },
  "kiasmos|thrown": {
    "album": "Kiasmos",
    "coverUrl": "/demo-covers/catalog-1451077320.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/thrown/1451077320?i=1451077686&uo=4",
    "trackId": 1451077686
  },
  "bicep|glue": {
    "album": "Bicep",
    "coverUrl": "/demo-covers/catalog-1240586047.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/glue/1240586047?i=1240586502&uo=4",
    "trackId": 1240586502
  },
  "bicep|apricots": {
    "album": "Isles",
    "coverUrl": "/demo-covers/catalog-1531704818.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/apricots/1531704818?i=1531704822&uo=4",
    "trackId": 1531704822
  },
  "bicep|atlas": {
    "album": "Isles",
    "coverUrl": "/demo-covers/catalog-1531704818.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/atlas/1531704818?i=1531704819&uo=4",
    "trackId": 1531704819
  },
  "bonobo|kerala": {
    "album": "Migration",
    "coverUrl": "/demo-covers/catalog-1169245868.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/kerala/1169245868?i=1169246072&uo=4",
    "trackId": 1169246072
  },
  "bonobo|cirrus": {
    "album": "The North Borders",
    "coverUrl": "/demo-covers/catalog-611171778.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/cirrus/611171778?i=611171963&uo=4",
    "trackId": 611171963
  },
  "bonobo|kiara": {
    "album": "Black Sands",
    "coverUrl": "/demo-covers/catalog-416292276.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/kiara/416292276?i=416292278&uo=4",
    "trackId": 416292278
  },
  "tycho|awake": {
    "album": "Awake",
    "coverUrl": "/demo-covers/catalog-793928184.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/awake/793928184?i=793928278&uo=4",
    "trackId": 793928278
  },
  "tycho|a walk": {
    "album": "Dive",
    "coverUrl": "/demo-covers/catalog-679251532.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/a-walk/679251532?i=679251628&uo=4",
    "trackId": 679251628
  },
  "tycho|montana": {
    "album": "Awake",
    "coverUrl": "/demo-covers/catalog-793928184.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/montana/793928184?i=793928279&uo=4",
    "trackId": 793928279
  },
  "tycho|hours": {
    "album": "Dive",
    "coverUrl": "/demo-covers/catalog-679251532.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/hours/679251532?i=679251630&uo=4",
    "trackId": 679251630
  },
  "tycho|dive": {
    "album": "Dive",
    "coverUrl": "/demo-covers/catalog-679251532.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dive/679251532?i=679251720&uo=4",
    "trackId": 679251720
  },
  "tycho|coastal brake": {
    "album": "Dive",
    "coverUrl": "/demo-covers/catalog-679251532.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/coastal-brake/679251532?i=679251722&uo=4",
    "trackId": 679251722
  },
  "odesza|a moment apart": {
    "album": "A Moment Apart",
    "coverUrl": "/demo-covers/catalog-1240361817.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/a-moment-apart/1240361817?i=1240362777&uo=4",
    "trackId": 1240362777
  },
  "odesza|line of sight": {
    "album": "A Moment Apart",
    "coverUrl": "/demo-covers/catalog-1240361817.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/line-of-sight-feat-mansionair-wynne/1240361817?i=1240362782&uo=4",
    "trackId": 1240362782
  },
  "odesza|say my name": {
    "album": "In Return",
    "coverUrl": "/demo-covers/catalog-897564246.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/say-my-name-feat-zyra/897564246?i=897564278&uo=4",
    "trackId": 897564278
  },
  "rüfüs du sol|innerbloom": {
    "album": "Bloom",
    "coverUrl": "/demo-covers/catalog-1058740883.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/innerbloom/1058740883?i=1058740894&uo=4",
    "trackId": 1058740894
  },
  "rüfüs du sol|you were right": {
    "album": "Bloom",
    "coverUrl": "/demo-covers/catalog-1058740883.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/you-were-right/1058740883?i=1058740887&uo=4",
    "trackId": 1058740887
  },
  "rüfüs du sol|underwater": {
    "album": "SOLACE",
    "coverUrl": "/demo-covers/catalog-1434579572.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/underwater/1434579572?i=1434579731&uo=4",
    "trackId": 1434579731
  },
  "jungle|busy earnin'": {
    "album": "Jungle",
    "coverUrl": "/demo-covers/catalog-872853887.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/busy-earnin/872853887?i=872853945&uo=4",
    "trackId": 872853945
  },
  "jungle|casio": {
    "album": "For Ever",
    "coverUrl": "/demo-covers/catalog-1409552051.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/casio/1409552051?i=1409552455&uo=4",
    "trackId": 1409552455
  },
  "jungle|keep moving": {
    "album": "Loving In Stereo",
    "coverUrl": "/demo-covers/catalog-1555318008.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/keep-moving/1555318008?i=1555318018&uo=4",
    "trackId": 1555318018
  },
  "parcels|tieduprightnow": {
    "album": "Parcels",
    "coverUrl": "/demo-covers/catalog-1420157166.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tieduprightnow/1420157166?i=1420158345&uo=4",
    "trackId": 1420158345
  },
  "parcels|overnight": {
    "album": "Overnight - Single",
    "coverUrl": "/demo-covers/catalog-1484102924.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/overnight/1484102924?i=1484103219&uo=4",
    "trackId": 1484103219
  },
  "parcels|lightenup": {
    "album": "Parcels",
    "coverUrl": "/demo-covers/catalog-1420157166.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/lightenup/1420157166?i=1420157743&uo=4",
    "trackId": 1420157743
  },
  "tom misch|south of the river": {
    "album": "Geography",
    "coverUrl": "/demo-covers/geography.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/south-of-the-river/1327772541?i=1327772742&uo=4",
    "trackId": 1327772742
  },
  "masego, fkj|tadow": {
    "album": "Lady Lady",
    "coverUrl": "/demo-covers/lady-lady.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tadow/1794865076?i=1794866252&uo=4",
    "trackId": 1794866252
  },
  "the black skirts|everything": {
    "album": "TEAM BABY",
    "coverUrl": "/demo-covers/team-baby.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/everything/1242154383?i=1242155576&uo=4",
    "trackId": 1242155576
  },
  "yerin baek|square": {
    "album": "Every letter I sent you.",
    "coverUrl": "/demo-covers/every-letter.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/square-2017/1490544506?i=1490544823&uo=4",
    "trackId": 1490544823
  },
  "laufey|from the start": {
    "album": "Bewitched",
    "coverUrl": "/demo-covers/bewitched.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/from-the-start/1690607869?i=1690609217&uo=4",
    "trackId": 1690609217
  },
  "tom misch|disco yes": {
    "album": "Geography",
    "coverUrl": "/demo-covers/geography.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/disco-yes/1327772541?i=1327772861&uo=4",
    "trackId": 1327772861
  },
  "fkj|ylang ylang": {
    "album": "Ylang Ylang - EP",
    "coverUrl": "/demo-covers/catalog-1881381523.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/ylang-ylang/1881381523?i=1881381528&uo=4",
    "trackId": 1881381528
  },
  "the black skirts|antifreeze": {
    "album": "201 (Special Edition)",
    "coverUrl": "/demo-covers/catalog-1316404325.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/antifreeze/1316404325?i=1316404636&uo=4",
    "trackId": 1316404636
  },
  "yerin baek|maybe it's not our fault": {
    "album": "Our Love is Great",
    "coverUrl": "/demo-covers/catalog-1698534871.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/maybe-its-not-our-fault/1698534871?i=1698534874&uo=4",
    "trackId": 1698534874
  },
  "laufey|valentine": {
    "album": "Everything I Know About Love",
    "coverUrl": "/demo-covers/catalog-1641539616.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/valentine/1641539616?i=1641539965&uo=4",
    "trackId": 1641539965
  },
  "tom misch|it runs through me": {
    "album": "Geography",
    "coverUrl": "/demo-covers/geography.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/it-runs-through-me-feat-de-la-soul/1327772541?i=1327772855&uo=4",
    "trackId": 1327772855
  },
  "fkj|vibin' out": {
    "album": "French Kiwi Juice",
    "coverUrl": "/demo-covers/catalog-1666672725.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/vibin-out/1666672725?i=1666672835&uo=4",
    "trackId": 1666672835
  },
  "the black skirts|who do you love": {
    "album": "TEAM BABY",
    "coverUrl": "/demo-covers/team-baby.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/who-do-you-love/1242154383?i=1242155574&uo=4",
    "trackId": 1242155574
  },
  "yerin baek|popo": {
    "album": "Every letter I sent you.",
    "coverUrl": "/demo-covers/every-letter.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/popo-how-deep-is-our-love/1490544506?i=1490544509&uo=4",
    "trackId": 1490544509
  },
  "laufey|promise": {
    "album": "Bewitched",
    "coverUrl": "/demo-covers/bewitched.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/promise/1690607869?i=1690608935&uo=4",
    "trackId": 1690608935
  },
  "tom misch|movie": {
    "album": "Geography",
    "coverUrl": "/demo-covers/geography.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/movie/1327772541?i=1327772747&uo=4",
    "trackId": 1327772747
  },
  "fkj|so much to me": {
    "album": "Time for a Change - EP",
    "coverUrl": "/demo-covers/catalog-1666509485.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/so-much-to-me/1666509485?i=1666509755&uo=4",
    "trackId": 1666509755
  },
  "the black skirts|love is all": {
    "album": "TEAM BABY",
    "coverUrl": "/demo-covers/team-baby.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/love-is-all/1242154383?i=1242155570&uo=4",
    "trackId": 1242155570
  },
  "yerin baek|0310": {
    "album": "Every letter I sent you.",
    "coverUrl": "/demo-covers/every-letter.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/0310/1490544506?i=1490544515&uo=4",
    "trackId": 1490544515
  },
  "laufey|falling behind": {
    "album": "Everything I Know About Love",
    "coverUrl": "/demo-covers/catalog-1641539616.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/falling-behind/1641539616?i=1641540030&uo=4",
    "trackId": 1641540030
  },
  "tom misch|lost in paris": {
    "album": "Geography",
    "coverUrl": "/demo-covers/geography.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/lost-in-paris-feat-goldlink/1327772541?i=1327772741&uo=4",
    "trackId": 1327772741
  },
  "lady gaga, bruno mars|die with a smile": {
    "album": "MAYHEM",
    "coverUrl": "/demo-covers/catalog-1792666546.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/die-with-a-smile/1792666546?i=1792667027&uo=4",
    "trackId": 1792667027
  },
  "frank ocean|pink + white": {
    "album": "Blonde",
    "coverUrl": "/demo-covers/catalog-1146195596.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/pink-white/1146195596?i=1146195714&uo=4",
    "trackId": 1146195714
  },
  "frank ocean|ivy": {
    "album": "Blonde",
    "coverUrl": "/demo-covers/catalog-1146195596.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/ivy/1146195596?i=1146195713&uo=4",
    "trackId": 1146195713
  },
  "frank ocean|thinkin bout you": {
    "album": "channel ORANGE",
    "coverUrl": "/demo-covers/catalog-1440765580.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/thinkin-bout-you/1440765580?i=1440766128&uo=4",
    "trackId": 1440766128
  },
  "frank ocean|nights": {
    "album": "Blonde",
    "coverUrl": "/demo-covers/catalog-1146195596.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/nights/1146195596?i=1146195720&uo=4",
    "trackId": 1146195720
  },
  "daniel caesar|get you": {
    "album": "Freudian",
    "coverUrl": "/demo-covers/catalog-1799080774.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/get-you-feat-kali-uchis/1799080774?i=1799080775&uo=4",
    "trackId": 1799080775
  },
  "daniel caesar|best part": {
    "album": "Freudian",
    "coverUrl": "/demo-covers/catalog-1799080774.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/best-part-feat-h-e-r/1799080774?i=1799080776&uo=4",
    "trackId": 1799080776
  },
  "daniel caesar|japanese denim": {
    "album": "Get You - Single",
    "coverUrl": "/demo-covers/catalog-1799080474.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/japanese-denim/1799080474?i=1799080619&uo=4",
    "trackId": 1799080619
  },
  "daniel caesar|always": {
    "album": "NEVER ENOUGH",
    "coverUrl": "/demo-covers/catalog-1671667136.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/always/1671667136?i=1671667142&uo=4",
    "trackId": 1671667142
  },
  "sza|good days": {
    "album": "SOS",
    "coverUrl": "/demo-covers/catalog-1658650093.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/good-days/1658650093?i=1658650802&uo=4",
    "trackId": 1658650802
  },
  "sza|snooze": {
    "album": "SOS",
    "coverUrl": "/demo-covers/catalog-1658650093.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/snooze/1658650093?i=1658650499&uo=4",
    "trackId": 1658650499
  },
  "sza|the weekend": {
    "album": "Ctrl",
    "coverUrl": "/demo-covers/catalog-1239977075.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/the-weekend/1239977075?i=1239977718&uo=4",
    "trackId": 1239977718
  },
  "sza|broken clocks": {
    "album": "Ctrl",
    "coverUrl": "/demo-covers/catalog-1239977075.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/broken-clocks/1239977075?i=1239977721&uo=4",
    "trackId": 1239977721
  },
  "sade|smooth operator": {
    "album": "Diamond Life",
    "coverUrl": "/demo-covers/catalog-211429791.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/smooth-operator/211429791?i=211429895&uo=4",
    "trackId": 211429895
  },
  "sade|no ordinary love": {
    "album": "The Best of Sade",
    "coverUrl": "/demo-covers/catalog-604770232.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/no-ordinary-love/604770232?i=604770783&uo=4",
    "trackId": 604770783
  },
  "sade|by your side": {
    "album": "Lovers Rock",
    "coverUrl": "/demo-covers/catalog-193532145.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/by-your-side/193532145?i=193532153&uo=4",
    "trackId": 193532153
  },
  "sade|kiss of life": {
    "album": "The Best of Sade",
    "coverUrl": "/demo-covers/catalog-604770232.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/kiss-of-life/604770232?i=604771089&uo=4",
    "trackId": 604771089
  },
  "norah jones|don't know why": {
    "album": "Come Away with Me (Remastered)",
    "coverUrl": "/demo-covers/catalog-1624173298.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dont-know-why/1624173298?i=1624173757&uo=4",
    "trackId": 1624173757
  },
  "norah jones|sunrise": {
    "album": "Feels Like Home",
    "coverUrl": "/demo-covers/catalog-721258539.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sunrise/721258539?i=721258700&uo=4",
    "trackId": 721258700
  },
  "norah jones|come away with me": {
    "album": "Come Away with Me (Remastered)",
    "coverUrl": "/demo-covers/catalog-1624173298.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/come-away-with-me/1624173298?i=1624174098&uo=4",
    "trackId": 1624174098
  },
  "norah jones|turn me on": {
    "album": "Come Away with Me (Remastered)",
    "coverUrl": "/demo-covers/catalog-1624173298.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/turn-me-on/1624173298?i=1624174335&uo=4",
    "trackId": 1624174335
  },
  "nujabes|feather": {
    "album": "Modal Soul",
    "coverUrl": "/demo-covers/catalog-1078914477.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/feather-feat-cise-star-akin/1078914477?i=1078914485&uo=4",
    "trackId": 1078914485
  },
  "nujabes|aruarian dance": {
    "album": "Samurai Champloo Music Record Departure",
    "coverUrl": "/demo-covers/catalog-1721842998.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/aruarian-dance/1721842998?i=1721843001&uo=4",
    "trackId": 1721843001
  },
  "nujabes|luv(sic) pt3": {
    "album": "Modal Soul",
    "coverUrl": "/demo-covers/catalog-1078914477.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/luv-sic-pt-3-feat-shing02/1078914477?i=1078914488&uo=4",
    "trackId": 1078914488
  },
  "nujabes|reflection eternal": {
    "album": "Modal Soul",
    "coverUrl": "/demo-covers/catalog-1078914477.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/reflection-eternal/1078914477?i=1078914487&uo=4",
    "trackId": 1078914487
  },
  "badbadnotgood|time moves slow": {
    "album": "IV",
    "coverUrl": "/demo-covers/catalog-1608122086.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/time-moves-slow/1608122086?i=1608122095&uo=4",
    "trackId": 1608122095
  },
  "badbadnotgood|in your eyes": {
    "album": "Café del Mar, Vol. 24",
    "coverUrl": "/demo-covers/catalog-1397175439.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/in-your-eyes/1397175439?i=1397175618&uo=4",
    "trackId": 1397175618
  },
  "badbadnotgood|speaking gently": {
    "album": "IV",
    "coverUrl": "/demo-covers/catalog-1608122086.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/speaking-gently/1608122086?i=1608122094&uo=4",
    "trackId": 1608122094
  },
  "yussef dayes|black classical music": {
    "album": "Black Classical Music",
    "coverUrl": "/demo-covers/catalog-1683439010.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/black-classical-music-feat-venna-charlie-stacey/1683439010?i=1683439012&uo=4",
    "trackId": 1683439012
  },
  "yussef dayes|tioga pass": {
    "album": "Black Classical Music",
    "coverUrl": "/demo-covers/catalog-1683439010.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/tioga-pass-feat-rocco-palladino/1683439010?i=1683439103&uo=4",
    "trackId": 1683439103
  },
  "robert glasper|afro blue": {
    "album": "Black Radio",
    "coverUrl": "/demo-covers/catalog-716753527.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/afro-blue-feat-erykah-badu/716753527?i=716753607&uo=4",
    "trackId": 716753607
  },
  "robert glasper|ah yeah": {
    "album": "Ah Yeah (feat. Musiq Soulchild & Chrisette Michele) - Single",
    "coverUrl": "/demo-covers/catalog-715554859.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/ah-yeah-feat-musiq-soulchild-chrisette-michele/715554859?i=715555325&uo=4",
    "trackId": 715555325
  },
  "d'angelo|brown sugar": {
    "album": "Brown Sugar",
    "coverUrl": "/demo-covers/catalog-1444063061.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/brown-sugar/1444063061?i=1444063071&uo=4",
    "trackId": 1444063071
  },
  "d'angelo|really love": {
    "album": "Black Messiah",
    "coverUrl": "/demo-covers/catalog-950764300.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/really-love/950764300?i=950764325&uo=4",
    "trackId": 950764325
  },
  "d'angelo|lady": {
    "album": "Brown Sugar",
    "coverUrl": "/demo-covers/catalog-1440842296.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/lady/1440842296?i=1440842313&uo=4",
    "trackId": 1440842313
  },
  "erykah badu|on & on": {
    "album": "Baduizm",
    "coverUrl": "/demo-covers/catalog-1440837269.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/on-on/1440837269?i=1440837273&uo=4",
    "trackId": 1440837273
  },
  "erykah badu|didn't cha know": {
    "album": "Mama's Gun",
    "coverUrl": "/demo-covers/catalog-1440755899.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/didnt-cha-know/1440755899?i=1440756135&uo=4",
    "trackId": 1440756135
  },
  "erykah badu|bag lady": {
    "album": "Mama's Gun",
    "coverUrl": "/demo-covers/catalog-1440755899.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/bag-lady/1440755899?i=1440756610&uo=4",
    "trackId": 1440756610
  },
  "jordan rakei|sorceress": {
    "album": "Wallflower",
    "coverUrl": "/demo-covers/catalog-1257093380.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/sorceress/1257093380?i=1257093390&uo=4",
    "trackId": 1257093390
  },
  "jordan rakei|talk to me": {
    "album": "Cloak",
    "coverUrl": "/demo-covers/catalog-1540037358.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/talk-to-me/1540037358?i=1540037677&uo=4",
    "trackId": 1540037677
  },
  "jordan rakei|wind parade": {
    "album": "Blue Note Re:imagined",
    "coverUrl": "/demo-covers/catalog-1517262368.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/wind-parade/1517262368?i=1517262511&uo=4",
    "trackId": 1517262511
  },
  "lianne la havas|green & gold": {
    "album": "Blood",
    "coverUrl": "/demo-covers/catalog-986317401.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/green-gold/986317401?i=986317407&uo=4",
    "trackId": 986317407
  },
  "lianne la havas|weird fishes": {
    "album": "Lianne La Havas",
    "coverUrl": "/demo-covers/catalog-1545263511.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/weird-fishes/1545263511?i=1545263519&uo=4",
    "trackId": 1545263519
  },
  "lianne la havas|bittersweet": {
    "album": "Lianne La Havas",
    "coverUrl": "/demo-covers/catalog-1545263511.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/bittersweet/1545263511?i=1545263512&uo=4",
    "trackId": 1545263512
  },
  "cleo sol|when i'm in your arms": {
    "album": "Rose in the Dark",
    "coverUrl": "/demo-covers/catalog-1504276245.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/when-im-in-your-arms/1504276245?i=1504276747&uo=4",
    "trackId": 1504276747
  },
  "cleo sol|why don't you": {
    "album": "Rose in the Dark",
    "coverUrl": "/demo-covers/catalog-1504276245.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/why-dont-you/1504276245?i=1504276253&uo=4",
    "trackId": 1504276253
  },
  "cleo sol|rose in the dark": {
    "album": "Rose in the Dark",
    "coverUrl": "/demo-covers/catalog-1504276245.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/rose-in-the-dark/1504276245?i=1504276551&uo=4",
    "trackId": 1504276551
  },
  "olivia dean|the hardest part": {
    "album": "Messy",
    "coverUrl": "/demo-covers/catalog-1676252821.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/the-hardest-part/1676252821?i=1676253108&uo=4",
    "trackId": 1676253108
  },
  "olivia dean|dive": {
    "album": "Messy",
    "coverUrl": "/demo-covers/catalog-1676252821.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/dive/1676252821?i=1676252825&uo=4",
    "trackId": 1676252825
  },
  "olivia dean|slowly": {
    "album": "Growth - EP",
    "coverUrl": "/demo-covers/catalog-1576791264.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/slowly/1576791264?i=1576791266&uo=4",
    "trackId": 1576791266
  },
  "bill evans|peace piece": {
    "album": "Everybody Digs Bill Evans (Keepnews Collection)",
    "coverUrl": "/demo-covers/catalog-1440926168.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/peace-piece/1440926168?i=1440926603&uo=4",
    "trackId": 1440926603
  },
  "bill evans|waltz for debby": {
    "album": "The Best of Bill Evans (Remastered)",
    "coverUrl": "/demo-covers/catalog-1440791686.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/waltz-for-debby/1440791686?i=1440791692&uo=4",
    "trackId": 1440791692
  },
  "chet baker|i fall in love too easily": {
    "album": "Chet Baker Sings",
    "coverUrl": "/demo-covers/catalog-1440864756.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/i-fall-in-love-too-easily/1440864756?i=1440866092&uo=4",
    "trackId": 1440866092
  },
  "chet baker|my funny valentine": {
    "album": "Chet Baker Sings",
    "coverUrl": "/demo-covers/catalog-1440864756.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/my-funny-valentine/1440864756?i=1440865800&uo=4",
    "trackId": 1440865800
  },
  "nina simone|feeling good": {
    "album": "I Put a Spell On You",
    "coverUrl": "/demo-covers/catalog-1445667726.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/feeling-good/1445667726?i=1445668114&uo=4",
    "trackId": 1445668114
  },
  "nina simone|i put a spell on you": {
    "album": "I Put a Spell On You",
    "coverUrl": "/demo-covers/catalog-1445667726.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/i-put-a-spell-on-you/1445667726?i=1445667962&uo=4",
    "trackId": 1445667962
  },
  "miles davis|so what": {
    "album": "Kind of Blue",
    "coverUrl": "/demo-covers/catalog-268443092.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/so-what/268443092?i=268443097&uo=4",
    "trackId": 268443097
  },
  "miles davis|blue in green": {
    "album": "Kind of Blue",
    "coverUrl": "/demo-covers/catalog-268443092.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/blue-in-green/268443092?i=268443131&uo=4",
    "trackId": 268443131
  },
  "john coltrane|naima": {
    "album": "A Giant Step In Jazz",
    "coverUrl": "/demo-covers/catalog-266601952.jpg",
    "appleMusicUrl": "https://music.apple.com/us/album/naima/266601952?i=266606330&uo=4",
    "trackId": 266606330
  }
};

export function getDemoCatalogTrack(artists, title) {
  const key = `${String(artists || '').trim().toLowerCase()}|${String(title || '').trim().toLowerCase()}`;
  return CATALOG[key] || null;
}
