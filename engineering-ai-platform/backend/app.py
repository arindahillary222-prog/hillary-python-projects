from datetime import datetime, timezone
from math import isfinite, pi
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import httpx
from pydantic import BaseModel, Field

app = FastAPI(title="AxiomForge Engineering API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class SolarRequest(BaseModel):
    annual_consumption_kwh: float = Field(gt=0, le=10_000_000)
    peak_sun_hours: float = Field(default=3.5, gt=0, le=8)
    system_losses: float = Field(default=0.14, ge=0, lt=0.8)
    pv_kw: float = Field(default=8, gt=0, le=10_000)
    battery_kwh: float = Field(default=10, ge=0, le=100_000)
    electricity_price: float = Field(default=0.32, ge=0, le=100)
    export_price: float = Field(default=0.08, ge=0, le=100)

class BeamRequest(BaseModel):
    span_m: float = Field(gt=0, le=100)
    load_kn_m: float = Field(gt=0, le=10_000)
    elastic_modulus_gpa: float = Field(default=200, gt=0, le=1000)
    second_moment_cm4: float = Field(default=8333, gt=0, le=1e12)

class WaterNetworkRequest(BaseModel):
    reservoir_head_m: float = Field(gt=0, le=500)
    demand_lps: float = Field(gt=0, le=1000)
    pipe_length_m: float = Field(gt=0, le=10_000)
    pipe_diameter_mm: float = Field(gt=1, le=2000)
    roughness_c: float = Field(gt=1, le=200)
    elevation_rise_m: float = Field(ge=-500, le=500)

class AirflowRequest(BaseModel):
    room_length_m: float = Field(gt=0, le=100)
    room_width_m: float = Field(gt=0, le=100)
    room_height_m: float = Field(gt=0, le=30)
    air_changes_per_hour: float = Field(gt=0, le=100)
    inlet_area_m2: float = Field(gt=0, le=100)
    sensible_load_kw: float = Field(ge=0, le=1000)

class CalculationRecord(BaseModel):
    calculation_id: str
    solver: str
    solver_version: str
    methodology: str
    units: dict
    assumptions: list[str]
    status: str
    limitations: list[str]
    created_at: str

def record(cid, solver, methodology, units, assumptions, limitations, status="screening_pass"):
    return CalculationRecord(calculation_id=cid, solver=solver, solver_version="axiomforge-0.1.0", methodology=methodology, units=units, assumptions=assumptions, status=status, limitations=limitations, created_at=datetime.now(timezone.utc).isoformat())

@app.get("/health")
def health(): return {"status":"ok", "service":"axiomforge-engineering-api", "version":"0.1.0"}

@app.post("/api/energy/solar")
def solar(req: SolarRequest):
    annual_generation = req.pv_kw * req.peak_sun_hours * 365 * (1 - req.system_losses)
    coverage = min(annual_generation / req.annual_consumption_kwh, 1.0)
    usable_battery = min(req.battery_kwh, req.annual_consumption_kwh / 365 * 2)
    direct_use = min(annual_generation, req.annual_consumption_kwh)
    surplus = max(annual_generation - req.annual_consumption_kwh, 0)
    battery_shift = min(surplus, usable_battery * 180)
    self_consumption = min(direct_use + battery_shift, req.annual_consumption_kwh)
    exported = max(annual_generation - self_consumption, 0)
    annual_savings = self_consumption * req.electricity_price + exported * req.export_price
    return {"inputs": req.model_dump(), "outputs": {"annual_generation_kwh": round(annual_generation,2), "annual_consumption_coverage": round(coverage*100,1), "battery_usable_kwh": round(usable_battery,2), "self_consumption_kwh": round(self_consumption,2), "exported_kwh": round(exported,2), "estimated_annual_savings": round(annual_savings,2), "grid_import_kwh": round(max(req.annual_consumption_kwh-self_consumption,0),2)}, "record": record("SOLAR-SCREEN-001","Deterministic PV screen","PV output = kW × peak-sun-hours × 365 × (1 − losses)",{"energy":"kWh","power":"kW","currency":"user input"},["Constant average peak-sun-hours","No shading or weather time series","Battery dispatch is a screening approximation"],["Not a bankable yield assessment","Not a substitute for local permitting or installer design"]).model_dump()}

@app.post("/api/structure/beam")
def beam(req: BeamRequest):
    # Simply supported beam, uniform load: delta_max = 5 w L^4 / (384 E I)
    E = req.elastic_modulus_gpa * 1e9
    I = req.second_moment_cm4 * 1e-8
    w = req.load_kn_m * 1000
    delta_m = 5*w*req.span_m**4/(384*E*I)
    moment_knm = req.load_kn_m*req.span_m**2/8
    if not all(isfinite(x) for x in (delta_m,moment_knm)): raise HTTPException(400,"Non-finite result")
    return {"inputs":req.model_dump(),"outputs":{"maximum_deflection_mm":round(delta_m*1000,3),"maximum_moment_knm":round(moment_knm,3),"screening_ratio_span_over_deflection":round(req.span_m/(delta_m or 1),1)},"record":record("BEAM-SCREEN-001","Closed-form beam solver","Simply supported beam under uniform load",{"length":"m","load":"kN/m","deflection":"mm","moment":"kN·m"},["Prismatic member","Small deflection linear elastic theory","Ideal simple supports"],["Screening only; no code compliance","No lateral torsion, connections, buckling, fire, fatigue or load combinations"]).model_dump()}

@app.post("/api/water/network")
def water_network(req: WaterNetworkRequest):
    # Hazen-Williams SI screening relation for a single pipe.
    q = req.demand_lps / 1000
    d = req.pipe_diameter_mm / 1000
    headloss = 10.67 * req.pipe_length_m * (q ** 1.852) / ((req.roughness_c ** 1.852) * (d ** 4.871))
    residual_head = req.reservoir_head_m - req.elevation_rise_m - headloss
    velocity = q / (pi * d * d / 4)
    status = "screening_pass" if residual_head > 0 else "screening_fail"
    return {"inputs": req.model_dump(), "outputs": {"headloss_m": round(headloss,4), "residual_head_m": round(residual_head,4), "velocity_m_s": round(velocity,4), "flow_lps": req.demand_lps}, "record": record("WATER-NETWORK-001", "Hazen-Williams single-pipe screen", "h_f = 10.67 L Q^1.852 / (C^1.852 d^4.871)", {"flow":"L/s","head":"m","velocity":"m/s"}, ["Steady incompressible flow", "Single pipe with known demand", "Hazen-Williams roughness coefficient supplied by user"], ["Not a calibrated EPANET network", "No pump curve, minor losses, water quality or transient analysis"], status).model_dump()}

@app.post("/api/airflow/room")
def airflow_room(req: AirflowRequest):
    volume = req.room_length_m * req.room_width_m * req.room_height_m
    flow_m3_s = volume * req.air_changes_per_hour / 3600
    velocity = flow_m3_s / req.inlet_area_m2
    temperature_rise = (req.sensible_load_kw * 1000) / (1.2 * 1005 * flow_m3_s)
    return {"inputs": req.model_dump(), "outputs": {"room_volume_m3": round(volume,3), "flow_m3_s": round(flow_m3_s,5), "inlet_velocity_m_s": round(velocity,4), "sensible_temperature_rise_c": round(temperature_rise,3)}, "record": record("AIRFLOW-ROOM-001", "Steady room air-change screen", "Q = volume × ACH / 3600; ΔT = load / (rho cp Q)", {"volume":"m³","flow":"m³/s","velocity":"m/s","temperature":"°C"}, ["Steady well-mixed room", "Air density 1.2 kg/m³", "Specific heat 1005 J/kg·K", "Uniform sensible load"], ["Not CFD", "No turbulence, buoyancy, geometry field, pressure boundary or transient solution"]).model_dump()}

@app.post("/api/assistant/chat")
async def assistant_chat(payload: dict):
    message = str(payload.get("message", "")).strip()
    if not message:
        raise HTTPException(400, "message is required")
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return {"reply":"OpenAI is not configured in this runtime. I can still run the deterministic solar and beam tools. Try: 'size a solar battery system'.", "tool_calls":[], "grounding":"configuration_required"}
    system = ("You are AxiomForge, an engineering assistant. Explain simply, never invent numerical results, "
              "and tell the user when a deterministic solver must be run. Supported tools are solar_screen and beam_screen. "
              "Ask only for essential missing inputs.")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post("https://api.openai.com/v1/chat/completions", headers={"Authorization":f"Bearer {key}"}, json={"model":"gpt-4o-mini","temperature":0.2,"messages":[{"role":"system","content":system},{"role":"user","content":message}]})
            r.raise_for_status()
            data=r.json()
        return {"reply":data["choices"][0]["message"]["content"],"tool_calls":[],"grounding":"OpenAI conversation; numerical outputs remain solver-backed."}
    except Exception as exc:
        return {"reply":"The assistant connection failed safely. Deterministic tools remain available below.","tool_calls":[],"grounding":"assistant_error","error":str(exc)[:160]}

@app.post("/api/assistant/route")
def route(payload: dict):
    text=str(payload.get("message","")).lower()
    if any(w in text for w in ["solar","pv","battery","electricity"]): tool="solar_screen"; explanation="I routed this to the deterministic PV and battery screening solver."; endpoint="/api/energy/solar"
    elif any(w in text for w in ["beam","deflection","structural","load"]): tool="beam_screen"; explanation="I routed this to the closed-form simply supported beam screening solver."; endpoint="/api/structure/beam"
    else: tool="clarify"; explanation="I need a supported engineering intent. Try solar, battery, electricity, beam, load, or deflection."; endpoint=None
    return {"tool":tool,"endpoint":endpoint,"explanation":explanation,"grounding":"Deterministic tool routing; no numerical result was generated by a language model."}


# Same-origin production-style serving for the public session URL.
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
@app.get("/", include_in_schema=False)
def frontend_index(): return FileResponse(os.path.join(frontend_dir, "index.html"))
@app.get("/{path:path}", include_in_schema=False)
def frontend_fallback(path: str):
    candidate=os.path.join(frontend_dir, path)
    if os.path.isfile(candidate): return FileResponse(candidate)
    return FileResponse(os.path.join(frontend_dir, "index.html"))
