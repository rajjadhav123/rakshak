const User = require('../models/User');
const { ROLES } = require('../config/roles');
const { notifyMany } = require('./notify');

/**
 * Notifies the District Control officer(s) covering a Police Admin's
 * own station/district — the "PSI reports up to DSP" oversight chain.
 * Matches on jurisdiction.state + jurisdiction.district, since a
 * Police Admin isn't linked to one specific superior account by ID,
 * only by shared jurisdiction. If more than one District Control
 * account covers that district (unusual but possible), all of them
 * get notified.
 */
const notifyDistrictSuperiors = async ({ officer, message, caseId }) => {
  if (!officer?.jurisdiction?.district || !officer?.jurisdiction?.state) return;

  const superiors = await User.find({
    role: ROLES.DISTRICT_CONTROL,
    status: 'active',
    'jurisdiction.state': officer.jurisdiction.state,
    'jurisdiction.district': officer.jurisdiction.district,
  });

  if (superiors.length === 0) return;

  await notifyMany(superiors.map((s) => s._id), {
    type: 'system',
    message: `[Oversight] ${message}`,
    caseId,
  });
};

module.exports = { notifyDistrictSuperiors };
