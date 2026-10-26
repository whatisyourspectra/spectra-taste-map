from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg, math, random, subprocess, pathlib, json

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/video'
W, H, FPS = 1280, 720, 30
font_path = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
fonts = {s: ImageFont.truetype(font_path, s, index=6) for s in [15, 18, 21, 24, 28, 38, 52, 60]}
logo = Image.open(ROOT / 'public/spectra-wordmark.png').convert('RGBA')
random.seed(22)
stars = [(random.randrange(W), random.randrange(H), random.uniform(.3, 1.6), random.random()*6) for _ in range(150)]
colors = [(107, 211, 255), (181, 132, 255), (236, 113, 200)]
points = []
for group in range(3):
    for i in range(19):
        angle = random.random()*math.tau
        radius = random.uniform(25, 138)
        cx, cy = [(875,245),(1010,427),(780,472)][group]
        points.append((cx+math.cos(angle)*radius,cy+math.sin(angle)*radius,group,random.uniform(3,7)))
base = Image.new('RGB',(W,H),(5,8,18))
glow = Image.new('RGB',(W,H)); gd = ImageDraw.Draw(glow)
gd.ellipse((690,90,1160,650),fill=(13,23,48))
gd.ellipse((760,300,1230,740),fill=(26,13,41))
base = Image.blend(base,glow.filter(ImageFilter.GaussianBlur(100)),.7)
scenes = [
    (0,4,'YOUR MUSIC TASTE MAP','좋아하는 음악에는,\n당신이 담겨 있어요.','음악으로 만나는 새로운 나'),
    (4,9,'01  /  IMPORT','좋아하는 음악을\n한곳에 모으세요.','음악 목록을 가져오면, 취향 탐험이 시작됩니다.'),
    (9,15,'02  /  UNDERSTAND','플레이리스트가\n나만의 지도로.','닮은 곡들이 모여 취향의 영역을 만듭니다.'),
    (15,21,'03  /  EXPLORE','곡과 곡 사이,\n취향의 연결을 따라.','장르와 연결을 살펴보며 나의 음악을 이해하세요.'),
    (21,26,'04  /  DISCOVER','좋아하는 한 곡에서\n새로운 발견으로.','내 취향을 출발점으로 새로운 음악을 탐색하세요.'),
    (26,30,'SPECTRA','당신의 음악,\n당신만의 우주.','지금, 나만의 취향 지도를 펼쳐보세요.'),
]
def smooth(x):
    x=max(0,min(1,x)); return x*x*(3-2*x)
def text(d, xy, value, size, color=(241,245,249)):
    d.text(xy,value,font=fonts[size],fill=color,spacing=10)
