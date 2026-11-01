export async function onRequestPost({request}) {
  const r=await request.json(); const l=Number(r.room_length_m??5), w=Number(r.room_width_m??4), h=Number(r.room_height_m??3), ach=Number(r.air_changes_per_hour??4), area=Number(r.inlet_area_m2??.25), load=Number(r.sensible_load_kw??1.5);
  if (![l,w,h,ach,area,load].every(Number.isFinite)||l<=0||w<=0||h<=0||ach<=0||area<=0||load<0) return Response.json({error:'Invalid airflow inputs'},{status:400});
  const volume=l*w*h, flow=volume*ach/3600, velocity=flow/area, rise=load*1000/(1.2*1005*flow);
  const record={calculation_id:'AIRFLOW-ROOM-001',solver:'Steady room air-change screen',solver_version:'axiomforge-pages-0.4.0',methodology:'Q = volume × ACH / 3600; ΔT = load / (rho cp Q)',units:{volume:'m³',flow:'m³/s',velocity:'m/s',temperature:'°C'},assumptions:['Steady well-mixed room','Air density 1.2 kg/m³','Specific heat 1005 J/kg·K','Uniform sensible load'],status:'screening_pass',limitations:['Not CFD','No turbulence, buoyancy, geometry field, pressure boundary or transient solution'],created_at:new Date().toISOString()};
  return Response.json({inputs:r,outputs:{room_volume_m3:+volume.toFixed(3),flow_m3_s:+flow.toFixed(5),inlet_velocity_m_s:+velocity.toFixed(4),sensible_temperature_rise_c:+rise.toFixed(3)},record});
}
