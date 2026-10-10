def lum(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    l1,l2=sorted([lum(a),lum(b)],reverse=True)
    return round((l1+0.05)/(l2+0.05),2)

light={'ground':'#F5F4F0','sunk':'#EBE9E3','ink':'#12161A','ink-soft':'#4A5158',
       'contour':'#A67A46','accent':'#8C2A66','hydro':'#1B5E7E','verify':'#3F6B45','warn':'#9A4A12'}
dark={'ground':'#0D1114','sunk':'#161C20','ink':'#E8E9E4','ink-soft':'#9BA4AA',
      'contour':'#8A6538','accent':'#EE8FC4','hydro':'#7BC0DE','verify':'#89BE93','warn':'#E0A05C'}
for name,p in (('LIGHT',light),('DARK',dark)):
    print('==',name,'on ground',p['ground'],'/ sunk',p['sunk'])
    for k,v in p.items():
        if k in ('ground','sunk'): continue
        print(f"  {k:9} {v}  vs ground {cr(v,p['ground']):>5}  vs sunk {cr(v,p['sunk']):>5}")
    print(f"  accent-on-ink-button: white on accent {cr('#FFFFFF',p['accent'])}, ground on accent {cr(p['ground'],p['accent'])}")
