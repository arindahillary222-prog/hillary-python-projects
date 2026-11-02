export async function onRequestPost({request}) {
  const r=await request.json(); const head=Number(r.reservoir_head_m), qlps=Number(r.demand_lps), L=Number(r.pipe_length_m), dmm=Number(r.pipe_diameter_mm), C=Number(r.roughness_c), rise=Number(r.elevation_rise_m);
  if (![head,qlps,L,dmm,C,rise].every(Number.isFinite)||head<=0||qlps<=0||L<=0||dmm<=0||C<=0) return Response.json({error:'Invalid hydraulic inputs'},{status:400});
  const q=qlps/1000, d=dmm/1000, loss=10.67*L*Math.pow(q,1.852)/(Math.pow(C,1.852)*Math.pow(d,4.871)), residual=head-rise-loss, velocity=q/(Math.PI*d*d/4);
  const record={calculation_id:'WATER-NETWORK-001',solver:'Hazen-Williams single-pipe screen',solver_version:'axiomforge-pages-0.4.0',methodology:'h_f = 10.67 L Q^1.852 / (C^1.852 d^4.871)',units:{flow:'L/s',head:'m',velocity:'m/s'},assumptions:['Steady incompressible flow','Single pipe with known demand','User-supplied roughness coefficient'],status:residual>0?'screening_pass':'screening_fail',limitations:['Not a calibrated EPANET network','No pump curve, minor losses, water quality or transient analysis'],created_at:new Date().toISOString()};
  return Response.json({inputs:r,outputs:{headloss_m:+loss.toFixed(4),residual_head_m:+residual.toFixed(4),velocity_m_s:+velocity.toFixed(4),flow_lps:qlps},record});
}
