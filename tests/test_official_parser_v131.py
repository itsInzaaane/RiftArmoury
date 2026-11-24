"""Offline parser regression for independent Riot Standard and 2v2 lists.
Fixture names and dates reflect the Rules Hub as verified 2026-11-24.
This is not a substitute for running the live GitHub Action after deployment.
"""
import importlib.util
from pathlib import Path
base=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('refresh_official', base/'scripts'/'refresh_official.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
std_cards=['Called Shot','Ekko, Recurrent','Draven, Vanquisher','Fight or Flight','Scrapheap','Stealthy Pursuer','Stacked Deck','Riven, Broken Blade','Zhonya’s Hourglass','Stellacorn Herder','Nocturne, Horrifying','Rhasa the Sunderer','Brynhir Thundersong','Dazzling Aurora','Baited Hook']
duo_cards=[x for x in std_cards if x!='Fight or Flight']
battlefields=['The Arena’s Greatest','Aspirant’s Climb','Dreaming Tree','Obelisk of Power','Reaver’s Row','Star Spring','Emperor’s Dais']
items=lambda rows: '<ul>'+''.join('<li>'+row+'</li>' for row in rows)+'</ul>'
html='<h3>Constructed Format Legality</h3><p>Last updated: November 23, 2026</p><h4>Cards</h4>'+items(std_cards)+'<h4>Battlefields</h4>'+items(battlefields)
html+='<h3>2v2 Constructed Legality</h3><p>Last updated: November 23, 2026</p><h4>Legends</h4>'+items(['Master Yi, Wuju Bladesman'])+'<h4>Cards</h4>'+items(duo_cards)+'<h4>Battlefields</h4>'+items(battlefields)
for label in ('Core Rules','Tournament Rules'):
 html+=f'<h3>{label}</h3><p><a href="https://cmsassets.rgpub.io/docs/{label.lower().replace(" ", "-")}.pdf">{label}</a> (last updated: October 9, 2026)</p>'
out=mod.parse(html)
assert len(out['bans']['standard'])==22,out
assert len(out['bans']['duo'])==22,out
assert out['bans']['effectiveAt']=='2026-11-23'
assert 'Fight or Flight' in {x['name'] for x in out['bans']['standard']}
assert 'Fight or Flight' not in {x['name'] for x in out['bans']['duo']}
assert 'Master Yi, Wuju Bladesman' in {x['name'] for x in out['bans']['duo']}
print('Riot-format parser regression tests PASSED (22 Standard / 22 2v2)')
