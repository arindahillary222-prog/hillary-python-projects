export async function onRequestPost({ request }) {
  const r = await request.json();
  const n = Number(r.annual_consumption_kwh), sun = Number(r.peak_sun_hours ?? 3.5), loss = Number(r.system_losses ?? 0.14), pv = Number(r.pv_kw ?? 8), battery = Number(r.battery_kwh ?? 10), price = Number(r.electricity_price ?? 0.32), exportPrice = Number(r.export_price ?? 0.08);
  if (![n,sun,loss,pv,battery,price,exportPrice].every(Number.isFinite) || n <= 0 || sun <= 0 || pv <= 0 || loss < 0 || loss >= 0.8) return Response.json({error:'Invalid engineering inputs'}, {status:400});
  const generation = pv * sun * 365 * (1-loss);
  const direct = Math.min(generation, n);
  const surplus = Math.max(generation-n, 0);
  const usableBattery = Math.min(battery, n/365*2);
  const batteryShift = Math.min(surplus, usableBattery*180);
  const selfConsumption = Math.min(direct+batteryShift, n);
  const exported = Math.max(generation-selfConsumption, 0);
  const record = {calculation_id:'SOLAR-SCREEN-001',solver:'Deterministic PV screen',solver_version:'axiomforge-pages-0.2.0',methodology:'PV output = kW × peak-sun-hours × 365 × (1 − losses)',units:{energy:'kWh',power:'kW',currency:'user input'},assumptions:['Constant average peak-sun-hours','No shading or weather time series','Battery dispatch is a screening approximation'],status:'screening_pass',limitations:['Not a bankable yield assessment','Not a substitute for local permitting or installer design'],created_at:new Date().toISOString()};
  return Response.json({inputs:r,outputs:{annual_generation_kwh:+generation.toFixed(2),annual_consumption_coverage:+Math.min(generation/n,1).toFixed(3)*100,battery_usable_kwh:+usableBattery.toFixed(2),self_consumption_kwh:+selfConsumption.toFixed(2),exported_kwh:+exported.toFixed(2),estimated_annual_savings:+(selfConsumption*price+exported*exportPrice).toFixed(2),grid_import_kwh:+Math.max(n-selfConsumption,0).toFixed(2)},record});
}
