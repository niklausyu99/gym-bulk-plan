"""Cut the generated food sheets at transparent gutters and export alpha WebP.
No drawing, palette substitution, background removal, or new dependencies.
Run with a developer-only generation manifest as the first argument.
"""
import json, struct, subprocess, sys
from pathlib import Path

manifest = Path(sys.argv[1] if len(sys.argv)>1 else 'work/food-icons/generation.json')
root = Path(__file__).resolve().parent.parent
output = root/'assets/food-icons'
output.mkdir(exist_ok=True)
records = json.loads(manifest.read_text())
selected = {}
report = []

def run(args):
    return subprocess.check_output(args, stderr=subprocess.PIPE)

def split_at_gutter(counts, nominal, radius):
    lo,hi=max(1,int(nominal-radius)),min(len(counts)-2,int(nominal+radius))
    choices=list(range(lo,hi+1))
    best=min(choices,key=lambda i:(sum(counts[i-1:i+2]),abs(i-nominal)))
    if sum(counts[best-1:best+2]):
        raise RuntimeError(f'No transparent gutter near {nominal}; inspect sheet before cutting')
    return best

for sheet in records:
    src=root/f"work/food-icons/sheet-{sheet['sheet']:02}.png"
    w,h=struct.unpack('>II',src.read_bytes()[16:24])
    rgba=run(['ffmpeg','-v','error','-i',str(src),'-f','rawvideo','-pix_fmt','rgba','pipe:1'])
    alpha=rgba[3::4]
    rows,cols=sheet['rows'],sheet['columns']
    hist=[sum(a>16 for a in alpha[y*w:(y+1)*w]) for y in range(h)]
    ys=[0]+[split_at_gutter(hist,h*i/rows,h/rows*.3) for i in range(1,rows)]+[h]
    for row in range(rows):
        top,bottom=ys[row:row+2]
        if sheet['sheet']==3 and row==1:continue
        print('Preparing sheet',sheet['sheet'],'row',row+1,flush=True)
        counts=[sum(alpha[y*w+x]>16 for y in range(top,bottom)) for x in range(w)]
        xs=[0]+[split_at_gutter(counts,w*i/cols,w/cols*.3) for i in range(1,cols)]+[w]
        for col in range(cols):
            index=row*cols+col
            if index>=len(sheet['subjects']):continue
            id,description=sheet['subjects'][index]
            # The first bean bun contained whole beans; its smooth-paste replacement is sheet6.
            if id=='red-bean-bun' and sheet['sheet']==4:continue
            left,right=xs[col:col+2]
            points=[(x,y) for y in range(top,bottom) for x in range(left,right) if alpha[y*w+x]>32]
            if not points:raise RuntimeError(f'Empty icon: {id}')
            x0=max(left,min(x for x,y in points)-3);x1=min(right,max(x for x,y in points)+4)
            y0=max(top,min(y for x,y in points)-3);y1=min(bottom,max(y for x,y in points)+4)
            bw,bh=x1-x0,y1-y0
            if min(bw,bh)<80:raise RuntimeError(f'Unexpectedly small crop {id}')
            png=root/f'work/food-icons/{id}.png';dest=output/(id+'.webp')
            vf=f'crop={bw}:{bh}:{x0}:{y0},scale=216:216:force_original_aspect_ratio=decrease:flags=lanczos,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba'
            run(['ffmpeg','-v','error','-i',str(src),'-vf',vf,'-frames:v','1','-y',str(png)])
            candidate=dest.with_suffix('.candidate.webp')
            run(['cwebp','-quiet','-q','90','-m','6','-alpha_q','100','-exact',str(png),'-o',str(candidate)])
            if dest.exists():
                if dest.read_bytes()!=candidate.read_bytes():raise RuntimeError(f'Refusing to overwrite a different existing asset: {dest}')
                candidate.unlink()
            else:candidate.rename(dest)
            decoded=run(['ffmpeg','-v','error','-i',str(dest),'-f','rawvideo','-pix_fmt','rgba','pipe:1'])
            a=decoded[3::4]
            if len(a)!=256*256 or not 0.2<a.count(0)/len(a)<0.95:raise RuntimeError(f'Unexpected alpha: {id}')
            if any(a[y*256+x]>8 for y in range(256) for x in range(256) if x<12 or x>=244 or y<12 or y>=244):raise RuntimeError(f'Icon too near edge: {id}')
            selected[id]={'src':'assets/food-icons/'+id+'.webp','width':256,'height':256}
            report.append({'id':id,'sheet':sheet['sheet'],'row':row+1,'column':col+1,'crop':[x0,y0,bw,bh],'bytes':dest.stat().st_size,'transparentPixels':a.count(0),'sourceDescription':description})
(root/'work/food-icons/assets.json').write_text(json.dumps(selected,indent=2)+'\n')
(root/'work/food-icons/crop-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'icons':len(selected),'bytes':sum(r['bytes'] for r in report),'largest':max(r['bytes'] for r in report)}))
