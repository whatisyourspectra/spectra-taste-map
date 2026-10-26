from PIL import Image,ImageDraw,ImageFont,ImageFilter
from pathlib import Path
import math,colorsys,random,json
ROOT=Path.cwd(); OUT=ROOT/'output/images'; N=4096; S=N/1080
base=Image.new('RGB',(512,512))
pixels=[]
for y in range(512):
 for x in range(512):
  d=((x-285)**2+(y-230)**2)**.5/410
  a=max(0,1-d)**2
  p=max(0,1-((x-175)**2+(y-400)**2)**.5/300)**2
  pixels.append((int(6+7*a+4*p),int(9+6*a),int(17+20*a+6*p)))
base.putdata(pixels); im=base.resize((N,N),Image.Resampling.BICUBIC)
wire=Image.new('RGBA',(N,N));d=ImageDraw.Draw(wire)
t=13.5;clock=t*.62;rotation=1.175;tilt=.93

def proj(x,y,z):
 rx=x*math.cos(rotation)-z*math.sin(rotation);rz=x*math.sin(rotation)+z*math.cos(rotation)
 ry=y*math.cos(tilt)-rz*math.sin(tilt);depth=y*math.sin(tilt)+rz*math.cos(tilt)
 p=5/(5+depth)
 return ((540+rx*325*p)*S,(480+ry*325*p)*S)
for strand in range(88):
 v=strand/88*math.tau;points=[]
 for step in range(441):
  u=step/440*math.tau;pulse=.11*math.sin(u*3+clock);r=1.25+(.43+pulse)*math.cos(u*3+v)
  points.append(proj(r*math.cos(u*2),r*math.sin(u*2),.62*math.sin(u*3+v)))
 rgb=colorsys.hls_to_rgb((195+strand/88*130)/360,(68+12*math.sin(v+clock*.4))/100,.88)
 alpha=int(255*(.32+.32*math.sin(v)**2)*.30)
 d.line(points,fill=(*[int(k*255) for k in rgb],alpha),width=4 if strand%8==0 else 2,joint='curve')
im=im.convert('RGBA');im=Image.alpha_composite(im,wire.filter(ImageFilter.GaussianBlur(12)));im=Image.alpha_composite(im,wire)
# Preserve the film's subtle floating points and restrained light.
random.seed(19);dust=Image.new('RGBA',(N,N));dd=ImageDraw.Draw(dust)
for _ in range(800):
 u=random.random()*math.tau+clock*.18;v=random.random()*math.tau;r=1.25+.43*math.cos(u*3+v)
 x,y=proj(r*math.cos(u*2),r*math.sin(u*2),.62*math.sin(u*3+v));rad=random.uniform(.3,1.1)*S
 dd.ellipse((x-rad,y-rad,x+rad,y+rad),fill=(191,183,239,random.randint(12,45)))
im=Image.alpha_composite(im,dust).convert('RGB')
im.save(OUT/'spectra-hero-square-background-4096.png',dpi=(300,300))
logo=Image.open(ROOT/'public/spectra-wordmark.png').convert('RGBA');width=round(904*S);height=round(width*logo.height/logo.width)
logo=logo.resize((width,height),Image.Resampling.LANCZOS);im.paste(logo,((N-width)//2,round(496*S-height/2)),logo)
d=ImageDraw.Draw(im)
f=ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc',round(28*S),index=4)
d.text((N/2,637*S),'음악으로 발견하는 나의 스펙트라',font=f,anchor='ms',fill='#DCE4F5')
f=ImageFont.truetype(str(ROOT/'output/video/intro15/assets/Syne-SemiBold.ttf'),round(19*S))
value='spectra-music.org';spacing=2.5*S;length=sum(d.textlength(c,font=f) for c in value)+spacing*(len(value)-1);x=(N-length)/2
for c in value:
 d.text((x,728*S),c,font=f,anchor='ls',fill='#91A6C5');x+=d.textlength(c,font=f)+spacing
for i in range(round(100*S)):
 a=i/(100*S);col=tuple(round(v*(1-a)+w*a) for v,w in zip((237,112,188),(112,214,255)))
 d.line((round(490*S)+i,round(790*S),round(490*S)+i,round(790*S+1.5*S)),fill=col)
im.save(OUT/'spectra-hero-square-4096.png',dpi=(300,300))
im.save(OUT/'spectra-hero-square-4096.jpg',quality=97,subsampling=0,dpi=(300,300))
im.resize((1080,1080),Image.Resampling.LANCZOS).save(OUT/'spectra-hero-square-preview.jpg',quality=95)
(OUT/'spectra-hero-square-notes.json').write_text(json.dumps({'dimensions':[N,N],'source':'intro15/film.js sculpture equations, original wordmark and Syne font','native_render':True},indent=2))
print(im.size,flush=True)
