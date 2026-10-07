/**
 * GoldenHour Emergency Rules
 * Single source of truth mapping emergency categories to clinical capability requirements,
 * preferred specialists, UI metadata, and plain-language descriptions.
 */

export const EMERGENCY_RULES = {
  heart_attack: {
    id: 'heart_attack',
    label: 'Heart Attack (STEMI / Cardiac)',
    icon: 'heart-pulse',
    colorRole: 'critical-red',
    description: 'Acute coronary syndrome or myocardial infarction requiring primary percutaneous coronary intervention (Cath Lab).',
    requiredCapabilities: ['has_cath_lab'],
    preferredSpecialists: ['cardiologist', 'cardiac surgeon'],
    capabilityLabels: {
      has_cath_lab: 'Cath Lab (Angioplasty)',
    },
  },
  stroke: {
    id: 'stroke',
    label: 'Acute Stroke / CVA',
    icon: 'brain',
    colorRole: 'urgent-purple',
    description: 'Acute neurological deficit or stroke symptoms requiring specialized stroke unit care, CT/MRI, and thrombolysis.',
    requiredCapabilities: ['has_stroke_unit'],
    preferredSpecialists: ['neurologist', 'neurosurgeon'],
    capabilityLabels: {
      has_stroke_unit: 'Stroke Unit',
    },
  },
  trauma: {
    id: 'trauma',
    label: 'Severe Trauma / Accident',
    icon: 'alert-triangle',
    colorRole: 'critical-amber',
    description: 'High-impact polytrauma, major bleeding, or crush injury requiring trauma resuscitation and immediate blood bank support.',
    requiredCapabilities: ['has_trauma_center', 'has_blood_bank'],
    preferredSpecialists: ['trauma surgeon', 'orthopedic surgeon'],
    capabilityLabels: {
      has_trauma_center: 'Trauma Center',
      has_blood_bank: 'Blood Bank',
    },
  },
  pregnancy: {
    id: 'pregnancy',
    label: 'Obstetric Emergency / Labour',
    icon: 'baby',
    colorRole: 'vital-pink',
    description: 'Advanced labour, fetal distress, or obstetric complications requiring 24/7 maternity and neonatal resuscitation.',
    requiredCapabilities: ['has_maternity'],
    preferredSpecialists: ['obstetrician', 'gynecologist', 'neonatologist'],
    capabilityLabels: {
      has_maternity: 'Maternity Unit & NICU',
    },
  },
  burns: {
    id: 'burns',
    label: 'Severe Burns / Scalds',
    icon: 'flame',
    colorRole: 'critical-orange',
    description: 'Extensive chemical or thermal burns requiring specialized sterile burn care, airway management, and fluid resuscitation.',
    requiredCapabilities: ['has_burn_unit'],
    preferredSpecialists: ['burn specialist'],
    capabilityLabels: {
      has_burn_unit: 'Dedicated Burn Unit',
    },
  },
};

/**
 * Retrieve emergency clinical guidelines and requirements by emergency type.
 * @param {string} type - Emergency key (e.g. 'heart_attack', 'stroke', 'trauma')
 * @returns {Object|null} Rules object or null if not found
 */
export function getRules(type) {
  if (!type || typeof type !== 'string') return null;
  const normalized = type.toLowerCase().trim();
  return EMERGENCY_RULES[normalized] || null;
}

export default EMERGENCY_RULES;
