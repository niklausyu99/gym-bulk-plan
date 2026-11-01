"""Extract a small, auditable SR28 subset; never infer undeclared branded fortification."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
work=root/'work/micronutrients'
clean=lambda s:s.strip('~')
desc={clean(r[0]):clean(r[2]) for r in (s.split('^') for s in (work/'FOOD_DES.txt').read_text().splitlines())}
norm=lambda s:re.sub('[^a-z0-9]','',s.lower())
reverse={norm(v):k for k,v in desc.items()}
ids={'301':'calcium','304':'magnesium','324':'vitaminD','320':'vitaminA','401':'vitaminC','323':'vitaminE','430':'vitaminK','404':'thiamin','405':'riboflavin','406':'niacin','415':'vitaminB6','435':'folateDFE','418':'vitaminB12','410':'pantothenicAcid','303':'iron','309':'zinc','317':'selenium','312':'copper','315':'manganese','319':'retinol','431':'folicAcid'}
values={}
for line in (work/'NUT_DATA.txt').read_text().splitlines():
 r=line.split('^');ndb,nutrient=clean(r[0]),clean(r[1])
 if nutrient in ids:values.setdefault(ndb,{})[ids[nutrient]]=float(r[2])
base='https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/sr11-sr28/'
def profile(ndb):
 return {'ndb':ndb,'per100g':values[ndb],'description':desc[ndb],'source':{'label':'USDA SR28 (2016)','url':base},'kind':'estimate'}
mapping={'milk':'01211','banana':'09040','oats':'08120','peanut':'16398','pineapple':'09266','blueberry':'09050','grapes':'09132','almonds':'12061','yogurt':'01116','chocolate':'19904','rice':'20445','bread':'18069','wholemeal':'18075','sweet-potato':'11510','sweet-potato|baked':'11508','corn':'11168','raisins':'09298','cheese|cheddar':'01009','chicken':'05064','condensed-milk':'01095'}
foods=json.loads((root/'content/foods.json').read_text())['foods']
for f in foods:
 for v in f['variants']:
  note=v['source'].get('note','')
  if 'USDA SR Legacy' not in note:continue
  text=note.split('\u00b7',1)[-1].split('\uff1b',1)[0].strip()
  found=reverse.get(norm(text))
  if not found and '(' in text:found=reverse.get(norm(text.split('(')[0].strip()))
  if found:mapping[f['id']+'|'+v['id']]=found
mapping['honey']='19296'
for key,c in json.loads((root/'content/foods.json').read_text()).get('cookingIngredients',{}).items():mapping[key]=c['ndb']
catalog={key:profile(ndb) for key,ndb in mapping.items()}
# Plain ice adds no quantified micronutrients. No generic replacement for whey, Milo or prepared meals.
catalog['ice']={'per100g':{},'kind':'water','description':'Plain water ice'}
# Soy drink, fortified cereals, branded dairy, packaged snacks: await exact micro labels rather than assign U.S. fortification.
references={
 'iron':{'target':8,'upper':45,'scope':'total'},'calcium':{'target':1000,'upper':2500,'scope':'total'},'magnesium':{'target':400,'upper':350,'scope':'supplements'},
 'vitaminD':{'target':15,'upper':100,'scope':'total'},'vitaminC':{'target':90,'upper':2000,'scope':'total'},
 'zinc':{'target':11,'upper':40,'scope':'total'},'selenium':{'target':55,'upper':400,'scope':'total'},
 'vitaminB6':{'target':1.3,'upper':12,'scope':'total','upperAuthority':'EFSA 2023','url':'https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2023.8006'},
 'iodine':{'target':150,'upper':1100,'scope':'total'},'vitaminA':{'target':900,'upper':3000,'scope':'retinol'},
 'vitaminE':{'target':15,'upper':1000,'scope':'synthetic'},'vitaminK':{'target':120,'upper':None},
 'thiamin':{'target':1.2,'upper':None},'riboflavin':{'target':1.3,'upper':None},'niacin':{'target':None,'upper':35,'scope':'synthetic'},
 'folateDFE':{'target':400,'upper':1000,'scope':'folicAcid'},'vitaminB12':{'target':2.4,'upper':None},
 'biotin':{'target':30,'upper':None},'pantothenicAcid':{'target':5,'upper':None},'copper':{'target':0.9,'upper':10,'scope':'total'},
 'manganese':{'target':2.3,'upper':11,'scope':'total'},'chromium':{'target':35,'upper':None},'molybdenum':{'target':45,'upper':2000,'scope':'total'}
}
meta={'version':1,'referenceGroup':'male-19-30','catalog':catalog,'references':references,'sources':[{'label':'DRI vitamins','url':'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-vitamins.html'},{'label':'DRI elements','url':'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-elements.html'},{'label':'NIH magnesium','url':'https://ods.od.nih.gov/factsheets/magnesium-HealthProfessional/'},{'label':'EFSA B6 (2023)','url':'https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2023.8006'}]}
(root/'content/micronutrients.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('SR28 profiles:',len(catalog));print('unmapped foods:',[f['id'] for f in foods if f['id'] not in catalog and not any(k.startswith(f['id']+'|') for k in catalog)])