def frame(t):
    idx = next(i for i,s in enumerate(scenes) if s[0] <= t < s[1])
    start,end,kicker,title,subtitle=scenes[idx]; local=t-start
    im=base.copy().convert('RGBA'); d=ImageDraw.Draw(im)
    for x,y,r,phase in stars:
        bright=int(75+75*(.5+.5*math.sin(t*.65+phase)))
        d.ellipse((x-r,y-r,x+r,y+r),fill=(bright,bright,min(255,bright+35)))
    entrance=smooth(local/1.1)
    coords=[]
    for j,(x,y,g,r) in enumerate(points):
        # A loose playlist gradually gathers into three connected taste regions.
        spread = 1.32 if idx==0 else (1.32-.32*entrance if idx==1 else 1)
        px=920+(x-920)*spread+math.sin(t*.36+j)*5
        py=360+(y-360)*spread+math.cos(t*.31+j)*5
        coords.append((px,py))
    if idx >= 2:
        for j,(x,y) in enumerate(coords):
            for k in range(j+1,len(coords)):
                a,b=coords[k]; dist=math.hypot(x-a,y-b)
                if dist < 88 and points[j][2]==points[k][2]:
                    col=colors[points[j][2]]
                    d.line((x,y,a,b),fill=tuple(int(v*.34) for v in col),width=1)
        for g,(cx,cy) in enumerate([(875,245),(1010,427),(780,472)]):
            rr=155+math.sin(t*.6+g)*6
            d.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),outline=tuple(int(v*.18) for v in colors[g]),width=1)
    glow_layer=Image.new('RGBA',(W,H)); gdraw=ImageDraw.Draw(glow_layer)
    for j,(x,y) in enumerate(coords):
        color=colors[points[j][2]]; r=points[j][3]
        gdraw.ellipse((x-15,y-15,x+15,y+15),fill=(*color,55))
        d.ellipse((x-r,y-r,x+r,y+r),fill=(*color,255))
        d.ellipse((x-1,y-1,x+1,y+1),fill=(242,246,255))
    im=Image.alpha_composite(im,glow_layer.filter(ImageFilter.GaussianBlur(10)))
    d=ImageDraw.Draw(im)
    if idx>=2:
        for xy,label,c in [((836,73),'INDIE / DREAM POP',colors[0]),((1000,601),'ELECTRONIC',colors[1]),((645,587),'R&B / SOUL',colors[2])]:
            text(d,xy,label,15,c)
    if idx in (3,4):
        j=12 if idx==3 else 42; x,y=coords[j]
        ring=18+16*((local*.48)%1)
        d.ellipse((x-ring,y-ring,x+ring,y+ring),outline=colors[points[j][2]],width=2)
        d.line((x,y,x+90,y-75),fill=(130,164,201),width=1)
        text(d,(x+95,y-91),'YOUR NEXT DISCOVERY' if idx==4 else 'FOLLOW YOUR TASTE',15)
    brand=logo.resize((205,19),Image.Resampling.LANCZOS)
    im.alpha_composite(brand,(65,45))
    text(d,(1050,47),'MUSIC → UNIVERSE',15,(132,148,173))
    layer=Image.new('RGBA',(W,H)); ld=ImageDraw.Draw(layer)
    lift=int((1-smooth(local/.8))*24)
    text(ld,(66,183+lift),kicker,18,colors[idx%3])
    text(ld,(62,229+lift),title,52)
    text(ld,(66,387+lift),subtitle,21,(166,180,203))
    if idx==0:
        layer.alpha_composite(logo.resize((400,37),Image.Resampling.LANCZOS),(66,458+lift))
    elif idx==5:
        ld.rounded_rectangle((66,459+lift,350,513+lift),radius=27,fill=(166,189,252))
        text(ld,(94,473+lift),'나만의 지도 시작하기  →',21,(12,18,39))
    else:
        text(ld,(66,471+lift),'이해     /     분류     /     확장',18,(132,148,173))
    alpha=smooth(local/.6)*(1-smooth((local-(end-start-.45))/.45))
    layer.putalpha(layer.getchannel('A').point(lambda v:int(v*alpha)))
    im=Image.alpha_composite(im,layer); d=ImageDraw.Draw(im)
    d.line((66,651,1214,651),fill=(33,44,65),width=2)
    d.line((66,651,66+1148*t/30,651),fill=(161,149,248),width=2)
    text(d,(66,667),'SPECTRA  /  YOUR MUSIC TASTE MAP',15,(117,133,158))
    text(d,(1130,667),f'{idx+1:02d} / 06',15,(117,133,158))
    fade=smooth(t/.6)*(1-smooth((t-29.35)/.65))
    return Image.blend(Image.new('RGB',(W,H)),im.convert('RGB'),fade)

ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
destination=OUT/'spectra-intro-30s.mp4'
cmd=[ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0',
     '-stream_loop','-1','-i',str(ROOT/'output/audio/spectra-dream-synth-preview.wav'),
     '-t','30','-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
     '-af','volume=0.65,afade=t=in:d=1.2,afade=t=out:st=27:d=3','-c:a','aac','-b:a','192k','-movflags','+faststart',str(destination)]
with open(OUT/'render.log','w') as log:
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
    for n in range(FPS*30):
        proc.stdin.write(frame(n/FPS).tobytes())
        if n%150==0: print(f'Rendered {n/FPS:.0f}/30 seconds',flush=True)
    proc.stdin.close()
    if proc.wait()!=0: raise RuntimeError('Encoding failed; see render.log')
frame(11).save(OUT/'spectra-intro-preview.jpg',quality=94)
sheet=Image.new('RGB',(960,540))
for i,t in enumerate([2,6,11,17,23,28]):
    sheet.paste(frame(t).resize((480,180)),((i%2)*480,(i//2)*180))
sheet.save(OUT/'storyboard.jpg',quality=94)
(OUT/'production-notes.json').write_text(json.dumps({'duration_seconds':30,'resolution':'1920x1080','fps':FPS,'style':'Brand motion graphics; illustrative taste map','audio':'Existing spectra-dream-synth-preview.wav, looped with fades','scenes':scenes},ensure_ascii=False,indent=2))
print(destination,flush=True)
