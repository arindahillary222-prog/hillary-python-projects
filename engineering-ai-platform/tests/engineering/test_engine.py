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

def test_frontend_serves_same_origin():
    r=client.get('/')
    assert r.status_code==200 and 'AxiomForge' in r.text

def test_empty_chat_is_rejected():
    assert client.post('/api/assistant/chat', json={'message':''}).status_code==400

def test_water_network_benchmark_is_traceable():
    r=client.post('/api/water/network',json={'reservoir_head_m':30,'demand_lps':2,'pipe_length_m':120,'pipe_diameter_mm':80,'roughness_c':130,'elevation_rise_m':8})
    assert r.status_code==200 and r.json()['outputs']['residual_head_m']>0
    assert r.json()['record']['calculation_id']=='WATER-NETWORK-001'

def test_airflow_room_benchmark_has_conservation_units():
    r=client.post('/api/airflow/room',json={'room_length_m':5,'room_width_m':4,'room_height_m':3,'air_changes_per_hour':4,'inlet_area_m2':0.25,'sensible_load_kw':1.5})
    assert r.status_code==200 and r.json()['outputs']['flow_m3_s']>0
    assert r.json()['record']['units']['velocity']=='m/s'

def test_water_and_airflow_require_explicit_production_inputs():
    assert client.post('/api/water/network', json={}).status_code == 422
    assert client.post('/api/airflow/room', json={}).status_code == 422

def test_frontend_is_blank_project_first():
    html = client.get('/').text
    assert 'Engineering workspace' in html
    assert 'class="project-strip hidden" id="projectStrip"' in html
    assert 'RUN WATER NETWORK BENCHMARK' not in html
    assert 'RUN AIRFLOW ROOM BENCHMARK' not in html

def test_structural_benchmark_matches_direct_formulas():
    r=client.post('/api/structure/beam',json={'span_m':4,'load_kn_m':5,'elastic_modulus_gpa':200,'second_moment_cm4':8333})
    assert r.status_code==200
    d=r.json()
    assert d['outputs']['maximum_moment_knm']==10
    assert d['outputs']['maximum_shear_kn']==10
    assert abs(d['outputs']['maximum_deflection_mm']-1.0) < 0.01
    assert 'formula' in d['calculation'] and d['record']['units']['shear']=='kN'
