from fastapi.testclient import TestClient
from backend.app import app
client=TestClient(app)
def test_health(): assert client.get('/health').json()['status']=='ok'
def test_solar_is_deterministic_and_traceable():
    r=client.post('/api/energy/solar',json={'annual_consumption_kwh':4800,'pv_kw':8,'peak_sun_hours':3.5,'battery_kwh':10})
    assert r.status_code==200
    d=r.json(); assert d['outputs']['annual_generation_kwh']==8789.2
    assert d['record']['solver_version']=='axiomforge-0.1.0'
def test_beam_screen():
    r=client.post('/api/structure/beam',json={'span_m':5,'load_kn_m':10,'elastic_modulus_gpa':200,'second_moment_cm4':8333})
    assert r.status_code==200 and r.json()['outputs']['maximum_deflection_mm']>0
def test_assistant_routes_without_fabricating_numbers():
    d=client.post('/api/assistant/route',json={'message':'compare a battery for solar'}).json()
    assert d['tool']=='solar_screen' and 'language model' in d['grounding']
