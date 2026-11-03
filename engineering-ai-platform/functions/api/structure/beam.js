export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const span = Number(body.span_m), load = Number(body.load_kn_m), E_GPa = Number(body.elastic_modulus_gpa), I_cm4 = Number(body.second_moment_cm4);
  if (![span, load, E_GPa, I_cm4].every(Number.isFinite) || span <= 0 || load <= 0 || E_GPa <= 0 || I_cm4 <= 0) return Response.json({ error: 'span_m, load_kn_m, elastic_modulus_gpa and second_moment_cm4 must be positive numbers' }, { status: 422 });
  if (span > 100 || load > 10000 || E_GPa > 1000 || I_cm4 > 1e12) return Response.json({ error: 'One or more beam inputs exceed the supported screening range' }, { status: 422 });
  const E = E_GPa * 1e9, I = I_cm4 * 1e-8, w = load * 1000;
  const deflection_m = 5 * w * span ** 4 / (384 * E * I);
  const moment = load * span ** 2 / 8;
  const shear = load * span / 2;
  const created_at = new Date().toISOString();
  return Response.json({
    inputs: { span_m: span, load_kn_m: load, elastic_modulus_gpa: E_GPa, second_moment_cm4: I_cm4 },
    outputs: { maximum_deflection_mm: Math.round(deflection_m * 1000 * 1000) / 1000, maximum_moment_knm: Math.round(moment * 1000) / 1000, maximum_shear_kn: Math.round(shear * 1000) / 1000, screening_ratio_span_over_deflection: Math.round(span / (deflection_m || 1) * 10) / 10 },
    calculation: { formula: 'δmax = 5wL⁴/(384EI); Mmax = wL²/8; Vsupport = wL/2', intermediate: { E_pa: E, I_m4: I, load_n_m: w, load_resultant_kn: Math.round(load * span * 1000) / 1000 }, steps: ['Convert E from GPa to Pa and I from cm⁴ to m⁴', 'Evaluate the closed-form simply supported uniform-load equations', 'Report maximum values at midspan and supports'] },
    record: { calculation_id: 'BEAM-SCREEN-001', solver: 'Closed-form beam solver', solver_version: 'axiomforge-0.1.0', methodology: 'Simply supported beam under uniform load', units: { length: 'm', load: 'kN/m', deflection: 'mm', moment: 'kN·m', shear: 'kN', E: 'GPa', I: 'cm⁴' }, assumptions: ['Prismatic member', 'Small deflection linear elastic theory', 'Ideal simple supports'], status: 'screening_pass', limitations: ['Screening only; no code compliance', 'No lateral torsion, connections, buckling, fire, fatigue or load combinations'], created_at }
  });
}
