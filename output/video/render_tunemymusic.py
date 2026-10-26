from PIL import Image, ImageDraw, ImageFont, ImageOps
import pathlib, subprocess, math, imageio_ffmpeg, json

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'output/video'
W,H,FPS,DURATION=1280,720,30,40
ACCENT=(158,166,255)
fonts={s:ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc',s,index=6) for s in [15,17,19,21,24,32,38,64]}
logo=Image.open(ROOT/'public/spectra-wordmark.png').convert('RGBA').resize((194,18),Image.Resampling.LANCZOS)
# Each crop and target refers to the unmodified, captured TuneMyMusic screen.
scenes=[
 ('서비스 선택','음악 서비스를\n선택하세요.','tunemymusic.com/ko/transfer\nSpotify · Apple Music 등',
  'tunemymusic-source.png',(280,140,1160,735),[(308,312,465,470)],'TuneMyMusic 실제 화면'),
 ('로그인 · 연결','내 계정으로\n로그인하세요.','음악 서비스의 안내에 따라\n로그인하고 접근을 허용하세요.',
  'tunemymusic-login.png',(0,0,400,600),[(22,250,378,305)],'Spotify 실제 로그인 화면'),
 ('플레이리스트 선택','내보낼 목록을\n선택하세요.','원하는 플레이리스트 체크 후\n‘대상 선택’을 클릭하세요.',
  'tunemymusic-playlist.png',(295,195,1145,835),[(322,384,357,422),(515,743,925,818)],'선택 화면 · 예시 곡 목록'),
 ('목적지 선택','목적지는\n‘파일 내보내기’.','서비스 목록 아래쪽의\n파일 내보내기를 선택하세요.',
  'tunemymusic-destination.png',(445,665,990,1000),[(640,850,800,1000)],'파일 목적지 · 예시 곡 목록'),
 ('CSV 선택','CSV를 선택하고\n‘내보내다’ 클릭.','TXT 대신 CSV를 선택하면\n곡 목록을 표 형태로 저장합니다.',
  'tunemymusic-csv-selected.png',(415,280,1025,720),[(466,511,974,567),(466,587,974,637)],'파일 형식 · 실제 화면'),
 ('내보내기 실행','목록 확인 후\n‘전송 시작’.','선택한 플레이리스트를 확인하고\n내보내기를 실행하세요.',
  'tunemymusic-complete.png',(295,345,1145,900),[(514,805,925,881)],'내보내기 확인 · 예시 곡 목록'),
 ('파일 저장','완료되면\nCSV 다운로드.','자동 저장되지 않았다면\n‘다운로드’를 누르세요.',
  'tunemymusic-download.png',(295,95,1145,710),[(640,331,800,391)],'완료 화면 · 예시 곡 목록'),
 ('스펙트라로 가져오기','저장한 CSV를\n스펙트라로.','가져오기 영역에 끌어 놓거나\n파일 업로드로 선택하세요.',None,None,[],'스펙트라 가져오기 방법 도식'),
]
def txt(d,xy,value,size,color=(242,245,255)):
 d.text(xy,value,font=fonts[size],fill=color,spacing=12)
def smooth(v):
 v=max(0,min(1,v));return v*v*(3-2*v)
prepared=[]
for _,_,_,name,crop,targets,_ in scenes:
 if not name:prepared.append(None);continue
 img=Image.open(OUT/name).convert('RGB').crop(crop)
 scale=min(756/img.width,484/img.height)
 img=img.resize((round(img.width*scale),round(img.height*scale)),Image.Resampling.LANCZOS)
 x=470+(756-img.width)//2;y=152+(484-img.height)//2
 boxes=[(x+(a-crop[0])*scale,y+(b-crop[1])*scale,x+(c-crop[0])*scale,y+(e-crop[1])*scale) for a,b,c,e in targets]
 prepared.append((img,x,y,boxes))
def frame(t):
 idx=min(7,int(t/5));local=t-idx*5
 step,title,body,_,_,_,label=scenes[idx]
 im=Image.new('RGB',(W,H),(7,11,24));d=ImageDraw.Draw(im)
 d.rounded_rectangle((445,110,1250,651),radius=23,fill=(18,24,43),outline=(43,53,77),width=1)
 im.paste(logo,(52,35),logo)
 txt(d,(950,35),'HOW TO / PLAYLIST EXPORT',15,(150,168,202))
 txt(d,(52,93),'TuneMyMusic → CSV → SPECTRA',24)
 txt(d,(52,189),f'{idx+1:02d}',64,ACCENT)
 txt(d,(55,275),step,19,ACCENT)
 txt(d,(51,320),title,38)
 txt(d,(54,445),body,21,(170,183,207))
 txt(d,(470,124),label,17,(159,177,207))
 if prepared[idx]:
  screen,x,y,boxes=prepared[idx];im.paste(screen,(x,y));d=ImageDraw.Draw(im)
  for j,box in enumerate(boxes):
   a,b,c,e=box
   strength=1 if len(boxes)==1 or (local<2.5 and j==0) or(local>=2.5 and j==1) else .45
   col=tuple(int(v*strength) for v in (117,225,255))
   d.rounded_rectangle((a-4,b-4,c+4,e+4),radius=9,outline=col,width=3)
  target=boxes[0 if len(boxes)==1 or local<2.5 else 1]
  tx,ty=(target[0]+target[2])/2,(target[1]+target[3])/2
  move=smooth(local/.9);cx=tx+105*(1-move);cy=ty+100*(1-move)
  r=12+13*((local*1.1)%1)
  d.ellipse((tx-r,ty-r,tx+r,ty+r),outline=(129,217,255),width=2)
  d.polygon([(cx,cy),(cx+4,cy+27),(cx+11,cy+19),(cx+20,cy+18)],fill=(248,252,255),outline=(8,15,29))
  if idx==1:
   txt(d,(1030,277),'로그인 후',19,ACCENT)
   txt(d,(1030,311),'접근 허용',19,(218,227,244))
 elif idx==7:
  d.rounded_rectangle((505,210,707,415),radius=19,fill=(27,38,60),outline=ACCENT,width=2)
  txt(d,(550,255),'CSV',64,ACCENT)
  txt(d,(530,357),'음악 목록 파일',19)
  dx=math.sin(local*2)*7
  d.line((733,310,800+dx,310),fill=ACCENT,width=4)
  d.polygon([(800+dx,310),(783+dx,299),(783+dx,321)],fill=ACCENT)
  d.rounded_rectangle((828,213,1210,475),radius=20,fill=(13,23,42),outline=(127,199,227),width=2)
  txt(d,(854,240),'SPECTRA',32,ACCENT)
  txt(d,(863,315),'CSV 파일을 끌어 놓으세요',24)
  txt(d,(884,360),'또는 파일 업로드로 선택',19,(164,184,212))
  txt(d,(554,510),'곡 제목 · 아티스트 등 음악 목록 데이터를 가져옵니다.',19,(166,185,214))
  txt(d,(554,548),'이제, 나만의 취향 지도를 펼쳐보세요.',24)
 for i in range(8):
  x=54+i*150
  d.rounded_rectangle((x,679,x+132,684),radius=2,fill=(42,51,74))
  if i<idx: d.rounded_rectangle((x,679,x+132,684),radius=2,fill=ACCENT)
  elif i==idx:d.rounded_rectangle((x,679,x+max(1,132*local/5),684),radius=2,fill=ACCENT)
 txt(d,(54,610),'음원 파일 대신 곡 목록을 내보냅니다.',17,(141,158,186))
 txt(d,(54,638),f'{idx+1} / 8  ·  한국어 안내',17,(141,158,186))
 fade=smooth(t/.4)*(1-smooth((t-39.6)/.4))
 return Image.blend(Image.new('RGB',(W,H)),im,fade)

ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
mp4=OUT/'tunemymusic-to-spectra-tutorial.mp4'
cmd=[ffmpeg,'-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0',
 '-stream_loop','-1','-i',str(ROOT/'output/audio/spectra-ambient-bgm-preview.wav'),'-t',str(DURATION),
 '-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
 '-af','volume=0.3,afade=t=in:d=1,afade=t=out:st=37:d=3','-c:a','aac','-b:a','160k','-movflags','+faststart',str(mp4)]
with open(OUT/'tutorial-render.log','w') as log:
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
 for n in range(FPS*DURATION):
  proc.stdin.write(frame(n/FPS).tobytes())
  if n%300==0:print(f'Rendered {n/FPS:.0f}/{DURATION} seconds',flush=True)
 proc.stdin.close()
 if proc.wait():raise RuntimeError('MP4 encoding failed')
sheet=Image.new('RGB',(1280,1440))
for i in range(8):sheet.paste(frame(i*5+2).resize((640,360)),((i%2)*640,(i//2)*360))
sheet.save(OUT/'tunemymusic-storyboard.jpg',quality=93)
frame(22).save(OUT/'tunemymusic-tutorial-preview.jpg',quality=95)
print('Creating GIF',flush=True)
gif=OUT/'tunemymusic-to-spectra-tutorial.gif'
subprocess.run([ffmpeg,'-y','-i',str(mp4),'-filter_complex',
 '[0:v]fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
 '-loop','0',str(gif)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
(OUT/'tutorial-notes.json').write_text(json.dumps({'duration_seconds':DURATION,'verified_date':'2026-10-14',
 'source':'https://www.tunemymusic.com/ko/transfer','official_guide':'https://www.tunemymusic.com/transfer/spotify-to-file',
 'screens':'Actual public UI captures; playlist/export screens use free-text example tracks; final import diagram is illustrative.',
 'steps':[s[:3] for s in scenes]},ensure_ascii=False,indent=2))
print(mp4,flush=True);print(gif,flush=True)
