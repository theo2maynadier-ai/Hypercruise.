# Requires pyproj. Source URLs and attribution are preserved in the generated asset.
from pathlib import Path
import csv,json,re,unicodedata,hashlib
from pyproj import Transformer
base=Path(__file__).resolve().parent
import urllib.request
urls={'Tarifs_ASF.txt':'https://public-content.vinci-autoroutes.com/PDF/Tarifs-peage-asf/Tarifs_ASF.txt','gares.csv':'https://www.data.gouv.fr/api/1/datasets/r/1fe9691f-dfd6-4ffb-89f2-5fbf42d47530'}
for name,url in urls.items():
 if not (base/name).exists():(base/name).write_bytes(urllib.request.urlopen(url,timeout=30).read())
t=Transformer.from_crs(2154,4326,always_xy=True)
raw=list(csv.DictReader((base/'Tarifs_ASF.txt').open(encoding='utf-8-sig'),delimiter=';'))
def norm(s):
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().upper().replace('SAINT','ST').replace('SAINTE','STE')
 return re.sub(r'[^A-Z0-9]','',s)
names={}
for r in raw:
 for side in ['entree','sortie']:
  names.setdefault(norm(r['nom_'+side]),[]).append((r['autoroute_'+side],r['nom_'+side]))

from datetime import date
aliases={'CARCASSONNEEST':'CARCASSONNE-E','CARCASSONNEOUEST':'CARCASSONNE-O','VILLEFRANCHEDELAURAGUAIS':'VILLEFRANCHE','MONTAUBANSUD':'MONTAUBAN','TOULOUSESUDEST':'TOULOUSE-SUD/EST','TOULOUSENORDOUEST':'TOULOUSE-NORD/OUEST','LESTELLESTMARTORYE':'LESTELLE ST MARTORY','LESTELLESTMARTORYS':'LESTELLE ST MARTORY','GUICHEENTREE':'GUICHE','GUICHESORTIE':'GUICHE'}
# Only these closed systems have been enabled. Unsupported stations remain detectors.
closed={'A64','A61','A62','A20','A66'}
prices={}
for r in raw:
 if r['classe1']=='#N/A':continue
 a=r['autoroute_entree']+'|'+r['nom_entree'];b=r['autoroute_sortie']+'|'+r['nom_sortie'];v=round(float(r['classe1'].replace(',','.'))*100)
 k='~'.join(sorted([a,b]))
 if k in prices and prices[k]!=v:raise ValueError('Conflicting tariff '+k)
 prices[k]=v
stations=[]
for r in csv.DictReader((base/'gares.csv').open(),delimiter=';'):
 lon,lat=t.transform(float(r['x'].replace(',','.')),float(r['y'].replace(',','.')))
 if not(-5<=lon<5 and 40<=lat<45):continue
 label=r['nomGare'];baseName=re.split(r' vers | depuis ',label,flags=re.I)[0];n=norm(baseName)
 if n in aliases:n=norm(aliases[n])
 found=set(names.get(n,[])); found={v for v in found if v[0] in closed or v[0]=='A68'}
 name=label;key=None;kind='unsupported';cents=None
 if len(found)==1:
  net,name=next(iter(found));key=net+'|'+name;kind='closed' if net in closed else 'unsupported'
  if net=='A64' and name=='MURET':kind='open';cents=prices['~'.join(sorted(['A64|MURET','A64|TOULOUSE OUEST']))]
  if net=='A68':
   other={'TOULOUSE EST':'A68/A680',"L'UNION":'ROCADE EST'}.get(name)
   if other:kind='open';cents=prices['~'.join(sorted([key,net+'|'+other]))]
 if not key:key='unknown|'+norm(label)
 stations.append({'key':key,'label':label,'lat':round(lat,7),'lon':round(lon,7),'kind':kind,'barrier':r['typeGare']=='Bpv',**({'cents':cents} if cents is not None else {})})
used={s['key'] for s in stations if s['kind']=='closed'}
pr={k:v for k,v in prices.items() if all(x in used for x in k.split('~'))}
asset={'version':'2026-10-19-asf-c1','checkedAt':'2026-10-19','validFrom':'2026-06-01','validUntil':'2027-02-01','vehicleClass':1,'priceSource':'https://public-content.vinci-autoroutes.com/PDF/Tarifs-peage-asf/Tarifs_ASF.txt','locationSource':'https://www.data.gouv.fr/datasets/gares-de-peage-du-reseau-routier-national-concede','locationDate':'2025-01-01','priceSha256':hashlib.sha256((base/'Tarifs_ASF.txt').read_bytes()).hexdigest(),'stations':stations,'pricesCents':pr}
(Path(__file__).resolve().parents[2]/'app/assets/toll-data.js').write_text('(function(r){r.HCTollData='+json.dumps(asset,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined")module.exports=r.HCTollData;})(typeof window!=="undefined"?window:globalThis);\n')
print('Asset',len(stations),'detectors',sum(s['kind']!='unsupported' for s in stations),'supported',len(pr),'prices')
